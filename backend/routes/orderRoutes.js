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
 * [F6] PUT /:id/cancel — unauthenticated cancellation
 *      Before: the check read `order.user && req.userId && mismatch`.
 *      With no token req.userId is undefined, so the condition
 *      short-circuited to false and the 403 never fired — anyone
 *      holding an order ID could cancel a paid order and hand its
 *      stock back. The absence of a credential read as permission.
 *      After: requireUserAuth (matching GET /:id, so an anonymous
 *      caller is rejected before the order is even looked up), then
 *      an explicit owner-or-admin check.
 *
 * NOTE: createOrder uses optionalAuth (preserved) — guest checkout works.
 * NOTE: cancel requires auth, so a GUEST order (user: null) is admin-only —
 *       there is no owner to prove. No regression: the V1 order page loads via
 *       GET /:id, which already requires auth, so a guest never reached the
 *       cancel button anyway. Guest self-cancel needs the OTP-style ownership
 *       proof described in [F1] before it can exist at all.
 */

import express  from "express";
import jwt      from "jsonwebtoken";
import mongoose from "mongoose";
import Order    from "../models/orderModel.js";
import Product  from "../models/productModel.js";
import authMiddleware from "../middleware/authMiddleware.js"; // admin auth
import { jwtSecret } from "../config/jwt.js";
import { createOrder } from "../controllers/orderController.js";

const router = express.Router();

/* Valid order statuses (manual-fulfilment lifecycle, docs/06). Shared by the
   status-update and tracking endpoints. "shipped" retained for legacy rows. */
const VALID_STATUSES = [
  "pending", "confirmed", "packed", "dispatched", "shipped", "delivered", "cancelled", "returned",
];

/* ── OPTIONAL USER AUTH (guest-friendly) ── */
const optionalAuth = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(auth.split(" ")[1], jwtSecret());
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
    const decoded = jwt.verify(auth.split(" ")[1], jwtSecret());
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
  if (userId) filter.user = userId;
  else if (phone) filter["shippingAddress.phone"] = phone.trim();
  if (status) filter.status = status;
} else {
  if (!req.userId) return res.status(401).json({ message: "Authentication required" });
  filter.user = req.userId;
  if (status) filter.status = status;
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
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ── UPDATE TRACKING (admin only) ──
   Records courier hand-off details after dispatch (manual fulfilment, docs/06).
   Optionally advances status in the same call (e.g. → "dispatched") so the admin
   can record tracking + dispatch atomically. All fields optional. */
router.patch("/:id/tracking", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const { courierName, trackingNumber, status } = req.body;
    const update = {};
    if (courierName !== undefined) update.courierName = String(courierName).trim();
    if (trackingNumber !== undefined) update.trackingNumber = String(trackingNumber).trim();
    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });
      }
      update.status = status;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    );
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ── CANCEL ORDER (owner or admin) ── */
router.put("/:id/cancel", requireUserAuth, async (req, res) => { // [F6]
  try {
    // [F3]
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // [F6] Cancelling is destructive (it flips status and hands stock back), so
    // it demands proof of ownership — not merely the absence of a contradiction.
    // A guest order has no owner to prove, so only an admin can cancel one.
    const isAdmin = req.role === "admin";
    const isOwner = Boolean(order.user) && Boolean(req.userId) &&
                    order.user.toString() === req.userId.toString();

    if (!isAdmin && !isOwner) {
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