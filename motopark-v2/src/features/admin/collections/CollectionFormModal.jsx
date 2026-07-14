import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button.jsx';
import Modal from '../components/Modal.jsx';
import ProductPicker from './ProductPicker.jsx';
import {
  createCollection,
  getProductOptions,
  slugify,
  updateCollection,
} from './collectionService.js';
import styles from './CollectionFormModal.module.css';

/**
 * CollectionFormModal — unified create/edit form in a modal.
 * `collection` null ⇒ create; object ⇒ edit. Calls onSaved(message) on success.
 *
 * Slug is required and NOT auto-derived by the backend, so we suggest one from
 * the name (until the admin edits the slug field manually) and submit it.
 */
export default function CollectionFormModal({ open, collection, onClose, onSaved }) {
  const isEdit = Boolean(collection);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [productIds, setProductIds] = useState([]);
  const [options, setOptions] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Reset when opened for a (different) record.
  useEffect(() => {
    if (!open) return;
    setName(collection?.name ?? '');
    setSlug(collection?.slug ?? '');
    setSlugTouched(Boolean(collection?.slug));
    setProductIds(collection?.productIds ?? []);
    setError(null);
    setSaving(false);
  }, [open, collection]);

  // Load product options once per open.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setOptionsLoading(true);
    getProductOptions()
      .then((opts) => alive && setOptions(opts))
      .catch(() => alive && setError('Could not load products for the picker.'))
      .finally(() => alive && setOptionsLoading(false));
    return () => {
      alive = false;
    };
  }, [open]);

  // Keep slug synced to the name until the admin edits it directly.
  const onNameChange = (v) => {
    setName(v);
    if (!slugTouched) setSlug(slugify(v));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!name.trim()) return setError('Collection name is required.');
    if (!slug.trim()) return setError('Slug is required.');
    setError(null);
    setSaving(true);
    try {
      const payload = { name, slug, products: productIds };
      if (isEdit) await updateCollection(collection.id, payload);
      else await createCollection(payload);
      onSaved(`Collection ${isEdit ? 'updated' : 'created'}: ${name.trim()}`);
    } catch (err) {
      setError(err?.message ?? 'Save failed. Please try again.');
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      size="lg"
      title={isEdit ? 'Edit collection' : 'Create collection'}
      onClose={onClose}
      busy={saving}
      footer={
        <>
          <Button variant="outline" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="collection-form" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create collection'}
          </Button>
        </>
      }
    >
      <form id="collection-form" onSubmit={onSubmit} className={styles.form} noValidate>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <div className={styles.row}>
          <label className={styles.field}>
            <span className={styles.label}>Name *</span>
            <input
              className={styles.input}
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="e.g. Helmets"
              autoFocus
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Slug *</span>
            <input
              className={styles.input}
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              placeholder="e.g. helmets"
            />
            <span className={styles.hint}>URL: /collections/{slug || '…'}</span>
          </label>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Products</span>
          <ProductPicker
            options={options}
            selectedIds={productIds}
            onChange={setProductIds}
            loading={optionsLoading}
          />
        </div>
      </form>
    </Modal>
  );
}
