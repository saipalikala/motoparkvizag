import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, MapPin, User } from 'lucide-react';
import { formatINR } from '@/lib/format.js';
import PageHeader from '../components/PageHeader.jsx';
import DataTable from '../components/DataTable.jsx';
import Button from '@/components/ui/Button.jsx';
import StatusBadge from '../orders/StatusBadge.jsx';
import { getCustomer, getCustomerOrders } from './customerService.js';
import styles from './CustomerDetailPage.module.css';

const fmtDate = (d) => {
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
};

export default function CustomerDetailPage() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const u = await getCustomer(id);
      if (!u) {
        setNotFound(true);
        return;
      }
      setUser(u);
    } catch (err) {
      setError(err?.message ?? 'Failed to load customer.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Order history — separate request so a failure there doesn't blank the profile.
  useEffect(() => {
    let alive = true;
    setOrdersLoading(true);
    getCustomerOrders(id)
      .then((o) => alive && setOrders(o))
      .catch(() => alive && setOrders([]))
      .finally(() => alive && setOrdersLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div>
        <PageHeader title="Loading customer…" />
        <div className={`skeleton ${styles.loadingBlock}`} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div>
        <PageHeader title="Customer not found" subtitle="This account may have been removed." />
        <Button as={Link} to="/admin/customers" variant="outline">
          <ArrowLeft size={18} /> Back to customers
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Customer" />
        <div className={styles.error} role="alert">{error}</div>
      </div>
    );
  }

  const addresses = user.savedAddresses || [];

  const orderColumns = [
    {
      key: 'order',
      header: 'Order',
      render: (row) => (
        <Link className={styles.orderLink} to={`/admin/orders/${row.id}`}>
          #{row.shortId}
        </Link>
      ),
    },
    { key: 'date', header: 'Date', render: (row) => <span className={styles.muted}>{fmtDate(row.createdAt)}</span> },
    { key: 'total', header: 'Total', align: 'right', render: (row) => <span className={styles.total}>{formatINR(row.total)}</span> },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} size="sm" /> },
  ];

  return (
    <div>
      <PageHeader
        title={user.name || 'Customer'}
        subtitle={`Joined ${fmtDate(user.createdAt)}`}
        actions={
          <Button as={Link} to="/admin/customers" variant="outline" type="button">
            <ArrowLeft size={18} /> Back
          </Button>
        }
      />

      <div className={styles.layout}>
        {/* ── Main: order history ─────────────────────── */}
        <div className={styles.mainCol}>
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Order history ({orders.length})</h2>
            {orders.length === 0 && !ordersLoading ? (
              <p className={styles.muted}>This customer hasn’t placed any orders yet.</p>
            ) : (
              <DataTable
                columns={orderColumns}
                rows={orders}
                rowKey={(row) => row.id}
                loading={ordersLoading}
                skeletonRows={3}
                empty="No orders."
              />
            )}
          </section>
        </div>

        {/* ── Sidebar: profile + addresses ────────────── */}
        <aside className={styles.sideCol}>
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>
              <User size={18} /> Profile
            </h2>
            <div className={styles.profile}>
              <p className={styles.profileName}>{user.name || '—'}</p>
              {user.isVerified ? (
                <span className={styles.verified}>
                  <BadgeCheck size={14} /> Verified
                </span>
              ) : (
                <span className={styles.unverified}>Unverified</span>
              )}
            </div>
            <dl className={styles.infoList}>
              <div className={styles.infoRow}>
                <dt>Email</dt>
                <dd>{user.email ? <a href={`mailto:${user.email}`}>{user.email}</a> : '—'}</dd>
              </div>
              <div className={styles.infoRow}>
                <dt>Phone</dt>
                <dd>{user.phone ? <a href={`tel:${user.phone}`}>{user.phone}</a> : '—'}</dd>
              </div>
              <div className={styles.infoRow}>
                <dt>Joined</dt>
                <dd>{fmtDate(user.createdAt)}</dd>
              </div>
            </dl>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>
              <MapPin size={18} /> Saved addresses ({addresses.length})
            </h2>
            {addresses.length === 0 ? (
              <p className={styles.muted}>No saved addresses.</p>
            ) : (
              <ul className={styles.addressList}>
                {addresses.map((a) => (
                  <li className={styles.address} key={a._id || `${a.address}-${a.pincode}`}>
                    <div className={styles.addressHead}>
                      <span className={styles.addressLabel}>{a.label || 'Address'}</span>
                      {user.defaultAddress && String(user.defaultAddress) === String(a._id) && (
                        <span className={styles.defaultTag}>Default</span>
                      )}
                    </div>
                    {a.name && <span className={styles.addressName}>{a.name}</span>}
                    {a.address && <span>{a.address}</span>}
                    <span>{[a.city, a.state].filter(Boolean).join(', ')} {a.pincode}</span>
                    {a.phone && <span>Phone: {a.phone}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
