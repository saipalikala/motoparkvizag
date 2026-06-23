import { NavLink } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useUser } from "@/context/UserContext";

const getPath = (link) => {
  if (["/", "/about", "/contact", "/store"].includes(link.path)) return link.path;
  const slug = link.path?.replace("/", "").toLowerCase();
  return `/category/${slug}`;
};

/* ─── ICON MAP — matches link name to a relevant SVG ─── */
const NAV_ICON_MAP = {
  home: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  helmets: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2C7 2 3 6.5 3 11v2a2 2 0 002 2h1l1 3h10l1-3h1a2 2 0 002-2v-2c0-4.5-4-9-9-9z" />
    </svg>
  ),
  jackets: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 7l-4-4-4 3-4-3-4 4v3h3v10h10V10h3V7z" />
    </svg>
  ),
  gloves: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 11V8a2 2 0 00-4 0m4 3a2 2 0 014 0v3M18 11a2 2 0 00-4 0v1m4-1v1m0 0v4a5 5 0 01-10 0v-7a2 2 0 014 0" />
    </svg>
  ),
  store: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  ),
  about: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  contact: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.12 1.18 2 2 0 012.09 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" />
    </svg>
  ),
};

const DEFAULT_ICON = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
  </svg>
);

const getNavIcon = (name = "") =>
  NAV_ICON_MAP[name.toLowerCase()] || DEFAULT_ICON;

/* ─── INLINE ICONS ─── */
const ChevronRight = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const CloseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <path d="M2 2l8 8M10 2l-8 8" />
  </svg>
);

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
  </svg>
);

const HeartIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const CartIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);

const OrdersIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

/* ─── COMPONENT ─── */
const MobileMenu = ({ menuOpen, setMenuOpen, links, openSearch }) => {
  const { cartItems = [] } = useCart();
  const { wishlist = [] } = useWishlist();
  const { user, logout } = useUser();

  const cartCount = cartItems.reduce((s, i) => s + (i.quantity || 1), 0);
  const firstName = user?.name?.split(" ")[0] || null;

  const close = () => setMenuOpen(false);

  const handleSearchClick = () => {
    close();
    openSearch?.();
  };

  return (
    <>
      {/* OVERLAY */}
      <div
        className={`mobile-overlay ${menuOpen ? "mobile-overlay--open" : ""}`}
        onClick={close}
        aria-hidden="true"
      />

      {/* PANEL */}
      <div
        className={`mobile-panel ${menuOpen ? "mobile-panel--open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* ── HEADER ── */}
        <div className="mobile-panel-header">
          <div className="mp-brand">
            <div className="mp-brand-dot">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <span className="mp-brand-name">Moto Park</span>
              <span className="mp-brand-est">— EST. 2020 —</span>
            </div>
          </div>
          <button className="mobile-close-btn" onClick={close} aria-label="Close menu">
            <CloseIcon />
          </button>
        </div>

        {/* ── SEARCH BAR ── */}
        <button className="mp-search-bar" onClick={handleSearchClick} aria-label="Search">
          <span className="mp-search-icon"><SearchIcon /></span>
          <span className="mp-search-placeholder">Search gear, helmets...</span>
          <span className="mp-search-kbd">⌘K</span>
        </button>

        {/* ── NAV LINKS ── */}
        <div className="mp-section-label">Browse</div>
        <nav className="mobile-nav-links">
          {links.map((link, i) => {
            const isLast = i === links.length - 1;
            return (
              <NavLink
                key={link._id}
                to={getPath(link)}
                onClick={close}
                className={({ isActive }) =>
                  `mobile-nav-link ${isActive ? "mobile-nav-link--active" : ""} ${isLast ? "mobile-nav-link--cta" : ""}`
                }
              >
                <span className="mp-link-left">
                  <span className="mp-link-icon">{getNavIcon(link.name)}</span>
                  <span>{link.name}</span>
                </span>
                <ChevronRight />
              </NavLink>
            );
          })}
        </nav>

        {/* ── QUICK ACCESS ── */}
        <div className="mp-section-label">Quick access</div>
        <div className="mp-quick-row">
          <NavLink to="/orders" onClick={close} className="mobile-icon-btn" aria-label="My Orders">
            <OrdersIcon />
            <span>Orders</span>
          </NavLink>
          <NavLink to="/wishlist" onClick={close} className="mobile-icon-btn" aria-label="Wishlist">
            <HeartIcon />
            <span>Wishlist</span>
            {wishlist.length > 0 && (
              <span className="mobile-badge">{wishlist.length > 9 ? "9+" : wishlist.length}</span>
            )}
          </NavLink>
          <NavLink to="/cart" onClick={close} className="mobile-icon-btn" aria-label="Cart">
            <CartIcon />
            <span>Cart</span>
            {cartCount > 0 && (
              <span className="mobile-badge">{cartCount > 9 ? "9+" : cartCount}</span>
            )}
          </NavLink>
        </div>

        {/* ── USER FOOTER ── */}
        <div className="mp-footer">
          {user ? (
            <>
              <NavLink to="/account" onClick={close} className="mp-footer-user">
                <div className="mp-footer-avatar">
                  {firstName?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="mp-footer-info">
                  <span className="mp-footer-name">{user.name}</span>
                  <span className="mp-footer-sub">{user.email || user.phone || "View profile"}</span>
                </div>
              </NavLink>
              <button
                className="mp-footer-logout"
                onClick={() => { logout?.(); close(); }}
                aria-label="Sign out"
              >
                <LogoutIcon />
              </button>
            </>
          ) : (
            <NavLink to="/login" onClick={close} className="mp-footer-login">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              <span>Sign in to your account</span>
            </NavLink>
          )}
        </div>
      </div>
    </>
  );
};

export default MobileMenu;