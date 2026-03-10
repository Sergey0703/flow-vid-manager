import asyncio
import base64
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
from livekit.plugins import deepgram as lk_deepgram
from livekit.plugins import silero
from livekit.plugins import groq as lk_groq
from livekit.plugins.turn_detector.english import EnglishModel
from session_logger import SessionLogger

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("aimediaflow-hotel")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
HOTEL_API_URL = os.getenv("HOTEL_API_URL", "http://hotel-api:8001")
BREVO_API_KEY = os.getenv("BREVO_API_KEY", "")
CONTACT_EMAIL = os.getenv("CONTACT_EMAIL", "info@aimediaflow.net")
ROOM_PHOTO_PATH = os.getenv("ROOM_PHOTO_PATH", "/opt/hotel-room.jpg")


def make_stt():
    """Deepgram Nova-2 primary, Parakeet local fallback."""
    if DEEPGRAM_API_KEY:
        logger.info("STT: Deepgram Nova-2 (primary)")
        return lk_deepgram.STT(
            model="nova-2-general",
            language="en",
            api_key=DEEPGRAM_API_KEY,
        )
    logger.warning("STT: Deepgram key missing — falling back to Parakeet")
    return lk_openai.STT(
        model="parakeet-tdt-0.6b-v3",
        base_url="http://parakeet-stt:5092/v1",
        api_key="not-needed",
    )

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

DATE VALIDATION — check this BEFORE calling check_availability:
- Today is {today}. If EITHER date is in the past — say "Sorry, those dates are in the past. When would you like to check in?" Do NOT call check_availability.
- If check-out is the same as or before check-in — say "Check-out must be after check-in. Could you give me your dates again?" Do NOT call check_availability.

BOOKING FLOW:
When a caller wants to book a room:
1. Ask check-in date
2. Ask check-out date
3. Validate dates (see DATE VALIDATION above)
4. Call check_availability — list available rooms with type and price
5. Ask which TYPE of room they'd like (Standard, Superior, Deluxe, Penthouse)
   - NEVER ask the caller for a specific room number — you pick an available room of their chosen type
   - Only ask for a specific number if the caller themselves mentions a room number they want
6. Ask their name
7. Ask their phone number
8. Ask for their email address: "Would you like to receive a photo of your room by email? If so, what's your email address?" (optional — if they decline, leave email blank)
9. Call book_room with the room number you chose from availability results
10. ONLY if book_room returns success: confirm "Perfect! Room [number] is booked for [name], [check-in] to [check-out]. See you then!"
    If book_room returns an error — apologise and try the next available room of the same type
11. If the caller gave an email — call send_room_photo to send them a photo of their room

ROOM NUMBERS:
- Rooms are numbered 101 to 110
- "one oh one" = 101, "one oh five" = 105, "one ten" = 110
- "one hundred and five" = 105, "one hundred five" = 105

RESCHEDULING A BOOKING:
If a caller wants to move their booking to new dates:
1. Ask for their phone number (used to identify the booking)
2. Ask for the new check-in and check-out dates
3. Validate dates (not in the past, check-out after check-in)
4. Call reschedule_booking — it will find their most recent upcoming booking automatically
5. Confirm the new dates or explain if the room isn't available and suggest alternatives

CANCELLING A BOOKING:
If a caller wants to cancel:
1. Ask for their name and phone number to confirm identity
2. Call find_upcoming_booking — it returns the booking dates without deleting
3. Read back the found dates to the caller: "I found your booking for Room [X], checking in on [date] and checking out on [date]. Shall I go ahead and cancel it?"
4. Wait for their verbal confirmation (yes/no)
5. Only if they confirm YES — call cancel_booking_by_phone
6. Confirm warmly: "Done, your booking has been cancelled. We're sorry to hear that, we hope to see you another time!"
7. If they say NO — keep the booking and say "No problem, your booking is still in place!"

DESCRIBING ROOMS:
- After listing available rooms, offer to describe any room in detail: "Would you like to know more about any of these rooms?"
- If asked, describe the room conversationally using the details provided — bed type, size, view, bathroom (shower or bath/jacuzzi), balcony, floor, etc.
- Keep descriptions natural and warm, not a list — one or two flowing sentences
- You know every room's details from the check_availability results

RULES:
- Use check_availability BEFORE suggesting rooms — never guess availability
- Dates: ask naturally, interpret "next Friday", "March 20th", etc.
- If no rooms available for those dates — apologise and suggest different dates
- You CANNOT take payment over the phone — payment is on arrival
- You CAN send room photos by email — use send_room_photo tool
- If a caller at any point asks for room photos or information by email — ask for their email address and call send_room_photo
- If the caller asks to speak to a manager or a person — say "Of course, I'll have our manager call you back. Could I take your name and phone number?" then confirm you've noted it and say the manager will be in touch shortly

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
            details = f" Details: {r['details']}" if r.get("details") else ""
            lines.append(f"Room {r['number']} — {r['type']}: {r['description']}. €{r['price_per_night']}/night, total €{total:.0f}.{details}")
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
    guest_phone: Annotated[str, "Guest phone number for booking confirmation"] = "",
    guest_email: Annotated[str, "Guest email address (optional)"] = "",
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
                    "phone": guest_phone,
                    "email": guest_email,
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


