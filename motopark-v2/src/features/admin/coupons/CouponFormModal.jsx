import { useEffect, useState } from 'react';
import { Tag } from 'lucide-react';
import Button from '@/components/ui/Button.jsx';
import Modal from '../components/Modal.jsx';
import Toggle from '../components/Toggle.jsx';
import styles from './CouponFormModal.module.css';

const BLANK = {
  code: '',
  description: '',
  discountType: 'percentage',
  discountValue: '',
  minPurchaseINR: '',
  maxDiscountINR: '',
  startDate: '',
  expiryDate: '',
  usageLimit: '',
  isActive: true,
};

export default function CouponFormModal({ open, coupon, onClose, onSubmit, saving = false }) {
  const isEdit = Boolean(coupon?._id);
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    if (coupon) {
      setForm({
        ...BLANK,
        ...coupon,
        startDate: coupon.startDate ? new Date(coupon.startDate).toISOString().slice(0, 16) : '',
        expiryDate: coupon.expiryDate ? new Date(coupon.expiryDate).toISOString().slice(0, 16) : '',
      });
    } else {
      setForm(BLANK);
    }
    setError(null);
  }, [open, coupon]);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.code.trim()) {
      setError('Please enter a coupon code.');
      return;
    }
    if (!form.discountValue || Number(form.discountValue) <= 0) {
      setError('Please enter a valid positive discount value.');
      return;
    }
    if (form.discountType === 'percentage' && Number(form.discountValue) > 100) {
      setError('Percentage discount cannot exceed 100%.');
      return;
    }

    setError(null);
    onSubmit(form);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit Coupon: ${form.code}` : 'Create New Coupon'}
      subtitle="Manage promotional discount codes and redemption rules"
    >
      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Basic Info</h3>
          <div className={styles.grid2}>
            <label className={styles.field}>
              <span className={styles.label}>
                Coupon Code <span className={styles.req}>*</span>
              </span>
              <div className={styles.inputWrap}>
                <Tag size={16} className={styles.inputIcon} />
                <input
                  type="text"
                  className={styles.inputUpper}
                  value={form.code}
                  onChange={(e) => set({ code: e.target.value.toUpperCase() })}
                  placeholder="e.g. WELCOME10"
                  required
                />
              </div>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Description</span>
              <input
                type="text"
                className={styles.input}
                value={form.description}
                onChange={(e) => set({ description: e.target.value })}
                placeholder="e.g. 10% off on your first order"
              />
            </label>
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Discount Rules</h3>
          <div className={styles.grid2}>
            <label className={styles.field}>
              <span className={styles.label}>Discount Type</span>
              <select
                className={styles.select}
                value={form.discountType}
                onChange={(e) => set({ discountType: e.target.value })}
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>
                Discount Value {form.discountType === 'percentage' ? '(%)' : '(₹)'}{' '}
                <span className={styles.req}>*</span>
              </span>
              <input
                type="number"
                min="0"
                step="any"
                className={styles.input}
                value={form.discountValue}
                onChange={(e) => set({ discountValue: e.target.value })}
                placeholder={form.discountType === 'percentage' ? 'e.g. 15' : 'e.g. 500'}
                required
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Minimum Order Subtotal (₹)</span>
              <input
                type="number"
                min="0"
                className={styles.input}
                value={form.minPurchaseINR}
                onChange={(e) => set({ minPurchaseINR: e.target.value })}
                placeholder="e.g. 1000 (0 for no minimum)"
              />
            </label>

            {form.discountType === 'percentage' && (
              <label className={styles.field}>
                <span className={styles.label}>Maximum Discount Limit (₹)</span>
                <input
                  type="number"
                  min="0"
                  className={styles.input}
                  value={form.maxDiscountINR}
                  onChange={(e) => set({ maxDiscountINR: e.target.value })}
                  placeholder="e.g. 500 (leave blank for uncapped)"
                />
              </label>
            )}
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Schedule &amp; Usage Limits</h3>
          <div className={styles.grid2}>
            <label className={styles.field}>
              <span className={styles.label}>Start Date &amp; Time (Optional)</span>
              <input
                type="datetime-local"
                className={styles.input}
                value={form.startDate}
                onChange={(e) => set({ startDate: e.target.value })}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Expiration Date &amp; Time (Optional)</span>
              <input
                type="datetime-local"
                className={styles.input}
                value={form.expiryDate}
                onChange={(e) => set({ expiryDate: e.target.value })}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Max Total Redemptions (Optional)</span>
              <input
                type="number"
                min="1"
                className={styles.input}
                value={form.usageLimit}
                onChange={(e) => set({ usageLimit: e.target.value })}
                placeholder="Leave blank for unlimited"
              />
            </label>

            <div className={styles.fieldToggle}>
              <Toggle
                id="coupon-active-toggle"
                label="Activate Coupon"
                hint="Allow customers to redeem this code immediately"
                checked={form.isActive}
                onChange={(isActive) => set({ isActive })}
              />
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Coupon'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
