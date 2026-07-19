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
| 7 | reduced-motion / save-data / low-memory / no-WebGL fall back silently | **Gate must be extended — see below** |

### Two gaps found while reading the amendment

**A. `motionEligibility.js` is insufficient for Phase 5.** It covers width, pointer and reduced-motion. Condition 7 also requires **save-data** (`navigator.connection.saveData`), **low-memory** (`navigator.deviceMemory`) and **no-WebGL** (a real context-creation probe — support cannot be assumed from UA). These must be added *before* any canvas code, and the WebGL probe must dispose its test context.

**B. Nothing measures the desktop cost.** `lighthouserc.json` collects **mobile only**. The mobile TBT tripwire proves *isolation* (that mobile never loads the chunk) — it is structurally incapable of measuring what the canvas costs the desktop users who actually get it. `docs/13 §5` has a "Desktop LCP ≤ baseline + 150 ms" row with **no collector behind it**.

> **Do this first: add a desktop Lighthouse config and capture a desktop baseline BEFORE writing canvas code.** Otherwise Phase 5's cost is unmeasurable and the §5 desktop row is decorative.

### Proposed sequence

1. Desktop lhci config + desktop baseline captured and committed.
2. Extend `motionEligibility.js` for save-data / deviceMemory / WebGL probe. Verify each branch.
3. `HeroScene.jsx` in `src/cinematic/` — inert scaffold, correct lifecycle, no visual effect yet. Prove: post-LCP mount, kill-switch, pause/resume, watchdog unmount.
4. Re-measure: desktop LCP within +150 ms; **mobile TBT unchanged** (the isolation tripwire); route JS unchanged.
5. Only then the actual shader/visual work, which needs an approved visual direction.
6. Amendment 1 **(B)** — capped scroll-linked transform on the hero media — as a separate, later step.

**Kill-switch implementation.** `lazy(() => import('@/cinematic/HeroScene.jsx').catch(() => ({ default: () => null })))`. A deleted folder or a failed chunk then renders nothing instead of throwing. Test by literally deleting `src/cinematic/` and confirming the storefront builds and works.

---

## 4. Key Constraints — non-negotiable

### The 180 kB budget

Route `/` must stay **≤ 180 kB transferred (brotli) JS**. Currently **127.9 kB (71%)** — roughly **30 kB of headroom**.

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
