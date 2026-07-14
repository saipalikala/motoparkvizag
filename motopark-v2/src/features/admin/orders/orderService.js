/**
 * features/admin/orders/orderService.js — sole adminApi caller for order ops.
 *
 * Backend contract (backend/routes/orderRoutes.js + orderModel.js):
 *   GET   /api/orders?status&page&limit   (admin JWT) → { orders, total, page, pages }  (limit ≤ 50)
 *   GET   /api/orders/:id                 (admin JWT) → { order }
 *   PUT   /api/orders/:id/status          { status }                 (admin JWT)
 *   PATCH /api/orders/:id/tracking        { courierName, trackingNumber, status? } (admin JWT)
 *
 * Order = { _id, user, items[{product,name,price,quantity,selectedColor,selectedSize}],
 *           shippingAddress{name,phone,email,address,city,state,pincode},
 *           paymentMethod, paymentId, total, status, courierName, trackingNumber, createdAt }
 *
 * Manual-fulfilment lifecycle (docs/06): pending → confirmed → packed → dispatched
 * → delivered (+ cancelled/returned). "shipped" is a legacy value.
 */
import { adminApi } from '../lib/adminApi.js';

/** Forward workflow the admin advances an order through. */
export const STATUS_FLOW = ['pending', 'confirmed', 'packed', 'dispatched', 'delivered'];

/** Per-status display metadata. `intent` maps to a StatusBadge colour. */
export const STATUS_META = {
  pending: { label: 'Pending', intent: 'warning' },
  confirmed: { label: 'Confirmed', intent: 'info' },
  packed: { label: 'Packed', intent: 'info' },
  dispatched: { label: 'Dispatched', intent: 'accent' },
  shipped: { label: 'Shipped', intent: 'info' }, // legacy
  delivered: { label: 'Delivered', intent: 'success' },
  cancelled: { label: 'Cancelled', intent: 'danger' },
  returned: { label: 'Returned', intent: 'danger' },
};

/** Every status the filter dropdown offers. */
export const FILTERABLE_STATUSES = [
  'pending', 'confirmed', 'packed', 'dispatched', 'shipped', 'delivered', 'cancelled', 'returned',
];

export function statusMeta(status) {
  return STATUS_META[status] ?? { label: status || 'Unknown', intent: 'neutral' };
}

/** The next forward status, or null if terminal. "shipped" (legacy) → delivered. */
export function nextStatus(status) {
  if (status === 'shipped') return 'delivered';
  const i = STATUS_FLOW.indexOf(status);
  if (i === -1 || i === STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[i + 1];
}

/** Payment presentation derived from method + id (no explicit paymentStatus field). */
export function paymentInfo(order) {
  const method = (order.paymentMethod || '').toLowerCase();
  const isOnline = method === 'razorpay' || Boolean(order.paymentId);
  if (isOnline) return { label: 'Paid', method: 'Razorpay', paid: true, ref: order.paymentId || null };
  return { label: 'COD (unpaid)', method: 'Cash on Delivery', paid: false, ref: null };
}

const shortId = (id) => String(id).slice(-8).toUpperCase();

function itemUnits(items) {
  return (items || []).reduce((n, i) => n + (Number(i.quantity) || 1), 0);
}

/** Raw order → list-row shape. */
export function toRow(o) {
  return {
    id: String(o._id),
    shortId: shortId(o._id),
    createdAt: o.createdAt,
    customerName: o.shippingAddress?.name || 'Guest',
    customerPhone: o.shippingAddress?.phone || '',
    total: o.total,
    status: o.status,
    units: itemUnits(o.items),
    payment: paymentInfo(o),
  };
}

/* ── Reads ────────────────────────────────────────────────────────────────── */

export async function listOrders({ status, page = 1, limit = 20 } = {}) {
  const params = { page, limit };
  if (status) params.status = status;
  const { data } = await adminApi.get('/orders', { params, headers: { 'x-admin': '1' } });
  return {
    rows: Array.isArray(data?.orders) ? data.orders.map(toRow) : [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    pages: data?.pages ?? 0,
  };
}

/** Single order (full raw doc for the detail page), or null if not found. */
export async function getOrder(id) {
  try {
    const { data } = await adminApi.get(`/orders/${id}`, { headers: { 'x-admin': '1' } });
    return data?.order ?? null;
  } catch (err) {
    if (err?.code === 404 || err?.code === 400) return null;
    throw err;
  }
}

/* ── Writes ───────────────────────────────────────────────────────────────── */

export async function updateStatus(id, status) {
  const { data } = await adminApi.put(`/orders/${id}/status`, { status });
  return data?.order ?? data;
}

/** Record courier hand-off details; optionally advance status in the same call. */
export async function updateTracking(id, { courierName, trackingNumber, status }) {
  const body = {};
  if (courierName !== undefined) body.courierName = courierName;
  if (trackingNumber !== undefined) body.trackingNumber = trackingNumber;
  if (status !== undefined) body.status = status;
  const { data } = await adminApi.patch(`/orders/${id}/tracking`, body);
  return data?.order ?? data;
}
