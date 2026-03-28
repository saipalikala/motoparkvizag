import Razorpay from "razorpay";
import crypto from "crypto";

// Step 1: Create order on Razorpay
export const createOrder = async (req, res) => {
    console.log("KEY:", process.env.RAZORPAY_KEY_ID);
    console.log("SECRET:", process.env.RAZORPAY_KEY_SECRET);
    try {
        // ✅ Instance created inside function — env vars are loaded by this point
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        const { amount } = req.body; // amount in rupees from frontend

        const options = {
            amount: Math.round(amount * 100), // convert to paise
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
        };

        const order = await razorpay.orders.create(options);
        res.json({ orderId: order.id, amount: order.amount, currency: order.currency });

    } catch (err) {
        console.error("Razorpay order error:", err);
        res.status(500).json({ message: "Failed to create payment order" });
    }
};

// Step 2: Verify payment signature after success
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

        // ✅ Payment is genuine — order is saved in Checkout.jsx after this
        res.json({ success: true, paymentId: razorpay_payment_id });

    } catch (err) {
        console.error("Verify error:", err);
        res.status(500).json({ message: "Verification error" });
    }
};