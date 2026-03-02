"""
Pixel Sales Agent — voice tester.

Connects to a LiveKit room as a virtual user, synthesises each scenario
message via Piper TTS, streams the audio to the agent, and waits for
the agent's reply (tracks set_attributes for UI state changes).

Usage:
    python voice_test_agent.py                          # all scenarios
    python voice_test_agent.py --scenario hoodie_browse
    python voice_test_agent.py --scenario hoodie_browse --no-pause
    python voice_test_agent.py --list
    python voice_test_agent.py --room my-room-name      # join existing room

Requirements (already in container):
    livekit[rtc]>=1.0  livekit-agents>=1.4  aiohttp  python-dotenv
"""

import asyncio
import argparse
import json
import logging
import os
import sys
import struct
from datetime import datetime

import aiohttp
from dotenv import load_dotenv
from livekit import rtc, api as lk_api

load_dotenv()

# ── Config ──────────────────────────────────────────────────────────────────

LIVEKIT_URL        = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY    = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
PIPER_URL          = os.getenv("PIPER_URL", "http://piper-wrapper-ryan:8881/v1/audio/speech")

SCENARIOS_FILE = os.path.join(os.path.dirname(__file__), "test_scenarios.json")
LOG_FILE       = os.path.join(os.path.dirname(__file__), "voice_test_results.log")

# Piper produces 22050 Hz mono PCM (int16)
PIPER_SAMPLE_RATE = 22050
PIPER_CHANNELS    = 1

# LiveKit requires 48000 Hz for audio tracks
LK_SAMPLE_RATE    = 48000
LK_CHANNELS       = 1

# How long to wait for agent to finish speaking after each user message (seconds)
AGENT_REPLY_WAIT  = 8.0

logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger("voice-tester")


# ── Terminal colours ─────────────────────────────────────────────────────────

class C:
    RESET   = "\033[0m"
    BOLD    = "\033[1m"
    CYAN    = "\033[96m"
    YELLOW  = "\033[93m"
    GREEN   = "\033[92m"
    MAGENTA = "\033[95m"
    DIM     = "\033[2m"
    BLUE    = "\033[94m"
    RED     = "\033[91m"


# ── TTS helper ───────────────────────────────────────────────────────────────

async def tts_to_pcm(text: str) -> bytes:
    """Call Piper TTS, return raw PCM int16 bytes at PIPER_SAMPLE_RATE."""
    async with aiohttp.ClientSession() as session:
        async with session.post(
            PIPER_URL,
            json={"model": "tts-1", "input": text, "voice": "default", "response_format": "pcm"},
        ) as resp:
            if resp.status != 200:
                raise RuntimeError(f"Piper TTS error {resp.status}: {await resp.text()}")
            return await resp.read()


def resample_pcm(pcm_bytes: bytes, from_rate: int, to_rate: int) -> bytes:
    """Simple linear resampler for int16 mono PCM."""
    if from_rate == to_rate:
        return pcm_bytes
    resampler = rtc.AudioResampler(from_rate, to_rate, num_channels=1)
    # Build an AudioFrame from raw bytes
    frame = rtc.AudioFrame(
        data=pcm_bytes,
        sample_rate=from_rate,
        num_channels=1,
        samples_per_channel=len(pcm_bytes) // 2,
    )
    out_frames = resampler.push(frame)
    out_data = b"".join(bytes(f.data) for f in out_frames)
    # Flush
    flush_frames = resampler.flush()
    out_data += b"".join(bytes(f.data) for f in flush_frames)
    return out_data


# ── LiveKit token ─────────────────────────────────────────────────────────────

def make_token(room_name: str, identity: str) -> str:
    token = lk_api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
    token.with_identity(identity)
    token.with_name("Voice Tester")
    token.with_grants(lk_api.VideoGrants(
        room_join=True,
        room=room_name,
        can_publish=True,
        can_subscribe=True,
    ))
    return token.to_jwt()


# ── Voice test session ────────────────────────────────────────────────────────

