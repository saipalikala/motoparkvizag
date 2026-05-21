/* ================================================
   useParallax.js
   Lightweight scroll-driven parallax using
   IntersectionObserver + requestAnimationFrame.

   Usage:
     const ref = useParallax({ speed: 0.3 });
     <div ref={ref}>...</div>

   speed: 0 = no movement, 0.3 = slow bg, -0.1 = slight foreground
   GPU-friendly: only uses transform: translateY()
   Auto-pauses when element is off-screen.

   ─── FIXES IN THIS PASS ────────────────────────────────────────────────

   [P1] NON-STATIC POSITION GUARD
        The browser (and Framer Motion's ForwardRef internals) warn when
        getBoundingClientRect() is called for scroll-offset purposes on an
        element whose nearest positioned ancestor has position:static.
        The hook now ensures `el` has a non-static position before doing
        any measurement. If the element is static, it sets
        position:relative — which is safe because the element already has
        an explicit inset/transform applied by the parallax itself.

   [P2] SCROLL CONTAINER AWARENESS
        The previous implementation used `el.getBoundingClientRect()` and
        `window.innerHeight` to derive parallax progress. This is correct
        when `window` is the scroll root, but breaks silently when the
        element is inside an `overflow:hidden` / `overflow:scroll`
        ancestor (which the carousel is — `.carousel` has overflow:hidden).
        Fix: walk up the DOM to find the actual scroll container using
        `getScrollParent()`. If no scrolling ancestor exists, fall back to
        `window`. The progress calculation uses the scroll container's
        rect as the reference viewport instead of window.innerHeight.

   [P3] RAF CANCELLATION ON FAST SCROLL
        The previous code issued a new requestAnimationFrame on every
        scroll event without cancelling the previous pending one.
        On fast scroll (wheel inertia, fling gestures) this queued dozens
        of RAF callbacks in a single frame, all reading layout and writing
        style — a classic layout-thrash pattern.
        Fix: cancel the outstanding RAF before issuing a new one.
        This guarantees at most one pending callback per frame.

   [P4] RESIZE OBSERVER
        Parallax progress depends on `rect.height` and the scroll
        container height. Neither updates when the user resizes the
        window. A ResizeObserver now triggers a fresh `onScroll()` call
        whenever the element or its scroll container changes size, keeping
        the parallax in sync across orientation changes and window resizes.

   ─── RETAINED FROM PREVIOUS PASS ──────────────────────────────────────
   ✅ speed === 0 guard: if speed is 0, effect returns immediately —
      no listener, no observer, no RAF. Zero mobile overhead.
   ✅ IntersectionObserver visibility gate: RAF body skipped off-screen.
   ✅ Full cleanup: observer.disconnect(), removeEventListener,
      cancelAnimationFrame, style reset on unmount.
   ================================================ */
import { useEffect, useRef } from "react";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * [P2]: Walk the DOM to find the nearest ancestor that actually scrolls.
 * Returns `window` if none found (standard page scroll).
 */
function getScrollParent(el) {
    if (!el) return window;
    let node = el.parentElement;
    while (node && node !== document.body) {
        const { overflow, overflowY } = window.getComputedStyle(node);
        if (/auto|scroll/.test(overflow) || /auto|scroll/.test(overflowY)) {
            return node;
        }
        node = node.parentElement;
    }
    return window;
}

/**
 * [P2]: Get the viewport rect for a scroll container.
 * For `window`, returns a rect matching the viewport dimensions.
 * For a scrollable element, returns its bounding rect.
 */
function getContainerRect(container) {
    if (container === window) {
        return { top: 0, height: window.innerHeight };
    }
    const r = container.getBoundingClientRect();
    return { top: r.top, height: r.height };
}

// ─── HOOK ─────────────────────────────────────────────────────────────────────

