import type { VercelRequest, VercelResponse } from '@vercel/node';

interface KBEntry {
  id: string;
  category: string;
  text: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
  const PINECONE_INDEX_HOST = process.env.PINECONE_INDEX_HOST;

  if (!PINECONE_API_KEY || !PINECONE_INDEX_HOST) {
    return res.status(500).json({ error: 'Pinecone not configured' });
  }

  const { entries } = req.body as { entries: KBEntry[] };

  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: 'No entries provided' });
  }

  try {
    // Upsert with integrated embedding (Pinecone embeds the text automatically)
    const vectors = entries.map(entry => ({
      id: entry.id,
      text: entry.text,           // Pinecone Inference API embeds this field (field map = "text")
      metadata: {
        category: entry.category,
        text: entry.text,         // store text in metadata for retrieval
      },
    }));

    const upsertRes = await fetch(`${PINECONE_INDEX_HOST}/records/upsert`, {
      method: 'POST',
      headers: {
        'Api-Key': PINECONE_API_KEY,
        'Content-Type': 'application/json',
        'X-Pinecone-API-Version': '2025-01',
      },
      body: JSON.stringify({ records: vectors }),
    });

    if (!upsertRes.ok) {
      const err = await upsertRes.text();
      console.error('Pinecone upsert error:', err);
      return res.status(500).json({ error: 'Pinecone upsert failed', detail: err });
    }

    return res.status(200).json({ indexed: entries.length });

  } catch (err) {
    console.error('Ingest error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
