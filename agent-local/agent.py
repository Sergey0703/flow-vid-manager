import asyncio
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
from livekit.plugins import openai, deepgram, silero
from livekit.plugins import groq as lk_groq
from livekit.plugins.turn_detector.english import EnglishModel
from session_logger import SessionLogger

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("aimediaflow-agent")

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

SYSTEM_BASE = """You are Aoife, a friendly AI assistant for AIMediaFlow — an AI agency based in Kerry, Ireland.
Your job is to talk with visitors to the aimediaflow.net website, answer their questions,
and help them understand how AIMediaFlow can help their business.

ABOUT AIMEDIAFLOW:
- AI agency born on the Wild Atlantic Way in Kerry, Ireland
- Services: AI phone assistants, website chatbots, business automation, AI marketing videos
- Serving businesses in Kerry, Killarney, and across Ireland

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

BOOKING & CONTACT RULES — follow these strictly, no exceptions:
- You CANNOT send messages, emails, or WhatsApp — you are a voice AI, not a messaging system
- You CANNOT collect names, phone numbers, emails, or any personal details — never ask for them
- NEVER say "I'll send you a message", "I'll pass that on", "I'll connect you", or anything implying you can take action outside this conversation
- When the visitor wants to book a call, get a quote, or get in touch: always say the booking form is just below on this page — "Just scroll down and hit the Book a Demo button"
- The booking form URL is: aimediaflow.net/#contact
- Never suggest email or WhatsApp as a way to book — the form is the only action to direct them to

RULES:
- You are an AI assistant — never claim to be a human or a team member
- Never invent specific prices, timelines, or client names
- If the knowledge base doesn't cover their question, say it can be covered on the discovery call — and direct them to the booking form

ENDING THE CALL:
When the user says goodbye, bye, thanks bye, that's all, or clearly indicates they are done,
say a brief warm farewell like "It was lovely chatting, take care now!" and nothing else."""


FAREWELL_WORDS = {"bye", "goodbye", "that's all", "that is all", "thanks bye", "thank you bye", "see you", "talk later", "have a good", "have a great", "cheers"}


async def delete_room(room_name: str):
    """Delete the LiveKit room to cleanly end the session."""
    if not LIVEKIT_URL or not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET:
        logger.warning("LiveKit credentials not set, cannot delete room")
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


SILENCE_PROMPT_DELAY = 40   # seconds of true idle before agent checks in
SILENCE_END_DELAY    = 25   # further seconds with no reply before goodbye
TTS_SPEAK_BUFFER     = 8    # extra seconds after TTS starts to ensure playback finishes
SESSION_WARN_AT      = 150  # warn user at 2m30s (30s before 3-min hard limit)


