# Контекст-инженерия — primary-sources notes

## TL;DR (must-knows, 2026-09-30)

- "Context engineering" superseded "prompt engineering" as the frame: the question is "what configuration of context is most likely to generate the desired behavior", not "what words go in the prompt" [S1].
- **Context rot** is real and measured: Chroma tested 18 frontier models (incl. Claude Opus 4/Sonnet 4, GPT-4.1/o3, Gemini 2.5 Pro/Flash, Qwen3) and found accuracy degrades with input length even on trivial copy tasks, well before the context limit is reached [S4]. Anthropic's own docs now cite this in their context-window page [S9].
- Drew Breunig's four failure modes — **poisoning, distraction, confusion, clash** — are the standard vocabulary industry-wide (cited verbatim inside Anthropic's and LangChain's own materials) [S5][S13].
- LangChain's **write / select / compress / isolate** taxonomy (Karpathy-named, June 2025) is the standard mental model for context management strategies, and every major framework (LangGraph, Claude Code, Manus) implements some variant [S6][S13].
- Anthropic's official framework (Sept 2025) adds concrete techniques on top: **just-in-time retrieval**, **compaction**, **structured note-taking / agentic memory**, **sub-agent architectures** [S1].
- Anthropic now ships three *server-side* primitives that used to be DIY: **prompt caching** (`cache_control`, 2024+), **context editing** (`clear_tool_uses_20250919`, beta header `context-management-2025-06-27`) and **compaction** (`compact-2026-09-04` beta, GA-track since ~Sept 2026) [S10][S11][S12].
- The **memory tool** (`memory_20250818`) is a client-executed file-based tool (`/memories`) that Anthropic ships as a spec, not a managed service — you write the storage backend [S8].
- **1M-token context windows are now the default, at no price premium**, on most current Claude models (Sonnet 5/5.5, Opus 5/5.5, Fable, Mythos, Opus 4.6+, Sonnet 4.6) — no beta header required [S9].
- OpenAI ships **automatic** prompt caching (≥1024 tokens, 128-token increments) with no `cache_control` needed, plus a new (Feb 2026) server-side **Responses API compaction** feature (`context_management.compaction`, `compact_threshold`) that returns an opaque "compaction item" [S15][S16].
- Gemini has **implicit caching** (automatic, default on 2.5+) and **explicit caching** (`client.caches.create`, TTL default 1h, beta, min. 2048–4096 tokens depending on model) [S17][S18].
- Manus's KV-cache lesson: **append-only prompts + stable prefixes** because a Claude Sonnet-era cached token was ~10x cheaper than an uncached one ($0.30 vs $3/MTok in their post) — this economics, not elegance, is why agent harnesses avoid rewriting history [S7].
- Tool-count matters independently of tokens: Berkeley-leaderboard-style findings (cited by Breunig) show accuracy dropping past ~30–50 tools; Anthropic's own tool-search docs put the practical cliff at the same range and show ~55k tokens of definitions collapsing to ~15% with on-demand tool search [S5][S20].
- Sub-agent isolation has a real, measured cost/benefit trade: Anthropic's multi-agent researcher used **~15x** the tokens of a single chat but got **+90.2%** on internal evals vs. a single Opus-4 agent [S19].
- Tokenizer changes are a hidden cost lever: Claude Opus 4.7+/Fable/Mythos use a new tokenizer that counts **~30% more tokens** for the same text than older models — recount, don't reuse old counts [S23].

## Current state and versions (as of 2026-09-30)

- **Anthropic model family in current docs** (per platform.claude.com, fetched today): Claude Opus 5, Opus 5.5, Sonnet 5, Sonnet 5.5, Fable 5, Fable 5.1, Mythos 5, Mythos 5.1, Mythos Preview, plus legacy Opus 4.5–4.8, Sonnet 4.5/4.6, Haiku 3.5/4.5 [S9][S22]. (Model IDs seen in docs: `claude-opus-5-5`, `claude-fable-5-1`, `claude-mythos-5-1`, etc. — treat as current-as-fetched, not memorized.)
- **1M-token context window**: GA (no beta header, standard pricing) on Fable 5/5.1, Mythos 5/5.1, Mythos Preview, Opus 5/5.5, Opus 4.6/4.7/4.8, Sonnet 5/5.5, Sonnet 4.6. Still 200k on Sonnet 4.5 and Haiku models. Max output 128k tokens on 1M-window models. Up to 600 images/PDF pages per request on 1M models (100 on 200k models) [S9].
- **Prompt caching** (Anthropic): up to 4 explicit `cache_control` breakpoints/request; 5-min default TTL or 1h extended TTL; write multiplier 1.25x (5m) / 2.0x (1h); read multiplier 0.1x standard, 0.05x on Opus 5.5, 0.025x on Fable 5.1/Mythos 5.1; minimum cacheable size ranges 512–4096 tokens by model [S10].
- **Context editing** (Anthropic, beta header `context-management-2025-06-27`): `clear_tool_uses_20250919` (tool-result clearing) and `clear_thinking_20251015` (thinking-block clearing), available on "all supported Claude models" [S11].
- **Compaction** (Anthropic): two betas — on-demand (`compact-2026-09-04`) and threshold-triggered — both beta as of today, available for Claude 4.6+ and Mythos Preview [S12][S9].
- **Memory tool**: `memory_20250818`, available on "all Claude 4 and later models", client-executed [S8].
- **Tool search tool**: `tool_search_tool_regex_20251119` / `tool_search_tool_bm25_20251119`, available on Opus 4.5+/4.6+/4.7/4.8/5/5.5, Sonnet 4.5+/4.6/5.5, Haiku 4.5, Fable/Mythos 5/5.1 [S20].
- **Context awareness** (`<budget:token_budget>` injected tags): automatic on Sonnet 5, Sonnet 4.6, Sonnet 4.5, Haiku 4.5. Opus 4.7+, Sonnet 5.5, Fable/Mythos 5/5.1 use an explicit **task budgets** beta instead [S9].
- **OpenAI**: automatic caching ≥1024 tokens (128-token increments above that), unchanged since April 2026 per aggregator sources [S15]; server-side Responses API **compaction** shipped ~Feb 11 2026 via `context_management: [{type: "compaction", compact_threshold}]`, plus a standalone `/responses/compact` endpoint [S16].
- **Google Gemini**: implicit caching automatic on Gemini 2.5+ (min. 2048 tokens on 2.5 Flash/Pro, 4096 on Gemini 3.x Flash and 3.1 Pro Preview); explicit caching (`client.caches.create`) still in Beta under `v1beta`, default TTL 1 hour if unset [S17][S18].
- **Chroma "Context Rot"**: published 2025-07-14, authors Kelly Hong, Anton Troynikov, Jeff Huber; 18 models tested [S4].
- **Drew Breunig "How to Fix Your Context"**: 2025-06-26, dbreunig.com [S5].
- **LangChain "Context Engineering for Agents"**: published 2025-07-02 [S6].
- **Manus "Context Engineering for AI Agents"**: published 2025-07-18 by Yichao "Peak" Ji [S7].
- **Anthropic "Effective context engineering for AI agents"**: published 2025-09-29 [S1].
- **Anthropic "How we built our multi-agent research system"**: published 2025-06-13 [S19].
- **Anthropic "Effective harnesses for long-running agents"**: published 2025-11-26 [S21].

