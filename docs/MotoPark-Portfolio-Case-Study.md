# MotoPark — Engineering Case Study

> A premium motorcycle-gear e-commerce platform (storefront + custom admin CMS) built on the MERN stack.
> This document is derived **entirely from repository evidence**. Where a claim could not be confirmed from the code, it is explicitly marked **"Unable to verify from repository."**

**Production domain (from code):** `https://motoparkvizag.in`
**Repository layout:** monorepo with two deployable apps — `backend/` (Express API) and `motopark-web/` (React SPA).

---

## 1. Executive Summary

MotoPark is a full-stack e-commerce application for a Visakhapatnam-based motorcycle-gear retailer. It consists of:

- A **customer-facing React 19 single-page application** (`motopark-web/`) with a premium, animation-rich storefront: hero carousels, video showcases, product browsing, filtering, search, cart, wishlist, guest + authenticated checkout, and Razorpay online payments.
- A **bespoke admin CMS** (under `motopark-web/src/admin/`) that lets the store owner manage products, inventory, orders, categories, collections, offers, the navbar, carousels, media, a video showcase, and a drag-and-drop **Home Builder** that controls the storefront's section layout.
- A **Node/Express + MongoDB (Mongoose) REST API** (`backend/`) covering auth (admin + user), products, orders, payments, cart/wishlist sync, and all CMS content models, hardened with Helmet, CORS allow-listing, rate limiting, input sanitization, and a Content-Security-Policy.

**Verifiable scale (counted from the repo):**
- Frontend: **80 `.jsx` files, 12 `.js` files, 56 `.css` files, ~19,500 lines** of JS/JSX under `motopark-web/src`.
- Backend: **~4,226 lines** of JS across **15 Mongoose models** and **17 route modules**.
- Media/asset libraries committed: brand logos (`public/brands/`), payment icons (`public/payments/`), a hero video (`public/videos/rider.mp4`).

The codebase shows a strong emphasis on **production hardening, caching, and performance** — most files carry detailed "FIXES APPLIED" headers documenting security and performance decisions, indicating an iterative hardening process.

---

## 2. Product Vision

From repository evidence (SEO copy in `motopark-web/index.html`, hero copy, email templates in `backend/controllers/userController.js`):

- Position MotoPark as the **"Best motorcycle gear store in Visakhapatnam"** selling helmets, jackets, gloves and riding gear.
- Deliver an **Apple-/luxury-retail-grade storefront experience** on the web: glassmorphism navbar, ambient orbs, parallax, scroll-reveal animations, video storytelling, smooth (Lenis) scrolling, and skeleton loaders for perceived performance.
- Be **installable and resilient** as a PWA (offline asset caching, auto-update, maintenance mode), targeting mobile-first Indian shoppers.
- Give a non-technical store owner **full self-service control** of the storefront's content and layout through a custom CMS, without code changes.

---

## 3. Problem Statement

Inferred from the feature set and code (not from an explicit written brief — the latter is **Unable to verify from repository**):

1. A local retailer needs an **online sales channel** with real online payments (Razorpay), not just a brochure site.
2. Off-the-shelf platforms don't give the desired **premium, fully-custom UI** or **fine-grained layout control**; hence a bespoke storefront + Home Builder.
3. The owner needs to **manage catalogue, inventory, and orders** themselves — driving the custom admin panel with inventory decrement, order status workflow, and CSV bulk product import.
4. Indian mobile shoppers on flaky networks need **fast loads and offline tolerance** — driving the multi-layer caching, PWA service worker, and skeleton-first rendering.
5. Catalogue with **color/size variants and per-variant stock** must be modeled correctly, including atomic stock decrement to avoid overselling.

---

## 4. Target Users

| Persona | Evidence |
|---|---|
| **Retail customers (guest)** | Guest cart/wishlist in `sessionStorage`; guest checkout supported in `orderRoutes.js` (`optionalAuth`) and `paymentRoutes.js`. |
| **Registered customers** | `userModel.js`, email+password and **email OTP** login (`userController.js`), profile, saved addresses, order history (`OrdersPage`, `AccountPage`). |
| **Store owner / admin** | Single env-credential admin (`ADMIN_EMAIL` / `ADMIN_PASSWORD_HASH`) with a full CMS under `/admin`. |
| **Mobile-first shoppers** | Dedicated mobile menu, floating bottom nav (`MobileBottomNav.jsx`), mobile filter drawer, PWA manifest, responsive breakpoints (`isMobile` at ≤768px). |

---

## 5. Business Goals

Inferred from concrete implementation details:

- **Convert online sales** via a frictionless 3-step checkout (Delivery → Payment → Review) with Razorpay.
- **Protect revenue integrity**: order totals are recomputed server-side from DB prices (`paymentController.js`, `orderController.js`) — the frontend amount is never trusted.
- **Prevent overselling**: atomic per-variant stock decrement with rollback on failure (`orderController.createOrder`).
- **Free-delivery incentive**: delivery is ₹0 for orders ≥ ₹2000, else ₹150 (`Checkout.jsx`).
- **Reduce operational load**: self-service CMS + CSV bulk import + idempotent order creation (60-second duplicate guard).
- **Maximize reach/SEO**: meta tags, Open Graph, Twitter cards, canonical URLs, JSON-LD product schema, sitemap, www→non-www redirect.

Revenue/traffic numbers themselves are **Unable to verify from repository.**

---

## 6. User Journey

Routes are defined in `motopark-web/src/App.jsx`:

