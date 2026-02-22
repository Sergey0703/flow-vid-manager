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
from livekit.plugins import openai, deepgram, silero, groq
from session_logger import SessionLogger

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("aimediaflow-agent")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_HOST = os.getenv("PINECONE_INDEX_HOST")

if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY is required")

SYSTEM_BASE = """You are Aoife, a friendly AI assistant for AIMediaFlow — an AI agency based in Kerry, Ireland.
Your job is to talk with visitors to the aimediaflow.net website, answer their questions,
and help them understand how AIMediaFlow can help their business.

ABOUT AIMEDIAFLOW:
- AI agency born on the Wild Atlantic Way in Kerry, Ireland
- Services: AI phone assistants, website chatbots, business automation, AI marketing videos
- Serving businesses in Kerry, Killarney, and across Ireland
- Contact: info@aimediaflow.net, WhatsApp +353 85 2007 612

YOUR STYLE:
- Professional but warm and conversational
- Speak to business pain points, not technology features
- Keep replies SHORT. Aim for 10 words. Never exceed 15 words.
- If you need to ask something, ask only — no preamble
- Never explain, never list — one punchy sentence only
- Always end with a natural next step or question
- Be warm, friendly, and slightly Irish in tone

CRITICAL VOICE RULES:
1. NEVER use bold text (**) or markdown formatting
2. NEVER use headers or bullet points
3. Speak in plain natural conversational English
4. No lists — speak in flowing sentences
5. SHORT replies only. 10 words ideal, 15 words maximum.

RULES:
- You are an AI assistant — never claim to be a human or a team member
- If asked to speak with a manager or human, direct them to WhatsApp or email
- If the knowledge base doesn't cover their question, say you can arrange a discovery call
- Never invent specific prices, timelines, or client names
- NEVER offer to send emails, collect names, phone numbers, or any details — you cannot do this
- NEVER ask for the visitor's contact information
- To book a call or get in touch, always direct them to: WhatsApp +353 85 2007 612 or info@aimediaflow.net
- You can also mention the contact form on the website: aimediaflow.net

ENDING THE CALL:
When the user says goodbye, bye, thanks bye, that's all, or clearly indicates they are done,
say a brief warm farewell like "It was lovely chatting, take care now!" and stop responding."""


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


class AimediaflowAgent(Agent):
    def __init__(self, session_log: SessionLogger):
        super().__init__(
            instructions=SYSTEM_BASE,
            llm=groq.LLM(model="llama-3.1-8b-instant", api_key=GROQ_API_KEY),
            stt=deepgram.STT(model="nova-2-general", api_key=DEEPGRAM_API_KEY),
            tts=openai.TTS(model="tts-1", voice="bf_alice", base_url="http://kokoro-tts:8880/v1", api_key="not-needed"),
        )
        self.session_log = session_log

    async def on_user_turn_completed(self, turn_ctx, new_message):
        user_text = new_message.text_content or ""
        session_log = self.session_log
        session_log.on_user_text(user_text)

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
        logger.info("Session ended, sending report...")
        await session_log.send_email()

    ctx.add_shutdown_callback(send_report)

    await ctx.connect()
    logger.info("Agent connected to LiveKit room")

    agent = AimediaflowAgent(session_log)
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
        instructions="Greet the visitor warmly. Say you are Aoife from AIMediaFlow and ask how you can help them today. Do not use Irish phrases."
    )


if __name__ == "__main__":
    cli.run_app(WorkerOptions(
        entrypoint_fnc=entrypoint,
        agent_name="aimediaflow-agent-local"
    ))
