/* ================================================
   File: motopark-web/src/components/TrendingProducts/TrendingProducts.jsx

   CHANGE: accepts `products` prop from Home.jsx.
   Falls back to ProductContext if used standalone.
   ================================================ */
import { useRef } from "react";
import { useProducts } from "@/context/ProductContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useNavigate } from "react-router-dom";
import "./TrendingProducts.css";
import { API } from "@/config/api";

const HeartIcon = ({ filled }) => (
    <svg width="15" height="15" viewBox="0 0 24 24"
        fill={filled ? "#ff6b3d" : "none"}
        stroke={filled ? "#ff6b3d" : "currentColor"}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
);

const CartIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
);

const ChevronLeft = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6" />
    </svg>
);

const ChevronRight = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18l6-6-6-6" />
    </svg>
);

const TrendCard = ({ product }) => {
    const { addToCart, cartItems } = useCart();
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
    const navigate = useNavigate();

    const inCart = cartItems.some(i => i._id === product._id);
    const wishlisted = isInWishlist(product._id);

    const rawImage = product?.variants?.[0]?.images?.[0] || product?.images?.[0];
    const image = rawImage
        ? rawImage.startsWith("http") ? rawImage : `${API}${rawImage.startsWith("/") ? "" : "/"}${rawImage}`
        : null;

    const categoryLabel = product.category && typeof product.category === "object"
        ? product.category?.name
        : (product.category?.length === 24 ? null : product.category);

    return (
        <div className="trend-card"
            onClick={() => navigate(`/product/${product._id}`)}
            role="button" tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate(`/product/${product._id}`)}>
            <button
                className={`trend-wishlist ${wishlisted ? "trend-wishlist--active" : ""}`}
                onClick={(e) => { e.stopPropagation(); wishlisted ? removeFromWishlist(product._id) : addToWishlist(product); }}
                aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}>
                <HeartIcon filled={wishlisted} />
            </button>
            {categoryLabel && <span className="trend-badge">{categoryLabel}</span>}
            <div className="trend-image-wrap">
                {image
                    ? <img
                        src={image}
                        alt={product.name}
                        className="trend-img"
                        loading="lazy"
                        decoding="async"
                    />
                    : <div className="trend-img-placeholder">
                        <svg viewBox="0 0 80 50" fill="none" width="80" opacity="0.25">
                            <circle cx="18" cy="38" r="10" stroke="white" strokeWidth="2.5" />
                            <circle cx="62" cy="38" r="10" stroke="white" strokeWidth="2.5" />
                            <path d="M18 38 L30 18 L52 18 L62 38" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                }
            </div>
            <div className="trend-info">
                <h4 className="trend-name">{product.name}</h4>
                <div className="trend-footer">
                    <span className="trend-price">₹{product.price?.toLocaleString("en-IN")}</span>
                    <button
                        className={`trend-cart-btn ${inCart ? "trend-cart-btn--added" : ""}`}
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
   TRENDING PRODUCTS
   ✅ Accepts `products` prop from Home.jsx
   ✅ Falls back to ProductContext if used standalone
════════════════════════════════ */
function TrendingProducts({ products: propProducts }) {
    const { products: ctxProducts } = useProducts();
    const railRef = useRef(null);

    const allProducts = propProducts || ctxProducts;
    /* If prop passed, already filtered for trending. Otherwise filter. */
    const trending = propProducts ? propProducts : allProducts.filter(p => p.trending);

    const scroll = (dir) => {
        if (!railRef.current) return;
        railRef.current.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
    };

    if (!trending.length) return null;

    return (
        <section className="trending-section">
            <div className="trending-container">
                <header className="trending-header">
                    <div className="trending-header-left">
                        <p className="trending-eyebrow">This Week</p>
                        <h2 className="trending-title">Trending Gear</h2>
                        <p className="trending-sub">Most loved by riders this week</p>
                    </div>
                    <div className="trending-controls">
                        <button className="scroll-btn" onClick={() => scroll("left")} aria-label="Scroll left"><ChevronLeft /></button>
                        <button className="scroll-btn" onClick={() => scroll("right")} aria-label="Scroll right"><ChevronRight /></button>
                    </div>
                </header>
                <div className="trending-wrapper">
                    <div className="trending-rail" ref={railRef}>
                        {trending.map(product => (
                            <TrendCard key={product._id} product={product} />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

export default TrendingProducts;