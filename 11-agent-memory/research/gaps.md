# 11. Память агента — gaps notes (completeness critic / gap-filler lens)

Scope of this file: what spec.md, practice.md and field.md miss, get wrong, or leave stale; resolved against primary sources on 2026-09-30. Source ids here are prefixed `G` so they never collide with the `S` ids of the other three files. Everything not marked COMPOSED is taken from the cited page.

## Contradictions resolved

1. **When the Anthropic memory tool shipped.** field.md: "2025-08, alongside Sonnet 4.5"; spec.md: "2025-09-XX". **Resolution:** announced 2025-09-29 in "Managing context on the Claude Developer Platform", together with context editing, "available today in public beta", on Claude Sonnet 4.5 [G2]. The `20250818` in `memory_20250818` is the tool-version stamp. It is not the launch date.
2. **Is the memory tool still beta?** practice.md: "в публичной бете"; spec.md: "no beta header required". **Resolution:** it launched as a public beta [G2]. The current docs say the tool "doesn't require a beta header"; only the SDK helpers (`BetaAbstractMemoryTool`, `betaMemoryTool`, `BetaLocalFilesystemMemoryTool`, the tool runner) live in the SDK beta namespace [G1]. Context editing still uses the `context-management-2025-06-27` beta header with edit types `clear_tool_uses_20250919` / `clear_thinking_20251015` [G10].
3. **Mem0 graph memory: "built-in graph" (spec) or "dropped graph for spaCy entity linking" (field)?** **Resolution:** both are half right, split by OSS and Platform. The April 2026 release removed the external graph store from OSS: `enable_graph` and `graph_store` are "Removed", and "Graph memory is removed from OSS. It's a built-in, always-on Mem0 Platform feature". OSS now does entity extraction and BM25 lemmatization through the spaCy `[nlp]` extra, and without it "falls back to semantic-only search" [G20]. The "v3" label is ambiguous: the Python SDK went to **2.0.0** and the TypeScript SDK to **3.0.0**. Mem0's changelog entry "Mem0 SDK v2.0.0 / v3.0.0" is dated 2026-04-14, and PyPI `mem0ai` 2.0.0 was uploaded 2026-04-16 [G21][G23].
4. **Mem0 write path: ADD/UPDATE/DELETE/NOOP (field, from the 2025 paper) or ADD-only (spec)?** **Resolution:** the answer depends on the date. The 2025 paper describes the four-way decision. The current release is "Single-pass ADD-only (one LLM call, no UPDATE/DELETE)", and `add()` events changed from "`ADD`, `UPDATE`, `DELETE`" to "`ADD` only". `custom_update_memory_prompt` is deprecated in favour of `custom_instructions` [G20]. On the Platform, contradictions are now handled by Dream "Supersede" and "Merge", which run at write time [G22].
5. **"Mem0 +26% over a full-context OpenAI baseline" (field.md).** **Wrong.** The +26% is relative to *OpenAI's memory feature*: J = 52.90 against Mem0's 66.88. In the same paper's table the **full-context baseline scored 72.90 ± 0.19**, above Mem0 (66.88) and Mem0g (68.44), at 26,031 tokens per query [G24]. practice.md has it right.
6. **Mem0 new-algorithm numbers disagree between Mem0's own pages.** README: LoCoMo 71.4→**92.5**, LongMemEval 67.8→**94.4** [G19]. OSS migration guide: "71.4 → **91.6**", "67.8 → **93.4**" [G20]. **Resolution:** the README says its scores "reflect Mem0's managed platform, which includes proprietary optimizations not available in the open-source SDK" on an undisclosed "production-representative model stack" at a `top_200` retrieval budget [G19]. The migration-guide numbers are the OSS figures. All of them are self-reported.
7. **"No controlled filesystem-vs-memory-tool benchmark exists" (spec.md) vs "Letta 74.0% vs Mem0 68.5%" (field.md).** **Resolution:** the Letta post exists (2025-08-12). It ran GPT-4o mini with `grep`/`search_files`/`open`/`close` and scored 74.0% on LoCoMo, then compared that to "Mem0's reported 68.5% score for their top-performing graph variant". That is Mem0's self-reported number from a different harness, and Letta also writes that it "was unable to determine a way to backfill LoCoMo data into MemGPT/Letta" to reproduce Mem0's MemGPT numbers [G27]. A **neutral academic result** now exists that none of the notes caught. LongMemEval-V2 (UCLA, arXiv 2605.12493, 2026-05-12) reports that AgentRunbook-C, which "stores trajectories as files and invokes a coding agent to gather evidence", reaches **72.5%** average accuracy, against **48.5%** for the strongest RAG baseline and **69.3%** for an off-the-shelf coding agent (Codex). The authors add "coding agent based methods have high latency costs" [G37]. Chapter framing: file-plus-agentic-search wins on accuracy in two independent setups and loses on latency. It is not a law.
8. **LoCoMo size: "~9K tokens/session" (spec.md and field.md).** **Wrong unit.** The abstract says "each encompassing 300 turns and 9K tokens on avg., over up to 35 sessions", which is per *conversation* [G35]. Zep measured "around 16,000-26,000 tokens" per conversation [G25], and Mem0's full-context baseline averaged 26,031 tokens [G24]. The released set has 10 conversations with 19–32 sessions each [G39]. The differences come from tokenizers and counting rules; every count fits in a modern context window.
9. **CoALA working memory: "the context window" (practice.md, field.md) or "a data structure that persists across calls" (spec.md)?** **Resolution: spec.md is right.** VERBATIM [G46]: "Previous methods … using the LLM's own context as a form of working memory. CoALA's notion of working memory is more general: it is a data structure that persists across LLM calls. On each LLM call, the LLM input is synthesized from a subset of working memory". Also, the CoALA authors are all Princeton; practice.md's "Princeton/DeepMind" is wrong [G46].
10. **Voyager skill language: "Python" (practice.md TL;DR) or JS (spec.md)?** **Resolution: JavaScript.** Voyager's environment "leverages Mineflayer JavaScript" APIs and the skills are JS programs [G47].
11. **Zep paper date: 2025-01-24 (spec.md) or 2025-01-20?** **Resolution: 2025-01-20** (arXiv v1 published date) [G26].
12. **Cognee's BEAM claim and "BEAM is a name collision/fork" (spec.md) vs "79% vs SOTA 73.4%" (practice.md).** **Resolution:** BEAM is a single benchmark: "Beyond a Million Tokens", arXiv 2510.27246 (2025-10-31, rev. 2026-02-21), with 100 conversations, 2,000 validated questions and conversations up to 10M tokens [G38]. Vendors report different context tiers of it (Mem0: 1M/10M; Cognee: 100K/10M). Cognee's own README now qualifies its numbers. The 100K result (0.79) is "four evaluation rounds over 20 questions from one held-out conversation". The 10M result (0.67) is "Exploratory … question-type routing selected and scored on the same question set" [G42]. practice.md's "SOTA" framing cannot be supported.
13. **Claude.ai memory rollout.** spec.md folds Team and Enterprise into 2025-09-11. **Resolution** from the release notes [G12]: Team plus incognito for all plans on 2025-09-11; Enterprise on 2025-09-18; Max on 2025-10-23, with Pro "over the next two weeks"; **free users 2026-03-02**.
14. **How Claude consumer memory works.** spec.md and practice.md describe a per-project editable memory summary. The Willison/Khemani analysis (2025-09-12) describes tool calls (`conversation_search`, `recent_chats`) and a blank slate at session start [G18]. **Resolution: three generations.** (a) Aug–Sep 2025: RAG chat search exposed as visible tool calls [G18][G11]. (b) From Sep 2025 (now labelled "legacy"): a memory summary that is "updated every 24 hours" [G11]. (c) Since **2026-08-25**: "Claude saves memory as a set of individual topics as you chat, rather than summarizing conversations after they end". Topics can be edited in Settings > Memory, memory is shared between chat and Cowork, and sensitive topics (health, race, religion, politics, gender identity…) are excluded by default unless "Include sensitive topics in memory" is on [G11][G12].
15. **Letta memory model: "memory blocks" (practice.md, field.md) or "MemFS + dreaming" (spec.md)?** **Resolution:** the current product is the **Letta Harness (formerly Letta Code)**. `letta-ai/letta` now says the source "lives in `letta-ai/letta-code`", and the V1 API server sits on the `archive` branch [G28]. Memory is a git repository "projected" as Markdown files: "Files under `system/` are loaded into the agent's system prompt on every turn", everything else is read on demand, and "MemFS does not include a semantic or vector index by default" [G29]. Blocks are the V1 concept. The V1 base tool set did include `core_memory_append`, `core_memory_replace`, `rethink_memory`, `memory_replace`, `memory_insert`, `memory_apply_patch`, `memory_rethink`, `archival_memory_insert`, `archival_memory_search`, `conversation_search` (function names verified in source [G34]). That closes spec.md's open question. PyPI `letta` is now "Letta Code: stateful agents in your terminal" (0.34.0, 2026-09-30) [G28].
16. **"Dream(ing)" means four different mechanisms.** The notes treat Letta dreaming ≈ Mem0 Dream ≈ OpenClaw Dreaming as one idea. The details differ, and a writer must not merge them. **Anthropic Dreams** (Managed Agents): an async job over one memory store plus 1–100 session transcripts that writes a *new* output store; "The input store is never modified" [G4]. **Mem0 Dream:** Supersede and Merge run on every write, on all plans; Synthesis is scheduled and Pro+ only [G22]. **Letta dreaming:** background subagents triggered by `step-count` or `compaction-event`, with `behavior: "reminder" | "auto-launch"`, working in git worktrees [G30][G29]. **OpenClaw Dreaming:** enabled by default, a scheduled three-phase sweep and the only primary writer to MEMORY.md [G53].
17. **ACE Curator: "deterministic" (field.md) or "LLM" (spec.md)?** **Resolution:** the Curator is an LLM call that emits JSON delta operations, e.g. `{"type": "ADD", "section": ..., "content": ...}`. Merging those deltas into the playbook is done by deterministic, non-LLM code, and the system assigns bullet ids such as `[ctx-00263] helpful=1 harmful=0 ::` [G43]. The paper runs all three roles on DeepSeek-V3.1 (non-thinking) "preventing knowledge transfer from a stronger Reflector or Curator" [G43].
18. **Mastra "80% with RAG" vs "Zep 72%" (practice.md).** Zep's own paper reports **71.2%** (gpt-4o) and **63.8%** (gpt-4o-mini) on LongMemEval_S, against full-context baselines of 60.2% and 55.4%. Zep cut the context from 115k to 1.6k tokens [G26]. Mastra later claimed **94.87%** with "Observational Memory" (2026-02-09), a result that depends on the reader model: 94.87 (gpt-5-mini), 93.27 (gemini-3-pro-preview), 84.23 (gpt-4o) [G40].
19. **LangMem as "the" LangChain memory layer (all three notes).** **Resolution: stale.** `langmem` last released 0.0.30 on 2025-10-27 [G57]. LangChain's current docs push **Deep Agents** file-based memory, where `/memories/` is routed to a `StoreBackend` [G55]. The LangMem README example that field.md quotes as VERBATIM uses `langgraph.prebuilt.create_react_agent`, which LangGraph v1 deprecates in favour of `langchain.agents.create_agent` [G56]. It also uses a retired model id.

