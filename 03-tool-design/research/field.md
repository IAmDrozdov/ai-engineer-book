# 03. Проектирование инструментов агента — field notes

## TL;DR (must-know facts, 2026-09-30)

- Tools are a new kind of interface: a contract between a **deterministic** system and a **non-deterministic** caller (the agent), not an API for other programmers. Anthropic calls this the Agent-Computer Interface (ACI) and says it deserves as much design effort as HCI [S4][S1].
- The single most effective lever is **fewer, more consolidated tools that map to workflows**, not 1:1 wrappers around API endpoints (`schedule_event` instead of `list_users`+`list_events`+`create_event`) [S1].
- **Tool count and definition size measurably hurt accuracy.** Anthropic: 5 MCP servers = 58 tools = ~55K tokens before the chat starts; Opus 4 MCP-eval accuracy 49%→74% and Opus 4.5 79.5%→88.1% just by adding Tool Search Tool (defer_loading) [S3]. GitHub's official MCP server shipped 101 tools/64.6K tokens by default and had to cut to 52 tools/30.3K tokens (-53% tokens) [S12].
- **Response shaping matters as much as tool choice.** A `response_format: concise|detailed` enum cut a Slack thread response from 206 to 72 tokens (~⅓) in Anthropic's internal eval [S1]. A field benchmark on two competing MCP servers for the same to-do app found identical 90% pass rates but a **4.98× token gap** driven purely by bad response shaping and tool fragmentation [S10].
- **Code execution / "Code Mode" is the 2025-2026 architectural shift**: instead of calling MCP tools directly, the agent writes code against a typed SDK/filesystem of tool stubs; only the code's final output re-enters the model's context. Anthropic: 150,000 → 2,000 tokens (98.7% cut) on a Drive→Salesforce task [S2]. Cloudflare: entire 2,500-endpoint API exposed via 2 tools (`search`, `execute`) in ~1,000 tokens instead of 1.17M tokens (99.9% cut) [S5].
- **Tool Search Tool (`defer_loading`)** lets Claude mark most tools as not-loaded-by-default and discover them via a search tool; preserves prompt caching because deferred tools never enter the initial prompt [S3].
- **Programmatic Tool Calling (PTC)** lets Claude write Python that calls multiple tools in a sandbox, with only stdout returned to context — 43,588→27,297 tokens (-37%) and accuracy 25.6%→28.5% (knowledge retrieval), 46.5%→51.2% (GIA) in Anthropic's internal tests [S3].
- **Tool Use Examples** (`input_examples` field) raised complex parameter-handling accuracy from 72% to 90% in Anthropic's internal test — schemas define validity, not conventions (date format, ID scheme, which optional fields co-occur) [S3].
- **MCP's own spec now has machine-readable tool annotations** (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`) precisely for poka-yoke and confirmation-gating — but the spec explicitly warns clients **MUST treat annotations as untrusted unless the server is trusted** [S17][S18].
- **OpenAI's current guidance (developers.openai.com, checked 2026-09-30)**: enable `strict: true` by default for schema reliability; note **strict mode and `parallel_tool_calls` are mutually exclusive** — you pick one; keep tool count "fewer than 20 ... at the start of a turn" as a soft rule and defer the rest [S16].
- **Practitioners are split on the code-execution trend**: some call it "an obvious next step" already known from smolagents/Hugging Face; others call it "creating another dependency," warn that debugging a failed multi-tool script is harder for the model than fixing one bad tool call, and one well-known blogger (Armin Ronacher) prefers a single "ubertool" = a stateful Python/pexpect REPL over dozens of narrow tools [S9][S6].
- **Code execution moves the trust boundary, it doesn't remove it**: Check Point Research (Aug 2026) chained 5 memory-corruption bugs in Cloudflare's `workerd` runtime (which underlies Code Mode) into a cross-tenant secret read and a full sandbox escape, starting from prompt injection that steers the model into writing exploit-shaped code [S11]. This is a security-chapter topic (16) but every tool-design decision to run model-written code needs to know it exists.
- **"Bash/CLI as the universal tool" is a live faction**, not just theory: one HN commenter's mantra is literally "CLI tools are all you need" — self-documenting via `--help`, reusable via shell scripts — countered by others who point out the agent still needs a way to *discover* which CLI to install in the first place [S8].

## Current state and versions (as of 2026-09-30)

