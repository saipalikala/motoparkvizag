
import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import OfferBar from "@/components/OfferBar/OfferBar";
import Navbar from "@/components/Navbar/Navbar";

import Home from "@/pages/Home/Home";
import Store from "@/pages/Store/Store";
import CategoryPage from "@/pages/CategoryPage/CategoryPage";
import ProductDetail from "@/pages/ProductDetail/ProductDetail";
import Footer from "@/components/Footer/Footer";
import AdminHomeLayout from "./admin/pages/AdminHomeLayout";
import Cart from "@/pages/Cart/Cart";
import Checkout from "./pages/Checkout/Checkout";
import Wishlist from "@/pages/Wishlist/Wishlist";
import About from "./pages/About/About";
import Contact from "./pages/Contact/Contact";
import AdminLayout from "@/admin/layout/AdminLayout";
import AdminLogin from "@/admin/pages/AdminLogin";
import Dashboard from "@/admin/pages/Dashboard";
import OffersAdmin from "@/admin/pages/OffersAdmin";
import AdminNavbarManager from "@/admin/pages/AdminNavbarManager";
import AdminCarouselManager from "@/admin/pages/AdminCarouselManager";
import AdminProducts from "@/admin/pages/AdminProducts";
import AdminCollections from "./admin/pages/AdminCollections/";
import HomeBuilder from "./admin/pages/HomeBuilder/HomeBuilder";
import AdminMedia from "./admin/pages/AdminMedia";
import AdminCategories from "./admin/pages/AdminCategories";
import AdminOrders from "@/admin/pages/AdminOrders";
import InventoryManager from "@/admin/pages/InventoryManager";
import OrdersPage from "./pages/Orders/OrdersPage";
import OrderDetail from "./pages/Orders/OrderDetail";
import AuthPage from "./pages/Auth/AuthPage";
import AccountPage from "./pages/Account/AccountPage";
import "./App.css";

function App() {

    const location = useLocation();


    const isAdmin = location.pathname.startsWith("/admin");

    useEffect(() => {
        if ("scrollRestoration" in window.history) {
            window.history.scrollRestoration = "manual";
        }

        const handleLoad = () => {
            window.scrollTo(0, 0);
        };

        window.addEventListener("load", handleLoad);

        return () => window.removeEventListener("load", handleLoad);
    }, [location.pathname]);

    return (

        <div className="app-container">

            {/* Hide Navbar + OfferBar on admin pages */}

            {!isAdmin && <OfferBar />}
            {!isAdmin && <Navbar />}

            <Routes>

                {/* =========================
                   PUBLIC ROUTES
                ========================= */}

                <Route path="/" element={<Home />} />

                <Route path="/store" element={<Store />} />

                {/* CATEGORY PAGES */}

                <Route path="/category/:slug" element={<CategoryPage />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                {/* PRODUCT PAGE */}

                <Route path="/product/:id" element={<ProductDetail />} />

                {/* USER PAGES */}

                <Route path="/cart" element={<Cart />} />
                <Route path="/wishlist" element={<Wishlist />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/about" element={<div>About</div>} />
                <Route path="/contact" element={<div>Contact</div>} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/orders/:id" element={<OrderDetail />} />
                <Route path="/login" element={<AuthPage mode="login" />} />
                <Route path="/register" element={<AuthPage mode="register" />} />
                <Route path="/account" element={<AccountPage />} />
                {/* =========================
                   ADMIN ROUTES
                ========================= */}

                <Route path="/admin/login" element={<AdminLogin />} />

                <Route path="/admin" element={<AdminLayout />}>

                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="offers" element={<OffersAdmin />} />
                    <Route path="navbar" element={<AdminNavbarManager />} />
                    <Route path="carousel" element={<AdminCarouselManager />} />
                    <Route path="products" element={<AdminProducts />} />
                    <Route path="/admin/home-layout" element={<AdminHomeLayout />} />
                    <Route path="/admin/collections" element={<AdminCollections />} />
                    <Route path="/admin/home-builder" element={<HomeBuilder />} />
                    <Route path="/admin/media" element={<AdminMedia />} />
                    <Route path="/admin/categories" element={<AdminCategories />} />
                    <Route path="/admin/orders" element={<AdminOrders />} />
                    <Route path="/admin/inventory" element={<InventoryManager />} />

                </Route>

            </Routes>
            {!isAdmin && <Footer />}
        </div>

    );

}

export default App;