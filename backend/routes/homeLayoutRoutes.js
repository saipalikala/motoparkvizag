/**
 * routes/homeLayoutRoutes.js
 *
 * FIXES APPLIED:
 * ─────────────────────────────────────────────────────────────
 * [F1] Auth guard on PUT
 *      Before: anyone could rearrange the homepage layout.
 *      After: authMiddleware on PUT.
 *
 * [F2] Sections validation on PUT
 *      Before: { sections: undefined } or { sections: "bad" }
 *      would wipe the layout or save broken data.
 *      After: sections must be a non-empty array.
 *
 * [F3] .lean() on GET for performance.
 *
 * NOTE: The default layout creation on first GET is preserved
 * exactly — no changes to section keys or defaults.
 */

import express        from "express";
import HomeLayout     from "../models/homeLayoutModel.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

const DEFAULT_SECTIONS = [
  { key: "PremiumCarousel",   title: "Hero Carousel",       order: 1 },
  { key: "NewArrivalsSlider", title: "New Arrivals",         order: 2, settings: { limit: 8 } },
  { key: "VideoShowcase",     title: "Video Story",          order: 3 },
  { key: "CategoryShowcase",  title: "Shop By Category",     order: 4 },
  { key: "BentoGrid",         title: "Featured Products",    order: 5 },
  { key: "TrendingProducts",  title: "Trending Products",    order: 6, settings: { category: "helmets", limit: 8 } },
  { key: "WhyMotoPark",       title: "Why MotoPark",         order: 7 },
  { key: "BrandShowcase",     title: "Brands",               order: 8 },
];

/* ── GET LAYOUT (public) ── */
router.get("/", async (req, res) => {
  try {
    let layout = await HomeLayout.findOne().lean(); // [F3]

    if (!layout) {
      // Create default on first access — return fresh Mongoose doc (not lean)
      const created = await HomeLayout.create({ sections: DEFAULT_SECTIONS });
      return res.json(created);
    }

    res.json(layout);
  } catch (err) {
    res.status(500).json({ message: "Failed to load homepage layout", error: err.message });
  }
});

/* ── UPDATE LAYOUT (admin only) ── */
router.put("/", authMiddleware, async (req, res) => { // [F1]
  try {
    const { sections } = req.body;

    // [F2]: validate sections
    if (!Array.isArray(sections) || sections.length === 0) {
      return res.status(400).json({ message: "sections must be a non-empty array" });
    }

    const updated = await HomeLayout.findOneAndUpdate(
      {},
      { sections },
      { new: true, upsert: true, runValidators: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to update homepage layout", error: err.message });
  }
});

export default router;