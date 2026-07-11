/* ================================================
   File: backend/ai/search/embed.js
   Thin embedding helper over the active provider, with
   cost/latency logging. Used by search (query embedding)
   and backfill (product embedding).
   ================================================ */
import { getProvider } from "../providers/index.js";
import { logCall } from "../obs/logCall.js";

/* Build the text we embed for a product. Concatenates the fields a shopper
   would actually describe in natural language. Matches the V1 product schema
   (no slug/status fields exist). */
export function productEmbeddingInput(p) {
  return [
    p.name,
    p.brand,
    p.category,
    p.specs,
    p.description,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 8000); // keep well within token limits
}

/* Embed one or more strings. Returns number[][] (order preserved). */
export async function embedTexts(texts, { sessionId, log = true } = {}) {
  const provider = getProvider();
  const started = Date.now();
  const res = await provider.embed(texts);
  if (log) {
    await logCall({
      sessionId,
      kind: "embed",
      provider: provider.name,
      model: res.model,
      promptTokens: res.usage.promptTokens,
      latencyMs: Date.now() - started,
      resolved: true,
    });
  }
  return res.vectors;
}

/* Convenience: embed a single query string -> one vector. */
export async function embedQuery(text, opts = {}) {
  const [vec] = await embedTexts([text], opts);
  return vec;
}
