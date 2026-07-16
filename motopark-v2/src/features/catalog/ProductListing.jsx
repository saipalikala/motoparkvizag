import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { SlidersHorizontal, X } from 'lucide-react';
import ProductGrid from '@/components/commerce/ProductGrid.jsx';
import Button from '@/components/ui/Button.jsx';
import { getProducts, getProductFilters } from '@/services/products.js';
import { formatINR } from '@/lib/format.js';
import styles from './ProductListing.module.css';

const PAGE_SIZE = 12;
const SORTS = [
  { value: '', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

/**
 * ProductListing — the shared filtered-catalogue view behind StorePage,
 * CategoryPage and (later) BrandPage. All filter/sort/page state lives in the
 * URL (docs/11 §4). A `category` prop locks results to one category (route-driven,
 * not a URL filter); brand + price + sort + page remain user-controlled in the URL.
 *
 * `bike` / `bikeMake` lock results to structured fitment (Milestone 10) and are
 * route-driven the same way — the bike pages pass them, the user can't set them.
 *
 * props: { eyebrow, title, seoTitle, seoDescription, canonical, category?,
 *          search?, brand?, bike?, bikeMake? }
 */
export default function ProductListing({
  eyebrow,
  title,
  seoTitle,
  seoDescription,
  canonical,
  category,
  search,
  brand: lockedBrand,
  bike,
  bikeMake,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState({ products: [], total: 0, page: 1, pages: 0 });
  const [facets, setFacets] = useState({ brands: [], priceRange: { min: 0, max: 0 } });
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const sort = searchParams.get('sort') || '';
  const page = Number(searchParams.get('page')) || 1;
  const urlBrand = searchParams.get('brand') || '';
  // A locked brand (BrandPage) drives the query and hides the brand facet.
  const brandParam = lockedBrand || urlBrand;
  const selectedBrands = lockedBrand ? [] : urlBrand ? urlBrand.split(',') : [];
  const minPrice = searchParams.get('min') || '';
  const maxPrice = searchParams.get('max') || '';
  const hasFilters = Boolean((!lockedBrand && urlBrand) || minPrice || maxPrice);

  // Facets (brand list + price bounds), re-fetched if the locked category changes.
  useEffect(() => {
    let alive = true;
    getProductFilters(category)
      .then((f) => alive && setFacets(f))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [category]);

  // Products whenever the query (or locked category) changes.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    getProducts({
      page,
      limit: PAGE_SIZE,
      sort,
      brand: brandParam,
      minPrice,
      maxPrice,
      category,
      search,
      bike,
      bikeMake,
    })
      .then((d) => alive && setData(d))
      .catch(() => alive && setData({ products: [], total: 0, page: 1, pages: 0 }))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [page, sort, brandParam, minPrice, maxPrice, category, search, bike, bikeMake]);

  /** Patch URL params; any change (except page itself) resets to page 1. */
  const patch = (updates) => {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(updates)) {
      if (v === '' || v == null) next.delete(k);
      else next.set(k, v);
    }
    if (!('page' in updates)) next.delete('page');
    setSearchParams(next, { replace: false });
    if ('page' in updates) window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleBrand = (b) => {
    const set = new Set(selectedBrands);
    set.has(b) ? set.delete(b) : set.add(b);
    patch({ brand: [...set].join(',') });
  };

  const applyPrice = (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    patch({ min: form.get('min')?.toString().trim(), max: form.get('max')?.toString().trim() });
  };

  const clearAll = () => {
    const next = new URLSearchParams(searchParams);
    ['brand', 'min', 'max', 'page'].forEach((k) => next.delete(k));
    setSearchParams(next); // keeps sort, q, and anything the page owns
  };

  const count = data.total;

  return (
    <div className="container section">
      <Helmet>
        <title>{seoTitle}</title>
        {seoDescription && <meta name="description" content={seoDescription} />}
        {canonical && <link rel="canonical" href={canonical} />}
      </Helmet>

      <header className={styles.head}>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.count}>
          {loading ? 'Loading…' : `${count} product${count === 1 ? '' : 's'}`}
        </p>
      </header>

      <div className={styles.layout}>
        {/* ── Filters ── */}
        {showFilters && (
          <div
            className={styles.backdrop}
            onClick={() => setShowFilters(false)}
            aria-hidden="true"
          />
        )}
        <aside className={`${styles.filters} ${showFilters ? styles.filtersOpen : ''}`}>
          <div className={styles.filtersHead}>
            <h2 className={styles.filtersTitle}>Filters</h2>
            {hasFilters && (
              <button type="button" className={styles.clear} onClick={clearAll}>
                Clear all
              </button>
            )}
            <button
              type="button"
              className={styles.closeFilters}
              onClick={() => setShowFilters(false)}
              aria-label="Close filters"
            >
              <X size={18} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>

          {!lockedBrand && facets.brands.length > 0 && (
            <section className={styles.group}>
              <h3 className={styles.groupTitle}>Brand</h3>
              <ul className={styles.brandList}>
                {facets.brands.map((b) => (
                  <li key={b}>
                    <label className={styles.check}>
                      <input
                        type="checkbox"
                        checked={selectedBrands.includes(b)}
                        onChange={() => toggleBrand(b)}
                      />
                      <span>{b}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className={styles.group}>
            <h3 className={styles.groupTitle}>Price (₹)</h3>
            <form className={styles.priceForm} onSubmit={applyPrice}>
              <input
                type="number"
                name="min"
                min="0"
                placeholder={facets.priceRange.min ? String(facets.priceRange.min) : 'Min'}
                defaultValue={minPrice}
                className={styles.priceInput}
                aria-label="Minimum price"
                key={`min-${minPrice}`}
              />
              <span className={styles.dash}>–</span>
              <input
                type="number"
                name="max"
                min="0"
                placeholder={facets.priceRange.max ? String(facets.priceRange.max) : 'Max'}
                defaultValue={maxPrice}
                className={styles.priceInput}
                aria-label="Maximum price"
                key={`max-${maxPrice}`}
              />
              <Button type="submit" variant="outline" size="sm">
                Go
              </Button>
            </form>
            {facets.priceRange.max > 0 && (
              <p className={styles.priceHint}>
                {formatINR(facets.priceRange.min)} – {formatINR(facets.priceRange.max)}
              </p>
            )}
          </section>
        </aside>

        {/* ── Results ── */}
        <div className={styles.results}>
          <div className={styles.toolbar}>
            <Button
              variant="outline"
              size="sm"
              className={styles.filterToggle}
              onClick={() => setShowFilters(true)}
            >
              <SlidersHorizontal size={16} strokeWidth={1.8} aria-hidden="true" />
              Filters
              {hasFilters && <span className={styles.dot} aria-hidden="true" />}
            </Button>

            <label className={styles.sort}>
              <span className="visually-hidden">Sort by</span>
              <select value={sort} onChange={(e) => patch({ sort: e.target.value })}>
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {!loading && count === 0 ? (
            <div className={styles.empty}>
              <p>No products match these filters.</p>
              {hasFilters && (
                <Button variant="outline" size="sm" onClick={clearAll}>
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <ProductGrid products={data.products} loading={loading} count={PAGE_SIZE} />
          )}

          {data.pages > 1 && (
            <nav className={styles.pager} aria-label="Pagination">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => patch({ page: String(page - 1) })}
              >
                Previous
              </Button>
              <span className={styles.pageInfo}>
                Page {page} of {data.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.pages}
                onClick={() => patch({ page: String(page + 1) })}
              >
                Next
              </Button>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
