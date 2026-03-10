import os
from datetime import date, timedelta
from typing import Optional

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "n8n-postgres-1")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_NAME = os.getenv("DB_NAME", "hotel_demo")
DB_USER = os.getenv("DB_USER", "n8n")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

app = FastAPI(title="Hotel Demo API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://aimediaflow.net",
        "https://www.aimediaflow.net",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:4173",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type"],
)


def get_conn():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
    )


# ---------- models ----------

class BookingRequest(BaseModel):
    room_number: str
    guest_name: str
    check_in: date
    check_out: date
    phone: str = ""
    email: str = ""


# ---------- routes ----------

@app.get("/health")
def health():
    try:
        conn = get_conn()
        conn.close()
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.get("/rooms")
def get_rooms():
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT * FROM rooms ORDER BY number")
    rooms = [dict(r) for r in cur.fetchall()]
    cur.close()
    conn.close()
    return rooms


@app.get("/bookings")
def get_bookings(year: int, month: int):
    """Return all bookings that overlap with given month."""
    start = date(year, month, 1)
    # last day of month
    if month == 12:
        end = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        end = date(year, month + 1, 1) - timedelta(days=1)

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(
        """
        SELECT b.id, b.guest_name, b.phone, b.check_in, b.check_out, b.created_at,
               r.number as room_number, r.type, r.price_per_night
        FROM bookings b
        JOIN rooms r ON r.id = b.room_id
        WHERE b.check_in <= %s AND b.check_out >= %s
        ORDER BY b.check_in
        """,
        (end, start),
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [
        {
            **dict(r),
            "check_in": r["check_in"].isoformat(),
            "check_out": r["check_out"].isoformat(),
            "created_at": r["created_at"].isoformat(),
        }
        for r in rows
    ]


@app.get("/availability")
def check_availability(check_in: date, check_out: date, room_number: Optional[str] = None):
    """Check which rooms are available for given dates."""
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    if room_number:
        cur.execute(
            """
            SELECT r.number, r.type, r.description, r.details, r.price_per_night,
                   NOT EXISTS (
                       SELECT 1 FROM bookings b
                       WHERE b.room_id = r.id
                         AND b.check_in < %s AND b.check_out > %s
                   ) AS available
            FROM rooms r WHERE r.number = %s
            """,
            (check_out, check_in, room_number),
        )
    else:
        cur.execute(
            """
            SELECT r.number, r.type, r.description, r.details, r.price_per_night,
                   NOT EXISTS (
                       SELECT 1 FROM bookings b
                       WHERE b.room_id = r.id
                         AND b.check_in < %s AND b.check_out > %s
                   ) AS available
            FROM rooms r ORDER BY r.number
            """,
            (check_out, check_in),
        )

    rows = [dict(r) for r in cur.fetchall()]
    cur.close()
    conn.close()
    return rows


@app.post("/bookings")
def create_booking(req: BookingRequest):
    if req.check_out <= req.check_in:
        raise HTTPException(status_code=400, detail="check_out must be after check_in")

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # get room
    cur.execute("SELECT * FROM rooms WHERE number = %s", (req.room_number,))
    room = cur.fetchone()
    if not room:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail=f"Room {req.room_number} not found")

    # check availability
    cur.execute(
        """
        SELECT id FROM bookings
        WHERE room_id = %s AND check_in < %s AND check_out > %s
        """,
        (room["id"], req.check_out, req.check_in),
    )
    conflict = cur.fetchone()
    if conflict:
        cur.close()
        conn.close()
        raise HTTPException(status_code=409, detail=f"Room {req.room_number} is not available for those dates")

    # create booking
    cur.execute(
        """
        INSERT INTO bookings (room_id, guest_name, check_in, check_out, phone, email)
        VALUES (%s, %s, %s, %s, %s, %s) RETURNING id, created_at
        """,
        (room["id"], req.guest_name, req.check_in, req.check_out, req.phone, req.email),
    )
    result = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    nights = (req.check_out - req.check_in).days
    return {
        "booking_id": result["id"],
        "room_number": req.room_number,
        "room_type": room["type"],
        "guest_name": req.guest_name,
        "phone": req.phone,
        "email": req.email,
        "check_in": req.check_in.isoformat(),
        "check_out": req.check_out.isoformat(),
        "nights": nights,
        "total": float(room["price_per_night"]) * nights,
        "created_at": result["created_at"].isoformat(),
    }


@app.delete("/bookings/{booking_id}")
def cancel_booking(booking_id: int):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM bookings WHERE id = %s RETURNING id", (booking_id,))
    deleted = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    if not deleted:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"status": "cancelled", "booking_id": booking_id}


