/**
 * scripts/lh-desktop-cinematic.mjs — Lighthouse that can actually see the
 * decorative WebGL layer.
 *
 * WHY THIS EXISTS (docs/13 §5c):
 *
 * Lighthouse reports `prefers-reduced-motion: reduce`. The cinematic layer's
 * eligibility gate refuses to load under reduced motion — correctly, that is
 * Amendment 1 condition 7 — so **Lighthouse measures the fallback, not the
 * feature**. Verified on 2026-07-19: across 10 runs the HeroScene chunk was
 * never requested, and both control and treatment reported TBT 0 ms while the
 * canvas never ran once. A gate that reads 0 no matter what ships is not a gate.
 *
 * The fix is to drive Lighthouse through a Puppeteer page whose media features
 * are overridden to `no-preference`, so the canvas actually mounts and its cost
 * lands in the trace.
 *
 * THE ASSERTION IS THE POINT. This script fails loudly if the cinematic chunk
 * was not requested during a run. Without that check the script would silently
 * degrade into exactly the instrument it replaces — reporting reassuring zeros
 * for a feature that never loaded. Never remove it.
 *
 * Settings are imported from Lighthouse's own desktop config rather than copied,
 * so results stay comparable to perf/baseline/*-desktop*.json by construction.
 *
 * Usage:
 *   node scripts/lh-desktop-cinematic.mjs [url] [runs] [outDir]
 *   node scripts/lh-desktop-cinematic.mjs http://localhost:4174/ 5
 *
 * Then summarise as usual:
 *   node scripts/summarize-lhr.mjs <label> .lighthouseci/cinematic/run-*.json
 */
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import * as ChromeLauncher from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';

const URL_ARG = process.argv[2] ?? 'http://localhost:4174/';
const RUNS = Number(process.argv[3] ?? 5);
const OUT_DIR = process.argv[4] ?? join('.lighthouseci', 'cinematic');

/**
 * What this capture expects. Default 1 = the layer must load in every run.
 *
 * `EXPECT_CINEMATIC=0` is for capturing the CONTROL half of an A/B — a build
 * with the mount removed, where the layer correctly must NOT load. It inverts
 * the assertion rather than disabling it, so a control that accidentally loads
 * the layer fails just as loudly as a treatment that fails to.
 */
const EXPECT = process.env.EXPECT_CINEMATIC !== '0';

/** Chunk names that mean "the decorative layer actually loaded". */
const CINEMATIC_RE = /HeroScene|cinematic/i;

/** Performance-only, desktop emulation identical to lighthouserc.desktop.json. */
const config = {
  ...desktopConfig,
  settings: { ...desktopConfig.settings, onlyCategories: ['performance'] },
};

async function runOnce(browser, url) {
  const page = await browser.newPage();
  try {
    // The whole reason this script exists. Chrome's headless default is
    // `reduce`; the gate honours it and the feature never loads.
    await page.emulateMediaFeatures([
      { name: 'prefers-reduced-motion', value: 'no-preference' },
    ]);

    const result = await lighthouse(url, { output: 'json' }, config, page);
    if (!result?.lhr) throw new Error('lighthouse returned no lhr');
    return result.lhr;
  } finally {
    await page.close().catch(() => {});
  }
}

function inspect(lhr) {
  const requests = lhr.audits['network-requests']?.details?.items ?? [];
  const cinematic = requests.filter((r) => CINEMATIC_RE.test(r.url));
  return {
    loadedCinematic: cinematic.length > 0,
    chunks: cinematic.map((c) => ({
      file: c.url.split('/').pop(),
      bytes: c.transferSize,
      endedAt: Math.round(c.networkEndTime ?? 0),
    })),
    requestCount: requests.length,
    lcp: Math.round(lhr.audits['largest-contentful-paint'].numericValue),
    tbt: Math.round(lhr.audits['total-blocking-time'].numericValue),
    cls: Number(lhr.audits['cumulative-layout-shift'].numericValue.toFixed(4)),
  };
}

async function main() {
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  const chrome = await ChromeLauncher.launch({
    chromeFlags: ['--headless=new', '--no-first-run', '--no-default-browser-check'],
  });

  const browser = await puppeteer.connect({
    browserURL: `http://localhost:${chrome.port}`,
    defaultViewport: null,
  });

  let loadedCount = 0;
  try {
    for (let i = 1; i <= RUNS; i++) {
      const lhr = await runOnce(browser, URL_ARG);
      const info = inspect(lhr);
      if (info.loadedCinematic) loadedCount++;

      await writeFile(join(OUT_DIR, `run-${i}.json`), JSON.stringify(lhr));
      console.log(
        `  run ${i}  LCP ${String(info.lcp).padStart(5)} ms · TBT ${String(info.tbt).padStart(4)} ms · CLS ${info.cls} · ` +
          `cinematic ${info.loadedCinematic ? `LOADED (${info.chunks.map((c) => `${c.file} ${c.bytes}B`).join(', ')})` : 'NOT LOADED'}`,
      );
    }
  } finally {
    await browser.disconnect().catch(() => {});
    // chrome-launcher's temp cleanup throws EPERM on Windows (docs/13 §6). The
    // measurement is already on disk by this point, so swallow it.
    await chrome.kill().catch(() => {});
  }

  const want = EXPECT ? RUNS : 0;
  console.log(
    `\n  cinematic chunk loaded in ${loadedCount}/${RUNS} runs (expected ${want})`,
  );

  if (loadedCount !== want) {
    console.error(
      EXPECT
        ? `\n✗ The cinematic layer did not load in every run.\n` +
            `  This instrument exists precisely to prevent measuring a page where the\n` +
            `  canvas never ran (docs/13 §5c). Numbers from this capture are NOT a\n` +
            `  measurement of the decorative layer — do not summarise or commit them.\n`
        : `\n✗ EXPECT_CINEMATIC=0 was set, but the layer loaded in ${loadedCount} run(s).\n` +
            `  A control build must not load it — this capture is not a valid control.\n`,
    );
    process.exit(1);
  }

  console.log(`  wrote ${RUNS} reports to ${OUT_DIR}/`);
  console.log(`  next: node scripts/summarize-lhr.mjs <label> ${OUT_DIR}/run-*.json\n`);
}

main().catch((e) => {
  console.error('✗ lh-desktop-cinematic:', e.message);
  process.exit(1);
});
