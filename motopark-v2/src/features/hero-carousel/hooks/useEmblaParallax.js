import { useEffect, useRef } from 'react';
import { MOTION_QUERIES, isCinematicEligible } from '@/lib/motionEligibility.js';

/**
 * useEmblaParallax — Phase 3.4: the official Embla Parallax technique
 * (per-slide diffToTarget from Embla's own scrollProgress, tweened through a
 * factor, applied as an imperative transform on the image layer only — never
 * on the slide container Embla itself may transform). Adapted to this
 * codebase's px-based bleed-room convention (matching the retired
 * useHeroParallax.js's --parallax-room) rather than the reference's
 * percentage output — same algorithm, same unit convention this project
 * already uses.
 *
 * Gated by isCinematicEligible() — the SAME gate every other motion feature
 * here reads (Lenis, HeroScene, the retired useHeroParallax). Below that line
 * (touch, narrow viewport, prefers-reduced-motion), this hook attaches its
 * listeners but never writes a transform — Embla's own drag-to-navigate is
 * NEVER gated by this, only the decorative parallax riding on top of it.
 *
 * `slideRefs` is a ref to a plain array of the per-slide photo <img> nodes,
 * owned and populated by the caller (HeroCarousel.jsx) via callback refs —
 * this hook only reads it, never allocates or owns the array itself.
 */

/** Max px the photo may shift either direction. MUST be <= the bleed room
 *  reserved in HeroCarouselSlide.module.css's --h-parallax-room (56px there,
 *  a small safety margin over this clamp, not an exact-equality contract). */
const PARALLAX_ROOM = 48;

export function useEmblaParallax(emblaApi, slideRefs) {
  const enabledRef = useRef(false);
  const slideStateRef = useRef({}); // index -> { lastTranslate, promoted }

  useEffect(() => {
    if (!emblaApi) return undefined;

    let tweenFactor = 0;

    const setTweenFactor = () => {
      tweenFactor = PARALLAX_ROOM * emblaApi.scrollSnapList().length;
    };

    /** Writes (or skips) one slide's transform. Mirrors useHeroParallax's
     *  exact safety properties: a slide at rest is left completely alone —
     *  no transform, no will-change, no compositor promotion, because
     *  promoting the LCP image before it has painted is a real risk to the
     *  metric this hero is measured on. will-change is added on FIRST
     *  ACTUAL move, never at mount. Sub-pixel changes are skipped — they're
     *  invisible and still cost a compositor commit. */
    const applyTranslate = (index, translate) => {
      const node = slideRefs.current[index];
      if (!node) return;

      const state = (slideStateRef.current[index] ??= { lastTranslate: null, promoted: false });

      if (!state.promoted && translate === 0) {
        state.lastTranslate = 0;
        return;
      }
      if (state.lastTranslate !== null && Math.abs(translate - state.lastTranslate) < 0.5) return;
      state.lastTranslate = translate;

      if (!state.promoted) {
        node.style.willChange = 'transform';
        state.promoted = true;
      }
      node.style.transform = `translate3d(${translate.toFixed(2)}px, 0, 0)`;
    };

    const clearAll = () => {
      slideRefs.current.forEach((node, index) => {
        if (!node) return;
        node.style.transform = '';
        node.style.willChange = '';
        slideStateRef.current[index] = { lastTranslate: null, promoted: false };
      });
    };

    /** Per Embla's own reference tween: only slides currently in view get
     *  recomputed on a 'scroll' tick — off-screen slides are skipped and
     *  only updated on 'reInit', matching the official technique's
     *  in-view-only optimisation (and this project's own "don't do
     *  compositor work off-screen" convention from HeroScene). */
    const tweenParallax = (_api, evt) => {
      if (!enabledRef.current) return;

      const scrollProgress = emblaApi.scrollProgress();
      const slidesInView = emblaApi.slidesInView();
      const isScrollEvent = evt?.type === 'scroll';

      emblaApi.scrollSnapList().forEach((scrollSnap, index) => {
        if (isScrollEvent && !slidesInView.includes(index)) return;

        const diffToTarget = scrollSnap - scrollProgress;
        const raw = diffToTarget * tweenFactor * -1;
        const translate = Math.max(-PARALLAX_ROOM, Math.min(PARALLAX_ROOM, raw));
        applyTranslate(index, translate);
      });
    };

    /** Eligibility can flip mid-session — resize, docking a tablet, toggling
     *  reduced-motion. Re-evaluate rather than latch, same as every other
     *  motionEligibility consumer in this codebase. */
    const sync = () => {
      const next = isCinematicEligible();
      if (next === enabledRef.current) return;
      enabledRef.current = next;
      if (next) {
        setTweenFactor();
        tweenParallax(emblaApi);
      } else {
        clearAll();
      }
    };

    setTweenFactor();
    sync();

    emblaApi.on('reInit', setTweenFactor);
    emblaApi.on('reInit', tweenParallax);
    emblaApi.on('scroll', tweenParallax);

    const queries = MOTION_QUERIES.map((q) => window.matchMedia(q));
    queries.forEach((q) => q.addEventListener('change', sync));

    return () => {
      emblaApi.off('reInit', setTweenFactor);
      emblaApi.off('reInit', tweenParallax);
      emblaApi.off('scroll', tweenParallax);
      queries.forEach((q) => q.removeEventListener('change', sync));
      clearAll();
    };
  }, [emblaApi, slideRefs]);
}
