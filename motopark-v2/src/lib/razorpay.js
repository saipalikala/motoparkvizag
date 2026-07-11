/**
 * Razorpay checkout.js loader — injected lazily, only at the payment step
 * (perf: never taxes the commerce bundle; docs/11 §10). Resolves true once the
 * global `window.Razorpay` is available, false on network failure.
 */
const SCRIPT_ID = 'razorpay-checkout-js';
const SRC = 'https://checkout.razorpay.com/v1/checkout.js';

export function loadRazorpay() {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) return resolve(true);
    if (document.getElementById(SCRIPT_ID)) {
      const existing = document.getElementById(SCRIPT_ID);
      existing.addEventListener('load', () => resolve(true), { once: true });
      existing.addEventListener('error', () => resolve(false), { once: true });
      return;
    }
    const s = document.createElement('script');
    s.id = SCRIPT_ID;
    s.src = SRC;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

/** The public Razorpay key (safe to expose). Set VITE_RAZORPAY_KEY_ID in .env. */
export const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || '';
