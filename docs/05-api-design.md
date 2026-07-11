# MotoPark V2 — API Design

**Status:** 🔒 LOCKED (Stage 5) · Authoritative API + application architecture
**Date approved:** 2026-06-30 · **Amended:** 2026-07-04 (React+Vite+Express stack, manual fulfillment, notification center)

> Design only — endpoint contracts + conventions, no implementation.

---

## 1. Application Architecture (FINAL)
- **Frontend:** React 19 + Vite + JavaScript + React Router — a client-rendered SPA served as static assets via CDN.
- **Backend:** Node.js + Express.js REST API (separate service).
- **Database:** MongoDB (Atlas + Atlas Search).
- **Business logic** lives in Express service/domain modules (audited/ported from the V1 spine).
- **REST + JSON**, versioned `/api/v1`.
- **Auth transport:** httpOnly + Secure + SameSite cookies (cross-origin frontend↔API handled via CORS with credentials); **Bearer reserved for future native/mobile**.
- **Razorpay webhook = server-authoritative source of truth for payments** (R2).
- **Shipping is internal** — backend computes the charge from `storeConfig.shipping`; **no shipping/courier API, no aggregator, no webhooks from a shipping provider.**
- **Only two adapter layers:** Auth, Payments. No other speculative abstractions.
- **SEO:** react-helmet-async per-route meta, dynamic `sitemap.xml`, `robots.txt`, structured data, canonical URLs, semantic HTML; prerender key pages if needed.

## 2. Conventions
- Versioned `/api/v1`; resource-oriented REST.
- **Pagination:** page-based (`?page=&limit=`) + optional cursor for "load more".
- Filtering/sorting via explicit query params (IA §6 faceting; multi-facet `noindex`).
- **Idempotency (R2):** `Idempotency-Key` header on order-create + payment-confirm.
- Error envelope `{ error: { code, message, fields? } }`.
- Input validation at every handler edge.
- Rate limits tiered: global · OTP · payment · upload.
- Caching: catalog GET responses via CDN/HTTP cache headers (`s-maxage`, SWR); cart/account/admin `no-store`.
- Observability (R7): structured logs + alerting around payment / order / notification handlers.

## 3. Public Catalog (cacheable)
`GET /api/v1/products` · `/products/{slug}` · `/categories[/{slug}]` · `/brands[/{slug}]` · `/bikes[/{make}[/{model}]]` · `/collections[/{slug}]` · `/search?q=` · `/search/autocomplete?q=` · `/facets`.

## 4. Auth (R1 guest-first, pluggable)
`POST /api/v1/auth/otp/request` · `/auth/otp/verify` · `GET/POST /auth/google` · `POST /auth/claim` · `GET /auth/session` · `POST /auth/logout`.

## 5. Cart · Wishlist · Checkout · Orders
- `GET/POST/PATCH/DELETE /api/v1/cart[/items/{id}]` (prices re-resolved live) · `POST /cart/merge`
- `GET/POST/DELETE /api/v1/wishlist`
- `POST /api/v1/checkout/quote` — **backend computes shipping** (flat/free-over-threshold from `storeConfig.shipping`), coupon, tax, and returns Cart Total · Shipping Charge · Free-Shipping flag · Final Payable. *(Replaces the removed serviceability/rate endpoints.)*
- `POST /api/v1/orders` — create order (`Idempotency-Key`; auth gate)
- `POST /api/v1/payments/razorpay/order` — create Razorpay order
- `POST /api/v1/webhooks/razorpay` — **signature-verified source of truth**: confirm order, atomic stock decrement (R3) + `inventoryMovements`, **generate notifications** (new-order, payment-successful)
- `GET /api/v1/orders[/{id}]` — user history/detail (status, courier, tracking, timeline)
- `POST /api/v1/orders/track` — guest tracking (order#+email/phone OTP)
- `POST /api/v1/orders/{id}/return` — request return (manual handling)

## 6. Reviews · Enquiries · Account
`GET /api/v1/products/{slug}/reviews` · `POST/PATCH /reviews` (eligibility: delivered order) · `POST /enquiries` (Lane B → notification) · `GET/PATCH /account/profile` · `/account/addresses` · `DELETE /account` (DPDP anonymize, retain orders — R8).

## 7. Admin (RBAC + 2FA, audited — R9)
Base `/api/v1/admin/...`. Catalog (`products`, `categories`, `brands`, `bikes`, `collections`), `inventory` (+ `inventoryMovements`), `customers`, `reviews` (moderate/feature), `enquiries`, `coupons`, `cms/*`, `reports`, `users/roles`, and **`settings`** (incl. **Settings → Shipping**: flatShippingCharge, freeShippingThreshold, freeShippingEnabled — Super only). All mutations → `auditLog`.

**Order fulfillment + notifications (new/changed):**
| Method · Path | Purpose |
|---|---|
| `GET /api/v1/admin/notifications` | list notifications (+ unread count for badge) |
| `PATCH /api/v1/admin/notifications/{id}/read` | mark notification read |
| `GET /api/v1/admin/orders[/{id}]` | order list / full detail (customer, address, contact, items, variants, payment, total, status) |
| `PATCH /api/v1/admin/orders/{id}/status` | advance status (`packed`/`delivered`/`cancelled`/…) |
| `PATCH /api/v1/admin/orders/{id}/dispatch` | mark dispatched (sets dispatchDate) |
| `PATCH /api/v1/admin/orders/{id}/tracking` | set `courierName` + `trackingNumber` (+ expectedDeliveryDate) |
| `GET /api/v1/admin/orders/{id}/print` | printable **packing slip** (logo, order id, customer, address, contact, items, qty, payment status, date, total) |
| `GET /api/v1/admin/orders/{id}/invoice` | printable **GST invoice** (same header + tax breakup) |
| `POST /api/v1/admin/orders/{id}/return` | approve/process return + refund (role-gated) |

*(Document generation is server-side print-ready HTML/PDF; optional future QR code.)*

## 8. SEO & Infra
`GET /sitemap.xml` (dynamic) · `/robots.txt` · redirects resolver (consults `redirects` on 404-candidates → 301) · `/api/v1/health` · `/api/v1/version`.

## 9. Webhooks & Adapters
- **Razorpay** (payments/refunds, signature-verified, idempotent) — behind the Payments adapter.
- **Auth** providers (Google/OTP) — behind the Auth adapter.
- **Notification Service** — **internal** application service (emits in-app admin notifications + triggers Resend emails). No third-party notification/shipping provider.
- ❌ Removed: all Shiprocket endpoints, serviceability, rate calc, shipment creation, tracking webhooks.

## 10. Caching & Performance
Catalog GETs: CDN + HTTP cache headers, revalidate-on-write (admin save → cache purge). Cart/checkout/account/admin: `no-store`. Search/autocomplete: short TTL. SPA assets: long-cache/hashed; SEO via react-helmet-async + prerender where useful.

## 11. Self-Review
REST over GraphQL · **two adapters only (Auth, Payments)** — shipping is internal, no provider abstraction · cart prices + shipping re-resolved server-side (frontend never decides shipping) · webhook + idempotency prevents double-charge · admin surface behind 2FA + audit · `/v1` cheap insurance for future mobile · search short-TTL + noindex · notifications are an internal in-app center. No structural problems.

---
*End of Stage 5 — API Design. 🔒 LOCKED 2026-06-30 · amended 2026-07-04. All Shiprocket endpoints and Next.js references removed; stack is React+Vite+Express.*
