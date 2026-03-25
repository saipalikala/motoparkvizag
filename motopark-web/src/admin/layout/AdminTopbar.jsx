import { useLocation, useNavigate } from "react-router-dom";

const BellIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
);

const PAGE_TITLES = {
    "/admin/dashboard": "Dashboard",
    "/admin/orders": "Orders",
    "/admin/products": "Products",
    "/admin/inventory": "Inventory",
    "/admin/collections": "Collections",
    "/admin/home-builder": "Home Builder",
    "/admin/carousel": "Carousel",
    "/admin/navbar": "Navbar Manager",
    "/admin/offers": "Offers",
    "/admin/media": "Media",
};

const AdminTopbar = () => {
    const { pathname } = useLocation();
    const title = PAGE_TITLES[pathname] || "Admin";

    return (
        <div className="atb-topbar">
            <div className="atb-left">
                <h1 className="atb-title">{title}</h1>
            </div>
            <div className="atb-right">
                <button className="atb-bell" aria-label="Notifications">
                    <BellIcon />
                    <span className="atb-badge">3</span>
                </button>
                <div className="atb-avatar">SA</div>
            </div>
        </div>
    );
};

export default AdminTopbar;