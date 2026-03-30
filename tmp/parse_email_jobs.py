#!/usr/bin/env python3
"""
Parse job alert emails from Gmail via himalaya and save new jobs to jobs.db.
Sources: IrishJobs, Indeed, Glassdoor, LinkedIn
Run daily via cron.
"""
import subprocess, re, sqlite3, urllib.request, urllib.parse, sys
from datetime import datetime, timezone, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed

JOBS_DB = '/opt/yt-api/jobs.db'
HIMALAYA = '/usr/local/bin/himalaya'

def db():
    conn = sqlite3.connect(JOBS_DB)
    conn.row_factory = sqlite3.Row
    return conn

IT_KEYWORDS = re.compile(
    r'software|developer|engineer|devops|sysadmin|system admin|it support|helpdesk|help desk|'
    r'network|infrastructure|cloud|python|java|javascript|typescript|react|node|backend|frontend|'
    r'fullstack|full.stack|database|sql|linux|docker|kubernetes|aws|azure|gcp|'
    r'ai|machine learning|data scientist|data engineer|data analyst|bi developer|'
    r'sharepoint|microsoft 365|power platform|erp|sap|'
    r'technical support|tech support|it technician|it specialist|it manager|it officer|'
    r'web developer|web designer|ecommerce|digital marketing|seo|'
    r'security analyst|cyber|information security|'
    r'computer|programming|coding|automation|integration|api|'
    r'tutor.*it|it.*tutor|assessor.*it|it.*assessor',
    re.IGNORECASE
)

NON_IT_KEYWORDS = re.compile(
    r'^general operative|^sales assistant|^sales associate|^sales advisor|^sales representative|'
    r'^field sales|^outbound.*sales|^inbound.*sales|^customer sales|'
    r'^security officer|^security guard|^team member|^team leader|'
    r'^farm |^wind turbine|^solar pv|^mechanical fitter|'
    r'^plumber|^electrician|^chef|^cook|^sous chef|^head chef|^breakfast|^food.beverage|'
    r'nurse|^midwife|^healthcare assistant|^care assistant|^social care|^support worker|'
    r'^driver|^warehouse|^logistics|^production operative|^factory|^retail|'
    r'^receptionist|^cleaner|^housekeeper|^restaurant|^hotel|^hospitality|^waiting staff|'
    r'^barista|^bartender|^bar staff|^kitchen|^catering|^laundry|^housekeeping',
    re.IGNORECASE
)

def is_it_job(title):
    """Return True if job title looks IT-related."""
    if not title or title.lower() in ('glassdoor job', 'linkedin job', 'indeed job'):
        return True  # Unknown title — include, better to have false positives
    if NON_IT_KEYWORDS.search(title):
        return False
    if IT_KEYWORDS.search(title):
        return True
    # Default: include if unclear (don't miss potentially relevant jobs)
    return True

def job_save(job_id, source, title, company, url):
    """Returns True if new, False if already known or not IT-relevant."""
    if not is_it_job(title):
        return False
    with db() as conn:
        if conn.execute('SELECT id FROM jobs WHERE id=?', (job_id,)).fetchone():
            return False
        conn.execute(
            'INSERT INTO jobs (id, source, title, company, url, date_found, status) VALUES (?,?,?,?,?,?,?)',
            (job_id, source, title, company, url, datetime.utcnow().strftime('%Y-%m-%d'), 'new')
        )
        return True

def follow_redirect(url, timeout=10):
    """Follow HTTP redirect and return final URL."""
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        resp = urllib.request.urlopen(req, timeout=timeout)
        return resp.url
    except Exception:
        return url

def get_email_ids(days_back=1):
    """Get list of email IDs from inbox for the last N days."""
    result = subprocess.run([HIMALAYA, 'envelope', 'list', '--page-size', '200'],
                            capture_output=True, text=True)
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=days_back)
    ids = []
    for line in result.stdout.splitlines():
        m = re.match(r'\|\s*(\d+)\s*\|', line)
        if not m:
            continue
        email_id = m.group(1)
        # Parse date from line — format: 2026-03-29 22:15+00:00
        dm = re.search(r'(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}[+-]\d{2}:\d{2})', line)
        if dm:
            try:
                email_dt = datetime.fromisoformat(dm.group(1).replace(' ', 'T'))
                if email_dt < cutoff:
                    continue
            except Exception:
                pass
        ids.append(email_id)
    return ids

