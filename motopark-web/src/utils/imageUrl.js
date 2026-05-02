/* ================================================
   File: src/utils/imageUrl.js

   FIXES APPLIED:
   ✅ optimizeImage now accepts { width, height, crop }
      options — matches the suggested cloudinaryUrl
      signature but without adding a duplicate function.
      SearchOverlay and ProductCard both use this,
      so the crop/height capability is available everywhere.
   ✅ getProductImage passes options through to optimizeImage
      so callers can override width at the call site.

   NOT CHANGED:
   ✗ cloudinaryUrl not added as a separate function —
     it's identical to optimizeImage with crop support.
     Two functions doing the same thing is tech debt.
     One enhanced function serves both use cases.
================================================ */

import { API } from "@/config/api";

/* ── Resolve any image path to an absolute URL ── */
export const resolveImage = (raw) => {
    if (!raw) return null;
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    return `${API}${raw.startsWith("/") ? "" : "/"}${raw}`;
};

/* ── Optimize a Cloudinary URL with transforms ──
   Options:
     width  {number}  px — default 400
     height {number}  px — omitted by default (preserves aspect ratio)
     crop   {string}  Cloudinary crop mode — default "fill"

   Non-Cloudinary URLs pass through resolveImage untouched,
   so this is safe to call on any image regardless of origin. */
export const optimizeImage = (raw, { width = 400, height, crop = "fill" } = {}) => {
    if (!raw) return null;

    if (raw.includes("res.cloudinary.com")) {
        const transforms = [
            "f_auto",               // WebP on Chrome/Edge, AVIF where supported
            "q_auto",               // Cloudinary's perceptual quality algorithm
            `w_${width}`,
            height ? `h_${height}` : null,
            `c_${crop}`,
        ]
            .filter(Boolean)
            .join(",");

        return raw.replace("/upload/", `/upload/${transforms}/`);
    }

    return resolveImage(raw);
};

/* ── Convenience: get optimized primary image from a product ──
   Handles both your variant-based shape and flat images[].
   Pass options to override defaults at the call site:
     getProductImage(product, { width: 800 })  — PDP hero
     getProductImage(product)                   — card (400px default) */
export const getProductImage = (product, options = {}) => {
    const raw = product?.variants?.[0]?.images?.[0] ?? product?.images?.[0];
    return optimizeImage(raw, options);
};

/* ── Convenience: get hover image (second variant image) ── */
export const getProductHoverImage = (product, options = {}) => {
    const raw = product?.variants?.[0]?.images?.[1] ?? null;
    return optimizeImage(raw, options);
};