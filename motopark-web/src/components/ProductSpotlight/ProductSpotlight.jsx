/* ================================================
   ProductSpotlight.jsx — Premium MotoPark Showcase
   Mobile-first, performance-optimized, production-grade.

   Layout:
   Desktop  ┌──────────┬─────────────────────┬───────┐
            │ HEADER + │                     │ THUMB │
            │ GLASS    │     HERO IMAGE      │ RAIL  │
            │ CARD     │                     │       │
            └──────────┴─────────────────────┴───────┘

   Mobile   HEADER → HERO → THUMB STRIP → INFO CARD → CTAs

   Interactions:
   • Hover (desktop) / tap (mobile) thumbnail → hero image + info updates
   • Wishlist button floats on top-right of hero image
   • Add-to-cart / View Details live in the glass info card
   ================================================ */
import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProducts } from "@/context/ProductContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useNavigate } from "react-router-dom";
import { API as BASE_URL } from "@/config/api";
import "./ProductSpotlight.css";

/* ── Transition easing ── */
const EASE = [0.25, 0.46, 0.45, 0.94];

/* ────────────────────────────────
   UTILS
──────────────────────────────── */

/** Resolve absolute image URL from product data */
function resolveImage(product) {
  const raw = product?.images?.[0] ?? product?.variants?.[0]?.images?.[0];
  if (!raw) return null;
  return raw.startsWith("http") ? raw : `${BASE_URL}${raw.startsWith("/") ? "" : "/"}${raw}`;
}

/** Extract human-readable category label */
function categoryLabel(product) {
  if (!product?.category) return null;
  if (typeof product.category === "object") return product.category.name;
  // If it looks like a Mongo ObjectId, skip it
  if (product.category.length === 24) return null;
  return product.category;
}

/** Calculate integer discount percentage */
function discountPct(price, original) {
  if (!original || original <= price) return null;
  return Math.round((1 - price / original) * 100);
}

/** Pull a short list of "key features" from whatever the product offers */
function getFeatures(product) {
  if (Array.isArray(product?.features) && product.features.length) {
    return product.features.slice(0, 3);
  }
  if (Array.isArray(product?.highlights) && product.highlights.length) {
    return product.highlights.slice(0, 3);
  }
  return [];
}

/* ────────────────────────────────
   ICONS
   Kept as lightweight inline SVGs — no icon font overhead.
──────────────────────────────── */
const HeartIcon = ({ filled }) => (
  <svg
    width="18" height="18" viewBox="0 0 24 24"
    fill={filled ? "#ff6b3d" : "none"}
    stroke={filled ? "#ff6b3d" : "currentColor"}
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const CartIcon = () => (
  <svg
    width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);

const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path
      d="M2.5 7H11.5M7.5 3L11.5 7L7.5 11"
      stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round"
    />
  </svg>
);

