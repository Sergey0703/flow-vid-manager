import { NextRequest, NextResponse } from 'next/server';

interface KBEntry {
  id: string;
  category: string;
  text: string;
}

export async function POST(req: NextRequest) {
  const INGEST_SECRET = process.env.INGEST_SECRET;
  if (INGEST_SECRET) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${INGEST_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
  const PINECONE_INDEX_HOST = process.env.PINECONE_INDEX_HOST;

  if (!PINECONE_API_KEY || !PINECONE_INDEX_HOST) {
    return NextResponse.json({ error: 'Pinecone not configured' }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const { entries } = body as { entries: KBEntry[] };

  if (!Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json({ error: 'No entries provided' }, { status: 400 });
  }

  try {
    const ndjson = entries
      .map(entry => JSON.stringify({ _id: entry.id, text: entry.text, category: entry.category }))
      .join('\n');

    const upsertRes = await fetch(`${PINECONE_INDEX_HOST}/records/namespaces/__default__/upsert`, {
      method: 'POST',
      headers: {
        'Api-Key': PINECONE_API_KEY,
        'Content-Type': 'application/x-ndjson',
        'X-Pinecone-Api-Version': '2025-10',
      },
      body: ndjson,
    });

    if (!upsertRes.ok) {
      const errText = await upsertRes.text();
      console.error('Pinecone upsert error:', upsertRes.status, errText);
      return NextResponse.json({ error: 'Pinecone upsert failed', detail: errText }, { status: 500 });
    }

    return NextResponse.json({ indexed: entries.length });

  } catch (err) {
    console.error('Ingest error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
