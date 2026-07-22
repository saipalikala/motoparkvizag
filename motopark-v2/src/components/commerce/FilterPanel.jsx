import { useState } from 'react';
import { SlidersHorizontal, X, ChevronDown, ChevronUp } from 'lucide-react';
import { formatINR } from '@/lib/format.js';
import PriceSlider from '@/components/ui/PriceSlider.jsx';
import ToggleSwitch from '@/components/ui/ToggleSwitch.jsx';
import styles from './FilterPanel.module.css';

const QUICK_FILTERS = [
  { id: 'trending', label: '🔥 Trending' },
  { id: 'bestseller', label: '⭐ Best Seller' },
  { id: 'fast_delivery', label: '⚡ Fast Delivery' },
  { id: 'new_arrival', label: '✨ New Arrival' },
  { id: 'premium', label: '👑 Premium' },
];

const RATINGS = [
  { id: '5star', label: '★★★★★ 5.0' },
  { id: '4star', label: '★★★★+ 4.0+' },
  { id: '3star', label: '★★★+ 3.0+' },
];

export default function FilterPanel({
  facets = { brands: [], priceRange: { min: 0, max: 50000 } },
  selectedBrands = [],
  lockedBrand = null,
  toggleBrand,
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [quickActive, setQuickActive] = useState([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [fastDeliveryOnly, setFastDeliveryOnly] = useState(false);
  const [selectedRating, setSelectedRating] = useState(null);

  const maxPriceRange = facets.priceRange?.max || 50000;
  const minPriceRange = facets.priceRange?.min || 0;

  const currentMin = draftMin !== '' ? Number(draftMin) : minPriceRange;
  const currentMax = draftMax !== '' ? Number(draftMax) : maxPriceRange;

  const toggleQuickFilter = (id) => {
    setQuickActive((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

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

      {/* ── Quick Filters (Primary Chips) ─────────────────────────── */}
      <div className={styles.section}>
        <p className={styles.helperText}>Quick curation</p>
        <div className={styles.quickChipsBar}>
          {QUICK_FILTERS.map((q) => {
            const active = quickActive.includes(q.id);
            return (
              <button
                key={q.id}
                type="button"
                className={`${styles.primaryChip} ${active ? styles.primaryChipActive : ''}`}
                onClick={() => toggleQuickFilter(q.id)}
                aria-pressed={active}
              >
                {q.label}
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
                {b} <X size={12} aria-hidden="true" />
              </button>
            ))}
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
                {formatINR(currentMin)} – {formatINR(currentMax)} <X size={12} aria-hidden="true" />
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
                <>Show less <ChevronUp size={14} aria-hidden="true" /></>
              ) : (
                <>+ Show {hiddenBrandsCount} more <ChevronDown size={14} aria-hidden="true" /></>
              )}
            </button>
          )}
        </div>
      )}

      {/* ── Advanced Filters Expander (Progressive Disclosure) ──────── */}
      <div className={styles.section}>
        <button
          type="button"
          className={styles.expanderBtn}
          onClick={() => setShowAdvanced(!showAdvanced)}
          aria-expanded={showAdvanced}
        >
          <span>Advanced Filters (Ratings & Availability)</span>
          {showAdvanced ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
        </button>

        {showAdvanced && (
          <div className={styles.advancedStream}>
            {/* Availability Toggles */}
            <div className={styles.subGroup}>
              <p className={styles.helperText}>Availability & Delivery</p>
              <div className={styles.toggleStack}>
                <ToggleSwitch
                  label="In Stock Only"
                  checked={inStockOnly}
                  onChange={setInStockOnly}
                />
                <ToggleSwitch
                  label="Fast Delivery"
                  checked={fastDeliveryOnly}
                  onChange={setFastDeliveryOnly}
                />
              </div>
            </div>

            {/* Ratings Utility Chips */}
            <div className={styles.subGroup}>
              <p className={styles.helperText}>Customer Rating</p>
              <div className={styles.chipGrid}>
                {RATINGS.map((r) => {
                  const active = selectedRating === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      className={`${styles.utilityChip} ${active ? styles.utilityChipActive : ''}`}
                      onClick={() => setSelectedRating(active ? null : r.id)}
                      aria-pressed={active}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
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
