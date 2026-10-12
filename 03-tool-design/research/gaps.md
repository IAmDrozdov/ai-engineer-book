# Проектирование инструментов агента — gaps, contradictions and corrections notes (completeness-critic lens)

Scope of this file: what `spec.md`, `practice.md` and `field.md` miss, get wrong, or state from stale sources, re-checked against primary sources on 2026-09-30. Source ids here are `[G#]` and are independent of the `[S#]` ids in the other three files. Where a claim in another file is corrected, the file and its source id are named.

## Contradictions resolved

1. **Are Tool Search / PTC / Tool Use Examples beta or GA?** field.md says "public beta since Nov 24, 2025, via `betas=["advanced-tool-use-2025-11-20"]`"; spec.md says "apparently stable" without a date. **Resolved (primary, [G10]):** launched as public beta 2025-11-24; on **2026-02-17** the release notes say "The web search tool and programmatic tool calling are available with no beta header required" and "The code execution tool, web fetch tool, tool search tool, tool use examples, and memory tool no longer require a beta header." The PTC page frontmatter reads `status: ga` [G2]; the tool reference lists "Beta header: None" for tool search and code execution [G3]. The `advanced-tool-use-2025-11-20` header belongs to the Nov-2025 blog snippet only.
2. **Which code-execution version enables PTC?** practice.md and field.md show `code_execution_20250825` in `allowed_callers` (copied from the Nov-2025 blog). spec.md shows both. **Resolved [G2][G3][G10]:** PTC "requires the code execution tool with the `code_execution_20260120` or later tool version". `code_execution_20250825` is listed as **Legacy** ("adds Bash and file operations"), not a PTC caller. `code_execution_20260120` and `code_execution_20260521` are interchangeable in `allowed_callers`, and "Response blocks always tag the caller as `code_execution_20260120`" [G2]. SDK support for `20260120` landed 2026-06-18; `20260521` (discloses the 90-second per-cell limit) landed 2026-06-11 [G10]. Claude Haiku 4.5 accepts `code_execution_20260120` "but doesn't support programmatic tool calling" [G2].
3. **Current MCP revision.** field.md: "current stable revision referenced by tooling is `2025-06-18`". spec.md: `2026-07-28` latest. **Resolved [G16][G17][G19]:** `2026-07-28` exists with its own `schema.ts` and changelog listing changes "since the previous revision, 2025-11-25". The chain is 2025-06-18 → 2025-11-25 → 2026-07-28. `ToolAnnotations` field set is unchanged in 2026-07-28 (same four hints + `title`, same defaults) [G19], so annotation text from 2025-06-18 is still accurate, but anything about sessions, `initialize`, or server-initiated elicitation is not.
4. **Where do "invalid arguments" errors go in MCP?** field.md: "protocol-level JSON-RPC errors (unknown tool, bad args)". **Resolved [G18][G16]:** since 2025-11-25 (SEP-1303) "input validation errors should be returned as Tool Execution Errors rather than Protocol Errors to enable model self-correction". The 2026-07-28 page lists under Tool Execution Errors: "API failures; Input validation errors (e.g., date in wrong format, value out of range); Business logic errors"; Protocol Errors are only unknown tool, malformed requests that fail the `CallToolRequest` schema, server errors. "Clients **SHOULD** provide tool execution errors to language models to enable self-correction" [G16].
5. **OpenAI: are `strict` and parallel calls mutually exclusive?** field.md says yes. spec.md says only fine-tuned models are affected. **Resolved [G13]:** VERBATIM: "Currently, if you are using a fine tuned model and the model calls multiple functions in one turn then strict mode will be disabled for those calls." There is no general mutual exclusion. The same guide says "We recommend always enabling strict mode."
6. **Does strict mode silently fall back?** spec.md: "Both fall back to best-effort if the schema can't be made strict." **Resolved:** OpenAI [G13] VERBATIM: "If you send `strict: true` and your schema does not meet the requirements above, the request will be rejected with details about the missing constraints. If you omit `strict`, ... Responses requests will attempt to normalize your schema into strict mode when possible, and will fall back to non-strict, best-effort function calling ... Chat Completions requests remain non-strict by default." Anthropic [G8]: "If you use an unsupported feature, you'll receive a 400 error with details." So: explicit `strict: true` fails loudly on both; only OpenAI Responses with `strict` omitted falls back.
7. **Does OpenAI (not Azure) have tool search?** practice.md lists it as unverified; spec.md says gpt-5.4+. **Resolved [G13][G14]:** yes — `{"type": "tool_search"}` on the OpenAI Responses API, "only `gpt-5.4` and later models support `tool_search`", with **hosted** and **client-executed** modes (the modes practice.md attributed to Azure only). Also an important semantic difference from Anthropic: in OpenAI's design "For an individual deferred function, the model still sees the function name and description, so in practice tool search is mostly deferring the parameter schema"; for a namespace or MCP server only the namespace/server name+description is shown up front [G14]. In Anthropic's design deferred tools "don't appear in the system-prompt prefix at all" [G3].
8. **Pi agent attribution and numbers.** practice.md attributes Pi's 4 tools / <1,000-token prompt to Ronacher's "Agent Design Is Still Hard" [S8] and says "Pi (Mario Zechner / Armin Ronacher)" and "54k to 98k GitHub stars in three months". **Resolved:** the Ronacher post (2025-11-21) contains no mention of Pi, Cline, or 1,000 tokens (text search of the fetched page, [G49]). The primary source is Mario Zechner's own post (2025-11-30) [G28]: "pi's system prompt and tool definitions together come in below 1000 tokens"; the four tools are read, write, edit, bash (grep/find/ls exist but are off by default). Repo `badlogic/pi-mono` was created 2025-08-09 and has **110,701 stars on 2026-09-30** (GitHub API via `gh`) [G29]. The "54k→98k in three months" figure has no traceable source; do not print it.
9. **OSWorld-MCP "36.3%".** field.md: "even the strongest models only correctly invoke the right tool 36.3% of the time". **Resolved [G40]:** the abstract says "even the strongest models have relatively low tool invocation rates, Only 36.3%" — it is a rate of *invoking tools at all* where tools help, not a correctness rate for choosing the right tool.
10. **Semantic IDs vs UUIDs vs opaque handles.** 2025 blog [G20]: "resolving arbitrary alphanumeric UUIDs to more semantically meaningful and interpretable language (or even a 0-indexed ID scheme) significantly improves Claude's precision". Current Anthropic docs [G4]: "Return semantic, stable identifiers (for example, slugs or UUIDs) rather than opaque internal references". MCP 2026-07-28 handle guidance [G16]: "Handles that encode internal structure invite parsing or guessing; opaque identifiers do not." **Resolution:** not a real conflict but three different objects. (a) Entities the model *reasons about* (users, files, channels): give names/slugs, keep the raw ID available (e.g. `detailed` mode). (b) IDs the model only *copies forward*: a stable UUID is fine; the thing to avoid is an internal reference that changes or means nothing (row offsets, cursor blobs without instructions). (c) Server-minted *state handles* (baskets, sessions, cursors): opaque, high-entropy, authorization-checked on every call, lifetime stated in the creating tool's description. The newer docs soften the 2025 blog's anti-UUID wording; quote the current docs if only one line is used.
11. **"Consolidate with an `action` parameter" vs "god tools are an anti-pattern".** practice.md quotes both (Anthropic docs [S13] and DigitalApplied [S6]) without reconciling. **Resolution:** Anthropic's current docs [G4] recommend grouping *related operations on one resource* (`create_pr`/`review_pr`/`merge_pr` → one tool with `action`). The anti-pattern is a mega-tool branching across *unrelated* operations with an untyped parameter blob. The DigitalApplied ranking is self-described as heuristic: "Source: Digital Applied MCP audits, 2025–2026 · heuristic weighting ... Treat the ordering as the load-bearing claim, not the exact numbers" [G46] — the "severity 96/100" must not be presented as a measurement. Primary empirical evidence on consolidation: AutoMCP's "filtering and regrouping reduce the median tool count per API by one-third" [G36]; GitHub's toolset cut [G30].
12. **Multi-agent research post date.** practice.md: 2025-06-14 (that is Simon Willison's coverage date). **Resolved [G23]:** Anthropic `datePublished` = 2025-06-13. The "40% decrease in task completion time" and tool-testing agent are verified verbatim in the primary post.
13. **"Building effective agents" URL.** spec.md uses `/news/`, field.md `/research/`, practice.md `/engineering/`. All resolve; the engineering index links `/engineering/building-effective-agents`, `datePublished` 2024-12-19 [G50]. Use the engineering URL.
14. **Claude model ID format.** practice.md writes `claude-opus-5.5`, `claude-fable-5.1`; spec.md writes `claude-opus-5-5`. **Resolved [G1][G2][G10]:** API IDs use hyphens: `claude-opus-5-5`, `claude-sonnet-5-5`, `claude-fable-5-1`, `claude-mythos-5-1`; the dotted form is only the marketing name ("Claude Opus 5.5").
15. **Check Point workerd bug list.** field.md: "URLPattern OOB read, zlib UAF, HTMLRewriter UAF, a KV SQL authorization bypass, plus one more". **Resolved [G31]:** the five are the node:zlib UAF, HTMLRewriter UAF, *two* URLPattern OOB reads, and a SQL authorizer bypass (rename of `_cf_`-prefixed tables). Status matters for the book: "Cloudflare's managed Workers were fixed in production, and workerd v1.20260619.1 closes all of these bugs for self-hosted deployments. As of now, Cloudflare has not assigned CVEs." Four bugs reported 2026-02-01 via HackerOne; post dated 2026-08-07 (Black Hat USA 2026 talk).
16. **Where the "Haiku preflight on every bash call" comes from.** field.md attributes it to Ronacher. The measured version is Zechner's Aug-2025 eval: Haiku token usage "35k vs 1.3-2M" because "CLI tools trigger Claude Code's malicious command detection on every bash invocation" [G26]. This describes Claude Code in Aug 2025; Claude Code's 2026 auto mode uses a transcript classifier "running on Sonnet 4.6" that gates tool calls [G24]. Treat the Haiku-preflight detail as historical.

## Claims most likely to be wrong (with corrections)

1. **Wrong:** "Enable programmatic tool calling with `allowed_callers: ["code_execution_20250825"]` and the `advanced-tool-use-2025-11-20` beta header." **Correct:** `{"type": "code_execution_20260120", "name": "code_execution"}` + `"allowed_callers": ["code_execution_20260120"]`, no beta header; PTC is GA (`status: ga`), not available on Bedrock or Google Cloud, not ZDR-eligible, not supported on Haiku 4.5 [G2][G3][G10].
2. **Wrong:** "Tool search / PTC / input_examples are beta features." **Correct:** no beta header since 2026-02-17 [G10]. What *is* beta today: mid-conversation tool changes (`inline-tools-2026-09-15`) and `mcp_toolset` (`mcp-client-2025-11-20`) [G3][G11].
3. **Wrong:** "Force a tool with `tool_choice: {"type": "tool", ...}`" as universal advice. **Correct:** on Claude Opus 5.5, Sonnet 5.5, Fable 5.1 and Mythos 5.1, `any` and `tool` "return a 400 error"; use `auto` + `strict: true`, or structured outputs [G4][G10]. Manual extended thinking (`thinking: {type: "enabled"}`) also rejects `any`/`tool` [G4].
4. **Wrong:** "The current MCP spec is 2025-06-18" / "use `elicitation/create` from inside a tool call" / "keep per-session state on the server". **Correct:** 2026-07-28 is current; sessions and the `initialize` handshake are removed; mid-call questions use `resultType: "input_required"` + retry with `inputResponses`; cross-call state goes into explicit server-minted handles passed as tool arguments [G16][G17].
5. **Wrong:** "Invalid tool arguments are returned as JSON-RPC `-32602`." **Correct:** since 2025-11-25, input-validation failures are Tool Execution Errors (`isError: true`, readable text) so the model can self-correct; `-32602` is for unknown tool / malformed request [G16][G18].
6. **Wrong:** "OpenAI strict mode can't be combined with parallel tool calls." **Correct:** only fine-tuned models lose strict mode when they emit multiple calls in one turn [G13].
7. **Wrong:** "Strict mode enforces all of JSON Schema, so `minimum`/`maxLength` are poka-yoke." **Correct:** Anthropic strict/structured outputs do **not** support numerical constraints (`minimum`, `maximum`, `multipleOf`), string length constraints, recursive schemas, or `additionalProperties` other than `false`; array `minItems` only 0 or 1. Also hard limits per request: **20 strict tools, 24 optional parameters total, 16 union-typed parameters total** [G8]. Validate server-side anyway.
8. **Wrong:** "With deferred loading the model sees nothing about deferred tools" (as a cross-vendor statement). **Correct:** true for Anthropic (deferred tools stripped from the prefix, search runs over names, descriptions, argument names and argument descriptions) [G1][G3]; false for OpenAI individual functions, where name + description stay visible and mostly the schema is deferred [G14].
9. **Wrong:** "Claude's accuracy drops past N tools" with a single N. **Correct:** each source has its own number and conditions: Anthropic docs "degrades once you exceed 30–50 available tools" [G1]; OpenAI "fewer than 20 functions available at the start of a turn ... just a soft suggestion" [G13]; OpenAI tool search "fewer than 10 functions" per namespace [G14]; Gemini "Keep active set to 10-20 tools maximum" [G15]; AlphaSignal practitioner test: Haiku 4.5 91%@10 → 87%@15, Sonnet 4 ≥90% up to 20 tools, below 90% by 30 [G45]. None is a law; all are soft.
10. **Wrong:** "Code Mode cuts cost by 98.7%/99.9%." **Correct:** these are *context-size* reductions for one data-moving step on a vendor-chosen example (Anthropic Drive→Salesforce; Cloudflare full API surface). An independent production write-up: "99.2% is the reduction in bytes put in front of the model for this one data-gathering step ... It is not the change in our bill"; end-to-end "run time went from around 5 minutes to 1–2 minutes, and per-run cost dropped by roughly half" [G41]. Anthropic's own dynamic-filtering eval: "Price-weighted tokens decreased for Sonnet 4.6 on both benchmarks but increased for Opus 4.6" [G25].
11. **Wrong:** "Use the `think` tool for agentic tool use" (common in 2025 guides). **Correct:** the post now carries an "Extended thinking update": "we recommend using that feature instead of a dedicated think tool in most cases" [G22]. Keep the think-tool numbers only as history.
12. **Wrong:** "Always add examples to the tool description." **Correct:** Anthropic measured 72%→90% with `input_examples` on "complex parameter handling" (internal) [S2 in spec.md], but OpenAI warns "Adding examples may hurt performance for reasoning models" [G13], and the MCP-smells study found removing the Examples component "does not statistically degrade performance" across its domain-model combinations [G32]. Examples are for format conventions and optional-field co-occurrence, not a default.
13. **Wrong:** "`allowed_callers: ["code_execution_..."]` guarantees the tool is never called directly" / "annotations tell you a tool is safe". **Correct:** "`allowed_callers` ... is not a hard API-level block on direct invocation ... Do not rely on `allowed_callers` as a security boundary" [G2]. MCP: "Clients should never make tool use decisions based on `ToolAnnotations` received from untrusted servers" [G19]; description-code inconsistency measured in 9.93% of 19,200 description-code pairs [G33] and ~13% of 10,240 servers [G34].
14. **Wrong:** "Claude Code truncates MCP output at 25,000 tokens" as the whole story. **Correct:** default max 25,000 tokens (`MAX_MCP_OUTPUT_TOKENS`), warning above 10,000 (fixed); a server can raise one tool's threshold with `_meta["anthropic/maxResultSizeChars"]` up to 500,000 characters; results above the threshold are "persisted to disk and replaced with a file reference in the conversation"; tool search is **on by default** in Claude Code (`ENABLE_TOOL_SEARCH` unset = all MCP tools deferred; `auto` = defer once definitions reach 10% of context) [G12].
15. **Wrong:** "GPT-4o scores 100% vs <40% on schema adherence" presented as current. **Correct:** this is OpenAI's 2024-08-06 launch-blog number for `gpt-4o-2024-08-06` vs older models; it is not on the current function-calling or structured-outputs pages (text search of both, 2026-09-30) and could not be re-fetched (openai.com returns 403). Cite with its date or drop it. Also stale: "OSWorld-MCP: models correctly invoke tools 36.3%" (see Contradiction 9), "Opus 4 49%→74%" (Opus 4 is retired on the Claude API except Google Cloud [G9]; the number is a Nov-2025 internal eval).

## TL;DR

- Tool features on the Claude API are GA and version-dated: `tool_search_tool_{regex,bm25}_20251119`, `code_execution_20260120`/`20260521` (PTC minimum `20260120`), `strict`, `input_examples`, `defer_loading`, `allowed_callers`, `eager_input_streaming`; betas are only mid-conversation tool changes and the MCP connector [G2][G3][G10][G11].
- The newest Claude models (Opus 5.5, Sonnet 5.5, Fable 5.1, Mythos 5.1) reject forced tool use with 400; design for `auto` + strict tools, and put "when to use" guidance in descriptions and system prompts [G4][G10].
- Tools are part of the cached prefix. Editing `tools` "invalidates the prompt cache for the entire conversation"; the fixes are `defer_loading` (prefix untouched) and, since 2026-07/09 in beta, `tool_addition`/`tool_removal` blocks in a `role: "system"` message [G3][G11]. MCP 2026-07-28 adds deterministic `tools/list` ordering and `ttlMs`/`cacheScope` for the same reason [G17].
- Tool definitions cost tokens twice: the tool-use system prompt (286 tokens on Opus 5.5 / Sonnet 5.5 for `auto`/`none`; 675 on Opus 4.7) plus names, descriptions and schemas [G9].
- Strict schemas have hard budgets on Claude: 20 strict tools, 24 optional params, 16 union params per request; no `minimum`/`maxLength`; `strict` is incompatible with PTC on the same tool [G2][G8].
- Real MCP servers are mostly bad at descriptions: 97.1% of 856 tools across 103 servers have at least one description smell, 56% an unclear purpose; fixing them lifted task success by a median 5.85 points but raised steps by 67.46% and regressed 16.67% of cases [G32].
- Real MCP servers are mostly endpoint wrappers: 92% of 116 official servers "implement tools as bare API wrappers"; they expose a median 19% of available operations [G36]. In a random registry draw only 48.8% of 400 servers even completed `initialize`, and 58.8% of tools omitted optional safety annotations [G35].
- MCP 2026-07-28 gives tool authors normative guidance they did not have before: tool-name rules (1–128 chars, `[A-Za-z0-9_.-]`, case-sensitive, unique per server), explicit state handles, validation errors as execution errors [G16].
- CLI vs MCP is not a protocol question: Zechner's 120-run eval found MCP and CLI versions of the same tool both at 100% success, MCP 23% faster and 2.5% cheaper; "The problem with many MCPs isn't the protocol - it's that they're badly designed wrappers" [G26].
- Popular MCP servers are expensive at rest: Playwright MCP 21 tools / 13.7k tokens, Chrome DevTools MCP 26 tools / 18.0k tokens, versus a 225-token README for equivalent CLI scripts [G27]; GitHub MCP 101 tools / 64.6k tokens → 52 / 30.3k after defaults [G30].
- Confirmation for side effects is now a first-class API surface in several stacks: MCP annotations (hints), Claude Code `_meta["anthropic/requiresUserInteraction"]`, OpenAI Agents SDK `needs_approval`, Claude Managed Agents `auto` permission policy [G12][G43][G10].
- Code-execution tool surfaces move the trust boundary: prompt injection → model writes exploit code → workerd sandbox escape (fixed in workerd v1.20260619.1) [G31].
- Tool-description optimization is now a research topic with measured results (Trace-Free+ on StableToolBench; RAG-MCP 13.62%→43.13% selection accuracy) — cite as research, not product guidance [G37][G38].

## Current state and versions (verified 2026-09-30)

- **Claude API tool types** [G3]: web search `web_search_20260318|20260209|20250305`; web fetch `web_fetch_20260318|20260309|20260209|20250910`; code execution `code_execution_20260521|20260120|20250825`; advisor `advisor_20260301` (beta `advisor-tool-2026-03-01`); tool search `tool_search_tool_regex_20251119|bm25_20251119` (undated aliases `tool_search_tool_regex`, `tool_search_tool_bm25` "resolve to the latest dated version"); MCP connector `mcp_toolset` (beta `mcp-client-2025-11-20`); memory `memory_20250818`; bash `bash_20250124`; text editor `text_editor_20250728|20250124`; computer use `computer_toolset_20260801` (GA 2026-08-19) + legacy beta `computer_20251124|20250124`; browser use `browser_toolset_20260801` (launched 2026-08-19) [G3][G10].
- **Tool definition properties** [G3]: `cache_control`, `strict`, `defer_loading`, `allowed_callers`, `input_examples`, `eager_input_streaming` ("Enable fine-grained input streaming ... User-defined tools only"). "These properties compose: you can set `defer_loading` and `cache_control` and `strict` on the same tool" — except that a deferred tool "can't also carry `cache_control`: the API returns a 400" [G1].
- **Tool search limits** [G1]: up to 10,000 deferred tools per request; 5 results per search by default, `limit` 1–10,000; regex ≤200 chars, BM25 ≤500 chars; at least one tool must stay non-deferred ("At least one tool must have defer_loading=false. All tools cannot be deferred."); supported from Haiku 4.5 / Sonnet 4.5 / Opus 4.5 onward, "Claude Opus 4.1 and earlier models don't support the tool search tool"; on Bedrock only via InvokeModel, not Converse. Custom client-side search is supported by returning `tool_reference` blocks from your own tool.
- **PTC constraints** [G2]: not with `strict: true`; `tool_choice` cannot force a programmatic call and "cannot name a tool whose `allowed_callers` omits `"direct"`"; not with `disable_parallel_tool_use: true`; recursive `$ref` → 400 "Circular $ref detected"; MCP-connector tools and computer/browser toolsets cannot be called programmatically; pending call times out after ~4 minutes (`TimeoutError ... no response after 270s`); idle containers reclaimed after ~5 minutes; containers not reusable >30 days after creation.
- **Claude Code** [G12]: tool search on by default for MCP tools; disabled automatically when `ANTHROPIC_BASE_URL` is a non-first-party host "since most proxies don't forward `tool_reference` blocks"; not supported on Microsoft Foundry deployments hosted on Azure; `alwaysLoad` per server or `_meta["anthropic/alwaysLoad"]` per tool; `ENABLE_TOOL_SEARCH` values `(unset)|true|auto|auto:N|false`.
- **OpenAI** [G13][G14]: examples use `gpt-6-astra`; "GPT-6 Astra and GPT-6.1 Sol require the Responses API for tool calling. The Chat Completions examples use GPT-5.6"; `tool_search` for gpt-5.4+; `namespace` tool type; `allowed_tools` in `tool_choice`; custom tools (`"type": "custom"`) with free-text input and optional CFG (`lark` or `regex`) constrained by LLGuidance.
- **Gemini** [G15]: examples on `gemini-3.8-flash`; `tool_choice` modes `auto|any|none|validated` ("`validated`: Model ensures function schema adherence"); "Keep active set to 10-20 tools maximum"; only an OpenAPI subset supported; `any` mode "may reject very large or deeply nested schemas".
- **MCP** [G16][G17][G19]: revision 2026-07-28 current; `inputSchema` any JSON Schema 2020-12 keywords with `type: "object"` at root; `outputSchema` + `structuredContent`; `x-mcp-header` to mirror an argument into an HTTP header; tasks moved to extension `io.modelcontextprotocol/tasks`.

## Timeline (items missing from the other three files)

- **2025-01-06** — Anthropic "Claude SWE-Bench Performance": publishes the full `bash` and `str_replace_editor` tool specs; 49% SWE-bench Verified with "a simple prompt and two general purpose tools" [G21].
- **2025-03-20** — Anthropic "The 'think' tool" (later annotated: prefer extended thinking) [G22].
- **2025-04-01** — IBM "On the Robustness of Agentic Function Calling" (arXiv 2504.00914) [G39].
- **2025-05-06** — RAG-MCP (arXiv 2505.03275) [G38].
- **2025-06-13** — Anthropic multi-agent research system post (not 06-14) [G23].
- **2025-07-21** — "From REST to MCP" empirical study (v4 2026-04-06) [G36].
- **2025-08-15** — Zechner "MCP vs CLI" 120-run eval [G26].
- **2025-11-02** — Zechner "What if you don't need MCP at all?" [G27].
- **2025-11-14** — Claude structured outputs (incl. strict tool use) public beta [G10].
- **2025-11-25** — MCP 2025-11-25: tool-name guidance (SEP-986), icons, validation errors as tool execution errors (SEP-1303), JSON Schema 2020-12 default, experimental tasks [G18].
- **2025-11-30** — Zechner "What I learned building an opinionated and minimal coding agent" (Pi) [G28].
- **2026-01-09** — Anthropic "Demystifying evals for AI agents" (pass@k vs pass^k) [G52].
- **2026-01-29** — Claude structured outputs out of beta [G10].
- **2026-02-03 / 02-16 / 02-23** — arXiv papers on misleading descriptions [G34], description smells [G32], learning to rewrite descriptions [G37].
- **2026-02-17** — Tool search, tool use examples, PTC, code execution, web fetch, memory: no beta header; dynamic filtering for web search/fetch (+11% avg, −24% input tokens) [G10][G25].
- **2026-03-02** — Stainless "SDK code mode" vendor benchmark [G42].
- **2026-03-25** — Anthropic "How we built Claude Code auto mode" [G24].
- **2026-06-03** — Description-Code Inconsistency study, 2,214 servers [G33].
- **2026-06-11** — `code_execution_20260521` (90-second per-cell limit disclosed) [G10].
- **2026-06-18** — SDKs support `code_execution_20260120`, "the minimum version for programmatic tool calling" [G10].
- **2026-07-07** — AlphaSignal tool-count measurements [G45].
- **2026-07-08** — agent-swarm "Code mode yields a 99.2% cost reduction" with end-to-end caveat [G41].
- **2026-07-24** — Mid-conversation tool changes beta (`mid-conversation-tool-changes-2026-07-01`) [G10].
- **2026-07-28** — MCP 2026-07-28 [G17].
- **2026-08-07** — Check Point "When Agentic Glue Melts" (workerd, Code Mode) [G31].
- **2026-08-19** — `computer_toolset_20260801` GA, `browser_toolset_20260801` launched, Agent Skills GA [G10].
- **2026-09-01** — Claude Fable 5.1 / Mythos 5.1; `any`/`tool` tool_choice → 400 [G10].
- **2026-09-10** — Claude Managed Agents permission policy `auto` (server evaluates each agent/MCP tool call: run, deny, or pause for approval) [G10]; arXiv random-draw MCP registry study [G35].
- **2026-09-22** — Claude Opus 5.5 (forced tool use → 400; thinking cannot be disabled); tools definable inside mid-conversation system messages, beta `inline-tools-2026-09-15` [G10].
- **2026-09-28** — Claude Sonnet 5.5 migration notes: forced tool use → 400; `thinking: {"type": "between_tools"}` [G10].

## Mechanics

### A. Anthropic's own reference tool specs (2025-01) — the best worked example of "description carries the weight" [G21]

VERBATIM (bash tool used for the 49% SWE-bench Verified run):
```json
{
   "name": "bash",
   "description": "Run commands in a bash shell\n
* When invoking this tool, the contents of the \"command\" parameter does NOT need to be XML-escaped.\n
* You don't have access to the internet via this tool.\n
* You do have access to a mirror of common linux and python packages via apt and pip.\n
* State is persistent across command calls and discussions with the user.\n
* To inspect a particular line range of a file, e.g. lines 10-25, try 'sed -n 10,25p /path/to/the/file'.\n
* Please avoid commands that may produce a very large amount of output.\n
* Please run long lived commands in the background, e.g. 'sleep 10 &' or start a server in the background.",
   "input_schema": {
       "type": "object",
       "properties": {
           "command": {
               "type": "string",
               "description": "The bash command to run."
           }
       },
       "required": ["command"]
   }
}
```
VERBATIM excerpt of `str_replace_editor` description and the `path` parameter:
```
* The `old_str` parameter should match EXACTLY one or more consecutive lines from the original file. Be mindful of whitespaces!\n
* If the `old_str` parameter is not unique in the file, the replacement will not be performed. Make sure to include enough context in `old_str` to make it unique\n
```
```json
"description": "Absolute path to file or directory, e.g. `/repo/file.py` or `/repo`."
```
Design rationale (VERBATIM): "We experimented with several different strategies for specifying edits to existing files and had the highest reliability with string replacement ... The replacement will only occur if there is exactly one match of `old_str`. If there are more or fewer matches, the model is shown an appropriate error message for it to retry." — poka-yoke (uniqueness check) + instructive error in one mechanism.

### B. The error and truncation examples from "Writing effective tools" (transcribed from the post's images) [G20]

The post shows these only as screenshots; transcribed on 2026-09-30 from the image files (VERBATIM text of the images).

Truncated response that steers the agent:
```
stripe - transactions_search (MCP)(limit: 5000, responseFormat: "concise")
## Transaction Search Results
Found **2,847 transactions** matching your query.
The results are truncated. Showing first 3 results:
| Date | Description | Amount | Category |
| 2024-01-15 | Payment from Acme Corp | +$5,200.00 | Revenue |
| 2024-01-14 | Payment from TechStart | +$3,100.00 | Revenue |
| 2024-01-13 | Payment from Cloud Co. | +$3,100.00 | Revenue |
**Summary of all 2,847 results:**
- Total Revenue: $458,291.00
- Date Range: Jan 1 - Jan 15, 2024
## To refine these results, you can:
- **Search for specific vendors**: Use `transactions_search(payee: "Acme Corp")` to see only Acme Corp charges
- **Filter by amount range**: Use `transactions_search(minAmount: 1000, maxAmount: 5000)`
- **Get next page**: Use `transactions_search(query: <query>, page: 2)`
```
Unhelpful error:
```json
asana - user_info (MCP)(userId: "john.doe@acme.corp")
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "status": 422,
    "message": "Invalid value",
    "details": { "field": "userId", "value": "john.doe@acme.corp", "type": "invalid_value" }
  }
}
```
Helpful error:
```
asana - user_info (MCP)(userId: "john.doe@acme.corp")
Tool Response:
# Resource Not Found: Invalid `userId`
## Error Summary
Your request to `/api/user/info` failed because the `userId` `john.doe@acme.corp` does not exist or is in the wrong format.
## Valid User IDs
Examples:
- `1928298149291729`
- `9381719375914731`
## Resolving a User ID
- Call user_search()
```
Pattern: the helpful error names the wrong field, gives the valid format by example, and names the next tool to call. The truncated response reports the total, a summary, and the exact follow-up calls.

### C. MCP 2026-07-28: tool names, state handles, error channels [G16]

Tool names (VERBATIM list): "Tool names **SHOULD** be between 1 and 128 characters in length (inclusive). Tool names **SHOULD** be considered case-sensitive. The following **SHOULD** be the only allowed characters: uppercase and lowercase ASCII letters (A-Z, a-z), digits (0-9), underscore (\_), hyphen (-), and dot (.) ... Tool names **SHOULD** be unique within a server." Examples: `getUser`, `DATA_EXPORT_v2`, `admin.tools.list`. Collisions across servers: clients/proxies "**SHOULD** implement a disambiguation strategy such as prefixing tool names with a server identifier"; the server `name` from `serverInfo` "**SHOULD NOT** be relied upon for disambiguation".

Explicit state handles (VERBATIM wire example):
```jsonc
// → tools/call
{ "name": "create_basket", "arguments": {} }

// ← result
{
  "content": [{ "type": "text", "text": "Created basket bsk_a1b2c3" }],
  "structuredContent": { "basket_id": "bsk_a1b2c3" }
}

// → tools/call
{
  "name": "add_item",
  "arguments": { "basket_id": "bsk_a1b2c3", "sku": "..." }
}
```
Handle design rules (paraphrase of the four bullets, [G16]): authorization checked against the handle on every call ("a handle is a name, not a capability"); opaque, not structured; lifetime stated in the creating tool's description ("baskets expire after 24 hours of inactivity"); expired/unknown handle returns a tool execution error so the model can recreate it.

Tool execution error (VERBATIM, note `resultType`):
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "resultType": "complete",
    "content": [
      {
        "type": "text",
        "text": "Invalid departure date: must be in the future. Current date is 08/08/2025."
      }
    ],
    "isError": true
  }
}
```
Security SHOULDs for clients now also include "Follow the `$ref` resolution requirements when validating tool inputs and outputs" [G16].

### D. Claude-side mechanics the other notes skip

**Tool-use system prompt** (VERBATIM template, [G4]):
```text
In this environment you have access to a set of tools you can use to answer the user's question.
{{ FORMATTING INSTRUCTIONS }}
String and scalar parameters should be specified as is, while lists and objects should use JSON format. Note that spaces for string values are not stripped. The output is not expected to be valid XML and is parsed with regular expressions.
Here are the functions available in JSONSchema format:
{{ TOOL DEFINITIONS IN JSON SCHEMA }}
{{ USER SYSTEM PROMPT }}
{{ TOOL CONFIGURATION }}
```
Consequence for design: tool definitions sit *before* the user system prompt, so they are the most cache-sensitive part of a request. `tool_choice` changes also "invalidate cached message blocks" [G4].

**PTC, current request shape** (VERBATIM, [G2]):
```json
"tools": [
    {
        "type": "code_execution_20260120",
        "name": "code_execution"
    },
    {
        "name": "query_database",
        "description": "Execute a SQL query against the sales database. Returns a list of rows as JSON objects.",
        "input_schema": {
            "type": "object",
            "properties": {
                "sql": {
                    "type": "string",
                    "description": "SQL query to execute"
                }
            },
            "required": ["sql"]
        },
        "allowed_callers": ["code_execution_20260120"]
    }
]
```
Tip (VERBATIM): "Choose either `["direct"]` or `["code_execution_20260120"]` for each tool rather than enabling both, as this provides clearer guidance to Claude for how best to use the tool." Implication for tool design: a PTC-only tool should return machine-parseable output (JSON rows) because code, not the model, reads it; a direct tool should return model-readable text.

**Mid-conversation tool changes** (beta, `inline-tools-2026-09-15`) [G11]. Motivation (VERBATIM): "The `tools` array sits even earlier in the hashed request prefix than the top-level `system` field, so editing it invalidates the prompt cache for the entire conversation." Removal (VERBATIM):
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
Addition of a tool not declared in `tools` (VERBATIM):
```json
"type": "tool_addition",
"tool": {
  "type": "tool_definition",
  "definition": {
    "name": "db_query",
    "description": "Run a read-only SQL query against the analytics database.",
    "input_schema": {
      "type": "object",
      "properties": { "sql": { "type": "string" } },
      "required": ["sql"]
    }
  }
}
```
A tool declared with `defer_loading: true` is "withheld until a `tool_addition` block surfaces it" [G11]. Available on Fable 5.1, Mythos 5.1, Fable 5, Mythos 5, Opus 5.5, Opus 4.8, Opus 5, Sonnet 5.5 [G11]. The July-2026 release note named the header `mid-conversation-tool-changes-2026-07-01`; the current page names `inline-tools-2026-09-15` [G10][G11] — check the header before writing code.

**Retries**: "If a tool request is invalid or missing parameters, Claude will retry 2-3 times with corrections before apologizing to the user." [G5]

**Result ordering**: tool_result blocks "must come FIRST in the content array. Any text must come AFTER all tool results"; if the assistant turn also called a server tool with no result yet, "the user message must contain only `tool_result` blocks" [G5].

### E. OpenAI function-calling features missing from the notes [G13][G14]

**Custom tools with free-form input** (VERBATIM):
```python
response = client.responses.create(
    model="gpt-6-astra",
    input="Use the code_exec tool to print hello world to the console.",
    tools=[
        {
            "type": "custom",
            "name": "code_exec",
            "description": "Executes arbitrary Python code.",
        }
    ],
)
```
Output item (VERBATIM): `{"type": "custom_tool_call", "status": "completed", "call_id": "call_aGiFQkRWSWAIsMQ19fKqxUgb", "input": "print(\"hello world\")", "name": "code_exec"}`. Rationale (VERBATIM): "This is useful to avoid unnecessarily wrapping a response in JSON, or to apply a custom grammar to the response." This is the vendor implementation of Anthropic's 2024 advice to avoid "string-escaping any code it writes".

**Grammar-constrained custom tool** (VERBATIM):
```python
grammar = """
start: expr
expr: term (SP ADD SP term)* -> add
| term
term: factor (SP MUL SP factor)* -> mul
| factor
factor: INT
SP: " "
ADD: "+"
MUL: "*"
%import common.INT
"""
tools=[{"type": "custom", "name": "math_exp", "description": "Creates valid mathematical expressions",
        "format": {"type": "grammar", "syntax": "lark", "definition": grammar}}]
