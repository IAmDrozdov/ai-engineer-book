# Проектирование инструментов агента — primary-source notes

## TL;DR (must-know facts, 2026-09-30)

- Tools are a new software contract: between a deterministic system and a non-deterministic agent, not between two deterministic systems. Design them for the agent's "affordances," not as thin API wrappers [S1].
- Anthropic's canonical guidance lives in two docs: "Building effective agents" Appendix 2 ("Prompt engineering your tools," Dec 2024, coins **ACI** — agent-computer interface, and **poka-yoke**) [S4], and "Writing effective tools for agents — with agents" (Sep 2025, the deep, evals-driven follow-up) [S1]. Both are required reading; chapter should treat S1 as primary, S4 as historical/founding.
- Core design levers from S1: (1) pick fewer, higher-level tools that consolidate multi-step workflows instead of wrapping every endpoint; (2) namespace tools (prefix or suffix by service/resource) once you have many; (3) return only high-signal, semantically named fields, not UUIDs/mime-types; (4) offer a `response_format` enum (`concise`/`detailed`) to trade tokens for flexibility; (5) paginate/filter/truncate by default, with actionable truncation and error messages; (6) prompt-engineer descriptions like a docstring for a new hire, with explicit parameter names (`user_id`, not `user`).
- As of late 2025, Anthropic shipped three "advanced tool use" beta primitives that change the shape of tool design: **Tool Search Tool** (defer loading, search on demand), **Programmatic Tool Calling / PTC** (Claude writes code that calls tools inside a sandbox; only final output re-enters context), **Tool Use Examples** (`input_examples` field, schema-validated few-shots) [S2]. All three are now documented as stable platform features (not just beta) on platform.claude.com as of 2026-09 [S10, S11, S14].
- Measured effect of tool-definition bloat: 5 MCP servers (GitHub, Slack, Sentry, Grafana, Splunk) = 58 tools ≈ 55K tokens before the conversation starts; some real deployments hit 134K tokens pre-optimization [S2]. Tool Search Tool cuts this ~85%, and lifts Opus 4 MCP-eval accuracy 49%→74%, Opus 4.5 79.5%→88.1% [S2, S10].
- Claude's tool-selection accuracy "degrades once you exceed 30–50 available tools" — this is now a stated platform threshold, not folklore [S10]. OpenAI's own guidance: "aim for fewer than 20 functions available at the start of a turn" [S9].
- Code Mode (Cloudflare) and "code execution with MCP" (Anthropic) are the same idea discovered independently: expose tools as a programming-language API (TypeScript/Python) and let the model write orchestration code instead of emitting individual tool-call tokens, because LLMs have seen vastly more real code than synthetic tool-call training data [S7, S3]. Cloudflare's newest (2026-02) move is **server-side** Code Mode: an MCP server itself exposes only `search()` + `execute()`, giving a fixed ~1,000-token footprint regardless of API size (a 1.17M-token API compressed 99.9%) [S8].
- Strict schemas are now a first-class, named feature on both platforms: Anthropic's `strict: true` (grammar-constrained sampling, same pipeline as structured outputs) [S12] and OpenAI's `strict: true` (built on Structured Outputs, requires `additionalProperties: false` and all properties `required`, optional fields modeled via `null` union) [S9]. Both fall back to best-effort if the schema can't be made strict.
- Idempotency/confirmation is handled at the protocol level via **MCP tool annotations**: `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint` — all explicitly *hints*, untrusted unless the server is trusted [S5, S6-schema].
- Error messages are part of the ACI: Anthropic explicitly recommends prompt-engineering error responses to be "specific and actionable" rather than opaque codes/tracebacks — this is presented as one of the highest-leverage, cheapest fixes [S1].
- MCP had a **major protocol revision on 2026-07-28** that changes tool lifecycle mechanics materially: protocol-level sessions removed, `initialize` handshake removed (now stateless, per-request `_meta`), `tools/list` results now carry mandatory caching hints (`ttlMs`, `cacheScope`) and must be deterministically ordered (for prompt-cache hits), a new `resultType` field on every result, and a multi-round-trip (`InputRequiredResult`) pattern replacing server-initiated `elicitation`/`sampling` requests mid-tool-call [S6-changelog]. This directly affects how a tool author designs pagination, caching, and "ask the user something mid-call" flows.
- Consolidation pattern (explicit examples from Anthropic): instead of `list_users`+`list_events`+`create_event`, build one `schedule_event`; instead of `read_logs`, build `search_logs`; instead of `get_customer_by_id`+`list_transactions`+`list_notes`, build one `get_customer_context` [S1]. OpenAI's parallel advice: "combine functions that are always called in sequence" and "don't make the model fill arguments you already know" (offload to code) [S9].
- Programmatic Tool Calling measured gains: token use on complex research tasks dropped 43,588→27,297 (−37%); internal knowledge retrieval 25.6%→28.5%; GIA benchmark 46.5%→51.2% [S2]. A budget-compliance example cut context from ~200KB of raw expense rows to ~1KB of results.
- Tool Use Examples (`input_examples`) measured gain: 72%→90% accuracy on complex parameter handling in Anthropic's internal testing [S2].

## Current state and versions (as of 2026-09-30)

- **MCP protocol**: latest spec revision is **2026-07-28** (marked "latest" on modelcontextprotocol.io); prior revisions in the version history: 2024-11-05 (launch), 2025-03-26 (added tool annotations), 2025-06-18, 2025-11-25, 2026-07-28, plus a `draft` channel [S6-versions, bash `contents/docs/specification` listing].
- **Anthropic Claude API tool-use surface** (platform.claude.com, read 2026-09-30): stable, non-beta pages exist for Tool search tool, Programmatic tool calling, Strict tool use, Parallel tool use, Tool Use Examples (folded into "Define tools"), Manage tool context (a decision matrix over all four), and Tool reference (canonical catalog). These originated as the Nov 2025 "advanced tool use" beta (header `advanced-tool-use-2025-11-20`) [S2] and have since graduated to documented, versioned tool types, e.g. `tool_search_tool_regex_20251119`, `tool_search_tool_bm25_20251119`, `code_execution_20260120`, `code_execution_20260521` [S10, S11].
- Anthropic tool-type versioning scheme is now explicit and documented: dated `_YYYYMMDD` suffixes, with four relationship types — **capability-keyed** (both old/new stay current, pick by need), **model-keyed** (pick by target model), **variant** (regex vs BM25 search — neither supersedes), **legacy/successor** (old version fully replaced, e.g. `computer_toolset_20260801` superseding `computer_20251124`/`computer_20250124`) [S11].
- Current Claude model family names on the pricing/model surface include **Opus, Sonnet, Haiku, Mythos, Fable** generations (e.g. `claude-opus-5-5`, `claude-sonnet-5-5`, `claude-fable-5-1`, `claude-mythos-5-1`) [S10, S13] — note for the book: "Fable"/"Mythos" are now real Claude model-family names on the live platform docs, not just internal codenames.
- OpenAI's current guide (developers.openai.com/api/docs/guides/function-calling, accessed 2026-09-30) documents **`tool_search`** as an OpenAI-native feature ("Only gpt-5.4 and later models support it"), and shows examples against **`gpt-6-astra`**, **GPT-6.1 Sol**, **GPT-5.6 Terra** [S9] — confirms both major vendors converged on the defer/search pattern independently, and that OpenAI model naming has moved to a Astra/Sol/Terra-style codename scheme by this date.
- Cloudflare's "Code Mode" exists in two generations: **client-side** (Sep 2025, agent ships a sandbox, Dynamic Worker Loader/V8 isolates on the Cloudflare Agents SDK) [S7] and **server-side** (Feb 2026, the MCP server itself does `search()`/`execute()`, agent needs no sandbox) [S8].

