#!/usr/bin/env python3
"""
Nightly log analyser for AIMediaFlow agents.

Reads Docker logs for the past 24 hours from:
  - aimediaflow-salesmanager
  - aimediaflow-agent-local

Detects issues, builds a human-readable report for each agent,
and sends separate emails via Brevo to the configured CONTACT_EMAIL.

Run:
    python3 log_reporter.py                  # analyse all agents
    python3 log_reporter.py --agent salesmanager  # one agent only
    python3 log_reporter.py --dry-run        # print reports, no email

Cron (server, 3:00 AM UTC daily):
    0 3 * * * /usr/bin/python3 /opt/log_reporter.py >> /var/log/log_reporter.log 2>&1
"""

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from typing import Optional

import urllib.request
import urllib.error

# ── Config ────────────────────────────────────────────────────────────────────

BREVO_API_KEY = os.environ.get("BREVO_API_KEY", "")
CONTACT_EMAIL = os.environ.get("CONTACT_EMAIL", "info@aimediaflow.net")
LOG_DIR = os.environ.get("LOG_DIR", "/var/log/agent-reports")

AGENTS = {
    "salesmanager": {
        "container": "aimediaflow-salesmanager",
        "display_name": "Sales Manager (Pixel)",
        "env_file": "/opt/aimediaflow-salesmanager/.env",
    },
    "agent-local": {
        "container": "aimediaflow-agent-local",
        "display_name": "Girl Avatar (Main Page)",
        "env_file": "/opt/aimediaflow-agent-local/.env",
    },
}

# ── Issue patterns ─────────────────────────────────────────────────────────────

# (label, regex, severity)
# severity: "critical" | "warning" | "info"
ISSUE_PATTERNS = [
    ("Rate limit (429)",          r'\b429\b|rate.limit|rate_limit|RateLimitError',     "critical"),
    ("LLM connection error",      r'openai\.APIConnectionError|groq.*connect|LLM.*error', "critical"),
    ("Unhandled exception",       r'Traceback \(most recent call last\)|UnhandledException', "critical"),
    ("STT failure",               r'stt.*error|STT.*failed|deepgram.*error|parakeet.*error', "critical"),
    ("TTS failure",               r'tts.*error|TTS.*failed|piper.*error|kokoro.*error', "critical"),
    ("Agent crash / restart",     r'process exiting.*crash|SIGKILL|exit code [^0]',    "critical"),
    ("Typesense error",           r'typesense.*error|typesense.*timeout|typesense.*fail', "warning"),
    ("LiveKit disconnect (error)",r'disconnect.*error|connection.*reset|WebSocket.*error', "warning"),
    ("Tool call error",           r'tool.*error|function.*error|set_attributes.*fail',  "warning"),
    ("Brevo email error",         r'brevo.*error|email.*fail|smtp.*error',              "warning"),
    ("Session with no speech",    r'process exiting.*room disconnected',                "info"),
    ("Worker restart",            r'starting worker',                                   "info"),
]

# Patterns to extract positive stats
STAT_PATTERNS = {
    "sessions":       r"received job request",
    "user_turns":     r"User said:",
    "search_calls":   r"search_products:",
    "expand_calls":   r"expand_product:",
    "close_calls":    r"close_product called",
    "faq_calls":      r"search_faq:",
    "rag_hits":       r"RAG.*results|Pinecone.*hit",
    "sessions_ended": r"process exiting.*reason",
}

# ── Docker log fetcher ────────────────────────────────────────────────────────

def fetch_docker_logs(container: str, since: str = "24h") -> str:
    """Return stdout+stderr of `docker logs <container> --since <since>`."""
    try:
        result = subprocess.run(
            ["docker", "logs", container, "--since", since],
            capture_output=True,
            text=True,
            timeout=60,
        )
        # Docker writes to stderr by default
        return result.stdout + result.stderr
    except subprocess.TimeoutExpired:
        return f"[log_reporter] ERROR: docker logs timed out for {container}\n"
    except FileNotFoundError:
        return f"[log_reporter] ERROR: docker not found\n"
    except Exception as e:
        return f"[log_reporter] ERROR fetching logs: {e}\n"


# ── Log analyser ──────────────────────────────────────────────────────────────

def extract_room_ids(lines: list[str]) -> set[str]:
    """Extract unique room IDs from JSON log lines."""
    rooms: set[str] = set()
    for line in lines:
        m = re.search(r'"room_id":\s*"([^"]+)"', line)
        if m:
            rooms.add(m.group(1))
    return rooms


