/**
 * services/checkout.js — Razorpay payment endpoints (V1 backend).
 * The SERVER recalculates the amount from DB prices — the client never sends a
 * trusted amount (Commerce Law 4 / Razorpay-flow safety).
 */
import { api } from '@/lib/api.js';

/** Create a Razorpay order. items: [{ productId, quantity }]. Returns { orderId, amount, currency }. */
export async function createRazorpayOrder({ items, deliveryCharge }) {
  const { data } = await api.post('/payment/create-order', { items, deliveryCharge });
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
