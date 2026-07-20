import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Heart, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { useScrolled } from '@/hooks/useScrolled.js';
import { useCart } from '@/contexts/CartContext.jsx';
import { useNav } from '@/contexts/NavContext.jsx';
import logoBadge from '@/assets/images/logo-badge.png';
import styles from './Navbar.module.css';

/**
 * MotoPark single-tier premium navbar.
 *
 * Three visual states on the homepage:
 *   1. Transparent   — at the very top, navbar overlays the hero.
 *   2. Navy glass    — scrolling through the hero (subtle frosted dark).
 *   3. Cream frosted — once past the hero (matches the rest of the storefront).
 *
 * All non-home routes: position sticky, always cream-frosted glass.
 *
 * State is driven by two scroll thresholds (both rAF-throttled via useScrolled):
 *   - scrolled   : any movement past 8 px → glass activates.
 *   - pastHero   : past ~80% of the viewport height → cream frosted.
 *
 * Structure (single row): Logo · Nav links (desktop) · Utilities
 * Mobile: Hamburger · Logo · Icons + persistent search bar below.
 */
export default function Navbar() {
  // Any scroll beyond 8 px → leave transparent state.
  const scrolled = useScrolled(8);
  // Past approximately the hero section (80 vh) → switch to cream frosted.
  // Computed once at mount; acceptable for this purpose (no SSR, no resize events needed).
  const pastHero = useScrolled(Math.round(window.innerHeight * 0.80));

  const { count: cartCount } = useCart();
  const { categories, brands, bikes } = useNav();
  const [openMenu, setOpenMenu] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openAccordion, setOpenAccordion] = useState(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isHome = pathname === '/';
  const navRef = useRef(null);
  const drawerRef = useRef(null);

  // Built from live nav data (NavContext), seeded from config/nav.js.
  // Shape is unchanged — mega panel and mobile accordion render exactly as before.
  const MENUS = useMemo(
    () => [
      { id: 'shop', label: 'Shop', to: '/store', items: categories, base: '/c', eyebrow: 'Gear up by category' },
      { id: 'brands', label: 'Brands', to: null, items: brands, base: '/brand', eyebrow: 'Genuine brands only' },
      { id: 'bikes', label: 'Shop by Bike', to: '/bikes', groups: bikes, base: '/bikes', eyebrow: 'Made for your machine' },
    ],
    [categories, brands, bikes],
  );

  // Close menus on route change.
  useEffect(() => {
    setOpenMenu(null);
    setDrawerOpen(false);
  }, [pathname]);

  // Escape key closes open surfaces.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpenMenu(null);
        setDrawerOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Trap body scroll while drawer is open; auto-focus first focusable.
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    if (drawerOpen) drawerRef.current?.querySelector('a,button')?.focus();
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  // Close mega panel on outside click.
  useEffect(() => {
    if (!openMenu) return;
    const onClick = (e) => {
      if (!navRef.current?.contains(e.target)) setOpenMenu(null);
    };
    document.addEventListener('pointerdown', onClick);
    return () => document.removeEventListener('pointerdown', onClick);
  }, [openMenu]);

  // Mobile search form submit → navigate to search page.
  const submitSearch = (e) => {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get('q')?.toString().trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  // MOTOPARK wordmark — shared between main bar and mobile drawer.
  const wordmark = (
    <span className={styles.wordmark}>
      <span className={styles.wordmarkName}>
        MOTO<em>PARK</em>
      </span>
      <span className={styles.est}>EST. 2020 · VIZAG</span>
    </span>
  );

  // Compose header class from the three scroll state flags.
  const headerClass = [
    styles.header,
    isHome   && styles.isHome,
    scrolled && styles.scrolled,
    pastHero && styles.pastHero,
  ].filter(Boolean).join(' ');

  return (
    <header ref={navRef} className={headerClass}>

      {/* ── Single premium row ─────────────────────────────── */}
      <div className={styles.inner}>

        {/* Mobile only: hamburger menu trigger */}
        <button
          type="button"
          className={`${styles.iconBtn} ${styles.mobileOnly}`}
          aria-label="Open menu"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
        >
          <Menu size={22} strokeWidth={1.8} aria-hidden="true" />
        </button>

        {/* Brand lockup */}
        <Link to="/" className={styles.logo} aria-label="MotoPark — home">
          <img src={logoBadge} alt="" width="40" height="40" />
          {wordmark}
        </Link>

        {/* Desktop: category navigation (centre) */}
        <nav className={`${styles.navLinks} ${styles.desktopOnly}`} aria-label="Main navigation">
          {MENUS.map((menu) => (
            <div key={menu.id} className={styles.navItem}>
              <button
                type="button"
                className={styles.navBtn}
                aria-expanded={openMenu === menu.id}
                aria-haspopup="true"
                onMouseEnter={() => setOpenMenu(menu.id)}
                onClick={() =>
                  menu.to && openMenu === menu.id
                    ? navigate(menu.to)
                    : setOpenMenu(openMenu === menu.id ? null : menu.id)
                }
              >
                {menu.label}
                <ChevronDown size={12} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          ))}
          <NavLink
            to="/collections"
            className={({ isActive }) =>
              `${styles.navBtn} ${isActive ? styles.navBtnActive : ''}`
            }
          >
            Collections
          </NavLink>
          <NavLink
            to="/store"
            className={({ isActive }) =>
              `${styles.navBtn} ${isActive ? styles.navBtnActive : ''}`
            }
          >
            All Gear
          </NavLink>
        </nav>

        {/* Utility icons (right edge) */}
        <div className={styles.utils}>
          {/* Mobile: search → /search page */}
          <Link
            to="/search"
            className={`${styles.iconBtn} ${styles.mobileOnly}`}
            aria-label="Search"
          >
            <Search size={20} strokeWidth={1.8} aria-hidden="true" />
          </Link>
          {/* Desktop: search icon → /search page */}
          <Link
            to="/search"
            className={`${styles.iconBtn} ${styles.desktopOnly}`}
            aria-label="Search products"
          >
            <Search size={20} strokeWidth={1.8} aria-hidden="true" />
          </Link>
          <Link
            to="/wishlist"
            className={`${styles.iconBtn} ${styles.desktopOnly}`}
            aria-label="Wishlist"
          >
            <Heart size={20} strokeWidth={1.8} aria-hidden="true" />
          </Link>
          <Link
            to="/account"
            className={`${styles.iconBtn} ${styles.desktopOnly}`}
            aria-label="Account"
          >
            <User size={20} strokeWidth={1.8} aria-hidden="true" />
          </Link>
          <Link
            to="/cart"
            className={styles.iconBtn}
            aria-label={`Cart${cartCount ? ` (${cartCount})` : ''}`}
          >
            <ShoppingBag size={20} strokeWidth={1.8} aria-hidden="true" />
            {cartCount > 0 && (
              <span className={styles.cartBadge}>
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* ── Mega panel (full-width, anchored below the single row) ── */}
      {openMenu && (
        <div className={styles.mega} role="menu" onMouseLeave={() => setOpenMenu(null)}>
          {MENUS.filter((m) => m.id === openMenu).map((menu) => (
            <div key={menu.id} className={styles.megaInner}>
              <p className={styles.megaEyebrow}>{menu.eyebrow}</p>

              {menu.groups ? (
                <div className={styles.megaGroups}>
                  {menu.groups.map((group) => (
                    <div key={group.makeSlug} className={styles.megaGroup}>
                      <Link
                        role="menuitem"
                        to={`${menu.base}/${group.makeSlug}`}
                        className={styles.megaGroupTitle}
                      >
                        {group.make}
                      </Link>
                      {group.models.length > 0 && (
                        <ul className={styles.megaGroupList}>
                          {group.models.map((m) => (
                            <li key={m.slug}>
                              <Link
                                role="menuitem"
                                to={`${menu.base}/${group.makeSlug}/${m.slug}`}
                                className={styles.megaLink}
                              >
                                {m.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <ul className={styles.megaGrid}>
                  {menu.items.map((item) => (
                    <li key={item.slug}>
                      <Link
                        role="menuitem"
                        to={`${menu.base}/${item.slug}`}
                        className={styles.megaLink}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {menu.to && (
                <Link to={menu.to} className={styles.megaAll}>
                  View all {menu.label.toLowerCase()} →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Mobile persistent search bar ─────────────────── */}
      <form
        className={`${styles.mobileSearch} ${styles.mobileOnly}`}
        onSubmit={submitSearch}
        role="search"
      >
        <Search size={16} strokeWidth={1.8} aria-hidden="true" className={styles.searchIcon} />
        <input
          name="q"
          type="search"
          placeholder="Search helmets, jackets, brands…"
          aria-label="Search products"
          autoComplete="off"
        />
      </form>

      {/* ── Mobile drawer (portaled to document.body, always solid bg) ── */}
      {drawerOpen &&
        createPortal(
          <div className={styles.drawerOverlay} onClick={() => setDrawerOpen(false)}>
            <div
              ref={drawerRef}
              className={styles.drawer}
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.drawerHead}>
                <span className={styles.drawerBrand}>
                  <img src={logoBadge} alt="" width="32" height="32" />
                  <span className={styles.drawerTitle}>
                    MOTO<em>PARK</em>
                  </span>
                </span>
                <button
                  type="button"
                  className={styles.drawerClose}
                  aria-label="Close menu"
                  onClick={() => setDrawerOpen(false)}
                >
                  <X size={22} strokeWidth={1.8} aria-hidden="true" />
                </button>
              </div>

              {MENUS.map((menu) => (
                <div key={menu.id} className={styles.accordion}>
                  <button
                    type="button"
                    className={styles.accordionBtn}
                    aria-expanded={openAccordion === menu.id}
                    onClick={() =>
                      setOpenAccordion(openAccordion === menu.id ? null : menu.id)
                    }
                  >
                    {menu.label}
                    <ChevronDown
                      size={16}
                      strokeWidth={1.8}
                      aria-hidden="true"
                      className={openAccordion === menu.id ? styles.chevronOpen : ''}
                    />
                  </button>
                  {openAccordion === menu.id && (
                    <ul className={styles.accordionList}>
                      {menu.groups
                        ? menu.groups.map((group) => (
                            <li key={group.makeSlug}>
                              <Link
                                to={`${menu.base}/${group.makeSlug}`}
                                className={styles.accordionLink}
                              >
                                {group.make}
                              </Link>
                              {group.models.map((m) => (
                                <Link
                                  key={m.slug}
                                  to={`${menu.base}/${group.makeSlug}/${m.slug}`}
                                  className={styles.accordionSubLink}
                                >
                                  {m.label}
                                </Link>
                              ))}
                            </li>
                          ))
                        : menu.items.map((item) => (
                            <li key={item.slug}>
                              <Link
                                to={`${menu.base}/${item.slug}`}
                                className={styles.accordionLink}
                              >
                                {item.label}
                              </Link>
                            </li>
                          ))}
                      {menu.to && (
                        <li>
                          <Link to={menu.to} className={styles.accordionAll}>
                            View all →
                          </Link>
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              ))}

              <div className={styles.drawerLinks}>
                <Link to="/collections">Collections</Link>
                <Link to="/store">All Gear</Link>
                <Link to="/track">Track Order</Link>
                <Link to="/about">About MotoPark</Link>
                <Link to="/contact">Contact</Link>
              </div>

              <div className={styles.drawerFoot}>
                <p className={styles.drawerTagline}>Genuine gear. No compromises.</p>
                <p className={styles.drawerMeta}>Vizag showroom · Shipping Pan-India</p>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </header>
  );
}