## Timeline

- **2024-11-05** — MCP protocol first released [S3].
- **2024-12-19** — Anthropic "Building effective agents" published; Appendix 2 "Prompt engineering your tools" introduces ACI and poka-yoke framing [S4].
- **2025-03-26** — MCP spec revision adds tool **annotations** (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`) [search-result summary, confirmed structurally in S6-schema].
- **2025-09-11** — Anthropic "Writing effective tools for agents — with agents" published: prototype→evaluate→optimize methodology, 5 design principles [S1].
- **2025-09-26** — Cloudflare "Code Mode: the better way to use MCP" (client-side) [S7].
- **2025-11-04** — Anthropic "Code execution with MCP: Building more efficient agents" — 150,000→2,000 token (98.7%) reduction example; filesystem-of-tools pattern; PII tokenization pattern; ties to Skills [S3].
- **2025-11-19/20** — Anthropic ships beta tool types `tool_search_tool_regex_20251119`, `tool_search_tool_bm25_20251119`, `code_execution_20250825` (Bash+files), beta header `advanced-tool-use-2025-11-20` [S2, S11].
- **2025-11-24** — Anthropic "Introducing advanced tool use on the Claude Developer Platform" — Tool Search Tool, Programmatic Tool Calling, Tool Use Examples announced together as a beta triad [S2].
- **2025-11-25** — MCP spec revision (precedes the 2026-07-28 major rewrite) [S6-changelog references it as the prior version].
- **2026-02-20** — Cloudflare "Code Mode: give agents an entire API in 1,000 tokens" — server-side Code Mode, Cloudflare API MCP server, 99.9% token reduction, explicitly cites Anthropic's Code Execution with MCP as convergent work [S8].
- **2026-07-28** — MCP spec major revision: protocol made stateless (no sessions, no `initialize` handshake), `tools/list` gets deterministic-order requirement + `ttlMs`/`cacheScope` caching fields, `resultType` field added to every result, Multi Round-Trip Requests (`InputRequiredResult`) replace server-initiated `elicitation`/`sampling` inside a tool call, Roots/Sampling/Logging deprecated, HTTP+SSE transport reclassified Deprecated [S6-changelog].
- **2026-09-30 (today)** — Tool Search Tool, Programmatic Tool Calling, and `input_examples`/Tool Use Examples appear as fully documented, apparently-stable platform features (no beta banner visible on the fetched pages) [S10, S11, S12, S13, S14].

## Mechanics

### 1. The ACI framing and poka-yoke (S4, verbatim, COMPOSED-free)

> "Tools enable Claude to interact with external services and APIs by specifying their exact structure and definition in our API... Tool definitions and specifications should be given just as much prompt engineering attention as your overall prompts." [S4]

Suggestions for tool *formats* (S4, VERBATIM):
> "Give the model enough tokens to 'think' before it writes itself into a corner. Keep the format close to what the model has seen naturally occurring in text on the internet. Make sure there's no formatting 'overhead' such as having to keep an accurate count of thousands of lines of code, or string-escaping any code it writes."

ACI checklist (S4, VERBATIM):
> "Put yourself in the model's shoes... A good tool definition often includes example usage, edge cases, input format requirements, and clear boundaries from other tools... Think of this as writing a great docstring for a junior developer on your team... Test how the model uses your tools: Run many example inputs in our workbench... **Poka-yoke** your tools. Change the arguments so that it is harder to make mistakes."

Case study (S4, VERBATIM): building the SWE-bench agent, absolute-filepath requirement fixed a systematic error class:
> "We found that the model would make mistakes with tools using relative filepaths after the agent had moved out of the root directory. To fix this, we changed the tool to always require absolute filepaths—and we found that the model used this method flawlessly."

### 2. The evals-driven methodology (S1)

Three-phase loop: **Prototype → Evaluate → Collaborate**.

- *Prototype*: stand up a local MCP server or DXT (Desktop Extension), connect via `claude mcp add <name> <command> [args...]`, feed Claude any relevant `llms.txt`.
- *Evaluate*: generate real-world-grounded prompt/response pairs (not "sandbox"-simple ones). Example of a **strong** eval task (VERBATIM, S1):
  > "Customer Sarah Chen just submitted a cancellation request. Prepare a retention offer. Determine: (1) why they're leaving, (2) what retention offer would be most compelling, and (3) any risk factors we should be aware of before making an offer."
  vs a **weak** one: "Find the cancellation request by Customer ID 45892." Run evals as simple `while`-loop agents wrapping LLM+tool calls; instruct agents to emit reasoning/feedback blocks *before* tool calls (or turn on interleaved thinking) to expose why a tool wasn't used correctly. Track: accuracy, runtime per tool call, total tool calls, total tokens, error rate.
- *Collaborate*: paste concatenated eval transcripts into Claude Code and let it refactor the tool definitions. Anthropic reports this iterative process, not manual tuning, produced most of the guidance in the post. Real example: Claude was observed appending "2025" to every web-search query, degrading results — fixed purely by rewording the tool description [S1].

### 3. Five design principles (S1, this is the spine of the chapter)

1. **Choose the right tools, not more tools.** Don't wrap every API endpoint. Consolidate: `schedule_event` instead of `list_users`+`list_events`+`create_event`; `search_logs` (returns only relevant lines + context) instead of `read_logs`; `get_customer_context` instead of `get_customer_by_id`+`list_transactions`+`list_notes`. Rationale: agents have limited context, unlike cheap computer memory — a `list_contacts` tool forces brute-force token-by-token scanning; `search_contacts` skips straight to the answer.
2. **Namespace tools.** Prefix- or suffix-based (`asana_search` vs `asana_projects_search`); effect on evals varies by LLM — Anthropic explicitly says test both on your own evals. Matters more as tool count grows and especially with Tool Search (S10 repeats this).
3. **Return meaningful context.** Prefer `name`, `image_url`, `file_type` over `uuid`, `256px_image_url`, `mime_type`. Natural-language identifiers reduce hallucination versus arbitrary alphanumeric UUIDs; a 0-indexed ID scheme is one workable middle ground. For cases needing both convenience and chainability, expose a `response_format` enum:
   ```
   enum ResponseFormat {
     DETAILED = "detailed",
     CONCISE = "concise"
   }
   ```
   COMPOSED-illustrative-but-source-given-as-example (S1). Measured: a Slack-thread example dropped from 206 tokens (detailed) to 72 tokens (concise) — "we use ~⅓ of the tokens." `thread_ts`/`channel_id`/`user_id` should be available in `detailed` mode to enable follow-up chained tool calls even when `concise` is the default.
4. **Optimize for token efficiency.** Pagination, range selection, filtering, truncation with sensible defaults. Anthropic's own convention: Claude Code truncates tool responses to **25,000 tokens by default** [S1]. When truncating, steer the agent explicitly (e.g., toward many small targeted searches instead of one broad one). Error responses should be prompt-engineered to be actionable, not opaque codes/tracebacks.
5. **Prompt-engineer descriptions/specs.** Write for "a new hire" — make implicit context (query formats, niche terms, resource relationships) explicit. Name parameters unambiguously (`user_id`, not `user`). Claude Sonnet 3.5's then-SOTA SWE-bench Verified score followed from precise tool-description refinements, not prompt changes [S1].

### 4. MCP tool wire format (S5/S6, VERBATIM — spec 2025-06-18, current baseline; deltas below for 2026-07-28)

`tools/list` request/response (VERBATIM, S5):
```json
{
  "jsonrpc": "2.0", "id": 1, "method": "tools/list",
  "params": { "cursor": "optional-cursor-value" }
}
```
```json
{
  "jsonrpc": "2.0", "id": 1,
  "result": {
    "tools": [
      {
        "name": "get_weather",
        "title": "Weather Information Provider",
        "description": "Get current weather information for a location",
        "inputSchema": {
          "type": "object",
          "properties": { "location": { "type": "string", "description": "City name or zip code" } },
          "required": ["location"]
        }
      }
    ],
    "nextCursor": "next-page-cursor"
  }
}
```
`tools/call` request/response (VERBATIM, S5):
```json
{ "jsonrpc": "2.0", "id": 2, "method": "tools/call",
  "params": { "name": "get_weather", "arguments": { "location": "New York" } } }
```
```json
{ "jsonrpc": "2.0", "id": 2,
  "result": { "content": [ { "type": "text", "text": "Current weather in New York:\nTemperature: 72°F\nConditions: Partly cloudy" } ], "isError": false } }
```
Tool object fields (VERBATIM list, S5): `name`, `title` (optional display name), `description`, `inputSchema`, `outputSchema` (optional — if present, server **MUST** conform, client **SHOULD** validate), `annotations` (optional; **MUST** be treated as untrusted unless from a trusted server).

Content block types a tool result may return: `text`, `image` (base64+mimeType+annotations), `audio` (base64+mimeType), `resource_link` (URI reference, not guaranteed to appear in `resources/list`), embedded `resource` (full inline resource with URI/mimeType/text/annotations), and `structuredContent` (JSON object; for back-compat also serialize into a `text` block). Annotations here (`audience`, `priority`, `lastModified`) are the *resource*-annotation format, distinct from `ToolAnnotations` hints below.

`ToolAnnotations` (VERBATIM field docs from `schema.ts`, S6-schema — introduced 2025-03-26):
- `title?: string`
- `readOnlyHint?: boolean` — "If true, the tool does not modify its environment." Default `false`.
- `destructiveHint?: boolean` — "If true, the tool may perform destructive updates... (meaningful only when `readOnlyHint == false`)." Default `true`.
- `idempotentHint?: boolean` — "calling the tool repeatedly with the same arguments will have no additional effect... (meaningful only when `readOnlyHint == false`)." Default `false`.
- `openWorldHint?: boolean` — "this tool may interact with an 'open world' of external entities... e.g. web search is open, memory tool is not." Default `true`.
- Schema comment (VERBATIM): "NOTE: all properties in ToolAnnotations are **hints**. They are not guaranteed to provide a faithful description of tool behavior... Clients should never make tool use decisions based on ToolAnnotations received from untrusted servers."

Error handling — two channels (VERBATIM, S5):
1. **Protocol errors** (standard JSON-RPC, e.g. unknown tool `-32602`).
2. **Tool execution errors**, reported inside a normal result with `isError: true`, e.g.:
```json
{ "jsonrpc": "2.0", "id": 4,
  "result": { "content": [ { "type": "text", "text": "Failed to fetch weather data: API rate limit exceeded" } ], "isError": true } }
```

Security section (VERBATIM, S5): servers **MUST** validate all tool inputs, implement access controls, rate-limit, sanitize outputs; clients **SHOULD** prompt for confirmation on sensitive ops, show inputs before calling (to prevent data exfiltration), validate results before passing to the LLM, implement timeouts, log for audit.

### 5. What changed in MCP 2026-07-28 that touches tool design directly (S6-changelog, VERBATIM claim list)

- Output/input schemas loosened: "Loosen `inputSchema` and `outputSchema` to allow any JSON Schema 2020-12 keywords, and `structuredContent` to allow any JSON value." (SEP-2106)
- `tools/list` now carries **mandatory caching fields** via a new `CacheableResult` interface: `ttlMs` (freshness hint in ms) and `cacheScope` (`"public"`/`"private"`) — explicitly there to reduce polling and to preserve LLM prompt-cache hit rates (SEP-2549). Servers **SHOULD** return tools in **deterministic order** across calls for the same reason.
- A tool's input schema properties **MAY** carry an `x-mcp-header` annotation to map a parameter to an HTTP header (new in this revision, per the tools.mdx diff).
- New `resultType` field required on every result (`"complete"` vs `"input_required"`); a tool call can now return an **`InputRequiredResult`** mid-call (e.g. to run an elicitation) instead of the old server-initiated request pattern — this is the Multi Round-Trip Requests (MRTR) mechanism, replacing `roots/list`/`sampling/createMessage`/`elicitation/create` as free-standing server-to-client requests. VERBATIM wire example (S6, tools.mdx diff):
```json
{
  "jsonrpc": "2.0", "id": 2,
  "result": {
    "resultType": "input_required",
    "inputRequests": {
      "github_login": {
        "method": "elicitation/create",
        "params": { "mode": "form", "message": "Please provide your GitHub username",
          "requestedSchema": { "type": "object", "properties": { "name": { "type": "string" } }, "required": ["name"] } }
      }
    },
    "requestState": "eyJsb2NhdGlvbiI6Ik5ldyBZb3JrIn0..."
  }
}
```
Retry (VERBATIM):
```json
{
  "jsonrpc": "2.0", "id": 3, "method": "tools/call",
  "params": {
    "name": "get_weather", "arguments": { "location": "New York" },
    "inputResponses": { "github_login": { "action": "accept", "content": { "name": "octocat" } } },
    "requestState": "eyJsb2NhdGlvbiI6Ik5ldyBZb3JrIn0..."
  }
}
```
- Protocol made **stateless**: no `initialize` handshake, no `Mcp-Session-Id`; `tools/list` results "no longer vary per-connection." Cross-call state must now be an explicit, server-minted handle passed back as an ordinary tool argument — a direct constraint on tool *parameter design* for any stateful workflow tool (e.g. pagination cursors, multi-step wizards).
- `icons` array added to the `Tool` object for UI display.
- Roots, Sampling, Logging **deprecated** (12-month minimum deprecation window); suggested migration for Roots is "pass directories or files via tool parameters... instead."

### 6. Tool Search Tool (S2, S10 — dated types `tool_search_tool_regex_20251119`, `tool_search_tool_bm25_20251119`)

Mechanism: send **every** tool definition in `tools[]`; tools you don't want preloaded get `"defer_loading": true`; Claude's context initially contains only the search tool + non-deferred tools; on search, the API returns `tool_reference` blocks (up to 5 by default, Claude can set `limit`) which the API auto-expands into full definitions inline in the conversation (not in the cached prefix — so **prompt caching is preserved**) [S10].

VERBATIM implementation snippet (S2):
```json
{
  "tools": [
    {"type": "tool_search_tool_regex_20251119", "name": "tool_search_tool_regex"},
    {
      "name": "github.createPullRequest",
      "description": "Create a pull request",
      "input_schema": {"...": "..."},
      "defer_loading": true
    }
  ]
}
```
Deferring a whole MCP server while keeping one tool hot (VERBATIM, S2):
```json
{
  "type": "mcp_toolset",
  "mcp_server_name": "google-drive",
  "default_config": {"defer_loading": true},
  "configs": { "search_files": {"defer_loading": false} }
}
```
Regex variant: Claude writes Python `re.search()` patterns (case-insensitive), max 200 chars, e.g. `"get_.*_data"`, `"database.*query|query.*database"`. BM25 variant: natural-language queries, max 500 chars [S10]. Rule: never defer the search tool itself; keep your 3–5 hottest tools non-deferred [S2, S10]. `defer_loading` composes with `strict` mode without grammar recompilation, because the strict-mode grammar is built from the full toolset regardless of what's deferred [S10].

When to use / not use (VERBATIM list, S2):
- Use when: tool definitions >10K tokens; tool-selection accuracy issues observed; multi-server MCP setups; 10+ tools.
- Less useful when: <10 tools; all tools used every session; definitions already compact.

Numbers (S2, VERBATIM claim): traditional approach for a 50+-tool MCP setup ≈ 77K tokens consumed before work begins (72K defs + prompt/history competing for the rest); with Tool Search Tool ≈ 8.7K tokens (500 for the search tool + ~3K for 3–5 discovered tools), "preserving 95% of context window," described elsewhere in the same post as an "85% reduction." Accuracy: Opus 4 49%→74%, Opus 4.5 79.5%→88.1% on internal MCP evals [S2].

### 7. Programmatic Tool Calling / PTC (S2, S17)

Enable via `code_execution` tool + `allowed_callers: ["code_execution_20260120"]` (or `_20260521`) on each tool you want callable from code (VERBATIM, S2):
```json
{
  "tools": [
    {"type": "code_execution_20250825", "name": "code_execution"},
    {"name": "get_team_members", "description": "Get all members of a department...", "input_schema": {"...": "..."}, "allowed_callers": ["code_execution_20250825"]}
  ]
}
```
Runtime shape: model emits `server_tool_use` (`name: "code_execution"`) containing Python code; each tool call inside that code arrives to your infra as an ordinary `tool_use` block but tagged with a `caller` field:
```json
{ "type": "tool_use", "id": "toolu_xyz", "name": "get_expenses",
  "input": {"user_id": "emp_123", "quarter": "Q3"},
  "caller": { "type": "code_execution_20250825", "tool_id": "srvtoolu_abc" } }
```
Only the script's final stdout returns to Claude's context, e.g. `{"stdout": "[{\"name\": \"Alice\", ...}]"}` — intermediate results (2,000+ line items in the worked example) never touch the model [S2].

Omitting `"direct"` from `allowed_callers` (e.g. `["code_execution_20260120"]` only) forces code-only invocation [S11]. Feature incompatibilities documented on the current platform docs (S17, VERBATIM list): `strict: true` tools are **not supported** with programmatic calling; `tool_choice` **cannot** force a specific programmatic call; `disable_parallel_tool_use: true` is **not supported** with programmatic calling; a tool whose `input_schema` has a recursive `$ref` cannot be enabled for PTC (400 `invalid_request_error`, message contains "Circular $ref detected") — must stay direct-only or have the cycle unrolled.

Timeout behavior (VERBATIM, S17): if a tool result doesn't arrive within **~4 minutes**, the pending call raises a `TimeoutError` inside the running code, visible to Claude via `stderr`:
```json
{ "type": "code_execution_tool_result", "tool_use_id": "srvtoolu_abc123",
  "content": { "type": "code_execution_result", "stdout": "",
    "stderr": "TimeoutError: Calling tool ['query_database'] timed out (no response after 270s).",
    "return_code": 0, "content": [] } }
```
Mitigation advice: monitor `expires_at`, implement your own tool-execution timeouts, chunk long operations [S17]. Container data (execution artifacts, outputs) retained up to 30 days [S17].

Numbers (S2, VERBATIM claims): average tokens on complex research tasks 43,588→27,297 (−37%); internal knowledge retrieval 25.6%→28.5%; GIA benchmark 46.5%→51.2%; budget-compliance worked example: 200KB of raw expense rows collapses to ~1KB of results, eliminating "19+ inference passes" for a 20-call workflow.

### 8. Tool Use Examples / `input_examples` (S2, S9, S11, S14)

`input_examples` is now a documented top-level tool property, available on "user-defined and Anthropic-schema client tools... except computer/browser toolsets," "not available on server tools" [S11]. Each example must independently validate against the tool's own `input_schema`, or the request 400s [S14]. Token cost: "~20–50 tokens for simple examples, ~100–200 tokens for complex nested objects" [S14].

VERBATIM worked example (S2) — a `create_ticket` tool with three examples teaches: date format `YYYY-MM-DD`, ID convention `USR-XXXXX`, kebab-case labels, and — critically — *which optional fields co-occur* (critical bugs get full `reporter.contact`+`escalation`; feature requests get partial `reporter`; internal tasks get title only). Measured gain: 72%→90% accuracy on complex parameter handling [S2].

Guidance (VERBATIM, S2): "Use realistic data... Show variety with minimal, partial, and full specification patterns. Keep it concise: 1–5 examples per tool. Focus on ambiguity."

### 9. Strict schemas (S12 Anthropic, S9 OpenAI)

Anthropic `strict: true` (VERBATIM claim, S12): "constraining the model's token sampling to schema-valid outputs (a technique called grammar-constrained sampling)." Guarantees: `input` conforms to `input_schema`; `name` is always a valid tool name. Compiles schemas "into grammars using the same pipeline as structured outputs"; compiled schemas cached up to 24h. Not supported on `mcp_toolset`, `computer_toolset_20260801`, `browser_toolset_20260801` [S11]; not supported together with PTC's `allowed_callers` on the same tool for programmatic calling [S17]. HIPAA note: PHI **must not** appear in `input_schema` property names/enum/const/pattern values, because compiled-schema caching doesn't carry the same PHI protection as message content [S12].

OpenAI `strict: true` (VERBATIM requirements, S9): "`additionalProperties` must be set to `false` for each object in the `parameters`. All fields in `properties` must be marked as `required`. You can denote optional fields by adding `null` as a `type` option." If the schema can't satisfy this, Responses API silently falls back to `strict: false` best-effort; Chat Completions stays non-strict unless you opt in. Fine-tuned models: schema compiled+cached on first request (adds latency on schema change) and that cache is **not eligible for zero data retention**.

### 10. Consolidation vs. bash/CLI-as-universal-tool (S1, S7, S3, S8)

Three converging strategies for "too many tools":
1. **Workflow-level consolidation** — merge related endpoint-wrapping tools into one tool with an `action` parameter or a higher-level verb (`schedule_event`, `get_customer_context`) [S1, and echoed by the current Anthropic docs: "Consolidate related operations into fewer tools... group them into a single tool with an `action` parameter" [S14]].
2. **CLI/bash as a universal tool** — instead of N specific tools, give the agent a shell; CLIs are self-documenting (`--help`) and support progressive disclosure. Explicitly discussed as an alternative pattern in Cloudflare's comparison table, citing OpenClaw and "Moltworker" converting MCP servers to CLIs via "MCPorter." Named limitation: "the agent needs a shell... introduces a much broader attack surface than a sandboxed isolate" [S8].
3. **Code Mode / code execution** — convert the whole tool surface into a typed API (TypeScript or Python) and let the model write orchestration code; only final results return to context [S7, S3, S8]. Cloudflare's comparison table (VERBATIM, S8) lays out four competing approaches side by side: client-side Code Mode (needs client sandbox), CLIs (needs a shell, broad attack surface), dynamic tool search (needs an evaluated search function, each match still costs tokens), and server-side Code Mode (fixed cost, no client changes, sandboxed).

### 11. The "tool call is a trained special token" argument for why code beats tool-calling (S7, VERBATIM mechanism explanation)

Cloudflare's explanation of *why* code-writing outperforms tool-calling syntactically: LLMs are fine-tuned on a "contrived training set" of synthetic tool-call examples, versus "real-world code from millions of open source projects." Analogy (VERBATIM): "Making an LLM perform tasks with tool calling is like putting Shakespeare through a month-long class in Mandarin and then asking him to write a play in it." Under the hood a tool call is delimited by special tokens (`<|tool_call|>` / `<|end_tool_call|>` in their illustrative — not real — notation) that have no textual equivalent and must be specially trained; ordinary code tokens are abundant in pretraining [S7].

### 12. Anthropic's own "code execution with MCP" pattern (S3)

Alternative concrete implementation to Cloudflare's TypeScript-API approach: generate a **file tree** of tools as `.ts` files under `./servers/<server>/<tool>.ts`, and let the agent discover tools by listing directories and reading files it needs (progressive disclosure via a real filesystem, no separate search index needed) [S3]. VERBATIM per-tool file shape:
```ts
// ./servers/google-drive/getDocument.ts
import { callMCPTool } from "../../../client.js";
interface GetDocumentInput { documentId: string; }
interface GetDocumentResponse { content: string; }
export async function getDocument(input: GetDocumentInput): Promise<GetDocumentResponse> {
  return callMCPTool<GetDocumentResponse>('google_drive__get_document', input);
}
```
Measured: 150,000→2,000 tokens (98.7% reduction) on a Google-Drive-to-Salesforce transcript-copy task, because the full transcript no longer has to flow through the model's context twice [S3]. Also documents a **PII-tokenization pattern**: the MCP client can tokenize sensitive fields (`[EMAIL_1]`, `[PHONE_1]`) before they ever reach the model's context, and untokenize them only when handed to another tool call — "The real email addresses... flow from Google Sheets to Salesforce, but never through the model" [S3]. And a **state/skills pattern**: agent-written code can persist reusable functions as files (`./skills/save-sheet-as-csv.ts` + a `SKILL.md`), tying tool design directly into Anthropic's Skills feature (cross-link: chapter 06) [S3].

### 13. Parallel tool calls (S9 OpenAI, S13 Anthropic)

Anthropic (S13, VERBATIM): "By default, Claude may call multiple tools in a single response." The API "doesn't prescribe an execution order" — caller decides concurrent vs sequential based on side effects. Formatting rule: return one `tool_result` per `tool_use`, all in the **same** next user message, `tool_result` blocks **before** any text content, matched by `tool_use_id`. If you skip a call (e.g., sequential batch, earlier one failed), still return a `tool_result` with `is_error: true` and an explanation. Disable via `tool_choice: {"type": "auto", "disable_parallel_tool_use": true}` — this is a `tool_choice` sub-field, **not** a top-level request parameter. Noted regression: "Claude Fable 5.1 may issue fewer parallel tool calls than earlier models... in long agent loops" — mitigated with an explicit `<use_parallel_tool_calls>` system-prompt block (VERBATIM, S13):
> "For maximum efficiency, whenever you perform multiple independent operations, invoke all relevant tools simultaneously rather than sequentially. Prioritize calling tools in parallel whenever possible..."

OpenAI (S9): parallel calling only "on supported models beginning with GPT-5, ... when built-in tools are also available"; disable via `parallel_tool_calls: false` ("ensures exactly zero or one tool is called"). Caveat: a fine-tuned model calling multiple functions in one turn silently disables strict mode for those calls.

### 14. Error messages that instruct the model (S1, S5)

Anthropic's framing (S1): treat tool errors as a prompt-engineering surface — "prompt-engineer your error responses to clearly communicate specific and actionable improvements, rather than opaque error codes or tracebacks." MCP baseline mechanism (S5): tool execution errors go in a normal (non-protocol-error) result with `isError: true` and a human-readable `text` block, e.g. `"Failed to fetch weather data: API rate limit exceeded"` — the point being the LLM reads this like any other tool output and can react to it (retry, ask the user, pick another tool), which a raw JSON-RPC protocol error cannot do.

### 15. OpenAI-specific function-calling best practices not already covered above (S9, VERBATIM list)

- "Pass the intern test. Can an intern/human correctly use the function given nothing but what you gave the model?"
- "Use enums and object structure to prevent invalid states. For example, `toggle_light(on: bool, off: bool)` allows for invalid calls" — a textbook poka-yoke example independently arrived at by OpenAI.
- "Don't make the model fill arguments you already know" — e.g. don't expose `order_id` as a parameter if your code already has it from an earlier step; bind it server-side instead.
- "For deferred tools, put detailed guidance in the function description and keep the namespace description concise" — namespace helps tool *search/selection*, description helps *correct use once loaded* (a distinction not spelled out this explicitly in the Anthropic docs).
- Token-usage framing: "functions are injected into the system message in a syntax the model has been trained on... count against the model's context limit and are billed as input tokens." Suggested mitigations: fewer functions, shorter descriptions, `tool_search`, or fine-tuning to shrink tool-definition token cost.

## Numbers (with conditions and source)

| Number | Condition | Source |
|---|---|---|
| ~55K tokens | 5-server MCP setup (GitHub 35 tools/~26K, Slack 11/~21K, Sentry 5/~3K, Grafana 5/~3K, Splunk 2/~2K) = 58 tools before any work begins | S2 |
| 134K tokens | Anthropic-observed real deployment tool-definition overhead pre-optimization | S2 |
| ~85% reduction | Tool Search Tool vs. loading all definitions upfront, "typical" | S10 |
| 191,300 vs 122,800 tokens preserved | Tool Search Tool vs. traditional, Anthropic's own worked example | S2 |
| ~77K → ~8.7K tokens | Same example, absolute before/after; described as "95% of context window preserved" / "85% reduction" (two framings, same underlying case) | S2 |
| Opus 4: 49%→74%; Opus 4.5: 79.5%→88.1% | Accuracy on internal MCP evals, with vs without Tool Search Tool | S2 |
| 30–50 tools | Threshold past which Claude's tool-selection accuracy "degrades," per current platform docs | S10 |
| <20 functions | OpenAI's suggested soft ceiling for functions available "at the start of a turn" | S9 |
| 43,588→27,297 tokens (−37%) | PTC vs. traditional, "complex research tasks," Anthropic internal | S2 |
| 25.6%→28.5% | Internal knowledge retrieval accuracy, PTC vs. not, Anthropic internal | S2 |
| 46.5%→51.2% | "GIA benchmarks," PTC vs. not, Anthropic internal | S2 |
| 200KB→1KB | Budget-compliance worked example: raw expense rows vs. PTC final result | S2 |
| 72%→90% | Complex parameter-handling accuracy with vs. without `input_examples`, Anthropic internal | S2 |
| 150,000→2,000 tokens (−98.7%) | "Code execution with MCP" filesystem-of-tools pattern, Google Drive→Salesforce transcript task, Anthropic | S3 |
| 32% / 81% fewer tokens | Cloudflare Code Mode vs. direct tool calling, "simple single-event" vs. "complex 31-event" task — reported by WorkOS's summary of a Cloudflare MCP Night demo, **not found verbatim in either Cloudflare blog post fetched**; treat as secondary/unverified pending the original talk | secondary (WorkOS), see Unverified |
| 99.9% fewer input tokens; 1.17M tokens (no Code Mode) vs. ~1,000 tokens (Code Mode) | Server-side Code Mode, full Cloudflare API surface, measured with `tiktoken` | S8 |
| ~4 minutes / 270s | PTC container tool-call timeout before `TimeoutError` raised in-sandbox | S17 |
| 206→72 tokens (~⅓) | Slack-thread tool response, `detailed` vs `concise` `response_format` | S1 |
| 25,000 tokens | Claude Code's default tool-response truncation limit | S1 |
| 20–50 / 100–200 tokens | `input_examples` cost per simple / complex example | S14 |
| ~20–50 tokens vs ~100–200 tokens | (duplicate framing of the row above) | S14 |
| 30 days | PTC/code-execution container data retention | S17 |
| 24 hours | Strict-mode compiled-schema cache lifetime | S12 |

## Pitfalls, limits, criticism

- **Tool annotations are untrusted by default.** The MCP spec is explicit that `readOnlyHint`/`destructiveHint`/etc. are self-reported hints a malicious or buggy server can lie about; clients "should never make tool use decisions based on ToolAnnotations received from untrusted servers" [S5, S6-schema]. Do not build a confirmation-skipping UX purely on annotations from third-party MCP servers.
- **PTC and strict mode/parallel-disable/tool_choice-forcing don't compose.** `strict: true` tools can't be called programmatically; `disable_parallel_tool_use: true` is rejected with PTC; you can't force a specific tool via `tool_choice` if PTC is in play; recursive `$ref` schemas can't be enabled for PTC at all (400 error) [S17]. This is a real design constraint: a tool meant for code-orchestrated use must have a strictly non-recursive, non-strict-mode schema, which cuts against wanting both strictness *and* programmatic calling on the same tool.
- **Tool Search adds latency for a search round-trip** — Anthropic's own guidance says it "delivers the best ROI when the context savings and accuracy improvements outweigh additional latency," explicitly framing it as a tradeoff, not a free win [S2].
- **Code execution/Code Mode requires a real secure sandbox** — Anthropic: "code execution introduces its own complexity. Running agent-generated code requires a secure execution environment with appropriate sandboxing, resource limits, and monitoring... should be weighed against these implementation costs" [S3]. Cloudflare's own comparison table flags the CLI-as-universal-tool alternative as having "a much broader attack surface than a sandboxed isolate" [S8] — i.e., not all consolidation strategies are equally safe.
- **MCP's 2026-07-28 rewrite removed session state and server-initiated requests** (Sampling, Roots, old-style `elicitation`) — any tool design that relied on the server pushing a mid-call question to the client (old `elicitation/create` as a free-standing request) must be re-architected around the new `InputRequiredResult`/retry pattern, and any tool that leaned on connection-scoped session state must move that state into an explicit, tool-argument-carried handle [S6-changelog]. This is a breaking change for tool authors, not just a protocol footnote.
- **32%/81% Cloudflare Code Mode numbers could not be verified against the primary blog posts** — appear only in secondary coverage (WorkOS); the two Cloudflare posts actually fetched give different, specific numbers (99.9%/1.17M tokens for the server-side API case) — see Unverified section.
- **The "5 examples per tool" and "3-5 non-deferred tools" thresholds are Anthropic's own recommendations, not hard limits** — worth stating as guidance, not law, since the docs themselves hedge with "keep your 3–5 most frequently used tools non-deferred" as advice, not a system constraint [S2, S10].
- **Namespacing effect is empirically inconsistent across models** — Anthropic explicitly declines to declare prefix vs. suffix universally better: "Effects vary by LLM and we encourage you to choose a naming scheme according to your own evaluations" [S1].

## What changed in the last 6 months (i.e., since ~2026-03-30)

- MCP's **2026-07-28** spec revision is the single biggest change in-window: statelessness, mandatory `tools/list` caching metadata + deterministic ordering, `resultType`/MRTR replacing server push requests, Sampling/Roots/Logging deprecated, HTTP+SSE transport reclassified Deprecated [S6-changelog]. Any tool-design advice written before mid-2026 that assumes MCP sessions or server-initiated elicitation is now describing a deprecated pattern.
- Cloudflare's **server-side Code Mode** (2026-02-20) generalized the Sep-2025 client-side pattern into something an MCP-server author can ship without requiring anything from the agent/client side — this is the more relevant "current" recommendation for anyone building an MCP server today, vs. the original client-side Code Mode [S8].
- Anthropic's Nov-2025 "advanced tool use" beta trio (Tool Search, PTC, Tool Use Examples) reads as fully graduated/stable on the platform docs accessed today (2026-09-30) — no beta banners found on the fetched Tool Search / PTC / Strict-tool-use / Parallel-tool-use pages — though the `advanced-tool-use-2025-11-20` beta header is still shown in the original announcement's "Getting started" snippet [S2 vs S10/S11/S12/S13/S14, cross-checked].
- OpenAI has since matched Anthropic's tool-search pattern with its own `tool_search` (gated to "gpt-5.4 and later") [S9] — convergent evolution across vendors within the last two quarters is itself a fact worth stating in the book.

## Diagram candidates

1. **Tool-call vs. code-execution data flow** — two lanes: (a) classic tool-calling: LLM ⇄ harness ⇄ MCP server, every intermediate result round-trips through the model's context; (b) code-mode: LLM writes code once → sandbox executes → only final result returns to LLM. Actors: LLM, Harness/Client, Sandbox, MCP Server(s). Label the token cost at each arrow. Source numbers: S3, S7, S8.
2. **Tool Search Tool state machine** — states: `not loaded` → (search call) → `tool_reference returned` → (auto-expand) → `full definition in context` → (call) → `tool_use`/`tool_result`. Show the prefix/cache boundary (deferred tools never enter the cached prefix). Source: S10.
3. **Programmatic Tool Calling sequence diagram** — actors: Claude, API, Code Execution sandbox, Tool backend. Arrows: Claude→API (`server_tool_use` code block) → sandbox executes → sandbox pauses on tool call → API surfaces `tool_use` with `caller` field → your infra returns `tool_result` → sandbox resumes → sandbox finishes → API returns only stdout to Claude. Source: S2.
4. **MCP tool lifecycle (2026-07-28)** — `tools/list` (with `ttlMs`/`cacheScope`, deterministic order) → optional `subscriptions/listen` for `toolsListChanged` → `tools/call` → either `resultType: "complete"` or `resultType: "input_required"` (loop back via `inputResponses` retry) → `notifications/tools/list_changed`. Source: S6-changelog, mcp_tools_2026-07-28.mdx.
5. **Tool annotation trust boundary** — Server declares `readOnlyHint`/`destructiveHint`/`idempotentHint`/`openWorldHint` → Client evaluates trust of the *server*, not just the annotation → branches into "auto-approve" vs "confirm with human" paths. Source: S5, S6-schema.
6. **Consolidation ladder** — three-rung ladder: raw API endpoints → per-endpoint tools (bad) → consolidated workflow tools (`schedule_event`, `search_logs`, `get_customer_context`) → code-mode/CLI (whole-API-as-code). Source: S1, S8.
7. **response_format enum decision** — one box (tool call) branching into `concise` (72 tok) vs `detailed` (206 tok) response, with an arrow showing `detailed`'s IDs feeding a follow-up chained tool call. Source: S1.
8. **PII tokenization flow** — Google Sheet (real PII) → MCP client tokenizer → Claude's context (sees `[EMAIL_1]`) → generated code calls Salesforce tool → MCP client detokenizes → Salesforce (real PII), with a dotted line showing PII never crosses into the LLM context box. Source: S3.
9. **Vendor convergence timeline chart** — x-axis time (2025-09 → 2026-02), y-axis "who shipped a code/search-based tool-scaling primitive": Anthropic (writing-effective-tools Sep'25, code-execution-with-MCP Nov'25, advanced-tool-use Nov'25), Cloudflare (code-mode Sep'25, server-side code-mode Feb'26), OpenAI (tool_search, undated but "gpt-5.4+"). Source: S1, S2, S3, S7, S8, S9.
10. **Tool-count vs accuracy curve (chart candidate)** — no continuous dataset found, only two discrete anchor points from S10 ("accuracy degrades past 30–50 tools") and S9 ("aim for <20 functions"); would need to be drawn as a qualitative curve, flagged as non-quantitative, or supplemented with an original eval.
11. **Error-message quality spectrum** — three tool_result examples side by side: opaque code, traceback, and Anthropic's "helpful" reformulation (the post shows images of these three but the actual text wasn't recoverable from the HTML scrape — see Unverified). Source: S1 (partial).
12. **MCP spec version timeline** — 2024-11-05 → 2025-03-26 (annotations) → 2025-06-18 → 2025-11-25 → 2026-07-28 (statelessness/MRTR), each with 1-line "what changed for tools." Source: S6-versions, S6-changelog.

## Glossary

- **ACI (agent-computer interface)**: the discipline of designing a tool's interface for an LLM agent the way HCI designs interfaces for humans; coined/popularized in Anthropic's Building Effective Agents Appendix 2 [S4].
- **Poka-yoke**: (from manufacturing) designing a tool's parameters so that mistakes are structurally hard to make, e.g. requiring absolute paths instead of relative ones [S4].
- **Tool Search Tool**: an Anthropic server-side tool (`tool_search_tool_regex_20251119` / `_bm25_20251119`) that lets Claude discover and load `defer_loading: true` tools on demand instead of upfront [S2, S10].
- **`defer_loading`**: a per-tool boolean; `true` keeps a tool's full definition out of the initial context/cached prefix until Tool Search discovers it [S10, S11].
- **`tool_reference`**: the lightweight block the API inserts when Tool Search finds a matching deferred tool, before it's expanded into the full definition [S10].
- **Programmatic Tool Calling (PTC)**: Claude writes code (in a `code_execution` sandbox) that calls tools marked `allowed_callers: ["code_execution_..."]`; only the code's final output re-enters Claude's context [S2, S17].
- **`allowed_callers`**: per-tool array restricting who may invoke it — `"direct"` (model) and/or a dated `code_execution` version [S11].
- **Code Mode**: Cloudflare's term for converting an MCP/API surface into a typed programming-language API so the model writes orchestration code instead of emitting tool-call tokens; also exists "server-side" as of 2026 [S7, S8].
- **Strict tool use / strict mode**: grammar-/schema-constrained decoding that guarantees a tool call's `input` matches `input_schema` exactly (Anthropic `strict: true`, OpenAI `strict: true`) [S12, S9].
- **Tool Use Examples / `input_examples`**: an array of schema-valid example inputs attached to a tool definition, to teach usage conventions JSON Schema can't express [S2, S14].
- **Tool annotations (MCP)**: `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint` — self-reported, untrusted-by-default behavioral hints on an MCP tool [S5, S6-schema].
- **MRTR (Multi Round-Trip Requests)**: the MCP 2026-07-28 pattern where a `tools/call` can return `resultType: "input_required"` with `inputRequests`, and the client retries the same logical call with `inputResponses` — replaces old server-initiated `elicitation`/`sampling` [S6-changelog].
- **`ttlMs` / `cacheScope`**: new MCP 2026-07-28 fields on list results (`tools/list` etc.) giving a client-side caching freshness hint and public/private cache-sharing scope [S6-changelog].
- **`response_format` enum pattern**: a COMPOSED-but-source-recommended tool parameter (e.g. `concise`/`detailed`) letting the caller trade completeness for token cost [S1].
- **Namespacing**: prefixing/suffixing tool names by service or resource (`asana_search`, `asana_projects_search`) to disambiguate a large tool surface [S1].
- **poka-yoke** — see ACI above.
- **Consolidation**: merging several endpoint-level tools into one workflow-level tool (e.g. `schedule_event`) [S1].

## Unverified / open questions

- **32%/81% Cloudflare Code Mode token-reduction figures** (simple vs. complex/31-event task): found only in a WorkOS secondary write-up of a Cloudflare "MCP Night" demo; not present verbatim in either Cloudflare blog post fetched directly (`blog.cloudflare.com/code-mode/`, `blog.cloudflare.com/code-mode-mcp/`). Tried: full-text search of both posts' extracted text for "32%", "81%", "event" — no hits. Treat as secondary/unconfirmed until the original MCP Night talk or its slides are located.
- **The exact text of Anthropic's "unhelpful vs. helpful error response" and "truncated tool response" examples** in the Sep-2025 "Writing effective tools" post: these were shown as images in the original post; the HTML scrape used here (`WebFetch`-free, raw curl + tag-strip) only recovered the surrounding captions ("Here's an example of a truncated tool response:" / "...an unhelpful error response:" / "...a helpful error response:"), not the image content itself. A screenshot-capable fetch would be needed to transcribe them.
- **MCP annotation history for 2025-03-26 specifically**: confirmed structurally (annotations exist in the schema, and search summaries date them to that revision) but the 2025-03-26 tools.mdx/changelog file itself was not individually fetched and diffed in this session — only 2025-06-18, 2025-11-25, and 2026-07-28 were pulled. If the chapter needs the exact SEP number or PR for the annotations feature, fetch `docs/specification/2025-03-26/changelog.mdx` directly.
- **Whether Anthropic's Nov-2025 advanced-tool-use features are still formally "beta"** as of 2026-09-30: the original announcement's code sample still shows `betas=["advanced-tool-use-2025-11-20"]`, but the current platform reference/how-to pages for Tool Search, PTC, Strict tool use, and Parallel tool use carry no visible beta disclaimer in the extracted text. Could not confirm via a changelog/release-notes page (not fetched in this session) whether/when the beta header requirement was dropped.
- **Real-world "typical mistakes in real MCP servers" survey**: the editor's scope item asks for this explicitly; WebSearch quota was exhausted before a targeted query could be run, and no dedicated primary post on this specific theme was fetched. This needs a follow-up search (e.g. for post-mortems from MCP server framework maintainers, or Anthropic/community "MCP anti-patterns" write-ups) in a future pass.
- **Cross-check of `code_execution_20260521`'s "discloses the per-cell time limit"** claim against the actual current tool description text — only the summary line from the Tool reference page's versioning table was captured, not the full tool description of `code_execution_20260521` itself.

## Sources

- [S1] "Writing effective tools for agents — with agents." Anthropic (Engineering blog). Published 2025-09-11. https://www.anthropic.com/engineering/writing-tools-for-agents — accessed 2026-09-30.
- [S2] "Introducing advanced tool use on the Claude Developer Platform." Anthropic (Engineering blog). Published 2025-11-24. https://www.anthropic.com/engineering/advanced-tool-use — accessed 2026-09-30.
- [S3] "Code execution with MCP: Building more efficient agents." Anthropic (Engineering blog). Published 2025-11-04. https://www.anthropic.com/engineering/code-execution-with-mcp — accessed 2026-09-30.
- [S4] "Building effective agents." Anthropic (News), by Erik S. and Barry Zhang. Published 2024-12-19. https://www.anthropic.com/news/building-effective-agents — accessed 2026-09-30 (Appendix 2, "Prompt engineering your tools").
- [S5] Model Context Protocol specification, "Tools" page, revision 2025-06-18. https://modelcontextprotocol.io/specification/2025-06-18/server/tools (raw: https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/main/docs/specification/2025-06-18/server/tools.mdx) — accessed 2026-09-30.
- [S6-changelog] Model Context Protocol specification, "Key Changes" changelog for revision 2026-07-28 (current/latest). https://modelcontextprotocol.io/specification/2026-07-28/changelog (raw via GitHub) — accessed 2026-09-30.
- [S6-schema] Model Context Protocol, `schema.ts` for revision 2025-06-18 (ToolAnnotations interface; annotations fields unchanged in later revisions per diff). https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/main/schema/2025-06-18/schema.ts — accessed 2026-09-30.
- [S6-versions] modelcontextprotocol.io versioning page and GitHub `docs/specification` directory listing (confirms 2026-07-28 = "latest"). https://modelcontextprotocol.io/specification/versioning ; https://api.github.com/repos/modelcontextprotocol/modelcontextprotocol/contents/docs/specification — accessed 2026-09-30.
- [S7] Varda, Kenton; Pai, Sunil. "Code Mode: the better way to use MCP." Cloudflare Blog. Published 2025-09-26. https://blog.cloudflare.com/code-mode/ — accessed 2026-09-30.
- [S8] Carey, Matt. "Code Mode: give agents an entire API in 1,000 tokens." Cloudflare Blog. Published 2026-02-20. https://blog.cloudflare.com/code-mode-mcp/ — accessed 2026-09-30.
- [S9] "Function calling." OpenAI Developer docs. Undated (reflects gpt-5.4/gpt-6-astra/gpt-6.1-sol/gpt-5.6-terra generation, i.e. current as of access). https://developers.openai.com/api/docs/guides/function-calling — accessed 2026-09-30.
- [S10] "Tool search tool." Claude Platform Docs. Undated (current). https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool — accessed 2026-09-30.
- [S11] "Tool reference." Claude Platform Docs. Undated (current). https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-reference — accessed 2026-09-30.
- [S12] "Strict tool use." Claude Platform Docs. Undated (current). https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use — accessed 2026-09-30.
- [S13] "Parallel tool use." Claude Platform Docs. Undated (current). https://platform.claude.com/docs/en/agents-and-tools/tool-use/parallel-tool-use — accessed 2026-09-30.
- [S14] "Define tools." Claude Platform Docs. Undated (current). https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools — accessed 2026-09-30.
- [S15/S16] "Manage tool context" and "Tool combinations." Claude Platform Docs. Undated (current). https://platform.claude.com/docs/en/agents-and-tools/tool-use/manage-tool-context ; https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-combinations — accessed 2026-09-30.
- [S17] "Programmatic tool calling." Claude Platform Docs. Undated (current). https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling — accessed 2026-09-30.
