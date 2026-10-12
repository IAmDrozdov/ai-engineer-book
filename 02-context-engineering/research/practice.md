# Контекст-инженерия — engineering practice notes

## TL;DR (what an engineer must know today, 2026-09-30)

- "Context engineering" superseded "prompt engineering" as the framing: curating the *entire* token budget (system prompt, tools, message history, memory, retrieved data) across every inference call of an agent loop, not just one prompt string [S1].
- **Context rot** is empirically real and non-uniform: Chroma tested 18 frontier models (Claude, GPT, Gemini, Qwen families) and found accuracy degrades well before the context limit, even on simple retrieval, and the degradation curve depends on needle-question similarity, distractor count, and — counterintuitively — *haystack coherence* (shuffled/incoherent haystacks score better than logically-structured ones, across all 18 models) [S2].
- Drew Breunig's four named failure modes (poisoning, distraction, confusion, clash) are the standard vocabulary practitioners use to diagnose *why* a long-context agent broke, and Anthropic's own docs now link to his framing [S3][S7].
- Anthropic's official doctrine (Sept 2025, still current): treat context as "a finite resource with diminishing returns" — get the smallest possible set of high-signal tokens, prefer **just-in-time retrieval** (lightweight references + tools) over preloading, and use structured note-taking + sub-agents to manage what doesn't fit [S1].
- LangChain's four-verb framework — **write / select / compress / isolate** — is the most-cited taxonomy for concrete techniques and maps directly onto shipped features (scratchpads=write, RAG/tool-RAG=select, summarization/trimming=compress, multi-agent/sandboxing=isolate) [S4].
- Manus's production lessons put **KV-cache hit rate** as *the* top metric for agent cost/latency — a stable, append-only prompt prefix is worth more than clever prompt compression, because a single token difference invalidates the cache for everything after it [S5].
- Prompt caching economics changed materially in the last year on all three vendors: Anthropic now supports one-line **automatic** caching (no manual breakpoints) in addition to explicit `cache_control`, with 5-min (1.25x write) and 1-hour (2x write) TTLs and ~0.1x read cost (0.05x or 0.025x on the priciest models) [S8]. OpenAI caches automatically server-side, 1024-token minimum prefix, ~0.1x read cost, 30-min reuse window [S9]. Gemini has both implicit (automatic, default on 2.5+) and explicit (TTL-managed, storage-billed) caching, 90% / 75% discounts respectively [S10].
- Anthropic shipped **server-side compaction** (`compact-2026-01-12`, later `compact-2026-09-04`) and **context editing** (`clear_tool_uses_20250919`, `clear_thinking_20251015`) as two *different* mechanisms: compaction summarizes, context editing deletes/clears by rule (tool results, thinking blocks) without an LLM summarization pass [S11][S12].
- OpenAI's Responses/Agents API got an analogous **server-side compaction** (`context_management.compact_threshold`) in Feb 2026, and a managed Agents API (Sept 2026) that hides session orchestration and compaction entirely [S13].
- 1M-token context is now **GA at standard per-token pricing** on Claude Opus 4.6/Sonnet 4.6 and newer (March 13, 2026) — no long-context multiplier, full rate limits at any length; this removed the "premium tier" pricing model long-context requests used to carry [S14].
- Claude models with "context awareness" get an **injected token budget** the model can read and reason about (`<budget:token_budget>` in the system prompt, `<system_warning>` after each tool call) — the model now manages its own remaining space, a real behavior change vs. 2025 [S15].
- Sub-agent isolation is empirically expensive but effective: Anthropic's multi-agent researcher beat single-agent Opus 4 by 90.2% at ~15x the token cost of a single chat; token usage alone explained 80% of performance variance across trajectories [S16].
- The **Ralph Wiggum technique** (Geoffrey Huntley, mid-2025) is the extreme "isolate" pattern: reset the whole context every loop iteration and push all state into files/git, because sustained conversation history degrades output quality well before the advertised limit [S17].
- Anthropic's Memory tool (client-side, filesystem-style `/memories` directory Claude reads/writes via tool calls) is the vendor-blessed shape for cross-session offloading, distinct from server-side compaction/context-editing which only manage a *single* long conversation [S18].

## Current state and versions (as of 2026-09-30)

- **Anthropic** (platform.claude.com, checked today): current model line includes Claude Fable 5.1, Mythos 5.1, Opus 5.5, Sonnet 5.5, Haiku 4.5 as newest, plus still-active Opus 5/4.8/4.7/4.6/4.5/4.1/4, Sonnet 5/4.6/4.5/4, Haiku 3.5 [S8]. 1M-token context window: Fable 5.1, Mythos 5.1, Fable 5, Mythos 5, Opus 5.5, Opus 5, Opus 4.8/4.7/4.6, Sonnet 5.5, Sonnet 5, Sonnet 4.6, Mythos Preview. Sonnet 4.5 and Haiku models remain at 200k [S15].
- **Prompt caching**: automatic (single top-level `cache_control`) is new vs. the 2024-era explicit-breakpoints-only model; both modes coexist [S8].
- **Context editing**: beta header `context-management-2025-06-27`; two strategies, `clear_tool_uses_20250919` (trigger default 100,000 input tokens, keep default 3 tool uses) and `clear_thinking_20251015` (per-model-class default: Opus 4.5+/Sonnet 4.6+/Fable/Mythos keep all; earlier Opus/Sonnet and all Haiku keep only last turn) [S11].
- **Compaction**: two separate beta mechanisms — "compaction on demand" (`compact-2026-09-04`, caller-triggered) and "compaction at a token threshold" (`compact_20260112`, server-triggered, default trigger 150,000 input tokens, minimum configurable value 50,000) [S12][S19]. Anthropic's docs now explicitly recommend on-demand compaction over threshold compaction "wherever it is available," and both over do-it-yourself client-side summarization [S12].
- **OpenAI**: server-side Responses API compaction shipped Feb 11, 2026 via `context_management` + `compact_threshold`; Sept 2026 Agents API (public beta) wraps session orchestration/compaction/recovery entirely server-side for a managed Codex-style harness [S13]. Prompt caching: automatic, 1,024-token minimum prefix, 128-token increments, reuse window ~30 min (GPT-5.6+), cache reads 0.1x (0.05x on "GPT-6.1 Sol"), writes 1.25x [S9].
- **Google Gemini**: implicit caching on by default for Gemini 2.5+ (90% discount, no storage fee); explicit caching needs manual `CachedContent` creation, TTL, and incurs storage cost (~$1/M tok/hr Flash, ~$4.5/M tok/hr Pro-class); minimum cacheable prefix 4,096 tokens (3.x Flash / 3.1 Pro Preview) or 2,048 (2.5 Flash/Pro) [S10].
- **Claude Code**: auto-compact still triggers near 95% of context window; clears old tool outputs first, then summarizes the trajectory if still needed; configurable via CLAUDE.md "Compact Instructions" section or `/compact <focus>` [S20].

