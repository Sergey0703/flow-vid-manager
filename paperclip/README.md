# Paperclip — AIMediaFlow Setup & Recovery Guide

## Overview

Paperclip is an AI agent platform running on **Server 2 (65.21.3.89)** via PM2.
- UI: `http://65.21.3.89:3100/AIM`
- API: `http://127.0.0.1:3100/api` (localhost only)
- PM2 service name: `paperclip`
- Company ID: `b984404a-8587-41d0-9354-a6251bd0fd94`
- DB: Docker container `paperclip-db`, PostgreSQL, user/db: `paperclip`

## Agents

| Agent | ID | Toolsets |
|---|---|---|
| Researcher | `ccc8c5e8-cc55-4432-aa16-0bc73391049e` | web, terminal |
| SME Facts Researcher | `acf7ffec-4aef-43be-b83b-828170c15b17` | web, terminal |
| Case Studies Researcher | `527db020-5bf8-41e0-bf8d-20e007e7056e` | web, terminal |
| AgentMail Monitor | `b948c00d-abbd-45a0-8520-e8458fc7b11c` | web, terminal |
| CEO | `5423deab-0b1c-4a88-b533-5b88e24c1f19` | — |
| Chief Editor | `f18ff445-0515-4397-b814-2a754bd245b1` | web, terminal |

Instructions live on server at:
`/opt/paperclip-data/instances/default/companies/b984404a-8587-41d0-9354-a6251bd0fd94/agents/<AGENT_ID>/instructions/AGENTS.md`

## Projects & Routines

| Project | ID |
|---|---|
| Onboarding | `91ab5627-dedf-4265-b215-5fc80826f0a8` |

| Routine | Agent | Schedule | ID |
|---|---|---|---|
| Forum Pain Points Monitor | Researcher | `15 5 * * *` Europe/Dublin | `dd24ed39-ecbf-47e5-8b85-fb818c2c8ebb` |
| SME Facts Monitor | SME Facts Researcher | `0 5 * * *` Europe/Dublin | `7274106d-413f-43df-85c5-9653529d75b0` |
| Case Studies Monitor | Case Studies Researcher | `30 5 * * *` Europe/Dublin | `79fe0dc4-7a1a-4553-8e47-936bc9753d89` |
| AgentMail Monitor | AgentMail Monitor | `45 5 * * *` Europe/Dublin | `bc1f09da-848f-4253-91a9-7bd1ee44f826` |
| Morning Topics Aggregator | Chief Editor | `0 6 * * *` UTC | `825fdd59-3a16-41bf-a1e7-f33c1a907eb1` |

## Output Files (on server)

- `/home/hermes_user/.hermes/forum-pain-points.md` — Researcher
- `/home/hermes_user/.hermes/verified-sme-facts.md` — SME Facts Researcher
- `/home/hermes_user/.hermes/competitor-case-studies.md` — Case Studies Researcher
- `/home/hermes_user/.hermes/email-sourced-topics.md` — AgentMail Monitor

---

## CRITICAL DISCOVERY: How Issue Description Works as Agent Instructions

**This is the most important lesson learned.** When an agent runs via "Run Heartbeat"
(no taskId in context), it goes into the `{{#noTask}}` branch of execute.js which instructs
it to:
1. Curl the issues list API to find pending `todo` issues assigned to it
2. Read the full issue body via API
3. **Execute the work described in the issue description**
4. Mark the issue as done

**This means: the `description` field of the issue IS the agent's task instructions.**

### How to create an issue with proper instructions

Use this Python script on the server (handles special characters safely):

