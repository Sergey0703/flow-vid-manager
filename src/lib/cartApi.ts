const CART_BASE = 'https://cart.aimediaflow.net';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  size?: string;
}

export interface CartData {
  items: CartItem[];
  total: number;
}

export async function getCart(visitorId: string): Promise<CartData> {
  const res = await fetch(`${CART_BASE}/cart/${visitorId}`);
  if (!res.ok) throw new Error('Failed to fetch cart');
  return res.json();
}

export async function addToCart(visitorId: string, item: CartItem): Promise<CartData> {
  const res = await fetch(`${CART_BASE}/cart/${visitorId}/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  if (!res.ok) throw new Error('Failed to add to cart');
  return res.json();
}

export async function removeFromCart(visitorId: string, productId: string): Promise<CartData> {
  const res = await fetch(`${CART_BASE}/cart/${visitorId}/remove`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: productId }),
  });
  if (!res.ok) throw new Error('Failed to remove from cart');
  return res.json();
}

export async function updateCartQty(visitorId: string, productId: string, qty: number): Promise<CartData> {
  const res = await fetch(`${CART_BASE}/cart/${visitorId}/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: productId, qty }),
  });
  if (!res.ok) throw new Error('Failed to update cart qty');
  return res.json();
}

export async function clearCart(visitorId: string): Promise<void> {
  await fetch(`${CART_BASE}/cart/${visitorId}`, { method: 'DELETE' });
}
