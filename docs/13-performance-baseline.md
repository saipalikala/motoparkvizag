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

- It did **not**, by itself, open the Phase 5 gate. Synthetic mobile LCP was 2.9–3.6 s against a 2500 ms budget — still missed. This changed *how we measure*, not *what we require*. (**Superseded by §3f and §3g:** three experiments then failed to close that gap, the lab budget was deliberately revised to 3500 ms, and the gate opened on the revised number. The field requirement of 2500 ms p75 is unchanged.)
- It **does** end the freeze on the critical render path. That freeze existed for exactly one reason: changing LCP delivery mid-collection would blend two populations into one field p75 and destroy the gate decision. With field data no longer the near-term gate, there is no collection window left to protect.
- CLS in particular loses nothing. Layout shift is fully observable in the lab; the 0.112 desktop regression was found and fixed synthetically.

**Trigger to revert to field-primary.** Resume when **either** holds:

1. GA4 `web_vitals` has **≥ 1,000 mobile LCP samples in a rolling 28-day window** — enough that p75 is not dominated by a handful of sessions; or
2. **CrUX publishes** for `motoparkvizag.in` (i.e. PageSpeed Insights shows a "Discover what your real users are experiencing" field section rather than lab-only).

At that point field p75 becomes primary again and the lab numbers revert to what they are best at: regression detection between builds. **Check this quarterly** — the failure mode is nobody ever looking, and synthetic-forever quietly becoming the standard.

**Standing caveat.** Lab LCP for a client-rendered SPA is a simulated cold load on a throttled device with an empty cache. It is a good *relative* instrument (build vs build) and a pessimistic *absolute* one. Do not treat a lab pass as proof of a field pass, or vice versa.

---

## 3f. Two LCP experiments, both negative (2026-07-19)

Both were run as controlled A/Bs against staging: 5 Lighthouse runs each, same conditions, baseline captured immediately before the change. **Both failed. Both are reverted. Do not re-try either without new evidence.**

| | LCP median | vs base | TBT | JS |
|---|---|---|---|---|
| **Baseline** (`baseline-2026-07-19-main`) | **3441 ms** | — | 24 ms | 158.4 kB |
| Static hero shell (`after-2026-07-19-hero-shell`) | 3437 ms | **−5 ms** | 27 ms | 158.4 kB |
| Eager home route (`after-2026-07-19-eager-home`) | 3681 ms | **+240 ms** | **144 ms** | 153.1 kB |

### Experiment 1 — static hero shell: no effect (−5 ms, inside a ~1000 ms spread)

§3d predicted this was "the highest-leverage fix". It isn't. Two reasons, both visible only in the deployed build:

1. **LCP never moved to the shell.** The reported LCP element stayed `img._photo_*` — React's hero. LCP only reassigns to *larger* candidates, and the shell was **675 px** tall (82vh) against the real hero's measured **750 px**. When React's taller hero finally painted, it took the metric back.
2. **The shell was misaligned anyway.** The real hero starts at `top: 168px`, below the OfferBar and Navbar; the shell was pinned at `top: 0`. Geometry was derived from `Hero.module.css` without ever being checked against the *rendered* box at mobile width.

### Experiment 2 — eager home route: a regression

Merging the route into the entry chunk made LCP **240 ms worse** and TBT **6× worse** (24 → 144 ms, failing the §5 TBT row) — while shipping **5 kB less JavaScript**. Fewer bytes, slower page. One 159.7 kB chunk is one long main-thread task; two chunks let the shell paint while the route is still arriving.

### What both experiments actually proved

The phase breakdown is the same in every run of all three configurations:

| phase | typical |
|---|---|
| TTFB | 640–860 ms |
| **Load Delay** | **0 ms — every single run** |
| Load Time | 0–880 ms |
| **Render Delay** | **1503–3695 ms (46–81% of LCP)** |

**Load Delay is a flat zero.** The preload works perfectly; hero bytes are on the device early in every configuration. LCP is dominated by *render delay* — the main thread, not the network and not element discovery.

