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
from livekit.plugins.turn_detector.english import EnglishModel
from session_logger import SessionLogger

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("aimediaflow-salesmanager")

TYPESENSE_HOST = os.getenv("TYPESENSE_HOST", "typesense")
TYPESENSE_PORT = os.getenv("TYPESENSE_PORT", "8108")
TYPESENSE_API_KEY = os.getenv("TYPESENSE_API_KEY", "typesense-local-key-2025")
LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")

TYPESENSE_BASE = f"http://{TYPESENSE_HOST}:{TYPESENSE_PORT}"
CART_API_BASE = os.getenv("CART_API_BASE", "http://cart-api:8000")

FAREWELL_WORDS = {"bye", "goodbye", "that's all", "that is all", "thanks bye", "thank you bye", "see you", "talk later", "have a good", "have a great", "cheers"}

USER_AWAY_TIMEOUT = 40
SILENCE_END_DELAY = 25
SESSION_TTL = 3 * 60          # must match ttl in api/livekit-token.ts
SESSION_EXPIRY_WARNING = 20   # seconds before end to warn user


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
6. The speech-to-text may transcribe non-English speakers phonetically. Always interpret the input as English intent. Examples: "ад ту карт" = "add to cart", "шоу ми" = "show me", "клоуз ит" = "close it", "бай" = "bye". Use context to infer the command.

PRODUCT RULES — CRITICAL, NO EXCEPTIONS:
- IMMEDIATELY call search_products the moment a user mentions ANY item, category, or style
- Do NOT ask clarifying questions first — search first, then respond based on results
- Do NOT say "let me check" or "I can check" — just call search_products silently and respond with results
- Only mention products returned by search_products
- Do NOT call search_products when the user says navigation words like "back", "go back", "return", "cancel", "never mind", "exit" — these are UI commands, not product searches
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
{categories_exact}

SHOPPING CART:
- add_to_cart(product_id, qty, size): when user says "add to cart", "I'll take it", "buy this", "add one", "get it"
- remove_from_cart(product_id): when user says "remove", "take it out", "I changed my mind", "don't want it"
- read_cart(): ONLY when user asks about cart CONTENTS without wanting to see it: "what's in my cart?", "what's my total?", "how many items?"
- show_hide_cart(state): state='open' when user says "show my cart", "open cart", "open my cart", "show me my cart" — then also call read_cart(); state='close' when user says "close cart", "hide cart", "close my cart", "close the cart"
IMPORTANT: "show me my cart" = show_hide_cart(state='open') + read_cart(). Never use read_cart() alone for these phrases.
Always confirm additions aloud: "Added! You now have X items in your cart."

