import { statusMeta } from './orderService.js';
import styles from './StatusBadge.module.css';

/**
 * StatusBadge — coloured pill for an order status. Intent → token colour is
 * defined in STATUS_META (orderService). `size="sm"` for dense table rows.
 */
export default function StatusBadge({ status, size }) {
  const { label, intent } = statusMeta(status);
  return (
    <span className={`${styles.badge} ${styles[intent] ?? styles.neutral} ${size === 'sm' ? styles.sm : ''}`}>
      {label}
    </span>
  );
}