def read_email(email_id):
    """Read email body without marking as read (--preview)."""
    result = subprocess.run([HIMALAYA, 'message', 'read', '--preview', email_id],
                            capture_output=True, text=True)
    return result.stdout

def parse_irishjobs(body):
    """Extract IrishJobs job links — follow click.irishjobs.ie redirects in parallel."""
    # Collect raw URLs first
    raw_urls = list(dict.fromkeys(
        u for u in re.findall(r'https://click\.irishjobs\.ie/f/a/[^\s\)>]+', body)
        if 'Report' not in u and 'Unsubscribe' not in u
    ))

    def resolve(raw_url):
        final_url = follow_redirect(raw_url)
        if '/job/' not in final_url:
            return None
        m = re.search(r'-job(\d+)', final_url)
        if not m:
            return None
        job_id = m.group(1)
        idx = body.find(raw_url)
        before = body[max(0, idx-300):idx].strip().splitlines()
        title = ''
        for line in reversed(before):
            line = line.strip()
            if line and len(line) > 5 and not line.startswith('http'):
                title = line
                break
        return {'id': job_id, 'source': 'irishjobs', 'title': title or 'IrishJobs job', 'company': '', 'url': final_url}

    jobs = []
    with ThreadPoolExecutor(max_workers=5) as ex:
        futures = {ex.submit(resolve, u): u for u in raw_urls}
        for f in as_completed(futures):
            result = f.result()
            if result:
                jobs.append(result)
    return jobs

def parse_indeed(body):
    """Extract Indeed viewjob links — follow cts.indeed.com redirects."""
    jobs = []
    raw_urls = re.findall(r'https://cts\.indeed\.com/v3/[^\s\)>]+', body)
    seen = set()
    for raw_url in raw_urls:
        if 'Unsubscribe' in raw_url:
            continue
        if raw_url in seen:
            continue
        seen.add(raw_url)
        final_url = follow_redirect(raw_url)
        m = re.search(r'jk=([a-f0-9]+)', final_url)
        if not m:
            continue
        job_id = m.group(1)
        # Extract title from subject or body
        idx = body.find(raw_url)
        before = body[max(0, idx-400):idx].strip().splitlines()
        title = ''
        for line in reversed(before):
            line = line.strip()
            if line and len(line) > 5 and not line.startswith('http'):
                title = line
                break
        jobs.append({'id': job_id, 'source': 'indeed', 'title': title or 'Indeed job', 'company': '', 'url': 'https://ie.indeed.com/viewjob?jk=' + job_id})
    return jobs

def parse_glassdoor(body):
    """Extract Glassdoor jobs from job alert emails.

    himalaya renders Glassdoor HTML emails as plain text with structure:
        company name X.X ★

        job title

        location, kerry

        €salary (employer est.)

        easy apply

        Nd (https://glassdoor.ie/partner/jobListing.htm?...jobListingId=ID...)
    """
    jobs = []
    seen = set()

    # Split body into job card blocks using ★ as delimiter between cards
    # Each card starts just after a ★ line and ends at the next ★ line
    # We pair each job card block with its jobListingId from the URL inside it

    # Find all ★ positions (each marks start of a job card)
    star_positions = [m.start() for m in re.finditer(r'★', body)]

    for star_pos in star_positions:
        # The ★ line: "company name X.X ★"
        line_start = body.rfind('\n', 0, star_pos) + 1
        line_end = body.find('\n', star_pos)
        star_line = body[line_start:line_end].strip() if line_end > 0 else body[line_start:].strip()

        # Extract company: strip the rating (X.X ★) and any leading URL/garbage
        company_raw = re.sub(r'\d+\.\d+\s*★.*', '', star_line).strip()
        # Remove leading URL garbage (ends with closing paren or long alphanum token)
        company_raw = re.sub(r'^.*\)', '', company_raw).strip()
        company_raw = re.sub(r'[a-zA-Z0-9_\-]{30,}', '', company_raw).strip()
        company = ' '.join(company_raw.split()) if len(company_raw) < 80 else ''

        # Get block after the ★ line up to next ★ or 600 chars
        block_start = line_end + 1 if line_end > 0 else star_pos + 1
        next_star = body.find('★', block_start)
        block_end = next_star if next_star > 0 and next_star - block_start < 800 else block_start + 600
        block = body[block_start:block_end]

        # Extract jobListingId from URL in this block
        id_m = re.search(r'jobListingId=(\d+)', block)
        if not id_m:
            continue
        job_id = id_m.group(1)
        if job_id in seen:
            continue
        seen.add(job_id)

        # Parse lines between ★ and URL: title, location, salary, days
        url_start = block.find('http')
        text_block = block[:url_start] if url_start > 0 else block

        lines = [l.strip() for l in text_block.splitlines() if l.strip()]
        noise = re.compile(
            r'^easy apply$|^apply now$|^apply with|^\d+[dh]$|^\d+\s*(day|hour)|'
            r'€|\$|employer est\.|glassdoor est\.|'
            r'^kerry$|^killarney|^tralee|^ireland$|^remote$|^hybrid$|'
            r'^<#part|^copyright|^privacy|^unsubscribe|^manage|^want more|'
            r'^similar jobs|^create job|^looking for|^this message|'
            r'utm_|jobListingId|glassdoor\.ie',
            re.IGNORECASE
        )
        clean = [l for l in lines if not noise.search(l) and 3 < len(l) < 100]

        # First clean line after ★ block = job title
        title = clean[0] if clean else ''

        if not title:
            continue

        url = 'https://www.glassdoor.ie/job-listing/job?jobListingId=' + job_id
        print(f'  [GD]   {job_id} "{title}" @ {company!r}')
        jobs.append({'id': job_id, 'source': 'glassdoor', 'title': title, 'company': company, 'url': url})
    return jobs

