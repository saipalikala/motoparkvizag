/**
 * features/admin/categories/categoryService.js — sole adminApi caller for
 * category CRUD.
 *
 * Backend contract (backend/routes/categoryRoutes.js + categoryModel.js):
 *   Category = { name (req), slug (req, unique, AUTO-derived from name), image?, description? }
 *   GET    /api/categories            → array (public)
 *   POST   /api/categories            { name, image, description }   (admin) — slug auto-generated
 *   PUT    /api/categories/:id        { name, image, description }   (admin) — slug re-derived from name
 *   DELETE /api/categories/:id                                       (admin)
 *
 * Image is a URL STRING (the category route has no multer). To attach an image
 * we upload the file first via POST /api/upload/icon → { url }, then send the URL.
 */
import { adminApi } from '../lib/adminApi.js';

/** Client-side mirror of the backend's slug rule (for a live preview only). */
export function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function toRow(c) {
  return {
    id: String(c._id),
    name: c.name ?? '',
    slug: c.slug ?? '',
    image: c.image || null,
    description: c.description ?? '',
  };
}

export async function listCategories() {
  const { data } = await adminApi.get('/categories', { headers: { 'x-admin': '1' } });
  return Array.isArray(data) ? data.map(toRow) : [];
}

/** Upload an image file → returns the hosted Cloudinary URL. */
export async function uploadCategoryImage(file) {
  const fd = new FormData();
  fd.append('icon', file);
  const { data } = await adminApi.post('/upload/icon', fd);
  return data.url;
}

export async function createCategory({ name, image, description }) {
  const { data } = await adminApi.post('/categories', {
    name: name.trim(),
    image: image || '',
    description: description || '',
  });
  return data;
}

export async function updateCategory(id, { name, image, description }) {
  const { data } = await adminApi.put(`/categories/${id}`, {
    name: name.trim(),
    image: image || '',
    description: description || '',
  });
  return data;
}

export async function deleteCategory(id) {
  const { data } = await adminApi.delete(`/categories/${id}`);
  return data;
}
