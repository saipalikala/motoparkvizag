import { useState, useEffect, useRef } from "react";
import { useProducts } from "@/context/ProductContext";
import { useNavigate } from "react-router-dom";
import "./SearchOverlay.css";

const API = "http://localhost:5000";

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

const SearchOverlay = ({ open, setOpen }) => {
    const { products } = useProducts();
    const navigate = useNavigate();
    const inputRef = useRef(null);

    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [focused, setFocused] = useState(-1);

    /* ── SEARCH LOGIC ── */
    useEffect(() => {
        if (!query.trim()) { setResults([]); setFocused(-1); return; }

        const q = query.toLowerCase();

        const exact = products.filter(p => p.name.toLowerCase().includes(q));
        const related = products.filter(p =>
            p.brand?.toLowerCase().includes(q) ||
            (typeof p.category === "string" && p.category.toLowerCase().includes(q))
        );

        const combined = [
            ...exact,
            ...related.filter(r => !exact.includes(r))
        ].slice(0, 7);

        setResults(combined);
        setFocused(-1);
    }, [query, products]);

    /* ── AUTO FOCUS ── */
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
            if (e.key === "Escape") { setOpen(false); return; }
            if (e.key === "ArrowDown") { e.preventDefault(); setFocused(f => Math.min(f + 1, results.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setFocused(f => Math.max(f - 1, -1)); }
            if (e.key === "Enter" && focused >= 0) {
                goToProduct(results[focused]._id);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, focused, results]);

    const goToProduct = (id) => {
        navigate(`/product/${id}`);
        setOpen(false);
        setQuery("");
    };

    const getImage = (product) => {
        const raw = product?.variants?.[0]?.images?.[0] || product?.images?.[0];
        if (!raw) return null;
        return raw.startsWith("http") ? raw : `${API}${raw.startsWith("/") ? "" : "/"}${raw}`;
    };

    const categoryLabel = (p) => {
        if (!p.category) return null;
        if (typeof p.category === "object") return p.category?.name;
        if (p.category.length === 24) return null;
        return p.category;
    };

    /* trending / popular fallback when no query */
    const trending = products.filter(p => p.trending).slice(0, 4);

    if (!open) return null;

    return (
        <div className="so-overlay" onClick={() => setOpen(false)}>

            {/* MODAL */}
            <div className="so-modal" onClick={e => e.stopPropagation()}>

                {/* SEARCH BAR */}
                <div className="so-bar">
                    <div className="so-bar-icon">
                        <SearchIcon />
                    </div>
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
                            <p className="so-results-label">{results.length} result{results.length !== 1 ? "s" : ""}</p>
                            {results.map((product, i) => {
                                const image = getImage(product);
                                const cat = categoryLabel(product);
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
                                                {cat && <span className="so-item-cat">{cat}</span>}
                                            </div>
                                        </div>
                                        <div className="so-item-right">
                                            <span className="so-item-price">₹{product.price?.toLocaleString("en-IN")}</span>
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
                                stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
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
                                const image = getImage(product);
                                return (
                                    <div key={product._id}
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
                                            <span className="so-item-price">₹{product.price?.toLocaleString("en-IN")}</span>
                                            <ChevronRight />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* SHORTCUTS HINT */}
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