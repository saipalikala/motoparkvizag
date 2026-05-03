/**
 * src/App.jsx
 *
 * FIXES APPLIED:
 * ─────────────────────────────────────────────────────────────
 * [F1] Shell preserved as lazy (Navbar, OfferBar, Footer)
 *      These are already lazy in the uploaded version — kept.
 *
 * [F2] display:contents toggle instead of conditional unmount
 *      Before: {!isAdmin && <Navbar />} — Navbar/OfferBar/Footer
 *      unmount when user goes /→/admin/login→/ and remount on
 *      the way back, re-firing /api/navbar, /api/offers,
 *      /api/store-config even if cache is fresh.
 *      After: components stay mounted, hidden via display:none.
 *      display:contents is used when visible so the wrapper div
 *      has zero layout impact (no extra box in the flow).
 *      With apiCache.js in place, even if they did remount the
 *      cache would serve instantly — but keeping them mounted
 *      also saves React reconciliation cost.
 *
 * [F3] PageLoader uses useLocation (already in original) — kept.
 *
 * [F4] Prefetch targets corrected (already fixed in upload) — kept.
 *
 * NOTE: React.StrictMode is intentionally kept in main.jsx.
 * It only double-invokes effects in development builds.
 * With apiCache.js coalescing in-flight requests, StrictMode
 * double-mount now fires exactly 1 network call instead of 2.
 */

