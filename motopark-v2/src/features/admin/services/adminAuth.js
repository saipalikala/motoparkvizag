/**
 * services/adminAuth.js — sole caller of adminApi for authentication.
 * Mirrors the storefront services convention (components/contexts never touch
 * the API client directly).
 *
 * Backend contract (backend/controllers/adminController.js):
 *   POST /api/admin/login  { email, password } → { token }   (NO user object)
 *   POST /api/admin/logout                     → { message }  (revokes token)
 */
import { adminApi } from '../lib/adminApi.js';

export async function login({ email, password }) {
  const { data } = await adminApi.post('/admin/login', { email, password });
  return data.token;
}

/** Best-effort server-side revoke. Local token clearing is the caller's job and
 *  must happen regardless of whether this succeeds. */
export async function logout() {
  try {
    await adminApi.post('/admin/logout');
  } catch {
    /* token may already be expired/revoked — clearing locally is enough */
  }
}
