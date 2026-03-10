"""
OpenAI-compatible wrapper for artibex/piper-http.
Accepts POST /v1/audio/speech  {model, voice, input, response_format}
Calls piper GET /?text=... (returns WAV 16kHz mono 16-bit)
Resamples 16000 -> 24000 Hz using soxr and streams raw PCM.
"""
import io
import os
import re
import wave
import datetime
import numpy as np
import soxr
import httpx
from fastapi import FastAPI, Response
from pydantic import BaseModel

PIPER_URL = os.getenv("PIPER_URL", "http://piper:5000")
PIPER_SAMPLE_RATE = 16000
TARGET_SAMPLE_RATE = 24000
RECORDINGS_DIR = "/recordings"

app = FastAPI()


@app.on_event("startup")
async def warmup():
    """Send one request to piper on startup to load the ONNX model into memory."""
    import asyncio
    await asyncio.sleep(2)  # give piper time to be ready
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            await client.get(f"{PIPER_URL}/", params={"text": "Hello."})
    except Exception:
        pass  # best-effort, not critical


class TTSRequest(BaseModel):
    model: str = "tts-1"
    input: str
    voice: str = "default"
    response_format: str = "pcm"
    speed: float = 1.0


@app.get("/health")
def health():
    return {"status": "ok"}


def save_wav(voice: str, text: str, pcm_out: bytes):
    try:
        subdir = os.path.join(RECORDINGS_DIR, re.sub(r"[^a-z0-9]", "", voice.lower()) or "default")
        os.makedirs(subdir, exist_ok=True)
        ts = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S_%f")[:-3]
        slug = re.sub(r"[^a-zA-Z0-9]+", "-", text.strip())[:40].strip("-")
        path = os.path.join(subdir, f"{ts}_{slug}.wav")
        with wave.open(path, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)  # 16-bit
            wf.setframerate(TARGET_SAMPLE_RATE)
            wf.writeframes(pcm_out)
    except Exception:
        pass  # never block TTS on recording failure


@app.post("/v1/audio/speech")
async def speech(req: TTSRequest):
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            f"{PIPER_URL}/",
            params={"text": req.input},
        )
        resp.raise_for_status()
        wav_bytes = resp.content

    # Parse WAV, extract PCM
    with wave.open(io.BytesIO(wav_bytes)) as wf:
        src_rate = wf.getframerate()
        pcm = wf.readframes(wf.getnframes())

    # Resample to 24000 Hz using soxr (high quality)
    samples = np.frombuffer(pcm, dtype=np.int16).astype(np.float32) / 32768.0
    resampled = soxr.resample(samples, src_rate, TARGET_SAMPLE_RATE)
    pcm_out = (resampled * 32768.0).clip(-32768, 32767).astype(np.int16).tobytes()

    save_wav(req.voice, req.input, pcm_out)

    return Response(content=pcm_out, media_type="audio/pcm")
