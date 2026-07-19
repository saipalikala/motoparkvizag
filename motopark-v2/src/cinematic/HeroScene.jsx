import { useEffect, useRef, useState } from 'react';
import { sceneDiagnostics, sceneTuning } from './sceneDiagnostics.js';
import { VERT, buildFrag, MOTE_VERT, MOTE_FRAG, MOTE_COUNT } from './heroShader.js';
import styles from './HeroScene.module.css';

/**
 * HeroScene — the decorative WebGL layer for the homepage hero.
 *
 * Two fullscreen-cheap passes per frame: `heroShader.js`'s grain / light sweep /
 * depth haze, then ~14 additively-blended dust motes drawn as `GL_POINTS`.
 * Measured cost against a no-canvas control: **TBT 0 ms, LCP +0.9 ms**
 * (`docs/13 §5e`). There are no textures, no attribute buffers and no per-frame
 * allocations — the CPU cost of a frame is two `drawArrays` calls.
 *
 * The hero photograph is deliberately NOT sampled or displaced; see the header
 * of `heroShader.js` for why Amendment 1 condition 2 rules that out.
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

/**
 * Which effects are compiled into the fragment program.
 *
 * Kept as a single object so the incremental benchmarks in `docs/13 §5e` are
 * reproducible: each one was captured by flipping a flag here and rebuilding,
 * with the later effects genuinely absent from the compiled shader rather than
 * multiplied by zero.
 */
const SHADER_FX = { grain: true, sweep: true, haze: true, motes: true };

/**
 * Compile and link, returning null on any failure.
 *
 * Returning null rather than throwing is deliberate: a driver that rejects this
 * shader must land the user on the static hero, which is exactly what happens
 * when there is no GPU at all. A throw inside an effect would escape into the
 * page instead (Amendment 1 condition 5).
 */
function buildProgram(gl, vertSrc, fragSrc) {
  const compile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      // Surfaced in dev only; in production this silently degrades.
      if (import.meta.env?.DEV) console.warn('[cinematic]', gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  };

  const vs = compile(gl.VERTEX_SHADER, vertSrc);
  const fs = vs && compile(gl.FRAGMENT_SHADER, fragSrc);
  if (!vs || !fs) {
    if (vs) gl.deleteShader(vs);
    return null;
  }

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  // Shaders are detached and deleted immediately; the linked program keeps
  // what it needs and the driver can release the sources.
  gl.detachShader(program, vs);
  gl.detachShader(program, fs);
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    if (import.meta.env?.DEV) console.warn('[cinematic]', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

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

    // ── Program ───────────────────────────────────────────────────────────
    // Compiled once at mount. A shader that fails to compile must degrade to
    // the static hero exactly like a missing GPU does — never a broken hero.
    const program = buildProgram(gl, VERT, buildFrag(SHADER_FX));
    if (!program) {
      sceneDiagnostics.state = 'failed';
      sceneDiagnostics.retiredReason = 'shader compile/link failed';
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      setRetired(true);
      return undefined;
    }
    const uRes = gl.getUniformLocation(program, 'u_res');
    const uTime = gl.getUniformLocation(program, 'u_time');
    const uIntensity = gl.getUniformLocation(program, 'u_intensity');

    // Motes are a second, tiny points pass. If only this program fails we drop
    // the motes and keep the rest — a partial degrade beats losing the layer.
    const moteProgram = SHADER_FX.motes ? buildProgram(gl, MOTE_VERT, MOTE_FRAG) : null;
    const mRes = moteProgram && gl.getUniformLocation(moteProgram, 'u_res');
    const mTime = moteProgram && gl.getUniformLocation(moteProgram, 'u_time');
    const mIntensity = moteProgram && gl.getUniformLocation(moteProgram, 'u_intensity');

    gl.enable(gl.BLEND);

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
    let startedAt = 0;

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

      // Fade in over ~1.2 s so the layer never "pops" into an already-painted
      // hero. startedAt is set on first frame, not at mount, so a scene that
      // mounts while scrolled out still fades in when the user arrives.
      if (startedAt === 0) startedAt = now;
      const elapsed = (now - startedAt) / 1000;
      const intensity = Math.min(1, elapsed / 1.2);

      gl.clear(gl.COLOR_BUFFER_BIT);

      // Pass 1 — grain / sweep / haze. Straight alpha over the photograph.
      //
      // blendFuncSeparate, NOT blendFunc. `blendFunc` applies its source factor
      // to the ALPHA channel too, so the canvas would accumulate `src.a * src.a`.
      // Grain sits around a = 0.022; squared that is 0.0005, which rounds to
      // ZERO in the 8-bit drawing buffer — the entire fullscreen pass rendered
      // and then quantised itself away, invisible while still costing full GPU
      // time. Only the motes survived, because their alpha is ~20x higher.
      // Verified by reading back the drawing buffer, 2026-07-19.
      gl.useProgram(program);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, elapsed);
      gl.uniform1f(uIntensity, intensity);
      // Buffer-less fullscreen triangle — see heroShader.js VERT.
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // Pass 2 — dust motes, additive so they read as catching the light.
      if (moteProgram) {
        gl.useProgram(moteProgram);
        // Additive colour, accumulating alpha — same reasoning as pass 1.
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE);
        gl.uniform2f(mRes, canvas.width, canvas.height);
        gl.uniform1f(mTime, elapsed);
        gl.uniform1f(mIntensity, intensity);
        gl.drawArrays(gl.POINTS, 0, MOTE_COUNT);
      }

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
      gl.deleteProgram(program);
      if (moteProgram) gl.deleteProgram(moteProgram);
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
