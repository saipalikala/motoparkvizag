/* ================================================
   BentoGrid.jsx — Split-Screen Product Theater
   Concept 03 — light theme, production-ready

   Layout:
   ┌──────────────────────┬──────────────────┐
   │                      │  item row 1      │
   │   BIG FOCAL IMAGE    │  item row 2      │
   │   + product info     │  item row 3      │
   │                      │  item row 4      │
   └──────────────────────┴──────────────────┘

   Interactions:
   • Hover a row → image + info on left updates instantly
   • Active row has orange left bar + accent background
   • Image crossfades with CSS opacity transition
   • Add-to-cart inline per row, wishlist on left panel
   • All data wiring identical to original BentoGrid
   ================================================ */
import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProducts } from "@/context/ProductContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useNavigate } from "react-router-dom";
import { API as BASE_URL } from "@/config/api";
import "./BentoGrid.css";

const EASE = [0.25, 0.46, 0.45, 0.94];

/* ── Image URL resolver (unchanged from original) ── */
function resolveImage(product) {
    const raw = product?.images?.[0] || product?.variants?.[0]?.images?.[0];
    if (!raw) return null;
    return raw.startsWith("http") ? raw : `${BASE_URL}${raw.startsWith("/") ? "" : "/"}${raw}`;
}

/* ── Category label resolver (unchanged) ── */
function categoryLabel(product) {
    if (!product?.category) return null;
    if (typeof product.category === "object") return product.category.name;
    if (product.category.length !== 24) return product.category;
    return null;
}

/* ── Discount % ── */
function discountPct(price, original) {
    if (!original || original <= price) return null;
    return Math.round((1 - price / original) * 100);
}

/* ── Icons ── */
const HeartIcon = ({ filled }) => (
    <svg width="17" height="17" viewBox="0 0 24 24"
        fill={filled ? "#ff6b3d" : "none"}
        stroke={filled ? "#ff6b3d" : "currentColor"}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
);
const CartIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
);
const ArrowIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2.5 7H11.5M7.5 3L11.5 7L7.5 11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
const CheckIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

/* ── Fallback placeholder SVG ── */
const PlaceholderSVG = () => (
    <svg viewBox="0 0 240 240" fill="none" className="bento-placeholder-svg">
        <circle cx="60"  cy="175" r="48" stroke="rgba(232,84,30,0.12)" strokeWidth="8" />
        <circle cx="180" cy="175" r="48" stroke="rgba(232,84,30,0.12)" strokeWidth="8" />
        <path d="M60 175 L108 95 L168 95 L180 175"
            stroke="rgba(232,84,30,0.28)" strokeWidth="5.5" fill="none"
            strokeLinecap="round" strokeLinejoin="round" />
        <path d="M168 95 L184 70 L208 74"
            stroke="rgba(232,84,30,0.32)" strokeWidth="5" fill="none"
            strokeLinecap="round" strokeLinejoin="round" />
        <rect x="100" y="118" width="58" height="32" rx="7"
            fill="rgba(232,84,30,0.08)" stroke="rgba(232,84,30,0.22)" strokeWidth="1.5" />
    </svg>
);

