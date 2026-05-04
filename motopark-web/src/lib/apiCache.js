const TTL      = 5 * 60 * 1000;
const memCache = new Map();
const inFlight = new Map();

const readSession = (key) => {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { data, time } = JSON.parse(raw);
    if (Date.now() - time < TTL) return { data, time };
  } catch {}
  return null;
};

const writeSession = (key, data) => {
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, time: Date.now() }));
  } catch {}
};

export function cachedFetch(url, { force = false, signal } = {}) {
  const key = `api:${url}`;

  // Caller aborted before we even started — bail silently
  if (signal?.aborted) return Promise.reject(new DOMException("Aborted", "AbortError"));

  if (!force) {
    const mem = memCache.get(key);
    if (mem && Date.now() - mem.time < TTL) return Promise.resolve(mem.data);

    const sess = readSession(key);
    if (sess) {
      memCache.set(key, sess);
      return Promise.resolve(sess.data);
    }

    if (inFlight.has(key)) {
      // Shared in-flight promise — but respect caller's abort signal
      const shared = inFlight.get(key);
      if (!signal) return shared;
      // Wrap: reject if caller aborts, but don't cancel the shared fetch
      return new Promise((resolve, reject) => {
        signal.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")), { once: true }
        );
        shared.then(resolve).catch(reject);
      });
    }
  } else {
    memCache.delete(key);
    try { sessionStorage.removeItem(key); } catch {}
  }

  // Fire ONE network request — NO signal here intentionally.
  // Individual callers can abort their own wait (above) without
  // killing the shared fetch that other components depend on.
  const p = fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status} from ${url}`);
      return r.json();
    })
    .then((data) => {
      const entry = { data, time: Date.now() };
      memCache.set(key, entry);
      writeSession(key, data);
      return data;
    })
    .finally(() => inFlight.delete(key));

  inFlight.set(key, p);

  // Still respect caller's signal for their personal wait
  if (!signal) return p;
  return new Promise((resolve, reject) => {
    signal.addEventListener("abort", () =>
      reject(new DOMException("Aborted", "AbortError")), { once: true }
    );
    p.then(resolve).catch(reject);
  });
}

export function invalidateCache(url) {
  const key = `api:${url}`;
  memCache.delete(key);
  try { sessionStorage.removeItem(key); } catch {}
}

export function invalidateAll() {
  memCache.clear();
  try {
    Object.keys(sessionStorage)
      .filter(k => k.startsWith("api:"))
      .forEach(k => sessionStorage.removeItem(k));
  } catch {}
}