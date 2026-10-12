# Глава 13. Мультиагентные системы — engineering practice notes

## TL;DR (must-knows, 2026)

- Multi-agent is a **cost/complexity trade**, not a free upgrade. Anthropic measured multi-agent (Opus 4 lead + Sonnet 4 subagents) beating single-agent Opus 4 by 90.2% on an internal research eval — but multi-agent systems burn **~15× the tokens of a single chat turn** (agents alone: ~4×) [S1]. Only pay this when task value clears that bar.
- **The central 2025-2026 industry debate**: Cognition ("Don't Build Multi-Agents", Walden Yan, Jun 2025) argues parallel subagents make *conflicting implicit decisions* because they can't see each other's full context — ship single-threaded linear agents instead, use subagents only for isolated, non-parallel, context-returning subtasks [S2]. Anthropic's own post is the counter-evidence: orchestrator-workers *does* work for read-only, parallelizable research where subagent outputs don't need to compose tightly [S1]. Both are right for their own task shape — the deciding variable is whether subtasks are *independent* (parallel-safe) or *interdependent* (need shared context/decisions).
- **MAST (Why Do Multi-Agent LLM Systems Fail?, UC Berkeley/NeurIPS 2025)**: first empirical failure taxonomy, 14 modes / 3 categories, from 1,642 traces across 7 frameworks. Failure rates on 7 SOTA open-source MAS: **41%–86.7%** task failure [S3]. Most failures are *system design* issues (44.2%), not model weakness — a single fix (give one agent final say) raised task success **+9.4%** [S3].
- LangChain **deprecated `langgraph-supervisor`** in 2026 in favor of five named patterns — Subagents, Handoffs, Skills, Router, Custom workflow — each with measured model-call/token trade-offs (e.g., subagents cost +1 model call per turn but use ~67% fewer tokens on multi-domain tasks vs. Skills) [S4]. This is the most concrete, current "how do I actually choose a topology" artifact available.
- Frameworks converge on the same primitives with different names: **handoffs** (OpenAI-coined term, tool call transfers control) ≈ LangChain Handoffs ≈ Microsoft Agent Framework "handoff orchestration"; **supervisor/orchestrator-workers** ≈ LangChain Subagents ≈ Claude Agent SDK subagents ≈ Pydantic AI delegation ≈ Agno "coordinate" mode; **group chat** ≈ AutoGen GroupChat ≈ MS Agent Framework "group chat orchestration"; **Magentic** (task ledger + progress ledger orchestrator) is now a named pattern in MS Agent Framework, descended from Magentic-One research [S5, S6, S7].
- Claude Agent SDK subagents are **stateless-by-default, context-isolated, tool-restricted**, spawned via an `Agent` tool call; as of the SDK's current docs, Claude Code caps subagent **depth (default 3)**, **concurrency (default 20)**, and total **spend** — because "Opus 5 delegates to subagents more readily than earlier models" and needs guardrails [S8]. For scale beyond a handful of subagents per turn, the SDK recommends moving off turn-by-turn delegation entirely onto a separate `Workflow` tool that runs a script outside the conversation context [S8].
- A2A (Agent2Agent protocol) has moved governance: as of **27 Aug 2026 it joined the Agentic AI Foundation** (under the Linux Foundation), positioning it as the vendor-neutral wire protocol for autonomous **agent-to-agent, multi-turn** collaboration — distinct from MCP, which wires models to tools/data (stateless calls), not to other reasoning agents [S9].
- Coordination-cost engineering choice: **full trace vs. compressed handoff**. Cognition's context-engineering approach compresses conversation history into "key decisions and events" between long-running segments [S2]; LangChain's Handoffs/Skills patterns keep a single growing message history (stateful, cheaper on repeats); Subagents pattern deliberately keeps subagent context isolated and throws it away after a summary returns (expensive per-call, cheap in aggregate tokens on wide fan-out) [S4].
- Durable execution is becoming a first-class multi-agent concern, not an afterthought: Microsoft Agent Framework ships checkpointing, pause/resume, and retry as built-in orchestration features (Oct 2025) [S6]; Temporal frames "durable execution" generically as crash-proof, resumable multi-step compute, now widely adopted as the substrate under long-running agent workflows [S10]; Anthropic's own production system uses **rainbow deployments** to avoid killing in-flight agents during a code deploy, plus resumption-from-checkpoint on tool failures rather than full restarts [S1].
- Verification/evaluation is the single most abused subsystem: MAST's category 3 (Task Verification: premature termination, no/incomplete verification, incorrect verification) accounts for **23.5%** of all failures and is the category multi-agent designers most often skip building for [S3].
- Design heuristic that recurs across every 2026 source: multi-agent buys you (a) context isolation, (b) parallelism/latency, (c) permission/tool separation, (d) distributed ownership across teams — and it costs you coordination overhead, token multiplication, and non-determinism. If none of (a)-(d) is actually needed, ship a single agent with better tools/prompt first [S1, S2, S4].
- Academic scaling result (not Anthropic/Google-branded, but the closest quantitative "how many agents" data as of 2026): homogeneous multi-agent systems show **diminishing, non-monotonic returns** to agent count, governed by a synergy-vs-coordination-overhead trade-off; degradation is attributed to coordination overhead, not merely context length limits [S11].

## Current state and versions (as of 2026-09-30)

