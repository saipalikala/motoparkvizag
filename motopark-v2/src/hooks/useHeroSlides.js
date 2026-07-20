import { useEffect, useState } from 'react';
import { getHeroSlides } from '@/services/heroCarousel.js';
import { FALLBACK_SLIDE } from '@/features/hero-carousel/fallbackSlide.js';

/**
 * useHeroSlides — fetches the real CMS-driven hero slides for Hero.jsx.
 *
 * The hero must never be empty (Phase 3.3 requirement), so `slides` starts
 * as — and, on an empty result or a failed fetch, stays as — [FALLBACK_SLIDE].
 * This single fallback deliberately serves THREE states at once:
 *   - loading:  shown immediately, synchronously, before the fetch resolves
 *   - empty:    shown when the fetch resolves with zero eligible slides
 *   - error:    shown when the fetch fails (getHeroSlides() never throws —
 *               it already resolves to [] on failure, so this path is
 *               indistinguishable from "empty" here, by design)
 *
 * Why the fallback renders immediately rather than behind a content-free
 * skeleton: the first slide is the LCP element and carries
 * fetchPriority="high" — the browser's preload scanner must find that <img>
 * in the FIRST render, before any async fetch resolves. A skeleton-then-swap
 * pattern would make LCP wait on a network round trip, which is exactly the
 * regression "preserve LCP" rules out. The bundled fallback IS the loading
 * placeholder, not a separate state.
 *
 * `loading` is still tracked and returned (true only until the initial fetch
 * settles) for accuracy/future use, even though nothing currently branches
 * render output on it — Hero.jsx renders whatever `slides` currently holds
 * either way.
 */
export function useHeroSlides() {
  const [slides, setSlides] = useState(() => [FALLBACK_SLIDE]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getHeroSlides().then((result) => {
      if (!alive) return;
      setSlides(result.length ? result : [FALLBACK_SLIDE]);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  return { slides, loading };
}
