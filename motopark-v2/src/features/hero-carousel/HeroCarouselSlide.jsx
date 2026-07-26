import { cloudinaryUrl } from '@/lib/image.js';
import styles from './HeroCarouselSlide.module.css';

/**
 * HeroCarouselSlide — Phase 3.3: renders ONE slide's responsive photo, and
 * nothing else (still no text — see Phase 3.2's audit for why: Hero.jsx's
 * copy block is preserved unchanged, so a slide-level heading would create a
 * second, duplicate <h1>).
 *
 * Two possible slide shapes now, told apart by the presence of `desktopAvif`:
 *
 *   1. The bundled fallback (fallbackSlide.js) — pre-generated static
 *      AVIF/WebP/JPG variants, rendered with the original multi-source
 *      <picture> technique (media-query sources, not srcset — the double-
 *      fetch bug that ruled out width-descriptors on the original Hero
 *      applies here too, unchanged).
 *
 *   2. A real CMS slide (services/heroCarousel.js) — a single Cloudinary URL
 *      per breakpoint. There's no separate AVIF/WebP variant to pick between
 *      because Cloudinary already negotiates format automatically
 *      (`fetch_format:"auto"`, baked in at upload time — see
 *      backend/config/cloudinary.js) via cloudinaryUrl()'s `f_auto`. Art
 *      direction (a different photo per breakpoint, not just a different
 *      size of the same photo) still comes from having two distinct STORED
 *      URLs and picking between them by media query — same mechanism as the
 *      original Hero, just without needing explicit `type="image/avif"`
 *      sources for a single already-negotiated URL.
 *
 * `isPrimary` (true only for the carousel's first slide) drives the LCP-safe
 * loading strategy: eager + fetchPriority="high" for the slide actually
 * visible on load, loading="lazy" for every other slide — Embla lays every
 * slide out in the DOM upfront, so without this every slide's image would be
 * requested on page load regardless of visibility.
 *
 * `photoRef` (Phase 3.4) — a callback ref forwarded to the <img> itself, so
 * useEmblaParallax (owned by HeroCarousel.jsx) can write imperative
 * transforms directly to this exact node. Deliberately attached to the
 * <img>, not a separate wrapper: `.picture` is display:contents (no box of
 * its own), so the <img> is already the innermost element with a real box —
 * and it's several levels below `.slideFrame`, the only element Embla's own
 * (non-loop) engine might ever transform, so writing to it here can never
 * collide with Embla's own positioning.
 */
export default function HeroCarouselSlide({ slide, isPrimary = false, photoRef }) {
  const isFallback = Boolean(slide.desktopAvif);

  return (
    <div className={styles.slide}>
      <picture className={styles.picture}>
        {isFallback ? (
          <>
            {slide.mobileAvif && (
              <source type="image/avif" media="(max-width: 767px)" srcSet={slide.mobileAvif} />
            )}
            {slide.desktopAvif && (
              <source type="image/avif" media="(min-width: 768px)" srcSet={slide.desktopAvif} />
            )}
            {slide.mobileWebp && (
              <source type="image/webp" media="(max-width: 767px)" srcSet={slide.mobileWebp} />
            )}
            {slide.desktopWebp && (
              <source type="image/webp" media="(min-width: 768px)" srcSet={slide.desktopWebp} />
            )}
          </>
        ) : (
          slide.mobileImage && (
            <source media="(max-width: 767px)" srcSet={cloudinaryUrl(slide.mobileImage, { w: 960 })} />
          )
        )}
        <img
          ref={photoRef}
          src={isFallback ? slide.desktopJpg : cloudinaryUrl(slide.desktopImage, { w: 1600 })}
          alt={isFallback ? '' : slide.imageAlt || ''}
          className={styles.photo}
          fetchPriority={isPrimary ? 'high' : undefined}
          loading={isPrimary ? undefined : 'lazy'}
          decoding={isPrimary ? 'sync' : 'async'}
          width="1600"
          height="900"
        />
      </picture>
    </div>
  );
}
