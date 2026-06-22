/**
 * src/components/Navbar/Navbar.jsx
 *
 * OWNERSHIP (post-refactor)
 * ─────────────────────────────────────────────────────────────
 * Navbar owns the ENTIRE navigation system:
 *  - Centered logo
 *  - Desktop nav links (split left/right around the logo)
 *  - Search / user / wishlist / cart / orders icons
 *  - Mobile hamburger
 *  - Mobile slide-out menu (left side)
 *  - Mobile floating bottom navigation
 *
 * PremiumCarousel must never duplicate any of this.
 *
 * DESKTOP LAYOUT (matches reference image):
 *   [Hamburger] [Left nav links] [Centered logo] [Right nav links + CTA] [Icons]
 *
 * Renders as a floating glassmorphism pill (see Navbar.css .navbar),
 * fixed near the top of the viewport, overlaid on top of the hero carousel.
 *
 * FIXES RETAINED:
 * ─────────────────────────────────────────────────────────────
 * [F1] Raw fetch → cachedFetch
 *      cachedFetch shares one promise, serves from memory for 5 minutes,
 *      sessionStorage for back/forward navigation.
 *
 * [F2] AbortController + isMounted guard
 *      ctrl.abort() in cleanup, alive flag guards setState.
 *
 * [F3] AbortError filtering
 *      Only non-abort errors are logged.
 */

import { useEffect, useState } from "react";
import NavLinks from "./NavLinks";
import NavIcons from "./NavIcons";
import MobileMenu from "./MobileMenu";
import MobileBottomNav from "./MobileBottomNav";
import SearchOverlay from "../SearchOverlay/SearchOverlay";
import "./Navbar.css";

import { API } from "@/config/api";
import { cachedFetch } from "@/lib/apiCache"; // [F1]

const MenuIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const Navbar = () => {
  const [navbar,     setNavbar]     = useState(null);
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled,   setScrolled]   = useState(false);

  // [F1] + [F2] + [F3]: cached fetch with abort + isMounted guard
  useEffect(() => {
    const ctrl  = new AbortController();
    let   alive = true;

    cachedFetch(`${API}/navbar`, { signal: ctrl.signal })
      .then((data) => { if (alive) setNavbar(data); })
      .catch((err)  => { if (err.name !== "AbortError") console.error("[Navbar]", err); });

    return () => { alive = false; ctrl.abort(); };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Lock body scroll when mobile menu is open */
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  if (!navbar) return (
    <header className="navbar navbar--loading">
      <div className="nav-container">
        <div className="nav-skeleton" />
      </div>
    </header>
  );

  return (
    <>
      <header className={`navbar ${scrolled ? "navbar--scrolled" : ""}`}>
        <div className="nav-container">

          {/* HAMBURGER — opens the slide-out menu (left side) */}
          <button
            className="icon-btn nav-menu-btn"
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={menuOpen}
          >
            <MenuIcon />
          </button>

          {/* LEFT NAV LINKS (desktop) */}
          <NavLinks links={navbar.links} side="left" />

          {/* CENTERED LOGO */}
          <a href="/" className="nav-logo-wrap">
            <img
              src={navbar.logo?.startsWith("http") ? navbar.logo : `${API}${navbar.logo}`}
              alt="MotoPark"
              className="nav-logo-img"
            />
            <div className="nav-logo-text-wrap">
              <span className="nav-logo-name">Moto Park</span>
              <span className="nav-logo-sub">Est. 2020</span>
            </div>
          </a>

          {/* RIGHT NAV LINKS (desktop, includes CTA pill) */}
          <NavLinks links={navbar.links} side="right" />

          <div className="nav-divider" aria-hidden="true" />

          {/* ICONS — search / user / wishlist / cart / orders */}
          <NavIcons openSearch={() => setSearchOpen(true)} />

        </div>

        {/* BOTTOM ACCENT LINE */}
        <div className="nav-accent-line" aria-hidden="true" />
      </header>

      {/* MOBILE SLIDE-OUT MENU (left side) */}
      <MobileMenu
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        links={navbar?.links || []}
      />

      {/* MOBILE FLOATING BOTTOM NAV — always visible on mobile */}
      <MobileBottomNav />

      {/* SEARCH */}
      <SearchOverlay open={searchOpen} setOpen={setSearchOpen} />
    </>
  );
};

export default Navbar;