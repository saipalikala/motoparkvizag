import PaymentIntent from "../models/paymentIntentModel.js";

/**
 * controllers/checkoutStatusController.js — "did my order land?"
 *
 * The storefront calls this while the Razorpay modal is open. Order creation no
 * longer depends on the browser (the payment.captured webhook places it — see
 * controllers/webhookController.js), but the CUSTOMER still does: if the modal
 * stalls after a cross-device UPI payment, the `handler` callback never fires and
 * the page has no idea the order exists. Polling this closes that gap, so a
 * frozen modal ends on the success page instead of a dead screen.
 *
 * DELIBERATELY MINIMAL RESPONSE. The Razorpay order id is the only credential
 * involved — it is not a secret, it travels through the browser, and this
 * endpoint is unauthenticated so a guest checkout can use it. So it returns
 * whether an order exists and its id, and nothing else: no address, no contact
 * details, no line items, no amounts. The order id alone is not enough to read an
 * order back (routes/orderRoutes.js owns that and applies its own auth); it is
 * only enough for the page to route to its own success view.
 */
export const getCheckoutStatus = async (req, res) => {
    const { razorpayOrderId } = req.params;

    // Cheap shape check before touching the DB — this endpoint is polled, and
    // unauthenticated, so it should reject junk without a query.
    if (typeof razorpayOrderId !== "string" || !/^order_[A-Za-z0-9]{1,32}$/.test(razorpayOrderId)) {
        return res.status(400).json({ message: "Invalid order reference." });
    }

    try {
        const intent = await PaymentIntent.findOne({ razorpayOrderId })
            .select("status orderId")
            .lean();

        if (!intent) {
            // No intent: an expired/reaped one (7-day TTL), a V1 checkout, or a
            // fabricated id. Same answer for all three — we cannot say an order
            // landed, and we do not distinguish, so this leaks nothing.
            return res.status(404).json({ status: "unknown" });
        }

        if (intent.status === "consumed" && intent.orderId) {
            return res.json({ status: "placed", orderId: intent.orderId });
        }

        // Paid-but-not-yet-placed and never-paid look identical from here, and
        // that is fine: the client's only question is "may I show success yet?",
        // and the answer is no in both cases. It keeps polling.
        return res.json({ status: "pending" });

    } catch (err) {
        console.error("Checkout status lookup failed:", err?.message);
        return res.status(500).json({ message: "Could not check order status." });
    }
};
