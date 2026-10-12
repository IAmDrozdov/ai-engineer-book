# Промптинг и оптимизация промптов — engineering practice notes

## TL;DR (what an engineer must know today, 2026-09-30)

- Prompting for agentic systems is no longer "clever phrasing" — it's an engineering discipline: prompts live in git, get evaluated in CI, and get optimized by algorithms (DSPy GEPA/MIPROv2, OpenAI's optimizer) as often as by hand. [S17][S18]
- **The single biggest behavior shift across all three vendors in 2025-2026: models became *literal* instruction-followers.** Aggressive, all-caps, "CRITICAL/MUST/NEVER" prompting that compensated for weak instruction-following in older models now *overtriggers* — tools fire when they shouldn't, verification loops run when unneeded, thinking gets excessive. The fix is to dial language back to normal register. [S1][S3]
- Anthropic's own framing for system-prompt instructions is "right altitude": not so specific it's brittle (hardcoded if/else logic), not so vague it's ineffective (assumes shared context the model doesn't have) — a Goldilocks zone of strong heuristics plus a small number of canonical examples. [S19]
- Examples (few-shot) still outperform prose instructions for steering format/tone/structure — Anthropic recommends 3-5 diverse examples wrapped in `<example>` tags; too few or too similar examples cause the model to overfit the pattern. [S1]
- Chain-of-thought as a *prompting technique* ("think step by step", add `<thinking>` tags) is being subsumed by built-in reasoning: Claude's "adaptive thinking" and GPT-5.x's `reasoning_effort` decide internally when/how much to reason; manual CoT is now a fallback for when thinking is off, not the default technique. [S1][S9]
- Prompt caching is now a layout constraint, not an afterthought: static content (tools → system → long documents) must precede dynamic content (timestamps, per-turn user input) or every request pays full price; Claude's cache lookup only walks back 20 content blocks. [S8]
- Automatic prompt optimization is mainstream but narrow: OpenAI's Playground optimizer fixes *mechanical* defects (contradictions, missing format specs, few-shot inconsistency) via a 5-agent pipeline graded against a small hand-labeled golden set — it is being deprecated as a dataset-backed Evals feature by Nov 2026. DSPy's GEPA/MIPROv2 optimize against a real metric+trainset and can beat RL-trained policies with far fewer rollouts. [S15][S5][S6]
- GEPA (genetic-pareto reflective prompt evolution, ICLR 2026 oral) beats GRPO by 6% avg (up to 20%) with up to 35x fewer rollouts, and beats MIPROv2 by >10% (e.g. +12% accuracy on AIME 2025) — because natural-language reflection on failure traces is a richer learning signal than a scalar reward. [S5][S6]
- Tool descriptions are prompts too, and Anthropic's own methodology for tuning them is "run Claude Code on the transcripts": concatenate agent evaluation transcripts and hand them to Claude to rewrite the tool set — this shipped the SOTA SWE-bench Verified refinement for Claude 3.5 Sonnet. [S13]
- A documented regression: newer Claude models (Opus 4.8, Sonnet 5) invent spurious fields in nested tool-call JSON at ~20% rate in one practitioner's tests, hypothesized to be an artifact of Claude Code's forgiving/aliasing tool-call parsing bleeding into the model's general tool-calling prior; Anthropic's strict tool-calling mode eliminates it. Tool schemas are not model-distribution-neutral. [S14]
- Leaked/documented system prompts (Claude Code, Cursor, Codex, and 25+ others, tracked in one actively-maintained GitHub repo) are a legitimate study corpus for structure: role framing, tool-use rules, git/destructive-action safety language, response-length discipline, and namespacing patterns repeat across vendors. [S11][S12]
- Debugging methodology converges across practitioners on: read the raw transcript first (not a summary), do error analysis on 100+ traces before touching the prompt, prefer binary pass/fail labels over 1-5 Likert scales, and only reach for algorithmic optimization (GEPA-style) after manual inspection shows the failure is not structural. [S10]
- Model-specific guidance has exploded into its own literature: Anthropic now ships a separate prompting page *per model* (Opus 5, Opus 5.5, Sonnet 5, Sonnet 5.5, Fable 5.1...) because behavior genuinely diverges release to release — a prompt tuned for one model needs a re-check on the next, not a copy-paste. [S1]

## Current state and versions (as of 2026-09-30)

