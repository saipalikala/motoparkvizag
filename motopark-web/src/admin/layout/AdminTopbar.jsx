import { memo, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./AdminLayout.css";

/* ── Icons ── */
const MenuIcon = memo(() => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true">
        <line x1="3" y1="7" x2="21" y2="7" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="17" x2="15" y2="17" />
    </svg>
));
MenuIcon.displayName = "MenuIcon";

const SearchIcon = memo(() => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
));
SearchIcon.displayName = "SearchIcon";

const BellIcon = memo(() => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
));
BellIcon.displayName = "BellIcon";

const PlusIcon = memo(() => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
        aria-hidden="true">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
));
PlusIcon.displayName = "PlusIcon";

/* ── Page title map — module-level constant ── */
const PAGE_META = {
    "/admin/dashboard":    { title: "Dashboard",     sub: "Overview & analytics" },
    "/admin/orders":       { title: "Orders",        sub: "Manage customer orders" },
    "/admin/products":     { title: "Products",      sub: "Product catalogue" },
    "/admin/inventory":    { title: "Inventory",     sub: "Stock levels" },
    "/admin/collections":  { title: "Collections",   sub: "Product groups" },
    "/admin/categories":   { title: "Categories",    sub: "Browse categories" },
    "/admin/home-builder": { title: "Home Builder",  sub: "Storefront sections" },
    "/admin/carousel":     { title: "Carousel",      sub: "Hero banners" },
    "/admin/navbar":       { title: "Navbar",        sub: "Navigation config" },
    "/admin/offers":       { title: "Offers",        sub: "Promotions & deals" },
    "/admin/media":        { title: "Media Library", sub: "Assets & uploads" },
};

/* Quick actions per page — what the CTA button does */
const PAGE_ACTIONS = {
    "/admin/products":    { label: "Add Product",   path: null /* open modal */ },
    "/admin/orders":      { label: "Export Orders", path: null },
    "/admin/categories":  { label: "Add Category",  path: null },
    "/admin/collections": { label: "Add Collection",path: null },
    "/admin/offers":      { label: "Create Offer",  path: null },
    "/admin/media":       { label: "Upload Media",  path: null },
};

/* ================================================================
   ADMIN TOPBAR
   memo: re-renders only on pathname change (location from hook)
   ================================================================ */
const AdminTopbar = memo(({ onMenuToggle, onQuickAction }) => {
    const { pathname } = useLocation();
    const navigate = useNavigate();

    const { title, sub } = useMemo(
        () => PAGE_META[pathname] ?? { title: "Admin", sub: "MotoPark" },
        [pathname]
    );

    const action = useMemo(() => PAGE_ACTIONS[pathname] ?? null, [pathname]);

    const handleAction = () => {
        if (!action) return;
        if (action.path) navigate(action.path);
        else if (onQuickAction) onQuickAction(pathname);
    };

    return (
        <header className="tb-topbar" role="banner">
            {/* Left: menu toggle + breadcrumb title */}
            <div className="tb-left">
                <button
                    className="tb-menu-btn"
                    onClick={onMenuToggle}
                    aria-label="Open navigation menu"
                    aria-haspopup="dialog"
                >
                    <MenuIcon />
                </button>

                <div className="tb-title-group">
                    <h1 className="tb-title">{title}</h1>
                    <span className="tb-sub">{sub}</span>
                </div>
            </div>

            {/* Right: search + quick action + notifications + avatar */}
            <div className="tb-right">
                {/* Search */}
                <div className="tb-search" role="search">
                    <SearchIcon />
                    <input
                        type="search"
                        className="tb-search__input"
                        placeholder="Search…"
                        aria-label="Search admin panel"
                    />
                    <kbd className="tb-search__kbd" aria-hidden="true">⌘K</kbd>
                </div>

                {/* Contextual quick action */}
                {action && (
                    <button
                        className="tb-quick-btn tb-quick-btn--primary"
                        onClick={handleAction}
                        aria-label={action.label}
                    >
                        <PlusIcon />
                        <span>{action.label}</span>
                    </button>
                )}

                {/* Notifications */}
                <button
                    className="tb-icon-btn"
                    aria-label="Notifications — 3 unread"
                >
                    <BellIcon />
                    <span className="tb-badge" aria-hidden="true">3</span>
                </button>

                {/* Avatar */}
                <button
                    className="tb-avatar"
                    aria-label="Account menu"
                    aria-haspopup="true"
                >
                    <span aria-hidden="true">SA</span>
                </button>
            </div>
        </header>
    );
});

AdminTopbar.displayName = "AdminTopbar";
export default AdminTopbar;