const CheckIcon = () => (
  <svg
    width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const SparkIcon = () => (
  <svg
    width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true"
  >
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

/* ── Fallback when product has no image ── */
const PlaceholderSVG = () => (
  <svg viewBox="0 0 240 240" fill="none" className="psl-placeholder-svg" aria-hidden="true">
    <circle cx="60"  cy="175" r="48" stroke="rgba(232,84,30,0.12)" strokeWidth="8" />
    <circle cx="180" cy="175" r="48" stroke="rgba(232,84,30,0.12)" strokeWidth="8" />
    <path
      d="M60 175 L108 95 L168 95 L180 175"
      stroke="rgba(232,84,30,0.28)" strokeWidth="5.5" fill="none"
      strokeLinecap="round" strokeLinejoin="round"
    />
    <path
      d="M168 95 L184 70 L208 74"
      stroke="rgba(232,84,30,0.32)" strokeWidth="5" fill="none"
      strokeLinecap="round" strokeLinejoin="round"
    />
    <rect
      x="100" y="118" width="58" height="32" rx="7"
      fill="rgba(232,84,30,0.08)" stroke="rgba(232,84,30,0.22)" strokeWidth="1.5"
    />
  </svg>
);

/* ════════════════════════════════
   HERO PANEL — large center image
   Crossfade + scale transition, floating wishlist button.
════════════════════════════════ */
const HeroPanel = ({ product, onNavigate }) => {
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  if (!product) return <div className="psl-hero" aria-hidden="true" />;

  const image      = resolveImage(product);
  const wishlisted = isInWishlist(product._id);
  const disc       = discountPct(product.price, product.originalPrice);

  return (
    <div
      className="psl-hero"
      onClick={onNavigate}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === "Enter" && onNavigate()}
      aria-label={`View ${product.name}`}
    >
      {/* ── Crossfade + scale image ── */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={product._id}
          className="psl-hero-img"
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{    opacity: 0, scale: 1.03 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          {image
            ? (
              <img
                src={image}
                alt={product.name}
                loading="eager"
                decoding="async"
                fetchPriority="high"
              />
            )
            : <PlaceholderSVG />
          }
        </motion.div>
      </AnimatePresence>

      {/* ── Tag pill ── */}
      {disc && (
        <span className="psl-hero-tag psl-hero-tag--sale" aria-label={`${disc}% off`}>
          −{disc}%
        </span>
      )}
      {!disc && product.featured && (
        <span className="psl-hero-tag">Featured</span>
      )}

      {/* ── Wishlist button — stopPropagation prevents product navigation ── */}
      <button
        className={`psl-wish${wishlisted ? " psl-wish--on" : ""}`}
        onClick={e => {
          e.stopPropagation();
          wishlisted ? removeFromWishlist(product._id) : addToWishlist(product);
        }}
        aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        aria-pressed={wishlisted}
      >
        <HeartIcon filled={wishlisted} />
      </button>
    </div>
  );
};

/* ════════════════════════════════
   INFO CARD — premium glass card
   Name, description, key features, price, CTAs.
════════════════════════════════ */
const InfoCard = ({ product, onNavigate }) => {
  const { addToCart, cartItems } = useCart();

  if (!product) return null;

  const label    = categoryLabel(product);
  const features = getFeatures(product);
  const inCart   = cartItems.some(i => i._id === product._id);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={product._id + "-info"}
        className="psl-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{    opacity: 0, y: 12 }}
        transition={{ duration: 0.4, ease: EASE }}
      >
        {label && <span className="psl-card-cat">{label}</span>}

        <h3 className="psl-card-name">{product.name}</h3>

        {product.description && (
          <p className="psl-card-desc">{product.description}</p>
        )}

        {features.length > 0 && (
          <ul className="psl-card-features">
            {features.map((f, i) => (
              <li key={i}>
                <SparkIcon />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="psl-card-price-row">
          <span className="psl-card-price">
            ₹{product.price?.toLocaleString("en-IN")}
          </span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="psl-card-price-old">
              ₹{product.originalPrice.toLocaleString("en-IN")}
            </span>
          )}
        </div>

        <div className="psl-card-actions">
          <button
            className={`psl-card-add${inCart ? " psl-card-add--done" : ""}`}
            onClick={() => addToCart(product)}
            aria-label={inCart ? `${product.name} added to cart` : `Add ${product.name} to cart`}
            aria-pressed={inCart}
          >
            {inCart ? <CheckIcon /> : <CartIcon />}
            <span>{inCart ? "Added" : "Add To Cart"}</span>
          </button>

          <a
            href={`/product/${product._id}`}
            className="psl-card-view"
            onClick={e => { e.preventDefault(); onNavigate(); }}
          >
            View Details <ArrowIcon />
          </a>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

/* ════════════════════════════════
   THUMBNAIL (rail / strip)
   Image-only. Active state highlighted.
════════════════════════════════ */
const Thumbnail = ({ product, active, onActivate }) => {
  const image = resolveImage(product);
  const label = categoryLabel(product);
  const disc  = discountPct(product.price, product.originalPrice);

  return (
    <button
      type="button"
      className={`psl-thumb${active ? " psl-thumb--active" : ""}`}
      onMouseEnter={onActivate}
      onClick={onActivate}
      aria-label={`Show ${product.name}`}
      aria-current={active ? "true" : undefined}
    >
      {image
        ? (
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            decoding="async"
            width="64"
            height="64"
          />
        )
        : <PlaceholderSVG />
      }

      {disc && <span className="psl-thumb-badge psl-thumb-badge--sale">−{disc}%</span>}
      {!disc && product.featured && <span className="psl-thumb-badge">★</span>}

      {label && <span className="psl-sr-only">{label}</span>}
    </button>
  );
};

/* ════════════════════════════════
   PRODUCT SPOTLIGHT — main export
════════════════════════════════ */
const ProductSpotlight = ({ title, type, products: propProducts }) => {
  const { products: ctxProducts } = useProducts();
  const navigate = useNavigate();

  /* ── Product filtering (identical logic to original) ── */
  const allProducts = propProducts ?? ctxProducts;

  let items =
    type === "featured"  ? allProducts.filter(p => p.featured)  :
    type === "trending"  ? allProducts.filter(p => p.trending)  :
    [];

  // Fallback: if filter yields nothing but props were passed, show all props
  if (propProducts && items.length === 0) items = propProducts;

  const display = items.slice(0, 5);

  /* ── Active thumbnail state ── */
  const [activeIdx, setActiveIdx] = useState(0);
  const handleActivate = useCallback(i => setActiveIdx(i), []);

  /*
    Clamp activeIdx if the list shrinks (e.g. filtered products change).
    useMemo avoids recompute unless display.length actually changes.
  */
  const safeActiveIdx = useMemo(
    () => Math.min(activeIdx, Math.max(display.length - 1, 0)),
    [activeIdx, display.length]
  );

  if (display.length === 0) return null;

  const eyebrow = type === "featured" ? "Featured Collection" : "Trending Now";
  const focused = display[safeActiveIdx] ?? display[0];
  const goToProduct = useCallback(
    () => navigate(`/product/${focused._id}`),
    [navigate, focused?._id]
  );

  return (
    <section className="psl-section">
      <div className="psl-container">
        <div className="psl-layout">

          {/* ── Header — eyebrow / title / subtitle / view all ── */}
          <div className="psl-header">
            <div className="psl-header-left">
              <p className="psl-eyebrow">{eyebrow}</p>
              <h2 className="psl-title">{title}</h2>
              <p className="psl-subtitle">Engineered for riders who demand performance</p>
            </div>

            <a href="/store" className="psl-view-all" aria-label="View all products">
              View All <ArrowIcon />
            </a>
          </div>

          {/* ── Hero — large center product image ── */}
          <HeroPanel product={focused} onNavigate={goToProduct} />

          {/* ── Thumbnail rail (desktop) / strip (mobile) ── */}
          <div className="psl-thumbs" role="list">
            {display.map((product, i) => (
              <Thumbnail
                key={product._id}
                product={product}
                active={i === safeActiveIdx}
                onActivate={() => handleActivate(i)}
              />
            ))}
          </div>

          {/* ── Progress bar (mobile only) — shows position in collection ── */}
          <div className="psl-progress" role="presentation" aria-hidden="true">
            {display.map((_, i) => (
              <span
                key={i}
                className={`psl-progress-dot${i === safeActiveIdx ? " psl-progress-dot--active" : ""}`}
              />
            ))}
          </div>

          {/* ── Glass info card — name, desc, features, price, CTAs ── */}
          <InfoCard product={focused} onNavigate={goToProduct} />

        </div>
      </div>
    </section>
  );
};

export default ProductSpotlight;