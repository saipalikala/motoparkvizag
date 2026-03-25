import PageTransition from "../../components/PageTransition/PageTransition";
import { useNavigate } from "react-router-dom";
import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";
import "./Wishlist.css";

import { API } from "@/config/api";

/* ─── ICONS ─── */
const HeartEmptyIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
        stroke="#d1d1d6" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
);

const TrashIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6M14 11v6" />
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
);

const CartIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
);

const ChevronRight = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18l6-6-6-6" />
    </svg>
);

const CheckIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const Wishlist = () => {
    const navigate = useNavigate();
    const { wishlist, removeFromWishlist } = useWishlist();
    const { addToCart, cartItems } = useCart();

    const getImage = (item) => {
        const raw = item?.variants?.[0]?.images?.[0] || item?.images?.[0];
        if (!raw) return null;
        return raw.startsWith("http") ? raw : `${API}${raw.startsWith("/") ? "" : "/"}${raw}`;
    };

    /* ── EMPTY STATE ── */
    if (wishlist.length === 0) return (
        <PageTransition>
            <div className="wl-empty-page">
                <div className="wl-empty-inner">
                    <HeartEmptyIcon />
                    <h2>Your wishlist is empty</h2>
                    <p>Save items you love to find them easily later.</p>
                    <button className="wl-empty-cta" onClick={() => navigate("/store")}>
                        Browse Gear <ChevronRight />
                    </button>
                </div>
            </div>
        </PageTransition>
    );

    return (
        <PageTransition>
            <div className="wl-page">

                {/* ── HERO ── */}
                <div className="wl-hero">
                    <div className="wl-hero-bg" aria-hidden="true" />
                    <div className="wl-hero-content">
                        <p className="wl-eyebrow">Saved Items</p>
                        <h1 className="wl-title">Your Wishlist</h1>
                        <p className="wl-hero-sub">{wishlist.length} saved item{wishlist.length !== 1 ? "s" : ""}</p>
                    </div>
                </div>

                <div className="wl-container">

                    <div className="wl-grid">
                        {wishlist.map((item, i) => {
                            const image = getImage(item);
                            const inCart = cartItems.some(c => c._id === item._id);

                            return (
                                <div className="wl-card" key={item._id}
                                    style={{ animationDelay: `${i * 0.05}s` }}>

                                    {/* ACCENT */}
                                    <div className="wl-card-accent" />

                                    {/* REMOVE */}
                                    <button className="wl-remove-btn"
                                        onClick={() => removeFromWishlist(item._id)}
                                        aria-label="Remove from wishlist">
                                        <TrashIcon />
                                    </button>

                                    {/* IMAGE */}
                                    <div className="wl-img-wrap"
                                        onClick={() => navigate(`/product/${item._id}`)}
                                        style={{ cursor: "pointer" }}>
                                        {image
                                            ? <img src={image} alt={item.name} className="wl-img" />
                                            : <div className="wl-img-placeholder" />
                                        }
                                    </div>

                                    {/* INFO */}
                                    <div className="wl-card-info">
                                        {item.brand && <p className="wl-brand">{item.brand}</p>}
                                        <h3 className="wl-name"
                                            onClick={() => navigate(`/product/${item._id}`)}>
                                            {item.name}
                                        </h3>
                                        <div className="wl-card-footer">
                                            <span className="wl-price">
                                                ₹{item.price?.toLocaleString("en-IN")}
                                            </span>
                                            <button
                                                className={`wl-cart-btn ${inCart ? "wl-cart-btn--added" : ""}`}
                                                onClick={() => addToCart(item)}
                                            >
                                                {inCart ? <><CheckIcon /> Added</> : <><CartIcon /> Add</>}
                                            </button>
                                        </div>
                                    </div>

                                </div>
                            );
                        })}
                    </div>

                    {/* QUICK ACTIONS */}
                    <div className="wl-actions">
                        <button className="wl-add-all-btn"
                            onClick={() => wishlist.forEach(item => addToCart(item))}>
                            Add All to Cart
                        </button>
                        <button className="wl-store-btn" onClick={() => navigate("/store")}>
                            Continue Shopping
                        </button>
                    </div>

                </div>
            </div>
        </PageTransition>
    );
};

export default Wishlist;