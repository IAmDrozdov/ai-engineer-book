# 11. Память агента — primary-source notes (spec lens)

## TL;DR (engineer must-knows, 2026-09-30)

- Anthropic ships a first-party **memory tool** (`memory_20250818`) as an API-level, client-executed file tool: Claude reads/writes files under `/memories`, your app executes the six commands (`view`, `create`, `str_replace`, `insert`, `delete`, `rename`). It pairs with **context editing** (clears old tool results) and server-side **compaction** (summarizes old turns). [S1]
- Claude Code has **two separate, complementary** memory systems: human-authored `CLAUDE.md`/`AGENTS.md` (instructions) and **auto memory** (Claude's own notes: `user`/`feedback`/`project`/`reference` typed files under `~/.claude/projects/<project>/memory/`, indexed by `MEMORY.md`, capped at 200 lines/25KB at session start). [S2]
- CoALA (2023, updated 2024) is still the reference taxonomy: **working memory** (cross-call scratch data structure, not just LLM context) + three long-term stores — **episodic** (past decision cycles/experience), **semantic** (facts about world/self), **procedural** (LLM weights + agent code, riskiest to self-modify). [S3]
- Reflexion's architecture (Actor / Evaluator / Self-Reflection, verbal reinforcement stored in an episodic buffer) is the direct ancestor of most "agent reflects on failure and writes a note to itself" designs used today, including ACE and Dynamic Cheatsheet. [S4]
- **ACE (Agentic Context Engineering, ICLR 2026)** formalizes self-improving context as a **Generator/Reflector/Curator** loop producing an evolving "playbook" of itemized bullets updated via cheap, non-LLM **incremental deltas** — explicitly built to fix "brevity bias" and "context collapse" seen in naive prompt-rewriting agents. +10.6% on agent benchmarks, +8.6% on finance, vs strong baselines (DeepSeek-V3.1 base). [S11]
- **Letta pivoted**: the `letta-ai/letta` repo now redirects to `letta-code`, an agent **CLI/harness** (`npm install -g @letta-ai/letta-code`), not just an API server. Its old MemGPT-style memory blocks now sit next to a git-backed **"MemFS"** and background **"Dreaming"** subagents that consolidate memory without interrupting the main agent. [S12][S14]
- **Mem0 shipped a new memory algorithm in April 2026**: single-pass **ADD-only** extraction (no in-place UPDATE/DELETE at write time — corrections are separate, explicit operations), entity linking into a **built-in graph** (no external Neo4j needed anymore), multi-signal retrieval (semantic + BM25 + entity + **temporal reasoning**), plus a background **"Dream"** layer (Synthesis/Supersede/Merge) that is the direct Mem0 analogue of Letta's sleep-time compute. [S15][S16][S17][S18][S19]
- **Zep/Graphiti**'s pitch is a **temporal (bi-temporal) knowledge graph**: every edge/fact carries a validity window (when it became true, when — if ever — superseded), built incrementally without full-graph recomputation. Zep reports 94.8% vs MemGPT's 93.4% on the DMR benchmark and up to +18.5% accuracy / -90% latency on LongMemEval vs baseline. [S21][S22]
- **LangGraph/LangMem** frame memory the same way CoALA does — semantic/episodic/procedural — but operationalize it as a `BaseStore` (namespace tuples, `put`/`get`/`search`) written either in the **hot path** (agent calls memory tools live) or in the **background** (a separate memory-manager process consolidates). [S23][S24]
- Benchmarks are contested: LoCoMo and LongMemEval scores climbed from "70s" to "90s%" across 2025-2026 as vendors tuned retrieval to the test sets, and the public leaderboard-chasing on LongMemEval (many independent "Show HN" projects claiming 90-100%) is itself evidence of the gaming/overfitting problem the field argues about. Mem0's own docs concede benchmark scores can be gamed by "aggressive retrieval strategies, larger context windows, or frontier models" without the underlying system improving, and report token cost (not just accuracy) as a first-class metric for this reason. [S17]
- **Filesystem-as-memory is a real 2025-2026 convergence**, not just Anthropic's opinion: Anthropic's own memory tool is a plain file API; Manus's context-engineering writeup treats the sandbox filesystem as "unlimited... persistent... directly operable" context; and Letta itself moved its memory substrate toward a git-backed filesystem (MemFS) in 2026. Nobody has published a controlled benchmark proving filesystem beats vector/graph memory tools head-to-head — treat the "filesystem wins" claim as a design trend backed by converging vendor choices, not a measured result. [S1][S29][S14] — **flagged Unverified as a quantified claim.**
- Consumer memory products differ sharply from developer tools: Claude.ai's memory (rolled out Team/Enterprise Sept 11 2025, Pro/Max Oct 23 2025) is **per-project**, editable as a plain-language summary, with an "Incognito" bypass; it is a completely different product surface from the API memory tool. [S26]
- Cross-links: hot-path vs background writing and context budgets connect to **02 Context Engineering**; the memory tool's client-executed command loop is a special case of **03 Tool Design**; Claude Code's `/memory`, `CLAUDE.md` hierarchy and auto memory sit at the boundary with **12 Deep Agents**; RAG-style retrieval overlaps **14 RAG**; benchmark-gaming and eval methodology overlap **17 Evals**.

## Current state and versions (as of 2026-09-30)

| System | Current form | Source |
|---|---|---|
| Anthropic memory tool | `type: "memory_20250818"`, available on all Claude 4+ models, no beta header required; SDK helpers `BetaAbstractMemoryTool`/`BetaLocalFilesystemMemoryTool` (Python/TS), `BetaMemoryToolHandler` (Java) | [S1] |
| Claude Code memory | Two systems: `CLAUDE.md`/`AGENTS.md` (static) + auto memory (dynamic, on by default, v2.1.214+ adds `modified` timestamp, v2.1.277+ reads `AGENTS.md` directly) | [S2] |
| Letta | Rebranded around `letta-code` CLI/desktop/cloud product; classic MemGPT V1 API server moved to an `archive` branch | [S12] |
| Letta memory | Core memory **blocks** (attach/detach, shareable across agents) + archival/recall memory + git-backed **MemFS** + **Dreaming** background subagents (`/sleeptime` CLI command, Desktop "Dream settings") | [S13][S14] |
| Mem0 | New algorithm shipped **April 2026**: ADD-only extraction, built-in graph (no external graph DB), temporal reasoning pass, **Dream** (Synthesis/Supersede/Merge), optional **Memory Decay** (opt-in ranking bias) | [S15][S16][S18][S19][S20] |
| Zep/Graphiti | Graphiti is the open-source temporal-graph engine (arXiv:2501.13956); Zep is the managed service built on a proprietary "Context Graph Engine" | [S21][S22] |
| LangMem / LangGraph Store | `create_manage_memory_tool` / `create_search_memory_tool` (hot path) + background "memory manager"; native `BaseStore` in LangGraph Platform | [S23][S24] |
| Cognee | v1.6.1 (Sept 24, 2026): Google Drive/Gmail connectors, streamed graph visualization; v1.6.0 (Sept 18, 2026): keyless local-model workflows; ships `remember`/`recall`/`improve`/`forget` API and a **COGX** exchange format to import memory from Mem0/Letta/Zep/Graphiti | [S25] |
| Claude.ai (consumer) memory | Per-project memory, editable summary, Incognito mode; Team/Enterprise since Sept 11 2025, Pro/Max since Oct 23 2025 | [S26] |
| ACE | arXiv v1 Oct 6 2025 → v3 Mar 29 2026, accepted **ICLR 2026** | [S11] |

## Timeline

- **2023-03-20**: Reflexion (arXiv:2303.11366) — Actor/Evaluator/Self-Reflection loop, verbal RL via episodic memory buffer. [S4]
- **2023-04-07**: Generative Agents (arXiv:2304.03442) — memory stream + recency/importance/relevance retrieval scoring + reflection trees. [S6]
- **2023-05-25**: Voyager (arXiv:2305.16291) — automatic curriculum + ever-growing **skill library** (procedural memory as executable code) + iterative prompting with self-verification. [S5]
- **2023-09-05** (v3 2024-03-15): CoALA (arXiv:2309.02427), published TMLR 02/2024 — working/episodic/semantic/procedural taxonomy + decision cycle. [S3]
- **2023-10-12**: MemGPT (arXiv:2310.08560) — OS-inspired virtual context management, precursor to Letta. [S10]
- **2024-02-27**: LoCoMo benchmark (arXiv:2402.17753) — very-long-term dialogue eval, up to 35 sessions / ~9K tokens/session. [S7]
- **2024-10-14** (v2 2025-03-04): LongMemEval (arXiv:2410.10813) — 500-question benchmark, indexing/retrieval/reading framework; commercial assistants showed a **30% accuracy drop** on sustained interaction. [S8]
- **2025-01-24**: Zep/Graphiti paper (arXiv:2501.13956). [S22]
- **2025-04-10**: Dynamic Cheatsheet (arXiv:2504.07952) — test-time-only adaptive memory, no weight updates, no labels required. [S9]
- **2025-09-11**: Claude.ai per-project memory launches for Team/Enterprise. [S26]
- **2025-09-XX**: Anthropic memory tool released in public beta alongside Sonnet 4.5. [S27]
- **2025-10-06** (v3 2026-03-29): ACE paper (arXiv:2510.04618), ICLR 2026. [S11]
- **2025-10-23**: Claude.ai memory expands to Pro/Max. [S26]
- **2025-11-26**: Anthropic "Effective harnesses for long-running agents" — progress-file/git-recovery pattern. [S28]
- **2026-04-XX**: Mem0 ships new ADD-only + graph + temporal-reasoning algorithm; LoCoMo 71.4→92.5, LongMemEval 67.8→94.4. [S15]
- **2026-09-18 / 2026-09-24**: Cognee v1.6.0 / v1.6.1 releases (keyless local pipelines; Google connectors). [S25]

## Mechanics

### CoALA taxonomy (the reference model) [S3]
- **Working memory**: "a data structure that persists across LLM calls," holding perceptual input, retrieved knowledge, and active goals; on each call a *subset* is synthesized into the prompt, and the LLM's output is parsed back into working-memory variables. This is explicitly broader than "the LLM's own context" — it survives resets that clear the context window.
- **Episodic memory**: stores experience from earlier decision cycles (trajectories, event flows); read into working memory during planning; agents can write new experiences from working → episodic as a learning act.
- **Semantic memory**: world/self facts; can be initialized read-only (classic RAG) or written to incrementally as the agent learns.
- **Procedural memory**: two forms — implicit (LLM weights) and explicit (agent's own code: action procedures + decision-procedure code). Must be *designer-initialized* (unlike episodic/semantic, which may start empty); self-modifying procedural memory is called out as "significantly riskier... can easily introduce bugs or allow an agent to subvert its designers' intentions."

### Anthropic memory tool — wire protocol (all VERBATIM, [S1])
Tool registration is the entire config:
```json
{"type": "memory_20250818", "name": "memory"}
```
Example `view` request/response cycle:
```json
{
  "type": "tool_use", "id": "toolu_01C4D5E6F7G8H9I0J1K2L3M4",
  "name": "memory",
  "input": {"command": "view", "path": "/memories"}
}
```
```json
{
  "type": "tool_result",
  "tool_use_id": "toolu_01C4D5E6F7G8H9I0J1K2L3M4",
  "content": "Here're the files and directories up to 2 levels deep in /memories, excluding hidden items and node_modules:\n4.0K\t/memories\n1.5K\t/memories/customer_service_guidelines.xml\n2.0K\t/memories/refund_policies.xml"
}
```
Six commands: `view` (dir listing or file content, `view_range: [start,-1]` supported, 6-char right-aligned 1-indexed line numbers, files >999,999 lines error), `create` (overwrites, description says "creates or overwrites" but reference impl errors "File already exists" — vendor explicitly says overwrite-instead is "a valid implementation choice"), `str_replace` (errors on non-unique `old_str`, lists line numbers of duplicates), `insert` (`insert_line: 0` = beginning), `delete` (recursive on directories; cannot delete `/memories` root itself), `rename` (cannot rename `/memories` root; destination-exists is an error, never silently overwritten).
The API auto-injects this system-prompt block whenever the tool is present (verbatim, [S1]):
```
IMPORTANT: ALWAYS VIEW YOUR MEMORY DIRECTORY BEFORE DOING ANYTHING ELSE.
MEMORY PROTOCOL:
1. Use the `view` command of your `memory` tool to check for earlier progress.
2. ... (work on the task) ...
   - As you make progress, record status / progress / thoughts etc in your memory.
ASSUME INTERRUPTION: Your context window might be reset at any moment, so you risk losing any progress that is not recorded in your memory directory.
```
Security is **entirely the caller's job**: the doc warns a malicious path like `/memories/../../secrets.env` can escape the sandbox and instructs validating every path against `/memories`, canonicalizing, and watching for URL-encoded traversal (`%2e%2e%2f`).
Integration: **context editing** clears specific old tool_use/tool_result blocks client-side; **compaction** summarizes the whole conversation server-side when nearing the context limit; the doc recommends combining both — compaction for context-window pressure, memory for what must survive summarization.

### Claude Code CLAUDE.md vs auto memory [S2]
Load order (broadest→narrowest, later = higher priority in context): managed policy CLAUDE.md → `~/.claude/CLAUDE.md` (user) → project `CLAUDE.md`/`.claude/CLAUDE.md` → `CLAUDE.local.md`. Imports use `@path/to/file`, max depth 4, external imports (outside working dir) trigger a one-time approval dialog. `AGENTS.md` is read **only if no CLAUDE.md/CLAUDE.local.md exists** on the path (configurable via `pluginConfigs.agents-md@builtin.options.instructionFiles`).
**Auto memory** (Claude's own writing) stores four typed note kinds — `user`, `feedback`, `project`, `reference` — as YAML-frontmatter markdown files under `~/.claude/projects/<project>/memory/`, indexed by `MEMORY.md`. Load budget: **first 200 lines or 25KB of `MEMORY.md`**, whichever comes first; topic files are read on-demand, not preloaded. If `MEMORY.md` is near/over the limit, Claude Code reminds/forces a rewrite (content past the limit is silently dropped on next load). Auto memory is **machine-local**, shared across worktrees of the same repo, not synced across machines. Root `CLAUDE.md` survives `/compact` (re-read from disk); nested CLAUDE.md and path-scoped rules only reload when a matching file is touched again.

### Letta: blocks → MemFS → Dreaming [S12][S13][S14]
Memory is organized as **blocks** — editable context strings that attach/detach from agents and can be *shared across multiple agents simultaneously*. All state (memory, messages, reasoning, tool calls) is persisted server-side; agents self-edit memory via tools. The 2026 product (`letta-code`) layers a git-backed **MemFS** and **"Dreaming"**: background subagents review recent conversation, extract durable lessons, and commit them to the shared MemFS without blocking the primary agent; an optional second background conversation lets the agent "review and revise proposed memory updates" before they land. Triggers: after N completed steps, or on context-window compaction. Configured via CLI `/sleeptime` or Desktop "Dream settings." This is architecturally identical in spirit to Mem0's "Dream" (see below) despite unrelated naming history — a real 2026 convergence on **sleep-time / background consolidation** as the standard third phase (write → consolidate → forget) beyond hot-path write/read.

### Mem0: pipeline, graph, decay [S16][S17][S18][S19][S20]
**Extraction pipeline (6 stages, verbatim structure, [S17])**: (1) Store New Memories — async, after the agent responds; (2) Context Lookup — dedup against related existing memories; (3) Distill Memories — **single-pass, ADD-only** LLM extraction (no UPDATE/DELETE at this stage — key architectural decision: "New facts are stored alongside old ones. Nothing is overwritten or deleted... This preserves temporal context and eliminates information loss from premature consolidation."); (4) Deduplicate + Embed — hash-based; (5) Graph Memory (entity linking) — proper nouns/quoted text/compound noun phrases become graph nodes automatically, **no external graph DB** (this replaced the old `enable_graph` + Neo4j/Memgraph/Kuzu/Neptune integration — `relations` field is now always empty for back-compat); (6) Temporal Reasoning — a separate async pass tags each memory with event time, ongoing/completed state, precision, and type (event/state/plan/preference/relationship/absence).
**Retrieval**: four signals fused — semantic (vector), keyword (BM25 + verb-lemmatization), entity (co-occurrence boost), temporal (matches query's classified temporal intent against write-time metadata; "additive... semantic relevance always dominates... relevant memories are never dropped"). Storage layout: SQL DB (facts+metadata+history log), vector DB (embeddings), entity/graph store.
**Dream** (background consolidation, three independent actions, [S18]):
- **Supersede** — always on, all plans, runs at write time: marks an older fact outdated when a newer one contradicts it; old fact is *not deleted*, just labeled, and still returned by default reads (`latest_only=true` hides it).
- **Merge** — always on, all plans, write-time: folds duplicates into one canonical memory; merged record hidden by default (`include_merged=true` reveals it).
- **Synthesis** — opt-in, Pro+ only, scheduled background job: distills recurring patterns into new "pattern memories" that link back to their evidence, additive (never replaces sources), requires ≥20 memories per user, cadence 7 days (Pro) / daily-configurable (Enterprise), ~24h propagation delay after a scheduled run.
COMPOSED example of the read-mode matrix from the doc: default read = active+superseded (hides merged); `latest_only=true` = active only; `include_merged=true` = everything.
**Memory Decay** (opt-in per project, v3 search only): a **soft ranking multiplier** in `[0.3×, 1.5×]` based on last-access recency/frequency — never a hard filter (floor 0.3×, ceiling 1.5×); widens candidate pool to `top_k×3` (min 50) before reordering, clamps the *public* score back to `[0,1]`.

### Zep/Graphiti: bi-temporal context graph [S21][S22]
A "context graph" is a temporal graph where **every fact/edge carries a validity window** — when it became true, when (if ever) superseded — plus provenance back to the raw **episode** it was derived from. Components: entities (nodes, with summaries that evolve over time), facts/relationships (edges, temporal windows), episodes (raw ingested data = ground truth), custom types (Pydantic-defined ontology). Supports **incremental updates** without full-graph recomputation — the explicit contrast with static KG rebuilds. Zep (managed) sits on a proprietary "Context Graph Engine"; Graphiti (OSS) is the underlying framework, pluggable across Neo4j/FalkorDB/Kuzu/Neptune drivers and OpenAI/Azure/Gemini LLM+embedder backends.

### ACE: Generator/Reflector/Curator, verbatim mechanics [S11]
Three specialized roles avoid overloading one model: **Generator** produces reasoning trajectories for new queries and marks which context "bullets" it found useful/misleading; **Reflector** critiques those traces to extract lessons (optionally iterating over multiple passes); **Curator** synthesizes lessons into **compact delta entries**, merged into the existing context by "lightweight, non-LLM logic" — deterministic, not another LLM call, which is what makes deltas cheap and parallelizable. Context is represented as **itemized bullets**, each with metadata (unique ID, helpful/harmful counters) and content (a reusable strategy, concept, or failure mode) — explicitly compared to Dynamic Cheatsheet's memory entries and to **A-MEM** (Xu et al. 2025), extended with counters and provenance. **Grow-and-refine**: new bullets append; existing bullets update in place (counters); periodic or lazy de-duplication via embedding similarity, triggered either after every delta or lazily when context length is exceeded. Two documented failure modes it targets: **brevity bias** (naive summarization drops domain detail) and **context collapse** (iterative full-context rewriting erodes detail over repeated passes). On AppWorld (Sept 2025 snapshot), ReAct+ACE (59.4% avg) matched IBM CUGA (60.3%, a production GPT-4.1 agent) despite running on the smaller open-source DeepSeek-V3.1, and beat CUGA on the harder test-challenge split by +8.4% TGC / +0.7% SGC with online adaptation.

### Reflexion architecture [S4]
Three LLM-instantiated roles: **Actor** ($M_a$) generates text/actions (variants explored: CoT, ReAct); **Evaluator** ($M_e$) scores Actor outputs (reward functions per task type, or LLM-as-evaluator); **Self-Reflection** ($M_{sr}$) generates verbal reinforcement cues from the (trajectory, reward) pair plus persistent memory. Actor conditions on **both** short-term (current trajectory) and long-term memory (accumulated self-reflections) — an explicit two-tier memory inside the loop, predating most "agent memory" product terminology. Reported result: 91% pass@1 on HumanEval, vs GPT-4's 80% baseline at the time (2023). Loop: init Actor/Evaluator/Self-Reflection → generate initial reflection → while not passed and under max trials: act, evaluate, reflect, retry.

### Voyager: skill library as procedural memory [S5]
Three components: **automatic curriculum** (proposes next exploration task given current state); **skill library** (ever-growing store of executable JS action programs, e.g. `craftStoneShovel()`, `combatZombieWithSword()` — retrievable and composable); **iterative prompting** (refine code against environment feedback/execution errors, loop until a **self-verification** module confirms task completion, only then commit the program to the skill library). This is procedural memory in CoALA's sense, but crucially it is *validated before being written* — self-verification gates every addition, addressing the "garbage in, garbage retrieved" failure mode of naive skill accumulation. Reported: 3.3x more unique items, 2.3x longer travel distance, unlocks tech-tree milestones up to 15.3x faster than prior SOTA; skills transfer to a fresh world to solve novel tasks "from scratch."

### Generative Agents: recency/importance/relevance retrieval [S6]
Retrieval score over the memory stream is an explicit weighted sum (VERBATIM formula, [S6]):
`score = α_recency · recency + α_importance · importance + α_relevance · relevance`, all three components min-max normalized to [0,1], all α=1 in their implementation.
- **Recency**: exponential decay over sandbox-hours since last retrieval, decay factor **0.995**.
- **Importance**: LLM-rated 1-10 "poignancy" via a fixed prompt ("On a scale of 1 to 10, where 1 is purely mundane... and 10 is extremely poignant... rate the likely poignancy of the following piece of memory").
- **Relevance**: cosine similarity between the memory's embedding and the current query's embedding.
Top-ranked memories filling the context window are included in the prompt. This scoring formula is the direct ancestor of "importance-weighted retrieval" as a design pattern cited across nearly every later memory framework.

### LangGraph/LangMem operational model [S23][S24]
Short-term memory = thread-scoped state via a checkpointer (survives within/across turns of one thread). Long-term memory = cross-thread `BaseStore`, namespaced by tuples (commonly `(user_id, context)`), with `put`/`get`/`search` (search supports both metadata filter and semantic query). LangMem maps directly onto CoALA's three long-term types: semantic (facts/preferences), episodic (past actions/few-shot examples), procedural (system prompts/behavior rules). Two write paths: **hot path** (`create_manage_memory_tool`/`create_search_memory_tool`, agent calls them live — immediate but adds latency to the turn) vs **background** ("memory manager" consolidates asynchronously — no turn latency, but memory lags real time).

### Anthropic's own doctrine: memory vs RAG vs compaction [S27][S1]
Anthropic frames memory as **"just-in-time" retrieval**: "Rather than loading all relevant information up front, an agent records what it learns in memory files and reads them back on demand" — explicitly contrasted with RAG's pre-retrieval-everything pattern. The companion long-running-agent pattern [S28] (Nov 26, 2025) is a COMPOSED-from-source description of a concrete file layout: an **initializer session** writes a progress log + feature checklist + init script *before* substantive work; every later session reads those files first; sessions end by updating the progress log; git commits provide rollback/audit trail. Verbatim: `"It is unacceptable to remove or edit tests because this could lead to missing or buggy functionality."` Key discipline: mark a feature done only after **end-to-end verification**, not when code is written — keeps the log trustworthy across sessions.

## Numbers (with conditions and source)

| Metric | Value | Conditions | Source |
|---|---|---|---|
| LoCoMo, Mem0 old→new algorithm | 71.4 → **92.5** | top_200 retrieval budget, mean 7.0K tokens, p50 latency 0.88s | [S15] |
| LongMemEval, Mem0 old→new | 67.8 → **94.4** | same conditions, 6.8K tokens, 1.09s | [S15] |
| BEAM 1M / 10M, Mem0 new | **64.1** / **48.6** | 6.7K/6.9K tokens, ~1.0-1.05s | [S15] |
| LoCoMo breakdown, Mem0 new algo | Single-hop 91.2, Multi-hop 91.3, Open-domain 72.7, Temporal 92.0, mean tokens 6,956 | [S17] |
| Full-context baseline token cost | 25,000+ tokens/query | "routinely," same benchmarks, per Mem0's own comparison | [S17] |
| Zep vs MemGPT, DMR benchmark | 94.8% vs 93.4% | Deep Memory Retrieval benchmark defined by the MemGPT team | [S22] |
| Zep on LongMemEval | up to +18.5% accuracy, -90% latency | vs unspecified "baseline implementations" | [S22] |
| LongMemEval, commercial assistants | -30% accuracy | "sustained interaction" vs short-context baseline | [S8] |
| Reflexion on HumanEval | 91% pass@1 | vs GPT-4 baseline 80% (2023 models) | [S4] |
| Voyager vs prior SOTA | 3.3x unique items, 2.3x distance, up to 15.3x faster milestones | Minecraft, GPT-4 backend | [S5] |
| ACE on AppWorld avg | ReAct+ACE 59.4% vs IBM CUGA 60.3% | Sept 20, 2025 leaderboard snapshot; ACE uses smaller DeepSeek-V3.1 vs CUGA's GPT-4.1 | [S11] |
| ACE on AppWorld test-challenge | +8.4% TGC, +0.7% SGC over CUGA | online adaptation setting | [S11] |
| ACE improvement over baselines | +10.6% agents, +8.6% finance | across benchmarks vs strong baselines (ICL/GEPA/DC) | [S11] |
| LoCoMo dataset scale | avg 300 turns, ~9K tokens/session, up to 35 sessions | dataset construction stats | [S7] |
| Cognee BEAM (own report) | 0.79 @ 100K tokens, 0.67 @ 10M tokens | different scale (0-1) and context sizes than Mem0's BEAM table — **not directly comparable**, LLM-judge scored | [S25] |
| Recency decay factor, Generative Agents | 0.995 | exponential decay per sandbox-hour since last retrieval | [S6] |
| Mem0 Decay scaling range | 0.3× (floor) to 1.5× (ceiling) | opt-in, v3 search only | [S20] |
| Mem0 Synthesis threshold/cadence | ≥20 memories/user; every 7 days (Pro) or daily (Enterprise) | ~24h propagation after scheduled run | [S18] |
| Claude Code auto memory read budget | first 200 lines OR 25KB of MEMORY.md | whichever smaller, at session start | [S2] |

## Pitfalls, limits, criticism

- **Benchmark gaming / comparability crack** (vendor controversy, directly in scope): Mem0's own docs admit "smaller [benchmarks] like LoCoMo and LongMemEval[] can be materially improved by aggressive retrieval strategies, larger context windows, or frontier models" without the underlying memory system improving — an explicit vendor self-criticism of the metric they also report. [S17] Corroborating circumstantial evidence: a wave of small open-source "Show HN" memory projects in 2026 independently claim 79-100% on LongMemEval (see HN search results dated Jan-Sep 2026), a spread inconsistent with a stable, hard-to-game benchmark. Treat any single-number LoCoMo/LongMemEval claim as needing its retrieval-budget and token-cost conditions before comparison.
- **BEAM is not one benchmark**: Mem0 and Cognee both report "BEAM" scores but on different scales (0-100 vs 0-1) and different context sizes (Mem0: 1M/10M; Cognee: 100K/10M) — a name collision or fork that makes cross-vendor comparison unsafe without reading both methodology docs. [S15][S25]
- **ADD-only extraction trades storage for correctness-under-uncertainty**: Mem0's new pipeline explicitly never overwrites at write time (Supersede/Merge run as a *separate*, later pass) — this avoids the classic MemGPT-era failure of a wrong LLM-issued UPDATE silently destroying a still-true fact, but it means raw storage grows monotonically until Dream (Pro+ only) or manual deletion catches up. [S16][S18]
- **Path traversal is the implementer's problem, not the model's**: Anthropic's memory tool explicitly delegates all sandboxing (`/memories` containment, `../` and `%2e%2e%2f` handling) to the calling application; a naive handler is directly exploitable. [S1]
- **Self-modifying procedural memory is the riskiest memory write**, per CoALA's own framing — bugs or goal-subversion risk is called out explicitly, well before "agents that edit their own prompts/skills" became a 2025-2026 industry trend. [S3]
- **Voyager's skill library only works because of the self-verification gate**; without it, procedural-memory accumulation compounds errors instead of skills — a reusable design lesson for any "skill library" memory architecture. [S5]
- **Claude Code CLAUDE.md is advisory, not enforced**: "Claude treats CLAUDE.md as context, not enforced configuration... there's no guarantee of strict compliance" — hard constraints must go in hooks, not memory files. [S2]
- **Auto memory silently truncates**: writing past the 200-line/25KB `MEMORY.md` budget doesn't error at write time — content past the limit is simply not loaded next session, a quiet staleness/data-loss mode unless the agent notices the size-limit reminder Claude Code injects. [S2]
- **CoALA's own caveat on grounding vs memory conflation**: much of "RAG" is really CoALA's semantic memory used read-only; the taxonomy exists partly to stop calling every retrieval system "memory" without specifying which slot and which read/write discipline it implements. [S3]

## What changed in the last 6 months (since ~2026-03/04)

- **Mem0's April 2026 algorithm rewrite** is the single largest documented architecture change in scope: dropped external graph-DB dependency for a native built-in graph, added a dedicated temporal-reasoning pass, moved to ADD-only extraction, and added the three-part **Dream** background-consolidation layer (Synthesis/Supersede/Merge) plus opt-in Memory Decay — collectively roughly +20-27 accuracy points on LoCoMo/LongMemEval over the prior algorithm, at under 7K tokens/query. [S15][S17]
- **Letta's product identity shifted** from "memory-server API" toward an agent CLI/harness (`letta-code`) with git-backed **MemFS** and **"Dreaming"** background subagents — converging on the same hot-path/background-consolidation split as Mem0's Dream and LangMem's memory manager, despite independent naming. [S12][S14]
- **Cognee** shipped keyless, fully local pipelines (v1.6.0, Sept 18 2026) and Google Drive/Gmail connectors with chunked graph visualization (v1.6.1, Sept 24 2026), plus a **COGX** interchange format specifically for migrating memory *between* Mem0/Letta/Zep/Graphiti — implicit acknowledgment that the market now has enough competing memory stores to need a portability format. [S25]
- ACE reached **ICLR 2026** acceptance (v3, March 29 2026), cementing generator/reflector/curator as a named reference architecture for self-improving context, distinct from (but citing) Dynamic Cheatsheet. [S11]
- Anthropic's memory tool and compaction moved from "beta announcement" (Sept 2025) to being cross-referenced as a standard combined pattern in current docs — "compaction keeps the active context small without client-side bookkeeping, and memory preserves the information that must survive summarization" is now presented as the recommended default, not an either/or choice. [S1]

## Diagram candidates

1. **CoALA decision cycle** — actors: Working Memory (hub), Episodic/Semantic/Procedural Memory, LLM, Grounding interfaces. Arrows: retrieve → working memory; working memory → prompt → LLM; LLM output → parse → working memory; working memory → write → long-term stores. [S3]
2. **Anthropic memory tool request/response loop** — actors: Claude, Application handler, `/memories` store. Arrows: `tool_use(view/create/...)` → handler executes → `tool_result` → back to Claude; side note box on path-validation gate. [S1]
3. **Context editing + compaction + memory, three-layer diagram** — states: active context window, server-side compaction (summarize), client-side context-editing (clear tool results), memory files (persist outside window). [S1][S27]
4. **Mem0 extraction pipeline** — 6 numbered stages as a pipeline: Store→Context Lookup→Distill (ADD-only)→Dedup+Embed→Entity/Graph Link→Temporal Tag; three storage sinks at the end (SQL/Vector/Graph). [S17]
5. **Mem0 Dream state machine** — states: Active, Superseded (linked to newer fact), Merged (linked to canonical); transitions labeled Supersede/Merge (write-time, automatic) and Synthesis (scheduled, produces new Pattern Memory node). [S18]
6. **Zep/Graphiti bi-temporal edge** — an edge/fact node with two timestamps (t_valid, t_invalid/superseded-at) and a provenance arrow back to its source Episode. [S21]
7. **ACE Generator/Reflector/Curator loop** — Generator produces trajectory + marks bullets helpful/harmful → Reflector extracts delta lessons → Curator merges deltas (non-LLM, deterministic) into the Playbook (itemized bullets with counters) → next Generator call reads Playbook. [S11]
8. **Reflexion loop** — Actor→environment→Evaluator (reward)→Self-Reflection (verbal cue)→long-term memory buffer→back to Actor next trial; short-term memory (trajectory) feeding Actor in parallel. [S4]
9. **Voyager three-component loop** — Automatic Curriculum proposes task → Iterative Prompting (code, env feedback, self-verification loop) → on pass, commit to Skill Library → Curriculum queries Skill Library for next task. [S5]
10. **Generative Agents retrieval scoring** — a bar/funnel diagram: raw Memory Stream → three parallel scorers (Recency exp-decay, Importance LLM-rated 1-10, Relevance cosine-sim) → weighted sum → top-K into prompt. [S6]
11. **Claude Code memory load order** — vertical stack, broad-to-narrow, bottom = highest priority in context: Managed policy → User `~/.claude/CLAUDE.md` → Project CLAUDE.md/AGENTS.md → `CLAUDE.local.md`; a side branch for auto-memory's separate `MEMORY.md` index + topic files. [S2]
12. **LangGraph short-term vs long-term memory** — Thread-scoped State+Checkpointer (short-term) vs cross-thread namespaced BaseStore (long-term); hot-path write (agent tool call, in-turn) vs background write (memory-manager process, async) as two arrows into the Store. [S23][S24]

**Chart candidates (real series)**:
- Mem0 old-vs-new algorithm bar chart: LoCoMo 71.4→92.5, LongMemEval 67.8→94.4, with token-cost as a secondary axis (7.0K/6.8K). [S15]
- LoCoMo category breakdown bar chart for Mem0's new algorithm: Single-hop 91.2, Multi-hop 91.3, Open-domain 72.7, Temporal 92.0. [S17]
- Mem0 Decay scaling-factor curve: state (just-accessed/today/idle-days/idle-weeks/idle-months+) → factor (1.5×/1.2-1.4×/0.6-1.0×/0.4-0.6×/0.3×). [S20]

## Glossary

- **Working memory (CoALA)**: cross-call persistent scratch data structure, broader than "LLM context." [S3]
- **Episodic memory**: stored record of past decision cycles/experience, replayed for reasoning support. [S3]
- **Semantic memory**: stored facts about the world/self, read-only or writable. [S3]
- **Procedural memory**: LLM weights + agent's own code (actions and decision procedures); riskiest to self-modify. [S3]
- **Memory tool** (Anthropic): client-executed, file-based Anthropic tool type `memory_20250818` operating under `/memories`. [S1]
- **Context editing**: client-side clearing of old tool_use/tool_result blocks (Anthropic). [S1]
- **Compaction**: server-side summarization of an entire conversation nearing the context limit (Anthropic). [S1]
- **Auto memory** (Claude Code): Claude's self-written notes (`user`/`feedback`/`project`/`reference`), separate from `CLAUDE.md`. [S2]
- **MemFS** (Letta, 2026): git-backed memory filesystem shared between primary and sleep-time (background) agents. [S14]
- **Dreaming / sleep-time compute**: background agent process that consolidates/reviews memory without blocking the primary agent (Letta term); functionally parallel to Mem0's "Dream." [S14]
- **Dream** (Mem0): three background actions — Supersede, Merge, Synthesis — that keep memory coherent without changing the read/write API. [S18]
- **ADD-only extraction** (Mem0): write-time policy of only adding new facts, never overwriting, with correction handled by a separate later pass. [S16]
- **Context Graph / temporal knowledge graph** (Zep/Graphiti): a KG where facts carry validity windows and trace back to source episodes. [S21]
- **Playbook** (ACE): the evolving, itemized-bullet context object curated by Generator/Reflector/Curator. [S11]
- **Grow-and-refine** (ACE): append-then-deduplicate context maintenance strategy. [S11]
- **Brevity bias / context collapse** (ACE): the two failure modes ACE is designed against — over-compression dropping detail, vs iterative rewriting eroding detail over time. [S11]
- **DMR (Deep Memory Retrieval)**: benchmark originally defined by the MemGPT team, later used by Zep for comparison. [S22]
- **BaseStore** (LangGraph): the long-term-memory interface (`put`/`get`/`search`) namespaced by tuples. [S23][S24]
- **Hot path vs background** memory writing: agent writes memory live during the turn (hot path) vs a separate async process consolidates later (background). [S23][S27]

## Unverified / open questions

- **ChatGPT (OpenAI) memory mechanics** — could not verify live in this session: `help.openai.com/en/articles/8590148-memory-faq` returned HTTP 403 to both the default and a spoofed browser user agent, and OpenAI's `openai/index/memory-and-new-controls-for-chatgpt` announcement page also returned 403. No claim about "saved memories" vs "reference chat history" mechanics is made here pending a working fetch. Needs a follow-up session with a different fetch path (e.g., an authenticated browser tool) or the OpenAI help-center's raw API if one exists.
- **"Filesystem beats memory tools" as a measured result**: I found strong *design-convergence* evidence (Anthropic's memory tool is filesystem-based [S1]; Manus explicitly treats the sandbox filesystem as unlimited persistent context [S29]; Letta itself moved to a git-backed MemFS in 2026 [S14]) but **no single controlled benchmark** where a filesystem-only approach is shown beating Mem0/Zep/Letta-style memory tools head-to-head on LoCoMo/LongMemEval under matched conditions. The editor's brief names this as an expected finding; treat it as a documented industry design trend, not a citable number, until a specific paper/benchmark is located.
- **Letta core memory tool exact names** (`core_memory_append`, `core_memory_replace`): surfaced by the fetch summarizer reading `docs.letta.com/guides/agents/memory` but not independently re-verified against Letta's raw tool-schema reference or SDK source in this session — treat as probably-correct but unconfirmed at the wire-format level.
- **Claude.ai consumer memory internals** (how the "memory summary" is generated/updated, exact triggers): [S26] covers user-facing behavior (per-project scoping, edit-by-chatting, Incognito) but not the underlying extraction pipeline (no equivalent of Mem0's ADD-only/Dream detail was published for the consumer product as of this session).
- **A-MEM** (Xu et al. 2025), cited by ACE as a precedent for itemized memory entries, was not independently opened in this session — only referenced via the ACE paper's citation. Worth a dedicated read if the chapter needs A-MEM's own mechanics.
- Did not independently verify Voyager's Minecraft-specific numeric claims (3.3x/2.3x/15.3x) beyond the paper's own abstract/body text — no independent replication source checked.

## Sources

- [S1] "Memory tool," Anthropic (platform.claude.com), publisher Anthropic, no explicit page date shown (references `claude-opus-5-5` model — post-2025 doc), https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool, accessed 2026-09-30
- [S2] "How Claude remembers your project," Anthropic Claude Code docs, https://code.claude.com/docs/en/memory, accessed 2026-09-30 (references Claude Code v2.1.28x, i.e. 2026 releases)
- [S3] Sumers, Yao, Narasimhan, Griffiths, "Cognitive Architectures for Language Agents" (CoALA), arXiv:2309.02427, published 2023-09-05, v3 2024-03-15 (TMLR 02/2024), https://arxiv.org/abs/2309.02427, accessed 2026-09-30
- [S4] Shinn, Cassano, Gopinath, Narasimhan, Yao, "Reflexion: Language Agents with Verbal Reinforcement Learning," arXiv:2303.11366, published 2023-03-20, v4 2023-10-10, https://arxiv.org/abs/2303.11366, accessed 2026-09-30
- [S5] Wang, Xie, Jiang, Mandlekar, Xiao, Zhu, Fan, Anandkumar, "Voyager: An Open-Ended Embodied Agent with Large Language Models," arXiv:2305.16291, published 2023-05-25, v2 2023-10-19, https://arxiv.org/abs/2305.16291, accessed 2026-09-30
- [S6] Park, O'Brien, Cai, Morris, Liang, Bernstein, "Generative Agents: Interactive Simulacra of Human Behavior," arXiv:2304.03442, published 2023-04-07 (UIST '23), https://arxiv.org/abs/2304.03442, accessed 2026-09-30
- [S7] Maharana et al., "Evaluating Very Long-Term Conversational Memory of LLM Agents" (LoCoMo), arXiv:2402.17753, published 2024-02-27, https://arxiv.org/abs/2402.17753, accessed 2026-09-30
- [S8] Wu et al., "LongMemEval: Benchmarking Chat Assistants on Long-Term Interactive Memory," arXiv:2410.10813, published 2024-10-14, v2 2025-03-04, https://arxiv.org/abs/2410.10813, accessed 2026-09-30
- [S9] Suzgun et al., "Dynamic Cheatsheet: Test-Time Learning with Adaptive Memory," arXiv:2504.07952, published 2025-04-10, https://arxiv.org/abs/2504.07952, accessed 2026-09-30
- [S10] Packer, Wooders, Lin, Fang, Patil, Stoica, Gonzalez, "MemGPT: Towards LLMs as Operating Systems," arXiv:2310.08560, published 2023-10-12, v2 2024-02-12, https://arxiv.org/abs/2310.08560, accessed 2026-09-30
- [S11] Zhang, Hu, Upasani, Ma, Hong, Kamanuru, Rainton, Wu, Ji, Li, Thakker, Zou, Olukotun, "Agentic Context Engineering: Evolving Contexts for Self-Improving Language Models" (ACE), arXiv:2510.04618, published 2025-10-06, v3 2026-03-29 (ICLR 2026), https://arxiv.org/abs/2510.04618 / full text https://arxiv.org/html/2510.04618v3, accessed 2026-09-30
- [S12] Letta / letta-ai, GitHub README, https://github.com/letta-ai/letta (raw: raw.githubusercontent.com/letta-ai/letta/main/README.md), accessed 2026-09-30
- [S13] "Letta's memory architecture," Letta docs, https://docs.letta.com/guides/agents/memory, accessed 2026-09-30
- [S14] "Sleep-time agents," Letta docs, https://docs.letta.com/guides/agents/sleep-time-agents, accessed 2026-09-30
- [S15] Mem0, GitHub README, https://github.com/mem0ai/mem0 (raw: raw.githubusercontent.com/mem0ai/mem0/main/README.md), "New Memory Algorithm (April 2026)" section, accessed 2026-09-30
- [S16] "How Mem0 Works," Mem0 docs, https://docs.mem0.ai/core-concepts/how-it-works, accessed 2026-09-30
- [S17] "Memory Evaluation," Mem0 docs, https://docs.mem0.ai/core-concepts/memory-evaluation, accessed 2026-09-30
- [S18] "Dream," Mem0 docs, https://docs.mem0.ai/platform/features/dream, accessed 2026-09-30
- [S19] "Graph Memory," Mem0 docs, https://docs.mem0.ai/platform/features/graph-memory, accessed 2026-09-30
- [S20] "Memory Decay," Mem0 docs, https://docs.mem0.ai/platform/features/memory-decay, accessed 2026-09-30
- [S21] Graphiti (getzep/graphiti), GitHub README, https://github.com/getzep/graphiti (raw: raw.githubusercontent.com/getzep/graphiti/main/README.md), accessed 2026-09-30
- [S22] Rasmussen, Paliychuk, Beauvais, Ryan, Chalef, "Zep: A Temporal Knowledge Graph Architecture for Agent Memory," arXiv:2501.13956, published 2025-01-24, https://arxiv.org/abs/2501.13956, accessed 2026-09-30
- [S23] LangMem, GitHub README, https://github.com/langchain-ai/langmem (raw: raw.githubusercontent.com/langchain-ai/langmem/main/README.md), accessed 2026-09-30
- [S24] "Memory," LangGraph / LangChain docs, https://docs.langchain.com/oss/python/langgraph/memory, accessed 2026-09-30
- [S25] Cognee (topoteretes/cognee), GitHub README, https://github.com/topoteretes/cognee (raw: raw.githubusercontent.com/topoteretes/cognee/main/README.md), release notes for v1.6.0 (2026-09-18) and v1.6.1 (2026-09-24), accessed 2026-09-30
- [S26] "Claude's memory," Anthropic/Claude product blog, https://claude.com/blog/memory (redirected from anthropic.com/news/memory), rollout dates 2025-09-11 and 2025-10-23 per page text, accessed 2026-09-30
- [S27] "Effective context engineering for AI agents," Anthropic Engineering blog, https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents, accessed 2026-09-30
- [S28] "Effective harnesses for long-running agents," Anthropic Engineering blog, https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents, published 2025-11-26, accessed 2026-09-30
- [S29] Yichao "Peak" Ji, "Context Engineering for AI Agents: Lessons from Building Manus," Manus blog, https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus, published 2025-07-18, accessed 2026-09-30
- [S30] Hacker News (hn.algolia.com search API), multiple "Show HN" agent-memory / LongMemEval submissions dated 2025-12 through 2026-09 (used only as evidence of a benchmark-inflation pattern, not as factual claims about any individual project), accessed 2026-09-30