1. **Landing (`/`)** → `Home.jsx` renders an ordered set of sections: `PremiumCarousel` (hero), `VideoShowcase`, New Arrivals slider, Highest-Selling/Featured spotlight, a `VerticalCarousel`, horizontal showcase, trending products, brand showcase, and "Why MotoPark". Home-only offer bar at top.
2. **Browse** → `/store` (`Store.jsx`): hero search, sticky toolbar (filter toggle, result count, sort, grid/list view), faceted filter panel (brand search, size pills, color swatches), URL-synced filters via `useSearchParams`, skeleton loaders, empty state.
3. **Category** → `/category/:slug` (`CategoryPage.jsx`).
4. **Product** → `/product/:id` (`ProductDetail.jsx`): 3-column layout (gallery / info / purchase box), color & size variant selection, stock-aware Add-to-Cart, wishlist, tabs (description/specs/care), EMI hint, related products, sticky mobile purchase bar, error boundary, JSON-LD.
5. **Cart** → `/cart`, **Wishlist** → `/wishlist`.
6. **Checkout** → `/checkout` (`Checkout.jsx`): validated address form (10-digit phone, 6-digit pincode, Indian state select), Razorpay create-order → checkout → signature verify → order persist; duplicate-order (409) handled; cart + product cache cleared on success.
7. **Auth** → `/login`, `/register` (`AuthPage.jsx`) — email/password and OTP.
8. **Account & Orders** → `/account`, `/orders`, `/orders/:id`.
9. **Static** → `/about`, `/contact`.

Cart/wishlist persist as **guest** (sessionStorage) and **merge into the user account on login** (`/cart/merge`, `/wishlist/merge`), then sync to the server with an 800ms debounce.

---

## 7. Admin Journey

Admin routes (`App.jsx`, guarded by `ProtectedRoute` which checks `adminToken` in localStorage):

1. **Login** → `/admin/login` (`AdminLogin.jsx`) → `POST /api/admin/login`. On success a JWT (`role: "admin"`, 24h) is stored as `adminToken`.
2. **Dashboard** → `/admin/dashboard` (`Dashboard.jsx`): KPI cards (revenue, orders, users, products), 30-day `SalesChart`, recent orders, top products.
   > ⚠️ Evidence note: the Dashboard fetches `/api/admin/stats`, `/api/admin/orders/recent`, `/api/admin/products/top`, but `backend/routes/adminRoutes.js` defines only `/login` and `/logout`. Those stats endpoints are **not implemented in the backend**, so the dashboard degrades gracefully (it uses `Promise.allSettled` + `res.ok` guards and falls back to zeros/empty lists). It also reads `order.totalPrice`/`stats.revenue`, whereas the order schema stores `total`. This is a real gap in the repo.
3. **Catalogue**: Products (`AdminProducts.jsx`, with `VariantEditor`, image upload, CSV bulk import), Inventory (`InventoryManager.jsx`), Collections, Categories.
4. **Storefront**: **Home Builder** (`HomeBuilder.jsx`, drag-and-drop section ordering via `@hello-pangea/dnd`), Carousel manager, Navbar manager, Offers, Media library, Video Showcase manager.
5. **Orders** → `/admin/orders` (`AdminOrders.jsx`): list/filter and update status through `PUT /api/orders/:id/status` (admin-only).
6. **Logout** → clears `adminToken`; backend `POST /api/admin/logout` revokes the token via an in-memory blacklist.

---

## 8. Complete Feature Breakdown

**Storefront**
- Hero **PremiumCarousel** (image, desktop/mobile variants) + **VerticalCarousel** (`source: "premium" | "vertical"` scoping in `carouselModel.js`).
- **VideoShowcase** (admin-configurable slides: src, poster, tag, headline lines, CTA, buy/explore links).
- Product listing with **faceted filtering** (brand, size, color), **search** (debounced, name+brand), **sort** (newest, price asc/desc), **grid/list** toggle.
- **Product detail**: variants, per-size stock, tabs, related items, EMI hint, ratings (static 4★/128 reviews — hardcoded display values), JSON-LD.
- **Cart** with stock-capped quantities; **Wishlist**; both guest-persisted and account-synced.
- **Checkout**: multi-step, validated, Razorpay; free-delivery threshold; COD shown but disabled.
- **Offer bar** (home only), **brand showcase**, **"Why MotoPark"**, **footer**.
- **Search overlay**, **page transitions**, **scroll-to-top**, **skeleton loaders**.

**Accounts**
- Email+password register/login; **email OTP** login via Resend; profile update; saved addresses (CRUD); order history & detail; order cancellation (restores stock).

**Admin CMS**
- Product CRUD with multi-variant editor and Cloudinary image upload; **CSV bulk import** (transactional); inventory management; orders dashboard with status workflow; categories; collections; offers; navbar editor; carousel manager (image + video upload); media library; video-showcase editor; **drag-and-drop Home Builder** with per-section settings.

**Platform**
- PWA (installable, offline caching, auto-update); **maintenance mode** (`VITE_MAINTENANCE_MODE`); **version-check force-update** across browsers incl. Safari iOS; Railway keep-alive ping; SEO (meta/OG/Twitter/canonical/sitemap/JSON-LD).

---

## 9. Technology Stack

