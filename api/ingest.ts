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

  // Auth check — require Bearer token matching INGEST_SECRET env var
  const INGEST_SECRET = process.env.INGEST_SECRET;
  if (INGEST_SECRET) {
    const auth = req.headers['authorization'] ?? '';
    if (auth !== `Bearer ${INGEST_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
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
    // Pinecone Integrated Embedding — /records/upsert format
    // Each record: _id (string) + source field for embedding + any extra metadata fields
    const records = entries.map(entry => ({
      id: entry.id,
      text: entry.text,       // source field to embed (must match index field map)
      category: entry.category,
    }));

    const upsertRes = await fetch(`${PINECONE_INDEX_HOST}/records/upsert`, {
      method: 'POST',
      headers: {
        'Api-Key': PINECONE_API_KEY,
        'Content-Type': 'application/json',
        'X-Pinecone-API-Version': '2025-04',
      },
      body: JSON.stringify({ records }),
    });

    if (!upsertRes.ok) {
      const errText = await upsertRes.text();
      console.error('Pinecone upsert error status:', upsertRes.status, errText);
      return res.status(500).json({ error: 'Pinecone upsert failed', detail: errText });
    }

    return res.status(200).json({ indexed: entries.length });

  } catch (err) {
    console.error('Ingest error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
