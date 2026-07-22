import styles from './ToggleSwitch.module.css';

/**
 * ToggleSwitch — iOS-style smooth toggle switch component.
 */
export default function ToggleSwitch({ checked = false, onChange, label }) {
  return (
    <label className={styles.switchLabel}>
      {label && <span className={styles.labelSpan}>{label}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label || 'Toggle switch'}
        className={`${styles.switchTrack} ${checked ? styles.switchActive : ''}`}
        onClick={() => onChange && onChange(!checked)}
      >
        <span className={styles.switchThumb} />
      </button>
    </label>
  );
}
