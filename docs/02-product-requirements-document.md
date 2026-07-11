# MotoPark V2 — Product Requirements Document (PRD)

**Status:** 🔒 LOCKED (Stage 2) · Source of truth for all subsequent stages
**Date approved:** 2026-06-30 · **Amended:** 2026-07-04 (manual fulfillment + React/Vite stack)
**Scope summary:** Premium, mobile-first, SEO-first motorcycle e-commerce platform — **one showroom, one warehouse (Visakhapatnam), Pan-India online sales, manually fulfilled by the store owner.**

> This document is subordinate to the approved BRD and authoritative over every later stage. Any future decision that conflicts with this PRD must be discussed and re-approved before implementation.

---

## 1. Architecture Principles (FIRM)

MotoPark V2 is designed for **the business that actually exists today**, not a hypothetical future one.

**Business profile:** one showroom · one warehouse · one owner · one inventory · Pan-India online shipping · **internal manual fulfillment.**

**Do NOT design for:** multi-store · multi-warehouse · multi-tenant · marketplace · enterprise abstractions · shipping aggregators.

If MotoPark expands in the future, we will perform a **controlled migration** rather than carry unnecessary complexity now.

**Stack (FINAL):** React 19 + Vite + JavaScript + React Router (frontend) · Node.js + Express.js (backend) · MongoDB (Atlas). SEO handled with React best practices (react-helmet-async, dynamic sitemap.xml, robots.txt, structured data, semantic HTML, canonical URLs, performance/CWV budgets, optional prerendering for key pages).

**Only these abstraction layers are kept — because they provide immediate value:**
- Authentication (provider-pluggable)
- Payments (provider-pluggable)

**No other speculative abstractions.** **Shipping is internal** — a backend-calculated flat/free-over-threshold charge and manual owner fulfillment; there is **no shipping-provider abstraction and no third-party shipping/courier API.** Any abstraction not on this list must justify itself against simplicity, maintainability, and performance.

---

## 2. Purpose & Success

**Product:** A premium e-commerce platform for motorcycle gear, accessories, and parts, with a future-ready **enquiry lane** for high-value bikes / custom builds.

**Success metrics — WORKING TARGETS (revisit post-launch with real analytics):**

| Metric | Working target |
|---|---|
| Conversion rate (visit → order) | ≥ 1.5% at launch, ≥ 2.5% by month 12 |
| Mobile share of orders | 70%+ |
| Core Web Vitals (mobile p75) | LCP < 2.5s · INP < 200ms · CLS < 0.1 |
| Organic traffic share | ≥ 35% by month 12 |
| Repeat purchase rate | ≥ 20% by month 12 |
| Checkout abandonment | < 65% |

---

## 3. Personas
1. **The Enthusiast (primary)** — spec-driven, brand-conscious, higher ticket.
2. **The Everyday Rider (secondary)** — first helmet / basic gear, price-aware, mobile.
3. **Showroom Staff (operator)** — non-technical; needs error-proof product/order/inventory management **and manual fulfillment tools**.
4. **Owner / Admin (operator)** — technical config, integrations, CMS, role management.

Brand principles: premium identity · simple shopping · fast discovery · clear specs · authentic brands · **trust before discounts.**

---

## 4. Scope

### 4.1 In scope (MVP / launch)
- **Catalog:** products with variants (size/color/compatibility), rich specs, authentic-brand attribution, categories, collections
- **Discovery:** MongoDB Atlas Search — autocomplete, typo tolerance, brand/category search, attribute + price filtering, motorcycle-specific relevance
- **PDP:** gallery, variants, specs, stock status, reviews, featured reviews, related products, structured data
- **Cart & Wishlist:** no-login add-to-cart; wishlist works without login, merged on login
- **Checkout (guest-first):** auth required only at order placement; address, **backend-calculated shipping charge (flat/free-over-threshold)**
- **Payments:** **Prepaid only via Razorpay.** COD is OUT of scope (see §4.2); the order model's `payment.method` field keeps it addable later without architectural change
- **Auth:** Google Sign-In, Email OTP, Mobile (SMS) OTP — modular/pluggable
- **Orders:** placement, confirmation, status lifecycle, tracking page, email notifications, GST invoice, **printable packing slip + invoice**
- **Manual fulfillment:** admin verifies → packs → prints packing slip/invoice → hands to courier of choice → records courier name + tracking number → status transitions
- **Notification Center (admin, internal):** New Order · Low Stock · Payment Successful · Return Request · Contact Enquiry (read/unread, timestamp, related order; priority future)
- **Returns/Exchanges:** customer-initiated, admin-managed, **manual return handling** (no courier API)
- **Reviews:** verified-purchaser only, post-delivery, 1–5★ + text, admin moderation, self-edit, **admin can feature reviews on homepage & PDP**
- **Coupons:** basic engine (see §5.9)
- **Accounts:** profile, addresses, order history, reviews, wishlist
- **CMS/Admin (role-based):** products, inventory, orders, returns, banners/homepage builder, navbar, coupons/promotions, media, reports, **Settings → Shipping**, notification center
- **Enquiry lane (Lane B):** product flagged `enquiry`/quote → structured enquiry form → admin enquiry list + email alert
- **SEO:** semantic HTML, react-helmet-async meta, dynamic sitemap, structured data, canonical URLs, clean slugs, V1→V2 redirect map
- **NFRs:** WCAG AA, CWV targets, security hardening, GA4 analytics

