import { createContext, useContext, useState, useEffect, useCallback } from "react";

// const ProductContext = createContext();

// export const useProducts = () => useContext(ProductContext);

// const API = "http://localhost:5000/api/products";

import { API } from "@/config/api"; // ✅ ADD THIS

const ProductContext = createContext();

export const useProducts = () => useContext(ProductContext);

// ✅ Correct endpoint
const PRODUCTS_API = `${API}/api/products`;

export const ProductProvider = ({ children }) => {

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProducts = useCallback(async () => {

    try {
      const res = await fetch(PRODUCTS_API);

      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();

      const productList = data.products || [];

      const normalized = productList.map(p => ({
        ...p,
        images: p?.variants?.[0]?.images || []
      }));

      setProducts(normalized);

    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }

  }, []);

  /* INITIAL LOAD */
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  /* 🔥 AUTO REFRESH EVERY 5 SEC */
  useEffect(() => {

    const interval = setInterval(() => {
      fetchProducts();
    }, 5000); // 5 seconds

    return () => clearInterval(interval);

  }, [fetchProducts]);

  return (
    <ProductContext.Provider
      value={{
        products,
        loading,
        error,
        refreshProducts: fetchProducts
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};