def extract_user_messages(lines: list[str]) -> list[str]:
    """Extract user speech turns from log lines."""
    msgs = []
    for line in lines:
        m = re.search(r"User said: '([^']+)'", line)
        if m:
            msgs.append(m.group(1))
    return msgs


def analyse_logs(raw_logs: str, agent_name: str) -> dict:
    """
    Parse raw log text, return analysis dict:
      stats       — counts of key events
      issues      — list of {label, severity, count, sample_lines}
      user_msgs   — first 20 user messages seen
      room_count  — number of unique rooms (≈ sessions with real users)
      raw_lines   — total log lines
    """
    lines = raw_logs.splitlines()

    # Stats
    stats: dict[str, int] = {k: 0 for k in STAT_PATTERNS}
    for line in lines:
        for stat_key, pat in STAT_PATTERNS.items():
            if re.search(pat, line, re.IGNORECASE):
                stats[stat_key] += 1

    # Issues
    issues = []
    for label, pat, severity in ISSUE_PATTERNS:
        matches = [ln for ln in lines if re.search(pat, ln, re.IGNORECASE)]
        if matches:
            issues.append({
                "label":    label,
                "severity": severity,
                "count":    len(matches),
                "samples":  matches[:3],  # first 3 occurrences
            })

    # Deduplicate "session with no speech" — count unique rooms that ended without any user turns
    rooms   = extract_room_ids(lines)
    user_msgs = extract_user_messages(lines)

    return {
        "agent_name": agent_name,
        "stats":      stats,
        "issues":     issues,
        "user_msgs":  user_msgs[:20],
        "room_count": len(rooms),
        "total_lines": len(lines),
    }


# ── Report builder ────────────────────────────────────────────────────────────

def build_report(analysis: dict, agent_display: str, period_label: str) -> str:
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    a = analysis
    stats = a["stats"]
    issues = a["issues"]

    critical = [i for i in issues if i["severity"] == "critical"]
    warnings  = [i for i in issues if i["severity"] == "warning"]
    infos     = [i for i in issues if i["severity"] == "info"]

    status_line = "✅ No critical issues" if not critical else f"🔴 {len(critical)} critical issue(s) detected"

    lines = [
        f"AIMediaFlow — Nightly Log Report",
        f"Agent   : {agent_display}",
        f"Period  : {period_label}",
        f"Generated: {now_str}",
        f"Status  : {status_line}",
        "",
        "── STATS ──────────────────────────────────────────────",
        f"  Sessions (job requests)  : {stats['sessions']}",
        f"  Unique rooms             : {a['room_count']}",
        f"  User turns               : {stats['user_turns']}",
        f"  search_products calls    : {stats['search_calls']}",
        f"  expand_product calls     : {stats['expand_calls']}",
        f"  close_product calls      : {stats['close_calls']}",
        f"  search_faq calls         : {stats['faq_calls']}",
        f"  Worker restarts          : {stats['worker_restart'] if 'worker_restart' in stats else stats.get('sessions', 0)}",
        f"  Total log lines          : {a['total_lines']}",
        "",
    ]

    if critical:
        lines.append("── 🔴 CRITICAL ISSUES ──────────────────────────────────")
        for issue in critical:
            lines.append(f"  [{issue['count']}x] {issue['label']}")
            for s in issue["samples"]:
                # Trim long lines
                trimmed = s.strip()[:200]
                lines.append(f"       {trimmed}")
        lines.append("")

    if warnings:
        lines.append("── ⚠️  WARNINGS ─────────────────────────────────────────")
        for issue in warnings:
            lines.append(f"  [{issue['count']}x] {issue['label']}")
            for s in issue["samples"]:
                trimmed = s.strip()[:200]
                lines.append(f"       {trimmed}")
        lines.append("")

    if infos:
        lines.append("── ℹ️  INFO ──────────────────────────────────────────────")
        for issue in infos:
            lines.append(f"  [{issue['count']}x] {issue['label']}")
        lines.append("")

    if not issues:
        lines.append("  No issues detected.")
        lines.append("")

    if a["user_msgs"]:
        lines.append("── SAMPLE USER MESSAGES (up to 20) ─────────────────────")
        for i, msg in enumerate(a["user_msgs"], 1):
            lines.append(f"  {i:2}. {msg}")
        lines.append("")

    lines.append("────────────────────────────────────────────────────────")
    lines.append("AIMediaFlow Monitoring — log_reporter.py")

    return "\n".join(lines)


# ── Email sender ──────────────────────────────────────────────────────────────