LOCATION_WHITELIST = re.compile(
    r'\bkerry\b|\bkillarney\b|\btralee\b|\bcaherciveen\b|\bkenmare\b|\blistowel\b'
    r'|\bremote\b|\bwork from home\b|\bwfh\b',
    re.IGNORECASE
)
LOCATION_BLACKLIST = re.compile(
    r'\bdublin\b|\bcork\b|\bgalway\b|\blimerick\b|\bwaterford\b|\bwexford\b'
    r'|\bsligo\b|\bclare\b|\btipperary\b|\bwicklow\b|\bkildare\b|\bmeath\b'
    r'|\blouth\b|\bcavan\b|\bmonaghan\b|\bdonegal\b|\bmayo\b|\broscommon\b'
    r'|\bletrim\b|\blongford\b|\bwestmeath\b|\boffaly\b|\blaois\b|\bcarlow\b'
    r'|\bkilkenny\b|\beuropean union\b|\beuropean economic area\b|\beea\b|\bemea\b|\bunited kingdom\b|\buk\b'
    r'|\blondon\b|\bmanchester\b|\bbelfas\b|\bd\d{1,2}\b',
    re.IGNORECASE
)

def is_kerry_location(location_str):
    """Return True if location is Kerry/Remote/acceptable, False to reject."""
    if not location_str:
        return True  # no location info — include
    if LOCATION_BLACKLIST.search(location_str):
        return False
    # Ireland-wide (no city) is acceptable — person can decide
    if re.search(r'^ireland$', location_str.strip(), re.IGNORECASE):
        return True
    if LOCATION_WHITELIST.search(location_str):
        return True
    # Unknown location — include by default (don't miss Kerry jobs with unusual format)
    return True

