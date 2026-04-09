// src/hooks/useProduct.js
import { useState, useEffect, useRef } from "react";
import { useProducts } from "@/context/ProductContext";
import { API } from "@/config/api";

// Module-level cache: survives re-renders, cleared on full page reload
// Key: product _id, Value: product object
const singleProductCache = new Map();

export const useProduct = (id) => {
    const { products } = useProducts();
    const [product, setProduct] = useState(() => {
        // Synchronous fast-path: if already in context or single cache, use it immediately
        // This prevents any loading flicker when navigating within the app
        return singleProductCache.get(id)
            || products.find(p => String(p._id) === String(id))
            || null;
    });
    const [loading, setLoading] = useState(!product);
    const [error, setError] = useState(null);
    const abortRef = useRef(null);

    useEffect(() => {
        // Fast-path: context already has it (user navigated from listing page)
        const fromContext = products.find(p => String(p._id) === String(id));
        if (fromContext) {
            setProduct(fromContext);
            setLoading(false);
            singleProductCache.set(id, fromContext); // warm the single cache too
            return;
        }

        // Single-cache hit: already fetched individually before (back navigation, etc.)
        if (singleProductCache.has(id)) {
            setProduct(singleProductCache.get(id));
            setLoading(false);
            return;
        }

        // Slow-path: direct URL access, refresh, or product not in paginated list
        const fetchSingle = async () => {
            abortRef.current?.abort();
            abortRef.current = new AbortController();

            try {
                setLoading(true);
                setError(null);

                const res = await fetch(`${API}/products/${id}`, {
                    signal: abortRef.current.signal,
                });

                if (!res.ok) {
                    throw new Error(res.status === 404 ? "Product not found" : "Failed to load product");
                }

                const data = await res.json();

                // Normalize to match context shape (context adds `images` shortcut)
                const normalized = {
                    ...data,
                    images: data?.variants?.[0]?.images || [],
                };

                singleProductCache.set(id, normalized);
                setProduct(normalized);
            } catch (err) {
                if (err.name === "AbortError") return; // navigation away — ignore
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchSingle();

        return () => abortRef.current?.abort(); // cleanup on id change or unmount
    }, [id, products]);

    // Invalidate: call this after cart/wishlist mutations if needed
    const invalidate = () => {
        singleProductCache.delete(id);
        setProduct(null);
        setLoading(true);
    };

    return { product, loading, error, invalidate };
};