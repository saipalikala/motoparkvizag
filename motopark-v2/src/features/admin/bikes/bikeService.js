/**
 * features/admin/bikes/bikeService.js — sole adminApi caller for Bike (fitment)
 * CRUD (Milestone 8).
 *
 * Backend contract (backend/routes/bikeRoutes.js + bikeModel.js):
 *   Bike = { make (req), makeSlug (auto), model (req), slug (auto, model slug) }
 *   GET    /api/bikes         → array (public)
 *   POST   /api/bikes         { make, model }   (admin) — slugs auto-derived
 *   PUT    /api/bikes/:id     { make, model }   (admin) — slugs re-derived
 *   DELETE /api/bikes/:id                       (admin)
 *   POST   /api/bikes/auto-detect { title, description } → { ids, bikes } (admin)
 */
import { adminApi } from '../lib/adminApi.js';

/** Client-side mirror of the backend slug rule (live preview only). */
export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function toRow(b) {
  return {
    id: String(b._id),
    make: b.make ?? '',
    makeSlug: b.makeSlug ?? '',
    model: b.model ?? '',
    slug: b.slug ?? '',
    createdAt: b.createdAt,
  };
}

export async function listBikes() {
  const { data } = await adminApi.get('/bikes', { headers: { 'x-admin': '1' } });
  return Array.isArray(data) ? data.map(toRow) : [];
}

export async function createBike({ make, model }) {
  const { data } = await adminApi.post('/bikes', { make: make.trim(), model: model.trim() });
  return data;
}

export async function updateBike(id, { make, model }) {
  const { data } = await adminApi.put(`/bikes/${id}`, { make: make.trim(), model: model.trim() });
  return data;
}

export async function deleteBike(id) {
  const { data } = await adminApi.delete(`/bikes/${id}`);
  return data;
}

/**
 * Suggest fitment from product copy (Milestone 10). Returns the matched bike ids;
 * the caller merges them into the form's selection — the admin still reviews and
 * saves, so this never writes on its own.
 */
export async function autoDetectFitment({ title, description }) {
  const { data } = await adminApi.post('/bikes/auto-detect', {
    title: title ?? '',
    description: description ?? '',
  });
  return Array.isArray(data?.ids) ? data.ids.map(String) : [];
}
