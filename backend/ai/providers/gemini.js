/* ================================================
   File: backend/ai/providers/gemini.js
   Google Gemini provider via its OpenAI-compatible endpoint
   (https://ai.google.dev/gemini-api/docs/openai), reusing the
   shared adapter. Chat + tool calling + embeddings all supported.
   Free tier — no card required. See providers/_interface.md.
   ================================================ */
import { PROVIDERS } from "../config.js";
import { createOpenAICompatProvider } from "./openaiCompat.js";

export default createOpenAICompatProvider(PROVIDERS.gemini);
