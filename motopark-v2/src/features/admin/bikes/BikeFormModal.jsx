import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button.jsx';
import Modal from '../components/Modal.jsx';
import { createBike, slugify, updateBike } from './bikeService.js';
import styles from './BikeFormModal.module.css';

/**
 * BikeFormModal — unified create/edit form for a fitment record (make + model).
 * `bike` null ⇒ create; an object ⇒ edit. Calls onSaved(message) on success.
 * Slugs are derived server-side; we show a live preview of the resulting URL.
 */
export default function BikeFormModal({ open, bike, onClose, onSaved }) {
  const isEdit = Boolean(bike);

  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMake(bike?.make ?? '');
    setModel(bike?.model ?? '');
    setError(null);
    setSaving(false);
  }, [open, bike]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!make.trim() || !model.trim()) {
      setError('Both make and model are required.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      if (isEdit) await updateBike(bike.id, { make, model });
      else await createBike({ make, model });
      onSaved(`Bike ${isEdit ? 'updated' : 'created'}: ${make.trim()} ${model.trim()}`);
    } catch (err) {
      setError(err?.message ?? 'Save failed. Please try again.');
      setSaving(false);
    }
  };

  const makeSlug = slugify(make);
  const modelSlug = slugify(model);
  const urlPreview = makeSlug && modelSlug ? `/bikes/${makeSlug}/${modelSlug}` : '—';

  return (
    <Modal
      open={open}
      title={isEdit ? 'Edit bike' : 'Add bike'}
      onClose={onClose}
      busy={saving}
      footer={
        <>
          <Button variant="outline" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="bike-form" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add bike'}
          </Button>
        </>
      }
    >
      <form id="bike-form" onSubmit={onSubmit} className={styles.form} noValidate>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <label className={styles.field}>
          <span className={styles.label}>Make *</span>
          <input
            className={styles.input}
            value={make}
            onChange={(e) => setMake(e.target.value)}
            placeholder="e.g. Royal Enfield"
            autoFocus
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Model *</span>
          <input
            className={styles.input}
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g. Himalayan"
          />
        </label>

        {(make.trim() || model.trim()) && (
          <span className={styles.hint}>
            URL: <code>{urlPreview}</code> (auto-generated)
          </span>
        )}
      </form>
    </Modal>
  );
}
