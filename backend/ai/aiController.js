/* ================================================
   File: backend/ai/aiController.js
   HTTP surface for the assistant:
     POST /api/ai/chat    -> grounded agent turn
     POST /api/ai/search  -> semantic product search
   Conversation memory is kept server-side (small in-memory store,
   same pattern as middleware/authMiddleware.js) so we never trust
   client-supplied history.
   ================================================ */
import crypto from "crypto";
import { runAgent } from "./agent/loop.js";
import { searchProducts } from "./search/vectorSearch.js";
import { toCard } from "./agent/tools.js";

/* Cheap, no-LLM intent router. A plain product-browse request is served by
   vector search alone (embedding model only — NOT the starved chat model),
   so browsing keeps working even when the daily chat quota is exhausted.
   Anything that needs reasoning or a stateful tool (stock, orders, returns,
   fitment, comparisons) falls through to the full LLM agent. Conservative by
   design: when unsure, prefer the agent. */
const BROWSE_RX = /\b(find|show|looking for|recommend|suggest|search|browse|need|want|do you (have|sell)|got any|any\b)/i;
const NEEDS_AGENT_RX =
  /\b(order|track|status|return|refund|deliver|cancel|stock|in ?stock|available|availab|fit|fits|compatible|compare|vs\.?|cheaper|which|better|my)\b/i;

function isBrowseQuery(msg) {
  return BROWSE_RX.test(msg) && !NEEDS_AGENT_RX.test(msg);
}

/* ---- in-memory session store (single-instance; move to Redis for HA) ---- */
const SESSIONS = new Map(); // sessionId -> { messages, updatedAt }
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 min idle
const MAX_HISTORY = 16; // keep last N normalized messages

setInterval(() => {
  const now = Date.now();
  for (const [id, s] of SESSIONS) {
    if (now - s.updatedAt > SESSION_TTL_MS) SESSIONS.delete(id);
  }
}, 5 * 60 * 1000).unref?.();

function getHistory(id) {
  return SESSIONS.get(id)?.messages ?? [];
}
function saveHistory(id, messages) {
  SESSIONS.set(id, { messages: messages.slice(-MAX_HISTORY), updatedAt: Date.now() });
}

/* ---- POST /api/ai/chat ---- */
export async function chat(req, res) {
  try {
    const { message } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message (string) is required" });
    }
    if (message.length > 1000) {
      return res.status(400).json({ error: "message too long (max 1000 chars)" });
    }

    const sessionId = (req.body.sessionId && String(req.body.sessionId)) || crypto.randomUUID();
    const history = getHistory(sessionId);

    // Fast path: plain product browsing → vector search only (no chat-model call).
    if (isBrowseQuery(message)) {
      // Respect a simple price cap ("under 5000", "below ₹3,000", "< 2000").
      const priceMatch = message.match(/(?:under|below|less than|upto|up to|<)\s*₹?\s*(\d[\d,]*)/i);
      const maxPrice = priceMatch ? Number(priceMatch[1].replace(/,/g, "")) : undefined;
      const rows = await searchProducts(message, { limit: 6, maxPrice, sessionId });
      const products = rows.map(toCard);
      const reply = products.length
        ? `Here are some options I found for “${message}”:`
        : "I couldn't find anything matching that — try different words, or ask me to check stock or an order.";
      saveHistory(sessionId, [
        ...history,
        { role: "user", content: message },
        { role: "assistant", content: reply },
      ]);
      return res.json({
        sessionId,
        reply,
        toolsFired: ["searchProducts"],
        products,
        iterations: 0,
        fastPath: true,
      });
    }

    const result = await runAgent({ message, history, sessionId });
    saveHistory(sessionId, result.messages);

    return res.json({
      sessionId,
      reply: result.reply,
      toolsFired: result.toolsFired,
      products: result.products ?? [],
      iterations: result.iterations,
    });
  } catch (e) {
    console.error("[AI] /chat error:", e.status || "", e.message);
    const isKey = /is not set/i.test(e.message); // any provider's missing API key
    const isRate = e.status === 429 || /rate|quota|resource_exhausted|exhausted/i.test(e.message);
    if (isKey) return res.status(503).json({ error: "AI assistant is not configured yet." });
    if (isRate)
      return res.status(429).json({
        error: "MotoBuddy is getting a lot of requests right now — please try again in a few seconds.",
      });
    return res.status(500).json({ error: "Assistant is unavailable right now." });
  }
}

/* ---- POST /api/ai/search ---- */
export async function search(req, res) {
  try {
    const { query, category, brand, maxPrice, limit } = req.body || {};
    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "query (string) is required" });
    }
    const rows = await searchProducts(query, {
      category,
      brand,
      maxPrice: typeof maxPrice === "number" ? maxPrice : undefined,
      limit: Math.min(Number(limit) || 8, 12),
    });
    return res.json({ query, count: rows.length, results: rows });
  } catch (e) {
    console.error("[AI] /search error:", e.status || "", e.message);
    const isKey = /is not set/i.test(e.message); // any provider's missing API key
    const isRate = e.status === 429 || /rate|quota|resource_exhausted|exhausted/i.test(e.message);
    if (isKey) return res.status(503).json({ error: "AI search is not configured yet." });
    if (isRate)
      return res.status(429).json({ error: "AI search is busy right now — please try again in a few seconds." });
    return res.status(500).json({ error: "Search is unavailable right now." });
  }
}
