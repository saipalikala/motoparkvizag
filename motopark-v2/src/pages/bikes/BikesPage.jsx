import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Bike } from 'lucide-react';
import { BIKE_MENU } from '@/config/nav.js';
import styles from './BikesPage.module.css';

/**
 * BikesPage `/bikes` — make grid → /bikes/:make. V1 has no structured fitment
 * data, so make pages are a best-effort text match (see BikeMakePage). This grid
 * is still solid navigation on its own.
 */
export default function BikesPage() {
  return (
    <div className="container section">
      <Helmet>
        <title>Shop by bike — MotoPark</title>
        <meta
          name="description"
          content="Find motorcycle gear and parts for your bike at MotoPark. Pick your make to get started."
        />
        <link rel="canonical" href="https://motoparkvizag.in/bikes" />
      </Helmet>

      <header className={styles.head}>
        <p className={styles.eyebrow}>Made for your machine</p>
        <h1 className={styles.title}>Shop by bike</h1>
        <p className={styles.sub}>Pick your make to see gear and parts riders choose for it.</p>
      </header>

      <div className={styles.grid}>
        {BIKE_MENU.map((b) => (
          <Link key={b.slug} to={`/bikes/${b.slug}`} className={styles.tile}>
            <span className={styles.iconWrap} aria-hidden="true">
              <Bike size={24} strokeWidth={1.6} />
            </span>
            <span className={styles.tileName}>{b.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
