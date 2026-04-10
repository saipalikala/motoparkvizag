import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { API } from "@/config/api";

const ProductContext = createContext();

export const useProducts = () => useContext(ProductContext);

const PRODUCTS_API = `${API}/products?limit=200`;

const CACHE_KEY = "mp_products";
const CACHE_TTL = 5 * 60 * 1000;

const getCache = () => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, time } = JSON.parse(raw);
    if (Date.now() - time > CACHE_TTL) return null;
    return data;
  } catch { return null; }
};

const setCache = (data) => {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, time: Date.now() }));
  } catch { }
};

export const ProductProvider = ({ children }) => {

  const [products, setProducts] = useState(() => getCache() || []);
  const [loading, setLoading] = useState(() => !getCache());
  const [error, setError] = useState(null);
  const isMounted = useRef(true);

  // ✅ fetchProducts FIRST
  // REMOVE
  const fetchProducts = useCallback(async (force = false) => {
    if (!force) {
      const cached = getCache();
      if (cached) {
        setProducts(cached);
        setLoading(false);
        return;
      }
    }
    try {
      setLoading(true);
      const res = await fetch(PRODUCTS_API);
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      const normalized = (data.products || []).map(p => ({
        ...p,
        images: p?.variants?.[0]?.images || []
      }));
      setCache(normalized);
      if (isMounted.current) {
        setProducts(normalized);
        setError(null);
      }
    } catch (err) {
      console.error("ProductContext fetch error:", err);
      if (isMounted.current) setError(err.message);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  // ✅ clearCache AFTER fetchProducts
  const clearCache = useCallback(() => {
    sessionStorage.removeItem(CACHE_KEY);
    fetchProducts(true);
  }, [fetchProducts]);

  useEffect(() => {
    isMounted.current = true;
    fetchProducts();
    return () => { isMounted.current = false; };
  }, [fetchProducts]);

  return (
    <ProductContext.Provider
      value={{
        products,
        loading,
        error,
        refreshProducts: () => fetchProducts(true),
        clearCache,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};