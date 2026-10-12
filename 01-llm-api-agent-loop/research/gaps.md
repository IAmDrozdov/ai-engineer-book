# 01. LLM API и цикл агента — completeness-critic / gap-filler notes

Lens: audit of spec.md, practice.md, field.md against the chapter scope and against primary sources re-read on 2026-09-30. Source ids here are `[G#]` (own list at the bottom) so they do not collide with `[S#]` in the other three files. When this file says "spec.md", "practice.md", "field.md" it means the sibling notes.

## Contradictions resolved

| # | Topic | What the notes say | Resolution (primary source) |
|---|---|---|---|
| C1 | Anthropic compaction beta header | spec.md: `compact-2026-09-04` is "the" compaction beta, shipped 2026-09-04. field.md: `compact-2026-01-12`. | **Both headers exist and belong to two different features.** Threshold compaction: header `compact-2026-01-12`, enabled via `context_management.edits: [{"type": "compact_20260112"}]`, default trigger `{"type":"input_tokens","value":150000}`, minimum 50,000 [G20]. On-demand compaction: header `compact-2026-09-04`, top-level `"compaction": {"type": "summarize"}`, returns a signed `compaction` block; announced in release notes on **2026-09-14** (the header date is not the ship date) [G19][G20]. Anthropic recommends on-demand "wherever it is available" [G20]. |
| C2 | OpenAI `reasoning.effort` values | spec.md: 7 values. practice.md: `none→low→medium→high→xhigh→max` (drops `minimal`). field.md: `minimal/low/medium/high`. | Schema enum is 7 values: `none, minimal, low, medium, high, xhigh, max`, default `medium`, "Not all reasoning models support every value" [G2][G4]. Values were added over time: `low/medium/high` with o1 (2024-12-17), `minimal` with GPT-5 (2025-08-07), `none` with GPT-5.1 (2025-11-13, where it was the *default*), `xhigh` with GPT-5.2 (2025-12-11), `max` with GPT-5.6 (2026-07-09) [G1]. GPT-6 Astra and GPT-6.1 Sol reject `none` with HTTP 400; GPT-6.1 Sol also rejects `minimal` [G3][G4]. |
| C3 | GPT-5.x default effort (practice.md "unresolved") | practice.md: community says default `none`, docs say `medium`. | Both were true for different models: GPT-5.1 defaulted to `none` (2025-11-13) [G1]; GPT-5.5 "Reasoning effort now defaults to `medium`" (2026-04-24) [G1]; GPT-5.6, GPT-6.1 Sol, GPT-6 Sol, GPT-6 Luna default `medium` [G4]. Defaults are per model; always set effort explicitly. |
| C4 | Conversations API launch date | field.md: "2026-08-20" vs "Aug 2025", unresolved. | **2025-08-20** — changelog entry "Released the Conversations API" under August 2025, tagged `v1/conversations · v1/responses · v1/assistants` [G1]. field.md's 2026 date is a misreading. |
| C5 | Background mode + `store:false` | practice.md: background requires `store:true`, so it cannot combine with the stateless/encrypted-reasoning pattern. | Outdated. Current guide: "Background requests from Zero Data Retention (ZDR) projects run with `store=false`. Response data is temporarily stored to disk for roughly 10 minutes"; Limits: "Background requests can use `store=false`, but response data is temporarily stored to support asynchronous execution and polling." If `store` is omitted/false the background response is deleted after ~10 minutes [G8]. |
| C6 | Getting `encrypted_content` | practice.md: you must pass `include:["reasoning.encrypted_content"]`. | Current spec: `encrypted_content` "is populated by default for reasoning items returned by `POST /v1/responses` and WebSocket `response.create` requests"; migration guide: "Each item includes `encrypted_content` by default when you create a response" [G2][G5]. When streaming, take the blob from `response.output_item.done`, not `.added` ("may be incomplete") [G2]. The `include` form from 2025 cookbooks is legacy (whether it is still accepted was not tested — no API key). |
| C7 | Anthropic `stop_reason` values | spec.md: 4 values (`end_turn, tool_use, stop_sequence, max_tokens`). practice.md: 7. | **7 values**: `end_turn`, `max_tokens`, `stop_sequence`, `tool_use`, `pause_turn`, `refusal`, `model_context_window_exceeded` [G21]. `model_context_window_exceeded` is returned without a beta header on Sonnet 4.5 and newer; older models need `model-context-window-exceeded-2025-08-26` [G21]. `stop_details` is non-null only for `refusal` [G21]. |
| C8 | `refusal` scope and categories | field.md: "Opus 4.7+ only", categories `cyber`, `bio`, `reasoning_extraction`. | Classifier refusals are documented for Claude Fable 5.1, Fable 5, Opus 5.5, Opus 5 and Sonnet 5.5 [G22]. Five categories: `cyber`, `bio`, `frontier_llm`, `reasoning_extraction`, `general_harms`; `category` may be `null` [G22]. Since 2026-09-24 a refusal before any output is **billed** for `bio`, `frontier_llm`, `reasoning_extraction` [G19][G22]. |
| C9 | "Anthropic has no `system` role inside `messages`" | spec.md and practice.md state `system` is only a top-level parameter. | Outdated for current models. Mid-conversation `{"role": "system"}` messages are available (no beta header) on Fable 5.1, Mythos 5.1, Fable 5, Mythos 5, Opus 5.5, Opus 4.8, Opus 5, Sonnet 5.5 — **not** Sonnet 5 [G27]; GA note dated 2026-07-15 [G19]. Purpose: change instructions (and, in beta, tools) without invalidating the cached prefix [G27]. |
| C10 | Anthropic `tool_choice` `any`/`tool` | spec.md lists `auto/any/tool/none` as generally usable. | On Claude Fable 5.1, Mythos 5.1, Opus 5.5 and Sonnet 5.5, `any` and `tool` return a 400 (`tool_choice: type "tool" and "any" are not supported for this model.`); use `auto` + `strict: true` or structured outputs [G19][G26][G28]. The blank "any/tool" cell for Opus 5.5 in the tool-overhead table (spec.md read it as "same price") means "not supported" [G28]. |
| C11 | Minimal loop model choice | spec.md's ~50-line loop runs Chat Completions tool calling against `gpt-6-astra`. | That loop would fail today: "Chat Completions does not support function calling with GPT-6 Astra or GPT-6.1 Sol"; GPT-6 Sol/Luna support CC function calling only with `reasoning_effort: "none"` [G3][G4]. The chapter's reference loop on OpenAI's current models must use Responses (or use an older/other model on CC). |
| C12 | OpenAI Agents SDK release date | practice.md: "open-sourced early 2026". | Released 2025-03-11 together with the Responses API [G1]. 2026 items: sandbox agents + open-source harness + memory controls (2026-04-15), TypeScript parity (2026-05-06) [G1]. |
| C13 | Open Responses launch partners | spec.md: co-developed with Nvidia, Vercel, OpenRouter, HF, LM Studio, Ollama, vLLM. | Simon Willison's same-day post lists OpenRouter, Hugging Face, LM Studio, vLLM, Ollama and Vercel [G39]; Nvidia not confirmed in any source read here. Only two dated revisions exist: `2026-01-15` and `2026-04-24` [G38]. Governance: technical charter with a TSC of core maintainers [G38]. |
| C14 | Stream terminator `data: [DONE]` | spec.md: Open Responses preserves `[DONE]`. field.md: Responses stream ends with `response.completed`, not `[DONE]`. | Both are right for different things. Open Responses: "The terminal event MUST be the literal string [DONE]" [G38]. OpenAI Chat Completions: final frame `data: [DONE]` (literal, "not a JSON chunk") [G2]. OpenAI's Responses endpoint documents only typed events (`response.completed`/`incomplete`/`failed`), no `[DONE]` [G2][G7]; DeepSeek's Responses clone says the stream "ends with a `response.completed` / `response.incomplete` / `response.failed`" event [G47]. A portable client must accept both. |
| C15 | `strict` default | field.md: Responses "defaults toward strict". spec.md silent. | Confirmed with nuance: "If you omit `strict`... Responses requests will attempt to normalize your schema into strict mode when possible, and will fall back to non-strict... When fallback happens, the response tool will show `strict: false`. Chat Completions requests remain non-strict by default." `strict: true` on an incompatible schema is rejected [G6]. |
| C16 | Gemini `thinking_level` values | practice.md: `low|medium|high|max`. spec.md: `minimal|low|medium|high`, default `high`. | Per-model table; **no `max`**. `gemini-3.8-flash`: default `medium`, supports `low, medium, high`; `gemini-3.6-flash`: `minimal, low, medium, high`; `gemini-3-pro-preview`: `low, high`; 2.5 models: `low, medium, high` [G32]. |
| C17 | Gemini Interactions API status | practice.md: Google "quietly replaced" `generateContent`. field.md: "primary surface". | Interactions API launched 2025-12-11 [G33], is **Beta**, "recommended for all new projects", and "The original `generateContent` API remains fully supported"; new non-mainline models and agentic tools will launch only on Interactions [G31]. Breaking schema change `outputs` → `steps` became default on 2026-05-26 [G33]. |
| C18 | OpenAI cache-write billing | practice.md: presence of `cache_write_tokens` "confirms OpenAI now bills cache writes". | Only for GPT-5.6 and later: writes 1.25x uncached input, reads 0.1x (0.05x on GPT-6.1 Sol). GPT-5.5 and earlier: "No additional cache-write charge" [G10]. |
| C19 | Anthropic default effort / disabling thinking | field.md: effort default implied `high` everywhere; spec.md: adaptive is optional. | Opus 5.5 defaults to `medium`, all other effort-capable models to `high` [G25]. On Opus 5.5 thinking cannot be disabled: `{"type":"disabled"}` and `{"type":"enabled",...}` return 400 [G19]. On Sonnet 5.5 the lowest setting is `thinking: {"type": "between_tools"}` (only at effort ≤ `high`); `disabled` returns 400 [G26]. On Opus 5, disabling is allowed only at effort ≤ `high` [G19]. |

