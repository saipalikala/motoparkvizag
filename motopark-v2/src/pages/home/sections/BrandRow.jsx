import { Link } from 'react-router-dom';
import { useNav } from '@/contexts/NavContext.jsx';
import styles from './BrandRow.module.css';

/**
 * Custom SVG Vector Brand Logos for Riding Brands.
 * Crafted to mirror high-end corporate brand emblems (e.g. Jordan, AWS, Spotify, Honda).
 */
const BRAND_LOGOS = {
  axor: (
    <svg viewBox="0 0 40 40" fill="none" className={styles.brandSvg} aria-hidden="true">
      <path d="M20 4L32 10V20C32 28 20 36 20 36C20 36 8 28 8 20V10L20 4Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="20" cy="18" r="5" stroke="currentColor" strokeWidth="2" />
      <path d="M20 10V13M20 23V26M12 18H15M25 18H28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  smk: (
    <svg viewBox="0 0 40 40" fill="none" className={styles.brandSvg} aria-hidden="true">
      <path d="M6 24C12 16 22 12 34 10C26 18 20 22 14 30C12 28 8 26 6 24Z" fill="currentColor" />
      <path d="M12 14C18 10 26 8 36 6C30 13 24 16 18 23Z" fill="currentColor" opacity="0.6" />
    </svg>
  ),
  viaterra: (
    <svg viewBox="0 0 40 40" fill="none" className={styles.brandSvg} aria-hidden="true">
      <path d="M8 32L20 8L32 32H24L20 20L16 32H8Z" fill="currentColor" />
      <path d="M20 14L26 28H14L20 14Z" fill="currentColor" opacity="0.4" />
    </svg>
  ),
  shad: (
    <svg viewBox="0 0 40 40" fill="none" className={styles.brandSvg} aria-hidden="true">
      <rect x="7" y="10" width="26" height="20" rx="4" stroke="currentColor" strokeWidth="2.5" />
      <path d="M12 16H28M12 24H24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="28" cy="24" r="2" fill="currentColor" />
    </svg>
  ),
  mototorque: (
    <svg viewBox="0 0 40 40" fill="none" className={styles.brandSvg} aria-hidden="true">
      <circle cx="20" cy="20" r="13" stroke="currentColor" strokeWidth="2.5" />
      <path d="M20 7V11M20 29V33M7 20H11M29 20H33M11 11L14 14M26 26L29 29M11 29L14 26M26 14L29 11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="20" cy="20" r="5" fill="currentColor" />
    </svg>
  ),
  'red-rooster': (
    <svg viewBox="0 0 40 40" fill="none" className={styles.brandSvg} aria-hidden="true">
      <path d="M20 6C20 6 26 12 26 18C26 22 23 25 20 25C17 25 14 22 14 18C14 12 20 6 20 6Z" fill="currentColor" />
      <path d="M20 22C24 22 28 25 28 29C28 34 20 36 20 36C20 36 12 34 12 29C12 25 16 22 20 22Z" fill="currentColor" opacity="0.6" />
      <circle cx="20" cy="14" r="2" fill="#FFFBF7" />
    </svg>
  ),
  bmc: (
    <svg viewBox="0 0 40 40" fill="none" className={styles.brandSvg} aria-hidden="true">
      <rect x="8" y="8" width="24" height="24" rx="3" stroke="currentColor" strokeWidth="2.5" />
      <path d="M14 8V32M20 8V32M26 8V32M8 14H32M8 20H32M8 26H32" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
    </svg>
  ),
  '66bhp': (
    <svg viewBox="0 0 40 40" fill="none" className={styles.brandSvg} aria-hidden="true">
      <path d="M10 28A12 12 0 1 1 30 28" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M20 20L27 13" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="20" cy="20" r="3" fill="currentColor" />
    </svg>
  ),
  korda: (
    <svg viewBox="0 0 40 40" fill="none" className={styles.brandSvg} aria-hidden="true">
      <path d="M20 6L32 13V27L20 34L8 27V13L20 6Z" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M20 12L27 16V24L20 28L13 24V16L20 12Z" fill="currentColor" />
    </svg>
  ),
  'liu-hjg': (
    <svg viewBox="0 0 40 40" fill="none" className={styles.brandSvg} aria-hidden="true">
      <circle cx="15" cy="20" r="7" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="25" cy="20" r="7" stroke="currentColor" strokeWidth="2.5" />
      <path d="M15 17L17 20L15 23M25 17L27 20L25 23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  rolon: (
    <svg viewBox="0 0 40 40" fill="none" className={styles.brandSvg} aria-hidden="true">
      <rect x="6" y="15" width="12" height="10" rx="5" stroke="currentColor" strokeWidth="2.5" />
      <rect x="22" y="15" width="12" height="10" rx="5" stroke="currentColor" strokeWidth="2.5" />
      <path d="M14 20H26" stroke="currentColor" strokeWidth="3" />
    </svg>
  ),
  steelbird: (
    <svg viewBox="0 0 40 40" fill="none" className={styles.brandSvg} aria-hidden="true">
      <path d="M6 22C14 22 20 14 34 10C24 20 20 28 6 22Z" fill="currentColor" />
      <path d="M10 26C16 26 20 20 30 16C22 24 18 30 10 26Z" fill="currentColor" opacity="0.5" />
    </svg>
  ),
  vega: (
    <svg viewBox="0 0 40 40" fill="none" className={styles.brandSvg} aria-hidden="true">
      <path d="M8 10L20 32L32 10H24L20 22L16 10H8Z" fill="currentColor" />
    </svg>
  ),
  bobo: (
    <svg viewBox="0 0 40 40" fill="none" className={styles.brandSvg} aria-hidden="true">
      <rect x="12" y="7" width="16" height="26" rx="3" stroke="currentColor" strokeWidth="2.5" />
      <path d="M22 13L16 21H21L18 27" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  ),
};

