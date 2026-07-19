# MotoPark V2 — Performance Baseline & Enforcement

**Status:** Phase 0 of the cinematic-layer plan · established 2026-07-18
**Applies to:** `motopark-v2/` storefront
**Upstream budgets:** docs/09 §14 (Design System) · docs/11 §10 (Frontend Constitution)

---

## 1. Why this document exists

docs/11 §10 has always said *"Lighthouse CI (or manual budget check) before every homepage/PLP/PDP merge; regressions block."* No such check was ever configured. There was no baseline, no analyzer, no CI assertion, and no field data — so the budgets were aspirational text rather than a gate.

That gap mattered more than it looked. The first measurement ever taken (below) shows the deployed storefront **failing its own LCP budget by 56%**. It had been failing silently.

This document records the baseline, the tooling that produces it, and the gate every subsequent change must pass.

---

## 2. Baseline — staging, mobile, BEFORE the Phase 0 fixes

Captured against `https://motopark-v2-ebon.vercel.app/` (real CDN, real TLS, real RTT — deliberately not localhost, which has none of those and reports comfortable lies). Summary: `motopark-v2/perf/baseline/baseline-2026-07-18-before.json` (per-run metrics retained; see §6 on why the raw reports are not committed).

Conditions: Lighthouse mobile preset · `throttlingMethod: simulate` · Moto G-class emulation (412×823, DPR 1.75) · 4× CPU throttle · 5 runs.

| Metric | Median of 5 | All 5 runs | Budget | Verdict |
|---|---|---|---|---|
| **Largest Contentful Paint** | **4.71 s** | 5.99 · 4.71 · 6.11 · 4.60 · 2.88 | < 2.5 s | ✗ **FAIL — 88% over** |
| First Contentful Paint | 1.91 s | 1.95 · 1.86 · 1.97 · 1.91 · 1.53 | — | — |
| Cumulative Layout Shift | 0.000 | 0 · 0 · 0 · 0 · 0.040 | < 0.1 (gate 0.05) | ✓ |
| Total Blocking Time | 23 ms | 27 · 108 · 22 · 15 · 23 | < 200 ms | ✓ |
| Script transfer | 154.6 kB | — | ≤ 180 kB | ✓ |
| Performance score | 78 | 74 · 78 · 74 · 80 · 94 | — | — |

**The bottleneck was never JavaScript weight.** TBT median 23 ms, script transfer comfortably inside budget, CLS effectively zero. The entire deficit is the hero image — which is why the fix was image delivery, not bundle trimming, and why layering WebGL on top of this baseline without fixing it first would have been building on sand.

### Two caveats that matter for how you read these numbers

**1. The LCP spread is 3,222 ms** (2.88 s to 6.11 s across five identical runs). That is far too noisy to adjudicate a ±100 ms regression gate. The variance tracks FCP and appears to come from the network path between the measuring machine and Vercel's edge, not from the page. Consequences:

- Never make a ship/no-ship call on a single Lighthouse run.
- Five runs is the *floor*, not a comfortable sample. Consider 9 for a decision that matters.
- **This is the strongest possible argument for the `web-vitals` field data** in §4. Real p75 from real visitors is not just a nice-to-have here — the lab signal on this route is too noisy to be the primary instrument.

**2. An earlier single run reported LCP 3.9 s / CLS 0.076 / score 85** — all inside the spread above, and a good illustration of why it was replaced with a median. If you find that number quoted anywhere, it is one sample, not the baseline.

Regardless of the noise, the conclusion is unambiguous: **even the best of five runs (2.88 s) misses the 2.5 s budget.** The budget is not currently met, and was not being measured.

---

## 3. What Phase 0 changed

### 3a. The hero was undiscoverable (the LCP defect)

`Hero.jsx` imported the hero through JavaScript:

```js
import heroImg from '@/assets/hero.jpg';   // 131 kB JPEG
```

The consequence is subtle and expensive. The browser's **preload scanner** reads raw HTML bytes and starts fetches within milliseconds — but it can only see URLs written in the HTML. A JS-imported image URL does not exist until `index.js` **and** `HomePage.js` have downloaded, parsed and executed. The LCP element was therefore gated behind two round trips of JavaScript on a throttled connection.

Fixed by moving the image out of the JS graph entirely:

- `src/assets/hero.jpg` is now only a **source** for generation, not an import.
- `scripts/generate-hero-images.mjs` (`npm run images`) emits six committed variants into `public/`.
- `Hero.jsx` renders a `<picture>` selecting by **media query**.
- `index.html` carries two matching `<link rel="preload" as="image" type="image/avif" media=… fetchpriority="high">`.

Generated variants:

