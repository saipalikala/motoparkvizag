# MotoPark V2 — Design System V2 (Figma Reset)

**Status:** 🔒 Source of truth as of 2026-07-24, replacing all prior content at this path.
**Supersedes:** the "light-first + dark-by-tokens" system approved 2026-07-05 (Golden Hour arc-gradient, cream/navy palette, Commerce Laws §0), and the interim Figma dark-concept pass referenced in `tokens.css` as docs/18. None of that lineage was reused here.
**Does NOT touch:** brand voice, archetype, UX-strategy principles (docs/07's "Explorer archetype," "commerce-first 60/40," North Star statement) — those are a separate layer from visual tokens and are untouched by this reset.
**Scope:** presentation layer only, every page (Homepage, Store, PDP, Search, Checkout, Account, Brand/Collection pages, Footer, Nav). Backend, APIs, business logic, routing, and state are unchanged.

---

## §0 Reset Notice — Conflicts Flagged, Not Silently Overridden

Two things the new reference contradicts that were previously written up as **non-negotiable**. Flagging per standing instruction to challenge before implementing, not to block — proceed on this system unless told otherwise.

1. **Old Commerce Law 2** ("price = ink only; orange = sale/discount only") is directly contradicted. Every product card in the reference shows the *regular*, non-sale price in orange. No strikethrough/MRP or sale-badge state appears anywhere in the six screenshots. This system treats orange as the standard price color and has no observed sale-state to derive from — see §11 open questions.
2. **Old default was light-first**, dark theme opt-in. This reference is dark end-to-end — there is no light section anywhere except product photography itself and one graphic-heavy card (§9.3). Given the owner's explicit "every page" scope list, this system makes near-black the *only* theme, not an alternate one behind a token switch.

## §1 Source & Method

Derived solely from six supplied screenshots: (1) homepage hero + navbar, (2) "Explore Our World" category grid, (3) brand strip + "Rider Favorites" product cards, (4) more product cards + workshop banner, (5) "Custom Graphics Studio" feature cards, (6) testimonials + community grid + newsletter CTA + footer.

Everything below is either **[Observed]** — read directly off a screenshot — or **[Extrapolated]** — not shown, derived by extending the observed language to an unshown case (checkout forms, error/success states, search results, account dashboard). Extrapolated items are marked inline so confidence level is visible; treat them as a first draft to confirm once built, not as settled fact the way observed values are.

Exact hex values below are careful visual estimates, not color-picked from source files — nobody handed this conversation a Figma file/link, only rendered screenshots. Close enough to implement from; if pixel-exact accuracy matters, the fastest fix is pulling `get_variable_defs` from the actual Figma file rather than re-estimating from a raster image.

## §2 Design Principles (synthesized)

1. **Photography-led, not color-led.** Full-bleed motorsport/product photography drives hierarchy in every section; type and color support it, they don't replace it.
2. **Near-black canvas, exactly one accent hue.** The palette is grayscale plus a single orange, spent only on CTAs, price, ratings, active nav, and links — never as a large background fill. Scarcity is what reads as premium, not saturation.
3. **Depth from borders and tone-shift, not shadows.** Cards separate from the page via a one-step-lighter surface color and a hairline border; heavy drop shadows are absent (and would barely register on near-black anyway).
4. **Pill-everything interactive language.** Every button, chip, badge, and input is fully rounded. Nothing interactive has a square or slightly-rounded corner. Media cards (photos, banners) use a large-but-finite radius instead — rounded, not pill.
5. **Glass is rare and specific.** Reserved for content floating directly over a photograph (hero stat strip). The general card system is flat and opaque, not glass.
6. **Content-adaptive card shell.** One card in the reference (a graphic-heavy product) flips to a light surface because the product photography itself is light — the shell serves the content rather than forcing a dark treatment on everything indiscriminately.
7. **Generous whitespace at section scale.** Premium comes from scale and restraint (big photography, large gaps between sections) more than from any single decorative device.

## §3 Color System

### 3.1 Primitives

**Ink** — true neutral scale (cool-neutral gray, not blue-tinted). This is the entire background/surface/text backbone.

| Token | Hex | Role |
|---|---|---|
| `--mp-ink-0` | `#FFFFFF` | Headings, primary text on dark |
| `--mp-ink-100` | `#C7C9CE` | Secondary/body text |
| `--mp-ink-200` | `#9A9DA5` | Tertiary/meta text, small labels |
| `--mp-ink-300` | `#6E7078` | Placeholder/disabled text |
| `--mp-ink-500` | `#35363C` | Rarely-used mid step (dividers on light exception cards) |
| `--mp-ink-700` | `#1C1D21` | Elevated/hover surface |
| `--mp-ink-800` | `#16171B` | Card/surface fill |
| `--mp-ink-900` | `#0D0D10` | Section background variant |
| `--mp-ink-950` | `#0A0A0C` | Page background (deepest) |

**Flame** — the single accent hue. [Observed] in CTAs, "Limits" headline span, price, star ratings, active nav link, eyebrow badge text/border, links.

| Token | Hex | Role |
|---|---|---|
| `--mp-flame-100` | `#FFE1CC` | Rare soft tint (accent-soft backgrounds) — [Extrapolated] |
| `--mp-flame-300` | `#FF9D5C` | Star ratings, lighter accent icons |
| `--mp-flame-500` | `#FF6A2E` | **Primary accent** — CTA fill, price, active states, links |
| `--mp-flame-600` | `#EC5A22` | Hover/pressed |
| `--mp-flame-700` | `#C6431A` | Deep step, gradient stop |
| `--mp-flame-900` | `#6E2610` | Deepest gradient stop |

**Ember** — a second, much rarer cool navy-indigo family. [Observed] in exactly one place: the newsletter/riders-club CTA card, which is visibly cooler/bluer than every other dark surface. Do not spread this into general use — it exists to make one CTA block feel like a distinct "clubhouse" moment.

| Token | Hex | Role |
|---|---|---|
| `--mp-ember-700` | `#242238` | Border on ember surface |
| `--mp-ember-800` | `#1B1A2C` | Input fill when it sits on an ember card |
| `--mp-ember-900` | `#14131F` | Ember surface background |

**Functional (semantic hues)** — [Extrapolated in full]. No error/success/warning/info state appears anywhere in the six screenshots (no form validation, no stock-status badge, no toast). Values below are tuned to read clearly against near-black rather than invented from nothing — brighter/more saturated than a typical light-theme error red, since the old muted versions were tuned for a cream background this system no longer has.

| Token | Hex |
|---|---|
| `--mp-success-500` | `#2FA968` |
| `--mp-warning-500` | `#F5A623` |
| `--mp-danger-500` | `#E5484D` |
| `--mp-info-500` | `#4C9FE8` |

### 3.2 Semantic tokens

```css
--bg-page: var(--mp-ink-950);
--bg-section-alt: var(--mp-ink-900);       /* only if a section needs to read one step apart */
--bg-inverse: var(--mp-ink-0);              /* for the one light-surface card exception, §9.3 */

--surface-card: var(--mp-ink-800);
--surface-card-hover: var(--mp-ink-700);
--surface-accent: var(--mp-ember-900);      /* newsletter/clubhouse card only */

--text-primary: var(--mp-ink-0);
--text-secondary: var(--mp-ink-100);
--text-tertiary: var(--mp-ink-200);
--text-on-accent: #FFFFFF;
--text-on-inverse: var(--mp-ink-900);       /* dark text for the light-surface card exception */

--accent: var(--mp-flame-500);
--accent-hover: var(--mp-flame-600);
--accent-pressed: var(--mp-flame-700);
--accent-soft: var(--mp-flame-100);

--border-subtle: rgb(255 255 255 / 0.08);
--border-default: rgb(255 255 255 / 0.12);
--border-strong: rgb(255 255 255 / 0.20);
--focus-ring: var(--mp-info-500);           /* kept distinct from accent — focus ≠ action, carried over as sound a11y practice, not contradicted by the reference */

--price: var(--mp-flame-500);               /* overrides old Commerce Law 2 — see §0 */
--price-mrp: var(--mp-ink-200);             /* [Extrapolated] strikethrough MRP, not observed */

--overlay-scrim: linear-gradient(to top, rgb(0 0 0 / 0.85) 0%, rgb(0 0 0 / 0) 55%);
```

### 3.3 Background hierarchy

Three levels only, deliberately shallow:

1. **Page** (`--mp-ink-950`, `#0A0A0C`) — the constant canvas behind every section.
2. **Card/surface** (`--mp-ink-800`, `#16171B`) — one step up, used for every card type (product, testimonial, brand-badge, tag chip). Separated from the page by border, not shadow.
3. **Elevated/hover** (`--mp-ink-700`, `#1C1D21`) — card hover state, input focus fill.

The **ember surface** (§3.1) is a deliberate fourth, out-of-band tone reserved for one CTA per page at most — treat it as a rare accent block, not a fourth generic elevation level.

### 3.4 Accent scarcity rule

Orange appears **only** on: primary buttons, price, star ratings, the active nav link, the hero headline's emphasis span, eyebrow-badge border/text, and text links/arrows ("Explore Collection →"). It never fills a section background, a card background, or body text. This restraint is load-bearing for the "premium" read — treat any new use of orange as a background fill as breaking the system, not as an available design color, unless it's genuinely one of these established roles.

## §4 Typography

**Families.** Headings read as a bold, slightly-rounded geometric grotesque (visually closest to General Sans / Sora at 700–800 weight); body reads as a clean, versatile neutral sans fully compatible with Inter, which is already in the stack's fallback chain. Font identity can't be confirmed with certainty from a screenshot — recommend confirming the actual family names against the Figma file if pixel-exact matching matters; treating the above as the working assumption otherwise.

```css
--font-display: 'General Sans', 'Sora', 'Inter', system-ui, sans-serif; /* [Estimated] */
--font-body: 'Inter', system-ui, -apple-system, sans-serif;
```

**Scale**

| Token | Range (mobile→desktop) | Weight | Use |
|---|---|---|---|
| `--text-display` | 44px → 76px | 800 | Hero H1 ("Ride Beyond Limits") |
| `--text-h1` | 34px → 44px | 700–800 | Section headings ("Explore Our World," "Rider Favorites," "What Riders Say") |
| `--text-h2` | 24px → 28px | 700 | Sub-banner headings ("Where Machines Are Reborn") |
| `--text-h3` | 18px → 22px | 700 | Card/feature titles, product name, testimonial name |
| `--text-body-lg` | 17px → 18px | 400 | Hero subtext |
| `--text-body` | 15px → 16px | 400 | Default paragraph (16px floor kept — no conflict with the reference) |
| `--text-body-sm` | 13px → 14px | 400 | Card descriptions |
| `--text-caption` | 11px → 12px | 600, uppercase, +0.08em tracking | Eyebrow badges, category labels, footer column headers |
| `--text-price` | 18px → 20px | 700 | Product card price |

Line-height: 1.05–1.15 on all headings, 1.5–1.6 on body/paragraph text.

## §5 Elevation & Depth

No heavy drop shadows anywhere in the reference — depth comes from the surface/border system in §3.3. Keep a minimal shadow scale for the few places something genuinely needs to lift (sticky nav on scroll, dropdowns):

```css
--shadow-xs: 0 1px 2px rgb(0 0 0 / 0.24);
--shadow-sm: 0 4px 12px rgb(0 0 0 / 0.32);
--shadow-md: 0 12px 32px rgb(0 0 0 / 0.40);
--shadow-glow-flame: 0 0 48px rgb(255 106 46 / 0.25); /* decorative ambient glow only — see §6 */
```

**Glassmorphism** — scoped to exactly one context: the hero stat strip (Riders Served / Premium Products / Trusted Since), where dark translucent cards float over the hero photo with a blurred backdrop.

```css
--glass-bg: rgb(10 10 12 / 0.55);
--glass-blur: blur(20px);
--glass-border: rgb(255 255 255 / 0.08);
```

Do not extend glass to the general card system (product/testimonial/category cards are flat opaque `--surface-card`, not glass) — that distinction is deliberate in the reference, not an oversight.

## §6 Gradients

Three distinct uses, not interchangeable:

1. **Scrim** — every photographic card/banner gets a bottom-anchored dark gradient so overlaid text stays legible: `linear-gradient(to top, rgb(0 0 0 / 0.85) 0%, rgb(0 0 0 / 0) 55%)`. This is a functional legibility device, applied uniformly.
2. **Ambient glow** — soft, large, low-opacity radial orange blooms placed decoratively behind key sections (hero, newsletter card): `radial-gradient(circle, rgb(255 106 46 / 0.20) 0%, transparent 70%)`. Never sharp-edged, never attached to a specific control — it's atmosphere, not a UI element.
3. **Brand-mark gradient** — the logo icon's own red→orange→amber gradient. Kept exclusive to the logo; not reused as a UI gradient elsewhere (buttons and price/link text are flat solid `--mp-flame-500`, not gradient-filled — confirmed by even, flat color across "Limits" and every CTA).

## §7 Radius Scale

```css
--radius-sm: 8px;    /* small chips if ever needed */
--radius-md: 12px;   /* small photo tiles — Instagram-style community grid */
--radius-lg: 20px;   /* standard cards — product, testimonial, category */
--radius-xl: 28px;   /* large feature/banner cards — workshop banner, graphics-studio hero card */
--radius-full: 999px; /* buttons, badges, chips, inputs — everything interactive */
```

This is a real change from the previous system, where `--btn-radius` mapped to a 10px `--radius-md`. Here `--btn-radius` and `--input-radius` both map to `--radius-full` — no button or input in the reference has a corner radius short of a full pill.

## §8 Spacing & Section Rhythm

No evidence to change the existing 4px-based spacing scale or `--container-max: 1280px` / `--checkout-max: 560px` — nothing in the reference contradicts them, so they carry forward unchanged. What the reference does confirm:

- Section vertical padding reads generous, roughly 96–120px top/bottom at desktop — consistent with keeping `--section-gap: clamp(48px, 8vw, 96px)` as-is or slightly increasing the upper clamp bound.
- Card grid gaps ~20–24px; card internal padding ~20–24px; community/gallery grid gaps tighter, ~8–12px.

## §9 Components

### 9.1 Buttons

- **Primary** — solid `--mp-flame-500` fill, white bold text, fully rounded, no border, no shadow at rest. Large (hero CTA): ~52–56px tall, 32px horizontal padding. Compact (Add to Cart, Subscribe): ~40–44px tall, 20–24px horizontal padding.
- **Outline** (used on dark/photographic backgrounds — hero's "Explore Workshop") — transparent fill, 1.5–2px white/`--border-strong` stroke, white text, same pill shape.
- **Tertiary/link** — flat `--mp-flame-500` text with a trailing arrow, no container ("Explore Collection →").
- **Tag/chip** (brand badges, workshop tags) — `--surface-card` fill, `--border-default` stroke, white text, fully rounded — informational, not a button, no hover state implied.

### 9.2 Inputs

Only the newsletter email input is [Observed]: fully rounded, `--surface-card` (or `--surface-accent`-toned when it sits on the ember card) fill, subtle border, `--text-tertiary` placeholder, ~48–52px tall, visually grouped with its adjacent submit button as one pill unit. Checkout/account/search form fields are **[Extrapolated]** — apply the same fill/border/placeholder treatment; a fully-rounded shape works for single-line fields but should relax to `--radius-lg` for anything multi-line (textarea) since a pill shape breaks down past one line.

### 9.3 Cards — the one reusable "media card" pattern

Every card type in the reference (category card, product card, testimonial card, workshop banner, graphics-studio feature card) is a variation of one shell: `--surface-card` background, `--radius-lg` (or `--radius-xl` for banner-scale), `--border-subtle` outline, internal padding ~20–24px.

- **Photo-backed cards** (category grid, graphics studio, workshop banner) get the bottom scrim gradient (§6.1) with title/description/link text anchored bottom-left over it.
- **Product cards** specifically: light neutral studio-background image area (`#E8E8E8`-ish) *inside* the otherwise-dark card — product photography stays on a light backdrop even though its container is dark, so the product itself pops. Category eyebrow label + star rating share a row above the product name; price and a compact "Add to Cart" pill sit at the bottom.
- **Light-surface exception** — one category card ("Custom Graphics") flips the whole shell to a light/white background with dark text, because its product photography (a light-toned sticker/decal graphic) reads better that way. Treat this as a documented content-adaptive rule, not a one-off bug to normalize away: **if a card's hero image is itself light/bright, the shell may flip to `--bg-inverse` + `--text-on-inverse` rather than forcing a dark treatment that would fight the image.** The orange accent link/arrow stays orange regardless of shell variant.

### 9.4 Navigation

Solid `--mp-ink-950` (or near-black, effectively opaque) navbar — not glass. Logo lockup left, nav links centered, active link colored `--mp-flame-500`, **inactive links are full white/`--text-primary`, not muted gray** (this system uses color-for-active rather than opacity-for-active — a real distinction from typical muted-inactive nav patterns). Utility icons (search/compare, wishlist, cart, account) right-aligned, white line-icon style, cart badge count in a small solid `--mp-flame-500` circle.

### 9.5 Badges / eyebrows

Pill-shaped, `rgb(10 10 12 / 0.6)`-ish translucent-dark fill, 1px `--mp-flame-500`-toned border, uppercase `--text-caption` styling in flame orange. Used identically for the hero's "ESTD 2020 • VIZAG, INDIA" and the workshop banner's "ESTD 2020 • PERFORMANCE LAB."

## §10 Page-by-Page Application

| Page | Confidence | Notes |
|---|---|---|
| Homepage | **Observed** | Every section shown directly; apply §3–§9 as specified. |
| Store / Product Listing / Category / Brand pages | Extrapolated | Reuse the product-card and filter-chip patterns from §9.1/§9.3; no listing/filter UI was shown, so filter panel styling should follow the tag-chip treatment (dark surface, border, pill) rather than inventing a new control style. |
| Product Detail Page | Extrapolated | Gallery, price, add-to-cart map directly from the product-card component at larger scale; review/rating block follows the testimonial-card pattern. |
| Search | Extrapolated | No search results UI shown — reuse product-card grid + input styling from §9.2. |
| Checkout | Extrapolated | No checkout UI shown. Apply `--surface-card` panels, pill inputs, and the primary-button treatment; keep the existing `--checkout-max: 560px` single-column constraint, which nothing here contradicts. |
| Account | Extrapolated | No account UI shown. Same surface/card/input system; dashboard stat tiles can reuse the hero's glass stat-card pattern if content warrants a "floating over imagery" moment, otherwise plain `--surface-card`. |
| Footer | **Observed** | §9 covers it: near-black bg, 4 link columns, gray links, circular social icons, subtle divider + copyright bar. |

## §11 Open Questions (need owner confirmation before implementation)

1. **Sale/discount pricing** — no sale state is visible in the reference. Since price itself is now orange, a sale price can't reuse orange-vs-ink for contrast the old way. Options: strikethrough MRP in `--text-tertiary` next to the (still orange) sale price, or a small "SALE" chip reusing the tag/chip pattern. Needs a decision before PDP/listing work starts.
2. **Font family** — confirm actual Figma type names if pixel-exact matching to the source matters; §4's families are a visual estimate.
3. **Scope confirmation** — confirming this is meant to fully replace the dark-theme token block already sitting in `tokens.css` (docs/18-derived, currently inert behind `[data-theme='dark']`) rather than merge with it — this doc assumes full replacement per "do not reuse... any previous design palette."

## §12 Implementation Status

**Nothing has been implemented yet.** This document is the Stage 7 (Design System) artifact only. `tokens.css` and every component still reflect the old system (plus an unrelated, already in-progress, uncommitted dark-theme experiment referenced in `tokens.css` as docs/18 — see the project memory note on this reset for details). Stage 8 (applying these tokens to `tokens.css` and components) starts on explicit go-ahead, one area at a time, per the existing working agreement.