## Claims most likely to be wrong (with corrections)

1. **"The memory tool is beta and needs the `context-management-2025-06-27` header."** Correct: the memory tool "doesn't require a beta header". Only the SDK helpers are in beta namespaces. Context editing does use that header [G1][G10].
2. **"`memory_20250818` shipped on 2025-08-18."** Correct: announced **2025-09-29** with Sonnet 4.5 and context editing. Anthropic's eval there: memory plus context editing **+39%** over baseline, context editing alone **+29%**, and **−84%** tokens on a 100-turn web-search eval [G2].
3. **"Mem0 decides ADD/UPDATE/DELETE/NOOP for each fact."** Correct since 2026-04-14: single-pass ADD-only. Supersede/Merge handle conflicts on the Platform [G19][G20][G22].
4. **"Mem0 graph memory: `enable_graph=True` plus Neo4j."** Correct: removed from OSS (a `ValueError` or ignored config); graph memory is Platform-only and always on [G20].
5. **"Mem0 beats full context by 26%."** Correct: +26% relative is against OpenAI's memory feature. Full context (72.90) beat Mem0 (66.88) on LoCoMo J-score [G24].
6. **"Mem0 = 94.4% on LongMemEval" (bare number).** Correct: this is the managed platform with proprietary optimizations, an undisclosed model stack, `top_200`, and ~6.8K tokens. The OSS figure is 93.4 [G19][G20]. Mastra shows the same kind of number moves by ~10 points with the reader model alone (94.87 → 84.23) [G40].
7. **"LoCoMo tests memory beyond the context window."** Correct: conversations run ~9K (paper) to ~26K tokens (Mem0/Zep counts) and fit in context. Zep lists data-quality problems ("Incorrect Speaker Attribution", "Underspecified Questions", no knowledge-update questions) [G25][G24][G35]. MemPalace's "100% on LoCoMo" used `top_k=50` on conversations of 19–32 sessions, which retrieves everything [G39].
8. **"Filesystem beats memory tools: proven."** Correct: two data points. Letta 74.0 vs Mem0's self-reported 68.5 (different harnesses) [G27]; LongMemEval-V2 file-based coding agent 72.5 vs RAG 48.5, paid for with latency [G37]. The accurate framing is "strong default, not a law".
9. **"Claude.ai memory is a summary regenerated every 24h" / "Claude memory is just search tools."** Correct: both describe legacy behaviour. Since 2026-08-25 Claude saves individual **Topics** during the chat, shares them with Cowork, and excludes sensitive topics by default [G11][G12].
10. **"ChatGPT memory = saved memories + reference chat history."** Correct as of 2026: "Improved memory" is updated automatically ("Memory that stays more up to date", 2026-06-04). Also current: a memory summary with correction and "Don't mention this again", **Sources** under answers (2026-05-05), automatic prioritization of saved memories (2025-10-15), and project-only memory (2025-08-22; editable for existing projects 2026-08-14). The legacy list remains optional [G14][G15].
11. **"Install Letta with `pip install letta` to get the MemGPT server with memory blocks."** Correct: the V1 server is archived. PyPI `letta` and npm `@letta-ai/letta-code` are the Letta Harness CLI, and memory is the git-backed MemFS [G28][G29].
12. **"Claude Code auto-memory has background 'AutoDream' consolidation."** Correct: nothing in the public docs or CHANGELOG (checked through v2.1.285, 2026-09-29) mentions dreaming. Auto memory is written in-session by Claude and bounded by the MEMORY.md 200-line/25KB load limit. "Dreams" is a **Managed Agents** API feature in research preview [G7][G8][G4].
13. **"Claude Code reads AGENTS.md."** Correct: only when no `CLAUDE.md`, `.claude/CLAUDE.md` or `CLAUDE.local.md` exists in the working directory or above it, and only from **v2.1.277 (2026-09-18)**. `AGENTS.local.md` and `AGENTS.override.md` are never read [G7][G8].
14. **"Generative Agents tuned the weights of recency/importance/relevance."** Correct: all α = 1, min-max normalized. Recency decay factor **0.995** per sandbox hour "since the memory was last retrieved". Importance is an LLM 1–10 rating assigned "at the time the memory object is created". Reflection triggers when the summed importance of recent events exceeds **150**, which happened "roughly two or three times a day", and uses the 100 most recent records [G45].
15. **"Zep > MemGPT on DMR (94.8 vs 93.4) proves graph memory is better."** Correct: DMR is saturated. In the same paper, full conversation with gpt-4o-mini scored **98.0%** vs Zep **98.2%**, and Zep "were unable to reproduce MemGPT's results" [G26]. The LongMemEval result (71.2 vs 60.2 full-context, gpt-4o) is the meaningful one.

Also frequently wrong, lower priority: CoALA working memory ≠ context window [G46]; Voyager skills are JS [G47]; Cognee's BEAM "SOTA" rests on 20 questions [G42]; LangMem is not the current LangChain path [G55][G57]; Claude.ai memory reached free users 2026-03-02 [G12]; Claude Code auto memory arrived only in v2.1.59 (2026-02-25), so pre-2026 articles describe a Claude Code without it [G8].

