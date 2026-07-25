import { useState, useRef, useEffect, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Clock, X } from 'lucide-react';
import { aiSearch } from '@/services/products.js';
import { formatINR } from '@/lib/format.js';
import { cloudinaryUrl } from '@/lib/image.js';
import styles from './SearchPreview.module.css';

const RECENT_KEY = 'mp_recent_searches';
const MAX_RECENT = 5;

function getRecent() {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function addRecent(term) {
  const trimmed = term.trim();
  if (!trimmed) return;
  try {
    const list = [trimmed, ...getRecent().filter((t) => t.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // localStorage unavailable (private mode, quota) — recent searches just won't persist.
  }
}

/**
 * SearchPreview — a real search input plus a debounced live-preview dropdown
 * (top 5 semantic matches via the existing aiSearch(), recent searches,
 * "see all" link, arrow-key + Enter navigation). Submitting still navigates
 * to the full /search page exactly as before — this only adds a faster
 * preview in front of that unchanged flow. Mounted once for desktop (its own
 * chrome) and once inside the existing mobile search bar (chrome supplied
 * by the caller via className props, so the mobile bar's look is unchanged).
 */
export default function SearchPreview({
  inputRef,
  autoFocus = false,
  tabIndex,
  ariaHidden,
  placeholder = 'Search MotoPark…',
  onNavigate,
  wrapClassName = '',
  formClassName = '',
  inputClassName = '',
  iconClassName = '',
  expandable = true,
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | ok | empty
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(!expandable);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recent, setRecent] = useState([]);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);
  const internalInputRef = useRef(null);
  const actualInputRef = inputRef || internalInputRef;
  const navigate = useNavigate();
  const listboxId = useId();

  useEffect(() => {
    if (open) setRecent(getRecent());
  }, [open]);

  useEffect(() => {
    window.clearTimeout(debounceRef.current);
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setStatus('idle');
      return undefined;
    }
    setStatus('loading');
    debounceRef.current = window.setTimeout(() => {
      aiSearch(term, { limit: 5 })
        .then((products) => {
          setResults(products);
          setStatus(products.length ? 'ok' : 'empty');
        })
        .catch(() => setStatus('empty'));
    }, 300);
    return () => window.clearTimeout(debounceRef.current);
  }, [query]);

  // Handle click outside to collapse search bar if expandable
  useEffect(() => {
    const onClick = (e) => {
      if (!containerRef.current?.contains(e.target)) {
        setOpen(false);
        if (expandable && !query.trim()) {
          setExpanded(false);
        }
      }
    };
    document.addEventListener('pointerdown', onClick);
    return () => document.removeEventListener('pointerdown', onClick);
  }, [expandable, query]);

  const handleExpand = () => {
    setExpanded(true);
    setTimeout(() => {
      actualInputRef.current?.focus();
    }, 50);
  };

  const close = () => {
    setOpen(false);
    setActiveIndex(-1);
    if (expandable && !query.trim()) {
      setExpanded(false);
    }
  };

  const goToResults = (term) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    addRecent(trimmed);
    close();
    onNavigate?.();
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const goToProduct = (product) => {
    addRecent(query.trim());
    close();
    onNavigate?.();
    navigate(product.url);
  };

  const showingRecent = query.trim().length < 2;
  const dropdownItems = showingRecent ? recent : results;

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      close();
      if (expandable) setExpanded(false);
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, dropdownItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIndex >= 0 && dropdownItems[activeIndex] != null) {
      e.preventDefault();
      if (showingRecent) goToResults(dropdownItems[activeIndex]);
      else goToProduct(dropdownItems[activeIndex]);
    }
  };

  return (
    <div className={`${styles.wrap} ${wrapClassName}`} ref={containerRef}>
      {expandable && !expanded ? (
        <button
          type="button"
          className={styles.iconTrigger}
          onClick={handleExpand}
          aria-label="Open search"
        >
          <Search size={20} strokeWidth={1.8} />
        </button>
      ) : (
        <form
          className={formClassName || styles.whiteForm}
          role="search"
          aria-hidden={ariaHidden}
          onSubmit={(e) => {
            e.preventDefault();
            goToResults(query);
          }}
        >
          <Search size={18} strokeWidth={2} className={iconClassName || styles.whiteIcon} aria-hidden="true" />
          <input
            ref={actualInputRef}
            className={inputClassName || styles.whiteInput}
            type="search"
            name="q"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(-1);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            aria-label="Search products"
            autoComplete="off"
            autoFocus={autoFocus || expandable}
            tabIndex={tabIndex}
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
          />
          {query ? (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={() => {
                setQuery('');
                setResults([]);
                setStatus('idle');
                actualInputRef.current?.focus();
              }}
              aria-label="Clear search"
            >
              <X size={14} strokeWidth={2} aria-hidden="true" />
            </button>
          ) : expandable ? (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={() => {
                setExpanded(false);
                setOpen(false);
              }}
              aria-label="Close search bar"
            >
              <X size={14} strokeWidth={2} aria-hidden="true" />
            </button>
          ) : null}
        </form>
      )}

      {open && (
        <div className={styles.dropdown} id={listboxId} role="listbox">
          {showingRecent ? (
            recent.length > 0 ? (
              <>
                <p className={styles.dropdownLabel}>Recent searches</p>
                {recent.map((term, i) => (
                  <button
                    key={term}
                    type="button"
                    role="option"
                    aria-selected={activeIndex === i}
                    className={`${styles.recentRow} ${activeIndex === i ? styles.rowActive : ''}`}
                    onClick={() => goToResults(term)}
                  >
                    <Clock size={14} strokeWidth={1.8} aria-hidden="true" />
                    {term}
                  </button>
                ))}
              </>
            ) : (
              <p className={styles.dropdownHint}>Type at least 2 characters to search…</p>
            )
          ) : status === 'loading' ? (
            <p className={styles.dropdownHint}>Searching…</p>
          ) : status === 'empty' ? (
            <div className={styles.emptyState}>
              <p>No matches for &quot;{query}&quot;.</p>
              <button type="button" className={styles.seeAllLink} onClick={() => goToResults(query)}>
                See all results for &quot;{query}&quot; →
              </button>
            </div>
          ) : (
            <>
              {results.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  role="option"
                  aria-selected={activeIndex === i}
                  className={`${styles.resultRow} ${activeIndex === i ? styles.rowActive : ''}`}
                  onClick={() => goToProduct(p)}
                >
                  <span className={styles.resultThumb}>
                    {p.image ? (
                      <img src={cloudinaryUrl(p.image, { w: 80 })} alt="" width="40" height="40" />
                    ) : (
                      <span className={styles.resultThumbFallback}>MP</span>
                    )}
                  </span>
                  <span className={styles.resultText}>
                    <span className={styles.resultName}>{p.name}</span>
                    <span className={styles.resultPrice}>{formatINR(p.priceINR)}</span>
                  </span>
                </button>
              ))}
              <button type="button" className={styles.seeAllLink} onClick={() => goToResults(query)}>
                See all results for &quot;{query}&quot; →
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
