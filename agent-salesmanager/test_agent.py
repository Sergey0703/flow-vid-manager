"""
Pixel Sales Agent — headless text tester.

Runs scenarios from test_scenarios.json against the real LLM + Typesense,
with realistic pauses simulating voice conversation timing.

Usage:
    python test_agent.py                          # all scenarios
    python test_agent.py --scenario browse_hoodies
    python test_agent.py --scenario browse_hoodies --no-pause
    python test_agent.py --list
"""

import asyncio
import json
import logging
import os
import sys
import argparse
from datetime import datetime
from typing import Any

import aiohttp
from dotenv import load_dotenv
from groq import AsyncGroq

load_dotenv()

# ── Config ─────────────────────────────────────────────────────────────────────

GROQ_API_KEY      = os.getenv("GROQ_API_KEY")
TYPESENSE_HOST    = os.getenv("TYPESENSE_HOST", "46.62.246.93")
TYPESENSE_PORT    = os.getenv("TYPESENSE_PORT", "8108")
TYPESENSE_API_KEY = os.getenv("TYPESENSE_API_KEY", "typesense-local-key-2025")
TYPESENSE_BASE    = f"http://{TYPESENSE_HOST}:{TYPESENSE_PORT}"
LLM_MODEL         = "meta-llama/llama-4-scout-17b-16e-instruct"

SCENARIOS_FILE = os.path.join(os.path.dirname(__file__), "test_scenarios.json")
LOG_FILE       = os.path.join(os.path.dirname(__file__), "test_results.log")

logging.basicConfig(level=logging.WARNING)  # suppress aiohttp noise


# ── Colors for terminal output ──────────────────────────────────────────────────

class C:
    RESET   = "\033[0m"
    BOLD    = "\033[1m"
    CYAN    = "\033[96m"
    YELLOW  = "\033[93m"
    GREEN   = "\033[92m"
    RED     = "\033[91m"
    MAGENTA = "\033[95m"
    DIM     = "\033[2m"
    BLUE    = "\033[94m"


# ── Typesense helpers (copied from agent.py) ───────────────────────────────────

def _build_filter(category, colors, sizes, price_min, price_max, stock_only):
    parts = []
    if stock_only:
        parts.append("stock:>0")
    if category:
        parts.append(f"category:={category}")
    if colors:
        color_expr = " || ".join(f"colors:={c.lower()}" for c in colors)
        parts.append(f"({color_expr})" if len(colors) > 1 else color_expr)
    if sizes:
        size_expr = " || ".join(f"sizes:={s.upper()}" for s in sizes)
        parts.append(f"({size_expr})" if len(sizes) > 1 else size_expr)
    if price_min is not None and price_max is not None:
        parts.append(f"price:[{price_min}..{price_max}]")
    elif price_max is not None:
        parts.append(f"price:<{price_max}")
    elif price_min is not None:
        parts.append(f"price:>={price_min}")
    return " && ".join(parts)


async def _do_search(q, filter_by):
    params = {
        "q": q or "*",
        "query_by": "name,description",
        "query_by_weights": "10,2",
        "num_typos": "1",
        "per_page": "5",
        "sort_by": "_text_match:desc",
    }
    if filter_by:
        params["filter_by"] = filter_by
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{TYPESENSE_BASE}/collections/products/documents/search",
                headers={"X-TYPESENSE-API-KEY": TYPESENSE_API_KEY},
                params=params,
            ) as res:
                if res.status != 200:
                    return []
                data = await res.json()
                return data.get("hits", [])
    except Exception as e:
        return []


