/**
 * src/components/Navbar/Navbar.jsx
 *
 * FIXES APPLIED:
 * ─────────────────────────────────────────────────────────────
 * [F1] Raw fetch → cachedFetch
 *      Before: fetch(`${API}/navbar`) — no cache, no deduplication.
 *      Every mount fires a new request. StrictMode = 2 requests.
 *      App.jsx remount on admin↔user nav = another request.
 *      After: cachedFetch shares one promise, serves from memory
 *      for 5 minutes, sessionStorage for back/forward navigation.
 *
 * [F2] AbortController + isMounted guard
 *      Before: no cleanup. On unmount, the promise would still
 *      resolve and call setNavbar on an unmounted component —
 *      causing React's "state update on unmounted component" warning.
 *      After: ctrl.abort() in cleanup, alive flag guards setState.
 *
 * [F3] AbortError filtering
 *      Before: console.error caught everything including aborts.
 *      AbortErrors are expected and should be silent.
 *      After: only non-abort errors are logged.
 */

import { useEffect, useState } from "react";
import NavLinks from "./NavLinks";
import NavIcons from "./NavIcons";
import MobileMenu from "./MobileMenu";
import SearchOverlay from "../SearchOverlay/SearchOverlay";
import "./Navbar.css";

import { API } from "@/config/api";
import { cachedFetch } from "@/lib/apiCache"; // [F1]

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

          {/* LOGO */}
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

          {/* DESKTOP LINKS */}
          <NavLinks links={navbar.links} />

          <div className="nav-divider" aria-hidden="true" />

          {/* ICONS */}
          <NavIcons
            openMenu={()   => setMenuOpen(true)}
            openSearch={() => setSearchOpen(true)}
          />

        </div>

        {/* BOTTOM ACCENT LINE */}
        <div className="nav-accent-line" aria-hidden="true" />
      </header>

      {/* MOBILE MENU */}
      <MobileMenu
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        links={navbar?.links || []}
      />

      {/* SEARCH */}
      <SearchOverlay open={searchOpen} setOpen={setSearchOpen} />
    </>
  );
};

export default Navbar;