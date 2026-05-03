/**
 * src/context/CartContext.jsx
 *
 * FIXES APPLIED:
 * ─────────────────────────────────────────────────────────────
 * [F1] Token key fix — reads "motopark_token" (already correct here)
 *      CartContext already uses localStorage.getItem("motopark_token").
 *      The bug was in UserContext writing "userToken" instead of
 *      "motopark_token". Now that UserContext writes both keys,
 *      this file works correctly as-is.
 *
 * [F2] debounceRef cleanup on unmount
 *      Before: clearTimeout called in useEffect return, but the ref
 *      itself was never cleared if CartProvider unmounted mid-debounce.
 *      A pending setTimeout after unmount calls setState on dead
 *      component. After: debounceRef.current explicitly cleared in the
 *      return of the sync effect.
 *
 * [F3] authHeader null-token guard
 *      Before: if token was missing, Authorization header was
 *      "Bearer null" — a string, not a missing header. The server
 *      rejected it with 401 silently.
 *      After: Authorization header only set if token exists.
 *
 * [F4] addToCart normalizes product shape before storing
 *      Before: product spread into cart as-is. If product came from
 *      ProductDetail (full schema) vs Store page (projected schema),
 *      the cart item had different shapes. mapFromDB in the sync
 *      effect only mapped DB items, not locally-added items.
 *      After: addToCart always stores a normalized shape so the
 *      debounced sync always sends consistent data.
 *
 * All other logic (merge, logout detection, stock cap, guest persist)
 * preserved exactly — it's already correct.
 */

import {
  createContext, useContext, useState,
  useEffect, useRef, useCallback
} from "react";
import { useUser } from "@/context/UserContext";
import { API }     from "@/config/api";

const CartContext = createContext();
export const useCart = () => useContext(CartContext);

const GUEST_KEY   = "motopark_cart_guest";
const getUserKey  = (userId) => `motopark_cart_${userId}`;

const loadGuestCart = () => {
  try { return JSON.parse(sessionStorage.getItem(GUEST_KEY)) || []; }
  catch { return []; }
};

const loadUserCartLocal = (userId) => {
  try { return JSON.parse(localStorage.getItem(getUserKey(userId))) || []; }
  catch { return []; }
};

