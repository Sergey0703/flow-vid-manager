import asyncio
import logging
import os
import time

import aiohttp
from dotenv import load_dotenv
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application, CommandHandler, MessageHandler,
    CallbackQueryHandler, filters, ContextTypes, ConversationHandler,
)

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("tg-photo-bot")

TELEGRAM_TOKEN = os.environ["TELEGRAM_TOKEN"]
KIE_API_KEY    = os.environ["KIE_API_KEY"]

KIE_UPLOAD_URL = "https://kieai.redpandaai.co/api/file-stream-upload"
KIE_CREATE_URL = "https://api.kie.ai/api/v1/gpt4o-image/generate"
KIE_STATUS_URL = "https://api.kie.ai/api/v1/gpt4o-image/record-info"

TYPESENSE_BASE    = "http://typesense:8108"
TYPESENSE_API_KEY = "typesense-local-key-2025"

CATEGORIES = ["tshirts", "hoodies", "jackets", "bottoms", "accessories"]

POLL_INTERVAL = 5
POLL_TIMEOUT  = 120

# Conversation states
WAITING_CUSTOM_PROMPT = 1
WAITING_PRICE         = 2
WAITING_QTY           = 3
WAITING_NAME          = 4

STYLES = {
    "ghost": {
        "label": "👻 Ghost Mannequin",
        "prompt": (
            "Ghost mannequin product photo of this garment. Dark cinematic background with subtle "
            "neon city lights bokeh. The garment is perfectly shaped, smoothed out, floating slightly "
            "above ground with a soft neon outline glow. Professional fashion editorial style, "
            "high-end streetwear brand shoot."
        ),
    },
    "studio": {
        "label": "⬜ Studio White",
        "prompt": (
            "Professional e-commerce product photo of this garment. Clean pure white background, "
            "item neatly displayed on invisible mannequin or flat lay, sharp focus, soft studio "
            "lighting with subtle shadows. High-end fashion retail style."
        ),
    },
    "street": {
        "label": "🌆 Street",
        "prompt": (
            "Urban street fashion editorial photo of this garment displayed on a ghost mannequin. "
            "Gritty city background — brick walls, graffiti, wet pavement reflections. "
            "Moody evening light, cinematic color grading. High-end streetwear lookbook style."
        ),
    },
    "outdoor": {
        "label": "🌿 Outdoor",
        "prompt": (
            "Outdoor lifestyle product photo of this garment on a ghost mannequin. "
            "Natural daylight, soft green bokeh background — park, forest or garden setting. "
            "Fresh, clean, bright aesthetic. Premium casual fashion brand style."
        ),
    },
    "custom": {
        "label": "✏️ Custom prompt",
        "prompt": None,
    },
}

SIZES  = ["XS", "S", "M", "L", "XL", "XXL"]
COLORS = ["⚫ Black", "⚪ White", "🩶 Grey", "🔵 Navy", "🔴 Red", "🟢 Green", "💙 Blue", "🟤 Beige"]
QTY_OPTIONS = ["1", "2", "3", "5", "10", "20", "50", "100"]

COLOR_MAP = {
    "⚫ Black": "Black", "⚪ White": "White", "🩶 Grey": "Grey",
    "🔵 Navy": "Navy",  "🔴 Red": "Red",    "🟢 Green": "Green",
    "💙 Blue": "Blue",  "🟤 Beige": "Beige",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def style_keyboard():
    return InlineKeyboardMarkup([
        [InlineKeyboardButton(STYLES["ghost"]["label"],  callback_data="style:ghost")],
        [InlineKeyboardButton(STYLES["studio"]["label"], callback_data="style:studio")],
        [InlineKeyboardButton(STYLES["street"]["label"], callback_data="style:street")],
        [InlineKeyboardButton(STYLES["outdoor"]["label"],callback_data="style:outdoor")],
        [InlineKeyboardButton(STYLES["custom"]["label"], callback_data="style:custom")],
    ])


def result_keyboard():
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton("🔄 Regenerate",    callback_data="action:regen"),
            InlineKeyboardButton("🛒 Send to Shop",  callback_data="action:shop"),
        ]
    ])


