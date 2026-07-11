/* ================================================
   File: backend/ai/agent/loop.js
   Provider-agnostic agent loop. Depends only on the LLMProvider
   contract + the tool registry — no vendor SDK, no vendor message
   shapes. Swapping AI_PROVIDER changes nothing here.
   ================================================ */
import { getProvider } from "../providers/index.js";
import { toolSchemas, toolHandlers } from "./tools.js";
import { SYSTEM_PROMPT } from "./systemPrompt.js";
import { AI } from "../config.js";
import { logCall } from "../obs/logCall.js";

/* Run one tool call, guaranteeing a JSON-serializable result even on error. */
async function runTool(name, args, ctx) {
  const handler = toolHandlers[name];
  if (!handler) return { error: `unknown tool: ${name}` };
  try {
    return await handler(args || {}, ctx);
  } catch (e) {
    return { error: e.message || "tool failed" };
  }
}

/**
 * Drive a full agent turn to a final grounded answer.
 * @param {object} p
 * @param {string} p.message      the user's new message
 * @param {Array}  [p.history]    prior normalized transcript messages
 * @param {string} [p.sessionId]  conversation id (for logs)
 * @returns {Promise<{ reply, toolsFired, iterations, usage, messages }>}
 */
export async function runAgent({ message, history = [], sessionId }) {
  const provider = getProvider();
  const messages = [...history, { role: "user", content: message }];
  const ctx = { sessionId, products: [] }; // tools push UI product cards here

  const allToolsFired = [];
  const usage = { promptTokens: 0, completionTokens: 0 };

  // Dedupe collected product cards by id, newest kept, capped for the UI.
  const uiProducts = () => {
    const seen = new Map();
    for (const p of ctx.products) if (!seen.has(p.id)) seen.set(p.id, p);
    return [...seen.values()].slice(0, 6);
  };

  for (let i = 0; i < AI.maxToolIterations; i++) {
    const started = Date.now();
    let res;
    try {
      res = await provider.chat({
        system: SYSTEM_PROMPT,
        messages,
        tools: toolSchemas,
      });
    } catch (e) {
      await logCall({
        sessionId,
        kind: "agent-turn",
        provider: provider.name,
        model: AI.chatModel,
        userQuery: i === 0 ? message : undefined,
        latencyMs: Date.now() - started,
        resolved: false,
        error: e.message,
      });
      throw e;
    }

    usage.promptTokens += res.usage.promptTokens;
    usage.completionTokens += res.usage.completionTokens;
    const firedThisTurn = res.toolCalls.map((t) => t.name);
    allToolsFired.push(...firedThisTurn);

    await logCall({
      sessionId,
      kind: "agent-turn",
      provider: provider.name,
      model: res.model,
      userQuery: i === 0 ? message : undefined,
      toolsFired: firedThisTurn,
      promptTokens: res.usage.promptTokens,
      completionTokens: res.usage.completionTokens,
      latencyMs: Date.now() - started,
      resolved: true,
    });

    // No tool calls -> the model produced its final answer.
    if (!res.toolCalls.length) {
      messages.push({ role: "assistant", content: res.text ?? "" });
      return {
        reply: res.text ?? "",
        toolsFired: allToolsFired,
        products: uiProducts(),
        iterations: i + 1,
        usage,
        messages,
      };
    }

    // Record the assistant's tool-call turn, then execute each tool.
    messages.push({ role: "assistant", content: res.text ?? "", toolCalls: res.toolCalls });
    for (const call of res.toolCalls) {
      const result = await runTool(call.name, call.args, ctx);
      messages.push({
        role: "tool",
        toolCallId: call.id,
        name: call.name,
        content: JSON.stringify(result),
      });
    }
  }

  // Hit the iteration cap without a final text answer.
  const fallback =
    "I wasn't able to finish that just now — could you rephrase or give me a bit more detail?";
  messages.push({ role: "assistant", content: fallback });
  return {
    reply: fallback,
    toolsFired: allToolsFired,
    products: uiProducts(),
    iterations: AI.maxToolIterations,
    usage,
    messages,
    cappedOut: true,
  };
}
