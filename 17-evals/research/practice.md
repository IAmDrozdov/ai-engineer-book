# 17. Метрики, evals и приёмочные тесты — engineering practice notes

## TL;DR (what an engineer must know today)

- The vocabulary is now standardized enough to quote: **task/problem/test case, trial, grader, transcript/trace/trajectory, outcome, evaluation harness, agent harness/scaffold, evaluation suite** — as defined in Anthropic's Jan 2026 "Demystifying evals for AI agents" [S1]. Use these words exactly; they map 1:1 to what practitioner tooling (Inspect AI's Task/Solver/Scorer [S9], pydantic-evals' Case/Dataset/Evaluator [S7]) implements.
- Three grader families, not two: **code-based** (fast/cheap/objective, brittle to valid variation), **model-based/LLM-as-judge** (flexible, needs calibration), **human** (gold standard, slow/expensive) [S1]. Real systems combine all three with weighted or binary-AND scoring per task [S1].
- **Capability evals** should start at a *low* pass rate (they're the hill to climb); **regression evals** should sit near 100% and alarm on any drop. A capability eval "graduates" into a regression suite once an agent is mature on it [S1].
- **pass@k** (≥1 success in k tries) rises with k; **pass^k** (all k tries succeed) falls with k — they diverge sharply and answer different product questions (best-of-many vs. reliability-every-time) [S1][S20].
- **Error analysis before metrics.** Hamel Husain and Shreya Shankar's workflow: open coding (free-text notes per trace, "journaling") → axial coding (group into a failure taxonomy, count frequencies) → only then build graders/metrics for the taxonomy you actually found [S3][S24]. "Axial coding is the most important step" [S24].
- **LLM judges must be validated like a classifier**, not trusted on vibes: hold out dev/test splits, report **TPR (catches real failures) and TNR (passes real good outputs)** separately, never a single "agreement %" on an imbalanced set [S24].
- **Sample sizes are smaller than people assume early on**: 20-50 real-failure-derived tasks is "a great start" for capability evals because early-stage effect sizes are large [S1]; error-analysis saturation is reachable around ~100 diverse traces [S3][S24]; LLM-judge calibration wants 100-200 labeled examples per failure mode, split ~40/40/20 dev/test/train-ish [S24].
- **0% pass@100 usually means a broken task, not an incapable model** — a load-bearing debugging heuristic from Anthropic's own agent-eval practice [S1].
- Read the transcripts. Every practitioner source converges on this: Anthropic invests in transcript-viewing tooling and treats it as "a critical skill" [S1]; Hamel's whole method is annotators reading traces [S3][S24].
- **Eval saturation is a real failure mode**: SWE-bench Verified went 40%→>80% in a year [S1]; contamination critiques argue much of that ceiling is memorization, not skill, on the *same* benchmark [S16].
- 2026 consolidation: promptfoo was acquired by OpenAI (Mar 2026, stays OSS/MIT) [S12], Langfuse joined ClickHouse (Jan 2026, stays OSS, moved to ClickHouse-backed storage) [S13], W&B Weave now runs on CoreWeave infrastructure/accounts [S11], and **OpenAI's own `platform.openai.com` Evals product is being shut down** (read-only 2026-10-31, off 2026-11-30) [S28] — eval tooling is actively being re-platformed under you this year.
- Benchmark families are forking into "-Pro" / "v2" generations explicitly to fight contamination and end-state-only grading: SWE-Bench Pro (1,865 problems, held-out+commercial splits) [S17], OSWorld-Pro (process/subgoal-level grading, not just end-state) [S19], Gaia2 (dynamic/asynchronous environments, multi-agent) [S18], τ³-bench (voice + knowledge domains, 75+ task-quality fixes) [S4].
- Chapter boundaries: tool-call schema/description design → ch.03; prompt-optimization loops that *consume* eval signal → ch.04; multi-agent-specific eval concerns (coordination, handoffs) → ch.13; RAG-specific retrieval metrics beyond the basics noted here → ch.14; auth/permissions testing → ch.15; red-teaming/safety evals → ch.16.

## Current state and versions (as of 2026-09-30)

- **Anthropic "Demystifying evals for AI agents"** — published 2026-01-09, by Mikaela Grace, Jeremy Hadfield, Rodrigo Olivares, Jiri De Jonghe — is the closest thing to a canonical, current vendor reference for agent evals; treat it as the spine of this chapter [S1].
- **Hamel Husain / Shreya Shankar "AI Evals" course material**: the FAQ page was published 2026-09-18 and modified 2026-09-21 [S24] — i.e. updated within the last two weeks of "today." Their earlier posts (evals overview 2024-03-29 [S2]; field guide 2025-03-24 [S3]) remain the methodological base; the FAQ is the current, most precise statement of sample sizes and TPR/TNR.
- **Inspect AI** (UK AI Security Institute + Meridian Labs): actively maintained OSS framework, 200+ pre-built evals, agent support (ReAct, multi-agent primitives, can wrap external CLIs like Claude Code/Codex CLI/Gemini CLI as agents-under-test), sandboxing via Docker/K8s/Modal/Proxmox/Vagrant [S9].
- **pydantic-evals**: code-first framework (`Case`, `Dataset`, `Evaluator`), ships "Agentic Evaluators" that grade tool-call sequences/arguments (not just final output), span-based evaluation over OpenTelemetry traces, integrates with Logfire [S7].
- **Ragas**: reframed around an "experiments-first" workflow ("move from vibe checks to systematic evaluation loops"), custom metrics via decorators, docs last updated 2025-12-09 [S8].
- **DeepEval**: `deepeval test run` plugs into pytest (Vitest for TS); metrics include GEval (rubric-based), a no-LLM-key alternative, conversational metrics, and `TaskCompletionMetric` for agent trajectories; integrates with LangChain/LangGraph/OpenAI/Pydantic AI/CrewAI [S26].
- **Observability platforms** all converged on the same shape in 2026 — traces via OpenTelemetry/OTLP + online and offline evals + dataset/experiment management: Langfuse (OSS, now ClickHouse-backed) [S13], LangSmith (datasets/experiments/online eval/pairwise eval, "runs"/"threads"/"splits"/"versions" vocabulary) [S25], Arize Phoenix (built on OpenInference/OpenTelemetry, integrates Ragas/DeepEval/Cleanlab as pluggable evaluators) [S10], W&B Weave (now under CoreWeave, requires a "CoreWeave Forge account") [S11].
- **OpenTelemetry GenAI semantic conventions** moved to their own repo (`open-telemetry/semantic-conventions-genai`), status still **Development** (not Stable) as of the current snapshot; it defines `gen_ai.*` span/attribute conventions specifically for agent spans (`create_agent`, `invoke_agent`, `invoke_workflow`, `plan`, `execute_tool`) in addition to the older single-call LLM spans [S5].
- **OpenAI's own Evals product** (the `platform.openai.com` dashboard) is being sunset: read-only from 2026-10-31, shut down 2026-11-30 [S28]. The `openai/evals` GitHub repo (19.5k★, YAML/JSON template based) is not archived but is now positioned behind the dashboard-first workflow that's going away — net effect: OpenAI's evals story is consolidating around **promptfoo**, which it acquired in March 2026 and has pledged to keep OSS/MIT [S12][S29].
- **Benchmarks currently in play**: SWE-bench (original, Verified, Multilingual, Multimodal, Lite) [S6]; SWE-Bench Pro (1,865 problems / 41 repos, public+held-out+commercial splits) [S17]; Terminal-Bench 2.0/2.1 (via the Harbor registry [S1]) with Terminal-Bench-Science 0.1 as an August-2026 scientific-workflow spinoff (70 tasks from 920 proposals, 3 trials/task) [S15]; τ³-bench (τ²-bench's successor as of mid-2026, adds voice full-duplex + `banking_knowledge` RAG domain + 75 task fixes, v1.0.1 July-2026 regrade) [S4]; Gaia2 (Feb 2026, dynamic/async environments, built on Meta's "Agents Research Environments"/ARE) [S18]; OSWorld-Pro (Sept 2026, process-based/subgoal grading) [S19].

## Timeline

- **2024-03-29** — Hamel Husain, "Your AI Product Needs Evals": early popularization of the error-analysis-first workflow for LLM apps [S2].
- **2024-06** — τ-bench paper (Yao, Shinn, Razavi, Narasimhan): introduces pass^k, retail/airline domains, shows SOTA agents <50% success, pass@8 <25% in retail [S20].
- **2025-03-24** — Hamel Husain, "A Field Guide to Rapidly Improving AI Products": formalizes open coding → LLM-built taxonomy → axial coding → quantification, with the NurtureBoss case study (date-handling failure rate 33%→95% after targeted fixes) [S3].
- **2025-06** — τ²-Bench paper (Barres et al., Sierra): dual-control environments (both agent and user can act on shared state), new Telecom domain modeled as a Dec-POMDP [S21].
- **2025-09-11** — Anthropic, "Writing effective tools for agents": eval-driven tool design loop (generate eval tasks from real use cases → run agentic loop → track tool errors/latency/tokens → paste transcripts back into Claude Code to have it rewrite the tools) — cross-link ch.03 [S23].
- **2025-09-21** (rev. 2025-11-14) — SWE-Bench Pro paper: 1,865 problems across 41 repos, explicitly designed contamination-resistant via held-out and commercial (never-public) splits [S17].
- **2025-12-11** (rev. 2025-12-22) — "Does SWE-Bench-Verified Test Agent Ability or Model Memory?": models 3x better at issue-resolution and 6x better at file-localization on SWE-bench-Verified vs. comparable benchmarks (BeetleBox, SWE-rebench) — strong contamination signal [S16].
- **2026-01-09** — Anthropic, "Demystifying evals for AI agents" — the field's current reference doc [S1].
- **2026-01-16/17** — Langfuse joins ClickHouse; stays OSS/self-hostable, migrating storage to ClickHouse v3 for high-throughput trace ingestion [S13].
- **2026-02-12** — Gaia2 paper (Meta): dynamic/asynchronous agent environments, multi-agent collaboration, GPT-5 42% pass@1 (best overall, weak on time-sensitive tasks), Kimi-K2 21% pass@1 (best open model) [S18].
- **2026-03-09** — Promptfoo acquired by OpenAI; commits to keep the OSS suite "best-in-class red teaming, static scanning, and evals tool" [S12].
- **2026-06-28** — "Quantifying Ranking Uncertainty in LLM Benchmarks": rank-confidence-interval method applied to MMLU, showing subject-level ranking variability is "substantial" [S30].
- **2026-07 (v1.0.1)** — τ²-bench/τ³-bench grading fix release: 75+ task-quality fixes across banking/airline/retail based on the SABER audit paper (arXiv:2512.07850); scores from before/after this tag are explicitly **not comparable** [S4].
- **2026-08-09** — DeepSeek V4 Flash 0731 reported at 82.7% on Terminal-Bench 2.1 with a public harness (HN thread, points 37; treat as a data point to verify against the official leaderboard) [S32].
- **2026-08-27** — Terminal-Bench-Science 0.1 launched (Stanford + Terminal-Bench/Harbor teams, 376 contributors/22 countries); resolution rates on the same models drop >10pp vs. Terminal-Bench, evidence the science domain is harder, not just differently distributed [S15].
- **2026-09-10** — Cognition reports SWE-2 at 92.8 on Terminal-Bench 2.1 (vendor-reported, "pending independent replication," built on a Kimi K3 base, 2.8T total/104B active params MoE) [S14].
- **2026-09-18/21** — Hamel Husain "AI Evals FAQ" published/updated — current canonical numbers for sample sizes and TPR/TNR practice [S24].
- **2026-09-21** — OSWorld-Pro paper: process-based/subgoal evaluation for computer-use agents; Claude Opus 5 75.7% on OSWorld-Pro vs. 83.4% on original OSWorld — the harder, more granular grading compresses reported scores [S19].
- **2026-10-31 / 2026-11-30** — `platform.openai.com` Evals goes read-only, then shuts down [S28].

## Mechanics

### The vocabulary (use it precisely) [S1]
- **Task / problem / test case** — one test with defined inputs + success criteria.
- **Trial** — one attempt at a task; multiple trials are run because outputs vary run-to-run.
- **Grader** — logic scoring some aspect of performance; a task can carry multiple graders, each with multiple assertions/checks.
- **Transcript / trace / trajectory** — the complete record of a trial (outputs, tool calls, reasoning, intermediate results); for the Anthropic API this is literally the full `messages` array at the end of a run.
- **Outcome** — the final state of the *environment*, not the agent's claim about it (Anthropic's example: the agent says "your flight is booked," the outcome is whether a row exists in the reservations DB).
- **Evaluation harness** — infra that runs evals end-to-end (instructions, tools, concurrency, recording, grading, aggregation).
- **Agent harness / scaffold** — the system that lets a model act as an agent (tool orchestration). Evaluating "an agent" always means evaluating harness + model together.
- **Evaluation suite** — a collection of tasks sharing a broad goal (e.g., a support suite covering refunds/cancellations/escalations).

