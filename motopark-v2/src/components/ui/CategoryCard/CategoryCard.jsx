import { Link } from 'react-router-dom';
import styles from './CategoryCard.module.css';

/**
 * CategoryCard - Figma-aligned category tile with full-bleed background and gradient.
 * 
 * Extensibility notes:
 * - Accepts `slotBadge` for future promotional badges (e.g. "New", "-20%")
 * - Accepts `slotOverlay` for complex overlay UI
 * 
 * @param {Object} category - The category object (name, url, coverImage, description, ctaText)
 */
export default function CategoryCard({ category, slotBadge = null, slotOverlay = null }) {
  // Use coverImage if available, fallback to image, or default to a dark placeholder
  const imageUrl = category.coverImage || category.image;
  const bgStyle = imageUrl 
    ? { backgroundImage: `url(${imageUrl.startsWith('http') ? imageUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/${imageUrl.replace(/^\//, '')}`})` }
    : {};

  return (
    <Link to={category.url || `/category/${(category.slug || category.name.toLowerCase().replace(/\s+/g, '-'))}`} className={styles.card}>
      {/* Background Image */}
      <div className={`${styles.bg} ${!imageUrl ? styles.bgPlaceholder : ''}`} style={bgStyle} />
      
      {/* Gradient Overlay for Text Readability */}
      <div className={styles.overlay} />

      {/* Extensibility Slots */}
      {slotOverlay && <div className={styles.slotOverlay}>{slotOverlay}</div>}
      {slotBadge && <div className={styles.badge}>{slotBadge}</div>}

      {/* Content Content - Bottom Aligned */}
      <div className={styles.content}>
        <h3 className={styles.title}>{category.name}</h3>
        {category.description && (
          <p className={styles.description}>{category.description}</p>
        )}
        <div className={styles.ctaWrapper}>
          <span className={styles.ctaText}>
            {category.ctaText || 'Explore Collection'}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.ctaIcon}>
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
