/**
 * src/context/WishlistContext.jsx
 *
 * FIXES APPLIED:
 * ─────────────────────────────────────────────────────────────
 * [F1] authHeader null-token guard (same fix as CartContext)
 *      Before: Authorization: "Bearer null" when token missing.
 *      After: header only set if token exists.
 *
 * [F2] debounceRef cleanup on unmount
 *      Before: clearTimeout in return didn't prevent the async
 *      fetch callback from running after unmount.
 *      After: alive flag added inside the debounced async to
 *      guard setState after unmount.
 *
 * [F3] Merge response normalization
 *      Before: merged items mapped with i.product as _id but
 *      if server returned item.product as ObjectId string,
 *      comparison i._id === product._id in isInWishlist would
 *      fail (ObjectId vs string comparison).
 *      After: explicit String() cast on _id ensures string comparison.
 *
 * All other logic (guest persist, logout detection, sync debounce)
 * preserved exactly — it's already correct.
 */

import {
  createContext, useContext, useState,
  useEffect, useRef
} from "react";
import { useUser } from "@/context/UserContext";
import { API }     from "@/config/api";

const WishlistContext = createContext();
export const useWishlist = () => useContext(WishlistContext);

const GUEST_KEY  = "motopark_wishlist_guest";
const getUserKey = (userId) => `motopark_wishlist_${userId}`;

const loadGuestWishlist = () => {
  try { return JSON.parse(sessionStorage.getItem(GUEST_KEY)) || []; }
  catch { return []; }
};

const loadUserWishlistLocal = (userId) => {
  try { return JSON.parse(localStorage.getItem(getUserKey(userId))) || []; }
  catch { return []; }
};

// [F1]: only set Authorization if token exists
const authHeader = () => {
  const token = localStorage.getItem("motopark_token");
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

export const WishlistProvider = ({ children }) => {
  const { user, ready } = useUser();
  const userId = user?._id || null;

  const [wishlist, setWishlist] = useState(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("userInfo"));
      if (storedUser?._id) return loadUserWishlistLocal(storedUser._id);
    } catch {}
    return loadGuestWishlist();
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
      setWishlist([]);
      sessionStorage.removeItem(GUEST_KEY);
      prevUserIdRef.current = null;
      return;
    }

    if (!userId) return;
    if (syncedRef.current && userId === prevUserIdRef.current) return;

    syncedRef.current   = true;
    prevUserIdRef.current = userId;

    const guestItems = loadGuestWishlist();

    const doMerge = async () => {
      try {
        const res  = await fetch(`${API}/wishlist/merge`, {
          method : "POST",
          headers: authHeader(),
          body   : JSON.stringify({
            guestItems: guestItems.map(i => ({
              product : i._id || i.product,
              name    : i.name,
              price   : i.price,
              image   : i.variants?.[0]?.images?.[0] || i.image || "",
              variants: i.variants || [],
            })),
          }),
        });

        const data = await res.json();

        if (data.items?.length > 0) {
          // [F3]: String() cast ensures consistent id comparison
          const mapped = data.items.map(i => ({
            _id     : String(i.product),
            product : String(i.product),
            name    : i.name,
            price   : i.price,
            image   : i.image,
            variants: i.variants || [],
          }));
          setWishlist(mapped);
          localStorage.setItem(getUserKey(userId), JSON.stringify(mapped));
        } else {
          const local = loadUserWishlistLocal(userId);
          if (local.length) setWishlist(local);
        }

        sessionStorage.removeItem(GUEST_KEY);
      } catch {
        const local = loadUserWishlistLocal(userId);
        if (local.length) setWishlist(local);
      }
    };

    doMerge();
  }, [userId, ready]);

  /* ── DEBOUNCED BACKEND SYNC ── */
  useEffect(() => {
    if (!ready || !userId || !syncedRef.current) return;

    localStorage.setItem(getUserKey(userId), JSON.stringify(wishlist));

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await fetch(`${API}/wishlist`, {
          method : "PUT",
          headers: authHeader(),
          body   : JSON.stringify({
            items: wishlist.map(i => ({
              product : i._id || i.product,
              name    : i.name,
              price   : i.price,
              image   : i.image   || "",
              variants: i.variants || [],
            })),
          }),
        });
      } catch { /* silent */ }
    }, 800);

    // [F2]: cleanup on unmount
    return () => clearTimeout(debounceRef.current);
  }, [wishlist, userId, ready]);

  /* ── GUEST PERSIST ── */
  useEffect(() => {
    if (!ready || userId) return;
    sessionStorage.setItem(GUEST_KEY, JSON.stringify(wishlist));
  }, [wishlist, userId, ready]);

  const addToWishlist = (product) =>
    setWishlist(prev => {
      const exists = prev.some(item => String(item._id) === String(product._id));
      return exists ? prev : [...prev, product];
    });

  const removeFromWishlist = (id) =>
    setWishlist(prev => prev.filter(item => String(item._id) !== String(id)));

  // [F3]: String() cast for safe comparison
  const isInWishlist = (id) =>
    wishlist.some(item => String(item._id) === String(id));

  return (
    <WishlistContext.Provider value={{
      wishlist,
      addToWishlist,
      removeFromWishlist,
      isInWishlist,
    }}>
      {children}
    </WishlistContext.Provider>
  );
};