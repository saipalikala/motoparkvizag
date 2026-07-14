import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  MapPin,
  Package,
  Printer,
  Truck,
  User,
} from 'lucide-react';
import { formatINR } from '@/lib/format.js';
import PageHeader from '../components/PageHeader.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Button from '@/components/ui/Button.jsx';
import StatusBadge from './StatusBadge.jsx';
import DispatchModal from './DispatchModal.jsx';
import { getOrder, nextStatus, paymentInfo, statusMeta, updateStatus } from './orderService.js';
import styles from './OrderDetailPage.module.css';

const fmtDateTime = (d) => {
  try {
    return new Date(d).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

const TERMINAL = new Set(['delivered', 'cancelled', 'returned']);

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [dispatchAdvance, setDispatchAdvance] = useState(true);
  const [cancelOpen, setCancelOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const o = await getOrder(id);
      if (!o) setNotFound(true);
      else setOrder({ ...o, id: String(o._id) });
    } catch (err) {
      setError(err?.message ?? 'Failed to load order.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const financials = useMemo(() => {
    if (!order) return { subtotal: 0, shipping: 0, total: 0 };
    const subtotal = (order.items || []).reduce(
      (s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 0),
      0,
    );
    const total = Number(order.total) || 0;
    return { subtotal, shipping: Math.max(0, total - subtotal), total };
  }, [order]);

  const applyOrder = (updated) => {
    setOrder({ ...updated, id: String(updated._id) });
  };

  const advance = async (toStatus) => {
    setBusy(true);
    setError(null);
    try {
      const updated = await updateStatus(order.id, toStatus);
      applyOrder(updated);
      setNotice(`Order marked as ${statusMeta(toStatus).label}.`);
    } catch (err) {
      setError(err?.message ?? 'Could not update status.');
    } finally {
      setBusy(false);
    }
  };

  const onDispatchSaved = (updated) => {
    applyOrder(updated);
    setDispatchOpen(false);
    setNotice('Tracking saved.');
  };

  const doCancel = async () => {
    setBusy(true);
    try {
      const updated = await updateStatus(order.id, 'cancelled');
      applyOrder(updated);
      setCancelOpen(false);
      setNotice('Order cancelled.');
    } catch (err) {
      setNotice(err?.message ?? 'Could not cancel order.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Loading order…" />
        <div className={`skeleton ${styles.loadingBlock}`} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div>
        <PageHeader title="Order not found" subtitle="This order may have been removed." />
        <Button as={Link} to="/admin/orders" variant="outline">
          <ArrowLeft size={18} /> Back to orders
        </Button>
      </div>
    );
  }

  const next = nextStatus(order.status);
  const payment = paymentInfo(order);
  const addr = order.shippingAddress || {};
  const hasTracking = Boolean(order.courierName || order.trackingNumber);
  const canCancel = !TERMINAL.has(order.status) && order.status !== 'dispatched';

  const advanceLabel = next ? `Mark as ${statusMeta(next).label}` : null;

  return (
    <div>
      <PageHeader
        title={`Order #${String(order._id).slice(-8).toUpperCase()}`}
        subtitle={fmtDateTime(order.createdAt)}
        actions={
          <>
            <Button as={Link} to="/admin/orders" variant="outline" type="button">
              <ArrowLeft size={18} /> Back
            </Button>
            <Button
              as="a"
              href={`/admin/orders/${order.id}/print`}
              target="_blank"
              rel="noopener noreferrer"
              variant="secondary"
            >
              <Printer size={18} /> Print Packing Slip
            </Button>
          </>
        }
      />

      {notice && (
        <div className={styles.notice} role="status" onClick={() => setNotice(null)}>
          {notice}
        </div>
      )}
      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      <div className={styles.layout}>
        {/* ── Main column ─────────────────────────────── */}
        <div className={styles.mainCol}>
          {/* Items */}
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>
              <Package size={18} /> Items ({order.items?.length || 0})
            </h2>
            <div className={styles.items}>
              {(order.items || []).map((it, i) => (
                <div className={styles.item} key={i}>
                  <div className={styles.itemMain}>
                    <span className={styles.itemName}>{it.name}</span>
                    <span className={styles.itemMeta}>
                      {it.selectedColor && (
                        <span className={styles.swatchWrap}>
                          <span
                            className={styles.swatch}
                            style={{ background: it.selectedColor }}
                            aria-hidden="true"
                          />
                          {it.selectedColor}
                        </span>
                      )}
                      {it.selectedSize && <span>Size: {it.selectedSize}</span>}
                    </span>
                  </div>
                  <div className={styles.itemQty}>× {it.quantity}</div>
                  <div className={styles.itemPrice}>
                    <span>{formatINR((Number(it.price) || 0) * (Number(it.quantity) || 0))}</span>
                    <span className={styles.itemUnit}>{formatINR(it.price)} each</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Financials */}
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Financials</h2>
            <dl className={styles.finance}>
              <div className={styles.finRow}>
                <dt>Subtotal</dt>
                <dd>{formatINR(financials.subtotal)}</dd>
              </div>
              <div className={styles.finRow}>
                <dt>Shipping</dt>
                <dd>{financials.shipping === 0 ? 'Free' : formatINR(financials.shipping)}</dd>
              </div>
              <div className={`${styles.finRow} ${styles.finTotal}`}>
                <dt>Total</dt>
                <dd>{formatINR(financials.total)}</dd>
              </div>
            </dl>
            <div className={styles.payLine}>
              <span className={`${styles.payBadge} ${payment.paid ? styles.payPaid : styles.payCod}`}>
                {payment.label}
              </span>
              <span className={styles.payMethod}>{payment.method}</span>
              {payment.ref && <span className={styles.payRef}>Ref: {payment.ref}</span>}
            </div>
          </section>
        </div>

        {/* ── Sidebar column ──────────────────────────── */}
        <aside className={styles.sideCol}>
          {/* Workflow */}
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Status</h2>
            <div className={styles.statusRow}>
              <StatusBadge status={order.status} />
            </div>

            <div className={styles.actions}>
              {next && (
                next === 'dispatched' ? (
                  <Button
                    onClick={() => {
                      setDispatchAdvance(true);
                      setDispatchOpen(true);
                    }}
                    disabled={busy}
                  >
                    <Truck size={18} /> Dispatch…
                  </Button>
                ) : (
                  <Button onClick={() => advance(next)} disabled={busy}>
                    {advanceLabel} <ArrowRight size={16} />
                  </Button>
                )
              )}
              {!next && !TERMINAL.has(order.status) && order.status === 'shipped' && (
                <Button onClick={() => advance('delivered')} disabled={busy}>
                  Mark as Delivered <ArrowRight size={16} />
                </Button>
              )}
              {canCancel && (
                <Button variant="outline" onClick={() => setCancelOpen(true)} disabled={busy}>
                  <Ban size={16} /> Cancel order
                </Button>
              )}
              {TERMINAL.has(order.status) && (
                <p className={styles.terminalNote}>This order is {statusMeta(order.status).label.toLowerCase()}.</p>
              )}
            </div>
          </section>

          {/* Tracking */}
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>
              <Truck size={18} /> Tracking
            </h2>
            {hasTracking ? (
              <div className={styles.trackingBox}>
                <div className={styles.trackRow}>
                  <span className={styles.trackLabel}>Courier</span>
                  <span className={styles.trackVal}>{order.courierName || '—'}</span>
                </div>
                <div className={styles.trackRow}>
                  <span className={styles.trackLabel}>Tracking #</span>
                  <span className={`${styles.trackVal} ${styles.mono}`}>{order.trackingNumber || '—'}</span>
                </div>
                <button
                  type="button"
                  className={styles.editTracking}
                  onClick={() => {
                    setDispatchAdvance(false);
                    setDispatchOpen(true);
                  }}
                >
                  Edit tracking
                </button>
              </div>
            ) : (
              <p className={styles.muted}>No courier details yet. Added when the order is dispatched.</p>
            )}
          </section>

          {/* Customer */}
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>
              <User size={18} /> Customer
            </h2>
            <div className={styles.infoList}>
              <p className={styles.infoName}>{addr.name || 'Guest'}</p>
              {addr.phone && <a className={styles.infoLink} href={`tel:${addr.phone}`}>{addr.phone}</a>}
              {addr.email && <a className={styles.infoLink} href={`mailto:${addr.email}`}>{addr.email}</a>}
              <p className={styles.accountTag}>{order.user ? 'Registered account' : 'Guest checkout'}</p>
            </div>
          </section>

          {/* Shipping */}
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>
              <MapPin size={18} /> Shipping address
            </h2>
            <address className={styles.address}>
              {addr.name && <span>{addr.name}</span>}
              {addr.address && <span>{addr.address}</span>}
              {(addr.city || addr.state || addr.pincode) && (
                <span>
                  {[addr.city, addr.state].filter(Boolean).join(', ')} {addr.pincode}
                </span>
              )}
              {addr.phone && <span>Phone: {addr.phone}</span>}
            </address>
          </section>
        </aside>
      </div>

      <DispatchModal
        open={dispatchOpen}
        order={order}
        advanceStatus={dispatchAdvance}
        onClose={() => setDispatchOpen(false)}
        onSaved={onDispatchSaved}
      />

      <ConfirmDialog
        open={cancelOpen}
        danger
        title="Cancel this order?"
        message="The order will be marked cancelled. If it had stock reserved, restock manually if needed."
        confirmLabel="Cancel order"
        cancelLabel="Keep order"
        busy={busy}
        onConfirm={doCancel}
        onCancel={() => !busy && setCancelOpen(false)}
      />
    </div>
  );
}
