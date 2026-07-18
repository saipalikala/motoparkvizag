/**
 * scripts/check-budgets.mjs — deterministic performance tripwire.
 *
 * WHY this exists alongside Lighthouse: Lighthouse is the truth about user
 * experience, but it needs a deployed URL, takes minutes, and flakes by ±150ms
 * run to run. This runs in ~2 seconds against dist/, never flakes, and catches
 * the single most likely regression in this codebase by far — someone importing
 * a heavy library (three, drei, gsap) into a file the storefront statically
 * reaches, silently adding 200 kB to every shopper's first paint.
 *
 * It answers one question: "how many bytes does a visitor landing on / actually
 * download before the page is interactive?"
 *
 * HOW the route is resolved: Vite's build manifest maps every source module to
 * its output chunk plus that chunk's STATIC imports (`imports`) and its lazy
 * ones (`dynamicImports`). The "/" route costs:
 *     entry chunk + entry's transitive static imports
 *   + HomePage chunk + HomePage's transitive static imports
 * Dynamic imports are deliberately NOT counted — that is the whole point of the
 * lazy boundary. If the cinematic layer is wired correctly, `three` appears in
 * dynamicImports and never lands in this total. If someone breaks the boundary,
 * it moves into `imports` and this script fails the build.
 *
 * WHICH unit: brotli. Vercel serves brotli to every modern browser, and
 * Lighthouse reports transfer size, so brotli is the number a customer in Vizag
 * actually downloads. docs/09 §14 and docs/11 §10 state the budget in these
 * terms. Gzip is printed alongside for continuity with older measurements.
 *
 * Exit code 1 fails the build. That is intentional and is the enforcement docs/11
 * §10 asks for ("regressions block") but never had.
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { gzipSync, brotliCompressSync, constants as zlibConstants } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');

/* ── Budgets (docs/09 §14, docs/11 §10) ─────────────────────────────── */

const BUDGETS = {
  routeJs: 180 * 1024, // transferred (brotli) JS for the "/" route
  routeCss: 50 * 1024, // transferred (brotli) CSS for the "/" route
};

/** Source-module keys we treat as route roots. */
const HOME_MODULE_MATCH = 'pages/home/HomePage.jsx';

/* ── Helpers ────────────────────────────────────────────────────────── */

const brotli = (buf) =>
  brotliCompressSync(buf, {
    params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 },
  }).length;

const kb = (n) => `${(n / 1024).toFixed(1)} kB`;

function pct(used, budget) {
  return `${Math.round((used / budget) * 100)}%`;
}

/**
 * Walk `imports` (static only) transitively from a manifest entry.
 * Returns a Set of manifest keys including the starting one.
 */
function collectStatic(manifest, startKey, seen = new Set()) {
  if (!startKey || seen.has(startKey)) return seen;
  const node = manifest[startKey];
  if (!node) return seen;
  seen.add(startKey);
  for (const dep of node.imports ?? []) collectStatic(manifest, dep, seen);
  return seen;
}

/* ── Main ───────────────────────────────────────────────────────────── */