## TL;DR (what the three notes miss that an engineer must know today)

- **Anthropic now has two memory products, and the notes cover only one.** Besides the client-side memory tool [G1], **Claude Managed Agents memory stores** (public beta 2026-04-23) are workspace-scoped document stores mounted as directories under `/mnt/memory/`. Every write creates an immutable version (`memver_...`); the API offers redact, optimistic concurrency via `content_sha256`, `read_only`/`read_write` access, max 8 stores per session, 100 kB per memory and 10,000 memories per store [G3][G5]. **Dreams** (research preview, announced 2026-05-19) curate a store offline into a *new* store [G4][G6].
- **Claude Code auto memory is a 2026 feature** (v2.1.59, 2026-02-25). It has since gained: worktree sharing (v2.1.63), `autoMemoryDirectory` (v2.1.74), modified timestamps (v2.1.75, ISO `modified` frontmatter in v2.1.214), the 25KB cap (v2.1.83), an explicit over-limit error (v2.1.210), and memory-poisoning hardening that neutralizes "invisible characters and tags that imitate Claude Code's own markup" in MEMORY.md (v2.1.284, 2026-09-28) [G8]. **Subagents have their own persistent memory** (`memory: user|project|local` → `~/.claude/agent-memory/<name>/` etc.) [G9].
- **Filesystem memory is the 2026 default across vendors:** Anthropic memory tool and Managed Agents stores [G1][G3], Letta MemFS [G29], LangChain Deep Agents `/memories/` [G55], Codex `~/.codex/memories/` [G16], Hermes `MEMORY.md`/`USER.md` [G54], OpenClaw tiers [G53]. Google published **OKF v0.2** (2026-07-24), a markdown+YAML knowledge format with first-class `generated`/`verified`/`status`/`stale_after` fields that community memory servers already adopt [G59].
- **Background consolidation is standard.** It shows up in: Anthropic Dreams [G4], Letta dreaming [G30], Mem0 Dream [G22], LangChain "consolidation agent" on cron [G55], Codex background extraction and consolidation models [G16], and AWS AgentCore episodic "Reflection" [G58].
- **Benchmarks: LoCoMo is weak, LongMemEval scores depend on the reader model, and LongMemEval-V2 (May 2026) is the new agent-experience benchmark.** In V2, a file-plus-coding-agent memory scores 72.5% against 48.5% for RAG [G37].
- **Memory poisoning is an OWASP Top-10 item:** ASI06 "Memory & Context Poisoning" in the OWASP Top 10 for Agentic Applications 2026 (2025-12-09) [G48]. A concrete kill chain: Unit 42 showed an indirect prompt injection surviving Bedrock Agents session summarization via forged `</conversation>` tags (2025-10-09) [G49]. Vendor defenses now in the docs: read-only mounts [G3][G55], Codex `memories.disable_on_external_context` [G16], OpenClaw origin classes [G53], Claude Code markup neutralization [G8].
- **Self-improvement: new primary evidence.** ACE context collapse, measured: 18,282 tokens → 122 tokens in one rewrite step, accuracy 66.7 → 57.1, below the no-context 63.7 baseline [G43]. ACE and DC "may degrade" without reliable feedback [G43]. Letta skill learning: +15.7 points absolute on Terminal-Bench 2.0 with verifier feedback [G32].
- **Consumer memory in 2026:** ChatGPT has "improved memory" with automatic updates, Sources and a memory summary [G14][G15]. Claude has Topics and a sensitive-topic default-off [G11]. Both keep 30-day deletion or retention windows for derived memory [G14].
- **Bounded-memory design is a real alternative to retrieval:** Hermes caps MEMORY.md at 2,200 chars and USER.md at 1,375 chars, errors on overflow instead of truncating, and freezes the snapshot at session start "to preserve the LLM's prefix cache" [G54].
- **Cross-links:** Managed Agents sessions and sandboxes → Ch.12; compaction (`compact_20260112`, new on-demand `compact-2026-09-04`) → Ch.02 [G10]; ASI06 → Ch.16; LongMemEval-V2 and benchmark gaming → Ch.17; skills as procedural memory → Ch.06.

## Current state and versions (verified 2026-09-30)

