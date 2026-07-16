/**
 * lib/apiCache.js — a tiny read-through cache for GET-style loaders.
 *
 * Two jobs:
 *   1. TTL cache   — a resolved value is reused until it goes stale, so repeated
 *                    reads (e.g. every navbar mount / route change) don't re-hit
 *                    the network.
 *   2. In-flight dedupe — concurrent callers for the same key share ONE promise,
 *                    so a burst (hover storm, parallel components) fires a single
 *                    request instead of many.
 *
 * Deliberately minimal and dependency-free. Keys are caller-chosen strings.
 * A rejected load is never cached — the next call retries.
 */
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

const resolved = new Map(); // key -> { at: epochMs, value }
const inflight = new Map(); // key -> Promise

/**
 * @param {string} key                     cache identity
 * @param {() => Promise<T>} loader         produces the value on a miss
 * @param {{ ttl?: number }} [opts]
 * @returns {Promise<T>}
 */
export function cached(key, loader, { ttl = DEFAULT_TTL } = {}) {
  const hit = resolved.get(key);
  if (hit && Date.now() - hit.at < ttl) return Promise.resolve(hit.value);

  const pending = inflight.get(key);
  if (pending) return pending;

  const p = Promise.resolve()
    .then(loader)
    .then((value) => {
      resolved.set(key, { at: Date.now(), value });
      inflight.delete(key);
      return value;
    })
    .catch((err) => {
      inflight.delete(key); // never cache a failure — allow retry
      throw err;
    });

  inflight.set(key, p);
  return p;
}

/** Drop a cached entry (and any in-flight promise) so the next read refetches. */
export function invalidate(key) {
  resolved.delete(key);
  inflight.delete(key);
}

/** Clear the whole cache — handy for tests. */
export function clearCache() {
  resolved.clear();
  inflight.clear();
}
