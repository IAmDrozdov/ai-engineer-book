# 04. Промптинг и оптимизация промптов — primary-sources notes

Scope reminder: this chapter owns prompt engineering as an engineering discipline for agentic apps —
system-prompt anatomy, instruction altitude, structure (XML/Markdown), few-shot, CoT vs native
reasoning, model-specific 2026 guidance, prompts-as-code, automatic optimization (OpenAI optimizer,
Anthropic Console tools, DSPy, GEPA, TextGrad), tool-description optimization, leaked/published
system prompts, caching-driven layout constraints, failure modes and debugging. Context engineering
(memory, compaction internals) belongs to ch.02; tool JSON-schema design belongs to ch.03 — this
chapter only touches tool descriptions as a target *of* prompt optimization. MCP-specific prompting
belongs to ch.05. Multi-agent orchestration prompts belong to ch.13. Evals-as-a-discipline (harnesses,
grading methodology) belongs to ch.17 — this chapter only covers evals as the optimization *loop*.

## TL;DR (what an engineer must know today, 2026-09-30)

- Anthropic's current model family for prompting purposes is no longer just Opus/Sonnet/Haiku: as of
  Sept 2026 the docs list **Claude Fable 5.1 / Claude Mythos 5.1** (latest), **Claude Fable 5 / Claude
  Mythos 5**, **Claude Opus 5.5 / Opus 5**, **Claude Sonnet 5.5 / Sonnet 5**, alongside legacy
  Opus/Sonnet 4.x and Haiku 4.5 [S1]. Anthropic ships a **per-model prompting-migration page** for every
  release, listing exactly what changed behaviorally from the previous model — this is now the primary
  artifact to read before touching a prompt after a model bump [S1][S2].
- The single biggest cross-vendor theme of 2026: models got **more literal at following instructions**,
  so old-style over-emphasis (ALL CAPS, "MUST", "CRITICAL", stacked negatives) now **overtriggers**
  instead of being safely ignored. Anthropic's own docs tell you to dial it back: replace `"CRITICAL:
  You MUST use this tool when..."` with `"Use this tool when..."` [S1].
- OpenAI names the same failure mode for GPT-5.1/5.2: contradictory or vague instructions are "more
  damaging" to reasoning models "than to other models, as it expends reasoning tokens searching for a
  way to reconcile the contradictions" [S5].
- **"Right altitude"** (Anthropic's term, from the Sept 2025 context-engineering post, still the
  reference cited in 2026 guides) — a system prompt must be specific enough to constrain behavior but
  not so prescriptive it hardcodes `if X then Y` branches; that's the Goldilocks zone [S13].
- Extended thinking with a manual `budget_tokens` is **deprecated on Claude Opus/Sonnet 4.6** and
  **returns a 400 error on Claude 4.7 and later** — the replacement is `thinking: {type: "adaptive"}`
  plus the `effort` parameter (`low/medium/high/xhigh/max`) [S1].
- **Prefilled assistant responses are gone** starting with Claude 4.6 models and Claude Mythos Preview
  — a prefill on the last turn now returns a 400. Anthropic's docs give explicit migration paths for
  each historic prefill use case (forcing JSON → Structured Outputs; eliminating preambles → direct
  instruction; continuations → move to user message) [S1].
- **Thinking blocks must be replayed byte-identical** and conversation history must be append-only on
  newer models (Fable 5.1, Opus 5.5, Sonnet 5.5): editing earlier turns invalidates every later thinking
  block and can return a 400 [S1][S2].
- GPT-5.1 added a `none` reasoning-effort mode (distinct from GPT-5's `minimal`) that fully disables
  reasoning tokens while still allowing hosted tools; GPT-5.2's *default* reasoning effort is `none`
  [S3][S4]; by GPT-6-era models the effort enum is `none/low/medium/high/xhigh/max`, but `none` isn't
  supported on every variant [S8].
- Reasoning-model prompting is still "don't ask it to think step by step" — OpenAI's o-series guidance
  (simpler prompts, no explicit CoT scaffolding) generalizes to GPT-5.x/6.x: the model already reasons
  internally; forcing manual CoT format wastes tokens or actively hurts [general knowledge, cross-
  checked against S3/S5 tone].
- Gemini 3 flips this again: it wants **less** verbose prompt engineering than Gemini 2.5 needed, use a
  `thinking_level` (`minimal/low/medium/high`) instead of chain-of-thought scaffolding or the old
  `thinking_budget`, and — unusually — explicitly warns against lowering temperature below 1.0 on
  reasoning tasks ("may lead to unexpected behavior, such as looping") [S10].
- Automatic prompt optimization has **two live vendor tools** in 2026: OpenAI's dataset+grader-backed
  Prompt Optimizer (built on the Evals platform, which OpenAI is **sunsetting**: read-only Oct 31 2026,
  shut down Nov 30 2026 [S7]) and Anthropic's Console **Prompt Generator** (blank-page → draft) and
  **Prompt Improver** (existing prompt → CoT-added, XML-standardized, example-enriched rewrite) [S12].
- Research-grade optimizers have moved past pure Bayesian search: **GEPA** (genetic-Pareto, reflective
  natural-language optimization) beats **MIPROv2** by >10% and beats GRPO reinforcement learning by 6%
  average / 20% max while using **up to 35× fewer rollouts** — accepted ICLR 2026 Oral [S14]. It ships
  as a DSPy optimizer and as a standalone pip package usable on any text artifact, not just prompts
  (code, agent architecture, vector graphics) [S14][S15].
- Prompt caching layout is now a hard structural constraint, not a nice-to-have: Anthropic's format is
  `tools → system → messages` cache-prefix ordering, breakpoints must sit on the **last stable block**,
  and there's a **20-block backward lookback window** for automatic cache-hit matching [S11]. OpenAI's
  GPT-5.6+ caching is mostly automatic (breakpoint auto-placed at the end of the latest eligible
  message) with a 1,024-token minimum and a 30-minute reuse window [S9].
- "Studying leaked system prompts" is now a maintained open-source practice, not a one-off: the
  `asgeirtj/system_prompts_leaks` repo tracks Claude, GPT, Gemini, Grok, Cursor, and others with
  near-daily updates and ~68.7k GitHub stars as of Sept 2026 [S19]; a dedicated repo
  (`Piebald-AI/claude-code-system-prompts`) extracts Claude Code's full prompt architecture (500+
  files: main loop, 27 tool descriptions, sub-agent prompts, utility prompts) straight from the
  compiled CLI source, updated within minutes of every release [S20].

## Current state and versions (as of 2026-09-30)

**Anthropic** — current prompting-relevant model line and per-model guide URLs [S1]:

| Model | What changed vs. predecessor (from Anthropic's own diff table) |
|---|---|
| Claude Fable 5.1 / Mythos 5.1 | effort levels, finishing long tasks, user-facing progress updates, passing thinking blocks back unchanged, tool-call batching in agent loops, search triggering at low effort, formatting, writing density |
| Claude Fable 5 / Mythos 5 | vs. Opus 4.8: effort levels, instruction following, long-run progress claims, memory systems, `reasoning_extraction` refusal category |
| Claude Sonnet 5.5 | effort calibration, initiative/scope, running without up-front thinking, JSON output on reasoning tasks, progress updates, tool use in chat, mid-turn user messages, verification on coding, tool-call handling, complex visual inputs, safeguard refusals |
| Claude Sonnet 5 | response length, effort/thinking-depth calibration, tool-use triggering, literal instruction following, design/frontend defaults |
| Claude Opus 5.5 | effort calibration, prompts written for thinking disabled, progress updates, safeguard false positives, tools for complex visual inputs |
| Claude Opus 5 | response length/verbosity, progress updates, deliverable length, task scope/over-verification, subagent control, self-correction |
| Claude Opus 4.8 | response length, effort/thinking-depth calibration, tool-use triggering, literal instruction following, subagent control, design/frontend defaults |

Note on naming: "Fable" and "Mythos" are Anthropic's 2026-era model-family names appearing alongside
the historic Opus/Sonnet/Haiku line in the live docs — treat this as the current state, cross-check
against `platform.claude.com/docs/en/models/overview` before publishing since names are clearly still
evolving fast [S1].

**OpenAI** — GPT-5 → GPT-5.1 → GPT-5.2 prompting guides are all live cookbook pages [S3][S4][S5];
reasoning-effort enum has grown to `none/low/medium/high/xhigh/max` in later model families, though
`none` support is model-dependent (GPT-6 Astra/6.1 Sol do **not** support `none`; GPT-6/6 Luna do)
[S8]. GPT-5.2's *default* reasoning effort is `none` (vs. GPT-5's `medium`) [S4][S8] — a real behavior
default flip, not just a new option.