```python
# Save as /tmp/create_issue.py on server, then: python3 /tmp/create_issue.py
import subprocess

description = (
    "STEP 1: Use web_search: <your search query>\n"
    "STEP 2: If fewer than 2 results - retry with different query\n"
    "STEP 3: Write file /home/hermes_user/.hermes/<output-file>.md in this exact markdown:\n\n"
    "# Title - YYYY-MM-DD\n\n"
    "## [Section]\n"
    "- **Field:** value\n\n"
    "Write using tee command. Verify with cat. Only mark done after file shows correct content."
)

escaped = description.replace("'", "''")
sql = (
    "INSERT INTO issues (company_id, project_id, title, description, status, assignee_agent_id) "
    "VALUES ("
    "'b984404a-8587-41d0-9354-a6251bd0fd94',"
    "'91ab5627-dedf-4265-b215-5fc80826f0a8',"
    "'<Issue title>',"
    "'" + escaped + "',"
    "'todo',"
    "'<AGENT_ID>'"
    ") RETURNING id;"
)
open('/tmp/create_issue.sql', 'w').write(sql)
```

Then run:
```bash
docker cp /tmp/create_issue.sql paperclip-db:/tmp/create_issue.sql
docker exec paperclip-db psql -U paperclip -d paperclip -f /tmp/create_issue.sql
```

**Why Python and not direct psql?** The description contains special characters (quotes,
newlines, parentheses) that break shell quoting. Python handles escaping cleanly.

### Issue description template for research agents

```
Search <source> for <topic> and write to file.

STEP 1: Use web_search: <query 1>
STEP 2: If fewer than 2 results - retry: <query 2>
STEP 3: Write file /home/hermes_user/.hermes/<filename>.md in this exact markdown:

# <Title> - YYYY-MM-DD

## [Section Title]
- **Quote:** exact quote from real post
- **Source:** URL
- **AI Opportunity:** one sentence

## [Section Title 2]
- **Quote:** exact quote 2
- **Source:** URL 2
- **AI Opportunity:** one sentence

Write using tee command. Verify with cat. Only mark done after file shows correct content.
```

### What happened on first successful run (2026-04-12)

Run `ae517ab7` ran for 5 minutes, made 32 tool calls, then crashed with "Process lost —
server may have restarted". BUT the file was already written before the crash. The agent:
1. Fetched issues list via curl → found issue `1e499665`
2. Read issue description with step-by-step instructions
3. Did web_search for Irish SME pain points
4. Wrote `/home/hermes_user/.hermes/forum-pain-points.md` with 5 real pain points
5. Crashed before posting the done comment — but file was saved

Result: issue was marked `done` and file contained proper markdown with quotes from
Reddit, boards.ie, Irish Times, Oireachtas debates.

---

## Key File: execute.js

**Path on server:**
```
/opt/paperclip/node_modules/.pnpm/hermes-paperclip-adapter@0.2.0/node_modules/hermes-paperclip-adapter/dist/server/execute.js
```

This file controls how Paperclip launches Hermes agents.
**It gets overwritten on every Paperclip update** (`npm install` / update). Must be re-patched after every update.

### What patches are applied and WHY

#### Patch 1 — `ctx.context` fallback for taskId (buildPrompt section)

**Problem:** When Paperclip runs a heartbeat, it passes task/issue data in `ctx.context`
(the `contextSnapshot` object from DB), NOT in `ctx.config` (the `runtimeConfig`).
The original code only reads from `ctx.config`:

```js
// ORIGINAL — broken
const taskId = cfgString(ctx.config?.taskId);
```

Without this fix, `taskId` is always empty → the `{{#taskId}}` block in AGENTS.md never
renders → agent falls into `{{#noTask}}` branch → looks for issues via curl instead of
working on the assigned task.

**Fix:**
```js
const taskId = cfgString(ctx.config?.taskId) ?? cfgString(ctx.context?.taskId) ?? cfgString(ctx.context?.issueId);
const taskTitle = cfgString(ctx.config?.taskTitle) ?? cfgString(ctx.context?.taskTitle) ?? "";
const taskBody = cfgString(ctx.config?.taskBody) ?? cfgString(ctx.context?.taskBody) ?? "";
const commentId = cfgString(ctx.config?.commentId) ?? cfgString(ctx.context?.commentId) ?? "";
const wakeReason = cfgString(ctx.config?.wakeReason) ?? cfgString(ctx.context?.wakeReason) ?? "";
```

