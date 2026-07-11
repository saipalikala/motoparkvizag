/**
 * services/orders.js — order create/read (V1 backend). Create is guest-friendly
 * (optionalAuth); the api interceptor attaches the Bearer token when signed in,
 * so the order links to the account automatically. Server decrements stock and
 * recomputes the total from DB — client `price` is stored for the record only.
 */
import { api } from '@/lib/api.js';

/**
 * Create the order after a verified payment.
 * items: [{ product, name, price, quantity, selectedColor, selectedSize }]
 * Returns the created order (or, on a 60s-duplicate, a 409 with { orderId }).
 */
export async function createOrder({ items, shippingAddress, paymentMethod, paymentId, deliveryCharge }) {
  const { data } = await api.post('/orders', {
    items,
    shippingAddress,
    paymentMethod,
    paymentId,
    deliveryCharge,
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
