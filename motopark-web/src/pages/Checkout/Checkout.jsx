import { useState, useRef } from "react";
import PageTransition from "../../components/PageTransition/PageTransition";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";
import { useNavigate } from "react-router-dom";
import { useProducts } from "@/context/ProductContext";

import "./Checkout.css";

import { API } from "@/config/api";

/* ─── ICONS ─── */
const CheckIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);
const LockIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);
const TruckIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="1" />
        <path d="M16 8h4l3 5v4h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
);
const ChevronRight = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18l6-6-6-6" />
    </svg>
);

/* ─── PAYMENT ICONS ─── */
const OnlineIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
);
const CODIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4l3 3" />
    </svg>
);

const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
    "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
    "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
    "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Delhi", "Jammu & Kashmir", "Ladakh", "Puducherry",
];

/* ─── Load Razorpay script dynamically ─── */
const loadRazorpayScript = () => {
    return new Promise((resolve) => {
        if (document.getElementById("razorpay-script")) return resolve(true);
        const script = document.createElement("script");
        script.id = "razorpay-script";
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

const Checkout = () => {
    const navigate = useNavigate();
    const { cartItems, cartTotal, clearCart } = useCart();
    const { user, token } = useUser();
    const { clearCache } = useProducts();
    const [step, setStep] = useState(1);
    const [payment, setPayment] = useState("razorpay");
    const [placing, setPlacing] = useState(false);
    const [success, setSuccess] = useState(false);
    const isSubmittingRef = useRef(false);

    const [form, setForm] = useState({
        name: user?.name || "",
        phone: user?.phone || "",
        email: user?.email || "",
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
        if (!form.name.trim()) e.name = "Required";
        if (!form.phone.trim() || !/^\d{10}$/.test(form.phone.trim())) e.phone = "Enter valid 10-digit number";
        if (!form.address.trim()) e.address = "Required";
        if (!form.city.trim()) e.city = "Required";
        if (!form.state) e.state = "Select a state";
        if (!form.pincode.trim() || !/^\d{6}$/.test(form.pincode.trim())) e.pincode = "Enter valid 6-digit pincode";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleNext = () => {
        if (step === 1 && !validateStep1()) return;
        setStep(s => s + 1);
    };

    /* ─── RAZORPAY PAYMENT HANDLER ─── */
    const handleRazorpayPayment = async () => {
        if (isSubmittingRef.current) return;   // 🛡️ prevent concurrent calls
        isSubmittingRef.current = true;
        setPlacing(true);

        const loaded = await loadRazorpayScript();
        if (!loaded) {
            isSubmittingRef.current = false;   // allow retry
            alert("Failed to load payment gateway. Please check your internet connection.");
            setPlacing(false);
            return;
        }

        try {
            // Step 1: Create Razorpay order on backend
const orderRes = await fetch(`${API}/payment/create-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        items: cartItems.map(i => ({
            productId: i._id,
            quantity: i.quantity,
        })),
        deliveryCharge: delivery,   // ← add this
    }),
});
            const orderData = await orderRes.json();
            if (!orderRes.ok) {
                alert("Could not initiate payment. Please try again.");
                setPlacing(false);
                isSubmittingRef.current = false;
                return;
            }
            // Step 2: Open Razorpay checkout
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: orderData.amount,
                currency: orderData.currency,
                name: "MotoPark",
                description: "Order Payment",
                order_id: orderData.orderId,
                handler: async (response) => {
                    try {
                        // Step 3: Verify payment signature on backend
                        const verifyRes = await fetch(`${API}/payment/verify`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                            }),
                        });
                        const verifyData = await verifyRes.json();

                        if (!verifyData.success) {
                            alert("Payment verification failed. Please contact support.");
                            setPlacing(false);
                            return;
                        }

                        // Step 4: Save order to DB after verified payment
                        const headers = { "Content-Type": "application/json" };
                        if (token) headers["Authorization"] = `Bearer ${token}`;

                        const res = await fetch(`${API}/orders`, {
                            method: "POST",
                            headers,
                            body: JSON.stringify({
                                items: cartItems.map(i => ({
                                    product: i._id,
                                    name: i.name,
                                    price: i.price,
                                    quantity: i.quantity,
                                    selectedColor: i.selectedColor,
                                    selectedSize: i.selectedSize,
                                })),
                                shippingAddress: form,
                                paymentMethod: "razorpay",
                                paymentId: response.razorpay_payment_id,
                                total: cartTotal + delivery,
                                deliveryCharge: delivery,
                            }),
                        });

                        const data = await res.json();

                        // 🛡️ Duplicate order — redirect silently
                        if (res.status === 409) {
                            clearCart();
                            clearCache();
                            navigate(`/orders/${data.orderId}`);
                            return;
                        }

                        if (!res.ok) {
                            throw new Error(data.message || "Order save failed");
                        }

                        clearCart();
                        clearCache();
                        navigate(`/orders/${data._id}`);
                    } catch (err) {
                        console.error("Order save error:", err);
                        alert("Payment was successful but order could not be saved. Please contact support with your payment ID: " + response.razorpay_payment_id);
                    } finally {
                        setPlacing(false);
                    }
                },
                prefill: {
                    name: form.name || "",
                    email: form.email || "",
                    contact: form.phone || "",
                },
                theme: { color: "#ff6b3d" },
                modal: {
                    ondismiss: () => {
                        isSubmittingRef.current = false;   // allow retry after dismiss
                        setPlacing(false);
                    },
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (err) {
            console.error("Payment init error:", err);
            isSubmittingRef.current = false;       // allow retry
            alert("Something went wrong while initiating payment. Please try again.");
            setPlacing(false);
        }
    };

    const itemCount = cartItems.reduce((s, i) => s + i.quantity, 0);
const delivery = cartTotal >= 2000 ? 0 : 150;  // ← add this
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
                                                placeholder="Sai Arvind" className={errors.name ? "co-input--error" : ""} />
                                            {errors.name && <span className="co-error">{errors.name}</span>}
                                        </div>
                                        <div className="co-field">
                                            <label>Phone Number *</label>
                                            <input value={form.phone} onChange={e => set("phone", e.target.value)}
                                                placeholder="10-digit mobile" maxLength={10} className={errors.phone ? "co-input--error" : ""} />
                                            {errors.phone && <span className="co-error">{errors.phone}</span>}
                                        </div>
                                    </div>

                                    <div className="co-field">
                                        <label>Email (optional)</label>
                                        <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                                            placeholder="for order updates" />
                                    </div>

                                    <div className="co-field">
                                        <label>Address *</label>
                                        <textarea value={form.address} onChange={e => set("address", e.target.value)}
                                            placeholder="House no, Street, Area, Landmark"
                                            rows={3} className={errors.address ? "co-input--error" : ""} />
                                        {errors.address && <span className="co-error">{errors.address}</span>}
                                    </div>

                                    <div className="co-form-row">
                                        <div className="co-field">
                                            <label>City *</label>
                                            <input value={form.city} onChange={e => set("city", e.target.value)}
                                                placeholder="Visakhapatnam" className={errors.city ? "co-input--error" : ""} />
                                            {errors.city && <span className="co-error">{errors.city}</span>}
                                        </div>
                                        <div className="co-field">
                                            <label>Pincode *</label>
                                            <input value={form.pincode} onChange={e => set("pincode", e.target.value)}
                                                placeholder="530016" maxLength={6} className={errors.pincode ? "co-input--error" : ""} />
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

                                        {/* ── RAZORPAY (active, selectable) ── */}
                                        <button
                                            className="co-payment-option co-payment-option--active"
                                            onClick={() => setPayment("razorpay")}
                                        >
                                            <div className="co-payment-icon">
                                                <OnlineIcon />
                                            </div>
                                            <div className="co-payment-text">
                                                <span className="co-payment-label">Pay Online</span>
                                                <span className="co-payment-sub">UPI · Cards · Net Banking · Wallets</span>
                                            </div>
                                            <div className="co-payment-badges">
                                                <span className="co-pay-badge">UPI</span>
                                                <span className="co-pay-badge">Visa</span>
                                                <span className="co-pay-badge">RuPay</span>
                                            </div>
                                            <div className="co-radio co-radio--active">
                                                <CheckIcon />
                                            </div>
                                        </button>

                                        {/* ── COD (disabled) ── */}
                                        <div className="co-payment-option co-payment-option--disabled">
                                            <div className="co-payment-icon">
                                                <CODIcon />
                                            </div>
                                            <div className="co-payment-text">
                                                <span className="co-payment-label">
                                                    Cash on Delivery
                                                    <span className="co-cod-tag">Not Available</span>
                                                </span>
                                                <span className="co-payment-sub">COD is currently not available in your area</span>
                                            </div>
                                            <div className="co-radio" />
                                        </div>

                                    </div>

                                    {/* ONLINE PAYMENT HINT */}
                                    <div className="co-payment-hint">
                                        <LockIcon />
                                        Secured by Razorpay · UPI, Debit/Credit Cards, Net Banking & Wallets accepted
                                    </div>

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
                                            Pay Online via Razorpay
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
                                                        {item.selectedSize && <span className="co-review-item-meta">Size: {item.selectedSize}</span>}
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
                                            onClick={handleRazorpayPayment}
                                            disabled={placing}
                                        >
                                            {placing
                                                ? "Opening Payment…"
                                                : <>Pay ₹{(cartTotal + delivery).toLocaleString("en-IN")} via Razorpay</>
                                            }
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
    {delivery === 0
        ? <span className="co-free">Free</span>
        : <span>₹150</span>
    }
</div>
                                </div>

                                <div className="co-summary-divider" />

                                <div className="co-summary-total">
                                    <span>Total</span>
                                    <span>₹{(cartTotal + delivery).toLocaleString("en-IN")}</span>
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