**Frontend** (`motopark-web/package.json`)
- React **19.2**, React DOM 19, **React Router 7.13**, Vite **7.3**, `@vitejs/plugin-react`.
- **framer-motion 12** (animation), **@studio-freight/lenis** (smooth scroll), **lucide-react** (icons), **recharts** (admin charts), **react-countup** (KPI counters), **@hello-pangea/dnd** (drag-and-drop), **react-window** (virtualization), **react-swipeable** (touch), **react-helmet-async** (SEO head), **axios** (admin API client).
- **vite-plugin-pwa** + Workbox (service worker), ESLint 9 with react-hooks/react-refresh plugins.
- `socket.io` is listed as a dependency, but no usage was located in the inspected source — **its use is Unable to verify from repository.**

**Backend** (`backend/package.json`, `"type": "module"`, ESM)
- **Express 4.21**, **Mongoose 9.3** (MongoDB).
- **jsonwebtoken** (JWT), **bcryptjs** (hashing).
- **razorpay** (payments), **resend** (transactional email/OTP).
- **cloudinary** + **multer** + **multer-storage-cloudinary** (image/video uploads & CDN).
- **helmet**, **cors**, **express-rate-limit**, **express-mongo-sanitize**, **compression** (security/perf).
- **csvtojson** (bulk import), **dotenv**, **nodemon**.

**Infra / Deploy**
- Frontend on **Vercel** (`vercel.json` SPA rewrites + cache headers).
- Backend on **Railway** (referenced throughout: `APP_VERSION`, keep-alive ping, cold-start handling).
- **MongoDB Atlas** (connection string via `MONGO_URI`) — provider inferred; exact host **Unable to verify from repository.**
- **Cloudinary** for media CDN.

---

## 10. Folder Structure

```
motoparkvizag/
├── backend/
│   ├── server.js                # Express app: middleware, CORS, CSP, rate limits, routes
│   ├── config/                  # db.js (Mongoose), cloudinary.js, api.js
│   ├── controllers/             # admin, user, product, order, payment, cart, home, navbar, offer
│   ├── middleware/              # authMiddleware (admin JWT + revoke list), userAuth (protect),
│   │                            # security, upload, uploadLimits, multerCarousel
│   ├── models/                  # 15 Mongoose schemas (Product, Order, User, Cart, Wishlist, …)
│   ├── routes/                  # 17 route modules (one per resource)
│   ├── scripts/migrateImages.js # one-time local→Cloudinary migration
│   ├── createAdmin.js           # seeds an Admin doc (see note in §12)
│   └── uploads/                 # local disk fallback (carousel/logos/products)
│
└── motopark-web/
    ├── index.html               # SEO head, font preconnect, PWA hooks
    ├── vite.config.js           # PWA/Workbox, manualChunks, aliases
    ├── vercel.json              # SPA rewrites + cache headers
    └── src/
        ├── main.jsx             # providers, SW register, version check, keep-alive
        ├── App.jsx              # routes, lazy loading, shell mounting strategy
        ├── config/api.js        # API base + fetch wrapper (admin)
        ├── lib/apiCache.js      # SWR-style mem+session cache w/ in-flight dedupe
        ├── context/             # User, Cart, Wishlist, Product, StoreConfig, AppData
        ├── hooks/               # scrollReveal, smoothScroll, parallax, product, carousel
        ├── utils/               # imageUrl (Cloudinary transforms), detectColor
        ├── components/          # ~25 storefront components (Navbar, Carousels, Cards, …)
        ├── pages/               # Home, Store, ProductDetail, Cart, Checkout, Orders, Auth, …
        └── admin/               # layout/, pages/, components/, utils/ (api, ProtectedRoute)
```

---

## 11. System Architecture

```
Browser (React 19 SPA, PWA)
   │
   ├── Static hosting: Vercel  (SPA rewrites, immutable /assets cache, no-cache index.html/sw.js)
   │
   ├── Service Worker (Workbox): runtime caching per route class (see §17)
   │
   └── HTTPS REST  ─────────────►  Express API on Railway
                                      │
                                      ├── Helmet + CSP, CORS allow-list, compression
                                      ├── express-rate-limit (global + per-route)
                                      ├── express-mongo-sanitize
                                      ├── JWT auth (admin + user middlewares)
                                      ├── Controllers → Mongoose Models → MongoDB Atlas
                                      ├── Cloudinary (image/video upload + CDN delivery)
                                      ├── Razorpay (order create + signature verify)
                                      └── Resend (OTP / transactional email)
```

**Key architectural patterns:**
- **Single source of truth for API base URL** (`src/config/api.js`) with trailing-slash normalization.
- **Layered client cache** (`apiCache.js`): in-memory Map → sessionStorage → network, with in-flight request de-duplication (critical under React 18/19 StrictMode double-mount) and a `CACHE_VERSION` purge to evict stale Cloudinary URLs across deploys.
- **Aggregated home endpoint** (`/api/home-data`) collapses 5 calls into 1 with `Promise.all` + a 5-minute server-side in-memory cache, invalidated on relevant writes (`clearHomeCache()`).
- **Content-driven storefront**: navbar, carousels, offers, video showcase, home layout, and store config are all DB-backed and editable via the CMS.

---

## 12. Authentication Flow

There are **two independent auth systems**.

**Admin auth** (`controllers/adminController.js`, `middleware/authMiddleware.js`, `routes/adminRoutes.js`)
- Login compares `email` against `process.env.ADMIN_EMAIL` and `bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH)`.
- **Timing-attack mitigation**: bcrypt is always run (against a dummy hash of the same cost factor) even when the email doesn't match, so response time doesn't reveal whether the email is valid.
- On success: `jwt.sign({ role: "admin", email }, JWT_SECRET, { expiresIn: "24h" })`.
- Middleware requires `Bearer` token, checks an **in-memory revocation list** (`revokedTokens`), verifies the JWT, and enforces `role === "admin"` (else 403). Auth failures are logged with method/path/IP.
- **Logout** revokes the token (added to blacklist until its `exp`); a periodic sweep purges expired entries.
- Tight **login rate limit**: 10 attempts / 15 min / IP.
- Token stored client-side as `localStorage.adminToken`; `ProtectedRoute` gates `/admin/*`; a 401 from the admin fetch wrapper clears the token and redirects to `/admin/login`.