## Claims most likely to be wrong (with corrections)

1. **"Chat Completions is the universal format, so a CC tool loop works on any OpenAI model."** Wrong for the current flagships: GPT-6 Astra and GPT-6.1 Sol support Chat Completions only *without tools*; GPT-6 Sol/Luna allow CC function calling only at `reasoning_effort: "none"` [G3][G4]. CC is still the lingua franca of *third-party* servers (vLLM, Ollama, OpenRouter, Gemini's `/v1beta/openai/`) [G34][G35][G36].
2. **"The Assistants API is deprecated / will be sunset."** It was shut down on 2026-08-26; every `/v1/assistants`, `/v1/threads` call fails [G1][G14]. Next OpenAI shutdowns to mention: reusable prompt objects (`v1/prompts`) 2026-11-30, Agent Builder 2026-11-30, Evals platform 2026-11-30, GPT-5 / o3 2025 snapshots 2026-12-11 [G14].
3. **"`reasoning_effort` is low/medium/high (GPT-5 added minimal)."** 7 values, per-model subsets and defaults; `none` returns 400 on GPT-6 Astra [G2][G4]. Effort can now change mid-conversation without breaking the cache via a `configuration_update` input item (GPT-6 family) [G4].
4. **"`previous_response_id` saves tokens."** "All previous input tokens for responses in the chain are billed as input tokens" [G5]. And it does not carry `instructions` [G5]. OpenAI's own Codex CLI does not use it at all ("to keep requests fully stateless and to support ZDR") [G16].
5. **"Anthropic: tool results are `user` messages and `system` is only top-level."** First half still true; second half is outdated — mid-conversation `role: "system"` messages exist on current models [G27]. Also `tool_result` blocks must come **first** in the user message; text only after them [G28].
6. **"Force a tool with `tool_choice: {type: any|tool}` on Claude."** 400 on Fable 5.1 / Mythos 5.1 / Opus 5.5 / Sonnet 5.5 [G26][G28].
7. **"Enable Claude reasoning with `thinking: {type: enabled, budget_tokens: N}`."** Rejected (400) on Claude 4.7 and later; deprecated on 4.6 [G18]. On Opus 5.5 thinking is always on; control depth with `output_config.effort` [G19][G25].
8. **"Anthropic `stop_reason` has four values."** Seven [G21]. An agent loop must at least handle `pause_turn` (resend the assistant content) and `refusal` (read `stop_details`, optionally fall back) [G21][G22].
9. **"Anthropic compaction uses header X."** Two betas: `compact-2026-01-12` (threshold) and `compact-2026-09-04` (on-demand) [G20].
10. **"OpenAI prompt caching is automatic, free to write, prefixes ≥1024 tokens, cached count rounded to 128."** True only for models before GPT-5.6. GPT-5.6+: explicit `prompt_cache_breakpoint` blocks, `prompt_cache_options: {mode, ttl:"30m"}`, up to 4 breakpoint writes per request, 1.25x write cost, exact (unrounded) reporting; `prompt_cache_retention` is deprecated [G2][G10].
11. **"Temperature / top_p are universal knobs."** GPT-6 family: "When reasoning effort is not `none`, remove `temperature`, `top_p`, and `top_logprobs`" [G3]; Anthropic Python SDK 1.0 (2026-08-20) removed `temperature`, `top_p`, `top_k` from Messages methods [G19].
12. **"Every Responses-compatible server supports `previous_response_id`."** Ollama: "Only the non-stateful flavor is supported" [G35]. OpenRouter: requests with `store: true` or non-null `previous_response_id` "are rejected with a `400` error" [G37]. Portable agents replay items manually.
13. **"`strict: true` guarantees schema-valid tool args everywhere."** Anthropic's OpenAI-SDK compatibility layer ignores `strict` and `response_format` silently [G30]. Gateways translate, not guarantee.
14. **"A 429 means back off and retry."** Not always: `credit_balance_exhausted`, `organization_spend_limit_exceeded`, `project_spend_limit_exceeded`, `organization_usage_limit_exceeded` are 429s that retrying cannot fix; `slow_down` is a 429 for traffic ramping too fast even inside RPM/TPM; overload is `503 server_is_overloaded` (OpenAI) or `529 overloaded_error` (Anthropic) [G13][G29]. The openai-python SDK retries every 429 twice by default [G17] — so spend-limit 429s are retried pointlessly unless you branch on `error.code`.
15. **"The OpenAI Agents SDK / Responses API are 2026 products; the Conversations API is from 2026."** Responses API and Agents SDK: 2025-03-11; Conversations API: 2025-08-20; what is new in 2026 is compaction (2026-02-10), WebSocket mode (2026-02-23), `phase` (2026-02-24), explicit caching (2026-07-09), async tool calling / steering (2026-09-03), Agents API (2026-09-10) [G1].

Extra traps worth a sidebar (lower frequency, still verified):
- "Background mode needs `store:true`" — no longer [G8] (C5).
- "You must request `include: reasoning.encrypted_content`" — now returned by default [G2][G5] (C6).
- "Gemini `thinking_level: max`" — does not exist [G32] (C16).
- "Open Responses streams end like OpenAI's" — Open Responses requires `[DONE]`, OpenAI Responses documents none [G38][G2] (C14).
- "OpenAI Agents SDK loop is unbounded" — `DEFAULT_MAX_TURNS = 10`, raises `MaxTurnsExceeded`; the Claude Agent SDK default is "No limit" for both `max_turns` and `max_budget_usd` [G44][G45].

## TL;DR (what the three notes miss or get wrong, compressed)

- OpenAI's newest models push tool calling to **Responses only** (GPT-6 Astra 2026-09-03, GPT-6.1 Sol 2026-09-29); Chat Completions survives as a no-tools / third-party lingua franca [G1][G3].
- The Responses loop gained **four new control surfaces in 2026**: WebSocket mode (incremental input over one socket, up to ~40% faster on 20+ tool-call rollouts, 60-min connections), `phase` on assistant messages, **async tools** (`async: true`, results returned later by `call_id` or via `response.inject`), and **mid-turn steering** (`response.steer`) [G1][G11][G12][G2].
- **Explicit prompt caching** arrived on OpenAI (GPT-5.6+, `prompt_cache_breakpoint`, 30-min TTL, 1.25x write) plus **Prompt Cache Diagnostics** with typed miss reasons (`tools_changed`, `reasoning_effort_changed`, `context_compacted`, …) [G2][G10]. Anthropic added **automatic caching** (one top-level `cache_control`) and GA **cache diagnostics** (2026-09-23) [G19][G23].
- **Reasoning persistence is now a parameter**: `reasoning.context` = `current_turn | all_turns | auto`; GPT-5.6 defaults to `all_turns`, earlier models to `current_turn`; reasoning only transfers within a model family [G4].
- `reasoning.mode: "pro"` (GPT-5.6/GPT-6) replaces separate `*-pro` model IDs for new work; it is independent of effort [G4][G14].
- Anthropic's newest generation (Fable 5.1 2026-09-01, Opus 5.5 2026-09-22, Sonnet 5.5 2026-09-28) broke three "classic" loop assumptions: forced `tool_choice` → 400, thinking cannot be simply disabled, and **thinking blocks are bound** to model, conversation prefix and (Sonnet 5.5) account — edit history and replay → 400 or silent drop [G19][G26].
- Anthropic added **mid-conversation system messages** and (beta) **mid-conversation tool changes / inline tool definitions** so a loop can change instructions and tools append-only without cache loss [G27].
- Anthropic **structured outputs are GA**: `output_config.format = {type: "json_schema", schema}`; strict tools via `strict: true` [G24].
- Refusals are an agent-loop branch: `stop_reason: "refusal"` + `stop_details.category`; optional server-side `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`) [G22].
- **Errors changed**: OpenAI 429 `slow_down`, 503 `server_is_overloaded` (2026-09-02), hard spend limits returning 429 (2026-07-22) [G1][G13].
- Tool definitions become tokens through **model-specific wire formats**; for open models every engine writes a parser per model family (the "M×N problem"); Harmony/DeepSeek/GLM formats differ at the token level [G41][G42][G43].
- The OpenAI-compatible ecosystem now implements **Responses too**, but statelessly: Ollama, OpenRouter (400 on `store:true`), vLLM (`/v1/responses` plus Anthropic-style `/v1/messages`), DeepSeek (for Codex) [G35][G36][G37][G47].
- Supply-chain incident: **LiteLLM 1.82.7/1.82.8 on PyPI were compromised (2026-03-24)** with a `.pth` credential stealer — relevant because gateways sit on every key [G40].

## Current state and versions (verified 2026-09-30)

