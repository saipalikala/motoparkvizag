/**
 * features/admin/campaigns/CampaignFormModal.jsx
 *
 * Create / edit a Campaign. Follows the VideoShowcaseFormModal pattern:
 *   – controlled form state
 *   – immediate image upload on file pick (non-blocking validation)
 *   – URL field editable alongside the uploader
 *   – all fields grouped into logical sections
 *
 * Sections:
 *   1. Identity    — name, type, priority, presentation type
 *   2. Schedule    — enabled toggle, start/end dates, display delay, dismiss behaviour
 *   3. Content     — title*, subtitle, badge, coupon, CTA label*, CTA URL*, bg colour
 *   4. Images      — desktop image, mobile image (upload + URL edit)
 */
import { useEffect, useRef, useState } from 'react';
import { Check, ImagePlus, Loader2, UploadCloud } from 'lucide-react';
import Button from '@/components/ui/Button.jsx';
import Modal from '../components/Modal.jsx';
import {
  CAMPAIGN_TYPES,
  DISMISS_BEHAVIOURS,
  PRESENTATION_TYPES,
  blankCampaign,
  uploadCampaignImage,
  validateImage,
} from './campaignService.js';
import styles from './CampaignFormModal.module.css';

const IDLE = { busy: false, pct: null, name: '', error: null };

