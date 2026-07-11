# MotoPark V2 — Database Design

**Status:** 🔒 LOCKED (Stage 4) · Authoritative DB architecture
**Date approved:** 2026-06-30 · **Amended:** 2026-07-04 (manual fulfillment, internal shipping, notification center)
**Database:** MongoDB Atlas (+ Atlas Search), single connection, single store.

> Design only. Conceptual document shapes + modeling decisions, not code.

---

## 1. Modeling Principles
1. Model for access patterns, not normalization. Embed what's read together; reference what's large/shared/independent.
2. **Money = integer paise.** Never floats.
3. **Orders store snapshots, not live references.**
4. Soft-delete catalog (`status`/`isActive`); never hard-delete anything an order references.
5. Denormalize read-hot aggregates (rating, priceRange); recompute on write.
6. One MongoDB. No microservice DBs, event-sourcing, CQRS, or price-history.

---

## 2. Collections (22)
```
Catalog:     products · categories · brands · vehicleMakes · vehicleModels · collections
Commerce:    carts · wishlists · orders · coupons · enquiries
Inventory:   inventoryMovements
Identity:    users · adminUsers · otpTokens
Messaging:   notifications  (internal admin notification center)
Content/CMS: homeLayout · banners · navbarConfig · media · storeConfig · videoShowcase
Reviews:     reviews
Infra:       redirects · auditLog · searchSynonyms
```

---

## 3. Catalog

### 3.1 products
`_id` · `slug` (unique) · `title` · `description` · `brand` (ref) · `primaryCategory` (ref, required) · `categories[]` · `collections[]` · `compatibleModels[]` (R4) · `universalFit` (bool) · `images[]` · `specs[]` · `attributes{}` (defined set) · **`variants[]`** (embedded) · `status` (`buyable`|`enquiry`) · `hsnCode` · `gstRate` · `priceRange{min,max}` (denormalized) · `rating{avg,count}` (denormalized) · `seo{}` · `isActive` · timestamps.

### 3.2 variants (embedded)
`sku` · `attributes{}` (defined set) · `price` · `mrp` (paise) · `stock` (int) · `image` · `isActive`.
**Stock (R3):** atomic conditional `$inc` decrement at **verified payment success** (filter `stock >= qty`); every decrement writes `inventoryMovements` in the same transaction. *(If COD is ever added later: decrement at order confirmation — same mechanism, different trigger.)*

### 3.3 categories
`_id` · `slug` (unique) · `name` · `parent` (ref, ≤2 deep) · `description` · `image` · `seo{}` · `sortOrder` · `isActive`.

### 3.4 brands
`_id` · `slug` (unique) · `name` · `logo` · `description` · `seo{}` · `isActive`.

### 3.5 vehicleMakes / vehicleModels (R4)
makes: `_id` · `slug` · `name` · `logo`. models: `_id` · `slug` · `make` (ref) · `name` · `years?` · `seo{}` · `isActive`.

### 3.6 collections
`_id` · `slug` (unique) · `name` · `description` · `type` (`manual`|`automatic`) · `productIds[]` or `rules` · `seo{}` · `schedule{}` · `isActive`.

---

## 4. Identity (R1, R9)
- **users:** `_id` · `email` · `phone` · `name` · `authProviders[]` · `addresses[]` (embedded) · timestamps. Orders keyed by email+phone; claim links on login.
- **adminUsers:** `_id` · `email` · `passwordHash` · `name` · `role` (6 RBAC roles) · `twoFactor{enabled,secret}` · `isActive` · `lastLoginAt`.
- **otpTokens:** `_id` · `identifier` · `channel` · `codeHash` · `expiresAt` (TTL) · `attempts`.

---

## 5. Commerce
- **carts:** `_id` · `key` (guest token | userId) · `items[]` ({productId, sku, qty, addedAt}) · `updatedAt` (TTL). Prices re-resolved live at checkout.
- **wishlists:** `_id` · `userId` · `productIds[]`.
- **orders:** `orderNumber` (unique, e.g. `MP1025`) · `userId` (nullable) · `email` · `phone` (always — R1) · `items[]` (snapshot: productId, sku, title, image, price, hsnCode, gstRate, qty) · `shippingAddress`/`billingAddress` (snapshots) · `amounts{subtotal, discount, **shippingCharge**, tax{cgst,sgst,igst}, total}` (paise, R5) · `coupon{}` (snapshot) · `payment{method, status, razorpayOrderId, paymentId, signature}` · `idempotencyKey` (unique, R2) · `status` (`pending → confirmed → packed → dispatched → delivered` + `cancelled`, `returned`) · `statusHistory[]` · **`shipment{ courierName, trackingNumber, dispatchDate, expectedDeliveryDate, deliveredDate }`** · `returns[]` · timestamps.
  **Shipping charge:** computed by backend from `storeConfig.shipping` (flat + free-over-threshold) at checkout; snapshotted on the order. **No Shiprocket/AWB/label/courier-API fields.**
  **GST (R5):** seller state AP; ship-to AP → CGST+SGST, else IGST; snapshotted.
