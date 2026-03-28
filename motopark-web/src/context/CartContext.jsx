import { createContext, useContext, useState, useEffect } from "react";
import { useUser } from "@/context/UserContext";

const CartContext = createContext();
export const useCart = () => useContext(CartContext);

const getKey = (userId) => userId ? `motopark_cart_${userId}` : "motopark_cart_guest";

const loadCart = (userId) => {
    try {
        const saved = localStorage.getItem(getKey(userId));
        return saved ? JSON.parse(saved) : [];
    } catch { return []; }
};

export const CartProvider = ({ children }) => {
    const { user } = useUser();
    const userId = user?._id || null;

    const [cartItems, setCartItems] = useState(() => loadCart(userId));

    /* ── When user logs in: merge guest cart into user cart, clear guest ── */
    useEffect(() => {
        if (userId) {
            const guestCart = loadCart(null);
            const userCart = loadCart(userId);

            if (guestCart.length > 0) {
                // Merge: add guest items not already in user cart
                const merged = [...userCart];
                guestCart.forEach(guestItem => {
                    const exists = merged.find(i => i._id === guestItem._id);
                    if (exists) {
                        merged.forEach(i => {
                            if (i._id === guestItem._id) i.quantity += guestItem.quantity;
                        });
                    } else {
                        merged.push(guestItem);
                    }
                });
                setCartItems(merged);
                localStorage.removeItem(getKey(null)); // clear guest cart
            } else {
                setCartItems(userCart);
            }
        } else {
            // User logged out — load guest cart
            setCartItems(loadCart(null));
        }
    }, [userId]);

    /* ── Persist to correct key whenever cart or user changes ── */
    useEffect(() => {
        localStorage.setItem(getKey(userId), JSON.stringify(cartItems));
    }, [cartItems, userId]);

    const addToCart = (product) => {
        // Block out-of-stock products
        const hasStock = product.variants?.some(v =>
            v.sizes?.some(s => Number(s.stock) > 0)
        );
        if (!hasStock) return;

        const existing = cartItems.find(item => item._id === product._id);
        if (existing) {
            setCartItems(cartItems.map(item =>
                item._id === product._id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ));
        } else {
            setCartItems([...cartItems, { ...product, quantity: 1 }]);
        }
    };

    const removeFromCart = (id) => setCartItems(cartItems.filter(item => item._id !== id));

    const increaseQty = (id) => setCartItems(cartItems.map(item =>
        item._id === id ? { ...item, quantity: item.quantity + 1 } : item
    ));

    const decreaseQty = (id) => setCartItems(cartItems.map(item =>
        item._id === id ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item
    ));

    const clearCart = () => {
        setCartItems([]);
        localStorage.removeItem(getKey(userId));
    };

    const cartTotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

    return (
        <CartContext.Provider value={{
            cartItems, addToCart, removeFromCart,
            increaseQty, decreaseQty, clearCart, cartTotal
        }}>
            {children}
        </CartContext.Provider>
    );
};