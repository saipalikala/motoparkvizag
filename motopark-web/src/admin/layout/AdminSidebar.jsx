import { NavLink, useNavigate } from "react-router-dom";
import "./AdminSidebar.css";

/* ─── ICONS ─── */
const DashIcon = () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
);
const OrdersIcon = () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
);
const ProductsIcon = () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
);
const InventoryIcon = () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
);
const OffersIcon = () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
);
const CarouselIcon = () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
    </svg>
);
const CollectionsIcon = () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
);
const HomeIcon = () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
);
const NavbarIcon = () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
);
const MediaIcon = () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
    </svg>
);
const LogoutIcon = () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
);

const NAV_SECTIONS = [
    {
        label: "Overview",
        links: [
            { name: "Dashboard", Icon: DashIcon, path: "/admin/dashboard" },
            { name: "Orders", Icon: OrdersIcon, path: "/admin/orders" },
        ]
    },
    {
        label: "Catalogue",
        links: [
            { name: "Products", Icon: ProductsIcon, path: "/admin/products" },
            { name: "Inventory", Icon: InventoryIcon, path: "/admin/inventory" },
            { name: "Collections", Icon: CollectionsIcon, path: "/admin/collections" },
            { name: "Categories", Icon: CollectionsIcon, path: "/admin/categories" },
        ]
    },
    {
        label: "Storefront",
        links: [
            { name: "Home Builder", Icon: HomeIcon, path: "/admin/home-builder" },
            { name: "Carousel", Icon: CarouselIcon, path: "/admin/carousel" },
            { name: "Navbar", Icon: NavbarIcon, path: "/admin/navbar" },
            { name: "Offers", Icon: OffersIcon, path: "/admin/offers" },
            { name: "Media", Icon: MediaIcon, path: "/admin/media" },
        ]
    },
];

const AdminSidebar = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem("adminToken");
        navigate("/admin/login");
    };

    return (
        <aside className="as-sidebar">

            {/* LOGO */}
            <div className="as-logo">
                <div className="as-logo-dot" />
                <div>
                    <span className="as-logo-name">MotoPark</span>
                    <span className="as-logo-sub">Admin</span>
                </div>
            </div>

            {/* NAV */}
            <nav className="as-nav">
                {NAV_SECTIONS.map(section => (
                    <div className="as-section" key={section.label}>
                        <p className="as-section-label">{section.label}</p>
                        {section.links.map(({ name, Icon, path }) => (
                            <NavLink
                                key={name}
                                to={path}
                                className={({ isActive }) =>
                                    `as-link ${isActive ? "as-link--active" : ""}`
                                }
                            >
                                <Icon />
                                <span>{name}</span>
                            </NavLink>
                        ))}
                    </div>
                ))}
            </nav>

            {/* LOGOUT */}
            <button className="as-logout" onClick={handleLogout}>
                <LogoutIcon />
                <span>Logout</span>
            </button>

        </aside>
    );
};

export default AdminSidebar;