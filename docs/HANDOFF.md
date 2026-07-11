# MotoPark V2 Handoff

## 1. Project Overview
- **Stack (frontend `motopark-v2/`):** React 19 + Vite + JavaScript + React Router 7. CSS Modules + design tokens (NO Tailwind, NO state library). Lazy routes + `app/ErrorBoundary.jsx`.
- **Stack (backend `backend/`):** Node/Express (ESM), Mongoose ^9, MongoDB Atlas, JWT auth. **Shared V1 backend** on `localhost:5000` — V2 reads it; do not fork it.
- **V1 frontend (`motopark-web/`):** the live site + full admin at motoparkvizag.in (Railway). Reference-only; keep, don't reuse its UI.
- **Dev:** V2 Vite on `localhost:5174` (CORS-whitelisted). Backend on `5000`.
- **State:** Storefront FEATURE-COMPLETE. Next workstream = V2 Admin Panel (not started).

## 2. Completed Features
- **Storefront pages (all real, verified desktop+mobile):** Home, Store/PLP, Category `/c/:slug`, PDP `/products/:id`, Cart, Wishlist, Search, Brand, Bikes (3), Collections (2), Checkout, Account, Track, Auth `/login`, static/policy, 404.
- **Authentication:** passwordless OTP + Google Sign-In, both live. JWT Bearer in `localStorage['mp-auth-token']`; `lib/api.js` interceptor attaches it. Contexts: Auth/Cart/Wishlist (localStorage).
- **Search:** semantic (primary) via `/api/ai/search` + keyword fallback via `/products?search=`.
- **MotoBuddy AI:** grounded chat widget, live + verified (tool-calling, real DB grounding).
- **Semantic search:** Atlas `$vectorSearch` over product embeddings; wired into `SearchPage`.
- **Checkout:** 3-step + Razorpay; server recomputes totals. Code-complete.
- **Orders:** create + OrderHistory + confirmation. Code-complete.
- **Profile:** AccountPage (name/phone edit, saved addresses, order history). Phone-save bug fixed.
- **Cloudinary optimization:** `lib/image.js cloudinaryUrl()` applied to every product-image surface (0 raw URLs).
- **Other:** robots.txt, static sitemap, OG meta, code-splitting, error boundary, admin AI-usage dashboard (in V1 admin).

## 3. Architecture Decisions
- **Money = whole RUPEES** (V1 stores rupees, NOT paise). Use `lib/format.js formatINR` / service `priceINR`. Never `formatPaise` on V1 data.
- **Services layer is the ONLY caller of `lib/api.js`.** Components never call the API directly.
- **CSS Modules + tokens only.** shadcn/Tailwind explicitly declined (borrow a11y patterns, re-express in our primitives).
- **AI architecture:** provider-agnostic. Default Gemini FREE tier (`gemini-2.5-flash` chat, `gemini-embedding-001` @ **3072 dims**); OpenAI is a one-env switch (`AI_PROVIDER=openai`, `text-embedding-3-small` @1536 → re-run backfill). Model never states a fact not from a real DB tool call. Fast-path intent router serves plain browse via embeddings only (dodges chat quota).
- **Admin:** REBUILD in V2 (decided 2026-07-11) — retire V1, unified codebase.
- **Must NOT change:** single shared backend; rupees-not-paise; CSS-Modules-no-Tailwind; provider abstraction; `userModel.phone` is `unique+sparse`; don't fabricate reviews/brand logos (V1 has no review model, brand = product string).

## 4. Current Git Status
- **Branch:** `main`
- **Latest commit:** `639c75b` — "feat: MotoPark V2 storefront + MotoBuddy AI module (checkpoint)" (170 files: `motopark-v2/` + `backend/ai/` + `docs/` + backend/admin changes).
- **Untracked (intentional):** `.claude/`, `.mcp.json` (local tooling), and this `docs/HANDOFF.md`.
- `.env` files are gitignored — never commit them.