def send_email(subject: str, body: str, brevo_key: str, to_email: str) -> bool:
    """Send plain-text email via Brevo. Returns True on success."""
    payload = json.dumps({
        "sender":      {"name": "AIMediaFlow Monitor", "email": to_email},
        "to":          [{"email": to_email}],
        "subject":     subject,
        "textContent": body,
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.brevo.com/v3/smtp/email",
        data=payload,
        headers={
            "api-key":      brevo_key,
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            status = resp.status
            if status in (200, 201):
                print(f"  ✅ Email sent → {to_email}")
                return True
            body_text = resp.read().decode()
            print(f"  ❌ Brevo {status}: {body_text}")
            return False
    except urllib.error.HTTPError as e:
        print(f"  ❌ Brevo HTTP error {e.code}: {e.read().decode()}")
        return False
    except Exception as e:
        print(f"  ❌ Email error: {e}")
        return False


# ── Log file saver ────────────────────────────────────────────────────────────

def save_log(report: str, agent_key: str):
    """Save report to LOG_DIR/YYYY-MM-DD-<agent_key>.txt"""
    os.makedirs(LOG_DIR, exist_ok=True)
    date_str = datetime.now().strftime("%Y-%m-%d")
    path = os.path.join(LOG_DIR, f"{date_str}-{agent_key}.txt")
    with open(path, "w", encoding="utf-8") as f:
        f.write(report)
    print(f"  📄 Report saved: {path}")


# ── Override env from agent .env file ─────────────────────────────────────────

def load_env_file(path: str) -> dict[str, str]:
    """Parse a simple KEY=value .env file, return dict."""
    env: dict[str, str] = {}
    try:
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, _, v = line.partition("=")
                env[k.strip()] = v.strip().strip('"').strip("'")
    except FileNotFoundError:
        pass
    return env


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Nightly agent log reporter")
    parser.add_argument("--agent",   choices=list(AGENTS.keys()) + ["all"], default="all",
                        help="Which agent to report (default: all)")
    parser.add_argument("--since",   default="24h",
                        help="Docker logs --since value (default: 24h)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print reports to stdout, do not send emails")
    args = parser.parse_args()

    agents_to_run = list(AGENTS.items()) if args.agent == "all" else [(args.agent, AGENTS[args.agent])]
    period_label  = f"Last {args.since}"
    date_str      = datetime.now().strftime("%Y-%m-%d")

    print(f"\nAIMediaFlow Log Reporter — {date_str}")
    print(f"Period : {period_label}")
    print(f"Mode   : {'DRY RUN (no email)' if args.dry_run else 'send email'}")
    print(f"Agents : {', '.join(k for k, _ in agents_to_run)}")
    print("=" * 56)

    for agent_key, agent_cfg in agents_to_run:
        container    = agent_cfg["container"]
        display_name = agent_cfg["display_name"]
        env_file     = agent_cfg["env_file"]

        print(f"\n[{display_name}] — {container}")
        print(f"  Fetching logs (--since {args.since})...")

        raw = fetch_docker_logs(container, args.since)
        if not raw.strip():
            print("  ⚠️  No logs returned (container may be stopped or empty period)")
            raw = f"[log_reporter] No logs returned for {container} in the past {args.since}\n"

        print(f"  Lines: {len(raw.splitlines())}")

        analysis = analyse_logs(raw, container)
        report   = build_report(analysis, display_name, period_label)

        save_log(report, agent_key)

        if args.dry_run:
            print("\n" + "─" * 56)
            print(report)
            print("─" * 56)
            continue

        # Load Brevo key and contact email from the agent's .env (overrides env)
        agent_env    = load_env_file(env_file)
        brevo_key    = agent_env.get("BREVO_API_KEY") or BREVO_API_KEY
        contact_mail = agent_env.get("CONTACT_EMAIL") or CONTACT_EMAIL

        if not brevo_key:
            print("  ⚠️  BREVO_API_KEY not set — printing report instead")
            print(report)
            continue

        critical_count = sum(1 for i in analysis["issues"] if i["severity"] == "critical")
        status_tag = "🔴 CRITICAL" if critical_count else "✅ OK"
        subject = (
            f"[{status_tag}] {display_name} — {date_str} | "
            f"{analysis['stats']['sessions']} sessions, {analysis['stats']['user_turns']} turns"
        )

        print(f"  Sending email: {subject}")
        send_email(subject, report, brevo_key, contact_mail)

    print("\nDone.")


if __name__ == "__main__":
    main()
