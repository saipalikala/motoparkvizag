import { lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import AppRouter from './router.jsx';
import { usePageViews } from '@/hooks/usePageViews.js';
import ErrorBoundary from './ErrorBoundary.jsx';
import Navbar from '@/components/layout/Navbar.jsx';
import MobileBottomNav from '@/components/layout/MobileBottomNav.jsx';
import Footer from '@/components/layout/Footer.jsx';
import AssistantWidget from '@/features/assistant/AssistantWidget.jsx';
import { CampaignProvider } from '@/features/campaigns/CampaignContext.jsx';

/** Admin is lazy so its shell + AdminAuthContext + AdminRoute stay OUT of the
 *  entry chunk every shopper downloads. The routes inside AdminApp were already
 *  lazy, but a static import here still dragged the wrapper in (docs/11 §10). */
const AdminApp = lazy(() => import('@/features/admin/AdminApp.jsx'));

/** Campaign overlay: lazy so it never enters the initial bundle. Falls back to
 *  nothing (null) — the homepage renders fully without it. */
const CampaignOverlay = lazy(() =>
  import('@/features/campaigns/CampaignOverlay.jsx').catch(() => ({ default: () => null })),
);

import { AuthProvider } from '@/contexts/AuthContext.jsx';
import { CartProvider } from '@/contexts/CartContext.jsx';
import { WishlistProvider } from '@/contexts/WishlistContext.jsx';
import { NavProvider } from '@/contexts/NavContext.jsx';
import { ToastProvider } from '@/contexts/ToastContext.jsx';

/** App shell: Navbar → routed main → bottom nav → campaign overlay (portal, homepage only).
 *  Auth + Cart + Wishlist providers wrap the shell so chrome + pages share them.
 *
 *  The /admin realm is fully separate (docs/HANDOFF §3): its own auth token, API
 *  client, and shell. We branch on the path so admin renders NONE of the
 *  storefront chrome or providers — and vice versa.
 *
 *  The OfferBar (V1) has been replaced by the Campaign Experience System.
 *  See src/features/campaigns/ for the full implementation. */
export default function App() {
  const { pathname } = useLocation();
  usePageViews(); // GA4 SPA page views (no-op unless VITE_GA_MEASUREMENT_ID is set)
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return (
      <Suspense fallback={<div style={{ minHeight: '100dvh' }} aria-busy="true" aria-label="Loading admin" />}>
        <AdminApp />
      </Suspense>
    );
  }

  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
        <NavProvider>
        <CampaignProvider>
        <ToastProvider>
          <a className="skip-link" href="#main">
            Skip to content
          </a>
          <Navbar />
          <main id="main" style={{ paddingTop: 'var(--nav-height)', paddingBottom: 'var(--space-16)' }}>
            <ErrorBoundary>
              <AppRouter />
            </ErrorBoundary>
          </main>
          <Footer />
          <MobileBottomNav />
          <AssistantWidget />
          {/* Campaign Experience System — portaled overlay, homepage only.
              Lazy-loaded so it never blocks initial render or LCP. */}
          <Suspense fallback={null}>
            <CampaignOverlay />
          </Suspense>
        </ToastProvider>
        </CampaignProvider>
        </NavProvider>
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}