This retires the §3d hypothesis ("the `<img>` doesn't exist until React boots, so make it exist earlier"). Making the element exist earlier changes nothing when the browser cannot paint until the main thread is free, and **rearranging chunks does not reduce total execution — it only moves it.**

### The two levers that remain

1. **Reduce JavaScript executed before the hero paints.** Not fewer bytes — less *work*. Script eval is ~216 ms and total main-thread ~800–860 ms under 4× CPU throttling. This is the only lever with real headroom left.
2. **Revise the 2500 ms budget.** Already sanctioned by §3d as a legitimate, recorded decision. TTFB alone is 640–860 ms on simulated slow 4G before a single byte of app code runs; 2.5 s lab LCP is a hard target for any client-rendered SPA, and the number was written aspirationally before anything measured it.

---

## 3g. DECISION: the lab LCP budget is 3500 ms; 2500 ms remains the FIELD target (2026-07-19)

Owner-authorised, recorded here per §3d's requirement that any revision be a deliberate decision rather than quiet drift.

### What changed, precisely

| | before | after |
|---|---|---|
| **Lab** (Lighthouse, mobile, median of 5) | 2500 ms | **3500 ms** |
| **Field** (GA4 `web_vitals`, mobile p75) | 2500 ms | **2500 ms — unchanged** |

`lighthouserc.json` now asserts 3500. **The product requirement did not move.** `docs/09 §14` still says LCP < 2.5 s mobile p75, and that is still the number the storefront is held to for real users. What changed is the *lab proxy*, which was never the same measurement.

### Why 2500 ms was the wrong number for this instrument

Three controlled A/B experiments (§3f) moved the lab LCP by −5 ms, +240 ms and +43 ms. None got near the budget. What they established:

- **Load Delay is 0 ms in every run of every configuration.** Resource delivery is already optimal; Phase 0 finished that work.
- **Render delay is 46–81% of LCP** — main-thread execution under Lighthouse's 4× CPU throttle.
- **TTFB alone is 640–860 ms** before a byte of application code runs.

Under simulated slow 4G with 4× CPU throttling, a client-rendered SPA has roughly 1.6 s of budget left after TTFB for boot, render and paint. 2500 ms was written aspirationally before anything measured it, and the measurements now say it is not reachable by tuning — only by changing the rendering architecture (SSR/SSG), which the locked stack (docs/11) excludes.

### The honest caveat: this is a tight budget, not a loose one

The current median is **3441 ms against the new 3500 ms ceiling — 59 ms of headroom**, and the 5-run spread reaches 4276 ms. This budget will fail on a real regression, which is the point. It is **not** permission to spend the difference. Anyone who lands a change that pushes the median past 3500 ms should treat it as a genuine regression, not as a reason to raise the number again.

### The corroborating evidence for keeping 2500 ms in the field

Independent PageSpeed Insights measurement on 2026-07-19 recorded **desktop LCP 0.8 s** and mobile 2.9–3.6 s on this same deployment. The lab mobile figure is the pessimistic corner of a metric whose real definition is field p75, and 2.5 s remains achievable there. Revisit once GA4 has the sample volume specified in §3e.

---

## 4. Tooling

