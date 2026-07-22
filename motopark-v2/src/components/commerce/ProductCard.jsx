import { Link } from 'react-router-dom';
import { Heart, ShoppingBag } from 'lucide-react';
import { useWishlist } from '@/contexts/WishlistContext.jsx';
import { formatINR } from '@/lib/format.js';
import { cloudinaryUrl } from '@/lib/image.js';
import styles from './ProductCard.module.css';

/**
 * ProductCard — Sculptural Product Card matching the Nike reference design.
 *
 * Visual hierarchy:
 * 1. Rounded Top Media Header with dynamic background gradient/color & top-left status pill badge.
 * 2. Title + Wishlist Row: Single-line bold title + circular floating Wishlist heart button.
 * 3. Short description (2-line clamped, optional gracefully collapsed).
 * 4. Price & Action Row: Large bold price (formatINR) + bottom-right floating cart action button with inverted cutout blending.
 */
export default function ProductCard({ product, onAddToCart }) {
  const { has, toggle } = useWishlist();
  if (!product) return null;

  const {
    id,
    name,
    priceINR,
    image,
    url,
    inStock,
    badge = 'Trending',
    description,
    mediaBg = 'radial-gradient(circle at center, #29354a 0%, #0f1624 100%)',
  } = product;

  const saved = has(id);

  const handleWishlistClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(product);
  };

  const handleCartClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(product);
    }
  };

  return (
    <Link to={url} className={styles.card} aria-label={`View ${name}`}>
      {/* Media Section */}
      <div className={styles.mediaWrapper} style={{ background: mediaBg }}>
        {badge && <span className={styles.badge}>{badge}</span>}

        {image ? (
          <img
            src={cloudinaryUrl(image, { w: 400 })}
            alt={name}
            loading="lazy"
            decoding="async"
            width="320"
            height="400"
            className={styles.productImage}
          />
        ) : (
          <span className={styles.fallback} aria-hidden="true">
            MP
          </span>
        )}

        {inStock === false && <span className={styles.oos}>Out of Stock</span>}
      </div>

      {/* Content Area */}
      <div className={styles.contentArea}>
        {/* Title + Wishlist Row */}
        <div className={styles.titleRow}>
          <h3 className={styles.title} title={name}>
            {name}
          </h3>
          <button
            type="button"
            className={`${styles.wishlistBtn} ${saved ? styles.wishlistActive : ''}`}
            aria-label={saved ? `Remove ${name} from wishlist` : `Add ${name} to wishlist`}
            aria-pressed={saved}
            onClick={handleWishlistClick}
          >
            <Heart
              size={18}
              strokeWidth={2}
              fill={saved ? 'currentColor' : 'none'}
              aria-hidden="true"
            />
          </button>
        </div>

        {/* Short Description (2-line clamped) */}
        {description ? (
          <p className={styles.description}>{description}</p>
        ) : (
          <p className={`${styles.description} ${styles.descriptionEmpty}`} aria-hidden="true" />
        )}

        {/* Price Row */}
        <div className={styles.priceRow}>
          <span className={styles.price}>{formatINR(priceINR)}</span>
        </div>
      </div>

      {/* Floating Add to Cart Button */}
      <button
        type="button"
        className={styles.cartBtn}
        aria-label={`Add ${name} to cart`}
        onClick={handleCartClick}
      >
        <ShoppingBag size={20} strokeWidth={2} aria-hidden="true" />
      </button>
    </Link>
  );
}

/**
 * ProductCard.Skeleton — CLS-free loading placeholder matching exact proportions.
 */
export function ProductCardSkeleton() {
  return (
    <div className={`${styles.card} ${styles.skeletonCard}`} aria-hidden="true">
      <div className={`${styles.mediaWrapper} ${styles.skeletonPulse}`} />
      <div className={styles.contentArea}>
        <div className={styles.titleRow}>
          <div className={`${styles.skeletonText} ${styles.skeletonTitle} ${styles.skeletonPulse}`} />
          <div className={`${styles.skeletonCircle} ${styles.skeletonPulse}`} />
        </div>
        <div className={`${styles.skeletonText} ${styles.skeletonDescLine} ${styles.skeletonPulse}`} />
        <div className={`${styles.skeletonText} ${styles.skeletonDescLine2} ${styles.skeletonPulse}`} />
        <div className={styles.priceRow}>
          <div className={`${styles.skeletonText} ${styles.skeletonPrice} ${styles.skeletonPulse}`} />
        </div>
      </div>
      <div className={`${styles.skeletonCartBtn} ${styles.skeletonPulse}`} />
    </div>
  );
}

ProductCard.Skeleton = ProductCardSkeleton;
