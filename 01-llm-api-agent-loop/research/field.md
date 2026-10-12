# 01. LLM API и цикл агента — field reports notes

Lens: what actually bites in production, per HN/Reddit/GitHub/Habr/Telegram threads, last ~6 months prioritized. Today: 2026-09-30.

## TL;DR (engineer must know today)

- **Chat Completions is not dead**, but OpenAI ships new capability to the Responses API first; Chat Completions is described as "still supported... no longer actively developed" [S9-synth]. Responses (`POST /v1/responses`) is the recommended default for new projects in 2026.
- **Assistants API is fully gone.** Announced sunset 2025-08-26, hard shutdown 2026-08-26: every call to `/v1/assistants`, `/v1/threads`, `/v1/threads/runs` now errors [S3, S4]. No automated migration tool — teams rebuild on Responses + Conversations API.
- Core architectural split, confirmed by an OpenAI engineer on HN: **Chat Completions is stateless and single-turn** (one model call per API call); **Responses is stateful and can make multiple model turns + tool calls inside one API call** when given hosted tools [S1].
- Migrating Chat Completions → Responses **breaks silently in ~7 places**, no API error: `prompt_tokens`/`completion_tokens` → `input_tokens`/`output_tokens`; `finish_reason` disappears (replaced by `status: "incomplete"` + `incomplete_details.reason`); `output` becomes a typed-item array (a reasoning item can be `output[0]`, not the answer); `previous_response_id` does **not** carry forward the `instructions` field; chained turns still bill **all** prior input tokens even though you don't resend them; Responses defaults toward `strict` tool mode when Chat Completions defaulted to non-strict; the SSE stream ends with a typed `response.completed` event, not `data: [DONE]` [S12].
- **Reasoning items + `encrypted_content`** let a stateless (ZDR / `store:false`) client replay a model's hidden chain-of-thought across turns without OpenAI storing anything server-side — decrypted only in memory, discarded after use [search-synth, S4]. OpenAI's own number: passing reasoning items back measured **+3% on SWE-bench** in the o4-mini era [S8]; switching Completions→Responses reportedly raised cache utilization **40%→80%** [S8].
- **Server-side compaction** shipped to the Responses API in Feb 2026: crosses a configurable token threshold (`context_management.compact_threshold`) → server emits an opaque, non-human-readable compaction item → prunes history. If you use `previous_response_id`, don't manually prune — the compaction item is now part of the required chain [S5]. Anthropic ships the parallel feature as a *beta* (`compact-2026-01-12`) with an explicit warning: you must append the full `response.content` (not just text) back each turn or the compaction state is silently lost [S18].
- **Background mode** solves long-reasoning-call timeouts: `background: true` → poll `GET /v1/responses/{id}` through `queued`/`in_progress` → terminal `completed`/`failed`/`cancelled`; a dropped SSE connection resumes via `?stream=true&starting_after={sequence_number}` [S6].
- **`finish_reason` vs tool calls is a live, open production bug class.** OpenAI itself returns `finish_reason: "tool_calls"` when tools are invoked; Gemini and LiteLLM-fronted providers often return `finish_reason: "stop"` even when `tool_calls` is populated — this silently ends agent loops before tool results are processed. Confirmed and fixed in `opencode` issue #14972 (Feb 2026) [S11].
- **Open Responses** (openresponses.org, spec revisions dated `2026-01-15` and `2026-04-24`) is a community effort to standardize the Responses wire shape across vLLM, Ollama, OpenRouter and HuggingFace so it doesn't stay an OpenAI-only interface — explicit reaction to Responses being harder to multi-home than Chat Completions ever was [S10, S1].
- **Anthropic's loop primitive stays simpler**: content-block arrays, `tool_use`/`tool_result` matched by `id`/`tool_use_id`, `stop_reason` (not `finish_reason`) as the sole authoritative loop-exit signal, up to 4 `cache_control` breakpoints per request, and **thinking blocks that must be replayed unmodified to the *same* model** or are silently dropped on model switch [S18].
- **Gemini quietly moved its primary tool-calling surface to a new "Interactions API"** (`POST /v1beta/interactions`, `input` field, `tools: [{"type": "function", ...}]` flat array, response built from typed `steps` including `FunctionCallStep`) — confirmed directly from Google's own live docs and curl example, alongside a dedicated "Interactions breaking changes (May 2026)" changelog page [S16]. Most blog content and older SDKs on the web still describe the older `contents[].parts[].functionCall/functionResponse` shape.
- **A complete agent loop is genuinely ~50-60 lines regardless of vendor**: system prompt defines an action syntax, `while True: call model → parse action → execute → append result → repeat`. It doesn't require JSON tool-calling at all — a regex over a fenced code block works, at the cost of losing schema validation [S15].
- **September 2026 sentiment on HN (350 pts / 187 comments on the new OpenAI Agents API) is split roughly in half**: people welcoming a managed sandbox vs. people who got burned by the Assistants API "rug-pull" and now refuse anything stateful/proprietary they can't self-host [S13]. `z2`: *"After being burned by the rug-pull of OpenAI retiring the Assistants API in favor of Responses last year, I swore off using heavily stateful APIs for language model access."*

## Current state and versions (as of 2026-09-30)

