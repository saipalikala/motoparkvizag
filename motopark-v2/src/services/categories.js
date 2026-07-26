/**
 * services/categories.js — category reads from the V1 backend.
 * V1 category shape: { _id, name, slug, image?, description? } (image often empty).
 * Emits a UI-ready shape; the grid maps name → icon and links to /c/:slug (IA §).
 */
import { api } from '@/lib/api.js';
import { cached } from '@/lib/apiCache.js';

export async function getCategories() {
  return cached('categories:all', async () => {
    const { data } = await api.get('/categories');
    if (!Array.isArray(data)) return [];
    return data.map((c) => ({
      id: String(c._id),
      name: c.name,
      slug: c.slug,
      image: c.image || null, // null → grid uses an icon tile (no live category photos yet)
      url: `/c/${c.slug}`,
    }));
  });
}
