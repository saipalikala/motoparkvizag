/**
 * The cinematic eligibility gate (src/cinematic/README.md → "Anything mobile loads").
 *
 * This deliberately lives OUTSIDE src/cinematic/. The gate decides *whether to
 * download* that folder, so it must be evaluable without downloading it —
 * putting it inside would mean loading 230–280 kB to discover we shouldn't have.
 * It has no dependencies for the same reason.
 *
 * Phase 5's WebGL hero gets the same gate, so it stays in one place.
 */

/** The media queries the gate is made of. Exported so callers can subscribe to changes. */
export const MOTION_QUERIES = [
  '(min-width: 1024px)',
  '(pointer: fine)',
  '(prefers-reduced-motion: reduce)',
];

/**
 * Desktop, precise pointer, and no stated preference for reduced motion.
 *
 * Read at call time, never cached — every one of these can change mid-session
 * (resize, dock a tablet, toggle the OS setting).
 */
export function isCinematicEligible() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  const [wide, fine, reduced] = MOTION_QUERIES.map((q) => window.matchMedia(q).matches);
  return wide && fine && !reduced;
}
