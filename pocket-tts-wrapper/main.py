"""
OpenAI-compatible TTS wrapper for pocket-tts.
Accepts POST /v1/audio/speech  {model, voice, input}
Forwards to pocket-tts /tts as form-data
Returns streaming audio/wav
"""
import os
import httpx
from fastapi import FastAPI, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

POCKET_TTS_URL = os.getenv("POCKET_TTS_URL", "http://pocket-tts:8000")

# Built-in voices (no HF auth needed) — passed by name directly
BUILTIN_VOICES = {"alba", "marius", "javert", "jean", "fantine", "cosette", "eponine", "azelma"}
DEFAULT_VOICE = "alba"

app = FastAPI()


class TTSRequest(BaseModel):
    model: str = "tts-1"
    input: str
    voice: str = DEFAULT_VOICE
    response_format: str = "wav"
    speed: float = 1.0


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/v1/audio/speech")
async def speech(req: TTSRequest):
    voice = req.voice.lower()
    if voice not in BUILTIN_VOICES:
        voice = DEFAULT_VOICE

    async def stream():
        async with httpx.AsyncClient(timeout=30.0) as client:
            async with client.stream(
                "POST",
                f"{POCKET_TTS_URL}/tts",
                data={"text": req.input, "voice_url": voice},
            ) as resp:
                resp.raise_for_status()
                async for chunk in resp.aiter_bytes(chunk_size=4096):
                    yield chunk

    return StreamingResponse(stream(), media_type="audio/wav")
