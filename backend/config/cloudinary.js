/* ================================================
   File: backend/config/cloudinary.js
   ================================================ */
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

/* ── CONFIGURE ── */
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* ── STORAGE FACTORY ──
   Creates a multer-cloudinary storage for a given folder.
   Images are auto-optimised (webp, quality auto, max 1200px wide).
*/
const makeStorage = (folder) =>
    new CloudinaryStorage({
        cloudinary,
        params: async (req, file) => ({
            folder: `motopark/${folder}`,
            allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
            resource_type: "image", // ✅ ADD THIS LINE
            transformation: [{ width: 1200, crop: "limit", quality: "auto" }],
        }),
    });

/* ── MULTER INSTANCES (one per upload type) ── */
const MAX = 5 * 1024 * 1024; // 5 MB

export const uploadProducts = multer({
    storage: makeStorage("products"),
    limits: { fileSize: MAX, files: 20 },
});

export const uploadCarousel = multer({
    storage: makeStorage("carousel"),
    limits: { fileSize: MAX },
});

export const uploadLogo = multer({
    storage: makeStorage("logo"),
    limits: { fileSize: MAX },
});

export const uploadIcons = multer({
    storage: makeStorage("icons"),
    limits: { fileSize: MAX },
});

export const uploadMedia = multer({
    storage: makeStorage("media"),
    limits: { fileSize: MAX },
});

/* ── DELETE HELPER ──
   Call this when a product/slide is deleted to clean up Cloudinary too.
   Usage: await deleteFromCloudinary("motopark/products/filename")
*/
export const deleteFromCloudinary = async (publicId) => {
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (err) {
        console.error("Cloudinary delete error:", err.message);
    }
};

export default cloudinary;