**OpenAI models (API)** [G1][G3][G4]
- GPT-6 Astra (`gpt-6-astra`, 2026-09-03): most capable; no `none` effort; no custom `temperature`/`top_p`/`logprobs`; tool calling requires Responses; "misalignment monitoring" can stop a conversation for review.
- GPT-6.1 Sol (`gpt-6.1-sol`, 2026-09-29): efforts `low, medium (default), high, xhigh, max`; no `none`/`minimal`; $2 input / $0.10 cached / $2.50 cache write / $10 output per 1M (≤272K input); multi-agent (beta) in Responses.
- GPT-6 Sol / GPT-6 Luna (2026-09-22): $2/$0.20/$10 and $0.10/$0.01/$0.50 per 1M (≤272K input); support `none`.
- GPT-5.6 Sol/Terra/Luna (2026-07-09); `gpt-5.6` alias → `gpt-5.6-sol`.
- Service tiers: Fast mode replaced Priority Processing (2026-07-30; "up to 2.5x faster… at twice the price" for GPT-5.6 Sol); `service_tier: "ultrafast"` for GPT-6 Astra (2026-09-29).
- `chat-latest` points to the ChatGPT model and is not recommended for production [G1].

**OpenAI API surfaces** [G1][G2][G14]
- `POST /v1/responses` (+ `/responses/compact`, `/responses/input_tokens`, `/responses/{id}/cancel`, WebSocket mode on the same resource).
- `POST /v1/chat/completions` — supported, no shutdown date.
- `/v1/conversations` (2025-08-20).
- Agents API (public beta 2026-09-10): managed Codex harness, durable sessions, hosted or own sandbox; computer use added 2026-09-29 — this is a hosted product, cross-link ch.12/13.
- Removed: Assistants API (2026-08-26), Realtime API Beta interface (2026-05-12).

**Anthropic** [G18][G19]
- Current: Fable 5.1 (`claude-fable-5-1`, $10/$50, default effort `high`), Opus 5.5 (`claude-opus-5-5`, $4/$20, default effort `medium`, recommended starting point), Sonnet 5.5 (`claude-sonnet-5-5`, $2/$10), Haiku 4.5 (`claude-haiku-4-5-20251001`, $1/$5, extended thinking, 200K). All three 5.x: 1M context, 128K max output.
- Cache-read multipliers: 0.1x base; 0.025x on Fable 5.1 / Mythos 5.1; 0.05x on Opus 5.5 [G18][G19].
- "Every Claude model ID is a pinned snapshot, including the dateless IDs used from the 4.6 generation on" [G18].
- Opus 4.1 retired 2026-08-05 [G19].
- SDKs: Python `anthropic` 1.x (1.0 on 2026-08-20, httpx → httpx2, Python ≥3.10; latest 1.9.0 on 2026-09-28) [G19][G48].

**Google** [G31][G32][G33][G34]
- Latest general model `gemini-3.8-flash` (GA 2026-09-02). Interactions API (Beta) recommended for new projects; `generateContent` fully supported; OpenAI-compatible endpoint `https://generativelanguage.googleapis.com/v1beta/openai/` maps `reasoning_effort` to `thinking_level` / `thinking_budget`.
- Gemini 2.5 access restricted to prior users since 2026-09-18 ("not deprecated") [G33].

**Libraries (PyPI, 2026-09-30)** [G48]: `openai` 3.22.1 (2026-09-30), `anthropic` 1.9.0 (2026-09-28), `openai-agents` 0.22.3 (2026-09-17), `claude-agent-sdk` 0.2.162 (2026-09-29), `litellm` 1.103.1 (2026-09-29), `vllm` 0.30.0 (2026-09-22), `openai-harmony` 0.0.8 (2025-11-05).

## Timeline (items missing from all three notes, or corrected)

- 2024-12-17 — `developer` role and `reasoning_effort` added for o1 [G1].
- 2025-03-11 — Responses API, built-in tools and **Agents SDK** released; Assistants sunset announced for 2026 [G1].
- 2025-08-07 — GPT-5; `minimal` effort [G1].
- 2025-08-20 — **Conversations API** [G1].
- 2025-08-26 — Assistants deprecation post: "The Responses API has already overtaken Chat Completions in token activity" [G15].
- 2025-09-26 — images/files allowed as function-call output in Responses [G1].
- 2025-11-13 — GPT-5.1, `none` effort (default); extended (24h) prompt cache retention [G1].
- 2025-12-11 — GPT-5.2, `xhigh`; client-side `/responses/compact` endpoint [G1]. Gemini Interactions API launched [G33].
- 2026-01-15 — Open Responses announced [G1][G39].
- 2026-01-23 — OpenAI "Unrolling the Codex agent loop" [G16][G49].
- 2026-02-10 — server-side compaction, Skills, Hosted Shell in Responses [G1].
- 2026-02-23 — Responses **WebSocket mode** [G1].
- 2026-02-24 — `phase` (`commentary` | `final_answer`) [G1].
- 2026-02-25 — opencode #14972: loop exits when OpenAI-compatible providers return `finish_reason: "stop"` with tool calls; closed via PR #14973 [G46].
- 2026-03-05 — GPT-5.4: tool search, computer use, 1M context, native compaction [G1].
- 2026-03-24 — **LiteLLM 1.82.7/1.82.8 PyPI compromise** [G40].
- 2026-04-24 — GPT-5.5 (default effort `medium`; caching only with extended retention); Open Responses spec revision with WebSocket transport [G1][G38].
- 2026-05-12 — Realtime API Beta removed [G1].
- 2026-05-26 — Gemini Interactions `outputs`→`steps` schema default [G33].
- 2026-05-29 — `prompt_cache_retention` default `24h` for non-ZDR orgs [G1].
- 2026-06-03 — deprecation of reusable prompts, Evals platform, Agent Builder (shutdown 2026-11-30) [G1][G14].
- 2026-07-09 — GPT-5.6: programmatic tool calling, explicit caching, persisted reasoning, `max` effort, Pro mode, multi-agent beta [G1].
- 2026-07-15 — Anthropic mid-conversation system messages (no beta header) [G19].
- 2026-07-22 — OpenAI hard spend limits (429) [G1].
- 2026-07-24 — Claude Opus 5; `fallbacks: "default"` (server-side fallback beta); mid-conversation tool changes beta [G19].
- 2026-08-20 — Anthropic Python SDK 1.0 [G19].
- 2026-08-26 — Assistants API shut down [G1].
- 2026-09-01 — Claude Fable 5.1 / Mythos 5.1; forced `tool_choice` unsupported; per-message effort beta; turn-scoped system messages beta [G19].
- 2026-09-02 — OpenAI `slow_down` / `server_is_overloaded` error codes; Gemini 3.8 Flash GA [G1][G33].
- 2026-09-03 — GPT-6 Astra; async tool calling; mid-turn steering; `configuration_update` [G1].
- 2026-09-08 — OpenAI Prompt Cache Diagnostics GA [G1].
- 2026-09-10 — OpenAI Agents API public beta [G1].
- 2026-09-14 — Anthropic on-demand compaction beta (`compact-2026-09-04`) [G19].
- 2026-09-22 — Claude Opus 5.5; GPT-6 Sol / Luna; `inline-tools-2026-09-15` beta [G1][G19].
- 2026-09-23 — Anthropic cache diagnostics GA [G19].
- 2026-09-24 — Anthropic resumes billing some pre-output refusals [G19].
- 2026-09-28 — Claude Sonnet 5.5 [G19].
- 2026-09-29 — GPT-6.1 Sol; Ultrafast tier; computer use in Agents API [G1].

## Mechanics

### M1. Chat Completions streaming with tools — the chunk format nobody in the notes copied

`ChatCompletionMessageToolCallChunk` VERBATIM field list [G2]: `index` (integer, **required**), `id`, `type` (`function`), `function: {name, arguments}`; `arguments` description VERBATIM: "The arguments to call the function with, as generated by the model in JSON format. Note that the model does not always generate valid JSON, and may hallucinate parameters not defined by your function schema. Validate the arguments in your code before calling your function." Consequence: accumulate by `index` (only the first chunk of a call carries `id`/`name`), parse after `finish_reason`.

VERBATIM stream (text case) [G2]:
```
data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1694268190,"model":"gpt-6-astra", "system_fingerprint": "fp_44709d6fcb", "choices":[{"index":0,"delta":{"role":"assistant","content":""},"logprobs":null,"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1694268190,"model":"gpt-6-astra", "system_fingerprint": "fp_44709d6fcb", "choices":[{"index":0,"delta":{"content":"Hello"},"logprobs":null,"finish_reason":null}]}

: Intermediate chat completion chunks omitted.

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1694268190,"model":"gpt-6-astra", "system_fingerprint": "fp_44709d6fcb", "choices":[{"index":0,"delta":{},"logprobs":null,"finish_reason":"stop"}]}

data: [DONE]
```
`stream_options.include_usage: true` → "an additional chunk will be streamed before the `data: [DONE]` message. The `usage` field on this chunk shows the token usage statistics for the entire request, and the `choices` field will always be an empty array." [G2] — without it a streaming CC client gets no usage at all.

