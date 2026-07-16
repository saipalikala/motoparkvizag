/**
 * utils/razorpay.js — shared Razorpay client and signature check.
 *
 * The checkout callback's signature is HMAC-SHA256 of "<order_id>|<payment_id>"
 * keyed with the API secret. A valid signature proves the callback came from
 * Razorpay; it does NOT prove the payment was captured or that it was for the
 * right amount — fetch the payment for that (see controllers/orderController.js).
 */
import Razorpay from "razorpay";
import crypto from "crypto";

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

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(String(razorpay_signature), "utf8");
  // timingSafeEqual throws on length mismatch, so guard before comparing.
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