| File | Size | vs. 128 kB original |
|---|---|---|
| `hero-960.avif` (< 768px) | **17.6 kB** | 86% smaller |
| `hero-960.webp` | 23.5 kB | 82% smaller |
| `hero-960.jpg` | 37.8 kB | 71% smaller |
| `hero-1600.avif` (≥ 768px) | 38.8 kB | 70% smaller |
| `hero-1600.webp` | 50.3 kB | 61% smaller |
| `hero-1600.jpg` | 84.9 kB | 34% smaller |

Verified in-browser at both viewports after the change:

```
375px  → 1 request: hero-960.avif  @8ms via link   (17.6 kB)
1280px → 1 request: hero-1600.avif @8ms            (38.8 kB)
```

Note the start time: **8 ms**, versus "after `index.js` and `HomePage.js` have executed" previously.

### Why media queries, not `srcset` — this is a trap worth documenting

The first implementation used `srcset` width-descriptors with `sizes="100vw"`. On a 375 px viewport it produced **two** downloads of the LCP image:

```
hero-960.avif  @11ms  via link   ← preload scanner's choice
hero-1280.avif @170ms via img    ← layout engine's choice
```

The preload scanner and the layout engine each compute "needed width" independently (viewport × DPR) and can disagree — a probe element with an identical `srcset`/`sizes` confirmed the layout engine resolving to a different candidate than the scanner had. When they disagree, the browser downloads the LCP image twice, which is **strictly worse than having no preload at all**.

A `media` query is a boolean both evaluate identically against the same viewport, so the preload and the `<picture>` cannot diverge. The cost is coarser DPR fitting — irrelevant for a soft-focus photograph under a heavy scrim, where resolution differences are invisible but a duplicate download is not.

> **Rule:** the `media` attributes on the preload links in `index.html` and on the `<source>` elements in `Hero.jsx` must change together. Do not "optimize" these back to `imagesrcset`/`imagesizes`.

### 3b. Admin was riding in the entry chunk

`App.jsx` statically imported `AdminApp`. Its *routes* were lazy, but the shell, `AdminAuthContext` and `AdminRoute` shipped to every shopper. Now `React.lazy` + a `Suspense` boundary. Verified via the build manifest — `src/features/admin/AdminApp.jsx` now appears only in `dynamicImports`, and the entry's static imports are just the runtime, `vendor-react`, and `api`.

### 3c. A manualChunks configuration that made things worse

Worth recording, because the instinct that produced it is common and wrong.

The first attempt added `manualChunks` rules forcing `src/features/admin/` into a named `chunk-admin`. Measured result: **route JS went 127 kB → 154 kB brotli.** Forcing admin modules into their own chunk caused rolldown to co-locate shared dependencies — axios and React's CJS interop — into that same chunk. The entry needs axios, so the entry ended up **statically importing 58 kB of admin code**. The isolation rule produced the exact leak it was written to prevent.

**The rule that came out of it:** a manual chunk does not fence code off, it only relocates it — and relocating a module that shared code depends on inverts the dependency and drags the whole chunk forward. Isolation comes from the `import()` boundary and nothing else.

`manualChunks` is now three lines (React only, for cross-deploy cache reuse, measured at +0.4 kB). When the cinematic layer lands, **do not add `three` / `@react-three` / `gsap` rules** — they are dynamically imported and rolldown chunks them automatically.

---

## 3d. AFTER — measured on staging post-deploy (2026-07-18)

Same conditions, same loop, 5 runs. Summary: `perf/baseline/after-2026-07-18-phase0.json`.

| Metric | Before | After | Δ |
|---|---|---|---|
| **Largest Contentful Paint** | 4712 ms | **3926 ms** | **−786 ms** |
| First Contentful Paint | 1914 ms | 1916 ms | +2 ms |
| Speed Index | 4484 ms | 4591 ms | +107 ms (noise) |
| Total Blocking Time | 23 ms | 27 ms | +4 ms |
| Cumulative Layout Shift | 0 | 0 | — |
| Performance score (median) | 78 | 83 | +5 |

**The LCP budget is still NOT met: 3926 ms against 2500 ms.** Amendment 1's blocking condition therefore still holds — no WebGL work ships.

### Where the remaining 3.9 s actually goes

This is the important part, because it is *not* something more image optimisation can fix. From the post-deploy run:

- `hero-960.avif` starts at **245 ms** and finishes at **633 ms** — the preload works; it downloads in the first wave alongside the JS.
- All JS is down by **~590 ms**; all fonts by **~631 ms**.
- `render-blocking-resources`: **score 1.0** (none).
- `font-display`: **score 1.0**.
- `prioritize-lcp-image`: **score 1.0** — Lighthouse itself confirms the LCP image is correctly prioritised.
- TBT **27 ms**, CLS **0** — neither the main thread nor layout is the problem.
- LCP element is still the hero `<img>`.

So every byte the hero needs is on the device by ~633 ms, nothing blocks rendering, and the main thread is idle — yet the image does not *paint* until ~3926 ms.

