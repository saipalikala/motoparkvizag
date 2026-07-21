import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Button from '@/components/ui/Button.jsx';
import styles from './StoryBand.module.css';

/**
 * HERO_NOTCH_PATH — Single source of truth for the architectural hero frame notch.
 * Expressed in normalized objectBoundingBox coordinates (0 to 1) for 100% fluid scaling.
 *
 * Architectural Decision Note:
 * SVG clipPath + Vector Stroke is used over CSS mask/clip-path because standard CSS masks
 * cannot trace a sharp 1.5px hairline outline around non-rectangular concave shapes without
 * blur artifacts. The SVG vectorEffect="non-scaling-stroke" provides subpixel anti-aliasing
 * and a continuous 1.5px outline across all viewport widths.
 */
const HERO_NOTCH_PATH =
  'M 0,0.05 C 0,0.01 0.01,0 0.04,0 L 0.74,0 C 0.78,0 0.80,0.02 0.80,0.06 L 0.80,0.10 C 0.80,0.14 0.82,0.16 0.86,0.16 L 0.94,0.16 C 0.98,0.16 1,0.18 1,0.22 L 1,0.94 C 1,0.98 0.98,1 0.94,1 L 0.04,1 C 0.01,1 0,0.98 0,0.94 Z';

const JOURNEYS = [
  {
    num: '01',
    id: 'commute',
    title: 'The daily commute',
    tagline: 'Urban Precision',
    copy: 'Reliable gear that turns everyday city traffic into the best part of your day.',
  },
  {
    num: '02',
    id: 'escape',
    title: 'The weekend escape',
    tagline: 'Mountain Curves',
    copy: 'Comfort and protection for the roads you chase when the work week ends.',
  },
  {
    num: '03',
    id: 'adventure',
    title: 'The cross-country adventure',
    tagline: 'Endless Horizons',
    copy: 'Kit built to go the distance, wherever the map runs out.',
  },
];

export default function StoryBand() {
  return (
    <section className={styles.band} aria-labelledby="story-title">
      {/* Hidden SVG definition for responsive objectBoundingBox clipPath */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <clipPath id="heroArchitecturalNotch" clipPathUnits="objectBoundingBox">
            <path d={HERO_NOTCH_PATH} />
          </clipPath>
        </defs>
      </svg>

      <div className={`container ${styles.inner}`}>
        {/* Stage 1: Monumental Hero Spread (Art-Directed Canvas) */}
        <div className={styles.heroStage}>
          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>Every ride counts</p>
            <h2 id="story-title" className={`display ${styles.title}`}>
              From the daily commute to the cross-country adventure.
            </h2>
            <p className={styles.lede}>
              MotoPark celebrates every ride — and stocks the genuine gear that makes
              each one safer, more comfortable, and memorable.
            </p>
          </div>

          <div className={styles.heroFrame}>
            <img
              src="/hero-1600.jpg"
              alt="Motorcyclist riding on an open highway"
              className={styles.photo}
              loading="lazy"
              decoding="async"
              width="1600"
              height="900"
            />
            <div className={styles.overlay} aria-hidden="true" />
            
            {/* Seamless 1.5px non-scaling border overlay */}
            <svg
              className={styles.frameBorder}
              viewBox="0 0 1 1"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d={HERO_NOTCH_PATH}
                fill="none"
                stroke="rgb(251 243 231 / 0.18)"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
        </div>

        {/* Stage 2: Light Supporting Journeys (Editorial Highlights) */}
        <div className={styles.journeysSection}>
          <p className={styles.journeysHeader}>Rider Disciplines</p>
          <div className={styles.journeysGrid}>
            {JOURNEYS.map((j) => (
              <div key={j.id} className={styles.journeyItem}>
                <div className={styles.journeyMeta}>
                  <span className={styles.journeyNumber}>{j.num}</span>
                  <span className={styles.journeyTagline}>{j.tagline}</span>
                </div>
                <h3 className={styles.journeyTitle}>{j.title}</h3>
                <p className={styles.journeyCopy}>{j.copy}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stage 3: Closing Brand Statement & Primary CTA */}
        <div className={styles.closingAction}>
          <p className={styles.closingEyebrow}>Why Riders Trust MotoPark</p>
          <h3 className={`display ${styles.closingTitle}`}>
            Ride Better. Ride Further.
          </h3>
          <Button as={Link} to="/store" variant="primary" size="lg">
            Explore Riding Gear
            <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
          </Button>
        </div>
      </div>
    </section>
  );
}
