import Product from "../models/productModel.js"; // ← add this import
import { deliveryChargeFor } from "../config/store.js";
import { isValidPaymentSignature, razorpayClient } from "../utils/razorpay.js";

// Step 1: Create order on Razorpay
export const createOrder = async (req, res) => {
    try {
        const razorpay = razorpayClient();

        const { items } = req.body; // ← receive items, NOT amount or deliveryCharge

        // ✅ Calculate total from DB — cannot be tampered by frontend
        let total = 0;
        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(400).json({ message: `Product not found: ${item.productId}` });
            }
            total += product.price * item.quantity;
        }

        // Derived server-side (config/store.js) — a client-supplied charge could
        // be negative, shrinking the amount to pay. /orders derives it the same
        // way, so the amount charged always matches the amount it will demand.
        const deliveryCharge = deliveryChargeFor(total);

        const order = await razorpay.orders.create({
            amount: Math.round((total + deliveryCharge) * 100), // paise — from DB ✅
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
        });

        res.json({ orderId: order.id, amount: order.amount, currency: order.currency });

    } catch (err) {
        console.error("Razorpay order error:", err);
        res.status(500).json({ message: "Failed to create payment order" });
    }
};

/**
 * Step 2: Verify the checkout signature.
 *
 * ADVISORY ONLY — this is a convenience check so the storefront can fail fast.
 * It proves the callback came from Razorpay, NOT that the money arrived, and a
 * client can simply skip it. The authoritative check (captured? right amount?
 * right order? already used?) runs in controllers/orderController.js before the
 * order is persisted. Do not treat a 200 from here as "paid".
 */
export const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!isValidPaymentSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature })) {
            return res.status(400).json({ message: "Payment verification failed" });
        }

        res.json({ success: true, paymentId: razorpay_payment_id });

    } catch (err) {
        console.error("Verify error:", err);
        res.status(500).json({ message: "Verification error" });
    }
};