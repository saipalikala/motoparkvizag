import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminAuthProvider } from './AdminAuthContext.jsx';
import AdminRoute from './AdminRoute.jsx';

/**
 * AdminApp — the entire /admin realm. Mounted by App.jsx only for /admin paths,
 * wrapped in its OWN AdminAuthProvider (never the storefront's AuthProvider) and
 * carrying none of the storefront chrome.
 *
 * Routes are lazy so the admin bundle never ships to storefront visitors.
 * Structure: public /admin/login, everything else behind the AdminRoute guard
 * inside AdminLayout.
 */
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage.jsx'));
const AdminLayout = lazy(() => import('./components/AdminLayout.jsx'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx'));
const ProductListPage = lazy(() => import('./products/ProductListPage.jsx'));
const ProductFormPage = lazy(() => import('./products/ProductFormPage.jsx'));
const CategoryListPage = lazy(() => import('./categories/CategoryListPage.jsx'));
const CollectionListPage = lazy(() => import('./collections/CollectionListPage.jsx'));
const OrderListPage = lazy(() => import('./orders/OrderListPage.jsx'));
const OrderDetailPage = lazy(() => import('./orders/OrderDetailPage.jsx'));
const OrderPrintPage = lazy(() => import('./orders/OrderPrintPage.jsx'));
const CustomerListPage = lazy(() => import('./customers/CustomerListPage.jsx'));
const CustomerDetailPage = lazy(() => import('./customers/CustomerDetailPage.jsx'));
const BikeListPage = lazy(() => import('./bikes/BikeListPage.jsx'));
const AiAnalyticsPage = lazy(() => import('./analytics/AiAnalyticsPage.jsx'));
const SettingsPage = lazy(() => import('./settings/SettingsPage.jsx'));

function AdminLoader() {
  return <div style={{ minHeight: '100dvh' }} aria-busy="true" aria-label="Loading admin" />;
}

export default function AdminApp() {
  return (
    <AdminAuthProvider>
      <Suspense fallback={<AdminLoader />}>
        <Routes>
          <Route path="/admin/login" element={<AdminLoginPage />} />

          <Route element={<AdminRoute />}>
            {/* Packing slip — standalone, OUTSIDE AdminLayout (no sidebar/topbar). */}
            <Route path="/admin/orders/:id/print" element={<OrderPrintPage />} />

            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />

              {/* Products (Milestone 2) */}
              <Route path="products" element={<ProductListPage />} />
              <Route path="products/new" element={<ProductFormPage />} />
              <Route path="products/:id" element={<ProductFormPage />} />

              {/* Categories & Collections (Milestone 3) */}
              <Route path="categories" element={<CategoryListPage />} />
              <Route path="collections" element={<CollectionListPage />} />

              {/* Orders (Milestone 4) */}
              <Route path="orders" element={<OrderListPage />} />
              <Route path="orders/:id" element={<OrderDetailPage />} />

              {/* Customers (Milestone 5) */}
              <Route path="customers" element={<CustomerListPage />} />
              <Route path="customers/:id" element={<CustomerDetailPage />} />

              {/* Bikes / fitment (Milestone 8) */}
              <Route path="bikes" element={<BikeListPage />} />

              {/* Analytics & Settings (Milestone 6) */}
              <Route path="analytics" element={<AiAnalyticsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Unknown /admin/* → dashboard (guard redirects to login if needed). */}
          <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </Suspense>
    </AdminAuthProvider>
  );
}
