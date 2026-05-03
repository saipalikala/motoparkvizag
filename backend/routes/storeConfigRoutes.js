/**
 * routes/storeConfigRoutes.js
 *
 * FIXES APPLIED:
 * ─────────────────────────────────────────────────────────────
 * [F1] try/catch on all routes
 *      Before: no error handling. DB errors surfaced as 500s with
 *      no JSON body — crashing the frontend config context.
 *
 * [F2] Auth guard on PUT
 *      Before: anyone could change store settings (currency,
 *      showOutOfStock, filters, navbar) with a direct API call.
 *      After: authMiddleware on PUT.
 *
 * [F3] Whitelist body fields on PUT
 *      Before: Object.assign(config, req.body) — an attacker
 *      could inject arbitrary fields into the config document.
 *      After: only known fields are merged.
 *
 * [F4] .lean() on GET
 */

import express        from "express";
import StoreConfig    from "../models/storeConfigModel.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

/* ── GET CONFIG (public) ── */
router.get("/", async (req, res) => {
  try {
    let config = await StoreConfig.findOne().lean(); // [F4]
    if (!config) {
      // Create default config on first access
      const created = await StoreConfig.create({});
      config = created.toObject();
    }
    res.json(config);
  } catch (err) {
    res.status(500).json({ message: "Failed to load store config", error: err.message });
  }
});

/* ── UPDATE CONFIG (admin only) ── */
router.put("/", authMiddleware, async (req, res) => { // [F2]
  try {
    // [F3]: only merge known fields — no prototype pollution
    const { filters, navbar, settings } = req.body;
    const updateData = {};
    if (filters  !== undefined) updateData.filters  = filters;
    if (navbar   !== undefined) updateData.navbar   = navbar;
    if (settings !== undefined) updateData.settings = settings;

    let config = await StoreConfig.findOne();
    if (!config) {
      config = new StoreConfig(updateData);
    } else {
      Object.assign(config, updateData);
    }

    await config.save();
    res.json(config);
  } catch (err) {
    res.status(500).json({ message: "Failed to update store config", error: err.message });
  }
});

export default router;