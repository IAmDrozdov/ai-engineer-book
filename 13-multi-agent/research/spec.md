# 13. Мультиагентные системы — primary-sources notes

## TL;DR (what an engineer must know today, 2026-09-30)

- Anthropic's own numbers: a single agent uses ~4× the tokens of a chat interaction; a multi-agent system uses ~15× chat tokens. Token usage alone explained 80% of the variance in their internal research-eval performance. [S1]
- Anthropic's orchestrator-worker research system (Opus 4 lead + Sonnet 4 subagents) beat single-agent Opus 4 by **90.2%** on their internal research eval — but only for breadth-first, parallelizable tasks; the same architecture is a poor fit for coding, where subtasks are rarely cleanly separable and shared context matters more than parallelism. [S1]
- The public "don't build multi-agents" position (Cognition, Walden Yan, 2025-06-12) is not "avoid multi-agent," it's "avoid sending agents that don't share full context to write to the same shared artifact" — his fix is sharing full traces or a compressing intermediary, not fewer agents per se. [S2]
- MAST (Berkeley/Google/Meta collaboration published as UC Berkeley-led work, arXiv 2503.13657) is the first empirical failure taxonomy for MAS: 14 failure modes in 3 categories, built from 1,600+ annotated traces across 7 frameworks, κ=0.88 inter-annotator agreement. [S3]
- A 1-line workflow fix guided by MAST (only the CEO agent may end the conversation in ChatDev) raised task success by **+9.4%** — but the paper's own conclusion is that isolated fixes don't solve MAS reliability; it needs redesign, not patches. [S3]
- "Workflows vs agents" (Anthropic, Dec 2024) is still the base vocabulary the whole field cites: workflows = predefined code paths orchestrating LLMs+tools; agents = LLMs dynamically directing their own tool use. Five named workflow patterns: prompt chaining, routing, parallelization (sectioning/voting), orchestrator-workers, evaluator-optimizer. [S21]
- Frameworks have converged on a small vocabulary — supervisor/orchestrator-workers, handoffs (peer-to-peer control transfer), router (one-shot classify-then-dispatch), and "agent-as-tool" (delegate without giving up the floor) — but every vendor names them slightly differently and is mid-rewrite of its own docs in 2026 (LangChain, Google ADK, Microsoft all restructured their multi-agent docs in the last ~9 months). [S9] [S15] [S19]
- Microsoft's **Magentic** orchestration (from the AutoGen Magentic-One research project) is the most fully specified "manager + specialists + shared plan" pattern in any SDK today: it exposes a task ledger, a progress ledger with explicit stall/loop detection, and automatic replanning after N stalls — this is the reference implementation to point students at for "orchestrator that plans." [S20]
- Claude Code/Claude Agent SDK now distinguishes **subagents** (spawned by, and reporting back to, one caller; own context; caller stays in control) from **agent teams** (peer sessions with a shared task list and direct inter-agent messaging, no central owner of control flow) — this is a clean, dated (2026), vendor-documented instance of the "hierarchical vs. network/swarm" distinction taught in the literature. [S24] [S25]
- LangChain's docs abandoned the old "network / supervisor / hierarchical / custom" taxonomy in 2025-2026 for a task-shaped one: **Router → Subagents → Handoffs → Skills → Custom workflow**, explicitly telling the reader "not every complex task requires this — a single agent with the right tools often works." The `langgraph-supervisor` and `langgraph-swarm` prebuilt libraries are now deprecated in favor of writing the tool-calling handoff pattern directly. [S9] [S12] [S13]
- Coordination has a real, measured cost: AWS's enterprise benchmark found multi-agent collaboration lifted end-to-end goal success by up to 70% over single-agent baselines, but a "routing mode" that bypasses full orchestration cut latency substantially for tasks that don't need it — i.e., don't pay for coordination you don't need. [S27]
- Durable execution (Temporal-style: "the loop is a Workflow, each model/tool call is an Activity, a crash resumes instead of restarting") is becoming the substrate multi-agent systems get built on for anything long-running, because a multi-hour, multi-agent job cannot be a single retryable API call. [S29]
- Observability is still pre-standard: OpenTelemetry's GenAI semantic conventions for agent/workflow spans (`create_agent`, `invoke_agent`, `invoke_workflow`, `gen_ai.agent.id/name`, `gen_ai.workflow.name`) are explicitly marked **Development** status, not stable, as of the current spec — expect churn. [S30]

## Current state and versions (as of 2026-09-30)

