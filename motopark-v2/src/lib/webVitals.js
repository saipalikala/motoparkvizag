/**
 * lib/webVitals.js — real-user Core Web Vitals reporting into GA4.
 *
 * WHY this is not optional instrumentation: docs/09 §14 and docs/11 §10 state the
 * budget as "LCP < 2.5s mobile **p75**". p75 is a FIELD statistic — it describes
 * the 75th-percentile real visitor on a real device on a real network. No lab
 * tool can produce it. Lighthouse gives you one synthetic run on an emulated
 * Moto G; useful for catching regressions, but it is not the number the budget
 * is written in, and treating it as such has been the gap between "we have
 * budgets" and "we enforce budgets".
 *
 * It also closes a second gap: **Lighthouse cannot measure INP at all.** INP
 * requires real interactions from real users. TBT is the lab proxy and is not
 * the same metric. Until this file existed, the INP budget was unmeasurable.
 *
 * Loading: web-vitals is dynamically imported after the page settles, so it never
 * competes with the LCP it is trying to measure. It also inherits analytics.js's
 * rule — nothing is sent, and nothing is even imported, unless a GA measurement
 * ID is configured.
 *
 * Reading the data: GA4 → Reports → Engagement → Events → `web_vitals`, broken
 * down by `metric_name` and `metric_rating`. For the p75 that the budget is
 * written in, use Explore with `metric_value` and a 75th-percentile aggregation,
 * segmented to mobile.
 */
import { analyticsEnabled } from './analytics.js';

/** GA4 rejects non-integer metric values, and CLS is a small decimal. */
function toInteger(name, value) {
  return Math.round(name === 'CLS' ? value * 1000 : value);
}

function send(metric) {
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', 'web_vitals', {
    metric_name: metric.name, // LCP | CLS | INP | TTFB | FCP
    metric_value: toInteger(metric.name, metric.value),
    metric_delta: toInteger(metric.name, metric.delta),
    metric_rating: metric.rating, // good | needs-improvement | poor
    // navigation id — lets you stitch several metrics to one page load without
    // identifying the user.
    metric_id: metric.id,
    non_interaction: true, // never affects bounce rate
  });
}

/**
 * Start reporting. Safe to call once, at app start. No-op without a GA ID.
 *
 * The metrics are reported when they finalize, not immediately: LCP resolves at
 * the first user interaction or page hide, CLS and INP accumulate for the whole
 * page lifetime and flush on hide. That is inherent to the metrics, not a delay
 * we chose — which is why this must be wired in well before cutover if the soak
 * window is going to produce usable p75 data.
 */
export function initWebVitals() {
  if (!analyticsEnabled) return;

  const start = async () => {
    try {
      const { onCLS, onINP, onLCP, onTTFB, onFCP } = await import('web-vitals');
      onCLS(send);
      onINP(send);
      onLCP(send);
      onTTFB(send);
      onFCP(send);
    } catch {
      // Never let instrumentation break the storefront.
    }
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(start, { timeout: 5000 });
  } else {
    setTimeout(start, 2000);
  }
}
