/**
 * Observable state for the decorative hero canvas.
 *
 * WHY THIS EXISTS: the layer is invisible by design — the step-3 scaffold paints
 * nothing at all, and the finished shader will be subtle by doctrine. Without an
 * external signal, "working correctly" and "silently broken" are indistinguishable
 * from outside the module, and every lifecycle claim in Amendment 1 condition 6
 * (paused when hidden, paused off-screen, retires on frame-time degradation)
 * would be unverifiable.
 *
 * WHY ITS OWN FILE: HeroScene.jsx is the file the shader work will iterate on.
 * A non-component export there trips `react/only-export-components` and breaks
 * fast refresh in exactly the file where fast refresh is worth the most.
 *
 * Reachable from a browser check via
 * `await import('/src/cinematic/sceneDiagnostics.js')`. Costs two small objects;
 * nothing here runs on the render path.
 *
 * BOTH EXPORTS ARE PINNED TO `globalThis` VIA `Symbol.for`, deliberately.
 * A module can be instantiated more than once — Vite's dev server appends a
 * version query to changed modules, so a check that imports the plain path can
 * easily get a *different* instance from the one the component holds. That
 * happened on 2026-07-19 and read as "the canvas mounted but no context was
 * created": two objects, one of them never written to. A cross-realm singleton
 * makes the reading correct no matter which specifier reached it, and makes the
 * tuning seam actually take effect on the instance the scene reads.
 */
const registry = (globalThis[Symbol.for('motopark.cinematic')] ??= {});

/**
 * Watchdog tunables (Amendment 1 condition 6). Read once at mount.
 *
 * These live here rather than as `const`s in HeroScene.jsx for one reason: the
 * watchdog's whole job is to fire under conditions that are hard to produce on
 * demand, and an unfired watchdog is an unverified one. A check can lower
 * `budgetMs` before mount and prove the retire path end-to-end in a second
 * rather than by finding a genuinely slow GPU.
 */
export const sceneTuning = (registry.tuning ??= {
  /** Frames per window. ~1s at 60fps — one janky frame cannot retire the layer. */
  window: 60,
  /** Mean frame time counted as degraded: 32 ms ≈ sustained sub-30fps. */
  budgetMs: 32,
  /** Consecutive degraded windows before retiring. */
  strikes: 3,
  /**
   * Frame deltas above this are DISCARDED rather than counted as slow.
   *
   * This distinction is the difference between a watchdog and a hair trigger.
   * A genuinely overloaded GPU produces deltas in the 33–80 ms band. Deltas of
   * hundreds of milliseconds mean something else entirely — an occluded window,
   * a throttled background frame, a long task in another part of the app, the
   * debugger paused. Measured 2026-07-19: an unfocused automation window ran at
   * ~5 fps (~200 ms deltas) while rendering perfectly well.
   *
   * Retiring is permanent for the life of the mount, so counting throttled
   * frames as failure would disable the layer for the rest of the session over a
   * condition that lasts seconds and is not our cost.
   */
  outlierMs: 150,
});

export const sceneDiagnostics = (registry.diagnostics ??= {
  /** Did the authoritative getContext('webgl2') call succeed? */
  contextCreated: false,
  /** Frames drawn since the current run started. */
  frames: 0,
  /** idle | running | paused-hidden | paused-offscreen | retired | failed */
  state: 'idle',
  /** Populated when the watchdog retires the layer. */
  retiredReason: null,
  /** The capped device pixel ratio actually used. */
  dpr: null,
  /** Consecutive degraded watchdog windows. */
  badWindows: 0,
  /**
   * `performance.now()` at mount. This is the number that proves Amendment 1
   * condition 2 held on a given load — it must land after the page settled, not
   * during it. Step 4 compares it against the navigation timeline.
   */
  mountedAt: null,
});
