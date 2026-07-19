import { useEffect, useState } from 'react';
import {
  MOTION_QUERIES,
  hasConstrainedResources,
  isCinematicEligible,
  isWebGLHeroEligible,
} from '@/lib/motionEligibility.js';

/**
 * Decides WHEN the decorative hero canvas may load. Returns `true` once the
 * caller is allowed to render its lazy `<HeroScene />`.
 *
 * This hook lives OUTSIDE `src/cinematic/` for the same reason
 * `motionEligibility.js` does: it decides whether that folder gets downloaded at
 * all, so it must be evaluable without downloading it.
 *
 * ## The load sequence (docs/10 Amendment 1, condition 2)
 *
 *     eligibility (cheap) → page settled → requestIdleCallback → import()
 *
 * **The `import()` is the last step, never the first.** It is not issued here at
 * all — this hook only flips a boolean, and the caller's `React.lazy` turns that
 * render into the network request. Ordering is therefore structural rather than
 * a comment asking the next person to be careful.
 *
 * "Page settled" = `load` **and** the last LCP candidate, whichever is later.
 * Amendment 1 words condition 2 as "not fetched until LCP observed"; that intent
 * is met — arming is never earlier than the final LCP candidate when one exists —
 * but it is deliberately not implemented as *waiting for an LCP entry*, because
 * an LCP entry is not guaranteed to arrive. See the comment at step 2.
 *
 * `requestIdleCallback` is the second, independent guarantee: it only runs when
 * the main thread is idle, and a thread still working toward a paint is not idle.
 * Even if the settle heuristic armed early, the import would not land in front of
 * a pending LCP.
 *
 * ### Why the WebGL probe is NOT in the early bail-out
 *
 * The cheap gate here is `isCinematicEligible() && !hasConstrainedResources()` —
 * media queries and two property reads. The full `isWebGLHeroEligible()` runs
 * later, inside the idle callback, because the probe it adds *creates a real GPU
 * context*. Running that during page load would put main-thread work in front of
 * the very LCP this hook exists to protect — the LCP that docs/13 §3f showed is
 * 46–81% render delay, i.e. exactly this kind of cost. Cheap checks early to bail
 * out; expensive checks only once we are provably idle.
 */

/** Safari shipped requestIdleCallback late; degrade to a macrotask. */
const requestIdle =
  typeof window !== 'undefined' && window.requestIdleCallback
    ? window.requestIdleCallback.bind(window)
    : (cb) => window.setTimeout(() => cb({ didTimeout: true, timeRemaining: () => 0 }), 1);

const cancelIdle =
  typeof window !== 'undefined' && window.cancelIdleCallback
    ? window.cancelIdleCallback.bind(window)
    : (id) => window.clearTimeout(id);

/**
 * Quiet period after the last settling signal (`load`, or an LCP candidate)
 * before arming. LCP can reassign several times during load — docs/13 §3f
 * recorded it moving between the static shell and React's hero — so acting on
 * the first entry would be acting mid-load.
 */
const LCP_SETTLE_MS = 500;

export function useCinematicHero() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Step 1 — cheap gate. A phone bails out here having done nothing but read
    // three media queries, and in particular without touching the GPU.
    if (!isCinematicEligible() || hasConstrainedResources()) return undefined;

    let cancelled = false;
    let idleId = null;
    let settleTimer = null;
    let observer = null;
    let armed = false;

    /** Step 3 — idle callback, then (via the caller's render) the import. */
    const arm = () => {
      if (cancelled || armed) return;
      armed = true;
      teardownObservers();

      idleId = requestIdle(
        () => {
          idleId = null;
          // Full gate, including the GPU probe. Safe here: we are idle, so the
          // context creation cannot land in front of a pending paint.
          if (!cancelled && isWebGLHeroEligible()) setReady(true);
        },
        // Without a timeout an idle callback can be starved indefinitely on a
        // busy page; the layer would then never appear on exactly the machines
        // where nothing else is going wrong.
        { timeout: 2000 },
      );
    };

    /**
     * Push arming out to `now + LCP_SETTLE_MS`, restarting the clock if it was
     * already running. Every settling signal calls this, so the arm time is
     * always **after the last of them** — never after the first.
     */
    const scheduleArm = () => {
      if (cancelled || armed) return;
      if (settleTimer !== null) window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(arm, LCP_SETTLE_MS);
    };

    function teardownObservers() {
      observer?.disconnect();
      observer = null;
      window.removeEventListener('load', scheduleArm);
      if (settleTimer !== null) {
        window.clearTimeout(settleTimer);
        settleTimer = null;
      }
    }

    // Step 2 — wait for the page to settle.
    //
    // The trigger is `load` AND the last LCP candidate, whichever is later —
    // NOT "an LCP entry arrives", which was the first design and is a trap.
    //
    // **A page does not always emit an LCP entry at all.** Verified in-browser
    // on 2026-07-19: a load of this very homepage produced an empty
    // `paint` timeline and zero LCP entries, and a hook that waited on LCP sat
    // idle until its 8-second fallback. The same happens in production for
    // bfcache restores, prerendered pages, and tabs opened in the background —
    // Chrome does not report LCP for a page that starts hidden. Gating on an
    // entry that may never exist is a silent stall, not a safe default.
    //
    // `load` always fires, so it is the reliable floor; LCP candidates only ever
    // push the moment later. The result is never earlier than LCP when LCP
    // exists, and still correct when it does not.
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        observer = new PerformanceObserver(scheduleArm);
        // `buffered: true` still matters: React mounts after paint, so on a fast
        // connection the candidates have already been emitted by the time this
        // effect runs and only the buffer can replay them.
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch {
        observer = null;
      }
    }

    if (document.readyState === 'complete') scheduleArm();
    else window.addEventListener('load', scheduleArm);

    // Condition 7 is not a one-time check: reduced-motion can be toggled, and a
    // window can be resized across 1024px, mid-session. Mirror Phase 3's
    // useSmoothScroll and re-evaluate rather than latch.
    const queries = MOTION_QUERIES.map((q) => window.matchMedia(q));
    const onChange = () => {
      if (cancelled) return;
      setReady(isWebGLHeroEligible() && !hasConstrainedResources());
    };
    queries.forEach((q) => q.addEventListener('change', onChange));

    return () => {
      cancelled = true;
      teardownObservers();
      if (idleId !== null) cancelIdle(idleId);
      queries.forEach((q) => q.removeEventListener('change', onChange));
    };
  }, []);

  return ready;
}
