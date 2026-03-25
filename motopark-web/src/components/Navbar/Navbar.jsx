import { useEffect, useState } from "react";
import NavLinks from "./NavLinks";
import NavIcons from "./NavIcons";
import MobileMenu from "./MobileMenu";
import SearchOverlay from "../SearchOverlay/SearchOverlay";
import "./Navbar.css";

import { API } from "@/config/api";

const Navbar = () => {
  const [navbar, setNavbar] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/navbar`)
      .then(r => r.json())
      .then(setNavbar)
      .catch(console.error);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* lock body scroll when mobile menu is open */
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
            openMenu={() => setMenuOpen(true)}
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