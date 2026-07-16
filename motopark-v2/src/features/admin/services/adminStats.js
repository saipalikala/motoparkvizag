/**
 * services/adminStats.js — dashboard summary metrics.
 *
 * Backed by the dedicated aggregation endpoint added in Milestone 6:
 *   GET /api/admin/stats  (admin JWT) → { totalRevenue, totalOrders,
 *                                         activeProducts, totalCustomers }
 *
 * Revenue is summed server-side (MongoDB $group, cancelled/returned excluded) —
 * never computed in the client. A failed request rejects; AdminDashboard
 * degrades every tile to its placeholder dash.
 */
import { adminApi } from '../lib/adminApi.js';

export async function getDashboardStats() {
  const { data } = await adminApi.get('/admin/stats');
  return {
    revenue: data?.totalRevenue ?? null,
    orders: data?.totalOrders ?? null,
    products: data?.activeProducts ?? null,
    customers: data?.totalCustomers ?? null,
  };
}