- **LangGraph / LangChain**: `langgraph-supervisor` package is explicitly "no longer actively maintained" per LangChain's own migration guide; the supported pattern is `create_agent` + tool-wrapped subagents, alongside four other named patterns (Handoffs, Skills, Router, Custom workflow via `StateGraph`) [S4]. Deep Agents (a higher-level harness on top of LangChain) ships subagents, skills, planning, and a virtual filesystem out of the box [S4].
- **Claude Agent SDK**: `AgentDefinition` (Python/TypeScript) supports per-subagent `tools`, `disallowedTools`, `model`, `skills`, `memory`, `mcpServers`, `maxTurns`, `background`, `effort`, `permissionMode`. Depth/concurrency/spend caps require TypeScript SDK ≥ v0.3.219 / Python SDK ≥ v0.2.127 (bundling Claude Code ≥ v2.1.219) [S8]. A `Workflow` tool (TS SDK ≥ v0.3.149) exists specifically for coordinating "dozens to hundreds of agents" outside the conversational loop [S8].
- **OpenAI Agents SDK**: two LLM-orchestrated patterns — *agents-as-tools* (`Agent.as_tool()`, manager keeps control) and *handoffs* (`handoff()`, control fully transfers, term coined by OpenAI) — plus code-orchestrated patterns (structured outputs for routing, chaining, evaluator loops, `asyncio.gather` for parallel fan-out) [S5, S12].
- **Microsoft Agent Framework** (announced 1 Oct 2025): unifies **AutoGen** (research/experimentation) and **Semantic Kernel** (enterprise) — "doesn't replace" either, both still supported, but new development focuses here. Five orchestration patterns: Sequential, Concurrent, Group chat, Handoff, Magentic. Ships checkpointing, pause/resume, retry, human-in-the-loop approvals as core features [S6].
- **Google ADK**: multi-agent material now lives under "workflows" (URL reorganized from `/agents/multi-agents/` to `/workflows/` sometime in 2026). Distinguishes graph-based workflows (agents + deterministic nodes, branching), dynamic/code-composed workflows, collaborative workflows (one coordinator + sub-agents), and template workflow agents (Sequential/Parallel/Loop extending `BaseAgent`). Communication via shared session state, Events, and the A2A protocol for cross-system agent calls. Ships in Python, TypeScript, Go, Java, Kotlin [S13].
- **Pydantic AI**: three patterns — agent delegation (agent calls agent as a tool; new `SubAgents` helper exposes a single `delegate_task(agent_name, task)` tool), programmatic hand-off (app code calls agents in sequence, passing `message_history`), and graph-based control flow (`pydantic-graph` state machine) for complex conditional routing [S14].
- **Agno**: Teams abstraction with four delegation modes — **coordinate** (default: leader decomposes, delegates, synthesizes), **route** (single expert answers directly), **broadcast** (all members get the same task, outputs synthesized), **tasks** (loop until goal complete). Teams nest (sub-teams have their own leader). Explicit cost note in the docs: "leader and members make separate model calls. This adds latency, token usage, and coordination state" [S15].
- **CrewAI**: two-level abstraction — **Crews** (agents + sequential/hierarchical/custom process to finish one objective) vs. **Flows** (event-driven orchestration across multiple Crews using `@start()`/`@listen()`/`@router()` decorators, `or_`/`and_` combinators, structured or unstructured state) [S16].
- **A2A protocol**: v1.0 spec current; governance moved to the Agentic AI Foundation (Linux Foundation) as of **27 Aug 2026**. Core objects: Agent Card (published capability manifest, e.g. at `/.well-known/agent-card`), Task (unit of work with status), Message (`sendMessage` / `sendMessageStream`), Artifact (streamed output chunk) [S9].
- **Mastra, Agno docs sites reorganized** in 2026 — exact multi-agent-workflow URLs from pre-2026 material now 404; current canonical path for Agno is `/teams/introduction` [S15].

## Timeline

- **2024-06**: Google's "Chain of Agents" paper (Zhang, Sun, Chen, Pfister, Zhang) — LLMs collaborating on long-context tasks by passing partial summaries along a chain [background, not primary-verified in this pass].
- **2024-11-04**: Microsoft Research publishes **Magentic-One**, built on AutoGen: Orchestrator + WebSurfer + FileSurfer + Coder + ComputerTerminal, with an outer task-ledger loop and inner progress-ledger loop that re-plans after 2+ stalled steps. Competitive on GAIA/AssistantBench/WebArena [S7].
- **2024-12-19**: Anthropic publishes **"Building Effective AI Agents"** (Erik Schluntz, Barry Zhang) — canonical definitions of workflows vs. agents and the five patterns: prompt chaining, routing, parallelization (sectioning/voting), orchestrator-workers, evaluator-optimizer [S17].
- **2025-03-17 / rev. 2025-10-26**: **MAST** paper submitted to arXiv (Cemri, Pan, Yang et al., UC Berkeley + Intesa Sanpaolo), accepted NeurIPS 2025 Datasets & Benchmarks track [S3].
- **2025-05-06**: Temporal publishes a "what is durable execution" explainer that becomes a reference point as agent frameworks adopt the concept [S10].
- **2025-06-12/13**: Cognition ("Don't Build Multi-Agents", Walden Yan) and Anthropic ("How we built our multi-agent research system") publish within one day of each other — read together, they define the 2025-2026 debate [S1, S2].
- **2025-09-01**: Cognition's post resurfaces on Hacker News with 123 points / 89 comments — the discussion (Erlang/Elixir supervisor comparisons, "context compression" skepticism) becomes part of the practitioner discourse [S18].
- **2025-10-01**: Microsoft announces **Agent Framework**, unifying AutoGen + Semantic Kernel, with durable-execution features built in [S6].
- **2026 (exact date not captured)**: LangChain restructures its multi-agent docs into 5 named patterns and formally deprecates `langgraph-supervisor` in favor of `create_agent` + tool-wrapped subagents [S4].
- **2026-05-30**: "Scaling Behavior of Single LLM-Driven Multi-Agent Systems" (Li, Gu, Cai, Feng) posted — homogeneous MAS scaling is non-monotonic, diminishing-returns, coordination-overhead-bound [S11].
- **2026-08-27**: A2A protocol governance transfers to the **Agentic AI Foundation** [S9].

## Mechanics

### Anthropic's five workflow/agent patterns (the shared vocabulary) [S17]

