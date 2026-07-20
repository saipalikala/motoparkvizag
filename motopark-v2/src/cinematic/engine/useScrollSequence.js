import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * useScrollSequence — pins a trigger element and drives a progress callback
 * via GSAP ScrollTrigger scrub.
 *
 * ─── Design ───────────────────────────────────────────────────────────────────
 *
 * This hook is intentionally generic: it knows nothing about canvases, frames,
 * or content. The caller supplies all rendering logic via `onProgress`.
 *
 * `onProgress` is consumed via a ref so it can be replaced on every render
 * (e.g. when `loaded` changes) without causing the ScrollTrigger to re-register.
 *
 * `onEnter` / `onLeave` are also ref-stabilised for the same reason.
 *
 * ─── To create a new cinematic section ────────────────────────────────────────
 *
 * 1. Create a `wrapperRef` for the element you want pinned.
 * 2. Supply `onProgress(progress: number)` — do your drawing/updates here.
 * 3. Tune `scrollHeight` and `scrub` in your section's config file.
 * 4. Pass `enabled={false}` on mobile to skip registration entirely.
 *
 * @param {object}          cfg
 * @param {React.RefObject} cfg.triggerRef     Element to pin and use as trigger
 * @param {function}        cfg.onProgress     Called with progress [0, 1] on scrub
 * @param {string}          [cfg.scrollHeight] Pin scroll distance, e.g. '400vh'
 * @param {number}          [cfg.scrub]        GSAP scrub value (0 = instant, 1 = 1s lag)
 * @param {string}          [cfg.start]        ScrollTrigger start, default 'top top'
 * @param {boolean}         [cfg.enabled]      Only register when true (default true)
 * @param {function}        [cfg.onEnter]      Called when entering the pinned section
 * @param {function}        [cfg.onLeaveBack]  Called when scrolling back past start
 */
export function useScrollSequence({
  triggerRef,
  onProgress,
  scrollHeight = '400vh',
  scrub = 0.8,
  start = 'top top',
  enabled = true,
  onEnter,
  onLeaveBack,
}) {
  // Ref-wrap all callbacks so the ScrollTrigger never needs to re-register
  // when these change.
  const onProgressRef  = useRef(onProgress);
  const onEnterRef     = useRef(onEnter);
  const onLeaveBackRef = useRef(onLeaveBack);

  // Keep refs current without triggering the main effect.
  useEffect(() => { onProgressRef.current  = onProgress;  });
  useEffect(() => { onEnterRef.current     = onEnter;     });
  useEffect(() => { onLeaveBackRef.current = onLeaveBack; });

  useEffect(() => {
    const trigger = triggerRef.current;
    if (!enabled || !trigger) return;

    const st = ScrollTrigger.create({
      trigger,
      start,
      end: `+=${scrollHeight}`,
      scrub,
      pin: true,
      pinSpacing: true,
      anticipatePin: 1,           // reduces jump when pin kicks in
      onUpdate:    (self) => onProgressRef.current?.(self.progress),
      onEnter:     ()     => onEnterRef.current?.(),
      onLeaveBack: ()     => onLeaveBackRef.current?.(),
    });

    // Refresh after a short delay so any layout shifts from above (e.g. Navbar
    // height, OfferBar) are settled before we calculate pin positions.
    const refreshId = setTimeout(() => ScrollTrigger.refresh(), 400);

    return () => {
      clearTimeout(refreshId);
      st.kill();
    };
  // Intentionally minimal deps: config values must be stable across renders.
  // Using triggerRef (a ref object) in deps is safe — the ref itself is stable.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, triggerRef, scrollHeight, scrub, start]);
}
