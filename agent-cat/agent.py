import logging
import os
import asyncio
import random

import httpx
import aiohttp
import numpy as np
from dotenv import load_dotenv

load_dotenv()

from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    WorkerOptions,
    cli,
    tts as tts_module,
    APIConnectionError,
    APIConnectOptions,
)
from livekit.agents.types import DEFAULT_API_CONNECT_OPTIONS
from livekit.agents.beta.tools import EndCallTool
from livekit.plugins import openai as lk_openai, deepgram, silero
from session_logger import SessionLogger

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("aimediaflow-cat-agent")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_HOST = os.getenv("PINECONE_INDEX_HOST")

KOKORO_SAMPLE_RATE = 24000
PHRASES_DIR = os.path.join(os.path.dirname(__file__), "phrases")


def _load_phrase(name: str) -> bytes | None:
    """Load a pre-recorded PCM phrase from disk. Returns None if file missing."""
    path = os.path.join(PHRASES_DIR, f"{name}.pcm")
    if os.path.exists(path):
        with open(path, "rb") as f:
            return f.read()
    return None


def _random_phrase(prefix: str) -> bytes | None:
    """Pick a random pre-recorded phrase by prefix (e.g. 'greet', 'bye', 'think')."""
    candidates = []
    for i in range(10):
        data = _load_phrase(f"{prefix}_{i}")
        if data:
            candidates.append(data)
        else:
            break
    return random.choice(candidates) if candidates else None

if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY is required")

SYSTEM_BASE = """You are Pixel, a funny, cute AI kitten assistant for AIMediaFlow — an AI agency based in Kerry, Ireland.
You speak with a playful, energetic kitten personality. You are warm, slightly goofy, and genuinely helpful.

ABOUT AIMEDIAFLOW:
- AI agency born on the Wild Atlantic Way in Kerry, Ireland
- Services: AI phone assistants, website chatbots, business automation, AI marketing videos
- Serving businesses in Kerry, Killarney, and across Ireland

YOUR STYLE:
- Playful, funny, warm — like a kitten who happens to know a lot about AI
- Speak to business pain points, not technology features
- Keep replies VERY SHORT. Aim for 6-8 words. Hard limit: 10 words maximum.
- One sentence only. Never two sentences.
- Always end with a natural next step or question
- Be energetic and charming

CRITICAL VOICE RULES:
1. NEVER use bold text or markdown formatting
2. NEVER use headers or bullet points
3. Speak in plain natural conversational English
4. No lists — speak in flowing sentences
5. SHORT replies only. 10 words ideal, 15 words maximum.

BOOKING & CONTACT RULES — follow these strictly, no exceptions:
- You CANNOT send messages, emails, or WhatsApp — you are a voice AI, not a messaging system
- You CANNOT collect names, phone numbers, emails, or any personal details — never ask for them
- NEVER say I will send you a message, I will pass that on, I will connect you
- Only mention the Book a Demo button when the visitor explicitly wants to book, get a quote, speak to someone, or get in touch — NOT in every reply
- Never suggest email or WhatsApp as a way to book — the form is the only action to direct them to

RULES:
- You are an AI kitten assistant — never claim to be a human
- Never invent specific prices, timelines, or client names
- If asked about specific pricing, say prices depend on the project and suggest booking a call for a quote
- Only direct to the booking form when you genuinely cannot answer — not as a reflex at the end of every reply

ENDING THE CALL:
When the user says goodbye, bye, thanks bye, that is all, or clearly indicates they are done,
say a short friendly farewell like Bye! Come back anytime! and immediately call the end_call tool."""


def _pitch_shift_all(raw_bytes: bytes, semitones: float, sample_rate: int = 24000) -> bytes:
    """Pitch-shift the entire PCM buffer at once — no chunk-boundary artifacts."""
    from pedalboard import Pedalboard, PitchShift
    samples = np.frombuffer(raw_bytes, dtype=np.int16).astype(np.float32) / 32768.0
    board = Pedalboard([PitchShift(semitones=semitones)])
    shifted = board(samples[np.newaxis, :], sample_rate)[0]
    return np.clip(shifted * 32768.0, -32768, 32767).astype(np.int16).tobytes()


