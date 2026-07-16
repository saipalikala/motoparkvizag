import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '@/lib/analytics.js';

/**
 * Fires a GA4 page_view on every SPA route change (and the initial landing).
 * Mounted once, high in the tree (App), inside <BrowserRouter>.
 *
 * The /admin realm is internal + noindex, so it's excluded from analytics.
 * `search` is included in the dep list so query-only navigations (filters,
 * search) are still counted. No-op unless VITE_GA_MEASUREMENT_ID is set.
 */
export function usePageViews() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    if (pathname === '/admin' || pathname.startsWith('/admin/')) return;
    trackPageView(pathname + search);
  }, [pathname, search]);
}
