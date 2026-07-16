import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button.jsx';
import Modal from '../components/Modal.jsx';
import styles from './VideoShowcaseFormModal.module.css';

/**
 * VideoShowcaseFormModal — add/edit a single showcase slide.
 *
 * Controlled form: it validates and hands the row back via onSubmit(row); the
 * list page owns the slides array and persists the whole thing (the backend is
 * replace-all). `slide` null ⇒ add, an object ⇒ edit.
 */
const BLANK = { title: '', tag: '', description: '', src: '', poster: '', buyNowLink: '', cta: '' };

export default function VideoShowcaseFormModal({ open, slide, onClose, onSubmit, saving = false }) {
  const isEdit = Boolean(slide);
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setForm(slide ? { ...BLANK, ...slide } : BLANK);
    setError(null);
  }, [open, slide]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (saving) return;
    if (!form.title.trim()) return setError('Headline is required.');
    if (!form.src.trim()) return setError('Video URL is required.');
    if (!form.poster.trim()) return setError('Poster image URL is required.');
    setError(null);
    onSubmit({ ...slide, ...form });
  };

  return (
    <Modal
      open={open}
      title={isEdit ? 'Edit slide' : 'Add slide'}
      onClose={onClose}
      busy={saving}
      footer={
        <>
          <Button variant="outline" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="showcase-form" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add slide'}
          </Button>
        </>
      }
    >
      <form id="showcase-form" onSubmit={submit} className={styles.form} noValidate>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <label className={styles.field}>
          <span className={styles.label}>Headline *</span>
          <input
            className={styles.input}
            value={form.title}
            onChange={set('title')}
            placeholder="e.g. The City Commute"
            autoFocus
          />
        </label>

        <div className={styles.row2}>
          <label className={styles.field}>
            <span className={styles.label}>Tag</span>
            <input className={styles.input} value={form.tag} onChange={set('tag')} placeholder="e.g. Everyday" />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>CTA label</span>
            <input
              className={styles.input}
              value={form.cta}
              onChange={set('cta')}
              placeholder="Shop the Gear"
            />
          </label>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>Description</span>
          <textarea
            className={styles.textarea}
            rows={2}
            value={form.description}
            onChange={set('description')}
            placeholder="Optional — short line shown under the headline."
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Video URL *</span>
          <input
            className={styles.input}
            value={form.src}
            onChange={set('src')}
            placeholder="https://res.cloudinary.com/…/video.mp4"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Poster image URL *</span>
          <input
            className={styles.input}
            value={form.poster}
            onChange={set('poster')}
            placeholder="https://…/poster.jpg"
          />
          {form.poster.trim() && (
            <img className={styles.preview} src={form.poster} alt="" loading="lazy" />
          )}
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Buy link</span>
          <input
            className={styles.input}
            value={form.buyNowLink}
            onChange={set('buyNowLink')}
            placeholder="/products/your-product-slug"
          />
          <span className={styles.hint}>
            Where “Shop the Gear” sends shoppers. Use an internal path (e.g. <code>/products/abc</code>)
            or a full URL. Defaults to <code>/products</code>.
          </span>
        </label>
      </form>
    </Modal>
  );
}