> Evidence note: `models/Admin.js` and `createAdmin.js` (which hashes `"admin123"` and inserts an Admin document) exist, but the **active login path uses environment-variable credentials, not the `Admin` collection.** The DB-backed Admin model appears to be legacy/unused for the current login flow.

**User auth** (`controllers/userController.js`, `middleware/userAuth.js`, `routes/userRoutes.js`)
- **Email OTP**: `POST /otp/send` generates a 6-digit OTP (10-min expiry), upserts the user, and emails a branded code via Resend. `POST /otp/verify` validates, marks `isVerified`, returns a 30-day JWT.
- **Email+password**: `register` / `login/email`; password hashed via a Mongoose `pre("save")` bcrypt hook; `matchPassword` compares.
- `protect` middleware verifies the user JWT and loads the user (minus password/otp fields).
- Auth endpoints are rate-limited (10 / 15 min) and OTP send additionally limited (5 / 15 min, both in `server.js` and `userRoutes.js`).
- Client stores `userInfo` + token under **both** `motopark_token` and legacy `userToken` keys (`UserContext.jsx`) to keep Cart/Wishlist consumers working — a documented fix for a prior key-mismatch bug.

**Order/payment auth** uses a guest-friendly `optionalAuth` (attaches `userId`/`role` if a valid token is present, otherwise proceeds as guest), plus a stricter `requireUserAuth` for reading orders.

---

## 13. API Flow

All routes are mounted in `server.js` under `/api/*`. Selected representative flows:

**Browse products** — `GET /api/products`
- Query params: `category, brand, minPrice, maxPrice, size, color, flags, sort, search, page, limit`.
- Hardening: `limit` clamped to ≤100, `page` ≥1; search requires ≥2 chars (else empty result) and regex is escaped + length-capped; brand/color tokens trimmed; category resolved by ObjectId or case-insensitive name.
- Returns `{ products, total, page, pages }` with `Cache-Control` that is `no-store` for admin (`x-admin: 1` header) and SWR-cacheable for the public.
- `GET /api/products/filters` returns brand/size/color/price facets via a single `$facet` aggregation, cached 5 min in-process.

**Place an order (online payment)** — `Checkout.jsx`
1. `POST /api/payment/create-order` with `{ items:[{productId,quantity}], deliveryCharge }`. Server recomputes the amount from DB prices, creates a Razorpay order, returns `{ orderId, amount, currency }`. (Items array capped at 50; `paymentLimiter` 10/min.)
2. Razorpay checkout opens client-side.
3. `POST /api/payment/verify` recomputes the HMAC-SHA256 signature with the secret and compares — rejects on mismatch.
4. `POST /api/orders` persists the order: **60-second idempotency guard** for logged-in users, **atomic stock decrement** with rollback, **server-side total recomputation**.

**Order management**
- `GET /api/orders` — `requireUserAuth`; non-admins are scoped to their own `userId`; admins may filter by `userId`/`phone`/`status`. Paginated, `.lean()`.
- `GET /api/orders/:id` — ownership/admin enforced.
- `PUT /api/orders/:id/status` — admin-only, status enum validated.
- `PUT /api/orders/:id/cancel` — guest-friendly; only `pending`/`confirmed` cancellable; restores stock.

**Cart/Wishlist sync** — `protect`-guarded `GET/PUT/POST(merge)/DELETE` on `/api/cart` and `/api/wishlist`. Server merges guest items on login (summing quantities for cart, de-duping for wishlist).

**CMS content** — `offers, navbar, carousel, video-showcase, store-config, home-data, categories, home-layout, collections, media`: public `GET`, admin-guarded writes; many add CDN cache headers.

**Client fetch conventions:** the admin app uses an axios instance (`admin/utils/api.js`) with token interceptor and an HTML-instead-of-JSON guard; the storefront uses `apiCache.cachedFetch` (with abort signals) and a hardened `fetch` wrapper in `config/api.js` (15s timeout, content-type guard, 401 auto-logout).

---

## 14. Database Design

15 Mongoose models in `backend/models/`. Highlights:

**Product** (`productModel.js`)
- `name, description, specs, care, price(min 0), brand, category`, plus boolean flags `newArrival, featured, trending, isShowcase`, timestamps.
- Embedded **variants** `[{ color, colorName, images:[String], sizes:[{ size, stock }] }]`.
- **Curated indexes** (with an in-file audit explaining what was removed as redundant): compound `{category, brand, price}` for filtered store queries; flag+`createdAt` indexes for each home section; `variants.sizes.size` and `variants.color` for facet filters; and a single compound **text index** on `name + description`.

**Order** (`orderModel.js`)
- Optional `user` (guest-friendly), embedded `items`, `shippingAddress`, `paymentMethod` (default `cod`), `total` (required), `status` enum `[pending, confirmed, shipped, delivered, cancelled]`.
- Indexes: `{user, createdAt}` (history), `{shippingAddress.phone}` (guest lookup), `{status, createdAt}` (admin dashboard).

