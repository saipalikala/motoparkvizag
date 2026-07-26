/**
 * features/admin/products/productService.js
 *
 * Sole caller of adminApi for catalog CRUD. Encapsulates the (quirky) V1
 * multipart contract so the pages never touch FormData details:
 *
 *  CREATE  POST /api/products        (multipart, uploadProducts.any())
 *  UPDATE  PUT  /api/products/:id    (multipart)
 *  DELETE  DELETE /api/products/:id
 *  LIST    GET  /api/products?page&limit   → { products, total, page, pages }
 *  ONE     GET  /api/products/:id
 *
 * Contract landmines (backend/controllers/productController.js):
 *  • `category` is stored as the Category _id STRING (not name) → submit the id.
 *  • `variant.color` holds the hex/swatch value, `variant.colorName` the label.
 *  • Images are NOT part of the variants JSON. New files ride as multipart fields
 *    `variantImages_<i>`; on update, surviving image URLs are declared per variant
 *    as `keepImages_<i>` (JSON). Backend result = keepImages + newly uploaded.
 *  • Flags are read as the strings "true"/"false".
 *  • `compatibleBikes` (fitment) rides as a JSON string, same as `variants` —
 *    multipart has no array type. Backend parses + validates it (Milestone 10).
 */
import { adminApi } from '../lib/adminApi.js';
import { invalidate } from '@/lib/apiCache.js';

/* ── UI-facing shapes ─────────────────────────────────────────────────────── */

/** Any size across any variant has stock > 0. */
function anyInStock(variants) {
  for (const v of variants || []) {
    for (const s of v.sizes || []) {
      if (Number(s?.stock) > 0) return true;
    }
  }
  return false;
}

/** Total units across all variants/sizes. */
function totalStock(variants) {
  let n = 0;
  for (const v of variants || []) {
    for (const s of v.sizes || []) n += Number(s?.stock) || 0;
  }
  return n;
}

/** First usable image across a product's variants. */
function primaryImage(variants) {
  for (const v of variants || []) {
    const img = (v.images || [])[0];
    if (img) return img;
  }
  return null;
}

/** Raw V1 product → admin list-row shape. */
export function toAdminRow(p) {
  return {
    id: String(p._id),
    name: p.name,
    brand: p.brand,
    categoryId: p.category, // stored as Category _id string
    priceINR: p.price,
    image: primaryImage(p.variants),
    inStock: anyInStock(p.variants),
    stockUnits: totalStock(p.variants),
    variantCount: (p.variants || []).length,
  };
}

/** Raw V1 product → editable form model (variants keep images as URL strings). */
export function toFormModel(p) {
  return {
    id: String(p._id),
    name: p.name ?? '',
    brand: p.brand ?? '',
    category: p.category ?? '', // Category _id string
    price: p.price ?? '',
    originalPrice: p.originalPrice ?? '', // dormant on V1 (schema lacks it)
    description: p.description ?? '',
    specs: p.specs ?? '',
    care: p.care ?? '',
    newArrival: Boolean(p.newArrival),
    featured: Boolean(p.featured),
    trending: Boolean(p.trending),
    isShowcase: Boolean(p.isShowcase),
    // Fitment: raw doc holds ObjectIds → strings, so the picker can compare by ===
    compatibleBikes: (p.compatibleBikes || []).map((b) => String(b?._id ?? b)),
    variants: (p.variants || []).map((v) => ({
      color: v.color ?? '',
      colorName: v.colorName ?? '',
      // existing images as URLs; new uploads are added client-side as File objects
      images: (v.images || []).map((url) => ({ kind: 'existing', url })),
      sizes: (v.sizes || []).map((s) => ({ size: s.size ?? '', stock: Number(s.stock) || 0 })),
    })),
  };
}

/* ── Reads ────────────────────────────────────────────────────────────────── */

