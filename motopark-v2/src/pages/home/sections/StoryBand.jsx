import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import styles from './StoryBand.module.css';

/**
 * StoryBand's own eligibility, deliberately separate from
 * `@/lib/motionEligibility.js`'s `isCinematicEligible()`.
 *
 * That shared gate hard-disables on `prefers-reduced-motion: reduce` — correct
 * for the WebGL hero (Amendment 1 condition 7) and for Lenis, neither of
 * which this file touches. StoryBand's owner decision (2026-07-23) is
 * narrower and different: reduced motion should tone the cinematic layer
 * down, not replace it with a different (static) design. So the DESKTOP
 * check below decides whether `StoryBandCinematic` mounts at all, and
 * reduced-motion is instead passed down as a prop that the cinematic
 * component uses to pick a non-scroll-jacking presentation of the exact
 * same video/mask/content — see `reducedMotion` in StoryBandCinematic.jsx.
 */
const DESKTOP_QUERIES = ['(min-width: 1024px)', '(pointer: fine)'];
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function isDesktop() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return DESKTOP_QUERIES.every((q) => window.matchMedia(q).matches);
}

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * HERO_NOTCH_PATH — Single source of truth for the architectural hero frame notch.
 * Expressed in normalized objectBoundingBox coordinates (0 to 1) for 100% fluid scaling.
 *
 * Architectural Decision Note:
 * SVG clipPath + Vector Stroke is used over CSS mask/clip-path because standard CSS masks
 * cannot trace a sharp 1.5px hairline outline around non-rectangular concave shapes without
 * blur artifacts. The SVG vectorEffect="non-scaling-stroke" provides subpixel anti-aliasing
 * and a continuous 1.5px outline across all viewport widths.
 */
const HERO_NOTCH_PATH =
  'M 0,0.05 C 0,0.01 0.01,0 0.04,0 L 0.74,0 C 0.78,0 0.80,0.02 0.80,0.06 L 0.80,0.10 C 0.80,0.14 0.82,0.16 0.86,0.16 L 0.94,0.16 C 0.98,0.16 1,0.18 1,0.22 L 1,0.94 C 1,0.98 0.98,1 0.94,1 L 0.04,1 C 0.01,1 0,0.98 0,0.94 Z';

const EYEBROW = 'Every ride counts';
const HEADLINE = 'From the daily commute to the cross-country adventure.';
const LEDE =
  'MotoPark celebrates every ride — and stocks the genuine gear that makes each one safer, more comfortable, and memorable.';

const JOURNEYS = [
  {
    num: '01',
    id: 'commute',
    title: 'The daily commute',
    tagline: 'Urban Precision',
    copy: 'Reliable gear that turns everyday city traffic into the best part of your day.',
  },
  {
    num: '02',
    id: 'escape',
    title: 'The weekend escape',
    tagline: 'Mountain Curves',
    copy: 'Comfort and protection for the roads you chase when the work week ends.',
  },
  {
    num: '03',
    id: 'adventure',
    title: 'The cross-country adventure',
    tagline: 'Endless Horizons',
    copy: 'Kit built to go the distance, wherever the map runs out.',
  },
];

/**
 * The cinematic video text-mask reveal layer (docs/10 Amendment 2 — narrowly
 * scoped to this section; every other section stays under the standing
 * Motion Doctrine; Amendment 3, 2026-07-23, further narrows how reduced-
 * motion applies here specifically — see the note above). Dynamic import
 * ONLY, same rule as Hero's HeroScene: a static import would merge gsap into
 * every shopper's bundle and fail `npm run build` (docs/11 §7b,
 * scripts/check-budgets.mjs).
 *
 * `.catch` is the kill switch: a deleted folder or a failed chunk fetch
 * resolves to a component that reports itself unavailable and renders
 * nothing, so StoryBand falls back to the static layout below instead of
 * breaking. The chunk is requested whenever `attemptCinematic` is true —
 * desktop with a fine pointer — regardless of reduced-motion.
 */
function StoryBandCinematicUnavailable({ onUnavailable }) {
  useEffect(() => {
    onUnavailable();
  }, [onUnavailable]);
  return null;
}

const StoryBandCinematic = lazy(() =>
  import('@/cinematic/storyband/StoryBandCinematic.jsx').catch(() => ({
    default: StoryBandCinematicUnavailable,
  })),
);