**Google** — Gemini 3 is current; prompting guidance emphasizes conciseness over the older PTCF-heavy,
verbose style; `thinking_level` replaces `thinking_budget` [S10].

**Optimization tooling** — OpenAI's Prompt Optimizer is being deprecated alongside the whole Evals
platform (read-only 2026-10-31, shutdown 2026-11-30) [S7] — a major discontinuity to flag for readers:
whatever replaces it (unclear from these sources) is worth a follow-up check closer to publication.
DSPy's optimizer menu as of 2026 includes GEPA as a first-class option next to MIPROv2/SIMBA [S16].

## Timeline (dated)

- **2024-06-11** — TextGrad preprint posted to arXiv (2406.07496): "automatic differentiation via
  text," PyTorch-style API for optimizing prompts/code/molecules via LLM-generated textual gradients
  [TextGrad arXiv].
- **2024-11-15** — Anthropic ships Prompt Improver in the Console (CoT injection, XML example
  standardization) [S12, cross-referenced via search].
- **2025-07-25** — GEPA paper v1 posted to arXiv [S14].
- **2025-09-29** — Anthropic publishes "Effective context engineering for AI agents," which coins/
  popularizes "right altitude" as the framing for system-prompt specificity [S13].
- **2026 (date unclear from these sources, before Sept)** — GPT-5 prompting guide ships with the
  `verbosity` API parameter and `minimal` reasoning effort, explicitly citing Cursor's use of a
  low-global/high-for-code-output verbosity split as a real production pattern [S5].
- **2026 (undated, after GPT-5)** — GPT-5.1 ships; adds `none` reasoning-effort mode, named
  `apply_patch` and `shell` tool types (35% reduction in apply_patch failure rate cited for the named
  tool vs. free-text patches), persona/tone steering guidance ("respect through momentum") [S3].
- **2026 (undated, after GPT-5.1)** — GPT-5.2 ships: default reasoning effort flips to `none`, "more
  deliberate scaffolding," lower default verbosity, "conservative grounding bias" toward explicit
  reasoning over speculative answers [S4].
- **2026-02-14** — GEPA paper v2 posted (revision) [S14, citation_online_date].
- **2026-03-31** — Anthropic accidentally publishes Claude Code's full unobfuscated TypeScript source
  (512,000 lines) inside an npm package with a stray `.map` file, making the entire harness prompt
  architecture public [S19/search finding — treat as reported, not independently verified by me].
- **2026 ICLR** — GEPA accepted as an **Oral** presentation [S14].
- **2026-06-09** — Anthropic launches Claude Fable 5; within 24 hours a 1,585-line / 120,000-character
  system-prompt reconstruction appears on GitHub [S19/search finding].
- **2026-08-01, 08-18, 08-21, 08-25, 08-31** — a cluster of Anthropic API beta headers ship around
  thinking-block binding and turn-scoped system messages: `thinking-display-updates-2026-08-18`,
  `mid-conversation-system-clear-at-2026-08-21`, `thinking-binding-controls-2026-08-01`; new accounts
  created on/after **2026-08-31** get strict thinking-block/prefix binding enforcement [S2].
- **2026-09-30 (today)** — chapter research cutoff.

## Mechanics

### 1. Anatomy of an agent system prompt and "altitude"

Anthropic's framing (from the context-engineering post, still the reference in 2026): two failure
modes bracket the right altitude — hardcoded brittle `if X then Y` logic on one end, vague
underspecified guidance on the other [S13]. Practical heuristic given in that source: if you catch
yourself writing "if the user asks X, do Y; if Z, do W" in a system prompt, that's a signal of
over-specification (paraphrase of the guidance, not a direct quote — the search-derived summary did
not preserve the exact sentence, flagged here since I could not re-verify the literal wording against
the primary HTML render).

