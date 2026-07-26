import { adminApi } from '../lib/adminApi.js';

export async function listCoupons(includeArchived = false) {
  const { data } = await adminApi.get('/coupons', {
    params: { includeArchived },
  });
  return Array.isArray(data) ? data : [];
}

export async function createCoupon(model) {
  const { data } = await adminApi.post('/coupons', model);
  return data;
}

export async function updateCoupon(id, model) {
  const { data } = await adminApi.put(`/coupons/${id}`, model);
  return data;
}

export async function archiveCoupon(id) {
  const { data } = await adminApi.delete(`/coupons/${id}`);
  return data;
}
