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
 *
 * MEDIA: the slide stores plain URL strings, so files are uploaded first and only
 * the resulting Cloudinary URL is persisted. We reuse the existing pipelines
 * rather than adding routes: POST /api/upload/carousel-video (multer →
 * CloudinaryStorage, resource_type "video") and POST /api/upload/media (images).
 * Both are admin-guarded and return { url }.
 */
import { adminApi } from '../lib/adminApi.js';

/* ── Upload limits — MIRROR of the backend (backend/config/cloudinary.js).
   Checked client-side purely so an oversized file fails instantly instead of
   after a long upload that ends in a 500. The backend remains authoritative. ── */
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024; // VIDEO_MAX
export const POSTER_MAX_BYTES = 20 * 1024 * 1024; // PROD_MAX (uploadMedia)

const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
// Narrower than the backend's image filter on purpose: gif/svg are not posters.
const POSTER_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const mb = (bytes) => `${Math.round(bytes / (1024 * 1024))} MB`;

/** Returns an error string, or null when the file is acceptable. */
export function validateVideo(file) {
  if (!VIDEO_TYPES.includes(file.type)) return 'Video must be an MP4, WebM, or MOV file.';
  if (file.size > VIDEO_MAX_BYTES)
    return `Video is ${mb(file.size)} — the limit is ${mb(VIDEO_MAX_BYTES)}. Compress it and try again.`;
  return null;
}

/** Returns an error string, or null when the file is acceptable. */
export function validatePoster(file) {
  if (!POSTER_TYPES.includes(file.type)) return 'Poster must be a JPG, PNG, or WebP image.';
  if (file.size > POSTER_MAX_BYTES)
    return `Poster is ${mb(file.size)} — the limit is ${mb(POSTER_MAX_BYTES)}.`;
  return null;
}

/**
 * Shared upload call. `timeout: 0` disables adminApi's 15s default — a cinematic
 * MP4 takes far longer than that to upload, and the default would abort it
 * mid-flight. onProgress receives 0-100, or null when the size is unknown.
 */
async function postFile(path, field, file, onProgress) {
  const fd = new FormData();
  fd.append(field, file);
  const { data } = await adminApi.post(path, fd, {
    timeout: 0,
    onUploadProgress: (e) => {
      onProgress?.(e.total ? Math.round((e.loaded * 100) / e.total) : null);
    },
  });
  if (!data?.url) throw { code: 0, message: 'Upload succeeded but returned no URL.' };
  return data.url;
}

/** Upload a video file → hosted Cloudinary URL. */
export function uploadShowcaseVideo(file, onProgress) {
  return postFile('/upload/carousel-video', 'carousel_video', file, onProgress);
}

/** Upload a poster image → hosted Cloudinary URL. */
export function uploadShowcasePoster(file, onProgress) {
  return postFile('/upload/media', 'media', file, onProgress);
}

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
