/**
 * services/collections.js — curated collections from V1.
 * GET /api/collections returns ALL collections with `products` populated (full
 * docs), so there's no per-slug endpoint — pages fetch all and find by slug.
 * Each product is mapped to the shared card shape.
 */
import { api } from '@/lib/api.js';
import { toProductCard } from './products.js';

export async function getCollections() {
  const { data } = await api.get('/collections');
  if (!Array.isArray(data)) return [];
  return data.map((c) => {
    const products = (c.products || []).map(toProductCard).filter(Boolean);
    return {
      id: String(c._id),
      name: c.name,
      slug: c.slug,
      products,
      count: products.length,
      cover: products[0]?.image || null,
      url: `/collections/${c.slug}`,
    };
  });
}
