import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import CategoryCard from '@/components/ui/CategoryCard/CategoryCard';
import styles from './CategoryGrid.module.css';

/**
 * Category grid — Concept C §10 / Commerce Law 1 (discovery in first scroll).
 * Figma UI: 4-column desktop layout with full-bleed category cards.
 */

export default function CategoryGrid({ categories = [], loading = false, title = "Find your gear fast", subtitle = "Shop by category" }) {
  // Only show active categories
  const activeCategories = categories.filter(c => c.isActive !== false);
  const items = activeCategories.slice(0, 7); // 7 + "All gear" = balanced grid

  return (
    <section className={styles.surface} aria-labelledby="cat-title">
      <div className={`container section ${styles.wrap}`}>
        <header className={styles.head}>
          {subtitle && <p className={styles.eyebrow}>{subtitle}</p>}
          <h2 id="cat-title" className={styles.title}>
            {title}
          </h2>
        </header>

        <div className={styles.grid}>
        {loading && items.length === 0
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`skeleton ${styles.skel}`} aria-hidden="true" />
            ))
          : items.map((c) => (
              <CategoryCard key={c._id || c.id} category={c} />
            ))}

        {/* Always-present "All gear" tile → full catalog */}
        {!loading && (
          <Link to="/store" className={`${styles.tile} ${styles.allTile}`}>
            <span className={styles.iconWrap} aria-hidden="true">
              <ArrowRight size={26} strokeWidth={1.8} />
            </span>
            <span className={styles.tileName}>All gear</span>
          </Link>
        )}
      </div>
      </div>
    </section>
  );
}
