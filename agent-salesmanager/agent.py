import logging
import os
from typing import Annotated

import aiohttp
from dotenv import load_dotenv

load_dotenv()

from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    WorkerOptions,
    cli,
    llm,
)
from livekit.agents.beta.tools import EndCallTool
from livekit.plugins import openai as lk_openai, deepgram, silero
from livekit.plugins.turn_detector.english import EnglishModel
from session_logger import SessionLogger

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("aimediaflow-salesmanager")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
TYPESENSE_HOST = os.getenv("TYPESENSE_HOST", "typesense")
TYPESENSE_PORT = os.getenv("TYPESENSE_PORT", "8108")
TYPESENSE_API_KEY = os.getenv("TYPESENSE_API_KEY", "typesense-local-key-2025")

TYPESENSE_BASE = f"http://{TYPESENSE_HOST}:{TYPESENSE_PORT}"

if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY is required")

SYSTEM_BASE_TEMPLATE = """You are Pixel, a funny, cute AI kitten assistant for a streetwear clothing shop.
You help customers find the perfect items — {categories_list}, and more.

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

PRODUCT RULES:
- Always call search_products before recommending any item
- Only mention products returned by search_products
- Always mention name and price when recommending a product
- If a product is out of stock (stock = 0), say it is currently out of stock and suggest an alternative
- If sizes or colors are available, mention them naturally
- Never invent products, prices, or stock levels

AVAILABLE CATEGORIES (exact values for search_products category parameter):
{categories_exact}

ENDING THE CALL:
When the user says goodbye, bye, thanks bye, that is all, or clearly indicates they are done,
call the end_call tool immediately — do NOT say anything before calling it."""


# ── Typesense categories ───────────────────────────────────────────────────────

async def _fetch_categories() -> list[str]:
    """Fetch product categories from Typesense facets."""
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
    except Exception as e:
        logger.error(f"Typesense categories fetch error: {e}")
        return []


# ── Typesense search ───────────────────────────────────────────────────────────

def _build_filter(
    category: str,
    colors: list[str],
    sizes: list[str],
    price_min: float | None,
    price_max: float | None,
    stock_only: bool,
) -> str:
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