| Thing | Current state | Source, date |
|---|---|---|
| MAST paper | v3, revised 2025-10-26 (orig. 2025-03-17) | [S3] |
| Anthropic multi-agent research system writeup | Published 2025-06-13, still the canonical case study | [S1] |
| Cognition "Don't Build Multi-Agents" | Published 2025-06-12 (Walden Yan) | [S2] |
| Anthropic "Building Effective Agents" | Published 2024-12-19, still the base taxonomy cited everywhere | [S21] |
| A2A protocol | v1.0.0 released 2026-03-12, patch v1.0.1 released 2026-05-26; joined the **Agentic AI Foundation** 2026-08-27 (originally Google-donated to Linux Foundation) | [S22] GitHub changelog |
| Claude Code subagents | Current doc (frontmatter: name, description, tools, disallowedTools, model, permissionMode, maxTurns, skills, mcpServers, hooks, memory, background, effort, isolation) | [S4] |
| Claude Code agent teams | **Experimental, disabled by default**, gate: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`; teammate model resolution changed in v2.1.257, idle-row UI changed across v2.1.181→v2.1.198→v2.1.199 | [S24] |
| Claude Code dynamic workflows (`agent()`, `parallel()`, `pipeline()`) | Blog published 2026-06-02 by Thariq Shihipar & Sid Bidasaria | [S26] |
| LangChain multi-agent docs | Restructured under `docs.langchain.com/oss/python/langchain/multi-agent/*` (Router, Subagents, Handoffs, Skills, Custom Workflow); old `langchain-ai.github.io/langgraph/concepts/multi_agent/` now redirects | [S9] |
| `langgraph-supervisor` / `langgraph-swarm` | Both READMEs now say: "we now recommend using the supervisor pattern directly via tools rather than this library"; being made LangChain-1.0-compatible for migration only | [S12] [S13] |
| Google ADK | "Template workflows" (Sequential/Parallel/Loop) **superseded by graph-based and dynamic workflows starting ADK 2.0** for Python/Go; template workflows remain available across Python/TS/Go/Java | [S15] |
| Microsoft Agent Framework | Orchestrations doc `ms.date 2026-02-12`, Magentic page updated `2026-09-21`; framework explicitly positioned as the successor that **unifies AutoGen and Semantic Kernel**, with dedicated migration guides from both | [S19] |
| Pydantic AI | Names 5 levels of multi-agent complexity: single agent → agent delegation → programmatic hand-off → graph-based control flow → "deep agents" | [S16] |
| Mastra | Distinguishes Handoffs / Workflows / Supervisor agents / Council as 4 coordination patterns with an explicit "who stays in control" comparison table | [S17] |
| Agno | `TeamMode`: coordinate (default), route, broadcast, tasks | [S18] |
| OTel GenAI agent spans | Spec status: **Development** (pre-stable) | [S30] |

## Timeline

- **2024-12-19** — Anthropic publishes "Building Effective Agents": defines workflows vs. agents and the 5 workflow patterns that the whole field still cites. [S21]
- **2024-12-06** — AWS Bedrock team publishes "Towards Effective GenAI Multi-Agent Collaboration" (arXiv 2412.05449): first large quantitative enterprise benchmark of coordination vs. routing modes. [S27]
- **2025-02-26** — Google publishes "Accelerating scientific discovery with Co-Scientist" (a real, large Google multi-agent system with debate/tournament structure over hypotheses) — cross-reference candidate, not deeply covered here; see ch.14 (RAG) / ch.11 (memory) for adjacent material. [checked, arXiv 2502.18864]
- **2025-03-17** — MAST paper v1 posted to arXiv. [S3]
- **2025-06-12** — Cognition publishes "Don't Build Multi-Agents" (Walden Yan), arguing against the OpenAI Swarm / Microsoft AutoGen style of parallel, context-isolated agents; recommends single-threaded linear agents or a compressed-history model instead. [S2]
- **2025-06-13** — Anthropic publishes "How we built our multi-agent research system," with the 4×/15× token numbers and the 90.2% eval improvement. [S1]
- **2025-06-27** — Anthropic publishes Project Vend (single-agent long-horizon autonomy, not multi-agent — do not cite as MAS evidence; checked and excluded). [checked, not used]
- **2025-09-12** — Google DeepMind publishes "Virtual Agent Economies" (arXiv 2509.10147): "sandbox economy" framing for agent-to-agent coordination at scale; more central to ch.10 (agentic commerce) but touches multi-agent coordination design (mission economies, auction mechanisms for resource allocation among agents). [S28]
- **2025-10-26** — MAST paper revised to v3 (dataset expanded, public HF release `mcemri/MAD`). [S3] [S31]
- **2026-02-12** — Microsoft Agent Framework "Workflow orchestrations" doc page authored (sequential/concurrent/handoff/group-chat/magentic taxonomy formalized). [S19]
- **2026-03-12** — A2A v1.0.0 released (breaking changes: proto-aligned enums, OAuth2 modernization, dropped deprecated fields). [S22]
- **2026-05-26** — A2A v1.0.1 patch (prefers `application/a2a+json` in HTTP binding). [S22]
- **2026-06-02** — Anthropic publishes "A harness for every task: dynamic workflows in Claude Code," naming 6 composable orchestration patterns (classify-and-act, fan-out-and-synthesize, adversarial verification, generate-and-filter, tournament, loop-until-done) as code, not agent-decided control flow. [S26]
- **2026-08-27** — A2A protocol transfers governance to the **Agentic AI Foundation** (having originally been donated by Google to the Linux Foundation). [S22]
- **2026-09-04 / 2026-09-21** — Microsoft's Magentic orchestration doc authored/updated with the fullest public spec of a "plan + progress ledger + stall detection + replanning" manager loop available from any vendor today. [S20]
- **ongoing 2025→2026** — LangChain deprecates the network/supervisor/hierarchical/swarm framing (and the `langgraph-supervisor`/`langgraph-swarm` packages) in favor of a router/subagents/handoffs/skills/custom-workflow taxonomy, with "Deep Agents" as the batteries-included harness on top. [S9] [S11] [S12] [S13]

## Mechanics

### 1. Workflows vs. agents (the base vocabulary)

Anthropic's definitions, still the field's reference point: **Workflows** are "systems where LLMs and tools are orchestrated through predefined code paths." **Agents** are "systems where LLMs dynamically direct their own processes and tool usage, maintaining control over how they accomplish tasks." [S21]

Five workflow patterns (COMPOSED summary of [S21], not verbatim — source uses prose, not a numbered API):
1. **Prompt chaining** — sequential steps, each LLM call consumes the prior output; use programmatic checkpoints ("gates") between steps to verify before continuing. Good when the task decomposes into fixed, well-defined subtasks (e.g., draft copy → translate).
2. **Routing** — a classification step sends input down one of several specialized paths. Good when a task has genuinely distinct input categories best served by separately-optimized prompts (e.g. customer service triage).
3. **Parallelization** — two variants: **sectioning** (independent subtasks run concurrently, results aggregated) and **voting** (the same task run multiple times for diverse outputs, then combined/majority-voted). Good for speed (sectioning) or reliability via multiple independent perspectives (voting).
4. **Orchestrator-workers** — a central LLM dynamically decomposes the task and delegates to worker LLMs, then synthesizes. Good for tasks whose subtask structure can't be predicted in advance (e.g. multi-file code changes).
5. **Evaluator-optimizer** — one LLM generates, a second LLM evaluates and gives feedback, looped until criteria are met. Good when there's a clear evaluation rubric and iteration demonstrably helps (e.g. literary translation).

An "agent" proper is the orchestrator-workers pattern taken to its logical extreme: the LLM itself decides the loop, not fixed code.

### 2. Anthropic's orchestrator-worker research system — the reference case study [S1]

Architecture: a **lead agent** (Opus 4) receives the query, plans strategy, and spawns multiple **subagents** (Sonnet 4) that explore different sub-questions **in parallel**. Subagents each do their own iterative tool-use loop (search, read, refine) and return findings; the lead synthesizes.

Key numbers, all VERBATIM/paraphrased-with-conditions from [S1]:
- "Agents use about 4× more tokens than chat interactions, and multi-agent systems use about 15× more tokens than chats." (Anthropic's own measurement, no dataset ID given beyond "our systems.")
- Multi-agent Opus4-lead/Sonnet4-worker system "outperformed single-agent Claude Opus 4 by 90.2%" on Anthropic's **internal** research eval (not a public benchmark).
- "Token usage by itself explain[ed] 80% of the variance" in performance on browsing evaluations they ran.
- Parallel tool calling inside a subagent — the subagent itself issuing 3+ tool calls simultaneously — "cut research time by up to 90% for complex queries" versus sequential tool calls.
- A model upgrade (to Sonnet 4) delivered larger gains than doubling a worker's token budget — i.e., model quality > brute-force scaling of a single worker's budget.

When it works: high-value tasks with heavy, genuine parallelism ("breadth-first" queries — "what are the top pharma companies by market cap in each of the last 10 years" style), information exceeding what fits one context window, tasks needing many different tools interfaced simultaneously, open-ended research where the path can't be pre-planned.

When it's a bad fit, explicitly called out: tasks that need **shared context** across every step, or that have **heavy step-to-step interdependencies** — Anthropic names "most coding work" as an example of the bad-fit case, because file A's change constrains what's valid in file B, and subagents working from isolated context will produce inconsistent edits (this directly echoes Cognition's critique, see below).

Coordination mechanism as currently implemented: **synchronous** — lead agent waits for a batch of subagent results before proceeding. This is simple but creates a serialization bottleneck; Anthropic states they are still evaluating **asynchronous** execution (more parallelism, but harder coordination/state consistency).

Prompt-engineering lessons for the orchestrator specifically (paraphrased from [S1]):
- The delegator (lead) must give each subagent a genuinely complete task spec: objective, expected output format, which tools to use, explicit boundaries on scope — vague delegation causes subagents to duplicate each other's work or miss the actual ask.
- Teach the lead explicit **scaling rules**: e.g. "a simple fact lookup needs 1 subagent making 3-10 tool calls; a complex comparative research task needs 10+ subagents each with a clearly separated slice of the problem."
- Claude 4-class models can meaningfully **self-diagnose** their own prompting failures and propose fixes — Anthropic used this as an internal debugging loop.
- External memory: since a lead can run long, before nearing its context limit it writes its plan and completed-phase state externally, so it can pick back up ("compaction" of orchestrator state into a durable artifact, not just in-context memory).

Evaluation methodology [S1]: start with ~20 realistic test queries; scale with an **LLM-as-judge** (a single prompt producing a 0.0-1.0 score plus pass/fail, scoring factual accuracy, citation accuracy, completeness, source quality, tool efficiency); still keep a human review pass as a catch-all, because it surfaces failure classes (hallucination patterns, systematic bias toward SEO-heavy sources over authoritative-but-less-optimized ones) automated judges miss.

Failure patterns actually observed [S1]: agents spawning too many subagents for a trivially simple query; endless search for information that doesn't exist; duplicate work from underspecified task descriptions; sequential search where parallel would have worked; and a source-quality bias toward SEO-optimized content.

### 3. Cognition's counter-position — "Don't Build Multi-Agents" [S2]

Published one day before Anthropic's piece (2025-06-12). Argues the *architecture*, not the scaffolding, is the problem, using a toy example (two agents independently building a Flappy Bird game): if each agent doesn't see what the other decided, their outputs conflict (bird visual style vs. background style mismatch) even when each agent individually "succeeds" at its slice.

Two stated principles [S2]:
1. **Share full context, not just messages.** "Share context, and share full agent traces, not just individual messages." Each agent needs the whole prior decision trail, not a compressed task description.
2. **Actions carry implicit decisions.** "Actions carry implicit decisions, and conflicting decisions carry bad results." Parallel agents, even with some shared context, still make independent micro-decisions that can conflict.

Recommended architectures instead of parallel multi-agent: (a) a **single-threaded linear agent** for most tasks — simplest, has continuous context, no coordination problem to solve; (b) a **compressed-history model** — an LLM whose job is to distill the growing conversation into the load-bearing facts, letting a single agent run much longer without hitting context limits, functionally similar to Anthropic's "external memory" idea above but framed as compaction rather than external artifact storage.

Cognition explicitly calls out **OpenAI's Swarm** and **Microsoft's AutoGen** as examples of the parallel-multi-agent pattern it's warning against, and cites Claude Code's own subagent use (which — per [S2] — was, at the time of writing, *only* used for read-only investigation/question-answering, never for parallel *coding* on the same artifact) as evidence the pattern the industry actually ships is conservative about parallelism on shared output.

**Note for the book**: this is not "multi-agent bad, single-agent good" as a blanket claim — read closely, both [S1] and [S2] agree on the actual mechanism: parallel agents fail when they write to a shared, interdependent artifact without seeing each other's decisions. They disagree mainly on how common that condition is in practice and how solvable it is with better context-sharing vs. avoided by not parallelizing interdependent work.

### 4. MAST — the failure taxonomy [S3] [S31]

Dataset: **MAST-Data**, 1,642 annotated traces (v1 abstract cites "1600+"), across **7 popular MAS frameworks**, 2 model families (GPT-4 series, Claude series). Taxonomy built by Grounded Theory analysis of 150 traces (avg >15,000 lines each) spanning 5 open-source frameworks, 6 expert human annotators; 3 annotators independently labeled 15 traces to reach κ=0.88 agreement. Scaled to the full dataset with an **LLM-as-judge annotator** built on OpenAI's o1, calibrated to κ=0.77 against humans (validated to κ=0.79 on two unseen frameworks/benchmarks). Frameworks named in the paper text: ChatDev, MetaGPT, HyperAgent, AppWorld, AG2 (MathChat), OpenManus (+1 more not captured in this extract). [S3]

**The 3 categories and their measured share of failures** (percentages as reported by the paper's own follow-on analysis pages — note the abstract's phrasing differs slightly, "System design issues" vs. a later section's "Specification Issues" label for the same category — both refer to FC1):

- **FC1 — System Design / Specification Issues: 41.77%** — flaws in pre-execution design choices that manifest at execution time.
- **FC2 — Inter-Agent Misalignment: 36.94%** — breakdowns in critical information flow between agents; requires "social reasoning" from agents to avoid.
- **FC3 — Task Verification: 21.30%** — premature termination or inadequate result-checking.

**The 14 failure modes, VERBATIM definitions from the paper** [S3, pdftotext extraction of arXiv:2503.13657]:

- FM-1.1 Disobey task specification (11.8%) — "Failure to adhere to the specified constraints or requirements of the task."
- FM-1.2 Disobey role specification (1.5%) — "Failure to adhere to the defined responsibilities and constraints of an agent's assigned role."
- FM-1.3 Step repetition (15.7%) — "Unnecessary reiteration of previously completed steps in a process."
- FM-1.4 Loss of conversation history (2.80%) — "Unexpected context truncation, disregarding recent interactions."
- FM-1.5 Unaware of termination conditions (12.4%) — "Lack of recognition or understanding of the [conditions under which a task should stop]."
- FM-2.1 Conversation reset (2.20%) — "Unexpected or unwarranted restarting of a dialogue, potentially losing context and progress."
- FM-2.2 Fail to ask for clarification (6.80%) — "Inability to request additional information when needed."
- FM-2.3 Task derailment (7.40%) — "Deviation from the intended objective or focus of a given task."
- FM-2.4 Information withholding (0.85%) — "Failure to share or communicate important data."
- FM-2.5 Ignored other agent's input (1.90%) — "Disregarding or failing to adequately consider [another agent's contribution]."
- FM-2.6 Reasoning-action mismatch (13.2%) — "Discrepancy between the logical reasoning process and the actions taken."
- FM-3.1 Premature termination (6.20%) — "Ending a dialogue, interaction or task before all necessary [conditions are met]."
- FM-3.2 No or incomplete verification (8.20%) — "(partial) omission of proper checking or confirmation of task outcomes."
- FM-3.3 Incorrect verification — "Failure to adequately validate or cross-check crucial [outputs]."

(Percentages are frequency-of-occurrence within the annotated dataset, per-mode, as reported in the paper body; FM-3.3's exact % wasn't captured in this extraction pass — flagged in Unverified.)

**Solution strategies mapped to failure category** (Table 4 of the paper, COMPOSED restatement of the table structure, category labels VERBATIM) [S3]:

| Failure Category | Tactical approaches | Structural strategies |
|---|---|---|
| System Design Issues | Clear role/task definitions, further discussion, self-verification, conversation-pattern design | Comprehensive verification, confidence quantification |
| Inter-Agent Misalignment | Cross-verification, conversation-pattern design, mutual disambiguation, modular agent design | Standardized communication protocols, probabilistic confidence measures |
| Task Verification | Self-verification, cross-verification, topology redesign for verification | Comprehensive verification & unit-test generation |

**Intervention case studies** [S3]:
- *AG2/MathChat* (Student + Assistant agents solving GSM-Plus math problems, 200 exercises, GPT-4 and GPT-4o, 6 repetitions per config): improving the prompt (explicit structure + a dedicated verification section) significantly beat baseline under GPT-4; redesigning the topology into 3 roles (Problem Solver → Coder → Verifier, only the Verifier can end the conversation) did **not** significantly improve over baseline under GPT-4 (Wilcoxon p=0.4) but **did** under GPT-4o (p=0.03) — i.e. the effectiveness of a structural fix is model-dependent, not universal.
- *ChatDev* (simulated software company: CEO/CTO/engineer/reviewer roles): fixing role-adherence prompts (only a superior agent may end a conversation — this stopped the CPO from prematurely ending discussions with the CEO) plus switching the framework's DAG topology to a **cyclic graph** (loop until the CTO confirms all reviews pass, with a max-iteration cutoff) gave the headline **+9.4%** task-success improvement on the CEO/CPO fix specifically, tested on a custom 32-task set (ProgramDev-v0) and OpenAI's HumanEval. The paper's own caveat: these interventions are real but not sufficient — "achieving robust MAS reliability often requires more than isolated fixes... fundamental MAS redesigns."

### 5. Coordination topologies — current framework taxonomy (synthesis across sources)

Cutting across vendor docs, the recurring topologies as of late 2026 are:

- **Prompt chaining / sequential** — fixed order, output→input. Universal; every framework has it (LangGraph `StateGraph`, MS Agent Framework "Sequential" orchestration [S19], Mastra "Workflows" [S17], Agno "Tasks" mode [S18]).
- **Parallelization / concurrent** — fan-out then fan-in/synthesize. MS Agent Framework "Concurrent" [S19]; Anthropic's "sectioning"/"voting" [S21]; Agno "Broadcast" mode [S18]; Mastra "Council" pattern (run same problem on N agents independently, then synthesize — explicitly for ambiguous/high-stakes questions where quality beats cost) [S17].
- **Router** — one classification step, then dispatch to exactly one specialist, done. LangChain names this explicitly as distinct from a supervisor: "A router is typically a single classification step that dispatches to agents without maintaining ongoing conversation state," vs. a supervisor which "is a full agent that maintains conversation context and dynamically decides which subagents to call across multiple turns." [S10]
- **Supervisor / orchestrator-workers** — one agent stays in control for the whole task, calling others as tools, synthesizing results itself. LangChain "Subagents" pattern [S10]; Mastra "Supervisor agents" [S17]; Claude Code/Agent SDK "Subagents" [S4][S25]; Agno "Coordinate" mode (default) [S18].
- **Handoffs (peer-to-peer control transfer)** — the *currently active* agent transfers ownership of the interaction to another agent, who becomes the new "owner"; the original doesn't necessarily reclaim control. OpenAI Agents SDK exposes this as a first-class primitive (see wire example below) [S5]. LangGraph implements the same idea via a `Command` object that both updates state *and* routes (`goto=`) to another node/graph, including across a parent/subgraph boundary via `graph=Command.PARENT` [S7][S8]. Mastra frames it as: "the active specialist takes ownership of the next part of the interaction" — contrasted explicitly with supervisor, where the first agent never gives up control [S17].
- **Group chat** — agents share one conversation and speak according to some turn-taking rule. MS Agent Framework "Group Chat" [S19].
- **Magentic (planning manager)** — see dedicated section below; a manager with an explicit plan/progress-ledger data structure dynamically selects the next speaker. [S20]
- **Agent teams / swarm (no central owner)** — peer sessions with a shared task list, communicating directly, no single agent holds control flow. Claude Code "Agent teams" [S24]; `langgraph-swarm` (last-active-agent state persists across turns, so the conversation "resumes with that agent" on the next turn) [S13].
- **Skills** — not a control-flow topology at all: "specialized prompts and knowledge loaded on-demand, a single agent stays in control" [S9] — included here only because LangChain groups it alongside the control-flow patterns; cross-reference ch.06 (Agent Skills) for the actual mechanism.
- **Debate / blackboard** — not directly documented by any single framework's official docs as a first-class primitive as of this pass; debate is usually hand-rolled on top of "parallelization" + "evaluator-optimizer" (run N agents, then an evaluator/judge compares). Flagged as **unverified whether any major SDK ships a named "debate" or "blackboard" primitive** — see Unverified section.

### 6. Wire-level / API mechanics, verbatim where available

**OpenAI Agents SDK — handoff as a tool** [S5, VERBATIM structure from official docs, some field values summarized]:
```python
from agents import Agent, handoff

billing_agent = Agent(name="Billing agent")
refund_agent = Agent(name="Refund agent")

triage_agent = Agent(
    name="Triage agent",
    handoffs=[billing_agent, handoff(refund_agent)]
)
```
A handoff to "Refund Agent" becomes a tool literally named `transfer_to_refund_agent` in the model's tool list — the LLM picks the handoff exactly like any other tool call. `handoff()` accepts: `agent`, `tool_name_override`, `tool_description_override`, `on_handoff` (callback), `input_type` (a Pydantic model defining the handoff's structured arguments), `input_filter` (transforms the conversation history the receiving agent sees, e.g. `handoff_filters.remove_all_tools` strips prior tool-call messages), `is_enabled` (bool or runtime predicate), `nest_handoff_history`. The SDK ships `RECOMMENDED_PROMPT_PREFIX` / `prompt_with_handoff_instructions()` to inject standard handoff-awareness language into an agent's system prompt. [S5]

**LangGraph — `Command` for handoffs across a parent/subgraph boundary** [S7, VERBATIM per WebFetch extraction]:
```python
def my_node(state: State) -> Command[Literal["other_subgraph"]]:
    return Command(
        update={"foo": "bar"},
        goto="other_subgraph",
        graph=Command.PARENT
    )
```
`Command` unifies "update state" and "route to next node" in one return value — this is also how a tool call can both write to shared state *and* redirect execution to a different agent node, which is the mechanism LangChain's "Handoffs" pattern is built on. [S7][S8]

**Microsoft Agent Framework — Magentic builder (Python)** [S20, VERBATIM code from official docs]:
```python
from agent_framework.orchestrations import MagenticBuilder

workflow = MagenticBuilder(
    participants=[researcher_agent, coder_agent],
    intermediate_output_from=[researcher_agent, coder_agent],
    manager_agent=manager_agent,
    max_round_count=10,
    max_stall_count=3,
    max_reset_count=2,
).build()
```
Mechanics [S20]: the **Magentic manager** maintains a **task ledger** (the plan) and a **progress ledger**, updated once per coordination round, carrying: `IsRequestSatisfied`, `IsInLoop`, `IsProgressBeingMade`, `NextSpeaker`, `InstructionOrQuestion`. Consecutive non-progressing rounds increment a stall counter; exceeding `max_stall_count` triggers an automatic **reset and replan** (bounded by `max_reset_count`). Optional human-in-the-loop plan review: the workflow pauses via a `MagenticPlanReviewRequest`, and a human calls `.approve()` or `.revise(feedback)` on it. Three orchestrator events mark milestones: plan created, replanned, progress-ledger-updated. Explicitly modeled on the AutoGen **Magentic-One** research system's 4-agent design, but generalized to arbitrary participant sets — the docs warn "it is untested how well [it] will perform outside of the original Magentic-One design." [S20]

**LangChain — Subagent-as-tool** [S10, VERBATIM from docs]:
```python
from langchain.tools import tool
from langchain.agents import create_agent

subagent = create_agent(model="...", tools=[...])

@tool("research", description="Research a topic and return findings")
def call_research_agent(query: str):
    result = subagent.invoke({"messages": [{"role": "user", "content": query}]})
    return result["messages"][-1].content

main_agent = create_agent(model="...", tools=[call_research_agent])
```
Default isolation: subagents are stateless per-call — "a clean context window, preventing context bloat" — and return results **to the main agent, not the user**. A "forked" mode exists where the subagent instead receives the parent's full conversation history (and, in Deep Agents, its system prompt). [S10]

**Claude Code — subagent definition (frontmatter)** [S4, VERBATIM structure]:
```markdown
---
name: code-reviewer
description: Reviews code for quality and best practices
tools: Read, Glob, Grep
model: sonnet
---

You are a code reviewer. When invoked, analyze the code and provide
specific, actionable feedback on quality, security, and best practices.
```
Model resolution order: per-invocation `model` param → subagent's own `model:` frontmatter (`inherit` = main conversation's model) → `CLAUDE_CODE_SUBAGENT_MODEL` env var → main conversation's model. Default **concurrent subagent limit: 20**; default **nesting depth limit: 3** layers below the main conversation (both are `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` / `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` env vars). [S4]

**Claude Code — subagents vs. agent teams, the structural distinction** [S24, VERBATIM table]:

| | Subagents | Agent teams |
|---|---|---|
| Context | Own context window; results return to the caller | Own context window; fully independent |
| Communication | Return a result to the caller | Teammates message each other directly |
| Coordination | Main agent manages all work | Self-coordination through messages, plus a shared task list |
| Best for | Focused tasks where only the result matters | Complex work requiring discussion and collaboration |
| Token cost | Lower: results summarized back to main context | Higher: each teammate is a separate Claude instance |

Agent teams require an **interactive session** — in non-interactive/headless mode (`-p` flag, including SDK sessions) Claude never spawns a teammate, only ordinary subagents, even with the feature flag on. [S24]

**Claude Code — dynamic workflows, the code-level primitives** [S26]: `agent()` spawns one subagent with configurable model/isolation; `parallel()` fans out and waits for all to complete; `pipeline()` streams data through sequential stages. Six named composable patterns: classify-and-act, fan-out-and-synthesize, adversarial verification, generate-and-filter, tournament (pairwise comparison determines a winner), loop-until-done. Explicitly framed as fixing three single-context failure modes: "agentic laziness" (premature completion), self-preferential bias when an agent verifies its own output, and goal drift across many turns/compactions.

### 7. Durable execution [S29]

Temporal's framing (COMPOSED summary of [S29], one quote VERBATIM): agent loops are "long-running and stateful," and "calls inside them fail: model requests time out, tools rate-limit, approvals take a day." Their architecture: **"the loop is a Workflow, each model call and tool call is an Activity, and a crash resumes the conversation instead of restarting it."** [S29, VERBATIM] This matters specifically for multi-agent systems because a supervisor/orchestrator coordinating N long-running workers cannot itself be a single stateless request — if the orchestrator process dies mid-coordination, you need the plan, the progress ledger, and each worker's in-flight state to survive the crash and resume, which is exactly the durable-execution value proposition. Cross-reference: this overlaps with ch.12 (deep agents) for the general durable-execution-for-agents pattern; here the specific angle is "the orchestrator's own coordination state must be durable too, not just each worker's."

### 8. Observability [S30]

OpenTelemetry's GenAI semantic conventions (moved to a dedicated `semantic-conventions-genai` repo, status **Development**, not GA) define: `create_agent` operation → span name `create_agent {gen_ai.agent.name}`; `invoke_agent` operation → span name `invoke_agent {gen_ai.agent.name}`; `invoke_workflow` operation → span name `invoke_workflow {gen_ai.workflow.name}`. Key attributes: `gen_ai.agent.id` (provider-stable identifier, e.g. an AWS Bedrock agent ARN or a GCP Agent Registry identifier), `gen_ai.agent.name`, `gen_ai.workflow.name` (example values given in spec: `multi_agent_rag`, `customer_support_pipeline`). [S30] Practical implication for a multi-agent system: a trace should show nested `invoke_agent` spans per participant under one `invoke_workflow` span for the orchestration run — but because the spec itself is pre-stable, expect attribute names/spans to still change; don't hard-couple dashboards to it yet.

## Numbers

| Number | Condition | Source |
|---|---|---|
| ~4× tokens vs. chat | single agent, Anthropic's internal measurement, unspecified dataset | [S1], 2025-06-13 |
| ~15× tokens vs. chat | multi-agent system, Anthropic's internal measurement | [S1], 2025-06-13 |
| 80% of variance explained by token usage | Anthropic's internal browsing-task evals | [S1], 2025-06-13 |
| +90.2% task success | multi-agent (Opus4 lead + Sonnet4 workers) vs. single-agent Opus4, Anthropic's **internal** research eval, breadth-first queries | [S1], 2025-06-13 |
| up to 90% research-time reduction | subagent issuing 3+ parallel tool calls vs. sequential, Anthropic's internal measurement, "complex queries" | [S1], 2025-06-13 |
| 1,642 traces / 7 frameworks / 14 failure modes / 3 categories / κ=0.88 | MAST dataset construction | [S3], v3 2025-10-26 |
| FC1 41.77% / FC2 36.94% / FC3 21.30% | share of failures per category in MAST-Data | [S3] |
| FM-1.3 (step repetition) 15.7%, FM-2.6 (reasoning-action mismatch) 13.2%, FM-1.5 (unaware of termination) 12.4%, FM-1.1 (disobey task spec) 11.8% — the 4 most common individual failure modes | MAST-Data | [S3] |
| +9.4% task success | single workflow fix ("only CEO may end conversation") in ChatDev, MAST-guided intervention | [S3] |
| Wilcoxon p=0.4 (not significant) vs. p=0.03 (significant) | same topology redesign intervention, tested under GPT-4 vs. GPT-4o respectively, AG2/MathChat, 200 GSM-Plus exercises, 6 repetitions | [S3] |
| up to 70% higher end-to-end goal success | multi-agent coordination mode vs. single-agent, AWS Bedrock enterprise benchmark, handcrafted scenarios across 3 enterprise domains | [S27], 2024-12-06 |
| 90% end-to-end goal success rate | coordination mode with inter-agent communication + payload referencing, same AWS benchmark | [S27] |
| +23% performance | payload referencing specifically, on code-intensive tasks, same AWS benchmark | [S27] |
| κ=0.77 (LLM-judge vs. human), κ=0.79 (on 2 unseen frameworks) | MAST's LLM-as-judge annotator (built on OpenAI o1) calibration | [S3] |

## Pitfalls, limits, criticism

- **Shared-artifact writes without shared context is the root failure mode**, agreed on by both the pro- and anti-multi-agent camps: Anthropic names it as the reason multi-agent is a poor fit for most coding work [S1]; Cognition names it as the reason multi-agent architectures are unreliable in general, with the Flappy Bird example [S2].
- **Coordination cost is real and must "earn" its place** — echoed independently by Anthropic's token multipliers [S1], Claude Code's own docs warning agent teams "add coordination overhead and use significantly more tokens than a single session" and recommending single-session/subagents "for sequential tasks, same-file edits, or work with many dependencies" [S24], and the dynamic-workflows blog's framing that parallelism/specialization "must earn their coordination cost" [S26].
- **Isolated interventions don't fix MAS reliability** — MAST's own conclusion after running real interventions with measurable gains: "achieving robust MAS reliability often requires more than isolated fixes... pointing towards the need for more complex solutions and fundamental MAS redesigns." [S3] A statistically significant fix under one model (GPT-4o) was not significant under another (GPT-4) for the identical topology change — **generalizability of a fix across models is not guaranteed.** [S3]
- **The prebuilt "just add a supervisor library" path is being actively walked back**: LangChain's own `langgraph-supervisor`/`langgraph-swarm` READMEs now steer users to hand-roll the tool-calling pattern instead, citing better "control over context engineering." [S12][S13] This is a live signal that the ecosystem's early abstractions (2024-era) are considered too opaque/rigid by their own maintainers in 2026.
- **Router ≠ supervisor, and conflating them is a common design mistake**: a router has no ongoing state and can't adapt mid-task; a supervisor does and can — using a router where the task needs multi-turn adaptive delegation (or vice-versa, paying supervisor overhead for a one-shot classification) is a named anti-pattern in LangChain's docs. [S10]
- **Handoffs move the hard problem to context management**: Mastra's docs state this explicitly — "the tradeoff is that context management becomes more important, since the system must decide what the next agent inherits and what remains scoped." [S17] This is the same problem Cognition raised, now stated as an accepted design tradeoff rather than a reason to avoid the pattern.
- **Magentic's generality is explicitly unverified by its own vendor**: "it is untested how well the Magentic orchestration will perform outside of the original Magentic-One design [4 specific agents]." [S20] Don't cite Magentic-One's benchmark numbers as if they transfer to an arbitrary Magentic deployment.
- **Council/voting/debate patterns cost more and are slower by design** — Mastra: "councils intentionally duplicate effort and usually take longer and use more tokens than other patterns," recommended only when "answer quality matters more than speed." [S17]
- **A single agent is very often the right call**: Agno's own docs on Teams: "A single agent is preferable when minimizing expenses or when one domain of expertise suffices" [S18]; Mastra: "Start with one agent when possible. Add more agents when the added structure clearly improves quality, speed, or reliability." [S17]; LangChain: "not every complex task requires this approach — a single agent with the right tools and prompt can often achieve similar results." [S9]

## What changed in the last 6 months (roughly April–September 2026)

- LangChain finished restructuring its multi-agent docs around Router/Subagents/Handoffs/Skills/Custom-Workflow, formally deprecating the old network/supervisor/hierarchical taxonomy and the `langgraph-supervisor`/`langgraph-swarm` prebuilt packages in favor of the raw tool-calling pattern. [S9][S12][S13]
- Google ADK's **template workflow agents (Sequential/Parallel/Loop) were superseded by graph-based and dynamic workflows starting with ADK 2.0** (Python, Go) — a structural break from the earlier fixed-topology model. [S15]
- Microsoft's Magentic orchestration page was authored (2026-02-12) and substantially updated (2026-09-21) — this is the newest, most detailed "planning manager" spec across all vendors covered here, including human-in-the-loop plan review added as a first-class feature. [S19][S20]
- A2A shipped its **v1.0.0** breaking-change release (2026-03-12) and a patch (2026-05-26), then transferred governance from a Google/Linux-Foundation arrangement to the newly formed **Agentic AI Foundation** (2026-08-27) — a governance, not just a technical, milestone. [S22]
- Claude Code published **dynamic workflows** (2026-06-02) as a distinct, code-driven fourth way to run multiple agents (alongside subagents, agent view, and agent teams) — explicitly for work "too big to coordinate one turn at a time," with 6 named reusable coordination patterns. [S26]
- Claude Code's **agent teams** feature (peer sessions, shared task list, direct messaging, still experimental/opt-in) had several dated UI/behavior changes across v2.1.181→v2.1.199→v2.1.257 in this window (idle-teammate-row visibility, model-resolution precedence) — evidence the feature is actively iterating, not stable. [S24]

## Diagram candidates

1. **Workflow vs. agent spectrum** — actors: developer, fixed code path, LLM; arrows: code calls LLM (workflow) vs. LLM decides next tool call (agent); states: fixed sequence vs. dynamic loop. Source: [S21].
2. **Anthropic's orchestrator-worker research system** — actors: lead agent (Opus), N subagents (Sonnet), external memory store; arrows: lead→subagent (task spec), subagent→tool (search), subagent→lead (findings), lead→external memory (plan/progress before context limit); states: planning, parallel exploration, synchronous wait, synthesis. Source: [S1].
3. **The Flappy Bird divergence example** — actors: coordinator agent, subagent A (bird), subagent B (background); arrows: coordinator splits task → each subagent works from an isolated context → both write to the shared game file; states: independent-success / integration-conflict. Source: [S2].
4. **MAST taxonomy tree** — actors: none (a classification tree); nodes: 3 categories (FC1/FC2/FC3) each fanning to their failure modes with % labels. Source: [S3].
5. **Router vs. supervisor vs. handoff control-flow diagram** — three side-by-side mini-diagrams: router (one-shot classify→dispatch, no return), supervisor (caller↔subagent-as-tool, loop, caller always resumes control), handoff (agent A hands off to agent B, B becomes new owner, A doesn't resume by default). Sources: [S10][S17].
6. **Magentic manager loop** — actors: manager, task ledger, progress ledger, N participant agents; arrows: manager creates plan → (optional) human plan review → manager picks `NextSpeaker` → participant executes → progress ledger updated → stall counter check → replan-if-stalled loop → final synthesis. Source: [S20].
7. **Subagents vs. agent teams (Claude Code)** — two panels: subagents (main agent spawns N children, each returns a summary to main, main stays in control) vs. agent teams (lead + teammates all read/write one shared task list, arrows between every pair of teammates for direct messaging). Source: [S24].
8. **Durable execution mapping** — actors: orchestrator-as-Workflow, each agent call as an Activity, a durable execution engine; arrows: crash → resume-in-place (not restart); states: running, crashed, resumed. Source: [S29].
9. **Coordination-cost vs. task-parallelism decision diagram** — axes: how independent are the subtasks (x) vs. how much value does breadth/parallel exploration add (y); quadrants: single agent (low both), workflow/prompt-chaining (sequential dependency, low breadth value), subagents/supervisor (independent, some value), agent team/swarm (independent, high breadth value, willing to pay high token cost). Composed from [S1]+[S2]+[S24]+[S17] positions, not from a single source — mark as COMPOSED if drawn.

## Chart candidates

1. **Token multiplier bar chart**: chat = 1×, single agent ≈ 4×, multi-agent ≈ 15× — Anthropic's internal measurement, 2025-06-13. [S1]
2. **MAST failure-category pie/bar**: FC1 41.77%, FC2 36.94%, FC3 21.30%. [S3]
3. **MAST failure-mode bar chart**, all 14 modes with their % (see table in Mechanics §4). [S3]
4. **AG2/MathChat intervention accuracy comparison**: baseline vs. improved-prompt vs. new-topology, split by GPT-4 vs. GPT-4o (Table 5 of [S3] — exact accuracy percentages were not captured in this pass; only the significance results (p=0.4 vs p=0.03) were extracted — **fetch Table 5's raw numbers before charting**, flagged in Unverified). [S3]
5. **AWS Bedrock benchmark bar chart**: single-agent vs. coordination-mode goal success rate (up to 70% relative lift, absolute rate up to 90%), plus the +23% payload-referencing effect on code-intensive tasks specifically. [S27]

## Glossary

- **Workflow (agentic sense)**: orchestration where code, not the LLM, decides the sequence of steps. [S21]
- **Agent (agentic sense)**: a system where the LLM itself decides its next tool call/step dynamically. [S21]
- **Orchestrator-workers**: a central LLM dynamically decomposes a task and delegates pieces to worker LLM calls, then synthesizes. [S21]
- **Handoff**: transfer of active control of an interaction from one agent to another, exposed to the model as a callable tool. [S5]
- **Router**: a single classification step dispatching to one of several specialist agents/paths, without maintaining multi-turn state. [S10]
- **Supervisor**: a persistent agent that keeps conversation context and decides across multiple turns which subagent to invoke. [S10]
- **Subagent**: a delegated worker spawned by a caller, operating in its own (usually isolated) context, returning a result to the caller rather than the end user. [S4][S10]
- **Agent team / swarm**: peer agents with no single owner of control flow, coordinating via shared state (task list) and direct messaging. [S24][S13]
- **Task ledger / progress ledger** (Magentic): the manager's persisted plan, and its per-round tracking of whether the request is satisfied, whether the team is looping, and who should act next. [S20]
- **MAST**: Multi-Agent System Failure Taxonomy — 14 failure modes in 3 categories, built from annotated real-system traces. [S3]
- **Context isolation**: giving a subagent a fresh context window containing only its task spec, not the full parent conversation — the default in most SDKs' subagent pattern. [S10][S4]
- **Durable execution**: an execution model (e.g. Temporal) where a long-running process's state survives crashes and resumes rather than restarting. [S29]
- **Agent Card** (A2A): a JSON document an A2A server publishes describing its identity, capabilities, skills, and how to reach/authenticate to it. [S22] (full mechanics: ch.07)

## Unverified / open questions

- **"Google research on scaling agent systems and its quantitative findings"** (named in the editor's brief): could not confirm a single specific paper matching this description from Google/Google DeepMind/Google Research. Checked and rejected as non-matches: "Towards Effective GenAI Multi-Agent Collaboration" (arXiv:2412.05449) is **AWS Bedrock**, not Google — kept in these notes under its correct attribution [S27]. Checked "Virtual Agent Economies" (arXiv:2509.10147, genuinely Google DeepMind) — it is about agent-economy/market design, only tangentially about MAS coordination scaling, kept as a cross-link candidate [S28]. Checked "Accelerating scientific discovery with Co-Scientist" (arXiv:2502.18864, genuinely Google, Feb 2025) — a real large multi-agent system (debate/tournament over hypotheses) but not framed as a "scaling" study with quantitative scaling-law findings; not deeply covered here. Ran multiple arXiv API searches for Google-authored multi-agent-scaling papers (queries on "multi-agent"+"scaling", "multi-agent"+"coordination"+"Google"/"Gemini") and found no clear match. **This lead needs the editor to supply the actual title/link**, or should be dropped from the chapter's scope.
- **FM-3.3 (Incorrect verification)'s exact frequency percentage** was not captured in the pdftotext extraction pass (grep matched the definition but not the inline %); the other 13 modes' percentages were captured. Needs a re-check against the paper's Figure 3/Table directly.
- **Table 5 of the MAST paper** (exact accuracy percentages for the AG2/MathChat and ChatDev intervention case studies) was not fully extracted — only the significance-test results (p-values) were pulled from surrounding text. Needed before building chart candidate #4.
- **Whether any major SDK ships a named "debate" or "blackboard" architecture as a first-class primitive** (as opposed to hand-rolled on top of parallelization + evaluator-optimizer) — not confirmed in any of the vendor docs checked (LangGraph, CrewAI, ADK, MS Agent Framework, Mastra, Agno, Pydantic AI, OpenAI Agents SDK, Claude Agent SDK). If a reader knows of one (e.g., a research framework like a formal blackboard-architecture library), it wasn't surfaced by this pass.
- **The 7th MAS framework in MAST-Data** beyond the 6 named in the extracted text (ChatDev, MetaGPT, HyperAgent, AppWorld, AG2/MathChat, OpenManus) was not identified — likely visible in the paper's Table 1, not fully captured in this extraction pass.
- **Full A2A Agent Card JSON wire example** was not captured verbatim in this pass — the fetched spec markdown uses an auto-generated proto-to-table macro rather than inline JSON for the AgentCard message itself. Full mechanics belong in ch.07 (A2A) research anyway; only the governance/version timeline was pulled in for this chapter.
- **WebSearch tool was unavailable for this entire research session** (session had already exhausted its search-call budget before this task started) — all research was done via WebFetch on directly-guessed/known URLs and via curl against arXiv's API, GitHub raw content, and doc sites' own `llms.txt` indexes. This means genuinely unknown-URL sources (e.g. a brand-new blog post whose URL isn't guessable or linked from a page already fetched) may have been missed. Flagging this as a methodological limitation on this chapter's source coverage, not a claim about the content's correctness.

## Sources

- [S1] Anthropic, "How we built our multi-agent research system," Anthropic Engineering blog, 2025-06-13, https://www.anthropic.com/engineering/multi-agent-research-system, accessed 2026-09-30
- [S2] Walden Yan, "Don't Build Multi-Agents," Cognition blog, 2025-06-12, https://cognition.com/blog/dont-build-multi-agents, accessed 2026-09-30
- [S3] Cemri, Pan, Yang, Agrawal, Chopra, Tiwari, Keutzer, Parameswaran, Klein, Ramchandran, Zaharia, Gonzalez, Stoica, "Why Do Multi-Agent LLM Systems Fail?", arXiv:2503.13657, v1 2025-03-17 / v3 2025-10-26, https://arxiv.org/abs/2503.13657, accessed 2026-09-30
- [S4] Anthropic, "Subagents," Claude Code documentation, https://code.claude.com/docs/en/sub-agents, accessed 2026-09-30 (undated page)
- [S5] OpenAI, "Handoffs," OpenAI Agents SDK (Python) documentation, https://openai.github.io/openai-agents-python/handoffs/, accessed 2026-09-30
- [S6] OpenAI, "Orchestrating multiple agents," OpenAI Agents SDK (Python) documentation, https://openai.github.io/openai-agents-python/multi_agent/, accessed 2026-09-30
- [S7] LangChain, "Graph API," LangGraph documentation, https://docs.langchain.com/oss/python/langgraph/graph-api, accessed 2026-09-30
- [S8] LangChain, "Handoffs," LangChain multi-agent documentation, https://docs.langchain.com/oss/python/langchain/multi-agent/handoffs, accessed 2026-09-30
- [S9] LangChain, "Multi-agent systems," LangChain documentation, https://docs.langchain.com/oss/python/langchain/multi-agent, accessed 2026-09-30
- [S10] LangChain, "Subagents," LangChain multi-agent documentation, https://docs.langchain.com/oss/python/langchain/multi-agent/subagents, accessed 2026-09-30
- [S11] LangChain, "Deep Agents overview," https://docs.langchain.com/oss/python/deepagents/overview, accessed 2026-09-30
- [S12] LangChain AI, `langgraph-supervisor-py` README, GitHub, https://raw.githubusercontent.com/langchain-ai/langgraph-supervisor-py/main/README.md, accessed 2026-09-30
- [S13] LangChain AI, `langgraph-swarm-py` README, GitHub, https://raw.githubusercontent.com/langchain-ai/langgraph-swarm-py/main/README.md, accessed 2026-09-30
- [S14] CrewAI, "Flows," CrewAI documentation, https://docs.crewai.com/concepts/flows, accessed 2026-09-30
- [S15] Google, "Workflow agents," Agent Development Kit documentation, https://adk.dev/agents/workflow-agents/ (formerly google.github.io/adk-docs), accessed 2026-09-30
- [S16] Pydantic, "Multi-agent applications," Pydantic AI documentation, https://pydantic.dev/docs/ai/guides/multi-agent-applications/ (formerly ai.pydantic.dev), accessed 2026-09-30
- [S17] Mastra, "Multi-agent systems," Mastra documentation guide, https://mastra.ai/docs/guides/multi-agent-systems, accessed 2026-09-30
- [S18] Agno, "Teams introduction," Agno documentation, https://docs.agno.com/teams/introduction, accessed 2026-09-30
- [S19] Microsoft, "Workflow orchestrations in Agent Framework," Microsoft Learn, ms.date 2026-02-12 / updated 2026-08-25, https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/, accessed 2026-09-30
- [S20] Microsoft (author: TaoChenOSU), "Magentic orchestration," Microsoft Agent Framework docs, ms.date 2026-09-04 / updated 2026-09-21, https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/magentic, accessed 2026-09-30
- [S21] Anthropic, "Building Effective Agents," Anthropic Engineering blog, 2024-12-19, https://www.anthropic.com/engineering/building-effective-agents, accessed 2026-09-30
- [S22] A2A Project, "A2A Protocol Specification" and CHANGELOG.md, a2a-protocol.org / GitHub a2aproject/A2A, v1.0.0 released 2026-03-12, v1.0.1 released 2026-05-26, https://a2a-protocol.org/latest/specification/ and https://raw.githubusercontent.com/a2aproject/A2A/main/CHANGELOG.md, accessed 2026-09-30
- [S23] Anthropic, "Agent SDK overview," Claude Code documentation, https://code.claude.com/docs/en/agent-sdk/overview, accessed 2026-09-30
- [S24] Anthropic, "Orchestrate teams of Claude Code sessions," Claude Code documentation, https://code.claude.com/docs/en/agent-teams.md, accessed 2026-09-30
- [S25] Anthropic, "Run agents in parallel," Claude Code documentation, https://code.claude.com/docs/en/agents.md, accessed 2026-09-30
- [S26] Thariq Shihipar, Sid Bidasaria, "A harness for every task: dynamic workflows in Claude Code," Anthropic/Claude blog, 2026-06-02, https://claude.dev/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code/, accessed 2026-09-30
- [S27] Raphael Shu, Nilaksh Das, Michelle Yuan, Monica Sunkara, Yi Zhang (AWS Bedrock), "Towards Effective GenAI Multi-Agent Collaboration: Design and Evaluation for Enterprise Applications," arXiv:2412.05449, 2024-12-06, https://arxiv.org/abs/2412.05449, accessed 2026-09-30
- [S28] Nenad Tomasev, Matija Franklin, Joel Z. Leibo, Julian Jacobs, William A. Cunningham, Iason Gabriel, Simon Osindero (Google DeepMind), "Virtual Agent Economies," arXiv:2509.10147, 2025-09-12, https://arxiv.org/abs/2509.10147, accessed 2026-09-30
- [S29] Temporal, "Use cases and design patterns" / Durable AI documentation, https://docs.temporal.io/evaluate/use-cases-design-patterns, accessed 2026-09-30 (no publication date on page)
- [S30] OpenTelemetry, "Semantic Conventions for GenAI agent and framework spans," status: Development, https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-agent-spans.md, accessed 2026-09-30
- [S31] Cemri et al., MAST GitHub repository README and project site, https://github.com/multi-agent-systems-failure-taxonomy/MAST and https://sites.google.com/berkeley.edu/mast/, accessed 2026-09-30