/** Default curated brand roster for V2 Showcase. */
const SEED_BRANDS = [
  { label: 'Axor', slug: 'axor' },
  { label: 'SMK', slug: 'smk' },
  { label: 'Viaterra', slug: 'viaterra' },
  { label: 'SHAD', slug: 'shad' },
  { label: 'MotoTorque', slug: 'mototorque' },
  { label: 'Red Rooster', slug: 'red-rooster' },
  { label: 'BMC', slug: 'bmc' },
  { label: '66BHP', slug: '66bhp' },
  { label: 'Korda', slug: 'korda' },
  { label: 'Liu HJG', slug: 'liu-hjg' },
  { label: 'Rolon', slug: 'rolon' },
  { label: 'Steelbird', slug: 'steelbird' },
  { label: 'Vega', slug: 'vega' },
  { label: 'Bobo', slug: 'bobo' },
];

/**
 * MotoPark V2 — Redesigned Brand Showcase.
 * Dual continuous infinite marquee: Top row scrolls RIGHT, Bottom row scrolls LEFT.
 */
export default function BrandRow() {
  const { brands: navBrands } = useNav();

  // Combine dynamic nav brands or seed roster to guarantee a full multi-row showcase
  const allBrands = navBrands && navBrands.length >= 8 ? navBrands : SEED_BRANDS;

  // Split brands into Row 1 (Top) and Row 2 (Bottom)
  const mid = Math.ceil(allBrands.length / 2);
  const row1 = allBrands.slice(0, mid);
  const row2 = allBrands.slice(mid);

  // Duplicate rows for seamless infinite marquee loop
  const marqueeRow1 = [...row1, ...row1, ...row1, ...row1];
  const marqueeRow2 = [...row2, ...row2, ...row2, ...row2];

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

        {/* Infinite Dual-Row Marquee Stage */}
        <div className={styles.showcaseStage}>
          {/* Top Row — Auto Scroll RIGHT */}
          <div className={styles.trackRow}>
            <div className={`${styles.marqueeTrack} ${styles.trackRight}`}>
              {marqueeRow1.map((b, i) => {
                const logoSvg = BRAND_LOGOS[b.slug] ?? BRAND_LOGOS.axor;
                return (
                  <Link
                    key={`${b.slug}-r1-${i}`}
                    to={`/brand/${b.slug}`}
                    className={styles.brandCard}
                    aria-label={`Explore ${b.label}`}
                  >
                    <div className={styles.brandIconWrapper}>{logoSvg}</div>
                    <span className={styles.brandName}>{b.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Bottom Row — Auto Scroll LEFT */}
          <div className={styles.trackRow}>
            <div className={`${styles.marqueeTrack} ${styles.trackLeft}`}>
              {marqueeRow2.map((b, i) => {
                const logoSvg = BRAND_LOGOS[b.slug] ?? BRAND_LOGOS.smk;
                return (
                  <Link
                    key={`${b.slug}-r2-${i}`}
                    to={`/brand/${b.slug}`}
                    className={styles.brandCard}
                    aria-label={`Explore ${b.label}`}
                  >
                    <div className={styles.brandIconWrapper}>{logoSvg}</div>
                    <span className={styles.brandName}>{b.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
