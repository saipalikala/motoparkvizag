# MotoPark V2 — Design System

**Status:** ✅ APPROVED · 🔒 LOCKED 2026-07-05 (with three owner refinements: light-first launch with token-complete dark support · normal prices ink-only, orange reserved for sale prices & discount indicators · Commerce Laws added as §0)
**Sources of truth:** Brand Identity (docs/07) · Competitor UX Study (docs/08) · locked PRD/IA/stack (React 19 + Vite + JS, vanilla CSS with CSS variables)
**Scope:** Design language + tokens + component specs + responsive/motion/a11y/performance rules. **No screens, no homepage concepts — system only.**

---

# 0. MotoPark Commerce Laws (non-negotiable — every screen is audited against these)

1. **The 3-Click Law.** Any helmet, jacket, glove, boot, or luggage is reachable in 2–3 clicks from anywhere.
2. **The Orange Law.** Orange means action. Normal prices are ink/navy; only **sale prices and discount indicators** may use orange (ember). Nothing else borrows the accent.
3. **Trust Before the Ask.** Every buy decision point shows trust (genuine gear, reviews, returns, secure payment) *before* the CTA, never after.
4. **The Backend Is Truth.** Prices, shipping charges, stock, and totals are computed by the server and displayed verbatim. The frontend never calculates money.
5. **Never Block Shopping.** No animation, modal, overlay, or transition may delay or intercept a purchase path. Usability > Performance > Accessibility > Visual effects.
6. **Mobile Is the First Customer.** Every component is designed at 375px first; desktop is the enhancement.
7. **Readable Is Premium.** 16px body floor, WCAG AA contrast, 44px touch targets — always, everywhere, both themes.
8. **Products in the First Scroll.** 60% commerce / 40% storytelling; every landing surface shows shoppable product within one scroll.
9. **Honest Commerce.** Real stock states, no fake urgency, no dark patterns, no pre-ticked boxes, struck-through MRPs only when true.
10. **Guest Until the Order.** Browsing, cart, and wishlist never demand login; authentication appears exactly once — at order placement.

---

# 1. Brand Design Language

## 1.1 Visual personality
**Warm premium, engineered clean.** A fast, modern commerce machine wearing MotoPark's sunset warmth in its accents — not its wallpaper. The badge (mountains/pines/sunset) stays in the logo and rare campaign moments; every page communicates the *feeling* (warmth, trust, adventure-readiness) through color temperature, rounded-but-solid shapes, and honest photography — never through scenery graphics.

## 1.2 Emotional direction
Riders should feel: **welcome → capable → confident.** Welcome (warm neutrals, rider-to-rider copy), capable (clear specs, honest guidance), confident (trust signals before the ask, no dark patterns). Premium without exclusivity: nothing intimidates a first-helmet commuter; nothing bores a touring veteran.

## 1.3 UX philosophy
The six Experience Principles (docs/07 §10a) are the test for every screen: find gear fast · make technical simple · trust before purchase · confident decisions · experienced-rider-not-salesperson · premium without complexity. Hard rule: **any helmet/jacket/glove/boot/luggage reachable in 2–3 clicks.**

## 1.4 Commerce philosophy
**60% commerce / 40% storytelling.** Products appear in the first scroll of every landing surface. Storytelling lives in contained bands (60–80vh max) between commerce sections, never as the page's spine. Accent color = action only, so the eye always knows where "buy/act" lives.

## 1.5 Motion philosophy
Motion = the feel of a smooth ride: glide, momentum, soft-settle. Priority (locked): **Usability > Performance > Accessibility > Visual effects.** Commerce paths animate ≤400ms; storytelling bands may breathe more. Nothing blocks, nothing loops without purpose, everything respects `prefers-reduced-motion`.

---

# 2. Color System (tokens: primitive → semantic → component)

