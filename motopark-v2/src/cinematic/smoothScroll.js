/**
 * Lenis smooth scroll — mounted on any route that requires cinematic scrolling
 * (currently: home via HomePage.jsx, About via AboutPage.jsx / AboutCinematic.jsx).
 *
 * Lives in src/cinematic/ because this is decoration and the README names
 * "scroll choreography, and the machinery that drives them" as belonging here.
 * That placement is also what keeps `lenis` legal: .oxlintrc.json blocks the
 * bare specifier everywhere else (docs/11 §7b).
 *
 * Reached ONLY via dynamic import() from src/hooks/useSmoothScroll.js, so the
 * bytes never enter the static graph of any route. Mobile never loads this file
 * at all: the caller runs src/lib/motionEligibility.js BEFORE issuing the
 * import, which is what preserves the docs/13 §5 mobile TBT tripwire. The gate
 * deliberately lives outside this folder — it decides whether to download it.
 *
 * ─── Lenis + GSAP ScrollTrigger synchronisation ───────────────────────────────
 *
 * GSAP ScrollTrigger reads window.scrollY directly via its own internal ticker.
 * Lenis separately smooths the physical scroll position and updates the DOM's
 * scrollTop. When both run their own independent RAF loops, they diverge during
 * fast scroll and deceleration: ScrollTrigger reads the raw, unsmoothed position
 * while the page is visually at the Lenis-smoothed position, causing the animation
 * progress to jump ahead of the visual scroll during deceleration.
 *
 * The fix is a standard pattern from the Lenis docs:
 *   1. Disable GSAP's own lagSmoothing (it fights Lenis's smoothing in a way
 *      that creates visible "catch-up" jumps).
 *   2. Have GSAP's ticker drive the Lenis RAF call so both systems share exactly
 *      one RAF loop — GSAP fires, updates Lenis, Lenis fires its 'scroll' event.
 *   3. Have Lenis's 'scroll' event tell ScrollTrigger to update its progress
 *      reading — so ScrollTrigger always reads AFTER Lenis has settled the
 *      scroll position, never before.
 *
 * Result: GSAP ScrollTrigger's onUpdate fires with the Lenis-smoothed position,
 * not the raw browser position. The cinematic animation progress tracks the
 * visually smooth scroll rather than the jittery native scroll.
 */

/**
 * Mount Lenis on the document scroller with GSAP ScrollTrigger synchronisation.
 * @returns {() => void} teardown — destroys the instance and stops the RAF loop.
 */
export async function startSmoothScroll() {
  const [{ default: Lenis }, { gsap }, { ScrollTrigger }] = await Promise.all([
    import('lenis'),
    import('gsap'),
    import('gsap/ScrollTrigger'),
  ]);

  gsap.registerPlugin(ScrollTrigger);

  // ── 1. Disable GSAP's lag compensation ─────────────────────────────────────
  // lagSmoothing causes GSAP to artificially advance its ticker when it detects
  // a dropped frame — fighting Lenis's own smoothing and creating jump artefacts.
  // With Lenis owning the smoothing, GSAP should fire at real wall-clock time only.
  gsap.ticker.lagSmoothing(0);

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
    // GSAP drives the RAF loop below — autoRaf must be off so we don't have two
    // competing loops each driving half the ticks.
    autoRaf: false,
  });

  // ── 2. GSAP ticker drives Lenis RAF ────────────────────────────────────────
  // GSAP's ticker fires first → calls lenis.raf() → Lenis updates scroll position
  // → Lenis fires 'scroll' event → ScrollTrigger reads the now-settled position.
  // One RAF loop, correct ordering, no race.
  // Note: gsap.ticker time is in seconds; lenis.raf() expects milliseconds.
  const lenisRAF = (time) => lenis.raf(time * 1000);
  gsap.ticker.add(lenisRAF);

  // ── 3. Lenis 'scroll' event → ScrollTrigger.update ─────────────────────────
  // ScrollTrigger normally reads scrollY on its own schedule. By hooking into
  // Lenis's settled 'scroll' event, we ensure ScrollTrigger always sees the
  // Lenis-smoothed position. This is what makes the cinematic animation track
  // the visual scroll rather than the raw browser scroll.
  lenis.on('scroll', ScrollTrigger.update);

  return () => {
    lenis.off('scroll', ScrollTrigger.update);
    gsap.ticker.remove(lenisRAF);
    lenis.destroy();
    // Restore GSAP's default lag smoothing for any future ticker consumers
    // that may not want it disabled. 500ms/33fps is GSAP's built-in default.
    gsap.ticker.lagSmoothing(500, 33);
  };
}
