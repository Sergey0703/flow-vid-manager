#!/usr/bin/env python3
import os
import asyncio
import logging
import aiohttp
from telegram import Update
from telegram.constants import ChatAction
from telegram.ext import Application, MessageHandler, CommandHandler, filters, ContextTypes

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("herbs-bot")

BOT_TOKEN  = os.getenv("TELEGRAM_BOT_TOKEN")
ADMIN_CHAT = int(os.getenv("ADMIN_CHAT_ID", "0"))
RAG_URL    = os.getenv("HERBS_RAG_URL", "http://localhost:8766")
IMAGES_DIR = os.getenv("HERBS_DATA_DIR", "/opt/herbs-rag/herbs_data") + "/images"

WELCOME = (
    "🌿 Welcome to Ériu's Garden Herb Assistant!\n\n"
    "Ask me anything about Irish herbs, remedies, or our shop in Killarney.\n"
    "I'll do my best to help you find the right plant for your needs."
)

# Build herb name → image path index at startup
def build_image_index():
    index = {}
    if not os.path.isdir(IMAGES_DIR):
        return index
    for fname in os.listdir(IMAGES_DIR):
        name, ext = os.path.splitext(fname)
        if ext.lower() in (".jpg", ".jpeg", ".png", ".webp"):
            # "st_john's_wort" → "st john's wort"
            herb_name = name.replace("_", " ").lower()
            index[herb_name] = os.path.join(IMAGES_DIR, fname)
    return index

IMAGE_INDEX = build_image_index()
logger.info(f"Loaded {len(IMAGE_INDEX)} herb images")


async def query_rag(question: str) -> str:
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{RAG_URL}/query",
                json={"question": question, "mode": "hybrid"},
                timeout=aiohttp.ClientTimeout(total=20),
            ) as res:
                if res.status != 200:
                    return ""
                data = await res.json()
                answer = data.get("answer", "")
                if "### References" in answer:
                    answer = answer[:answer.index("### References")].strip()
                return answer[:1200] if len(answer) > 1200 else answer
    except Exception as e:
        logger.error(f"RAG error: {e}")
        return ""


def find_herb_image(answer: str) -> str | None:
    answer_lower = answer.lower()
    for herb_name, path in IMAGE_INDEX.items():
        if herb_name in answer_lower:
            return path
    return None


async def handle_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(WELCOME)


async def handle_message(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    msg = update.message
    if not msg or not msg.text:
        return

    user = msg.from_user
    question = msg.text.strip()
    chat_id = msg.chat_id

    logger.info(f"User {user.id} (@{user.username}): {repr(question)}")

    await ctx.bot.send_chat_action(chat_id=chat_id, action=ChatAction.TYPING)

    answer = await query_rag(question)
    if not answer:
        answer = (
            "I'm sorry, I couldn't find an answer right now. "
            "Please try rephrasing, or contact us at hello@eriusgarden.ie"
        )

    image_path = find_herb_image(answer)

    if image_path:
        try:
            with open(image_path, "rb") as img:
                await msg.reply_photo(photo=img, caption=answer[:1024])
        except Exception:
            await msg.reply_text(answer)
    else:
        await msg.reply_text(answer)

    # Forward to admin
    if ADMIN_CHAT:
        try:
            fwd = (
                f"👤 @{user.username or user.first_name} (id:{user.id})\n"
                f"❓ {question}\n\n"
                f"🌿 {answer[:600]}"
            )
            await ctx.bot.send_message(chat_id=ADMIN_CHAT, text=fwd)
        except Exception as e:
            logger.warning(f"Admin forward failed: {e}")


def main():
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", handle_start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    logger.info("Herbs bot starting...")
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
