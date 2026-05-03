/**
 * routes/offerRoutes.js
 *
 * FIXES APPLIED:
 * ─────────────────────────────────────────────────────────────
 * [F1] Auth guard on write routes
 *      Before: anyone could create or delete offers.
 *      After: authMiddleware on POST and DELETE.
 *      (The controller functions themselves are unchanged —
 *       they already have try/catch and clearHomeCache.)
 *
 * [F2] ObjectId validation on DELETE
 *      Before: invalid :id → Mongoose CastError → 500.
 *      After: 400 with clear message before hitting DB.
 */

import express        from "express";
import mongoose       from "mongoose";
import { getOffers, createOffer, deleteOffer } from "../controllers/offerController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

/* ── GET OFFERS (public) ── */
router.get("/", getOffers);

/* ── CREATE OFFER (admin only) ── */
router.post("/", authMiddleware, createOffer); // [F1]

/* ── DELETE OFFER (admin only) ── */
router.delete("/:id", authMiddleware, async (req, res, next) => { // [F1] + [F2]
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "Invalid offer ID" });
  }
  return deleteOffer(req, res, next);
});

export default router;