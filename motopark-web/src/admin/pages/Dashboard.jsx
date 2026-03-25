import { useEffect, useState } from "react";
import "./Dashboard.css";

const API = "http://localhost:5000";
const TOKEN = () => localStorage.getItem("adminToken");

const RevenueIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
);
const OrdersIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
);
const ProductsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
);
const StockIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);
const TrendUpIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
    </svg>
);
const ChevronRight = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18l6-6-6-6" />
    </svg>
);

const StatCard = ({ title, value, sub, icon: Icon, color, prefix = "", loading }) => (
    <div className={`dash-stat dash-stat--${color}`}>
        <div className="dash-stat-top">
            <div className="dash-stat-icon"><Icon /></div>
            <span className="dash-stat-trend"><TrendUpIcon /> Live</span>
        </div>
        <div className="dash-stat-value">
            {loading ? <span className="dash-skel" /> : <>{prefix}{typeof value === "number" ? value.toLocaleString("en-IN") : (value ?? "—")}</>}
        </div>
        <div className="dash-stat-label">{title}</div>
        {sub && <div className="dash-stat-sub">{sub}</div>}
    </div>
);

const statusColor = (s) => ({ pending: "amber", confirmed: "blue", shipped: "purple", delivered: "green", cancelled: "red" }[s] || "gray");

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const h = { Authorization: `Bearer ${TOKEN()}` };
        Promise.all([
            fetch(`${API}/api/products`, { headers: h }).then(r => r.json()),
            fetch(`${API}/api/orders`, { headers: h }).then(r => r.json()).catch(() => ({ orders: [] })),
        ]).then(([prodData, orderData]) => {
            const productList = prodData.products || [];
            const orderList = orderData.orders || [];
            const revenue = orderList.reduce((s, o) => s + (o.total || 0), 0);
            const lowStock = productList.filter(p => p.variants?.some(v => v.sizes?.some(s => Number(s.stock) <= 3))).length;
            setStats({ revenue, orders: orderList.length, products: productList.length, lowStock });
            setOrders(orderList.slice(0, 6));
            setProducts(productList.slice(0, 5));
        }).catch(console.error).finally(() => setLoading(false));
    }, []);

    return (
        <div className="dashboard">
            <div className="dash-header">
                <div>
                    <h1 className="dash-title">Dashboard</h1>
                    <p className="dash-sub">Welcome back — here's what's happening</p>
                </div>
                <div className="dash-date">
                    {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                </div>
            </div>

            <div className="dash-stats">
                <StatCard title="Total Revenue" value={stats?.revenue} prefix="₹" icon={RevenueIcon} color="orange" loading={loading} sub="All orders combined" />
                <StatCard title="Total Orders" value={stats?.orders} icon={OrdersIcon} color="blue" loading={loading} sub="All time" />
                <StatCard title="Products" value={stats?.products} icon={ProductsIcon} color="navy" loading={loading} sub="In catalogue" />
                <StatCard title="Low Stock" value={stats?.lowStock} icon={StockIcon} color="red" loading={loading} sub="≤3 units remaining" />
            </div>

            <div className="dash-grid">
                <div className="dash-card">
                    <div className="dash-card-header">
                        <h2>Recent Orders</h2>
                        <a href="/admin/orders" className="dash-card-link">View All <ChevronRight /></a>
                    </div>
                    {loading ? <div className="dash-loading">Loading orders…</div>
                        : orders.length === 0 ? <div className="dash-empty">No orders yet</div>
                            : <div className="dash-orders">
                                {orders.map((o, i) => (
                                    <div className="dash-order-row" key={o._id || i}>
                                        <div className="dash-order-info">
                                            <span className="dash-order-name">{o.shippingAddress?.name || "—"}</span>
                                            <span className="dash-order-city">{o.shippingAddress?.city || ""}</span>
                                        </div>
                                        <div className="dash-order-right">
                                            <span className="dash-order-total">₹{o.total?.toLocaleString("en-IN")}</span>
                                            <span className={`dash-status dash-status--${statusColor(o.status)}`}>{o.status || "pending"}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                    }
                </div>

                <div className="dash-card">
                    <div className="dash-card-header">
                        <h2>Products</h2>
                        <a href="/admin/products" className="dash-card-link">Manage <ChevronRight /></a>
                    </div>
                    {loading ? <div className="dash-loading">Loading products…</div>
                        : products.length === 0 ? <div className="dash-empty">No products yet</div>
                            : <div className="dash-products">
                                {products.map((p, i) => {
                                    const img = p.variants?.[0]?.images?.[0];
                                    const src = img ? (img.startsWith("http") ? img : `${API}/${img.replace(/^\//, "")}`) : null;
                                    return (
                                        <div className="dash-product-row" key={p._id || i}>
                                            <div className="dash-product-img">
                                                {src ? <img src={src} alt={p.name} /> : <div className="dash-product-ph" />}
                                            </div>
                                            <div className="dash-product-info">
                                                <span className="dash-product-name">{p.name}</span>
                                                <span className="dash-product-brand">{p.brand}</span>
                                            </div>
                                            <span className="dash-product-price">₹{p.price?.toLocaleString("en-IN")}</span>
                                        </div>
                                    );
                                })}
                            </div>
                    }
                </div>
            </div>
        </div>
    );
};

export default Dashboard;