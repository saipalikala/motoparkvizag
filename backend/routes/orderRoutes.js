/* ================================================
   File: backend/routes/orderRoutes.js
   ================================================ */
import express from "express";
import jwt from "jsonwebtoken";
import Order from "../models/orderModel.js";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "motopark_user_secret";

/* ── OPTIONAL AUTH MIDDLEWARE ──
   Attaches req.userId if a valid user token is present.
   Does NOT block the request if token is missing (guest checkout still works).
*/
const optionalAuth = (req, res, next) => {
    const auth = req.headers.authorization;
    if (auth?.startsWith("Bearer ")) {
        try {
            const { id } = jwt.verify(auth.split(" ")[1], JWT_SECRET);
            req.userId = id;
        } catch { /* invalid token — treat as guest */ }
    }
    next();
};

/* ── CREATE ORDER ── */
router.post("/", optionalAuth, async (req, res) => {
    try {
        const { items, shippingAddress, paymentMethod, total } = req.body;

        if (!items?.length) return res.status(400).json({ message: "No items" });
        if (!shippingAddress) return res.status(400).json({ message: "No address" });
        if (!total) return res.status(400).json({ message: "No total" });

        const order = await Order.create({
            user: req.userId || null, // attach user if logged in
            items,
            shippingAddress,
            paymentMethod,
            total,
        });

        console.log(`✅ Order created: ${order._id} | User: ${req.userId || "guest"}`);
        res.status(201).json({ order, orderId: order._id });

    } catch (err) {
        console.error("CREATE ORDER ERROR:", err);
        res.status(500).json({ message: err.message });
    }
});

/* ── GET ORDERS ──
   Priority:
   1. ?userId=xxx  → fetch by user._id  (logged-in user's orders)
   2. ?phone=xxx   → fetch by phone     (guest / fallback)
   3. no filter    → return all         (admin)
*/
router.get("/", async (req, res) => {
    try {
        const { userId, phone } = req.query;

        let filter = {};

        if (userId) {
            filter = { user: userId };
        } else if (phone) {
            filter = { "shippingAddress.phone": phone.trim() };
        }
        // else: no filter → admin gets all orders

        const orders = await Order.find(filter).sort({ createdAt: -1 }).lean();
        res.json({ orders });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/* ── GET SINGLE ORDER ── */
router.get("/:id", async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).lean();
        if (!order) return res.status(404).json({ message: "Order not found" });
        res.json({ order });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/* ── UPDATE STATUS (admin) ── */
router.put("/:id/status", async (req, res) => {
    try {
        const { status } = req.body;
        const VALID = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
        if (!VALID.includes(status)) return res.status(400).json({ message: "Invalid status" });

        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        if (!order) return res.status(404).json({ message: "Not found" });
        res.json({ order });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;