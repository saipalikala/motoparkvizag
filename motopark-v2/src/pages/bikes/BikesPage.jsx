import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Bike } from 'lucide-react';
import { useNav } from '@/contexts/NavContext.jsx';
import styles from './BikesPage.module.css';

/**
 * BikesPage `/bikes` — make grid → /bikes/:make. Reads the live fitment catalog
 * from NavContext (Milestone 10), so a make added in the admin panel shows up
 * here and in the navbar together. NavContext keeps the static seed as its
 * fallback, so an API failure still renders a usable grid.
 */
export default function BikesPage() {
  const { bikes } = useNav();

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
        {bikes.map((g) => (
          <Link key={g.makeSlug} to={`/bikes/${g.makeSlug}`} className={styles.tile}>
            <span className={styles.iconWrap} aria-hidden="true">
              <Bike size={24} strokeWidth={1.6} />
            </span>
            <span className={styles.tileName}>{g.make}</span>
            {g.models.length > 0 && (
              <span className={styles.tileMeta}>
                {g.models.length} model{g.models.length === 1 ? '' : 's'}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
