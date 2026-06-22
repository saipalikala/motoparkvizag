import { NavLink } from "react-router-dom";

/**
 * src/components/Navbar/MobileBottomNav.jsx
 *
 * Persistent floating glass-pill bottom navigation, shown on mobile only
 * (CSS-driven via .mobile-bottom-nav, max-width: 768px).
 *
 * Owned by Navbar — always visible regardless of slide-out menu state.
 * Matches the mobile reference image: Home / Helmets / Jackets / Gloves / Profile.
 */

const ICON_HOME = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const ICON_HELMET = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2C7 2 3 6.5 3 11v2a2 2 0 002 2h1l1 3h10l1-3h1a2 2 0 002-2v-2c0-4.5-4-9-9-9z" />
  </svg>
);
const ICON_JACKET = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 7l-4-4-4 3-4-3-4 4v3h3v10h10V10h3V7z" />
  </svg>
);
const ICON_GLOVE = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 11V8a2 2 0 00-4 0m4 3a2 2 0 014 0v3M18 11a2 2 0 00-4 0v1m4-1v1m0 0v4a5 5 0 01-10 0v-7a2 2 0 014 0" />
  </svg>
);
const ICON_PROFILE = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const BOTTOM_NAV_ITEMS = [
  { label: "Home",    icon: ICON_HOME,    to: "/" },
  { label: "Helmets", icon: ICON_HELMET,  to: "/category/helmets" },
  { label: "Jackets", icon: ICON_JACKET,  to: "/category/jackets" },
  { label: "Gloves",  icon: ICON_GLOVE,   to: "/category/gloves" },
  { label: "Profile", icon: ICON_PROFILE, to: "/account" },
];

const MobileBottomNav = () => (
  <nav className="mobile-bottom-nav" aria-label="Bottom navigation">
    {BOTTOM_NAV_ITEMS.map(({ label, icon, to }) => (
      <NavLink
        key={to}
        to={to}
        className={({ isActive }) =>
          `mobile-bottom-nav__item ${isActive ? "mobile-bottom-nav__item--active" : ""}`
        }
        aria-label={label}
      >
        {icon}
        <span className="mobile-bottom-nav__label">{label}</span>
      </NavLink>
    ))}
  </nav>
);

export default MobileBottomNav;