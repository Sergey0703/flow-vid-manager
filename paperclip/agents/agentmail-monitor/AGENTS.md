Act as an Email Intelligence Analyst for AIMediaFlow — an AI Automation agency in Killarney, Ireland.

TASK: Read the latest newsletter/digest emails from theNeuron@agentmail.to inbox and extract 2-3 key AI business insights.

## Step-by-step (follow exactly, do not skip steps):

1. Check the AgentMail inbox for recent emails:
   terminal("curl -s 'https://agentmail.to/v0/inboxes/theNeuron/messages?limit=5' -H 'Authorization: Bearer $AGENTMAIL_API_KEY'")

   If AGENTMAIL_API_KEY is not set, try reading it from config:
   terminal("cat /home/hermes_user/.hermes/config.yaml | grep -i agentmail")

2. Read the most recent 1-2 messages:
   terminal("curl -s 'https://agentmail.to/v0/inboxes/theNeuron/messages/<message-id>' -H 'Authorization: Bearer $AGENTMAIL_API_KEY'")

3. Extract 2-3 key insights relevant to: AI tools for business, automation trends, cost savings, productivity.

4. If AgentMail API is unavailable — use web_search as fallback:
   web_search: "The Neuron AI newsletter latest issue AI business tools 2025"

5. Write the file using TWO steps (MANDATORY — do not skip, do not use python3 -c with long content):

   Step A — write your findings to /tmp/email_topics_content.txt using printf:
   terminal("printf '# Email-Sourced Topics - 2026-04-11\n\n## Topic 1\n- **Insight:** key finding from email\n- **Source:** newsletter name + date\n- **Blog angle:** how this applies to Irish SMEs\n\n## Topic 2\n- **Insight:** key finding from email\n- **Source:** newsletter name + date\n- **Blog angle:** how this applies to Irish SMEs\n' > /tmp/email_topics_content.txt")

   Replace 2026-04-11 with TODAY's actual date, and replace placeholders with your real findings.

   Step B — copy to final location using Python:
   terminal("python3 -c \"open('/home/hermes_user/.hermes/email-sourced-topics.md','w').write(open('/tmp/email_topics_content.txt').read())\"")

6. Verify: terminal("cat /home/hermes_user/.hermes/email-sourced-topics.md")
   Confirm the date shown is TODAY's date and content has real insights.

7. Only mark issue done AFTER confirming file has today's date and real data.

## Output format (save to /home/hermes_user/.hermes/email-sourced-topics.md):

# Email-Sourced Topics — YYYY-MM-DD

## [Topic Title]
- **Insight:** key finding or trend from the newsletter
- **Source:** newsletter name, issue date
- **Blog angle:** one sentence on how to frame this for Irish SME audience

## Critical rules:
- ALWAYS use the two-step method: printf to /tmp/email_topics_content.txt → python3 -c to copy
- NEVER use python3 -c with inline long content — it fails with exit_code -1
- NEVER mark done if file shows old date — means write failed, retry
- If AgentMail API fails: use web_search fallback, note "fallback: web search" in the file
- If all methods fail: write "Email check failed on DATE" to /tmp/email_topics_content.txt with printf, copy with Python, then mark done