| Tool | Command | Purpose |
|---|---|---|
| Budget tripwire | `npm run budgets` (auto in `npm run build`) | Reads `dist/.vite/manifest.json`, resolves the chunks the `/` route pulls **statically**, gzip+brotli them, fails the build over budget. ~2 s, never flakes. |
| Bundle analyzer | `npm run analyze` | `rollup-plugin-visualizer` treemap → `perf/stats.html`. |
| Lighthouse CI | `npm run lhci` | `lighthouserc.json`: mobile, 5 runs, against **staging**, asserted against §5. |
| Lighthouse CI (desktop) | `npm run lhci:desktop` | `lighthouserc.desktop.json`: desktop preset, 5 runs, `/` only. Measures the desktop page — but **runs under reduced motion, so it cannot see the cinematic layer** (§5c). |
| Lighthouse (cinematic) | `npm run lh:cinematic` | `scripts/lh-desktop-cinematic.mjs`: same desktop settings via Puppeteer with `prefers-reduced-motion: no-preference`, so the canvas actually loads. **Asserts the chunk was requested.** The only instrument that can measure shader cost — see §5d. |
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
| Home LCP (mobile, median of 5) | ≤ baseline + 100 ms, hard ceiling **3500 ms (LAB)** — see §3g |
| Home CLS (mobile) | **≤ 0.05** — deliberately half the documented 0.1, to leave headroom |
| Home TBT (mobile) | ≤ baseline **+ 0 ms** |
| Home transferred JS | ≤ 180 kB brotli |
| Desktop LCP (median of 5) | ≤ baseline + 150 ms → hard ceiling **695 ms** — collector added 2026-07-19, see §5b |
| **Desktop CLS** | **≤ 0.05** — added 2026-07-19, see below |
| Desktop TBT (median of 5) | ≤ **150 ms** — owner-approved 2026-07-19, §5b. **Measure with `npm run lh:cinematic`, not `lhci:desktop`** — §5c/§5d |

All Lighthouse rows assert the **median** of the runs. This is set explicitly in both configs; lhci's default (`optimistic`) asserts the best run instead — see §5b.

**Why the desktop CLS row exists.** Every CLS assertion here was mobile-only, and mobile CLS measured a clean 0 — so a **0.112 desktop CLS sat on production unnoticed** until a synthetic audit surfaced it. The cause was viewport-dependent: the route fallback reserved 60vh, which left the footer inside a 940px-tall desktop viewport and off-screen on mobile. A gate that only watches one viewport cannot see a defect that only exists in the other. Measured on staging after the fix: **0.11195 → 0.01481**, the entire remainder being the hero ticker's skeleton→content swap.

**Why the TBT row is the sharpest instrument.** Mobile must never load the cinematic chunk at all (the eligibility chain hard-stops below 1024px). So *any* movement in mobile TBT means the isolation leaked. It is a boolean test of the whole cinematic architecture, and it runs automatically.

`check-budgets.mjs` additionally fails the build outright if a chunk matching `three|react-three|r3f|gsap|lenis|cinematic` appears in the `/` **static** graph, or if any `src/cinematic/` module does.

---

## 5b. The desktop collector and baseline (2026-07-19)

The desktop rows above had **no collector behind them** until now — `lighthouserc.json` collects mobile only, so "Desktop LCP ≤ baseline + 150 ms" had neither a baseline nor a way to measure one. `lighthouserc.desktop.json` + `npm run lhci:desktop` is that collector. This had to exist before Phase 5, because the cinematic layer is **desktop-only**: the mobile config is structurally incapable of measuring the users who actually receive the feature.

### Baseline — `perf/baseline/baseline-2026-07-19-desktop.json`

5 runs, staging, `/` only, desktop preset (1350×940 @1x, 1× CPU, 10 240 kbps).

| metric | median | spread | mobile equivalent |
|---|---|---|---|
| **LCP** | **544.9 ms** | 523.8–563.4 ms (**39 ms**) | 3441 ms, ~1000 ms spread |
| CLS | 0.0148 | 0.0148–0.0148 (**zero**) | 0 |
| **TBT** | **0 ms** | 0–0 ms (**zero**) | 24 ms |
| FCP | 390.0 ms | 388.8–402.8 ms | 1920 ms |
| Performance score | 100 | 100 in all 5 runs | — |

### Why this instrument is much better than the mobile one

**The spread is 7% of the median (39 ms), against mobile's ~29% (~1000 ms).** §3e records that mobile lab noise is "too wide to adjudicate a ±100 ms gate" — that was the honest reason three LCP experiments were hard to read. Desktop does not have that problem, and can resolve the 150 ms allowance comfortably.

