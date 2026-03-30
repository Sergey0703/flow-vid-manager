#!/usr/bin/env python3
"""
Job Digest & CV Generator
--------------------------
Mode 1 (cron 09:00): Read new jobs from jobs.db → send digest email via Brevo
Mode 2 (cron every 30min): Scan inbox for replies with job descriptions → generate CV → send .docx

Usage:
  python3 job_digest.py digest    # send daily digest of new jobs
  python3 job_digest.py replies   # scan for replies and generate CVs

Filter: emails with subject containing [CV-BOT] are SKIPPED by parse_email_jobs.py
"""
import subprocess, re, sqlite3, json, urllib.request, urllib.parse, sys, os, base64
from datetime import datetime, timezone

JOBS_DB      = '/opt/yt-api/jobs.db'
HIMALAYA     = '/usr/local/bin/himalaya'
BREVO_KEY    = os.environ.get('BREVO_KEY', '')
MY_EMAIL     = 'sergey070373@gmail.com'
CV_PROFILE   = '/opt/yt-api/cv/cv_profile.md'
CV_TEMPLATE  = '/opt/yt-api/cv/cv_template_structure.md'
MAKE_CV_DOCX = '/opt/yt-api/cv/make_cv_docx.py'
CF_PROXY     = 'https://fetch-proxy.sergey070373.workers.dev/'
GROQ_KEY     = os.environ.get('GROQ_KEY', '')
BOT_TAG      = '[CV-BOT]'

# ── DB ──────────────────────────────────────────────────
def db():
    conn = sqlite3.connect(JOBS_DB)
    conn.row_factory = sqlite3.Row
    return conn

def get_new_jobs():
    with db() as conn:
        rows = conn.execute(
            "SELECT id, source, title, company, url FROM jobs WHERE status='new' ORDER BY date_found DESC"
        ).fetchall()
    return rows

def mark_digest_sent(job_ids):
    with db() as conn:
        for jid in job_ids:
            conn.execute("UPDATE jobs SET status='digest_sent' WHERE id=?", (jid,))

def mark_cv_generated(job_id):
    with db() as conn:
        conn.execute("UPDATE jobs SET status='cv_generated' WHERE id=?", (job_id,))

