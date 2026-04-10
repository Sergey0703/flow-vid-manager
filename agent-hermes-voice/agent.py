import logging
import os
import asyncio
import re
from dotenv import load_dotenv

load_dotenv()

from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    RoomInputOptions,
    WorkerOptions,
    cli,
    llm,
    APIConnectOptions,
    NOT_GIVEN,
    NotGivenOr,
)
from livekit.agents.llm import ChatChunk, ChoiceDelta
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
    lines = text.splitlines()
    clean = []
    for line in lines:
        if any(c in line for c in ['╭', '╰', '│', '─', '✗', '✓', '◐', '◑', '◒', '◓', '⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']):
            continue
        if re.match(r'^\s*(Hermes Agent|❯|●|✢|✽|✶|✸|✿|\*)\s', line):
            continue
        clean.append(line)
    result = '\n'.join(clean).strip()
    result = re.sub(r'\x1b\[[0-9;]*m', '', result)
    return result.strip()


async def get_telegram_session_id() -> str:
    """Find the most recent named (Telegram) session ID."""
    try:
        env = {
            **os.environ,
            "HOME": f"/home/{HERMES_USER}",
            "USER": HERMES_USER,
            "HERMES_HOME": HERMES_HOME,
            "NO_COLOR": "1",
            "TERM": "dumb",
        }
        proc = await asyncio.create_subprocess_exec(
            HERMES_BIN, "sessions", "list",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
            env=env,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=10)
        for line in stdout.decode().splitlines():
            # Skip header, cron jobs, and unnamed sessions (starting with —)
            if line.startswith(("Title", "─", "—", " ")) or "cron" in line:
                continue
            parts = line.rsplit(None, 1)
            if len(parts) == 2:
                session_id = parts[-1].strip()
                if session_id and not session_id.startswith("cron"):
                    logger.info(f"Using Telegram session: {session_id}")
                    return session_id
    except Exception as e:
        logger.warning(f"Could not find Telegram session: {e}")
    return ""


async def ask_hermes(message: str) -> str:
    try:
        session_id = await get_telegram_session_id()
        resume_args = ["--resume", session_id] if session_id else ["--continue"]
        env = {
            **os.environ,
            "HOME": f"/home/{HERMES_USER}",
            "USER": HERMES_USER,
            "HERMES_HOME": HERMES_HOME,
            "NO_COLOR": "1",
            "TERM": "dumb",
            "LITELLM_BASE_URL": "http://localhost:4000",
        }
        proc = await asyncio.create_subprocess_exec(
            HERMES_BIN, "chat", "-q", message, *resume_args, "-Q",
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


class HermesLLMStream(llm.LLMStream):
    def __init__(self, hermes_llm, *, chat_ctx, tools, conn_options):
        super().__init__(hermes_llm, chat_ctx=chat_ctx, tools=tools, conn_options=conn_options)

    async def _run(self) -> None:
        # Get last user message
        user_message = ""
        for msg in reversed(self._chat_ctx.messages()):
            if msg.role == "user":
                user_message = msg.text_content or ""
                break

        if not user_message:
            return

        logger.info(f"USER: {user_message}")
        response = await ask_hermes(user_message)
        logger.info(f"HERMES RESPONSE: {response}")

        # Stream response word by word
        words = response.split()
        for i, word in enumerate(words):
            chunk = word + (" " if i < len(words) - 1 else "")
            await self._event_ch.send(
                ChatChunk(
                    id="hermes",
                    delta=ChoiceDelta(role="assistant", content=chunk)
                )
            )


class HermesLLM(llm.LLM):
    def chat(
        self,
        *,
        chat_ctx,
        tools=None,
        conn_options=APIConnectOptions(),
        parallel_tool_calls=NOT_GIVEN,
        tool_choice=NOT_GIVEN,
        extra_kwargs=NOT_GIVEN,
    ) -> llm.LLMStream:
        return HermesLLMStream(
            self,
            chat_ctx=chat_ctx,
            tools=tools or [],
            conn_options=conn_options,
        )


AGENT_INSTRUCTION = """You are Hermes, Serhii's personal AI assistant speaking via voice.
Keep responses concise and natural for voice conversation.
No markdown, no bullet points — plain speech only.
"""


async def entrypoint(ctx: JobContext):
    logger.info("Hermes Voice Agent starting")

    await ctx.connect()
    logger.info("Connected to LiveKit room")

    # Load memory context from LightRAG (after connect)
    memory_context = await query_lightrag("Serhii current projects servers tasks")
    if memory_context:
        logger.info(f"Memory loaded: {len(memory_context)} chars")

    instructions = AGENT_INSTRUCTION
    if memory_context:
        instructions += f"\n\nCONTEXT FROM MEMORY:\n{memory_context}"

    session = AgentSession(
        stt=groq.STT(model="whisper-large-v3-turbo"),
        llm=HermesLLM(),
        tts=openai.TTS(
            model="tts-1",
            voice="echo",
            base_url="http://localhost:8001/v1",
            api_key="not-needed",
        ),
        vad=silero.VAD.load(),
        turn_detection=EnglishModel(),
        min_endpointing_delay=0.5,
        max_endpointing_delay=4.0,
    )

    agent = Agent(instructions=instructions)

    @session.on("user_input_transcribed")
    def on_transcribed(event):
        logger.info(f"STT event: is_final={getattr(event, 'is_final', '?')} transcript={getattr(event, 'transcript', '')!r}")

    @session.on("user_state_changed")
    def on_user_state(event):
        logger.info(f"User state: {event}")

    @session.on("agent_state_changed")
    def on_agent_state(event):
        logger.info(f"Agent state: {event}")

    await session.start(
        room=ctx.room,
        agent=agent,
        room_input_options=RoomInputOptions(video_enabled=False),
    )

    await asyncio.sleep(2)
    await session.say("Hermes is ready. How can I help you?")


if __name__ == "__main__":
    cli.run_app(WorkerOptions(
        entrypoint_fnc=entrypoint,
        agent_name=os.getenv("AGENT_NAME", "hermes-voice-agent"),
    ))
