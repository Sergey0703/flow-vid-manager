import logging
import os
import asyncio
import re
import aiohttp
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

HERMES_API_URL = os.getenv("HERMES_API_URL", "http://localhost:8642/v1/chat/completions")
HERMES_API_KEY = os.getenv("HERMES_API_KEY", "voice-hermes-2026")
HERMES_HOME = os.getenv("HERMES_HOME", "/home/hermes_user/.hermes")
VOICE_SESSION_FILE = os.path.join(HERMES_HOME, ".voice_api_session_id")


def get_voice_session_id() -> str:
    try:
        if os.path.exists(VOICE_SESSION_FILE):
            session_id = open(VOICE_SESSION_FILE).read().strip()
            if session_id:
                return session_id
    except Exception:
        pass
    return ""


def save_voice_session_id(session_id: str):
    try:
        with open(VOICE_SESSION_FILE, "w") as f:
            f.write(session_id)
    except Exception as e:
        logger.warning(f"Could not save session ID: {e}")


async def ask_hermes(message: str) -> str:
    session_id = get_voice_session_id()
    headers = {"Content-Type": "application/json"}
    if HERMES_API_KEY:
        headers["Authorization"] = f"Bearer {HERMES_API_KEY}"
    if session_id:
        headers["X-Hermes-Session-Id"] = session_id

    payload = {
        "model": "hermes-agent",
        "messages": [{"role": "user", "content": message}],
        "stream": False,
    }

    try:
        async with aiohttp.ClientSession() as http:
            async with http.post(
                HERMES_API_URL,
                json=payload,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=60),
            ) as resp:
                if resp.status != 200:
                    text = await resp.text()
                    logger.error(f"Hermes API error {resp.status}: {text[:200]}")
                    return "Sorry, I had trouble processing that. Please try again."

                # Save session ID for continuity
                new_session_id = resp.headers.get("X-Hermes-Session-Id", "")
                if new_session_id and new_session_id != session_id:
                    save_voice_session_id(new_session_id)
                    logger.info(f"Voice session saved: {new_session_id}")

                data = await resp.json()
                content = data["choices"][0]["message"]["content"]
                logger.info(f"HERMES RESPONSE: {content[:200]}")
                return content or "I didn't get a response. Please try again."

    except asyncio.TimeoutError:
        logger.error("Hermes API timed out")
        return "Sorry, I'm taking too long to think. Please try again."
    except Exception as e:
        logger.error(f"Hermes API error: {e}")
        return "Sorry, I had trouble processing that. Please try again."


class HermesLLMStream(llm.LLMStream):
    def __init__(self, hermes_llm, *, chat_ctx, tools, conn_options):
        super().__init__(hermes_llm, chat_ctx=chat_ctx, tools=tools, conn_options=conn_options)

    async def _run(self) -> None:
        user_message = ""
        for msg in reversed(self._chat_ctx.messages()):
            if msg.role == "user":
                user_message = msg.text_content or ""
                break

        if not user_message:
            return

        logger.info(f"USER: {user_message}")
        response = await ask_hermes(user_message)

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

    agent = Agent(instructions=AGENT_INSTRUCTION)

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
