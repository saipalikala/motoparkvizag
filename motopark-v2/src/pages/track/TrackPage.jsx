import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { PackageSearch, MessageCircle, Search, Package, Truck, ArrowLeft, CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button.jsx';
import Field from '@/components/ui/Field.jsx';
import OrderHistory from '@/features/account/OrderHistory.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { trackGuestOrder } from '@/services/orders.js';
import { formatINR } from '@/lib/format.js';
import { STORE } from '@/config/store.js';
import styles from './TrackPage.module.css';

const STATUS_MAP = {
  pending: { label: 'Pending', cls: 'pending' },
  confirmed: { label: 'Confirmed', cls: 'confirmed' },
  packed: { label: 'Packed', cls: 'packed' },
  dispatched: { label: 'Dispatched', cls: 'dispatched' },
  shipped: { label: 'Shipped', cls: 'shipped' },
  delivered: { label: 'Delivered', cls: 'delivered' },
  cancelled: { label: 'Cancelled', cls: 'cancelled' },
  returned: { label: 'Returned', cls: 'returned' },
};

const fmtDate = (d) => {
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
};

export default function TrackPage() {
  const { isAuthed } = useAuth();

  // Guest order lookup states
  const [orderIdInput, setOrderIdInput] = useState('');
  const [lookupInput, setLookupInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [guestOrder, setGuestOrder] = useState(null);

  const handleGuestTrack = async (e) => {
    e.preventDefault();
    if (!orderIdInput.trim() || !lookupInput.trim()) {
      setError('Please enter both Order ID and Email/Phone.');
      return;
    }

    setLoading(true);
    setError('');
    setGuestOrder(null);

    try {
      const order = await trackGuestOrder({
        orderId: orderIdInput.trim(),
        lookup: lookupInput.trim(),
      });
      setGuestOrder(order);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Could not find an order matching those details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container section">
      <Helmet>
        <title>Track your order — MotoPark</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <header className={styles.head}>
        <h1 className={styles.title}>Track your order</h1>
        <p className={styles.sub}>Follow your order from confirmed to delivered.</p>
      </header>

      {isAuthed ? (
        <OrderHistory />
      ) : (
        <div className={styles.guestContainer}>
          {/* Guest Order Result */}
          {guestOrder ? (
            <div className={styles.resultCard}>
              <div className={styles.resultHead}>
                <div>
                  <button type="button" className={styles.backLink} onClick={() => setGuestOrder(null)}>
                    <ArrowLeft size={16} /> Look up another order
                  </button>
                  <h2 className={styles.resultTitle}>Order #{String(guestOrder._id).slice(-8)}</h2>
                  <p className={styles.resultMeta}>Placed on {fmtDate(guestOrder.createdAt)}</p>
                </div>
                <span className={`${styles.badge} ${styles[STATUS_MAP[guestOrder.status]?.cls || 'pending']}`}>
                  {STATUS_MAP[guestOrder.status]?.label || guestOrder.status}
                </span>
              </div>

              {guestOrder.courierName && guestOrder.trackingNumber && (
                <div className={styles.courierBanner}>
                  <Truck size={20} />
                  <div>
                    <strong>{guestOrder.courierName}</strong>
                    <p>Tracking #: {guestOrder.trackingNumber}</p>
                  </div>
                </div>
              )}

              <div className={styles.orderItemsList}>
                <h4 className={styles.itemsHeader}>Order Items</h4>
                {(guestOrder.items || []).map((item, idx) => (
                  <div key={idx} className={styles.itemRow}>
                    <div>
                      <p className={styles.itemName}>{item.name}</p>
                      {(item.selectedSize || item.selectedColor) && (
                        <p className={styles.itemMeta}>
                          {[item.selectedColor, item.selectedSize].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    <div className={styles.itemRight}>
                      <span>Qty: {item.quantity}</span>
                      <span className="price">{formatINR(item.price * item.quantity)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.resultFooter}>
                <span>Total Amount Paid</span>
                <span className="price price--lg">{formatINR(guestOrder.total)}</span>
              </div>
            </div>
          ) : (
            /* Guest Lookup Form */
            <div className={styles.lookupCard}>
              <div className={styles.lookupHead}>
                <PackageSearch size={24} className={styles.lookupIcon} />
                <div>
                  <h2 className={styles.lookupTitle}>Quick Guest Order Lookup</h2>
                  <p className={styles.lookupSub}>Enter your Order ID and the Email or Phone used during checkout.</p>
                </div>
              </div>

              <form onSubmit={handleGuestTrack} className={styles.lookupForm}>
                <div className={styles.formGrid}>
                  <Field
                    label="Order ID"
                    placeholder="e.g. 66a4f1e2..."
                    value={orderIdInput}
                    onChange={(e) => setOrderIdInput(e.target.value)}
                  />
                  <Field
                    label="Email or Phone"
                    placeholder="e.g. rider@example.com or 9876543210"
                    value={lookupInput}
                    onChange={(e) => setLookupInput(e.target.value)}
                  />
                </div>

                {error && <p className={styles.lookupErr} role="alert">{error}</p>}

                <Button type="submit" variant="primary" disabled={loading} className={styles.trackBtn}>
                  <Search size={16} /> {loading ? 'Searching…' : 'Track Order'}
                </Button>
              </form>
            </div>
          )}

          {/* Sign In Prompt */}
          <div className={styles.prompt}>
            <span className={styles.icon} aria-hidden="true"><PackageSearch size={26} strokeWidth={1.6} /></span>
            <p className={styles.promptTitle}>Sign in to see all your orders</p>
            <p className={styles.promptText}>
              Your orders are automatically tied to your verified account. Sign in with your email to
              view your complete order history.
            </p>
            <Button as={Link} to="/login?redirect=/track" variant="outline">Sign in</Button>
            <p className={styles.guest}>
              Need help? Message us on{' '}
              <a href={STORE.whatsapp} target="_blank" rel="noreferrer">
                <MessageCircle size={13} strokeWidth={1.9} aria-hidden="true" /> WhatsApp
              </a>{' '}
              with your order ID.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
