import { createContext, useContext, useState, useEffect } from "react";

const WishlistContext = createContext();

export const useWishlist = () => useContext(WishlistContext);

export const WishlistProvider = ({ children }) => {

    const [wishlist, setWishlist] = useState(() => {
        const saved = localStorage.getItem("motopark_wishlist");
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem("motopark_wishlist", JSON.stringify(wishlist));
    }, [wishlist]);

    const addToWishlist = (product) => {

        const exists = wishlist.find(item => item._id === product._id);

        if (!exists) {
            setWishlist([...wishlist, product]);
        }
    };

    const removeFromWishlist = (id) => {
        setWishlist(wishlist.filter(item => item._id !== id));
    };

    const isInWishlist = (id) => {
        return wishlist.some(item => item._id === id);
    };

    return (
        <WishlistContext.Provider
            value={{
                wishlist,
                addToWishlist,
                removeFromWishlist,
                isInWishlist
            }}
        >
            {children}
        </WishlistContext.Provider>
    );
};