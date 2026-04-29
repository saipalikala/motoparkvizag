/* ============================================================
   backend/routes/uploadRoutes.js
   ============================================================

   All uploads → Cloudinary via multer-storage-cloudinary.

   CRITICAL PATTERN: every multer middleware is wrapped in its
   own callback so errors from multer *and* from Cloudinary are
   caught and returned as structured JSON instead of crashing the
   process.  The bare router.post(path, multer.single(), handler)
   pattern does NOT catch multer errors — they fall through to the
   global error handler as un-serialisable objects, which is why
   the terminal showed:
       🔴 UNHANDLED ERROR: undefined
   ============================================================ */

import express from "express";
import {
    uploadProducts,
    uploadCarousel,
    uploadCarouselVideo,
    uploadLogo,
    uploadMedia,
} from "../config/cloudinary.js";

const router = express.Router();

/* ── run multer, catch all errors (multer + Cloudinary) ── */
const runMulter = (multerMiddleware, req, res) =>
    new Promise((resolve, reject) => {
        multerMiddleware(req, res, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });

/* ── normalise multer / Cloudinary error → readable string ── */
const errMsg = (err) => {
    if (err?.error?.message)              return err.error.message;           // Cloudinary plain object
    if (typeof err === "string")          return err;
    if (err?.message)                     return err.message;                  // JS Error
    if (err?.code === "LIMIT_FILE_SIZE")  return "File exceeds the size limit.";
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

/* ── CAROUSEL IMAGE  (field: "carousel", limit: 1 MB) ── */
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

/* ── CAROUSEL VIDEO  (field: "carousel_video", limit: 5 MB) ── */
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

/* ── ICON ── */
router.post("/icon", async (req, res) => {
    try {
        await runMulter(uploadIcons.single("icon"), req, res);
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