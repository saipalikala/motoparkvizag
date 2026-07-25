import { useState } from 'react';
import { SlidersHorizontal, X, ChevronDown, ChevronUp, Flame, Award, Sparkles } from 'lucide-react';
import { formatINR } from '@/lib/format.js';
import PriceSlider from '@/components/ui/PriceSlider.jsx';
import ToggleSwitch from '@/components/ui/ToggleSwitch.jsx';
import styles from './FilterPanel.module.css';

// Ids match the real, admin-curated boolean flags the backend filters on
// (productController.js `flags` param) — no decorative-only chips.
const QUICK_FILTERS = [
  { id: 'trending', label: 'Trending', Icon: Flame },
  { id: 'featured', label: 'Best Seller', Icon: Award },
  { id: 'newArrival', label: 'New Arrival', Icon: Sparkles },
];

export default function FilterPanel({
  facets = { brands: [], priceRange: { min: 0, max: 50000 } },
  selectedBrands = [],
  lockedBrand = null,
  toggleBrand,
  activeFlags = [],
  toggleFlag,
  inStockOnly = false,
  toggleInStock,
  draftMin,
  setDraftMin,
  draftMax,
  setDraftMax,
  applyPriceFilter,
  clearAll,
  activeFilterCount = 0,
  hasFilters = false,
  onClose,
  isMobile = false,
}) {
  const [showAllBrands, setShowAllBrands] = useState(false);

  const maxPriceRange = facets.priceRange?.max || 50000;
  const minPriceRange = facets.priceRange?.min || 0;

  const currentMin = draftMin !== '' ? Number(draftMin) : minPriceRange;
  const currentMax = draftMax !== '' ? Number(draftMax) : maxPriceRange;

  const handlePriceSliderChange = ({ min, max }) => {
    setDraftMin(String(min));
    setDraftMax(String(max));
  };

  const visibleBrands = showAllBrands ? facets.brands : facets.brands.slice(0, 6);
  const hiddenBrandsCount = facets.brands.length - 6;

  return (
    <aside
      className={styles.panel}
      aria-label="Product filter control panel"
    >
      {/* Mobile Drag Handle */}
      {isMobile && <div className={styles.dragHandle} aria-hidden="true" />}

      {/* ── Toolbar Header ────────────────────────────────────────── */}
      <div className={styles.toolbar}>
        <div className={styles.titleGroup}>
          <SlidersHorizontal size={18} className={styles.titleIcon} aria-hidden="true" />
          <h2 className={styles.title}>Filters</h2>
          {activeFilterCount > 0 && (
            <span className={styles.badgeCount} aria-label={`${activeFilterCount} filters active`}>
              {activeFilterCount}
            </span>
          )}
        </div>

        <div className={styles.toolbarActions}>
          {hasFilters && (
            <button type="button" className={styles.clearBtn} onClick={clearAll}>
              Clear all
            </button>
          )}
          {onClose && (
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close filters"
            >
              <X size={18} strokeWidth={1.8} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* ── Quick Filters (Primary Chips) — real admin-curated flags ── */}
      <div className={styles.section}>
        <p className={styles.helperText}>Quick curation</p>
        <div className={styles.quickChipsBar}>
          {QUICK_FILTERS.map(({ id, label, Icon }) => {
            const active = activeFlags.includes(id);
            return (
              <button
                key={id}
                type="button"
                className={`${styles.primaryChip} ${active ? styles.primaryChipActive : ''}`}
                onClick={() => toggleFlag(id)}
                aria-pressed={active}
              >
                <Icon size={14} strokeWidth={2} aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Active Filters Bar / Empty State ──────────────────────── */}
      <div className={styles.section}>
        {hasFilters || selectedBrands.length > 0 ? (
          <div className={styles.activeBar}>
            {selectedBrands.map((b) => (
              <button
                key={b}
                type="button"
                className={styles.activeChip}
                onClick={() => toggleBrand(b)}
                title={`Remove ${b} filter`}
              >
                {b} <X size={12} strokeWidth={1.8} aria-hidden="true" />
              </button>
            ))}
            {activeFlags.map((id) => {
              const q = QUICK_FILTERS.find((f) => f.id === id);
              if (!q) return null;
              return (
                <button
                  key={id}
                  type="button"
                  className={styles.activeChip}
                  onClick={() => toggleFlag(id)}
                  title={`Remove ${q.label} filter`}
                >
                  {q.label} <X size={12} strokeWidth={1.8} aria-hidden="true" />
                </button>
              );
            })}
            {inStockOnly && (
              <button
                type="button"
                className={styles.activeChip}
                onClick={toggleInStock}
                title="Remove In Stock Only filter"
              >
                In Stock Only <X size={12} strokeWidth={1.8} aria-hidden="true" />
              </button>
            )}
            {(draftMin !== '' || draftMax !== '') && (
              <button
                type="button"
                className={styles.activeChip}
                onClick={() => {
                  setDraftMin('');
                  setDraftMax('');
                  applyPriceFilter();
                }}
              >
                {formatINR(currentMin)} – {formatINR(currentMax)} <X size={12} strokeWidth={1.8} aria-hidden="true" />
              </button>
            )}
          </div>
        ) : (
          <p className={styles.emptyState}>Showing all products</p>
        )}
      </div>

      {/* ── Hero Price Range Section ──────────────────────────────── */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <h3 className={styles.groupTitle}>Price Range</h3>
          <p className={styles.helperText}>Find products within your budget</p>
        </div>

        <div className={styles.priceHeroReadout}>
          {formatINR(currentMin)} — {formatINR(currentMax)}
        </div>

        <div className={styles.sliderContainer}>
          <PriceSlider
            min={minPriceRange}
            max={maxPriceRange}
            minVal={currentMin}
            maxVal={currentMax}
            onChange={handlePriceSliderChange}
          />
        </div>
      </div>

      {/* ── Brand Selection (Secondary Chips) ─────────────────────── */}
      {!lockedBrand && facets.brands.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <h3 className={styles.groupTitle}>Brand</h3>
            <p className={styles.helperText}>Choose your favorite brands</p>
          </div>

          <div className={styles.chipGrid} role="group" aria-label="Filter by brand">
            {visibleBrands.map((b) => {
              const active = selectedBrands.includes(b);
              return (
                <button
                  key={b}
                  type="button"
                  className={`${styles.secondaryChip} ${active ? styles.secondaryChipActive : ''}`}
                  onClick={() => toggleBrand(b)}
                  aria-pressed={active}
                >
                  {b}
                </button>
              );
            })}
          </div>

          {facets.brands.length > 6 && (
            <button
              type="button"
              className={styles.showMoreBtn}
              onClick={() => setShowAllBrands(!showAllBrands)}
            >
              {showAllBrands ? (
                <>Show less <ChevronUp size={14} strokeWidth={1.8} aria-hidden="true" /></>
              ) : (
                <>+ Show {hiddenBrandsCount} more <ChevronDown size={14} strokeWidth={1.8} aria-hidden="true" /></>
              )}
            </button>
          )}
        </div>
      )}

      {/* ── Availability — real inStock filter, no fake dimensions ──── */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <h3 className={styles.groupTitle}>Availability</h3>
        </div>
        <div className={styles.toggleStack}>
          <ToggleSwitch label="In Stock Only" checked={inStockOnly} onChange={toggleInStock} />
        </div>
      </div>

      {/* ── Floating Control Dock (Sticky Action Footer) ───────────── */}
      <div className={styles.controlDock}>
        <button
          type="button"
          className={styles.applyCta}
          onClick={applyPriceFilter}
        >
          {activeFilterCount > 0 ? `Apply (${activeFilterCount})` : 'Show Results'}
        </button>

        {hasFilters && (
          <button
            type="button"
            className={styles.resetBtn}
            onClick={clearAll}
          >
            Reset
          </button>
        )}
      </div>
    </aside>
  );
}