### M2. Responses function-call streaming — VERBATIM [G6]
```
{"type":"response.output_item.added","response_id":"resp_1234xyz","output_index":0,"item":{"type":"function_call","id":"fc_1234xyz","call_id":"call_1234xyz","name":"get_weather","arguments":""}}
{"type":"response.function_call_arguments.delta","response_id":"resp_1234xyz","item_id":"fc_1234xyz","output_index":0,"delta":"{\""}
{"type":"response.function_call_arguments.delta","response_id":"resp_1234xyz","item_id":"fc_1234xyz","output_index":0,"delta":"location"}
{"type":"response.function_call_arguments.delta","response_id":"resp_1234xyz","item_id":"fc_1234xyz","output_index":0,"delta":"\":\""}
{"type":"response.function_call_arguments.delta","response_id":"resp_1234xyz","item_id":"fc_1234xyz","output_index":0,"delta":"Paris"}
{"type":"response.function_call_arguments.delta","response_id":"resp_1234xyz","item_id":"fc_1234xyz","output_index":0,"delta":","}
{"type":"response.function_call_arguments.delta","response_id":"resp_1234xyz","item_id":"fc_1234xyz","output_index":0,"delta":" France"}
{"type":"response.function_call_arguments.delta","response_id":"resp_1234xyz","item_id":"fc_1234xyz","output_index":0,"delta":"\"}"}
{"type":"response.function_call_arguments.done","response_id":"resp_1234xyz","item_id":"fc_1234xyz","output_index":0,"arguments":"{\"location\":\"Paris, France\"}"}
{"type":"response.output_item.done","response_id":"resp_1234xyz","output_index":0,"item":{"type":"function_call","id":"fc_1234xyz","call_id":"call_1234xyz","name":"get_weather","arguments":"{\"location\":\"Paris, France\"}"}}
```
Note the two IDs: `id` (`fc_…`, the item) vs `call_id` (`call_…`, what `function_call_output` must reference) [G6].

### M3. Response termination on the Responses API
- `status` enum: `completed | failed | in_progress | cancelled | queued | incomplete` [G2].
- `incomplete_details.reason` enum: `max_output_tokens | max_messages | content_filter | steered` [G2]. `steered` = stopped "at a safe output boundary after a WebSocket `response.steer` event. The server can then create a successor response automatically with the queued input." [G2]
- There is no `finish_reason`; loop logic = "any `function_call` / `custom_tool_call` items in `output`?" plus `status` [G6]. Codex's own definition: repeat "until the model stops emitting tool calls and instead produces a message for the user" [G16].

### M4. Tool choice, parallelism, custom tools (Responses) [G6]
- `tool_choice`: `"auto"` (default), `"required"`, `{"type":"function","name":"get_weather"}`, `"none"`, and `allowed_tools`, VERBATIM:
```json
"tool_choice": {
    "type": "allowed_tools",
    "mode": "auto",
    "tools": [
        { "type": "function", "name": "get_weather" },
        { "type": "function", "name": "search_docs" }
    ]
  }
```
  Rationale VERBATIM: keep the `tools` list unchanged "so you can maximize savings from prompt caching". Open Responses states the same: "This is primarily a cache-preserving control surface" [G38].
- `parallel_tool_calls: false` "ensures exactly zero or one tool is called"; since GPT-5, parallel function calls can coexist with built-in tools, but "Built-in tools cannot be included in a parallel function-call batch" [G6].
- `max_tool_calls` caps **built-in** tool calls per response ("Any further attempts to call a tool by the model will be ignored") [G2].
- Custom tools (`"type": "custom"`) take a free-form string input; optional grammar `format: {type: "grammar", syntax: "lark" | "regex", definition}`; "The OpenAI API may return an error if the grammar is too complex" [G6]. (Grammar-constrained decoding is a ch.03/04 topic; mention here as the non-JSON sibling of strict mode.)
- Namespaces (`"type": "namespace"`) and `defer_loading: true` + tool search: token/cache management for large tool sets — cross-link ch.03 [G6].
- Token cost VERBATIM: "Under the hood, functions are injected into the system message in a syntax the model has been trained on. This means callable function definitions count against the model's context limit and are billed as input tokens." [G6]

### M5. Async tool calls and injection (new loop shape, 2026-09-03) [G12][G2]
- Mark a function/custom tool `async: true`; the call item then carries `async: true`; the model keeps working instead of pausing the turn. "Your application still executes the tool. Async tools don't move execution to OpenAI or manage your background jobs." Return the result later as `function_call_output` / `custom_tool_call_output` with the original `call_id` [G12].
- Over WebSocket, results can be pushed into the *active* response with `response.inject`; VERBATIM example [G2]:
```json
{
  "type": "response.inject",
  "response_id": "resp_123",
  "input": [
    {
      "type": "function_call_output",
      "call_id": "call_123",
      "output": "{\"temperature\":72}"
    }
  ]
}
```
- Not the same as background mode (async *generation*) [G12].
- Consequence for the canonical loop: "call → execute all → append → repeat" becomes an event loop with pending-call bookkeeping. Cross-link ch.12.

### M6. WebSocket mode (2026-02-23) [G11][G38]
- One persistent connection to `/v1/responses`; each turn is a client `response.create` event whose payload mirrors the HTTP body minus `stream`/`background`; continue with **only new items + `previous_response_id`**; `stream_id` multiplexes parallel conversations/forks on one socket.
- "For rollouts with 20+ tool calls, we have seen up to roughly 40% faster end-to-end execution." (OpenAI, no dataset given) [G11].
- Compatible with ZDR and `store=false` (state kept in connection-local memory); "Connections last up to 60 minutes. Reconnect at the limit." Error message VERBATIM: "Responses websocket connection limit reached (60 minutes). Create a new websocket connection to continue." [G11]
- Open Responses 2026-04-24 standardizes the same transport: on a failed continuation "the server MUST evict the referenced previous_response_id from the connection-local cache", error code `previous_response_not_found`; `websocket_connection_limit_reached` at 60 min [G38].

### M7. `phase` on assistant messages (2026-02-24) [G1][G2]
`MessagePhase` enum `commentary | final_answer`; VERBATIM: "For models like `gpt-5.3-codex` and beyond, when sending follow-up requests, preserve and resend phase on all assistant messages — dropping it can degrade performance." Replaying `response.output` items verbatim preserves it; hand-rebuilt `{"role":"assistant","content":...}` messages lose it.

### M8. Reasoning controls on OpenAI, current form [G2][G4]
```json
{"reasoning": {"effort": "medium", "mode": "standard|pro", "summary": "auto|concise|detailed", "context": "auto|current_turn|all_turns"}}
```
(COMPOSED shape from the `Reasoning` schema fields; each field verified [G2].)
- `context`: "Controls which reasoning items are rendered back to the model on later turns… The `gpt-5.6` model family defaults to `all_turns`; earlier models default to `current_turn`." `all_turns` only has effect if earlier items are available (previous_response_id, conversation, or full manual replay) [G2][G4].
- "Persisted reasoning can be reused only within the same model family… reasoning does not carry between the GPT-5.6 and GPT-5.5 families." [G4]
- `mode: "pro"` "aggregates the model work performed to produce the final answer and bills those tokens at the selected model's standard token rates" [G4].
- Mid-conversation effort change, VERBATIM item [G4]:
```json
{
  "type": "configuration_update",
  "reasoning": {
    "effort": "high"
  }
}
```
  "Keep request-level `reasoning.effort` unchanged to preserve the prompt prefix for caching" [G3]. Supported by the GPT-6 family in standard, single-agent mode [G4].
- Harmony parallel: "you should drop any previous CoT content on subsequent sampling if the responses by the assistant ended in a message to the `final` channel" [G43] — the open-weight version of `current_turn`. An HN reader of the Codex post observed the same: reasoning "persist[s] during the agent tool call loop, but [is] discarded after every user turn" [G49].
- Budget: "OpenAI recommends reserving at least 25,000 tokens for reasoning and outputs when you start experimenting" (via `max_output_tokens`) [G4].

### M9. OpenAI prompt caching after GPT-5.6 [G2][G10]
- Explicit breakpoint on a content block: `prompt_cache_breakpoint: { "mode": "explicit" }`; request-level `prompt_cache_options: {mode: "implicit"|"explicit", ttl: "30m"}`. Implicit mode = one implicit breakpoint + up to three explicit; explicit mode = up to four explicit, none → no caching [G2][G10].
- Lookup: "OpenAI considers up to the latest 80 breakpoints in the conversation, without a content-block lookback limit" [G2]; guide detail: first 2 and latest 50 explicit breakpoints (+ implicit candidates in implicit mode) [G10].
- Top-level `instructions` cannot carry a breakpoint — put reusable developer text in a developer message `input_text` block [G10].
- Min prefix 1,024 visible tokens (GPT-5.6+); `cached_tokens` exact; before 5.6: rounded down to 128 and minimum "varies by request settings" [G10].
- Routing: "traffic above 15 requests per minute can lead to overflow routing"; pre-5.6 models use `prompt_cache_key` for routing ("aim for about 15 requests per minute in total across all prefixes using each key") [G10].
- `CacheMissReasonTypeEnum` VERBATIM: `model_changed, prompt_cache_key_changed, tools_changed, text_format_changed, reasoning_effort_changed, verbosity_changed, context_compacted, input_changed, service_tier_changed` [G2] — a ready-made checklist of what breaks the cache in an agent loop.
- Codex team's cache-miss list (primary): changing `tools` mid-conversation, changing `model`, changing sandbox/approval/cwd; MCP `notifications/tools/list_changed` "can cause an expensive cache miss"; an early MCP bug enumerated tools "in a consistent order" wrongly → misses. Their fix pattern: **append** a new developer/user message describing the change instead of editing an earlier one [G16].
- Economics VERBATIM: "Across ten requests, one write and nine full reads cost 2.15× at that rate, compared with 10× without caching." [G10]

