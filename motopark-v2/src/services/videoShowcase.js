/**
 * services/videoShowcase.js — live slides for the homepage Cinematic Theater.
 *
 * Backend contract (backend/routes/videoShowcaseRoutes.js):
 *   GET /api/video-showcase → array of slide docs (public)
 *
 * Maps the backend slide shape onto what CinematicVideoShowcase renders and
 * drops any slide missing a video src or poster (can't render those). Returns []
 * on failure or when there are no usable slides — the component then keeps its
 * built-in demo reel (graceful fallback).
 */
import { api } from '@/lib/api.js';
import { cached } from '@/lib/apiCache.js';

function toSlide(s, i) {
  const lines = Array.isArray(s.lines) ? s.lines.filter(Boolean) : s.lines ? [String(s.lines)] : [];
  const buyLink = typeof s.buyNowLink === 'string' ? s.buyNowLink.trim() : '';
  return {
    id: String(s.id ?? i),
    tag: s.tag || '',
    title: lines.join(' '),
    description: s.sub || '',
    src: s.src || '',
    poster: s.poster || '',
    buyLink: buyLink || null,
    cta: (s.cta && s.cta.trim()) || 'Shop the Gear',
  };
}

export async function getShowcaseSlides() {
  try {
    const slides = await cached('showcase:slides', () =>
      api.get('/video-showcase').then((r) => (Array.isArray(r.data) ? r.data : [])),
    );
    return slides.map(toSlide).filter((s) => s.src && s.poster);
  } catch {
    return [];
  }
}
