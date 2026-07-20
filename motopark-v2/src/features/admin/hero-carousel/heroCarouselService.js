/**
 * features/admin/hero-carousel/heroCarouselService.js
 *
 * Admin Hero Carousel — CRUD service.
 *
 * Backend contract (backend/routes/heroSlideRoutes.js):
 *   GET    /api/hero-slides            → authenticated admin gets EVERY slide,
 *                                         any status (Phase 1 review correction —
 *                                         unauthenticated callers get only the
 *                                         currently-eligible subset instead)
 *   GET    /api/hero-slides/:id        → single slide, any status
 *   POST   /api/hero-slides            → create
 *   PUT    /api/hero-slides/:id        → update
 *   DELETE /api/hero-slides/:id        → delete
 *   PATCH  /api/hero-slides/:id/toggle → flip `enabled`
 *
 * Images: reuses the existing POST /api/upload/media endpoint (same as
 * Campaigns/products/showcase). Returns { url } — a Cloudinary URL.
 */
import { adminApi } from '../lib/adminApi.js';

/** Theme presets — extensible registry, same pattern as CAMPAIGN_TYPES/PRESENTATION_TYPES. */
export const THEME_OPTIONS = [
  { value: 'dark', label: 'Dark — navy overlay, light text (default)' },
  { value: 'light', label: 'Light — light overlay, dark text' },
];

/** Image upload limit — mirrors backend (multer/Cloudinary media route). */
export const IMAGE_MAX_BYTES = 20 * 1024 * 1024; // 20 MB

export function validateImage(file) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) return 'Image must be JPG, PNG, or WebP.';
  if (file.size > IMAGE_MAX_BYTES) return 'Image exceeds 20 MB.';
  return null;
}

/** Upload a hero slide image → Cloudinary URL string. */
export async function uploadHeroSlideImage(file) {
  const fd = new FormData();
  fd.append('media', file);
  const { data } = await adminApi.post('/upload/media', fd, { timeout: 0 });
  if (!data?.url) throw { code: 0, message: 'Upload returned no URL.' };
  return data.url;
}

// ── CRUD ──────────────────────────────────────────────────────────────────

/** Fetch every hero slide (admin view — includes drafts, scheduled, expired). */
export async function listHeroSlides() {
  const { data } = await adminApi.get('/hero-slides');
  return Array.isArray(data) ? data : [];
}

/** Fetch a single slide by id, regardless of enabled/schedule state. */
export async function getHeroSlide(id) {
  const { data } = await adminApi.get(`/hero-slides/${id}`);
  return data;
}

/** Create a new hero slide. */
export async function createHeroSlide(payload) {
  const { data } = await adminApi.post('/hero-slides', payload);
  return data;
}

/** Update an existing hero slide by id. */
export async function updateHeroSlide(id, payload) {
  const { data } = await adminApi.put(`/hero-slides/${id}`, payload);
  return data;
}

/** Delete a hero slide by id. */
export async function deleteHeroSlide(id) {
  const { data } = await adminApi.delete(`/hero-slides/${id}`);
  return data;
}

/** Toggle enabled/disabled — this IS publish/unpublish and draft/live. */
export async function toggleHeroSlide(id, enabled) {
  const { data } = await adminApi.patch(`/hero-slides/${id}/toggle`, { enabled });
  return data;
}

/** Blank slide for the "create" form. Primary CTA defaults mirror the current
 *  static Hero's copy (src/pages/home/sections/Hero.jsx) as a sensible start. */
export function blankHeroSlide() {
  return {
    internalTitle: '',
    headline: '',
    subtitle: '',
    desktopImage: '',
    mobileImage: '',
    primaryCta: { label: 'Shop the gear', url: '/store' },
    secondaryCta: { label: '', url: '' },
    order: 0,
    enabled: false,
    publishAt: '',
    expireAt: '',
    overlayOpacity: 0.6,
    theme: 'dark',
    imageAlt: '',
    imageFocalPoint: { x: 50, y: 50 },
    imageAttribution: '',
  };
}
