import { memo } from 'react';
import styles from './gallery.module.css';

/**
 * GalleryDots — Minimal centered dot indicator with expanding active pill.
 */

const GalleryDots = memo(function GalleryDots({ total, activeIndex, onSelect }) {
  if (total <= 1) return null;

  return (
    <div
      className={styles.dotsWrapper}
      role="tablist"
      aria-label="Product image pagination"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {Array.from({ length: total }, (_, i) => {
        const isActive = i === activeIndex;
        return (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={`Go to slide ${i + 1} of ${total}`}
            className={`${styles.dot} ${isActive ? styles.dotActive : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelect(i);
            }}
          />
        );
      })}
    </div>
  );
});

export default GalleryDots;
