import { useEffect, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import OfferBar from "@/components/OfferBar/OfferBar";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import ProtectedRoute from "@/admin/utils/ProtectedRoute";
import "./App.css";

const Home = lazy(() => import("@/pages/Home/Home"));
const Store = lazy(() => import("@/pages/Store/Store"));
const CategoryPage = lazy(() => import("@/pages/CategoryPage/CategoryPage"));
const ProductDetail = lazy(() => import("@/pages/ProductDetail/ProductDetail"));
const Cart = lazy(() => import("@/pages/Cart/Cart"));
const Checkout = lazy(() => import("@/pages/Checkout/Checkout"));
const Wishlist = lazy(() => import("@/pages/Wishlist/Wishlist"));
const About = lazy(() => import("@/pages/About/About"));
const Contact = lazy(() => import("@/pages/Contact/Contact"));
const OrdersPage = lazy(() => import("@/pages/Orders/OrdersPage"));
const OrderDetail = lazy(() => import("@/pages/Orders/OrderDetail"));
const AuthPage = lazy(() => import("@/pages/Auth/AuthPage"));
const AccountPage = lazy(() => import("@/pages/Account/AccountPage"));

const AdminLogin = lazy(() => import("@/admin/pages/AdminLogin"));
const AdminLayout = lazy(() => import("@/admin/layout/AdminLayout"));
const Dashboard = lazy(() => import("@/admin/pages/Dashboard"));
const OffersAdmin = lazy(() => import("@/admin/pages/OffersAdmin"));
const AdminNavbarManager = lazy(() => import("@/admin/pages/AdminNavbarManager"));
const AdminCarouselManager = lazy(() => import("@/admin/pages/AdminCarouselManager"));
const AdminProducts = lazy(() => import("@/admin/pages/AdminProducts"));
const AdminCollections = lazy(() => import("@/admin/pages/AdminCollections"));
const HomeBuilder = lazy(() => import("@/admin/pages/HomeBuilder/HomeBuilder"));
const AdminMedia = lazy(() => import("@/admin/pages/AdminMedia"));
const AdminCategories = lazy(() => import("@/admin/pages/AdminCategories"));
const AdminOrders = lazy(() => import("@/admin/pages/AdminOrders"));
const AdminHomeLayout = lazy(() => import("@/admin/pages/AdminHomeLayout"));
const InventoryManager = lazy(() => import("@/admin/pages/InventoryManager"));
const AdminVideoShowcase  = lazy(() => import("@/admin/pages/AdminVideoShowcase"));

// Prefetch secondary routes after page is fully idle
if (typeof window !== "undefined") {
  const prefetch = () => {
    // Use requestIdleCallback to not compete with paint
    const schedule = window.requestIdleCallback || ((fn) => setTimeout(fn, 2000));
    schedule(() => {
      Promise.allSettled([
        import("@/pages/Cart/Cart"),
        import("@/pages/Checkout/Checkout"),
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
const PageLoader = () => (
    <div className="page-loading">
        <div className="page-spinner" />
    </div>
);

function App() {
    const location = useLocation();
    const isAdmin = location.pathname.startsWith("/admin");

    useEffect(() => {
        if ("scrollRestoration" in window.history) {
            window.history.scrollRestoration = "manual";
        }
        window.scrollTo(0, 0);
    }, [location.pathname]);

    return (
        <div className="app-container">
            {!isAdmin && <OfferBar />}
            {!isAdmin && <Navbar />}

            <Suspense fallback={<PageLoader />}>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/store" element={<Store />} />
                    <Route path="/category/:slug" element={<CategoryPage />} />
                    <Route path="/product/:id" element={<ProductDetail />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/wishlist" element={<Wishlist />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/orders" element={<OrdersPage />} />
                    <Route path="/orders/:id" element={<OrderDetail />} />
                    <Route path="/login" element={<AuthPage mode="login" />} />
                    <Route path="/register" element={<AuthPage mode="register" />} />
                    <Route path="/account" element={<AccountPage />} />

                    <Route path="/admin/login" element={<AdminLogin />} />
<Route path="/admin" element={
  <ProtectedRoute>
    <AdminLayout />
  </ProtectedRoute>
}>
  <Route index element={<Navigate to="dashboard" replace />} />
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

            {!isAdmin && <Footer />}
        </div>
    );
}

export default App;