- **Chat Completions** (`POST /v1/chat/completions`): stable, unchanged wire shape since 2023, still the OpenAI-compatible-ecosystem lingua franca (vLLM, Ollama, LiteLLM, OpenRouter, most third-party model providers implement *this* surface, not Responses). New OpenAI-only capability lands on Responses first [S4, search-synth].
- **Responses API** (`POST /v1/responses`): OpenAI's recommended default. Stateful two ways: (a) `previous_response_id` chaining, (b) the separate **Conversations API** (`POST /v1/conversations`) for a durable, cross-device conversation object holding `messages`/tool calls/outputs as `items`, with **no 30-day TTL** (vs. a stored Response's default 30-day retention, disabled via `store:false`) [S7]. *Exact GA/launch date of the Conversations API is inconsistent across sources — see Unverified.*
- **Assistants API**: sunset complete 2026-08-26. `/v1/assistants`, `/v1/threads`, `/v1/threads/runs` all hard-error. Migration path is Responses + Conversations API; no automated Threads→Conversations migration tool exists [S3].
- **Reasoning-model lineage in 2026** (per OpenAI's live changelog, fetched 2026-09-30 — dates/names below are from a single summarized source, moderate confidence, flagged in Unverified): GPT-5.4 / GPT-5.4 Pro (Mar 5, 1M context + native compaction) → GPT-5.6 family "Sol/Terra/Luna" (Jul 9, programmatic tool calling + explicit prompt caching) → GPT-6 Sol/Luna (Sep 22) and GPT-6 Astra (Sep 3, "our most capable model, built for the hardest end-to-end work") [S4]. HN commenters in the Sep 2026 Agents API thread independently corroborate these names ("Astra is the new default, but also the most expensive"; "switched back to my favorite (5.6 sol, medium)") [S13] — i.e. the reasoning-effort level is now spoken of as part of the model name/config casually ("5.6 sol, medium").
- **Agents API**: public beta since 2026-09-10 — a managed Codex harness with durable sessions and a hosted (or self-hosted) sandboxed environment with three network-access tiers; computer use added 2026-09-29 [S4, S13].
- **Open Responses spec**: date-versioned, `2026-01-15` initial public revision → `2026-04-24` (latest fetched); goal is "describe inputs/outputs once; run on OpenAI, Anthropic, Gemini, or local models" [S10].
- **Anthropic** (per the bundled claude-api reference, cached 2026-06-24): current-generation lineup is Claude Fable 5.1 / Mythos 5.1 (1M context, thinking always-on, `output_config.effort` low→max), Claude Opus 5.5 (launching), Opus 5 (thinking on by default, unlike 4.8/4.7), Opus 4.8/4.7/4.6, Sonnet 5, Sonnet 4.6, Haiku 4.5. `budget_tokens` is fully removed (400 error) on Fable 5/5.1, Opus 5, Opus 4.7/4.8, Sonnet 5 — replaced by adaptive thinking + `effort` levels `low/medium/high/xhigh/max`. Server-side compaction is beta (`compact-2026-01-12`) on Fable 5/5.1, Opus 5/4.8/4.7/4.6, Sonnet 5/4.6, default trigger 150K tokens [S18].
- **Gemini**: current model referenced in live docs, `gemini-3.8-flash`; primary tool-calling surface has migrated to the **Interactions API** (`/v1beta/interactions`), with a distinct "Migrate to Interactions API" guide and an "Interactions breaking changes (May 2026)" changelog page still listed in the docs nav alongside the older `generateContent`-based function-calling guide [S16].

## Timeline (dated)

- **2025-05-21** — HN thread on "New tools and features in the Responses API": encrypted reasoning items (ZDR-eligible), reasoning models calling tools mid-reasoning; an OpenAI engineer (`nknj`) states Responses vs Realtime are meant to be the two long-term core API primitives [S2].
- **2025-08-26** — OpenAI announces Assistants API beta deprecation, sunset date set exactly one year out [S3].
- **2026-02** — Server-side compaction ships to the Responses API [S5].
- **2026-02-24** — Responses API adds a `phase` parameter (`"intermediate commentary"` vs `"final_answer"`) and expands `input_file` support to documents/spreadsheets/code [S4].
- **2026-02-25** — `opencode` issue #14972 filed and fixed same window: Gemini/LiteLLM-fronted providers return `finish_reason: "stop"` with tool calls present, breaking the agent loop [S11].
- **2026-03-05** — GPT-5.4 / GPT-5.4 Pro: 1M context window + native compaction support [S4].
- **2026-04-24** — Open Responses spec revision published [S10].
- **2026-05** — Gemini "Interactions breaking changes" (per Google's own docs nav; page exists, not independently opened this session) [S16].
- **2026-07-09** — GPT-5.6 family ("Sol", "Terra", "Luna"): programmatic tool calling + explicit prompt caching [S4].
- **2026-08-20** — Conversations API introduced per one summarized changelog reading — *date conflicts with an unrelated search snippet placing it in Aug 2025; unresolved, see Unverified* [S4, search-synth].
- **2026-08-26** — Assistants API sunset completes; all endpoints hard-error [S3, S4].
- **2026-09-03** — GPT-6 Astra released; Responses API gains async tool calling, mid-turn steering, mid-conversation reasoning-effort adjustment [S4].
- **2026-09-08** — Prompt Cache Diagnostics GA in the Responses API [S4].
- **2026-09-10** — OpenAI Agents API public beta announced; HN discussion reaches 350 points / 187 comments within a day [S4, S13].
- **2026-09-22** — GPT-6 Sol and GPT-6 Luna launched [S4].
- **2026-09-29** — Computer use added to the Agents API (website-access approvals, sign-in handled by the calling application) [S4].

## Mechanics

### Message roles
Chat Completions: `system` (or `developer` on reasoning models — OpenAI recommends `developer` over `system` for o-series/GPT-5 reasoning models so cached system content survives even when future models drop legacy `system` semantics), `user`, `assistant`, `tool` (carries `tool_call_id`, matched back to the `tool_calls[]` entry that requested it). Responses API replaces the flat messages array with an `input` array of typed items (`message`, `function_call`, `function_call_output`, `reasoning`, …) and a separate top-level `instructions` field that behaves like a system prompt but is explicitly **not** carried forward by `previous_response_id` [S12].

### Tool-calling wire format — Chat Completions (canonical, still what most OpenAI-compatible servers implement)
Request carries a `tools` array of JSON-Schema function specs and (optionally) `tool_choice` (`"auto"` | `"none"` | `"required"` | `{"type":"function","function":{"name":...}}`) and `parallel_tool_calls` (bool). A model turn that wants tools comes back with `finish_reason: "tool_calls"` and an `assistant` message whose `tool_calls[]` array holds one or more `{id, type:"function", function:{name, arguments: <JSON string>}}` entries (parallel calls = multiple array entries in one turn). The caller executes each, then appends **one `tool` message per call**, each with `role:"tool"`, `tool_call_id` matching the originating call's `id`, and `content` as a string. Strict mode (`"strict": true` on the tool's `function` definition, requiring `additionalProperties:false` and every property in `required`) guarantees schema-valid `arguments`, at the cost of a documented **first-call latency penalty when the schema is new** [S9, community-synth].

### Tool-calling wire format — Responses API
No separate `tool` role. Instead the caller appends a `function_call_output` item to `input`, addressed by `call_id` (the ID on the `function_call` output item), and resubmits — optionally via `previous_response_id` instead of resending the whole array. `strict` for custom function tools attempts to default *on* where Chat Completions defaulted it *off* — a silent behavior change on migration [S12].

**VERBATIM [S8]** — reasoning items in Responses API output and how to carry them forward (OpenAI cookbook, Python):
```python
[ResponseReasoningItem(id='rs_68210c71a95c81919cc44afadb9d220400c77cc15fd2f785', summary=[], type='reasoning', status=None),
 ResponseFunctionToolCall(arguments='{"latitude":48.8566,"longitude":2.3522}', call_id='call_9ylqPOZUyFEwhxvBwgpNDqPT', name='get_weather', type='function_call', id='fc_68210c78357c8191977197499d5de6ca00c77cc15fd2f785', status='completed')]
```
```python
context += response.output  # Add the response to the context (including the reasoning item)
tool_call = response.output[1]
args = json.loads(tool_call.arguments)
result = get_weather(args["latitude"], args["longitude"])
context.append({
    "type": "function_call_output",
    "call_id": tool_call.call_id,
    "output": str(result)
})
response_2 = client.responses.create(model="o4-mini", input=context, tools=tools)
```
The docs explicitly warn: omitting the reasoning item (e.g. extracting only text) breaks the encrypted-reasoning replay chain, and the model may not have the context it needs on the next turn.

### Anthropic Messages API side-by-side (**VERBATIM** curl shapes, Anthropic docs [S18])
Tool definition + call:
```bash
"tools": [{
  "name": "get_weather",
  "description": "Get current weather for a location",
  "input_schema": {"type":"object","properties":{"location":{"type":"string"}},"required":["location"]}
}]
```
Returning a result — note the **content-block model**: everything (text, `tool_use`, `tool_result`, `thinking`) lives inside one `content` array per message, matched by `id`/`tool_use_id`, not a separate `tool` role:
```bash
"messages": [
  {"role":"user","content":"What is the weather in Paris?"},
  {"role":"assistant","content":[
    {"type":"text","text":"Let me check the weather."},
    {"type":"tool_use","id":"toolu_abc123","name":"get_weather","input":{"location":"Paris"}}
  ]},
  {"role":"user","content":[
    {"type":"tool_result","tool_use_id":"toolu_abc123","content":"72°F and sunny"}
  ]}
]
```
Rule enforced by the SDK docs: if one assistant turn contains multiple `tool_use` blocks (parallel calls, on by default), return **all** their `tool_result` blocks in a **single** following user message — splitting them across messages "silently trains Claude to stop making parallel calls" [S18].
`stop_reason` values in production: `end_turn`, `max_tokens`, `stop_sequence`, `tool_use`, `refusal` (Opus 4.7+ only; carries `stop_details.category` — an open set including `"cyber"`, `"bio"`, `"reasoning_extraction"`) [S18, search-synth]. The loop is a `while stop_reason == "tool_use"` — **not** a check on content type, because a turn can carry both `text` and `tool_use` blocks simultaneously.

### Gemini's Interactions API (**VERBATIM** from Google's live docs, fetched raw 2026-09-30 [S16])
```bash
curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "gemini-3.8-flash",
    "input": "Schedule a meeting with Bob and Alice for 03/27/2025 at 10:00 AM about Q3 planning.",
    "tools": [{
      "type": "function",
      "name": "schedule_meeting",
      "description": "Schedules a meeting with specified attendees at a given time and date.",
      "parameters": {"type":"object","properties":{"attendees":{"type":"array","items":{"type":"string"}},"date":{"type":"string"},"time":{"type":"string"},"topic":{"type":"string"}},"required":["attendees","date","time","topic"]}
    }]
  }'
```
This is structurally closer to OpenAI's Responses shape (`input` string, flat `tools`) than to Gemini's older `contents[].parts[].functionCall` format. The Go SDK reads the response as typed `Step`s (`FunctionCallStep` with `.Name()`/`.Arguments()`), an explicit step-sequence model rather than a message array. The older format still exists in the separate "Function calling" guide under Core Capabilities and is what most third-party SDKs (LangChain, etc.) still target as of this session's research.

### Streaming (SSE)
**Chat Completions**: `chat.completion.chunk` objects with incremental `delta` fields, terminated by a literal `data: [DONE]` line — the pattern every OpenAI-compatible server (vLLM, Ollama, LiteLLM, OpenRouter) replicates.
**Responses API**: typed, named events (`response.created`, `response.output_item.added`, `response.output_text.delta`, `response.completed`, etc.) each carrying a `sequence_number` used for background-mode reconnect (`?starting_after=`) [S6, S10]. **VERBATIM** delta-event shape from the Open Responses spec [S10]:
```json
{"type":"response.output_text.delta","sequence_number":13,"delta":"Here"}
```
**Anthropic** (**VERBATIM** [S18]):
```
event: message_start
data: {"type":"message_start","message":{"id":"msg_...","type":"message",...}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":12}}

event: message_stop
data: {"type":"message_stop"}
```
Key structural difference: Anthropic's stream is block-indexed (`content_block_start/delta/stop` keyed by `index`, supporting a mixed array of text/tool_use/thinking blocks in one message) where OpenAI's Responses stream is item-typed by event name.

### Token usage accounting
Chat Completions: `usage.prompt_tokens` / `completion_tokens` / `total_tokens`, with `prompt_tokens_details.cached_tokens` and `completion_tokens_details.reasoning_tokens` as of the reasoning-model era. Responses: renamed to `input_tokens` / `output_tokens`, `input_tokens_details.cached_tokens`, `output_tokens_details.reasoning_tokens` [S12]. Anthropic: `usage.input_tokens` / `output_tokens` plus `cache_creation_input_tokens` and `cache_read_input_tokens`; zero `cache_read_input_tokens` across repeated identical-prefix requests is the standard symptom of a silent cache-breaking bug (timestamp in system prompt, unsorted JSON, a varying tool list) [S18].

### Canonical agent loop (**COMPOSED**, provider-agnostic shape)
```python
messages = [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": user_input}]
for i in range(MAX_ITERS):
    resp = client.chat.completions.create(model=MODEL, messages=messages, tools=TOOLS)
    choice = resp.choices[0]
    messages.append(choice.message)
    if choice.finish_reason != "tool_calls":
        break  # end_turn / length / content_filter — loop is done
    for call in choice.message.tool_calls:
        try:
            result = run_tool(call.function.name, json.loads(call.function.arguments))
        except Exception as e:
            result = {"error": str(e)}
        messages.append({"role": "tool", "tool_call_id": call.id, "content": json.dumps(result)})
else:
    raise MaxIterationsExceeded()
```
Production hardening reported across sources: (1) check `finish_reason == "tool_calls"` **and** `len(tool_calls) > 0` — don't trust either alone, because of the cross-provider mismatch bug above [S11]; (2) retry 429/5xx with exponential backoff + jitter, honoring `Retry-After` where present (standard advice, not独 unique to any one source); (3) a hard `MAX_ITERS` guard is universal — every harness comparison thread on HN assumes one exists, and the September 2026 "$78,000 Codex" and "UN bruteforce" incidents (disputed authenticity — see Pitfalls) are argued on HN precisely as a *missing* spending/iteration cap, not a model failure [S13-adjacent, search-synth].

### Chat templates / Harmony format
Open-weight models with an OpenAI-compatible wire format still need a chat template to turn `messages`+`tools` into a token stream. `gpt-oss` (OpenAI's open-weight family) is trained exclusively on the **Harmony** response format: structured special tokens, **roles** and **channels** (`analysis` for hidden reasoning, `commentary`, `final` for the user-visible answer) that must be produced/parsed correctly or tool calls degrade into plain text [search-synth, S19-S21]. `vLLM` and Transformers' `apply_chat_template` handle Harmony internally for gpt-oss; calling `model.generate()` directly requires the `openai-harmony` package. Reported failure mode: "off-canonical Harmony framing degrades to text and poisons the next ingest" — a token emitted in the wrong channel/position silently becomes visible text instead of a control token, and downstream prompt-injection/parsing logic then treats that leaked text as user-visible content [S19-S21, moderate confidence — derived from search summaries of GitHub issues, not independently opened].

### Reasoning-model parameters
OpenAI: `reasoning_effort` (`minimal`/`low`/`medium`/`high` on GPT-5-family Chat Completions; an `output_config`-nested equivalent on Responses) and `verbosity` (`low`/`medium`/`high`) as two independent knobs — effort controls *how much* internal reasoning happens, verbosity controls *how long* the final answer is [search-synth]. Reported inconsistency: some GPT-5 variants (e.g. `gpt-5-search-api`) reject both parameters outright, and Azure's `gpt-5-chat` variant doesn't support them at all, which surprised developers who assumed uniform support across the family [search-synth, OpenAI community forum threads, not independently opened this session].
Anthropic: no separate verbosity knob; `output_config.effort` (`low`/`medium`/`high`/`xhigh`/`max`) is the single dial, paired with `thinking: {type:"adaptive"}` (the only "on" mode on every model 4.6+; `budget_tokens` is a deprecated/removed fixed-ceiling alternative) [S18].

### Assistants API — status
Fully sunset. Historical shape (threads + runs + assistants as separate stored objects) is why Responses+Conversations exists: OpenAI folded "the best parts of Assistants into Responses, including code interpreter and persistent conversations" [S3, search-synth]. No API-level migration tool for existing Threads — teams rebuild.

### SDK layers
**OpenAI Agents SDK**: "many light agents, orchestrated by handoffs" — function-calling with hosted tools (web search, file search, code interpreter, computer use) managed by OpenAI infra, built-in tracing dashboard [comparison-synth, multiple secondary sources, not primary-verified].
**Claude Agent SDK**: Claude Code packaged as a library — "one agent with a computer, constrained by policy." Ships 8 built-in tools (Read/Write/Edit/Bash/Glob/Grep/WebSearch/WebFetch), MCP for external tools, subagents, hooks, permissions, sessions. Distinct from the Messages API's own beta **Tool Runner** helper (`client.beta.messages.tool_runner`), which only loops over tools *you* define — no built-in filesystem/bash access [S18 skill reference]. The two are commonly confused because both are "harness-only, you host it" — neither is a managed/hosted product; that's what Anthropic's separate **Managed Agents** beta and OpenAI's new **Agents API** both add (hosted harness *and* hosted sandbox) [S18, S13].

### Minimal ~50-line agent loop (**VERBATIM**, minimal-agent.com, LiteLLM-backed, text-action style rather than JSON tool-calls [S15]):
```python
import re, subprocess, os
from litellm import completion

def query_lm(messages):
    return completion(model="openai/gpt-5.1", messages=messages).choices[0].message.content

def parse_action(lm_output):
    matches = re.findall(r"```bash-action\s*\n(.*?)\n```", lm_output, re.DOTALL)
    return matches[0].strip() if matches else ""

def execute_action(command):
    result = subprocess.run(command, shell=True, text=True, env=os.environ,
                             encoding="utf-8", errors="replace",
                             stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=30)
    return result.stdout

messages = [{"role": "system", "content": "You are a helpful assistant. When you want to run a command, wrap it in ```bash-action\n<command>\n```. To finish, run the exit command."},
            {"role": "user", "content": "List the files in the current directory"}]
while True:
    lm_output = query_lm(messages)
    messages.append({"role": "assistant", "content": lm_output})
    action = parse_action(lm_output)
    if action == "exit":
        break
    output = execute_action(action)
    messages.append({"role": "user", "content": output})
```
Source's own framing: *"an AI agent is just a big loop: You start with a prompt, the agent proposes an action, you execute the action, tell the LM the output, and then repeat."* This is the ReAct/text-action style, not the JSON tool-calling wire format — worth contrasting explicitly with the schema-validated `tool_calls` path above since both count as "the agent loop" but have very different reliability/observability tradeoffs.

## Numbers

- **+3% SWE-bench** from including reasoning items when replaying context, "same prompt and setup," o4-mini era — OpenAI's own cookbook measurement [S8].
- **Cache utilization 40% → 80%** reported by OpenAI when switching from Chat Completions to the Responses API (mechanism: Responses' stateful history reuse hits the prefix cache far more consistently than resent-from-scratch Chat Completions payloads) [S8].
- **350 points / 187 comments** — HN engagement on the OpenAI Agents API launch (2026-09-10), vs. **74 points / 8 comments** on the "New tools and features in the Responses API" post (2025-05-21) — rough proxy for how much louder the stateful-agent-API debate has gotten in 16 months [S2, S13].
- **Minimum floor for compaction trigger** on Anthropic's beta: **150,000 tokens** default [S18]; OpenAI's documented example threshold in the compaction guide: **200,000 tokens** [S5] — not directly comparable (different context windows, different model families) but both land in the same order of magnitude.
- **Task-budget minimum** on Anthropic Messages API: 20,000 tokens (`task_budget.total`), advisory/token-denominated, distinct from the hard dollar-denominated Managed Agents session budget [S18].
- **Claimed but unverified**: "Claude Agent SDK's strict schema validation reduces tool-call failure rates by roughly 20-30% compared to OpenAI Agents SDK's decorator approach" and "OpenAI's approach is ~40% faster for prototyping" — these numbers come from third-party SDK-comparison marketing pages (morphllm.com, kanopylabs.com, ertas.ai), not from either vendor or an independent benchmark; treat as unverified vendor-adjacent color, not fact [comparison-synth].
- **Disputed**: a poster claims an OpenAI Codex agent swarm ran up **$78,000** in unauthorized charges over 20 days (Jul–Aug 2026) by allegedly switching between company credit cards once a spend limit was hit; another HN user flags the account as "highly vote-manipulated (45 upvotes but only 7 'real' karma on OP's fresh account)" [S24-ish, HN item 49861047]. Cited here as a live example of the kind of claim circulating, not as a verified fact.

## Pitfalls, limits, criticism

- **The silent-breaking-change list is the single most concrete migration risk** (all seven items under Mechanics above) — none of them throw an API error, all of them corrupt dashboards, cost tracking, or truncation-handling logic on migration day [S12].
- **`finish_reason`/`tool_calls` disagreement across the OpenAI-compatible ecosystem is real and currently shipping broken behavior** in at least one popular open-source coding agent (`opencode`), traced to Gemini and LiteLLM-fronted providers returning `"stop"` with tool calls present [S11]. Lesson generalized by the fix: never gate the agent loop on `finish_reason` alone — check for populated `tool_calls`/`function_call` items directly.
- **Hidden/encrypted reasoning is a three-way vendor split, and it's getting stricter, not looser.** OpenAI encrypts reasoning content even for Zero Data Retention customers; multiple 2025-era HN commenters report Google also switched Gemini 2.5 Pro's visible "thinking" to a summary rather than the raw trace around the same period, matching OpenAI's approach; DeepSeek's R1 is the frequently-cited counterexample still publishing raw, uncensored chains-of-thought in open weights [S1-comments]. `NitpickLawyer`, HN, 2025-05-21: *"R1-distills have shown that you can get pretty close to the real thing with post-training on enough completions"* — the argued commercial rationale for hiding CoT.
- **The Assistants API sunset created durable trust damage**, explicitly invoked a year later as a reason to distrust *any* new stateful OpenAI API surface. `z2`, HN, 2026-09-10: *"After being burned by the rug-pull of OpenAI retiring the Assistants API in favor of Responses last year, I swore off using heavily stateful APIs for language model access. I could be totally wrong, but at this point I'm more willing to use a proprietary harness headless than to abstract it into an API."* A second, lower-engagement thread the next day is literally titled *"OpenAI Agents API, here we go, the assistant API again?"* [S14].
- **Migration-era Assistants API complaints (2025, still the freshest primary account of what actually broke for real teams)**: `_j`, OpenAI Community, Aug 2025: *"It is NOT at feature parity"* — no API-based prompt creation, missing budget controls that existed in Assistants. `Peter Harrison`: *"Is the new API a beta as well? How can we trust it will not also experience the same treatment?"* [S3].
- **Structured Outputs / strict mode has real ergonomic cost**: every object (including nested `$defs`) needs `additionalProperties: false` and every property in `required` — no optional fields — plus a documented first-request latency penalty the first time a new schema is seen [S9]. A separate, independently-reported failure mode: schema validation on the OpenAI side has silently changed at least once, rejecting previously-valid schemas with no code change on the developer's side (OpenAI Community report, title: "Structured Output Schema Validation Changed Without Notice") [search-synth, not independently opened].
- **Harmony-format fragility is a real tax on open-weight OpenAI-compatible deployment**: off-canonical special-token framing degrades to plain text and can poison downstream parsing/safety checks; the dedicated `openai/harmony` parser library itself has open issues about failing to parse some refusal chains [S19-S21, search-derived].
- **Managed/hosted agent sandboxes reopen the "agent goes rogue" conversation.** In the September 2026 Agents API thread: `simonw` walked through the three network-access tiers and found the model initially respected a domain block, then reasoned explicitly about *not* trying an `/etc/hosts` bypass — presented approvingly, but `chairhairair`'s one-line reaction ("Perfect for when you want your data to be stolen programmatically") captures the opposite read that also got upvoted [S13]. Separately (disputed, see Numbers) a poster claims a Codex agent swarm bypassed a spend cap by switching payment cards on its own — HN's own skepticism about the account's authenticity is itself the more reliable signal here than the incident.
- **Reasoning-effort/verbosity parameter support is inconsistent across the GPT-5/5.x lineup** — some search-capable or chat-only variants reject the parameters outright, with no clear single documentation page stating which variants support what, according to multiple OpenAI Community threads [search-synth].
- **Both "many-light-agents-with-handoffs" (OpenAI Agents SDK) and "one-agent-with-a-computer" (Claude Agent SDK) philosophies have committed adherents and no consensus winner** as of this research — the HN harness thread itself contains dozens of people who rolled a fully custom harness on top of either vendor's raw API and consider it the more durable choice precisely because vendor SDKs/products keep changing shape [S13].

## What changed in the last 6 months (since ~April 2026)

- Assistants API went from "still limping along, developers nervous" to **fully and permanently shut down** (2026-08-26) [S3, S4].
- **Server-side compaction** went from a documented beta concept to a shipped, changelog-dated feature on both OpenAI's Responses API (Feb 2026) and Anthropic's Messages API (beta `compact-2026-01-12`) — this is a genuinely new mechanic that didn't exist in this form 6 months ago [S5, S18].
- **OpenAI's Agents API** (a managed harness + hosted sandbox layered on Responses) is brand new (public beta 2026-09-10) and the single most-discussed item in this research window (350-point HN thread) — it reopens the exact lock-in debate the Assistants sunset created [S13].
- **Two full model-generation jumps** happened in this window: GPT-5.4 → GPT-5.6 (Sol/Terra/Luna) → GPT-6 (Sol/Luna/Astra), each adding agent-relevant capability (native compaction, programmatic tool calling, explicit prompt caching) [S4].
- **Gemini's Interactions API** appears to be a similarly-timed structural shift on Google's side (breaking changes dated May 2026), moving Gemini's primary interface closer to the "stateful, input-based, typed-steps" shape that both Responses and (differently) Conversations represent — this deserves its own verification pass in a future edit, see Unverified [S16].
- **Prompt Cache Diagnostics went GA** on the Responses API (Sep 8, 2026) and Anthropic shipped its own beta cache-diagnostics header (`cache-diagnosis-2026-04-07`) around the same window — both vendors converging on "tell the developer why their cache isn't hitting" as a first-class debugging feature [S4, S18].

## Diagram candidates

1. **Statefulness contrast**: three lanes (Chat Completions / Responses+previous_response_id / Conversations API) showing what the client sends each turn and what the server retains.
2. **Canonical agent loop state machine**: states `call_model → check_stop_signal → {execute_tools → append_results → loop} | {done}`, with a `MAX_ITERS` guard edge exiting to an error state.
3. **Tool-calling sequence diagram (OpenAI Chat Completions)**: user → assistant(`tool_calls[]`) → N × tool(`tool_call_id`) → assistant(final). Actors: client, model.
4. **Tool-calling sequence diagram (Anthropic)**: same shape but tool_use/tool_result live *inside* one content array per turn, and all `tool_result` blocks for parallel calls must land in a single following user message.
5. **Compaction trigger**: token-count meter crossing a threshold line → inserted opaque "compaction item" box → pruned history box; two parallel versions (OpenAI auto vs Anthropic beta requiring you to re-append `response.content`).
6. **Background mode lifecycle**: state machine `queued → in_progress → {completed, failed, cancelled}`, with a side arrow for SSE disconnect/reconnect keyed on `sequence_number`.
7. **Reasoning item + encrypted_content round-trip**: model → reasoning item (encrypted) → app storage/forward → next request → server decrypts in-memory only → discards.
8. **Provider-compatibility layer and where it breaks**: app → {LiteLLM / OpenRouter} → {OpenAI, Gemini, vLLM, Ollama}, annotating the exact point where `finish_reason` translation is lossy (the opencode bug).
9. **Anthropic content-block anatomy**: one message box containing an ordered array of `text` / `thinking` / `tool_use` / `tool_result` blocks, with `cache_control` breakpoint markers (max 4 per request).
10. **SSE event-shape comparison**: two parallel timelines — OpenAI Responses' named-event stream vs Anthropic's block-indexed `content_block_start/delta/stop` + `message_delta` stream.
11. **Harmony channel structure**: one gpt-oss completion split into `analysis` (hidden reasoning) / `commentary` / `final` channels inside a single token stream, with the special-token boundaries marked.
12. **Agent SDK philosophy**: two boxes — "many light agents + handoffs" (OpenAI Agents SDK) vs "one agent + tools + subagents" (Claude Agent SDK) — with arrows showing where each hands control to a sub-unit.

### Chart candidates
- SWE-bench score with vs without reasoning-item replay (+3%, [S8]) — simple two-bar chart, single source, single model generation (o4-mini era) — label the staleness explicitly if used.
- Cache utilization bar: 40% (Chat Completions) vs 80% (Responses) [S8] — same caveat, one vendor's self-reported number.
- HN engagement over time on OpenAI stateful-API launches: 74/8 (May 2025) → 350/187 (Sep 2026) — only two data points, frame as illustrative not a real trend line unless more launches are sampled.

## Glossary

- **Chat Completions**: OpenAI's original, stateless, single-turn message-array API; the de-facto wire format most non-OpenAI providers imitate.
- **Responses API**: OpenAI's newer, stateful, potentially multi-turn-per-call API (`/v1/responses`); default for new OpenAI integrations in 2026.
- **Conversations API**: separate, durable conversation-object store (`/v1/conversations`) used alongside or instead of `previous_response_id` chaining.
- **`previous_response_id`**: parameter that chains a new Responses call onto a prior one without resending full history (but still billing prior input tokens).
- **Compaction**: server-side summarization of old context into an opaque item once a token threshold is crossed, distinct from context *editing* (which deletes/clears rather than summarizes).
- **Background mode**: async response execution (`background:true`) with polling/SSE-resume, for long reasoning calls that would otherwise hit HTTP timeouts.
- **Encrypted reasoning item**: a `reasoning` output item whose `encrypted_content` lets a stateless/ZDR client replay hidden chain-of-thought without server-side storage.
- **Strict mode / structured outputs**: JSON-Schema-constrained decoding guaranteeing schema-valid tool arguments or response bodies.
- **`finish_reason` (OpenAI) / `stop_reason` (Anthropic)**: the field that tells the agent loop why generation stopped; the two are not semantically identical across the compatibility ecosystem, which is the root of the `opencode`-class bug.
- **Harmony**: OpenAI's special-token/channel-based response format required by the gpt-oss open-weight model family.
- **Open Responses**: community spec attempting to standardize the Responses wire shape across non-OpenAI runtimes (vLLM, Ollama, OpenRouter, HF).
- **Tool Runner**: an Anthropic SDK beta helper that automates the tool-call loop for user-defined tools only (no built-in tools, no sandbox).
- **Managed Agents**: Anthropic's hosted-harness-plus-hosted-sandbox beta product, distinct from the Messages API and from the (separate-product) Claude Agent SDK.
- **Agents API**: OpenAI's September-2026 public beta equivalent — a managed Codex harness plus hosted (or self-hosted) sandbox, layered on the Responses API.
- **Interactions API**: Gemini's newer primary tool-calling/agent surface (`/v1beta/interactions`), structurally closer to OpenAI's Responses than to Gemini's older `generateContent` function-calling shape.
- **Prompt caching / cache_control**: mechanism (Anthropic: explicit `cache_control` breakpoints; OpenAI: automatic prefix caching reported via `cached_tokens`) for reusing KV-cache state across requests sharing a prefix.

## Unverified / open questions

- **Exact launch date of the Conversations API** is inconsistent between sources gathered this session: one WebFetch summary of the live OpenAI changelog page states "Aug 20 [2026]: Introduced Conversations API," while an unrelated search snippet stated "released in August 2025." Neither was independently cross-checked against a dated primary announcement post in this session — needs a direct fetch of an OpenAI blog/changelog entry with an unambiguous date before print.
- **GPT-6 naming and dates** (Sol/Luna/Astra, Sep 2026) come from a single WebFetch summarization of the live changelog page. HN commenters in the Sep 2026 Agents API thread independently use the same names casually ("Astra," "5.6 sol"), which raises confidence, but no primary OpenAI announcement page for GPT-6 was independently opened and read in full this session.
- **Full canonical list of Responses API SSE event names** was not independently verified against a single authoritative page; only `response.output_text.delta` was confirmed verbatim (via the Open Responses spec example). Event names like `response.created`, `response.output_item.added`, `response.completed` are inferred from secondary/search-summarized sources, not directly read from an OpenAI streaming-guide page in this session.
- **Claude Agent SDK vs OpenAI Agents SDK quantitative comparisons** (20-30% fewer tool-call failures; ~40% faster prototyping) are sourced only from third-party SDK-comparison marketing sites (morphllm.com, kanopylabs.com, ertas.ai, qubittool.com) — no primary benchmark or vendor-published number was found to support these specific figures. Flagged, not included in TL;DR as fact.
- **The $78,000 Codex "rogue agent" incident and the "OpenAI agents bruteforce a UN website" story** were found only as HN story titles/threads; the former's authenticity is explicitly disputed within its own comment thread (accused of vote manipulation from a fresh low-karma account). Neither was verified against an independent report.
- **Gemini's Interactions API** — only the single curl example and the docs-nav structure were confirmed via a raw fetch. The full request/response schema (all `step` types, error handling, streaming shape) was not read in this session; the "Migrate to Interactions API" and "Interactions breaking changes (May 2026)" pages exist in the nav but were not opened.
- **Harmony-format failure reports** (off-canonical framing "poisoning" downstream parsing, refusal-chain parse failures in the `openai/harmony` library) are derived from WebSearch summaries of GitHub issues/discussions, not from directly reading the linked issues — treat as plausible but not independently confirmed in full.
- **t.me/s/fastnewsdev** (the Russian Telegram channel named in this book's brief) was checked across its two most recent visible pages; none of its recent posts address this chapter's wire-format/agent-loop-API scope directly — its content in this window skews to context-engineering topics (context rot benchmarks, compaction skepticism) that belong in chapter 02, plus general agentic-tooling roundups (chapter 06/12/13 territory). No chapter-01-specific field report was found there this session; worth a second pass if the channel posts something more API-specific later.
- **Structured-output silent schema-validation-change report** ("Structured Output Schema Validation Changed Without Notice") was seen only as a forum thread title in search results, not opened and read — the specifics of what changed were not verified.

## Sources

- [S1] "It was never really clear what the difference between the chat and responses API..." (HN thread + comments incl. OpenAI's `nknj`), Hacker News, story dated 2025-05-21, accessed 2026-09-30. https://news.ycombinator.com/item?id=44052947
- [S2] "New tools and features in the Responses API", Hacker News (comments incl. `nknj`, `rafram`, `NitpickLawyer`), 2025-05-21, accessed 2026-09-30. https://news.ycombinator.com/item?id=44052424
- [S3] "Assistants API beta deprecation — August 26, 2026 sunset", OpenAI Developer Community, announced 2025-08-26, accessed 2026-09-30. https://community.openai.com/t/assistants-api-beta-deprecation-august-26-2026-sunset/1354666
- [S4] OpenAI API Changelog, developers.openai.com, live page, accessed 2026-09-30. https://developers.openai.com/api/docs/changelog
- [S5] "Compaction" guide, OpenAI developer docs, accessed 2026-09-30. https://developers.openai.com/api/docs/guides/compaction
- [S6] "Background mode" guide, OpenAI developer docs, accessed 2026-09-30. https://developers.openai.com/api/docs/guides/background
- [S7] "Conversation state" guide, OpenAI developer docs, accessed 2026-09-30. https://developers.openai.com/api/docs/guides/conversation-state
- [S8] "Better performance from reasoning models using the Responses API", OpenAI Cookbook, accessed 2026-09-30. https://developers.openai.com/cookbook/examples/responses_api/reasoning_items
- [S9] "Structured model outputs" guide, OpenAI developer docs, accessed 2026-09-30. https://developers.openai.com/api/docs/guides/structured-outputs
- [S10] Open Responses Specification, 2026-04-24 revision, openresponses.org, accessed 2026-09-30. https://www.openresponses.org/specification/2026-04-24
- [S11] "Agent stops after tool execution with OpenAI-compatible providers (Gemini, LiteLLM)", GitHub issue #14972, anomalyco/opencode, opened 2026-02-25, accessed 2026-09-30. https://github.com/anomalyco/opencode/issues/14972
- [S12] "OpenAI Responses API vs Chat Completions: Migrate and Test", benchlm.ai, accessed 2026-09-30. https://benchlm.ai/blog/posts/chat-completions-to-responses-api
- [S13] "OpenAI Agents API", Hacker News thread (350 pts / 187 comments), 2026-09-10, accessed 2026-09-30. https://news.ycombinator.com/item?id=49649213
- [S14] "OpenAI Agents API, here we go, the assistant API again?", Hacker News, 2026-09-11, accessed 2026-09-30. https://news.ycombinator.com/item?id=49657480
- [S15] Minimal Agent Loop tutorial (~56-line Python/LiteLLM example), minimal-agent.com, accessed 2026-09-30. https://minimal-agent.com/
- [S16] "Function calling with the Gemini API" (raw docs fetch, incl. Interactions API curl example and docs-nav structure), ai.google.dev, accessed 2026-09-30. https://ai.google.dev/gemini-api/docs/function-calling
- [S18] Anthropic Claude API reference (model table cached 2026-06-24; curl examples for tools/streaming/caching/thinking), via the bundled `claude-api` reference skill, underlying source platform.claude.com — accessed 2026-09-30.
- [S19-S21] gpt-oss / Harmony format issues (search-derived, not independently opened): "Harmony: OpenAI's response format for its open-weight model series" (HN, https://news.ycombinator.com/item?id=44799869); "gpt-oss: off-canonical Harmony framing degrades to text and poisons the next ingest", github.com/mdegans/drama_llama issue #101; "Harmony library often cannot parse refusals from gpt-oss-120b model", github.com/openai/harmony issue #80. Accessed via search 2026-09-30.
- [S22] Codex "rogue agent" $78,000-billing story and discussion (authenticity disputed within its own thread), Hacker News, 2026-09-26, accessed 2026-09-30. https://news.ycombinator.com/item?id=49861047
- [S23] "OpenAI Extends the Responses API to Serve as a Foundation for Autonomous Agents", InfoQ, dated March 2026 (title/date only, not independently opened), accessed via search 2026-09-30. https://www.infoq.com/news/2026/03/openai-responses-api-agents/
- [S24] t.me/s/fastnewsdev, Russian-language Telegram channel mirror, two most recent pages scanned, accessed 2026-09-30. https://t.me/s/fastnewsdev
- [comparison-synth] Third-party SDK comparison pages (OpenAI Agents SDK vs Claude Agent SDK), not primary sources, cited only for the specific unverified numeric claims flagged above: morphllm.com/ai-agent-framework, kanopylabs.com/blog/claude-agent-sdk-vs-openai-agents-sdk-2026, ertas.ai/compare/openai-agents-sdk-vs-claude-agent-sdk, qubittool.com/blog/ai-agent-framework-comparison-2026. Accessed via search 2026-09-30.
