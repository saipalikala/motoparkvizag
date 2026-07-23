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
 * @param {boolean}         [cfg.pin]          GSAP pin the trigger element (default true).
 *                                             Pass false when the caller's own CSS
 *                                             `position: sticky` already keeps the element
 *                                             on screen — this hook then only tracks scroll
 *                                             progress across `scrollHeight`, with no
 *                                             pin-spacer inserted.
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
  pin = true,
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

    // A function (not the raw '+=400vh' string) so GSAP re-evaluates it on
    // every refresh() — and, empirically, so it evaluates correctly at all:
    // with pin:false, passing the vh string directly produced an `end` only
    // ~parseFloat(scrollHeight) PIXELS past `start` (e.g. 400px for
    // '400vh', not 400% of viewport height) — GSAP's internal vh handling
    // for a `pin:true` trigger takes a different path than for a
    // non-pinned one, and only the pinned path resolved the unit
    // correctly. Verified by inspecting the live ScrollTrigger's start/end
    // via ScrollTrigger.getAll() in a real browser. Computing pixels
    // ourselves sidesteps whichever internal path is at fault, for both
    // pin states.
    //
    // pin:false subtracts one viewport height: with CSS `position: sticky`
    // standing in for GSAP's pin, a `scrollHeight`-tall container only stays
    // visually stuck for (scrollHeight − stickyChildHeight) of scroll — the
    // sticky child (by convention 100vh, matching the viewport, for every
    // current pin:false caller) needs to fully scroll past its own container
    // before it releases. Without this adjustment, progress was still
    // climbing toward 1 for another full viewport-height AFTER the section
    // had already scrolled off screen — verified in a real browser: at
    // progress ≈0.8 the page had already scrolled two sections further down,
    // so the content-reveal phase (progress 0.9–1) was playing to a section
    // nobody could see. Subtracting innerHeight makes progress 1 land
    // exactly where the sticky element actually releases.
    const scrollDistancePx = () => {
      const raw = window.innerHeight * (parseFloat(scrollHeight) / 100);
      return pin ? raw : raw - window.innerHeight;
    };

    const st = ScrollTrigger.create({
      trigger,
      start,
      end: () => `+=${scrollDistancePx()}`,
      scrub,
      pin,
      pinSpacing: pin,
      anticipatePin: pin ? 1 : 0,  // reduces jump when pin kicks in
      onUpdate:    (self) => onProgressRef.current?.(self.progress),
      onEnter:     ()     => onEnterRef.current?.(),
      onLeaveBack: ()     => onLeaveBackRef.current?.(),
    });

    // eslint-disable-next-line no-console -- TEMP DEBUG, remove after diagnosis
    console.log('[SCROLL-DEBUG] ScrollTrigger.create() called:', {
      triggerTag: trigger.tagName,
      triggerClassName: trigger.className,
      start: st.start,
      end: st.end,
      pin,
    });

    // Refresh after a short delay so any layout shifts from above (e.g. Navbar
    // height, OfferBar) are settled before we calculate pin positions.
    const refreshId = setTimeout(() => {
      ScrollTrigger.refresh();
      // eslint-disable-next-line no-console -- TEMP DEBUG, remove after diagnosis
      console.log('[SCROLL-DEBUG] post-refresh(400ms):', { start: st.start, end: st.end, progress: st.progress });
    }, 400);

    return () => {
      clearTimeout(refreshId);
      st.kill();
    };
  // Intentionally minimal deps: config values must be stable across renders.
  // Using triggerRef (a ref object) in deps is safe — the ref itself is stable.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, triggerRef, scrollHeight, scrub, start, pin]);
}
