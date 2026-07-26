import PaymentEvent from "../models/paymentEventModel.js";
import PaymentIntent from "../models/paymentIntentModel.js";
import { isValidWebhookSignature } from "../utils/razorpay.js";
import { placeOrder, OutOfStockError } from "../services/placeOrder.js";

/**
 * controllers/webhookController.js — Razorpay webhook receiver.
 *
 * Mounted at POST /api/webhooks/razorpay with express.raw() (see server.js,
 * ABOVE the global express.json), so req.body here is a Buffer of the exact
 * bytes Razorpay sent. The signature is HMAC over those bytes — never parse
 * before verifying.
 *
 * This handler does two things, in order:
 *
 *   1. RECORD every captured payment, idempotently. This happens FIRST and
 *      unconditionally, so the money leaves a durable trace even if everything
 *      below fails. The admin reconciliation view reads these rows.
 *
 *   2. PLACE THE ORDER, if a PaymentIntent was recorded for this Razorpay order.
 *      This is what makes checkout survive the customer's browser: order creation
 *      used to live only in the Razorpay `handler` callback, so a stalled modal
 *      after a cross-device UPI payment meant captured money and no order. This
 *      path does not involve the browser at all.
 *
 * It still does NOT decide whether a payment is "stranded" — that races the
 * browser's POST /orders and is derived at read time by the admin view. Both this
 * handler and the browser may place the same order; the unique partial index on
 * Order.paymentId means exactly one wins and the loser is told so (see
 * services/placeOrder.js). Whoever arrives first is correct.
 *
 * Response contract (Razorpay retries on any non-2xx):
 *   400 — bad/missing signature or unparseable body (never retry-worthy for us)
 *   200 — accepted: recorded and/or ordered, an event we don't act on, or a
 *         failure that RETRYING CANNOT FIX (no intent, wrong amount, out of
 *         stock). Those are logged for reconciliation, not retried forever.
 *   500 — a transient failure on our side (DB write); let Razorpay retry so the
 *         event is not lost
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

  // ── Place the order, if we know what this payment was for ─────────────────
  // Everything below is best-effort ON TOP of the record above: the payment is
  // already durably logged, so any failure here degrades to "stranded payment"
  // — visible in admin reconciliation — rather than a lost event.
  let intent;
  try {
    intent = await PaymentIntent.findOne({ razorpayOrderId: entity.order_id }).lean();
  } catch (err) {
    // Transient read failure — retry so we don't abandon a placeable order.
    console.error("Razorpay webhook: intent lookup failed —", err?.message);
    return res.status(500).json({ message: "Could not load payment intent." });
  }

  if (!intent) {
    // No intent recorded for this Razorpay order. Expected for V1 (motopark-web)
    // checkouts, which never write one, and for any checkout whose intent write
    // failed. The browser remains the only way that order can be created, which
    // is the pre-existing behaviour — and reconciliation catches it if it isn't.
    return res.status(200).json({ received: true, ordered: false, reason: "no-intent" });
  }

  if (intent.status === "consumed" && intent.orderId) {
    // Redelivery of an event we have already acted on.
    return res.status(200).json({ received: true, ordered: true, orderId: intent.orderId, duplicate: true });
  }

  // The intent records exactly what we asked Razorpay to charge. If the captured
  // amount differs, something is wrong that placing an order would only make
  // worse — refuse, and leave it for a human. Retrying cannot change the amount,
  // so this acks.
  if (entity.amount !== intent.amountPaise) {
    console.error(
      "CRITICAL: captured amount does not match the recorded intent — order NOT placed. " +
      `paymentId=${entity.id} razorpayOrderId=${entity.order_id} ` +
      `captured=${entity.amount} expected=${intent.amountPaise}`
    );
    return res.status(200).json({ received: true, ordered: false, reason: "amount-mismatch" });
  }

  let order, alreadyExisted;
  try {
    ({ order, alreadyExisted } = await placeOrder({
      items:           intent.items,
      shippingAddress: intent.shippingAddress,
      user:            intent.user,
      total:           intent.total,
      paymentId:       entity.id,
      paymentMethod:   "razorpay",
      coupon:          intent.coupon || null,
    }));
  } catch (err) {
    if (err instanceof OutOfStockError) {
      // Stock ran out between checkout and capture. Already logged as CRITICAL
      // by placeOrder, and the stock is already back. Retrying will not conjure
      // inventory, so ack — the payment stays visible in reconciliation as one
      // needing a manual refund.
      return res.status(200).json({ received: true, ordered: false, reason: "out-of-stock" });
    }
    // Anything else is likely transient (a failed write): retry.
    console.error("Razorpay webhook: placing the order failed —", err?.message);
    return res.status(500).json({ message: "Could not place order." });
  }

  // Record the outcome on the intent. If THIS write fails the order still
  // exists, and a redelivery will simply find it via placeOrder's replay check
  // and mark the intent then — so it is not worth a retry.
  try {
    await PaymentIntent.updateOne(
      { razorpayOrderId: entity.order_id },
      { $set: { status: "consumed", orderId: order._id } }
    );
  } catch (err) {
    console.warn("Razorpay webhook: order placed but intent not marked consumed —", err?.message);
  }

  return res.status(200).json({
    received: true,
    ordered: true,
    orderId: order._id,
    // true when the browser got there first — the healthy, common case.
    alreadyExisted,
  });
};
