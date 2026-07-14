import { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { cloudinaryUrl } from '@/lib/image.js';
import styles from './ProductPicker.module.css';

/**
 * ProductPicker — searchable multi-select for attaching products to a collection.
 *
 * props:
 *   options    — [{ id, name, brand, image }]
 *   selectedIds — string[]
 *   onChange(nextIds)
 *   loading
 */
export default function ProductPicker({ options, selectedIds, onChange, loading = false }) {
  const [q, setQ] = useState('');
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return options;
    return options.filter(
      (o) => o.name?.toLowerCase().includes(term) || o.brand?.toLowerCase().includes(term),
    );
  }, [q, options]);

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  };

  return (
    <div className={styles.picker}>
      <div className={styles.head}>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} aria-hidden="true" />
          <input
            type="search"
            className={styles.search}
            placeholder="Search products…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search products to add"
          />
        </div>
        <span className={styles.count}>{selected.size} selected</span>
      </div>

      <div className={styles.list} role="listbox" aria-multiselectable="true">
        {loading && <p className={styles.state}>Loading products…</p>}
        {!loading && filtered.length === 0 && <p className={styles.state}>No products match.</p>}
        {!loading &&
          filtered.map((p) => {
            const isSel = selected.has(p.id);
            return (
              <button
                type="button"
                key={p.id}
                role="option"
                aria-selected={isSel}
                className={`${styles.row} ${isSel ? styles.rowSelected : ''}`}
                onClick={() => toggle(p.id)}
              >
                <span className={`${styles.check} ${isSel ? styles.checkOn : ''}`} aria-hidden="true">
                  {isSel && <Check size={14} />}
                </span>
                {p.image ? (
                  <img className={styles.thumb} src={cloudinaryUrl(p.image, { w: 72 })} alt="" width={36} height={36} />
                ) : (
                  <span className={styles.thumbEmpty} aria-hidden="true" />
                )}
                <span className={styles.info}>
                  <span className={styles.name}>{p.name}</span>
                  {p.brand && <span className={styles.brand}>{p.brand}</span>}
                </span>
              </button>
            );
          })}
      </div>
    </div>
  );
}
