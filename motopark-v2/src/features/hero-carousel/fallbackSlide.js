/**
 * The bundled Hero fallback — rendered when the CMS returns no eligible
 * slides, or the request fails, or (see hooks/useHeroSlides.js) while the
 * initial fetch is still in flight. This is NOT temporary placeholder data
 * (that was placeholderSlides.js, removed this phase) — it's a permanent,
 * deliberate part of the production render path: the hero must never be
 * empty.
 *
 * Reuses the exact same real, already-optimized static assets the ORIGINAL
 * single-image Hero used before this migration (/hero-960.*, /hero-1600.*).
 * index.html's fetchpriority="high" preload is keyed to these exact paths —
 * this is what keeps that preload meaningful. HeroCarouselSlide.jsx detects
 * this shape (presence of `desktopAvif`) and renders it via the original
 * multi-format <picture> technique, rather than the single-URL Cloudinary
 * path real CMS slides use.
 */
export const FALLBACK_SLIDE = {
  id: 'fallback',
  desktopAvif: '/hero-1600.avif',
  desktopWebp: '/hero-1600.webp',
  desktopJpg: '/hero-1600.jpg',
  mobileAvif: '/hero-960.avif',
  mobileWebp: '/hero-960.webp',
};