### Grader types, verbatim comparison [S1]

| Type | Methods | Strengths | Weaknesses |
|---|---|---|---|
| Code-based | string match (exact/regex/fuzzy), binary tests (fail-to-pass/pass-to-pass), static analysis (lint/type/security), outcome verification, tool-call verification, transcript analysis (turns, tokens) | fast, cheap, objective, reproducible, easy to debug | brittle to valid variation, low nuance, poor for subjective tasks |
| Model-based | rubric scoring, natural-language assertions, pairwise comparison, reference-based eval, multi-judge consensus | flexible, scalable, captures nuance, handles open-ended/freeform output | non-deterministic, costlier, needs calibration against humans |
| Human | SME review, crowdsourced judgment, spot-check sampling, A/B testing, inter-annotator agreement | gold-standard, matches expert judgment, calibrates model-based graders | expensive, slow, needs expert access at scale |

Scoring per task can be **weighted** (combined scores must hit a threshold), **binary** (all graders must pass), or **hybrid** [S1].

### Capability vs. regression evals [S1]
Capability evals target *low* initial pass rates (that's the point — they measure headroom); regression evals target ~100% and exist purely to catch backsliding. A capability eval "graduates" into the regression suite once the agent reliably clears it. This reframes "eval saturation" as success, not a broken eval — *until* you have nothing left to hill-climb on, at which point you need a new capability eval.

### Non-determinism: pass@k vs pass^k [S1][S20]
- **pass@k**: P(≥1 success in k attempts). Rises with k. 50% pass@1 = succeeds on first try half the time. Use when one success is enough (coding: "did it find *a* fix").
- **pass^k**: P(all k attempts succeed). Falls with k — a harder bar. COMPOSED arithmetic from Anthropic's own worked example [S1]: at 75% per-trial success, 3 trials all succeeding ≈ 0.75³ ≈ 42%. Use when consistency matters (customer-facing agents where every interaction must work).
- They're identical at k=1 and diverge sharply as k grows — by k=10, pass@k → ~100% while pass^k → ~0% [S1].
- τ-bench's original numbers ground this: SOTA function-calling agents <50% success; pass@8 in retail <25%, i.e. even 8 shots barely helps because failures are systematic, not random noise [S20].

### Error analysis: open coding → axial coding [S3][S24]
Canonical Hamel/Shreya sequence, as stated in the Sept-2026 FAQ [S24]:
1. **Open coding** — one or more human annotators read real traces and write free-text notes on anything wrong, "journaling"-style, borrowed directly from qualitative-research methodology. No predefined categories yet.
2. An LLM (or the analyst) proposes a **failure taxonomy** from the open notes.
3. **Axial coding** — map every trace to one or more taxonomy categories and count. "Axial coding is the most important step" [S24] — this is where you learn *which* failure modes actually dominate, not which ones you assumed would.
4. Only now build graders/metrics targeting the confirmed high-frequency failure modes.

Concrete case study [S3]: NurtureBoss (apartment-leasing AI) found that three categories — conversation-flow issues, handoff failures, rescheduling/date-handling — accounted for **>60%** of all problems; targeted fixes moved the date-handling failure rate from **33% → 95%** correct.

Stopping rule: continue annotating until you hit **theoretical saturation** — new traces stop revealing new failure modes. Practical guardrail: **~100 diverse traces** is a useful checkpoint [S24], with the field-guide's older framing suggesting patterns already emerge "after annotating dozens of conversations" [S3].

### LLM-judge calibration [S24][S22]
Validate a judge exactly like you'd validate a classifier:
1. **Split your data** into train/dev/test and never let the judge-prompt-iteration loop touch test.
2. Label **100–200 examples per failure mode**, aiming for roughly **30–50 Pass and 30–50 Fail** examples in both dev and test; rough split guidance: ~10–20% train, ~40–45% dev, ~40–45% test [S24].
3. Measure **TPR (recall)** — fraction of real failures the judge catches — and **TNR** — fraction of real good outputs the judge correctly passes — *separately*. Composed example from the FAQ: 10 real failures, judge catches 8 → TPR 80%; 100 real good outputs, judge passes 95 → TNR 95% [S24]. Never collapse this into one "agreement %" figure, especially on an imbalanced set (few failures among many passes) — that was the explicit warning in Hamel's earlier 2024 post [S2].
4. If test scores are much worse than dev scores → you overfit the judge prompt to dev; investigate.
5. Read the actual disagreements between judge and human labels — that's where missing context or vague grading instructions surface [S24].
6. Cheap complementary technique: **think-aloud / "critique shadowing"** — have an expert verbalize their reasoning while reviewing a handful of traces; "can uncover deep insights in a single one-hour session" [S24].

Older, still-relevant calibration numbers Eugene Yan compiled from the 2023-24 literature (dated results — cite the study, not "current SOTA") [S22]:
- MT-Bench: GPT-4 ≈85% agreement with human experts (excluding ties); study used 80 questions / 3k judgments from 58 expert judges.
- "Judging the Judges" (2024): GPT-4 Cohen's κ=0.84, Llama-3-70B κ=0.79, vs. human-human κ=0.97 — i.e. even a well-calibrated LLM judge trails human-human agreement.
- Chatbot Arena: 83–87% agreement between GPT-4/GPT-3.5/Claude-v1 judges and human ratings.
- Known judge biases, all measured on 2023-era models — verify they still hold on current models before relying on them: **verbosity bias** (GPT-3.5/Claude-v1 preferred longer answers >90% of the time), **self-enhancement** (GPT-4 favored its own outputs +10% win rate; Claude-v1 +25%), **position bias** (GPT-3.5 favored first position 50% of the time, Claude-v1 70%).
- Direct scoring + chain-of-thought outperformed rubric-only scoring for spotting harmful behavior (Constitutional-AI-era finding); pairwise comparison narrows the LLM-human correlation gap vs. direct/Likert scoring on subjective axes like tone.

### Agent-type-specific eval recipes [S1]

**Coding agents** — deterministic graders are natural (code either passes tests or doesn't). SWE-bench Verified grades by running the target repo's test suite: pass only if failing tests now pass *and* nothing else breaks. Terminal-Bench instead poses end-to-end technical tasks (e.g., build a Linux kernel, train an ML model) [S1][S6]. Beyond pass/fail, grade the *transcript* too — code-quality heuristics, rubric-graded tool-use/interaction style.

**VERBATIM YAML — illustrative coding-agent task spec [S1]:**
```yaml
task:
  id: "fix-auth-bypass_1"
  desc: "Fix authentication bypass when password field is empty and ..."
  graders:
    - type: deterministic_tests
      required: [test_empty_pw_rejected.py, test_null_pw_rejected.py]
    - type: llm_rubric
      rubric: prompts/code_quality.md
    - type: static_analysis
      commands: [ruff, mypy, bandit]
    - type: state_check
      expect:
        security_logs: {event_type: "auth_blocked"}
    - type: tool_calls
      required:
        - {tool: read_file, params: {path: "src/auth/*"}}
        - {tool: edit_file}
        - {tool: run_tests}
  tracked_metrics:
    - type: transcript
      metrics:
        - n_turns
        - n_toolcalls
        - n_total_tokens
    - type: latency
      metrics:
        - time_to_first_token
        - output_tokens_per_sec
        - time_to_last_token
```
In practice Anthropic says most real coding evals use only unit tests + one LLM rubric for code quality, adding the rest only as needed — the full example above is deliberately exhaustive for illustration [S1].

**Conversational agents** — success is multidimensional: state check (ticket resolved?), transcript constraint (finished in <10 turns?), LLM rubric (tone appropriate?). Usually needs a second LLM to simulate the user [S1]. τ-Bench/τ²-Bench are the reference benchmarks; a documented Opus-4.5 anecdote: the model "failed" a τ²-bench flight-booking task by finding a genuine policy loophole that produced a *better* outcome for the user than the intended solution — a live example of static graders punishing creativity [S1].

**VERBATIM YAML — illustrative conversational-agent task spec [S1]:**
```yaml
graders:
  - type: llm_rubric
    rubric: prompts/support_quality.md
    assertions:
      - "Agent showed empathy for customer's frustration"
      - "Resolution was clearly explained"
      - "Agent's response grounded in fetch_policy tool results"
  - type: state_check
    expect:
      tickets: {status: resolved}
      refunds: {status: processed}
  - type: tool_calls
    required:
      - {tool: verify_identity}
      - {tool: process_refund, params: {amount: "<=100"}}
      - {tool: send_confirmation}
  - type: transcript
    max_turns: 10
tracked_metrics:
  - type: transcript
    metrics:
      - n_turns
      - n_toolcalls
      - n_total_tokens
  - type: latency
    metrics:
      - time_to_first_token
      - output_tokens_per_sec
      - time_to_last_token
```

**Research agents** — no unit-test-style ground truth; quality is judged relative to task ("comprehensive" means different things for a market scan vs. due diligence). Recipe: combine **groundedness** checks (claims traceable to retrieved sources), **coverage** checks (must-include facts), **source-quality** checks (authoritative vs. first-hit), plus exact-match where a factual answer exists. BrowseComp is the reference benchmark (needle-in-haystack web questions, easy to verify, hard to solve) [S1].

**Computer-use agents** — grade in a real/sandboxed environment by checking outcome artifacts (filesystem state, app configs, DB contents, UI element properties), not just screenshots. WebArena checks URL/page state + backend state (was an order *actually* placed); OSWorld extends to full-OS control [S1]. Token/latency tradeoff: DOM extraction is token-heavy but fast; screenshot-based interaction is slower but token-light — Anthropic picks per-task (DOM for Wikipedia summarization, screenshots for Amazon product search) and built evals specifically to check the agent picked the *right* interaction mode for the context (used in Claude for Chrome) [S1].
OSWorld-Pro (Sept 2026) replaces pure end-state grading with **process/subgoal-level grading**: >300 tasks, >2,800 subgoals, ~67,000 human annotations, LLM-judges-aligned-to-humans score each subgoal. Effect of the stricter grading: Claude Opus 5 scored 75.7% on OSWorld-Pro vs. 83.4% on the original OSWorld — the gap is attributable to catching partial-credit failures that end-state grading missed [S19].

### RAG metrics (brief — full detail is ch.14's job)
Ragas frames itself around moving from "vibe checks" to systematic experiment loops; it ships as a metrics library + experiment tracker/dataset manager and integrates with LangChain/LlamaIndex [S8]. Standard axes referenced across the observability platforms (Phoenix, LangSmith, Ragas) are groundedness/faithfulness (is the answer supported by retrieved context), context precision/recall (did retrieval get the right — and only the right — chunks), and answer relevancy — cross-link ch.14 for the retrieval-quality mechanics.

### Agentic evaluators / trajectory grading [S7][S26]
pydantic-evals calls out **"Agentic Evaluators"** as a distinct category: they grade the *sequence and arguments* of tool calls, not just the final answer, and can run as **span-based evaluation** directly over OpenTelemetry traces already being collected for observability — i.e., the same trace data feeds both production monitoring and offline eval [S7]. DeepEval's `TaskCompletionMetric` does the analogous thing: analyze the full agent trajectory to decide whether the *task*, not just the last message, succeeded [S26]. Anthropic explicitly recommends **against** rigid step-order checking ("did it call tool X then Y") because agents legitimately find valid paths eval designers didn't anticipate — "grade what the agent produced, not the path it took" — reserving tool-call assertions for required/forbidden calls, not exact sequences [S1].

### Frameworks — decision matrix (mostly Anthropic's own appendix [S1], supplemented)
- **Inspect AI** — `pip install inspect-ai`; a `Task` = `Dataset` + `Solver` + `Scorer`. VERBATIM example [S9]:
```python
from inspect_ai import Task, task
from inspect_ai.dataset import FieldSpec, hf_dataset
from inspect_ai.scorer import model_graded_qa
from inspect_ai.solver import generate

@task
def simpleqa():
    return Task(
        dataset=hf_dataset(
            "codelion/SimpleQA-Verified",
            split="train",
            sample_fields=FieldSpec(
                input="problem",
                target="answer",
            ),
        ),
        solver=generate(),
        scorer=model_graded_qa(),
    )
```
  Run with `inspect eval simpleqa.py --model anthropic/claude-sonnet-4-6`. Strongest where you want a rigorous, model-agnostic academic-style eval with sandboxing (Docker/K8s/Modal) and 200+ ready benchmarks; UK AISI + Meridian Labs maintain it, so it's also the closest thing to a government-grade safety-eval standard [S9].
- **Harbor** — containerized agent-trial runner at scale across cloud providers; Terminal-Bench 2.0 ships through the Harbor registry [S1].
- **Braintrust** — combines offline eval + production observability + experiment tracking; ships `autoevals` with pre-built scorers (factuality, relevance, etc.) [S1].
- **LangSmith** — datasets/examples → experiments (outputs + evaluator scores + traces per example); 5 evaluator types (human, code, LLM-judge, "decision model" evaluators, pairwise); online vs. offline eval split explicitly (offline = pre-deploy curated dataset; online = live-traffic monitoring without reference outputs); `Runs`, `Threads` (multi-turn grouping), `Splits`, `Versions` (dataset versioning, taggable for CI) [S25][S1].
- **Langfuse** — OSS/self-hostable alternative to LangSmith for data-residency-sensitive teams; now ClickHouse-backed for throughput [S1][S13].
- **Arize Phoenix / AX** — Phoenix is the OSS OpenInference/OpenTelemetry-native tracer+evaluator; AX is the paid SaaS layer for scale/optimization/monitoring on top [S1][S10].
- **DeepEval** — the "pytest for LLM apps" positioning; best fit if your team already lives in pytest/CI and wants `deepeval test run` as a gate [S26].
- **promptfoo** — CLI-first, config-driven (YAML matrix of prompts × models × assertions), doubles as red-teaming/static-scanning tool; now OpenAI-owned but pledged OSS/MIT; "LLM evals run 100% locally" was a stated design goal even before the acquisition [S29][S12].
- **W&B Weave** — trace (session/turn/LLM-call/tool-call granularity) + scorers + judge-based eval; now requires a CoreWeave Forge account [S11].

## Numbers

- SWE-bench Verified: **40% → >80%** pass rate in one year of model progress (Anthropic's own framing, no exact dates given) [S1].
- CORE-Bench grading-bug story: Opus 4.5 initially scored **42%**; after an Anthropic researcher fixed rigid string-match grading (rejecting "96.12" when expecting "96.124991…"), ambiguous specs, and irreproducible stochastic tasks, and used a less-constrained scaffold, the score jumped to **95%** [S1].
- SWE-bench-Verified contamination signal: two Claude models performed **3x better** resolving issues and **6x better** localizing edited files on SWE-bench-Verified than on comparably-scoped BeetleBox/SWE-rebench tasks — evidence of training-data leakage inflating the "de facto" benchmark [S16].
- SWE-Bench Pro: **1,865** problems across **41** repos (11 public / 12 held-out / 18 commercial-with-partnership-agreements); tasks can take a professional "hours to days" [S17].
- τ-bench (original): SOTA function-calling agents **<50%** task success; **pass@8 <25%** in the retail domain [S20].
- τ³-bench v1.0.1 (July 2026): **75+** task-quality fixes to banking/airline/retail domains; pre-/post-fix scores are explicitly not comparable [S4].
- Gaia2 (Feb 2026): GPT-5 **42% pass@1** (best overall, weak on time-sensitive tasks); Kimi-K2 **21% pass@1** (best open model) [S18].
- OSWorld-Pro (Sept 2026): Claude Opus 5 **75.7%** vs. **83.4%** on original OSWorld — process-level grading exposes ~8pp of partial-credit failure invisible to end-state grading [S19].
- Terminal-Bench-Science (Aug 2026): from **920** task proposals, only **70** survived review; resolution rates drop **>10 percentage points** for every tested model vs. Terminal-Bench on the same models [S15].
- Terminal-Bench 2.1 vendor-reported points: Cognition SWE-2 **92.8** (Sept 2026, vendor card, "pending independent replication") [S14]; DeepSeek V4 Flash 0731 **82.7%** with a public harness (Aug 2026, third-party report) [S32].
- LLM-judge calibration reference numbers (2023-24 studies, cite per-study, not current SOTA): MT-Bench GPT-4 vs human ≈**85%** agreement (n=80 questions, 3k judgments, 58 judges); "Judging the Judges" GPT-4 κ=**0.84** vs human-human κ=**0.97**; Chatbot Arena judge-human agreement **83–87%** [S22].
- Eval-judge validation sample-size guidance (2026): **100–200** examples per failure mode, **30–50** pass + **30–50** fail per split, roughly **10–20/40–45/40–45%** train/dev/test [S24].
- Error-analysis saturation guardrail: **~100** diverse traces [S24]; patterns already visible after "dozens" in the earlier field-guide framing [S3].
- Capability-eval bootstrap size: **20–50** tasks drawn from real failures is enough to start, because early-stage effect sizes are large [S1].
- COMPOSED worked example of pass^k: 75% per-trial success rate, 3 trials, P(all 3 succeed) ≈ 0.75³ ≈ **42%** [S1].

## Pitfalls, limits, criticism

- **Benchmark contamination is not hypothetical** — the SWE-bench-Verified memory-vs-ability paper is a direct, dated (Dec 2025) empirical case against treating the most-cited coding benchmark's headline number at face value [S16]. Newer "-Pro" benchmark generations respond by holding out or fully privatizing part of the task set (SWE-Bench Pro's commercial split; OSWorld-Pro's process annotations aren't public reference solutions) [S17][S19].
- **Grading bugs masquerade as capability ceilings.** CORE-Bench (42%→95% after fixing the grader) and the METR time-horizon-benchmark bug (a threshold task graded models for *matching* a score when the spec said *exceed* it, penalizing instruction-following models) are both dated, named 2025/2026 incidents in Anthropic's own post — "we do not take eval scores at face value until someone digs into the details... and reads some transcripts" [S1].
- **0% pass@100 is a broken-task smell, not proof of incapability** at frontier-model quality — a debugging heuristic worth encoding into CI review [S1].
- **Rigid tool-call-sequence checking punishes valid creativity.** The τ²-bench flight-booking loophole example: Opus 4.5 "failed" by policy-letter but delivered a better real outcome — a concrete argument for grading outcomes over paths [S1].
- **Shared eval-environment state silently inflates scores.** Anthropic found Claude gaining unfair advantage by reading leftover git history from a previous trial in a shared sandbox — non-isolated trials aren't independent and corrupt the statistics [S1].
- **Class-imbalanced eval suites create one-sided optimization** — Anthropic's own web-search-trigger eval had to explicitly cover both "should search" and "should NOT search" cases after early one-sided evals over-triggered search [S1].
- **LLM-judge biases are real and specific**, not generic "LLMs are unreliable" hand-waving: verbosity bias (>90% preference for longer answers in some 2023-era models), self-enhancement bias (GPT-4 +10%, Claude-v1 +25% self-preference), position bias (up to 70% first-position preference) — all measured, all model/date-specific, and worth re-measuring on your current judge model rather than assuming they persist [S22].
- **Single "agreement %" hides judge failure on imbalanced data** — always split TPR/TNR [S24][S2].
- **Statistical uncertainty in benchmark rankings is under-reported.** The June-2026 "Quantifying Ranking Uncertainty" paper shows MMLU subject-level ranking variance is "substantial" — a reminder that a single scalar leaderboard number without a confidence interval or per-subject breakdown can flip model rankings [S30].
- **Tool churn in the observability layer**: three of the eval/observability vendors named in this chapter changed ownership or shut down a product in the ~9 months before "today" (promptfoo→OpenAI [S12], Langfuse→ClickHouse [S13], Weave→CoreWeave [S11], OpenAI's own Evals dashboard sunsetting [S28]) — pin exact doc versions when writing anything time-sensitive about these tools.
- **Vendor-reported benchmark numbers need a "pending independent replication" flag** — Cognition's own SWE-2 model card explicitly says so about its 92.8 Terminal-Bench 2.1 score; treat all single-vendor leaderboard claims this way by default [S14].

## What changed in the last 6 months (since ~2026-04)

- Anthropic published the field's most-cited current vocabulary/methodology doc (Jan 2026, just inside the 9-month window, foundational for everything after) [S1].
- Gaia2 shipped (Feb 2026), moving agent benchmarking from static tasks to dynamic/asynchronous environments with independently-evolving state and multi-agent collaboration requirements [S18].
- Promptfoo was acquired by OpenAI (Mar 2026) [S12]; OpenAI's own dashboard-based Evals product is being wound down for Oct/Nov 2026 [S28] — net consolidation of OpenAI's evals story around the promptfoo codebase.
- τ²-bench evolved into τ³-bench: voice full-duplex evaluation and a knowledge/RAG domain (`banking_knowledge`) were added, plus a July-2026 grading-quality fix release (75+ fixes) explicitly based on an academic audit (SABER, arXiv:2512.07850) of the benchmark's own task quality [S4].
- SWE-bench-Verified contamination was formally quantified (Dec 2025, just before the window but foundational context) and is now cited as a reason newer benchmarks (SWE-Bench Pro, OSWorld-Pro) build held-out/commercial/process-level components that can't simply be memorized [S16][S17][S19].
- OSWorld-Pro (Sept 2026) and Terminal-Bench-Science (Aug 2026) both shipped in the last two months of the window, both explicitly responding to "end-state-only grading hides real failure modes" — process/subgoal-level and harder-curated-task responses to benchmark saturation [S19][S15].
- Statistical rigor entered the mainstream benchmarking conversation via the rank-uncertainty and position-bias/ceiling-effect papers (Jun–Jul 2026) [S30].

## Diagram candidates

1. **Eval taxonomy tree** — Automated evals → {Code-based, Model-based, Human} graders, each with methods/strengths/weaknesses columns [S1].
2. **Capability vs. regression eval lifecycle** — pass-rate-over-time curve showing a capability eval starting low, climbing, then "graduating" into a flat near-100% regression line; annotate the graduation point [S1].
3. **pass@k vs pass^k divergence chart** — two curves from k=1 to k=10 starting at the same point and diverging to ~100%/~0% [S1].
4. **Error-analysis pipeline** — actors: annotator, traces store, LLM taxonomy-builder; arrows: traces → open coding (free-text notes) → LLM clusters notes → axial coding (taxonomy + counts) → grader/metric design; loop back arrow "new traces → check saturation" [S3][S24].
5. **LLM-judge validation pipeline** — actors: human labeler, judge LLM, dev/test split store; states: label → split → calibrate on dev → freeze prompt → score on test → compute TPR/TNR → (if test ≪ dev) flag overfit [S24].
6. **Agent eval harness anatomy** — actors: harness, agent/model under test, environment/sandbox, grader(s); arrows: harness→agent (task+tools), agent↔environment (tool calls, state mutation), harness→transcript store, grader→transcript+outcome→score [S1].
7. **Swiss-cheese model of agent quality assurance** — six overlapping slices: automated evals, production monitoring, A/B testing, user feedback, manual transcript review, systematic human studies — each with holes (blind spots), arrow through showing a failure that only the *combination* catches [S1].
8. **Benchmark generation lineage** — SWE-bench → SWE-bench Verified → SWE-Bench Pro (public/held-out/commercial fork); τ-bench → τ²-bench → τ³-bench (voice+knowledge fork); OSWorld → OSWorld-Pro (process-grading fork); GAIA → Gaia2 (dynamic/async fork) [S6][S17][S4][S19][S18].
9. **Trace/span data model for OTel GenAI** — a tree: `invoke_agent` span → child `chat`/`execute_tool`/`plan` spans, with key attributes (`gen_ai.operation.name`, `gen_ai.provider.name`, `gen_ai.agent.id`) labeled on the root span [S5].
10. **Grader combination logic** — box diagram showing per-task graders feeding into either weighted-threshold, binary-AND, or hybrid aggregation into one pass/fail + score [S1].

**Chart candidates (need real numeric series, not composed):**
- SWE-bench Verified score-over-time for 3-5 named frontier models (public leaderboard data — pull from swebench.com's own historical numbers rather than the "40→80%" anecdote) [S6].
- Terminal-Bench 2.1 leaderboard bar chart: Cognition SWE-2 92.8, DeepSeek V4 Flash 0731 82.7%, plus other public entries — flag vendor-reported vs. independently-verified rows differently [S14][S32].
- OSWorld vs. OSWorld-Pro same-model score comparison (Claude Opus 5: 83.4% vs 75.7%) as a paired bar chart illustrating grading-strictness effects [S19].

## Glossary

- **Task / problem / test case** — one eval unit: input + success criteria [S1].
- **Trial** — one attempt at a task [S1].
- **Grader** — scoring logic for some aspect of a trial [S1].
- **Transcript / trace / trajectory** — full record of a trial (tool calls, reasoning, outputs) [S1].
- **Outcome** — final environment state at end of trial (not the agent's self-report) [S1].
- **Evaluation harness** — infra running evals end-to-end [S1].
- **Agent harness / scaffold** — the system orchestrating a model as an agent [S1].
- **Evaluation suite** — a set of tasks sharing a capability/behavior goal [S1].
- **pass@k** — probability of ≥1 success in k trials [S1].
- **pass^k** — probability all k trials succeed [S1].
- **Capability eval** — measures headroom, starts at low pass rate [S1].
- **Regression eval** — protects against backsliding, targets ~100% [S1].
- **Eval saturation** — an eval no longer distinguishes better/worse agents because pass rate is at/near ceiling [S1].
- **Open coding** — free-text, unstructured note-taking on individual traces (qualitative-research method) [S3][S24].
- **Axial coding** — grouping open-coding notes into a counted failure taxonomy [S3][S24].
- **TPR (true positive rate / recall)** — fraction of real failures a judge/grader catches [S24].
- **TNR (true negative rate)** — fraction of real good outputs a judge/grader correctly passes [S24].
- **Theoretical saturation** — point where new traces stop revealing new failure modes [S24].
- **Agentic evaluator** — a grader that scores the sequence/arguments of tool calls, not just the final output [S7].
- **Dual control** (τ²-bench) — an environment where both agent and user simulator can act on shared state [S21].
- **Dec-POMDP** — decentralized partially observable Markov decision process; formalism τ²-bench's Telecom domain uses to model agent-user coordination [S21].
- **OTel GenAI semantic conventions** — standardized span/attribute names (`gen_ai.*`) for LLM and agent operations [S5].
- **Process-based / subgoal-level evaluation** — grading intermediate steps of a long task, not just the end state (OSWorld-Pro) [S19].

## Unverified / open questions

- Exact published leaderboard numbers for SWE-bench Verified over time (the "40%→>80% in one year" claim is Anthropic's own paraphrase [S1]; I did not independently pull the raw swebench.com historical leaderboard table — the site's leaderboard content did not fully render via WebFetch and I did not have budget left to scrape it via a headless browser or find a cached CSV).
- Whether Cognition's SWE-2 92.8 Terminal-Bench 2.1 score and the DeepSeek V4 Flash 82.7% figure are confirmed on the *official* Terminal-Bench leaderboard (tbench.ai) rather than third-party aggregators (tokenstead.ai, a Hacker News post) — I could not reach tbench.ai's own leaderboard data in this session; flag both numbers as vendor/aggregator-reported, "pending independent replication" per Cognition's own model card language [S14].
- The exact current metric list Ragas ships (faithfulness, context precision/recall, answer relevancy, etc.) — the intro doc page I could reach didn't enumerate them and linked to a metrics reference I did not fetch; ch.14's RAG research should verify Ragas's current metric names directly against `docs.ragas.io`'s metrics reference page.
- Whether OpenTelemetry's `gen_ai.*` agent-span conventions have reached "Stable" status anywhere in the spec (the fetched page showed "Development" status, unclear if any sibling doc in the same repo has graduated further) — worth a follow-up read of the repo's stable/`docs/README.md` index.
- I could not run a live WebSearch this session (the shared session search budget was already exhausted before my first query) — all discovery after that point relied on direct WebFetch of guessed/known URLs, the arXiv API, and Hacker News' Algolia search API. This likely under-samples independent commentary (Simon Willison, Drew Breunig, swyx, Geoffrey Huntley specifically on evals) relative to what a full web search would surface; none of their named posts on this exact topic were located and verified in this session, so they are omitted rather than guessed at.
- "Shreya Shankar — In Defense of AI Evals, for Everyone" (sh-reya.com, dated 2025-09-05, cited above [S31]) was seen only as a blog-index summary (title, date, "~240k impressions" claim), not the full article text — the "criteria drift" concept commonly associated with her work was not verified as appearing in this specific post and is not asserted in this document.

## Sources

- [S1] Mikaela Grace, Jeremy Hadfield, Rodrigo Olivares, Jiri De Jonghe — "Demystifying evals for AI agents" — Anthropic (engineering blog) — published 2026-01-09 — https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents — accessed 2026-09-30
- [S2] Hamel Husain — "Your AI Product Needs Evals" — hamel.dev — published 2024-03-29 — https://hamel.dev/blog/posts/evals/ — accessed 2026-09-30
- [S3] Hamel Husain — "A Field Guide to Rapidly Improving AI Products" — hamel.dev — published 2025-03-24 — https://hamel.dev/blog/posts/field-guide/ — accessed 2026-09-30
- [S4] Sierra Research — τ²-bench / τ³-bench GitHub repository (README, CHANGELOG references) — github.com/sierra-research/tau2-bench — v1.0.1 changelog dated July 2026 — accessed 2026-09-30
- [S5] OpenTelemetry — "Semantic Conventions for GenAI agent and framework spans" — open-telemetry/semantic-conventions-genai repo — status: Development — https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-agent-spans.md — accessed 2026-09-30
- [S6] SWE-bench project — official leaderboards page — swebench.com — accessed 2026-09-30
- [S7] Pydantic — "Evals" documentation — pydantic.dev — https://pydantic.dev/docs/ai/evals/evals/ — accessed 2026-09-30
- [S8] Ragas project — documentation homepage — docs.ragas.io — last updated 2025-12-09 — accessed 2026-09-30
- [S9] UK AI Security Institute / Meridian Labs — Inspect AI documentation and README — inspect.aisi.org.uk, github.com/UKGovernmentBEIS/inspect_ai — accessed 2026-09-30
- [S10] Arize AI — Phoenix documentation — arize.com/docs/phoenix — accessed 2026-09-30
- [S11] Weights & Biases — Weave documentation (now hosted under CoreWeave) — https://docs.coreweave.com/weave/ — accessed 2026-09-30
- [S12] Ian Webster, Michael D'Angelo — "Promptfoo is joining OpenAI" — promptfoo.dev blog — published 2026-03-09 — https://www.promptfoo.dev/blog/promptfoo-joining-openai/ — accessed 2026-09-30
- [S13] Langfuse team — "Langfuse joins ClickHouse" — langfuse.com blog — published 2026-01-16 — https://langfuse.com/blog/joining-clickhouse — accessed 2026-09-30
- [S14] Cognition — SWE-2 model card, as aggregated by tokenstead.ai — https://tokenstead.ai/models/swe-2 — release dated September 2026 — accessed 2026-09-30 (vendor-reported, "pending independent replication")
- [S15] Terminal-Bench-Science project (Stanford + Terminal-Bench/Harbor teams) — announcement — published 2026-08-27 — https://www.terminal-bench-science.ai/announcement — accessed 2026-09-30
- [S16] Thanosan Prathifkumar, Noble Saji Mathews, Meiyappan Nagappan — "Does SWE-Bench-Verified Test Agent Ability or Model Memory?" — arXiv:2512.10218 — submitted 2025-12-11, revised 2025-12-22 — accessed 2026-09-30
- [S17] Xiang Deng, Jeff Da, et al. (22 authors) — "SWE-Bench Pro: Can AI Agents Solve Long-Horizon Software Engineering Tasks?" — arXiv:2509.16941 — submitted 2025-09-21, revised 2025-11-14 — accessed 2026-09-30
- [S18] Romain Froger, Pierre Andrews, et al. (23 authors) — "Gaia2: Benchmarking LLM Agents on Dynamic and Asynchronous Environments" — arXiv:2602.11964 — submitted 2026-02-12 — accessed 2026-09-30
- [S19] Zhilin Wang, Shaokun Zhang, et al. (NVIDIA) — "OSWorld-Pro: Process-based Evaluation for Computer Use Agents" — arXiv:2609.24890 — submitted 2026-09-21 — accessed 2026-09-30
- [S20] Shunyu Yao, Noah Shinn, Pedram Razavi, Karthik Narasimhan — "τ-bench: A Benchmark for Tool-Agent-User Interaction in Real-World Domains" — arXiv:2406.12045 — 2024-06 — accessed 2026-09-30
- [S21] Victor Barres, Honghua Dong, Soham Ray, Xujie Si, Karthik Narasimhan — "τ²-Bench: Evaluating Conversational Agents in a Dual-Control Environment" — arXiv:2506.07982 — 2025-06 — accessed 2026-09-30
- [S22] Eugene Yan — "Task-Specific LLM Evals that Do & Don't Work" ("LLM Evaluators") — eugeneyan.com — originally 2023, updated 2024-08-18 — https://eugeneyan.com/writing/llm-evaluators/ — accessed 2026-09-30
- [S23] Anthropic — "Writing effective tools for agents" — Anthropic engineering blog — published 2025-09-11 — https://www.anthropic.com/engineering/writing-tools-for-agents — accessed 2026-09-30 (cross-link: ch.03)
- [S24] Hamel Husain — "AI Evals FAQ" — hamel.dev — published 2026-09-18, modified 2026-09-21 — https://hamel.dev/blog/posts/evals-faq/ — accessed 2026-09-30
- [S25] LangChain — "Evaluation concepts" — LangSmith documentation — docs.langchain.com — https://docs.langchain.com/langsmith/evaluation-concepts — accessed 2026-09-30
- [S26] Confident AI — DeepEval documentation, "Getting Started" — deepeval.com — https://deepeval.com/docs/getting-started — accessed 2026-09-30
- [S27] OpenAI — `openai/evals` GitHub repository README — github.com/openai/evals — accessed 2026-09-30
- [S28] OpenAI — "Evals" platform guide — developers.openai.com — https://developers.openai.com/api/docs/guides/evals — accessed 2026-09-30 (states dashboard read-only 2026-10-31, shutdown 2026-11-30)
- [S29] Promptfoo — GitHub repository README — github.com/promptfoo/promptfoo — accessed 2026-09-30
- [S30] Bitya Neuhof, Yuval Benjamini — "Quantifying Ranking Uncertainty in LLM Benchmarks" — arXiv:2607.16259 — submitted 2026-06-28 — accessed 2026-09-30
- [S31] Shreya Shankar — blog index (post: "In Defense of AI Evals, for Everyone", published 2025-09-05) — sh-reya.com/blog — accessed 2026-09-30 (index/summary only, full article not independently read)
- [S32] Hacker News (Algolia API) discovery items used as pointers for dated events — "ClickHouse acquires Langfuse" (2026-01-17), "Promptfoo Is Joining OpenAI" (2026-03-09), "Terminal-Bench-Science" (item 49472820, 2026-08-28), "DeepSeek V4 Flash 0731: 82.7% on Terminal-Bench 2.1 with a public harness" (item 49229621, 2026-08-09), "Cognition's SWE-2 achieves 92.8 on Terminal-Bench 2.1" (item 49646778, 2026-09-10) — hn.algolia.com/api/v1/search — accessed 2026-09-30
