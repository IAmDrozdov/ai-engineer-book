# LLM API и цикл агента — engineering practice notes

## TL;DR (must-know as of 2026-09-30)

- The **Assistants API is dead**: OpenAI announced its wind-down 2025-08-26 and it sunset exactly one year later, **2026-08-26** — already past "today." No automated migration tool exists; you rebuild on Responses + Conversations manually [S4][S20].
- **Responses API has overtaken Chat Completions in token volume** and is OpenAI's recommended path "today, and for the future," per OpenAI's own deprecation post — but Chat Completions itself is *not* deprecated and has no announced shutdown date [S4][S22].
- Responses API models turns as **typed polymorphic Items** (`message`, `reasoning`, `function_call`, `function_call_output`, …) correlated by `call_id`, not as one flat `messages` array with nested tool calls — this is the single biggest mental-model shift from Chat Completions [S5][S3].
- `previous_response_id` (or the newer **Conversations API**) removes the need to replay history client-side, but **does not reduce token cost** — OpenAI still bills every prior input token in the chain on each turn [S22].
- **Reasoning items with `encrypted_content`** let you keep a model's chain-of-thought "alive" across turns in stateless (`store:false`, ZDR) setups without persisting plaintext reasoning server-side; it's decrypted in-memory, used, then re-encrypted and discarded [S6].
- **Open Responses** (launched 2026-01-15 by OpenAI as an open spec, not just an OpenAI product) tries to standardize the Responses-API shape across vendors; launch partners include OpenRouter, Hugging Face, vLLM, Ollama, LM Studio, Vercel — **Anthropic and Google DeepMind are conspicuously absent** [S2][S23].
- Anthropic's **Messages API stayed content-block-based** the whole time: `tool_use`/`tool_result` blocks with `input_schema`, a `thinking` block with a cryptographic `signature`, and `cache_control:{type:"ephemeral"}` breakpoints on up to 4 positions per request [S9][S11][S14].
- **Google quietly replaced `generateContent`/`contents` with a new Interactions API** (`client.interactions.create`, `previous_interaction_id`, `output_text`, `steps[]`) that structurally converges toward the Responses-API shape — confirmed directly from ai.google.dev's live docs on 2026-09-30 [S16][S17].
- Anthropic **deprecated manual "extended thinking" (`budget_tokens`) in the 4.6 generation and removed it outright in 4.7+**, replacing it with "adaptive thinking" (`thinking:{type:"adaptive"}` + `output_config.effort`) that decides on its own whether/how much to think [S11].
- OpenAI's reasoning-effort ladder grew: `none → low → medium → high → xhigh → max`, tied to specific 2026-era model families (docs already reference "GPT-6 Astra" / "GPT-6.1 Sol") — treat any effort string as model-family-specific and check per-model support before shipping [S21].
- **Loop vocabulary has split in two**, per Armin Ronacher (2026-06-23): the *inner* agent loop (model calls tools, sees results) vs. the *outer* harness loop (external code decides when a task is "done," restarts sessions, redirects). Confusing the two is a named anti-pattern in 2026 discourse [S10].
- The Claude Agent SDK's agent loop is turn-based with hard stop conditions you must set yourself: `max_turns` (tool-use round trips) and `max_budget_usd` (spend cap); without either, an open-ended prompt can run indefinitely [S12].
- Production tool-calling retry hygiene, everyone converges on the same recipe: read `retry-after-ms`/`x-ratelimit-remaining-*` headers, exponential backoff **with jitter** (not fixed intervals), cap retries, and batch small requests rather than firing one call per item [S30].

## Current state and versions (as of 2026-09-30)

- **OpenAI docs domain**: `platform.openai.com` now 301-redirects developer-facing guide pages to **`developers.openai.com`** (e.g. `/docs/guides/migrate-to-responses` → `developers.openai.com/api/docs/guides/migrate-to-responses`). Bookmark the new domain; old platform.openai.com links still resolve but add a hop [confirmed live, S5][S8].
- **Assistants API**: sunset 2026-08-26. Threads → Conversations, Runs → Responses, Run steps → Items, Assistants (config objects) → Prompts (dashboard-managed). OpenAI's own migration guide does not cover Code Interpreter/File Search/vector-store migration explicitly and flags that **"Reusable prompt objects are also being deprecated"** — check the current deprecations page before building on Prompts either [S20].
- **Responses API** is the default recommended integration surface; Chat Completions remains supported, unscheduled for removal, but is the "foundational" (legacy-shaped) API now [S5][S22].
- **Anthropic Messages API**: current model line referenced in live docs includes `claude-opus-5-5`, `claude-sonnet-5`/`-5.5`, `claude-fable-5`/`-5.1`, `claude-mythos-5`/`-5.1` (preview), plus the still-supported 4.x line (`sonnet-4-6`, `opus-4-5/4-6/4-7/4-8`, `haiku-4-5`) [S9][S11][S14]. Do not assume any of these are the reader's model — verify against `platform.claude.com/docs/en/about-claude/models` at write time.
- **Extended thinking (manual `budget_tokens`) status**: deprecated (still works) on Claude 4.6 models; **hard-rejected with a 400 on Claude 4.7 and later** (`claude-opus-5.5` etc.) — those models only support `thinking:{type:"adaptive"}` [S11].
- **Gemini API**: the `generateContent`/`contents[]` pattern is being superseded by an **Interactions API** — `client.interactions.create(model, input, tools, generation_config)`, response is an `Interaction` with `output_text` and `steps[]` (user_input / model_output / thought / function_call), multi-turn via `previous_interaction_id`, `store:false` for stateless mode. `generation_config.thinking_level` replaces the older numeric `thinkingBudget` as of ~March 2026 on Gemini 3.x models (`low|medium|high|max`) [S16][S17][S26].
- **Open Responses spec**: dated snapshot `2026-04-24` is current; adds a WebSocket transport (`/v1/responses`, `response.create` frames, 60-min connection cap, `/responses/compact` endpoint) on top of the original HTTP/SSE shape [S3].
- **OpenAI Agents SDK**: open-sourced early 2026, primitives = `Agent`, `Tool`, `Handoff` (first-class field, not a tool wrapper), `Guardrail` (input/output, tripwire-based), built-in hosted tracing [S24].
- **Claude Agent SDK**: bundles a native Claude Code binary; ships the same loop, tool set (`Read/Edit/Write/Glob/Grep/Bash/WebSearch/WebFetch/ToolSearch/Agent/Skill/AskUserQuestion/TaskCreate/TaskUpdate`), permission modes, and automatic context compaction that Claude Code itself uses [S12].