- **coupons:** `code` (unique) · `type` (`percent`|`flat`) · `value` · `minOrderAmount` · `appliesTo` (`all`|`category`|`product`|`first-order`) · `targetIds[]` · `startsAt` · `expiresAt` · `usageLimit` · `perUserLimit` · `usedCount` · `isActive`.
- **enquiries (Lane B):** `_id` · `productId` · `name` · `email` · `phone` · `message` · `status` · `createdAt`.

---

## 6. Inventory ledger
**inventoryMovements** — append-only: `_id` · `productId` · `sku` · `delta` (±int) · `reason` (`sale`|`restock`|`return`|`manual-adjustment`|`cancellation`) · `refType`/`refId` · `stockAfter` · `by` · `note` · `createdAt`. Written in the same transaction as stock-affecting writes; low-stock threshold breach triggers a `low-stock` notification.

---

## 7. Notification Center (internal, admin)
**notifications** — in-app admin notification center (replaces shipping integrations as the ops hub; an **internal service**, not a third-party provider):
`_id` · **`title`** · **`message`** · **`type`** (`new-order`|`low-stock`|`payment-successful`|`return-request`|`contact-enquiry`) · **`isRead`** (bool) · **`createdAt`** · **`relatedOrderId`** (nullable ref) · `priority?` (future).
- Generated by domain services on: order paid, stock ≤ threshold, payment verified, return requested, contact enquiry submitted.
- Admin dashboard reads unread count for the badge; PATCH marks read.
- Customer-facing transactional email remains via Resend (separate concern).

---

## 8. Reviews
`_id` · `productId` · `userId` · `orderId` · `rating` (1–5) · `title` · `body` · `status` (`pending`|`approved`|`rejected`) · `isFeatured` · `createdAt` · `editedAt`. Eligibility = delivered order containing product; unique `(userId,productId)`; on approve recompute `products.rating`.

---

## 9. Infrastructure & Config
- **storeConfig** (singleton) — includes **`shipping{ flatShippingCharge (paise, default 10000 = ₹100), freeShippingThreshold (paise, default 200000 = ₹2,000), freeShippingEnabled (bool) }`**, seller state (AP), maintenance mode, policy content. Editable via Admin → Settings.
- **redirects** — `fromPath` (unique) · `toPath` · `statusCode` · `reason` (`slug-change`|`v1-migration`) · `createdAt`.
- **auditLog** (R9) — `adminUserId` · `action` · `entityType` · `entityId` · `before`/`after` · `at`.
- **searchSynonyms** — Atlas Search synonym maps.
- **CMS config (reused from V1):** homeLayout, banners, navbarConfig, media, videoShowcase.

---

## 10. Atlas Search
Single index over products (`title`, `brand.name`, `category.names`, `attributes`, `compatibleModels.names`) with synonyms + autocomplete (edge-gram). No Elasticsearch/Algolia.

---

## 11. Key Indexes
products: `slug` u · `primaryCategory` · `categories` · `brand` · `compatibleModels` · `universalFit` · `isActive,priceRange.min` · `rating.avg`.
orders: `orderNumber` u · `idempotencyKey` u · `email,phone` · `userId` · `status` · `createdAt`.
notifications: `isRead,createdAt` · `type` · `relatedOrderId`.
reviews: `(userId,productId)` u · `productId,status` · `isFeatured`.
inventoryMovements: `productId,sku,createdAt` · `refType,refId`.
coupons: `code` u. redirects: `fromPath` u. categories/brands/collections/vehicleModels: `slug` u. otpTokens/carts: TTL. users: `email`, `phone`.

---

## 12. Anti-Over-Engineering Guardrails (deliberately NOT built)
No multi-warehouse stock · no separate SKU collection · no EAV · no price-history · no event-sourcing/CQRS · no stock reservation/saga · **no shipping aggregator / courier API / label / serviceability** · notifications is an internal in-app center, not a broker; inventoryMovements is a ledger, not an event bus.

---

## 13. Refinement → DB traceability
R1 email+phone identity · R2 idempotencyKey · R3 atomic `$inc` + inventoryMovements · R4 fitment models · R5 HSN/GST snapshot · R8 anonymize-on-delete + retain orders · R9 adminUsers.twoFactor + auditLog.

---

## 14. Locked design decisions
- Variants embedded; defined attribute set.
- Stock decrements on verified payment success (atomic; no reservation).
- **Payments: prepaid only via Razorpay (COD out of scope, 2026-07-04).** `payment.method` remains an enum so COD can be added later without schema change.
- Account deletion = anonymize PII, retain orders.
- **Shipping charge = backend-computed from `storeConfig.shipping`; no third-party shipping fields.**
- **Fulfillment shipment data = manual `courierName` + `trackingNumber` + dates.**

---
*End of Stage 4 — Database Design. 🔒 LOCKED 2026-06-30 · amended 2026-07-04. All Shiprocket-specific fields removed.*
