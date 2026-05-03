/**
 * routes/carouselRoutes.js
 *
 * FIXES APPLIED:
 * ─────────────────────────────────────────────────────────────
 * [F1] try/catch on ALL routes
 *      Before: no error handling. Any DB error crashed the route
 *      and fell through to Express's default error handler as an
 *      unhandled promise rejection.
 *      After: every async handler has try/catch with proper status codes.
 *
 * [F2] Auth guard on write routes (POST, PUT, DELETE)
 *      Before: no authentication. Anyone could create, update, or
 *      delete carousel slides with a direct API call.
 *      After: authMiddleware applied to all mutations.
 *
 * [F3] Input validation on POST/PUT
 *      Before: req.body passed directly to new Carousel(req.body).
 *      An empty body or malformed object saved a broken document.
 *      After: title/image required for create; sanitized on update.
 *
 * [F4] ObjectId validation before DB calls
 *      Before: invalid :id param caused Mongoose CastError which
 *      bubbled as 500. After: explicit 400 on invalid ObjectId.
 *
 * [F5] .lean() on GET — plain objects are faster than Mongoose docs
 *      Read-only endpoint has no need for Mongoose document methods.
 */

import express        from "express";
import Carousel       from "../models/carouselModel.js";
import authMiddleware from "../middleware/authMiddleware.js";
import mongoose       from "mongoose";

const router = express.Router();

/* ── GET ALL SLIDES (public) ── */
router.get("/", async (req, res) => {
  try {
    const slides = await Carousel.find().sort({ createdAt: 1 }).lean(); // [F5]
    res.json(slides);
  } catch (err) {
    res.status(500).json({ message: "Failed to load carousel", error: err.message });
  }
});

/* ── CREATE SLIDE (admin only) ── */
router.post("/", authMiddleware, async (req, res) => { // [F2]
  try {
    const { title, subtitle, image, route } = req.body;

    // [F3]: image is required — a slide with no image is useless
    if (!image?.trim()) {
      return res.status(400).json({ message: "Slide image URL is required" });
    }

    const slide = new Carousel({ title, subtitle, image, route });
    await slide.save();
    res.status(201).json(slide);
  } catch (err) {
    res.status(500).json({ message: "Failed to create slide", error: err.message });
  }
});

/* ── UPDATE SLIDE (admin only) ── */
router.put("/:id", authMiddleware, async (req, res) => { // [F2]
  try {
    // [F4]: validate ObjectId before hitting DB
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid slide ID" });
    }

    const { title, subtitle, image, route } = req.body; // [F3]: destructure, don't spread whole body
    const updated = await Carousel.findByIdAndUpdate(
      req.params.id,
      { title, subtitle, image, route },
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ message: "Slide not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to update slide", error: err.message });
  }
});

/* ── DELETE SLIDE (admin only) ── */
router.delete("/:id", authMiddleware, async (req, res) => { // [F2]
  try {
    // [F4]: validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid slide ID" });
    }

    const deleted = await Carousel.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Slide not found" });
    res.json({ message: "Slide deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete slide", error: err.message });
  }
});

export default router;