## Timeline (dated)

| Date | Event | Source |
|---|---|---|
| 2025-08-26 | OpenAI announces Assistants API beta wind-down, 1-year sunset clock starts | [S4] |
| 2025-05-14 | `interleaved-thinking-2025-05-14` beta header ships for Claude 4 models | [S11] |
| 2026-01-15 | **Open Responses** spec publicly launched (OpenAI + OpenRouter/HF/vLLM/Ollama/LM Studio/Vercel) | [S2][S23] |
| 2026-02-05 | Claude **Adaptive Thinking** ships with Opus 4.6, interleaves automatically, no extra config | [S26 secondary; confirmed pattern S11] |
| ~2026-03 | Gemini 3.x: `thinking_level` (low/medium/high/max) replaces numeric `thinkingBudget` | [S26] |
| 2026-04-24 | Open Responses spec revision adds WebSocket transport + compaction endpoint | [S3] |
| 2026-06-23 | Armin Ronacher publishes "The Coming Loop," naming the inner-loop/outer-harness split | [S10] |
| 2026-08-26 | **Assistants API sunset** — endpoint removed | [S4][S20] |
| 2026-09-30 (today) | `platform.openai.com` guide pages 301→`developers.openai.com`; reasoning-effort docs already reference next-gen "GPT-6 Astra"/"GPT-6.1 Sol" model names | [S5][S21], confirmed live |

## Mechanics

### 1. Chat Completions vs Responses — the actual wire diff

Chat Completions keeps one flat `messages[]` array; a tool call is a `tool_calls` array nested inside an `assistant` message, and the tool's answer is a separate `role:"tool"` message keyed by `tool_call_id`. Responses instead returns a **flat, ordered `output[]` array of typed Items** — `message`, `reasoning`, `function_call`, `function_call_output` are siblings, not nested — correlated by `call_id` [S5].

Field renames (VERBATIM mapping, S5):
| Chat Completions | Responses |
|---|---|
| `messages` | `input` (string or Items array) |
| system message in `messages` | top-level `instructions` |
| `choices[0].message.content` | `response.output_text` helper, or iterate `output` |
| `response_format` | `text.format` |
| `n` (multiple completions) | not supported — issue separate requests |

Responses tool-call item, VERBATIM [S5]:
```json
{
  "id": "fc_12345xyz",
  "call_id": "call_12345xyz",
  "type": "function_call",
  "name": "get_weather",
  "arguments": "{\"location\":\"Paris, France\"}"
}
```
Its output goes back as its own Item, not a role-tagged message, VERBATIM [S13]:
```json
{
  "type": "function_call_output",
  "call_id": "call_12345xyz",
  "output": "{\"temperature\": \"25\", \"unit\": \"C\"}"
}
```

**Cost caveat that catches people out**: `previous_response_id` (or Conversations API) removes the *client-side bookkeeping* of resending history, but OpenAI still re-bills every earlier input token as input on the new turn — so it is a developer-convenience feature, not a cost-saving one on its own (savings only come from prompt-caching discounts applied to the repeated prefix) [S22].

### 2. Tool-calling wire format end to end (OpenAI)

Tool definition, `strict` mode requires `additionalProperties:false` and every field in `required` (optional fields become `type:["string","null"]` instead of being omitted from `required`), VERBATIM [S13]:
```json
{
  "type": "function",
  "name": "get_weather",
  "description": "Retrieves current weather for the given location.",
  "parameters": {
    "type": "object",
    "properties": {
      "location": {"type": "string", "description": "City and country e.g. Bogotá, Colombia"},
      "units": {"type": ["string", "null"], "enum": ["celsius", "fahrenheit"]}
    },
    "required": ["location", "units"],
    "additionalProperties": false
  },
  "strict": true
}
```
`tool_choice` options, VERBATIM [S13]: `"auto"`, `"required"`, `{"type":"function","name":"get_weather"}`, and a newer `{"type":"allowed_tools","mode":"auto","tools":[...]}` that restricts the visible/callable subset **without invalidating the cached prompt prefix** the way removing tools from the array would — this `allowed_tools` governance pattern is also in the Open Responses spec as a first-class field [S3][S13].

