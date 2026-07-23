/**
 * storyBandConfig.js — ALL cinematic StoryBand configuration in one place.
 *
 * ─── Video asset ───────────────────────────────────────────────────────────
 *
 * VIDEO_SRC points at a local path that has not been delivered yet. Until the
 * real file lands at public/story-cinematic.mp4, the <video> errors on load
 * and StoryBandCinematic's load-gate reports failure — StoryBand.jsx then
 * keeps showing the static fallback, exactly as it does on mobile or with
 * reduced motion. No placeholder/stock footage is used (docs/10 Amendment 2).
 */
export const VIDEO_SRC = '/story-cinematic.mp4';
/** Reuses the existing hero photo until a dedicated poster frame is supplied. */
export const VIDEO_POSTER = '/hero-1600.jpg';

/**
 * The wordmark cut into the mask. Fixed brand copy, not the page's headline
 * sentence — this is the "MOTOPARK" example from the reference spec, applied
 * to our own brand.
 */
export const MASK_TEXT = 'MOTOPARK';

export const SCROLL_CONFIG = {
  scrollHeight: '400vh',
  scrub: true,
  start: 'top top',
  pin: false, // CSS `position: sticky` keeps the viewport on screen instead
};

/**
 * Progress breakpoints [0, 1] for the scroll-driven mask reveal.
 *   0%   –85%: mask scales MASK_SCALE.from → MASK_SCALE.to, video revealed
 *              only through the letterforms.
 *   85%  –95%: the navy overlay carrying the mask fades to fully transparent
 *              — "near 90%+", per spec — leaving clean, unmasked fullscreen
 *              video with no lingering letter-edge artefacts.
 *   90%  –100%: eyebrow + Rider Disciplines fade in over the now-clean video.
 */
export const PHASES = {
  revealEnd: 0.85,
  fadeEnd: 0.95,
  contentStart: 0.9,
};

/** Mask <text> scale range. 20–30x per spec; 26x is the chosen midpoint. */
export const MASK_SCALE = { from: 1, to: 26 };
