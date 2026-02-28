import logging
import os
from typing import Annotated

import aiohttp
from dotenv import load_dotenv

load_dotenv()

from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    WorkerOptions,
    cli,
    llm,
)
from livekit.agents.beta.tools import EndCallTool
from livekit.plugins import openai as lk_openai, deepgram, silero
from livekit.plugins.turn_detector.english import EnglishModel
from session_logger import SessionLogger

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("aimediaflow-coordinator")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")

if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY is required")

SYSTEM_PROMPT = """You are Cleo, a sharp and friendly AI coordinator for AIMediaFlow.
You help visitors understand what AIMediaFlow does, answer questions, and direct them to the right service or agent.

YOUR STYLE:
- Professional but warm — confident, clear, never robotic
- Keep replies VERY SHORT. Aim for 10-15 words. Hard limit: 20 words maximum.
- One or two short sentences maximum.
- Speak in plain natural conversational English

CRITICAL VOICE RULES:
1. NEVER use bold text or markdown formatting
2. NEVER use headers or bullet points
3. Speak in plain natural conversational English
4. No lists — speak in flowing sentences
5. SHORT replies only.

ABOUT AIMEDIAFLOW:
- AI voice agents for businesses: sales assistants, customer support, coordinators
- Real-time lipsync avatars powered by LiveKit, Deepgram STT, Kokoro TTS
- Typesense-powered product search for e-commerce
- Based in Kerry, Ireland. Contact: info@aimediaflow.net

ENDING THE CALL:
When the user says goodbye, bye, thanks bye, that is all, or clearly indicates they are done,
call the end_call tool immediately — do NOT say anything before calling it."""


# ── Agent ──────────────────────────────────────────────────────────────────────

class CoordinatorAgent(Agent):
    def __init__(self, session_log: SessionLogger):
        super().__init__(
            instructions=SYSTEM_PROMPT,
            llm=lk_openai.LLM(model="gpt-4o-mini", api_key=OPENAI_API_KEY),
            stt=deepgram.STT(model="nova-2-general", api_key=DEEPGRAM_API_KEY, endpointing_ms=500),
            tts=lk_openai.TTS(
                model="tts-1",
                voice="af_jessica",
                base_url="http://kokoro-tts:8880/v1",
                api_key="not-needed",
            ),
            tools=[
                EndCallTool(
                    end_instructions="Say a short friendly farewell, like: Bye! Talk soon!",
                    delete_room=True,
                ),
            ],
        )
        self.session_log = session_log

    async def on_user_turn_completed(self, turn_ctx, new_message):
        user_text = new_message.text_content or ""
        logger.info(f"User said: {repr(user_text)}")
        self.session_log.on_user_text(user_text)
        await super().on_user_turn_completed(turn_ctx, new_message)


async def entrypoint(ctx: JobContext):
    session_log = SessionLogger()

    async def send_report():
        logger.info("Coordinator session ended, sending report...")
        await session_log.send_email()

    ctx.add_shutdown_callback(send_report)
    await ctx.connect()
    logger.info("Coordinator agent connected to LiveKit room")

    agent = CoordinatorAgent(session_log)
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
        instructions="Greet the visitor as Cleo, the AIMediaFlow coordinator. Be warm and professional. Ask how you can help today."
    )


if __name__ == "__main__":
    cli.run_app(WorkerOptions(
        entrypoint_fnc=entrypoint,
        agent_name="aimediaflow-coordinator"
    ))
