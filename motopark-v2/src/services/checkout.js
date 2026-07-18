/**
 * services/checkout.js — Razorpay payment endpoints (V1 backend).
 * The SERVER recalculates the amount from DB prices — the client never sends a
 * trusted amount (Commerce Law 4 / Razorpay-flow safety).
 */
import { api } from '@/lib/api.js';

/**
 * Create a Razorpay order. items: [{ productId, quantity, selectedColor,
 * selectedSize }]. The server prices the cart AND derives the delivery charge,
 * so neither is sent from here.
 *
 * `shippingAddress` is sent BEFORE payment on purpose: it lets the server record
 * a payment intent, which is what allows the payment.captured webhook to place
 * the order if this browser never makes it back (a stalled Razorpay modal after
 * a cross-device UPI payment). Without it the order can only be created by the
 * `handler` callback, and a frozen modal means captured money and no order.
 *
 * Returns { orderId, amount, currency } — `amount` is in paise.
 */
export async function createRazorpayOrder({ items, shippingAddress }) {
  const { data } = await api.post('/payment/create-order', { items, shippingAddress });
  return data;
}

/**
 * Has the order for this Razorpay order landed yet? Returns
 * { status: 'placed', orderId } | { status: 'pending' } | { status: 'unknown' }.
 *
 * Polled while the Razorpay modal is open. The webhook places the order without
 * us, so this is how the page finds out when its `handler` callback never fires
 * — the cross-device UPI case where the modal stalls after the payment succeeds.
 * Never throws: a failed poll is not a failed order, and the caller just retries.
 */
export async function getCheckoutStatus(razorpayOrderId) {
  try {
    const { data } = await api.get(`/checkout/status/${razorpayOrderId}`);
    return data;
  } catch {
    return { status: 'unknown' };
  }
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
