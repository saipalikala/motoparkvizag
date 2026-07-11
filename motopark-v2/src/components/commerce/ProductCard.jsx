import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useWishlist } from '@/contexts/WishlistContext.jsx';
import { formatINR } from '@/lib/format.js';
import { cloudinaryUrl } from '@/lib/image.js';
import styles from './ProductCard.module.css';

/**
 * ProductCard — the canonical commerce card (docs/09). Presentational, reads the
 * wishlist context for its heart toggle; otherwise receives a UI-ready product.
 * Reused by Bestsellers, New Arrivals, and every listing page.
 *
 * product: { id, name, brand, priceINR, image, url, inStock }
 *
 * Commerce Law 2: price is ink (.price); orange is reserved for sale/discount.
 * 4:5 image ratio is locked (perf: reserved box → CLS 0).
 */
export default function ProductCard({ product }) {
  const { has, toggle } = useWishlist();
  if (!product) return null;
  const { name, brand, priceINR, image, url, inStock } = product;
  const saved = has(product.id);

  return (
    <Link to={url} className={styles.card}>
      <div className={styles.media}>
        {image ? (
          <img
            src={cloudinaryUrl(image, { w: 400 })}
            alt={name}
            loading="lazy"
            decoding="async"
            width="320"
            height="400"
            className={styles.img}
          />
        ) : (
          <span className={styles.fallback} aria-hidden="true">
            MP
          </span>
        )}
        <button
          type="button"
          className={`${styles.wish} ${saved ? styles.wishOn : ''}`}
          aria-label={saved ? `Remove ${name} from wishlist` : `Add ${name} to wishlist`}
          aria-pressed={saved}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggle(product);
          }}
        >
          <Heart size={16} strokeWidth={1.8} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>
        {inStock === false && <span className={styles.oos}>Out of stock</span>}
      </div>

      <div className={styles.body}>
        {brand && <span className={styles.brand}>{brand}</span>}
        <span className={styles.name}>{name}</span>
        <span className={`price ${styles.price}`}>{formatINR(priceINR)}</span>
      </div>
    </Link>
  );
}
