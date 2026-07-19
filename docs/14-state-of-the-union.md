# MotoPark V2 — State of the Union

**Written:** 2026-07-18 · **Updated:** 2026-07-19 · **Read this first in a new session.**
Supersedes `docs/HANDOFF.md` where they disagree (HANDOFF is older and stale in places — see §7).

---

## 1. The Goal

Ship **MotoPark V2** — a premium, cinematic storefront for motorcycle gear — and retire V1.

The owner's ambition is a lusion.co-grade feel. That ambition was reconciled against the project's own locked design decisions on 2026-07-18 rather than being pursued directly: see `docs/10` **Amendment 1**. The result is deliberately narrow — a decorative WebGL layer in the hero frame only, desktop-only, post-LCP, containing no content. Scroll-jacking, pinned sections, general parallax and continuous animation in commerce sections remain **banned**.

The governing principle, unchanged and quoted from the doctrine:

> *"Premium comes from layout, typography, spacing, photography, hierarchy — animation is seasoning, not the dish."*

**Both the V2 storefront and the V2 admin panel are already feature-complete.** This work is polish and performance, not construction.

---

## 2. Completed Phases

### Phase 0 — Instrumentation & LCP delivery ✅ (`7c61389`)

Before this, `docs/11 §10` claimed "regressions block" but nothing measured anything. Now:

| Tool | Command | Role |
|---|---|---|
| Budget tripwire | auto in `npm run build` | Resolves what `/` pulls **statically**, gzip+brotli, fails build over budget. Also fails on cinematic code in the static graph. |
| Bundle analyzer | `npm run analyze` | `rollup-plugin-visualizer` → `perf/stats.html` |
| Lighthouse CI | see §6 of `docs/13` | mobile, 5 runs, against **staging** not localhost |
| Field CWV | automatic | `src/lib/webVitals.js` → GA4 `web_vitals` event |
| Hero variants | `npm run images` | dev-only `sharp`, kept off the Vercel build path |
| LHR summariser | `scripts/summarize-lhr.mjs` | 2.8 MB of raw reports → 3 kB |

Also fixed: the hero was imported through JS so the preload scanner never saw the LCP element (now `public/` + AVIF/WebP + `media`-based preload, mobile 128 kB → 17.6 kB); and `AdminApp` was statically imported into the entry chunk (now `React.lazy`).

### Phase 1 — Doctrine amendment ✅ (`a6d895e`)

Documents and one lint rule; zero application code. `docs/10` Amendment 1 + `docs/11` v1.1 (`§7b`, layer-table row, changelog justification), plus `src/cinematic/` and its README.

### Phase 2 — UI primitives ✅ (`2cb9717`)

`components/ui/Field.jsx` now owns **every** form control in `src/pages` — zero raw `<input>`/`<textarea>`/`<select>` remain. It replaced three drifted implementations and fixed a real defect: **no error was programmatically linked to its control anywhere**. Verified live — an empty checkout submit marks 6 fields `aria-invalid` with `aria-describedby` → `role="alert"` messages. Account's address form was placeholder-only with no labels at all; now labelled. CSS net **−361 bytes**.

### Phase 3 — Lenis smooth scroll ✅ (`501c96f`)

Home route only, desktop only, destroyed on unmount (= on route change). `lenis` was installed but imported nowhere; now reached by dynamic `import()` from `hooks/useSmoothScroll.js` → `cinematic/smoothScroll.js`. Chunks separately at **5.4 kB gzip**, outside the `/` static graph.

The apparent lint conflict (`.oxlintrc.json` blocks `lenis` outside `src/cinematic/`, the mandate puts it on Home) needed **no doctrine or lint change** — the cinematic README already claims "scroll choreography, and the machinery that drives them".

**`src/lib/motionEligibility.js` is the new shared gate — Phase 5 should reuse it.** It lives *outside* `src/cinematic/` on purpose: it decides whether to download that folder, so it must be evaluable without loading it. Desktop + fine pointer + no reduced-motion, re-evaluated on media-query change rather than latched.

### Phase 4 — Scroll reveals ✅ (`32aea8f`)

`hooks/useReveal.js` + `components/ui/Reveal.jsx`. Sections (not items — the ≤3 concurrent cap) fade+rise once; 280ms commerce, 400ms story band.

**Built on IntersectionObserver + a CSS class toggle, NOT the LazyMotion pattern docs/14 originally specified.** Deliberate: the open problem is the client-render path, and per-element Framer work during scroll adds to it; reduced-motion also collapses to one `@media` block. Framer remains for `AnimatePresence`.

Two properties worth preserving if this is ever refactored: **nothing above the fold animates** (already-visible elements are marked revealed synchronously, and Hero is unwrapped because it holds the LCP image), and **content cannot strand at opacity 0** (the hidden state is applied by JS, plus the jump guard in §5).

### 2026-07-19 — security, CLS, image weight, and the LCP endgame ✅

Not a numbered phase; a day of fixes triggered by an external synthetic audit.

