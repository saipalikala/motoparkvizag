/* ================================================
   File: src/components/SearchOverlay/SearchOverlay.jsx

   FIXES APPLIED:
   ✅ Debounce on client-side search (300ms)
      Previously: .filter() ran synchronously on EVERY
      keystroke. With 200+ products in context this is
      a blocking main-thread operation on each character.
      Now: filter only fires 300ms after user stops typing.
   ✅ getImage replaced with getProductImage from imageUrl.js
      Previously: SearchOverlay duplicated the exact same
      URL resolution logic that imageUrl.js already has.
      Now uses the shared utility — single source of truth,
      and images get Cloudinary optimization automatically.
   ✅ setOpen added to keyboard useEffect dependency array
      Previously: stale closure — if setOpen identity ever
      changed, the ESC key handler would silently stop
      working. Fixed by including it in deps (stable from
      useState so no re-subscription cost).

   NOT CHANGED:
   ✗ API-based search rejected — the suggested fix swapped
     client-side filtering for a fetch() to /api/products/
     search on every debounced keystroke. Products are
     ALREADY in context memory. A network round trip (even
     debounced) is always slower than an in-memory .filter().
     Client-side search is the correct approach here.
================================================ */
import { useState, useEffect, useRef, useCallback } from "react";
import { useProducts } from "@/context/ProductContext";
import { useNavigate } from "react-router-dom";
import { getProductImage } from "@/utils/imageUrl";
import "./SearchOverlay.css";

/* ─── ICONS ─── */
const SearchIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
    </svg>
);

const CloseIcon = () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M2 2l8 8M10 2l-8 8" />
    </svg>
);

const ChevronRight = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18l6-6-6-6" />
    </svg>
);

/* ── Debounce hook ───────────────────────────────
   Returns a value that only updates after `delay`ms
   of inactivity. Prevents expensive .filter() from
   running on every single keypress. */
function useDebounce(value, delay = 300) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debounced;
}

/* ── Category label helper ───────────────────────
   Handles both string and object category shapes. */
const categoryLabel = (p) => {
    if (!p.category) return null;
    if (typeof p.category === "object") return p.category?.name ?? null;
    if (p.category.length === 24) return null; // raw ObjectId — skip
    return p.category;
};

