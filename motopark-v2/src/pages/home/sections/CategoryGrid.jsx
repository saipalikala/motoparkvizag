import { Link } from 'react-router-dom';
import {
  HardHat,
  Shirt,
  Hand,
  Luggage,
  Footprints,
  Wrench,
  Package,
  ArrowRight,
} from 'lucide-react';
import styles from './CategoryGrid.module.css';

/**
 * Category grid — Concept C §10 / Commerce Law 1 (discovery in first scroll).
 * Whole-tile links to /c/:slug. V1 categories have no images yet, so tiles use
 * on-brand line-icons (identity: rounded 1.8px icons). When category.image is
 * populated in admin, swap the icon block for a photo — no structural change.
 */

// name → icon (case-insensitive); Package is the honest fallback.
const ICONS = {
  helmets: HardHat,
  jackets: Shirt,
  gloves: Hand,
  luggage: Luggage,
  'riding boots': Footprints,
  boots: Footprints,
  accessories: Wrench,
};

function iconFor(name) {
  return ICONS[(name || '').toLowerCase()] || Package;
}

export default function CategoryGrid({ categories = [], loading = false }) {
  const items = categories.slice(0, 7); // 7 + "All gear" = balanced grid

  return (
    <section className={styles.surface} aria-labelledby="cat-title">
      <div className={`container section ${styles.wrap}`}>
        <header className={styles.head}>
          <p className={styles.eyebrow}>Shop by category</p>
          <h2 id="cat-title" className={styles.title}>
            Find your gear fast
          </h2>
        </header>

        <div className={styles.grid}>
        {loading && items.length === 0
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`skeleton ${styles.skel}`} aria-hidden="true" />
            ))
          : items.map((c) => {
              const Icon = iconFor(c.name);
              return (
                <Link key={c.id} to={c.url} className={styles.tile}>
                  <span className={styles.iconWrap} aria-hidden="true">
                    <Icon size={26} strokeWidth={1.6} />
                  </span>
                  <span className={styles.tileName}>{c.name}</span>
                </Link>
              );
            })}

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