SIZE RULE: If a product has sizes listed in the search result (e.g. "sizes: S, M, L, XL"), ALWAYS ask the customer what size they want BEFORE calling add_to_cart. Do NOT ask for size if the product has no sizes (accessories: cap, beanie, bag, scarf). Once the customer tells you the size, call add_to_cart immediately with that size.

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
            llm=lk_openai.LLM(model="gpt-4o-mini"),
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
        self._visitor_id: str | None = None  # cached from participant attributes

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
            attrs["cart_ui"] = "closed"
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
                "cart_ui": "closed",
            })
            return f"Product {product_id} is now shown in detail on the page."
        except Exception as e:
            logger.warning(f"expand_product set_attributes failed: {e}")
            return "Could not expand product."

    @llm.function_tool
    async def close_product(
        self,
        confirm: Annotated[str, "Always pass empty string."] = "",
    ) -> str:
        """Close the currently open product card. Call this when the user says 'close it', 'close the card', 'close that', 'go back', 'never mind', or any variation meaning they want to stop viewing a product detail. Do NOT call this for cart — use show_hide_cart(state='close') when the user says 'close the cart', 'close my cart', 'hide the cart'."""
        logger.info("close_product called")
        try:
            await self._room.local_participant.set_attributes({"expanded_id": ""})
            return "Product card closed."
        except Exception as e:
            logger.warning(f"close_product set_attributes failed: {e}")
            return "Could not close product card."

    @llm.function_tool
    async def show_hide_cart(
        self,
        state: Annotated[str, "Pass 'open' to show the cart panel, 'close' to hide it"],
    ) -> str:
        """Show or hide the shopping cart panel on screen. Call with state='open' when user says 'show my cart', 'open cart', 'open my cart', 'show me my cart'. Call with state='close' when user says 'close cart', 'hide cart', 'close my cart', 'close the cart'. After opening, also call read_cart()."""
        logger.info(f"show_hide_cart: state={state}")
        ui_val = "open" if state == "open" else "closed"
        try:
            await self._room.local_participant.set_attributes({"cart_ui": ui_val})
            return f"Cart panel {state}ed."
        except Exception as e:
            logger.warning(f"show_hide_cart set_attributes failed: {e}")
            return "Could not update cart panel."

    def _get_visitor_id(self) -> str | None:
        """Return cached visitor_id, or scan remote participants to find it."""
        if self._visitor_id:
            return self._visitor_id
        for p in self._room.remote_participants.values():
            all_attrs = dict(p.attributes)
            logger.info(f"_get_visitor_id: scanning participant={p.identity} attrs={list(all_attrs.keys())}")
            vid = all_attrs.get("visitor_id", "")
            if vid:
                self._visitor_id = vid
                logger.info(f"_get_visitor_id: found visitor_id={vid}")
                return vid
        logger.warning("_get_visitor_id: no visitor_id found in any participant")
        return None

    def update_visitor_id(self, attrs: dict) -> None:
        """Called by entrypoint on ParticipantAttributesChanged to cache visitor_id early."""
        vid = attrs.get("visitor_id", "")
        if vid and not self._visitor_id:
            self._visitor_id = vid
            logger.info(f"update_visitor_id: cached visitor_id={vid}")

    async def _get_visitor_cart(self, force_api: bool = False) -> list[dict]:
        """Dual-path cart read.
        Default: cart_json LiveKit attribute (set by frontend syncCart — instant).
        force_api=True: always read from Cart API (used after remove, so we bypass stale cart_json).
        Fallback to Cart API when cart_json is empty (reconnect scenario).
        """
        import json
        if not force_api:
            # Fast path: read from LiveKit attribute
            try:
                for p in self._room.remote_participants.values():
                    cart_json = p.attributes.get("cart_json", "")
                    if cart_json:
                        return json.loads(cart_json)
            except Exception:
                pass
        # Cart API path (authoritative, used after mutations or reconnect)
        visitor_id = self._get_visitor_id()
        if visitor_id:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(f"{CART_API_BASE}/cart/{visitor_id}", timeout=aiohttp.ClientTimeout(total=3)) as res:
                        if res.status == 200:
                            data = await res.json()
                            return data.get("items", [])
            except Exception as e:
                logger.warning(f"_get_visitor_cart Cart API failed: {e}")
        return []

    @llm.function_tool
    async def add_to_cart(
        self,
        product_id: Annotated[str, "Product ID to add, e.g. 'p002'. Use the id from the most recent search result."],
        qty: Annotated[str, "Quantity to add. Default is 1."] = "1",
        size: Annotated[str, "Size to add, e.g. 'M', 'L', 'XL'. Leave empty for accessories (one size fits all)."] = "",
    ) -> str:
        """Add a product to the customer's shopping cart. Call when user says 'add to cart', 'I'll take it', 'buy this', or similar. If the product has sizes, ask the customer what size they want BEFORE calling this tool."""
        import json
        qty_int = int(qty) if str(qty).isdigit() else 1
        logger.info(f"add_to_cart: product_id={repr(product_id)} qty={qty_int} size={repr(size)}")
        # Signal frontend via LiveKit attribute; also close product card and cart panel
        action_payload = json.dumps({"action": "add", "id": product_id, "qty": qty_int, "size": size})
        try:
            await self._room.local_participant.set_attributes({
                "cart_action": action_payload,
                "expanded_id": "",
                "cart_ui": "closed",
            })
        except Exception as e:
            logger.warning(f"add_to_cart set_attributes failed: {e}")
        # Persist to Cart API so cart survives reconnects
        visitor_id = self._get_visitor_id()
        if visitor_id:
            # Look up product name/price from catalog for server-side storage
            product_info = {"id": product_id, "name": product_id, "price": 0.0, "qty": qty_int}
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(
                        f"http://{TYPESENSE_HOST}:{TYPESENSE_PORT}/collections/products/documents/search",
                        headers={"X-TYPESENSE-API-KEY": TYPESENSE_API_KEY},
                        params={"q": "*", "query_by": "name", "filter_by": f"id:={product_id}", "per_page": 1},
                        timeout=aiohttp.ClientTimeout(total=3),
                    ) as res:
                        if res.status == 200:
                            data = await res.json()
                            hits = data.get("hits", [])
                            if hits:
                                d = hits[0]["document"]
                                product_info = {"id": product_id, "name": d.get("name", product_id), "price": float(d.get("price", 0)), "qty": qty_int, "size": size}
            except Exception as e:
                logger.warning(f"add_to_cart: product lookup failed: {e}")
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        f"{CART_API_BASE}/cart/{visitor_id}/add",
                        json=product_info,
                        timeout=aiohttp.ClientTimeout(total=3),
                    ) as res:
                        logger.info(f"add_to_cart Cart API: {res.status}")
            except Exception as e:
                logger.warning(f"add_to_cart Cart API failed: {e}")
        logger.info(f"add_to_cart: signalled frontend and Cart API for product_id={product_id}")
        await asyncio.sleep(0.3)  # let Cart API commit before reading back
        cart = await self._get_visitor_cart(force_api=True)
        if not cart:
            return f"Added to cart."
        lines = []
        total = 0.0
        total_qty = 0
        for item in cart:
            name = item.get("name", item.get("id", "item"))
            item_id = item.get("id", "")
            price = float(item.get("price", 0))
            qty = int(item.get("qty", 1))
            size_val = item.get("size", "")
            total += price * qty
            total_qty += qty
            size_part = f", size:{size_val}" if size_val else ""
            lines.append(f"{name} (id:{item_id}{size_part}) x{qty} (€{price * qty:.2f})")
        items_str = ", ".join(lines)
        return f"Added. Cart has {total_qty} item(s): {items_str}. Total: €{total:.2f}. Use the id: value when calling remove_from_cart."

    @llm.function_tool
    async def update_cart_qty(
        self,
        product_id: Annotated[str, "Product ID to update, e.g. 'p002'. Use the id from read_cart or add_to_cart response."],
        qty: Annotated[str, "New quantity. Must be 1 or more. To remove the item entirely use remove_from_cart instead."],
    ) -> str:
        """Change the quantity of a product already in the cart. Call when user says 'change qty', 'set quantity to', 'I want 2 of those', 'make it 3'."""
        import json
        qty_int = max(1, int(qty) if str(qty).isdigit() else 1)
        logger.info(f"update_cart_qty: product_id={repr(product_id)} qty={qty_int}")
        action_payload = json.dumps({"action": "update", "id": product_id, "qty": qty_int})
        try:
            await self._room.local_participant.set_attributes({"cart_action": action_payload})
        except Exception as e:
            logger.warning(f"update_cart_qty set_attributes failed: {e}")
        visitor_id = self._get_visitor_id()
        if visitor_id:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        f"{CART_API_BASE}/cart/{visitor_id}/update",
                        json={"id": product_id, "qty": qty_int},
                        timeout=aiohttp.ClientTimeout(total=3),
                    ) as res:
                        logger.info(f"update_cart_qty Cart API: {res.status}")
            except Exception as e:
                logger.warning(f"update_cart_qty Cart API failed: {e}")
        cart = await self._get_visitor_cart(force_api=True)
        if not cart:
            return "Cart is now empty."
        lines = []
        total = 0.0
        for item in cart:
            name = item.get("name", item.get("id", "item"))
            item_id = item.get("id", "")
            price = float(item.get("price", 0))
            q = int(item.get("qty", 1))
            total += price * q
            lines.append(f"{name} (id:{item_id}) x{q} (€{price * q:.2f})")
        return f"Updated. Cart now: {', '.join(lines)}. Total: €{total:.2f}."

    @llm.function_tool
    async def remove_from_cart(
        self,
        product_id: Annotated[str, "Product ID to remove from the cart, e.g. 'p002'."],
    ) -> str:
        """Remove a product from the customer's shopping cart. Call when user says 'remove', 'take it out', 'I changed my mind'."""
        import json
        logger.info(f"remove_from_cart: product_id={repr(product_id)}")
        action_payload = json.dumps({"action": "remove", "id": product_id})
        try:
            await self._room.local_participant.set_attributes({"cart_action": action_payload})
        except Exception as e:
            logger.warning(f"remove_from_cart set_attributes failed: {e}")
        # Persist removal to Cart API
        visitor_id = self._get_visitor_id()
        if visitor_id:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        f"{CART_API_BASE}/cart/{visitor_id}/remove",
                        json={"id": product_id},
                        timeout=aiohttp.ClientTimeout(total=3),
                    ) as res:
                        logger.info(f"remove_from_cart Cart API: {res.status}")
            except Exception as e:
                logger.warning(f"remove_from_cart Cart API failed: {e}")
        # Use force_api=True to bypass stale cart_json LiveKit attribute
        cart = await self._get_visitor_cart(force_api=True)
        if not cart:
            return "Removed. Cart is now empty."
        lines = []
        total = 0.0
        for item in cart:
            name = item.get("name", item.get("id", "item"))
            item_id = item.get("id", "")
            price = float(item.get("price", 0))
            qty = int(item.get("qty", 1))
            size_val = item.get("size", "")
            total += price * qty
            size_part = f", size:{size_val}" if size_val else ""
            lines.append(f"{name} (id:{item_id}{size_part}) x{qty} (€{price * qty:.2f})")
        items_str = ", ".join(lines)
        return f"Removed. Cart now: {items_str}. Total: €{total:.2f}. Use the id: value when calling remove_from_cart."

    @llm.function_tool
    async def read_cart(
        self,
        confirm: Annotated[str, "Always pass empty string."] = "",
    ) -> str:
        """Read cart contents aloud. Use for: 'what's in my cart?', 'what's my total?', 'how many items?'. Do NOT use for 'show my cart' or 'open cart' — those require open_cart() instead."""
        logger.info("read_cart called")
        cart = await self._get_visitor_cart()
        logger.info(f"read_cart: visitor cart_json = {cart}")
        if not cart:
            return "The cart is empty."
        lines = []
        total = 0.0
        for item in cart:
            name = item.get("name", item.get("id", "item"))
            item_id = item.get("id", "")
            price = float(item.get("price", 0))
            qty = int(item.get("qty", 1))
            size_val = item.get("size", "")
            subtotal = price * qty
            total += subtotal
            size_part = f", size:{size_val}" if size_val else ""
            lines.append(f"{name} (id:{item_id}{size_part}) x{qty} (€{subtotal:.2f})")
        items_str = ", ".join(lines)
        return f"Cart: {items_str}. Total: €{total:.2f}. Use the id: value when calling remove_from_cart."

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
            logger.info(f"Farewell detected: {repr(lower)} — scheduling session end")
            room_name = self._ctx.room.name
            async def delayed_end():
                await asyncio.sleep(4)
                # Signal frontend to close the widget cleanly
                try:
                    await self._room.local_participant.set_attributes({"session_ended": "1"})
                except Exception:
                    pass
                await asyncio.sleep(1)
                await delete_room(room_name)
            asyncio.ensure_future(delayed_end())


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

    # Cache visitor_id whenever participant attributes change
    @ctx.room.on("participant_attributes_changed")
    def on_attrs_changed(changed_attrs: dict, participant):
        logger.info(f"participant_attributes_changed: participant={participant.identity} changed={list(changed_attrs.keys())}")
        agent.update_visitor_id(changed_attrs)

    # Also scan on participant_connected (attributes may already be set)
    @ctx.room.on("participant_connected")
    def on_participant_connected(participant):
        logger.info(f"participant_connected: identity={participant.identity} attrs={dict(participant.attributes)}")
        agent.update_visitor_id(dict(participant.attributes))

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

    async def session_expiry_warning():
        try:
            await asyncio.sleep(SESSION_TTL - SESSION_EXPIRY_WARNING)
        except asyncio.CancelledError:
            return
        if agent._ending:
            return
        logger.info("Session expiry warning: 20 seconds remaining")
        agent._ending = True
        await session.say(
            "Just a heads-up — our session is about to end in 20 seconds. "
            "Don't worry, your cart will be saved and you can start a new chat anytime to continue shopping!",
            allow_interruptions=False,
        )

    asyncio.ensure_future(session_expiry_warning())


if __name__ == "__main__":
    cli.run_app(WorkerOptions(
        entrypoint_fnc=entrypoint,
        agent_name="aimediaflow-salesmanager"
    ))
