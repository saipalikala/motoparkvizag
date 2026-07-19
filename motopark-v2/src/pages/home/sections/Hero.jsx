import { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import Button from '@/components/ui/Button.jsx';
import { formatINR } from '@/lib/format.js';
import { cloudinaryUrl } from '@/lib/image.js';
import { useCinematicHero } from '@/hooks/useCinematicHero.js';
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
 * Homepage Hero — Concept C "Cinematic Hybrid" (docs/10 §C-5).
 * Navy-800 cinematic frame over a warm-lit photograph, headline bottom-left,
 * dual CTA, and a slim SHOPPABLE product ticker peeking into the fold (3 cards
 * = products reachable in viewport #1, Commerce Law 1). Static image only — no
 * hero video in this pass (Motion Doctrine: video is a later, guarded add).
 *
 * Props:
 *   products — up to 3 UI-ready cards ({ id, name, brand, priceINR, image, url })
 *   loading  — show skeleton ticker while home-data resolves
 */
export default function Hero({ products = [], loading = false }) {
  const ticker = products.slice(0, 3);
  // false until: eligible AND LCP observed AND the browser went idle.
  const showScene = useCinematicHero();

  return (
    <section className={styles.hero} aria-label="Welcome to MotoPark">
      {/* Cinematic media layer — navy base + warm photo + scrim for AA text.
          Paths are STATIC (public/), not JS imports: the preload scanner must be
          able to start this fetch from raw HTML, before any bundle executes.
          index.html carries a matching <link rel="preload">. Regenerate the
          variants with `npm run images` (scripts/generate-hero-images.mjs). */}
      <div className={styles.media} aria-hidden="true">
        {/* Selection is by MEDIA QUERY, never srcset width-descriptors. With
            w-descriptors the preload scanner and the layout engine compute the
            needed width independently and can disagree — measured: scanner took
            hero-960 at 11ms, the <img> then took hero-1280 at 170ms, i.e. the
            LCP image downloaded TWICE. A media query is a boolean both evaluate
            identically, so index.html's preload can never diverge from this.
            Keep the breakpoints here and in index.html in lockstep. */}
        <picture className={styles.picture}>
          <source type="image/avif" media="(max-width: 767px)" srcSet="/hero-960.avif" />
          <source type="image/avif" media="(min-width: 768px)" srcSet="/hero-1600.avif" />
          <source type="image/webp" media="(max-width: 767px)" srcSet="/hero-960.webp" />
          <source type="image/webp" media="(min-width: 768px)" srcSet="/hero-1600.webp" />
          <img
            src="/hero-1600.jpg"
            alt=""
            className={styles.photo}
            fetchPriority="high"
            decoding="async"
            width="1600"
            height="900"
          />
        </picture>
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
        <div className={styles.scrim} />
      </div>

      <div className={`container ${styles.inner}`}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>
            <ShieldCheck size={15} strokeWidth={2} aria-hidden="true" />
            Genuine gear · Est. 2020 · Vizag → Pan-India
          </p>
          <h1 className={`display ${styles.headline}`}>
            Gear for every ride.
          </h1>
          <p className={styles.subline}>
            Helmets, riding gear, protection and parts — genuine brands only,
            picked by riders and shipped from Vizag across India.
          </p>
          <div className={styles.ctas}>
            <Button as={Link} to="/store" variant="primary" size="lg">
              Shop the gear
              <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
            </Button>
            <Button as="a" href="#trust" variant="outline" size="lg" onDark>
              Why riders choose us
            </Button>
          </div>
        </div>

        {/* Shoppable ticker — the fold's product access */}
        <div className={styles.ticker} aria-label="Featured products">
          {loading && ticker.length === 0
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={styles.tickCard} aria-hidden="true">
                  <div className={`skeleton ${styles.tickThumb}`} />
                  <div className={styles.tickBody}>
                    <div className={`skeleton ${styles.tickLineSm}`} />
                    <div className={`skeleton ${styles.tickLine}`} />
                    <div className={`skeleton ${styles.tickLineSm}`} />
                  </div>
                </div>
              ))
            : ticker.map((p) => (
                <Link key={p.id} to={p.url} className={styles.tickCard}>
                  <div className={styles.tickThumb}>
                    {p.image ? (
                      <img
                        src={cloudinaryUrl(p.image, { w: 160 })}
                        alt={p.name}
                        loading="lazy"
                        decoding="async"
                        width="72"
                        height="90"
                      />
                    ) : (
                      <span className={styles.tickFallback} aria-hidden="true">
                        MP
                      </span>
                    )}
                  </div>
                  <div className={styles.tickBody}>
                    {p.brand && <span className={styles.tickBrand}>{p.brand}</span>}
                    <span className={styles.tickName}>{p.name}</span>
                    <span className={`price ${styles.tickPrice}`}>
                      {formatINR(p.priceINR)}
                    </span>
                  </div>
                </Link>
              ))}
        </div>
      </div>
    </section>
  );
}