async def _search_products_raw(q, category, colors, sizes, price_min, price_max):
    filter_by = _build_filter(category, colors, sizes, price_min, price_max, stock_only=True)
    hits = await _do_search(q, filter_by)
    if not hits:
        filter_by = _build_filter(category, colors, sizes, price_min, price_max, stock_only=False)
        hits = await _do_search(q, filter_by)
    if not hits and (colors or sizes):
        filter_by = _build_filter(category, [], [], price_min, price_max, stock_only=True)
        hits = await _do_search(q, filter_by)
    if not hits:
        return "", []

    ids = [h["document"].get("id", "") for h in hits if h["document"].get("id")]
    lines = []
    for h in hits:
        d = h["document"]
        name        = d.get("name", "")
        price       = d.get("price", 0)
        stock       = d.get("stock", 0)
        sizes_avail = ", ".join(d.get("sizes", [])) or "one size"
        colors_avail= ", ".join(d.get("colors", [])) or ""
        desc        = d.get("description", "")
        stock_label = f"in stock: {stock}" if stock > 0 else "OUT OF STOCK"
        color_part  = f" | colors: {colors_avail}" if colors_avail else ""
        pid         = d.get("id", "")
        lines.append(f"- [id:{pid}] {name} €{price:.2f} | sizes: {sizes_avail}{color_part} | {stock_label} | {desc}")

    return "Matching products from the shop:\n" + "\n".join(lines), ids


async def _search_faq_raw(query):
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{TYPESENSE_BASE}/collections/faq/documents/search",
                headers={"X-TYPESENSE-API-KEY": TYPESENSE_API_KEY},
                params={
                    "q": query,
                    "query_by": "text,category",
                    "per_page": 4,
                    "sort_by": "_text_match:desc",
                },
            ) as res:
                if res.status != 200:
                    return ""
                data = await res.json()
                hits = data.get("hits", [])
                texts = [h["document"].get("text", "") for h in hits if h["document"].get("text")]
                return "\n".join(f"{i+1}. {t}" for i, t in enumerate(texts)) if texts else ""
    except Exception:
        return ""


async def _fetch_categories():
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{TYPESENSE_BASE}/collections/products/documents/search",
                headers={"X-TYPESENSE-API-KEY": TYPESENSE_API_KEY},
                params={"q": "*", "query_by": "name", "facet_by": "category", "per_page": 0},
            ) as res:
                if res.status != 200:
                    return []
                data = await res.json()
                counts = data.get("facet_counts", [{}])[0].get("counts", [])
                return [c["value"] for c in counts]
    except Exception:
        return []


# ── Tool execution ──────────────────────────────────────────────────────────────

# Tracks UI state (what would be sent via set_attributes)
ui_state = {"recommended_ids": "", "expanded_id": ""}


async def execute_tool(name: str, args: dict) -> tuple[str, dict]:
    """Execute a tool call and return (result_text, ui_changes)."""
    ui_changes = {}

    if name == "search_products":
        category  = args.get("category", "")
        colors    = args.get("colors", [])
        sizes     = args.get("sizes", [])
        price_max = args.get("price_max", -1)
        keywords  = args.get("keywords", "")
        price_max_val = price_max if price_max > 0 else None

        context, ids = await _search_products_raw(
            q=keywords,
            category=category,
            colors=colors,
            sizes=sizes,
            price_min=None,
            price_max=price_max_val,
        )
        ui_changes["recommended_ids"] = ",".join(ids)
        ui_changes["expanded_id"]     = ids[0] if len(ids) == 1 else ""
        ui_state.update(ui_changes)
        return context or "No products found for that query.", ui_changes

    elif name == "expand_product":
        product_id = args.get("product_id", "")
        ui_changes["expanded_id"]     = product_id
        ui_changes["recommended_ids"] = product_id
        ui_state.update(ui_changes)
        return f"Product {product_id} is now shown in detail on the page.", ui_changes

    elif name == "close_product":
        ui_changes["expanded_id"] = ""
        ui_state["expanded_id"] = ""
        return "Product card closed.", ui_changes

    elif name == "search_faq":
        query = args.get("query", "")
        result = await _search_faq_raw(query)
        return result or "No relevant information found.", ui_changes

    return f"Unknown tool: {name}", ui_changes


