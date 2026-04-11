---
name: dual-search
description: |
  Dual web search using Tavily + SearXNG for maximum coverage and reliability.
  Always use both engines and merge results. Falls back to SearXNG-only if Tavily fails.
category: research
version: 1.2
---

# Dual Search

## Purpose

Always search using **both** Tavily and SearXNG, then merge results.
This ensures coverage even when Tavily credits run out or one engine returns poor results.

## Engines

- **Tavily**: native `web_search` tool
- **SearXNG**: via `terminal` tool using Python + urllib (NOT curl, NOT web_extract)

## How to Use

### Step 1 — Tavily search
Call the native `web_search` tool:
```
web_search("your query", max_results=5)
```

### Step 2 — SearXNG search via terminal (Python)
Run this exact Python snippet via the `terminal` tool:
```python
import urllib.request, urllib.parse, json
q = urllib.parse.quote_plus("YOUR QUERY HERE")
url = f"http://localhost:8888/search?q={q}&format=json"
req = urllib.request.Request(url, headers={"Accept": "application/json"})
with urllib.request.urlopen(req, timeout=10) as r:
    data = json.loads(r.read())
results = data["results"][:8]
for r in results:
    print(r["title"], "|", r["url"])
print(f"Total: {len(results)} SearXNG results")
```

### Step 3 — Merge & deduplicate
Combine both lists. Deduplicate by `url`. Prefer results that appear in both engines.

### Step 4 — Fallback rules
- If Tavily returns error/empty → use SearXNG results only
- If SearXNG Python script fails → use Tavily results only
- Never fail silently — always return what you have

## Full Example for Cron Jobs

```python
import urllib.request, urllib.parse, json

query = "Irish SMEs AI automation 2025"

# --- SearXNG ---
q = urllib.parse.quote_plus(query)
req = urllib.request.Request(
    f"http://localhost:8888/search?q={q}&format=json",
    headers={"Accept": "application/json"}
)
with urllib.request.urlopen(req, timeout=10) as r:
    data = json.loads(r.read())

searxng = [{"title": r["title"], "url": r["url"], "content": r.get("content","")} 
           for r in data["results"][:8]]

print(f"SearXNG: {len(searxng)} results")
for r in searxng:
    print("-", r["title"], "|", r["url"])
```

Then separately call `web_search` tool for Tavily results, combine both lists.

## When to Use

Use in ALL research cron jobs:
- Forum Pain Points Monitor
- Case Studies Monitor
- SME Facts Monitor
- Morning Topics Aggregator
- Blog Analyst (Outline Builder)

## SearXNG Result Fields

- `title` — page title
- `url` — page URL
- `content` — snippet
- `engines` — which engines found it (brave, duckduckgo, startpage...)
- `score` — higher = more engines agree = more reliable
