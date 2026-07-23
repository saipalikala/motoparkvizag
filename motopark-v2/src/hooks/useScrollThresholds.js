import { useEffect, useRef, useState } from 'react';

/**
 * Tracks whether window.scrollY has passed each named threshold, with ONE
 * scroll listener and ONE requestAnimationFrame chain shared across all of
 * them — not one pair per threshold (see Navbar.jsx, which used to call
 * useScrolled() twice: two listeners, two independent rAF loops doing
 * near-identical work every scroll frame).
 *
 * @param {Record<string, number>} thresholds e.g. { scrolled: 8, pastHero: 640 }
 * @returns {Record<string, boolean>} same keys, each true once scrollY > its value
 */
export function useScrollThresholds(thresholds) {
  const compute = () => {
    const out = {};
    for (const key in thresholds) out[key] = window.scrollY > thresholds[key];
    return out;
  };

  const [state, setState] = useState(compute);
  // Latest thresholds without re-subscribing the listener when the caller
  // passes a new object literal each render (Navbar recomputes one threshold
  // from window.innerHeight on every render).
  const thresholdsRef = useRef(thresholds);
  thresholdsRef.current = thresholds;

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const t = thresholdsRef.current;
        const next = {};
        let changed = false;
        setState((prev) => {
          for (const key in t) {
            next[key] = window.scrollY > t[key];
            if (next[key] !== prev[key]) changed = true;
          }
          return changed ? next : prev; // bail out — no re-render if nothing crossed
        });
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keys are static per call site
  }, []);

  return state;
}
