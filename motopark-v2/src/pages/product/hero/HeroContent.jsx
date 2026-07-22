import { useState } from 'react';
import { Check, ShieldCheck, Truck, RotateCcw, Minus, Plus, Heart, Share2, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { formatINR } from '@/lib/format.js';
import { useToast } from '@/contexts/ToastContext.jsx';
import AddToCartButton from '@/components/commerce/AddToCartButton.jsx';
import styles from '../ProductHero.module.css';

const isHex = (v) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v || '');

export default function HeroContent({
  product,
  colorIdx,
  selectColor,
  size,
  setSize,
  qty,
  setQty,
  canAdd,
  needsSize,
  chosenSizeObj,
  availableStock,
  discount,
  variant,
  sizes,
  handleAdd,
  added,
  isWish,
  wishToggle,
  handleShare,
  copied,
  actionBlockRef,
}) {
  const { showToast } = useToast();
  const [descExpanded, setDescExpanded] = useState(false);
  const [heartPopping, setHeartPopping] = useState(false);
  const descText = product.description || '';
  const isLongDesc = descText.length > 140;

  const handleWishlistToggle = () => {
    setHeartPopping(true);
    wishToggle({
      id: product.id,
      name: product.name,
      brand: product.brand,
      priceINR: product.priceINR,
      image: variant.images?.[0] || null,
      url: product.url,
    });
    showToast(isWish ? `Removed ${product.name} from Wishlist` : `Added ${product.name} to Wishlist`, 'info');
    setTimeout(() => setHeartPopping(false), 300);
  };

  return (
    <div className={styles.contentColumn}>
      {/* 1. Eyebrow (Brand) */}
      <span className={styles.eyebrow}>{product.brand || 'MotoPark Original'}</span>

      {/* 2. Editorial Title (Product Name) */}
      <h1 className={styles.title}>{product.name}</h1>

      {/* 3. Price & Rating Row */}
      <div className={styles.priceRatingRow}>
        <div className={styles.priceGroup}>
          <span className={`price price--lg ${discount ? 'price--sale' : ''}`}>
            {formatINR(product.priceINR)}
          </span>
          {discount > 0 && (
            <>
              <span className="price price--mrp">{formatINR(product.mrpINR)}</span>
              <span className={styles.saveBadge}>{discount}% OFF</span>
            </>
          )}
        </div>

        <div className={styles.ratingBadge} title="4.8 out of 5 stars">
          <Star size={14} fill="currentColor" strokeWidth={0} className={styles.starIcon} aria-hidden="true" />
          <span>4.8</span>
          <span className={styles.reviewCount}>(48)</span>
        </div>
      </div>
      <p className={styles.taxNote}>Inclusive of all taxes & Pan-India delivery</p>

      {/* 4. Stock Row */}
      <div className={styles.stockRow}>
        {canAdd ? (
          <span className={styles.inStock}>
            <Check size={15} strokeWidth={2.4} aria-hidden="true" /> In stock
            {chosenSizeObj && chosenSizeObj.stock <= 5 ? ` — only ${chosenSizeObj.stock} left` : ''}
          </span>
        ) : needsSize && !size ? (
          <span className={styles.pickSize}>Select a size to check availability</span>
        ) : (
          <span className={styles.oos}>Out of stock</span>
        )}
      </div>

      {/* 5. Color Selection (Variants) */}
      {product.variants && product.variants.length > 1 && (
        <div className={styles.selectBlock}>
          <p className={styles.selectLabel}>
            Colour: <strong>{variant.colorName}</strong>
          </p>
          <div className={styles.swatches}>
            {product.variants.map((v, i) => (
              <button
                key={`${v.colorName}-${i}`}
                type="button"
                className={`${styles.swatch} ${i === colorIdx ? styles.swatchActive : ''}`}
                onClick={() => selectColor(i)}
                aria-label={v.colorName}
                aria-pressed={i === colorIdx}
                title={v.colorName}
              >
                {isHex(v.color) ? (
                  <span className={styles.swatchDot} style={{ background: v.color }} />
                ) : (
                  <span className={styles.swatchText}>{v.colorName}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 6. Size Selection */}
      {needsSize && (
        <div className={styles.selectBlock}>
          <p className={styles.selectLabel}>Size</p>
          <div className={styles.sizes}>
            {sizes.map((s) => {
              const oos = s.stock <= 0;
              return (
                <button
                  key={s.size}
                  type="button"
                  className={`${styles.sizeBtn} ${size === s.size ? styles.sizeActive : ''} ${oos ? styles.sizeOos : ''}`}
                  onClick={() => {
                    if (oos) return;
                    setSize(s.size);
                    setQty((q) => Math.min(q, Math.max(1, s.stock)));
                  }}
                  disabled={oos}
                  aria-pressed={size === s.size}
                >
                  {s.size}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. Quantity & CTA Row (Single responsive row) */}
      <div className={styles.actionBlock} ref={actionBlockRef}>
        <div className={styles.qtyStepper} aria-label="Quantity">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Decrease quantity"
            disabled={qty <= 1}
          >
            <Minus size={16} strokeWidth={2} aria-hidden="true" />
          </button>
          <span aria-live="polite">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(q + 1, Math.max(1, availableStock)))}
            aria-label="Increase quantity"
            disabled={qty >= availableStock}
          >
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <AddToCartButton
          variant="full"
          className={styles.addBtn}
          onClick={handleAdd}
          disabled={!canAdd}
          added={added}
          defaultLabel={canAdd ? 'Add to Cart' : needsSize && !size ? 'Select a Size' : 'Out of Stock'}
          successLabel="Added to Cart"
        />
      </div>

      {/* 8. Utility Actions (Wishlist & Share) */}
      <div className={styles.utilityRow}>
        <button
          type="button"
          className={`${styles.utilityBtn} ${isWish ? styles.wishActive : ''} ${heartPopping ? styles.wishlistPop : ''}`}
          onClick={handleWishlistToggle}
        >
          <Heart
            size={18}
            strokeWidth={1.8}
            fill={isWish ? 'currentColor' : 'none'}
            aria-hidden="true"
          />
          <span>{isWish ? 'Saved to Wishlist' : 'Add to Wishlist'}</span>
        </button>

        <button type="button" className={styles.utilityBtn} onClick={handleShare}>
          <Share2 size={18} strokeWidth={1.8} aria-hidden="true" />
          <span>{copied ? 'Link Copied!' : 'Share Product'}</span>
        </button>
      </div>

      {/* 9. Description with Read More Toggle (3-4 line clamped preview) */}
      {descText && (
        <div className={styles.descWrapper}>
          <p className={`${styles.description} ${!descExpanded && isLongDesc ? styles.descClamped : ''}`}>
            {descText}
          </p>
          {isLongDesc && (
            <button
              type="button"
              className={styles.readMoreBtn}
              onClick={() => setDescExpanded(!descExpanded)}
              aria-expanded={descExpanded}
            >
              <span>{descExpanded ? 'Show less' : 'Read more'}</span>
              {descExpanded ? (
                <ChevronUp size={14} strokeWidth={2} aria-hidden="true" />
              ) : (
                <ChevronDown size={14} strokeWidth={2} aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      )}

      {/* 10. Assurances List */}
      <ul className={styles.assurances}>
        <li><ShieldCheck size={16} strokeWidth={1.8} aria-hidden="true" /> Genuine product</li>
        <li><Truck size={16} strokeWidth={1.8} aria-hidden="true" /> Ships Pan-India</li>
        <li><RotateCcw size={16} strokeWidth={1.8} aria-hidden="true" /> Easy returns</li>
      </ul>
    </div>
  );
}
