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
 * Phase 3.5 correction — slideRefs snapshot stability:
 *
 * `HeroCarousel.jsx` resets `slideRefs.current = []` on every render
 * (the standard React pattern for a variable-length callback-ref list) and
 * then re-populates it during the same render's JSX evaluation via the
 * `photoRef` callback on each <img>. In React 19's concurrent renderer,
 * a render can be interrupted and restarted, and an Embla 'scroll' event
 * can fire on the main thread BETWEEN the `slideRefs.current = []` line and
 * the callback-refs re-populating it. During that interstitial, every entry
 * in `slideRefs.current` is undefined — the parallax handler writes nothing,
 * and the images snap back to their CSS default (translateX: 0) for one
 * frame before the next write corrects them, producing a visible flash.
 *
 * Fix: inside the effect, capture the current array into a local `nodes`
 * variable at effect-setup time (after Embla mounts / reInits, which is
 * also after the DOM has settled). The scroll handler and all other inner
 * functions reference `nodes` (stable for the lifetime of this effect run),
 * not `slideRefs.current` (which can be [] mid-render). When the carousel
 * reInits (slides added/removed), the effect re-runs (emblaApi changes) and
 * re-snapshots. This eliminates the interstitial race without changing the
 * parallax algorithm or the callback-ref pattern in HeroCarousel.jsx.
 *
 * All other Phase 3.4 behaviour (eligibility gate, tweenFactor, PARALLAX_ROOM
 * clamp, will-change promotion, unconditional per-tick write) is unchanged.
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

    // ── Snapshot the node list at effect-setup time (Phase 3.5) ───────────
    // Re-captured on every effect run (i.e., whenever emblaApi changes,
    // which includes reInit). By the time this effect runs, the DOM is
    // committed and `slideRefs.current` is fully populated — safe to capture.
    let nodes = slideRefs.current.slice();

    const setTweenFactor = () => {
      tweenFactor = PARALLAX_ROOM * emblaApi.scrollSnapList().length;
    };

    const promoteAll = () => {
      nodes.forEach((node) => {
        if (node) node.style.willChange = 'transform';
      });
    };

    const clearAll = () => {
      nodes.forEach((node) => {
        if (!node) return;
        node.style.transform = '';
        node.style.willChange = '';
      });
    };

    /** Per the official reference: only slides currently in view get
     *  recomputed on a 'scroll' tick — off-screen slides are skipped and
     *  only updated on 'reInit'. Every in-view slide's transform is written
     *  unconditionally, no skip, matching the reference exactly.
     *  Reads `nodes` (stable snapshot), not `slideRefs.current` (volatile). */
    const tweenParallax = (_api, evt) => {
      if (!enabledRef.current) return;

      const scrollProgress = emblaApi.scrollProgress();
      const slidesInView = emblaApi.slidesInView();
      const isScrollEvent = evt?.type === 'scroll';

      emblaApi.scrollSnapList().forEach((scrollSnap, index) => {
        if (isScrollEvent && !slidesInView.includes(index)) return;

        const node = nodes[index];
        if (!node) return;

        const diffToTarget = scrollSnap - scrollProgress;
        const raw = diffToTarget * tweenFactor * -1;
        const translate = Math.max(-PARALLAX_ROOM, Math.min(PARALLAX_ROOM, raw));
        node.style.transform = `translate3d(${translate.toFixed(2)}px, 0, 0)`;
      });
    };

    /** One combined reInit handler — recompute scale factor, re-snapshot
     *  the node list (new slides may have been added), re-promote, resync. */
    const onReInit = () => {
      // Re-snapshot after reInit because the DOM has new/updated slide nodes.
      nodes = slideRefs.current.slice();
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