1. **Prompt chaining** — sequential LLM calls, each processing the previous output, with optional programmatic "gates" that validate progress before continuing. Use when a task decomposes cleanly into fixed steps and you're trading speed for accuracy (e.g., draft → translate; outline-with-validation → full document).
2. **Routing** — a classifier step sends input down one of several specialized downstream paths (e.g., cheap model for easy queries, expensive model for hard ones; refunds vs. tech-support vs. general).
3. **Parallelization** — two sub-variants: **sectioning** (independent subtasks run concurrently, e.g. one LLM answers while another screens for safety) and **voting** (same task run multiple times, results aggregated for confidence, e.g. multiple independent code-vulnerability reviewers).
4. **Orchestrator-workers** — a central LLM *dynamically* decomposes the task (unlike parallelization's pre-defined subtasks) and delegates to worker LLMs, then synthesizes. Use when the required subtasks can't be predicted in advance (variable-scope coding changes, open-ended research).
5. **Evaluator-optimizer** — generator LLM + separate evaluator LLM in an iterative feedback loop, mimicking human revision. Use when there's a clear evaluation rubric and iteration measurably improves output (literary translation, research requiring repeated search-and-refine).

Anthropic's summary line: *"Success in the LLM space isn't about building the most sophisticated system. It's about building the right system for your needs."* [S17]

### Anthropic's production multi-agent research system (orchestrator-workers at scale) [S1]

Architecture: a **lead agent** (orchestrator) analyzes the query, develops a research strategy, and spawns **subagents** that explore different aspects of the problem **in parallel**; each subagent does its own tool-calling/search loop and returns findings; the lead synthesizes and decides whether more research rounds are needed.

Key engineering lessons (verbatim-paraphrased from the post):
- Simulate the multi-agent system yourself first to build an accurate mental model of how agents actually behave before writing the orchestrator prompt.
- Orchestrator prompts must give subagents *objectives, output format, tool-use guidance, and explicit task boundaries* — vague task descriptions cause duplicated work between subagents.
- Embed explicit **scaling rules** in the prompt: simple fact-lookup queries get 1 agent / 3-10 tool calls; complex comparative research gets 10+ subagents, each with a narrower sub-question.
- Design the **agent-tool interface** deliberately, with explicit heuristics about which tool to reach for and when (e.g., "start broad, then narrow" search strategy).
- Extended thinking is used as a controllable scratchpad for the orchestrator's planning step.
- **Parallel tool calling** (subagents issuing multiple tool calls concurrently, not just parallel subagents) cut research time by up to 90% for complex queries.
- Give agents room to **improve their own prompts** based on observed failure patterns.

Evaluation methodology: LLM-as-judge, single call, rubric of **factual accuracy, citation accuracy, completeness, source quality, tool efficiency**, scored 0.0–1.0 with pass/fail grading [S1].

Production reliability engineering (separate from the prompting lessons — this is the operations layer):
- *"Without effective mitigations, minor system failures can be catastrophic for agents."* Solution: resume from the failure point rather than restarting the whole agent run from scratch [S1].
- Agents can spawn **fresh subagents with clean contexts** while preserving continuity by retrieving stored context (e.g., the research plan) from memory rather than losing prior work when hitting the context limit [S1].
- **Rainbow deployments**: gradually shift traffic from the old to the new code version so in-flight agents are never killed mid-run by a deploy [S1].
- Full production tracing was necessary because standard debugging techniques don't work on non-deterministic multi-agent systems — *"Adding full production tracing let us diagnose why agents failed and fix issues systematically."* [S1]

Cost framing: *"tasks where the value of the task is high enough to pay for the increased performance"* — and domains needing shared context or heavy agent interdependence (their explicit example: **coding**) are called out as a poor fit for this architecture [S1].

### Cognition's counter-model: context engineering over multi-agent [S2]

Two stated design principles:
1. *"Share context, and share full agent traces, not just individual messages."*
2. *"Actions carry implicit decisions, and conflicting decisions carry bad results."*

Failure illustration ("Flappy Bird" example): if you split "build a Flappy Bird clone" across parallel subagents, one might build a Mario-style background while another builds a mismatched bird — because each subagent worked from incomplete, un-synchronized context, and the final integrator has no way to know *why* each decision was made, only that the pieces don't fit.

Recommended architecture:
- Default to a **single-threaded linear agent** — context always flows forward, every action is informed by every prior decision.
- Subagents are acceptable only for **isolated, well-scoped questions that don't feed into core decision-making**, and specifically **never run in parallel** with the caller or with each other on interdependent work.
- For long-duration tasks, use a **separate compressor LLM** that condenses conversation history into "key decisions and events" to extend effective context — not naive truncation.
- Cites **Claude Code** (as of the post's June 2025 vintage) as an existing example: its subagents only *answer questions*, never write code themselves and never run in parallel with the main agent — this is a deliberate design choice, not a limitation, to avoid conflicting-decision failures [S2].

This is explicitly a claim about *current* model capability, not a permanent architectural law: *"agents today are not quite able to engage in [long-context proactive discourse] with much more reliability than you would get with a single agent"* — Yan frames multi-agent collaboration as a capability gap that may close, not a fundamentally wrong idea [S2].

**Reconciling S1 and S2**: Anthropic's win case is read-heavy, breadth-first research where subagents' outputs are independent facts to be aggregated, not interdependent design decisions that must compose. Cognition's failure case is generative/constructive work (code, design) where subagent outputs must fit together into one coherent artifact. The dividing line: **are the subtasks decomposable into genuinely independent units, or do they require shared, evolving context to avoid contradicting each other?**

### MAST: the empirical failure taxonomy [S3]

Definitions: an LLM **agent** = prompt spec (initial state) + conversation trace (state) + tool/environment interaction (action). A **multi-agent system (MAS)** = a collection of agents interacting through orchestration for collective intelligence.

Method: Grounded Theory analysis of 150 traces (5 frameworks: HyperAgent, AppWorld, AG2, ChatDev, MetaGPT) → iterative taxonomy refinement with 3 expert annotators to Cohen's κ = 0.88 → LLM-as-judge (OpenAI o1, few-shot) scaled to the full 1,642-trace **MAST-Data** dataset (7 frameworks: ChatDev, MetaGPT, HyperAgent, AppWorld/AG2-MathChat, Magentic-One, OpenManus, plus generalization checks on Manus) across GPT-4 family, Claude 3.x, Qwen2.5, CodeLlama, on coding/math/general-agent tasks. LLM-annotator agreement with humans: accuracy 0.94, Cohen's κ 0.77 (few-shot) [S3].

**Full taxonomy with observed prevalence (Figure 1, n=1,642 traces)** [S3, VERBATIM percentages]:

| Category (share of all failures) | Failure mode | Prevalence |
|---|---|---|
| **System Design Issues — 44.2%** | 1.1 Disobey Task Specification | 11.8% |
| | 1.2 Disobey Role Specification | 1.50% |
| | 1.3 Step Repetition | 15.7% |
| | 1.4 Loss of Conversation History | 2.80% |
| | 1.5 Unaware of Termination Conditions | 12.4% |
| **Inter-Agent Misalignment — 32.3%** | 2.1 Conversation Reset | 2.20% |
| | 2.2 Fail to Ask for Clarification | 6.80% |
| | 2.3 Task Derailment | 7.40% |
| | 2.4 Information Withholding | 0.80% |
| | 2.5 Ignored Other Agent's Input | 1.90% |
| | 2.6 Reasoning-Action Mismatch | 13.2% |
| **Task Verification — 23.5%** | 3.1 Premature Termination | 6.20% |
| | 3.2 No or Incomplete Verification | 8.20% |
| | 3.3 Incorrect Verification | 9.10% |

Headline finding: task failure rate across 7 SOTA open-source MAS ranged **41%–86.7%**, and *"identified failures require more sophisticated solutions"* than isolated prompt fixes — MAST's own case study found that a **structural fix** (in ChatDev, giving the CEO agent final say instead of requiring consensus) raised overall task success by **+9.4%**, illustrating that MAST-guided structural redesign beats prompt patching [S3].

Example failure trace they publish (Figure 3, Information Withholding, FM-2.4): a Phone Agent fails to tell the Supervisor Agent the required username format for a login API; the Supervisor repeatedly submits malformed credentials and never asks for clarification, so the task fails on repeated invalid-login errors — a textbook case of information not surfaced between agents that should have been shared context [S3].

Related/cited work for context: benchmarks like **AI Agents That Matter** (Kapoor et al.) are cited by MAST as showing "how complexity can hinder practical adoption" in agentic systems generally [background reference via S3, not independently verified this pass — see Unverified].

### Coordination topologies and their communication model

- **Subagents / orchestrator-workers**: main agent calls subagents as tools; each call is (usually) stateless — subagent starts fresh, does its work in an isolated context window, returns a summary. Strong context isolation, cheap per-token-processed on wide fan-out, but no shared conversational memory between calls unless the parent explicitly re-passes it [S4, S8].
- **Handoffs**: a shared, persistent state variable (e.g. `current_step` / `active_agent`) is updated by tool calls; whichever agent/config is "active" talks to the user directly. Full conversation history persists and grows across handoffs — cheaper on repeat/stateful interactions, but sequential (no free parallelism) [S4, S5, S12].
- **Router**: one routing/classification step (can be LLM or code) selects among specialized agents/skills up front; results get synthesized. Stateless per turn (must re-route every time) but supports parallel invocation of multiple selected specialists [S4].
- **Skills**: single agent stays in control throughout, loading specialized context/knowledge on demand rather than switching agents; cheap in call count, but every subsequent call re-processes all previously-loaded skill context, so tokens accumulate [S4].
- **Group chat / Magentic**: a manager/orchestrator selects the next speaker each turn from a pool of participant agents publishing to a shared channel/topic; conversation is fully shared (all participants can, in principle, see the full transcript). AutoGen's implementation: agents publish `GroupChatMessage` to a shared topic, the manager issues `RequestToSpeak` to the chosen next agent, LLM-based speaker selection excludes the immediately-previous speaker for diversity, and a termination keyword (e.g. "APPROVE") ends the loop [S19]. Magentic (MS Agent Framework, descended from Magentic-One research) adds an explicit **task ledger** (facts, guesses, plan — outer loop) and **progress ledger** (current status, agent assignment, stall detection — inner loop), re-planning after repeated stalls [S6, S7].
- **A2A (network topology across process/vendor boundaries)**: agents discover each other via a published **Agent Card**, then communicate via **Task**/**Message**/**Artifact** objects over `sendMessage`/`sendMessageStream` — designed for autonomous, multi-turn, cross-vendor agent collaboration where each agent retains its own reasoning loop, as opposed to MCP's model-to-tool/data calls [S9].
- **Blackboard** (classical AI architecture pattern; agents post partial results/hypotheses to a shared data store that any agent can read/write, with a controller deciding which knowledge-source agent acts next) is structurally close to the group-chat/shared-state model above but decouples *who posts* from *who reads* even further — not independently sourced with a 2026 practitioner reference in this pass; flag as background pattern only [see Unverified].
- **Debate** (multiple agent instances independently answer, then critique/argue toward consensus or majority vote): closest measured 2026 treatment found is the scaling paper's note that diminishing-returns scaling "generalizes across interaction architectures like structured debate topologies" [S11] — treat numeric claims about debate specifically as from that single academic source, not vendor-validated.

### Verbatim code shapes

**OpenAI Agents SDK — basic handoff** [S12, VERBATIM]:
```python
from agents import Agent, handoff

billing_agent = Agent(name="Billing agent")
refund_agent = Agent(name="Refund agent")

triage_agent = Agent(name="Triage agent", handoffs=[billing_agent, handoff(refund_agent)])
```
Handoffs are exposed to the LLM as ordinary tools — a handoff to `Refund Agent` becomes the tool `transfer_to_refund_agent` [S12].

**LangChain — subagents pattern replacing `langgraph-supervisor`** [S4, VERBATIM]:
```python
from langchain.agents import create_agent
from langchain.tools import tool
from langgraph.checkpoint.memory import InMemorySaver

research_agent = create_agent(
    model=model,
    tools=[web_search],
    system_prompt="You are a research expert.",
)

math_agent = create_agent(
    model=model,
    tools=[add, multiply],
    system_prompt="You are a math expert.",
)


@tool("research_expert", description="Research expert for current events and web lookups.")
def call_research_agent(query: str) -> str:
    result = research_agent.invoke({"messages": [{"role": "user", "content": query}]})
    return result["messages"][-1].content


@tool("math_expert", description="Math expert for calculations.")
def call_math_agent(query: str) -> str:
    result = math_agent.invoke({"messages": [{"role": "user", "content": query}]})
    return result["messages"][-1].content


supervisor = create_agent(
    model=model,
    tools=[call_research_agent, call_math_agent],
    system_prompt=(
        "Route research questions to research_expert and math to math_expert."
    ),
    checkpointer=InMemorySaver(),
)
```
Interrupt propagation rule for nested subagents: compile **only the outermost graph** with a checkpointer; leave inner `create_agent` subagents without their own checkpointer so they inherit the parent's at runtime; always pass `thread_id` on the outer `invoke`/`stream_events` call [S4, VERBATIM rule].

**LangChain — handoff via `Command`** [S4, VERBATIM]:
```python
from langchain.tools import tool
from langchain.messages import ToolMessage
from langgraph.types import Command

@tool
def transfer_to_specialist(runtime) -> Command:
    """Transfer to the specialist agent."""
    return Command(
        update={
            "messages": [
                ToolMessage(
                    content="Transferred to specialist",
                    tool_call_id=runtime.tool_call_id
                )
            ],
            "current_step": "specialist"  # Triggers behavior change
        }
    )
```
Note in the docs: the `ToolMessage` with matching `tool_call_id` is required — without it the LLM's tool-call/response contract is violated and history becomes malformed [S4].

**Claude Agent SDK — subagent definition with tool restriction and model override** [S8, VERBATIM shape, Python]:
```python
agents={
    "code-reviewer": AgentDefinition(
        description="Expert code review specialist. Use for quality, security, and maintainability reviews.",
        prompt="""You are a code review specialist with expertise in security, performance, and best practices.
...
Be thorough but concise in your feedback.""",
        tools=["Read", "Grep", "Glob"],   # read-only: no Edit/Write/Bash
        model="sonnet",
    ),
    "test-runner": AgentDefinition(
        description="Runs and analyzes test suites. Use for test execution and coverage analysis.",
        prompt="You are a test execution specialist. ...",
        tools=["Bash", "Read", "Grep"],
    ),
}
```
Caps (env vars, TS SDK ≥ 0.3.219 / Python SDK ≥ 0.2.127): `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` (default 3), `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` (default 20), and `max_budget_usd`/`maxBudgetUsd` (no default limit) — at the concurrency limit Claude Code returns `Concurrent subagent limit reached` as the tool result rather than queuing silently; at the spend cap it stops background subagents and ends the query with `error_max_budget_usd` [S8, VERBATIM semantics].

**Anthropic cookbook — orchestrator-workers reference implementation** [S20, VERBATIM, from `anthropic-cookbook/patterns/agents/orchestrator_workers.ipynb`, current as of this fetch — notably pinned to `claude-sonnet-4-6`]:
```python
from util import extract_xml, llm_call

MODEL = "claude-sonnet-4-6"  # Fast, capable model for both orchestrator and workers

class FlexibleOrchestrator:
    """Break down tasks and run them in parallel using worker LLMs."""

    def __init__(self, orchestrator_prompt: str, worker_prompt: str, model: str = MODEL):
        self.orchestrator_prompt = orchestrator_prompt
        self.worker_prompt = worker_prompt
        self.model = model

    def process(self, task: str, context: dict | None = None) -> dict:
        """Process task by breaking it down and running subtasks in parallel."""
        ...
```
Task decomposition is passed between orchestrator and workers as a small XML schema (`<task><type>...</type><description>...</description></task>`), parsed with a simple line-scanner rather than a full XML parser [S20]. The same cookbook repository also ships `async_multi_agent_orchestration.ipynb` and `latency_multi_agent.ipynb` ("Multi-Agent Teams Under Latency Pressure and Budgets") as of this fetch — titles suggest Anthropic has since added cost/latency-budget-aware orchestration examples beyond the original 2024 blog post patterns [S20, title-only, not read in full this pass].

## Numbers

| Metric | Value | Condition | Source |
|---|---|---|---|
| Multi-agent vs single-agent performance | +90.2% | Claude Opus 4 lead + Sonnet 4 subagents vs. single Opus 4, Anthropic internal research eval | [S1] |
| Token multiplier, agents vs chat | ~4× | Anthropic, general agents vs. simple chat turns | [S1] |
| Token multiplier, multi-agent vs chat | ~15× | Anthropic, multi-agent systems vs. simple chat turns | [S1] |
| Variance explained by token usage alone | 80% | Anthropic, BrowseComp-style internal eval; token usage + tool-call count + model choice jointly explain ~95% | [S1] |
| Research time reduction from parallel tool calling | up to 90% | Anthropic, complex multi-step queries | [S1] |
| MAS task failure rate | 41%–86.7% | Across 7 SOTA open-source MAS frameworks, MAST paper | [S3] |
| System Design Issues share of failures | 44.2% | MAST, n=1,642 traces | [S3] |
| Inter-Agent Misalignment share | 32.3% | MAST, n=1,642 traces | [S3] |
| Task Verification share | 23.5% | MAST, n=1,642 traces | [S3] |
| Task success improvement from structural fix | +9.4% | ChatDev, giving CEO agent final say instead of requiring consensus, MAST case study | [S3] |
| LLM-as-judge / human agreement | Accuracy 0.94, κ=0.77 | MAST's o1 few-shot annotator vs. human expert labels, held-out IAA set | [S3] |
| Subagents pattern token cost, multi-domain task | ~9K tokens, 5 calls | LangChain composed example: 3-language comparison query, ~2K tokens of docs per domain | [S4] |
| Skills pattern token cost, same task | ~15K tokens, 3 calls | Same LangChain example — 67% more tokens than Subagents due to context accumulation | [S4] |
| Handoffs pattern token cost, same task | ~14K+ tokens, 7+ calls | Same example — sequential, can't parallelize across domains | [S4] |
| Repeat-request savings, stateful patterns | 40–50% fewer calls | LangChain: Handoffs/Skills vs. Subagents/Router on a repeated identical user request | [S4] |
| Default Claude Agent SDK subagent spawn depth | 3 layers | Claude Agent SDK / Claude Code default | [S8] |
| Default Claude Agent SDK concurrent subagents | 20 | Claude Agent SDK / Claude Code default | [S8] |

## Pitfalls, limits, criticism

- **Multiplied token cost is the default outcome, not an edge case** — 15× on Anthropic's own numbers [S1]. Any multi-agent proposal needs an explicit statement of why the task's value clears that bar.
- **Parallel subagents on interdependent/generative work produce silently incompatible outputs** (Cognition's Flappy Bird case) because none of them see the others' in-progress decisions — this is not a prompting bug, it's structural to the parallel-fan-out topology itself [S2].
- **MAST's core finding inverts a common assumption**: most failures are *system design* issues (unclear termination conditions, role violations, step repetition), not model capability limits — meaning better models alone will not fix a badly-designed multi-agent topology [S3].
- **Verification is the most neglected subsystem** (23.5% of failures, MAST) — teams build the collaboration/delegation machinery and skip building the "did this actually work" check [S3].
- **`langgraph-supervisor` is dead** — anyone following older (pre-2026) LangChain multi-agent tutorials or blog posts is building on a package the vendor itself says to migrate away from [S4].
- **Coding is explicitly called out by Anthropic as a poor fit** for their own orchestrator-workers architecture, because it needs shared context and tight interdependency between changes across files — the same domain Cognition's critique targets [S1, S2]. This is a rare case of the debate's two sides agreeing on a concrete example.
- **Claude Opus 5 delegates to subagents "more readily than earlier models"** [S8] — a model capability change can silently turn a bounded multi-agent design into an unbounded one; hence the SDK's newly-added depth/concurrency/spend caps rather than relying on prompted discipline.
- **Stateless subagent patterns pay a fixed cost on every repeat**: LangChain's own repeat-request benchmark shows Subagents cost the same 4 calls on turn 2 as turn 1 (8 total), vs. 2 calls for stateful Handoffs/Skills (5 total) — strong isolation has a recurring-request tax [S4].
- **HN practitioner pushback on Cognition's post** flagged that the "context compression" fix looks structurally like Erlang/OTP supervisors reinvented without the discipline (supervisors in OTP don't do work, delegate, or combine results — they only restart), i.e. that the industry may be re-discovering 1980s distributed-systems patterns without their guarantees [S18] — a claim worth treating as practitioner opinion, not a verified technical fact.

## What changed in the last 6 months (relative to 2026-09-30)

- LangChain's multi-agent taxonomy overhaul and the `langgraph-supervisor` deprecation — the field's default "how to pick a topology" reference now lives in vendor docs with measured model-call/token tables, not in a blog post [S4].
- Claude Agent SDK added **explicit depth/concurrency/spend caps** for subagents (requiring SDK versions bundling Claude Code ≥ v2.1.219) and a separate `Workflow` tool for large-scale (dozens-to-hundreds-of-agents) orchestration outside the turn-by-turn conversation loop — both framed as a direct response to Opus 5's higher delegation propensity [S8].
- Microsoft Agent Framework (Oct 2025) consolidated AutoGen + Semantic Kernel into one framework with durable execution (checkpoint/pause/resume/retry) as a built-in orchestration feature, not an add-on [S6].
- A2A protocol governance moved to the Agentic AI Foundation (27 Aug 2026), signaling vendor-neutral standardization pressure specifically for cross-vendor agent-to-agent (not agent-to-tool) communication [S9].
- Google ADK's docs reorganization folded "multi-agent systems" into a broader "workflows" section, blurring the line between deterministic workflow orchestration and agentic multi-agent delegation in the vendor's own information architecture [S13].
- Academic scaling-law work (May 2026) gave the first systematic "how many agents" answer: diminishing, non-monotonic returns driven by coordination overhead, generalizing across debate-style topologies too [S11] — the first quantitative counter to "just add more agents" as of this research pass.

## Diagram candidates

1. **Orchestrator-workers (Anthropic research system)** — actors: User, Lead Agent (orchestrator), N Subagents (parallel), Citation/synthesis step. Arrows: User→Lead ("query"), Lead→Subagent×N ("task spec: objective, format, tool guidance, boundaries", fired concurrently), Subagent→tools (search loop, looped arrow), Subagent→Lead ("findings summary"), Lead→User ("synthesized answer, if enough evidence" / else loop back to spawn more subagents). States: Planning → Parallel Research → Synthesis → (Sufficient? loop / Done). [S1]
2. **Cognition's context-engineering single-thread model vs. failure mode** — two side-by-side diagrams: (a) single-threaded agent, one continuous context arrow through Steps 1→2→3→N, each step reading all prior decisions; (b) parallel-subagent failure case, two subagents branching from one context snapshot, each unaware of the other's output, merging into a conflicting final artifact (the Flappy-Bird-background-vs-bird mismatch). [S2]
3. **MAST taxonomy tree** — root "MAS Failure", 3 category branches (System Design Issues 44.2%, Inter-Agent Misalignment 32.3%, Task Verification 23.5%), each branching into its named failure modes with prevalence percentages as edge labels; conversation-stage bands (Pre-Execution / Execution / Post-Execution) as a horizontal axis the tree overlays onto, per the paper's own Figure 1 layout. [S3]
4. **LangChain's 5-pattern comparison** — a 2x2-ish grid or radar chart: axes = Distributed development, Parallelization, Multi-hop, Direct user interaction; one shape per pattern (Subagents, Handoffs, Skills, Router), star-rated per the docs table. [S4]
5. **Handoffs state machine** — states = conversation steps/agent identities (e.g. Triage → Warranty-check → Specialist → Resolution), each state box lists its active tools/system prompt, arrows are tool-call-triggered `Command(update=...)` transitions, labeled with the triggering tool name. [S4]
6. **Claude Agent SDK subagent spawn tree with caps** — root = main agent, children = subagents up to `MAX_SUBAGENT_SPAWN_DEPTH` layers, a horizontal capacity bar showing `MAX_CONCURRENT_SUBAGENTS` slots filling/refusing, and a budget gauge (`max_budget_usd`) draining as subagent calls accrue cost; annotate the refusal message ("Concurrent subagent limit reached") at the point a new spawn is denied. [S8]
7. **Magentic-One dual-loop orchestrator** — Orchestrator box containing two nested loops: outer "Task Ledger" loop (facts / guesses / plan, re-plan trigger), inner "Progress Ledger" loop (status, agent assignment, stall counter); arrows out to WebSurfer/FileSurfer/Coder/ComputerTerminal agent boxes and back. [S7]
8. **Group chat / Magentic turn-taking** — Manager/Orchestrator at center, participant agents around it publishing `GroupChatMessage` to a shared topic (draw as a bus/ring), Manager issuing `RequestToSpeak` to exactly one agent per turn, with a "previous speaker excluded" rule annotated and an "APPROVE"-triggered termination arrow out. [S19]
9. **A2A cross-agent call sequence** — two boxes (Agent A "client", Agent B "remote"), sequence: A fetches B's Agent Card (`/.well-known/agent-card`) → A sends `Message` via `sendMessage`/`sendMessageStream` → B creates a `Task` (status states: submitted → working → completed/failed) → B streams back `Artifact` chunks → A assembles final result. [S9]
10. **Coordination-cost spectrum chart** — x-axis: "context isolation" (Subagents/stateless, far right) to "shared full trace" (single-threaded agent, far left); y-axis two series: token cost per repeat request, and resistance-to-conflicting-decisions; annotate where Handoffs/Skills/Router/Group-chat fall. [Composed from S2 + S4, mark COMPOSED]
11. **Scaling-returns chart candidate** — x-axis: number of agents in a homogeneous MAS; y-axis: task performance; curve shape: rises then plateaus/declines (diminishing returns), with a second curve for "coordination overhead" rising monotonically — real shape claimed by the paper's abstract, exact data values not extracted in this pass (see Unverified). [S11]
12. **Failure-rate bar chart candidate** — 7 frameworks (ChatDev, MetaGPT, HyperAgent, AG2, Magentic-One, OpenManus, AppWorld-bench runs) on x-axis, task failure rate (41%–86.7% range) on y-axis — exact per-framework values are in MAST's Appendix B, not extracted in this pass (see Unverified). [S3]

## Glossary

- **Orchestrator-workers**: a central LLM dynamically decomposes a task and delegates to worker LLMs whose subtasks were not pre-defined, then synthesizes results [S17].
- **Handoff**: a tool call that transfers active control (and/or configuration: prompt, tool set) from one agent/state to another; term coined by OpenAI [S12].
- **Supervisor pattern**: an orchestrator agent routes to and synthesizes from worker agents exposed to it as tools; in 2026 LangChain terminology this is subsumed under "Subagents" [S4].
- **Swarm / network topology**: peer agents that can hand off to any other peer rather than always returning to a central supervisor (contrast with strict hierarchical supervisor-worker).
- **Group chat**: multiple agents share one conversation; a manager selects the next speaker each turn [S19].
- **Magentic orchestration**: group-chat-like pattern where a manager agent maintains an explicit task ledger and progress ledger and re-plans on detected stalls [S6, S7].
- **Blackboard architecture**: agents read/write partial results to a shared data store; a controller decides which knowledge source acts next (classical AI pattern, not independently re-verified for 2026 usage in this pass).
- **Debate**: multiple agent instances independently generate answers, then critique each other's reasoning toward consensus or majority vote.
- **Context engineering**: deciding what information each agent/step sees, as opposed to prompt engineering (deciding what an LLM is told); central design axis for multi-agent per both LangChain and Cognition [S2, S4].
- **MAST**: Multi-Agent System failure Taxonomy — 14 failure modes in 3 categories, derived via Grounded Theory from real MAS execution traces [S3].
- **Agent Card (A2A)**: a discoverable manifest of an agent's capabilities and security requirements, published at a well-known endpoint [S9].
- **Durable execution**: crash-proof, resumable multi-step compute — a process can be paused/killed and resumed from its last completed step rather than restarting [S10].
- **Rainbow deployment**: gradually shifting live traffic from an old to a new service version so already-running agent sessions are never abruptly killed by a deploy [S1].

## Unverified / open questions

- Could not identify a specific **Google-branded** paper matching the editor's "Google research on scaling agent systems and its quantitative findings" lead. The closest quantitative 2026 scaling-law work found is "Scaling Behavior of Single LLM-Driven Multi-Agent Systems" (Li, Gu, Cai, Feng, arXiv 2026-05-30) — authors do not appear Google-affiliated based on the fetched abstract; flagging as a possible mismatch or a source not yet indexed by arXiv's API under the terms tried. Tried: arXiv API queries for "multi-agent"+"scaling"/"scaling law"/"Chain of Agents"/"agent count"+"performance", all via `export.arxiv.org` (had to retry with `https` + redirect after an `http` 301 loop).
- **AI Agents That Matter** (Kapoor et al.) is cited by MAST as related work on complexity hindering agentic adoption, but I did not independently open and verify this paper's own claims in this pass — treat the MAST paper's characterization of it as secondhand until verified.
- **Blackboard** and **debate** pattern definitions in this note are composed from general/classical AI-architecture knowledge and one incidental 2026 arXiv abstract mention, respectively — I could not find a 2026 vendor engineering post or practitioner writeup specifically treating either pattern with the same rigor as handoffs/subagents/group-chat. Flag both as thinner-sourced than the rest of the Mechanics section.
- Exact per-framework failure-rate values behind MAST's headline "41%–86.7%" range live in the paper's Appendix B (Figure 5), which I did not open in this pass (only read pages 1–6 of the PDF) — the range itself is VERBATIM from the abstract/intro, but the breakdown by individual framework is not verified here.
- Could not fetch Eugene Yan's agentic-patterns post (404 on the guessed URL) or Drew Breunig's June 2025 multi-agent post (404) in the time available — dropped rather than guessed; a follow-up pass should find the correct current URLs before citing either.
- LangGraph's own current canonical docs page for "multi-agent concepts" (the pre-2026 `concepts/multi_agent/` URL) now 404s / redirects into the new docs.langchain.com structure; I worked from the new `/oss/python/langchain/multi-agent/*` pages instead, which appear to be the intended replacement, but I did not find an explicit statement that this fully supersedes the old conceptual page (as opposed to just being a reorganization).
- Microsoft Agent Framework's per-pattern documentation pages (e.g. a dedicated "Magentic orchestration" reference) returned 404 on every guessed URL; the pattern list and durable-execution claims are sourced only from the October 2025 announcement blog post, not from reference docs — a follow-up pass should locate the current `learn.microsoft.com/agent-framework` doc tree.
- Did not verify current Mastra multi-agent documentation (guessed URL 404'd) — chapter notes omit Mastra's coordination model as a result; flagged as a gap versus the editor's framework list.
- This session's `WebSearch` tool exhausted its budget (200/200) almost immediately, before most of this chapter's research — the source list below leans more heavily on WebFetch of guessed/known URLs and raw `curl` (GitHub raw, arXiv API, HN Algolia API) than a normal research pass would; some frameworks (Mastra, Google's alleged scaling paper) could plausibly have been found with a proper search and were not.

## Sources

- [S1] "How we built our multi-agent research system." Anthropic (Jeremy Hadfield, Barry Zhang, Kenneth Lien, Florian Scholz, Jeremy Fox, Daniel Ford). Published 2025-06-13. https://www.anthropic.com/engineering/multi-agent-research-system — accessed 2026-09-30.
- [S2] "Don't Build Multi-Agents." Cognition AI (Walden Yan). Published 2025-06-12. https://cognition.ai/blog/dont-build-multi-agents (redirects to https://cognition.com/blog/dont-build-multi-agents) — accessed 2026-09-30.
- [S3] "Why Do Multi-Agent LLM Systems Fail?" Mert Cemri, Melissa Z. Pan, Shuyi Yang, Lakshya A Agrawal, Bhavya Chopra, Rishabh Tiwari, Kurt Keutzer, Aditya Parameswaran, Dan Klein, Kannan Ramchandran, Matei Zaharia, Joseph E. Gonzalez, Ion Stoica (UC Berkeley, Intesa Sanpaolo). arXiv:2503.13657, submitted 2025-03-17, this revision 2025-10-26; NeurIPS 2025 Datasets & Benchmarks track. https://arxiv.org/abs/2503.13657 / PDF https://arxiv.org/pdf/2503.13657 — accessed 2026-09-30.
- [S4] "Multi-agent" + "Migrate from langgraph-supervisor" + "Handoffs" + "Subagents" docs. LangChain. Undated (current docs, 2026). https://docs.langchain.com/oss/python/langchain/multi-agent/index.md, https://docs.langchain.com/oss/python/migrate/langgraph-supervisor.md, https://docs.langchain.com/oss/python/langchain/multi-agent/handoffs.md — accessed 2026-09-30.
- [S5] OpenAI Agents SDK multi-agent orchestration docs. OpenAI. Undated (current docs). https://openai.github.io/openai-agents-python/multi_agent/ — accessed 2026-09-30.
- [S6] "Introducing Microsoft Agent Framework: the open-source engine for agentic AI apps." Microsoft (Foundry Blog / devblogs). Published 2025-10-01. https://devblogs.microsoft.com/foundry/introducing-microsoft-agent-framework-the-open-source-engine-for-agentic-ai-apps/ — accessed 2026-09-30.
- [S7] "Magentic-One: A Generalist Multi-Agent System for Solving Complex Tasks." Microsoft Research. Published 2024-11-04. https://www.microsoft.com/en-us/research/blog/magentic-one-a-generalist-multi-agent-system-for-solving-complex-tasks/ — accessed 2026-09-30.
- [S8] "Subagents in the SDK." Claude Agent SDK docs, Anthropic. Undated (current docs, references Claude Code v2.1.246, Opus 5). https://code.claude.com/docs/en/agent-sdk/subagents (originally requested via https://docs.claude.com/en/api/agent-sdk/subagents, redirected) — accessed 2026-09-30.
- [S9] A2A protocol documentation ("What is A2A", governance/announcement pages). a2a-protocol.org. Governance transfer to Agentic AI Foundation dated 2026-08-27 per site's blog archive; docs undated. https://a2a-protocol.org/latest/topics/what-is-a2a/ — accessed 2026-09-30.
- [S10] "What is Durable Execution." Temporal. Published 2025-05-06. https://temporal.io/blog/what-is-durable-execution — accessed 2026-09-30.
- [S11] "Scaling Behavior of Single LLM-Driven Multi-Agent Systems." Jialing Li, Zhouhong Gu, Yin Cai, Hongwei Feng. arXiv, posted 2026-05-30. https://export.arxiv.org/api/query (abstract retrieved via arXiv API) — accessed 2026-09-30.
- [S12] "Handoffs." OpenAI Agents SDK docs (raw). Undated. https://raw.githubusercontent.com/openai/openai-agents-python/main/docs/handoffs.md — accessed 2026-09-30.
- [S13] Google ADK workflows/multi-agent documentation. google.github.io/adk-docs (redirects to adk.dev). Undated (2026 reorganized docs). https://adk.dev/workflows/ — accessed 2026-09-30.
- [S14] "Multi-agent Applications." Pydantic AI docs. Undated (current docs, redirected from ai.pydantic.dev). https://pydantic.dev/docs/ai/guides/multi-agent-applications/ — accessed 2026-09-30.
- [S15] "Teams." Agno docs. Undated (current docs). https://docs.agno.com/teams/introduction — accessed 2026-09-30.
- [S16] "Flows." CrewAI docs. Undated (current docs). https://docs.crewai.com/concepts/flows — accessed 2026-09-30.
- [S17] "Building Effective Agents." Anthropic (Erik Schluntz, Barry Zhang). Published 2024-12-19. https://www.anthropic.com/research/building-effective-agents — accessed 2026-09-30.
- [S18] "Don't Build Multi-Agents" Hacker News discussion thread. Hacker News (submitted by community, 123 points, 89 comments). Thread created 2025-09-01 (resharing a 2025-06-12 post). https://news.ycombinator.com/item?id=45096962 (fetched via HN Algolia API) — accessed 2026-09-30.
- [S19] AutoGen "Group Chat" design pattern documentation. Microsoft. Undated. https://microsoft.github.io/autogen/stable/user-guide/core-user-guide/design-patterns/group-chat.html — accessed 2026-09-30.
- [S20] Anthropic Cookbook, `patterns/agents/` (README + `orchestrator_workers.ipynb`). Anthropic (reference implementation for S17). Undated, current repo state. https://raw.githubusercontent.com/anthropics/anthropic-cookbook/main/patterns/agents/README.md, https://raw.githubusercontent.com/anthropics/anthropic-cookbook/main/patterns/agents/orchestrator_workers.ipynb — accessed 2026-09-30.
