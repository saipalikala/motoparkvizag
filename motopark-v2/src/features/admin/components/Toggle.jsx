import styles from './Toggle.module.css';

/**
 * Toggle — an accessible on/off switch (a styled checkbox).
 *
 * props: checked, onChange(nextBool), label, hint, disabled, id
 */
export default function Toggle({ checked, onChange, label, hint, disabled = false, id }) {
  return (
    <label className={`${styles.row} ${disabled ? styles.disabled : ''}`} htmlFor={id}>
      <span className={styles.switch}>
        <input
          id={id}
          type="checkbox"
          className={styles.input}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className={styles.track} aria-hidden="true">
          <span className={styles.thumb} />
        </span>
      </span>
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        {hint && <span className={styles.hint}>{hint}</span>}
      </span>
    </label>
  );
}
