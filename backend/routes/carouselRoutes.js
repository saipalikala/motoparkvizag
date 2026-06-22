/**
 * routes/carouselRoutes.js
 *
 * Premium carousel: image-only, desktopImage + mobileImage per slide.
 * Backward compat: if desktopImage is absent on a stored doc, legacy `image`
 * field is returned as desktopImage so old slides still render.
 */

import express        from "express";
import Carousel       from "../models/carouselModel.js";
import authMiddleware from "../middleware/authMiddleware.js";
import mongoose       from "mongoose";

const router = express.Router();

/**
 * Normalise a raw Mongoose lean doc for the API response.
 * Ensures desktopImage is always present (falls back to legacy `image`).
 * mobileImage falls back to desktopImage when absent.
 */
const normalise = (doc) => {
  const desktopImage = doc.desktopImage || doc.image || "";
  const mobileImage  = doc.mobileImage  || desktopImage;
  return { ...doc, desktopImage, mobileImage };
};

/* ── GET ALL ACTIVE SLIDES (public) ── */
/* ?source=premium (default) or ?source=vertical */
router.get("/", async (req, res) => {
  try {
const source = req.query.source === "vertical" ? "vertical" : "premium";
    const slides = await Carousel.find({
      active: true,
      $or: [{ source }, { source: { $exists: false } }, { source: "" }],
    })
      .sort({ order: 1, createdAt: 1 })
      .lean();
    res.json(slides.map(normalise));
  } catch (err) {
    res.status(500).json({ message: "Failed to load carousel", error: err.message });
  }
});

/* ── CREATE SLIDE (admin only) ── */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      title, subtitle, desktopImage, mobileImage,
      route, cta, order, active, source,
    } = req.body;

    if (!desktopImage?.trim()) {
      return res.status(400).json({ message: "Desktop image URL is required" });
    }

const resolvedSource  = source === "vertical" ? "vertical" : "premium";
    const resolvedMobile  = mobileImage?.trim() || desktopImage?.trim() || "";

    const slide = new Carousel({
      title, subtitle, desktopImage: desktopImage.trim(),
      mobileImage: resolvedMobile, route, cta, order, active,
      source: resolvedSource,
    });
    await slide.save();
    res.status(201).json(normalise(slide.toObject()));
  } catch (err) {
    res.status(500).json({ message: "Failed to create slide", error: err.message });
  }
});

/* ── UPDATE SLIDE (admin only) ── */
router.put("/:id", authMiddleware, async (req, res) => {

  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid slide ID" });
    }

    const {
      title, subtitle, desktopImage, mobileImage,
      route, cta, order, active, source,
    } = req.body;

    const resolvedSource = source === "vertical" ? "vertical" : "premium";
    const resolvedDesktop = desktopImage?.trim() || "";
    const resolvedMobile  = mobileImage?.trim()  || resolvedDesktop;

/* Build update payload — only include image fields when explicitly provided
       so a PUT that omits desktopImage never clears an existing Cloudinary URL */
    const updateFields = {
      title, subtitle, route, cta, order, active,
      source: resolvedSource,
    };
if (resolvedDesktop) {
      updateFields.desktopImage = resolvedDesktop;
      updateFields.image        = resolvedDesktop; // keep legacy field in sync
    }
    if (resolvedMobile) updateFields.mobileImage = resolvedMobile;
    // Stamp source on legacy docs that never had it
    if (!updateFields.source) updateFields.source = resolvedSource;

console.log("========== CAROUSEL UPDATE ==========");
console.log("ID:", req.params.id);
console.log("BODY:", req.body);
console.log("DESKTOP:", req.body.desktopImage);
console.log("MOBILE:", req.body.mobileImage);
console.log("UPDATE FIELDS:", updateFields);
const updated = await Carousel.findByIdAndUpdate(
  req.params.id,
  { $set: updateFields },
  { new: true, runValidators: true }
);

console.log("UPDATED DOC:", updated);
    if (!updated) return res.status(404).json({ message: "Slide not found" });
    res.json(normalise(updated.toObject()));
  } catch (err) {
    res.status(500).json({ message: "Failed to update slide", error: err.message });
  }
});


/* ── DELETE SLIDE (admin only) ── */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
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