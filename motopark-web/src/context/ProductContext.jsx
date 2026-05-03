/**
 * src/context/ProductContext.jsx
 *
 * FIXES APPLIED:
 * ─────────────────────────────────────────────────────────────
 * [F1] Replaced bespoke cache with shared cachedFetch
 *      Before: ProductContext had its own _memCache, readCache(),
 *      writeCache(), and fetchingRef. This was completely separate
 *      from every other component's cache — meaning /api/home-data
 *      could still be fetched twice if something else also called it.
 *      The fetchingRef race condition under StrictMode:
 *        mount 1: sets fetchingRef=true, starts fetch
 *        cleanup: sets fetchingRef=false (in finally)
 *        mount 2: sees fetchingRef=false, fires ANOTHER request
 *      After: cachedFetch uses in-flight map — mount 2 gets the
 *      exact same Promise as mount 1. One network call total.
 *
 * [F2] Removed redundant local cache variables
 *      _memCache, _memCacheTime, CACHE_KEY, CACHE_TTL, readCache,
 *      writeCache, fetchingRef — all deleted. apiCache.js handles
 *      all of this in one place for the entire app.
 *
 * [F3] force refresh uses invalidateCache
 *      refreshProducts(true) and clearCache() now call
 *      invalidateCache() from apiCache.js to clear the shared
 *      cache before re-fetching, so admin mutations propagate
 *      correctly to all consumers.
 *
 * [F4] isMounted ref preserved
 *      Still needed to guard setState after the component unmounts
 *      (e.g. navigating away before fetch completes).
 */

import {
  createContext, useContext, useState,
  useEffect, useCallback, useRef, useMemo
} from "react";
import { API } from "@/config/api";
import { cachedFetch, invalidateCache } from "@/lib/apiCache"; // [F1]

const ProductContext = createContext();
export const useProducts = () => useContext(ProductContext);

// [F2]: removed _memCache, _memCacheTime, CACHE_KEY, CACHE_TTL,
//        readCache, writeCache, fetchingRef — all handled by apiCache.js

const normalize = (arr) => (arr || []).map(p => ({
  ...p,
  images: p?.variants?.[0]?.images || [],
}));

export const ProductProvider = ({ children }) => {
  const [featured,    setFeatured]    = useState([]);
  const [trending,    setTrending]    = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  const isMounted = useRef(true); // [F4]

  // [F1]: fetchData now delegates entirely to cachedFetch.
  // No local cache, no fetchingRef race, no StrictMode double-fetch.
  const fetchData = useCallback(async (force = false, signal) => {
    setLoading(true);
    try {
      // [F3]: invalidate shared cache before force-fetching
      if (force) invalidateCache(`${API}/home-data`);

      const data = await cachedFetch(`${API}/home-data`, { force, signal });

      if (!isMounted.current) return;

      setFeatured(normalize(data.featured));
      setTrending(normalize(data.trending));
      setNewArrivals(normalize(data.newArrivals));
      setError(null);
    } catch (err) {
      if (err.name !== "AbortError" && isMounted.current) {
        setError(err.message);
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []); // stable — no deps change

  useEffect(() => {
    isMounted.current = true;
    const ctrl = new AbortController();
    fetchData(false, ctrl.signal);
    return () => {
      isMounted.current = false;
      ctrl.abort();
    };
  }, [fetchData]);

  const value = useMemo(() => ({
    products:    featured, // legacy compat — existing consumers use `products`
    featured,
    trending,
    newArrivals,
    loading,
    error,
    // [F3]: force=true clears shared cache so admin mutations propagate
    refreshProducts: () => fetchData(true),
    clearCache: () => {
      invalidateCache(`${API}/home-data`);
      fetchData(true);
    },
  }), [featured, trending, newArrivals, loading, error, fetchData]);

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
};