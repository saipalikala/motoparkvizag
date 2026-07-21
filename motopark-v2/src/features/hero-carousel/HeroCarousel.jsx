import { useRef } from 'react';
import { useHeroCarouselEngine } from './hooks/useHeroCarouselEngine.js';
import { useEmblaParallax } from './hooks/useEmblaParallax.js';
import { useEmblaAutoplay } from './hooks/useEmblaAutoplay.js';
import HeroCarouselSlide from './HeroCarouselSlide.jsx';
import HeroCarouselPagination from './HeroCarouselPagination.jsx';
import styles from './HeroCarousel.module.css';

/**
 * HeroCarousel — Phase 3.5: production-quality polish on top of the Phase
 * 3.2–3.4 mechanics.
 *
 * Changes vs. Phase 3.4:
 *
 * 1. `slideCount` is now passed to `useHeroCarouselEngine` so it can call
 *    `emblaApi.reInit()` whenever the number of DOM slides changes. This
 *    fixes the "single slide" bug: Embla measures the DOM once at mount,
 *    sees the 1-slide fallback, and stays stuck at 1 snap — even after
 *    useHeroSlides resolves to multiple real CMS slides — until reInit() is
 *    explicitly called. See useHeroCarouselEngine.js for the full rationale.
 *
 * 2. `useEmblaAutoplay` is attached. It owns its own timer and all
 *    pause/resume logic via Embla's event API + DOM pointer events + the
 *    Page Visibility API. Nothing in this component manages autoplay state.
 *    `viewportRef` is a plain React ref whose `.current` is set via the
 *    `ref` callback on the viewport div — it is stable across renders, so
 *    the autoplay hook's effect only re-runs when emblaApi or slideCount
 *    changes, not on every render.
 *
 * 3. `emblaRef` (Embla's container callback ref) and `viewportRef` (for
 *    hover/touch-action) are the SAME element — the `.viewport` div.
 *    Embla needs a callback ref on this element; we also need a stable
 *    React ref to attach DOM event listeners for hover-pause. React allows
 *    an array of refs / a combined callback, but the simplest approach here
 *    is to use `emblaRef` for Embla and a separate `useRef` that is assigned
 *    in the same JSX via a ref callback that calls both.
 *
 * Everything else (HeroScene, scrim, aria structure, LCP image strategy,
 * photo callback-refs for parallax) is UNCHANGED from Phase 3.4.
 */
export default function HeroCarousel({ slides = [] }) {
  // Stable ref for the viewport DOM node — used by useEmblaAutoplay to
  // attach hover-pause listeners without causing effect re-runs on render.
  const viewportRef = useRef(null);

  const {
    emblaRef,
    emblaApi,
    selectedIndex,
    scrollSnaps,
    scrollTo,
  } = useHeroCarouselEngine(slides.length);

  // Collected fresh each render via callback refs on each slide's <img>.
  // See Phase 3.4 for why this reset-per-render pattern is safe for Embla's
  // purposes — and useEmblaParallax.js Phase 3.5 for why the hook now
  // snapshots this array rather than reading it at scroll-event time.
  const slideRefs = useRef([]);
  slideRefs.current = [];

  useEmblaParallax(emblaApi, slideRefs);
  useEmblaAutoplay(emblaApi, viewportRef, slides.length);

  if (!slides.length) return null;

  // Combine Embla's callback ref with our stable viewportRef. Both need to
  // receive the same DOM node. A combining callback ref is the standard
  // React pattern when two refs must point to the same element.
  const setViewportRef = (node) => {
    viewportRef.current = node;
    emblaRef(node);
  };

  const onClick = (e) => {
    if (!emblaApi || !emblaApi.clickAllowed()) return;
    if (e.target.closest('button, a')) return;
    emblaApi.scrollNext();
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.viewport} ref={setViewportRef} aria-hidden="true" onClick={onClick}>
        <div className={styles.container}>
          {slides.map((slide, i) => (
            <div className={styles.slideFrame} key={slide.id ?? i}>
              <HeroCarouselSlide
                slide={slide}
                isPrimary={i === 0}
                photoRef={(el) => {
                  slideRefs.current[i] = el;
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation: pagination dots only — arrows removed per visual refinement.
          Drag/swipe (Embla), autoplay, and dot taps are the navigation mechanisms. */}
      {slides.length > 1 && (
        <HeroCarouselPagination
          count={scrollSnaps.length}
          selectedIndex={selectedIndex}
          onSelect={scrollTo}
        />
      )}
    </div>
  );
}
