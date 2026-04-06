import asyncio, json, urllib.request
from sentence_transformers import SentenceTransformer

STORAGE_DIR  = '/opt/herbs-rag/data'
LITELLM_BASE = 'http://localhost:4000'
LITELLM_KEY  = 'sk-litellm-agents-2026'
LLM_MODEL    = 'qwen-plus'

_embed_model = SentenceTransformer('BAAI/bge-small-en-v1.5')
def embed_func(texts): return _embed_model.encode(texts, normalize_embeddings=True)
async def embed_func_async(texts):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, embed_func, texts)

async def llm_func(prompt, system_prompt=None, history_messages=[], **kwargs):
    messages = []
    if system_prompt: messages.append({'role': 'system', 'content': system_prompt})
    messages.extend(history_messages)
    messages.append({'role': 'user', 'content': prompt})
    payload = json.dumps({'model': LLM_MODEL, 'messages': messages, 'max_tokens': 1000, 'temperature': 0.1}).encode()
    req = urllib.request.Request(f'{LITELLM_BASE}/v1/chat/completions', data=payload,
        headers={'Authorization': f'Bearer {LITELLM_KEY}', 'Content-Type': 'application/json'})
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, lambda: json.loads(urllib.request.urlopen(req, timeout=120).read()))
    return result['choices'][0]['message']['content']

TEXT = (
    "Website URL Important Update\n\n"
    "The correct website address for Eriu's Garden is: https://herbs.aimediaflow.net/\n\n"
    "Always use https://herbs.aimediaflow.net/ when referring to the website.\n"
    "Do not use www.eriusgarden.ie — the live site is at https://herbs.aimediaflow.net/\n\n"
    "To talk to Aoife the AI herbalist: https://herbs.aimediaflow.net/\n"
    "To shop online: https://herbs.aimediaflow.net/\n"
)

async def main():
    from lightrag import LightRAG
    from lightrag.utils import EmbeddingFunc
    rag = LightRAG(
        working_dir=STORAGE_DIR, llm_model_func=llm_func,
        embedding_func=EmbeddingFunc(embedding_dim=384, max_token_size=512, func=embed_func_async),
        kv_storage='JsonKVStorage', vector_storage='NanoVectorDBStorage', graph_storage='NetworkXStorage',
    )
    await rag.initialize_storages()
    await rag.ainsert(TEXT)
    print("Done")

asyncio.run(main())
