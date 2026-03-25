import { NavLink } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";

const getPath = (link) => {
  if (["/", "/about", "/contact", "/store"].includes(link.path)) return link.path;
  const slug = link.path?.replace("/", "").toLowerCase();
  return `/category/${slug}`;
};

const ChevronRight = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const CloseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M2 2l8 8M10 2l-8 8" />
  </svg>
);

const HeartIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
    stroke="rgba(255,255,255,0.65)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const CartIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
    stroke="rgba(255,255,255,0.65)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);

const OrdersIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
    stroke="rgba(255,255,255,0.65)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const MobileMenu = ({ menuOpen, setMenuOpen, links }) => {
  const { cartItems = [] } = useCart();
  const { wishlist = [] } = useWishlist();

  const close = () => setMenuOpen(false);

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
        {/* HEADER */}
        <div className="mobile-panel-header">
          <span className="mobile-brand">Moto Park</span>
          <button className="mobile-close-btn" onClick={close} aria-label="Close menu">
            <CloseIcon />
          </button>
        </div>

        {/* LINKS */}
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
                <span>{link.name}</span>
                <ChevronRight />
              </NavLink>
            );
          })}
        </nav>

        {/* FOOTER — quick icons */}
        <div className="mobile-panel-footer">
          <p className="mobile-footer-label">Quick Access</p>
          <div className="mobile-footer-icons">
            <NavLink to="/orders" onClick={close} className="mobile-icon-btn" aria-label="My Orders">
              <OrdersIcon />
              <span>Orders</span>
            </NavLink>
            <NavLink to="/wishlist" onClick={close} className="mobile-icon-btn" aria-label="Wishlist">
              <HeartIcon />
              <span>Wishlist</span>
              {wishlist.length > 0 && (
                <span className="mobile-badge">{wishlist.length}</span>
              )}
            </NavLink>
            <NavLink to="/cart" onClick={close} className="mobile-icon-btn" aria-label="Cart">
              <CartIcon />
              <span>Cart</span>
              {cartItems.length > 0 && (
                <span className="mobile-badge">{cartItems.length}</span>
              )}
            </NavLink>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileMenu;