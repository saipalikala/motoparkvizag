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
 * `loop: false` — same reasoning as Phase 3.1: no wrap-around discontinuity
 * to handle at this slide count, keeps this phase's scope to mechanics.
 */
export function useHeroCarouselEngine(options = {}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, ...options });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState([]);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const onSelect = useCallback((api) => {
    setSelectedIndex(api.selectedScrollSnap());
    setCanScrollPrev(api.canScrollPrev());
    setCanScrollNext(api.canScrollNext());
  }, []);

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
