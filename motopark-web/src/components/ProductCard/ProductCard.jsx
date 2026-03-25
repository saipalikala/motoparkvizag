import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useNavigate } from "react-router-dom";
import { API } from "@/config/api";

import "./ProductCard.css";

const ProductCard = ({ product }) => {

    const navigate = useNavigate();
    const { addToCart } = useCart();

    const {
        addToWishlist,
        removeFromWishlist,
        isInWishlist
    } = useWishlist();

    const [added, setAdded] = useState(false);
    const [hovered, setHovered] = useState(false);

    const wishlisted = isInWishlist(product._id);

    /* IMAGE */
    const firstImage = product?.variants?.[0]?.images?.[0];
    const secondImage = product?.variants?.[0]?.images?.[1];

    const imageSrc = hovered && secondImage
        ? `${API}${secondImage}`
        : firstImage
            ? `${API}${firstImage}`
            : "/placeholder.png";

    /* ADD TO CART */
    const handleAddCart = (e) => {
        e.stopPropagation();
        addToCart(product);

        setAdded(true);
        setTimeout(() => setAdded(false), 1000);
    };

    /* WISHLIST */
    const handleWishlist = (e) => {
        e.stopPropagation();

        if (wishlisted) {
            removeFromWishlist(product._id);
        } else {
            addToWishlist(product);
        }
    };

    return (

        <div
            className="product-card"
            onClick={() => navigate(`/product/${product._id}`)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >

            {/* IMAGE */}
            <div className="product-image">

                <img src={imageSrc} alt={product.name} />

                {/* WISHLIST */}
                <button
                    className={`wishlist-btn ${wishlisted ? "active" : ""}`}
                    onClick={handleWishlist}
                >
                    ♥
                </button>

                {/* HOVER INFO */}
                <div className="hover-info">

                    <div className="info-text">
                        <h3>{product.name}</h3>
                        <p>₹{product.price}</p>
                    </div>

                    <button
                        className="add-to-cart-btn"
                        onClick={handleAddCart}
                    >
                        {added ? "✓ Added" : "Add"}
                    </button>

                </div>

            </div>

        </div>
    );
};

export default ProductCard;