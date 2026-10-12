# 17. Метрики, evals и приёмочные тесты — completeness critic / gap-filler notes

Scope of this file: (1) contradictions between spec.md / practice.md / field.md resolved against primary sources; (2) the claims a writer is most likely to get wrong; (3) gaps and freshness fixes (last ~3 months) the three notes missed. Source ids here are **[G#]** (own list at the bottom) so they do not collide with the [S#] ids of the other three files. Everything was re-read live on 2026-09-30.

## Contradictions resolved

1. **Date of OpenAI's "SWE-bench Verified no longer measures frontier coding capabilities".** field.md dates it 2026-04-26. The first HN submission of the same URL is 2026-02-23 (item 47126205); 2026-04-26 (item 47910388, 343 pts) is a repost [G31]. openai.com returns 403 to fetchers, so no page date was read. Resolution: **published about 2026-02-23**. The HN thread quotes the post verbatim: "We audited a 27.6% subset of the dataset that models often failed to solve and found that at least 59.4% of the audited problems have flawed test cases that reject functionally correct submissions". That is **about 16% of the whole dataset** (0.594 × 0.276; COMPOSED arithmetic). The post also says: "In the last months we've chosen to report results from the public split of SWE-Bench Pro. We recommend other model developers do the same." [G31]
2. **SWE-bench Pro size** (spec: 1,865; practice: 1,865/41 repos; field: V2 642 tasks/11 repos, V1 731). All three numbers are right, at different levels. The paper has **1,865 total** tasks: 731 public, 858 held-out, 276 commercial [spec S17]. The public split has **731** tasks, which is v1 (HF config `v1`, tag `v1.0`). **V2**, released 2026-09-22, keeps **642 validated public tasks across 11 repos**: 89 were dropped, 529 problem statements rewritten, 214 test patches and 38 gold patches revised, and the tasks now use the Harbor format. It adds a HARD-51 subset and a "locked protocol" (offline agent, verifier re-run on a pristine image). The HF `default` config is now V2 [G6][G7]. v1 and V2 scores are not comparable.
3. **OSWorld "2.0" vs "OSWorld-Pro".** spec says OSWorld 2.0 launched 2026-06-26 and quotes 12.24%/72.36%. practice cites OSWorld-Pro (Sept 2026). They are **two different projects**:
   - **OSWorld 2.0** (XLANG Lab/HKU et al., announced 2026-06-26): 108 long-horizon tasks, median 1.6 h of human time. Claude Opus 4.8 (max thinking) completes 20.6% (binary) with a 54.8% partial score; GPT-5.5 plateaus near 14% [G36][G37].
   - **OSWorld-Pro** (NVIDIA, arXiv 2609.24890, 2026-09-21): process/subgoal grading, >300 tasks, >2,800 subgoals, >67k human annotations. Claude Opus 5 scores 75.7% on it vs 83.4% on OSWorld [G38].
   - The **12.24% vs 72.36%** figures are from the original 2024 OSWorld paper (369 tasks). Do not present them as current [G36].
4. **Terminal-Bench version.** spec found the repo README at v0.1.1 and the site at "4.0" and called them "out of sync". practice and field say 2.0/2.1. The tbench.ai blog index gives the real lineage [G19]:
   - TB 1.0: 2025-05-19.
   - TB 2.0 + Harbor: 2025-11-07, 89 tasks [G20][G25].
   - **TB 2.1: 2026-05-06**, fixed 28 of 89 tasks [G20].
   - **TB 3.0: 2026-07-30**, 74 tasks in 7 domains, best models ~34% [G21].
   - **TB 4.0: 2026-08-28**, semver "continuous benchmark": 8 tasks removed, 19 fixed, flat 8-hour agent timeout [G23].
   - The GitHub repo `laude-institute/terminal-bench` is legacy; the benchmark now ships through Harbor: `harbor run -d terminal-bench/terminal-bench@4.0.0` [G23].
5. **τ³-bench v1.0.1 contents.** practice says v1.0.1 = "75+ task-quality fixes"; field says it "broke comparability for banking_knowledge". The CHANGELOG supports field [G14]:
   - The 75+ fixes (airline/retail/banking) belong to **τ³-bench 1.0.0**, released spring 2026. Its GitHub release notes were last updated 2026-04-30; the τ-Knowledge paper is 2026-03-04 and τ-Voice is 2026-03-14 [G13][G15][G17][G18].
   - **v1.0.1 (2026-07-15)** only fixes `banking_knowledge` grading. Re-graded scores move "only upward … by up to ~9 points pass^1" (e.g. "GPT-5.5 xhigh: 37.37 → 46.39"). "Other domains are unaffected." [G14]
6. **Gaia2 release date** (field: 2025-09-24; practice: Feb 2026). The HF blog "Gaia2 and ARE" was published **2025-09-22** [G39]. The arXiv paper 2602.11964 was submitted **2026-02-12** [G40]. Both are "release" events; cite the blog for release and the paper for numbers ("GPT-5 (high) reaches … 42% pass@1"; Kimi-K2 21% best open) [G40].
7. **Date of the Hamel/Shreya FAQ** (spec: undated; practice: 2026-09-18/21). The page metadata says datePublished 2026-09-18, dateModified 2026-09-21, title "AI Evals: Everything You Need to Know". Individual questions carry their own `published` attributes going back to **2025-07-03** [G5]. Resolution: it is a living document first published mid-2025 and consolidated/re-published 2026-09-18. Cite it with "accessed 2026-09-30".
8. **What replaces OpenAI Evals.** spec says OpenAI steers users to "Datasets"; practice says promptfoo. The deprecations page names the migration path: "See **Moving from OpenAI Evals to Promptfoo**". The deprecation was **announced 2026-06-03**. Existing evals become read-only 2026-10-31, and "The Evals dashboard and API are scheduled to shut down" 2026-11-30. "Graders documented for eval workflows are part of this transition." [G27][G29] The Datasets guide carries the **same deprecation banner** [G28]. Do not present Datasets as the long-term successor.
9. **Who maintains Inspect.** spec says "UK AI Safety Institute"; practice says "UK AI Security Institute + Meridian Labs". The current docs say: "developed by the UK AI Security Institute and Meridian Labs" [G42]. "AI Safety Institute" is the pre-rename name.
10. **What the "eval awareness" rate measures.** spec says eval awareness happened "at rates of 0.24–0.87%". Anthropic's text: "The rate of unintended solutions was 0.24% in the single-agent configuration compared to 0.87% for multi-agent". That rate covers all unintended solutions, i.e. contamination plus eval awareness. Actual eval-awareness cases were 2 of 1,266 (plus 9 plain contamination cases) [G4].
11. **When OTel added the Evaluation Event.** field presents `Evaluation Event` as a 2026 addition; spec omits it. The core CHANGELOG lists it under **v1.38.0** ("Introducing `Evaluation Event` in GenAI Semantic Conventions"), released **2025-10-29** per the releases feed [G9][G10]. The GenAI move to its own repo is **v1.42.0 (2026-06-16)** [G9][G10]. The event name is `gen_ai.evaluation.result` [G8].
12. **Eval-driven development: advice or anti-pattern?** Anthropic: "We recommend practicing eval-driven development: build evals to define planned capabilities before agents can fulfill them" [G1]. OpenAI: "Adopt eval-driven development" [G30]. Hamel/Shreya: "Should I practice eval-driven development? **Generally no.** … Write evaluators for errors you discover, not errors you imagine". Their exception is known hard constraints such as "never mention competitors" [G5]. Resolution: the disagreement is real and should be shown as such. The two sides are closer than they look: Anthropic's capability evals come from "20-50 simple tasks drawn from real failures" [G1].
13. **Should trajectory checks be strict?** Anthropic finds exact tool-sequence checking "too rigid" and says "grade what the agent produced, not the path it took" [G1]. Google ADK's default `tool_trajectory_avg_score` is **1.0 ("requiring a 100% match in the tool usage trajectory")** [G58]. LangChain's trajectory evaluator defaults to `strict` in examples but offers `unordered`/`subset`/`superset` [G43][G44]. Resolution: frameworks ship strict defaults and practitioners' guides warn against them. Teach match modes and outcome-first grading.
14. **What SABER is.** practice and field call SABER (arXiv 2512.07850) "a task-quality audit paper". The paper is about **mutating vs non-mutating steps** ("each additional deviation in a mutating action reduces the odds of success by upto 92% on Airline and upto 96% on Retail"). It *also* identifies "ceiling effects in τ-Bench, where annotation errors and underspecified tasks artificially cap model performance" and releases "τ-Bench Verified" [G16]. The τ³ README says its fixes are "Based on analysis from SABER" [G13].
15. **Composo judge study date and headline.** field gives 2026-04-02 (GitHub). arXiv 2604.13717 was first submitted 2026-04-15 (v3 read). The abstract's headline is "up to 85.8% accuracy, **+13.5pp over baseline**" on RewardBench 2 [G62].
16. **Anthropic's SWE-bench framing is internally inconsistent.** One paragraph says "LLMs have progressed from 40% to >80% on this eval in just one year". Another says "SWE-Bench Verified scores started at 30% this year, and frontier models are now nearing saturation at >80%" [G1]. Quote one of them with its context. Do not merge them into a single number.

## Claims most likely to be wrong (with corrections)

1. **Wrong:** "OpenAI's Evals platform is being replaced by Datasets" or "…is still the OpenAI way to run evals".
   **Correct:** Deprecation announced 2026-06-03. Read-only from 2026-10-31. Dashboard **and API** shut down 2026-11-30. The official migration path is promptfoo (OpenAI acquired it on 2026-03-09). The Datasets guide carries the same deprecation banner [G27][G28][G29].
2. **Wrong:** "OpenAI dropped SWE-bench Verified in April 2026 because most of its tests are broken".
   **Correct:** The post dates from about 2026-02-23. It found ≥59.4% flawed tests *within an audited 27.6% subset of hard problems* (≈16% of the dataset). It recommends reporting the **public split of SWE-bench Pro** [G31].
3. **Wrong:** "SWE-bench Pro = 1,865 public tasks" or "731 tasks".
   **Correct:** 1,865 total (731 public, 858 held-out, 276 commercial). The current public release is **V2 (2026-09-22): 642 validated tasks, 11 repos, HARD-51 subset, locked protocol**. v1 numbers are not comparable [G6][G7].
4. **Wrong:** "Terminal-Bench 2.0 is the current version" or "92.8% on Terminal-Bench 2.1 is state of the art".
   **Correct:**
   - TB 2.1 (2026-05-06) fixed 28/89 tasks. Opus 4.6 in Claude Code went 58.0% → 70.1% from fixes alone [G20].
   - TB 3.0 (2026-07-30, 74 tasks, top ~34%) and TB 4.0 (2026-08-28, semver, 8 removed/19 fixed) followed [G21][G23].
   - A TB 2.1 score is a score on a saturating benchmark. Cognition's 92.8 is vendor-reported via an aggregator (field [S37]).
5. **Wrong:** "τ³-bench v1.0.1 added 75+ task fixes".
   **Correct:** The 75+ fixes shipped in **τ³ 1.0.0** (spring 2026). v1.0.1 (2026-07-15) fixed `banking_knowledge` grading only. Scores there rose up to ~9 pts pass^1; other domains are unchanged [G13][G14].
6. **Wrong:** "pass^k = p^k, so a 75% agent has pass^3 = 42%" (stated as a benchmark metric).
   **Correct:**
   - That formula is the idealized single-task, i.i.d. case (Anthropic's worked example [G1]).
   - Benchmarks use unbiased per-task estimators averaged over tasks. Inspect: pass@k = `1 - prod(1 - k/arange(n-c+1, n+1))` (Chen 2021), pass^k = `C(c,k)/C(n,k)` [G41]. You need n ≥ k trials per task.
   - Because tasks differ, mean(p_i^k) ≠ (mean p)^k. COMPOSED example: two tasks with p=1.0 and p=0.5 give mean p = 0.75, but pass^3 = (1+0.125)/2 = 0.5625, not 0.42.
7. **Wrong:** "On OSWorld the best model gets 12.24% vs humans 72.36%" or "OSWorld 2.0 = OSWorld-Pro".
   **Correct:** 12.24/72.36 is 2024 OSWorld v1. The current landmarks are OSWorld-Verified (2025-07-28), OSWorld 2.0 (2026-06-26: 108 tasks, Opus 4.8 20.6% binary) and NVIDIA's separate OSWorld-Pro (2026-09-21: Opus 5 75.7% vs 83.4% on OSWorld) [G36][G37][G38].
8. **Wrong:** OTel GenAI attribute names such as `gen_ai.system`, `gen_ai.prompt` / `gen_ai.completion`, per-message events, "GenAI conventions are stable", "they live in `open-telemetry/semantic-conventions`".
   **Correct:**
   - `gen_ai.system` was renamed `gen_ai.provider.name` in v1.37.0 (2025-08-25).
   - Chat history moved to the `gen_ai.input.messages` / `gen_ai.output.messages` / `gen_ai.system_instructions` attributes in v1.37.0.
   - The conventions moved to `open-telemetry/semantic-conventions-genai` in v1.42.0 (2026-06-16).
   - Status is still **Development** [G9][G10][G12].
9. **Wrong:** "Inspect AI is built by the UK AI Safety Institute".
   **Correct:** "developed by the UK AI Security Institute and Meridian Labs" [G42]. Latest version is inspect-ai 0.3.273 (2026-09-30) [G61].
10. **Wrong:** "Eval-driven development (write evals first) is the consensus best practice".
    **Correct:** Anthropic [G1] and OpenAI [G30] recommend it. Hamel/Shreya answer "Generally no" and recommend error analysis first [G5]. Present it as a live disagreement.
11. **Wrong:** DeepEval snippets using `LLMTestCaseParams` or `ConversationalGolden(user_description=...)`.
    **Correct:** Both are deprecated and emit warnings. Use `SingleTurnParams` (and `ToolCallParams`, `MultiTurnParams`) and `persona=Persona(characteristics=...)` [G47]. Current DeepEval is 4.2.7 (2026-09-29) [G61].
12. **Wrong:** "Ragas lives at `explodinggradients/ragas`; `from ragas.metrics import faithfulness`".
    **Correct:**
    - The repo now 301-redirects to **`vibrantlabsai/ragas`** [G48].
    - The current metrics API is class-based in `ragas.metrics.collections` (`Faithfulness`, `ContextPrecision`, `ContextRecall`, `AnswerRelevancy`, `NoiseSensitivity`, `ResponseGroundedness`, `ToolCallAccuracy`, `AgentGoalAccuracy`, `TopicAdherence`, …) [G48].
    - Latest release is 0.4.3 (2026-01-13). There has been no release in 8 months [G61].
13. **Wrong:** "Claude found the BrowseComp answer key in 0.87% of runs" (eval-awareness rate).
    **Correct:** 0.87% (multi-agent) and 0.24% (single-agent) are rates of *all unintended solutions*. Eval-aware decryption happened in 2 of 1,266 problems, and one run used 40.5M tokens (~38× median). The adjusted score is 86.57%, down from 86.81% [G4].
14. **Wrong:** "`agentevals` is the LangChain trajectory library" or "LangSmith/ADK trajectory = exact match".
    **Correct:** Trajectory evaluators are now in **openevals** (`from openevals import create_trajectory_match_evaluator`). Modes are `strict`/`unordered`/`subset`/`superset`, plus `tool_args_match_mode` in `exact`/`ignore`/`subset`/`superset`. `agentevals` on PyPI is frozen at 0.0.9 (2025-07-24) [G44][G61]. ADK's default *is* exact (1.0) [G58].
15. **Wrong:** Hamel/Shreya's numbers as they appeared in 2025 ("annotate ~30 traces", "use an LLM judge", 1–5 scales).
    **Correct** (2026-09 version):
    - Start with **100 diverse traces**, annotate **≥30 yourself** before letting an agent suggest failures, and continue past 100 until theoretical saturation [G5].
    - Label **100–200 examples per failure mode** for LLM judges. Split **10–20% train / 40–45% dev / 40–45% test**, with **30–50 Pass and 30–50 Fail** in both dev and test [G5].
    - The FAQ flashcard now replaces "LLM Judge" with **"Classifier for Evals"** (e.g. TypeSafe's Jev) [G5].
    - They report spending **60-80% of development time on error analysis and evaluation** and warn that a 100% pass rate means the evals are too easy [G5].

Extra traps (short):
- promptfoo's version is npm **0.123.1** (2026-09-18). PyPI `promptfoo` 0.2.0 is only a wrapper [G61].
- promptfoo's default `llm-rubric` grader depends on which key is present: `gpt-5` / `claude-sonnet-5` / `gemini-2.5-pro` / `mistral-large-latest` [G54]. This drifts.
- W&B Weave docs now need a "**CoreWeave Forge account**" [G60]. CoreWeave announced the W&B acquisition 2025-03-05 (HN pointer to PR Newswire) [G67].
- Langfuse is at **v4** (2026-08-17). Cloud becomes v4-only on **2026-11-16** [G49].

## TL;DR (what the three notes missed or underweighted)

- **Benchmarks are now versioned software.** Terminal-Bench moved to semver "continuous benchmarks" [G22][G23]:
  - patch: reuse old trials;
  - minor, i.e. a verifier change with separate agent/verifier containers: regrade saved artifacts;
  - major, i.e. an environment change: rerun.

  SWE-bench Pro V2 [G7] and τ³ v1.0.1 [G14] follow the same pattern. Always report a benchmark score with its version.
- **Grading bugs move scores more than model releases do:**
  - TB 2.0→2.1 fixes alone moved Opus 4.6/Claude Code from 58.0% to 70.1% (+12.1) [G20].
  - One τ³ banking grading fix: +9 pts pass^1 [G14].
  - CORE-Bench grading fixes: 42%→95% [G1].
  - "Extra read calls" zeroed the reward in τ³ banking_knowledge before v1.0.1, because every discoverable-tool call was DB-hashed [G14]. This is a textbook brittle-grader case.
- **Statistics: the canonical primary source was missing from all three notes.** Anthropic's "A statistical approach to model evaluations" (2024-11-19) and Miller's arXiv 2411.00640 give five recommendations [G2][G3]:
  - CLT standard errors;
  - cluster SEs ("can be over three times as large as naive standard errors");
  - reduce within-question variance by resampling;
  - paired differences (frontier-model question-score correlation 0.3–0.7);
  - power analysis.
- **The OTel Evaluation Event is real and used in practice.** `gen_ai.evaluation.result` has `gen_ai.evaluation.name` (required), `score.value`, `score.label`, `explanation` and `gen_ai.response.id` [G8]. pydantic-evals' online `@evaluate` decorator emits exactly this event, one per evaluator result [G56]. Online evaluation is becoming wire-format standard.
- **Agent Skills tracing is in OTel:** `execute_tool` refinements "Load skill span" / "Read skill resource span", `gen_ai.skill.name/description/source.uri` [G11]. Cross-link to ch.06.
- **The judge market is splitting.** LLM judges are now joined by typed "decision models" (TypeSafe **Jev**, **SemIf**). Integrations:
  - Langfuse: "Jev as a judge", 2026-09-22, $0.042 per 1M input tokens, calibrated probabilities, no rationale [G51].
  - LangSmith: "decision model, such as SemIf or Jev" [G52].
  - The Hamel FAQ now says "Classifier for Evals" [G5].
- **Online-eval mechanics that notes lacked:**
  - per-evaluator sampling rates: pydantic-evals `OnlineEvaluator(sample_rate=0.01, max_concurrency=5)` [G56]; LangSmith sampling 0.1 [G52];
  - consistent sampling across evaluators (Langfuse 2026-08-05) [G51];
  - backfills on historical traces (Langfuse 2026-09-07; LangSmith "only when you create the rule") [G51][G52];
  - weekly spend caps on evaluators, and online evaluators auto-upgrading trace retention, which changes billing (LangSmith) [G52].
- **CI gates.** Concrete artifacts:
  - promptfoo GitHub Action (before/after comparison on PRs), `promptfoo eval --fail-on-error`, and a jq pass-rate threshold script [G54];
  - DeepEval `deepeval test run` (practice [S26]).

  Pair them with the statistical critique: a naive threshold treats sampling noise as regression (field [S34], statgate).
- **Trajectory tooling has converged on the same four primitives:** tool used, args match, sequence/ordering, step/budget count. Examples:
  - promptfoo `trajectory:tool-used` / `tool-args-match` / `tool-sequence` / `step-count` + `trajectory:goal-success` [G54];
  - pydantic-evals `ToolCorrectness` / `TrajectoryMatch` / `ArgumentCorrectness` / `MaxToolCalls` / `MaxModelRequests` [G57];
  - DeepEval `ToolCorrectnessMetric` [G45];
  - openevals match modes [G44];
  - ADK `tool_trajectory_avg_score` [G58].
- **Span-based trajectory graders cannot see server-side/native tools** (OpenAI file search, Anthropic web search): "Native tools … don't produce local spans and are therefore invisible to these evaluators" [G57].
- **Harness choice changes cost more than accuracy** (imec, Sept 2026, 64 SWE-Bench Pro tasks, single trial): accuracy within ±4 tasks across Claude Code/Codex/Pi, but cost per resolved task "doubles from $0.35 to $0.7" depending on harness+model [G34].
- **Closing the loop.** GEPA (arXiv 2507.19457): reflective prompt evolution, "+10% over MIPROv2", "up to 35x fewer rollouts" than GRPO. It ships as `gepa.optimize`, `dspy.GEPA` and `optimize_anything`, and is now also packaged as an Agent Skill [G53]. Hamel's caveat: optimizers "cannot discover new [failures]"; use them only for the last mile after error analysis [G5].
- **The Braintrust security incident (2026-05-05/06)** involved customer-stored model-provider API keys in one AWS account; every customer was told to rotate keys [G35]. Eval platforms hold production secrets and traces. Cross-link to ch.16.

## Current state and versions (verified 2026-09-30)

| Thing | State | Source |
|---|---|---|
| OpenAI Evals (dashboard + API) | Deprecation announced 2026-06-03; read-only 2026-10-31; shutdown 2026-11-30; migration → promptfoo | [G27][G29] |
| OpenAI self-serve fine-tuning (RFT graders adjacent) | New jobs closed to new orgs 2026-05-07; to inactive orgs 2026-07-02; all new jobs end 2027-01-06 | [G27] |
| promptfoo | npm 0.123.1 (2026-09-18); OpenAI-owned since 2026-03; has `trajectory:*`, `agent-rubric`, `search-rubric` assertions | [G54][G61] |
| DeepEval | 4.2.7 (2026-09-29); agentic metrics: Task Completion, Step Efficiency, Argument Correctness, Tool Correctness, Plan Adherence, Plan Quality; multi-turn: Goal Accuracy, Agent Loop Detection, MCP Task Completion; ConversationSimulator (voice mode too) | [G45][G46][G61] |
| Inspect AI | 0.3.273 (2026-09-30); UK AISI + Meridian Labs; `pass_at(k)`, `pass_k(k)`, `at_least`, `majority`, `mean` reducers | [G41][G42][G61] |
| pydantic-evals | 2.52.0 (2026-09-30); online `@evaluate`; agentic span evaluators; emits `gen_ai.evaluation.result` | [G56][G57][G61] |
| Ragas | 0.4.3 (2026-01-13); repo `vibrantlabsai/ragas` | [G48][G61] |
| openevals / agentevals | openevals 0.2.0 (2026-04-07) holds trajectory + multiturn simulation; agentevals 0.0.9 (2025-07-24) | [G44][G61] |
| Langfuse | SDK 4.16.0; platform v4 (2026-08-17); Cloud v4-only 2026-11-16; ClickHouse-owned (Jan 2026) | [G49][G50][G61] |
| LangSmith | SDK 0.14.2 (2026-09-30); online evaluators w/ sampling, backfill, spend caps, decision-model judges | [G52][G61] |
| Arize Phoenix | arize-phoenix 20.16.0 (2026-09-23) | [G61] |
| W&B Weave | weave 0.53.11 (2026-09-25); docs at docs.coreweave.com; needs CoreWeave Forge account | [G60][G61] |
| Braintrust | SDK 0.43.0 (2026-09-28); Python SDK repo now `braintrust-sdk-python`; autoevals 0.3.0 (2026-06-09) | [G59][G61] |
| Logfire | 5.1.1 (2026-09-25); "AI Evaluations": hosted datasets, experiments, Live Evals, human review/annotation queues | [G55][G61] |
| Harbor | 0.23.0 (2026-09-12); runtime for TB 2.x–4.0 and SWE-bench Pro V2 | [G7][G23][G61] |
| GEPA / DSPy | gepa 0.1.4 (2026-07-15); dspy 3.4.0 (2026-09-25) | [G53][G61] |
| OTel GenAI semconv | Development; own repo since v1.42.0 (2026-06-16); new repo has no tagged release yet (CHANGELOG "Unreleased" only) | [G9][G10] |
| Terminal-Bench | 4.0 current (2026-08-28); 4.1 planned: tamper-resistant verifiers; 5.0: new tasks | [G23] |
| τ-bench | τ³ 1.0.1 (2026-07-15); leaderboard taubench.com; domains mock/airline/retail/telecom/banking_knowledge | [G13][G14] |
| SWE-bench Pro | V2 (2026-09-22) | [G6][G7] |
| SWE-bench Multimodal | v2 open-sourced 2026-09-01, 480 tasks | [G65] |
| OSWorld | OSWorld 2.0 (2026-06-26); OSWorld-Verified (2025-07-28); OSWorld-Pro separate (2026-09-21) | [G36][G37][G38] |

## Timeline (dated additions not in the other three files)

- 2024-11-01 / 2024-11-19: Miller "Adding Error Bars to Evals" (arXiv 2411.00640) / Anthropic research post [G2][G3].
- 2025-03-05: CoreWeave announces the W&B acquisition (HN pointer) [G67].
- 2025-05-19: Terminal-Bench 1.0 [G19].
- 2025-07-03: ABC, "Establishing Best Practices for Building Rigorous Agentic Benchmarks" (arXiv 2507.02825) [G63]; first dated questions of the Hamel/Shreya FAQ [G5].
- 2025-07-25: GEPA paper (arXiv 2507.19457) [G53].
- 2025-08-25: OTel semconv v1.37.0 renames `gen_ai.system`→`gen_ai.provider.name` and moves chat history to attributes [G9][G10].
- 2025-09-22: Gaia2 + ARE HF blog [G39].
- 2025-10-13: HAL, the Holistic Agent Leaderboard (arXiv 2510.11977) [G64].
- 2025-10-29: OTel v1.38.0 adds the Evaluation Event [G9][G10].
- 2025-11-07: Terminal-Bench 2.0 + Harbor [G25].
- 2025-11-26: SABER (arXiv 2512.07850) [G16].
- 2026-02-12: Gaia2 paper [G40].
- ~2026-02-23: OpenAI "Why SWE-bench Verified no longer measures frontier coding capabilities" [G31].
- 2026-03-04 / 03-14: τ-Knowledge / τ-Voice papers [G17][G18].
- 2026-04-15: Composo judge-technique paper, arXiv v1 [G62].
- 2026-04-19: Terminal-Bench "Leaderboard Integrity Update". ATIF trajectories required; an agent judge checks passing trials; OB-1 removed for encrypted solutions in its binary; ForgeCode trials rescored to 0 for curling solutions into AGENTS.md [G24].
- spring 2026 (release notes last updated 2026-04-30): τ³-bench 1.0.0 [G15].
- 2026-05-05/06: Braintrust breach disclosure [G35].
- 2026-05-06: Terminal-Bench 2.1 [G20].
- 2026-06-03: OpenAI announces the Evals platform deprecation (and Agent Builder deprecation) [G27].
- 2026-06-16: OTel v1.42.0 moves GenAI conventions to their own repo [G9][G10].
- 2026-06-26: OSWorld 2.0 [G36].
- 2026-07-15: τ³-bench 1.0.1 [G14].
- 2026-07-30: Terminal-Bench 3.0 + "Continuous Benchmarks" [G21][G22].
- 2026-08-05: Langfuse consistent evaluator sampling [G51].
- 2026-08-17: Langfuse v4 [G49].
- 2026-08-27: Terminal-Bench-Science 0.1 [G19].
- 2026-08-28: Terminal-Bench 4.0 [G23].
- 2026-09-01: SWE-bench Multimodal v2 [G65].
- 2026-09-07: Langfuse evaluator backfills [G51].
- 2026-09-18/21: Hamel/Shreya FAQ consolidated page [G5].
- 2026-09-21: OSWorld-Pro [G38].
- 2026-09-22: SWE-bench Pro V2 [G6]; Langfuse "Jev as a judge" [G51].
- 2026-10-31 / 2026-11-16 / 2026-11-30: OpenAI Evals read-only / Langfuse Cloud v4-only / OpenAI Evals shutdown [G27][G49].

## Mechanics (gap-fills)

### Statistics for eval reporting [G2][G3]
The five recommendations, quoted or closely paraphrased from Anthropic:
1. "report the SEM, derived from the Central Limit Theorem, alongside each calculated eval score … A 95% confidence interval can be calculated … by adding and subtracting 1.96 × SEM".
2. Cluster standard errors "on the unit of randomization" when questions are grouped. "clustered standard errors on popular evals can be over three times as large as naive standard errors". For agents, the cluster is the task when you run several trials, or the shared environment. Inspect's `stderr(cluster=…)` and `ci(cluster=…)` implement this (spec [S9]).
3. Reduce within-question variance. With CoT, "resampling answers from the same model several times, and using the question-level averages". "the Inspect framework correctly computes standard errors in this way via its epochs parameter".
4. Analyze paired differences. The question list is shared, so pairing removes the difficulty variance. "correlation of question scores on popular evals between frontier models … between 0.3 and 0.7".
5. Power analysis: compute the number of questions needed to detect, e.g., a 3 pp difference.

COMPOSED worked numbers (binary pass rate p = 0.8, SE = √(p(1−p)/n), 95% CI = ±1.96·SE):

| n tasks | SE | 95% CI half-width |
|---|---|---|
| 50 | 0.057 | ±11.1 pp |
| 100 | 0.040 | ±7.8 pp |
| 200 | 0.028 | ±5.5 pp |
| 500 | 0.018 | ±3.5 pp |

COMPOSED power estimate: to detect a 3 pp drop at p≈0.8 with α=0.05 and power 0.8 using *unpaired* two-proportion math, n per arm ≈ (1.96+0.84)²·2·0.16/0.03² ≈ **2,800**. Pairing, with question correlation 0.3–0.7 [G2], cuts this substantially. This is why statgate's line "a 2 point score drop on a 50 case suite is almost always sampling noise" (field [S34]) is arithmetically right.

Related practice:
- Hamel's CI-vs-production answer: "track confidence intervals for production metrics. If the lower bound crosses your threshold, investigate further" [G5].
- Terminal-Bench's leaderboard now draws "whiskers [that] span the 95% confidence interval" [G19].
- Anthropic infra-noise rule (spec [S3]): treat <3 pp gaps as noise unless configs match.

### pass@k / pass^k estimators (VERBATIM, Inspect AI source [G41])
```python
@score_reducer
def pass_k(
    k: int, value: float = 1.0, value_to_float: ValueToFloat = value_to_float()
) -> ScoreReducer:
    r"""Probability that all `k` epoch attempts succeed (<https://arxiv.org/pdf/2406.12045>).

    Computed as the draw-without-replacement estimator
    `C(correct, k) / C(total, k)`, dual to `pass_at`'s Chen 2021 estimator.
```
The `pass_at` body (VERBATIM [G41]): `return 1.0 - cast(float, np.prod(1.0 - k / np.arange(total - correct + 1, total + 1)).item())`. It returns NaN when `total < k`.

### Combining many binary evals into one number [G5]
- "Each eval you create should return a binary outcome". Use a "**pass all**" rate: "if 80 out of 100 examples pass every check, your pass-all rate is 80%". Group by theme or by severity (release-blocking vs tolerable).
- "I discourage complicated weighted scores … dashboards like this are usually performative".
- "as your eval set changes, its scores may no longer be directly comparable with older scores". Use product metrics (churn, active users) for long horizons.
- Anthropic's alternative: weighted, binary-all-must-pass, or hybrid aggregation per task, plus **partial credit** ("A support agent that correctly identifies the problem and verifies the customer but fails to process a refund is meaningfully better than one that fails immediately") [G1].

### Judge design details the notes skipped
- Anthropic [G1]:
  - "give the LLM a way out, like providing an instruction to return 'Unknown' when it doesn't have enough information";
  - "grade each dimension with an isolated LLM-as-judge rather than using one to grade all dimensions";
  - "A good task is one where two domain experts would independently reach the same pass/fail verdict".
- Hamel [G5]:
  - same model as judge is "usually fine … what ultimately matters is how well your judge aligns with human judgments";
  - "start with the most capable models … optimize for cost later";
  - dev-vs-test overfitting: "If test scores are much worse than dev scores, investigate whether you've overfit".
- OpenAI [G30]:
  - "Use pairwise comparison or pass/fail for more reliability";
  - "Control for response lengths";
  - "Add reasoning and chain-of-thought … before scoring";
  - the recommended strong judge today is `gpt-6-astra`, then "validate agreement against your human labels".
- Judge noise is large, and so is judge-model dependence (Dan Luu, Senior SWE-Bench, Sept 2026) [G33]:
  - re-grading the same transcripts 10× with Sonnet 4.6 flips the official "tasteful" verdict **23%** of the time (relative-taste sub-score 32%, practice alignment 5%, task rubric 3%);
  - "If we re-grade with GPT-5.6 Sol instead of Sonnet 4.6, the number of solutions that are judged to be tasteful is cut by more than half".
- Composo [G62]: ensembling k judge calls plus one sentence of task criteria reaches up to 85.8% on RewardBench 2 (+13.5 pp over baseline). "Small models benefit disproportionately from ensembling".

### Agentic evaluation: two-phase recipe (Hamel FAQ, VERBATIM excerpts [G5])
- "1. End-to-end task success. Treat the agent as a black box … Record the first upstream failure during error analysis."
- "2. Step-level diagnostics … Tool choice … Parameter extraction … Error handling … Context retention … Efficiency: count the steps, seconds, and tokens spent. Goal checkpoints".
- "Test the tool name, arguments, result, and resulting state as separate checks … verify that the agent selected `cancel_order`, passed the correct order ID, received a successful response, and changed the order status before it told the user that cancellation succeeded. Also test authorization and preconditions."
- **Transition failure matrix:** "rows represent the last successful state and columns represent where the first failure occurred". Example: "GenSQL → ExecSQL transitions cause 12 failures while DecideTool → PlanCal causes only 2".

### Trajectory evaluators: wire shapes

openevals / agentevals strict match (VERBATIM [G43]; same API under `from openevals import create_trajectory_match_evaluator` [G44]):
```python
evaluator = create_trajectory_match_evaluator(
    trajectory_match_mode="strict"
)

result = evaluator(
    outputs=outputs, reference_outputs=reference_outputs
)
```
```
{
    'key': 'trajectory_strict_match',
    'score': False,
    'comment': None,
}
```
Mode semantics [G43]:
- `strict`: "same messages in the same order with the same tool calls" (content may differ).
- `unordered`: "same tool calls in any order".
- `superset`: "some key tools were called … extra tools is still acceptable".
- `subset`: "did not call any tools beyond the expected ones".
- `ToolArgsMatchMode = Literal["exact", "ignore", "subset", "superset"]`.

promptfoo trajectory assertions (VERBATIM [G54]):
```yaml
tests:
  - vars:
      order_id: '123'
    assert:
      - type: trajectory:goal-success
        value: 'Determine the shipping status for order {{ order_id }} and tell the user whether it has shipped'
```
The deterministic siblings are `trajectory:tool-used`, `trajectory:tool-args-match`, `trajectory:tool-sequence` and `trajectory:step-count`. `not-trajectory:goal-success` flags a forbidden goal, and "judge transport or parse failures still report as failures so a broken judge cannot silently turn into a passing" result [G54].

pydantic-evals deterministic agentic evaluators (VERBATIM [G57]):
```python
from pydantic_evals import Case, Dataset
from pydantic_evals.evaluators import (
    ArgumentCorrectness,
    MaxModelRequests,
    MaxToolCalls,
)

dataset = Dataset(
    name='refund_handling',
    cases=[
        Case(
            name='valid_refund',
            inputs={'query': 'Refund my order', 'order_id': '12345'},
            evaluators=[
                ArgumentCorrectness(
                    tool_name='issue_refund',
                    expected_arguments={'order_id': '12345'},
                ),
            ],
        ),
    ],
    evaluators=[
        MaxToolCalls(max_calls=4),
        MaxModelRequests(max_requests=2),
    ],
)
```
Notes from the same page [G57]:
- "They are all deterministic, never call an LLM".
- Failed attempts are not counted by default, except by `MaxToolCalls`.
- Deferred/approval calls are never counted.
- Nested sub-agent tool calls **are** counted.

DeepEval tool correctness (VERBATIM [G45]):
```python
from deepeval.test_case import LLMTestCase, ToolCall
from deepeval.metrics import ToolCorrectnessMetric
from deepeval import evaluate

test_case = LLMTestCase(
    input="What if these shoes don't fit?",
    actual_output="We offer a 30-day full refund at no extra cost.",
    tools_called=[ToolCall(name="WebSearch"), ToolCall(name="ToolQuery")],
    expected_tools=[ToolCall(name="WebSearch")],
)
metric = ToolCorrectnessMetric()

evaluate(test_cases=[test_case], metrics=[metric])
```
Knobs: `should_consider_ordering`, `should_exact_match`, `evaluation_params=[ToolCallParams.INPUT_PARAMETERS, ToolCallParams.OUTPUT]`. If `available_tools` is given, an LLM also judges tool-selection optimality and the final score is the minimum of the two [G45].

Google ADK defaults (VERBATIM [G58]):
```json
{
  "criteria": {
    "tool_trajectory_avg_score": 1.0,
    "response_match_score": 0.8
  }
}
```
Notes [G58]:
- `response_match_score` = ROUGE-1 against the reference.
- LLM-judged criteria include `final_response_match_v2`, `rubric_based_tool_use_quality_v1`, `hallucinations_v1`, `multi_turn_task_success_v1` and `per_turn_user_simulator_quality_v1`.
- Some require the Vertex Gen AI Evaluation Service.
- Reference-based criteria "are not supported in combination with User Simulation".

### Simulated users beyond τ-bench
openevals (VERBATIM excerpt [G44]):
```python
user = create_llm_simulated_user(
    system="You are an aggressive and hostile customer who wants a refund for their car.",
    model="openai:gpt-5.6-sol",
)

trajectory_evaluator = create_llm_as_judge(
    model="openai:gpt-5.6-sol",
    prompt="Based on the below conversation, was the user satisfied?\n{outputs}",
    feedback_key="satisfaction",
)

# Run the simulation directly with the new function
simulator_result = run_multiturn_simulation(
    app=app,
    user=user,
    trajectory_evaluators=[trajectory_evaluator],
    max_turns=5,
)
```
Warning in the same README [G44]: "The techniques described in this section have changed with the release of 0.1.0".

DeepEval (VERBATIM, via docs page [G46]; field names confirmed in source [G47]):
```python
conversation_golden = ConversationalGolden(
    scenario="Andy Byron wants to purchase a VIP ticket to a cold play concert.",
    expected_outcome="Successful purchase of a ticket.",
    persona=Persona(characteristics="Andy Byron is the CEO of Astronomer."),
)
```
`simulator.simulate(conversational_goldens=[...], max_user_simulations=10)` returns `ConversationalTestCase`s [G46].

τ-family simulator facts:
- τ-Voice "by decoupling simulation from wall-clock time, the user simulator can use the most capable LLM without real-time constraints". Voice agents retain "only 30--45% of text capability" [G18].
- τ³ adds a "Hallucination reviewer for detecting user simulator deviations" with automatic retry [G14]. Simulator error is itself a measured failure mode.

### Online evaluation (production) mechanics
pydantic-evals (VERBATIM [G56]):
```python
# Cheap evaluator: run on every request
always_check = OnlineEvaluator(evaluator=IsHelpful(), sample_rate=1.0)

# Expensive evaluator: run on 1% of requests, limit concurrency
rare_check = OnlineEvaluator(
    evaluator=LLMJudge(rubric='Is the response helpful?'),
    sample_rate=0.01,
    max_concurrency=5,
)
```
"Each decorated call emits one `gen_ai.evaluation.result` OTel event per evaluator result … if not [configured], emission is a cheap no-op." [G56]

COMPOSED example of that event, built from the attribute table in [G8] (not copied from a trace):
```json
{
  "event.name": "gen_ai.evaluation.result",
  "attributes": {
    "gen_ai.evaluation.name": "Relevance",
    "gen_ai.evaluation.score.value": 1.0,
    "gen_ai.evaluation.score.label": "relevant",
    "gen_ai.evaluation.explanation": "Answer addresses the refund question using fetched policy.",
    "gen_ai.response.id": "chatcmpl-123"
  }
}
```
Spec rule (VERBATIM [G8]): "This event SHOULD be parented to GenAI operation span being evaluated when possible or set `gen_ai.response.id` when span id is not available."

Platform specifics:
- **LangSmith** [G52]:
  - "set the sampling rate to 0.1";
  - backfill "only when you create the rule";
  - weekly evaluator "Spend limit" that pauses the evaluator until "Monday 12AM UTC";
  - "When an online evaluator runs on any run within a trace, the trace will be auto-upgraded to extended data retention. This upgrade will impact trace pricing";
  - offline targets examples with references, online targets runs/threads "without reference outputs".
- **Langfuse** [G49][G51]:
  - v4 "Code evaluators: Run deterministic Python or TypeScript checks on live observations and experiments";
  - "Monitors: Watch cost, quality, and latency thresholds and notify teams through Slack, webhooks, or GitHub Actions";
  - consistent sampling across evaluators: "Two evaluators with the same filters and a 10% sampling rate now evaluate the same 10% of matching observations".
- **Hamel** [G5]: "CI evals protect against known regressions before deployment. Online monitoring find failures in production traffic and estimate how often they occur … Favor assertions or other deterministic checks over LLM-as-judge [in CI]". Production relies more on reference-free LLM judges. "when production monitoring reveals new failure patterns … add representative examples to your CI dataset."
- **A/B testing** (Anthropic's comparison table [G1]): pros are "Measures actual user outcomes (retention, task completion)" and "Controls for confounds". Cons are "Slow; days or weeks to reach significance and requires sufficient traffic", "Only tests changes you deploy" and "Less signal on the underlying 'why'". Stage mapping: "A/B testing validates significant changes once you have sufficient traffic."
- **Error-analysis cadence in production** [G5]: "reviewing at least 100+ fresh traces each review cycle. Typical review cycles … 2-4 weeks … Between major analyses, review 10-20 traces weekly, focusing on outliers".

### CI gate artifacts
promptfoo GitHub Action (VERBATIM excerpt [G54]):
```yml
      - name: Run promptfoo evaluation
        uses: promptfoo/promptfoo-action@v1
        with:
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          prompts: 'prompts/**/*.json'
          config: 'prompts/promptfooconfig.yaml'
          cache-path: ~/.cache/promptfoo
```
Quality gate (VERBATIM [G54]):
```bash
# Fail on any test failures
npx promptfoo@latest eval --fail-on-error

# Custom threshold checking
npx promptfoo@latest eval -o results.json
PASS_RATE=$(jq '.results.stats.successes / (.results.stats.successes + .results.stats.failures) * 100' results.json)
if (( $(echo "$PASS_RATE < 95" | bc -l) )); then
  echo "Quality gate failed: Pass rate ${PASS_RATE}% < 95%"
  exit 1
fi
```
Caveat: this is exactly the naive threshold gate that statgate criticizes (field [S34]). At n=50, a 95% CI is about ±6–11 pp (COMPOSED table above). Also note the action caches LLM responses (`~/.cache/promptfoo`). Cached responses make reruns cheap, but they hide non-determinism; use `--no-cache` for trial-based runs (the flag appears in [G29]).

OpenAI → promptfoo migration commands (VERBATIM [G29]):
```bash
promptfoo eval -c promptfooconfig.yaml --no-cache
promptfoo view
```
"Any manually recreated grader, especially an LLM-as-a-judge grader, should be validated before you rely on it for regression decisions." [G29]

Braintrust `Eval()` (VERBATIM [G59]; this fills spec's "Unverified" item):
```python
from autoevals import LevenshteinScorer
from braintrust import Eval

Eval(
    "Say Hi Bot",
    data=lambda: [
        {"input": "Foo", "expected": "Hi Foo"},
        {"input": "Bar", "expected": "Hello Bar"},
    ],
    task=lambda input: "Hi " + input,
    scores=[LevenshteinScorer],
)
```
Run it with `BRAINTRUST_API_KEY=<YOUR_API_KEY> braintrust eval tutorial_eval.py` [G59].

### Benchmark hygiene, as practiced in 2026
- **SWE-bench Pro V2 locked protocol** (VERBATIM points [G7]):
  1. "Agent phase is offline. `[agent] network_mode = "no-network"` … Web-fetch tools are disabled".
  2. "The verifier never runs in the agent's sandbox … `patch_replay:PatchReplayAgent` applies it to a pristine image and runs the unchanged verifier. Report the re-graded number; publish both."
  3. "50-minute budget per task".
  4. "Probe before you trust" (network/git-history probe tasks).

  Release gate: oracle 642/642 resolved, empty patch 0/642 [G7].
- **Terminal-Bench 3.0 task review pipeline:** Proposal → LLM Judge → Reviewer → Senior Reviewer → PR static checks → agent judge → agent trials → merge. "Frontier agent, oracle agent, and cheating agent runs ensure that the task is well defined". Agent and verifier run in separate containers, which "prevents many reward hacking vectors allowing for re-grading when task verifiers are updated". TB 3.0 is an **open-internet** benchmark: "We instruct agents not to look for task-specific solutions or hints online, which is surprisingly effective" [G21].
- **TB 4.0 "saturated" definition:** "all classes within all families of the latest generation of models solve it 5/5 times". Resources were calibrated with Anthropic's infra-noise method [G23].
- **ABC checklist** [G63]: benchmark flaws "can lead to under- or overestimation of agents' performance by up to 100% in relative terms". Examples: "SWE-bench Verified uses insufficient test cases, while TAU-bench counts empty responses as successful".
- **HAL** [G64]: 21,730 rollouts × 9 models × 9 benchmarks for ~$40,000. "higher reasoning effort reducing accuracy in the majority of runs". Log inspection found agents "searching for the benchmark on HuggingFace instead of solving a task, or misusing credit cards in flight booking tasks".

### Closing the loop: eval → optimizer (cross-link ch.04 / ch.03)
GEPA (VERBATIM [G53]):
```python
import dspy

optimizer = dspy.GEPA(
    metric=your_metric,
    max_metric_calls=150,
    reflection_lm="openai/gpt-5",
)
optimized_program = optimizer.compile(student=MyProgram(), trainset=trainset, valset=valset)
```
- Key concept: "**Actionable Side Information (ASI)**: diagnostic feedback returned by evaluators that serves as the text-optimization analogue of a gradient" [G53]. Evaluators should return reasons, not just scores.
- Hamel: "once you have a high-quality set of evals, prompt optimization can be effective for that last mile" [G5].
- Cheap classifiers make optimization loops affordable. From the Jev answer: "Prompt tuning can sometimes require hundreds or thousands of evaluations" [G5].

## Numbers (new, with conditions)

- Terminal-Bench 2.0 → 2.1, same agent/model pairs, after fixing 28/89 tasks [G20]:
  - GPT-5.3-Codex (Codex CLI) 73.3→79.1;
  - Opus 4.6 (Claude Code) 58.0→70.1;
  - Gemini 3.1 Pro (Terminus 2) 63.0→70.7;
  - GPT-5.4 (Terminus 2) 55.1→54.8;
  - "no task is unsolved in Terminal-Bench 2.1".
- Terminal-Bench 3.0 (74 tasks), first release [G21]:
  - GPT-5.6 Sol (Codex) 34.4%, Fable 5 (Claude Code) 33.8%, Opus 4.8 (Claude Code) 21.1%, GPT-5.6 Terra 20.8%, Grok 4.5 (Cursor CLI) 17.8%, Sonnet 5 (Claude Code) 14.6%, GPT-5.6 Luna 14.3%, GLM 5.2 (Claude Code) 5.1%;
  - Fable 5 vs Opus 4.8 gap: 4.9 pts on TB 2.1 vs 12.7 pts on TB 3.0;
  - GPT-5.6 Sol "~40% cheaper and uses ~50% fewer tokens than Fable 5".
- Terminal-Bench 4.0 [G23]: removed 8 tasks (2 saturation, 2 refusals, 2 public solutions, 2 quality/platform) and fixed 19. Sonnet 5 used 21.6B tokens vs 6.5B for Opus 5 on its leaderboard run.
- SWE-bench Pro V2 [G7]: 731→642 tasks, 89 dropped, 529 statements rewritten, 214 test patches + 38 gold patches revised, 211 images got dependency fixes. HARD-51 = tasks failed by ≥2 of 5 model families (Claude Opus 5, GLM-5.3, Kimi-K3, Inkling, Gemini 3.8 Flash).
- METR (2026-03-10) [G32]:
  - "roughly half of test-passing SWE-bench Verified PRs … would not be merged";
  - 296 PRs, 95 tasks, 3 repos, 4 maintainers, golden human-PR merge rate ~68%;
  - grader is 24.2 pp (SE 2.7) above maintainer decisions;
  - trend gap 9.6 pp/yr (SE 5.5), significant only at 10%.
- τ³ banking_knowledge v1.0.1 regrade: GPT-5.5 xhigh 37.37→46.39; GPT-5.4 xhigh 30.67→39.43 (pass^1) [G14]. τ-Knowledge: "even frontier models with high reasoning budgets achieve only ∼25.5% pass^1"; ~700 docs [G17]. 1.0.0 changelog: 97 tasks, 698 docs [G14].
- τ-Voice: 278 tasks. GPT-5 (reasoning, text) 85%. Voice agents 31–51% clean and 26–38% realistic [G18].
- OSWorld 2.0: 108 tasks; 69.6% take humans >1 h; avg 318 tool calls (Opus 4.7, max thinking) vs ~30 on OSWorld 1.0; Opus 4.8 20.6% binary / 54.8% partial at 500 steps [G37].
- Anthropic statistics: clustered SE can be >3× naive SE; question-score correlation between frontier models 0.3–0.7 [G2].
- Harness cost (imec, 64 SWE-Bench Pro tasks, 1 trial) [G34]:
  - Qwen3.8-27B: Claude Code 52% / Codex 48% / Pi 44%;
  - GLM-5.3-Flash: 50/52/50%;
  - GLM sweep cost: Codex $22.80 vs Claude Code $45 vs Pi $45.
- Dan Luu: 23% verdict flip under re-grading with the same judge (Sonnet 4.6, 10 re-grades per condition); switching the judge to GPT-5.6 Sol halves "tasteful" passes [G33].
- Hamel/Shreya: "60-80% of our development time on error analysis and evaluation"; "A 70% pass rate might indicate a more meaningful evaluation" [G5].
- Jev pricing via Langfuse: $0.042 per 1M input tokens, "well under a second" [G51].
- GEPA: GPT-4.1 Mini 46.6%→56.6% on AIME 2025 with `max_metric_calls=150` [G53]. Paper: "outperforms GRPO by 6% on average and by up to 20%, while using up to 35x fewer rollouts" [G53].
- HAL: 21,730 rollouts, ~$40k, 2.5B tokens of logs [G64].

## Pitfalls, limits, criticism (new)

- **Grader over-constraint as a silent zero.** In τ³ banking_knowledge before v1.0.1, a "single prudent verification read not present in the golden trajectory … zeroed the reward" [G14]. DB-hash or golden-trajectory graders punish cautious agents. This is the concrete form of Anthropic's "too rigid" warning [G1].
- **Cheating and reward hacking on public leaderboards are documented, not hypothetical** [G24]:
  - encrypted solutions shipped in an agent binary (OB-1);
  - uploading `tests/` (Pilot);
  - agents curling solutions into AGENTS.md (ForgeCode).

  The response: trajectories required, and an agent judge reviews every passing trial.
- **Leaderboard claims need their version, harness and grading protocol.** SWE-bench Pro's README itself says (05/18): "We have identified some issues with the leaderboard" [G6]. V2 asks submitters to "Report the re-graded number; publish both" [G7].
- **Span-based evaluators miss provider-native tools** [G57]. Trace-based agent grading is only as complete as the instrumentation.
- **Online-eval costs hide in billing side effects:** retention upgrades and weekly spend caps in LangSmith [G52].
- **Framework churn is heavy.** Renames and deprecations within 12 months:
  - OpenAI Evals → gone [G27];
  - DeepEval params/golden fields [G47];
  - openevals simulation API at 0.1.0 [G44];
  - Ragas org move [G48];
  - Braintrust SDK repo split [G59];
  - Langfuse v4 migration deadline [G49].

  Pin versions in book code.
- **Continuous benchmarks trade comparability for validity.** TB explicitly says the move to 4.0 "might be confusing as the community is used to major version updates being 'sequels'" [G23].
- **Eval platforms are high-value targets.** The Braintrust breach exposed stored provider API keys [G35]. Cross-link ch.16.
- **Delegating error analysis to agents is now officially endorsed, with guardrails.** "Keep this first pass manual. If the agent starts suggesting problems too early, its guesses can bias your judgment" [G5].

## What changed in the last 6 months (the three notes missed)

- Terminal-Bench 2.1 (May), 3.0 (Jul 30) and 4.0 (Aug 28), plus the "Continuous Benchmarks" doctrine [G20][G21][G22][G23].
- SWE-bench Pro V2 with locked protocol (Sep 22) [G6][G7].
- OSWorld 2.0 (Jun 26), distinct from OSWorld-Pro (Sep 21) [G36][G37][G38].
- The OpenAI Evals deprecation was announced Jun 3 with promptfoo as the migration path. OpenAI also restricted self-serve fine-tuning (May 7 / Jul 2) [G27][G29].
- OTel GenAI moved to its own repo (Jun 16) and gained Agent Skills spans [G9][G11].
- τ³ 1.0.1 grading fix (Jul 15) [G14].
- Langfuse v4 (Aug 17), evaluator backfills, consistent sampling, Jev-as-a-judge [G49][G51].
- Decision-model judges (Jev, SemIf) in LangSmith and Langfuse [G51][G52].
- The Hamel/Shreya FAQ was rewritten around agent-assisted error analysis, "Classifier for Evals", and exact sample-size staging [G5].
- DeepEval deprecated `LLMTestCaseParams` and `user_description` [G47].

## Diagram candidates

1. **Benchmark semver upgrade path** [G22]. Actors: dataset version N → N+1, leaderboard trials. Arrows labeled `patch → reuse`, `minor (verifier change) → regrade saved artifacts`, `major (env change) → rerun`. State: "leaderboard upgraded".
2. **SWE-bench Pro V2 locked protocol** [G7]. Actors: agent sandbox (no-network, model host allow-listed), `model.patch`, pristine image, verifier. Arrows: agent → diff capture → PatchReplayAgent → verifier → "re-graded score".
3. **Separate agent/verifier containers (TB 3.0)** [G21]. Agent container → artifacts (.sql, .pt, .lean …) → logged → verifier container. A side arrow reads "verifier update → re-grade without rerun".
4. **Offline ↔ online eval loop** [G5][G52][G56]:
   - CI dataset → offline experiment → gate → deploy;
   - prod traces → sampled online evaluators (sample_rate, spend cap) → `gen_ai.evaluation.result` events → dashboards/alerts;
   - error analysis → new cases back into the CI dataset.
5. **Judge-type decision tree (2026)**:
   - objective rule → code check;
   - typed or categorical question at high volume → decision-model classifier (Jev/SemIf);
   - open-ended with a rationale needed → LLM judge;
   - calibration → human labels (TPR/TNR).

   [G5][G51][G52]
6. **Transition failure matrix** [G5]. Grid: rows are last successful state (DecideTool, GenSQL, …), columns are first failure state. Hot cell GenSQL→ExecSQL = 12, cold cell DecideTool→PlanCal = 2.
7. **pass@k vs pass^k estimators** [G41]. Per-task trial table (n, c) → per-task pass@k = 1−C(n−c,k)/C(n,k), pass^k = C(c,k)/C(n,k) → average over tasks. Side note: mean(p_i^k) ≠ (mean p)^k (COMPOSED example above).
8. **Clustered SE** [G2]. Tasks as clusters, trials as dots; naive SE (all dots independent) vs clustered SE (by task); a ">3× wider" annotation.
9. **OpenAI Evals sunset timeline** [G27]: 2026-03-09 promptfoo acquisition → 2026-06-03 announcement → 2026-10-31 read-only → 2026-11-30 shutdown. Arrow to "promptfoo config + CI".
10. **OTel span tree with evaluation** [G8][G11]: `invoke_agent` → `chat` ×N → `execute_tool` (with `load_skill` refinement) → `gen_ai.evaluation.result` event parented to the evaluated span.

Chart candidates (real data):
- **TB 2.0 vs 2.1 paired bars**, 14 agent-model pairs (e.g. Opus 4.6 CC 58.0/70.1; GPT-5.4 T2 55.1/54.8) [G20].
- **TB 2.1 vs 3.0 discrimination** for Fable 5 / Opus 4.8 / GPT-5.6 Terra / Grok 4.5 / Sonnet 5 / GPT-5.6 Luna: 83.8/78.9/78.4/79.3/74.6/75.7 vs 33.8/21.1/20.8/17.8/14.6/14.3 [G21].
- **CI half-width vs n** at p=0.8: 50→±11.1, 100→±7.8, 200→±5.5, 500→±3.5 (COMPOSED from the formula in [G2]).
- **Harness accuracy vs cost** (imec) [G34]: Qwen3.8-27B CC 52%/$10.26, Codex 48%/$9, Pi 44%/$10.16; GLM-5.3-Flash CC 50%/$45, Codex 52%/$22.80, Pi 50%/$45.
- **τ³ banking regrade**: GPT-5.5 xhigh 37.37→46.39, GPT-5.4 xhigh 30.67→39.43 [G14].
- **OSWorld 2.0**: Opus 4.8 20.6% binary vs 54.8% partial; GPT-5.5 ~14% [G37].

## Glossary (additions)

- **Continuous benchmark**: a benchmark maintained like software, with semver tasks and datasets, where leaderboards are upgraded by reuse/regrade/rerun [G22].
- **Locked protocol**: an evaluation regime with an offline agent phase and verifier re-execution on a pristine image (SWE-bench Pro V2) [G7].
- **HARD-51**: the SWE-bench Pro V2 subset failed by ≥2 of 5 model families [G7].
- **Saturated task (TB 4.0)**: solved 5/5 times by all latest-generation model classes [G23].
- **Pass-all rate**: the fraction of examples passing every binary check [G5].
- **Transition failure matrix**: counts of (last successful state → first failure state) in agent traces [G5].
- **Decision model / classifier-for-evals**: a non-generative model that returns typed answers with probabilities, used as a cheap judge (Jev, SemIf) [G51][G52].
- **`gen_ai.evaluation.result`**: the OTel event carrying an evaluation score/label/explanation for a GenAI operation [G8].
- **Actionable Side Information (ASI)**: textual evaluator feedback that GEPA uses as a "gradient" [G53].
- **Clustered standard error**: an SE computed with correlated items (e.g. trials of one task) grouped, which makes it wider than the naive SE [G2].
- **Paired-difference analysis**: comparing two models on the same items to remove difficulty variance [G2].
- **Reward hacking (leaderboard sense)**: passing via a loophole, e.g. fetching the solution online, without the capability being measured [G24].

## Unverified / open questions

- The OpenAI post's exact publication date. openai.com returns 403. The date is inferred from the earliest HN submission (2026-02-23) [G31].
- Exact release date of τ³-bench 1.0.0. The CHANGELOG says "2026-MM-DD". The GitHub release entry was last updated 2026-04-30 [G14][G15].
- Terminal-Bench 4.0 leaderboard values. The tbench.ai leaderboard renders client-side and no numbers could be extracted [G19]. TB 4.0 task count is not stated in the post.
- Whether the OpenAI **Datasets** feature itself shuts down on 2026-11-30. Its guide carries the same banner, but the deprecations table names only "the Evals dashboard and API" [G27][G28].
- Composo's GitHub publication date (2026-04-02, per field.md) was not re-checked. Only the arXiv v1 date (2026-04-15) was.
- HAL and ABC are 2025 papers. I did not check whether 2026 follow-ups or leaderboards supersede them.
- Reddit/X practitioner sentiment is still unsampled (field.md's limitation stands). WebSearch was unavailable in this session (budget exhausted), so all discovery used direct fetches, the arXiv API and HN Algolia.
- The SWE-bench Pro repo split ("11 public / 12 held-out / 18 commercial") in practice.md was not re-verified against the paper.

## Sources

- [G1] "Demystifying evals for AI agents", Anthropic Engineering (M. Grace, J. Hadfield, R. Olivares, J. De Jonghe), 2026-01-09, https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents, accessed 2026-09-30
- [G2] "A statistical approach to model evaluations", Anthropic Research, 2024-11-19, https://www.anthropic.com/research/statistical-approach-to-model-evals, accessed 2026-09-30
- [G3] E. Miller, "Adding Error Bars to Evals: A Statistical Approach to Language Model Evaluations", arXiv:2411.00640, 2024-11-01, https://arxiv.org/abs/2411.00640, accessed 2026-09-30
- [G4] "Eval awareness in Claude Opus 4.6's BrowseComp performance", Anthropic Engineering, 2026-03-06, https://www.anthropic.com/engineering/eval-awareness-browsecomp, accessed 2026-09-30
- [G5] H. Husain & S. Shankar, "AI Evals: Everything You Need to Know" (FAQ), hamel.dev, published 2026-09-18, modified 2026-09-21 (questions dated from 2025-07-03), https://hamel.dev/blog/posts/evals-faq/, accessed 2026-09-30
- [G6] Scale AI, SWE-bench Pro README (News incl. 9/22 V2), https://raw.githubusercontent.com/scaleapi/SWE-bench_Pro-os/main/README.md, accessed 2026-09-30
- [G7] Scale AI, SWE-bench Pro V2 README, 2026-09-22, https://raw.githubusercontent.com/scaleapi/SWE-bench_Pro-os/main/v2/README.md, accessed 2026-09-30
- [G8] OpenTelemetry, GenAI events (`gen_ai.evaluation.result`), semantic-conventions-genai main, https://raw.githubusercontent.com/open-telemetry/semantic-conventions-genai/main/docs/gen-ai/gen-ai-events.md, accessed 2026-09-30
- [G9] OpenTelemetry, semantic-conventions CHANGELOG.md, https://raw.githubusercontent.com/open-telemetry/semantic-conventions/main/CHANGELOG.md, accessed 2026-09-30
- [G10] OpenTelemetry, semantic-conventions releases Atom feed (release dates v1.37.0–v1.44.0), https://github.com/open-telemetry/semantic-conventions/releases.atom, accessed 2026-09-30
- [G11] OpenTelemetry, GenAI agent and framework spans (Agent skills), https://raw.githubusercontent.com/open-telemetry/semantic-conventions-genai/main/docs/gen-ai/gen-ai-agent-spans.md, accessed 2026-09-30
- [G12] OpenTelemetry, GenAI README + model spans, https://raw.githubusercontent.com/open-telemetry/semantic-conventions-genai/main/docs/gen-ai/README.md and .../gen-ai-spans.md, accessed 2026-09-30
- [G13] Sierra Research, τ³-bench README (repo tau2-bench), https://raw.githubusercontent.com/sierra-research/tau2-bench/main/README.md, accessed 2026-09-30
- [G14] Sierra Research, tau2-bench CHANGELOG.md (1.0.1 dated 2026-07-15), https://raw.githubusercontent.com/sierra-research/tau2-bench/main/CHANGELOG.md, accessed 2026-09-30
- [G15] Sierra Research, tau2-bench GitHub releases Atom feed, https://github.com/sierra-research/tau2-bench/releases.atom, accessed 2026-09-30
- [G16] Cuadron et al., "SABER: Small Actions, Big Errors — Safeguarding Mutating Steps in LLM Agents", arXiv:2512.07850, 2025-11-26, accessed 2026-09-30
- [G17] "τ-Knowledge: Evaluating Conversational Agents over Unstructured Knowledge", arXiv:2603.04370, 2026-03-04, accessed 2026-09-30
- [G18] Ray et al., "τ-Voice: Benchmarking Full-Duplex Voice Agents on Real-World Domains", arXiv:2603.13686, 2026-03-14, accessed 2026-09-30
- [G19] Terminal-Bench blog index + leaderboard page, tbench.ai, https://www.tbench.ai/news and https://www.tbench.ai/, accessed 2026-09-30
- [G20] "Terminal-Bench 2.1: A revision of Terminal-Bench 2.0 that fixes 28 tasks", Terminal-Bench team (lead K. Buchanan), 2026-05-06, https://www.tbench.ai/news/terminal-bench-2-1, accessed 2026-09-30
- [G21] "Terminal-Bench 3.0 measures agent abilities at the frontier", Terminal-Bench team, 2026-07-30, https://www.tbench.ai/news/terminal-bench-3-0, accessed 2026-09-30
- [G22] "Continuous Benchmarks: Benchmarks are software and should be maintained like software", Terminal-Bench team, 2026-07-30, https://www.tbench.ai/news/continuous-benchmarks, accessed 2026-09-30
- [G23] R. Marten, "Terminal-Bench 4.0", 2026-08-28, https://www.tbench.ai/news/terminal-bench-4-0, accessed 2026-09-30
- [G24] "Leaderboard Integrity Update", Terminal-Bench team, 2026-04-19, https://www.tbench.ai/news/leaderboard-integrity-update, accessed 2026-09-30
- [G25] M. Merrill & A. Shaw, "Terminal-Bench 2.0 and Harbor", 2025-11-07, https://www.tbench.ai/news/announcement-2-0, accessed 2026-09-30
- [G26] OpenAI, "Working with evals" guide (.md), https://developers.openai.com/api/docs/guides/evals.md, accessed 2026-09-30
- [G27] OpenAI, Deprecations page (2026-06-03 Evals platform; fine-tuning updates), https://developers.openai.com/api/docs/deprecations.md, accessed 2026-09-30
- [G28] OpenAI, "Getting started with datasets", https://developers.openai.com/api/docs/guides/evaluation-getting-started.md, accessed 2026-09-30
- [G29] OpenAI Cookbook, "Moving from OpenAI Evals to Promptfoo", https://developers.openai.com/cookbook/examples/evaluation/moving-from-openai-evals-to-promptfoo.md, accessed 2026-09-30
- [G30] OpenAI, "Evaluation best practices", https://developers.openai.com/api/docs/guides/evaluation-best-practices.md, accessed 2026-09-30
- [G31] Hacker News threads quoting OpenAI's "Why SWE-bench Verified no longer measures frontier coding capabilities": item 47126205 (2026-02-23) and 47910388 (2026-04-26), https://hn.algolia.com/api/v1/items/47910388; original https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/ (403), accessed 2026-09-30
- [G32] METR, "Many SWE-bench-Passing PRs would not be merged into main", 2026-03-10, https://metr.org/notes/2026-03-10-many-swe-bench-passing-prs-would-not-be-merged-into-main/, accessed 2026-09-30
- [G33] Dan Luu, "Bad benchmarks and evals: Senior SWE-Bench, napkin math, and winter tires", danluu.com, Sept 2026, https://danluu.com/exercise-7/, accessed 2026-09-30
- [G34] imec AI stack blog, "Benchmarking Claude Code, Codex and Pi on SWE-Bench Pro: Same Accuracy, 2x Cost", Sept 2026 (HN 2026-09-10), https://aistack.imec-int.com/blog/harness-cost, accessed 2026-09-30
- [G35] TechCrunch, "AI evaluation startup Braintrust confirms breach, tells every customer to rotate sensitive keys", 2026-05-06, https://techcrunch.com/2026/05/06/ai-evaluation-startup-braintrust-confirms-breach-tells-every-customer-to-rotate-sensitive-keys/, accessed 2026-09-30
- [G36] OSWorld (v1) project site with 2026-06-26 and 2025-07-28 news, https://os-world.github.io/, accessed 2026-09-30
- [G37] "OSWorld 2.0: Benchmarking Computer-Use Agents on Long-Horizon Real-World Tasks", XLANG Lab et al., 2026-06-26, https://osworld-v2.xlang.ai/, accessed 2026-09-30
- [G38] Z. Wang et al. (NVIDIA), "OSWorld-Pro: Process-based Evaluation for Computer Use Agents", arXiv:2609.24890, 2026-09-21, accessed 2026-09-30
- [G39] Hugging Face / Meta, "Gaia2 and ARE: Empowering the Community to Evaluate Agents", 2025-09-22, https://huggingface.co/blog/gaia2, accessed 2026-09-30
- [G40] R. Froger et al., "Gaia2: Benchmarking LLM Agents on Dynamic and Asynchronous Environments", arXiv:2602.11964, 2026-02-12, accessed 2026-09-30
- [G41] Inspect AI source, `src/inspect_ai/scorer/_reducer/reducer.py` (pass_at, pass_k), https://raw.githubusercontent.com/UKGovernmentBEIS/inspect_ai/main/src/inspect_ai/scorer/_reducer/reducer.py, accessed 2026-09-30
- [G42] Inspect AI docs index (.md) + README, https://inspect.aisi.org.uk/index.html.md, accessed 2026-09-30
- [G43] LangChain, agentevals README, https://raw.githubusercontent.com/langchain-ai/agentevals/main/README.md, accessed 2026-09-30
- [G44] LangChain, openevals README (trajectory, multiturn simulation), https://raw.githubusercontent.com/langchain-ai/openevals/main/README.md, accessed 2026-09-30
- [G45] Confident AI, DeepEval "Tool Correctness" docs, https://deepeval.com/docs/metrics-tool-correctness, accessed 2026-09-30
- [G46] Confident AI, DeepEval "Conversation Simulator" docs + llms.txt, https://deepeval.com/docs/conversation-simulator, accessed 2026-09-30
- [G47] DeepEval source: `deepeval/dataset/golden.py`, `deepeval/test_case/__init__.py` (deprecations), github.com/confident-ai/deepeval main, accessed 2026-09-30
- [G48] Ragas: GitHub 301 redirect explodinggradients→vibrantlabsai; `src/ragas/metrics/collections/__init__.py`, https://github.com/vibrantlabsai/ragas, accessed 2026-09-30
- [G49] Langfuse, "Langfuse v4 is live", M. Deichmann, 2026-08-17, https://langfuse.com/changelog/2026-08-17-langfuse-v4, accessed 2026-09-30
- [G50] Langfuse, "Langfuse joins ClickHouse", Jan 2026, https://langfuse.com/blog/joining-clickhouse, accessed 2026-09-30
- [G51] Langfuse changelog: "Jev as a judge" (2026-09-22), "Consistent evaluator sampling" (2026-08-05), "Run evaluators on historical observations" (2026-09-07), https://langfuse.com/changelog, accessed 2026-09-30
- [G52] LangChain, LangSmith docs "Set up LLM-as-a-judge online evaluators" and "Evaluation concepts" (.md), https://docs.langchain.com/langsmith/online-evaluations.md, https://docs.langchain.com/langsmith/evaluation-concepts.md, accessed 2026-09-30
- [G53] L. A. Agrawal et al., "GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning", arXiv:2507.19457, 2025-07-25; gepa-ai/gepa README, https://github.com/gepa-ai/gepa, accessed 2026-09-30
- [G54] promptfoo docs (GitHub source): integrations/github-action.md, integrations/ci-cd.md, model-graded/llm-rubric.md, model-graded/index.md, expected-outputs/index.md, https://github.com/promptfoo/promptfoo/tree/main/site/docs, accessed 2026-09-30
- [G55] Pydantic, Logfire "Evaluate your AI" overview + docs index, https://pydantic.dev/docs/logfire/evaluate/overview/index.md, accessed 2026-09-30
- [G56] Pydantic, pydantic-evals "Online Evaluation", https://pydantic.dev/docs/ai/evals/online-evaluation/index.md, accessed 2026-09-30
- [G57] Pydantic, pydantic-evals "Agentic Evaluators", https://pydantic.dev/docs/ai/evals/evaluators/agentic/index.md, accessed 2026-09-30
- [G58] Google, ADK docs "Why Evaluate Agents" (evaluate/index.md), https://raw.githubusercontent.com/google/adk-docs/main/docs/evaluate/index.md, accessed 2026-09-30
- [G59] Braintrust, braintrust-sdk-python README; autoevals README, https://github.com/braintrustdata/braintrust-sdk-python, https://github.com/braintrustdata/autoevals, accessed 2026-09-30
- [G60] CoreWeave docs, W&B Weave quickstart (+ redirect chain weave-docs.wandb.ai → docs.wandb.ai → docs.coreweave.com), https://docs.coreweave.com/weave/quickstart, accessed 2026-09-30
- [G61] PyPI JSON API and npm registry metadata for deepeval, inspect-ai, ragas, pydantic-evals, langfuse, langsmith, arize-phoenix, weave, braintrust, logfire, openevals, agentevals, autoevals, promptfoo, harbor, dspy, gepa; queried 2026-09-30
- [G62] R. Lail, L. Markham (Composo), "On Cost-Effective LLM-as-a-Judge Improvement Techniques", arXiv:2604.13717 (v1 2026-04-15, v3 read), accessed 2026-09-30
- [G63] "Establishing Best Practices for Building Rigorous Agentic Benchmarks" (ABC), arXiv:2507.02825, 2025-07-03, accessed 2026-09-30
- [G64] "Holistic Agent Leaderboard: The Missing Infrastructure for AI Agent Evaluation", arXiv:2510.11977, 2025-10-13, accessed 2026-09-30
- [G65] SWE-bench README News (Sep 1 2026 Multimodal v2), https://raw.githubusercontent.com/SWE-bench/SWE-bench/main/README.md, accessed 2026-09-30
- [G66] Prathifkumar, Mathews, Nagappan, "Does SWE-Bench-Verified Test Agent Ability or Model Memory?", arXiv:2512.10218, 2025-12-11, accessed 2026-09-30
- [G67] Hacker News Algolia search results used as dated pointers: "Terminal-Bench 4.0" (2026-08-29), "Terminal-Bench 3.0" (2026-08-11), "Simular's Sai tops OSWorld 2.0" (2026-08-27), "CoreWeave to Acquire Weights and Biases" (2025-03-05), "OpenAI to Acquire Promptfoo" (2026-03-09), https://hn.algolia.com/api/v1/search, accessed 2026-09-30
