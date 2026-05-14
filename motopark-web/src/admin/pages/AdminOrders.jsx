import { useState, useEffect, useCallback, useRef, memo } from "react";
import DataTable from "../components/DataTable";           // ✅ FIXED: was commented out
import { useToast } from "../components/ui/ToastProvider";  // ✅  // ✅ FIXED: was commented out
import { API } from "@/config/api";
import "./AdminOrders.css";

const TOKEN = () => localStorage.getItem("adminToken");
const AUTH  = () => ({ Authorization: `Bearer ${TOKEN()}`, "Content-Type": "application/json" });

const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

const STATUS_CLASS = {
    pending:    "badge--amber",
    confirmed:  "badge--blue",
    shipped:    "badge--purple",
    delivered:  "badge--green",
    cancelled:  "badge--red",
};

/* ── Icons ── */
const PrintIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>;
const CloseIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>;
const RefreshIcon  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>;
const ChevronIcon  = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>;

/* ── Status select (inside panel) ── */
const StatusSelect = memo(({ orderId, current, onUpdate }) => {
    const [loading, setLoading] = useState(false);
    const toast = useToast(); // ✅ Now works — import is restored above

    const change = async (e) => {
        const newStatus = e.target.value;
        setLoading(true);
        try {
            const res = await fetch(`${API}/orders/${orderId}/status`, {
                method: "PUT",
                headers: AUTH(),
                body: JSON.stringify({ status: newStatus }),
            });
            if (!res.ok) throw new Error("Failed");
            onUpdate(orderId, newStatus);
            toast.success("Status updated", `Order marked as ${newStatus}.`);
        } catch {
            toast.error("Update failed", "Could not change order status.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ao-status-select-wrap">
            <select
                className={`ao-status-select ao-status-select--${current ?? "pending"}`}
                value={current ?? "pending"}
                onChange={change}
                disabled={loading}
                aria-label="Order status"
            >
                {STATUSES.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
            </select>
            <ChevronIcon />
        </div>
    );
});
StatusSelect.displayName = "StatusSelect";

/* ── Print slip ── */
const printOrderSlip = (order) => {
    const addr = order.shippingAddress || {};
    const date = new Date(order.createdAt).toLocaleString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
    const itemsHTML = (order.items || []).map(item => `
        <tr>
            <td style="padding:8px 4px;border-bottom:1px solid #f0f0f0;">
                <strong>${item.name}</strong><br/>
                <small style="color:#666;">
                    ${item.selectedColor ? `Color: ${item.selectedColor} &nbsp;` : ""}
                    ${item.selectedSize  ? `Size: ${item.selectedSize} &nbsp;`  : ""}
                    Qty: ${item.quantity}
                </small>
            </td>
            <td style="padding:8px 4px;border-bottom:1px solid #f0f0f0;text-align:right;">
                ₹${(item.price * item.quantity).toLocaleString("en-IN")}
            </td>
        </tr>
    `).join("");

    const w = window.open("", "_blank", "width=480,height=700");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
        <title>Order #${order._id?.slice(-8).toUpperCase()}</title>
        <style>
            *{margin:0;padding:0;box-sizing:border-box}
            body{font-family:'Segoe UI',sans-serif;font-size:13px;color:#1a1a1a;background:#fff}
            .slip{max-width:420px;margin:0 auto;padding:24px 20px}
            .header{display:flex;justify-content:space-between;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #ff6b3d}
            .brand{font-size:22px;font-weight:800;color:#ff6b3d}
            .brand span{color:#1a1a1a}
            .section{margin-bottom:14px}
            .section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:5px}
            .section-body{background:#fafafa;border:1px solid #eee;border-radius:8px;padding:10px 12px}
            table{width:100%;border-collapse:collapse}
            .total-row{display:flex;justify-content:space-between;padding:10px 12px;background:#1a1a1a;color:#fff;border-radius:8px;margin-top:8px}
            .total-amount{font-size:18px;font-weight:800}
            .footer{margin-top:18px;padding-top:14px;border-top:1px dashed #ddd;text-align:center;font-size:11px;color:#999}
            @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
        </style></head><body><div class="slip">
        <div class="header">
            <div><div class="brand">Moto<span>Park</span></div><div style="font-size:11px;color:#999;margin-top:2px">motoparkvizag.in</div></div>
            <div style="text-align:right"><div style="font-size:15px;font-weight:700;font-family:monospace">#${order._id?.slice(-8).toUpperCase()}</div><div style="font-size:11px;color:#666">${date}</div></div>
        </div>
        <div class="section"><div class="section-title">Ship To</div>
        <div class="section-body">
            <strong>${addr.name || "—"}</strong><br>
            📞 ${addr.phone || "—"}<br>
            ${addr.address || ""},${addr.city || ""},${addr.state || ""} – ${addr.pincode || ""}
        </div></div>
        <div class="section"><div class="section-title">Items (${order.items?.length || 0})</div>
        <div class="section-body" style="padding:0 12px"><table>${itemsHTML}</table></div></div>
        <div class="total-row"><span>Total Amount</span><span class="total-amount">₹${order.total?.toLocaleString("en-IN")}</span></div>
        <div class="footer"><p>Thank you for shopping with MotoPark! 🏍</p></div>
        </div></body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
};

/* ── Order detail panel ── */
const OrderPanel = memo(({ order, onClose, onUpdate }) => {
    const panelRef = useRef(null);

    useEffect(() => {
        if (order) panelRef.current?.focus();
    }, [order]);

    if (!order) return null;
    const addr = order.shippingAddress || {};

    return (
        <>
        <div className="ao-overlay" onClick={onClose} aria-hidden="true" />
            <aside
                ref={panelRef}
                className="ao-panel"
                role="dialog"
                aria-label="Order details"
                aria-modal="true"
                tabIndex={-1}
            >
                <div className="ao-panel-header">
                    <div>
                        <h2>Order <code>#{order._id?.slice(-8).toUpperCase()}</code></h2>
<p>{new Date(order.createdAt).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
})}</p>
                    </div>
                    <div className="ao-panel-actions">
                        <button
                            className="btn btn--ghost btn--sm"
                            onClick={() => printOrderSlip(order)}
                            aria-label="Print order slip"
                        >
                            <PrintIcon /> Print
                        </button>
                        <button className="btn btn--icon btn--ghost" onClick={onClose} aria-label="Close panel">
                            <CloseIcon />
                        </button>
                    </div>
                </div>

                <div className="ao-panel-body">
                    {/* Shipping address */}
                    <div className="ao-section">
    <h3>Ship To</h3>
                        <div className="ao-address">
                            <strong>{addr.name || "—"}</strong>
                            <span>{addr.phone || "—"}</span>
                            <span>{[addr.address, addr.city, addr.state, addr.pincode].filter(Boolean).join(", ")}</span>
                        </div>
                    </div>

                    {/* Status */}
                    <div className="ao-section">
    <h3>Status</h3>
                        <StatusSelect orderId={order._id} current={order.status} onUpdate={onUpdate} />
                    </div>

                    {/* Items */}
                   <div className="ao-section">
    <h3>Items ({order.items?.length || 0})</h3>
                        <div className="ao-items">
                            {(order.items || []).map((item, i) => (
                                <div className="ao-item" key={i}>
                                    <div className="ao-item-info">
                                        <span className="ao-item-name">{item.name}</span>
                                        <span className="ao-item-meta">
                                            {item.selectedColor && `${item.selectedColor} · `}
                                            {item.selectedSize  && `Size ${item.selectedSize} · `}
                                            Qty {item.quantity}
                                        </span>
                                    </div>
                                    <span className="ao-item-price">
                                        ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Total */}
                   <div className="ao-panel-total">
    <span>Payment</span>
    <span className="ao-payment-val">{order.paymentMethod || "—"}</span>
    <span>Total</span>
    <strong>₹{order.total?.toLocaleString("en-IN")}</strong>
</div>
                </div>
            </aside>
        </>
    );
});
OrderPanel.displayName = "OrderPanel";

/* ================================================================
   ADMIN ORDERS PAGE
   ================================================================ */
const AdminOrders = () => {
    const [orders,   setOrders]   = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [selected, setSelected] = useState(null);
    const toast = useToast(); // ✅ Now works — import is restored above

const load = useCallback(async () => {
    setLoading(true);
    try {
        const res  = await fetch(`${API}/orders`, { headers: AUTH() });
        if (!res.ok) {
            toast.error("Session expired", "Please log in again.");
            setOrders([]);
            return;
        }
        const data = await res.json();
        const list = Array.isArray(data.orders) ? data.orders
                   : Array.isArray(data)         ? data
                   : [];
        setOrders(list);
    } catch {
        toast.error("Load failed", "Could not fetch orders.");
        setOrders([]);
    } finally {
        setLoading(false);
    }
}, []);

    useEffect(() => { load(); }, [load]);

    const updateStatus = useCallback((id, status) => {
        setOrders((os) => os.map((o) => o._id === id ? { ...o, status } : o));
        setSelected((s) => s?._id === id ? { ...s, status } : s);
    }, []);

    const stats = {
        total:     orders.length,
        pending:   orders.filter((o) => !o.status || o.status === "pending").length,
        shipped:   orders.filter((o) => o.status === "shipped").length,
        delivered: orders.filter((o) => o.status === "delivered").length,
    };

    const columns = [
        {
            key: "orderId", label: "Order ID",
            render: (_, row) => (
                <code className="ao-oid">#{row._id?.slice(-8).toUpperCase()}</code>
            ),
        },
        {
            key: "customer", label: "Customer", sortable: true,
            render: (_, row) => (
                <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                        {row.shippingAddress?.name || "—"}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--t-secondary)" }}>
                        {row.shippingAddress?.city || ""}
                    </div>
                </div>
            ),
        },
        {
            key: "items", label: "Items", width: 70,
            render: (_, row) => `${row.items?.length || 0}`,
        },
        {
            key: "total", label: "Total", sortable: true, width: 110,
            render: (_, row) => (
                <strong>₹{row.total?.toLocaleString("en-IN")}</strong>
            ),
        },
        {
            key: "paymentMethod", label: "Payment", width: 100,
            render: (v) => <span className="ao-pay">{v || "—"}</span>,
        },
        {
            key: "createdAt", label: "Date", sortable: true, width: 110,
            render: (v) => new Date(v).toLocaleDateString("en-IN"),
        },
        {
            key: "status", label: "Status", width: 130,
            render: (v) => (
                <span className={`badge ${STATUS_CLASS[v] ?? "badge--gray"}`}>
                    {v ?? "pending"}
                </span>
            ),
        },
    ];

    return (
        <div className="page ao-page">
            <div className="page__header">
                <div>
                    <h1 className="page__title">Orders</h1>
                    <p className="page__sub">Manage and track all customer orders</p>
                </div>
                <button className="btn btn--ghost" onClick={load} aria-label="Refresh orders">
                    <RefreshIcon /> Refresh
                </button>
            </div>

<div className="ao-stats">
    {[
        { label: "Total",     val: stats.total,     cls: "ao-stat--navy" },
        { label: "Pending",   val: stats.pending,   cls: "ao-stat--amber" },
        { label: "Shipped",   val: stats.shipped,   cls: "ao-stat--purple" },
        { label: "Delivered", val: stats.delivered, cls: "ao-stat--green" },
    ].map(({ label, val, cls }) => (
        <div key={label} className={`ao-stat ${cls}`}>
            <span className="ao-stat-val">{val}</span>
            <span className="ao-stat-label">{label}</span>
        </div>
    ))}
</div>

            <DataTable
                columns={columns}
                data={orders.map((o) => ({ ...o, id: o._id }))}
                keyField="id"
                loading={loading}
                searchKeys={["shippingAddress.name", "_id"]}
                filters={[{
                    key: "status",
                    label: "All Statuses",
                    options: STATUSES.map((s) => ({
                        value: s,
                        label: s.charAt(0).toUpperCase() + s.slice(1),
                    })),
                }]}
                emptyTitle="No orders found"
                emptyMessage="Try adjusting your search or status filter."
                pageSize={15}
                onRowClick={setSelected}
            />

            <OrderPanel
                order={selected}
                onClose={() => setSelected(null)}
                onUpdate={updateStatus}
            />
        </div>
    );
};

export default AdminOrders;