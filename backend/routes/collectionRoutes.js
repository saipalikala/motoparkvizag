/**
 * routes/collectionRoutes.js
 *
 * FIXES APPLIED:
 * ─────────────────────────────────────────────────────────────
 * [F1] try/catch on ALL routes
 *      Before: no error handling. DB errors crashed silently.
 *
 * [F2] Auth guard on write routes
 *      Before: anyone could create/update/delete collections.
 *      After: authMiddleware on POST, PUT, DELETE.
 *
 * [F3] .lean() on GET
 *      populate() still works with lean() — returns plain objects.
 *      Faster than Mongoose documents for read-only responses.
 *
 * [F4] ObjectId validation on PUT/DELETE
 *      Before: invalid :id caused Mongoose CastError → 500.
 *      After: 400 with clear message.
 *
 * [F5] Slug collision check on POST
 *      Before: duplicate slug → unhandled MongoServerError 11000.
 *      After: explicit 409 with clear message.
 */

import express        from "express";
import Collection     from "../models/collectionModel.js";
import authMiddleware from "../middleware/authMiddleware.js";
import mongoose       from "mongoose";

const router = express.Router();

/* ── GET ALL (public) ── */
router.get("/", async (req, res) => {
  try {
    const collections = await Collection
      .find()
      .populate("products")
      .lean(); // [F3]
    res.json(collections);
  } catch (err) {
    res.status(500).json({ message: "Failed to load collections", error: err.message });
  }
});

/* ── CREATE (admin) ── */
router.post("/", authMiddleware, async (req, res) => { // [F2]
  try {
    const { name, slug } = req.body;

    if (!name?.trim()) return res.status(400).json({ message: "Collection name is required" });
    if (!slug?.trim()) return res.status(400).json({ message: "Collection slug is required" });

    // [F5]: check slug uniqueness before insert
    const existing = await Collection.findOne({ slug: slug.trim() }).lean();
    if (existing) return res.status(409).json({ message: `Collection with slug "${slug}" already exists` });

    const collection = await Collection.create({ name: name.trim(), slug: slug.trim() });
    res.status(201).json(collection);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Collection already exists" });
    }
    res.status(500).json({ message: "Failed to create collection", error: err.message });
  }
});

/* ── UPDATE (admin) ── */
router.put("/:id", authMiddleware, async (req, res) => { // [F2]
  try {
    // [F4]
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid collection ID" });
    }

    const { name, slug, products } = req.body;
    const updateData = {};
    if (name     !== undefined) updateData.name     = name;
    if (slug     !== undefined) updateData.slug     = slug;
    if (products !== undefined) updateData.products = products;

    const updated = await Collection.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ message: "Collection not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to update collection", error: err.message });
  }
});

/* ── DELETE (admin) ── */
router.delete("/:id", authMiddleware, async (req, res) => { // [F2]
  try {
    // [F4]
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid collection ID" });
    }

    const deleted = await Collection.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Collection not found" });
    res.json({ message: "Collection deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete collection", error: err.message });
  }
});

export default router;