## Timeline

- **2023** — "Lost in the Middle" (Liu et al., Stanford/Samaya AI): U-shaped recall over long context — best at the start/end of the context, worst in the middle — established on GPT-3.5/GPT-4/Claude and open models doing multi-doc QA [S6].
- **2024** — RULER benchmark (Hsieh et al.) shows effective long-context length is much shorter than advertised context windows; recall degrades with growth even without literal "lost in the middle" positioning [S6].
- **Early 2025 (per Manus)** — Manus rewrites its agent framework five times around KV-cache-centric context engineering; "Context Engineering for AI Agents: Lessons from Building Manus" published [S5].
- **April 2025** — Anthropic ships the multi-agent "Research" feature; publishes "How we built our multi-agent research system," reporting 90.2% improvement over single-agent Opus 4 at ~15x token cost [S16].
- **Mid-2025** — Geoffrey Huntley publishes the Ralph Wiggum technique (bash loop, stateless resampling, file/git-based state) — July 14, 2025 [S17].
- **June 22 & 26, 2025** — Drew Breunig publishes the two-part "How Contexts Fail" / "How to Fix Your Context" — the poisoning/distraction/confusion/clash taxonomy and matching fixes (RAG, tool loadout, quarantine, pruning, summarization, offloading) [S3][S7].
- **June 27, 2025** — Anthropic context editing beta header `context-management-2025-06-27` ships (tool-result clearing, later thinking-block clearing) [S11].
- **July 14, 2025** — Chroma publishes "Context Rot: How Increasing Input Tokens Impacts LLM Performance," 18-model evaluation [S2].
- **September 29, 2025** — Anthropic publishes "Effective context engineering for AI agents" (Rajasekaran, Dixon, Ryan, Hadfield) — just-in-time retrieval, structured note-taking, sub-agent architectures, compaction guidance [S1].
- **January 12, 2026** — Anthropic compaction-at-a-threshold beta (`compact_20260112`) ships for Opus 4.6 / Sonnet 4.6 [S12][S19].
- **February 11, 2026** — OpenAI ships server-side compaction for the Responses API (`context_management.compact_threshold`) [S13].
- **March 13, 2026** — Claude 1M-token context window goes **GA** (not just beta) for Opus 4.6 and Sonnet 4.6 at standard, non-premium pricing [S14].
- **Q2/2026 (reported)** — Anthropic reports 29% eval improvement from context editing alone, 39% from context editing + memory tool combined, over an unmanaged-context baseline (context cited in vendor/LLMOps write-ups of Anthropic's internal materials — treat as vendor-reported, not independently reproduced) [S18].
- **~August–September 2026** — Anthropic's prompt-cache default TTL is reported by third parties as having been quietly cut from 60 minutes to 5 minutes earlier in 2026 for some workloads (the 1-hour tier remains available at 2x write cost) — cross-check against the current pricing table, which still lists both 5m and 1h write columns for every model [S21][S8].
- **September 4, 2026** — Anthropic's on-demand compaction beta header updates to `compact-2026-09-04` [S12].

## Mechanics

### Anatomy of the context window

Per Anthropic's own docs, *everything* in a request counts toward the window: system prompt, every message (including tool results, images, documents), tool definitions, and the output Claude generates including extended thinking [S15]. There is no separate "free" slot for tools or system prompt — they compete with conversation history for the same budget. `usage` in the response splits input into `input_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens` — all three count toward the window even though only the first two are new spend [S15].

Context window overflow behavior (Claude 4.5+): if input alone exceeds the window, the API returns HTTP 400 `invalid_request_error`. If input + `max_tokens` exceeds the window but input alone doesn't, the request is accepted and, if generation actually hits the limit, stops with `stop_reason: "model_context_window_exceeded"` — a graceful stop rather than a hard error, gated behind a beta header on pre-4.5 models [S15]. VERBATIM [S15]:
> "If the input alone already exceeds the model's context window, the API returns a 400 `invalid_request_error` ('prompt is too long') on every model."

### Context rot — mechanics and evidence

Anthropic's framing (COMPOSED paraphrase of [S1]): context rot arises from the transformer's n² pairwise attention — as token count n grows, the number of token-pairs the model must implicitly weigh grows quadratically, so recall precision for any one fact drops as unrelated tokens crowd the attention budget.

Chroma's report [S2] operationalized this across 18 models with four experiment families:
1. **Needle-question similarity** — PG-essay needles/questions had similarity range 0.445–0.775; arXiv 0.521–0.829 (embedding cosine similarity, exact metric unspecified in the extract). Lower similarity → steeper degradation with length.
2. **Distractors** — 0 vs. 1 vs. 4 distractor needles; even a single distractor caused a "notable" drop, and Claude models showed the lowest hallucination rates of the tested vendors while GPT models showed the highest.
3. **LongMemEval** (conversational QA at ~113k tokens) — focused prompts (~300 tokens of only-relevant content) dramatically outperformed the full, distractor-laden 113k prompt; Claude Opus 4 and Sonnet 4 showed the largest focused-vs-full gap; extended thinking narrowed but did not close the gap.
4. **Repeated-words task** (25–10,000-word sequences) — steady accuracy decline with length; refusal/non-attempt rates appeared past certain lengths: Claude Opus 4 ~2.89% refusals, GPT-4.1 ~2.55% starting ~2,500 words, Gemini models emitted "random words" past ~500–750 words, Qwen3-8B ~4.21% non-attempts past ~5,000 words.
5. **Haystack structure (counterintuitive)** — models did *worse* when the haystack preserved logical narrative flow; shuffling sentences to remove coherence *improved* performance, "across all 18 models" [S2].

Anthropic's own context-windows doc now cites context rot directly and links straight to the Chroma-adjacent framing via its own "Effective context engineering" post [S15]. VERBATIM [S15]:
> "As token count grows, accuracy and recall degrade, a phenomenon known as *context rot*."

### Four failure modes (Drew Breunig)

Breunig's taxonomy, with the diagnostic examples that made it stick [S3]:

| Failure | Definition (verbatim) | Diagnostic example |
|---|---|---|
| **Poisoning** | "When a hallucination or other error makes it into the context, where it is repeatedly referenced." | Gemini 2.5 Pro playing Pokémon: hallucinations poisoned its "goals" section, fixating it on impossible/irrelevant goals — "can often take a very long time to undo" [S3]. |
| **Distraction** | "When a context grows so long that the model over-focuses on the context, neglecting what it learned during training." | Same Pokémon agent: past 100k tokens, it favored repeating history over synthesizing new plans; a cited Databricks study found Llama 3.1 405B correctness "began to fall around 32k" tokens [S3]. |
| **Confusion** | "When superfluous content in the context is used by the model to generate a low-quality response." | Berkeley Function-Calling Leaderboard: every model tested performs worse past a certain tool count; a quantized Llama 3.1 8B succeeded with 19 tools, failed with 46 [S3]. |
| **Clash** | "When you accrue new information and tools in your context that conflicts with other information in the context." | Microsoft/Salesforce researchers sharded prompts across multiple turns: avg. 39% score drop; OpenAI's o3 dropped from 98.1 to 64.1 [S3]. |

Independent corroboration on tool-count degradation: "On the Robustness of Agentic Function Calling" expanded BFCL toolkits from avg. 2.7 to 5.6 functions/test case and measured 1–8% accuracy degradation across evaluated LLMs from wrong function selection and parameter misassignment [S22] — smaller effect size than the "19 vs 46 tools" anecdote Breunig cites, so treat exact thresholds as model- and study-specific, not universal constants.

### Fixes matched to failure modes (Breunig, part 2 [S7])

- **RAG** — "Selectively adding relevant information to help the LLM generate a better response"; warns against a context "junk drawer."
- **Tool loadout** — select only relevant tool definitions; DeepSeek-v3 past 30 tools showed overlapping/confusing descriptions; RAG-limiting tool selection to <30 improved accuracy up to 3x [S7].
- **Context quarantine** — isolate contexts into separate dedicated LLM threads; cites Anthropic's multi-agent researcher's 90.2% improvement as the evidence [S7].
- **Context pruning** — actively strip irrelevant content; Provence (a trained pruner) cut a Wikipedia article context by 95% while preserving the relevant subset.
- **Context summarization** — "boiling down an accrued context into a condensed summary"; same Pokémon-agent example as the distraction failure, framed here as the fix.
- **Context offloading** — store information outside the context, via a tool (filesystem, scratchpad, memory store); Anthropic's approach yielded "up to a 54% improvement against a benchmark for specialized agents" [S7].

### LangChain's write / select / compress / isolate [S4]

- **Write**: save context outside the window. *Scratchpads* — Anthropic's multi-agent researcher writes its plan to memory because context beyond 200,000 tokens gets truncated (VERBATIM, [S4]): "saving its plan to Memory to persist the context, since if the context window exceeds 200,000 tokens it will be truncated." *Memories*: cross-session persistence (Reflexion's reflection-based memory, Generative Agents' synthesized memories; shipped in ChatGPT/Cursor/Windsurf).
- **Select**: pull the right context in at the right step. Retrieval over saved memories (embeddings/knowledge graphs) — Simon Willison flagged a failure mode here: ChatGPT unexpectedly injected saved location data from memory into an unrelated image-generation request. Tool selection via RAG over tool descriptions improves accuracy ~3x for large tool sets. Windsurf's Varun on code-agent retrieval (VERBATIM, [S4]): "Indexing code ≠ context retrieval...we must rely on a combination of techniques like grep/file search, knowledge graph based retrieval, and a re-ranking step."
- **Compress**: keep only the tokens the task needs. Claude Code's `auto-compact` at >95% context usage is the named example; recursive/hierarchical summarization; Cognition (makers of Devin) use fine-tuned models specifically to capture "critical events" during summarization; simple trimming via hard-coded heuristics (Breunig's Provence pruner cited again here).
- **Isolate**: split context across processes/agents so they don't interfere. OpenAI's Swarm library principle of "separation of concerns"; Anthropic's sub-agents run "in parallel with their own context windows, exploring different aspects of the question simultaneously" (VERBATIM, [S4]); HuggingFace's Deep Researcher (CodeAgent) executes generated code in sandboxes so large objects (images/audio) live as variables in a sandbox state, not raw tokens in context; LangGraph's schema-based state objects expose only selected fields to the LLM each turn.

