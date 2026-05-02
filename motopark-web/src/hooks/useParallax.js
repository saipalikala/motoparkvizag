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

   FIX APPLIED:
   ✅ speed === 0 guard added at top of useEffect
      Previously: passing speed=0 (what PremiumCarousel
      does on mobile) still registered a scroll listener
      and an IntersectionObserver on every carousel mount.
      The isVisible guard only prevented the RAF *body*
      from running — the listener itself was still active,
      firing on every scroll event at 60fps on mobile.
      Now: if speed is 0, the effect returns immediately.
      No listener, no observer, no RAF. Zero overhead.
   ================================================ */
import { useEffect, useRef } from "react";

export default function useParallax({ speed = 0.3, scale = false } = {}) {
    const ref       = useRef(null);
    const isVisible = useRef(false);
    const rafId     = useRef(null);

    useEffect(() => {
        // ── FIX: skip entirely when speed is 0 ──
        // Callers pass speed=0 to opt-out (e.g. mobile).
        // Previously this still registered scroll + observer.
        if (!speed) return;

        const el = ref.current;
        if (!el) return;

        /* Track visibility — only run RAF when element is on-screen */
        const observer = new IntersectionObserver(
            ([entry]) => {
                isVisible.current = entry.isIntersecting;
            },
            { threshold: 0, rootMargin: "100px 0px" }
        );
        observer.observe(el);

        /* Scroll handler — only runs when visible */
        const onScroll = () => {
            if (!isVisible.current) return;

            rafId.current = requestAnimationFrame(() => {
                const rect    = el.getBoundingClientRect();
                const windowH = window.innerHeight;

                /* progress: 0 when element enters bottom, 1 when exits top */
                const progress        = (windowH - rect.top) / (windowH + rect.height);
                const clampedProgress = Math.max(0, Math.min(1, progress));

                /* offset from center (0.5) — ranges from -0.5 to +0.5 */
                const offset = (clampedProgress - 0.5) * 2;
                const y      = offset * speed * 100;

                let transform = `translateY(${y}px) translateZ(0)`;
                if (scale) {
                    const s = 1 + (1 - Math.abs(offset)) * 0.03;
                    transform += ` scale(${s.toFixed(3)})`;
                }

                el.style.transform         = transform;
                el.style.willChange        = "transform";
                el.style.backfaceVisibility = "hidden";
            });
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll(); /* initial position */

        return () => {
            observer.disconnect();
            window.removeEventListener("scroll", onScroll);
            if (rafId.current) cancelAnimationFrame(rafId.current);
            if (el) {
                el.style.transform          = "";
                el.style.willChange         = "";
                el.style.backfaceVisibility = "";
            }
        };
    }, [speed, scale]);

    return ref;
}