**The remaining cost is the client-render path itself.** This is a client-rendered SPA: the `<img>` element does not exist in the DOM until `index.js` and `HomePage.js` have booted React and rendered the tree. A preload can make the bytes arrive early; it cannot make the element exist early. Under Lighthouse's simulated slow-4G + 4× CPU model, booting React and rendering is what the remaining time is.

Phase 0 fixed the resource layer completely. What is left is architectural.

### Two caveats before treating this as a hard failure

1. **The budget is written as a field statistic.** docs/09 §14 says "LCP < 2.5 s mobile **p75**" — p75 of real users. This number is one synthetic device on a modelled network. `web-vitals` → GA4 went live with this same deploy, so the number the budget is actually written in is now being collected for the first time. Lab and field routinely diverge for client-rendered SPAs, usually in the field's favour.
2. **The lab noise is still ~2.9 s** (LCP spread 2725–5674 ms). A −786 ms median shift is real and directionally consistent with the mechanism, but it sits inside the spread.

### Options if field p75 also misses

- **Static hero shell in `index.html`** — put the hero `<img>` in the initial HTML, outside `#root`, so it paints before React boots; remove it on mount. Highest-leverage fix compatible with the locked stack (no Next.js, no SSR). Main risk is double-paint and CLS, and CLS is currently a perfect 0 — that must not regress.
- **Reduce boot cost** — entry 21 kB + vendor-react 74 kB. Modest.
- **Revise the budget** — 2.5 s simulated-mobile LCP is a hard target for any client-rendered SPA. The number was written aspirationally, before anything measured it. Revising it is legitimate, but should be a deliberate decision recorded here, not a quiet drift.

---

## 3e. Interim standard: synthetic validation (decided 2026-07-19)

**Decision: synthetic (lab) measurement is the primary performance gate for now. Field p75 remains the real standard and resumes as primary once traffic supports it.**

This is the "deliberate, recorded decision" §3d asked for, not quiet drift.

**Why.** The budget in `docs/09 §14` is written as mobile **p75 of real users**. Collecting it needs enough traffic for that percentile to be stable, and MotoPark is early enough that it isn't there yet: CrUX has too little public traffic to publish, and while our own `web-vitals` → GA4 beacon *does* collect events at any volume, a stable p75 could be weeks or months away. Blocking architectural decisions on it indefinitely costs more than the precision is worth at this stage.

**What this does and does not change.**

- It does **not** open the Phase 5 gate. Synthetic mobile LCP is 2.9–3.6 s against a 2500 ms budget — the budget is still missed, so Amendment 1's blocking condition still holds. This changes *how we measure*, not *what we require*.
- It **does** end the freeze on the critical render path. That freeze existed for exactly one reason: changing LCP delivery mid-collection would blend two populations into one field p75 and destroy the gate decision. With field data no longer the near-term gate, there is no collection window left to protect.
- CLS in particular loses nothing. Layout shift is fully observable in the lab; the 0.112 desktop regression was found and fixed synthetically.

**Trigger to revert to field-primary.** Resume when **either** holds:

1. GA4 `web_vitals` has **≥ 1,000 mobile LCP samples in a rolling 28-day window** — enough that p75 is not dominated by a handful of sessions; or
2. **CrUX publishes** for `motoparkvizag.in` (i.e. PageSpeed Insights shows a "Discover what your real users are experiencing" field section rather than lab-only).

At that point field p75 becomes primary again and the lab numbers revert to what they are best at: regression detection between builds. **Check this quarterly** — the failure mode is nobody ever looking, and synthetic-forever quietly becoming the standard.

**Standing caveat.** Lab LCP for a client-rendered SPA is a simulated cold load on a throttled device with an empty cache. It is a good *relative* instrument (build vs build) and a pessimistic *absolute* one. Do not treat a lab pass as proof of a field pass, or vice versa.

---

## 4. Tooling

| Tool | Command | Purpose |
|---|---|---|
| Budget tripwire | `npm run budgets` (auto in `npm run build`) | Reads `dist/.vite/manifest.json`, resolves the chunks the `/` route pulls **statically**, gzip+brotli them, fails the build over budget. ~2 s, never flakes. |
| Bundle analyzer | `npm run analyze` | `rollup-plugin-visualizer` treemap → `perf/stats.html`. |
| Lighthouse CI | `npm run lhci` | `lighthouserc.json`: mobile, 5 runs, against **staging**, asserted against §5. |
| Field CWV | automatic | `src/lib/webVitals.js` → GA4 `web_vitals` event. |
| Hero variants | `npm run images` | Regenerate after art changes. Dev-only `sharp`; kept off the Vercel build path. |

### On measurement units

