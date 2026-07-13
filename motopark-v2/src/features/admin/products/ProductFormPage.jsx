import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { formatINR } from '@/lib/format.js';
import PageHeader from '../components/PageHeader.jsx';
import Toggle from '../components/Toggle.jsx';
import Button from '@/components/ui/Button.jsx';
import VariantEditor from './VariantEditor.jsx';
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
  variants: [{ color: '#000000', colorName: '', images: [], sizes: [{ size: '', stock: 0 }] }],
};

const FLAGS = [
  { key: 'featured', label: 'Featured', hint: 'Highlighted on the homepage' },
  { key: 'trending', label: 'Trending', hint: 'Shown in “Riders’ favourites”' },
  { key: 'newArrival', label: 'New arrival', hint: 'Appears in New Arrivals' },
  { key: 'isShowcase', label: 'Showcase', hint: 'Eligible for showcase modules' },
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
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (patch) => setModel((m) => ({ ...m, ...patch }));

  // Load options + (on edit) the product.
  useEffect(() => {
    let alive = true;
    getCategoryOptions().then((c) => alive && setCategories(c)).catch(() => {});
    getBrandOptions().then((b) => alive && setBrands(b)).catch(() => {});
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
            <h2 className={styles.panelTitle}>Visibility flags</h2>
            <div className={styles.flags}>
              {FLAGS.map((f) => (
                <Toggle
                  key={f.key}
                  id={`flag-${f.key}`}
                  label={f.label}
                  hint={f.hint}
                  checked={model[f.key]}
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