/** Admin list. `x-admin: 1` → backend sends `no-store` so edits show immediately. */
export async function listProducts({ page = 1, limit = 20, search, sort } = {}) {
  const params = { page, limit };
  if (search) params.search = search;
  if (sort) params.sort = sort;
  const { data } = await adminApi.get('/products', { params, headers: { 'x-admin': '1' } });
  return {
    rows: Array.isArray(data?.products) ? data.products.map(toAdminRow) : [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    pages: data?.pages ?? 0,
  };
}

/** Single product as a form model, or null if not found. */
export async function getProductForm(id) {
  try {
    const { data } = await adminApi.get(`/products/${id}`, { headers: { 'x-admin': '1' } });
    if (!data?._id) return null;
    return toFormModel(data);
  } catch (err) {
    if (err?.code === 404) return null;
    throw err;
  }
}

/** Category dropdown options: [{ value: _id, label: name }]. */
export async function getCategoryOptions() {
  const { data } = await adminApi.get('/categories');
  return (Array.isArray(data) ? data : [])
    .map((c) => ({ value: String(c._id), label: c.name }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Existing brand strings (for the brand datalist). */
export async function getBrandOptions() {
  const { data } = await adminApi.get('/products/filters');
  return Array.isArray(data?.brands) ? data.brands.filter(Boolean) : [];
}

/* ── Writes ───────────────────────────────────────────────────────────────── */

/**
 * Build the multipart body shared by create + update from a form model.
 * `includeKeepImages` is true on update so the backend knows which existing
 * image URLs to retain per variant (create has no existing images).
 */
function buildFormData(model, { includeKeepImages }) {
  const fd = new FormData();
  fd.append('name', model.name.trim());
  fd.append('price', String(model.price));
  fd.append('brand', model.brand.trim());
  fd.append('category', model.category);
  fd.append('description', model.description ?? '');
  fd.append('specs', model.specs ?? '');
  fd.append('care', model.care ?? '');
  // Forward-compat: harmless today (schema lacks originalPrice → stripped).
  if (model.originalPrice !== '' && model.originalPrice != null) {
    fd.append('originalPrice', String(model.originalPrice));
  }
  for (const flag of ['newArrival', 'featured', 'trending', 'isShowcase']) {
    fd.append(flag, model[flag] ? 'true' : 'false');
  }

  // Fitment — always sent (even empty) so clearing every bike actually persists.
  fd.append('compatibleBikes', JSON.stringify(model.compatibleBikes ?? []));

  // Variants JSON carries color/label/sizes only — never images.
  const variantsJson = model.variants.map((v) => ({
    color: v.color?.trim() || '',
    colorName: v.colorName?.trim() || '',
    sizes: (v.sizes || [])
      .filter((s) => String(s.size).trim() !== '')
      .map((s) => ({ size: String(s.size).trim(), stock: Number(s.stock) || 0 })),
  }));
  fd.append('variants', JSON.stringify(variantsJson));

  model.variants.forEach((v, i) => {
    if (includeKeepImages) {
      const keep = (v.images || []).filter((img) => img.kind === 'existing').map((img) => img.url);
      fd.append(`keepImages_${i}`, JSON.stringify(keep));
    }
    // New uploads for this variant.
    (v.images || [])
      .filter((img) => img.kind === 'new' && img.file)
      .forEach((img) => fd.append(`variantImages_${i}`, img.file));
  });

  return fd;
}

export async function createProduct(model) {
  const fd = buildFormData(model, { includeKeepImages: false });
  const { data } = await adminApi.post('/products', fd);
  invalidate('homepage:data');
  return data;
}

export async function updateProduct(id, model) {
  const fd = buildFormData(model, { includeKeepImages: true });
  const { data } = await adminApi.put(`/products/${id}`, fd);
  invalidate('homepage:data');
  return data;
}

export async function deleteProduct(id) {
  const { data } = await adminApi.delete(`/products/${id}`);
  invalidate('homepage:data');
  return data;
}
