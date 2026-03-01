import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import '../styles/v2-styles.css';
import { getProducts, type Product } from '../lib/shopApi';
import ShopPixelWidget from '../components/shop/ShopPixelWidget';

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
  const [activeCategory, setActiveCategory] = useState('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [recommendedIds, setRecommendedIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<{ product: Product; qty: number }[]>([]);


  useEffect(() => {
    setLoading(true);
    getProducts('*', activeCategory)
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [activeCategory]);

  const handleRecommend = useCallback((ids: string[]) => {
    setRecommendedIds(ids);
    if (ids.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`shop-card-${ids[0]}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, []);

  const handleExpand = useCallback((id: string | null) => {
    setExpandedId(id);
  }, []);

  const handleAddToCart = useCallback((product: Product) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { product, qty: 1 }];
    });
  }, []);

  const cartCount = cartItems.reduce((sum, i) => sum + i.qty, 0);

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
    <div className={`v2-scope${isLight ? ' v2-light' : ''}`}>
      {/* Header */}
      <header className="shop-header">
        <Link to="/" className="shop-back-link">
          <BackIcon /> AIMediaFlow
        </Link>
        <span className="shop-title">PIXEL'S SHOP</span>
        <div className="shop-header-right">
          <span className="shop-demo-badge">AI Demo</span>
          <ShopPixelWidget
            onRecommend={handleRecommend}
            onExpand={handleExpand}
            lastRecommended={lastRecommended}
            cartCount={cartCount}
          />
        </div>
      </header>

      {/* Category tabs */}
      <div className="shop-category-tabs">
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
const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
  </svg>
);
