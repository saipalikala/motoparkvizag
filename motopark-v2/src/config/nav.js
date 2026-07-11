/**
 * Navigation configuration — static seed for the layout chrome.
 * Structure mirrors the locked IA (docs/03 §3). When the CMS navbar
 * service is wired (services/navbar.js), this file becomes the
 * fallback/default — the SHAPE here is the contract either way.
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
