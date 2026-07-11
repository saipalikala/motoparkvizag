# MotoPark V2 — Frontend

Premium motorcycle-gear commerce platform. Greenfield rebuild of the MotoPark storefront, built strictly from the approved design constitution in `../docs/` (PRD · IA · DB · API · Brand Identity · Design System · Commerce Laws · Homepage Concept C).

**V1 (`../motopark-web/`) is production and read-only. `../backend/` is shared and untouched — V2 consumes its existing APIs.**

## Stack
React 19 · Vite · JavaScript · React Router 7 · react-helmet-async · Framer Motion (doctrine-limited) · Lenis (home only) · lucide-react · axios · Geist Variable (+ Sakana display, asset pending)

## Run
```bash
npm install
cp .env.example .env.local   # points at ../backend on :5000
npm run dev                  # http://localhost:5174  (V1 keeps 5173)
```

## Architecture
```
src/
├── main.jsx              entry: fonts → tokens → base → App
├── app/                  shell: App.jsx, router.jsx (routes = locked IA)
├── pages/                one folder per page (stubs.jsx until built)
├── components/
│   ├── ui/               design-system primitives (Button, Input, Badge…)
│   ├── layout/           Navbar, OfferBar, Footer, MobileBottomNav
│   └── commerce/         ProductCard, PriceBlock, RatingStars…
├── features/             cart/ wishlist/ auth/ search/ (state + logic)
├── services/             domain API modules (products.js, orders.js…) — the ONLY callers of lib/api.js
├── contexts/             React Context providers (CartContext, AuthContext…)
├── ai/                   future AI capabilities (RAG, Fitment Advisor, Inventory Intelligence, Vision, Business Insights) — empty until AI phase
├── hooks/                shared hooks
├── lib/                  api.js (axios instance) · format.js (paise → ₹)
├── config/               constants, nav config
├── styles/               tokens.css (3-layer contract) · base.css · fonts.css
└── assets/               fonts/ images/
```

**STRUCTURE FROZEN (2026-07-05).** This tree is final for V2 development; do not add/move/rename top-level `src/` folders unless absolutely necessary and explicitly agreed. Homepage Concept C (docs/10) is the implementation baseline for all UI work.

## Non-negotiables (enforced in review)
- **Commerce Laws** — docs/09 §0, all ten, every screen.
- **Tokens only** — no raw hex/px-magic in components; `src/styles/tokens.css` is the styling contract.
- **Motion doctrine** — docs/10 (approved): six allowed motion types, everything else banned.
- **Budgets** — LCP < 2.5s mobile · CLS < 0.1 · route JS ≤ 180 kB gz · body ≥ 16px · AA contrast · 44px targets.
