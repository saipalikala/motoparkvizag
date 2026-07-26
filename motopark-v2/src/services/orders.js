/**
 * services/orders.js — order create/read (V1 backend). Create is guest-friendly
 * (optionalAuth); the api interceptor attaches the Bearer token when signed in,
 * so the order links to the account automatically. Server decrements stock and
 * recomputes the total from DB — client `price` is stored for the record only.
 */
import { api } from '@/lib/api.js';

/**
 * Create the order after a verified payment.
 * items: [{ product, quantity, selectedColor, selectedSize }] — selectedColor is
 * the variant HEX; the server matches variants on it and takes name/price from
 * the DB, so anything else sent here is ignored.
 * payment: the Razorpay handler response — the server re-checks the signature
 * and asks Razorpay whether the payment was captured, and for how much, before
 * saving anything. Delivery is derived server-side and is not sent.
 * Returns the created order (or, on a duplicate, a 409 with { orderId }).
 */
export async function createOrder({ items, shippingAddress, payment, coupon = null }) {
  const { data } = await api.post('/orders', {
    items,
    shippingAddress,
    paymentMethod: 'razorpay',
    razorpay_order_id: payment.razorpay_order_id,
    razorpay_payment_id: payment.razorpay_payment_id,
    razorpay_signature: payment.razorpay_signature,
    coupon,
  });
  return data;
}

/** A single order (auth required; user's own or admin). Returns the order doc. */
export async function getOrder(id) {
  const { data } = await api.get(`/orders/${id}`);
  return data.order;
}

/** The signed-in user's orders (auth required). Returns { orders, total, page, pages }. */
export async function getMyOrders({ page = 1, limit = 20 } = {}) {
  const { data } = await api.get('/orders', { params: { page, limit } });
  return data;
}
