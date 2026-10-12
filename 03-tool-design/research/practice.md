# Глава 03. Проектирование инструментов агента — практические заметки (ENGINEERING PRACTICE lens)

## TL;DR (must-knows for 2026)

- Tools are not "functions with schemas" — Anthropic frames them as **a contract between a deterministic system and a non-deterministic agent**; the discipline is called **ACI (agent-computer interface)**, deliberately parallel to HCI [S1][S10].
- The single highest-leverage move is **writing extremely detailed tool descriptions** — Anthropic's own current docs (Sept 2026) call this "by far the most important factor in tool performance," recommending 3-4+ sentences per tool [S13].
- **Fewer, more capable tools beat many narrow ones.** Consolidate multi-call workflows into one tool (`schedule_event` vs `list_users`+`list_events`+`create_event`); OpenAI's parallel advice: combine functions that are always called sequentially [S1][S9].
- **Context is the scarce resource, not correctness alone.** Three vendor-measured techniques cut tool-definition and result tokens: Tool Search / deferred loading (~85% context reduction, Opus 4 accuracy 49%→74% on a 200+ tool eval) [S4]; Programmatic (code-executed) tool calling (37% token reduction on complex research tasks) [S4]; code-execution-with-MCP / Code Mode turning MCP servers into a filesystem/API agents write code against (98.7% and 99.9% token reductions measured) [S2][S3].
- **Accuracy degrades measurably as tool count grows**: Claude Haiku 4.5 91%→87% going from 10 to 15 tools in one context (independent practitioner benchmark) [S11]; toolkit expansion (2.7→5.6 avg functions) cost 1-8% accuracy across GPT-4o-mini/Claude-3.5-Sonnet/Llama3.3-70B/Qwen2.5-72B in an IBM Research robustness study [S12]. OpenAI's own soft guidance: **keep it under ~20 functions active in a turn** [S9].
- **Semantic identifiers beat opaque ones.** Returning `name` instead of `uuid`, `file_type` instead of `mime_type` "significantly improves Claude's precision... by reducing hallucinations" [S1].
- **Response format is a real design axis**, not an afterthought: Anthropic measured a Slack-thread example at 206 tokens (detailed, with IDs) vs 72 tokens (concise, content-only) — offer a `response_format: concise|detailed` enum when downstream tool calls need IDs [S1].
- **Errors are prompts, not exceptions.** Write error strings that tell the model what to do next ("Rate limit exceeded. Retry after 60 seconds.") rather than a stack trace or bare "failed" [S1][S13].
- **Poka-yoke your parameters**: change the tool's arguments so mistakes are structurally impossible — Anthropic's canonical example is forcing absolute file paths after the model kept failing with relative ones, which "flawlessly" fixed the SWE-bench agent [S10].
- **Strict/schema-constrained tool calling is now the default recommendation on both major APIs** — Anthropic's `strict: true` (grammar-constrained sampling) and OpenAI's `strict: true` (additionalProperties:false, all fields required) eliminate malformed tool_use inputs at the sampling level, not via validation-and-retry [S9][S_strict].
- **Tool descriptions are optimized with agents, not just by hand**: Anthropic's own workflow is prototype → build an evaluation harness with realistic multi-step tasks → paste failing transcripts into Claude Code and have it rewrite the tools → re-run on a held-out set [S1]. Anthropic's multi-agent research system used a dedicated **tool-testing subagent** that used a flawed tool repeatedly and rewrote its description, cutting downstream task completion time by 40% [S7].
- **"Bash + a filesystem" is a live minimalist counter-trend** to dozens of bespoke MCP tools: the Pi agent (Mario Zechner / Armin Ronacher) ships only four tools — Read, Write, Edit, Bash — with a sub-1,000-token system prompt, versus ~7,000-10,000 tokens for Cline/OpenCode/Claude Code, and leans on CLI tools with README files read on demand [S8].
- **MCP tool annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`) exist precisely to drive confirmation UX** for side-effecting tools, and the spec's default posture is conservative: unannotated = assume not read-only, potentially destructive, not idempotent [S5].
- Real production MCP servers keep failing on the same seven things: schema over-fit, auth bolted on after launch, "god tools", chatty request patterns, missing error discrimination, untyped parameter blobs, and **no audit/dry-run gate on destructive tools** (ranked the single worst anti-pattern) [S6].

## Current state and versions (as of 2026-09-30)

- **Anthropic Claude Developer Platform / Claude API** (docs read live, current default models referenced: `claude-opus-5-5`, `claude-sonnet-5-5`, and specialty model lines `claude-fable-5.1`, `claude-mythos-5.1`) ships, as first-class tool-definition features [S13][S_strict][S4]:
  - `strict: true` per tool → grammar-constrained sampling guarantees schema-valid `input`.
  - `input_examples`: an array of example input objects on a tool definition (separate from the JSON Schema), costing ~20-50 tokens per simple example / ~100-200 for complex nested ones; not supported on server tools or the computer-use/browser-use toolsets.
  - `defer_loading: true` + a `tool_search_tool_*` entry → Tool Search Tool: tools aren't expanded into the system-prompt prefix until Claude searches for them; prompt-cache prefix is untouched.
  - `allowed_callers: ["code_execution_20250825"]` + a `code_execution` tool → Programmatic Tool Calling: Claude writes Python that calls tools inside a sandboxed code-execution container; intermediate results stay out of the transcript.
  - `tool_choice`: `auto` / `any` / `tool` / `none`; forced tool use (`any`/`tool`) is **not supported** on `claude-opus-5.5`, `claude-sonnet-5.5`, `claude-fable-5.1`, `claude-mythos-5.1` — use `auto` + strict tools or structured outputs instead [S13].
  - `is_error: true` on `tool_result` blocks for execution failures; Claude retries 2-3 times on invalid/missing-parameter tool calls before giving up [S13].
- **OpenAI Responses/Chat Completions API**: `strict: true` function calling (production-recommended), `parallel_tool_calls`, `tool_choice` (`auto`/`required`/`none`/named/`allowed_tools` subset), and a Tool Search-equivalent for deferred loading; official soft cap "fewer than 20 functions" active per turn [S9].
- **Azure OpenAI (Foundry) Responses API** shipped its own `tool_search` primitive (`ms.date: 2026-07-15`), supporting both hosted (server picks tools) and client-executed (app controls discovery) modes, `namespace` grouping, and an explicit tip: **"keep each namespace to fewer than 10 functions"** [S_azure].
- **Cloudflare** ships a production MCP server for its entire API using **Code Mode**: two tools only, `search()` and `execute()`, running generated JS in a sandboxed "Dynamic Worker" V8 isolate (no filesystem, no env vars, fetches disabled by default) — published Feb 20, 2026, claiming 1.17M→~1,000 tokens (99.9%) [S3].
- **MCP spec**: the `2025-06-18` revision is the one documenting today's tool annotations (`readOnlyHint`/`destructiveHint`/`idempotentHint`/`openWorldHint`) and `outputSchema` [S5]; a **2026-07-28** revision ("Stateless MCP") removed server-side session state from the transport layer — described by Simon Willison as the biggest spec change since MCP's launch (protocol-layer, cross-link to ch.05) [S_stateless].

## Timeline

- **2024-12-19** — Anthropic, "Building Effective Agents," Appendix 2 "Prompt Engineering your Tools": ACI framing, poka-yoke, absolute-path SWE-bench example [S10].
- **2025-06-14** (Anthropic post date; covered same day by Simon Willison) — "How we built our multi-agent research system": tool-testing subagent, 40% task-completion-time cut from better tool descriptions [S7].
- **2025-09-11** — Anthropic, "Writing effective tools for AI agents — with agents": the main ACI playbook — prototype/evaluate/optimize loop, consolidation, namespacing, response shaping, 206→72 token example, `ResponseFormat` enum, 25,000-token default truncation in Claude Code [S1].
- **2025-11-04** — Anthropic, "Code execution with MCP: Building more efficient agents": agents write code against MCP tools exposed as a TS filesystem API; Google Drive→Salesforce example, 150,000→2,000 tokens (98.7%) [S2].
- **2025-11-05** — Daniel Miessler, commentary: reframes this as Anthropic quietly downgrading MCP tool-calls in favor of filesystem/"skills"-style code access [S_miessler].
- **2025-11-19/24** — Anthropic, "Advanced Tool Use": Tool Search Tool (`tool_search_tool_regex_20251119`), Programmatic Tool Calling (`code_execution_20250825`), Tool Use Examples shipped as betas/GA on the Claude Developer Platform [S4].
- **2026-02-20** — Cloudflare, "Code Mode: give agents an entire API in 1,000 tokens": productionizes the code-execution pattern for its own API as a 2-tool MCP server [S3].
- **2026-05-06** — practitioner post cataloguing "Seven MCP server anti-patterns" with a severity ranking (audit gates on destructive tools ranked worst) [S6].
- **2026-07-07** — practitioner post, "Five MCP server patterns," with the measured Haiku 4.5 10-tools/91% vs 15-tools/87% accuracy drop and the "keep a context near 10 tools" rule of thumb [S11].
- **2026-07-15** — Microsoft Learn publishes Azure OpenAI Responses API `tool_search` docs (hosted + client-executed modes) [S_azure].
- **2026-07-28** — MCP spec "Stateless MCP" revision [S_stateless].
- **2026-09-30 (docs as currently live)** — Claude Platform Docs show `strict`, `input_examples`, `defer_loading`, `allowed_callers` as stable, documented tool-definition fields, with forced tool use explicitly disabled on the newest model family in favor of strict/structured alternatives [S13][S_strict].

## Mechanics

### 1. ACI and the three-phase methodology (Anthropic) [S1]

Philosophy: "Tools are a new kind of software which reflects a contract between deterministic systems and non-deterministic agents." Re-orient from predictable software-engineering patterns to designing for a reasoning, sometimes-wrong caller.

**Phase 1 — Prototype**: wrap the API in a local MCP server or desktop extension, feed Claude Code the relevant docs (including `llms.txt` if the target service has one), connect with `claude mcp add <name> <command> [args...]`, and do quick manual passes to find rough edges.

**Phase 2 — Evaluate**: build realistic, multi-step evaluation tasks grounded in real workflows, not narrow unit tests. Contrast given in the source (COMPOSED by Anthropic, not by us):

- Strong: *"Customer Sarah Chen just submitted a cancellation request. Prepare a retention offer. Determine: (1) why they're leaving, (2) what retention offer would be most compelling, and (3) any risk factors we should be aware of before making an offer."*
- Weak: *"Find the cancellation request by Customer ID 45892."*

Run evals with a plain agentic while-loop against the raw API, with reasoning/feedback prompted explicitly (or interleaved thinking) so transcripts are legible. Track accuracy, runtime, tool-call count, token consumption, error rate. Anthropic's own debugging example: the model was "needlessly appending `2025` to the tool's `query` parameter, biasing search results."

**Phase 3 — Optimize with agents**: concatenate failing eval transcripts and paste them into Claude Code; let Claude refactor the tool set for self-consistency; validate on a **held-out** test set to avoid overfitting to the eval tasks themselves. Anthropic reports this iterative, agent-assisted process beat expert hand-written Slack/Asana tool implementations.

### 2. Consolidation, namespacing, naming [S1][S13][S11]

- Prefer `search_contacts`/`message_contact` over `list_contacts` — agents pay a context tax for irrelevant rows a human would just scroll past.
- Fold multi-step workflows into one tool: `schedule_event` (find availability + book) instead of `list_users`+`list_events`+`create_event`; `get_customer_context` instead of separate `get_customer_by_id`+`list_transactions`+`list_notes`; `search_logs` (with context lines) instead of a generic `read_logs`.
- Current Claude docs restate this as a first-class rule: *"Consolidate related operations into fewer tools... group them into a single tool with an `action` parameter"* (e.g., one tool with `action: create_pr|review_pr|merge_pr` rather than three tools) [S13].
- Namespacing (`asana_search` vs `asana_projects_search`, prefix vs suffix) reduces ambiguity once an agent is wired to "dozens of MCP servers and hundreds of tools" — Anthropic explicitly says effects are model-dependent and to validate with your own evals [S1]. Current Claude docs make namespacing near-mandatory once Tool Search is in play: *"especially important when using tool search"* [S13].
- Empirical ceiling: independent measurement shows Claude Haiku 4.5 tool-selection accuracy falling from 91% (10 tools) to 87% (15 tools) in a single context; the practitioner rule-of-thumb offered is **"keep a single context near 10 tools"**, pushing overflow into a Proxy-Aggregator pattern that retrieves only relevant tools per request [S11].

### 3. Descriptions as prompts [S1][S13][S9]

Anthropic: *"Think of how you would describe your tool to a new hire on your team"* — spell out niche terminology, relationships between resources, and what's out of scope [S1]. Current Claude docs formalize this with a good/bad example pair (VERBATIM, [S13]):

```json
// Good
{
  "name": "get_stock_price",
  "description": "Retrieves the current stock price for a given ticker symbol. The ticker symbol must be a valid symbol for a publicly traded company on a major US stock exchange like NYSE or NASDAQ. The tool will return the latest trade price in USD. It should be used when the user asks about the current or most recent price of a specific stock. It will not provide any other information about the stock or company.",
  "input_schema": {
    "type": "object",
    "properties": {
      "ticker": {"type": "string", "description": "The stock ticker symbol, e.g. AAPL for Apple Inc."}
    },
    "required": ["ticker"]
  }
}
// Poor
{
  "name": "get_stock_price",
  "description": "Gets the stock price for a ticker.",
  "input_schema": {"type": "object", "properties": {"ticker": {"type": "string"}}, "required": ["ticker"]}
}
```

Guidance: aim for **3-4+ sentences per tool description**, stating what it does, when to use/not use it, what each parameter means, and any caveats about what data it does *not* return [S13].

OpenAI's parallel framing: the model selects on the **description**, not the function name; state purpose, each parameter's meaning/format, and what the output represents; apply the **"intern test"** — could a new intern use this tool correctly with only the docs you wrote? [S9]

Measured impact of description quality: Anthropic reports Claude Sonnet 3.5 reached SOTA on SWE-bench Verified largely off "precise refinements to tool descriptions," and the multi-agent research system's tool-testing subagent produced a **40% decrease in task completion time** for later agents using its rewritten description [S1][S7].

### 4. Parameter design and poka-yoke [S10][S1][S9]

- Poka-yoke ("mistake-proofing," borrowed from manufacturing/Toyota): *"Change the arguments so that it is harder to make mistakes."* Canonical example: a SWE-bench file-editing tool kept failing once the agent `cd`'d out of the repo root and used relative paths; switching the tool to **require absolute paths only** fixed it completely [S10].
- Use unambiguous parameter names — `user_id` not `user` — to make implicit context explicit and cut cognitive load [S1].
- OpenAI: use enums/structured objects to make invalid states unrepresentable; don't ask the model to fill in arguments your own code already knows (e.g., a user ID your backend already has from auth) [S9].
- `input_examples` (Claude) exist specifically for schema features JSON Schema can't express well — optional-parameter combinations, format conventions — shown as three example calls (full/partial/minimal spec) that raised **accuracy on complex parameter handling from 72% to 90%** [S4]. VERBATIM shape [S13]:

```json
"input_examples": [
  {"location": "San Francisco, CA", "unit": "fahrenheit"},
  {"location": "Tokyo, Japan", "unit": "celsius"},
  {"location": "New York, NY"}
]
```

### 5. Response shaping: concise vs detailed, semantic vs opaque [S1]

- Avoid returning `uuid`, `256px_image_url`, `mime_type`; return `name`, `image_url`, `file_type` — "merely resolving arbitrary alphanumeric UUIDs to more semantically meaningful... language... significantly improves Claude's precision in retrieval tasks by reducing hallucinations."
- When downstream tool calls genuinely need the technical ID, expose both via a response-format switch:

```
enum ResponseFormat { DETAILED = "detailed", CONCISE = "concise" }
```
(COMPOSED shape per [S1]'s description; the enum values themselves are quoted from the source.)

- Measured trade-off on a Slack-thread tool: **detailed response ≈ 206 tokens** (includes `thread_ts`, `channel_id`, `user_id`, full content) vs **concise response ≈ 72 tokens** (content only) — concise uses roughly ⅓ the tokens for pure knowledge-retrieval tasks but loses the IDs a follow-up tool call might need [S1].
- Current Claude docs generalize this into a standing rule: *"Design tool responses to return only high-signal information... Bloated responses waste context and make it harder for Claude to extract what matters"* [S13].
- Anthropic explicitly declines to declare a winner between XML/JSON/Markdown response formats — "select the best response structure based on your own evaluation" [S1].

### 6. Errors that instruct the model [S1][S13]

- Generic error codes/tracebacks are a documented anti-pattern; **error text is instruction text** for the next model turn.
- VERBATIM guidance from current Claude docs: *"Write instructive error messages. Instead of generic errors like `"failed"`, include what went wrong and what Claude should try next (for example, `"Rate limit exceeded. Retry after 60 seconds."`)"* [S13].
- VERBATIM `tool_result` error shape [S13]:
```json
{
  "role": "user",
  "content": [
    {
      "type": "tool_result",
      "tool_use_id": "toolu_01A09q90qw90lq917835lq9",
      "content": "ConnectionError: the weather service API is not available (HTTP 500)",
      "is_error": true
    }
  ]
}
```
- Claude retries invalid/missing-parameter tool calls **2-3 times** with self-corrections before giving up and apologizing to the user — a concrete number worth designing error strings around [S13]. `strict: true` removes this failure mode entirely for schema violations (see §9).

### 7. Pagination, filtering, truncation [S1]

- Anthropic (Claude Code default): **tool responses truncated at 25,000 tokens**. When truncating, the tool must *say* it truncated and steer the agent toward a fix (narrower filter, pagination cursor, better query) rather than silently dropping data.
- General pattern: implement pagination with sensible defaults, support range selection, add filtering parameters, and consider proactively telling the agent in the tool description to prefer many small targeted calls over one broad one for retrieval-style tasks.

### 8. Tool count, definition size, and measured accuracy/cost effects

| Finding | Numbers | Conditions | Source |
|---|---|---|---|
| Tool Search Tool vs. loading everything upfront | ~77K → ~8.7K tokens before work begins (≈85% reduction, ~95% of context preserved) | Anthropic's internal "many tools" eval | [S4] |
| Same feature, accuracy | Opus 4: 49%→74%; Opus 4.5: 79.5%→88.1% | Anthropic's internal eval, large tool library | [S4] |
| Programmatic Tool Calling | 43,588→27,297 tokens (37% reduction) | complex research tasks | [S4] |
| Programmatic Tool Calling, accuracy | internal knowledge retrieval 25.6%→28.5%; "GIA" benchmark 46.5%→51.2% | Anthropic-reported | [S4] |
| Tool Use Examples | 72%→90% accuracy | "complex parameter handling" eval | [S4] |
| Code execution w/ MCP | 150,000→2,000 tokens (98.7% reduction) | Google Drive→Salesforce transcript-copy workflow | [S2] |
| Cloudflare Code Mode | 1.17M→~1,000 tokens (99.9% reduction) | full Cloudflare API surface as one MCP server | [S3] |
| Tool count vs. selection accuracy | 91%→87% | Claude Haiku 4.5, 10 vs 15 tools in one context | [S11] |
| Toolkit expansion robustness | avg toolkit 2.7→5.6 functions; 1-8% accuracy drop across models | GPT-4o-mini, Claude-3.5-Sonnet, Llama3.3-70B, Qwen2.5-72B; BFCL-derived benchmark, IBM Research | [S12] |
| Query rephrasing robustness (same paper) | 8-19% accuracy drop, but 70-90% attributed to eval-methodology (exact-match) artifacts, not real agent errors | same paper | [S12] |
| Soft tool-count ceiling | "fewer than 20 functions" active per turn (soft) | OpenAI official guidance | [S9] |
| Namespace-size guidance | "fewer than 10 functions" per namespace for token efficiency and model performance | Azure OpenAI Responses API tool_search docs | [S_azure] |

Takeaway for the book: there is no single agreed number, but every vendor/measurement converges on the same shape — **single-digit-to-teens tool count per active context is the safe zone**; beyond that, reach for deferred loading / namespacing / code-execution rather than just adding more tools.

### 9. Strict schemas [S_strict][S9]

Claude `strict: true` uses **grammar-constrained sampling** (same pipeline as structured outputs) to make schema violations structurally impossible rather than caught after the fact. VERBATIM tool definition [S_strict]:

```json
{
  "name": "get_weather",
  "description": "Get the current weather in a given location",
  "strict": true,
  "input_schema": {
    "type": "object",
    "properties": {
      "location": {"type": "string", "description": "The city and state, e.g. San Francisco, CA"},
      "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]}
    },
    "required": ["location"],
    "additionalProperties": false
  }
}
```
Caveat: strict tool schemas are cached up to 24h server-side outside normal PHI protections — do not put PHI in schema property names/enums/patterns [S_strict].

OpenAI's `strict: true` mirrors this (requires `additionalProperties: false`, all properties `required`, optional fields typed as `["string","null"]`) and reports **gpt-4o with Structured Outputs at 100% complex-schema adherence vs <40% for older models without it** [S9].

### 10. Idempotency and confirmation for side effects [S5][S6]

MCP tool annotations (spec `2025-06-18`) [S5]:
- `readOnlyHint` (default `false`): tool does not modify environment.
- `destructiveHint` (default `true`, meaningful only if not read-only): may irreversibly destroy/overwrite data.
- `idempotentHint` (default `false`, meaningful only if not read-only): repeat calls with same args have no additional effect.
- `openWorldHint`: tool interacts with an open/external world (vs a closed, enumerable one).
- Spec explicitly says clients **MUST treat annotations as untrusted unless from a trusted server** — they're hints for UX/confirmation, not a security boundary.
- Cautious default posture: no annotations = assume "not read-only, potentially destructive, not idempotent."

Practitioner framing: **"No audit gates on destructive tools"** (e.g., `delete_record()`, `send_email()` firing with no confirmation, dry-run, or replay log) is ranked the single worst production MCP anti-pattern (severity 96/100 in one blast-radius ranking); fix = `dry_run: true` mode + mandatory audit logging + explicit approval gates named directly in the tool description [S6].

### 11. Consolidating endpoints into workflow tools — see §2; cross-reference [S1][S13].

### 12. Bash/CLI as universal tool vs many specific tools [S8]

Two live philosophies in 2026, both defensible, trade-off is token/context economy vs. structured safety:
- **Many narrow MCP tools** (Anthropic's default playbook, §1-§7 above): safer per-call surface, better annotations/confirmation story, but pays a fixed context cost per tool and needs active curation against sprawl.
- **Minimalist CLI-via-Bash**: Pi (Mario Zechner, with Armin Ronacher) ships exactly **Read, Write, Edit, Bash** and a system prompt under 1,000 tokens (vs ~7,000-10,000 for Cline/OpenCode/Claude Code); capability is delivered as CLI tools with README files the agent reads on demand via Bash, so tokens are spent only when a capability is actually used, not on every turn [S8]. Ronacher separately argues that "if you have anything that remotely looks like an interactive system," give the agent Tmux-style terminal access rather than a bespoke tool [S8].
- Shared-state design lesson from the same source: give tools (e.g., `ExecuteCode`, `RunInference`) a **common file system** to read/write through, so outputs from one feed inputs to another without round-tripping through the model context — same idea as code-execution-with-MCP's "write results to files, not to context" (§ code mode) [S8][S2].
- Reported failure mode even in this minimalist design: a **dedicated "output" tool** was "surprisingly hard to steer" for wording/tone versus just letting the main loop emit text directly, and sometimes the agent simply forgot to call it, needing a reinforcement message [S8] — a caution against assuming a tool is easier to control than free text.

### 13. Programmatic tool calling and Code Mode — mechanics [S2][S3][S4]

Core idea across all three implementations (Anthropic's "code execution with MCP," Anthropic's "Programmatic Tool Calling," Cloudflare's "Code Mode"): stop making the model orchestrate tool calls one at a time through its own context; have it **write code** that calls tools as normal function/API calls, run that code in a sandbox, and only surface the *final* result to the model.

VERBATIM tool-as-code-file shape (Anthropic, code execution with MCP) [S2]:
```typescript
// ./servers/google-drive/getDocument.ts
import { callMCPTool } from "../../../client.js";

