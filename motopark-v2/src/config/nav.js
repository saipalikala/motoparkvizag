/**
 * Navigation configuration — the static seed AND resilience fallback for the
 * layout chrome. Structure mirrors the locked IA (docs/03 §3).
 *
 * As of Milestone 7, the mega-menu categories and brands are fetched live from
 * the backend (services/navigation.js → NavContext). These arrays are the
 * initial state and the graceful fallback: if the API fails, the navbar keeps
 * rendering them, so navigation never breaks. Item shape `{ label, slug }` is
 * the contract either way.
 *
 * As of Milestone 10 BIKE_MENU is a fallback too, not the source: bikes come from
 * GET /api/bikes via NavContext, which adapts this flat make list into the grouped
 * `{ make, makeSlug, models }` shape when the API is unreachable. Consumers read
 * NavContext, never BIKE_MENU directly, so a make added in the admin panel appears
 * everywhere at once. NavContext is the ONLY importer of BIKE_MENU — keep it that
 * way; importing it in a page reintroduces the stale-menu bug this replaced.
 */

export const CATEGORY_MENU = [
  { label: 'Helmets', slug: 'helmets' },
  { label: 'Riding Gear', slug: 'riding-gear' },
  { label: 'Protection', slug: 'protection' },
  { label: 'Luggage', slug: 'luggage' },
  { label: 'Bike Parts', slug: 'bike-parts' },
  { label: 'Maintenance', slug: 'maintenance' },
  { label: 'Electronics', slug: 'electronics' },
  { label: 'Accessories', slug: 'accessories' },
];

export const BRAND_MENU = [
  { label: 'Axor', slug: 'axor' },
  { label: 'SMK', slug: 'smk' },
  { label: 'Viaterra', slug: 'viaterra' },
  { label: 'SHAD', slug: 'shad' },
  { label: 'MotoTorque', slug: 'mototorque' },
  { label: 'Red Rooster', slug: 'red-rooster' },
  { label: 'BMC', slug: 'bmc' },
  { label: '66BHP', slug: '66bhp' },
];

export const BIKE_MENU = [
  { label: 'Royal Enfield', slug: 'royal-enfield' },
  { label: 'Yamaha', slug: 'yamaha' },
  { label: 'KTM', slug: 'ktm' },
  { label: 'Bajaj', slug: 'bajaj' },
  { label: 'Honda', slug: 'honda' },
  { label: 'Suzuki', slug: 'suzuki' },
  { label: 'TVS', slug: 'tvs' },
  { label: 'Hero', slug: 'hero' },
];

/** Offer bar — single static message (Motion Doctrine: no rotation/looping). */
export const OFFER_MESSAGE = {
  text: 'Free shipping on orders above ₹2,000 — Pan-India',
  href: '/store',
};
