import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { SlidersHorizontal } from 'lucide-react';
import ProductGrid from '@/components/commerce/ProductGrid.jsx';
import Button from '@/components/ui/Button.jsx';
import FilterPanel from '@/components/commerce/FilterPanel.jsx';
import { getProducts, getProductFilters } from '@/services/products.js';
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
 *
 * ─── Mobile filter experience ────────────────────────────────────────────────
 *
 * On mobile (< 900px) the filter panel becomes a full-width bottom sheet:
 *   • Entrance: translateY(100%) → 0, 300ms, --ease-out (MotoPark glide)
 *   • Backdrop tap or Escape key dismisses the sheet
 *   • Drag handle signals dismissibility (decorative, no drag-to-dismiss gesture)
 *   • Brand filter: pill chips with aria-pressed (48px touch targets)
 *   • Price filter: stacked labelled inputs; committed via the sticky footer
 *   • Sticky footer: "Clear All" (ghost) + "Apply Filters" (primary orange, 52px)
 *
 * Price draft state: price inputs update local state only; the URL is patched
 * when "Apply Filters" is tapped. Brand chips still patch the URL immediately
 * (same as desktop) — consistent with the original toggleBrand behaviour.
 *
 * Desktop: persistent 260px sidebar, inline "Apply" button for price, "Clear all"
 * in the header — behaviour identical to the previous implementation.
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

  // ── URL-derived filter state ───────────────────────────────────────────────
  const sort      = searchParams.get('sort') || '';
  const page      = Number(searchParams.get('page')) || 1;
  const urlBrand  = searchParams.get('brand') || '';
  // A locked brand (BrandPage) drives the query and hides the brand facet.
  const brandParam     = lockedBrand || urlBrand;
  const selectedBrands = lockedBrand ? [] : urlBrand ? urlBrand.split(',') : [];
  const minPrice   = searchParams.get('min') || '';
  const maxPrice   = searchParams.get('max') || '';
  const hasFilters = Boolean((!lockedBrand && urlBrand) || minPrice || maxPrice);

  // ── Draft price state ──────────────────────────────────────────────────────
  // Mobile: price is committed only when "Apply Filters" is tapped.
  // Desktop: committed immediately via the form "Apply" button.
  // URL params are the source of truth; drafts are the live input values.
  const [draftMin, setDraftMin] = useState(minPrice);
  const [draftMax, setDraftMax] = useState(maxPrice);

  // Sync drafts when URL params change externally (back/forward, clearAll).
  useEffect(() => {
    setDraftMin(minPrice);
    setDraftMax(maxPrice);
  }, [minPrice, maxPrice]);

  // ── Escape key to close the bottom sheet ──────────────────────────────────
  useEffect(() => {
    if (!showFilters) return;
    const onKey = (e) => { if (e.key === 'Escape') setShowFilters(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showFilters]);

  // ── Facets ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    getProductFilters(category)
      .then((f) => alive && setFacets(f))
      .catch(() => {});
    return () => { alive = false; };
  }, [category]);

  // ── Products ───────────────────────────────────────────────────────────────
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
    return () => { alive = false; };
  }, [page, sort, brandParam, minPrice, maxPrice, category, search, bike, bikeMake]);

  // ── URL patch helper ───────────────────────────────────────────────────────
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

  // ── Filter actions ─────────────────────────────────────────────────────────

  const toggleBrand = (b) => {
    const set = new Set(selectedBrands);
    if (set.has(b)) {
      set.delete(b);
    } else {
      set.add(b);
    }
    patch({ brand: [...set].join(',') });
  };

  /** Apply price using the current draft values (desktop form + mobile footer). */
  const applyPriceFilter = () => {
    patch({ min: draftMin.trim(), max: draftMax.trim() });
  };

  const clearAll = () => {
    const next = new URLSearchParams(searchParams);
    ['brand', 'min', 'max', 'page'].forEach((k) => next.delete(k));
    setSearchParams(next); // keeps sort, q, and anything the page owns
    // Reset drafts immediately for instant UI feedback (URL sync via useEffect
    // arrives one render later when URL params propagate).
    setDraftMin('');
    setDraftMax('');
  };

  // Count of applied filter dimensions — drives the count badge in the header
  // and the "Apply (n)" label on the mobile footer button.
  const activeFilterCount =
    selectedBrands.length + (minPrice ? 1 : 0) + (maxPrice ? 1 : 0);

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

        {/* ── Backdrop — closes sheet on tap ── */}
        {showFilters && (
          <div
            className={styles.backdrop}
            onClick={() => setShowFilters(false)}
            aria-hidden="true"
          />
        )}

        {/* ── Filter Panel (shared component for mobile sheet & desktop sidebar) ── */}
        <div
          id="filter-drawer"
          className={`${styles.filtersWrapper} ${showFilters ? styles.filtersOpen : ''}`}
        >
          <FilterPanel
            facets={facets}
            selectedBrands={selectedBrands}
            lockedBrand={lockedBrand}
            toggleBrand={toggleBrand}
            draftMin={draftMin}
            setDraftMin={setDraftMin}
            draftMax={draftMax}
            setDraftMax={setDraftMax}
            applyPriceFilter={applyPriceFilter}
            clearAll={clearAll}
            activeFilterCount={activeFilterCount}
            hasFilters={hasFilters}
            onClose={() => setShowFilters(false)}
            isMobile={showFilters}
          />
        </div>

        {/* ── Results ── */}
        <div className={styles.results}>
          <div className={styles.toolbar}>
            <Button
              variant="outline"
              size="sm"
              className={styles.filterToggle}
              onClick={() => setShowFilters(true)}
              aria-expanded={showFilters}
              aria-controls="filter-drawer"
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
