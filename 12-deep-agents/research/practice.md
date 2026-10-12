# 12. Deep agents: устройство Claude Code, Cursor и OpenClaw — engineering practice notes

## TL;DR (engineer must know)

- "Deep agent" = 4 components per Harrison Chase (LangChain, 2025-07-30): detailed system prompt, planning tool (often a no-op todo list used purely for context engineering), sub-agents for context isolation, and a file system as external memory [S2]. `deepagents` (Python/JS) is the open-source reference harness built explicitly as "an attempt to identify what makes [Claude Code] general-purpose, and push that further" [S1].
- Claude Code's own docs (current, 2026) describe the harness as a thin "agentic harness" layer around the model that supplies tools and manages context — not the model itself [S7]. The loop is: gather context → take action → verify results, repeated until no more tool calls are requested [S7], [S4].
- The **Claude Agent SDK** is literally "Claude Code as a library" — same binary, same tool set, same context management, callable from Python/TypeScript [S3]. This is the concrete, current answer to "how is Claude Code built" for anyone building their own harness: study the SDK docs, not the (closed) source.
- TodoWrite/planning tool is confirmed by multiple sources to be functionally a no-op — its entire value is context engineering (keeps the goal in the model's recent attention), not task execution [S2].
- Subagents get a **fresh context window** by default (no parent history), receive only the Agent-tool prompt string + their own system prompt + project CLAUDE.md, and return only a final summary to the parent — this is the mechanism, not a suggestion [S5].
- Above subagents, Claude Code now has two heavier orchestration primitives, both new/expanded in 2026: **Agent Teams** (peer sessions, shared task list, direct messaging, experimental, opt-in via env var) and **Workflows** (a JS script a runtime executes outside the conversation, orchestrating up to 1,000 agents, invoked via the `ultracode` keyword or `/effort ultracode`) [S8], [S9]. The key architectural idea: workflows move the *plan* into code so Claude's own context only ever holds the final answer, not the orchestration trace [S9].
- Compaction is not exotic: Claude Code clears old tool outputs first, then summarizes conversation history; persistent rules must live in CLAUDE.md because it is re-injected every request, while conversation history is not guaranteed to survive [S4], [S7].
- Skills (SKILL.md, progressive disclosure) are the on-demand-loading mechanism: description always in context (short), body loads only when invoked — this is the practical antidote to bloated system prompts/CLAUDE.md [S10]. Full mechanics belong to ch.06.
- OpenClaw (né Clawdbot → Moltbot → OpenClaw, Nov 2025–Jan 2026) is the highest-profile "personal always-on agent" harness of 2026: gateway + channels (WhatsApp/Telegram/Discord/Slack/Teams/web) architecture, exploded to 250K+ GitHub stars in under 4 months, and became the reference case study for agent-harness security failure (CVE-class RCE, mass malicious-skill supply-chain attack, Anthropic/Google provider bans and reversals) [S15], [S18], [S19], [S20], [S21].
- Evidence that "the harness matters as much as the model" is now quantified, not just asserted: same-model-different-harness gaps of "several percentage points" are explicitly flagged by benchmark authors as a confound [S30]; a newer model (GPT-5.1-Codex) *scored worse* than its predecessor on Terminal-Bench purely because the harness/benchmark's prompt didn't disclose a timeout the newer model's longer-horizon strategy tripped over — filtering out timeouts flips the ranking [S29].
- Ralph Wiggum technique (Geoffrey Huntley, mid-2025, still the reference pattern in 2026 discourse) = `while :; do cat PROMPT.md | agent; done`: a monolithic, single-process loop where the model re-reads the same spec every iteration and "gets tuned like a guitar" by the operator rather than by inter-agent messaging [S32].
- Manus's "Context Engineering for AI Agents" (2025-07-18) remains the most-cited concrete recipe set for building a deep-agent harness: design around KV-cache hit rate, mask (don't remove) tools, use the filesystem as unlimited/persistent context, recite goals via a live todo.md, and deliberately keep error traces in context [S31]. These five patterns show up, largely unattributed, inside Claude Code's own documented behavior (CLAUDE.md re-injection = recitation; compaction preserving tool-result structure = filesystem-like externalization).
- Minimal open harnesses worth knowing for "build it yourself": `pi.dev` (Earendil Inc, MIT core, ships only 4 tools — read/write/edit/bash — everything else is a TypeScript extension) [S26]; OpenCode (MIT, ~178K stars, differentiates on LSP diagnostics fed into the agent loop) [S27]; Goose (Apache 2.0, Linux Foundation/AAIF-governed since April 2026, YAML "recipes") [S27].

## Current state and versions (as of 2026-09-30)

- **Claude Code**: versioned continuously (docs cite up to v2.1.283+); current default starting permission mode for interactive terminal/VS Code sessions is **Auto** (a classifier reviews actions, blocks risky ones) as of v2.1.283, replacing manual-ask-by-default on earlier versions/plans [S7].
- **Claude Agent SDK**: TypeScript (`@anthropic-ai/claude-agent-sdk`) and Python (`claude_agent_sdk`) packages, versioned separately from Claude Code CLI but bundling a native Claude Code binary [S3], [S4].
- **Agent Teams**: experimental, disabled by default, `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` [S8].
- **Dynamic Workflows**: generally available on paid plans/API/Bedrock/Google Cloud Agent Platform/Microsoft Foundry; opt-in on Pro via `/config` [S9]. Bundled workflow: `/deep-research`.
- **deepagents**: PyPI package `deepagents`, also `deepagents.js`, plus "Deep Agents Code" — a pre-built terminal coding agent ("similar to Claude Code or Cursor, powered by any LLM"), installed via `curl -LsSf https://langch.in/dcode | bash` [S1]. Quickstart code names a model `"openai:gpt-6-astra"` [S1] — treat as evidence the ecosystem has moved past GPT-4/5-era naming by late 2026; verify exact model IDs independently before citing.
- **OpenClaw**: current name as of 2026-09-30 (renamed from Moltbot 2026-01-27→29, from original "Clawd"/Clawdbot in Nov 2025) [S15], [S18]. ~250K+ GitHub stars by 2026-03-01, surpassing React [S21].
- **Cursor**: ships a model router ("Cursor Router") with a learned complexity predictor ("Compass") as of 2026-08-06 [S23]; shipped a ~7% token-cost reduction pass on 2026-09-23 covering system-prompt trimming, dynamic tool loading, and cache-breakpoint placement [S22].
- **OpenAI Codex CLI**: open source, installed via `curl -fsSL https://chatgpt.com/codex/install.sh | sh`, also via npm (`@openai/codex`) and Homebrew; ships IDE integration, a desktop app (`codex app`), and a cloud agent (Codex Web) as separate surfaces from the CLI [S25].
- **Terminal-Bench**: at version **4.0** as of the 2026-09-30 snapshot of tbench.ai, hosted by Stanford/Harbor/Laude Institute [S33]; Terminal-Bench 2.1 numbers are still the most-cited (Cognition SWE-2: 92.8%, DeepSeek V4 Flash 0731: 82.7% "with a public harness" [per HN listing, S18]).

