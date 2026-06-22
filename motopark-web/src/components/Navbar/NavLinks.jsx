import { NavLink } from "react-router-dom";

const getPath = (link) => {
  if (["/", "/about", "/contact", "/store"].includes(link.path)) return link.path;
  const slug = link.path?.replace("/", "").toLowerCase();
  return `/category/${slug}`;
};

/**
 * Renders one half of the desktop nav links, flanking the centered logo.
 *
 * `side="left"`  -> first half of `links`
 * `side="right"` -> second half of `links`, with the LAST link in the
 *                   full array styled as the highlighted CTA pill
 *                   (matches reference: orange "CONTACT" pill at far right).
 */
const NavLinks = ({ links, side = "left" }) => {
  const mid = Math.ceil(links.length / 2);
  const group = side === "left" ? links.slice(0, mid) : links.slice(mid);
  const lastIndexOverall = links.length - 1;

  return (
    <nav className={`nav-links nav-links--${side}`} aria-label="Main navigation">
      {group.map((link) => {
        const overallIndex = links.indexOf(link);
        const isCta = overallIndex === lastIndexOverall;
        return (
          <NavLink
            key={link._id}
            to={getPath(link)}
            className={({ isActive }) =>
              `nav-item ${isActive ? "nav-item--active" : ""} ${isCta ? "nav-item--cta" : ""}`
            }
          >
            {link.name}
          </NavLink>
        );
      })}
    </nav>
  );
};

export default NavLinks;