import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useUser } from "@/context/UserContext";
import { API } from "@/config/api";

const WishlistContext = createContext();
export const useWishlist = () => useContext(WishlistContext);

const GUEST_KEY = "motopark_wishlist_guest";
const getUserKey = (userId) => `motopark_wishlist_${userId}`;

const loadGuestWishlist = () => {
    try { return JSON.parse(sessionStorage.getItem(GUEST_KEY)) || []; }
    catch { return []; }
};
const loadUserWishlistLocal = (userId) => {
    try { return JSON.parse(localStorage.getItem(getUserKey(userId))) || []; }
    catch { return []; }
};

const authHeader = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("motopark_token")}`,
});

export const WishlistProvider = ({ children }) => {
    const { user, ready } = useUser(); // ✅ get ready flag
    const userId = user?._id || null;

    // ✅ Initialize from localStorage immediately using stored userInfo
    const [wishlist, setWishlist] = useState(() => {
        try {
            const storedUser = JSON.parse(localStorage.getItem("userInfo"));
            if (storedUser?._id) return loadUserWishlistLocal(storedUser._id);
        } catch { /* ignore */ }
        return loadGuestWishlist();
    });

    const syncedRef = useRef(false);
    const prevUserIdRef = useRef(null);
    const debounceRef = useRef(null);

    /* ══════════════════════════════════════════════
       WAIT FOR AUTH — do nothing until ready
    ══════════════════════════════════════════════ */
    useEffect(() => {
        if (!ready) return; // ✅ auth still loading — do nothing

        // User just logged out
        if (!userId && prevUserIdRef.current) {
            syncedRef.current = false;
            setWishlist([]);
            sessionStorage.removeItem(GUEST_KEY);
            prevUserIdRef.current = null;
            return;
        }

        if (!userId) return;

        // Same user refreshed — already synced
        if (syncedRef.current && userId === prevUserIdRef.current) return;

        syncedRef.current = true;
        prevUserIdRef.current = userId;

        const guestItems = loadGuestWishlist();

        const doMerge = async () => {
            try {
                const res = await fetch(`${API}/wishlist/merge`, {
                    method: "POST",
                    headers: authHeader(),
                    body: JSON.stringify({
                        guestItems: guestItems.map(i => ({
                            product: i._id || i.product,
                            name: i.name,
                            price: i.price,
                            image: i.variants?.[0]?.images?.[0] || i.image || "",
                            variants: i.variants || [],
                        }))
                    }),
                });
                const data = await res.json();

                if (data.items && data.items.length > 0) {
                    const mapped = data.items.map(i => ({
                        _id: i.product,
                        product: i.product,
                        name: i.name,
                        price: i.price,
                        image: i.image,
                        variants: i.variants,
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
    }, [userId, ready]); // ✅ depends on ready

    /* ══════════════════════════════════════════════
       DEBOUNCED BACKEND SYNC
    ══════════════════════════════════════════════ */
    useEffect(() => {
        if (!ready || !userId || !syncedRef.current) return;

        localStorage.setItem(getUserKey(userId), JSON.stringify(wishlist));

        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            try {
                await fetch(`${API}/wishlist`, {
                    method: "PUT",
                    headers: authHeader(),
                    body: JSON.stringify({
                        items: wishlist.map(i => ({
                            product: i._id || i.product,
                            name: i.name,
                            price: i.price,
                            image: i.image || "",
                            variants: i.variants || [],
                        }))
                    }),
                });
            } catch { /* silent */ }
        }, 800);

        return () => clearTimeout(debounceRef.current);
    }, [wishlist, userId, ready]);

    /* ══════════════════════════════════════════════
       GUEST: persist to sessionStorage
    ══════════════════════════════════════════════ */
    useEffect(() => {
        if (!ready || userId) return;
        sessionStorage.setItem(GUEST_KEY, JSON.stringify(wishlist));
    }, [wishlist, userId, ready]);

    const addToWishlist = (product) =>
        setWishlist(prev => {
            const exists = prev.some(item => item._id === product._id);
            return exists ? prev : [...prev, product];
        });

    const removeFromWishlist = (id) =>
        setWishlist(prev => prev.filter(item => item._id !== id));

    const isInWishlist = (id) => wishlist.some(item => item._id === id);

    return (
        <WishlistContext.Provider value={{
            wishlist, addToWishlist, removeFromWishlist, isInWishlist
        }}>
            {children}
        </WishlistContext.Provider>
    );
};