**Desktop TBT is 0 ms in all five runs, and desktop CLS is bit-identical across all five.** That makes desktop the sharpest Phase 5 instrument available: after the canvas ships, *any* nonzero desktop TBT is attributable to it and nothing else. The mobile TBT row proves the layer stays **isolated**; the desktop TBT row is the only thing that will measure what it **costs**.

The desktop CLS of 0.0148 independently reproduces the 0.01481 recorded in §5 after the footer fix — two separate measurement sessions agreeing, which is worth more than either alone.

### Threshold provenance — read before treating these as binding

- **LCP 695 ms** = measured baseline 545 + the 150 ms allowance §5 already authorises. Derived, not invented.
- **CLS 0.05** = the existing §5 desktop row.
- **TBT 150 ms** — **owner-approved 2026-07-19.** Desktop TBT baselines at exactly 0, so any ceiling is a judgement call; 150 ms sits below the mobile 200 ms ceiling and is deliberately generous against a 0 ms baseline. Rationale on approval: *"150 ms gives us enough room for the shader while ensuring we don't accidentally ship a massive CPU hog."*

### `aggregationMethod` — both gates now assert the median (fixed 2026-07-19)

lhci defaults to `aggregationMethod: "optimistic"`, which for a `maxNumericValue` assertion tests the **best** of the N runs, not the median. Both configs carried that default — so although §3g reasons entirely in medians ("3441 ms against the new 3500 ms ceiling — 59 ms of headroom") and §5 labels the rows "median of 5", **what actually got asserted was the fastest run of 5**, against a mobile spread reaching 4276 ms. The gate was measurably weaker than its own documentation.

**Both `lighthouserc.json` and `lighthouserc.desktop.json` now set `"aggregationMethod": "median"` explicitly**, owner-approved 2026-07-19 on the grounds that the gate "needs to reflect reality and match the documentation". Verified green after the change — see below.

**If you add a third config, set this key explicitly.** The default is not the one this project's documentation assumes, and nothing warns you.

### Running it

Same Windows constraint as §6 — `numberOfRuns > 1` crashes. Runs are also flaky roughly 1-in-5 (one of the five baseline captures failed and was retried), so check the file count before summarising:

```bash
mkdir -p .lighthouseci/keep
for i in 1 2 3 4 5; do
  npx lhci collect --config=lighthouserc.desktop.json --numberOfRuns=1 >/dev/null 2>&1 || true
  f=$(ls .lighthouseci/lhr-*.json 2>/dev/null | head -1)
  [ -n "$f" ] && cp "$f" ".lighthouseci/keep/run-$i.json" && rm -f .lighthouseci/lhr-*
done
node scripts/summarize-lhr.mjs <label>-desktop .lighthouseci/keep/run-*.json
```

`summarize-lhr.mjs` no longer hardcodes its `conditions` string as mobile — it reads form factor, throttling and emulation from each report, and **refuses to summarise runs from different form factors under one label**. Without that, a desktop capture would have been written to disk describing itself as mobile, and a desktop-vs-mobile comparison would have looked like a 6× improvement. That is precisely the like-for-like trap in `docs/14 §5`, so it is now enforced by the tool rather than by memory.

---

## 5c. Step 4 — measuring the scaffold, and why Lighthouse cannot measure the canvas (2026-07-19)

### The A/B

Run against a **local production preview** (`npm run build && npm run preview`), 5 runs each, control and treatment captured back-to-back in one session on one server. The control is `main`'s `Hero.jsx` (mount removed); everything else identical.

| | control | scaffold | delta |
|---|---|---|---|
| LCP median | 733.4 ms | 732.5 ms | **−0.8 ms** (spread ~3 ms) |
| **TBT** | 0 ms | **0 ms** | **0** |
| CLS | 0 | 0 | 0 |
| script transfer | 155 868 B | 156 575 B | +707 B |
| route JS (`npm run budgets`) | 128.4 kB | 128.9 kB | +0.5 kB |

Gates: TBT ≤ 150 ms ✅ · LCP ≤ +150 ms ✅ · CLS ≤ 0.05 ✅.