The docs stated the budget as "180 kB gz" while Vercel serves **brotli** and Lighthouse reports **transfer size**. Two units for one budget. The budget is now stated and enforced as **≤180 kB transferred (brotli) JS on the `/` route**; `check-budgets.mjs` prints raw/gzip/brotli side by side so older gzip figures remain comparable.

### On what Lighthouse cannot do

**Lighthouse cannot measure INP.** INP requires real interactions from real users; TBT is the lab proxy and is a different metric. And docs/09 §14 states LCP as a **mobile p75** — a field statistic no lab tool can produce. Both gaps are why `web-vitals` → GA4 is wired now rather than at cutover: the soak window needs to already be collecting.

Read the field data in GA4 → Reports → Engagement → Events → `web_vitals`, split by `metric_name` / `metric_rating`. For the p75 the budget is written in, use Explore with `metric_value` at 75th percentile, segmented to mobile.

---

## 5. The gate

Every PR touching the storefront must hold these. `check-budgets.mjs` enforces the byte rows automatically; the Lighthouse rows are asserted by `npm run lhci`.

| Metric | Gate |
|---|---|
| Home LCP (mobile, median of 5) | ≤ baseline + 100 ms, hard ceiling **2500 ms** |
| Home CLS (mobile) | **≤ 0.05** — deliberately half the documented 0.1, to leave headroom |
| Home TBT (mobile) | ≤ baseline **+ 0 ms** |
| Home transferred JS | ≤ 180 kB brotli |
| Desktop LCP | ≤ baseline + 150 ms |

**Why the TBT row is the sharpest instrument.** Mobile must never load the cinematic chunk at all (the eligibility chain hard-stops below 1024px). So *any* movement in mobile TBT means the isolation leaked. It is a boolean test of the whole cinematic architecture, and it runs automatically.

`check-budgets.mjs` additionally fails the build outright if a chunk matching `three|react-three|r3f|gsap|lenis|cinematic` appears in the `/` **static** graph, or if any `src/cinematic/` module does.

---

## 6. Running Lighthouse on Windows — a required workaround

`lhci collect` with `numberOfRuns > 1` **crashes on this machine**:

```
Runtime error encountered: EPERM, Permission denied:
  \\?\C:\Users\spali\AppData\Local\Temp\lighthouse.51493147
  at Launcher.destroyTmp (chrome-launcher.js:367)
```

`chrome-launcher` cannot delete its temp profile directory, and the whole batch aborts after the first run. The report JSON *is* written before the cleanup fails, so the workaround is to invoke one run at a time and harvest the result:

```bash
mkdir -p .lighthouseci/keep
for i in 1 2 3 4 5; do
  npx lhci collect --url=https://motopark-v2-ebon.vercel.app/ --numberOfRuns=1 >/dev/null 2>&1 || true
  cp "$(ls .lighthouseci/lhr-*.json | head -1)" ".lighthouseci/keep/run-$i.json"
done
node scripts/summarize-lhr.mjs after-<yyyy-mm-dd> .lighthouseci/keep/run-*.json
```

The `|| true` is load-bearing — the command exits non-zero on the cleanup error even though the measurement succeeded. Until this is resolved, `npm run lhci` (autorun) is unreliable here; use the loop.

### Commit the summary, never the raw reports

A full Lighthouse report is ~540 kB, most of it screenshots and per-audit detail. Five of them is 2.8 MB — and this doc asks for a fresh five-run capture after every deploy, so committing raw reports would grow the repository by ~3 MB per measurement, permanently, for numbers that fit in three kilobytes.

`scripts/summarize-lhr.mjs` keeps what matters — every run's metrics, so medians *and* spread stay auditable — and discards the bulk. **2.8 MB → 3.0 kB.** Raw reports live in `.lighthouseci/` and `perf/lhci/`, both gitignored; only `perf/baseline/<label>.json` is committed.

---

## 7. Open items

- **Re-measure after deploy.** §2 is the *before* picture. The Phase 0 fixes are verified locally (single request at both viewports, scanner-initiated, 8 ms start) but their effect on staging LCP is **unconfirmed until they deploy**. Re-run the loop above after the next staging deploy and record the after-numbers here. **Do not treat the LCP budget as met until that number exists.**
- **Lab noise on this route is 3.2 s.** Treat the median of 5 as the minimum evidence for any LCP claim, and prefer field p75 once GA4 has collected a week of `web_vitals`.
- **No CI.** All of this is manual. Wiring `npm run build` (which now includes the budget check) into a GitHub Action or a Vercel check would make "regressions block" literally true.
- **`@lhci/cli` pulls 341 dev packages** with 5 advisories. All dev-only — `npm audit --omit=dev` reports 0 for the shipped tree.
- **The `/store`, `/cart`, `/checkout` routes have no baseline yet.** `lighthouserc.json` lists them; capture them with the loop before the first change that touches those routes.
