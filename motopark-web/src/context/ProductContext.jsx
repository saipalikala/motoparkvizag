import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { API } from "@/config/api";

const ProductContext = createContext();

export const useProducts = () => useContext(ProductContext);

const PRODUCTS_API = `${API}/products`;

// Cache lives outside the component — survives re-renders and page navigation
let cache = null;
let cacheTime = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const ProductProvider = ({ children }) => {

  const [products, setProducts] = useState(cache || []);
  const [loading, setLoading] = useState(!cache); // skip loading if cache exists
  const [error, setError] = useState(null);
  const isMounted = useRef(true);

  const fetchProducts = useCallback(async (force = false) => {

    // Return cached data if still fresh and not forced
    if (!force && cache && cacheTime && Date.now() - cacheTime < CACHE_TTL) {
      setProducts(cache);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(PRODUCTS_API);
      if (!res.ok) throw new Error("Failed to fetch products");

      const data = await res.json();
      const productList = data.products || [];

      const normalized = productList.map(p => ({
        ...p,
        images: p?.variants?.[0]?.images || []
      }));

      // Update cache
      cache = normalized;
      cacheTime = Date.now();

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

  /* INITIAL LOAD — only once */
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
        // Call refreshProducts() only after admin makes a change
        refreshProducts: () => fetchProducts(true),
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};