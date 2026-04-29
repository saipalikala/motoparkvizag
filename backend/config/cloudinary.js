/* ============================================================
   backend/config/cloudinary.js
   ============================================================

   ROOT-CAUSE FIX (video uploads)
   ───────────────────────────────
   multer-storage-cloudinary's video upload path reads credentials
   from the CLOUDINARY_URL environment variable, NOT from the
   individual CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET vars.
   When CLOUDINARY_URL is absent the request arrives at Cloudinary
   with api_key = undefined → "Must supply api_key" 500 error.

   Fix applied: call cloudinary.config() a second time with the
   CLOUDINARY_URL string built from the individual vars so both
   code paths see valid credentials regardless of which one the
   library chooses at runtime.

   .env must contain ALL FOUR of these:
     CLOUDINARY_CLOUD_NAME=…
     CLOUDINARY_API_KEY=…
     CLOUDINARY_API_SECRET=…
     CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
   ============================================================ */
import dotenv from "dotenv";
dotenv.config();
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage }  from "multer-storage-cloudinary";
import multer                 from "multer";

/* ── 1. Configure with individual vars (image path) ── */
cloudinary.config({
    cloud_name : process.env.CLOUDINARY_CLOUD_NAME,
    api_key    : process.env.CLOUDINARY_API_KEY,
    api_secret : process.env.CLOUDINARY_API_SECRET,
});

/* ── 2. Also set CLOUDINARY_URL so the video upload path works ──
   multer-storage-cloudinary falls back to reading process.env.CLOUDINARY_URL
   when it uses the SDK's upload() method (video path).
   If the variable is not already set we build it from the parts. ── */
if (!process.env.CLOUDINARY_URL) {
    process.env.CLOUDINARY_URL =
        `cloudinary://${process.env.CLOUDINARY_API_KEY}` +
        `:${process.env.CLOUDINARY_API_SECRET}` +
        `@${process.env.CLOUDINARY_CLOUD_NAME}`;
}

/* ── Validate credentials at startup ── */
const { cloud_name, api_key, api_secret } = cloudinary.config();
if (!cloud_name || !api_key || !api_secret) {
    console.error(
        "⚠️  Cloudinary credentials missing — check .env for " +
        "CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET"
    );
}

/* ================================================================
   STORAGE FACTORIES
   ================================================================ */

/**
 * makeStorage(folder)
 * For images: resource_type "image", auto-optimised via transformation.
 */
const imageFileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`), false);
  }
};

const videoFileFilter = (req, file, cb) => {
  const allowed = ["video/mp4", "video/webm", "video/quicktime"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Video type not allowed: ${file.mimetype}`), false);
  }
};
const makeStorage = (folder) =>
    new CloudinaryStorage({
        cloudinary,
        params: async (_req, _file) => ({
            folder           : `motopark/${folder}`,
            resource_type    : "image",
            allowed_formats  : ["jpg", "jpeg", "png", "webp", "gif"],
            transformation   : [{ width: 1920, crop: "limit", quality: "auto:good", fetch_format: "auto" }],
        }),
    });

/**
 * makeVideoStorage(folder)
 * For videos: resource_type "video" — no transformation, raw passthrough.
 * Cloudinary handles video transcoding on the delivery side.
 */
const makeVideoStorage = (folder) =>
    new CloudinaryStorage({
        cloudinary,
        params: async (_req, _file) => ({
            folder           : `motopark/${folder}`,
            resource_type    : "video",
            allowed_formats  : ["mp4", "webm", "mov"],
        }),
    });

/* ================================================================
   MULTER INSTANCES
   ================================================================ */

const IMAGE_MAX = 5   * 1024 * 1024;   
const VIDEO_MAX = 100 * 1024 * 1024;  
const PROD_MAX  = 20 * 1024 * 1024;   // 20 MB — product images

export const uploadProducts = multer({
  storage: makeStorage("products"),
  limits: { fileSize: PROD_MAX, files: 20 },
  fileFilter: imageFileFilter,          // ← add
});

export const uploadCarousel = multer({
  storage: makeStorage("carousel"),
  limits: { fileSize: IMAGE_MAX },
  fileFilter: imageFileFilter,          // ← add
});

export const uploadCarouselVideo = multer({
  storage: makeVideoStorage("carousel"),
  limits: { fileSize: VIDEO_MAX },
  fileFilter: videoFileFilter,          // ← add
});

export const uploadLogo = multer({
  storage: makeStorage("logo"),
  limits: { fileSize: IMAGE_MAX },
  fileFilter: imageFileFilter,          // ← add
});

export const uploadMedia = multer({
  storage: makeStorage("media"),
  limits: { fileSize: PROD_MAX },
  fileFilter: imageFileFilter,          // ← add
});

/* ================================================================
   DELETE HELPER
   ================================================================ */

/**
 * deleteFromCloudinary(publicId, resourceType?)
 * Usage:
 *   await deleteFromCloudinary("motopark/carousel/abc123")
 *   await deleteFromCloudinary("motopark/carousel/vid456", "video")
 */
export const deleteFromCloudinary = async (publicId, resourceType = "image") => {
    try {
        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (err) {
        console.error("[Cloudinary] delete error:", err.message);
    }
};

export default cloudinary;