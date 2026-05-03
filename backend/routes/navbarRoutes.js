/**
 * routes/navbarRoutes.js
 *
 * FIXES APPLIED:
 * ─────────────────────────────────────────────────────────────
 * [F1] try/catch on all routes
 *      Before: unhandled promise rejections on DB errors.
 *
 * [F2] Auth guard on write routes
 *      Before: PUT /api/navbar had no auth — anyone could change
 *      the logo and nav links with a direct API call.
 *      After: authMiddleware on POST and PUT.
 *
 * [F3] .lean() on GET
 *      Read-only, no need for Mongoose document methods.
 *
 * [F4] POST removed (redundant)
 *      The PUT with upsert:true already handles create-or-update.
 *      A separate POST route created duplicate documents when
 *      called accidentally. Removed to prevent data corruption.
 */

import express        from "express";
import Navbar         from "../models/navbarModel.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

/* ── GET NAVBAR (public) ── */
router.get("/", async (req, res) => {
  try {
    const navbar = await Navbar.findOne().lean(); // [F3]
    res.json(navbar || {});
  } catch (err) {
    res.status(500).json({ message: "Failed to load navbar", error: err.message });
  }
});

/* ── UPDATE NAVBAR (admin only) ── */
// [F4]: upsert handles both create and update — no separate POST needed
router.put("/", authMiddleware, async (req, res) => { // [F2]
  try {
    const { logo, links, icons } = req.body;

    const navbar = await Navbar.findOneAndUpdate(
      {},
      { logo, links, icons },
      { new: true, upsert: true, runValidators: true }
    );

    res.json(navbar);
  } catch (err) {
    res.status(500).json({ message: "Failed to update navbar", error: err.message });
  }
});

export default router;