# ── Tool definitions for Groq ───────────────────────────────────────────────────

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_products",
            "description": "Search the shop catalogue for products. Call this whenever the user asks about items, availability, prices, sizes, or colors.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "description": "Product category. Use exact values from AVAILABLE CATEGORIES. Empty string = all categories."
                    },
                    "colors": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Colors to filter by, e.g. ['black', 'navy']. Empty list = any color."
                    },
                    "sizes": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Sizes to filter by, e.g. ['L', 'XL']. Empty list = any size."
                    },
                    "price_max": {
                        "type": "number",
                        "description": "Maximum price in EUR. Use -1 if no price limit was mentioned."
                    },
                    "keywords": {
                        "type": "string",
                        "description": "Free-text keywords for style/material/name, e.g. 'zip-front', 'cotton', 'track'. Empty string if no specific style."
                    }
                },
                "required": ["category", "colors", "sizes", "price_max", "keywords"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "expand_product",
            "description": "Show a single product card in full detail. Call this when the user says 'show me that one', 'open it', 'tell me more', 'show the card', or picks a specific product.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_id": {
                        "type": "string",
                        "description": "The product ID to expand. Use the id shown as [id:XXX] in search_products result, e.g. 'p011'."
                    }
                },
                "required": ["product_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "close_product",
            "description": "Close the currently open product card. Call this when the user says 'close it', 'close the card', 'close that', 'go back', 'never mind', or any variation meaning they want to stop viewing a product detail.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_faq",
            "description": "Search shop FAQ and policies. Call this for questions about shipping, returns, payment, sizing guides, or anything not about specific products.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Question about shop policies, shipping, returns, payment, or general info"
                    }
                },
                "required": ["query"]
            }
        }
    }
]


# ── Session runner ──────────────────────────────────────────────────────────────

