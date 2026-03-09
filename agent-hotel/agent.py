import asyncio
import logging
import os
from datetime import date
from typing import Annotated

import aiohttp
from dotenv import load_dotenv

load_dotenv()

from livekit import api as lk_api
from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    WorkerOptions,
    cli,
    function_tool,
)
from livekit.plugins import openai as lk_openai
from livekit.plugins import silero
from livekit.plugins import groq as lk_groq
from livekit.plugins.turn_detector.english import EnglishModel
from session_logger import SessionLogger

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("aimediaflow-hotel")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
HOTEL_API_URL = os.getenv("HOTEL_API_URL", "http://hotel-api:8001")

if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY is required")

SYSTEM_BASE = """You are Claire, the friendly AI receptionist at Seaside Hotel — a beautiful boutique hotel on the Wild Atlantic Way in Kerry, Ireland.
You are answering an inbound phone call.

ABOUT SEASIDE HOTEL:
- Boutique hotel with 10 rooms in Kerry, Ireland
- Room types: Standard (101-104, €85-89/night), Superior with sea view (105-107, €125-135/night), Deluxe Suites (108-109, €189-219/night), Penthouse (110, €299/night)
- All rooms are en-suite, breakfast included
- Located 2 minutes walk from the beach

YOUR STYLE:
- Warm, helpful and slightly Irish in tone
- Keep replies SHORT — aim for 15 words, never exceed 25 words
- Ask only one question at a time
- Be natural, conversational — like a real hotel receptionist
- Speak in plain English, no markdown or lists

CRITICAL VOICE RULES:
1. NEVER use markdown, bold text, or bullet points
2. Speak dates naturally: "the fifteenth of March" not "2026-03-15"
3. Speak prices naturally: "eighty-nine euros" not "€89"
4. SHORT replies only

BOOKING FLOW:
When a caller wants to book a room:
1. Ask check-in date
2. Ask check-out date
3. Call check_availability to find free rooms — tell the caller what's available with prices
4. Ask which room they'd like
5. Ask their name
6. Call book_room to confirm the booking
7. Confirm: "Perfect! Room [number] is booked for [name], [check-in] to [check-out]. See you then!"

RULES:
- Use check_availability BEFORE suggesting rooms — never guess availability
- Dates: ask naturally, interpret "next Friday", "March 20th", etc.
- If no rooms available for those dates — apologise and suggest different dates
- You CANNOT take payment over the phone — payment is on arrival
- You CANNOT transfer calls or send emails

ENDING THE CALL:
When caller says goodbye or they're done — say "Thanks for calling Seaside Hotel, goodbye now!" and nothing else."""


FAREWELL_WORDS = {"bye", "goodbye", "that's all", "that is all", "thanks bye", "thank you bye", "see you", "take care", "cheers", "talk later"}


async def delete_room(room_name: str):
    if not LIVEKIT_URL or not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET:
        return
    try:
        async with lk_api.LiveKitAPI(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET) as lkapi:
            await lkapi.room.delete_room(lk_api.DeleteRoomRequest(room=room_name))
            logger.info(f"Room {room_name} deleted")
    except Exception as e:
        logger.error(f"Failed to delete room: {e}")


# ── Tools ───────────────────────────────────────────────────────────────────────

@function_tool
async def check_availability(
    check_in: Annotated[str, "Check-in date in YYYY-MM-DD format"],
    check_out: Annotated[str, "Check-out date in YYYY-MM-DD format"],
) -> str:
    """Check which hotel rooms are available for the given dates."""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{HOTEL_API_URL}/availability",
                params={"check_in": check_in, "check_out": check_out},
            ) as res:
                if res.status != 200:
                    return "Sorry, I cannot check availability right now."
                rooms = await res.json()

        # Parse dates for nights calculation
        ci = date.fromisoformat(check_in)
        co = date.fromisoformat(check_out)
        nights = (co - ci).days

        available = [r for r in rooms if r["available"]]
        if not available:
            return f"No rooms available from {check_in} to {check_out} ({nights} nights). Please try different dates."

        lines = [f"Available rooms for {nights} night(s):"]
        for r in available:
            total = r["price_per_night"] * nights
            lines.append(f"Room {r['number']} — {r['type']}: {r['description']}. €{r['price_per_night']}/night, total €{total:.0f}.")
        return "\n".join(lines)
    except Exception as e:
        logger.error(f"check_availability error: {e}")
        return "I'm having trouble checking availability. Please try again."


@function_tool
async def book_room(
    room_number: Annotated[str, "Room number e.g. '105'"],
    guest_name: Annotated[str, "Full name of the guest"],
    check_in: Annotated[str, "Check-in date in YYYY-MM-DD format"],
    check_out: Annotated[str, "Check-out date in YYYY-MM-DD format"],
) -> str:
    """Book a hotel room for a guest."""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{HOTEL_API_URL}/bookings",
                json={
                    "room_number": room_number,
                    "guest_name": guest_name,
                    "check_in": check_in,
                    "check_out": check_out,
                },
            ) as res:
                if res.status == 409:
                    return f"Room {room_number} is no longer available for those dates. Please choose another room."
                if res.status == 404:
                    return f"Room {room_number} does not exist."
                if res.status != 200:
                    return "Booking failed. Please try again."
                data = await res.json()

        return (
            f"Booking confirmed! Booking ID: {data['booking_id']}. "
            f"Room {data['room_number']} ({data['room_type']}) for {data['guest_name']}, "
            f"{data['check_in']} to {data['check_out']}, {data['nights']} nights. "
            f"Total: €{data['total']:.0f}. Payment on arrival."
        )
    except Exception as e:
        logger.error(f"book_room error: {e}")
        return "I'm having trouble completing the booking. Please try again."


# ── Agent ───────────────────────────────────────────────────────────────────────

class HotelAgent(Agent):
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
                voice="default",
                response_format="pcm",
                base_url="http://piper-wrapper:8881/v1",
                api_key="not-needed",
            ),
            tools=[check_availability, book_room],
        )
        self.session_log = session_log
        self._ctx = ctx

    async def on_user_turn_completed(self, turn_ctx, new_message):
        user_text = new_message.text_content or ""
        logger.info(f"Caller said: {repr(user_text)}")
        self.session_log.on_user_text(user_text)

        lower = user_text.lower().strip().rstrip(".,!")
        is_farewell = any(w in lower for w in FAREWELL_WORDS)

        await super().on_user_turn_completed(turn_ctx, new_message)

        if is_farewell:
            logger.info(f"Farewell detected — scheduling room deletion")
            room_name = self._ctx.room.name
            async def delayed_delete():
                await asyncio.sleep(4)
                await delete_room(room_name)
            asyncio.ensure_future(delayed_delete())


async def entrypoint(ctx: JobContext):
    session_log = SessionLogger()

    async def send_report():
        logger.info("Hotel session ended, sending report...")
        await session_log.send_email()

    ctx.add_shutdown_callback(send_report)
    await ctx.connect()
    logger.info("Hotel agent connected to LiveKit room")

    agent = HotelAgent(session_log, ctx)
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
        instructions="Answer the phone warmly as Claire from Seaside Hotel. Say something like 'Seaside Hotel, Claire speaking, how can I help you?' Keep it brief and natural."
    )


if __name__ == "__main__":
    cli.run_app(WorkerOptions(
        entrypoint_fnc=entrypoint,
        agent_name="aimediaflow-hotel"
    ))