class VoiceTestSession:
    def __init__(self, room_name: str, log_lines: list, no_pause: bool, pauses: dict):
        self.room_name  = room_name
        self.log_lines  = log_lines
        self.no_pause   = no_pause
        self.pauses     = pauses
        self.room       = rtc.Room()
        self.ui_state   = {"recommended_ids": "", "expanded_id": ""}
        self._agent_speaking = asyncio.Event()
        self._agent_done     = asyncio.Event()
        self._agent_done.set()  # not speaking initially
        self._agent_text_buffer: list[str] = []

    def _print(self, line: str):
        print(line)
        clean = "".join(
            c for c in line
            if c.isprintable() or c in "\n\t"
        )
        # Strip ANSI
        import re
        clean = re.sub(r'\033\[[0-9;]*m', '', line)
        self.log_lines.append(clean)

    async def connect(self):
        token = make_token(self.room_name, f"voice-tester-{datetime.now().strftime('%H%M%S')}")

        # Track agent attributes changes (UI state)
        @self.room.on("participant_attributes_changed")
        def on_attrs(changed_attributes: dict, participant: rtc.Participant):
            if participant.kind == rtc.ParticipantKind.PARTICIPANT_KIND_AGENT:
                for k, v in changed_attributes.items():
                    self.ui_state[k] = v
                # Display
                parts = []
                rec = self.ui_state.get("recommended_ids", "")
                exp = self.ui_state.get("expanded_id", "")
                if rec:
                    parts.append(f"recommended: [{rec}]")
                if "expanded_id" in changed_attributes:
                    parts.append(f"expanded: {exp if exp else 'CLOSED'}")
                if "cart_action" in changed_attributes:
                    action_raw = changed_attributes["cart_action"]
                    if action_raw:
                        try:
                            import json as _json
                            a = _json.loads(action_raw)
                            parts.append(f"cart_action: {a.get('action')}({a.get('id')},qty={a.get('qty',1)})")
                        except Exception:
                            parts.append(f"cart_action: {action_raw}")
                if parts:
                    self._print(f"  {C.BLUE}→ UI: {' | '.join(parts)}{C.RESET}")

        # Track when agent starts/stops speaking (via track mute state)
        @self.room.on("track_published")
        def on_track_pub(pub: rtc.RemoteTrackPublication, participant: rtc.RemoteParticipant):
            if pub.kind == rtc.TrackKind.KIND_AUDIO:
                self._print(f"  {C.DIM}Agent audio track published{C.RESET}")

        await self.room.connect(
            LIVEKIT_URL,
            token,
            options=rtc.RoomOptions(auto_subscribe=True),
        )
        self._print(f"  {C.DIM}Connected to room: {self.room_name}{C.RESET}")

    async def disconnect(self):
        await self.room.disconnect()

    async def say(self, text: str, msg_index: int):
        """Synthesise text → PCM → publish to LiveKit room."""
        self._print(f"\n{C.YELLOW}[You #{msg_index}]{C.RESET}: {text}")

        # Generate TTS
        try:
            pcm_piper = await tts_to_pcm(text)
        except Exception as e:
            self._print(f"  {C.RED}TTS error: {e}{C.RESET}")
            return

        # Resample to LiveKit rate
        pcm_lk = resample_pcm(pcm_piper, PIPER_SAMPLE_RATE, LK_SAMPLE_RATE)
        num_samples = len(pcm_lk) // 2
        duration_ms = num_samples * 1000 // LK_SAMPLE_RATE
        self._print(f"  {C.DIM}Audio: {duration_ms}ms ({num_samples} samples @ {LK_SAMPLE_RATE}Hz){C.RESET}")

        # Publish audio to room
        audio_source = rtc.AudioSource(LK_SAMPLE_RATE, LK_CHANNELS)
        track = rtc.LocalAudioTrack.create_audio_track("voice-tester-mic", audio_source)
        options = rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE)

        pub = await self.room.local_participant.publish_track(track, options)

        # Stream PCM in 20ms chunks (960 samples at 48kHz)
        CHUNK_SAMPLES = 960
        CHUNK_BYTES   = CHUNK_SAMPLES * 2
        chunk_duration_ms = CHUNK_SAMPLES * 1000 / LK_SAMPLE_RATE  # 20ms

        for offset in range(0, len(pcm_lk), CHUNK_BYTES):
            chunk = pcm_lk[offset:offset + CHUNK_BYTES]
            if len(chunk) < CHUNK_BYTES:
                chunk = chunk + b"\x00" * (CHUNK_BYTES - len(chunk))
            frame = rtc.AudioFrame(
                data=chunk,
                sample_rate=LK_SAMPLE_RATE,
                num_channels=LK_CHANNELS,
                samples_per_channel=CHUNK_SAMPLES,
            )
            await audio_source.capture_frame(frame)
            await asyncio.sleep(chunk_duration_ms / 1000)

        # Unpublish mic after speaking
        await self.room.local_participant.unpublish_track(pub.sid)

    async def wait_for_agent(self):
        """Wait for agent to respond (fixed delay — agent speaking detection is complex)."""
        wait = self.pauses.get("pause_after_tool_call_sec", 2.0) if not self.no_pause else 0
        reply_wait = AGENT_REPLY_WAIT if not self.no_pause else 3.0
        await asyncio.sleep(reply_wait)
        # Show current UI state
        rec = self.ui_state.get("recommended_ids", "")
        exp = self.ui_state.get("expanded_id", "")
        if rec or exp:
            parts = []
            if rec: parts.append(f"recommended=[{rec}]")
            if exp: parts.append(f"expanded={exp}")
            self._print(f"  {C.DIM}UI state: {' | '.join(parts)}{C.RESET}")


# ── Scenario runner ───────────────────────────────────────────────────────────

