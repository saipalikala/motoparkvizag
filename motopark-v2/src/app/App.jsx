import AppRouter from './router.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import OfferBar from '@/components/layout/OfferBar.jsx';
import Navbar from '@/components/layout/Navbar.jsx';
import MobileBottomNav from '@/components/layout/MobileBottomNav.jsx';
import Footer from '@/components/layout/Footer.jsx';
import AssistantWidget from '@/features/assistant/AssistantWidget.jsx';
import { AuthProvider } from '@/contexts/AuthContext.jsx';
import { CartProvider } from '@/contexts/CartContext.jsx';
import { WishlistProvider } from '@/contexts/WishlistContext.jsx';
import { OFFER_MESSAGE } from '@/config/nav.js';

/** App shell: OfferBar (home only) → Navbar → routed main → bottom nav.
 *  Auth + Cart + Wishlist providers wrap the shell so chrome + pages share them. */
export default function App() {
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
