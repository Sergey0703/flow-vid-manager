import asyncio
import logging
import os
from typing import Annotated

import aiohttp
from dotenv import load_dotenv

load_dotenv()

from livekit import api as lk_api
from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    WorkerOptions,
    cli,
    llm,
)
from livekit.plugins import openai as lk_openai, silero
from livekit.plugins import groq as lk_groq
from livekit.plugins.turn_detector.english import EnglishModel
from session_logger import SessionLogger

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("aimediaflow-salesmanager")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
TYPESENSE_HOST = os.getenv("TYPESENSE_HOST", "typesense")
TYPESENSE_PORT = os.getenv("TYPESENSE_PORT", "8108")
TYPESENSE_API_KEY = os.getenv("TYPESENSE_API_KEY", "typesense-local-key-2025")
LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")

TYPESENSE_BASE = f"http://{TYPESENSE_HOST}:{TYPESENSE_PORT}"

if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY is required")

FAREWELL_WORDS = {"bye", "goodbye", "that's all", "that is all", "thanks bye", "thank you bye", "see you", "talk later", "have a good", "have a great", "cheers"}

USER_AWAY_TIMEOUT = 40
SILENCE_END_DELAY = 25


async def delete_room(room_name: str):
    if not LIVEKIT_URL or not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET:
        logger.warning("LiveKit credentials not set, cannot delete room")
        return
    try:
        async with lk_api.LiveKitAPI(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET) as lkapi:
            await lkapi.room.delete_room(lk_api.DeleteRoomRequest(room=room_name))
            logger.info(f"Room {room_name} deleted")
    except Exception as e:
        logger.error(f"Failed to delete room: {e}")

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

PRODUCT RULES — CRITICAL, NO EXCEPTIONS:
- IMMEDIATELY call search_products the moment a user mentions ANY item, category, or style
- Do NOT ask clarifying questions first — search first, then respond based on results
- Do NOT say "let me check" or "I can check" — just call search_products silently and respond with results
- Only mention products returned by search_products
- Always mention name and price when recommending a product
- If a product is out of stock (stock = 0), say it is currently out of stock and suggest an alternative
- If sizes or colors are available, mention them naturally
- Never invent products, prices, or stock levels

SHOWING PRODUCT DETAIL:
- Call expand_product when the user says: "show me that", "open it", "tell me more", "show the card", "show details", "select it", "that one", or picks a specific product from a list
- Use the product_id from the most recent search_products result
- If multiple products were found and user picks one by name or number, expand that specific one

AVAILABLE CATEGORIES (exact values for search_products category parameter):
{categories_exact}

ENDING THE CALL:
When the user says goodbye, bye, thanks bye, that is all, or clearly indicates they are done,
say a short warm farewell like "Bye! Come back anytime!" and nothing else."""


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
        pid = d.get("id", "")
        lines.append(f"- [id:{pid}] {name} €{price:.2f} | sizes: {sizes_avail}{color_part} | {stock_label} | {desc}")

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
    def __init__(self, session_log: SessionLogger, room, ctx: JobContext, categories: list[str]):
        cats_exact = ", ".join(categories) if categories else "hoodies, tshirts, jackets, sweatshirts, accessories, bottoms"
        cats_list = ", ".join(categories[:-1]) + (f", and {categories[-1]}" if len(categories) > 1 else categories[0]) if categories else "hoodies, jackets, accessories"
        instructions = SYSTEM_BASE_TEMPLATE.format(
            categories_list=cats_list,
            categories_exact=cats_exact,
        )
        super().__init__(
            instructions=instructions,
            llm=lk_groq.LLM(model="meta-llama/llama-4-scout-17b-16e-instruct", api_key=GROQ_API_KEY),
            stt=lk_openai.STT(
                model="parakeet-tdt-0.6b-v3",
                base_url="http://parakeet-stt:5092/v1",
                api_key="not-needed",
            ),
            tts=lk_openai.TTS(
                model="tts-1",
                voice="default",
                response_format="pcm",
                base_url="http://piper-wrapper-ryan:8881/v1",
                api_key="not-needed",
            ),
            tools=[],
        )
        self.session_log = session_log
        self._room = room
        self._ctx = ctx
        self._ending = False

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

        # Send product IDs to frontend:
        # recommended_ids → sort matching cards to top (ordered)
        # expanded_id     → auto-expand card when only one result
        try:
            attrs: dict[str, str] = {"recommended_ids": ",".join(ids)}
            attrs["expanded_id"] = ids[0] if len(ids) == 1 else ""
            await self._room.local_participant.set_attributes(attrs)
        except Exception as e:
            logger.warning(f"set_attributes failed: {e}")

        if not context:
            return "No products found for that query."
        return context

    @llm.function_tool
    async def expand_product(
        self,
        product_id: Annotated[str, "The product ID to expand. Use the id shown as [id:XXX] in the search_products result, e.g. 'p011'. Never use the product name."],
    ) -> str:
        """Show a single product card in full detail on the page. Call this when the user says 'show me that one', 'open it', 'tell me more about it', 'show me the card', or picks a specific product from a list."""
        logger.info(f"expand_product: product_id={repr(product_id)}")
        try:
            await self._room.local_participant.set_attributes({
                "expanded_id": product_id,
                "recommended_ids": product_id,
            })
            return f"Product {product_id} is now shown in detail on the page."
        except Exception as e:
            logger.warning(f"expand_product set_attributes failed: {e}")
            return "Could not expand product."

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

        lower = user_text.lower().strip().rstrip(".,!")
        is_farewell = any(w in lower for w in FAREWELL_WORDS)

        await super().on_user_turn_completed(turn_ctx, new_message)

        if is_farewell and not self._ending:
            self._ending = True
            logger.info(f"Farewell detected: {repr(lower)} — scheduling room deletion")
            room_name = self._ctx.room.name
            async def delayed_delete():
                await asyncio.sleep(4)
                await delete_room(room_name)
            asyncio.ensure_future(delayed_delete())


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
    agent = SalesManagerAgent(session_log, ctx.room, ctx, categories=categories)
    session = AgentSession(
        vad=silero.VAD.load(),
        turn_detection=EnglishModel(),
        min_endpointing_delay=0.5,
        max_endpointing_delay=4.0,
        user_away_timeout=USER_AWAY_TIMEOUT,
    )

    inactivity_task: asyncio.Task | None = None

    async def inactivity_check():
        logger.info("Inactivity check: user away — asking if they need more help")
        await session.say("Still there? Any other questions, or shall I let you browse?", allow_interruptions=True)
        try:
            await asyncio.sleep(SILENCE_END_DELAY)
        except asyncio.CancelledError:
            return
        if agent._ending:
            return
        logger.info("Inactivity check: no response — ending session")
        agent._ending = True
        await session.say("Come back anytime! Bye!", allow_interruptions=False)
        await asyncio.sleep(4)
        await delete_room(ctx.room.name)

    @session.on("user_state_changed")
    def on_user_state_changed(ev):
        nonlocal inactivity_task
        if ev.new_state == "away":
            if not agent._ending:
                logger.info("user_state_changed → away: starting inactivity check")
                inactivity_task = asyncio.create_task(inactivity_check())
        else:
            if inactivity_task is not None and not inactivity_task.done():
                logger.info(f"user_state_changed → {ev.new_state}: cancelling inactivity check")
                inactivity_task.cancel()
                inactivity_task = None

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
