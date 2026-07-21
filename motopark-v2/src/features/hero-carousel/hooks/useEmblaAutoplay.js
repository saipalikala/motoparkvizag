import { useEffect, useRef } from 'react';

/**
 * useEmblaAutoplay — production-quality autoplay that integrates with
 * Embla's own lifecycle rather than competing with it (Phase 3.5).
 *
 * Design decisions:
 *
 * 1. `setTimeout` self-rescheduling instead of `setInterval`.
 *    setInterval fires on a wall-clock cadence that is completely unaware of
 *    Embla's animation state. If a slide transition takes 300 ms and the
 *    interval fires at 3 000 ms, the NEXT fire lands at 3 000 ms regardless
 *    of whether the previous transition has settled — producing uneven
 *    dwell times. A self-rescheduling setTimeout starts its countdown AFTER
 *    the 'select' event confirms the previous transition is done, giving each
 *    slide a consistent 3-second visible window.
 *
 * 2. Pause/resume through a shared `playing` ref, not state.
 *    Autoplay state (playing/paused) does not drive any visible UI, so
 *    storing it in React state would cause unnecessary re-renders every time
 *    a pointer enters or leaves the viewport. A plain ref is cheaper.
 *
 * 3. Pause triggers:
 *    - `pointerdown` on the Embla container (drag started — user in control)
 *    - `pointerenter` on the viewport div (desktop hover — user inspecting)
 *    - `visibilitychange` (tab backgrounded — no point advancing)
 *
 *    Resume triggers (only if the corresponding pause fired):
 *    - `pointerup` / `pointercancel` on the window (drag released anywhere)
 *    - `pointerleave` on the viewport div (cursor left the hero)
 *    - `visibilitychange` (tab foregrounded)
 *
 *    These are additive — if multiple pause sources are active, the carousel
 *    stays paused until ALL have resolved. A simple counter tracks depth.
 *
 * 4. No-op when slideCount ≤ 1.
 *    A single-slide carousel has nothing to advance to. The hook attaches no
 *    listeners and schedules no timers in that case.
 *
 * 5. `isCinematicEligible()` is NOT used as a gate here.
 *    Autoplay is not a decorative "cinematic" enhancement — it is the primary
 *    navigation mechanism for users who never drag. Gating it on desktop
 *    would silently break autoplay for every mobile user. The parallax hook
 *    uses that gate because parallax IS decorative; autoplay is functional.
 *
 * `viewportEl` — the DOM node of the Embla viewport div, passed as a ref
 * so hover events can be attached to the exact element. Passed as a React
 * ref object (not a bare element) so this hook does not need to re-run if
 * the element is replaced.
 */

const DELAY_MS = 5000;

export function useEmblaAutoplay(emblaApi, viewportRef, slideCount) {
  // Stable refs — none of these changing should re-run the effect.
  const timerRef = useRef(null);
  const pauseDepthRef = useRef(0); // how many pause sources are currently active
  const playingRef = useRef(false);

  useEffect(() => {
    if (!emblaApi || slideCount <= 1) return undefined;

    // ── Timer helpers ──────────────────────────────────────────────────────

    const clearTimer = () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    /** Schedule the NEXT advance. Called after every successful slide select
     *  and after every resume, so the 3 s window is always measured from
     *  when the slide became fully visible / when hovering ended. */
    const scheduleNext = () => {
      clearTimer();
      timerRef.current = setTimeout(() => {
        if (pauseDepthRef.current > 0) return; // still paused — skip this tick
        emblaApi.scrollNext();
        // Do NOT reschedule here. The 'select' event fires after the
        // transition and reschedules from there, ensuring the full DELAY_MS
        // always elapses between the slide settling and the next advance.
      }, DELAY_MS);
    };

    // ── Pause / resume ─────────────────────────────────────────────────────

    const pause = () => {
      pauseDepthRef.current += 1;
      clearTimer();
    };

    const resume = () => {
      pauseDepthRef.current = Math.max(0, pauseDepthRef.current - 1);
      if (pauseDepthRef.current === 0 && playingRef.current) {
        scheduleNext();
      }
    };

    // ── Embla event handlers ───────────────────────────────────────────────

    /** Reschedule after each slide transition so dwell time is consistent. */
    const onSelect = () => {
      if (pauseDepthRef.current === 0 && playingRef.current) {
        scheduleNext();
      }
    };

    /** Drag started — pause immediately so the user is in full control. */
    const onPointerDown = () => pause();

    /** Drag released — resume after a brief settle (Embla's own momentum
     *  animation is running; 'select' will fire when it completes, which
     *  triggers onSelect → scheduleNext, so resume() just re-enables the
     *  flag without needing to schedule directly). */
    const onPointerUp = () => resume();

    // ── DOM event handlers (viewport hover) ────────────────────────────────

    const onViewportEnter = () => pause();
    const onViewportLeave = () => resume();

    // ── Visibility change (tab hidden/shown) ───────────────────────────────

    const onVisibilityChange = () => {
      if (document.hidden) {
        pause();
      } else {
        resume();
      }
    };

    // ── Wire everything up ─────────────────────────────────────────────────

    emblaApi.on('select', onSelect);
    emblaApi.on('pointerDown', onPointerDown);
    emblaApi.on('pointerUp', onPointerUp);

    const viewport = viewportRef.current;
    if (viewport) {
      viewport.addEventListener('pointerenter', onViewportEnter);
      viewport.addEventListener('pointerleave', onViewportLeave);
    }

    document.addEventListener('visibilitychange', onVisibilityChange);

    // Start playing.
    playingRef.current = true;
    pauseDepthRef.current = 0;
    scheduleNext();

    return () => {
      clearTimer();
      playingRef.current = false;

      emblaApi.off('select', onSelect);
      emblaApi.off('pointerDown', onPointerDown);
      emblaApi.off('pointerUp', onPointerUp);

      if (viewport) {
        viewport.removeEventListener('pointerenter', onViewportEnter);
        viewport.removeEventListener('pointerleave', onViewportLeave);
      }

      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  // slideCount intentionally included: re-run if slides are added/removed.
  // viewportRef is a stable ref object, not the element — safe as dependency.
  }, [emblaApi, viewportRef, slideCount]);
}