- **Security (`4e6033d`)** — removed the hardcoded `"motopark_user_secret"` JWT fallback from four customer paths. With `JWT_SECRET` unset, anyone reading this repo could forge a customer session. The secret now has exactly one reader (`backend/config/jwt.js`) and no default. Verified by performing the attack: a token signed with the old string is rejected as `invalid signature`.
- **Desktop CLS 0.112 → 0.014 (`599db32`)** — the route Suspense fallback reserved `60vh`, leaving the footer *inside* a 940px viewport; rendering the real page then shoved it off-screen. That single shift was 86% of total CLS. Now `100dvh`. **Every CLS assertion had been mobile-only, where it measured a clean 0** — a desktop CLS row now exists so a viewport-specific defect cannot hide again.
- **Images 999.7 → 393.8 kB (`599db32`, `127197b`, `d6900e6`)** — showcase posters bypassed `cloudinaryUrl()` (three 1448px originals, 705 kB, two displayed at 166px); the `<video poster>` attribute silently duplicated a 254.8 kB raw fetch behind an always-covering poster layer; and a hardcoded demo reel of **Cloudinary's public sample assets** (dog, elephants, sea turtle) downloaded 211 kB on every view and risked showing stock animals if the API ever returned empty. All three fixed.
- **A11y (`69f0c77`)** — AccountPage's two form-level errors were bare `<p>` elements: a failed submit was silent to screen readers.
- **Admin parity audit (`1364ebc`)** — six rebuild candidates cut to zero. See §6.
- **LCP endgame (`fa7d1b8`, `c3a8911`, `bffdd94`, `284dfd7`)** — three experiments, all reverted; lab budget deliberately revised to 3500 ms; Phase 5 unblocked. See `docs/13 §3f`/`§3g`.

**Deliberately NOT built: Skeleton, Badge, Card.** Usage was surveyed first and the demand wasn't there — the skeleton pattern is already correct, there's one sale badge and one status pill serving different purposes, and only two `.card` blocks are identical. Do not "finish the set" without new evidence.

---

## 3. The Current Gate 🚦

**Phases 0–4 are DONE, plus the 2026-07-19 hardening — see §2. Phase 5 is the only thing left, and as of 2026-07-19 it is UNBLOCKED.**

**Do not install GSAP** — every allowed effect is one-shot transform/opacity work already covered. See §3b before writing any WebGL: the recommendation is that Three.js probably isn't needed either.

### Phase 5 — WebGL hero: ✅ UNBLOCKED 2026-07-19

**The gate is open.** Read `docs/13 §3f` and `§3g` before starting, and `docs/10` Amendment 1 for what still binds.

Short version: LCP improved 4712 → **3441 ms** through real work; three further experiments (static hero shell, eager home route, `decoding="async"`) then failed to move it at all and were reverted; the evidence showed Load Delay is 0 ms in every run and 46–81% of LCP is main-thread render delay that this stack cannot tune away. The **lab** budget was then deliberately revised to **3500 ms** (owner-authorised, recorded). The **field** budget is unchanged at **2500 ms mobile p75** — the product requirement did not move.

**Headroom is 59 ms.** The gate is met, not comfortably. Do not spend the difference.

**Everything else in Amendment 1 still binds:** desktop-only, post-LCP, decorative, confined to `src/cinematic/`, no content in the canvas, kill-switch intact. The mobile TBT row is the tripwire that proves isolation — mobile must never load the cinematic chunk.

<details><summary>Original gate text (historical)</summary>

Amendment 1 contains this as a written blocking condition. **No WebGL ships until the LCP budget is met.**
</details>

Current state after the Phase 0 deploy (5 runs, staging, mobile):

| | Before | After | Budget |
|---|---|---|---|
| LCP median | 4712 ms | **3926 ms** | **2500 ms** ❌ |
| CLS | 0 | 0 | < 0.05 ✅ |
| TBT | 23 ms | 27 ms | < 200 ms ✅ |
| Route `/` JS | — | 127.9 kB | 180 kB ✅ |

**Why it still misses, and why more image work won't help.** In the post-deploy run: `hero-960.avif` downloads 245→633 ms, all JS is down by ~590 ms, all fonts by ~631 ms, `render-blocking-resources` = 1.0, `font-display` = 1.0, `prioritize-lcp-image` = 1.0, TBT 27 ms, CLS 0. Every byte is on the device by ~633 ms with nothing blocking and an idle main thread — yet it doesn't paint until ~3926 ms.

That gap is the **client-render path**. The `<img>` doesn't exist in the DOM until React boots and renders. A preload makes bytes arrive early; it cannot make the element exist early. Phase 0 fixed the resource layer completely; what remains is architectural.

**Two things must be true before Phase 5 opens:**

1. **The budget is a FIELD statistic.** `docs/09 §14` says "LCP < 2.5 s mobile **p75**" — p75 of real users, which no lab tool can produce. `web-vitals` → GA4 went live with this deploy, so that number is being collected for the first time. **Judge the gate on GA4 field p75, not on the Lighthouse median.** Lab noise is ~2.9 s (spread 2725–5674 ms), too wide to adjudicate a ±100 ms gate.
2. If field p75 also misses, options are recorded in `docs/13 §3d`: a **static hero shell** in `index.html` (highest leverage; must not regress CLS from its perfect 0), reducing boot cost, or **deliberately revising** a budget written before anything measured it. Revision is legitimate — 2.5 s simulated-mobile LCP is hard for any CSR SPA — but must be a recorded decision, not quiet drift.

