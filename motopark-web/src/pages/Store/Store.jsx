import PageTransition from "../../components/PageTransition/PageTransition";
import { useProducts } from "@/context/ProductContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "./Store.css";

// ✅ Fixed — use central API config, not raw env var
import { API as API_BASE } from "@/config/api";

/* ─── ICONS ─── */
const HeartIcon = ({ filled }) => (
    <svg width="15" height="15" viewBox="0 0 24 24"
        fill={filled ? "#ff6b3d" : "none"}
        stroke={filled ? "#ff6b3d" : "currentColor"}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
);
const CartIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
);
const SearchIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
    </svg>
);
const GridIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
);
const ListIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="4" rx="1" />
        <rect x="3" y="11" width="18" height="4" rx="1" />
        <rect x="3" y="18" width="18" height="4" rx="1" />
    </svg>
);
const FilterIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="8" y1="12" x2="16" y2="12" />
        <line x1="11" y1="18" x2="13" y2="18" />
    </svg>
);
const XIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);
const CheckIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);
const ChevronIcon = ({ open }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.25s ease" }}>
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

/* ─── SKELETON ─── */
const SkeletonCard = () => (
    <div className="store-skeleton">
        <div className="sk-image" />
        <div className="sk-body">
            <div className="sk-line sk-line--title" />
            <div className="sk-line sk-line--sub" />
            <div className="sk-line sk-line--price" />
        </div>
    </div>
);

/* ─── PRODUCT CARD ─── */
const StoreCard = ({ product, view, index }) => {
    const { addToCart, cartItems } = useCart();
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
    const navigate = useNavigate();

    const inCart = cartItems.some(i => i._id === product._id);
    const wishlisted = isInWishlist(product._id);

    const rawImage = product?.variants?.[0]?.images?.[0] || product?.images?.[0];
    const image = rawImage
        ? rawImage.startsWith("http") ? rawImage : `${API_BASE}${rawImage.startsWith("/") ? "" : "/"}${rawImage}`
        : null;

    const categoryLabel = product.category && typeof product.category === "object"
        ? product.category?.name
        : (product.category?.length === 24 ? null : product.category);

    const handleClick = () => navigate(`/product/${product._id}`);
    const handleCart = (e) => { e.stopPropagation(); addToCart(product); };
    const handleWishlist = (e) => {
        e.stopPropagation();
        wishlisted ? removeFromWishlist(product._id) : addToWishlist(product);
    };

    if (view === "list") return (
        <div className="store-card store-card--list"
            style={{ animationDelay: `${Math.min(index * 0.04, 0.3)}s` }}
            onClick={handleClick} role="button" tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && handleClick()}>
            <div className="store-card-list-img">
                {image
                    ? <img src={image} alt={product.name} className="store-img" />
                    : <div className="store-img-placeholder" />}
            </div>
            <div className="store-card-list-body">
                <div>
                    {categoryLabel && <span className="store-badge">{categoryLabel}</span>}
                    <h3 className="store-name">{product.name}</h3>
                    {product.brand && <p className="store-brand">{product.brand}</p>}
                    {product.description && (
                        <p className="store-desc">
                            {product.description.slice(0, 110)}{product.description.length > 110 ? "…" : ""}
                        </p>
                    )}
                </div>
                <div className="store-list-footer">
                    <span className="store-price">₹{product.price?.toLocaleString("en-IN")}</span>
                    <div className="store-card-actions">
                        <button className={`store-wish-btn ${wishlisted ? "store-wish-btn--active" : ""}`}
                            onClick={handleWishlist} aria-label="Wishlist">
                            <HeartIcon filled={wishlisted} />
                        </button>
                        <button className={`store-cart-btn ${inCart ? "store-cart-btn--added" : ""}`}
                            onClick={handleCart} aria-label="Add to cart">
                            {inCart ? <><CheckIcon /><span>Added</span></> : <><CartIcon /><span>Add to Cart</span></>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="store-card store-card--grid"
            style={{ animationDelay: `${Math.min(index * 0.04, 0.28)}s` }}
            onClick={handleClick} role="button" tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && handleClick()}>
            <div className="store-card-accent" />
            <div className="store-card-top">
                {categoryLabel ? <span className="store-badge">{categoryLabel}</span> : <span />}
                <button className={`store-wish-btn ${wishlisted ? "store-wish-btn--active" : ""}`}
                    onClick={handleWishlist} aria-label="Wishlist">
                    <HeartIcon filled={wishlisted} />
                </button>
            </div>
            <div className="store-img-wrap">
                {image
                    ? <img src={image} alt={product.name} className="store-img" />
                    : <div className="store-img-placeholder" />}
            </div>
            <div className="store-card-info">
                <h3 className="store-name">{product.name}</h3>
                {product.brand && <p className="store-brand">{product.brand}</p>}
                <div className="store-card-footer">
                    <span className="store-price">₹{product.price?.toLocaleString("en-IN")}</span>
                    <button className={`store-cart-btn store-cart-btn--icon ${inCart ? "store-cart-btn--added" : ""}`}
                        onClick={handleCart} aria-label="Add to cart">
                        {inCart ? <CheckIcon /> : <CartIcon />}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ─── FILTER SECTION ─── */
const FilterSection = ({ title, children, defaultOpen = true }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="sf-section">
            <button className="sf-section-toggle" onClick={() => setOpen(o => !o)}>
                <span>{title}</span>
                <ChevronIcon open={open} />
            </button>
            {open && <div className="sf-section-body">{children}</div>}
        </div>
    );
};

/* ─── FILTER PANEL ─── */
const FilterPanel = ({ products, activeFilters, onChange, onReset, isMobile, onClose }) => {
    const brands = [...new Set(products.map(p => p.brand).filter(Boolean))].sort();
    const sizes = [...new Set(products.flatMap(p =>
        p.variants?.flatMap(v => v.sizes?.map(s => s.size) || []) || []
    ).filter(Boolean))].sort();
    const colors = [...new Set(products.flatMap(p =>
        p.variants?.map(v => ({ hex: v.color, name: v.colorName || v.color })) || []
    ).filter(c => c.hex))];
    const uniqueColors = colors.filter((c, i, arr) => arr.findIndex(x => x.hex === c.hex) === i);

    const toggle = (key, val) => {
        onChange(prev => {
            const cur = prev[key];
            if (cur === val) {
                const next = { ...prev };
                delete next[key];
                return next;
            }
            return { ...prev, [key]: val };
        });
    };

    const hasFilters = Object.keys(activeFilters).some(k => k !== "sort");

    return (
        <div className={`sf-panel ${isMobile ? "sf-panel--mobile" : ""}`}>
            {isMobile && (
                <div className="sf-mobile-header">
                    <span className="sf-mobile-title">Filters</span>
                    <button className="sf-mobile-close" onClick={onClose} aria-label="Close filters">
                        <XIcon />
                    </button>
                </div>
            )}

            {!isMobile && (
                <div className="sf-header">
                    <span className="sf-header-title">FILTERS</span>
                    {hasFilters && (
                        <button className="sf-reset-btn" onClick={onReset}>Reset all</button>
                    )}
                </div>
            )}

            {!hasFilters && !isMobile && (
                <p className="sf-no-filters">No filters applied</p>
            )}

            {brands.length > 0 && (
                <FilterSection title="Brand">
                    <div className="sf-check-list">
                        {brands.map(b => (
                            <label key={b} className="sf-check-row">
                                <input
                                    type="checkbox"
                                    className="sf-checkbox"
                                    checked={activeFilters.brand === b}
                                    onChange={() => toggle("brand", b)}
                                />
                                <span className="sf-check-label">{b}</span>
                            </label>
                        ))}
                    </div>
                </FilterSection>
            )}

            {sizes.length > 0 && (
                <FilterSection title="Size">
                    <div className="sf-size-grid">
                        {sizes.map(s => (
                            <button
                                key={s}
                                className={`sf-size-pill ${activeFilters.size === s ? "sf-size-pill--active" : ""}`}
                                onClick={() => toggle("size", s)}>
                                {s}
                            </button>
                        ))}
                    </div>
                </FilterSection>
            )}

            {uniqueColors.length > 0 && (
                <FilterSection title="Color">
                    <div className="sf-color-grid">
                        {uniqueColors.map(c => (
                            <button
                                key={c.hex}
                                className={`sf-color-swatch ${activeFilters.color === c.hex ? "sf-color-swatch--active" : ""}`}
                                style={{ "--swatch": c.hex }}
                                onClick={() => toggle("color", c.hex)}
                                title={c.name && c.name !== c.hex ? c.name : undefined}
                                aria-label={c.name || c.hex}
                            />
                        ))}
                    </div>
                </FilterSection>
            )}

            {brands.length === 0 && sizes.length === 0 && uniqueColors.length === 0 && (
                <p className="sf-no-filters">No filters available yet.</p>
            )}

            {isMobile && (
                <div className="sf-mobile-footer">
                    {hasFilters && (
                        <button className="sf-mobile-reset" onClick={() => { onReset(); onClose(); }}>
                            Reset All
                        </button>
                    )}
                    <button className="sf-mobile-apply" onClick={onClose}>
                        Show Results
                    </button>
                </div>
            )}
        </div>
    );
};

/* ─── FILTER PILL ─── */
const FilterPill = ({ label, onRemove }) => (
    <button className="store-filter-pill" onClick={onRemove}>
        {label} <XIcon />
    </button>
);

/* ════════════════════════════════
   MAIN STORE
════════════════════════════════ */
const Store = () => {
    const { products, loading } = useProducts();

    const [activeFilters, setActiveFilters] = useState({});
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebounced] = useState("");
    const [sort, setSort] = useState("newest");
    const [view, setView] = useState("grid");
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileFilterOpen, setMobileOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    const [searchParams, setSearchParams] = useSearchParams();
    const searchRef = useRef(null);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 768);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    useEffect(() => {
        const params = Object.fromEntries([...searchParams]);
        setActiveFilters(params);
        if (params.search) setSearch(params.search);
        if (params.sort) setSort(params.sort);
    }, []);

    useEffect(() => {
        const t = setTimeout(() => setDebounced(search), 380);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => {
        const params = { ...activeFilters };
        if (debouncedSearch) params.search = debouncedSearch;
        if (sort !== "newest") params.sort = sort;
        setSearchParams(params);
    }, [activeFilters, debouncedSearch, sort]);

    useEffect(() => {
        document.body.style.overflow = mobileFilterOpen ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [mobileFilterOpen]);

    let filtered = [...products];

    if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.brand?.toLowerCase().includes(q)
        );
    }
    if (activeFilters.brand) filtered = filtered.filter(p => p.brand === activeFilters.brand);
    if (activeFilters.size) {
        filtered = filtered.filter(p =>
            p.variants?.some(v => v.sizes?.some(s => s.size === activeFilters.size))
        );
    }
    if (activeFilters.color) {
        filtered = filtered.filter(p =>
            p.variants?.some(v => v.color === activeFilters.color)
        );
    }

    if (sort === "price-low") filtered.sort((a, b) => a.price - b.price);
    if (sort === "price-high") filtered.sort((a, b) => b.price - a.price);

    const resetFilters = useCallback(() => {
        setActiveFilters({});
        setSearch("");
        setDebounced("");
        setSort("newest");
        setSearchParams({});
    }, []);

    const activePills = [
        activeFilters.brand && { key: "brand", label: activeFilters.brand },
        activeFilters.size && { key: "size", label: `Size: ${activeFilters.size}` },
        activeFilters.color && { key: "color", label: `Color` },
        debouncedSearch && { key: "search", label: `"${debouncedSearch}"` },
    ].filter(Boolean);

    const removeFilter = (key) => {
        if (key === "search") { setSearch(""); setDebounced(""); }
        else setActiveFilters(q => { const n = { ...q }; delete n[key]; return n; });
    };

    const activeFilterCount = activePills.length;

    return (
        <PageTransition>
            <div className="store-page">

                {/* ── HERO ── */}
                <div className="store-hero">
                    <div className="store-hero-bg" aria-hidden="true" />
                    <div className="store-hero-content">
                        <p className="store-eyebrow">MotoPark Collection</p>
                        <h1 className="store-title">Explore All Gear</h1>
                        <p className="store-subtitle">Premium motorcycle gear for every ride</p>
                        <div className="store-search-wrap">
                            <SearchIcon />
                            <input
                                ref={searchRef}
                                className="store-search"
                                placeholder="Search helmets, jackets, gloves…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                autoComplete="off"
                            />
                            {search && (
                                <button className="store-search-clear"
                                    onClick={() => { setSearch(""); setDebounced(""); }}>
                                    <XIcon />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── STICKY TOOLBAR ── */}
                <div className="store-toolbar">
                    <button
                        className={`store-filter-toggle ${(sidebarOpen && !isMobile) || (mobileFilterOpen && isMobile) ? "store-filter-toggle--active" : ""}`}
                        onClick={() => isMobile ? setMobileOpen(true) : setSidebarOpen(s => !s)}>
                        <FilterIcon />
                        <span>Filters</span>
                        {activeFilterCount > 0 && (
                            <span className="store-filter-count">{activeFilterCount}</span>
                        )}
                    </button>

                    <div className="store-toolbar-right">
                        <span className="store-result-count">
                            {loading ? "—" : `${filtered.length} product${filtered.length !== 1 ? "s" : ""}`}
                        </span>
                        <div className="store-sort-wrap">
                            <select className="store-sort" value={sort}
                                onChange={(e) => setSort(e.target.value)}>
                                <option value="newest">Newest First</option>
                                <option value="price-low">Price: Low → High</option>
                                <option value="price-high">Price: High → Low</option>
                            </select>
                        </div>
                        <div className="store-view-toggle">
                            <button className={`store-view-btn ${view === "grid" ? "store-view-btn--active" : ""}`}
                                onClick={() => setView("grid")} aria-label="Grid view">
                                <GridIcon />
                            </button>
                            <button className={`store-view-btn ${view === "list" ? "store-view-btn--active" : ""}`}
                                onClick={() => setView("list")} aria-label="List view">
                                <ListIcon />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── ACTIVE FILTER PILLS ── */}
                {activePills.length > 0 && (
                    <div className="store-active-filters">
                        <div className="store-active-inner">
                            <span className="store-active-label">Active:</span>
                            {activePills.map(p => (
                                <FilterPill key={p.key} label={p.label} onRemove={() => removeFilter(p.key)} />
                            ))}
                            <button className="store-reset-all" onClick={resetFilters}>Clear All</button>
                        </div>
                    </div>
                )}

                {/* ── LAYOUT ── */}
                <div className={`store-layout ${sidebarOpen && !isMobile ? "store-layout--sidebar" : "store-layout--full"}`}>

                    {sidebarOpen && !isMobile && (
                        <aside className="store-sidebar">
                            <FilterPanel
                                products={products}
                                activeFilters={activeFilters}
                                onChange={setActiveFilters}
                                onReset={resetFilters}
                                isMobile={false}
                            />
                        </aside>
                    )}

                    <section className="store-products">
                        {loading ? (
                            <div className={`store-grid ${view === "list" ? "store-grid--list" : ""}`}>
                                {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="store-empty">
                                <div className="store-empty-icon">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
                                        stroke="#d1d1d6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="8" />
                                        <path d="M21 21l-4.35-4.35" />
                                    </svg>
                                </div>
                                <h3>No products found</h3>
                                <p>Try a different search or adjust your filters.</p>
                                <button className="store-empty-btn" onClick={resetFilters}>Clear Filters</button>
                            </div>
                        ) : (
                            <div className={`store-grid ${view === "list" ? "store-grid--list" : ""}`}>
                                {filtered.map((p, i) => (
                                    <StoreCard key={p._id} product={p} view={view} index={i} />
                                ))}
                            </div>
                        )}
                    </section>
                </div>

                {/* ── MOBILE FILTER DRAWER ── */}
                {isMobile && (
                    <>
                        <div
                            className={`store-drawer-backdrop ${mobileFilterOpen ? "store-drawer-backdrop--visible" : ""}`}
                            onClick={() => setMobileOpen(false)}
                            aria-hidden="true"
                        />
                        <div className={`store-drawer ${mobileFilterOpen ? "store-drawer--open" : ""}`}
                            role="dialog" aria-modal="true" aria-label="Filters">
                            <div className="store-drawer-handle" />
                            <FilterPanel
                                products={products}
                                activeFilters={activeFilters}
                                onChange={setActiveFilters}
                                onReset={resetFilters}
                                isMobile={true}
                                onClose={() => setMobileOpen(false)}
                            />
                        </div>
                    </>
                )}

            </div>
        </PageTransition>
    );
};

export default Store;