interface GetDocumentInput { documentId: string; }
interface GetDocumentResponse { content: string; }

/* Read a document from Google Drive */
export async function getDocument(input: GetDocumentInput): Promise<GetDocumentResponse> {
  return callMCPTool<GetDocumentResponse>('google_drive__get_document', input);
}
```
Agent-written orchestration code (VERBATIM, [S2]):
```typescript
import * as gdrive from './servers/google-drive';
import * as salesforce from './servers/salesforce';

const transcript = (await gdrive.getDocument({ documentId: 'abc123' })).content;
await salesforce.updateRecord({
  objectType: 'SalesMeeting',
  recordId: '00Q5f000001abcXYZ',
  data: { Notes: transcript }
});
```
This alone is the 150,000→2,000-token move: the transcript never has to re-enter model context to travel from one tool to the other [S2].

Privacy side-benefit documented in the same source: intermediate values can be **tokenized before the model ever sees them** — real emails/phones flow Sheets→Salesforce while the model only sees `[EMAIL_1]`, `[PHONE_1]` placeholders [S2].

Cloudflare's two-tool pattern for exposing an entire OpenAPI surface (VERBATIM description) [S3]: `search()` — *"Search the Cloudflare OpenAPI spec. All $refs are pre-resolved inline."* — and `execute()` — *"Execute JavaScript code against the Cloudflare API."* Both run inside "a lightweight V8 sandbox with no file system, no environment variables to leak through prompt injection and external fetches disabled by default" [S3].

Anthropic's server-side equivalent, Programmatic Tool Calling, opts individual tools in via `allowed_callers` rather than restructuring the whole server as code (VERBATIM) [S4]:
```json
{
  "tools": [
    {"type": "code_execution_20250825", "name": "code_execution"},
    {
      "name": "get_team_members",
      "description": "Get all members of a department...",
      "input_schema": {"...": "..."},
      "allowed_callers": ["code_execution_20250825"]
    }
  ]
}
```

Operational cost of all three: you now need a real sandboxing story (resource limits, no ambient filesystem/env leakage, monitoring) — Anthropic explicitly flags this trade-off rather than presenting code execution as free [S2].

### 14. Tool Search / deferred loading — cross-vendor mechanics

Anthropic (VERBATIM shape) [S4]:
```json
{
  "tools": [
    {"type": "tool_search_tool_regex_20251119", "name": "tool_search_tool_regex"},
    {"name": "github.createPullRequest", "description": "Create a pull request", "input_schema": {"...": "..."}, "defer_loading": true}
  ]
}
```
Azure OpenAI's version additionally supports **namespace-level** and **MCP-server-level** deferral, and both a **hosted** mode (server decides what to load) and a **client-executed** mode (app decides, useful when candidate tools depend on runtime/tenant state) [S_azure]. VERBATIM namespace example [S_azure]:
```json
{
  "tools": [
    {
      "type": "namespace", "name": "crm",
      "description": "CRM tools for customer lookup and order management.",
      "tools": [
        {"type": "function", "name": "list_open_orders", "description": "List open orders for a customer ID.",
         "defer_loading": true,
         "parameters": {"type": "object", "properties": {"customer_id": {"type": "string"}}, "required": ["customer_id"], "additionalProperties": false}}
      ]
    },
    {"type": "tool_search"}
  ]
}
```
Design rule stated by Azure docs: prefer deferring whole **namespaces/MCP servers** over individual functions — models are "primarily trained to search these surfaces" and it yields bigger token savings; keep each namespace under ~10 functions [S_azure]. Both vendors place newly-loaded tool definitions **at the end of context** specifically to preserve prompt-cache prefixes [S4][S_azure].

### 15. Parallel tool calls [S13][S9]

- Claude: a single assistant turn can contain multiple `tool_use` blocks; when replying you must return all corresponding `tool_result` blocks, tool_result blocks must come first in the content array (any trailing text after), and they must immediately follow the tool_use turn with no messages in between — violating this raises a 400 error [S13].
- OpenAI: `parallel_tool_calls` toggles whether the model may return more than one function call per turn; set to `false` when calls have ordering dependencies (tool B needs tool A's result) since parallel execution "misfires" in that case [S9].
- Anthropic's multi-agent research system explicitly instructs subagents: *"For maximum efficiency, whenever you need to perform multiple independent operations, invoke all relevant tools simultaneously rather than sequentially"* [S7] — parallelism is a prompted behavior as much as an API flag.

### 16. Evaluating and iterating tool design [S1][S7]

Two concrete, reusable recipes surfaced in the sources:
1. **Eval-harness loop** (Anthropic's general playbook, §1): multi-step realistic tasks → programmatic agent runs → inspect transcripts for silent inefficiencies → feed transcripts to Claude Code to rewrite tools → re-run on held-out tasks [S1].
2. **Dedicated tool-testing subagent** (Anthropic's multi-agent research system): spin up an agent whose only job is to hammer one (possibly flawed) tool, observe where it fails, and rewrite that tool's description — measured 40% task-completion-time improvement downstream [S7].

## Numbers (consolidated, with conditions — see also §8 table)

- 206 tokens (detailed) vs 72 tokens (concise) — same Slack-thread content, Anthropic-authored example [S1].
- 25,000 tokens — Claude Code's default tool-response truncation limit [S1].
- 85% context reduction, 95% context window preserved — Tool Search Tool, Anthropic internal eval [S4].
- 49%→74% (Opus 4) and 79.5%→88.1% (Opus 4.5) — Tool Search Tool accuracy on a large-tool-library eval [S4].
- 43,588→27,297 tokens (37% cut) — Programmatic Tool Calling, "complex research tasks" [S4].
- 25.6%→28.5% and 46.5%→51.2% — Programmatic Tool Calling accuracy on internal knowledge-retrieval and "GIA" benchmarks respectively [S4].
- 72%→90% — Tool Use Examples, "complex parameter handling" eval [S4].
- 150,000→2,000 tokens (98.7%) — code execution with MCP, Drive→Salesforce case [S2].
- 1.17M→~1,000 tokens (99.9%) — Cloudflare Code Mode, whole-API MCP server [S3].
- 91%→87% — Claude Haiku 4.5 tool-selection accuracy, 10 vs 15 tools in context, independent practitioner test [S11].
- 2.7→5.6 avg functions per case; 1-8% accuracy drop — BFCL-derived toolkit-expansion robustness study, 4 models, IBM Research [S12].
- <40% → 100% complex-schema adherence — GPT-4o with vs without OpenAI Structured Outputs, per OpenAI's own evaluation [S9].
- ~7,000-10,000 tokens (typical coding-agent system prompt) vs <1,000 tokens (Pi) — practitioner comparison, 2026 [S8].
- 40% decrease in downstream task completion time — after a tool-testing subagent rewrote a flawed tool's description [S7].
- 200-400ms per call (stdio + remote round-trip overhead); >5 calls/turn flagged as "chatty" — practitioner MCP anti-pattern post [S6].

## Pitfalls, limits, criticism

- **God tools**: one mega-tool branching over many operations the model can't reason about — split into single-intent tools with tight schemas [S6].
- **Schema over-fit**: hyper-specific descriptions/too many required fields/enum mismatches cause outright refusal or hallucinated matches — loosen constraints, default optional fields, use enums sparingly [S6].
- **Auth retrofitted after launch**: bolting auth on post-hoc breaks already-deployed clients; decide the trust boundary (stdio-local / scoped-remote / multi-tenant) on day one [S6].
- **Chatty protocols**: >5 tool calls per user turn at 200-400ms per round trip is a red flag; fix by batching parameters and collapsing list-then-get pairs [S6].
- **Missing error discrimination**: collapsing validation errors, timeouts, and permission denials into one generic failure prevents the model from choosing a sane recovery strategy [S6][S1].
- **Omnibus parameter blobs** (`Record<string, unknown>`): defeats schema-level validation entirely; use named optional fields instead [S6].
- **No audit gates on destructive tools** — ranked the worst anti-pattern (severity 96/100) precisely because it produces irreversible, customer-visible damage with no recovery path [S6].
- **Token/credential over-scoping**: MCP servers configured with the broadest available credential ("because it just works") instead of a scoped role, e.g. full read/write DB connection strings [search-derived, needs primary-source verification — see Unverified].
- **Token passthrough** is an explicit MCP security anti-pattern: forwarding a client-supplied token to a downstream API without validating it was issued *for that server* [search-derived, see Unverified].
- **Tool count is not free even below "the ceiling"**: independent measurement shows accuracy already softening from 10→15 tools for a small/fast model (Haiku 4.5); vendor guidance of "<20" or "<10 per namespace" should be read as soft, model-dependent ceilings, not safe minimums to build up to [S9][S11][S_azure].
- **Code execution / Code Mode is not a free lunch**: it requires a genuine sandboxing investment (no ambient FS/env access, resource limits, monitoring, injection hardening) — Anthropic states this trade-off explicitly rather than treating code-execution as strictly better [S2][S3].
- **Skeptical take on MCP itself**: Simon Willison's Sept 2026 position is that MCP has "almost no reason" to exist for a fully permissive terminal-agent setup with unfettered internet access — its real value is scoped access control, centralized auth, discoverable UI, and audit logging for *less* permissive deployments, not raw capability [S_willison_mcp]. Countervailing, more critical HN-linked framing exists too ("MCP was always a bad idea?") which Willison is explicitly responding to [S_willison_mcp].
- **MCP tool annotations are hints, not guarantees**: the spec itself requires clients to treat annotations from untrusted servers as untrusted — do not build a security model on `destructiveHint`/`readOnlyHint` alone [S5].
- Anthropic explicitly declines to give one universal answer on response format (XML/JSON/Markdown) or namespace prefix-vs-suffix — both are stated as "validate with your own evals," which is a limit on how far generic advice travels [S1].

## What changed in the last 6 months (since ~2026-04)

- **Tool Search Tool and Programmatic Tool Calling moved from beta framing to documented, numbered-feature status** on the Claude Developer Platform, with GA-style docs pages (`define-tools`, `strict-tool-use`, `handle-tool-calls`) as of the Sept 2026 docs snapshot read for this chapter [S13][S_strict].
- **Tool Search reached a second major vendor**: Azure OpenAI shipped its own `tool_search` for the Responses API (docs dated 2026-07-15), with a client-executed mode Anthropic's current implementation doesn't expose the same way [S_azure].
- **Code Mode went from Anthropic's own pattern-of-the-month to Cloudflare shipping it in production** for their entire API surface as a 2-tool MCP server (Feb 2026) [S3].
- **MCP had its "most significant spec change since launch"**: the July 2026 stateless revision, which simplifies client/server implementation (single request instead of session-init + session-bound calls) — protocol-layer, but changes the baseline complexity of building any MCP-based tool server (cross-link ch.05) [S_stateless].
- **Forced tool use (`tool_choice: any/tool`) was dropped on the newest Claude model family** (`claude-opus-5.5`, `claude-sonnet-5.5`, `claude-fable-5.1`, `claude-mythos-5.1`) in favor of `auto` + strict tool schemas or structured outputs — a real API-shape change engineers relying on forced tool_choice need to know about [S13].
- **A visible minimalist counter-current gained traction**: the Pi coding agent (4 tools total) is cited as going from 54k to 98k GitHub stars in three months in 2026, evidence that "fewer, more general tools + Bash" is a live, popular alternative to the "many specific MCP tools" default [S8].

## Diagram candidates

1. **ACI contract diagram**: Deterministic system ↔ Tool (contract: name, description, schema) ↔ Non-deterministic agent; annotate where each of "naming," "description," "schema," "response shape," "errors" sits on the contract [S1][S10].
2. **Three-phase tool-design loop**: Prototype → Evaluate (agentic loop + metrics) → Optimize (paste transcripts into Claude → rewrite tools → held-out re-eval) → back to Evaluate, as a cycle [S1].
3. **Tool consolidation before/after**: three boxes `list_users` / `list_events` / `create_event` merging into one box `schedule_event`; same for `get_customer_by_id`+`list_transactions`+`list_notes` → `get_customer_context` [S1].
4. **Response shaping trade-off**: two stacked bars, 206 tokens (detailed, with IDs) vs 72 tokens (concise), with an arrow showing the "needs a follow-up call" branch only from the detailed side [S1].
5. **Tool Search Tool sequence diagram**: Agent → sees only tool names/Tool Search tool at start → searches → server expands `tool_reference` → tool definition appended at end of context (cache-prefix preserved) → agent calls tool [S4][S_azure].
6. **Programmatic Tool Calling / Code Mode data-flow**: Model writes code → code runs in sandbox → sandbox calls MCP tools directly (bypassing model context for the data) → only final summary re-enters model context. Contrast with the "old" per-call round-trip diagram (tool result → model → next tool call → model...) [S2][S3][S4].
7. **MCP tool annotation decision tree**: `readOnlyHint`? → yes: no confirmation; no → `destructiveHint`/`idempotentHint`? → branch into "confirm every call" / "safe to retry" / "dry-run required" [S5][S6].
8. **Accuracy vs. tool-count curve**: x-axis = number of tools in context (5/10/15/20+), y-axis = accuracy%, plot the two data points we actually have (Haiku 4.5: 91%@10, 87%@15) plus the BFCL toolkit-expansion band (1-8% drop, 2.7→5.6 tools avg) as a second series, explicitly marked as two different studies/models — do not interpolate a single false curve [S11][S12].
9. **Anti-pattern severity ranking (bar chart)**: the 7 anti-patterns from [S6] with their 46-96 severity scores — good candidate for an actual chart, not just a diagram, since it's already a ranked numeric table.
10. **Minimalist vs. maximalist tool philosophy spectrum**: one end "Pi: 4 tools, <1,000-token prompt," other end "typical MCP deployment: dozens of servers, hundreds of tools + Tool Search," with the trade-offs (context cost vs. per-call safety/confirmation) labeled on the arrows [S8][S1].

## Chart candidates (real data, needs the raw series if drawn)

- Token-reduction case studies bar chart: 4 measured before/after pairs — Tool Search (77K→8.7K), PTC (43,588→27,297), code-exec-with-MCP (150,000→2,000), Cloudflare Code Mode (1.17M→~1,000) — note each is a *different task/benchmark*, so label axes per-bar, don't imply comparability [S4][S2][S3].
- Accuracy-lift bar chart: Opus 4 Tool Search (49%→74%), Opus 4.5 Tool Search (79.5%→88.1%), Tool Use Examples (72%→90%), PTC internal retrieval (25.6%→28.5%), PTC GIA (46.5%→51.2%) — all Anthropic-self-reported, flag that in the chart caption [S4].

## Glossary

- **ACI (Agent-Computer Interface)**: the discipline of designing tool interfaces for LLM agents, by analogy to HCI [S1][S10].
- **Poka-yoke**: mistake-proofing a tool's inputs/interface so certain classes of model error become structurally impossible [S10].
- **Tool Search Tool**: Anthropic feature where tools marked `defer_loading: true` are only expanded into context once the model searches for and finds them [S4].
- **Programmatic Tool Calling (PTC)**: Claude writes code (in a sandboxed code-execution container) that calls tools marked `allowed_callers`, keeping intermediate results out of the model's context [S4].
- **Code Mode**: pattern (Cloudflare's term) of exposing an entire API as a small number of tools (`search`/`execute`) over which the model writes code, rather than one tool per endpoint [S3].
- **Code execution with MCP**: Anthropic's variant where MCP tools are surfaced to the model as a navigable filesystem of code files the agent imports and calls [S2].
- **Namespace (tool)**: a named grouping of tools under one umbrella (used for both naming conventions and as a unit of deferred loading) [S1][S_azure].
- **Strict tool use / strict function calling**: schema-constrained ("grammar-constrained") sampling guaranteeing tool call arguments match the JSON Schema exactly [S_strict][S9].
- **`is_error` (tool_result)**: flag on a Claude tool_result block marking a tool execution failure, paired with an instructive error string [S13].
- **`readOnlyHint`/`destructiveHint`/`idempotentHint`/`openWorldHint`**: MCP tool annotations describing side-effect behavior, used by clients to decide on confirmation UX [S5].
- **God tool**: an anti-pattern tool that branches internally over many unrelated operations instead of exposing focused, single-intent tools [S6].
- **Chatty protocol**: an MCP anti-pattern where an agent needs many sequential round trips (>5/turn is the cited threshold) to accomplish one user-visible action [S6].
- **Dry-run / audit gate**: a confirmation or simulate-only mode required before a destructive tool actually executes [S6].

## Unverified / open questions

- **"Performance declines after 20-25 functions due to cognitive overload"** — this specific framing and threshold appeared only in a search-engine synthesis, not verified against a primary source in this session; treat as folklore consistent with (but not identical to) OpenAI's official "<20 functions" soft guidance [S9] and the Haiku 4.5 10-vs-15 measurement [S11]. Flagged, not used as a hard claim above.
- **MCP anti-patterns: "token passthrough" and "broadest-credential-available" scoping issues** — summarized from search snippets of security-focused MCP posts; I was not able to open and directly read the primary post(s) behind these specific claims in the time available. Directionally consistent with the (directly read) god-tool/audit-gate anti-patterns in [S6], but the exact wording and source should be re-verified before quoting.
- **Exact current status of OpenAI's own "Tool Search"-equivalent feature name/API shape** — the search summary referenced "OpenAI Tool Search" by analogy to Anthropic's and Azure's features; I read Azure's version directly (dated 2026-07-15) [S_azure] and OpenAI's general function-calling guide [S9], but did not find and open a primary OpenAI doc page specifically naming and specifying deferred/searchable tool loading on the base OpenAI (non-Azure) API. Do not assume feature parity between OpenAI-direct and Azure OpenAI here without checking platform.openai.com directly.
- **LangChain/LlamaIndex/Vercel AI SDK-specific tool-design guidance** — the scope note asked for framework practitioner content (LangChain, Vercel); this session's web-search budget was exhausted before a dedicated pass on these could be completed, so the chapter currently leans more heavily on Anthropic/OpenAI/Cloudflare primary docs plus independent practitioner blogs (Ronacher, Willison, two anti-pattern posts) than on those specific frameworks. Flagging as a gap for a follow-up research pass.
- **"On the Robustness of Agentic Function Calling" (IBM Research, arXiv 2504.00914)** — read via a third-party summarizer (alphaxiv), not the raw PDF; numbers reported (2.7→5.6 toolkit size, 1-8%/8-19% accuracy drops) should be spot-checked against the arXiv PDF directly if quoted precisely elsewhere in the book.

## Sources

- [S1] "Writing effective tools for AI agents — with agents," Anthropic Engineering (lead author Ken Aizawa, with Barry Zhang, Zachary Witten, Daniel Jiang, et al.), published 2025-09-11. https://www.anthropic.com/engineering/writing-tools-for-agents — accessed 2026-09-30.
- [S2] "Code execution with MCP: Building more efficient agents," Anthropic Engineering (Adam Jones, Conor Kelly), published 2025-11-04. https://www.anthropic.com/engineering/code-execution-with-mcp — accessed 2026-09-30.
- [S3] "Code Mode: give agents an entire API in 1,000 tokens," Cloudflare Blog (Matt Carey), published 2026-02-20 (confirmed via page metadata `datePublished`/`article:published_time`). https://blog.cloudflare.com/code-mode-mcp/ — accessed 2026-09-30.
- [S4] "Advanced Tool Use on Claude Developer Platform," Anthropic Engineering (lead Bin Wu, with Adam Jones et al.), published 2025-11-24 (feature dated 2025-11-19 in the API type string). https://www.anthropic.com/engineering/advanced-tool-use — accessed 2026-09-30.
- [S5] Model Context Protocol specification, "Tools" (server) page, revision 2025-06-18. https://modelcontextprotocol.io/specification/2025-06-18/server/tools — accessed 2026-09-30.
- [S6] "MCP Server Anti-Patterns: Seven Design Failures Identified," DigitalApplied, published 2026-05-06. https://www.digitalapplied.com/blog/mcp-server-anti-patterns-design-mistakes-2026-developer-guide — accessed 2026-09-30.
- [S7] "How we built our multi-agent research system," Anthropic Engineering, published 2025-06-14, as read/quoted via Simon Willison's coverage. https://simonwillison.net/2025/Jun/14/multi-agent-research-system/ (original: anthropic.com/engineering/built-multi-agent-research-system) — accessed 2026-09-30.
- [S8] "Agent Design Is Still Hard," Armin Ronacher (lucumr.pocoo.org), published 2025-11-21. https://lucumr.pocoo.org/2025/11/21/agents-are-hard/ — accessed 2026-09-30.
- [S9] "Function calling," OpenAI developer docs. https://developers.openai.com/api/docs/guides/function-calling — accessed 2026-09-30 (undated docs page; guidance reflects 2026 state).
- [S10] "Building effective agents," Appendix 2 "Prompt Engineering your Tools," Anthropic Engineering (Erik S., Barry Zhang), published 2024-12-19. https://www.anthropic.com/engineering/building-effective-agents — accessed 2026-09-30.
- [S11] "Five MCP Server Patterns to Improve Tool Selection," AlphaSignal AI Substack (Carson Rodrigues, Oysturn Vas), published 2026-07-07. https://alphasignalai.substack.com/p/why-your-mcp-server-picks-the-wrong — accessed 2026-09-30.
- [S12] "On the Robustness of Agentic Function Calling," Ella Rabinovich & Ateret Anaby-Tavor (IBM Research), arXiv 2504.00914, submitted 2025-04-01 — read via alphaXiv summary, not the raw PDF (see Unverified). https://www.alphaxiv.org/abs/2504.00914 — accessed 2026-09-30.
- [S13] "Define tools" and "Handle tool calls," Claude Platform Docs (live docs, current as read). https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools and https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls — accessed 2026-09-30.
- [S_strict] "Strict tool use," Claude Platform Docs. https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use — accessed 2026-09-30.
- [S_azure] "Use tool search with the Azure OpenAI Responses API," Microsoft Learn, `ms.date: 2026-07-15`. https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/tool-search — accessed 2026-09-30.
- [S_miessler] "Anthropic Changes MCP Calls Into Filesystem-based Skills," Daniel Miessler, published 2025-11-05. https://danielmiessler.com/blog/anthropic-downplays-mcps — accessed 2026-09-30.
- [S_stateless] "Stateless MCP has recaptured my interest," Simon Willison, published 2026-07-31 (re: MCP spec revision 2026-07-28). https://simonwillison.net/2026/Jul/31/stateless-mcp/ — accessed 2026-09-30.
- [S_willison_mcp] Simon Willison, comment on "MCP was always a bad idea?", published 2026-09-20. https://simonwillison.net/2026/Sep/20/hn-49779718/ — accessed 2026-09-30.
