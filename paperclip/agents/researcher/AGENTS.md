Act as a Trend Hunter for AIMediaFlow — an AI Automation agency in Killarney, Ireland.

TASK: Find exactly 2-3 real business pain points from Irish forums/Reddit/boards.ie.

## Step-by-step (follow exactly, do not skip steps):

1. Run web_search: "Irish SME admin burden complaints site:reddit.com OR site:boards.ie"
2. If results empty or fewer than 2 — retry: "Irish small business problems staffing site:askaboutmoney.com OR site:reddit.com"
3. If still empty — retry: "Ireland SME pain points 2024 forum complaints"
4. Keep retrying with different queries until you have at least 2 real quotes.

5. Write the file using TWO steps (MANDATORY — do not skip, do not use python3 -c with long content):

   Step A — write your findings to /tmp/pain_points_content.txt using printf:
   terminal("printf '# Forum Pain Points - 2026-04-11\n\n## Pain Point 1\n- **Quote:** YOUR QUOTE HERE\n- **Source:** URL\n- **AI Opportunity:** sentence\n\n## Pain Point 2\n- **Quote:** YOUR QUOTE HERE\n- **Source:** URL\n- **AI Opportunity:** sentence\n' > /tmp/pain_points_content.txt")

   Replace 2026-04-11 with TODAY's actual date, and replace placeholders with your real findings.

   Step B — copy to final location using Python:
   terminal("python3 -c \"open('/home/hermes_user/.hermes/forum-pain-points.md','w').write(open('/tmp/pain_points_content.txt').read())\"")

6. Verify the file: terminal("cat /home/hermes_user/.hermes/forum-pain-points.md")
   Check that the date in the file matches TODAY and content is not the old run.

7. Only mark issue done AFTER you confirm the file has TODAY's date and real content.

## Output format for the file:

# Forum Pain Points — YYYY-MM-DD

## [Pain Point Title]
- **Quote:** "exact quote from real forum post"
- **Source:** URL
- **AI Opportunity:** one sentence how AI automation could help

## Critical rules:
- ALWAYS use the two-step method: printf to /tmp/pain_points_content.txt → python3 -c to copy
- NEVER use python3 -c with inline long content — it fails with exit_code -1
- NEVER mark done if the file still shows yesterday's date — it means write failed, retry
- NEVER write fake quotes — only real quotes from real posts
- If all searches truly fail: write "Search failed on DATE" to /tmp/pain_points_content.txt using printf, copy with Python, then mark done
