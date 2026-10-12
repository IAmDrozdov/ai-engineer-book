# 13. Мультиагентные системы — gaps, contradictions and corrections notes

Lens: completeness critic and gap-filler over `spec.md`, `practice.md`, `field.md` (same folder). Source ids here use the prefix **G** (G1…G53) so they never collide with the S-ids of the other three files. Everything below was re-read from primary sources on 2026-09-30. Note on method: the WebSearch tool was out of budget for this session too, so discovery ran through arXiv API, PyPI/npm/GitHub APIs, HN Algolia, `llms.txt` indexes, site blog listings/sitemaps, and raw `.md` versions of doc pages (curl), plus WebFetch for one page.

## Contradictions resolved

- **C1. MAST category shares (spec: 41.77 / 36.94 / 21.30; practice & field: 44.2 / 32.3 / 23.5).** Both are real, from different arXiv versions of the same paper. v1 (2025-03-17): 151 traces, categories "Specification & System Design 37.17% / Inter-Agent Misalignment 31.41% / Task Verification & Termination 31.41%". v2 (2025-04-22): 41.77% / 36.94% / 21.30%. v3 (2025-10-26, the NeurIPS 2025 D&B camera-ready): 1,642 traces, **System Design Issues 44.2% / Inter-Agent Misalignment 32.3% / Task Verification 23.5%** [G4]. **Use v3.** spec.md mixed v2 category shares with v3 per-mode percentages.
- **C2. MAST FM-2.4 Information Withholding: 0.80% vs 0.85%.** Both numbers appear in v3: Figure 1 prints "(0.80%)", while the FC2 section text says "withholding crucial information (FM-2.4, 0.85%)" [G4]. This is an inconsistency inside the paper. Cite one value and name the location.
- **C3. MAST affiliation.** spec.md: "Berkeley/Google/Meta collaboration". Wrong. The v3 title page lists **UC Berkeley** (all authors but one) and **Intesa Sanpaolo** (Shuyi Yang) [G4]. practice.md and field.md are right.
- **C4. What the MAST "+9.4%" measured.** spec.md attributes +9.4% to the CEO/CPO fix and bundles it with a cyclic-graph topology change. practice.md calls it a "structural fix beats prompt patching". v3 text: "improving agent role specifications alone yields a +9.4% success rate increase for ChatDev with the same user prompt and LLM (GPT-4o)", and in the intro "a straightforward system workflow adjustment ensuring the CEO had the final say contributed to a +9.4% increase". Separately, "adding a high-level task objective verification step to ChatDev yields a **+15.6%** improvement in task success on ProgramDev" [G4]. v1 reported "+14%" for its interventions [G4]. **Correct:** +9.4% = role-specification fix (CEO has the final say), ChatDev, GPT-4o. +15.6% = added high-level verification step, ProgramDev. Both are percentage-point gains on small task sets.
- **C5. The 7 MAST frameworks.** spec.md could not name the 7th, and practice.md added "Manus". v3 Table 1: **ChatDev, MetaGPT (ProgramDev), HyperAgent (SWE-Bench Lite), AppWorld (Test-C), AG2/MathChat (GSM-Plus), Magentic-One (GAIA), OpenManus (ProgramDev)** [G4]. Figure 5 failure rates, GPT-4o/Claude-3.7-Sonnet: HyperAgent 74.7%, AppWorld 86.7%, AG2 (OlympiadBench) 41.0%, Magentic-One (GAIA) 62.0%, among others. The benchmarks differ, so the systems cannot be compared with each other [G4].
- **C6. "Google research on scaling agent systems" (reported as not found in all three files).** It exists. It is **Kim et al., "Towards a Science of Scaling Agent Systems", arXiv:2512.08296**. Affiliations: Google Research, Google DeepMind, MIT. v1 2025-12-09, v2 2025-12-17, v3 2026-04-08 [G1]. Google Research blog: "Towards a science of scaling agent systems: When and why agent systems work", 2026-01-28, by Yubin Kim and Xin Liu [G2]. Full mechanics are below. The Li/Gu/Cai/Feng paper that practice.md used in its place [G49] is unrelated. It is non-Google and studies homogeneous sequential MAS.
- **C7. Date A2A joined the Agentic AI Foundation (all three files: 2026-08-27).** The AAIF announcement is dated **2026-08-17** [G21], with press coverage on 2026-08-18 [G23]. The a2a-protocol.org blog post "A new chapter for A2A: joining the Agentic AI Foundation" has the URL path `/blog/2026/08/27/` [G22]. **Correct statement:** announced by AAIF on 17 Aug 2026; the project's own blog post followed on 27 Aug 2026.
- **C8. Microsoft Agent Framework "Harness" (field.md: released Jul 23, 2026, a "durable, production runtime layer").** The devblog is dated **July 22nd, 2026**. It describes a **single-agent harness**: compaction, todo plus plan/execute modes, file memory, approvals, web search, and telemetry via `create_harness_agent` / `HarnessAgent`. It is not a multi-agent durable runtime [G33]. field.md and practice.md also both missed that **Agent Framework 1.0 went GA on 2026-04-02** (PyPI `agent-framework` 1.0.0) [G38], and that **AutoGen is officially in maintenance mode** [G34].
- **C9. "Parallel tool calling cut research time by up to 90%" (spec, practice).** Anthropic attributes the 90% cut to **two** parallelizations together: "(1) the lead agent spins up 3-5 subagents in parallel rather than serially; (2) the subagents use 3+ tools in parallel. These changes cut research time by up to 90% for complex queries" [G10].
- **C10. LangChain "Subagents use ~67% fewer tokens than Skills" (practice TL;DR) vs "Skills 67% more" (practice Numbers).** The LangChain doc itself says "Subagents processes 67% fewer tokens overall" for ~9K vs ~15K tokens [G27]. The arithmetic gives **40% fewer** (or Skills uses **67% more**). The vendor text is wrong. Cite the raw token counts, not the percentage.
- **C11. Anthropic's "Building effective agents" banner (field: "tooling … is dead", patterns "stale").** Verbatim banner: "Note: Much of the tooling landscape described in this post has changed since December 2024. For our current approach, see how we built Claude Managed Agents and the Managed Agents documentation." [G11]. It flags the **tooling**. The workflow/agent definitions and the five patterns are not withdrawn. Anthropic's 2026 posts still build on them [G5][G6].
- **C12. "Claude Code subagents are read-only, synchronous, never parallel" (spec/practice via Cognition 2025).** That was true "as of June 2025" [G8]. The current docs say the opposite. Subagents **run in the background by default** (v2.1.198+). **Fork mode is on by default in interactive sessions**. Subagents can nest **3 levels** and run **20 concurrently**, can edit code in an `isolation: worktree` checkout, and can message named siblings via `SendMessage` (sibling roster, v2.1.206+) [G12]. Cognition itself revised its position in Apr 2026 [G7].
- **C13. Subagent model precedence.** All three files agree for Claude Code: per-call `model` → definition `model` → `CLAUDE_CODE_SUBAGENT_MODEL` → main model. Two details were missing. `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` (v2.1.257+) makes the env var win. For agent-team teammates, "Before v2.1.251, `CLAUDE_CODE_SUBAGENT_MODEL` came first in this order" [G13]. Anthropic's cost post states: "A model named in a subagent's definition overrides the variable" [G19].
- **C14. Magentic-One replanning trigger (practice: "re-plans after 2+ stalled steps").** Paper: the stall counter increments on a loop or no progress, and "as long as this counter remains below a threshold (≤ 2 in our experiments)" the orchestrator continues. Beyond that it re-plans [G36]. In MS Agent Framework this is the tunable `max_stall_count` (the docs example uses 3) plus `max_reset_count` [G35].
- **C15. "Handoff — term coined by OpenAI" (practice glossary).** No source in any file supports "coined". OpenAI Swarm (2024) popularized it, and the Agents SDK exposes it as a primitive [G24][G26]. Say "popularized by OpenAI Swarm / Agents SDK", not "coined".
- **C16. Token multipliers: "15×" vs "3–10×".** They use different baselines, and both are Anthropic numbers. 2025-06-13: agents ≈4× **chat** tokens, multi-agent ≈15× **chat** tokens [G10]. 2026-01-23: "multi-agent implementations typically use 3-10x more tokens than **single-agent** approaches for equivalent tasks" [G5]. 15×/4× ≈ 3.75× vs a single agent, which is consistent with 3–10×.
- **C17. `langgraph-supervisor` "deprecated".** The wording in the sources is softer. The migration guide says: "The `langgraph-supervisor` package is no longer actively maintained. Instead use the subagents pattern" [G28]. The README: "We now recommend using the supervisor pattern directly via tools rather than this library for most use cases… We're making this library compatible with LangChain 1.0 to help users upgrade" [G28]. Last PyPI releases: langgraph-supervisor 0.0.31 (2025-11-19), langgraph-swarm 0.1.0 (2025-12-04) [G38].
- **C18. Google ADK 2.0 "supersedes template workflows" (spec).** ADK 2.0 GA dates: **Python 2026-05-19, Go 2026-06-30, TypeScript 2026-08-21**. It is "designed to be compatible with agents developed with ADK 1.x releases", with listed breaking changes: `BaseAgent`→`BaseNode`, and new `node_info`/`output` Event fields. It introduces the **Workflow Runtime** ("transitioning ADK from a hierarchical agent executor to a graph-based execution engine") [G29]. Template (Sequential/Parallel/Loop) agents remain documented [G29][G30].

## Claims most likely to be wrong (with corrections)