/* ════════════════════════════════
   LEFT PANEL — big focal display
════════════════════════════════ */
const FocalPanel = ({ product, onNavigate }) => {
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
    if (!product) return <div className="bsg-focal" />;

    const image      = resolveImage(product);
    const wishlisted = isInWishlist(product._id);
    const label      = categoryLabel(product);
    const disc       = discountPct(product.price, product.originalPrice);

    return (
        <div className="bsg-focal" onClick={onNavigate} role="button" tabIndex={0}
            onKeyDown={e => e.key === "Enter" && onNavigate()}>

            {/* image crossfade */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={product._id}
                    className="bsg-focal-img"
                    initial={{ opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.42, ease: EASE }}
                >
                    {image
                        ? <img src={image} alt={product.name} loading="eager" decoding="async" />
                        : <PlaceholderSVG />
                    }
                </motion.div>
            </AnimatePresence>

            {/* overlay gradient */}
            <div className="bsg-focal-grad" />

            {/* wishlist */}
            <button
                className={`bsg-wish ${wishlisted ? "bsg-wish--on" : ""}`}
                onClick={e => { e.stopPropagation(); wishlisted ? removeFromWishlist(product._id) : addToWishlist(product); }}
                aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
                <HeartIcon filled={wishlisted} />
            </button>

            {/* tags */}
            {disc && <span className="bsg-focal-tag bsg-focal-tag--sale">−{disc}%</span>}
            {!disc && product.featured && <span className="bsg-focal-tag">Featured</span>}

            {/* bottom info */}
            <div className="bsg-focal-info">
                {label && <span className="bsg-focal-cat">{label}</span>}
                <AnimatePresence mode="wait">
                    <motion.div key={product._id + "-info"}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.3, ease: EASE }}>
                        <h3 className="bsg-focal-name">{product.name}</h3>
                        <div className="bsg-focal-price-row">
                            <span className="bsg-focal-price">
                                ₹{product.price?.toLocaleString("en-IN")}
                            </span>
                            {product.originalPrice && (
                                <span className="bsg-focal-price-old">
                                    ₹{product.originalPrice?.toLocaleString("en-IN")}
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
   RIGHT PANEL — product list rows
════════════════════════════════ */
const ListRow = ({ product, active, onHover, onSelect, index }) => {
    const { addToCart, cartItems } = useCart();
    const navigate = useNavigate();
    const image   = resolveImage(product);
    const inCart  = cartItems.some(i => i._id === product._id);
    const label   = categoryLabel(product);
    const disc    = discountPct(product.price, product.originalPrice);

    const lastTap = useRef(0);

    const handleTap = useCallback(() => {
        const now = Date.now();
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            if (now - lastTap.current < 350) {
                // double tap → go to product
                navigate(`/product/${product._id}`);
            } else {
                // single tap → show in hero
                onSelect();
            }
            lastTap.current = now;
        } else {
            // desktop: single click goes to product page
            navigate(`/product/${product._id}`);
        }
    }, [navigate, product._id, onSelect]);

    return (
        <motion.div
            className={`bsg-row ${active ? "bsg-row--active" : ""}`}
            onMouseEnter={onHover}
            onClick={handleTap}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === "Enter" && navigate(`/product/${product._id}`)}
            aria-label={`View ${product.name}`}
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: index * 0.07, ease: EASE }}
        >
            {/* left accent bar */}
            <div className="bsg-row-bar" />

            {/* thumbnail */}
            <div className="bsg-row-thumb">
                {image
                    ? <img src={image} alt={product.name} loading="lazy" decoding="async" />
                    : <PlaceholderSVG />
                }
            </div>

            {/* text */}
            <div className="bsg-row-text">
                {label && <span className="bsg-row-cat">{label}</span>}
                <p className="bsg-row-name">{product.name}</p>
                <div className="bsg-row-meta">
                    {product.featured && <span className="bsg-row-badge">Featured</span>}
                    {product.trending && !product.featured && <span className="bsg-row-badge bsg-row-badge--trend">Hot</span>}
                    {disc && <span className="bsg-row-badge bsg-row-badge--sale">−{disc}%</span>}
                </div>
            </div>

            {/* price + add */}
            <div className="bsg-row-right" onClick={e => e.stopPropagation()}>
                <div className="bsg-row-prices">
                    <span className="bsg-row-price">₹{product.price?.toLocaleString("en-IN")}</span>
                    {product.originalPrice && (
                        <span className="bsg-row-price-old">₹{product.originalPrice?.toLocaleString("en-IN")}</span>
                    )}
                </div>
                <button
                    className={`bsg-row-add ${inCart ? "bsg-row-add--done" : ""}`}
                    onClick={e => { e.stopPropagation(); addToCart(product); }}
                    aria-label={inCart ? "Added to cart" : "Add to cart"}
                >
                    {inCart ? <CheckIcon /> : <CartIcon />}
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

    /* ── same filter logic as original ── */
    const allProducts = propProducts ?? ctxProducts;
    let items = type === "featured"
        ? allProducts.filter(p => p.featured)
        : type === "trending"
            ? allProducts.filter(p => p.trending)
            : [];
    if (propProducts && items.length === 0) items = propProducts;
    const display = items.slice(0, 5);

    const [activeIdx, setActiveIdx] = useState(0);
    const handleHover = useCallback((i) => setActiveIdx(i), []);

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
                    transition={{ duration: 0.6, ease: EASE }}
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

                {/* ── Theater split ── */}
                <motion.div
                    className="bsg-theater"
                    initial={{ opacity: 0, y: 32 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.65, delay: 0.1, ease: EASE }}
                >
                    {/* LEFT — focal panel */}
                    <FocalPanel
                        product={focused}
                        onNavigate={() => navigate(`/product/${focused._id}`)}
                    />

                    {/* DIVIDER */}
                    <div className="bsg-divider" />

                    {/* RIGHT — list */}
                    <div className="bsg-list">
                        {display.map((product, i) => (
<ListRow
    key={product._id}
    product={product}
    active={i === activeIdx}
    onHover={() => handleHover(i)}
    onSelect={() => handleHover(i)}
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