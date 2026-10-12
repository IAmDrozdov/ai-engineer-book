# 01. LLM API и цикл агента — primary-source notes

## TL;DR

- OpenAI's **Responses API** is now the primary/recommended API (`POST /v1/responses`); **Chat Completions stays supported indefinitely** as a stable primitive but gets no new agentic features going forward. [S1][S2]
- The **Assistants API is being fully shut down 2026-08-26** (announced 2025-08-26, exactly a 1-year sunset). Every call to `/v1/assistants`, `/v1/threads`, `/v1/threads/runs` will error after that date, no grace period. Migration target: Responses API (model calls, built-in tools) + Conversations API (persistence). [S3]
- Responses API is **item-based, not message-based**: `message`, `function_call`, `function_call_output`, `reasoning` are all typed `output` items correlated by `call_id`, vs. Chat Completions' single `message` per `choice`. [S1][S2]
- State can be managed 3 ways in Responses: `previous_response_id` chaining, manual replay of `output` items, or the separate **Conversations API** (`conversation` object, no 30-day TTL). Billing note: even via `previous_response_id`, all prior tokens in the chain are billed as input tokens every call — it's not free context reuse. [S2]
- **`encrypted_content`** on reasoning items (with `store:false` / ZDR orgs) lets you keep full reasoning continuity across turns without server-side state — pass the encrypted blob back in.  [S2]
- Role model: OpenAI moved `system` → **`developer`** role starting with o1-2024-12-17 (o1 and later); `system` still works but is discouraged for reasoning models — the instruction hierarchy is platform > developer > user. [S12]
- **Reasoning-effort enum expanded past the original 4 GPT-5 levels**: current OpenAPI spec lists `none, minimal, low, medium, high, xhigh, max` (default `medium`) — `xhigh`/`max`/`none` are new since the original GPT-5 launch. `verbosity` stays 3-level (`low/medium/high`). [S9]
- **Structured Outputs / `strict:true`** compiles your JSON Schema into a constrained-decoding grammar — masks every sampled token to stay schema-legal; guarantees 100% schema conformance (vs. ~80% for plain JSON mode), at the cost of a schema-compile latency hit on first use. [S8]
- OpenAI shipped **mid-stream steering** in 2026: a WebSocket `response.steer` event lets a client inject new input while a response is still generating; the model stops at a safe boundary (`incomplete_details.reason: "steered"`) and a successor response is created automatically from the queued input. This is new territory beyond simple cancel/resume. [S1]
- Anthropic's Messages API keeps the **content-block model** (`text`, `tool_use`, `tool_result`, `thinking`, `redacted_thinking`, `image`, `document`, plus `server_tool_use` for Anthropic-run tools) with `cache_control` per block (not on thinking/redacted_thinking blocks) and `stop_reason` (`end_turn`, `tool_use`, `stop_sequence`, `max_tokens`). [S5]
- Both vendors now ship **server-side context compaction**: OpenAI's `context_management: [{type: "compaction", compact_threshold}]` on Responses, Anthropic's `compact-2026-09-04` beta header returning a signed compaction block, plus Anthropic's older, more granular `clear_tool_uses_20250919` / `clear_thinking_20251015` context-editing strategies. [S1][S6][S13]
- Anthropic's thinking model bifurcated in 2026: legacy **manual "extended thinking"** (`thinking.type:"enabled"` + `budget_tokens`) is deprecated on 4.6-gen models and **rejected with a 400 on 4.7+** models; the replacement is **`thinking.type:"adaptive"`** + `output_config.effort`, where the model itself decides whether/how much to think. [S6]
- The ecosystem consensus for local/self-hosted and gateway serving is: everyone speaks **OpenAI's wire format** (vLLM, Ollama, LiteLLM, OpenRouter all expose `/v1/chat/completions`-compatible endpoints), and in Jan 2026 OpenAI + Nvidia/Vercel/OpenRouter/HuggingFace/LM Studio/Ollama/vLLM co-published **Open Responses**, an explicit, provider-neutral spec for the *Responses*-shaped wire format (not just Chat Completions). [S4][S10][S11]
- Reference agent-loop SDKs on each side: **OpenAI Agents SDK** (`agents` Python package: `Agent`, `Runner`, tools, handoffs, guardrails, sessions, tracing, now also `SandboxAgent` for long-horizon container-backed work) and **Claude Agent SDK** (`claude_agent_sdk`: `query()` / `ClaudeSDKClient`, `ClaudeAgentOptions`, hooks, MCP, permission modes) — both wrap the raw API's manual tool-loop into an automatic one. [S7][S14]

## Current state and versions (as of 2026-09-30)