**Why local rather than staging.** `lighthouserc.desktop.json` targets staging, which deploys from `main` — running it unchanged would have measured code without the scaffold and reported a meaningless delta. A local control was captured instead so the comparison is like-for-like (docs/14 §5). Local is **not** comparable to the staging baseline in absolute terms: local LCP is 733 ms against staging's 545 ms, and local CLS is 0 against staging's 0.0148 — with the backend unreachable the hero ticker keeps its skeleton and never performs the swap that produces that shift.

### ⚠️ The important finding: Lighthouse never loaded the canvas

**In all 10 runs the `HeroScene` chunk was never requested** — control and treatment issued an identical 32 requests. The trace ran to 3304 ms, far past the ~950 ms the scaffold needs to arm, so this is not a timing artifact.

The cause, captured from inside a Lighthouse run:

```
GATE {"w":true,"fine":true,"red":true,"mem":16,"save":false,"cheap":false}
```

**`prefers-reduced-motion` matches `reduce` under Lighthouse.** Condition 7 then correctly refuses to load the layer. Confirmed it is not the WebGL probe: removing `failIfMajorPerformanceCaveat` changes nothing.

**So the table above proves the scaffold costs nothing in the page-load window — which is exactly what Amendment 1 condition 2 demands — but it does NOT prove anything about what the canvas costs while running, because under Lighthouse the canvas never runs.** Read those zeros as "the reduced-motion fallback is clean", not as "the shader is free".

This has a consequence worth stating plainly:

> **The "Desktop TBT ≤ 150 ms" row in §5 is currently unenforceable against the canvas.** Lighthouse will always measure the reduced-motion path. The row still has value — it catches anything the scaffold adds to load — but it cannot be the gate for shader cost.

**This was fixed the same day — see §5d.**

### Direct measurement of the running canvas

Measured in a real browser (Playwright, production preview, desktop viewport), canvas running at ~100 fps for 5 s:

**0 long tasks · 0 ms blocking.**

An inert loop that clears to transparent costing nothing is the expected result, not a surprising one — it is a *floor*, and the number that matters is the same measurement after the shader exists. Note also that a paired control could not be captured cleanly: the automation window re-throttles to ~1 fps when it loses focus, which flattens both sides of the comparison.

---

## 5d. The instrument that can see the canvas (2026-07-19)

`scripts/lh-desktop-cinematic.mjs` · `npm run lh:cinematic -- <url> <runs> [outDir]`

Drives Lighthouse through the Node API with a Puppeteer page whose media features are overridden:

```js
await page.emulateMediaFeatures([
  { name: 'prefers-reduced-motion', value: 'no-preference' },
]);
const result = await lighthouse(url, { output: 'json' }, config, page);
```

No new dependency — `puppeteer-core` already ships inside `lighthouse`. Settings are **imported from Lighthouse's own `desktop-config.js`** rather than copied, so captures stay comparable to `lighthouserc.desktop.json` by construction rather than by remembering.

### The assertion is the point

The script **fails the run if the cinematic chunk was not requested**, and prints the chunk names and byte counts for every run. Without that check it would silently decay into the very instrument it replaces — reporting reassuring zeros for a feature that never loaded. `EXPECT_CINEMATIC=0` inverts the assertion for capturing the control half of an A/B, so a control that *accidentally* loads the layer fails just as loudly. **Do not remove either branch.**

### Honest baseline — the scaffold, actually running

5 runs each, local production preview, `motion: no-preference` on both sides. Control = `main`'s `Hero.jsx` with the mount removed.

| | control | canvas active | delta |
|---|---|---|---|
| LCP median | 808.9 ms | 808.9 ms | **−0.05 ms** |
| **TBT** | 0 ms (all 5 runs) | **0 ms (all 5 runs)** | **0** |
| CLS | 0 | 0 | 0 |
| FCP | 579.7 ms | 579.5 ms | −0.2 ms |
| Speed Index | 587.6 ms | 594.9 ms | +7.3 ms |

Chunk loaded in **5/5** runs: `HeroScene.js` 1662 B + `HeroScene.css` 434 B transferred.

