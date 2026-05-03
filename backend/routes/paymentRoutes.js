/**
 * routes/paymentRoutes.js
 *
 * FIXES APPLIED:
 * ─────────────────────────────────────────────────────────────
 * [F1] Optional auth on both routes
 *      Before: fully anonymous — no user context attached at all.
 *      After: optionalAuth extracts userId from token if present.
 *      Guest checkout still works (no token = no problem).
 *      Logged-in users get their ID attached for order linking.
 *
 * [F2] Request body size guard
 *      Before: no limit on items array size in payment routes.
 *      An attacker could send 10,000 items, forcing the controller
 *      to run 10,000 DB lookups to calculate total.
 *      After: items array capped at 50 items (sane cart limit).
 *      Returns 400 immediately without hitting DB.
 *
 * [F3] paymentLimiter already applied in server.js at the
 *      /api/payment prefix (10 req/min per IP).
 *      No need to add it here — documented for clarity.
 *
 * NOTE: Price manipulation is already impossible regardless of auth
 *       because paymentController.js recalculates total from DB prices,
 *       never trusting the frontend-submitted amount.
 */

import express from "express";
import jwt     from "jsonwebtoken";
import { createOrder, verifyPayment } from "../controllers/paymentController.js";

const router = express.Router();

// [F1]: Optional auth — attaches userId if token present, guest-safe if not
const optionalAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(
        auth.split(" ")[1],
        process.env.JWT_SECRET || "motopark_user_secret"
      );
      req.userId = decoded.id;
    } catch { /* invalid/expired token — treat as guest, no error */ }
  }
  next();
};

// [F2]: Items count guard — runs before controller hits DB
const validateItemsCount = (req, res, next) => {
  const { items } = req.body;
  if (items !== undefined) {
    if (!Array.isArray(items)) {
      return res.status(400).json({ message: "items must be an array" });
    }
    if (items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }
    if (items.length > 50) {
      return res.status(400).json({ message: "Cart cannot exceed 50 items" });
    }
  }
  next();
};

// [F3]: paymentLimiter (10 req/min) already applied at /api/payment in server.js

router.post("/create-order", optionalAuth, validateItemsCount, createOrder);
router.post("/verify",       optionalAuth, verifyPayment);

export default router;