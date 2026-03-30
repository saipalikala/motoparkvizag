/* ================================================
   File: backend/routes/orderRoutes.js
   ================================================ */
import express from "express";
import jwt from "jsonwebtoken";
import Order from "../models/orderModel.js";
import { createOrder } from "../controllers/orderController.js";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "motopark_user_secret";

/* ── OPTIONAL AUTH MIDDLEWARE ── */
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

/* ── CREATE ORDER ── uses controller (handles stock decrement + validation) */
router.post("/", optionalAuth, createOrder);

/* ── GET ORDERS ── */
router.get("/", async (req, res) => {
    try {
        const { userId, phone } = req.query;

        let filter = {};
        if (userId) {
            filter = { user: userId };
        } else if (phone) {
            filter = { "shippingAddress.phone": phone.trim() };
        }

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