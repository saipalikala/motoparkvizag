/* ================================================
   BentoGrid.jsx — Split-Screen Product Theater
   Mobile-first, performance-optimized, production-grade.

   Layout:
   Desktop  ┌──────────────────────┬──────────────────┐
            │                      │  item row 1      │
            │   BIG FOCAL IMAGE    │  item row 2      │
            │   + product info     │  item row 3      │
            │                      │  item row 4      │
            └──────────────────────┴──────────────────┘

   Mobile   ┌──────────────────────────────────────────┐
            │         BIG FOCAL IMAGE                  │
            │         + product info                   │
            ├──────────────────────────────────────────┤
            │  item row 1                              │
            │  item row 2                              │
            │  item row 3                              │
            └──────────────────────────────────────────┘

   Interactions:
   • Desktop: hover row → focal image + info updates
   • Mobile:  single tap → selects row (updates focal)
              double-tap → navigates to product page
   • Wishlist button on focal panel
   • Add-to-cart per row; icon-only below 480px
   ================================================ */
import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProducts } from "@/context/ProductContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useNavigate } from "react-router-dom";
import { API as BASE_URL } from "@/config/api";
import "./BentoGrid.css";

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

/* ────────────────────────────────
   ICONS
   Kept as lightweight inline SVGs — no icon font overhead.
──────────────────────────────── */
const HeartIcon = ({ filled }) => (
  <svg
    width="17" height="17" viewBox="0 0 24 24"
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
    width="13" height="13" viewBox="0 0 24 24" fill="none"
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
    width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

/* ── Fallback when product has no image ── */
const PlaceholderSVG = () => (
  <svg viewBox="0 0 240 240" fill="none" className="bsg-placeholder-svg" aria-hidden="true">
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
   FOCAL PANEL (left / top)
════════════════════════════════ */
const FocalPanel = ({ product, onNavigate }) => {
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  if (!product) return <div className="bsg-focal" aria-hidden="true" />;

  const image      = resolveImage(product);
  const wishlisted = isInWishlist(product._id);
  const label      = categoryLabel(product);
  const disc       = discountPct(product.price, product.originalPrice);

  return (
    <div
      className="bsg-focal"
      onClick={onNavigate}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === "Enter" && onNavigate()}
      aria-label={`View ${product.name}`}
    >
      {/* ── Crossfade image ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={product._id}
          className="bsg-focal-img"
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1,  scale: 1    }}
          exit={{    opacity: 0,  scale: 0.97 }}
          transition={{ duration: 0.4, ease: EASE }}
        >
          {image
            ? (
              <img
                src={image}
                alt={product.name}
                /*
                  loading="eager" for the focal — it's above the fold and the
                  most important image on this component. Lazy-loading it would
                  cause a visible flash.
                */
                loading="eager"
                decoding="async"
                /*
                  fetchpriority="high" tells the browser to prioritize this
                  image in the preload queue (Chrome 101+, Safari 17.2+).
                */
                fetchPriority="high"
              />
            )
            : <PlaceholderSVG />
          }
        </motion.div>
      </AnimatePresence>

      {/* ── Gradient overlay ── */}
      <div className="bsg-focal-grad" />

      {/* ── Wishlist button — stopPropagation prevents product navigation ── */}
      <button
        className={`bsg-wish${wishlisted ? " bsg-wish--on" : ""}`}
        onClick={e => {
          e.stopPropagation();
          wishlisted ? removeFromWishlist(product._id) : addToWishlist(product);
        }}
        aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        aria-pressed={wishlisted}
      >
        <HeartIcon filled={wishlisted} />
      </button>

      {/* ── Tag pill ── */}
      {disc && (
        <span className="bsg-focal-tag bsg-focal-tag--sale" aria-label={`${disc}% off`}>
          −{disc}%
        </span>
      )}
      {!disc && product.featured && (
        <span className="bsg-focal-tag">Featured</span>
      )}

      {/* ── Bottom info block ── */}
      <div className="bsg-focal-info">
        {label && <span className="bsg-focal-cat">{label}</span>}

        {/*
          Separate AnimatePresence for text so it can crossfade
          independently of the image (they have different durations).
        */}
        <AnimatePresence mode="wait">
          <motion.div
            key={product._id + "-text"}
            initial={{ opacity: 0, y: 8  }}
            animate={{ opacity: 1, y: 0  }}
            exit={{    opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: EASE }}
          >
            <h3 className="bsg-focal-name">{product.name}</h3>

            <div className="bsg-focal-price-row">
              <span className="bsg-focal-price">
                ₹{product.price?.toLocaleString("en-IN")}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="bsg-focal-price-old">
                  ₹{product.originalPrice.toLocaleString("en-IN")}
                </span>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="bsg-focal-cta" onClick={e => e.stopPropagation()}>
          <span className="bsg-focal-hint">View Details →</span>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════
   LIST ROW (right / bottom panel)
════════════════════════════════ */
const ListRow = ({ product, active, onHover, onSelect, index }) => {
  const { addToCart, cartItems } = useCart();
  const navigate = useNavigate();

  const image  = resolveImage(product);
  const inCart = cartItems.some(i => i._id === product._id);
  const label  = categoryLabel(product);
  const disc   = discountPct(product.price, product.originalPrice);

  /*
    Double-tap detection for mobile.
    On mobile: single tap → select (show in focal), double-tap → navigate.
    On desktop: single click → navigate directly.
    This prevents accidental navigation when users are just browsing the list.
  */
  const lastTap = useRef(0);

  const handleTap = useCallback(() => {
    const isMobile = window.matchMedia("(hover: none)").matches;
    if (isMobile) {
      const now = Date.now();
      if (now - lastTap.current < 350) {
        navigate(`/product/${product._id}`);
      } else {
        onSelect();
      }
      lastTap.current = now;
    } else {
      navigate(`/product/${product._id}`);
    }
  }, [navigate, product._id, onSelect]);

  return (
    <motion.div
      className={`bsg-row${active ? " bsg-row--active" : ""}`}
      onMouseEnter={onHover}
      onClick={handleTap}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === "Enter" && navigate(`/product/${product._id}`)}
      aria-label={`View ${product.name}`}
      aria-current={active ? "true" : undefined}
      /*
        whileInView stagger: each row animates in as it enters the viewport.
        once:true ensures no re-animation on scroll back.
        margin:"-40px" triggers slightly before full entry for a smoother feel.
      */
      initial={{ opacity: 0, x: 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: EASE }}
    >
      {/* Orange accent bar */}
      <div className="bsg-row-bar" aria-hidden="true" />

      {/* Thumbnail */}
      <div className="bsg-row-thumb">
        {image
          ? (
            <img
              src={image}
              alt={product.name}
              loading="lazy"
              decoding="async"
              /*
                width/height attributes prevent CLS (Cumulative Layout Shift).
                The CSS will override the display size; these just give the
                browser an aspect ratio hint before the image loads.
              */
              width="56"
              height="56"
            />
          )
          : <PlaceholderSVG />
        }
      </div>

      {/* Product info */}
      <div className="bsg-row-text">
        {label && <span className="bsg-row-cat">{label}</span>}

        <p className="bsg-row-name" title={product.name}>
          {product.name}
        </p>

        <div className="bsg-row-meta">
          {product.featured && (
            <span className="bsg-row-badge">Featured</span>
          )}
          {product.trending && !product.featured && (
            <span className="bsg-row-badge bsg-row-badge--trend">Hot</span>
          )}
          {disc && (
            <span className="bsg-row-badge bsg-row-badge--sale">−{disc}%</span>
          )}
        </div>
      </div>

      {/* Price + Add — stopPropagation prevents row navigation when tapping add */}
      <div className="bsg-row-right" onClick={e => e.stopPropagation()}>
        <div className="bsg-row-prices">
          <span className="bsg-row-price">
            ₹{product.price?.toLocaleString("en-IN")}
          </span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="bsg-row-price-old">
              ₹{product.originalPrice.toLocaleString("en-IN")}
            </span>
          )}
        </div>

        <button
          className={`bsg-row-add${inCart ? " bsg-row-add--done" : ""}`}
          onClick={() => addToCart(product)}
          aria-label={inCart ? `${product.name} added to cart` : `Add ${product.name} to cart`}
          aria-pressed={inCart}
        >
          {inCart ? <CheckIcon /> : <CartIcon />}
          {/* Text hidden on very small viewports via CSS (no JS required) */}
          <span>{inCart ? "Added" : "Add"}</span>
        </button>
      </div>
    </motion.div>
  );
};

