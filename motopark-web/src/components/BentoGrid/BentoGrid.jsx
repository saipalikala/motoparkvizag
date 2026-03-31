/* ================================================
   File: motopark-web/src/components/BentoGrid/BentoGrid.jsx

   CHANGE: accepts `products` prop instead of calling useProducts().
   This eliminates the internal dependency on ProductContext for homepage.
   Still works with ProductContext if used on other pages (backwards compatible).
   ================================================ */
import { useProducts } from "@/context/ProductContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useNavigate } from "react-router-dom";
import "./BentoGrid.css";
import { API as BASE_URL } from "@/config/api";

/* ─── BIKE SVG ILLUSTRATION ─── */
const BikeSVG = ({ size = "small" }) => {
    const isHero = size === "hero";
    const W = isHero ? 480 : 300;
    const H = isHero ? 290 : 210;
    const cx1 = isHero ? 128 : 76;
    const cx2 = isHero ? 362 : 224;
    const cy = isHero ? 210 : 150;
    const r = isHero ? 74 : 54;
    const ri = isHero ? 58 : 42;
    const hub = isHero ? 13 : 10;

    const spokeOffsets = [
        [0, -1], [0, 1], [-1, 0], [1, 0],
        [-0.7, -0.7], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7]
    ];

    const renderWheel = (cx) => (
        <g key={cx}>
            <circle cx={cx} cy={cy} r={r} stroke="rgba(255,255,255,0.16)" strokeWidth={isHero ? 9 : 7} fill="none" />
            <circle cx={cx} cy={cy} r={ri} stroke="rgba(255,255,255,0.07)" strokeWidth="1.5" fill="none" />
            <circle cx={cx} cy={cy} r={hub} fill="rgba(255,107,61,0.4)" />
            {spokeOffsets.map(([dx, dy], i) => (
                <line key={i}
                    x1={cx + dx * (hub + 2)} y1={cy + dy * (hub + 2)}
                    x2={cx + dx * (ri - 2)} y2={cy + dy * (ri - 2)}
                    stroke="rgba(255,255,255,0.13)" strokeWidth="1.2"
                />
            ))}
        </g>
    );

    if (isHero) return (
        <svg className="bike-svg hero-bike" viewBox={`0 0 ${W} ${H}`} fill="none">
            {renderWheel(128)} {renderWheel(362)}
            <path d="M128 210 L222 102 L316 102 L362 210" stroke="rgba(255,255,255,0.8)" strokeWidth="5.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M222 102 L202 210 L128 210" stroke="rgba(255,255,255,0.4)" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M316 102 L344 175 L362 210" stroke="rgba(255,255,255,0.6)" strokeWidth="4.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M316 102 L336 78 L380 84" stroke="rgba(255,255,255,0.88)" strokeWidth="5.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M222 102 L196 92 L170 93" stroke="rgba(255,255,255,0.88)" strokeWidth="5" fill="none" strokeLinecap="round" />
            <rect x="196" y="134" width="96" height="56" rx="10" fill="rgba(255,107,61,0.1)" stroke="rgba(255,107,61,0.42)" strokeWidth="1.5" />
            <path d="M198 188 L168 200 L150 220" stroke="#ff6b3d" strokeWidth="4.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
            <path d="M316 102 L334 118 L340 140" stroke="rgba(255,107,61,0.5)" strokeWidth="3" fill="none" strokeLinecap="round" />
        </svg>
    );

    return (
        <svg className="bike-svg" viewBox={`0 0 ${W} ${H}`} fill="none">
            {renderWheel(76)} {renderWheel(224)}
            <path d="M76 150 L140 62 L204 62 L224 150" stroke="rgba(255,255,255,0.78)" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M140 62 L124 150 L76 150" stroke="rgba(255,255,255,0.38)" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M204 62 L213 108 L224 150" stroke="rgba(255,255,255,0.55)" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M204 62 L222 44 L250 48" stroke="rgba(255,255,255,0.88)" strokeWidth="4.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M140 62 L122 55 L108 55" stroke="rgba(255,255,255,0.88)" strokeWidth="4" fill="none" strokeLinecap="round" />
            <rect x="126" y="94" width="66" height="38" rx="7" fill="rgba(255,107,61,0.1)" stroke="rgba(255,107,61,0.38)" strokeWidth="1.2" />
            <path d="M122 146 L100 156 L90 168" stroke="#ff6b3d" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
        </svg>
    );
};

