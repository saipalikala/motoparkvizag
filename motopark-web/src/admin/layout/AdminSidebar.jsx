import { memo, useCallback, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "./AdminLayout.css";

/* ================================================================
   ICONS  — memo'd + module-level = never recreated between renders
   ================================================================ */
const Ico = memo(({ d, d2, extra }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
        strokeLinejoin="round" aria-hidden="true">
        <path d={d} />
        {d2 && <path d={d2} />}
        {extra}
    </svg>
));
Ico.displayName = "Ico";

const DashIcon    = memo(() => <Ico extra={<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></>} />);
const OrdersIcon  = memo(() => <Ico d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" d2="M3 6h18M16 10a4 4 0 0 1-8 0" />);
const ProductsIcon = memo(() => <Ico d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" d2="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />);
const InventoryIcon = memo(() => <Ico d="M22 12h-4l-3 9L9 3l-3 9H2" />);
const OffersIcon  = memo(() => <Ico d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" extra={<circle cx="7" cy="7" r="1" fill="currentColor" stroke="none"/>} />);
const CollectionsIcon = memo(() => <Ico d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" d2="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />);
const CategoriesIcon  = memo(() => <Ico extra={<><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="3" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="3" cy="18" r="1" fill="currentColor" stroke="none"/></>} />);
const HomeIcon    = memo(() => <Ico d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" d2="M9 22V12h6v10" />);
const CarouselIcon = memo(() => <Ico extra={<><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></>} />);
const NavbarIcon  = memo(() => <Ico extra={<><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>} />);
const MediaIcon   = memo(() => <Ico extra={<><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></>} />);
const VideoIcon   = memo(() => <Ico d="M15 10l4.553-2.07A1 1 0 0 1 21 8.82v6.36a1 1 0 0 1-1.447.89L15 14M3 8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" />);
const LogoutIcon  = memo(() => <Ico d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />);

DashIcon.displayName = "DashIcon";
OrdersIcon.displayName = "OrdersIcon";
ProductsIcon.displayName = "ProductsIcon";
InventoryIcon.displayName = "InventoryIcon";
OffersIcon.displayName = "OffersIcon";
CollectionsIcon.displayName = "CollectionsIcon";
CategoriesIcon.displayName = "CategoriesIcon";
HomeIcon.displayName = "HomeIcon";
CarouselIcon.displayName = "CarouselIcon";
NavbarIcon.displayName = "NavbarIcon";
MediaIcon.displayName = "MediaIcon";
LogoutIcon.displayName = "LogoutIcon";
VideoIcon.displayName  = "VideoIcon";

/* ================================================================
   NAV CONFIG — module-level: never re-created on renders
   ================================================================ */
const NAV_SECTIONS = [
    {
        label: "Overview",
        links: [
            { name: "Dashboard",  Icon: DashIcon,       path: "/admin/dashboard"  },
            { name: "Orders",     Icon: OrdersIcon,     path: "/admin/orders",    badge: "New" },
        ],
    },
    {
        label: "Catalogue",
        links: [
            { name: "Products",    Icon: ProductsIcon,    path: "/admin/products"    },
            { name: "Inventory",   Icon: InventoryIcon,   path: "/admin/inventory"   },
            { name: "Collections", Icon: CollectionsIcon, path: "/admin/collections" },
            { name: "Categories",  Icon: CategoriesIcon,  path: "/admin/categories"  },
        ],
    },
    {
        label: "Storefront",
        links: [
            { name: "Home Builder", Icon: HomeIcon,     path: "/admin/home-builder" },
            { name: "Carousel",     Icon: CarouselIcon, path: "/admin/carousel"     },
            { name: "Navbar",       Icon: NavbarIcon,   path: "/admin/navbar"       },
            { name: "Offers",       Icon: OffersIcon,   path: "/admin/offers"       },
            { name: "Media",        Icon: MediaIcon,    path: "/admin/media"        },
            { name: "Video Showcase", Icon: VideoIcon,  path: "/admin/video-showcase" },
        ],
    },
];

/* ================================================================
   ADMIN SIDEBAR
   memo: skips re-render unless isOpen/onClose change (never on navigate)
   ================================================================ */
const AdminSidebar = memo(({ isOpen, onClose }) => {
    const navigate   = useNavigate();
    const sidebarRef = useRef(null);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", handler, { passive: true });
        return () => document.removeEventListener("keydown", handler);
    }, [isOpen, onClose]);

    // Focus sidebar on open (a11y)
    useEffect(() => {
        if (isOpen && sidebarRef.current) sidebarRef.current.focus();
    }, [isOpen]);

    const handleLogout = useCallback(() => {
        localStorage.removeItem("adminToken");
        navigate("/admin/login");
    }, [navigate]);

    // Close drawer after nav on mobile
    const handleNavClick = useCallback(() => {
        if (window.innerWidth < 768) onClose();
    }, [onClose]);

    return (
        <aside
            ref={sidebarRef}
            className={`as-sidebar${isOpen ? " as-sidebar--open" : ""}`}
            role="navigation"
            aria-label="Admin navigation"
            tabIndex={-1}
        >
            {/* ── LOGO ── */}
            <div className="as-logo">
                <div className="as-logo-mark" aria-hidden="true" />
                <div>
                    <span className="as-logo-name">MotoPark</span>
                    <span className="as-logo-sub">Admin Panel</span>
                </div>
            </div>

            {/* ── NAV ── */}
            <nav className="as-nav" aria-label="Sidebar menu">
                {NAV_SECTIONS.map((section) => (
                    <div className="as-section" key={section.label}>
                        <p className="as-section-label" aria-hidden="true">
                            {section.label}
                        </p>
                        {section.links.map(({ name, Icon, path, badge }) => (
                            <NavLink
                                key={path}
                                to={path}
                                onClick={handleNavClick}
                                className={({ isActive }) =>
                                    `as-link${isActive ? " as-link--active" : ""}`
                                }
                                title={name}  /* shows on icon-only tablet view */
                            >
                                <span className="as-link__icon"><Icon /></span>
                                <span className="as-link__label">{name}</span>
                                {badge && (
                                    <span className="as-link__badge">{badge}</span>
                                )}
                                <span className="as-link__pill" aria-hidden="true" />
                            </NavLink>
                        ))}
                    </div>
                ))}
            </nav>

            {/* ── FOOTER: user + logout ── */}
            <div className="as-footer">
                <div className="as-user">
                    <div className="as-user__avatar" aria-hidden="true">SA</div>
                    <div>
                        <span className="as-user__name">Super Admin</span>
                        <span className="as-user__role">Administrator</span>
                    </div>
                </div>
                <button
                    className="as-logout"
                    onClick={handleLogout}
                    aria-label="Logout"
                    title="Logout"
                >
                    <LogoutIcon />
                </button>
            </div>
        </aside>
    );
});

AdminSidebar.displayName = "AdminSidebar";
export default AdminSidebar;