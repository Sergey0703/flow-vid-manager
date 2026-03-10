import { useState, useEffect, useCallback } from "react";
import "../styles/v2-styles.css";
import Navigation from "../components/v2/Navigation";
import FooterV2 from "../components/v2/FooterV2";

const HOTEL_API = "https://hotel.aimediaflow.net";
const POLL_INTERVAL = 3000;

const THEME_KEY = "v2-theme";

interface Room {
  id: number;
  number: string;
  type: string;
  description: string;
  price_per_night: number;
}

interface Booking {
  id: number;
  guest_name: string;
  check_in: string;
  check_out: string;
  room_number: string;
  type: string;
  price_per_night: number;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const TYPE_COLORS: Record<string, string> = {
  "Standard": "#4a9eff",
  "Superior": "#a855f7",
  "Deluxe Suite": "#f59e0b",
  "Penthouse": "#ef4444",
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

type DayStatus = { type: "free" | "past" | "checkin" | "checkout" | "booked"; booking: Booking | null };

function getDayStatus(bookings: Booking[], roomNumber: string, year: number, month: number, day: number, isPast: boolean): DayStatus {
  const d = new Date(year, month, day);
  for (const b of bookings) {
    if (b.room_number !== roomNumber) continue;
    const checkIn = new Date(b.check_in);
    const checkOut = new Date(b.check_out);
    if (d.getTime() === checkIn.getTime()) return { type: "checkin", booking: b };
    if (d.getTime() === checkOut.getTime()) return { type: "checkout", booking: b };
    if (d > checkIn && d < checkOut) return { type: "booked", booking: b };
  }
  return { type: isPast ? "past" : "free", booking: null };
}

function RoomCalendar({
  room,
  bookings,
  year,
  month,
}: {
  room: Room;
  bookings: Booking[];
  year: number;
  month: number;
}) {
  const daysInMonth = getDaysInMonth(year, month);
  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  const color = TYPE_COLORS[room.type] || "#4a9eff";

  return (
    <div className="hotel-room-card">
      <div className="hotel-room-header">
        <div className="hotel-room-number" style={{ borderColor: color, color }}>
          {room.number}
        </div>
        <div className="hotel-room-info">
          <span className="hotel-room-type" style={{ color }}>{room.type}</span>
          <span className="hotel-room-desc">{room.description}</span>
        </div>
        <div className="hotel-room-price">€{room.price_per_night}<span>/night</span></div>
      </div>

      <div className="hotel-calendar-grid" style={{ gridTemplateColumns: `repeat(${daysInMonth}, 1fr)` }}>
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const isPast = new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const { type: dayType, booking } = getDayStatus(bookings, room.number, year, month, day, isPast);
          return (
            <div
              key={day}
              className={`hotel-cal-day ${dayType} ${isToday(day) ? "today" : ""}`}
              title={booking ? `${booking.guest_name}\n${booking.check_in} → ${booking.check_out}` : ""}
            >
              <span className="hotel-cal-num">{day}</span>
              {booking && (dayType === "checkin" || dayType === "booked") && (
                <span className="hotel-cal-guest">{booking.guest_name.split(" ")[0]}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function HotelDemo() {
  const [isLight, setIsLight] = useState<boolean>(() => localStorage.getItem(THEME_KEY) === "light");
  const toggleTheme = () => setIsLight(prev => { const next = !prev; localStorage.setItem(THEME_KEY, next ? "light" : "dark"); return next; });

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch(`${HOTEL_API}/rooms`);
      if (res.ok) setRooms(await res.json());
    } catch { /* silent */ }
  }, []);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await fetch(`${HOTEL_API}/bookings?year=${viewYear}&month=${viewMonth + 1}`);
      if (res.ok) {
        setBookings(await res.json());
        setLastUpdated(new Date());
      }
    } catch { /* silent */ }
  }, [viewYear, viewMonth]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  useEffect(() => {
    fetchBookings();
    const interval = setInterval(fetchBookings, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchBookings]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };
  const goToday = () => { setViewYear(now.getFullYear()); setViewMonth(now.getMonth()); };

  const bookedCount = rooms.filter(r => bookings.some(b => b.room_number === r.number)).length;

  return (
    <div className={`v2-scope${isLight ? " v2-light" : ""}`}>
      <Navigation isLight={isLight} onToggleTheme={toggleTheme} />

      <main style={{ minHeight: "100vh", padding: "100px 0 60px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px" }}>

          {/* Header */}
          <div style={{ marginBottom: 40 }}>
            <span className="v2-section-tag">Live Demo</span>
            <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 700, margin: "12px 0 8px", color: "var(--v2-text)" }}>
              Seaside Hotel — Booking Calendar
            </h1>
            <p style={{ color: "var(--v2-muted)", fontSize: "1rem", maxWidth: 600 }}>
              Call the AI receptionist and watch your booking appear in real time.
              Updates every 3 seconds.
            </p>
          </div>

          {/* Stats bar */}
          <div style={{ display: "flex", gap: 24, marginBottom: 32, flexWrap: "wrap", alignItems: "center" }}>
            <div className="hotel-stat">
              <span className="hotel-stat-value">{rooms.length}</span>
              <span className="hotel-stat-label">Rooms</span>
            </div>
            <div className="hotel-stat">
              <span className="hotel-stat-value" style={{ color: "#ef4444" }}>{bookedCount}</span>
              <span className="hotel-stat-label">Booked this month</span>
            </div>
            <div className="hotel-stat">
              <span className="hotel-stat-value" style={{ color: "#22c55e" }}>{rooms.length - bookedCount}</span>
              <span className="hotel-stat-label">Available</span>
            </div>
            {lastUpdated && (
              <span style={{ marginLeft: "auto", color: "var(--v2-muted)", fontSize: "0.8rem" }}>
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>

          {/* Month nav */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
            <button className="hotel-nav-btn" onClick={prevMonth}>←</button>
            <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 600, color: "var(--v2-text)", minWidth: 220, textAlign: "center" }}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h2>
            <button className="hotel-nav-btn" onClick={nextMonth}>→</button>
            <button className="hotel-nav-btn hotel-nav-today" onClick={goToday}>Today</button>
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: 20, marginBottom: 24, flexWrap: "wrap" }}>
            {Object.entries(TYPE_COLORS).map(([type, color]) => (
              <div key={type} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", color: "var(--v2-muted)" }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: color, display: "inline-block" }} />
                {type}
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", color: "var(--v2-muted)" }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: "rgba(239,68,68,0.35)", display: "inline-block" }} />
              Booked
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", color: "var(--v2-muted)" }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: "rgba(74,158,255,0.18)", border: "1px solid rgba(74,158,255,0.4)", display: "inline-block" }} />
              Free
            </div>
          </div>

          {/* Room calendars */}
          {rooms.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--v2-muted)", padding: 60 }}>Loading rooms…</div>
          ) : (
            <div className="hotel-rooms-list">
              {rooms.map(room => (
                <RoomCalendar
                  key={room.id}
                  room={room}
                  bookings={bookings}
                  year={viewYear}
                  month={viewMonth}
                />
              ))}
            </div>
          )}

        </div>
      </main>

      <FooterV2 isLight={isLight} />
    </div>
  );
}
