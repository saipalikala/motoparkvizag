/**
 * utils/razorpay.js — shared Razorpay client and signature checks.
 *
 * TWO DIFFERENT signatures live here — same algorithm (HMAC-SHA256, hex),
 * different key and different message. Do not conflate them:
 *
 *   1. Checkout callback (isValidPaymentSignature)
 *      key     = RAZORPAY_KEY_SECRET (the API secret)
 *      message = "<order_id>|<payment_id>"
 *      Proves the callback came from Razorpay; NOT that money moved — fetch the
 *      payment for that (see controllers/orderController.js).
 *
 *   2. Webhook (isValidWebhookSignature)
 *      key     = RAZORPAY_WEBHOOK_SECRET (set when creating the webhook in the
 *                dashboard — a SEPARATE secret, NOT the API secret)
 *      message = the RAW request body, byte-for-byte as delivered
 */
import Razorpay from "razorpay";
import crypto from "crypto";

/** Constant-time hex-string compare. timingSafeEqual throws on length mismatch,
 *  so the length check both guards that and is itself a fast reject. */
const timingSafeHexEqual = (expectedHex, receivedHex) => {
  const a = Buffer.from(expectedHex, "utf8");
  const b = Buffer.from(String(receivedHex), "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

/** Razorpay client. Built per call so a key rotation is picked up on restart. */
export const razorpayClient = () =>
  new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

export const isValidPaymentSignature = ({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
}) => {
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return false;

  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  return timingSafeHexEqual(expected, razorpay_signature);
};

/**
 * Verify a Razorpay webhook against the `x-razorpay-signature` header.
 *
 * `rawBody` MUST be the exact bytes Razorpay sent — a Buffer or the raw string.
 * Do NOT parse and re-stringify the JSON first: JSON.parse → JSON.stringify
 * drops whitespace Razorpay may have included, changing the bytes and failing
 * the HMAC on every real delivery while passing hand-built tests. The route
 * that calls this uses express.raw(), mounted ABOVE express.json in server.js,
 * precisely to keep the body intact.
 *
 * Keyed with RAZORPAY_WEBHOOK_SECRET (the dashboard webhook secret), which is a
 * DIFFERENT value from RAZORPAY_KEY_SECRET. Returns false if it is unset rather
 * than throwing, so a misconfigured server rejects webhooks instead of crashing.
 */
export const isValidWebhookSignature = (rawBody, signature) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature || rawBody == null) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody))
    .digest("hex");

  return timingSafeHexEqual(expected, signature);
};
