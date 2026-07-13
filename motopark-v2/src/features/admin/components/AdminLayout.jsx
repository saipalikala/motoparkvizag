import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Menu, ShieldCheck, X } from 'lucide-react';
import { ADMIN_NAV } from '../config/adminNav.js';
import { useAdminAuth } from '../AdminAuthContext.jsx';
import styles from './AdminLayout.module.css';

/**
 * AdminLayout — the admin shell: fixed sidebar (8 roadmap sections), a topbar
 * with the signed-in admin + logout, and a scrolling content area rendering the
 * active route via <Outlet />.
 *
 * Deliberately NONE of the storefront chrome (Navbar/Footer/OfferBar/bottom
 * nav/assistant) — this is a separate realm. On mobile the sidebar collapses
 * into an off-canvas drawer.
 */
export default function AdminLayout() {
  const { email, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const onLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      navigate('/admin/login', { replace: true });
    }
  };

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <div className={styles.shell}>
      {/* ── Sidebar (off-canvas on mobile) ─────────────────── */}
      <aside
        className={`${styles.sidebar} ${drawerOpen ? styles.sidebarOpen : ''}`}
        aria-label="Admin navigation"
      >
        <div className={styles.brand}>
          <span className={styles.brandBadge} aria-hidden="true">
            <ShieldCheck size={20} />
          </span>
          <span className={styles.brandText}>MotoPark</span>
          <button
            type="button"
            className={styles.drawerClose}
            onClick={closeDrawer}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <nav className={styles.nav}>
          {ADMIN_NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={closeDrawer}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
              }
            >
              <Icon size={18} className={styles.navIcon} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Scrim behind the mobile drawer */}
      {drawerOpen && <div className={styles.scrim} onClick={closeDrawer} aria-hidden="true" />}

      {/* ── Main column ────────────────────────────────────── */}
      <div className={styles.main}>
        <header className={styles.topbar}>
          <button
            type="button"
            className={styles.menuBtn}
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={22} />
          </button>

          <div className={styles.topbarSpacer} />

          <div className={styles.session}>
            <div className={styles.sessionMeta}>
              <span className={styles.sessionRole}>Administrator</span>
              <span className={styles.sessionEmail} title={email ?? undefined}>
                {email ?? 'Signed in'}
              </span>
            </div>
            <button
              type="button"
              className={styles.logout}
              onClick={onLogout}
              disabled={loggingOut}
            >
              <LogOut size={16} />
              <span>{loggingOut ? 'Signing out…' : 'Logout'}</span>
            </button>
          </div>
        </header>

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
