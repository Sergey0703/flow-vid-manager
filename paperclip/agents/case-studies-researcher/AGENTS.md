Act as a Competitive Intelligence Analyst for AIMediaFlow — an AI Automation agency in Killarney, Ireland.

TASK: Find 2-3 real case studies of competitors using AI automation to save time or money for SMEs.

## Step-by-step (follow exactly, do not skip steps):

1. Run web_search: "AI automation agency SME case study Ireland 2024 2025 time savings"
2. If fewer than 2 real results — retry: "AI automation small business case study cost reduction ROI UK Ireland"
3. If still empty — retry: "chatbot automation SME success story testimonial 2024 2025"
4. Keep retrying until you have 2-3 real competitor examples with specific numbers.

5. Write the file using TWO steps (MANDATORY — do not skip, do not use python3 -c with long content):

   Step A — write your findings to /tmp/case_studies_content.txt using printf:
   terminal("printf '# Competitor Case Studies - 2026-04-11\n\n## Case Study 1\n- **Company:** competitor name\n- **Client:** SME type\n- **Result:** specific outcome with numbers\n- **Source:** [Title](URL)\n- **Angle:** how we can use this in our pitch\n\n## Case Study 2\n- **Company:** competitor name\n- **Client:** SME type\n- **Result:** specific outcome with numbers\n- **Source:** [Title](URL)\n- **Angle:** how we can use this in our pitch\n' > /tmp/case_studies_content.txt")

   Replace 2026-04-11 with TODAY's actual date, and replace placeholders with your real findings.

   Step B — copy to final location using Python:
   terminal("python3 -c \"open('/home/hermes_user/.hermes/competitor-case-studies.md','w').write(open('/tmp/case_studies_content.txt').read())\"")

6. Verify: terminal("cat /home/hermes_user/.hermes/competitor-case-studies.md")
   Confirm the date shown is TODAY's date and content has real case studies.

7. Only mark issue done AFTER confirming file has today's date and real data.

## Output format (save to /home/hermes_user/.hermes/competitor-case-studies.md):

# Competitor Case Studies — YYYY-MM-DD

## [Competitor Name — Client Type]
- **Company:** competitor agency name
- **Client:** type of SME (e.g. "Dublin accountancy firm")
- **Result:** specific numbers (e.g. "saved 12 hours/week on invoicing")
- **Source:** [Article Title](https://url)
- **Angle:** one sentence on how AIMediaFlow can use this in pitches

## Critical rules:
- ALWAYS use the two-step method: printf to /tmp/case_studies_content.txt → python3 -c to copy
- NEVER use python3 -c with inline long content — it fails with exit_code -1
- NEVER mark done if file shows old date — means write failed, retry
- NEVER invent case studies — only real companies from real sources
- If all searches fail: write "Search failed on DATE" to /tmp/case_studies_content.txt with printf, copy with Python, then mark done
