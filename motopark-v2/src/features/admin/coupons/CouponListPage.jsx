import { useEffect, useMemo, useState } from 'react';
import { Archive, Edit, Plus, Search, Tag, Ticket } from 'lucide-react';
import { formatINR } from '@/lib/format.js';
import Button from '@/components/ui/Button.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Toggle from '../components/Toggle.jsx';
import CouponFormModal from './CouponFormModal.jsx';
import {
  archiveCoupon,
  createCoupon,
  listCoupons,
  updateCoupon,
} from './couponService.js';
import styles from './CouponListPage.module.css';

export default function CouponListPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await listCoupons();
      setCoupons(list);
    } catch (err) {
      console.error('Failed to load coupons:', err);
      setError(err?.message || 'Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return coupons;
    const term = search.toLowerCase();
    return coupons.filter(
      (c) =>
        c.code.toLowerCase().includes(term) ||
        (c.description && c.description.toLowerCase().includes(term)),
    );
  }, [coupons, search]);

  const handleOpenCreate = () => {
    setEditingCoupon(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (coupon) => {
    setEditingCoupon(coupon);
    setModalOpen(true);
  };

  const handleToggleActive = async (coupon, newActive) => {
    try {
      const updated = await updateCoupon(coupon._id, { isActive: newActive });
      setCoupons((prev) => prev.map((c) => (c._id === coupon._id ? updated : c)));
    } catch (err) {
      alert(err?.message || 'Failed to toggle active status');
    }
  };

  const handleArchive = async (coupon) => {
    if (!window.confirm(`Archive coupon '${coupon.code}'? It will be disabled and hidden.`)) {
      return;
    }
    try {
      await archiveCoupon(coupon._id);
      setCoupons((prev) => prev.filter((c) => c._id !== coupon._id));
    } catch (err) {
      alert(err?.message || 'Failed to archive coupon');
    }
  };

  const handleFormSubmit = async (model) => {
    try {
      setSaving(true);
      if (editingCoupon) {
        const updated = await updateCoupon(editingCoupon._id, model);
        setCoupons((prev) => prev.map((c) => (c._id === editingCoupon._id ? updated : c)));
      } else {
        const created = await createCoupon(model);
        setCoupons((prev) => [created, ...prev]);
      }
      setModalOpen(false);
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || 'Failed to save coupon');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Coupons &amp; Discounts"
        subtitle="Manage promotional discount codes, schedules, and usage limits"
        actions={
          <Button onClick={handleOpenCreate}>
            <Plus size={18} /> Create Coupon
          </Button>
        }
      />

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by code or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingBlock}>Loading coupons…</div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyBlock}>
          <Ticket size={48} className={styles.emptyIcon} />
          <h3>No coupons found</h3>
          <p>
            {search
              ? 'No coupons match your search query.'
              : 'Create your first promotional coupon code to offer discounts to customers.'}
          </p>
          {!search && (
            <Button onClick={handleOpenCreate} variant="outline">
              <Plus size={16} /> Create Coupon
            </Button>
          )}
        </div>
      ) : (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Min Purchase</th>
                <th>Usage</th>
                <th>Status</th>
                <th>Active</th>
                <th className={styles.textRight}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c._id}>
                  <td>
                    <div className={styles.codeCell}>
                      <span className={styles.codeBadge}>
                        <Tag size={14} /> {c.code}
                      </span>
                      {c.description && <span className={styles.desc}>{c.description}</span>}
                    </div>
                  </td>

                  <td>
                    <span className={styles.discountVal}>
                      {c.discountType === 'percentage'
                        ? `${c.discountValue}% OFF`
                        : `${formatINR(c.discountValue)} OFF`}
                    </span>
                    {c.discountType === 'percentage' && c.maxDiscountINR > 0 && (
                      <span className={styles.subtext}>
                        Max {formatINR(c.maxDiscountINR)}
                      </span>
                    )}
                  </td>

                  <td>
                    {c.minPurchaseINR > 0 ? (
                      formatINR(c.minPurchaseINR)
                    ) : (
                      <span className={styles.subtext}>No Min</span>
                    )}
                  </td>

                  <td>
                    <span className={styles.usageText}>
                      {c.usageCount ?? 0}{' '}
                      {c.usageLimit > 0 ? `/ ${c.usageLimit}` : 'used'}
                    </span>
                  </td>

                  <td>
                    <StatusBadge status={c.status} />
                  </td>

                  <td>
                    <Toggle
                      id={`toggle-${c._id}`}
                      checked={c.isActive}
                      onChange={(v) => handleToggleActive(c, v)}
                    />
                  </td>

                  <td className={styles.textRight}>
                    <div className={styles.actionBtns}>
                      <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() => handleOpenEdit(c)}
                        title="Edit Coupon"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        type="button"
                        className={`${styles.iconBtn} ${styles.danger}`}
                        onClick={() => handleArchive(c)}
                        title="Archive Coupon"
                      >
                        <Archive size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CouponFormModal
        open={modalOpen}
        coupon={editingCoupon}
        onClose={() => setModalOpen(false)}
        onSubmit={handleFormSubmit}
        saving={saving}
      />
    </div>
  );
}

function StatusBadge({ status }) {
  let badgeClass = styles.badgeActive;
  if (status === 'Scheduled') badgeClass = styles.badgeScheduled;
  if (status === 'Expired') badgeClass = styles.badgeExpired;
  if (status === 'Limit Reached') badgeClass = styles.badgeLimit;
  if (status === 'Disabled') badgeClass = styles.badgeDisabled;

  return <span className={`${styles.statusBadge} ${badgeClass}`}>{status}</span>;
}
