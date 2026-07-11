# MotoPark V2 — Homepage Concept Explorations

**Status:** ✅ CONCEPT C APPROVED · 2026-07-05 (with owner motion refinement — see "Approved Motion Doctrine" at end) · A/B retained as reference explorations
**Constitution (read-only inputs):** Brand Identity (07) · Competitor UX Study (08) · Design System (09, incl. Commerce Laws §0)
**Nature:** design explorations, NOT final designs. All three use the SAME locked tokens, type scale, spacing, components. They differ in *expression and intensity*, never in identity. All three are unmistakably MotoPark.
**Originality:** no layout/color/branding/graphic/section/animation copied from Rideradian, MotoWilder, or Zero. Only abstract mechanics from the study's ADOPT/ADAPT list are used, re-expressed in MotoPark's system.

---

# CONCEPT A — "Heritage Forward"

*The trusted rider's shop, grown up. Warmth leads; commerce rides pillion — but never falls off.*

**1. Design Philosophy.** Trust is MotoPark's real product; gear is how it's delivered. Every section answers "why buy *here*?" — genuine gear, real riders, a real shop in Vizag shipping nationwide. The homepage feels like walking into the shop: greeted warmly, shown the good stuff, never pressured.

**2. Visual Direction.** The warmest legal expression of the system: cream-50 page, generous cream-100 bands, navy ink, orange CTAs. Photography-forward (real riders, all types, warm grade). One small badge-derived flourish: a thin sunset-gradient keyline under section eyebrows. No mountains/pines/sunset wallpaper — warmth via color temperature and people, not scenery.

**3. Emotional Experience.** Arrival: "these are my people." Scroll: familiarity → confidence. Exit memory: *"the genuine-gear shop with a face."*

**4. Information Hierarchy.** Offer bar → Nav → Hero (welcome + product) → Category tiles → Bestsellers → Trust band (Google rating + badges) → Featured brands wall → Rider Stories strip (community) → Featured reviews → Shop-by-bike entry → Footer.

**5. Desktop Layout.** 1280 container. Hero 70vh: left 5-col text block (Sakana headline, e.g. "Gear for every ride."; subline; dual CTA), right 7-col warm lifestyle photo with an inset product card (the hero itself sells). Below: 6-up category tiles → 4-up bestseller grid (8 products) → full-bleed cream-200 trust band → brand wall (2 rows grayscale→color) → 3-up rider-story cards → 2-up featured review cards → bike-fitment entry strip → footer.

**6. Mobile Layout.** Hero compresses to photo-top/text-bottom card (≈60vh), persistent search bar under nav, category tiles become 2-row swipe rail, bestsellers 2-up grid, trust band stacks, stories become swipe rail. Sticky bottom nav (Home/Shop/Search/Wishlist/Account — V1 continuity).

**7. Hero.** Static warm photo (LCP-optimized image, `fetchpriority=high`), one message, dual CTA ("Shop bestsellers" primary / "Visit the shop" secondary), inset product card links straight to a PDP (1 click). No video, no carousel.

**8. Navigation.** System navbar spec verbatim: cream-glass sticky, mega-menu, search/wishlist/account/cart. Offer bar: rotating single message (free shipping ≥₹2,000 / genuine-gear promise).

**9. Search.** Header search prominent; mobile persistent bar; overlay with products/categories/brands/bikes + recent searches. Identical across all three concepts (Law 1 & study ADOPT) — search is infrastructure, not a styling playground.

**10. Category Discovery.** Named tiles WITH product counts, photographed products (not icons) — 6 core categories + "All gear." 1 click → category, 2 → PDP. ✓

**11. Featured Products.** "Riders' favourites" — bestsellers curated by actual sales, 8 cards, standard product-card spec, quick-add. Eyebrow copy in rider voice ("What Vizag actually buys").

