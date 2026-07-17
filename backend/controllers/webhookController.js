import PaymentEvent from "../models/paymentEventModel.js";
import { isValidWebhookSignature } from "../utils/razorpay.js";

/**
 * controllers/webhookController.js — Razorpay webhook receiver.
 *
 * Mounted at POST /api/webhooks/razorpay with express.raw() (see server.js,
 * ABOVE the global express.json), so req.body here is a Buffer of the exact
 * bytes Razorpay sent. The signature is HMAC over those bytes — never parse
 * before verifying.
 *
 * Scope of this slice: durably RECORD every captured payment, idempotently.
 * It deliberately does NOT decide whether a payment is "stranded" (no matching
 * order) — that races the browser's POST /orders and is derived at read time in
 * a later admin slice. Keeping this handler to verify + record makes it correct
 * regardless of delivery order or timing.
 *
 * Response contract (Razorpay retries on any non-2xx):
 *   400 — bad/missing signature or unparseable body (never retry-worthy for us)
 *   200 — accepted: recorded, or an event type we don't act on (ack, no retry)
 *   500 — our DB failed; let Razorpay retry so the event is not lost
 */
export const handleRazorpayWebhook = async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];

  // req.body is a Buffer (express.raw). Verify BEFORE any parsing.
  if (!isValidWebhookSignature(req.body, signature)) {
    // Either an attacker, or RAZORPAY_WEBHOOK_SECRET is unset/wrong. Both are
    // "do not process". A real Razorpay delivery failing here means the secret
    // is misconfigured — the 400 makes Razorpay retry, buying time to fix it.
    console.warn("Razorpay webhook: signature verification failed.");
    return res.status(400).json({ message: "Invalid signature." });
  }

  let event;
  try {
    event = JSON.parse(req.body.toString("utf8"));
  } catch {
    console.warn("Razorpay webhook: body passed signature but is not JSON.");
    return res.status(400).json({ message: "Malformed payload." });
  }

  // We subscribe to payment.captured only. Acknowledge anything else with 200 so
  // Razorpay does not retry an event we simply chose not to act on.
  if (event?.event !== "payment.captured") {
    return res.status(200).json({ received: true, ignored: event?.event ?? "unknown" });
  }

  const entity = event?.payload?.payment?.entity;
  if (!entity?.id) {
    // Signed by Razorpay but shaped unexpectedly — ack so we don't loop, but
    // record nothing we can't key. Worth a log; should not happen in practice.
    console.warn("Razorpay webhook: payment.captured with no payment entity id.");
    return res.status(200).json({ received: true, ignored: "no-entity" });
  }

  const record = {
    paymentId:       entity.id,
    razorpayOrderId: entity.order_id ?? null,
    amount:          entity.amount,          // paise, verbatim
    currency:        entity.currency ?? "INR",
    status:          entity.status,          // "captured"
    email:           entity.email ?? null,
    contact:         entity.contact ?? null,
    eventId:         req.headers["x-razorpay-event-id"] ?? null,
    eventCreatedAt:  event.created_at ? new Date(event.created_at * 1000) : null,
  };

  try {
    // Idempotent: Razorpay redelivers events. Upsert on the unique paymentId so
    // a repeat delivery updates the same row instead of inserting a duplicate.
    await PaymentEvent.updateOne(
      { paymentId: record.paymentId },
      { $set: record },
      { upsert: true }
    );
  } catch (err) {
    // Two concurrent first-deliveries of the same event can both miss the row
    // and race to insert; the unique index rejects the loser. That is success,
    // not failure — the payment is recorded either way.
    if (err?.code === 11000) {
      return res.status(200).json({ received: true, duplicate: true });
    }
    // A real DB failure: 500 so Razorpay retries and the event is not lost.
    console.error("Razorpay webhook: failed to record payment event —", err?.message);
    return res.status(500).json({ message: "Could not record event." });
  }

  return res.status(200).json({ received: true });
};
