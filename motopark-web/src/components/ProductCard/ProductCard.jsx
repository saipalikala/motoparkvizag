/* ================================================
   ProductCard.jsx — Optimized

   FIXES APPLIED:
   ✅ memo() — stops re-renders when parent updates
      unrelated state (e.g. cart count in header)
   ✅ useCallback on handlers — stable refs across
      renders, safe to pass down or use in lists
   ✅ Cloudinary f_auto,q_auto,w_400 — browser gets
      WebP/AVIF at correct size, not full-res JPEG
   ✅ Kept: Framer Motion whileHover (single transform
      owner, no CSS conflict)
   ✅ Kept: hover image swap via state (stable, no flicker)
   ✅ Kept: HeartIcon inline SVG (no icon lib dependency)
   ✅ Kept: CSS-only overlay (no position:absolute hack)
   ✅ Kept: "Added" feedback via local state
   ================================================ */
import { memo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useNavigate } from "react-router-dom";
import { API } from "@/config/api";
import "./ProductCard.css";

const EASE = [0.22, 1, 0.36, 1];

// Inline SVG — no icon library import, zero extra KB
const HeartIcon = ({ filled }) => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={filled ? "#ff6b3d" : "none"}
        stroke={filled ? "#ff6b3d" : "currentColor"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
);

// ─────────────────────────────────────────────
// Cloudinary optimizer
//
// Injects f_auto,q_auto,w_400 into the upload URL.
// f_auto → WebP on Chrome/Edge, AVIF where supported
// q_auto → Cloudinary picks optimal quality (no hardcode)
// w_400  → Never serves a 1200px image into a 200px card
//
// Falls back gracefully if the URL isn't a Cloudinary
// URL (e.g. local /placeholder.png stays untouched).
// ─────────────────────────────────────────────
const optimizeCloudinary = (url) => {
    if (!url) return null;
    if (!url.includes("res.cloudinary.com")) return url;
    return url.replace("/upload/", "/upload/f_auto,q_auto,w_400/");
};

// ─────────────────────────────────────────────
// memo() — component only re-renders when its own
// props change. Without this, every time a parent
// holding a list re-renders (e.g. cart count changes
// in a context at the top of the tree), every single
// ProductCard in the grid re-renders unnecessarily.
// ─────────────────────────────────────────────
const ProductCard = memo(function ProductCard({ product }) {
    const navigate    = useNavigate();
    const { addToCart } = useCart();
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

    const [added, setAdded]     = useState(false);
    const [hovered, setHovered] = useState(false);

    const wishlisted = isInWishlist(product._id);

    // ── Image resolution ──────────────────────
    // Uses variant images if present (your data shape),
    // applies Cloudinary optimization on top.
    // API prefix only added for relative paths.
    const resolveUrl = (path) => {
        if (!path) return null;
        // Already an absolute URL (Cloudinary direct)
        if (path.startsWith("http")) return optimizeCloudinary(path);
        // Relative path → prepend API base, then optimize
        return optimizeCloudinary(`${API}${path}`);
    };

    const first  = product?.variants?.[0]?.images?.[0];
    const second = product?.variants?.[0]?.images?.[1];

    const imageSrc =
        (hovered && second)
            ? resolveUrl(second)
            : resolveUrl(first) ?? "/placeholder.png";

    // ── Handlers ─────────────────────────────
    // useCallback keeps these refs stable across renders.
    // Prevents unnecessary re-renders of child buttons
    // if they're ever extracted into their own components.
    const handleAddCart = useCallback(
        (e) => {
            e.stopPropagation();
            addToCart(product);
            setAdded(true);
            setTimeout(() => setAdded(false), 1200);
        },
        // product identity is stable per card; addToCart
        // should be memoized in CartContext (useCallback there too)
        [product, addToCart]
    );

    const handleWishlist = useCallback(
        (e) => {
            e.stopPropagation();
            wishlisted
                ? removeFromWishlist(product._id)
                : addToWishlist(product);
        },
        [wishlisted, product, addToWishlist, removeFromWishlist]
    );

    const handleNavigate = useCallback(
        () => navigate(`/product/${product._id}`),
        [product._id, navigate]
    );

    const handleKeyDown = useCallback(
        (e) => { if (e.key === "Enter") handleNavigate(); },
        [handleNavigate]
    );

    return (
        <motion.div
            className="product-card"
            onClick={handleNavigate}
            onHoverStart={() => setHovered(true)}
            onHoverEnd={() => setHovered(false)}
            // Framer owns transform — no CSS transform on .product-card
            whileHover={{ y: -8, transition: { duration: 0.28, ease: EASE } }}
            role="button"
            tabIndex={0}
            aria-label={`View ${product.name}`}
            onKeyDown={handleKeyDown}
        >
            {/* Image region */}
            <div className="pc-image">
                <img
                    src={imageSrc}
                    alt={product.name}
                    loading="lazy"
                    decoding="async"
                    // Explicit dimensions prevent CLS (layout shift
                    // while image loads — affects Core Web Vitals score)
                    width={400}
                    height={400}
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
                            <span className="pc-overlay-price">
                                ₹{product.price?.toLocaleString("en-IN")}
                            </span>
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
});

export default ProductCard;