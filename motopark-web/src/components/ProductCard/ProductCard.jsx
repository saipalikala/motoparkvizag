/* ================================================
   ProductCard.jsx — Refactored
   
   FIXES:
   ✅ whileHover via Framer Motion (single transform owner)
   ✅ Image swap on hover via state (stable, no flicker)
   ✅ Hover overlay: CSS-only (translateY on opacity gradient)
      → no position:absolute hack, uses overflow hidden
   ✅ No redundant CSS transform + Framer transform conflict
   ✅ Added to cart feedback via local state (not re-render heavy)
   ================================================ */
import { useState } from "react";
import { motion } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useNavigate } from "react-router-dom";
import { API } from "@/config/api";
import "./ProductCard.css";

const EASE = [0.22, 1, 0.36, 1];

const HeartIcon = ({ filled }) => (
    <svg width="16" height="16" viewBox="0 0 24 24"
        fill={filled ? "#ff6b3d" : "none"}
        stroke={filled ? "#ff6b3d" : "currentColor"}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
);

const ProductCard = ({ product }) => {
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

    const [added, setAdded]     = useState(false);
    const [hovered, setHovered] = useState(false);

    const wishlisted = isInWishlist(product._id);

    const first  = product?.variants?.[0]?.images?.[0];
    const second = product?.variants?.[0]?.images?.[1];

    const imageSrc = (hovered && second)
        ? `${API}${second}`
        : first
            ? `${API}${first}`
            : "/placeholder.png";

    const handleAddCart = (e) => {
        e.stopPropagation();
        addToCart(product);
        setAdded(true);
        setTimeout(() => setAdded(false), 1200);
    };

    const handleWishlist = (e) => {
        e.stopPropagation();
        wishlisted ? removeFromWishlist(product._id) : addToWishlist(product);
    };

    return (
        <motion.div
            className="product-card"
            onClick={() => navigate(`/product/${product._id}`)}
            onHoverStart={() => setHovered(true)}
            onHoverEnd={() => setHovered(false)}
            /* Framer owns transform — no CSS transform on .product-card */
            whileHover={{ y: -8, transition: { duration: 0.28, ease: EASE } }}
            role="button"
            tabIndex={0}
            aria-label={`View ${product.name}`}
            onKeyDown={(e) => e.key === "Enter" && navigate(`/product/${product._id}`)}
        >
            {/* Image region */}
            <div className="pc-image">
                <img
                    src={imageSrc}
                    alt={product.name}
                    loading="lazy"
                    decoding="async"
                    className={`pc-img ${hovered ? "pc-img--zoomed" : ""}`}
                />

                {/* Wishlist */}
                <button
                    className={`pc-wishlist ${wishlisted ? "pc-wishlist--active" : ""}`}
                    onClick={handleWishlist}
                    aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
                >
                    <HeartIcon filled={wishlisted} />
                </button>

                {/* Hover info overlay — CSS-driven, no absolute hack */}
                <div className="pc-overlay">
                    <div className="pc-overlay-content">
                        <div className="pc-overlay-text">
                            <span className="pc-overlay-name">{product.name}</span>
                            <span className="pc-overlay-price">₹{product.price?.toLocaleString("en-IN")}</span>
                        </div>
                        <button
                            className={`pc-add-btn ${added ? "pc-add-btn--added" : ""}`}
                            onClick={handleAddCart}
                        >
                            {added ? "✓ Added" : "Add"}
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default ProductCard;