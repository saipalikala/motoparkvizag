import { useRef } from 'react';
import { useHeroCarouselEngine } from './hooks/useHeroCarouselEngine.js';
import { useEmblaParallax } from './hooks/useEmblaParallax.js';
import HeroCarouselSlide from './HeroCarouselSlide.jsx';
import HeroCarouselControls from './HeroCarouselControls.jsx';
import HeroCarouselPagination from './HeroCarouselPagination.jsx';
import styles from './HeroCarousel.module.css';

/**
 * HeroCarousel — Phase 3.4: adds the Embla Parallax image-layer transform on
 * top of the Phase 3.2/3.3 mechanics + CMS data. Renders inside Hero.jsx's
 * existing `.media` layer, replacing ONLY the old static `<picture>` —
 * HeroScene and the scrim remain Hero.jsx's own siblings, unchanged.
 *
 * Accessibility fix, found during this phase's self-review, not introduced
 * by it: Hero.jsx's `.media` wrapper carries `aria-hidden="true"` (correct —
 * the photo layer is decorative). But Controls and Pagination are real,
 * meaningful interactive elements, and they were rendered as children of
 * that same `.media` div, which hid them from the accessibility tree along
 * with the decoration. The fix moves `aria-hidden` from `.media` (Hero.jsx)
 * onto just `.viewport` here — the photo track specifically — leaving
 * Controls/Pagination (siblings of `.viewport`, not descendants) reachable.
 *
 * Deliberately absent — by design: GSAP (zero call sites, ever), a second
 * parallax algorithm (this uses the one official technique, adapted to this
 * codebase's px-bleed convention — see useEmblaParallax.js), any change to
 * HeroScene itself (verified its layering still holds, see Phase 3.4 report).
 */
export default function HeroCarousel({ slides = [] }) {
  const {
    emblaRef,
    emblaApi,
    selectedIndex,
    scrollSnaps,
    canScrollPrev,
    canScrollNext,
    scrollPrev,
    scrollNext,
    scrollTo,
  } = useHeroCarouselEngine();

  // Collected fresh each render via callback refs on each slide's <img> —
  // the standard React pattern for a dynamic-length list of refs. Resetting
  // here (not in an effect) is safe: nothing reads this ref DURING render,
  // only useEmblaParallax's effect/event handlers, later.
  const slideRefs = useRef([]);
  slideRefs.current = [];

  useEmblaParallax(emblaApi, slideRefs);

  if (!slides.length) return null;

  return (
    <div className={styles.wrap}>
      <div className={styles.viewport} ref={emblaRef} aria-hidden="true">
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

      {slides.length > 1 && (
        <>
          <HeroCarouselControls
            onPrev={scrollPrev}
            onNext={scrollNext}
            canPrev={canScrollPrev}
            canNext={canScrollNext}
          />
          <HeroCarouselPagination
            count={scrollSnaps.length}
            selectedIndex={selectedIndex}
            onSelect={scrollTo}
          />
        </>
      )}
    </div>
  );
}
