/**
 * features/admin/showcase/showcaseService.js — adminApi caller for the homepage
 * Cinematic Video Showcase CMS (Milestone 9).
 *
 * Backend contract (backend/routes/videoShowcaseRoutes.js + videoShowcaseModel.js):
 *   GET  /api/video-showcase            → array of slides (public)
 *   POST /api/video-showcase            (admin) → REPLACES the whole slides array
 *
 * ⚠️ Replace-all semantics: POST overwrites every slide, and an EMPTY array is
 * rejected (400) to guard against wiping the showcase. So the admin edits the
 * full array locally and saves it wholesale, and there must always be ≥ 1 slide.
 *
 * Slide schema fields: { id, src, poster, tag, lines[], sub, accent, cta,
 * buyNowLink, exploreLink }. The admin UI works in a flat "row" shape and maps
 * to/from that here (headline ⇄ lines[0], description ⇄ sub).
 */
import { adminApi } from '../lib/adminApi.js';

/** Backend slide → flat admin row. */
export function toRow(s, i = 0) {
  const lines = Array.isArray(s.lines) ? s.lines.filter(Boolean) : s.lines ? [String(s.lines)] : [];
  return {
    id: typeof s.id === 'number' ? s.id : i,
    title: lines.join(' '),
    tag: s.tag ?? '',
    description: s.sub ?? '',
    src: s.src ?? '',
    poster: s.poster ?? '',
    buyNowLink: s.buyNowLink ?? '',
    cta: s.cta ?? '',
  };
}

/** Flat admin row → backend slide (fills schema defaults the form doesn't expose). */
export function toSlide(row, i = 0) {
  return {
    id: typeof row.id === 'number' ? row.id : i,
    src: row.src?.trim() || '',
    poster: row.poster?.trim() || '',
    tag: row.tag?.trim() || '',
    lines: row.title?.trim() ? [row.title.trim()] : [],
    sub: row.description?.trim() || '',
    accent: '#ffffff',
    cta: row.cta?.trim() || '',
    buyNowLink: row.buyNowLink?.trim() || '/products',
    exploreLink: '/store',
  };
}

/** Next unused numeric id for a new slide. */
export function nextId(rows) {
  return rows.reduce((max, r) => Math.max(max, typeof r.id === 'number' ? r.id : 0), -1) + 1;
}

export async function listSlides() {
  const { data } = await adminApi.get('/video-showcase', { headers: { 'x-admin': '1' } });
  return Array.isArray(data) ? data.map(toRow) : [];
}

/** Persist the entire slide list (replace-all). Requires ≥ 1 slide. */
export async function saveSlides(rows) {
  const slides = rows.map(toSlide);
  const { data } = await adminApi.post('/video-showcase', slides);
  return data; // { ok, count }
}