Structured Outputs strict mode is presented as schema-constrained generation, not just post-hoc validation: "the model generates tokens constrained to produce only valid schema-compliant JSON" — this is constrained/grammar decoding under the hood, not a retry loop [S8]. Wire shape, VERBATIM [S8]:
```json
"text": {
  "format": {
    "type": "json_schema",
    "strict": true,
    "name": "schema_name",
    "schema": {"type": "object", "properties": {}, "required": [], "additionalProperties": false}
  }
}
```

### 3. Tool-calling wire format (Anthropic)

Anthropic never left the content-block model. A `tool_use` block streams as accumulating **partial JSON strings** (`input_json_delta`), not deltas of an already-typed object — you must buffer and parse once `content_block_stop` fires (or use SDK helpers) [S14]. `tool_choice:{"type":"any"}` forces some tool call; `{"type":"tool","name":...}` forces one specific tool. Verbatim streamed tool-call sequence (abridged) [S14]:
```
event: content_block_start
data: {"type":"content_block_start","index":1,"content_block":{"type":"tool_use","id":"toolu_01T1x1fJ34qAmk2tNTrN7Up6","name":"get_weather","input":{}}}
event: content_block_delta
data: {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"{\"location\":"}}
event: content_block_delta
data: {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":" \"San Francisco, CA\"}"}}
event: content_block_stop
data: {"type":"content_block_stop","index":1}
```
A server-executed tool (e.g. web search) uses `server_tool_use` blocks and a matching `*_tool_result` block that the API injects itself — the client never round-trips these [S14].

### 4. Reasoning items and encrypted reasoning (OpenAI Responses)

A reasoning Item persists across turns by ID; you simply re-send the whole prior `output` (including the `reasoning` item) as the next `input`. With `include:["reasoning.encrypted_content"]`, the API returns `encrypted_content` instead of/alongside plaintext reasoning; it is decrypted server-side in-memory, used, and immediately re-encrypted for the next turn — "no intermediate state is ever persisted" for Zero Data Retention orgs [S6]. Verbatim call shape [S6]:
```python
response = client.responses.create(
    model="o3", input=context, tools=tools,
    store=False, include=["reasoning.encrypted_content"]
)
```
Constraint worth flagging: **background mode requires `store:true`**, which is incompatible with the `encrypted_content` stateless pattern — you cannot combine background async execution with encrypted-stateless reasoning today; the workaround is foreground execution + polling/`previous_response_id` [background-mode finding, community.openai.com thread, secondary].

Anthropic's analogue is the `thinking` block with a **`signature`** field (cryptographic, verifies integrity) that must be replayed byte-for-byte in the next turn if you resend prior thinking; it cannot carry a `cache_control` breakpoint of its own but is cached implicitly as part of the surrounding turn once a tool result follows it [S9][S11].

### 5. Structured turn/streaming lifecycle — side by side

**Anthropic Messages streaming**, fixed event order, VERBATIM structure [S14]:
1. `message_start` (Message with empty `content`)
2. per content block: `content_block_start` → N×`content_block_delta` → `content_block_stop`
3. one or more `message_delta` (top-level changes; **usage in `message_delta` is cumulative**, a documented gotcha)
4. `message_stop`
`ping` events may appear anywhere; unknown event types must be ignored per Anthropic's versioning policy [S14].

Delta subtypes: `text_delta`, `input_json_delta` (tool args, partial JSON), `thinking_delta`, and a terminal `signature_delta` sent just before `content_block_stop` on a thinking block [S14].

**Responses API streaming** uses one `type`-tagged SSE per line, structured as two categories: delta events (`response.output_text.delta`, `response.function_call_arguments.delta`, `response.content_part.done`, …) and lifecycle/state events (`response.created`, `response.in_progress`, `response.completed`, `response.failed`) [Open Responses spec S3; corroborated by community write-up S31]. Verbatim delta shape from the Open Responses spec, S3:
```json
{"type": "response.output_text.delta", "sequence_number": 13, "item_id": "msg_0f79...", "output_index": 3, "content_index": 0, "delta": "Here"}
```

### 6. Stop/finish reasons compared

| OpenAI `finish_reason` (Chat Completions) | Anthropic `stop_reason` |
|---|---|
| `stop` (natural end or custom stop string) | `end_turn` |
| `length` | `max_tokens` |
| `tool_calls` | `tool_use` |
| `content_filter` | *(none exact; nearest is `refusal`)* |
| `function_call` (deprecated) | — |
| — | `stop_sequence` (which custom sequence fired) |
| — | `pause_turn` (server-tool loop hit its internal iteration cap, default 10 — resend the assistant turn to continue) |
| — | `refusal` |
| — | `model_context_window_exceeded` (filled the context window before hitting `max_tokens` — treat as truncated) |

Sources: OpenAI `finish_reason` enum from the openai-python SDK source [S19]; Anthropic `stop_reason` table from the official "Handling stop reasons" doc [S15]. Anthropic's own explicit rule: **on `tool_use`, send only `tool_result` blocks back — no extra assistant text — or you risk an empty/confused next turn** [S15].

### 7. Token usage accounting — exact field names

