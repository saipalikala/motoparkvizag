/**
 * services/adminStats.js — cheap dashboard counts for Milestone 1.
 *
 * No dedicated admin-stats endpoint exists yet (backend is the shared V1 API,
 * not forked). So we derive counts from existing endpoints as cheaply as
 * possible:
 *   • products   → GET /products?limit=1  → data.total  (pagination meta)
 *   • categories → GET /categories        → array length
 *   • orders     → GET /orders?limit=1    → data.total  (admin JWT ⇒ all orders)
 *
 * Revenue has no aggregate endpoint on V1 → returned as null and rendered as a
 * placeholder tile; it gets wired for real in the Analytics milestone.
 *
 * Each stat resolves independently (Promise.allSettled) so one failing endpoint
 * never blanks the whole dashboard — failed stats come back as null.
 */
import { adminApi } from '../lib/adminApi.js';

export async function getDashboardStats() {
  const [products, categories, orders] = await Promise.allSettled([
    adminApi.get('/products', { params: { limit: 1 } }),
    adminApi.get('/categories'),
    adminApi.get('/orders', { params: { limit: 1 } }),
  ]);

  const ok = (r) => r.status === 'fulfilled';

  return {
    products: ok(products) ? products.value.data?.total ?? 0 : null,
    categories: ok(categories)
      ? Array.isArray(categories.value.data)
        ? categories.value.data.length
        : 0
      : null,
    orders: ok(orders) ? orders.value.data?.total ?? 0 : null,
    revenue: null, // no aggregate endpoint yet — wired in Analytics milestone
  };
}
