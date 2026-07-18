/**
 * scripts/generate-hero-images.mjs — one-off responsive variant generator.
 *
 * WHY this is NOT part of `npm run build`: sharp is a native binary. Putting it
 * in the Vercel build path adds install time, a platform-specific artifact, and
 * a new way for a deploy to fail — to regenerate files that change roughly never.
 * So the outputs are committed to public/ and this script is run by hand when the
 * hero art changes:
 *
 *     npm run images
 *
 * WHY the hero moved from src/assets/ to public/: importing it through JS
 * (`import heroImg from '@/assets/hero.jpg'`) meant its URL only existed after
 * index.js AND HomePage.js had downloaded, parsed and executed. The browser's
 * preload scanner — which reads raw HTML bytes before any JS runs — never saw the
 * LCP image, so discovery was gated behind two round trips of JavaScript. A
 * static path in public/ plus a <link rel="preload"> in index.html lets the
 * scanner start the fetch in the first few milliseconds.
 *
 * Widths: exactly two, selected by MEDIA QUERY rather than srcset width
 * descriptors — 960 below 768px, 1600 at and above it.
 *
 * WHY not `srcset`+`sizes` (measured 2026-07-18): with w-descriptors the preload
 * scanner and the layout engine each compute "needed width" independently, and
 * they can disagree — observed the scanner fetching hero-960.avif at 11ms while
 * the <img> then fetched hero-1280.avif at 170ms. TWO full downloads of the LCP
 * image, which is strictly worse than having no preload at all.
 *
 * Media queries remove the guesswork: both the scanner and layout evaluate the
 * same boolean against the same viewport, so the preload and the <picture> can
 * never diverge. The cost is coarser DPR fitting, which is irrelevant here — the
 * hero is a soft-focus photograph sitting under a heavy scrim, where resolution
 * differences are invisible but a duplicate download is not.
 */
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { stat } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src', 'assets', 'hero.jpg');
const OUT_DIR = join(ROOT, 'public');

const WIDTHS = [960, 1600];

// AVIF q50 and WebP q72 are chosen for a large, softly-lit photographic hero
// sitting under a scrim — banding and fine detail loss are not visible through
// the overlay, so quality can go lower than a product shot would allow.
const FORMATS = [
  { ext: 'avif', apply: (p) => p.avif({ quality: 50, effort: 6 }) },
  { ext: 'webp', apply: (p) => p.webp({ quality: 72 }) },
  { ext: 'jpg', apply: (p) => p.jpeg({ quality: 78, mozjpeg: true }) },
];

const kb = (n) => `${(n / 1024).toFixed(1)} kB`;

async function main() {
  const original = await stat(SRC);
  console.log(`\n  source: src/assets/hero.jpg  ${kb(original.size)}\n`);

  for (const width of WIDTHS) {
    for (const { ext, apply } of FORMATS) {
      const name = `hero-${width}.${ext}`;
      const out = join(OUT_DIR, name);
      await apply(sharp(SRC).resize({ width, withoutEnlargement: true })).toFile(out);
      const { size } = await stat(out);
      const delta = Math.round((1 - size / original.size) * 100);
      console.log(`  public/${name.padEnd(18)} ${kb(size).padStart(9)}  (${delta}% smaller)`);
    }
  }
  console.log('\n  Done. Commit the generated files.\n');
}

main().catch((err) => {
  console.error('✗ hero images:', err.message);
  process.exit(1);
});
