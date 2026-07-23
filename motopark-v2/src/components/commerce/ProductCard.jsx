import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useWishlist } from '@/contexts/WishlistContext.jsx';
import { useCart } from '@/contexts/CartContext.jsx';
import { useToast } from '@/contexts/ToastContext.jsx';
import { formatINR } from '@/lib/format.js';
import ProductImageGallery from './gallery/ProductImageGallery.jsx';
import AddToCartButton from './AddToCartButton.jsx';
import styles from './ProductCard.module.css';

function formatBadge(badge) {
  if (!badge) return null;
  const lower = String(badge).trim().toLowerCase();
  if (lower.includes('trending')) return '🔥';
  if (lower.includes('popular')) return '⭐';
  if (lower.includes('best seller') || lower.includes('bestseller')) return '🏆';
  if (lower.includes('new')) return '✨';
  if (lower.includes('limited')) return '⚡';
  return '🔥';
}

/**
 * ProductCard — Sculptural Product Card with interactive gallery, double-click locking,
 * and button morph animations.
 */
export default function ProductCard({ product, onAddToCart }) {
  const { has, toggle } = useWishlist();
  const { addItem } = useCart();
  const { showToast } = useToast();

  const [added, setAdded] = useState(false);
  const [heartPopping, setHeartPopping] = useState(false);
  const isSubmitting = useRef(false);

  if (!product) return null;

  const {
    id,
    name,
    priceINR,
    image,
    images = [],
    url,
    inStock,
    badge = 'Trending',
    description,
  } = product;

  const saved = has(id);

  const handleWishlistClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    setHeartPopping(true);

    toggle(product);
    showToast(saved ? `Removed ${name} from Wishlist` : `Added ${name} to Wishlist`, 'info');

    setTimeout(() => {
      setHeartPopping(false);
      isSubmitting.current = false;
    }, 300);
  };

  const handleCartClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSubmitting.current || inStock === false) return;
    isSubmitting.current = true;

    if (onAddToCart) {
      onAddToCart(product);
    } else {
      addItem({
        id: product.id,
        name: product.name,
        brand: product.brand,
        priceINR: product.priceINR,
        image: image || images[0] || null,
        qty: 1,
      });
    }

    setAdded(true);
    showToast(`Added ${name} to Cart`, 'success');

    setTimeout(() => {
      setAdded(false);
      isSubmitting.current = false;
    }, 2000);
  };

  return (
    <Link to={url} className={styles.card} aria-label={`View ${name}`}>
      {/* Media Section */}
      <div className={styles.mediaWrapper}>
        <ProductImageGallery images={images} image={image} alt={name}>
          {badge && <span className={styles.badge}>{formatBadge(badge)}</span>}
          {inStock === false && <span className={styles.oos}>Out of Stock</span>}
        </ProductImageGallery>
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
            className={`${styles.wishlistBtn} ${saved ? styles.wishlistActive : ''} ${heartPopping ? styles.wishlistPop : ''}`}
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

      {/* Floating Add to Cart Button with Persistent ShoppingBag & Top-Right Check Badge */}
      <AddToCartButton
        variant="icon"
        onClick={handleCartClick}
        added={added}
        disabled={inStock === false}
        ariaLabel={`Add ${name} to cart`}
      />
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
