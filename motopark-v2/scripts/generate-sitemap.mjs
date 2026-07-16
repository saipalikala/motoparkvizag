/**
 * scripts/generate-sitemap.mjs — build-time sitemap generator.
 *
 * WHY a build-time script (not an Express route): V2 ships as a STATIC Vite build
 * on Railway. A static host can't run a dynamic route, and `sitemap.xml` must live
 * at the SITE root (https://motoparkvizag.in/sitemap.xml), not the api subdomain.
 * So we fetch the catalog from the backend at build time and emit public/sitemap.xml,
 * which Vite copies verbatim into dist/.
 *
 * Runs before `vite build` (see package.json "build"). It is intentionally
 * FAULT-TOLERANT: if the API is unreachable, or a single source fails, it logs a
 * warning and keeps going — a network blip during a deploy must never wipe SEO URLs
 * or break the build. Worst case (total failure) it preserves the committed
 * sitemap.xml and exits 0.
 *
 * URL scheme mirrors the router (src/app/router.jsx) exactly:
 *   /                       home
 *   /store                  catalog
 *   /c/:slug                category      ← GET /api/categories (doc.slug)
 *   /products/:slug         product (:slug carries the Mongo _id — V1 has no slug)
 *   /brand/:slug            brand         ← GET /api/products/filters (brands[] → slugify)
 *   /collections/:slug      collection    ← GET /api/collections (doc.slug)
 *   + static/policy routes
 *
 * Env:
 *   SITE_ORIGIN       public site origin      (default https://motoparkvizag.in)
 *   SITEMAP_API_BASE  API base incl. /api     (else derived from VITE_API_BASE_URL
 *                     / VITE_API_URL in .env, else http://localhost:5000/api)
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_FILE = join(ROOT, 'public', 'sitemap.xml');

/* ── Config resolution ─────────────────────────────────────────────── */

