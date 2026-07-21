import { Link } from 'react-router-dom';
import { BRAND_MENU } from '@/config/nav.js';
import styles from './BrandRow.module.css';

/**
 * Brand row — Redesigned ambient marquee with tactile typography cards.
 * Automatically switches to native scroll-snap on mobile.
 */
export default function BrandRow() {
  return (
    <section className={`section ${styles.wrap}`} aria-labelledby="brand-title">
      <div className="container">
        <header className={styles.header}>
          <p className={styles.eyebrow}>Genuine brands only</p>
          <h2 id="brand-title" className={styles.title}>
            The brands riders trust
          </h2>
        </header>
      </div>

      <div className={styles.railContainer}>
        {/* Depth fades (desktop only) */}
        <div className={`${styles.fade} ${styles.fadeLeft}`} aria-hidden="true" />
        <div className={`${styles.fade} ${styles.fadeRight}`} aria-hidden="true" />
        
        {/* Ambient track */}
        <div className={styles.railTrack}>
          {/* Primary List */}
          <ul className={styles.list}>
            {BRAND_MENU.map((b) => (
              <li key={b.slug}>
                <Link to={`/brand/${b.slug}`} className={styles.brand}>
                  {b.label}
                </Link>
              </li>
            ))}
          </ul>
          
          {/* Duplicate List for seamless CSS marquee (desktop only) */}
          <ul className={styles.list} aria-hidden="true" data-duplicate="true">
            {BRAND_MENU.map((b) => (
              <li key={`dup-${b.slug}`}>
                <Link to={`/brand/${b.slug}`} className={styles.brand} tabIndex="-1">
                  {b.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
