"""
OpenAI-compatible TTS wrapper for pocket-tts.
Accepts POST /v1/audio/speech  {model, voice, input, response_format}
Forwards to pocket-tts /tts as form-data (returns WAV)
Converts WAV → MP3 using lameenc (pure Python, no subprocess overhead)
"""
import io
import os
import wave
import lameenc
import httpx
from fastapi import FastAPI, Response
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
    response_format: str = "mp3"
    speed: float = 1.0


def wav_to_mp3(wav_bytes: bytes, bitrate: int = 96) -> bytes:
    with wave.open(io.BytesIO(wav_bytes)) as wf:
        channels = wf.getnchannels()
        rate = wf.getframerate()
        pcm = wf.readframes(wf.getnframes())

    enc = lameenc.Encoder()
    enc.set_bit_rate(bitrate)
    enc.set_in_sample_rate(rate)
    enc.set_channels(channels)
    enc.set_quality(7)  # 2=best, 7=fast — good enough for voice
    return bytes(enc.encode(pcm) + enc.flush())


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/v1/audio/speech")
async def speech(req: TTSRequest):
    voice = req.voice.lower()
    if voice not in BUILTIN_VOICES:
        voice = DEFAULT_VOICE

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            f"{POCKET_TTS_URL}/tts",
            data={"text": req.input, "voice_url": voice},
        )
        resp.raise_for_status()
        wav_bytes = resp.content

    fmt = req.response_format.lower()
    if fmt == "wav":
        return Response(content=wav_bytes, media_type="audio/wav")

    mp3_bytes = wav_to_mp3(wav_bytes)
    return Response(content=mp3_bytes, media_type="audio/mpeg")
