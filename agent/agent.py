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
from livekit.agents.beta.tools import EndCallTool
from livekit.plugins import openai, deepgram, cartesia, silero
from session_logger import SessionLogger

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("aimediaflow-agent")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
CARTESIA_API_KEY = os.getenv("CARTESIA_API_KEY")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_HOST = os.getenv("PINECONE_INDEX_HOST")

if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY is required")

SYSTEM_BASE = """You are Aoife, a warm and confident AI sales assistant for AIMediaFlow — an AI agency based in Kerry, Ireland.
You speak with business owners and managers who have visited aimediaflow.net.
Your goal: understand their business challenge, show how AIMediaFlow can solve it, and book a discovery call.

ABOUT AIMEDIAFLOW:
AIMediaFlow builds AI-powered tools for Irish businesses — AI phone receptionists that never miss a call,
website chatbots that qualify leads 24/7, business automation that cuts repetitive admin work,
and AI marketing videos. We are based in Kerry and serve clients across Ireland.

YOUR CONVERSATION FLOW:
1. Greet warmly and ask what kind of business they run or what brought them to the site
2. Listen for their pain point — missed calls, slow response times, manual admin, lead generation
3. Connect their pain to our solution in one or two plain sentences
4. Suggest a free discovery call to explore the fit

YOUR STYLE:
- Warm, confident, slightly Irish — like a knowledgeable friend, not a salesperson
- Speak in short flowing sentences — 2 to 3 max per turn
- Never use lists, bullet points, bold text, or markdown — this is voice
- Ask one question at a time, never stack multiple questions

BOOKING A DISCOVERY CALL:
When the visitor agrees to a call, follow this strict sequence - one question at a time, never skip ahead:
Step 1: Ask for their name only. Wait for the answer.
Step 2: Ask for their phone number or email only. Wait for the answer.
Step 3: Ask what day and time suits them - morning or afternoon. Wait for the answer.
Step 4: Confirm all details back: name, contact, and time. End with: Brilliant - someone from our team will be in touch very soon!
Never give out company contact details as a substitute for collecting their information.

RULES:
- Never invent prices, timelines, or client names
- If a question is outside the knowledge base, say you can cover it on the discovery call
- Always move the conversation toward booking a call or leaving contact details
- Contact if they prefer to reach out directly: info@aimediaflow.net or WhatsApp plus three five three eight five two zero zero seven six one two

ENDING THE CALL:
When the user says goodbye, bye, thanks bye, that's all, or clearly indicates they are done,
say a brief warm farewell and immediately call the end_call tool. Do not continue talking after calling it."""


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
            llm=openai.LLM(model="gpt-4.1-nano", api_key=OPENAI_API_KEY),
            stt=deepgram.STT(model="nova-3", api_key=DEEPGRAM_API_KEY),
            tts=cartesia.TTS(voice="bf0a246a-8642-498a-9950-80c35e9276b5", api_key=CARTESIA_API_KEY),
            tools=[EndCallTool(
                end_instructions="Say a warm, brief Irish farewell — like 'It was lovely chatting, take care now!'",
                delete_room=True,
            )],
        )
        self.session_log = session_log

    async def on_user_turn_completed(self, turn_ctx, new_message):
        user_text = new_message.content if hasattr(new_message, 'content') else str(new_message)
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
        logger.info("Session ended, sending report...")
        await session_log.send_email()

    ctx.add_shutdown_callback(send_report)

    await ctx.connect()
    logger.info("Agent connected to LiveKit room")

    agent = AimediaflowAgent(session_log)
    session = AgentSession(vad=silero.VAD.load(min_silence_duration=0.8))

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
        instructions="Greet the visitor warmly. Say you are Aoife from AIMediaFlow and ask how you can help them today."
    )


if __name__ == "__main__":
    cli.run_app(WorkerOptions(
        entrypoint_fnc=entrypoint,
        agent_name="aimediaflow-agent"
    ))