> **The static hero shell is already built and waiting on branch `perf/static-hero-shell` (`ed1609e`, pushed).** Do not merge it while field data is accumulating — changing LCP delivery mid-collection blends two populations into one p75 and destroys the gate decision. Verified there: it paints as the LCP candidate, hands off to Hero.jsx once the real `<img>` is `complete`, leaves no node behind, is removed on non-home routes, and adds no second image request (one hero fetch, 39.1 kB). CLS measured like-for-like against `main` on the same server: **0.08833 vs 0.08832 — the shell adds nothing.** That 0.088 is a dev-only StrictMode artifact (the footer collapsing), not the production 0; **confirm production CLS with `npm run lhci` before merging.** A Vercel preview deployment of the branch is the cheapest way to get that number.

---

## 3b. Phase 5 — proposed architecture (NOT yet approved, no code written)

Amendment 1 lists **seven numbered conditions**. Each maps to a mechanism; nothing here is left to reviewer vigilance.

### The big recommendation: probably no Three.js

Amendment 1 permits "a decorative WebGL layer". It does **not** require a 3D engine. The whole architecture in §4 exists because `three` + `@react-three/fiber` + `drei` cost **230–280 kB gz against ~52 kB of headroom**.

A hand-written **WebGL2 fullscreen fragment shader** costs roughly **3–6 kB with zero dependencies** and covers everything the brief actually describes — grain, a slow light sweep, subtle depth displacement of the hero photograph, drifting dust motes. **Recommended: Option A (raw shader).** Take Option B (`three` + r3f) only if an approved visual direction genuinely needs 3D geometry, and re-run the budget maths first.

> **⚠️ Correction (2026-07-19) — the byte argument above does not actually hold, but the conclusion does.**
>
> "230–280 kB against ~52 kB of headroom" compares Three.js to a budget that **structurally does not apply to it**. `check-budgets.mjs` counts the entry chunk and HomePage plus their *static* imports only; its own header says *"Dynamic imports are deliberately NOT counted — that is the whole point."* A correctly lazy `src/cinematic/` chunk never enters that total no matter how large it is. **Three.js would pass every byte gate in this repo cleanly.** Anyone who checks this will find the stated reason for Option A is wrong, and could reasonably conclude Three.js is therefore fine.
>
> **It isn't, and here is the argument that survives.** The binding constraint is **desktop main-thread time**, not route bytes. 230–280 kB of JavaScript must still be parsed, compiled and executed on the device — post-LCP, but on the same thread as everything else — and `docs/13 §5b` now measures that: **desktop TBT baselines at exactly 0 ms across all 5 runs.** A raw shader adds a few kB and a compile; an engine adds a quarter-megabyte of module evaluation to a metric whose entire current value is zero. Amendment 1 condition 6 ("self-limiting … unmounts if frame times degrade") points the same way.
>
> So: **still Option A**, but for a reason that is now measurable rather than a byte comparison that doesn't apply. If Option B is ever revisited, the test is a desktop TBT/LCP capture against `baseline-2026-07-19-desktop.json` — not `npm run budgets`, which will wave it through.

Option A also makes the degradation ladder trivial: cutting a 5 kB decorative chunk is nothing.

### Condition-by-condition enforcement

| # | Amendment 1 condition | Mechanism |
|---|---|---|
| 1 | Desktop only, hard stop <1024px and on `pointer: coarse` | `isCinematicEligible()` in `src/lib/motionEligibility.js` — already built and proven in Phase 3 |
| 2 | **Not fetched until LCP observed, then `requestIdleCallback`** | `PerformanceObserver({type:'largest-contentful-paint'})` → `requestIdleCallback` → *then* `import()`. The import is the last step, not the first |
| 3 | Non-interactive | `pointer-events: none`, `aria-hidden="true"`, z-index strictly below hero content — asserted in a test, not just styled |
| 4 | No content in canvas | Enforced by review + the `src/cinematic/` import ban (no `services/`, `contexts/`, `lib/api.js`) |
| 5 | Additive to a complete hero | Hero renders identically with the canvas absent; kill-switch test below |
| 6 | **Self-limiting: capped DPR, paused when hidden/scrolled out, unmounts if frame times degrade** | DPR `min(dpr, 1.5)`; `visibilitychange` + IntersectionObserver pause; a rolling frame-time watchdog that unmounts back to the static hero |
| 7 | reduced-motion / save-data / low-memory / no-WebGL fall back silently | ✅ `isWebGLHeroEligible()` in `src/lib/motionEligibility.js` — built and browser-verified 2026-07-19, see below |

### Two gaps found while reading the amendment — ✅ BOTH CLOSED 2026-07-19

**A. `motionEligibility.js` was insufficient for Phase 5.** ✅ **Extended.** It covered width, pointer and reduced-motion; condition 7 also requires save-data, low-memory and a real WebGL context probe.