1. **"Multi-agent systems use 15× more tokens than a single agent."** → Wrong baseline. 15× is vs **chat**, and a single agent is ≈4× chat [G10]. Anthropic's 2026 number vs a single agent is **3–10×** [G5]. Google's controlled study (matched budget) reports coordination overhead of 58% (Independent), 263% (Decentralized), 285% (Centralized), 515% (Hybrid) in turns/tokens relative to a single agent [G1].
2. **"Multi-agent beats single-agent by 90%."** → One internal Anthropic research eval, Opus 4 lead + Sonnet 4 subagents vs single Opus 4, on breadth-first queries. It is not a public benchmark [G10]. Google's controlled study over 6 benchmarks ranges from **+80.8% (Finance-Agent, Centralized) to −70.0% (PlanCraft)**, and all MAS variants slightly degrade SWE-bench Verified (−2% to −15%) [G1].
3. **MAST shares quoted as 41.77/36.94/21.30** (or v1's 37/31/31). → The canonical v3/NeurIPS numbers are 44.2% / 32.3% / 23.5% over 1,642 traces [G4].
4. **"MAST: changing ChatDev's topology gave +9.4%."** → +9.4% came from a **role-specification** fix (CEO has the final say, GPT-4o). **+15.6%** came from adding a high-level verification step. v1 said "+14%" [G4].
5. **Google scaling numbers mixed across versions.** v1/blog: 180 configs, 4 benchmarks, CV R²=0.513, "+80.9%", "−39 to −70%", capability ceiling β=−0.408 [G1 v1][G2]. **v3 (2026-04-08):** 260 configs, 6 benchmarks (SWE-bench Verified and Terminal-Bench added), 3 LLM families, CV R²=0.373 (0.413 with a task-grounded capability metric), +80.8% / −70.0%, ceiling β=−0.236 (p=0.004). The ~45% single-agent threshold and the 17.2× vs 4.4× error amplification are unchanged. The "87% of held-out configurations" claim is also unchanged [G1]. Name the version you cite.
6. **"More agents → better (a collaborative scaling law)."** → MacNet (2024) reported logistic growth with agent count on its DAG setups [G48]. Google's matched-budget study found the opposite regime. Reasoning turns grow as a power law in agent count, T = 2.72·(n+0.5)^1.724, and "per-agent reasoning capacity becomes prohibitively thin beyond 3–4 agents" [G1]. The Li et al. paper also finds diminishing, non-monotonic returns [G49].
7. **"Use `langgraph-supervisor` / `langgraph-swarm` for LangGraph multi-agent."** → Not recommended. Use tool-wrapped subagents via `create_agent` (LangChain 1.x; langchain 1.4.3 / langgraph 1.2.12 as of 2026-09) [G27][G28][G38].
8. **"AutoGen is Microsoft's multi-agent framework."** → AutoGen is in **maintenance mode**: "will not receive new features… New users should start with Microsoft Agent Framework" [G34]. MAF 1.0 GA was 2026-04-02 (1.19.0 on 2026-09-18) [G38]. **AG2** (ag2ai/ag2, 1.0 on 2026-07-27) is a separate community project. Do not conflate it with Microsoft AutoGen [G38].
9. **"OpenAI Swarm" as a current library / "the receiving agent in a handoff sees only a summary".** → Swarm "is now replaced by the OpenAI Agents SDK" [G26]. By default, "the new agent takes over the conversation, and gets to see the entire previous conversation history". Nested/summarized handoff history (`nest_handoff_history`) "is available as an opt-in beta and is disabled by default" [G24]. SDK current version: 0.22.3 (2026-09-17) [G38].
10. **"Claude Code subagents are read-only, synchronous and can't nest."** → Background by default. Fork mode is on by default in interactive sessions. Nesting depth defaults to 3, concurrency to 20 (`Concurrent subagent limit reached`). `isolation: worktree` for writes. `SendMessage` between named agents [G12][G15]. Cognition's 2025 description is dated "As of June 2025" [G8].
11. **"Agent teams work in the Agent SDK / headless / CI."** → "Spawning teammates also requires an interactive session. In non-interactive mode with the `-p` flag, including Agent SDK sessions, Claude doesn't spawn teammates". The feature is still **experimental, off by default** (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) [G13]. For programmatic scale the answer is **dynamic workflows** (`Workflow` tool, TS SDK ≥ v0.3.149) [G14][G15].
12. **"A2A is Google's protocol" / "A2A 1.0 is the draft of 2025".** → Launched by Google Apr 2025 and donated to the Linux Foundation. IBM's ACP merged into it Aug 2025. **v1.0.0 released 2026-03-12** (GitHub release; the first stable spec, adding signed Agent Cards, multi-tenancy and version negotiation), **v1.0.1 2026-05-26/28**. It joined **AAIF** as a hosted project on 17 Aug 2026 [G20][G21].
13. **"Multi-agent debate improves reasoning."** → Controlled re-evaluations: "Majority Voting alone accounts for most of the performance gains typically attributed to MAD", and debate alone induces a martingale over beliefs [G42]. "MAD often fail to outperform simple single-agent baselines such as Chain-of-Thought and Self-Consistency, even when consuming significantly more inference-time computation". Model heterogeneity is the one consistent improver [G43]. The original positive result is Du et al. 2023 [G44].
14. **"OpenTelemetry has a standard for agent/multi-agent traces."** → `create_agent` / `invoke_agent` / `invoke_workflow` / `execute_tool` spans and `gen_ai.agent.*`, `gen_ai.workflow.name`, `gen_ai.conversation.id` are all **Development** status. They live in the separate `open-telemetry/semantic-conventions-genai` repo (created 2026-05-05) [G39].
15. **"Parallel subagents make the system faster."** → Anthropic 2026: "multi-agent systems often take longer overall than single-agent systems because of the sheer increase in total computation… The primary benefit of parallelization is thoroughness, not speed." [G5]. The 90% time cut in the 2025 research system came from parallelizing both subagents and tool calls, relative to the team's own earlier sequential agent [G10].

## TL;DR (what the other three files miss or get wrong)

- The "Google scaling" study exists and is the most quantitative topology-selection evidence available. It covers 5 architectures (SAS, Independent, Centralized, Decentralized, Hybrid) × 6 benchmarks × 3 model families, with matched ~4,800 reasoning tokens per trial. Its findings: a capability ceiling around 45% single-agent success, error amplification of 17.2× (Independent) vs 4.4× (Centralized), and task-dependent deltas from +80.8% to −70.0% [G1].
- Anthropic published a two-part design guide that none of the files used. **"When and how to use them" (2026-01-23)** gives three positive cases (context protection, parallelization, specialization), 3–10× tokens vs single agent, "context-centric decomposition", and the verification subagent [G5]. **"Multi-agent coordination patterns" (2026-04-10)** covers generator-verifier, orchestrator-subagent, agent teams, message bus, and **shared state** (the blackboard pattern), each with failure modes [G6].
- Cognition revised its position on 2026-04-22 ("Multi-Agents: What's Actually Working"). The claim now is that multi-agent works "when writes stay single-threaded and the additional agents contribute intelligence rather than actions". It describes clean-context reviewer loops, a "smart friend" escalation model, and manager Devins spawning child Devins. It calls unstructured swarms "mostly a distraction" [G7].
- Anthropic's **Managed Agents multiagent orchestration** (beta `managed-agents-2026-04-01`) is a first-class hosted coordinator API: `multiagent: {type: "coordinator", agents: [...]}`, one delegation level, ≤20 roster agents, ≤25 concurrent threads, persistent threads, and thread events on the session stream. Agents **share sandbox, filesystem and vault credentials**, but not tools, MCP servers or context [G17].
- The "smart friend"/advisor pattern is now an API primitive. It is the Messages API `advisor_20260301` tool (beta `advisor-tool-2026-03-01`), and a roster entry `{"type":"advisor","model":…}` in Managed Agents [G18][G17].
- Claude Code has **four** multi-agent surfaces, distinguished by "who holds the plan": subagents (Claude, turn by turn), skills, agent teams (the lead), and **dynamic workflows** (a JS script; `agent()`/`parallel()`/`pipeline()`/`phase()`; up to 16 concurrent agents by default; ≤4,096 items per call; deterministic replay). A `Large workflow` warning appears at more than 25 agents or more than 1.5M projected tokens [G14].
- Debate and blackboard are no longer "unverified". Debate has negative controlled evidence [G42][G43]. Blackboard has a 2025 Google-coauthored paper (+13–57% relative end-to-end success on data-discovery benchmarks) [G46] and Anthropic's "shared state" pattern [G6]. Claude Code agent teams document a "competing hypotheses" debate recipe [G13].
- Failure attribution is an open research problem. On Who&When (127 MAS), the best method identifies the responsible agent 53.5% of the time and the decisive step 14.2% of the time [G45]. MAST ships an annotator as `pip install agentdash` [G4].
- Multi-agent security incidents belong in chapter 16, with cross-links from here: A2A "agent session smuggling" (Unit 42, 2025-10-31) [G50], and ServiceNow Now Assist second-order prompt injection via default-on agent-to-agent discovery (AppOmni, 2025-11-19) [G51]. Claude Code added **subagent output scanning** for instruction-shaped patterns in v2.1.210 [G12].
- Durable execution became a built-in feature of most frameworks in 2026. Pydantic AI supports 8 engines (Temporal, DBOS, Prefect, Restate, AWS Lambda…) [G31]. Agno 3.0 (2026-08-24) adds a durable background queue [G32]. The Temporal AI cookbook has an ADK multi-agent recipe [G40]. OpenAI Agents SDK 0.20 added durable pending input to `RunState` [G25]. Claude Code workflows resume after a pause by replaying deterministically [G14].
- Framework state as of 2026-09-30: LangGraph 1.2.12, LangChain 1.4.3, deepagents 0.7.20, CrewAI 1.15.23, OpenAI Agents 0.22.3, google-adk 2.10.0, pydantic-ai 2.52.0 (2.0 on 2026-06-23), agno 3.0.11, agent-framework 1.19.0, claude-agent-sdk (Py) 0.2.162, @mastra/core 1.72.0 (1.0 on 2026-01-20) [G38].

## Current state and versions (as of 2026-09-30)

| Item | State | Source |
|---|---|---|
| Kim et al. scaling paper | v3 2026-04-08 (v1 2025-12-09, v2 2025-12-17); Google Research blog 2026-01-28 | [G1][G2] |
| MAST | v3 2025-10-26 = NeurIPS 2025 D&B; dataset `mcemri/MAST-Data`; annotator `pip install agentdash` | [G4] |
| Anthropic multi-agent guides | "When and how" 2026-01-23; "Coordination patterns" 2026-04-10; "Patterns and problems in emerging multiagent systems" 2026-08-13 | [G5][G6][G9] |
| Cognition | "Don't Build Multi-Agents" 2025-06-12 → "Multi-Agents: What's Actually Working" 2026-04-22 | [G8][G7] |
| Claude Code subagents | background default (v2.1.198+), fork mode default interactive, depth 3, concurrency 20, `SendMessage` roster (v2.1.206+), output scanning (v2.1.210+), `/subtask` (v2.1.212+) | [G12] |
| Claude Code agent teams | experimental, off by default; interactive only; mailbox JSON files; file-locked task claiming | [G13] |
| Claude Code dynamic workflows | GA on paid plans, also Bedrock / Google Cloud Agent Platform / Foundry; `/deep-research` bundled; 16 concurrent agents default (`CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS` 1–256, v2.1.269+) | [G14] |
| Claude Agent SDK | depth/concurrency/spend caps need TS ≥0.3.219 / Py ≥0.2.127; `Workflow` tool TS ≥0.3.149; Opus 5 "delegates to subagents more readily" | [G15] |
| Claude Managed Agents multiagent | **beta**, header `managed-agents-2026-04-01`; `agent_toolset_20260401` | [G17] |
| Advisor tool | beta `advisor-tool-2026-03-01`, tool type `advisor_20260301` | [G18] |
| OpenAI Agents SDK | 0.22.3 (2026-09-17); agents-as-tools vs handoffs; nested handoff history opt-in beta | [G24][G25][G38] |
| LangGraph / LangChain | 1.2.12 / 1.4.3; 1.0 of both on 2025-10-17; supervisor lib unmaintained | [G27][G28][G38] |
| Google ADK | 2.10.0 (2026-09-25); 2.0 GA Py 2026-05-19, Go 2026-06-30, TS 2026-08-21 | [G29][G38] |
| MS Agent Framework | 1.0 GA 2026-04-02; 1.19.0 2026-09-18; Harness blog 2026-07-22; AutoGen maintenance mode | [G33][G34][G38] |
| Pydantic AI | 2.0 on 2026-06-23; `SubAgents` harness capability; 8 durable engines | [G31][G38] |
| Agno | 3.0.0 2026-08-24 (breaking: DB migration; durable queue) | [G32] |
| CrewAI | 1.15.23 (1.0 2025-10-20); processes: `sequential`, `hierarchical` only | [G37][G38] |
| A2A | v1.0.0 2026-03-12, v1.0.1 2026-05-26 (changelog) / 2026-05-28 (GitHub release); AAIF hosted project 2026-08-17 | [G20][G21] |
| OTel GenAI agent spans | Development; repo `semantic-conventions-genai` created 2026-05-05 | [G39] |

## Timeline (only items missing from the other three files, or corrected)

- **2024-06-04** Chain-of-Agents (sequential worker agents over long context, a bounded summary passed along) [G52].
- **2024-06-11** MacNet, "Scaling LLM-based Multi-Agent Collaboration": DAG-organized agents, reported logistic "collaborative scaling law", >1,000 agents [G48].
- **2024-11** Magentic-One: stall counter threshold ≤2 before replanning [G36].
- **2025-02-12** "Stop Overvaluing Multi-Agent Debate" (5 MAD methods × 9 benchmarks × 4 models) [G43].
- **2025-03-17 / 04-22 / 10-26** MAST v1 / v2 / v3 (category shares change each time) [G4].
- **2025-03** OpenAI Swarm superseded by the Agents SDK (README) [G26]. openai-agents 0.1.0 on PyPI 2025-06-27 [G38].
- **2025-04-30** Who&When failure-attribution dataset [G45].
- **2025-08** IBM ACP merges into A2A [G21].
- **2025-08-24** "Debate or Vote" [G42].
- **2025-09-30** LLM-based multi-agent blackboard system (Salemi et al.) [G46].
- **2025-10-17** LangGraph 1.0 and LangChain 1.0 [G38].
- **2025-10-31** Unit 42: A2A agent session smuggling [G50].
- **2025-11-19** AppOmni: ServiceNow Now Assist second-order prompt injection via agent discovery [G51].
- **2025-12-09** Kim et al. v1 (180 configs, 4 benchmarks) [G1].
- **2026-01-20** Mastra 1.0 [G38].
- **2026-01-23** Anthropic "Building multi-agent systems: when and how to use them" [G5].
- **2026-01-28** Google Research blog on the scaling paper [G2].
- **2026-03-12** A2A v1.0.0 [G20].
- **2026-04-02** Microsoft Agent Framework 1.0 GA [G38].
- **2026-04-08** Kim et al. v3 (260 configs, 6 benchmarks) [G1].
- **2026-04-10** Anthropic "Multi-agent coordination patterns" [G6].
- **2026-04-22** Cognition "Multi-Agents: What's Actually Working" [G7].
- **2026-05-19** ADK Python 2.0 GA (Workflow Runtime) [G29].
- **2026-06-02** Claude Code dynamic workflows blog [G16].
- **2026-06-23** Pydantic AI 2.0 [G38].
- **2026-07-22** MAF Harness (single-agent harness) [G33].
- **2026-07-27** AG2 1.0 [G38].
- **2026-08-11 → 09-17** OpenAI Agents SDK 0.20 → 0.22.3: durable pending input in `RunState`, `agents.testing` deterministic test utilities (0.21.0), fixes to nested handoff history ownership, sandbox hardening [G25].
- **2026-08-13** Anthropic "Patterns and problems in emerging multiagent systems" [G9].
- **2026-08-17** A2A joins AAIF (announcement) [G21]. A2A's own blog post 2026-08-27 [G22].
- **2026-08-21** ADK TypeScript 2.0 GA [G29].
- **2026-08-24** Agno 3.0 [G32].
- **2026-09-25** Anthropic "What a task costs on Opus 5.5": token economics, subagent model choice [G19].

## Mechanics (gap fills)

### 1. Google Research: "Towards a Science of Scaling Agent Systems" [G1][G2]

- **Setup (v3).** 260 configurations. 6 agentic benchmarks: BrowseComp-Plus, Finance-Agent, PlanCraft, WorkBench, SWE-bench Verified, Terminal-Bench. 5 architectures. 3 LLM families: OpenAI (GPT-5 nano/mini/5), Google (Gemini 2.0 Flash/2.5 Flash/2.5 Pro), Anthropic (Sonnet 3.7/4.0/4.5). Tools, prompts and compute are standardized. "All MAS and SAS configurations were matched for total reasoning-token budget (mean 4,800 tokens per trial)". SWE-bench and Terminal-Bench use 20-instance subsets [G1].
- **Topologies (verbatim definitions)** [G1]:
  - Independent: `C = {(a_i, a_agg) : ∀i}` (agent-to-aggregator only, no peer communication).
  - Centralized: `C = {(a_orch, a_i) : ∀i}` (orchestrator-to-agents only).
  - Decentralized: `C = {(a_i, a_j) : ∀i, j, i ≠ j}` (all-to-all topology).
  - Hybrid: `C = C_centralized ∪ C_peer` (orchestrator plus limited peer-to-peer).
  - The orchestrator Ω determines aggregation (majority vote or weighted synthesis), override rights, whether memory persists across rounds, and termination.
- **Table 5 (v3, architecture-level constants)** [G1]:

| Metric | SAS | Independent | Decentralized | Centralized | Hybrid |
|---|---|---|---|---|---|
| Success rate | 0.466 | 0.370 | 0.477 | 0.463 | 0.452 |
| Turns | 7.2±2.1 | 11.4±3.2 | 26.1±7.5 | 27.7±8.1 | 44.3±12.4 |
| Overhead O% | 0 | 58 | 263 | 285 | 515 |
| Message density c | 0.00 | 0.00 | 0.41 | 0.39 | 0.24 |
| Redundancy R | 0.00 | 0.48 | 0.50 | 0.41 | 0.46 |
| Efficiency E_c | 0.466 | 0.234 | 0.132 | 0.120 | 0.074 |
| Error amplification A_trace | 1.0 | 17.2 | 7.8 | 4.4 | 5.1 |
| Success / 1K tokens | 67.7 | 42.4 | 23.9 | 21.5 | 13.6 |

- **Per-benchmark results (v3, relative to SAS)** [G1]:
  - Finance-Agent: Centralized **+80.8%**, Decentralized +74.5%.
  - BrowseComp-Plus: Independent −35%; Decentralized +9.2% (best).
  - WorkBench: roughly −11% to +6%; Decentralized +5.6%.
  - PlanCraft: every MAS variant degrades, **−39% to −70%**.
  - SWE-bench Verified: all MAS −2% to −15%, "consistent with high single-agent baselines (>45%)".
  - Terminal-Bench (SAS mean 0.344): mixed.
- **Laws and rules of thumb** [G1]:
  - Capability ceiling: "tasks where single-agent performance already exceeds 45% accuracy experience negative returns from additional agents" (β=−0.236, p=0.004 in v3; β=−0.408, p<0.001 in v1).
  - Turn scaling: `T = 2.72 × (n + 0.5)^1.724`, R²=0.974. "Under fixed computational budgets, per-agent reasoning capacity becomes prohibitively thin beyond 3–4 agents."
  - Message density saturates: "Performance plateaus near c* = 0.39 messages/turn".
  - Error amplification: "Independent systems amplify trace-level errors 17.2× … Centralized coordination, however, contains this to 4.4×". In the v3 regression, error amplification is no longer significant after controlling for efficiency and overhead (β=0.014, p=0.658).
  - Worked task archetypes: planning (T=4 tools, P_SA=0.57) → single agent; analysis (T=5, P_SA=0.35) → centralized; tool-heavy (T=16, P_SA=0.63) → decentralized.
  - "The framework identifies the best-performing architecture for 87% of held-out configurations".
- **Caveat for the book.** The "architectures" are the paper's own implementations under a small, fixed token budget (4.8K reasoning tokens per trial). Production systems such as Anthropic Research spend far more tokens and use different prompts. Treat the numbers as directional topology evidence, not vendor-system predictions. (COMPOSED caveat; the budget figure is from [G1].)

### 2. Anthropic's 2026 multi-agent design guides [G5][G6]

**"Building multi-agent systems: When and how to use them" (2026-01-23)** [G5]:
- Definition: "A multi-agent system is an architecture where multiple LLM instances run with separate conversation contexts, coordinated through code."
- Positive cases: "when context pollution degrades performance, when tasks can run in parallel, and when specialization improves tool selection or task focus. Outside these situations, the coordination costs typically exceed the benefits."
- Cost: "multi-agent implementations typically use 3-10x more tokens than single-agent approaches for equivalent tasks … duplicating context across agents, coordination messages between agents, and summarizing results for handoffs."
- Speed: "The primary benefit of parallelization is thoroughness, not speed."
- Thresholds (explicitly "practical guidelines, not fundamental constraints"):
  - Context isolation pays off when a subtask produces more than 1,000 tokens of mostly irrelevant context.
  - Tool overload shows at "often 20+" tools, or "15-20+" tools. Try the Tool Search Tool first ("reduce token usage by up to 85%").
  - Compaction reduces the context-limit argument for multi-agent.
- **Context-centric decomposition.** "Dividing by type of work (one agent writes features, another writes tests, a third reviews code) creates constant coordination overhead … an agent handling a feature should also handle its tests". In a role-split experiment (planner/implementer/tester/reviewer), "the subagents spent more tokens on coordination than on actual work."
  - Good boundaries: independent research paths, components with clean API contracts, blackbox verification.
  - Bad boundaries: sequential phases of the same work, tightly coupled components, shared state.
- Verification subagent: "consistently works well across domains". "More capable orchestrator models (like Claude Opus 4.5) are increasingly able to evaluate subagent work directly without a separate verification step."
- Anti-anecdote: "teams invest months building elaborate multi-agent architectures only to discover that improved prompting on a single agent achieved equivalent results."

**"Multi-agent coordination patterns" (2026-04-10): five patterns** [G6]:

| Pattern | Use when | Named failure modes |
|---|---|---|
| Generator-verifier | quality-critical output, explicit criteria | verifier "will rubber-stamp" without criteria; generation and evaluation may not be separable; oscillation → cap iterations and fall back to a human or best attempt |
| Orchestrator-subagent | clear decomposition, bounded subtasks ("Claude Code uses this pattern") | "The orchestrator becomes an information bottleneck"; unparallelized = "multi-agent token costs without the speed benefit" |
| Agent teams | parallel, independent, long-running subtasks; workers persist across assignments | no sharing of intermediate findings; harder completion detection; shared resources → conflicting edits |
| Message bus | event-driven pipelines, growing agent ecosystem | tracing a cascade is hard; router misclassification "fails silently" |
| Shared state (= blackboard) | collaborative research where findings should flow in real time; no coordinator SPOF | duplicate work; **reactive loops** (A writes, B follows up, A responds…) → needs "first-class termination conditions: a time budget, a convergence threshold (no new findings for N cycles), or a designated agent" |

Selection questions (verbatim framing) [G6]:
- Orchestrator vs teams: "how long workers need to maintain their context".
- Orchestrator vs bus: "how predictable the workflow structure is".
- Teams vs shared state: "whether agents need each other's findings".
- Bus vs shared state: "whether work flows as discrete events or accumulates into a shared knowledge base".

### 3. Cognition, "Multi-Agents: What's Actually Working" (Walden Yan, 2026-04-22) [G7]

- The 2025 principles are restated: share context; "Actions carry implicit decisions". "Our original observations still hold today for parallel-writer swarms."
- What works now: "setups where multiple agents contribute intelligence to a task while writes stay single-threaded".
  1. **Code-review loop.** Devin Review "catches an average of 2 bugs per PR, of which roughly 58% are severe". It works best when coder and reviewer "do not share any context beforehand". The cited mechanisms are context rot, and the reviewer being forced to reason from the diff.
  2. **"Smart friend".** A cheaper primary model calls an expensive model as a tool. The 80/20 practice is to "share a fork of the full context of the primary model with the smart model". SWE-1.5 as primary was "not good enough". It works "across frontier models" (Claude + GPT) as a "capability router rather than a difficulty escalator".
  3. **Manager Devin spawns child Devins** coordinated "through an internal MCP". Observed problems: managers are "overly prescriptive"; agents "assume they share state with their children when they don't"; sibling-to-sibling communication "doesn't happen by default".
- On swarms: "the unstructured-swarm approach … is mostly a distraction. The practical shape is map-reduce-and-manage."
- Usage in the enterprise segment grew "~8x" over 6 months (Cognition's own metric, no further conditions given).

### 4. Anthropic Frontier Red Team, "Patterns and problems in emerging multiagent systems" (2026-08-13) [G9]: field.md numbers verified

- Vulnerability swarm: 45 agents, each with its own VM, a shared forum, a peer-review step and a separate arbiter agent, over 15 OSS projects.
  - Mythos Preview: independent agents found 21 vulns in 6.5M tokens; the swarm found 266 in 27M tokens. "Roughly half" of the swarm's finds were outside the core directories. Limited to core directories, tokens per vulnerability were comparable.
  - Only 12 vulnerabilities were found by both approaches.
- 12-hour game-building swarms, comparing a baseline prompt, a prescriptive-roles prompt and a "CEO hierarchy" prompt: "these prompts did not make much difference". The games were bad. "Only Sonnet 5 is able to maintain both a high merge fraction while directly collaborating and sharing code".
- Conformity:
  - 18/30 agents chose the branch name "mvp-game-loop".
  - More than half of a swarm built ray tracers or self-hosting compilers.
  - Job-queue flooding: 30 Hz polling, 2.4M requests vs 117 accepted.
- Collusion: 3–8 agents in a Bertrand game agreed price floors by round 3 over a back-channel. With direct channels removed, they "price-matched to the penny via a public listings board".
- Hidden profile: 4 agents, n=400 episodes per model.
- Incompatible goals: n=120 episodes per model. Resolution came by force, passivity, truce, or not at all. "Models more capable in execution are not necessarily more coordinated".
- Takeaway quote for the chapter: "for agents, transmitting context is about as costly as acting on it, and an agent can be forked or repurposed at will. Thus, the assumptions that make coordination successful for us do not obviously hold."

### 5. Claude Code: current multi-agent surfaces [G12][G13][G14][G15][G16]

**"Who holds the plan" (VERBATIM table, abridged)** [G14]:

| | Subagents | Skills | Agent teams | Workflows |
|---|---|---|---|---|
| Who decides what runs next | Claude, turn by turn | Claude, following the prompt | The lead agent, turn by turn | The script |
| Where intermediate results live | Claude's context window | Claude's context window | A shared task list | Script variables |
| Scale | A few delegated tasks per turn | Same as subagents | A handful of long-running peers | Dozens to hundreds of agents per run |
| Interruption | Restarts the turn | Restarts the turn | Teammates keep running | Resumable in the same session |

**Subagents: facts to state correctly** [G12]:
- "Subagents run in the background by default" (Agent SDK subagent doc). Before v2.1.198 this was rolling out [G15].
- Fork mode "is on by default in interactive sessions". It is off with `-p` and in the Agent SDK unless turned on.
- A fork "inherits the entire conversation so far". It shares the parent's prompt cache ("its first request reuses the parent's prompt cache… cheaper than spawning a fresh subagent"). Start one with `/subtask` (v2.1.212+; `/fork` on v2.1.161–v2.1.211).
- A non-fork subagent gets: its own system prompt, the task message, CLAUDE.md files (unless `omitClaudeMd`), a git status snapshot, preloaded skills, and a sibling roster when it has `SendMessage`. It does **not** get conversation history, already-invoked skills, or output style.
- Nesting: "up to three layers below the main conversation". At the limit the `Agent` tool is withheld.
- Background subagents get a reduced built-in tool set, which includes `Edit`/`Write`/`Bash`/`SendMessage`/`EnterWorktree`.
- `isolation: worktree` gives a temporary git worktree. It is branched by default from the default branch, not the parent's `HEAD`.
- **Subagent output scanning (v2.1.210+).** A backslash is inserted into imitations of `<system-reminder>`/`Human:`/`Assistant:`. A `[harness: subagent output matched instruction-shaped pattern(s): …` marker is prepended when a report mentions permission settings. Reports arrive "under a header marking it as subagent output".

**SDK caps (VERBATIM semantics)** [G15]:
- Depth: `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` (default `3`).
- Concurrency: `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` (default `20`; returns `Concurrent subagent limit reached`; "Sessions with ultracode active are never refused").
- Spend: `maxBudgetUsd` / `max_budget_usd` (no default). Returns `Budget limit reached`, stops background subagents, and ends the query with the `error_max_budget_usd` result subtype.
- Versions: TS SDK v0.3.219 / Python SDK v0.2.127 (bundling Claude Code v2.1.219).
- Opus 5: "When the model is Opus 5, Claude Code adds a line to its system prompt telling Claude not to call the Agent tool unless it's asked to."

**Agent teams mechanics** [G13]:
- The lead plus teammates each have their own context. Teammates "communicate directly with each other".
- Task list states are pending / in progress / completed, with dependencies. "Task claiming uses file locking to prevent race conditions".
- Mailbox: `~/.claude/teams/{team-name}/inboxes/{agent-name}.json`. Task list: `~/.claude/tasks/{team-name}/`.
- Teammates plan in read-only plan mode if spawned while the lead is in plan mode. The lead auto-approves plans ("without the lead reviewing it").
- Teammates inherit the lead's permission mode (except `dontAsk`) and `--dangerously-skip-permissions`.
- Warning: "Agent teams add coordination overhead and use significantly more tokens than a single session … For sequential tasks, same-file edits, or work with many dependencies, a single session or subagents are more effective."

**Dynamic workflows** [G14][G16]:

VERBATIM snippet [G14]:
```js
const found = await agent('List every .ts file under src/routes/.', {
...
const audits = await pipeline(found.files, file =>
  agent(`Audit ${file} for missing authentication checks.`, { label: file }),
```
(The source elides the middle lines as well. Only these lines were copied verbatim.)

- `agent()` resolves to `null` on stop or unrecoverable error.
- A `schema` on `agent()` forces JSON output. Self-contradictory schemas are rejected before spawn.
- `Date.now()`, `Math.random()` and a no-argument `new Date()` **throw** inside the script "so that a relaunched run repeats the same `agent()` calls". This is deterministic replay, the same idea as Temporal workflow determinism.
- Limits:
  - 16 concurrent agents by default.
  - 4,096 items per `parallel()`/`pipeline()`.
  - No mid-run user input.
  - Usage-limit waits resume automatically (v2.1.271+, at most 2 waits).
  - `Large workflow` warning at more than 25 agents or more than 1.5M projected tokens.
  - Size guideline `small`/`medium` (default `medium`).
- The blog frames workflows as fixing three single-context failure modes: "Agentic laziness" (e.g. "addressing 35 of the 50 items in a security review"), "Self-preferential bias", and "Goal drift … especially after compaction" [G16].
- Six patterns: classify-and-act, fan-out-and-synthesize, adversarial verification, generate-and-filter, tournament ("comparative judgment is more reliable than absolute scoring"), and loop-until-done [G16].
- "parallelism and specialization have to earn their coordination cost" [G16].

### 6. Claude Managed Agents: hosted coordinator (beta) [G17]

VERBATIM request [G17]:
```bash
coordinator=$(curl -fsS https://api.anthropic.com/v1/agents \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: managed-agents-2026-04-01" \
  -H "content-type: application/json" \
  -d @- <<EOF
{
  "name": "Engineering Lead",
  "model": "claude-opus-5-5",
  "system": "You coordinate engineering work. Delegate code review to the reviewer agent and test writing to the test agent.",
  "tools": [
    {
      "type": "agent_toolset_20260401"
    }
  ],
  "multiagent": {
    "type": "coordinator",
    "agents": [
      {"type": "agent", "id": "$REVIEWER_AGENT_ID"},
      {"type": "agent", "id": "$TEST_WRITER_AGENT_ID"}
    ]
  }
}
EOF
)
```
- **Shared vs private.** "All agents share the same sandbox, filesystem, and vault credentials, but each agent runs in its own **session thread**, a context-isolated event stream with its own conversation history … Tools, MCP servers, and context are not shared." This matters for the "separation of permissions" argument: separate tools do **not** mean separate credentials.
- **Roster entries.**
  - `{"type":"agent","id":…}`, optionally with a `version`. If unpinned, the latest version at coordinator creation time is snapshotted.
  - `{"type":"self"}`: the coordinator can spawn copies of itself.
  - `{"type":"advisor","model":…}`: at most one.
- **Limits.**
  - "The coordinator can only delegate to one level of agents". A roster member with its own roster is rejected.
  - At most 20 unique roster agents, and multiple copies per agent are allowed.
  - "A maximum of 25 concurrent threads". Archive threads to free slots. Advisor threads are exempt.
- "Threads are persistent: the coordinator can send a follow-up to an agent it called earlier, and that agent retains everything from its previous turns." This is the "agent teams" persistence property, offered as an API.
- **Events on the primary thread (VERBATIM names):** `session.thread_created`, `session.thread_status_running`, `session.thread_status_idle` (with `stop_reason`), `session.thread_status_terminated`, `agent.thread_message_received` (`from_session_thread_id`, `from_agent_name`, `content`), and `agent.thread_message_sent` (`to_session_thread_id`, `to_agent_name`, `content`).
- Per-thread stream: `/v1/sessions/{session_id}/threads/{thread_id}/stream`.
- Interrupt one thread: `{"type": "user.interrupt", "session_thread_id": "$THREAD_ID"}`.
- The coordinator's tools include `list_agents` and `send_to_agent` (named in the advisor section).
- Recommended delegation patterns: Parallelization, Specialization, Escalation.

### 7. Advisor tool: the "smart friend" as an API primitive [G18]

VERBATIM (Messages API):
```json
"tools": [
  {
    "type": "advisor_20260301",
    "name": "advisor",
    "model": "claude-opus-5"
  }
]
```
- Beta header `advisor-tool-2026-03-01`. The executor (e.g. `claude-sonnet-5`) calls the advisor server-side. "The advisor reads the full conversation, produces a plan or course correction, and the executor continues".
- Fit: long-horizon agentic work "where most turns are mechanical but having an excellent plan is crucial". Weak fit for single-turn Q&A.
- In Managed Agents the agent's model "must not be more capable than its advisor". Advice from a redacted-result advisor (e.g. Opus 5) shows up as `[{"type": "redacted"}]` on the client stream [G17].
- Cognition independently reports the same pattern and its failure mode: a weak primary doesn't know when to escalate [G7].

### 8. OpenAI Agents SDK: handoff history defaults [G24][G25]

- Two core patterns, both VERBATIM:
  - "Agents as tools | A manager agent keeps control of the conversation and calls specialist agents through `Agent.as_tool()`."
  - "Handoffs | A triage agent routes the conversation to a specialist, and that specialist becomes the active agent for the rest of the turn."
  - They can be combined [G24].
- History: "When a handoff occurs, it's as though the new agent takes over the conversation, and gets to see the entire previous conversation history." `nest_handoff_history` "is available as an opt-in beta and is disabled by default". When enabled, summary segments are wrapped in `<CONVERSATION HISTORY>`. Custom mapping goes through `RunConfig.handoff_history_mapper` [G24].
- Security note (VERBATIM): "`is_enabled` is evaluated while the SDK prepares the available handoffs, before the model returns handoff arguments, so it cannot authorize values inside an argument-bearing handoff … perform the check at the start of `on_handoff`" [G24].
- Release churn in the last 2 months [G25]:
  - "fix: partition nested handoffs history ownership" (0.19.0, 2026-07-27).
  - "fix(sessions): recover resumed handoffs after session append failures" (0.22.1).
  - "feat: add durable pending input to RunState" (0.20.0, 2026-08-11).
  - `agents.testing` deterministic test utilities (0.21.0, 2026-08-15).

### 9. Google ADK 2.0 collaborative workflows [G29][G30]

VERBATIM [G30]:
```python
from google.adk import Agent

weather_agent = Agent(
    name="weather_checker",
    mode="single_turn",         # no user interaction
    tools=[get_weather, user_info, geocode_address],
)
flight_agent = Agent(
    name="flight_booker",
    mode="task",                # can ask user questions
    input_schema=FlightInput,
    output_schema=FlightResult,
    tools=[search_flights, book_flight],
)
root = Agent(
    name="travel_planner",      # coordinator agent
    sub_agents=[weather_agent, flight_agent],
    # Auto-injects delegation tools named after each subagent:
    # weather_checker, flight_booker
)
```
- Modes (VERBATIM table content):
  - `chat` (default): full interaction; "Manual (via transfer)" return.
  - `task`: clarification only; "Automatic (via `finish_task`)".
  - `single_turn`: no user interaction; "Automatic (with result)". "Multiple tasks can run in parallel".
- "Each ***task*** or ***single-turn*** mode agent operates in its own isolated session branch … cannot see what its peer agents are doing".
- Limits: `task` agents must be leaves. "The collaborative mode `task` behavior is disabled for use in graph-based workflows in ADK Python v2.0.0" [G30].
- ADK maps topology onto the chapter's vocabulary. `chat` mode = handoff (the peer owns the conversation). `task`/`single_turn` = subagent-as-tool with automatic return. (COMPOSED mapping.)

### 10. Other frameworks: corrections and additions

- **LangChain token/call tables** [G27]:
  - Single task: Subagents 4 calls; Handoffs/Skills/Router 3 calls each.
  - Repeat request: Subagents 4+4=8 calls, Handoffs/Skills 5, Router 6. "Stateful patterns (Handoffs, Skills) save 40-50% of calls on repeat requests."
  - Multi-domain task (~2K tokens of docs per domain): Subagents 5 calls / ~9K tokens; Handoffs 7+ / ~14K+; Skills 3 / ~15K; Router 5 / ~9K.
  - These are illustrative examples in the docs, not measurements.
- **Pydantic AI** [G31]:
  - `SubAgents` "exposes a single `delegate_task(agent_name, task)` tool, forwards dependencies, threads usage limits, and lists the available delegates in the system prompt as a static instruction so the listing stays in the cacheable prefix". "Each delegation runs in its own run with its own message history, so a delegate never sees the parent conversation."
  - `UsageLimits` has `cost_limit`, `request_limit`, `total_tokens_limit`, `tool_calls_limit`.
  - Gotcha: "A tool running in a Temporal activity receives a copy of the run context, so `usage=ctx.usage` does not carry the delegate's usage back to the parent run."
- **CrewAI** [G37]: `Process` enum is only `sequential` and `hierarchical`. Hierarchical requires `manager_llm` or `manager_agent`. "Tasks are not pre-assigned; the manager allocates tasks to agents based on their capabilities, reviews outputs, and assesses task completion." (field.md could not read CrewAI docs.)
- **Agno 3.0** [G32]: breaking release with a DB migration. Runs get their own table (`parent_run_id` links team/member runs). Durable background execution via `AgentOS(queue=QueueConfig(durable=True))`, default concurrency 32, with `Idempotency-Key` dedupe. Tool-result offloading over 16,000 chars applies to `Agent`/`Team`.
- **Microsoft**: AutoGen is in maintenance mode [G34]. MAF 1.0 GA was 2026-04-02 [G38]. The Magentic manager is described in spec.md; plan review defaults differ (Python `enable_plan_review=False`, .NET `RequirePlanSignoff` true) [G35].

### 11. Debate and blackboard: evidence (the "unverified" item in spec/practice)

- **Debate.**
  - Du et al. 2023 introduced multi-agent debate for factuality and reasoning [G44].
  - Zhang et al. 2025 (5 MAD methods × 9 benchmarks × 4 models): MAD "often fail[s] to outperform" CoT and Self-Consistency at higher compute. Heterogeneous models are "a universal antidote" [G43].
  - Choi, Zhu, Li 2025: majority voting explains most gains, and debate is a martingale unless belief updates are biased toward correction [G42].
  - Product form: Claude Code agent teams document spawning teammates with competing hypotheses who try to disprove each other (field.md [S9]). Workflows ship "adversarial verification" and "tournament" [G16].
  - Design rule (COMPOSED from G42/G43): implement "debate" as independent sampling plus a vote or judge; use different models or prompts for diversity; justify extra rounds with an eval.
- **Blackboard.**
  - Salemi et al. (Google-coauthored), arXiv 2510.01285: "a central agent posts requests to a shared blackboard, and autonomous subordinate agents … volunteer to respond based on their capabilities". Reported "13%-57% relative improvements in end-to-end success and up to a 9% relative gain in data discovery F1" on KramaBench and modified DSBench/DA-Code [G46].
  - Anthropic's "shared state" pattern is the production framing, with reactive loops as the main risk [G6].
  - Anthropic's research system uses a filesystem as an artifact store: "Subagents call tools to store their work in external systems, then pass lightweight references back to the coordinator" [G10].

### 12. Single agent + skills vs multi-agent (new 2026 evidence)

- Li 2026 (arXiv 2601.04748): a MAS "can be compiled into an equivalent single-agent system, trading inter-agent communication for skill selection". Preliminary results show "substantially reduce[d] token usage and latency while maintaining competitive accuracy". Skill-selection accuracy "remains stable up to a critical library size, then drops sharply", driven by semantic confusability [G47].
- Xu et al. 2026 (arXiv 2604.01608, v5 2026-08-19): distilling MAS workflows into a single-agent skill. Adding pipeline guidance changed utility by +19.6 points on method selection but −10.3 points on numerical error. So "which components cross the boundary" matters [G53].
- Cross-link: ch.06 (Skills). LangChain lists Skills as a multi-agent pattern for the same reason [G27].

### 13. Observability and evaluation of MAS (thin in all three files)

- OTel GenAI (Development):
  - `invoke_agent {gen_ai.agent.name}` spans.
  - `gen_ai.agent.id` / `name` / `version` / `description`.
  - `gen_ai.conversation.id` (conditionally required).
  - `gen_ai.operation.name ∈ {create_agent, invoke_agent, invoke_workflow, execute_tool, …}` [G39].
- Managed Agents exposes per-thread event streams, and parent linkage via `parent_thread_id` [G17]. Agno 3.0 stores `parent_run_id` per run [G32]. Both give trace-tree reconstruction without OTel.
- Failure attribution: Who&When (127 MAS, fine-grained labels). "The best method achieves 53.5% accuracy in identifying failure-responsible agents but only 14.2% in pinpointing failure steps"; o1 and R1 "fail to achieve practical usability" [G45].
- MAST as a tool: LLM-as-judge annotator (o1-based in the paper; κ=0.77 vs humans), `pip install agentdash` [G4].
- Deterministic testing: OpenAI Agents SDK `agents.testing` (0.21.0) [G25].
- Anthropic's research-system evaluation approach (in spec.md), plus Cognition's clean-context reviewer [G7], plus MAST's "multi-level verification" insight: "sole reliance on final-stage, low-level checks is inadequate" [G4].

### 14. Cost model (COMPOSED from sources)

- Per-agent cost = fresh_input·p_in + cache_read·p_cr + cache_write·p_cw + output·p_out, summed over all agents and turns.
- Opus 5.5 list prices: $4/M input, $20/M output, $0.20/M cache read. Cache writes cost 1.25× input (5-min TTL) or 2× (1-hour TTL). "An output token costs 100 times a cache read" [G19]. Fable 5.1: $10 / $50 / $0.25 [G19].
- Multi-agent cost drivers:
  - Context duplication. Every non-fork subagent re-sends its own system prompt, tools and CLAUDE.md into a **separate cache**. A fork reuses the parent cache [G12].
  - Coordination messages and summaries [G5].
  - Turn count, which grows as T ∝ (n+0.5)^1.724 under Google's setup [G1].
- Levers:
  - Subagent model choice. "Every subagent that inherits the main model inherits its price too"; move lookups to Haiku/Sonnet [G19].
  - Hard caps: `max_budget_usd`, depth, concurrency [G15]; Pydantic `UsageLimits` [G31]; MAF `max_round_count` / `max_stall_count` [G35]; workflow size guideline [G14].
  - Keep prompt-cache prefixes stable: Pydantic lists delegates statically for this reason [G31].

### 15. Topology decision rules (COMPOSED; every rule traced to a source)

1. Start with one agent plus good tools. Try Tool Search, compaction and skills before splitting [G5][G27][G47].
2. Split only along **context boundaries**, not role boundaries [G5].
3. If the single-agent baseline already clears ~45% on the task, expect MAS to hurt under a matched budget [G1].
4. Decomposable, breadth-first, read-heavy work (research, finance-style analysis) → orchestrator-subagent or centralized. Strictly sequential, constraint-heavy work (planning, most coding) → single agent [G1][G10].
5. Never run independent parallel agents without a verifier or aggregator: 17.2× vs 4.4× error amplification [G1]. Add a clean-context verifier [G5][G7].
6. Keep **writes single-threaded**. Let other agents contribute reads, reviews and advice [G7]. Use `isolation: worktree` when parallel writes are unavoidable [G12].
7. Past 3–4 agents under a fixed budget, per-agent reasoning gets thin [G1]. For dozens of agents, move the plan into code (dynamic workflows, graphs) [G14].
8. Design termination explicitly: max iterations, stall counters, convergence thresholds [G6][G35][G36].
9. Cap depth, concurrency and spend in code, not in prompts: newer models delegate more readily [G15].
10. Treat a subagent's output as untrusted input to its parent (output scanning [G12]; A2A smuggling [G50]). Scope credentials per agent where the platform allows; Managed Agents shares vaults [G17].
11. Assume identical agents make identical mistakes (conformity). Diversify models, prompts or context where independence matters [G9][G43].

## Numbers (new or corrected; conditions attached)

| Number | Condition | Source |
|---|---|---|
| 3–10× tokens vs single agent | Anthropic "in our testing", equivalent tasks, 2026-01 | [G5] |
| 4× (agent) / 15× (MAS) tokens vs chat | Anthropic internal data, 2025-06 | [G10] |
| 95% of variance from 3 factors; token usage alone 80% | BrowseComp, Anthropic 2025 | [G10] |
| Up to 90% research-time cut | 3–5 parallel subagents plus 3+ parallel tools, vs earlier sequential agents | [G10] |
| +80.8% / −70.0% relative to SAS | Finance-Agent (Centralized) / PlanCraft, Kim et al. v3 | [G1] |
| 17.2× vs 4.4× error amplification | Independent vs Centralized, trace-level, v1–v3 | [G1] |
| 58 / 263 / 285 / 515% overhead | Independent / Decentralized / Centralized / Hybrid vs SAS | [G1] |
| 67.7 vs 21.5 success per 1K tokens | SAS vs Centralized | [G1] |
| T = 2.72·(n+0.5)^1.724, R²=0.974 | turn growth vs agent count | [G1] |
| c* ≈ 0.39 messages/turn | message density plateau | [G1] |
| 87% | held-out configs where the model picks the best architecture | [G1] |
| R² 0.513 (v1) → 0.373 / 0.413 (v3) | cross-validated fit | [G1] |
| MAST 44.2 / 32.3 / 23.5% | v3, 1,642 traces | [G4] |
| MAST 41.77 / 36.94 / 21.30% | v2 only | [G4] |
| MAST +9.4% / +15.6% | role-spec fix (ChatDev, GPT-4o) / verification step (ProgramDev) | [G4] |
| 53.5% / 14.2% | best failure-attribution accuracy, agent / step, Who&When | [G45] |
| +13–57% relative end-to-end success | blackboard vs baselines, data-discovery benchmarks | [G46] |
| ~2 bugs/PR, ~58% severe | Devin Review on Devin-written PRs, Cognition 2026 | [G7] |
| 266 vs 21 vulns; 27M vs 6.5M tokens | swarm vs independent, Mythos Preview | [G9] |
| 20 concurrent / 3 deep | Claude Code subagent defaults | [G12][G15] |
| 16 concurrent agents; 4,096 items; >25 agents or >1.5M tokens warning | Claude Code dynamic workflows | [G14] |
| 20 roster agents; 25 concurrent threads; 1 delegation level | Managed Agents multiagent | [G17] |
| $4 / $20 / $0.20 per M tokens | Opus 5.5 input / output / cache read | [G19] |

## Pitfalls, limits, criticism (additions)

- **Shared credentials in hosted multi-agent.** Managed Agents roster agents share sandbox, filesystem and **vault credentials** [G17]. Tool separation is not permission separation.
- **Plan approvals are not human approvals.** In Claude Code agent teams, "the lead session grants teammate plan approvals without a separate prompt to you" [G13].
- **Default-on agent discovery is an attack surface.** In ServiceNow Now Assist, three properties "enabled by default" let a benign agent recruit more powerful agents under second-order prompt injection [G51]. Stateful A2A sessions allow multi-turn "session smuggling" [G50]. This is ch.16 material; cross-link from here.
- **Verifier without criteria = theater** [G6]. The MAST verifiers mostly checked "if the code compiles or if there are leftover TODO comments" [G4].
- **Router/bus silent failure.** A misrouted event "fails silently, handling nothing but never crashing" [G6].
- **Reactive loops in shared-state/blackboard systems** need explicit termination [G6].
- **Role-split pipelines** (planner → coder → tester → reviewer) spend more on coordination than work [G5]. Prescriptive-role and CEO prompts "did not make much difference" in 12-hour swarms [G9].
- **Vendor numbers are illustrations.** LangChain's call and token tables are worked examples with an arithmetic slip ("67% fewer") [G27]. Anthropic's 3–10× and 90.2% are internal measurements [G5][G10].
- **Version churn.** Claude Code behavior around subagents and teams changed across dozens of point releases in 2026: background default at v2.1.198, roster at v2.1.206, scanning at v2.1.210, `/subtask` at v2.1.212, model-precedence changes at v2.1.251/257 [G12][G13]. Pin versions when writing.
- **The durable-replay determinism rule applies to orchestration code too.** In workflows, `Date.now()`/`Math.random()` throw [G14]. Temporal likewise keeps reasoning in the workflow and I/O in activities [G40].

## What changed in the last 6 months (Apr–Sep 2026) — items the three files did not catch

- 2026-04-02 MS Agent Framework 1.0 GA. AutoGen in maintenance mode [G38][G34].
- 2026-04-08 Kim et al. v3: 6 benchmarks, and the headline numbers shifted [G1].
- 2026-04-10 Anthropic five coordination patterns, including shared-state/blackboard and message bus [G6].
- 2026-04-22 Cognition's revised stance ("writes stay single-threaded") [G7].
- 2026-04 onward: Managed Agents multiagent coordinator API (beta) and advisor roster entry [G17]. Advisor tool on the Messages API (beta 2026-03-01) [G18].
- 2026-05-19 / 06-30 / 08-21 ADK 2.0 GA (Py/Go/TS) with collaboration modes [G29][G30].
- 2026-06-23 Pydantic AI 2.0 [G38]. 2026-07-27 AG2 1.0 [G38]. 2026-08-24 Agno 3.0 [G32].
- Claude Code: subagents background-by-default, fork mode default, `SendMessage` roster, output scanning, dynamic workflows with `/deep-research` and ultracode [G12][G14].

**Last 3 months (Jul–Sep 2026) specifically:**
- MAF Harness 2026-07-22 [G33].
- OpenAI Agents SDK 0.19→0.22 handoff-history fixes and durable input [G25].
- Anthropic multiagent behavior study 2026-08-13 [G9].
- A2A → AAIF 2026-08-17 [G21].
- Agno 3.0 [G32].
- ADK TS 2.0 [G29].
- OTel semconv-genai repo active (last push 2026-09-29), still Development [G39].
- Anthropic cost post on Opus 5.5 pricing 2026-09-25 [G19].

No multi-agent-specific security incident dated Jul–Sep 2026 was found (see Unverified).

## Diagram candidates

1. **Five scaling topologies (Google).** Nodes: SAS; Independent (agents→aggregator); Centralized (orchestrator↔agents); Decentralized (all-to-all); Hybrid (orchestrator plus peer edges). Label each with error amplification (1.0 / 17.2 / 7.8 / 4.4 / 5.1) and overhead % [G1].
2. **Capability-ceiling decision chart.** Single-agent baseline on x, expected MAS delta on y; the crossover band near 45%; benchmark dots (Finance +80.8, BrowseComp +9.2, WorkBench +5.6, SWE-bench −2..−15, PlanCraft −70) [G1].
3. **"Who holds the plan".** Four columns (subagents / skills / agent teams / workflows). Arrows show where the plan and intermediate results live: context window vs task list vs script variables [G14].
4. **Anthropic's five coordination patterns.** Generator⇄verifier loop with an iteration cap; orchestrator star with a bottleneck marker; team with a shared queue and persistent workers; pub/sub bus with a router; shared store with a reactive-loop arrow and a termination gate [G6].
5. **Context-centric vs problem-centric decomposition.** Left: planner→coder→tester→reviewer, with a "telephone game" loss at each arrow. Right: feature-A agent (code+tests) ∥ feature-B agent, plus a blackbox verifier [G5].
6. **Managed Agents multiagent sequence.** Client → session primary thread (coordinator) → `session.thread_created` → child thread; `agent.thread_message_sent` / `agent.thread_message_received`; advisor thread `anthropic.advisor` with its 5-event lifecycle; a shared sandbox/vault box under all threads [G17].
7. **Advisor / smart friend.** Executor (Sonnet) → `server_tool_use` → advisor (Opus) reads the full transcript → `advisor_tool_result` → executor continues. Contrast with Cognition's forked-context smart friend [G18][G7].
8. **Cognition 2026 "single writer" shapes.** Coder ⇄ clean-context reviewer; primary → smart friend; manager Devin → child Devins via an internal MCP. The write lock stays with one agent [G7].
9. **ADK 2.0 collaboration modes.** Coordinator → subagent in `chat` (control stays until `transfer_to_agent`), `task` (auto-return on `finish_task`), `single_turn` (parallel branches, isolated session branches) [G30].
10. **OpenAI handoff history.** Triage → `transfer_to_refund_agent` → Refund agent sees full history (default), vs the `nest_handoff_history` beta, where history collapses into `<CONVERSATION HISTORY>` segments [G24].
11. **Dynamic workflow replay.** Script → `agent()` calls journaled; pause or usage-limit wait → relaunch replays identical calls (clock and randomness blocked) → continue [G14].
12. **MAST version drift.** Three stacked bars v1 / v2 / v3 showing category shares and trace counts (151 → 1,642) [G4].

### Chart candidates (real data)

- Kim et al. Table 5: success, turns, overhead %, error amplification and success per 1K tokens across 5 architectures (values in Mechanics §1) [G1].
- Per-benchmark best MAS vs SAS (v3): Finance +80.8 (Centralized), BrowseComp +9.2 (Decentralized), WorkBench +5.6 (Decentralized), SWE-bench −2..−15 (all), PlanCraft −39..−70 (all) [G1].
- Token multipliers: chat 1×, single agent 4×, MAS 15× (2025) [G10]; MAS vs single agent 3–10× (2026) [G5].
- MAST categories v1 37.17/31.41/31.41 → v2 41.77/36.94/21.30 → v3 44.2/32.3/23.5 [G4].
- Failure attribution: agent-level 53.5% vs step-level 14.2% [G45].
- Swarm vs independent vulnerability discovery: 266 @ 27M vs 21 @ 6.5M tokens; overlap 12 [G9].

## Glossary (new terms)

- **SAS / Independent / Centralized / Decentralized / Hybrid**: the five agent-system architectures in the Google scaling study, defined by their communication topology [G1].
- **Error amplification (A_trace)**: the factor by which an architecture propagates trace-level errors relative to a single agent (Independent 17.2×, Centralized 4.4×) [G1].
- **Capability saturation / ceiling**: the regime where extra agents give negative returns because the single-agent baseline is already high (≈45%) [G1].
- **Context-centric decomposition**: splitting work where context can be truly isolated, rather than by job role [G5].
- **Generator-verifier**: a generator paired with a verifier that has explicit criteria, looping to a cap [G6].
- **Message bus**: publish/subscribe coordination through a router [G6].
- **Shared state**: blackboard-style coordination through a store every agent reads and writes, with no coordinator [G6].
- **Blackboard architecture**: a central agent posts requests on a shared board and capable agents volunteer [G46].
- **Smart friend / advisor**: a cheaper executor consults a stronger model mid-task with the full or forked context [G7][G18].
- **Fork (Claude Code)**: a subagent that inherits the whole conversation and shares its prompt cache [G12].
- **Dynamic workflow**: a Claude-written JS orchestration script (`agent`/`parallel`/`pipeline`/`phase`) executed by a background runtime with deterministic replay [G14].
- **Session thread (Managed Agents)**: a context-isolated, persistent event stream per agent inside one session [G17].
- **Collaboration mode (ADK 2.0)**: `chat` / `task` / `single_turn` control-return semantics for subagents [G30].
- **Agent session smuggling**: injecting instructions into a stateful multi-turn A2A session from a malicious peer agent [G50].
- **Failure attribution**: identifying which agent and step caused a MAS failure (the Who&When task) [G45].

## Unverified / open questions

- **Anthropic "Claude Managed Agents" engineering post (Apr 2026) and its Brain/Hands/Session numbers** (field.md S22: TTFT −60% p50, −90% p95). Not re-read here. Only the Managed Agents *docs* were read [G17]. The banner on [G11] confirms the post exists.
- **Launch date of Managed Agents multiagent orchestration.** The beta header is `managed-agents-2026-04-01`, but the docs page carries no publication date. Tried: platform `llms.txt`, the doc page, and the claude.com blog listing (posts "new-in-claude-managed-agents" and "claude-managed-agents-updates" exist but were not opened).
- **A2A v1.0.1 date.** CHANGELOG says 2026-05-26; the GitHub release object is dated 2026-05-28 [G20]. Both are shown.
- **The A2A AAIF blog post at `/blog/2026/08/27/…`** was identified from the site's link. Its body was not fetched.
- **No Jul–Sep 2026 multi-agent security incident was found.** The HN Algolia queries ("agent session smuggling", "multi-agent prompt injection", "second-order prompt injection") surfaced nothing new. The known cases are 2025 (Unit 42, AppOmni) [G50][G51]. Chapter 16 research may have more.
- **MS Research Magentic-One blog page** returned only boilerplate to curl. The replan threshold came from the arXiv paper instead [G36].
- **Chain-of-Agents affiliation (Google).** Only the arXiv abstract was read [G52]. The authors' affiliation was not checked.
- **Du et al. 2023 debate paper**: only the title/abstract listing was retrieved [G44]. Its numbers are not quoted here.
- **Mastra's multi-agent mechanics** remain covered by spec.md only (its S17). Here only the version and the 1.0 date were verified [G38].
- **Whether `langgraph-swarm` has its own "no longer maintained" notice.** Only the supervisor README and the migration page were read. The swarm README status comes from spec.md's S13.

## Sources (all accessed 2026-09-30)

- [G1] Yubin Kim, Ken Gu, … Daniel McDuff, Xin Liu (Google Research, Google DeepMind, MIT), "Towards a Science of Scaling Agent Systems", arXiv:2512.08296, v1 2025-12-09, v2 2025-12-17, v3 2026-04-08. https://arxiv.org/abs/2512.08296 (PDF v3 read in full text; v1 abstract read)
- [G2] Yubin Kim, Xin Liu, "Towards a science of scaling agent systems: When and why agent systems work", Google Research blog, 2026-01-28. https://research.google/blog/towards-a-science-of-scaling-agent-systems-when-and-why-agent-systems-work/
- [G3] HN discussion of [G2], item 46847958, 2026-02-01 (106 points, 36 comments), metadata only via HN Algolia API.
- [G4] Cemri, Pan, Yang, et al. (UC Berkeley; Intesa Sanpaolo), "Why Do Multi-Agent LLM Systems Fail?", arXiv:2503.13657, v1 2025-03-17, v2 2025-04-22, v3 2025-10-26 (NeurIPS 2025 Datasets & Benchmarks). https://arxiv.org/abs/2503.13657 (v1, v2, v3 PDFs text-extracted)
- [G5] Anthropic, "Building multi-agent systems: When and how to use them", Claude blog, 2026-01-23. https://claude.com/blog/building-multi-agent-systems-when-and-how-to-use-them
- [G6] Anthropic, "Multi-agent coordination patterns", Claude blog, 2026-04-10. https://claude.com/blog/multi-agent-coordination-patterns
- [G7] Walden Yan, "Multi-Agents: What's Actually Working", Cognition blog, 2026-04-22. https://cognition.com/blog/multi-agents-working
- [G8] Walden Yan, "Don't Build Multi-Agents", Cognition blog, 2025-06-12. https://cognition.com/blog/dont-build-multi-agents
- [G9] Anthropic Frontier Red Team (corresponding author Carolyn Zou), "Patterns and problems in emerging multiagent systems", 2026-08-13. https://www.anthropic.com/research/multiagent-systems
- [G10] Anthropic, "How we built our multi-agent research system", 2025-06-13. https://www.anthropic.com/engineering/multi-agent-research-system
- [G11] Anthropic, "Building effective agents", 2024-12-19 (with the 2026 tooling note). https://www.anthropic.com/engineering/building-effective-agents
- [G12] Anthropic, "Subagents" (Claude Code docs, raw .md), undated living doc. https://code.claude.com/docs/en/sub-agents.md
- [G13] Anthropic, "Orchestrate teams of Claude Code sessions" (Claude Code docs, raw .md), undated. https://code.claude.com/docs/en/agent-teams.md
- [G14] Anthropic, "Orchestrate subagents at scale with dynamic workflows" (Claude Code docs, raw .md), undated. https://code.claude.com/docs/en/workflows.md
- [G15] Anthropic, "Subagents in the SDK" (Claude Agent SDK docs, raw .md), undated. https://code.claude.com/docs/en/agent-sdk/subagents.md
- [G16] Thariq Shihipar, Sid Bidasaria, "A harness for every task: dynamic workflows in Claude Code", claude.dev blog, 2026-06-02. https://claude.dev/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code/
- [G17] Anthropic, "Multiagent orchestration" (Claude Managed Agents docs, status beta, header managed-agents-2026-04-01), undated. https://platform.claude.com/docs/en/managed-agents/multiagent-orchestration.md
- [G18] Anthropic, "Advisor tool" (Claude Platform docs, beta advisor-tool-2026-03-01), undated. https://platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool.md
- [G19] Anthropic, "What a task costs on Opus 5.5", claude.dev blog, 2026-09-25. https://claude.dev/blog/what-a-task-costs-on-opus-5-5/
- [G20] A2A Project, CHANGELOG.md and GitHub releases (v1.0.0 2026-03-12; v1.0.1 2026-05-26 / release 2026-05-28). https://raw.githubusercontent.com/a2aproject/A2A/main/CHANGELOG.md ; https://api.github.com/repos/a2aproject/A2A/releases
- [G21] Agentic AI Foundation, "A2A joins AAIF's open agentic stack", 2026-08-17. https://aaif.io/blog/a2a-joins-aaif
- [G22] A2A Project blog link "A new chapter for A2A: joining the Agentic AI Foundation", path dated 2026-08-27 (link seen on the homepage; body not fetched). https://a2a-protocol.org/latest/blog/2026/08/27/a-new-chapter-for-a2a-joining-the-agentic-ai-foundation/
- [G23] Steven Vaughan-Nichols, "Google Moves A2A Under Agentic AI Foundation", Techstrong.ai, 2026-08-18. https://techstrong.ai/articles/google-moves-a2a-under-agentic-ai-foundation/
- [G24] OpenAI, Agents SDK docs `multi_agent.md` and `handoffs.md` (raw GitHub, main), undated. https://raw.githubusercontent.com/openai/openai-agents-python/main/docs/multi_agent.md ; https://raw.githubusercontent.com/openai/openai-agents-python/main/docs/handoffs.md
- [G25] OpenAI, openai-agents-python GitHub releases v0.18.3 (2026-07-17) … v0.22.3 (2026-09-17). https://github.com/openai/openai-agents-python/releases
- [G26] OpenAI, Swarm README ("now replaced by the OpenAI Agents SDK"). https://raw.githubusercontent.com/openai/swarm/main/README.md
- [G27] LangChain, "Multi-agent" docs (raw .md), undated. https://docs.langchain.com/oss/python/langchain/multi-agent/index.md
- [G28] LangChain, "Migrate from langgraph-supervisor" (raw .md) and langgraph-supervisor-py README. https://docs.langchain.com/oss/python/migrate/langgraph-supervisor.md ; https://raw.githubusercontent.com/langchain-ai/langgraph-supervisor-py/main/README.md
- [G29] Google, "Welcome to ADK 2.0" (ADK docs, raw .md): GA dates Py 2026-05-19, Go 2026-06-30, TS 2026-08-21. https://adk.dev/2.0/index.md
- [G30] Google, "Build collaborative agent teams" (ADK docs, raw .md). https://adk.dev/workflows/collaboration/index.md
- [G31] Pydantic, "Multi-agent Applications" and "Durable Execution" (pydantic-ai docs, raw GitHub). https://raw.githubusercontent.com/pydantic/pydantic-ai/main/docs/multi-agent-applications.md ; https://raw.githubusercontent.com/pydantic/pydantic-ai/main/docs/durable_execution/overview.md
- [G32] Agno, GitHub release v3.0.0, 2026-08-24. https://github.com/agno-agi/agno/releases/tag/v3.0.0
- [G33] Microsoft, "The Microsoft Agent Framework Harness is now released", Agent Framework devblog, 2026-07-22. https://devblogs.microsoft.com/agent-framework/the-microsoft-agent-framework-harness-is-now-released/
- [G34] Microsoft, AutoGen README (Maintenance Mode notice). https://raw.githubusercontent.com/microsoft/autogen/main/README.md
- [G35] Microsoft Learn, "Magentic orchestration" (Agent Framework). https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/magentic
- [G36] Fourney et al. (Microsoft), "Magentic-One: A Generalist Multi-Agent System for Solving Complex Tasks", arXiv:2411.04468, 2024-11. https://arxiv.org/abs/2411.04468
- [G37] CrewAI, "Processes" docs (raw .md). https://docs.crewai.com/en/concepts/processes.md
- [G38] PyPI JSON API and npm registry: release versions and dates for langgraph, langchain, deepagents, crewai, openai-agents, google-adk, pydantic-ai, agno, agent-framework(-core), claude-agent-sdk, autogen-agentchat, ag2, langgraph-supervisor, langgraph-swarm, @mastra/core. https://pypi.org/pypi/<pkg>/json ; https://registry.npmjs.org/@mastra/core
- [G39] OpenTelemetry, "Semantic Conventions for GenAI agent and framework spans" (semantic-conventions-genai, status Development; repo created 2026-05-05). https://raw.githubusercontent.com/open-telemetry/semantic-conventions-genai/main/docs/gen-ai/gen-ai-agent-spans.md
- [G40] Temporal, "Use cases and design patterns" and AI Cookbook "Multi-Agent Orchestration — Google ADK + Temporal". https://docs.temporal.io/evaluate/use-cases-design-patterns ; https://docs.temporal.io/ai/cookbook/multi-agent-adk-python.md
- [G41] LangChain, LangGraph "Persistence" doc (durability modes anchor), raw .md. https://docs.langchain.com/oss/python/langgraph/durable-execution.md
- [G42] Hyeong Kyu Choi, Xiaojin Zhu, Sharon Li, "Debate or Vote: Which Yields Better Decisions in Multi-Agent Large Language Models?", arXiv:2508.17536, 2025-08-24 (v2 2025-10-23). https://arxiv.org/abs/2508.17536
- [G43] Hangfan Zhang et al., "Stop Overvaluing Multi-Agent Debate — We Must Rethink Evaluation and Embrace Model Heterogeneity", arXiv:2502.08788, 2025-02-12 (v3 2025-06-21). https://arxiv.org/abs/2502.08788
- [G44] Du et al., "Improving Factuality and Reasoning in Language Models through Multiagent Debate", arXiv:2305.14325, 2023-05-23. https://arxiv.org/abs/2305.14325
- [G45] Shaokun Zhang, Ming Yin, et al., "Which Agent Causes Task Failures and When? On Automated Failure Attribution of LLM Multi-Agent Systems", arXiv:2505.00212, 2025-04-30. https://arxiv.org/abs/2505.00212
- [G46] Alireza Salemi, Mihir Parmar, Palash Goyal, Yiwen Song, et al., "LLM-Based Multi-Agent Blackboard System for Information Discovery in Data Science", arXiv:2510.01285, 2025-09-30 (v2 2026-01-31). https://arxiv.org/abs/2510.01285
- [G47] Xiaoxiao Li, "When Single-Agent with Skills Replace Multi-Agent Systems and When They Fail", arXiv:2601.04748, 2026-01-08. https://arxiv.org/abs/2601.04748
- [G48] Chen Qian et al., "Scaling Large Language Model-based Multi-Agent Collaboration" (MacNet), arXiv:2406.07155, 2024-06-11. https://arxiv.org/abs/2406.07155
- [G49] Jialing Li, Zhouhong Gu, Yin Cai, Hongwei Feng, "Scaling Behavior of Single LLM-Driven Multi-Agent Systems", arXiv:2606.00655, 2026-05-30. https://arxiv.org/abs/2606.00655
- [G50] Palo Alto Networks Unit 42, "Agent Session Smuggling in Agent2Agent Systems", 2025-10-31. https://unit42.paloaltonetworks.com/agent-session-smuggling-in-agent2agent-systems/
- [G51] AppOmni (AO Labs), "When AI Turns on Its Team: Exploiting Agent-to-Agent Discovery via Prompt Injection", 2025-11-19. https://appomni.com/ao-labs/ai-agent-to-agent-discovery-prompt-injection/
- [G52] Zhang et al., "Chain of Agents: Large Language Models Collaborating on Long-Context Tasks", arXiv:2406.02818, 2024-06-04. https://arxiv.org/abs/2406.02818
- [G53] Binyan Xu, Dong Fang, Haitao Li, Kehuan Zhang, "From Multi-Agent to Single-Agent: When Is Skill Distillation Beneficial?", arXiv:2604.01608, 2026-04-02 (v5 2026-08-19). https://arxiv.org/abs/2604.01608
