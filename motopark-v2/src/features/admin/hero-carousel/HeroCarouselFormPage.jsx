/**
 * features/admin/hero-carousel/HeroCarouselFormPage.jsx
 *
 * Create/Edit a Hero Slide — a DEDICATED PAGE, not a modal (deliberate
 * deviation from CampaignFormModal, matching the existing precedent of
 * ProductFormPage rather than inventing a new pattern). Two things make a
 * modal the wrong container here: this form has more sections than Campaigns
 * (dual images, dual CTAs, overlay/theme, focal point) and — the real
 * reason — it needs a live preview pane alongside the fields, which doesn't
 * fit inside a dialog the way it fits beside a page.
 *
 * Sections (mainCol): Identity → Schedule & Status → Content → Images.
 * Preview (sideCol): a scaled-down, self-contained render of the current
 * form state — see HeroCarouselPreview.jsx.
 *
 * Validation is per-field inline errors (Product pattern), not the single
 * summary line Campaigns' modal uses — because this page follows Product's
 * form architecture, not Campaign's modal architecture.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, ImagePlus, Loader2, Save, UploadCloud } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import Toggle from '../components/Toggle.jsx';
import Button from '@/components/ui/Button.jsx';
import HeroCarouselPreview from './HeroCarouselPreview.jsx';
import {
  THEME_OPTIONS,
  blankHeroSlide,
  createHeroSlide,
  getHeroSlide,
  updateHeroSlide,
  uploadHeroSlideImage,
  validateImage,
} from './heroCarouselService.js';
import styles from './HeroCarouselFormPage.module.css';

const IDLE_UPLOAD = { busy: false, name: '', error: null };

/** Same allow-list the backend enforces — relative path or https URL only. */
const isValidCtaUrl = (url) => typeof url === 'string' && (url.startsWith('/') || url.startsWith('https://'));

const fmtDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

/** datetime-local <-> ISO helpers, same pattern as CampaignFormModal. */
const toLocalInput = (iso) => (iso ? iso.slice(0, 16) : '');
const fromLocalInput = (value) => (value ? new Date(value).toISOString() : '');

