import { Link } from 'react-router-dom';
import { BRAND_MENU } from '@/config/nav.js';
import styles from './BrandRow.module.css';

/**
 * Brand row — Concept C §4 (brands wall). V1 has NO brand-logo assets (brand is
 * just a product string), so this is an honest wordmark row of the real carried
 * brands → /brand/:slug. Swap to logos if brand-image assets are ever added.
 */
export default function BrandRow() {
  return (
    <section className={`container section ${styles.wrap}`} aria-labelledby="brand-title">
      <p className={styles.eyebrow}>Genuine brands only</p>
      <h2 id="brand-title" className={styles.title}>
        The brands riders trust
      </h2>

      <ul className={styles.row}>
        {BRAND_MENU.map((b) => (
          <li key={b.slug}>
            <Link to={`/brand/${b.slug}`} className={styles.brand}>
              {b.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
