# MotoPark V2 — Information Architecture (IA)

**Status:** 🔒 LOCKED (Stage 3) · Frozen unless business requirements change
**Date approved:** 2026-06-30
**Derived from:** Stage 2 PRD (`02-product-requirements-document.md`)

> Authoritative for all later stages. Planning only — no UI/wireframes.

---

## 1. URL Architecture — Permanent Rules
1. Flat, slug-based, lowercase-kebab. No IDs in indexable URLs.
2. One canonical URL per indexable resource.
3. Hierarchy lives in **breadcrumbs + parent relationships, not URL nesting**.
4. Curated > combinatorial: landing pages indexable only when curated and above an inventory threshold.
5. Reserved namespaces prevent slug collisions.
6. `https`, non-`www`, no trailing slash — single normalized form, 301 all else.

### Locked URL formats
| Resource | Pattern | Rules |
|---|---|---|
| Product | `/products/{slug}` | unique, human-readable, lowercase-hyphen, auto-from-title, admin override, **never contains category**, self-canonical, old slugs 301 forever |
| Category | `/c/{slug}` | globally-unique flat slug (subcats get own slug), admin override, parent/child internal only, breadcrumb carries hierarchy, self-canonical, slug-change 301 |
| Catalog | `/store` | **kept from V1**; canonical always `/store`; `/shop`→`/store` 301; no catalog duplication; supports filter/sort/paginate/search |
| Brand | `/brand/{slug}` | curated `/brand/{slug}/{category}` indexable only if curated + above threshold |
| Bike fitment | `/bikes` → `/bikes/{make}` → `/bikes/{make}/{model}` | curated landing; indexable above min compatible-product count; also a listing filter |
| Collection | `/collections/{slug}` | curated/marketing, NOT in breadcrumb |
| Search | `/search?q=` | **noindex,follow** |
| Account | `/account`, `/account/orders[/:id]`, `/account/addresses`, `/account/reviews`, `/account/wishlist`, `/account/enquiries` | noindex, auth |
| Guest tracking | `/track` | order# + email/phone OTP (R1) |
| Enquiry (Lane B) | `/enquiry/{product-slug}` | noindex |
| Policy/trust (NEW) | `/shipping-policy`, `/returns-policy`, `/privacy-policy`, `/terms`, `/faq` | Razorpay + DPDP requirement |
| **Reserved (Phase 2, unbuilt)** | `/guides/{slug}`, `/blog/{slug}` | namespaces + nav/linking seams reserved; **no CMS/editor in MVP** |

## 2. Sitemap
Public/indexable: `/`, `/store`, `/c/{slug}`, `/products/{slug}`, `/brand/{slug}`, `/bikes/{make}/{model}`, `/collections/{slug}`, `/about`, `/contact`, policy pages. Noindex: `/search`, `/cart`, `/checkout`, `/checkout/confirmation/{order}`, `/track`, `/wishlist`, `/login`, `/enquiry/{slug}`, all `/account/*`, all `/admin/*`. Dynamic sitemap replaces V1's hardcoded one (products/categories/brands/bikes/collections/static, with `lastmod`).

## 3. Navigation
Primary mega-menu (depth ≤2): Shop (categories) · Brands · Shop by Bike · Collections · Offers · About · Contact. Utility: Search · Wishlist · Account · Cart. Mobile: bottom tab bar + accordion drawer (≤2 taps to a category). Footer = sitewide internal-linking hub (categories, brands, popular bikes, customer service, policies).

## 4. Taxonomies
- **Product categories:** 2-level tree (parent→child), each with globally-unique flat slug. Every product has exactly **one primary category** (anchors breadcrumb + canonical) + optional secondary categories (discovery only).
- **Brands:** first-class (authentic-brand trust + brand search intent).
- **Vehicle fitment (R4):** Make → Model → (optional Year/Generation). Many-to-many product↔model; `universalFit` flag for fits-all products. Powers "R15 accessories" + PDP "fits your bike".
- **Collections:** curated/editorial, distinct from categories (see table in §7 of working notes).

## 5. Category vs Collection
Categories = taxonomic, permanent, in nav + breadcrumb, core keyword targets. Collections = curated, often temporal, in nav (Collections) but NOT breadcrumb. Product canonical is always the PDP, never a listing.

