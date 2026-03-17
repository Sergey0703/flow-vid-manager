import { NextRequest, NextResponse } from 'next/server';

const PINECONE_API_KEY    = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_HOST = process.env.PINECONE_INDEX_HOST;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { query } = body;

  if (!query || typeof query !== 'string') {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 });
  }

  if (!PINECONE_API_KEY || !PINECONE_INDEX_HOST) {
    return NextResponse.json({ error: 'Pinecone not configured' }, { status: 500 });
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
      return NextResponse.json({ error: 'Pinecone error' }, { status: 502 });
    }

    const data = await pineconeRes.json() as {
      result?: { hits?: { _score?: number; fields?: { text?: string; category?: string } }[] };
    };

    const hits = data.result?.hits ?? [];
    const results = hits
      .filter(h => (h._score ?? 0) >= 0.2)
      .map(h => h.fields?.text ?? '')
      .filter(Boolean);

    return NextResponse.json({ results });

  } catch (err) {
    console.error('kb-search error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
