import { useEffect } from 'react';
import { MOTION_QUERIES, isCinematicEligible } from '@/lib/motionEligibility.js';

/**
 * Mounts Lenis smooth scroll for the lifetime of the calling component.
 *
 * Home route only (docs/11 §10, docs/09 §14 — "no Lenis on listings/checkout").
 * Mounting this in a component means React's unmount IS the "destroyed on route
 * change" requirement; there is no route listener to keep in sync.
 *
 * The implementation is dynamically imported from src/cinematic/, and the import
 * is issued ONLY after the eligibility gate passes — so the `/` static graph
 * never sees `lenis` and mobile never downloads it. Both properties are load
 * bearing: the second is what keeps the docs/13 §5 mobile TBT tripwire honest.
 */
export function useSmoothScroll() {
  useEffect(() => {
    let teardown = null;
    let cancelled = false;
    let starting = false;

    const sync = async () => {
      if (!isCinematicEligible()) {
        teardown?.();
        teardown = null;
        return;
      }
      // `starting` matters as much as `teardown`: two queries can change in the
      // same tick (docking a tablet flips pointer AND width), and without this
      // both calls pass the guard while awaiting and we end up with two Lenis
      // instances fighting over one scroll — the first unreachable, so it can
      // never be destroyed.
      if (teardown || starting) return;
      starting = true;

      let stop;
      try {
        const { startSmoothScroll } = await import('@/cinematic/smoothScroll.js');
        stop = await startSmoothScroll();
      } finally {
        starting = false;
      }

      // Unmounted, or became ineligible, while the chunk was in flight.
      if (cancelled || !isCinematicEligible()) {
        stop();
        return;
      }
      teardown = stop;
    };

    // Fire-and-forget: a failed chunk load must degrade to native scrolling,
    // never to a broken homepage. Nothing on this page depends on Lenis.
    sync().catch(() => {});

    // Eligibility can flip mid-session — resize across 1024px, dock a tablet,
    // toggle the OS reduced-motion setting. Re-run rather than latch.
    const queries = MOTION_QUERIES.map((q) => window.matchMedia(q));
    queries.forEach((q) => q.addEventListener('change', sync));

    return () => {
      cancelled = true;
      queries.forEach((q) => q.removeEventListener('change', sync));
      teardown?.();
      teardown = null;
    };
  }, []);
}