#### Patch 2 — `paperclipApiKey` in template vars

**Problem:** Agent needs to authenticate against the Paperclip API (update issue status,
post comments). The API key (`ctx.authToken`) was not exposed as a template variable,
so `{{paperclipApiKey}}` in curl commands expanded to empty string → 401 Unauthorized.

**Fix:** Added on the **SAME LINE** as `paperclipApiUrl` (critical — see TSX crash below):
```js
paperclipApiUrl, paperclipApiKey: ctx.authToken || "",
```

#### Patch 3 — `taskId` from `ctx.context` in execute() section

Same as Patch 1, but in the second location where `taskId` is read (the `execute()` function
that sets process env vars):
```js
const taskId = cfgString(ctx.config?.taskId) ?? cfgString(ctx.context?.taskId) ?? cfgString(ctx.context?.issueId);
```

#### Patch 4 — Inject `PAPERCLIP_API_KEY` and `HOME` into process env

**Problem 1:** Hermes terminal tools need `PAPERCLIP_API_KEY` as an env var for `$PAPERCLIP_API_KEY`
substitution in shell commands. Without it, all curl calls to Paperclip API return 401.

**Problem 2:** `HOME` is not set in the spawned process environment. This breaks any tool
that relies on `~` or `$HOME` paths (e.g., writing to `/home/hermes_user/.hermes/`).

**Fix:**
```js
if (ctx.authToken)
    env.PAPERCLIP_API_KEY = ctx.authToken;
if (!env.HOME)
    env.HOME = "/home/hermes_user";
```

---

### CRITICAL: TSX Parse Error at Line 133

When Patch 2 was added on a **new line**, it shifted template content and caused a fatal crash:

```
SyntaxError: Unexpected token at line 133
```

Root cause: Line 133 in the template section contains `{{#noTask}}`. The `{` at the start
of a line is parsed by Paperclip's TSX/bundler as the beginning of a JSX expression.
This is a **fatal crash** — Paperclip worker dies and restarts in a loop (you'll see
restart counter climb in `pm2 list`).

**Rule:** `paperclipApiKey: ctx.authToken || ""` MUST be on the same line as `paperclipApiUrl,`
— never on its own line.

---

## adapter_config.json — paperclipApiUrl

Each agent's `adapter_config.json` must include:
```json
"paperclipApiUrl": "http://127.0.0.1:3100/api"
```

**Why:** Without this, `buildPaperclipEnv()` resolves the API URL with wrong port (3101
instead of 3100). The agent gets wrong `{{paperclipApiUrl}}` in its prompt and all API
calls fail with connection refused.

---

## Hermes Config — approvals.mode

**Path:** `/root/.hermes/config.yaml` (Paperclip runs as root, HOME=/root)

NOTE: `/home/hermes_user/.hermes/config.yaml` also exists but is NOT used by Paperclip agents.

```yaml
approvals:
  mode: off
```

**Why:** Default is `mode: manual`. In manual mode, Hermes blocks before running terminal
commands with flags like `-c` (e.g., `python3 -c "..."`). Since Paperclip runs Hermes
headlessly, there's no one to approve → run hangs, times out, or is blocked with
"DANGEROUS COMMAND" error.

**Must always be `off`** so agents can run commands without interactive prompts.

---

## How Heartbeat Runs Work

When you click **"Run Heartbeat"** in the UI (or it fires on schedule):

1. Paperclip creates a `heartbeat_runs` record with `context_snapshot` containing
   `wakeSource`, `actorId`, workspace info, etc.
