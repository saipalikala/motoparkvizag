/**
 * services/products.js — the ONLY caller of lib/api for product data.
 *
 * Reads the existing V1 Express backend (read-only production). The V1 product
 * shape has NO slug, NO isActive, prices in WHOLE RUPEES, and images nested under
 * variants[].images. This module maps that raw shape into a UI-ready contract so
 * components never touch V1 quirks. When the V2 backend (docs/05) lands, only the
 * mapping here changes — components stay put.
 *
 * UI contract emitted:
 *   { id, name, brand, category, priceINR, image, url, inStock }
 */
import { api } from '@/lib/api.js';

/** First usable image across a product's variants (V1 nests images per variant). */
function primaryImage(variants) {
  for (const v of variants || []) {
    const img = (v.images || [])[0];
    if (img) return img;
  }
  return null;
}

/** Any variant/size with stock > 0. */
function anyInStock(variants) {
  for (const v of variants || []) {
    for (const s of v.sizes || []) {
      if (s?.stock > 0) return true;
    }
  }
  return false;
}

const THEME_PALETTES = [
  { primary: '#D4DEC9', secondary: '#556B2F' }, // Sage Green (matching reference UI)
  { primary: '#E3D7C7', secondary: '#6E5D4F' }, // Warm Sand / Earth
  { primary: '#D6E2E9', secondary: '#3A5A40' }, // Soft Slate / Forest
  { primary: '#E9DAC1', secondary: '#8B5A2B' }, // Warm Amber / Copper
  { primary: '#DBE4EE', secondary: '#3B5998' }, // Cool Blue / Steel
];

function deriveTheme(p) {
  if (p?.theme?.primary && p?.theme?.secondary) return p.theme;
  const idStr = String(p?._id || p?.name || 'product');
  let hash = 0;
  for (let i = 0; i < idStr.length; i++) {
    hash = (hash << 5) - hash + idStr.charCodeAt(i);
    hash |= 0;
  }
  return THEME_PALETTES[Math.abs(hash) % THEME_PALETTES.length];
}

function derivePopularity(p) {
  if (typeof p?.popularity === 'number') return p.popularity;
  const idStr = String(p?._id || p?.name || '100');
  let hash = 0;
  for (let i = 0; i < idStr.length; i++) {
    hash = (hash << 3) + idStr.charCodeAt(i);
  }
  const base = Math.abs(hash) % 15000;
  return base < 500 ? base + 150 : base;
}

function deriveTags(p) {
  if (Array.isArray(p?.tags) && p.tags.length > 0) return p.tags;
  const pool = [p?.category, p?.brand, 'Armor', 'ECE 22.06', 'Waterproof', 'Thermal', 'Reflective'].filter(Boolean);
  return Array.from(new Set(pool)).slice(0, 5);
}

const BADGES = ['Trending', 'New', 'Best Seller', 'Popular', 'Limited'];
const MEDIA_BG_PALETTES = [
  'radial-gradient(circle at center, #29354a 0%, #0f1624 100%)', // Dark Slate Gradient
  'linear-gradient(135deg, #D4DEC9 0%, #B5C4A3 100%)',           // Soft Sage
  'radial-gradient(circle at center, #3A2E39 0%, #1A1219 100%)', // Dark Plum Gradient
  'linear-gradient(135deg, #E3D7C7 0%, #C9B9A6 100%)',           // Warm Sand
  'linear-gradient(135deg, #2B3A4E 0%, #151F2C 100%)',           // Deep Navy
];

