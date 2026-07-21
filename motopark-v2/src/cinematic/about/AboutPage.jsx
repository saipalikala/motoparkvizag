import { Helmet } from 'react-helmet-async';
import AboutCinematic from './AboutCinematic.jsx';
import AboutStory from './AboutStory.jsx';
import { useSmoothScroll } from '@/hooks/useSmoothScroll.js';
import styles from './AboutPage.module.css';

/**
 * AboutPage — the /about route component.
 *
 * This is the ONLY file in src/cinematic/about/ that exists purely for routing.
 * Everything else (canvas, scroll, story) lives in dedicated modules.
 *
 * ─── Why this file is in src/cinematic/about/ ─────────────────────────────────
 *
 * The user's rule: "Everything related to the About cinematic experience should
 * live inside src/cinematic/about/". The page shell is part of that experience —
 * it provides the Helmet tags, page background, and the component composition.
 *
 * ─── How this is loaded ───────────────────────────────────────────────────────
 *
 * Reached ONLY via:
 *   const AboutPage = lazy(() => import('@/cinematic/about/AboutPage.jsx'))
 *
 * in src/app/router.jsx. The dynamic import() is not flagged by .oxlintrc.json
 * (only static imports of @/cinematic/* are blocked). This keeps the entire
 * About cinematic bundle — including GSAP — out of every other route's chunk.
 */
export default function AboutPage() {
  // Mount Lenis smooth scroll for the About cinematic sequence.
  // This also activates the Lenis→GSAP ScrollTrigger synchronisation in
  // smoothScroll.js, so the cinematic animation tracks the Lenis-smoothed
  // scroll position rather than raw browser scroll. Without this, GSAP
  // ScrollTrigger reads native scrollY directly, which diverges from the
  // visual scroll during deceleration and produces animation jitter.
  useSmoothScroll();

  return (
    <>
      <Helmet>
        <title>About MotoPark — Rider-Run Gear Shop, Visakhapatnam</title>
        <meta
          name="description"
          content="MotoPark is a rider-run motorcycle gear shop from Visakhapatnam. Premium riding gear for modern riders — built on passion, trust, and performance since 2020."
        />
        <link rel="canonical" href="https://motoparkvizag.in/about" />
        <meta property="og:title" content="About MotoPark" />
        <meta
          property="og:description"
          content="From Vizag, for all of India. 5,000+ riders served, 25+ trusted brands. Genuine gear, honest advice."
        />
      </Helmet>

      <div className={styles.page}>
        {/* Cinematic canvas sequence — drives the tunnel → MotoPark story */}
        <AboutCinematic />

        {/* Brand narrative — stats, story, values, CTA */}
        <AboutStory />
      </div>
    </>
  );
}