2. `execute.js` is called with `ctx` containing the run context
3. `buildPrompt()` reads `taskId` from `ctx.config` → with our patch also from `ctx.context`
4. If `taskId` found → `{{#taskId}}` block renders → agent works on the specific issue
5. If `taskId` empty → `{{#noTask}}` block renders → agent queries API for pending issues

**Known behavior:** "Run Heartbeat" button does NOT pass an `issueId` in `context_snapshot`.
So `taskId` is always empty even with the patch, and agent goes to `{{#noTask}}` branch.
In `{{#noTask}}`, the agent uses curl to find pending issues assigned to it, then works on them.

**"Assign Task" button** (top-right in Researcher UI) is the correct way to run agent
on a specific issue — it passes the issue ID in context.

---

## Full Recovery Procedure

### Step 1 — Check if patches are present

```bash
ssh -i .ssh_hetzner_key root@65.21.3.89 "
  F=/opt/paperclip/node_modules/.pnpm/hermes-paperclip-adapter@0.2.0/node_modules/hermes-paperclip-adapter/dist/server/execute.js
  echo ctx.context: \$(grep -c 'ctx.context?.taskId' \$F)
  echo PAPERCLIP_API_KEY: \$(grep -c 'PAPERCLIP_API_KEY' \$F)
  echo HOME patch: \$(grep -c 'hermes_user' \$F)
  echo paperclipApiKey: \$(grep -c 'paperclipApiKey' \$F)
"
# Expected: ctx.context: 2, PAPERCLIP_API_KEY: 3+, HOME patch: 1+, paperclipApiKey: 2+
```

### Step 2 — Apply patches from this repo

```bash
# Clone repo on server (or use scp)
ssh -i .ssh_hetzner_key root@65.21.3.89 "bash /path/to/paperclip/server/restore.sh"
```

Or from local machine:
```bash
scp -i .ssh_hetzner_key paperclip/server/restore.sh root@65.21.3.89:/tmp/restore.sh
ssh -i .ssh_hetzner_key root@65.21.3.89 "bash /tmp/restore.sh"
```

`restore.sh` does everything: patches execute.js, restores all adapter_configs in DB,
restarts Paperclip.

### Step 3 — Verify no TSX crash

```bash
ssh -i .ssh_hetzner_key root@65.21.3.89 "pm2 logs paperclip --lines 20 --nostream"
```

- ✅ `INFO: GET / 200` → Paperclip is up
- ❌ `SyntaxError: Unexpected token at line 133` → TSX crash, paperclipApiKey on wrong line

### Step 4 — Restore agent instructions

```bash
BASE="root@65.21.3.89:/opt/paperclip-data/instances/default/companies/b984404a-8587-41d0-9354-a6251bd0fd94/agents"
KEY="-i .ssh_hetzner_key"

scp $KEY paperclip/agents/researcher/AGENTS.md          $BASE/ccc8c5e8-cc55-4432-aa16-0bc73391049e/instructions/AGENTS.md
scp $KEY paperclip/agents/sme-facts-researcher/AGENTS.md $BASE/acf7ffec-4aef-43be-b83b-828170c15b17/instructions/AGENTS.md
scp $KEY paperclip/agents/case-studies-researcher/AGENTS.md $BASE/527db020-5bf8-41e0-bf8d-20e007e7056e/instructions/AGENTS.md
scp $KEY paperclip/agents/agentmail-monitor/AGENTS.md   $BASE/b948c00d-abbd-45a0-8520-e8458fc7b11c/instructions/AGENTS.md
```

### Step 5 — Check hermes approvals.mode

```bash
ssh -i .ssh_hetzner_key root@65.21.3.89 "grep 'mode:' /root/.hermes/config.yaml"
# Must show: mode: off
```

If not:
```bash
ssh -i .ssh_hetzner_key root@65.21.3.89 "
  sed -i 's/mode: manual/mode: off/' /root/.hermes/config.yaml
  sed -i 's/mode: autonomous/mode: off/' /root/.hermes/config.yaml
"
```