## 2.1 Primitives
```css
/* ── Sunset Orange (brand action) — from the badge wordmark */
--mp-orange-50:#FEF2EC; --mp-orange-100:#FCE0D2; --mp-orange-200:#F8BFA6;
--mp-orange-300:#F39C6B; /* badge peach-band */
--mp-orange-400:#EE7845; --mp-orange-500:#E8532E; /* CORE brand orange */
--mp-orange-600:#D2431F; --mp-orange-700:#B03518; /* ember */
--mp-orange-800:#8C2A14; --mp-orange-900:#6B2010;

/* ── Navy Ink (trust/protection) — from the badge ring */
--mp-navy-50:#F4F6F9; --mp-navy-100:#E4E9F0; --mp-navy-200:#C5CEDC;
--mp-navy-300:#9AA8BD; --mp-navy-400:#5C6E82; /* slate */
--mp-navy-500:#3A4A61; --mp-navy-600:#2C3A50; --mp-navy-700:#243046; /* CORE ink */
--mp-navy-800:#1B2536; --mp-navy-900:#141C29;

/* ── Warm Neutrals (cream family) — from the badge sky */
--mp-cream-50:#FDFBF7;  /* page background */
--mp-cream-100:#FBF3E7; /* CORE cream surface */
--mp-cream-200:#F3E8D8; --mp-cream-300:#E7D8C3;
--mp-neutral-0:#FFFFFF; --mp-neutral-200:#EDE9E3; /* hairlines */
--mp-neutral-400:#B9B2A7;

/* ── Semantic hues (warm-tuned) */
--mp-green-500:#1F7A4D; --mp-green-100:#E3F2EA;   /* success */
--mp-amber-500:#B45D0E; --mp-amber-100:#FBEEDC;   /* warning */
--mp-red-500:#C03530;   --mp-red-100:#FAE4E3;     /* danger */
--mp-blue-500:#2B5F8F;  --mp-blue-100:#E3EDF5;    /* info */
```

## 2.2 Semantic layer (light theme — default)
```css
--bg-page:var(--mp-cream-50);        /* warm paper, never sterile white */
--bg-surface:var(--mp-neutral-0);    /* cards, panels */
--bg-surface-warm:var(--mp-cream-100); /* alt sections, banners */
--bg-inverse:var(--mp-navy-700);     /* cinematic bands, footer */
--text-primary:var(--mp-navy-700);   /* ink on paper — trust anchor */
--text-secondary:var(--mp-navy-400);
--text-inverse:var(--mp-cream-50);
--text-on-accent:#FFFFFF;
--accent:var(--mp-orange-500);       /* ACTION ONLY */
--accent-hover:var(--mp-orange-600);
--accent-pressed:var(--mp-orange-700);
--border-default:var(--mp-neutral-200);
--border-strong:var(--mp-navy-200);
--focus-ring:var(--mp-blue-500);     /* never orange — focus ≠ action */
--success:var(--mp-green-500); --warning:var(--mp-amber-500);
--danger:var(--mp-red-500);    --info:var(--mp-blue-500);
--price:var(--mp-navy-700);    /* price = ink, NOT orange (orange stays action) */
--price-sale:var(--mp-orange-700); /* ember, distinct from CTA orange-500 */
--overlay:rgb(20 28 41 / 0.55);
```

