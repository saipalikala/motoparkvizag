/**
 * lib/analytics.js — Google Analytics 4, loaded DEFERRED to protect Core Web Vitals.
 *
 * The gtag library is NOT injected on first paint. We wait for the browser to go
 * idle (requestIdleCallback, or a post-`load` timeout fallback) before adding the
 * <script>, so GA never competes with the LCP image or blocks the main thread
 * during hydration. Page views fired before the library lands are queued and
 * flushed once it initializes.
 *
 * Enabled ONLY when VITE_GA_MEASUREMENT_ID is set (prod). In dev/preview without
 * the env var, every function is a no-op — no network, no globals.
 *
 * SPA tracking: GA is configured with `send_page_view: false`; each route change
 * sends a manual `page_view` (see hooks/usePageViews.js). That avoids the double
 * count you'd get from GA's automatic first hit plus our own.
 */

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
const ENABLED = typeof GA_ID === 'string' && GA_ID.length > 0;

let loaded = false; // gtag initialized (stub + config in place)
let loading = false; // idle-load scheduled/in-flight
const queue = []; // page paths recorded before gtag was ready

function sendPageView(path) {
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}

function initGtag() {
  if (loaded) return;
  loaded = true;

  window.dataLayer = window.dataLayer || [];
  // Real gtag: pushes arguments onto dataLayer. Calls made before the remote
  // library arrives are buffered there and processed once it loads.
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;

  gtag('js', new Date());
  gtag('config', GA_ID, { send_page_view: false });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(script);

  // Flush anything recorded before we were ready.
  while (queue.length) sendPageView(queue.shift());
}

/** Defer gtag injection until the browser is idle (protects LCP/TBT). */
function scheduleLoad() {
  if (loaded || loading) return;
  loading = true;

  const start = () => initGtag();
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(start, { timeout: 4000 });
  } else if (document.readyState === 'complete') {
    setTimeout(start, 1200);
  } else {
    window.addEventListener('load', () => setTimeout(start, 1200), { once: true });
  }
}

/** Kick off the deferred GA load. Safe to call more than once. No-op if disabled. */
export function initAnalytics() {
  if (!ENABLED) return;
  scheduleLoad();
}

/** Record a SPA page view. Queues + triggers the deferred load if GA isn't up yet. */
export function trackPageView(path) {
  if (!ENABLED) return;
  if (!loaded) {
    queue.push(path);
    scheduleLoad();
    return;
  }
  sendPageView(path);
}

/** True when a measurement ID is configured (useful for guarding custom events). */
export const analyticsEnabled = ENABLED;
