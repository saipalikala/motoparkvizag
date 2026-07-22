import { memo } from 'react';
import { ShoppingBag, Check } from 'lucide-react';
import styles from './AddToCartButton.module.css';

/**
 * AddToCartButton — MotoPark V2 Premium Commerce Micro-Interaction Component.
 *
 * Keeps the ShoppingBag icon permanently visible while animating a top-right mini
 * success badge, subtle bag translateY/scale micro-motion, smooth background color
 * interpolation, and vertical sliding text.
 */
const AddToCartButton = memo(function AddToCartButton({
  onClick,
  added = false,
  disabled = false,
  variant = 'full', // 'full' | 'compact' | 'icon'
  defaultLabel = 'Add to Cart',
  successLabel = 'Added',
  className = '',
  ariaLabel,
}) {
  const getVariantClass = () => {
    switch (variant) {
      case 'compact':
        return styles.variantCompact;
      case 'icon':
        return styles.variantIcon;
      default:
        return styles.variantFull;
    }
  };

  const isIconOnly = variant === 'icon';
  const iconSize = isIconOnly ? 20 : variant === 'compact' ? 17 : 19;

  return (
    <button
      type="button"
      className={`${styles.btn} ${getVariantClass()} ${added ? styles.btnSuccess : ''} ${disabled ? styles.disabled : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel || (added ? successLabel : defaultLabel)}
    >
      {/* Persistent ShoppingBag icon with micro-motion & top-right success badge */}
      <span className={`${styles.iconWrap} ${added ? styles.bagPulse : ''}`}>
        <ShoppingBag size={iconSize} strokeWidth={2} aria-hidden="true" />
        {added && (
          <span className={styles.successBadge} aria-hidden="true">
            <Check size={8} strokeWidth={3} className={styles.checkIcon} />
          </span>
        )}
      </span>

      {/* Vertical Sliding Text (Full & Compact variants only) */}
      {!isIconOnly && (
        <span className={styles.labelContainer} aria-hidden="true">
          <span className={`${styles.labelTrack} ${added ? styles.labelTrackAdded : ''}`}>
            <span className={styles.labelText}>{defaultLabel}</span>
            <span className={styles.labelText}>{successLabel}</span>
          </span>
        </span>
      )}
    </button>
  );
});

export default AddToCartButton;
