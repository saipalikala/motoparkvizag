import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Jump guard.
 *
 * IntersectionObserver only fires when a threshold is CROSSED. An instant jump
 * — the hero's `#trust` anchor, browser scroll restoration, Ctrl+End — moves a
 * section from below the viewport (ratio 0) to above it (ratio 0) in one frame.
 * Nothing crosses, no callback runs, and that section stays at opacity 0
 * forever. Verified: jumping to the page bottom stranded three sections.
 *
 * So one shared, debounced sweep runs after scrolling settles and reveals
 * anything the observer could not have seen. Debounced rather than per-frame so
 * IntersectionObserver stays the mechanism doing the real work; this only ever
 * mops up. The listener detaches as soon as nothing is left armed.
 */
const pending = new Set();
let timer = 0;
let listening = false;

function sweep() {
  for (const item of pending) {
    if (item.el.getBoundingClientRect().top < window.innerHeight) {
      item.reveal();
      pending.delete(item);
    }
  }
  if (pending.size === 0) detach();
}

function onScroll() {
  clearTimeout(timer);
  timer = setTimeout(sweep, 150);
}

function detach() {
  if (!listening) return;
  listening = false;
  clearTimeout(timer);
  window.removeEventListener('scroll', onScroll);
}

function watch(item) {
  pending.add(item);
  if (listening) return;
  listening = true;
  window.addEventListener('scroll', onScroll, { passive: true });
}

function unwatch(item) {
  pending.delete(item);
  if (pending.size === 0) detach();
}

/**
 * One-shot scroll reveal, driven by IntersectionObserver (docs/11 §10:
 * "IntersectionObserver-driven, once").
 *
 * The important behaviour is what it does NOT animate. An element already in
 * the viewport on first paint is marked revealed synchronously and never
 * animates at all — no fade, no transition. That protects two things the
 * doctrine cares about: nothing delays product discovery on arrival, and the
 * LCP element is never hidden behind an opacity transition.
 *
 * Failure is safe by construction: the hidden state is applied by JS (`armed`),
 * so if this hook never runs — no IntersectionObserver, a JS error, a bot —
 * content renders plainly visible instead of stranded at opacity 0.
 */
export function useReveal({ threshold = 0.15, rootMargin = '0px 0px -10% 0px' } = {}) {
  const ref = useRef(null);
  const [armed, setArmed] = useState(false);
  const [revealed, setRevealed] = useState(false);

  // Layout effect, not effect: the hidden state must be applied before the
  // browser paints, or armed elements flash visible for a frame first.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    if (typeof IntersectionObserver === 'undefined') {
      setRevealed(true);
      return undefined;
    }

    // Already on screen → show it immediately, unanimated.
    if (el.getBoundingClientRect().top < window.innerHeight) {
      setRevealed(true);
      return undefined;
    }

    setArmed(true);

    const item = { el, reveal: () => setRevealed(true) };
    watch(item); // jump guard — see above

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setRevealed(true);
        unwatch(item);
        io.disconnect(); // once
      },
      { threshold, rootMargin },
    );
    io.observe(el);

    return () => {
      unwatch(item);
      io.disconnect();
    };
  }, [threshold, rootMargin]);

  return { ref, armed, revealed };
}
