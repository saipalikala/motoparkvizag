import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

/**
 * Route map = locked IA (docs/03 §1–2). Every page is lazy (docs/11 §10) so the
 * first paint ships only the shell + the landed route's chunk; heavy routes
 * (Checkout/Razorpay) load on demand. Chrome (Navbar/Footer) stays eager.
 */
const HomePage = lazy(() => import('../pages/home/HomePage.jsx'));
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

/** Route fallback — reserves height to avoid layout shift while a chunk loads. */
function PageLoader() {
  return <div style={{ minHeight: '60vh' }} aria-busy="true" aria-label="Loading" />;
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