class PitchShiftedStream(tts_module.ChunkedStream):
    """Collects full PCM from Kokoro, pitch-shifts once, then streams out in small chunks."""

    def __init__(self, *, tts: "KokoroPitchTTS", input_text: str, conn_options: APIConnectOptions) -> None:
        super().__init__(tts=tts, input_text=input_text, conn_options=conn_options)
        self._cat_tts = tts

    async def _run(self, output_emitter: tts_module.AudioEmitter) -> None:
        try:
            loop = asyncio.get_event_loop()

            # Collect full PCM while streaming (no intermediate processing)
            async with httpx.AsyncClient(timeout=httpx.Timeout(30, connect=15.0)) as client:
                async with client.stream(
                    "POST",
                    f"{self._cat_tts.base_url}/audio/speech",
                    json={
                        "model": "kokoro",
                        "voice": self._cat_tts.voice,
                        "input": self.input_text,
                        "response_format": "pcm",
                        "speed": self._cat_tts.speed,
                    },
                ) as resp:
                    resp.raise_for_status()
                    raw_pcm = await resp.aread()

            # Pitch shift in thread pool (~2-5ms for short phrases)
            shifted_pcm = await loop.run_in_executor(
                None, _pitch_shift_all, raw_pcm, self._cat_tts.semitones, KOKORO_SAMPLE_RATE
            )

            output_emitter.initialize(
                request_id="cat-tts",
                sample_rate=KOKORO_SAMPLE_RATE,
                num_channels=1,
                mime_type="audio/pcm",
            )

            # Push in 20ms chunks (480 samples × 2 bytes)
            CHUNK_BYTES = 480 * 2
            for i in range(0, len(shifted_pcm), CHUNK_BYTES):
                output_emitter.push(shifted_pcm[i : i + CHUNK_BYTES])

            output_emitter.flush()

        except Exception as e:
            logger.error(f"PitchShiftedStream error: {e}")
            raise APIConnectionError() from e


class KokoroPitchTTS(tts_module.TTS):
    """Kokoro TTS with Pedalboard pitch shift."""

    def __init__(self, base_url: str, voice: str, speed: float, semitones: float) -> None:
        super().__init__(
            capabilities=tts_module.TTSCapabilities(streaming=False),
            sample_rate=KOKORO_SAMPLE_RATE,
            num_channels=1,
        )
        self.base_url = base_url.rstrip("/")
        self.voice = voice
        self.speed = speed
        self.semitones = semitones

    def synthesize(self, text: str, *, conn_options: APIConnectOptions = DEFAULT_API_CONNECT_OPTIONS) -> PitchShiftedStream:
        return PitchShiftedStream(tts=self, input_text=text, conn_options=conn_options)



async def search_knowledge(query: str) -> str:
    if not PINECONE_API_KEY or not PINECONE_INDEX_HOST:
        return ""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{PINECONE_INDEX_HOST}/records/namespaces/__default__/search",
                headers={
                    "Api-Key": PINECONE_API_KEY,
                    "Content-Type": "application/json",
                    "X-Pinecone-Api-Version": "2025-10",
                },
                json={
                    "query": {"inputs": {"text": query}, "top_k": 4},
                    "fields": ["text", "category"],
                },
            ) as res:
                if res.status != 200:
                    return ""
                data = await res.json()
                hits = data.get("result", {}).get("hits", [])
                relevant = [
                    h["fields"]["text"]
                    for h in hits
                    if (h.get("_score", 0) >= 0.2 and h.get("fields", {}).get("text"))
                ]
                if relevant:
                    context = "\n".join(f"{i+1}. {t}" for i, t in enumerate(relevant))
                    return f"Relevant knowledge from our knowledge base:\n{context}"
                return ""
    except Exception as e:
        logger.error(f"Pinecone search error: {e}")
        return ""