export default function CampaignFormModal({ open, campaign, onClose, onSubmit, saving = false }) {
  const isEdit = Boolean(campaign?._id);
  const [form, setForm] = useState(blankCampaign());
  const [error, setError] = useState(null);
  const [desktopUp, setDesktopUp] = useState(IDLE);
  const [mobileUp,  setMobileUp]  = useState(IDLE);

  const desktopRef = useRef(null);
  const mobileRef  = useRef(null);

  // Reset form whenever the modal opens
  useEffect(() => {
    if (!open) return;
    setForm(campaign ? { ...blankCampaign(), ...campaign } : blankCampaign());
    setError(null);
    setDesktopUp(IDLE);
    setMobileUp(IDLE);
  }, [open, campaign]);

  const uploading = desktopUp.busy || mobileUp.busy;
  const busy = uploading || saving;

  const set = (key) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: val }));
  };

  /** Pick + immediately upload an image. */
  const pick = (kind) => async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const setUp = kind === 'desktop' ? setDesktopUp : setMobileUp;
    const key   = kind === 'desktop' ? 'desktopImage' : 'mobileImage';

    const invalid = validateImage(file);
    if (invalid) {
      setUp({ ...IDLE, name: file.name, error: invalid });
      return;
    }

    setError(null);
    setUp({ busy: true, pct: null, name: file.name, error: null });
    try {
      const url = await uploadCampaignImage(file);
      setForm((f) => ({ ...f, [key]: url }));
      setUp({ busy: false, pct: 100, name: file.name, error: null });
    } catch (err) {
      setUp({ ...IDLE, name: file.name, error: err?.message ?? 'Upload failed. Try again.' });
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (busy) return;
    if (!form.title.trim())  return setError('Campaign title is required.');
    if (!form.ctaLabel.trim()) return setError('CTA label is required.');
    if (!form.ctaUrl.trim())   return setError('CTA URL is required.');
    setError(null);
    // Send _id along for update routing
    onSubmit({ ...(campaign ?? {}), ...form });
  };

  /** Image uploader widget — shared for desktop and mobile images. */
  const renderImageUploader = (kind, label) => {
    const up  = kind === 'desktop' ? desktopUp : mobileUp;
    const ref = kind === 'desktop' ? desktopRef : mobileRef;
    const url = kind === 'desktop' ? form.desktopImage : form.mobileImage;
    const key = kind === 'desktop' ? 'desktopImage' : 'mobileImage';

    return (
      <div className={styles.field}>
        <span className={styles.label}>{label}</span>

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
              {url ? <ImagePlus size={16} /> : <UploadCloud size={16} />}
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
              onChange={pick(kind)}
            />
          </div>
        )}

        <input
          className={styles.input}
          value={url ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          disabled={busy}
          placeholder={`https://res.cloudinary.com/…/${kind}.jpg`}
          aria-label={`${label} URL`}
        />
        {url && (
          <img className={styles.preview} src={url} alt="" loading="lazy" />
        )}
      </div>
    );
  };

  return (
    <Modal
      open={open}
      title={isEdit ? 'Edit campaign' : 'New campaign'}
      onClose={onClose}
      busy={busy}
      size="lg"
      footer={
        <>
          <Button variant="outline" type="button" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="campaign-form" disabled={busy}>
            {uploading ? 'Uploading…' : saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create campaign'}
          </Button>
        </>
      }
    >
      <form id="campaign-form" onSubmit={submit} className={styles.form} noValidate>
        {error && <p className={styles.error} role="alert">{error}</p>}

        {/* ── Section 1: Identity ──────────────────────────────── */}
        <fieldset className={styles.section}>
          <legend className={styles.sectionTitle}>Identity</legend>

          <label className={styles.field}>
            <span className={styles.label}>Campaign name *</span>
            <input
              className={styles.input}
              value={form.name}
              onChange={set('name')}
              placeholder="e.g. Monsoon Riding Sale 2026"
              autoFocus
            />
            <span className={styles.hint}>Internal label — not shown to visitors.</span>
          </label>

          <div className={styles.row2}>
            <label className={styles.field}>
              <span className={styles.label}>Campaign type</span>
              <select className={styles.select} value={form.type} onChange={set('type')}>
                {CAMPAIGN_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Presentation</span>
              <select className={styles.select} value={form.presentationType} onChange={set('presentationType')}>
                {PRESENTATION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>
          </div>

          <label className={styles.field}>
            <span className={styles.label}>Priority</span>
            <input
              className={styles.input}
              type="number"
              min="0"
              max="999"
              value={form.priority}
              onChange={set('priority')}
              placeholder="0"
            />
            <span className={styles.hint}>Higher number = shown first when multiple campaigns are active.</span>
          </label>
        </fieldset>

        {/* ── Section 2: Schedule & Behaviour ─────────────────── */}
        <fieldset className={styles.section}>
          <legend className={styles.sectionTitle}>Schedule & Behaviour</legend>

          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={set('enabled')}
              className={styles.checkbox}
            />
            <span>
              <strong>Enabled</strong>
              <span className={styles.hint}> — When unchecked, this campaign never shows regardless of dates.</span>
            </span>
          </label>

          <div className={styles.row2}>
            <label className={styles.field}>
              <span className={styles.label}>Start date</span>
              <input
                className={styles.input}
                type="datetime-local"
                value={form.startDate ? form.startDate.slice(0, 16) : ''}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
              />
              <span className={styles.hint}>Leave blank to start immediately.</span>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>End date</span>
              <input
                className={styles.input}
                type="datetime-local"
                value={form.endDate ? form.endDate.slice(0, 16) : ''}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
              />
              <span className={styles.hint}>Leave blank for no expiry.</span>
            </label>
          </div>

          <div className={styles.row2}>
            <label className={styles.field}>
              <span className={styles.label}>Display delay (ms)</span>
              <input
                className={styles.input}
                type="number"
                min="0"
                max="10000"
                step="500"
                value={form.displayDelayMs}
                onChange={set('displayDelayMs')}
              />
              <span className={styles.hint}>Delay after page load before the card appears. Default: 1500.</span>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Dismiss behaviour</span>
              <select className={styles.select} value={form.dismissBehaviour} onChange={set('dismissBehaviour')}>
                {DISMISS_BEHAVIOURS.map((b) => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>

        {/* ── Section 3: Content ────────────────────────────────── */}
        <fieldset className={styles.section}>
          <legend className={styles.sectionTitle}>Content</legend>

          <label className={styles.field}>
            <span className={styles.label}>Headline *</span>
            <input
              className={styles.input}
              value={form.title}
              onChange={set('title')}
              placeholder="e.g. Gear for the Monsoon"
            />
            <span className={styles.hint}>Rendered in Sakana (display font).</span>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Subtitle</span>
            <textarea
              className={styles.textarea}
              rows={2}
              value={form.subtitle}
              onChange={set('subtitle')}
              placeholder="Optional — one or two supporting lines shown under the headline."
            />
          </label>

          <div className={styles.row2}>
            <label className={styles.field}>
              <span className={styles.label}>Badge text</span>
              <input
                className={styles.input}
                value={form.badgeText}
                onChange={set('badgeText')}
                placeholder="e.g. 20% OFF · NEW ARRIVAL"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Coupon code</span>
              <input
                className={styles.input}
                value={form.couponCode}
                onChange={set('couponCode')}
                placeholder="e.g. RIDE20"
                style={{ fontFamily: 'monospace', letterSpacing: '0.1em' }}
              />
              <span className={styles.hint}>Visitors can tap to copy. Leave blank to hide.</span>
            </label>
          </div>

          <div className={styles.row2}>
            <label className={styles.field}>
              <span className={styles.label}>CTA label *</span>
              <input
                className={styles.input}
                value={form.ctaLabel}
                onChange={set('ctaLabel')}
                placeholder="Shop Now"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>CTA URL *</span>
              <input
                className={styles.input}
                value={form.ctaUrl}
                onChange={set('ctaUrl')}
                placeholder="/store or https://…"
              />
            </label>
          </div>

          <label className={styles.field}>
            <span className={styles.label}>Background colour override</span>
            <div className={styles.colorRow}>
              <input
                className={styles.colorSwatch}
                type="color"
                value={form.bgColor || '#1b2536'}
                onChange={set('bgColor')}
              />
              <input
                className={styles.input}
                value={form.bgColor}
                onChange={set('bgColor')}
                placeholder="Leave blank for default navy (#1b2536)"
              />
            </div>
            <span className={styles.hint}>Overrides the default navy card background.</span>
          </label>
        </fieldset>

        {/* ── Section 4: Images ─────────────────────────────────── */}
        <fieldset className={styles.section}>
          <legend className={styles.sectionTitle}>Images</legend>
          <p className={styles.sectionDesc}>
            Images are optional. If only one is provided it will be used on both breakpoints.
          </p>

          {renderImageUploader('desktop', 'Desktop image')}
          {renderImageUploader('mobile', 'Mobile image')}
        </fieldset>
      </form>
    </Modal>
  );
}