class RescheduleRequest(BaseModel):
    phone: str
    new_check_in: date
    new_check_out: date


@app.post("/bookings/reschedule")
def reschedule_booking(req: RescheduleRequest):
    if req.new_check_out <= req.new_check_in:
        raise HTTPException(status_code=400, detail="new_check_out must be after new_check_in")

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # find booking by phone (most recent upcoming)
    cur.execute(
        """
        SELECT b.id, b.room_id, b.guest_name, b.check_in, b.check_out,
               r.number as room_number, r.type, r.price_per_night
        FROM bookings b JOIN rooms r ON r.id = b.room_id
        WHERE b.phone = %s AND b.check_in >= CURRENT_DATE
        ORDER BY b.check_in ASC LIMIT 1
        """,
        (req.phone,),
    )
    booking = cur.fetchone()
    if not booking:
        cur.close(); conn.close()
        raise HTTPException(status_code=404, detail="No upcoming booking found for this phone number")

    # check new dates don't conflict with another booking in same room (excluding this one)
    cur.execute(
        """
        SELECT id FROM bookings
        WHERE room_id = %s AND id != %s AND check_in < %s AND check_out > %s
        """,
        (booking["room_id"], booking["id"], req.new_check_out, req.new_check_in),
    )
    if cur.fetchone():
        cur.close(); conn.close()
        raise HTTPException(status_code=409, detail="Room is not available for the new dates")

    # update
    cur.execute(
        "UPDATE bookings SET check_in = %s, check_out = %s WHERE id = %s",
        (req.new_check_in, req.new_check_out, booking["id"]),
    )
    conn.commit()
    cur.close(); conn.close()

    nights = (req.new_check_out - req.new_check_in).days
    return {
        "status": "rescheduled",
        "booking_id": booking["id"],
        "room_number": booking["room_number"],
        "room_type": booking["type"],
        "guest_name": booking["guest_name"],
        "new_check_in": req.new_check_in.isoformat(),
        "new_check_out": req.new_check_out.isoformat(),
        "nights": nights,
        "total": float(booking["price_per_night"]) * nights,
    }


@app.get("/bookings/find-by-phone")
def find_booking_by_phone(phone: str, guest_name: str):
    """Find an upcoming booking by phone + name without modifying it."""
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(
        """
        SELECT b.id, b.guest_name, b.check_in, b.check_out, b.email,
               r.number as room_number, r.type
        FROM bookings b JOIN rooms r ON r.id = b.room_id
        WHERE b.phone = %s AND LOWER(b.guest_name) LIKE LOWER(%s) AND b.check_in >= CURRENT_DATE
        ORDER BY b.check_in ASC LIMIT 1
        """,
        (phone, f"%{guest_name}%"),
    )
    booking = cur.fetchone()
    cur.close(); conn.close()
    if not booking:
        raise HTTPException(status_code=404, detail="No upcoming booking found for this name and phone number")
    return {
        "booking_id": booking["id"],
        "room_number": booking["room_number"],
        "guest_name": booking["guest_name"],
        "check_in": booking["check_in"].isoformat(),
        "check_out": booking["check_out"].isoformat(),
        "email": booking["email"] or "",
    }


class CancelByPhoneRequest(BaseModel):
    phone: str
    guest_name: str


@app.post("/bookings/cancel-by-phone")
def cancel_booking_by_phone(req: CancelByPhoneRequest):
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # find upcoming booking by phone + name (case-insensitive name match)
    cur.execute(
        """
        SELECT b.id, b.guest_name, b.check_in, b.check_out,
               r.number as room_number, r.type
        FROM bookings b JOIN rooms r ON r.id = b.room_id
        WHERE b.phone = %s AND LOWER(b.guest_name) LIKE LOWER(%s) AND b.check_in >= CURRENT_DATE
        ORDER BY b.check_in ASC LIMIT 1
        """,
        (req.phone, f"%{req.guest_name}%"),
    )
    booking = cur.fetchone()
    if not booking:
        cur.close(); conn.close()
        raise HTTPException(status_code=404, detail="No upcoming booking found for this name and phone number")

    cur.execute("DELETE FROM bookings WHERE id = %s", (booking["id"],))
    conn.commit()
    cur.close(); conn.close()

    return {
        "status": "cancelled",
        "booking_id": booking["id"],
        "room_number": booking["room_number"],
        "guest_name": booking["guest_name"],
        "check_in": booking["check_in"].isoformat(),
        "check_out": booking["check_out"].isoformat(),
    }
