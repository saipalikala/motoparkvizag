import { useEffect, useRef, useState } from 'react';
import { sceneDiagnostics, sceneTuning } from './sceneDiagnostics.js';
import styles from './HeroScene.module.css';

/**
 * HeroScene — the decorative WebGL layer for the homepage hero.
 *
 * **This is the Phase 5 step-3 scaffold: lifecycle only, NO visual effect.**
 * It creates a real WebGL2 context and runs a real rAF loop, but every frame
 * clears to fully transparent. That is deliberate — the point of this step is to
 * prove the lifecycle (mount timing, pause/resume, watchdog, kill-switch) under
 * measurement *before* any shader exists to confound the numbers. docs/14 §3b
 * step 4 re-measures against `perf/baseline/baseline-2026-07-19-desktop.json`
 * (desktop LCP 545 ms, TBT 0 ms) before step 5 adds the visual work.
 *
 * Governed by docs/10 Amendment 1. Conditions implemented here:
 *
 *   3. Non-interactive — `pointer-events: none`, `aria-hidden`, below the scrim.
 *   5. Additive — the hero is complete without this; it renders `null` on any
 *      failure and never throws into the page.
 *   6. Self-limiting — DPR capped at 1.5, paused when the tab is hidden or the
 *      hero is scrolled out of view, and retired outright if frame times degrade.
 *
 * Conditions 1, 2 and 7 (eligibility and load timing) are enforced by the
 * CALLER, `src/hooks/useCinematicHero.js` — they must be decided before this
 * module is downloaded, so they cannot live inside it.
 */

/** DPR ceiling. 4K at native ratio is ~4x the fragment work for decoration nobody
 *  is looking directly at; 1.5 keeps it crisp on the retina laptops that dominate
 *  this audience without paying for it twice. Amendment 1 condition 6. */
const MAX_DPR = 1.5;

export default function HeroScene() {
  const canvasRef = useRef(null);
  const [retired, setRetired] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    // Even though the caller already probed for WebGL2, this call is the
    // authoritative one — the probe answers "is it worth downloading the chunk",
    // and capability can lapse between the two (GPU process crash, context cap).
    let gl = null;
    try {
      gl = canvas.getContext('webgl2', {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        // Decoration must never be the reason a laptop spins up its discrete GPU.
        powerPreference: 'low-power',
        failIfMajorPerformanceCaveat: true,
      });
    } catch {
      gl = null;
    }

    if (!gl) {
      sceneDiagnostics.state = 'failed';
      setRetired(true);
      return undefined;
    }

    sceneDiagnostics.contextCreated = true;
    sceneDiagnostics.mountedAt = Math.round(performance.now());
    sceneDiagnostics.state = 'running';
    sceneDiagnostics.frames = 0;
    sceneDiagnostics.badWindows = 0;
    sceneDiagnostics.retiredReason = null;

    gl.clearColor(0, 0, 0, 0);

    let rafId = null;
    let disposed = false;
    let visible = true; // tab visibility
    let onScreen = true; // hero in viewport
    let lastFrameAt = 0;
    let windowElapsed = 0;
    let windowFrames = 0;
    let strikes = 0;

    // Snapshot tunables at mount so a test can set them before the scene starts.
    const tuning = { ...sceneTuning };

    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    sceneDiagnostics.dpr = dpr;

    const resize = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    const retire = (reason) => {
      if (disposed) return;
      sceneDiagnostics.retiredReason = reason;
      sceneDiagnostics.state = 'retired';
      stop();
      // Retiring means the hero returns to exactly the state it has when this
      // module was never loaded at all — condition 5, verified by the same test
      // that verifies the kill-switch.
      setRetired(true);
    };

    const frame = (now) => {
      if (disposed) return;

      // Watchdog. Deliberately skips the first frame after any start or resume:
      // that delta spans the paused interval and would otherwise retire the
      // layer every time the user came back to the tab.
      if (lastFrameAt !== 0) {
        const delta = now - lastFrameAt;

        // Outliers are throttling, not slowness — see sceneTuning.outlierMs.
        // Discarded entirely rather than clamped: a clamped outlier still drags
        // the mean toward the budget and would retire the layer by attrition.
        if (delta <= tuning.outlierMs) {
          windowElapsed += delta;
          windowFrames += 1;
        }

        if (windowFrames >= tuning.window) {
          const mean = windowElapsed / windowFrames;
          if (mean > tuning.budgetMs) {
            strikes += 1;
            sceneDiagnostics.badWindows = strikes;
          } else {
            strikes = 0;
            sceneDiagnostics.badWindows = 0;
          }
          windowElapsed = 0;
          windowFrames = 0;

          if (strikes >= tuning.strikes) {
            retire(`mean frame ${mean.toFixed(1)}ms > ${tuning.budgetMs}ms`);
            return;
          }
        }
      }
      lastFrameAt = now;

      resize();
      gl.clear(gl.COLOR_BUFFER_BIT); // inert: transparent, no shader yet
      sceneDiagnostics.frames += 1;

      rafId = window.requestAnimationFrame(frame);
    };

    function start() {
      if (disposed || rafId !== null) return;
      lastFrameAt = 0; // resets the watchdog across the pause boundary
      windowElapsed = 0;
      windowFrames = 0;
      rafId = window.requestAnimationFrame(frame);
    }

    function stop() {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    /** Condition 6: run only when the layer is both visible and on screen. */
    const sync = () => {
      if (sceneDiagnostics.state === 'retired') return;
      if (visible && onScreen) {
        sceneDiagnostics.state = 'running';
        start();
      } else {
        stop();
        sceneDiagnostics.state = visible ? 'paused-offscreen' : 'paused-hidden';
      }
    };

    const onVisibility = () => {
      visible = document.visibilityState === 'visible';
      sync();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        sync();
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);

    visible = document.visibilityState === 'visible';
    resize();
    sync();

    return () => {
      disposed = true;
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      // Release the GPU context explicitly. Browsers cap concurrent contexts and
      // evict the oldest; a context leaked on every home-route mount would
      // eventually start killing other canvases on the page.
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      if (sceneDiagnostics.state !== 'retired') sceneDiagnostics.state = 'idle';
    };
  }, []);

  if (retired) return null;

  return (
    <canvas
      ref={canvasRef}
      className={styles.canvas}
      // Condition 3 + condition 4: decorative, never content. Nothing in here is
      // exposed to assistive tech because nothing in here is information.
      aria-hidden="true"
      data-hero-scene="scaffold"
    />
  );
}
