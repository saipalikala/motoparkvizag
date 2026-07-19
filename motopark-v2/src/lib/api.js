import axios from 'axios';

/**
 * Single API client for the existing Express backend (../backend — untouched).
 * Base URL via env so dev/prod need no code change.
 * V1 backend currently serves /api/*; the /api/v1 surface (docs/05) will be
 * adopted here when the backend evolution lands — one constant to change.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api',
  withCredentials: true, // harmless; V1 auth is Bearer-token, cookie for future V2 backend
  timeout: 15000,
});

/**
 * Auth: the live V1 backend authenticates via `Authorization: Bearer <jwt>`
 * (NOT cookies). The token is kept in localStorage under this key; the request
 * interceptor attaches it. When the V2 backend adopts httpOnly cookies (docs/05),
 * drop this interceptor — nothing else changes.
 */
export const AUTH_TOKEN_KEY = 'mp-auth-token';

api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {
    /* storage unavailable — proceed unauthenticated */
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Normalize to the DS error envelope shape { code, message }.
    //
    // Three shapes exist in this backend and all three must be handled:
    //   { message: "..." }          — most routes
    //   { error: { message: "..." } } — nested envelope
    //   { error: "..." }            — the AI routes (ai/aiController.js)
    //
    // The third was missing, and it is not a cosmetic gap: a 503 from
    // /api/ai/chat carries {error: "AI assistant is not configured yet."} —
    // an exactly-correct, actionable message — and it was being discarded in
    // favour of "Something went wrong. Please try again." A misconfigured
    // provider key therefore looked identical to a network failure.
    const data = err.response?.data;
    const message =
      (typeof data?.error === 'string' ? data.error : null) ??
      data?.error?.message ??
      data?.message ??
      'Something went wrong. Please try again.';
    return Promise.reject({ code: err.response?.status ?? 0, message, raw: err });
  },
);
