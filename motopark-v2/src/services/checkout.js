/**
 * services/checkout.js — Razorpay payment endpoints (V1 backend).
 * The SERVER recalculates the amount from DB prices — the client never sends a
 * trusted amount (Commerce Law 4 / Razorpay-flow safety).
 */
import { api } from '@/lib/api.js';

/**
 * Create a Razorpay order. items: [{ productId, quantity }]. The server prices
 * the cart AND derives the delivery charge, so neither is sent from here.
 * Returns { orderId, amount, currency } — `amount` is in paise.
 */
export async function createRazorpayOrder({ items }) {
  const { data } = await api.post('/payment/create-order', { items });
  return data;
}

/** Verify the Razorpay signature server-side (HMAC). Returns { success, paymentId }. */
export async function verifyPayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  const { data } = await api.post('/payment/verify', {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  });
  return data;
}
