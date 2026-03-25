/* ================================================
   File: backend/middleware/uploadLimits.js

   Replace your existing multer config in uploadRoutes.js
   with this — adds 5MB per file limit.
   ================================================ */

import multer from "multer";
import path from "path";
import fs from "fs";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB per file

const makeStorage = (folder) => {
    const uploadPath = path.join("uploads", folder);
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

    return multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadPath),
        filename: (req, file, cb) => {
            const safe = file.originalname.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9.\-_]/g, "");
            cb(null, `${Date.now()}-${safe}`);
        },
    });
};

const fileFilter = (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only JPEG, PNG, WebP and GIF images are allowed"), false);
    }
};

/* Exportable multer instances */
export const uploadProducts = multer({ storage: makeStorage("products"), fileFilter, limits: { fileSize: MAX_SIZE } });
export const uploadCarousel = multer({ storage: makeStorage("carousel"), fileFilter, limits: { fileSize: MAX_SIZE } });
export const uploadLogo = multer({ storage: makeStorage("logo"), fileFilter, limits: { fileSize: MAX_SIZE } });
export const uploadIcons = multer({ storage: makeStorage("icons"), fileFilter, limits: { fileSize: MAX_SIZE } });
export const uploadMedia = multer({ storage: makeStorage("media"), fileFilter, limits: { fileSize: MAX_SIZE } });

/* Generic any-field uploader (used in productRoutes) */
export const uploadAny = multer({
    storage: makeStorage("products"),
    fileFilter,
    limits: { fileSize: MAX_SIZE, files: 20 }, // max 20 files per request
});