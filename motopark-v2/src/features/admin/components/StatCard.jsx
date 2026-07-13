import styles from './StatCard.module.css';

/**
 * StatCard — a single dashboard metric tile.
 *
 * props:
 *   label      — metric name (e.g. "Orders")
 *   value      — resolved value (string | number). Ignored while `loading`.
 *   icon       — optional lucide icon component
 *   accent     — icon chip tint: 'navy' (default) | 'orange' | 'green' | 'blue'
 *   loading    — show a skeleton in place of the value
 *   hint       — optional caption under the value (e.g. "All time")
 *   placeholder— when not loading and value is null/undefined, show this dash
 */
export default function StatCard({
  label,
  value,
  icon: Icon,
  accent = 'navy',
  loading = false,
  hint,
  placeholder = '—',
}) {
  const display = value === null || value === undefined ? placeholder : value;

  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <span className={styles.label}>{label}</span>
        {Icon && (
          <span className={`${styles.icon} ${styles[accent] ?? ''}`} aria-hidden="true">
            <Icon size={18} />
          </span>
        )}
      </div>

      {loading ? (
        <div className={`skeleton ${styles.valueSkeleton}`} aria-hidden="true" />
      ) : (
        <div className={styles.value}>{display}</div>
      )}

      {hint && !loading && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}
