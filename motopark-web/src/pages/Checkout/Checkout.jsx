import { useState } from "react";
import PageTransition from "../../components/PageTransition/PageTransition";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";
import { useNavigate } from "react-router-dom";
import "./Checkout.css";

const API = "http://localhost:5000";

/* ─── ICONS ─── */
const CheckIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
    </svg>
);
const LockIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
);
const TruckIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="1"/>
        <path d="M16 8h4l3 5v4h-7V8z"/>
        <circle cx="5.5" cy="18.5" r="2.5"/>
        <circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
);
const ChevronRight = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18l6-6-6-6"/>
    </svg>
);

/* ─── PAYMENT ICONS ─── */
const UPIIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2"/>
        <path d="M12 9v6M9 12h6"/>
    </svg>
);
const CardIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
        <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
);
const CODIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
    </svg>
);

const PAYMENT_METHODS = [
    { id: "upi",  label: "UPI",            sub: "PhonePe, GPay, Paytm",  Icon: UPIIcon  },
    { id: "card", label: "Card",           sub: "Debit / Credit / EMI",  Icon: CardIcon },
    { id: "cod",  label: "Cash on Delivery", sub: "Pay at doorstep",     Icon: CODIcon  },
];

const INDIAN_STATES = [
    "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
    "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka",
    "Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
    "Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
    "Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
    "Delhi","Jammu & Kashmir","Ladakh","Puducherry",
];