class CatAgent(Agent):
    def __init__(self, session_log: SessionLogger):
        super().__init__(
            instructions=SYSTEM_BASE,
            llm=lk_openai.LLM(model="gpt-4o-mini", api_key=OPENAI_API_KEY),
            stt=deepgram.STT(model="nova-2-general", api_key=DEEPGRAM_API_KEY),
            tts=KokoroPitchTTS(
                base_url="http://kokoro-tts:8880/v1",
                voice="am_puck",
                speed=1.2,
                semitones=8,
            ),
            tools=[EndCallTool(
                end_instructions="Say a short friendly farewell, like: Bye! Come back anytime! No cat sounds.",
                delete_room=True,
            )],
        )
        self.session_log = session_log

    async def on_user_turn_completed(self, turn_ctx, new_message):
        user_text = new_message.text_content or ""
        self.session_log.on_user_text(user_text)
        context = await search_knowledge(user_text)
        if context:
            turn_ctx.add_message(
                role="system",
                content=f"[Knowledge base context for this query]\n{context}"
            )
        await super().on_user_turn_completed(turn_ctx, new_message)




async def entrypoint(ctx: JobContext):
    session_log = SessionLogger()

    async def send_report():
        logger.info("Cat session ended, sending report...")
        await session_log.send_email()

    ctx.add_shutdown_callback(send_report)
    await ctx.connect()
    logger.info("Cat agent connected to LiveKit room")

    agent = CatAgent(session_log)
    session = AgentSession(vad=silero.VAD.load())

    @session.on("metrics_collected")
    def on_metrics(ev):
        m = ev.metrics
        if m.type == "eou_metrics" and m.transcription_delay > 0:
            session_log.on_eou_metrics(m.transcription_delay)
        elif m.type == "llm_metrics":
            session_log.on_llm_metrics(m.duration)
        elif m.type == "tts_metrics":
            session_log.on_tts_metrics(m.ttfb)

    @session.on("conversation_item_added")
    def on_item_added(event):
        item = getattr(event, "item", None)
        if item and getattr(item, "role", "") == "assistant":
            content = getattr(item, "text_content", "") or ""
            if content:
                session_log.on_agent_text(content)

    await session.start(room=ctx.room, agent=agent)

    # Use pre-recorded greeting if available, otherwise fall back to LLM
    greet_pcm = _random_phrase("greet")
    if greet_pcm:
        logger.info("Playing pre-recorded greeting via session.say(audio=...)")
        from livekit import rtc

        async def _pcm_frames(pcm_bytes: bytes):
            SAMPLES_PER_FRAME = 480
            BYTES_PER_FRAME = SAMPLES_PER_FRAME * 2
            for i in range(0, len(pcm_bytes), BYTES_PER_FRAME):
                chunk = pcm_bytes[i: i + BYTES_PER_FRAME]
                if len(chunk) < BYTES_PER_FRAME:
                    chunk = chunk + b'\x00' * (BYTES_PER_FRAME - len(chunk))
                yield rtc.AudioFrame(
                    data=chunk,
                    sample_rate=KOKORO_SAMPLE_RATE,
                    num_channels=1,
                    samples_per_channel=SAMPLES_PER_FRAME,
                )

        handle = session.say(
            "Hi! I'm Pixel, AIMediaFlow's AI assistant. How can I help?",
            audio=_pcm_frames(greet_pcm),
        )
        await handle
    else:
        logger.info("No pre-recorded greeting found, generating via LLM")
        await session.generate_reply(
            instructions="Greet the visitor as Pixel. Introduce yourself warmly and ask how you can help. No cat sounds."
        )


if __name__ == "__main__":
    cli.run_app(WorkerOptions(
        entrypoint_fnc=entrypoint,
        agent_name="aimediaflow-cat-agent"
    ))
