import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAdminAuth } from './AdminAuthContext.jsx';

/**
 * AdminRoute — layout guard for every authenticated /admin route. Renders the
 * matched child via <Outlet /> when a valid admin token exists; otherwise
 * redirects to /admin/login, preserving the attempted path in location state so
 * login can bounce back to it.
 */
export default function AdminRoute() {
  const { isAuthed } = useAdminAuth();
  const location = useLocation();

  if (!isAuthed) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
