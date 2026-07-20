import { useEffect, useRef } from 'react';
import { MOTION_QUERIES, isCinematicEligible } from '@/lib/motionEligibility.js';

/**
 * useEmblaParallax — the official Embla Parallax technique (per-slide
 * diffToTarget from Embla's own scrollProgress, tweened through a factor,
 * applied as an imperative transform on the image layer only — never on the
 * slide container Embla itself may transform). Adapted to this codebase's
 * px-based bleed-room convention (matching the retired page-scroll
 * useHeroParallax.js's --parallax-room) rather than the reference's
 * percentage output — same algorithm, same unit convention this project
 * already uses.
 *
 * Final-review correction: an earlier version of this hook added a
 * sub-pixel-change skip guard and deferred `will-change` promotion to the
 * first actual move — neither exists in the official reference, and re-
 * auditing against it directly (not just against memory of it) surfaced
 * both as the cause of the reported jerkiness, not a smoothing measure:
 *
 *   - The skip guard discarded ticks whose delta was under 0.5px. During a
 *     slow, precise drag, several consecutive ticks can legitimately have
 *     sub-pixel deltas — skipping them let Embla's own slide-position
 *     transform (untouched, always smooth) drift visibly ahead of this
 *     hook's image transform, which would then "catch up" in a small jump
 *     once the accumulated delta finally cleared the threshold.
 *   - Deferring `will-change: transform` to the first non-zero write meant
 *     the ONE-TIME cost of promoting the image to its own compositor layer
 *     landed at the exact moment a user started dragging — the worst
 *     possible time for a hitch. That deferral pattern is correct on the
 *     retired page-scroll hook, where the first transform could fire during
 *     initial page load and compete with the LCP measurement. It buys
 *     nothing here: this hook's first transform can only ever fire once a
 *     user is actively dragging the carousel, which is necessarily well
 *     after LCP has already been recorded.
 *
 * Both removed. The transform is now written unconditionally every tick,
 * matching the reference exactly; `will-change` is promoted eagerly, once,
 * the moment the hook becomes eligible (and again on `reInit`, so slides
 * added later — e.g. the fallback-to-real-CMS swap — are promoted too).
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

  useEffect(() => {
    if (!emblaApi) return undefined;

    let tweenFactor = 0;

    const setTweenFactor = () => {
      tweenFactor = PARALLAX_ROOM * emblaApi.scrollSnapList().length;
    };

    const promoteAll = () => {
      slideRefs.current.forEach((node) => {
        if (node) node.style.willChange = 'transform';
      });
    };

    const clearAll = () => {
      slideRefs.current.forEach((node) => {
        if (!node) return;
        node.style.transform = '';
        node.style.willChange = '';
      });
    };

    /** Per the official reference: only slides currently in view get
     *  recomputed on a 'scroll' tick — off-screen slides are skipped and
     *  only updated on 'reInit'. Every in-view slide's transform is written
     *  unconditionally, no skip, matching the reference exactly. */
    const tweenParallax = (_api, evt) => {
      if (!enabledRef.current) return;

      const scrollProgress = emblaApi.scrollProgress();
      const slidesInView = emblaApi.slidesInView();
      const isScrollEvent = evt?.type === 'scroll';

      emblaApi.scrollSnapList().forEach((scrollSnap, index) => {
        if (isScrollEvent && !slidesInView.includes(index)) return;

        const node = slideRefs.current[index];
        if (!node) return;

        const diffToTarget = scrollSnap - scrollProgress;
        const raw = diffToTarget * tweenFactor * -1;
        const translate = Math.max(-PARALLAX_ROOM, Math.min(PARALLAX_ROOM, raw));
        node.style.transform = `translate3d(${translate.toFixed(2)}px, 0, 0)`;
      });
    };

    /** One combined reInit handler (not three separate subscriptions) —
     *  recompute the scale factor, re-promote any newly-added slide nodes,
     *  then resync every slide's resting position. */
    const onReInit = () => {
      setTweenFactor();
      if (enabledRef.current) promoteAll();
      tweenParallax(emblaApi);
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
        promoteAll();
        tweenParallax(emblaApi);
      } else {
        clearAll();
      }
    };

    setTweenFactor();
    sync();

    emblaApi.on('reInit', onReInit);
    emblaApi.on('scroll', tweenParallax);

    const queries = MOTION_QUERIES.map((q) => window.matchMedia(q));
    queries.forEach((q) => q.addEventListener('change', sync));

    return () => {
      emblaApi.off('reInit', onReInit);
      emblaApi.off('scroll', tweenParallax);
      queries.forEach((q) => q.removeEventListener('change', sync));
      clearAll();
    };
  }, [emblaApi, slideRefs]);
}
