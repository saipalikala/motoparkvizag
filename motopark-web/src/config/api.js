// ============================================================
// src/config/api.js — SINGLE SOURCE OF TRUTH FOR API URL
// ✅ FIXED: strips trailing slash so paths like /api/products
//    never accidentally become //api/products
// ============================================================

export const API =
  (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "") + "/api";

/* ── Token ── */
const getToken = () => localStorage.getItem("adminToken");

const buildHeaders = (isFormData = false) => {
  const h = { Authorization: `Bearer ${getToken()}` };
  if (!isFormData) h["Content-Type"] = "application/json";
  return h;
};

/* ── Core request with JSON-guard + timeout ── */
const req = async (method, path, body = null, isFormData = false, timeoutMs = 15000) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const options = {
      method,
      headers: buildHeaders(isFormData),
      signal: ctrl.signal,
    };
    if (body) options.body = isFormData ? body : JSON.stringify(body);

    const res = await fetch(`${API}${path}`, options);

    if (res.status === 401) {
      localStorage.removeItem("adminToken");
      window.location.href = "/admin/login";
      return;
    }

    // ✅ Guard: if the backend returned HTML instead of JSON (wrong URL / cold start)
    //    we get the infamous "Unexpected token '<'" crash — surface a clear error instead.
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error(
        `Expected JSON but got "${contentType}" from ${API}${path} (${res.status}). ` +
        `Verify VITE_API_URL is set to your Railway backend URL.`
      );
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
    return data;

  } catch (err) {
    if (err.name === "AbortError") throw new Error("Request timed out — server may be starting up");
    throw err;
  } finally {
    clearTimeout(timer);
  }
};

/* ── Public convenience exports ── */
export const apiFetch = (path, opts = {}) =>
  req(opts.method || "GET", path, opts.body, opts.isFormData, opts.timeout);

export const uploadCarousel = (formData) =>
  req("POST", "/upload/carousel", formData, true, 60000);

export const uploadCarouselVideo = (formData) =>
  req("POST", "/upload/carousel-video", formData, true, 120000);

/* ── Admin CRUD helpers ── */
export const adminGet    = (path)       => req("GET",    path);
export const adminPost   = (path, body) => req("POST",   path, body);
export const adminPut    = (path, body) => req("PUT",    path, body);
export const adminDelete = (path)       => req("DELETE", path);
export const adminUpload = (path, fd)   => req("POST",   path, fd, true, 60000);