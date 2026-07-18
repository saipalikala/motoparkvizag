# MotoPark V2 — State of the Union

**Written:** 2026-07-18 · **Read this first in a new session.**
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

**Deliberately NOT built: Skeleton, Badge, Card.** Usage was surveyed first and the demand wasn't there — the skeleton pattern is already correct, there's one sale badge and one status pill serving different purposes, and only two `.card` blocks are identical. Do not "finish the set" without new evidence.

---

## 3. The Current Gate 🚦

**Phases 3 and 4 are DONE (2026-07-18) — see §2. Phase 5 is the only thing left, and it is blocked.**

**Do not install GSAP** — every allowed effect is one-shot transform/opacity work already covered.

### Phase 5 — WebGL hero is STRICTLY GATED 🔴

Amendment 1 contains this as a written blocking condition. **No WebGL ships until the LCP budget is met.**

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
- **The in-app browser pane reports `visibilityState: "hidden"`.** That suppresses IntersectionObserver callbacks and freezes `requestAnimationFrame`, so reveals and Lenis motion **cannot be verified there** — screenshots and rAF-based probes just hang. Verify scroll/animation work through the Playwright MCP browser instead; it renders and reports `prefers-reduced-motion: no-preference`.

---

## 6. Open items

- ~~**AccountPage was never verified in a browser**~~ ✅ **Verified 2026-07-18.** Auth gate redirects `/account` → `/login?redirect=/account`; the `disabled`+`hint` path renders correctly (Email disabled, hint linked via `aria-describedby`); all six address fields are labelled; and the address happy path saves end-to-end. **It found a real bug** — both form-level errors (`profileError`, `addrErr`) were bare `<p>` elements with no `role="alert"`, so a failed submit was silent to screen readers. Fixed. To log in for future checks: V2's UI offers **only OTP and Google** — there is no password field — so get a token from `POST /api/users/login/email` and set `mp-auth-token` + `mp-auth-user` in localStorage.
- **V1 admin parity gap — a genuine cutover blocker.** Six V1 sections have no V2 equivalent but live backend routes: `InventoryManager`, `AdminCarouselManager`, `AdminNavbarManager`, `AdminHomeLayout`/`HomeBuilder`, `AdminMedia`, `OffersAdmin`. Owner chose to **audit usage empirically first** (document counts + `updatedAt` recency per collection) rather than rebuild blind. `InventoryManager` is the likeliest genuine keeper — V2 only edits stock per-product inside `VariantEditor.jsx`.
- ~~**Six undocumented env vars**~~ ✅ **Documented 2026-07-18** (`6ac859a`). While doing it, one thing surfaced that is worth treating as a real security item, not just a doc gap: **the customer JWT paths fall back to the hardcoded string `"motopark_user_secret"` when `JWT_SECRET` is unset** (`userController.js:14`, `orderRoutes.js:72,87`, `paymentRoutes.js:41`), and that fallback is committed to this repo — so an unset `JWT_SECRET` means anyone reading the source can forge a customer session. The admin path has no fallback and fails closed instead. The local `backend/.env` does set it; **whether Railway sets it has not been checked — do that first.** Then remove the fallback so the customer path fails closed like the admin one. Small change, high value.
- **Abandoned-cart recovery does not exist.** No job, no trigger, no cron — despite being a PRD KPI and sometimes assumed present. Not a cutover blocker; decide separately.
- **No test framework anywhere.** Four hand-rolled scripts in `backend/scripts/` are good and unwired to CI — especially `testPlaceOrder.js`'s partial-rollback case, which silently destroys inventory if broken.
- **Admin logout revocation is an in-memory `Map`** (`authMiddleware.js:5`) — breaks on multi-instance deploys. The file says so itself.
- **In flight:** a background session is aligning card surfaces onto `--card-bg`/`--card-border` (5 files use raw semantic tokens; latent dark-mode divergence, no visual change today).

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