// Minimal .env loader (plain Node doesn't read .env like Vite does). Only fills
// vars that aren't already set in the real environment (Railway build env wins).
async function loadDotEnv() {
  for (const file of ['.env', '.env.local']) {
    try {
      const text = await readFile(join(ROOT, file), 'utf8');
      for (const line of text.split('\n')) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
        if (!m) continue;
        const [, k, rawV] = m;
        if (process.env[k] === undefined) {
          process.env[k] = rawV.replace(/^["']|["']$/g, '').trim();
        }
      }
    } catch {
      /* file absent — fine */
    }
  }
}

function resolveApiBase() {
  if (process.env.SITEMAP_API_BASE) return process.env.SITEMAP_API_BASE.replace(/\/$/, '');
  if (process.env.VITE_API_BASE_URL) return process.env.VITE_API_BASE_URL.replace(/\/$/, '');
  // Legacy fallback: VITE_API_URL held the host only, with no /api suffix.
  if (process.env.VITE_API_URL) return `${process.env.VITE_API_URL.replace(/\/$/, '')}/api`;
  return 'http://localhost:5000/api';
}

/* ── Helpers ───────────────────────────────────────────────────────── */

const xmlEscape = (s) =>
  String(s).replace(/[<>&'"]/g, (c) => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]
  ));

/** Mirrors BrandPage / navigation.js slugify EXACTLY — diverging breaks brand links. */
const slugify = (s) =>
  (s || '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

const today = new Date().toISOString().slice(0, 10);

async function getJson(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

/** Best-effort source fetch: never throws — logs and returns [] so one bad
 *  endpoint can't sink the whole sitemap. */
async function safe(label, fn) {
  try {
    const out = await fn();
    console.log(`  ✓ ${label}: ${out.length}`);
    return out;
  } catch (err) {
    console.warn(`  ⚠ ${label} skipped — ${err.message}`);
    return [];
  }
}

/* ── Static routes (indexable) ─────────────────────────────────────── */

const STATIC_ROUTES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/store', changefreq: 'daily', priority: '0.9' },
  { path: '/collections', changefreq: 'weekly', priority: '0.7' },
  { path: '/bikes', changefreq: 'monthly', priority: '0.6' },
  { path: '/about', changefreq: 'monthly', priority: '0.5' },
  { path: '/contact', changefreq: 'monthly', priority: '0.5' },
  { path: '/faq', changefreq: 'monthly', priority: '0.4' },
  { path: '/shipping-policy', changefreq: 'yearly', priority: '0.3' },
  { path: '/returns-policy', changefreq: 'yearly', priority: '0.3' },
  { path: '/privacy-policy', changefreq: 'yearly', priority: '0.3' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
];

/* ── Dynamic sources ───────────────────────────────────────────────── */

async function fetchCategories(api) {
  const data = await getJson(`${api}/categories`);
  const arr = Array.isArray(data) ? data : data?.categories || [];
  return arr
    .map((c) => c?.slug)
    .filter(Boolean)
    .map((slug) => ({ path: `/c/${slug}`, changefreq: 'weekly', priority: '0.8' }));
}

async function fetchCollections(api) {
  const data = await getJson(`${api}/collections`);
  const arr = Array.isArray(data) ? data : data?.collections || [];
  return arr
    .map((c) => c?.slug)
    .filter(Boolean)
    .map((slug) => ({ path: `/collections/${slug}`, changefreq: 'weekly', priority: '0.6' }));
}

async function fetchBrands(api) {
  const data = await getJson(`${api}/products/filters`);
  const brands = Array.isArray(data?.brands) ? data.brands : [];
  const seen = new Set();
  const routes = [];
  for (const b of brands) {
    const slug = slugify(b);
    if (!slug || seen.has(slug)) continue; // dedupe case/spacing variants
    seen.add(slug);
    routes.push({ path: `/brand/${slug}`, changefreq: 'weekly', priority: '0.6' });
  }
  return routes;
}

async function fetchProducts(api) {
  const LIMIT = 100; // backend hard-caps page size at 100 (MAX_LIMIT)
  const routes = [];
  let page = 1;
  let pages = 1;
  do {
    const data = await getJson(`${api}/products?page=${page}&limit=${LIMIT}`);
    for (const p of data?.products || []) {
      if (p?._id) routes.push({ path: `/products/${p._id}`, changefreq: 'weekly', priority: '0.6' });
    }
    pages = Number(data?.pages) || 1;
    page += 1;
  } while (page <= pages && page <= 1000); // 1000-page safety valve
  return routes;
}

/* ── Build ─────────────────────────────────────────────────────────── */

function renderXml(origin, routes) {
  const body = routes
    .map(({ path, changefreq, priority }) =>
      `  <url><loc>${xmlEscape(origin + path)}</loc>` +
      `<lastmod>${today}</lastmod>` +
      `<changefreq>${changefreq}</changefreq>` +
      `<priority>${priority}</priority></url>`,
    )
    .join('\n');
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<!-- Generated by scripts/generate-sitemap.mjs at build time. Do not edit by hand. -->\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
  );
}

async function main() {
  await loadDotEnv();
  const origin = (process.env.SITE_ORIGIN || 'https://motoparkvizag.in').replace(/\/$/, '');
  const api = resolveApiBase();
  console.log(`sitemap: origin=${origin} api=${api}`);

  const [categories, collections, brands, products] = await Promise.all([
    safe('categories', () => fetchCategories(api)),
    safe('collections', () => fetchCollections(api)),
    safe('brands', () => fetchBrands(api)),
    safe('products', () => fetchProducts(api)),
  ]);

  const dynamic = [...categories, ...collections, ...brands, ...products];

  // If EVERY dynamic source failed (e.g. backend down), don't clobber the
  // committed sitemap with a static-only stub — preserve what's there and bail 0.
  if (dynamic.length === 0) {
    console.warn('sitemap: no dynamic URLs fetched — preserving existing sitemap.xml.');
    return;
  }

  // Dedupe by path (defensive) while preserving first-seen order.
  const routes = [];
  const seen = new Set();
  for (const r of [...STATIC_ROUTES, ...dynamic]) {
    if (seen.has(r.path)) continue;
    seen.add(r.path);
    routes.push(r);
  }

  await writeFile(OUT_FILE, renderXml(origin, routes), 'utf8');
  console.log(
    `sitemap: wrote ${routes.length} URLs → public/sitemap.xml ` +
    `(${STATIC_ROUTES.length} static, ${categories.length} cat, ${collections.length} coll, ` +
    `${brands.length} brand, ${products.length} product)`,
  );
}

main().catch((err) => {
  // Never fail the build over the sitemap.
  console.warn(`sitemap: generation failed (${err.message}) — keeping existing file.`);
});
