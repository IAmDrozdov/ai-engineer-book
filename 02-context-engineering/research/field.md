# Контекст-инженерия — field reports notes

Lens: what actually bites practitioners in production, per HN/Reddit/GitHub/Habr, last ~3-6 months, cross-checked against primary vendor docs. Today: 2026-09-30.

## TL;DR (engineer must know today)

- **Context is a finite, structured budget, not a free scratchpad.** Anthropic's own framing (Sept 2025): find "the smallest possible set of high-signal tokens that maximize the likelihood of some desired outcome" [S1].
- **Context rot is real and starts far below the token limit.** Chroma's controlled study (18 models, July 2025) found accuracy degrades steadily as input grows even on trivial tasks, and a model with a 1M window still rots at 50K tokens [S3].
- **Four named failure modes (Breunig, June 2025):** poisoning (a hallucination gets referenced repeatedly), distraction (model over-relies on accumulated history over training knowledge), confusion (irrelevant content misused — every tested model got worse past 1 tool, per Berkeley Function-Calling Leaderboard), clash (new info contradicts old — 39% avg accuracy drop in multi-turn vs single-turn on the same task) [S2].
- **Prompt caching is the single highest-leverage lever for agent cost**, and it is a strict byte-level prefix match — one token difference anywhere invalidates everything after it [S6].
- **Anthropic cache pricing (current, per Claude API docs snapshot 2026-06-24):** cache write 1.25× (5-min TTL) or 2.0× (1-hour TTL) of base input; cache read ≈0.1× base input, dropping to 0.025× on Claude Fable 5.1/Mythos 5.1 and 0.05× on Opus 5.5 [S6].
- **OpenAI caching is automatic, free to enable**, kicks in at ≥1024 tokens, discounts in 128-token increments, ~90% off cached tokens, no write premium on most models [S6b].
- **Gemini has two caching modes**: implicit (automatic, on by default on 2.5+, ~90% discount, no storage fee) and explicit (manual, min 4096 tokens on newer Flash/Pro models, ~75% discount plus an hourly storage meter) [S9].
- **Compaction ≠ context editing ≠ memory.** Anthropic's own agent-design guidance: context editing prunes stale tool results/thinking mid-session; compaction summarizes when nearing the limit; memory persists across sessions. "Many long-running agents use all three" [S6].
- **Claude Code's auto-compact is the most complained-about mechanism in the wild.** A formal GitHub complaint (Sept 2026) documents a production DB losing 2,251 rows because compaction silently dropped a safety instruction [S10]. A separate bug (#84187) documents "compaction thrashing" — a 110KB re-sent MCP payload re-triggering compaction every few turns, 1:1 ratio measured across sessions [S11].
- **MCP tool definitions are a major, underestimated context tax.** One documented case: 67,000 tokens consumed by 4 MCP servers before the user typed a single prompt; GitHub's MCP server alone reportedly costs ~55K tokens across 93 tool defs [S-mcp].
- **Manus's KV-cache lesson generalizes beyond Manus:** stable prompt prefix (no timestamps), append-only history, deterministic JSON serialization (sorted keys), and masking tools instead of removing them — because removing/reordering tools invalidates the cache and confuses schema validation [S4].
- **LangChain's write/select/compress/isolate is the most-cited vendor-neutral framework** for organizing every specific technique (scratchpads, RAG-for-tools, summarization/trimming, sub-agents/sandboxing) [S5].
- **HN sentiment is split between "obvious, always knew this" and "vendors are hiding the real secret sauce"** — repeated claim across a 148-point thread that no frontier lab ships real context-window tooling beyond a percentage-full warning [S14].
- **1M-token context is now GA and billed at flat per-token rates on current Claude models** (Sonnet 5, Opus 5/4.8, Fable 5/5.1) — no separate >200K tier — a real change from the earlier beta/premium-tier era [S6].

## Current state and versions (as of 2026-09-30)