**OpenAI**
- Responses API: current, actively developed, is the recommended default for new integrations. [S2]
- Chat Completions API: "will not deprecate", but is not getting new agentic capabilities (background mode, built-in tools, stateful reasoning) — those are Responses-only. [S1][S2]
- Assistants API (beta): deprecation announced 2025-08-26, **hard sunset 2026-08-26** — already passed relative to "today" being tracked, i.e. imminent/urgent for any reader still on it as of this writing. [S3]
- Model naming seen in current official examples/specs: `gpt-6-astra` (used pervasively in OpenAI's own current OpenAPI examples in place of the older `gpt-4`/`gpt-5` placeholders), alongside `o3`, `gpt-5-nano`; GPT-5.x reasoning-effort docs (`gpt-5.1`, `gpt-5.5`) still referenced for reasoning controls. Treat exact model names as a fast-moving target — confirm against `developers.openai.com/api/docs/models` at read time. [S9][S15]
- OpenAPI spec source of truth: `openai/openai-openapi` (GitHub, `openapi.yaml`, OpenAPI 3.1.0) — 112k+ lines, includes Chat Completions, Responses, Assistants (still present but marked deprecated-path), Realtime, and Beta namespaces. [S15]

**Anthropic**
- Current Claude API lineup (from `platform.claude.com/docs/en/models/overview`): **Claude Fable 5.1** (`claude-fable-5-1`, top tier, for demanding reasoning/long-horizon agentic work, $10/$50 per MTok, 1M context, 128K max output), **Claude Opus 5.5** (`claude-opus-5-5`, Anthropic's recommended default starting point, $4/$20), **Claude Sonnet 5.5** (`claude-sonnet-5-5`, $2/$10, most recent release 2026-09-28), **Claude Haiku 4.5** (`claude-haiku-4-5-20251001`, $1/$5, 200K context). A next-generation preview, **Claude Mythos** (referenced as "Claude Mythos Preview" / "Claude Mythos 5.1" in thinking and pricing docs), is already visible in official docs footnotes as of this snapshot. [S16]
- Legacy-but-still-available models: Fable 5, Opus 5, Opus 4.8/4.7/4.6/4.5, Sonnet 5, Sonnet 4.6/4.5. [S16]
- Docs domain moved: `docs.claude.com` and `platform.claude.com` both redirect canonically to **`platform.claude.com/docs/...`**. [S5]
- Extended thinking (manual `budget_tokens`) is deprecated on 4.6-gen, hard-rejected (400) on 4.7+ — current models use **adaptive thinking** + `effort`. [S6]

**Ecosystem / gateways**
- vLLM: full OpenAI-compatible server (`/v1/chat/completions`, `/v1/completions`, and now also a Responses-shaped client example `openai_responses_client_with_tools.py` in its repo), `--enable-auto-tool-choice` + `--tool-call-parser` (model-specific: `llama3_json`, `qwen3_xml`, `hermes`, etc.) + `--reasoning-parser` (e.g. `deepseek_r1`). [S17]
- Ollama: native OpenAI-compatible routes under `http://localhost:11434/v1`, supports chat completions, streaming, JSON mode, vision, tools, "thinking" control, logprobs. [S18]
- LiteLLM: Python SDK + proxy server, unifies 100+ providers behind the OpenAI request/response shape; now described as "Rust core with Python SDK" for the gateway. [S19]
- OpenRouter: hosted gateway, one OpenAI-compatible endpoint (`https://openrouter.ai/api/v1/chat/completions`) in front of 400+ models / 60+ providers, automatic fallback across providers, `:nitro` suffix for latency-optimized routing. [S20]
- **Open Responses** (openresponses.org): open spec (latest dated revision seen: 2026-04-24) formalizing the Responses-API *shape* (items, semantic streaming events, state machines) as multi-provider, not just an OpenAI-specific wire format; co-developed with Nvidia, Vercel, OpenRouter, HuggingFace, LM Studio, Ollama, vLLM. Announced publicly Jan 2026. [S4][S11]

## Timeline

- **o1-2024-12-17**: `system` role replaced by `developer` role for reasoning-model instruction hierarchy (platform > developer > user). [S12]
- **2025-08-26**: OpenAI announces Assistants API (beta) deprecation, sunset set for exactly one year out. [S3]
- **2026-01-15**: Open Responses spec first published revision (per smol.ai coverage / community post). [S4][S11]
- **2026-03-24**: Anthropic's `output-300k-2026-03-24` beta header ships — raises Message Batches API max output to 300K tokens on supported models (Opus 5.5/5, Sonnet 5.5/5, Opus 4.8/4.7/4.6, Sonnet 4.6). [S16]
- **2026-04-24**: Open Responses spec revision (dated spec page). [S10]
- **2026-06-15**: Claude Agent SDK usage on subscription plans moves to a separate monthly "Agent SDK credit," distinct from interactive usage limits (also covers Claude Code GitHub Actions, third-party apps via the Agent SDK). [S14]
- **2026-08-26**: Assistants API hard sunset — `/v1/assistants`, `/v1/threads`, `/v1/threads/runs` start erroring with no fallback. [S3]
- **2026-09-04**: Anthropic ships conversation **compaction** in beta (`compact-2026-09-04` header) — server returns a signed compaction block summarizing prior messages. [S6][S13]
- **2026-09-28**: Claude Sonnet 5.5 released (most recent Claude model release as of this snapshot). [S16]
- **2026-09-30 ("today")**: this chapter's research cutoff.

## Mechanics

### Chat Completions wire format (the baseline everyone still copies)

Request roles, per the current `ChatCompletionRequestMessage` schema, are a discriminated union on `role`: **`developer` | `system` | `user` | `assistant` | `tool` | `function` (deprecated)**. [S15]

VERBATIM [S15] (from `openai/openai-openapi` `openapi.yaml`, `ChatCompletionRequestDeveloperMessage`):
```yaml
ChatCompletionRequestDeveloperMessage:
  type: object
  title: Developer message
  description: >
    Developer-provided instructions that the model should follow, regardless of
    messages sent by the user. With o1 models and newer, `developer` messages
    replace the previous `system` messages.
```

Tool-calling round trip (Chat Completions), COMPOSED shape based on verified schema fields [S15][S8]:
```json
// 1. request
{
  "model": "gpt-6-astra",
  "messages": [{"role": "user", "content": "What's the weather in Boston?"}],
  "tools": [{
    "type": "function",
    "function": {
      "name": "get_current_weather",
      "description": "Get the current weather in a given location",
      "strict": true,
      "parameters": {
        "type": "object",
        "properties": {
          "location": {"type": "string"},
          "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]}
        },
        "required": ["location"],
        "additionalProperties": false
      }
    }
  }],
  "tool_choice": "auto",
  "parallel_tool_calls": true
}
```
VERBATIM [S15] (actual response body from the spec's own example set):
```json
{
  "created": 1699896916,
  "model": "gpt-6-astra",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": null,
      "tool_calls": [{
        "id": "call_abc123",
        "type": "function",
        "function": { "name": "get_current_weather", "arguments": "{\n\"location\": \"Boston, MA\"\n}" }
      }]
    },
    "logprobs": null,
    "finish_reason": "tool_calls"
  }],
  "usage": {
    "prompt_tokens": 82,
    "completion_tokens": 17,
    "total_tokens": 99,
    "completion_tokens_details": { "reasoning_tokens": 0, "accepted_prediction_tokens": 0, "rejected_prediction_tokens": 0 }
  }
}
```
Then the caller appends a `tool` message with `tool_call_id` matching `call_abc123` and re-sends the full history. `finish_reason` enum: `stop | length | tool_calls | content_filter | function_call (deprecated)`. [S15]

`tool_choice` (`ChatCompletionToolChoiceOption`), VERBATIM description [S15]:
> "`none` means the model will not call any tool and instead generates a message. `auto` means the model can pick between generating a message or calling one or more tools. `required` means the model must call one or more tools. Specifying a particular tool via `{"type": "function", "function": {"name": "my_function"}}` forces the model to call that tool. `none` is the default when no tools are present. `auto` is the default if tools are present."

`usage` object (with prompt caching), VERBATIM shape observed in the wild [S8 search synthesis, cross-checked against S15 schema fields]:
```json
"usage": {
  "total_tokens": 2306,
  "prompt_tokens": 2006,
  "completion_tokens": 300,
  "prompt_tokens_details": { "cached_tokens": 1920, "audio_tokens": 0 },
  "completion_tokens_details": { "reasoning_tokens": 0, "audio_tokens": 0 }
}
```

### Structured Outputs / strict mode

`response_format: {type: "json_schema", json_schema: {name, schema, strict}}`. VERBATIM schema (from `ResponseFormatJsonSchema` in the OpenAPI spec) [S15]:
```yaml
strict:
  anyOf:
    - type: boolean
      default: false
      description: |
        Whether to enable strict schema adherence when generating the output.
        If set to true, the model will always follow the exact schema defined
        in the `schema` field. Only a subset of JSON Schema is supported when
        `strict` is `true`.
```
Mechanically: strict mode compiles the JSON Schema into a constrained-decoding grammar (e.g. a finite-state automaton over tokens); every sampled token is masked to stay schema-legal. Enforces: all `required` fields present, `additionalProperties:false` implied, types match exactly. First request per unique schema pays a compile/caching cost; subsequent calls are normal latency. [S8]

### Responses API: items, not messages

Core mental model, VERBATIM [S2]: *"A message is a type of Item, as is a function_call or function_call_output."* Output correlation VERBATIM [S2]: *"tool calls and their outputs are two distinct types of Items that are correlated using a call_id."*

Function tool definition is flattened (no `type:"function"` wrapper around a nested `function` object like Chat Completions) [S2]:
```json
{ "type": "function", "name": "get_weather", "description": "Determine weather in my location", "parameters": {...} }
```

`FunctionCallOutputItemParam` schema (how a tool result is sent back), VERBATIM field list [S15]:
```yaml
FunctionCallOutputItemParam:
  properties:
    id: {..., example: fc_123}
    call_id: {type: string, maxLength: 64, minLength: 1}
    type: {enum: [function_call_output], default: function_call_output}
    output:
      oneOf:
        - {type: string, maxLength: 10485760, description: "A JSON string of the output of the function tool call."}
        - {type: array, items: {oneOf: [InputTextContentParam, InputImageContentParamAutoParam, InputFileContentParam]}}
    name: {type: string, maxLength: 128}
    namespace: {type: string, maxLength: 64, pattern: "^[a-zA-Z0-9_-]+$"}
    caller: {$ref: ToolCallCallerParam}
    status: ...
```
Note `output` can carry a max 10 MB string, or a structured array of content parts (text/image/file) — richer than Chat Completions' plain-string tool message.

Response output shape (typed items), verified structure [S2]:
```json
{
  "output": [
    { "type": "reasoning", "content": [], "summary": [] },
    { "type": "message", "status": "completed", "content": [{"type": "output_text", "text": "..."}] }
  ]
}
```
A convenience `response.output_text` helper concatenates all `output_text` parts.

**State management, 3 options** [S2]:
1. `previous_response_id` — chains responses server-side. Caveat: it does **not** carry over top-level `instructions`; resend those each call. Also, VERBATIM: *"Even when using previous_response_id, all previous input tokens for responses in the chain are billed as input tokens."*
2. Manual replay — pass prior `output` items back as `input` for full control.
3. **Conversations API** — `conversation: {id}` or a bare string; VERBATIM [S1]: *"The conversation that this response belongs to. Items from this conversation are prepended to input_items."* No 30-day TTL (unlike bare `store:true` Response objects).

`store` defaults to `true` for Responses (all accounts); for ZDR orgs OpenAI force-sets `store:false`. [S2]

**Reasoning items + encrypted reasoning**: with `store:false`/ZDR, VERBATIM [S2]: *"Each item includes encrypted_content by default when you create a response."* — pass the encrypted blob back in `input` on the next turn to preserve reasoning continuity without server-side state.

### Background mode

Set `background: true` on a Responses create call; poll via `responses.retrieve(id)` while `status` is `queued`/`in_progress`. VERBATIM code [S1]:
```python
resp = client.responses.create(model="gpt-6-astra", input="Write a very long novel about otters in space.", background=True)
while resp.status in {"queued", "in_progress"}:
    print(f"Current status: {resp.status}")
    sleep(2)
    resp = client.responses.retrieve(resp.id)
```
Can combine with `stream=True`; if the connection drops, resume via `starting_after` using the last seen `sequence_number` as cursor. Cancel with `client.responses.cancel(response_id)` — VERBATIM: *"Cancelling twice is idempotent - subsequent calls simply return the final Response object."* [S1]

### Streaming — SSE event taxonomy

Responses API streams **semantic, typed events**, not raw text chunks — each has a `sequence_number`. VERBATIM full example (3-event abbreviated trace from the spec) [S15]:
```
data: {"type":"response.created","response":{"id":"resp_67c9...","status":"in_progress","output":[],...},"sequence_number":0}
data: {"type":"response.in_progress","response":{...},"sequence_number":1}
data: {"type":"response.completed","response":{"id":"resp_67c9...","status":"completed","output":[{"id":"msg_67c9...","type":"message","status":"completed","role":"assistant","content":[{"type":"output_text","text":"Hi there! How can I assist you today?","annotations":[],"logprobs":[]}]}],"usage":{"input_tokens":37,"output_tokens":11,"output_tokens_details":{"reasoning_tokens":0},"total_tokens":48,"input_tokens_details":{"cached_tokens":0,"cache_write_tokens":0}}},"sequence_number":13}
```
Full observed event-type inventory (grepped from the live OpenAPI spec — this is the actual current surface, much larger than the "delta" events usually documented) [S15]:
`response.created, response.in_progress, response.completed, response.failed, response.incomplete, response.queued, response.cancelled, response.done, response.output_item.added, response.output_item.done, response.content_part.added, response.content_part.done, response.output_text.delta, response.output_text.done, response.output_text.annotation.added, response.refusal.delta, response.refusal.done, response.function_call_arguments.delta, response.function_call_arguments.done, response.custom_tool_call_input.delta, response.custom_tool_call_input.done, response.reasoning_text.delta, response.reasoning_text.done, response.reasoning_summary_part.added, response.reasoning_summary_part.done, response.reasoning_summary_text.delta, response.reasoning_summary_text.done, response.audio.delta, response.audio.done, response.audio.transcript.delta/done, response.output_audio.*, response.output_audio_transcript.*, response.web_search_call.*, response.file_search_call.*, response.code_interpreter_call.*, response.code_interpreter_call_code.delta/done, response.image_generation_call.*, response.mcp_call.*, response.mcp_call_arguments.delta/done, response.mcp_list_tools.*, response.compaction.compacting, response.steer, response.steer.accepted, response.steer.pending, response.steer.failed, response.inject, response.inject.created, response.inject.failed`. [S15]

**New in 2026 — mid-stream steering**: `response.steer` (WebSocket, client→server) lets you inject new input while a response is still generating. The model stops at "a safe output boundary" and reports why via `incomplete_details.reason`, whose enum now includes VERBATIM [S15]: `max_output_tokens | max_messages | content_filter | steered`. If steering arrives while the model is blocked on a client tool result / approval, `response.steer.pending` fires after `response.completed`, and the caller must fill the pending event's stub with the saved result and issue one explicit `response.create` per parent — VERBATIM warning: *"Do not resend accepted input while it is still queued."* [S15] This is qualitatively new vs. simple cancel-then-resend.

Chat Completions streaming stays classic SSE deltas ending in a literal `data: [DONE]` (Open Responses spec explicitly preserves this terminal marker too). [S10]

### Anthropic Messages API — content blocks & tool loop

Roles: `user`, `assistant`; `system` is a **top-level string/array parameter**, not a message role. [S5]

Request content block types: `text`, `image`, `document`, `thinking` (replay-only: `{type:"thinking", thinking, signature}`), `redacted_thinking` (`{type:"redacted_thinking", data}`), `tool_use`, `tool_result`. Response adds `server_tool_use` (Anthropic-run tools) and matching `*ToolResultBlockParam` types (`web_search_tool_result`, `web_fetch_tool_result`, `code_execution_tool_result`). [S5]

`cache_control`: `{"type": "ephemeral", "ttl": "5m" | "1h"}` (default 5m) — attachable to `text`, `image`, `document`, `tool_use`, `tool_result`; **not** attachable to `thinking`/`redacted_thinking` blocks (a common 400-error source reported across multiple 2026 community bug reports against LiteLLM/other proxies mishandling this). [S5]

Full tool round trip, VERBATIM [S13] (from `platform.claude.com/docs/en/agents-and-tools/tool-use/overview`, Python):
```python
tools = [{
    "name": "get_weather",
    "description": "Get the current weather for a given location.",
    "input_schema": {
        "type": "object",
        "properties": {"location": {"type": "string", "description": "City and state, e.g. San Francisco, CA"}},
        "required": ["location"],
    },
}]
messages = [{"role": "user", "content": "What's the weather in San Francisco?"}]

response = client.messages.create(
    model="claude-opus-5-5", max_tokens=1024, tools=tools,
    tool_choice={"type": "auto", "disable_parallel_tool_use": True},
    messages=messages,
)
tool_use = next(block for block in response.content if block.type == "tool_use")

weather = "15 degrees Celsius, partly cloudy"
messages += [
    {"role": "assistant", "content": response.content},
    {"role": "user", "content": [{"type": "tool_result", "tool_use_id": tool_use.id, "content": weather}]},
]
followup = client.messages.create(model="claude-opus-5-5", max_tokens=1024, tools=tools,
    tool_choice={"type": "auto", "disable_parallel_tool_use": True}, messages=messages)
```
Note: the **tool result goes in a `user`-role message**, not a separate `tool` role (unlike OpenAI) — this is one of the sharpest wire-format differences between the two APIs.

`tool_choice` types: `auto` (default), `any` (must call some tool), `tool` (force one named tool), `none`. `disable_parallel_tool_use: true` caps to one call per turn. `strict: true` on a tool definition enforces exact schema conformance (Anthropic's equivalent of OpenAI's strict mode). [S13]

Stop reasons (response-level `stop_reason`), VERBATIM enum [S5]: `end_turn | tool_use | stop_sequence | max_tokens`.

Usage object VERBATIM [S5]:
```json
"usage": { "input_tokens": 150, "output_tokens": 50, "cache_creation_input_tokens": 0, "cache_read_input_tokens": 0 }
```
Extended/adaptive thinking adds `usage.output_tokens_details.thinking_tokens` (final `message_delta` event only, when streaming). [S6]

Tool-use system-prompt token overhead is priced separately and tabulated per model, e.g. Claude Opus 5.5: 286 tokens (auto/none tool_choice); Claude Sonnet 4.6: 497/589 tokens (auto,none / any,tool). [S13]

Streaming: `content_block_delta` events carry `delta.type` of `text_delta`, `thinking_delta`, or `signature_delta` (the signature arrives just before `content_block_stop`, used to verify thinking-block integrity across turns). Example deltas [S6 cross-search synthesis]:
```json
{"type": "content_block_delta", "index": 0, "delta": {"type": "thinking_delta", "thinking": "I need to find the GCD..."}}
{"type": "content_block_delta", "index": 0, "delta": {"type": "signature_delta", "signature": "EqQBCgIYAhIM1gbcDa9GJwZA2b3h..."}}
```

### Adaptive thinking vs. legacy extended thinking (Anthropic)

Manual mode VERBATIM curl [S6]:
```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" -H "anthropic-version: 2023-06-01" -H "content-type: application/json" \
  -d '{"model":"claude-sonnet-4-6","max_tokens":16000,"thinking":{"type":"enabled","budget_tokens":10000},
       "messages":[{"role":"user","content":"Are there an infinite number of prime numbers such that n mod 4 == 3?"}]}'
```
Rules: `budget_tokens` min 1024, must be `< max_tokens` (exception: interleaved thinking, where the budget spans the whole assistant turn and can exceed `max_tokens`); no cache pre-warming (`max_tokens:0`) combinable with thinking. Migration mapping, VERBATIM [S6]:
```json
// before
{"model":"claude-sonnet-4-6","max_tokens":16000,"thinking":{"type":"enabled","budget_tokens":10000}}
// after
{"model":"claude-sonnet-4-6","max_tokens":16000,"thinking":{"type":"adaptive"},"output_config":{"effort":"high"}}
```
Per-model status (2026 lineup): Claude 4.5-and-earlier models that support thinking → extended-only. Claude Opus 4.6/Sonnet 4.6 → extended deprecated (still works). **Claude 4.7 and later (Opus 5.5, Sonnet 5, Sonnet 5.5, Fable 5.1) → `type:"enabled"` returns a 400.** Claude Opus 4.5 is the only extended-thinking-only model that also supports `effort` (set both `budget_tokens` and `effort` there). [S6]

Interleaved thinking (reasoning between tool calls in one turn): beta header `interleaved-thinking-2025-05-14` needed on Opus 4.5/Sonnet 4.5/earlier-4-gen manual mode; on 4.6-gen it's deprecated-but-functional (Sonnet 4.6) or entirely replaced by adaptive mode (Opus 4.6, which has *no* manual-mode interleaving). Haiku 4.5 doesn't support it at all (header accepted, ignored). [S6]

### Context compaction (both vendors, 2026)

**OpenAI Responses**, VERBATIM schema [S15]:
```yaml
ContextManagementParam:
  properties:
    type: {type: string, description: "Currently only 'compaction' is supported."}
    compact_threshold: {type: integer, minimum: 1000}
```
Example (VERBATIM from spec) [S15]: `context_management: [{type: compaction, compact_threshold: 1000}]`. Streaming exposes `response.compaction.compacting`, which VERBATIM [S1]: *"Reports newly sampled summary output at most once every 30 seconds"* during compaction, and carries no summary content itself.

**Anthropic Messages**, beta header `compact-2026-09-04`: send top-level `compaction` param, API returns a signed compaction block summarizing prior messages. [S6] Distinct from the older, more surgical **context editing** (beta `context-management-2025-06-27`) which offers `clear_tool_uses_20250919` (auto-clears old tool results past an `input_tokens`/`tool_uses` trigger, configurable `keep`, `clear_at_least`, `exclude_tools`) and `clear_thinking_20251015` (clears old thinking blocks, `keep: {type: thinking_turns, value: N}` or `"all"`). VERBATIM applied-edits response shape [S6]:
```json
"context_management": {
  "applied_edits": [
    {"type": "clear_thinking_20251015", "cleared_thinking_turns": 3, "cleared_input_tokens": 15000},
    {"type": "clear_tool_uses_20250919", "cleared_tool_uses": 8, "cleared_input_tokens": 50000}
  ]
}
```
When combining edits, `clear_thinking_20251015` must be listed first. [S6]

### Gemini API (side-by-side)

Roles: `user`, `model` (not `assistant`); tool results also go back with `role:"user"`. `systemInstruction` is a separate top-level field. Thinking control moved from `thinking_budget` (legacy) to `thinkingConfig.thinking_level` (`minimal | low | medium | high`, default `high`) — the two are mutually exclusive in one request. [S21]

VERBATIM-shaped function calling exchange (per current docs) [S21]:
```json
// request
{"contents":[{"role":"user","parts":[{"text":"..."}]}],
 "tools":[{"functionDeclarations":[{"name":"...","description":"...","parameters":{"type":"object","properties":{...},"required":[...]}}]}]}
// model turn
{"role":"model","parts":[{"functionCall":{"name":"...","args":{...}},"thoughtSignature":"<opaque>"}]}
// tool result turn
{"role":"user","parts":[{"functionResponse":{"name":"...","response":{...}}}]}
```
`thoughtSignature` is Gemini's analogue of Anthropic's `signature`/OpenAI's `encrypted_content` — an opaque continuity token for chain-of-thought across a function-calling turn, normally handled by the official SDKs. [S21]

### Chat templates / Harmony (how messages actually become tokens)

Every open-weight chat model has its own **chat template** (usually Jinja2) mapping `{role, content}` dicts to a literal token sequence with model-specific control tokens; there is no universal format. HF's `apply_chat_template(messages, tokenize=..., add_generation_prompt=...)` renders it. VERBATIM contrast of two templates over the same messages, same base model (Mistral-7B) [S22]:
```
Mistral-7B-Instruct: <s>[INST] Hello, how are you? [/INST]I'm doing great...</s> [INST] ... [/INST]
Zephyr-7B-beta:      <|user|>\nHello, how are you?</s>\n<|assistant|>\nI'm doing great...
```
`add_generation_prompt=True` appends the tokens that open an assistant turn (e.g. `<|assistant|>\n`) — omit it and a base-style model may just continue the user's text instead of replying. `continue_final_message=True` does the opposite: strips EOS to let generation continue *inside* the last message (prefill), including into a named field like `reasoning_content` (Qwen) or `thinking` (Gemma) rather than `content`. [S22]

**Harmony** is OpenAI's own chat-template format, purpose-built for the open-weight **gpt-oss** models, explicitly designed to mirror the Responses API's shape (multiple output channels, tool namespaces, structured outputs, instruction hierarchy). VERBATIM rendered example [S23]:
```text
<|start|>system<|message|>You are ChatGPT, a large language model trained by OpenAI.
Knowledge cutoff: 2024-06
Current date: 2025-06-28

Reasoning: high

# Valid channels: analysis, commentary, final. Channel must be included for every message.
Calls to these tools must go to the commentary channel: 'functions'.<|end|>
<|start|>developer<|message|># Instructions
Always respond in riddles
# Tools
## functions
namespace functions {
// Gets the location of the user.
type get_location = () => any;
// Gets the current weather in the provided location.
type get_current_weather = (_: {
location: string,
format?: "celsius" | "fahrenheit", // default: celsius
}) => any;
} // namespace functions<|end|><|start|>user<|message|>What is the weather like in SF?<|end|><|start|>assistant
```
Channels: `analysis` (chain-of-thought), `commentary` (tool-call preambles / function calls), `final` (the user-visible answer) — every message must declare its channel. If you consume gpt-oss via a provider (HF, Ollama, vLLM) the harness renders/parses Harmony for you; only do it by hand if you're writing your own inference stack. Reference implementation: `openai-harmony` (Rust core + Python bindings via PyO3, also a Rust crate). [S23]

### The canonical agent loop

Minimal ~50-line Python loop over the OpenAI Chat Completions wire format. COMPOSED (assembled from verified wire-format facts above: `tool_calls`, `tool_call_id`, `finish_reason`, `parallel_tool_calls`) — not copied from any single source:
```python
import json
from openai import OpenAI

client = OpenAI()
MAX_ITERS = 10

def run_agent(user_msg: str, tools: list, tool_impls: dict, model="gpt-6-astra"):
    messages = [{"role": "user", "content": user_msg}]
    for _ in range(MAX_ITERS):
        resp = client.chat.completions.create(
            model=model, messages=messages, tools=tools, tool_choice="auto",
        )
        choice = resp.choices[0]
        messages.append(choice.message.model_dump(exclude_none=True))

        if choice.finish_reason == "stop":
            return choice.message.content
        if choice.finish_reason != "tool_calls":
            raise RuntimeError(f"unhandled finish_reason: {choice.finish_reason}")

        for call in choice.message.tool_calls:
            fn = tool_impls[call.function.name]
            try:
                args = json.loads(call.function.arguments)
                result = fn(**args)
                content = json.dumps(result)
            except Exception as e:
                content = json.dumps({"error": str(e)})
            messages.append({
                "role": "tool",
                "tool_call_id": call.id,
                "content": content,
            })
    raise RuntimeError("max iterations exceeded")
```
Stop conditions in practice: `finish_reason == "stop"` (natural end), `finish_reason == "length"` (hit `max_tokens` — treat as a failure/retry-with-more-budget condition, not success), a hard `MAX_ITERS` guard against infinite tool-call loops, and application-level goal checks. Retries belong around the `client.chat.completions.create` call for 429/5xx with exponential backoff + jitter, honoring `Retry-After` as a *minimum* wait — OpenAI ships worked examples with `tenacity`/`backoff`. [S24]

### Rate limits (OpenAI)

Limit types: RPM, TPM, RPD, TPD, IPM (images/min), audio-minutes/min for streaming audio — VERBATIM: *"Rate limits can be hit across any of the options depending on what occurs first."* Batch API queue limits are computed separately from total queued input tokens. Response headers: `Retry-After`, `x-ratelimit-limit-requests`, `x-ratelimit-remaining-requests`, `x-ratelimit-reset-requests`, and token-equivalents, plus project-scoped variants. [S24]

## Numbers

- Structured Outputs strict mode: **100% schema conformance** vs **~80%** for plain JSON mode (OpenAI's own framing, no dataset/date attached in the sources found — treat as vendor claim). [S8]
- Constrained decoding "quality tax": reported as "sometimes zero, sometimes fifteen percent on hard prompts" — third-party synthesis, no controlled benchmark cited; flagged low-confidence. [S8]
- Anthropic tool-use system-prompt token overhead, per model, `tool_choice=auto/none` vs `any/tool` (Anthropic's own published table, current as of 2026-09-30) [S13]:
  - Claude Opus 5.5: 286 tokens (single column — `any/tool` not listed, i.e. same or not priced separately for this model)
  - Claude Sonnet 4.6 / Claude Opus 4.6: 497 / 589 tokens
  - Claude Opus 4.5 / Sonnet 4.5 / Haiku 4.5: 496 / 588 tokens
  - Claude Opus 4.1, Opus 4, Sonnet 4 (retired): 313 / 315 tokens
  - Claude Haiku 3.5 (retired): 264 / 355 tokens
- Anthropic prompt-cache read discount: 10% of base input price generally, but **2.5%** on Claude Fable 5.1 / Claude Mythos 5.1, **5%** on Claude Opus 5.5 — i.e. top-tier models get cheaper cache reads. [S16]
- Anthropic 1M-token context window ≈ 555k words / 2.5M Unicode chars on the tokenizer introduced with Opus 4.7; pre-4.7 models fit ~750k words in the same 1M tokens (tokenizer changed token density). [S16]
- Manual-thinking cache invalidation experiment (Anthropic, Sonnet 4.6, their own measurement) [S6]:
  ```
  1st request (cache create):  cache_creation_input_tokens=1370, cache_read=0, input=17,  output=700
  2nd request (same budget):   cache_creation_input_tokens=0,    cache_read=1370, input=303, output=874
  3rd request (budget 4000→8000): cache_creation_input_tokens=1370, cache_read=0, input=747, output=619
  ```
  Demonstrates: any change to `budget_tokens` between requests fully invalidates the cache breakpoint.
- Extended-thinking budget floor: 1,024 tokens minimum; Anthropic recommends batch processing above ~32K thinking tokens to avoid timeouts/open-connection limits on long-running requests. [S6]

## Pitfalls, limits, criticism

- **`previous_response_id` is not a token-savings mechanism** — OpenAI explicitly bills all prior tokens in the chain as input tokens on every call; it saves *client-side* bookkeeping, not money, unless combined with prompt caching. [S2]
- **`previous_response_id` doesn't carry `instructions`** — a common migration bug: devs assume the whole prior "system prompt" persists and it silently doesn't; must resend `instructions` every call. [S2]
- **`cache_control` on a `thinking`/`redacted_thinking` block is a 400 error** — multiple 2026 GitHub issues (Microsoft's `amplifier-module-provider-anthropic`, LiteLLM, `zeroclaw`, `openclaw`) hit this from proxy/translation layers that naively copy cache breakpoints onto whatever the last block was. [S27]
- **Extended thinking → adaptive thinking is a behavioral change, not just a rename**: with a fixed budget, Claude always thinks; with adaptive + low effort, it may skip thinking entirely on easy inputs — silently changes latency/cost profiles after a "simple" migration. [S6]
- **Switching thinking mode/budget invalidates prompt cache breakpoints** — a subtle regression source when A/B-testing effort levels against a cached long-context prompt. [S6]
- **`gpt-oss` (Harmony format) models must not be run without the harmony chat template** — README states plainly it "will not work correctly" otherwise; anyone hand-rolling inference on gpt-oss needs the full Harmony spec, not an approximation. [S23]
- **`reasoning_effort: "none"` exists but is model-specific** — not every reasoning model accepts every level of the now 7-value enum (`none/minimal/low/medium/high/xhigh/max`); check per-model support before relying on it. [S9]
- **Assistants API migration is a hard cliff, not a glide path**: no degraded mode after 2026-08-26 sunset — every call just errors. Anyone still on it needs an active migration plan now, not "eventually." [S3]
- Constrained decoding's accuracy/format tradeoff is contested: the "Let Me Speak Freely?" line of research (pre-2026, still cited in 2026 discussions) argues format restrictions can measurably hurt reasoning-heavy task accuracy versus letting the model "speak freely" and parsing after — strict JSON isn't a free lunch for every task type. [S8, secondary]

## What changed in the last 6 months (roughly March–September 2026)

- Anthropic: `compact-2026-09-04` beta (server-side compaction with signed compaction blocks) — newer and more automatic than the March-era `context-management-2025-06-27` editing strategies. [S6]
- Anthropic: `output-300k-2026-03-24` beta raises Message Batches max output to 300K tokens on flagship models. [S16]
- Anthropic: Claude Sonnet 5.5 released 2026-09-28 — two days before this research's "today." [S16]
- Anthropic: "Claude Mythos" appears in current docs as a preview/next-gen model referenced in thinking and pricing pages, ahead of a presumed GA. [S6][S16]
- OpenAI: Open Responses spec dated revision 2026-04-24 published (vs. the initial 2026-01-15 announcement) — actively iterating, not a one-off announcement. [S10]
- OpenAI: `response.steer` / `response.inject` WebSocket events for the Responses API — genuinely new mid-generation-control primitives not present in the original 2025 Responses API launch. [S15]
- OpenAI: `ReasoningEffort` enum widened from the original 4 GPT-5 values to 7 (`none, minimal, low, medium, high, xhigh, max`). [S9]
- OpenAI Agents SDK: added `SandboxAgent` / `Manifest` / `SandboxRunConfig` for long-horizon, container-backed agent work (inspect files, run commands, apply patches, persist workspace state) — a new agent archetype alongside the original text/realtime/voice agents. [S7]
- Claude Agent SDK: billing split (2026-06-15) — Agent SDK usage now draws from a dedicated monthly credit pool separate from interactive Claude usage. [S14]

## Diagram candidates

1. **Chat Completions vs Responses API item model** — actors: client, API; boxes: `messages[]`/`choices[]` (left) vs `input[]`/`output[]` typed items (right); arrows labeled `tool_calls` / `function_call`+`function_call_output` correlated by id.
2. **The canonical agent loop as a state machine** — states: `awaiting_model`, `model_responded (stop|tool_calls|length)`, `executing_tools`, `appending_results`, `max_iters_exceeded`; arrows are the loop transitions with guard conditions.
3. **OpenAI Responses state management: three paths** — one diagram, three parallel arrows from "turn N" to "turn N+1": (a) `previous_response_id` chain, (b) manual item replay, (c) Conversations API `conversation.id`, each annotated with its billing/TTL behavior.
4. **Background mode lifecycle** — states `queued → in_progress → completed/failed/cancelled`, with a parallel streaming lane showing `sequence_number` cursor + `starting_after` resume arrow after a dropped connection.
5. **Mid-stream steering (`response.steer`)** — timeline: model generating → WebSocket `response.steer` arrives → model reaches "safe output boundary" → `incomplete_details.reason:"steered"` → automatic successor `response.create`. Show the `response.steer.pending` branch when blocked on a client tool.
6. **Anthropic tool_use / tool_result round trip** — actors: client, Claude; note the `tool_result` rides in a `user`-role message (contrast with OpenAI's separate `tool` role) — this asymmetry is worth its own callout box.
7. **Extended (manual) vs adaptive thinking, side by side** — same task, two lanes: fixed `budget_tokens` (deterministic thinking-token spend) vs `type:"adaptive"` + `effort` (model decides whether/how much to think); show the 4.6→4.7 model-generation cutover where manual mode stops being accepted.
8. **Context compaction/editing mechanisms compared** — one row per mechanism (OpenAI `context_management.compaction`, Anthropic `compact-*` beta, Anthropic `clear_tool_uses_*`, Anthropic `clear_thinking_*`): trigger condition → what gets removed/summarized → cache impact.
9. **Harmony format channels** — one box per channel (`analysis`, `commentary`, `final`) with arrows showing what content type flows into each (chain-of-thought → analysis; tool-call preambles/function calls → commentary; user-visible answer → final).
10. **Provider wire-format convergence map** — center node "OpenAI Chat Completions shape"; spokes to vLLM, Ollama, LiteLLM, OpenRouter (all speak it natively); a second convergence node "Open Responses spec" with spokes to the same providers plus HuggingFace/LM Studio, showing the newer Responses-shape convergence layered on top.

**Chart candidates**
- Reasoning-effort level count over time: 4 levels (GPT-5 launch) → 7 levels (`none...max`, current) — a simple step chart if exact dates per added level can be sourced (not fully sourced here; flagged in Unverified).
- Anthropic tool-use system-prompt token overhead by model generation (bar chart) — data pulled from the "Numbers" section table above, source [S13], all same date/measurement context.
- Anthropic prompt-cache-read discount by model tier (10% baseline vs 5% Opus 5.5 vs 2.5% Fable/Mythos 5.1) — bar chart, source [S16].

## Glossary

- **Item** (Responses API): the atomic unit of input/output — `message`, `function_call`, `function_call_output`, `reasoning`, etc. — replacing Chat Completions' single `message`/`choice`.
- **`previous_response_id`**: server-side pointer chaining a new Responses call to a prior one's context (without re-sending full history client-side; still billed as input tokens).
- **Conversations API**: separate OpenAI resource (`conversation` object) for persisting chat history with no 30-day TTL, orthogonal to the `previous_response_id` chain mechanism.
- **Encrypted reasoning content** (`encrypted_content`): opaque, signed reasoning payload returned on reasoning items under `store:false`/ZDR, replayable on the next turn to preserve reasoning continuity without server state.
- **Strict mode / Structured Outputs**: constrained decoding that masks token sampling to guarantee JSON Schema conformance.
- **`developer` role**: OpenAI message role that replaced `system` for o1-and-later models in the instruction hierarchy.
- **`tool_choice`**: parameter controlling whether/which tool the model must call (`none`/`auto`/`required`/named, OpenAI; `auto`/`any`/`tool`/`none`, Anthropic).
- **`disable_parallel_tool_use`**: Anthropic flag forcing at most one tool call per turn.
- **Extended thinking**: Anthropic's legacy manual reasoning-budget mode (`thinking.type:"enabled"`, `budget_tokens`), deprecated/rejected on 4.7+ models.
- **Adaptive thinking**: Anthropic's current mode (`thinking.type:"adaptive"`) where the model decides whether/how much to think, steered by `output_config.effort`.
- **Interleaved thinking**: reasoning between tool calls within a single assistant turn (vs. only before the first tool call).
- **Context compaction**: server-side summarization of prior conversation to shrink input tokens (OpenAI `context_management.compaction`; Anthropic `compact-*` beta signed compaction block).
- **Context editing**: Anthropic's more surgical alternative to compaction — deterministic clearing rules (`clear_tool_uses_*`, `clear_thinking_*`) rather than summarization.
- **Harmony**: OpenAI's chat-template/response format for the open-weight gpt-oss models, with named channels (`analysis`/`commentary`/`final`).
- **Open Responses**: multi-provider open specification standardizing the Responses-API item/event shape across vendors (not an OpenAI-only format).
- **`thoughtSignature`** (Gemini): opaque continuity token for chain-of-thought across a function-calling turn, analogous to Anthropic's `signature`/OpenAI's `encrypted_content`.
- **Chat template**: a per-model (usually Jinja2) rendering function mapping `{role, content}` message dicts to the literal token sequence the model was fine-tuned on.
- **`add_generation_prompt`**: chat-template flag appending the tokens that open a new assistant turn.
- **`continue_final_message`** (a.k.a. prefill): chat-template flag that strips end-of-sequence tokens so generation continues inside the last message instead of starting a new one.

## Unverified / open questions

- Exact dates each new `reasoning_effort` value (`none`, `xhigh`, `max`) was added are not pinned down — only that the current spec has all 7; tried grepping the OpenAPI spec's own changelog references but didn't find dated additions for this specific enum. Treat "GPT-5 launch had 4 levels → now 7" as directionally true, not precisely dated.
- "Claude Mythos" — confirmed present in official docs (thinking page: "Claude Mythos Preview"; models-overview footnote: "Claude Mythos 5.1" cache pricing) but **no dedicated Mythos model page was opened**, so its full spec (context window, pricing, GA date) is not verified here — only that it exists as of 2026-09-30, appears to sit above/alongside Fable 5.1, and is at minimum in preview.
- OpenAI Agents SDK's exact relationship/version-compatibility with the Assistants API sunset (does it auto-migrate Assistants-based code?) was not directly checked — only that the SDK "supports Responses and Chat Completions APIs, as well as 100+ other LLMs" per its own README.
- The "15% quality tax on hard prompts" figure for structured-outputs strict mode has no named benchmark, model, or date attached in any source opened — flagged low-confidence, included only as a directional criticism.
- Full current parameter list for OpenAI's `responses.create` (e.g. `truncation`, `top_p`, full `include` enum, `access_programs`) was only partially extracted; the OpenAPI YAML has it in full but wasn't exhaustively transcribed here for space — worth a follow-up pass if the chapter needs the complete parameter reference table.
- vLLM's native Responses-API server support (`openai_responses_client_with_tools.py` example seen in-repo) — only the file's existence was confirmed, not whether vLLM's server-side `/v1/responses` endpoint is feature-complete vs. Chat Completions.
- OpenAI Realtime API and voice-agent wire format were out of scope here (belongs more to future chapters or is a stretch topic) and were not researched in depth.

## Sources

- [S1] "Background mode" + Responses guide pages, OpenAI, developers.openai.com/api/docs/guides/background, accessed 2026-09-30 (no explicit publish date on page; current live doc).
- [S2] "Migrate to the Responses API", OpenAI, developers.openai.com/api/docs/guides/migrate-to-responses, accessed 2026-09-30.
- [S3] "Assistants API beta deprecation — August 26, 2026 sunset", OpenAI Developer Community (official OpenAI announcement thread), community.openai.com/t/assistants-api-beta-deprecation-august-26-2026-sunset/1354666, announcement dated 2025-08-26, accessed 2026-09-30.
- [S4] "Open Responses: explicit spec for OpenAI's Responses API supported by OpenRouter, Ollama, Huggingface, vLLM, et al", smol.ai news digest, news.smol.ai/issues/26-01-15-openresponses, dated 2026-01-15, accessed 2026-09-30.
- [S5] Claude Messages API reference, Anthropic, platform.claude.com/docs/en/api/messages, accessed 2026-09-30.
- [S6] "Extended thinking", Anthropic, platform.claude.com/docs/en/build-with-claude/extended-thinking, accessed 2026-09-30 (page describes 2026 model-generation cutover, dated beta headers up to compact-2026-09-04).
- [S7] OpenAI Agents SDK README, GitHub `openai/openai-agents-python`, raw.githubusercontent.com/openai/openai-agents-python/main/README.md, accessed 2026-09-30.
- [S8] Synthesis of OpenAI structured-outputs strict-mode documentation and third-party analysis (futureagi.com, gptmap.org, ergini.com, respan.ai — 2026 posts) cross-checked against [S15]'s `ResponseFormatJsonSchema` schema, accessed 2026-09-30.
- [S9] `openai/openai-openapi` `openapi.yaml`, `ReasoningEffort` and `Verbosity` schema definitions, GitHub `openai/openai-openapi` master branch, accessed 2026-09-30.
- [S10] "Specification 2026-04-24", Open Responses, openresponses.org/specification/2026-04-24, accessed 2026-09-30.
- [S11] "Open Responses for the Open Source Community", OpenAI Developer Community / OpenAI Devs (X post cited), community.openai.com/t/open-responses-for-the-open-source-community/1371770 and x.com/OpenAIDevs/status/2011862984595795974, accessed 2026-09-30.
- [S12] Synthesis: lunary.ai/blog/openai-developer-role; spring-projects/spring-ai GitHub issue #2863; vercel/ai GitHub issue #4928 — all describing the o1-2024-12-17 `developer` role change, accessed 2026-09-30.
- [S13] "Tool use with Claude" overview, Anthropic, platform.claude.com/docs/en/agents-and-tools/tool-use/overview, accessed 2026-09-30.
- [S14] Synthesis: inventivehq.com/blog/claude-agent-sdk-guide; code.claude.com/docs/en/agent-sdk/python (Claude Agent SDK Python reference), accessed 2026-09-30.
- [S15] `openai/openai-openapi` `openapi.yaml`, raw.githubusercontent.com/openai/openai-openapi/master/openapi.yaml, OpenAPI 3.1.0, fetched in full (112,973 lines) 2026-09-30 — primary source for Chat Completions/Responses schemas, streaming event enum, `ContextManagementParam`, `FunctionTool`, `FunctionCallOutputItemParam`.
- [S16] "Models overview", Anthropic, platform.claude.com/docs/en/models/overview, accessed 2026-09-30.
- [S17] vLLM docs, "Tool Calling" and "OpenAI-Compatible Server" pages, docs.vllm.ai/en/latest/features/tool_calling/ and docs.vllm.ai, accessed 2026-09-30.
- [S18] "OpenAI compatibility", Ollama, docs.ollama.com/api/openai-compatibility, accessed 2026-09-30.
- [S19] BerriAI/litellm GitHub repository README, github.com/BerriAI/litellm, accessed 2026-09-30.
- [S20] OpenRouter overview, synthesis of futureagi.com/blog/what-is-openrouter-2026, deployhq.com/blog/openrouter-practical-guide-teams, promptfoo.dev/docs/providers/openrouter, accessed 2026-09-30.
- [S21] Gemini API docs, "Gemini 3 developer guide" and "Gemini thinking", ai.google.dev/gemini-api/docs/generate-content/gemini-3 and ai.google.dev/gemini-api/docs/generate-content/thinking, accessed 2026-09-30.
- [S22] "Chat templates", Hugging Face Transformers docs, huggingface.co/docs/transformers/en/chat_templating, accessed 2026-09-30.
- [S23] OpenAI Harmony README, GitHub `openai/harmony`, raw.githubusercontent.com/openai/harmony/main/README.md, accessed 2026-09-30.
- [S24] OpenAI rate-limits guide, developers.openai.com/api/docs/guides/rate-limits, accessed 2026-09-30.
- [S27] GitHub issues re: `cache_control` on thinking blocks — microsoft/amplifier-module-provider-anthropic PR #99, BerriAI/litellm PR #39815, openclaw/openclaw issue #140607, zeroclaw-labs/zeroclaw issue #10889, accessed 2026-09-30.
