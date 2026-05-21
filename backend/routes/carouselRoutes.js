/**
 * routes/carouselRoutes.js
 */

import express        from "express";
import Carousel       from "../models/carouselModel.js";
import authMiddleware from "../middleware/authMiddleware.js";
import mongoose       from "mongoose";

const router = express.Router();

/* ── GET ALL ACTIVE SLIDES (public) ── */
router.get("/", async (req, res) => {
  try {
    const slides = await Carousel.find({ active: true })
      .sort({ order: 1, createdAt: 1 })
      .lean();
    res.json(slides);
  } catch (err) {
    res.status(500).json({ message: "Failed to load carousel", error: err.message });
  }
});

/* ── CREATE SLIDE (admin only) ── */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { title, subtitle, image, video, poster, route, order, active } = req.body;

    if (!image?.trim()) {
      return res.status(400).json({ message: "Slide image URL is required" });
    }

    const slide = new Carousel({ title, subtitle, image, video, poster, route, order, active });
    await slide.save();
    res.status(201).json(slide);
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

    const { title, subtitle, image, video, poster, route, order, active } = req.body;
    const updated = await Carousel.findByIdAndUpdate(
      req.params.id,
      { title, subtitle, image, video, poster, route, order, active },
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ message: "Slide not found" });
    res.json(updated);
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