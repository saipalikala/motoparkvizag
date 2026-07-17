import mongoose from "mongoose";

/**
 * models/paymentEventModel.js — a durable record of every payment Razorpay tells
 * us it captured, learned from the payment.captured webhook.
 *
 * WHY THIS EXISTS: the checkout path creates an Order only if the customer's
 * browser makes it back to POST /orders after paying. If they drop off (or the
 * order write fails post-capture), the money is captured with no Order — an
 * "orphaned payment" whose only prior trace was a console.error that rolls off
 * Railway's logs. This collection is that trace made durable and queryable.
 *
 * IT DOES NOT store "stranded" as a flag. The webhook races the browser's
 * POST /orders, so "no Order yet" at webhook time does not mean orphaned — the
 * order may still be in flight. Whether a captured payment is truly stranded is
 * derived at READ time (an admin view, a later slice): captured payments with no
 * matching Order, captured more than a grace window ago. Freezing the verdict
 * here would false-alarm on healthy checkouts. See docs / the webhook controller.
 */
const paymentEventSchema = new mongoose.Schema(
  {
    /* Razorpay payment id (pay_...). The idempotency key: Razorpay redelivers
       events, so a repeat delivery must update this row, never insert a second. */
    paymentId: { type: String, required: true },

    /* Razorpay order id (order_...) the payment belongs to. */
    razorpayOrderId: { type: String, default: null },

    /* Amount in the smallest currency unit (paise), exactly as Razorpay reports
       it — NOT rupees. Kept in paise to compare byte-for-byte with the webhook. */
    amount:   { type: Number, required: true },
    currency: { type: String, default: "INR" },

    /* Payment status from the event (we only subscribe payment.captured today,
       so this is "captured", but store it verbatim for when we add more events). */
    status: { type: String, required: true },

    /* Contact fields Razorpay includes — the only customer identity we get, and
       what an admin needs to reach someone whose order never landed. */
    email:   { type: String, default: null },
    contact: { type: String, default: null },

    /* Razorpay's own event id (evt_...) and the event's created_at (unix secs),
       for tracing a row back to a specific delivery. */
    eventId:        { type: String, default: null },
    eventCreatedAt: { type: Date,   default: null },
  },
  { timestamps: true }
);

/* Idempotency guard. Same discipline as orderModel's paymentId index: unique so a
   redelivered event cannot create a duplicate row; the controller upserts on this
   key. Not partial here because paymentId is required — there are no nulls to
   exclude, so a plain unique index is correct. */
paymentEventSchema.index({ paymentId: 1 }, { unique: true });

export default mongoose.model("PaymentEvent", paymentEventSchema);