async def _do_search(q: str, filter_by: str) -> list:
    params: dict = {
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
                    logger.warning(f"Typesense returned {res.status}: {await res.text()}")
                    return []
                data = await res.json()
                return data.get("hits", [])
    except Exception as e:
        logger.error(f"Typesense search error: {e}")
        return []


async def _search_products_raw(
    q: str,
    category: str,
    colors: list[str],
    sizes: list[str],
    price_min: float | None,
    price_max: float | None,
) -> tuple[str, list[str]]:
    """Search products with structured filters. Returns (formatted_context, list_of_ids)."""
    # Try with stock filter first
    filter_by = _build_filter(category, colors, sizes, price_min, price_max, stock_only=True)
    hits = await _do_search(q, filter_by)

    # Relax stock filter if nothing found
    if not hits:
        filter_by = _build_filter(category, colors, sizes, price_min, price_max, stock_only=False)
        hits = await _do_search(q, filter_by)

    # Relax size/color filters but keep category and price
    if not hits and (colors or sizes):
        filter_by = _build_filter(category, [], [], price_min, price_max, stock_only=True)
        hits = await _do_search(q, filter_by)

    if not hits:
        return "", []

    ids = [h["document"].get("id", "") for h in hits if h["document"].get("id")]
    lines = []
    for h in hits:
        d = h["document"]
        name = d.get("name", "")
        price = d.get("price", 0)
        stock = d.get("stock", 0)
        sizes_avail = ", ".join(d.get("sizes", [])) or "one size"
        colors_avail = ", ".join(d.get("colors", [])) or ""
        desc = d.get("description", "")
        stock_label = f"in stock: {stock}" if stock > 0 else "OUT OF STOCK"
        color_part = f" | colors: {colors_avail}" if colors_avail else ""
        lines.append(f"- {name} €{price:.2f} | sizes: {sizes_avail}{color_part} | {stock_label} | {desc}")

    return "Matching products from the shop:\n" + "\n".join(lines), ids


async def _search_faq_raw(query: str) -> str:
    """Search FAQ/knowledge base in Typesense."""
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
                if not texts:
                    return ""
                return "\n".join(f"{i+1}. {t}" for i, t in enumerate(texts))
    except Exception as e:
        logger.error(f"Typesense FAQ search error: {e}")
        return ""


# ── Agent ──────────────────────────────────────────────────────────────────────

class SalesManagerAgent(Agent):
    def __init__(self, session_log: SessionLogger, room, categories: list[str]):
        cats_exact = ", ".join(categories) if categories else "hoodies, tshirts, jackets, sweatshirts, accessories, bottoms"
        cats_list = ", ".join(categories[:-1]) + (f", and {categories[-1]}" if len(categories) > 1 else categories[0]) if categories else "hoodies, jackets, accessories"
        instructions = SYSTEM_BASE_TEMPLATE.format(
            categories_list=cats_list,
            categories_exact=cats_exact,
        )
        super().__init__(
            instructions=instructions,
            llm=lk_openai.LLM(model="gpt-4o-mini", api_key=OPENAI_API_KEY),
            stt=deepgram.STT(model="nova-2-general", api_key=DEEPGRAM_API_KEY, endpointing_ms=500),
            tts=lk_openai.TTS(
                model="tts-1",
                voice="am_puck",
                base_url="http://kokoro-tts:8880/v1",
                api_key="not-needed",
            ),
            tools=[
                EndCallTool(
                    end_instructions="Say a short friendly farewell, like: Bye! Come back anytime! No cat sounds.",
                    delete_room=True,
                ),
            ],
        )
        self.session_log = session_log
        self._room = room

    @llm.function_tool
    async def search_products(
        self,
        category: Annotated[str, "Product category. Use exact values from AVAILABLE CATEGORIES. Empty string = all categories."],
        colors: Annotated[list[str], "Colors to filter by, e.g. ['black', 'navy']. Empty list = any color."],
        sizes: Annotated[list[str], "Sizes to filter by, e.g. ['L', 'XL']. Empty list = any size."],
        price_max: Annotated[float, "Maximum price in EUR. Use -1 if no price limit was mentioned."],
        keywords: Annotated[str, "Free-text keywords for style/material/name, e.g. 'zip-front', 'cotton', 'track'. Empty string if no specific style."],
    ) -> str:
        """Search the shop catalogue for products. Call this whenever the user asks about items, availability, prices, sizes, or colors."""
        price_max_val = price_max if price_max > 0 else None  # -1 or 0 = no limit
        logger.info(f"search_products: category={repr(category)} colors={colors} sizes={sizes} price_max={price_max_val} keywords={repr(keywords)}")
        context, ids = await _search_products_raw(
            q=keywords,
            category=category,
            colors=colors,
            sizes=sizes,
            price_min=None,
            price_max=price_max_val,
        )
        logger.info(f"search_products result: {len(ids)} products, ids={ids}")

        # Highlight matching cards on the frontend
        try:
            await self._room.local_participant.set_attributes(
                {"highlighted_ids": ",".join(ids)}
            )
        except Exception as e:
            logger.warning(f"set_attributes failed: {e}")

        if not context:
            return "No products found for that query."
        return context

    @llm.function_tool
    async def search_faq(
        self,
        query: Annotated[str, "Question about shop policies, shipping, returns, payment, or general info"],
    ) -> str:
        """Search shop FAQ and policies. Call this for questions about shipping, returns, payment, sizing guides, or anything not about specific products."""
        logger.info(f"search_faq called with query: {repr(query)}")
        result = await _search_faq_raw(query)
        logger.info(f"search_faq result: {'found' if result else 'empty'}")
        return result or "No relevant information found."

    async def on_user_turn_completed(self, turn_ctx, new_message):
        user_text = new_message.text_content or ""
        logger.info(f"User said: {repr(user_text)}")
        self.session_log.on_user_text(user_text)
        await super().on_user_turn_completed(turn_ctx, new_message)


async def entrypoint(ctx: JobContext):
    session_log = SessionLogger()

    async def send_report():
        logger.info("Sales manager session ended, sending report...")
        await session_log.send_email()

    ctx.add_shutdown_callback(send_report)
    await ctx.connect()
    logger.info("Sales manager agent connected to LiveKit room")

    categories = await _fetch_categories()
    logger.info(f"Loaded categories from Typesense: {categories}")
    agent = SalesManagerAgent(session_log, ctx.room, categories=categories)
    session = AgentSession(
        vad=silero.VAD.load(),
        turn_detection=EnglishModel(),
        min_endpointing_delay=0.5,
        max_endpointing_delay=4.0,
    )

    @session.on("metrics_collected")
    def on_metrics(ev):
        m = ev.metrics
        if m.type == "eou_metrics" and m.transcription_delay > 0:
            session_log.on_eou_metrics(m.transcription_delay)
        elif m.type == "llm_metrics":
            session_log.on_llm_metrics(m.duration)
        elif m.type == "tts_metrics":
            session_log.on_tts_metrics(m.ttfb)

    @session.on("conversation_item_added")
    def on_item_added(event):
        item = getattr(event, "item", None)
        if item and getattr(item, "role", "") == "assistant":
            content = getattr(item, "text_content", "") or ""
            if content:
                session_log.on_agent_text(content)

    await session.start(room=ctx.room, agent=agent)

    await session.generate_reply(
        instructions="Greet the visitor as Pixel, the shop's AI kitten assistant. Be warm and playful. Ask what they're looking for today. No cat sounds."
    )


if __name__ == "__main__":
    cli.run_app(WorkerOptions(
        entrypoint_fnc=entrypoint,
        agent_name="aimediaflow-salesmanager"
    ))
