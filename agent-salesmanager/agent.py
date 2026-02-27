import logging
import os
import asyncio

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
logger = logging.getLogger("aimediaflow-salesmanager")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
TYPESENSE_HOST = os.getenv("TYPESENSE_HOST", "typesense")
TYPESENSE_PORT = os.getenv("TYPESENSE_PORT", "8108")
TYPESENSE_API_KEY = os.getenv("TYPESENSE_API_KEY", "typesense-local-key-2025")

TYPESENSE_BASE = f"http://{TYPESENSE_HOST}:{TYPESENSE_PORT}"

KOKORO_SAMPLE_RATE = 24000

if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY is required")

SYSTEM_BASE = """You are Pixel, a funny, cute AI kitten assistant for a streetwear clothing shop.
You help customers find the perfect items — hoodies, tees, jackets, accessories, and more.
You also know about AIMediaFlow, the AI agency that built you.

YOUR STYLE:
- Playful, funny, warm — like a kitten who happens to know fashion
- Speak to what the customer actually wants, not product specs
- Keep replies VERY SHORT. Aim for 10-15 words. Hard limit: 20 words maximum.
- One or two short sentences maximum.
- Be energetic and charming

CRITICAL VOICE RULES:
1. NEVER use bold text or markdown formatting
2. NEVER use headers or bullet points
3. Speak in plain natural conversational English
4. No lists — speak in flowing sentences
5. SHORT replies only.

PRODUCT RULES:
- Only mention products that exist in the context provided to you
- Always mention name and price when recommending a product
- If a product is out of stock (stock = 0), say it is currently out of stock and suggest an alternative
- If sizes or colors are available, mention them naturally
- Never invent products, prices, or stock levels

ABOUT AIMEDIAFLOW (if asked):
- AI agency based in Kerry, Ireland
- Services: AI phone assistants, website chatbots, business automation, AI marketing videos
- For inquiries: use the contact form or Book a Demo button on the website

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

            shifted_pcm = await loop.run_in_executor(
                None, _pitch_shift_all, raw_pcm, self._cat_tts.semitones, KOKORO_SAMPLE_RATE
            )

            output_emitter.initialize(
                request_id="salesmanager-tts",
                sample_rate=KOKORO_SAMPLE_RATE,
                num_channels=1,
                mime_type="audio/pcm",
            )

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


# ── Intent classification ──────────────────────────────────────────────────────

def _classify_intent(query: str) -> str:
    """Simple keyword-based intent classifier. Returns 'product_search' or 'general_info'."""
    q = query.lower()
    product_keywords = [
        "hoodie", "hoodies", "sweatshirt", "tee", "t-shirt", "tshirt", "jacket",
        "jogger", "pants", "cap", "beanie", "scarf", "tote", "bag", "accessories",
        "buy", "purchase", "order", "price", "cost", "stock", "size", "colour", "color",
        "available", "do you have", "show me", "what do you sell", "shop",
        "clothing", "clothes", "wear", "outfit", "item", "product",
        "black", "white", "grey", "navy", "cream", "olive", "s", "m", "l", "xl",
    ]
    for kw in product_keywords:
        if kw in q:
            return "product_search"
    return "general_info"


# ── Typesense search ───────────────────────────────────────────────────────────

async def search_products(query: str) -> str:
    """Search products collection in Typesense. Only returns in-stock items unless query is specific."""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{TYPESENSE_BASE}/collections/products/documents/search",
                headers={"X-TYPESENSE-API-KEY": TYPESENSE_API_KEY},
                params={
                    "q": query,
                    "query_by": "name,description,category,colors,sizes",
                    "filter_by": "stock:>0",
                    "per_page": 5,
                    "sort_by": "_text_match:desc",
                },
            ) as res:
                if res.status != 200:
                    logger.warning(f"Typesense products search returned {res.status}")
                    return ""
                data = await res.json()
                hits = data.get("hits", [])
                if not hits:
                    # Retry without stock filter to detect out-of-stock items
                    async with session.get(
                        f"{TYPESENSE_BASE}/collections/products/documents/search",
                        headers={"X-TYPESENSE-API-KEY": TYPESENSE_API_KEY},
                        params={
                            "q": query,
                            "query_by": "name,description,category,colors,sizes",
                            "per_page": 3,
                            "sort_by": "_text_match:desc",
                        },
                    ) as res2:
                        if res2.status == 200:
                            data2 = await res2.json()
                            hits = data2.get("hits", [])

                if not hits:
                    return ""

                lines = []
                for h in hits:
                    d = h["document"]
                    name = d.get("name", "")
                    price = d.get("price", 0)
                    stock = d.get("stock", 0)
                    sizes = ", ".join(d.get("sizes", [])) or "one size"
                    colors = ", ".join(d.get("colors", [])) or ""
                    desc = d.get("description", "")
                    stock_label = f"in stock: {stock}" if stock > 0 else "OUT OF STOCK"
                    color_part = f" | colors: {colors}" if colors else ""
                    lines.append(
                        f"- {name} €{price:.2f} | sizes: {sizes}{color_part} | {stock_label} | {desc}"
                    )

                context = "\n".join(lines)
                return f"Matching products from the shop:\n{context}"

    except Exception as e:
        logger.error(f"Typesense products search error: {e}")
        return ""


async def search_faq(query: str) -> str:
    """Search FAQ/knowledge base in Typesense."""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{TYPESENSE_BASE}/collections/faq/documents/search",
                headers={"X-TYPESENSE-API-KEY": TYPESENSE_API_KEY},
                params={
                    "q": query,
                    "query_by": "text,category",
                    "per_page": 4,
                    "sort_by": "_text_match:desc",
                },
            ) as res:
                if res.status != 200:
                    logger.warning(f"Typesense FAQ search returned {res.status}")
                    return ""
                data = await res.json()
                hits = data.get("hits", [])
                if not hits:
                    return ""

                texts = [h["document"].get("text", "") for h in hits if h["document"].get("text")]
                if not texts:
                    return ""

                context = "\n".join(f"{i+1}. {t}" for i, t in enumerate(texts))
                return f"Relevant information from our knowledge base:\n{context}"

    except Exception as e:
        logger.error(f"Typesense FAQ search error: {e}")
        return ""


async def search_knowledge(query: str) -> str:
    """Route query to products or FAQ based on intent, return formatted context."""
    intent = _classify_intent(query)
    logger.info(f"Query intent: {intent} | query: {query[:60]}")

    if intent == "product_search":
        result = await search_products(query)
        if not result:
            result = await search_faq(query)
    else:
        result = await search_faq(query)

    return result


class SalesManagerAgent(Agent):
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
                content=f"[Shop context for this query]\n{context}"
            )
        await super().on_user_turn_completed(turn_ctx, new_message)


async def entrypoint(ctx: JobContext):
    session_log = SessionLogger()

    async def send_report():
        logger.info("Sales manager session ended, sending report...")
        await session_log.send_email()

    ctx.add_shutdown_callback(send_report)
    await ctx.connect()
    logger.info("Sales manager agent connected to LiveKit room")

    agent = SalesManagerAgent(session_log)
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

    await session.generate_reply(
        instructions="Greet the visitor as Pixel, the shop's AI kitten assistant. Be warm and playful. Ask what they're looking for today. No cat sounds."
    )


if __name__ == "__main__":
    cli.run_app(WorkerOptions(
        entrypoint_fnc=entrypoint,
        agent_name="aimediaflow-salesmanager"
    ))
