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
const PrintIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>;

/* ─── PRINT SLIP ─── */
const printOrderSlip = (order) => {
    const addr = order.shippingAddress || {};
    const date = new Date(order.createdAt).toLocaleString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit"
    });

    const itemsHTML = (order.items || []).map(item => `
        <tr>
            <td style="padding:8px 4px;border-bottom:1px solid #f0f0f0;">
                <strong>${item.name}</strong><br/>
                <small style="color:#666;">
                    ${item.selectedColor ? `Color: ${item.selectedColor} &nbsp;` : ""}
                    ${item.selectedSize ? `Size: ${item.selectedSize} &nbsp;` : ""}
                    Qty: ${item.quantity}
                </small>
            </td>
            <td style="padding:8px 4px;border-bottom:1px solid #f0f0f0;text-align:right;white-space:nowrap;">
                ₹${(item.price * item.quantity).toLocaleString("en-IN")}
            </td>
        </tr>
    `).join("");

    const slipHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8"/>
            <title>Order Slip #${order._id?.slice(-8).toUpperCase()}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1a1a1a; background: white; }
                .slip { max-width: 420px; margin: 0 auto; padding: 24px 20px; }

                /* HEADER */
                .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #ff6b3d; }
                .brand { font-size: 22px; font-weight: 800; color: #ff6b3d; letter-spacing: -0.5px; }
                .brand span { color: #1a1a1a; }
                .order-id { text-align: right; }
                .order-id .id { font-size: 16px; font-weight: 700; font-family: monospace; }
                .order-id .date { font-size: 11px; color: #666; margin-top: 2px; }

                /* STATUS BADGE */
                .status-row { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
                .status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; background: #fff3e8; color: #ff6b3d; border: 1px solid #ff6b3d; }

                /* SECTIONS */
                .section { margin-bottom: 16px; }
                .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 6px; }
                .section-body { background: #fafafa; border: 1px solid #f0f0f0; border-radius: 8px; padding: 10px 12px; }

                /* CUSTOMER */
                .customer-name { font-size: 15px; font-weight: 700; }
                .customer-phone { color: #555; margin-top: 2px; }
                .customer-address { color: #555; margin-top: 4px; line-height: 1.5; }

                /* ITEMS TABLE */
                table { width: 100%; border-collapse: collapse; }

                /* TOTAL */
                .total-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: #1a1a1a; color: white; border-radius: 8px; margin-top: 8px; }
                .total-label { font-size: 13px; font-weight: 600; }
                .total-amount { font-size: 18px; font-weight: 800; }

                /* PAYMENT */
                .payment-row { display: flex; justify-content: space-between; padding: 8px 12px; background: #f8f8f8; border-radius: 6px; margin-top: 6px; font-size: 12px; color: #555; }

                /* FOOTER */
                .footer { margin-top: 20px; padding-top: 16px; border-top: 1px dashed #ddd; text-align: center; }
                .footer p { font-size: 11px; color: #999; line-height: 1.6; }
                .footer .thankyou { font-size: 13px; font-weight: 700; color: #ff6b3d; margin-bottom: 4px; }

                /* BARCODE PLACEHOLDER */
                .barcode { font-family: monospace; font-size: 10px; color: #ccc; letter-spacing: 4px; margin-top: 8px; }

                @media print {
                    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                    .slip { padding: 0; }
                }
            </style>
        </head>
        <body>
            <div class="slip">

                <!-- HEADER -->
                <div class="header">
                    <div>
                        <div class="brand">Moto<span>Park</span></div>
                        <div style="font-size:11px;color:#999;margin-top:2px;">motoparkvizag.in</div>
                    </div>
                    <div class="order-id">
                        <div class="id">#${order._id?.slice(-8).toUpperCase()}</div>
                        <div class="date">${date}</div>
                    </div>
                </div>

                <!-- STATUS -->
                <div class="status-row">
                    <span style="font-size:12px;color:#666;">Status:</span>
                    <span class="status-badge">${order.status || "pending"}</span>
                </div>

                <!-- CUSTOMER -->
                <div class="section">
                    <div class="section-title">Ship To</div>
                    <div class="section-body">
                        <div class="customer-name">${addr.name || "—"}</div>
                        <div class="customer-phone">📞 ${addr.phone || "—"}</div>
                        ${addr.email ? `<div class="customer-phone">✉ ${addr.email}</div>` : ""}
                        <div class="customer-address">
                            ${addr.address || ""}<br/>
                            ${addr.city || ""}, ${addr.state || ""} – ${addr.pincode || ""}
                        </div>
                    </div>
                </div>

                <!-- ITEMS -->
                <div class="section">
                    <div class="section-title">Items (${order.items?.length || 0})</div>
                    <div class="section-body" style="padding:0 12px;">
                        <table>${itemsHTML}</table>
                    </div>
                </div>

                <!-- TOTAL -->
                <div class="total-row">
                    <span class="total-label">Total Amount</span>
                    <span class="total-amount">₹${order.total?.toLocaleString("en-IN")}</span>
                </div>
                <div class="payment-row">
                    <span>Payment Method</span>
                    <strong>${(order.paymentMethod || "—").toUpperCase()}</strong>
                </div>

                <!-- FOOTER -->
                <div class="footer">
                    <div class="thankyou">Thank you for your order! 🏍️</div>
                    <p>Please handle with care · Free returns within 30 days<br/>
                    Support: support@motoparkvizag.in</p>
                    <div class="barcode">${order._id}</div>
                </div>

            </div>
        </body>
        </html>
    `;

    const win = window.open("", "_blank", "width=500,height=700");
    win.document.write(slipHTML);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
};

const StatusSelect = ({ orderId, current, onUpdate }) => {
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const update = async (status) => {
        setOpen(false); setSaving(true);
        try {
            await fetch(`${API}/orders/${orderId}/status`, { method: "PUT", headers: AUTH(), body: JSON.stringify({ status }) });
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
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        {/* PRINT BUTTON */}
                        <button
                            className="ao-print-btn"
                            onClick={() => printOrderSlip(order)}
                            title="Print Order Slip"
                        >
                            <PrintIcon /> Print Slip
                        </button>
                        <button className="ao-panel-close" onClick={onClose}><CloseIcon /></button>
                    </div>
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
            const res = await fetch(`${API}/orders`, { headers: AUTH() });
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