# ── BREVO EMAIL ─────────────────────────────────────────
def send_email(subject, html_body, text_body=None, attachment_path=None):
    payload = {
        "sender":      {"name": "Job Bot", "email": "info@aimediaflow.net"},
        "to":          [{"email": MY_EMAIL}],
        "subject":     subject,
        "htmlContent": html_body,
    }
    if text_body:
        payload["textContent"] = text_body
    if attachment_path and os.path.exists(attachment_path):
        with open(attachment_path, 'rb') as f:
            content = base64.b64encode(f.read()).decode()
        fname = os.path.basename(attachment_path)
        payload["attachment"] = [{"content": content, "name": fname}]

    req = urllib.request.Request(
        "https://api.brevo.com/v3/smtp/email",
        data=json.dumps(payload).encode(),
        headers={"api-key": BREVO_KEY, "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            print(f"Email sent: {subject} → {resp.status}")
            return True
    except urllib.error.HTTPError as e:
        print(f"Brevo error {e.code}: {e.read().decode()}")
        return False

# ── FETCH JOB PAGE VIA CF PROXY ─────────────────────────
def fetch_job_description(url):
    """Fetch job page via Cloudflare proxy and extract text."""
    try:
        proxy_url = CF_PROXY + '?url=' + urllib.parse.quote(url)
        req = urllib.request.Request(proxy_url, headers={'User-Agent': 'Mozilla/5.0'})
        resp = urllib.request.urlopen(req, timeout=20)
        html = resp.read().decode('utf-8', errors='ignore')
        # Strip tags, normalize whitespace
        text = re.sub(r'<script[^>]*>[\s\S]*?</script>', ' ', html, flags=re.IGNORECASE)
        text = re.sub(r'<style[^>]*>[\s\S]*?</style>', ' ', text, flags=re.IGNORECASE)
        text = re.sub(r'<[^>]+>', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()
        # Return middle section (skip nav/header/footer noise) — max 3000 chars
        mid = len(text) // 4
        return text[mid:mid+3000]
    except Exception as e:
        return f"Could not fetch: {e}"

# ── MODE 1: DAILY DIGEST ────────────────────────────────
def send_digest():
    jobs = get_new_jobs()
    if not jobs:
        print("No new jobs today.")
        return

    now = datetime.now(timezone.utc).strftime('%d %b %Y')
    subject = f"{BOT_TAG} New jobs digest — {now} ({len(jobs)} jobs)"

    # Build HTML email
    rows_by_source = {}
    for j in jobs:
        rows_by_source.setdefault(j['source'], []).append(j)

    html = f"<h2>New IT Jobs — {now}</h2>\n"
    html += f"<p>{len(jobs)} new jobs found. Click a link to view, then reply to this email with the job description to generate a tailored CV.</p>\n"
    html += "<hr>\n"

    BASE = 'http://65.21.3.89:8765'
    for source, source_jobs in rows_by_source.items():
        html += f"<h3>{source.upper()} ({len(source_jobs)})</h3><ul>\n"
        for j in source_jobs:
            title = j['title'] or 'Job'
            company = f" @ {j['company']}" if j['company'] else ''
            cv_url = f"{BASE}/generate-cv?job_id={j['id']}"
            html += (f'<li><a href="{j["url"]}">{title}{company}</a>'
                     f' &nbsp; <a href="{cv_url}" style="background:#2E74B5;color:white;'
                     f'padding:2px 10px;border-radius:3px;text-decoration:none;font-size:12px">'
                     f'Generate CV</a></li>\n')
        html += "</ul>\n"

    html += "<hr>\n"
    html += "<p><b>To generate a CV:</b> Reply to this email, paste the full job description below this line:</p>\n"
    html += "<pre>--- PASTE JOB DESCRIPTION BELOW ---\n\n</pre>\n"

    send_email(subject, html)
    mark_digest_sent([j['id'] for j in jobs])
    print(f"Digest sent: {len(jobs)} jobs")

# ── MODE 2: SCAN REPLIES & GENERATE CV ──────────────────
def call_llm(prompt):
    """Call llama-3.3-70b via OpenRouter (works from server)."""
    # Try OpenRouter first
    for model, api_key, base_url in [
        ('meta-llama/llama-3.3-70b-instruct',
         os.environ.get('OPENROUTER_KEY', ''),
         'https://openrouter.ai/api/v1/chat/completions'),
    ]:
        try:
            payload = json.dumps({
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 2500,
                "temperature": 0.3
            }).encode()
            req = urllib.request.Request(
                base_url, data=payload,
                headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"}
            )
            resp = urllib.request.urlopen(req, timeout=60)
            result = json.loads(resp.read())
            return result['choices'][0]['message']['content']
        except Exception as e:
            print(f"LLM error ({model}): {e}")
    return None

def generate_cv_from_description(job_description, job_url=''):
    """Use LLM to generate CV JSON, then render to docx."""
    cv_profile = open(CV_PROFILE).read()
    cv_template = open(CV_TEMPLATE).read()

    prompt = f"""You are a professional CV writer. Generate a tailored CV as JSON.

CANDIDATE MASTER PROFILE:
{cv_profile}

CV TEMPLATE RULES:
{cv_template}

JOB DESCRIPTION:
{job_description}

Output ONLY valid JSON matching this structure (no markdown, no explanation):
{{
  "name": "Serhii Baliasnyi",
  "contacts": ["Ballydowney, Killarney, Co Kerry", "Mobile: 0852007612", "E-mail: sergey070373@gmail.com"],
  "linkedin": "https://www.linkedin.com/in/serhii-baliasnyi-290b72246/",
  "personal_profile": "...",
  "key_skills": [
    {{"label": "Category", "text": "skill1, skill2..."}}
  ],
  "work_experience": [
    {{"date": "...", "company": "...", "title": "...", "bullets": ["..."]}}
  ],
  "education": [
    {{"date": "...", "institution": "...", "qualification": "..."}}
  ],
  "additional_info": [
    {{"label": "...", "text": "..."}}
  ]
}}"""

    print("Calling LLM...")
    response = call_llm(prompt)
    if not response:
        return None

    # Extract JSON from response
    json_match = re.search(r'\{[\s\S]+\}', response)
    if not json_match:
        print("No JSON found in LLM response")
        return None

    try:
        cv_data = json.loads(json_match.group(0))
    except json.JSONDecodeError as e:
        print(f"JSON parse error: {e}")
        return None

    # Write temp JSON and run docx generator
    import tempfile
    tmp_json = tempfile.mktemp(suffix='.json')
    tmp_docx = tempfile.mktemp(suffix='.docx')

    with open(tmp_json, 'w') as f:
        json.dump(cv_data, f)

    # Patch make_cv_docx.py to accept JSON input and output path
    result = subprocess.run(
        ['python3', '-c', f"""
import json, sys
sys.argv = ['make_cv_docx.py', '{tmp_docx}']
exec(open('{MAKE_CV_DOCX}').read().replace(
    "if __name__ == '__main__':",
    "cv_data = json.load(open('{tmp_json}'))\\nif __name__ == '__main__':"
))
"""],
        capture_output=True, text=True
    )
    print(result.stdout)
    if result.returncode != 0:
        print("DOCX error:", result.stderr)
        return None

    return tmp_docx

def scan_replies():
    """Scan inbox for replies to our digest emails containing job descriptions."""
    result = subprocess.run(
        [HIMALAYA, 'envelope', 'list', '--page-size', '50'],
        capture_output=True, text=True
    )
    for line in result.stdout.splitlines():
        m = re.match(r'\|\s*(\d+)\s*\|', line)
        if not m:
            continue
        # Quick subject check — look for CV-BOT reply
        if BOT_TAG.lower() not in line.lower() and 're:' not in line.lower():
            continue

        email_id = m.group(1)
        body = subprocess.run(
            [HIMALAYA, 'message', 'read', '--preview', email_id],
            capture_output=True, text=True
        ).stdout

        subj_m = re.search(r'^Subject:\s*(.+)', body, re.MULTILINE)
        subject = subj_m.group(1).strip() if subj_m else ''

        # Must be a reply to our digest
        if BOT_TAG not in subject or 're:' not in subject.lower():
            continue

        # Extract job description after the marker
        marker = '--- PASTE JOB DESCRIPTION BELOW ---'
        idx = body.find(marker)
        if idx < 0:
            continue
        job_description = body[idx + len(marker):].strip()
        if len(job_description) < 100:
            print(f"Email {email_id}: no job description found (too short)")
            continue

        print(f"Email {email_id}: found job description ({len(job_description)} chars), generating CV...")

        docx_path = generate_cv_from_description(job_description)
        if not docx_path:
            print("CV generation failed")
            continue

        # Send CV back
        job_title_m = re.search(r'(?:job title|position|role)[:\s]+([^\n]+)', job_description, re.IGNORECASE)
        job_title = job_title_m.group(1).strip() if job_title_m else 'the position'
        cv_subject = f"{BOT_TAG} Your CV for {job_title}"

        html = f"<p>Your tailored CV for <b>{job_title}</b> is attached.</p>"
        html += "<p>Review and adjust before sending. Good luck!</p>"

        send_email(cv_subject, html, attachment_path=docx_path)
        print(f"CV sent for: {job_title}")

        # Cleanup temp file
        try:
            os.unlink(docx_path)
        except:
            pass

# ── MAIN ────────────────────────────────────────────────
if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else 'digest'
    if mode == 'digest':
        send_digest()
    elif mode == 'replies':
        scan_replies()
    else:
        print(f"Unknown mode: {mode}. Use 'digest' or 'replies'")
