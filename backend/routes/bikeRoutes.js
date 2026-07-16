/**
 * routes/bikeRoutes.js — "Shop by Bike" fitment CRUD (Milestone 8).
 *
 * Mirrors categoryRoutes conventions:
 *   [F1] try/catch on every route
 *   [F2] authMiddleware on all writes (POST/PUT/DELETE)
 *   [F3] slug-collision → 409 before insert (no raw 11000)
 *   [F4] ObjectId validation on PUT/DELETE → 400
 *   [F5] .lean() on the public GET
 *
 * A Bike is a make+model pair; makeSlug and the model `slug` are derived here so
 * they always line up with the storefront /bikes/:make/:model URLs.
 */
import express        from "express";
import mongoose       from "mongoose";
import Bike           from "../models/bikeModel.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

const slugify = (s) =>
  String(s || "").toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

/**
 * Flatten text for fitment matching: lowercase, every run of non-alphanumerics
 * becomes a single space. "NS-250 / Tank-Pad" → "ns 250 tank pad". This makes
 * punctuation irrelevant and lets us token-match by padding with spaces.
 */
const normalize = (s) =>
  String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();

/**
 * Which of `bikes` does this product copy name? Pure (no DB) so it can be
 * unit-tested directly — see scripts/ or the Milestone 10 notes.
 *
 * Two ways to match, both on the space-normalized haystack so punctuation and
 * casing can't hide a hit:
 *   1. "make model" adjacent  ("bajaj ns 250")  → strongest signal.
 *   2. model alone            ("himalayan")     → only when the model name isn't
 *      purely numeric. A bare "125" would otherwise match every 125cc product and
 *      wrongly fit a Glamour part to a Pulsar 125.
 *
 * Deliberately conservative: a false positive silently mis-sells fitment, which
 * is worse than making the admin tick one more box.
 */
export const matchBikes = (bikes, { title, description }) => {
  // Cap the scan window — fitment lives in the name/opening lines, not page 4.
  const haystack = normalize(`${title || ""} ${description || ""}`.slice(0, 5000));
  if (!haystack) return [];

  const padded = ` ${haystack} `;

  return bikes.filter((b) => {
    const model = normalize(b.model);
    const make  = normalize(b.make);
    if (!model) return false;

    if (make && padded.includes(` ${make} ${model} `)) return true;   // rule 1
    if (/^\d+$/.test(model)) return false;                            // rule 2 guard
    return padded.includes(` ${model} `);                             // rule 2
  });
};

/* ── GET ALL (public) ── */
router.get("/", async (req, res) => {
  try {
    const bikes = await Bike.find().sort({ make: 1, model: 1 }).lean(); // [F5]
    res.json(bikes);
  } catch (err) {
    res.status(500).json({ message: "Failed to load bikes", error: err.message });
  }
});

/* ── AUTO-DETECT FITMENT (admin) ──
 * POST /api/bikes/auto-detect  { title, description } → { ids, bikes }
 *
 * Suggests bikes named in copy the admin has already typed. A SUGGESTION, not a
 * write — the admin still reviews the selection and saves. Matching rules live in
 * matchBikes() above. [F2]-style: never echoes raw user copy into logs.
 */
router.post("/auto-detect", authMiddleware, async (req, res) => { // [F2]
  try {
    const { title, description } = req.body;
    if (!normalize(`${title || ""} ${description || ""}`)) {
      return res.status(400).json({ message: "Provide a title or description to scan" });
    }

    const bikes   = await Bike.find().select("make makeSlug model slug").lean(); // [F5]
    const matches = matchBikes(bikes, { title, description });

    res.json({
      ids: matches.map((b) => String(b._id)),
      bikes: matches,
    });
  } catch (err) {
    res.status(500).json({ message: "Auto-detect failed", error: err.message });
  }
});

/* ── CREATE (admin) ── */
router.post("/", authMiddleware, async (req, res) => { // [F2]
  try {
    const { make, model } = req.body;
    if (!make?.trim() || !model?.trim()) {
      return res.status(400).json({ message: "Both make and model are required" });
    }

    const makeSlug = slugify(make);
    const slug     = slugify(model);
    if (!makeSlug || !slug) {
      return res.status(400).json({ message: "Make and model must contain letters or numbers" });
    }

    // [F3]: reject duplicate (make, model) before hitting the unique index
    const existing = await Bike.findOne({ makeSlug, slug }).lean();
    if (existing) {
      return res.status(409).json({ message: `${make.trim()} ${model.trim()} already exists` });
    }

    const bike = await Bike.create({ make: make.trim(), makeSlug, model: model.trim(), slug });
    res.status(201).json(bike);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "That make and model already exists" });
    }
    res.status(500).json({ message: "Failed to create bike", error: err.message });
  }
});

/* ── UPDATE (admin) ── */
router.put("/:id", authMiddleware, async (req, res) => { // [F2]
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) { // [F4]
      return res.status(400).json({ message: "Invalid bike ID" });
    }

    const { make, model } = req.body;
    const updateData = {};
    if (make?.trim())  { updateData.make  = make.trim();  updateData.makeSlug = slugify(make); }
    if (model?.trim()) { updateData.model = model.trim(); updateData.slug     = slugify(model); }

    // If either slug changed, guard the (makeSlug, slug) uniqueness ourselves so
    // the client gets a clean 409 instead of a raw duplicate-key 500.
    if (updateData.makeSlug || updateData.slug) {
      const current = await Bike.findById(req.params.id).lean();
      if (!current) return res.status(404).json({ message: "Bike not found" });
      const makeSlug = updateData.makeSlug ?? current.makeSlug;
      const slug     = updateData.slug     ?? current.slug;
      const clash = await Bike.findOne({ makeSlug, slug, _id: { $ne: req.params.id } }).lean();
      if (clash) {
        return res.status(409).json({ message: "That make and model already exists" });
      }
    }

    const updated = await Bike.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ message: "Bike not found" });
    res.json(updated);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "That make and model already exists" });
    }
    res.status(500).json({ message: "Failed to update bike", error: err.message });
  }
});

/* ── DELETE (admin) ── */
router.delete("/:id", authMiddleware, async (req, res) => { // [F2]
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) { // [F4]
      return res.status(400).json({ message: "Invalid bike ID" });
    }
    const deleted = await Bike.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Bike not found" });
    res.json({ message: "Bike deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete bike", error: err.message });
  }
});

export default router;
