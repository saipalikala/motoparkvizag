/**
 * src/context/AppDataContext.jsx
 *
 * FIXES APPLIED:
 * ─────────────────────────────────────────────────────────────
 * [F1] CRITICAL: Wrong cachedFetch signature
 *      Before: cachedFetch('navbar', '/api/navbar')
 *      cachedFetch takes ONE argument — the full URL.
 *      The two-argument form doesn't exist in apiCache.js.
 *      This means every call was using 'navbar' as the URL,
 *      fetching relative paths that return 404/HTML, and
 *      caching garbage under wrong keys.
 *      After: cachedFetch(`${API}/navbar`) — correct single-arg form.
 *
 * [F2] /api/products REMOVED from this context
 *      Before: fetching ALL products here and caching them.
 *      Problems:
 *        a) /api/products with no params returns page 1 (12 items).
 *           Store.jsx uses ProductContext which has ALL products
 *           from /api/home-data. These are different data shapes.
 *        b) Caching a paginated endpoint as if it's a full dataset
 *           means Store/CategoryPage/Search all get stale page-1 data.
 *        c) ProductContext already handles /api/home-data correctly.
 *      After: removed. Each page fetches its own products with
 *      correct params. AppDataContext only owns truly global
 *      semi-static data.
 *
 * [F3] didFetch ref replaced with apiCache in-flight deduplication
 *      Before: didFetch.current blocked StrictMode second mount,
 *      but also blocked legitimate re-fetches after cache expiry.
 *      After: apiCache.js handles deduplication correctly.
 *      The ref is removed — no longer needed.
 *
 * [F4] AbortController added
 *      Before: Promise.all with no abort. If component unmounted
 *      before all 5 fetches completed, setState was called on
 *      dead component.
 *      After: AbortController passed to all cachedFetch calls.
 *      alive flag guards setState.
 *
 * [F5] Individual endpoint errors don't fail the whole context
 *      Before: if /api/offers failed, the entire Promise.all
 *      rejected and ALL data was lost.
 *      After: Promise.allSettled — each endpoint fails independently.
 *      Working endpoints still populate state.
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { cachedFetch } from '@/lib/apiCache';
import { API } from '@/config/api';

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const [state, setState] = useState({
    navbar       : null,
    offers       : null,
    carousel     : null,
    videoShowcase: null,
    storeConfig  : null,
    loading      : true,
    error        : null,
  });

  useEffect(() => {
    const ctrl  = new AbortController(); // [F4]
    let   alive = true;

    // [F5]: allSettled — partial failure doesn't wipe working data
    Promise.allSettled([
      cachedFetch(`${API}/navbar`,          { signal: ctrl.signal }), // [F1]
      cachedFetch(`${API}/offers`,          { signal: ctrl.signal }),
      cachedFetch(`${API}/carousel`,        { signal: ctrl.signal }),
      cachedFetch(`${API}/video-showcase`,  { signal: ctrl.signal }),
      cachedFetch(`${API}/store-config`,    { signal: ctrl.signal }),
      // [F2]: /api/products removed — owned by ProductContext + page-level fetches
    ]).then((results) => {
      if (!alive) return;

      const [navbar, offers, carousel, videoShowcase, storeConfig] = results;

      setState({
        navbar       : navbar.status        === 'fulfilled' ? navbar.value        : null,
        offers       : offers.status        === 'fulfilled' ? offers.value        : null,
        carousel     : carousel.status      === 'fulfilled' ? carousel.value      : null,
        videoShowcase: videoShowcase.status === 'fulfilled' ? videoShowcase.value : null,
        storeConfig  : storeConfig.status   === 'fulfilled' ? storeConfig.value   : null,
        loading      : false,
        error        : null,
      });
    });

    return () => { alive = false; ctrl.abort(); }; // [F4]
  }, []); // [F3]: no didFetch ref — apiCache deduplicates automatically

  return (
    <AppDataContext.Provider value={state}>
      {children}
    </AppDataContext.Provider>
  );
}

export const useAppData = () => {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside AppDataProvider');
  return ctx;
};