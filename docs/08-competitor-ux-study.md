# MotoPark V2 — Competitor UX Study (mechanics only)

**Date:** 2026-07-04 · **Method:** live Playwright audit (desktop 1440px + mobile 390px), DOM/style probes, full-page captures
**Subjects:** rideradian.com (Radian — electric enduro launch site) · motowilder.in (Indian riding-gear store, WooCommerce) · zeromotorcycles.com (Zero — EV motorcycle brand)
**Rules honored:** UX mechanics only. No branding, layouts, graphics, typography, colors, or animations copied. Every adopted pattern is re-expressed in MotoPark's approved identity (docs/07). Verdicts validated against the Experience Principles (docs/07 §10a) and Commerce-First 60/40 + 2–3-click rules.

---

## Site briefs (what each one *is*)

- **Radian** — single-product premium launch site. One font family (Instrument Sans), H1 80px/1.0/wt-500, GSAP + Lenis + ScrollTrigger + Swiper, 8 videos, 31/34 images lazy, fixed transparent→solid nav, dual-CTA hero ("Explore" ghost + "Configure" solid accent), cinematic dark/light alternating bands. **Storytelling ~90/commerce 10 — the exact inverse of MotoPark's mandate.** Useful for: motion discipline, CTA pairing, feature-list rhythm.
- **MotoWilder** — the direct commerce comparable. Poppins throughout (13–14px base — too small), red/black utility skin, offer bar, giant center search, category row nav, dark hero carousel, circular category icons, sale carousel, brand strip, **embedded Google Reviews (5.0★)**, WhatsApp + call floating buttons, EMI widget on PDP, "Product by [brand logo]" attribution, subcategory tiles with product counts, brand filter with search-within-filter. Weak: no sticky nav, tiny type, cluttered PDP sidebar, 300 lazy images on home, dated visual rhythm.
- **Zero** — premium range storytelling. Alternate Gothic condensed display at **350px** scale, POV video hero with left-aligned copy, **scroll-driven model index** (sticky section: bike image left, giant model names right, vertical line-labels rail), red utility offer bar, no heavy motion libs (CSS/sticky-driven), Cookiebot. Commerce is "configure/locate dealer" — not cart-based.

---

## Dimension-by-dimension findings

Verdict key: **ADOPT** (mechanic fits MotoPark as-is, re-skinned) · **ADAPT** (right idea, needs modification) · **REJECT** (conflicts with identity, Experience Principles, or 60/40 rule).

### 1. Information hierarchy
| Source | What they do | Why it works | Verdict for MotoPark |
|---|---|---|---|
| MotoWilder | Offer bar → search-dominant header → category nav → promo hero → categories → sale → brands → reviews → trust footer | Mirrors an Indian gear-buyer's mental model: deal ▸ find ▸ browse ▸ verify trust | **ADAPT** — keep the *order of intent* (find → browse → trust) but elevate craft; MotoPark's home = hero (1 message) → categories → featured products → brand wall → reviews → community strip |
| Radian | One idea per full-height band, alternating dark/light | Comprehension pacing; each section has one job | **ADAPT** — use "one job per section" rhythm *within* a commerce page, at 60–80vh not 100vh (60/40 rule) |
| Zero | Range-first: models before stories | Product breadth is the brand promise | **ADOPT** — categories/products appear within the first scroll on MotoPark home |

### 2. Visual hierarchy
- Radian: hero headline ~5:1 vs body; single accent color reserved for primary CTA only. **ADOPT the mechanic** (MotoPark: sunset orange = CTA-only, already locked in identity §15).
- Zero: 350px display type as *navigation* (model names are the UI). **REJECT at that scale** — spectacle over shopping; violates commerce-first. **ADAPT the idea** modestly: oversized category labels on hover states/section heads via Sakana display moments.
- MotoWilder: red used for price, sale badge, CTA, links, icons — everywhere. **REJECT** — accent dilution; MotoPark keeps orange scarce so it means "act."

### 3. Grid
- MotoWilder: classic 4-col product grid desktop / 2-col mobile, sidebar filters. **ADOPT** the 4/2 grid (proven for gear); **ADAPT** filters to a drawer/top-bar (no permanent sidebar tax on mobile).
- Radian: 12-col fluid with generous margins, content max ~1200–1300px. **ADOPT** container discipline (MotoPark: 1280px max, 24px mobile gutters).
- Zero: full-bleed media + inset text columns. **ADAPT** for hero/campaign bands only.

### 4. Spacing
- Radian: large consistent section padding (~120–160px desktop), tight intra-component spacing. Premium = whitespace consistency, not size alone. **ADOPT** a fixed section-spacing scale (e.g. 96/64/40 desktop, 64/40/24 mobile).
- MotoWilder: cramped, irregular (13px body, dense cards). **REJECT** — the #1 thing making it feel non-premium.

