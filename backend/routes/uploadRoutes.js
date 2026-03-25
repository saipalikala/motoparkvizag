/* ================================================
   File: backend/routes/uploadRoutes.js
   All uploads now go to Cloudinary.
   ================================================ */
import express from "express";
import {
  uploadProducts,
  uploadCarousel,
  uploadLogo,
  uploadIcons,
  uploadMedia,
} from "../config/cloudinary.js";

const router = express.Router();

/* ── PRODUCT IMAGES ── */
router.post("/products", uploadProducts.any(), (req, res) => {
  try {
    if (!req.files?.length) return res.status(400).json({ message: "No files uploaded" });
    const urls = req.files.map(f => f.path); // Cloudinary returns full URL in f.path
    res.json({ urls, url: urls[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ── CAROUSEL IMAGE ── */
router.post("/carousel", uploadCarousel.single("carousel"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    res.json({ url: req.file.path });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ── NAVBAR LOGO ── */
router.post("/logo", uploadLogo.single("logo"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    res.json({ url: req.file.path });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ── NAVBAR ICONS ── */
router.post("/icon", uploadIcons.single("icon"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    res.json({ url: req.file.path });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ── MEDIA LIBRARY ── */
router.post("/media", uploadMedia.array("media", 10), (req, res) => {
  try {
    if (!req.files?.length) return res.status(400).json({ message: "No files uploaded" });
    const files = req.files.map(f => ({
      url: f.path,
      publicId: f.filename,
      name: f.originalname,
    }));
    res.json({ files, url: files[0]?.url });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;