def sizes_keyboard(selected: set):
    row = []
    for s in SIZES:
        label = f"✅ {s}" if s in selected else s
        row.append(InlineKeyboardButton(label, callback_data=f"size:{s}"))
    return InlineKeyboardMarkup([
        row,
        [InlineKeyboardButton("✅ Done", callback_data="size:done")],
    ])


def colors_keyboard(selected: set):
    rows = []
    row = []
    for i, c in enumerate(COLORS):
        label = f"✅ {c}" if c in selected else c
        row.append(InlineKeyboardButton(label, callback_data=f"color:{c}"))
        if len(row) == 2:
            rows.append(row)
            row = []
    if row:
        rows.append(row)
    rows.append([InlineKeyboardButton("✅ Done", callback_data="color:done")])
    return InlineKeyboardMarkup(rows)


def qty_keyboard():
    rows = []
    row = []
    for i, q in enumerate(QTY_OPTIONS):
        row.append(InlineKeyboardButton(q, callback_data=f"qty:{q}"))
        if len(row) == 4:
            rows.append(row)
            row = []
    if row:
        rows.append(row)
    return InlineKeyboardMarkup(rows)


CATEGORY_LABELS = {
    "tshirts":     "👕 T-Shirts",
    "hoodies":     "🧥 Hoodies",
    "sweatshirts": "👕 Sweatshirts",
    "jackets":     "🧣 Jackets",
    "bottoms":     "👖 Bottoms",
    "accessories": "🧢 Accessories",
}


def category_keyboard():
    rows = []
    for key, label in CATEGORY_LABELS.items():
        rows.append([InlineKeyboardButton(label, callback_data=f"category:{key}")])
    return InlineKeyboardMarkup(rows)


# ── Handlers ──────────────────────────────────────────────────────────────────

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "Send me a photo of a clothing item and I'll create a professional product photo."
    )


async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    msg = update.message
    photo = msg.photo[-1]
    tg_file = await context.bot.get_file(photo.file_id)
    photo_bytes = await tg_file.download_as_bytearray()
    context.user_data["photo_bytes"] = bytes(photo_bytes)
    context.user_data["waiting_custom"] = False
    await msg.reply_text("Choose a style:", reply_markup=style_keyboard())


