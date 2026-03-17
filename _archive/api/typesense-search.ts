import type { VercelRequest, VercelResponse } from '@vercel/node';

const TYPESENSE_HOST = process.env.TYPESENSE_HOST ?? '46.62.246.93';
const TYPESENSE_PORT = process.env.TYPESENSE_PORT ?? '8108';
const TYPESENSE_API_KEY = process.env.TYPESENSE_API_KEY ?? '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!TYPESENSE_API_KEY) {
    return res.status(500).json({ error: 'Typesense not configured' });
  }

  const { q = '*', category, id, per_page = '20' } = req.query as Record<string, string>;

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
      return res.status(upstream.status).json({ error: 'Typesense error' });
    }

    const data = await upstream.json();
    const hits = (data.hits ?? []).map((h: any) => h.document);

    return res.status(200).json({ products: hits, found: data.found ?? hits.length });
  } catch (err) {
    console.error('typesense-search error:', err);
    return res.status(502).json({ error: 'Could not reach product database' });
  }
}