Anthropic's own structural building blocks for a production system prompt (verbatim technique names
from the current best-practices doc) [S1]:
- **Give Claude a role** — even one sentence changes tone/focus; shown with full SDK examples across
  7 languages in the docs (curl/CLI/Python/TS/C#/Go/Java/PHP/Ruby).
- **Structure with XML tags** — `<instructions>`, `<context>`, `<input>`, `<example>`/`<examples>`,
  `<document>`/`<document_content>`/`<source>` nested for multi-document inputs.
- **Long-context placement** — put long documents **before** the query/instructions; Anthropic cites
  up to **30% quality improvement** in tests from this ordering, "especially with complex,
  multidocument inputs" [S1].
- **Ground in quotes** — ask the model to extract `<quotes>` from long documents before answering, so
  it anchors on cited text rather than drifting.

VERBATIM [S1] — multidocument XML pattern:
```xml
<documents>
  <document index="1">
    <source>annual_report_2023.pdf</source>
    <document_content>
      {{ANNUAL_REPORT}}
    </document_content>
  </document>
  <document index="2">
    <source>competitor_analysis_q2.xlsx</source>
    <document_content>
      {{COMPETITOR_ANALYSIS}}
    </document_content>
  </document>
</documents>

Analyze the annual report and competitor analysis. Identify strategic advantages and recommend Q3 focus areas.
```

### 2. Instructions vs. examples

Anthropic: few-shot ("multishot") examples remain "one of the most reliable ways to steer Claude's
output format, tone, and structure" [S1]. Guidance: 3–5 examples, wrapped in `<example>`/`<examples>`
tags, each **relevant** (mirrors real use case), **diverse** (covers edge cases, varies enough to
avoid unintended pattern-matching), **structured** (tagged so the model can tell instruction from
example) [S1]. You can ask the model to critique your own examples for relevance/diversity, or
generate more from a seed set [S1].

Anthropic's own context-engineering post (2025-09-29, still current framing) calls examples "the
'pictures' worth a thousand words" and explicitly warns against stuffing prompts with exhaustive edge
cases — curate a few canonical, diverse examples instead [S13].

### 3. "Do X" vs "don't do Y" — the positive-instruction rule

Consistent across both vendors in 2026:
- Anthropic: "Tell Claude what to do instead of what not to do." Example: replace `"Do not use
  markdown in your response"` with `"Your response should be composed of smoothly flowing prose
  paragraphs."` [S1]
- Justification-attached instructions outperform bare commands: `"NEVER use ellipses"` vs. `"Your
  response will be read aloud by a text-to-speech engine, so never use ellipses since the
  text-to-speech engine will not know how to pronounce them."` — "Claude is smart enough to generalize
  from the explanation" [S1].

### 4. Over-triggering: the CAPS/MUST regression

This is the chapter's headline 2026 finding, documented directly by Anthropic [S1]:

> "Claude Opus 4.5 and Claude Opus 4.6 are also more responsive to the system prompt than previous
> models. If your prompts were designed to reduce undertriggering on tools or skills, these models may
> now overtrigger. The fix is to dial back any aggressive language. Where you might have said
> 'CRITICAL: You MUST use this tool when...', you can use more normal prompting like 'Use this tool
> when...'." [S1, VERBATIM]

Same pattern for exploration/thoroughness prompting on Opus 4.6: "Tools that undertriggered in
previous models are likely to trigger appropriately now. Instructions like 'If in doubt, use [tool]'
will cause overtriggering." [S1, VERBATIM] And for subagent spawning: Opus 4.6 "has a strong
predilection for subagents and may spawn them in situations where a simpler, direct approach would
suffice," e.g. spawning a subagent when a direct grep would be faster [S1].

OpenAI's parallel finding for GPT-5.1: "GPT-5.1 is excellent at instruction-following, and you should
be able to shape the behavior significantly by checking for conflicting instructions and being clear"
[S3] — the corollary danger, per the original GPT-5 guide, is that "poorly-constructed prompts
containing contradictory or vague instructions can be more damaging to GPT-5 than to other models, as
it expends reasoning tokens searching for a way to reconcile the contradictions" [S5, VERBATIM].
Composed example of a contradiction from that guide: a system prompt saying *"Never schedule an
appointment without explicit patient consent"* elsewhere contradicted by *"auto-assign the earliest
same-day slot without contacting the patient as the first action"* [S5].

### 5. Chain-of-thought vs. native/adaptive reasoning

- **Older-style manual CoT** ("think step by step", `<thinking>`/`<answer>` tags) is now explicitly a
  **fallback**, not the default technique, on both Anthropic and OpenAI reasoning-capable models.
- Anthropic: "Prefer general instructions over prescriptive steps. A prompt like 'think thoroughly'
  often produces better reasoning than a hand-written step-by-step plan. Claude's reasoning frequently
  exceeds what a human would prescribe." [S1, VERBATIM] Few-shot examples can still carry `<thinking>`
  tags to show a reasoning *pattern*, which the model generalizes into its own extended-thinking
  blocks [S1].
- Anthropic adaptive thinking (`thinking: {type: "adaptive"}`) replaces manual `budget_tokens`-based
  extended thinking on Claude 4.6+/Mythos Preview; thinking depth is controlled by the `effort`
  parameter plus query complexity, not a token budget [S1]. On Fable 5.1/Mythos 5.1/Fable 5/Mythos
  5/Opus 5.5, **thinking is always on** — there is no way to disable it via the `thinking` param [S1].
- On Claude Opus 5 specifically, with thinking *disabled*, the model "can occasionally emit internal
  XML tags into its visible output" — Anthropic recommends keeping thinking enabled at low effort
  instead of using manual CoT tags there [S1].
- Self-check instructions ("verify your answer against [test criteria]") reliably catch errors,
  *except* on Opus 5, which already self-verifies — adding the instruction there causes
  over-verification (wasted tokens/latency); Anthropic's advice is to **remove**, not rewrite, such
  legacy instructions for Opus 5 [S1].
- OpenAI reasoning models (o-series lineage, generalized forward): don't instruct "think step by
  step" or ask the model to "explain its reasoning" explicitly — it already does this internally;
  over-prompting reasoning models with legacy CoT scaffolding measurably *hurts* o1-mini-class models
  [general cross-vendor finding, sourced from search-layer synthesis rather than a single fetched
  primary page — flagged under Unverified for exact number/study].
- **Gemini 3 explicitly reverses the CoT-scaffolding advice**: "Gemini 3 responds best to direct,
  clear instructions" and "may over-analyze verbose or overly complex prompt engineering techniques
  used for older models" [S10]. Migration guidance: replace complex CoT prompts with
  `thinking_level: "high"` plus simplified instructions [S10].

### 6. Model-specific guidance details (2026 current)

**GPT-5.1** [S3]:
- Reasoning effort `none` (new, vs. GPT-5's `minimal`) fully disables reasoning tokens, still allows
  hosted tools (web search, file search).
- `verbosity` parameter remains, separate control from reasoning effort.
- Migration checklist from GPT-5: (1) emphasize persistence/completeness explicitly — "GPT-5.1 can
  sometimes err on the side of being excessively concise"; (2) be explicit about desired output
  detail; (3) migrate `apply_patch` to the new **named tool type** (`{"type": "apply_patch"}`),
  measured **35% reduction in apply_patch failure rate**; (4) check for conflicting instructions given
  improved instruction-following.
- Preamble/user-update cadence guidance for agentic coding: short updates (1–2 sentences) every "few
  tool calls," **at least every 6 execution steps or 8 tool calls**; each update must state "at least
  one concrete outcome since the prior update (e.g., 'found X', 'confirmed Y'), not just next steps"
  [S3, VERBATIM pattern].
- Planning tool pattern: 2–5 milestone todos, exactly one `in_progress` at a time, zero
  `in_progress`/`pending` at end of turn.

VERBATIM [S3] — `update_plan` tool call:
```json
{
  "name": "update_plan",
  "arguments": {
    "merge": true,
    "todos": [
      {"content": "Investigate failing test", "status": "in_progress", "id": "step-1"},
      {"content": "Apply fix and re-run tests", "status": "pending", "id": "step-2"}
    ]
  }
}
```

VERBATIM [S3] — `apply_patch` call/response shape:
```json
{
  "type": "apply_patch_call",
  "operation": {
    "type": "update_file",
    "diff": "@@\n-def fib(n):\n+def fibonacci(n):",
    "path": "lib/fib.py"
  }
}
```
```json
{"type": "apply_patch_call_output", "call_id": "...", "status": "completed", "output": "..."}
```

**GPT-5.2** [S4]: default `reasoning_effort` is `none` (down from GPT-5's `medium`); "more deliberate
scaffolding," lower default verbosity, "conservative grounding bias" (prefers explicit reasoning/
asking over speculative answers). Verbosity default composed guidance quoted from the guide: "Default:
3–6 sentences or ≤5 bullets for typical answers," avoid "long narrative paragraphs; prefer compact
bullets and short sections" [S4]. Scope-discipline instruction pattern: "Implement EXACTLY and ONLY
what the user requests. No extra features, no added components, no UX embellishments." [S4,
VERBATIM].

**GPT-5.1-Codex-Max** (coding-agent variant) [S6]: autonomy-first framing ("You are autonomous senior
engineer: once the user gives a direction, proactively gather context, plan, implement, test, and
refine without waiting for additional prompts at each step"); prefer dedicated tools (`apply_patch`,
`rg`, `read_file`) over raw shell; **compaction via `/compact`** returns `encrypted_content` that the
client must resend on subsequent turns to preserve reasoning state across "multi-hour" agent runs.

**Claude Fable 5.1** — the richest single model-specific page fetched [S2], because it is Anthropic's
current flagship and most of its guidance is genuinely new mechanics, not just tone advice:
- *Effort sweep required per model bump*: "effort level names don't correspond to the same amount of
  thinking across models" — re-run your eval sweep across `low/medium/high/xhigh/max` even if you
  already tuned it for Fable 5 [S2, VERBATIM].
- *Progress-update thinking blocks are opt-in*: they arrive as `thinking` blocks with
  `display: "omitted"` by default — **empty** unless you set `display: "updates"` (beta header
  `thinking-display-updates-2026-08-18`) or `"summarized"` [S2].
- *Turn-scoped system messages* (beta) let you inject an ephemeral, `clear_at: "next_user_message"`
  nudge without violating append-only history — used for the parallel-tool-call batching nudge in
  agent loops [S2].
- *Append-only history is now enforced, not just recommended*: for accounts created on/after
  **2026-08-31**, replaying a thinking block after its prefix (system/tools/earlier messages) changed
  returns a **400**, unless you opt into `thinking.block_binding.prefix_mismatch_behavior: "drop_block"`
  (beta header `thinking-binding-controls-2026-08-01`) [S2].
- *Mannered prose* is Fable 5.1's named failure mode for overwritten style — Anthropic ships a full
  composed counter-instruction defining the anti-pattern by example ("a dial worth turning" vs. "a
  parameter worth varying") [S2, VERBATIM instruction reproduced below].
- *Formatting reversal*: Fable 5.1 under-formats (fewer bullets/headers/bold) vs. earlier models that
  over-formatted — old "no markdown" system-prompt lines should be removed or replaced with
  conditional formatting rules [S2].
- *Autonomy pattern for long tasks* ("Finish the whole task") — two-part composed instruction block:
  first tells the model the user "is not watching in real time," to stop asking permission for
  reversible actions already requested, and to treat its own last paragraph as a signal to keep
  working rather than stop; second defines the user's original request as the fixed scope of the
  deliverable, forbidding silent narrowing/widening [S2, VERBATIM — full text below].
- *Test/scope discipline*: an explicit instruction measurably cuts unrequested fixes and excess
  committed test files "with no measurable change in task success" [S2].
- *Safeguard false-positive triggers*: compile-check phrasing ("Does this program compile?"), lesser-
  known languages without doc context, and base64 in tool output all raise refusal rates; Anthropic's
  fix for the first is literally to rephrase the question ("Are there any bugs?") [S2].

VERBATIM [S2] — "mannered prose" counter-instruction:
```text
Mannered prose substitutes metaphor and flourish for direct statement. Instead of "a parameter worth
varying," the mannered writer produces "a dial worth turning." Instead of "this point still matters,"
they write "this point earns its keep." The phrases exist to display the writer, not to convey the
idea, and readers can tell. That is why mannered prose irritates: it makes the reader work harder so
the writer can perform. It is also imprecise. Metaphors drag in connotations the writer did not choose
and cannot control. The fix is to say what you mean. When a literal phrase is available, use it.
```

VERBATIM [S2] — autonomy/"finish the whole task" instruction (part 1 of 2):
```text
You are operating autonomously. The user is not watching in real time and cannot answer questions
mid-task, so asking 'Want me to…?' or 'Shall I…?' will block the work. For reversible actions that
follow from the original request, proceed without asking. Stop only for destructive actions or
genuine scope changes the user must decide. Offering follow-ups after the task is done is fine; asking
permission before doing the work is not.

Exception: when the user is describing a problem, asking a question, or thinking out loud rather than
requesting a change, the deliverable is your assessment. Report your findings and stop. Don't apply a
fix until they ask for one.

Before ending your turn, check your last paragraph. If it is a plan, an analysis, a question, a list
of next steps, or a promise about work you have not done ('I'll…', 'let me know when…'), do that work
now with tool calls. [...] Do not stop because the context or session is long. End your turn only when
the task is complete or you are blocked on input only the user can provide.
```
(truncated for length; full text runs one paragraph longer in the source, including a check-before-
destructive-command clause — see S2 for the complete block)

### 7. Prompts as code

- **Versioning**: no single official "prompt version control" spec surfaced in this pass — but the
  Anthropic docs implicitly treat per-model prompt migration guides as the versioning unit: every
  model release ships a diff-style "what changed" page against its predecessor [S1]. Cross-link: this
  chapter should point to ch.17 (evals) for regression-suite mechanics rather than duplicate them.
- **Compaction-aware prompting**: composed instruction pattern from Anthropic for long agentic tasks
  running under context compaction [S1, VERBATIM]:
```text
Your context window will be automatically compacted as it approaches its limit, allowing you to
continue working indefinitely from where you left off. Therefore, do not stop tasks early due to
token budget concerns. As you approach your token budget limit, save your current progress and state
to memory before the context window refreshes. Always be as persistent and autonomous as possible and
complete tasks fully, even if the end of your budget is approaching. Never artificially stop any task
early regardless of the context remaining.
```
- **State-tracking-as-code pattern** (Anthropic): keep `tests.json` (structured) and `progress.txt`
  (freeform) files as the interface between context windows; use git as the durable state/checkpoint
  log; explicitly forbid deleting/editing tests as a shortcut [S1].

VERBATIM [S1] — `tests.json` state file:
```json
{
  "tests": [
    { "id": 1, "name": "authentication_flow", "status": "passing" },
    { "id": 2, "name": "user_management", "status": "failing" },
    { "id": 3, "name": "api_endpoints", "status": "not_started" }
  ],
  "total": 200,
  "passing": 150,
  "failing": 25,
  "not_started": 25
}
```

### 8. Automatic prompt optimization

**OpenAI Prompt Optimizer** [S7]:
- Dashboard chat interface: paste a prompt, it rewrites per current best practices; pairs with
  **datasets** for closed-loop optimization.
- Requires a dataset with **≥3 rows** of prompt+response data, each row needing **≥1 grader result or
  human annotation**.
- Signal types it consumes: Good/Bad annotations + free-text `output_feedback` critiques + grader
  results (Python graders and LLM-graders supported in bulk).
- Explicit recommendation: "build narrowly-defined graders for each of the desired output properties
  where you see your prompt failing" [S7, VERBATIM].
- **Deprecation**: Evals platform (which the optimizer is built on) goes read-only 2026-10-31, shuts
  down 2026-11-30 [S7] — flag this prominently, the tool described here may not exist by the time the
  book ships.
- Explicit limitation: "it's possible for the optimized prompt to perform worse than your original on
  specific inputs" — manual review before production required [S7, VERBATIM].

**Anthropic Console tools** [S12]:
- **Prompt Generator**: solves the "blank page problem" — generates a first-draft prompt template
  following Anthropic's own best practices, meant as a starting point for iteration.
- **Prompt Improver**: takes an existing (possibly cross-vendor) prompt and rewrites it using: (1)
  chain-of-thought section injection, (2) example standardization into consistent XML, (3) example
  enrichment with reasoning aligned to the new structure, (4) general clarity/grammar cleanup.
  Available to all Console users.

**DSPy** [S16][S17][S18] — the dominant open-source "prompts as compiled artifacts" framework:
- **Signature** = declarative input/output spec, not a hand-written prompt. Inline: `"question ->
  answer"`, `"context: list[str], question: str -> answer: str"`. Class-based for complex tasks:
```python
class ExampleSignature(dspy.Signature):
    """Docstring clarifying the task."""
    input_field: str = dspy.InputField(desc="hints about input")
    output_field: str = dspy.OutputField(desc="constraints on output")
```
  (COMPOSED-shaped example matching S18's documented pattern; field names and `desc=` usage are
  VERBATIM to the doc's own illustration.)
- **Optimizer menu** [S16], selection heuristic given directly in the docs:
  - ~10 examples → `BootstrapFewShot`
  - 50+ examples → `BootstrapFewShotWithRandomSearch`
  - Zero-shot instruction optimization → `MIPROv2` configured for 0-shot
  - 40+ trials / 200+ examples → `MIPROv2` full run
  - Efficiency priority → `BootstrapFinetune` (distills prompts into weight updates on a smaller
    model)
  - `COPRO` — coordinate-ascent instruction refinement per step
  - `SIMBA` — stochastic mini-batch: finds high-variance/hard examples, has the LLM introspect on
    failures to write self-reflective rules or mine successful demos
  - `GEPA` — reflects on full program trajectories (reasoning, tool calls, outputs) to propose
    prompt edits addressing specific gaps; integrated as `dspy.GEPA`
  - `BetterTogether` — meta-optimizer chaining prompt optimization and fine-tuning
- **MIPROv2 mechanics** [S17]: three phases — (1) bootstrap few-shot demo candidates by sampling the
  training set through the program and keeping correct-output runs; (2) propose instruction
  candidates by feeding a proposer LM the dataset summary, program summary, bootstrapped examples, and
  generation tips; (3) Bayesian-optimize over instruction×demo combinations, testing on minibatches
  before periodic full-validation-set checks.

VERBATIM-shaped [S17] MIPROv2 usage:
```python
import dspy
from dspy.datasets.gsm8k import GSM8K, gsm8k_metric
from dspy.teleprompt import MIPROv2

lm = dspy.LM('openai/gpt-4o-mini', api_key='YOUR_OPENAI_API_KEY')
dspy.configure(lm=lm)

teleprompter = MIPROv2(metric=gsm8k_metric, auto="medium")

gsm8k = GSM8K()
optimized_program = teleprompter.compile(
    dspy.ChainOfThought("question -> answer"),
    trainset=gsm8k.train,
)
optimized_program.save(f"optimized.json")
```

**GEPA** [S14][S15] — the 2026 state-of-the-art reflective optimizer:
- Core mechanism (VERBATIM abstract, S14): "GEPA samples trajectories (e.g., reasoning, tool calls,
  and tool outputs) and reflects on them in natural language to diagnose problems, propose and test
  prompt updates, and combine complementary lessons from the Pareto frontier of its own attempts."
- Results (VERBATIM numbers, S14): "Across six tasks, GEPA outperforms GRPO by 6% on average and by
  up to 20%, while using up to 35x fewer rollouts. GEPA also outperforms the leading prompt optimizer,
  MIPROv2, by over 10% (e.g., +12% accuracy on AIME-2025)."
- Authors: Agrawal, Tan, Soylu, Ziems, Khare, Opsahl-Ong, Singhvi, Shandilya, Ryan, Jiang, Potts, Sen,
  Dimakis, Stoica, Klein, Zaharia, Khattab (Stanford/DSPy-adjacent group + UC Berkeley) [S14].
  Accepted as ICLR 2026 Oral.
- Standalone package usage [S15]:
```bash
pip install gepa
```
```python
import gepa

trainset, valset, _ = gepa.examples.aime.init_dataset()
seed_prompt = {
    "system_prompt": "You are a helpful assistant. Answer the question. "
                     "Put your final answer in the format '### <answer>'"
}
result = gepa.optimize(
    seed_candidate=seed_prompt,
    trainset=trainset,
    valset=valset,
    task_lm="openai/gpt-4.1-mini",
    max_metric_calls=150,
    reflection_lm="openai/gpt-5",
)
```
- The **reflection LM** is a distinct, usually stronger model that reads full traces (errors,
  reasoning, profiling) to diagnose failures — it is not the same model being optimized [S15].
- Optimizes beyond prompts: "code," "agent architectures," and per the README even "vector graphics,
  scheduling policies, tool descriptions" via `optimize_anything()` [S15] — directly relevant to the
  "optimizing tool descriptions" scope item: GEPA is a documented, working mechanism for automated
  tool-description optimization, not just prompt text.

**TextGrad** [arXiv 2406.07496] — the earlier (2024) "autodiff via text" framework that GEPA and
others build conceptually on:
- Abstract (VERBATIM): "TextGrad backpropagates textual feedback provided by LLMs to improve
  individual components of a compound AI system... follows PyTorch's syntax and abstraction."
- Measured results (VERBATIM, same abstract): "improves the zero-shot accuracy of GPT-4o in
  Google-Proof Question Answering from 51% to 55%, yields 20% relative performance gain in optimizing
  LeetCode-Hard coding problem solutions, improves prompts for reasoning, designs new druglike small
  molecules... and designs radiation oncology treatment plans."
- Note for the chapter: TextGrad predates GEPA by roughly a year and targets a broader "compound AI
  system" optimization scope (not prompt-only); GEPA's 2026 ICLR paper explicitly compares itself
  against MIPROv2 and GRPO, not against TextGrad directly in the fetched abstract — worth flagging as
  an open comparison for the reader rather than asserting one dominates the other.

**Meta-prompting** — both OpenAI and Anthropic ship an almost identical two-step pattern for using the
model to fix its own system prompt:
- OpenAI (GPT-5 guide) [S5]: ask the model "what elements could be added to an unsuccessful prompt to
  elicit a desired behavior," feeding back specific failure transcripts.
- OpenAI (GPT-5.1 guide) [S3], more structured two-step version: **Step 1 (diagnosis)** — give the
  model the system prompt plus failure traces, ask it to name distinct failure modes and *quote the
  specific lines* of the prompt causing each one; **Step 2 (revision)** — feed back the diagnosis, ask
  for "small, explicit edits: clarify conflicting rules, remove redundant or contradictory lines,
  tighten vague guidance" [S3, VERBATIM].

### 9. Optimizing tool descriptions

No single official doc titled "how to write tool descriptions" surfaced in this pass beyond what
belongs to ch.03; the relevant *optimization*-side facts for this chapter: (a) GEPA's
`optimize_anything()` explicitly lists tool descriptions as an optimizable text artifact [S15]; (b)
Anthropic's own tool-use guidance frames under-triggering/over-triggering as a description-language
problem solvable the same way as system-prompt tone — "Use this tool when..." vs. "CRITICAL: MUST use"
[S1] — i.e., tool descriptions should be tuned with the same altitude/positive-instruction principles
as the rest of the prompt, not treated as a separate discipline. Cross-link ch.03 for schema-level
design (parameter naming, enum use); this chapter's angle is purely "descriptions are prompts, and
prompts can be optimized/evaled the same way."

### 10. Studying published/leaked system prompts

- `asgeirtj/system_prompts_leaks` [S19]: community-maintained, near-daily updates, ~68.7k stars/11.2k
  forks as of Sept 2026; covers Anthropic (Claude Fable 5.1, Opus 5.5, Claude Design, Claude Code,
  Cowork, Science variants), OpenAI (ChatGPT/Codex through GPT-6.1 Sol), Google (Gemini 3.8 Flash down
  to 2.0, Antigravity), xAI Grok, Cursor, Kimi, and more. Structural pattern the repo surfaces:
  labs now ship *different* prompts per surface (desktop vs. cloud, API-injected vs. web, task-specific
  personas) rather than one canonical system prompt per model [S19].
- `Piebald-AI/claude-code-system-prompts` [S20]: extracts Claude Code's prompt architecture directly
  from compiled CLI source — 500+ files across three categories: **Agent Prompts** (Explore/Plan
  sub-agents, CLAUDE.md generator, slash commands like `/code-review`/`/security-review`/`/schedule`,
  utility prompts for summarization/web-fetch/memory-consolidation), **Data** (embedded templates,
  multi-language API references, config guidance, error messages, event schemas), and **System
  Prompt** components (autonomous-loop behavior, artifact handling, auto-mode, Chrome integration).
  Key structural finding, stated directly: "Claude Code doesn't just have one single string for its
  system prompt" — large portions are conditionally assembled per environment/config [S20]. Updated
  within minutes of each of 301+ tracked Claude Code releases.
- Cursor's leaked system prompt (fetched raw, `Cursor/cursor.md` in the leaks repo) opens with role
  framing nearly identical in structure to Anthropic's own documented style (XML-tagged sections:
  `<system-communication>`, `<tone_and_style>`, `<tool_calling>`), and — notably — contains verbatim
  the *same* "don't use a colon before tool calls" and "avoid emojis unless asked" conventions that
  independently show up in this book's own tooling conventions, evidence that agent-harness prompt
  idioms have started converging across vendors/products by imitation [Cursor system prompt, fetched
  directly from GitHub raw].

VERBATIM excerpt, Cursor system prompt (fetched from
`raw.githubusercontent.com/asgeirtj/system_prompts_leaks/main/Cursor/cursor.md`):
```text
You are an AI coding assistant, powered by {model_name}.
You operate in Cursor.
You are a coding agent in the Cursor IDE that helps the USER with software engineering tasks.
...
`<tool_calling>`
You have tools at your disposal to solve the coding task. Follow these rules regarding tool calls:
1. Don't refer to tool names when speaking to the USER. Instead, just say what the tool is doing in natural language.
2. Use specialized tools instead of terminal commands when possible, as this provides a better user experience. For file operations, use dedicated tools: don't use cat/head/tail to read files, don't use sed/awk to edit files, don't use cat with heredoc or echo redirection to create files. ...
```
Provenance caveat: this is a *reverse-engineered/leaked* prompt from a third-party aggregator, not an
official Cursor publication — treat as directionally reliable but not a primary spec in the same sense
as the Anthropic/OpenAI doc pages.

### 11. Prompt caching — layout constraints on prompt structure

**Anthropic** [S11]:
- `cache_control: {"type": "ephemeral"}` at block level (or once at top-level for automatic caching).
- Minimum cacheable-prefix size is **model-dependent**: 512 tokens (Fable/Mythos 5.1, Opus 5.5, Opus 5,
  Sonnet 5.5, Fable/Mythos 5); 1,024 tokens (Opus 4.8, Sonnet 5/4.6/4.5, Opus 4.1/4); 2,048 tokens
  (Mythos Preview, Opus 4.7; also Haiku 3.5); 4,096 tokens (Opus 4.6/4.5; Haiku 4.5) [S11].
- TTL: default 5 minutes; optional 1-hour (`ttl: "1h"`) at **2×** base input price for the write vs.
  **1.25×** for the 5-minute write [S11].
- Cache-read price multiplier varies by model: **0.025×** base input on Fable/Mythos 5.1, **0.05×** on
  Opus 5.5, **0.1×** on all others [S11].
- **Strict prefix hierarchy**: `tools → system → messages`, cumulative — changing anything upstream
  invalidates everything downstream [S11].
- **20-block backward lookback**: a cache read walks back at most 20 positions looking for a prior
  write; consecutive `tool_use` or `tool_result` blocks each count as *one* position for this purpose
  [S11].
- **Breakpoint placement rule**: put `cache_control` on "the last block whose prefix is identical
  across requests," never on per-request-varying content (their explicit counter-example: a timestamp
  placed *before* the breakpoint kills every cache hit) [S11].
