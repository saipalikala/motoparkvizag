import styles from './HeroCarouselPagination.module.css';

/**
 * Pagination dots. `aria-current` (not `aria-selected`) is deliberate — the
 * latter is only valid on roles that support a selection model (tab,
 * option, etc.); these are plain buttons, and a half-implemented tablist
 * (missing the arrow-key roving-tabindex behaviour real tabs require) would
 * be worse than not claiming that role at all. `aria-current="true"`
 * correctly conveys "this is the current one" on any element.
 */
export default function HeroCarouselPagination({ count, selectedIndex, onSelect }) {
  if (count <= 1) return null;

  return (
    <div className={styles.dots} role="group" aria-label="Hero slide pagination">
      <div className={styles.glassTrack}>
        {Array.from({ length: count }).map((_, i) => (
          <button
            key={i}
            type="button"
            className={`${styles.dot} ${i === selectedIndex ? styles.dotActive : ''}`}
            aria-current={i === selectedIndex ? 'true' : undefined}
            aria-label={`Go to slide ${i + 1} of ${count}`}
            onClick={() => onSelect(i)}
          />
        ))}
      </div>
    </div>
  );
}