- **Anthropic Tool Search Tool / Programmatic Tool Calling / Tool Use Examples**: public beta since Nov 24, 2025, via `betas=["advanced-tool-use-2025-11-20"]`. Tool search variants shipped: `tool_search_tool_regex_20251119` and BM25-based; PTC ships as `code_execution_20250825` with `allowed_callers` opt-in per tool [S3].
- **Claude Code**: as of 2.1.x, tool search is available to defer all MCP tool definitions, gated by `ENABLE_TOOL_SEARCH` (per community reporting, not an Anthropic primary doc — mark lower confidence) [prior knowledge, unverified in a primary source this session — see Unverified].
- **Cloudflare Code Mode**: client-side Code Mode (Workers-side, TypeScript, Dynamic Worker Loader) shipped first; **server-side Code Mode** (the Cloudflare API exposed as `search()`+`execute()` over the whole 2,500+ endpoint API) shipped Feb 20, 2026 [S5]. Cloudflare frames this as the general-purpose evolution of "MCP Server Portals," announced as in-progress for wrapping arbitrary third-party MCP servers behind one gateway with fixed token cost [S5].
- **MCP spec**: current stable revision referenced by tooling is `2025-06-18`; it formalizes `outputSchema`/`structuredContent` for tool results and `ToolAnnotations` (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`, `title`) [S17][S18].
- **OpenAI**: docs migrated to `developers.openai.com` (old `platform.openai.com/docs/...` URLs 301-redirect there) [S16, observed 2026-09-30].
- Community MCP-server benchmarking tools now exist specifically to catch these tool-design regressions before shipping, e.g. `mcp-eval` (used in the 4.98× token-gap field report) [S10].

## Timeline

- **2024-12-19** — Anthropic, "Building Effective Agents": introduces the term Agent-Computer Interface (ACI), the poka-yoke principle (e.g. requiring absolute file paths to eliminate navigation errors), and the claim that tool design ate more dev time than prompt design on their SWE-bench agent [S4].
- **2025-08-18** — Armin Ronacher publishes the "ubertool" argument: one Python-eval tool beats 30 narrow tools; ships `pexpect-mcp` [S6].
- **2025-09-11** — Anthropic, "Writing effective tools for agents — with agents": the field's reference post. Introduces namespacing, `response_format` enum, consolidated workflow tools, and the "optimize tools with Claude Code reading eval transcripts" loop [S1].
- **2025-09-28** — First public "Cloudflare code-mode pattern" clone hits HN front page (87 pts) [S7].
- **2025-10-06** — GitHub's official MCP server ships default toolsets after community pressure: 101→52 tools, 64.6K→30.3K tokens [S12].
- **2025-10-28 / rev 2025-11-11** — OSWorld-MCP arXiv paper: first benchmark isolating MCP tool-invocation skill from GUI skill in computer-use agents [S13].
- **2025-11-04** — Anthropic, "Code execution with MCP": the 150K→2K token / 98.7% number; filesystem-of-tool-stubs pattern; PII tokenization pattern [S2].
- **2025-11-24** — Anthropic ships Tool Search Tool, Programmatic Tool Calling, Tool Use Examples as a public beta; HN thread gets 673 points / 54 comments, among the highest-engagement threads found for this chapter [S3][S9].
- **2026-02-20** — Cloudflare ships server-side Code Mode for its own API: 2 tools, ~1,000 tokens, 2,500+ endpoints, 99.9% token reduction vs. naive MCP [S5].
- **2026-03-05/06** — Field write-ups (Habr, dev.to) distill "tool count/response shaping" lessons for practitioners building their own MCP servers [S14][S15].
- **2026-06-05** — HN field report: matched MCP-A vs MCP-B benchmark on identical to-do app, 4.98× input-token gap from response-shaping alone, same 90% pass rate [S10].
- **2026-08-07/10** — Check Point Research discloses 5 memory-corruption bugs in `workerd` chained into a Code Mode sandbox escape and cross-tenant secret theft; HN discussion follows [S11].

## Mechanics

### 1. Choosing what to build: workflow tools, not endpoint wrappers

Anthropic's central claim: agents have different "affordances" than deterministic software. A traditional program can hold a full address book in memory and linearly scan it; an agent burns its (small, expensive) context doing the same thing token-by-token. So: don't ship `list_contacts`; ship `search_contacts` or `message_contact` [S1].

Consolidation examples, VERBATIM from Anthropic [S1]:
> "Instead of implementing a `list_users`, `list_events`, and `create_event` tools, consider implementing a `schedule_event` tool which finds availability and schedules an event."
> "Instead of implementing a `read_logs` tool, consider implementing a `search_logs` tool which only returns relevant log lines and some surrounding context."
> "Instead of implementing `get_customer_by_id`, `list_transactions`, and `list_notes` tools, implement a `get_customer_context` tool which compiles all of a customer's recent & relevant information all at once."

This is directly reflected in the field data: MCP-A in the 4.98× benchmark won by compressing "47 tools were compressed down to 14, covering the same functionality" [S10].

### 2. Namespacing

MCP clients often auto-namespace by server. Anthropic tested **prefix vs. suffix** namespacing (`asana_search` vs `asana_projects_search`) and found "non-trivial effects on our tool-use evaluations," varying by model — i.e., there's no universal answer, you must eval your own case [S1].

### 3. Parameter design and poka-yoke

- Name params unambiguously: `user_id`, not `user` [S1].
- Poka-yoke (error-proofing) example from Anthropic's SWE-bench work: **requiring absolute file paths instead of relative ones eliminated the agent's navigation errors** outright — a structural fix, not a prompt fix [S4].
- Provide "thinking space" in output formats — don't force the model to pre-count characters or do complex escaping before it can act [S4].

### 4. Response shaping: concise vs. detailed, semantic vs. opaque

Anthropic's `ResponseFormat` enum, COMPOSED-illustrative but the numbers are VERBATIM measured [S1]:
```
enum ResponseFormat {
   DETAILED = "detailed",
   CONCISE = "concise"
}
```
Detailed Slack-thread response: 206 tokens. Concise response (same info, IDs stripped): 72 tokens — "we use ~⅓ of the tokens with 'concise' tool responses" [S1]. The concise form must still expose `thread_ts`/`channel_id`/`user_id` somewhere reachable (via the detailed mode) so follow-up calls like `send_message(id=12345)` remain possible after a `search_user(name='jane')` [S1].

Prioritize high-signal fields (`name`, `image_url`, `file_type`) over low-level ones (`uuid`, `256px_image_url`, `mime_type`); resolving UUIDs to human-readable names or 0-indexed IDs "significantly improves Claude's precision in retrieval tasks by reducing hallucinations" [S1].

The field report reinforces this with a concrete before/after [S10, VERBATIM]:
```
MCP-B search tool returns:
{
  "id": "6a1916b48f08cb3a4c857ed0",
  "title": "buy some groceries",
  "url": "https://todo.example.com/tasks/6a1916b48f08cb3a4c857ed0"
}
-- missing project_id, forcing a second get_task_by_id call --

MCP-A query_tasks returns:
Task 1:
ID: 6a19143e8f084a8c8101612f
Title: buy some groceries
Project ID: 6a1914378f084a8c810160a9
Start Date: 2025-07-19 10:00:00
Priority: Medium
Status: Active
```
Author's own rule: *"think about what the Agent will need next, not just what it's asking for right now"* [S10].

### 5. Pagination, filtering, truncation

Claude Code caps tool responses to **25,000 tokens by default** [S1]. General rule: implement pagination/range/filter/truncation with sane defaults for anything that could balloon; if you truncate, tell the agent *how* to get more efficiently (e.g. "make many small targeted searches instead of one broad one") rather than leaving it to guess [S1].

### 6. Errors that instruct the model

Anthropic: prompt-engineer error text into "specific and actionable improvements, rather than opaque error codes or tracebacks" [S1]. MCP formalizes two channels — protocol-level JSON-RPC errors (unknown tool, bad args) vs. tool-execution errors returned as normal content with `isError: true`, which is what the model actually reads and can act on [S17, VERBATIM]:
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "content": [{"type": "text", "text": "Failed to fetch weather data: API rate limit exceeded"}],
    "isError": true
  }
}
```

### 7. Tool descriptions are prompts

Treat the description like documentation for a new hire: make implicit domain knowledge explicit (query syntax, term definitions, resource relationships) [S1]. Anthropic attributes Claude Sonnet 3.5's SWE-bench Verified SOTA partly to "precise refinements to tool descriptions, dramatically reducing error rates" [S1]. A concrete failure they caught via eval transcripts: Claude kept appending "2025" to its own web-search-tool `query` parameter, biasing results — fixed purely by rewording the tool description [S1].

### 8. Tool count vs. accuracy — the actual numbers

- Anthropic: a 5-server setup (GitHub 35 tools/~26K tok, Slack 11/~21K, Sentry 5/~3K, Grafana 5/~3K, Splunk 2/~2K) = 58 tools / ~55K tokens *before the conversation starts*; some real Anthropic internal setups hit 134K tokens pre-optimization [S3].
- With Tool Search Tool: traditional ~77K tokens consumed before work begins vs. ~8.7K with search (only 500 tokens for the search tool + ~3K for 3-5 discovered tools) — **95% of context window preserved**, an **85% reduction** overall [S3].
- Accuracy on MCP evals: Opus 4 **49%→74%**, Opus 4.5 **79.5%→88.1%** with Tool Search Tool [S3].
- GitHub MCP server: 101 tools/64.6K tokens (all-on default) → 52 tools/30.3K tokens (curated default toolsets: context, repos, issues, pull_requests, users), a 49% tool-count cut and 53% token cut [S12].
- Academic: OSWorld-MCP found giving MCP tools to agents raised task success (OpenAI o3 at 15 steps: **8.3%→20.4%**; Claude 4 Sonnet at 50 steps: **40.1%→43.3%**) but **even the strongest models only correctly invoke the right tool 36.3% of the time** — tool invocation itself, separate from GUI skill, is the bottleneck [S13].
- OSWorld-MCP methodology note: "158 high-quality tools (covering 7 common applications), each verified for correct functionality, practical applicability, and versatility" via an automated code-gen pipeline plus manual validation [S13].

### 9. Tool search / deferred loading

Mechanism [S3, VERBATIM implementation snippet]:
```json
{
  "tools": [
    {"type": "tool_search_tool_regex_20251119", "name": "tool_search_tool_regex"},
    {
      "name": "github.createPullRequest",
      "description": "Create a pull request",
      "input_schema": {...},
      "defer_loading": true
    }
  ]
}
```
For whole MCP servers [S3, VERBATIM]:
```json
{
  "type": "mcp_toolset",
  "mcp_server_name": "google-drive",
  "default_config": {"defer_loading": true},
  "configs": {
    "search_files": {"defer_loading": false}
  }
}
```
Deferred tools are **excluded from the initial prompt entirely**, so prompt caching of the system prompt + core tools is preserved — they only enter context after a search hit [S3]. Use when: tool defs >10K tokens, accuracy issues, multi-server MCP, 10+ tools. Skip when: <10 tools, all used every session, defs already compact [S3].

Counter-argument from the field: "good context engineering leaves [in context] the tools you will need so adding a search if you are going to use all of them is just more overhead" [S9].

### 10. Programmatic tool calling and Code Mode

Three converging implementations of essentially the same idea — expose tools as a code-callable surface, keep intermediate results out of the model's context:

**(a) Anthropic PTC** — Claude writes Python inside a `code_execution` sandbox; tools opt in via `allowed_callers` [S3, VERBATIM]:
```json
{
  "tools": [
    {"type": "code_execution_20250825", "name": "code_execution"},
    {
      "name": "get_team_members",
      "description": "Get all members of a department...",
      "input_schema": {...},
      "allowed_callers": ["code_execution_20250825"]
    }
  ]
}
```
Orchestration code Claude writes for a "who exceeded Q3 travel budget" task [S3, VERBATIM]:
```python
team = await get_team_members("engineering")
levels = list(set(m["level"] for m in team))
budget_results = await asyncio.gather(*[get_budget_by_level(level) for level in levels])
budgets = {level: budget for level, budget in zip(levels, budget_results)}
expenses = await asyncio.gather(*[get_expenses(m["id"], "Q3") for m in team])
exceeded = []
for member, exp in zip(team, expenses):
    budget = budgets[member["level"]]
    total = sum(e["amount"] for e in exp)
    if total > budget["travel_limit"]:
        exceeded.append({"name": member["name"], "spent": total, "limit": budget["travel_limit"]})
print(json.dumps(exceeded))
```
Result: 200KB of raw expense data collapses to ~1KB returned to Claude; overall PTC test numbers: tokens 43,588→27,297 (-37%), latency drop from eliminating 19+ inference round-trips on a 20-call workflow, knowledge-retrieval accuracy 25.6%→28.5%, GIA benchmark 46.5%→51.2% [S3].

**(b) Anthropic "Code execution with MCP"** — present MCP servers as a filesystem of typed stub files the agent explores and imports, rather than direct tool calls [S2, VERBATIM structure]:
```
servers/
├── google-drive/getDocument.ts
├── salesforce/updateRecord.ts
```
```typescript
// ./servers/google-drive/getDocument.ts
import { callMCPTool } from "../../../client.js";
export async function getDocument(input: GetDocumentInput): Promise<GetDocumentResponse> {
  return callMCPTool<GetDocumentResponse>('google_drive__get_document', input);
}
```
Google Drive→Salesforce transcript-copy task: 150,000 → 2,000 tokens (98.7% reduction) [S2]. Also demonstrates **privacy-preserving tokenization**: the MCP client can tokenize PII before it reaches the model context — `email` → `[EMAIL_1]` etc. — untokenizing only inside the sandbox when data flows to the next tool call, so the model never sees raw PII even while orchestrating it [S2, VERBATIM]:
```
[
  { "salesforceId": "00Q...", "email": "[EMAIL_1]", "phone": "[PHONE_1]", "name": "[NAME_1]" },
  ...
]
```

**(c) Cloudflare server-side Code Mode** — the *server* collapses to exactly 2 tools regardless of API size [S5, VERBATIM tool surface]:
```json
[
  {"name": "search", "description": "Search the Cloudflare OpenAPI spec. All $refs are pre-resolved inline.",
   "inputSchema": {"type":"object","properties":{"code":{"type":"string","description":"JavaScript async arrow function to search the OpenAPI spec"}},"required":["code"]}},
  {"name": "execute", "description": "Execute JavaScript code against the Cloudflare API.",
   "inputSchema": {"type":"object","properties":{"code":{"type":"string","description":"JavaScript async arrow function to execute"}},"required":["code"]}}
]
```
Cloudflare's number: 2,500+ endpoints as normal MCP tools ≈ 1.17M tokens; as Code Mode ≈ 1,000 tokens fixed, regardless of API growth — a 99.9% cut [S5]. Both tools run in a V8 isolate ("Dynamic Worker") with no filesystem, no env vars, fetch disabled by default [S5]. Cloudflare explicitly frames this against 3 alternative context-reduction strategies and states the trade-offs [S5]:
- *Client-side Code Mode* (their own earlier approach, also used by Goose and by Anthropic's PTC): requires the agent to ship a secure sandbox.
- *CLI-as-tool* (OpenClaw, Moltworker via MCPorter): "the agent needs a shell, which not every environment provides and which introduces a much broader attack surface than a sandboxed isolate."
- *Dynamic tool search* (Anthropic's Tool Search Tool in Claude Code): "requires a search function that must be maintained and evaluated, and each matched tool still uses tokens."

Field measurement independent of both vendors: a small OSS project (`agent-codemode`) measured **65,500 → 226 tokens** replacing 40 sequential MCP calls with one generated script [S19].

### 11. Idempotency, destructiveness and confirmation — the MCP annotation contract

MCP's `ToolAnnotations` (spec 2025-06-18) is the standardized poka-yoke surface for side-effect tools [S18, VERBATIM]:
```typescript
export interface ToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;       // default: false — tool does not modify environment
  destructiveHint?: boolean;    // default: true  — meaningful only if readOnlyHint==false
  idempotentHint?: boolean;     // default: false — repeat call, same args, no extra effect
  openWorldHint?: boolean;      // default: true  — interacts with an open world of entities
}
```
Critical caveat the spec itself states [S17, VERBATIM]: *"For trust & safety and security, clients **MUST** consider tool annotations to be untrusted unless they come from trusted servers."* I.e. annotations are a hint, not a security control — a malicious/compromised server can lie about `destructiveHint`. The spec's separate baseline expectation is a human-in-the-loop confirmation UI regardless [S17].

### 12. Bash/CLI as universal tool vs. many specific tools — the live debate

- Pro-CLI: "My mantra is: just use CLI tools ... `--help` mechanics are already built in so the agent can discover what commands are available" [S8].
- Counter: an MCP server is "a one stop shop for discovering tools;" a raw CLI approach makes the agent do its own web search + install step first, which is "less automated and deterministic" [S8].
- Armin Ronacher's stronger version of "one tool": expose one Python `eval()`-with-retained-state tool instead of dozens of narrow ones. His own numbers: a debug session that took ~45s across 7 tool calls dropped to <5s / 1 tool call once the working steps were saved as a reusable script and rerun [S6]. His critique of raw CLI tools specifically: they're "platform-dependent, version-dependent, and at times undocumented," models struggle with shell escaping of non-ASCII/newlines, and multi-turn shell sessions lose state ("loses track of the state of its tmux session") [S6]. Claude Code specifically adds an extra Haiku preflight safety check on shell invocations, which adds latency on every turn that needs one [S6].
- This connects directly to Anthropic Skills (chapter 06) and Agent Skills more broadly — an HN commenter's summary: "Claude Code has been iterating on this; Agent Skills are the new hotness" as the resolution of the CLI-vs-tools tension [S9].

### 13. Evaluating and iterating tool descriptions

Anthropic's loop, condensed [S1]:
1. Prototype tools, wire into a local MCP server or via direct API tool params; test manually.
2. Build an eval set from **realistic, multi-step, ambiguous** tasks (not "schedule a meeting with jane@acme.corp" — instead: "Schedule a meeting with Jane next week ... Attach the notes from our last project planning meeting and reserve a conference room" — deliberately requires disambiguation and multiple tool calls) [S1, VERBATIM examples].
3. Run with a plain agentic while-loop, one loop per task; ask the eval agent to emit reasoning/feedback blocks *before* tool calls (or turn on interleaved thinking) to expose *why* it did or didn't call a tool.
4. Track: task accuracy, per-call and total runtime, total tool-call count, total tokens, tool errors.
5. **Concatenate transcripts and hand them to Claude Code to refactor the tools itself.** Anthropic: "most of the advice in this post came from repeatedly optimizing our internal tool implementations with Claude Code," validated against held-out test sets so they didn't overfit to the "training" eval set — and this sometimes beat both human-expert tool implementations *and* Claude's own first-pass versions [S1].

## Numbers (with conditions)

| Number | Condition | Source |
|---|---|---|
| 206→72 tokens (~3×) | Slack thread response, detailed vs. concise format, Anthropic internal | S1 |
| 150,000→2,000 tokens (-98.7%) | Google Drive doc → Salesforce record update, filesystem-of-tool-stubs code execution, Anthropic | S2 |
| 1.17M→~1,000 tokens (-99.9%) | Full Cloudflare API (2,500+ endpoints) as native MCP tools vs. Code Mode `search`+`execute`, measured with tiktoken | S5 |
| 65,500→226 tokens | One agent-generated script replacing 40 sequential MCP calls, OSS `agent-codemode` project measurement | S19 |
| 55K tokens pre-chat | 5 MCP servers / 58 tools (GitHub 35, Slack 11, Sentry 5, Grafana 5, Splunk 2), Anthropic | S3 |
| up to 134K tokens | Anthropic's own internal tool defs before optimization | S3 |
| 77K→8.7K tokens (-85%, 95% context preserved) | Traditional all-upfront vs. Tool Search Tool, ~50+ MCP tools, Anthropic | S3 |
| Opus 4: 49%→74%; Opus 4.5: 79.5%→88.1% | MCP evals, Tool Search Tool on vs. off, Anthropic internal | S3 |
| 43,588→27,297 tokens (-37%) | Complex research task, Programmatic Tool Calling on vs. off, Anthropic internal | S3 |
| Knowledge retrieval 25.6%→28.5%; GIA 46.5%→51.2% | Same PTC comparison, Anthropic internal | S3 |
| 72%→90% | Complex parameter-handling accuracy, with vs. without Tool Use Examples, Anthropic internal | S3 |
| 101 tools/64.6K tok → 52 tools/30.3K tok | github-mcp-server, all-tools-default vs. curated default toolsets, Oct 2025 | S12 |
| o3: 8.3%→20.4% (15 steps); Claude 4 Sonnet: 40.1%→43.3% (50 steps); 36.3% best tool-invocation rate | OSWorld-MCP benchmark, GUI-only vs. +MCP tools, 158 tools / 7 apps | S13 |
| 4.98× input tokens, 1.34× output tokens, 1.29× agent steps, 1.13× wall time, at identical 90% pass rate | Matched MCP-A (14 tools) vs MCP-B (47 tools) for the same to-do app, 40 test prompts, same model/framework, HN field report using `mcp-eval` | S10 |
| 25,000 tokens | Claude Code's default tool-response truncation cap | S1 |
| programmatic tool calling: 38.7%→49.3% (GPT-5.2, 128k distractor context) | LOCA-bench, Feb 2026, cited in a Telegram digest (not independently opened; treat as secondhand) | S20 |

## Pitfalls, limits, criticism

- **Wrapping the API 1:1 is the most common mistake.** It produces tool sprawl and forces the agent to do multi-call joins itself, burning context and steps [S1][S10].
- **Returning raw/unfiltered API JSON** dumps irrelevant fields (`createdTime`, `focusSummaries: null`, etc.) straight into context — "these 600+ characters mean nothing to the Agent's task" [S10].
- **Too many tools increases wrong-tool and wrong-parameter selection**, independent of the raw token cost — Anthropic names `notification-send-user` vs `notification-send-channel` as a real confusable pair they saw in production [S3].
- **Tool Search Tool / dynamic discovery is not free**: it adds a search round-trip and is criticized as sometimes redundant if you'd load all the tools anyway ("more overhead") [S9]; and one competing analysis reports Anthropic's own Tool Search Tool at only ~34% selection accuracy against a much larger 2,792-tool corpus, versus a specialized retrieval product claiming 94% — numbers from a vendor blog, not an Anthropic primary source, so treat as a marketing comparison rather than a controlled benchmark (lower confidence) [secondary, flagged in Unverified].
- **Code execution shifts complexity, doesn't remove it.** Concern raised directly on HN: "if something goes wrong halfway through the code execution of multiple 'tools' ... it's significantly more complex for the AI model to fix that code and try again compared to a single tool usage" [S9].
- **Code execution has a real, demonstrated attack surface.** Check Point chained 5 bugs (URLPattern OOB read, zlib `deflateParams()` UAF, HTMLRewriter iterator UAF, a KV SQL authorization bypass, plus one more) in `workerd` into a cross-tenant secret read and a full V8-sandbox escape to native code execution, triggered starting from **prompt injection that steers the model into writing exploit-shaped TypeScript** — i.e. once you let the model write code that executes, prompt injection becomes a code-execution vector, not just a data-exfiltration one [S11].
- **CLI-as-tool has real friction**: shell escaping of non-ASCII/newlines, version/platform drift of the underlying binaries, session/state loss across turns, and (in Claude Code specifically) an added Haiku preflight-check latency tax per shell call [S6].
- **"Ubertool" (one code-exec tool) trades tool-selection error for code-generation risk** — no controlled comparison found this session; Ronacher's evidence is a single before/after anecdote (45s/7 calls → <5s/1 call after caching a script as a skill), not a benchmark [S6] — flagged as directional evidence only.
- **HN sentiment overall reads as fatigue with churn**: "We seem to be on a cycle of complexity → simplicity → complexity" (massive-scaffolding agents → simple loops → MCP → bash+filesystem → now more complex tools again), and "the AI field seems to reinvent the wheel every few months" [S9]. Read tool-design advice from any single month with that pendulum in mind.
- **Cross-link, not overlap**: attention/context-window degradation as tool-definition volume grows is a context-engineering phenomenon (chapter 02) — the LOCA-bench and "Lost in the Middle"-style numbers belong there; this chapter only needs the practical consequence (fewer/deferred/consolidated tools) [S20, cross-ref only].

## What changed in the last 6 months (since ~2026-04)

- **Cloudflare's server-side Code Mode** (Feb 20, 2026) generalized "one API, two tools" from a pattern individual devs cloned in 2025 into a vendor-hosted product covering the whole Cloudflare API, and Cloudflare has stated they're extending it to arbitrary third-party MCP servers behind their "Portal" gateway [S5].
- **Field benchmarking of MCP tool design matured**: purpose-built tools like `mcp-eval` now let practitioners A/B two MCP servers for the same backend and attribute token/step differences to specific design choices (response shaping vs. tool count) rather than guessing [S10].
- **Security research caught up to code-execution-as-tool-interface**: the first public, technically detailed exploit chain against a "let the LLM write and run code against your tools" runtime landed in Aug 2026, elevating "sandbox the code-exec environment properly" from a footnote to a first-class design requirement whenever a tool-design choice is "let the model write code" [S11].
- **OpenAI's docs moved and iterated**: guidance content now lives at `developers.openai.com` (redirected from `platform.openai.com`), with explicit strict-mode/parallel-calls trade-off language and a "fewer than 20 tools per turn, defer the rest" soft rule that reads as a direct response to the same tool-count problem Anthropic and the MCP ecosystem were documenting through 2025 [S16].
- **"Agent Skills" (chapter 06) increasingly absorbs part of what used to be tool-design's job** — reusable, on-disk, self-documenting capabilities as a third option alongside "many small tools" and "one code-exec tool," explicitly named on HN as the resolution some teams are converging on [S9].

## Diagram candidates

1. **ACI vs HCI framing** — two boxes ("Human ↔ Software" vs "Agent ↔ Tool"), arrows labeled with what's symmetric (both need clear affordances) and what differs (agent has limited/expensive context, no persistent muscle memory across sessions) [S4][S1].
2. **Tool consolidation before/after** — 3 endpoint boxes (`list_users`, `list_events`, `create_event`) collapsing into 1 workflow box (`schedule_event`), arrow labeled "fewer round trips, less context" [S1].
3. **Namespacing schemes** — one diagram showing prefix-style (`asana_search`, `jira_search`) vs suffix/resource-style (`asana_projects_search`, `asana_users_search`) as two branches from the same tool set [S1].
4. **response_format fork** — one tool call splitting into two response paths (concise 72 tok / detailed 206 tok), with an arrow from detailed's `thread_ts` field feeding a follow-up tool call [S1].
5. **Token cost staircase**: bar chart states — "all tools upfront" (~77K) → "curated defaults" (~30K, GitHub MCP case) → "tool search / defer_loading" (~8.7K) → "code execution / Code Mode" (~1-2K) — same underlying capability set, four architectures [S3][S12][S2][S5].
6. **Code execution with MCP data flow** — Agent → generated code → sandbox (calls tool A, tool B, filters/joins) → only final result → Agent's context; show the "would-be" direct-call path crossed out with the token cost labeled at each hop [S2][S3].
7. **PII tokenization flow** — Google Sheet (raw emails) → MCP client (tokenizes) → Agent sees `[EMAIL_1]` → Agent calls Salesforce tool → MCP client detokenizes → Salesforce (raw email); label the boundary "model never sees raw PII" [S2].
8. **MCP tool annotations state machine** — a tool call gated by `readOnlyHint`/`destructiveHint`/`idempotentHint`, branching to "auto-execute," "confirm with user," or "block," with a dotted line noting "annotations untrusted unless server is trusted" [S17][S18].
9. **The three 2025-11 Anthropic features layered** — Tool Search Tool (discovery) → Programmatic Tool Calling (execution) → Tool Use Examples (invocation correctness), each solving a different named bottleneck, per Anthropic's own "layer strategically" diagram-in-prose [S3].
10. **Evaluation loop** — Prototype → Generate eval tasks → Run agents (log CoT+tool calls) → Concatenate transcripts → Feed to Claude Code → Refactor tools → re-run against held-out test set (cycle arrow back to "Run agents") [S1].
11. **Bash-vs-tools-vs-code-exec triangle** — three corners (many narrow tools / one CLI shell / one code-exec "ubertool"), each edge labeled with its failure mode (tool sprawl / shell state loss & escaping / harder-to-debug multi-step scripts) [S6][S8][S9].

Chart candidates (real data series):
- Tool-count-vs-token bar chart from the staircase above (77K/30K/8.7K/1-2K) [S3][S12][S2][S5].
- OSWorld-MCP success-rate bar pairs (o3 8.3/20.4, Claude 4 Sonnet 40.1/43.3) with the 36.3% invocation-rate ceiling as a horizontal reference line [S13].
- MCP-A vs MCP-B grouped bar chart (input tokens, output tokens, steps, time — all 4 ratios from the field report table) [S10].

## Glossary

- **ACI (Agent-Computer Interface)** — the design surface between an agent and the tools/environment it acts through; Anthropic's term, by analogy to HCI [S4].
- **Poka-yoke** — error-proofing a tool's interface so a mistake becomes structurally hard to make (e.g., require absolute paths) [S4].
- **Namespacing** — grouping/prefixing tool names by service or resource to disambiguate overlapping tools [S1].
- **response_format enum** — a tool parameter letting the caller choose concise vs. detailed output shape [S1].
- **Tool Search Tool / `defer_loading`** — Anthropic mechanism to keep most tool definitions out of context until searched for [S3].
- **Programmatic Tool Calling (PTC)** — Claude writes code that calls tools inside a sandbox; only final output re-enters context [S3].
- **Code Mode** — Cloudflare's term for exposing an entire API as a typed code SDK behind `search()`/`execute()` instead of per-endpoint tools [S5].
- **Code execution with MCP** — Anthropic's near-identical pattern: MCP tools exposed as a filesystem of code stubs the agent imports/calls [S2].
- **ToolAnnotations** — MCP's `readOnlyHint`/`destructiveHint`/`idempotentHint`/`openWorldHint` metadata for gating confirmation/execution [S18].
- **Tool Use Examples (`input_examples`)** — sample tool calls attached to a tool definition to convey usage conventions schemas can't express [S3].
- **Ubertool** — Armin Ronacher's term for a single stateful code-execution tool replacing many narrow tools [S6].
- **isError** — MCP's tool-result flag distinguishing a normal (possibly failed-but-successful-protocol) tool response from a JSON-RPC protocol error [S17].

## Unverified / open questions

- Exact current default behavior of `ENABLE_TOOL_SEARCH` in Claude Code 2.1.x — found only in secondary community sources (a blog post), not confirmed against an Anthropic primary doc this session. Tried: WebFetch on Anthropic docs pages found via search; did not independently re-verify the env var name/behavior against `platform.claude.com` docs directly.
- The "Anthropic's Tool Search Tool gets only ~34% accuracy at 2,792 tools" figure and the competing "94% accuracy" claim both come from a single vendor comparison blog (Stacklok), not from Anthropic or an independent benchmark — could not cross-check the methodology or find the underlying eval set.
- LOCA-bench and PredicateLongBench (arXiv IDs quoted in the Telegram source as 2602.07962 and 2607.08284) were not opened directly this session — relayed via a secondary Telegram digest; numbers are attributed there to "measured Feb/July 2026" but I did not verify the papers exist at those exact arXiv IDs or confirm the numbers first-hand. Treat the PTC 38.7%→49.3% figure in the Numbers table accordingly.
- Could not reach Reddit (r/mcp, r/ClaudeAI, r/LocalLLaMA, r/AI_Agents) directly this session — both direct HTTPS fetch and the browser-fetch tool were blocked/failed for reddit.com, and the web-search budget for this session was exhausted before a retry could be scheduled through search-engine caching. The field-report lens is covered instead via Hacker News (with visible points/comment counts), one GitHub Discussion, one Habr article, one dev.to post, and a Russian-language Telegram channel (`t.me/s/fastnewsdev`) — all with dates and links — but a genuinely Reddit-sourced quote is missing from this file.
- Did not independently confirm whether OpenAI's "fewer than 20 functions" is still current guidance beyond the single docs page fetched on 2026-09-30 (it is a living document with no visible last-updated date).

## Sources

- [S1] Anthropic Engineering, "Writing effective tools for agents — with agents," published 2025-09-11, https://www.anthropic.com/engineering/writing-tools-for-agents, accessed 2026-09-30.
- [S2] Anthropic Engineering, "Code execution with MCP: Building more efficient agents," published 2025-11-04, https://www.anthropic.com/engineering/code-execution-with-mcp, accessed 2026-09-30.
- [S3] Anthropic Engineering, "Introducing advanced tool use on the Claude Developer Platform," published 2025-11-24, https://www.anthropic.com/engineering/advanced-tool-use, accessed 2026-09-30.
- [S4] Anthropic Research, "Building Effective Agents," published 2024-12-19, https://www.anthropic.com/research/building-effective-agents, accessed 2026-09-30 (date corroborated via HN submission timestamp 2024-12-20T03:37Z).
- [S5] Matt Carey / Cloudflare Blog, "Code Mode: give agents an entire API in 1,000 tokens," published 2026-02-20, https://blog.cloudflare.com/code-mode-mcp/, accessed 2026-09-30.
- [S6] Armin Ronacher, lucumr.pocoo.org blog post on code-execution vs. MCP tool calling ("ubertool"), published 2025-08-18, https://lucumr.pocoo.org/2025/8/18/code-mcps/, accessed 2026-09-30.
- [S7] Hacker News, "Show HN: I built an MCP server using Cloudflare's code mode pattern," thread created 2025-09-28, 87 points / 10 of 29 comments read, https://news.ycombinator.com/item?id=45405584, accessed 2026-09-30.
- [S8] Hacker News, discussion of "Code execution with MCP: Building more efficient agents," thread created 2025-11-05, 39 points / 5 comments (3 read), https://news.ycombinator.com/item?id=45818300, accessed 2026-09-30.
- [S9] Hacker News, "Claude Advanced Tool Use," thread created 2025-11-24/25, 673 points / 54 comments (top-level thread sample read), https://news.ycombinator.com/item?id=46038047, accessed 2026-09-30.
- [S10] Hacker News, "Bad MCP design costs your agent 5x more tokens" (text post with embedded benchmark table), created 2026-06-05, 17 points, https://news.ycombinator.com/item?id=48407391, accessed 2026-09-30; benchmarking tool referenced: https://github.com/Code-MonkeyZhang/mcp-eval.
- [S11] Check Point Research, "When Agentic Glue Melts: Exploiting Cloudflare Code Mode and Workers," published 2026-08-07, https://research.checkpoint.com/2026/when-agentic-glue-melts/, accessed 2026-09-30; HN discussion created 2026-08-10, 23 points, https://news.ycombinator.com/item?id=49243046.
- [S12] GitHub, github/github-mcp-server Discussion #1182, "Improving GitHub MCP Server Performance and Resource Consumption," posted 2025-10-06 by maintainer tonytrg, https://github.com/github/github-mcp-server/discussions/1182, accessed 2026-09-30.
- [S13] Jia, Liao, Zhang, Xu, Xie, Jiang, Yan, Liu, Ye, Huang, "OSWorld-MCP: Benchmarking MCP Tool Invocation in Computer-Use Agents," arXiv:2510.24563, submitted 2025-10-28, revised 2025-11-11, https://arxiv.org/abs/2510.24563, accessed 2026-09-30.
- [S14] Habr, article on designing a Memory MCP Server (architecture, SQLite, semantic search, pitfalls/"грабли"), published 2026-03-05, https://habr.com/ru/articles/1006756/, accessed 2026-09-30.
- [S15] dev.to (thedailyagent), "MCP Tool Overload: Why More Tools Make Your Agent Worse," published 2026-03-06, https://dev.to/thedailyagent/mcp-tool-overload-why-more-tools-make-your-agent-worse-5a49, accessed 2026-09-30 (secondary/uncited numbers — see Pitfalls note on confidence).
- [S16] OpenAI Developers docs, "Function calling" guide, https://developers.openai.com/api/docs/guides/function-calling (redirected from platform.openai.com/docs/guides/function-calling), living document, accessed 2026-09-30.
- [S17] Model Context Protocol specification, "Tools" (server), spec revision 2025-06-18, https://modelcontextprotocol.io/specification/2025-06-18/server/tools, accessed 2026-09-30.
- [S18] Model Context Protocol, `schema.ts`, revision 2025-06-18, `ToolAnnotations` interface, https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/main/schema/2025-06-18/schema.ts, accessed 2026-09-30.
- [S19] Telegram, "FastNews | Никита Пастухов," post https://t.me/fastnewsdev/385, published 2026-08-23, https://t.me/s/fastnewsdev, accessed 2026-09-30.
- [S20] Telegram, "FastNews | Никита Пастухов," post https://t.me/fastnewsdev/389 ("Хватит нести бред про миллион токенов"), published 2026-09-03, https://t.me/s/fastnewsdev, accessed 2026-09-30 (relays arXiv figures not independently verified — see Unverified).