### 5. Typography (mechanics, not faces)
- Radian: ONE family, weight/size-driven hierarchy, tight display line-height (1.0), 16px body. **ADOPT mechanic** → MotoPark: Geist/Inter for everything, Sakana ONLY as display seasoning (identity §16); body ≥16px; display line-height 1.05–1.1.
- Zero: uppercase condensed display for section identity. **ADAPT** — Sakana serves this role, used sparingly.
- MotoWilder: 13–14px body, weak scale contrast. **REJECT.**

### 6. Motion
- Radian: GSAP+Lenis; scroll-reveals, parallax, magnetic CTAs; smooth but heavy (site feels weighty on load). **ADAPT** — MotoPark keeps V1's Framer Motion + Lenis, but motion budget per identity §12: reveals ≤400ms on commerce paths, no scroll-jacking, `prefers-reduced-motion` honored. Cinematic motion allowed only in the 40% storytelling bands.
- Zero: mostly CSS sticky/scroll-driven, no JS animation lib. **ADOPT the lesson** — biggest perceived-premium wins come from *layout choreography*, not animation libraries.
- MotoWilder: default carousel autoplay everywhere. **REJECT** autoplay carousels for products (motion without purpose).

### 7. Scroll behavior
- Zero: sticky model-index section (scroll advances through range). **ADAPT** → MotoPark's strongest borrowable mechanic: a sticky **"Shop by category"** index (category name list + product imagery) — shopping, not spectacle. Desktop only; simple stacked list on mobile.
- Radian: Lenis smoothing sitewide. **ADAPT** — keep V1's Lenis but disable on listings/checkout (native scroll = faster task completion).
- Scroll-jacking: none observed anywhere. **ADOPT** that restraint.

