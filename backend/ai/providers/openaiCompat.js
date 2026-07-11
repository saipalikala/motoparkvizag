/* ================================================
   File: backend/ai/providers/openaiCompat.js
   Shared adapter for any provider that speaks the OpenAI wire format.
   OpenAI (native) and Gemini (via its OpenAI-compatible endpoint) both
   use this — they differ only in { name, apiKeyEnv, baseURL }. Model ids
   come from AI.* so env overrides apply to the active provider.

   This factory implements the LLMProvider contract (providers/_interface.md):
   it translates our normalized transcript ⇄ OpenAI messages and normalizes
   the response, so agent/loop.js never sees a vendor shape.
   ================================================ */
import OpenAI from "openai";
import { AI } from "../config.js";

/* Normalized transcript -> OpenAI chat message array. */
function toMessages(system, messages) {
  const out = [];
  if (system) out.push({ role: "system", content: system });
  for (const m of messages) {
    if (m.role === "assistant") {
      const msg = { role: "assistant", content: m.content ?? "" };
      if (m.toolCalls?.length) {
        msg.tool_calls = m.toolCalls.map((tc) => ({
          id: tc.id,
          type: "function",
          function: { name: tc.name, arguments: JSON.stringify(tc.args ?? {}) },
        }));
      }
      out.push(msg);
    } else if (m.role === "tool") {
      out.push({ role: "tool", tool_call_id: m.toolCallId, content: m.content });
    } else {
      out.push({ role: "user", content: m.content });
    }
  }
  return out;
}

/* Our tool registry shape -> OpenAI tools array. */
function toTools(tools) {
  if (!tools?.length) return undefined;
  return tools.map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}

function safeParse(json) {
  try {
    return JSON.parse(json || "{}");
  } catch {
    return {};
  }
}

/* Retry transient provider errors (429 rate-limit, 503 overload) once with a
   short backoff. This smooths per-MINUTE rate limits; a per-DAY quota that's
   fully exhausted will still surface (handled gracefully upstream). */
async function callWithRetry(fn, { retries = 1, baseDelayMs = 3000 } = {}) {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (e) {
      const status = e?.status;
      if ((status === 429 || status === 503) && attempt < retries) {
        attempt += 1;
        await new Promise((r) => setTimeout(r, baseDelayMs * attempt));
        continue;
      }
      throw e;
    }
  }
}

/**
 * @param {object} cfg { name, apiKeyEnv, baseURL }
 * @returns LLMProvider
 */
export function createOpenAICompatProvider({ name, apiKeyEnv, baseURL }) {
  let _client = null;
  function client() {
    if (!_client) {
      const apiKey = process.env[apiKeyEnv];
      if (!apiKey) {
        throw new Error(
          `${apiKeyEnv} is not set. Add it to backend/.env before using the AI assistant (provider: ${name}).`
        );
      }
      _client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
    }
    return _client;
  }

  return {
    name,

    async chat({ system, messages, tools }) {
      const res = await callWithRetry(() =>
        client().chat.completions.create({
          model: AI.chatModel,
          messages: toMessages(system, messages),
          tools: toTools(tools),
          tool_choice: tools?.length ? "auto" : undefined,
          temperature: 0.2,
        })
      );

      const choice = res.choices[0]?.message ?? {};
      const toolCalls = (choice.tool_calls || []).map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        args: safeParse(tc.function.arguments),
      }));

      return {
        text: choice.content ?? null,
        toolCalls,
        usage: {
          promptTokens: res.usage?.prompt_tokens ?? 0,
          completionTokens: res.usage?.completion_tokens ?? 0,
        },
        model: res.model || AI.chatModel,
      };
    },

    async embed(texts) {
      const res = await callWithRetry(() =>
        client().embeddings.create({
          model: AI.embedModel,
          input: texts,
        })
      );
      return {
        vectors: res.data.map((d) => d.embedding),
        usage: { promptTokens: res.usage?.prompt_tokens ?? 0 },
        model: res.model || AI.embedModel,
      };
    },
  };
}
