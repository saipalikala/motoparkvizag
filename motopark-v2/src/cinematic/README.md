# `src/cinematic/` — the decorative layer

Governed by **docs/11 §7b** and **docs/10 Amendment 1**. Read both before adding
anything here.

## The one rule

Nothing outside this folder may **statically** import from it. The only legal
entry point is a dynamic import from the homepage:

```js
const HeroScene = lazy(() => import('@/cinematic/HeroScene.jsx'));
```

A static import merges this code into the bundle every shopper downloads. The
libraries destined for this folder cost **230–280 kB gz** against roughly
**30 kB** of remaining route headroom — so this is not a style preference, it is
the difference between a working storefront and a broken one.

## What may live here

3D scenes, scroll choreography, and the machinery that drives them. Anything
that is *decoration*.

## What may NOT

- **Imports of `services/`, `contexts/`, or `lib/api.js`.** This layer is
  decorative and has **zero data dependencies**. If something here needs product
  data, the design is wrong — lift the data to the page and pass it down, or
  reconsider whether it belongs in the canvas at all.
- **Content.** No text, no links, no product data inside a `<canvas>`. The `<h1>`,
  the CTAs and the product ticker stay in static DOM — for customers, for
  crawlers, and for everyone whose GPU says no.
- **Anything mobile loads.** The eligibility gate hard-stops below 1024px and on
  `pointer: coarse`.

## Kill switch

Deleting this folder **and its lazy mounts** must leave the storefront fully
functional and visually complete. If that stops being true, the boundary has
been violated.

### What the kill switch does and does not cover (verified 2026-07-19)

The mount is written as:

```js
lazy(() => import('@/cinematic/HeroScene.jsx').catch(() => ({ default: () => null })))
```

**The `.catch` covers a RUNTIME chunk failure** — a 404 after a redeploy
invalidates old hashes, a CDN blip, an offline client. That is the case that
actually happens in production, and it degrades to a plain hero with no error.

**It does NOT cover deleting the folder from the source tree.** `docs/14 §3b`
described the test as *"literally deleting `src/cinematic/` and confirming the
storefront builds"*. That test was run and **the build fails**:

```
[UNLOADABLE_DEPENDENCY] Could not load src/cinematic/HeroScene.jsx
[UNLOADABLE_DEPENDENCY] Could not load src/cinematic/smoothScroll.js
```

A dynamic `import()` with a *static string* is still resolved at build time —
`.catch` is a runtime handler and cannot run for a module that was never bundled.
Note the second error: **this has been true since Phase 3's Lenis mount**, so the
documented test has never passed. It is not a regression introduced by Phase 5.

**This is being left as-is deliberately.** A missing source file *should* fail the
build loudly rather than silently producing a different application. The doctrine's
real requirement — that the storefront does not depend on this folder for function —
holds: delete the folder *and* the two mount sites (three lines in `Hero.jsx` and
`useSmoothScroll.js`) and everything works. Engineering a virtual-module fallback to
make the build survive a half-finished deletion would trade a loud, correct failure
for a quiet, confusing one.

To run the check properly: remove the folder **and** the mounts, then build.

## How this is enforced (all three fire automatically)

| Gate | Catches |
|---|---|
| `.oxlintrc.json` `no-restricted-imports` | a static import of `@/cinematic/*`, or of `three` / `@react-three/*` / `gsap` / `lenis` outside this folder. Dynamic `import()` is intentionally allowed. |
| `scripts/check-budgets.mjs` | any module from here reaching the `/` **static** graph — including one merged invisibly into another chunk, via `dist/.vite/module-map.json`. Fails `npm run build`. |
| docs/13 §5 mobile TBT gate | mobile never loads this chunk, so any TBT movement proves the isolation leaked. |

All three were verified against a deliberately planted breach on 2026-07-18. The
first version of the budget check **missed it** — the module had been merged into
the HomePage chunk, where a manifest-based check cannot see it. That is why the
module map exists. Do not remove `moduleMapPlugin()` from `vite.config.js`.
