import { NavLink } from "react-router-dom";

const getPath = (link) => {
  if (["/", "/about", "/contact", "/store"].includes(link.path)) return link.path;
  const slug = link.path?.replace("/", "").toLowerCase();
  return `/category/${slug}`;
};

const NavLinks = ({ links }) => (
  <nav className="nav-links" aria-label="Main navigation">
    {links.map((link, i) => {
      const isLast = i === links.length - 1;
      return (
        <NavLink
          key={link._id}
          to={getPath(link)}
          className={({ isActive }) =>
            `nav-item ${isActive ? "nav-item--active" : ""} ${isLast ? "nav-item--cta" : ""}`
          }
        >
          {link.name}
        </NavLink>
      );
    })}
  </nav>
);

export default NavLinks;