async def run_voice_scenario(scenario: dict, pauses: dict, log_lines: list, no_pause: bool):
    sid      = scenario["id"]
    persona  = scenario["persona"]
    messages = scenario["messages"]

    room_name = f"voice-test-{sid}-{datetime.now().strftime('%H%M%S')}"

    print(f"\n{C.BOLD}{C.CYAN}{'═'*60}{C.RESET}")
    print(f"{C.BOLD}{C.CYAN}SCENARIO: {sid}{C.RESET}")
    print(f"{C.DIM}Persona: {persona}{C.RESET}")
    print(f"{C.DIM}Room: {room_name}{C.RESET}")
    print(f"{C.BOLD}{C.CYAN}{'═'*60}{C.RESET}")
    log_lines.extend([f"\n{'='*60}", f"SCENARIO: {sid} | {persona}", f"Room: {room_name}", f"{'='*60}"])

    session = VoiceTestSession(room_name, log_lines, no_pause, pauses)

    # Create the room and dispatch the agent to it
    async with lk_api.LiveKitAPI(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET) as lkapi:
        await lkapi.room.create_room(lk_api.CreateRoomRequest(name=room_name))
        print(f"  {C.DIM}Room created{C.RESET}")

        # Dispatch named agent to this room
        try:
            dispatch = await lkapi.agent_dispatch.create_dispatch(
                lk_api.CreateAgentDispatchRequest(
                    agent_name="aimediaflow-salesmanager",
                    room=room_name,
                )
            )
            print(f"  {C.DIM}Agent dispatched: {dispatch.id}{C.RESET}")
        except Exception as e:
            print(f"  {C.YELLOW}Agent dispatch warning: {e}{C.RESET}")

        # Connect tester as participant
        await session.connect()

        # Wait for agent to join and greet
        greet_wait = 8.0 if not no_pause else 5.0
        print(f"  {C.DIM}Waiting {greet_wait}s for agent to join and greet...{C.RESET}")
        await asyncio.sleep(greet_wait)

        # Send each message
        for i, user_msg in enumerate(messages, 1):
            if not no_pause and i > 1:
                between = pauses.get("pause_between_messages_sec", 3.5)
                await asyncio.sleep(between)

            await session.say(user_msg, i)
            await session.wait_for_agent()

        # Clean up
        await session.disconnect()
        print(f"  {C.DIM}Disconnected from room{C.RESET}")

        # Delete room
        try:
            await lkapi.room.delete_room(lk_api.DeleteRoomRequest(room=room_name))
            print(f"  {C.DIM}Room deleted{C.RESET}")
        except Exception:
            pass


# ── Main ──────────────────────────────────────────────────────────────────────

async def main():
    parser = argparse.ArgumentParser(description="Pixel agent voice tester")
    parser.add_argument("--scenario", help="Run a single scenario by ID")
    parser.add_argument("--no-pause", action="store_true", help="Shorter waits (faster run)")
    parser.add_argument("--list", action="store_true", help="List all scenarios")
    parser.add_argument("--room", help="Join an existing room instead of creating one")
    args = parser.parse_args()

    if not LIVEKIT_URL or not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET:
        print(f"{C.RED}ERROR: LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET not set{C.RESET}")
        sys.exit(1)

    with open(SCENARIOS_FILE, encoding="utf-8") as f:
        data = json.load(f)

    scenarios = data["scenarios"]
    pauses    = data["settings"]

    if args.list:
        print(f"\n{C.BOLD}Available scenarios:{C.RESET}")
        for s in scenarios:
            print(f"  {C.CYAN}{s['id']:<30}{C.RESET} {s['persona']}")
        return

    to_run = [s for s in scenarios if s["id"] == args.scenario] if args.scenario else scenarios

    if args.scenario and not to_run:
        print(f"{C.RED}Scenario '{args.scenario}' not found. Use --list to see available.{C.RESET}")
        sys.exit(1)

    if args.no_pause:
        print(f"  {C.DIM}Fast mode: shorter waits{C.RESET}")

    print(f"\n{C.BOLD}Voice test — {len(to_run)} scenario(s){C.RESET}")
    print(f"LiveKit: {LIVEKIT_URL}")
    print(f"Piper TTS: {PIPER_URL}")

    # Quick TTS check
    print(f"\n{C.DIM}Testing TTS...{C.RESET}", end=" ", flush=True)
    try:
        pcm = await tts_to_pcm("hello")
        print(f"{C.GREEN}OK ({len(pcm)} bytes){C.RESET}")
    except Exception as e:
        print(f"{C.RED}FAILED: {e}{C.RESET}")
        sys.exit(1)

    log_lines = [
        f"Voice test run: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        f"LiveKit: {LIVEKIT_URL}",
        f"Piper: {PIPER_URL}",
    ]

    for i, scenario in enumerate(to_run):
        await run_voice_scenario(scenario, pauses, log_lines, args.no_pause)
        if i < len(to_run) - 1:
            pause = pauses.get("pause_between_scenarios_sec", 5.0)
            if not args.no_pause:
                print(f"\n{C.DIM}--- pausing {pause}s before next scenario ---{C.RESET}")
                await asyncio.sleep(pause)

    with open(LOG_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(log_lines))
    print(f"\n{C.DIM}Log saved to: {LOG_FILE}{C.RESET}")


if __name__ == "__main__":
    asyncio.run(main())
