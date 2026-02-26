"""
Run once on the server to generate pre-recorded PCM phrases.
Usage: python generate_phrases.py
Output: ./phrases/*.pcm  (24000 Hz, mono, int16, pitch-shifted +8 semitones)
"""
import os
import httpx
import numpy as np
from pedalboard import Pedalboard, PitchShift

KOKORO_URL = "http://kokoro-tts:8880/v1"
VOICE = "am_puck"
SPEED = 1.2
SEMITONES = 8
SAMPLE_RATE = 24000
OUT_DIR = "./phrases"

PHRASES = {
    # Greetings (one picked randomly at session start)
    "greet_0": "Hi! I'm Pixel, AIMediaFlow's AI assistant. How can I help?",
    "greet_1": "Hey there! I'm Pixel. What can I do for you today?",
    "greet_2": "Hello! I'm Pixel from AIMediaFlow. What's on your mind?",

    # Farewells
    "bye_0": "Bye! Come back anytime!",
    "bye_1": "Great chatting! See you soon!",
    "bye_2": "Take care! Come back anytime!",

    # Thinking fillers (played while LLM generates)
    "think_0": "Let me think...",
    "think_1": "Good question...",
    "think_2": "One second...",
}


def pitch_shift(raw_bytes: bytes) -> bytes:
    samples = np.frombuffer(raw_bytes, dtype=np.int16).astype(np.float32) / 32768.0
    board = Pedalboard([PitchShift(semitones=SEMITONES)])
    shifted = board(samples[np.newaxis, :], SAMPLE_RATE)[0]
    return np.clip(shifted * 32768.0, -32768, 32767).astype(np.int16).tobytes()


def generate():
    os.makedirs(OUT_DIR, exist_ok=True)
    with httpx.Client(timeout=30) as client:
        for name, text in PHRASES.items():
            out_path = os.path.join(OUT_DIR, f"{name}.pcm")
            print(f"Generating: {name} → \"{text}\"")
            resp = client.post(
                f"{KOKORO_URL}/audio/speech",
                json={
                    "model": "kokoro",
                    "voice": VOICE,
                    "input": text,
                    "response_format": "pcm",
                    "speed": SPEED,
                },
            )
            resp.raise_for_status()
            shifted = pitch_shift(resp.content)
            with open(out_path, "wb") as f:
                f.write(shifted)
            print(f"  Saved {len(shifted)} bytes → {out_path}")
    print(f"\nDone! {len(PHRASES)} phrases saved to {OUT_DIR}/")


if __name__ == "__main__":
    generate()