| Item | State | Source |
|---|---|---|
| Anthropic memory tool | `memory_20250818`, all Claude 4+ models, no beta header; SDK helpers in Python/TS/C#/Java; Go/Ruby have no helper | [G1] |
| Context editing | beta header `context-management-2025-06-27`; `clear_tool_uses_20250919`, `clear_thinking_20251015` | [G10] |
| Compaction | threshold: `compact_20260112` (beta `compact-2026-01-12`); on-demand: beta `compact-2026-09-04` + top-level `compaction` param | [G10] |
| Managed Agents memory stores | beta; header `agent-memory-2026-07-22` for memory-store calls (must not be combined with `managed-agents-2026-04-01` → 400); sessions still use `managed-agents-2026-04-01` | [G3] |
| Managed Agents Dreams | research preview; header `dreaming-2026-04-21`; models: claude-opus-5, claude-fable-5, claude-opus-4-8, claude-opus-4-7, claude-sonnet-5, claude-sonnet-4-6 | [G4] |
| Claude Code | latest v2.1.285 (2026-09-29); auto memory since v2.1.59 (2026-02-25); AGENTS.md direct read since v2.1.277 (2026-09-18) | [G8] |
| Claude.ai memory | all plans incl. free (2026-03-02); Topics + Cowork + sensitive-topics toggle (2026-08-25); on by default Free/Pro/Max, off by default Team/Enterprise; unavailable with HIPAA/public-sector/custom retention | [G11][G12] |
| ChatGPT memory | improved memory (auto-updated), memory summary, Sources, project-only memory; legacy saved memories selectable | [G14][G15] |
| Codex local memories | off by default; `[features] memories = true`; files in `~/.codex/memories/` | [G16] |
| Mem0 | PyPI `mem0ai` 2.2.1 (2026-09-25); new algorithm since 2.0.0 (2026-04-16); TS SDK 3.x; Apache-2.0 | [G23][G62] |
| Letta | Letta Harness (formerly Letta Code); npm `@letta-ai/letta-code` 0.34.0 and PyPI `letta` 0.34.0 (2026-09-30); V1 server archived | [G28] |
| Graphiti | `graphiti-core` 0.30.2 (2026-09-08), Apache-2.0 (practice.md's "MIT?" is wrong); getzep/zep repo is now only "Zep Cloud: Examples & Integrations" | [G62][G65] |
| Cognee | v1.6.2 (2026-09-29), after v1.6.1 (09-24) and v1.6.0 (09-18) | [G42] |
| LangMem | 0.0.30 (2025-10-27), MIT; effectively superseded in docs by Deep Agents memory | [G57][G55] |
| OpenClaw | Dreaming "enabled by default"; origin classes `owner`/`agent`/`untrusted`/`system` | [G53] |
| Hermes Agent (Nous Research) | ~250k GitHub stars (2026-09-30); repo created 2025-07-22; bounded MEMORY.md/USER.md + FTS5 session search + autonomous skill creation | [G54][G62] |
| AWS AgentCore Memory | short-term events + long-term via strategies: Semantic, User preference, Summary, Episodic (with Reflection); built-in / built-in overrides / self-managed | [G58] |
| Google OKF | v0.2 SPEC.md (migration commit 2026-07-24; timestamp rule change 2026-08-21) | [G59] |
| LongMemEval | cleaned dataset (2025/09); LongMemEval-V2 (2026/05; AgentRunbook-C V2 update 2026/08) | [G36][G37] |
| Cursor | current docs index has Rules and AGENTS.md but no Memories page | [G63] |

## Timeline (only items missing from the other three files)

- 2023-08-06: Generative Agents v2 (UIST '23) with retrieval constants (0.995 decay, α=1, reflection threshold 150) [G45].
- 2024-07-17: AgentPoison (memory/RAG backdoor): >80% average attack success, <1% benign impact, <0.1% poison rate [G51].
- 2025-02-17: A-MEM (Zettelkasten-style agentic memory), rev. 2025-10-08 [G64].
- 2025-03-05: MINJA, memory injection via query-only interaction [G50].
- 2025-04-16 / 05-08 / 06-03: ChatGPT memory with search; "enhanced memory" (reference chat history) for Plus/Pro incl. EU; for Free users [G15].
- 2025-05-06: Zep "Is Mem0 Really SOTA?" (75.14% ± 0.17 on LoCoMo; accuses Mem0 of misconfiguring Zep) [G25].
- 2025-08-22: ChatGPT project-only memory [G15].
- 2025-09-11 / 09-18: Claude memory (Team + incognito for all; Enterprise) [G12].
- 2025-09-12: Willison/Khemani: Claude memory = visible tool calls; ChatGPT = automatic injection [G18].
- 2025-09 (month): LongMemEval "cleaned" history sessions released [G36].
- **2025-09-29: Anthropic memory tool + context editing, public beta** [G2].
- 2025-10-09: Unit 42 Bedrock Agents memory-poisoning PoC [G49].
- 2025-10-15: ChatGPT automatic management of saved memories (recency and frequency prioritization; ends "memory full") [G15].
- 2025-10-24: `@letta-ai/letta-code` first npm publish [G28].
- 2025-10-31: BEAM benchmark (arXiv 2510.27246) [G38].
- 2025-12-02: Letta "Skill Learning" [G32]. 2025-12-09: OWASP Agentic Top 10 (ASI06) [G48]. 2025-12-11: Letta "Continual Learning in Token Space" [G33].
- 2026-01-15: ChatGPT improved memory for finding details from past chats (Plus & Pro) [G15].
- 2026-02-09: Mastra Observational Memory (94.87% LongMemEval with gpt-5-mini) [G40]. 2026-02-12: Letta Context Repositories (git worktrees for concurrent memory subagents) [G31].
- **2026-02-25: Claude Code auto memory (v2.1.59)** [G8]. 2026-03-02: Claude memory for free users [G12].
- 2026-04-07: MemPalace "100% LoCoMo" debunk [G39]. 2026-04-14: Mem0 SDK 2.0.0/3.0.0 (new algorithm) [G21].
- **2026-04-23: Claude Managed Agents memory (public beta)** [G5]. 2026-05-05: ChatGPT memory Sources [G15]. 2026-05-08: Mem0 Memory Decay; 2026-05-13: Mem0 Temporal Reasoning [G21]. 2026-05-12: LongMemEval-V2 [G37]. **2026-05-19: Managed Agents Dreaming (research preview)** [G6].
- 2026-06-04: ChatGPT "Memory that stays more up to date" [G15]. 2026-06-12: memory summary delete controls [G15]. 2026-06-23: arXiv 2606.24322 (origin-bound memory authority) [G52]. 2026-06-27: Mem0 SDK `expiration_date` [G21].
- 2026-07-10: "Updated memory for Claude" [G12]. 2026-07-14: Claude Code explicit MEMORY.md over-limit error (v2.1.210) [G8]. 2026-07-22: memory-store beta header `agent-memory-2026-07-22` (date inferred from the header string) [G3]. 2026-07-24: Google OKF v0.2 [G59].
- 2026-08-14: ChatGPT editable project memory setting [G15]. **2026-08-25: Claude memory Topics + Cowork + sensitive-topics setting** [G12]. 2026-08-31: "Agent memory as a file format" (memoryfields) hits HN front page, 191 pts [G60].
- 2026-09-18: Claude Code reads AGENTS.md directly (v2.1.277) [G8]. 2026-09-28: v2.1.284 neutralizes markup-imitating tags in MEMORY.md [G8]. 2026-09-29: v2.1.285 forbids turning auto memory on from background sessions [G8]; Cognee v1.6.2 [G42].

## Mechanics

### 1. Claude Managed Agents memory stores (absent from all three notes) [G3][G5]
- A store is "a workspace-scoped collection of text documents optimized for Claude". Attached at session creation only; it "is mounted as a directory inside the session's sandbox" under `/mnt/memory/<slug>/`, and "a note describing each mount is automatically added to the system prompt". The agent uses its normal file tools; there is no special memory tool. The agent toolset must be enabled [G3].
- Limits: 100 kB (~25k tokens) per memory; 10,000 memories per store ("writes to new memories fail" at the cap); 8 stores per session; `instructions` ≤ 4,096 chars. Versions are retained 30 days, with recent versions of live memories always kept [G3].
- Self-hosted sandboxes get a synced local copy, not a live mount. The worker reconciles "at most once per sync interval (15 seconds by default)" [G3].
- Attach, VERBATIM [G3]:
```json
{
  "agent": "$agent_id",
  "environment_id": "$environment_id",
  "resources": [
    {
      "type": "memory_store",
      "memory_store_id": "$store_id",
      "access": "read_write",
      "instructions": "User preferences and project context. Check before starting any task."
    }
  ]
}
```
- Optimistic concurrency on update, VERBATIM [G3]:
```json
{
  "content": "CORRECTED: Always use 2-space indentation.",
  "precondition": {"type": "content_sha256", "content_sha256": "$mem_sha"}
}
```
- Security, VERBATIM warning [G3]: "If the agent processes untrusted input (user-supplied prompts, fetched web content, or third-party tool output), a successful prompt injection could write malicious content into the store. Later sessions then read that content as trusted memory. Use `read_only` for reference material". `access` "is enforced at the filesystem level".
- Audit: "Redact scrubs content out of a historical version while preserving the audit trail". "A version that is the current head of a live memory cannot be redacted" [G3].
- Launch claims (vendor-reported, 2026-04-23): Rakuten "97% fewer first-pass errors", "27% lower cost and 34% lower latency"; Wisedocs verification "sped up 30%" [G5].

### 2. Anthropic Dreams (offline consolidation as an API) [G4][G6]
- Inputs: one memory store plus 1–100 sessions. Output: a **new** store ("The input store is never modified"). Lifecycle `pending → running → completed | failed | canceled`. It runs as an observable session (`session_id`) and takes "minutes to a few hours". Billed at standard token rates, and "Cost scales roughly linearly with the number and length of input sessions" [G4].
- `instructions` steer synthesis. Imperative line edits "generally produce no change". Targeted fixes go through the Memory Stores API [G4].
- Response, VERBATIM excerpt [G4]:
```json
{
  "type": "dream",
  "id": "drm_01AbCDefGhIjKlMnOpQrStUv",
  "status": "pending",
  "inputs": [
    { "type": "memory_store", "memory_store_id": "memstore_01Hx..." },
    { "type": "sessions", "session_ids": ["sesn_01...", "sesn_02..."] }
  ],
  "outputs": [],
  "model": { "id": "claude-opus-4-8" },
  "instructions": "Focus on coding-style preferences; ignore one-off debugging notes.",
  "session_id": null,
  "created_at": "2026-04-29T17:04:10Z"
}
```
- Error types include `input_memory_store_too_large`, `memory_store_org_limit_exceeded`, `input_session_unavailable` [G4]. Customer claim: Harvey "Completion rates went up ~6x in their tests" (vendor blog, conditions unstated) [G6].

### 3. Claude Code memory: details the notes lack [G7][G8][G9]
- Settings: `autoMemoryEnabled` (in `/memory` or project settings), `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`, `autoMemoryDirectory` (absolute or `~/`; a repo-supplied value is honored only under workspace trust, and ignored when `permissions.blockReadsOutsideWorkingDirectories` is on) [G7].
- Layout, VERBATIM [G7]:
```text
~/.claude/projects/<project>/memory/
├── MEMORY.md           # Index, one line per memory, loaded into every session
├── user_role.md        # One memory
├── feedback_testing.md # One memory
└── ...                 # Any other topic files Claude creates
```
- Memory files are excluded from the `cleanupPeriodDays` transcript sweep. The main session's auto memory is **not** loaded into subagents, except forks. CLAUDE.md is loaded in full up to 4 MiB and skipped above that; the 200-line/25KB limit applies only to MEMORY.md [G7].
- Subagent memory scopes: `user` → `~/.claude/agent-memory/<name>/`; `project` → `.claude/agent-memory/<name>/` (can be committed); `local` → `.claude/agent-memory-local/<name>/`. The subagent's prompt gets the first 200 lines/25KB of its MEMORY.md, and Read/Write/Edit are auto-enabled. Turning auto memory off disables it [G9].
- Learning from corrections is built into the taxonomy: `feedback` = "corrections you give Claude and approaches you confirm" [G7].

### 4. OpenAI: ChatGPT memory and Codex memories [G14][G15][G16][G17]
- ChatGPT sources, per the FAQ: "past chats, saved memories, custom instructions, files in Library, content from connected apps, such as Gmail". "Improved Memory continually updates a broader summary of relevant context. Legacy saved memories use a more explicit list" [G14].
- Deletion semantics: turning off Reference chat history → derived info "scheduled for deletion from OpenAI systems within 30 days". Logs of deleted saved memories may be retained "for up to 30 days for safety and debugging". "Deleting a chat alone does not necessarily delete a separate saved memory created from that chat" [G14].
- Temporary chats "do not create or update memories". Personalized temporary chats can *read* memory [G14][G15].
- Automatic management (2025-10-15): prioritizes by "how recent a detail is and how often you talk about a topic", i.e. recency × frequency as in Generative Agents [G15].
- Codex local memories: background extraction after a chat is idle, skip "active or short-lived sessions", "redacts secrets". Config, VERBATIM [G16]:
```toml
[features]
memories = true
```
  Keys: `memories.generate_memories`, `memories.use_memories`, `memories.disable_on_external_context` ("keeps chats that used external context such as MCP tool calls, web search, or tool search out of memory generation"), `memories.min_rate_limit_remaining_percent`, `memories.extract_model`, `memories.consolidation_model`. Guidance, VERBATIM: "Keep required team guidance in `AGENTS.md` … Treat memories as a helpful recall layer, not as the only source for rules that must always apply" [G16].
- OpenAI Agents SDK `SQLiteSession` etc. are short-term conversation-history memory only ("Before each run … retrieves the conversation history … After each run … stored") [G17].

### 5. Letta Harness MemFS and dreaming [G29][G30][G31]
- Dreaming config, VERBATIM [G30]:
```
dreaming: {
    trigger: "step-count", // "off" | "step-count" | "compaction-event"
    behavior: "auto-launch", // "reminder" | "auto-launch"
    stepCount: 25,
  },
```
- `/init`, `/remember`, `/doctor`, `/sleeptime`. "Agent reviews before applying" adds a second background review conversation, which "does not ask you for approval" [G30]. Memory subagents use git worktrees "so they can update memory concurrently without blocking the main agent" [G29]. Defragmentation keeps "15–25 focused files" [G31]. Skills live in `$MEMORY_DIR/skills` and are versioned with memory, making them procedural memory in the same repo [G29].

### 6. Mem0 April-2026 migration specifics [G20]
Breaking-change rows, VERBATIM:
```
| `add()` events | Returns `ADD`, `UPDATE`, `DELETE` | Returns `ADD` only | Update code expecting UPDATE/DELETE |
| Graph memory | `enable_graph` + `graph_store` in config | Removed | Graph memory is removed from OSS. It's a built-in, always-on [Mem0 Platform feature](/platform/features/graph-memory) |
```
- `search()`/`get_all()` entity ids moved into `filters`, and top-level kwargs "now raise `ValueError`". The `[nlp]` extra (spaCy) supports Python 3.10–3.12 only. Qdrant users need `fastembed` for BM25 [G20].
- Dream Synthesis only considers memories created after it is enabled, and only those scoped to `user_id` alone [G22]. SDK expiration: `expiration_date` / `expirationDate`, `showExpired` [G21].

### 7. AWS AgentCore Memory strategies [G58]
- Built-in strategy steps: "Extraction", "Consolidation – Determines whether to write useful information to a new record or an existing record", "Reflection – Insights are generated across episodes". Strategies: Semantic, User preference, Summary, Episodic. The Episodic strategy "automatically detects episode completion" and outputs XML episodes (situation, intent, assessment, justification, episode-level reflection). Three ownership levels: built-in (highest storage cost), built-in overrides (custom prompts, Bedrock models in your account), self-managed [G58].

### 8. Hermes Agent: bounded memory with a frozen snapshot [G54]
- Limits: MEMORY.md 2,200 chars (~800 tokens), USER.md 1,375 chars (~500 tokens). Overflow → "the `memory` tool returns an error instead of silently dropping entries". Actions `add`/`replace`/`remove` locate entries by unique substring (`old_text`). There is no read action.
- System-prompt block, VERBATIM [G54]:
```
══════════════════════════════════════════════
MEMORY (your personal notes) [67% — 1,474/2,200 chars]
══════════════════════════════════════════════
User's project is a Rust web service at ~/code/myapi using Axum + SQLx
§
This machine runs Ubuntu 22.04, has Docker and Podman installed
```
- "Frozen snapshot pattern": the block is injected once per session and never changed mid-session, to keep the prefix cache. Documented failure mode, VERBATIM: "If the fact is not there, the model claimed a save it never made. Small local models (roughly under 30B parameters) and models with weak tool-calling do this often" [G54]. `write_approval: true` stages writes for review [G54].

### 9. LangChain Deep Agents file memory [G55]
- `memory=["/memories/AGENTS.md"]`, with `CompositeBackend(default=StateBackend(), routes={"/memories/": StoreBackend(namespace=lambda rt: (rt.server_info.assistant_id,))})` (VERBATIM fragment; requires `deepagents>=0.5.0` for `rt.server_info`). Scope by `(assistant_id,)` for agent-wide memory or by `(user_id)` for per-user memory.
- Hot path vs background, from the docs table: hot path gives "Memories available immediately" but "Adds latency, agent must multitask". Background gives "No user-facing latency, can synthesize across multiple conversations" but "Memories not available until next conversation, requires a second agent". "For most applications, the hot path is sufficient." Concurrent writes to the same file are "last-write-wins". Shared writable memory is flagged as a prompt-injection vector: "Default to user scope" [G55].

### 10. ACE, verbatim mechanics missing from the notes [G43]
- Curator output, VERBATIM:
```json
{
"reasoning": "The reflection shows a critical error where the agent used unreliable heuristics (transaction descriptions) instead of the authoritative source (Phone app contacts) to identify relationships. ...",
"operations": [
{
"type": "ADD",
"section": "strategies_and_hard_rules",
"content": "Always resolve identities from the correct source app\n- When you need to identify relationships (roommates, contacts, etc.), always use the Phone app's contact, and never try other heuristics from transaction descriptions, name patterns, or other indirect sources. These heuristics are unreliable and will cause incorrect results."
}
]
}
```
- Generator output cites `"bullet_ids": ["calc-00001", "fin-00002"]`. The Reflector tags bullets helpful or harmful [G43].
- Limitation, VERBATIM: "in the absence of reliable feedback signals (e.g., ground-truth labels or execution outcomes), both ACE and other adaptive methods such as Dynamic Cheatsheet may degrade, suggesting that context adaptation depends critically on feedback quality" [G43].

### 11. Memory poisoning: kill chain and mitigations [G48][G49][G50][G51][G52]
- Unit 42 chain (Bedrock Agents + Nova Premier): malicious URL → agent fetches the page → payload uses forged `</conversation>` / `<conversation>` tags to put instructions outside the user block during **session summarization** → the summary stores them as a fake "validation goal" → the memory is injected into later sessions' orchestration prompt → silent exfiltration to C2 [G49].
- OWASP ASI06 mitigations, VERBATIM excerpts: "Prevent automatic re-ingestion of an agent's own generated outputs into trusted memory to avoid self-reinforcing contamination or 'bootstrap poisoning.'"; "Expire unverified memory to limit poison persistence."; "Weight retrieval by trust and tenancy: Require two factors to surface high-impact memory (e.g., provenance score plus human-verified tag)" [G48].
- arXiv 2606.24322: content- and lineage-based trust is malleable through "the agent's own summarization, a trusted-tool echo, and manufactured corroboration", so "write-time origin binding is necessary" [G52]. This is the theory behind OpenClaw's origin classes [G53] and Codex's `disable_on_external_context` [G16].

### 12. Practical design guide (COMPOSED from the sources above)
1. Start with files: a small always-loaded index (≤200 lines, or a char-bounded block) plus on-demand topic files, and agentic search (grep/glob) over them [G7][G29][G54]. Add vector/BM25 search only when files outgrow grep (MemFS Search mod, Mem0, AgentCore) [G29].
2. Separate human-authored rules (CLAUDE.md/AGENTS.md; read-only) from agent-authored memory (writable, versioned). Codex and Anthropic both say memory must not be the only home for must-follow rules [G16][G7].
3. Write path: hot path by default; add scheduled consolidation once many sessions accumulate, and have it write a *new* version or store you can review or discard (Dreams pattern) [G4][G55].
4. Conflicts: choose explicitly between append + supersede (Mem0 ADD-only + Supersede [G20][G22]), bi-temporal invalidation (Graphiti), and last-write-wins overwrite (plain files; guard with `content_sha256` or git) [G3][G29].
5. Trust: tag origin at write time; mount shared stores read-only; exclude sessions that touched external content from extraction; keep versions and redaction for PII and deletion requests [G3][G16][G48][G53].
6. Bound growth: hard caps with an explicit error beat silent truncation (Hermes; Claude Code ≥ v2.1.210) [G54][G8]. Add expiry (`stale_after`, `expiration_date`) and decay [G59][G21].
7. Measure against your own traces. Treat LoCoMo/LongMemEval vendor numbers as marketing unless the reader model, retrieval budget, token count and question sample are stated [G19][G40][G42].

## Numbers

| Metric | Value | Conditions | Source |
|---|---|---|---|
| Memory tool + context editing vs baseline | +39% | Anthropic internal agentic-search eval, Sonnet 4.5, 2025-09-29 | [G2] |
| Context editing alone | +29% | same | [G2] |
| Token reduction | −84% | 100-turn web-search eval | [G2] |
| Mem0 paper LoCoMo J | Full-context 72.90; Mem0g 68.44; Mem0 66.88; Zep 65.99 (run by Mem0); LangMem 58.10; OpenAI 52.90; A-Mem 48.38 | tokens/query: 26,031 / 3,616 / 1,764 / 3,911 / 127 / 4,437 / 2,520 | [G24] |
| LangMem search latency | p50 17.99s, p95 59.82s | Mem0's run | [G24] |
| Zep LoCoMo (own rerun) | 75.14% ± 0.17 | Zep, 2025-05-06 | [G25] |
| Zep LongMemEval_S | 71.2% (gpt-4o) vs full-context 60.2%; 63.8% (gpt-4o-mini) vs 55.4% | context 1.6k vs 115k tokens | [G26] |
| DMR saturation | full-conversation gpt-4o-mini 98.0% vs Zep 98.2% | Zep paper | [G26] |
| Mem0 new algorithm (OSS) | LoCoMo 91.6, LongMemEval 93.4 | migration guide | [G20] |
| Mastra Observational Memory, LongMemEval | 94.87 (gpt-5-mini), 93.27 (gemini-3-pro-preview), 84.23 (gpt-4o) | gemini-2.5-flash as Observer/Reflector | [G40] |
| LongMemEval-V2 | AgentRunbook-C 72.5%; Codex baseline 69.3%; best RAG 48.5% | 451 questions, up to 500 trajectories / 115M tokens | [G37] |
| BEAM dataset | 100 conversations, 2,000 questions, up to 10M tokens | | [G38] |
| Cognee BEAM | 0.79 @100K on 20 questions / 1 conversation; 0.67 @10M exploratory | self-reported | [G42] |
| ACE context collapse | 18,282 → 122 tokens; accuracy 66.7 → 57.1 (no-context 63.7) | AppWorld, monolithic rewriting (DC-style) | [G43] |
| ACE efficiency | −82.3% latency, −75.1% rollouts vs GEPA (offline AppWorld); −91.5% latency, −83.6% token cost vs DC (online FiNER) | repo README | [G44] |
| Letta skill learning | +9.0 abs (21.1% rel) trajectory-only; +15.7 abs (36.8% rel) with feedback; −15.7% cost, −10.4% tool calls | Terminal-Bench 2.0, 89 tasks, Sonnet 4.5 + extended thinking | [G32] |
| AgentPoison | >80% avg attack success; <1% benign impact; <0.1% poison rate | 3 agent types | [G51] |
| Managed Agents memory limits | 100 kB/memory; 10,000/store; 8 stores/session; 30-day version retention | beta docs | [G3] |
| Dreams limits | 100 sessions/dream; instructions 4,096 chars | research preview | [G4] |
| Hermes caps | MEMORY.md 2,200 chars; USER.md 1,375 chars | | [G54] |
| Generative Agents | decay 0.995/sandbox-hour; α=1; reflection threshold 150; 100 recent records | | [G45] |
| Vendor launch claims | Rakuten −97% first-pass errors, −27% cost, −34% latency; Wisedocs +30% speed; Harvey ~6x completion | vendor blogs, conditions unstated | [G5][G6] |

## Pitfalls, limits, criticism (new beyond the three notes)

- **Retrieval recall is not QA accuracy.** MemPalace reported R@5 session recall as "500/500" on LongMemEval and patched three failing questions ("This is teaching to the test", its own BENCHMARKS.md) [G39].
- **`top_k` ≥ corpus size turns a memory benchmark into reading comprehension** (LoCoMo, `top_k=50` over ≤32 sessions) [G39].
- **The reader model dominates vendor scores:** a ~10.6-point spread across reader models for one memory system [G40]. Mem0 does not disclose its "production-representative model stack" [G19].
- **Compression-based memory drifts.** HN critique of Observer/Reflector: "compression is inherently lossy", and the Reflector "validate[s] success primarily via token thresholds" [G41]. ACE shows the collapse quantitatively [G43].
- **Self-improvement needs a verifier.** ACE/DC "may degrade" without reliable feedback [G43]. Letta's best skill gains came with verifier feedback [G32]. Voyager commits a skill only after self-verification (spec.md).
- **"Saved" does not mean saved:** weak tool-callers claim memory writes they never made [G54]. Log and verify memory writes.
- **Multi-writer corruption:** two Hermes processes on one home "compound each other's entries" [G54]. Deep Agents same-file writes are last-write-wins [G55]. Claude Cowork memory write conflicts once showed only the start and end of files over ~10,800 chars (fixed in v2.1.280) [G8].
- **Cross-surface memory leaks scope.** ChatGPT project-only memory exists because default memory crosses projects [G15]. Claude Tag public channels now keep separate notes [G8].
- **Regulated data:** Claude memory is unavailable under HIPAA/public-sector/custom retention [G11]. ChatGPT improved memory "is not covered under your BAA" [G14].
- **Deletion is multi-location.** ChatGPT: summary, saved memories, chats, Library files and connected apps each need separate deletion [G14]. Managed Agents: redact old versions, since deletion leaves versions for up to 30 days [G3].

## What changed in the last 6 months (April–September 2026) — items none of the notes caught

- Anthropic: Managed Agents memory stores (04-23) and Dreams (05-19); memory-store beta header switched to `agent-memory-2026-07-22`; memory stores on self-hosted sandboxes (Managed Agents "Aug 19 release" per the Claude Code changelog) [G3][G4][G5][G6][G8].
- Claude Code: explicit over-limit error (v2.1.210, 07-14), `modified` frontmatter (v2.1.214, 07-18), AGENTS.md (v2.1.277, 09-18), markup-imitation neutralization (v2.1.284, 09-28), auto memory blocked from being enabled in background sessions (v2.1.285, 09-29) [G8].
- Claude.ai: updated memory (07-10); Topics + Cowork + sensitive topics (08-25) [G12].
- ChatGPT: Sources (05-05), auto-updated improved memory (06-04), summary delete controls (06-12), editable project memory (08-14) [G15]. Codex local memories with extract and consolidation models [G16].
- Mem0: Memory Decay (05-08), Temporal Reasoning (05-13), SDK expiration (06-27), TS SDK 3.1.0 (07-13), releases up to 2.2.1 (09-25) [G21][G23].
- Letta: rename to "Letta Harness (formerly Letta Code)"; `letta` 0.34.0 (09-30) [G28].
- Benchmarks: LongMemEval-V2 (05-12, update 08) [G37]; MemPalace debunk (04-07) [G39].
- Formats: Google OKF v0.2 (07-24) [G59]; memoryfields (Aug 2026) [G60].
- Security: arXiv 2606.24322 (06-23) [G52].

## Diagram candidates

1. **Managed Agents memory mount:** Session sandbox ↔ `/mnt/memory/<store>/` (rw / ro) ↔ Memory Store → Memory Versions (`memver_`). Arrows: "file write → new version (attributed to session)", "API redact", "`content_sha256` precondition". States: live, archived (one-way), deleted [G3].
2. **Dreams pipeline:** Input store + 1–100 sessions → Dream job (`pending → running → completed | failed | canceled`) → **new** output store → human review → attach or discard. The input is untouched [G4].
3. **Four "dreams" side by side:** Anthropic (offline, new store), Mem0 (write-time supersede/merge + scheduled synthesis), Letta (step-count/compaction trigger, worktree subagents), OpenClaw (nightly Light→REM→Deep, sole writer) [G4][G22][G30][G53].
4. **Claude Code memory surfaces:** CLAUDE.md hierarchy (human) | auto memory MEMORY.md index + topic files (Claude) | subagent memory dirs (user/project/local) | rules. Arrows show what loads at startup vs on demand, and that forks inherit while plain subagents do not [G7][G9].
5. **Memory-poisoning kill chain (Unit 42):** Attacker page → agent fetch → forged `</conversation>` tags → session summarizer → long-term memory → next session's orchestration prompt → exfiltration. Overlay defenses: origin tag, read-only mount, `disable_on_external_context`, markup neutralization [G49][G16][G8][G53].
6. **Consumer memory generations (Claude):** chat-search tools (2025-08) → 24h summary (2025-09, legacy) → Topics saved in-chat + Cowork (2026-08) [G18][G11][G12].
7. **ChatGPT memory sources and controls:** sources (past chats, saved memories, custom instructions, Library, Gmail) → personalization → Sources UI → correct / "Don't mention this again" / delete [G14].
8. **Hermes frozen-snapshot loop:** session start reads MEMORY.md/USER.md → frozen system block (prefix cache) → in-session `memory` tool writes go to disk only → next session sees them [G54].
9. **LongMemEval-V2 setups:** trajectories → (a) RAG slices → 48.5%; (b) files + coding agent (AgentRunbook-C) → 72.5%, high latency; (c) vanilla Codex → 69.3% [G37].
10. **ACE context collapse vs incremental delta:** timeline of context tokens (18,282 → 122) and accuracy (66.7 → 57.1 < 63.7) for monolithic rewrite, against ACE's append-and-dedupe [G43].
11. **Hot path vs background write:** main agent (edit_file during turn) vs consolidation agent on cron over recent threads → store; pros and cons from the LangChain table [G55].

**Chart candidates:**
- Mem0 paper LoCoMo J-score vs tokens/query (8 systems; full-context tops accuracy) [G24].
- Zep LongMemEval_S: accuracy and context tokens, Zep vs full-context, for two models [G26].
- Mastra OM accuracy by reader model (94.87 / 93.27 / 84.23) [G40].
- LongMemEval-V2 method accuracy (72.5 / 69.3 / 48.5) [G37].
- Letta skill learning on Terminal-Bench 2.0 (baseline, +9.0, +15.7 abs) [G32].

## Glossary

- **Memory store (Managed Agents):** workspace-scoped document collection mounted into a session sandbox; versioned [G3].
- **Memory version (`memver_`):** immutable snapshot per mutation; can be redacted [G3].
- **Dream (Anthropic):** async job consolidating one store plus sessions into a new store [G4].
- **Improved memory (ChatGPT):** auto-updated summary-style memory that replaced the explicit list by default [G14].
- **Memory Sources (ChatGPT):** UI showing which chats, memories, files or emails personalized an answer [G14].
- **Topics (Claude.ai):** individual memory items saved during chat, editable in Settings [G11].
- **MemFS / context repository (Letta):** the agent's memory as a git repo projected to files; `system/` is always in context [G29][G31].
- **Frozen snapshot (Hermes):** memory injected once per session to keep the prompt cache stable [G54].
- **OKF:** Google's Open Knowledge Format, markdown+YAML with provenance, trust, lifecycle and `stale_after` [G59].
- **ASI06:** OWASP Agentic Top-10 item "Memory & Context Poisoning" [G48].
- **Bootstrap poisoning:** re-ingesting the agent's own outputs as trusted memory [G48].
- **AgentRunbook-C:** LongMemEval-V2 method storing trajectories as files queried by a coding agent [G37].
- **Observational Memory (Mastra):** Observer/Reflector background agents replacing raw history with a dense observation log [G40].
- **Context collapse (measured):** a monolithic rewrite shrinking the context by orders of magnitude, with an accuracy drop [G43].
- **AgentCore strategy:** AWS memory-extraction config (semantic, user preference, summary, episodic) [G58].

## Unverified / open questions

- **Google Vertex/Agent Platform Memory Bank mechanics:** docs page fetched (WebFetch and r.jina.ai), but the body did not render; only a data-processing note was confirmed. Extraction/consolidation, TTL and GA status unverified.
- **"Claude Code Auto Dream":** only evidence is an HN link to a tweet (2026-03-25, item 47521377) around the March 2026 source-leak discussion. No mention in the public docs or CHANGELOG. Do not state it as a feature.
- **Mem0 Dream launch date:** not in the changelog highlights; page exists, date unknown.
- **ChatGPT memory launch date:** the release-notes parse put "Memory and new controls for ChatGPT" under a 2024-05-13 heading. OpenAI's original announcement (widely cited as Feb 2024) could not be fetched (403). Verify before printing.
- **Cursor Memories removal:** the current docs index has no Memories page (verified absence); when and why it was removed is not verified.
- **Hermes Agent skill self-improvement internals** (how skills are "improved during use"), and the "/learn" feature (tweet 2026-06-24): not read beyond the README.
- **OWASP Agent Memory Guard project:** not opened (HN posts only, from field.md).
- **Managed Agents `agent-memory-2026-07-22` release date:** inferred from the header string; no announcement located.
- **Memory tool eval (+39%/+29%/−84%):** the blog does not name the dataset beyond "agentic search" / "100-turn web search"; treat as vendor-internal.
- WebSearch was unavailable (session budget exhausted). All research used direct fetches: platform docs .md, raw GitHub, the arXiv API, the HN Algolia API, PyPI/npm registries, and r.jina.ai for OpenAI/Claude help-center pages that return 403 to curl.

## Sources (all accessed 2026-09-30)

- [G1] "Memory tool," Anthropic docs (undated live page), https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool.md
- [G2] "Managing context on the Claude Developer Platform," Anthropic/Claude blog, 2025-09-29, https://claude.com/blog/context-management
- [G3] "Using agent memory" (Managed Agents memory stores), Anthropic docs, beta, https://platform.claude.com/docs/en/managed-agents/memory.md
- [G4] "Dreams," Anthropic docs, research preview, https://platform.claude.com/docs/en/managed-agents/dreams.md
- [G5] "Built-in memory for Claude Managed Agents," Claude blog, 2026-04-23, https://claude.com/blog/claude-managed-agents-memory
- [G6] "New in Claude Managed Agents: dreaming, outcomes, and multiagent orchestration," Claude blog, 2026-05-19, https://claude.com/blog/new-in-claude-managed-agents
- [G7] "How Claude remembers your project," Claude Code docs (undated live page, references up to v2.1.283), https://code.claude.com/docs/en/memory.md
- [G8] Claude Code CHANGELOG.md, anthropics/claude-code, https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md; release dates from https://registry.npmjs.org/@anthropic-ai/claude-code
- [G9] "Subagents," Claude Code docs, https://code.claude.com/docs/en/sub-agents.md
- [G10] "Compaction overview," "Threshold compaction," "Context editing," Anthropic docs, https://platform.claude.com/docs/en/build-with-claude/compaction.md, …/compaction-threshold.md, …/context-editing.md
- [G11] "Use Claude's chat search and memory to build on previous context," Claude Help Center, https://support.claude.com/en/articles/11817273 (via r.jina.ai)
- [G12] "Release notes," Claude Help Center, https://support.claude.com/en/articles/12138966-release-notes (via r.jina.ai)
- [G13] "Claude's memory," Claude blog, 2025-09-11 (update 2025-10-23), https://claude.com/blog/memory
- [G14] "Memory in ChatGPT," OpenAI Help Center (screenshots dated 2026-06-04), https://help.openai.com/en/articles/8590148-memory-faq (via r.jina.ai; direct fetch 403)
- [G15] "ChatGPT — Release Notes," OpenAI Help Center, https://help.openai.com/en/articles/6825453-chatgpt-release-notes (via r.jina.ai)
- [G16] "Memories," OpenAI Codex docs, https://developers.openai.com/codex/memories.md
- [G17] "Sessions," OpenAI Agents SDK docs, https://raw.githubusercontent.com/openai/openai-agents-python/main/docs/sessions/index.md
- [G18] Simon Willison, "Comparing the memory implementations of Claude and ChatGPT," 2025-09-12, https://simonwillison.net/2025/Sep/12/claude-memory/
- [G19] Mem0 README, "New Memory Algorithm (April 2026)," https://raw.githubusercontent.com/mem0ai/mem0/main/README.md
- [G20] "Open Source: Migrating to the New Memory Algorithm," Mem0 docs, https://docs.mem0.ai/migration/oss-v2-to-v3.md
- [G21] "Highlights" changelog, Mem0 docs, https://docs.mem0.ai/changelog/highlights.md
- [G22] "Dream," Mem0 docs, https://docs.mem0.ai/platform/features/dream.md
- [G23] PyPI `mem0ai` release history, https://pypi.org/pypi/mem0ai/json
- [G24] Chhikara et al., "Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory," arXiv:2504.19413, 2025-04-28 (full-text tables), https://arxiv.org/pdf/2504.19413v1
- [G25] Daniel Chalef (Zep), "Lies, Damn Lies, & Statistics: Is Mem0 Really SOTA in Agent Memory?," 2025-05-06 (modified 2026-06-03), https://blog.getzep.com/lies-damn-lies-statistics-is-mem0-really-sota-in-agent-memory/
- [G26] Rasmussen et al., "Zep: A Temporal Knowledge Graph Architecture for Agent Memory," arXiv:2501.13956, 2025-01-20 (full text), https://arxiv.org/pdf/2501.13956v1
- [G27] Letta, "Benchmarking AI Agent Memory," 2025-08-12, https://www.letta.com/blog/benchmarking-ai-agent-memory
- [G28] letta-ai/letta README, https://raw.githubusercontent.com/letta-ai/letta/main/README.md; PyPI `letta` https://pypi.org/pypi/letta/json; npm `@letta-ai/letta-code` https://registry.npmjs.org/@letta-ai/letta-code; Letta docs index https://docs.letta.com/llms.txt
- [G29] "MemFS," Letta docs, https://docs.letta.com/concepts/memfs/index.md
- [G30] "Memory & dreaming," https://docs.letta.com/configuration/memory/index.md, and "Memory" (Agent SDK), https://docs.letta.com/agent-sdk/memory/index.md
- [G31] Letta, "Context Repositories," 2026-02-12, https://www.letta.com/blog/context-repositories
- [G32] Letta, "Skill Learning," 2025-12-02, https://www.letta.com/blog/skill-learning
- [G33] Letta, "Continual Learning in Token Space," 2025-12-11, https://www.letta.com/blog/continual-learning
- [G34] Letta V1 base functions, archive branch, https://raw.githubusercontent.com/letta-ai/letta/archive/letta/functions/function_sets/base.py
- [G35] Maharana et al., LoCoMo, arXiv:2402.17753, 2024-02-27 (abstract via arXiv API)
- [G36] LongMemEval README (news: 2025/09 cleaned data, 2026/05 V2), https://raw.githubusercontent.com/xiaowu0162/LongMemEval/main/README.md
- [G37] Wu et al., "LongMemEval-V2: Evaluating Long-Term Agent Memory Toward Experienced Colleagues," arXiv:2605.12493, 2026-05-12; repo README https://raw.githubusercontent.com/xiaowu0162/LongMemEval-V2/main/README.md
- [G38] "Beyond a Million Tokens: Benchmarking and Enhancing Long-Term Memory in LLMs" (BEAM), arXiv:2510.27246, 2025-10-31, rev. 2026-02-21
- [G39] Penfield, "Milla Jovovich's MemPalace Claims 100% on LoCoMo. Its Benchmarks.md Disagrees," 2026-04-07, https://penfieldlabs.substack.com/p/milla-jovovich-just-released-an-ai
- [G40] Mastra, "Observational Memory," 2026-02-09, https://mastra.ai/research/observational-memory
- [G41] HN "Ask HN: Views on Mastra's SOTA Memory?," 2026-02-12, https://news.ycombinator.com/item?id=46992444
- [G42] Cognee README (BEAM table) and GitHub releases, https://raw.githubusercontent.com/topoteretes/cognee/main/README.md
- [G43] Zhang et al., "Agentic Context Engineering," arXiv:2510.04618 v3 (ICLR 2026), 2026-03-29 (full text), https://arxiv.org/pdf/2510.04618v3
- [G44] ace-agent/ace README, https://raw.githubusercontent.com/ace-agent/ace/main/README.md
- [G45] Park et al., "Generative Agents," arXiv:2304.03442 v2, 2023-08-06 (full text)
- [G46] Sumers, Yao, Narasimhan, Griffiths, "Cognitive Architectures for Language Agents," arXiv:2309.02427 v3, 2024-03-15 (full text)
- [G47] Wang et al., "Voyager," arXiv:2305.16291 v2, 2023-10-19 (full text)
- [G48] OWASP GenAI Security Project, "OWASP Top 10 for Agentic Applications 2026," 2025-12-09, https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/ (PDF)
- [G49] Royce Lu, Jay Chen (Unit 42), memory poisoning via indirect prompt injection in Bedrock Agents, 2025-10-09, https://unit42.paloaltonetworks.com/indirect-prompt-injection-poisons-ai-longterm-memory/
- [G50] "Memory Injection Attacks on LLM Agents via Query-Only Interaction" (MINJA), arXiv:2503.03704, 2025-03-05
- [G51] "AgentPoison," arXiv:2407.12784, 2024-07-17
- [G52] "Securing LLM-Agent Long-Term Memory Against Poisoning: Non-Malleable, Origin-Bound Authority with Machine-Checked Guarantees," arXiv:2606.24322, 2026-06-23
- [G53] "Memory architecture," OpenClaw docs, https://docs.openclaw.ai/concepts/memory-architecture.md
- [G54] NousResearch/hermes-agent README and "Persistent Memory" docs, https://raw.githubusercontent.com/NousResearch/hermes-agent/main/README.md, …/website/docs/user-guide/features/memory.md
- [G55] "Memory," LangChain Deep Agents docs, https://docs.langchain.com/oss/python/deepagents/memory.md
- [G56] "LangGraph v1 migration" and "Long-term memory," LangChain docs, https://docs.langchain.com/oss/python/migrate/langgraph-v1.md, https://docs.langchain.com/oss/python/langchain/long-term-memory.md
- [G57] LangMem README and PyPI (0.0.30, 2025-10-27), https://raw.githubusercontent.com/langchain-ai/langmem/main/README.md
- [G58] AWS Bedrock AgentCore Memory docs: memory.html, memory-strategies.html, built-in-strategies.md, episodic-memory-strategy.md, https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/
- [G59] "Open Knowledge Format (OKF) v0.2," GoogleCloudPlatform/knowledge-catalog, SPEC.md (commits 2026-07-24, 2026-08-21), https://raw.githubusercontent.com/GoogleCloudPlatform/knowledge-catalog/main/okf/SPEC.md
- [G60] Cal Paterson, "Agent memory as a file format," Aug 2026, https://calpaterson.com/memoryfields.html; HN item 49508317 (2026-08-31, 191 pts)
- [G61] arXiv abstracts: Reflexion 2303.11366, Dynamic Cheatsheet 2504.07952, Sleep-time Compute 2504.13171 (verification of the numbers in practice.md)
- [G62] GitHub REST API repo metadata (licenses, stars, created_at), queried 2026-09-30
- [G63] Cursor docs: rules.md and llms.txt, https://cursor.com/docs/rules.md, https://cursor.com/llms.txt
- [G64] "A-MEM: Agentic Memory for LLM Agents," arXiv:2502.12110, 2025-02-17, rev. 2025-10-08
- [G65] getzep/zep README ("Zep Cloud: Examples & Integrations"); PyPI `graphiti-core` 0.30.2 (2026-09-08)
- [G66] HN item 47521377 "Claude Code Auto Dream" (tweet link), 2026-03-25 — evidence of a rumour only
