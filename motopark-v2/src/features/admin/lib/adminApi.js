import axios from 'axios';

/**
 * adminApi — the admin realm's OWN axios client, deliberately separate from the
 * storefront `lib/api.js`. The two are different auth realms (docs/HANDOFF §3):
 *
 *   storefront → localStorage['mp-auth-token']  (user JWT, id+role)
 *   admin      → localStorage['adminToken']      (admin JWT, role:"admin")
 *
 * Keeping a dedicated instance means attaching the admin Bearer token can never
 * clobber — or be clobbered by — the storefront session, and vice versa.
 */
export const ADMIN_TOKEN_KEY = 'adminToken';

/** Fired when the backend rejects the admin token (401). AdminAuthContext listens
 *  and drops the session so the route guard bounces to /admin/login. */
export const ADMIN_UNAUTHORIZED_EVENT = 'admin:unauthorized';

export const adminApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api',
  timeout: 15000,
});

adminApi.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {
    /* storage unavailable — proceed unauthenticated */
  }
  return config;
});

adminApi.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status ?? 0;

    // Expired/revoked/invalid admin token → clear it and let the guard redirect.
    // 403 (wrong role) is NOT a session death — surface it as an error instead.
    if (status === 401) {
      try {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        window.dispatchEvent(new CustomEvent(ADMIN_UNAUTHORIZED_EVENT));
      } catch {
        /* ignore */
      }
    }

    // Normalize to { code, message } — backend admin routes emit { message }.
    const message =
      err.response?.data?.message ??
      err.response?.data?.error?.message ??
      'Something went wrong. Please try again.';
    return Promise.reject({ code: status, message, raw: err });
  },
);
