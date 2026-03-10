import json
import os
from typing import Optional

import redis
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

load_dotenv()

REDIS_HOST = os.getenv("REDIS_HOST", "127.0.0.1")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
CART_TTL = 7 * 24 * 3600  # 7 days in seconds

app = FastAPI(title="Cart API")

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

r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)


def _cart_key(visitor_id: str) -> str:
    return f"cart:{visitor_id}"


def _load_items(visitor_id: str) -> list[dict]:
    raw = r.get(_cart_key(visitor_id))
    if not raw:
        return []
    try:
        return json.loads(raw)
    except Exception:
        return []


def _save_items(visitor_id: str, items: list[dict]) -> None:
    r.setex(_cart_key(visitor_id), CART_TTL, json.dumps(items))


def _calc_total(items: list[dict]) -> float:
    return round(sum(item["price"] * item.get("qty", 1) for item in items), 2)


# ---------- models ----------

class AddItem(BaseModel):
    id: str
    name: str
    price: float
    qty: int = 1
    size: str = ""


class RemoveItem(BaseModel):
    id: str


class UpdateQty(BaseModel):
    id: str
    qty: int


# ---------- routes ----------

@app.get("/health")
def health():
    try:
        r.ping()
        return {"status": "ok", "redis": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Redis unavailable: {e}")


@app.get("/cart/{visitor_id}")
def get_cart(visitor_id: str):
    items = _load_items(visitor_id)
    return {"items": items, "total": _calc_total(items)}


@app.post("/cart/{visitor_id}/add")
def add_to_cart(visitor_id: str, item: AddItem):
    items = _load_items(visitor_id)
    for existing in items:
        if existing["id"] == item.id:
            existing["qty"] = item.qty  # replace, not accumulate
            existing["size"] = item.size
            _save_items(visitor_id, items)
            return {"items": items, "total": _calc_total(items)}
    items.append({"id": item.id, "name": item.name, "price": item.price, "qty": item.qty, "size": item.size})
    _save_items(visitor_id, items)
    return {"items": items, "total": _calc_total(items)}


@app.post("/cart/{visitor_id}/remove")
def remove_from_cart(visitor_id: str, body: RemoveItem):
    items = _load_items(visitor_id)
    items = [i for i in items if i["id"] != body.id]
    _save_items(visitor_id, items)
    return {"items": items, "total": _calc_total(items)}


@app.post("/cart/{visitor_id}/update")
def update_qty(visitor_id: str, body: UpdateQty):
    items = _load_items(visitor_id)
    for item in items:
        if item["id"] == body.id:
            if body.qty <= 0:
                items = [i for i in items if i["id"] != body.id]
            else:
                item["qty"] = body.qty
            break
    _save_items(visitor_id, items)
    return {"items": items, "total": _calc_total(items)}


@app.delete("/cart/{visitor_id}")
def clear_cart(visitor_id: str):
    r.delete(_cart_key(visitor_id))
    return {"items": [], "total": 0.0}


# ---------- Twilio TwiML webhook ----------

LIVEKIT_SIP_URI = "sip:+353646655830@x6lac9z6uul.sip.livekit.cloud"

@app.post("/twiml/voice")
async def twiml_voice(request: Request):
    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Sip>{LIVEKIT_SIP_URI}</Sip>
  </Dial>
</Response>"""
    return Response(content=twiml, media_type="application/xml")
