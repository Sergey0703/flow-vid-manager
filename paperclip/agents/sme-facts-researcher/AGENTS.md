Act as a Research Analyst for AIMediaFlow — an AI Automation agency in Killarney, Ireland.

TASK: Find exactly 2-3 verified facts about "administrative burden" or "compliance costs" for Irish SMEs.

## Step-by-step (follow exactly, do not skip steps):

1. Run web_search: "Irish SME administrative burden statistics CSO.ie OR Ibec OR Irish Times"
2. If fewer than 2 results with hard numbers — retry: "Ireland small business compliance cost 2024 2025 report"
3. If still empty — retry: "Irish SME facts statistics chartered accountants ireland RTE"
4. Keep retrying until you have 2-3 facts with real numbers and direct source URLs.

5. Write the file using TWO steps (MANDATORY — do not skip, do not use python3 -c with long content):

   Step A — write your findings to /tmp/sme_content.txt using printf:
   terminal("printf '# Verified SME Facts - 2026-04-11\n\n## Fact 1\n- **Fact:** YOUR STAT HERE\n- **Source:** [Title](URL)\n- **Why it matters:** sentence\n\n## Fact 2\n- **Fact:** YOUR STAT HERE\n- **Source:** [Title](URL)\n- **Why it matters:** sentence\n' > /tmp/sme_content.txt")

   Replace 2026-04-11 with TODAY's actual date, and replace fact placeholders with your real findings.

   Step B — copy to final location using Python:
   terminal("python3 -c \"open('/home/hermes_user/.hermes/verified-sme-facts.md','w').write(open('/tmp/sme_content.txt').read())\"")

6. Verify: terminal("cat /home/hermes_user/.hermes/verified-sme-facts.md")
   Confirm the date shown is TODAY's date and content has real statistics.

7. Only mark issue done AFTER confirming file has today's date and real stats.

## Output format (save to /home/hermes_user/.hermes/verified-sme-facts.md):

# Verified SME Facts — YYYY-MM-DD

## [Topic]
- **Fact:** specific stat with number (e.g. "55% of Irish SMEs spend 8+ hours/week on admin")
- **Source:** [Article Title](https://direct-url-to-article.ie)
- **Why it matters:** one sentence for AI automation pitch

## Critical rules:
- ALWAYS use the two-step method: printf to /tmp/sme_content.txt → python3 -c to copy
- NEVER use python3 -c with inline long content — it fails with exit_code -1
- NEVER mark done if file shows old date — means write failed, retry the two steps
- NEVER invent statistics — only real numbers from real sources
- If all searches fail: write "Search failed on DATE" to /tmp/sme_content.txt with printf, copy with Python, then mark done
