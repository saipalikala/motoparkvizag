# MotoPark — AI Shopping Assistant ("MotoBuddy")

**Status:** In development (Stage 12) · Grounded, provider-agnostic AI feature
**Lives in:** `backend/ai/**` (a self-contained module on the running V1 Express service)
**Frontend:** floating chat widget (built in `motopark-v2`, can also mount in `motopark-web`)

> One-line thesis: **the model never states a fact it didn't get from a real database call.**
> Same engineering instinct as the Razorpay flow (verify server-side, never trust the client),
> applied to AI.

---

## 1. What it does
- **Semantic product search** — natural language ("something to keep my gear dry in the rain")
  → embeddings → **MongoDB Atlas `$vectorSearch`** → real ranked products.
- **Grounded tool-calling agent** — answers about stock, order status, return eligibility and
  fitment by calling real endpoints/DB. If a tool returns nothing, it says so instead of guessing.
- **Observability + eval** — every provider call is logged (tokens, cost, latency, tools fired,
  resolved?), the endpoints are rate-limited, and a golden-query harness reports a pass rate.

## 2. Architecture
```
backend/ai/
  config.js              provider/model/pricing knobs (all from env)
  providers/
    _interface.md        the LLMProvider contract (chat + embed + normalized tool calls)
    openai.js            only file that imports the OpenAI SDK
    index.js             getProvider() factory  ← swap vendor via AI_PROVIDER
  search/
    embed.js             embedding helper (+ cost logging)
    vectorSearch.js      $vectorSearch aggregation over products
    backfill.js          creates the Atlas vector index + embeds all products
  agent/
    tools.js             grounded tool registry (real DB reads only)
    systemPrompt.js      anti-hallucination guardrails
    loop.js              provider-agnostic agent loop
  obs/
    logCall.js           cost (integer micro-USD) + persistence
    eval.js              runs golden.json, prints pass rate + failure table
  eval/golden.json       ~10 grounded test cases
  aiController.js        POST /api/ai/chat, POST /api/ai/search
models/aiCallLog.js      one row per provider call
routes/aiRoutes.js       mount + dedicated rate limiter
```

**Provider abstraction (the résumé point):** orchestration (`loop.js`, `tools.js`, endpoints)
depends only on the `LLMProvider` contract — never on a vendor SDK. Adding Claude/Gemini =
one new `providers/<vendor>.js` + a registry line + `AI_PROVIDER=<vendor>`. Nothing else changes.

## 3. Grounded tool set (matches the real V1 schema)
| Tool | Grounds to | Notes |
|---|---|---|
| `searchProducts` | Atlas `$vectorSearch` on `products.embedding` | filter by category/brand, maxPrice |
| `getProductDetails` | `products` by `_id` | specs, colors, sizes, stock |
| `checkStock` | `products.variants[].sizes[].stock` | never guesses stock |
| `getOrderStatus` | `orders` by `_id` + phone/email, or by phone/email | **identity-gated** |
| `checkReturnEligibility` | `orders.status` + return window | delivered date ≈ `updatedAt` (V1 has none) |
| `checkFitment` | product text | **best-effort only** — V1 has no structured fitment data |

## 4. Endpoints
- `POST /api/ai/search` → `{ query, category?, brand?, maxPrice?, limit? }` → ranked real products.
- `GET /api/ai/admin/stats?days=N` → **admin-only** (JWT) observability payload: volume, byKind,
  resolved rate, tokens, cost (µUSD→USD), latency (avg/p50/p95/max), tool usage, recent 20 calls.
  Rendered by the **AI Usage** page in the V1 admin panel (`motopark-web/src/admin/pages/AdminAiUsage.jsx`).
- `POST /api/ai/chat` → `{ message, sessionId? }` → `{ sessionId, reply, toolsFired, products[], iterations }`.
  `products[]` = rich cards (`id, name, brand, priceINR, image, url`) collected from the turn's
  search/detail tool calls so the widget can render clickable product cards. **The LLM never sees these
  image URLs** — the tools return slim grounding data to the model and push rich cards to a per-turn
  collector for the UI (clean split: model context vs. presentation). Conversation memory is server-side
  (in-memory, 30-min TTL) — client history is never trusted.

## 5. Providers (provider-agnostic)
Both providers speak the OpenAI wire format, so they share one adapter
(`providers/openaiCompat.js`); `openai.js` and `gemini.js` are thin config wrappers.
Switching = one env var; nothing in the loop/tools/endpoints changes.

| Provider | Default? | Chat model | Embed model / dims | Cost |
|---|---|---|---|---|
| **Gemini** | ✅ (free tier) | `gemini-2.5-flash` | `gemini-embedding-001` / **3072** | ₹0 |
| OpenAI | switch-back | `gpt-4o-mini` | `text-embedding-3-small` / 1536 | ~cents |

Gemini uses its OpenAI-compatible endpoint (`https://generativelanguage.googleapis.com/v1beta/openai/`).
Embedding dims differ per provider → the Atlas index is (re)built to match by `backfill.js`.

