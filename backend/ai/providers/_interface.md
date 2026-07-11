# LLMProvider contract

Every provider (OpenAI now; Claude / Gemini later) implements this exact shape.
The agent loop, tools, endpoints, and observability layer depend ONLY on this contract —
never on a vendor SDK — so swapping providers is a one-line env change (`AI_PROVIDER`).

```
interface LLMProvider {
  name: string

  // Chat completion with optional tool calling.
  // Input uses a NORMALIZED transcript (see below). The provider translates
  // it to its own wire format internally.
  chat({ system, messages, tools }): Promise<{
    text: string | null,            // assistant text (null when only tool calls)
    toolCalls: Array<{              // empty array when the model answered directly
      id: string,
      name: string,
      args: object                  // already JSON-parsed
    }>,
    usage: { promptTokens: number, completionTokens: number },
    model: string
  }>

  // Batch embeddings. Returns one vector per input string, order preserved.
  embed(texts: string[]): Promise<{
    vectors: number[][],
    usage: { promptTokens: number },
    model: string
  }>
}
```

## Normalized transcript (provider-agnostic)

The loop keeps history in this vendor-neutral form; each provider serializes it:

```
{ role: "user",      content: string }
{ role: "assistant", content: string|null, toolCalls?: [{ id, name, args }] }
{ role: "tool",      toolCallId: string, name: string, content: string }
```

`tools` is an array of `{ name, description, parameters }` where `parameters` is a
JSON Schema object. The provider maps this to its own tool/function-calling format.

## Adding a provider later

1. Create `providers/<vendor>.js` exporting an object satisfying the interface above.
2. Register it in `providers/index.js`.
3. Set `AI_PROVIDER=<vendor>` (+ its API key) in env.

No change to `agent/loop.js`, `agent/tools.js`, `aiController.js`, or the endpoints.
That invariant is the whole point of this layer — and the provider-swap acceptance test
(`AI_PROVIDER` flip, everything else unchanged) proves it.
