/* ================================================
   File: backend/ai/obs/logCall.js
   Cost accounting + persistence for every provider call.
   Logging must NEVER break the user request — all writes are
   best-effort and swallow their own errors.
   ================================================ */
import AiCallLog from "../../models/aiCallLog.js";
import { priceFor } from "../config.js";

/* Integer micro-USD for a call.
   micro-USD = promptTokens * inputPer1M + completionTokens * outputPer1M
   (because USD-per-1M-tokens * tokens / 1e6 * 1e6 micro-USD == per1M * tokens). */
export function costMicroUsd(model, promptTokens = 0, completionTokens = 0) {
  const p = priceFor(model);
  return Math.round(promptTokens * p.inputPer1M + completionTokens * p.outputPer1M);
}

/* Persist one call. Returns the doc (or null on failure) but never throws. */
export async function logCall({
  sessionId,
  kind,
  provider,
  model,
  userQuery,
  toolsFired = [],
  promptTokens = 0,
  completionTokens = 0,
  latencyMs = 0,
  resolved = true,
  error = null,
}) {
  try {
    return await AiCallLog.create({
      sessionId,
      kind,
      provider,
      model,
      userQuery,
      toolsFired,
      promptTokens,
      completionTokens,
      costMicroUsd: costMicroUsd(model, promptTokens, completionTokens),
      latencyMs,
      resolved,
      error,
    });
  } catch (e) {
    // Observability failures are non-fatal.
    console.warn("⚠️  logCall failed:", e.message);
    return null;
  }
}
