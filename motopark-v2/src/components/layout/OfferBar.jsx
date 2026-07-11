import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Zap, X } from 'lucide-react';
import styles from './OfferBar.module.css';

const DISMISS_KEY = 'mp-offerbar-dismissed';

/**
 * Offer bar — home only (V1 pattern, DS §7 Navbar spec).
 * One static message (Motion Doctrine: no rotation). Dismiss persists
 * for the session. Lightning bolt = the sanctioned badge accent for deals.
 */
export default function OfferBar({ message }) {
  const { pathname } = useLocation();
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(DISMISS_KEY) === '1',
  );

  if (pathname !== '/' || dismissed || !message) return null;

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <div className={styles.bar} role="region" aria-label="Current offer">
      <Link to={message.href} className={styles.message}>
        <Zap size={14} strokeWidth={2} aria-hidden="true" className={styles.bolt} />
        <span>{message.text}</span>
      </Link>
      <button
        type="button"
        className={styles.dismiss}
        onClick={dismiss}
        aria-label="Dismiss offer"
      >
        <X size={16} strokeWidth={1.8} aria-hidden="true" />
      </button>
    </div>
  );
}