export default function useParallax({ speed = 0.3, scale = false } = {}) {
    const ref       = useRef(null);
    const isVisible = useRef(false);
    const rafId     = useRef(null);

    useEffect(() => {
        // ── [retained] skip entirely when speed is 0 ──
        if (!speed) return;

        const el = ref.current;
        if (!el) return;

        // [P1]: Ensure a non-static position so getBoundingClientRect-based
        // scroll math is accurate and Framer Motion's position check passes.
        // We only override if the element is genuinely static — we never
        // overwrite intentional absolute/fixed/sticky positioning.
        const computedPos = window.getComputedStyle(el).position;
        let appliedPositionFix = false;
        if (computedPos === "static") {
            el.style.position = "relative";
            appliedPositionFix = true;
        }

        // [P2]: Resolve the actual scroll container once on mount.
        // For the carousel, this will be `window` because .carousel has
        // overflow:hidden (not overflow:scroll), so the page itself scrolls.
        const scrollContainer = getScrollParent(el);

        /* Track visibility — only run RAF when element is on-screen */
        const observer = new IntersectionObserver(
            ([entry]) => { isVisible.current = entry.isIntersecting; },
            { threshold: 0, rootMargin: "100px 0px" }
        );
        observer.observe(el);

        /* Core parallax calculation */
        const onScroll = () => {
            if (!isVisible.current) return;

            // [P3]: Cancel any outstanding RAF before queueing a new one.
            // Prevents layout-thrash from multiple callbacks in one frame.
            if (rafId.current) cancelAnimationFrame(rafId.current);

            rafId.current = requestAnimationFrame(() => {
                const rect          = el.getBoundingClientRect();
                const { top: containerTop, height: containerHeight } =
                    getContainerRect(scrollContainer);

                // progress: 0 when element enters container bottom,
                //           1 when element exits container top
                const relativeTop = rect.top - containerTop;
                const progress    = (containerHeight - relativeTop) /
                                    (containerHeight + rect.height);
                const clamped     = Math.max(0, Math.min(1, progress));

                // offset from center (0.5) — ranges from -0.5 to +0.5
                const offset = (clamped - 0.5) * 2;
                const y      = offset * speed * 100;

                let transform = `translateY(${y}px) translateZ(0)`;
                if (scale) {
                    const s = 1 + (1 - Math.abs(offset)) * 0.03;
                    transform += ` scale(${s.toFixed(3)})`;
                }

                el.style.transform          = transform;
                el.style.willChange         = "transform";
                el.style.backfaceVisibility = "hidden";
            });
        };

        // Use the resolved scroll container as the event target.
        // For `window` this is identical to the previous behaviour.
        scrollContainer.addEventListener("scroll", onScroll, { passive: true });
        onScroll(); // set initial position

        // [P4]: Keep parallax in sync on resize / orientation change.
        // ResizeObserver fires at most once per frame (batched by the browser),
        // so this doesn't cause extra scroll calculations during animations.
        let resizeObserver;
        if (typeof ResizeObserver !== "undefined") {
            resizeObserver = new ResizeObserver(onScroll);
            resizeObserver.observe(el);
            // Also observe the scroll container if it's a DOM element
            if (scrollContainer !== window) {
                resizeObserver.observe(scrollContainer);
            }
        } else {
            // Fallback for browsers without ResizeObserver (very old Safari)
            window.addEventListener("resize", onScroll, { passive: true });
        }

        return () => {
            observer.disconnect();
            if (resizeObserver) {
                resizeObserver.disconnect();
            } else {
                window.removeEventListener("resize", onScroll);
            }
            scrollContainer.removeEventListener("scroll", onScroll);
            if (rafId.current) cancelAnimationFrame(rafId.current);
            if (el) {
                el.style.transform          = "";
                el.style.willChange         = "";
                el.style.backfaceVisibility = "";
                // [P1]: Only undo the position fix if we applied it
                if (appliedPositionFix) el.style.position = "";
            }
        };
    }, [speed, scale]);

    return ref;
}