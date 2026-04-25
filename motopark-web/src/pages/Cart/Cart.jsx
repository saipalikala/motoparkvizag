import PageTransition from "../../components/PageTransition/PageTransition";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import "./Cart.css";

import { API } from "@/config/api";

/* ─── ICONS ─── */
const TrashIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6M14 11v6" />
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
);

const ChevronRight = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18l6-6-6-6" />
    </svg>
);

const ShoppingBagIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
        stroke="#d1d1d6" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
);

const Cart = () => {
    const navigate = useNavigate();
    const { cartItems, removeFromCart, increaseQty, decreaseQty, cartTotal, clearCart } = useCart();

    const getImage = (item) => {
        const raw = item?.variants?.[0]?.images?.[0] || item?.images?.[0];
        if (!raw) return null;
        return raw.startsWith("http") ? raw : `${API}${raw.startsWith("/") ? "" : "/"}${raw}`;
    };

    const itemCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);
    const savings = cartItems.reduce((sum, i) => {
        if (i.originalPrice) return sum + (i.originalPrice - i.price) * i.quantity;
        return sum;
    }, 0);
const delivery = cartTotal >= 2000 ? 0 : 150;
    /* ── EMPTY STATE ── */
    if (cartItems.length === 0) return (
        <PageTransition>
            <div className="cart-empty-page">
                <div className="cart-empty-inner">
                    <ShoppingBagIcon />
                    <h2>Your cart is empty</h2>
                    <p>Looks like you haven't added any gear yet.</p>
                    <button className="cart-empty-cta" onClick={() => navigate("/store")}>
                        Browse Gear
                        <ChevronRight />
                    </button>
                </div>
            </div>
        </PageTransition>
    );

    return (
        <PageTransition>
            <div className="cart-page">

                {/* ── HEADER ── */}
                <div className="cart-hero">
                    <div className="cart-hero-bg" aria-hidden="true" />
                    <div className="cart-hero-content">
                        <p className="cart-eyebrow">Shopping Cart</p>
                        <h1 className="cart-title">Your Cart</h1>
                        <p className="cart-hero-sub">{itemCount} item{itemCount !== 1 ? "s" : ""}</p>
                    </div>
                </div>

                <div className="cart-container">
                    <div className="cart-layout">

                        {/* ── ITEMS ── */}
                        <div className="cart-items">
                            <div className="cart-items-header">
                                <span>Product</span>
                                <button className="cart-clear-btn" onClick={clearCart}>
                                    Clear All
                                </button>
                            </div>

                            {cartItems.map((item, i) => {
                                const image = getImage(item);
                                return (
                                    <div className="cart-item" key={item._id}
                                        style={{ animationDelay: `${i * 0.04}s` }}>

                                        {/* IMAGE */}
                                        <div className="cart-item-img-wrap"
                                            onClick={() => navigate(`/product/${item._id}`)}
                                            style={{ cursor: "pointer" }}>
                                            {image
                                                ? <img src={image} alt={item.name} className="cart-item-img" />
                                                : <div className="cart-item-img-placeholder" />
                                            }
                                        </div>

                                        {/* INFO */}
                                        <div className="cart-item-info">
                                            <div className="cart-item-top">
                                                <div>
                                                    <h3 className="cart-item-name"
                                                        onClick={() => navigate(`/product/${item._id}`)}
                                                        style={{ cursor: "pointer" }}>
                                                        {item.name}
                                                    </h3>
                                                    {item.selectedColor && (
                                                        <p className="cart-item-meta">Color: {item.selectedColor}</p>
                                                    )}
                                                    {item.selectedSize && (
                                                        <p className="cart-item-meta">Size: {item.selectedSize}</p>
                                                    )}
                                                    {item.brand && (
                                                        <p className="cart-item-brand">{item.brand}</p>
                                                    )}
                                                </div>
                                                <button className="cart-remove-btn"
                                                    onClick={() => removeFromCart(item._id)}
                                                    aria-label="Remove item">
                                                    <TrashIcon />
                                                </button>
                                            </div>

                                            <div className="cart-item-bottom">
                                                {/* QTY */}
                                                <div className="cart-qty">
                                                    <button
                                                        className="cart-qty-btn"
                                                        onClick={() => decreaseQty(item._id)}
                                                        disabled={item.quantity <= 1}
                                                        aria-label="Decrease">
                                                        −
                                                    </button>
                                                    <span className="cart-qty-num">{item.quantity}</span>
                                                    <button
                                                        className="cart-qty-btn"
                                                        onClick={() => increaseQty(item._id)}
                                                        aria-label="Increase"
                                                        disabled={(() => {
                                                            const variant = item.variants?.find(v => v.color === item.selectedColor)
                                                                || item.variants?.[0];
                                                            const sizeObj = variant?.sizes?.find(s => s.size === item.selectedSize)
                                                                || variant?.sizes?.[0];
                                                            const maxStock = Number(sizeObj?.stock || 0);
                                                            return maxStock > 0 && item.quantity >= maxStock;
                                                        })()}>
                                                        +
                                                    </button>
                                                </div>

                                                {/* ✅ Stock limit warning — appears below qty controls */}
                                                {(() => {
                                                    const variant = item.variants?.find(v => v.color === item.selectedColor)
                                                        || item.variants?.[0];
                                                    const sizeObj = variant?.sizes?.find(s => s.size === item.selectedSize)
                                                        || variant?.sizes?.[0];
                                                    const maxStock = Number(sizeObj?.stock || 0);
                                                    if (maxStock > 0 && item.quantity >= maxStock) {
                                                        return <span className="cart-stock-limit">Max stock reached</span>;
                                                    }
                                                    return null;
                                                })()}

                                                {/* PRICE */}
                                                <div className="cart-item-price-col">
                                                    <span className="cart-item-price">
                                                        ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                                                    </span>
                                                    {item.quantity > 1 && (
                                                        <span className="cart-item-unit">
                                                            ₹{item.price.toLocaleString("en-IN")} each
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* ── ORDER SUMMARY ── */}
                        <aside className="cart-summary">
                            <div className="cart-summary-inner">
                                <h2 className="cart-summary-title">Order Summary</h2>

                                <div className="cart-summary-rows">
<div className="cart-summary-row">
    <span>Subtotal ({itemCount} item{itemCount !== 1 ? "s" : ""})</span>
    <span>₹{cartTotal.toLocaleString("en-IN")}</span>
</div>
<div className="cart-summary-row">
    <span>Delivery</span>
    {delivery === 0
        ? <span className="cart-summary-free">Free</span>
        : <span>₹150</span>
    }
</div>
                                    {savings > 0 && (
                                        <div className="cart-summary-row cart-summary-row--savings">
                                            <span>You save</span>
                                            <span>−₹{savings.toLocaleString("en-IN")}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="cart-summary-divider" />

                                <div className="cart-summary-total">
                                    <span>Total</span>
                                    <span>₹{(cartTotal + delivery).toLocaleString("en-IN")}</span>
                                </div>

                                <p className="cart-summary-tax">Inclusive of all taxes</p>

                                <button
                                    className="cart-checkout-btn"
                                    onClick={() => navigate("/checkout")}
                                >
                                    Proceed to Checkout
                                    <ChevronRight />
                                </button>

                                <button
                                    className="cart-continue-btn"
                                    onClick={() => navigate("/store")}
                                >
                                    Continue Shopping
                                </button>

                                {/* TRUST BADGES */}
                                <div className="cart-trust">
                                    <div className="cart-trust-item">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff6b3d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                                        <span>Secure checkout</span>
                                    </div>
                                    <div className="cart-trust-item">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff6b3d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1" /><path d="M16 8h4l3 5v4h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
                                        <span>Free delivery</span>
                                    </div>
                                    <div className="cart-trust-item">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff6b3d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.5" /></svg>
                                        <span>Easy returns</span>
                                    </div>
                                </div>
                            </div>
                        </aside>

                    </div>
                </div>
            </div>
        </PageTransition>
    );
};

export default Cart;