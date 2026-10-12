# 11. Память агента — field reports notes

## TL;DR (what an engineer must know today, 2026-09-30)

- "Memory" in production is not one thing: (working/short-term = context window) vs (long-term = external store), and long-term splits into semantic (facts), episodic (events/experience), procedural (skills/how-to) — the taxonomy is CoALA's, not a vendor's [S8].
- The single biggest 2026 field finding: **a dumb filesystem + grep/search beats a "smart" vector memory tool on the flagship benchmark**. Letta showed agents storing raw conversation history as files and searching with `grep`/`search_files` hit **74.0%** on LoCoMo, beating Mem0's best (graph) variant at **68.5%** — because "agents today are highly effective at using tools... especially those likely to have been in their training data" [S1, 2025-08-12]. This directly informs the chapter's "practical design guide" section: try files-plus-search before reaching for a memory product.
- Anthropic shipped a first-party, client-side **memory tool** (`memory_20250818`) for the API in 2025, and Claude Code has two *separate* memory systems: user-authored `CLAUDE.md`/`AGENTS.md` (instructions) and **auto memory** (Claude's own notes, on by default, capped at 200 lines/25KB for the loaded index) [S2].
- Mem0's own paper reports **26% relative improvement** (LLM-as-Judge) over a full-context OpenAI baseline on LoCoMo, **91% lower p95 latency**, **>90% token savings** — but graph memory only added ~2% accuracy for ~2x cost and 3x slower search, and Mem0 shipped v3 (2026) *removing* graph storage in favor of lightweight entity-linking [S3, S9].
- Zep publicly disputed Mem0's benchmark methodology in "Is Mem0 Really SOTA?" — this is a live, unresolved vendor fight, not settled science [S9].
- LoCoMo and LongMemEval are the two benchmarks everyone cites, but LongMemEval itself found a **30% accuracy drop** on long-term memorization tasks even for commercial assistants and long-context LLMs [S6].
- Self-improvement without weight updates is now a named pattern family: Reflexion (2023, verbal reinforcement) → Dynamic Cheatsheet (2025, test-time-only, no labels) → ACE/Agentic Context Engineering (2025, generator/reflector/curator "playbooks" that avoid "brevity bias" and "context collapse") [S10, S11, S12].
- Sleep-time / background memory consolidation is now a released Letta feature ("dreaming"): background subagents review conversations and update memory asynchronously, optionally with a second-pass reviewer, without blocking the live agent [S4].
- Consumer products converged on cross-session memory in 2025-2026: Claude's memory (Sept 2025, per-project, "incognito" mode, ChatGPT-memory import) and ChatGPT's own memory/"reference chat history" split [S13, S5].
- Knowledge-graph memory is a genuine production trap for solo builders: a full year-long build-out (MongoDB + custom ontology + Neo4j-style graph) produced a public "5 mistakes" postmortem — frameworks fight you, ontology-first design freezes projects, resolution ≠ deduplication, and immutable-log versioning is "crazy expensive" on RAM [S14].
- A live, unresolved GitHub issue against Mem0 OSS + Qdrant (53-comment thread, opened June 2026) names three concrete production failure modes: **time-blindness** (vector similarity ranking has no recency signal), **semantic conflicts** (near-duplicate facts pile up, LLM sees contradictory "truths"), and **missing CRUD** (no built-in update/delete to fix corrupted memories) [S15].
- "Context rot": independent research (Chroma, July 2025) measured performance degradation as input length grows across 18 models (Claude, GPT, Gemini, Qwen), even on trivial retrieval — this is the deep argument for *why* memory-as-compaction/retrieval beats just stuffing everything into a bigger window [S16].
- Cross-link: context-window mechanics, compaction, and the general "what goes in context" framing belong to **Ch.02 Context Engineering**; the memory *tool*'s JSON wire format sits at the boundary with **Ch.03 Tool Design**; Claude Code's own architecture (auto memory internals, `/memory`, subagent memory) is picked up again in **Ch.12 Deep Agents**; OWASP's memory-poisoning defense work overlaps **Ch.16 Security**.

## Current state and versions (as of 2026-09-30)

- **Anthropic memory tool**: `{"type": "memory_20250818", "name": "memory"}`, available on Claude 4 and later models, API-level, client-side (app executes file ops against `/memories`). SDKs (Python, TS, C#, Java) ship `BetaAbstractMemoryTool`/`betaMemoryTool` helpers; Python/TS also ship a ready-made `BetaLocalFilesystemMemoryTool`. Pairs with server-side **compaction** and client-side **context editing** [S2].
- **Claude Code memory** (as documented on `code.claude.com`, referencing CLI versions up to v2.1.283 as of this doc's fetch): two systems — `CLAUDE.md`/`AGENTS.md` (user-authored) and **auto memory** (Claude-authored, 4 note types: `user`, `feedback`, `project`, `reference`; stored under `~/.claude/projects/<project>/memory/` with a `MEMORY.md` index; on by default, toggled via `/memory` or `autoMemoryEnabled`) [S2].
- **Claude consumer memory** (claude.ai apps): announced **2025-09-11** for Team/Enterprise, expanded to Pro/Max **2025-10-23**; per-project memory isolation, editable summary, "incognito chat," and an explicit ChatGPT-memory import flow [S13].
- **Letta** (formerly MemGPT): memory blocks (core memory) are always-in-context, labeled/described/size-limited, shareable across agents via `block_ids`; separate archival and recall memory tiers; **sleep-time agents** ("dreaming") ship as a background-subagent feature for async consolidation [S4]. Letta's LoCoMo filesystem-search result (74.0%) is dated **2025-08-12** [S1].
- **Mem0**: current architecture is add → extract facts (LLM) → dedupe/embed → entity extraction → graph memory optional. Mem0 **v3 (April 2026)** reportedly dropped native graph storage in favor of spaCy-based entity linking (hub-and-spoke), per a secondary synthesis source — flagged as needing primary-source confirmation from Mem0's own changelog [S3, unverified detail]. Mem0's paper (arXiv 2504.19413, 2025-04-28) is the citable primary source for the graph-memory cost/accuracy tradeoff.
- **Zep / Graphiti**: Graphiti is the open-source temporal-knowledge-graph engine; Zep is the managed product built on a proprietary "Context Graph Engine." Paper: arXiv 2501.13956 (2025-01-20) [S9].
- **LangMem / LangGraph Store**: hot-path tools (`create_manage_memory_tool`, `create_search_memory_tool`) for in-conversation writes, plus a background memory manager for async extraction/consolidation; backed by `InMemoryStore` (dev) or `AsyncPostgresStore` (prod) [S17].
- **ACE (Agentic Context Engineering)**: paper arXiv 2510.04618 (Oct 2025, v2 exists); official repo `ace-agent/ace` says "Hello World" **Nov 2025**. Reports **+10.6%** on agent tasks (AppWorld), **+8.6%** on finance (FiNER+XBRL), **86.9%** lower average adaptation latency [S11]. Note: the earlier, more-starred community repo `kayba-ai/agentic-context-engine` (HN, 2025-10-18/11-29) uses different role names (Agent/Reflector/SkillManager vs the paper's Generator/Reflector/Curator) — treat it as an independent reimplementation, not the paper's own code [S18].
- **Dynamic Cheatsheet**: paper arXiv 2504.07952 (2025-04-10), test-time-only adaptive memory, no fine-tuning [S10].
- **Benchmarks**: LoCoMo (arXiv 2402.17753, Feb 2024) and LongMemEval (arXiv 2410.10813, Oct 2024) remain the two standard long-term-memory evals as of Sept 2026; no newer benchmark has displaced them, though 2026 saw several proposed successors (TWIST, CUE-Mem, MemTrace — all arXiv Sept 2026, none yet cited as standard) [S6, S19, S20, S21].

## Timeline

- **2023-04**: Generative Agents ("Smallville") paper — recency/importance/relevance retrieval scoring [S22].
- **2023-03**: Reflexion paper — verbal self-reflection stored as episodic memory, re-fed on retry [S23].
- **2023-05**: Voyager paper — embodied Minecraft agent with a growing **skill library** as procedural memory [S24].
- **2023-09**: CoALA ("Cognitive Architectures for Language Agents") paper formalizes working/episodic/semantic/procedural memory taxonomy for LLM agents [S8].
- **2024-02**: LoCoMo benchmark released (very long-term dialogue, up to 35 sessions, 9K tokens/session avg) [S6].
- **2024-09-04**: Mem0 "Show HN" launch (201 pts, 61 comments) [S25].
- **2024-10**: LongMemEval benchmark released; found ~30% accuracy drop on sustained long-term memory tasks [S6, note: date confusion — see Unverified].
- **2025-01-20**: Zep/Graphiti paper published, claims 94.8% vs MemGPT's 93.4% on the DMR benchmark, up to 18.5% accuracy gain + 90% lower latency on LongMemEval [S9].
- **2025-04-10**: Dynamic Cheatsheet paper [S10].
- **2025-04-28**: Mem0 paper (arXiv), 26% LLM-as-Judge gain over OpenAI on LoCoMo [S3].
- **2025-08-12**: Letta publishes "filesystem beats specialized memory" LoCoMo result (74.0% vs Mem0's 68.5%) [S1].
- **2025-08**: Anthropic's memory tool (`memory_20250818`) ships in public beta alongside Sonnet 4.5 [S26].
- **2025-09-11**: Claude consumer memory announced (Team/Enterprise) [S13].
- **2025-10-18 / 2025-11-29**: Community ACE reimplementation (`kayba-ai/agentic-context-engine`) posted to HN, claims 30%→100% browser-agent success improvement [S18].
- **2025-10-23**: Claude consumer memory expands to Pro/Max [S13].
- **2025-10**: Official ACE paper posted to arXiv (2510.04618) [S11].
- **2025-11**: Official `ace-agent/ace` repo launches [S11].
- **2026-02-04**: HN "Ask HN: Mem0 stores memories, but doesn't learn user patterns" — a YC W23 founder's field report distinguishing memory-storage from implicit preference-learning [S27].
- **2026-03-03**: "Anthropic Adds Free Memory Feature and Import Tool to Lure ChatGPT Users" coverage [S13].
- **2026-04** (reported): Mem0 v3 drops native graph memory [S3 — secondary source, unverified against Mem0's own changelog].
- **2026-05-30**: "I spent a year building agent memory on knowledge graphs. Here are my 5 mistakes" posted to HN [S14].
- **2026-06-03**: Mem0 OSS + Qdrant GitHub issue #5352 opens (time-blindness, semantic conflicts, missing CRUD), 53 comments [S15].
- **2026-06-13**: Substack piece comparing Letta/Mem0/Graphiti/Cognee architectures and the Letta-vs-Mem0-vs-Zep benchmark dispute [S9].
- **2026-07-15**: HN "I reverse-engineered the three biggest agent-memory tools" [S28].

## Mechanics

### CoALA taxonomy (baseline vocabulary)
Working memory = the active context window (ephemeral, cleared or compacted). Long-term memory splits three ways: **semantic** (facts about the world/user — "user prefers aisle seats"), **episodic** (specific past experiences/interactions — "on session 4 the user rejected this approach"), **procedural** (how-to knowledge — code, skills, prompts, the model's own weights) [S8].

### Anthropic memory tool — wire format (VERBATIM, [S2])

Tool declaration (this is the entire config — no input schema needed):
```json
{
  "type": "memory_20250818",
  "name": "memory"
}
```

Claude requesting a directory listing:
```json
{
  "type": "tool_use",
  "id": "toolu_01C4D5E6F7G8H9I0J1K2L3M4",
  "name": "memory",
  "input": {
    "command": "view",
    "path": "/memories"
  }
}
```

App's reply:
```json
{
  "type": "tool_result",
  "tool_use_id": "toolu_01C4D5E6F7G8H9I0J1K2L3M4",
  "content": "Here're the files and directories up to 2 levels deep in /memories, excluding hidden items and node_modules:\n4.0K\t/memories\n1.5K\t/memories/customer_service_guidelines.xml\n2.0K\t/memories/refund_policies.xml"
}
```

Commands the client must implement: `view` (dir listing or file w/ line numbers, optional `view_range`), `create` (creates/overwrites), `str_replace` (old_str→new_str, errors on non-unique or missing match), `insert` (at `insert_line`, 0 = start of file), `delete` (recursive for dirs; cannot delete `/memories` root itself), `rename` (errors if destination exists). All paths must be validated to stay under `/memories` — the doc explicitly warns about `/memories/../../secrets.env` path-traversal attacks and recommends `pathlib.Path.resolve()` + `relative_to()` checks [S2].

When the memory tool is present, the API auto-injects this system-prompt addendum (you don't send it yourself) — VERBATIM [S2]:
```text
IMPORTANT: ALWAYS VIEW YOUR MEMORY DIRECTORY BEFORE DOING ANYTHING ELSE.
MEMORY PROTOCOL:
1. Use the `view` command of your `memory` tool to check for earlier progress.
2. ... (work on the task) ...
   - As you make progress, record status / progress / thoughts etc in your memory.
ASSUME INTERRUPTION: Your context window might be reset at any moment, so you risk losing any progress that is not recorded in your memory directory.
```

Design pattern Anthropic recommends for multi-session coding work: an **initializer session** sets up a progress log + feature checklist + reference to a startup script; every later session opens by reading those files; each session ends by updating the progress log. Mark a feature done only after end-to-end verification, not when code is written [S2].

### Claude Code: CLAUDE.md vs auto memory (VERBATIM table content, [S2])

| | CLAUDE.md files | Auto memory |
|---|---|---|
| Who writes it | You | Claude |
| What it contains | Instructions and rules | Learnings and patterns |
| Scope | Project, user, or org | Per repository, shared across worktrees |
| Loaded into | Every session | Every session (first 200 lines or 25KB) |

Auto memory writes one of 4 typed notes (`user`, `feedback`, `project`, `reference`) as separate topic files plus a `MEMORY.md` index; Claude explicitly **skips** anything derivable from the codebase (architecture, file paths) and anything already in CLAUDE.md. Storage: `~/.claude/projects/<project>/memory/`, machine-local, shared across git worktrees of the same repo, **not** synced across machines. If `MEMORY.md` exceeds the 200-line/25KB read limit, the write still succeeds but Claude Code returns an error telling Claude to rewrite the index because content past the limit silently drops on next load [S2]. AGENTS.md is read directly (no CLAUDE.md needed) as of Claude Code v2.1.277+, with a `/config` "Project instructions" setting controlling `claude-md-or-agents-md` / `claude-md-and-agents-md` / `claude-md` / `managed-only` [S2].

### Mem0 pipeline (extract → decide → store)
Per Mem0's own docs [S17]: input turns into extracted facts (not verbatim transcript) via LLM → checked against existing memories (context lookup) → deduped/embedded → entity extraction. Mem0's paper frames the decision step as one of **ADD / UPDATE / DELETE / NOOP** per extracted fact when compared against existing memory (standard Mem0-paper terminology, consistent with the docs' "additive by default, explicit update/delete for corrections" behavior) [S3, S17]. Retrieval ranks on 4 signals: semantic (vector), keyword, entity, temporal [S17].

Mem0 paper numbers (COMPOSED-from-abstract, exact wording) [S3]:
> "Mem0 achieves 26% relative improvements in the LLM-as-a-Judge metric over OpenAI, while Mem0 with graph memory achieves around 2% higher overall score than the base configuration... 91% lower p95 latency and saves more than 90% token cost."

Per the secondary synthesis [S9], the graph variant's own paper numbers show it "edged ahead on the overall score, 68.44 to 66.88" but "lost single-hop and multi-hop, ran search about 3x slower, and cost about 2x the tokens" — the stated reason Mem0 reportedly dropped native graph storage in v3.

### Zep/Graphiti — temporal knowledge graph
A **context graph** (Graphiti's own term) = entities (nodes, with time-evolving summaries) + facts/relationships (edges, triplets with **validity windows** — when a fact became true, when it was superseded) + episodes (raw ingested data — full provenance chain) + optional custom Pydantic-defined ontology [S9, verbatim from README]. Key mechanic: "Facts have validity windows. When information changes, **old facts are invalidated — not deleted**. Query what's true now, or what was true at any point in time" [S9]. Retrieval is hybrid: semantic embeddings + BM25 keyword + graph traversal, no batch LLM summarization needed (unlike GraphRAG) [S9]. Zep's paper numbers: 94.8% vs MemGPT's 93.4% on DMR; up to 18.5% accuracy gain and 90% lower latency vs baseline on LongMemEval [S9 paper abstract].

### Letta — memory blocks + sleep-time agents
Core memory = **blocks**: `{label, description, value, limit}`, always in context (no retrieval step), agent-editable, shareable across agents via `block_ids` at agent-creation time, can be marked `read_only` [S4]. Separate archival memory (searchable, out-of-context) and recall memory (conversation history) tiers exist alongside blocks (tier names per Letta's nav structure) [S4]. **Sleep-time agents** ("dreaming"): "background subagents to review recent conversations, consolidate useful lessons, and update memory without interrupting your active work" — triggerable after N agent steps or on context-window compaction, with an optional second-pass reviewer subagent before changes apply [S4].

### ACE — generator/reflector/curator (official terms, [S11])
1. **Generator** produces reasoning trajectories on new queries, surfacing both effective strategies and pitfalls.
2. **Reflector** separates evaluation from insight-extraction (distinct from curation) to improve the quality of what gets learned.
3. **Curator** turns lessons into structured **delta updates** with helpful/harmful counters, deterministic merge, dedup, and pruning — into a persistent **playbook**.

This explicitly targets two failure modes named in the abstract: **brevity bias** (summarization drops domain detail) and **context collapse** (iterative rewriting erodes detail over successive edits) [S11 paper abstract, S12].

### Dynamic Cheatsheet — test-time-only memory
No fine-tuning, no labels, no human feedback required. The model "stores and reuses accumulated strategies, code snippets, and general problem-solving insights at inference time." Reported gains (VERBATIM from abstract) [S10]: "Claude 3.5 Sonnet's accuracy more than doubled on AIME math exams... GPT-4o's success rate on Game of 24 increased from 10% to 99%... Claude achieved a 9% improvement in GPQA-Diamond and an 8% boost on MMLU-Pro." Memory is "self-curated, focusing on concise, transferable snippets."

### LangMem / LangGraph Store — hot path vs background
Hot path: agent decides in-line what/when to store, via tools; COMPOSED-illustrative code from the README [S17, VERBATIM]:
```python
from langgraph.prebuilt import create_react_agent
from langgraph.store.memory import InMemoryStore
from langmem import create_manage_memory_tool, create_search_memory_tool

store = InMemoryStore(
    index={
        "dims": 1536,
        "embed": "openai:text-embedding-3-small",
    }
)

agent = create_react_agent(
    "anthropic:claude-3-5-sonnet-latest",
    tools=[
        create_manage_memory_tool(namespace=("memories",)),
        create_search_memory_tool(namespace=("memories",)),
    ],
    store=store,
)
```
Background: a separate memory-manager process extracts/consolidates/updates asynchronously (the LangMem analog of Letta's sleep-time agents) [S17].

### Generative Agents — recency/importance/relevance
The original scoring formula (Park et al., 2023) combines three normalized signals when retrieving memories for a simulated agent: **recency** (exponential decay by time since last access), **importance** (an LLM-rated 1-10 score assigned at encoding time), and **relevance** (embedding similarity to the current query/situation) — summed (often equally weighted) to rank candidate memories for retrieval into the prompt [S22, established framework; exact weighting COMPOSED from standard secondary description, verify against paper for precise formula before quoting numerically].

### Consumer memory — Claude vs ChatGPT
Claude (claude.ai): per-project memory isolation ("Claude creates a separate memory for each project"), editable plain-text summary visible in settings, "incognito chat" opts a conversation out of memory entirely, and an explicit import path from another AI tool's memory export [S13, all VERBATIM from announcement]. ChatGPT: memory has historically split into two mechanisms — explicit "saved memories" and (separately) "reference chat history" — this chapter should verify OpenAI's exact 2026 wording directly since the primary help-doc fetch was blocked in this research pass (403) [S5 — see Unverified].

### The filesystem-vs-memory-tool result, in full (Letta, 2025-08-12) [S1]
Setup: LoCoMo conversational data placed into uploadable files; agent given `grep`, `search_files`, `open`, `close` tools; files auto-parsed/embedded for vector search; agent constrained to call `search_files` before `answer_question`. Result: **74.0%** accuracy with GPT-4o-mini, vs Mem0's best (graph) variant at **68.5%** — a ~5.5-point gap in the filesystem's favor. Letta's stated causal claim: "agents today are highly effective at using tools, especially those likely to have been in their training data (such as filesystem operations)," so they can issue contextual follow-up queries and search iteratively, whereas specialized memory systems are often tuned for single-hop retrieval. This is the specific, citable version of the "filesystem beats memory tools" claim the editor flagged — it is a **vendor's own benchmark** (Letta) about a **competitor's product** (Mem0), so treat the magnitude as directionally interesting but not neutral; Zep's rebuttal post name-checks exactly this kind of cross-vendor benchmarking dispute [S9].

## Numbers (with conditions)

| Claim | Number | Condition / source |
|---|---|---|
| Mem0 vs full-context OpenAI baseline | +26% relative (LLM-as-Judge) | LoCoMo benchmark, Mem0's own paper, arXiv 2504.19413, 2025-04-28 [S3] |
| Mem0 graph vs base Mem0 | +~2% overall score | Same paper; graph variant "68.44 vs 66.88" per secondary synthesis, ~3x slower search, ~2x token cost [S3, S9] |
| Mem0 latency | -91% p95 latency vs full-context | Same paper [S3] |
| Mem0 token cost | >90% savings vs full-context | Same paper [S3] |
| Letta filesystem search | 74.0% on LoCoMo (GPT-4o-mini) | Letta blog, 2025-08-12 [S1] |
| Mem0 best (graph) on same comparison | 68.5% on LoCoMo | Same Letta post [S1] |
| Zep vs MemGPT | 94.8% vs 93.4% | DMR benchmark, Zep paper arXiv 2501.13956, 2025-01-20 [S9] |
| Zep vs baseline | up to +18.5% accuracy, -90% latency | LongMemEval, same paper [S9] |
| LongMemEval finding | -30% accuracy | "commercial chat assistants and long-context LLMs" on sustained long-term memorization, LongMemEval paper arXiv 2410.10813 [S6] |
| ACE vs strong baselines | +10.6% agent tasks (AppWorld), +8.6% finance (FiNER+XBRL) | ACE paper/repo, arXiv 2510.04618 [S11] |
| ACE efficiency | -82.3% latency / -75.1% rollouts vs GEPA (offline, AppWorld); -91.5% latency / -83.6% token cost vs Dynamic Cheatsheet (online, FiNER) | Official ACE repo README [S11] |
| Dynamic Cheatsheet | AIME accuracy "more than doubled" (Claude 3.5 Sonnet); Game of 24 success 10%→99% (GPT-4o); +9% GPQA-Diamond, +8% MMLU-Pro (Claude) | DC paper, arXiv 2504.07952 [S10] |
| Context rot study | 18 models tested, ~194,480 total LLM calls, 0.035% refusal rate, LongMemEval subset = 306 prompts avg ~113k tokens | Chroma Research, 2025-07-14 [S16] |
| Community ACE reimplementation | 30%→100% success | Browser agent task, per HN title only — not independently verified against a paper [S18, treat as vendor/community claim] |
| Mem0 issue thread engagement | 53 comments | GitHub mem0ai/mem0#5352, opened 2026-06-03 [S15] |
| Original Mem0 HN launch | 201 points, 61 comments | HN, 2024-09-04 [S25] |

## Pitfalls, limits, criticism

- **Time-blindness in vector-only memory**: cosine-similarity ranking has no recency awareness; near-duplicate, contradictory facts (e.g., old vs new config value) surface together and the LLM has to guess which is current. Direct field quote (GitHub, Mem0 OSS+Qdrant, 2026-06-03) [S15]:
  > "Because vector search returns them sorted by similarity rather than recency — and doesn't include timestamps — the LLM receives multiple conflicting 'truths' and gets confused."
  Proposed community workaround: temporal formatting in prompts, explicit CRUD tools, and a hygiene script that merges memories above 0.82 cosine similarity, resolving conflicts in favor of the newer fact [S15].
- **Missing CRUD is a real, current gap** in at least one popular OSS memory stack (Mem0 + Qdrant self-hosted, per the same 2026 issue) — "SDK v3 design lacks built-in update/delete capabilities for managing corrupted memories" [S15].
- **Vendor benchmark disputes are unresolved, not academic noise.** Letta claims filesystem search beats Mem0's best config; Mem0's own paper shows graph memory barely beats non-graph Mem0 while costing 2-3x more; Zep published "Is Mem0 Really SOTA?" disputing methodology [S1, S3, S9]. Read every vendor's LoCoMo/LongMemEval number as reflecting **that vendor's implementation choices for the baseline**, not a neutral third-party eval.
- **Knowledge-graph memory is an ontology-design trap for small teams.** A detailed 2026 postmortem (year-long solo build) names five concrete mistakes: reaching for LangGraph/CrewAI first (frameworks encode assumptions that don't fit custom memory needs), over-designing the ontology upfront (froze the project for months — fix: start with a minimal POLE+O schema and extend only on collisions), confusing **resolution** (name normalization) with **deduplication** (identity decision) — the poster's fix used explicit thresholds "≥0.95 auto-merges, >0.85 triggers human review, ≤0.85 creates a new node," skipping "reasoning memory" (a trace of strategy+tools+outcome per run, i.e., RL at the database layer) so the agent repeated failed strategies, and building an immutable-log layer before it was needed ("puts a ton of pressure on your VM's RAM, which is crazy expensive") [S14].
- **"Do you even need a memory system" is a live debate.** One HN Ask-thread founder (YC W23) distinguishes storage from *learning*: "Mem0 = memory storage + retrieval. Doesn't learn patterns. Letta = self-editing agent memory. Closer, but no implicit learning from behavior. Missing = a preference learning layer that watches how users interact with agents and builds an evolving model" [S27, 2026-02-04, 9 pts/4 comments]. A commenter's reply names the deeper gap: chat-history mining as a class is "way under-developed."
- **Context rot means memory-as-retrieval is not optional past a certain scale** — independent multi-model testing found performance degrades "in surprising and non-uniform ways" as input length grows, even on simple retrieval, with distractor effects amplified at longer lengths [S16]. This is the mechanistic argument for why "just put it all in context" fails even with 1M-token windows (echoed in the Russian-language field material below).
- **Memory poisoning is now a named, tooled threat category**, not theoretical: OWASP shipped an "Agent Memory Guard" project (two HN posts, 2026-05-29/05-31) specifically to defend against it, and a separate paper (arXiv 2606.24322, June 2026) proposes "non-malleable, origin-bound authority with machine-checked guarantees" for securing LLM-agent long-term memory against poisoning [S29, S30].
- **File-search-based memory bloats context once memory gets big** — the counter-argument to the filesystem-wins result, made in the same "5 mistakes" postmortem: "Naive memory fails at scale. File search bloats the context window once memory gets big... Claude Code handles it this way out of the box. Even semantic search over history can't traverse the relationships between people, topics, objects, locations, and preferences" [S14]. Read this alongside S1: filesystem search wins on LoCoMo-scale corpora; the postmortem author hit its ceiling at a different (larger, more relational) scale. The honest takeaway for the design-guide section: filesystem/grep is the right *starting point*, not a law that holds at every corpus size.
- **Auto-memory index truncation is a silent data-loss mode** by design in Claude Code: writing past the 200-line/25KB `MEMORY.md` limit still "succeeds," but everything past the limit is dropped on the *next* session load — Claude gets an error telling it to rewrite the index, but a session that doesn't notice can silently lose access to older notes [S2].
- **Contradictions are handled differently by design across systems**: Graphiti/Zep *invalidate* old facts but keep temporal history (bi-temporal, queryable at any point in time); Mem0 is "additive by default" and needs explicit update/delete calls to correct a fact; Letta blocks are just overwritten by whichever edit the agent makes last [S9, S17 doc, S4]. This is a real architecture decision, not an implementation detail — pick based on whether "what did we believe last Tuesday" is a business requirement.

## What changed in the last 6 months (since ~April 2026)

- Mem0 reportedly dropped native graph-memory storage in v3 (~April 2026), replacing it with lighter spaCy-based entity linking — cost/accuracy tradeoff cited as the reason (graph search ~3x slower, ~2x tokens, for only ~2% accuracy gain) [S3, S9 — the v3 detail is from a secondary synthesis and needs confirmation from Mem0's own changelog, flagged in Unverified].
- A detailed multi-vendor architecture comparison (Letta/Mem0/Graphiti/Cognee) surfaced and made it to HN front page discussion in June 2026, explicitly narrating the Letta-vs-Mem0-vs-Zep benchmark dispute as ongoing [S9].
- A public, still-open GitHub issue (June 2026, 53 comments) crystallized three concrete OSS Mem0 production pain points (time-blindness, semantic conflicts, missing CRUD) with a community-built workaround/hygiene script [S15].
- OWASP's Agent Memory Guard project launched (two Show-HN posts, late May 2026), signaling memory poisoning moved from research curiosity to a defended-against OWASP-category threat [S29].
- A detailed public "lessons learned" postmortem on knowledge-graph-based agent memory (May 2026) gave the field its most concrete "don't over-engineer memory" field report of the half-year [S14].
- Claude's memory-import-from-ChatGPT feature got press coverage framed explicitly as a competitive play against OpenAI ("Lure ChatGPT Users," March 2026) [S13].

## Diagram candidates

1. **CoALA memory taxonomy** — box diagram: Working memory (context window) ↔ arrows to/from three long-term stores (Semantic, Episodic, Procedural), each with a one-line example.
2. **Anthropic memory tool request/response loop** — actors: Claude, Application/handler, `/memories` store. Arrows: `tool_use(view /memories)` → handler → `tool_result(listing)` → `tool_use(view file)` → `tool_result(content)` → Claude's answer. States: empty store / populated store / error (path traversal rejected).
3. **Claude Code CLAUDE.md load order** — vertical stack: managed policy → user `~/.claude/CLAUDE.md` → project `CLAUDE.md`/`AGENTS.md` → `CLAUDE.local.md`; arrow showing concatenation order (root-to-leaf) into context at session start.
4. **Claude Code auto memory lifecycle** — actors: Session, `MEMORY.md` index, topic files. States: write note → check 200-line/25KB limit → (ok: keep) / (over: error + rewrite prompt) → next session reads first 200 lines only.
5. **Mem0 extract/update pipeline** — flow: raw message → LLM fact extraction → compare vs existing memory → decision branch (ADD / UPDATE / DELETE / NOOP) → vector+graph store.
6. **Graphiti bi-temporal fact lifecycle** — timeline diagram: Episode ingested → Fact created (valid_from = T1) → new episode contradicts it → old fact invalidated (valid_to = T2, not deleted) → new fact created (valid_from = T2) → query "what was true at T1.5" still resolvable.
7. **Letta sleep-time agents** — actors: Main agent (foreground, live conversation), Sleep-time subagent (background), Memory blocks. Arrow: N steps or compaction event triggers subagent → subagent reviews transcript → proposes memory diff → (optional) second reviewer subagent → applied to blocks.
8. **ACE generator/reflector/curator loop** — actors: Generator, Reflector, Curator, Playbook (persistent store). Arrows: Generator executes task using Playbook strategies → trace → Reflector extracts insight (success/failure) → Curator writes delta update (helpful/harmful counters) → merges into Playbook → next Generator run reads updated Playbook.
9. **Filesystem-vs-memory-tool showdown (Letta result)** — side-by-side: Agent A (grep/search_files over raw files, 74.0%) vs Agent B (Mem0 graph memory, 68.5%) on identical LoCoMo questions.
10. **Generative Agents retrieval scoring** — three sliders/bars (Recency, Importance, Relevance) combining into one ranked memory list feeding the prompt.
11. **Memory poisoning attack surface** — actors: Attacker, Shared memory store, Victim agent. Arrow: attacker injects false "fact" via a normal-looking interaction → fact persists in long-term store → victim agent retrieves and acts on poisoned fact in an unrelated later session.

**Chart candidates:**
- LoCoMo score comparison bar chart: Letta filesystem (74.0%) vs Mem0 graph (68.5%) vs Mem0 base — needs the base-Mem0 LoCoMo number pulled from the paper's table (not found verbatim in this research pass; source: arXiv 2504.19413 full text/tables) [S3, needs full-PDF read to complete the bar chart].
- Mem0 graph-memory cost/benefit: token cost (2x) and latency (3x) vs accuracy gain (+2%) — two-axis or grouped-bar chart, source [S9] synthesis (verify exact multiples against Mem0 paper's tables before publishing a chart).
- LongMemEval accuracy drop-off: baseline vs long-term-sustained-interaction accuracy (-30%), source [S6].

## Glossary

- **Working memory**: the model's active context window; ephemeral unless explicitly persisted.
- **Semantic memory**: stored facts (about the user, world, or project) independent of when/how they were learned.
- **Episodic memory**: memory of specific past events/interactions, often with a timestamp or session reference.
- **Procedural memory**: how-to knowledge — skills, code, prompts, or (in the model itself) weights.
- **CoALA**: "Cognitive Architectures for Language Agents" — the 2023 paper that formalized the working/episodic/semantic/procedural framing for LLM agents [S8].
- **Memory tool (Anthropic)**: a client-side, file-based Anthropic API tool (`memory_20250818`) that lets Claude persist knowledge under `/memories` across conversations [S2].
- **Auto memory (Claude Code)**: Claude-authored notes (not user-written) saved automatically per project, distinct from CLAUDE.md [S2].
- **Memory block (Letta)**: a labeled, described, size-limited, always-in-context unit of core memory, optionally shared across agents [S4].
- **Sleep-time agent / "dreaming" (Letta)**: a background subagent that consolidates memory asynchronously without blocking the live agent [S4].
- **Graph memory**: representing extracted facts/entities as nodes/edges in a graph instead of (or alongside) flat vector records.
- **Bi-temporal model (Graphiti)**: tracking both when a fact was true in the world (valid time) and when the system learned it (transaction time), so facts are invalidated, not deleted, on contradiction [S9].
- **Context collapse**: iterative rewriting/summarization of a context/playbook that erodes detail over repeated edits — named in the ACE paper [S11].
- **Brevity bias**: the tendency of context-optimization methods to drop domain-specific detail in favor of concise summaries — named in the ACE paper [S11].
- **Playbook (ACE)**: the persistent, evolving structured context that accumulates strategies via generator/reflector/curator [S11].
- **Test-time learning**: adapting behavior using accumulated context/memory at inference time, without any weight update (Dynamic Cheatsheet's framing) [S10].
- **LoCoMo**: "Long Conversational Memory" benchmark — very long (up to 35-session) synthetic dialogues used to test long-term memory QA [S6].
- **LongMemEval**: a 500-question benchmark testing five memory abilities: extraction, multi-session reasoning, temporal reasoning, knowledge updates, abstention [S6].
- **DMR**: "Deep Memory Retrieval" benchmark, MemGPT's original primary metric, later used by Zep for comparison [S9].
- **Sleep-time compute**: umbrella term (used across Letta and academic literature) for doing memory-consolidation work in the background/off the critical path of a live request.
- **Memory poisoning**: an attack where false or manipulated information is written into an agent's persistent memory so it influences later, unrelated interactions [S29].
- **Context rot**: measured performance degradation as input length grows, even without exceeding the nominal context limit [S16].

## Unverified / open questions

- **Mem0 v3 graph-memory removal**: reported only via a secondary synthesis (Substack post, [S9]); could not independently confirm against Mem0's own GitHub changelog/release notes or docs in this research pass (Mem0's docs page fetched did not mention a v3 graph-memory deprecation). Flag for the writer: verify directly against `mem0ai/mem0` release notes before stating this as fact.
- **ChatGPT memory mechanics in 2026**: `help.openai.com`'s memory FAQ page returned HTTP 403 to automated fetch in this pass; the "saved memories vs. reference chat history" split is from pre-2026 general knowledge and needs a fresh, dated primary-source check (OpenAI help center or a 2026 OpenAI blog post) before publishing specifics for this chapter.
- **Exact Generative Agents retrieval formula** (weights on recency/importance/relevance, decay constants): described here from standard secondary characterization; the chapter text should pull exact formula/constants from the paper itself (arXiv 2304.03442) rather than this summary.
- **LongMemEval's "30% accuracy drop" — exact conditions**: abstract states this applies to "commercial chat assistants and long-context LLMs" on "memorizing information across sustained interactions" but does not specify which named commercial products were tested at that headline number; needs the paper's results table for a precise, attributable claim.
- **Community ACE reimplementation's 30%→100% browser-agent claim** [S18]: only the HN title was captured (WebSearch budget was exhausted before the underlying README could be fully read for methodology); treat as an unverified vendor/community claim until the repo's own benchmark methodology is checked.
- **Habr coverage**: Habr's search endpoint returned no parseable results to automated fetch in this session (likely JS-rendered search); the chapter's Russian-community angle should get a follow-up manual Habr search for agent-memory posts (Mem0/Letta/Zep/"память агента") before publication — this pass could not confirm what, if anything, Habr has published on this topic in 2026.
- **fastnewsdev Telegram mirror**: only the last ~18 posts were retrievable without pagination; none directly covered agent memory (closest hits were about context-window size skepticism and rtk-style context compression, both Ch.02-adjacent). A deeper scroll-back pass (using `?before=<id>`) might surface memory-specific posts and should be tried for the final chapter draft.
- **Reddit**: r/LocalLLaMA, r/ClaudeAI, r/AI_Agents, r/LangChain were all inaccessible in this session (both `curl` and `WebFetch` were blocked/redirected to login by Reddit's anti-bot measures). This is a real gap against the brief's "priority: HN, Reddit, Twitter" instruction — the chapter should get a follow-up pass via a session where Reddit is reachable, or via Reddit's official API with credentials.
- **X/Twitter**: not fetched at all in this session (no working access path found); same caveat as Reddit.
- **WebSearch tool**: unusable for this entire research session — every WebSearch call returned "budget exhausted (200 of 200)" from the very first call, which appears to be a session-level quota already consumed before this task started, not something induced by this task's own queries. All research after that point relied on WebFetch (direct URL fetch) and raw `curl` against public APIs (HN Algolia, arXiv, GitHub REST, Zep/Anthropic/Letta/Mem0/LangMem docs and GitHub raw files). This measurably narrowed source diversity (no fresh general web search for "X vs Y 2026" style queries) and is worth noting to whoever assembles the final chapter.

## Sources

- [S1] "Benchmarking AI Agent Memory" (LoCoMo: filesystem search vs Mem0), Letta blog, 2025-08-12, https://www.letta.com/blog/benchmarking-ai-agent-memory, accessed 2026-09-30.
- [S2] "Memory tool" + "How Claude remembers your project" (CLAUDE.md/auto memory), Anthropic/Claude Code docs, undated (live docs, describes Claude Code up to v2.1.283), https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool and https://code.claude.com/docs/en/memory, accessed 2026-09-30.
- [S3] "Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory," arXiv:2504.19413, 2025-04-28, https://arxiv.org/abs/2504.19413, accessed 2026-09-30.
- [S4] Letta docs, "Memory Blocks" and "Sleep-time Agents," undated (live docs), https://docs.letta.com/guides/agents/memory-blocks and https://docs.letta.com/guides/agents/sleep-time-agents, accessed 2026-09-30.
- [S5] Reference to ChatGPT memory FAQ (fetch blocked, HTTP 403), https://help.openai.com/en/articles/8590148-memory-faq — see Unverified.
- [S6] "LongMemEval: Benchmarking Chat Assistants on Long-Term Interactive Memory," arXiv:2410.10813, 2024-10-14, https://arxiv.org/abs/2410.10813, accessed 2026-09-30. Also "Evaluating Very Long-Term Conversational Memory of LLM Agents" (LoCoMo), arXiv:2402.17753, 2024-02-27, https://arxiv.org/abs/2402.17753, accessed 2026-09-30.
- [S8] "Cognitive Architectures for Language Agents" (CoALA), arXiv:2309.02427, 2023-09-05, https://arxiv.org/abs/2309.02427, accessed 2026-09-30.
- [S9] "Agent Memory Systems and Knowledge Graphs: Letta, Mem0, Graphiti, and Cognee," codepointer.dev (Substack), 2026-06-13, https://codepointer.dev/p/agent-memory-systems-and-knowledge, accessed 2026-09-30 (also on HN: https://news.ycombinator.com/item?id=48516182); Graphiti README, GitHub getzep/graphiti, undated (current as of fetch), https://raw.githubusercontent.com/getzep/graphiti/main/README.md, accessed 2026-09-30; "Zep: A Temporal Knowledge Graph Architecture for Agent Memory," arXiv:2501.13956, 2025-01-20, https://arxiv.org/abs/2501.13956, accessed 2026-09-30.
- [S10] "Dynamic Cheatsheet: Test-Time Learning with Adaptive Memory," arXiv:2504.07952, 2025-04-10, https://arxiv.org/abs/2504.07952, accessed 2026-09-30.
- [S11] "Agentic Context Engineering: Evolving Contexts for Self-Improving Language Models," arXiv:2510.04618, 2025-10 (v2 exists), https://arxiv.org/abs/2510.04618, accessed 2026-09-30; official repo README, GitHub ace-agent/ace, "2025 Nov" per its own changelog, https://raw.githubusercontent.com/ace-agent/ace/main/README.md, accessed 2026-09-30.
- [S12] HN thread, "Show HN: Stanford's ACE paper was just open sourced," 2025-12-03, 8 pts/1 comment, https://news.ycombinator.com/item?id=46141125, accessed 2026-09-30.
- [S13] "Claude's memory feature," Claude/Anthropic blog, announced 2025-09-11 (Pro/Max 2025-10-23), https://claude.com/blog/memory, accessed 2026-09-30; press coverage "Anthropic Adds Free Memory Feature and Import Tool to Lure ChatGPT Users," MacRumors via HN, 2026-03-03, https://news.ycombinator.com/item?id=47226600, accessed 2026-09-30.
- [S14] "I spent a year building agent memory on knowledge graphs. Here are my 5 mistakes," HN (text post by pauliusztin), 2026-05-30, 3 pts, https://news.ycombinator.com/item?id=48337689, accessed 2026-09-30.
- [S15] "Workaround: Solving time-blindness, semantic conflicts, and missing CRUD in Mem0 OSS + Qdrant," GitHub mem0ai/mem0 issue #5352, opened 2026-06-03, 53 comments, https://github.com/mem0ai/mem0/issues/5352, accessed 2026-09-30.
- [S16] "Context Rot," Chroma Research, 2025-07-14, https://www.trychroma.com/research/context-rot, accessed 2026-09-30.
- [S17] Mem0 docs, "Memory Types," undated (live docs), https://docs.mem0.ai/core-concepts/memory-types, accessed 2026-09-30; LangMem README, GitHub langchain-ai/langmem, undated, https://raw.githubusercontent.com/langchain-ai/langmem/main/README.md, accessed 2026-09-30.
- [S18] "Show HN: Open-source agent learning layer: 30% to 100% success on browser agents," 2025-11-29, 3 pts, https://news.ycombinator.com/item?id=46088167; "Show HN: Open-source implementation of Stanford's self-learning agent framework," 2025-10-18, 10 pts/5 comments, https://news.ycombinator.com/item?id=45627981 (repo: kayba-ai/agentic-context-engine), accessed 2026-09-30.
- [S19] "TWIST: A Proposed Benchmark for Intervention Quality in Conversational Memory," arXiv:2609.28575, 2026-09-23, accessed 2026-09-30.
- [S20] "CUE-Mem: Benchmarking Long-Term User Memory via Implicit Cues in Multimodal Conversations," arXiv:2609.32574, 2026-09-26, accessed 2026-09-30.
- [S21] "MemTrace: Probing What Final Accuracy Misses in Long-Term Memory," arXiv:2606.17328, 2026-06-15, accessed 2026-09-30.
- [S22] "Generative Agents: Interactive Simulacra of Human Behavior," arXiv:2304.03442, 2023-04-07, https://arxiv.org/abs/2304.03442, accessed 2026-09-30.
- [S23] "Reflexion: An autonomous agent with dynamic memory and self-reflection," arXiv:2303.11366, 2023-03 (HN discussion 2023-03-25/26/27, e.g. https://news.ycombinator.com/item?id=35314773), accessed 2026-09-30.
- [S24] "Voyager: An Open-Ended Embodied Agent with Large Language Models," arXiv:2305.16291, 2023-05-25, https://arxiv.org/abs/2305.16291, accessed 2026-09-30.
- [S25] "Show HN: Mem0 – open-source Memory Layer for AI apps," HN, 2024-09-04, 201 pts/61 comments, https://news.ycombinator.com/item?id=41447317, accessed 2026-09-30.
- [S26] Reference within [S2]'s cross-link and general knowledge of the Sonnet 4.5 launch timing (memory tool public beta); primary confirmation is the memory-tool docs page itself [S2].
- [S27] "Ask HN: Mem0 stores memories, but doesn't learn user patterns," HN, 2026-02-04, 9 pts/4 comments, https://news.ycombinator.com/item?id=46891715, accessed 2026-09-30.
- [S28] "I reverse-engineered the three biggest agent-memory tools," HN (text post), 2026-07-15, 2 pts/2 comments, https://news.ycombinator.com/item?id=48919162, accessed 2026-09-30.
- [S29] "Show HN: OWASP Agent Memory Guard – Stop AI Agent Memory Poisoning," HN, 2026-05-31, 4 pts, https://news.ycombinator.com/item?id=48342710 (and 2026-05-29 companion post, https://news.ycombinator.com/item?id=48324512), accessed 2026-09-30.
- [S30] "Securing LLM-Agent Long-Term Memory Against Poisoning: Non-Malleable, Origin-Bound Authority with Machine-Checked Guarantees," arXiv:2606.24322, 2026-06-23, accessed 2026-09-30.
- Additional field-report context (not memory-specific but adjacent, cross-link to Ch.02): fastnewsdev Telegram channel, https://t.me/s/fastnewsdev, undated recent posts on context-window skepticism ("Хватит нести бред про миллион токенов"), accessed 2026-09-30.