Gates: **TBT ≤ 150 ms ✅ · LCP ≤ +150 ms ✅ · CLS ≤ 0.05 ✅** — and for the first time these are measured on a page where the canvas actually ran.

### Proof the instrument is sensitive

A gate that reads 0 is what §5c was about, so sensitivity was verified rather than assumed. With 90 ms of artificial blocking work injected into the scene's frame loop:

| | TBT | LCP |
|---|---|---|
| normal scaffold | 0 ms | 808.9 ms |
| **+90 ms/frame busy-wait** | **7146 ms** | 807 ms |

**TBT catches it 47× over budget. LCP does not move at all** — because the canvas loads post-LCP by design. That is the architecture working, and it means **TBT is the only lab gate that can see shader cost**. Do not judge a shader by its LCP.

### Note: this also measured Lenis for the first time

With `no-preference`, `isCinematicEligible()` passes, so **Phase 3's Lenis loads too** — it shares the gate. Every previous desktop capture (including `baseline-2026-07-19-desktop.json`) ran under reduced motion and therefore measured a page with **neither** Lenis nor the canvas. That is why the motion-enabled control sits at 808.9 ms against the reduced-motion local control's 733.4 ms: **~75 ms of that gap is smooth scroll, which had never been measured since it shipped.** Compare motion-enabled captures only against other motion-enabled captures.

---

## 5e. The shader — incremental cost (2026-07-19)

Built one effect at a time, each measured before the next was added. Every capture used `npm run lh:cinematic` (so the canvas actually ran) against the same local production preview. Effects were added by `#ifdef`, not by multiplying a term by zero — a zeroed term still costs its ALU work and would have hidden the real increment.

| stage | LCP median | TBT | CLS | chunk (transferred) |
|---|---|---|---|---|
| control (no canvas) | 808.9 ms | 0 ms | 0.0003 | — |
| scaffold (inert) | 808.9 ms | 0 ms | 0.0003 | 1662 B |
| **+ film grain** | ~813 ms | **0 ms** | 0.0003 | 3467 B |
| **+ light sweep** | ~816 ms | **0 ms** | 0.0003 | 3466 B |
| **+ depth haze** | ~779–812 ms | **0 ms** | 0.0003 | 3464 B |
| **+ dust motes (final)** | **809.8 ms** | **0 ms** | 0.0003 | **4070 B** |

**Final vs control: LCP +0.9 ms, TBT 0 ms, CLS unchanged.** Gates: TBT ≤ 150 ms ✅ · LCP ≤ +150 ms ✅ · CLS ≤ 0.05 ✅. Chunk loaded in 5/5 runs. LCP spread on the final capture was 726–819 ms, so the +0.9 ms median difference is well inside noise.

### The efficiency decisions that produced those numbers

- **No textures, no attribute buffers, no per-frame allocation.** The fullscreen pass is a buffer-less triangle generated from `gl_VertexID`; a frame costs two `drawArrays` calls on the CPU.
- **Motes are `GL_POINTS`, not a loop in the fullscreen shader.** This is the single biggest choice in the file. Fourteen motes evaluated per-fragment would multiply ~3.5 M fragments by fourteen distance tests to light a few hundred pixels; as points they shade only the sprites — roughly 22 k fragments.
- **A triangle rather than a quad**, so GPUs don't shade the diagonal seam twice.
- **One octave of value noise** for the haze, and `dot()` instead of `length()` in the mote falloff to avoid a `sqrt`.
- **Grain is quantised to 24 fps** inside the shader. That is an appearance decision (at 60 fps it fizzes like digital noise rather than reading as film) that costs nothing.

### Why the photograph is not displaced

The brief asked for "subtle depth displacement of the hero photograph". **Amendment 1 condition 2 rules it out**: a WebGL canvas cannot sample the DOM behind it, so displacing the photo means uploading it as a texture and drawing it *in* the canvas — which requires hiding the real `<img>`, and that `<img>` is the LCP element the amendment says "remains the LCP element permanently". It would also cost a ~5.8 MB RGBA upload and a second decode.

