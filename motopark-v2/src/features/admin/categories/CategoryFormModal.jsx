import { useEffect, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { cloudinaryUrl } from '@/lib/image.js';
import Button from '@/components/ui/Button.jsx';
import Modal from '../components/Modal.jsx';
import {
  createCategory,
  slugify,
  updateCategory,
  uploadCategoryImage,
} from './categoryService.js';
import styles from './CategoryFormModal.module.css';

/**
 * CategoryFormModal — unified create/edit form in a modal.
 * `category` null ⇒ create; an object ⇒ edit. Calls onSaved(message) on success.
 *
 * Image handling: an existing category keeps its Cloudinary URL until the admin
 * picks a new file (previewed locally) or removes it. On submit, any new file is
 * uploaded first (→ URL), then the category is created/updated with that URL.
 */
export default function CategoryFormModal({ open, category, onClose, onSaved }) {
  const isEdit = Boolean(category);
  const fileRef = useRef(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState(''); // existing hosted URL
  const [imageFile, setImageFile] = useState(null); // new File
  const [preview, setPreview] = useState(null); // object URL for a new File
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Reset the form whenever the modal opens for a different record.
  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? '');
    setDescription(category?.description ?? '');
    setImageUrl(category?.image ?? '');
    setImageFile(null);
    setPreview(null);
    setError(null);
    setSaving(false);
  }, [open, category]);

  // Revoke the object URL when it changes/unmounts.
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const onPickFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (preview) URL.revokeObjectURL(preview);
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    if (preview) URL.revokeObjectURL(preview);
    setImageFile(null);
    setPreview(null);
    setImageUrl('');
  };

  const currentImage = preview || (imageUrl ? cloudinaryUrl(imageUrl, { w: 200 }) : null);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!name.trim()) {
      setError('Category name is required.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      let image = imageUrl;
      if (imageFile) image = await uploadCategoryImage(imageFile);
      if (isEdit) await updateCategory(category.id, { name, image, description });
      else await createCategory({ name, image, description });
      onSaved(`Category ${isEdit ? 'updated' : 'created'}: ${name.trim()}`);
    } catch (err) {
      setError(err?.message ?? 'Save failed. Please try again.');
      setSaving(false);
    }
  };

  const previewSlug = slugify(name);

  return (
    <Modal
      open={open}
      title={isEdit ? 'Edit category' : 'Create category'}
      onClose={onClose}
      busy={saving}
      footer={
        <>
          <Button variant="outline" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="category-form" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create category'}
          </Button>
        </>
      }
    >
      <form id="category-form" onSubmit={onSubmit} className={styles.form} noValidate>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <label className={styles.field}>
          <span className={styles.label}>Name *</span>
          <input
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Helmets"
            autoFocus
          />
          {name.trim() && (
            <span className={styles.hint}>
              Slug: <code>{previewSlug || '—'}</code> (auto-generated)
            </span>
          )}
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Description</span>
          <textarea
            className={styles.textarea}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional — shown on the category page."
          />
        </label>

        <div className={styles.field}>
          <span className={styles.label}>Image</span>
          <div className={styles.imageRow}>
            {currentImage ? (
              <div className={styles.imageCell}>
                <img className={styles.image} src={currentImage} alt="" width={80} height={80} />
                <button
                  type="button"
                  className={styles.imageRemove}
                  onClick={clearImage}
                  aria-label="Remove image"
                >
                  <X size={14} />
                </button>
                {preview && <span className={styles.newTag}>New</span>}
              </div>
            ) : (
              <button type="button" className={styles.addImage} onClick={() => fileRef.current?.click()}>
                <ImagePlus size={20} />
                <span>Upload</span>
              </button>
            )}
            {currentImage && (
              <button type="button" className={styles.replaceBtn} onClick={() => fileRef.current?.click()}>
                Replace image
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />
          </div>
          <span className={styles.hint}>Uploaded on save. Optional — the storefront falls back to an icon tile.</span>
        </div>
      </form>
    </Modal>
  );
}