**User** (`userModel.js`)
- `name`, unique-sparse `email`/`phone`, optional `password`, `isVerified`, transient `otp`/`otpExpiry`, embedded `savedAddresses`, `defaultAddress`. Bcrypt `pre("save")` hook + `matchPassword`.

**Cart / Wishlist** — one document per user (`user` unique), embedded items; wishlist items store a snapshot of name/price/image/variants.

**CMS models** — `Carousel` (premium/vertical source, legacy `image` back-compat, `{source,active,order}` index), `VideoShowcaseConfig` (slides), `HomeLayout` (ordered sections with per-section settings + server-side `DEFAULT_SECTIONS`), `StoreConfig` (filters, navbar, settings), `Navbar`, `Offer`, `Category` (unique slug), `Collection` (unique slug + product refs), `Media`.

**Index management:** `config/db.js` connects with a pool (maxPoolSize 10, 5s server-selection timeout) and runs `syncIndexes()` in `setImmediate` so index build never blocks `app.listen()` (documented as a fix for a 9s startup delay).

---

## 15. Component Architecture

**Providers** (composed in `main.jsx`): `HelmetProvider → BrowserRouter → UserProvider → ProductProvider → CartProvider → WishlistProvider → StoreConfigProvider → App`.

- **UserContext** — auth state + `ready` flag; persists to localStorage; dispatches `userAuthChange`.
- **ProductContext** — fetches `/home-data` once via `cachedFetch`; exposes `featured/trending/newArrivals`, `loading`, `error`, `refreshProducts`, `clearCache`; normalizes `variants[0].images` → `images`.
- **CartContext / WishlistContext** — guest (sessionStorage) ↔ user (server) lifecycle: merge on login, debounced (800ms) server sync, logout reset, stock-capped quantities, normalized item shape, null-token-safe auth header.
- **StoreConfigContext / AppDataContext** — cached config/navbar/offers with abort + mounted guards.

**Routing & code-splitting** (`App.jsx`): every page and the entire admin bundle are `React.lazy`; idle-time **prefetch** warms likely-next chunks via `requestIdleCallback`; the layout **shell stays mounted** (toggled with `display:none`/`display:contents`) across admin↔store navigation to avoid remount-driven refetches.

**Reusable hooks** (`src/hooks/`): `useScrollReveal` (IntersectionObserver reveal variants), `useSmoothScroll` (Lenis, single-instance guarded), `useParallax` (RAF + scroll-container-aware + ResizeObserver, heavily commented), `useProduct` (module-level single-product cache with context fast-path + abort), `useFreshCarouselData` (`freshOnly` fetch so deleted images never flash).

**Admin components**: `AdminLayout` + memoized `AdminSidebar` (sectioned nav, Escape-to-close, focus management), `DataTable`, `VariantEditor`, `StatCard`, `SalesChart`, `HomeBuilder` with `SectionCard`/`SectionSettingsModal`, a `ToastProvider`, and a `Modal` UI primitive.

---

## 16. Engineering Decisions

Evidence-backed, with the file that documents them:

1. **Server-authoritative pricing & stock** — totals recomputed from DB; atomic `findOneAndUpdate` stock decrement with rollback (`orderController.js`, `paymentController.js`). Prevents price tampering and overselling.
2. **Idempotent order creation** — 60s duplicate-order guard keyed by user (`orderController.js`) plus a client `isSubmittingRef` lock (`Checkout.jsx`).
3. **Single aggregated home endpoint + in-memory cache** — `Promise.all` of 3 queries, 5-min TTL, explicitly invalidated on writes (`homeController.js`).
4. **Client SWR cache with in-flight dedupe** — solves StrictMode double-fetch and back/forward navigation; `CACHE_VERSION` purges stale Cloudinary URLs (`apiCache.js`).
5. **Variant image lifecycle** — `keepImages_{i}` flags from the frontend merge retained vs. newly-uploaded Cloudinary URLs without double-uploading (`productController.buildVariants`, with a comment rejecting a double-upload suggestion).
6. **Cloudinary dual-credential config** — sets both individual vars and `CLOUDINARY_URL` because the video upload path reads the latter (`config/cloudinary.js`).
7. **Transactional CSV bulk import** — Mongoose session ensures all-or-nothing inserts (`productController.bulkCreateProducts`).
8. **Whitelisting writes** — store-config, video-showcase, and others only persist known fields to prevent injection/prototype pollution (`storeConfigRoutes.js`, `videoShowcaseRoutes.js`).
9. **Force-update mechanism** — `/api/version` (never cached) compared against a stored version; on change, the client unregisters SWs, wipes caches, and hard-reloads — with extra `focus`/`visibilitychange` triggers for Safari iOS (`main.jsx`).
10. **Lazy + manual chunking** — `vendor-react`, `vendor-motion`, and a separate `chunk-admin` (`vite.config.js`) keep the storefront bundle lean.

---

## 17. Performance Optimizations