OpenAI Responses API (VERBATIM from `openai-python` SDK types, S18):
```python
class InputTokensDetails(BaseModel):
    cache_write_tokens: int   # tokens written to cache
    cached_tokens: int        # tokens served from cache
class OutputTokensDetails(BaseModel):
    reasoning_tokens: int
class ResponseUsage(BaseModel):
    input_tokens: int
    input_tokens_details: InputTokensDetails
    output_tokens: int
    output_tokens_details: OutputTokensDetails
    total_tokens: int
```
Note `cache_write_tokens` — a field that did not exist in the older Chat Completions `prompt_tokens_details` shape (which only ever exposed `cached_tokens`); its presence confirms OpenAI now bills/reports cache *writes*, not just cache *hits*, at the Responses layer, converging with Anthropic's long-standing `cache_creation_input_tokens` / `cache_read_input_tokens` split [S18][S9].

Anthropic usage object, VERBATIM [S9]:
```json
{
  "usage": {
    "cache_creation_input_tokens": 5120,
    "cache_read_input_tokens": 1800,
    "input_tokens": 50,
    "output_tokens": 503,
    "cache_creation": {"ephemeral_5m_input_tokens": 5120, "ephemeral_1h_input_tokens": 0}
  }
}
```
`total_input_tokens = cache_read_input_tokens + cache_creation_input_tokens + input_tokens` [S9]. When thinking is on, watch `usage.output_tokens_details.thinking_tokens` — only present on the final `message_delta` when streaming [S11].

### 8. Prompt caching mechanics (Anthropic) — the part people get wrong

`cache_control:{"type":"ephemeral","ttl":"5m"|"1h"}` can sit on `tools`, `system`, and `messages.content` blocks (text/image/document/tool_use/tool_result) — **not** on `thinking` blocks directly, though thinking gets swept into the cache implicitly via the surrounding turn [S9]. Up to **4 explicit breakpoints** per request; the cache lookback window checks **20 block positions back** from a breakpoint (consecutive `tool_use`/`tool_result` blocks each count as one position) [S9]. Minimum cacheable size varies **by model**, from 512 tokens (Sonnet 5.5/Opus 5.5 generation) up to 4096 tokens (Opus 4.6, Haiku 4.5) — a prompt below the threshold silently isn't cached, no error [S9]. 1-hour TTL costs 2× base input price to write vs 1.25× for 5-minute; cache reads are ~0.1× base (as low as 0.025×–0.05× for the newest models) [S9]. **Changing `budget_tokens` (or the thinking mode) between requests invalidates the cache** — Anthropic's own measured example shows a 3rd request re-paying full `cache_creation_input_tokens` after only bumping the thinking budget from 4000→8000 [S11].

### 9. Harmony format (open-weight models, not the hosted API)

Harmony is gpt-oss's mandatory chat template: it renders roles (`system`, `developer`, `user`, `assistant`, `tool`) and **three output channels** — `analysis` (raw chain-of-thought, lower safety bar, never shown to end users), `commentary` (tool calls + preambles), `final` (the actual user-facing answer) [S7]. Special tokens include `<|start|>`, `<|end|>`, `<|message|>`, `<|channel|>`, `<|constrain|>` (declares expected data type, e.g. for a function call payload), `<|return|>` (stop, decode-time), `<|call|>` (stop for tool execution) [S7]. Verbatim rendered example [S7]:
```
<|start|>user<|message|>What is 2 + 2?<|end|>
<|start|>assistant<|channel|>analysis<|message|>User asks arithmetic question.<|end|>
<|start|>assistant<|channel|>final<|message|>2 + 2 = 4.<|return|>
```
This is the concrete answer to "how do tool definitions/messages actually become tokens": for gpt-oss, the `openai-harmony` Python package (or the Transformers chat-template integration) does this rendering; every hosted-API-facing chapter scope item (tools array, message roles) is really just a JSON→prompt-template compilation step, and Harmony is the one vendor who published the compiler in the open [S7].

### 10. The canonical agent loop

Composed skeleton (COMPOSED, following the shared shape described independently by Simon Willison's "tools in a loop" framing [S1] and the Claude Agent SDK's documented loop [S12]):
```python
# COMPOSED — canonical shape, not copied from one source
messages = [{"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_input}]

for turn in range(MAX_TURNS):
    resp = client.chat.completions.create(
        model=MODEL, messages=messages, tools=TOOLS, tool_choice="auto")
    msg = resp.choices[0].message
    messages.append(msg)

    if not msg.tool_calls:
        break  # stop condition: model produced a final answer

    for call in msg.tool_calls:
        result = execute_tool(call.function.name, json.loads(call.function.arguments))
        messages.append({"role": "tool", "tool_call_id": call.id, "content": str(result)})
else:
    raise RuntimeError("max turns exceeded")  # stop condition: iteration guard
```
Two-loop mental model per Ronacher [S10]: the block above is the **inner** loop. A production system wraps it in an **outer** harness loop that decides whether the task as a whole is done, injects fresh context, restarts a burned-out inner loop, or hands off to a different system — conflating the two levels is the named failure mode.

The Claude Agent SDK's own documented loop makes the "turn" unit explicit: *"a turn is one round trip: Claude produces tool calls, the SDK executes them, and results feed back automatically … turns continue until Claude produces output with no tool calls"* [S12]. It exposes two independent guards — `max_turns` (counts only tool-use round trips) and `max_budget_usd` (a spend ceiling that also covers spawned subagents) — and a fixed set of `ResultMessage.subtype` values (`success`, `error_max_turns`, `error_max_budget_usd`, `error_during_execution`, `error_max_structured_output_retries`) so callers can branch on *why* the loop ended, not just *that* it ended [S12].

