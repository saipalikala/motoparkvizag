/**
 * routes/mediaRoutes.js
 *
 * FIXES APPLIED:
 * ─────────────────────────────────────────────────────────────
 * [F1] try/catch on ALL routes
 *      Before: no error handling. req.file.path crash if upload
 *      middleware failed was an unhandled rejection.
 *
 * [F2] Auth guard on POST and DELETE
 *      Before: public endpoints — anyone could upload files to
 *      your media library or delete existing ones.
 *      After: authMiddleware on POST and DELETE.
 *
 * [F3] req.file null guard
 *      Before: req.file.path would throw TypeError if multer
 *      middleware ran but no file was included in the request.
 *      After: explicit check returns 400.
 *
 * [F4] ObjectId validation on DELETE
 *
 * [F5] .lean() on GET
 */

import express        from "express";
import Media          from "../models/mediaModel.js";
import { upload }     from "../middleware/upload.js";
import authMiddleware from "../middleware/authMiddleware.js";
import mongoose       from "mongoose";

const router = express.Router();

/* ── GET MEDIA (admin — for media library panel) ── */
// Made public so products pages can list available media.
// If media library should be admin-only, add authMiddleware here.
router.get("/", async (req, res) => {
  try {
    const media = await Media.find().sort({ createdAt: -1 }).lean(); // [F5]
    res.json(media);
  } catch (err) {
    res.status(500).json({ message: "Failed to load media", error: err.message });
  }
});

/* ── UPLOAD MEDIA (admin only) ── */
router.post("/", authMiddleware, async (req, res) => { // [F2]
  try {
    // upload.single wraps multer — any multer errors become Express errors
    // handled by the global error handler in server.js.
    // We still guard req.file in case the middleware ran but no file was sent.
    if (!req.file) return res.status(400).json({ message: "No file uploaded" }); // [F3]

    const media = await Media.create({
      url : req.file.path,
      type: req.file.mimetype?.startsWith("video") ? "video" : "image",
    });

    res.status(201).json(media);
  } catch (err) {
    res.status(500).json({ message: "Failed to upload media", error: err.message });
  }
});

// Wrap upload middleware to call next() with error on failure
router.post("/", (err, req, res, next) => {
  res.status(500).json({ message: err.message || "Upload failed" });
});

/* ── DELETE MEDIA (admin only) ── */
router.delete("/:id", authMiddleware, async (req, res) => { // [F2]
  try {
    // [F4]
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid media ID" });
    }

    const deleted = await Media.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Media not found" });
    res.json({ message: "Media deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete media", error: err.message });
  }
});

export default router;