- **Anthropic**: current model family per platform docs (undated page, content reflects Sept 2026 model set) spans Claude Fable 5.1 / Mythos 5.1, Fable 5 / Mythos 5, Opus 5.5, Opus 5, Opus 4.8/4.7/4.6, Sonnet 5.5, Sonnet 5, Sonnet 4.6, Haiku 4.5. Each has its own "Prompting Claude X" doc describing deltas from the previous model. [S1]
- **OpenAI**: GPT-5.1 prompting guide, then GPT-5.2 prompting guide (both on developers.openai.com/cookbook, no explicit publish date on the fetched pages, but referenced as current in 2026 searches); the original GPT-5 prompting guide (introducing `reasoning_effort`: minimal/low/medium/high) is treated as the pre-5.1 baseline. [S9][S2][S4]
- **Google**: Gemini 3 prompting guidance published by Google and covered by Philipp Schmid, dated **2025-11-19**. [S3]
- **DSPy**: current optimizer roster (per live docs) is BootstrapFewShot family, COPRO, MIPROv2, SIMBA, GEPA, BetterTogether, Ensemble, InferRules, KNN/KNNFewShot, LabeledFewShot — GEPA is the newest and the one getting ecosystem integration (MLflow, Opik, Pydantic AI, Google ADK) as of 2026. [S16][S6]
- **GEPA** (the algorithm/paper) — arXiv:2507.19457, submitted 2025-07-25, **accepted ICLR 2026 (Oral)**; the `gepa-ai/gepa` package is now vendor-independent (`gepa.optimize`, `optimize_anything`) with 50+ production deployments claimed (Shopify, Databricks, Dropbox, OpenAI among named users). [S5][S6]
- **OpenAI's dataset-backed prompt optimizer**: being sunset — "Evals will become read-only for existing users on October 31, 2026" and "the platform is scheduled to shut down on November 30, 2026" per an eesel.ai summary of OpenAI's own notice; treat this feature as legacy for a book published after that date. [S15]
- **Anthropic Console tools**: "prompt generator" (blank-page problem, generates a structured prompt from a plain-language task description) and "prompt improver" (rewrites an existing prompt: adds CoT sections, restructures, adds prefill, adds error handling) — both live in the Console at platform.claude.com; original launch reported ~30% accuracy lift on a classification prompt and 100% adherence to a word-count constraint on a summarization prompt (Anthropic's own numbers, undated exact figures reused across secondary sources). [S7]

## Timeline

- **2024-06**: TextGrad paper posted to arXiv (2406.07496); later published in *Nature*. Stanford (James Zou's group). [S20]
- **2024-11**: Anthropic ships the Console "prompt improver" (chain-of-thought injection, restructuring, prefill, error handling) — precedes the current 2026 model generation but is the direct ancestor of today's tool. [S7]
- **2025-06-11 → ongoing**: GPT-5 prompting guide (introduces `reasoning_effort`, "minimal reasoning" mode, warns that contradictory instructions hurt GPT-5 more than older models because of its literal instruction-following). [S2]
- **2025-07-25**: GEPA paper posted to arXiv. [S5]
- **2025-09-11**: Anthropic publishes "Writing effective tools for AI agents — using AI agents," the tool-description methodology doc (transcript-driven iteration, namespacing, response-format token savings). [S13]
- **2025-09-29**: Anthropic publishes "Effective context engineering for AI agents" — introduces the "right altitude" framing for system-prompt instructions (cross-link: this properly belongs to ch. 02, cited here for the instruction-design angle). [S19]
- **2025-11-19**: Google publishes Gemini 3 prompting guidance (direct/concise style, XML-or-Markdown-not-both, verbosity defaults). [S3]
- **2026-03-31**: Claude Code source leaks in full (npmignore packaging mistake) — exposes the dynamically-assembled system prompt, ~50 tool definitions, and controversial hidden behaviors (see Mechanics). [S12]
- **2026-04-04**: Drew Breunig publishes "How Claude Code Builds a System Prompt," a structural analysis of the leaked prompt-assembly logic. [S11]
- **2026-07-04**: Armin Ronacher publishes "Better Models: Worse Tools," documenting the Opus 4.8 / Sonnet 5 spurious-tool-field regression. [S14]
- **2026-09-18 (updated 2026-09-21)**: Hamel Husain & Shreya Shankar's "AI Evals FAQ" — codifies error-analysis-before-prompt-optimization and binary-over-Likert grading as the current consensus methodology. [S10]
- **2026 (undated, current)**: GPT-5.1 and GPT-5.2 prompting guides live on developers.openai.com/cookbook; GPT-5.2 guide shows the trend continuing toward lower default verbosity and stronger instruction adherence, requiring even more explicit length constraints from the prompt author. [S9][S4]

## Mechanics

### 1. Anatomy of an agent system prompt (Claude Code case study)

Per Breunig's analysis of the leaked source [S11], Claude Code does **not** use a static system-prompt string. It assembles one from conditional components at request time:

- **Always-included core sections**: Intro (purpose + optional output-style variant), System Rules (tool/permission/context-compression ground rules), Doing Tasks (minimal-diff coding philosophy — omitted if a custom output style disables it), Executing Actions with Care (confirm-before-risky-action guidance), Using Your Tools (prefer dedicated tools over raw shell), Tone and Style (no emojis unless asked).
- **Conditional sections**: Output Efficiency (different text for internal vs. external users), Session Guidance (varies by whether Ask-User / Shell Shortcut / Agent tool / Skills / a verification agent are enabled), Memory Prompt (only if auto-memory is configured), Environment Info (cwd, platform, shell, model id), language preference, custom output style, MCP server instructions (injected per connected server).
- **Cache boundary marker**: a literal sentinel string (`__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__`) separates the globally-cacheable prefix from session-specific content — invisible to the model, load-bearing for cache-hit rate. This is the load-bearing engineering pattern: **compose the prompt so everything cacheable is contiguous and first.**
- The same conditional-assembly approach extends to the ~50 tool definitions, CLAUDE.md/AGENT.md content, and skills — none of it is one flat string.

Cross-link: the file-assembly and memory mechanics (CLAUDE.md loading, compaction) belong to ch. 02 (context engineering) and ch. 06 (skills); this chapter's angle is specifically *how the instructional text itself is authored and structured*.

### 2. Right altitude, instructions vs. examples [S19][S1]

Anthropic's stated failure modes for system-prompt instructions:
- **Too specific → brittle**: hardcoding long if/else-style logic trees into prose breaks under any input the author didn't anticipate, and is expensive to maintain.
- **Too vague → ineffective**: high-level guidance that "falsely assumes shared context" gives the model nothing concrete to act on.
- **Target**: "specific enough to guide behavior effectively, yet flexible enough to provide the model with strong heuristics."

The stated mechanism for hitting that target is to **replace exhaustive rule-lists with a small number of diverse, canonical examples** — "For an LLM, examples are the 'pictures' worth a thousand words" [S19]. This is consistent with the general-purpose prompt-engineering guidance [S1]: 3-5 examples, wrapped in `<example>`/`<examples>` tags, deliberately varied so the model can't pattern-match on incidental features of the examples rather than the intended behavior.

### 3. Structuring with XML/Markdown [S1][S3]

Anthropic: use XML tags (`<instructions>`, `<context>`, `<input>`, `<document>`) to give complex prompts unambiguous internal boundaries; nest tags when content has natural hierarchy (e.g. `<documents><document index="1">...`).

Google (Gemini 3): use **either** XML or Markdown consistently, but do not mix the two inside one prompt — Gemini 3 "responds well when prompts follow a consistent pattern" and mixing conventions confuses that pattern-matching. [S3]

VERBATIM [S1] — multidocument structuring example (long-context prompting section of Anthropic's prompting-best-practices doc):
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
Anthropic's own measured claim: putting the query *after* long documents (not before) "can improve response quality by up to 30 percent in tests, especially with complex, multidocument inputs" [S1] — no isolated benchmark cited beyond "in tests," treat as a vendor-internal number.

### 4. The CAPS/MUST overtriggering problem — the single most important behavior change [S1]

Direct quote from Anthropic's current best-practices doc:

> "Claude Opus 4.5 and Claude Opus 4.6 are also more responsive to the system prompt than previous models. If your prompts were designed to reduce undertriggering on tools or skills, these models may now overtrigger. The fix is to dial back any aggressive language. Where you might have said 'CRITICAL: You MUST use this tool when...', you can use more normal prompting like 'Use this tool when...'." [S1]

Related, same doc: "Tools that undertriggered in previous models are likely to trigger appropriately now. Instructions like 'If in doubt, use [tool]' will cause overtriggering." And on subagents: "Claude Opus 4.6 has a strong predilection for subagents and may spawn them in situations where a simpler, direct approach would suffice." The prescribed fix pattern is uniform: **replace blanket defaults ("Default to using X") with targeted conditions ("Use X when it would enhance understanding of Y"), and remove "if in doubt" escape hatches** — these used to compensate for weak triggering and now cause the opposite failure.

Same pattern shows up independently on the OpenAI side: GPT-5's own guide warns "poorly-constructed prompts containing contradictory or vague instructions can be more damaging to GPT-5 than to other models" [S2], and notes a real anecdote — Cursor's context-gathering encouragement, which helped GPT-4.1, caused GPT-5 to overuse tools unnecessarily [S2]. This is the same over-literalism dynamic under a different vendor.

### 5. Chain-of-thought vs. built-in reasoning [S1][S2][S9]

- **Claude**: "adaptive thinking" (`thinking: {type: "adaptive"}`) replaces manual extended thinking with a `budget_tokens` cap for Claude 4.6+ models; the model decides when/how much to think based on the `effort` parameter and query complexity. On Claude Opus 5, Sonnet 5, Sonnet 5.5, Fable 5.1/Mythos 5.1/Fable 5/Mythos 5/Opus 5.5, thinking defaults **on**; `budget_tokens` returns a 400 error on Claude 4.7+ — the control surface moved from a token budget to a qualitative `effort` level. Manual CoT (`<thinking>`/`<answer>` tags) is now explicitly a **fallback for when thinking is off**, and on Opus 5 even that fallback is discouraged in favor of low-effort thinking, because with thinking disabled the model can leak internal XML into visible output. [S1]
- Anthropic's stated finding: "In internal evaluations, adaptive thinking reliably drives better performance than extended thinking." [S1] — an internal, unquantified claim; no external benchmark given.
- Guidance flips the classic CoT prompt pattern: "Prefer general instructions over prescriptive steps. A prompt like 'think thoroughly' often produces better reasoning than a hand-written step-by-step plan. Claude's reasoning frequently exceeds what a human would prescribe." [S1] — hand-authored step-by-step chains are now a *ceiling*, not a *floor*.
- **GPT-5 family**: `reasoning_effort` parameter (minimal/low/medium/high in GPT-5; GPT-5.1 adds a `none` level for zero reasoning-token consumption, compatible with web/file search tools). For `minimal`/`none`, OpenAI explicitly recommends *falling back to GPT-4.1-style prompting* — i.e., manual structure and explicit steps — because the model isn't doing internal deliberation at that setting. [S2][S9]
- Net effect for engineers: **CoT-by-prompt-engineering is now a targeted technique for low-effort/no-reasoning configurations**, not a general-purpose accuracy trick to sprinkle on every prompt to a frontier model.

### 6. Model-specific guidance snapshot [S1][S2][S9][S3]

| Model family | What changed vs. predecessor | Source |
|---|---|---|
| Claude Sonnet 5 / Opus 4.8 | response length, effort/thinking-depth calibration, tool-use triggering, **literal instruction following**, design/frontend defaults | [S1] |
| Claude Opus 5 | response verbosity ↑ (effort no longer reliably shortens it — must prompt explicitly for conciseness), agentic narration, task scope & over-verification (remove self-check instructions — Opus 5 verifies unprompted), subagent delegation ↑, self-correction | [S1] |
| Claude Fable 5.1 / Mythos 5.1 | effort levels, writes *fewer* user-facing progress updates during agentic work (ask explicitly, remove "keep it brief"), tool-call batching needs a turn-scoped reminder in long loops, thinking blocks must be passed back unchanged (editing history invalidates them) | [S1] |
| GPT-5 → 5.1 | 5.1 can be "excessively concise" — needs explicit persistence/completeness emphasis; new named `apply_patch`/`shell` tool types (35% failure-rate reduction vs. legacy patch tool); `none` reasoning mode | [S9] |
| GPT-5.1 → 5.2 | lower default verbosity while "remaining prompt-sensitive," stronger instruction adherence, more conservative/grounded answers, explicit length constraints become *more* necessary, not less | [S4] |
| Gemini 3 | favors "directness over persuasion, logic over verbosity"; over-analyzes verbose prompt-engineering tricks tuned for older models; XML-or-Markdown, never both; long-context instructions go at the *end*, after the data | [S3] |

### 7. Prompts as code: versioning, templating, eval-driven iteration [S17][S10]

General industry consensus, consistent across sources: prompts, model config, and retrieval logic are executable artifacts and should get the same treatment as code — stored in git (not a DB text column), reviewed via PR, tagged at release, gated by an automated eval suite in CI that blocks merge on regression, with a registry pointer the running app reads at request time. [S17]

Hamel Husain & Shreya Shankar's current (2026-09-18) methodology for the eval-then-prompt loop [S10]:
1. **Error analysis first.** "Error analysis is the most important activity in evals" — review 100+ diverse production traces, build a failure taxonomy, *then* decide what's worth a prompt change. Don't optimize a prompt in isolation from real failures.
2. **Binary grading over Likert.** Pass/Fail forces clearer, more consistent labeling; a 1-5 scale creates disagreement noise in the 3-vs-4 boundary and needs a larger sample to detect real differences.
3. **LLM-judge debugging**: when a judge disagrees with a human label, inspect disagreements manually before auto-tuning, check the judge has the context it needs, build one judge per failure type (not one judge catching everything — "the most common mistake"), validate on held-out data, and track TPR/TNR against human labels, not just accuracy.
4. **Where algorithmic optimization fits**: "Algorithms such as GEPA try changes to the judge's prompt and measure whether they improve agreement with human labels" — but this is a *later* step, after manual inspection has shown the problem isn't structural (i.e. not a missing capability or wrong task definition). Keep train/dev/test splits separate to avoid overfitting the optimizer to your dev set.

### 8. Automatic prompt optimization

**OpenAI Prompt Optimizer** (Playground) [S15][S22]:
- Two forms: an interactive chat-style "Optimize" button in the Playground that rewrites a pasted prompt against "current best practices" in one shot; and a dataset-backed variant driven by an Evals dataset with graders/annotations (now being sunset).
- Dataset-backed workflow requires ≥3 rows, each with a response and at least one grader result or human annotation (Good/Bad, custom columns, or free-text `output_feedback`). Click Optimize → runs in a background tab → review/test → repeat.
- OpenAI's own caution: "it's possible for the optimized prompt to perform worse than your original on specific inputs" — always manually re-evaluate before production use.
- **Deprecation**: per OpenAI's own notice (reported by eesel.ai), Evals go read-only 2026-10-31, full shutdown 2026-11-30 — this specific dataset-backed tool is being retired; treat as historical for anything published after that date. [S15]
- The **cookbook reference implementation** ("Optimize Prompts") is a 5-agent pipeline worth studying as a design pattern regardless of the product's fate [S22]:
  - Dev-Contradiction-Checker — flags genuine self-contradictions/impossibilities inside the developer prompt only (conservative: avoids flagging style/redundancy).
  - Format-Checker — flags missing/unclear output-format specs.
  - Few-Shot-Consistency-Checker — flags conflicts between stated rules and the prompt's own few-shot examples.
  - Dev-Rewriter and Few-Shot-Rewriter — apply targeted fixes once a checker flags an issue (Few-Shot-Rewriter runs *after* Dev-Rewriter, so the pipeline isn't fully parallel).
  - Graded with a Python string-check grader against a 20-example hand-labeled golden set spanning contradiction/format/few-shot/no-issue cases; model choice for the checkers was GPT-4.1, picked as "a balance between accuracy, cost, and speed" — i.e. this is optimization of a *narrow, mechanical* prompt-linting task, not general prompt quality.

**Anthropic Console tools** [S7]:
- **Prompt generator**: solves the blank-page problem — describe a task in plain language, Claude emits a structured, technique-following starting prompt (a starting point for iteration, not a finished artifact).
- **Prompt improver**: takes an existing prompt and rewrites it — adds CoT sections, restructures for clarity, adds prefill-style formatting guidance, adds error handling; also used to port prompts written for other vendors' models onto Claude conventions. Reported numbers from the original 2024-11 launch (repeated in 2026 secondary coverage, not re-verified against a fresh 2026 benchmark): 30% accuracy lift on a classification prompt, 100% word-count adherence on a summarization prompt after running through the improver.
- Note the asymmetry with the OpenAI tool: Anthropic's improver is single-shot LLM-rewrites-the-prompt (no dataset/grader loop mentioned in current docs); OpenAI's dataset-backed version is closer to a lightweight optimization loop with real held-out evaluation.

**DSPy** [S16][S6]:
DSPy replaces hand-written prompt strings with **Signatures** — a declarative spec of a module's input/output behavior, e.g. `"question -> answer"`, `"context: list[str], question: str -> answer: str"`, or a class-based version with per-field descriptions. The framework, not the author, then writes (and optimizes) the actual prompt text used to hit that spec.

VERBATIM code [S16] (DSPy docs, inline signature + ChainOfThought module):
```python
sentence = "it's a charming and often affecting journey."
classify = dspy.Predict('sentence -> sentiment: bool')
classify(sentence=sentence).sentiment
# Output: True

summarize = dspy.ChainOfThought('document -> summary')
response = summarize(document=document)
print(response.reasoning)  # auto-added CoT field, exposed by the module wrapper
```

Class-based signature example [S16]:
```python
from typing import Literal

class Emotion(dspy.Signature):
    """Classify emotion."""
    sentence: str = dspy.InputField()
    sentiment: Literal['sadness', 'joy', 'love', 'anger', 'fear', 'surprise'] = dspy.OutputField()

classify = dspy.Predict(Emotion)
```

DSPy's stated rationale [S16]: "Most people coerce LMs to do tasks by hacking long, brittle prompts... Writing signatures is far more modular, adaptive, and reproducible... In many cases, we found that compiling leads to better prompts than humans write. Not because DSPy optimizers are more creative than humans, but simply because they can try more things and tune the metrics directly." Explicit advice: don't hand-tune signature field names prematurely — "leave that kind of hacking to the DSPy compiler."

**MIPROv2** (Multiprompt Instruction PRoposal Optimizer v2) [S18]:
Jointly optimizes instructions and few-shot demos via 3 stages:
1. Bootstrap few-shot candidates — sample from trainset, run through the program, keep only examples where the output was correct, repeat until `num_candidates` sets of `max_bootstrapped_demos`/`max_labeled_demos` are built.
2. Propose instruction candidates — a `prompt_model` is given (a) a generated summary of dataset properties, (b) a summary of the program's code and which specific predictor needs an instruction, (c) the bootstrapped few-shot examples as reference I/O, and (d) a randomly sampled "tip" ("be creative", "be concise" etc.) to diversify exploration — then writes candidate instructions.
3. Bayesian Optimization over combinations of {instructions × demos} per predictor, evaluated on minibatches of `minibatch_size` each trial for `num_trials` trials, with the best-so-far average periodically checked against the full validation set (`minibatch_full_eval_steps`); returns the best-on-full-validation-set program at the end.

VERBATIM code [S18]:
```python
import dspy
from dspy.datasets.gsm8k import GSM8K, gsm8k_metric
from dspy.teleprompt import MIPROv2

lm = dspy.LM('openai/gpt-4o-mini', api_key='YOUR_OPENAI_API_KEY')
dspy.configure(lm=lm)

teleprompter = MIPROv2(
    metric=gsm8k_metric,
    auto="medium",  # light, medium, or heavy
)
gsm8k = GSM8K()
optimized_program = teleprompter.compile(
    dspy.ChainOfThought("question -> answer"),
    trainset=gsm8k.train,
)
optimized_program.save("optimized.json")
```

**GEPA** (Genetic-Pareto) — the paper and the algorithm [S5][S6]:

VERBATIM abstract [S5]:
> "Large language models (LLMs) are increasingly adapted to downstream tasks via reinforcement learning (RL) methods like Group Relative Policy Optimization (GRPO), which often require thousands of rollouts to learn new tasks. We argue that the interpretable nature of language often provides a much richer learning medium for LLMs, compared to policy gradients derived from sparse, scalar rewards. To test this, we introduce GEPA (Genetic-Pareto), a prompt optimizer that thoroughly incorporates natural language reflection to learn high-level rules from trial and error. Given any AI system containing one or more LLM prompts, GEPA samples trajectories (e.g., reasoning, tool calls, and tool outputs) and reflects on them in natural language to diagnose problems, propose and test prompt updates, and combine complementary lessons from the Pareto frontier of its own attempts. As a result of GEPA's design, it can often turn even just a few rollouts into a large quality gain. Across six tasks, GEPA outperforms GRPO by 6% on average and by up to 20%, while using up to 35x fewer rollouts. GEPA also outperforms the leading prompt optimizer, MIPROv2, by over 10% (e.g., +12% accuracy on AIME-2025), and demonstrates promising results as an inference-time search strategy for code optimization." (arXiv:2507.19457)

Algorithm, as documented in DSPy's implementation [S6]:
1. Initialize candidate pool with the unoptimized program.
2. Loop: sample a candidate from the Pareto frontier (probability ∝ coverage — how many eval instances it's currently best on) → sample a minibatch → run it, collecting execution traces **and textual feedback**, not just a scalar → pick a target module → LLM-reflect on the traces+feedback to propose a new instruction for that module → roll out the new candidate on the minibatch; if improved, evaluate on the full Pareto validation set and update the frontier → optionally merge/crossover best modules from different lineages.
3. Continue until the rollout/metric budget is exhausted; return the candidate with the best aggregate validation score.

Key structural idea distinguishing GEPA from MIPROv2: **the metric returns `dspy.Prediction(score=..., feedback=...)`**, i.e. a textual diagnosis alongside the number — "Actionable Side Information" that functions as the text-optimization analogue of a gradient. Recipe for GEPA-friendly feedback [S6]: reuse existing logs/unit-test output/profiler output rather than inventing new signal; decompose aggregate scores into per-objective components (correctness, latency, cost, safety); expose which pipeline stage failed; ground non-verifiable tasks in an LLM-as-judge rather than leaving them unscored.

Reported GEPA production numbers from the `gepa-ai/gepa` README [S6] (vendor-reported, not independently reproduced here): 90x cost reduction vs. Claude Opus on unspecified "enterprise agents"; 32%→89% accuracy on an ARC-AGI agent; 55%→82% resolve rate on a "Jinja coding agent with learned skills"; 40.2% cost savings on a cloud-scheduling-policy discovery task. Ecosystem integrations claimed: DSPy, MLflow, Comet ML Opik, Pydantic AI, Google ADK/Gemini Enterprise Agent Platform, LangChain adapter; "50+ production deployments" at companies including Shopify, Databricks, Dropbox, OpenAI (unverified beyond the project's own claim).

**SIMBA** (Stochastic Introspective Mini-Batch Ascent) [S6]: samples mini-batches, finds examples with high output variability (i.e., where the program is inconsistent), and for those either writes a self-reflective natural-language rule or promotes a successful run to a few-shot demo. Simpler than GEPA/MIPROv2, positioned as a lighter-weight introspective optimizer.

```python
optimizer = dspy.SIMBA(metric=your_metric)
optimized_program = optimizer.compile(your_program, trainset=your_trainset)
```

**TextGrad** [S20]: Stanford (Yuksekgonul, Bianchi, Boen, Liu, Huang, Guestrin — James Zou's group), arXiv 2406.07496, later in *Nature*. Treats a compound AI system as a computation graph where variables are inputs/outputs of (not necessarily differentiable) function calls, and back-propagates **natural-language critiques** as "textual gradients" instead of numeric ones — an explicit optimizer-as-autodiff metaphor, evaluated across scientific reasoning, coding, molecular design, and medical treatment planning. Positioned as the more general/academic ancestor of the DSPy-style optimizer family; less production tooling around it than GEPA/MIPROv2 as of 2026.

**Meta-prompting** (two-step diagnose-then-revise pattern), per OpenAI's GPT-5.1 guide [S9]:
1. Diagnosis call — feed the model the system prompt plus concrete failure examples; ask it to identify failure modes and quote the exact problematic prompt sections causing contradictions.
2. Revision call — feed back the failure analysis; ask for surgical edits that resolve conflicts, remove duplication, and make trade-offs explicit (their example: "be concise" vs. "err on the side of completeness").
OpenAI's stated advantage: this surfaces hidden contradictions more reliably than manual inspection of a long prompt.

### 9. Optimizing tool descriptions [S13]

Anthropic's own methodology (from "Writing effective tools for AI agents," 2025-09-11):
- Write tool descriptions as if "describing your tool to a new hire on your team" — spell out implicit context: specialized query formats, niche terminology, relationships between resources.
- Use unambiguous parameter names (`user_id`, not `user`).
- Control response verbosity with an explicit enum, e.g. a `ResponseFormat` param with `"detailed"`/`"concise"` — measured concrete example: a Slack tool response at 206 tokens (detailed) vs. 72 tokens (concise), roughly a 3x context reduction for the same underlying data.
- Error responses should be "specific and actionable," not opaque codes — steer the agent toward the correct next call, and toward token-efficient strategies ("many small targeted searches" over one broad one).
- **Namespacing**: group related tools under a common prefix, either service-based (`asana_search`, `jira_search`) or resource-based (`asana_projects_search`, `asana_users_search`); Anthropic notes prefix-vs-suffix namespacing has "non-trivial effects" on eval performance, i.e. it's worth actually testing, not assuming.
- **Evaluation/iteration loop**: (1) use Claude Code to explore the tool prototypes and generate "dozens" of realistic prompt/response pairs as an eval set; (2) run the eval via a simple agentic loop calling the real API; (3) read the raw transcripts and chain-of-thought to find confusion points — "Simply concatenate the transcripts from your evaluation agents and paste them into Claude Code. Claude is an expert at analyzing transcripts and refactoring lots of tools all at once."; (4) validate against a **held-out** test set to catch overfitting to the training evals.
- Headline result: "Claude Sonnet 3.5 achieved state-of-the-art performance on the SWE-bench Verified evaluation after we made precise refinements to tool descriptions, dramatically reducing error rates and improving task completion." [S13]

### 10. Studying real system prompts [S11][S12][S21]

- Primary corpus: `asgeirtj/system_prompts_leaks` on GitHub — actively maintained, organized by vendor folder, covers Anthropic (Fable 5.1, Opus 5.5, Sonnet 5.5, Claude Code, Claude Design, Claude Science, Claude Projects), OpenAI (ChatGPT variants, Codex tiers), Google (Gemini 3.8 Flash, 3.1 Pro, Antigravity CLI), xAI Grok, Perplexity, Microsoft Copilot, Cursor, Kimi, and more — with dated entries tracking revisions across releases. [S12]
- **Claude Code** (leaked 2026-03-31 via a packaging mistake, analyzed 2026-04-04): the system prompt is dynamically assembled (see Mechanics §1); notable disclosed features beyond the prompt itself include an "undercover mode" (`undercover.ts`, ~90 lines) that on activation instructs the model to never disclose it's an AI and strip Co-Authored-By attribution on external-repo contributions, and an `autoDream` idle-time memory-consolidation process that merges observations, resolves contradictions, and converts vague insights into stated facts. These are reported by secondary press coverage of the leak, not independently confirmed against the raw leaked source in this research pass — flagged for verification. [S12]
- **Cursor**: reported prompt language includes direct behavioral rules such as "never lie or make things up," "bias towards not asking the user for help," and a hard tool-use rule — "When making code changes, NEVER output code to the USER, unless requested. Instead use one of the code edit tools to implement the change." Structure: persona setup → communication guidelines → tool-usage guidelines → code-change guidelines. [S21]
- **Cross-tool pattern** (28+ tools surveyed): every serious coding-agent prompt pairs prose instructions with tool/function-call schemas rather than relying on prose alone; vendors iterate the schemas as fast as the prose (example cited: Windsurf's "Tools Wave 11" versioning, Cursor's "Agent Prompt 2.0" being called "a meaningful rewrite, not just incremental tuning"), which is evidence that **prompt iteration doesn't stop once a product ships** — it's a continuous response to observed production failure modes, same as the eval-driven loop described in §7. [S21]

### 11. Prompt layout constraints from caching [S8]

Full mechanics (Claude prompt caching, current docs):
- Cache prefix hierarchy is **`tools` → `system` → `messages`**; static content must precede dynamic content or the hash never matches. Anthropic's documented #1 mistake: putting a timestamp *before* the cache breakpoint inside `system` — this changes the prefix hash on every request and silences caching entirely.
- Up to **4 explicit cache breakpoints** (`cache_control: {"type": "ephemeral"}` on a content block) for sections with different change frequencies; or a single top-level `cache_control` for automatic caching that Anthropic moves forward on every turn in multi-turn conversations.
- **20-block lookback window**: on a cache miss for the current prefix hash, Claude walks backward up to 20 content blocks looking for an earlier cache write before giving up — in a fast-growing conversation, a single breakpoint written too early can fall outside that window and silently stop being useful; multiple breakpoints are the documented fix.
- **Minimum cacheable prefix size is model-dependent**: 512 tokens (Fable 5.1, Opus 5.5, Sonnet 5.5/5, Haiku 4.5) up to 4,096 tokens (Opus 4.6/4.5) — a short system prompt literally cannot be cached regardless of `cache_control` placement; check `cache_creation_input_tokens`/`cache_read_input_tokens` in the response to confirm a hit actually happened.
- **Pricing multipliers** relative to base input price: 5-min cache write 1.25x, 1-hour cache write 2.0x, cache read ~0.1x for most models but as low as 0.025x (Fable 5.1/Mythos 5.1) or 0.05x (Opus 5.5) — i.e. re-reading a cached 100K-token document can cost ~96% less than paying for it fresh (worked example in the docs: $500 write → $20 read on Opus 5.5 pricing).
- **What silently invalidates the whole cache**: changing tool definitions, toggling web search, toggling citations, changing "speed mode." Narrower invalidation: `tool_choice` and adding images only invalidate the message-level cache, not system/tools.
- Practical engineering rule set distilled from the docs: tools first → static system instructions → large reusable documents (with their own breakpoint) → growing conversation history → dynamic/per-request content (timestamps, live user input) last, never before a breakpoint.

## Numbers

| Number | Condition | Source |
|---|---|---|
| Query-after-documents layout improves response quality "up to 30%" | Anthropic's internal tests, "especially with complex, multidocument inputs," no external benchmark named | [S1] |
| GEPA beats GRPO by 6% avg, up to 20%, with up to 35x fewer rollouts | 6 tasks, GEPA paper (arXiv:2507.19457) | [S5] |
| GEPA beats MIPROv2 by >10% overall, +12% accuracy on AIME-2025 | same paper | [S5] |
| Slack tool response: 206 tokens (detailed) vs. 72 tokens (concise) | Anthropic's own worked example in the tool-writing guide | [S13] |
| SOTA on SWE-bench Verified after tool-description refinement | Claude Sonnet 3.5, Anthropic's own report, no numeric score given in the fetched excerpt | [S13] |
| Prompt improver: 30% accuracy lift (classification), 100% word-count adherence (summarization) | Anthropic Console prompt improver, original 2024 launch numbers, repeated in 2026 secondary coverage | [S7] |
| Legacy `apply_patch` → new named tool type: 35% failure-rate reduction | OpenAI GPT-5.1 migration guidance | [S9] |
| ~20% failure rate on Pi's edit-tool schema | Opus 4.8 / Sonnet 5, one practitioner's (Armin Ronacher) extended-session testing, not a vendor benchmark | [S14] |
| Prompt-cache pricing: 1.25x (5-min write), 2.0x (1-hour write), ~0.1x (read, most models), 0.025x (read, Fable 5.1/Mythos 5.1), 0.05x (read, Opus 5.5) | Anthropic prompt-caching docs, current pricing multipliers | [S8] |
| Cache minimum prefix: 512 tokens (Fable 5.1/Opus 5.5/Sonnet 5.5/5/Haiku 4.5) up to 4,096 tokens (Opus 4.6/4.5) | Anthropic prompt-caching docs | [S8] |
| 90x cost reduction (GEPA vs. Claude Opus, "enterprise agents") | gepa-ai/gepa README, vendor-reported, task undefined | [S6] |
| ARC-AGI agent accuracy 32%→89% with GEPA | gepa-ai/gepa README, vendor-reported | [S6] |

## Pitfalls, limits, criticism

- **Overtriggering is the new undertriggering.** Every vendor's current guidance independently converges on: aggressive imperative language ("CRITICAL", "MUST", "ALWAYS", "if in doubt, use X") that used to compensate for weak instruction-following now causes the opposite failure on frontier models — unwanted tool calls, excessive verification, excessive subagent spawning, excessive upfront exploration. This is a genuine regression risk for anyone reusing prompt libraries written for 2024-era models. [S1][S2]
- **Literal instruction-following cuts both ways.** GPT-5's own guide: contradictory or vague instructions "can be more damaging to GPT-5 than to other models" because the model spends reasoning tokens trying to reconcile them instead of ignoring the noise the way a less literal model would. [S2]
- **Tool schemas are not distribution-neutral.** Ronacher's documented Claude regression suggests post-training on a single dominant harness (Claude Code) can make the model worse at other, stricter tool schemas — a risk for any agent framework that isn't the vendor's own reference harness; enabling strict tool-calling mode is the current mitigation. [S14]
- **Automated prompt optimizers are narrow.** OpenAI's own optimizer documentation warns the optimized prompt can perform *worse* than the original on specific inputs and must be manually re-evaluated — it is tuned for mechanical defects (contradictions, missing format specs) via a small (20-example) hand-labeled set, not a guarantee of general quality improvement. [S15][S22]
- **Algorithmic optimization (GEPA/MIPROv2) is not a substitute for error analysis.** Hamel Husain/Shreya Shankar's explicit warning: don't reach for GEPA-style tuning until manual inspection has ruled out that the failure is structural (wrong task definition, missing capability) rather than a prompt-wording problem — algorithms will happily optimize the wrong objective if you skip this step. [S10]
- **Likert-scale grading is actively discouraged** for eval-driven prompt iteration — the 3-vs-4 boundary produces annotator disagreement and dilutes the signal an optimizer or a human needs to act on. [S10]
- **Overfitting to a dev set** is a live risk for any optimizer (DSPy or OpenAI's): keep train/dev/test splits separate and validate the final candidate on a genuinely held-out set. [S10][S13]
- **Leaked-prompt claims need a skeptical read.** Secondary press coverage of the March 2026 Claude Code leak (undercover mode, autoDream) is sensational in tone and was not cross-checked against primary leaked source in this research pass — treat as reported-but-unverified pending a look at the raw leak or Anthropic's own statement. [S12] — see Unverified section.
- **"Prompts as code" tooling landscape is fragmented and partly time-bound.** OpenAI's dataset-backed Evals/Prompt-Optimizer product is being sunset within weeks of this book's target date (2026-10-31 read-only, 2026-11-30 shutdown) — any recipe built on that specific product needs a migration note. [S15]

## What changed in the last 6 months (roughly April-September 2026)

- Claude Code's full system-prompt assembly logic became public via the March 2026 source leak, giving the field its first fully transparent look at a production agent's conditional prompt-building (cache boundary markers, output-style variants, per-connection MCP injection). [S12][S11]
- Documented cross-model tool-calling regression (Ronacher, July 2026) — the first concrete evidence that *newer* frontier models can be *worse* at strict tool-schema adherence than older ones, tied to training-harness artifacts rather than raw capability. [S14]
- GPT-5.1 → GPT-5.2 guidance shows the industry converging further on "default low verbosity, be explicit if you want more" as the baseline assumption for prompt authors, continuing a trend visible since GPT-5. [S9][S4]
- Hamel Husain & Shreya Shankar's Sept 2026 "AI Evals FAQ" update explicitly names GEPA as the algorithmic option for judge-prompt tuning, folding the DSPy optimizer ecosystem into mainstream eval methodology rather than treating it as a niche research tool. [S10]
- GEPA's ICLR 2026 Oral acceptance and its expansion into a vendor-neutral `gepa-ai/gepa` package (with `optimize_anything`, not just DSPy integration) mark its move from "one DSPy optimizer" to "general-purpose reflective optimizer for text artifacts," claiming integrations across MLflow, Opik, Pydantic AI, and Google's ADK. [S5][S6]
- Anthropic's prompting-best-practices doc now ships per-model sub-pages (Opus 5.5 vs. Opus 5 vs. Sonnet 5.5 vs. Sonnet 5 vs. Fable 5.1 all get separate treatment) — a structural sign that model-specific prompting knowledge is now considered too large and too fast-changing for one shared document. [S1]
- OpenAI began sunsetting its dataset-backed Prompt Optimizer / Evals product for shutdown by end of November 2026 — engineers should not build new tooling dependent on it. [S15]

## Diagram candidates

1. **Claude Code system-prompt assembly pipeline** — actors: user config, environment, MCP servers, output style; arrows into a "prompt assembler"; output split into cacheable prefix (left of boundary marker) vs. dynamic suffix (right). States: always-included vs. conditional sections. [S11]
2. **Prompt caching hierarchy and lookback window** — actors: `tools`/`system`/`messages` blocks in order; arrow showing the 20-block backward search on a cache-hash miss; two paths: hit (0.1x-0.025x cost) vs. miss (1.25x-2.0x write cost). [S8]
3. **The "right altitude" spectrum** — a single axis from "too specific / brittle if-else" to "too vague / assumes context," with the target zone marked and "canonical examples" as the mechanism that holds the target. [S19]
4. **GEPA optimization loop** — actors: candidate pool / Pareto frontier, minibatch sampler, task LM, reflection LM; arrows: sample candidate → run on minibatch → collect trace+feedback → reflect → mutate → evaluate → update frontier; loop until budget exhausted. [S6]
5. **MIPROv2 three-stage pipeline** — bootstrap few-shot demos → propose instructions (fed by dataset summary + program summary + demos + random "tip") → Bayesian search over {instruction × demo} combinations, with minibatch vs. full-validation evaluation as two nested loops. [S18]
6. **Overtriggering vs. undertriggering timeline** — x-axis: model generations (GPT-4/Claude 3 era → current 5.x/Opus-Sonnet-5 era); y-axis: same aggressive prompt's effect, going from "ignored" to "overtriggers"; annotate the CRITICAL/MUST example. [S1]
7. **5-agent OpenAI prompt-optimizer pipeline** — actors: Dev-Contradiction-Checker, Format-Checker, Few-Shot-Consistency-Checker (parallel) → conditionally trigger Dev-Rewriter → Few-Shot-Rewriter (sequential dependency); grading loop against the 20-example golden set. [S22]
8. **Tool-description iteration loop (Anthropic methodology)** — actors: prototype tools, Claude Code (generates eval prompts), eval harness (runs agentic loop), transcripts, Claude Code again (reads transcripts, rewrites tool defs), held-out test set (final check). [S13]
9. **Prompt-as-code CI gate** — actors: developer, git PR with prompt diff, eval suite (regression gate), registry pointer, running app; arrow showing a failing eval blocking merge. [S17]
10. **DSPy compile-time flow** — actors: Signature (declarative spec) → Module (Predict/ChainOfThought, wraps signature) → Optimizer (MIPROv2/GEPA/SIMBA, takes trainset+metric) → compiled/optimized program (concrete prompt + demos) saved to JSON. [S16][S18][S6]

### Chart candidates
- GEPA vs. GRPO vs. MIPROv2 accuracy/rollout-efficiency comparison across the paper's six tasks (would need the full results table from the paper body, not just the abstract — flagged for a follow-up read of the PDF body if this chapter wants a real chart). [S5]
- Prompt-cache cost curve: cost per 100K tokens as a function of read-vs-write and 5-min-vs-1-hour TTL, using the worked Opus 5.5 example ($500 write vs. $20 read). [S8]

## Glossary

- **Right altitude**: Anthropic's term for the instruction-specificity sweet spot between brittle over-specification and ineffective vagueness. [S19]
- **Adaptive thinking**: Claude's reasoning mode where the model itself decides when/how much to "think," controlled qualitatively via `effort` rather than a manual token budget. [S1]
- **Reasoning effort**: OpenAI's analogous parameter (`minimal`/`low`/`medium`/`high`, plus `none` from GPT-5.1) controlling how much internal deliberation GPT-5.x models perform before answering. [S2][S9]
- **Prompt caching breakpoint**: an explicit (`cache_control`) or automatic marker in a request telling the API where the reusable prefix ends. [S8]
- **DSPy Signature**: a declarative input/output spec for an LM call (e.g. `"question -> answer"`) that DSPy compiles into an actual prompt, as opposed to hand-writing the prompt text. [S16]
- **MIPROv2**: DSPy optimizer that jointly searches over few-shot demo sets and proposed instructions using Bayesian Optimization. [S18]
- **GEPA (Genetic-Pareto)**: reflective prompt/text optimizer that uses LLM-generated natural-language reflection on execution traces (not just scalar reward) plus Pareto-frontier candidate selection. [S5][S6]
- **Actionable Side Information (ASI)**: GEPA's term for the textual diagnostic feedback returned by an evaluator alongside a score — the "gradient" of text optimization. [S6]
- **SIMBA**: DSPy optimizer that mines mini-batches for high-variability examples and turns them into either a self-reflective rule or a new few-shot demo. [S6]
- **TextGrad**: Stanford framework that backpropagates natural-language "textual gradients" through a compound AI system modeled as a computation graph. [S20]
- **Meta-prompting**: using a model call to diagnose and/or rewrite another prompt (diagnose-then-revise pattern), as distinct from few-shot or CoT prompting of the target task itself. [S9]
- **Namespacing (tools)**: prefixing/suffixing related tool names by service or resource to help an agent disambiguate similar tools. [S13]
- **Cache boundary marker**: a literal sentinel string separating a cacheable static prompt prefix from per-session dynamic content, as seen in the leaked Claude Code prompt. [S11]

## Unverified / open questions

- The specific "undercover mode" and "autoDream" features attributed to the leaked Claude Code source (March 2026) come from secondary/press summaries (VentureBeat-style coverage, dev.to) of the leak, not a primary read of the leaked repository itself in this research pass. Treat these two claims as **reported, not independently confirmed** — worth a follow-up read of the actual leaked files or an Anthropic statement before citing as fact in the book. [S12]
- Anthropic's Console prompt-improver accuracy numbers (30% / 100%) trace back to the tool's original 2024 launch and are repeated verbatim by 2026 secondary sources; no fresh 2026 benchmark of the current improver was found in this pass.
- Could not obtain the GEPA paper's full six-task results table (only the abstract-level aggregate numbers) — a real chart for "Diagram candidates" would need a follow-up fetch of the PDF body (arxiv.org/pdf/2507.19457) rather than the HTML abstract page.
- The Gemini 3 guidance summarized here comes from Philipp Schmid's write-up of Google's user guide, not Google's own primary document — the primary URL wasn't located/fetched directly in this pass (session's web-search budget was exhausted before this could be re-attempted).
- OpenAI's prompt-optimizer "graders" section in the reference cookbook (5-agent pipeline) is one specific worked example (contradiction/format/few-shot checking); it's unclear from what was fetched whether the general-purpose interactive "Optimize" button in the Playground uses the same architecture or a different, undocumented one.
- Did not get primary-source confirmation of Eugene Yan's or Armin Ronacher's full 2026 output beyond the two Ronacher posts fetched directly (search budget ran out); Eugene Yan's "Patterns for Building LLM-based Systems" is a well-known older reference (pre-2026) still circulated in 2026 discussions, cross-link candidate for ch. 17 (evals) rather than pure prompting.

## Sources

- [S1] "Prompting best practices," Anthropic, Claude Platform Docs (platform.claude.com), undated page reflecting current Sept 2026 model set, https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices, accessed 2026-09-30
- [S2] "GPT-5 Prompting Guide," OpenAI Cookbook, https://developers.openai.com/cookbook/examples/gpt-5/gpt-5_prompting_guide, accessed 2026-09-30
- [S3] Philipp Schmid, "Gemini 3 Prompting: Best Practices for General Usage," philschmid.de, published 2025-11-19, https://www.philschmid.de/gemini-3-prompt-practices, accessed 2026-09-30
- [S4] "GPT-5.2 Prompting Guide," OpenAI Cookbook, https://developers.openai.com/cookbook/examples/gpt-5/gpt-5-2_prompting_guide, accessed 2026-09-30
- [S5] Agrawal et al., "GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning," arXiv:2507.19457, submitted 2025-07-25, accepted ICLR 2026 (Oral), https://arxiv.org/abs/2507.19457, accessed 2026-09-30
- [S6] "GEPA: Reflective Prompt Optimizer" (dspy.GEPA docs) and gepa-ai/gepa README, https://raw.githubusercontent.com/stanfordnlp/dspy/main/docs/docs/api/optimizers/GEPA/overview.md and https://github.com/gepa-ai/gepa, accessed 2026-09-30
- [S7] Anthropic Console "prompt generator" / "prompt improver" — Anthropic news posts and Console prompting-tools docs, https://www.anthropic.com/news/prompt-generator, https://www.anthropic.com/news/prompt-improver, https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-tools, accessed 2026-09-30
- [S8] "Prompt caching," Anthropic, Claude Platform Docs, https://platform.claude.com/docs/en/build-with-claude/prompt-caching, accessed 2026-09-30
- [S9] "GPT-5.1 Prompting Guide," OpenAI Cookbook, https://developers.openai.com/cookbook/examples/gpt-5/gpt-5-1_prompting_guide, accessed 2026-09-30
- [S10] Hamel Husain & Shreya Shankar, "AI Evals: Everything You Need to Know" (evals-faq), hamel.dev, published 2026-09-18, updated 2026-09-21, https://hamel.dev/blog/posts/evals-faq/, accessed 2026-09-30
- [S11] Drew Breunig, "How Claude Code Builds a System Prompt," dbreunig.com, published 2026-04-04, https://www.dbreunig.com/2026/04/04/how-claude-code-builds-a-system-prompt.html, accessed 2026-09-30
- [S12] asgeirtj/system_prompts_leaks, GitHub repository (README), plus secondary coverage (VentureBeat, dev.to) of the 2026-03-31 Claude Code source leak, https://github.com/asgeirtj/system_prompts_leaks, accessed 2026-09-30
- [S13] "Writing effective tools for AI agents — using AI agents," Anthropic Engineering blog, published 2025-09-11, https://www.anthropic.com/engineering/writing-tools-for-agents, accessed 2026-09-30
- [S14] Armin Ronacher, "Better Models: Worse Tools," lucumr.pocoo.org, published 2026-07-04, https://lucumr.pocoo.org/2026/7/4/better-models-worse-tools/, accessed 2026-09-30
- [S15] eesel.ai, "OpenAI Prompt Optimizer: How to use it (2026)," summarizing OpenAI's own deprecation notice, https://www.eesel.ai/blog/openai-prompt-optimizer, accessed 2026-09-30
- [S16] "Signatures," DSPy docs, https://raw.githubusercontent.com/stanfordnlp/dspy/main/docs/docs/learn/programming/signatures.md, accessed 2026-09-30
- [S17] Various LLMOps practitioner posts on prompt versioning as code (aggregated search summary; primary long-form post at markaicode.com returned 403 on direct fetch), search-result synthesis only, accessed 2026-09-30 — **note: this source is a search-engine synthesis, not a single verified primary article; treat claims here as representative industry consensus, not a specific citable quote**
- [S18] "dspy.MIPROv2," DSPy docs, https://raw.githubusercontent.com/stanfordnlp/dspy/main/docs/docs/api/optimizers/MIPROv2.md, accessed 2026-09-30
- [S19] "Effective context engineering for AI agents," Anthropic Engineering blog, published 2025-09-29, https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents, accessed 2026-09-30 (cross-link: primary source belongs to ch. 02; cited here only for the "right altitude" instruction-design angle)
- [S20] Yuksekgonul, Bianchi, Boen, Liu, Huang, Guestrin, "TextGrad: Automatic 'Differentiation' via Text," arXiv:2406.07496, published 2024-06, later in *Nature*, accessed via search-result synthesis 2026-09-30
- [S21] Search-result synthesis on Cursor system-prompt leak coverage (thehackernews.com, geeky-gadgets.com, patmcguinness.substack.com, augmentcode.com/learn/leaked-ai-system-prompts-github) — direct primary fetch of the leaked Cursor prompt text was not performed in this pass; quotes reproduced are as relayed by these secondary sources, accessed 2026-09-30
- [S22] "Optimize Prompts," OpenAI Cookbook, https://developers.openai.com/cookbook/examples/optimize_prompts, accessed 2026-09-30
