/* ================================================
   useSmoothScroll.js — Refactored
   
   FIX: Previously called inside Home.jsx, causing
   Lenis to be created and destroyed on every
   Home mount/unmount → scroll jump + ghosting.
   
   SOLUTION: Call this hook ONCE at the App or
   Router level (e.g., src/App.jsx), not inside
   any page component.
   
   Usage in App.jsx:
     import useSmoothScroll from "@/hooks/useSmoothScroll";
     function App() {
       useSmoothScroll();
       return <RouterProvider ... />;
     }
   ================================================ */
import { useEffect, useRef } from "react";
import Lenis from "@studio-freight/lenis";

export default function useSmoothScroll() {
    const lenisRef = useRef(null);

    useEffect(() => {
        /* Guard: if already initialized (strict mode double-effect), skip */
        if (lenisRef.current) return;

        const lenis = new Lenis({
            lerp: 0.08,
            wheelMultiplier: 0.85,
            touchMultiplier: 1.5,
            /* smoothTouch: false keeps native momentum on iOS */
            smoothTouch: false,
        });

        lenisRef.current = lenis;

        let rafId;
        function raf(time) {
            lenis.raf(time);
            rafId = requestAnimationFrame(raf);
        }
        rafId = requestAnimationFrame(raf);

        return () => {
            cancelAnimationFrame(rafId);
            lenis.destroy();
            lenisRef.current = null;
        };
    }, []); /* empty dep array — runs once per mount */

    return lenisRef;
}