## 6. Search Taxonomy
Global search → `/search?q=` (noindex). Autocomplete across products/categories/brands/bike-models (each routes to its canonical page). Facets: category, brand, price, rating, availability, attributes (size/color/certification/fitment). Atlas Search synonyms: model aliases, brand abbreviations, category synonyms. **All multi-facet/sort/price/availability combos noindex,follow + canonical to clean parent (R6).**

## 7. Breadcrumbs
`BreadcrumbList` schema everywhere. PDP follows product's single **primary category**: Home › Category › Subcategory › Product. Category: Home › Parent › Category. Brand: Home › Brands › Brand. Bike: Home › Shop by Bike › Make › Model. Collection: Home › Collections › Collection.

## 8. Internal Linking
Hub-and-spoke: categories + bike models are hubs, PDPs are spokes; every PDP reachable from ≥1 hub + sitemap. PDP links: breadcrumb · related (same primary cat) · same-brand · compatible bikes · compatible accessories · reviews. Category/brand/bike/collection pages cross-link per the strategy. PDP + category pages include reserved linking seams to future `/guides`.

## 9. Admin IA (RBAC + 2FA, R9)
Dashboard (with Notification badge) · Catalog (Products, Categories, Brands, Bikes/Fitment, Collections) · Inventory · Orders (Orders, manual Fulfillment & Tracking, Returns) · **Notification Center** · Customers · Enquiries · Reviews (moderation + feature) · Marketing (Coupons, Offers/Banners) · Content (CMS) · Reports · **Settings (incl. Settings → Shipping)**. Roles: Super Admin · Store Manager · Inventory Manager · Order Manager · Content Manager · Customer Support. Least-privilege; refunds + Settings tightly gated + audited. *(Manual fulfillment — no Shiprocket/courier API.)*

## 10. CMS IA
Homepage Builder (ordered sections) · Navigation/Menu · Banners & Carousel · Featured Reviews · Media Library (Cloudinary) · Collections · Static Pages (about/contact/policies/FAQ). Every CMS entity exposes SEO fields + indexable toggle.

## 11. Redirect Strategy (V1 → V2) — MANDATORY
| V1 | V2 | Type |
|---|---|---|
| `/` | `/` | — |
| `/store` | `/store` | kept |
| `/category/:slug` | `/c/:slug` | 301 |
| `/product/:ObjectId` | `/products/:slug` | 301 (id→slug resolver, 1:1, **no 404** — critical) |
| `/about`, `/contact` | same | — |
| `/orders`, `/orders/:id` | `/account/orders[/:id]` | 301 |
| `/register` | `/login` | 301 |
| `/admin/*` | `/admin/*` | — (noindex) |
Global: http→https, www→non-www, trailing-slash strip, lowercase. **Slug-history store** preserves every old product/category slug with automatic 301 (→ Stage 4).

## 12. Content Relationships (conceptual)
Product →primary→ Category (1); →also-in→ Category (0..n); →by→ Brand (1); →fits→ VehicleModel (0..n, m:n) or universalFit; →in→ Collection (0..n); →has→ Variant/SKU (1..n, stock+price); →has→ Review (0..n). Category →parent→ Category (≤2 deep). VehicleMake →has→ VehicleModel. Order →contains→ Product/SKU snapshot (1..n), keyed to email+phone (R1). User →places→ Order. Review →by→ User, requires delivered Order containing Product. Coupon →applies→ Product|Category|Order|First-Order.

## 13. Self-Review (IA + SEO) — completed before approval
12 risks audited and resolved: flat-URL/breadcrumb anchoring (primary category), faceted crawl traps (R6 rules), thin curated pages (inventory threshold), id→slug migration (1:1 301), variant/sort/pagination duplicates (canonical), search noindex, category/collection ambiguity, orphan PDPs (hub-and-spoke + sitemap), mega-menu depth (≤2), missing policy pages (added), guest identity (R1 track+claim), nesting brittleness (flat slugs). No structural blockers. Editorial/blog deferred to Phase 2 (namespaces reserved).

---
*End of Stage 3 — Information Architecture. 🔒 LOCKED 2026-06-30. Next: Stage 4 — Database Design.*
