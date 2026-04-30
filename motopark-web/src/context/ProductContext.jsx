/**
 * ProductContext — lightweight global layer
 *
 * WHAT CHANGED AND WHY:
 * - Removed the 200-product global fetch entirely. Pages own their own data.
 * - Context now only holds: featured (≤8), trending (≤8), newArrivals (≤8).
 *   These are the only fields legitimately needed across multiple pages
 *   (Home, Navbar search suggestions, etc.)
 * - Total payload: ~24 products instead of 200. ~88% less data on initial load.
 * - Cache TTL kept at 5 min in sessionStorage.
 * - refreshProducts() API preserved for admin panel compatibility.
 */

import {
  createContext, useContext, useState,
  useEffect, useCallback, useRef, useMemo
} from "react";
import { API } from "@/config/api";

const ProductContext = createContext();
export const useProducts = () => useContext(ProductContext);

const CACHE_KEY = "mp_feat_v2";       // new key — invalidates old 200-product cache
const CACHE_TTL = 5 * 60 * 1000;

const readCache = () => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, time } = JSON.parse(raw);
    return Date.now() - time < CACHE_TTL ? data : null;
  } catch { return null; }
};

const writeCache = (data) => {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, time: Date.now() }));
  } catch { }
};

export const ProductProvider = ({ children }) => {
  const cached = readCache();

  const [featured,    setFeatured]    = useState(cached?.featured    || []);
  const [trending,    setTrending]    = useState(cached?.trending    || []);
  const [newArrivals, setNewArrivals] = useState(cached?.newArrivals || []);
  const [loading,     setLoading]     = useState(!cached);
  const [error,       setError]       = useState(null);
  const isMounted = useRef(true);
  const fetchingRef = useRef(false); 

const fetchHighlights = useCallback(async (force = false) => {
    if (fetchingRef.current) return;
    if (!force) {
        const c = readCache();
        if (c) {
            setFeatured(c.featured);
            setTrending(c.trending);
            setNewArrivals(c.newArrivals);
            setLoading(false);
            return;
        }
    }

    fetchingRef.current = true;
    setLoading(true);

    try {
        const [featRes, trendRes, newRes] = await Promise.all([
            fetch(`${API}/products?flags=featured&limit=8`),
            fetch(`${API}/products?flags=trending&limit=8`),
            fetch(`${API}/products?flags=newArrival&limit=8`),
        ]);

      if (!featRes.ok || !trendRes.ok || !newRes.ok) throw new Error("Fetch failed");

      const [featData, trendData, newData] = await Promise.all([
        featRes.json(), trendRes.json(), newRes.json(),
      ]);

      const normalize = (arr) => (arr || []).map(p => ({
        ...p,
        images: p?.variants?.[0]?.images || [],
      }));

      const payload = {
        featured:    normalize(featData.products),
        trending:    normalize(trendData.products),
        newArrivals: normalize(newData.products),
      };

      writeCache(payload);

      if (isMounted.current) {
        setFeatured(payload.featured);
        setTrending(payload.trending);
        setNewArrivals(payload.newArrivals);
        setError(null);
      }
    } catch (err) {
        if (err.name === "AbortError") return;
        if (isMounted.current) setError(err.message);
    } finally {
        fetchingRef.current = false;
        if (isMounted.current) setLoading(false);
    }

}, []);


useEffect(() => {
    isMounted.current = true;
    const ctrl = new AbortController();

    const run = async () => {
        if (fetchingRef.current) return;

        const c = readCache();
        if (c) {
            setFeatured(c.featured); setTrending(c.trending);
            setNewArrivals(c.newArrivals); setLoading(false);
            return;
        }

        fetchingRef.current = true;
        setLoading(true);

        try {
            const [featRes, trendRes, newRes] = await Promise.all([
                fetch(`${API}/products?flags=featured&limit=8`,   { signal: ctrl.signal }),
                fetch(`${API}/products?flags=trending&limit=8`,   { signal: ctrl.signal }),
                fetch(`${API}/products?flags=newArrival&limit=8`, { signal: ctrl.signal }),
            ]);

            if (!featRes.ok || !trendRes.ok || !newRes.ok) throw new Error("Fetch failed");

            const [featData, trendData, newData] = await Promise.all([
                featRes.json(), trendRes.json(), newRes.json(),
            ]);

            const normalize = (arr) => (arr || []).map(p => ({
                ...p, images: p?.variants?.[0]?.images || [],
            }));

            const payload = {
                featured:    normalize(featData.products),
                trending:    normalize(trendData.products),
                newArrivals: normalize(newData.products),
            };

            writeCache(payload);

            if (isMounted.current) {
                setFeatured(payload.featured);
                setTrending(payload.trending);
                setNewArrivals(payload.newArrivals);
                setError(null);
            }
        } catch (err) {
            if (err.name !== "AbortError" && isMounted.current) setError(err.message);
        } finally {
            fetchingRef.current = false;
            if (isMounted.current) setLoading(false);
        }
    };

    run();
    return () => { isMounted.current = false; ctrl.abort(); };
}, []); // ← no fetchHighlights dependency needed now

  // Stable value object — only changes when data actually changes
  const value = useMemo(() => ({
    // Legacy field for any component still reading `products`
    // points to featured so nothing breaks
    products:       featured,
    featured,
    trending,
    newArrivals,
    loading,
    error,
    refreshProducts: () => fetchHighlights(true),
    clearCache: () => {
      sessionStorage.removeItem(CACHE_KEY);
      fetchHighlights(true);
    },
  }), [featured, trending, newArrivals, loading, error, fetchHighlights]);

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
};