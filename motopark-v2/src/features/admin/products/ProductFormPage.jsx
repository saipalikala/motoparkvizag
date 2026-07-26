import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Sparkles } from 'lucide-react';
import { formatINR } from '@/lib/format.js';
import PageHeader from '../components/PageHeader.jsx';
import Toggle from '../components/Toggle.jsx';
import Button from '@/components/ui/Button.jsx';
import VariantEditor from './VariantEditor.jsx';
import { autoDetectFitment, listBikes } from '../bikes/bikeService.js';
import {
  createProduct,
  getBrandOptions,
  getCategoryOptions,
  getProductForm,
  updateProduct,
} from './productService.js';
import styles from './ProductFormPage.module.css';

const BLANK = {
  name: '',
  brand: '',
  category: '',
  price: '',
  originalPrice: '',
  description: '',
  specs: '',
  care: '',
  newArrival: false,
  featured: false,
  trending: false,
  isShowcase: false,
  compatibleBikes: [],
  variants: [{ color: '#000000', colorName: '', images: [], sizes: [{ size: '', stock: 0 }] }],
};

const FLAGS = [
  {
    key: 'trending',
    label: "Riders' favourites",
    hint: "Shows in Homepage Riders’ favourites grid.",
  },
  {
    key: 'newArrival',
    label: 'Fresh off the truck',
    hint: "Shows in Homepage Fresh off the truck grid.",
  },
  {
    key: 'featured',
    label: 'Best Seller',
    hint: 'Shows Best Seller badge & enables Store filter.',
  },
];

