/**
 * routes/categoryRoutes.js
 *
 * FIXES APPLIED:
 * ─────────────────────────────────────────────────────────────
 * [F1] try/catch on ALL routes
 *      Before: no error handling on any route. DB errors crashed silently.
 *
 * [F2] Auth guard on write routes
 *      Before: anyone could create/update/delete categories.
 *      After: authMiddleware on POST, PUT, DELETE.
 *
 * [F3] Slug collision handling
 *      Before: slug was built from name but no uniqueness check before save.
 *      A duplicate name caused an unhandled MongoServerError (code 11000).
 *      After: explicit duplicate check returns 409 with a clear message.
 *
 * [F4] ObjectId validation on PUT/DELETE
 *      Before: invalid :id caused Mongoose CastError → 500.
 *      After: 400 with clear message.
 *
 * [F5] .lean() on GET
 */

import express        from "express";
import Category       from "../models/categoryModel.js";
import authMiddleware from "../middleware/authMiddleware.js";
import mongoose       from "mongoose";

const router = express.Router();

/* ── GET ALL (public) ── */
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 }).lean(); // [F5]
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: "Failed to load categories", error: err.message });
  }
});

/* ── CREATE (admin) ── */
router.post("/", authMiddleware, async (req, res) => { // [F2]
  try {
    const { name, image, description } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const slug = name.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    // [F3]: check for slug collision before attempting insert
    const existing = await Category.findOne({ slug }).lean();
    if (existing) {
      return res.status(409).json({ message: `Category "${name}" already exists` });
    }

    const category = await Category.create({ name: name.trim(), slug, image, description });
    res.status(201).json(category);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Category already exists" });
    }
    res.status(500).json({ message: "Failed to create category", error: err.message });
  }
});

/* ── UPDATE (admin) ── */
router.put("/:id", authMiddleware, async (req, res) => { // [F2]
  try {
    // [F4]: validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid category ID" });
    }

    const { name, image, description } = req.body;
    const updateData = {};
    if (name)        { updateData.name = name.trim(); updateData.slug = name.toLowerCase().trim().replace(/\s+/g, "-"); }
    if (image)        updateData.image       = image;
    if (description !== undefined) updateData.description = description;

    const updated = await Category.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ message: "Category not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to update category", error: err.message });
  }
});

/* ── DELETE (admin) ── */
router.delete("/:id", authMiddleware, async (req, res) => { // [F2]
  try {
    // [F4]: validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid category ID" });
    }

    const deleted = await Category.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Category not found" });
    res.json({ message: "Category deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete category", error: err.message });
  }
});

export default router;