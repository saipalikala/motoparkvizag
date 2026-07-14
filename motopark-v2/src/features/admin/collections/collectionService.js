/**
 * features/admin/collections/collectionService.js — sole adminApi caller for
 * collection CRUD + the product options that feed the picker.
 *
 * Backend contract (backend/routes/collectionRoutes.js + collectionModel.js):
 *   Collection = { name (req), slug (req, unique, NOT auto-derived), products: [ObjectId→Product] }
 *   GET    /api/collections           → array, `products` POPULATED (full docs)
 *   POST   /api/collections           { name, slug }            (admin) — products NOT accepted here
 *   PUT    /api/collections/:id        { name?, slug?, products? } (admin)
 *   DELETE /api/collections/:id                                   (admin)
 *
 * Because create only takes name+slug, attaching products is a follow-up PUT.
 */
import { adminApi } from '../lib/adminApi.js';

/** Client-side slug helper (collections need an explicit slug; auto-suggest it). */
export function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function firstImage(variants) {
  for (const v of variants || []) {
    const img = (v.images || [])[0];
    if (img) return img;
  }
  return null;
}

function toRow(c) {
  const products = (c.products || []).map((p) => ({
    id: String(p._id ?? p),
    name: p.name ?? '',
    image: firstImage(p.variants),
  }));
  return {
    id: String(c._id),
    name: c.name ?? '',
    slug: c.slug ?? '',
    products,
    productIds: products.map((p) => p.id),
    productCount: products.length,
  };
}

export async function listCollections() {
  const { data } = await adminApi.get('/collections', { headers: { 'x-admin': '1' } });
  return Array.isArray(data) ? data.map(toRow) : [];
}

/** All products as picker options: [{ id, name, brand, image }]. */
export async function getProductOptions() {
  const { data } = await adminApi.get('/products', {
    params: { limit: 100 },
    headers: { 'x-admin': '1' },
  });
  return (Array.isArray(data?.products) ? data.products : []).map((p) => ({
    id: String(p._id),
    name: p.name,
    brand: p.brand,
    image: firstImage(p.variants),
  }));
}

/** Create name+slug, then attach products in a follow-up PUT when any are chosen. */
export async function createCollection({ name, slug, products = [] }) {
  const { data: created } = await adminApi.post('/collections', {
    name: name.trim(),
    slug: slug.trim(),
  });
  if (products.length) {
    const { data: updated } = await adminApi.put(`/collections/${created._id}`, { products });
    return updated;
  }
  return created;
}

export async function updateCollection(id, { name, slug, products }) {
  const { data } = await adminApi.put(`/collections/${id}`, {
    name: name.trim(),
    slug: slug.trim(),
    products,
  });
  return data;
}

export async function deleteCollection(id) {
  const { data } = await adminApi.delete(`/collections/${id}`);
  return data;
}
