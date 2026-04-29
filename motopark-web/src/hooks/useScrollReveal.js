/* ================================================
   useScrollReveal.js
   Unified scroll-reveal hook. One system, one easing.

   Variants:
   'fadeUp'    → slides up + fades in (default)
   'fadeLeft'  → slides in from left
   'fadeRight' → slides in from right
   'scaleUp'   → scales from 0.95 + fades in
   'fadeIn'    → pure opacity fade
   ================================================ */
import { useEffect, useRef } from "react";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const VARIANTS = {
    fadeUp:    { from: "translateY(32px)",  to: "translateY(0)" },
    fadeLeft:  { from: "translateX(-32px)", to: "translateX(0)" },
    fadeRight: { from: "translateX(32px)",  to: "translateX(0)" },
    scaleUp:   { from: "scale(0.95)",       to: "scale(1)"      },
    fadeIn:    { from: "none",              to: "none"           },
};

export default function useScrollReveal({
    variant   = "fadeUp",
    threshold = 0.12,
    delay     = 0,
    duration  = 700,
} = {}) {
    const ref = useRef(null);
    const timeoutRef = useRef(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const { from, to } = VARIANTS[variant] || VARIANTS.fadeUp;
        const hasTransform  = from !== "none";

        /* set initial hidden state */
        el.style.opacity   = "0";
        el.style.transform = hasTransform ? `${from} translateZ(0)` : "translateZ(0)";
        el.style.transition = `opacity ${duration}ms ${EASE} ${delay}ms, transform ${duration}ms ${EASE} ${delay}ms`;
        el.style.willChange = "opacity, transform";
        el.style.backfaceVisibility = "hidden";

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    el.style.opacity   = "1";
                    el.style.transform = hasTransform ? `${to} translateZ(0)` : "translateZ(0)";
                    observer.unobserve(el); /* fire once */

                    /* Clean up will-change after animation completes */
                    timeoutRef.current = setTimeout(() => {
                        if (el) {
                            el.style.willChange = "";
                            el.style.backfaceVisibility = "";
                        }
                    }, duration + delay + 100);
                }
            },
            { threshold }
        );

        observer.observe(el);

        return () => {
            observer.disconnect();
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [variant, threshold, delay, duration]);

    return ref;
}