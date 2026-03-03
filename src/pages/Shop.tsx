import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import '../styles/v2-styles.css';
import { getProducts, getProductById, type Product } from '../lib/shopApi';
import { getCart, addToCart, removeFromCart, clearCart } from '../lib/cartApi';
import ShopPixelWidget from '../components/shop/ShopPixelWidget';

const VISITOR_KEY = 'visitor_id';

const THEME_KEY = 'v2-theme';

const CATEGORIES = [
  { key: 'all',         label: 'All' },
  { key: 'hoodies',     label: 'Hoodies' },
  { key: 'sweatshirts', label: 'Sweatshirts' },
  { key: 'tshirts',     label: 'Tees' },
  { key: 'jackets',     label: 'Jackets' },
  { key: 'accessories', label: 'Accessories' },
  { key: 'bottoms',     label: 'Bottoms' },
];

const CATEGORY_ICONS: Record<string, string> = {
  hoodies:     '🧥',
  sweatshirts: '👕',
  tshirts:     '👕',
  jackets:     '🧥',
  accessories: '🧢',
  bottoms:     '👖',
};

export default function Shop() {
  const [isLight, setIsLight] = useState(() => localStorage.getItem(THEME_KEY) === 'light');
  const toggleTheme = () => setIsLight(prev => {
    const next = !prev;
    localStorage.setItem(THEME_KEY, next ? 'light' : 'dark');
    return next;
  });
  const [activeCategory, setActiveCategory] = useState('all');
  const [menuOpen, setMenuOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [recommendedIds, setRecommendedIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<{ product: Product; qty: number }[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutDone, setCheckoutDone] = useState(false);
  const liveKitRoomRef = useRef<any>(null);
  // Cache of all products seen across category switches — needed so cart_action
  // can resolve a product even when the active category tab doesn't include it
  const allProductsRef = useRef<Map<string, Product>>(new Map());

  // Stable visitor_id — generated once and persisted in localStorage
  const visitorIdRef = useRef<string>('');
  if (!visitorIdRef.current) {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(VISITOR_KEY, id); }
    visitorIdRef.current = id;
  }

  // Restore cart from server on first mount
  useEffect(() => {
    getCart(visitorIdRef.current).then(data => {
      if (data.items.length === 0) return;
      // We need Product objects — fetch each if not already cached
      const promises = data.items.map(item =>
        allProductsRef.current.has(item.id)
          ? Promise.resolve(allProductsRef.current.get(item.id)!)
          : getProductById(item.id).then(p => { if (p) allProductsRef.current.set(p.id, p); return p; })
      );
      Promise.all(promises).then(prods => {
        const restored = data.items
          .map((item, i) => prods[i] ? { product: prods[i]!, qty: item.qty } : null)
          .filter(Boolean) as { product: Product; qty: number }[];
        if (restored.length > 0) setCartItems(restored);
      });
    }).catch(() => { /* server unreachable — start with empty cart */ });
  }, []);

  useEffect(() => {
    setLoading(true);
    getProducts('*', activeCategory)
      .then(p => {
        setProducts(p);
        p.forEach(prod => allProductsRef.current.set(prod.id, prod));
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [activeCategory]);

  const handleRecommend = useCallback((ids: string[]) => {
    setRecommendedIds(ids);
    if (ids.length > 0) {
      // Cache any recommended products that aren't already in allProductsRef
      // so cart_action can resolve them even if the active tab differs
      ids.forEach(id => {
        if (!allProductsRef.current.has(id)) {
          getProductById(id).then(p => { if (p) allProductsRef.current.set(p.id, p); });
        }
      });
      setTimeout(() => {
        const el = document.getElementById(`shop-card-${ids[0]}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, []);

  const handleExpand = useCallback((id: string | null) => {
    setExpandedId(id);
  }, []);

  const syncCart = useCallback((items: { product: Product; qty: number }[]) => {
    const room = liveKitRoomRef.current;
    if (!room) return;
    const compact = items.map(i => ({ id: i.product.id, name: i.product.name, price: i.product.price, qty: i.qty }));
    room.localParticipant.setAttributes({ cart_json: items.length ? JSON.stringify(compact) : '' });
  }, []);

  const handleAddToCart = useCallback((product: Product) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      const qty = existing ? existing.qty + 1 : 1;
      const next = existing
        ? prev.map(i => i.product.id === product.id ? { ...i, qty } : i)
        : [...prev, { product, qty: 1 }];
      syncCart(next);
      addToCart(visitorIdRef.current, { id: product.id, name: product.name, price: product.price, qty: 1 })
        .catch(() => {});
      return next;
    });
  }, [syncCart]);

  const handleRemoveFromCart = useCallback((productId: string) => {
    setCartItems(prev => {
      const next = prev.filter(i => i.product.id !== productId);
      syncCart(next);
      removeFromCart(visitorIdRef.current, productId).catch(() => {});
      return next;
    });
  }, [syncCart]);

  const handleQtyChange = useCallback((productId: string, delta: number) => {
    setCartItems(prev => {
      const next = prev.map(i => i.product.id === productId
        ? { ...i, qty: Math.max(1, i.qty + delta) }
        : i
      );
      syncCart(next);
      return next;
    });
  }, [syncCart]);

  const handleCartAction = useCallback(async (action: { action: 'add' | 'remove'; id: string; qty?: number }) => {
    console.log('[cart] handleCartAction', action, 'room=', !!liveKitRoomRef.current);
    if (action.action === 'remove') { handleRemoveFromCart(action.id); return; }
    let product = allProductsRef.current.get(action.id);
    console.log('[cart] product from ref:', product?.name ?? 'NOT FOUND');
    if (!product) {
      product = await getProductById(action.id) ?? undefined;
      console.log('[cart] product from API:', product?.name ?? 'NOT FOUND');
      if (product) allProductsRef.current.set(product.id, product);
    }
    if (product) {
      console.log('[cart] calling handleAddToCart for', product.name);
      handleAddToCart(product);
    } else {
      console.error('[cart] product not found for id:', action.id);
    }
  }, [handleAddToCart, handleRemoveFromCart]);

  const handleRoomReady = useCallback((room: any) => {
    liveKitRoomRef.current = room;
    // If cart already has items when room connects, sync them immediately
    if (room) {
      setCartItems(prev => { syncCart(prev); return prev; });
    }
  }, [syncCart]);

  const cartCount = cartItems.reduce((sum, i) => sum + i.qty, 0);
  const cartTotal = cartItems.reduce((sum, i) => sum + i.product.price * i.qty, 0);

  // Sort: recommended first in agent order, rest after
  const agentActive = recommendedIds.length > 0;
  const sorted = agentActive
    ? [
        ...products.filter(p => recommendedIds.includes(p.id))
                   .sort((a, b) => recommendedIds.indexOf(a.id) - recommendedIds.indexOf(b.id)),
        ...products.filter(p => !recommendedIds.includes(p.id)),
      ]
    : products;

  // Last recommended product for widget preview
  const lastRecommended = recommendedIds.length > 0
    ? products.find(p => p.id === recommendedIds[0]) ?? null
    : null;

  // Modal product
  const modalProduct = expandedId ? products.find(p => p.id === expandedId) ?? null : null;

  return (
    <div className={`v2-scope shop-page${isLight ? ' v2-light' : ''}`}>
      {/* Sticky topbar: header + tabs merged, cat on the right */}
      <div className="shop-topbar">
        {/* Left column: header row + tabs row */}
        <div className="shop-topbar__left">
          {/* Desktop: row1 = back + title (centered) */}
          <div className="shop-topbar__row1">
            <Link to="/" className="shop-back-link">
              <BackIcon /> AIMediaFlow
            </Link>
            <span className="shop-title">PIXEL'S SHOP</span>
          </div>
          {/* Desktop: row2 = category tabs */}
          <div className="shop-topbar__row2 shop-topbar__row2--desktop">
            {CATEGORIES.map(c => (
              <button
                key={c.key}
                className={`shop-cat-tab${activeCategory === c.key ? ' shop-cat-tab--active' : ''}`}
                onClick={() => setActiveCategory(c.key)}
              >
                {c.label}
              </button>
            ))}
          </div>
          {/* Mobile: single row = back + burger + title + theme */}
          <div className="shop-topbar__mobile-row">
            <Link to="/" className="shop-back-link">
              <BackIcon />
            </Link>
            <button
              className={`shop-burger${menuOpen ? ' shop-burger--open' : ''}`}
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Menu"
            >
              <BurgerIcon open={menuOpen} />
            </button>
            <span className="shop-title">PIXEL'S SHOP</span>
            <button className="v2-theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
              {isLight ? <MoonIcon /> : <SunIcon />}
            </button>
          </div>
          {/* Mobile: dropdown menu */}
          {menuOpen && (
            <div className="shop-burger-menu">
              {CATEGORIES.map(c => (
                <button
                  key={c.key}
                  className={`shop-burger-item${activeCategory === c.key ? ' shop-burger-item--active' : ''}`}
                  onClick={() => { setActiveCategory(c.key); setMenuOpen(false); }}
                >
                  {CATEGORY_ICONS[c.key] ?? '🛍️'} {c.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right column: theme toggle + space for cat widget overlay */}
        <div className="shop-topbar__right">
          <button className="v2-theme-toggle shop-topbar__theme-btn" onClick={toggleTheme} aria-label="Toggle theme">
            {isLight ? <MoonIcon /> : <SunIcon />}
          </button>
        </div>
      </div>

      {/* Cat widget — outside topbar so position:fixed works on mobile */}
      <ShopPixelWidget
        onRecommend={handleRecommend}
        onExpand={handleExpand}
        onCartAction={handleCartAction}
        onRoomReady={handleRoomReady}
        lastRecommended={lastRecommended}
        cartCount={cartCount}
        visitorId={visitorIdRef.current}
      />

      {/* Cart button (fixed, top-right on desktop) */}
      <button
        className={`shop-cart-btn${cartCount > 0 ? ' shop-cart-btn--has-items' : ''}`}
        onClick={() => setCartOpen(o => !o)}
        aria-label="Open cart"
      >
        <CartIcon />
        {cartCount > 0 && <span className="shop-cart-badge">{cartCount}</span>}
      </button>

      {/* Cart panel */}
      <div className={`shop-cart-panel${cartOpen ? ' shop-cart-panel--open' : ''}`}>
        <div className="shop-cart-panel__header">
          <span>🛒 Your Cart</span>
          <button className="shop-cart-panel__close" onClick={() => setCartOpen(false)}>✕</button>
        </div>

        {cartItems.length === 0 ? (
          <div className="shop-cart-empty">Your cart is empty.</div>
        ) : (
          <>
            <div className="shop-cart-items">
              {cartItems.map(({ product: p, qty }) => (
                <div key={p.id} className="shop-cart-item">
                  <div className="shop-cart-item__info">
                    <span className="shop-cart-item__name">{p.name}</span>
                    <span className="shop-cart-item__price">€{(p.price * qty).toFixed(2)}</span>
                  </div>
                  <div className="shop-cart-item__controls">
                    <button className="shop-cart-qty-btn" onClick={() => handleQtyChange(p.id, -1)}>−</button>
                    <span className="shop-cart-item__qty">{qty}</span>
                    <button className="shop-cart-qty-btn" onClick={() => handleQtyChange(p.id, 1)}>+</button>
                    <button className="shop-cart-remove-btn" onClick={() => handleRemoveFromCart(p.id)} title="Remove">🗑</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="shop-cart-panel__footer">
              <div className="shop-cart-total">
                <span>Total</span>
                <span>€{cartTotal.toFixed(2)}</span>
              </div>
              <div className="shop-cart-panel__actions">
                <button className="shop-cart-clear-btn" onClick={() => { setCartItems([]); syncCart([]); clearCart(visitorIdRef.current).catch(() => {}); }}>
                  Clear
                </button>
                <button
                  className="shop-cart-checkout-btn"
                  onClick={() => { setCheckoutDone(true); clearCart(visitorIdRef.current).catch(() => {}); setTimeout(() => setCheckoutDone(false), 3000); }}
                >
                  {checkoutDone ? '✅ Order noted!' : 'Checkout →'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Cart panel backdrop */}
      {cartOpen && <div className="shop-cart-backdrop" onClick={() => setCartOpen(false)} />}

      {/* Product grid */}
      <main className="shop-main">
        {loading ? (
          <div className="shop-loading">
            <div className="shop-loading-spinner" />
            <span>Loading products…</span>
          </div>
        ) : products.length === 0 ? (
          <div className="shop-empty">No products found.</div>
        ) : (
          <div className="shop-grid">
            {sorted.map(p => (
              <ProductCard
                key={p.id}
                product={p}
                recommended={agentActive && recommendedIds.includes(p.id)}
                dimmed={agentActive && !recommendedIds.includes(p.id)}
                onExpand={() => setExpandedId(p.id)}
                onAddToCart={() => handleAddToCart(p)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Product modal overlay */}
      {modalProduct && (
        <ProductModal
          product={modalProduct}
          onClose={() => setExpandedId(null)}
          onAddToCart={() => handleAddToCart(modalProduct)}
        />
      )}

    </div>
  );
}

// ── Product Card ──────────────────────────────────────────────────────────────

interface ProductCardProps {
  product: Product;
  recommended: boolean;
  dimmed: boolean;
  onExpand: () => void;
  onAddToCart: () => void;
}

function ProductCard({ product: p, recommended, dimmed, onExpand, onAddToCart }: ProductCardProps) {
  const icon = CATEGORY_ICONS[p.category] ?? '📦';
  const oos = p.stock === 0;

  return (
    <div
      id={`shop-card-${p.id}`}
      className={[
        'shop-card',
        recommended ? 'shop-card--recommended' : '',
        dimmed      ? 'shop-card--dimmed'      : '',
        oos         ? 'shop-card--oos'         : '',
      ].filter(Boolean).join(' ')}
      onClick={onExpand}
    >
      {/* Image */}
      <div className="shop-card__image">
        <ProductImage id={p.id} icon={icon} />
        {oos && <div className="shop-card__oos-overlay"><span>Out of Stock</span></div>}
        {recommended && <div className="shop-card__highlight-ring" />}
      </div>

      {/* Info */}
      <div className="shop-card__body">
        <span className="shop-card__category">{p.category}</span>
        <h3 className="shop-card__name">{p.name}</h3>
        <p className="shop-card__desc">{p.description}</p>

        {p.colors.length > 0 && (
          <div className="shop-card__meta">
            <div className="shop-card__colors">
              {p.colors.slice(0, 4).map(c => <ColorDot key={c} color={c} />)}
              {p.colors.length > 4 && <span className="shop-card__more-colors">+{p.colors.length - 4}</span>}
            </div>
          </div>
        )}

        <div className="shop-card__footer">
          <span className="shop-card__price">€{p.price.toFixed(2)}</span>
          <button
            className={`shop-card__cta${oos ? ' shop-card__cta--disabled' : ''}`}
            disabled={oos}
            onClick={e => { e.stopPropagation(); onAddToCart(); }}
          >
            {oos ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Product Modal ─────────────────────────────────────────────────────────────

interface ProductModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: () => void;
}

function ProductModal({ product: p, onClose, onAddToCart }: ProductModalProps) {
  const icon = CATEGORY_ICONS[p.category] ?? '📦';
  const oos = p.stock === 0;

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="shop-modal-backdrop" onClick={onClose}>
      <div className="shop-modal" onClick={e => e.stopPropagation()}>
        <button className="shop-modal__close" onClick={onClose}>✕</button>

        <div className="shop-modal__image">
          <ProductImage id={p.id} icon={icon} large />
          {oos && <div className="shop-card__oos-overlay"><span>Out of Stock</span></div>}
        </div>

        <div className="shop-modal__body">
          <span className="shop-card__category">{p.category}</span>
          <h2 className="shop-modal__name">{p.name}</h2>
          <p className="shop-modal__desc">{p.description}</p>

          {p.colors.length > 0 && (
            <div className="shop-modal__row">
              <span className="shop-card__detail-label">Colors</span>
              <div className="shop-card__colors">
                {p.colors.map(c => <ColorDot key={c} color={c} />)}
              </div>
            </div>
          )}

          {p.sizes.length > 0 && (
            <div className="shop-modal__row">
              <span className="shop-card__detail-label">Sizes</span>
              <div className="shop-card__sizes">
                {p.sizes.map(s => <span key={s} className="shop-card__size">{s}</span>)}
              </div>
            </div>
          )}

          <div className="shop-modal__row">
            <span className="shop-card__detail-label">Stock</span>
            <span className={oos ? 'shop-card__stock-oos' : 'shop-card__stock-ok'}>
              {oos ? 'Out of stock' : `${p.stock} available`}
            </span>
          </div>

          <div className="shop-modal__footer">
            <span className="shop-modal__price">€{p.price.toFixed(2)}</span>
            <button
              className={`shop-card__cta shop-modal__cta${oos ? ' shop-card__cta--disabled' : ''}`}
              disabled={oos}
              onClick={onAddToCart}
            >
              {oos ? 'Out of Stock' : 'Add to Cart'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Product Image (photo or emoji fallback) ───────────────────────────────────

function ProductImage({ id, icon, large }: { id: string; icon: string; large?: boolean }) {
  const [hasPhoto, setHasPhoto] = useState(true);
  return hasPhoto ? (
    <img
      src={`/products/${id}.jpg`}
      alt={id}
      className={large ? 'shop-modal__img' : 'shop-card__img'}
      onError={() => setHasPhoto(false)}
    />
  ) : (
    <div className="shop-card__image-placeholder">
      <span className="shop-card__icon">{icon}</span>
    </div>
  );
}

// ── Color helpers ─────────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, string> = {
  black: '#111', white: '#f5f5f5', grey: '#888', gray: '#888',
  navy: '#1a2a4a', cream: '#f5f0e8', sage: '#7a9e7e', 'forest green': '#2d5a27',
  charcoal: '#444', olive: '#6b6b3a', burgundy: '#6b1a2a', tan: '#c4a882',
  camel: '#c19a6b', natural: '#e8dcc8', sand: '#c4b49e', 'washed grey': '#aaa',
};

function ColorDot({ color }: { color: string }) {
  const bg = COLOR_MAP[color.toLowerCase()] ?? '#999';
  return (
    <span
      className="shop-card__color-dot"
      style={{ background: bg, border: bg === '#f5f5f5' ? '1px solid #ccc' : 'none' }}
      title={color}
    />
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const CartIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);
const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
  </svg>
);
const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);
const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);
const BurgerIcon = ({ open }: { open: boolean }) => open ? (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
) : (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);
