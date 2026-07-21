import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { useSequenceLoader } from '../engine/useSequenceLoader.js';
import { useScrollSequence } from '../engine/useScrollSequence.js';
import { drawImageCover, overlayOpacity } from '../engine/cinematicUtils.js';
import { SEQUENCE_CONFIG, SCROLL_CONFIG, OVERLAYS } from './aboutConfig.js';
import styles from './AboutCinematic.module.css';

/**
 * AboutCinematic — scroll-driven canvas sequence for the About page.
 *
 * ─── Rendering model (how the Apple-like feel works) ──────────────────────────
 *
 * OLD model:  GSAP onUpdate → Math.round(progress * lastFrame) → draw
 *   Problem:  draws happen only when GSAP fires, and rounding causes hard jumps
 *             between integer frame indices.
 *
 * NEW model:
 *
 *   1. GSAP ScrollTrigger writes the target scroll progress to `targetRef`.
 *      That is all it does — no drawing.
 *
 *   2. A gsap.ticker loop (synchronized with RAF at 60fps) runs continuously
 *      while on desktop. On each tick it:
 *
 *      a) Frame-rate–independent exponential lerp of `displayRef` toward `targetRef`.
 *         This creates the momentum/lag that makes it feel like a heavy object
 *         slowing down — identical to how Apple's product pages feel.
 *
 *      b) Computes a FRACTIONAL frame index:
 *             fracIdx = displayProgress × (totalFrames − 1)
 *         e.g. 47.3 → loIdx=47, hiIdx=48, blend=0.3
 *
 *      c) Draws frame 47 at full opacity, then frame 48 at globalAlpha=0.3 on top.
 *         This cross-blending eliminates all visible stepping between frames.
 *         The sequence now looks like a smooth 192fps video, not a slideshow.
 *
 *      d) Updates text overlay opacities via direct DOM writes (no React state).
 *
 *   3. Early exit: if displayRef and targetRef have converged (diff < 0.0002)
 *      AND the canvas has already drawn that position, skip the draw entirely.
 *      This means the ticker runs at 60fps only while the user is interacting;
 *      at rest it does < 1µs of work per tick.
 *
 * ─── Lerp factor ──────────────────────────────────────────────────────────────
 *
 * LERP_ALPHA = 0.20 per normalized frame (at 60fps).
 * Formula for frame-rate independence:
 *   factor = 1 − (1 − LERP_ALPHA)^(deltaTime / 16.67)
 *
 * At 60fps: factor ≈ 0.20  → catches up 20% of remaining distance per frame
 * At 30fps: factor ≈ 0.36  → same subjective speed despite half the ticks
 * At 120fps: factor ≈ 0.11 → same subjective speed at double the ticks
 *
 * Combined with GSAP scrub=0.8 (which already lags 0.8s behind scroll),
 * the additional lerp adds ~2 frames (≈33ms) of extra smoothing — enough to
 * prevent inter-frame stepping from GSAP's own tick granularity.
 */

/**
 * LERP_ALPHA — how aggressively the display progress chases the target per tick.
 *
 * OLD: 0.20 → catches up 20%/frame at 60fps → deceleration tail ~250ms (UI feel)
 * NEW: 0.07 → catches up  7%/frame at 60fps → deceleration tail ~750ms (cinematic)
 *
 * Frame-rate independence formula (unchanged):
 *   factor = 1 − (1 − LERP_ALPHA)^(deltaTime / 16.67)
 */
const LERP_ALPHA = 0.12;