const SearchOverlay = ({ open, setOpen }) => {
    const { products } = useProducts();
    const navigate     = useNavigate();
    const inputRef     = useRef(null);

    const [query,   setQuery]   = useState("");
    const [results, setResults] = useState([]);
    const [focused, setFocused] = useState(-1);

    // ── Debounced query — search fires 300ms after last keystroke
    const debouncedQuery = useDebounce(query, 300);

    /* ── SEARCH LOGIC — runs on debounced value only ── */
    useEffect(() => {
        if (!debouncedQuery.trim()) {
            setResults([]);
            setFocused(-1);
            return;
        }

        const q = debouncedQuery.toLowerCase();

        const exact = products.filter(p =>
            p.name.toLowerCase().includes(q)
        );
        const related = products.filter(p =>
            p.brand?.toLowerCase().includes(q) ||
            (typeof p.category === "string" && p.category.toLowerCase().includes(q))
        );

        const combined = [
            ...exact,
            ...related.filter(r => !exact.includes(r)),
        ].slice(0, 7);

        setResults(combined);
        setFocused(-1);
    }, [debouncedQuery, products]);

    /* ── AUTO FOCUS on open/close ── */
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 60);
        } else {
            setQuery("");
            setResults([]);
            setFocused(-1);
        }
    }, [open]);

    /* ── KEYBOARD NAVIGATION ── */
    useEffect(() => {
        const onKey = (e) => {
            if (!open) return;
            if (e.key === "Escape") {
                setOpen(false);
                return;
            }
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setFocused(f => Math.min(f + 1, results.length - 1));
            }
            if (e.key === "ArrowUp") {
                e.preventDefault();
                setFocused(f => Math.max(f - 1, -1));
            }
            if (e.key === "Enter" && focused >= 0) {
                goToProduct(results[focused]._id);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    // setOpen added to deps — was a stale closure bug before
    }, [open, focused, results, setOpen]);

    const goToProduct = useCallback((id) => {
        navigate(`/product/${id}`);
        setOpen(false);
        setQuery("");
    }, [navigate, setOpen]);

    // ── trending / popular fallback when no query ──
    const trending = products.filter(p => p.trending).slice(0, 4);

    if (!open) return null;

    return (
        <div className="so-overlay" onClick={() => setOpen(false)}>

            {/* MODAL */}
            <div className="so-modal" onClick={e => e.stopPropagation()}>

                {/* SEARCH BAR */}
                <div className="so-bar">
                    <div className="so-bar-icon"><SearchIcon /></div>
                    <input
                        ref={inputRef}
                        type="text"
                        className="so-input"
                        placeholder="Search helmets, jackets, gloves…"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                    />
                    {query && (
                        <button className="so-clear" onClick={() => setQuery("")} aria-label="Clear">
                            <CloseIcon />
                        </button>
                    )}
                    <button className="so-close-btn" onClick={() => setOpen(false)} aria-label="Close search">
                        <span>ESC</span>
                    </button>
                </div>

                {/* RESULTS */}
                <div className="so-body">

                    {/* SEARCH RESULTS */}
                    {query && results.length > 0 && (
                        <div className="so-results">
                            <p className="so-results-label">
                                {results.length} result{results.length !== 1 ? "s" : ""}
                            </p>
                            {results.map((product, i) => {
                                // getProductImage: uses imageUrl.js utility —
                                // handles variant shape, applies Cloudinary
                                // transforms (f_auto, q_auto, w_400) automatically
                                const image = getProductImage(product);
                                const cat   = categoryLabel(product);
                                return (
                                    <div
                                        key={product._id}
                                        className={`so-item ${focused === i ? "so-item--focused" : ""}`}
                                        onClick={() => goToProduct(product._id)}
                                        onMouseEnter={() => setFocused(i)}
                                        role="option"
                                        aria-selected={focused === i}
                                    >
                                        <div className="so-item-img">
                                            {image
                                                ? <img src={image} alt={product.name} />
                                                : <div className="so-item-img-ph" />
                                            }
                                        </div>
                                        <div className="so-item-info">
                                            <span className="so-item-name">{product.name}</span>
                                            <div className="so-item-meta">
                                                {product.brand && <span className="so-item-brand">{product.brand}</span>}
                                                {cat            && <span className="so-item-cat">{cat}</span>}
                                            </div>
                                        </div>
                                        <div className="so-item-right">
                                            <span className="so-item-price">
                                                ₹{product.price?.toLocaleString("en-IN")}
                                            </span>
                                            <ChevronRight />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* NO RESULTS */}
                    {query && results.length === 0 && (
                        <div className="so-empty">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
                                stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"
                                strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" />
                                <path d="M21 21l-4.35-4.35" />
                            </svg>
                            <p>No results for <strong>"{query}"</strong></p>
                            <span>Try a different keyword</span>
                        </div>
                    )}

                    {/* TRENDING — shown when no query */}
                    {!query && trending.length > 0 && (
                        <div className="so-trending">
                            <p className="so-results-label">Trending</p>
                            {trending.map((product, i) => {
                                const image = getProductImage(product);
                                return (
                                    <div
                                        key={product._id}
                                        className={`so-item ${focused === i ? "so-item--focused" : ""}`}
                                        onClick={() => goToProduct(product._id)}
                                        onMouseEnter={() => setFocused(i)}
                                    >
                                        <div className="so-item-img">
                                            {image
                                                ? <img src={image} alt={product.name} />
                                                : <div className="so-item-img-ph" />
                                            }
                                        </div>
                                        <div className="so-item-info">
                                            <span className="so-item-name">{product.name}</span>
                                            {product.brand && (
                                                <span className="so-item-brand">{product.brand}</span>
                                            )}
                                        </div>
                                        <div className="so-item-right">
                                            <span className="so-item-price">
                                                ₹{product.price?.toLocaleString("en-IN")}
                                            </span>
                                            <ChevronRight />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* KEYBOARD HINTS */}
                    <div className="so-hints">
                        <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
                        <span><kbd>↵</kbd> open</span>
                        <span><kbd>ESC</kbd> close</span>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default SearchOverlay;