### 8. Navigation
- MotoWilder: search-dominant header + flat category row + **persistent mobile search bar under header**. **ADOPT** search prominence + mobile persistent search ("finding gear quickly" is Experience Principle #1); **ADAPT** category row into MotoPark's mega-menu (IA §3).
- MotoWilder: no sticky header. **REJECT** — MotoPark keeps V1's sticky nav.
- Radian: transparent→solid on scroll, hamburger even on desktop. Transparent→solid **ADOPT** for home hero; desktop hamburger **REJECT** (hides discovery; violates 2–3-click rule).
- Zero: mega-dropdowns by line/category with imagery. **ADOPT** structure for MotoPark's Shop menu (already in IA).

### 9. Hero
- Radian: full-height product hero, headline + subline + **dual CTA (solid accent primary + ghost secondary)** + scroll cue. **ADOPT dual-CTA mechanic** → MotoPark: "Shop [category/drop]" primary + "Explore" secondary; hero height **ADAPT** to 70–80vh so products peek above the fold (commerce-first).
- Zero: POV video hero, copy bottom-left, single ghost CTA. **ADAPT** — video heroes allowed but must rotate with *product-led* messages; never video-for-video's-sake; poster fallback + lazy video (V1 already does this well).
- MotoWilder: 3-slide autoplay product carousel hero with center text. **REJECT autoplay + center-stack**; single strong message beats 3 rotating weak ones.

### 10. Trust
- MotoWilder: **embedded Google Reviews with live 5.0★ rating**, trust badge row (100% Secure · Pan-India Shipping · Warranty), visible phone/timings/address, WhatsApp button, "Product by [brand logo]" on PDP, EMI-from-₹X (Razorpay-secured). **ADOPT nearly all** — this is the Indian-retail trust playbook and it maps 1:1 to MotoPark's "trust before purchase" principle: real reviews (our verified-buyer system + featured reviews), trust badge row, showroom address/phone/timings in footer, brand-authenticity mark on PDP, EMI hint (V1 has one). WhatsApp contact **ADAPT** as a contact option (not a floating blob overlapping content on mobile — placement refined).
- Zero/Radian: financing offers in the utility bar. **ADAPT** → MotoPark's offer bar already exists (V1); use it for free-shipping-over-₹2,000 and genuine-gear messaging, one message at a time.

### 11. CTA placement
- Radian: primary CTA top-right nav + hero + sticky section CTAs; accent color exclusively for action. **ADOPT** exclusivity rule; nav CTA for MotoPark = cart/search (commerce), not "pre-order".
- MotoWilder PDP: add-to-cart below fold on mobile, no sticky buy bar. **REJECT** — V1 already has a sticky mobile purchase bar; V2 keeps it (proven pattern, protects conversion).
- Zero: "Explore/Configure/Locate" trio per model. **ADAPT** → PDP trio: Add to Cart (primary) · Check fit ("fits your bike") · Ask a rider (WhatsApp/enquiry) — maps to Experience Principle #5.

### 12. Product discovery
- MotoWilder: subcategory tiles **with product counts**, brand filter **with search-within-filter**, quick-view on cards, sort (popularity/latest/price). **ADOPT all four** — they directly serve "find the right gear quickly." Counts = honest expectations; brand-search-in-filter matters with 25+ brands.
- MotoWilder: 59 products, no pagination on category page. **ADAPT** — paginate/load-more after ~24 with URL-synced pages (SEO + performance).
- Zero: scroll-index of range. **ADAPT** (see §7).
- MotoPark-unique (no competitor has it): **"fits your bike" fitment discovery** — our differentiator; give it nav-level prominence ("Shop by Bike"), per IA.

### 13. Conversion
- MotoWilder: EMI-from-₹X on PDP, free-shipping threshold in offer bar (anchors basket-building), WhatsApp pre-purchase channel. **ADOPT** all three mechanics (EMI display via Razorpay, ₹2,000 threshold messaging, WhatsApp ask-before-buy) — each lowers a distinct purchase barrier: affordability, shipping cost, uncertainty.
- Radian: reserve-with-deposit flow. **REJECT for MVP** (Lane B deposits are phase 2 per PRD).
- Zero: dealer-locator as terminal CTA. **ADAPT** — "Visit our Vizag showroom" as a *secondary* trust CTA on About/contact/PDP, never the primary path (we sell online).

### 14. Accessibility
- Radian: strong contrast on CTAs, visible focus, but tiny grey-on-dark labels in places. Zero: uppercase-condensed everything hurts scanability; grey-on-black body text. MotoWilder: 13px body, red-on-black low-contrast areas, icon buttons without labels.
- **ADOPT as requirements (learning from all three's gaps):** WCAG AA contrast on both light+navy surfaces; body ≥16px; never color-only meaning; visible focus rings; labels on icon buttons; reduced-motion support. None of the three is a model — MotoPark should *beat* all three here.

### 15. Performance
- Radian: heavy media (8 videos) mitigated by lazy-loading + posters; still weighty initial load. Zero: media-heavy but CSS-driven motion keeps interaction cheap. MotoWilder: 300+ lazy images, jQuery/Woo stack, no sticky nav reflow issues but dated delivery.
- **ADOPT:** aggressive lazy-loading with dimensions reserved (no CLS), poster-first video, AVIF/WebP, code-split routes (V1 does), motion via CSS/transform only, LCP budget: hero image/text — not video. **REJECT:** autoplaying multi-slide heroes (LCP killer), 300-image homepages.

---

## The adoption blueprint (what V2 actually takes)

**ADOPT (re-skinned into MotoPark identity):**
1. Dual-CTA hero (solid orange primary + quiet secondary) + transparent→solid sticky nav
2. Accent-exclusivity: orange = action, nowhere else
3. Search-dominant header + persistent mobile search
4. Subcategory tiles with counts · brand filter with search · quick-view · sort trio
5. Indian trust playbook: live Google-rating block, trust-badge row, showroom address/phone/timings, PDP brand-authenticity mark, EMI-from-₹X, WhatsApp contact
6. Free-shipping-threshold messaging in the offer bar (₹2,000)
7. One-family typography mechanic (Geist) + display seasoning (Sakana), body ≥16px
8. Fixed section-spacing scale; 1280px container; 4/2 product grid
9. Performance discipline: lazy+reserved media, poster-first video, CSS-driven motion
10. A11y floor that beats all three subjects (AA both themes, labels, focus, reduced-motion)

**ADAPT (modified to fit commerce-first 60/40):**
1. Zero's scroll model-index → MotoPark sticky **category index** (desktop only, shopping-oriented)
2. Full-height narrative bands → 60–80vh, one-job sections; products visible in first scroll
3. Video hero → rotating *product-led* messages, poster fallback, never autoplay carousels
4. PDP CTA trio → Add to Cart · Fits your bike · Ask a rider
5. Lenis smoothing → brand/storytelling pages only; native scroll on listings/checkout
6. Dealer-locator pattern → "Visit our Vizag showroom" secondary CTA
7. WhatsApp floater → refined placement, never overlapping commerce controls

**REJECT (with reason):**
1. 90/10 storytelling ratio (Radian) — inverts our 60/40 mandate
2. 350px type-as-navigation (Zero) — spectacle over shopping
3. Autoplay hero carousels + accent-everywhere + 13px body (MotoWilder) — anti-premium, anti-a11y
4. Desktop hamburger (Radian) — hides discovery, breaks 2–3-click rule
5. Non-sticky header, below-fold mobile add-to-cart (MotoWilder) — conversion killers
6. Scroll-jacking/heavy animation dependencies — violates motion law
7. Deposit/reserve flow — phase 2 per PRD

**MotoPark's edge no competitor has:** verified-buyer reviews (all three lack native reviews), vehicle-fitment discovery ("fits your bike"), and a rider-warm brand voice — the three pillars of "Amazon sells SKUs. MotoPark sells the right gear for your ride."

---
*Next: Phase 2 — three high-fidelity homepage concepts (Heritage Forward · Commerce Clean · Cinematic Hybrid), all built on docs/07 identity, each honoring this study's ADOPT/ADAPT list.*
