/**
 * Lenis smooth scroll — the home route's scroll choreography.
 *
 * Lives in src/cinematic/ because this is decoration and the README names
 * "scroll choreography, and the machinery that drives them" as belonging here.
 * That placement is also what keeps `lenis` legal: .oxlintrc.json blocks the
 * bare specifier everywhere else (docs/11 §7b).
 *
 * Reached ONLY via dynamic import() from src/hooks/useSmoothScroll.js, so the
 * bytes never enter the `/` static graph. Mobile never loads this file at all:
 * the caller runs src/lib/motionEligibility.js BEFORE issuing the import, which
 * is what preserves the docs/13 §5 mobile TBT tripwire. The gate deliberately
 * lives outside this folder — it decides whether to download this folder.
 */

/**
 * Mount Lenis on the document scroller.
 * @returns {() => void} teardown — destroys the instance and stops the rAF loop.
 */
export async function startSmoothScroll() {
  const { default: Lenis } = await import('lenis');

  const lenis = new Lenis({
    // Close to native. The doctrine budgets motion as "seasoning, not the dish",
    // and an aggressive lerp on a storefront reads as input lag, not as premium.
    lerp: 0.12,
    // Without this Lenis swallows in-page anchor links (it owns the scroll now,
    // so the browser's native jump no longer applies).
    anchors: true,
    // Touch stays native. Belt-and-braces: the eligibility gate already excludes
    // coarse pointers, but a hybrid laptop can report both.
    syncTouch: false,
    // We drive the loop ourselves so teardown is deterministic and doesn't
    // depend on which autoRaf default the installed version ships.
    autoRaf: false,
  });

  let frame = requestAnimationFrame(function raf(time) {
    lenis.raf(time);
    frame = requestAnimationFrame(raf);
  });

  return () => {
    cancelAnimationFrame(frame);
    lenis.destroy();
  };
}
