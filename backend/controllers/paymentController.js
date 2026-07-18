import mongoose from "mongoose";
import Product from "../models/productModel.js"; // ← add this import
import PaymentIntent from "../models/paymentIntentModel.js";
import { deliveryChargeFor } from "../config/store.js";
import { isValidPaymentSignature, razorpayClient } from "../utils/razorpay.js";

/**
 * Step 1: Create order on Razorpay, and record what it is FOR.
 *
 * The Razorpay order used to be created with nothing but an amount and a
 * throwaway receipt, which left payment.captured unable to say what had been
 * bought or where to send it — so an order could only ever be placed by the
 * customer's browser. Callers that send the full checkout (address + chosen
 * variants) now also get a PaymentIntent written here, which is what lets the
 * webhook place the order on its own. See models/paymentIntentModel.js.
 *
 * BACKWARD COMPATIBLE BY DESIGN: V1 (motopark-web) is still live and posts only
 * { items: [{ productId, quantity }] }. Without an address there is nothing to
 * ship to, so no intent is written and V1 behaves exactly as before — it keeps
 * relying on its browser round-trip, which is the status quo, not a regression.
 * Do not make the address mandatory until V1 is retired.
 */
export const createOrder = async (req, res) => {
    try {
        const razorpay = razorpayClient();

        // items: [{ productId, quantity, selectedColor?, selectedSize? }]
        // shippingAddress is optional — see the V1 note above.
        const { items, shippingAddress } = req.body;

        // Quantity is client-supplied and multiplies the price below: a negative
        // or fractional value would produce a nonsense amount to charge, and an
        // intent that /orders would later refuse. orderController applies the
        // same rule; apply it here too so a bad cart fails before Razorpay is
        // ever called.
        for (const item of items) {
            if (!mongoose.Types.ObjectId.isValid(item?.productId)) {
                return res.status(400).json({ message: `Invalid product reference: ${item?.productId}` });
            }
            if (!Number.isInteger(item?.quantity) || item.quantity < 1) {
                return res.status(400).json({ message: "Invalid quantity — must be a whole number of at least 1." });
            }
        }

        // ✅ Resolve every product in ONE query — this was N sequential findById
        // round-trips, and it now also has to yield the name for the intent's
        // line snapshot.
        const productDocs = await Product.find({ _id: { $in: items.map(i => i.productId) } })
            .select("name price")
            .lean();
        const productById = new Map(productDocs.map(p => [p._id.toString(), p]));

        const missing = items.find(i => !productById.has(i.productId.toString()));
        if (missing) {
            return res.status(400).json({ message: `Product not found: ${missing.productId}` });
        }

        // ✅ Priced from the DB — cannot be tampered with by the frontend.
        const verifiedItems = items.map(item => {
            const product = productById.get(item.productId.toString());
            return {
                product:       product._id,
                name:          product.name,
                price:         product.price,
                quantity:      item.quantity,
                selectedColor: item.selectedColor,
                selectedSize:  item.selectedSize,
            };
        });

        const subtotal = verifiedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

        // Derived server-side (config/store.js) — a client-supplied charge could
        // be negative, shrinking the amount to pay. /orders derives it the same
        // way, so the amount charged always matches the amount it will demand.
        const deliveryCharge = deliveryChargeFor(subtotal);
        const amountPaise    = Math.round((subtotal + deliveryCharge) * 100);

        const order = await razorpay.orders.create({
            amount: amountPaise, // paise — from DB ✅
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
        });

        // Record the intent only once Razorpay has given us an order id to key it
        // on. If this write fails the customer can still pay and we fall back to
        // the browser round-trip — so log it and carry on rather than failing a
        // checkout that is otherwise fine. A payment with no intent is exactly
        // today's behaviour, and reconciliation still catches it.
        if (shippingAddress) {
            try {
                await PaymentIntent.create({
                    razorpayOrderId: order.id,
                    user:            req.userId ?? null,
                    items:           verifiedItems,
                    shippingAddress,
                    subtotal,
                    deliveryCharge,
                    total:           subtotal + deliveryCharge,
                    amountPaise,
                });
            } catch (err) {
                console.error(
                    "Payment intent not recorded — checkout continues, but this payment " +
                    `can only be completed by the browser. razorpayOrderId=${order.id} — ${err?.message}`
                );
            }
        }

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