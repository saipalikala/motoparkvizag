import { useRef } from 'react';
import { ImagePlus, Plus, Trash2, X } from 'lucide-react';
import { cloudinaryUrl } from '@/lib/image.js';
import Button from '@/components/ui/Button.jsx';
import styles from './VariantEditor.module.css';

/**
 * VariantEditor — manages the product's colour variants, each with its own
 * images and size/stock rows. Fully controlled: it never mutates props, always
 * calling `onChange` with the next variants array.
 *
 * Variant shape:
 *   { color: hex, colorName: label,
 *     images: [{ kind:'existing', url } | { kind:'new', file, preview }],
 *     sizes:  [{ size, stock }] }
 *
 * Images: existing ones are Cloudinary URLs (kept via keepImages on save); new
 * ones are File objects previewed locally and uploaded on submit. Removing an
 * image just drops it from the array (existing → excluded from keepImages).
 */
export default function VariantEditor({ variants, onChange }) {
  // Replace variant at index with a patch.
  const patchVariant = (i, patch) => {
    onChange(variants.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  };

  const addVariant = () => {
    onChange([
      ...variants,
      { color: '#000000', colorName: '', images: [], sizes: [{ size: '', stock: 0 }] },
    ]);
  };

  const removeVariant = (i) => {
    // Revoke any local previews we created for this variant.
    variants[i]?.images?.forEach((img) => img.kind === 'new' && img.preview && URL.revokeObjectURL(img.preview));
    onChange(variants.filter((_, idx) => idx !== i));
  };

  return (
    <div className={styles.wrap}>
      {variants.length === 0 && (
        <p className={styles.emptyHint}>
          A product needs at least one colour variant. Add one to set images, sizes and stock.
        </p>
      )}

      {variants.map((variant, i) => (
        <VariantCard
          key={i}
          index={i}
          variant={variant}
          onPatch={(patch) => patchVariant(i, patch)}
          onRemove={() => removeVariant(i)}
        />
      ))}

      <Button type="button" variant="outline" onClick={addVariant} className={styles.addVariant}>
        <Plus size={18} /> Add colour variant
      </Button>
    </div>
  );
}

function VariantCard({ index, variant, onPatch, onRemove }) {
  const fileInputRef = useRef(null);

  const onFilesPicked = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const added = files.map((file) => ({
      kind: 'new',
      file,
      preview: URL.createObjectURL(file),
    }));
    onPatch({ images: [...(variant.images || []), ...added] });
    e.target.value = ''; // allow re-picking the same file
  };

  const removeImage = (imgIdx) => {
    const img = variant.images[imgIdx];
    if (img?.kind === 'new' && img.preview) URL.revokeObjectURL(img.preview);
    onPatch({ images: variant.images.filter((_, idx) => idx !== imgIdx) });
  };

  const patchSize = (sIdx, patch) => {
    onPatch({ sizes: variant.sizes.map((s, idx) => (idx === sIdx ? { ...s, ...patch } : s)) });
  };
  const addSize = () => onPatch({ sizes: [...(variant.sizes || []), { size: '', stock: 0 }] });
  const removeSize = (sIdx) => onPatch({ sizes: variant.sizes.filter((_, idx) => idx !== sIdx) });

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <span className={styles.cardTitle}>
          Variant {index + 1}
          {variant.colorName ? ` · ${variant.colorName}` : ''}
        </span>
        <button
          type="button"
          className={styles.removeVariant}
          onClick={onRemove}
          aria-label={`Remove variant ${index + 1}`}
        >
          <Trash2 size={16} /> Remove
        </button>
      </div>

      {/* Colour */}
      <div className={styles.colorRow}>
        <label className={styles.field}>
          <span className={styles.label}>Colour name</span>
          <input
            type="text"
            className={styles.input}
            value={variant.colorName}
            placeholder="e.g. Matte Black"
            onChange={(e) => onPatch({ colorName: e.target.value })}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Swatch</span>
          <span className={styles.swatchRow}>
            <input
              type="color"
              className={styles.colorInput}
              value={/^#[0-9a-fA-F]{6}$/.test(variant.color) ? variant.color : '#000000'}
              onChange={(e) => onPatch({ color: e.target.value })}
              aria-label="Colour swatch"
            />
            <input
              type="text"
              className={styles.input}
              value={variant.color}
              placeholder="#000000"
              onChange={(e) => onPatch({ color: e.target.value })}
            />
          </span>
        </label>
      </div>

      {/* Images */}
      <div className={styles.section}>
        <span className={styles.label}>Images</span>
        <div className={styles.imageGrid}>
          {(variant.images || []).map((img, imgIdx) => (
            <div className={styles.imageCell} key={img.kind === 'existing' ? img.url : `new-${imgIdx}`}>
              <img
                className={styles.image}
                src={img.kind === 'existing' ? cloudinaryUrl(img.url, { w: 160 }) : img.preview}
                alt=""
                width={80}
                height={80}
                loading="lazy"
              />
              <button
                type="button"
                className={styles.imageRemove}
                onClick={() => removeImage(imgIdx)}
                aria-label="Remove image"
              >
                <X size={14} />
              </button>
              {img.kind === 'new' && <span className={styles.newTag}>New</span>}
            </div>
          ))}

          <button
            type="button"
            className={styles.addImage}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus size={20} />
            <span>Add</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={onFilesPicked}
          />
        </div>
      </div>

      {/* Sizes + stock */}
      <div className={styles.section}>
        <span className={styles.label}>Sizes &amp; stock</span>
        <div className={styles.sizeList}>
          {(variant.sizes || []).map((s, sIdx) => (
            <div className={styles.sizeRow} key={sIdx}>
              <input
                type="text"
                className={`${styles.input} ${styles.sizeInput}`}
                value={s.size}
                placeholder="Size (e.g. M, XL, Standard)"
                onChange={(e) => patchSize(sIdx, { size: e.target.value })}
              />
              <input
                type="number"
                min="0"
                className={`${styles.input} ${styles.stockInput}`}
                value={s.stock}
                placeholder="Stock"
                onChange={(e) => patchSize(sIdx, { stock: e.target.value })}
              />
              <button
                type="button"
                className={styles.sizeRemove}
                onClick={() => removeSize(sIdx)}
                aria-label="Remove size"
                disabled={variant.sizes.length <= 1}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
        <button type="button" className={styles.addSize} onClick={addSize}>
          <Plus size={16} /> Add size
        </button>
      </div>
    </div>
  );
}