Amendment 1 already provides the sanctioned route for moving the photograph: **(B) scroll-linked opacity/transform on the hero media layer**, a capped CSS transform on the DOM element, which is a separate later step. What ships instead is an atmospheric **depth haze** — a slow luminance field that adds depth without moving, sampling or touching the LCP element.

### ⚠️ Bug found by reading pixels, not by looking

The first working build **rendered the entire fullscreen pass invisibly** while paying its full GPU cost. Cause: `gl.blendFunc` applies its source factor to the **alpha channel as well as colour**, so the canvas accumulated `src.a * src.a`. Grain sits at α ≈ 0.022; squared that is 0.0005, which **quantises to 0** in the 8-bit drawing buffer. Only the motes survived, their alpha being ~20× higher.

A screenshot could not have caught this — the hero looked plausible either way, and the Lighthouse numbers were *identical* because the GPU work happened regardless. It was found by reading back the drawing buffer and discovering only 0.3% of sampled pixels carried any alpha. Fix: `blendFuncSeparate(SRC_ALPHA, ONE_MINUS_SRC_ALPHA, ONE, ONE_MINUS_SRC_ALPHA)`. After it, coverage is 87–100% of pixels with mean α 3.3–9.7/255 and visibly animating grain.

**Verify a shader by sampling its output, not by looking at it.**

### Lifecycle re-verified with the shader live

Pause off-screen → frames frozen → resume; pause on tab hidden → frames frozen → resume; watchdog retires at the shipped thresholds (180 frames = 3 × 60, `mean frame 150.0ms > 32ms`), canvas removed from the DOM, hero image, headline and CTA all intact and the CTA still hit-testable.

---

## 5f. Amendment 1 (B) — the hero parallax transform (2026-07-19)

`src/hooks/useHeroParallax.js` + `--parallax-room` in `Hero.module.css`.

| | shader v1 | + parallax | delta |
|---|---|---|---|
| LCP median | 809.8 ms | **809.3 ms** | −0.5 ms |
| **TBT** | 0 ms | **0 ms** | **0** |
| CLS | 0.0003 | **0.0003** | 0 |
| route JS | 128.9 kB | 129.2 kB | +0.3 kB |

Gates: TBT ≤ 150 ms ✅ · LCP ≤ +150 ms ✅ · CLS ≤ 0.05 ✅. Chunk loaded 5/5.

**Scroll cost: 0 long tasks, 0 ms blocking across 60 scroll steps over the hero and back.** The hook writes only `transform`, coalesced to one write per frame, and stops entirely when the hero leaves the viewport.

### Implementation decisions

- **Only the `<img>` moves.** The WebGL canvas and the scrim stay fixed. Grain and motes are *viewport* atmosphere — moving them too would double the motion and make the two effects compete. The scrim staying put also keeps the headline's contrast gradient on the headline.
- **Room is created in CSS, not by scaling the LCP image.** `--parallax-room: 32px` gives the photo bleed above and below inside `overflow: hidden`; the hook clamps its translate to the same 32 px, so the photo's edge can never enter the frame. Verified at scrollY 0/60/150/213/400/900 — no exposure at any point, and the clamp holds at exactly 32.
- **No Lenis coupling.** Lenis scrolls the window, so it emits native scroll events; a passive listener works identically with smooth scroll on or off, and the hook contains no reference to Lenis.
- **Out of flow, so CLS is structurally impossible.** The photo is absolutely positioned inside `.media` (itself absolute), and `transform` is excluded from layout-shift scoring anyway.
- **Independent of the canvas.** Gated on `isCinematicEligible()`, not the WebGL gate — parallax needs no GPU. Verified: after the watchdog retires the canvas, the parallax still runs correctly with no edge exposure.

### ⚠️ Defect caught in review: the LCP image was being promoted at mount