## Timeline (dated)

- 2025-06-13 — Anthropic publishes the multi-agent research system post: orchestrator-worker pattern, 15x token cost, 90.2% eval gain [S19].
- 2025-06-26 — Drew Breunig publishes "How to Fix Your Context" (poisoning/distraction/confusion/clash + 6 fixes) [S5].
- 2025-06-27 — Anthropic ships context-management beta header `context-management-2025-06-27` (context editing) [S11].
- 2025-07-02 — LangChain publishes "Context Engineering for Agents" (write/select/compress/isolate) [S6].
- 2025-07-14 — Chroma publishes "Context Rot" technical report (18 models) [S4].
- 2025-07-18 — Manus publishes "Context Engineering for AI Agents: Lessons from Building Manus" [S7].
- 2025-08-18 — Anthropic ships memory tool `memory_20250818` [S8].
- 2025-09-19 — `clear_tool_uses_20250919` (tool-result clearing) tool-type date [S11].
- 2025-09-29 — Anthropic publishes "Effective context engineering for AI agents" [S1].
- 2025-10-15 — `clear_thinking_20251015` (thinking-block clearing) tool-type date [S11].
- 2025-11-19 — Tool search tool dated `tool_search_tool_regex_20251119` / `_bm25_20251119` [S20].
- 2025-11-26 — Anthropic publishes "Effective harnesses for long-running agents" (progress logs, feature checklists, git-based recovery) [S21].
- 2026-02-11 — OpenAI ships server-side Responses API compaction (`context_management.compaction`) [S16].
- 2026-03-13 — Anthropic announces 1M-token context GA (no premium) for Opus 4.6 and Sonnet 4.6 [S9 via aggregator, corroborated by current docs table].
- 2026-09-04 — Anthropic's on-demand compaction beta header dated `compact-2026-09-04` [S12].
- 2026-09-30 (today) — current docs confirm 1M windows standard on Opus 5/5.5, Sonnet 5/5.5, Fable, Mythos; compaction and context editing both live in beta docs [S9][S11][S12].

## Mechanics

### Anatomy of the context window (Claude Code, illustrative numbers from Anthropic's own interactive doc)

Per Anthropic's official "Explore the context window" page (their own simulation, explicitly labeled "illustrative" — not measured production averages), a session loads, before the user types anything [S14]:

| Component | ~Tokens | Visibility |
|---|---|---|
| System prompt | 4,200 | hidden |
| Auto memory (MEMORY.md, first 200 lines / 25KB) | 680 | hidden |
| Environment info (cwd, platform, shell, git) | 280 | hidden |
| MCP tools (deferred, names only) | 120 | hidden |
| Skill descriptions (one-liners) | 450 | hidden |
| `~/.claude/CLAUDE.md` (global) | 320 | hidden |
| Project `CLAUDE.md` | 1,800 | hidden |

A file read costs its full token size in context (e.g. a 2,400-token file read shows as one line "Read auth.ts" in the terminal but consumes 2,400 tokens). Path-scoped rules (`.claude/rules/*.md` with `paths:` frontmatter) auto-load when a matching file is read. PostToolUse hooks inject only `hookSpecificOutput.additionalContext` into Claude's context; plain stdout on exit 0 never reaches the model [S14].

Sub-agents get their **own** separate context window: their own (shorter) system prompt, their own copy of CLAUDE.md, and their own file reads — none of which touch the parent's context. Only the subagent's final text response (~400-1,200 tokens in the example) plus a small metadata trailer returns to the parent. In the walked example the subagent read 6,100 tokens of files and returned 420 tokens — that gap *is* the isolation benefit [S14].

**What survives `/compact`** (verbatim table from the doc) [S14]:

| Mechanism | After compaction |
|---|---|
| System prompt and output style | Both still apply |
| Project-root CLAUDE.md and unscoped rules | Re-injected from disk |
| Auto memory | Re-injected from disk |
| Git status snapshot | Fresh read from repo |
| Plan-mode plan | Re-injected from disk |
| Path-scoped rules (`paths:` frontmatter) | Reloaded only as matching files are re-read |
| Nested CLAUDE.md | Reloaded as files in that subdir are read |
| Files Claude read/edited | Re-reads up to 5 most-recently-modified; files >5,000 tokens come back as a path reference only |
| Invoked skill bodies | Re-injected, capped at 5,000 tokens/skill and 25,000 tokens total; oldest dropped first; skill *descriptions* (the startup index) do NOT reload |
| Background commands/subagents | Keep running; Claude is reminded which ones |
| Hook-added context | Summarized away with the rest |
| SessionStart hooks matching `compact` source | Re-run, output re-added |

