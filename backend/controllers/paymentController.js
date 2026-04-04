import Razorpay from "razorpay";
import crypto from "crypto";
import Product from "../models/Product.js"; // ← add this import

// Step 1: Create order on Razorpay
export const createOrder = async (req, res) => {
    try {
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        const { items } = req.body; // ← receive items, NOT amount

        // ✅ Calculate total from DB — cannot be tampered by frontend
        let total = 0;
        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(400).json({ message: `Product not found: ${item.productId}` });
            }
            total += product.price * item.quantity;
        }

        const order = await razorpay.orders.create({
            amount: Math.round(total * 100), // paise — from DB ✅
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
        });

        res.json({ orderId: order.id, amount: order.amount, currency: order.currency });

    } catch (err) {
        console.error("Razorpay order error:", err);
        res.status(500).json({ message: "Failed to create payment order" });
    }
};

// Step 2: Verify payment signature — no changes needed here ✅
export const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ message: "Payment verification failed" });
        }

        res.json({ success: true, paymentId: razorpay_payment_id });

    } catch (err) {
        console.error("Verify error:", err);
        res.status(500).json({ message: "Verification error" });
    }
};