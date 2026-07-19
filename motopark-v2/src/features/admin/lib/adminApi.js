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

/**
 * Shown when axios reports no response at all. Distinguishing "the server said
 * no" from "the server was never reached" is the difference between a five
 * minute fix and an afternoon: a 401 means credentials, no-response means
 * config — a blocked CORS origin, an unset VITE_API_BASE_URL falling back to
 * localhost, or the API being down.
 */
const NETWORK_HINT =
  "Couldn't reach the API. Check VITE_API_BASE_URL on the frontend host and that this origin is allowed by the backend's CORS list.";

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

    // Normalize to { code, message }. Admin routes emit { message }, but handle
    // the other two envelope shapes too so a real server message is never
    // replaced by the generic fallback — see the note in lib/api.js.
    const data = err.response?.data;
    const message =
      data?.message ??
      data?.error?.message ??
      (typeof data?.error === 'string' ? data.error : null) ??
      // No response body at all means the request never reached the API:
      // a CORS rejection, a wrong VITE_API_BASE_URL, or the backend being down.
      (err.response ? 'Something went wrong. Please try again.' : NETWORK_HINT);
    return Promise.reject({ code: status, message, raw: err });
  },
);
