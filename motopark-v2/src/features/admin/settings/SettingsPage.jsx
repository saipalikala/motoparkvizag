import { useEffect, useMemo, useState } from 'react';
import { Truck, Save } from 'lucide-react';
import { formatINR } from '@/lib/format.js';
import PageHeader from '../components/PageHeader.jsx';
import Toggle from '../components/Toggle.jsx';
import { getShippingSettings, saveShippingSettings, SHIPPING_DEFAULTS } from './settingsService.js';
import styles from './SettingsPage.module.css';

/**
 * SettingsPage — Store configuration (Milestone 6b). Currently the shipping
 * rules the backend applies at checkout (docs/06 §6): flat charge, free-shipping
 * threshold, and a master switch for the free-above rule. The backend remains
 * authoritative — this only edits the knobs.
 */
export default function SettingsPage() {
  const [baseSettings, setBaseSettings] = useState(null); // full settings obj (for merge on save)
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(null); // last-persisted shipping, for dirty-check
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getShippingSettings()
      .then(({ settings, shipping }) => {
        if (!alive) return;
        setBaseSettings(settings);
        setForm(shipping);
        setSaved(shipping);
      })
      .catch((err) => {
        if (alive) setError(err?.message ?? 'Failed to load settings.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const dirty = useMemo(
    () => form && saved && JSON.stringify(form) !== JSON.stringify(saved),
    [form, saved],
  );

  const setField = (key, value) => {
    setNotice(null);
    setForm((f) => ({ ...f, [key]: value }));
  };

  // Number inputs come in as strings; keep empty string editable, coerce on blur.
  const onNumberChange = (key) => (e) => {
    const raw = e.target.value;
    setField(key, raw === '' ? '' : Math.max(0, Number(raw)));
  };

  const normalizeNumber = (key, fallback) => () =>
    setForm((f) => ({ ...f, [key]: f[key] === '' || Number.isNaN(Number(f[key])) ? fallback : Number(f[key]) }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!dirty || saving) return;
    setSaving(true);
    setError(null);
    setNotice(null);

    const payload = {
      flatRate: Number(form.flatRate) || 0,
      freeThreshold: Number(form.freeThreshold) || 0,
      freeShippingEnabled: Boolean(form.freeShippingEnabled),
    };

    try {
      const updated = await saveShippingSettings(baseSettings, payload);
      // Keep base settings in sync with what the server now holds.
      if (updated?.settings) setBaseSettings(updated.settings);
      setForm(payload);
      setSaved(payload);
      setNotice('Shipping settings saved.');
    } catch (err) {
      setError(err?.message ?? 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Store configuration and admin preferences." />

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      <form className={styles.card} onSubmit={onSubmit} aria-busy={loading}>
        <div className={styles.cardHead}>
          <span className={styles.cardIcon} aria-hidden="true">
            <Truck size={18} />
          </span>
          <div>
            <h2 className={styles.cardTitle}>Shipping</h2>
            <p className={styles.cardSubtitle}>
              Applied by the backend at checkout — the storefront never computes shipping.
            </p>
          </div>
        </div>

        {loading || !form ? (
          <div className={styles.fields}>
            <div className={`skeleton ${styles.fieldSkeleton}`} />
            <div className={`skeleton ${styles.fieldSkeleton}`} />
            <div className={`skeleton ${styles.fieldSkeleton}`} />
          </div>
        ) : (
          <div className={styles.fields}>
            <label className={styles.field}>
              <span className={styles.label}>Flat Shipping Charge</span>
              <span className={styles.inputWrap}>
                <span className={styles.prefix}>₹</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  className={styles.input}
                  value={form.flatRate}
                  onChange={onNumberChange('flatRate')}
                  onBlur={normalizeNumber('flatRate', SHIPPING_DEFAULTS.flatRate)}
                />
              </span>
              <span className={styles.hint}>Charged per order when free shipping does not apply.</span>
            </label>

            <label className={`${styles.field} ${!form.freeShippingEnabled ? styles.fieldDisabled : ''}`}>
              <span className={styles.label}>Free Shipping Threshold</span>
              <span className={styles.inputWrap}>
                <span className={styles.prefix}>₹</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  className={styles.input}
                  value={form.freeThreshold}
                  onChange={onNumberChange('freeThreshold')}
                  onBlur={normalizeNumber('freeThreshold', SHIPPING_DEFAULTS.freeThreshold)}
                  disabled={!form.freeShippingEnabled}
                />
              </span>
              <span className={styles.hint}>
                {form.freeShippingEnabled
                  ? `Orders at or above ${formatINR(Number(form.freeThreshold) || 0)} ship free.`
                  : 'Enable free shipping to use this threshold.'}
              </span>
            </label>

            <div className={styles.toggleRow}>
              <Toggle
                id="freeShippingEnabled"
                checked={form.freeShippingEnabled}
                onChange={(v) => setField('freeShippingEnabled', v)}
                label="Enable Free Shipping"
                hint="When on, orders above the threshold ship at no charge."
              />
            </div>
          </div>
        )}

        <div className={styles.actions}>
          {notice && <span className={styles.notice}>{notice}</span>}
          <button type="submit" className={styles.saveBtn} disabled={loading || saving || !dirty}>
            <Save size={16} aria-hidden="true" />
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
