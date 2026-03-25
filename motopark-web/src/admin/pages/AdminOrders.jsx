import { useEffect, useState } from "react";
import "./AdminOrders.css";

import { API } from "@/config/api";
const TOKEN = () => localStorage.getItem("adminToken");
const AUTH = () => ({ Authorization: `Bearer ${TOKEN()}`, "Content-Type": "application/json" });

const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
const statusColor = s => ({ pending: "amber", confirmed: "blue", shipped: "purple", delivered: "green", cancelled: "red" }[s] || "gray");

const SearchIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>;
const RefreshIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>;
const ChevronDown = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>;
const CloseIcon = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 2l8 8M10 2l-8 8" /></svg>;

const StatusSelect = ({ orderId, current, onUpdate }) => {
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const update = async (status) => {
        setOpen(false); setSaving(true);
        try {
            await fetch(`${API}/api/orders/${orderId}/status`, { method: "PUT", headers: AUTH(), body: JSON.stringify({ status }) });
            onUpdate(orderId, status);
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    return (
        <div className="ao-status-wrap" onClick={e => e.stopPropagation()}>
            <button className={`ao-status ao-status--${statusColor(current)}`} onClick={() => setOpen(o => !o)}>
                {saving ? "…" : current || "pending"} <ChevronDown />
            </button>
            {open && (
                <div className="ao-dropdown">
                    {STATUSES.map(s => (
                        <button key={s} className={`ao-dropdown-opt ${s === current ? "ao-dropdown-opt--active" : ""}`} onClick={() => update(s)}>
                            <span className={`ao-dot ao-dot--${statusColor(s)}`} />{s}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const OrderPanel = ({ order, onClose, onUpdate }) => {
    if (!order) return null;
    const addr = order.shippingAddress || {};
    return (
        <>
            <div className="ao-overlay" onClick={onClose} />
            <div className="ao-panel">
                <div className="ao-panel-header">
                    <div>
                        <h2>Order #{order._id?.slice(-8).toUpperCase()}</h2>
                        <p>{new Date(order.createdAt).toLocaleString("en-IN")}</p>
                    </div>
                    <button className="ao-panel-close" onClick={onClose}><CloseIcon /></button>
                </div>
                <div className="ao-panel-body">
                    <div className="ao-section"><h3>Status</h3>
                        <StatusSelect orderId={order._id} current={order.status} onUpdate={onUpdate} />
                    </div>
                    <div className="ao-section"><h3>Customer</h3>
                        <div className="ao-detail-grid">
                            <span>Name</span><strong>{addr.name || "—"}</strong>
                            <span>Phone</span><strong>{addr.phone || "—"}</strong>
                            {addr.email && <><span>Email</span><strong>{addr.email}</strong></>}
                        </div>
                    </div>
                    <div className="ao-section"><h3>Delivery Address</h3>
                        <p className="ao-address">{addr.address}, {addr.city}<br />{addr.state} – {addr.pincode}</p>
                    </div>
                    <div className="ao-section"><h3>Items ({order.items?.length || 0})</h3>
                        <div className="ao-items">
                            {(order.items || []).map((item, i) => (
                                <div className="ao-item" key={i}>
                                    <div>
                                        <span className="ao-item-name">{item.name}</span>
                                        <span className="ao-item-meta">
                                            {item.selectedColor && `${item.selectedColor} · `}
                                            {item.selectedSize && `Size ${item.selectedSize} · `}
                                            Qty {item.quantity}
                                        </span>
                                    </div>
                                    <span className="ao-item-price">₹{(item.price * item.quantity).toLocaleString("en-IN")}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="ao-panel-total">
                        <span>Payment</span><span className="ao-payment-val">{order.paymentMethod || "—"}</span>
                        <span>Total</span><strong>₹{order.total?.toLocaleString("en-IN")}</strong>
                    </div>
                </div>
            </div>
        </>
    );
};

const AdminOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [selected, setSelected] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/orders`, { headers: AUTH() });
            const data = await res.json();
            setOrders(data.orders || data || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const updateStatus = (id, status) => {
        setOrders(os => os.map(o => o._id === id ? { ...o, status } : o));
        setSelected(s => s?._id === id ? { ...s, status } : s);
    };

    const filtered = orders.filter(o => {
        const name = o.shippingAddress?.name?.toLowerCase() || "";
        const id = o._id?.toLowerCase() || "";
        return (name.includes(search.toLowerCase()) || id.includes(search.toLowerCase()))
            && (filter === "all" || o.status === filter || (filter === "pending" && !o.status));
    });

    const stats = {
        total: orders.length,
        pending: orders.filter(o => !o.status || o.status === "pending").length,
        shipped: orders.filter(o => o.status === "shipped").length,
        delivered: orders.filter(o => o.status === "delivered").length,
    };

    return (
        <div className="ao-page">
            {/* STATS */}
            <div className="ao-stats">
                {[["Total", stats.total, "navy"], ["Pending", stats.pending, "amber"], ["Shipped", stats.shipped, "purple"], ["Delivered", stats.delivered, "green"]].map(([l, v, c]) => (
                    <div key={l} className={`ao-stat ao-stat--${c}`}>
                        <span className="ao-stat-val">{v}</span>
                        <span className="ao-stat-label">{l}</span>
                    </div>
                ))}
            </div>

            {/* TOOLBAR */}
            <div className="ao-toolbar">
                <div className="ao-search-wrap">
                    <SearchIcon />
                    <input className="ao-search" placeholder="Search name or order ID…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="ao-filters">
                    {["all", ...STATUSES].map(s => (
                        <button key={s} className={`ao-fpill ${filter === s ? "ao-fpill--active" : ""}`} onClick={() => setFilter(s)}>
                            {s === "all" ? "All" : s}
                        </button>
                    ))}
                </div>
                <button className="ao-refresh" onClick={load} title="Refresh"><RefreshIcon /></button>
            </div>

            {/* TABLE */}
            <div className="ao-table-wrap">
                {loading ? <div className="ao-loading">Loading orders…</div>
                    : filtered.length === 0 ? <div className="ao-empty">No orders found</div>
                        : (
                            <table className="ao-table">
                                <thead><tr>
                                    <th>Order ID</th><th>Customer</th><th>City</th>
                                    <th>Items</th><th>Total</th><th>Payment</th><th>Date</th><th>Status</th>
                                </tr></thead>
                                <tbody>
                                    {filtered.map(order => (
                                        <tr key={order._id} className="ao-row" onClick={() => setSelected(order)}>
                                            <td><code className="ao-oid">#{order._id?.slice(-8).toUpperCase()}</code></td>
                                            <td><strong>{order.shippingAddress?.name || "—"}</strong></td>
                                            <td>{order.shippingAddress?.city || "—"}</td>
                                            <td>{order.items?.length || 0} item{order.items?.length !== 1 ? "s" : ""}</td>
                                            <td><strong>₹{order.total?.toLocaleString("en-IN")}</strong></td>
                                            <td><span className="ao-pay">{order.paymentMethod || "—"}</span></td>
                                            <td>{new Date(order.createdAt).toLocaleDateString("en-IN")}</td>
                                            <td><StatusSelect orderId={order._id} current={order.status} onUpdate={updateStatus} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
            </div>

            <OrderPanel order={selected} onClose={() => setSelected(null)} onUpdate={updateStatus} />
        </div>
    );
};

export default AdminOrders;