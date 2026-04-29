import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import StatCard from "../components/StatCard";
import SalesChart from "../components/SalesChart";
import "./Dashboard.css";

/* ── KPI icons ── */
const RevenueIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
);
const OrdersIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
);
const UsersIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);
const ProductsIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
);

/* ── Status badge ── */
const STATUS_CLASS = {
    pending:    "badge--amber",
    processing: "badge--blue",
    shipped:    "badge--purple",
    delivered:  "badge--green",
    cancelled:  "badge--red",
};

const StatusBadge = ({ status }) => (
    <span className={`badge ${STATUS_CLASS[status?.toLowerCase()] ?? "badge--gray"}`}>
        {status}
    </span>
);

/* ── Skeleton row ── */
const SkeletonRow = ({ cols }) => (
    <tr>
        {Array(cols).fill(0).map((_, i) => (
            <td key={i}><div className="dash-skel-cell" style={{ width: i === 0 ? "60%" : "50%" }} /></td>
        ))}
    </tr>
);

/* ================================================================
   DASHBOARD PAGE
   ================================================================ */
const Dashboard = () => {
    const [stats, setStats]     = useState(null);
    const [orders, setOrders]   = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    const today = useMemo(() =>
        new Date().toLocaleDateString("en-IN", {
            weekday: "short", month: "short", day: "numeric", year: "numeric"
        }),
    []);

    const fetchDashboard = useCallback(async () => {
        setLoading(true);
        try {
            const [statsRes, ordersRes, productsRes] = await Promise.allSettled([
                fetch("/api/admin/stats",    { headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` } }),
                fetch("/api/admin/orders/recent", { headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` } }),
                fetch("/api/admin/products/top",  { headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` } }),
            ]);

            if (statsRes.status === "fulfilled" && statsRes.value.ok) {
                setStats(await statsRes.value.json());
            }
            if (ordersRes.status === "fulfilled" && ordersRes.value.ok) {
                setOrders(await ordersRes.value.json());
            }
            if (productsRes.status === "fulfilled" && productsRes.value.ok) {
                setProducts(await productsRes.value.json());
            }
        } catch (err) {
            console.error("[Dashboard] fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

    return (
        <div className="page dashboard">
            {/* ── Header ── */}
            <div className="page__header">
                <div>
                    <h1 className="page__title">Good morning 👋</h1>
                    <p className="page__sub">Here's what's happening at MotoPark today.</p>
                </div>
                <span className="dash-date">{today}</span>
            </div>

            {/* ── KPI Cards ── */}
            <div className="stat-grid">
                <StatCard
                    title="Total Revenue"
                    value={stats?.revenue ?? 0}
                    prefix="₹"
                    delta={stats?.revenueDelta}
                    deltaLabel="vs last month"
                    icon={RevenueIcon}
                    accent="#ff6b3d"
                    loading={loading}
                    formatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
                />
                <StatCard
                    title="Total Orders"
                    value={stats?.orders ?? 0}
                    delta={stats?.ordersDelta}
                    deltaLabel="vs last month"
                    icon={OrdersIcon}
                    accent="#2563eb"
                    loading={loading}
                />
                <StatCard
                    title="Active Users"
                    value={stats?.users ?? 0}
                    delta={stats?.usersDelta}
                    deltaLabel="vs last month"
                    icon={UsersIcon}
                    accent="#7c3aed"
                    loading={loading}
                />
                <StatCard
                    title="Total Products"
                    value={stats?.products ?? 0}
                    delta={stats?.productsDelta}
                    deltaLabel="new this month"
                    icon={ProductsIcon}
                    accent="#16a34a"
                    loading={loading}
                />
            </div>

            {/* ── Chart + panels ── */}
            <div className="dash-grid">
                {/* Sales chart — spans full width on mobile */}
                <div className="card dash-chart-card">
                    <div className="card__header">
                        <div>
                            <div className="card__title">Sales Trend</div>
                            <div className="card__sub">Last 30 days</div>
                        </div>
                        <div className="dash-period-tabs">
                            <button className="dash-period-btn dash-period-btn--active">30d</button>
                            <button className="dash-period-btn">7d</button>
                            <button className="dash-period-btn">90d</button>
                        </div>
                    </div>
                    <div className="dash-chart-body">
                        <SalesChart />
                    </div>
                </div>

                {/* Recent orders */}
                <div className="card">
                    <div className="card__header">
                        <div>
                            <div className="card__title">Recent Orders</div>
                            <div className="card__sub">Latest activity</div>
                        </div>
                        <Link to="/admin/orders" className="dash-link">
                            View all →
                        </Link>
                    </div>
                    <div className="dash-list">
                        {loading ? (
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <tbody>
                                    {Array(5).fill(0).map((_, i) => <SkeletonRow key={i} cols={3} />)}
                                </tbody>
                            </table>
                        ) : orders.length === 0 ? (
                            <div className="dash-empty">No orders yet.</div>
                        ) : (
                            orders.slice(0, 6).map((order) => (
                                <div className="dash-row" key={order._id}>
                                    <div className="dash-row__avatar">
                                        {(order.user?.name ?? "?").slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="dash-row__info">
                                        <span className="dash-row__primary">
                                            {order.user?.name ?? "Unknown"}
                                        </span>
                                        <span className="dash-row__secondary">
                                            #{String(order._id).slice(-6).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="dash-row__right">
                                        <span className="dash-row__value">
                                            ₹{order.totalPrice?.toLocaleString("en-IN")}
                                        </span>
                                        <StatusBadge status={order.status} />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Top products */}
                <div className="card">
                    <div className="card__header">
                        <div>
                            <div className="card__title">Top Products</div>
                            <div className="card__sub">By revenue</div>
                        </div>
                        <Link to="/admin/products" className="dash-link">
                            View all →
                        </Link>
                    </div>
                    <div className="dash-list">
                        {loading ? (
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <tbody>
                                    {Array(5).fill(0).map((_, i) => <SkeletonRow key={i} cols={3} />)}
                                </tbody>
                            </table>
                        ) : products.length === 0 ? (
                            <div className="dash-empty">No products yet.</div>
                        ) : (
                            products.slice(0, 6).map((p, i) => (
                                <div className="dash-row" key={p._id}>
                                    <div className="dash-row__rank">{i + 1}</div>
                                    <div className="dash-row__thumb">
                                        {p.images?.[0] ? (
                                            <img src={p.images[0]} alt={p.name} loading="lazy" />
                                        ) : (
                                            <div className="dash-row__thumb-ph" />
                                        )}
                                    </div>
                                    <div className="dash-row__info">
                                        <span className="dash-row__primary">{p.name}</span>
                                        <span className="dash-row__secondary" style={{ color: "var(--mp-accent)" }}>
                                            {p.brand}
                                        </span>
                                    </div>
                                    <div className="dash-row__right">
                                        <span className="dash-row__value">
                                            ₹{p.price?.toLocaleString("en-IN")}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;