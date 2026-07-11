/* ================================================
   File: backend/models/aiCallLog.js
   One row per LLM/provider call. This is the observability
   spine — cost, latency, tokens, which tools fired, and whether
   the turn resolved. Turns "I called an LLM" into "I can see,
   price, and debug every AI call in production."
   ================================================ */
import mongoose from "mongoose";

const aiCallLogSchema = new mongoose.Schema(
  {
    sessionId: { type: String, index: true }, // groups a conversation
    kind: { type: String, enum: ["chat", "embed", "agent-turn"], required: true },

    provider: String, // e.g. "openai"
    model: String, // e.g. "gpt-4o-mini"

    userQuery: String, // the user's message (chat/agent) — omitted for raw embeds

    toolsFired: [String], // names of tools the agent invoked this turn

    promptTokens: { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },

    // Integer money — micro-USD (1e-6 USD). Avoids floats, matching the
    // codebase's "no float money" instinct. See ai/obs/logCall.js.
    costMicroUsd: { type: Number, default: 0 },

    latencyMs: { type: Number, default: 0 },

    // Did the turn produce a usable, grounded answer (true) vs error/empty (false)?
    resolved: { type: Boolean, default: true },
    error: { type: String, default: null },
  },
  { timestamps: true }
);

aiCallLogSchema.index({ createdAt: -1 });
aiCallLogSchema.index({ resolved: 1, createdAt: -1 });

export default mongoose.model("AiCallLog", aiCallLogSchema);
