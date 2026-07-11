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
 *   category, search, flags }. Returns UI cards + pagination meta.
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
