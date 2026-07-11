import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import Button from '@/components/ui/Button.jsx';
import { getMyOrders } from '@/services/orders.js';
import { formatINR } from '@/lib/format.js';
import styles from './OrderHistory.module.css';

const STATUS = {
  pending: { label: 'Pending', cls: 'pending' },
  confirmed: { label: 'Confirmed', cls: 'confirmed' },
  shipped: { label: 'Shipped', cls: 'shipped' },
  delivered: { label: 'Delivered', cls: 'delivered' },
  cancelled: { label: 'Cancelled', cls: 'cancelled' },
};

const fmtDate = (d) => {
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
};

/** OrderHistory — the signed-in user's orders (auth). Shared by Account + Track. */
export default function OrderHistory() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    getMyOrders()
      .then((d) => alive && setOrders(d.orders || []))
      .catch((e) => {
        if (!alive) return;
        setError(e?.message || 'Couldn’t load your orders.');
        setOrders([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (orders === null) {
    return (
      <div className={styles.list} aria-busy="true">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className={`skeleton ${styles.skel}`} />
        ))}
      </div>
    );
  }

  if (error && orders.length === 0) {
    return <p className={styles.empty}>{error}</p>;
  }

  if (orders.length === 0) {
    return (
      <div className={styles.emptyBox}>
        <span className={styles.emptyIcon} aria-hidden="true"><Package size={24} strokeWidth={1.6} /></span>
        <p className={styles.emptyTitle}>No orders yet</p>
        <Button as={Link} to="/store" variant="primary">Start shopping</Button>
      </div>
    );
  }

  return (
    <ul className={styles.list}>
      {orders.map((o) => {
        const s = STATUS[o.status] || { label: o.status, cls: 'pending' };
        const items = o.items || [];
        const first = items[0];
        const more = items.length - 1;
        return (
          <li key={o._id} className={styles.order}>
            <div className={styles.orderTop}>
              <div>
                <span className={styles.orderId}>Order #{String(o._id).slice(-8)}</span>
                <span className={styles.orderDate}>{fmtDate(o.createdAt)}</span>
              </div>
              <span className={`${styles.badge} ${styles[s.cls]}`}>{s.label}</span>
            </div>
            <p className={styles.orderItems}>
              {first ? first.name : 'Items'}
              {more > 0 ? ` and ${more} more item${more === 1 ? '' : 's'}` : ''}
            </p>
            <div className={styles.orderBottom}>
              <span className={styles.orderCount}>
                {items.reduce((n, i) => n + (i.quantity || 1), 0)} item(s)
              </span>
              <span className={`price ${styles.orderTotal}`}>{formatINR(o.total)}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