### 11. OpenAI-compatible ecosystem

`v1/chat/completions` (and increasingly `v1/responses`) is the de facto wire contract every serving stack imitates: Ollama exposes it at `localhost:11434/v1`, vLLM's OpenAI-compatible server at `:8000/v1` [S27]. Division of labor as commonly recommended in 2026 write-ups: **Ollama/llama.cpp** for single-user local serving, **vLLM** for concurrent multi-user serving, **LiteLLM** (SDK + proxy) when you want to *own* a router in front of 100+ providers with budgets/rate-limits/virtual keys/logging in one YAML config, **OpenRouter** when you want one hosted API key and a large model catalog with provider routing and BYO-key support without operating anything yourself [S27]. Open Responses (S2/S3 above) is the attempt to standardize the newer, richer Responses-API shape the same way `chat/completions` was standardized bottom-up.

### 12. Reasoning-model parameters, provider by provider

- **OpenAI Responses**: `reasoning.effort` ∈ `{none,low,medium,high,xhigh,max}` (support varies per model — e.g. some next-gen families drop `none`/`minimal`); `reasoning.summary` ∈ `{auto,concise,detailed}` controls whether/how a human-readable reasoning summary is returned; `reasoning.context` ∈ `{current_turn,all_turns,auto}` controls whether prior-turn reasoning is rendered back into the prompt on later turns — **reasoning only transfers within the same model family** [S21]. `verbosity` (`low|medium|high`) is a separate axis controlling output length, and explicit user instructions override it [prior-turn public knowledge, corroborated by community/cookbook secondary sources S28].
- **Anthropic**: two independent axes — `thinking` (adaptive vs. manual-budget, being phased toward adaptive-only) and, on Opus 4.5 specifically, a separate `effort` field that must be set alongside `budget_tokens` because effort shapes the *overall* response while budget shapes *thinking depth specifically* [S11].
- **Gemini**: `generation_config.thinking_level` (`low|medium|high|max` on Gemini 3.x), superseding the older numeric `thinkingBudget` token-count knob from the 2.5 generation [S26][S16].

### 13. Message roles and instruction hierarchy

OpenAI's effective 2026 hierarchy: **platform/root rules → `developer` message → `user` message → tool output / retrieved text (no inherent authority)** [S29 secondary]. The `developer` role (renamed from the old informal "system prompt" usage) is explicitly meant to hold constraints the *user* should not be able to override: output schema, scope limits, tool-use policy, refusal behavior [S29]. Anthropic keeps a single top-level `system` string/array (cacheable) plus `user`/`assistant` turns; there is no separate `developer` role in the Messages API — system-level authority is entirely carried by the `system` field's position (evaluated first, cacheable, and conventionally where a harness puts its non-negotiable instructions).

## Numbers

- Assistants API sunset: exactly **365 days** from announcement (2025-08-26) to shutdown (2026-08-26) — OpenAI's own stated policy of a 1-year deprecation window [S4].
- Anthropic prompt-cache minimum block size: **512 tokens** (Fable 5.1/Mythos 5.1/Opus 5.5/Opus 5/Sonnet 5.5/Fable 5/Mythos 5) vs **4096 tokens** (Opus 4.6/4.5, Haiku 4.5) — an 8× spread across the current model lineup, measured/stated by Anthropic, dated to the live docs snapshot pulled 2026-09-30 [S9].
- Cache write multiplier: **1.25×** base input price for a 5-minute TTL, **2×** for 1-hour; cache read: **0.1×** base (down to 0.025×–0.05× on the newest Fable/Mythos/Opus 5.5 models) — Anthropic pricing table, same snapshot [S9].
- Cache lookback window: Anthropic checks **20 block positions** back from a breakpoint for a reusable prior cache entry [S9].
- Anthropic thinking budget floor: **1,024 tokens minimum**; beyond **32k** thinking tokens, Anthropic recommends switching to batch processing to avoid timeout/connection-limit failures on long-running requests [S11].
- `pause_turn` (server-tool loop) has a **default iteration cap of 10** before Anthropic forces a pause and expects the client to resend [S15].
- Anthropic's own measured cache-invalidation example: changing `budget_tokens` from 4,000→8,000 tokens between the 2nd and 3rd request of a cached conversation flips `cache_read_input_tokens` from 1,370 back to 0 and re-triggers `cache_creation_input_tokens: 1,370` — a concrete, source-published before/after pair [S11].

## Pitfalls, limits, criticism

