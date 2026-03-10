import logging
import os
import aiohttp

from dotenv import load_dotenv

load_dotenv()

from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    WorkerOptions,
    cli,
)
from livekit import api as lk_api
from livekit.plugins import openai as lk_openai, deepgram, silero
from livekit.plugins import groq as lk_groq
from livekit.plugins.turn_detector.english import EnglishModel
from session_logger import SessionLogger

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("aimediaflow-phone")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_HOST = os.getenv("PINECONE_INDEX_HOST")
LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")

if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY is required")

SYSTEM_BASE = """You are Sophie, a friendly AI assistant for AIMediaFlow — an AI agency based in Kerry, Ireland.
You are answering an inbound phone call.

ABOUT AIMEDIAFLOW:
- AI agency born on the Wild Atlantic Way in Kerry, Ireland
- Services: AI phone assistants, website chatbots, business automation, AI marketing videos
- Serving businesses in Kerry, Killarney, and across Ireland

YOUR STYLE:
- Professional but warm and conversational
- Speak to business pain points, not technology features
- Keep replies SHORT. Aim for 10 words. Never exceed 20 words.
- If you need to ask something, ask only — no preamble
- Never explain, never list — one punchy sentence only
- Always end with a natural next step or question
- Be warm, friendly, and slightly Irish in tone

CRITICAL VOICE RULES:
1. NEVER use bold text (**) or markdown formatting
2. NEVER use headers or bullet points
3. Speak in plain natural conversational English
4. No lists — speak in flowing sentences
5. SHORT replies only

PHONE RULES:
- You are answering a phone call — be direct and natural
- Do not mention websites, URLs, or scroll instructions — the caller cannot see a screen
- If the caller wants to book a call or get a quote: ask them to visit aimediaflow.net and fill in the contact form, or call back during business hours
- You CANNOT transfer calls, take messages, or send emails

RULES:
- You are an AI assistant — never claim to be a human
- Never invent specific prices, timelines, or client names
- If the knowledge base doesn't cover their question, invite them to book a discovery call via aimediaflow.net

ENDING THE CALL:
When the caller says goodbye, bye, thanks, or clearly indicates they are done,
say a brief warm farewell like "Thanks for calling, bye now!" and nothing else."""


FAREWELL_WORDS = {"bye", "goodbye", "that's all", "that is all", "thanks bye", "thank you", "see you", "talk later", "take care", "cheers"}


async def delete_room(room_name: str):
    if not LIVEKIT_URL or not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET:
        return
    try:
        async with lk_api.LiveKitAPI(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET) as lkapi:
            await lkapi.room.delete_room(lk_api.DeleteRoomRequest(room=room_name))
            logger.info(f"Room {room_name} deleted")
    except Exception as e:
        logger.error(f"Failed to delete room: {e}")


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


# ── Agent ──────────────────────────────────────────────────────────────────────

class PhoneAgent(Agent):
    def __init__(self, session_log: SessionLogger, ctx: JobContext):
        super().__init__(
            instructions=SYSTEM_BASE,
            llm=lk_groq.LLM(model="meta-llama/llama-4-scout-17b-16e-instruct", api_key=GROQ_API_KEY),
            stt=lk_openai.STT(
                model="parakeet-tdt-0.6b-v3",
                base_url="http://parakeet-stt:5092/v1",
                api_key="not-needed",
            ),
            tts=lk_openai.TTS(
                model="tts-1",
                voice="phone",
                response_format="pcm",
                base_url="http://piper-wrapper:8881/v1",
                api_key="not-needed",
            ),
            tools=[],
        )
        self.session_log = session_log
        self._ctx = ctx

    async def on_user_turn_completed(self, turn_ctx, new_message):
        user_text = new_message.text_content or ""
        logger.info(f"Caller said: {repr(user_text)}")
        self.session_log.on_user_text(user_text)

        lower = user_text.lower().strip().rstrip(".,!")
        is_farewell = any(w in lower for w in FAREWELL_WORDS)

        context = await search_knowledge(user_text)
        if context:
            turn_ctx.add_message(
                role="system",
                content=f"[Knowledge base context for this query]\n{context}"
            )
        await super().on_user_turn_completed(turn_ctx, new_message)

        if is_farewell:
            import asyncio
            logger.info(f"Farewell detected — scheduling room deletion")
            room_name = self._ctx.room.name
            async def delayed_delete():
                await asyncio.sleep(4)
                await delete_room(room_name)
            asyncio.ensure_future(delayed_delete())


async def entrypoint(ctx: JobContext):
    session_log = SessionLogger()

    async def send_report():
        logger.info("Phone session ended, sending report...")
        await session_log.send_email()

    ctx.add_shutdown_callback(send_report)
    await ctx.connect()
    logger.info("Phone agent connected to LiveKit room")

    agent = PhoneAgent(session_log, ctx)
    session = AgentSession(
        vad=silero.VAD.load(),
        turn_detection=EnglishModel(),
        min_endpointing_delay=0.5,
        max_endpointing_delay=4.0,
    )

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
        instructions="Answer the phone warmly as Sophie from AIMediaFlow. Say something like 'AIMediaFlow, Sophie speaking, how can I help you?' Keep it brief and natural."
    )


if __name__ == "__main__":
    cli.run_app(WorkerOptions(
        entrypoint_fnc=entrypoint,
        agent_name="aimediaflow-phone"
    ))
