# MotoPark V2 — Frontend Architecture (The Frontend Constitution)

**Status:** 🔒 LOCKED · 2026-07-05 · All four binding decisions (CSS Modules · no state library · one-way layer table · lazy pages) explicitly approved. Immutable unless a critical architectural issue is discovered (changelog entry required).
**Applies to:** `motopark-v2/` only (V1 `motopark-web/` is production, read-only; `backend/` untouched)
**Upstream constitution:** docs/07 Brand Identity · docs/09 Design System (incl. Commerce Laws §0) · docs/10 Concept C + Motion Doctrine · docs/03 IA · docs/05 API Design
**Stack (locked):** React 19 · Vite · JavaScript · React Router 7 · axios · react-helmet-async · Framer Motion (doctrine-limited) · Lenis (home only) · lucide-react · Geist Variable + Sakana (display)

---

## 1. Folder Structure (FROZEN 2026-07-05)

```
motopark-v2/src/
├── main.jsx          entry: fonts → tokens → base → App
├── app/              application shell: App.jsx · router.jsx · providers.jsx
├── pages/            route components, one folder per page (HomePage, StorePage…)
├── components/
│   ├── ui/           design-system primitives (Button, Input, Badge, Skeleton, Modal, Drawer…)
│   ├── layout/       chrome (OfferBar, Navbar, MegaMenu, Footer, MobileBottomNav)
│   └── commerce/     domain composites (ProductCard, PriceBlock, RatingStars, TrustBadgeRow…)
├── features/         domain logic + UI clusters (cart/ wishlist/ auth/ search/)
├── services/         domain API modules — the ONLY callers of lib/api.js
├── contexts/         React Context providers (CartContext, AuthContext, ToastContext…)
├── ai/               future AI capabilities (RAG, Fitment Advisor, Vision, Insights) — lazy-only
├── hooks/            shared generic hooks (useMediaQuery, useDebounce, useOnScreen…)
├── lib/              infrastructure: api.js (axios) · format.js · storage.js (future)
├── config/           constants: nav config, route paths, category icons, budgets
├── styles/           GLOBAL ONLY: tokens.css · base.css · fonts.css
└── assets/           fonts/ · images/ (static, imported — no runtime fetching)
```

No top-level additions, renames, or moves without explicit agreement recorded in this file's changelog.

---

## 2. Layer Rules & Allowed Dependencies

Layers, lowest → highest. **Imports may only point downward** (a layer imports only layers listed below it). Anything else is a review-blocking violation.

