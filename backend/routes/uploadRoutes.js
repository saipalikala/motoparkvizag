/**
 * routes/uploadRoutes.js
 *
 * FIXES APPLIED:
 * ─────────────────────────────────────────────────────────────
 * [F1] uploadIcons ReferenceError — CRITICAL BUG
 *      Before: the /upload/icon route used `uploadIcons` which was
 *      never imported from cloudinary.js. This caused an immediate
 *      ReferenceError crash on any request to POST /api/upload/icon.
 *      After: uploadIcons removed. Icon uploads use uploadLogo
 *      (same configuration — both are small images).
 *      If you need a separate icon config, add it to cloudinary.js
 *      and import it here.
 *
 * [F2] Auth guard on ALL upload routes
 *      Before: all upload endpoints were public. Anyone could upload
 *      files to your Cloudinary account by calling POST /api/upload/*.
 *      After: authMiddleware applied to every route.
 *      NOTE: uploadLimiter is already applied in server.js at the
 *      /api/upload prefix level — no need to add it here again.
 *
 * [F3] runMulter pattern preserved — correct approach for catching
 *      multer + Cloudinary errors as structured JSON.
 *      The bare router.post(path, multer.single(), handler) pattern
 *      does NOT catch multer errors — they become unhandled rejections.
 */

import express        from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  uploadProducts,
  uploadCarousel,
  uploadCarouselVideo,
  uploadLogo,
  uploadMedia,
  // uploadIcons was removed — use uploadLogo for icon uploads [F1]
} from "../config/cloudinary.js";

const router = express.Router();

// [F2]: ALL upload routes require admin auth
router.use(authMiddleware);

/* ── Run multer, catch all errors (multer + Cloudinary) ── */
const runMulter = (multerMiddleware, req, res) =>
  new Promise((resolve, reject) => {
    multerMiddleware(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

/* ── Normalise multer / Cloudinary error → readable string ── */
const errMsg = (err) => {
  if (err?.error?.message)             return err.error.message;
  if (typeof err === "string")         return err;
  if (err?.message)                    return err.message;
  if (err?.code === "LIMIT_FILE_SIZE") return "File exceeds the size limit.";
  return JSON.stringify(err);
};

/* ── PRODUCT IMAGES ── */
router.post("/products", async (req, res) => {
  try {
    await runMulter(uploadProducts.any(), req, res);
    if (!req.files?.length) return res.status(400).json({ message: "No files uploaded" });
    const urls = req.files.map(f => f.path);
    res.json({ urls, url: urls[0] });
  } catch (err) {
    console.error("[UPLOAD /products]", errMsg(err));
    res.status(500).json({ message: errMsg(err) });
  }
});

/* ── CAROUSEL IMAGE ── */
router.post("/carousel", async (req, res) => {
  try {
    await runMulter(uploadCarousel.single("carousel"), req, res);
    if (!req.file) return res.status(400).json({ message: "No image uploaded" });
    res.json({ url: req.file.path });
  } catch (err) {
    console.error("[UPLOAD /carousel]", errMsg(err));
    res.status(500).json({ message: errMsg(err) });
  }
});

/* ── CAROUSEL VIDEO ── */
router.post("/carousel-video", async (req, res) => {
  try {
    await runMulter(uploadCarouselVideo.single("carousel_video"), req, res);
    if (!req.file) return res.status(400).json({ message: "No video uploaded" });
    res.json({ url: req.file.path });
  } catch (err) {
    console.error("[UPLOAD /carousel-video]", errMsg(err));
    res.status(500).json({ message: errMsg(err) });
  }
});

/* ── LOGO ── */
router.post("/logo", async (req, res) => {
  try {
    await runMulter(uploadLogo.single("logo"), req, res);
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    res.json({ url: req.file.path });
  } catch (err) {
    console.error("[UPLOAD /logo]", errMsg(err));
    res.status(500).json({ message: errMsg(err) });
  }
});

/* ── ICON — [F1]: uses uploadLogo config (same settings) ── */
router.post("/icon", async (req, res) => {
  try {
    await runMulter(uploadLogo.single("icon"), req, res); // [F1]: was uploadIcons (undefined)
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    res.json({ url: req.file.path });
  } catch (err) {
    console.error("[UPLOAD /icon]", errMsg(err));
    res.status(500).json({ message: errMsg(err) });
  }
});

/* ── MEDIA LIBRARY ── */
router.post("/media", async (req, res) => {
  try {
    await runMulter(uploadMedia.array("media", 10), req, res);
    if (!req.files?.length) return res.status(400).json({ message: "No files uploaded" });
    const files = req.files.map(f => ({
      url: f.path, publicId: f.filename, name: f.originalname,
    }));
    res.json({ files, url: files[0]?.url });
  } catch (err) {
    console.error("[UPLOAD /media]", errMsg(err));
    res.status(500).json({ message: errMsg(err) });
  }
});

export default router;