#!/usr/bin/env python3
"""
Create a Paperclip issue with instructions for a research agent.
Run on server: python3 create_issue.py
Then: docker cp /tmp/create_issue.sql paperclip-db:/tmp/ && docker exec paperclip-db psql -U paperclip -d paperclip -f /tmp/create_issue.sql
"""

COMPANY_ID = "b984404a-8587-41d0-9354-a6251bd0fd94"
PROJECT_ID = "91ab5627-dedf-4265-b215-5fc80826f0a8"

AGENTS = {
    "researcher":              "ccc8c5e8-cc55-4432-aa16-0bc73391049e",
    "sme-facts-researcher":    "acf7ffec-4aef-43be-b83b-828170c15b17",
    "case-studies-researcher": "527db020-5bf8-41e0-bf8d-20e007e7056e",
    "agentmail-monitor":       "b948c00d-abbd-45a0-8520-e8458fc7b11c",
    "ceo":                     "5423deab-0b1c-4a88-b533-5b88e24c1f19",
    "chief-editor":            "f18ff445-0515-4397-b814-2a754bd245b1",
}

# --- EDIT THESE ---
AGENT = "researcher"
TITLE = "Find Irish SME forum pain points"
DESCRIPTION = (
    "Search Irish forums for real SME pain points and write to file.\n\n"
    "STEP 1: Use web_search: Irish SME admin burden complaints site:reddit.com OR site:boards.ie\n"
    "STEP 2: If fewer than 2 results - retry: Irish small business problems 2024 forum complaints\n"
    "STEP 3: Write file /home/hermes_user/.hermes/forum-pain-points.md in this exact markdown:\n\n"
    "# Forum Pain Points - YYYY-MM-DD\n\n"
    "## [Pain Point Title]\n"
    "- **Quote:** exact quote from real post\n"
    "- **Source:** URL\n"
    "- **AI Opportunity:** one sentence\n\n"
    "## [Pain Point Title 2]\n"
    "- **Quote:** exact quote 2\n"
    "- **Source:** URL 2\n"
    "- **AI Opportunity:** one sentence\n\n"
    "Write using tee command. Verify with cat. Only mark done after file shows correct content."
)
# ------------------

agent_id = AGENTS[AGENT]
escaped = DESCRIPTION.replace("'", "''")
sql = (
    "INSERT INTO issues (company_id, project_id, title, description, status, assignee_agent_id) "
    "VALUES ("
    f"'{COMPANY_ID}',"
    f"'{PROJECT_ID}',"
    f"'{TITLE}',"
    f"'{escaped}',"
    "'todo',"
    f"'{agent_id}'"
    ") RETURNING id, title;"
)
open('/tmp/create_issue.sql', 'w').write(sql)
print(f"SQL written to /tmp/create_issue.sql")
print(f"Agent: {AGENT} ({agent_id})")
print(f"Title: {TITLE}")
print()
print("Now run:")
print("  docker cp /tmp/create_issue.sql paperclip-db:/tmp/create_issue.sql")
print("  docker exec paperclip-db psql -U paperclip -d paperclip -f /tmp/create_issue.sql")
