import { useEffect, useRef, useState } from 'react';
import { Check, FileVideo, ImagePlus, Loader2, UploadCloud } from 'lucide-react';
import Button from '@/components/ui/Button.jsx';
import Modal from '../components/Modal.jsx';
import {
  uploadShowcasePoster,
  uploadShowcaseVideo,
  validatePoster,
  validateVideo,
} from './showcaseService.js';
import styles from './VideoShowcaseFormModal.module.css';

/**
 * VideoShowcaseFormModal — add/edit a single showcase slide.
 *
 * Controlled form: it validates and hands the row back via onSubmit(row); the
 * list page owns the slides array and persists the whole thing (the backend is
 * replace-all). `slide` null ⇒ add, an object ⇒ edit.
 *
 * MEDIA: files upload as soon as they're picked, not on save, so a large video
 * uploads while the admin is still typing the headline. The slide only ever
 * stores the resulting URL. Saving is blocked while an upload is in flight —
 * otherwise the row would persist with a stale/empty src. The URL fields stay
 * editable for pasting a link or reviewing what's already saved.
 */
const BLANK = { title: '', tag: '', description: '', src: '', poster: '', buyNowLink: '', cta: '' };

/** Per-field upload state. pct null = size unknown (indeterminate). */
const IDLE = { busy: false, pct: null, name: '', error: null };

export default function VideoShowcaseFormModal({ open, slide, onClose, onSubmit, saving = false }) {
  const isEdit = Boolean(slide);
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState(null);
  const [videoUp, setVideoUp] = useState(IDLE);
  const [posterUp, setPosterUp] = useState(IDLE);

  const videoRef = useRef(null);
  const posterRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setForm(slide ? { ...BLANK, ...slide } : BLANK);
    setError(null);
    setVideoUp(IDLE);
    setPosterUp(IDLE);
  }, [open, slide]);

  const uploading = videoUp.busy || posterUp.busy;
  const busy = uploading || saving;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  /** Validate → upload immediately → store the returned URL on the form. */
  const pick = (kind) => async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file after a failure
    if (!file) return;

    const isVideo = kind === 'video';
    const validate = isVideo ? validateVideo : validatePoster;
    const upload = isVideo ? uploadShowcaseVideo : uploadShowcasePoster;
    const setUp = isVideo ? setVideoUp : setPosterUp;
    const key = isVideo ? 'src' : 'poster';

    const invalid = validate(file);
    if (invalid) {
      setUp({ ...IDLE, name: file.name, error: invalid });
      return;
    }

    setError(null);
    setUp({ busy: true, pct: 0, name: file.name, error: null });
    try {
      const url = await upload(file, (pct) => setUp((s) => ({ ...s, pct })));
      setForm((f) => ({ ...f, [key]: url }));
      setUp({ busy: false, pct: 100, name: file.name, error: null });
    } catch (err) {
      setUp({ ...IDLE, name: file.name, error: err?.message ?? 'Upload failed. Try again.' });
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (busy) return;
    if (!form.title.trim()) return setError('Headline is required.');
    if (!form.src.trim()) return setError('A video is required — upload a file or paste a URL.');
    if (!form.poster.trim()) return setError('A poster image is required — upload a file or paste a URL.');
    setError(null);
    onSubmit({ ...slide, ...form });
  };

  /** Shared uploader block: progress → error → done → empty. */
  const renderUploader = (kind) => {
    const isVideo = kind === 'video';
    const up = isVideo ? videoUp : posterUp;
    const ref = isVideo ? videoRef : posterRef;
    const url = isVideo ? form.src : form.poster;
    const Icon = isVideo ? FileVideo : ImagePlus;

    if (up.busy) {
      return (
        <div className={styles.uploading} role="status" aria-live="polite">
          <Loader2 className={styles.spin} size={16} aria-hidden="true" />
          <div className={styles.uploadingText}>
            <strong>
              Uploading {isVideo ? 'video' : 'poster'}
              {up.pct === null ? '…' : ` — ${up.pct}%`}
            </strong>
            <span className={styles.hint}>
              {isVideo
                ? 'Please wait, this may take a minute. Don’t close this window.'
                : 'Please wait…'}
            </span>
          </div>
          <div
            className={styles.bar}
            role="progressbar"
            aria-valuenow={up.pct ?? undefined}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={`${styles.barFill} ${up.pct === null ? styles.barIndeterminate : ''}`}
              style={up.pct === null ? undefined : { width: `${up.pct}%` }}
            />
          </div>
        </div>
      );
    }

    return (
      <div className={styles.uploader}>
        <button
          type="button"
          className={styles.uploadBtn}
          onClick={() => ref.current?.click()}
          disabled={busy}
        >
          {url ? <Icon size={16} /> : <UploadCloud size={16} />}
          <span>{url ? `Replace ${isVideo ? 'video' : 'poster'}` : `Upload ${isVideo ? 'video' : 'poster'}`}</span>
        </button>

        {up.error ? (
          <span className={styles.uploadError} role="alert">
            {up.error}
          </span>
        ) : up.name && url ? (
          <span className={styles.uploadOk}>
            <Check size={14} aria-hidden="true" /> {up.name}
          </span>
        ) : (
          <span className={styles.hint}>
            {isVideo ? 'MP4, WebM, or MOV — up to 50 MB.' : 'JPG, PNG, or WebP — up to 20 MB.'}
          </span>
        )}

        <input
          ref={ref}
          type="file"
          accept={isVideo ? 'video/mp4,video/webm,video/quicktime' : 'image/jpeg,image/png,image/webp'}
          hidden
          onChange={pick(kind)}
        />
      </div>
    );
  };

  return (
    <Modal
      open={open}
      title={isEdit ? 'Edit slide' : 'Add slide'}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <Button variant="outline" type="button" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="showcase-form" disabled={busy}>
            {uploading ? 'Uploading…' : saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add slide'}
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

        <div className={styles.field}>
          <span className={styles.label}>Video *</span>
          {renderUploader('video')}
          <input
            className={styles.input}
            value={form.src}
            onChange={set('src')}
            disabled={busy}
            placeholder="https://res.cloudinary.com/…/video.mp4"
            aria-label="Video URL"
          />
          <span className={styles.hint}>Upload a file above, or paste a URL here.</span>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Poster image *</span>
          {renderUploader('poster')}
          <input
            className={styles.input}
            value={form.poster}
            onChange={set('poster')}
            disabled={busy}
            placeholder="https://…/poster.jpg"
            aria-label="Poster image URL"
          />
          {form.poster.trim() && (
            <img className={styles.preview} src={form.poster} alt="" loading="lazy" />
          )}
          <span className={styles.hint}>Shown before the video plays. Upload a file, or paste a URL.</span>
        </div>

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