- **`previous_response_id`/Conversations API is a convenience, not a cost optimization** — teams that adopt it expecting a token-cost win are often surprised that OpenAI still bills the full accumulated history as input every turn; only prompt-caching discounts (if the prefix is stable and reused within cache TTL) actually reduce spend [S22].
- **Background mode + encrypted reasoning don't compose**: background requires `store:true`; `reasoning.encrypted_content` targets the `store:false`/ZDR path. You must choose foreground+encrypted or background+stored, not both, as of the current API surface [community.openai.com thread, secondary].
- **Changing thinking configuration invalidates Anthropic prompt caches** — a naive implementation that lets users toggle reasoning depth per-request will silently pay full cache-write cost every time, in a multi-turn conversation that otherwise looked cache-friendly [S11].
- **Extended thinking manual mode is actively being removed**, not just soft-deprecated: Claude 4.7+ models return an HTTP 400 for `thinking:{type:"enabled"}`. Any code hard-coding `budget_tokens` will break outright on newer models, not just underperform [S11].
- **Server-tool loops can silently stop mid-task**: `pause_turn` means Anthropic's *own* orchestration hit an internal cap (10 iterations by default) — if your harness doesn't check for this stop reason specifically and treats it like `end_turn`, you'll ship truncated tool-augmented answers [S15].
- **Armin Ronacher's core criticism of loop-driven code generation**: models "avoid strong invariants… add fallbacks instead of making bad states impossible," a pattern he says *worsens* in hands-off/looped workflows, producing code engineers merge without fully understanding it — his prescription is to reserve unattended loops for code that's either transformed-not-newly-authored (porting) or intentionally short-lived (POCs, security scans), not for long-lived production surfaces [S10].
- **Strict-mode JSON Schema is not full JSON Schema** — OpenAI explicitly notes support is partial "for performance or technical reasons"; do not assume every construct (e.g. certain schema compositions) works before testing [S8].
- **Streaming tool-input deltas are not incremental objects** on either API — OpenAI's `function_call_arguments.delta` and Anthropic's `input_json_delta` are both *partial JSON strings* you must buffer until the block closes; treating a mid-stream delta as parseable JSON is a common and crashy mistake [S14][S31].
- **The Assistants→Responses migration guide has real gaps**: OpenAI's own document doesn't spell out Code Interpreter/File Search/vector-store migration, and there is no automated thread-to-conversation converter — this was a genuine, cited developer-community pain point through the 2025→2026 sunset window [S4][S20].

## What changed in the last 6 months (roughly March–September 2026)

- Anthropic finished pushing **adaptive thinking** as the default reasoning mode and started actively rejecting the old manual `budget_tokens` API on new model generations (4.7+), not just discouraging it [S11].
- Gemini's public API surface moved from `generateContent`/`contents` toward an **Interactions API** modeled structurally on OpenAI's Responses API (`output_text`, `steps`, `previous_interaction_id`) — a convergence event worth calling out explicitly since it means "the OpenAI-shaped API" is becoming cross-vendor even where vendors didn't formally join Open Responses [S16][S17].
- **Open Responses** went from announcement (Jan 2026) to a dated, versioned spec with WebSocket transport and a compaction endpoint (Apr 2026) — i.e., it grew real protocol surface beyond the original HTTP/SSE mirror of OpenAI's API [S3].
- The Assistants API **sunset actually happened** (Aug 26, 2026) rather than slipping — worth noting because deprecation-date slippage is common in this industry and this one didn't [S4].
- OpenAI's reasoning-model docs now reference next-generation model names ("GPT-6 Astra," "GPT-6.1 Sol") with per-model effort-level support tables, meaning `reasoning.effort` support is now a **per-model-family compatibility matrix**, not a single stable parameter surface [S21].
- OpenAI's Responses usage schema added a `cache_write_tokens` field alongside `cached_tokens`, mirroring Anthropic's write/read split — a small but real convergence in how usage/cost telemetry is reported across vendors [S18].

## Diagram candidates

1. **Chat Completions vs Responses shape** — two side-by-side boxes: flat `messages[]` with nested `tool_calls` vs. flat `output[]` of typed Items (`message`/`reasoning`/`function_call`/`function_call_output`) linked by `call_id` arrows.
2. **Inner loop vs outer harness loop** (Ronacher framing) — inner box: model↔tool↔result cycle; outer box wrapping it: harness deciding "done?", injecting context, restarting, handing off; arrow labeled "task persists beyond model's natural stop."
3. **Anthropic streaming event state machine** — states `message_start → [content_block_start → content_block_delta* → content_block_stop]* → message_delta* → message_stop`, with `ping`/`error` as side-channel events at any point.
4. **Tool-call round trip, OpenAI Responses** — actors: Client, Model. Arrows: `input[]` → Model; Model → `function_call` item (`call_id`); Client executes; Client → `function_call_output` item (`call_id`) → Model; Model → final `message` item.
5. **Reasoning item lifecycle with encryption** — Model produces reasoning → encrypted at rest (`encrypted_content`) → Client stores/replays opaque blob → Server decrypts in-memory → uses → re-encrypts new reasoning → discards plaintext. Label the ZDR boundary.
6. **Prompt cache breakpoints and lookback** — a message/content-block sequence with up to 4 `cache_control` pins and a dashed 20-block lookback window behind each pin; show cache_creation vs cache_read token counters.
7. **Stop-reason decision tree** — branch on `stop_reason`/`finish_reason` value → action (execute tools / raise max_tokens / resend for pause_turn / treat as truncated / retry on fallback for refusal).
8. **Harmony channel routing** — one assistant turn splitting into `analysis` (hidden CoT), `commentary` (tool calls/preambles), `final` (user-visible), each channel a lane with its own token markers.
9. **OpenAI-compatible ecosystem map** — center node "OpenAI wire format"; spokes to Ollama, vLLM, LiteLLM (proxy), OpenRouter, Open Responses spec, each annotated with its role (local single-user, local multi-user, self-hosted router, hosted multi-model gateway, cross-vendor standard).
10. **Effort/verbosity/thinking parameter map across 3 vendors** — a small comparison table-as-diagram: OpenAI (`reasoning.effort` × `verbosity`), Anthropic (`thinking.type` × `effort` on Opus 4.5 only), Gemini (`thinking_level`).

