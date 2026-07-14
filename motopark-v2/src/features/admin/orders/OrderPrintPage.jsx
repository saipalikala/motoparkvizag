import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import logoBadge from '@/assets/images/logo-badge.png';
import { formatINR } from '@/lib/format.js';
import { STORE } from '@/config/store.js';
import { getOrder, paymentInfo } from './orderService.js';
import styles from './OrderPrintPage.module.css';

const fmtDate = (d) => {
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
};

/**
 * OrderPrintPage — a clean, standalone packing slip / invoice (docs/06 §2).
 * Mounted OUTSIDE AdminLayout (no sidebar/topbar). Auto-opens the print dialog
 * once loaded; @media print strips the on-screen controls.
 */
export default function OrderPrintPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | notfound | error

  useEffect(() => {
    let alive = true;
    getOrder(id)
      .then((o) => {
        if (!alive) return;
        if (!o) return setState('notfound');
        setOrder(o);
        setState('ready');
      })
      .catch(() => alive && setState('error'));
    return () => {
      alive = false;
    };
  }, [id]);

  // Auto-open the print dialog once the slip has rendered.
  useEffect(() => {
    if (state !== 'ready') return;
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, [state]);

  const financials = useMemo(() => {
    if (!order) return { subtotal: 0, shipping: 0, total: 0 };
    const subtotal = (order.items || []).reduce(
      (s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 0),
      0,
    );
    const total = Number(order.total) || 0;
    return { subtotal, shipping: Math.max(0, total - subtotal), total };
  }, [order]);

  if (state === 'loading') return <div className={styles.center}>Loading packing slip…</div>;
  if (state === 'notfound') return <div className={styles.center}>Order not found.</div>;
  if (state === 'error') return <div className={styles.center}>Could not load this order.</div>;

  const addr = order.shippingAddress || {};
  const payment = paymentInfo(order);
  const units = (order.items || []).reduce((n, i) => n + (Number(i.quantity) || 0), 0);

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <button type="button" className={styles.printBtn} onClick={() => window.print()}>
          <Printer size={16} /> Print
        </button>
      </div>

      <div className={styles.sheet}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.brand}>
            <img src={logoBadge} alt="MotoPark" width={48} height={48} />
            <div>
              <p className={styles.brandName}>{STORE.name}</p>
              <p className={styles.brandTag}>Genuine motorcycle gear · Est. {STORE.established}</p>
            </div>
          </div>
          <div className={styles.docMeta}>
            <p className={styles.docType}>Packing Slip / Invoice</p>
            <p className={styles.docId}>#{String(order._id).slice(-8).toUpperCase()}</p>
            <p className={styles.docDate}>{fmtDate(order.createdAt)}</p>
          </div>
        </header>

        {/* Parties */}
        <section className={styles.parties}>
          <div className={styles.party}>
            <h2 className={styles.partyTitle}>Sold by</h2>
            <p className={styles.partyName}>{STORE.name}</p>
            {STORE.addressLines.map((l) => (
              <p key={l} className={styles.partyLine}>{l}</p>
            ))}
            <p className={styles.partyLine}>{STORE.phone}</p>
            <p className={styles.partyLine}>{STORE.email}</p>
          </div>
          <div className={styles.party}>
            <h2 className={styles.partyTitle}>Ship to</h2>
            <p className={styles.partyName}>{addr.name || 'Guest'}</p>
            {addr.address && <p className={styles.partyLine}>{addr.address}</p>}
            <p className={styles.partyLine}>
              {[addr.city, addr.state].filter(Boolean).join(', ')} {addr.pincode}
            </p>
            {addr.phone && <p className={styles.partyLine}>Phone: {addr.phone}</p>}
            {addr.email && <p className={styles.partyLine}>{addr.email}</p>}
          </div>
        </section>

        {/* Payment / status strip */}
        <section className={styles.strip}>
          <div>
            <span className={styles.stripLabel}>Payment</span>
            <span className={styles.stripValue}>{payment.label} · {payment.method}</span>
          </div>
          <div>
            <span className={styles.stripLabel}>Status</span>
            <span className={styles.stripValue}>{order.status}</span>
          </div>
          {order.courierName && (
            <div>
              <span className={styles.stripLabel}>Courier</span>
              <span className={styles.stripValue}>
                {order.courierName}{order.trackingNumber ? ` · ${order.trackingNumber}` : ''}
              </span>
            </div>
          )}
        </section>

        {/* Items */}
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thLeft}>Item</th>
              <th className={styles.thLeft}>Variant</th>
              <th className={styles.thRight}>Qty</th>
              <th className={styles.thRight}>Unit</th>
              <th className={styles.thRight}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {(order.items || []).map((it, i) => (
              <tr key={i}>
                <td>{it.name}</td>
                <td className={styles.variant}>
                  {[it.selectedColor, it.selectedSize].filter(Boolean).join(' · ') || '—'}
                </td>
                <td className={styles.right}>{it.quantity}</td>
                <td className={styles.right}>{formatINR(it.price)}</td>
                <td className={styles.right}>
                  {formatINR((Number(it.price) || 0) * (Number(it.quantity) || 0))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className={styles.totals}>
          <div className={styles.totalRow}>
            <span>Subtotal ({units} item{units === 1 ? '' : 's'})</span>
            <span>{formatINR(financials.subtotal)}</span>
          </div>
          <div className={styles.totalRow}>
            <span>Shipping</span>
            <span>{financials.shipping === 0 ? 'Free' : formatINR(financials.shipping)}</span>
          </div>
          <div className={`${styles.totalRow} ${styles.grandTotal}`}>
            <span>Total</span>
            <span>{formatINR(financials.total)}</span>
          </div>
        </div>

        <footer className={styles.footer}>
          <p>Prices are inclusive of applicable taxes. Thank you for shopping with {STORE.name}.</p>
          <p>{STORE.email} · {STORE.phone}</p>
        </footer>
      </div>
    </div>
  );
}
