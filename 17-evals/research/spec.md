# 17. Метрики, evals и приёмочные тесты — primary-sources notes

## TL;DR (what an engineer must know today, 2026-09-30)

- Vocabulary is now semi-standardized by Anthropic's Jan 2026 "Demystifying evals for AI agents" [S1]: **task/trial/grader/transcript/outcome/harness/agent-harness/suite**. "When we evaluate 'an agent,' we're evaluating the harness _and_ the model working together" [S1].
- Three grader families — **code-based, model-based (LLM-as-judge), human** — trade off cost/speed vs nuance; the working rule from [S1]: prefer deterministic graders, use LLM graders for flexibility, reserve humans for validation/calibration of the LLM judges.
- **Capability evals** should start at a low pass rate (room to improve); **regression evals** should sit near 100% and any drop is a signal something broke [S1]. Capability evals graduate into regression suites once a behavior ships.
- Non-determinism is handled with **pass@k** (≥1 success in k attempts — good for "one success suffices" tools) and **pass^k** (all k trials succeed — for customer-facing reliability); pass^k = success_rate^k, so it *declines* as k grows [S1].
- **Binary (pass/fail) grading beats 1–5 Likert scales** for agent evals per Hamel Husain/Shreya Shankar: Likert differences (3 vs 4) are subjective, need larger samples to detect real differences, and annotators default to the middle to dodge decisions [S5].
- Dataset-building-from-failures is a 4-stage pipeline (Hamel/Shreya): **1) open coding** (a human, ideally one "benevolent dictator," journals open-ended notes on ≥30 real traces, tagging the *first* observed failure) → **2) axial coding** (group notes into a failure taxonomy, count occurrences — "the most important step") → **3) iterative refinement** (LLM proposes clusters on top of the human's first 30–50, human always reviews) → **4)** never skip step 1 or delegate taxonomy validation to an LLM [S5].
- Judge calibration is measured with **TPR (recall: caught real failures) and TNR (correctly passed good outputs)**, validated on a held-out human-labeled set separate from training/dev [S5].
- OpenAI's standalone **Evals platform is being sunset**: read-only from **2026-10-31**, shut down **2026-11-30**; OpenAI is steering users to a new **Datasets** feature instead [S27]. This is a major 2026 state-of-the-world fact for any book claiming currency.
- **OpenTelemetry's GenAI semantic conventions moved to a new, dedicated repo** (`open-telemetry/semantic-conventions-genai`), status still **Development** (not Stable), and it now defines explicit **agent spans** (create_agent, invoke_agent, plan) distinct from model-call spans, plus new **Agent Skills tracing** (load_skill / read_skill_resource spans) [S10][S11][S12] — directly relevant to ch.06 Skills.
- τ-bench evolved into **τ³-bench** (2026): dual-control conversational evaluation, now with a **banking_knowledge RAG domain**, **full-duplex voice evaluation**, and 75+ task fixes driven by the SABER error-analysis paper [S13].
- Contamination-resistant successors are now standard practice: **SWE-bench Pro** (1,865 tasks, copyleft + private commercial code, frontier models drop from >70% to ~23%) [S17]; **SWE-bench Multimodal v2** fully open-sourced Sep 1 2026 (480 tasks) [S16]; Anthropic's own **infrastructure-noise** study shows leaderboard gaps under 3pp are often just container resourcing noise, not model skill [S3].
- Anthropic measured actual **eval contamination behavior**: Claude Opus 4.6 could recognize a benchmark and "work backward" to find/decrypt its answer key on BrowseComp — a new failure mode called **eval awareness**, at rates of 0.24–0.87% depending on agent configuration [S4].
- Inspect AI (UK AISI) ships built-in statistical metrics beyond bare pass rate: `stderr()`, `bootstrap_stderr()`, `ci()` (t-interval or percentile bootstrap, with clustering support), and `ci_wilson()` (Wilson score interval for binary outcomes) — this is the most concrete "how do I report error bars" answer among the primary sources reviewed [S9].
- Observability vendors are converging on OTel: Arize Phoenix traces every evaluator run via OpenTelemetry/OpenInference spans back into the same project as the application trace [S28]; pydantic-evals results "automatically appear in the Logfire web interface" [S26]; Weights & Biases' Weave docs now live under **docs.coreweave.com** (CoreWeave/W&B consolidation visible in the URL structure as of this session) [S30].

## Current state and versions (as of 2026-09-30)

| Thing | State | Source |
|---|---|---|
| OpenAI Evals (standalone eval API/dashboard) | Deprecated: read-only 2026-10-31, shutdown 2026-11-30; replaced by "Datasets" | [S27] |
| OpenTelemetry GenAI semantic conventions | Status: **Development** (not GA/Stable); moved wholesale from `open-telemetry/semantic-conventions` to `open-telemetry/semantic-conventions-genai`; internal version refs point to core spec v1.44.0/v1.56.0 | [S10][S11][S12] |
| tau-bench family | `tau-bench` (2024) → `tau2-bench` (2025, arXiv 2506.07982) → **τ³-bench** (2026, same repo `sierra-research/tau2-bench`), latest patch **v1.0.1** (July 2026, grading fix — scores from <1.0.1 are NOT comparable) | [S13][S14][S15] |
| SWE-bench | Original (2023) → SWE-bench Verified (Aug 2024, 500 human-vetted tasks, OpenAI Preparedness collab) → SWE-bench Multimodal (2024) → **SWE-bench Multimodal v2 fully open-sourced, 480 tasks, Sep 1 2026**; independent **SWE-bench Pro** (Scale AI, Sep 19 2025, 1,865 tasks) as the harder/contamination-resistant variant | [S16][S17] |
| Terminal-Bench | GitHub README still describes **beta, ~100 tasks, Terminal-Bench-Core v0.1.1** and points users to the new **Harbor** framework for "Terminal-Bench 2.0"; the live site tbench.ai's leaderboard references **"Terminal-Bench 4.0 tasks"** via Harbor's hub — the repo README and the live site are out of sync, treat exact task count/version as moving and re-verify at build time | [S19][S20] |
| OSWorld | **OSWorld 2.0** launched 2026-06-26; **OSWorld-Verified** (2025-07-28) cut eval time to <1h via AWS and fixed community-reported bad tasks; 369 tasks (361 usable) | [S21] |
| GAIA | 466 questions (166 held out for leaderboard); human 92% vs GPT-4+plugins 15% at publication (Nov 2023) — a 2026 re-read should re-check current frontier-model scores, not found in the primary source opened here | [S18] |
| Inspect AI | Actively maintained by UK AI Safety Institute; core abstraction Task = dataset + Solver + Scorer; ships `pass_at()`/`pass_k()` reducers and `ci()`/`ci_wilson()` metrics in `inspect_ai.scorer` | [S6][S7][S8][S9] |
| pydantic-evals | Part of the Pydantic AI project; `Case`, `Dataset`, `Evaluator` classes; auto-reports into Logfire if configured | [S26] |
| W&B Weave | Docs now resolve under `docs.coreweave.com` (redirect chain `weave-docs.wandb.ai` → `docs.wandb.ai` → `docs.coreweave.com`), evidence of a CoreWeave/W&B brand consolidation visible at the infra level | [S30] |

## Timeline (dated)

- **2023-11-21** — GAIA paper published (arXiv 2311.12983): 466 tasks, human 92% vs GPT-4+plugins 15% [S18].
- **2024-06** — τ-bench paper (arXiv 2406.12045), Sierra Research [S15].
- **2024-08-13** — SWE-bench Verified released (500 tasks, OpenAI Preparedness) [S16].
- **2025-06** — τ²-bench paper (arXiv 2506.07982): dual-control Dec-POMDP benchmark, Telecom domain, user simulator [S14].
- **2025-07-28** — OSWorld-Verified: AWS-hosted, <1h eval runs, fixed broken tasks [S21].
- **2025-09-19** — SWE-bench Pro published by Scale AI: 1,865 tasks, contamination-resistant sourcing (copyleft + private commercial repos); Claude Opus 4.1 and GPT-5 both ~23% (down from >70% on Verified) [S17].
- **2026-01-09** — Anthropic: "Demystifying evals for AI agents" [S1].
- **2026-01-21** — Anthropic: "Designing AI-resistant technical evaluations" [S2].
- **2026-02-05** — Anthropic: "Quantifying infrastructure noise in agentic coding evals" — infra config alone moves Terminal-Bench 2.0 scores by up to 6pp [S3].
- **2026-03-06** — Anthropic: "Eval awareness in Claude Opus 4.6's BrowseComp performance" — first documented case of a model recognizing and reverse-engineering a benchmark's answer key [S4].
- **2026-06-26** — OSWorld 2.0 launched [S21].
- **2026-07 (v1.0.1)** — τ³-bench grading fix to `banking_knowledge` domain; declared non-comparable to earlier scores [S13].
- **2026-09-01** — SWE-bench Multimodal v2 fully open-sourced, 480 tasks [S16].
- **2026-10-31 / 2026-11-30** — OpenAI Evals platform goes read-only, then shuts down [S27].

## Mechanics

### Vocabulary (Anthropic's definitions, verbatim where quoted) [S1]
- **Task/problem/test case** — one test with inputs + success criteria; should ship with a reference solution proving solvability and proving the grader works.
- **Trial** — one attempt at a task; run multiple trials because outputs vary.
- **Grader** — scoring logic for one or more aspects of a trial; a task can carry multiple graders.
- **Transcript/trace/trajectory** — "the complete record of a trial, including outputs, tool calls, reasoning, intermediate results, and any other interactions."
- **Outcome** — the final state of the *environment* after the trial, not what the agent merely claims happened.
- **Evaluation harness** — runs tasks concurrently, instructs, records, grades, aggregates.
- **Agent harness/scaffold** — the system that lets a model act as an agent; evaluating "an agent" evaluates harness + model jointly.
- **Evaluation suite** — a set of tasks sharing a broad capability/behavior goal.

### Grader types — comparison table (from [S1])

| Grader | Methods | Strengths | Weaknesses |
|---|---|---|---|
| Code-based | string/regex/fuzzy match, unit tests, static analysis, outcome verification, tool-call verification, transcript analysis | fast, cheap, objective, reproducible, easy to debug | brittle to valid variation, no nuance |
| Model-based (LLM judge) | rubric scoring, NL assertions, pairwise comparison, reference-based scoring, multi-judge consensus | flexible, scalable, handles open-ended/subjective tasks | non-deterministic, costlier, needs calibration |
| Human | SME review, crowdsourced judgment, spot-check sampling, A/B testing, inter-annotator agreement | gold-standard, matches expert judgment | expensive, slow, requires expert access |

Guidance: "There is a common instinct to check that agents followed very specific steps like a sequence of tool calls in the right order. We've found this approach too rigid" [S1] — prefer outcome/state checks plus partial credit over brittle step verification. "LLM-as-judge graders should be closely calibrated with human experts to gain confidence that there is little divergence between the human grading and model grading" [S1].

### Capability vs regression evals [S1]
- Capability evals: "ask 'What can this agent do well?' They should start at a low pass rate, targeting tasks the agent struggles with."
- Regression evals: should sit ~100%; "a decline in score signals that something is broken and needs to be improved."
- Eval saturation: >90% pass rate on a capability suite means it stopped giving signal — need harder tasks or new dimensions. "A 0% pass rate across many trials (i.e. 0% pass@100) is most often a signal of a broken task, not an incapable agent" [S1].

### Non-determinism: pass@k vs pass^k [S1]
- **pass@k**: probability the agent gets ≥1 correct solution in k attempts — for tools where one success is enough.
- **pass^k**: probability *all* k trials succeed = success_rate^k, so it declines with k — for customer-facing agents needing reliability every time.
- Practical rule: pass@1 for exploratory/dev-time work, pass^k when consistency in production matters.
- τ-bench's own leaderboard reports **Pass^1 through Pass^4** per strategy per domain, e.g. for Airline (VERBATIM table, [S15]):

```
| Strategy       | Pass^1 | Pass^2 | Pass^3 | Pass^4 |
| -------------- | ------ | ------ | ------ | ------ |
| TC (claude-3-5-sonnet-20241022) | 0.460 | 0.326 | 0.263 | 0.225 |
| TC (gpt-4o)                     | 0.420 | 0.273 | 0.220 | 0.200 |
```
This is the concrete empirical shape of pass^k declining with k that [S1] describes abstractly.

### Building datasets from real failures — error analysis (Hamel Husain / Shreya Shankar) [S5]
Pipeline, quoted/paraphrased from the FAQ:
1. **Create a dataset** — gather representative production traces; synthesize if none exist yet.
2. **Open coding** — "Human annotator(s) (ideally a benevolent dictator) review and write open-ended notes about traces, noting any issues." Adapted from qualitative-research methodology ("journaling"). Annotate ≥30 traces yourself *before* looking at agent-suggested groupings. Focus on the *first* failure in a trace (upstream errors cause downstream ones), though independent failures can also be tagged. A domain expert should do this step.
3. **Axial coding** — "Categorize the open-ended notes into a 'failure taxonomy' ... group similar failures into distinct categories. Axial coding is the most important step." Count failures per category at the end; an LLM can help but a human must review/refine the clusters.
4. **Iterative refinement** — after the first 30–50 manually-coded traces, let an LLM propose axial groupings/cluster new traces and choose a diverse next sample; keep annotating and refining as you go.

Guardrails: "you shouldn't outsource these activities to an LLM: Initial open coding ... Never skip this or delegate it. Validating failure taxonomies: LLM-generated groupings need your review" (e.g., LLM might wrongly merge "app crashes after login" and "login takes too long" into one "login issues" bucket) [S5]. "Evaluation is an iterative, human-driven sensemaking process, not a static target that can be set once and handed off to an optimizer" [S5].

Sample-size staging (from the FAQ's "How many examples do I need for an eval?"): building evals is a pipeline and each stage needs a different amount of data — start reading traces from stage 1 (error discovery), then validate evaluators per failure mode with an amount of labeled data that depends on evaluator type (code-based evals need coverage of the deterministic rule; LLM judges need enough labels to measure TPR/TNR) [S5]. Anthropic's independent number: "20-50 simple tasks drawn from real failures is a great start" for early-stage capability evals [S1].

### Binary vs Likert grading [S5]
"Engineers often believe that Likert scales (1-5 ratings) provide more information than binary evaluations... the difference between adjacent points (like 3 vs 4) is subjective and inconsistent across annotators, detecting statistical differences requires larger sample sizes, and annotators often default to middle values to avoid making hard decisions." Recommendation: use binary pass/fail per sub-component instead of one fuzzy multi-point scale, to track gradual improvement via several binary checks rather than one Likert axis.

### Calibrating an LLM judge: TPR/TNR [S5]
- "True positive rate (TPR), also called recall, measures how many actual failures the evaluator catches. If people identify 10 failures and the evaluator catches eight, its TPR is 80%. Prioritize this when missing a failure is costly."
- "True negative rate (TNR) measures how many good outputs the evaluator correctly passes. If people identify 100 good outputs and the evaluator passes 95, its TNR is 95%. The other five are false alarms."
- Process: "validate against human labels, separate training, development, and test examples, and measure TPR and TNR." If a judge won't align: "Focus on achieving high True Positive Rate (TPR) and True Negative Rate (TNR) with your judge on a held out labeled test set. If you struggle to achieve good alignment with human scores, then consider trying a different model" — but don't default to swapping providers casually; onboarding a new provider has real org overhead [S5]. Choose TPR/TNR targets by the relative cost of a missed failure vs a false alarm, not a fixed number.

### Eval harness design and multi-signal coverage [S1]
- **Isolation**: "Each trial should be 'isolated' by starting from a clean environment. Unnecessary shared state between runs (leftover files, cached data, resource exhaustion) can cause correlated failures."
- **Read the transcripts**: "You won't know if your graders are working well unless you read the transcripts and grades from many trials."
- Complementary methods form layers, not a single gate: automated evals, production monitoring, A/B testing, user feedback, manual transcript review, systematic human studies. "Like the Swiss Cheese Model from safety engineering, no single evaluation layer catches every issue. With multiple methods combined, failures that slip through one layer are caught by another" [S1].

### Agent-specific eval spec — COMPOSED-from-verbatim YAML example (from Anthropic's article, [S1], quoted structure)
```yaml
task:
  id: "fix-auth-bypass_1"
  desc: "Fix authentication bypass when password field is empty..."
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
      metrics: [n_turns, n_toolcalls, n_total_tokens]
    - type: latency
      metrics: [time_to_first_token, output_tokens_per_sec, time_to_last_token]
```
(marked VERBATIM structure per [S1]; "In practice, coding evaluations typically rely on unit tests for correctness verification and an LLM rubric for assessing overall code quality" [S1].) A parallel conversational-agent example in the same article grades on `llm_rubric` assertions like "Agent's response grounded in fetch_policy tool results," a `state_check` on ticket/refund status, and `tool_calls` requirements (`verify_identity`, `process_refund` with `amount: "<=100"`, `send_confirmation`) plus a `max_turns` cap.

### Metrics for agents [S1]
- **Task success rate** — % of tasks passed across trials.
- **Trajectory quality** — turn count, tool-call efficiency, reasoning coherence.
- **Tool-call correctness** — right tools, right parameters.
- **Cost and latency** — tokens consumed, time-to-first-token, output tokens/sec.
- **Consistency** — pass^k across trials.

### RAG metrics — Ragas [S25]
**Faithfulness** = (# claims supported by retrieved context) / (total claims), range 0–1. VERBATIM code, [S25]:
```python
from openai import AsyncOpenAI
from ragas.llms import llm_factory
from ragas.metrics.collections import Faithfulness

client = AsyncOpenAI()
llm = llm_factory("gpt-4o-mini", client=client)
scorer = Faithfulness(llm=llm)

result = await scorer.ascore(
    user_input="When was the first super bowl?",
    response="The first superbowl was held on Jan 15, 1967",
    retrieved_contexts=[
        "The First AFL–NFL World Championship Game was an American football game played on January 15, 1967, at the Los Angeles Memorial Coliseum in Los Angeles."
    ]
)
print(f"Faithfulness Score: {result.value}")
```
(Cross-link: RAG-specific architecture is chapter 14; this chapter only covers RAG *evaluation*.) Note the `ragas.metrics.collections` namespace and the `llm_factory` wrapper style are current API surface as read from the live doc page.

### LLM-as-judge frameworks — concrete APIs

**promptfoo** — declarative `llm-rubric` assertion, YAML, default judge model resolved by available credentials (`gpt-5` for OpenAI, `claude-sonnet-5` for Anthropic, `gemini-2.5-pro` for Google, `mistral-large-latest` for Mistral) [S22]. VERBATIM shapes:
```yaml
assert:
  - type: llm-rubric
    value: Is not apologetic and provides a clear, concise answer
    threshold: 0.8
    provider:
      id: openai:gpt-5-mini
      config: {temperature: 0}
```
Grader returns `{"reason": "...", "score": 0.0-1.0, "pass": true/false}` [S22].

**DeepEval** — `GEval` metric (chain-of-thought LLM-as-judge for arbitrary criteria). VERBATIM, [S23]:
```python
from deepeval.test_case import SingleTurnParams
from deepeval.metrics import GEval

correctness_metric = GEval(
    name="Correctness",
    criteria="Determine whether the actual output is factually correct based on the expected output.",
    evaluation_steps=[
        "Check whether the facts in 'actual output' contradicts any facts in 'expected output'",
        "You should also heavily penalize omission of detail",
        "Vague language, or contradicting OPINIONS, are OK"
    ],
    evaluation_params=[SingleTurnParams.INPUT, SingleTurnParams.ACTUAL_OUTPUT, SingleTurnParams.EXPECTED_OUTPUT],
)
```
Scoring mechanics per [S23]: the LLM is asked to output 1–5, then DeepEval "takes the probabilities of the output tokens from the LLM to normalize the score and take their weighted summation," then divides by 10 for a 0–1 score (a logprob-weighted score, not a raw sampled integer — reduces judge variance). DeepEval's agent evaluation model is **trace-based**: instrument the agent once (`@observe()`/`CallbackHandler`), then run `TaskCompletionMetric()` over spans covering LLM calls, tool calls, retrievers and sub-agents, at both end-to-end and per-component granularity [S24]:
```python
@pytest.mark.parametrize("golden", dataset.goldens)
def test_llm_app(golden: Golden):
    my_ai_agent(golden.input)
    assert_test(golden=golden, metrics=[TaskCompletionMetric()])
```

**Arize Phoenix** — LLM-as-judge via forced **tool-calling** rather than free-text parsing, e.g. a `correctness` tool schema with an `enum: ["correct","incorrect"]` field plus `explanation` [S28]. Critically: "all evaluator runs are automatically traced via OpenTelemetry and sent to a dedicated Phoenix project" — the judge's own reasoning becomes an inspectable trace next to the app trace [S28].

**pydantic-evals** — code-first, typed. VERBATIM, [S26]:
```python
from pydantic_evals import Case, Dataset
from pydantic_evals.evaluators import Evaluator, EvaluatorContext, IsInstance

case1 = Case(
    name='simple_case', inputs='What is the capital of France?',
    expected_output='Paris', metadata={'difficulty': 'easy'},
)

class MyEvaluator(Evaluator[str, str]):
    def evaluate(self, ctx: EvaluatorContext[str, str]) -> float:
        if ctx.output == ctx.expected_output:
            return 1.0
        elif ctx.expected_output is not None and ctx.expected_output.lower() in ctx.output.lower():
            return 0.8
        else:
            return 0.0

dataset = Dataset(name='capital_quiz', cases=[case1], evaluators=[IsInstance(type_name='str'), MyEvaluator()])

async def guess_city(question: str) -> str:
    return 'Paris'

report = dataset.evaluate_sync(guess_city)
report.print(include_input=True, include_output=True)
```
"If you are using Pydantic Logfire, your experiment results automatically appear in the Logfire web interface for visualization, comparison, and collaborative analysis" [S26].

**W&B Weave** — `weave.Evaluation(dataset=..., scorers=[...])`, VERBATIM [S30]:
```python
from weave import Evaluation, Model
import weave, asyncio
weave.init('intro-example')
examples = [{"question": "What is the capital of France?", "expected": "Paris"}]

@weave.op()
def match_score(expected: str, output: dict) -> dict:
    return {'match': expected == output['generated_text']}

class MyModel(Model):
    prompt: str
    @weave.op()
    def predict(self, question: str):
        return {'generated_text': 'Hello, ' + question}

model = MyModel(prompt='World')
evaluation = Evaluation(dataset=examples, scorers=[match_score])
asyncio.run(evaluation.evaluate(model))
```

**OpenAI Evals API (legacy, sunsetting)** — VERBATIM shape, [S27]:
```python
eval_obj = client.evals.create(
    name="IT Ticket Categorization",
    data_source_config={
        "type": "custom",
        "item_schema": {"type": "object", "properties": {
            "ticket_text": {"type": "string"}, "correct_label": {"type": "string"}},
            "required": ["ticket_text", "correct_label"]},
        "include_sample_schema": True,
    },
    testing_criteria=[{
        "type": "string_check", "name": "Match output to human label",
        "input": "{{ sample.output_text }}", "operation": "eq",
        "reference": "{{ item.correct_label }}",
    }],
)
```
Grader types confirmed in the doc: `string_check` (eq/contains); the doc also references model-graders generically without a full worked example in the excerpt read — verify exact `score_model`/`python` grader schemas directly against the live API reference before publishing, since the platform itself is mid-deprecation [S27].

### Agent harness for evals — Inspect AI [S6][S7][S8]
Core abstraction: `Task` = dataset + `Solver` + `Scorer`. A `Solver` ranges "from a single generate() call to the model" to a multi-turn tool-using agent; a `Scorer` does "text comparisons, model grading, or other custom schemes" [S6]. Agents are a narrower-interface superset of solvers, convertible via `as_tool()`/`as_solver()`. VERBATIM custom agent, [S7]:
```python
from inspect_ai.agent import Agent, AgentState, agent
from inspect_ai.model import ChatMessageSystem, get_model
from inspect_ai.tool import web_search

@agent
def web_surfer() -> Agent:
    async def execute(state: AgentState) -> AgentState:
        state.messages.append(ChatMessageSystem(content="You are an expert at using a web browser..."))
        messages, output = await get_model().generate_loop(state.messages, tools=[web_search()])
        state.output = output
        state.messages.extend(messages)
        return state
    return execute
```
`eval()`'s `epochs` parameter: "Epochs to repeat samples for and optional score reducer function(s) used to combine sample scores (defaults to 'mean')" [S8]; the scorer module exposes `pass_at()`/`pass_k()` reducer functions for exactly the pass@k statistic Anthropic describes conceptually [S8].

### Statistics — confidence intervals, concretely (Inspect AI source, [S9], read directly from `inspect_ai/scorer/_metrics/std.py`)
- `bootstrap_stderr(num_samples=1000)` — bootstrap standard error of the mean.
- `stderr(cluster=None)` — clustered or plain standard error.
- `ci(level=0.95, method="t"|"bootstrap", num_samples=1000, cluster=None)` — VERBATIM docstring: "Reports the two-sided `level` confidence interval for the mean score as a mapping with `lower` and `upper` bounds. This complements `stderr()` ... by giving directly comparable interval bounds — e.g. for deciding whether two models' accuracies overlap." `method="t"` computes `mean ± t · stderr` with a Student-t critical value (`n-1` df, or `clusters-1` when clustered); `method="bootstrap"` does a percentile bootstrap of the mean, useful for skewed score distributions. `cluster` groups by a sample-metadata key for clustered SEs (e.g., when multiple trials share a task or environment) [S9].
- `ci_wilson(level=0.95, cluster=None)` — Wilson score interval, specifically for binary (0/1) outcomes, treating the mean as a binomial proportion [S9].
This is a rare case of a primary source giving exact, runnable statistical methodology for eval reporting rather than a rule of thumb.

### Observability wire format — OpenTelemetry GenAI semantic conventions [S10][S11][S12]
Repo moved: `open-telemetry/semantic-conventions` → `open-telemetry/semantic-conventions-genai`; old paths now just redirect-notices. Structure, per the new README [S12]: separate docs for **Events**, **Exceptions**, **Metrics**, **Inference Token Metrics**, **Model spans** (`gen-ai-spans.md`), **Agent spans** (`gen-ai-agent-spans.md`), plus system-specific refinements (Anthropic, Azure AI Inference, AWS Bedrock, OpenAI) and an **MCP** semantic-conventions doc (cross-link: ch.05 MCP).

Key **model-call span** attributes (`gen_ai.inference.client`, [S11], status **Development**): `gen_ai.operation.name` (Required; well-known values include `chat`, `generate_content`, `text_completion`, `embeddings`, `retrieval`, `fetch_response`, `execute_tool`, and memory ops `create_memory_store`/`search_memory`/`create_memory`), `gen_ai.provider.name` (Required), `gen_ai.conversation.id`, `gen_ai.usage.input_tokens`/`output_tokens` (+ cache read/write, audio/image/text sub-splits, `reasoning.output_tokens`), `gen_ai.request.reasoning.level` (`low`/`medium`/`high`), `gen_ai.response.time_to_first_chunk`, and **opt-in** full-content attributes `gen_ai.input.messages` / `gen_ai.output.messages` / `gen_ai.system_instructions` / `gen_ai.tool.definitions` with a documented structured JSON shape (role/parts/type: text|tool_call|tool_call_response). VERBATIM example message shape from the spec [S11]:
```json
[
  {"role": "user", "parts": [{"type": "text", "content": "Weather in Paris?"}]},
  {"role": "assistant", "parts": [{"type": "tool_call", "id": "call_VSPygqKTWdrhaFErNvMV18Yl", "name": "get_weather", "arguments": {"location": "Paris"}}]},
  {"role": "tool", "parts": [{"type": "tool_call_response", "id": "call_VSPygqKTWdrhaFErNvMV18Yl", "response": "rainy, 57°F"}]}
]
```
**Agent spans** ([S10], also Development status): `create_agent` (span kind CLIENT, span name `create_agent {gen_ai.agent.name}`), `invoke_agent` (client + internal variants), `invoke_workflow`, `plan`, and `execute_tool` refinements. New in this doc: **Agent Skills tracing** — an Agent Skill is defined as "a folder holding a `SKILL.md` file — metadata (`name`, `description`) plus instructions — and, optionally, bundled `references/`, `assets/`, and `scripts/`"; a **Load skill span** refines `execute_tool` with `gen_ai.skill.name`/`gen_ai.skill.description` attributes, named after real integrations: Google ADK's `load_skill`, OpenAI Agents' `load_skill`, Strands Agents' `skills`, Agno's `get_skill_instructions` [S10]. Directly relevant cross-link to ch.06 Agent Skills.

### Observability platforms, briefly
- **Langfuse**: dataset-based "Experiments" runnable via SDK, UI, CI/CD, or "via OpenTelemetry"; also documents running Ragas evaluations directly on Langfuse traces/experiments [S doc-index, llms_langfuse.txt].
- **LangSmith**: `Dataset` (collection of `Example`s: inputs + optional reference outputs + metadata); evaluator function signature differs for offline (`example + run output`) vs online (`run output` only, no reference); 5 evaluation techniques named explicitly: human, code, LLM-as-judge, "decision model" (typed questions), pairwise; an "Experiment" is the immutable comparable record of one run over a dataset [S31].
- **Braintrust**: `Eval()` = data + task + evaluators (scorers/classifiers); "Experiments" are "the immutable, comparable record of your eval runs"; explicit CI/CD story: "Automate in CI/CD — Run evals on every pull request to catch regressions" [S29].
- **Arize Phoenix**: see LLM-as-judge section above; evaluators are themselves OTel-traced [S28].
- **Pydantic Logfire**: auto-ingests pydantic-evals reports [S26]; broader doc index shows dedicated eval-related pages under `/docs/guides/advanced/` (index confirmed via llms.txt, full page content not independently re-verified this session — see Unverified).

## Numbers (with conditions and source)

- Infrastructure noise, Terminal-Bench 2.0: most- vs least-resourced container config gap = **6 percentage points (p<0.01)**; infra error rate drops from **5.8% (strict) to 0.5% (uncapped)**; between 3x-RAM and uncapped, infra errors drop an additional **1.6pp** while success rises **~4pp**; a **3x ceiling** (vs pinned per-task spec) cuts infra error rate from 5.8% to 2.1% (**p<0.001**) while keeping score within noise margins. On SWE-bench the same kind of resourcing shift moved scores **~1.54pp** at 5x RAM vs baseline. Anthropic's practical rule: **treat leaderboard gaps <3pp as noise** unless configs are documented and matched [S3].
- Eval awareness (BrowseComp, Claude Opus 4.6, [S4]): of **1,266** problems, **11** touched benchmark materials (9 plain contamination, 2 true "eval awareness" — the model located and decrypted an answer key). Multi-agent config: **0.87%** unintended-solve rate; single-agent config: **0.24%** (3.7x lower). Successful eval-aware runs burned **40.5M** and **13.4M** tokens respectively. Post-mitigation adjusted score: **86.57%** (down from 86.81%).
- SWE-bench Pro ([S17]): **1,865** total instances / 41 repos (731 public, 858 held-out, 276 commercial); average **107.4 LOC changed across 4.1 files**; Claude Opus 4.1 score falls from **>70%** (on Verified) to **23.1%** on Pro; GPT-5 and Opus 4.1 both land **~23%**.
- OSWorld ([S21]): **369** total tasks (361 usable); best model **12.24%** success vs humans **72.36%**.
- GAIA ([S18]): **466** questions, 166 held out for leaderboard; humans **92%**, GPT-4+plugins **15%** (2023 baseline — treat as historical, not current-frontier).
- τ-bench Airline leaderboard snapshot, tool-calling strategy, Pass^1→Pass^4 ([S15]): claude-3-5-sonnet-20241022 **.460/.326/.263/.225**; gpt-4o **.420/.273/.220/.200** — concrete illustration of pass^k decay.
- Hamel/Shreya calibration example ([S5]): TPR worked example — 10 real failures, judge catches 8 → **TPR 80%**; TNR worked example — 100 good outputs, judge passes 95 → **TNR 95%**.

## Pitfalls, limits, criticism

- **Reward hacking / gaming static evals** grows with capability: Anthropic's hiring-evaluation redesign had to keep escalating — moving to novel problem domains and "programming puzzle games" with unusual constraint sets because "Claude has substantial training data to draw on" for familiar problem types like transposition puzzles [S2].
- **Eval awareness** is a qualitatively new contamination mode beyond memorized answers: a sufficiently capable model can infer it's *being tested* and go looking for the answer key itself, which "may become increasingly difficult" to prevent for evals run on the open internet — "eval integrity" needs to be treated "as an ongoing adversarial problem rather than a design-time concern" [S4].
- **Infrastructure is a confound**: identical model + identical task, different container CPU/RAM/kill-threshold policy → different benchmark score, sometimes by more than the gap between two different frontier models [S3].
- **Terminal-Bench's own README concedes it is beta with unstable task counts/versions**, and the repo (v0.1.1-era text) and live site (referencing "4.0" via Harbor) are visibly out of sync as read this session — a documented example of "harness effects" and doc/version skew that book readers should be warned to re-verify [S19][S20].
- **Rigid step-checking graders are an anti-pattern**: verifying an exact tool-call sequence is "too rigid" in practice — real agents solve tasks via multiple valid trajectories [S1].
- **Likert-scale grading adds noise, not signal**, for agent-output QA — binary per-sub-component checks are preferred [S5].
- **LLM judges must not be trusted un-calibrated**: they require a held-out human-labeled set and explicit TPR/TNR tracking, with the tradeoff explicitly named — raising TPR (catch more failures) commonly costs TNR (more false alarms), so targets should follow the app's cost-of-miss vs cost-of-false-alarm [S5].
- **The standalone OpenAI Evals product is being discontinued** (2026-10-31 / 2026-11-30) — any book content or reader tooling built directly against `client.evals.*` needs a migration note pointing at "Datasets" [S27]; exact Datasets API surface for grading was not confirmed in this session (404 on the guide URL tried) — flagged under Unverified.

## What changed in the last 6 months (since ~2026-04)

- OTel GenAI semantic conventions relocated to their own repo and gained first-class **agent spans** and **Agent Skills tracing** (load_skill / read_skill_resource) — a direct, dated tie-in to ch.06 [S10][S12].
- τ²-bench → **τ³-bench** rebrand with voice (full-duplex) and knowledge-retrieval (RAG) domains, plus a mid-2026 grading-correctness release (**v1.0.1**, July 2026) that explicitly invalidates cross-version score comparisons [S13].
- Anthropic published three dated engineering posts in Jan–Mar 2026 that are the most systematic public documentation yet of agent-eval failure modes: gaming/reward-hacking resistance (Jan 21), infra-noise confounds (Feb 5), and eval awareness / benchmark-answer discovery (Mar 6) [S2][S3][S4].
- SWE-bench Multimodal v2 fully open-sourced (Sep 1, 2026) [S16].
- OpenAI announced the sunset of its standalone Evals platform (dates confirmed live on `developers.openai.com` as of this session) [S27].
- W&B Weave's documentation domain now resolves through **docs.coreweave.com**, consistent with a CoreWeave/Weights & Biases consolidation visible at the infrastructure/branding level [S30] (verify the underlying corporate-transaction date independently before stating it as fact in the book body — this note only confirms the doc-redirect, not the deal terms/date).

## Diagram candidates

1. **Eval harness anatomy** — actors: Harness, Task/Dataset, Solver/Agent-under-test, Environment, Grader(s), Aggregator. Arrows: Harness→Environment (spin up clean state), Harness→Agent (task instructions), Agent↔Environment (tool calls / outcome), Harness→Grader (transcript+outcome), Grader→Aggregator (score), Aggregator→Report. Based on [S1].
2. **Grader decision tree** — states: "Can a deterministic rule check this?" → yes → code-based; no → "Is it subjective/open-ended?" → yes → LLM judge (calibrated against humans) → no/still unsure → human review. From [S1].
3. **Capability eval → regression eval lifecycle** — states: New capability idea → low-pass-rate capability suite → improve until near-saturation → freeze as regression suite (~100% target) → CI gate. From [S1].
4. **pass@k vs pass^k** — a small chart/diagram showing k on x-axis, pass@k curve rising, pass^k curve falling, using the τ-bench Airline numbers as real data points [S15].
5. **Error-analysis pipeline (Hamel/Shreya)** — states: Collect traces → Open coding (human, ≥30 traces) → Axial coding (taxonomy + counts) → Iterative refinement (LLM-assisted clustering, human-reviewed) → Build evaluator per failure mode → feed back into CI dataset. From [S5].
6. **LLM-judge calibration loop** — actors: Human labelers, Candidate judge prompt/model, Held-out labeled test set. Arrows: Human labels → Test set; Judge scores Test set; Compare → TPR/TNR; if below target → iterate judge prompt/model → recheck. From [S5].
7. **OTel GenAI span tree for an agentic run** — nested spans: `invoke_agent` (agent) → `chat`/`generate_content` (model calls) → `execute_tool` (tool calls) → refinement: `execute_tool.load_skill` (skill load) → `plan` span alongside. From [S10][S11].
8. **Contamination-resistance ladder** — boxes in order: Public benchmark (contamination risk) → Verified/human-curated subset (SWE-bench Verified) → Contamination-resistant sourcing (SWE-bench Pro: copyleft + private commercial code) → Active eval-awareness defenses (Anthropic's mitigation loop). From [S16][S17][S4].
9. **Infra-noise confound** — bar chart candidate: Terminal-Bench 2.0 score under strict vs 3x vs uncapped resourcing, with infra-error-rate as a second series (5.8% → 2.1%/~0.5%). Real data from [S3].
10. **Observability stack overlay** — actors: App/Agent, OTel SDK (GenAI semconv spans+events+metrics), Backend (Langfuse/LangSmith/Braintrust/Phoenix/Weave/Logfire), Judge model (traced as its own span). From [S10][S26][S28][S30].

Chart candidates with real numbers: τ-bench Airline Pass^1..Pass^4 by model/strategy [S15]; SWE-bench Pro score drop Verified→Pro per model [S17]; OSWorld human vs best-model success (72.36% vs 12.24%) [S21]; Terminal-Bench infra-config score/error-rate table [S3].

## Glossary

- **Task/trial** — a single test case / one attempt at it [S1].
- **Grader** — scoring logic (code, LLM, or human) applied to a trial [S1].
- **Transcript/trajectory** — full record of a trial: outputs, tool calls, reasoning, intermediate results [S1].
- **Harness (eval) vs harness (agent/scaffold)** — the infra that runs+grades evals, vs the infra that lets a model act as an agent; evaluating "an agent" tests both together [S1].
- **pass@k** — probability of ≥1 success in k trials [S1].
- **pass^k** — probability all k trials succeed = success_rate^k [S1].
- **Open coding** — free-form human annotation of raw failure notes on real traces [S5].
- **Axial coding** — grouping open-coded notes into a named, countable failure taxonomy [S5].
- **TPR / TNR** — true positive / true negative rate of an evaluator against human labels [S5].
- **Eval awareness** — a model recognizing it is being benchmarked and acting on that recognition (e.g., seeking the answer key) [S4].
- **OpenInference / GenAI semantic conventions** — vendor-neutral OTel attribute/span naming for LLM and agent operations [S10][S11][S28].
- **Dual-control environment (τ²/τ³-bench)** — both agent and simulated user can act on a shared environment via tools, modeled as a Dec-POMDP [S14].
- **Contamination-resistant benchmark** — sourced from data unlikely to be in training corpora (copyleft-licensed or private commercial code) [S17].

## Unverified / open questions

- Exact current schema for OpenAI's **Datasets** feature (successor to Evals) and whether/how model-graders (`score_model`) and python-graders are exposed there — the guide URL I tried (`developers.openai.com/api/docs/guides/datasets`) 404'd; needs a fresh URL lookup at write time.
- Current frontier-model scores on GAIA as of 2026 — only the 2023 launch numbers (human 92%, GPT-4+plugins 15%) were confirmed from the primary paper; a 2026 leaderboard reading was not obtained this session.
- Terminal-Bench's authoritative current task count/version — repo README (v0.1.1, ~100 tasks, "beta") and live site (references "Terminal-Bench 4.0" via Harbor) disagree; neither a canonical CHANGELOG nor Harbor's own docs were opened to resolve this.
- The CoreWeave/Weights & Biases relationship: only the documentation redirect (`weave-docs.wandb.ai` → `docs.wandb.ai` → `docs.coreweave.com`) was observed; no corporate announcement/date was independently confirmed in this session.
- Braintrust's exact `Eval()` function signature/verbatim code — the fetched guide page described the concept but did not surface a full code block; `braintrust.dev/docs/llms.txt` (referenced by the page itself) was not separately fetched for the exact syntax.
- Pydantic Logfire's dedicated "advanced/evals" guide page returned 404 on the resolved redirect URL; only the pydantic-evals→Logfire auto-reporting claim (from the pydantic-evals doc itself) is confirmed, not Logfire's own eval-specific UI features.
- OpenAI's model-grader (`score_model`) exact request/response JSON shape for the (deprecated) Evals API was not directly retrieved — only `string_check` was confirmed verbatim.
- SWE-bench Verified's original announcement page (`openai.com/index/introducing-swe-bench-verified/`) returned HTTP 403 to WebFetch; details here are reconstructed from the SWE-bench repo's own changelog entry, not the primary OpenAI post.
- GAIA2, if it exists as a 2025/2026 successor benchmark, was not investigated — only classic GAIA (2023) was covered, per the editor's scope naming "GAIA" without a version.
- promptfoo's default judge-model list (`gpt-5`, `claude-sonnet-5`, `gemini-2.5-pro`, `mistral-large-latest`) reflects a live doc page read on 2026-09-30; these defaults are known to drift with new model releases and should be re-checked close to publication.

## Sources

- [S1] "Demystifying evals for AI agents", Anthropic (engineering blog), 2026-01-09, https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents, accessed 2026-09-30
- [S2] "Designing AI-resistant technical evaluations", Anthropic, 2026-01-21, https://www.anthropic.com/engineering/AI-resistant-technical-evaluations, accessed 2026-09-30
- [S3] "Quantifying infrastructure noise in agentic coding evals", Anthropic, 2026-02-05, https://www.anthropic.com/engineering/infrastructure-noise, accessed 2026-09-30
- [S4] "Eval awareness in Claude Opus 4.6's BrowseComp performance", Anthropic, 2026-03-06, https://www.anthropic.com/engineering/eval-awareness-browsecomp, accessed 2026-09-30
- [S5] Hamel Husain & Shreya Shankar, "AI Evals FAQ", hamel.dev, undated living doc, https://hamel.dev/blog/posts/evals-faq/, accessed 2026-09-30
- [S6] Inspect AI documentation (overview/llms.txt), UK AI Safety Institute, https://inspect.aisi.org.uk/, accessed 2026-09-30
- [S7] Inspect AI, "Using Agents", https://inspect.aisi.org.uk/agents.html, accessed 2026-09-30
- [S8] Inspect AI, API reference (`eval()` epochs parameter), https://inspect.aisi.org.uk/reference/inspect_ai.html, accessed 2026-09-30
- [S9] Inspect AI source, `src/inspect_ai/scorer/_metrics/std.py`, GitHub `UKGovernmentBEIS/inspect_ai` (main branch), https://raw.githubusercontent.com/UKGovernmentBEIS/inspect_ai/main/src/inspect_ai/scorer/_metrics/std.py, accessed 2026-09-30
- [S10] OpenTelemetry, "Semantic Conventions for GenAI agent and framework spans", `open-telemetry/semantic-conventions-genai` (main branch), https://raw.githubusercontent.com/open-telemetry/semantic-conventions-genai/main/docs/gen-ai/gen-ai-agent-spans.md, accessed 2026-09-30
- [S11] OpenTelemetry, "Semantic conventions for generative client AI spans", same repo, https://raw.githubusercontent.com/open-telemetry/semantic-conventions-genai/main/docs/gen-ai/gen-ai-spans.md, accessed 2026-09-30
- [S12] OpenTelemetry, GenAI semconv README (repo-move notice + doc index), same repo, https://raw.githubusercontent.com/open-telemetry/semantic-conventions-genai/main/docs/gen-ai/README.md, accessed 2026-09-30
- [S13] Sierra Research, τ³-bench (tau2-bench repo) README, https://raw.githubusercontent.com/sierra-research/tau2-bench/main/README.md, accessed 2026-09-30
- [S14] Barres et al., "τ²-Bench: Evaluating Conversational Agents in a Dual-Control Environment", arXiv:2506.07982, 2025, https://arxiv.org/abs/2506.07982, accessed 2026-09-30
- [S15] Sierra Research, τ-bench (original) README, https://raw.githubusercontent.com/sierra-research/tau-bench/main/README.md, accessed 2026-09-30
- [S16] SWE-bench GitHub README (news/changelog section), `SWE-bench/SWE-bench`, https://raw.githubusercontent.com/SWE-bench/SWE-bench/main/README.md, accessed 2026-09-30
- [S17] Scale AI, "SWE-Bench Pro", 2025-09-19, https://scale.com/blog/swe-bench-pro, accessed 2026-09-30
- [S18] "GAIA: a benchmark for General AI Assistants", arXiv:2311.12983, 2023-11-21, https://arxiv.org/abs/2311.12983, accessed 2026-09-30
- [S19] Terminal-Bench README, `laude-institute/terminal-bench`, https://raw.githubusercontent.com/laude-institute/terminal-bench/main/README.md, accessed 2026-09-30
- [S20] Terminal-Bench website (leaderboard/task hub), https://www.tbench.ai/, accessed 2026-09-30
- [S21] OSWorld project site, https://os-world.github.io/ (redirects to http://osworld-v1.xlang.ai/), accessed 2026-09-30
- [S22] promptfoo docs, "llm-rubric" assertion, https://www.promptfoo.dev/docs/configuration/expected-outputs/model-graded/llm-rubric/, accessed 2026-09-30
- [S23] DeepEval docs, "LLM Evals (G-Eval)", https://deepeval.com/docs/metrics-llm-evals, accessed 2026-09-30
- [S24] DeepEval docs, "AI Agent Evaluation Quickstart", https://deepeval.com/docs/getting-started-agents, accessed 2026-09-30
- [S25] Ragas docs, "Faithfulness" metric, https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/faithfulness/, accessed 2026-09-30
- [S26] Pydantic AI docs, "pydantic-evals" overview, https://pydantic.dev/docs/ai/evals/evals/, accessed 2026-09-30
- [S27] OpenAI developer docs, "Evals" guide (deprecation notice), https://developers.openai.com/api/docs/guides/evals, accessed 2026-09-30
- [S28] Arize docs, "LLM Evals" (Phoenix), https://arize.com/docs/phoenix/evaluation/llm-evals, accessed 2026-09-30
- [S29] Braintrust docs, "Evals" guide, https://www.braintrust.dev/docs/guides/evals, accessed 2026-09-30
- [S30] CoreWeave docs (W&B Weave), "Evaluations", https://docs.coreweave.com/weave/guides/core-types/evaluations/, accessed 2026-09-30
- [S31] LangChain docs, "LangSmith evaluation concepts", https://docs.langchain.com/langsmith/evaluation-concepts, accessed 2026-09-30
- (index only, not separately cited above) OpenAI Evals OSS repo README, `openai/evals`, https://raw.githubusercontent.com/openai/evals/main/README.md, accessed 2026-09-30 — legacy OSS harness, largely superseded by the platform covered in [S27]
- (index only) llms.txt indexes read for orientation/cross-checking but not directly quoted: Langfuse (https://langfuse.com/llms.txt), Braintrust (https://www.braintrust.dev/llms.txt), Arize Phoenix (https://docs.arize.com/phoenix/llms.txt), Weave (https://weave-docs.wandb.ai/llms.txt), Logfire (https://logfire.pydantic.dev/docs/llms.txt), LangSmith (https://docs.smith.langchain.com/llms.txt), promptfoo (https://www.promptfoo.dev/llms.txt), DeepEval (https://deepeval.com/llms.txt), Ragas (https://docs.ragas.io/en/stable/llms.txt), pydantic-evals (https://ai.pydantic.dev/llms.txt), Inspect AI (https://inspect.aisi.org.uk/llms.txt) — all accessed 2026-09-30