export default function HeroCarouselFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [model, setModel] = useState(blankHeroSlide());
  const [meta, setMeta] = useState(null); // read-only, edit only: analyticsId/createdBy/updatedBy/updatedAt
  const [loading, setLoading] = useState(isEdit);
  const [notFound, setNotFound] = useState(false);
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [desktopUp, setDesktopUp] = useState(IDLE_UPLOAD);
  const [mobileUp, setMobileUp] = useState(IDLE_UPLOAD);
  const [previewMode, setPreviewMode] = useState('desktop');

  const desktopRef = useRef(null);
  const mobileRef = useRef(null);

  const set = (patch) => setModel((m) => ({ ...m, ...patch }));
  const setNested = (key) => (patch) => setModel((m) => ({ ...m, [key]: { ...m[key], ...patch } }));
  const setPrimaryCta = setNested('primaryCta');
  const setSecondaryCta = setNested('secondaryCta');
  const setFocalPoint = setNested('imageFocalPoint');

  const uploading = desktopUp.busy || mobileUp.busy;
  const busy = uploading || saving;

  // Load the existing slide on edit.
  useEffect(() => {
    if (!isEdit) return;
    let alive = true;
    setLoading(true);
    getHeroSlide(id)
      .then((doc) => {
        if (!alive) return;
        if (!doc) {
          setNotFound(true);
          return;
        }
        setModel({
          internalTitle: doc.internalTitle ?? '',
          headline: doc.headline ?? '',
          subtitle: doc.subtitle ?? '',
          desktopImage: doc.desktopImage ?? '',
          mobileImage: doc.mobileImage ?? '',
          primaryCta: { label: doc.primaryCta?.label ?? '', url: doc.primaryCta?.url ?? '' },
          secondaryCta: { label: doc.secondaryCta?.label ?? '', url: doc.secondaryCta?.url ?? '' },
          order: doc.order ?? 0,
          enabled: Boolean(doc.enabled),
          publishAt: doc.publishAt ?? '',
          expireAt: doc.expireAt ?? '',
          overlayOpacity: typeof doc.overlayOpacity === 'number' ? doc.overlayOpacity : 0.6,
          theme: doc.theme ?? 'dark',
          imageAlt: doc.imageAlt ?? '',
          imageFocalPoint: { x: doc.imageFocalPoint?.x ?? 50, y: doc.imageFocalPoint?.y ?? 50 },
          imageAttribution: doc.imageAttribution ?? '',
        });
        setMeta({
          analyticsId: doc.analyticsId,
          createdBy: doc.createdBy,
          updatedBy: doc.updatedBy,
          updatedAt: doc.updatedAt,
        });
      })
      .catch(() => alive && setSaveError('Failed to load hero slide.'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id, isEdit]);

  // ── Validation ────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!model.internalTitle.trim()) e.internalTitle = 'Internal title is required.';
    if (!model.headline.trim()) e.headline = 'Headline is required.';
    if (!model.desktopImage.trim()) e.desktopImage = 'Desktop image is required.';

    if (!model.primaryCta.label.trim()) e.primaryCtaLabel = 'Primary CTA label is required.';
    if (!model.primaryCta.url.trim()) {
      e.primaryCtaUrl = 'Primary CTA URL is required.';
    } else if (!isValidCtaUrl(model.primaryCta.url)) {
      e.primaryCtaUrl = 'Use a relative path (/store) or an https:// URL.';
    }

    const hasSecLabel = Boolean(model.secondaryCta.label.trim());
    const hasSecUrl = Boolean(model.secondaryCta.url.trim());
    if (hasSecLabel !== hasSecUrl) {
      e.secondaryCta = 'Secondary CTA needs both a label and a URL, or neither — clear both to remove it.';
    } else if (hasSecUrl && !isValidCtaUrl(model.secondaryCta.url)) {
      e.secondaryCta = 'Use a relative path (/store) or an https:// URL.';
    }

    if (model.publishAt && model.expireAt && new Date(model.publishAt) >= new Date(model.expireAt)) {
      e.schedule = 'Publish date must be before expire date.';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (evt) => {
    evt.preventDefault();
    setSaveError(null);
    if (busy) return;
    if (!validate()) return;

    setSaving(true);
    const payload = {
      ...model,
      publishAt: model.publishAt || null,
      expireAt: model.expireAt || null,
    };
    try {
      if (isEdit) await updateHeroSlide(id, payload);
      else await createHeroSlide(payload);
      navigate('/admin/hero-carousel', {
        replace: true,
        state: { flash: `Hero slide ${isEdit ? 'updated' : 'created'}: ${model.internalTitle.trim()}` },
      });
    } catch (err) {
      setSaveError(err?.message ?? 'Save failed. Please try again.');
      setSaving(false);
    }
  };

  // ── Image upload — immediate upload on pick, same pattern as Campaigns ──
  const pickImage = (kind) => async (evt) => {
    const file = evt.target.files?.[0];
    evt.target.value = '';
    if (!file) return;

    const setUp = kind === 'desktop' ? setDesktopUp : setMobileUp;
    const key = kind === 'desktop' ? 'desktopImage' : 'mobileImage';

    const invalid = validateImage(file);
    if (invalid) {
      setUp({ busy: false, name: file.name, error: invalid });
      return;
    }

    setSaveError(null);
    setUp({ busy: true, name: file.name, error: null });
    try {
      const url = await uploadHeroSlideImage(file);
      set({ [key]: url });
      setUp({ busy: false, name: file.name, error: null });
    } catch (err) {
      setUp({ busy: false, name: file.name, error: err?.message ?? 'Upload failed. Try again.' });
    }
  };

  const renderImageUploader = (kind, label, required) => {
    const up = kind === 'desktop' ? desktopUp : mobileUp;
    const ref = kind === 'desktop' ? desktopRef : mobileRef;
    const url = kind === 'desktop' ? model.desktopImage : model.mobileImage;
    const key = kind === 'desktop' ? 'desktopImage' : 'mobileImage';
    const fieldError = kind === 'desktop' ? errors.desktopImage : null;

    return (
      <div className={styles.field}>
        <span className={styles.fieldLabel}>
          {label}
          {required && <span className={styles.req} aria-hidden="true"> *</span>}
        </span>

        {up.busy ? (
          <div className={styles.uploading} role="status" aria-live="polite">
            <Loader2 className={styles.spin} size={16} aria-hidden="true" />
            <span>Uploading image…</span>
          </div>
        ) : (
          <div className={styles.uploader}>
            <button
              type="button"
              className={styles.uploadBtn}
              onClick={() => ref.current?.click()}
              disabled={busy}
            >
              {url ? <ImagePlus size={16} aria-hidden="true" /> : <UploadCloud size={16} aria-hidden="true" />}
              <span>{url ? 'Replace image' : 'Upload image'}</span>
            </button>

            {up.error ? (
              <span className={styles.uploadError} role="alert">{up.error}</span>
            ) : up.name && url ? (
              <span className={styles.uploadOk}>
                <Check size={14} aria-hidden="true" /> {up.name}
              </span>
            ) : (
              <span className={styles.hint}>JPG, PNG, or WebP — up to 20 MB.</span>
            )}

            <input
              ref={ref}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={pickImage(kind)}
            />
          </div>
        )}

        <input
          className={styles.input}
          value={url ?? ''}
          onChange={(e) => set({ [key]: e.target.value })}
          disabled={busy}
          placeholder={`https://res.cloudinary.com/…/${kind}.jpg`}
          aria-label={`${label} URL`}
        />
        {fieldError && <span className={styles.fieldError}>{fieldError}</span>}
      </div>
    );
  };

  if (notFound) {
    return (
      <div>
        <PageHeader title="Hero slide not found" subtitle="This slide may have been deleted." />
        <Button as={Link} to="/admin/hero-carousel" variant="outline">
          <ArrowLeft size={18} /> Back to Hero Carousel
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Loading slide…" />
        <div className={`skeleton ${styles.loadingBlock}`} />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <PageHeader
        title={isEdit ? 'Edit hero slide' : 'New hero slide'}
        subtitle={isEdit ? model.internalTitle : 'Add a slide to the homepage hero carousel'}
        actions={
          <>
            <Button as={Link} to="/admin/hero-carousel" variant="outline" type="button">
              <ArrowLeft size={18} /> Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              <Save size={18} />
              {uploading ? 'Uploading…' : saving ? 'Saving…' : isEdit ? 'Save changes' : model.enabled ? 'Create & publish' : 'Save as draft'}
            </Button>
          </>
        }
      />

      {saveError && (
        <div className={styles.error} role="alert">
          {saveError}
        </div>
      )}

      {meta && (
        <p className={styles.metaLine}>
          Analytics ID: <code>{meta.analyticsId}</code> · Last updated by {meta.updatedBy || '—'} on {fmtDateTime(meta.updatedAt)}
        </p>
      )}

      <div className={styles.layout}>
        {/* ── Main column ─────────────────────────────── */}
        <div className={styles.mainCol}>
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Identity</h2>
            <Field label="Internal title" required error={errors.internalTitle} hint="Admin-only label — not shown to visitors.">
              <input
                className={styles.input}
                value={model.internalTitle}
                onChange={(e) => set({ internalTitle: e.target.value })}
                placeholder="e.g. Monsoon Riding Gear 2026"
                autoFocus
              />
            </Field>
            <Field label="Display order" hint="Position in the carousel sequence. Ties are fine — use the list page's ▲/▼ to reorder precisely.">
              <input
                type="number"
                min="0"
                className={styles.input}
                value={model.order}
                onChange={(e) => set({ order: Number(e.target.value) || 0 })}
              />
            </Field>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Schedule &amp; status</h2>
            <Toggle
              id="hero-slide-enabled"
              checked={model.enabled}
              onChange={(v) => set({ enabled: v })}
              label="Enabled"
              hint="When unchecked, this slide never shows regardless of dates — this is the draft state."
            />
            <div className={styles.twoCol}>
              <Field label="Publish date" hint="Leave blank to start as soon as Enabled is checked.">
                <input
                  type="datetime-local"
                  className={styles.input}
                  value={toLocalInput(model.publishAt)}
                  onChange={(e) => set({ publishAt: fromLocalInput(e.target.value) })}
                />
              </Field>
              <Field label="Expire date" hint="Leave blank for no expiry." error={errors.schedule}>
                <input
                  type="datetime-local"
                  className={styles.input}
                  value={toLocalInput(model.expireAt)}
                  onChange={(e) => set({ expireAt: fromLocalInput(e.target.value) })}
                />
              </Field>
            </div>
            <p className={styles.cacheHint}>
              A slide is visible once BOTH Enabled is checked AND today is inside this window.
              Changes can take up to 10 minutes to reach visitors with a cached page.
            </p>
            <div className={styles.twoCol}>
              <Field label="Theme">
                <select
                  className={styles.select}
                  value={model.theme}
                  onChange={(e) => set({ theme: e.target.value })}
                >
                  {THEME_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </Field>
              <Field label={`Overlay opacity — ${Math.round(model.overlayOpacity * 100)}%`}>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={model.overlayOpacity}
                  onChange={(e) => set({ overlayOpacity: Number(e.target.value) })}
                  aria-valuetext={`${Math.round(model.overlayOpacity * 100)}%`}
                />
              </Field>
            </div>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Content</h2>
            <Field label="Headline" required error={errors.headline}>
              <input
                className={styles.input}
                value={model.headline}
                onChange={(e) => set({ headline: e.target.value })}
                placeholder="e.g. Gear for every ride."
              />
            </Field>
            <Field label="Subtitle">
              <textarea
                className={styles.textarea}
                rows={2}
                value={model.subtitle}
                onChange={(e) => set({ subtitle: e.target.value })}
                placeholder="Optional supporting line under the headline."
              />
            </Field>

            <div className={styles.twoCol}>
              <Field label="Primary CTA label" required error={errors.primaryCtaLabel}>
                <input
                  className={styles.input}
                  value={model.primaryCta.label}
                  onChange={(e) => setPrimaryCta({ label: e.target.value })}
                  placeholder="Shop the gear"
                />
              </Field>
              <Field label="Primary CTA URL" required error={errors.primaryCtaUrl}>
                <input
                  className={styles.input}
                  value={model.primaryCta.url}
                  onChange={(e) => setPrimaryCta({ url: e.target.value })}
                  placeholder="/store"
                />
              </Field>
            </div>

            <div className={styles.twoCol}>
              <Field label="Secondary CTA label" error={errors.secondaryCta}>
                <input
                  className={styles.input}
                  value={model.secondaryCta.label}
                  onChange={(e) => setSecondaryCta({ label: e.target.value })}
                  placeholder="Optional — e.g. Why riders choose us"
                />
              </Field>
              <Field label="Secondary CTA URL">
                <input
                  className={styles.input}
                  value={model.secondaryCta.url}
                  onChange={(e) => setSecondaryCta({ url: e.target.value })}
                  placeholder="/about"
                />
              </Field>
            </div>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Images</h2>
            <p className={styles.sectionDesc}>
              Desktop is required. If mobile is left blank, the desktop image is used at every breakpoint.
            </p>
            {renderImageUploader('desktop', 'Desktop image', true)}
            {renderImageUploader('mobile', 'Mobile image', false)}

            <Field label="Alt text" hint="Leave blank if the photo is purely decorative behind the headline (the current homepage hero treats it this way).">
              <input
                className={styles.input}
                value={model.imageAlt}
                onChange={(e) => set({ imageAlt: e.target.value })}
                placeholder="Optional"
              />
            </Field>

            <div className={styles.twoCol}>
              <Field label="Focal point — X (%)" hint="Which part of the photo stays visible when cropped.">
                <input
                  type="number"
                  min="0"
                  max="100"
                  className={styles.input}
                  value={model.imageFocalPoint.x}
                  onChange={(e) => setFocalPoint({ x: Number(e.target.value) })}
                />
              </Field>
              <Field label="Focal point — Y (%)">
                <input
                  type="number"
                  min="0"
                  max="100"
                  className={styles.input}
                  value={model.imageFocalPoint.y}
                  onChange={(e) => setFocalPoint({ y: Number(e.target.value) })}
                />
              </Field>
            </div>

            <Field label="Attribution" hint="Optional photographer/stock credit.">
              <input
                className={styles.input}
                value={model.imageAttribution}
                onChange={(e) => set({ imageAttribution: e.target.value })}
                placeholder="Optional"
              />
            </Field>
          </section>
        </div>

        {/* ── Preview column ───────────────────────────── */}
        <aside className={styles.sideCol}>
          <HeroCarouselPreview model={model} mode={previewMode} onModeChange={setPreviewMode} />
        </aside>
      </div>

      {/* Sticky footer action for a long form */}
      <div className={styles.footerBar}>
        <Button as={Link} to="/admin/hero-carousel" variant="outline" type="button">
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          <Save size={18} />
          {uploading ? 'Uploading…' : saving ? 'Saving…' : isEdit ? 'Save changes' : model.enabled ? 'Create & publish' : 'Save as draft'}
        </Button>
      </div>
    </form>
  );
}

/** Small labelled field wrapper — same shape as ProductFormPage's local Field. */
function Field({ label, required, error, hint, children }) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>
        {label}
        {required && <span className={styles.req} aria-hidden="true"> *</span>}
      </span>
      {children}
      {hint && !error && <span className={styles.hint}>{hint}</span>}
      {error && <span className={styles.fieldError}>{error}</span>}
    </label>
  );
}
