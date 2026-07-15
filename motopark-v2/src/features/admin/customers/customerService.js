/**
 * features/admin/customers/customerService.js — sole adminApi caller for the
 * customer (registered user) admin views.
 *
 * Backend contract (backend/routes/userRoutes.js — admin endpoints added M5):
 *   GET /api/users?search&page&limit   (admin JWT) → { users, total, page, pages }
 *   GET /api/users/:id                 (admin JWT) → { user }   (safe fields only)
 * Order history reuses the existing admin scope on orders:
 *   GET /api/orders?userId=<id>        (admin JWT) → { orders, total, page, pages }
 *
 * User (safe fields): { _id, name, email, phone, isVerified, savedAddresses[],
 *                       defaultAddress, createdAt, updatedAt }
 */
import { adminApi } from '../lib/adminApi.js';
import { toRow as toOrderRow } from '../orders/orderService.js';

function toRow(u) {
  return {
    id: String(u._id),
    name: u.name || '—',
    email: u.email || '',
    phone: u.phone || '',
    verified: Boolean(u.isVerified),
    createdAt: u.createdAt,
    addressCount: (u.savedAddresses || []).length,
  };
}

export async function listCustomers({ search, page = 1, limit = 20 } = {}) {
  const params = { page, limit };
  if (search) params.search = search;
  const { data } = await adminApi.get('/users', { params, headers: { 'x-admin': '1' } });
  return {
    rows: Array.isArray(data?.users) ? data.users.map(toRow) : [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    pages: data?.pages ?? 0,
  };
}

/** Full user record for the detail page, or null if not found. */
export async function getCustomer(id) {
  try {
    const { data } = await adminApi.get(`/users/${id}`, { headers: { 'x-admin': '1' } });
    return data?.user ?? null;
  } catch (err) {
    if (err?.code === 404 || err?.code === 400) return null;
    throw err;
  }
}

/** The customer's orders (admin scope), mapped to the shared order-row shape. */
export async function getCustomerOrders(userId) {
  const { data } = await adminApi.get('/orders', {
    params: { userId, limit: 50 },
    headers: { 'x-admin': '1' },
  });
  return Array.isArray(data?.orders) ? data.orders.map(toOrderRow) : [];
}
