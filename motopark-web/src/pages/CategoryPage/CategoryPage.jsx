import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import "./CategoryPage.css";

// ✅ FIX 1 — use env variable, never hardcode localhost
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API = `${API_BASE}/api/products`;

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
const GridIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
  </svg>
);
const ListIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
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
const ChevronRight = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
);
const ChevronDown = ({ open }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.25s ease" }}>
    <polyline points="6 9 12 15 18 9" />
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

/* ─── SKELETON ─── */
const SkeletonCard = () => (
  <div className="cat-skeleton">
    <div className="skel-image" />
    <div className="skel-body">
      <div className="skel-line skel-line--title" />
      <div className="skel-line skel-line--sub" />
      <div className="skel-line skel-line--price" />
    </div>
  </div>
);

/* ─── PRODUCT CARD ─── */
const CatProductCard = ({ product, view, index }) => {
  const { addToCart, cartItems } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const navigate = useNavigate();

  const inCart = cartItems.some(i => i._id === product._id);
  const wishlisted = isInWishlist(product._id);

  const rawImage = product?.variants?.[0]?.images?.[0] || product?.images?.[0];
  const image = rawImage
    ? rawImage.startsWith("http") ? rawImage : `${API_BASE}${rawImage.startsWith("/") ? "" : "/"}${rawImage}`
    : null;

  const handleClick = () => navigate(`/product/${product._id}`);
  const handleCart = (e) => { e.stopPropagation(); addToCart(product); };
  const handleWishlist = (e) => {
    e.stopPropagation();
    wishlisted ? removeFromWishlist(product._id) : addToWishlist(product);
  };

  if (view === "list") return (
    <div className="cat-card cat-card--list"
      style={{ animationDelay: `${Math.min(index * 0.04, 0.3)}s` }}
      onClick={handleClick} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}>
      <div className="cat-card-list-image">
        {image ? <img src={image} alt={product.name} className="cat-img" /> : <div className="cat-img-placeholder" />}
      </div>
      <div className="cat-card-list-body">
        <div>
          <h3 className="cat-name">{product.name}</h3>
          {product.brand && <p className="cat-brand">{product.brand}</p>}
          {product.description && (
            <p className="cat-desc">{product.description.slice(0, 100)}{product.description.length > 100 ? "…" : ""}</p>
          )}
        </div>
        <div className="cat-card-list-footer">
          <span className="cat-price">₹{product.price?.toLocaleString("en-IN")}</span>
          <div className="cat-actions">
            <button className={`cat-wishlist-btn ${wishlisted ? "cat-wishlist-btn--active" : ""}`}
              onClick={handleWishlist} aria-label="Wishlist">
              <HeartIcon filled={wishlisted} />
            </button>
            <button className={`cat-cart-btn ${inCart ? "cat-cart-btn--added" : ""}`}
              onClick={handleCart} aria-label="Add to cart">
              {inCart ? <><CheckIcon /><span>Added</span></> : <><CartIcon /><span>Add to Cart</span></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="cat-card cat-card--grid"
      style={{ animationDelay: `${Math.min(index * 0.04, 0.3)}s` }}
      onClick={handleClick} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}>
      <div className="cat-card-accent" />
      <div className="cat-card-top">
        <span />
        <button className={`cat-wishlist-btn ${wishlisted ? "cat-wishlist-btn--active" : ""}`}
          onClick={handleWishlist} aria-label="Wishlist">
          <HeartIcon filled={wishlisted} />
        </button>
      </div>
      <div className="cat-image-wrap">
        {image ? <img src={image} alt={product.name} className="cat-img" /> : <div className="cat-img-placeholder" />}
      </div>
      <div className="cat-card-info">
        <h3 className="cat-name">{product.name}</h3>
        {product.brand && <p className="cat-brand">{product.brand}</p>}
        <div className="cat-card-footer">
          <span className="cat-price">₹{product.price?.toLocaleString("en-IN")}</span>
          <button className={`cat-cart-btn ${inCart ? "cat-cart-btn--added" : ""}`}
            onClick={handleCart} aria-label="Add to cart">
            {inCart ? <CheckIcon /> : <CartIcon />}
            <span>{inCart ? "Added" : "Add"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── FILTER SECTION ACCORDION ─── */
const FilterSection = ({ title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="cf-section">
      <button className="cf-section-toggle" onClick={() => setOpen(o => !o)}>
        <span>{title}</span>
        <ChevronDown open={open} />
      </button>
      {open && <div className="cf-section-body">{children}</div>}
    </div>
  );
};

/* ─── INLINE FILTER PANEL (derives options from products, no extra API call) ─── */
const CatFilterPanel = ({ products, activeFilters, onChange, onReset, isMobile, onClose }) => {
  // ✅ FIX 3 — derive filter options from the already-fetched products array
  // No separate API call needed — avoids the "No filters available" bug
  const brands = [...new Set(products.map(p => p.brand).filter(Boolean))].sort();
  const sizes = [...new Set(
    products.flatMap(p => p.variants?.flatMap(v => v.sizes?.map(s => s.size) || []) || [])
      .filter(Boolean)
  )].sort();
  const colors = products
    .flatMap(p => p.variants?.map(v => ({ hex: v.color, name: v.colorName || v.color })) || [])
    .filter(c => c.hex)
    .filter((c, i, arr) => arr.findIndex(x => x.hex === c.hex) === i);

  const toggle = (key, val) => {
    onChange(prev => {
      if (prev[key] === val) { const n = { ...prev }; delete n[key]; return n; }
      return { ...prev, [key]: val };
    });
  };

  const hasFilters = Object.keys(activeFilters).length > 0;

  return (
    <div className={`cf-panel ${isMobile ? "cf-panel--mobile" : ""}`}>
      {isMobile && (
        <div className="cf-mobile-header">
          <span className="cf-mobile-title">Filters</span>
          <button className="cf-mobile-close" onClick={onClose} aria-label="Close"><XIcon /></button>
        </div>
      )}

      {!isMobile && (
        <div className="cf-header">
          <span className="cf-header-title">FILTERS</span>
          {hasFilters && <button className="cf-reset-btn" onClick={onReset}>Reset all</button>}
        </div>
      )}

      {brands.length > 0 && (
        <FilterSection title="Brand">
          <div className="cf-check-list">
            {brands.map(b => (
              <label key={b} className="cf-check-row">
                <input type="checkbox" className="cf-checkbox"
                  checked={activeFilters.brand === b}
                  onChange={() => toggle("brand", b)} />
                <span className="cf-check-label">{b}</span>
              </label>
            ))}
          </div>
        </FilterSection>
      )}

      {sizes.length > 0 && (
        <FilterSection title="Size">
          <div className="cf-size-grid">
            {sizes.map(s => (
              <button key={s}
                className={`cf-size-pill ${activeFilters.size === s ? "cf-size-pill--active" : ""}`}
                onClick={() => toggle("size", s)}>
                {s}
              </button>
            ))}
          </div>
        </FilterSection>
      )}

      {colors.length > 0 && (
        <FilterSection title="Color">
          <div className="cf-color-grid">
            {colors.map(c => (
              <button key={c.hex}
                className={`cf-color-swatch ${activeFilters.color === c.hex ? "cf-color-swatch--active" : ""}`}
                style={{ "--swatch": c.hex }}
                onClick={() => toggle("color", c.hex)}
                title={c.name !== c.hex ? c.name : undefined}
                aria-label={c.name || c.hex} />
            ))}
          </div>
        </FilterSection>
      )}

      {brands.length === 0 && sizes.length === 0 && colors.length === 0 && (
        <p className="cf-no-filters">No filters available yet.</p>
      )}

      {isMobile && (
        <div className="cf-mobile-footer">
          {hasFilters && (
            <button className="cf-mobile-reset" onClick={() => { onReset(); onClose(); }}>Reset All</button>
          )}
          <button className="cf-mobile-apply" onClick={onClose}>Show Results</button>
        </div>
      )}
    </div>
  );
};

/* ════════════════════════════════
   MAIN PAGE
════════════════════════════════ */
const CategoryPage = () => {
  const { slug } = useParams();

  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("newest");
  const [activeFilters, setActiveFilters] = useState({});
  const [view, setView] = useState("grid");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const topRef = useRef(null);

  const label = slug
    ? slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ")
    : "Products";

  /* detect mobile */
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* lock body scroll when drawer open */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  /* ✅ FIX 2 — single useEffect: resolve category then fetch products in one async flow.
     No more race condition between two separate useEffects. */
  useEffect(() => {
    if (!slug) return;

    let cancelled = false;
    setLoading(true);
    setAllProducts([]);
    setActiveFilters({});

    const run = async () => {
      try {
        // Step 1 — resolve slug to _id
        const catRes = await fetch(`${API_BASE}/api/categories`);
        const catData = await catRes.json();
        const cats = catData.categories || catData || [];
        const match = cats.find(c =>
          c.name?.toLowerCase() === slug.toLowerCase() ||
          c.slug?.toLowerCase() === slug.toLowerCase()
        );
        const categoryId = match ? match._id : slug;

        if (cancelled) return;

        // Step 2 — fetch ALL products for this category (no filter params yet — we filter locally)
        const sortParam = sort === "low" ? "price_asc" : sort === "high" ? "price_desc" : "newest";
        const qs = new URLSearchParams({ category: categoryId, sort: sortParam, limit: 200 }).toString();
        const prodRes = await fetch(`${API}?${qs}`);
        const prodData = await prodRes.json();

        if (cancelled) return;
        setAllProducts(prodData.products || []);
      } catch (err) {
        console.error("CategoryPage fetch error:", err);
        if (!cancelled) setAllProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    return () => { cancelled = true; };
  }, [slug, sort]); // re-fetch when slug or sort changes

  /* ── LOCAL FILTERING (brand, size, color) — no extra API calls ── */
  let filtered = [...allProducts];

  if (activeFilters.brand) {
    filtered = filtered.filter(p => p.brand === activeFilters.brand);
  }
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

  const resetFilters = useCallback(() => setActiveFilters({}), []);

  const activePillCount = Object.keys(activeFilters).length;

  return (
    <div className="cat-page" ref={topRef}>

      {/* ── HERO ── */}
      <div className="cat-hero">
        <div className="cat-hero-bg" aria-hidden="true" />
        <div className="cat-hero-content">
          <nav className="cat-breadcrumb" aria-label="Breadcrumb">
            <a href="/">Home</a>
            <ChevronRight />
            <a href="/store">Store</a>
            <ChevronRight />
            <span>{label}</span>
          </nav>
          <h1 className="cat-title">{label}</h1>
          <p className="cat-subtitle">
            {loading
              ? "Loading…"
              : `${filtered.length} product${filtered.length !== 1 ? "s" : ""} available`}
          </p>
        </div>
      </div>

      {/* ── TOOLBAR ── */}
      <div className="cat-toolbar">
        <button
          className={`cat-filter-toggle ${(sidebarOpen && !isMobile) || (mobileOpen && isMobile) ? "cat-filter-toggle--active" : ""}`}
          onClick={() => isMobile ? setMobileOpen(true) : setSidebarOpen(s => !s)}>
          <FilterIcon />
          <span>Filters</span>
          {activePillCount > 0 && (
            <span className="cat-filter-count">{activePillCount}</span>
          )}
        </button>

        <div className="cat-toolbar-right">
          <span className="cat-count">
            {loading ? "—" : `${filtered.length} results`}
          </span>
          <div className="cat-sort-wrap">
            <select className="cat-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="newest">Newest First</option>
              <option value="low">Price: Low → High</option>
              <option value="high">Price: High → Low</option>
            </select>
          </div>
          <div className="cat-view-toggle">
            <button className={`cat-view-btn ${view === "grid" ? "cat-view-btn--active" : ""}`}
              onClick={() => setView("grid")} aria-label="Grid view"><GridIcon /></button>
            <button className={`cat-view-btn ${view === "list" ? "cat-view-btn--active" : ""}`}
              onClick={() => setView("list")} aria-label="List view"><ListIcon /></button>
          </div>
        </div>
      </div>

      {/* ── LAYOUT ── */}
      <div className={`cat-layout ${sidebarOpen && !isMobile ? "cat-layout--sidebar" : "cat-layout--full"}`}>

        {/* DESKTOP SIDEBAR */}
        {sidebarOpen && !isMobile && (
          <aside className="cat-sidebar">
            <CatFilterPanel
              products={allProducts}
              activeFilters={activeFilters}
              onChange={setActiveFilters}
              onReset={resetFilters}
              isMobile={false}
            />
          </aside>
        )}

        {/* PRODUCTS */}
        <section className="cat-products">
          {loading ? (
            <div className={`cat-grid ${view === "list" ? "cat-grid--list" : ""}`}>
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="cat-empty">
              <div className="cat-empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
                  stroke="#d1d1d6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </div>
              <h3>No products found</h3>
              <p>Try adjusting your filters or browse a different category.</p>
              {activePillCount > 0
                ? <button className="cat-empty-btn" onClick={resetFilters}>Clear Filters</button>
                : <a href="/store" className="cat-empty-btn">Browse All Gear</a>
              }
            </div>
          ) : (
            <div className={`cat-grid ${view === "list" ? "cat-grid--list" : ""}`}>
              {filtered.map((p, i) => (
                <CatProductCard key={p._id} product={p} view={view} index={i} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── MOBILE DRAWER ── */}
      {isMobile && (
        <>
          <div
            className={`cat-drawer-backdrop ${mobileOpen ? "cat-drawer-backdrop--visible" : ""}`}
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className={`cat-drawer ${mobileOpen ? "cat-drawer--open" : ""}`}
            role="dialog" aria-modal="true" aria-label="Filters">
            <div className="cat-drawer-handle" />
            <CatFilterPanel
              products={allProducts}
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
  );
};

export default CategoryPage;