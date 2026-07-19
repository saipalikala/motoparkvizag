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

/* ------------------------------------------------------------------------- *
 * Phase 5 additions — docs/10 Amendment 1, condition 7:
 * "reduced-motion / save-data / low-memory / no-WebGL fall back silently".
 *
 * These are SEPARATE from isCinematicEligible() rather than folded into it.
 * Phase 3's Lenis is a scroll easing with no GPU cost and no meaningful memory
 * footprint; the WebGL hero is neither. Merging the two would silently change
 * shipped, verified Phase 3 behaviour as a side effect of Phase 5 work.
 * ------------------------------------------------------------------------- */

/**
 * The user is on a metered connection or a low-memory device.
 *
 * `deviceMemory` is coarse by design (0.25/0.5/1/2/4/8 GB — spec-mandated
 * buckets, capped so it can't be used as a fingerprint). < 4 GB is the
 * conventional "low-end" line and the one Chrome's own guidance uses.
 *
 * Both APIs are Chromium-only. Absent (Safari, Firefox) reads as unconstrained
 * — the correct default, since assuming constraint would disable the layer for
 * every Firefox and Safari desktop user on no evidence at all.
 */
export function hasConstrainedResources() {
  if (typeof navigator === 'undefined') return true;
  if (navigator.connection?.saveData === true) return true;
  const mem = navigator.deviceMemory;
  return typeof mem === 'number' && mem < 4;
}

/** Memoised result of the WebGL2 probe. `undefined` = not yet probed. */
let webgl2Support;

/**
 * Probe for a REAL WebGL2 context. Support cannot be inferred from the UA:
 * drivers get blocklisted, GPUs get disabled in software-rendering mode, and
 * enterprise policy can switch it off — all invisibly to feature strings.
 *
 * Two properties that matter:
 *
 * 1. The test context is explicitly destroyed via WEBGL_lose_context. Browsers
 *    cap concurrent contexts (~16 in Chromium) and evict the oldest when the cap
 *    is hit — a leaked probe context per call would eventually kill the real
 *    canvas we're probing on behalf of.
 * 2. The result is memoised. This is a deliberate exception to this file's
 *    "read at call time, never cache" rule: unlike a media query, GPU capability
 *    does not change mid-session, and probing is expensive enough that repeating
 *    it on every scroll-triggered check would itself be a performance defect.
 *
 * Memoising `true` cannot mask a later GPU-process crash, and is not trying to:
 * this answers "is it worth downloading the chunk". The authoritative check is
 * the real getContext() call inside the scene, plus the frame-time watchdog that
 * Amendment 1 condition 6 requires.
 */
export function hasWebGL2() {
  if (webgl2Support !== undefined) return webgl2Support;
  if (typeof document === 'undefined') return (webgl2Support = false);
  let gl = null;
  try {
    const canvas = document.createElement('canvas');
    gl = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true });
    webgl2Support = gl !== null;
  } catch {
    // Some environments throw rather than returning null.
    webgl2Support = false;
  } finally {
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  }
  return webgl2Support;
}

/**
 * The full Phase 5 gate: everything isCinematicEligible() requires, plus
 * Amendment 1 condition 7's resource and capability checks.
 *
 * Order is load-bearing. The cheap synchronous media-query checks run first and
 * short-circuit, so a phone never allocates a WebGL context merely to be told it
 * is ineligible on width.
 */
export function isWebGLHeroEligible() {
  return isCinematicEligible() && !hasConstrainedResources() && hasWebGL2();
}

/** Test seam: forget the memoised probe so a suite can exercise both branches. */
export function __resetWebGL2ProbeForTests() {
  webgl2Support = undefined;
}