Added **additively** — `isCinematicEligible()` is byte-for-byte unchanged, so Phase 3's Lenis behaviour is untouched. Folding the new checks into it would have silently altered shipped, verified code as a side effect of Phase 5 work; Lenis is a scroll easing with no GPU cost, and the two gates are not the same gate.

- `hasConstrainedResources()` — `saveData === true`, or `deviceMemory < 4`. Both APIs are Chromium-only; **absent reads as unconstrained**, because assuming constraint would disable the layer for every Safari and Firefox desktop user on no evidence.
- `hasWebGL2()` — real `getContext('webgl2', { failIfMajorPerformanceCaveat: true })`. Disposes its test context via `WEBGL_lose_context` (browsers cap ~16 concurrent contexts and evict the oldest — a leaked probe per call would eventually kill the real canvas), and memoises. The memoisation is a deliberate exception to the file's "never cache" rule: GPU capability can't change mid-session, unlike a media query. It answers *"is it worth downloading the chunk"*; the authoritative check remains the real `getContext` in the scene plus the condition-6 watchdog.
- `isWebGLHeroEligible()` — the composed gate. **Order is load-bearing:** cheap media queries short-circuit first, so a phone never allocates a GL context just to be told it's ineligible on width.

**Verified in a real browser, 12 + 8 assertions, all passing** — memory boundary (4 GB is *not* low), save-data, absent APIs, `null` and *throwing* `getContext`, memoisation of both `true` and `false`, and the two claims that actually mattered: the probe's context reads `isContextLost() === true` afterwards, and 40 consecutive probes still leave a real context obtainable. The in-app pane was adequate here — `docs/14 §5`'s warning is about rAF and IntersectionObserver, and this gate uses neither.