| # | Layer | May import | Must NEVER import |
|---|---|---|---|
| 1 | `styles/`, `assets/` | — (leaf) | anything |
| 2 | `config/` | — | anything else |
| 3 | `lib/` | config | React components, services, contexts |
| 4 | `services/` | lib, config | components, contexts, hooks, pages |
| 5 | `contexts/` | services, lib, config, hooks(generic) | components/commerce, features, pages |
| 6 | `hooks/` | lib, config | services*, contexts*, components |
| 7 | `components/ui/` | config, hooks (generic only) | **services, contexts, features** — ui is pure & presentational |
| 8 | `components/commerce/`, `components/layout/` | ui, hooks, contexts (read), lib/format, config | services (fetching belongs to features/pages) |
| 9 | `features/` | components/*, contexts, services, hooks, lib, config | pages, app |
| 10 | `pages/` | features, components/*, contexts, services, hooks, lib, config | app |
| 11 | `app/` | everything | — |
| — | `ai/` | services, lib, config, components/ui | **nothing outside imports ai/ except pages/app via `React.lazy`** |

\* domain-specific hooks that touch services/contexts live inside their `features/<domain>/` or `contexts/`, not in shared `hooks/`.

**Import conventions:** use the `@/` alias for all cross-folder imports (`@/components/ui/Button`); relative imports only within the same folder; no barrel `index.js` re-export chains deeper than one level (keeps tree-shaking + traceability); never import from `motopark-web/` (V1) — copying a V1 pattern means rewriting it here deliberately.

---

## 3. Component Hierarchy

```
app/App.jsx
└── app/providers.jsx        (contexts, ordered: StoreConfig → Auth → Cart → Wishlist → Toast)
    └── layout chrome        (OfferBar → Navbar → <main> → Footer → MobileBottomNav)
        └── pages/<X>Page    (route-level: data orchestration + SEO head + section layout)
            └── features/*   (CartDrawer, SearchOverlay, AuthGate…)
                └── components/commerce/*   (ProductCard, PriceBlock…)
                    └── components/ui/*     (Button, Badge, Skeleton…)
```

Rules: pages orchestrate, never style-hack; commerce composites assemble ui primitives, never re-implement them; ui primitives are context-free and receive everything via props; every page owns its `<Helmet>` (title, description, canonical, robots, JSON-LD).

---

## 4. Data Flow (unidirectional, always)

```
user event → handler (page/feature) → service call OR context action
   → state update (context / local) → re-render → UI
```

- **Server data** is fetched in pages/features via `services/`, held in local state (or context when genuinely shared). Loading = skeletons (reserved dimensions, CLS 0); errors = DS error states with retry.
- **Money truth (Commerce Law 4):** prices, shipping, totals, stock are *displayed verbatim* from backend responses. The frontend never computes money — `formatPaise()` formats, never calculates.
- **URL as state:** filters, sort, pagination, and search query live in `useSearchParams` (shareable, SEO-consistent with IA §6). Never duplicate them into contexts.
- **Guest persistence (PRD R1):** cart + wishlist in `localStorage` for guests; merged via `services/cart.merge()` on login; server becomes source of truth after auth.

---

## 5. State Management Strategy

**No Redux / Zustand / react-query at MVP.** React's built-ins cover this app's real needs; every dependency is a maintenance liability for a solo developer. Revisit only if measured pain appears (documented, not vibes).

| State kind | Home | Examples |
|---|---|---|
| Server/catalog data | local state in page/feature (+ simple module cache in service if measured) | products, categories, PDP |
| Shared client state | `contexts/` | cart, wishlist, auth session, store config, toasts |
| UI state | component `useState` | modals, accordions, hover |
| URL state | `useSearchParams` | filters, sort, page, q |
| Guest persistence | localStorage via `lib/storage` | guest cart/wishlist, recent searches |

Context discipline: one concern per context; split state/dispatch if re-renders measurably hurt; contexts expose actions, not setters (`cart.addItem(sku)`, never `setCart`).

---

## 6. API Communication Flow

```
component → features/pages → services/<domain>.js → lib/api.js (axios) → backend /api
```

- `lib/api.js`: single axios instance — baseURL from `VITE_API_BASE_URL`, `withCredentials: true` (httpOnly cookie auth, locked Stage 5), 15s timeout, error normalized to `{ code, message }`.
- `services/` modules mirror backend domains: `products.js, categories.js, brands.js, bikes.js, collections.js, search.js, cart.js, wishlist.js, orders.js, checkout.js, auth.js, reviews.js, enquiries.js, account.js`. Each exports plain async functions returning **UI-ready shapes** (mapping/renaming happens here, not in components).
- **Contract rules:** `Idempotency-Key` header (crypto.randomUUID per checkout attempt) on order-create/payment-confirm (R2) · never trust client cart for money — checkout renders `POST /checkout/quote` verbatim · Razorpay script lazy-loaded at payment step only · the future `/api` → `/api/v1` migration touches `services/` + one env var, zero components.

---

## 7. AI Integration Boundaries (future phases; folder exists, stays empty in MVP)

1. **Isolation:** all AI code lives in `ai/` (`ai/rag/`, `ai/fitment/`, `ai/inventory/`, `ai/vision/`, `ai/insights/`).
2. **One-way door:** `ai/` may import `services/`, `lib/`, `config/`, `components/ui/`. Nothing imports `ai/` except pages/app through `React.lazy()` — AI never taxes the commerce bundle (Law 5 + perf budget).
3. **UI reuse:** AI surfaces render inside existing DS seams (Drawer = assistant panel, fitment Q&A container, "why this" caption slots, admin insight footnotes — DS §15). No new primitive families.
4. **Data access:** AI modules call backend AI endpoints via `services/`; **no direct LLM/vendor calls from the browser, no API keys in frontend code — ever.**
5. **Kill-switch guarantee:** deleting `ai/` (and its lazy mounts) must leave commerce fully functional.

---

## 8. Design Token Usage Rules

1. `styles/tokens.css` is the **only** place raw values (hex, px scales, shadows, easing) may exist. Components consume `var(--…)` exclusively — a raw hex/shadow/magic-number in a component file fails review.
2. Styling mechanism: **CSS Modules co-located with components** (`Button.module.css` beside `Button.jsx`). Global CSS only in `styles/`. No styled-components/Tailwind/inline-style systems (stack simplicity, token enforcement).
3. Prefer semantic/component tokens over primitives (`var(--accent)`, not `var(--mp-orange-500)`); primitives directly only when defining new component tokens.
4. Commerce Law 2 in code: normal price = `.price` (ink); sale/discount = `.price--sale` / `--badge-sale-*` only. Orange backgrounds/text outside CTA-sale-rating contexts fail review.
5. Dark mode readiness: because of rule 1, `[data-theme='dark']` remap is the entire implementation. Never write `light-dark()` or theme conditionals in components.
6. Spacing/type: tokens only (`var(--space-*)`, `var(--text-*)`); breakpoints from DS §13 as standard media queries (documented in `config/breakpoints` comment — CSS vars don't work in `@media`).

---

## 9. Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Component files/folders | PascalCase | `ProductCard.jsx`, `pages/home/HomePage.jsx` |
| CSS Modules | match component | `ProductCard.module.css` |
| Hooks | `use` + camelCase | `useDebounce.js`, `useCart()` (exported by CartContext) |
| Services | domain noun, camelCase exports | `services/products.js` → `getProducts()`, `getProductBySlug()` |
| Contexts | `<Domain>Context` + provider + hook | `CartContext`, `CartProvider`, `useCart` |
| Non-component js | camelCase | `format.js`, `storage.js` |
| Constants | UPPER_SNAKE in `config/` | `FREE_SHIPPING_COPY`, `ROUTES` |
| CSS classes | kebab-case, BEM-lite modifiers | `.product-card`, `.price--sale` |
| Events/handlers | `onX` prop / `handleX` impl | `onAddToCart` / `handleAddToCart` |
| Routes | locked IA paths only (docs/03) | `/products/:slug`, `/c/:slug` |

---

## 10. Performance Guidelines (budgets are review-blocking, DS §14)

- **Budgets:** LCP < 2.5s mobile p75 · CLS < 0.1 · INP < 200ms · route JS ≤ 180 kB gz · CSS ≤ 50 kB.
- **Code splitting:** every page lazy via `React.lazy` + route-level `Suspense` (skeleton fallback); admin (if ever added here) is a separate bundle; `ai/` lazy-only.
- **Images:** Cloudinary transforms (`f_auto,q_auto,w_,dpr_auto`); explicit `width/height` on every `<img>`; `loading="lazy"` below fold; hero image `fetchpriority="high"` + preload; product ratio locked 4:5.
- **Hero media:** LCP is never video (Concept C rule); ambient video desktop-only, poster-first, lazy, static under reduced-motion/data-saver.
- **Fonts:** Geist Variable via Fontsource (self-hosted, `font-display: swap`); Sakana lazy (display-only); no FOIT.
- **Motion:** doctrine list only (docs/10); transform/opacity only; IntersectionObserver-driven, once; ≤3 concurrent animated elements; Lenis mounted on Home route only, destroyed on route change.
- **Lists:** virtualize past ~50 items (listing pages paginate at 24 — virtualization rarely needed; measure first).
- **Third-party:** Razorpay checkout script loaded at payment step only; GA4 deferred/idle.
- **Measurement:** Lighthouse CI (or manual budget check) before every homepage/PLP/PDP merge; regressions block.

---

## 11. Changelog
- 2026-07-05 — v1.0 drafted; structure frozen pending approval.
- 2026-07-05 — v1.0 🔒 LOCKED. Owner approved all four binding decisions individually (CSS Modules, no state library at MVP, strict layer table, lazy pages). Implementation phase begins: Homepage Concept C, section by section.

*On approval this document is FROZEN. Architectural changes require an explicit entry here with justification — "absolutely necessary" is the bar.*
