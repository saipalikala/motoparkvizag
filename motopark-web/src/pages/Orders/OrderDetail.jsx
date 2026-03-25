import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageTransition from "../../components/PageTransition/PageTransition";
import "./OrderDetail.css";

import { API } from "@/config/api";

/* ─── ICONS ─── */
const BackIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
);

const CheckIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const TruckIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="1" />
        <path d="M16 8h4l3 5v4h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
);

const PinIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);

const CardIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
);

const RefreshIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 4 23 10 17 10" />
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
);

/* ─── TIMELINE STEPS ─── */
const TIMELINE_STEPS = [
    {
        status: "pending",
        label: "Order Placed",
        sub: "We've received your order",
        icon: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>,
    },
    {
        status: "confirmed",
        label: "Order Confirmed",
        sub: "Your order has been verified",
        icon: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
    },
    {
        status: "shipped",
        label: "Dispatched",
        sub: "Your order is on the way",
        icon: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1" /><path d="M16 8h4l3 5v4h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>,
    },
    {
        status: "delivered",
        label: "Delivered",
        sub: "Enjoy your gear!",
        icon: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
    },
];

const STATUS_ORDER = ["pending", "confirmed", "shipped", "delivered"];

const getStep = (status) => {
    if (status === "cancelled") return -1;
    return STATUS_ORDER.indexOf(status);
};