export default function AboutCinematic() {
  // ── Refs ───────────────────────────────────────────────────────────────────
  const wrapperRef      = useRef(null);
  const canvasRef       = useRef(null);
  const ctxRef          = useRef(null);
  const overlayRefs     = useRef([]);

  // Scroll progress from GSAP (written by ScrollTrigger, read by ticker)
  const targetProgressRef  = useRef(0);
  // Progress actually being drawn (lerped by ticker toward targetProgressRef)
  const displayProgressRef = useRef(0);
  // Last drawn fractional index — used to skip redundant draws
  const lastFracIdxRef     = useRef(-1);

  // ── Desktop detection ──────────────────────────────────────────────────────
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined'
      && window.matchMedia('(min-width: 1024px)').matches
  );

  useEffect(() => {
    const mq      = window.matchMedia('(min-width: 1024px)');
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ── Frame preloader ────────────────────────────────────────────────────────
  const { frames, loaded } = useSequenceLoader({
    ...SEQUENCE_CONFIG,
    priority: SEQUENCE_CONFIG.totalFrames > 1
      ? [0, SEQUENCE_CONFIG.totalFrames - 1]
      : [0],
  });

  // ── Canvas context (lazy, invalidated by resize) ───────────────────────────
  const getCtx = useCallback(() => {
    if (!ctxRef.current && canvasRef.current) {
      ctxRef.current = canvasRef.current.getContext('2d');
    }
    return ctxRef.current;
  }, []);

  // ── GSAP ScrollTrigger — ONLY writes to targetProgressRef ─────────────────
  //    Drawing is entirely decoupled to the ticker below.

  const handleProgress = useCallback((p) => {
    targetProgressRef.current = p;
  }, []);

  useScrollSequence({
    triggerRef:  wrapperRef,
    onProgress:  handleProgress,
    ...SCROLL_CONFIG,
    enabled:     isDesktop,
  });

  // ── Text overlay updater (direct DOM, no React state) ─────────────────────

  const updateOverlays = useCallback((progress) => {
    OVERLAYS.forEach((cfg, i) => {
      const el = overlayRefs.current[i];
      if (!el) return;
      const opacity = overlayOpacity(
        progress,
        cfg.startProgress,
        cfg.peakProgress,
        cfg.endProgress,
      );
      el.style.opacity   = String(opacity);
      el.style.transform = `translateY(${(1 - Math.min(opacity * 2, 1)) * 20}px)`;
    });
  }, []);

  // ── Core: gsap.ticker render loop ─────────────────────────────────────────
  //
  // gsap.ticker is synchronized with the browser's RAF — no competing loops.
  // deltaTime is provided in milliseconds by GSAP.

  useEffect(() => {
    if (!isDesktop || !SEQUENCE_CONFIG.hasFrames) return;

    function tick(_, deltaTime) {
      const target  = targetProgressRef.current;
      const current = displayProgressRef.current;
      const diff    = target - current;

      // ── Lerp — frame-rate independent ─────────────────────────────────────
      const dt     = Math.min(deltaTime, 50); // cap at 50ms (prevents jumps if tab was backgrounded)
      const factor = 1 - Math.pow(1 - LERP_ALPHA, dt / 16.667);
      const next   = Math.abs(diff) < 0.00015
        ? target                        // snap to target when close enough
        : current + diff * factor;

      displayProgressRef.current = next;

      // ── Early-exit if nothing meaningful changed ───────────────────────────
      const fracIdx = next * (frames.length - 1);
      const lastIdx = lastFracIdxRef.current;
      if (Math.abs(fracIdx - lastIdx) < 0.005) return;

      // ── Intermediate-frame fill guard ──────────────────────────────────────
      // With LERP_ALPHA=0.07 the per-tick advance is small, but during a fast
      // scroll burst the display can still jump more than one full frame. When
      // that happens, draw the midpoint frame first so there is no blank gap if
      // the skipped frame hasn't yet been fetched into the bitmap cache.
      // Cost: one extra drawImage blit (~0.1ms) on fast scroll — negligible.
      const ctx = getCtx();
      if (!ctx) return;

      if (lastIdx >= 0 && Math.abs(fracIdx - lastIdx) > 1.5) {
        const midIdx  = Math.max(0, Math.min(Math.round((fracIdx + lastIdx) / 2), frames.length - 1));
        const midFrame = frames[midIdx];
        if (midFrame) drawImageCover(ctx, midFrame, { clear: true });
      }

      lastFracIdxRef.current = fracIdx;

      // ── Frame selection ────────────────────────────────────────────────────
      const loIdx = Math.floor(fracIdx);
      const hiIdx = Math.min(loIdx + 1, frames.length - 1);
      const blend = fracIdx - loIdx; // fractional part [0, 1)

      const loFrame = frames[loIdx];
      if (!loFrame) return; // frame not yet loaded — skip this tick

      // ── Draw: frame lo at full opacity ────────────────────────────────────
      drawImageCover(ctx, loFrame, { clear: true });

      // ── Draw: frame hi cross-blended on top ───────────────────────────────
      // blend < 0.008 is imperceptible — skip the second draw to save a blit.
      const hiFrame = frames[hiIdx];
      if (hiFrame && blend > 0.008) {
        ctx.globalAlpha = blend;
        drawImageCover(ctx, hiFrame, { clear: false }); // don't clear — paint over lo
        ctx.globalAlpha = 1;
      }

      // ── Overlays ──────────────────────────────────────────────────────────
      updateOverlays(next);
    }

    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);

  // `frames` is a stable module-scope array reference — not a dep that causes re-runs.
  // `getCtx` and `updateOverlays` are stable useCallback refs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDesktop, getCtx, updateOverlays]);

  // ── ResizeObserver — keeps canvas at physical pixel resolution ─────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const ro = new ResizeObserver(() => {
      const w = Math.round(canvas.clientWidth  * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width === w && canvas.height === h) return;
      canvas.width  = w;
      canvas.height = h;
      ctxRef.current = null; // invalidate — getCtx() will rebuild
      // Force an immediate redraw at the new size
      lastFracIdxRef.current = -1;
    });

    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // ── Draw frame 0 once loaded (before any scroll has happened) ─────────────

  useEffect(() => {
    if (loaded && frames[0]) {
      drawImageCover(getCtx(), frames[0], { clear: true });
      lastFracIdxRef.current = 0;
    }
  }, [loaded, frames, getCtx]);

  // ── Render ────────────────────────────────────────────────────────────────

  const showCanvas   = SEQUENCE_CONFIG.hasFrames;
  const showFallback = !showCanvas || !loaded || !isDesktop;

  return (
    <section
      ref={wrapperRef}
      className={styles.wrapper}
      aria-label="MotoPark cinematic introduction"
    >
      {showCanvas && (
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          aria-hidden="true"
          style={{ opacity: (loaded && isDesktop) ? 1 : 0 }}
        />
      )}

      {showFallback && SEQUENCE_CONFIG.fallbackImageUrl && (
        <img
          src={SEQUENCE_CONFIG.fallbackImageUrl}
          className={styles.fallback}
          alt=""
          aria-hidden="true"
          loading="eager"
        />
      )}

      <div className={styles.scrim} aria-hidden="true" />

      <div className={styles.overlayContainer} aria-hidden="true">
        {OVERLAYS.map((overlay, i) => (
          <div
            key={overlay.id}
            ref={(el) => { overlayRefs.current[i] = el; }}
            className={[
              styles.overlay,
              styles[`overlayAlign--${overlay.align}`],
            ].join(' ')}
            style={{ opacity: isDesktop ? 0 : (overlay.id === 'brand' ? 1 : 0) }}
          >
            <p
              className={[
                styles.overlayText,
                styles[`overlayText--${overlay.size}`],
              ].join(' ')}
            >
              {overlay.text.split('\n').map((line, li) => (
                <span key={li} className={styles.overlayLine}>{line}</span>
              ))}
            </p>
            {overlay.sub && (
              <p className={styles.overlaySub}>{overlay.sub}</p>
            )}
          </div>
        ))}
      </div>

      {isDesktop && (
        <div className={styles.scrollHint} aria-hidden="true">
          <div className={styles.scrollLine}>
            <div className={styles.scrollDot} />
          </div>
          <span>Scroll</span>
        </div>
      )}
    </section>
  );
}
