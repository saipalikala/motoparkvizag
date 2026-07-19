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

/**
 * Describe the conditions a run was measured under, read from the report itself.
 *
 * WHY read rather than hardcode: this string used to be the literal constant
 * "mobile · simulate throttling · Moto G-class emulation · staging URL". Once a
 * desktop config exists, that constant would label a desktop baseline as mobile
 * — and desktop LCP runs ~4x faster, so the mislabelled file would look like a
 * spectacular improvement to anyone comparing it against a mobile baseline.
 * docs/14 §5: never report a delta without a like-for-like baseline. This makes
 * "like-for-like" checkable after the fact instead of remembered.
 */
function describeConditions(s) {
  const screen = s.screenEmulation?.disabled
    ? 'no screen emulation'
    : `${s.screenEmulation?.width}x${s.screenEmulation?.height}@${s.screenEmulation?.deviceScaleFactor}x`;
  const cpu = s.throttling?.cpuSlowdownMultiplier;
  return [
    s.formFactor,
    `${s.throttlingMethod} throttling`,
    screen,
    cpu ? `${cpu}x CPU` : null,
    s.throttling?.throughputKbps ? `${s.throttling.throughputKbps} kbps` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

async function main() {
  const [label, ...files] = process.argv.slice(2);
  if (!label || files.length === 0) {
    console.error('usage: node scripts/summarize-lhr.mjs <label> <file.json...>');
    process.exit(1);
  }

  const runs = [];
  let lighthouseVersion = null;
  let conditions = null;
  for (const f of files) {
    const r = JSON.parse(await readFile(f, 'utf8'));
    const m = {};
    for (const k of METRICS) if (r.audits[k]) m[k] = round(r.audits[k].numericValue, 3);
    const script = r.audits['resource-summary']?.details?.items?.find(
      (i) => i.resourceType === 'script',
    );

    // Refuse to average across form factors. A summary blending one desktop run
    // into four mobile ones produces a median that describes no real config, and
    // nothing downstream would ever reveal it.
    const runConditions = describeConditions(r.configSettings);
    if (conditions === null) {
      conditions = runConditions;
      lighthouseVersion = r.lighthouseVersion;
    } else if (runConditions !== conditions) {
      throw new Error(
        `refusing to summarise mixed conditions in one label:\n` +
          `  ${conditions}\n  ${runConditions} (${f})\n` +
          `Summarise each form factor under its own label.`,
      );
    }

    runs.push({
      url: r.finalDisplayedUrl,
      fetchTime: r.fetchTime,
      formFactor: r.configSettings.formFactor,
      score: round(r.categories.performance.score * 100),
      scriptTransferBytes: script?.transferSize ?? null,
      metrics: m,
    });
  }

  const summary = {
    label,
    capturedAt: new Date().toISOString(),
    lighthouseVersion,
    runCount: runs.length,
    conditions,
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
  console.log(`  conditions ${conditions}`);
  console.log(`  LCP median ${summary.medians['largest-contentful-paint']} ms`);
  console.log(
    `  LCP spread ${summary.spread['largest-contentful-paint'].min}–${summary.spread['largest-contentful-paint'].max} ms\n`,
  );
}

main().catch((e) => {
  console.error('✗ summarize-lhr:', e.message);
  process.exit(1);
});