async function main() {
  if (!existsSync(DIST)) {
    console.error('✗ budgets: dist/ not found — run `vite build` first.');
    process.exit(1);
  }

  // Vite 5+ writes the manifest to dist/.vite/manifest.json.
  const manifestPath = join(DIST, '.vite', 'manifest.json');
  if (!existsSync(manifestPath)) {
    console.error(
      '✗ budgets: dist/.vite/manifest.json not found. Is `build.manifest: true` set in vite.config.js?',
    );
    process.exit(1);
  }
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

  const entryKey = Object.keys(manifest).find((k) => manifest[k].isEntry);
  if (!entryKey) {
    console.error('✗ budgets: no entry chunk in manifest.');
    process.exit(1);
  }

  const homeKey = Object.keys(manifest).find((k) => k.includes(HOME_MODULE_MATCH));
  if (!homeKey) {
    console.warn(
      `⚠ budgets: no manifest key matching "${HOME_MODULE_MATCH}" — measuring entry only.`,
    );
  }

  // The "/" route = entry + its static deps, plus HomePage + its static deps.
  const keys = collectStatic(manifest, entryKey);
  if (homeKey) collectStatic(manifest, homeKey, keys);

  // Resolve to unique output files (JS + the CSS each chunk pulls in).
  const jsFiles = new Set();
  const cssFiles = new Set();
  for (const k of keys) {
    const node = manifest[k];
    if (node.file) jsFiles.add(node.file);
    for (const c of node.css ?? []) cssFiles.add(c);
  }

  const rows = [];
  let jsTotal = 0;
  let cssTotal = 0;

  for (const [set, kind] of [
    [jsFiles, 'js'],
    [cssFiles, 'css'],
  ]) {
    for (const file of set) {
      const abs = join(DIST, file);
      if (!existsSync(abs)) continue;
      const buf = await readFile(abs);
      const br = brotli(buf);
      const gz = gzipSync(buf).length;
      rows.push({ file, kind, raw: buf.length, gz, br });
      if (kind === 'js') jsTotal += br;
      else cssTotal += br;
    }
  }

  rows.sort((a, b) => b.br - a.br);

  console.log('\n  Route "/" — bytes a first-time visitor downloads\n');
  console.log(
    `  ${'chunk'.padEnd(42)} ${'raw'.padStart(10)} ${'gzip'.padStart(10)} ${'brotli'.padStart(10)}`,
  );
  console.log(`  ${'─'.repeat(42)} ${'─'.repeat(10)} ${'─'.repeat(10)} ${'─'.repeat(10)}`);
  for (const r of rows) {
    console.log(
      `  ${r.file.padEnd(42)} ${kb(r.raw).padStart(10)} ${kb(r.gz).padStart(10)} ${kb(r.br).padStart(10)}`,
    );
  }

  /* ── Isolation check (docs/11 §7b) ────────────────────────────────
   *
   * This looks INSIDE chunks, not just at their boundaries. The manifest alone
   * is not enough: a small first-party module merged into an existing chunk
   * appears nowhere in it. That gap was found by planting a deliberate breach
   * (a static `import '@/cinematic/...'` in HomePage) and watching an earlier
   * version of this script pass it. dist/.vite/module-map.json — emitted by the
   * moduleMapPlugin in vite.config.js — closes it.
   */
  const HEAVY_MODULE_RE = /(^|\/)(src\/cinematic\/|node_modules\/(three|@react-three|gsap|lenis)(\/|$))/;
  const HEAVY_FILE_RE = /(^|[/_-])(three|react-three|r3f|gsap|lenis|cinematic)([._-]|$)/i;

  const leaks = [];
  for (const r of rows.filter((x) => x.kind === 'js')) {
    if (HEAVY_FILE_RE.test(r.file)) leaks.push(`${r.file} — chunk name (${kb(r.br)} brotli)`);
  }

  const mapPath = join(DIST, '.vite', 'module-map.json');
  if (existsSync(mapPath)) {
    const moduleMap = JSON.parse(await readFile(mapPath, 'utf8'));
    for (const file of jsFiles) {
      for (const mod of moduleMap[file] ?? []) {
        if (HEAVY_MODULE_RE.test(mod)) leaks.push(`${mod}\n          └─ merged into ${file}`);
      }
    }
  } else {
    console.warn('\n  ⚠ dist/.vite/module-map.json missing — isolation check is boundary-only.');
    console.warn('    Is moduleMapPlugin() still registered in vite.config.js?');
  }

  if (leaks.length) {
    console.error('\n  ✗ ISOLATION BREACH — cinematic/3D code is in the "/" STATIC graph:');
    for (const l of [...new Set(leaks)]) console.error(`      ${l}`);
    console.error('\n    src/cinematic/ and its libraries must be reached ONLY via a dynamic');
    console.error('    import() from pages/home (docs/11 §7b). A static import merges them');
    console.error('    into the commerce bundle that every shopper downloads.');
  }
  const leaked = leaks;

  const jsOver = jsTotal > BUDGETS.routeJs;
  const cssOver = cssTotal > BUDGETS.routeCss;

  console.log('');
  console.log(
    `  JS   ${kb(jsTotal).padStart(9)} / ${kb(BUDGETS.routeJs)}  (${pct(jsTotal, BUDGETS.routeJs)})  ${jsOver ? '✗ OVER' : '✓'}`,
  );
  console.log(
    `  CSS  ${kb(cssTotal).padStart(9)} / ${kb(BUDGETS.routeCss)}  (${pct(cssTotal, BUDGETS.routeCss)})  ${cssOver ? '✗ OVER' : '✓'}`,
  );
  console.log('');

  if (jsOver || cssOver || leaked.length) {
    console.error('  Build failed on performance budget (docs/11 §10).\n');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('✗ budgets: unexpected failure —', err.message);
  process.exit(1);
});