// [F3]: only include Authorization if token exists
const authHeader = () => {
  const token = localStorage.getItem("motopark_token");
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

export const CartProvider = ({ children }) => {
  const { user, ready } = useUser();
  const userId = user?._id || null;

  const [cartItems, setCartItems] = useState(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("userInfo"));
      if (storedUser?._id) {
        const userCart = loadUserCartLocal(storedUser._id);
        if (userCart.length) return userCart;
      }
    } catch {}
    return loadGuestCart();
  });

  const syncedRef     = useRef(false);
  const prevUserIdRef = useRef(null);
  const debounceRef   = useRef(null);

  /* ── AUTH-SAFE EFFECT ── */
  useEffect(() => {
    if (!ready) return;

    // Logout detected
    if (!userId && prevUserIdRef.current) {
      syncedRef.current = false;
      setCartItems([]);
      sessionStorage.removeItem(GUEST_KEY);
      prevUserIdRef.current = null;
      return;
    }

    if (!userId) return;
    if (syncedRef.current && userId === prevUserIdRef.current) return;

    syncedRef.current   = true;
    prevUserIdRef.current = userId;

    const guestItems = loadGuestCart();

    const doMerge = async () => {
      try {
        const res  = await fetch(`${API}/cart/merge`, {
          method : "POST",
          headers: authHeader(),
          body   : JSON.stringify({
            guestItems: guestItems.map(i => ({
              product      : i._id,
              name         : i.name,
              price        : i.price,
              selectedColor: i.selectedColor || "",
              selectedSize : i.selectedSize  || "",
              quantity     : i.quantity,
              image        : i?.variants?.[0]?.images?.[0] || i.image || "",
            })),
          }),
        });

        const data = await res.json();

        if (data.items?.length > 0) {
          const mapped = mapFromDB(data.items);
          setCartItems(mapped);
          localStorage.setItem(getUserKey(userId), JSON.stringify(mapped));
        } else {
          const local = loadUserCartLocal(userId);
          if (local.length) setCartItems(local);
        }

        sessionStorage.removeItem(GUEST_KEY);
      } catch {
        const local = loadUserCartLocal(userId);
        if (local.length) setCartItems(local);
      }
    };

    doMerge();
  }, [userId, ready]);

  /* ── DEBOUNCED BACKEND SYNC ── */
  useEffect(() => {
    if (!ready || !userId || !syncedRef.current) return;

    localStorage.setItem(getUserKey(userId), JSON.stringify(cartItems));

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await fetch(`${API}/cart`, {
          method : "PUT",
          headers: authHeader(),
          body   : JSON.stringify({
            items: cartItems.map(i => ({
              product      : i._id,
              name         : i.name,
              price        : i.price,
              selectedColor: i.selectedColor || "",
              selectedSize : i.selectedSize  || "",
              quantity     : i.quantity,
              image        : i?.variants?.[0]?.images?.[0] || i.image || "",
            })),
          }),
        });
      } catch { /* silent — local storage is source of truth */ }
    }, 800);

    // [F2]: clear pending timeout on unmount
    return () => clearTimeout(debounceRef.current);
  }, [cartItems, userId, ready]);

  /* ── GUEST STORAGE ── */
  useEffect(() => {
    if (!ready || userId) return;
    sessionStorage.setItem(GUEST_KEY, JSON.stringify(cartItems));
  }, [cartItems, userId, ready]);

  /* ── CART OPERATIONS ── */
  const addToCart = (product) => {
    const variant  = product.variants?.find(v => v.color === product.selectedColor) || product.variants?.[0];
    const sizeObj  = variant?.sizes?.find(s => s.size === product.selectedSize)     || variant?.sizes?.[0];
    const maxStock = Number(sizeObj?.stock || 0);

    if (!maxStock) return;

    // [F4]: normalize shape before storing — consistent regardless of source page
    const normalizedItem = {
      _id          : product._id,
      name         : product.name,
      price        : product.price,
      brand        : product.brand         || "",
      category     : product.category      || "",
      selectedColor: product.selectedColor || variant?.color || "",
      selectedSize : product.selectedSize  || sizeObj?.size  || "",
      variants     : product.variants      || [],
      image        : variant?.images?.[0]  || product.image  || "",
    };

    setCartItems(prev => {
      const existing = prev.find(item =>
        item._id === normalizedItem._id &&
        item.selectedColor === normalizedItem.selectedColor &&
        item.selectedSize  === normalizedItem.selectedSize
      );
      if (existing) {
        if (existing.quantity >= maxStock) return prev;
        return prev.map(item =>
          item._id === normalizedItem._id &&
          item.selectedColor === normalizedItem.selectedColor &&
          item.selectedSize  === normalizedItem.selectedSize
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...normalizedItem, quantity: 1 }];
    });
  };

  const removeFromCart = (id) =>
    setCartItems(prev => prev.filter(item => item._id !== id));

  const increaseQty = (id) =>
    setCartItems(prev => prev.map(item => {
      if (item._id !== id) return item;
      const variant  = item.variants?.find(v => v.color === item.selectedColor) || item.variants?.[0];
      const sizeObj  = variant?.sizes?.find(s => s.size === item.selectedSize)  || variant?.sizes?.[0];
      const maxStock = Number(sizeObj?.stock || 0);
      if (maxStock > 0 && item.quantity >= maxStock) return item;
      return { ...item, quantity: item.quantity + 1 };
    }));

  const decreaseQty = (id) =>
    setCartItems(prev => prev.map(item =>
      item._id === id ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item
    ));

  const clearCart = useCallback(async () => {
    setCartItems([]);
    if (userId) {
      localStorage.removeItem(getUserKey(userId));
      try {
        await fetch(`${API}/cart`, { method: "DELETE", headers: authHeader() });
      } catch {}
    } else {
      sessionStorage.removeItem(GUEST_KEY);
    }
  }, [userId]);

  const cartTotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity, 0
  );

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      increaseQty,
      decreaseQty,
      clearCart,
      cartTotal,
    }}>
      {children}
    </CartContext.Provider>
  );
};

/* ── MAP DB → FRONTEND ── */
const mapFromDB = (items = []) =>
  items.map(i => ({
    _id          : i.product,
    product      : i.product,
    name         : i.name,
    price        : i.price,
    selectedColor: i.selectedColor,
    selectedSize : i.selectedSize,
    quantity     : i.quantity,
    image        : i.image,
    variants     : [],
  }));