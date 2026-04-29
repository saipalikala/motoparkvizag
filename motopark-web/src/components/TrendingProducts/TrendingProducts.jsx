/* ================================================
   TrendingProducts.jsx — Premium Light Theme
   
   Full port of the dark reference to a clean
   light theme. All dark hard-coded values removed;
   colour logic lives entirely in TrendingProducts.css
   via CSS custom properties.

   FEATURES (unchanged):
   ✅ Category filter bar (All / Helmets / Jackets / Gloves / Boots)
   ✅ Products filtered by their OWN category
   ✅ Star ratings from product.rating / product.reviews
   ✅ Badge logic: Hot · New · Sale
   ✅ Numbered watermark per card (01, 02 …)
   ✅ Framer Motion entrance stagger + whileHover lift
   ✅ Wishlist toggle with filled heart
   ✅ Cart add/added toggle with checkmark icon swap
   ✅ Scroll-driven progress dots (direct DOM, no re-render)
   ✅ Arrow controls scroll rail
   ✅ AnimatePresence for smooth category filter transition
   ================================================ */

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProducts } from "@/context/ProductContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useNavigate } from "react-router-dom";
import { API } from "@/config/api";
import "./TrendingProducts.css";

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const EASE = [0.22, 1, 0.36, 1];
const CARD_SCROLL = 236; /* px per scroll step */

const FILTERS = [
    { label: "All Gear", key: "all"     },
    { label: "Helmets",  key: "helmets" },
    { label: "Jackets",  key: "jackets" },
    { label: "Gloves",   key: "gloves"  },
    { label: "Boots",    key: "boots"   },
];

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function resolveImage(product) {
    const raw = product?.variants?.[0]?.images?.[0] || product?.images?.[0];
    if (!raw) return null;
    return raw.startsWith("http") ? raw : `${API}${raw.startsWith("/") ? "" : "/"}${raw}`;
}

function getCategoryName(product) {
    if (!product.category) return "";
    if (typeof product.category === "object") return (product.category.name || "").toLowerCase();
    if (/^[a-f\d]{24}$/i.test(product.category)) return "";
    return product.category.toLowerCase();
}

function getBadge(product) {
    if (product.trending) return "hot";
    if (product.originalPrice && product.originalPrice > product.price) return "sale";
    if (product.newArrival || product.isNew) return "new";
    return null;
}

/* ─────────────────────────────────────────────
   ICONS
───────────────────────────────────────────── */
const HeartIcon = ({ filled }) => (
    <svg width="13" height="13" viewBox="0 0 24 24"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
);

const CartIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
);

const CheckIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const ChevronLeft = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6" />
    </svg>
);

const ChevronRight = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18l6-6-6-6" />
    </svg>
);

const ArrowRight = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
);

/* ─────────────────────────────────────────────
   STAR RATING
───────────────────────────────────────────── */
const StarIcon = ({ type }) => (
    <svg className={`tp-star tp-star--${type}`} width="10" height="10" viewBox="0 0 12 12">
        <path d="M6 1l1.3 2.6 2.9.4-2.1 2 .5 2.9L6 7.5 3.4 8.9l.5-2.9-2.1-2 2.9-.4z" />
    </svg>
);

const StarRating = ({ rating = 0, count }) => {
    const stars = Array.from({ length: 5 }, (_, i) => {
        if (rating >= i + 1) return "full";
        if (rating >= i + 0.5) return "half";
        return "empty";
    });
    return (
        <div className="tp-rating">
            {/* SVG defs for half-star gradient — light theme uses ink-orange */}
            <svg width="0" height="0" style={{ position: "absolute" }}>
                <defs>
                    <linearGradient id="tpHalfFill" x1="0" x2="1" y1="0" y2="0">
                        <stop offset="50%" stopColor="#e8541e" />
                        <stop offset="50%" stopColor="#d4d0ca" />
                    </linearGradient>
                </defs>
            </svg>
            <div className="tp-stars">
                {stars.map((type, i) => <StarIcon key={i} type={type} />)}
            </div>
            {count != null && <span className="tp-rating-count">({count})</span>}
        </div>
    );
};