### M10. How Codex runs the loop (OpenAI primary source, 2026-01-23) [G16]
1. Endpoint is configurable; any server that "implements the Responses API" works (links openresponses.org); `--oss` defaults to `http://localhost:11434/v1/responses` (Ollama ≥0.13.4) or LM Studio ≥0.3.39.
2. Request = `instructions` (model-specific base prompt) + `tools` (Codex tools, Responses built-ins, MCP tools) + `input` items: developer message with sandbox/permissions, optional developer instructions from config, user message with aggregated `AGENTS.md` (32 KiB default cap), skills, user message with environment context, then the user's message.
3. Role priority VERBATIM: "`system`, `developer`, `user`, `assistant`" (decreasing). "the order of the first three items in the prompt is determined by the server, not the client."
4. Output items (`reasoning`, `function_call`) from `response.output_item.done` are appended to `input`; "the old prompt _is an exact prefix_ of the new prompt… to take advantage of _prompt caching_".
5. "isn't the agent loop _quadratic_ in terms of the amount of JSON sent…? And you would be right." They accept it; "When we get cache hits, _sampling the model is linear rather than quadratic_."
6. No `previous_response_id` (statelessness, ZDR); ZDR still gets reasoning continuity because "OpenAI persists a ZDR customer's decryption key, but not their data."
7. Compaction: first a `/compact` summarization turn, now automatic `/responses/compact` when `auto_compact_limit` is exceeded; result contains `type=compaction` with opaque `encrypted_content`.

### M11. Anthropic loop changes on the 2026 models [G19][G21][G22][G26][G27][G28]
- Tool result formatting rules VERBATIM [G28]: "Tool result blocks must immediately follow their corresponding tool use blocks in the message history. You cannot include any messages between the assistant's tool use message and the user's tool result message." / "In the user message containing tool results, the tool_result blocks must come FIRST in the content array. Any text must come AFTER all tool results." Error string to recognize: "tool_use ids were found without tool_result blocks immediately after". Tool failures: `"is_error": true` in `tool_result` [G28].
- Refusal response VERBATIM [G22]:
```json
{
  "id": "msg_01XFUDYJgAACzvnptvVoYEL",
  "type": "message",
  "role": "assistant",
  "model": "claude-fable-5",
  "content": [],
  "stop_reason": "refusal",
  "stop_details": {
    "type": "refusal",
    "category": "cyber",
    "explanation": "This request was declined because it could enable cyber harm."
  },
  "usage": {
    "input_tokens": 412,
    "output_tokens": 0
  }
}
```
- `pause_turn`: server-tool loop hit "10 iterations per request"; "continue the conversation by sending the response back as-is"; a response waiting on a *client* tool is never `pause_turn` [G21].
- Mid-conversation tool removal VERBATIM (beta header `inline-tools-2026-09-15`) [G27]:
```json
{
  "role": "system",
  "content": [
    {
      "type": "tool_removal",
      "tool": {"type": "tool_reference", "name": "get_weather"}
    }
  ]
}
```
  Rationale VERBATIM: "The `tools` array sits even earlier in the hashed request prefix than the top-level `system` field, so editing it invalidates the prompt cache for the entire conversation." [G27]
- Thinking binding: Sonnet 5.5 blocks are readable only by Sonnet 5.5; replaying a block after changing `system`, `tools` or an earlier message → 400 on accounts created on/after 2026-08-31 (or silent drop with `thinking-binding-controls-2026-08-01`); "Keep the conversation append-only so the check never fails" [G26].
- Sonnet 5.5 behaviour change: "Text between tool calls comes back in thinking blocks"; at default `display: "omitted"` a streaming UI "goes quiet between tool calls, with no error" [G26].
- Budget semantics VERBATIM: "`max_tokens` is a hard cap on total output for the request, thinking and response text combined… In a tool-use loop, each request in the turn has its own `max_tokens`, so it doesn't bound the whole turn's spend." [G25]
- `thinking.display`: `"summarized"` / `"omitted"` (billing identical) and beta `"updates"`; billed thinking in `usage.output_tokens_details.thinking_tokens` [G19][G25].

### M12. Anthropic caching additions [G23][G29]
- **Automatic caching**: one top-level `"cache_control": {"type": "ephemeral"}` — "The system automatically applies the cache breakpoint to the last cacheable block and moves it forward as conversations grow"; uses one of the 4 breakpoint slots; 400 if four explicit breakpoints already exist [G23].
- Lookback: "The system checks at most 20 positions per breakpoint, counting the breakpoint itself as the first" [G23].
- Minimum cacheable tokens (Claude API): 512 (Fable 5.1, Mythos 5.1, Opus 5.5, Opus 5, Sonnet 5.5, Fable 5, Mythos 5); 2,048 (Mythos Preview, Opus 4.7); 4,096 (Opus 4.6, Opus 4.5, Haiku 4.5); 1,024 (Opus 4.8, Sonnet 5, Sonnet 4.6, Sonnet 4.5 …). Below minimum: "processed without caching, and no error is returned" [G23].
- Cache-aware ITPM: "`cache_read_input_tokens`… Do NOT count toward ITPM for most models" [G29] — caching raises effective throughput, not just cost.

### M13. Structured outputs on Anthropic (GA) [G24]
VERBATIM (CLI YAML form of the request):
```yaml
output_config:
  format:
    type: json_schema
    schema:
      type: object
      properties:
        name: {type: string}
        email: {type: string}
        plan_interest: {type: string}
        demo_requested: {type: boolean}
      required: [name, email, plan_interest, demo_requested]
      additionalProperties: false
```
"Structured outputs guarantee schema-compliant responses through constrained decoding"; strict tool use = "grammar-constrained sampling" on tool inputs [G24]. So both vendors now implement "strict" by constrained decoding.

### M14. How tools and messages become tokens (filling the chat-template gap) [G41][G42][G43]
- HF: `tokenizer.apply_chat_template(messages, tools=tools, add_generation_prompt=True, return_dict=True, return_tensors="pt")`; tools can be JSON Schema or Python functions (Google-style docstrings parsed by `get_json_schema`) [G42].
- Rendered output of a Hermes-style model, VERBATIM [G42]:
```txt
<tool_call>
{"arguments": {"location": "Paris, France", "unit": "celsius"}, "name": "get_current_temperature"}
</tool_call><|im_end|>
```
- Transformers VERBATIM warning: "Although `tool_calls` is similar to the OpenAI API, the OpenAI API uses a JSON string as its `tool_calls` format. This may cause errors or strange model behavior if used in Transformers, which expects a dict." Tool results use `{"role": "tool", "content": "22"}` — "the returned content is always a string" [G42].
- Harmony tool call and result, VERBATIM [G43]:
```
<|start|>assistant<|channel|>commentary to=functions.get_current_weather <|constrain|>json<|message|>{"location":"San Francisco"}<|call|>
<|start|>functions.get_current_weather to=assistant<|channel|>commentary<|message|>{"sunny": true, "temperature": 20}<|end|>
```
  `<|return|>` is decode-time only: "replace the trailing `<|return|>` with `<|end|>`" when storing history [G43].