The first version primed itself with an `onScroll()` call at mount, and `lastShift` started at `-1`, so the very first invocation always wrote — an identity `translate3d(0,0,0)` **plus `will-change: transform`** on the hero photograph before the user had scrolled a single pixel. That promotes the LCP element to its own compositor layer before it has painted, which is a direct risk to the metric Phase 0 spent its entire budget on.

Fixed by returning early while `shift === 0` and nothing has been applied yet. Verified at rest after load: `transform: none`, `will-change: auto` — the element is left exactly as the stylesheet describes it until the user actually scrolls.

### Measurement caveat

Scroll *smoothness* was not visually verified. The automation window runs rAF at **1 fps** when unfocused (docs/14 §5), which makes frame-rate observation meaningless there. What is verified is the main-thread cost of scrolling — 0 long tasks, 0 blocking — which is throttling-independent, plus that the work is compositor-only by construction (`transform` writes and nothing else). Perceived smoothness on real hardware remains unverified by this session.

---

## 5g. Post-merge verification on staging (2026-07-19)

Phase 5 merged to `main` (`3136c3f`) and auto-deployed. Verified on the real deployment.

### Functional: ✅ confirmed in a real browser

Canvas mounts and runs (992 frames, context created, `state: running`), **mounted 1196 ms after `load`**, Lenis loaded, and — the condition that matters most — **the reported LCP element is still `IMG._photo_*`**. Amendment 1 condition 2 holds on the deployed build.

### Measurement: ⚠️ `lh:cinematic` correctly REFUSED the staging capture

The chunk was recorded in only **1 of 5** runs, so the script failed the capture and the summary was discarded rather than committed. **This is the assertion working, not a product defect** — the browser check above proves the layer loads.

The cause is a limitation of the instrument worth knowing: **Lighthouse stops recording network activity before the trace ends.** In the failing runs the last recorded request ended at ~1501 ms while the scene mounts at ~1456 ms — right at the boundary. The one run that caught it recorded to 1988 ms. Staging is *faster* than local (load 256–724 ms vs ~50 ms of headroom locally), which pushes the mount past the recording window.

> **Consequence: `lh:cinematic` is reliable against a local preview and unreliable against staging.** It fails safe — it refuses rather than reporting a wrong number — but the desktop cost figures in §5e/§5f stand on the *local* A/B, and there is currently no validated staging measurement of the canvas's cost. A future fix would assert on the trace or on a DOM probe rather than on the `network-requests` audit.

### Staging metrics (page-level, valid regardless of the above)

| run | LCP | TBT | CLS |
|---|---|---|---|
| 1 | 616 ms | 0 | 0.0156 |
| 2 | 569 ms | 0 | 0.0159 |
| 3 | 567 ms | 0 | 0.0156 |
| 4 | 1236 ms | 0 | **0.0702** |
| 5 | 1437 ms | 0 | 0.0156 |
| **median** | **616 ms** | **0 ms** | **0.0156** |

TBT is 0 in every run. LCP median 616 ms against the 695 ms ceiling — note this is motion-enabled (Lenis loads), so it is not comparable to the 545 ms reduced-motion baseline; the gap is consistent with the ~75 ms Lenis cost measured in §5d.

### ⚠️ Open: one CLS run at 0.0702, over the 0.05 gate

Pre-Phase-5 staging CLS was **0.015 on all five runs** — perfectly stable. Post-Phase-5 it is 0.0156 on four runs (i.e. unchanged) and **0.0702 on one**. The median passes and four of five match the old baseline almost exactly, so this is **not** a systematic regression from the transform — which is out of flow and excluded from layout-shift scoring in any case.

The outlier landed on the slowest run (LCP 1236 ms), which fits the already-documented hero ticker skeleton→content swap: it is API-latency dependent, `docs/14` records it as "reproducibly 0.035 against a 0.05 gate" with a "thin" margin, and a slow Railway response would widen it. **That is a hypothesis, not a finding — it is not proven and it broke the gate once.** Re-measure on the next staging capture; if it recurs, reserve space for the ticker cards rather than raising the gate.

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
