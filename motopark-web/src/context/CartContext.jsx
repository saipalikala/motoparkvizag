import { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {

    const [cartItems, setCartItems] = useState(() => {
        const saved = localStorage.getItem("motopark_cart");
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem("motopark_cart", JSON.stringify(cartItems));
    }, [cartItems]);

    const addToCart = (product) => {

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

    const removeFromCart = (id) => {
        setCartItems(cartItems.filter(item => item._id !== id));
    };

    const increaseQty = (id) => {
        setCartItems(cartItems.map(item =>
            item._id === id
                ? { ...item, quantity: item.quantity + 1 }
                : item
        ));
    };

    const decreaseQty = (id) => {
        setCartItems(cartItems.map(item =>
            item._id === id
                ? { ...item, quantity: Math.max(1, item.quantity - 1) }
                : item
        ));
    };

    const clearCart = () => setCartItems([]);

    const cartTotal = cartItems.reduce(
        (total, item) => total + item.price * item.quantity,
        0
    );

    return (
        <CartContext.Provider
            value={{
                cartItems,
                addToCart,
                removeFromCart,
                increaseQty,
                decreaseQty,
                clearCart,
                cartTotal
            }}
        >
            {children}
        </CartContext.Provider>
    );
};