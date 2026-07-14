import { useEffect, useState } from 'react';
import { Truck } from 'lucide-react';
import Button from '@/components/ui/Button.jsx';
import Modal from '../components/Modal.jsx';
import { updateTracking } from './orderService.js';
import styles from './DispatchModal.module.css';

/**
 * DispatchModal — records courier hand-off details (manual fulfilment, docs/06).
 *
 * Two modes:
 *   • dispatch (default): saves courier + tracking AND advances status to
 *     "dispatched" in one PATCH.
 *   • edit (advanceStatus=false): just updates courier/tracking on an already
 *     dispatched order, leaving status untouched.
 *
 * Calls onSaved(updatedOrder) on success.
 */
export default function DispatchModal({ open, order, advanceStatus = true, onClose, onSaved }) {
  const [courierName, setCourierName] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCourierName(order?.courierName ?? '');
    setTrackingNumber(order?.trackingNumber ?? '');
    setError(null);
    setSaving(false);
  }, [open, order]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!courierName.trim()) return setError('Courier name is required.');
    if (!trackingNumber.trim()) return setError('Tracking number is required.');
    setError(null);
    setSaving(true);
    try {
      const updated = await updateTracking(order.id ?? order._id, {
        courierName: courierName.trim(),
        trackingNumber: trackingNumber.trim(),
        ...(advanceStatus ? { status: 'dispatched' } : {}),
      });
      onSaved(updated);
    } catch (err) {
      setError(err?.message ?? 'Save failed. Please try again.');
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={advanceStatus ? 'Dispatch order' : 'Edit tracking'}
      onClose={onClose}
      busy={saving}
      footer={
        <>
          <Button variant="outline" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="dispatch-form" disabled={saving}>
            <Truck size={18} /> {saving ? 'Saving…' : advanceStatus ? 'Mark as dispatched' : 'Save tracking'}
          </Button>
        </>
      }
    >
      <form id="dispatch-form" onSubmit={onSubmit} className={styles.form} noValidate>
        {advanceStatus && (
          <p className={styles.intro}>
            Record the courier and tracking number handed to you. This marks the order as
            <strong> dispatched</strong> and shows the details to the customer.
          </p>
        )}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <label className={styles.field}>
          <span className={styles.label}>Courier name *</span>
          <input
            className={styles.input}
            value={courierName}
            onChange={(e) => setCourierName(e.target.value)}
            placeholder="e.g. Delhivery, DTDC, India Post"
            autoFocus
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Tracking number *</span>
          <input
            className={styles.input}
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="e.g. 1234567890"
          />
        </label>
      </form>
    </Modal>
  );
}
