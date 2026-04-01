import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@/context/UserContext";
import { API } from "@/config/api";

const CartContext = createContext();
export const useCart = () => useContext(CartContext);

const GUEST_KEY = "motopark_cart_guest";
const getUserKey = (userId) => `motopark_cart_${userId}`;

const loadGuestCart = () => {
    try {
        return JSON.parse(sessionStorage.getItem(GUEST_KEY)) || [];
    } catch {
        return [];
    }
};

const loadUserCartLocal = (userId) => {
    try {
        return JSON.parse(localStorage.getItem(getUserKey(userId))) || [];
    } catch {
        return [];
    }
};

const authHeader = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("motopark_token")}`,
});

export const CartProvider = ({ children }) => {
    const { user, ready } = useUser();
    const userId = user?._id || null;

    // ✅ FIX 1: Clean initialization (NO nested hooks)
    const [cartItems, setCartItems] = useState(() => {
        try {
            const storedUser = JSON.parse(localStorage.getItem("userInfo"));

            if (storedUser?._id) {
                const userCart = loadUserCartLocal(storedUser._id);
                if (userCart.length) return userCart;
            }
        } catch { }

        return loadGuestCart();
    });

    const syncedRef = useRef(false);
    const prevUserIdRef = useRef(null);
    const debounceRef = useRef(null);

    /* ===============================
       AUTH-SAFE EFFECT
    =============================== */
    useEffect(() => {
        if (!ready) return;

        // ✅ FIX 2: Real logout detection
        if (!userId && prevUserIdRef.current) {
            syncedRef.current = false;
            setCartItems([]);
            sessionStorage.removeItem(GUEST_KEY);
            prevUserIdRef.current = null;
            return;
        }

        if (!userId) return;

        // Prevent duplicate merge
        if (syncedRef.current && userId === prevUserIdRef.current) return;

        syncedRef.current = true;
        prevUserIdRef.current = userId;

        const guestItems = loadGuestCart();

        const doMerge = async () => {
            try {
                const res = await fetch(`${API}/cart/merge`, {
                    method: "POST",
                    headers: authHeader(),
                    body: JSON.stringify({
                        guestItems: guestItems.map(i => ({
                            product: i._id,
                            name: i.name,
                            price: i.price,
                            selectedColor: i.selectedColor || "",
                            selectedSize: i.selectedSize || "",
                            quantity: i.quantity,
                            image: i?.variants?.[0]?.images?.[0] || "",
                        }))
                    }),
                });

                const data = await res.json();

                // ✅ FIX 3: Prevent empty overwrite
                if (data.items && data.items.length > 0) {
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

    /* ===============================
       DEBOUNCED BACKEND SYNC
    =============================== */
    useEffect(() => {
        if (!ready || !userId || !syncedRef.current) return;

        localStorage.setItem(getUserKey(userId), JSON.stringify(cartItems));

        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            try {
                await fetch(`${API}/cart`, {
                    method: "PUT",
                    headers: authHeader(),
                    body: JSON.stringify({
                        items: cartItems.map(i => ({
                            product: i._id,
                            name: i.name,
                            price: i.price,
                            selectedColor: i.selectedColor || "",
                            selectedSize: i.selectedSize || "",
                            quantity: i.quantity,
                            image: i?.variants?.[0]?.images?.[0] || i.image || "",
                        }))
                    }),
                });
            } catch { }
        }, 800);

        return () => clearTimeout(debounceRef.current);
    }, [cartItems, userId, ready]);

    /* ===============================
       GUEST STORAGE
    =============================== */
    useEffect(() => {
        if (!ready || userId) return;
        sessionStorage.setItem(GUEST_KEY, JSON.stringify(cartItems));
    }, [cartItems, userId, ready]);

    /* ===============================
       CART OPERATIONS
    =============================== */
    const addToCart = (product) => {
        const variant = product.variants?.find(v => v.color === product.selectedColor)
            || product.variants?.[0];
        const sizeObj = variant?.sizes?.find(s => s.size === product.selectedSize)
            || variant?.sizes?.[0];
        const maxStock = Number(sizeObj?.stock || 0);

        if (!maxStock) return; // no stock at all

        setCartItems(prev => {
            const existing = prev.find(item => item._id === product._id);
            if (existing) {
                // ✅ Cap at maxStock on re-add too
                if (existing.quantity >= maxStock) return prev;
                return prev.map(item =>
                    item._id === product._id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const removeFromCart = (id) =>
        setCartItems(prev => prev.filter(item => item._id !== id));

    // ✅ FIXED — respects actual stock
    const increaseQty = (id) =>
        setCartItems(prev => prev.map(item => {
            if (item._id !== id) return item;

            // Find max stock for selected size/variant
            const variant = item.variants?.find(v => v.color === item.selectedColor)
                || item.variants?.[0];
            const sizeObj = variant?.sizes?.find(s => s.size === item.selectedSize)
                || variant?.sizes?.[0];
            const maxStock = Number(sizeObj?.stock || 0);

            // Don't exceed stock
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
                await fetch(`${API}/cart`, {
                    method: "DELETE",
                    headers: authHeader(),
                });
            } catch { }
        } else {
            sessionStorage.removeItem(GUEST_KEY);
        }
    }, [userId]);

    const cartTotal = cartItems.reduce(
        (total, item) => total + item.price * item.quantity,
        0
    );

    return (
        <CartContext.Provider value={{
            cartItems,
            addToCart,
            removeFromCart,
            increaseQty,
            decreaseQty,
            clearCart,
            cartTotal
        }}>
            {children}
        </CartContext.Provider>
    );
};

/* ===============================
   MAP DB → FRONTEND
=============================== */
const mapFromDB = (items = []) =>
    items.map(i => ({
        _id: i.product,
        product: i.product,
        name: i.name,
        price: i.price,
        selectedColor: i.selectedColor,
        selectedSize: i.selectedSize,
        quantity: i.quantity,
        image: i.image,
    }));