- Up to **4 explicit breakpoints** per request, letting you cache tool defs / long-lived context /
  growing conversation at independently-appropriate TTLs.
- **Pre-warming**: send a `max_tokens: 0` request with the same cached system block to populate the
  cache without generating output; response comes back with `stop_reason: "max_tokens"` and empty
  content [S11].
- Cannot cache: sub-content blocks like citations, empty text blocks; thinking blocks are cached only
  as part of a previous assistant turn's blob, never addressable directly [S11].

**OpenAI** (GPT-5.6+ generation) [S9]:
- Mostly automatic: breakpoint auto-placed "at the end of the latest eligible message"; manual mode
  available via `prompt_cache_breakpoint: {"mode": "explicit"}`.
- Minimum: **1,024 visible input tokens** (hidden system content doesn't count toward this).
- Discount: up to **95%** on cache reads — "0.1× that rate on most of these models and 0.05× on
  GPT-6.1 Sol"; cache writes cost 1.25× standard input rate.
- Lifetime: **30 minutes** after most recent write/reuse (GPT-5.6+); earlier models offer 5–10 min
  (`in_memory`) or up to 24h retention policies.
- Anything that changes `model`, `tools`, `parallel_tool_calls`, `text.format`, `reasoning.effort`,
  `text.verbosity`, or `context_management` breaks the cached prefix — "cache reuse requires the
  entire rendered prefix to match" [S9, VERBATIM].
- Usage fields: `usage.input_tokens_details.cached_tokens` / `.cache_write_tokens`.

**Design implication for prompt engineers (both vendors)**: static content (role, tool defs, style
rules) belongs at the *front* of the prompt behind a breakpoint; per-request-variable content
(timestamps, retrieved documents that change, user's latest message) belongs *after* it. This directly
constrains where you're allowed to put "helpful" per-turn reminders — Anthropic's own Fable 5.1 guide
solves this with turn-scoped system messages specifically so a per-turn nudge doesn't sit inside the
cached, supposedly-static prefix [S2].

## Numbers

- GEPA vs. GRPO: **+6% average, up to +20%**, using **up to 35× fewer rollouts**, across 6 tasks
  [GEPA paper, arXiv 2507.19457, accepted ICLR 2026 Oral, S14].
- GEPA vs. MIPROv2: **>10% average**, **+12% accuracy on AIME-2025** specifically [S14].
- TextGrad, GPT-4o zero-shot on Google-Proof QA: **51% → 55%** [TextGrad arXiv 2406.07496, published
  2024-06-11].
- TextGrad, LeetCode-Hard coding problems: **+20% relative performance gain** [same source].
- GPT-5.1 named `apply_patch` tool type vs. free-text patch format: **35% reduction in apply_patch
  failure rate** [S3] — no baseline dataset/methodology given in the fetched guide; treat as an OpenAI-
  internal measurement, unverified externally.
- Anthropic long-context "query at the end" placement: **up to 30% quality improvement** in tests,
  "especially with complex, multidocument inputs" [S1] — no dataset/model specified in the doc as
  fetched; likely an internal Anthropic measurement.
- Anthropic prompt-cache pricing example (Claude Opus 5.5, base input $4/MTok): 5-min cache write
  $5/MTok (×1.25), 1-hour cache write $8/MTok (×2), cache-hit read $0.20/MTok (×0.05) [S11].
- OpenAI Prompt Optimizer dataset minimum: **≥3 rows**, each needing **≥1** grader result or human
  annotation [S7].
- Anthropic minimum cacheable prefix: **512–4,096 tokens depending on model** (table above) [S11].
- `system_prompts_leaks` repo scale: **~68.7k GitHub stars, 11.2k forks** as of Sept 2026 [S19].
- Claude Code source leak (Mar 2026): **512,000 lines** of TypeScript exposed [search-layer finding,
  not independently re-verified against a primary incident report — see Unverified].
- Leaked Fable 5 system prompt reconstruction: **1,585 lines / ~120,000 characters**, appeared within
  **24 hours** of the model's June 2026 launch [search-layer finding, same caveat].

## Pitfalls, limits, criticism

- **The over-emphasis trap is now bidirectional and model-specific.** A prompt tuned to fix
  under-triggering on an older model becomes an over-triggering bug on the next one; there is no
  universal "strength" of instruction language that's safe across model generations — Anthropic's own
  docs frame this as requiring a **fresh eval sweep per model bump**, not a one-time tuning pass [S1][S2].
- **Effort/thinking parameters are not comparable across models by name.** "Same `effort: high`" means
  different actual thinking depth on Fable 5 vs. Fable 5.1 — Anthropic explicitly warns against
  assuming parity [S2].
- **Prefill removal breaks a whole class of legacy patterns** (forced-JSON via prefill, preamble
  suppression via prefill, refusal-steering via prefill, conversation continuation via prefill) on
  Claude 4.6+ — any pre-2026 Claude prompting guide that relies on prefill is now actively broken (400
  error) on current models, not just suboptimal [S1].
- **Append-only history is now a hard API constraint, not a style guideline**, for accounts created
  after 2026-08-31 on Fable/Opus/Sonnet 5.5-class models — harnesses that rewrite `system`/`tools` or
  edit earlier turns mid-conversation (common for context compaction or dynamic re-prompting) will hit
  400s unless they opt into `drop_block` behavior or restructure around turn-scoped system messages
  [S1][S2]. This is a structural break for any home-grown compaction implementation.
- **OpenAI's Prompt Optimizer is on a deprecation countdown** (read-only 2026-10-31, dead 2026-11-30)
  [S7] — any book advice built around it needs a "check current status" caveat baked in; no announced
  replacement surfaced in this research pass.
- **GEPA's numbers are self-reported by the authors of GEPA** (Stanford/DSPy-adjacent team) in a paper
  they wrote; the ICLR 2026 Oral acceptance is real peer validation, but "beats MIPROv2 by 10%" is a
  same-authors comparison, not independent replication — flag this as the normal caveat for any
  optimizer paper's own benchmark claims.
- **Leaked system prompts are unverifiable as exact/current.** The `system_prompts_leaks` repo is
  reverse-engineered/extracted, not officially published by the vendors (except where a vendor's own
  source leaked verbatim, e.g. the March 2026 Claude Code npm incident) — treat any specific leaked
  prompt text as "probably close, not guaranteed exact," especially for hosted products like Cursor
  that change prompts frequently without changelogs.
- **Vendor guidance actively contradicts across providers on the "verbosity of prompt engineering"
  axis**: Anthropic/OpenAI 2026 guidance says use *fewer* forceful words but still explicit structure
  (XML tags, examples); Gemini 3 guidance says use *less prompt engineering altogether* — simpler,
  shorter prompts, PTCF-lite. A cross-model prompt library cannot be a single artifact reused verbatim
  across all three vendors; this is worth its own diagram/decision-table in the book.
- **"None"/`minimal` reasoning-effort modes trade off real capability**, not just latency — none of
  the fetched sources gave a quantified accuracy delta for `none` vs `medium` on GPT-5.1/5.2 specifically;
  flagged under Unverified.

## What changed in the last 6 months (i.e., since roughly March 2026)

- GPT-5.1 → GPT-5.2 transition: default reasoning effort flipped from higher settings toward `none`
  as the baseline, with "conservative grounding bias" added as a named behavior [S4].
- Claude Fable 5 → Claude Fable 5.1 transition: introduced turn-scoped system messages (beta,
  2026-08-21), thinking-display-updates beta (2026-08-18), and strict thinking-block/prefix binding
  enforcement for new accounts (2026-08-31) — a cluster of API mechanics changes specifically enabling
  safer prompts-as-code patterns for long agent loops [S2].
- March 2026: Claude Code full source leak via npm package, making the harness's actual system-prompt
  architecture (as opposed to reverse-engineered guesses) directly readable — a qualitative change in
  how confidently engineers can study "how Claude Code actually prompts itself" [search-layer finding,
  see Unverified].
- GEPA went from arXiv preprint (July 2025) to ICLR 2026 Oral (peer-reviewed, revised Feb 2026) and
  from a DSPy-only optimizer to a standalone `pip install gepa` package usable on arbitrary text
  artifacts, including tool descriptions and agent architectures — broadening its relevance beyond
  "just another DSPy optimizer" [S14][S15].
- OpenAI announced the sunset of the Evals platform (and with it, the current form of the Prompt
  Optimizer) for Oct/Nov 2026 — this is a live, in-progress deprecation as of the chapter's writing
  date [S7].

## Diagram candidates

1. **Altitude spectrum** — horizontal axis from "brittle hardcoded if/else logic" to "vague
   underspecified guidance," Anthropic's Goldilocks zone marked in the middle; annotate with the
   overtriggering-CAPS example as a concrete point on the "too aggressive" side [S1][S13].
2. **Model-generation instruction-following timeline** — a strip showing GPT-5 → 5.1 → 5.2 and Opus/
   Sonnet 4.5 → 4.6 → 4.8/5/5.5 → Fable/Mythos 5 → 5.1, annotated with the literalness/over-triggering
   inflection point and what prompt-language change each transition demanded [S1][S3][S4].
3. **Reasoning-effort/thinking-mode decision tree** per vendor: Anthropic (`adaptive` thinking + effort
   levels, always-on models called out) vs. OpenAI (`reasoning.effort` enum, model-dependent `none`
   support) vs. Gemini (`thinking_level` four-tier) — three parallel small state machines [S1][S8][S10].
4. **Cache-prefix layout diagram** — a stacked-block diagram: `tools → system(static) →
   system(turn-scoped, cleared) → messages(growing)`, with the breakpoint marker and the 20-block
   lookback window shown as a sliding window over the block stack [S11][S2].
5. **GEPA optimization loop** — actors: candidate prompt, task LM (executes it), reflection LM (reads
   trajectory + feedback), Pareto archive (keeps diverse high scorers); arrows: sample trajectory →
   reflect in NL → propose mutation → evaluate → update Pareto frontier → repeat [S14][S15].
6. **DSPy compile pipeline** — Signature (declarative spec) → Module (program using the signature) →
   Optimizer (MIPROv2/GEPA/SIMBA/etc., consuming trainset+metric) → compiled program (concrete prompt +
   few-shot demos baked in) → `.save()`/`.load()` artifact [S16][S17][S18].
7. **Meta-prompting two-step loop** — system prompt + failure traces → diagnosis pass (quote offending
   lines, name failure modes) → revision pass (surgical edits) → re-test; show this as a cycle back to
   "system prompt" [S3].
8. **Vendor prompt-engineering-intensity divergence** — a 2x2 or scatter: Anthropic/OpenAI (structured,
   XML/examples, but less forceful language) vs. Gemini 3 (minimal engineering, concise, PTCF) —
   useful as a "don't copy-paste across vendors" warning graphic [S1][S5][S10].
9. **Prefill-removal migration map** — four historic prefill use cases (format-forcing, preamble
   removal, refusal-steering, continuation) each mapped to its 2026 replacement mechanism (Structured
   Outputs, direct instruction, better native refusals, user-message continuation) [S1].
10. **Leaked-prompt ecosystem map** — nodes: vendor's real prompt (unknown ground truth) → official
    docs (partial, sanctioned view) → leaked/reverse-engineered repos (`system_prompts_leaks`,
    `claude-code-system-prompts`) → community re-derivation; arrows labeled by confidence level
    [S19][S20].

### Chart candidates
- GEPA vs. MIPROv2 vs. GRPO bar chart: average % gain and rollout count, from the paper's own headline
  numbers (6%/20%/35× and >10%/+12% on AIME-2025) [S14] — real values, one source, easy to build
  faithfully without extra data-gathering.
- Cache pricing multiplier comparison: a small table-as-chart of write/read multipliers across
  Anthropic tiers (Fable 5.1 vs. Opus 5.5 vs. "everyone else") from S11's own worked example.

## Glossary

- **Right altitude** — Anthropic's term for a system prompt specific enough to constrain behavior
  without hardcoding every branch [S13].
- **Adaptive thinking** — Anthropic's `thinking: {type: "adaptive"}` mode where the model decides
  when/how much to think based on `effort` and query complexity, replacing manual `budget_tokens` [S1].
- **Effort** — Anthropic's `output_config.effort` parameter (`low/medium/high/xhigh/max`) controlling
  thinking depth/latency/cost tradeoff; not comparable by name across model generations [S1][S2].
- **Reasoning effort** — OpenAI's `reasoning.effort`/`reasoning_effort` parameter, enum grown from
  `minimal/low/medium/high` (GPT-5) to include `none` (GPT-5.1+) and `xhigh`/`max` on later models
  [S3][S8].
- **Turn-scoped system message** — Anthropic beta feature: a `role: "system"` message with
  `clear_at: "next_user_message"`, visible only for one turn, used to inject nudges without breaking
  append-only history or the prompt cache [S2].
- **Prefix hash lookback** — Anthropic's cache-hit-matching mechanism: walks back up to 20 block
  positions from a breakpoint looking for a matching prior cache write [S11].
- **Reflective prompt mutation** — GEPA's core technique: an LLM reads full execution traces in
  natural language to diagnose failures and propose targeted prompt edits, guided by a genetic/Pareto
  selection process [S14].
- **Reflection LM** — in GEPA, the (often stronger) model that performs reflective mutation, distinct
  from the task LM being optimized [S15].
- **Signature** (DSPy) — a declarative input/output spec for a prompt-able task, decoupled from the
  literal prompt text the compiler eventually produces [S18].
- **Mannered prose** — Anthropic-named failure mode for Claude Fable 5.1: metaphor/flourish substituted
  for direct statement, named to give the model an explicit anti-pattern to avoid [S2].
- **Metaprompting** — asking the model itself to diagnose/rewrite a failing prompt, typically as a
  two-step diagnose-then-revise loop [S3][S5].

## Unverified / open questions

- Exact wording of Anthropic's original "if X then Y is a signal of over-specification" line from the
  context-engineering post — I have the paraphrase from a WebFetch summary but could not get the raw
  HTML to confirm the literal sentence (the page is client-rendered; WebFetch's internal summarizer
  model produced the paraphrase). Treat the "altitude" *concept* as confirmed, the specific phrasing
  around over-specification as approximate.
- OpenAI o-series ("don't ask for step-by-step CoT") guidance was pulled from search-engine synthesis
  of secondary sources (PromptHub, Microsoft TechCommunity, etc.), not a primary OpenAI 2026 doc page
  fetched directly — I could not locate a current (2026) official OpenAI "reasoning models best
  practices" page distinct from the per-version GPT-5.x/6.x prompting guides in the time available.
  This is a gap worth closing before publication: search `developers.openai.com/api/docs/guides/` for
  a reasoning-specific guide page.
- Claude Code March 2026 npm source leak and the June 2026 Fable 5 system-prompt leak (1,585
  lines/120k chars within 24 hours): both facts came from a WebSearch synthesis paragraph, not a
  primary incident report or the leaked file itself — I did not independently open and verify a news
  article on the npm leak (layer5.io was in the result list but not fetched). Numbers should be
  re-verified against a primary source before print.
- TextGrad vs. GEPA direct comparison: not found in the fetched GEPA abstract (it compares itself to
  GRPO and MIPROv2 only); whether GEPA's authors or anyone else has benchmarked GEPA against TextGrad
  head-to-head is unknown from this research pass.
- Quantified accuracy cost of OpenAI's `none`/Anthropic's low-effort reasoning modes vs. full thinking
  — no fetched source gave a specific benchmark delta; only qualitative "trades intelligence for
  latency/cost" framing.
- What replaces OpenAI's Prompt Optimizer after the Nov 30 2026 Evals shutdown — not addressed in any
  fetched source; worth a fresh check close to the book's publication date given the shutdown falls
  within two months of today.
- Whether "Claude Fable"/"Claude Mythos" fully replace "Opus/Sonnet/Haiku" naming going forward, or run
  as a parallel/experimental line (Anthropic's own table lists both families side by side as "current"
  models) — current state is genuinely ambiguous from the docs as fetched; flag for the model-naming
  section of ch.01 as well as here.
- DSPy's `dspy.GEPA` integration details (parameters specific to the DSPy wrapper vs. the standalone
  `gepa.optimize()` API) were not separately fetched — only inferred from the optimizers.md overview
  mentioning "`dspy.GEPA` for optimizing entire DSPy programs."

## Sources

- [S1] "Prompting best practices," Claude Platform Docs (Anthropic), publisher: Anthropic, publication
  date not stated on page (reflects models current through Claude Opus 5.5/Sonnet 5.5/Fable 5.1,
  i.e. current as of Sept 2026), https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices,
  accessed 2026-09-30.
- [S2] "Prompting Claude Fable 5.1," Claude Platform Docs (Anthropic), publisher: Anthropic, date not
  stated, references beta headers dated through 2026-08-31, https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-1,
  accessed 2026-09-30.
- [S3] "GPT-5.1 Prompting Guide," OpenAI Cookbook, publisher: OpenAI, date not stated on page (post-
  dates GPT-5.1 release, 2026), https://developers.openai.com/cookbook/examples/gpt-5/gpt-5-1_prompting_guide,
  accessed 2026-09-30.
- [S4] "GPT-5.2 Prompting Guide," OpenAI Cookbook, publisher: OpenAI, date not stated (post-dates
  GPT-5.2 release, 2026), https://developers.openai.com/cookbook/examples/gpt-5/gpt-5-2_prompting_guide,
  accessed 2026-09-30.
- [S5] "GPT-5 Prompting Guide," OpenAI Cookbook, publisher: OpenAI, date not stated (original GPT-5
  release era), https://developers.openai.com/cookbook/examples/gpt-5/gpt-5_prompting_guide, accessed
  2026-09-30.
- [S6] "GPT-5.1-Codex-Max Prompting Guide," OpenAI Cookbook, publisher: OpenAI, date not stated,
  https://developers.openai.com/cookbook/examples/gpt-5/gpt-5-1-codex-max_prompting_guide, accessed
  2026-09-30.
- [S7] "Prompt optimizer," OpenAI API docs, publisher: OpenAI, date not stated (references Oct/Nov
  2026 deprecation dates as future), https://developers.openai.com/api/docs/guides/prompt-optimizer,
  accessed 2026-09-30.
- [S8] "Prompt guidance," OpenAI API docs, publisher: OpenAI, date not stated (describes GPT-6
  Astra/6.1 Sol/GPT-6/6 Luna models, i.e. current Sept 2026 model line),
  https://developers.openai.com/api/docs/guides/prompt-guidance, accessed 2026-09-30.
- [S9] "Prompt caching," OpenAI API docs, publisher: OpenAI, date not stated (describes GPT-5.6+
  mechanics as current), https://developers.openai.com/api/docs/guides/prompt-caching, accessed
  2026-09-30.
- [S10] "Gemini 3 developer guide," Google AI for Developers, publisher: Google, date not stated
  (Gemini 3 current release docs), https://ai.google.dev/gemini-api/docs/gemini-3, accessed
  2026-09-30.
- [S11] "Prompt caching," Claude Platform Docs (Anthropic), publisher: Anthropic, date not stated,
  https://platform.claude.com/docs/en/build-with-claude/prompt-caching, accessed 2026-09-30.
- [S12] "Console prompting tools," Claude Platform Docs (Anthropic), publisher: Anthropic, date not
  stated, https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-tools,
  accessed 2026-09-30.
- [S13] "Effective context engineering for AI agents," Anthropic Engineering blog, publisher:
  Anthropic, published 2025-09-29, https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents,
  accessed 2026-09-30.
- [S14] Agrawal, Tan, Soylu, et al., "GEPA: Reflective Prompt Evolution Can Outperform Reinforcement
  Learning," arXiv:2507.19457, submitted 2025-07-25, v2 2026-02-14, accepted ICLR 2026 (Oral),
  https://arxiv.org/abs/2507.19457, accessed 2026-09-30.
- [S15] "gepa-ai/gepa" README, GitHub, publisher: GEPA project (Stanford/DSPy-adjacent authors), date
  not stated, https://github.com/gepa-ai/gepa (fetched via raw.githubusercontent.com), accessed
  2026-09-30.
- [S16] "optimizers.md," DSPy docs, stanfordnlp/dspy GitHub repo, publisher: Stanford NLP / DSPy
  maintainers, date not stated, https://github.com/stanfordnlp/dspy/blob/main/docs/docs/learn/optimization/optimizers.md,
  accessed 2026-09-30.
- [S17] "MIPROv2.md," DSPy API docs, stanfordnlp/dspy GitHub repo, publisher: Stanford NLP / DSPy
  maintainers, date not stated, https://github.com/stanfordnlp/dspy/blob/main/docs/docs/api/optimizers/MIPROv2.md,
  accessed 2026-09-30.
- [S18] "signatures.md," DSPy docs, stanfordnlp/dspy GitHub repo, publisher: Stanford NLP / DSPy
  maintainers, date not stated, https://github.com/stanfordnlp/dspy/blob/main/docs/docs/learn/programming/signatures.md,
  accessed 2026-09-30.
- [S19] "system_prompts_leaks" README, GitHub repo by asgeirtj, community-maintained, updated
  through Sept 2026, https://github.com/asgeirtj/system_prompts_leaks/blob/main/README.md, accessed
  2026-09-30.
- [S20] "Piebald-AI/claude-code-system-prompts," GitHub repo, publisher: Piebald AI, updated within
  minutes of each Claude Code release (301+ versions tracked as of access), https://github.com/Piebald-AI/claude-code-system-prompts,
  accessed 2026-09-30.
- [TextGrad arXiv] Yuksekgonul, Bianchi, Boen, Liu, Huang, Guestrin, Zou, "TextGrad: Automatic
  'Differentiation' via Text," arXiv:2406.07496, submitted 2024-06-11,
  https://arxiv.org/abs/2406.07496, accessed 2026-09-30.
- [Cursor system prompt] "cursor.md," in asgeirtj/system_prompts_leaks GitHub repo (leaked/reverse-
  engineered, not an official Cursor publication), date of extraction not stated,
  https://raw.githubusercontent.com/asgeirtj/system_prompts_leaks/main/Cursor/cursor.md, accessed
  2026-09-30.
