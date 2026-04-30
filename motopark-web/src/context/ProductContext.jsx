// ProductContext.jsx — FULL REPLACEMENT
import {
  createContext, useContext, useState,
  useEffect, useCallback, useRef, useMemo
} from "react";
import { API } from "@/config/api";

const ProductContext = createContext();
export const useProducts = () => useContext(ProductContext);

const CACHE_KEY = "mp_home_v3";
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
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, time: Date.now() })); }
  catch {}
};

const normalize = (arr) => (arr || []).map(p => ({
  ...p,
  images: p?.variants?.[0]?.images || [],
}));

export const ProductProvider = ({ children }) => {
  const cached = readCache();

  const [featured,    setFeatured]    = useState(cached?.featured    || []);
  const [trending,    setTrending]    = useState(cached?.trending    || []);
  const [newArrivals, setNewArrivals] = useState(cached?.newArrivals || []);
  const [loading,     setLoading]     = useState(!cached);
  const [error,       setError]       = useState(null);

  const isMounted   = useRef(true);
  const fetchingRef = useRef(false);

  // Single function, single endpoint, no duplication
  const fetchData = useCallback(async (force = false, signal) => {
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
      // 1 request instead of 3 — hits the cached homeController
      const res = await fetch(`${API}/home-data`, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      const payload = {
        featured:    normalize(data.featured),
        trending:    normalize(data.trending),
        newArrivals: normalize(data.newArrivals),
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
  }, []);

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
    products:    featured, // legacy compat
    featured,
    trending,
    newArrivals,
    loading,
    error,
    refreshProducts: () => fetchData(true),
    clearCache: () => {
      sessionStorage.removeItem(CACHE_KEY);
      fetchData(true);
    },
  }), [featured, trending, newArrivals, loading, error, fetchData]);

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
};