/* ─────────────────────────────────────────────
   IMAGE PLACEHOLDER  (light neutral palette)
───────────────────────────────────────────── */
const PlaceholderSVG = () => (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="64" rx="12" fill="#ede9e3" />
        <path d="M20 44 L20 26 Q20 20 32 20 Q44 20 44 26 L44 44 Z"
            fill="#d4cfc7" stroke="#c5bfb6" strokeWidth="1" />
        <rect x="24" y="30" width="16" height="8" rx="2"
            fill="#e8541e" opacity="0.25" stroke="#e8541e" strokeWidth="0.5" strokeOpacity="0.4" />
        <circle cx="32" cy="46" r="3" fill="#c5bfb6" />
    </svg>
);

/* ─────────────────────────────────────────────
   TREND CARD
───────────────────────────────────────────── */
const TrendCard = ({ product, index }) => {
    const { addToCart, cartItems } = useCart();
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
    const navigate = useNavigate();

    const inCart     = cartItems.some(i => i._id === product._id);
    const wishlisted = isInWishlist(product._id);
    const image      = resolveImage(product);
    const badge      = getBadge(product);
    const catName    = getCategoryName(product);
    const catDisplay = catName ? catName.charAt(0).toUpperCase() + catName.slice(1) : null;
    const num        = String(index + 1).padStart(2, "0");

    const handleCartClick = (e) => {
        e.stopPropagation();
        addToCart(product);
    };

    const handleWishClick = (e) => {
        e.stopPropagation();
        wishlisted ? removeFromWishlist(product._id) : addToWishlist(product);
    };

    return (
        <motion.div
            className="tp-card"
            onClick={() => navigate(`/product/${product._id}`)}
            role="button"
            tabIndex={0}
            aria-label={`View ${product.name}`}
            onKeyDown={(e) => e.key === "Enter" && navigate(`/product/${product._id}`)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.45, delay: index * 0.05, ease: EASE }}
            whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.3, ease: EASE } }}
            layout
        >
            {/* ── Image zone ── */}
            <div className="tp-card-img">
                {image
                    ? <img src={image} alt={product.name} loading="lazy" decoding="async" className="tp-img" />
                    : (
                        <div className="tp-img-placeholder">
                            <PlaceholderSVG />
                        </div>
                    )
                }

                <span className="tp-card-number">{num}</span>

                {badge && (
                    <span className={`tp-badge tp-badge--${badge}`}>
                        {badge === "hot" ? "Hot" : badge === "new" ? "New" : "Sale"}
                    </span>
                )}

                <button
                    className={`tp-wish ${wishlisted ? "tp-wish--active" : ""}`}
                    onClick={handleWishClick}
                    aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
                >
                    <HeartIcon filled={wishlisted} />
                </button>
            </div>

            {/* ── Card body ── */}
            <div className="tp-card-body">
                {catDisplay && <p className="tp-cat">{catDisplay}</p>}

                <p className="tp-name" title={product.name}>{product.name}</p>

                <StarRating
                    rating={product.rating ?? product.averageRating ?? 0}
                    count={product.reviewCount ?? product.numReviews ?? product.reviews?.length ?? null}
                />

                <div className="tp-card-footer">
                    <div className="tp-price-block">
                        {product.originalPrice && product.originalPrice > product.price
                            ? <span className="tp-old-price">₹{product.originalPrice.toLocaleString("en-IN")}</span>
                            : <span className="tp-old-price">&nbsp;</span>
                        }
                        <span className="tp-price">₹{product.price?.toLocaleString("en-IN")}</span>
                    </div>

                    <button
                        className={`tp-add-btn ${inCart ? "tp-add-btn--added" : ""}`}
                        onClick={handleCartClick}
                        aria-label={inCart ? "Added to cart" : "Add to cart"}
                    >
                        {inCart ? <CheckIcon /> : <CartIcon />}
                        <span>{inCart ? "Added" : "Add"}</span>
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

