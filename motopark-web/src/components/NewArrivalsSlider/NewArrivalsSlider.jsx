/* ================================================
   File: motopark-web/src/components/NewArrivalsSlider/NewArrivalsSlider.jsx

   CHANGE: accepts `products` prop from Home.jsx.
   Falls back to ProductContext if used standalone.
   ================================================ */
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useProducts } from "@/context/ProductContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import "./NewArrivalsSlider.css";
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
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
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

const ArrivalCard = ({ product, index }) => {
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
        <div className="arrival-card"
            style={{ animationDelay: `${Math.min(index * 0.06, 0.36)}s` }}
            onClick={() => navigate(`/product/${product._id}`)}
            role="button" tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate(`/product/${product._id}`)}>
            <div className="arrival-accent" />
            <div className="arrival-top">
                {categoryLabel ? <span className="arrival-badge">{categoryLabel}</span> : <span />}
                <button
                    className={`arrival-wishlist ${wishlisted ? "arrival-wishlist--active" : ""}`}
                    onClick={(e) => { e.stopPropagation(); wishlisted ? removeFromWishlist(product._id) : addToWishlist(product); }}
                    aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}>
                    <HeartIcon filled={wishlisted} />
                </button>
            </div>
            <div className="arrival-image-wrap">
                {image
                    ? <img
                        src={image}
                        alt={product.name}
                        className="arrival-img"
                        loading="lazy"
                        decoding="async"
                    />
                    : <div className="arrival-placeholder">
                        <svg viewBox="0 0 80 50" fill="none" width="72" opacity="0.2">
                            <circle cx="18" cy="38" r="10" stroke="white" strokeWidth="2.5" />
                            <circle cx="62" cy="38" r="10" stroke="white" strokeWidth="2.5" />
                            <path d="M18 38 L30 18 L52 18 L62 38" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                }
                <span className="arrival-new-pill">New</span>
            </div>
            <div className="arrival-info">
                <h4 className="arrival-name">{product.name}</h4>
                {product.brand && <p className="arrival-brand">{product.brand}</p>}
                <div className="arrival-footer">
                    <span className="arrival-price">₹{product.price?.toLocaleString("en-IN")}</span>
                    <button
                        className={`arrival-cart-btn ${inCart ? "arrival-cart-btn--added" : ""}`}
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
   NEW ARRIVALS SLIDER
   ✅ Accepts `products` prop from Home.jsx
   ✅ Falls back to ProductContext + 7-day filter if used standalone
════════════════════════════════ */
const NewArrivalsSlider = ({ products: propProducts }) => {
    const { products: ctxProducts } = useProducts();
    const scrollRef = useRef();

    const scroll = (dir) => {
        if (!scrollRef.current) return;
        scrollRef.current.scrollBy({ left: dir === "left" ? -280 : 280, behavior: "smooth" });
    };

    /* If prop passed (from Home.jsx, already server-filtered), use directly.
       Otherwise apply the 7-day client-side filter. */
    let items;
    if (propProducts) {
        items = propProducts;
    } else {
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        items = ctxProducts.filter(p => Date.now() - new Date(p.createdAt) < sevenDays);
    }

    if (!items.length) return null;

    return (
        <section className="new-arrivals">
            <div className="arrivals-glow" aria-hidden="true" />
            <div className="arrivals-header">
                <div className="arrivals-header-left">
                    <p className="arrivals-eyebrow">Just Dropped</p>
                    <h2 className="arrivals-title">New Arrivals</h2>
                    <p className="arrivals-sub">Fresh gear for your next ride</p>
                </div>
                <div className="arrivals-right">
                    <a href="/store" className="explore-link">
                        Explore All
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                            <path d="M2.5 7H11.5M7.5 3L11.5 7L7.5 11"
                                stroke="currentColor" strokeWidth="1.8"
                                strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </a>
                    <div className="arrivals-controls">
                        <button className="slider-btn" onClick={() => scroll("left")} aria-label="Scroll left"><ChevronLeft /></button>
                        <button className="slider-btn" onClick={() => scroll("right")} aria-label="Scroll right"><ChevronRight /></button>
                    </div>
                </div>
            </div>
            <div className="slider-track" ref={scrollRef}>
                {items.map((product, i) => (
                    <ArrivalCard key={product._id} product={product} index={i} />
                ))}
            </div>
        </section>
    );
};

export default NewArrivalsSlider;