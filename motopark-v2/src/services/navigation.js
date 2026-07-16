/**
 * services/navigation.js — live data for the storefront mega menu.
 *
 * Flyout item contract (unchanged): { label, slug }. The Navbar links each to
 * `${base}/${slug}` (base is /c for categories, /brand for brands), so these
 * must mint slugs that the destination pages can resolve:
 *
 *   • Categories → GET /api/categories → each doc already carries a real `slug`
 *     that CategoryPage (/c/:slug) reads directly.
 *   • Brands     → GET /api/products/filters → `brands: [string]` (derived by
 *     aggregation; V1 has no Brand model). BrandPage (/brand/:slug) resolves by
 *     matching `slugify(brand) === slug`, so we slug the brand the SAME way here.
 *
 * Both reads go through apiCache (TTL + in-flight dedupe) so a hover storm or
 * parallel mounts never bombard the backend.
 */
import { api } from '@/lib/api.js';
import { getCategories } from './categories.js';
import { getProductFilters } from './products.js';
import { cached } from '@/lib/apiCache.js';

/** Mirrors BrandPage's slugify exactly — do not diverge or brand links break. */
const slugify = (s) =>
  (s || '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

/** Live category flyout items, or [] on failure (caller keeps its fallback). */
export async function getNavCategories() {
  const cats = await cached('nav:categories', getCategories);
  return cats
    .map((c) => ({ label: c.name, slug: c.slug }))
    .filter((c) => c.label && c.slug);
}

/** Live brand flyout items, or [] on failure (caller keeps its fallback).
 *  Deduped by slug — the catalog holds case/spacing variants of the same brand
 *  (e.g. "KORDA" and "korda"), which slug identically; we keep the first. */
export async function getNavBrands() {
  const { brands } = await cached('nav:brands', () => getProductFilters());
  const seen = new Set();
  const items = [];
  for (const b of brands) {
    const slug = slugify(b);
    if (!b || !slug || seen.has(slug)) continue;
    seen.add(slug);
    items.push({ label: b, slug });
  }
  return items;
}

/**
 * Live "Shop by Bike" data, grouped by make, or [] on failure (caller keeps its
 * fallback). Shape: [{ make, makeSlug, models: [{ label, slug }] }].
 *
 * Backend already sorts bikes by make then model (GET /api/bikes), so first-seen
 * order gives makes alphabetically with their models in order — no re-sorting.
 * makeSlug/slug come straight from the Bike doc and match the /bikes/:make/:model
 * routes exactly.
 */
export async function getNavBikes() {
  const bikes = await cached('nav:bikes', () =>
    api.get('/bikes').then((r) => (Array.isArray(r.data) ? r.data : [])),
  );

  const byMake = new Map();
  const groups = [];
  for (const b of bikes) {
    if (!b?.makeSlug || !b?.slug) continue;
    let group = byMake.get(b.makeSlug);
    if (!group) {
      group = { make: b.make, makeSlug: b.makeSlug, models: [] };
      byMake.set(b.makeSlug, group);
      groups.push(group);
    }
    group.models.push({ label: b.model, slug: b.slug });
  }
  return groups;
}