/* ─────────────────────────────────────────────
   TRENDING PRODUCTS — MAIN COMPONENT
───────────────────────────────────────────── */
function TrendingProducts({ products: propProducts }) {
    const { products: ctxProducts } = useProducts();
    const railRef  = useRef(null);
    const dotsRef  = useRef([]);

    const [activeFilter, setActiveFilter] = useState("all");

    const source = useMemo(() => {
        const raw = propProducts ?? ctxProducts;
        return propProducts ? propProducts : raw.filter(p => p.trending);
    }, [propProducts, ctxProducts]);

    const presentCategories = useMemo(() => {
        const cats = new Set(source.map(getCategoryName).filter(Boolean));
        return cats;
    }, [source]);

    const filtered = useMemo(() => {
        if (activeFilter === "all") return source;
        return source.filter(p => getCategoryName(p) === activeFilter);
    }, [source, activeFilter]);

    /* ── Scroll controls ── */
    const scroll = useCallback((dir) => {
        railRef.current?.scrollBy({ left: dir === "left" ? -CARD_SCROLL : CARD_SCROLL, behavior: "smooth" });
    }, []);

    /* ── Progress dots — direct DOM, no setState ── */
    useEffect(() => {
        const rail = railRef.current;
        if (!rail) return;
        const onScroll = () => {
            const idx = Math.round(rail.scrollLeft / CARD_SCROLL);
            dotsRef.current.forEach((dot, i) => {
                if (!dot) return;
                dot.classList.toggle("tp-dot--active", i === idx);
            });
        };
        rail.addEventListener("scroll", onScroll, { passive: true });
        return () => rail.removeEventListener("scroll", onScroll);
    }, [filtered.length]);

    /* Reset on filter change */
    useEffect(() => {
        if (railRef.current) railRef.current.scrollLeft = 0;
        dotsRef.current.forEach((dot, i) => {
            if (!dot) return;
            dot.classList.toggle("tp-dot--active", i === 0);
        });
    }, [activeFilter]);

    if (!source.length) return null;

    const visibleFilters = FILTERS.filter(f => f.key === "all" || presentCategories.has(f.key));

    return (
        <section className="tp-section">
            <div className="tp-container">

                {/* ── Header ── */}
                <motion.div
                    className="tp-header"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.6, ease: EASE }}
                >
                    <div className="tp-header-left">
                        <p className="tp-eyebrow">This Week</p>
                        <h2 className="tp-title">
                            Trending <span className="tp-title-accent">Gear</span>
                        </h2>
                        <p className="tp-sub">Most loved by riders this week</p>
                    </div>

                    <div className="tp-controls">
                        <button className="tp-ctrl-btn" onClick={() => scroll("left")} aria-label="Scroll left">
                            <ChevronLeft />
                        </button>
                        <button className="tp-ctrl-btn" onClick={() => scroll("right")} aria-label="Scroll right">
                            <ChevronRight />
                        </button>
                    </div>
                </motion.div>

                {/* ── Filter bar ── */}
                <motion.div
                    className="tp-filter-bar"
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
                >
                    {visibleFilters.map(f => (
                        <button
                            key={f.key}
                            className={`tp-filter ${activeFilter === f.key ? "tp-filter--active" : ""}`}
                            onClick={() => setActiveFilter(f.key)}
                        >
                            {f.label}
                        </button>
                    ))}
                </motion.div>

                {/* ── Card rail ── */}
                <div className="tp-rail-wrap">
                    <div className="tp-rail" ref={railRef}>
                        <AnimatePresence mode="popLayout">
                            {filtered.length > 0
                                ? filtered.map((product, i) => (
                                    <TrendCard key={product._id} product={product} index={i} />
                                ))
                                : (
                                    <motion.div
                                        className="tp-empty"
                                        key="empty"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <p>No products in this category yet.</p>
                                    </motion.div>
                                )
                            }
                        </AnimatePresence>
                    </div>
                </div>

                {/* ── Bottom row: dots + view all ── */}
                <div className="tp-bottom-row">
                    <div className="tp-dots" aria-label="Scroll position">
                        {filtered.slice(0, Math.min(filtered.length, 8)).map((_, i) => (
                            <div
                                key={i}
                                ref={el => { dotsRef.current[i] = el; }}
                                className={`tp-dot ${i === 0 ? "tp-dot--active" : ""}`}
                                onClick={() => {
                                    railRef.current?.scrollTo({ left: i * CARD_SCROLL, behavior: "smooth" });
                                }}
                                role="button"
                                aria-label={`Go to position ${i + 1}`}
                            />
                        ))}
                    </div>

                    <a href="/products" className="tp-view-all">
                        View all gear <ArrowRight />
                    </a>
                </div>

            </div>
        </section>
    );
}

export default TrendingProducts;