const Checkout = () => {
    const navigate  = useNavigate();
    const { cartItems, cartTotal, clearCart } = useCart();
    const { user, token } = useUser();

    const [step,    setStep]    = useState(1);
    const [payment, setPayment] = useState("upi");
    const [placing, setPlacing] = useState(false);
    const [success, setSuccess] = useState(false);

    const [form, setForm] = useState({
        name:    user?.name  || "",
        phone:   user?.phone || "",
        email:   user?.email || "",
        address: "", city: "", state: "", pincode: "",
    });

    const [errors, setErrors] = useState({});

    const set = (k, v) => {
        setForm(f => ({ ...f, [k]: v }));
        if (errors[k]) setErrors(e => { const n = { ...e }; delete n[k]; return n; });
    };

    const getImage = (item) => {
        const raw = item?.variants?.[0]?.images?.[0] || item?.images?.[0];
        if (!raw) return null;
        return raw.startsWith("http") ? raw : `${API}${raw.startsWith("/") ? "" : "/"}${raw}`;
    };

    const validateStep1 = () => {
        const e = {};
        if (!form.name.trim())    e.name    = "Required";
        if (!form.phone.trim() || !/^\d{10}$/.test(form.phone.trim())) e.phone = "Enter valid 10-digit number";
        if (!form.address.trim()) e.address = "Required";
        if (!form.city.trim())    e.city    = "Required";
        if (!form.state)          e.state   = "Select a state";
        if (!form.pincode.trim() || !/^\d{6}$/.test(form.pincode.trim())) e.pincode = "Enter valid 6-digit pincode";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleNext = () => {
        if (step === 1 && !validateStep1()) return;
        setStep(s => s + 1);
    };

    const handlePlaceOrder = async () => {
        setPlacing(true);
        try {
            // Send token if logged in — backend attaches user._id to order
            const headers = { "Content-Type": "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const res  = await fetch(`${API}/api/orders`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    items: cartItems.map(i => ({
                        product:       i._id,
                        name:          i.name,
                        price:         i.price,
                        quantity:      i.quantity,
                        selectedColor: i.selectedColor,
                        selectedSize:  i.selectedSize,
                    })),
                    shippingAddress: form,
                    paymentMethod:   payment,
                    total:           cartTotal,
                }),
            });
            const data = await res.json();
            clearCart();
            if (data.orderId) {
                navigate(`/orders/${data.orderId}`);
            } else {
                setSuccess(true);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setPlacing(false);
        }
    };

    const itemCount = cartItems.reduce((s, i) => s + i.quantity, 0);

    /* ── SUCCESS ── */
    if (success) return (
        <PageTransition>
            <div className="co-success-page">
                <div className="co-success-inner">
                    <div className="co-success-icon"><CheckIcon /></div>
                    <h2>Order Placed!</h2>
                    <p>Thank you, {form.name}. Your order is confirmed and will be delivered to {form.city}.</p>
                    <button className="co-success-btn" onClick={() => navigate("/store")}>
                        Continue Shopping <ChevronRight />
                    </button>
                </div>
            </div>
        </PageTransition>
    );

    return (
        <PageTransition>
            <div className="co-page">

                {/* ── HERO ── */}
                <div className="co-hero">
                    <div className="co-hero-bg" aria-hidden="true" />
                    <div className="co-hero-content">
                        <p className="co-eyebrow">Secure Checkout</p>
                        <h1 className="co-title">Checkout</h1>
                        <p className="co-hero-sub">{itemCount} item{itemCount !== 1 ? "s" : ""} · ₹{cartTotal.toLocaleString("en-IN")}</p>
                    </div>
                </div>

                {/* ── STEPS BAR ── */}
                <div className="co-steps-bar">
                    {["Delivery", "Payment", "Review"].map((label, i) => {
                        const n = i + 1;
                        return (
                            <div key={label} className={`co-step ${step === n ? "co-step--active" : ""} ${step > n ? "co-step--done" : ""}`}>
                                <div className="co-step-num">
                                    {step > n ? <CheckIcon /> : n}
                                </div>
                                <span>{label}</span>
                                {i < 2 && <div className="co-step-line" />}
                            </div>
                        );
                    })}
                </div>

                <div className="co-container">
                    <div className="co-layout">

                        {/* ── LEFT PANEL ── */}
                        <div className="co-left">

                            {/* STEP 1 — ADDRESS */}
                            {step === 1 && (
                                <div className="co-section">
                                    <h2 className="co-section-title">Delivery Address</h2>

                                    <div className="co-form-row">
                                        <div className="co-field">
                                            <label>Full Name *</label>
                                            <input value={form.name} onChange={e => set("name", e.target.value)}
                                                placeholder="Sai Arvind" className={errors.name ? "co-input--error" : ""}/>
                                            {errors.name && <span className="co-error">{errors.name}</span>}
                                        </div>
                                        <div className="co-field">
                                            <label>Phone Number *</label>
                                            <input value={form.phone} onChange={e => set("phone", e.target.value)}
                                                placeholder="10-digit mobile" maxLength={10} className={errors.phone ? "co-input--error" : ""}/>
                                            {errors.phone && <span className="co-error">{errors.phone}</span>}
                                        </div>
                                    </div>

                                    <div className="co-field">
                                        <label>Email (optional)</label>
                                        <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                                            placeholder="for order updates"/>
                                    </div>

                                    <div className="co-field">
                                        <label>Address *</label>
                                        <textarea value={form.address} onChange={e => set("address", e.target.value)}
                                            placeholder="House no, Street, Area, Landmark"
                                            rows={3} className={errors.address ? "co-input--error" : ""}/>
                                        {errors.address && <span className="co-error">{errors.address}</span>}
                                    </div>

                                    <div className="co-form-row">
                                        <div className="co-field">
                                            <label>City *</label>
                                            <input value={form.city} onChange={e => set("city", e.target.value)}
                                                placeholder="Visakhapatnam" className={errors.city ? "co-input--error" : ""}/>
                                            {errors.city && <span className="co-error">{errors.city}</span>}
                                        </div>
                                        <div className="co-field">
                                            <label>Pincode *</label>
                                            <input value={form.pincode} onChange={e => set("pincode", e.target.value)}
                                                placeholder="530016" maxLength={6} className={errors.pincode ? "co-input--error" : ""}/>
                                            {errors.pincode && <span className="co-error">{errors.pincode}</span>}
                                        </div>
                                    </div>

                                    <div className="co-field">
                                        <label>State *</label>
                                        <select value={form.state} onChange={e => set("state", e.target.value)}
                                            className={errors.state ? "co-input--error" : ""}>
                                            <option value="">Select State</option>
                                            {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                        {errors.state && <span className="co-error">{errors.state}</span>}
                                    </div>

                                    <button className="co-next-btn" onClick={handleNext}>
                                        Continue to Payment <ChevronRight />
                                    </button>
                                </div>
                            )}

                            {/* STEP 2 — PAYMENT */}
                            {step === 2 && (
                                <div className="co-section">
                                    <h2 className="co-section-title">Payment Method</h2>

                                    <div className="co-payment-list">
                                        {PAYMENT_METHODS.map(({ id, label, sub, Icon }) => (
                                            <button
                                                key={id}
                                                className={`co-payment-option ${payment === id ? "co-payment-option--active" : ""}`}
                                                onClick={() => setPayment(id)}
                                            >
                                                <div className="co-payment-icon">
                                                    <Icon />
                                                </div>
                                                <div className="co-payment-text">
                                                    <span className="co-payment-label">{label}</span>
                                                    <span className="co-payment-sub">{sub}</span>
                                                </div>
                                                <div className={`co-radio ${payment === id ? "co-radio--active" : ""}`}>
                                                    {payment === id && <CheckIcon />}
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    {/* UPI HINT */}
                                    {payment === "upi" && (
                                        <div className="co-payment-hint">
                                            <LockIcon />
                                            You'll be redirected to complete UPI payment after placing the order.
                                        </div>
                                    )}

                                    {payment === "cod" && (
                                        <div className="co-payment-hint">
                                            <TruckIcon />
                                            Pay in cash when your order is delivered. Available on most pincodes.
                                        </div>
                                    )}

                                    <div className="co-step-nav">
                                        <button className="co-back-btn" onClick={() => setStep(1)}>← Back</button>
                                        <button className="co-next-btn" onClick={handleNext}>
                                            Review Order <ChevronRight />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* STEP 3 — REVIEW */}
                            {step === 3 && (
                                <div className="co-section">
                                    <h2 className="co-section-title">Review Your Order</h2>

                                    {/* ADDRESS SUMMARY */}
                                    <div className="co-review-block">
                                        <div className="co-review-label">
                                            <span>Delivering to</span>
                                            <button className="co-edit-btn" onClick={() => setStep(1)}>Edit</button>
                                        </div>
                                        <p className="co-review-value">
                                            <strong>{form.name}</strong> · {form.phone}<br />
                                            {form.address}, {form.city}, {form.state} – {form.pincode}
                                        </p>
                                    </div>

                                    {/* PAYMENT SUMMARY */}
                                    <div className="co-review-block">
                                        <div className="co-review-label">
                                            <span>Payment</span>
                                            <button className="co-edit-btn" onClick={() => setStep(2)}>Edit</button>
                                        </div>
                                        <p className="co-review-value">
                                            {PAYMENT_METHODS.find(m => m.id === payment)?.label}
                                        </p>
                                    </div>

                                    {/* ITEMS */}
                                    <div className="co-review-items">
                                        {cartItems.map(item => {
                                            const img = getImage(item);
                                            return (
                                                <div className="co-review-item" key={item._id}>
                                                    <div className="co-review-img">
                                                        {img
                                                            ? <img src={img} alt={item.name} />
                                                            : <div className="co-review-img-ph" />
                                                        }
                                                    </div>
                                                    <div className="co-review-item-info">
                                                        <span className="co-review-item-name">{item.name}</span>
                                                        {item.selectedSize  && <span className="co-review-item-meta">Size: {item.selectedSize}</span>}
                                                        {item.selectedColor && <span className="co-review-item-meta">Color: {item.selectedColor}</span>}
                                                        <span className="co-review-item-meta">Qty: {item.quantity}</span>
                                                    </div>
                                                    <span className="co-review-item-price">
                                                        ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="co-step-nav">
                                        <button className="co-back-btn" onClick={() => setStep(2)}>← Back</button>
                                        <button
                                            className={`co-place-btn ${placing ? "co-place-btn--loading" : ""}`}
                                            onClick={handlePlaceOrder}
                                            disabled={placing}
                                        >
                                            {placing ? "Placing Order…" : <>Place Order · ₹{cartTotal.toLocaleString("en-IN")}</>}
                                        </button>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* ── ORDER SUMMARY SIDEBAR ── */}
                        <aside className="co-summary">
                            <div className="co-summary-inner">
                                <h3 className="co-summary-title">Order Summary</h3>

                                <div className="co-summary-items">
                                    {cartItems.map(item => {
                                        const img = getImage(item);
                                        return (
                                            <div className="co-summary-item" key={item._id}>
                                                <div className="co-summary-img">
                                                    {img
                                                        ? <img src={img} alt={item.name} />
                                                        : <div className="co-summary-img-ph" />
                                                    }
                                                    <span className="co-summary-qty">{item.quantity}</span>
                                                </div>
                                                <div className="co-summary-item-info">
                                                    <span className="co-summary-item-name">{item.name}</span>
                                                    {item.selectedSize && <span className="co-summary-item-meta">{item.selectedSize}</span>}
                                                </div>
                                                <span className="co-summary-item-price">
                                                    ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="co-summary-divider" />

                                <div className="co-summary-rows">
                                    <div className="co-summary-row">
                                        <span>Subtotal</span>
                                        <span>₹{cartTotal.toLocaleString("en-IN")}</span>
                                    </div>
                                    <div className="co-summary-row">
                                        <span>Delivery</span>
                                        <span className="co-free">Free</span>
                                    </div>
                                </div>

                                <div className="co-summary-divider" />

                                <div className="co-summary-total">
                                    <span>Total</span>
                                    <span>₹{cartTotal.toLocaleString("en-IN")}</span>
                                </div>

                                <div className="co-trust">
                                    <div className="co-trust-item"><LockIcon /> Secure checkout</div>
                                    <div className="co-trust-item"><TruckIcon /> Free delivery</div>
                                </div>
                            </div>
                        </aside>

                    </div>
                </div>
            </div>
        </PageTransition>
    );
};

export default Checkout;