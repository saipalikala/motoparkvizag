import { memo } from 'react';
import { cloudinaryUrl } from '@/lib/image.js';
import styles from './gallery.module.css';

/**
 * GalleryImage — GPU-optimized image component supporting strings and rich image objects.
 */
const GalleryImage = memo(function GalleryImage({
  src,
  alt = 'Product view',
  direction = 'next',
  animating = false,
  imageWidth = 400,
  width = '320',
  height = '400',
  className = '',
  priority = false,
}) {
  const rawSrc = typeof src === 'object' && src !== null ? src.url || src.src || src.path : src;
  const imageAlt = typeof src === 'object' && src !== null && src.alt ? src.alt : alt;

  if (!rawSrc) {
    return (
      <span className={styles.fallbackText} aria-hidden="true">
        MP
      </span>
    );
  }

  const url = cloudinaryUrl(rawSrc, { w: imageWidth });
  const animClass = animating
    ? direction === 'next'
      ? styles.imageSlideNext
      : styles.imageSlidePrev
    : styles.imageEntering;

  return (
    <img
      key={rawSrc}
      src={url}
      alt={imageAlt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      width={width}
      height={height}
      className={`${styles.productImage} ${animClass} ${className}`}
    />
  );
});

export default GalleryImage;