class TestSession:
    def __init__(self, categories: list[str], log_lines: list[str], no_pause: bool):
        cats_exact = ", ".join(categories) if categories else "hoodies, tshirts, jackets, sweatshirts, accessories, bottoms"
        cats_list  = ", ".join(categories[:-1]) + (f", and {categories[-1]}" if len(categories) > 1 else (categories[0] if categories else ""))

        self.system_prompt = f"""You are Pixel, a funny, cute AI kitten assistant for a streetwear clothing shop.
You help customers find the perfect items — {cats_list}, and more.

YOUR STYLE:
- Playful, funny, warm — like a kitten who happens to know fashion
- Speak to what the customer actually wants, not product specs
- Keep replies VERY SHORT. Aim for 10-15 words. Hard limit: 20 words maximum.
- One or two short sentences maximum.
- Be energetic and charming

CRITICAL VOICE RULES:
1. NEVER use bold text or markdown formatting
2. NEVER use headers or bullet points
3. Speak in plain natural conversational English
4. No lists — speak in flowing sentences
5. SHORT replies only.

PRODUCT RULES — CRITICAL, NO EXCEPTIONS:
- IMMEDIATELY call search_products the moment a user mentions ANY item, category, or style
- Do NOT ask clarifying questions first — search first, then respond based on results
- Do NOT say "let me check" or "I can check" — just call search_products silently and respond with results
- Only mention products returned by search_products
- Always mention name and price when recommending a product
- If a product is out of stock (stock = 0), say it is currently out of stock and suggest an alternative
- If sizes or colors are available, mention them naturally
- Never invent products, prices, or stock levels
- When searching for a product by name (e.g. "Graphic Tee", "Bomber Jacket"), always set the correct category parameter — do NOT leave it empty

SHOWING PRODUCT DETAIL:
- Call expand_product when the user says: "show me that", "open it", "tell me more", "show the card", "show details", "select it", "that one", or picks a specific product from a list
- Use the product_id from the most recent search_products result
- If multiple products were found and user picks one by name or number, expand that specific one

CLOSING PRODUCT CARD:
- Call close_product when the user says: "close it", "close the card", "close that", "go back", "never mind", "dismiss it", or any variation meaning they want to stop viewing a product detail
- NEVER call search_products when the user just wants to close a card
- After closing, simply ask what they would like to see next

AVAILABLE CATEGORIES (exact values for search_products category parameter):
{cats_exact}

ENDING THE CALL:
When the user says goodbye, bye, thanks bye, that is all, say a short warm farewell."""

        self.client    = AsyncGroq(api_key=GROQ_API_KEY)
        self.history   = []
        self.log_lines = log_lines
        self.no_pause  = no_pause

    def _log(self, line: str):
        clean = line.replace(C.RESET, "").replace(C.BOLD, "").replace(C.CYAN, "") \
                    .replace(C.YELLOW, "").replace(C.GREEN, "").replace(C.RED, "") \
                    .replace(C.MAGENTA, "").replace(C.DIM, "").replace(C.BLUE, "")
        self.log_lines.append(clean)

    def _print(self, line: str):
        print(line)
        self._log(line)

    async def _pause(self, seconds: float):
        if not self.no_pause and seconds > 0:
            await asyncio.sleep(seconds)

    async def send_message(self, user_text: str, pauses: dict) -> str:
        self.history.append({"role": "user", "content": user_text})

        messages = [{"role": "system", "content": self.system_prompt}] + self.history

        # LLM call with tools
        response = await self.client.chat.completions.create(
            model=LLM_MODEL,
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
            temperature=0.3,
        )

        msg = response.choices[0].message
        tool_calls = msg.tool_calls or []

        # Process tool calls
        all_ui_changes = {}
        if tool_calls:
            # Add assistant message with tool calls to history
            self.history.append({
                "role": "assistant",
                "content": msg.content or "",
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {"name": tc.function.name, "arguments": tc.function.arguments}
                    }
                    for tc in tool_calls
                ]
            })

            for tc in tool_calls:
                tool_name = tc.function.name
                try:
                    tool_args = json.loads(tc.function.arguments)
                except json.JSONDecodeError:
                    tool_args = {}

                # Print tool call
                args_display = ", ".join(f"{k}={repr(v)}" for k, v in tool_args.items() if v not in ([], "", -1, None))
                self._print(f"  {C.MAGENTA}→ TOOL: {tool_name}({args_display}){C.RESET}")

                await self._pause(pauses.get("pause_after_tool_call_sec", 1.0))

                result, ui_changes = await execute_tool(tool_name, tool_args)
                all_ui_changes.update(ui_changes)

                # Show UI state changes
                if ui_changes:
                    ui_parts = []
                    if "recommended_ids" in ui_changes:
                        ids_str = ui_changes["recommended_ids"]
                        if ids_str:
                            ids = ids_str.split(",")
                            ui_parts.append(f"recommended: [{', '.join(ids)}]")
                        else:
                            ui_parts.append("recommended: cleared")
                    if "expanded_id" in ui_changes:
                        exp = ui_changes["expanded_id"]
                        ui_parts.append(f"expanded: {exp if exp else 'CLOSED'}")
                    if ui_parts:
                        self._print(f"  {C.BLUE}→ UI: {' | '.join(ui_parts)}{C.RESET}")

                # Show tool result summary
                result_lines = result.strip().split("\n")
                if len(result_lines) <= 3:
                    for line in result_lines:
                        self._print(f"  {C.DIM}  {line}{C.RESET}")
                else:
                    self._print(f"  {C.DIM}  {result_lines[0]}{C.RESET}")
                    self._print(f"  {C.DIM}  ... ({len(result_lines)-1} products){C.RESET}")

                # Add tool result to history
                self.history.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": result,
                })

            # Get final response after tool calls
            messages2 = [{"role": "system", "content": self.system_prompt}] + self.history
            response2 = await self.client.chat.completions.create(
                model=LLM_MODEL,
                messages=messages2,
                temperature=0.3,
            )
            final_text = response2.choices[0].message.content or ""
        else:
            final_text = msg.content or ""
            self._print(f"  {C.DIM}→ no tool call{C.RESET}")

        self.history.append({"role": "assistant", "content": final_text})
        return final_text


# ── Main runner ──────────────────────────────────────────────────────────────────