/* ─── MAIN ─── */
const OrderDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [refreshing, setRefreshing] = useState(false);

    const load = async (quiet = false) => {
        if (!quiet) setLoading(true);
        else setRefreshing(true);
        try {
            const res = await fetch(`${API}/api/orders/${id}`);
            const data = await res.json();
            if (data.order) setOrder(data.order);
            else setError("Order not found");
        } catch {
            setError("Could not load order. Check your connection.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { load(); }, [id]);

    if (loading) return (
        <PageTransition>
            <div className="od-loading">
                <span className="od-spinner" />
                <p>Loading order…</p>
            </div>
        </PageTransition>
    );

    if (error || !order) return (
        <PageTransition>
            <div className="od-error">
                <h2>Order not found</h2>
                <p>{error}</p>
                <button onClick={() => navigate("/orders")}>← Back to Orders</button>
            </div>
        </PageTransition>
    );

    const addr = order.shippingAddress || {};
    const step = getStep(order.status);
    const isCancelled = order.status === "cancelled";
    const date = new Date(order.createdAt).toLocaleString("en-IN", {
        day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
    });

    const getImg = (item) => {
        if (!item?.product) return null;
        return null; // items don't carry images in the schema — show placeholder
    };

    return (
        <PageTransition>
            <div className="od-page">

                {/* ── HERO ── */}
                <div className={`od-hero ${isCancelled ? "od-hero--cancelled" : ""}`}>
                    <div className="od-hero-bg" aria-hidden="true" />
                    <div className="od-hero-content">
                        <button className="od-back" onClick={() => navigate("/orders")}>
                            <BackIcon /> My Orders
                        </button>
                        <p className="od-eyebrow">Order #{order._id?.slice(-8).toUpperCase()}</p>
                        <h1 className="od-title">
                            {isCancelled ? "Order Cancelled" : TIMELINE_STEPS[Math.max(step, 0)].label}
                        </h1>
                        <p className="od-date">{date}</p>
                    </div>
                </div>

                <div className="od-container">

                    {/* ── STATUS TIMELINE ── */}
                    {!isCancelled ? (
                        <div className="od-timeline-card">
                            <div className="od-timeline-header">
                                <h2>Order Progress</h2>
                                <button
                                    className={`od-refresh-btn ${refreshing ? "od-refresh-btn--spin" : ""}`}
                                    onClick={() => load(true)}
                                    title="Refresh status"
                                >
                                    <RefreshIcon /> Refresh
                                </button>
                            </div>

                            <div className="od-timeline">
                                {TIMELINE_STEPS.map((s, i) => {
                                    const done = step >= i;
                                    const current = step === i;
                                    const Icon = s.icon;
                                    return (
                                        <div key={s.status} className={`od-step ${done ? "od-step--done" : ""} ${current ? "od-step--current" : ""}`}>
                                            {/* CONNECTOR */}
                                            {i > 0 && (
                                                <div className={`od-connector ${step >= i ? "od-connector--done" : ""}`} />
                                            )}

                                            {/* CIRCLE */}
                                            <div className="od-step-circle">
                                                {done ? <CheckIcon /> : <Icon />}
                                            </div>

                                            {/* LABEL */}
                                            <div className="od-step-label">
                                                <span className="od-step-name">{s.label}</span>
                                                {current && <span className="od-step-sub">{s.sub}</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* STATUS MESSAGE */}
                            {step < 3 && (
                                <div className="od-status-msg">
                                    <TruckIcon />
                                    <span>
                                        {step === 0 && "Your order is being reviewed by our team."}
                                        {step === 1 && "Great! Your order is confirmed and being packed."}
                                        {step === 2 && "Your order is on its way to you! 🚚"}
                                    </span>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="od-delivered-msg">
                                    <span>🎉</span>
                                    <span>Your order has been delivered. Enjoy your gear!</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="od-cancelled-card">
                            <span>✕</span>
                            <div>
                                <strong>This order was cancelled</strong>
                                <p>If you were charged, a refund will be processed in 5–7 business days.</p>
                            </div>
                        </div>
                    )}

                    <div className="od-grid">

                        {/* ── ORDER ITEMS ── */}
                        <div className="od-card">
                            <h2 className="od-card-title">
                                Items Ordered
                                <span className="od-card-count">{order.items?.length || 0}</span>
                            </h2>
                            <div className="od-items">
                                {(order.items || []).map((item, i) => (
                                    <div className="od-item" key={i}>
                                        <div className="od-item-img">
                                            <div className="od-item-img-ph">
                                                {item.name?.charAt(0).toUpperCase()}
                                            </div>
                                        </div>
                                        <div className="od-item-info">
                                            <span className="od-item-name">{item.name}</span>
                                            <div className="od-item-meta">
                                                {item.selectedColor && (
                                                    <span className="od-item-tag">{item.selectedColor}</span>
                                                )}
                                                {item.selectedSize && (
                                                    <span className="od-item-tag">Size {item.selectedSize}</span>
                                                )}
                                                <span className="od-item-tag">Qty {item.quantity}</span>
                                            </div>
                                        </div>
                                        <span className="od-item-price">
                                            ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* TOTAL */}
                            <div className="od-total-row">
                                <div className="od-total-details">
                                    <div className="od-total-line">
                                        <span>Subtotal</span>
                                        <span>₹{order.total?.toLocaleString("en-IN")}</span>
                                    </div>
                                    <div className="od-total-line">
                                        <span>Delivery</span>
                                        <span className="od-free">Free</span>
                                    </div>
                                </div>
                                <div className="od-grand-total">
                                    <span>Total Paid</span>
                                    <span>₹{order.total?.toLocaleString("en-IN")}</span>
                                </div>
                            </div>
                        </div>

                        {/* ── RIGHT COLUMN ── */}
                        <div className="od-right-col">

                            {/* DELIVERY ADDRESS */}
                            <div className="od-card">
                                <h2 className="od-card-title">
                                    <PinIcon /> Delivery Address
                                </h2>
                                <div className="od-address-block">
                                    <strong>{addr.name}</strong>
                                    <p>{addr.phone}</p>
                                    <p>{addr.address}</p>
                                    <p>{addr.city}, {addr.state} – {addr.pincode}</p>
                                </div>
                            </div>

                            {/* PAYMENT */}
                            <div className="od-card">
                                <h2 className="od-card-title">
                                    <CardIcon /> Payment
                                </h2>
                                <div className="od-payment-block">
                                    <span className="od-payment-method">
                                        {order.paymentMethod === "cod" && "Cash on Delivery"}
                                        {order.paymentMethod === "upi" && "UPI"}
                                        {order.paymentMethod === "card" && "Card"}
                                        {!order.paymentMethod && "COD"}
                                    </span>
                                    <span className="od-payment-status">
                                        {order.paymentMethod === "cod" ? "Pay on delivery" : "Paid"}
                                    </span>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* BACK */}
                    <button className="od-back-btn" onClick={() => navigate("/orders")}>
                        <BackIcon /> Back to My Orders
                    </button>

                </div>
            </div>
        </PageTransition>
    );
};

export default OrderDetail;