import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { BadgeCheck, ChevronDown, Heart, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { useScrolled } from '@/hooks/useScrolled.js';
import { useCart } from '@/contexts/CartContext.jsx';
import { BIKE_MENU, BRAND_MENU, CATEGORY_MENU } from '@/config/nav.js';
import logoBadge from '@/assets/images/logo-badge.png';
import styles from './Navbar.module.css';

const MENUS = [
  { id: 'shop', label: 'Shop', to: '/store', items: CATEGORY_MENU, base: '/c', eyebrow: 'Gear up by category' },
  { id: 'brands', label: 'Brands', to: null, items: BRAND_MENU, base: '/brand', eyebrow: 'Genuine brands only' },
  { id: 'bikes', label: 'Shop by Bike', to: '/bikes', items: BIKE_MENU, base: '/bikes', eyebrow: 'Made for your machine' },
];

/**
 * MotoPark two-tier header (Design Lead redesign).
 * Tier 1: brand lockup · always-visible search (Experience Principle #1) · utilities.
 * Tier 2: category rail + trust micro-signature (Commerce Law 3 in the chrome).
 * Mobile: single bar + persistent search + drawer (unchanged structure).
 */
export default function Navbar() {
  const scrolled = useScrolled(8);
  const { count: cartCount } = useCart();
  const [openMenu, setOpenMenu] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openAccordion, setOpenAccordion] = useState(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const navRef = useRef(null);
  const drawerRef = useRef(null);

  useEffect(() => {
    setOpenMenu(null);
    setDrawerOpen(false);
  }, [pathname]);

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

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    if (drawerOpen) drawerRef.current?.querySelector('a,button')?.focus();
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!openMenu) return;
    const onClick = (e) => {
      if (!navRef.current?.contains(e.target)) setOpenMenu(null);
    };
    document.addEventListener('pointerdown', onClick);
    return () => document.removeEventListener('pointerdown', onClick);
  }, [openMenu]);

  const submitSearch = (e) => {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get('q')?.toString().trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const lockup = (
    <span className={styles.wordmark}>
      <span className={styles.wordmarkName}>
        MOTO<em>PARK</em>
      </span>
      <span className={styles.est}>EST. 2020 · VIZAG</span>
    </span>
  );

  return (
    <header ref={navRef} className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
      {/* ── Tier 1: brand · search · utilities ── */}
      <div className={styles.tier1}>
        <button
          type="button"
          className={`${styles.iconBtn} ${styles.mobileOnly}`}
          aria-label="Open menu"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
        >
          <Menu size={22} strokeWidth={1.8} aria-hidden="true" />
        </button>

        <Link to="/" className={styles.logo} aria-label="MotoPark — home">
          <img src={logoBadge} alt="" width="44" height="44" />
          {lockup}
        </Link>

        {/* Desktop: search is a first-class field, not an icon */}
        <form className={`${styles.searchBar} ${styles.desktopOnly}`} onSubmit={submitSearch} role="search">
          <Search size={17} strokeWidth={1.8} aria-hidden="true" className={styles.searchIcon} />
          <input
            name="q"
            type="search"
            placeholder="Search helmets, jackets, brands, your bike…"
            aria-label="Search products"
            autoComplete="off"
          />
        </form>

        <div className={styles.utils}>
          <Link to="/search" className={`${styles.iconBtn} ${styles.mobileOnly}`} aria-label="Search">
            <Search size={20} strokeWidth={1.8} aria-hidden="true" />
          </Link>
          <Link to="/wishlist" className={`${styles.iconBtn} ${styles.desktopOnly}`} aria-label="Wishlist">
            <Heart size={20} strokeWidth={1.8} aria-hidden="true" />
          </Link>
          <Link to="/account" className={`${styles.iconBtn} ${styles.desktopOnly}`} aria-label="Account">
            <User size={20} strokeWidth={1.8} aria-hidden="true" />
          </Link>
          <Link to="/cart" className={styles.iconBtn} aria-label={`Cart${cartCount ? ` (${cartCount})` : ''}`}>
            <ShoppingBag size={20} strokeWidth={1.8} aria-hidden="true" />
            {cartCount > 0 && <span className={styles.cartBadge}>{cartCount > 9 ? '9+' : cartCount}</span>}
          </Link>
        </div>
      </div>

      {/* ── Tier 2 (desktop): category rail + trust signature ── */}
      <div className={`${styles.rail} ${styles.desktopOnly}`}>
        <nav className={styles.railNav} aria-label="Categories">
          {MENUS.map((menu) => (
            <div key={menu.id} className={styles.railItem}>
              <button
                type="button"
                className={styles.railBtn}
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
                <ChevronDown size={13} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          ))}
          <NavLink to="/collections" className={styles.railBtn}>
            Collections
          </NavLink>
          <NavLink to="/store" className={styles.railBtn}>
            All Gear
          </NavLink>
        </nav>

        <p className={styles.trustSig}>
          <BadgeCheck size={14} strokeWidth={1.8} aria-hidden="true" />
          Genuine gear · Vizag → Pan-India
        </p>
      </div>

      {/* ── Mega panel (full-width, rail-anchored) ── */}
      {openMenu && (
        <div className={styles.mega} role="menu" onMouseLeave={() => setOpenMenu(null)}>
          {MENUS.filter((m) => m.id === openMenu).map((menu) => (
            <div key={menu.id} className={styles.megaInner}>
              <p className={styles.megaEyebrow}>{menu.eyebrow}</p>
              <ul className={styles.megaGrid}>
                {menu.items.map((item) => (
                  <li key={item.slug}>
                    <Link role="menuitem" to={`${menu.base}/${item.slug}`} className={styles.megaLink}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
              {menu.to && (
                <Link to={menu.to} className={styles.megaAll}>
                  View all {menu.label.toLowerCase()} →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Mobile persistent search ── */}
      <form className={`${styles.mobileSearch} ${styles.mobileOnly}`} onSubmit={submitSearch} role="search">
        <Search size={16} strokeWidth={1.8} aria-hidden="true" className={styles.searchIcon} />
        <input
          name="q"
          type="search"
          placeholder="Search helmets, jackets, brands…"
          aria-label="Search products"
          autoComplete="off"
        />
      </form>

      {/* ── Mobile drawer (portaled) ── */}
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
                  className={styles.iconBtn}
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
                    onClick={() => setOpenAccordion(openAccordion === menu.id ? null : menu.id)}
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
                      {menu.items.map((item) => (
                        <li key={item.slug}>
                          <Link to={`${menu.base}/${item.slug}`} className={styles.accordionLink}>
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
