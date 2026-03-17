import { NextRequest, NextResponse } from 'next/server';

const TYPESENSE_HOST = process.env.TYPESENSE_HOST ?? '46.62.246.93';
const TYPESENSE_PORT = process.env.TYPESENSE_PORT ?? '8108';
const TYPESENSE_API_KEY = process.env.TYPESENSE_API_KEY ?? '';

export async function GET(req: NextRequest) {
  if (!TYPESENSE_API_KEY) {
    return NextResponse.json({ error: 'Typesense not configured' }, { status: 500 });
  }

  const { searchParams } = req.nextUrl;
  const q = searchParams.get('q') ?? '*';
  const category = searchParams.get('category') ?? '';
  const id = searchParams.get('id') ?? '';
  const per_page = searchParams.get('per_page') ?? '20';

  const params = new URLSearchParams({
    q,
    query_by: 'name,description,category,colors,sizes',
    per_page,
    sort_by: '_text_match:desc',
  });

  if (id) {
    params.set('filter_by', `id:=${id}`);
  } else if (category && category !== 'all') {
    params.set('filter_by', `category:=${category}`);
  }

  const url = `http://${TYPESENSE_HOST}:${TYPESENSE_PORT}/collections/products/documents/search?${params}`;

  try {
    const upstream = await fetch(url, {
      headers: { 'X-TYPESENSE-API-KEY': TYPESENSE_API_KEY },
    });

    if (!upstream.ok) {
      return NextResponse.json({ error: 'Typesense error' }, { status: upstream.status });
    }

    const data = await upstream.json();
    const hits = (data.hits ?? []).map((h: any) => h.document);

    return NextResponse.json({ products: hits, found: data.found ?? hits.length });
  } catch (err) {
    console.error('typesense-search error:', err);
    return NextResponse.json({ error: 'Could not reach product database' }, { status: 502 });
  }
}
