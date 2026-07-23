import { memo, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { cloudinaryUrl } from '@/lib/image.js';
import GalleryImage from './GalleryImage.jsx';
import GalleryDots from './GalleryDots.jsx';
import styles from './gallery.module.css';

/**
 * ProductImageGallery — Presentation-agnostic, interactive, GPU-accelerated product gallery.
 *
 * Supports both controlled (selectedIndex / onIndexChange) and uncontrolled modes.
 * Supports strings and rich image objects, image preloading, and accessibility.
 */
const ProductImageGallery = memo(function ProductImageGallery({
  images = [],
  image = null,
  selectedIndex,
  onIndexChange,
  alt = 'Product image',
  imageWidth = 400,
  containerClassName = '',
  imageClassName = '',
  showDots = true,
  children, // Custom overlays passed by parent (e.g. HeroGradient, status badges)
}) {
  const imageList = useMemo(() => {
    let list = [];
    if (Array.isArray(images) && images.length > 0) {
      list = images.filter(Boolean);
    } else if (typeof images === 'string' && images.trim()) {
      list = [images.trim()];
    } else if (Array.isArray(image) && image.length > 0) {
      list = image.filter(Boolean);
    } else if (image) {
      list = [image];
    }
    return list;
  }, [images, image]);

  const total = imageList.length;
  const isControlled = typeof selectedIndex === 'number';
  const [internalIndex, setInternalIndex] = useState(0);
  const activeIndex = isControlled ? selectedIndex : internalIndex;

  const [direction, setDirection] = useState('next');
  const [animating, setAnimating] = useState(false);

  const containerRef = useRef(null);
  const touchStartPos = useRef({ x: 0, y: 0 });

  // Trigger animation state on change
  const triggerTransition = useCallback(
    (nextIdx, dir) => {
      setDirection(dir);
      setAnimating(true);
      if (!isControlled) {
        setInternalIndex(nextIdx);
      }
      if (onIndexChange) {
        onIndexChange(nextIdx);
      }
      const timer = setTimeout(() => setAnimating(false), 260); // 240-280ms GPU transition
      return () => clearTimeout(timer);
    },
    [isControlled, onIndexChange],
  );

  const handleNext = useCallback(
    (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (total <= 1) return;
      const nextIdx = (activeIndex + 1) % total;
      triggerTransition(nextIdx, 'next');
    },
    [activeIndex, total, triggerTransition],
  );

  const _handlePrev = useCallback(
    (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (total <= 1) return;
      const prevIdx = (activeIndex - 1 + total) % total;
      triggerTransition(prevIdx, 'prev');
    },
    [activeIndex, total, triggerTransition],
  );

  const handleSelect = useCallback(
    (index) => {
      if (total <= 1 || index === activeIndex) return;
      const dir = index > activeIndex ? 'next' : 'prev';
      triggerTransition(index, dir);
    },
    [activeIndex, total, triggerTransition],
  );

  // Preload adjacent images
  useEffect(() => {
    if (total > 1) {
      const nextIdx = (activeIndex + 1) % total;
      const prevIdx = (activeIndex - 1 + total) % total;
      [nextIdx, prevIdx].forEach((idx) => {
        const rawSrc = imageList[idx];
        const urlStr =
          typeof rawSrc === 'object' && rawSrc !== null ? rawSrc.url || rawSrc.src : rawSrc;
        if (urlStr) {
          const img = new Image();
          img.src = cloudinaryUrl(urlStr, { w: imageWidth });
        }
      });
    }
  }, [activeIndex, total, imageList, imageWidth]);

  // Wheel-driven cycling was removed: it required a non-passive `wheel`
  // listener (`preventDefault`/`stopPropagation` on the page's own scroll
  // input) on every multi-image card, which intermittently swallowed page
  // scroll whenever the cursor was over a gallery mid-scroll. Click, touch
  // swipe, keyboard arrows and the dots already cover gallery navigation —
  // removing this is a straight subtraction, not a replacement.

  // Touch handlers for mobile swipe
  const handleTouchStart = useCallback((e) => {
    if (e.touches && e.touches[0]) {
      touchStartPos.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  }, []);

  const handleTouchEnd = useCallback(
    (e) => {
      if (total <= 1 || !e.changedTouches || !e.changedTouches[0]) return;
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartPos.current.x;
      const deltaY = touchEndY - touchStartPos.current.y;

      if (Math.abs(deltaX) > 35 && Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX < 0) {
          const nextIdx = (activeIndex + 1) % total;
          triggerTransition(nextIdx, 'next');
        } else {
          const prevIdx = (activeIndex - 1 + total) % total;
          triggerTransition(prevIdx, 'prev');
        }
      }
    },
    [activeIndex, total, triggerTransition],
  );

  // Keyboard accessibility
  const handleKeyDown = useCallback(
    (e) => {
      if (total <= 1) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        const nextIdx = (activeIndex + 1) % total;
        triggerTransition(nextIdx, 'next');
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        const prevIdx = (activeIndex - 1 + total) % total;
        triggerTransition(prevIdx, 'prev');
      }
    },
    [activeIndex, total, triggerTransition],
  );

  const currentSrc = imageList[activeIndex] || null;

  return (
    <div
      ref={containerRef}
      className={`${styles.galleryContainer} ${containerClassName}`}
      tabIndex={total > 1 ? 0 : -1}
      role={total > 1 ? 'region' : undefined}
      aria-label={total > 1 ? `Product image gallery for ${alt}` : undefined}
      onClick={total > 1 ? handleNext : undefined}
      onTouchStart={total > 1 ? handleTouchStart : undefined}
      onTouchEnd={total > 1 ? handleTouchEnd : undefined}
      onKeyDown={total > 1 ? handleKeyDown : undefined}
    >
      <div className={styles.imageFrame}>
        <GalleryImage
          src={currentSrc}
          alt={`${alt} - view ${activeIndex + 1} of ${total}`}
          direction={direction}
          animating={animating}
          imageWidth={imageWidth}
          className={imageClassName}
        />
      </div>

      {/* Screen Reader Live Announcement */}
      {total > 1 && (
        <span className={styles.srOnly} aria-live="polite">
          Showing image {activeIndex + 1} of {total} for {alt}
        </span>
      )}

      {/* Parent-controlled overlays (e.g. HeroGradient, status badges, out of stock) */}
      {children}

      {/* Minimal centered dot indicator */}
      {total > 1 && showDots && (
        <GalleryDots total={total} activeIndex={activeIndex} onSelect={handleSelect} />
      )}
    </div>
  );
});

export default ProductImageGallery;