**Costs 0 bytes on `/`** — verified tree-shaken out of the built bundle (nothing calls it yet), and a like-for-like build on a clean tree gives the identical 128.4 kB. *(§4's "127.9 kB" is stale; the current figure is 128.4 kB, unrelated to this change.)*

**B. Nothing measured the desktop cost.** ✅ **Collector built and baseline captured** — `lighthouserc.desktop.json`, `npm run lhci:desktop`, `perf/baseline/baseline-2026-07-19-desktop.json`. Full detail in **`docs/13 §5b`**.

**Desktop LCP 545 ms · CLS 0.0148 · TBT 0 ms · score 100.** The important part is the *precision*: the LCP spread is **39 ms (7%)** against mobile's ~1000 ms (29%), and TBT and CLS are identical across all five runs. §3e records that mobile noise is "too wide to adjudicate a ±100 ms gate" — desktop does not have that problem.

> **This inverts which instrument matters for Phase 5.** Mobile TBT proves the layer stays *isolated*; **desktop TBT is the only thing that measures what it costs**, and it baselines at exactly 0 ms, so any nonzero value afterwards is attributable to the canvas and nothing else.

Two things surfaced while building it, both recorded in `docs/13 §5b`:

- **`summarize-lhr.mjs` hardcoded its `conditions` string as `"mobile · …"`.** Left alone, the desktop baseline would have been committed describing itself as mobile — and desktop LCP is ~6× faster, so the mislabelled file would read as a spectacular improvement to anyone comparing. It now derives conditions from each report and **refuses to summarise mixed form factors under one label** (guard tested in both directions). This is the §5 like-for-like trap, now enforced by the tool instead of by memory.
- **The gates were weaker than their documentation — ✅ fixed 2026-07-19.** lhci defaults to `aggregationMethod: "optimistic"`, which for `maxNumericValue` asserts the **best** of 5 runs — while §5 labels the rows "median of 5" and §3g reasons entirely in medians. **Both** configs now set `"median"` explicitly (owner-approved). If you ever add a third config, set the key: the default is not what this project's docs assume, and nothing warns you.

### Proposed sequence

1. ~~Desktop lhci config + desktop baseline captured and committed.~~ ✅ **Done** — `docs/13 §5b`.
2. ~~Extend `motionEligibility.js` for save-data / deviceMemory / WebGL probe. Verify each branch.~~ ✅ **Done** — see A above.
3. ~~`HeroScene.jsx` — inert scaffold, correct lifecycle, no visual effect yet.~~ ✅ **Done 2026-07-19** — see §3c below.
4. Re-measure: desktop LCP within +150 ms; **mobile TBT unchanged** (the isolation tripwire); route JS unchanged.
5. Only then the actual shader/visual work, which needs an approved visual direction.
6. Amendment 1 **(B)** — capped scroll-linked transform on the hero media — as a separate, later step.

**Kill-switch implementation.** `lazy(() => import('@/cinematic/HeroScene.jsx').catch(() => ({ default: () => null })))`. A failed chunk then renders nothing instead of throwing.

> **⚠️ Corrected 2026-07-19 — the `.catch` does NOT survive deleting the folder, and the test as written here never passed.** A dynamic `import()` with a static string is resolved at *build* time; `.catch` is a runtime handler and cannot run for a module that was never bundled. Deleting `src/cinematic/` and building fails with `UNLOADABLE_DEPENDENCY` for **both** `HeroScene.jsx` and `smoothScroll.js` — the second meaning this has been true since **Phase 3**, not a Phase 5 regression. Left as-is deliberately: a missing source file should fail the build loudly, not silently ship a different app. The real requirement still holds — delete the folder *and* its two mount sites (three lines) and the storefront is complete. Detail in `src/cinematic/README.md`.

---

## 3c. Phase 5 step 3 — the inert scaffold ✅ (2026-07-19)

Three new files, all verified in a **production build** via `vite preview` (see the trap at the end — the dev server cannot prove this):

| File | Role |
|---|---|
| `src/hooks/useCinematicHero.js` | Enforces *when* the layer may load. Outside `src/cinematic/` — it decides whether to download that folder. |
| `src/cinematic/HeroScene.jsx` | The canvas. Real WebGL2 context, real rAF loop, **clears to transparent — no visual effect yet.** |
| `src/cinematic/sceneDiagnostics.js` | Observable state + watchdog tunables. The layer is invisible, so without this "working" and "silently broken" are indistinguishable. |

`Hero.jsx` mounts it between the photo and the scrim. That ordering is a **contrast guarantee**: the scrim paints over the canvas, so the headline's AA contrast holds regardless of what the shader eventually renders. Chunk: **2.12 kB raw / 1.14 kB gzip**, outside the `/` static graph. Route JS 128.4 → **128.9 kB**.

### Verified behaviour

| Claim | Result |
|---|---|
| Mounts after the page settles | mount at **964 ms**, `load` at 54 ms (+910 ms) |
| Non-interactive | canvas is never the hit-test target; CTA navigates to `/store` |
| `aria-hidden`, below scrim, DPR capped | all confirmed |
| Pause off-screen / resume | `paused-offscreen`, frames frozen → `running` |
| Unmount on route change | canvas removed, state `idle` |
| **Watchdog retires** | 180 frames = 3 × 60, 3 strikes, `mean frame 100.0ms > 32ms`, canvas removed, **hero fully intact** |
| **Mobile isolation** | at 390 px: cinematic chunk **never requested**, no Lenis either, hero complete |

### Two design corrections found by measuring

**1. Waiting for an LCP entry is a trap.** The first implementation armed on `PerformanceObserver('largest-contentful-paint')`. Verified in-browser: a load of this homepage produced an **empty `paint` timeline and zero LCP entries**, and the hook sat idle until its 8-second fallback. This is not only a test artifact — Chrome reports no LCP for **bfcache restores, prerendered pages, and tabs opened in the background**. Gating on an entry that may never arrive is a silent stall.

Now the trigger is **`load` AND the last LCP candidate, whichever is later**. `load` always fires, so it is a reliable floor; LCP candidates only ever push the moment later. Amendment 1's intent ("not fetched until LCP observed") is met — arming is never earlier than the final LCP candidate when one exists — and `requestIdleCallback` is the second, independent guarantee, since a thread still working toward a paint is not idle.

**2. The watchdog conflated "slow GPU" with "browser throttling us".** An unfocused window ran at ~5 fps (~200 ms deltas) while rendering perfectly. Retiring is permanent for the life of the mount, so that would have disabled the layer over a condition lasting seconds that is not our cost. Deltas above `outlierMs` (150 ms) are now **discarded, not counted** — discarded rather than clamped, because a clamped outlier still drags the mean toward the budget and retires by attrition.

### Also worth knowing

- **The WebGL probe runs inside the idle callback, not in the early bail-out.** It creates a real GPU context; running it during load would put main-thread work in front of the very LCP it protects. Cheap media queries bail out early; expensive checks only once provably idle.
- **`sceneDiagnostics` is pinned to `globalThis` via `Symbol.for`.** A module can be instantiated twice (Vite appends a version query to changed modules), which read as "canvas mounted but no context created" — two objects, one never written to.
- **The dev server cannot verify this.** StrictMode double-mounts; cleanup calls `loseContext()`, and the second mount reuses the *same* canvas element and gets back a dead context. Harmless in production (a real route change destroys the element) but it makes the rAF loop unverifiable in dev. **Verify the scene against `npm run preview` (build first), not `npm run dev`.**

### Step 4 — measured ✅, with one finding that changes the plan

Local like-for-like A/B, 5 runs each, control = `main`'s Hero without the mount (full detail in **`docs/13 §5c`**):

| | control | scaffold | delta |
|---|---|---|---|
| LCP | 733.4 ms | 732.5 ms | **−0.8 ms** |
| **TBT** | 0 ms | **0 ms** | **0** |
| CLS | 0 | 0 | 0 |
| route JS | 128.4 kB | 128.9 kB | +0.5 kB |

All three gates pass. Captured locally, not against staging, because staging deploys from `main` — running the config unchanged would have measured code without the scaffold.

> **⚠️ But Lighthouse never loaded the canvas.** In all 10 runs the `HeroScene` chunk was never requested; both sides issued an identical 32 requests. Captured from inside a run: `GATE {"w":true,"fine":true,"red":true,...}` — **`prefers-reduced-motion` matches `reduce` under Lighthouse**, so condition 7 correctly refuses. Not a timing artifact (the trace ran to 3304 ms, the scaffold arms at ~950 ms) and not the WebGL probe (removing `failIfMajorPerformanceCaveat` changes nothing).
>
> Those zeros mean **"the scaffold adds nothing to page load"** — exactly what condition 2 demands — and **not** "the canvas is free". **The Desktop TBT ≤ 150 ms row cannot currently gate shader cost at all**, because Lighthouse will always measure the reduced-motion fallback.

### The fixed instrument ✅ (`docs/13 §5d`)

`scripts/lh-desktop-cinematic.mjs` · **`npm run lh:cinematic`** — Lighthouse driven through a Puppeteer page with `prefers-reduced-motion: no-preference`, so the canvas actually loads. No new dependency (`puppeteer-core` ships inside `lighthouse`), and settings are imported from Lighthouse's own `desktop-config.js` so captures stay comparable by construction.

**It asserts the cinematic chunk was requested and fails the run otherwise** — without that it would decay into the instrument it replaces. `EXPECT_CINEMATIC=0` inverts the assertion for capturing controls.

**Honest baseline, canvas loaded in 5/5 runs** (`HeroScene.js` 1662 B + CSS 434 B):

| | control | canvas active | delta |
|---|---|---|---|
| LCP | 808.9 ms | 808.9 ms | −0.05 ms |
| **TBT** | 0 ms (all 5) | **0 ms (all 5)** | **0** |
| CLS | 0 | 0 | 0 |

All three gates pass, measured for the first time on a page where the canvas ran.

**Sensitivity proven, not assumed.** With 90 ms/frame of artificial blocking work injected: **TBT 0 → 7146 ms** (47× over budget) while **LCP did not move at all**. The canvas loads post-LCP by design, so **TBT is the only lab gate that can see shader cost — never judge a shader by its LCP.**

**Side effect worth knowing: this measured Lenis for the first time too.** It shares the same gate, so every earlier desktop capture ran under reduced motion with *neither* Lenis nor the canvas. That is the 733 → 809 ms gap between the reduced-motion and motion-enabled controls: **~75 ms of smooth scroll that had never been measured since Phase 3 shipped.** Only compare motion-enabled captures with other motion-enabled captures.

---

## 4. Key Constraints — non-negotiable

### The 180 kB budget

Route `/` must stay **≤ 180 kB transferred (brotli) JS**. Currently **128.4 kB (71%)** — roughly **52 kB of headroom**. *(Measured 2026-07-19 via `npm run build`. The earlier "127.9 kB / ~30 kB headroom" reading was a stale Phase 0 figure; the headroom arithmetic against it was also wrong — 180 − 128.4 = 51.6.)*

The cinematic stack costs **230–280 kB gz** (`three` 150–170, `@react-three/fiber` ~30, `drei` 20–50, `gsap` ~28). That is **~8× the headroom**, and it is the single fact that dictates the whole architecture below.

> Unit note: the budget is **brotli/transferred**, because Vercel serves brotli and Lighthouse reports transfer size. Older docs said "gz". One budget, one unit.

### The No-Man's-Land: `src/cinematic/`

Governed by `docs/11 §7b`. Nothing outside may **statically** import from it. The only legal entry is:

```js
const HeroScene = lazy(() => import('@/cinematic/HeroScene.jsx'));
```

It is stricter than `ai/`: it may **not** import `services/`, `contexts/`, or `lib/api.js` — the layer is decorative and has **zero data dependencies**. No text, links, or product data inside a `<canvas>`; the `<h1>`, CTAs and product ticker stay in static DOM. **Kill-switch guarantee:** deleting the folder must leave the storefront fully functional.

### Lazy-loaded or decoupled — no exceptions

Three gates enforce this automatically. All were verified against a **deliberately planted breach**:

1. `.oxlintrc.json` `no-restricted-imports` — blocks `three`/`@react-three/*`/`gsap`/`lenis` outside `src/cinematic/`, and blocks **static** imports of `@/cinematic/*` everywhere while intentionally allowing dynamic `import()`.
2. `scripts/check-budgets.mjs` — fails `npm run build` on any cinematic module in the `/` static graph, **including one merged invisibly into another chunk** (via `dist/.vite/module-map.json`).
3. `docs/13 §5` mobile TBT gate — mobile never loads the cinematic chunk, so any TBT movement proves the isolation leaked.

---

## 5. Traps already paid for — do not rediscover

- **`manualChunks` does not fence code off; it only relocates it.** Fencing `features/admin` into a named chunk *increased* route JS 127 → 154 kB, because rolldown co-located axios and React CJS interop into that chunk, which the entry needs. `manualChunks` is now React-only. **Do not add `three`/`gsap` entries** — they're dynamically imported and chunk automatically.
- **Never use `srcset` width-descriptors for a preloaded LCP image.** The preload scanner and the layout engine compute needed width independently and can disagree — measured: scanner took `hero-960` at 11 ms, the `<img>` then took `hero-1280` at 170 ms. The LCP image downloaded **twice**. Selection is by `media` query; `index.html` and `Hero.jsx` breakpoints must change together.
- **A manifest-based isolation check is not enough.** The first version passed a planted breach because the module had merged into the HomePage chunk. That's why `moduleMapPlugin()` exists in `vite.config.js` — don't remove it.
- **`lhci collect --numberOfRuns>1` crashes on Windows** (`EPERM`, chrome-launcher temp cleanup). Use the one-at-a-time loop in `docs/13 §6`; the `|| true` is load-bearing.
- **Never commit raw Lighthouse reports** (~540 kB each). Run them through `scripts/summarize-lhr.mjs`.
- **Lighthouse cannot measure INP at all**, and cannot produce p75. TBT is a lab proxy, not the same metric.
- **IntersectionObserver does not fire on a jump.** It fires when a threshold is *crossed*; an instant jump takes a section from ratio 0 below the viewport to ratio 0 above it in one frame, so no callback ever runs. Any reveal built on IO alone leaves jumped-past sections invisible forever — and the homepage triggers this itself via the hero's `#trust` anchor, plus scroll restoration and Ctrl+End. `useReveal.js` carries a debounced sweep for exactly this. Don't "simplify" it away.
- **Rearranging chunks does not reduce main-thread work — it relocates it.** Making the home route eager to save a round trip shipped **5 kB less JavaScript and was 240 ms slower**, with TBT 6× worse. One big chunk is one long task. Proven, reverted, recorded in `docs/13 §3f`.
- **Never report a lab delta without a like-for-like baseline.** A measured CLS of 0.088 on a feature branch looked like a regression; `main` measured 0.08832 under identical conditions. The change contributed nothing. Two of the three LCP experiments would have been misread the same way without a same-session control.
- **Distrust a summary number until you look at its distribution.** "50 products updated in 30 days" implied daily inventory work; 46 of those writes landed on a single day (a bulk backfill) with only 5 distinct `updatedAt` values across all 50 rows. That one check cancelled an entire rebuild.
- **A gate that watches one viewport cannot see a defect that exists only in the other.** Desktop CLS sat at 0.112 on production while the mobile-only assertion read a clean 0.
- **Lighthouse emulates `prefers-reduced-motion: reduce`.** Any feature gated on reduced-motion is therefore invisible to it — Lighthouse measures the fallback and reports clean numbers that say nothing about the feature. Cost 10 Lighthouse runs and an A/B that looked like a pass. Use `npm run lh:cinematic` for anything behind the motion gate, and check the chunk was actually *requested* before believing a "no cost" result.
- **A "0 ms" result is a claim about the instrument before it is a claim about the code.** Both times TBT read 0 here, the honest next question was "would this number have moved if the feature were expensive?" The first time the answer was no (the chunk never loaded); the second time it was verified by injecting 90 ms/frame and watching TBT hit 7146 ms. Prove sensitivity before reporting a zero.
- **Verify the cinematic layer against `npm run preview`, never `npm run dev`.** StrictMode double-mounts effects; HeroScene's cleanup calls `WEBGL_lose_context.loseContext()`, and StrictMode's second mount reuses the **same canvas element** and gets back a dead context. The rAF loop then runs exactly one frame and stops, which looks like a broken watchdog but is a dev-only artifact — a real route change destroys the element, so production is fine. Use `npm run build && npm run preview`.
- **A dynamic `import()` with a static string is still resolved at build time.** The `.catch()` kill-switch protects a runtime chunk failure, not a deleted folder — see §3b's correction.
- **The in-app browser pane reports `visibilityState: "hidden"`.** That suppresses IntersectionObserver callbacks and freezes `requestAnimationFrame`, so reveals and Lenis motion **cannot be verified there** — screenshots and rAF-based probes just hang. Verify scroll/animation work through the Playwright MCP browser instead; it renders and reports `prefers-reduced-motion: no-preference`.

---

## 6. Open items

- ~~**AccountPage was never verified in a browser**~~ ✅ **Verified 2026-07-18.** Auth gate redirects `/account` → `/login?redirect=/account`; the `disabled`+`hint` path renders correctly (Email disabled, hint linked via `aria-describedby`); all six address fields are labelled; and the address happy path saves end-to-end. **It found a real bug** — both form-level errors (`profileError`, `addrErr`) were bare `<p>` elements with no `role="alert"`, so a failed submit was silent to screen readers. Fixed. To log in for future checks: V2's UI offers **only OTP and Google** — there is no password field — so get a token from `POST /api/users/login/email` and set `mp-auth-token` + `mp-auth-user` in localStorage.
- **V1 admin parity gap — AUDITED 2026-07-18 against the production `motopark` database. The gap is much smaller than it looked; rebuild almost nothing.** Reproduce with `node scripts/auditAdminUsage.mjs .env motopark` (read-only).

  | V1 section | collection | docs | last write | verdict |
  |---|---|---|---|---|
  | AdminCarouselManager | `carousels` | 6 | 25d ago | **Do not rebuild** |
  | AdminNavbarManager | `navbars` | 1 | 129d ago | **Do not rebuild** |
  | AdminHomeLayout / HomeBuilder | `homelayouts` | 1 | 83d ago | **Do not rebuild** |
  | AdminMedia | `media` | 1 | 118d ago | **Do not rebuild** |
  | OffersAdmin | `offers` | 2 | 25d ago | **Capability gap — see below** |
  | InventoryManager | `products` | 50 | today | **Do not rebuild** |

  **The decisive fact: V2 consumes none of these five content collections.** Not one. Its homepage order is code (`HomePage.jsx`), its nav is `config/nav.js` plus the real taxonomy collections (never `navbars`), its offer bar is hardcoded in `OfferBar.jsx`, and Concept C has no carousel at all. The only `/carousel` and `/media` strings in V2 are the unrelated `/upload/*` endpoints for the video showcase. These five sections administer data that V2's design has already replaced.

  **`InventoryManager` is NOT the keeper it looked like.** 46 of its 50 product writes landed on one day (2026-07-08) — a bulk backfill, not stock editing; only 4 genuine per-product edits happened in the following 10 days, and just 5 distinct `updatedAt` values exist across all 50 products. V2's per-product `VariantEditor` comfortably covers that volume.

  **The one real regression is `OffersAdmin`.** `OfferBar.jsx` hardcodes the promo message, so changing it now needs a code deploy where V1 allowed an admin edit — and `offers` was genuinely touched 25 days ago. This does not mean rebuilding OffersAdmin; it means giving V2 a small native way to edit that strip. Same question applies more weakly to the nav (`config/nav.js` is also code), but `navbars` has not been written in 129 days.
- ~~**Six undocumented env vars**~~ ✅ **Documented 2026-07-18** (`6ac859a`). While doing it, one thing surfaced that is worth treating as a real security item, not just a doc gap: **the customer JWT paths fall back to the hardcoded string `"motopark_user_secret"` when `JWT_SECRET` is unset** (`userController.js:14`, `orderRoutes.js:72,87`, `paymentRoutes.js:41`), and that fallback is committed to this repo — so an unset `JWT_SECRET` means anyone reading the source can forge a customer session. The admin path has no fallback and fails closed instead. The local `backend/.env` does set it; **whether Railway sets it has not been checked — do that first.** Then remove the fallback so the customer path fails closed like the admin one. Small change, high value.
- **Abandoned-cart recovery does not exist.** No job, no trigger, no cron — despite being a PRD KPI and sometimes assumed present. Not a cutover blocker; decide separately.
- **No test framework anywhere.** Four hand-rolled scripts in `backend/scripts/` are good and unwired to CI — especially `testPlaceOrder.js`'s partial-rollback case, which silently destroys inventory if broken.
- **Admin logout revocation is an in-memory `Map`** (`authMiddleware.js:5`) — breaks on multi-instance deploys. The file says so itself.
- **Offer strip is hardcoded.** `OfferBar.jsx` holds the promo copy, so changing it needs a deploy where V1 allowed an admin edit. Owner accepted this for now; a small V2-native micro-editor is the fix if it starts to chafe. This is the *only* genuine capability regression from the admin audit.
- **Hero ticker CLS — accepted technical debt.** After the footer fix, the sole remaining shift is the ticker's skeleton→content swap: reproducibly **0.035 against a 0.05 gate**. Under gate, so it was consciously not chased, but the margin is thin. The container's own rect is unchanged across the shift, so the movement is inside the cards.
- **Hero preload wastes bytes on non-home routes.** `index.html` is shared by every route, so `hero-1600.avif` is preloaded (and warned about as unused) on `/login`, `/store` and everything else. Deferred during the GA4 freeze; the freeze is now lifted, so this is simply open.
- **The `perf/static-hero-shell` branch still exists on the remote.** It was merged, measured, and reverted. Keep it only as the record of a tested-and-rejected approach — do not resurrect it without reading `docs/13 §3f` first.
- ~~**In flight:** card surfaces onto `--card-bg`/`--card-border`~~ — that background session **never landed**: no commit exists anywhere and the tree is clean. Lowest-value item on this list (no visual change today, latent dark-mode divergence only); treat as unstarted.

---

## 7. Corrections to `docs/HANDOFF.md`

HANDOFF predates this work and is wrong in ways that could waste days:

- ❌ "Next workstream = V2 Admin Panel (not started)" / §6 — **the V2 admin is COMPLETE**: 18 real sections, all verified, no placeholders. Do not rebuild it.
- ❌ "GA4 analytics: not started" — GA4 is live (`src/lib/analytics.js`, deferred load) plus `web-vitals`.
- ❌ "Dynamic sitemap needed" — `scripts/generate-sitemap.mjs` runs at build.
- ❌ Git status / latest commit — stale.

Still accurate and worth reading there: **§3 Architecture Decisions**, **§7 Important Files**, **§8 Do NOT Repeat** (money is whole rupees not paise; services are the only `lib/api.js` callers; no Tailwind/shadcn; no review model, no brand model, no product slug in V1 — don't build features assuming they exist).

---

## 8. Deployment

- `main` is pushed; staging auto-deploys to `https://motopark-v2-ebon.vercel.app` (~30 s).
- **V1 is live at motoparkvizag.in** from the same repo (`motopark-web/`). Recent commits touch 0 V1 files. Verified healthy post-push. Note: `curl` against it returns **429 "Vercel Security Checkpoint"** — that's bot protection, not an outage; check with a real browser.
- Backend is on **Railway**, deployed separately, shared with V1. Do not fork it.