## 6. Setup / run
1. `cd backend && npm install` (uses `openai` SDK; Gemini reuses it via its compat endpoint — no extra dep).
2. Add to `backend/.env` (default = Gemini, free): `GEMINI_API_KEY=...`
   (key from https://aistudio.google.com/apikey). To use OpenAI instead: `AI_PROVIDER=openai` + `OPENAI_API_KEY=...`.
3. **Backfill embeddings + build the vector index** (writes to prod Atlas — run deliberately;
   auto-rebuilds the index if its dims don't match the current model): `npm run ai:backfill`
4. Start the API: `npm start`. Smoke test:
   `curl -X POST localhost:5000/api/ai/search -H "Content-Type: application/json" -d '{"query":"helmet"}'`
5. Run the eval: `npm run ai:eval`.
6. **Provider-swap proof:** set `AI_PROVIDER=openai` (+ its key), re-run backfill (rebuilds index at
   1536 dims), restart — the loop, tools, and endpoints are unchanged.

## 7. Failure analysis (the differentiator — fill in with REAL runs)
> The habit most fresher portfolios skip: real failures, root causes, and fixes — the record of
> actually engineering and debugging the system. All entries below are real, from development.

| # | Symptom | Root cause | Fix | Status |
|---|---------|-----------|-----|--------|
| 1 | Every chat call returned HTTP `503` (empty body) | Default chat model `gemini-3.5-flash` is **not served on this account's free tier** (probe: `3.5-flash`→503, `1.5-flash`→404, `2.0-flash`→429) | Wrote a model-probe script; switched default to **`gemini-2.5-flash`** (verified available + supports tool calling); made model overridable via `AI_CHAT_MODEL` | ✅ Fixed |
| 2 | Widget showed generic "Something went wrong" | Gemini free-tier **rate limit** (`429`, ~20 req/day / 5 per min) was lumped into a generic 500 | Detect `429`/quota → return friendly HTTP 429 ("getting a lot of requests, try again"); surface it in the widget | ✅ Fixed |
| 3 | Assistant unusable once daily quota hit; each turn burned ~2 chat calls | Agent loop calls the (starved) chat model even for simple product browsing | **Intent router / fast path**: plain browse queries served by **vector search only — zero chat-model calls** (embeddings have ~50× the quota). Browsing now works even at 20/20 chat usage | ✅ Fixed |
| 4 | Transient run returned **0 products** though search "fired" | One embedding/chat call hit a free-tier throttle mid-run | Diagnosed as rate-limit (not a bug) via direct tool-probe; added `callWithRetry` (1 retry, 3 s backoff on 429/503) | ✅ Fixed |
| 5 | Atlas `$vectorSearch` would have failed silently after provider switch | Leftover **1536-dim** index (OpenAI) vs Gemini's **3072-dim** embeddings — dimension mismatch | `backfill.js` inspects the existing index and **auto drops + recreates** it when dims don't match | ✅ Fixed |
| 6 | Prices nearly rendered as **₹88.50** instead of ₹8,850 | Reused `lib/format.js` `formatPaise` (÷100); but V1 stores prices in **whole rupees**, not paise | Rupee-specific formatter in the widget; documented the unit convention | ✅ Fixed |
| 7 | Import-time side effect connected to **production** Atlas | `backfill.js` self-ran `main()` on import during a validation check | Guarded scripts with a `import.meta.url === pathToFileURL(argv[1])` main-module check so they never auto-run on import | ✅ Fixed |

**Takeaway line for interviews:** *"Most of these were provider/rate-limit realities, not logic bugs —*
*so the fixes were about resilient design (grounding, fast-path routing, backoff, dimension-aware*
*index rebuilds) rather than patching one-off errors."*

## 8. Interview talking points
- **Grounded AI**: model output is constrained to real tool results — demoably won't hallucinate stock/prices.
- **Provider-agnostic orchestration**: running on Gemini's free tier today; OpenAI is a one-env-var switch — two real providers behind one contract, zero orchestration change.
- **Production hygiene**: per-call cost/latency/token logging, rate limiting, identity-gated order access.
- **Eval loop**: golden set + pass rate + written failure analysis — "engineered a system", not "called an API".
- **Skill stack**: embeddings, Atlas Vector Search, tool/function calling, agent loop, observability — on the Express+MongoDB spine already in the résumé.

## 8b. Rate-limit resilience (free tier)
Gemini's free tier is tight (e.g. 2.5-flash ≈ 5 req/min, ~20 req/day), and each agent turn
costs ~2 chat calls. Two mitigations:
- **Intent router (fast path):** a plain product-browse message ("find me a helmet") is served by
  **vector search alone — no chat-model call** (embeddings have a far higher quota), so browsing keeps
  working even when the daily chat quota is exhausted. Reasoning/tool queries (stock, orders, returns,
  fitment, comparisons) fall through to the full LLM agent. See `isBrowseQuery()` in `aiController.js`.
- **Backoff + graceful degradation:** providers retry once on 429/503 (`callWithRetry` in
  `openaiCompat.js`); a real rate limit returns a friendly "getting a lot of requests, try again"
  message (HTTP 429) instead of a generic error.
- **Escape hatch:** when a card is available, flip `AI_PROVIDER=openai` (or enable Gemini billing) to
  remove the caps — a one-line change thanks to the provider abstraction.

## 9. Known limitations / honest caveats
- Fast-path browse replies are **templated** (no LLM phrasing) to save quota; complex queries still use
  the agent. Fast-path parses a simple price cap ("under 5000") but not richer filters.
- **Fitment is best-effort** (no structured compatibility data in V1). A future enhancement is a
  `compatibleModels[]` backfill on products for exact fitment.
- Return "delivered date" is approximated from `order.updatedAt` (V1 lacks a delivered timestamp).
- Session memory is in-process (single instance) — move to Redis for multi-instance/HA.
- Embeddings backfill is a manual script; wiring it to product create/update is a follow-up.
