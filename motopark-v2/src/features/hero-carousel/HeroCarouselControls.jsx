import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './HeroCarouselControls.module.css';

/**
 * Prev/Next arrows. Visually disabled (not hidden) at the ends since loop is
 * false — an inert button still occupies its slot, avoiding a layout shift
 * as the user reaches either end.
 *
 * Deliberately `aria-disabled`, not the native `disabled` attribute (found
 * during the final review, not introduced by it): a keyboard user who
 * presses Enter on "Next" while it's the last-but-one slide triggers the
 * exact `canNext -> false` transition on the button THEY currently have
 * focus on. A native `disabled` attribute on a focused element forces an
 * immediate browser-level blur to nowhere useful — there is no next element
 * it moves focus to. `aria-disabled` keeps the button focusable and
 * Tab-reachable always; the click handler's own `can && on()` guard is what
 * actually prevents the no-op action, so nothing is lost by not natively
 * disabling it.
 */
export default function HeroCarouselControls({ onPrev, onNext, canPrev, canNext }) {
  return (
    <div className={styles.controls}>
      <button
        type="button"
        className={styles.btn}
        onClick={() => canPrev && onPrev()}
        aria-disabled={!canPrev}
        aria-label="Previous slide"
      >
        <ChevronLeft size={20} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={styles.btn}
        onClick={() => canNext && onNext()}
        aria-disabled={!canNext}
        aria-label="Next slide"
      >
        <ChevronRight size={20} aria-hidden="true" />
      </button>
    </div>
  );
}
