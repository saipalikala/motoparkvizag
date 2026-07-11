/* ================================================
   File: backend/ai/providers/openai.js
   OpenAI provider — native api.openai.com via the shared
   OpenAI-compatible adapter. See providers/_interface.md.
   ================================================ */
import { PROVIDERS } from "../config.js";
import { createOpenAICompatProvider } from "./openaiCompat.js";

export default createOpenAICompatProvider(PROVIDERS.openai);