Default auto-compact fires "before the window fills, at about 967K tokens by default on Sonnet 5.5 and Sonnet 5" (aggregator-reported; Anthropic's own doc defers exact thresholds to a separate "Default auto-compact thresholds" page, not fetched) [S14 partially, corroborated by S3 secondary source — mark threshold number as secondary-sourced].

### Context-rot mechanics (Chroma, 2025-07-14) [S4]

Methodology: extended Needle-in-a-Haystack (NIAH) along 4 axes claimed novel — needle-question **semantic similarity** (not just lexical; tested similarities 0.445–0.829), number/type of **distractors**, needle-haystack similarity, and haystack **structure** (coherent essay vs. shuffled sentences). Also ran **LongMemEval** (~113k-token conversational QA) and a **repeated-words** copy task (1,000–10,000-word sequences, scored by normalized Levenshtein distance, 1,090 variations).

Key findings:
- Performance degrades with input length even on trivial tasks — not just "hard" long-context tasks.
- Lower needle-question similarity accelerates the degradation curve.
- Individual distractors are non-uniform in damage; one distractor in an arXiv-based test caused disproportionately larger drops than others.
- Counterintuitively, **models perform better on shuffled haystacks than logically coherent ones** — structure itself seems to focus (mis-focus) attention.
- Position matters: unique-word insertions near the start of the repeated-word sequence score highest; accuracy declines toward the end.
- Hallucination differs by vendor: GPT models had the highest hallucination rates; Claude models had the lowest, tending to abstain ("dates are not provided") rather than confabulate — refusal rates: GPT-3.5 Turbo 60.29%, GPT-4.1 2.55%, Claude Opus 4 2.89%.
- Conclusion, quoted: **"Models do not use their context uniformly."**

### Failure-mode taxonomy (Drew Breunig, 2025-06-26) [S5]

- **Context poisoning**: a hallucination enters context and gets referenced repeatedly, compounding. Example cited: DeepMind's Gemini 2.5 technical report on Pokémon-playing agents — the agent hallucinated game state, "poisoning its context," then pursued impossible/irrelevant goals for "the last 1,234 steps."
- **Context distraction**: past ~100k tokens, the Gemini Pokémon agent favored "repeating actions from its vast history rather than synthesizing novel plans." Databricks found Llama 3.1 405b's tool-calling correctness "began to fall around 32k" tokens (smaller models degrade earlier).
- **Context confusion**: superfluous info degrades output even when irrelevant. Berkeley Function-Calling Leaderboard: every tested model does worse with more available tools; a Llama 3.1 8b model failed with 46 tools but succeeded with only 19.
- **Context clash**: new info conflicts with old info already in context. Microsoft/Salesforce research on "sharded" (turn-by-turn-revealed) prompts vs. single-shot: average score drop of 39%; o3 fell from 98.1 to 64.1.

Six fixes named: RAG, Tool Loadout (curate/dynamically-select tools — one cited study: +44% for smaller models via dynamic tool selection), Context Quarantine (separate threads/contexts — Anthropic's multi-agent system: +90.2% on breadth-first queries), Context Pruning (Provence pruner: -95% size on a Wikipedia article while preserving relevance), Context Summarization, Context Offloading (scratchpads; Anthropic reports up to 54% improvement in one benchmark using offloading) [S5 via search-summary secondary rendering — treat numeric attributions as needing verification against the primary post text directly if used for a chart].

### LangChain write/select/compress/isolate (2025-07-02) [S6]

- **Write**: save info outside the context window — scratchpads (task-scoped) and memories (cross-session: Reflexion-style self-reflection, or Generative-Agents-style synthesis; ChatGPT/Cursor/Windsurf ship auto cross-session memory).
- **Select**: pull relevant info in — scratchpad retrieval, memory-type selection (episodic/procedural/semantic), tool selection (RAG over tool descriptions — cited: 3x accuracy improvement), knowledge/RAG (AST parsing, semantic chunking, grep, knowledge graphs, reranking for code agents).
- **Compress**: keep only needed tokens — summarization (Claude Code's then auto-compact fired at 95% context usage per this 2025 post — note: current Anthropic docs describe a configurable/model-dependent threshold, not a fixed 95%, so treat "95%" as a 2025-era number, possibly stale by today), trimming/pruning (heuristic or trained, e.g. Provence).
- **Isolate**: split context — multi-agent (OpenAI Swarm; Anthropic's researcher: up to 15x tokens vs. single-agent chat), sandboxed environments (HuggingFace Deep Researcher's CodeAgent keeps token-heavy objects like images out of the LLM's context, in state variables), state isolation via schemas exposing only selected fields.

### Manus's six lessons (Yichao "Peak" Ji, 2025-07-18) [S7]

1. **Design around the KV-cache.** Manus's own number: cached input tokens ≈ $0.30/MTok vs $3/MTok uncached on (their) Claude Sonnet pricing — a 10x difference — making **KV-cache hit rate "the single most important metric for a production-stage AI agent."** Average input:output token ratio in Manus ≈ 100:1.
2. **Keep prompts append-only.** Never edit past actions/observations; use deterministic JSON serialization (unstable key ordering silently breaks the cache).
3. **Mask, don't remove, tools.** Removing tools mid-task shifts the schema, invalidating cache from that point on; instead mask logits during decoding to constrain action selection.
4. **Use the filesystem as unlimited, persistent, agent-operable context** — described as "the ultimate context in Manus."
5. **Recite goals via a todo-list file**, rewritten repeatedly to keep objectives inside the model's recent attention span (fighting distraction/lost-in-the-middle).
6. **Preserve errors in context** — leaving failed turns visible is "genuine agentic error recovery," not a bug to scrub.

### Anthropic prompt caching — verbatim mechanics [S10]

Explicit breakpoint syntax (VERBATIM, S10):
```json
{
  "system": [
    {
      "type": "text",
      "text": "System prompt...",
      "cache_control": {"type": "ephemeral"}
    }
  ],
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "User message...",
          "cache_control": {"type": "ephemeral"}
        }
      ]
    }
  ]
}
```
1-hour TTL: `"cache_control": {"type": "ephemeral", "ttl": "1h"}`.

Usage fields (VERBATIM, S10):
```json
{
  "usage": {
    "cache_creation_input_tokens": 5120,
    "cache_read_input_tokens": 1800,
    "input_tokens": 50,
    "output_tokens": 503,
    "cache_creation": {
      "ephemeral_5m_input_tokens": 148,
      "ephemeral_1h_input_tokens": 100
    }
  }
}
```
`total_input_tokens = cache_read_input_tokens + cache_creation_input_tokens + input_tokens`.

Cache prefix order is hierarchical: **tools → system → messages**; invalidating a level invalidates it and everything after it. Lookback window: up to 20 blocks checked backward for a cache hit; consecutive `tool_use` blocks count as one position, same for `tool_result`. Max 4 explicit breakpoints/request. Minimum cacheable size ranges 512 tokens (Fable/Mythos/Opus 5.x/Sonnet 5.x) to 4,096 tokens (Opus 4.5/4.6, Haiku 4.5). Thinking blocks cannot carry an explicit `cache_control` but cache automatically as part of a prior assistant turn.

Pre-warming pattern (VERBATIM, S10):
```bash
curl https://api.anthropic.com/v1/messages \
  -H "content-type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -d '{
    "model": "claude-opus-5-5",
    "max_tokens": 0,
    "system": [{"type": "text", "text": "System prompt...", "cache_control": {"type": "ephemeral"}}],
    "messages": [{"role": "user", "content": "warmup"}]
  }'
```

### Anthropic context editing — verbatim mechanics [S11]

Beta header: `anthropic-beta: context-management-2025-06-27`.

Tool-result clearing request example (VERBATIM excerpt, S11):
```bash
curl https://api.anthropic.com/v1/messages \
    --header "anthropic-beta: context-management-2025-06-27" \
    --data '{
        "model": "claude-opus-5-5",
        "max_tokens": 4096,
        "messages": [{"role": "user", "content": "Create a simple command line calculator app using Python"}],
        "tools": [
            {"type": "text_editor_20250728", "name": "str_replace_based_edit_tool", "max_characters": 10000},
            {"type": "web_search_20250305", "name": "web_search", "max_uses": 3}
        ],
        "context_management": {
            "edits": [{
                "type": "clear_tool_uses_20250919",
                "trigger": {"type": "input_tokens", "value": 30000},
                "keep": {"type": "tool_uses", "value": 3},
                "clear_at_least": {"type": "input_tokens", "value": 5000},
                "exclude_tools": ["web_search"]
            }]
        }
    }'
```
Parameters: `trigger` (default `{input_tokens: 100000}`), `keep` (default `{tool_uses: 3}`), `clear_at_least`, `exclude_tools`, `clear_tool_inputs` (bool, default false).

Response reports what was applied (VERBATIM, S11):
```json
{
  "context_management": {
    "applied_edits": [
      {"type": "clear_thinking_20251015", "cleared_thinking_turns": 3, "cleared_input_tokens": 15000},
      {"type": "clear_tool_uses_20250919", "cleared_tool_uses": 8, "cleared_input_tokens": 50000}
    ]
  }
}
```
Rule: when combining edits, `clear_thinking_20251015` must be listed **first** in the `edits` array. Clearing is server-side, chronological (oldest first), preserves block pairing, and preserves the *unmodified* history on the client. Tool-result clearing invalidates the prompt-cache prefix from the cleared point forward (use `clear_at_least` to make the cache-write cost worth it); thinking-block clearing invalidates cache only if thinking blocks are actually cleared.

### Anthropic compaction — mechanics and choice table [S12]

Three ways to compact, each with different beta headers/params, summarized from the official comparison table:
- **Compaction on demand** (`compact-2026-09-04` beta header, `compaction` top-level param): app decides when; can keep recent turns word-for-word; can run in background.
- **Compaction at a token threshold**: server decides when input tokens cross a configured trigger; runs inside the ordinary request; no keep-recent-turns option unless you pause-and-reinsert.
- **Your own summarizer**: full manual control, no beta needed.

Compaction is explicitly positioned as complementary to context editing: "Context editing clears specific tool results on the client [sic — server, per S11]. Compaction automatically summarizes the whole conversation on the server." Memory tool + compaction combo recommended for long-running agents: compaction shrinks active context without bookkeeping, memory persists what must survive summarization [S8].

### Anthropic memory tool — verbatim commands [S8]

Tool declaration is the entire config: `{"type": "memory_20250818", "name": "memory"}`. Six client-executed commands: `view` (dir/file listing, optional `view_range`), `create`, `str_replace`, `insert`, `delete`, `rename`. Example call/result pair (VERBATIM, S8):
```json
{"type": "tool_use", "id": "toolu_01C4D5E6F7G8H9I0J1K2L3M4", "name": "memory", "input": {"command": "view", "path": "/memories"}}
```
```json
{"type": "tool_result", "tool_use_id": "toolu_01C4D5E6F7G8H9I0J1K2L3M4", "content": "Here're the files and directories up to 2 levels deep in /memories, excluding hidden items and node_modules:\n4.0K\t/memories\n1.5K\t/memories/customer_service_guidelines.xml\n2.0K\t/memories/refund_policies.xml"}
```
The API auto-injects this system-prompt instruction whenever the memory tool is present (VERBATIM, S8):
```
IMPORTANT: ALWAYS VIEW YOUR MEMORY DIRECTORY BEFORE DOING ANYTHING ELSE.
MEMORY PROTOCOL:
1. Use the `view` command of your `memory` tool to check for earlier progress.
2. ... (work on the task) ...
   - As you make progress, record status / progress / thoughts etc in your memory.
ASSUME INTERRUPTION: Your context window might be reset at any moment, so you risk losing any progress that is not recorded in your memory directory.
```
Multisession pattern: **initializer session** sets up progress log + feature checklist + init script → **subsequent sessions** read those files first, no re-exploration → **end-of-session** update to the progress log. Anthropic's cross-referenced case study (S21) reports this pattern used on a "claude.ai clone" with 200+ JSON-tracked features, each `{"category": "functional", "description": "...", "passes": false}`, a `claude-progress.txt` log, git-commit history as an audit trail, `init.sh` for reproducible bring-up, and Puppeteer MCP for browser-level verification. Explicit rule quoted: "It is unacceptable to remove or edit tests because this could lead to missing or buggy functionality."

### Anthropic tool search tool — just-in-time tool loading [S20]

Problem framing (VERBATIM numbers from docs): "A typical multiserver setup (GitHub, Slack, Sentry, Grafana, and Splunk) can consume ~55k tokens in definitions before Claude does any work. Tool search typically reduces this by over 85 percent, loading only the 3–5 tools Claude needs." Selection accuracy "degrades once you exceed 30–50 available tools."

Mechanics: mark tools `defer_loading: true`; they're still sent in every request's `tools` array (server needs them to search/expand) but excluded from the context-window prefix until discovered. Two search variants: `tool_search_tool_regex_20251119` (Python `re.search()` patterns, Claude writes the regex, case-insensitive, ≤200 chars) and `tool_search_tool_bm25_20251119` (natural language, ≤500 chars). Search returns up to 5 tools by default (`limit` configurable 1–10,000). Discovered tools arrive as `tool_reference` blocks that the API auto-expands into full definitions; the cached prefix is untouched, so caching survives. Limits: max 10,000 deferred tools/request; a `defer_loading:true` tool can't also carry `cache_control`. Recommendation thresholds: use tool search past 10 tools, >10k tokens of definitions, or 200+ tools aggregated from MCP servers; skip it under 10 tools / <100 tokens total.

### Token counting API [S23]

`POST /v1/messages/count_tokens` mirrors the Messages API's input shape, free to use (rate-limited by usage tier: Start 5,000 rpm / Build 10,000 / Scale 20,000). Rejects server tools (except the advisor tool), MCP connector, and `url`/`file`-sourced images/documents (must be base64 for counting). Example (VERBATIM, S23):
```bash
curl https://api.anthropic.com/v1/messages/count_tokens \
  -d '{"model": "claude-opus-5-5", "system": "You are a scientist", "messages": [{"role":"user","content":"Hello, Claude"}]}'
```
→ `{"input_tokens": 14}`. **Tokenizer change**: "Claude 4.7 and later models and Claude Mythos Preview use a newer tokenizer. The same input text produces approximately 30 percent more tokens than on earlier models" — recount per target model, don't reuse old-model counts for cost/fit estimates.

### OpenAI Responses API compaction [S16]

Server-side config (VERBATIM, S16):
```json
{"context_management": [{"type": "compaction", "compact_threshold": 200000}]}
```
When rendered tokens cross `compact_threshold`, the server compacts in-stream, emitting an "encrypted compaction item" described as "opaque and not intended to be human-interpretable" that "carries forward key prior state and reasoning into the next run using fewer tokens." Two chaining modes: append all output items (incl. the compaction item) to the next request, or use `previous_response_id` and send only new messages. Standalone endpoint `/responses/compact` accepts `{"model": "...", "input": [...]}` and returns a canonical next context window — explicit instruction: **"Do not prune `/responses/compact` output... pass it into your next `/responses` call as-is."** ZDR-compatible when `store=false`. Model names appearing in the docs at fetch time: `gpt-5.3-codex`, `gpt-6-astra` (treat as current-as-fetched).

### OpenAI automatic prompt caching [S15]

No `cache_control`-equivalent needed: caching auto-activates for prompts ≥1,024 tokens, in 128-token increments beyond that. Discount reported by aggregators as 25–50% of base input rate depending on model family (gpt-5 family cited), and up to 80% latency reduction on prompts >10k tokens (secondary-sourced numbers — flagged, not from an official pricing page fetch here).

### Gemini caching [S17][S18]

**Implicit** (default, automatic, Gemini 2.5+): min. token threshold 2,048 (2.5 Flash/Pro) or 4,096 (3.x Flash, 3.1 Pro Preview); no code required; cache hits visible via `usage_metadata`/`usage.total_cached_tokens`. Advice: put large/common content first in the prompt; send similar-prefix requests close together in time. Note: the **Interactions API only supports implicit caching** — explicit caching requires the `generateContent` API.

**Explicit** (Beta, `v1beta`): create a cache object, TTL defaults to 1 hour if unset. VERBATIM Python example (S18):
```python
cache = client.caches.create(
    model=model,
    config=types.CreateCachedContentConfig(
        display_name='sherlock jr movie',
        system_instruction='You are an expert video analyzer...',
        contents=[video_file],
        ttl="300s",
    )
)
response = client.models.generate_content(
    model=model,
    contents='Introduce different characters...',
    config=types.GenerateContentConfig(cached_content=cache.name)
)
```
Cache metadata (`name`, `model`, `display_name`, `usage_metadata`, `create_time`, `update_time`, `expire_time`) is listable/gettable, but cached content itself cannot be retrieved/viewed. Explicit caching gives "a cost saving guarantee"; implicit does not.

## Numbers (with conditions and source)

- **90.2%** — performance gain of Opus-4-lead + Sonnet-4-subagents multi-agent system vs. single Opus-4 agent, on Anthropic's internal research evals, published 2025-06-13 [S19].
- **~15x** — token cost of Anthropic's multi-agent system vs. a single chat interaction; **~4x** — typical agent vs. chat token ratio [S19].
- **~85%** reduction in tool-definition context tokens via tool search, on a 5-server (GitHub/Slack/Sentry/Grafana/Splunk) example that otherwise costs ~55k tokens — Anthropic docs, fetched 2026-09-30 [S20].
- **30–50 tools** — point past which Claude's tool-selection accuracy starts to degrade, per Anthropic's own tool-search docs [S20]; Breunig's independently-cited Berkeley-leaderboard example: a Llama 3.1 8b model succeeded with 19 tools, failed with 46 [S5].
- **~30% more tokens** for identical text under the tokenizer on Opus 4.7+/Fable/Mythos vs. earlier Claude models — Anthropic token-counting docs, fetched 2026-09-30 [S23].
- **10x** — Manus's claimed cached vs. uncached token price ratio on (their) Claude Sonnet pricing: $0.30/MTok cached vs $3/MTok uncached [S7].
- **~100:1** — Manus's average input:output token ratio in production agent traffic [S7].
- **39%** average score drop from single-shot to "sharded" (turn-revealed) prompts, Microsoft/Salesforce research cited by Breunig; o3 specifically fell 98.1 → 64.1 [S5].
- **32k tokens** — point where Llama 3.1 405b tool-calling correctness "began to fall" per a Databricks study cited by Breunig [S5].
- **60.29% / 2.55% / 2.89%** — refusal rates on a Chroma long-context test for GPT-3.5 Turbo / GPT-4.1 / Claude Opus 4 respectively, 2025-07-14 [S4].
- Prompt caching read discount: **0.1x** (most models), **0.05x** (Opus 5.5), **0.025x** (Fable 5.1 / Mythos 5.1) of standard input price; write premium **1.25x** (5-min TTL) or **2.0x** (1h TTL) — Anthropic docs, fetched 2026-09-30 [S10].
- Memory tool + context editing combo: Anthropic's own Sept-2025 post reports **39% improvement in agent-based search performance** and **84% reduction in token consumption** over 100 rounds of web search (secondary-sourced summary of S1 — recommend re-verifying exact wording against the primary post before quoting in the book body).
- 1M-token windows: **max_tokens up to 128k** output per request on 1M-context models; up to **600 images/PDF pages** per request (vs. 100 on 200k-context models) [S9].

## Pitfalls, limits, criticism

- Bigger context ≠ better: Chroma's headline finding is that all 18 tested models "degrade with increasing input length" even on trivial tasks — treat any "1M-token window" marketing claim as a capacity number, not a quality guarantee [S4][S9 — Anthropic's own docs now warn about this explicitly].
- **Structure can hurt**: models did *better* on shuffled haystacks than coherent essays in Chroma's test — a counterintuitive signal that naive "just make the context well-organized prose" advice is not always right; what matters is what the model's attention actually locks onto, which needs empirical testing per use case [S4].
- **Tool-result clearing breaks the prompt cache** from the cleared point forward — a tension between the two main cost/latency levers (caching wants stability, context editing wants change). Anthropic's own mitigation is `clear_at_least`, sized so the cache-write cost is worth paying [S11].
- **Compaction, memory, and context editing overlap** and Anthropic explicitly tells you when to combine which — using compaction alone means summarization loses "full tool outputs and intermediate reasoning" permanently, by design [S12][S14].
- **Deferred tool loading and prompt caching interact narrowly**: a tool marked `defer_loading:true` cannot also carry `cache_control`; put your cache breakpoint on a non-deferred tool [S20].
- **Path-scoped rules and nested CLAUDE.md do not survive compaction** as persistent context — they reload only when their trigger file is re-read, so a rule you need "always" belongs in project-root CLAUDE.md, not a `paths:`-scoped one [S14].
- **Sub-agent isolation is not free**: 15x token multiplier in Anthropic's own multi-agent system means isolation trades money for quality — a legitimate trade, but a trade [S19].
- Token counts are **model-specific and non-transferable**: the Opus-4.7+ tokenizer inflates counts ~30% vs. older models for identical text; reusing an old count to estimate cost or context fit on a new model silently misleads [S23].
- Aggregator/secondary sources on OpenAI/Gemini pricing (this chapter's S15, parts of S17) disagreed on exact discount percentages across different pages; only the Gemini official implicit-caching page and the OpenAI Responses-API compaction guide were confirmed as primary in this pass — treat any specific OpenAI cache-discount percentage as needing a second check against `developers.openai.com` pricing pages directly before publishing a number in the book.

## What changed in the last 6 months (roughly March–September 2026)

- Anthropic moved **compaction** from a client-side pattern (LangChain-style summarization loops, Claude Code's own `/compact`) to a first-class **server-side API primitive** with its own beta header (`compact-2026-09-04`) and a **threshold-triggered** variant that runs automatically inside ordinary requests [S12].
- Anthropic added **`clear_thinking_20251015`**, extending context editing beyond tool results to extended-thinking blocks, with model-dependent defaults (Opus 4.5+/Sonnet 4.6+/Fable/Mythos keep all thinking by default; everything else keeps only the last turn) [S11][S9].
- Anthropic shipped **task budgets** (beta) as the explicit-budget alternative to injected `<budget:token_budget>` tags, for the newer models (Opus 4.7+, Sonnet 5.5, Fable/Mythos 5/5.1) that don't get the auto-injected tags [S9].
- OpenAI shipped **server-side Responses API compaction** (Feb 11 2026) — the same conceptual move Anthropic made, arriving ~7 months later [S16].
- Gemini's docs now foreground an **Interactions API** with implicit-caching-only, pushing explicit caching to a secondary `generateContent`-only Beta path — a sign Google is steering most traffic toward automatic caching and treating explicit caching as the power-user escape hatch [S17][S18].
- Anthropic's tool search tool moved from "advanced tool use" blog concept to a dated, versioned tool type (`_20251119`) available across essentially the whole current model lineup [S20].
- Anthropic's own context-window documentation page now **directly cites and links** Chroma's context-rot report and their own "Effective context engineering" post as the framing for why context management matters — the finding has been absorbed into official product docs, not just treated as external research [S9].

## Diagram candidates

1. **Context window anatomy stack** — bar chart split by component (system prompt / CLAUDE.md / memory / MCP tools / skills / conversation history / tool results), using the illustrative Claude Code numbers [S14].
2. **Prompt cache hierarchy** — tree diagram: `tools → system → messages`, showing that invalidating a node invalidates everything to its right; annotate with the 20-block lookback window.
3. **Cache write vs. read economics** — two bars (write 1.25x/2.0x vs. read 0.1x/0.05x/0.025x) against baseline 1.0x, per model tier [S10].
4. **Context-editing trigger/keep state machine** — states: below trigger (untouched) → trigger crossed → clear oldest tool_uses down to `keep` → placeholder inserted → (optional) cache-prefix invalidated. Actors: client, Anthropic server, cache [S11].
5. **Compaction on-demand loop** — actors: app, Claude API; arrows: app sends full history → API returns summary block → app swaps summary in as first message → app appends new turns [S12].
6. **Sub-agent context isolation** — two side-by-side context windows (parent vs. subagent), parent sending a short task prompt down, subagent doing N file reads invisible to parent, only a compressed summary returning up. Use the 6,100→420 token numbers [S14][S19].
7. **Four context failure modes** — 2x2 grid: poisoning (self-reinforcing error), distraction (over-indexing on history vs. training), confusion (tool/info bloat), clash (conflicting info across turns) — each with its Breunig-cited example [S5].
8. **Write/select/compress/isolate cycle** — circular diagram with the four LangChain verbs, each annotated with one concrete technique (scratchpad / RAG / summarization / sub-agent) [S6].
9. **KV-cache-friendly vs. -hostile agent loop** — two timelines: (a) stable prefix + append-only + masked tools = high cache hit rate; (b) mutated history/timestamp/reordered JSON = cache miss cascade [S7].
10. **Tool search on-demand loading** — sequence diagram: request with `defer_loading:true` tools → Claude calls `tool_search_tool_*` → server returns `tool_reference` blocks → API expands → Claude calls discovered tool [S20].
11. **1M-token window pricing tiers over time** — chart candidate: context-window ceiling (200k → 1M) per model generation, annotated "no premium since ~March 2026" [S9].
12. **Context rot curve** — chart candidate: accuracy vs. input length for several of Chroma's 18 models on the repeated-words task, if the underlying numeric table can be pulled from the paper's appendix (not fetched in this pass — flagged in Unverified) [S4].

## Glossary

- **Context engineering**: curating the full set of tokens (system prompt, tools, history, retrieved data) fed to a model at inference time, as opposed to just wording a single prompt [S1].
- **Context rot**: measured, non-uniform degradation of model accuracy/recall as input token count grows, before the context limit is reached [S4].
- **Context poisoning**: a hallucination or error entering context and being referenced repeatedly, compounding [S5].
- **Context distraction**: over-reliance on accumulated history at the expense of trained-in knowledge/novel reasoning, past some token threshold [S5].
- **Context confusion**: irrelevant/superfluous context content degrading the response even when the model "shouldn't" be affected [S5].
- **Context clash**: new information/tools in context contradicting earlier information [S5].
- **Prompt caching**: reusing a model provider's cached KV-state for a repeated prompt prefix, at a lower per-token read cost than fresh processing [S10].
- **`cache_control` breakpoint**: an explicit marker on a content block telling the Anthropic API where a cacheable prefix ends [S10].
- **Context editing**: Anthropic's server-side, rule-based clearing of old tool results/thinking blocks once a token/count trigger fires [S11].
- **Compaction**: replacing older conversation turns with a model-written summary, either on-demand or at a token threshold, to keep the active context within budget [S12].
- **Memory tool**: an Anthropic tool spec (`memory_20250818`) letting Claude read/write files in a `/memories` directory that the *client* actually persists [S8].
- **Just-in-time retrieval**: loading only lightweight references (paths, IDs, queries) up front and fetching full content on demand, instead of preloading everything [S1].
- **Tool search tool**: an Anthropic server-side tool that lets Claude discover and load only the tool definitions it needs from a large catalog, via regex or BM25 search [S20].
- **KV-cache**: the transformer's cached key/value attention state for already-processed tokens; reusing it across requests is the mechanical basis of prompt caching [S7].
- **Sub-agent context isolation**: giving a delegated task its own separate context window so its exploration doesn't consume the parent's budget [S19][S14].
- **Write/select/compress/isolate**: LangChain's four-verb taxonomy for context-management strategies [S6].

## Unverified / open questions

- Exact current OpenAI prompt-caching discount percentages per model family (e.g., "25–50% of base input for gpt-5 family") were only found via aggregator/secondary sites in this pass, not confirmed against an official OpenAI pricing page — needs a direct fetch of `developers.openai.com` or `openai.com/api/pricing` before quoting a specific percentage in the book.
- The "39% improvement / 84% token reduction" figures attributed to Anthropic's Sept-2025 "Effective context engineering" post (memory tool + context editing combo) came through a WebFetch summarization pass, not a verbatim quote pulled directly — the primary post itself should be re-fetched and grepped for the exact sentence before using these numbers in print.
- Six-solutions numeric attributions in Drew Breunig's post (e.g. "+44% for smaller models" on dynamic tool selection, "54% improvement" on offloading) were captured via a summarized WebFetch of the post, not a direct quote-and-cite from the raw HTML — recommend re-fetching dbreunig.com raw text and locating exact sentences/footnotes before treating these as citable numbers.
- Claude Code's default auto-compact threshold ("~967K tokens on Sonnet 5.5/5") came from a third-party aggregator search result, not Anthropic's own "Default auto-compact thresholds" doc page (linked but not fetched in this pass) — needs direct verification.
- Chroma's underlying numeric tables/charts (exact accuracy percentages per model per condition) were not pulled from the paper itself in this pass — only prose findings were fetched. Anyone building the "context rot curve" chart candidate needs to open `trychroma.com/research/context-rot` (or its GitHub data release, if any) directly.
- Whether Anthropic's 1M-context-window GA announcement date is exactly 2026-03-13 for Opus 4.6/Sonnet 4.6 came from an aggregator ("cloudzero.com"/"karozieminski.substack.com"-style search summary), not Anthropic's own changelog/release-notes page — worth confirming against `platform.claude.com` release notes directly.
- The exact wording and existence of a Berkeley Function-Calling-Leaderboard citation (used by Breunig) was relayed secondhand through the WebFetch summary of Breunig's post; the leaderboard's own site (gorilla.cs.berkeley.edu) was not opened directly in this pass.
- OpenAI model names seen in the fetched Responses-API compaction doc (`gpt-5.3-codex`, `gpt-6-astra`) and Anthropic's model names (`claude-fable-5-1`, `claude-mythos-5-1`, etc.) are unfamiliar relative to this session's training data; they are reported here exactly as the live docs showed them today (2026-09-30) and should be treated as current, but a human editor may want a sanity pass given how unfamiliar the naming scheme is.

## Sources

- [S1] "Effective context engineering for AI agents." Anthropic (Engineering blog). Published 2025-09-29. https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents — accessed 2026-09-30.
- [S3] Third-party aggregator summaries of Claude Code auto-compact behavior (multiple sites, e.g. cometapi.com, wmedia.es) — accessed 2026-09-30 (secondary; used only for the ~967K-token threshold claim, flagged Unverified).
- [S4] "Context Rot: How Increasing Input Tokens Impacts LLM Performance." Chroma Research (Kelly Hong, Anton Troynikov, Jeff Huber). Published 2025-07-14. https://www.trychroma.com/research/context-rot — accessed 2026-09-30.
- [S5] "How to Fix Your Context." Drew Breunig. Published 2025-06-26. https://www.dbreunig.com/2025/06/26/how-to-fix-your-context.html — accessed 2026-09-30. (Companion piece "How Contexts Fail and How to Fix Them" covers the same four failure modes with examples; same author/date range.)
- [S6] "Context Engineering for Agents." LangChain blog. Published 2025-07-02. https://www.langchain.com/blog/context-engineering-for-agents (redirect target of blog.langchain.com/context-engineering-for-agents/) — accessed 2026-09-30.
- [S7] "Context Engineering for AI Agents: Lessons from Building Manus." Yichao "Peak" Ji, Manus AI. Published 2025-07-18. https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus — accessed 2026-09-30.
- [S8] "Memory tool." Anthropic API docs (platform.claude.com). https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool — accessed 2026-09-30 (live/versioned doc, dated tool type `memory_20250818`).
- [S9] "Context windows." Anthropic API docs. https://platform.claude.com/docs/en/build-with-claude/context-windows — accessed 2026-09-30.
- [S10] "Prompt caching." Anthropic API docs. https://platform.claude.com/docs/en/build-with-claude/prompt-caching — accessed 2026-09-30.
- [S11] "Context editing." Anthropic API docs. https://platform.claude.com/docs/en/build-with-claude/context-editing — accessed 2026-09-30 (beta header `context-management-2025-06-27`).
- [S12] "Compaction overview." Anthropic API docs. https://platform.claude.com/docs/en/build-with-claude/compaction — accessed 2026-09-30.
- [S13] LangChain/Anthropic materials both citing Breunig's four failure modes verbatim, cross-checked via WebFetch of both blog.langchain.com and dbreunig.com renderings — accessed 2026-09-30.
- [S14] "Explore the context window." Claude Code docs. https://code.claude.com/docs/en/context-window — accessed 2026-09-30 (interactive page; numbers explicitly labeled "illustrative" by the source itself).
- [S15] Aggregator/community summaries of OpenAI prompt caching (developers.openai.com/cookbook, community.openai.com, theneuralbase.com) — accessed 2026-09-30; official page confirms automatic activation ≥1024 tokens but exact discount percentages are secondary-sourced here.
- [S16] "Compaction." OpenAI developer docs. https://developers.openai.com/api/docs/guides/compaction — accessed 2026-09-30.
- [S17] "Context caching." Gemini API docs. https://ai.google.dev/gemini-api/docs/caching — accessed 2026-09-30 (page footer: "Last updated 2026-09-02 UTC").
- [S18] "Context caching" (Generate Content API / explicit caching). Gemini API docs. https://ai.google.dev/gemini-api/docs/generate-content/caching — accessed 2026-09-30.
- [S19] "How we built our multi-agent research system." Anthropic Engineering blog. Published 2025-06-13. https://www.anthropic.com/engineering/built-multi-agent-research-system — accessed 2026-09-30.
- [S20] "Tool search tool." Anthropic API docs. https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool — accessed 2026-09-30 (tool types dated `_20251119`).
- [S21] "Effective harnesses for long-running agents." Anthropic Engineering blog. Published 2025-11-26. https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents — accessed 2026-09-30.
- [S22] Anthropic model-comparison table, referenced from S9 (platform.claude.com/docs/en/models/overview) — not independently fetched this pass; model names as they appear in S8–S12/S20/S23 are treated as authoritative for today.
- [S23] "Token counting." Anthropic API docs. https://platform.claude.com/docs/en/build-with-claude/token-counting — accessed 2026-09-30.

### Cross-links to other chapters (do not drift here)
- Tool-count/tool-search tradeoffs belong mostly to **03. Проектирование инструментов агента** — this chapter only covers the context-budget angle.
- Memory tool's *content design* (what to write, memory architectures) belongs more to **11. Память агента** — this chapter covers only its context-engineering mechanics (client-side execution, `/memories` protocol, compaction interplay).
- Sub-agent isolation's *orchestration* design belongs to **13. Мультиагентные системы** — this chapter covers only the context-budget/token-isolation angle.
- MCP tool-definition token cost ties into **05. MCP** — covered here only as "tool definitions are part of the context budget."
