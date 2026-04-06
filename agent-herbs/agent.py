import logging
import os
import asyncio
import aiohttp

from dotenv import load_dotenv
load_dotenv()

from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    WorkerOptions,
    WorkerType,
    cli,
)
from livekit.agents.llm import function_tool
from livekit import api as lk_api
from livekit.plugins import openai as lk_openai, deepgram, silero
from livekit.plugins import groq as lk_groq
from livekit.plugins import simli
from livekit.plugins.turn_detector.english import EnglishModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("aimediaflow-herbs")

DEEPGRAM_API_KEY   = os.getenv("DEEPGRAM_API_KEY")
GROQ_API_KEY       = os.getenv("GROQ_API_KEY")
LIVEKIT_URL        = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY    = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
SIMLI_API_KEY      = os.getenv("SIMLI_API_KEY")
SIMLI_FACE_ID      = os.getenv("SIMLI_FACE_ID")
HERBS_RAG_URL      = os.getenv("HERBS_RAG_URL", "http://65.21.3.89:8766")

SYSTEM_PROMPT = """You are Aoife, a warm and knowledgeable digital herbalist from Killarney, County Kerry, Ireland.
You help visitors of Ériu's Garden discover wild Irish herbs and find the right remedies for their needs.

YOUR KNOWLEDGE:
- 54 wild herbs from the Kerry landscape and Killarney National Park
- Traditional Irish folk medicine and Celtic herbal wisdom
- Herb preparations: teas, tinctures, infusions, compresses, aromatherapy
- Conditions: sleep, anxiety, digestion, immunity, energy, pain, skin

YOUR STYLE:
- Warm, gentle, and slightly poetic — like a wise Kerry woman
- Speak in plain natural conversational English — NO markdown, NO asterisks, NO bullet points
- Keep replies SHORT: 2-3 sentences maximum for voice
- Always ground your answers in Kerry landscape and Irish tradition
- End with a gentle question or suggestion

VOICE RULES:
1. Never use asterisks, dashes, or any markdown formatting
2. Speak in flowing natural sentences only
3. Short replies — this is a voice conversation
4. If you recommend a herb, mention one simple way to prepare it

ABOUT YOURSELF:
You are Aoife, the world's first AI voice herbalist on the Ériu's Garden website (www.eriusgarden.ie).
You are available 24/7 on the website even when the physical shop in Killarney is closed.
The physical shop is at 14 High Street, Killarney, Co. Kerry — open every day.
You can also answer questions about the shop, delivery, payments, and returns.

USING YOUR TOOLS:
You have a tool called search_herbs_knowledge. Call it when the visitor asks about:
- specific herbs, plants, or remedies
- health conditions or symptoms
- shop info, address, hours, delivery, payments, returns
Do NOT call it for greetings, farewells, or simple conversational replies like "okay" or "tell me more".

MEDICAL DISCLAIMER:
Always remind users that herbs complement but do not replace professional medical advice.
If someone describes serious symptoms, gently suggest they consult a doctor.

IF YOU DON'T KNOW:
If you cannot find an answer to the visitor's question, say warmly:
"I'm not sure about that — but our team would love to help! You're welcome to reach us at hello@eriusgarden.ie or call us on +353 64 123 4567."

ENDING THE CALL:
When the user says goodbye or they are done, say a warm Irish farewell like
"Go well, and may the Kerry herbs bring you ease!" and nothing else."""

FAREWELL_WORDS = {
    "bye", "goodbye", "that's all", "that is all", "thanks bye",
    "thank you bye", "see you", "talk later", "take care",
    "have a good", "have a great", "cheers", "slán"
}


async def delete_room(room_name: str):
    if not all([LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET]):
        return
    try:
        async with lk_api.LiveKitAPI(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET) as lkapi:
            await lkapi.room.delete_room(lk_api.DeleteRoomRequest(room=room_name))
            logger.info(f"Room {room_name} deleted")
    except Exception as e:
        logger.error(f"Failed to delete room: {e}")


# ── Agent ──────────────────────────────────────────────────────────────────────

class HerbsAgent(Agent):
    def __init__(self, ctx: JobContext):
        super().__init__(
            instructions=SYSTEM_PROMPT,
            llm=lk_groq.LLM(model="meta-llama/llama-4-scout-17b-16e-instruct", api_key=GROQ_API_KEY),
            stt=deepgram.STT(
                model="nova-3",
                language="en",
                api_key=DEEPGRAM_API_KEY,
            ),
            tts=lk_openai.TTS(
                model="tts-1",
                voice="default",
                response_format="pcm",
                base_url="http://piper-wrapper:8881/v1",
                api_key="not-needed",
            ),
            tools=[search_herbs_knowledge],
        )
        self._ctx = ctx

    async def on_user_turn_completed(self, turn_ctx, new_message):
        user_text = new_message.text_content or ""
        logger.info(f"User: {repr(user_text)}")

        lower = user_text.lower().strip().rstrip(".,!")
        is_farewell = any(w in lower for w in FAREWELL_WORDS)

        await super().on_user_turn_completed(turn_ctx, new_message)

        if is_farewell:
            room_name = self._ctx.room.name
            room = self._ctx.room
            async def delayed_end():
                await asyncio.sleep(4)
                try:
                    for p in room.remote_participants.values():
                        await room.local_participant.perform_rpc(
                            destination_identity=p.identity,
                            method="end_call",
                            payload="{}",
                        )
                except Exception as e:
                    logger.warning(f"end_call RPC failed: {e}")
                await asyncio.sleep(1)
                await delete_room(room_name)
            asyncio.ensure_future(delayed_end())


@function_tool(description="Search the Ériu's Garden knowledge base for information about Irish herbs, remedies, health conditions, and shop details like address, hours, delivery, payments, and returns.")
async def search_herbs_knowledge(query: str) -> str:
    """Called when the visitor asks about herbs, remedies, shop, delivery or health conditions."""
    logger.info(f"RAG query: {repr(query)}")
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{HERBS_RAG_URL}/query",
                headers={"Content-Type": "application/json"},
                json={"question": query, "mode": "hybrid"},
                timeout=aiohttp.ClientTimeout(total=10),
            ) as res:
                if res.status != 200:
                    return ""
                data = await res.json()
                answer = data.get("answer", "")
                if not answer:
                    return ""
                if "### References" in answer:
                    answer = answer[:answer.index("### References")].strip()
                result = answer[:600] if len(answer) > 600 else answer
                logger.info(f"RAG result length: {len(result)}")
                return result
    except Exception as e:
        logger.error(f"RAG query error: {e}")
        return ""


async def entrypoint(ctx: JobContext):
    await ctx.connect()
    logger.info("Herbs agent connected to LiveKit room")

    agent = HerbsAgent(ctx)
    session = AgentSession(
        vad=silero.VAD.load(),
        turn_detection=EnglishModel(),
        min_endpointing_delay=0.5,
        max_endpointing_delay=4.0,
    )

    simli_avatar = simli.AvatarSession(
        simli_config=simli.SimliConfig(
            api_key=SIMLI_API_KEY,
            face_id=SIMLI_FACE_ID,
        ),
    )
    await simli_avatar.start(session, room=ctx.room)

    await session.start(room=ctx.room, agent=agent)

    await session.generate_reply(
        instructions="Greet the visitor warmly as Aoife the herbalist from Killarney. Say you are here to help them find the right Kerry herb. One sentence only."
    )


if __name__ == "__main__":
    cli.run_app(WorkerOptions(
        entrypoint_fnc=entrypoint,
        agent_name="aimediaflow-herbs",
        worker_type=WorkerType.ROOM,
    ))
