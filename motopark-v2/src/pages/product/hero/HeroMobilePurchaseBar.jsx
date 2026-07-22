import { memo } from 'react';
import AddToCartButton from '@/components/commerce/AddToCartButton.jsx';
import { formatINR } from '@/lib/format.js';
import { cloudinaryUrl } from '@/lib/image.js';
import styles from '../ProductHero.module.css';

/**
 * HeroMobilePurchaseBar — Sticky bottom purchase bar for mobile devices.
 * Slides up via IntersectionObserver when main action block scrolls off-screen.
 */
const HeroMobilePurchaseBar = memo(function HeroMobilePurchaseBar({
  product,
  variant,
  canAdd,
  needsSize,
  size,
  handleAdd,
  added,
  visible,
}) {
  if (!product) return null;

  const imgSrc = variant?.images?.[0] || product?.image;

  return (
    <div
      className={`${styles.mobileStickyBar} ${visible ? styles.mobileStickyBarVisible : ''}`}
      aria-hidden={!visible}
    >
      <div className={styles.mobileStickyContent}>
        {/* Product Thumbnail & Name */}
        <div className={styles.mobileStickyMeta}>
          {imgSrc && (
            <img
              src={cloudinaryUrl(imgSrc, { w: 120 })}
              alt=""
              width="44"
              height="44"
              className={styles.mobileStickyThumb}
            />
          )}
          <div className={styles.mobileStickyText}>
            <span className={styles.mobileStickyTitle}>{product.name}</span>
            <span className={styles.mobileStickyPrice}>{formatINR(product.priceINR)}</span>
          </div>
        </div>

        {/* Compact Add to Cart CTA */}
        <AddToCartButton
          variant="compact"
          className={styles.mobileStickyBtn}
          onClick={handleAdd}
          disabled={!canAdd}
          added={added}
          defaultLabel={canAdd ? 'Add' : needsSize && !size ? 'Select Size' : 'Out of Stock'}
          successLabel="Added"
        />
      </div>
    </div>
  );
});

export default HeroMobilePurchaseBar;
