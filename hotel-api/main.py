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
        SELECT b.id, b.guest_name, b.check_in, b.check_out, b.created_at,
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
            SELECT r.number, r.type, r.description, r.price_per_night,
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
            SELECT r.number, r.type, r.description, r.price_per_night,
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
        INSERT INTO bookings (room_id, guest_name, check_in, check_out)
        VALUES (%s, %s, %s, %s) RETURNING id, created_at
        """,
        (room["id"], req.guest_name, req.check_in, req.check_out),
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