const HeartIcon = ({ filled }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "#ff6b3d" : "none"}
        stroke={filled ? "#ff6b3d" : "currentColor"} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
);

const CartIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
);

const BentoCard = ({ product, size = "small" }) => {
    const { addToCart, cartItems } = useCart();
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
    const navigate = useNavigate();

    const wishlisted = isInWishlist(product._id);
    const inCart = cartItems.some(i => i._id === product._id);

    const rawImage = product.images?.[0] || product.variants?.[0]?.images?.[0] || null;
    const image = rawImage
        ? rawImage.startsWith("http") ? rawImage : `${BASE_URL}${rawImage.startsWith("/") ? "" : "/"}${rawImage}`
        : null;

    const isHero = size === "hero";

    const categoryLabel = product.category && typeof product.category === "object"
        ? product.category?.name
        : (product.category?.length === 24 ? null : product.category);

    return (
        <div
            className={`bento-card ${isHero ? "bento-card--hero" : "bento-card--small"}`}
            onClick={() => navigate(`/product/${product._id}`)}
            role="button" tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate(`/product/${product._id}`)}>
            <div className="card-accent" />
            <div className="card-image">
                {image
                    ? <img
                        src={image}
                        alt={product.name}
                        className="card-photo"
                        loading="lazy"
                        decoding="async"
                    />
                    : <BikeSVG size={size} />
                }
            </div>
            <div className="card-gradient" />
            <button
                className={`card-wishlist ${wishlisted ? "card-wishlist--active" : ""}`}
                onClick={(e) => { e.stopPropagation(); wishlisted ? removeFromWishlist(product._id) : addToWishlist(product); }}
                aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}>
                <HeartIcon filled={wishlisted} />
            </button>
            {product.featured && <span className="corner-tag">Featured</span>}
            {product.trending && !product.featured && <span className="corner-tag corner-tag--new">New</span>}
            <div className="card-info">
                {categoryLabel && <span className="card-badge">{categoryLabel}</span>}
                <h3 className="card-name">{product.name}</h3>
                <div className="card-footer">
                    <div className="price-row">
                        <span className="card-price">₹{product.price?.toLocaleString("en-IN")}</span>
                        {product.originalPrice && (
                            <span className="price-original">₹{product.originalPrice?.toLocaleString("en-IN")}</span>
                        )}
                    </div>
                    <button
                        className={`card-cart-btn ${inCart ? "card-cart-btn--added" : ""}`}
                        onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                        aria-label="Add to cart">
                        <CartIcon /><span>{inCart ? "Added" : "Add"}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ════════════════════════════════
   BENTO GRID
   ✅ Now accepts `products` prop from Home.jsx
   ✅ Falls back to ProductContext if used standalone
════════════════════════════════ */
const BentoGrid = ({ title, type, products: propProducts }) => {
    /* If products passed as prop (from Home.jsx) use those.
       Otherwise fall back to ProductContext (for other pages). */
    const { products: ctxProducts } = useProducts();
    const allProducts = propProducts || ctxProducts;

    let items = [];
    if (type === "featured") items = allProducts.filter(p => p.featured);
    if (type === "trending") items = allProducts.filter(p => p.trending);

    /* If products came from prop, they're already filtered — use directly */
    if (propProducts && items.length === 0) items = propProducts;

    const display = items.slice(0, 5);
    if (display.length === 0) return null;

    return (
        <section className="bento-section">
            <div className="bento-container">
                <header className="bento-header">
                    <div className="header-left">
                        <p className="bento-eyebrow">
                            {type === "featured" ? "Featured Collection" : "Trending Now"}
                        </p>
                        <h2 className="bento-title">{title}</h2>
                        <p className="bento-subtitle">Engineered for riders who demand performance</p>
                    </div>
                    <a href="/products" className="view-all-btn">
                        View All
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M2.5 7H11.5M7.5 3L11.5 7L7.5 11"
                                stroke="white" strokeWidth="1.7"
                                strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </a>
                </header>
                <div className="bento-grid">
                    <div className="bento-hero">
                        <BentoCard product={display[0]} size="hero" />
                    </div>
                    <div className="bento-small">
                        {display.slice(1).map(product => (
                            <div className="bento-item" key={product._id}>
                                <BentoCard product={product} size="small" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default BentoGrid;