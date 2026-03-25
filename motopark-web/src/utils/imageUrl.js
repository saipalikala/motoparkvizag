/* ================================================
   File: src/utils/imageUrl.js

   Central helper for resolving product image URLs.
   Works for:
   - Cloudinary: "https://res.cloudinary.com/..."  → returned as-is
   - Legacy local: "/uploads/products/file.jpg"    → prepends API base
   - Already full URL: "http://..."                → returned as-is
   ================================================ */

const API = "http://localhost:5000";

/**
 * Resolve any image path to a displayable URL.
 * @param {string} raw - raw image value from DB
 * @returns {string|null}
 */
export const resolveImage = (raw) => {
    if (!raw) return null;
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    // legacy local path
    return `${API}${raw.startsWith("/") ? "" : "/"}${raw}`;
};

/**
 * Get the first image from a product object.
 * Checks variants[0].images[0] then images[0].
 */
export const getProductImage = (product) => {
    const raw = product?.variants?.[0]?.images?.[0] || product?.images?.[0];
    return resolveImage(raw);
};