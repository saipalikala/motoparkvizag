import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Heart, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { useScrollThresholds } from '@/hooks/useScrollThresholds.js';
import { useCart } from '@/contexts/CartContext.jsx';
import { useWishlist } from '@/contexts/WishlistContext.jsx';
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
 * Mobile: Hamburger · Logo · Icons; search bar toggles open below on tap.
 */
export default function Navbar() {
  // Both thresholds share ONE scroll listener + ONE rAF loop (useScrollThresholds)
  // instead of one pair each — halves the per-frame scroll-handling work.
  // scrolled: any movement past 8px leaves the transparent state.
  // pastHero: past ~80% of the viewport height switches to cream frosted.
  const { scrolled, pastHero } = useScrollThresholds({
    scrolled: 8,
    pastHero: Math.round(window.innerHeight * 0.80),
  });

  const { count: cartCount } = useCart();
  const { count: wishCount } = useWishlist();
  const [cartPop, setCartPop] = useState(false);
  const [wishPop, setWishPop] = useState(false);

  useEffect(() => {
    if (cartCount > 0) {
      setCartPop(true);
      const t = setTimeout(() => setCartPop(false), 240);
      return () => clearTimeout(t);
    }
  }, [cartCount]);

  useEffect(() => {
    if (wishCount > 0) {
      setWishPop(true);
      const t = setTimeout(() => setWishPop(false), 240);
      return () => clearTimeout(t);
    }
  }, [wishCount]);
  const { categories, brands, bikes } = useNav();
  const [openMenu, setOpenMenu] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [openAccordion, setOpenAccordion] = useState(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isHome = pathname === '/';
  const navRef = useRef(null);
  const drawerRef = useRef(null);
  const searchBtnRef = useRef(null);
  const searchInputRef = useRef(null);
  const closeBtnRef = useRef(null);

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
    setSearchOpen(false);
  }, [pathname]);

  // Escape key closes open surfaces; return focus to the search
  // trigger so keyboard users don't lose their place.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpenMenu(null);
        setDrawerOpen(false);
        if (searchOpen) {
          setSearchOpen(false);
          searchBtnRef.current?.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [searchOpen]);

  // Autofocus the input whenever the mobile search bar opens.
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  // Mobile search toggle — only one of {drawer, search} open at a time.
  const toggleSearch = () => {
    setSearchOpen((open) => {
      const next = !open;
      if (next) setDrawerOpen(false);
      return next;
    });
  };

  // Trap body scroll while drawer is open; auto-focus the close button.
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    if (drawerOpen) closeBtnRef.current?.focus();
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

  // Full brand lockup (logo badge + wordmark) — the exact same markup
  // is reused verbatim in the mobile drawer header, not recreated.
  const brandLockup = (
    <Link to="/" className={styles.logo} aria-label="MotoPark — home">
      <img src={logoBadge} alt="" width="40" height="40" />
      {wordmark}
    </Link>
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
          onClick={() => {
            setDrawerOpen(true);
            setSearchOpen(false);
          }}
        >
          <Menu size={22} strokeWidth={1.8} aria-hidden="true" />
        </button>

        {/* Brand lockup */}
        {brandLockup}

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
          {/* Mobile: toggles the inline search bar (no navigation) */}
          <button
            ref={searchBtnRef}
            type="button"
            className={`${styles.iconBtn} ${styles.mobileOnly} ${searchOpen ? styles.iconBtnActive : ''}`}
            aria-label={searchOpen ? 'Close search' : 'Search'}
            aria-expanded={searchOpen}
            aria-controls="mobile-search-panel"
            onClick={toggleSearch}
          >
            {searchOpen ? (
              <X size={20} strokeWidth={1.8} aria-hidden="true" />
            ) : (
              <Search size={20} strokeWidth={1.8} aria-hidden="true" />
            )}
          </button>
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
            aria-label={`Wishlist${wishCount ? ` (${wishCount})` : ''}`}
          >
            <Heart size={20} strokeWidth={1.8} aria-hidden="true" />
            {wishCount > 0 && (
              <span className={`${styles.wishlistBadge} ${wishPop ? styles.badgePop : ''}`}>
                {wishCount > 9 ? '9+' : wishCount}
              </span>
            )}
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
              <span className={`${styles.cartBadge} ${cartPop ? styles.badgePop : ''}`}>
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

      {/* ── Mobile search bar — hidden by default, revealed on tap ── */}
      <div
        id="mobile-search-panel"
        className={`${styles.mobileSearchWrap} ${styles.mobileOnly} ${searchOpen ? styles.mobileSearchWrapOpen : ''}`}
      >
        <div className={styles.mobileSearchInner}>
          <form
            className={styles.mobileSearch}
            onSubmit={submitSearch}
            role="search"
            aria-hidden={!searchOpen}
          >
            <Search size={16} strokeWidth={1.8} aria-hidden="true" className={styles.searchIcon} />
            <input
              ref={searchInputRef}
              name="q"
              type="search"
              placeholder="Search helmets, jackets, brands…"
              aria-label="Search products"
              autoComplete="off"
              tabIndex={searchOpen ? 0 : -1}
            />
          </form>
        </div>
      </div>

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
                {brandLockup}
                <button
                  ref={closeBtnRef}
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