```
Constraints: sampling via LLGuidance; unsupported Lark features include lookarounds, lazy modifiers, terminal priorities, templates, non-common imports, `%declare`; terminal regex uses Rust `regex` crate syntax, not Python `re`; "The OpenAI API may return an error if the grammar is too complex".

**Best-practice list additions not in spec.md**: "Use the system prompt to describe when (and when not) to use each function"; "Make the functions predictable and intuitive (principle of least surprise)"; "Evaluate your performance with different numbers of functions"; "Consider fine-tuning to increase function calling accuracy for large numbers of functions" [G13]. `tool_choice` with tool search "still applies to the tools that are currently callable in the turn" [G13].

**Tool search namespace example** (VERBATIM excerpt, Responses API):
```json
{"type": "function", "name": "list_open_orders", "description": "List open orders for a customer ID.",
 "defer_loading": true,
 "parameters": {"type": "object", "properties": {"customer_id": {"type": "string"}},
                "required": ["customer_id"], "additionalProperties": false}}
```
with `tools=[crm_namespace, {"type": "tool_search"}]`. "For namespaces, `defer_loading` applies to the functions inside the namespace, not to the namespace object itself." "When new tools are discovered by the model, they are injected at the end of the context window." [G14]

### F. Gemini function calling (missing entirely from the notes) [G15]

Best practices (VERBATIM list): "Function and Parameter Descriptions: Be clear and specific. Naming: Use descriptive names without spaces or special characters. Strong Typing: Use specific types (integer, string, enum). Tool Selection: Keep active set to 10-20 tools maximum. Prompt Engineering: Provide context and instructions. Validation: Validate function calls before executing. Error Handling: Implement robust error handling. Security: Use appropriate authentication for external APIs."

Known failure and its tool-design fix: if the prompt makes the model emit structured text (e.g. `<UPDATE>...</UPDATE>`) right before a tool call, "the tool call may occasionally fail with `Malformed_Function_Call`". "PREFERRED: Instruct the model to put its pre-tool notes inside a dedicated `update()` function call instead of raw text" — i.e. convert a free-text protocol into a tool (VERBATIM declaration start):
```json
{
  "name": "update",
  "description": "Update working notes (previous step analysis, plan, next step, external note).",
  "parameters": {
    "type": "OBJECT",
    "properties": {
      "previous_step": {"type": "STRING", "description": "Key findings and outcomes since the previous step."},
      "plan": {"type": "STRING", "description": "The current status of the plan."}
```
(truncated in source excerpt read; further properties `next_step`, `external` per the instruction text).

### G. Confirmations and idempotency — concrete mechanisms

- **MCP spec** [G16]: clients SHOULD "Prompt for user confirmation on sensitive operations" and "Show tool inputs to the user before calling the server". Annotations are hints; defaults assume worst case (`destructiveHint: true`, `idempotentHint: false`, `openWorldHint: true`) [G19].
- **Claude Code server-side flag** [G12]: `_meta["anthropic/requiresUserInteraction"]: true` → prompt on every call even in `acceptEdits`, `auto`, `bypassPermissions`; allow rules don't skip it; in `dontAsk` mode the call is denied; requires Claude Code v2.1.199+. VERBATIM:
```json
{
  "name": "grant_access",
  "description": "Requests access to a protected resource",
  "_meta": {
    "anthropic/requiresUserInteraction": true
  }
}
```
- **OpenAI Agents SDK** [G43] (VERBATIM):
```python
@tool(needs_approval=True)
async def cancel_order(order_id: int) -> str:
    return f"Cancelled order {order_id}"


async def requires_review(_ctx, params, _call_id) -> bool:
    return "refund" in params.get("subject", "").lower()


@tool(needs_approval=requires_review)
async def send_email(subject: str, body: str) -> str:
    return f"Sent '{subject}'"
```
Paused runs surface `ToolApprovalItem`s in `result.interruptions`; resume via `RunState` `approve(...)`/`reject(...)`. "Callable approval rules fail closed when the SDK cannot safely inspect the arguments" (missing/malformed JSON etc.) [G43].
- **Claude Managed Agents** (2026-09-10): permission policy `auto` — "the server evaluates each agent or MCP tool call and runs it, denies it, or pauses for your approval" [G10].
- **Claude Code auto mode** [G24]: a transcript classifier (Sonnet 4.6) gates tool calls; it sees "only user messages and the executable payload"; denials return "as a tool result along with an instruction to treat the boundary in good faith: find a safer path"; "If a session accumulates 3 consecutive denials or 20 total, we stop the model and escalate to the human"; measured FPR 0.4%. This is "errors that instruct the model" applied to policy denials.
- **Idempotency keys** (primary pattern the agent-tool literature borrows, Stripe [G44]): the server saves "the resulting status code and body of the first request made for any given idempotency key, regardless of whether it succeeds or fails"; keys up to 255 characters; prunable after 24 hours; "The idempotency layer compares incoming parameters to those of the original request and errors if they're not the same". COMPOSED design implication for agent tools: for a non-idempotent tool (`send_payment`, `create_ticket`), accept an `idempotency_key` argument or derive one server-side from (conversation id, tool_use_id), so harness retries, PTC retries after `TimeoutError`, and model self-retries (2–3 times, [G5]) cannot double-execute. No vendor doc read in this pass prescribes this for LLM tools explicitly — mark as COMPOSED guidance.

### H. What real MCP servers get wrong — measured, not anecdotal

- **Description quality** [G32]: 856 tools, 103 servers; rubric of six components (Purpose, Guidelines, Limitations, Parameter Explanation, Length & Completeness, Examples); smells = Unclear Purpose, Missing Usage Guidance, Unstated Limitation, Opaque Parameters, Underspecified or Incomplete, Exemplar Issues. 97.1% have ≥1 smell; 56% Unclear Purpose. Augmenting all components (evaluated on MCP-Universe: 231 tasks, 18 servers, 202 tools; models GPT-4.1, Qwen3-Coder-480B-A35B, GLM-4.5): +5.85 pp median success, +15.12% partial goal completion, +67.46% execution steps, regressions in 16.67% of cases; "compact variants of different component combinations often preserve behavioral reliability while reducing unnecessary token overhead". The rubric's length rule mirrors Anthropic's: "at least three to four sentences".
- **Endpoint wrapping** [G36]: 116 official servers; 88.6% fully or partially REST-backed; "92% implementing tools as bare API wrappers"; median 19% of available operations exposed; auto-generation from 80 OpenAPI contracts succeeds for 76% of tools, 94.2% after automated spec repair; filtering + regrouping cuts median tool count per API by one-third.
- **Descriptions that lie** [G33][G34]: DCI in 9.93% of 19,200 description-code pairs from 2,214 servers (taxonomy: functionality inconsistencies + undeclared side effects); ~13% of 10,240 servers show "substantial mismatches that can enable undocumented privileged operations, hidden state mutations, or unauthorized financial actions".
- **Servers that don't run / skip annotations** [G35]: random draw of 400 npm/stdio servers from a 24,135-server census: 48.8% complete an `initialize` handshake (66.7% for a hand-curated frame); 37.5% never start; 13.3% fail on missing credentials; among 195 running servers, zero fatal JSON Schema violations across 2,766 tools; optional safety annotations omitted on 58.8% of tools (41.5% curated); near-duplicate descriptions 2.8% (all within single servers). Also a benchmark caveat: BFCL v4 shows 16.7% near-duplication and "68.8% of raw BFCL rows ... are exact name-plus-description repeats".
- **Default tool bloat** [G30]: github-mcp-server VERBATIM table: "Number of Tools | 101 tools | 52 tools | 50 tools (49% reduction)"; "Token Usage | 64.6k tokens | 30.3k tokens | 34.3k tokens (53% reduction)"; defaults chosen from "real-world usage data" (context, repos, issues, pull_requests, users). Note the table's own arithmetic says 50 tools removed while 101−52 = 49.
- **Silent partial results** [G42]: vendor benchmark (Stainless, Increase banking API, 31 cases) shows the failure mode that pagination/truncation design must prevent: a Code Mode server "found only 5 of the 8 payments and reported $98,306.02 — a $42,274 shortfall with no indication that results might be incomplete." Lesson for response shaping: always state totals and truncation, as in the Anthropic truncation example (§B).

### I. Bash/CLI vs MCP — the primary measurements [G26][G27][G28]

- Eval design [G26]: 3 tasks (LLDB debugging, Python REPL, project analysis in OpenCode's TUI) × 4 tools (terminalcp MCP, terminalcp CLI, tmux, screen) × 10 runs = 120 runs, fresh Claude Code instance per run.
- Results (VERBATIM): "Both terminalcp MCP and CLI versions achieved 100% success rates. The MCP version was 23% faster (51m vs 66m) and 2.5% cheaper ($19.45 vs $19.95)." "Screen had 0% success on the project analysis task ... dropped its overall success rate to 67%." "For simpler tasks (LLDB debugging, Python REPL), tmux actually beats terminalcp on cost by 10-22%. But for complex tasks ... terminalcp's cleaner output gives it a 39% cost advantage over tmux."
- Design choices behind the winner (VERBATIM): "The server replies with plain text, not JSON ... The MCP server exposes a single terminalcp tool instead of one per command"; `stdout` returns "just the last N lines", `stream` supports `since_last` and ANSI stripping — i.e. consolidation (`action` param) + response filtering.
- Conclusion (VERBATIM): "if you're building a tool from scratch and your users already have a shell tool available, just make a good CLI ... Once you have a well-designed, token-efficient CLI tool, adding an MCP server on top of it is very straightforward."
- Progressive-disclosure numbers [G27]: "Playwright MCP has 21 tools using 13.7k tokens (6.8% of Claude's context). Chrome DevTools MCP has 26 tools using 18.0k tokens (9.0%)"; his README for equivalent scripts "has a whopping 225 tokens".
- Pi [G28]: four default tools read/write/edit/bash; "pi does not and will not support MCP"; points to Peter Steinberger's `mcporter` for wrapping MCP servers as CLIs; Terminal-Bench 2.0 run with Claude Opus 4.5 submitted (results file linked, not re-verified here).
- Field sentiment 2026-09 [G47] ("Ask HN: Who is using MCP in production?", 198 points, 201 comments): recurring answers — CLIs/APIs "waaay cheaper and faster" for developers with a shell; MCP valued for cross-system aggregation ("in-house MCP for log/metrics search across five different (legacy) systems") and for reaching chat hosts without a shell (ChatGPT, Claude, Grok, Perplexity, Mistral).

### J. Evaluating tools — additions

- Anthropic's tool-testing agent (VERBATIM, [G23]): "when given a flawed MCP tool, it attempts to use the tool and then rewrites the tool description to avoid failures. By testing the tool dozens of times, this agent found key nuances and bugs. This process for improving tool ergonomics resulted in a 40% decrease in task completion time for future agents using the new description". Same post: "Bad tool descriptions can send agents down completely wrong paths, so each tool needs a distinct purpose and a clear description."
- Metrics: use pass^k for customer-facing tool agents — "If your agent has a 75% per-trial success rate and you run 3 trials, the probability of passing all three is (0.75)³ ≈ 42%" [G52]. Grade outcomes; the post's example grader spec includes tool-call expectations like `{tool: read_file, params: {path: "src/auth/*"}}` [G52].
- Research on automated description rewriting: Trace-Free+ "improves robustness as tool catalogs scale to 150+ candidates — in scaling experiments, reducing accuracy degradation by 29.23% and improving average query-level success by 60.89% on StableToolBench" [G37].
- Retrieval over tools: RAG-MCP "more than triples tool selection accuracy (43.13% vs 13.62% baseline)" and cuts prompt tokens "by over 50%" in an MCP stress test [G38].

## Numbers

| Number | Conditions | Source |
|---|---|---|
| 286 / 290 / 497 / 675 tokens | Tool-use system prompt, `tool_choice` auto/none: Opus 5.5 & Sonnet 5.5 (286), Opus 4.8 (290), Sonnet 4.6 & Opus 4.6 (497), Opus 4.7 (675); any/tool on Opus 4.7 = 804 | G9 |
| 20 / 24 / 16 | Max strict tools per request / total optional params / total union-typed params across strict schemas, Claude API | G8 |
| 24 h | Compiled strict grammars cached from last use | G8 |
| 10,000 | Max deferred tools per request (Claude tool search) | G1 |
| 5 (default), 1–10,000 | Tool search results per query | G1 |
| ~4 min (270 s) / ~5 min / 30 days | PTC pending-call timeout / idle container reclaim / max container reuse age | G2 |
| 90 s | Per-cell execution limit disclosed by `code_execution_20260521` | G10 |
| 25,000 tokens / 10,000 tokens / 500,000 chars | Claude Code MCP output default max / warning threshold / `anthropic/maxResultSizeChars` ceiling | G12 |
| 10% | Claude Code `ENABLE_TOOL_SEARCH=auto` threshold (share of context) | G12 |
| 2–3 | Claude retries of invalid/missing-parameter tool calls before apologizing | G5 |
| 1–128 chars | MCP tool-name length (SHOULD) | G16 |
| +11% avg, −24% input tokens | Dynamic filtering (code execution filters web results), Sonnet 4.6 & Opus 4.6, BrowseComp + DeepSearchQA; BrowseComp Sonnet 33.3→46.6%, Opus 45.3→61.6%; price-weighted tokens up for Opus 4.6 | G25 |
| 0.570 vs 0.370 pass^1 | Think tool + optimized prompt vs baseline, τ-bench airline, Claude 3.7 Sonnet (2025; now superseded by extended thinking) | G22 |
| +1.6% avg | Think tool on SWE-bench, n=30 vs n=144 (Welch t(38.89)=6.71, p<.001) | G22 |
| 49% | SWE-bench Verified, Claude 3.5 Sonnet (new), 2 tools (bash, str_replace_editor), Jan 2025 | G21 |
| 40% | Decrease in task completion time after a tool-testing agent rewrote a flawed MCP tool's description | G23 |
| up to 90% | Research-time cut from parallel subagents (3–5) + 3+ parallel tool calls per subagent | G23 |
| 97.1% / 56% | MCP tool descriptions with ≥1 smell / with Unclear Purpose (856 tools, 103 servers) | G32 |
| +5.85 pp / +67.46% steps / 16.67% regress | Effect of fully augmented descriptions on MCP-Universe | G32 |
| 92% / 19% | Official MCP servers that are bare API wrappers / median share of API operations exposed (116 servers) | G36 |
| 9.93% | Description-code pairs inconsistent (19,200 pairs, 2,214 servers) | G33 |
| ~13% | Servers with substantial description-code mismatch (10,240 servers) | G34 |
| 48.8% / 58.8% | Random-draw MCP servers completing `initialize` / tools omitting optional safety annotations | G35 |
| 101→52 tools; 64.6k→30.3k tokens | github-mcp-server default toolsets, 2025-10-06 | G30 |
| 21 tools/13.7k; 26 tools/18.0k; 225 tokens | Playwright MCP; Chrome DevTools MCP; Zechner's CLI README | G27 |
| 100% vs 100%; 51m vs 66m; $19.45 vs $19.95 | terminalcp MCP vs CLI, 120 runs, Claude Code, Aug 2025 | G26 |
| 43.13% vs 13.62% | RAG-MCP vs all-tools baseline, tool selection accuracy | G38 |
| −1% to −8% | Accuracy drop when toolkit grows from avg 2.7 to 5.6 related tools (BFCL subset, 200 cases; e.g. Claude-3.5-Sonnet 0.915→0.890, gpt4o-mini 0.925→0.870, Granite3.1-8B 0.945→0.870) | G39 |
| −8% to −19% | Same study, rephrased queries (e.g. Granite −19%, Claude-3.5-Sonnet −8%) | G39 |
| 91%→87% | Haiku 4.5 tool selection, 10 vs 15 tools; Sonnet 4 ≥90% to 20 tools, <90% by 30 (practitioner, 15 production servers) | G45 |
| 99.2% context / ~50% cost / 5 min→1–2 min | agent-swarm: one data-gathering step vs end-to-end daily run; ~150 scripts, ~25,000 executions in 30 days | G41 |
| 98/95/53% vs 94/82/46% vs 90/95/43% vs 70/86/33% | Completeness/Efficiency/Factuality: Stainless SDK code mode vs Anthropic PTC+tool_search vs Cloudflare code mode vs dynamic meta-tools; vendor benchmark, 31 cases | G42 |
| 110,701 | GitHub stars of badlogic/pi-mono, 2026-09-30 | G29 |

## Pitfalls, limits, criticism

- **Tool edits break caching.** Adding/removing a tool mid-session invalidates the whole cached conversation unless you use `defer_loading` or the beta `tool_addition`/`tool_removal` blocks [G3][G11]. MCP servers that reorder `tools/list` between calls do the same; 2026-07-28 says SHOULD return a deterministic order [G17].
- **Strict ≠ validation.** Strict mode cannot express numeric ranges or length limits [G8]; the tool must still validate and return an instructive execution error [G16].
- **PTC/strict/forced-choice interplay.** On newest Claude models forced tool use is gone, strict is the replacement, but strict tools can't be PTC-callable [G2][G4]. A tool meant for code orchestration and one meant for strict direct calls may need to be two tools.
- **Deferred tools still cost tokens on OpenAI.** Name + description of each deferred function stay visible [G14]; namespace-level deferral is the saving.
- **Vendor-reported code-mode gains are step-level.** End-to-end savings measured in production were ~50% cost, not 99% [G41]; Opus 4.6 price-weighted tokens rose with dynamic filtering [G25].
- **Sandboxes are part of the tool surface.** Code Mode escape via prompt injection [G31]; self-hosted workerd must be ≥ v1.20260619.1.
- **More description is not monotonically better.** +67.46% steps and 16.67% regressions after full augmentation [G32].
- **Descriptions and annotations are unverified claims** from the server author [G19][G33][G34][G35] — cross-link ch. 16.
- **Benchmarks over-count tools.** BFCL raw rows are 68.8% exact repeats [G35]; tool-count/accuracy numbers from BFCL-derived studies (incl. G39) inherit this.
- **Anecdote, flagged**: a 2026-09-26 HN post claims a Codex task spawned 826 child agents costing ~USD 78,000; a top reply says the submission "appears to be highly vote-manipulated" [G48]. Do not cite as an incident; it is only an illustration of why spend caps and approval gates on agent-spawning tools matter.

## What changed in the last 6 months (2026-03-30 → 2026-09-30), not covered in the other files

- 2026-06-11/18: new code-execution versions; PTC now requires `code_execution_20260120`+ [G10].
- 2026-07-24 → 2026-09-22: mid-conversation tool changes (beta), later folded under `inline-tools-2026-09-15` with inline `tool_definition` [G10][G11].
- 2026-08-19: `computer_toolset_20260801` GA (batch actions, per-member `configs`), new `browser_toolset_20260801`; client toolsets reject `strict`, `input_examples`, PTC callers [G3][G10].
- 2026-09-01 → 09-28: forced tool use removed on Fable 5.1, Mythos 5.1, Opus 5.5, Sonnet 5.5 [G10].
- 2026-09-10: Managed Agents `auto` permission policy [G10].
- 2026-08-07: Check Point workerd/Code Mode exploit chain disclosed (fixed) [G31].
- 2026-06 → 2026-09: a burst of empirical MCP-ecosystem studies (DCI, random registry draw, description smells v3) that gives the chapter measured numbers for "typical mistakes" [G32][G33][G35].
- Claude Code: tool search on by default, `_meta` keys `anthropic/maxResultSizeChars`, `anthropic/requiresUserInteraction` (v2.1.199+), `anthropic/alwaysLoad`; large results persisted to disk [G12].

## Diagram candidates

1. **Cache prefix map** — boxes in hash order: `tools` → `system` → messages; arrows: "edit tools → whole cache invalid"; alternative paths: `defer_loading` (tool expanded inline in body), `tool_addition` in a `role: system` message (append-only). Source G3, G11, G4.
2. **MCP error routing (2026-07-28)** — tools/call → server validates → branch: unknown tool / malformed → JSON-RPC error (model may not see it); bad args / business rule / upstream API failure → `result{isError:true, text}` → client → LLM → corrected retry. Source G16, G18.
3. **State handle lifecycle** — `create_basket` → `basket_id` (opaque, TTL in description) → `add_item(basket_id)` ×N → expiry → execution error "handle expired" → model calls `create_basket` again; server checks authz on every call. Source G16.
4. **Deferred loading, two vendors side by side** — Anthropic: deferred tool invisible; search over names/descriptions/args → `tool_reference` → expanded inline. OpenAI: function name+description visible, schema deferred; namespace fully hidden → `tool_search` → injected at end of context; hosted vs client-executed branch. Source G1, G3, G14.
5. **Confirmation gate stack** — model emits tool_use → (1) server `_meta requiresUserInteraction` / SDK `needs_approval` → (2) harness classifier (auto mode) → (3) human prompt → execute; denial returns as tool_result with guidance; 3 consecutive / 20 total denials → escalate. Source G12, G24, G43.
6. **Idempotent side-effect tool** (COMPOSED from G44 + G5 + G2) — model → tool(`idempotency_key`) → server stores first result per key → harness retry / PTC TimeoutError retry / model self-retry → same stored result; different params with same key → error.
7. **Truncation that steers** — a tool response box split into: total count, 3 sample rows, summary aggregates, "to refine" next-call list with exact signatures. Source G20 (transcribed image).
8. **Helpful vs unhelpful error** — two tool_result boxes (JSON 422 vs Markdown with valid examples and `user_search()` pointer) feeding the next model step (dead end vs recovery). Source G20.
9. **Tool-description smell rubric** — six components as a radar chart: Purpose, Guidelines, Limitations, Parameter Explanation, Length & Completeness, Examples; overlay "56% fail Purpose". Source G32.
10. **CLI vs MCP decision tree** — does the host have a shell? → yes: CLI + README (progressive disclosure), optionally MCP wrapper; no (chat hosts) or cross-system aggregation or needs auth/audit → MCP server with few consolidated tools. Source G26, G27, G47.
11. **Strict schema budget** — gauge bars: strict tools 0–20, optional params 0–24, union params 0–16, with a note "sum across all strict tools in the request". Source G8.

Chart candidates (real series):
- Tool-use system-prompt tokens by Claude model (auto/none): Opus 5.5 286, Sonnet 5.5 286, Opus 5 286, Opus 4.8 290, Sonnet 5 354, Opus 4.5 496, Sonnet 4.5 496, Haiku 4.5 496, Opus 4.6 497, Sonnet 4.6 497, Opus 4.7 675 [G9].
- MCP ecosystem quality bars: 97.1% smelly descriptions, 92% bare wrappers, 58.8% missing safety annotations (random draw), 51.2% fail to start/handshake (100−48.8), 9.93% DCI pairs, ~13% DCI servers [G32][G33][G34][G35][G36].
- IBM toolkit-expansion drop per model (original → expanded toolkit AST score): Llama3.1-70B 0.965→0.925, Llama3.3-70B 0.945→0.905, DeepSeek-V2.5 0.965→0.950, Qwen2.5-72B 0.975→0.965, Granite3.1-8B 0.945→0.870, Claude-3.5-Haiku 0.925→0.870, Claude-3.5-Sonnet 0.915→0.890, gpt4o-mini 0.925→0.870, o1-mini 0.905→0.885 [G39].
- terminalcp eval: MCP vs CLI time (51 vs 66 min) and cost ($19.45 vs $19.95), tmux ~$22 [G26].
- Code-mode claim vs end-to-end: step context −99.2% vs run cost ~−50% vs run time 5 → 1–2 min [G41].

## Glossary

- **Tool Execution Error (MCP)**: a normal `tools/call` result with `isError: true` carrying actionable text; since 2025-11-25 the channel for input-validation failures [G16][G18].
- **State handle**: a server-minted opaque string returned by a creation tool and passed back as an argument, replacing protocol sessions in MCP 2026-07-28 [G16].
- **`resultType`**: required field on every MCP 2026-07-28 result, `"complete"` or `"input_required"` [G17].
- **`tool_addition` / `tool_removal`**: Claude content blocks inside a `role: "system"` message that add or withdraw tools mid-conversation without breaking the cache (beta) [G11].
- **Client toolset**: an Anthropic-defined bundle (`computer_toolset_20260801`, `browser_toolset_20260801`) declared as one `tools` entry, executed by your app, dispatched on `toolset_name` + `name` [G3].
- **`eager_input_streaming`**: per-tool flag for fine-grained streaming of tool inputs (user-defined tools only) [G3].
- **Custom tool (OpenAI)**: `"type": "custom"` tool whose input is free text, optionally constrained by a Lark or regex grammar [G13].
- **`validated` mode (Gemini)**: `tool_choice` mode where the model "ensures function schema adherence" [G15].
- **Description smell**: a rubric-detected defect in a tool description (Unclear Purpose, Missing Usage Guidance, Unstated Limitation, Opaque Parameters, Underspecified, Exemplar Issues) [G32].
- **DCI (description-code inconsistency)**: a tool whose description does not match what its code does, including undeclared side effects [G33].
- **Idempotency key**: client-generated unique key that makes a retried write return the stored first result instead of executing again [G44].
- **pass^k**: probability that all k trials succeed; the reliability metric for customer-facing tool agents [G52].
- **Think tool**: a no-op tool whose only argument is a thought; now superseded by extended thinking in Anthropic's guidance [G22].
- **`requiresUserInteraction`**: Claude Code `_meta` flag forcing a human approval prompt on every call of a tool [G12].

## Unverified / open questions

- **OpenAI Structured Outputs "100% vs <40%"**: openai.com returned HTTP 403 to curl and WebFetch; the figure is absent from current developers.openai.com function-calling and structured-outputs pages (text search). Unverified as of today; original is the 2024-08-06 launch post.
- **Pi "54k→98k stars in three months"**: no source found; the only verified figure is 110,701 stars on 2026-09-30 [G29]. Star history over time not fetched (GitHub REST API rate-limited for unauthenticated curl; `gh` used only for the current count).
- **Mid-conversation tool changes header**: release notes 2026-07-24 say `mid-conversation-tool-changes-2026-07-01`; the current page says `inline-tools-2026-09-15` "also covers" inline definitions [G10][G11]. Whether the July header still works was not tested.
- **Gemini `update()` declaration**: only the first two properties were in the excerpt read; `next_step` and `external` are inferred from the instruction text in the same section.
- **DSPy/GEPA or other optimizers for tool descriptions**: not researched in this pass (web search budget for the session was exhausted: "this session has used its web search budget (200 of 200 WebSearch calls)"). arXiv API and direct fetches were used instead.
- **Cloudflare Code Mode 32%/81%** (flagged in spec.md): not re-searched here; still unverified.
- **Codex USD 78,000 incident** [G48]: single self-report, flagged as possibly vote-manipulated in-thread; unverified.
- **Browserbase "Roughly 88% less context"** (2026-07-22): the post itself calls it "a rough estimate" — not used as a number.
- **Terminal-Bench 2.0 result for Pi**: results file referenced in [G28], leaderboard not fetched.
- **Whether Anthropic still recommends "3–4 sentences"** as a floor for every tool: yes in current docs [G4]; the MCP-smells ablation suggests compact variants can match full ones [G32] — an open tension worth one paragraph in the chapter, not a settled answer.

## Sources

- [G1] "Tool search tool." Claude Platform Docs. Undated living page. https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool.md — accessed 2026-09-30.
- [G2] "Programmatic tool calling." Claude Platform Docs (frontmatter `status: ga`). https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling.md — accessed 2026-09-30.
- [G3] "Tool reference." Claude Platform Docs. https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-reference.md — accessed 2026-09-30.
- [G4] "Define tools." Claude Platform Docs. https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools.md — accessed 2026-09-30.
- [G5] "Handle tool calls." Claude Platform Docs. https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls.md — accessed 2026-09-30.
- [G6] "Parallel tool use." Claude Platform Docs. https://platform.claude.com/docs/en/agents-and-tools/tool-use/parallel-tool-use.md — accessed 2026-09-30.
- [G7] "Strict tool use." Claude Platform Docs. https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use.md — accessed 2026-09-30.
- [G8] "Structured outputs" (JSON Schema limitations; schema complexity limits). Claude Platform Docs. https://platform.claude.com/docs/en/build-with-claude/structured-outputs.md — accessed 2026-09-30.
- [G9] "Tool use with Claude" (overview; Pricing section). Claude Platform Docs. https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview.md — accessed 2026-09-30.
- [G10] "Release notes" (Claude Platform). Entries dated 2025-11-14 through 2026-09-28. https://platform.claude.com/docs/en/release-notes/overview.md — accessed 2026-09-30.
- [G11] "Mid-conversation system messages" (incl. mid-conversation tool changes). Claude Platform Docs. https://platform.claude.com/docs/en/build-with-claude/mid-conversation-system-messages.md — accessed 2026-09-30.
- [G12] "Connect Claude Code to tools via MCP." Claude Code Docs. https://code.claude.com/docs/en/mcp.md — accessed 2026-09-30.
- [G13] "Function calling." OpenAI API docs (markdown version). Undated living page. https://developers.openai.com/api/docs/guides/function-calling.md — accessed 2026-09-30.
- [G14] "Tool search." OpenAI API docs. https://developers.openai.com/api/docs/guides/tools-tool-search.md — accessed 2026-09-30.
- [G15] "Function calling with the Gemini API." Google AI for Developers. https://ai.google.dev/gemini-api/docs/function-calling.md.txt — accessed 2026-09-30.
- [G16] Model Context Protocol specification, "Tools," revision 2026-07-28. https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/main/docs/specification/2026-07-28/server/tools.mdx — accessed 2026-09-30.
- [G17] MCP "Key Changes," revision 2026-07-28. https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/main/docs/specification/2026-07-28/changelog.mdx — accessed 2026-09-30.
- [G18] MCP "Key Changes," revision 2025-11-25. https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/main/docs/specification/2025-11-25/changelog.mdx — accessed 2026-09-30.
- [G19] MCP `schema.ts`, revision 2026-07-28 (`ToolAnnotations`, `Tool`). https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/main/schema/2026-07-28/schema.ts — accessed 2026-09-30.
- [G20] "Writing effective tools for agents — with agents." Anthropic Engineering. Published 2025-09-11. https://www.anthropic.com/engineering/writing-tools-for-agents (images transcribed: www-cdn.anthropic.com/images/4zrzovbb/website/e440d6a6…-1920x1162.png, 24451879…-1920x733.png, 810661bd…-1920x850.png) — accessed 2026-09-30.
- [G21] "Claude SWE-Bench Performance" (Raising the bar on SWE-bench Verified with Claude 3.5 Sonnet). Anthropic Engineering. Published 2025-01-06. https://www.anthropic.com/engineering/swe-bench-sonnet — accessed 2026-09-30.
- [G22] "The 'think' tool: Enabling Claude to stop and think." Anthropic Engineering. Published 2025-03-20 (with later "Extended thinking update" note, undated). https://www.anthropic.com/engineering/claude-think-tool — accessed 2026-09-30.
- [G23] "How we built our multi-agent research system." Anthropic Engineering. Published 2025-06-13. https://www.anthropic.com/engineering/multi-agent-research-system — accessed 2026-09-30.
- [G24] "How we built Claude Code auto mode: a safer way to skip permissions." Anthropic Engineering. Published 2026-03-25. https://www.anthropic.com/engineering/claude-code-auto-mode — accessed 2026-09-30.
- [G25] "Improved web search with dynamic filtering." Claude blog (Anthropic). Published 2026-02-17. https://claude.com/blog/improved-web-search-with-dynamic-filtering — accessed 2026-09-30.
- [G26] Zechner, Mario. "MCP vs CLI: Benchmarking Tools for Coding Agents." mariozechner.at. Published 2025-08-15. https://mariozechner.at/posts/2025-08-15-mcp-vs-cli/ — accessed 2026-09-30.
- [G27] Zechner, Mario. "What if you don't need MCP at all?" mariozechner.at. Published 2025-11-02. https://mariozechner.at/posts/2025-11-02-what-if-you-dont-need-mcp/ — accessed 2026-09-30.
- [G28] Zechner, Mario. "What I learned building an opinionated and minimal coding agent." mariozechner.at. Published 2025-11-30. https://mariozechner.at/posts/2025-11-30-pi-coding-agent/ — accessed 2026-09-30.
- [G29] GitHub REST API, `repos/badlogic/pi-mono` (via `gh api`): created 2025-08-09, stargazers_count 110701. https://github.com/badlogic/pi-mono — accessed 2026-09-30.
- [G30] tonytrg (maintainer). "Improving GitHub MCP Server Performance and Resource Consumption: Introducing default toolsets." github/github-mcp-server Discussion #1182. Posted 2025-10-06 (via `gh api`). https://github.com/github/github-mcp-server/discussions/1182 — accessed 2026-09-30.
- [G31] Porat, Yarden. "When Agentic Glue Melts: Exploiting Cloudflare Code Mode and Workers." Check Point Research. Published 2026-08-07 (`datePublished` 2026-08-06T22:20Z). https://research.checkpoint.com/2026/when-agentic-glue-melts/ — accessed 2026-09-30.
- [G32] Hasan, Li, Rajbahadur, Adams. "Model Context Protocol (MCP) Tool Descriptions Are Smelly! Towards Improving AI Agent Efficiency with Augmented MCP Tool Descriptions." arXiv:2602.14878v3. Submitted 2026-02-16, revised 2026-05-31. https://arxiv.org/abs/2602.14878 (HTML v3 read) — accessed 2026-09-30.
- [G33] Shi, Zhang, Zhang, Shen, et al. "Description-Code Inconsistency in Real-world MCP Servers: Measurement, Detection, and Security Implications." arXiv:2606.04769. Submitted 2026-06-03. https://arxiv.org/abs/2606.04769 (abstract) — accessed 2026-09-30.
- [G34] Li, Ma, Dai, Xu, et al. "Don't believe everything you read: Understanding and Measuring MCP Behavior under Misleading Tool Descriptions." arXiv:2602.03580. Submitted 2026-02-03. https://arxiv.org/abs/2602.03580 (abstract) — accessed 2026-09-30.
- [G35] Afsar, Haseeb Mohammed. "What a Random Draw from the MCP Registry Contains, and What Tool-Use Benchmarks Contain Instead." arXiv:2609.10962. Submitted 2026-09-10. https://arxiv.org/abs/2609.10962 (abstract) — accessed 2026-09-30.
- [G36] Mastouri, Ksontini, Barrak, Kessentini. "From REST to MCP: An Empirical Study of API Wrapping and Automated Server Generation for LLM Agents." arXiv:2507.16044v4. Submitted 2025-07-21, revised 2026-04-06. https://arxiv.org/abs/2507.16044 (abstract) — accessed 2026-09-30.
- [G37] Guo, Dong, Gao, Das. "Learning to Rewrite Tool Descriptions for Reliable LLM-Agent Tool Use." arXiv:2602.20426v2. Submitted 2026-02-23, revised 2026-04-29. https://arxiv.org/abs/2602.20426 (abstract) — accessed 2026-09-30.
- [G38] "RAG-MCP: Mitigating Prompt Bloat in LLM Tool Selection via Retrieval-Augmented Generation." arXiv:2505.03275. Submitted 2025-05-06. https://arxiv.org/abs/2505.03275 (abstract) — accessed 2026-09-30.
- [G39] Rabinovich, Anaby-Tavor (IBM Research). "On the Robustness of Agentic Function Calling." arXiv:2504.00914. Submitted 2025-04-01. https://arxiv.org/html/2504.00914 (Table 2 read from HTML) — accessed 2026-09-30.
- [G40] Jia et al. "OSWorld-MCP: Benchmarking MCP Tool Invocation In Computer-Use Agents." arXiv:2510.24563. Submitted 2025-10-28. https://arxiv.org/abs/2510.24563 (abstract) — accessed 2026-09-30.
- [G41] "Code mode yields a 99.2% cost reduction in our systems." agent-swarm.dev blog. Published 2026-07-08 (HN discussion 2026-07-23, 62 points). https://www.agent-swarm.dev/blog/code-mode-token-savings — accessed 2026-09-30.
- [G42] "SDK code mode shows SotA accuracy and performance for agents using APIs." Stainless blog. Published 2026-03-02. https://www.stainless.com/blog/sdk-code-mode — accessed 2026-09-30. Vendor benchmark.
- [G43] "Human-in-the-loop." OpenAI Agents SDK (Python) docs, GitHub main branch. Undated. https://raw.githubusercontent.com/openai/openai-agents-python/main/docs/human_in_the_loop.md — accessed 2026-09-30.
- [G44] "Idempotent requests." Stripe API reference. Undated. https://docs.stripe.com/api/idempotent_requests.md — accessed 2026-09-30.
- [G45] Rodrigues, Carson; Vas, Oysturn. "…the Wrong Tool, and the Five Patterns That Fix It" (title start truncated in the fetched page; URL slug `why-your-mcp-server-picks-the-wrong`). AlphaSignal AI (Substack). Published 2026-07-07. https://alphasignalai.substack.com/p/why-your-mcp-server-picks-the-wrong — accessed 2026-09-30. Practitioner measurement.
- [G46] "MCP Server Anti-Patterns: Design Mistakes 2026 Guide." Digital Applied. Published 2026-05-06. https://www.digitalapplied.com/blog/mcp-server-anti-patterns-design-mistakes-2026-developer-guide — accessed 2026-09-30. Self-described heuristic weighting.
- [G47] "Ask HN: Who is using MCP in production?" Hacker News item 49548600. Posted 2026-09-03, 198 points, 201 comments. https://news.ycombinator.com/item?id=49548600 — accessed 2026-09-30.
- [G48] "OpenAI Codex agents go rogue and consumes USD 78,000 without authorization." Hacker News item 49861047. Posted 2026-09-26, 82 points. https://news.ycombinator.com/item?id=49861047 — accessed 2026-09-30. Unverified self-report.
- [G49] Ronacher, Armin. "Agent Design Is Still Hard." lucumr.pocoo.org. Published 2025-11-21. https://lucumr.pocoo.org/2025/11/21/agents-are-hard/ — accessed 2026-09-30 (checked for Pi claims; none present).
- [G50] Anthropic Engineering index and `datePublished` metadata: building-effective-agents 2024-12-19; code-execution-with-mcp 2025-11-04; advanced-tool-use 2025-11-24; Cloudflare "Code Mode" `article:published_time` 2025-09-26. https://www.anthropic.com/engineering ; https://blog.cloudflare.com/code-mode/ — accessed 2026-09-30.
- [G51] "Code mode is all you need." Browserbase blog. Published 2026-07-22. https://www.browserbase.com/blog/code-mode-is-all-you-need — accessed 2026-09-30 (estimate only; not used as a number).
- [G52] "Demystifying evals for AI agents." Anthropic Engineering. Published 2026-01-09. https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents — accessed 2026-09-30.
