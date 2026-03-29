/* ================================================
   File: src/utils/imageUrl.js
================================================ */

import { API } from "@/config/api";

export const resolveImage = (raw) => {
    if (!raw) return null;
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    return `${API}${raw.startsWith("/") ? "" : "/"}${raw}`;
};

// ADD THIS — Cloudinary auto WebP + compress + resize
export const optimizeImage = (raw, width = 400) => {
    if (!raw) return null;
    if (raw.includes("cloudinary")) {
        return raw.replace("/upload/", `/upload/w_${width},q_auto,f_auto/`);
    }
    return resolveImage(raw);
};

export const getProductImage = (product, width = 400) => {
    const raw = product?.variants?.[0]?.images?.[0] || product?.images?.[0];
    return optimizeImage(raw, width);
};