/**
 * The bundled Hero fallback — rendered when the CMS returns no eligible
 * slides, or the request fails, or (see hooks/useHeroSlides.js) while the
 * initial fetch is still in flight. This is NOT temporary placeholder data —
 * it's a permanent, deliberate part of the production render path: the hero
 * must never be empty.
 *
 * Carries the ORIGINAL Hero copy (headline/subtitle/CTAs) as real data, not
 * hardcoded JSX in Hero.jsx anymore — Hero.jsx now renders headline/subtitle/
 * CTAs entirely from the carousel's primary slide, with no fallback text of
 * its own, so this object is what keeps that copy alive during loading/
 * empty/error states. A real CMS slide that genuinely omits a field still
 * renders nothing for it — this object simply always has one.
 *
 * Images reuse the exact same real, already-optimized static assets the
 * ORIGINAL single-image Hero used before this migration (/hero-960.*,
 * /hero-1600.*). index.html's fetchpriority="high" preload is keyed to
 * these exact paths — this is what keeps that preload meaningful.
 * HeroCarouselSlide.jsx detects this shape (presence of `desktopAvif`) and
 * renders it via the original multi-format <picture> technique, rather than
 * the single-URL Cloudinary path real CMS slides use.
 */
export const FALLBACK_SLIDE = {
  id: 'fallback',
  desktopAvif: '/hero-1600.avif',
  desktopWebp: '/hero-1600.webp',
  desktopJpg: '/hero-1600.jpg',
  mobileAvif: '/hero-960.avif',
  mobileWebp: '/hero-960.webp',
  headline: 'Gear for every ride.',
  subtitle:
    'Helmets, riding gear, protection and parts — genuine brands only, picked by riders and shipped from Vizag across India.',
  primaryCta: { label: 'Shop the gear', url: '/store' },
  secondaryCta: { label: 'Why riders choose us', url: '#trust' },
};
