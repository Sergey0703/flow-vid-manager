export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  stock: number;
  sizes: string[];
  colors: string[];
  image_url?: string;
}

export async function getProducts(q?: string, category?: string): Promise<Product[]> {
  const params = new URLSearchParams();
  params.set('q', q || '*');
  params.set('per_page', '50');
  if (category && category !== 'all') params.set('category', category);

  const res = await fetch(`/api/typesense-search?${params}`);
  if (!res.ok) throw new Error('Failed to fetch products');
  const data = await res.json();
  return data.products as Product[];
}

export async function getProductById(id: string): Promise<Product | null> {
  const params = new URLSearchParams({ q: '*', id });
  const res = await fetch(`/api/typesense-search?${params}`);
  if (!res.ok) return null;
  const data = await res.json();
  return (data.products as Product[]).find(p => p.id === id) ?? null;
}