- **Code splitting & lazy loading** of all pages + admin; idle prefetch of likely-next routes.
- **Manual vendor/admin chunks**; `esbuild` minify; `chunkSizeWarningLimit` 500.
- **Service-worker runtime caching** (`vite.config.js`): version endpoint `NetworkOnly`; semi-static CMS APIs `StaleWhileRevalidate`; categories/products/user-APIs `NetworkFirst` with short network timeouts; static assets `CacheFirst` (7d); Cloudinary images `CacheFirst` (30d).
- **HTTP caching layers**: server `addCacheHeaders` (`s-maxage`, `stale-while-revalidate`, `Surrogate-Control`, `CDN-Cache-Control`); Vercel immutable `/assets`, no-cache `index.html`/`sw.js`; static `/uploads` 7-day cache.
- **DB efficiency**: targeted compound indexes, `.lean()` reads, projection (`.select()`) trimmed to fields actually rendered, `Promise.all` parallelism, `$facet` single-pass facets, filter-cache with TTL sweep, background `syncIndexes()`.
- **Image optimization**: Cloudinary `f_auto,q_auto,w_…,c_fill` transforms (`utils/imageUrl.js`); upload-time `quality: auto:good`, width-limit 1920; `loading="lazy"` images.
- **Client cache**: memory→session→network with TTL (60s) and dedupe.
- **Perceived performance**: skeleton loaders everywhere, page transitions, height-reserving placeholders to avoid CLS (e.g., 100vh video skeleton), `requestAnimationFrame`-batched parallax with off-screen pausing.
- **Compression**: gzip via `compression` middleware.
- **Cold-start handling**: Railway keep-alive `/ping` every 4 min; 30s client fetch timeout; "server may be starting up" messaging.

---

## 18. Security

- **Helmet + custom CSP**: restricts script/style/img/media/connect/font/frame/object sources; allows Cloudinary media and Razorpay connect; `objectSrc 'none'`, `frameSrc 'none'`; `upgradeInsecureRequests` in prod.
- **CORS allow-list**: only localhost:5173 and the production domains; explicit methods and headers (`x-admin` included); credentials enabled.
- **Rate limiting**: global API (200/15min in prod), admin login (10/15min), OTP (5/15min), uploads (20/min), payments (10/min), auth (10/15min).
- **Input sanitization**: `express-mongo-sanitize` (NoSQL-injection); JSON/urlencoded body limits 10kb; regex escaping for search/category; log-injection guard (truncated previews) in variant parsing.
- **Auth hardening**: bcrypt password hashing; constant-time-ish admin login (always run bcrypt); JWT verification with role check; in-memory admin token revocation list; user tokens scoped reads; ObjectId validation before DB hits.
- **Payment integrity**: server-side total recomputation; Razorpay HMAC signature verification; items-count cap (≤50).
- **Upload safety**: MIME allow-lists for images/videos, per-type size limits (images 5MB, products 20MB, videos 50MB), all upload routes admin-guarded.
- **Transport/host**: www→non-www 301 redirect; secrets in `.env` (git-ignored); centralized error handler that hides stack traces and internal messages in production.

**Observed risks / notes (evidence-based):**
- The in-memory token blacklist, filter cache, and home cache are **per-instance** — they don't survive restarts or scale horizontally (the code itself notes "move to Redis" for multi-instance).
- `backend/scripts/migrateImages.js` contains **hardcoded Cloudinary credentials written as unquoted, syntactically-invalid identifiers** — it cannot run as committed and shouldn't contain secrets. (One-time script; not part of the running app.)
- The `JWT_SECRET` fallback string `"motopark_user_secret"` appears in several order/payment middlewares as a default — relying on it in prod would be unsafe; whether `JWT_SECRET` is always set in the deployed env is **Unable to verify from repository.**

---

## 19. Responsive Design

- **Mobile-first navigation**: glassmorphism pill navbar with centered logo, slide-out `MobileMenu`, and a floating `MobileBottomNav`; hamburger + body-scroll lock when menu open (`Navbar.jsx`).
- **Breakpoint logic in JS** (`Store.jsx`): `isMobile = innerWidth <= 768` drives a **bottom-sheet filter drawer** (with backdrop, `role="dialog"`, `aria-modal`) on mobile vs. a persistent sidebar on desktop.
- **Product detail** adapts a 3-column desktop layout to a **sticky mobile purchase bar** (`.pd-mobile-sticky`).
- **Carousel** stores separate `desktopImage` and `mobileImage` per slide.
- **56 CSS files** with component-scoped styling; responsive utilities, container queries/media queries — **Unable to verify** exact breakpoint coverage per component without reading every CSS file, but responsive intent is evident throughout.
- **PWA manifest** `display: standalone` for app-like mobile behavior.

---

## 20. Accessibility

Evidence from a repo-wide scan (**342 occurrences of `aria-*`/`alt=`/`role=` across 54 files**):

- `aria-label` on icon buttons (wishlist, cart, search, filters, view toggles, logout, menu).
- `aria-hidden="true"` on decorative elements (ambient orbs, dividers, accent lines, skeletons).
- `role="button"` + `tabIndex={0}` + Enter-key handlers on clickable cards (`StoreCard`, `RelatedCard`).
- `role="dialog"` + `aria-modal="true"` on the mobile filter drawer; `role="navigation"`/`aria-label` on the admin sidebar with Escape-to-close and focus-on-open.
- `aria-expanded` on the nav menu button; semantic `<nav>` breadcrumbs; `alt` text on product/brand images.
- Error boundary on Product Detail prevents blank-screen failures.

Not verified: full keyboard-trap management in all overlays, color-contrast compliance, screen-reader testing, and reduced-motion handling — **Unable to verify from repository** beyond what the markup implies.

---

## 21. UI/UX Analysis