### 4.2 Out of scope (explicitly deferred)
Multi-store / multi-warehouse / multi-tenant / marketplace / location-based inventory · **shipping aggregators / courier APIs / auto label generation / auto serviceability** · **Cash on Delivery (prepaid-only via Razorpay; COD re-addable later without architectural change)** · Next.js / SSR framework · AWS EC2/RDS · Lane B online deposit · review photos (phase 2), videos/votes (future) · AI features · loyalty/subscriptions/gift cards/financing · native apps · multi-language/currency.

### 4.3 Assumptions
GST invoicing at launch · GA4 · structured data (Product/Offer/Breadcrumb/Review) · Cloudinary media · Resend email · new SMS provider for mobile OTP · ₹/English only.

---

## 5. Functional Requirements

### 5.1 Authentication
Browse/search/cart/wishlist with **no login**; auth required **only before placing the final order**. Launch providers: Google Sign-In · Email OTP · Mobile OTP (preferred). Modular for more later. Never force account creation before shopping. *(SMS OTP needs a new provider; Resend is email-only.)*

### 5.2 Catalog & Product
Product: title, slug, brand, category, collections, description, spec table, images, variant matrix (attribute → SKU → price/stock), status (`buyable` | `enquiry`), SEO meta. **Stock is a simple per-SKU integer (single warehouse).**

### 5.3 Search & Filter
MongoDB Atlas Search — autocomplete, typo tolerance, brand/category/attribute/price filtering, motorcycle-specific relevance (`"MT Helmet"`, `"Axor Apex"`, `"R15 accessories"`, `"Himalayan crash guard"`). No dedicated search engine. Scale: 500–1,000 SKUs → 2,000–5,000 in 12 months.

### 5.4 Cart & Checkout
Guest cart merged on login. Flow: cart → identity (guest / sign-in) → address → **backend computes shipping (flat/free-over-threshold)** → payment (Razorpay, prepaid only) → confirm. **Auth gate immediately before payment.** Checkout displays: Cart Total · Shipping Charge · Free-Shipping indicator (if eligible) · Final Payable Amount. **The backend is authoritative for shipping; the frontend never computes it.**

### 5.5 Orders & Fulfillment (manual)
Lifecycle: `pending → confirmed → packed → dispatched → delivered` (+ `cancelled`, `returned`). Fulfillment is **manual and internal**: on paid order, a New-Order notification fires → admin verifies → packs → prints packing slip and/or invoice → hands parcel to a courier of their choice (no API) → records **courier name + tracking number** → status advances Packed → Dispatched → Delivered. Customer sees status, courier, tracking number, and delivery timeline in **My Orders**; email at key transitions.

### 5.6 Shipping & Fulfillment (internal, no aggregator)
**No shipping aggregator, courier API, label generation, or serviceability API.** Shipping **charge is calculated by the backend**: flat **₹100** (default) per order, **free above ₹2,000** — all configurable in **Admin → Settings → Shipping**: `Flat Shipping Charge`, `Free Shipping Threshold`, `Enable/Disable Free Shipping`. Changeable without code. Frontend never decides shipping.

### 5.7 Returns / Exchanges (manual)
Eligible window post-delivery; customer request → admin approval → **manual return handling** (customer ships back or owner arranges pickup) → refund via Razorpay refund API, or exchange. Stock restocked via `inventoryMovements`.

### 5.8 Reviews
Verified purchasers only, **after delivery**; 1–5★ + text; admin moderation; self-edit; **admin can feature reviews on homepage & PDP**. Eligibility = a `delivered` order containing the product. One editable review per (user, product). Aggregate rating on PDP + Review structured data. Trust > quantity.

### 5.9 Coupons (basic engine, MVP)
Percentage · flat · expiry · minimum order amount · category · product · first-order. First-order = no prior order for that email/phone.

### 5.10 Accounts
Profile, address book, order history (with tracking), reviews, wishlist.

### 5.11 Admin (RBAC)
Roles: **Super Admin · Store Manager · Inventory Manager · Order Manager · Content Manager · Customer Support** — scoped to relevant modules. Error-resistant forms, confirmations on destructive actions, audit of key changes. CMS: homepage builder, banners, navbar, offers/coupons, media, featured reviews, **Settings → Shipping**, **Notification Center**.

### 5.12 Enquiry Lane (Lane B)
Enquiry-type product → "Request a quote / enquire" form (name, contact, message, product ref) → stored → admin enquiry list + email alert. No online deposit at launch.