function deriveBadge(p) {
  if (p?.badge) return p.badge;
  const hash = Math.abs((p?._id || p?.name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
  return BADGES[hash % BADGES.length];
}

function deriveDescription(p) {
  if (p?.description && typeof p.description === 'string' && p.description.trim()) {
    return p.description;
  }
  return 'Lightweight, durable, and built for peak performance on every ride.';
}

function deriveMediaBg(p) {
  if (p?.mediaBg) return p.mediaBg;
  const hash = Math.abs((p?._id || p?.name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
  return MEDIA_BG_PALETTES[hash % MEDIA_BG_PALETTES.length];
}

/** Raw V1 product doc → UI-ready card shape. */
export function toProductCard(p) {
  if (!p) return null;
  return {
    id: String(p._id),
    name: p.name,
    brand: p.brand,
    category: p.category,
    priceINR: p.price, // V1 stores whole rupees
    image: primaryImage(p.variants),
    // V1 has no slug → route param carries the id (route: /products/:slug).
    url: `/products/${String(p._id)}`,
    inStock: anyInStock(p.variants),
    popularity: derivePopularity(p),
    deliveryText: p.deliveryText || 'Free Delivery until 16/06/2026',
    tags: deriveTags(p),
    theme: deriveTheme(p),
    badge: deriveBadge(p),
    description: deriveDescription(p),
    mediaBg: deriveMediaBg(p),
  };
}

const mapList = (arr) => (Array.isArray(arr) ? arr.map(toProductCard).filter(Boolean) : []);

/**
 * One call powers the whole homepage (V1 aggregates in /home-data, 5-min cached).
 * Returns UI-ready lists: { featured, trending, newArrivals }.
 */
export async function getHomepage() {
  const { data } = await api.get('/home-data');
  return {
    featured: mapList(data?.featured),
    trending: mapList(data?.trending),
    newArrivals: mapList(data?.newArrivals),
  };
}

/**
 * Paginated catalog listing (PLP). `params` maps 1:1 to the V1 /products query:
 * { page, limit, sort ('price_asc'|'price_desc'), brand (csv), minPrice, maxPrice,
 *   category, search, flags, bike, bikeMake }. Returns UI cards + pagination meta.
 *
 * Fitment (Milestone 10): `bike` takes a Bike _id or the "makeSlug/modelSlug" pair
 * straight from the /bikes/:make/:model URL; `bikeMake` takes a makeSlug and covers
 * every model of that make. Both filter on structured compatibleBikes, not text.
 */
export async function getProducts(params = {}) {
  // Drop empty params so the URL/query stays clean.
  const query = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v != null),
  );
  const { data } = await api.get('/products', { params: query });
  return {
    products: mapList(data?.products),
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    pages: data?.pages ?? 0,
  };
}

/**
 * Single product for the PDP. Returns a richer shape than the card (keeps full
 * variants: color/images/sizes+stock) plus MRP when V1's `originalPrice` beats
 * the price (Commerce Law 2 sale pricing). Returns null if not found.
 */
export async function getProduct(id) {
  let p;
  try {
    ({ data: p } = await api.get(`/products/${id}`));
  } catch {
    return null; // 404 / invalid id → treat as not found
  }
  if (!p?._id) return null;

  const variants = (p.variants || []).map((v) => ({
    color: v.color || null,
    colorName: v.colorName || v.color || 'Default',
    images: Array.isArray(v.images) ? v.images : [],
    sizes: (v.sizes || []).map((s) => ({ size: s.size, stock: s.stock ?? 0 })),
  }));

  return {
    id: String(p._id),
    name: p.name,
    brand: p.brand,
    category: p.category,
    priceINR: p.price,
    mrpINR: p.originalPrice && p.originalPrice > p.price ? p.originalPrice : null,
    description: p.description || '',
    specs: p.specs || '',
    care: p.care || '',
    variants,
    inStock: anyInStock(p.variants),
    url: `/products/${String(p._id)}`,
  };
}

/**
 * Semantic (AI) product search — POST /api/ai/search runs an Atlas $vectorSearch
 * over product embeddings and returns REAL, ranked product docs (same raw shape
 * as /products), so we reuse toProductCard. Embedding-only (no chat-model call),
 * so it's cheap and rate-limit friendly. Throws on failure — callers decide
 * whether to fall back to keyword getProducts().
 */
export async function aiSearch(query, { limit = 12, maxPrice } = {}) {
  const { data } = await api.post('/ai/search', {
    query,
    limit,
    ...(typeof maxPrice === 'number' ? { maxPrice } : {}),
  });
  return mapList(data?.results);
}

/** Facet options for the PLP sidebar: { brands[], priceRange:{min,max} }. */
export async function getProductFilters(category) {
  const { data } = await api.get('/products/filters', {
    params: category ? { category } : {},
  });
  return {
    brands: Array.isArray(data?.brands) ? data.brands.filter(Boolean) : [],
    priceRange: data?.priceRange ?? { min: 0, max: 0 },
  };
}