async def handle_style_choice(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    style_key = query.data.split(":")[1]

    if style_key == "custom":
        context.user_data["waiting_custom"] = True
        await query.edit_message_text("Enter your prompt describing the scene:")
        return WAITING_CUSTOM_PROMPT

    photo_bytes = context.user_data.get("photo_bytes")
    if not photo_bytes:
        await query.edit_message_text("Photo not found. Please send it again.")
        return ConversationHandler.END

    prompt = STYLES[style_key]["prompt"]
    await query.edit_message_text(f"{STYLES[style_key]['label']} — generating... (~30 sec)")
    await generate_and_send(query.message, context, photo_bytes, prompt)
    return ConversationHandler.END


async def handle_custom_prompt(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.user_data.get("waiting_custom"):
        return ConversationHandler.END
    photo_bytes = context.user_data.get("photo_bytes")
    if not photo_bytes:
        await update.message.reply_text("Photo not found. Please send it again.")
        return ConversationHandler.END
    prompt = update.message.text.strip()
    context.user_data["waiting_custom"] = False
    await update.message.reply_text("Generating... (~30 sec)")
    await generate_and_send(update.message, context, photo_bytes, prompt)
    return ConversationHandler.END


async def handle_action(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    action = query.data.split(":")[1]

    if action == "regen":
        photo_bytes = context.user_data.get("photo_bytes")
        if not photo_bytes:
            await query.message.reply_text("Photo not found. Please send a new photo.")
            return
        await query.message.reply_text("Choose a style:", reply_markup=style_keyboard())

    elif action == "shop":
        context.user_data["shop_sizes"]  = set()
        context.user_data["shop_colors"] = set()
        await query.message.reply_text(
            "Select sizes (tap to toggle, then Done):",
            reply_markup=sizes_keyboard(set()),
        )


async def handle_size_toggle(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    val = query.data.split(":")[1]

    if val == "done":
        sizes = context.user_data.get("shop_sizes", set())
        if not sizes:
            await query.answer("Please select at least one size.", show_alert=True)
            return
        await query.edit_message_text(
            "Select colors (tap to toggle, then Done):",
            reply_markup=colors_keyboard(set()),
        )
        return

    sizes = context.user_data.setdefault("shop_sizes", set())
    if val in sizes:
        sizes.discard(val)
    else:
        sizes.add(val)
    await query.edit_message_reply_markup(reply_markup=sizes_keyboard(sizes))


async def handle_color_toggle(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    val = query.data.split(":", 1)[1]

    if val == "done":
        colors = context.user_data.get("shop_colors", set())
        if not colors:
            await query.answer("Please select at least one color.", show_alert=True)
            return
        await query.edit_message_text("Select category:", reply_markup=category_keyboard())
        return

    colors = context.user_data.setdefault("shop_colors", set())
    if val in colors:
        colors.discard(val)
    else:
        colors.add(val)
    await query.edit_message_reply_markup(reply_markup=colors_keyboard(colors))


async def handle_category(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    category = query.data.split(":")[1]
    context.user_data["shop_category"] = category
    await query.edit_message_text("Select quantity:", reply_markup=qty_keyboard())


async def handle_qty(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    qty = query.data.split(":")[1]
    context.user_data["shop_qty"] = qty
    await query.edit_message_text("Enter the product name:")
    return WAITING_NAME


async def handle_name(update: Update, context: ContextTypes.DEFAULT_TYPE):
    name = update.message.text.strip()
    context.user_data["shop_name"] = name
    await update.message.reply_text("Enter the price (e.g. 29.99):")
    return WAITING_PRICE


async def handle_price(update: Update, context: ContextTypes.DEFAULT_TYPE):
    price_text = update.message.text.strip().replace(",", ".")
    try:
        price = float(price_text)
    except ValueError:
        await update.message.reply_text("Invalid price. Please enter a number, e.g. 29.99")
        return WAITING_PRICE

    sizes    = context.user_data.get("shop_sizes", set())
    colors   = context.user_data.get("shop_colors", set())
    qty      = context.user_data.get("shop_qty", "?")
    name     = context.user_data.get("shop_name", "")
    category = context.user_data.get("shop_category", "tshirts")

    sizes_str  = ", ".join(sorted(sizes, key=lambda s: SIZES.index(s) if s in SIZES else 99))
    colors_list = sorted(colors, key=lambda c: COLORS.index(c) if c in COLORS else 99)
    colors_str  = ", ".join(COLOR_MAP.get(c, c) for c in colors_list)

    category_label = CATEGORY_LABELS.get(category, category)

    # Save for publish step
    context.user_data["shop_price"]      = price
    context.user_data["shop_sizes_str"]  = sizes_str
    context.user_data["shop_colors_str"] = colors_str
    context.user_data["shop_colors_raw"] = [COLOR_MAP.get(c, c).lower() for c in colors_list]

    summary = (
        f"✅ Ready to publish:\n\n"
        f"🏷 Name: {name}\n"
        f"📁 Category: {category_label}\n"
        f"📐 Sizes: {sizes_str}\n"
        f"🎨 Colors: {colors_str}\n"
        f"📦 Quantity: {qty}\n"
        f"💶 Price: €{price:.2f}\n"
        f"🖼 Photo: ready"
    )
    keyboard = InlineKeyboardMarkup([[
        InlineKeyboardButton("🚀 Send to Shop", callback_data="publish:send"),
        InlineKeyboardButton("↩️ Reset",        callback_data="publish:reset"),
    ]])
    await update.message.reply_text(summary, reply_markup=keyboard)
    return ConversationHandler.END


async def handle_publish(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    action = query.data.split(":")[1]

    if action == "reset":
        await query.message.reply_text(
            "Done! ✅",
        )
        # Show result buttons again
        result_url = context.user_data.get("last_result_url", "")
        await query.message.reply_photo(
            result_url,
            caption="Choose what to do next:",
            reply_markup=result_keyboard(),
        )
        return

    # action == "send"
    await query.edit_message_reply_markup(reply_markup=None)
    await query.message.reply_text("Publishing to shop...")

    sizes_str  = context.user_data.get("shop_sizes_str", "")
    colors_str = context.user_data.get("shop_colors_str", "")
    colors_raw = context.user_data.get("shop_colors_raw", [])
    qty        = int(context.user_data.get("shop_qty", 1))
    price      = context.user_data.get("shop_price", 0.0)
    result_url = context.user_data.get("last_result_url", "")
    name       = context.user_data.get("shop_name", "")
    category   = context.user_data.get("shop_category", "tshirts")
    sizes_list = [s.strip() for s in sizes_str.split(",") if s.strip()]

    # Generate next product ID
    async with aiohttp.ClientSession() as session:
        new_id = await get_next_product_id(session)
        if not new_id:
            await query.message.reply_text("Failed to get product ID. Try again.")
            return

        doc = {
            "id":          new_id,
            "name":        name or f"Item {new_id.upper()}",
            "description": "New arrival. Added via Telegram bot.",
            "category":    category,
            "price":       price,
            "currency":    "EUR",
            "sizes":       sizes_list,
            "colors":      colors_raw,
            "stock":       qty,
            "sku":         f"BOT-{new_id.upper()}",
            "created_at":  int(time.time()),
            "image_url":   result_url,
        }

        ok = await add_product_to_typesense(session, doc)

    if ok:
        await query.message.reply_text(
            f"✅ Published! Product *{doc['name']}* (ID: `{new_id}`) added to the shop.\n"
            f"Price: €{price:.2f} | Sizes: {sizes_str} | Colors: {colors_str} | Stock: {qty}",
            parse_mode="Markdown",
        )
        logger.info(f"Product added: {doc}")
    else:
        await query.message.reply_text("❌ Failed to add product to shop. Check logs.")


async def get_next_product_id(session: aiohttp.ClientSession) -> str | None:
    try:
        async with session.get(
            f"{TYPESENSE_BASE}/collections/products/documents/search",
            params={"q": "*", "per_page": 250},
            headers={"X-TYPESENSE-API-KEY": TYPESENSE_API_KEY},
        ) as resp:
            data = await resp.json()
            hits = data.get("hits", [])
            ids = []
            for h in hits:
                pid = h["document"].get("id", "")
                if pid.startswith("p"):
                    try:
                        ids.append(int(pid[1:]))
                    except ValueError:
                        pass
            next_num = max(ids) + 1 if ids else 1
            return f"p{next_num:03d}"
    except Exception as e:
        logger.error(f"get_next_product_id error: {e}")
        return None


async def add_product_to_typesense(session: aiohttp.ClientSession, doc: dict) -> bool:
    try:
        async with session.post(
            f"{TYPESENSE_BASE}/collections/products/documents",
            json=doc,
            headers={
                "X-TYPESENSE-API-KEY": TYPESENSE_API_KEY,
                "Content-Type": "application/json",
            },
        ) as resp:
            data = await resp.json()
            logger.info(f"Typesense add response: {data}")
            return "id" in data
    except Exception as e:
        logger.error(f"add_product_to_typesense error: {e}")
        return False


# ── Generation ────────────────────────────────────────────────────────────────

async def generate_and_send(msg, context, photo_bytes: bytes, prompt: str):
    async with aiohttp.ClientSession() as session:
        image_url = await upload_image(session, photo_bytes)
        if not image_url:
            await msg.reply_text("Failed to upload photo. Please try again.")
            return
        task_id = await create_task(session, image_url, prompt)
        if not task_id:
            await msg.reply_text("Failed to create task. Please try again.")
            return
        logger.info(f"Task created: {task_id}")
        result_url = await poll_result(session, task_id)
        if not result_url:
            await msg.reply_text("Generation timed out. Please try again.")
            return

    context.user_data["last_result_url"] = result_url
    await msg.reply_photo(result_url, caption="Done!", reply_markup=result_keyboard())
    logger.info(f"Sent result: {result_url}")


async def upload_image(session: aiohttp.ClientSession, image_bytes: bytes) -> str | None:
    try:
        form = aiohttp.FormData()
        form.add_field("file", image_bytes, filename="photo.jpg", content_type="image/jpeg")
        form.add_field("uploadPath", "tg-bot")
        async with session.post(
            KIE_UPLOAD_URL, data=form,
            headers={"Authorization": f"Bearer {KIE_API_KEY}"},
        ) as resp:
            data = await resp.json()
            logger.info(f"Upload response: {data}")
            url = data.get("url") or data.get("data", {}).get("downloadUrl") or data.get("data", {}).get("url")
            if url:
                return url
            logger.error(f"Upload failed: {data}")
            return None
    except Exception as e:
        logger.error(f"Upload exception: {e}")
        return None


async def create_task(session: aiohttp.ClientSession, image_url: str, prompt: str) -> str | None:
    payload = {"filesUrl": [image_url], "prompt": prompt, "size": "1:1"}
    try:
        async with session.post(
            KIE_CREATE_URL, json=payload,
            headers={"Authorization": f"Bearer {KIE_API_KEY}", "Content-Type": "application/json"},
        ) as resp:
            data = await resp.json()
            logger.info(f"Create task response: {data}")
            task_id = data.get("data", {}).get("taskId") or data.get("taskId")
            if task_id:
                return task_id
            logger.error(f"Create task failed: {data}")
            return None
    except Exception as e:
        logger.error(f"Create task exception: {e}")
        return None


async def poll_result(session: aiohttp.ClientSession, task_id: str) -> str | None:
    deadline = time.time() + POLL_TIMEOUT
    while time.time() < deadline:
        await asyncio.sleep(POLL_INTERVAL)
        try:
            async with session.get(
                KIE_STATUS_URL, params={"taskId": task_id},
                headers={"Authorization": f"Bearer {KIE_API_KEY}"},
            ) as resp:
                data = await resp.json()
                logger.info(f"Poll response: {data}")
                status = data.get("data", {}).get("status", "")
                if status == "SUCCESS":
                    urls = data["data"].get("response", {}).get("resultUrls", [])
                    if urls:
                        return urls[0]
                elif status in ("CREATE_TASK_FAILED", "GENERATE_FAILED"):
                    logger.error(f"Task failed: {data}")
                    return None
        except Exception as e:
            logger.error(f"Poll exception: {e}")
    logger.error(f"Poll timeout for task {task_id}")
    return None


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    app = Application.builder().token(TELEGRAM_TOKEN).build()

    # ConversationHandler for custom prompt + name + price input
    conv = ConversationHandler(
        entry_points=[
            CallbackQueryHandler(handle_style_choice, pattern="^style:"),
            CallbackQueryHandler(handle_qty, pattern="^qty:"),
        ],
        states={
            WAITING_CUSTOM_PROMPT: [MessageHandler(filters.TEXT & ~filters.COMMAND, handle_custom_prompt)],
            WAITING_NAME:          [MessageHandler(filters.TEXT & ~filters.COMMAND, handle_name)],
            WAITING_PRICE:         [MessageHandler(filters.TEXT & ~filters.COMMAND, handle_price)],
        },
        fallbacks=[],
        per_message=False,
    )

    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.PHOTO, handle_photo))
    app.add_handler(conv)
    app.add_handler(CallbackQueryHandler(handle_action,       pattern="^action:"))
    app.add_handler(CallbackQueryHandler(handle_size_toggle,  pattern="^size:"))
    app.add_handler(CallbackQueryHandler(handle_color_toggle, pattern="^color:"))
    app.add_handler(CallbackQueryHandler(handle_category,     pattern="^category:"))
    app.add_handler(CallbackQueryHandler(handle_publish,      pattern="^publish:"))

    logger.info("Bot started")
    app.run_polling()


if __name__ == "__main__":
    main()
