import { useEffect } from 'react';
import { MOTION_QUERIES, isCinematicEligible } from '@/lib/motionEligibility.js';

/**
 * Amendment 1 (B) — capped scroll-linked transform on the hero media element.
 *
 * The amendment permits this on **the single hero media element and nothing
 * else**; parallax remains banned everywhere else on the page. This hook is
 * therefore deliberately not generic — there is no selector, no options object
 * and no second call site. Making it reusable would be making it easy to
 * violate the doctrine.
 *
 * ## What moves, and what deliberately does not
 *
 * Only the `<img>` is transformed. The WebGL canvas stays screen-fixed, because
 * film grain and dust motes belong to the *viewport*, not to the photograph —
 * they read as atmosphere in front of the scene. Transforming both would double
 * the motion and make the two effects compete. The scrim also stays put, so the
 * headline's contrast gradient never drifts off the headline.
 *
 * ## Why this cannot cause layout shift
 *
 * `transform` is not a layout property, and the CLS spec explicitly excludes
 * transform changes from layout-shift scoring. The element is also absolutely
 * positioned inside `.media` (itself `position: absolute`), so it is out of flow
 * entirely — nothing can reflow around it.
 *
 * ## Why it cannot expose the background
 *
 * `Hero.module.css` gives the photo `PARALLAX_ROOM` px of bleed above and below
 * its container, and `.hero` clips with `overflow: hidden`. The shift is clamped
 * to exactly that room, so the photo's edges can never enter the frame. Change
 * one and you must change the other — see the comment in the CSS.
 */

/**
 * Must equal `--parallax-room` in `Hero.module.css`. The clamp below is what
 * stops the photo's edge appearing; the CSS is what creates the room to move in.
 */
const PARALLAX_ROOM = 32;

/**
 * Scroll-to-shift ratio. At 0.15 the photo reaches its full 32 px lag after
 * ~213 px of scroll — inside the hero's own height, so the whole effect plays
 * out while the hero is still the thing you are looking at. Higher values read
 * as the photo sliding rather than as depth.
 */
const FACTOR = 0.15;

export function useHeroParallax(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    let rafId = null;
    let onScreen = true;
    let enabled = false;
    let lastShift = -1;
    let promoted = false;

    const clear = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      // Leave the element exactly as the stylesheet describes it.
      el.style.transform = '';
      el.style.willChange = '';
      lastShift = -1;
      promoted = false;
    };

    const apply = () => {
      rafId = null;
      const shift = Math.min(Math.max(window.scrollY || 0, 0) * FACTOR, PARALLAX_ROOM);

      // A page sitting at the top must be left completely alone — no transform,
      // no will-change, no compositor layer. Without this the first (priming)
      // call still writes an identity transform and promotes the LCP image at
      // mount, which is precisely what the lazy promotion below exists to avoid.
      // Measured: `will-change: transform` was live on the hero photo before the
      // user had scrolled a single pixel.
      if (!promoted && shift === 0) {
        lastShift = 0;
        return;
      }

      // Sub-pixel churn is invisible and still costs a compositor commit.
      if (Math.abs(shift - lastShift) < 0.5) return;
      lastShift = shift;

      // will-change is set on FIRST MOVE, not at mount. Promoting the LCP image
      // to its own compositor layer before it has painted is a real risk to the
      // metric Phase 0 spent its whole budget on; promoting it once the user has
      // started scrolling costs nothing that matters.
      if (!promoted) {
        el.style.willChange = 'transform';
        promoted = true;
      }
      el.style.transform = `translate3d(0, ${shift.toFixed(2)}px, 0)`;
    };

    // Coalesce to one write per frame. Lenis scrolls the window, so it emits
    // native scroll events — this works identically with smooth scroll on or
    // off, and needs no reference to Lenis at all.
    const onScroll = () => {
      if (!enabled || !onScreen || rafId !== null) return;
      rafId = requestAnimationFrame(apply);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        // Off-screen there is nothing to see; stop doing compositor work.
        if (!onScreen && rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      },
      { threshold: 0 },
    );

    /** Eligibility can flip mid-session — resize, or toggling reduced motion. */
    const sync = () => {
      const next = isCinematicEligible();
      if (next === enabled) return;
      enabled = next;
      if (enabled) {
        io.observe(el);
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
      } else {
        io.unobserve(el);
        window.removeEventListener('scroll', onScroll);
        clear();
      }
    };

    const queries = MOTION_QUERIES.map((q) => window.matchMedia(q));
    queries.forEach((q) => q.addEventListener('change', sync));
    sync();

    return () => {
      queries.forEach((q) => q.removeEventListener('change', sync));
      window.removeEventListener('scroll', onScroll);
      io.disconnect();
      clear();
    };
  }, [ref]);
}
