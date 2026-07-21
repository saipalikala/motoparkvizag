import { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';

/**
 * useHeroCarouselEngine — wraps Embla's own React hook and exposes the
 * reactive state Controls/Pagination need (Phase 3.2).
 *
 * Method/event names below were verified against the ACTUALLY INSTALLED
 * embla-carousel@8.6.0's own .d.ts (node_modules/embla-carousel/components/
 * EmblaCarousel.d.ts, EventHandler.d.ts) rather than trusted from
 * documentation prose — two different doc examples disagreed with each
 * other (`goTo`/`selectedSnap`/`'reinit'` vs `scrollTo`/`selectedScrollSnap`/
 * `'reInit'`); the installed package's own type definitions are the one
 * source that cannot be stale. `'reInit'` (capital I) is the real event name.
 *
 * `loop: true` — changed from `false` for two reasons:
 *   1. Seamless infinite autoplay: with loop:false, scrollNext() on the last
 *      slide is a no-op, silently stalling the autoplay timer.
 *   2. Premium drag feel: loop:false creates rubber-band resistance at the
 *      first and last slides, which feels cheap on a full-bleed hero carousel.
 *
 * `slideCount` — new parameter (Phase 3.5). Embla measures the DOM once at
 * mount time and does NOT automatically re-initialise when React adds or
 * removes slide nodes inside its container. The fallback→CMS swap in
 * useHeroSlides.js changes the DOM from 1 slideFrame to N after the initial
 * fetch resolves, so without an explicit reInit() call, Embla's internal
 * scrollSnapList stays at length 1 — the root cause of the "single slide"
 * bug. Receiving slideCount as a parameter lets this hook trigger reInit()
 * in a useEffect keyed to that value, exactly once per change, without
 * HeroCarousel needing to touch emblaApi directly.
 */
export function useHeroCarouselEngine(slideCount = 0, options = {}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, duration: 35, ...options });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState([]);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const onSelect = useCallback((api) => {
    setSelectedIndex(api.selectedScrollSnap());
    setCanScrollPrev(api.canScrollPrev());
    setCanScrollNext(api.canScrollNext());
  }, []);

  // Primary lifecycle: read snap list and wire select/reInit listeners.
  useEffect(() => {
    if (!emblaApi) return undefined;

    setScrollSnaps(emblaApi.scrollSnapList());
    onSelect(emblaApi);

    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);

    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Slide-count watcher: whenever the number of slides in the DOM changes,
  // tell Embla to re-measure. This fires once on mount (slideCount goes from
  // 0 → N at the first render), and again if slides are added/removed later
  // (fallback→CMS swap). Reading scrollSnapList() after reInit() is handled
  // by the 'reInit' listener already wired above — no duplicate read needed.
  useEffect(() => {
    if (!emblaApi || slideCount === 0) return;
    emblaApi.reInit();
  }, [emblaApi, slideCount]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index) => emblaApi?.scrollTo(index), [emblaApi]);

  return {
    emblaRef,
    emblaApi,
    selectedIndex,
    scrollSnaps,
    canScrollPrev,
    canScrollNext,
    scrollPrev,
    scrollNext,
    scrollTo,
  };
}