**Chart candidates**: no first-party numeric time series were found in-source (pricing multipliers and token thresholds above are point values, not series); a legitimate chart would need vendor pricing-page snapshots over time, which was out of scope for this pass — flagged under Unverified.

## Glossary

- **Item** — Responses API's atomic unit of conversation state (message, reasoning, function_call, function_call_output, …), replacing the flat "message" concept [S5].
- **`previous_response_id`** — pointer chaining a new Responses call to a prior one so the server, not the client, carries context forward [S5][S22].
- **Conversations API** — OpenAI's explicit persistent-conversation-ID object, an alternative to manually chaining `previous_response_id` [S5].
- **Encrypted reasoning (`encrypted_content`)** — opaque, provider-encrypted serialization of a reasoning item usable across turns without server-side plaintext persistence [S6].
- **Content block** — Anthropic Messages API's atomic content unit (`text`, `tool_use`, `tool_result`, `thinking`, `image`, `document`, …) [S9][S14].
- **`cache_control`/ephemeral breakpoint** — Anthropic's explicit marker telling the server where a reusable, TTL'd prompt-cache boundary sits [S9].
- **Adaptive thinking** — Anthropic's model-decides-for-itself reasoning mode, replacing manually budgeted extended thinking [S11].
- **Harmony** — gpt-oss's mandatory chat-template/response format with `analysis`/`commentary`/`final` channels [S7].
- **Open Responses** — an open, multi-vendor specification derived from OpenAI's Responses API shape [S2][S3].
- **Interactions API** — Google's newer Gemini API surface (`client.interactions.create`) structurally analogous to Responses [S16].
- **Inner loop / outer harness loop** — Ronacher's split between the model's own tool-call cycle and the external system that governs when a whole task is finished [S10].
- **`pause_turn`** — Anthropic stop reason meaning a *server-side* tool loop (not the client's) hit its own iteration cap [S15].
- **Strict mode** — OpenAI tool/schema mode that constrains decoding to guarantee schema-valid JSON output, not just validate after the fact [S8][S13].

## Unverified / open questions

- Exact current pricing tables for OpenAI Responses cache writes/reads (only the *field name* `cache_write_tokens` was confirmed from SDK source; no dollar figures were found and verified this pass) — would need a direct fetch of `openai.com/api/pricing` at write time.
- Whether Google's Interactions API has a public sunset date for the older `generateContent` surface, or whether both will coexist indefinitely — not stated in the two pages fetched; needs a check of the Gemini API changelog/migration guide directly.
- vLLM's exact endpoint parity table (which OpenAI/Responses fields it implements vs. approximates) — the vLLM docs page fetched this pass returned only a redirect stub; needs a direct fetch of `docs.vllm.ai/en/latest/serving/online_serving/` (or `openai_compatible_server.md`) with a working URL.
- The full canonical list of Responses API SSE event types (only a partial list was assembled from a community write-up and the Open Responses spec, not from OpenAI's own reference page directly) — worth a direct fetch of `developers.openai.com/api/docs/guides/streaming-responses` in a follow-up pass; this pass's fetch of that page returned only a partial summary that missed the itemized event list.
- OpenAI Agents SDK's exact `output_type`/tracing wire format and whether it maps onto Responses Items 1:1 — only secondary commentary was read, not the SDK source or official quickstart, due to session tool-budget limits.
- The GPT-5.1/5.2 default `reasoning.effort` value discrepancy in secondary sources ("none" as default per one community post vs. "medium" as the documented default per the official reasoning guide) was not reconciled against a single authoritative page — flagged as disagreement, official docs [S21] favored over the community thread claim.

## Sources

- [S1] Simon Willison, "How coding agents work," *Agentic Engineering Patterns* guide, simonwillison.net, undated (2025–2026 series), https://simonwillison.net/guides/agentic-engineering-patterns/how-coding-agents-work/, accessed 2026-09-30
- [S2] Simon Willison, "Open Responses," simonwillison.net, 2026-01-15, https://simonwillison.net/2026/Jan/15/open-responses/, accessed 2026-09-30
- [S3] Open Responses Working Group, "Specification 2026-04-24," openresponses.org, 2026-04-24, https://www.openresponses.org/specification/2026-04-24, accessed 2026-09-30
- [S4] Edwin Arbus (OpenAI), "Assistants API beta deprecation — August 26, 2026 sunset," OpenAI Developer Community, 2025-08-26, https://community.openai.com/t/assistants-api-beta-deprecation-august-26-2026-sunset/1354666, accessed 2026-09-30
- [S5] OpenAI, "Migrate to the Responses API," developers.openai.com, undated (current), https://developers.openai.com/api/docs/guides/migrate-to-responses, accessed 2026-09-30
- [S6] OpenAI Cookbook, "Better performance from reasoning models using the Responses API," developers.openai.com, undated, https://developers.openai.com/cookbook/examples/responses_api/reasoning_items, accessed 2026-09-30
- [S7] OpenAI Cookbook, "OpenAI Harmony Response Format," developers.openai.com, undated, https://developers.openai.com/cookbook/articles/openai-harmony, accessed 2026-09-30
- [S8] OpenAI, "Structured Outputs," developers.openai.com, undated (current), https://developers.openai.com/api/docs/guides/structured-outputs, accessed 2026-09-30
- [S9] Anthropic, "Prompt caching," platform.claude.com, undated (current), https://platform.claude.com/docs/en/build-with-claude/prompt-caching, accessed 2026-09-30
- [S10] Armin Ronacher, "The Coming Loop," lucumr.pocoo.org, 2026-06-23, https://lucumr.pocoo.org/2026/6/23/the-coming-loop/, accessed 2026-09-30
- [S11] Anthropic, "Extended thinking," platform.claude.com, undated (current), https://platform.claude.com/docs/en/build-with-claude/extended-thinking, accessed 2026-09-30
- [S12] Anthropic, "How the agent loop works" (Claude Agent SDK docs), code.claude.com, undated (current), https://code.claude.com/docs/en/agent-sdk/agent-loop, accessed 2026-09-30
- [S13] OpenAI, "Function calling," developers.openai.com, undated (current), https://developers.openai.com/api/docs/guides/function-calling, accessed 2026-09-30
- [S14] Anthropic, "Streaming Messages," platform.claude.com, undated (current), https://platform.claude.com/docs/en/build-with-claude/streaming, accessed 2026-09-30
- [S15] Anthropic, "Handling stop reasons," platform.claude.com, undated (current), https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons, accessed 2026-09-30
- [S16] Google, "Text generation" (Gemini API docs), ai.google.dev, undated (current), https://ai.google.dev/gemini-api/docs/text-generation, accessed 2026-09-30 (fetched raw via .md.txt)
- [S17] Google, "Function calling" (Gemini API docs), ai.google.dev, undated (current), https://ai.google.dev/gemini-api/docs/function-calling, accessed 2026-09-30 (fetched raw via .md.txt)
- [S18] OpenAI, `openai-python` SDK source, `src/openai/types/responses/response_usage.py`, GitHub, undated (main branch, current), https://github.com/openai/openai-python/blob/main/src/openai/types/responses/response_usage.py, accessed 2026-09-30
- [S19] OpenAI, `openai-python` SDK source, `src/openai/types/chat/chat_completion.py`, GitHub, undated (main branch, current), https://github.com/openai/openai-python/blob/main/src/openai/types/chat/chat_completion.py, accessed 2026-09-30
- [S20] OpenAI, "Assistants migration," developers.openai.com, undated (current), https://developers.openai.com/api/docs/assistants/migration, accessed 2026-09-30
- [S21] OpenAI, "Reasoning models," developers.openai.com, undated (current), https://developers.openai.com/api/docs/guides/reasoning, accessed 2026-09-30
- [S22] ml4devs.com (and corroborating community discussion), "OpenAI Responses API vs Chat Completions: What Changed," undated 2026, https://www.ml4devs.com/articles/openai-responses-api-vs-chat-completions/, accessed 2026-09-30 (secondary commentary, cost-behavior claim)
- [S23] InfoQ, "Open Responses Specification Enables Unified Agentic LLM Workflows," 2026-02, https://www.infoq.com/news/2026/02/openai-open-responses/, accessed 2026-09-30
- [S24] futureagi.com, "Evaluating OpenAI Agents SDK: The Handoff Is the Test (2026)," 2026, https://futureagi.com/blog/evaluating-openai-agents-sdk-2026/, accessed 2026-09-30 (secondary commentary)
- [S25] ksred.com / helply.com, Claude Agent SDK overview posts, 2026, https://www.ksred.com/the-claude-agent-sdk-what-it-is-and-why-its-worth-understanding/ , https://helply.com/blog/create-ai-agent-using-claude-agent-sdk, accessed 2026-09-30 (secondary commentary)
- [S26] apidog / jangwook.net, Gemini thinking-budget/thinking-level developer guides, 2026, https://gemini-api.apidog.io/api-16240710 , https://jangwook.net/en/blog/en/gemini-25-flash-thinking-api-developer-guide-2026/, accessed 2026-09-30 (secondary commentary, corroborated by S16 primary doc)
- [S27] vucense.com / truefoundry.com, "OpenAI-Compatible LLM APIs 2026" and "LiteLLM vs OpenRouter (2026)," 2026, https://vucense.com/dev-corner/openai-compatible-llm-apis-2026/ , https://www.truefoundry.com/blog/litellm-vs-openrouter, accessed 2026-09-30 (secondary commentary)
- [S28] OpenAI Cookbook, "GPT-5.2 Prompting Guide," cookbook.openai.com, 2026, https://cookbook.openai.com/examples/gpt-5/gpt-5-2_prompting_guide, accessed 2026-09-30 (secondary/community corroboration for verbosity default behavior)
- [S29] lunary.ai / decodethefuture.org, "OpenAI: New 'developer' message role" and "OpenAI Model Spec 2026: Instruction Hierarchy Explained," 2026, https://lunary.ai/blog/openai-developer-role , https://decodethefuture.org/en/openai-model-spec-explained/, accessed 2026-09-30 (secondary commentary)
- [S30] eesel.ai / respan.ai, OpenAI rate-limit handling guides, 2026, https://www.eesel.ai/blog/openai-rate-limits , https://www.respan.ai/articles/openai-api-rate-limits, accessed 2026-09-30 (secondary commentary)
- [S31] OpenAI Developer Community, "Responses API streaming - the simple guide to 'events'," community.openai.com, 2026, https://community.openai.com/t/responses-api-streaming-the-simple-guide-to-events/1363122, accessed 2026-09-30 (community reference, corroborated by S3 primary spec)