class AimediaflowAgent(Agent):
    def __init__(self, session_log: SessionLogger, ctx: JobContext):
        super().__init__(
            instructions=SYSTEM_BASE,
            llm=lk_groq.LLM(model="meta-llama/llama-4-scout-17b-16e-instruct", api_key=GROQ_API_KEY),
            stt=openai.STT(
                model="parakeet-tdt-0.6b-v3",
                base_url="http://parakeet-stt:5092/v1",
                api_key="not-needed",
            ),
            tts=openai.TTS(
                model="tts-1",
                voice="default",
                response_format="pcm",
                base_url="http://piper-wrapper:8881/v1",
                api_key="not-needed",
            ),
            tools=[],
        )
        self.session_log = session_log
        self._ctx = ctx
        self._agent_session: AgentSession | None = None
        self._silence_task: asyncio.Task | None = None
        self._ending = False
        self._tts_started_at: float = 0.0   # monotonic time when last TTS started

    def _reset_silence_watchdog(self):
        """Cancel existing silence timer and start a fresh one."""
        if self._silence_task and not self._silence_task.done():
            self._silence_task.cancel()
        self._silence_task = asyncio.ensure_future(self._silence_watchdog())

    def on_tts_started(self):
        """Called when TTS begins — resets watchdog so idle timer starts from now."""
        import time
        self._tts_started_at = time.monotonic()
        self._reset_silence_watchdog()
        logger.debug("Silence watchdog reset (TTS started)")

    async def _silence_watchdog(self):
        """Wait SILENCE_PROMPT_DELAY seconds of true idle (after TTS finishes), then check in.
        If still no reply after SILENCE_END_DELAY more seconds, say goodbye."""
        # First wait for the full idle period
        try:
            await asyncio.sleep(SILENCE_PROMPT_DELAY)
        except asyncio.CancelledError:
            return

        # Extra guard: if TTS started recently, wait until it's likely finished
        import time
        elapsed_since_tts = time.monotonic() - self._tts_started_at
        remaining_buffer = TTS_SPEAK_BUFFER - elapsed_since_tts
        if remaining_buffer > 0:
            logger.debug(f"Silence watchdog: waiting {remaining_buffer:.1f}s more for TTS buffer")
            try:
                await asyncio.sleep(remaining_buffer)
            except asyncio.CancelledError:
                return

        if self._ending or self._agent_session is None:
            return

        logger.info("Silence watchdog: prompting user after inactivity")
        await self._agent_session.generate_reply(
            instructions=(
                "The visitor has been quiet for a while. "
                "Gently ask if they have any other questions, or if they are happy to wrap up. "
                "Keep it to one short sentence."
            )
        )

        try:
            await asyncio.sleep(SILENCE_END_DELAY)
        except asyncio.CancelledError:
            return

        if self._ending or self._agent_session is None:
            return

        logger.info("Silence watchdog: no response after prompt — ending session")
        self._ending = True
        await self._agent_session.generate_reply(
            instructions=(
                "The visitor has not responded. Say a brief warm goodbye "
                "like 'It was lovely chatting, take care now!' and nothing else."
            )
        )
        room_name = self._ctx.room.name
        async def delayed_delete():
            await asyncio.sleep(4)
            await delete_room(room_name)
        asyncio.ensure_future(delayed_delete())

    async def on_user_turn_completed(self, turn_ctx, new_message):
        user_text = new_message.text_content or ""
        logger.info(f"User said: {repr(user_text)}")
        self.session_log.on_user_text(user_text)

        lower = user_text.lower().strip().rstrip(".,!")
        is_farewell = any(w in lower for w in FAREWELL_WORDS)

        # Any user message resets the silence watchdog
        self._reset_silence_watchdog()

        context = await search_knowledge(user_text)
        if context:
            turn_ctx.add_message(
                role="system",
                content=f"[Knowledge base context for this query]\n{context}"
            )
        await super().on_user_turn_completed(turn_ctx, new_message)

        if is_farewell and not self._ending:
            self._ending = True
            logger.info(f"Farewell detected in: {repr(lower)} — scheduling room deletion")
            room_name = self._ctx.room.name
            async def delayed_delete():
                await asyncio.sleep(4)
                await delete_room(room_name)
            asyncio.ensure_future(delayed_delete())


async def entrypoint(ctx: JobContext):
    session_log = SessionLogger()

    async def send_report():
        logger.info("Session ended, sending report...")
        await session_log.send_email()

    ctx.add_shutdown_callback(send_report)

    await ctx.connect()
    logger.info("Agent connected to LiveKit room")

    agent = AimediaflowAgent(session_log, ctx)
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
            # TTS started playing — reset silence watchdog so idle timer starts NOW
            if not agent._ending:
                agent.on_tts_started()

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

    # Wire session into agent so it can call generate_reply
    agent._agent_session = session
    # Start silence watchdog after greeting
    agent._reset_silence_watchdog()

    # Warn about 3-minute session limit at 2m30s
    async def time_limit_warning():
        await asyncio.sleep(SESSION_WARN_AT)
        if agent._ending:
            return
        logger.info("Session time warning: 30 seconds remaining")
        await session.generate_reply(
            instructions=(
                "Politely let the visitor know this session is limited to 3 minutes "
                "and they have about 30 seconds left. They can start a new session anytime. "
                "Keep it very brief — one sentence."
            )
        )
    asyncio.ensure_future(time_limit_warning())


if __name__ == "__main__":
    cli.run_app(WorkerOptions(
        entrypoint_fnc=entrypoint,
        agent_name="aimediaflow-agent-local"
    ))