**12. Trust Building (this concept's superpower).** Dedicated trust band above the fold-2: live Google rating, 5000+ riders count, genuine-gear pledge, showroom photo + address + timings + phone. Featured verified reviews get faces and bike names. "Since 2020" worn proudly.

**13. Brand Story.** Compact "From Vizag, for every rider in India" strip — 3 sentences + shop photo, links to About. Story serves trust, doesn't dominate (≈15% of page height).

**14. Conversion Strategy.** Trust density converts the skeptical first-timer (largest Indian e-com barrier). Bestsellers reduce choice paralysis. Free-shipping threshold messaging builds basket.

**15. CTA Strategy.** Hero dual CTA; one primary per section; category tiles are whole-tile targets; single "Shop all gear" band CTA before footer.

**16. Footer.** System spec: navy-800, 4 columns, trust row, newsletter, payments. Plus mini map/photo of the shop (Heritage touch).

**17. Motion.** Quietest of the three: fade+rise reveals (300ms, once), card hovers, zero parallax. Warmth needs no drama.

**18. Accessibility.** Easiest: mostly light surfaces, verified pairs, no text-over-image except hero (scrim + AA-checked). Photo-heavy → alt-text discipline critical.

**19. Development Complexity — LOW.** All standard system components; no new primitives; hardest asset problem is photography quality, not code.

**20. Advantages.** Strongest trust signal per pixel; cheapest to build well; most "evolution of V1" familiar; photography does the premium work; safest CWV.

**21. Trade-offs.** Least "wow" for enthusiasts; heavy dependence on owning good photography (bad photos would sink it); risks reading "friendly local store" more than "premium national brand"; weakest brand-cinema memory.

**22. Why it fits.** It's the Everyman half of the archetype fully realized — the shop's soul on screen. If MotoPark's #1 battle is trust vs Amazon, this fights it hardest.

**Commerce Laws audit:** products first scroll ✓ (hero inset card + categories at ~75vh) · search immediate ✓ · 2–3 clicks ✓ · trust before ask ✓✓ (its thesis) · mobile-first ✓ · fast ✓ (static hero, no video) · commerce-first ✓ (≈65/35) · premium-not-exclusive ✓. **No violations.**

---

# CONCEPT B — "Commerce Clean"

*The fastest way in India to find the right riding gear. Utility elevated to premium through craft.*

**1. Design Philosophy.** Respect the rider's time above all. Every element either helps find, evaluate, or buy gear — or it's cut. Premium = precision: perfect rhythm, flawless type, instant response. The brand whispers through warmth of surface and voice of microcopy.

**2. Visual Direction.** The coolest legal expression: white surfaces dominant on cream-50 page, maximal whitespace, strict grid, ink typography, orange only on CTAs/sale. Sakana appears exactly twice (hero line, one section head). Photography = products on white/cream, tightly art-directed; lifestyle imagery minimal (one strip).

**3. Emotional Experience.** Arrival: instant clarity ("I can find it here"). Scroll: efficiency → respect. Exit memory: *"the fastest, cleanest gear store I've used."*

**4. Information Hierarchy.** Offer bar → Nav → Compact hero (search-forward) → Category grid (the true hero) → New arrivals → Bestsellers → Slim trust strip → Shop-by-bike module → Slim brand row → One lifestyle strip → Footer.

**5. Desktop Layout.** Hero only 45–50vh: centered Sakana line ("The right gear for your ride.") + oversized search field (autofocus affordance) + 4 popular-query chips ("Helmets under ₹5,000", "Riding gloves", "Tail bags", "Axor"). Directly below, an 8-tile category grid (2 rows) — the page's real hero. Then 4-up new arrivals, 4-up bestsellers, single-line trust strip (rating · genuine · returns · secure), bike-fitment selector module (make/model dropdowns → "Show my gear"), brand logo row, one full-width lifestyle photo strip with quiet caption, footer.

**6. Mobile Layout.** Hero ≈35vh (line + search + chips), categories 2-up grid (visible without scroll ambition: search + 2 categories inside first viewport), products 2-up, fitment module full-width card, sticky bottom nav. The most thumb-efficient of the three.

**7. Hero.** No imagery at all — typographic + search. LCP = text (near-instant). The statement IS the search box: we're a tool you'll love.

**8. Navigation.** System navbar; because hero is short, nav goes straight to solid cream-glass (no transparent phase). Mega-menu identical.

**9. Search (this concept's superpower).** Search is the homepage thesis: hero-embedded field + header field; overlay with typo-tolerant results, category/brand shortcuts, query chips seeded by season ("monsoon gear"). Fastest possible route: home → typed query → PDP = 2 interactions.

**10. Category Discovery.** 8 photographed tiles with counts, above the fold on desktop; plus fitment module as a second discovery axis. Strongest pure discovery of the three. ✓

**11. Featured Products.** Two tight rows (New arrivals / Bestsellers), 4+4, zero decoration between — product density highest of the three (≈16 products visible by 2nd scroll).

**12. Trust Building.** Slim persistent strip (rating, genuine-gear, returns, secure) + verified badges on review counts. Honest but minimal — trust as ambient fact, not featured story. *(Weakest trust narrative of the three — acknowledged trade-off.)*

**13. Brand Story.** One lifestyle strip + footer blurb only (~8% of page). Story lives on About/brand pages instead.

**14. Conversion Strategy.** Speed converts: shortest path-to-product in the set; chips pre-answer intent; fitment module captures "will it fit?" — the #1 gear anxiety. Risk: gives skeptical first-timers less reassurance narrative.

**15. CTA Strategy.** Almost no explicit banner CTAs — tiles, cards, and search ARE the CTAs. Orange appears rarely, which makes card quick-adds pop harder.

**16. Footer.** System spec verbatim; footer carries proportionally more trust weight here (address, phone, badges).

**17. Motion.** Near-still: 200ms hovers, one-time 250ms section fades, zero parallax/video. Feels fast because it *is* fast and *looks* fast.

**18. Accessibility.** Best of the three: text-first hero, minimal overlays, highest contrast surface mix, least motion. AA everywhere trivially.

**19. Development Complexity — LOWEST.** No hero media pipeline, no cinematic bands; ships fastest; least design-QA surface.

**20. Advantages.** Fastest LCP conceivable (text hero); highest product density; clearest Commerce-Law compliance; easiest to maintain solo; scales to catalog growth naturally; best a11y.

**21. Trade-offs.** Emotional ceiling: warmth must come entirely from microcopy, surface temperature, and photography discipline — under-crafted it drifts generic ("could be any clean store"); under-delivers the 40% storytelling mandate (~8–12% actual); least memorable brand cinema; enthusiasts get efficiency, not feeling.

**22. Why it fits.** It's the Experience Principles literalized — especially "find gear quickly" and "premium without complexity." If MotoPark's #1 battle is usability + shipping speed of the build, B wins outright.

**Commerce Laws audit:** products first scroll ✓✓ (categories in first viewport) · search immediate ✓✓ (search IS the hero) · 2–3 clicks ✓✓ (often 2 interactions) · trust before ask ✓ (strip precedes products — but thinnest treatment) · mobile-first ✓✓ · fast ✓✓ · commerce-first ✓✓ (≈90/10 — **note: this *over*-satisfies Law 8 by under-delivering the 40% storytelling mandate; flagged honestly as a brand-side deviation, not a Commerce Law violation**) · premium-not-exclusive ✓. **No violations; one brand-mandate deviation (storytelling share).**

---

# CONCEPT C — "Cinematic Hybrid"

*One breath of cinema, then the cleanest shop in India. Emotion opens; commerce closes.*

**1. Design Philosophy.** Sequence the two brand jobs instead of blending them everywhere: the first viewport earns *feeling* (why MotoPark), everything after earns *action* (buy well, fast). One cinematic inhale — then Concept B's discipline for the rest of the page. The 60/40 is vertical: 40 up top and in one mid-page band, 60 everywhere else.

**2. Visual Direction.** Navy-800 cinematic hero (the badge's ink, not black) with warm photographic light; Sakana display at full scale; then a deliberate temperature shift to cream/white commerce sections. The dark→light transition itself is the signature brand moment — sunset into daylight, expressed in surface color, not scenery graphics.

**3. Emotional Experience.** Arrival: a held breath — "this brand takes riding seriously." Transition: relief and clarity as the page opens into light. Exit memory: *"premium brand that's effortless to shop."*

**4. Information Hierarchy.** Offer bar → transparent Nav → Cinematic hero (navy, 80vh) → light transition → Category grid → Bestsellers → Trust band → Shop-by-bike module → ONE navy story band (community/"every ride" film strip) → New arrivals → Featured reviews → Brand row → Footer.

**5. Desktop Layout.** Hero 80vh navy: full-bleed warm-lit photograph (rider + product visible, any rider type per identity), headline bottom-left (Sakana, display scale, cream), subline, dual CTA (orange primary "Shop the gear" / cream-outline "Why riders choose us" → scrolls to trust), slim product ticker along hero base (3 shoppable cards peeking into the fold — products literally in the first viewport). Then: 8-tile category grid on cream → 4-up bestsellers → trust band (rating/badges/showroom) → fitment module → navy story band (60vh, one message: "Every ride counts", 3 rider-type vignettes, subtle 400ms reveals) → 4-up new arrivals → 2-up featured reviews → brand row → footer.

**6. Mobile Layout.** Hero ≈70svh, static image (no video on mobile, ever), headline + one CTA + 2-card product peek; below identical to B's mobile commerce stack; story band compresses to swipe cards; sticky bottom nav; persistent search bar under header.

**7. Hero.** Desktop MAY use ambient video (muted, ≤6s loop, lazy, poster-first, `prefers-reduced-motion`→static, data-saver→static); **LCP element is always the poster image or headline text, never video**. Mobile always static. One message only, rotated by campaign via CMS (HomeBuilder), never auto-carousel.

**8. Navigation.** Transparent over hero (cream text, AA against scrim) → cream-glass on scroll. Everything else per system.

**9. Search.** Identical infrastructure to A/B (header + mobile persistent + overlay). In the hero itself search is one tap away in nav — acceptable under Law 1 because the persistent header search never leaves the viewport.

**10. Category Discovery.** Same 8-tile grid as B, placed immediately after hero (~85vh onset desktop, ~72svh mobile). 2 clicks to PDP. ✓

**11. Featured Products.** Bestsellers directly under categories + hero base ticker (which links straight to 3 PDPs = 1-click product access from viewport #1). New arrivals after story band re-energize the back half.

**12. Trust Building.** Full trust band (A's treatment, slightly compressed) BEFORE fitment and story band; verified reviews near page end to close the loop. Trust precedes every conversion cluster. ✓

**13. Brand Story.** The navy story band is the 40%'s heart: "Every ride counts" — commute/city/tour vignettes (all-rider mandate made visible). ~20% of page height; total storytelling ≈35–40% including hero. Closest to the mandated ratio.

**14. Conversion Strategy.** Emotion primes willingness-to-pay (premium perception lifts AOV); then B-grade efficiency harvests it. Hero ticker converts impulse; trust band converts skeptics; fitment converts the anxious.

**15. CTA Strategy.** Hero dual CTA (act now / learn why) serves both temperatures of visitor; below the fold, B's restraint: components are the CTAs; one final band CTA pre-footer.

**16. Footer.** System spec verbatim (navy footer bookends the navy hero — compositional close).

**17. Motion (the concept's risk surface, budgeted hard).** Hero: single 600ms entrance choreography (headline rise + ticker slide), once per session. Story band: 400ms reveals + ≤8% parallax on desktop only. ALL commerce sections: B's quiet 200–300ms. Lenis on home only. Reduced-motion: all cinematics become static. **If any Core Web Vital budget fails in build, cinematic elements are cut in this order: parallax → video → entrance choreography** (pre-agreed degradation ladder).

**18. Accessibility.** Hardest of the three, all solvable: hero text over image needs scrim + verified pairs (cream on navy-scrim ~10:1 ✓); transparent-nav phase needs contrast management; video needs pause + reduced-motion + no-info-in-motion. Story band text = cream on navy-800 ✓.

**19. Development Complexity — MODERATE.** B's components + one hero system (media pipeline, scrim/transparent-nav logic, degradation ladder) + one story band. Estimated +25–35% homepage effort vs B; all other pages identical across concepts.

**20. Advantages.** Strongest brand memory + premium perception; fulfills the 60/40 mandate most faithfully; showcases all-rider identity explicitly; hero = CMS-rotatable campaign engine (HomeBuilder continuity); differentiates hardest from marketplace sameness.

**21. Trade-offs.** Highest perf discipline required (mitigated by ladder, but it's real engineering attention); premium hero raises photography bar even higher than A; more design-QA surface; the dark hero must never leak into commerce sections or the page cools off-brand (guarded by tokens); solo-dev time cost is the honest price.

**22. Why it fits.** It's the approved identity §15 executed literally — navy cinematic moments over warm commerce core — and the only concept expressing "premium Indian motorcycle commerce" with *both* words at full strength.

**Commerce Laws audit:** products first scroll ✓ (hero base ticker — verified in layout spec) · search immediate ✓ (persistent header/nav search) · 2–3 clicks ✓ (ticker=1, categories=2) · trust before ask ✓ (band precedes fitment/story/back-half commerce; hero CTAs are shop/learn, not buy-item) · mobile-first ✓ (static hero, svh units, B-stack below) · fast ✓ *conditional on the degradation ladder being enforced* · commerce-first ✓ (≈60/40 exactly) · premium-not-exclusive ✓ (all-rider vignettes are the story). **No violations; one enforcement dependency (perf ladder) flagged.**

---

# Comparison Matrix

Scale: ●●● strong · ●●○ good · ●○○ adequate

| Criterion | A · Heritage | B · Clean | C · Hybrid |
|---|:--:|:--:|:--:|
| Brand alignment (identity §1–16, 60/40 mandate) | ●●○ (warm ✓, premium-modern ●○○) | ●○○ (clean ✓, warmth/story thin) | **●●●** |
| Commerce effectiveness (path-to-product, density) | ●●○ | **●●●** | ●●○ (near-B below fold) |
| Trust | **●●●** | ●○○ | ●●○ |
| Mobile UX | ●●○ | **●●●** | ●●○ |
| Performance (CWV headroom) | ●●○ | **●●●** | ●○○→●●○ (ladder-dependent) |
| Accessibility (effort to AA) | ●●○ | **●●●** | ●○○ (solvable, most work) |
| Scalability (catalog growth, campaigns) | ●●○ | ●●○ | **●●●** (CMS hero engine) |
| React implementation complexity (lower=better) | ●●○ | **●●●** | ●○○ (+25–35% homepage) |
| AI readiness (§15 seams usable) | ●●○ | ●●● | ●●● (fitment module prominent in both) |
| **Commerce Laws** | pass | pass (over-indexes commerce) | pass (perf conditional) |

---

# Recommendation (critical, not automatic)

**Recommended: Concept C — Cinematic Hybrid, in the disciplined form specified above — with B as the pre-agreed structural fallback.**

The honest reasoning, including against C:

1. **B is the best *store*; C is the best *MotoPark*.** B wins raw commerce, perf, a11y, and build speed — but it under-delivers the two things this project locked as identity: the 40% storytelling mandate (~10% actual) and warm-premium differentiation. The north star is "MotoPark sells the right gear for your ride," not "MotoPark is the fastest SKU grid." B executed solo risks becoming exactly the generic cleanliness the brand refused.
2. **A fights yesterday's battle best.** Its trust density is superb for first-time skeptics, but it caps the premium-national ambition and depends most on photography MotoPark may not yet own. Its best parts (trust band, showroom presence, review treatment) are *portable* — and C explicitly imports them.
3. **C's real cost is engineering discipline, and we priced it.** The known failure mode (cinematic sites bleed CWV) is countered structurally: LCP is never video, mobile is always static, and the degradation ladder (parallax → video → choreography) is agreed *now*, before a single pixel ships. If the ladder is fully exhausted, what remains of C **is essentially B with a navy hero image** — meaning the fallback is built into the choice, not a rewrite.
4. **C is one page of extra risk.** Category, PDP, cart, checkout are identical system builds in all three concepts. We are choosing a homepage expression, and C's premium ceiling on that one page compounds across every campaign the CMS hero will ever run.

**Condition of recommendation (blocking):** C ships only with the §17 motion budget and degradation ladder enforced in code review, and hero photography meeting the identity's photography direction. If either fails at build time, drop to B's hero (typographic + search) without renegotiating the rest of the page.

*Concept C approved → next: high-fidelity homepage mockups (desktop + mobile) of Concept C only.*

---

# Approved Motion Doctrine for Concept C (owner refinement, 2026-07-05 — FINAL, supersedes §17-C where stricter)

**Principle:** motion supports commerce, never dominates it. Premium comes from **layout, typography, spacing, photography, hierarchy** — animation is seasoning, not the dish. "Premium commerce with subtle cinematic moments," not an animation showcase.

**Allowed (the complete list):**
- Hero text reveal (once per session, ≤600ms total choreography)
- Image fade-ins on load/reveal (≤300ms, once)
- Card hover effects (lift + shadow, 120–200ms)
- Sticky navigation transition (transparent → cream-glass, 200ms)
- Smooth section transitions (fade + ≤24px rise, once, ≤300ms)
- Product-card micro-interactions (quick-add morph, wishlist heart, cart badge pop)

**Banned (by decree, not by perf budget):**
- Scroll-jacking — any form
- Long pinned/sticky storytelling sections
- Parallax — **cut entirely** (previously ≤8% desktop; now zero — it was first on the degradation ladder and is now removed by default)
- Continuous/looping animations (ambient hero video remains the single sanctioned exception: desktop-only, ≤6s, muted, poster-first, LCP is never the video, static on mobile/reduced-motion/data-saver)
- Any motion that delays product discovery — products remain reachable within the first scroll at all times; no entrance animation may gate the hero product ticker or category grid

**Simplified degradation ladder (what remains):** if CWV budgets fail at build → cut ambient video → cut hero entrance choreography. Everything else is already static-first.

**Enforcement:** this doctrine is checked at design review (mockups) AND code review (build). Design System §8 (incl. reduced-motion rules and the "when NOT to animate" list) applies unchanged beneath it.