/* ════════════════════════════════
   BENTO GRID — main export
════════════════════════════════ */
const BentoGrid = ({ title, type, products: propProducts }) => {
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

  /* ── Active row state ── */
  const [activeIdx, setActiveIdx] = useState(0);
  const handleHover  = useCallback(i => setActiveIdx(i), []);
  const handleSelect = useCallback(i => setActiveIdx(i), []);

  if (display.length === 0) return null;

  const eyebrow = type === "featured" ? "Featured Collection" : "Trending Now";
  const focused = display[activeIdx] ?? display[0];

  return (
    <section className="bsg-section">
      <div className="bsg-container">

        {/* ── Header ── */}
        <motion.header
          className="bsg-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55, ease: EASE }}
        >
          <div className="bsg-header-left">
            <p className="bsg-eyebrow">{eyebrow}</p>
            <h2 className="bsg-title">{title}</h2>
            <p className="bsg-subtitle">Engineered for riders who demand performance</p>
          </div>

          <a href="/store" className="bsg-view-all" aria-label="View all products">
            View All <ArrowIcon />
          </a>
        </motion.header>

        {/* ── Theater ── */}
        <motion.div
          className="bsg-theater"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.08, ease: EASE }}
        >
          {/* LEFT / TOP — focal panel */}
          <FocalPanel
            product={focused}
            onNavigate={() => navigate(`/product/${focused._id}`)}
          />

          {/* Divider — horizontal on mobile, vertical on desktop (CSS handles it) */}
          <div className="bsg-divider" aria-hidden="true" />

          {/* RIGHT / BOTTOM — product list */}
          <div className="bsg-list" role="list">
            {display.map((product, i) => (
              <ListRow
                key={product._id}
                product={product}
                active={i === activeIdx}
                onHover={() => handleHover(i)}
                onSelect={() => handleSelect(i)}
                index={i}
              />
            ))}
          </div>
        </motion.div>

      </div>
    </section>
  );
};

export default BentoGrid;