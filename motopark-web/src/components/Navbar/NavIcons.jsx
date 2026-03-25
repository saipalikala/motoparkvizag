import { NavLink, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useUser } from "@/context/UserContext";

/* ─── ICONS ─── */
const SearchIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
    </svg>
);
const UserIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
);
const HeartIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
);
const CartIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
);
const OrdersIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
);
const MenuIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
);
const LogoutIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
);
const AccountIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
);

/* ─── USER DROPDOWN ─── */
const UserDropdown = ({ user, onLogout }) => {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, []);

    const firstName = user.name?.split(" ")[0] || "Account";
    const go = (path) => { navigate(path); setOpen(false); };

    return (
        <div className="ni-user-wrap" ref={ref}>
            {/* TRIGGER */}
            <button className="ni-user-btn" onClick={() => setOpen(o => !o)} aria-label="Account">
                <div className="ni-avatar">{firstName.charAt(0).toUpperCase()}</div>
                <span className="ni-name">{firstName}</span>
            </button>

            {/* DROPDOWN */}
            {open && (
                <div className="ni-dropdown">
                    <div className="ni-dropdown-header">
                        <div className="ni-dropdown-avatar">{firstName.charAt(0).toUpperCase()}</div>
                        <div>
                            <p className="ni-dropdown-name">{user.name}</p>
                            <p className="ni-dropdown-sub">{user.email || user.phone || ""}</p>
                        </div>
                    </div>
                    <div className="ni-divider" />
                    <button className="ni-menu-item" onClick={() => go("/account")}>
                        <AccountIcon /> My Profile
                    </button>
                    <button className="ni-menu-item" onClick={() => go("/orders")}>
                        <OrdersIcon /> My Orders
                    </button>
                    <div className="ni-divider" />
                    <button className="ni-menu-item ni-menu-item--logout" onClick={() => { onLogout(); setOpen(false); }}>
                        <LogoutIcon /> Sign Out
                    </button>
                </div>
            )}
        </div>
    );
};

/* ─── MAIN ─── */
const NavIcons = ({ openMenu, openSearch }) => {
    const navigate = useNavigate();
    const { cartItems = [] } = useCart();
    const { wishlist = [] } = useWishlist();
    const { user, logout } = useUser();

    const cartCount = cartItems.reduce((s, i) => s + (i.quantity || 1), 0);

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    return (
        <div className="nav-icons">

            {/* SEARCH */}
            <button className="icon-btn" onClick={openSearch} aria-label="Search">
                <SearchIcon />
            </button>

            {/* USER — dropdown if logged in, link to /login if not */}
            {user ? (
                <UserDropdown user={user} onLogout={handleLogout} />
            ) : (
                <NavLink to="/login"
                    className={({ isActive }) => `icon-btn ${isActive ? "icon-btn--active" : ""}`}
                    aria-label="Login" title="Sign In">
                    <UserIcon />
                </NavLink>
            )}

            {/* WISHLIST */}
            <NavLink to="/wishlist"
                className={({ isActive }) => `icon-btn icon-btn--badge ${isActive ? "icon-btn--active" : ""}`}
                aria-label="Wishlist" title="Wishlist">
                <HeartIcon />
                {wishlist.length > 0 && (
                    <span className="nav-badge">{wishlist.length > 9 ? "9+" : wishlist.length}</span>
                )}
            </NavLink>

            {/* CART */}
            <NavLink to="/cart"
                className={({ isActive }) => `icon-btn icon-btn--badge ${isActive ? "icon-btn--active" : ""}`}
                aria-label="Cart" title="Cart">
                <CartIcon />
                {cartCount > 0 && (
                    <span className="nav-badge">{cartCount > 9 ? "9+" : cartCount}</span>
                )}
            </NavLink>

            {/* ORDERS — after cart */}
            <NavLink to="/orders"
                className={({ isActive }) => `icon-btn ${isActive ? "icon-btn--active" : ""}`}
                aria-label="My Orders" title="My Orders">
                <OrdersIcon />
            </NavLink>

            {/* MOBILE MENU */}
            <button className="icon-btn nav-menu-btn" onClick={openMenu} aria-label="Menu">
                <MenuIcon />
            </button>

        </div>
    );
};

export default NavIcons;