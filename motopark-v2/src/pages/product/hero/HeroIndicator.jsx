import styles from '../ProductHero.module.css';

export default function HeroIndicator({ pulse, hasInteracted }) {
  return (
    <div
      className={`${styles.centerNavIndicator} ${pulse ? styles.indicatorPulse : ''} ${hasInteracted ? styles.indicatorMuted : ''}`}
      title="Click or scroll to cycle views"
      aria-hidden="true"
    >
      <span className={styles.indicatorDot} />
    </div>
  );
}