### Manus: KV-cache-centric context engineering [S5]

Six principles, in the order Manus presents them:

1. **Design around the KV-cache.** "Keep your prompt prefix stable. Due to the autoregressive nature of LLMs, even a single-token difference can invalidate the cache." Concrete cost delta cited: with Claude Sonnet, cached input tokens cost $0.30/MTok vs. $3/MTok uncached — a 10x difference (Manus's own numbers, note: current Anthropic list pricing for Sonnet models has since changed — see Numbers section for today's rates) [S5]. Practice: append-only context, explicit/stable serialization (e.g., don't let a JSON key-ordering function silently reorder object keys between turns), explicit cache breakpoints when the provider requires manual ones.
2. **Mask, don't remove.** Constrain tool availability via logit masking during decoding rather than editing the tool list between turns — editing the list moves the KV-cache prefix and can leave stale tool references dangling in earlier turns.
3. **Use the filesystem as context.** VERBATIM: "the ultimate context in Manus: unlimited in size, persistent by nature, and directly operable by the agent itself" — used to avoid aggressive, lossy in-context compression of large observations.
4. **Manipulate attention via recitation.** Periodically rewrite a running task/todo summary near the *end* of context (i.e., recently-attended positions) to counter lost-in-the-middle and goal drift over long multi-step runs.
5. **Keep the wrong stuff in.** Don't scrub failed actions/errors from context — VERBATIM: seeing failures "implicitly update[s] internal beliefs. This shifts prior away from similar actions, reducing the chance of repeating the same mistake."
6. **Don't get few-shotted.** Introduce structured variation in serialization/phrasing to avoid the model pattern-matching itself into repetitive, brittle behavior. VERBATIM: "The more uniform your context, the more brittle your agent becomes."

### Anthropic doctrine: "Effective context engineering for AI agents" (Sept 29, 2025) [S1]

- **Definition**: "the set of strategies for curating and maintaining the optimal set of tokens (information) during LLM inference," explicitly framed as the successor discipline to prompt engineering — the question shifts from "what words go in the prompt" to "what configuration of context is most likely to generate our model's desired behavior."
- **System prompts**: aim for the "right altitude" — avoid brittle hardcoded if-else logic *and* avoid vague guidance that "falsely assumes shared context" with the model; organize with XML tags or Markdown headers into distinct sections.
- **Tools**: must be self-contained, robust to error, unambiguous; bloated/overlapping tool sets create decision ambiguity (echoes the "confusion" failure mode and the BFCL tool-count findings above).
- **Examples (few-shot)**: curate a small diverse set illustrating expected behavior rather than an exhaustive edge-case list ("don't stuff a laundry list of edge cases into a prompt").
- **Just-in-time retrieval**: maintain lightweight references (file paths, stored queries, links) and dynamically load data via tools at runtime, instead of preloading everything. Claude Code's example: performing complex analysis over large databases via targeted queries + Bash (`head`/`tail`) without ever loading full data objects into context — enables "progressive disclosure," where each tool call's result informs the next decision.
- **Structured note-taking**: agents persist notes (todo lists, state trackers) outside the context window and reload them — Anthropic's Pokémon-playing agent example tracks precise game-state tallies across thousands of steps this way.
- **Compaction**: when nearing the limit, summarize, preserving "architectural decisions, unresolved bugs, and implementation details while discarding redundant tool outputs" — the stated approach is to first maximize *recall* (don't lose anything important) then improve *precision* (trim the redundant).
- **Sub-agent architectures**: a coordinator delegates focused tasks to sub-agents, each with a clean context window; each returns a "condensed, distilled summary of its work (often 1,000–2,000 tokens)" to the coordinator rather than its full trace.

### Prompt caching — vendor mechanics, verbatim

**Anthropic** (platform.claude.com/docs, checked 2026-09-30) [S8]:
- Two modes: automatic (single top-level `cache_control`, moves forward automatically) or explicit breakpoints (per-content-block `cache_control`) for fine-grained control.
- VERBATIM code (automatic caching), source S8:
```python
client = anthropic.Anthropic()
response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=1024,
    cache_control={"type": "ephemeral"},
    system="You are an AI assistant tasked with analyzing literary works. Your goal is to provide insightful commentary on themes, characters, and writing style.",
    messages=[
        {
            "role": "user",
            "content": "Analyze the major themes in 'Pride and Prejudice'.",
        }
    ],
)
print(response.usage.model_dump_json())
```
- Caching covers the full prefix: `tools`, `system`, `messages` in that order, up to and including the `cache_control`-marked block.
- Default cache lifetime 5 minutes, refreshed for free on each hit; lifetime is measured from the *start* of the request that writes/reads it, and generation time counts against it — VERBATIM: "if a response takes 4 minutes to stream, a follow-up request that reuses the same cached prefix must start within about 1 minute of that response completing." 1-hour TTL available at extra cost.
- Pricing multipliers: 5-min write 1.25x base input; 1-hour write 2x; cache read/refresh 0.1x base input on most models, but 0.05x on Opus 5.5 and 0.025x on Fable 5.1/Mythos 5.1 (per-model exceptions in the pricing table). These stack with Batch API discounts and data-residency modifiers.
- Multi-turn automatic-caching table (VERBATIM structure, [S8]): Request 1 caches System+User(1)+Asst(1)+User(2); Request 2 reads System..User(2) from cache and writes Asst(2)+User(3); the breakpoint moves forward each turn automatically.

**OpenAI** (developers.openai.com/api/docs, checked 2026-09-30) [S9]:
- Automatic, enabled by default, no config, server-side.
- Minimum cacheable prefix: 1,024 visible input tokens (GPT-5.6+); increments of 128 tokens thereafter.
- Reuse window: cached prefix stays eligible 30 minutes after its most recent write or reuse (GPT-5.6+); earlier models default to `in_memory` (5–10 min typical) or `24h` under Zero Data Retention settings.
- Cache hit lookup: from longest to shortest prefix among configured "cache lookup boundaries"; requires the entire rendered prefix to match exactly.
- Pricing: cache reads 0.1x standard input on most models, 0.05x on "GPT-6.1 Sol"; cache writes 1.25x standard input.
- VERBATIM usage JSON shape, [S9]:
```json
{
  "usage": {
    "input_tokens": 2000,
    "input_tokens_details": {
      "cached_tokens": 1500,
      "cache_write_tokens": 500
    }
  }
}
```
- Worked cost example from the source: a prefix written once and read back nine times pays 2.15x total instead of 10x with no caching.

**Google Gemini** (ai.google.dev/gemini-api/docs, checked 2026-09-30) [S10]:
- Implicit caching: automatic, default on Gemini 2.5+ and newer, 90% discount vs. standard input, no storage fee, no control over what/how-long is cached.
- Explicit caching: manual `CachedContent` object with a TTL; 75% discount on Gemini 3-class Pro models; adds a storage meter (~$1/M tok/hour on Flash-class, ~$4.5/M tok/hour on Pro-class per third-party pricing trackers — verify current rate card before relying on this for a production budget) [S23].
- Minimum cacheable tokens: 4,096 for Gemini 3.5/3.6/3.7/3.8 Flash and 3.1 Pro Preview; 2,048 for Gemini 2.5 Flash/Pro.
- Cache-hit visibility: `usage.total_cached_tokens` in the response object.

### Context editing vs. compaction vs. memory tool — three different mechanisms [S11][S12][S18]

Anthropic explicitly distinguishes three approaches and when to reach for each (VERBATIM framing from the compaction overview, [S12]): "Compaction replaces the older turns of a conversation with a summary that Claude writes on the server... To clear old tool results or old thinking blocks by rule instead of summarizing them, see Context editing." The memory tool is a fourth, client-side mechanism for cross-*session* persistence, distinct from all three single-conversation mechanisms.

**Context editing** (beta header `context-management-2025-06-27`) [S11]:
- `clear_tool_uses_20250919`: once input tokens cross a `trigger` (default 100,000, configurable in `input_tokens` or `tool_uses`), the API clears the oldest tool-use/result pairs first, keeping the most recent `keep` (default 3) intact, and replaces cleared results with a placeholder. Optional `clear_at_least` (minimum tokens to free, so a clear is only triggered if it's "worth" invalidating the cache) and `exclude_tools` (never-clear list).
- VERBATIM advanced config example, [S11]:
```python
response = client.beta.messages.create(
    model="claude-opus-5-5",
    max_tokens=4096,
    messages=[{"role": "user", "content": "Create a simple command line calculator app using Python"}],
    tools=[
        {"type": "text_editor_20250728", "name": "str_replace_based_edit_tool", "max_characters": 10000},
        {"type": "web_search_20250305", "name": "web_search", "max_uses": 3},
    ],
    betas=["context-management-2025-06-27"],
    context_management={
        "edits": [
            {
                "type": "clear_tool_uses_20250919",
                "trigger": {"type": "input_tokens", "value": 30000},
                "keep": {"type": "tool_uses", "value": 3},
                "clear_at_least": {"type": "input_tokens", "value": 5000},
                "exclude_tools": ["web_search"],
            }
        ]
    },
)
```
- `clear_thinking_20251015`: manages extended-thinking blocks; `keep` is either `{"type": "thinking_turns", "value": N}` or `"all"`. Default varies by model class: Opus 4.5+/Sonnet 4.6+/Fable/Mythos keep all prior thinking by default; earlier Opus/Sonnet and all Haiku keep only the last turn's thinking.
- Interaction with prompt caching: tool-result clearing *invalidates* the cached prefix at the clear point (you eat a cache-write cost once, then get fresh cache hits after); thinking-block clearing invalidates the cache only when blocks are actually cleared, so choosing to keep them preserves cache hits at the cost of context space.
- Response shape reports what was applied, VERBATIM [S11]:
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

**Compaction** (two beta mechanisms) [S12][S19]:
- *On-demand* (`compact-2026-09-04`): caller decides when to summarize by sending a request; supports "compaction that keeps recent turns" (verbatim recent turns preserved, only older ones summarized), "compaction in the background" (summarization runs concurrently with continued work, swapped in when ready), and a custom summarization prompt override. Anthropic's docs state a preference: "Use on-demand compaction wherever it is available."
- *At a token threshold* (`compact_20260112`): the API itself decides, once input tokens cross a configured `trigger` (default 150,000, minimum allowed value 50,000); runs synchronously inside the request that crosses the threshold (no background option); returns `stop_reason: "compaction"` and a compaction block that replaces prior history.
- Compaction is beta, available on Opus 4.6+/Sonnet 4.6+ and Mythos Preview; on Fable 5.1/Opus 5.5/Sonnet 5.5, server-side compaction/context-management "never invalidates thinking blocks," but client-side edits to earlier turns still can — and for accounts created on/after Aug 31, 2026, replaying an invalidated thinking block is rejected unless the caller opts into dropping it [S11].

**OpenAI compaction** [S13]: `context_management` with `compact_threshold` on the Responses API (Feb 11, 2026); when the token count crosses the threshold mid-stream, the server emits a compaction output item and prunes context before continuing inference — designed explicitly to let agents "run for hours or even days." The Sept 2026 Agents API (public beta) wraps this further: OpenAI's managed Codex-style harness handles session orchestration, context compaction, and recovery without the caller managing any of it directly.

### Filesystem offloading and Memory tool [S18]

Anthropic's Memory tool is client-side: Claude issues `create`/`read`/`update`/`delete`-style tool calls against a `/memories`-style directory; the *application*, not Anthropic, executes them and picks the storage backend (disk, S3, database, anything). This is the mechanism for state that must survive across sessions — compaction and context editing only manage a *single* conversation's window. Anthropic recommends modeling memory as an ordinary filesystem: plain files (often Markdown), normal tools like `bash`/`grep` for search rather than a bespoke memory API, with indexing added only as needed for scale.

### Context awareness (token budget the model can read) [S15]

New mechanic on Claude Sonnet 5, Sonnet 4.6, Sonnet 4.5, and Haiku 4.5: the model is given its own remaining-budget numbers inline, automatically, with nothing for the developer to configure. VERBATIM injected system-prompt tag:
```xml
<budget:token_budget>200000</budget:token_budget>
```
and after each tool call:
```xml
<system_warning>Token usage: 35000/200000; 165000 remaining</system_warning>
```
Image tokens count toward this budget. Newer models (Opus 4.7+, Sonnet 5.5, Fable 5.1, Mythos 5.1, Fable 5, Mythos 5) don't receive these injected tags automatically; instead they use the separate (also-beta) "task budgets" feature for an explicit budget.

### Token counting

Anthropic has never published a public Claude tokenizer and explicitly advises against using OpenAI's `tiktoken` to estimate Claude token counts; instead use the dedicated `/v1/messages/count_tokens` endpoint (`client.messages.count_tokens(...)`) before sending a real request [S24]. OpenAI's `tiktoken` remains the correct, locally-runnable, no-network-call tokenizer for OpenAI models and matches billed counts to within 1–2 tokens once chat-overhead (role markers, separators) is accounted for [S24].

### The Ralph Wiggum technique — extreme context isolation [S17]

Geoffrey Huntley's pattern (July 2025), still referenced through 2026 as the reference "reset-every-iteration" agent loop:
```bash
while :; do cat PROMPT.md | claude-code ; done
```
Motivation: the author's practical experience puts the *usable* context ceiling around 147k–152k tokens even on nominally-200k-token models — well below the advertised limit — so conversation history is treated as a liability, not an asset. Each loop iteration starts with a fresh, empty context; all durable state lives in files and git (`@fix_plan.md` as prioritized todo, `@specs/*`, `@AGENT.md` for learned commands/procedures, plus git commits/tags for version history), and the agent re-derives what it needs to know each time by reading those files rather than by "remembering" a long conversation. This is the purest form of LangChain's "isolate" strategy, taken to its logical extreme: isolate not just sub-tasks from each other, but every iteration from every other iteration.

### Sub-agent context isolation in production [S16]

Anthropic's multi-agent researcher: an orchestrator/lead agent plans, spins up parallel sub-agents (each with its own clean context window exploring an independent thread), then reconciles their findings in a separate citation pass. Result: 90.2% improvement over single-agent Opus 4 on Anthropic's internal eval, at roughly 15x the token cost of a normal chat interaction; token usage alone accounted for 80% of the variance in performance across trajectories in their analysis. The explicit design rule that follows: multi-agent decomposition only pays for itself when the task is genuinely breadth-first / parallelizable, and the task's value clears the multiplied token cost.

## Numbers

| Metric | Value | Condition | Source |
|---|---|---|---|
| Multi-agent vs. single-agent improvement | +90.2% | Anthropic internal eval, orchestrator + Claude Sonnet 4 sub-agents vs. single Claude Opus 4 | Anthropic, reported April 2025 [S16] |
| Multi-agent token cost | ~15x | vs. a normal single chat interaction, same eval | [S16] |
| Token-usage → performance-variance | 80% explained | same Anthropic analysis | [S16] |
| Sub-agent report size | 1,000–2,000 tokens | condensed summary returned to coordinator, per Anthropic's Sept 2025 context-engineering post | [S1] |
| Cached vs. uncached Claude Sonnet cost | $0.30/MTok vs. $3/MTok (10x) | Manus's own figures, Claude Sonnet, as of the Manus blog post (exact Sonnet version/date not stated in the fetched excerpt — treat as illustrative, not current pricing) | [S5] |
| Current Anthropic cache read multiplier | 0.1x base input (0.05x Opus 5.5, 0.025x Fable/Mythos 5.1) | live pricing table, checked 2026-09-30 | [S8] |
| Anthropic cache write multiplier | 1.25x (5-min) / 2x (1-hour) base input | live pricing table, checked 2026-09-30 | [S8] |
| OpenAI cache read multiplier | 0.1x standard (0.05x on "GPT-6.1 Sol") | developers.openai.com, checked 2026-09-30 | [S9] |
| OpenAI cache write multiplier | 1.25x standard | same | [S9] |
| OpenAI write-once-read-9x total cost | 2.15x (vs. 10x uncached) | worked example in OpenAI docs | [S9] |
| Gemini implicit cache discount | 90% | Gemini 2.5+/3.x, checked 2026-09-30 | [S10] |
| Gemini explicit cache discount | 75% | Gemini 3-class Pro models | [S10] |
| Claude 1M context, per-token price (Opus 4.6) | $5 / $25 per MTok (in/out) | full 1M window, no premium, GA March 13, 2026 | [S14] |
| Claude 1M context, per-token price (Sonnet 4.6) | $3 / $15 per MTok (in/out) | same | [S14] |
| Databricks: model correctness starts falling | ~32k tokens | Llama 3.1 405B, cited by Breunig, original study not independently re-verified here | [S3] |
| Tool-count failure anecdote | 19 tools OK, 46 tools fail | quantized Llama 3.1 8B, cited by Breunig from BFCL-adjacent testing | [S3] |
| BFCL toolkit-expansion accuracy drop | 1–8% | toolkits expanded from avg. 2.7 → 5.6 functions, across evaluated LLMs | [S22] |
| Chroma LongMemEval context size | ~113k tokens | conversational-memory test, ~1/10 of a 1M window | [S2] |
| Provence context pruning | cut 95% of content | single Wikipedia-article test case, preserved relevant subset | [S7] |
| Context offloading improvement | up to 54% | vs. benchmark, "specialized agents," per Anthropic (cited via Breunig) | [S7] |
| Sharded-prompt (context clash) score drop | avg. −39%; OpenAI o3: 98.1 → 64.1 | Microsoft/Salesforce multi-turn benchmark sharding study, cited by Breunig | [S3] |
| Context editing + memory tool combined improvement | +29% (editing alone), +39% (editing + memory) | Anthropic-reported, vendor/LLMOps secondary source — **not independently verified here**, see Unverified | [S18] |
| Ralph Wiggum practical context ceiling | ~147k–152k tokens | Huntley's own experience, despite 200k advertised window | [S17] |

## Pitfalls, limits, criticism

- **Bigger context window ≠ uniform usable context.** Every vendor's marketing number (1M tokens) coexists with a much lower *effective* recall length in practice — Chroma's ~113k-token degradation point and Huntley's ~150k practical ceiling are two independent, differently-motivated data points converging on "well under half the advertised window" [S2][S17].
- **Coherent context can be worse than incoherent context.** Chroma's haystack-structure finding is genuinely counter-intuitive and under-discussed: well-organized, narratively coherent long documents degraded model performance *more* than shuffled, incoherent ones, across all 18 tested models — this cuts against the instinct to "clean up" long context for readability [S2].
- **KV-cache economics are easy to destroy by accident.** A single-token change anywhere in the prefix (a timestamp in a system prompt, non-deterministic JSON key ordering, a reordered tool list) invalidates the cache for every token after it — Manus calls this out as the single most common production mistake [S5].
- **Anthropic's own docs now recommend against DIY summarization** where server-side compaction is available, citing "less integration complexity, better token usage calculation, and no client-side limitations" — a clear vendor push toward its own managed mechanism over hand-rolled context management [S12] (source is vendor documentation; treat the comparative claim as Anthropic's own positioning, not an independent benchmark).
- **Context editing (clearing) and compaction (summarizing) are easy to conflate but behave very differently under caching**: clearing invalidates the cache at the clear point every time it fires (cache-write cost recurs); keeping thinking blocks preserves cache hits but costs context space — there's a real trade-off knob here, not a strictly-better option [S11].
- **Tool-count degradation thresholds are not a universal constant.** Breunig's "19 vs 46 tools" anecdote (single quantized 8B model) and the BFCL toolkit-expansion study's 1–8% drop (avg. 2.7→5.6 functions, larger frontier models) disagree in magnitude — the qualitative direction (more tools → worse tool selection) is well-supported; the exact cliff is model- and study-specific [S3][S22].
- **The Manus $0.30 vs $3 Sonnet pricing example is stale** relative to today's Anthropic pricing table (Sonnet 5: $2/$10 per MTok base, cache reads at 0.1x = $0.20/MTok) — the *ratio* (roughly 10x, still holds) matters more than the absolute numbers when citing this lesson [S5][S8].
- **Vendor-reported improvement numbers should be flagged as such.** The "29%/39% improvement from context editing/memory tool" figure circulating in secondary sources traces back to Anthropic's own reporting and was not independently reproduced in any source opened for this chapter — see Unverified.
- **5-minute default cache TTL is a real behavioral change some teams got surprised by.** Third-party trackers report Anthropic quietly moved the *default* TTL down from 60 to 5 minutes at some point in early 2026 for at least some workloads; Anthropic's own current docs simply present 5-min-default/1-hour-optional as the ongoing two-tier design without calling out a change — worth designing for the 5-minute default explicitly rather than assuming a longer window, and re-verifying against the live docs before shipping [S21][S8].

## What changed in the last 6 months (roughly April–September 2026)

- Anthropic 1M-token context window went from beta/premium to **GA at standard pricing** (March 13, 2026) — removes an entire class of "should I pay the long-context premium" decisions [S14].
- Anthropic's **compaction** feature shipped in two forms within the window (threshold-based Jan 12, 2026; on-demand, with a later beta-header revision Sept 4, 2026) — this is a genuinely new mechanism, distinct from the mid-2025 context-editing (clearing) feature, and the docs now explicitly rank on-demand compaction as generally preferred [S12][S19].
- OpenAI shipped an equivalent **server-side compaction** for the Responses API (Feb 11, 2026), followed by a fully-managed **Agents API** in public beta (Sept 2026) that hides context management entirely behind a managed harness — both vendors converging on "the platform manages your context, not your SDK code" [S13].
- Anthropic added **automatic prompt caching** (single top-level `cache_control`, auto-advancing breakpoint) as an alternative to manually-placed explicit breakpoints — lowers the integration bar for caching multi-turn conversations [S8].
- **Context awareness** (injected `<budget:token_budget>` / `<system_warning>` tags) is a new, automatic behavior on current Sonnet/Haiku models, giving the model itself legible information about its own remaining space — newer Opus/Sonnet 5.5-class models instead get the separate (beta) "task budgets" mechanism, so the two approaches are actively diverging across the model lineup rather than converging [S15].
- Anthropic's Memory tool and "Memory for Managed Agents" (reported April 23, 2026) moved cross-session memory from a DIY pattern into a first-party, filesystem-backed, auditable product surface [S18].

## Diagram candidates

1. **Context window anatomy stack** — actors: system prompt block, tool-definitions block, message history (alternating user/assistant/tool_result), extended-thinking block, output; arrows: all blocks flow into "input_tokens / cache_read / cache_creation" accounting; states: pre-cache vs. post-cache-hit token cost per block.
2. **Automatic prompt-cache breakpoint advancing over 3 turns** — actors: System, User(1..n), Asst(1..n); arrows: "read from cache" vs. "written to cache" per request, per the Request 1/2/3 table in [S8]; states: cache-cold, cache-warm, cache-expired (>5 min idle).
3. **Context rot curve** — chart candidate (see below), not a mechanism diagram.
4. **Four failure modes flowchart** — actors: Context, Model, Tool/Environment; arrows: poisoned-fact → repeated-reference loop; long-history → distraction (ignoring training-time knowledge); superfluous-content → confused low-quality output; conflicting-turns → clash → wrong pick — one box per failure mode with its trigger condition and its typical symptom.
5. **Just-in-time retrieval vs. preloading** — actors: Agent, Filesystem/DB, Context window; arrows: preload path (all data → context, once) vs. JIT path (lightweight reference → context; tool call → fetch on demand → discard after use); states: token cost over time for each path.
6. **Compaction on-demand vs. threshold vs. context-editing decision tree** — actors: Caller, API; arrows/decisions: "need control over timing?" → on-demand; "want it automatic and don't mind synchronous pause?" → threshold; "want rule-based clearing without summarization?" → context editing; states: resulting conversation shape after each path.
7. **Sub-agent orchestration (Anthropic multi-agent researcher)** — actors: Lead/orchestrator agent, N parallel sub-agents (each own context window), Citation pass; arrows: task decomposition → parallel dispatch → condensed summaries (1-2k tokens each) return → reconciliation with citations → final answer.
8. **KV-cache invalidation** — actors: Prompt prefix (stable) vs. Prompt prefix (one token changed); arrows: stable prefix → cache hit → cheap/fast; changed-token prefix → cache miss from that token forward → full reprocessing cost; states: before/after a non-deterministic serialization bug.
9. **Ralph Wiggum loop** — actors: Bash while-loop, Agent process (fresh context each iteration), Filesystem/git (fix_plan.md, specs/, AGENT.md); arrows: loop iteration → read state files → do one task → commit → context discarded → next iteration reads state files again; states: persistent (files/git) vs. ephemeral (context window).
10. **Context awareness token-budget injection** — actors: API, System prompt, Tool-call cycle; arrows: request start → inject `<budget:token_budget>`; after each tool call → inject `<system_warning>` with remaining tokens; state: model's internal "how much room do I have left" awareness growing more precise turn by turn.

**Chart candidates:**
1. Chroma's degradation-vs-input-length curves per model family (needs the raw report's figures — request/verify exact numeric series from research.trychroma.com/context-rot or the GitHub replication repo before charting) [S2].
2. Anthropic prompt-cache pricing table across the current model lineup (base input vs. 5m-write vs. 1h-write vs. cache-read), reproducing the verbatim pricing table in [S8] as a grouped bar chart.
3. Repeated-words-task accuracy vs. sequence length (25–10,000 words) per model, from Chroma's report — same caveat, verify exact series before charting [S2].

## Glossary

- **Context engineering**: curating and maintaining the optimal set of tokens in the context window across an agent's inference calls, not just wording a single prompt [S1].
- **Context rot**: degradation of a model's ability to accurately use information as input length grows, even for simple tasks, appearing well before the nominal context limit [S2].
- **Lost in the middle**: the empirical finding that recall over long context is U-shaped — best near the start/end, worst near the middle [S6].
- **Context poisoning / distraction / confusion / clash**: Breunig's four named ways a long-running context degrades an agent (see Mechanics table) [S3].
- **Just-in-time retrieval**: loading data into context only when needed via tool calls and lightweight references, instead of preloading it all upfront [S1].
- **Compaction**: server-side (or client-side) summarization that replaces older conversation turns with a condensed summary to stay within the context window [S12].
- **Context editing**: rule-based clearing (not summarizing) of specific content — old tool results or old thinking blocks — from conversation history [S11].
- **KV-cache**: the transformer's cached key/value tensors for already-processed tokens; reusing them for an unchanged prefix avoids recomputation, which is what prompt caching exploits [S5].
- **Prompt caching**: pricing/latency mechanism where a previously-processed prompt prefix is served from cache on a subsequent request if the prefix matches exactly, at a steep (~90%) discount on the cached portion [S8][S9][S10].
- **Sub-agent isolation**: running parts of a task in separate agent instances, each with its own clean context window, to prevent cross-task interference [S4][S16].
- **Memory tool**: Anthropic's client-side, filesystem-shaped tool interface (`/memories`) for agent state that must persist across sessions, as opposed to within-conversation context management [S18].
- **Context awareness**: a model's ability to read its own injected remaining-token-budget signal and reason about it during a session [S15].
- **Ralph Wiggum technique**: resetting the entire context window every agent-loop iteration and pushing all durable state into files/git instead [S17].
- **Task budgets**: Anthropic's beta mechanism for giving a model an explicit token budget on models that don't receive the automatic context-awareness tags [S15].

## Unverified / open questions

- Anthropic's "29% (context editing) / 39% (context editing + memory tool)" improvement figures: found only in secondary/LLMOps summaries of Anthropic material, not confirmed by directly reading an Anthropic-published page in this session. Tried: WebSearch surfaced the numbers via a ZenML LLMOps database summary; did not locate and open the underlying Anthropic primary source in the time available. Flag before citing as a headline number.
- Exact current pricing for Gemini explicit-cache storage (~$1/MTok/hr Flash, ~$4.5/MTok/hr Pro) came from a third-party pricing tracker (techjacksolutions.com), not Google's own docs page (the ai.google.dev fetch did not surface storage pricing in the extracted excerpt). Re-verify against ai.google.dev before publishing a number.
- Whether Anthropic's cache-TTL default was actually changed from 60→5 minutes at some point in 2026, versus 5-minute-default having been the standing design all along with 1-hour always being the paid upgrade: current live docs ([S8]) describe 5-min-default/1-hour-optional without framing it as a change; the "TTL was cut" claim comes only from third-party blog posts (dev.to, tensormesh.ai) not from an Anthropic changelog entry opened directly.
- Precise numeric degradation curves from the Chroma report (the actual accuracy-vs-token-length series per model) were described qualitatively via WebFetch summary, not read as raw figure/data from the report or its GitHub replication repo (chroma-core/context-rot) — needed before turning finding #1 in "chart candidates" into an actual chart.
- Did not independently verify the Databricks "~32k token" Llama 3.1 405B correctness-drop study or the original BFCL "19 vs 46 tools" testing methodology beyond Breunig's citation of them — both are one level removed from primary data in these notes.
- OpenAI's exact current (Sept 2026) flagship-model names/pricing for context caching beyond the "GPT-5.6+" / "GPT-6.1 Sol" labels surfaced in search were not cross-checked against OpenAI's own live pricing page in this session (only the compaction/caching guide pages were fetched); model naming in this fast-moving space should be re-verified at time of writing the chapter.
- Cross-links: tool-count degradation and tool-definition design (BFCL findings, "manage tool context," tool search tool) belong more to chapter 03 (Tool design) — kept here only insofar as it explains a context-engineering failure mode. Sub-agent orchestration mechanics (how Claude Code/Task-tool subagents are actually invoked) belong to chapters 12 (Deep agents) and 13 (Multi-agent); kept here only for the context-isolation angle. Memory tool's cross-session semantics belong more fully to chapter 11 (Agent memory).

## Sources

- [S1] "Effective context engineering for AI agents," Anthropic Engineering (Prithvi Rajasekaran, Ethan Dixon, Carly Ryan, Jeremy Hadfield), Sept 29, 2025. https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents — accessed 2026-09-30.
- [S2] "Context Rot: How Increasing Input Tokens Impacts LLM Performance," Chroma Technical Report (Kelly Hong, Anton Troynikov, Jeff Huber), July 14, 2025. https://www.trychroma.com/research/context-rot (canonical short link: https://research.trychroma.com/context-rot) — accessed 2026-09-30.
- [S3] "How Contexts Fail (and How to Fix Them)" / "How Long Contexts Fail," Drew Breunig, dbreunig.com, June 22, 2025. https://www.dbreunig.com/2025/06/22/how-contexts-fail-and-how-to-fix-them.html — accessed 2026-09-30.
- [S4] "Context Engineering for Agents," LangChain Blog. https://www.langchain.com/blog/context-engineering-for-agents — accessed 2026-09-30.
- [S5] "Context Engineering for AI Agents: Lessons from Building Manus," Manus / Peak Ji. https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus — accessed 2026-09-30 (fetch resolved via this URL; original Manus blog, 2025).
- [S6] "Lost in the Middle: How Language Models Use Long Contexts," Liu et al., 2023 (Stanford/Samaya AI); follow-up: RULER (Hsieh et al., 2024) and "Lost in the Middle: An Emergent Property from Information Retrieval Demands in LLMs" (2026), per WebSearch summaries — accessed 2026-09-30, not independently opened as PDFs.
- [S7] "How to Fix Your Context," Drew Breunig, dbreunig.com, June 26, 2025. https://www.dbreunig.com/2025/06/26/how-to-fix-your-context.html — accessed 2026-09-30.
- [S8] "Prompt caching," Claude Platform Docs. https://platform.claude.com/docs/en/build-with-claude/prompt-caching — accessed 2026-09-30 (live page, current model/pricing table).
- [S9] "Prompt Caching," OpenAI Developers docs. https://developers.openai.com/api/docs/guides/prompt-caching — accessed 2026-09-30.
- [S10] "Context caching," Gemini API docs, Google. https://ai.google.dev/gemini-api/docs/caching — accessed 2026-09-30.
- [S11] "Context editing," Claude Platform Docs. https://platform.claude.com/docs/en/build-with-claude/context-editing — accessed 2026-09-30 (raw HTML fetched via curl).
- [S12] "Compaction overview," Claude Platform Docs. https://platform.claude.com/docs/en/build-with-claude/compaction — accessed 2026-09-30 (raw HTML fetched via curl).
- [S13] "Compaction," OpenAI Developers docs, and secondary reporting (GitHub issues on vercel/ai and mastra-ai; VentureBeat Sept 2026 coverage of the Agents API). https://developers.openai.com/api/docs/guides/compaction — accessed 2026-09-30.
- [S14] "1M context is now generally available for Opus 4.6 and Sonnet 4.6," Claude blog, March 13, 2026. https://claude.com/blog/1m-context-ga — accessed 2026-09-30.
- [S15] "Context windows," Claude Platform Docs. https://platform.claude.com/docs/en/build-with-claude/context-windows — accessed 2026-09-30.
- [S16] "How we built our multi-agent research system," Anthropic Engineering, April 2025, and secondary summaries (Codingscape, theaiengineer.substack.com). https://www.anthropic.com/engineering/multi-agent-research-system — accessed via WebSearch summaries 2026-09-30 (not directly fetched with WebFetch in this session).
- [S17] "Ralph Wiggum as a 'software engineer'," Geoffrey Huntley, ghuntley.com, July 14, 2025. https://ghuntley.com/ralph/ — accessed 2026-09-30.
- [S18] Anthropic Memory tool documentation and secondary summaries (supermemory.ai docs, leoniemonigatti.com, ZenML LLMOps database, usewire.io on "Memory for Managed Agents," reported April 23, 2026). Primary doc: https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool — accessed via WebSearch summaries 2026-09-30 (not directly fetched with WebFetch in this session; treat 29%/39% figures as unverified, see Unverified section).
- [S19] "Compaction at a token threshold," Claude Platform Docs. https://platform.claude.com/docs/en/build-with-claude/compaction-threshold — accessed 2026-09-30 (via WebSearch summary).
- [S20] Secondary summaries of Claude Code auto-compact behavior: claudelog.com, taku.ai, howaiworks.ai, cometapi.com — accessed via WebSearch 2026-09-30 (no single canonical Anthropic doc page opened directly for this specific behavior; cross-check against code.claude.com/docs before publishing exact percentages).
- [S21] Third-party reporting on Anthropic cache-TTL default change: dev.to/whoffagents ("Claude Prompt Caching in 2026: The 5-Minute TTL Change"), tensormesh.ai — accessed via WebSearch 2026-09-30; unconfirmed against an Anthropic changelog.
- [S22] "On the Robustness of Agentic Function Calling," arXiv, via alphaxiv.org summary — accessed via WebSearch 2026-09-30.
- [S23] Gemini explicit-cache storage pricing, techjacksolutions.com — accessed via WebSearch 2026-09-30, not cross-checked against ai.google.dev.
- [S24] Anthropic token-counting guidance (`/v1/messages/count_tokens`) and OpenAI `tiktoken` guidance, per theneuralbase.com, markaicode.com summaries — accessed via WebSearch 2026-09-30.
