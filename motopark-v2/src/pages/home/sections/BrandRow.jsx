import { Link } from 'react-router-dom';
import { useNav } from '@/contexts/NavContext.jsx';
import styles from './BrandRow.module.css';

/**
 * BrandRow — Premium Editorial Brand Showcase.
 *
 * Replaces the scrolling marquee with an Apple/Bang & Olufsen-grade editorial gallery.
 * Features a curated 2-row grid on desktop and a touch-snap horizontal carousel on mobile.
 */
export default function BrandRow() {
  const { brands: navBrands } = useNav();
  const brands = navBrands && navBrands.length > 0 ? navBrands : [
    { label: 'Axor', slug: 'axor' },
    { label: 'SMK', slug: 'smk' },
    { label: 'Viaterra', slug: 'viaterra' },
    { label: 'SHAD', slug: 'shad' },
    { label: 'MotoTorque', slug: 'mototorque' },
    { label: 'Red Rooster', slug: 'red-rooster' },
    { label: 'BMC', slug: 'bmc' },
    { label: '66BHP', slug: '66bhp' },
  ];

  return (
    <section className={`section ${styles.wrap}`} aria-labelledby="brand-title">
      <div className="container">
        {/* Editorial Section Header */}
        <header className={styles.header}>
          <p className={styles.eyebrow}>GENUINE RIDING BRANDS</p>
          <h2 id="brand-title" className={styles.title}>
            Trusted by Riders Across India
          </h2>
          <p className={styles.subtitle}>
            A curated selection of premier gear and performance engineering.
          </p>
        </header>

        {/* Desktop Editorial Grid & Mobile Touch-Snap Carousel */}
        <div className={styles.showcaseContainer}>
          <div className={styles.brandGrid}>
            {brands.map((b) => (
              <Link
                key={b.slug}
                to={`/brand/${b.slug}`}
                className={styles.brandCard}
                aria-label={`Explore ${b.label}`}
              >
                <div className={styles.brandMark}>
                  <span className={styles.brandName}>{b.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