- **Premium aesthetic**: glassmorphism, ambient gradient orbs, accent color `#ff6b3d` (orange) on a dark base, custom fonts (DM Sans, Bebas Neue, Barlow, Barlow Condensed + a preloaded `Sakana.ttf`).
- **Motion design**: Lenis smooth scroll, Framer Motion, IntersectionObserver scroll-reveal with a shared easing curve `cubic-bezier(0.22,1,0.36,1)`, parallax, staggered card animation delays (capped to avoid long waits).
- **Perceived performance**: skeletons for every async section, height-reserving placeholders, page transitions, no blocking spinners on first paint.
- **Conversion-oriented checkout**: clear 3-step progress bar, inline validation, trust signals (secure checkout, free delivery, warranty/returns), EMI hint, Razorpay branding.
- **Storefront merchandising**: multiple curated surfaces (featured/highest-selling/trending/new-arrivals/showcase), brand wall, video storytelling, offer bar.
- **Admin UX**: sectioned sidebar, KPI cards with count-up, charts, skeleton table rows, toasts, modals, drag-and-drop layout builder — a genuinely product-grade internal tool.

---

## 22. Challenges Solved

Each is documented in-code:

1. **StrictMode double-fetch & request storms** → in-flight dedupe + shared promise cache (`apiCache.js`, `ProductContext.jsx`).
2. **Stale Cloudinary images after deploys** → `CACHE_VERSION` purge + `freshOnly` carousel fetch.
3. **Overselling under concurrency** → atomic variant-scoped `$inc` with `arrayFilters` + rollback.
4. **Price tampering** → server recomputes totals; never trusts client amount.
5. **Duplicate orders on double-click / retries** → 60s server idempotency + client submit lock + 409 handling.
6. **Cross-browser force update** (esp. Safari iOS timer suspension) → version endpoint + focus/visibility triggers + SW/caches wipe + hard reload.
7. **Cold-start latency on Railway** → keep-alive ping, longer client timeouts, JSON content-type guards for HTML error pages.
8. **Token key mismatch breaking cart/wishlist auth** → dual-key write + backwards-compatible boot read.
9. **Cloudinary video upload "missing api_key"** → set `CLOUDINARY_URL` in addition to individual vars.
10. **Slow startup from blocking index sync** → background `syncIndexes()`.
11. **Layout shell refetching on admin↔store navigation** → keep shell mounted via `display` toggling.
12. **Android Chrome `scrollTo({behavior:"instant"})` crash** → try/catch fallback.

---

## 23. Lessons Learned

Inferred from the code's evolution (extensive "FIXES APPLIED" headers and git history):

- The project was **iteratively hardened** — many files explicitly contrast "Before"/"After" states, showing security and performance issues were found and fixed post-MVP (auth guards added to write routes, `.lean()` added, ObjectId validation, rate limits).
- **Caching is subtle**: multiple layers (browser SW, HTTP/CDN, client memory/session, server in-memory) required careful invalidation discipline and version bumping.
- **Single-instance assumptions** (in-memory caches/blacklists) are acknowledged as a scaling limitation, with Redis flagged as the next step.
- **Guest→user state merging** is non-trivial and needed a deliberate lifecycle (merge, debounce, logout reset).
- Some **dead/legacy paths** accumulated (unused `Admin` model, missing admin-stats endpoints, broken migration script), illustrating the value of cleanup passes.

---

## 24. Production Readiness Assessment

**Strong (production-grade):**
- Security middleware stack (Helmet/CSP, CORS allow-list, rate limits, sanitization).
- Payment integrity (server totals + signature verification).
- Inventory correctness (atomic decrement + rollback + cancel restock).
- Caching/perf strategy across all layers; PWA + force-update.
- SEO (meta/OG/Twitter/canonical/sitemap/JSON-LD) and graceful error handling.
- Real deploy config for Vercel + Railway, maintenance mode, health/ping endpoints, graceful SIGTERM shutdown.

**Gaps / would-block-at-scale (evidence-based):**
- **Admin dashboard stats endpoints are not implemented** → KPIs render empty; a field-name mismatch (`totalPrice` vs `total`) exists.
- **In-memory caches/blacklists** are per-instance → won't work correctly behind multiple replicas.
- **No automated tests** (`backend` test script is a placeholder; no test files observed) → **regression safety Unable to verify.**
- **`migrateImages.js` contains invalid hardcoded credentials** → must be removed/fixed; secret hygiene concern.
- **No CI/CD config observed** in the repo → **Unable to verify.**
- **Observability/logging** is `console.*` only; no structured logging/monitoring observed.
- COD is intentionally disabled in checkout UI (online-only).

Overall: a **feature-complete, well-hardened single-instance production app** with a clear, finite list of cleanups before horizontal scale.

---

## 25. Resume Bullet Points

- Built a full-stack **MERN e-commerce platform** (React 19, Express, MongoDB) with a premium animated storefront and a custom admin CMS — ~19.5k LOC frontend, ~4.2k LOC backend, 15 data models, 17 REST resources.
- Implemented **secure online checkout with Razorpay**, recomputing order totals server-side and verifying HMAC-SHA256 payment signatures to eliminate price tampering.
- Engineered **atomic, variant-level inventory decrement with rollback** and a **60-second idempotency guard** to prevent overselling and duplicate orders under concurrency.
- Designed a **multi-layer caching system** (Workbox SW, HTTP/CDN headers, and a custom stale-while-revalidate client cache with in-flight de-duplication) and a **cross-browser force-update mechanism** that reliably ships new builds, including on Safari iOS.
- Hardened the API with **Helmet/CSP, CORS allow-listing, tiered rate limiting, Mongo sanitization, JWT auth with token revocation, and Cloudinary upload validation.**
- Optimized MongoDB with **curated compound + text indexes, lean projections, `$facet` aggregations**, and an aggregated home endpoint that collapsed 5 calls into 1.
- Created a **drag-and-drop Home Builder CMS** letting a non-technical owner reorder/configure storefront sections, plus managers for products, inventory, orders, carousels, media, and video showcases.
- Delivered a **PWA** with offline asset caching, installability, maintenance mode, and SEO (OG/Twitter/canonical/sitemap/JSON-LD product schema).

