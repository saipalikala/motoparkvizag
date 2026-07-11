/* ================================================
   File: backend/ai/config.js
   Central knobs for the AI assistant module.
   Everything provider-related is read from env / the PROVIDERS map
   so the orchestration layer never hard-codes a vendor.
   ================================================ */

/* Per-provider settings. Both OpenAI and Gemini are reached through the
   OpenAI-compatible wire format (Gemini exposes one), so they share the
   same adapter (providers/openaiCompat.js) — only these values differ.
   `embedDims` MUST match the embedModel AND the Atlas vector index. */
export const PROVIDERS = {
  openai: {
    name: "openai",
    apiKeyEnv: "OPENAI_API_KEY",
    baseURL: undefined, // SDK default (api.openai.com)
    chatModel: "gpt-4o-mini",
    embedModel: "text-embedding-3-small",
    embedDims: 1536,
  },
  gemini: {
    name: "gemini",
    apiKeyEnv: "GEMINI_API_KEY",
    // Gemini's OpenAI-compatible surface — works with the openai SDK.
    // Ref: https://ai.google.dev/gemini-api/docs/openai
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    // gemini-2.5-flash: verified available + supports tool calling on the free tier.
    // (gemini-3.5-flash returned 503 / not served on this tier.) Override via AI_CHAT_MODEL.
    chatModel: "gemini-2.5-flash",
    // gemini-embedding-001 defaults to 3072 dims. We do NOT truncate — truncating
    // this model needs manual re-normalization; using the full 3072 keeps cosine clean.
    embedModel: "gemini-embedding-001",
    embedDims: 3072,
  },
};

const activeName = process.env.AI_PROVIDER || "gemini";
const active = PROVIDERS[activeName] || PROVIDERS.gemini;

export const AI = {
  // Which provider the factory returns. Default: gemini (free tier).
  provider: active.name,

  // Model ids + dims — default to the active provider, override via env.
  chatModel: process.env.AI_CHAT_MODEL || active.chatModel,
  embedModel: process.env.AI_EMBED_MODEL || active.embedModel,
  embedDims: Number(process.env.AI_EMBED_DIMS || active.embedDims),

  // Atlas Vector Search index name (created by ai/search/backfill.js).
  vectorIndex: process.env.AI_VECTOR_INDEX || "product_vector_index",

  // Safety rail on the agent loop.
  maxToolIterations: Number(process.env.AI_MAX_ITERATIONS || 5),

  // Product price unit in the V1 DB. V1 stores plain rupees (Number),
  // NOT paise. Surface prices as ₹ using this. (V2 will switch to paise.)
  priceUnit: "INR_RUPEES",
};

/* Per-model pricing in USD per 1,000,000 tokens, for the observability
   layer. Cost is stored as integer micro-USD (see obs/logCall.js):
   micro-USD = promptTokens * inputPer1M + completionTokens * outputPer1M.
   Gemini free-tier models are 0 (no billing) — honest for the free tier. */
export const PRICING = {
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.6 },
  "gpt-4o": { inputPer1M: 2.5, outputPer1M: 10 },
  "text-embedding-3-small": { inputPer1M: 0.02, outputPer1M: 0 },
  "text-embedding-3-large": { inputPer1M: 0.13, outputPer1M: 0 },
  // Gemini free tier — no cost. Update if you move to a paid tier.
  "gemini-3.5-flash": { inputPer1M: 0, outputPer1M: 0 },
  "gemini-2.5-flash": { inputPer1M: 0, outputPer1M: 0 },
  "gemini-2.0-flash": { inputPer1M: 0, outputPer1M: 0 },
  "gemini-embedding-001": { inputPer1M: 0, outputPer1M: 0 },
};

export function priceFor(model) {
  return PRICING[model] || { inputPer1M: 0, outputPer1M: 0 };
}