**Why each color exists:** cream page (warmth = brand, reduces glare, differentiates from sterile-white marketplaces) · white surfaces (product photos read true — commerce priority) · navy text (softer than black, on-brand trust, AA 12.1:1 on cream) · orange strictly action (scarcity = meaning; the eye learns "orange = act") · ember for sale prices (related to but distinct from CTAs, avoids "everything is orange" — MotoWilder's documented failure) · blue focus ring (visible on both themes, never confused with CTAs) · warm-tuned status hues (harmonize with cream; still unambiguous).

## 2.3 Dark mode
The storefront **launches light-only** (consistency, photo fidelity, budget). Dark exists in two sanctioned forms:
1. **Inverse sections** (navy-700/800 bands: cinematic strips, footer) — tokens above already cover this via `--bg-inverse`/`--text-inverse`.
2. **Future full dark theme:** remap semantic layer only (`--bg-page:navy-900`, `--bg-surface:navy-800`, `--text-primary:cream-50`, accent unchanged, shadows→borders). No component may hardcode a hex, so the flip is token-only. Admin panel may adopt dark theme first (staff preference, low risk).

## 2.4 Accessibility contrast (verified pairs)
| Pair | Ratio | Use |
|---|---|---|
| navy-700 on cream-50 | ~12.1:1 ✅ AAA | body text |
| navy-400 on cream-50 | ~5.6:1 ✅ AA | secondary text (min size 14px) |
| white on orange-500 | ~3.9:1 ✅ AA-large | buttons ≥18.66px bold or ≥24px — buttons use 16px/600 → **use orange-600 bg (4.6:1) for small-text buttons** |
| cream-50 on navy-700 | ~12:1 ✅ | inverse sections |
| orange-300 on navy-800 | ~7:1 ✅ | accents on dark |
Rule: every new pair checked at design time; no text under 4.5:1 (AA) except large-text 3:1.

## 2.5 Component-token examples
```css
--btn-primary-bg:var(--accent); --btn-primary-bg-hover:var(--accent-hover);
--btn-primary-fg:var(--text-on-accent);
--card-bg:var(--bg-surface); --card-border:var(--border-default);
--input-border-focus:var(--focus-ring);
--badge-sale-bg:var(--mp-orange-700); --badge-stock-low:var(--warning);
--nav-bg:rgb(253 251 247 / 0.92); /* cream glass */
```

---

# 3. Typography System

## 3.1 Families
- **Body/UI: Geist** (fallback: Inter, system-ui). One family, weight-driven hierarchy (400/500/600/700). Why: modern, neutral, excellent hinting, tabular figures.
- **Display: Sakana** — ONLY hero headlines, campaign titles, major section heads (locked owner directive). Why: carries the badge's energetic slant without literal badge graphics. Never in UI controls, product data, or paragraphs.
- Numerals: `font-variant-numeric: tabular-nums` for **all prices, specs, tables**.

## 3.2 Scale (rem; fluid via clamp between breakpoints)
| Token | Mobile | Tablet | Desktop | Weight/LH | Use |
|---|---|---|---|---|---|
| `display` | 40 | 56 | 72 | Sakana 400 / 1.05 | hero only |
| `h1` | 32 | 40 | 48 | 700 / 1.1 | page titles |
| `h2` | 26 | 30 | 36 | 700 / 1.15 | section heads (Sakana allowed on major bands) |
| `h3` | 22 | 24 | 28 | 600 / 1.2 | card groups, PDP blocks |
| `h4` | 18 | 20 | 22 | 600 / 1.3 | |
| `h5` | 16 | 17 | 18 | 600 / 1.35 | |
| `h6` | 14 | 15 | 16 | 600 / 1.4 / caps+tracking | eyebrows |
| `body-lg` | 17 | 18 | 18 | 400 / 1.6 | editorial |
| `body` | **16** | 16 | 16 | 400 / 1.55 | default (never below 16 — competitor failure) |
| `body-sm` | 14 | 14 | 14 | 400 / 1.5 | meta, captions (AA-checked colors only) |
| `caption` | 12 | 12 | 12 | 500 / 1.4 | badges, timestamps — never long text |
| `button` | 16 | 16 | 16 | 600 / 1 / 0.01em | all buttons |
| `price-lg` | 24 | 26 | 28 | 700 / 1.1 tabular | PDP price |
| `price` | 18 | 18 | 20 | 600 / 1.1 tabular | card price |
| `spec` | 14 | 14 | 15 | 500 / 1.5 tabular | spec tables; label = navy-400, value = navy-700 |

Comparison tables: `spec` scale, sticky first column on mobile, zebra rows via `--bg-surface-warm`.

## 3.3 Rules
Max reading width 68ch. Sakana never smaller than 26px (it's display-only). No ALL-CAPS body (caps only for `h6` eyebrows/badges with +0.06em tracking). Line length in PDP description ≤ 72ch.

---

# 4. Spacing System

- **Base unit: 4px.** Scale (px): `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80 · 96 · 128` → tokens `--space-1..--space-32`.
- **Component padding:** buttons 12×20 (md) / 14×24 (lg); cards 16 (mobile) / 20–24 (desktop); inputs 12×14.
- **Section spacing (from study §4):** desktop 96 / tablet 64 / mobile 48 between major sections; 40/32/24 between related blocks. Consistency > size: identical rhythm on every page.
- **Container:** max-width **1280px**, gutters 24px (mobile) / 32px (tablet) / 40px (desktop). Full-bleed allowed for hero/cinematic bands only; inner content re-aligns to container.
- Responsive behavior: spacing steps down one scale level per breakpoint tier; never below `--space-6` (24) between sections.

---

# 5. Grid System

| Tier | Width | Columns | Gutter | Product grid | Category grid |
|---|---|---|---|---|---|
| Desktop ≥1280 | 1280 container | 12 | 24 | **4-up** | 6-up icons / 3-up cards |
| Laptop 1024–1279 | fluid | 12 | 24 | 4-up (tight) or 3-up | 4-up |
| Tablet 768–1023 | fluid | 8 | 20 | 3-up | 3-up |
| Mobile 375–767 | fluid | 4 | 16 | **2-up** | 2-up (scrollable row allowed) |
| Small mobile <375 | fluid | 4 | 12 | 2-up (compact) | 2-up |

Content/reading grid: single column, max 68ch. PDP desktop: 7/5 split (gallery/buy-box) on the 12-col grid; sticky buy-box. Checkout: single centered column, max 560px (focus). Admin: 12-col with fixed 240px sidebar (separate surface, same tokens).

---

# 6. Elevation, Borders, Radius, Dividers

- **Radius:** `--radius-sm:6px` (chips, badges) · `--radius-md:10px` (buttons, inputs) · `--radius-lg:14px` (cards, modals) · `--radius-xl:20px` (hero media, drawers) · `--radius-full` (pills, avatars). Rounded-but-solid = badge's friendliness without cartoonishness.
- **Borders:** default 1px `--border-default`; emphasis 1.5px `--border-strong`. Prefer borders + subtle shadow over heavy shadow.
- **Shadows (navy-tinted, never pure black):**
```css
--shadow-xs: 0 1px 2px rgb(36 48 70 / .06);
--shadow-sm: 0 2px 8px rgb(36 48 70 / .08);   /* cards resting */
--shadow-md: 0 6px 20px rgb(36 48 70 / .12);  /* card hover, dropdowns */
--shadow-lg: 0 16px 40px rgb(36 48 70 / .18); /* modals, drawers */
```
- **Glass:** ONE sanctioned use — sticky navbar over hero (`--nav-bg` cream at 92% + `backdrop-filter: blur(12px)`, solid fallback). No glass cards, no glass panels elsewhere (V1's glassmorphism is retired as decoration).
- **Dividers:** 1px `--border-default`; section dividers = spacing, not lines (lines only inside dense data like spec tables).

---

# 7. Component Principles (specs; states = default/hover/active/focus/disabled/loading)

**Buttons** — Primary (orange-600 bg→orange-700 hover, white text, radius-md, shadow-xs→sm, 44px min height); Secondary (transparent, 1.5px navy border, navy text → navy-50 bg hover); Ghost (text + icon, underline on hover); Danger (red-500). One primary per view region. Loading = spinner replaces label, width locked. Disabled = neutral-200 bg, no shadow, `cursor:not-allowed`.

**Cards (base)** — surface bg, border-default, radius-lg, shadow-sm; hover: translateY(-4px) + shadow-md, 200ms. Entire card clickable; inner buttons stopPropagation.

**Product card (PLP)** — image (4:5, contain, cream-100 backing) → brand (caption, navy-400) → title (2-line clamp, h5) → rating (stars + count, 14px) → price row (price + struck MRP + % off in ember) → stock/urgency line (conditional) → quick-add icon button (visible mobile, hover-reveal desktop). Wishlist heart top-right, 44px target. Skeleton variant mandatory.

**Feature/trust cards** — icon in 40px rounded square (orange-50 bg, orange-600 icon), h5 title, body-sm desc. Trust badge row: icon + caption, monochrome navy-400 (trust whispers, never shouts).

**Category cards** — image or icon + label + product count (from study: counts set honest expectations).

**Forms/Inputs** — 48px height, radius-md, border-default → border-strong hover → 2px focus-ring border + ring shadow; label always visible above (no placeholder-as-label); error = red border + 14px message + icon; success tick for validated fields (pincode). Inline validation on blur, never on keystroke.

**Dropdowns/Selects** — native on mobile, custom listbox desktop (keyboard: type-ahead, arrows, Esc); max-height 320px scroll.

**Search** — prominent header field (persistent bar on mobile under header — study ADOPT); overlay results panel: products (image+name+price), categories, brands, bike models; keyboard navigable; recent searches; "no results" = suggestions + popular categories, never dead-end.

**Filters** — desktop: left rail 240px, sections collapsible, applied count chips; mobile: full-height bottom drawer, sticky Apply bar showing result count ("Show 43 products"). Brand filter includes search-within (study ADOPT). Every filter change URL-synced.

**Navbar** — sticky; transparent-over-hero → cream-glass on scroll (200ms); left logo (badge mark), center mega-menu (Shop/Brands/Bikes/Collections/Offers), right search/wishlist/account/cart with count badges; 64px desktop / 56px mobile. Mobile: hamburger drawer (accordion, 2-tap max to category) + persistent search bar. Offer bar above (single message, dismissible, home only per V1 pattern).

**Footer** — navy-800 inverse; 4 columns (categories/brands+bikes/support/company) + trust row (secure payments, genuine gear, showroom address+phone+timings) + newsletter + payment icons; cream-50 text.

**Pagination** — numbered + prev/next (SEO real URLs); "Load more" allowed as progressive enhancement on top of paginated URLs.

**Breadcrumbs** — body-sm, navy-400, "/" separators, current page navy-700 non-link; mobile: collapsed (Home › … › current); BreadcrumbList schema.

**Modals** — radius-lg, shadow-lg, overlay token; max-width 560px; focus-trapped, Esc closes, scroll-locked; mobile: full-screen sheets. Use sparingly — prefer inline/drawer.

**Drawers** — cart drawer (right, 420px desktop / full mobile) = primary add-to-cart feedback: item added + upsell strip + checkout CTA. Filter drawer (bottom sheet mobile).

**Chips/Tags** — radius-full, 32px height, caption text; selected = navy-700 bg/cream text; removable (×, 24px target). Attribute tags on PDP = outline style.

**Status badges** — order states color-mapped (pending=amber, confirmed=blue, packed=navy, dispatched=orange-300, delivered=green, cancelled/returned=red/neutral); caption size, radius-sm, tinted bg (100-level) + dark text — never white-on-bright.

**Toast** — bottom-center mobile / bottom-right desktop; icon + message + optional action; 4s auto-dismiss (errors persist until dismissed); max 2 stacked; polite aria-live.

**Loading/Skeletons** — skeletons for every card/list/PDP block (V1 strength, keep); shimmer 1.2s ease-in-out; never spinners for content (spinners only inside buttons). Layout dimensions reserved (CLS 0).

**Empty states** — friendly rider-voice line + one clear action ("Your cart's empty — the good gear is this way → Shop helmets"); may use small badge-style illustration (sanctioned rare use).

**Error states** — honest, actionable, never technical ("We couldn't load products. Retry?" + retry button); form errors inline; page-level = illustration + retry + support link.

---

# 8. Motion System

```css
--ease-out: cubic-bezier(0.22, 1, 0.36, 1);   /* V1 continuity — the "MotoPark glide" */
--ease-inout: cubic-bezier(0.65, 0, 0.35, 1);
--dur-instant:120ms; --dur-fast:200ms; --dur-base:300ms; --dur-slow:400ms; --dur-cinematic:600ms;
```
- **Hover:** 120–200ms (cards lift 4px, buttons darken, images scale 1.03 max).
- **Page transitions:** 200ms fade/8px rise on route change; never block interaction; skeletons appear immediately.
- **Scroll reveals:** once-only, 300ms, 24px rise, stagger 60–90ms, `IntersectionObserver`; commerce grids reveal in ≤2 batches (never item-by-item dribble).
- **Cinematic band allowance:** parallax ≤10%, duration ≤600ms, storytelling sections only.
- **Micro-interactions:** add-to-cart = button success morph (150ms) + cart badge pop + drawer slide (300ms); wishlist heart = 200ms fill+scale.
- **Loading:** skeleton shimmer only; progress on checkout steps.
- **Reduced motion:** `prefers-reduced-motion` → all transforms/parallax off, opacity-only 150ms, carousels static.
- **When NOT to animate:** filters applying (instant), price/stock updates (instant truth), form validation, checkout step changes (progress only), anything >2× per session repetitive, listings scroll (native — no Lenis on listings/checkout; Lenis allowed on home/brand pages only, per study).

---

# 9. Iconography, Illustration, Photography

- **Icons:** lucide-react (V1 continuity), 1.8px stroke, rounded caps/joins, 20/24px UI sizes, navy-700 default / navy-400 secondary / orange-600 only in action or feature-icon contexts. Lightning-bolt accent mark (from badge) sanctioned for deals/speed/new — sparingly.
- **Illustration:** retro-poster badge style **rare + deliberate** (empty states small, campaign banners, packing slips). Never page backgrounds/wallpaper (locked).
- **Photography:** per identity §11 — all rider types (commute/city/sport/touring/ADV), real Indian roads, warm grade, golden hour = signature not rule; products on white/cream-100, consistent angles, macro trust shots (stitching, armor, certification labels).

---

# 10. Product Design Standards

- **PLP cards:** per §7 spec. Grid 4/3/2. Info priority: image > price > title > rating > urgency. Sale = struck MRP + "% off" in ember + optional SALE badge (radius-sm, ember bg). Max 1 badge + 1 urgency line per card (no sticker-spam).
- **PDP layout (desktop 7/5):** gallery (thumbs + zoom + variant-linked images) | buy box: brand row ("Genuine **Axor** — Authorized Retailer" + brand logo, study ADOPT) → title h1 → rating summary (anchor to reviews) → price-lg + MRP + savings → EMI hint ("EMI from ₹X/mo · Razorpay") → variant selectors (size pills with stock-aware disabled states + size guide link, color swatches) → **fits-your-bike checker** (select make/model → ✓/✗ — the differentiator) → stock indicator → CTA trio: Add to Cart (primary) · Buy Now (secondary) · wishlist — plus "Ask a rider" WhatsApp ghost link (study ADAPT) → trust row (genuine gear · free ship ≥₹2,000 · easy returns) → accordion: description / spec table / care / shipping+returns. Below: reviews (distribution + verified-buyer cards + featured), related products, "pairs well with". Mobile: sticky bottom purchase bar (price + Add to Cart) — V1 strength, keep.
- **Pricing (per Commerce Law 2):** ₹ symbol, Indian grouping (₹12,499), tabular. **Normal price = ink (navy-700), always.** Sale price + discount indicators (struck-MRP context, "% off", SALE badge) = ember/orange family — the only non-CTA orange. MRP struck navy-400 + "18% off" ember caption.
- **Stock:** >5 = nothing (calm default); ≤5 = "Only N left" amber; 0 = "Out of stock" + notify-me (neutral, never red panic).
- **Ratings/Reviews:** stars orange-400 fill (sanctioned non-CTA orange use — smaller area, always beside text), count always shown; review card = name + "Verified Buyer" green tick + date + stars + text; featured reviews get accent-bordered card on home/PDP.
- **Specifications:** two-column striped table, spec typography, certification badges (DOT/ECE/ISI) as icon+label chips — trust made visible.
- **Brand presentation:** brand strip on home (grayscale→color hover), brand chip on cards, authenticity statement on PDP, brand page hero + story blurb.

---

# 11. Checkout Design Standards

- **Cart:** line items (image, title, variant, qty stepper 44px targets, price, remove-with-undo toast); order summary sticky right (desktop) — subtotal, **shipping (₹100 flat / FREE ≥₹2,000 with progress bar: "₹450 away from free shipping")**, total; coupon field collapsed behind "Have a coupon?"; trust row under CTA.
- **Checkout (single page, 3 collapsible steps — V1 continuity):** Contact+Address (guest-first; auth gate appears only at order placement per PRD) → Review+Shipping (backend-computed quote displayed verbatim: Cart Total · Shipping · Free-flag · Final Payable) → Payment (Razorpay). Progress indicator; each completed step collapses to editable summary line. Max-width 560px, zero distractions (no nav menu — logo + secure badge only). Error recovery inline, never full-page resets.
- **Payment:** Razorpay modal handoff with "Secured by Razorpay" + lock icon before handoff; failure = calm retry screen (order intact), never blame.
- **Confirmation:** success check (400ms draw — sanctioned delight), order number huge (MP-2026-XXXXXX), what-happens-next timeline (Confirmed → Packed → Dispatched → Delivered), guest **claim-account nudge** ("track this order anytime — verify your phone"), continue-shopping path.
- **Trust throughout:** padlock + "encrypted" microcopy at payment, phone number visible ("Questions? Call the shop"), returns policy link at every money moment.

---

# 12. Accessibility (WCAG 2.1 AA floor)

Contrast per §2.4 · every interactive element keyboard-reachable, logical tab order, skip-to-content link · focus visible always: 2px focus-ring offset 2px (blue, never orange) · touch targets ≥44×44px, ≥8px apart · body ≥16px, no text-in-images for info · forms: labels + `aria-describedby` errors + `autocomplete` attrs · images: product alt = "{brand} {product} {variant}", decorative = `alt=""` · icon buttons: `aria-label` · carousels: pause, no autoplay, swipe + buttons · modals/drawers: focus trap + return · aria-live for cart updates/toasts/async results · color never sole meaning (icons/text accompany) · reduced-motion per §8 · target: beat all three studied competitors (each fails AA somewhere — documented in study §14).

---

# 13. Responsive Rules

Breakpoints: `--bp-sm:375 · --bp-md:768 · --bp-lg:1024 · --bp-xl:1280 · --bp-2xl:1536`.
- **Mobile-first CSS** (min-width queries only).
- **Small mobile (<375):** 2-up compact grids, price-lg steps to 22, gutters 12.
- **Mobile (375–767):** bottom-sheet filters, persistent search bar, sticky PDP buy bar, drawer nav, 2-up grids, bottom-anchored CTAs.
- **Large mobile/Tablet (768–1023):** 3-up grids, hybrid nav (condensed mega-menu), side-by-side PDP begins ≥900px.
- **Laptop (1024–1279):** full mega-menu, 4-up tight or 3-up, filter rail appears.
- **Desktop (≥1280):** container locks 1280, 4-up, PDP 7/5, cart drawer 420px.
- Images: `srcset/sizes` per tier; art direction swap allowed on hero only.
- No horizontal scroll ever (except intentional swipe rows with visible affordance + scroll-snap).

---

# 14. Performance Rules

- **LCP target <2.5s mobile:** hero = optimized image (AVIF/WebP + JPEG fallback) or text-on-gradient — **never video as LCP**; hero image `fetchpriority=high`, preloaded; video lazy + poster-first (V1 pattern).
- **Lazy loading:** all below-fold images `loading=lazy` + `decoding=async`; explicit `width/height` (or aspect-ratio) on every media element → **CLS <0.1** guaranteed by skeletons with reserved dimensions.
- **Image strategy:** Cloudinary transforms (`f_auto,q_auto,w_{size},dpr_auto`); card thumbs ≤80KB, PDP zoom progressive; 4:5 product ratio locked platform-wide.
- **Animation budget:** transform+opacity only (compositor-safe); no layout-triggering animation; ≤3 concurrent animated elements per viewport; IntersectionObserver-driven.
- **Fonts:** Geist woff2 subset (latin + ₹), `font-display:swap`, preloaded (≤2 weights initially: 400/600); Sakana loaded lazily (display-only, swap-safe); tabular-nums via variation settings not extra weight.
- **JS:** route-level code splitting (V1 pattern), admin bundle fully separate, INP <200ms (no long tasks on interaction paths), list virtualization ≥50 items (react-window available).
- **Budgets:** initial JS ≤180KB gz storefront route; CSS ≤50KB; 3rd-party scripts: Razorpay checkout lazy-loaded at payment step only; GA4 deferred.

---

# 15. AI Readiness (design seams, no AI in MVP)

Components are specced so future AI slots in without redesign:
- **Assistant surface:** the Drawer component (right/bottom-sheet) doubles as future RAG-assistant panel; message-list block = card variants + skeleton loader already specced; input = standard Input + send button. No new primitives needed.
- **AI Product Discovery:** search overlay already renders mixed entity results; an "AI suggestions" section = existing product-card row + chip set ("because you ride a Himalayan"). Suggestion chips = existing Chip spec.
- **AI Fitment Advisor:** PDP fits-your-bike block is architected as a Q&A slot (question → structured answer + confidence note) — the future advisor upgrades its content, not its container.
- **Explanation pattern:** every recommendation surface reserves a "why this" caption line (caption typography, navy-400) — AI later fills it.
- **AI Business Insights (admin):** admin stat-card + chart components (Recharts, token-colored) accept an "insight" footnote slot.
- **Data attributes:** product cards/PDP emit stable `data-product-id`, `data-sku`, structured JSON-LD — machine-readable surfaces from day one.

---

# 16. Deliverable Map

| Deliverable | Where |
|---|---|
| 1. Design Language | §1 |
| 2. Design Tokens (3-layer, CSS vars) | §2–§6, §8 (code-ready) |
| 3. Component Library Spec | §7, §10, §11 |
| 4. Responsive Rules | §5, §13 |
| 5. Motion Guidelines | §8 |
| 6. Accessibility Guidelines | §12 |
| 7. Performance Guidelines | §14 |
| 8. React+Vite implementation readiness | tokens = `src/styles/tokens.css`; components map to `src/components/ui/*`; no Tailwind dependency (vanilla CSS vars, V1 continuity); lucide-react + Framer Motion + Lenis (scoped) retained |

---

# 17. Design System Review Checklist (approve before homepage concepts)

**Brand alignment**
- [ ] Feels like MotoPark evolved (warm, badge-inspired accents) — not a rebrand, not Rideradian
- [ ] Logo treated as inspiration; no mountain/forest/sunset wallpaper anywhere in the system
- [ ] Serves ALL rider types — no adventure-only bias in language or imagery rules
- [ ] Orange = action-only rule acceptable (prices in ink/ember, stars in orange-400 as sanctioned exceptions)

**Commerce & UX**
- [ ] 60/40 commerce-storytelling enforced structurally (section rules, hero heights)
- [ ] 2–3-click product access supported by nav/search/filter specs
- [ ] All six Experience Principles traceable to concrete component decisions
- [ ] Checkout standards match the locked flow (guest-first, auth at order, backend shipping quote, Razorpay-only)

**System quality**
- [ ] Three-layer tokens (primitive→semantic→component) approved as the styling contract — no hardcoded hex in components
- [ ] Type scale (16px body floor, Sakana display-only) approved
- [ ] Spacing/grid rhythm (4px base, 1280 container, 4/2 product grids) approved
- [ ] Radius/shadow/glass rules approved (single sanctioned glass use: navbar)

**Non-negotiables**
- [ ] WCAG AA floor + focus/touch/reduced-motion rules accepted as blocking requirements
- [ ] Performance budgets (LCP <2.5s, CLS <0.1, JS ≤180KB gz) accepted as blocking requirements
- [ ] Motion law (Usability > Performance > A11y > Effects; no-animate list) approved
- [ ] Light-only launch with token-ready dark mode accepted

**Forward compatibility**
- [ ] AI seams (§15) sufficient for planned AI features without redesign
- [ ] Dark-mode-by-token-remap strategy accepted
- [ ] Admin shares tokens (may adopt dark first) accepted

**Sign-off →** unlocks next phase: three homepage concepts (Heritage Forward · Commerce Clean · Cinematic Hybrid), all built strictly from these tokens and components.

---
*End — MotoPark V2 Design System (draft). Sources: docs/07 identity · docs/08 UX study · locked stack decisions.*
