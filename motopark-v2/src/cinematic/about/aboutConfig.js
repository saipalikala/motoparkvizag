/**
 * aboutConfig.js — ALL About cinematic configuration in one place.
 *
 * ─── How to create a new cinematic section ────────────────────────────────────
 *
 * 1. Duplicate this file as e.g. `src/cinematic/track/trackConfig.js`
 * 2. Update SEQUENCE_CONFIG, SCROLL_CONFIG, OVERLAYS, and story data.
 * 3. Duplicate `AboutCinematic.jsx` and swap the config import.
 * 4. Register a new route in router.jsx pointing to the new page component.
 * 5. The engine (src/cinematic/engine/) requires ZERO changes.
 *
 * ─── Updating frame count ─────────────────────────────────────────────────────
 *
 * When you add frames to  public/cinematic/sequence/ :
 *   1. Set SEQUENCE_CONFIG.totalFrames  = actual frame count
 *   2. Set SEQUENCE_CONFIG.hasFrames    = true
 *   3. Run `npm run dev` and scroll through /about to verify timing.
 *   4. Tune OVERLAYS[n].startProgress / peakProgress / endProgress to taste.
 *
 * ─── Frame naming convention ──────────────────────────────────────────────────
 *
 *   public/cinematic/sequence/frame0001.webp
 *   public/cinematic/sequence/frame0002.webp
 *   ...
 *   public/cinematic/sequence/frame[totalFrames].webp
 *
 * ─── Reference images ─────────────────────────────────────────────────────────
 *
 *   public/cinematic/references/tunnel-start.png    ← shown as fallback until frames load
 *   public/cinematic/references/motopark-arrival.png
 */

import { STORE } from '@/config/store.js';

// ─── Sequence / frame loader ───────────────────────────────────────────────────

export const SEQUENCE_CONFIG = {
  frameBaseUrl:     '/cinematic/sequence/ezgif-frame-',
  frameExt:         '.jpg',
  framePadding:     3,     // 3-digit zero-padding → ezgif-frame-001.jpg

  totalFrames: 192,
  hasFrames:   true,

  /** Shown on canvas until first frame loads, and on mobile. */
  fallbackImageUrl: '/cinematic/references/tunnel-start.png',

  /** Unique key for the module-level frame cache. Increment ('about-v2') to bust. */
  cacheKey: 'about-v1',
};

// ─── Scroll engine ─────────────────────────────────────────────────────────────

export const SCROLL_CONFIG = {
  /** How much scroll distance the canvas pin occupies. More = slower playback feel. */
  scrollHeight: '400vh',
  /** GSAP scrub: 0 = instant 1:1, 1 = 1-second lag, 0.8 = smooth Apple-style. */
  scrub: 0.8,
  start: 'top top',
};

// ─── Text overlays ─────────────────────────────────────────────────────────────
//
// Each overlay fades in from startProgress → peakProgress, then fades out
// → endProgress. All values are scroll-progress fractions [0, 1].
//
// Alignment: 'left' | 'center' | 'right'
// Size:      'sm' | 'md' | 'lg'

export const OVERLAYS = [
  {
    id:            'preparation',
    text:          'Every ride begins\nwith preparation.',
    sub:           null,
    size:          'sm',
    align:         'center',
    startProgress: 0.04,
    peakProgress:  0.13,
    endProgress:   0.27,
  },
  {
    id:            'brand',
    text:          'We Are MotoPark.',
    sub:           'Premium riding gear. Built for the road.',
    size:          'lg',
    align:         'center',
    startProgress: 0.36,
    peakProgress:  0.48,
    endProgress:   0.63,
  },
  {
    id:            'arrival',
    text:          `Est. ${STORE.established}`,
    sub:           `${STORE.city}, India`,
    size:          'md',
    align:         'center',
    startProgress: 0.72,
    peakProgress:  0.83,
    endProgress:   0.97,
  },
];

// ─── Story section — stats ─────────────────────────────────────────────────────

export const STATS = [
  { value: 5000,  suffix: '+', label: 'Happy Riders' },
  { value: 25,    suffix: '+', label: 'Trusted Brands' },
  { value: 120,   suffix: '+', label: 'Products' },
  { value: 4,     suffix: '+', label: 'Years Est.' },
];

// ─── Story section — values ────────────────────────────────────────────────────

export const VALUES = [
  {
    id:    'genuine',
    title: 'Genuine, Always',
    desc:  'Every product is sourced directly from the brand or an authorised distributor. No fakes, ever.',
    // Inline SVG path for a shield icon
    svgPath: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  },
  {
    id:    'safety',
    title: 'Safety Before Style',
    desc:  'The right gear for your ride — from the daily commute to the weekend escape to the cross-country adventure.',
    // Inline SVG paths for a star icon
    svgPath: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  },
  {
    id:    'community',
    title: 'Rider Community',
    desc:  'We ride too — so we stock what we would put on ourselves and the people we ride with.',
    // Inline SVG paths for a users icon (two paths)
    svgPath: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2',
    svgPath2: 'M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    extraPaths: ['M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
    circleAttrs: { cx: 9, cy: 7, r: 4 },
  },
];

// ─── Story section — narrative ─────────────────────────────────────────────────

export const STORY_SECTIONS = [
  {
    id:      'origin',
    eyebrow: 'Our Story',
    heading: 'Born from a passion\nfor the road.',
    body: [
      'MotoPark started with a simple idea: riders deserve genuine gear and honest advice, not upsells. What began as a single showroom in Vizag has grown into a shop trusted by thousands of riders across the country.',
      'We ride too — so we stock what we would put on ourselves and the people we ride with.',
    ],
  },
  {
    id:      'mission',
    eyebrow: 'From Vizag, for all of India',
    heading: 'Genuine gear.\nHonest advice.',
    body: [
      `We carry ${STORE.brandsCount} trusted brands and have served ${STORE.ridersServed} riders, shipping Pan-India from our Visakhapatnam store.`,
      'Visit us in person, or shop online — the gear is the same, and so is the promise.',
    ],
  },
];

// ─── Story section — call to action ───────────────────────────────────────────

export const CTA = {
  eyebrow: 'Ready to ride?',
  heading: 'Gear up.\nRide on.',
  sub:     'Browse our full collection of premium motorcycle gear.',
  button:  'Explore the Store',
  href:    '/store',
};