## 5. Remaining Production Tasks
- **Razorpay:** frontend `VITE_RAZORPAY_KEY_ID` ≠ backend `RAZORPAY_KEY_ID` (both live, different). Set MATCHING `rzp_test_` keys in both `.env`, restart both, test card `4111 1111 1111 1111`. Payment→order path is code-complete but unproven until this is done.
- **GA4** analytics: not started.
- **Dynamic sitemap:** static exists; product/brand URLs need generation from the API.
- **Deployment:** V2 frontend + `backend/ai/*` routes → Railway; set prod envs (`GEMINI_API_KEY`, `GOOGLE_CLIENT_ID`, Razorpay keys). Vector index + embeddings already on prod Atlas.

## 6. Next Development Task — V2 Admin Panel
- **Why rebuild in V2:** V1 admin already controls the shared backend, but the goal is to retire V1 entirely for one unified codebase + design system.
- **Approved roadmap (in order):** Foundation → Products → Categories → Brands → Orders → Customers → Analytics → Settings.
- **Rationale:** foundation (auth+layout+nav) before features; Products first = highest daily value and only needs to READ existing categories/brands via API; operational Orders before read-only Customers; aggregates (Analytics/Settings) last.

## 7. Important Files & Modules
- **Frontend `motopark-v2/src/`:** `app/` (App, router, ErrorBoundary) · `contexts/` (Auth/Cart/Wishlist) · `services/` (products, auth, account, checkout, orders, categories, collections — sole api callers) · `lib/` (api, format, image, razorpay) · `components/` (ui/Button, commerce/{ProductCard,ProductGrid,SectionHeader}, layout/{Navbar,Footer,MobileBottomNav,OfferBar}) · `features/` (assistant/AssistantWidget, auth/GoogleSignIn, catalog/ProductListing, account/OrderHistory) · `config/` (store, geo, nav) · `styles/` (tokens, base, fonts).
- **Backend AI `backend/ai/`:** config.js, providers/, search/ (embed, vectorSearch, backfill), agent/ (tools, systemPrompt, loop), obs/, aiController.js, adminStats.js. Routes: `routes/aiRoutes.js` (`/api/ai`). Model: `models/aiCallLog.js`.
- **Backend admin auth:** `middleware/authMiddleware.js` (admin-role JWT) — reuse for V2 admin.
- **Docs:** `docs/02`–`12` (PRD, IA, DB, API, fulfillment, brand, design-system, homepage-concepts, frontend-arch, ai-assistant) + résumé/case-study.

## 8. Do NOT Repeat
- Phone-save bug: FIXED — stray empty account holding `9618887929` deleted; helper scripts removed. Don't re-investigate.
- Cloudinary optimization: DONE across all surfaces.
- Semantic search wiring: DONE (SearchPage).
- AI backfill: 48 products embedded @3072-dim on prod Atlas; vector index built. Don't re-run.
- Plugin/MCP cleanup: unused plugins disabled (user scope). Don't re-audit.
- Confirmed absent in V1: review model, brand model, product slug, structured fitment/tracking. Don't build features assuming they exist.
- shadcn/Tailwind: already declined — don't re-propose.

## 9. First Task
Start **Admin Milestone 1 — Foundation** (only this; verify before moving on):
1. **Admin auth gate** — reuse existing admin-role JWT (`authMiddleware`); route guard + admin login entry.
2. **Admin shell** — `/admin/*` routes inside the same V2 app (reuses AuthContext + api layer); sidebar nav for the 8 roadmap sections, top bar, content area, V2 tokens.
3. **Shared admin primitives** — table, form field, page header, empty/loading states.
4. **Dashboard as shell** — placeholder tiles wired to cheap real counts; rich widgets later.

Recommended defaults (confirm with user): `/admin/*` in-app + reuse existing admin JWT. Then build one roadmap module at a time, verifying each on `localhost:5174` before the next.
