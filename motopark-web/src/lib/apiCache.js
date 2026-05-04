// ─────────────────────────────────────────────────────────────────────────────
//  apiCache.js  —  memory + sessionStorage cache with stale-while-revalidate
//
//  Key additions vs original:
//    • freshOnly: true  → skip cache entirely, always go to network (used by
//                         the carousel so deleted images never flash)
//    • CACHE_VERSION    → bump this string any time your data shape changes;
//                         all old sessionStorage entries are wiped on boot
//    • revalidate()     → background-refresh a URL without blocking the caller
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_VERSION = "v2";          // ← bump when Cloudinary URLs change shape
const SESSION_PREFIX = `api:${CACHE_VERSION}:`;
const TTL = 5 * 60 * 1000;          // 5 min

const memCache = new Map();
const inFlight = new Map();

// ── helpers ──────────────────────────────────────────────────────────────────

function sessionKey(url) {
  return `${SESSION_PREFIX}${url}`;
}

const readSession = (url) => {
  try {
    const raw = sessionStorage.getItem(sessionKey(url));
    if (!raw) return null;
    const { data, time } = JSON.parse(raw);
    if (Date.now() - time < TTL) return { data, time };
  } catch {}
  return null;
};

const writeSession = (url, data) => {
  try {
    sessionStorage.setItem(sessionKey(url), JSON.stringify({ data, time: Date.now() }));
  } catch {}
};

// On module load: wipe any sessionStorage entries from previous cache versions.
// This is the primary defence against stale Cloudinary image URLs surviving
// across deployments.
(function purgeOldVersions() {
  try {
    const keysToDelete = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k?.startsWith("api:") && !k.startsWith(SESSION_PREFIX)) {
        keysToDelete.push(k);
      }
    }
    keysToDelete.forEach((k) => sessionStorage.removeItem(k));
  } catch {}
})();

// ── core fetch ───────────────────────────────────────────────────────────────

/**
 * cachedFetch(url, options)
 *
 * @param {string}  url
 * @param {object}  options
 * @param {boolean} options.force      — bypass read cache, force network request
 * @param {boolean} options.freshOnly  — NEVER serve from cache (carousel use-case)
 *                                       Still deduplicates concurrent calls.
 * @param {AbortSignal} options.signal — caller's abort signal
 */
export function cachedFetch(url, { force = false, freshOnly = false, signal } = {}) {
  const memKey = url; // mem map key (no version prefix needed — it's in-process)

  if (signal?.aborted) {
    return Promise.reject(new DOMException("Aborted", "AbortError"));
  }

  // ── freshOnly: skip all cache reads, straight to network ──────────────────
  if (!freshOnly && !force) {
    const mem = memCache.get(memKey);
    if (mem && Date.now() - mem.time < TTL) return Promise.resolve(mem.data);

    const sess = readSession(url);
    if (sess) {
      memCache.set(memKey, sess);
      return Promise.resolve(sess.data);
    }
  } else {
    // force / freshOnly: clear stale entries so nothing leaks back
    memCache.delete(memKey);
    try { sessionStorage.removeItem(sessionKey(url)); } catch {}
  }

  // ── deduplicate in-flight requests ────────────────────────────────────────
  if (inFlight.has(memKey)) {
    const shared = inFlight.get(memKey);
    if (!signal) return shared;
    return abortableWrap(shared, signal);
  }

  // ── fire ONE network request ──────────────────────────────────────────────
  // No signal on the underlying fetch intentionally — individual callers can
  // cancel their own wait without killing the shared request.
  const p = fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status} from ${url}`);
      return r.json();
    })
    .then((data) => {
      const entry = { data, time: Date.now() };
      memCache.set(memKey, entry);
      // freshOnly callers don't pollute the session cache
      if (!freshOnly) writeSession(url, data);
      return data;
    })
    .finally(() => inFlight.delete(memKey));

  inFlight.set(memKey, p);

  if (!signal) return p;
  return abortableWrap(p, signal);
}

// ── background revalidation ──────────────────────────────────────────────────

/**
 * Silently refresh a URL in the background so the *next* render gets
 * fresh data, without blocking the current one.
 */
export function revalidate(url) {
  cachedFetch(url, { force: true }).catch(() => {
    // swallow — this is best-effort background work
  });
}

// ── manual invalidation ──────────────────────────────────────────────────────

export function invalidateCache(url) {
  memCache.delete(url);
  try { sessionStorage.removeItem(sessionKey(url)); } catch {}
}

export function invalidateAll() {
  memCache.clear();
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(SESSION_PREFIX))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch {}
}

// ── internal helper ──────────────────────────────────────────────────────────

function abortableWrap(promise, signal) {
  return new Promise((resolve, reject) => {
    signal.addEventListener(
      "abort",
      () => reject(new DOMException("Aborted", "AbortError")),
      { once: true }
    );
    promise.then(resolve).catch(reject);
  });
}