async def run_scenario(scenario: dict, categories: list[str], pauses: dict,
                       log_lines: list[str], no_pause: bool):
    sid      = scenario["id"]
    persona  = scenario["persona"]
    messages = scenario["messages"]

    print(f"\n{C.BOLD}{C.CYAN}{'═'*60}{C.RESET}")
    print(f"{C.BOLD}{C.CYAN}SCENARIO: {sid}{C.RESET}")
    print(f"{C.DIM}Persona: {persona}{C.RESET}")
    print(f"{C.BOLD}{C.CYAN}{'═'*60}{C.RESET}")
    log_lines.append(f"\n{'='*60}")
    log_lines.append(f"SCENARIO: {sid} | {persona}")
    log_lines.append(f"{'='*60}")

    session = TestSession(categories, log_lines, no_pause)

    # Reset UI state for each scenario
    ui_state["recommended_ids"] = ""
    ui_state["expanded_id"]     = ""

    # Initial greeting
    greeting_resp = await session.client.chat.completions.create(
        model=LLM_MODEL,
        messages=[
            {"role": "system", "content": session.system_prompt},
            {"role": "user",   "content": "__start__"},
        ],
        temperature=0.4,
    )
    greeting = greeting_resp.choices[0].message.content or ""
    session.history.append({"role": "assistant", "content": greeting})
    print(f"\n{C.GREEN}[Pixel]{C.RESET}: {greeting}")
    log_lines.append(f"\n[Pixel]: {greeting}")

    for i, user_msg in enumerate(messages, 1):
        await session._pause(pauses.get("pause_between_messages_sec", 3.0))

        print(f"\n{C.YELLOW}[You #{i}]{C.RESET}: {user_msg}")
        log_lines.append(f"\n[You #{i}]: {user_msg}")

        reply = await session.send_message(user_msg, pauses)

        print(f"{C.GREEN}[Pixel]{C.RESET}: {reply}")
        log_lines.append(f"[Pixel]: {reply}")

        # Show current UI state after each turn
        rec = ui_state.get("recommended_ids", "")
        exp = ui_state.get("expanded_id", "")
        if rec or exp:
            state_parts = []
            if rec: state_parts.append(f"recommended=[{rec}]")
            if exp: state_parts.append(f"expanded={exp}")
            print(f"  {C.DIM}UI state: {' | '.join(state_parts)}{C.RESET}")


async def main():
    parser = argparse.ArgumentParser(description="Pixel agent text tester")
    parser.add_argument("--scenario", help="Run a single scenario by ID")
    parser.add_argument("--no-pause", action="store_true", help="Skip all pauses (fast mode)")
    parser.add_argument("--list", action="store_true", help="List all available scenarios")
    args = parser.parse_args()

    with open(SCENARIOS_FILE, encoding="utf-8") as f:
        data = json.load(f)

    scenarios = data["scenarios"]
    pauses    = data["settings"]

    if args.list:
        print(f"\n{C.BOLD}Available scenarios:{C.RESET}")
        for s in scenarios:
            print(f"  {C.CYAN}{s['id']:<30}{C.RESET} {s['persona']}")
        return

    if not GROQ_API_KEY:
        print(f"{C.RED}ERROR: GROQ_API_KEY not set in .env{C.RESET}")
        sys.exit(1)

    print(f"\n{C.BOLD}Fetching categories from Typesense...{C.RESET}")
    categories = await _fetch_categories()
    if categories:
        print(f"  Categories: {', '.join(categories)}")
    else:
        print(f"  {C.YELLOW}Warning: could not fetch categories, using defaults{C.RESET}")

    if args.no_pause:
        print(f"  {C.DIM}Fast mode: pauses disabled{C.RESET}")

    log_lines = [f"Test run: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"]
    log_lines.append(f"Model: {LLM_MODEL}")
    log_lines.append(f"Categories: {', '.join(categories) or 'defaults'}")

    to_run = [s for s in scenarios if s["id"] == args.scenario] if args.scenario else scenarios

    if args.scenario and not to_run:
        print(f"{C.RED}Scenario '{args.scenario}' not found.{C.RESET}")
        print("Use --list to see available scenarios.")
        sys.exit(1)

    for i, scenario in enumerate(to_run):
        await run_scenario(scenario, categories, pauses, log_lines, args.no_pause)
        if i < len(to_run) - 1:
            pause = pauses.get("pause_between_scenarios_sec", 5.0)
            if not args.no_pause:
                print(f"\n{C.DIM}--- pausing {pause}s before next scenario ---{C.RESET}")
                await asyncio.sleep(pause)

    # Save log
    with open(LOG_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(log_lines))
    print(f"\n{C.DIM}Log saved to: {LOG_FILE}{C.RESET}")


if __name__ == "__main__":
    asyncio.run(main())
