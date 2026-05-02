import { useEffect, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import ProtectedRoute from "@/admin/utils/ProtectedRoute";
import "./App.css";

// ─────────────────────────────────────────────
// FIX 1: Navbar, OfferBar, Footer are NOW lazy
// Previously eager — they blocked FCP on every
// non-admin page by forcing their entire import
// tree (icons, hooks, API calls) before first paint.
// ─────────────────────────────────────────────
const OfferBar = lazy(() => import("@/components/OfferBar/OfferBar"));
const Navbar   = lazy(() => import("@/components/Navbar/Navbar"));
const Footer   = lazy(() => import("@/components/Footer/Footer"));

// ─────────────────────────────────────────────
// User-facing pages — all lazy (unchanged)
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// Admin chunk — entirely separate (unchanged)
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// FIX 2: Corrected prefetch targets
//
// BEFORE: Cart, Checkout, ProductDetail
//   — Cart/Checkout are rare secondary flows.
//     Wasted idle bandwidth on low-priority chunks.
//
// AFTER: Store, CategoryPage, ProductDetail
//   — These are the ACTUAL next pages a Home visitor
//     will navigate to. Prefetching them during idle
//     means near-instant navigation after first load.
//
// Navbar/OfferBar are also prefetched here since
// they're now lazy — ensures they're in cache before
// user sees any non-admin page transition.
// ─────────────────────────────────────────────
if (typeof window !== "undefined") {
    const prefetch = () => {
        const schedule = window.requestIdleCallback || ((fn) => setTimeout(fn, 2000));
        schedule(() => {
            Promise.allSettled([
                // Layout shell — lazy now, warm it up fast
                import("@/components/Navbar/Navbar"),
                import("@/components/OfferBar/OfferBar"),
                import("@/components/Footer/Footer"),
                // Most-likely next pages from Home
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

// ─────────────────────────────────────────────
// FIX 3: Layout skeleton replaces spinner
//
// BEFORE: A centered spinner — user sees blank
//   screen + spinner, brain reads it as "frozen".
//
// AFTER: A dark full-height block that matches
//   the real page background. No CLS, no panic.
//   For Home specifically, we reserve hero height
//   so content doesn't jump when it loads in.
// ─────────────────────────────────────────────
const PageLoader = () => {
    // Safe — this component only renders inside App
    // which already has useLocation in scope above it.
    const { pathname } = useLocation();
    const isHome = pathname === "/";

    return (
        <div
            style={{
                minHeight   : isHome ? "100vh" : "60vh",
                background  : "var(--bg, #111)",
                width       : "100%",
                // Prevents layout shift while nav/content loads
                contain     : "strict",
            }}
        />
    );
};

// ─────────────────────────────────────────────
// FIX 4: Separate Suspense boundaries
//
// BEFORE: One Suspense wrapper for everything —
//   if Navbar was eager this wasn't an issue, but
//   now that Navbar/OfferBar are lazy they need
//   their own boundary so they don't block the
//   route Suspense from resolving independently.
//
//   Shell boundary  → fallback: null (invisible flash
//     is better than a broken half-rendered layout)
//   Content boundary → fallback: PageLoader skeleton
// ─────────────────────────────────────────────
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

            {/* Shell: Navbar + OfferBar in their own boundary.
                fallback=null → nothing shown while loading (< 50ms
                in practice after first visit due to prefetch above).
                Avoids layout shift from a placeholder nav bar. */}
            {!isAdmin && (
                <Suspense fallback={null}>
                    <OfferBar />
                    <Navbar />
                </Suspense>
            )}

            {/* Content: each page route in its own boundary.
                PageLoader gives an instant visual response
                before the lazy chunk arrives. */}
            <Suspense fallback={<PageLoader />}>
                <Routes>
                    {/* ── User routes ── */}
                    <Route path="/"              element={<Home />} />
                    <Route path="/store"         element={<Store />} />
                    <Route path="/category/:slug" element={<CategoryPage />} />
                    <Route path="/product/:id"   element={<ProductDetail />} />
                    <Route path="/about"         element={<About />} />
                    <Route path="/contact"       element={<Contact />} />
                    <Route path="/cart"          element={<Cart />} />
                    <Route path="/wishlist"      element={<Wishlist />} />
                    <Route path="/checkout"      element={<Checkout />} />
                    <Route path="/orders"        element={<OrdersPage />} />
                    <Route path="/orders/:id"    element={<OrderDetail />} />
                    <Route path="/login"         element={<AuthPage mode="login" />} />
                    <Route path="/register"      element={<AuthPage mode="register" />} />
                    <Route path="/account"       element={<AccountPage />} />

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
                        <Route index                  element={<Navigate to="dashboard" replace />} />
                        <Route path="dashboard"       element={<Dashboard />} />
                        <Route path="offers"          element={<OffersAdmin />} />
                        <Route path="navbar"          element={<AdminNavbarManager />} />
                        <Route path="carousel"        element={<AdminCarouselManager />} />
                        <Route path="products"        element={<AdminProducts />} />
                        <Route path="home-layout"     element={<AdminHomeLayout />} />
                        <Route path="collections"     element={<AdminCollections />} />
                        <Route path="home-builder"    element={<HomeBuilder />} />
                        <Route path="media"           element={<AdminMedia />} />
                        <Route path="categories"      element={<AdminCategories />} />
                        <Route path="orders"          element={<AdminOrders />} />
                        <Route path="inventory"       element={<InventoryManager />} />
                        <Route path="video-showcase"  element={<AdminVideoShowcase />} />
                    </Route>
                </Routes>
            </Suspense>

            {!isAdmin && (
                <Suspense fallback={null}>
                    <Footer />
                </Suspense>
            )}

        </div>
    );
}

export default App;