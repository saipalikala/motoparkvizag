import { NavLink } from 'react-router-dom';
import { Heart, Home, Search, Store, User } from 'lucide-react';
import styles from './MobileBottomNav.module.css';

const TABS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/store', label: 'Shop', icon: Store },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/wishlist', label: 'Wishlist', icon: Heart },
  { to: '/account', label: 'Account', icon: User },
];

/** Mobile bottom tab bar (V1 continuity, DS §7). Hidden ≥1024px. */
export default function MobileBottomNav() {
  return (
    <nav className={styles.bar} aria-label="Primary">
      {TABS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
        >
          <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