---

## Diagnosing Run Failures

### Agent completes instantly with no tool calls

```bash
docker exec paperclip-db psql -U paperclip -d paperclip -c \
  "SELECT event_type, message FROM heartbeat_run_events WHERE run_id = 'RUN_ID' ORDER BY seq;"
```

Only `run started` + `run succeeded` → patches not applied or Hermes not starting.

### Check full run output

```bash
docker exec paperclip-db psql -U paperclip -d paperclip -c \
  "SELECT stdout_excerpt FROM heartbeat_runs WHERE id = 'RUN_ID';"
```

| stdout shows | Cause | Fix |
|---|---|---|
| `No issues found` | taskId empty, no pending issues in API | Create issue with `status=todo`, assign to agent |
| `DANGEROUS COMMAND` | `approvals.mode` not `off` | Set to `mode: off` in config.yaml — `autonomous` is NOT a valid value, it falls back to `manual` |
| Agent searched but didn't write file | AGENTS.md instructions ambiguous | Make instructions explicit with mandatory steps |
| `SyntaxError line 133` | TSX crash from newline in patch | Put `paperclipApiKey` on same line as `paperclipApiUrl` |

### Check latest runs

```bash
docker exec paperclip-db psql -U paperclip -d paperclip -c \
  "SELECT id, status, started_at, finished_at FROM heartbeat_runs
   WHERE agent_id = 'AGENT_ID' ORDER BY created_at DESC LIMIT 5;"
```

### Delete all issues (clean slate)

FK constraints require deletion in order:
```bash
docker exec paperclip-db psql -U paperclip -d paperclip -c \
  "DELETE FROM issue_read_states WHERE issue_id IN (SELECT id FROM issues WHERE company_id = 'b984404a-8587-41d0-9354-a6251bd0fd94');"
docker exec paperclip-db psql -U paperclip -d paperclip -c \
  "DELETE FROM issue_comments WHERE issue_id IN (SELECT id FROM issues WHERE company_id = 'b984404a-8587-41d0-9354-a6251bd0fd94');"
docker exec paperclip-db psql -U paperclip -d paperclip -c \
  "DELETE FROM issues WHERE company_id = 'b984404a-8587-41d0-9354-a6251bd0fd94';"
```

### Create issue manually

```bash
docker exec paperclip-db psql -U paperclip -d paperclip -c \
  "INSERT INTO issues (company_id, project_id, title, description, status, assignee_agent_id)
   VALUES (
     'b984404a-8587-41d0-9354-a6251bd0fd94',
     '91ab5627-dedf-4265-b215-5fc80826f0a8',
     'Task title', 'Description', 'todo',
     'AGENT_ID'
   ) RETURNING id;"
```

### Reset issue to todo

```bash
docker exec paperclip-db psql -U paperclip -d paperclip -c \
  "UPDATE issues SET status = 'todo' WHERE id = 'ISSUE_ID';"
```

---

## File Structure (this repo)

```
paperclip/
├── README.md                            ← this file (full docs)
├── start.sh                             ← pm2 start script
├── server/
│   ├── execute.js.patch                 ← diff of all patches with explanation
│   └── restore.sh                       ← full restore: patch + DB + restart
└── agents/
    ├── researcher/
    │   ├── AGENTS.md                    ← agent instructions
    │   └── adapter_config.json          ← includes paperclipApiUrl fix
    ├── sme-facts-researcher/
    │   ├── AGENTS.md
    │   └── adapter_config.json
    ├── case-studies-researcher/
    │   ├── AGENTS.md
    │   └── adapter_config.json
    ├── agentmail-monitor/
    │   ├── AGENTS.md
    │   └── adapter_config.json
    ├── ceo/
    │   └── AGENTS.md
    └── chief-editor/
        ├── AGENTS.md
        └── adapter_config.json
```