export default function StoryBand() {
  const [desktop, setDesktop] = useState(() => isDesktop());
  const [reducedMotion, setReducedMotion] = useState(() => prefersReducedMotion());
  const [cinematicActive, setCinematicActive] = useState(false);
  const [cinematicBlocked, setCinematicBlocked] = useState(false);

  // Both can flip mid-session — resize across 1024px, dock/undock a mouse,
  // toggle the OS reduced-motion setting. Re-run rather than latch (mirrors
  // useSmoothScroll).
  useEffect(() => {
    const queries = [...DESKTOP_QUERIES, REDUCED_MOTION_QUERY].map((q) => window.matchMedia(q));
    const sync = () => {
      const nextDesktop = isDesktop();
      setDesktop(nextDesktop);
      setReducedMotion(prefersReducedMotion());
      if (!nextDesktop) setCinematicActive(false);
    };
    queries.forEach((q) => q.addEventListener('change', sync));
    return () => queries.forEach((q) => q.removeEventListener('change', sync));
  }, []);

  // Desktop only — mobile keeps the static layout as its own optimisation
  // (touch scroll physics and a 400vh scroll track don't mix well, and
  // nothing here was asked to change on mobile). Reduced-motion no longer
  // gates mounting at all; it's forwarded to StoryBandCinematic instead.
  const attemptCinematic = desktop && !cinematicBlocked;

  // Stable across renders so StoryBandCinematic's load-gate effect (keyed on
  // these) doesn't re-subscribe on every StoryBand render.
  const handleReady = useCallback(() => setCinematicActive(true), []);
  const handleUnavailable = useCallback(() => {
    setCinematicBlocked(true);
    setCinematicActive(false);
  }, []);

  return (
    <section className={styles.band} aria-labelledby="story-title">
      {/* Hidden SVG definition for responsive objectBoundingBox clipPath */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <clipPath id="heroArchitecturalNotch" clipPathUnits="objectBoundingBox">
            <path d={HERO_NOTCH_PATH} />
          </clipPath>
        </defs>
      </svg>

      {/* Always the accessible source of truth — never unmounted, never
          aria-hidden. Visually hidden (not display:none) once the cinematic
          layer is confirmed active, so screen-reader/no-JS/crawler behaviour
          is identical whether or not the decorative layer loads. */}
      <div className={`container ${styles.inner} ${cinematicActive ? styles.visuallyHidden : ''}`}>
        {/* Stage 1: Monumental Hero Spread (Art-Directed Canvas) */}
        <div className={styles.heroStage}>
          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>{EYEBROW}</p>
            <h2 id="story-title" className={`display ${styles.title}`}>
              {HEADLINE}
            </h2>
            <p className={styles.lede}>{LEDE}</p>
          </div>

          <div className={styles.heroFrame}>
            <img
              src="/hero-1600.jpg"
              alt="Motorcyclist riding on an open highway"
              className={styles.photo}
              loading="lazy"
              decoding="async"
              width="1600"
              height="900"
            />
            <div className={styles.overlay} aria-hidden="true" />
            
            {/* Seamless 1.5px non-scaling border overlay */}
            <svg
              className={styles.frameBorder}
              viewBox="0 0 1 1"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d={HERO_NOTCH_PATH}
                fill="none"
                stroke="rgb(255 255 255 / 0.18)"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
        </div>

        {/* Stage 2: Light Supporting Journeys (Editorial Highlights) */}
        <div className={styles.journeysSection}>
          <p className={styles.journeysHeader}>Rider Disciplines</p>
          <div className={styles.journeysGrid}>
            {JOURNEYS.map((j) => (
              <div key={j.id} className={styles.journeyItem}>
                <div className={styles.journeyMeta}>
                  <span className={styles.journeyNumber}>{j.num}</span>
                  <span className={styles.journeyTagline}>{j.tagline}</span>
                </div>
                <h3 className={styles.journeyTitle}>{j.title}</h3>
                <p className={styles.journeyCopy}>{j.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Decorative cinematic layer. Desktop only; never requested on mobile.
          Suspense fallback is null because the static content above is
          already fully visible underneath while the chunk and then the
          video asset load — there is nothing to spin for. `reducedMotion`
          does not change whether this mounts, only how it animates. */}
      {attemptCinematic && (
        <Suspense fallback={null}>
          <StoryBandCinematic
            eyebrow={EYEBROW}
            headline={HEADLINE}
            lede={LEDE}
            journeys={JOURNEYS}
            active={cinematicActive}
            reducedMotion={reducedMotion}
            onReady={handleReady}
            onUnavailable={handleUnavailable}
          />
        </Suspense>
      )}
    </section>
  );
}
