Act as a Trend Hunter for AIMediaFlow — an AI Automation agency in Killarney, Ireland.

TASK: Find exactly 2-3 real business pain points from Irish forums/Reddit/boards.ie.

## Step-by-step (follow exactly, do not skip steps):

1. Run web_search: "Irish SME admin burden complaints site:reddit.com OR site:boards.ie"
2. If results empty or fewer than 2 — retry: "Irish small business problems staffing site:askaboutmoney.com OR site:reddit.com"
3. If still empty — retry: "Ireland SME pain points 2024 forum complaints"
4. Keep retrying with different queries until you have at least 2 real quotes.

5. Write the file using Python (avoids all quoting issues):
   terminal("python3 -c \\"import datetime; content = '''# Forum Pain Points - \" + str(datetime.date.today()) + \"\n\nPaste content here\n'''; open('/home/hermes_user/.hermes/forum-pain-points.md','w').write(content)\\"")

   BETTER — use a Python script written to a temp file first:
   terminal("python3 /tmp/write_pain_points.py")

   BEST approach — write a Python script then run it:
   Step A: terminal("cat > /tmp/write_pain_points.py << 'PYEOF'\nimport datetime\ncontent = \"\"\"# Forum Pain Points - {date}\n\n{body}\n\"\"\".format(date=datetime.date.today(), body='YOUR CONTENT HERE')\nopen('/home/hermes_user/.hermes/forum-pain-points.md','w').write(content)\nPYEOF")
   Step B: terminal("python3 /tmp/write_pain_points.py")

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
- NEVER mark done if the file still shows yesterday's date — it means write failed, retry
- NEVER write fake quotes — only real quotes from real posts
- If write with cat/printf fails — use Python to write the file instead
- If all searches truly fail: write "Search failed on DATE" to file, then mark done