---

## 26. Interview Talking Points

- **"How do you prevent price/stock manipulation?"** → server recomputes totals from DB; atomic `$inc` with `arrayFilters` + rollback; signature verification.
- **"How did you handle React StrictMode double-fetching?"** → in-flight promise map in `apiCache.js` so concurrent callers share one network request.
- **"How do you force users onto a new build, even on iOS?"** → uncached `/api/version`, compare-and-wipe SW/caches, hard reload, with focus/visibility triggers.
- **"How is the cart consistent for guests and logged-in users?"** → sessionStorage guest cart → merge endpoint on login → debounced server sync → logout reset.
- **"Why a custom cache instead of React Query?"** → walk through the memory/session/TTL/version-purge design and the Cloudinary-stale-URL problem it solves.
- **"Where would this break at scale, and what would you change?"** → per-instance in-memory caches/blacklist → Redis; add the missing admin-stats endpoints; add tests/CI; structured logging.
- **"How did you keep the storefront fast?"** → lazy routes + manual chunks + idle prefetch + skeletons + Cloudinary transforms + SW caching + lean indexed queries.

---

## 27. Project Metrics (verifiable only)

| Metric | Value | Source |
|---|---|---|
| Frontend `.jsx` files | 80 | file count |
| Frontend `.js` files | 12 | file count |
| Frontend `.css` files | 56 | file count |
| Frontend JS/JSX LOC | ~19,501 | `wc -l` |
| Backend JS LOC | ~4,226 | `wc -l` |
| Mongoose models | 15 | `backend/models/` |
| Route modules | 17 | `backend/routes/` |
| Controllers | 9 | `backend/controllers/` |
| a11y attribute occurrences | 342 across 54 files | repo scan |
| SW runtime-cache route classes | 7 | `vite.config.js` |
| Order status states | 5 | `orderModel.js` |

> Business metrics (users, GMV, conversion, traffic, Lighthouse scores) are **Unable to verify from repository.**

---

## 28. Technical Highlights

- **`apiCache.js`** — a compact stale-while-revalidate cache with memory + sessionStorage tiers, in-flight dedupe, `freshOnly`/`force` modes, background `revalidate`, and `CACHE_VERSION` purging.
- **`orderController.createOrder`** — idempotency + atomic variant stock decrement with rollback + server-side total — a textbook example of correct transactional-ish e-commerce logic in MongoDB.
- **`productModel.js`** — an index strategy with an in-file audit justifying every kept/removed index.
- **`useParallax.js`** — production-grade scroll effect (scroll-container detection, RAF batching, ResizeObserver, off-screen pause, full cleanup).
- **Home Builder** — DB-driven, drag-and-drop storefront composition with per-section settings and server defaults.
- **`main.jsx` version-check** — a genuinely hard cross-browser cache-busting problem solved pragmatically.

---

## 29. Business Impact

Mechanisms in the code that map to business outcomes (actual figures **Unable to verify**):

- **Revenue protection** — server-authoritative pricing + payment verification reduce fraud/chargeback risk.
- **Inventory accuracy** — atomic decrement + cancel-restock keep stock truthful, reducing oversells and refunds.
- **Conversion** — fast, animated, mobile-first UX; free-delivery threshold (₹2000) nudges larger baskets; streamlined Razorpay checkout.
- **Operational efficiency** — self-service CMS + CSV bulk import + order workflow reduce owner workload and dev dependency.
- **Reach** — SEO + PWA installability + offline tolerance expand and retain a mobile audience on variable networks.

---

## 30. Future Improvements

Grounded in observed gaps:

1. **Implement the admin analytics endpoints** (`/api/admin/stats`, `/orders/recent`, `/products/top`) and fix the `total`/`totalPrice` field mismatch so the dashboard reflects real data.
2. **Move shared state to Redis** (token blacklist, home cache, filter cache, rate-limit store) to support horizontal scaling.
3. **Add automated tests + CI/CD** (the backend test script is a placeholder; no tests/CI observed).
4. **Remove `migrateImages.js` hardcoded credentials** and rotate any exposed Cloudinary secrets; load from env.
5. **Consolidate the two admin auth approaches** (env-credential vs. unused `Admin` model) and the duplicate user-token keys.
6. **Persist OTP/rate-limit/idempotency** in a store rather than per-instance memory; add webhook-based Razorpay reconciliation.
7. **Add structured logging + monitoring/alerting** (replace `console.*`).
8. **Enable COD** (model + UI already scaffold it) once operations support it.
9. **Confirm/strengthen `JWT_SECRET`** handling and remove hardcoded secret fallbacks.
10. **Accessibility audit** (contrast, reduced-motion, focus traps) and **automated Lighthouse/perf budgets** in CI.

---

### Appendix — Environment Variables (keys only; values git-ignored)

**Backend (`backend/.env`):** `MONGO_URI`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_URL`, `RESEND_API_KEY`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NODE_ENV` (and `APP_VERSION` referenced in code for the force-update flow).

**Frontend (`motopark-web/.env`):** `VITE_API_URL`, `VITE_RAZORPAY_KEY_ID`, `VITE_MAINTENANCE_MODE`.

---

*Every statement above is grounded in the repository as inspected. Items that could not be confirmed are marked "Unable to verify from repository." No functionality has been invented, and no code was modified in producing this document.*