@function_tool
async def reschedule_booking(
    guest_phone: Annotated[str, "Guest's phone number as provided when booking"],
    new_check_in: Annotated[str, "New check-in date in YYYY-MM-DD format"],
    new_check_out: Annotated[str, "New check-out date in YYYY-MM-DD format"],
) -> str:
    """Reschedule an existing booking to new dates, identified by phone number."""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{HOTEL_API_URL}/bookings/reschedule",
                json={"phone": guest_phone, "new_check_in": new_check_in, "new_check_out": new_check_out},
            ) as res:
                if res.status == 404:
                    return "I couldn't find an upcoming booking for that phone number."
                if res.status == 409:
                    return f"Unfortunately the room is not available for those new dates. Would you like to try different dates?"
                if res.status != 200:
                    return "I'm having trouble rescheduling. Please try again."
                data = await res.json()
        return (
            f"Done! Booking rescheduled for {data['guest_name']}. "
            f"Room {data['room_number']} ({data['room_type']}), "
            f"{data['new_check_in']} to {data['new_check_out']}, {data['nights']} nights. "
            f"Total: €{data['total']:.0f}. Payment on arrival."
        )
    except Exception as e:
        logger.error(f"reschedule_booking error: {e}")
        return "I'm having trouble rescheduling. Please try again."


@function_tool
async def find_upcoming_booking(
    guest_phone: Annotated[str, "Guest's phone number"],
    guest_name: Annotated[str, "Guest's name to confirm identity"],
) -> str:
    """Look up an upcoming booking by phone and name WITHOUT cancelling it. Use this before cancel to read back dates to the caller."""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{HOTEL_API_URL}/bookings/find-by-phone",
                params={"phone": guest_phone, "guest_name": guest_name},
            ) as res:
                if res.status == 404:
                    return "I couldn't find an upcoming booking for that name and phone number."
                if res.status != 200:
                    return "I'm having trouble looking up the booking. Please try again."
                data = await res.json()
        return (
            f"Found booking: Room {data['room_number']} for {data['guest_name']}, "
            f"check-in {data['check_in']}, check-out {data['check_out']}."
        )
    except Exception as e:
        logger.error(f"find_upcoming_booking error: {e}")
        return "I'm having trouble looking up the booking. Please try again."


@function_tool
async def cancel_booking_by_phone(
    guest_phone: Annotated[str, "Guest's phone number"],
    guest_name: Annotated[str, "Guest's name to confirm identity"],
) -> str:
    """Cancel an upcoming booking identified by phone number and guest name."""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{HOTEL_API_URL}/bookings/cancel-by-phone",
                json={"phone": guest_phone, "guest_name": guest_name},
            ) as res:
                if res.status == 404:
                    return "I couldn't find an upcoming booking for that name and phone number."
                if res.status != 200:
                    return "I'm having trouble cancelling. Please try again."
                data = await res.json()
        return (
            f"Booking cancelled. Room {data['room_number']} for {data['guest_name']}, "
            f"{data['check_in']} to {data['check_out']}. We hope to see you another time!"
        )
    except Exception as e:
        logger.error(f"cancel_booking_by_phone error: {e}")
        return "I'm having trouble cancelling. Please try again."


@function_tool
async def send_room_photo(
    guest_email: Annotated[str, "Guest's email address to send the photo to"],
    room_number: Annotated[str, "Room number the guest has booked or is interested in"] = "",
) -> str:
    """Send a hotel room photo to the guest's email address via Brevo."""
    if not BREVO_API_KEY:
        return "Email service is not configured. I'm sorry I cannot send the photo right now."
    try:
        # Read and base64-encode the room photo
        with open(ROOM_PHOTO_PATH, "rb") as f:
            photo_b64 = base64.b64encode(f.read()).decode()

        subject = "Your room at Seaside Hotel"
        if room_number:
            subject = f"Room {room_number} at Seaside Hotel"

        payload = {
            "sender": {"name": "Seaside Hotel", "email": CONTACT_EMAIL},
            "to": [{"email": guest_email}],
            "subject": subject,
            "htmlContent": (
                "<p>Dear Guest,</p>"
                "<p>Thank you for choosing Seaside Hotel! Here is a photo of your room.</p>"
                "<p>We look forward to welcoming you!</p>"
                "<p>Warm regards,<br>Seaside Hotel Reception</p>"
            ),
            "attachment": [
                {
                    "name": "room-photo.jpg",
                    "content": photo_b64,
                }
            ],
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://api.brevo.com/v3/smtp/email",
                json=payload,
                headers={"api-key": BREVO_API_KEY, "Content-Type": "application/json"},
            ) as res:
                if res.status in (200, 201):
                    return f"Photo sent to {guest_email}. The guest will receive it shortly."
                body = await res.text()
                logger.error(f"Brevo send_room_photo error {res.status}: {body}")
                return "I'm sorry, I couldn't send the email right now. Please check back later."
    except FileNotFoundError:
        logger.error(f"Room photo not found at {ROOM_PHOTO_PATH}")
        return "I'm sorry, the room photo is not available at the moment."
    except Exception as e:
        logger.error(f"send_room_photo error: {e}")
        return "I'm sorry, I couldn't send the email right now."


# ── Agent ───────────────────────────────────────────────────────────────────────

class HotelAgent(Agent):
    def __init__(self, session_log: SessionLogger, ctx: JobContext):
        super().__init__(
            instructions=SYSTEM_BASE.format(today=date.today().strftime("%Y-%m-%d")),
            llm=lk_groq.LLM(model="meta-llama/llama-4-scout-17b-16e-instruct", api_key=GROQ_API_KEY),
            stt=make_stt(),
            tts=lk_openai.TTS(
                model="tts-1",
                voice="hotel",
                response_format="pcm",
                base_url="http://piper-wrapper:8881/v1",
                api_key="not-needed",
            ),
            tools=[check_availability, book_room, reschedule_booking, find_upcoming_booking, cancel_booking_by_phone, send_room_photo],
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
        min_endpointing_delay=1.2,
        max_endpointing_delay=5.0,
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
