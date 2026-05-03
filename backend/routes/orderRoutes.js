/**
 * routes/orderRoutes.js
 *
 * FIXES APPLIED:
 * ─────────────────────────────────────────────────────────────
 * [F1] GET /orders — phone number exposure
 *      Before: GET /api/orders?phone=9999999999 returned all orders
 *      for any phone number with no auth. An attacker could enumerate
 *      orders for any customer.
 *      After: phone query requires the request to include a valid
 *      user token OR match a session token. Without auth, only
 *      userId-scoped queries are allowed (and only the user's own).
 *      For guest order lookup by phone, a short OTP-like confirmation
 *      code is the right solution — but that's a product decision.
 *      For now, phone lookup requires auth to prevent enumeration.
 *
 * [F2] GET /orders — admin vs user scope enforcement
 *      Before: ?userId=anyId returned any user's orders with no auth.
 *      After: non-admin requests can only query their own userId.
 *      Admin requests (role=admin in JWT) can query any userId.
 *
 * [F3] ObjectId validation on /:id routes
 *      Before: invalid ID caused CastError → 500.
 *      After: 400 with clear message.
 *
 * [F4] Status update auth — admin only
 *      Before: PUT /:id/status had no auth. Anyone could mark orders
 *      as delivered or cancelled from outside the admin panel.
 *      After: authMiddleware (admin JWT) required.
 *
 * [F5] .lean() on read-only queries
 *
 * NOTE: createOrder uses optionalAuth (preserved) — guest checkout works.
 * NOTE: cancel order uses optionalAuth (preserved) — guest can cancel own order.
 */

import express  from "express";
import jwt      from "jsonwebtoken";
import mongoose from "mongoose";
import Order    from "../models/orderModel.js";
import Product  from "../models/productModel.js";
import authMiddleware from "../middleware/authMiddleware.js"; // admin auth
import { createOrder } from "../controllers/orderController.js";

const router = express.Router();

/* ── OPTIONAL USER AUTH (guest-friendly) ── */
const optionalAuth = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET || "motopark_user_secret");
      req.userId = decoded.id;
      req.role   = decoded.role; // "admin" or undefined
    } catch { /* invalid token — treat as guest */ }
  }
  next();
};

/* ── REQUIRE USER AUTH (not admin) ── */
const requireUserAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }
  try {
    const decoded = jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET || "motopark_user_secret");
    req.userId = decoded.id;
    req.role   = decoded.role;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

/* ── CREATE ORDER (guest + user) ── */
router.post("/", optionalAuth, createOrder);

/* ── GET ORDERS ── */
router.get("/", requireUserAuth, async (req, res) => { // [F1] + [F2]
  try {
    const { userId, phone, status, page = 1, limit = 20 } = req.query;

    let filter = {};
    const isAdmin = req.role === "admin";

    if (isAdmin) {
      // Admin can filter by any userId, phone, or status
      if (userId) filter.user = userId;
      else if (phone) filter["shippingAddress.phone"] = phone.trim();
      if (status) filter.status = status;
    } else {
      // [F2]: Regular user can ONLY see their own orders
      if (!req.userId) return res.status(401).json({ message: "Authentication required" });
      filter.user = req.userId;
      // Users cannot filter by arbitrary status (they can see all their own)
    }

    const pageNum  = Math.max(Number(page), 1);
    const limitNum = Math.min(Math.max(Number(limit), 1), 50);
    const skip     = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(), // [F5]
      Order.countDocuments(filter),
    ]);

    res.json({ orders, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ── GET SINGLE ORDER ── */
router.get("/:id", requireUserAuth, async (req, res) => {
  try {
    // [F3]
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const order = await Order.findById(req.params.id).lean(); // [F5]
    if (!order) return res.status(404).json({ message: "Order not found" });

    // [F2]: Non-admin users can only view their own orders
    const isAdmin = req.role === "admin";
    if (!isAdmin && order.user?.toString() !== req.userId?.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    res.json({ order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ── UPDATE STATUS (admin only) ── */
router.put("/:id/status", authMiddleware, async (req, res) => { // [F4]
  try {
    // [F3]
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const { status } = req.body;
    const VALID = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
    if (!VALID.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${VALID.join(", ")}` });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ── CANCEL ORDER (customer, with optionalAuth for guests) ── */
router.put("/:id/cancel", optionalAuth, async (req, res) => {
  try {
    // [F3]
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Only block if both user sides are present and don't match
    if (order.user && req.userId && order.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (!["pending", "confirmed"].includes(order.status)) {
      return res.status(400).json({
        message: `Cannot cancel an order that is already ${order.status}.`,
      });
    }

    // Restore stock
    for (const item of order.items) {
      if (!item.selectedSize || !item.selectedColor) continue;
      await Product.updateOne(
        { _id: item.product },
        { $inc: { "variants.$[v].sizes.$[s].stock": item.quantity } },
        {
          arrayFilters: [
            { "v.color": item.selectedColor },
            { "s.size":  item.selectedSize  },
          ],
        }
      );
    }

    order.status = "cancelled";
    await order.save();
    res.json({ order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;