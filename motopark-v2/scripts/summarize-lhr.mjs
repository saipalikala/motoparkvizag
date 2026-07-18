/**
 * scripts/summarize-lhr.mjs — distil Lighthouse runs into a committable summary.
 *
 * WHY: a full Lighthouse report is ~540 kB of JSON, most of it screenshots and
 * per-audit detail tables. Committing five of them costs 2.8 MB, and docs/13 §6
 * asks for a fresh five-run capture after every deploy — so the naive approach
 * grows the repository by ~3 MB per measurement, permanently, for numbers that
 * fit in a few kilobytes.
 *
 * This keeps the evidence that matters (every run's metrics, so medians and
 * spread stay auditable) and discards the bulk. Raw reports stay in
 * .lighthouseci/ and perf/lhci/, both gitignored.
 *
 * Usage:
 *   node scripts/summarize-lhr.mjs <label> <file.json...>
 *   node scripts/summarize-lhr.mjs baseline-2026-07-18 .lighthouseci/lhr-*.json
 *
 * Writes perf/baseline/<label>.json
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'perf', 'baseline');

const METRICS = [
  'largest-contentful-paint',
  'first-contentful-paint',
  'cumulative-layout-shift',
  'total-blocking-time',
  'speed-index',
  'interactive',
];

const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const round = (n, d = 0) => Number(n.toFixed(d));

async function main() {
  const [label, ...files] = process.argv.slice(2);
  if (!label || files.length === 0) {
    console.error('usage: node scripts/summarize-lhr.mjs <label> <file.json...>');
    process.exit(1);
  }

  const runs = [];
  for (const f of files) {
    const r = JSON.parse(await readFile(f, 'utf8'));
    const m = {};
    for (const k of METRICS) if (r.audits[k]) m[k] = round(r.audits[k].numericValue, 3);
    const script = r.audits['resource-summary']?.details?.items?.find(
      (i) => i.resourceType === 'script',
    );
    runs.push({
      url: r.finalDisplayedUrl,
      fetchTime: r.fetchTime,
      score: round(r.categories.performance.score * 100),
      scriptTransferBytes: script?.transferSize ?? null,
      metrics: m,
    });
  }

  const summary = {
    label,
    capturedAt: new Date().toISOString(),
    lighthouseVersion: JSON.parse(await readFile(files[0], 'utf8')).lighthouseVersion,
    runCount: runs.length,
    conditions: 'mobile · simulate throttling · Moto G-class emulation · staging URL',
    medians: Object.fromEntries(
      METRICS.filter((k) => runs[0].metrics[k] !== undefined).map((k) => [
        k,
        round(median(runs.map((r) => r.metrics[k])), 3),
      ]),
    ),
    spread: Object.fromEntries(
      METRICS.filter((k) => runs[0].metrics[k] !== undefined).map((k) => {
        const v = runs.map((r) => r.metrics[k]);
        return [k, { min: round(Math.min(...v), 3), max: round(Math.max(...v), 3) }];
      }),
    ),
    runs,
  };

  await mkdir(OUT_DIR, { recursive: true });
  const out = join(OUT_DIR, `${label}.json`);
  await writeFile(out, JSON.stringify(summary, null, 2));
  console.log(`\n  wrote perf/baseline/${label}.json (${runs.length} runs)`);
  console.log(`  LCP median ${summary.medians['largest-contentful-paint']} ms`);
  console.log(
    `  LCP spread ${summary.spread['largest-contentful-paint'].min}–${summary.spread['largest-contentful-paint'].max} ms\n`,
  );
}

main().catch((e) => {
  console.error('✗ summarize-lhr:', e.message);
  process.exit(1);
});
