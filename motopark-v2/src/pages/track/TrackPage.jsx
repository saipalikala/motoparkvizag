import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { PackageSearch, MessageCircle } from 'lucide-react';
import Button from '@/components/ui/Button.jsx';
import OrderHistory from '@/features/account/OrderHistory.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { STORE } from '@/config/store.js';
import styles from './TrackPage.module.css';

/**
 * TrackPage `/track` — order tracking. Signed-in riders see their orders (V1
 * ties orders to the account and requires auth to read them). Guests are pointed
 * to sign-in, or to support for a guest order — honest, since the backend has no
 * secure guest-lookup-by-phone yet (would need an OTP code, per orderRoutes [F1]).
 */
export default function TrackPage() {
  const { isAuthed } = useAuth();

  return (
    <div className="container section">
      <Helmet>
        <title>Track your order — MotoPark</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <header className={styles.head}>
        <h1 className={styles.title}>Track your order</h1>
        <p className={styles.sub}>Follow your order from confirmed to delivered.</p>
      </header>

      {isAuthed ? (
        <OrderHistory />
      ) : (
        <div className={styles.prompt}>
          <span className={styles.icon} aria-hidden="true"><PackageSearch size={26} strokeWidth={1.6} /></span>
          <p className={styles.promptTitle}>Sign in to see your orders</p>
          <p className={styles.promptText}>
            Your orders are tied to your account for security. Sign in with your email to
            view status and history.
          </p>
          <Button as={Link} to="/login?redirect=/track" variant="primary">Sign in</Button>
          <p className={styles.guest}>
            Ordered as a guest? Message us on{' '}
            <a href={STORE.whatsapp} target="_blank" rel="noreferrer">
              <MessageCircle size={13} strokeWidth={1.9} aria-hidden="true" /> WhatsApp
            </a>{' '}
            with your order ID and we’ll help.
          </p>
        </div>
      )}
    </div>
  );
}