def parse_linkedin(body):
    """Extract LinkedIn jobs from job alert emails.

    LinkedIn job alert email structure per job card:
        Job Title
        Company Name
        Location

        This company is actively hiring
        [Apply with resume & profile]
        View job: https://www.linkedin.com/comm/jobs/view/JOBID/...
        ---------------------------------------------------------
    """
    jobs = []
    seen = set()

    # Find all job card blocks by splitting on the separator line or "View job:" lines
    # Each block ends at "View job: URL"
    view_job_pattern = re.compile(
        r'View job:\s*(https://www\.linkedin\.com/comm/jobs/view/(\d+)/[^\s]*)',
        re.IGNORECASE
    )

    for m in view_job_pattern.finditer(body):
        job_id = m.group(2)
        job_url_full = m.group(1)
        if job_id in seen:
            continue
        seen.add(job_id)

        # Get the block before "View job:" — up to the previous separator or start
        idx = m.start()
        # Find start: previous "---" separator or beginning
        prev_sep = body.rfind('-' * 10, 0, idx)
        block_start = prev_sep + 1 if prev_sep >= 0 else max(0, idx - 800)
        block = body[block_start:idx]

        # Split into non-empty lines, strip whitespace
        lines = [l.strip() for l in block.splitlines() if l.strip()]

        # Remove noise lines (boilerplate text)
        noise = re.compile(
            r'^this company is|^apply with resume|^apply with|^be an early|^early applicant|'
            r'^promoted$|^actively recruiting|^high skills match|^high experience match|'
            r'^jobs where you|^based on your|^unlock personalized|^try premium|'
            r'^see all jobs|^new jobs match|^your job alert|^view job|'
            r'^https?://|^-{5,}',
            re.IGNORECASE
        )
        clean = [l for l in lines if not noise.search(l) and 3 < len(l) < 150]

        if not clean:
            continue

        # Structure: last meaningful lines are: [..., TITLE, COMPANY, LOCATION]
        # Location is the last line, company second-to-last, title third-to-last
        location = clean[-1] if len(clean) >= 1 else ''
        company = clean[-2] if len(clean) >= 2 else ''
        title = clean[-3] if len(clean) >= 3 else clean[-1]

        # Location filter — skip non-Kerry jobs
        if not is_kerry_location(location):
            print(f'  [SKIP] LinkedIn {job_id} "{title}" @ {company} — location: {location!r}')
            continue

        url = 'https://ie.linkedin.com/jobs/view/' + job_id
        print(f'  [OK]   LinkedIn {job_id} "{title}" @ {company} — location: {location!r}')
        jobs.append({'id': job_id, 'source': 'linkedin', 'title': title, 'company': company, 'url': url})

    return jobs

def is_job_email(from_addr, subject):
    """Check if email is a job alert. Skip our own CV-BOT emails."""
    # Never scan our own bot emails
    if '[CV-BOT]' in subject:
        return None
    from_lower = from_addr.lower()
    subject_lower = subject.lower()
    if 'irishjobs' in from_lower:
        return 'irishjobs'
    if 'indeed' in from_lower and any(w in subject_lower for w in ['job', 'hiring', 'apply', 'position']):
        return 'indeed'
    if 'glassdoor' in from_lower:
        return 'glassdoor'
    if 'linkedin' in from_lower and any(w in subject_lower for w in ['job', 'hiring', 'similar', 'opportunity', 'new job']):
        return 'linkedin'
    return None

def main():
    # days_back: how far back to look. Default 1 (today only). Pass 7 for initial scan.
    days_back = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    now_str = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')
    print(f'[{now_str} UTC] Parsing job emails (last {days_back} day(s))...')

    # Ensure email_id column exists
    with db() as conn:
        try:
            conn.execute('ALTER TABLE jobs ADD COLUMN email_id TEXT')
        except Exception:
            pass

    email_ids = get_email_ids(days_back=days_back)
    print(f'Found {len(email_ids)} emails in last {days_back} day(s)')

    total_new = 0
    processed_emails = 0

    for email_id in email_ids:
        body = read_email(email_id)
        # Extract From and Subject
        from_m = re.search(r'^From:\s*(.+)', body, re.MULTILINE)
        subj_m = re.search(r'^Subject:\s*(.+)', body, re.MULTILINE)
        from_addr = from_m.group(1).strip() if from_m else ''
        subject = subj_m.group(1).strip() if subj_m else ''

        source_type = is_job_email(from_addr, subject)
        if not source_type:
            continue

        processed_emails += 1
        jobs = []
        if source_type == 'irishjobs':
            jobs = parse_irishjobs(body)
        elif source_type == 'indeed':
            jobs = parse_indeed(body)
        elif source_type == 'glassdoor':
            jobs = parse_glassdoor(body)
        elif source_type == 'linkedin':
            jobs = parse_linkedin(body)

        new_count = 0
        for job in jobs:
            if job_save(job['id'], job['source'], job['title'], job['company'], job['url']):
                new_count += 1
                print(f'  [NEW] [{job["source"]}] {job["title"]} -> {job["url"]}')

        if jobs:
            print(f'  Email {email_id} ({source_type}): {len(jobs)} jobs found, {new_count} new')
        total_new += new_count

    print(f'Done. Processed {processed_emails} job emails, {total_new} new jobs saved.')

    # Show DB stats
    with db() as conn:
        total = conn.execute('SELECT COUNT(*) FROM jobs').fetchone()[0]
        by_source = conn.execute('SELECT source, COUNT(*) as n FROM jobs GROUP BY source').fetchall()
        print(f'DB total: {total} jobs')
        for row in by_source:
            print(f'  {row["source"]}: {row["n"]}')

if __name__ == '__main__':
    main()
