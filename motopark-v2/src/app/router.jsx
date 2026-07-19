import { lazy, Suspense } from 'react';
import { Navigate, Routes, Route, useParams } from 'react-router-dom';

/**
 * Route map = locked IA (docs/03 §1–2). Every page is lazy (docs/11 §10) so the
 * first paint ships only the shell + the landed route's chunk; heavy routes
 * (Checkout/Razorpay) load on demand. Chrome (Navbar/Footer) stays eager.
 *
 * HOME IS THE ONE EXCEPTION — eager, and deliberately so (docs/13 §3f).
 *
 * Lazy-loading the landing page costs a second round trip on the critical path:
 * the shell painted at ~1330 ms and the hero could not paint until the HomePage
 * chunk had been fetched and executed on top of that. Measured, LCP was 46-81%
 * "render delay" — the hero image bytes were already on the device (Load Delay
 * a flat 0 ms), waiting on the main thread rather than the network.
 *
 * Home is also the most-requested route, so its chunk is the one least worth
 * deferring. Every other route stays lazy; this costs the entry chunk the
 * homepage's weight and must be watched against the 180 kB route budget.
 */
import HomePage from '../pages/home/HomePage.jsx';

const StorePage = lazy(() => import('../pages/store/StorePage.jsx'));
const CategoryPage = lazy(() => import('../pages/category/CategoryPage.jsx'));
const ProductPage = lazy(() => import('../pages/product/ProductPage.jsx'));
const CartPage = lazy(() => import('../pages/cart/CartPage.jsx'));
const WishlistPage = lazy(() => import('../pages/wishlist/WishlistPage.jsx'));
const SearchPage = lazy(() => import('../pages/search/SearchPage.jsx'));
const BrandPage = lazy(() => import('../pages/brand/BrandPage.jsx'));
const BikesPage = lazy(() => import('../pages/bikes/BikesPage.jsx'));
const BikeMakePage = lazy(() => import('../pages/bikes/BikeMakePage.jsx'));
const BikeModelPage = lazy(() => import('../pages/bikes/BikeModelPage.jsx'));
const CollectionsPage = lazy(() => import('../pages/collections/CollectionsPage.jsx'));
const CollectionPage = lazy(() => import('../pages/collections/CollectionPage.jsx'));
const StaticPage = lazy(() => import('../pages/static/StaticPage.jsx'));
const NotFoundPage = lazy(() => import('../pages/static/NotFoundPage.jsx'));
const AuthPage = lazy(() => import('../pages/auth/AuthPage.jsx'));

const CheckoutPage = lazy(() => import('../pages/checkout/CheckoutPage.jsx'));
const TrackPage = lazy(() => import('../pages/track/TrackPage.jsx'));
const AccountPage = lazy(() => import('../pages/account/AccountPage.jsx'));

/**
 * Route fallback — reserves height so the footer never lands inside the viewport
 * while a chunk is loading.
 *
 * This used to reserve 60vh, which was not enough and made it the single largest
 * source of CLS on the site. Measured on staging at 1350x940: chrome (~157px) +
 * 60vh (564px) + main's padding put the footer at y849 — visible — and rendering
 * the real page then shoved it off screen. That one shift was 0.0968 of a total
 * 0.112 CLS, i.e. 86% of it, and it broke the ≤0.05 gate on its own.
 *
 * 100dvh guarantees chrome + main exceeds the viewport at every size, so the
 * footer starts below the fold and stays there. It is also a floor rather than a
 * fixed height, so short pages cannot pull the footer back up into view either.
 */
function PageLoader() {
  return <div style={{ minHeight: '100dvh' }} aria-busy="true" aria-label="Loading" />;
}

/**
 * ── V1 → V2 URL redirects ──────────────────────────────────────────────────
 *
 * V1 (motopark-web) served the same catalogue under different paths. At the
 * domain cutover every one of those URLs stays alive in Google's index, in
 * customer bookmarks, in WhatsApp shares and in order emails — and would land on
 * the 404 page.
 *
 * The AUTHORITATIVE redirects are 301s in vercel.json, issued at the edge before
 * the SPA loads: a client-side <Navigate> moves a human just fine but is a weak
 * signal for search, so indexed pages would shed ranking. These router-level
 * copies exist because vercel.json does not apply to `npm run dev`, and as a
 * backstop if an edge rule is ever removed.
 *
 * This comment lives here because vercel.json cannot hold one. Vercel validates
 * that file against a strict schema and rejects ANY unrecognised top-level key —
 * including the conventional "//" pseudo-comment, which fails the build outright
 * (`should NOT have additional property '//'`). Keep it to known keys only.
 *
 * `replace` keeps the dead URL out of history so Back doesn't bounce through it.
 */

/** `/product/:id` (V1, singular) → `/products/:slug`, param carries the same id. */
function LegacyProductRedirect() {
  const { id } = useParams();
  return <Navigate to={`/products/${id}`} replace />;
}

/** `/category/:slug` (V1) → `/c/:slug`. The most SEO-valuable of these. */
function LegacyCategoryRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/c/${slug}`} replace />;
}

export default function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<HomePage />} />

        {/* Catalog */}
        <Route path="/store" element={<StorePage />} />
        <Route path="/c/:slug" element={<CategoryPage />} />
        <Route path="/products/:slug" element={<ProductPage />} />
        {/* Legacy V1 URLs — keep before the catch-all. Mirrors vercel.json. */}
        <Route path="/product/:id" element={<LegacyProductRedirect />} />
        <Route path="/category/:slug" element={<LegacyCategoryRedirect />} />
        <Route path="/brand/:slug" element={<BrandPage />} />
        <Route path="/brand/:slug/:categorySlug" element={<BrandPage />} />
        <Route path="/bikes" element={<BikesPage />} />
        <Route path="/bikes/:make" element={<BikeMakePage />} />
        <Route path="/bikes/:make/:model" element={<BikeModelPage />} />
        <Route path="/collections" element={<CollectionsPage />} />
        <Route path="/collections/:slug" element={<CollectionPage />} />
        <Route path="/search" element={<SearchPage />} />

        {/* Commerce (noindex) */}
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/track" element={<TrackPage />} />

        {/* Account (auth-gated, noindex) */}
        <Route path="/account/*" element={<AccountPage />} />
        {/* V1 had a standalone order history at /orders and a per-order page at
            /orders/:id; V2 lists orders in a section of /account and has no
            per-order route, so both land there. Linked from old order emails. */}
        <Route path="/orders" element={<Navigate to="/account" replace />} />
        <Route path="/orders/:id" element={<Navigate to="/account" replace />} />
        {/* V1 had password signup; V2 auth is passwordless (Google / email OTP),
            so signing in IS registering. */}
        <Route path="/register" element={<Navigate to="/login" replace />} />

        {/* Static / policy pages (Razorpay + DPDP requirement) */}
        <Route path="/about" element={<StaticPage page="about" />} />
        <Route path="/contact" element={<StaticPage page="contact" />} />
        <Route path="/shipping-policy" element={<StaticPage page="shipping-policy" />} />
        <Route path="/returns-policy" element={<StaticPage page="returns-policy" />} />
        <Route path="/privacy-policy" element={<StaticPage page="privacy-policy" />} />
        <Route path="/terms" element={<StaticPage page="terms" />} />
        <Route path="/faq" element={<StaticPage page="faq" />} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
