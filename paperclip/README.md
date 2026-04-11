# Paperclip — AIMediaFlow Agent Setup

Server: **65.21.3.89:3100**
Started via: `pm2 start /opt/paperclip/start.sh --name paperclip`

## Agents

| Name | ID | Adapter | Toolsets |
|---|---|---|---|
| Researcher | `ccc8c5e8-cc55-4432-aa16-0bc73391049e` | hermes_local | web, terminal |
| Chief Editor | `f18ff445-0515-4397-b814-2a754bd245b1` | hermes_local | web, terminal |
| CEO | `5423deab-0b1c-4a88-b533-5b88e24c1f19` | hermes_local | — |

Instructions: `paperclip/agents/<name>/AGENTS.md`
On server: `/opt/paperclip-data/instances/default/companies/b984404a-8587-41d0-9354-a6251bd0fd94/agents/<id>/instructions/AGENTS.md`

## Routines

| Name | Agent | Schedule | Timezone |
|---|---|---|---|
| Forum Pain Points Monitor | Researcher | `15 5 * * *` | Europe/Dublin |
| Morning Topics Aggregator | Chief Editor | `0 6 * * *` | UTC |

## Key lessons

- Issues must be created via API with `status: "todo"` to trigger `issue_assigned` wake
- Issues with `status: "backlog"` do NOT trigger wake (hardcoded in `issue-assignment-wakeup.ts:31`)
- Routines create issues with `status: "todo"` automatically — wake works correctly
- Agent writes files via Python (not printf/cat heredoc) to avoid bash quoting issues
- JWT auth: sign with `BETTER_AUTH_SECRET`, `run_id` must be real UUID from `heartbeat_runs`

## Manual run via API

```bash
# Generate JWT (run on server)
python3 /tmp/create_jwt.py  # see script below

# Trigger routine manually
curl -s -X POST "http://localhost:3100/api/routines/<routine-id>/run" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"source":"manual"}'

# Or create issue directly
curl -s -X POST "http://localhost:3100/api/companies/b984404a-8587-41d0-9354-a6251bd0fd94/issues" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Task title","status":"todo","assigneeAgentId":"<agent-id>"}'
```

## Routine IDs

| Routine | ID |
|---|---|
| Forum Pain Points Monitor | `dd24ed39-ecbf-47e5-8b85-fb818c2c8ebb` |
| Morning Topics Aggregator | `825fdd59-3a16-41bf-a1e7-f33c1a907eb1` |

## Company ID

`b984404a-8587-41d0-9354-a6251bd0fd94`

## Output files (on server)

- `/home/hermes_user/.hermes/forum-pain-points.md` — Researcher output
- `/home/hermes_user/.hermes/verified-sme-facts.md` — SME Facts Monitor output
- `/home/hermes_user/.hermes/competitor-case-studies.md` — Case Studies Monitor output
- `/home/hermes_user/.hermes/email-sourced-topics.md` — AgentMail Monitor output