## Timeline

- **2025-07-14** — Geoffrey Huntley publishes the "Ralph Wiggum" technique post [S32].
- **2025-07-18** — Manus publishes "Context Engineering for AI Agents: Lessons from Building Manus" [S31].
- **2025-07-30** — Harrison Chase (LangChain) publishes "Deep Agents," coining the 4-component definition and open-sourcing `deepagents` [S2].
- **2025-11-26/28** — Anthropic engineering blog publishes "Effective harnesses for long-running agents" (initializer-agent / progress-file / feature-list pattern) [S13].
- **2025-11-30** (approx.) — community discussion of "three-layer memory architecture for long-running agents" picks up the Anthropic post [S18].
- **2026-01-21 to 01-26** — "Clawdbot" goes viral as an open-source personal AI assistant (Mac Mini + Slack/WhatsApp/Telegram + Claude, per brandon.wang's setup) [S16], [S18].
- **2026-01-27 to 01-30** — Clawdbot renames to **Moltbot** (community Discord vote, lobster-molt metaphor), then within days renames again to **OpenClaw** after trademark/domain due diligence; contemporaneous "Moltbook" (social network for bots) and first malicious-skill supply-chain wave (386 skills, ClawHub) [S15], [S18], [S20].
- **2026-01-30 to 02-05** — wave of "security nightmare" commentary (Register, Computerworld, XDA, YouTube) [S18].
- **2026-02-01** — CVE-2026-25253 disclosed: 1-click RCE via `gatewayUrl` param injection + WebSocket origin-validation bypass + admin-token handshake auto-bundling; patched in v2026.1.24-1 [S19].
- **2026-02-15** — Google restricts Google AI Pro/Ultra subscribers using OpenClaw via OAuth [S18].
- **2026-03-01/02** — OpenClaw passes React (243K) to become #1 most-starred non-aggregator GitHub project; had passed Linux the week before [S21].
- **2026-04-03** — Anthropic reportedly disallows Claude Code subscriptions being used with OpenClaw ("Tell HN" thread) [S18].
- **2026-04-21** — Anthropic reverses course: "OpenClaw-style Claude CLI usage is allowed again" per OpenClaw's own docs [S18].
- **2026-04-30** — viral claim that Claude Code "refuses requests or charges extra if your commits mention OpenClaw" [S18] — reputational/brand-policing friction between vendor and downstream harness.
- **2026-06-25** — comparative piece "Terminal Agents in 2026: Goose, Claude Code, OpenCode, and Pi" documents OpenCode dropping Anthropic OAuth (March 2026, after legal pressure) and Pi's own auth being "paused" by Anthropic three times in six months [S27].
- **2026-08-06** — Cursor publishes Router/Compass architecture post [S23].
- **2026-09-23** — Cursor publishes token-efficiency engineering post (7% cost cut) [S22].
- **2026-09-30 (today)** — Terminal-Bench at v4.0 [S33]; this research snapshot.

## Mechanics

### 1. The deep-agent definition and why "shallow" loops fail
Chase's framing: a bare "loop that calls tools" degrades on long-horizon, multi-step tasks because it has no persistent plan, no way to shed context, and no way to specialize. Deep agents fix this with four concrete mechanisms, each independently verifiable in Claude Code [S2]:
1. **Detailed system prompt** — long, with few-shot examples of tool use in specific situations.
2. **Planning tool** — Chase, quoted verbatim: "this doesn't do anything! It's basically a no-op. It's just context engineering strategy to keep the agent on track." [S2]
3. **Sub-agents** — isolate context per subtask.
4. **File system** — external, durable, agent-writable scratch space.

`deepagents`' own README generalizes this into a "batteries-included agent harness" built on LangGraph, explicitly citing sub-agents, filesystem, context management (summarize + offload to disk), shell access, persistent memory, human-in-the-loop, skills, and MCP tools as bundled features [S1]. Its security stance is stated bluntly: **"trust the LLM" model — the agent can do anything its tools allow; enforce boundaries at the tool/sandbox level, not by expecting the model to self-police"** [S1] — this is the harness-engineering equivalent of "don't rely on the model to refuse."

### 2. Anatomy of the Claude Code harness (documented, current)
Per Anthropic's own docs, the **agentic loop** = gather context → take action → verify results, repeating until Claude emits a turn with zero tool calls [S7]. The **Agent SDK** describes the same loop mechanically as a message stream: `SystemMessage(init)` → repeated `AssistantMessage`(tool call)/`UserMessage`(tool result) pairs = "turns" → final text-only `AssistantMessage` → `ResultMessage` (cost, tokens, session id, `stop_reason`) [S4]. VERBATIM message-lifecycle code (Python), from the SDK docs [S4]:

```python
async for message in query(prompt="Summarize this project"):
    if isinstance(message, AssistantMessage):
        for block in message.content:
            if isinstance(block, TextBlock):
                print(f"Claude: {block.text}")
            elif isinstance(block, ToolUseBlock):
                print(f"Tool call: {block.name}")
    if isinstance(message, ResultMessage):
        if message.subtype == "success":
            print(message.result)
        else:
            print(f"Stopped: {message.subtype}")
```

**Tool categories** (built-in): file ops (Read/Edit/Write), search (Glob/Grep), execution (Bash), web (WebSearch/WebFetch), discovery (**ToolSearch** — "dynamically find and load tools on-demand instead of preloading all of them" — a direct, documented anti-context-bloat mechanism, notably identical in spirit to what this research session itself used), orchestration (**Agent, Skill, AskUserQuestion, TaskCreate/TaskUpdate**) [S4].

**Context window composition** (what's actually in it, per SDK docs table) [S4]: system prompt (fixed, every request), CLAUDE.md (full content every request but prompt-cached), tool definitions (built-in tools every request; MCP schemas deferred by default via tool search), conversation history (accumulates), skill descriptions (short, full body only on invocation).

**Compaction, precisely**: triggers automatically near the context limit; summarizes older history, keeps recent exchanges/key decisions; emits `SystemMessage(subtype="compact_boundary")`; customizable via a free-form "Summary/Compact instructions" section in CLAUDE.md (the compactor "matches on intent," so header text is not special), a `PreCompact` hook (fires with `trigger: manual|auto`, can archive the full transcript before summarization), or manual `/compact <focus>` [S4]. VERBATIM CLAUDE.md snippet the docs recommend [S4]:
```markdown
# Summary instructions

When summarizing this conversation, always preserve:
- The current task objective and acceptance criteria
- File paths that have been read or modified
- Test results and error messages
- Decisions made and the reasoning behind them
```
If a single tool output is so large that context refills immediately after each compaction pass, Claude Code **stops auto-compacting after a few attempts and raises a "thrashing" error** instead of looping forever [S7] — an explicit documented failure mode, not a hypothetical.

**System reminders**: Anthropic's own glossary confirms unattributed agent behaviors (e.g., adding a `Co-Authored-By` trailer) originate from injected "system reminders" — CLAUDE.md, output-style instructions, file-changed-on-disk notices, and attribution lines are all added by the harness alongside user messages, not by the model choosing to [S7].

### 3. Subagents — the isolation primitive
A subagent (Agent tool, historically named "Task" — SDK docs explicitly say to match both names for cross-version compatibility) starts with **no parent conversation history** unless spawned as a "fork" [S5]. What it *does* get: its own system prompt + the literal Agent-tool prompt string + project CLAUDE.md (unless `omitClaudeMd: true`) + its configured tool subset [S5]. What it does *not* get: parent's tool results, parent's system prompt, preloaded skill content unless explicitly listed [S5]. Only the subagent's **final message** returns to the parent as the Agent tool's result — this is the entire context-isolation mechanism in one sentence.

Depth/concurrency/spend are all separately capped (env vars / query options), because "Claude decides on its own when to spawn a subagent and how many," and a subagent can itself spawn subagents [S5]:
- `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` — default 3
- `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` — default 20 (exempted when `ultracode`/max effort is active) [S5], [S11]
- `max_budget_usd`/`maxBudgetUsd` — no default limit; subagent spend counts toward it

**Subagent output scanning** (v2.1.210+): before the parent reads a subagent's final message, Claude Code neutralizes control-tag imitation (e.g. a fake `<system-reminder>` gets a backslash inserted, not deleted), flags permission-configuration mentions, and escapes fake `Human:`/`Assistant:` turn markers — i.e., **prompt-injection-from-subagent-output is a documented, mitigated threat model**, not a theoretical one [S5]. This is directly relevant to ch.16 (security) and ch.13 (multi-agent).

### 4. Above subagents: Agent Teams vs. Workflows — who holds the plan
This is the clearest architectural distinction Anthropic draws in 2026 docs, worth a table [S9]:

| | Subagents | Skills | Agent teams | Workflows |
|---|---|---|---|---|
| What it is | Worker Claude spawns | Instructions Claude follows | Lead agent + peer sessions | Script the runtime executes |
| Who decides what runs next | Claude, turn by turn | Claude, following prompt | Lead agent, turn by turn | The script |
| Where intermediate results live | Claude's context window | Claude's context window | Shared task list | Script variables |
| Scale | A few per turn | Same as subagents | A handful of long-running peers | Dozens–hundreds of agents/run |

**Agent Teams** (experimental): a "team lead" (the main session) spawns named teammates, each a *fully independent Claude Code instance* with its own context window; teammates message each other directly via a per-agent mailbox (`~/.claude/teams/{team}/inboxes/{agent}.json`) and self-claim work off a shared, file-locked task list [S8]. Concrete anti-anchoring pattern documented as a worked example [S8]: spawn 5 teammates with explicitly adversarial instructions — "Have them talk to each other to try to disprove each other's theories, like a scientific debate" — because "sequential investigation suffers from anchoring: once one theory is explored, subsequent investigation is biased toward it." Cost: **agent teams use "significantly more tokens," roughly linear in team size**, and separately documented as **~7x more tokens than standard sessions when teammates run in plan mode** [S6], [S8].

**Workflows**: Claude writes a JavaScript script (`agent()`, `pipeline()`, `parallel()`, `phase()`) that a separate runtime executes; the script, not Claude's context, holds the loop/branching/results [S9]. VERBATIM saved-workflow shape [S9]:
```javascript
export const meta = {
  name: 'audit-routes',
  description: 'Audit every route handler for missing auth checks',
}
const found = await agent('List every .ts file under src/routes/.', {
  schema: { type: 'object', required: ['files'], properties: { files: { type: 'array', items: { type: 'string' } } } },
})
const audits = await pipeline(found.files, file =>
  agent(`Audit ${file} for missing authentication checks.`, { label: file }),
)
return audits.filter(Boolean)
```
Hard limits, documented, not tuning advice: ≤4,096 items per `parallel()`/`pipeline()` call, ≤1,000 agents total per run, ≤16 concurrent agents by default (fewer under CPU-limited containers) [S9]. Determinism is enforced at the language level: `Date.now()`, `Math.random()`, bare `new Date()` are made to **throw** inside a workflow script specifically so a relaunched/resumed run repeats the same `agent()` calls [S9] — a small but telling reproducibility trick worth stealing for any custom orchestrator.

### 5. Skills as the on-demand-loading mechanism (detail lives in ch.06; harness-relevant facts here)
A skill is a `SKILL.md` (YAML frontmatter + markdown body); description is always in context, body loads only on invocation [S10]. Directly relevant to context-budgeting: "Aim to keep CLAUDE.md under 200 lines... move detailed instructions for specific workflows into skills" [S6]. Claude Code v2.1+ **merged custom commands into skills** — `.claude/commands/deploy.md` and `.claude/skills/deploy/SKILL.md` both produce `/deploy` [S10]. Skills follow the open **Agent Skills** standard (agentskills.io) with Claude Code extensions (invocation control, subagent execution, dynamic context injection) [S10].

### 6. Long-running agents: the Anthropic pattern (initializer + progress files)
Anthropic engineering (Justin Young, 2025-11-26) frames the core problem as: each new context-window session starts with zero memory of prior sessions — "like engineers working shifts with no recollection of previous shifts' progress" [S13]. Their two-agent pattern [S13]:
- **Initializer agent** (session 1 only): writes `init.sh` (dev server launch), `claude-progress.txt` (action log), an initial git commit, and a **feature list** (200+ JSON items for their claude.ai-clone worked example) with per-item schema `{category, description, steps, passes}`. Explicit instruction: **"It is unacceptable to remove or edit tests because this could lead to missing or buggy functionality."**
- **Coding agent** (every subsequent session): told to make incremental progress, work one feature at a time, commit with descriptive messages, leave the repo in a mergeable clean state. Startup sequence: `pwd` → read git log + progress file → pick highest-priority incomplete feature → start server via `init.sh` → run basic verification before touching code.

Failure modes this pattern targets, with the fix mapped to which agent owns it [S13]: early "I'm done" declarations (fixed by the feature list forcing itemized completion), undocumented/buggy handoffs (fixed by progress notes + mandatory re-verification at session start), premature "passes: true" marking (fixed by requiring actual test execution, not self-report). They found Claude would not verify end-to-end behavior without being told to — browser automation (Puppeteer MCP) and screenshot-based checking had to be prompted explicitly, not assumed [S13]. This is a direct, sourced instance of "verification loops must be designed in, not emergent."

### 7. OpenClaw: gateway/channel architecture and the security record
Architecturally, secondary sources describe channels (WhatsApp/Telegram/Discord/Slack/Teams/Twitch/Google Chat) plus web chat as the integration surface, local-first deployment (a person's own machine, not a centralized server) as the design stance, and broad model-provider support (KIMI K2.5, Xiaomi MiMo-V2-Flash named explicitly) [S15]. Note: neither the official rename post nor the "bull case" essay actually details the "Pi agent core" or "heartbeat/cron" internals the chapter brief names — **these specific terms are unverified from primary sources in this pass**; see Unverified.

Security record, concretely (not "AI agents are risky" hand-waving — three distinct, dated incidents) [S18], [S19], [S20], [S21]:
1. **CVE-2026-25253** (disclosed 2026-02-01): chained (a) unauthenticated `gatewayUrl` query param persisted to storage, (b) auto-bundling of the security-sensitive `authToken` into the next connection handshake, (c) WebSocket server not validating `Origin` (classic CSWSH). Attacker with the stolen admin token calls `exec.approvals.set {ask:"off"}` and `tools.exec.host=gateway` to escape the sandbox, then `node.invoke`→`system.run` for arbitrary code exec. Patched in v2026.1.24-1 with a gateway-URL confirmation modal.
2. **ClawHub supply-chain attack** (2026-01-27 to 02-02): 386 malicious skills published to the official skill registry in two waves (28, then 354 from a single account), disguised as crypto-trading tools with 500–700 lines of legitimate-looking documentation ("ClickFix"-style social engineering); payload (likely a NovaStealer variant) harvested exchange API keys, MetaMask data, macOS Keychain, browser passwords, SSH keys, git credentials. Most malicious skills reportedly remained live after being reported.
3. **Reputational/growth data point**: 0 → #1 most-starred non-aggregator GitHub repo (passing Linux, then React at 243K) in under 4 months [S21] — i.e., the security incidents did not slow adoption, which is itself a data point about how agent-harness ecosystems currently behave.

Vendor-policy whiplash is itself a harness-ecosystem lesson: Anthropic reportedly disallowed, then (2026-04-21) re-allowed Claude-subscription use through OpenClaw-style CLIs within about three weeks [S18] — a live example of a model vendor trying to police downstream harnesses via ToS rather than technical controls, and finding it hard to hold the line.

### 8. Evidence the harness matters as much as the model
Three concrete, numeric data points, each with explicit conditions:
- **Antigma.ai (2026-04-24)** [S30]: open-weight Qwen 3.6-27B run through Antigma's own `ante` harness scored **38.2%** on Terminal-Bench 2.0; Claude Opus 4.1 (released 2025-08-05) run through the **Terminus 2** harness scored **38.0% ± 2.6%** on the same benchmark (leaderboard run verified 2025-10-31). The authors' own caveat, verbatim in substance: harness variation is "known to be worth several percentage points" — so a 0.2-point gap between a 27B open model and a frontier closed model is *entirely within harness noise*, not a capability claim.
- **Transluce Docent (2026-02-11)** [S29]: GPT-5.1-Codex scored **36.9%** vs. GPT-5-Codex's **43.4%** on the official Terminal-Bench leaderboard (widening to an 11.4-point gap in Transluce's own reproduction). Root cause: GPT-5.1-Codex times out **49%** of runs vs. GPT-5-Codex's **29%**, because "Terminal-Bench's system prompt never mentions the time constraint" and the newer model pursues longer-horizon strategies that get cut off. **Filtering to only non-timeout tasks reverses the ranking: GPT-5.1-Codex then beats GPT-5-Codex by ~7 points.** This is as clean a "harness/prompt design determined the benchmark outcome, not model capability" result as exists in the public record.
- **Terminal-Bench 2.1 leaderboard snapshot (from HN headlines, not independently verified numbers)** [S18]: Cognition SWE-2 92.8%, DeepSeek V4 Flash 0731 82.7% "with a public harness" — the qualifier itself, used by the submitter, signals that harness identity is treated as a first-class, citable variable in 2026 benchmark reporting, not an afterthought.

### 9. Minimal harnesses — what "build it yourself" looks like in practice
- **Ralph Wiggum** [S32]: `while :; do cat PROMPT.md | claude-code; done` — the entire "orchestrator" is a shell loop; the model re-reads the same spec/plan every iteration (no cross-iteration memory except what's on disk/in git); parallelism is allowed for *search* (up to 500 subagents for code search/file ops per Huntley) but explicitly restricted to single-threaded for *validation* (build/test) "to prevent backpressure issues." Tuning happens by editing the spec ("Ralph gets tuned—like a guitar"), not by adding inter-agent protocol. Reported results: a CURSED compiler + stdlib built this way; a $50k-scoped contract delivered for $297 in API cost at a hackathon.
- **Pi** (pi.dev, Earendil Inc) [S26]: deliberately ships only 4 tools — `read`, `write`, `edit`, `bash` — and treats everything else (sub-agents, permission popups, plan mode, todos, background bash) as something *you* build as a TypeScript extension rather than something the harness bakes in. Four run modes: interactive TUI, print/JSON (scripting), RPC over stdin/stdout, and an embeddable SDK.
- **OpenCode** [S27]: MIT, ~178K stars, differentiator is piping **LSP diagnostics directly into the agent loop** (compiler/type-checker feedback without a separate build step) — a concrete, copyable idea for anyone building a code-focused harness for typed languages.
- **Goose** [S27]: Apache 2.0, donated to the Linux Foundation's Agentic AI Foundation in April 2026; signature feature is portable YAML "recipes" for shareable automation.

## Numbers

| Measurement | Value | Condition | Source |
|---|---|---|---|
| Deep-agent architecture components | 4 (prompt, planning tool, subagents, filesystem) | LangChain's definition, 2025-07-30 | [S2] |
| Default subagent concurrent limit | 20 | Claude Code default; env-configurable; exempt under `ultracode` | [S5], [S11] |
| Default subagent spawn depth | 3 layers | Claude Code default | [S5] |
| Subagent description token budget | 15,000 tokens combined | Custom subagents only, excludes built-ins | [S11] |
| Workflow hard cap | 1,000 agents/run, ≤16 concurrent (default), ≤4,096 items/parallel or pipeline call | Claude Code Workflow tool | [S9] |
| "Large workflow" warning threshold | >25 agents or >1.5M projected tokens | Default guideline (`medium`); `small` default on Pro since v2.1.271 | [S9] |
| Agent-team token overhead | "~7x" a standard session | When teammates run in plan mode | [S6] |
| Enterprise Claude Code cost | ~$13/developer/active day; $150–250/dev/month; <$30/day for 90% of users | Across enterprise deployments, per Anthropic docs | [S6] |
| CLAUDE.md recommended size | <200 lines | To keep base context small | [S6] |
| GPT-5.1-Codex vs GPT-5-Codex, Terminal-Bench official | 36.9% vs 43.4% | Official leaderboard; gap explained by timeout-rate difference (49% vs 29%), not capability | [S29] |
| Same tasks, timeouts filtered out | GPT-5.1-Codex +~7 pts over GPT-5-Codex | Transluce reproduction, 2026-02 | [S29] |
| Open-weight 27B vs Opus 4.1, Terminal-Bench 2.0 | 38.2% (Qwen 3.6-27B, `ante` harness) vs 38.0%±2.6% (Opus 4.1, Terminus 2 harness) | Different harnesses; authors flag harness variance as "several percentage points" | [S30] |
| OpenClaw GitHub stars | 250K+, passing React's 243K | By 2026-03-01, ~4 months after launch | [S21] |
| Malicious ClawHub skills | 386 total (28 + 354) | 2026-01-27 to 02-02, ~7,000 downloads for the largest batch | [S20] |
| Cursor token-efficiency gains | 7% overall; system prompt −66%; tool-schema static tokens −60%; cache misses −20%; line-numbering cache-read tokens −1.6% | Cursor engineering, 2026-09-23 | [S22] |
| Cursor router uplift threshold | "one-sided 75% uplift" required before routing to a pricier candidate model | Cursor Router/Compass, 2026-08-06 | [S23] |

## Pitfalls, limits, criticism

- **Planning tools are theater, and that's fine — as long as you know it.** The todo list does not execute anything; treating it as a scheduler rather than an attention-management trick leads to over-engineering it [S2].
- **Compaction silently drops instructions.** Anything not in CLAUDE.md (re-injected every turn) can be lost to summarization; this is *documented behavior*, not a bug — plan your harness accordingly (persistent rules → memory file, not initial prompt) [S4], [S7].
- **Compaction can thrash.** A single oversized tool output can make the harness compact, refill, compact, refill — Claude Code has a documented circuit breaker (a few attempts, then an explicit error) rather than looping forever; a DIY harness without this breaker will spin [S7].
- **Subagent output is an injection surface.** A subagent's final message is read by the parent as trusted-ish tool output; Claude Code had to add explicit scanning/escaping for control-tag and turn-marker imitation (v2.1.210+) — build this into any custom multi-agent harness, don't assume subagent text is safe [S5].
- **Agent teams and workflows both multiply cost, not just latency.** Teams: "significantly more tokens... roughly proportional to team size," ~7x in plan mode. Workflows: can silently schedule >25 agents / >1.5M tokens before the size guideline flags it [S6], [S8], [S9].
- **Ralph-style loops are explicitly greenfield-only** per their own author: not recommended for existing codebases, require an experienced human tuning specs continuously, and are vulnerable to nondeterministic search giving false negatives ("assuming code isn't implemented when it is") [S32].
- **Benchmark harness identity confounds model comparisons more than people assume.** Two independent, dated examples (GPT-5.1 vs 5-Codex; Qwen vs Opus 4.1) show the *harness*, not the model, driving several-point swings — treat any cross-harness leaderboard comparison as apples-to-oranges by default [S29], [S30].
- **"Always-on personal agent" harnesses (OpenClaw-class) have a qualitatively different threat model than coding harnesses**: they hold messaging/calendar/financial credentials and run unattended, so a single chained web vuln (URL param → token handshake → origin bypass) becomes a full account+system compromise, not "just" a bad code edit [S19]. Full treatment belongs in ch.16; the harness-design takeaway here is: an always-on gateway needs origin validation and token-scoping treated as load-bearing security, not incidental.
- **Vendor policy on downstream harnesses is unstable, not principled yet.** Anthropic banned, then within ~3 weeks re-allowed, OpenClaw-style CLI usage; this is a live governance problem, not a solved one, and any harness built on top of a vendor API should expect ToS-level policy risk in addition to technical risk [S18].
- **The claimed "leaked Claude Code source" analysis (thoughts.jock.pl, 2026-04-01) is a single, low-authority secondary source making an extraordinary claim (512,000-line TypeScript leak) with zero corroboration found elsewhere in this research pass, and it reproduces no actual code.** Treat every specific detail from it (three-layer memory with "autoDream," "KAIROS" daemon, etc.) as unverified rumor, not fact — see Unverified section [S17].

## What changed in the last 6 months (since ~2026-04)

- **Dynamic Workflows** went from a subagent docs footnote to a fully documented, general-availability feature with its own progress UI (`/workflows`), size guidelines, resumability, and a bundled `/deep-research` command [S9] — this is the single biggest new harness-architecture primitive in the Anthropic ecosystem this half.
- **`ultracode`** (an effort-level / keyword trigger for automatic workflow orchestration) is new: `/effort ultracode` makes Claude plan a workflow for every substantive task in a session [S9].
- **Auto permission mode became the interactive default** (v2.1.283) — the harness now defaults to a classifier reviewing actions rather than asking per-command, a meaningful shift in the human-in-the-loop story [S7].
- **Cursor's Router/Compass** (2026-08-06) and token-efficiency pass (2026-09-23) show a second major vendor formalizing per-task model selection and aggressive context-cost engineering (66% system-prompt cut, dynamic tool loading) as documented, numbered practice rather than ad hoc tuning [S22], [S23].
- **OpenClaw's full boom-bust-reform cycle happened almost entirely inside this window**: viral launch (Jan), two renames (Jan), mass supply-chain attack + RCE CVE (Jan–Feb), #1 GitHub repo (Mar), vendor ban (Apr 3) reversed (Apr 21) — the entire lifecycle of a hugely popular open agent harness, including its security failures and vendor-relations conflict, is a 2026 H1 phenomenon [S15], [S18], [S19], [S20], [S21].
- **Subagent auth/output-scanning hardening (v2.1.210+)** and **budget-cap enforcement across subagent trees (v2.1.217+)** both landed this year, indicating the multi-agent security/cost model is still actively being patched, not settled [S5].

## Diagram candidates

1. **The agentic loop** — actors: user, Claude (model), tool executor, environment. Arrows: prompt → evaluate → {tool call → result → evaluate} loop → final text. States: gathering context / taking action / verifying. Source: [S7], [S4].
2. **Context window anatomy stack** — a stacked bar: system prompt (fixed) | CLAUDE.md (cached) | tool defs | skill descriptions | conversation history (growing) | most-recent turn. Annotate what's prompt-cached vs. not. Source: [S4].
3. **Compaction trigger and circuit breaker** — flowchart: context fills → clear old tool outputs → still full? → summarize → still full after N attempts? → thrashing error. Source: [S7].
4. **Subagent isolation** — two boxes (parent context, subagent context) with a narrow arrow labeled "prompt string only" going in and "final message only" coming out; big X over "tool results" and "conversation history" not crossing. Source: [S5].
5. **Subagents vs Agent Teams vs Workflows** — three architecture diagrams side by side: tree (main→subagents, results flow up); mesh (lead + peers, mailbox messages, shared task list); pipeline (script with agent()/pipeline()/parallel() nodes, no conversational context). Source: [S8], [S9].
6. **Deep-agent 4-component diagram** — a wheel: prompt, planning tool, subagents, filesystem, all feeding into one "harness" hub, contrasted with a bare "loop" stick-figure diagram for "shallow agent." Source: [S2].
7. **OpenClaw gateway/channel architecture** — hub-and-spoke: local gateway node in the middle, spokes to WhatsApp/Telegram/Discord/Slack/Teams/web-chat, one spoke to the model API. Source: [S15]. (Mark "Pi agent core"/heartbeat internals as unverified/dashed.)
8. **CVE-2026-25253 attack chain** — sequence diagram: attacker → victim browser (gatewayUrl injection) → stored setting → auto handshake (leaks authToken) → attacker WS connect (no origin check) → `exec.approvals.set` → `system.run` RCE. Source: [S19].
9. **Ralph Wiggum loop** — a literal `while` loop diagram: PROMPT.md → agent → (up to 500 parallel search subagents, 1 serial validation run) → git commit → loop back, with a human icon periodically editing PROMPT.md ("tuning the guitar"). Source: [S32].
10. **Initializer-agent / coding-agent handoff** — two-lane swimlane: Session 1 (initializer) writes init.sh + progress.txt + feature-list.json + first commit; Session N (coding agent) reads all three, picks one feature, verifies, commits, exits. Source: [S13].
11. **Manus's 5 context-engineering levers** mapped onto a single agent turn — KV-cache boundary marker, tool-masking state machine, filesystem read/write arrows, todo.md recitation loop-back arrow, "keep errors in context" annotation on a failed tool-call box. Source: [S31].

**Chart candidates**: (a) OpenClaw GitHub star count over time (0 → passes Linux → passes React 243K, all within ~4 months, 2026-01 to 2026-03) [S21] — needs a real star-history data pull for exact daily values, only milestones are sourced here; (b) Terminal-Bench score vs. timeout rate for GPT-5-Codex vs GPT-5.1-Codex (43.4%/29% vs 36.9%/49%) [S29] as a paired bar chart illustrating the harness confound.

## Glossary

- **Agentic harness** — the layer of tools, prompts, and context management wrapped around a raw model to make it act autonomously; term used explicitly by Anthropic's own docs [S7].
- **Deep agent** — an agent harness combining a detailed system prompt, a planning tool, sub-agents, and a filesystem, per LangChain's definition [S2].
- **Compaction** — automatic summarization of older conversation history when the context window nears its limit [S4].
- **Subagent** — an Agent-tool-spawned worker with an isolated (usually fresh) context window whose only output to the parent is its final message [S5].
- **Fork** (of a conversation) — a subagent spawned with the parent's conversation history copied in, instead of starting fresh [S5].
- **Agent team** — several independent Claude Code sessions (one "lead," several "teammates") coordinating via a shared task list and direct mailbox messaging [S8].
- **Dynamic workflow** — a JS script, written by Claude and executed by a separate runtime, that orchestrates many subagents outside the conversation's context [S9].
- **Ultracode** — Claude Code setting/keyword that triggers automatic workflow orchestration for a task or session [S9].
- **Skill (SKILL.md)** — a markdown file with YAML frontmatter that Claude loads on demand (description always visible, body only when invoked) [S10].
- **System reminder** — harness-injected context (CLAUDE.md, output-style rules, file-changed notices, attribution lines) that appears alongside but is not part of the user's message [S7].
- **Initializer agent** — the first session in a multi-session long-running-agent pattern, responsible for scaffolding (init script, progress file, feature list, first commit) rather than doing feature work [S13].
- **Ralph Wiggum technique** — a single-process `while` loop repeatedly feeding the same spec file to a coding agent, relying on operator-tuned specs rather than inter-agent protocol [S32].
- **Recitation** (context engineering) — repeatedly restating current goals/state (e.g., via a live todo.md) to keep them in the model's recent attention and avoid "lost in the middle" [S31].

## Unverified / open questions

- **"Pi agent core," "heartbeat/cron," specific "memory files" architecture inside OpenClaw** (as named in the chapter brief) — not found in the two primary sources fetched (openclaw.ai's own rename post, brandon.wang's essay); both explicitly lacked this detail. Tried: WebFetch on openclaw.ai/blog/introducing-openclaw and brandon.wang/2026/clawdbot. Needs: OpenClaw's own architecture docs (docs.openclaw.ai) or its GitHub repo README, not yet fetched in this pass.
- **CVE-2026-33579** ("OpenClaw privilege escalation vulnerability," per HN listing pointing to nvd.nist.gov) — the NVD page fetch failed (curl returned no match / "not found" for the description regex); only the HN headline is confirmed, not the technical content. Do not cite specifics beyond "a privilege-escalation CVE exists and was discussed on HN, 2026-04-03."
- **The "leaked Claude Code TypeScript source, 512K lines, v2.1.88" claim (thoughts.jock.pl, Pawel Jozefiak, 2026-04-01)** — single source, no corroboration found, no actual code reproduced by the source itself. Everything attributed to it in early drafts (autoDream memory consolidation, KAIROS daemon, three-layer memory) should be treated as **unverified rumor about Claude Code internals**, explicitly distinct from the *documented* SDK/CLI behavior cited elsewhere in these notes. Tried: WebFetch only; did not attempt to independently locate the alleged leaked repo.
- **Exact current OpenClaw star count and daily growth curve** — only milestone numbers (243K React, 250K+ OpenClaw, "passed Linux the week before") are sourced, from a single blog post; a real star-history.com API pull would give exact daily data for the chart candidate above. Not attempted (would need a separate API call to star-history's data endpoint, not just its blog).
- **Amp (Sourcegraph) as an open harness** — named in the chapter brief; HN search for "Amp coding agent Sourcegraph" returned zero relevant hits in this pass. Needs a direct fetch of ampcode.com or Sourcegraph's blog, not attempted due to time budget.
- **Composio's "OpenClaw is a security nightmare" post** — original URL (composio.dev/content/openclaw-security-and-vulnerabilities) 404'd on fetch; a corrected URL was not found in the time available. The depthfirst.com and opensourcemalware.com sources cover overlapping ground and are verified instead.
- **Cursor's older/other harness posts** (agent architecture pre-Router, multi-agent features) — the blog listing fetch only surfaced 3 recent posts (token efficiency, router, cloud-agent builds); Cursor's earlier foundational "how our agent works" posts, if they exist, were not located in this pass.
- **Exact current version numbers for `deepagents` (PyPI) and the Claude Agent SDK packages** — not pinned; the docs reference CHANGELOG URLs (github.com/anthropics/claude-agent-sdk-typescript / -python) that were not individually fetched for a specific version number as of 2026-09-30.

## Sources

- [S1] `langchain-ai/deepagents` README, LangChain, GitHub (raw.githubusercontent.com/langchain-ai/deepagents/main/README.md), no single pub date (actively maintained), accessed 2026-09-30.
- [S2] "Deep Agents," Harrison Chase, LangChain blog, 2025-07-30, https://www.langchain.com/blog/deep-agents, accessed 2026-09-30.
- [S3] "Agent SDK overview," Anthropic (Claude Code docs), https://code.claude.com/docs/en/agent-sdk/overview, live doc, accessed 2026-09-30.
- [S4] "How the agent loop works," Anthropic (Claude Code docs), https://code.claude.com/docs/en/agent-sdk/agent-loop, live doc, accessed 2026-09-30.
- [S5] "Subagents in the SDK," Anthropic (Claude Code docs), https://code.claude.com/docs/en/agent-sdk/subagents, live doc, accessed 2026-09-30.
- [S6] "Manage costs effectively," Anthropic (Claude Code docs), https://code.claude.com/docs/en/costs, live doc, accessed 2026-09-30.
- [S7] "How Claude Code works," Anthropic (Claude Code docs), https://code.claude.com/docs/en/how-claude-code-works, live doc, accessed 2026-09-30.
- [S8] "Orchestrate teams of Claude Code sessions" (Agent teams), Anthropic (Claude Code docs), https://code.claude.com/docs/en/agent-teams, live doc, accessed 2026-09-30.
- [S9] "Orchestrate subagents at scale with dynamic workflows," Anthropic (Claude Code docs), https://code.claude.com/docs/en/workflows, live doc, accessed 2026-09-30.
- [S10] "Extend Claude with skills," Anthropic (Claude Code docs), https://code.claude.com/docs/en/skills, live doc, accessed 2026-09-30.
- [S11] "Subagents" (Claude Code, filesystem-based docs), https://code.claude.com/docs/en/sub-agents, live doc, accessed 2026-09-30.
- [S12] "Hooks reference," Anthropic (Claude Code docs), https://code.claude.com/docs/en/hooks, live doc, accessed 2026-09-30.
- [S13] "Effective harnesses for long-running agents," Justin Young, Anthropic Engineering blog, 2025-11-26, https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents, accessed 2026-09-30.
- [S15] "OpenClaw — Moltbot Renamed Again," OpenClaw blog, 2026-01-29/30, https://openclaw.ai/blog/introducing-openclaw, accessed 2026-09-30.
- [S16] "A sane but bull case on Clawdbot / OpenClaw," Brandon Wang, 2026-02-03, https://brandon.wang/2026/clawdbot, accessed 2026-09-30.
- [S17] "Claude Code source leak: what to learn [for] AI agents 2026," Pawel Jozefiak, Substack (thoughts.jock.pl), 2026-04-01, https://thoughts.jock.pl/p/claude-code-source-leak-what-to-learn-ai-agents-2026 — **unverified/single-source claim, treat with skepticism**, accessed 2026-09-30.
- [S18] Hacker News / Algolia search results (multiple stories: OpenClaw/Clawdbot/Moltbot rename and security threads, Terminal-Bench threads, "harness matters" threads), https://hn.algolia.com/api/v1/search, accessed 2026-09-30 (headlines/metadata only, used for dates and cross-references; underlying articles not all independently opened — see Unverified).
- [S19] "1-Click RCE to steal your Moltbot data and keys" (CVE-2026-25253), depthfirst.com, 2026-02-01, https://depthfirst.com/post/1-click-rce-to-steal-your-moltbot-data-and-keys, accessed 2026-09-30.
- [S20] "Malicious skills targeting Claude Code and Moltbot users," opensourcemalware.com, 2026-01-30, https://opensourcemalware.com/blog/clawdbot-skills-ganked-your-crypto, accessed 2026-09-30.
- [S21] "OpenClaw surpasses React to become the most-starred software project on GitHub," star-history.com blog, 2026-03-01/02, https://www.star-history.com/blog/openclaw-surpasses-react-most-starred-software, accessed 2026-09-30.
- [S22] "Improved token efficiency for longer agent runs," Jediah Katz, Connor O'Keefe, Calvin Yee, Cursor blog, 2026-09-23, https://cursor.com/blog/improved-token-efficiency, accessed 2026-09-30.
- [S23] "How Cursor Router chooses the right model for the task," Connor O'Keefe & Yuri Volkov, Cursor blog, 2026-08-06, https://cursor.com/blog/how-cursor-router-works, accessed 2026-09-30.
- [S24] Simon Willison's Weblog, tag listing "agents," https://simonwillison.net/tags/agents/, accessed 2026-09-30 (listing/summary only; individual 2026 posts referenced but not all independently opened).
- [S25] `openai/codex` README, GitHub, https://raw.githubusercontent.com/openai/codex/main/README.md, accessed 2026-09-30.
- [S26] Pi homepage ("a minimal agent harness"), Earendil Inc, https://pi.dev/, accessed 2026-09-30.
- [S27] "Terminal Agents in 2026: Goose, Claude Code, OpenCode, and Pi Compared," outofcontext.dev, 2026-06-25/26, https://outofcontext.dev/blog/goose-claude-code-opencode-pi/, accessed 2026-09-30.
- [S28] Pu homepage ("a slop cannon small enough to fit your pocket" — minimal shell coding-agent harness), https://pu.dev/, accessed 2026-09-30 (thin content; architecture claims not independently confirmed beyond tagline/install instructions).
- [S29] "Why does GPT-5.1 Codex underperform GPT-5 Codex on Terminal-Bench?," Transluce (Docent blog), 2026-02-11 (HN discussion 2026-02-17), https://transluce.org/docent/blog/terminal-bench, accessed 2026-09-30.
- [S30] "Open-weight 27B hits 38% on Terminal-Bench 2.0 (Opus 4.1 hit 38% in Aug 2025)," Antigma, 2026-04-24, https://antigma.ai/blog/2026/04/24/offline-coding-models, accessed 2026-09-30.
- [S31] "Context Engineering for AI Agents: Lessons from Building Manus," Manus blog, 2025-07-18, https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus, accessed 2026-09-30.
- [S32] "Ralph Wiggum as a Software Engineering Technique" (title inferred from content), Geoffrey Huntley, ghuntley.com, 2025-07-14, https://ghuntley.com/ralph/, accessed 2026-09-30.
- [S33] Terminal-Bench homepage/leaderboard (v4.0 snapshot), Stanford/Harbor/Laude Institute, https://www.tbench.ai/, accessed 2026-09-30.
