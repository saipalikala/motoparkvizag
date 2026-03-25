import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageTransition from "../../components/PageTransition/PageTransition";
import { useUser } from "@/context/UserContext";
import "./OrdersPage.css";

const API = "http://localhost:5000";

/* ─── ICONS ─── */
const PhoneIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.38 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.86a16 16 0 0 0 6.22 6.22l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
);

const PackageIcon = () => (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d1d6" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
);

const ChevronRight = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18l6-6-6-6"/>
    </svg>
);

const SearchIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
    </svg>
);

/* ─── STATUS CONFIG ─── */
const STATUS_CONFIG = {
    pending:   { label: "Order Placed",  color: "amber",  step: 0 },
    confirmed: { label: "Confirmed",     color: "blue",   step: 1 },
    shipped:   { label: "Dispatched",    color: "purple", step: 2 },
    delivered: { label: "Delivered",     color: "green",  step: 3 },
    cancelled: { label: "Cancelled",     color: "red",    step: -1 },
};

const StatusBadge = ({ status }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    return <span className={`op-badge op-badge--${cfg.color}`}>{cfg.label}</span>;
};

/* ─── ORDER CARD ─── */
const OrderCard = ({ order, onClick }) => {
    const cfg   = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
    const date  = new Date(order.createdAt).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });
    const img   = order.items?.[0];

    return (
        <div className="op-card" onClick={onClick} role="button" tabIndex={0}
            onKeyDown={e => e.key === "Enter" && onClick()}>

            <div className="op-card-accent" />

            <div className="op-card-left">
                {/* ORDER ID + DATE */}
                <div className="op-card-meta">
                    <span className="op-order-id">#{order._id?.slice(-8).toUpperCase()}</span>
                    <span className="op-order-date">{date}</span>
                </div>

                {/* ITEMS SUMMARY */}
                <div className="op-items-summary">
                    {order.items?.slice(0, 2).map((item, i) => (
                        <span key={i} className="op-item-pill">
                            {item.name}
                            {item.selectedSize && ` · ${item.selectedSize}`}
                            {item.quantity > 1 && ` ×${item.quantity}`}
                        </span>
                    ))}
                    {order.items?.length > 2 && (
                        <span className="op-item-more">+{order.items.length - 2} more</span>
                    )}
                </div>

                {/* PAYMENT */}
                <p className="op-payment">{order.paymentMethod?.toUpperCase() || "COD"}</p>
            </div>

            <div className="op-card-right">
                <span className="op-total">₹{order.total?.toLocaleString("en-IN")}</span>
                <StatusBadge status={order.status}/>
                <ChevronRight/>
            </div>

            {/* MINI TIMELINE */}
            {order.status !== "cancelled" && (
                <div className="op-mini-timeline">
                    {["pending","confirmed","shipped","delivered"].map((s, i) => {
                        const done = cfg.step >= i;
                        return (
                            <div key={s} className={`op-timeline-dot ${done?"op-timeline-dot--done":""}`}>
                                {i > 0 && <div className={`op-timeline-line ${cfg.step >= i?"op-timeline-line--done":""}`}/>}
                                <div className="op-timeline-circle"/>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

/* ─── MAIN PAGE ─── */
const OrdersPage = () => {
    const navigate   = useNavigate();
    const { user }   = useUser();

    const [phone,    setPhone]    = useState("");
    const [orders,   setOrders]   = useState([]);
    const [loading,  setLoading]  = useState(false);
    const [searched, setSearched] = useState(false);
    const [error,    setError]    = useState("");

    /* Auto-load when logged in */
    useEffect(() => {
        if (!user?._id) return;
        setLoading(true);
        fetch(`${API}/api/orders?userId=${user._id}`)
            .then(r => r.json())
            .then(d => { setOrders(d.orders || []); setSearched(true); })
            .catch(() => setError("Could not load orders."))
            .finally(() => setLoading(false));
    }, [user]);

    const lookup = async (e) => {
        e?.preventDefault();
        const p = phone.trim();
        if (!/^\d{10}$/.test(p)) { setError("Enter a valid 10-digit phone number"); return; }

        setLoading(true); setError(""); setSearched(false);
        try {
            const res  = await fetch(`${API}/api/orders?phone=${p}`);
            const data = await res.json();
            setOrders(data.orders || []);
            setSearched(true);
        } catch {
            setError("Could not connect to server. Try again.");
        } finally { setLoading(false); }
    };

    return (
        <PageTransition>
            <div className="op-page">

                {/* ── HERO ── */}
                <div className="op-hero">
                    <div className="op-hero-bg" aria-hidden="true"/>
                    <div className="op-hero-content">
                        <p className="op-eyebrow">Track Your Orders</p>
                        <h1 className="op-title">My Orders</h1>
                        <p className="op-hero-sub">
                            {user
                                ? `Showing orders for ${user.name}`
                                : "Enter your phone number to view your order history"
                            }
                        </p>
                    </div>
                </div>

                <div className="op-container">

                    {/* ── PHONE LOOKUP — only for guests ── */}
                    {!user && (
                    <div className="op-lookup-card">
                        <div className="op-lookup-icon"><PhoneIcon/></div>
                        <h2>Find Your Orders</h2>
                        <p>Use the phone number you entered at checkout</p>

                        <form className="op-lookup-form" onSubmit={lookup}>
                            <div className={`op-phone-wrap ${error?"op-phone-wrap--error":""}`}>
                                <span className="op-phone-prefix">+91</span>
                                <input
                                    className="op-phone-input"
                                    type="tel"
                                    placeholder="10-digit mobile number"
                                    value={phone}
                                    onChange={e => { setPhone(e.target.value.replace(/\D/g,"")); setError(""); }}
                                    maxLength={10}
                                    autoFocus
                                />
                            </div>
                            {error && <p className="op-error">{error}</p>}
                            <button type="submit" className={`op-lookup-btn ${loading?"op-lookup-btn--loading":""}`} disabled={loading}>
                                {loading
                                    ? <span className="op-spinner"/>
                                    : <><SearchIcon/> Track Orders</>
                                }
                            </button>
                        </form>
                    </div>
                    )}

                    {/* ── RESULTS ── */}
                    {searched && (
                        <div className="op-results">
                            {orders.length === 0 ? (
                                <div className="op-no-orders">
                                    <PackageIcon/>
                                    <h3>No orders found</h3>
                                    <p>No orders were placed with this number.<br/>Try a different phone number.</p>
                                    <button className="op-browse-btn" onClick={() => navigate("/store")}>
                                        Browse Gear
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="op-results-header">
                                        <h2>{orders.length} order{orders.length !== 1 ? "s" : ""} found</h2>
                                        <span className="op-results-phone">for +91 {phone}</span>
                                    </div>
                                    <div className="op-orders-list">
                                        {orders.map(order => (
                                            <OrderCard
                                                key={order._id}
                                                order={order}
                                                onClick={() => navigate(`/orders/${order._id}`)}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </PageTransition>
    );
};

export default OrdersPage;