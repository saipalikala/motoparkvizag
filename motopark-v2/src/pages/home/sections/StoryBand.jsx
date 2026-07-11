import { Link } from 'react-router-dom';
import { Sunrise, Mountain, Compass, ArrowRight } from 'lucide-react';
import styles from './StoryBand.module.css';

/**
 * Story band — Concept C §13, the navy "Every ride counts" moment (the 40%).
 * All-rider mandate made visible via the identity's own brand statement:
 * commute → weekend escape → cross-country adventure. Navy-800, cream text
 * (~10:1 AA). Reveals are CSS-only fades (Motion Doctrine); no parallax.
 */
const RIDES = [
  { Icon: Sunrise, title: 'The daily commute', copy: 'Reliable gear that turns the everyday ride into the best part of your day.' },
  { Icon: Mountain, title: 'The weekend escape', copy: 'Comfort and protection for the roads you chase when the week ends.' },
  { Icon: Compass, title: 'The cross-country adventure', copy: 'Kit built to go the distance, wherever the map runs out.' },
];

export default function StoryBand() {
  return (
    <section className={styles.band} aria-labelledby="story-title">
      <div className={`container ${styles.inner}`}>
        <header className={styles.head}>
          <p className={styles.eyebrow}>Every ride counts</p>
          <h2 id="story-title" className={`display ${styles.title}`}>
            From the daily commute to the cross-country adventure.
          </h2>
          <p className={styles.lede}>
            MotoPark celebrates every ride — and stocks the genuine gear that makes
            each one better.
          </p>
        </header>

        <ul className={styles.rides}>
          {RIDES.map(({ Icon, title, copy }) => (
            <li key={title} className={styles.ride}>
              <span className={styles.iconWrap} aria-hidden="true">
                <Icon size={24} strokeWidth={1.6} />
              </span>
              <h3 className={styles.rideTitle}>{title}</h3>
              <p className={styles.rideCopy}>{copy}</p>
            </li>
          ))}
        </ul>

        <Link to="/about" className={styles.cta}>
          Read the MotoPark story
          <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