- Same call in three families, VERBATIM from Louf [G41]:
```
<|channel|>commentary to=functions.search
<|constrain|>json<|message|>
{"query": "GPU"}
<|call|>
```
```
<｜tool▁calls▁begin｜><｜tool▁call▁begin｜>function<｜tool▁sep｜>search
'''json
{"query": "GPU"}
'''
<｜tool▁call▁end｜><｜tool▁calls▁end｜>
```
```
<tool_call>search
<arg_key>query</arg_key><arg_value>GPU</arg_value>
</tool_call>
```
  Thesis VERBATIM: "wire formats are training-time decisions, and nothing constrains them to a shared convention." Concrete 2026 bugs cited: Gemma 4 reasoning tokens stripped before the parser (vLLM #38855), reasoning leaking into tool arguments (vLLM PR #39027), llama.cpp dropping its generic autoparser for a dedicated one (PR #21418) [G41]. This is why vLLM needs `--tool-call-parser` per model (spec.md [S17]).

### M15. Minimal agent loop on the Responses API (COMPOSED)
Built only from verified facts: item replay with `input += response.output` [G6], `call_id` correlation [G6], `store=False` + default `encrypted_content` [G2][G5], `status`/`incomplete_details` [G2], strict tools [G6], SDK retry defaults [G17]. Works against OpenAI and (minus `store`) against stateless Responses servers (Ollama, OpenRouter) [G35][G37].
```python
# COMPOSED — not copied from one source
import json
from openai import OpenAI

client = OpenAI(max_retries=4)          # SDK retries 408/409/429/5xx with backoff [G17]
MODEL = "gpt-6.1-sol"                   # GPT-6 tool calling requires Responses [G3]
MAX_STEPS = 20

TOOLS = [{
    "type": "function", "name": "get_weather", "strict": True,
    "description": "Current weather for a city.",
    "parameters": {"type": "object",
                   "properties": {"city": {"type": "string"}},
                   "required": ["city"], "additionalProperties": False},
}]
IMPLS = {"get_weather": lambda city: {"city": city, "temp_c": 22}}

def run(task: str) -> str:
    items: list = [{"role": "user", "content": task}]
    for _ in range(MAX_STEPS):
        resp = client.responses.create(
            model=MODEL,
            instructions="You are a careful assistant.",  # resend every call [G5]
            input=items, tools=TOOLS,
            store=False,                                  # stateless; reasoning comes back encrypted [G5]
            reasoning={"effort": "medium"},
            max_output_tokens=25_000,                     # room for reasoning [G4]
        )
        if resp.status != "completed":
            raise RuntimeError(f"{resp.status}: {resp.incomplete_details}")
        items += resp.output                              # replay reasoning/function_call/phase verbatim
        calls = [it for it in resp.output if it.type == "function_call"]
        if not calls:                                     # no tool calls -> final answer [G16]
            return resp.output_text
        for call in calls:
            try:
                result = IMPLS[call.name](**json.loads(call.arguments))
            except Exception as exc:                      # tool errors go back to the model
                result = {"error": f"{type(exc).__name__}: {exc}"}
            items.append({"type": "function_call_output",
                          "call_id": call.call_id,
                          "output": json.dumps(result)})
    raise RuntimeError("max steps exceeded")
```
Anthropic delta (COMPOSED, facts from [G21][G26][G28]): loop on `stop_reason`, not on content: `tool_use` → append the whole `response.content` as the assistant turn and one user message whose content *starts* with all `tool_result` blocks; `pause_turn` → resend as-is; `refusal` → branch; `max_tokens` / `model_context_window_exceeded` → truncated; never edit earlier turns (thinking binding); do not use forced `tool_choice` on 5.x models.

### M16. SDK-level loops — defaults that differ [G44][G45]
- OpenAI Agents SDK: runner loop = call LLM → final output (text of the desired type and **no tool calls**) | handoff | tool calls → repeat; `DEFAULT_MAX_TURNS = 10` → `MaxTurnsExceeded`; `max_turns=None` disables; `error_handlers` keys `"max_turns"`, `"model_refusal"`, `"invalid_final_output"` [G44].
- Claude Agent SDK: `max_turns` counts tool-use turns only, default "No limit"; `max_budget_usd` default "No limit"; results `error_max_turns` / `error_max_budget_usd`; custom tools run sequentially unless annotated `readOnlyHint`; auto-compaction emits `compact_boundary` [G45].

### M17. Ecosystem compatibility facts (gap-fill) [G30][G34][G35][G36][G37][G47]
- Ollama: `/v1/chat/completions`, `/v1/completions`, `/v1/responses` (stateless only: no `previous_response_id`, no `conversation`) [G35].
- vLLM (dev docs): `/v1/chat/completions`, `/v1/responses` (+ retrieve/cancel), and Anthropic-compatible `/v1/messages`, `/v1/messages/count_tokens` [G36].
- OpenRouter: `https://openrouter.ai/api/v1/responses`, stateless only, 400 on `store: true` or `previous_response_id` [G37].
- DeepSeek: added the Responses format "To meet the demand for Codex" [G47].
- Anthropic OpenAI-SDK compatibility (`base_url="https://api.anthropic.com/v1/"`): "not considered a long-term or production-ready solution"; `strict` ignored; `response_format` ignored; prompt caching not supported; "Most unsupported fields are silently ignored rather than producing errors." [G30]
- Gemini OpenAI compatibility: `https://generativelanguage.googleapis.com/v1beta/openai/`, `reasoning_effort` mapped onto `thinking_level`/`thinking_budget`, `"none"` disables thinking where supported [G34].
- Cross-provider `finish_reason` bug: opencode exited the loop because Gemini/LiteLLM-fronted providers return `"stop"` with tool calls; loop condition VERBATIM: `if (lastAssistant?.finish && !["tool-calls", "unknown"].includes(lastAssistant.finish)...break` [G46]. Rule: gate on presence of tool calls.

### M18. Errors and retries (2026 state) [G1][G13][G17][G29]
| Provider | Status | Code / type | Retry? |
|---|---|---|---|
| OpenAI | 429 | `slow_down` (rate increased too quickly, can happen inside RPM/TPM) | yes, honor `Retry-After`, ramp gradually |
| OpenAI | 429 | `credit_balance_exhausted`, `organization_spend_limit_exceeded`, `project_spend_limit_exceeded`, `organization_usage_limit_exceeded` | no (human action) |
| OpenAI | 503 | `server_is_overloaded` | yes, honor `Retry-After` |
| Anthropic | 429 | `rate_limit_error` (spend-cap variant has **no** `retry-after`) | depends |
| Anthropic | 529 | `overloaded_error` (in-stream as `{"type":"error","error":{"type":"overloaded_error",...}}`) | yes |
- OpenAI: "When the header is present, wait at least as long as it specifies before retrying. If it's missing, use exponential backoff." [G1]
- SDK defaults: openai-python retries 2 times (connection errors, 408, 409, 429, ≥500), "only when their body can be safely resent" [G17]; Anthropic SDK retries twice, "honoring the `retry-after` header when present" [G29].
- Anthropic rate limiting is a token bucket (continuous replenishment), headers `anthropic-ratelimit-*`, reset times in RFC 3339 [G29].

### M19. Token counting before sending [G2][G29]
- OpenAI: `POST /v1/responses/input_tokens` → object `response.input_tokens` with `input_tokens` [G2].
- Anthropic: token counting endpoint (`/v1/messages/count_tokens`, also mirrored by vLLM [G36]); on Sonnet 5.5 the forced-`tool_choice` check also applies to it [G26].

## Numbers

- OpenAI internal: Responses vs Chat Completions with reasoning models "3% improvement in SWE-bench with same prompt and setup"; "40% to 80% improvement" in cache utilization "in internal tests" — both OpenAI self-reported, no model/date named on the page [G5].
- WebSocket mode: "up to roughly 40% faster end-to-end execution" for rollouts with 20+ tool calls (OpenAI, no dataset) [G11].
- OpenAI caching (GPT-5.6+): write 1.25x, read 0.1x (0.05x GPT-6.1 Sol); 1 write + 1 read = 1.35x vs 2x uncached; 1 write + 9 reads = 2.15x vs 10x [G10].
- OpenAI cache routing threshold: ~15 requests/minute per machine / per `prompt_cache_key` [G10].
- OpenAI pricing (per 1M, ≤272K input): GPT-6.1 Sol $2 / $0.10 cached / $2.50 cache-write / $10; GPT-6 Sol $2 / $0.20 / $10; GPT-6 Luna $0.10 / $0.01 / $0.50 [G1].
- Fast mode: GPT-5.6 Sol "up to 2.5× faster… at twice the price"; Ultrafast (GPT-5.6 Sol preview): "up to 14x faster than Standard" (announcement 2026-08-13) [G1].
- Container billing: per minute with 5-minute minimum since 2026-06-02 (was full 20-minute session) [G1].
- Anthropic tool-use system-prompt overhead (tokens, `auto/none` | `any/tool`) [G28]: Opus 5.5 286 | n/a; Sonnet 5.5 286 | n/a; Opus 5 286 | 406; Opus 4.8 290 | 410; Opus 4.7 675 | 804; Opus 4.6 497 | 589; Sonnet 5 354 | 474; Sonnet 4.6 497 | 589; Haiku 4.5 496 | 588.
- Anthropic threshold compaction: default trigger 150,000 input tokens, minimum 50,000 [G20].
- Anthropic `pause_turn`: 10 server-tool iterations per request [G21].
- Codex: `AGENTS.md` aggregation cap 32 KiB default [G16].
- Gemini agentic video understanding: "up to 88% fewer tokens for long-form content" (Google, 2026-09-01) [G33].
- LiteLLM malware: `litellm_init.pth` 34,628 bytes; AES-256 + 4096-bit RSA; exfil to `https://models.litellm.cloud/` [G40]. HN thread 938 points / 500 comments (2026-03-24) [G40].
- HN "Unrolling the Codex agent loop" (item 46737630, 2026-01-23): 456 points / 208 comments [G49].

## Pitfalls, limits, criticism (new)

- **Quadratic context**: every loop iteration resends the whole transcript; only prefix caching makes it linear in compute — OpenAI says so about its own agent [G16]. Anything that edits history (timestamps, reordering MCP tools, changing tools/model/effort) turns the loop quadratic again [G2][G16].
- **Editing history is now an error, not just a cache miss**: Claude thinking binding returns 400 on history edits for new accounts; mid-conversation system messages exist precisely so harnesses stay append-only [G26][G27].
- **Forced tool use is disappearing** on frontier Claude models; code relying on `tool_choice: any` for "structured extraction via a fake tool" breaks — move to structured outputs [G26][G28].
- **Spend-limit 429s are retried by default SDK logic** [G13][G17]; branch on `error.code`.
- **Stateless-only third-party Responses** means `previous_response_id`-based code is not portable [G35][G37].
- **Compat layers silently drop features** (strict, response_format, caching) [G30]; the opencode bug shows the same class for `finish_reason` [G46].
- **Streaming reasoning blobs**: `encrypted_content` in `response.output_item.added` "may be incomplete" — persist the `.done` version [G2].
- **Sonnet 5.5 UIs go quiet** between tool calls unless `display` is set [G26].
- **Gateways are supply-chain targets**: LiteLLM 1.82.7/1.82.8 credential stealer ran on interpreter start via `.pth`, no import needed [G40]; Mercor reported a breach tied to it (TechCrunch, via HN 47596739, not opened) [G40]. Pin and hash gateway dependencies (cross-link ch.16).
- **GPT-6 Astra asks more questions**: OpenAI warns it "is more likely to ask for clarification where earlier models would make assumptions", which can stop an unattended loop; OpenAI ships autonomy prompts for it [G3]. A loop's stop condition "no tool calls" then ends on a question, not an answer.
- **GPT-6 Astra is more sensitive to `AGENTS.md`/skills**: "We strongly recommend auditing skills and other files accessible to your model" [G3] (cross-link ch.06/16).
- Anthropic's own disclaimer on its OpenAI-compat layer: testing only [G30].

## What changed in the last 6 months (April–September 2026), not in the other notes

- OpenAI: GPT-5.5 (04-24), GPT-5.6 family with explicit caching/persisted reasoning/`max`/Pro mode/multi-agent (07-09), Fast mode replaces Priority (07-30), hard spend limits (07-22), `prompt_cache_retention` 24h default (05-29), GPT-6 Astra + async tools + steering + `configuration_update` (09-03), error codes (09-02), cache diagnostics GA (09-08), Agents API (09-10), GPT-6 Sol/Luna (09-22), GPT-6.1 Sol + Ultrafast (09-29); deprecations of prompts/Evals/Agent Builder (06-03) and GPT-5/o3 snapshots (06-11) [G1][G14].
- Anthropic: Sonnet 5 (06-30), Opus 5 (07-24), Fable 5.1 (09-01), Opus 5.5 (09-22), Sonnet 5.5 (09-28); mid-conversation system messages (07-15); server-side fallback (07-24); Python SDK 1.0 (08-20); Files API and Agent Skills GA (08-19); on-demand compaction (09-14); inline tool definitions beta (09-22); cache diagnostics GA (09-23); refusal billing (09-24) [G19].
- Google: Interactions schema change (05-26), Gemini 3.6/3.7/3.8 Flash GA (07-21, 08-13, 09-02), 2.5 access restricted (09-18) [G33].
- Ecosystem: DeepSeek Responses API for Codex (Aug 2026, HN 2026-08-12) [G47]; Open Responses unchanged since 2026-04-24 [G38].

## Diagram candidates

1. **Quadratic-vs-linear loop** — actors: harness, Responses API, prompt cache. Arrows per iteration: "input_n = input_{n-1} + output items + tool outputs"; cache hit on prefix labeled "linear sampling"; a red arrow "tools list reordered → cache miss → full recompute" [G16].
2. **Codex prompt assembly stack** — boxes top to bottom: server system message → `tools` → `instructions` → developer(permissions) → developer(config) → user(AGENTS.md, skills) → user(environment) → user message; label "first three ordered by server" [G16].
3. **OpenAI cache breakpoints (GPT-5.6+)** — a content-block timeline with implicit breakpoint at last eligible message, up to 3 explicit pins, `ttl 30m`; side legend of `CacheMissReasonTypeEnum` values [G2][G10].
4. **Async tool call lifecycle** — states: `function_call(async:true)` emitted → model continues → app job running → `function_call_output` via next request or `response.inject` → model incorporates [G12][G2].
5. **WebSocket session** — one socket, `stream_id` lanes, each turn `response.create{previous_response_id, new items}`, eviction on 4xx/5xx, 60-min reconnect with compaction handoff [G11][G38].
6. **Anthropic 2026 stop-reason router** — 7 exits: `end_turn` → return; `tool_use` → run tools, tool_result-first message; `pause_turn` → resend; `refusal` → fallback/abort; `max_tokens`/`model_context_window_exceeded` → continue or raise; `stop_sequence` → app logic [G21][G22].
7. **Append-only conversation on Claude** — timeline with thinking blocks locked to prefix; "edit earlier message" → 400; "append `role:system` message / `tool_addition`" → OK and cache preserved [G26][G27].
8. **Two compaction modes on Anthropic** — threshold (inside request, API drops blocks before `compaction` block) vs on-demand (separate request, you swap the signed block in first) [G20].
9. **Tool-call wire formats at token level** — same `search(query="GPU")` rendered in Harmony, DeepSeek, GLM5, Hermes `<tool_call>`; arrows to "engine-specific parser" boxes → normalized `tool_calls` JSON [G41][G42][G43].
10. **Compatibility matrix** — rows: OpenAI, Ollama, OpenRouter, vLLM, DeepSeek, Anthropic-compat, Gemini-compat; columns: CC, Responses, stateful Responses, strict honored, caching [G30][G34][G35][G36][G37][G47].
11. **Error-handling decision tree** — HTTP status + `error.code` → retry with Retry-After / backoff / stop and alert [G13][G29].

Chart candidates (real series):
- OpenAI reasoning-effort ladder growth (count of enum values by date): 2024-12-17: 3 (low/medium/high); 2025-08-07: 4 (+minimal); 2025-11-13: 5 (+none); 2025-12-11: 6 (+xhigh); 2026-07-09: 7 (+max) [G1].
- Anthropic tool-use overhead by model (auto/none tokens): Opus 4.1 313, Opus 4.5 496, Opus 4.6 497, Opus 4.7 675, Opus 4.8 290, Opus 5 286, Opus 5.5 286 [G28].
- Anthropic minimum cacheable prefix by model (512 / 1,024 / 2,048 / 4,096) [G23].
- OpenAI caching cost multiple vs number of reuses (1 write + n reads = 1.25 + 0.1n vs n+1) — derived from [G10], label as derived.

## Glossary

- **`phase`**: OpenAI assistant-message label `commentary` | `final_answer`; must be round-tripped for gpt-5.3-codex and later.
- **`configuration_update`**: Responses input item that changes reasoning effort for later turns without touching the cached prefix (GPT-6 family).
- **`reasoning.context`**: whether earlier-turn reasoning items are rendered back (`current_turn` / `all_turns` / `auto`).
- **`reasoning.mode: pro`**: OpenAI higher-compute execution mode, independent of effort.
- **Async tool**: OpenAI function/custom tool with `async: true`; model continues while the app runs it.
- **`response.inject`**: WebSocket client event that adds input (e.g., async tool results) to an active response.
- **`response.steer`**: WebSocket client event that redirects an in-progress response; ends it with `incomplete_details.reason: "steered"`.
- **WebSocket mode**: persistent `/v1/responses` transport, incremental inputs, 60-minute connections.
- **Explicit cache breakpoint**: `prompt_cache_breakpoint: {mode: "explicit"}` on an input block (OpenAI GPT-5.6+); Anthropic's equivalent is block-level `cache_control`.
- **Automatic caching (Anthropic)**: top-level `cache_control` that auto-moves the breakpoint to the last cacheable block.
- **Cache miss reason**: typed diagnostic (`tools_changed`, `input_changed`, …) returned by Prompt Cache Diagnostics.
- **Mid-conversation system message**: Anthropic `role: "system"` message inside `messages`, cache-preserving.
- **`tool_addition` / `tool_removal`**: Anthropic system-message content blocks that change available tools mid-conversation (beta).
- **Thinking binding**: Anthropic rule that thinking blocks are valid only for a compatible model, an unchanged prefix and (Sonnet 5.5) the producing account.
- **`between_tools`**: Sonnet 5.5 thinking type that suppresses up-front thinking.
- **Server-side fallback**: Anthropic `fallbacks` parameter that retries a refused request on another model within one call.
- **`stop_details`**: Anthropic object explaining a `refusal` (`category`, `explanation`).
- **M×N problem**: every inference engine (M) writing a parser for every model's tool-call format (N).
- **Stateless Responses**: third-party Responses implementations without `previous_response_id`/`store`.

## Unverified / open questions

- Whether `include: ["reasoning.encrypted_content"]` is still accepted or now redundant/ignored — docs say default; not tested (no API key).
- Whether OpenAI's HTTP Responses SSE stream ever emits `data: [DONE]` — not documented; not tested live.
- Author of "Unrolling the Codex agent loop" — not present in the fetched text (openai.com returned 403; read through a reader proxy); date taken from HN item 46737630 (2026-01-23).
- Nvidia's role in Open Responses — not found in Willison's partner list or governance page.
- Claude Mythos 5.1 specs beyond: Project Glasswing participants only, same pricing as Fable 5.1, 0.025x cache reads [G19]; no dedicated model page read.
- GPT-6 Astra price/context window — model page not opened.
- Mercor breach details (TechCrunch 2026-03-31) — seen only as an HN title.
- vLLM `/v1/responses` feature completeness (stateful? built-in tools?) — docs page lists endpoints only.
- Anthropic "tool runner" SDK helper and its interaction with the 5.x breaking changes — not re-read.
- WebSearch budget for this session was exhausted before the pass; discovery used HN Algolia, raw docs (`.md`, `llms.txt`) and a reader proxy instead.

## Sources

- [G1] OpenAI API Changelog, OpenAI, entries 2024-12-17 … 2026-09-29, https://developers.openai.com/api/docs/changelog.md, accessed 2026-09-30.
- [G2] `openai/openai-openapi` `openapi.yaml` (master, 112,973 lines), OpenAI, fetched 2026-09-30, https://raw.githubusercontent.com/openai/openai-openapi/master/openapi.yaml, accessed 2026-09-30.
- [G3] "Using GPT-6" (latest-model guide), OpenAI, undated live page (covers 2026-09-29 GPT-6.1 Sol), https://developers.openai.com/api/docs/guides/latest-model.md, accessed 2026-09-30.
- [G4] "Reasoning models", OpenAI, undated live page, https://developers.openai.com/api/docs/guides/reasoning.md, accessed 2026-09-30.
- [G5] "Migrate to the Responses API", OpenAI, undated live page, https://developers.openai.com/api/docs/guides/migrate-to-responses.md, accessed 2026-09-30.
- [G6] "Function calling", OpenAI, undated live page, https://developers.openai.com/api/docs/guides/function-calling.md, accessed 2026-09-30.
- [G7] "Streaming API responses", OpenAI, undated live page, https://developers.openai.com/api/docs/guides/streaming-responses.md, accessed 2026-09-30.
- [G8] "Background mode", OpenAI, undated live page, https://developers.openai.com/api/docs/guides/background.md, accessed 2026-09-30.
- [G9] "Compaction", OpenAI, undated live page, https://developers.openai.com/api/docs/guides/compaction.md, accessed 2026-09-30.
- [G10] "Prompt caching", OpenAI, undated live page, https://developers.openai.com/api/docs/guides/prompt-caching.md, accessed 2026-09-30.
- [G11] "WebSocket Mode", OpenAI, undated live page (feature 2026-02-23), https://developers.openai.com/api/docs/guides/websocket-mode.md, accessed 2026-09-30.
- [G12] "Async tool calling", OpenAI, undated live page (feature 2026-09-03), https://developers.openai.com/api/docs/guides/async-tool-calling.md, accessed 2026-09-30.
- [G13] "Rate limits" and "Error codes", OpenAI, undated live pages, https://developers.openai.com/api/docs/guides/rate-limits.md and https://developers.openai.com/api/docs/guides/error-codes.md, accessed 2026-09-30.
- [G14] "Deprecations", OpenAI, undated live page, https://developers.openai.com/api/docs/deprecations.md, accessed 2026-09-30.
- [G15] "Assistants API beta deprecation — August 26, 2026 sunset", edwinarbus (OpenAI), OpenAI Developer Community, 2025-08-26, https://community.openai.com/t/assistants-api-beta-deprecation-august-26-2026-sunset/1354666, accessed 2026-09-30.
- [G16] "Unrolling the Codex agent loop", OpenAI, 2026-01-23 (date per HN), https://openai.com/index/unrolling-the-codex-agent-loop/ (read via r.jina.ai reader; direct fetch 403), accessed 2026-09-30.
- [G17] `openai-python` README (Retries section), OpenAI, main branch, https://github.com/openai/openai-python/blob/main/README.md, accessed 2026-09-30.
- [G18] "Models overview", Anthropic, undated live page, https://platform.claude.com/docs/en/about-claude/models/overview.md, accessed 2026-09-30.
- [G19] "Release notes" (Claude Platform), Anthropic, entries 2026-06-26 … 2026-09-28, https://platform.claude.com/docs/en/release-notes/overview.md, accessed 2026-09-30.
- [G20] "Compaction overview", "Compaction at a token threshold", "Compaction on demand", Anthropic, undated live pages, https://platform.claude.com/docs/en/build-with-claude/compaction.md (+ compaction-threshold.md, compaction-on-demand.md), accessed 2026-09-30.
- [G21] "Handling stop reasons", Anthropic, undated live page, https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons.md, accessed 2026-09-30.
- [G22] "Refusals and fallback", Anthropic, undated live page (states "as of September 2026"), https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback.md, accessed 2026-09-30.
- [G23] "Prompt caching", Anthropic, undated live page, https://platform.claude.com/docs/en/build-with-claude/prompt-caching.md, accessed 2026-09-30.
- [G24] "Structured outputs" (status GA), Anthropic, undated live page, https://platform.claude.com/docs/en/build-with-claude/structured-outputs.md, accessed 2026-09-30.
- [G25] "Effort" and "Steering thinking" (adaptive thinking), Anthropic, undated live pages, https://platform.claude.com/docs/en/build-with-claude/effort.md and https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking.md, accessed 2026-09-30.
- [G26] "What's new in Claude Sonnet 5.5", Anthropic, 2026-09-28 release, https://platform.claude.com/docs/en/models/sonnet-5-5/whats-new-sonnet-5-5.md, accessed 2026-09-30.
- [G27] "Mid-conversation system messages and tool changes", Anthropic, undated live page, https://platform.claude.com/docs/en/build-with-claude/mid-conversation-system-messages.md, accessed 2026-09-30.
- [G28] Tool use pages: "Implement tool use", "Tool use overview", "Handle tool calls", Anthropic, undated live pages, https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use.md, .../overview.md, .../handle-tool-calls.md, accessed 2026-09-30.
- [G29] "Streaming Messages", "Errors", "Rate limits", Anthropic, undated live pages, https://platform.claude.com/docs/en/build-with-claude/streaming.md, https://platform.claude.com/docs/en/api/errors.md, https://platform.claude.com/docs/en/api/rate-limits.md, accessed 2026-09-30.
- [G30] "OpenAI SDK compatibility", Anthropic, undated live page, https://platform.claude.com/docs/en/api/openai-sdk.md, accessed 2026-09-30.
- [G31] "Interactions API" overview (Beta), Google, undated live page, https://ai.google.dev/gemini-api/docs/interactions.md.txt, accessed 2026-09-30.
- [G32] "Gemini thinking", Google, undated live page, https://ai.google.dev/gemini-api/docs/thinking.md.txt, accessed 2026-09-30.
- [G33] Gemini API changelog, Google, entries 2025-12-11 … 2026-09-22, https://ai.google.dev/gemini-api/docs/changelog.md.txt, accessed 2026-09-30.
- [G34] "OpenAI compatibility" (Gemini), Google, undated live page, https://ai.google.dev/gemini-api/docs/openai.md.txt, accessed 2026-09-30.
- [G35] "OpenAI compatibility", Ollama, `docs/api/openai-compatibility.mdx` main branch, https://raw.githubusercontent.com/ollama/ollama/main/docs/api/openai-compatibility.mdx, accessed 2026-09-30.
- [G36] "Online serving" (OpenAI-compatible server), vLLM, latest dev docs, https://docs.vllm.ai/en/latest/serving/online_serving/, accessed 2026-09-30 (via WebFetch summary).
- [G37] "Responses API" overview, OpenRouter, undated live page, https://openrouter.ai/docs/api_reference/responses/overview.md, accessed 2026-09-30.
- [G38] Open Responses: "Specification 2026-04-24", llms.txt, governance charter, Open Responses project, 2026-04-24, https://www.openresponses.org/specification/2026-04-24, https://www.openresponses.org/llms.txt, https://www.openresponses.org/governance, accessed 2026-09-30.
- [G39] "Open Responses", Simon Willison, 2026-01-15, https://simonwillison.net/2026/Jan/15/open-responses/, accessed 2026-09-30.
- [G40] "[Security]: CRITICAL: Malicious litellm_init.pth in litellm 1.82.8 — credential stealer", BerriAI/litellm issue #24512, 2026-03-24, https://github.com/BerriAI/litellm/issues/24512; HN "Tell HN: Litellm 1.82.7 and 1.82.8 on PyPI are compromised", 2026-03-24, https://news.ycombinator.com/item?id=47501426; HN "Mercor says it was hit by cyberattack tied to compromise LiteLLM", 2026-04-01, https://news.ycombinator.com/item?id=47596739 (title only); accessed 2026-09-30.
- [G41] "Tool calling, open source, and the M×N problem", Rémi Louf (dottxt), 2026-04-09 (HN date), https://www.thetypicalset.com/blog/grammar-parser-maintenance-contract, accessed 2026-09-30.
- [G42] "Tool use" (`chat_extras.md`), Hugging Face Transformers docs, main branch, https://raw.githubusercontent.com/huggingface/transformers/main/docs/source/en/chat_extras.md, accessed 2026-09-30.
- [G43] "OpenAI Harmony Response Format", OpenAI Cookbook, undated, https://developers.openai.com/cookbook/articles/openai-harmony.md; `openai/harmony` README, https://github.com/openai/harmony, accessed 2026-09-30.
- [G44] OpenAI Agents SDK docs `running_agents.md` and `src/agents/run_config.py` (`DEFAULT_MAX_TURNS = 10`), GitHub `openai/openai-agents-python` main, https://github.com/openai/openai-agents-python, accessed 2026-09-30.
- [G45] "How the agent loop works" (Claude Agent SDK), Anthropic, undated live page, https://code.claude.com/docs/en/agent-sdk/agent-loop.md, accessed 2026-09-30.
- [G46] "Agent stops after tool execution with OpenAI-compatible providers (Gemini, LiteLLM)", anomalyco/opencode issue #14972, 2026-02-25, closed via PR #14973, https://github.com/anomalyco/opencode/issues/14972, accessed 2026-09-30.
- [G47] "Using the Responses API", DeepSeek API Docs, undated (HN link 2026-08-12), https://api-docs.deepseek.com/guides/responses_api/, accessed 2026-09-30.
- [G48] PyPI JSON API for `openai`, `anthropic`, `openai-agents`, `claude-agent-sdk`, `litellm`, `vllm`, `openai-harmony`, https://pypi.org/pypi/<pkg>/json, accessed 2026-09-30.
- [G49] HN discussion "Unrolling the Codex agent loop", item 46737630, 2026-01-23 (comment by `jumploops` on reasoning persistence), https://news.ycombinator.com/item?id=46737630, accessed 2026-09-30.
