import logging
import os
import datetime
from dataclasses import dataclass, field
from typing import Optional

import aiohttp
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("session_logger")

BREVO_API_KEY = os.environ.get("BREVO_API_KEY", "")
CONTACT_EMAIL = os.environ.get("CONTACT_EMAIL", "info@aimediaflow.net")
AGENT_NAME    = os.environ.get("AGENT_NAME", "aimediaflow-agent")


@dataclass
class Turn:
    user_text:  str = ""
    agent_text: str = ""
    stt_ms:     Optional[float] = None
    llm_ms:     Optional[float] = None
    tts_ttfb_ms: Optional[float] = None


class SessionLogger:
    def __init__(self):
        self.turns: list[Turn] = []
        self._current: Optional[Turn] = None

    def _close_current(self):
        """Save current turn if it has content."""
        if self._current and (self._current.user_text or self._current.agent_text):
            self.turns.append(self._current)
        self._current = None

    # Called from on_user_turn_completed — new user turn starts
    def on_user_text(self, text: str):
        self._close_current()
        self._current = Turn(user_text=text)
        logger.info(f"New turn: '{text[:60]}'")

    # Called from conversation_item_added (assistant role)
    def on_agent_text(self, text: str):
        if self._current is None:
            self._current = Turn()
        self._current.agent_text = text

    # From metrics_collected: EOUMetrics.transcription_delay
    # = time from VAD end-of-speech to transcript ready
    def on_eou_metrics(self, transcription_delay: float):
        if self._current is None:
            return
        ms = transcription_delay * 1000
        # Take the best (non-zero) value
        if self._current.stt_ms is None or ms > 0:
            self._current.stt_ms = ms
        logger.info(f"STT transcription_delay: {ms:.0f}ms")

    # From metrics_collected: LLMMetrics.duration
    def on_llm_metrics(self, duration: float):
        if self._current is None:
            return
        ms = duration * 1000
        # Accumulate if multiple LLM calls per turn
        if self._current.llm_ms is None:
            self._current.llm_ms = ms
        else:
            self._current.llm_ms += ms
        logger.info(f"LLM duration: {ms:.0f}ms")

    # From metrics_collected: TTSMetrics.ttfb
    # Only record the FIRST ttfb per turn (first audio chunk)
    def on_tts_metrics(self, ttfb: float):
        if self._current is None:
            return
        if ttfb <= 0:
            return
        ms = ttfb * 1000
        if self._current.tts_ttfb_ms is None:
            self._current.tts_ttfb_ms = ms
            logger.info(f"TTS ttfb: {ms:.0f}ms")

    def get_report(self) -> str:
        self._close_current()
        if not self.turns:
            return ""
        lines = [f"Voice Session Report -- {AGENT_NAME}", "=" * 50, ""]
        for i, t in enumerate(self.turns, 1):
            lines.append(f"Turn {i}:")
            lines.append(f"  User : {t.user_text}")
            lines.append(f"  Agent: {t.agent_text}")
            parts = []
            total = 0.0
            if t.stt_ms is not None:
                parts.append(f"STT {t.stt_ms:.0f}ms")
                total += t.stt_ms
            if t.llm_ms is not None:
                parts.append(f"LLM {t.llm_ms:.0f}ms")
                total += t.llm_ms
            if t.tts_ttfb_ms is not None:
                parts.append(f"TTS {t.tts_ttfb_ms:.0f}ms")
                total += t.tts_ttfb_ms
            if parts:
                parts.append(f"Total {total:.0f}ms")
                lines.append(f"  Latency: {' | '.join(parts)}")
            lines.append("")
        return "\n".join(lines)

    async def send_email(self):
        report = self.get_report()
        if not report:
            logger.info("No turns to report, skipping email")
            return
        if not BREVO_API_KEY:
            logger.warning("BREVO_API_KEY not set, printing report:")
            print(report)
            return
        date_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
        payload = {
            "sender":      {"name": "AIMediaFlow Agent", "email": CONTACT_EMAIL},
            "to":          [{"email": CONTACT_EMAIL}],
            "subject":     f"Voice Session: {AGENT_NAME} | {date_str}",
            "textContent": report,
        }
        try:
            async with aiohttp.ClientSession() as sess:
                async with sess.post(
                    "https://api.brevo.com/v3/smtp/email",
                    json=payload,
                    headers={"api-key": BREVO_API_KEY, "Content-Type": "application/json"},
                ) as resp:
                    body = await resp.text()
                    if resp.status in (200, 201):
                        logger.info(f"Session report emailed to {CONTACT_EMAIL}")
                    else:
                        logger.error(f"Brevo error {resp.status}: {body}")
        except Exception as e:
            logger.error(f"Email send failed: {e}")