import { useEffect, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import ProtectedRoute from "@/admin/utils/ProtectedRoute";
import "./App.css";

// ── Layout shell — lazy (Navbar/OfferBar/Footer are not needed for FCP)
const OfferBar = lazy(() => import("@/components/OfferBar/OfferBar"));
const Navbar   = lazy(() => import("@/components/Navbar/Navbar"));
const Footer   = lazy(() => import("@/components/Footer/Footer"));

// ── User-facing pages — all lazy
const Home          = lazy(() => import("@/pages/Home/Home"));
const Store         = lazy(() => import("@/pages/Store/Store"));
const CategoryPage  = lazy(() => import("@/pages/CategoryPage/CategoryPage"));
const ProductDetail = lazy(() => import("@/pages/ProductDetail/ProductDetail"));
const Cart          = lazy(() => import("@/pages/Cart/Cart"));
const Checkout      = lazy(() => import("@/pages/Checkout/Checkout"));
const Wishlist      = lazy(() => import("@/pages/Wishlist/Wishlist"));
const About         = lazy(() => import("@/pages/About/About"));
const Contact       = lazy(() => import("@/pages/Contact/Contact"));
const OrdersPage    = lazy(() => import("@/pages/Orders/OrdersPage"));
const OrderDetail   = lazy(() => import("@/pages/Orders/OrderDetail"));
const AuthPage      = lazy(() => import("@/pages/Auth/AuthPage"));
const AccountPage   = lazy(() => import("@/pages/Account/AccountPage"));

// ── Admin chunk — entirely separate
const AdminLogin          = lazy(() => import("@/admin/pages/AdminLogin"));
const AdminLayout         = lazy(() => import("@/admin/layout/AdminLayout"));
const Dashboard           = lazy(() => import("@/admin/pages/Dashboard"));
const OffersAdmin         = lazy(() => import("@/admin/pages/OffersAdmin"));
const AdminNavbarManager  = lazy(() => import("@/admin/pages/AdminNavbarManager"));
const AdminCarouselManager= lazy(() => import("@/admin/pages/AdminCarouselManager"));
const AdminProducts       = lazy(() => import("@/admin/pages/AdminProducts"));
const AdminCollections    = lazy(() => import("@/admin/pages/AdminCollections"));
const HomeBuilder         = lazy(() => import("@/admin/pages/HomeBuilder/HomeBuilder"));
const AdminMedia          = lazy(() => import("@/admin/pages/AdminMedia"));
const AdminCategories     = lazy(() => import("@/admin/pages/AdminCategories"));
const AdminOrders         = lazy(() => import("@/admin/pages/AdminOrders"));
const AdminHomeLayout     = lazy(() => import("@/admin/pages/AdminHomeLayout"));
const InventoryManager    = lazy(() => import("@/admin/pages/InventoryManager"));
const AdminVideoShowcase  = lazy(() => import("@/admin/pages/AdminVideoShowcase"));

// ── Idle prefetch — warm up likely-next pages after first load
if (typeof window !== "undefined") {
  const prefetch = () => {
    const schedule = window.requestIdleCallback || ((fn) => setTimeout(fn, 2000));
    schedule(() => {
      Promise.allSettled([
        import("@/components/Navbar/Navbar"),
        import("@/components/OfferBar/OfferBar"),
        import("@/components/Footer/Footer"),
        import("@/pages/Store/Store"),
        import("@/pages/CategoryPage/CategoryPage"),
        import("@/pages/ProductDetail/ProductDetail"),
      ]);
    });
  };
  if (document.readyState === "complete") {
    prefetch();
  } else {
    window.addEventListener("load", prefetch, { once: true });
  }
}

// ── Page skeleton — no spinner, just a background block
// Prevents CLS and "frozen" perception while lazy chunks load.
const PageLoader = () => {
  const { pathname } = useLocation();
  const isHome = pathname === "/";
  return (
    <div
      style={{
        minHeight : isHome ? "100vh" : "60vh",
        background: "var(--bg, #111)",
        width     : "100%",
        contain   : "strict",
      }}
    />
  );
};

function App() {
  const location = useLocation();
  const isAdmin  = location.pathname.startsWith("/admin");

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="app-container">

      {/*
        [F2]: Shell stays MOUNTED even on admin routes — just hidden.
        - display:"none"     → invisible, takes no space, React tree preserved
        - display:"contents" → visible, wrapper div has no layout box impact
        Why: {!isAdmin && <Navbar/>} unmounts and remounts Navbar every time
        a user navigates between admin and user pages. Each remount calls the
        useEffect → fetch, burning bandwidth and re-running API calls even
        when cachedFetch would serve from memory instantly.
        Keeping the tree alive = 0 remounts, 0 extra fetches, 0 reconciliation cost.
      */}
      <div style={{ display: isAdmin ? "none" : "contents" }}>
        <Suspense fallback={null}>
          <OfferBar />
          <Navbar />
        </Suspense>
      </div>

      {/* Content: each page route in its own Suspense boundary */}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* ── User routes ── */}
          <Route path="/"               element={<Home />} />
          <Route path="/store"          element={<Store />} />
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/product/:id"    element={<ProductDetail />} />
          <Route path="/about"          element={<About />} />
          <Route path="/contact"        element={<Contact />} />
          <Route path="/cart"           element={<Cart />} />
          <Route path="/wishlist"       element={<Wishlist />} />
          <Route path="/checkout"       element={<Checkout />} />
          <Route path="/orders"         element={<OrdersPage />} />
          <Route path="/orders/:id"     element={<OrderDetail />} />
          <Route path="/login"          element={<AuthPage mode="login" />} />
          <Route path="/register"       element={<AuthPage mode="register" />} />
          <Route path="/account"        element={<AccountPage />} />

          {/* ── Admin routes ── */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index                 element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"      element={<Dashboard />} />
            <Route path="offers"         element={<OffersAdmin />} />
            <Route path="navbar"         element={<AdminNavbarManager />} />
            <Route path="carousel"       element={<AdminCarouselManager />} />
            <Route path="products"       element={<AdminProducts />} />
            <Route path="home-layout"    element={<AdminHomeLayout />} />
            <Route path="collections"    element={<AdminCollections />} />
            <Route path="home-builder"   element={<HomeBuilder />} />
            <Route path="media"          element={<AdminMedia />} />
            <Route path="categories"     element={<AdminCategories />} />
            <Route path="orders"         element={<AdminOrders />} />
            <Route path="inventory"      element={<InventoryManager />} />
            <Route path="video-showcase" element={<AdminVideoShowcase />} />
          </Route>
        </Routes>
      </Suspense>

      {/* [F2]: Footer also kept mounted, hidden on admin */}
      <div style={{ display: isAdmin ? "none" : "contents" }}>
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
      </div>

    </div>
  );
}

export default App;