import { useLocation } from 'react-router-dom';
import AppRouter from './router.jsx';
import { usePageViews } from '@/hooks/usePageViews.js';
import ErrorBoundary from './ErrorBoundary.jsx';
import OfferBar from '@/components/layout/OfferBar.jsx';
import Navbar from '@/components/layout/Navbar.jsx';
import MobileBottomNav from '@/components/layout/MobileBottomNav.jsx';
import Footer from '@/components/layout/Footer.jsx';
import AssistantWidget from '@/features/assistant/AssistantWidget.jsx';
import AdminApp from '@/features/admin/AdminApp.jsx';
import { AuthProvider } from '@/contexts/AuthContext.jsx';
import { CartProvider } from '@/contexts/CartContext.jsx';
import { WishlistProvider } from '@/contexts/WishlistContext.jsx';
import { OFFER_MESSAGE } from '@/config/nav.js';

/** App shell: OfferBar (home only) → Navbar → routed main → bottom nav.
 *  Auth + Cart + Wishlist providers wrap the shell so chrome + pages share them.
 *
 *  The /admin realm is fully separate (docs/HANDOFF §3): its own auth token, API
 *  client, and shell. We branch on the path so admin renders NONE of the
 *  storefront chrome or providers — and vice versa. */
export default function App() {
  const { pathname } = useLocation();
  usePageViews(); // GA4 SPA page views (no-op unless VITE_GA_MEASUREMENT_ID is set)
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return <AdminApp />;
  }

  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <OfferBar message={OFFER_MESSAGE} />
        <Navbar />
        <main id="main" style={{ paddingBottom: 'var(--space-16)' }}>
          <ErrorBoundary>
            <AppRouter />
          </ErrorBoundary>
        </main>
        <Footer />
        <MobileBottomNav />
        <AssistantWidget />
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}
