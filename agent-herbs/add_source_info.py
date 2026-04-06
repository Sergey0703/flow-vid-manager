#!/usr/bin/env python3
import os
import asyncio
import json
import urllib.request
from sentence_transformers import SentenceTransformer
import numpy as np

STORAGE_DIR  = '/opt/herbs-rag/data'
LITELLM_BASE = 'http://localhost:4000'
LITELLM_KEY  = 'sk-litellm-agents-2026'
LLM_MODEL    = 'qwen-plus'

SOURCE_INFO = """
# Sources and Bibliography — Ériu's Garden Herbal Knowledge

## About the Knowledge Sources

The herbal knowledge shared by Aoife, the AI herbalist at Ériu's Garden, is rooted in
traditional Irish folk medicine and Celtic herbal wisdom passed down through generations.

## Primary Literary Source

**Title:** Ancient Cures, Charms and Usages of Ireland
**Author:** Lady Jane Francesca Wilde, known by her pen name "Speranza"
**Published:** 1890, Ward and Downey, London
**Status:** Public domain

### About This Book
Lady Wilde's book is a foundational collection of traditional Irish folk medicine, herb lore,
charms, and healing practices gathered from oral tradition across Ireland in the 19th century.
She documented the uses of wild herbs, plants, and natural remedies passed down through
generations of Irish healers, herbalists, and country people — including Kerry traditions.

The book covers herbal preparations such as teas, poultices, tinctures, and infusions,
as well as the spiritual and ceremonial significance of plants in Celtic culture.

### About the Author
Lady Jane Francesca Wilde (1821–1896) was an Irish poet, folklorist, and nationalist.
She spent years travelling rural Ireland collecting folk traditions, superstitions, and
herbal knowledge from local people before this wisdom was lost to modernisation.
She is also the mother of Oscar Wilde.

## How to Answer Questions About Sources

If a visitor asks:
- "Where does your knowledge come from?"
- "What are your sources?"
- "What books do you use?"
- "Is this knowledge documented anywhere?"

Aoife should answer warmly, for example:
"My knowledge is rooted in the living tradition of Irish herbalism, and draws from the
writings of Lady Wilde — her wonderful book Ancient Cures, Charms and Usages of Ireland,
published in 1890, captured the herb wisdom of our Irish ancestors. It is a beautiful
record of the plant knowledge that has been part of Kerry life for centuries."
"""

_embed_model = SentenceTransformer('BAAI/bge-small-en-v1.5')

def embed_func(texts):
    return _embed_model.encode(texts, normalize_embeddings=True)

async def embed_func_async(texts):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, embed_func, texts)

async def llm_func(prompt, system_prompt=None, history_messages=[], **kwargs):
    messages = []
    if system_prompt:
        messages.append({'role': 'system', 'content': system_prompt})
    messages.extend(history_messages)
    messages.append({'role': 'user', 'content': prompt})
    payload = json.dumps({
        'model': LLM_MODEL,
        'messages': messages,
        'max_tokens': kwargs.get('max_tokens', 1000),
        'temperature': 0.1,
    }).encode()
    req = urllib.request.Request(
        f'{LITELLM_BASE}/v1/chat/completions',
        data=payload,
        headers={'Authorization': f'Bearer {LITELLM_KEY}', 'Content-Type': 'application/json'}
    )
    loop = asyncio.get_event_loop()
    def _call():
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read())
    result = await loop.run_in_executor(None, _call)
    return result['choices'][0]['message']['content']

async def main():
    from lightrag import LightRAG
    from lightrag.utils import EmbeddingFunc

    rag = LightRAG(
        working_dir=STORAGE_DIR,
        llm_model_func=llm_func,
        embedding_func=EmbeddingFunc(
            embedding_dim=384,
            max_token_size=512,
            func=embed_func_async,
        ),
        kv_storage='JsonKVStorage',
        vector_storage='NanoVectorDBStorage',
        graph_storage='NetworkXStorage',
    )
    await rag.initialize_storages()
    print("Inserting source information into RAG...")
    await rag.ainsert(SOURCE_INFO)
    print("Done! Source info added to knowledge base.")

asyncio.run(main())
