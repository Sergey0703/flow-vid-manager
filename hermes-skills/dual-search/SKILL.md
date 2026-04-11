---
name: dual-search
description: |
  Dual web search using Tavily + SearXNG for maximum coverage and reliability.
  Always use both engines and merge results. Falls back to SearXNG-only if Tavily fails.
category: research
version: 1.0
---

# Dual Search

## Purpose

Always search using **both** Tavily and SearXNG, then merge results.
This ensures coverage even when Tavily credits run out or one engine returns poor results.

## Endpoints

- **Tavily**: `web_search` tool (native Hermes tool, uses `TAVILY_API_KEY`)
- **SearXNG**: `http://localhost:8888/search?q=QUERY&format=json` via `web_fetch`

## How to Use

### Step 1 — Tavily search
Call the native `web_search` tool with your query.
Save results as list of `{title, url, content}`.

### Step 2 — SearXNG search
Call `web_fetch` on:
```
http://localhost:8888/search?q=YOUR+QUERY+URL+ENCODED&format=json
```
Parse JSON response. Extract `results[]` → each has `title`, `url`, `content`.
Take top 5-10 by `score`.

### Step 3 — Merge & deduplicate
Combine both lists. Deduplicate by `url`. Prefer results that appear in both engines (higher confidence).

### Step 4 — Fallback rules
- If Tavily returns error / empty → use SearXNG results only (don't stop)
- If SearXNG unreachable → use Tavily results only (don't stop)
- Never fail silently — always return what you have

## Example (pseudo-steps)

```
query = "Irish SMEs admin burden AI automation"

# Tavily
tavily_results = web_search(query, max_results=5)

# SearXNG
searxng_raw = web_fetch("http://localhost:8888/search?q=Irish+SMEs+admin+burden+AI+automation&format=json")
searxng_results = parse searxng_raw["results"][:8]

# Merge
all_results = deduplicate(tavily_results + searxng_results, key="url")
```

## When to Use

Use this skill whenever you need to do web research, especially in:
- Cron jobs (Forum Pain Points, Case Studies, Facts, Morning Aggregator)
- Any research task where missing results = incomplete output

## SearXNG Query Tips

- URL-encode spaces as `+`
- Add `&language=en` for English results
- Add `&categories=general` (default) or `&categories=news` for recent news
- Max results per page: use `&pageno=1` (default)
