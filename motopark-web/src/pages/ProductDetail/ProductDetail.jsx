import { Component } from "react";
import PageTransition from "../../components/PageTransition/PageTransition";
import { useParams, useNavigate } from "react-router-dom";
import { useProducts } from "@/context/ProductContext";
import { useProduct } from "@/hooks/useProduct";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useState, useEffect, useRef } from "react";
import ProductGallery from "@/components/ProductGallery/ProductGallery";
import { optimizeImage } from "@/utils/imageUrl";
import "./ProductDetail.css";

/* ─────────────────────────────────────────────────
   ERROR BOUNDARY
   BUG FIX 1: import { Component } was placed AFTER
   the class definition → syntax crash.
   All imports must be at the TOP of the file.
   Also: two `export default` statements existed
   (line 540 and 547) — JS only allows one per file.
   Fixed: single export at bottom wraps with boundary.
───────────────────────────────────────────────── */
class PDErrorBoundary extends Component {
  state = { crashed: false };
  static getDerivedStateFromError() { return { crashed: true }; }
  render() {
    if (this.state.crashed) {
      return (
        <div className="pd-loading">
          <p>
            Something went wrong loading this product.{" "}
            <a href="/store">Back to store</a>
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ─── ICONS ─── */
const HeartIcon = ({ filled }) => (
  <svg width="18" height="18" viewBox="0 0 24 24"
    fill={filled ? "#ff6b3d" : "none"}
    stroke={filled ? "#ff6b3d" : "currentColor"}
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const TruckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" rx="1" />
    <path d="M16 8h4l3 5v4h-7V8z" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const ReturnIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 .49-3.5" />
  </svg>
);

const StarIcon = ({ filled }) => (
  <svg width="13" height="13" viewBox="0 0 24 24"
    fill={filled ? "#ff6b3d" : "none"}
    stroke="#ff6b3d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const ChevronRight = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

/* ─── RELATED CARD ─── */
const RelatedCard = ({ product }) => {
  const navigate = useNavigate();
  const { addToCart, cartItems } = useCart();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();

  const inCart     = cartItems.some(i => i._id === product._id);
  const wishlisted = isInWishlist(product._id);
  const rawImage   = product?.variants?.[0]?.images?.[0] || product?.images?.[0];
  const image      = optimizeImage(rawImage, 400);

  const handleWishlist = (e) => {
    e.stopPropagation();
    wishlisted ? removeFromWishlist(product._id) : addToWishlist(product);
  };
  const handleCart = (e) => {
    e.stopPropagation();
    addToCart(product);
  };

  return (
    <div
      className="related-card"
      onClick={() => navigate(`/product/${product._id}`)}
      role="button" tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/product/${product._id}`)}
    >
      <div className="related-card-top">
        <button
          className={`related-wish${wishlisted ? " related-wish--active" : ""}`}
          onClick={handleWishlist} aria-label="Wishlist"
        >
          <HeartIcon filled={wishlisted} />
        </button>
      </div>
      <div className="related-img-wrap">
        {image
          ? <img src={image} alt={product.name} className="related-img" />
          : <div className="related-img-placeholder" />
        }
      </div>
      <div className="related-card-info">
        <p className="related-brand">{product.brand}</p>
        <h4 className="related-name">{product.name}</h4>
        <div className="related-footer">
          <span className="related-price">₹{product.price?.toLocaleString("en-IN")}</span>
          <button
            className={`related-cart${inCart ? " related-cart--added" : ""}`}
            onClick={handleCart}
          >
            {inCart ? <CheckIcon /> : "+"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── PURCHASE CONTENT ─── */
const PurchaseContent = ({
  product, inStock, addedToCart, alreadyInCart,
  wishlisted, handleAddToCart, handleWishlist,
}) => (
  <>
    <div className="pd-price-row">
      <span className="pd-price">₹{product.price?.toLocaleString("en-IN")}</span>
    </div>

    <p className="pd-emi">
      or ₹{Math.round(product.price / 12).toLocaleString("en-IN")}/mo with No-cost EMI
    </p>

    <button
      className={`pd-add-cart${addedToCart ? " pd-add-cart--added" : ""}${!inStock ? " pd-add-cart--disabled" : ""}`}
      disabled={!inStock}
      onClick={handleAddToCart}
    >
      {addedToCart ? <><CheckIcon /> Added</> : alreadyInCart ? "Go to Cart →" : "Add to Cart"}
    </button>

    <button
      className={`pd-wishlist${wishlisted ? " pd-wishlist--active" : ""}`}
      onClick={handleWishlist}
    >
      <HeartIcon filled={wishlisted} />
      {wishlisted ? "Wishlisted" : "Add to Wishlist"}
    </button>

    <div className="pd-delivery">
      <div className="pd-delivery-item">
        <TruckIcon />
        <div>
          <strong>Free Delivery</strong>
          <p>Ships within 2–3 business days</p>
        </div>
      </div>
      <div className="pd-delivery-item">
        <ReturnIcon />
        <div>
          <strong>Easy Returns</strong>
          <p>30-day hassle-free return policy</p>
        </div>
      </div>
      <div className="pd-delivery-item">
        <ShieldIcon />
        <div>
          <strong>1 Year Warranty</strong>
          <p>Covered against manufacturing defects</p>
        </div>
      </div>
    </div>
  </>
);

/* ─── MAIN PAGE ─── */
const ProductDetail = () => {
  const { id }                      = useParams();
  const { products }                = useProducts();
  const { product, loading, error } = useProduct(id);
  const navigate                    = useNavigate();

  const { addToCart, cartItems }                            = useCart();
  const { addToWishlist, isInWishlist, removeFromWishlist } = useWishlist();

  const [descExpanded, setDescExpanded] = useState(false);
  const [variantIndex, setVariantIndex] = useState(0);
  const [addedToCart,  setAddedToCart]  = useState(false);
  const [selectedSize, setSelectedSize] = useState(null);
  const [sizeError,    setSizeError]    = useState(false);
  const [activeTab,    setActiveTab]    = useState("description");
  const purchaseRef = useRef(null);

  const alreadyInCart = cartItems.some(i => i._id === product?._id);

  /* ── Reset variant/size when product data loads ── */
  useEffect(() => {
    if (product?.variants?.length) {
      setVariantIndex(0);
      setSelectedSize(null);
      setSizeError(false);
    }
  }, [product]);

  /* ── Reset ALL UI state when navigating to a different product ──
     BUG FIX 2: These useEffects were outside the component's
     indentation in the previous version — while still inside the
     function body, the inconsistent formatting masked the fact that
     comment lines between hooks were confusing the file structure.
     Cleaned up and properly indented here.
  ── */
  useEffect(() => {
    setAddedToCart(false);
    setActiveTab("description");
    setDescExpanded(false);
    setVariantIndex(0);
    setSelectedSize(null);
    setSizeError(false);
  }, [id]);

  /* ── Scroll to top on product change ──
     BUG FIX 3: behavior:"instant" throws TypeError on Android
     Chrome < 108 (Samsung Galaxy S20 Ultra), crashing the React
     tree and rendering a completely blank page. Fixed with try/catch
     fallback to window.scrollTo(0,0) which works everywhere.
  ── */
  useEffect(() => {
    try {
      window.scrollTo({ top: 0, behavior: "instant" });
    } catch {
      window.scrollTo(0, 0);
    }
  }, [id]);

  /* ── Reset description expand when switching tabs ── */
  useEffect(() => {
    setDescExpanded(false);
  }, [activeTab]);

  /* ── Loading / error states ── */
  if (loading) return (
    <div className="pd-loading"><div className="pd-loading-spinner" /></div>
  );

  if (error || !product) return (
    <div className="pd-loading"><p>{error || "Product not found"}</p></div>
  );

  /* ── Derived values (below all hooks — safe) ── */
  const variant  = product.variants?.[variantIndex];
  const images   = variant?.images || [];

  /* inStock: handles products with sizes AND products without sizes */
  const inStock = variant
    ? (variant.sizes?.length
        ? variant.sizes.some(s => Number(s.stock) > 0)
        : (variant.stock == null ? true : Number(variant.stock) > 0))
    : false;

  const wishlisted = isInWishlist(product._id);

  const related = products
    .filter(p => p.category === product.category && p._id !== product._id)
    .slice(0, 4);

  const categoryLabel = product.category && typeof product.category === "object"
    ? product.category?.name
    : (product.category?.length === 24 ? null : product.category);

  const handleAddToCart = () => {
    if (variant?.sizes?.length && !selectedSize) {
      setSizeError(true);
      purchaseRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => setSizeError(false), 2500);
      return;
    }
    addToCart({ ...product, selectedColor: variant?.color, selectedSize });
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2200);
  };

  const handleWishlist = () => {
    wishlisted ? removeFromWishlist(product._id) : addToWishlist(product);
  };

  const rating      = 4;
  const reviewCount = 128;

  const purchaseProps = {
    product, inStock, addedToCart, alreadyInCart,
    wishlisted, handleAddToCart, handleWishlist,
  };

  return (
    <PageTransition>
      <div className="pd-page">

        {/* ── BREADCRUMB ── */}
        <nav className="pd-breadcrumb">
          <a href="/">Home</a>
          <ChevronRight />
          <a href="/store">Store</a>
          <ChevronRight />
          {categoryLabel && (
            <>
              <a href={`/category/${encodeURIComponent(categoryLabel.toLowerCase())}`}>
                {categoryLabel}
              </a>
              <ChevronRight />
            </>
          )}
          <span>{product.name}</span>
        </nav>

        {/* ── MAIN LAYOUT ── */}
        <div className="pd-layout">

          {/* COL 1 — GALLERY */}
          <div className="pd-gallery-col">
            <ProductGallery
              images={images}
              product={product}
              variant={variant}
              selectedSize={selectedSize}
              setSelectedSize={setSelectedSize}
              variantIndex={variantIndex}
              setVariantIndex={setVariantIndex}
              sizeError={sizeError}
              setSizeError={setSizeError}
              onAddToCart={handleAddToCart}
              addedToCart={addedToCart}
              wishlisted={wishlisted}
              onWishlist={handleWishlist}
              inStock={inStock}
              alreadyInCart={alreadyInCart}
            />
          </div>

          {/* COL 2 — INFO
              NOTE: visibility toggle removed — gallery has no true
              fullscreen mode, toggling visibility on zoom hid the
              entire info column incorrectly. */}
          <div className="pd-info-col">

            <div className="pd-badges">
              {categoryLabel && <span className="pd-badge">{categoryLabel}</span>}
              {product.featured && <span className="pd-badge pd-badge--featured">Featured</span>}
              {inStock
                ? <span className="pd-badge pd-badge--in">In Stock</span>
                : <span className="pd-badge pd-badge--out">Out of Stock</span>
              }
            </div>

            <h1 className="pd-title">{product.name}</h1>

            <div className="pd-meta">
              {product.brand && <span className="pd-brand">{product.brand}</span>}
              <div className="pd-rating">
                {[1, 2, 3, 4, 5].map(s => <StarIcon key={s} filled={s <= rating} />)}
                <span className="pd-rating-count">({reviewCount})</span>
              </div>
            </div>

            <div className="pd-divider" />

            {/* color variants */}
            {product.variants?.length > 0 && (
              <div className="pd-section">
                <div className="pd-section-label">
                  Color <span className="pd-section-value">{variant?.color}</span>
                </div>
                <div className="pd-colors">
                  {product.variants.slice(0, 8).map((v, i) => (
                    <button
                      key={i}
                      className={`pd-color-btn${variantIndex === i ? " pd-color-btn--active" : ""}`}
                      style={{ background: v.color?.toLowerCase() }}
                      onClick={() => { setVariantIndex(i); setSelectedSize(null); }}
                      aria-label={`Color: ${v.color}`}
                      title={v.color}
                    />
                  ))}
                  {product.variants.length > 8 && (
                    <span className="pd-color-overflow">+{product.variants.length - 8}</span>
                  )}
                </div>
              </div>
            )}

            {/* sizes */}
            {variant?.sizes?.length > 0 && (
              <div className="pd-section">
                <div className="pd-section-label">
                  Size {selectedSize && <span className="pd-section-value">{selectedSize}</span>}
                </div>
                <div className={`pd-sizes${sizeError ? " pd-sizes--error" : ""}`}>
                  {variant.sizes.map((s, i) => (
                    <button
                      key={i}
                      disabled={Number(s.stock) === 0}
                      className={`pd-size-btn${selectedSize === s.size ? " pd-size-btn--active" : ""}`}
                      onClick={() => { setSelectedSize(s.size); setSizeError(false); }}
                    >
                      {s.size}
                      {Number(s.stock) === 0 && <span className="pd-size-slash" />}
                    </button>
                  ))}
                </div>
                {sizeError && <p className="pd-size-error">Please select a size to continue</p>}
              </div>
            )}

            {/* tabs */}
            <div className="pd-tabs">
              {["description", "specs", "care"].map(tab => (
                <button
                  key={tab}
                  className={`pd-tab${activeTab === tab ? " pd-tab--active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            <div className="pd-tab-content">

              {/* DESCRIPTION */}
              {activeTab === "description" && (() => {
                const text   = product.description || "Premium quality gear designed for performance and protection.";
                const isLong = text.length > 300;
                return (
                  <div>
                    <p className={`pd-description${!descExpanded && isLong ? " pd-description--clamped" : ""}`}>
                      {text}
                    </p>
                    {isLong && (
                      <button className="pd-expand-btn" onClick={() => setDescExpanded(e => !e)}>
                        {descExpanded ? "Show less ↑" : "Read more ↓"}
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* SPECS */}
              {activeTab === "specs" && (
                <ul className="pd-specs-list">
                  {product.brand  && <li><span>Brand</span><span>{product.brand}</span></li>}
                  {categoryLabel  && <li><span>Category</span><span>{categoryLabel}</span></li>}
                  {variant?.color && <li><span>Color</span><span>{variant.color}</span></li>}
                  <li><span>SKU</span><span>{product._id?.slice(-8).toUpperCase()}</span></li>
                  <li>
                    <span>Availability</span>
                    <span className={inStock ? "pd-spec-in" : "pd-spec-out"}>
                      {inStock ? "In Stock" : "Out of Stock"}
                    </span>
                  </li>
                  {product.specs && product.specs.trim() &&
                    product.specs.split("\n").map(l => l.trim()).filter(Boolean)
                      .map((line, i) => {
                        const colon = line.indexOf(":");
                        if (colon === -1) return <li key={i}><span>{line}</span><span>—</span></li>;
                        return (
                          <li key={i}>
                            <span>{line.slice(0, colon).trim()}</span>
                            <span>{line.slice(colon + 1).trim()}</span>
                          </li>
                        );
                      })
                  }
                </ul>
              )}

              {/* CARE */}
              {activeTab === "care" && (() => {
                const text = product.care ||
                  "Regular cleaning recommended.\nWipe with a soft cloth to remove dust.\nAvoid harsh chemicals.\nStore in a dry place and inspect regularly before use.";
                const lines   = text.split("\n").map(l => l.trim()).filter(Boolean);
                const showAll = descExpanded || lines.length <= 4;
                return (
                  <div>
                    <ul className="pd-care-list">
                      {(showAll ? lines : lines.slice(0, 4)).map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                    {lines.length > 4 && (
                      <button className="pd-expand-btn" onClick={() => setDescExpanded(e => !e)}>
                        {descExpanded ? "Show less ↑" : `Show all ${lines.length} tips ↓`}
                      </button>
                    )}
                  </div>
                );
              })()}

            </div>
          </div>

          {/* COL 3 — PURCHASE BOX (desktop) */}
          <div className="pd-purchase-col" ref={purchaseRef}>
            <div className="pd-purchase-box">
              <PurchaseContent {...purchaseProps} />
            </div>
          </div>

        </div>

        {/* MOBILE PURCHASE — visible only ≤768px */}
        <div className="pd-mobile-sticky">
          <div className="pd-mobile-box">
            <PurchaseContent {...purchaseProps} />
          </div>
        </div>

        {/* ── RELATED ── */}
        {related.length > 0 && (
          <section className="pd-related">
            <div className="pd-related-header">
              <div>
                <p className="pd-related-eyebrow">More from this collection</p>
                <h2 className="pd-related-title">You May Also Like</h2>
              </div>
              <a
                href={`/category/${encodeURIComponent((categoryLabel || "").toLowerCase())}`}
                className="pd-related-link"
              >
                View All <ChevronRight />
              </a>
            </div>
            <div className="pd-related-grid">
              {related.map(p => <RelatedCard key={p._id} product={p} />)}
            </div>
          </section>
        )}

      </div>
    </PageTransition>
  );
};

/* ─────────────────────────────────────────────────
   SINGLE export — wraps ProductDetail with the
   error boundary so any render crash shows a
   friendly message instead of a blank screen.

   BUG FIX 1 (continued): Previous file had TWO
   export default statements (line 540 + 547).
   JavaScript only allows one per module — the
   second one caused a syntax error that crashed
   the entire module, giving a blank page.
───────────────────────────────────────────────── */
export default function ProductDetailPage(props) {
  return (
    <PDErrorBoundary>
      <ProductDetail {...props} />
    </PDErrorBoundary>
  );
}