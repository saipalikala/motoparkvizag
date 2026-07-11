/* ================================================
   File: backend/ai/providers/index.js
   Provider factory. The rest of the module calls getProvider()
   and depends only on the LLMProvider contract
   (providers/_interface.md) — never on a vendor SDK.
   ================================================ */
import { AI } from "../config.js";
import openaiProvider from "./openai.js";
import geminiProvider from "./gemini.js";

// Register providers here. Adding one (e.g. a native Claude/Anthropic
// provider) = one import + one entry + AI_PROVIDER=<name>. Nothing in
// agent/loop.js, tools, or the endpoints changes.
const registry = {
  openai: openaiProvider,
  gemini: geminiProvider,
};

export function getProvider(name = AI.provider) {
  const p = registry[name];
  if (!p) {
    throw new Error(
      `Unknown AI provider "${name}". Registered: ${Object.keys(registry).join(", ")}`
    );
  }
  return p;
}
