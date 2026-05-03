/**
 * routes/videoShowcaseRoutes.js
 *
 * FIXES APPLIED:
 * ─────────────────────────────────────────────────────────────
 * [F1] Auth guard on POST
 *      Before: anyone could overwrite all video showcase slides.
 *      After: authMiddleware on POST.
 *
 * [F2] Slides validation
 *      Before: any non-array body was rejected with a 400, but
 *      an empty array [] would silently wipe all slides.
 *      After: empty array returns 400 with a clear message.
 *
 * [F3] .lean() on GET
 *
 * [F4] Per-slide sanitization
 *      Before: raw slides array from request body written directly
 *      to DB. An attacker could inject extra fields.
 *      After: only known slide fields are saved.
 */

import express              from "express";
import VideoShowcaseConfig  from "../models/videoShowcaseModel.js";
import authMiddleware       from "../middleware/authMiddleware.js";

const router = express.Router();

/* ── GET SLIDES (public) ── */
router.get("/", async (req, res) => {
  try {
    const config = await VideoShowcaseConfig.findOne().lean(); // [F3]
    res.json(config ? config.slides : []);
  } catch (err) {
    res.status(500).json({ message: "Failed to load video showcase config", error: err.message });
  }
});

/* ── SAVE SLIDES (admin only) ── */
router.post("/", authMiddleware, async (req, res) => { // [F1]
  try {
    const rawSlides = req.body;

    if (!Array.isArray(rawSlides)) {
      return res.status(400).json({ message: "Expected array of slides" });
    }

    // [F2]: prevent accidental data wipe
    if (rawSlides.length === 0) {
      return res.status(400).json({ message: "Cannot save empty slides array. Send at least one slide." });
    }

    // [F4]: whitelist known fields — don't persist arbitrary injected keys
    const slides = rawSlides.map((s, i) => ({
      id         : typeof s.id === "number" ? s.id : i,
      src        : String(s.src        || ""),
      poster     : String(s.poster     || ""),
      tag        : String(s.tag        || ""),
      lines      : Array.isArray(s.lines) ? s.lines.map(String) : [],
      sub        : String(s.sub        || ""),
      accent     : String(s.accent     || "#ffffff"),
      cta        : String(s.cta        || ""),
      buyNowLink : String(s.buyNowLink  || "/products"),
      exploreLink: String(s.exploreLink || "/store"),
    }));

    const config = await VideoShowcaseConfig.findOneAndUpdate(
      {},
      { slides },
      { returnDocument: "after", upsert: true }
    );

    res.json({ ok: true, count: config.slides.length });
  } catch (err) {
    res.status(500).json({ message: "Failed to save video showcase config", error: err.message });
  }
});

export default router;