### 5.13 Notification Center (admin, internal service)
An **internal application service** (NOT a third-party notification provider) that replaces shipping integrations as the admin's operational hub. Generates in-app notifications: **🔔 New Order · 🔔 Low Stock · 🔔 Payment Successful · 🔔 Return Request · 🔔 Contact Enquiry.** Each supports **Read / Unread, timestamp, related order** (priority = future). The admin dashboard shows an unread badge (e.g. "🔔 1 New Order"). Customer-facing transactional email continues via Resend.

---

## 6. Non-Functional Requirements
- **Performance / CWV:** Vite build, route-level code splitting, image optimization, performance budgets → "Good" CWV at mobile p75.
- **SEO (React best practices):** semantic HTML, **react-helmet-async** per-route meta/OG, **dynamic sitemap.xml**, **robots.txt**, canonical URLs, schema.org structured data, clean slugs, **V1→V2 redirect map**; consider prerendering/SSG for key marketing/landing pages.
- **Accessibility:** WCAG **AA** — keyboard nav, focus management, contrast, `prefers-reduced-motion`.
- **Security:** input validation, rate limiting, secure auth, **Razorpay webhook signature verification**, no client-side secrets, OWASP basics.
- **Maintainability:** JavaScript (React 19 + Vite + React Router; Node + Express), component-driven design system, clear module boundaries, adapter layers only for **auth + payments**.
- **Motion:** purpose-driven only; respects reduced-motion; never blocks interaction. Priority: **Usability > Performance > Accessibility > Visual effects.**

---

## 7. Integrations & Dependencies
Razorpay (payments + refunds) · Cloudinary (media) · Resend (email) · **new SMS OTP provider** · Google OAuth · MongoDB Atlas (+ Atlas Search) · GA4 · **internal Notification Service** (in-app admin notifications — not a third party). **No Shiprocket / no shipping aggregator / no courier API.**

---

## 8. AI
**No AI features in the MVP.** Expose clean APIs so future AI is easy to add.

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| SMS OTP cost / deliverability in India | Evaluate MSG91 / Fast2SMS vs Twilio; Email OTP + Google fallback |
| Manual fulfillment human error (wrong tracking/status) | Clear order UI, required fields on dispatch, status guardrails, audit log |
| SEO without SSR framework | Rigorous react-helmet-async, structured data, prerender key pages, strong CWV, redirect map |
| Reviews gated on delivery → thin at launch | Acceptable per "authenticity > quantity"; honest early-buyer outreach |
| Prepaid-only may lose some COD-preferring customers | Accepted trade-off (simpler ops, no fake orders, better cash flow); COD re-addable later if data demands it |

---

## 10. Open Items (non-blocking)
- Success metrics (§2) are working targets.
- ~~COD keep vs prepaid-only~~ — **RESOLVED 2026-07-04: COD is OUT of scope; prepaid only (Razorpay).** Reasons: simpler order management, eliminates fake COD orders, reduces return/cancellation risk, better cash flow. System designed so COD can be added later (payment method enum + confirm-time stock decrement path) without major changes.

---

## 11. Principal Architect Review — Accepted Refinements (incorporated)
**R1 — Unified identity for guest orders.** Orders keyed to **email + phone**; guest orders **claimable** via OTP → unlock history/tracking/review-eligibility; resolves first-order coupon detection.
**R2 — Server-authoritative payments & idempotency.** Order confirmation via **verified Razorpay webhook**, not browser callback; idempotent order/payment mutations; reconciliation job for dropped webhooks.
**R3 — Oversell prevention.** Atomic conditional stock decrement on verified payment + `inventoryMovements` in same transaction. *(If COD is ever added: decrement at order confirmation.)*
**R4 — Vehicle fitment first-class.** make → model → (year) taxonomy powering model search + "fits your bike".
**R5 — GST modeling.** Per-product HSN + rate; CGST+SGST intra-AP vs IGST inter-state; carried to refunds.
**R6 — Faceted-navigation SEO rules.** Indexable vs `noindex,follow`; canonical to parent.
**R7 — Observability for money & order paths.** Error monitoring + alerting on payment / order / notification failures; structured logging.
**R8 — Data privacy / DPDP.** Consent capture, privacy policy, account-deletion = anonymize + retain invoices (legal hold).
**R9 — Elevated admin auth.** 2FA for all admin accounts; refunds role-gated + audited.

### Tracked but deferred
- **R10** — Partial-return restock rules. *(COD refund capture obsolete — COD out of scope.)*
- **R11** — Coupon stacking / per-user limits.
- **R12** — WhatsApp/SMS **customer** order-update notifications (email-only at MVP).
- **R13** — Wishlist merge semantics.

---
*End of Stage 2 — PRD. 🔒 LOCKED 2026-06-30 · amended 2026-07-04 (manual fulfillment + React/Vite). Every Shiprocket and Next.js reference removed.*
