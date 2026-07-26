import { useState, useRef, memo } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag } from 'lucide-react';
import { useWishlist } from '@/contexts/WishlistContext.jsx';
import { useCart } from '@/contexts/CartContext.jsx';
import { useToast } from '@/contexts/ToastContext.jsx';
import { formatINR, discountPercent } from '@/lib/format.js';
import ProductImageGallery from './gallery/ProductImageGallery.jsx';
import styles from './ProductCard.module.css';

/**
 * ProductCard — Premium luxury ecommerce aesthetic.
 * Full-bleed image background, content floated on top with gradient overlay.
 * Wrapped in React.memo to prevent unnecessary re-renders during list filtering/state updates.
 */
const ProductCard = memo(function ProductCard({ product, onAddToCart }) {
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
    brand,
    category,
    priceINR,
    mrpINR,
    image,
    images = [],
    url,
    inStock,
    badge,
    description,
  } = product;

  const saved = has(id);
  const discount = mrpINR ? discountPercent(mrpINR, priceINR) : 0;

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

  const handleDoubleClick = (e) => {
    // Add to wishlist on double click
    handleWishlistClick(e);
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

  // Generate metadata chips
  const chips = [];
  if (brand) chips.push({ label: brand, type: 'brand' });
  if (category) chips.push({ label: category, type: 'category' });
  if (inStock === false) chips.push({ label: 'Out of Stock', type: 'stock' });
  else if (badge) chips.push({ label: badge, type: 'badge' });

  return (
    <Link to={url} className={styles.card} aria-label={`View ${name}`} onDoubleClick={handleDoubleClick}>
      
      {/* Background Layer */}
      <div className={styles.backgroundLayer}>
        <ProductImageGallery 
          images={images} 
          image={image} 
          alt={name} 
          imageClassName={styles.productImage} 
        />
      </div>

      {/* Gradient Overlay for Readability */}
      <div className={styles.gradientOverlay} />

      {/* Wishlist Button - Top Right over image */}
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

      {/* Content Overlay - Only Product Name & Price */}
      <div className={styles.contentOverlay}>
        {/* Title */}
        <h3 className={styles.title} title={name}>
          {name}
        </h3>

        {/* Price & Cart Row */}
        <div className={styles.bottomRow}>
          <div className={styles.priceGroup}>
            <span className={styles.priceMain}>
              {formatINR(priceINR)}
            </span>
            {discount > 0 && (
              <div className={styles.priceOriginalGroup}>
                <span className={styles.priceMrp}>{formatINR(mrpINR)}</span>
                <span className={styles.saveBadge}>{discount}% OFF</span>
              </div>
            )}
          </div>
          
          <button 
            type="button"
            className={`${styles.cartBtn} ${added ? styles.cartBtnAdded : ''}`}
            onClick={handleCartClick}
            disabled={inStock === false}
            aria-label={`Add ${name} to cart`}
          >
            <ShoppingBag size={18} strokeWidth={2} />
          </button>
        </div>
      </div>
    </Link>
  );
});

/**
 * ProductCard.Skeleton — Full bleed placeholder
 */
export function ProductCardSkeleton() {
  return (
    <div className={`${styles.card} ${styles.skeletonCard}`} aria-hidden="true">
      <div className={styles.gradientOverlay} style={{ background: '#222' }} />
      <div className={styles.contentOverlay}>
        <div className={styles.chipsRow}>
          <div className={`${styles.skeletonChip} skeleton`} />
          <div className={`${styles.skeletonChip} skeleton`} style={{width: '60px'}} />
        </div>
        <div className={`${styles.skeletonText} ${styles.skeletonTitle} skeleton`} />
        <div className={`${styles.skeletonText} ${styles.skeletonTitleLine2} skeleton`} />
        
        <div className={styles.bottomRow}>
          <div className={`${styles.skeletonText} ${styles.skeletonPrice} skeleton`} />
          <div className={`${styles.skeletonCartBtn} skeleton`} />
        </div>
      </div>
    </div>
  );
}

ProductCard.Skeleton = ProductCardSkeleton;

export default ProductCard;