export default function ProductFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [model, setModel] = useState(BLANK);
  const [loading, setLoading] = useState(isEdit);
  const [notFound, setNotFound] = useState(false);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [bikes, setBikes] = useState([]);
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectNote, setDetectNote] = useState(null);

  const set = (patch) => setModel((m) => ({ ...m, ...patch }));

  // Load options + (on edit) the product.
  useEffect(() => {
    let alive = true;
    getCategoryOptions().then((c) => alive && setCategories(c)).catch(() => {});
    getBrandOptions().then((b) => alive && setBrands(b)).catch(() => {});
    // Fitment catalog. Failure leaves the picker empty with its own empty state —
    // never blocks saving a product.
    listBikes().then((b) => alive && setBikes(b)).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    let alive = true;
    setLoading(true);
    getProductForm(id)
      .then((m) => {
        if (!alive) return;
        if (!m) setNotFound(true);
        else setModel(m);
      })
      .catch(() => alive && setSaveError('Failed to load product.'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id, isEdit]);

  const validate = () => {
    const e = {};
    if (!model.name.trim()) e.name = 'Product name is required.';
    if (!model.brand.trim()) e.brand = 'Brand is required.';
    if (!model.category) e.category = 'Category is required.';
    const price = Number(model.price);
    if (model.price === '' || Number.isNaN(price) || price < 0) e.price = 'Enter a valid price (₹, whole rupees).';
    if (model.originalPrice !== '' && Number(model.originalPrice) < 0) e.originalPrice = 'MRP cannot be negative.';
    if (!model.variants.length) e.variants = 'Add at least one colour variant.';
    else if (!model.variants.some((v) => (v.sizes || []).some((s) => String(s.size).trim())))
      e.variants = 'Each product needs at least one size with a name.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaveError(null);
    if (!validate()) return;
    setSaving(true);
    try {
      if (isEdit) await updateProduct(id, model);
      else await createProduct(model);
      navigate('/admin/products', {
        replace: true,
        state: { flash: `Product ${isEdit ? 'updated' : 'created'}: ${model.name.trim()}` },
      });
    } catch (err) {
      setSaveError(err?.message ?? 'Save failed. Please try again.');
      setSaving(false);
    }
  };

  /* ── Fitment ──────────────────────────────────────────────── */

  const selectedBikes = useMemo(
    () => new Set(model.compatibleBikes ?? []),
    [model.compatibleBikes],
  );

  /** Bikes grouped by make, so the picker reads as makes → models. */
  const bikeGroups = useMemo(() => {
    const byMake = new Map();
    for (const b of bikes) {
      let group = byMake.get(b.makeSlug);
      if (!group) {
        group = { make: b.make, makeSlug: b.makeSlug, models: [] };
        byMake.set(b.makeSlug, group);
      }
      group.models.push(b);
    }
    return [...byMake.values()];
  }, [bikes]);

  const toggleBike = (id) => {
    const next = new Set(model.compatibleBikes ?? []);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    set({ compatibleBikes: [...next] });
  };

  /**
   * Ask the backend which bikes this product's copy names, then MERGE the hits
   * into the current selection. Merge (not replace) is deliberate: auto-detect
   * assists the admin, it must never silently drop a bike they picked by hand.
   */
  const runAutoDetect = async () => {
    setDetectNote(null);
    if (!model.name.trim() && !model.description.trim()) {
      setDetectNote({ ok: false, text: 'Add a product name or description first.' });
      return;
    }
    setDetecting(true);
    try {
      const ids = await autoDetectFitment({ title: model.name, description: model.description });
      const before = new Set(model.compatibleBikes ?? []);
      const merged = new Set([...before, ...ids]);
      const added = merged.size - before.size;
      set({ compatibleBikes: [...merged] });

      if (!ids.length) {
        setDetectNote({ ok: false, text: 'No bikes matched this copy — pick fitment manually.' });
      } else if (!added) {
        setDetectNote({ ok: true, text: `Matched ${ids.length} bike${ids.length === 1 ? '' : 's'} — already selected.` });
      } else {
        setDetectNote({ ok: true, text: `Added ${added} bike${added === 1 ? '' : 's'}. Review before saving.` });
      }
    } catch (err) {
      setDetectNote({ ok: false, text: err?.message ?? 'Auto-detect failed.' });
    } finally {
      setDetecting(false);
    }
  };

  const mrpPreview = useMemo(() => {
    const price = Number(model.price);
    const mrp = Number(model.originalPrice);
    if (!mrp || !price || mrp <= price) return null;
    return Math.round(((mrp - price) / mrp) * 100);
  }, [model.price, model.originalPrice]);

  if (notFound) {
    return (
      <div>
        <PageHeader title="Product not found" subtitle="This product may have been deleted." />
        <Button as={Link} to="/admin/products" variant="outline">
          <ArrowLeft size={18} /> Back to products
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Loading product…" />
        <div className={`skeleton ${styles.loadingBlock}`} />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <PageHeader
        title={isEdit ? 'Edit product' : 'Create product'}
        subtitle={isEdit ? model.name : 'Add a new product to your catalog'}
        actions={
          <>
            <Button as={Link} to="/admin/products" variant="outline" type="button">
              <ArrowLeft size={18} /> Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              <Save size={18} /> {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}
            </Button>
          </>
        }
      />

      {saveError && (
        <div className={styles.error} role="alert">
          {saveError}
        </div>
      )}

      <div className={styles.layout}>
        {/* ── Main column ─────────────────────────────── */}
        <div className={styles.mainCol}>
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Basic info</h2>
            <Field label="Name" required error={errors.name}>
              <input
                className={styles.input}
                value={model.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="e.g. Korda Full-Face Helmet"
              />
            </Field>
            <Field label="Description">
              <textarea
                className={styles.textarea}
                rows={4}
                value={model.description}
                onChange={(e) => set({ description: e.target.value })}
                placeholder="Customer-facing product description…"
              />
            </Field>
            <div className={styles.twoCol}>
              <Field label="Specs">
                <textarea
                  className={styles.textarea}
                  rows={3}
                  value={model.specs}
                  onChange={(e) => set({ specs: e.target.value })}
                  placeholder="Material, certifications, weight…"
                />
              </Field>
              <Field label="Care instructions">
                <textarea
                  className={styles.textarea}
                  rows={3}
                  value={model.care}
                  onChange={(e) => set({ care: e.target.value })}
                  placeholder="How to clean & maintain…"
                />
              </Field>
            </div>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Variants &amp; inventory</h2>
            {errors.variants && <p className={styles.fieldError}>{errors.variants}</p>}
            <VariantEditor variants={model.variants} onChange={(variants) => set({ variants })} />
          </section>
        </div>

        {/* ── Sidebar column ──────────────────────────── */}
        <aside className={styles.sideCol}>
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Organization</h2>
            <Field label="Brand" required error={errors.brand}>
              <input
                className={styles.input}
                list="admin-brand-options"
                value={model.brand}
                onChange={(e) => set({ brand: e.target.value })}
                placeholder="e.g. korda"
              />
              <datalist id="admin-brand-options">
                {brands.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </Field>
            <Field label="Category" required error={errors.category}>
              <select
                className={styles.input}
                value={model.category}
                onChange={(e) => set({ category: e.target.value })}
              >
                <option value="">Select a category…</option>
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Pricing</h2>
            <Field label="Selling price (₹)" required error={errors.price}>
              <input
                type="number"
                min="0"
                className={styles.input}
                value={model.price}
                onChange={(e) => set({ price: e.target.value })}
                placeholder="e.g. 8850"
              />
            </Field>
            <Field
              label="MRP / original price (₹)"
              error={errors.originalPrice}
              hint="Shown struck-through when higher than the selling price."
            >
              <input
                type="number"
                min="0"
                className={styles.input}
                value={model.originalPrice}
                onChange={(e) => set({ originalPrice: e.target.value })}
                placeholder="Optional"
              />
            </Field>
            {mrpPreview != null && (
              <p className={styles.pricePreview}>
                <span className={styles.mrpStrike}>{formatINR(Number(model.originalPrice))}</span>{' '}
                <span className={styles.sale}>{formatINR(Number(model.price))}</span>{' '}
                <span className={styles.discount}>−{mrpPreview}%</span>
              </p>
            )}
          </section>

          <section className={styles.panel}>
            <div className={styles.fitHead}>
              <h2 className={styles.panelTitle}>Fitment</h2>
              {selectedBikes.size > 0 && (
                <span className={styles.fitCount}>{selectedBikes.size} selected</span>
              )}
            </div>
            <p className={styles.hint}>
              Bikes this product fits. Drives the “Shop by bike” pages.
            </p>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={runAutoDetect}
              disabled={detecting || bikes.length === 0}
            >
              <Sparkles size={16} aria-hidden="true" />
              {detecting ? 'Detecting…' : 'Auto-Detect Fitment'}
            </Button>

            {detectNote && (
              <p className={detectNote.ok ? styles.detectOk : styles.detectWarn} role="status">
                {detectNote.text}
              </p>
            )}

            {bikes.length === 0 ? (
              <p className={styles.hint}>
                No bikes in the catalog yet. <Link to="/admin/bikes">Add bikes</Link> to enable
                fitment.
              </p>
            ) : (
              <>
                <div className={styles.bikeList}>
                  {bikeGroups.map((g) => (
                    <fieldset key={g.makeSlug} className={styles.bikeGroup}>
                      <legend className={styles.bikeMake}>{g.make}</legend>
                      {g.models.map((b) => (
                        <label key={b.id} className={styles.bikeRow}>
                          <input
                            type="checkbox"
                            checked={selectedBikes.has(b.id)}
                            onChange={() => toggleBike(b.id)}
                          />
                          <span>{b.model}</span>
                        </label>
                      ))}
                    </fieldset>
                  ))}
                </div>
                {selectedBikes.size > 0 && (
                  <button
                    type="button"
                    className={styles.clearFit}
                    onClick={() => set({ compatibleBikes: [] })}
                  >
                    Clear all fitment
                  </button>
                )}
              </>
            )}
          </section>

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Merchandising &amp; Placement</h2>
            <p className={styles.hint}>
              Controls where this product is promoted across the MotoPark storefront.
            </p>
            <div className={styles.flags}>
              {FLAGS.map((f) => (
                <Toggle
                  key={f.key}
                  id={`flag-${f.key}`}
                  label={f.label}
                  hint={f.hint}
                  checked={Boolean(model[f.key])}
                  onChange={(v) => set({ [f.key]: v })}
                />
              ))}
            </div>
          </section>
        </aside>
      </div>

      {/* Sticky footer action for long forms */}
      <div className={styles.footerBar}>
        <Button as={Link} to="/admin/products" variant="outline" type="button">
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          <Save size={18} /> {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}
        </Button>
      </div>
    </form>
  );
}

/** Small labelled field wrapper. */
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
