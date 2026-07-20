import { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import Button from '@/components/ui/Button.jsx';
import { useCinematicHero } from '@/hooks/useCinematicHero.js';
import { useHeroSlides } from '@/hooks/useHeroSlides.js';
import HeroCarousel from '@/features/hero-carousel/HeroCarousel.jsx';
import styles from './Hero.module.css';

/**
 * The decorative WebGL layer (docs/10 Amendment 1). Dynamic import ONLY — a
 * static one would merge src/cinematic/ into the bundle every shopper downloads
 * and fail `npm run build` (docs/11 §7b).
 *
 * The `.catch` is the kill-switch: a deleted folder or a chunk that fails to
 * load renders nothing instead of throwing a blank page into the hero. Test it
 * by literally deleting src/cinematic/ and confirming the storefront still
 * builds and works.
 */
const HeroScene = lazy(() =>
  import('@/cinematic/HeroScene.jsx').catch(() => ({ default: () => null })),
);

/**
 * CMS CTA URLs can be an in-page anchor (`#trust` — only ever produced by the
 * bundled fallback's own copy, preserved from before this migration), an
 * internal route (`/store`), or in principle an external URL. Each needs a
 * different link mechanism — react-router's `Link` doesn't reliably drive a
 * same-page anchor scroll, and `#`/`/`-prefixed values aren't real routes to
 * navigate to. Kept as a small standalone helper rather than inlined twice
 * (once per CTA slot).
 */
function ctaLinkProps(url) {
  if (url.startsWith('#')) return { as: 'a', href: url };
  if (url.startsWith('/')) return { as: Link, to: url };
  return { as: 'a', href: url, target: '_blank', rel: 'noopener noreferrer' };
}

/**
 * Homepage Hero — Concept C "Cinematic Hybrid" (docs/10 §C-5).
 * Navy-800 cinematic frame over a warm-lit photograph carousel, headline
 * bottom-left, dual CTA. The product ticker that used to live here was
 * removed — Campaigns now own promotional content on the homepage, and the
 * Hero no longer renders product cards.
 *
 * Headline/subtitle/CTAs are CMS-driven from the carousel's first/primary
 * slide (the same slide the LCP/eager-image treatment already targets) —
 * not per-slide-synced to whichever slide the carousel is currently showing
 * (that would be a real feature addition, not an implementation fix, and
 * wasn't asked for). A field that's absent on that slide renders nothing;
 * there is no hardcoded fallback copy anymore. In practice `headline` and
 * `primaryCta` are enforced as required at both the admin form and the
 * backend schema, so the "render nothing" branches for those two are a
 * defensive backstop, not something that fires in normal operation — the
 * bundled bundled fallback slide (fallbackSlide.js) carries the ORIGINAL
 * hardcoded copy as real data now, precisely so the hero never goes
 * text-empty while still honoring "no placeholder text" for real CMS slides
 * that a slide genuinely lacks.
 */
export default function Hero() {
  // false until: eligible AND LCP observed AND the browser went idle.
  const showScene = useCinematicHero();
  const { slides } = useHeroSlides();
  const primary = slides[0];

  return (
    <section className={`${styles.hero} ${styles.heroOffset}`} aria-label="Welcome to MotoPark">
      {/* Cinematic media layer — navy base + warm photo + scrim for AA text.
          Paths are STATIC (public/), not JS imports: the preload scanner must be
          able to start this fetch from raw HTML, before any bundle executes.
          index.html carries a matching <link rel="preload">. Regenerate the
          variants with `npm run images` (scripts/generate-hero-images.mjs). */}
      {/* No aria-hidden on this wrapper — HeroCarousel contains real
          Controls/Pagination alongside the decorative photo track, and a
          blanket aria-hidden here would hide those from the accessibility
          tree too. Each decorative piece hides itself instead: HeroCarousel's
          own .viewport, HeroScene's own canvas (already self-hiding), and
          .scrim below. */}
      <div className={styles.media}>
        <HeroCarousel slides={slides} />
        {/* Decorative canvas sits BETWEEN the photo and the scrim. That ordering
            is a contrast guarantee, not a stacking accident: the scrim is painted
            over whatever this renders, so the headline's AA contrast holds no
            matter what the shader eventually does. Do not hoist it above the
            scrim. `fallback={null}` because the hero must be complete without it
            (Amendment 1 condition 5) — there is nothing to spin for. */}
        {showScene && (
          <Suspense fallback={null}>
            <HeroScene />
          </Suspense>
        )}
        <div className={styles.scrim} aria-hidden="true" />
      </div>

      <div className={`container ${styles.inner}`}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>
            <ShieldCheck size={15} strokeWidth={2} aria-hidden="true" />
            Genuine gear · Est. 2020 · Vizag → Pan-India
          </p>
          {primary?.headline && (
            <h1 className={`display ${styles.headline}`}>{primary.headline}</h1>
          )}
          {primary?.subtitle && <p className={styles.subline}>{primary.subtitle}</p>}
          {(primary?.primaryCta?.label && primary?.primaryCta?.url) ||
          (primary?.secondaryCta?.label && primary?.secondaryCta?.url) ? (
            <div className={styles.ctas}>
              {primary?.primaryCta?.label && primary?.primaryCta?.url && (
                <Button {...ctaLinkProps(primary.primaryCta.url)} variant="primary" size="lg">
                  {primary.primaryCta.label}
                  <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
                </Button>
              )}
              {primary?.secondaryCta?.label && primary?.secondaryCta?.url && (
                <Button {...ctaLinkProps(primary.secondaryCta.url)} variant="outline" size="lg" onDark>
                  {primary.secondaryCta.label}
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