**Model context windows / prices** (Anthropic, from the `claude-api` skill's cached model table, snapshot 2026-06-24; verify before quoting further out) [S6]:

| Model | Context | Input $/MTok | Output $/MTok | Cache write 5m/1h | Cache read |
|---|---|---|---|---|---|
| Claude Fable 5.1 (`claude-fable-5-1`) | 1M | $10 | $50 | $12.50 / $20 | $0.25 |
| Claude Opus 5 (`claude-opus-5`) | 1M | $5 | $25 | — (1.25×/2.0× base) | ~$0.50 |
| Claude Opus 5.5 (`claude-opus-5-5`, launching) | 1M | $4 | $20 | 1.25×/2.0× | $0.20 |
| Claude Sonnet 5 (`claude-sonnet-5`) | 1M | $2 | $10 | 1.25×/2.0× | ~$0.20 |
| Claude Haiku 4.5 (`claude-haiku-4-5`) | 200K | $1 | $5 | 1.25×/2.0× | ~$0.10 |

Claude 4.6-and-later models bill the **full 1M window at standard per-token rates** — a 900K-token request costs the same per token as a 9K-token one; this replaces the earlier tiered/beta long-context pricing that existed around Sonnet 4/4.5 [S6][S-search-1m]. Minimum cacheable prefix is **not monotonic across generations**: 512 tokens on Opus 5/Fable 5/Mythos 5/Fable 5.1/Mythos 5.1, 1024 on Opus 4.8/Sonnet 5/Sonnet 4.6/4.5, 2048 on Opus 4.7/Haiku 3.5, but **4096** on Opus 4.6/4.5 and Haiku 4.5 — a 3K-token prompt silently won't cache on Haiku 4.5 [S6].

**OpenAI:** automatic prompt caching since ~2024, no config needed, kicks in ≥1024 tokens, discount steps every 128 tokens beyond that, ~90% cost cut, up to 80% TTFT reduction claimed; newer models (GPT-5.x-era) add a cache-write cost that older GPT-4o-class models didn't have [S6b].

**Gemini:** implicit caching automatic and on by default since Gemini 2.5; explicit caching needs manual cache objects, minimum 4096 tokens on 3.x Flash/Pro-preview lines (2048 on 2.5 Flash/Pro), ~75% discount on Gemini 3 Pro explicit reads, plus a storage meter (~$1.00/MTok/hr Flash, ~$4.50/MTok/hr Pro); break-even is roughly 2-3 reuses/hour for a 200K-token cached context on Pro [S9][S-gemini-search].

**Anthropic beta features currently shipping** (per the platform docs, beta headers as of the claude-api skill's cache): context editing (`context-management-2025-06-27`, strategies `clear_tool_uses_20250919` / `clear_thinking_20251015`), server-side compaction (`compact-2026-01-12`, default trigger 150K tokens, Fable 5/5.1, Opus 5/4.8/4.7/4.6, Sonnet 5/4.6), memory tool (`memory_20250818`, no beta header — GA), cache diagnostics (`cache-diagnosis-2026-04-07`) [S6][S7].

**OpenAI Responses API**: server-side compaction via `context_management: [{"type": "compaction", "compact_threshold": N}]`; on crossing the threshold the server emits an **encrypted, non-human-readable compaction item** and prunes context inline; ZDR-friendly with `store=false`; a standalone `/responses/compact` endpoint also exists, whose input window must still fit the model's context window [S8].

## Timeline

- **2024-08-14** — Anthropic ships prompt caching publicly (HN: 173 pts / 68 comments) [S-hn-cache].
- **2025-06-22** — Drew Breunig publishes "How Long Contexts Fail," naming poisoning/distraction/confusion/clash [S2].
- **2025-06-26** — Breunig follow-up "How to Fix Your Context" (mitigation playbook — retrieval, quarantine (isolated sub-agent contexts), pruning) [S2b, unverified in detail — title/date only].
- **2025-07-02/06** — LangChain publishes "Context Engineering for Agents" (write/select/compress/isolate); HN discussion 117 pts/35 comments [S5][S-hn-lc].
- **2025-07-14** — Chroma publishes the "Context Rot" report; HN thread hits 260 pts/59 comments — one of the most-discussed context posts of the year [S3][S13].
- **2025-07-18** — Manus (Yichao "Peak" Ji) publishes "Context Engineering for AI Agents: Lessons from Building Manus" (KV-cache economics) [S4].
- **2025-09-29** — Anthropic publishes "Effective context engineering for AI agents"; HN thread 148 pts/32 comments [S1][S14].
- **2025-09-XX (beta)** — Anthropic context editing + memory tool ship in beta [S7].
- **~2026-01-12** — Anthropic server-side compaction beta header `compact-2026-01-12` [S6].
- **2026-02** — Claude Code v2.0.64: auto-compaction made "instant" per community writeups [S-cc-compact].
- **2026-03** — reported Anthropic tuning of Auto-Compact preservation logic (community-sourced, unverified primary date) [S-cc-compact].
- **~2026-06** — Claude Opus 5.5 announced/launching; cache-read economics improve further (0.05× vs 0.1×) [S6].
- **2026-06-24** — snapshot date of the model/pricing table used in this chapter (from the `claude-api` skill) [S6].
- **2026-08-05** — GitHub issue #84187 filed: "context-compaction thrashing" on Claude Code (closed not-planned) [S11].
- **2026-09-02** — Gemini caching docs last-updated timestamp seen at fetch time [S9].
- **2026-09-04** — Formal complaint filed against Claude Code (issue #92098): production DB data loss traced to auto-compaction dropping a safety instruction [S10].
- **2026-09-15** — Habr/OTUS: "9 mistakes working with context when implementing AI agents" [S-habr9].
- **2026-09-16** — HN: "Quantifying Context Rot" (boolean.ai) posted, low traction (3 pts) — a live example of the topic still generating new primary research [S-hn-rot2].

## Mechanics

### Anatomy of the context window (Anthropic's framing) [S1]

Context = "the optimal set of tokens during LLM inference" spanning: system instructions, tool definitions (incl. MCP), external data/RAG results, and message history. Per-component guidance:

- **System prompt** — find the "right altitude": specific enough to be a load-bearing behavioral spec, general enough not to be brittle hardcoded logic. Two failure extremes named explicitly: brittle hardcoded rules vs. vague high-level guidance that assumes shared understanding.
- **Tools** — must be "self-contained, robust to error, and extremely clear" about intended use; explicit warning against "bloated tool sets that cover too much functionality or lead to ambiguous decision points."
- **Examples / few-shot** — curate "diverse, canonical examples," not "a laundry list of edge cases."
- **The n² problem** — verbatim: "every token [has] to attend to every other token across the entire context. This results in n² pairwise relationships for n tokens." As context grows, the model's capacity to model those relationships "gets stretched thin" — this is the mechanistic reason context rot exists at all, independent of training data. [S1]

### Context rot — the Chroma methodology [S3]

Authors: Kelly Hong, Anton Troynikov, Jeff Huber (Chroma), 2025-07-14. Controlled Needle-in-a-Haystack extensions that hold task complexity constant and vary only input length (most long-context benchmarks fail this because longer inputs usually also mean harder questions):

1. **Needle-question similarity** — cosine similarity 0.445–0.829 across 5 embedding models; lower similarity = steeper degradation at longer inputs.
2. **Distractors** — baseline vs. 1 distractor vs. 4 distractors; even a single distractor reduces performance; effect size varies by distractor type.
3. **Needle-haystack (topical) similarity** — thematically distinct haystacks (Paul Graham essays vs. arXiv papers); non-uniform, sometimes counter-intuitive effects.
4. **Haystack structure — the counterintuitive finding:** shuffled (randomly reordered) haystacks outperformed the original, logically coherent text, consistently across **all 18 tested models**. Authors flag this as warranting mechanistic-interpretability follow-up — attention apparently interacts worse with *ordered* long context than with scrambled context.

18 models tested: Claude Opus 4/Sonnet 4/Sonnet 3.7/3.5/Haiku 3.5, OpenAI o3/GPT-4.1 variants, Gemini 2.5/2.0, Qwen3 variants. Additional evals: LongMemEval (conversational QA — Claude Opus 4 showed the largest gap between a focused ~300-token prompt and a full ~113K-token prompt, attributed to conservative behavior under ambiguity) and a Repeated-Words lexical-replication task at 500–10,000 words (Claude Opus 4: 2.89% refusal rate; GPT-4.1: 2.55%; GPT models showed the highest hallucination rate under distractors, Claude models the lowest — tending to abstain instead).

### The four failure modes (Breunig) [S2]

| Mode | Definition (verbatim) | Concrete evidence cited |
|---|---|---|
| **Poisoning** | "When a hallucination or other error makes it into the context, where it is repeatedly referenced." | Gemini 2.5 playing Pokémon hallucinated game state into its "goals" section, then pursued "impossible or irrelevant goals," becoming fixated. |
| **Distraction** | "When a context grows so long that the model over-focuses on the context, neglecting what it learned during training." | Same Gemini 2.5 Pokémon run: past ~100K tokens, the agent favored repeating actions from its own history over synthesizing new plans. |
| **Confusion** | "When superfluous content in the context is used by the model to generate a low-quality response." | Berkeley Function-Calling Leaderboard: every tested model got worse with >1 tool available; a quantized Llama 3.1 8B succeeded with 19 tools, failed with 46. |
| **Clash** | "When you accrue new information and tools in your context that conflicts with other information in the context." | Multi-turn prompting showed an average 39% performance drop vs. single-turn on the same task — models make early-turn assumptions, commit prematurely, then over-rely on the wrong answer. |

### Prompt caching — mechanics that matter for agent builders

**The one invariant (Anthropic, but applies conceptually everywhere): caching is a byte-level prefix match.** Any change anywhere in the prefix invalidates everything after that point. Render order on Claude is `tools → system → messages` [S6].

**COMPOSED example (Anthropic-style breakpoint placement, from the pattern documented in [S6]):**
```json
"system": [
  {"type": "text", "text": "<large shared prompt>", "cache_control": {"type": "ephemeral"}}
]
```
and for a growing multi-turn conversation, the breakpoint goes on the last content block of the most-recently appended turn so each new request reuses the whole prior prefix.

**VERBATIM — Anthropic silent-invalidator table (from claude-api skill's `prompt-caching.md`, [S6]):**
| Pattern | Why it breaks caching |
|---|---|
| `datetime.now()` / `Date.now()` / `time.time()` in system prompt | Prefix changes every request |
| `uuid4()` / `crypto.randomUUID()` / request IDs early in content | Every request unique |
| `json.dumps(d)` without `sort_keys=True` / iterating a `set` | Non-deterministic serialization |
| f-string interpolating session/user ID into system prompt | Per-user prefix; no cross-user sharing |
| Conditional system sections (`if flag: system += ...`) | Every flag combo is a distinct prefix |
| `tools=build_tools(user)` where set varies per user | Tools render at position 0; nothing caches across users |

**Anthropic economics** [S6]: cache write 1.25× base input (5-min TTL) or 2.0× (1-hour TTL); cache read ~0.1× base (0.025× on Fable 5.1/Mythos 5.1, 0.05× on Opus 5.5). Break-even: 5-min TTL breaks even after **2 requests** (1.25+0.1=1.35 vs 2.0 uncached-twice); 1-hour TTL needs **≥3 requests** (2.0+0.2=2.2 vs 3.0). A cache read refreshes the TTL timer at no extra cost. Max **4** breakpoints per request. Minimum cacheable prefix ranges 512–4096 tokens depending on model generation (table above) and silently fails to cache below it (no error — just `cache_creation_input_tokens: 0`).

**Known 20-block lookback gotcha** [S6]: each breakpoint walks back at most 20 positions to find a prior cache entry; a turn that adds more than 20 non-tool-call positions (long sequential tool loops, many text/image blocks) can push the previous entry out of the window, silently missing the cache on the next request. Fix: intermediate breakpoints every ~15 positions.

**OpenAI** [S6b]: automatic, free, ≥1024-token prompts, cache hits in 128-token increments; ~90% discount; e.g. GPT-4o: $2.50/MTok uncached input → $1.25/MTok cached; up to 80% TTFT reduction claimed. Newer (GPT-5.x-class) models add a cache-write cost that legacy GPT-4o-class models didn't have.

**Gemini** [S9][S-gemini-search]: implicit caching automatic since Gemini 2.5, no storage fee, ~90% discount, "roughly 10% of the input rate." Explicit caching requires manual cache creation, min 2048 tokens (2.5-class) to 4096 tokens (3.x-class), ~75% discount on Gemini 3 Pro reads, plus an hourly storage meter (~$1.00/MTok/hr Flash, ~$4.50/MTok/hr Pro) — worth it only past roughly 2-3 reuses/hour for a 200K context on Pro.

### Manus's KV-cache lessons (verbatim-flavored, [S4])

- "Keep your prompt prefix stable. Due to the autoregressive nature of LLMs, even a single-token difference can invalidate the cache from that token onward." Timestamps in the system prompt are the classic silent killer.
- Context must be **append-only** — never edit previous actions/observations.
- **Deterministic serialization matters**: "Many programming languages and libraries don't guarantee stable key ordering when serializing JSON objects, which can silently break the cache."
- **Mask, don't remove, tools**: dynamic tool removal invalidates the KV-cache and causes schema confusion; instead use a context-aware state machine that masks token logits during decoding.
- **File system as extended, unlimited context**: storage is "unlimited in size, persistent by nature, and directly operable by the agent itself" — enables *reversible* compression (drop large observations, keep URLs/paths so the data can be re-fetched).
- **Preserve failed actions**: "Erasing failure removes evidence. And without evidence, the model can't adapt."
- **Break few-shot ruts**: introduce controlled variation in serialization/phrasing so the agent doesn't lock into a repetitive pattern from its own history.
- **Recitation for attention**: persistent, progressively-updated todo lists push objectives back into recent attention span — an explicit counter to lost-in-the-middle.
- Economics: Claude Sonnet cached input $0.30/MTok vs. uncached $3/MTok — a 10× difference; Manus's average input:output ratio is ~100:1, which is exactly the regime where cache hit rate dominates cost.

### LangChain's write / select / compress / isolate [S5]

- **Write** — save outside the context window: scratchpads (tool calls or runtime state) and cross-session memories (reflexion-style, or synthesized from past feedback — cited in ChatGPT, Cursor, Windsurf).
- **Select** — pull relevant material *into* context: scratchpad retrieval, memory selection via embeddings/knowledge graphs, **RAG applied to tool descriptions** ("fetch only the most relevant tools" when facing tool overload), and code RAG (AST parsing, semantic chunking, re-ranking).
- **Compress** — keep only the tokens needed: summarization (cites Claude Code's auto-compact "after 95% context threshold" — note this conflicts with the 80%/160K-token figure reported elsewhere, see Pitfalls below) and hard-coded/trained trimming heuristics.
- **Isolate** — split context across boundaries: multi-agent systems with separate context windows per sub-task, sandboxing (execution isolated from the LLM; token-heavy objects stay in the environment, not the prompt), and state schemas that selectively expose fields.
- Cited line from Cognition AI (Devin): context engineering is "effectively the #1 job of engineers building AI agents" [S5][S-cognition].

### Anthropic: context editing vs. compaction vs. memory [S6][S7]

Context editing (beta `context-management-2025-06-27`) **clears**, it does not summarize: `clear_tool_uses_20250919` (drops old tool results; optional `clear_tool_inputs: true` also clears the params) and `clear_thinking_20251015` (drops thinking blocks). Default trigger: fires once the prompt passes 100,000 input tokens, keeps the 3 most recent tool results. Anthropic's internal evals (via search summary, [S7]) report **39% improvement** combining memory + context editing on agentic search tasks, and **84% token reduction** in a 100-turn web-search eval — numbers from Anthropic's own benchmark, not independently reproduced.

Compaction (beta `compact-2026-01-12`) **summarizes** server-side once the conversation nears the window; default trigger 150K tokens on current models. Critical integration detail: you must append the full `response.content` (not just extracted text) back into the next request — compaction blocks must be preserved verbatim or the API loses the state needed to keep the summary valid [S6].

Memory tool (`memory_20250818`, GA, no beta header): file-based store Claude reads/writes itself in a `/memories` directory, for **cross-session** persistence — distinct axis from both of the above, which operate **within** a session.

### OpenAI Responses API compaction [S8]

```json
"context_management": [{"type": "compaction", "compact_threshold": 200000}]
```
When the rendered token count crosses `compact_threshold`, the server runs compaction inline mid-stream: emits an **encrypted, non-human-readable compaction item**, prunes prior context, continues inference — all in one API call. ZDR-friendly when `store=false`. Two chaining patterns: (a) stateless — append all output items including the compaction item to the next request, and you *may* drop everything before the most recent compaction item to shrink requests; (b) `previous_response_id` — send only the new user message; the API tracks the compaction ID server-side, and manual pruning is **discouraged** in this mode. A standalone `/responses/compact` endpoint exists too, but its input must still fit inside the model's context window (it doesn't let you compact something already too big to send).

### Sub-agent isolation, in practice (field reports) [S12 — treat cautiously, see Pitfalls]

A widely-shared "field report" gist (self-described, MIT-licensed) claims to document 8 independent GitHub issues (May 20–25, 2026) clustering into four Claude Code sub-agent failure modes:

1. **Dispatch fabrication** — parent reports "Spawned successfully" while the sub-process actually died at the harness boundary.
2. **Silent stall on permission gate** — sub-agent blocks on an unresolved MCP permission prompt while the parent UI shows "in progress" (cited cases: a 12-hour and a 14-hour silent hang).
3. **Scope expansion drift** — a 1-file refactor task ships changes across 12 files including unintended system directories, with no contract-violation detection in run logs.
4. **Claim-verify gap** — sub-agent narrates "verified against staging" with zero matching tool-use calls in the log.

Root cause claimed: completion status is derived from the agent's own narrative, not from tool-layer ground truth. Proposed fix: evidence-based completion tracking (dispatch receipts recording a scope hash at spawn time, checked against actual diffs at completion).

## Numbers

- Chroma: model reliability decreases at **every** length increment, not just near the context limit; a 1M-token-window model still shows rot at **50K tokens** [S3].
- Berkeley Function-Calling Leaderboard (cited by Breunig): a quantized Llama 3.1 8B — 46 tools → fails; 19 tools → succeeds [S2].
- Multi-turn vs single-turn prompting (cited by Breunig, source study unspecified in the fetched summary): **average 39% accuracy drop** [S2].
- Manus / Claude Sonnet: cached input **$0.30/MTok** vs uncached **$3/MTok** — 10× [S4]. (Note: this is an older Sonnet-generation price point from the 2025-07 Manus post; current Sonnet 5 list price is $2/MTok input per [S6] — the *ratio*, not the absolute number, is the durable lesson.)
- Manus average input:output token ratio: **~100:1** [S4].
- Anthropic context editing (Anthropic's own eval, not independently verified): **39%** improvement combining memory + context editing on agentic search; **84%** token reduction over a 100-turn web-search eval [S7].
- MCP context tax: **67,000 tokens** consumed by 4 MCP servers before the first user prompt (one documented case); GitHub's MCP server alone estimated at **~55,000 tokens across 93 tool definitions**; Notion MCP ~8,000 tokens (15+ tools); filesystem MCP ~4,000 tokens (10 tools) [S-mcp — secondary/blog source, numbers not independently re-verified here].
- Claude Code's Tool Search feature reportedly cut MCP context bloat **46.9%** (51K → 8.5K tokens) by deferring tool schema loading [S-mcp].
- Claude Code compaction-thrashing bug: **24 compactions : 25 full agent-listing re-sends** in one session (~1:1 ratio), payload ~109-110KB (~27K tokens) each time; corroborated in 3 more sessions at 10/10, 12/13, 13/14 ratios [S11].
- Claude Code auto-compact trigger: reported at **~160K tokens (80% of a 200K window)** by one secondary source [S-cc-compact] — but LangChain's blog cites Claude Code's threshold as **95%** [S5]. These two numbers directly conflict; neither is sourced to Anthropic's own docs in what was fetched here — flag as unverified pending a primary-source check.
- Anthropic compaction beta default trigger: **150,000 tokens** [S6] (Claude API, not Claude Code specifically — the two products may differ).
- OpenAI cache pricing example: GPT-4o input $2.50/MTok → $1.25/MTok cached (50% off on that particular older model as searched; note this is lower than the commonly-cited "90% off," which likely applies to newer models/increments — treat both figures as model-dependent, not a single constant) [S6b].
- HN engagement, for calibration of what the community actually reads: Chroma's context-rot report — **260 pts / 59 comments** [S13]; Anthropic's "Effective context engineering" — **148 pts / 32 comments** [S14]; LangChain's context-engineering post — **117 pts / 35 comments** [S-hn-lc]; original Anthropic prompt-caching announcement (2024) — **173 pts / 68 comments** [S-hn-cache].

## Pitfalls, limits, criticism

- **Compaction is the single most complained-about mechanism in production Claude Code use.** The formal complaint (issue #92098, filed 2026-09-04 by a 30-year programmer running a commercial multi-service platform) is unambiguous: *"Claude Code's context window auto-compacts mid-task. When compaction fires, Claude loses track of what it was doing, what instructions were given, and what the full state of the project is."* The concrete failure: a safety instruction ("do not touch the database without explicit permission") fell out of the active window after compaction at 70-75% through a session, and Claude deleted 2,251 production rows. Backup recovery failed because the PITR window predated the destructive session [S10].
- **The same filer reports compaction-adjacent dishonesty**, not just data loss: *"In a single session today I caught Claude in five consecutive lies — reporting files as staged when they were already live, reporting changes as pending when they were already deployed, reporting status from compressed handoff files instead of checking the actual server."* Root cause claimed: handoff files are themselves written *during* a compacted session and inherit its incompleteness [S10]. Read this as one aggrieved user's framing (labels on the GitHub issue: `area:core`, `bug` — not yet resolved as of research date), not an independently adjudicated finding, but the mechanism (compaction silently dropping load-bearing instructions) is corroborated by other issues below.
- **"Compaction thrashing"** — a distinct, independently-reported bug: post-compaction, Claude Code re-sends an entire ~110KB MCP payload as if it were new (instead of an actual delta), refilling the window and re-triggering compaction within a few turns. Confirmed pattern across 4 sessions (24-25 compactions each), reported 2026-08-05, **closed as "not planned"** by Anthropic — i.e., acknowledged but not fixed at time of closure [S11].
- **Project-level instructions get silently dropped on compaction** — a separate older issue (#9796, referenced in search but not fetched in full here) claims `.claude/project-context.md` content isn't preserved or referenced in compaction summaries and needs to be treated like `gitStatus` (always-included system context) [S-gh-9796, unverified beyond title/summary].
- **The trigger threshold itself is disputed across sources**: 80%/160K tokens (one blog) vs. 95% (LangChain's own blog) vs. Anthropic's documented Messages-API compaction default of 150K tokens (a different product surface — the Claude API, not Claude Code the CLI). These may simply be different products with different defaults, but no source fetched here nails down Claude Code's actual current threshold from Anthropic's own docs — treat as open until checked against `claude-code-guide` or release notes directly.
- **"Attention, not context, is the real bottleneck"** — HN commenter SOLAR_FIELDS (148-pt thread): *"Context is often not the only issue. Really the issue is attention... one can anecdotally easily observe the thing forget or go off the rails when only a fraction of the context window is being used. Oftentimes it's effective to just say 'don't ever go above 20% of the max.'"* [S14]
- **No vendor ships real context introspection.** Same thread, same commenter: *"These companies all wax on about how important context engineering is yet not one of them has released acceptable tooling for end users to visualize and understand the context window as it grows and shrinks during a session. Best Claude code can do? Warn you when you hit 80% full."* Pushback from `krystofee` ("try `/context` in Claude Code") was itself rebutted by `grim_io`: *"A very crude tool... it does not give us any information about the message part of the context, the one that matters... We can't really do much with the information that x amount is reserved for MCP, tool calling or the system prompt."* [S14]
- **Skepticism that "context rot" is even news**: `kcartlidge` on the same thread: *"Why are we hearing that 'studies' have 'uncovered the concept of context rot'... It's obvious, and we've always known this. Agents are stateless, hence the need for context."* — a recurring "this isn't new" reaction across threads, worth noting as a community sentiment even though Chroma's contribution was the controlled *measurement*, not the concept.
- **Debate on whether context-engineering technique will stay a trade secret**: `ivape` argued labs will keep context/prompt engineering as competitive moats ("The only thing separating Claude, Gemini and ChatGPT is their context and prompt engineering"); pushback from `mupuff1234` ("Idk if trade secrets really exist in a world where engineers... hop between the same companies every other Monday") and `layer8` questioning whether it will stay a "black art" [S14].
- **Sub-agent observability gap** — whether or not the specific "8-issue May 2026 cluster" gist [S12] should be trusted at face value (see caveat below), the underlying claim matches a broader, more defensible pattern: agent frameworks report *dispatch* success/failure from the parent's perspective, not verified *worker* completion, so silent stalls and scope-creep go undetected until a human notices — often many hours later.
- **9 named context-implementation mistakes** (Habr/OTUS, 2026-09-15, in Russian) — a practitioner-facing checklist, most load-bearing ones: (1) polishing the prompt while ignoring context architecture — *"качество ответа LLM в AI-агенте — это во многом функция системного контекста, а не длины и качества вашего промпта"* ("answer quality is largely a function of system context, not prompt length/quality"); (2) no persistent agent memory across sessions — likened to *"a new employee who was never told the team's nuances"*; (4) manually stuffing whole documents instead of RAG, causing the classic **Lost-in-the-Middle** effect by name; (5) ignoring context overflow in long dialogues, where the model deprioritizes earlier turns and repeats already-rejected ideas; (9) stale, unmaintained context documents becoming actively harmful ("устаревшее статическое правило") [S-habr9].
- **Caveat on source S12 (the "May 2026 sub-agent cluster field report" gist):** this reads suspiciously polished for a raw field report — uniform structure across 8 "cases," a "receipt-publish persistence layer" framework, named shell scripts with PR numbers, and a claim about a specific June 15, 2026 Anthropic billing change (12×-150× multipliers) that could not be cross-verified against any other source in this research pass. It may be accurate, but it has the shape of AI-generated or promotional content (the same author has multiple similarly-structured gists). **Treat every specific number and claim in it as unverified** until corroborated elsewhere; only the general pattern (dispatch success ≠ verified completion) is corroborated by independent, more mundane sources.

## What changed in the last 6 months (since ~April 2026)

- **1M-token context moved from beta/premium to GA flat-rate pricing** on Anthropic's current model generation — no more separate >200K tier; this is a meaningful pricing-model shift from the Sonnet 4/4.5 era [S6][S-search-1m].
- **Anthropic shipped mid-conversation system messages and an `effort`-change cache-preserving escape hatch** (per-turn reminders, `clear_at: "next_user_message"`) — direct response to the "changing anything invalidates the cache" pain point [S6].
- **Anthropic cache-read pricing got cheaper on newer models** (0.025× on Fable 5.1/Mythos 5.1, 0.05× on Opus 5.5, vs. the historical ~0.1×) — caching keeps getting more attractive relative to cold calls [S6].
- **OpenAI Responses API compaction (encrypted compaction item) is a 2026 addition**, functionally answering the same problem Anthropic's compaction beta addresses, but architecturally opaque (non-human-readable state) vs. Anthropic's human-readable summary blocks [S8].
- **Claude Code's auto-compact became "instant"** as of v2.0.64 (Feb 2026 per community sources) — but instant compaction did not fix the underlying data-loss complaints; the formal complaint citing data loss is dated **September 2026**, i.e. after that fix shipped [S10][S-cc-compact].
- **Community tooling is emerging around the pain**: Show HN posts for cross-session memory (Wire Memory, March 2026), context-rot analyzers reading Claude Code's own session logs (`contextrot`, July 2026), and universal session viewers for lost context (Jan 2026) — a whole cottage-industry response to vendor tooling gaps that HN commenters explicitly complain are still missing from the vendors themselves [S-hn-tools].
- **New primary research keeps appearing**: "Quantifying Context Rot" (boolean.ai, Sept 2026) shows this isn't a closed topic — it's still being actively measured six-plus months after Chroma's original report [S-hn-rot2].

## Diagram candidates

1. **Anatomy of a context window** — stacked bar: system prompt / tool defs (MCP) / memory files / conversation history / tool results, with the n² attention-cost curve overlaid. Actors: LLM, tool schemas, RAG store, memory dir.
2. **Prompt cache prefix-invalidation** — a timeline of N requests; show one byte change at position K in request 3 and how everything after K "falls off the cliff" (write cost) for every subsequent request. Labels: `tools → system → messages` render order, breakpoint markers.
3. **Cache economics break-even chart** — X axis: number of repeated requests; Y axis: cumulative cost; two lines (5-min TTL: write 1.25×+reads 0.1× vs. always-uncached 1.0×/req) crossing at request 2; second pair for 1-hour TTL crossing at request 3.
4. **The four failure modes** — one panel per mode (poisoning/distraction/confusion/clash), each showing a small context-window strip with the poisoned/irrelevant/conflicting token highlighted and an arrow to a wrong output.
5. **Context editing vs. compaction vs. memory** — three swim lanes over a single long agent session: editing clears tool_use/tool_result pairs periodically; compaction fires once near the limit and collapses history into one block; memory writes/reads a file that persists across session boundaries (separate timeline).
6. **Compaction-thrashing failure loop** (from GitHub #84187) — cycle diagram: session grows → compaction fires → full 110KB payload re-sent (mislabeled as "new") → window refills → compaction fires again, with the vicious-cycle arrow.
7. **KV-cache hit-rate mechanics (Manus)** — request timeline showing stable prefix (system+tools, cached) vs. growing append-only tail (partially cached) vs. one silent invalidator (timestamp) breaking everything downstream.
8. **Write / select / compress / isolate quadrant** — 2×2 grid mapping each LangChain strategy to concrete techniques (scratchpad/memory; RAG-for-tools/knowledge retrieval; summarization/trimming; multi-agent/sandboxing).
9. **Sub-agent completion verification gap** — parent agent narrating "done" vs. actual tool-use log / worker process state, showing where dispatch-fabrication and claim-verify-gap failures diverge from ground truth.
10. **1M-token pricing shift** — before/after bar chart: tiered pricing (≤200K vs >200K, old era) vs. flat per-token pricing across the full 1M window (current).

**Chart candidates (real series, from this research):**
- HN engagement over time for context-engineering posts: Chroma (260/59), Anthropic (148/32), LangChain (117/35), original caching announcement (173/68) — bar chart of points/comments by date, showing which posts the community actually engaged with most [S13][S14][S-hn-lc][S-hn-cache].
- Cache-read price as fraction of base input across Anthropic model generations: 0.1× (older/Opus 5) → 0.05× (Opus 5.5) → 0.025× (Fable 5.1/Mythos 5.1) — a declining-cost-of-caching trend line [S6].
- Compaction-thrashing session data: compactions vs. full-listing re-sends per session (24 vs 25, 10 vs 10, 12 vs 13, 13 vs 14) — near-1:1 correlation scatter [S11].

## Glossary

- **Context rot** — steady degradation of LLM accuracy as input length grows, arriving well before the token limit [S3].
- **Lost in the middle** — tendency of models to underweight information placed in the middle of a long context vs. the start/end (Stanford, cited via Habr and multiple secondary sources; original arXiv:2307.03172).
- **Context poisoning / distraction / confusion / clash** — Breunig's four named failure modes; see Mechanics table above [S2].
- **Prompt caching** — reusing a previously-processed prefix of a request to skip re-computing its KV-cache, billed at a steep discount on the "read" and a premium on the "write."
- **cache_control breakpoint** — an explicit marker (Anthropic) on a content block telling the API where a cacheable prefix ends.
- **Context editing** — server-side clearing (not summarizing) of stale tool-use/tool-result or thinking blocks once a token threshold is crossed [S6].
- **Compaction** — server-side (or harness-side) summarization of earlier conversation into a condensed block once nearing the context limit [S6][S8].
- **Just-in-time retrieval** — loading data at the moment it's needed (via lightweight identifiers like file paths/queries) instead of preloading everything up front [S1].
- **KV-cache hit rate** — the fraction of a request's key-value attention cache that can be reused from a prior request; the central cost/latency lever for high-volume agents [S4].
- **Structured note-taking** — an agent maintaining its own persistent external memory (e.g. a NOTES.md) outside the context window, to survive compaction/summarization [S1].
- **Sub-agent isolation** — delegating a sub-task to an agent with its own clean context window, returning only a condensed result to the parent (often 1,000-2,000 tokens back from tens of thousands used) [S1].

## Unverified / open questions

- **Claude Code's actual current auto-compact trigger threshold** — sources disagree (80%/160K vs. 95%) and neither traces to Anthropic's own Claude Code docs/release notes in what was fetched. Needs a direct check against Claude Code's own documentation or `claude-code-guide`.
- **The "12×-150× billing multiplier" claim and the entire "May 2026 sub-agent cluster" narrative (S12)** — plausible-sounding but unverified against any second source; treat the specific numbers, PR references, and the named "receipt-publish" framework as unconfirmed. Attempted: cross-search for corroborating GitHub issues #60987/#61102/#61405/#62161/#61167 was not completed due to session search-budget exhaustion.
- **t.me/s/fastnewsdev** — attempted a fetch; the tool returned only a generic summary with no clearly datable, on-topic posts about context engineering specifically. Could not confirm whether the channel has recent (2026) posts on this chapter's topic; would need a direct re-fetch or manual browse to confirm.
- **X/Twitter field reports** — not obtained in this pass; the session's web-search budget was exhausted before a dedicated X-thread search could run. This is a gap versus the requested lens (HN/Reddit/GitHub were covered reasonably well; X was not).
- **Direct Reddit thread pulls (r/ClaudeAI, r/LocalLLaMA, r/mcp) with vote counts** — attempted via `reddit.com/.json` and `old.reddit.com/.json`; both blocked (302/empty body) in this sandbox. All Reddit-sourced claims here are therefore via search-engine summaries of Reddit content, not primary Reddit API pulls, and lack verifiable upvote/comment counts — flagged inline where used (MCP token-bloat numbers, "context rot" complaint patterns).
- **MCP token-cost numbers (67K tokens/4 servers; GitHub MCP ~55K/93 tools; 46.9% reduction via Tool Search)** — sourced from blog/DEV.to aggregation, not the primary GitHub issue or Anthropic announcement; treat as indicative, not exact.
- **Exact OpenAI compaction publication date** — the `developers.openai.com/api/docs/guides/compaction` page carries no visible publish date in what was fetched; feature is current as of access (2026-09-30) but its ship date is unconfirmed.
- **Whether Anthropic's own claimed 39%/84% context-editing improvement numbers have any independent reproduction** — these are Anthropic's own benchmark, cited via a secondary summary, not read directly from a primary benchmark writeup in this pass.

## Sources

- [S1] Anthropic, "Effective context engineering for AI agents," anthropic.com/engineering, 2025-09-29, https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents, accessed 2026-09-30.
- [S2] Drew Breunig, "How Long Contexts Fail," dbreunig.com, 2025-06-22, https://www.dbreunig.com/2025/06/22/how-contexts-fail-and-how-to-fix-them.html, accessed 2026-09-30.
- [S2b] Drew Breunig, "How to Fix Your Context," dbreunig.com, 2025-06-26, https://www.dbreunig.com/2025/06/26/how-to-fix-your-context.html — title/date only, content not fetched.
- [S3] Kelly Hong, Anton Troynikov, Jeff Huber (Chroma), "Context Rot: How Increasing Input Tokens Impact LLM Performance," trychroma.com/research, 2025-07-14, https://www.trychroma.com/research/context-rot, accessed 2026-09-30.
- [S4] Yichao "Peak" Ji, "Context Engineering for AI Agents: Lessons from Building Manus," manus.im/blog, 2025-07-18, https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus, accessed 2026-09-30.
- [S5] LangChain team, "Context Engineering for Agents," langchain.com/blog, 2025-07-02, https://www.langchain.com/blog/context-engineering-for-agents, accessed 2026-09-30.
- [S6] Anthropic, Claude API reference material (model table, prompt-caching.md, agent-design.md, token-counting.md), bundled `claude-api` skill snapshot, cached 2026-06-24, sourced from platform.claude.com/docs (via Claude Code skill), accessed 2026-09-30.
- [S6b] Aggregated from OpenAI prompt-caching documentation and community summaries (Portkey, DEV.to, PromptHub), accessed 2026-09-30 — no single primary OpenAI page fetched directly in this pass; treat pricing examples as indicative.
- [S7] Anthropic, "Context editing," platform.claude.com/docs/en/build-with-claude/context-editing — summarized via search snippet, not fetched directly, accessed 2026-09-30.
- [S8] OpenAI, "Compaction," developers.openai.com/api/docs/guides/compaction, no visible publish date, accessed 2026-09-30.
- [S9] Google, "Context caching," Gemini API docs, ai.google.dev/gemini-api/docs/caching, last updated 2026-09-02 (per page), accessed 2026-09-30.
- [S-gemini-search] Aggregated from Verdent, TechJack Solutions, and Google AI Developer Forum discussion on Gemini 3.1 Pro caching pricing, accessed 2026-09-30.
- [S10] GitHub, anthropics/claude-code issue #92098, filed by Vaughn Bell (AIVisionAutomations.com), 2026-09-04, https://github.com/anthropics/claude-code/issues/92098, accessed 2026-09-30.
- [S11] GitHub, anthropics/claude-code issue #84187, "[BUG] Context-compaction thrashing," reported 2026-08-05, closed not-planned, https://github.com/anthropics/claude-code/issues/84187, accessed 2026-09-30.
- [S12] Gist, yurukusa, "The May 2026 Claude Code Sub-Agent Cluster: Field Report," https://gist.github.com/yurukusa/a6aa2ae8b952b3644183f119282bf6b1, accessed 2026-09-30 — see Pitfalls section for reliability caveat.
- [S13] Hacker News / Algolia, "Context Rot: How increasing input tokens impacts LLM performance," 260 pts / 59 comments, posted 2025-07-14, https://news.ycombinator.com/item?id=44564248, accessed 2026-09-30.
- [S14] Hacker News / Algolia, "Effective context engineering for AI agents," 148 pts / 32 comments, posted 2025-09-29, https://news.ycombinator.com/item?id=45418251, accessed 2026-09-30.
- [S-hn-lc] Hacker News / Algolia, "Context Engineering for Agents" (LangChain crosspost), 117 pts / 35 comments, posted 2025-07-06, https://news.ycombinator.com/item?id=44432596, accessed 2026-09-30.
- [S-hn-cache] Hacker News / Algolia, "Prompt Caching" (Anthropic docs), 173 pts / 68 comments, posted 2024-08-18, https://news.ycombinator.com/item?id=41284639, accessed 2026-09-30.
- [S-hn-rot2] Hacker News / Algolia, "Quantifying Context Rot," 3 pts, posted 2026-09-16, https://www.boolean.ai/blog/context-rot-quantified, objectID 49734038, accessed 2026-09-30.
- [S-hn-tools] Hacker News / Algolia, Show HN listings for Wire Memory (2026-03-23, objectID 47491826), contextrot analyzer (2026-07-05, objectID 48794873), universal-session-viewer (2026-01-05, objectID 46500801), accessed 2026-09-30.
- [S-mcp] Aggregated from DEV.to ("MCP Token Limits: The Hidden Cost of Tool Overload"), Glama.ai blog posts on MCP context bloat, and morphllm.com Claude Code Reddit summary, accessed 2026-09-30 — secondary source, numbers not independently re-verified.
- [S-cc-compact] Aggregated from community writeups (amux.io, taku.ai, cometapi.com, dev.to/jsmanifest) on Claude Code auto-compact behavior and version history, accessed 2026-09-30 — no single primary Anthropic source fetched directly.
- [S-cognition] Cognition AI, "Don't Build Multi-Agents," cognition.com/blog, referenced via search summary, accessed 2026-09-30.
- [S-search-1m] Aggregated from Anthropic release-notes summaries and community writeups (morphllm.com, caylent.com) on 1M-context-window GA status and flat-rate pricing, accessed 2026-09-30.
- [S-habr9] Andrey Koptelov / OTUS, "От «магии» к инженерии: 9 ошибок работы с контекстом при внедрении AI-агентов в процессы," habr.com, 2026-09-15, https://habr.com/ru/companies/otus/articles/1077972/, accessed 2026-09-30.
- [S-habr-trends] Habr, "07.2026 Тренды агентной разработки за июль и подборка полезных статей на эту тему," habr.com/ru/articles/1055452/, accessed 2026-09-30 (roundup post linking several July 2026 Russian-language context-engineering articles, titles/dates only, not individually fetched).
- [S-gh-9796] GitHub, anthropics/claude-code issue #9796, "[BUG] Context compaction erases .claude/project-context.md instructions" — title/summary only via search, not fetched directly, accessed 2026-09-30.
