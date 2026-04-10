import logging
import os
import asyncio
import subprocess
from dotenv import load_dotenv

load_dotenv()

from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    RoomInputOptions,
    WorkerOptions,
    cli,
)
from livekit.plugins import groq, openai, silero
from livekit.plugins.turn_detector.english import EnglishModel

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("hermes-voice")

HERMES_BIN = os.getenv("HERMES_BIN", "/home/hermes_user/.local/bin/hermes")
HERMES_HOME = os.getenv("HERMES_HOME", "/home/hermes_user/.hermes")
HERMES_USER = os.getenv("HERMES_USER", "hermes_user")
LIGHTRAG_QUERY = os.getenv("LIGHTRAG_QUERY", "/opt/lightrag/venv/bin/python3 /opt/lightrag/query.py")


async def query_lightrag(query: str) -> str:
    """Load context from LightRAG at session start."""
    try:
        cmd = LIGHTRAG_QUERY.split() + [query]
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=30)
        result = stdout.decode().strip()
        if result and "don't have enough information" not in result.lower():
            return result
        return ""
    except Exception as e:
        logger.warning(f"LightRAG query failed: {e}")
        return ""


def clean_hermes_output(text: str) -> str:
    """Remove terminal UI elements from Hermes output."""
    import re
    lines = text.splitlines()
    clean = []
    for line in lines:
        # Skip box drawing characters, spinner lines, header/footer frames
        if any(c in line for c in ['╭', '╰', '│', '─', '✗', '✓', '◐', '◑', '◒', '◓', '⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']):
            continue
        # Skip lines that look like UI status
        if re.match(r'^\s*(Hermes Agent|❯|●|✢|✽|✶|✸|✿|\*)\s', line):
            continue
        clean.append(line)
    result = '\n'.join(clean).strip()
    # Remove ANSI escape codes
    result = re.sub(r'\x1b\[[0-9;]*m', '', result)
    return result.strip()


async def ask_hermes(message: str) -> str:
    """Send message to Hermes and get response."""
    try:
        env = {
            **os.environ,
            "HOME": f"/home/{HERMES_USER}",
            "USER": HERMES_USER,
            "HERMES_HOME": HERMES_HOME,
            "NO_COLOR": "1",
            "TERM": "dumb",
            # LiteLLM proxy runs on host, not inside container
            "LITELLM_BASE_URL": "http://host.docker.internal:4000",
        }
        proc = await asyncio.create_subprocess_exec(
            HERMES_BIN, "chat", "-q", message,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
            env=env,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=120)
        raw = stdout.decode().strip()
        response = clean_hermes_output(raw)
        if not response:
            return "I didn't get a response. Please try again."
        return response
    except asyncio.TimeoutError:
        logger.error("Hermes timed out")
        return "Sorry, I'm taking too long to think. Please try again."
    except Exception as e:
        logger.error(f"Hermes error: {e}")
        return "Sorry, I had trouble processing that. Please try again."


AGENT_INSTRUCTION = """You are a voice interface for Hermes, Serhii's personal AI assistant.
Your job is to relay messages between Serhii and Hermes accurately.

IMPORTANT:
- When Serhii speaks, pass his message to Hermes using the ask_hermes tool
- Speak Hermes's response out loud naturally
- Do NOT answer questions yourself — always use ask_hermes
- Keep your own words minimal — just relay what Hermes says

CRITICAL VOICE RULES:
- NO markdown, NO bold, NO bullet points
- Plain natural speech only
- If Hermes response contains markdown, read it as plain text
"""


class HermesVoiceAgent(Agent):
    def __init__(self, memory_context: str = "", session_ref=None) -> None:
        instructions = AGENT_INSTRUCTION
        if memory_context:
            instructions += f"\n\nCONTEXT FROM MEMORY:\n{memory_context}"
        super().__init__(instructions=instructions)
        self._session_ref = session_ref
        logger.info("HermesVoiceAgent initialized")

    async def on_user_turn_completed(self, turn_ctx, new_message):
        """Intercept user message, send to Hermes, speak response."""
        user_text = new_message.text_content or ""
        if not user_text.strip():
            return

        logger.info(f"USER: {user_text}")

        # Say something while Hermes is thinking
        if self._session_ref:
            await self._session_ref.say("One moment.", allow_interruptions=False)

        response = await ask_hermes(user_text)
        logger.info(f"HERMES: {response[:120]}")

        if self._session_ref:
            await self._session_ref.say(response, allow_interruptions=True)


async def entrypoint(ctx: JobContext):
    logger.info("Hermes Voice Agent starting")

    # Load memory context from LightRAG
    memory_context = await query_lightrag("Serhii current projects servers tasks")
    if memory_context:
        logger.info(f"Memory loaded: {len(memory_context)} chars")

    session = AgentSession(
        stt=groq.STT(model="whisper-large-v3-turbo"),
        llm=groq.LLM(model="llama-3.3-70b-versatile"),
        tts=openai.TTS(
            model="tts-1",
            voice="echo",
            base_url="http://host.docker.internal:8001/v1",
            api_key="not-needed",
        ),
        vad=silero.VAD.load(),
        turn_detection=EnglishModel(),
        min_endpointing_delay=0.5,
        max_endpointing_delay=4.0,
    )

    agent = HermesVoiceAgent(memory_context=memory_context, session_ref=session)

    @session.on("user_input_transcribed")
    def on_transcribed(event):
        if getattr(event, 'is_final', False):
            logger.info(f"STT: {getattr(event, 'transcript', '')}")

    await ctx.connect()
    logger.info("Connected to LiveKit room")

    await session.start(
        room=ctx.room,
        agent=agent,
        room_input_options=RoomInputOptions(video_enabled=False),
    )

    await session.generate_reply(
        instructions="Greet Serhii briefly, tell him Hermes is ready. One sentence."
    )


if __name__ == "__main__":
    cli.run_app(WorkerOptions(
        entrypoint_fnc=entrypoint,
        agent_name=os.getenv("AGENT_NAME", "hermes-voice-agent"),
    ))
