import type { VercelRequest, VercelResponse } from '@vercel/node';

const PINECONE_API_KEY    = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_HOST = process.env.PINECONE_INDEX_HOST;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.body;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Missing query' });
  }

  if (!PINECONE_API_KEY || !PINECONE_INDEX_HOST) {
    return res.status(500).json({ error: 'Pinecone not configured' });
  }

  try {
    const pineconeRes = await fetch(
      `${PINECONE_INDEX_HOST}/records/namespaces/__default__/search`,
      {
        method: 'POST',
        headers: {
          'Api-Key': PINECONE_API_KEY,
          'Content-Type': 'application/json',
          'X-Pinecone-Api-Version': '2025-10',
        },
        body: JSON.stringify({
          query: { inputs: { text: query }, top_k: 4 },
          fields: ['text', 'category'],
        }),
      }
    );

    if (!pineconeRes.ok) {
      return res.status(502).json({ error: 'Pinecone error' });
    }

    const data = await pineconeRes.json() as {
      result?: { hits?: { fields?: { text?: string; category?: string }; score?: number }[] };
    };

    const hits = data.result?.hits ?? [];
    const results = hits
      .filter(h => (h.score ?? 0) >= 0.2)
      .map(h => h.fields?.text ?? '')
      .filter(Boolean);

    return res.status(200).json({ results });

  } catch (err: any) {
    console.error('kb-search error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
