# Deep agents: устройство Claude Code, Cursor и OpenClaw — field-report notes

Lens: what actually bites in production, per HN/GitHub/blog field reports, as of 2026-09-30.
Cross-links: context compaction/CLAUDE.md → ch.02 (context engineering); tool design → ch.03;
skills mechanics → ch.06; agent-to-agent messaging → ch.07/13; MCP → ch.05; security incidents →
ch.16; evals/benchmarks → ch.17; memory files → ch.11.

## TL;DR (what an engineer must know today)

- "Deep agent" is not a marketing term with one owner — it's LangChain's (Harrison Chase, Jul 2025)
  name for a recipe: **detailed system prompt + planning tool + sub-agents + filesystem** [S2].
  LangChain shipped this as the open-source `deepagents` package, explicitly "inspired by Claude
  Code: an attempt to identify what makes it general-purpose, and push that further" [S1].
- Claude Code's own todo list is explicitly *not* task tracking for the user — Chase quotes it as
  "basically a no-op... just context engineering strategy to keep the agent on track" [S2]. This
  matters: planning tools work by keeping goals in the model's recent attention, not by being real
  state machines (Manus calls this "recitation": rewriting `todo.md` every loop iteration to "push
  the global plan into the model's recent attention span" over an average 50-tool-call task [S14]).
- The four deep-agent pillars map cleanly onto Claude Code's own shipped feature set:
  planning=TodoWrite/plan mode, subagents=Task/Agent tool + `.claude/agents/`, filesystem=the repo
  itself as working memory, detailed prompt=CLAUDE.md + skills [S4][S5][S6].
- As of Sept 2026 the Claude Agent SDK is the productized version of this: "the same tools, agent
  loop, and context management that power Claude Code," embeddable as a Python/TS library, distinct
  from the interactive CLI and from calling the raw Claude API yourself [S3].
- Anthropic's own team now runs **dynamic workflows** — JS files with `agent()`, `parallel()`,
  `pipeline()` primitives — to orchestrate many subagents from one script, shipped 2026-06-02, aimed
  at three named failure modes: agentic laziness, self-preferential bias in verification, and goal
  drift [S8]. Six composable patterns are named: classify-and-act, fan-out-and-synthesize,
  adversarial verification, generate-and-filter, tournament, loop-until-done [S8].
- OpenAI's parallel story (Codex, "harness engineering," their internal 0-manually-written-code
  product): after 5 months, ~1M LOC, ~1500 merged PRs, 3.5 PRs/engineer/day and *rising* as the team
  grew from 3 to 7 engineers [S30]. Their single biggest lesson: **"give Codex a map, not a
  1,000-page instruction manual"** — a giant AGENTS.md rots, becomes non-guidance, and can't be
  mechanically verified; they cut it to ~100 lines as a table of contents into a structured `docs/`
  tree [S30]. This is the *opposite* emphasis from LangChain's "detailed system prompt" pillar —
  record both.
- Field reports converge on: **CLAUDE.md doesn't scale past one agent.** Running 10-15 concurrent
  Claude Code agents, one operator found "CLAUDE.md is a terrible abstraction... loads
  unconditionally... stack from your working directory upward... wasted tokens and confusion,"
  ranked skills as "bad, but not as bad," and recommends a hierarchical knowledge base with real
  progressive disclosure instead [S18].
- OpenClaw (né Warelay → Clawdbot/Clawd → Moltbot → OpenClaw, Nov 2025–Jan 2026) is the most-cited
  "ambient/deep agent" outside coding: gateway daemon + channels (WhatsApp/Telegram/Slack/Discord/
  iMessage/20+) + companion apps, with a 1-click RCE (CVSS 8.8) disclosed one month after its final
  rename [S10][S22][S23].
- Ralph Wiggum loops (Geoffrey Huntley, named after the Simpsons "loop" meme; term picked up widely
  in 2026 field reports) are a minimal deep-agent pattern: **one task per loop, in a single
  repository, as a single (non-multi-agent) process** — deliberately the opposite of
  agent-to-agent swarms, because "non-deterministic microservices" are "a red hot mess" [S31]. OpenAI
  explicitly names their own review-until-satisfied loop as "effectively... a Ralph Wiggum Loop" [S30].
- Anthropic's own April 2026 postmortem is direct evidence that harness bugs — not model
  regressions — can look exactly like "the model got dumber": a caching bug cleared thinking
  history every turn instead of once, causing repeated forgetfulness and faster limit burn, for
  15 days before the fix [S9].
- Terminal-Bench (v0.1.1 core dataset; v4.0 as of this research) is explicitly "a dataset of
  tasks, and an **execution harness** that connects a language model to our terminal sandbox" —
  the benchmark bakes the harness question into its own name [S35]. SWE-bench spun up a leaderboard
  specifically to compare models "without fancy agent scaffolds" — implicit admission the default
  leaderboard conflates model skill and harness skill [S36].
- Nothing here is settled: three different vendors (LangChain/Anthropic/OpenAI) ship three
  differently-weighted versions of "deep agent," and practitioners in the wild already say the
  CLAUDE.md/AGENTS.md convention itself needs replacing at scale [S18][S30].

## Current state and versions (as of 2026-09-30)

- **deepagents** (LangChain/LangGraph): current PyPI package, `pip install`/`uv add deepagents`;
  JS/TS port `deepagentsjs`; also ships **Deep Agents Code**, "a pre-built coding agent in your
  terminal, similar to Claude Code or Cursor, powered by any LLM," installed via
  `curl -LsSf https://langch.in/dcode | bash` [S1]. Built on LangGraph for streaming/persistence/
  checkpointing, LangSmith for tracing/eval.
- **Claude Agent SDK**: current name (renamed from "Claude Code SDK" — a migration guide exists at
  `/docs/en/agent-sdk/migration-guide`) [S3]. Capabilities table: built-in tools, hooks, subagents,
  MCP, permissions, sessions, skills/commands/memory, plugins [S3]. Separate TS and Python
  changelogs on GitHub (`anthropics/claude-agent-sdk-typescript` / `-python`) [S3].
- **Claude Code** subagent frontmatter fields as of this doc snapshot include newer additions like
  `effort` (low/medium/high/xhigh/max), `isolation: worktree`, `background`, `memory` (persistent,
  scoped user/project/local), `skills` (preload list) — this is a materially richer spec than the
  original "just a system prompt + tool list" subagent design [S4].
- **Cursor**: shipped two harness-relevant posts same day, 2026-09-23 — token-efficiency work
  (trimmed ~66% of system prompt, dynamic tool loading, cache-breakpoint tuning) and two new
  reviewer/ops bots, Rollouts and Security Reviewer, available on Teams/Enterprise [S15][S16].
- **OpenAI Codex CLI**: open-source (Apache-2.0), repo structure `codex-cli` + `codex-rs` (Rust
  core) + `sdk`; installable via curl installer, npm (`@openai/codex`), Homebrew [S7].
- **OpenClaw**: current name since 2026-01-30 ("The Great OpenClaw Migration," executed in three
  hours at 4am GMT) [S23]; stewarded by the OpenClaw Foundation (independent 501(c)(3)); OpenAI is
  listed as a donor, "not an owner" [S22]. Node 24.16+/26.1+ required; npm package `openclaw` [S22].
- **Pi** (agent core credited in OpenClaw's README, "thanks... for pi"): `earendil-works/pi` on
  GitHub, 110.7k stars, MIT-licensed, explicitly ships **no built-in permission system** for
  filesystem/process/network/credential access — sandboxing is the deployer's job [S25]. Per a
  comparison piece, Pi's company transitioned to "Earendil Works" around April 2026 [S21].
- **Superpowers** (obra/superpowers, by Jesse Vincent/Prime Radiant): a skills-based methodology
  layered on top of *any* coding agent — Claude Code, Codex App/CLI, Cursor, Antigravity, Devin CLI,
  Factory Droid, Gemini CLI, GitHub Copilot CLI, Grok Build CLI, Kimi Code, OpenCode, Pi, Qwen Code,
  Hermes, Muse — i.e. treated as a harness-portable spec, not a Claude Code plugin [S26].
- **Terminal-Bench**: task set "Terminal-Bench-Core v0.1.1" backs "the current leaderboard" at time
  of README; site shows "Terminal-Bench 4.0" as of this research pass, columns Model / Agent /
  Resolution Rate / Cost / Tokens — i.e. the leaderboard is already agent(harness)-aware by design,
  not model-only [S35].

## Timeline (dated)

- **2025-07-18/19** — Manus posts "Context Engineering for AI Agents: Lessons from Building
  Manus": KV-cache design, mask-don't-remove, filesystem-as-context, recitation, keep errors in
  context, avoid few-shot ruts [S14].
- **2025-07-30** — Harrison Chase (LangChain) publishes "Deep Agents," naming the four-pillar
  definition and announcing the `deepagents` package [S2].
- **2025-11-25 → 2026-01-27** — OpenClaw's first life: Warelay (WhatsApp gateway) → Clawd →
  "Clawdbot" [S23].
- **2026-01-12** — Anthropic ships **Cowork** (research preview): "Claude Code for the rest of your
  work" — an ambient/ deep-agent-style assistant beyond coding; HN 1298 pts/565 comments [S28].
- **2026-01-14** — PromptArmor discloses Claude Cowork file-exfiltration via prompt injection in an
  uploaded "Skill"-styled .docx, ~2 days after Cowork's release; HN 870 pts/399 comments [S27].
- **2026-01-17** — Geoffrey Huntley publishes "everything is a ralph loop," reframing Ralph as a
  monolithic, single-task-per-loop pattern explicitly against multi-agent orchestration hype [S31].
- **2026-01-27** — Anthropic trademark cease-and-desist forces an emergency rename; Discord votes
  at 5am; **Moltbot** wins [S23].
- **2026-01-30** — Moltbot renamed **OpenClaw** at 4am GMT, "The Great OpenClaw Migration" [S23].
- **2026-01-28 → 01-31** — `obra/superpowers` gains HN visibility as "an agentic skills framework
  for Claude Code, Codex, OpenCode" [own HN search].
- **2026-01-31** — GHSA-g8p2-7wf7-98mq: 1-click RCE in Clawdbot/OpenClaw Control UI (CVSS 8.8),
  patched in v2026.1.29 [S10].
- **~early 2026 (undated on page, inferred ~Jan)** — OpenAI publishes "Harness engineering:
  leveraging Codex in an agent-first world," describing 5 months / ~1M LOC / ~1500 PRs of
  zero-manually-written-code development [S30].
- **2026-02-03** — SANS ISC diary "Detecting and Monitoring OpenClaw (clawdbot, moltbot)" — security
  community treats it as a thing to be *hunted* in corporate environments, not just adopted [S11].
- **2026-03-04** — Claude's default reasoning effort silently drops `high`→`medium` to fix UI
  freezing; users report the model "got dumber" [S9].
- **2026-03-26** — the caching bug is introduced (see Pitfalls): `clear_thinking_20251015` header
  bug clears thinking history every turn instead of once [S9].
- **2026-04-01** — "Real-time dashboard for Claude Code agent teams" ships on HN (77 pts); confirms
  subagent trees are tracked via parent-agent-id in the hooks payload [S19].
- **2026-04-07** — reasoning-effort default reverted to `high` [S9].
- **2026-04-10** — caching/thinking bug fixed, after roughly 15 days live [S9].
- **2026-04-16 → 04-20** — a "≤25 words between tool calls" system-prompt verbosity instruction
  ships, causes a measured 3% coding-quality drop on Opus 4.6 and 4.7, reverted [S9].
- **2026-04-23** — Anthropic publishes the postmortem publicly; HN discussion hits 942 pts / 732
  comments — one of the largest Claude Code threads of the period [S9, HN 47878905].
- **2026-04-29** — field report "Why Codex works better than Claude Code for my production
  monolith" circulates, citing OpenAI's harness-engineering post by name as the reason Codex
  follows workflow discipline better on a messy legacy codebase [S33].
- **2026-05-26/27** — "Claude Code as a Daily Driver" long-form post goes viral (451 pts/254
  comments): CLAUDE.md minimalism, skills anatomy, subagent chaining, MCP picks, `/voice` claimed
  ~3x faster than typing [S17][S20].
- **2026-06-02** — Claude Code team ships **dynamic workflows** (`agent()`/`parallel()`/
  `pipeline()`) for multi-subagent orchestration from script [S8].
- **2026-06-05** — "Lessons learned from running Claude Code swarms at scale" (fleet tool):
  CLAUDE.md/skills/plugins critique, skills budget silently drops rarely-used skills from
  background sessions [S18].
- **2026-06-15/16** — Anthropic pauses, then resumes, separate API-credit billing inside Claude
  Code [S21].
- **2026-06-26** — outofcontext.dev publishes "Terminal Agents in 2026" comparing Goose, Claude
  Code, OpenCode, Pi on providers, LSP integration, extensibility [S21].
- **2026-08-14** — Claude Code cross-session messaging (`ListAgents`/`SendMessage`, `/peers`)
  defaults incoming messages to auto-accept unless disabled [S34, fastnewsdev #370].
- **2026-09-16** — "Cowork and chat are now one Claude" — the ambient-assistant product line is
  folded back into the main Claude surface, 234 pts/225 comments [S29].
- **2026-09-23** — Cursor ships token-efficiency post (system-prompt trimmed ~66%, dynamic tool
  loading cuts static description tokens 60%) and the Rollouts + Security Reviewer bots, same
  day [S15][S16].
- **2026-09-27/28** — Russian channel fastnewsdev posts on session-to-session messaging, OpenClaw
  talk recap, and continued skepticism about "1M token context" claims, citing Lost-in-the-Middle
  (2023) as still-valid evidence that >200k tokens is where quality degrades [S34, #370, #360].

## Mechanics

### The deep-agent recipe, and where it's contested

LangChain's canonical four pillars, quoted directly from the WebFetch of the blog [S2]:
1. **Detailed system prompt** — "Claude Code's recreated system prompts are long. They contain
   detailed instructions on how to use tools... Without these system prompts, the agents would not
   be nearly as deep."
2. **Planning tool** — "Claude Code uses a Todo list tool... It's basically a no-op. It's just
   context engineering strategy to keep the agent on track."
3. **Sub-agents** — task decomposition into narrower, isolated-context agents.
4. **File system** — a "shared workspace" for memory/notes across a long-running task.

The `deepagents` README [S1, VERBATIM] lists the shipped feature surface directly:
```
**Features include:**
- Sub-agents — delegate tasks to agents with isolated context windows
- Filesystem — read, write, edit, or search over pluggable local, sandboxed, or remote backends
- Context management — summarize long threads and offload tool outputs to disk
- Shell access — run commands in your sandbox of choice
- Persistent memory — pluggable state and store backends for cross-session recall
- Human-in-the-loop — approve, edit, or reject tool calls before they run
- Skills — reusable behaviors the agent can load on demand
- Tools — bring your own functions or any MCP server
```
Note skills and shell access are *additions* beyond the original four-pillar 2025 definition —
the package has grown past its own naming post. Security posture is stated bluntly: **"Deep Agents
follows a 'trust the LLM' model. The agent can do anything its tools allow. Enforce boundaries at
the tool/sandbox level, not by expecting the model to self-police."** [S1, VERBATIM]

Quickstart, COPIED VERBATIM from the README [S1]:
```python
from deepagents import create_deep_agent

agent = create_deep_agent(
    model="openai:gpt-6-astra",
    tools=[my_custom_tool],
    system_prompt="You are a research assistant.",
)
result = agent.invoke({"messages": "Research LangGraph and write a summary"})
```

**OpenAI's contested counterpoint** on pillar #1 [S30, VERBATIM]: they tried "the 'one big
`AGENTS.md`' approach. It failed in predictable ways":
- "Context is a scarce resource... the agent either misses key constraints or starts optimizing
  for the wrong ones."
- "Too much guidance becomes *non-guidance*... Agents end up pattern-matching locally instead of
  navigating intentionally."
- "It rots instantly... Agents can't tell what's still true, humans stop maintaining it."
- "It's hard to verify... drift is inevitable."

Their fix: **"give Codex a map, not a 1,000-page instruction manual"** — AGENTS.md shrunk to
~100 lines as a table of contents pointing into a structured, CI-linted `docs/` tree with
"execution plans" as first-class, versioned, checked-in artifacts (referencing the
`codex_exec_plans` cookbook pattern) [S30]. This is the single sharpest disagreement in the
sources between "detailed system prompt" (LangChain's pillar) and "minimal map + mechanically
enforced structure elsewhere" (OpenAI's field lesson at scale).

### Claude Code's own architecture, as documented

**Subagents** [S4]: Markdown + YAML frontmatter files. Minimal required fields are just `name` and
`description`; everything else optional. Priority order for where they live, highest first:
managed settings (org-wide) → `--agents` CLI flag (session) → `.claude/agents/` (project) →
`~/.claude/agents/` (personal) → plugin's `agents/` dir. Three built-ins ship by default:
**Explore** (read-only, fast search, model capped at Opus even if main session is above that),
**Plan** (read-only research during plan mode), **General-purpose** (every tool, fallback for
unmatched tasks). Nested subagent spawning defaults to 3 layers deep
(`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`). A distinct **fork** mode exists: a fork subagent inherits
the *entire* conversation (not a fresh system prompt), shares the prompt cache with the main
session, and runs in the background by default in interactive sessions — this is architecturally
different from a spawned subagent and is invoked via `/subtask`.

VERBATIM subagent frontmatter example from the docs [S4]:
```yaml
---
name: code-reviewer
description: Reviews code for quality and best practices
tools: Read, Glob, Grep
model: sonnet
permissionMode: acceptEdits
maxTurns: 10
skills: api-conventions, error-handling-patterns
memory: project
omitClaudeMd: false
---
```
Persistent **subagent memory** is scoped `user` (`~/.claude/agent-memory/<name>/`, cross-project),
`project` (`.claude/agent-memory/<name>/`, shareable via VCS), or `local` (gitignored) — loaded
automatically into the subagent's system prompt [S4].

**Hooks** [S5]: five handler types — `command` (shell, stdin JSON), `http` (POST), `mcp_tool`,
`prompt` (single-turn model eval), `agent` (subagent-based verification, marked experimental).
Exit code 2 is a hard block regardless of JSON output; exit 0 + JSON lets a hook return a structured
`permissionDecision`. VERBATIM block example [S5]:
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Destructive command blocked by hook"
  }
}
```
Config resolution nests: matcher (tool/event/regex) → `if` (permission-rule-syntax filter) →
handler. Security notes explicitly documented: project-level hooks require workspace trust; user
(`~/.claude`) hooks always run; `allowedEnvVars`/`allowedHttpHookUrls` restrict interpolation and
HTTP destinations; hooks can't access `/dev/tty` (no controlling terminal) [S5].

**Skills** [S6]: "a `SKILL.md` file with instructions"; custom commands were merged into skills —
`.claude/commands/deploy.md` and `.claude/skills/deploy/SKILL.md` both create `/deploy`. Only the
frontmatter (description) loads into context up front; the body loads on demand — this is the
progressive-disclosure claim independently confirmed (critically) by the fleet-tool field
report [S18] and by arps18's estimate of "~100 tokens" for frontmatter-only load [S17].

**Dynamic workflows** [S8]: JS files with three primitives — `agent()` spawns one subagent,
`parallel()` fans out and waits, `pipeline()` streams items through sequential stages. Claude
itself "decides which models an agent uses and whether subagents are run in their own worktree."
Named failure modes these guard against: **agentic laziness** (stopping early), **self-preferential
bias** (an agent favoring its own output during verification — i.e. don't let the implementer
review itself), **goal drift** (losing fidelity to the original ask over a long run) [S8]. Sessions
resume mid-workflow if interrupted [S8]. This is the same primitive shape used by *this very
research task* (the orchestrating workflow script that spawned this subagent) — a concrete,
first-person confirmation that the pattern is in production internal use, not just marketing copy.

**Compaction** — caveat: primary source is a third-party reverse-engineering blog, not an
official Anthropic spec, flag accordingly [S13]. Claimed mechanics: auto-compaction triggers when
"free space" (reserved headroom for output + the summarization step itself) drops below threshold;
throttled, "doesn't re-compute on every token." The compaction summary contract allegedly requires:
user intent, key technical decisions, files touched and why, errors and fixes, pending tasks, and
"a next step that matches the most recent user intent." A "microcompaction" tier keeps a small hot
tail of recent tool results fully visible and pushes older ones to "cold storage, referenced by
path." Restoration order after compaction: boundary marker → summary injection → re-read of most
recently accessed files → todo list restore → plan state restore → hook output reinstatement →
continuation message telling the model to proceed "without asking the user any further
questions" [S13]. **No official Anthropic token-threshold numbers were found** — treat all
specifics here as unverified/third-party until cross-checked against an Anthropic primary source.

**Cross-session agent messaging** (Claude Code, confirmed only via a Russian field-report channel,
not yet found in official docs during this pass) [S34, fastnewsdev #370]: sessions can message
each other via two tools, `ListAgents` and `SendMessage`, plus a `/peers` command — "one found a
breaking change, warned the one building on top of it." Only text is passed, no history or files.
Since 2026-08-14, incoming messages are auto-accepted under the default `auto` mode unless
disabled — a design choice with an obvious cross-session prompt-injection-shaped risk surface that
the source flags with a warning emoji but doesn't fully spell out [S34].

### OpenClaw architecture

Self-description [S22, VERBATIM]: "OpenClaw is an open-source AI assistant that runs on your own
computer and meets you in the channels you already use: Discord, iMessage, Slack, Teams, Telegram,
WhatsApp, and 20+ more, plus native apps for macOS, iOS, Android, Windows, and Linux. One Gateway
runs it as a personal assistant on a laptop or as a shared team deployment." Model/harness choice
(Claude, Codex, local models) is explicitly a swappable plugin layer, "without changing anything
else" [S22].

Gateway architecture [S24]: single long-lived daemon, "maintains provider connections," "exposes a
typed WS API (requests, responses, server-push events)." Three connection types: control-plane
clients (macOS app/CLI/web UI), Nodes (device-local, `role: node`), WebChat (static UI hitting the
same WS API). Wire handshake: **"First frame must be connect"**; request shape
`{type:"req", id, method, params}`. Event types include agent, chat, presence, health, **heartbeat,
cron** — confirming the scope note's "heartbeat/cron" claim [S24]. Scheduling: "Gateway kernel owns
one GatewayScheduler for registered maintenance and cron wakeups." Idempotency keys required for
side-effecting methods (send, agent). All WS clients carry a device identity; new devices need
pairing approval; loopback may auto-approve, remote/Tailnet requires explicit approval [S24].
Security guidance in the README itself: "Treat inbound messages as untrusted input,"
"Tools run on the host for the main session unless you configure sandboxing" [S22].

Naming history [S23, from docs.openclaw.ai/start/lore]: **Warelay → Clawd/Clawdbot (Nov 25 2025 –
Jan 27 2026) → Moltbot (Jan 27–30 2026, after an Anthropic trademark cease-and-desist forced an
emergency 5am Discord vote) → OpenClaw (Jan 30 2026 onward, "The Great OpenClaw Migration," done in
three hours at 4am GMT)**. Created by Peter Steinberger for a mascot named "Molty" (a Claude
instance living in `~/.openclaw/workspace/` with markdown-file persistent memory — directly
relevant to ch.11's memory-files pattern). Credits Mario Zechner (earendil-works) for the "pi"
agent core [S23][S25].

Pi core [S25]: modular toolkit — Coding Agent CLI, "Agent Core Runtime" (tool invocation + state),
a unified multi-provider LLM API (OpenAI/Anthropic/Google/etc.), a "Durable Runtime" for persistent
conversations/tasks/documents, and a terminal-UI library with differential rendering. Explicitly
documented: **"Pi does not include a built-in permission system for restricting filesystem,
process, network, or credential access"** — sandboxing is left entirely to the deployer, e.g. via
containerization [S25, VERBATIM]. 110.7k GitHub stars at time of fetch.

### Ralph loops and minimal deep agents

Huntley's framing, VERBATIM [S31]: **"Ralph is monolithic. Ralph works autonomously in a single
repository as a single process that performs one task per loop."** Deliberately contrasted with
multi-agent hype: "Consider what microservices would look like if the microservices (agents)
themselves are non-deterministic — a red hot mess." Practically, ralphing is "doing the loop
manually via prompting or via automation with a pause that involves having to press CTRL+C to
progress onto the next task" — i.e. a human-in-the-loop verification gate is part of the pattern,
not an afterthought. It's framed as a generic context-engineering technique, not coding-specific.

OpenAI's Codex harness explicitly names its own review-loop as an instance of this pattern:
**"instruct Codex to review its own changes locally, request additional specific agent reviews
both locally and in the cloud, respond to any human or agent given feedback, and iterate in a loop
until all agent reviewers are satisfied (effectively this is a Ralph Wiggum Loop)"** [S30,
VERBATIM, links to ghuntley.com/loop]. This is the clearest documented convergence in these notes
between an informal community pattern (2026-01-17 blog post) and production usage at a frontier
lab within roughly the same window.

### Manus's context-engineering rules for long-running agents

VERBATIM/paraphrased highlights [S14], all measured against Manus's own production agent:
- Average input:output token ratio ~100:1 → KV-cache hit rate is the dominant cost/latency lever.
- Cached vs uncached token cost with Claude Sonnet: **$0.30/MTok cached vs $3/MTok uncached** — a
  10x multiplier [S14, condition: Claude Sonnet pricing as of the source's writing, mid-2025].
- "Mask, don't remove" — never dynamically add/remove tool defs mid-run (breaks cache prefix);
  use logit masking over a stable, full tool list instead.
- Filesystem as "the ultimate context... unlimited in size, persistent by nature, and directly
  operable by the agent itself" — externalize large content (page bodies) but keep pointers
  (URLs, paths) so it's restorable.
- "Leave the wrong turns in the context" — don't sanitize failed actions/errors out of history;
  the model needs to see its own mistakes to avoid repeating them.
- "Don't get few-shotted" — structured variation in serialization prevents the agent from
  overfitting to repeated example shapes in its own trace.

### Harness-vs-model evidence in benchmarks

Terminal-Bench bakes the distinction into its name and its leaderboard columns
(Model / **Agent** / Resolution Rate / Cost / Tokens) [S35, VERBATIM: "a dataset of tasks, and an
**execution harness** that connects a language model to our terminal sandbox"]. SWE-bench
maintainers separately shipped a leaderboard explicitly framed as comparing "LMs without fancy
agent scaffolds" [S36] — an implicit admission that the flagship SWE-bench leaderboard conflates
model quality with harness/scaffold quality, which is exactly the confound this chapter should
flag when citing any agent benchmark number.

## Numbers (with conditions and source)

- **10:1 → 100:1** — Manus's observed input:output token ratio in production, cited as the reason
  KV-cache design dominates their cost model [S14, Manus production traffic, mid-2025].
- **$0.30 vs $3 per MTok** — cached vs uncached token cost, Claude Sonnet, as quoted by Manus
  [S14, condition: Claude Sonnet pricing at time of writing, mid-2025 — verify current pricing in
  ch.01 notes, this is stale by ~14 months].
- **~50 tool calls** — Manus's stated average task length that motivates their "recitation"
  (todo.md rewriting) technique [S14].
- **~1,000,000 LOC / ~1,500 merged PRs / 3.5 PRs per engineer per day** — OpenAI's internal
  zero-manually-written-code product, over 5 months, team grown from 3 to 7 engineers, throughput
  *increasing* with team size [S30, OpenAI internal beta, self-reported, no independent audit].
- **~66% reduction** in Cursor's system-prompt size, and **60%** cut in static tool-description
  tokens via dynamic loading; **46.9%** total-token reduction specifically for MCP-tool-calling
  sessions (an earlier, related change); **20%** fewer cold cache misses; **1.6%** fewer
  cache-read tokens from sparser line numbering (every 10th line instead of every line); net
  **7%** token-cost reduction for users "without reducing agent quality" [S15, Cursor's own
  measurement, published 2026-09-23, no external benchmark].
- **4.8 → 3.8 minutes** review time, **45–50% → 60–70%** comment-acceptance rate for Cursor's
  Security Reviewer bot [S16, Cursor's own reported metrics, published 2026-09-23].
- **3% drop** in coding quality for both Opus 4.6 and 4.7, from a since-reverted "≤25 words between
  tool calls" system-prompt instruction, combined with other concurrent changes [S9, Anthropic's
  own internal eval, April 2026 — note this is *combined effect*, not isolated to the one prompt
  line per the postmortem's own wording].
- **~15 days** (Mar 26 → Apr 10 2026) that a cache-clearing bug shipped live in Claude Code,
  causing repeated context loss and faster usage-limit consumption, before being fixed and limits
  reset for all subscribers [S9].
- **CVSS 8.8**, 1-click RCE, OpenClaw/Clawdbot Control UI, versions ≤v2026.1.28, patched
  v2026.1.29 [S10, GitHub Security Advisory, disclosed 2026-01-31].
- **110.7k GitHub stars** — `earendil-works/pi`, snapshot at fetch time 2026-09-30 [S25].
- **942 pts / 732 comments** — HN reception of Anthropic's own April 23 postmortem, one of the
  largest Claude Code-related threads found in this research pass [HN item 47878905, 2026-04-23].
- **451 pts / 254 comments** — "Claude Code as a Daily Driver" HN thread [item 48289950,
  2026-05-27].
- **1298 pts / 565 comments** vs **870 pts / 399 comments** — HN reception of Claude Cowork's
  launch vs. of its file-exfiltration disclosure two days later — comparable in scale, security
  story nearly matched the launch's own attention [S28][S27].
- **"over 60k open-source projects"** claim to use the AGENTS.md convention, per agents.md's own
  landing page [S32, self-reported by the spec's maintainers, no independent count].

## Pitfalls, limits, criticism

- **CLAUDE.md doesn't scale to fleets.** Direct quote from a field report running 10-15 concurrent
  agents: "These files load unconditionally, they often contain descriptions irrelevant to the
  task at hand, and they stack from your working directory upward. The result is wasted tokens and
  confusion from injecting irrelevant instructions into the session." Skills are "one level
  better" via progressive disclosure but "still don't let you scale — you can't create 10K
  skills, as that would eat your entire usable context." A **skills budget** was reportedly
  introduced that "silently drops less frequently used skills from the session entirely," still
  invokable interactively but not by the model in background sessions [S18, VERBATIM,
  2026-06-05 — this specific claim about a "skills budget" is from a single practitioner's
  observation, not confirmed in official docs read during this pass; flag as unverified pending
  cross-check].
- **Plugins can silently double-install**, each copy consuming its own token budget for duplicated
  instructions — the same field report found this during a cleanup pass [S18].
- **Harness bugs masquerade as model regressions.** Anthropic's own postmortem is the clearest
  documented case: users correctly perceived "Claude got dumber/forgetful," root cause was a
  caching implementation bug, not a model weight or routing change [S9]. This should make
  engineers skeptical of "model X got nerfed" claims without harness-level verification —
  fastnewsdev's channel independently voices the same "Opus 5 отупел" (got dumber) suspicion around
  routing to unreleased successor models for A/B testing, unconfirmed [S34, #313].
- **The 1M-token-context marketing claim is disputed in the field.** "Нельзя [пихать больше 200к].
  Больше 200к пихать в модель бессмысленно... Lost in the middle, 2023 год" — i.e. practitioners
  cite the original 2023 Lost-in-the-Middle finding as still operative in 2026 despite headline
  context windows growing, and design skill-splitting workflows (Matt Pocock's skills, SDD-style
  staged sessions) specifically to keep any single session under 100-200k tokens [S34, #360].
- **Cross-session auto-accept is a real attack surface.** Claude Code's `SendMessage`/`ListAgents`
  inbox defaults to auto-accepting incoming messages from other sessions as of 2026-08-14 unless
  explicitly disabled — a channel with no history/file transfer but text-only injection potential
  between sessions that may have different trust levels [S34, #370].
- **Claude Cowork's exfiltration bug**: hidden prompt injection in an uploaded file (styled as a
  "Skill," 1-point/white-on-white text concealment) instructed the agent to exfiltrate local files
  via a curl request to the attacker's own Anthropic API account — because "the Anthropic API is
  whitelisted through Claude's VM network restrictions" even though almost all other outbound
  domains are blocked [S27, VERBATIM finding]. The underlying injection class predates Cowork
  (seen in Claude.ai first) and Anthropic had acknowledged but not fully remediated it before
  Cowork shipped; Opus 4.5 showed "greater injection resistance" but remained exploitable [S27].
- **OpenClaw's whole threat model is "trust the gateway, don't trust anyone else"** — its own
  README says tools "run on the host for the main session unless you configure sandboxing," and
  the security advisory shows the Control UI trusted an unvalidated query parameter and
  auto-connected, leaking the gateway token to an attacker server on a single malicious link click
  [S10][S22]. The SANS ISC diary treats "detect if OpenClaw is running in your environment" as a
  legitimate defensive posture for companies, i.e. it's viewed by some security practitioners as
  closer to unmanaged shadow-IT malware risk than a sanctioned tool [S11].
- **Full-autonomy agent-generated codebases accumulate their own kind of entropy.** OpenAI's own
  post: "Codex replicates patterns that already exist in the repository — even uneven or
  suboptimal ones. Over time, this inevitably leads to drift." Manual Friday cleanup ("20% of the
  week... spend... cleaning up 'AI slop'") didn't scale; they moved to codified "golden
  principles" plus recurring background Codex cleanup tasks instead [S30, VERBATIM].
- **Pi ships zero permission system by design** — anyone building on it must add their own
  sandboxing; this is a stated tradeoff, not an oversight, but it means "Pi-based harness" carries
  meaningfully different default risk than "Claude Code with its permission prompts" [S25].
- **Multi-agent swarms burn rate-limits fast and unevenly.** One HN commenter running "hundreds to
  thousands of dollars a day" in Claude token spend across teams; another notes plugins/skills
  installed broadly can burn tokens "5-10x faster" than a lean setup — reinforcing the CLAUDE.md/
  plugin-bloat pitfall above from an economics angle [S19, HN comments, 2026-04-01].
- **Terminal-agent LSP integration is a double-edged sword** — OpenCode's LSP diagnostics
  integration is praised for typed codebases but the comparison piece warns "language servers can
  desync, eat memory, and slow sessions" [S21].
- **Field disagreement on which harness handles legacy/monolith code better**: one practitioner
  explicitly prefers Codex over Claude Code (Opus 4.6/4.7) for a years-old Python monolith, citing
  Codex's adherence to explicit exec-plan workflows, better existing-tool reuse, and more thorough
  pre-edit code reading; a reply immediately counters that Claude is "obviously superior" for
  design/frontend/UI-consistency work — record both, neither is authoritative, sample size is
  n=1 per source [S33].

## What changed in the last 6 months (since ~April 2026)

- Anthropic's own April 23 postmortem — a rare public admission that three stacked harness/prompt
  bugs (reasoning-effort default, caching/thinking-clear bug, verbosity instruction) degraded
  Claude Code quality for weeks, with usage-limit resets as remediation [S9].
- Claude Code shipped **dynamic workflows** (agent/parallel/pipeline primitives) for scripted
  multi-subagent orchestration, June 2026 — a genuinely new harness layer above the subagent
  primitive, aimed at named failure modes (laziness, self-bias, drift) [S8].
- Claude Code shipped **cross-session messaging** (`ListAgents`/`SendMessage`/`/peers`),
  auto-accept-by-default since mid-August 2026 — sessions now coordinate directly, not just via a
  human relaying context [S34].
- **Claude Cowork** launched (Jan 2026) as a parallel "ambient deep agent" product beyond coding,
  immediately hit a serious exfiltration vulnerability, then was folded back into unified "Claude"
  chat+cowork in September 2026 — a fast product-line consolidation worth noting for ch.11/ch.16
  cross-links [S28][S27][S29].
- Cursor made a coordinated efficiency + trust push on 2026-09-23: token-efficiency engineering
  post plus two new review/ops bots (Rollouts, Security Reviewer) — signals Cursor competing on
  harness engineering transparency, mirroring Anthropic's and OpenAI's own harness-focused posts
  this year [S15][S16].
- OpenClaw went from a WhatsApp gateway side-project to a security-community "thing to hunt for"
  within about 3 months of its final naming (Jan–Feb 2026), with its own detection tooling
  (`openclaw-detect`) referenced by SANS ISC [S11].
- Field consensus is shifting toward **staged, skill-driven, session-scoped workflows** (Matt
  Pocock's public skills repo: brainstorming → plan → worktree → TDD → review → merge, each stage
  a fresh sub-200k-token session) as the practical answer to "how do I keep a deep agent from
  losing the plot on a multi-hour task," independent of any official Anthropic/OpenAI guidance
  [S34, #360-361][S26].

## Diagram candidates

1. **Deep-agent four-pillar diagram** — actors: System Prompt, Planning Tool (todo list), Main
   Loop, Sub-agent pool, Filesystem. Arrows: Main Loop reads System Prompt (once, at start); Main
   Loop ↔ Planning Tool (read/update every turn); Main Loop → Sub-agent (spawn, isolated context,
   task string in) ; Sub-agent → Main Loop (summary out only); Main Loop ↔ Filesystem
   (read/write/search, persists across turns and compaction) [S1][S2].
2. **Claude Code subagent resolution/priority stack** — states, highest to lowest priority:
   Managed settings → `--agents` CLI flag → `.claude/agents/` → `~/.claude/agents/` → plugin
   `agents/` dir [S4].
3. **Fork vs. spawned subagent** — two side-by-side boxes: Fork (full history inherited, same
   system prompt/tools/model, shared prompt cache, background by default) vs. Spawned subagent
   (fresh context, own system prompt from frontmatter, own tools/model, separate cache) [S4].
4. **Hook resolution pipeline** — Event fires → Matcher (tool name/regex/wildcard) → `if`
   (permission-rule filter) → Handler (command/http/mcp_tool/prompt/agent) → exit code branch
   (0=parse JSON, 2=hard block, other=non-blocking continue) [S5].
5. **Compaction lifecycle** (flag as third-party/unverified) — Session grows → headroom check →
   trigger → summarize (intent, decisions, files, errors, pending, next step) → boundary marker →
   inject summary → re-read recent files → restore todo/plan/hooks → continuation message [S13].
6. **Dynamic workflow primitives** — three boxes: `agent()` (1→1 spawn), `parallel()` (1→N spawn,
   fan-in wait), `pipeline()` (N sequential stages, streaming) — with the three named failure
   modes (laziness, self-bias, drift) annotated as what the pattern defends against [S8].
7. **OpenClaw system diagram** — Gateway (daemon) at center; spokes out to Channels (WhatsApp/
   Telegram/Slack/Discord/iMessage/20+), Control-plane clients (CLI/macOS app/web UI via WS),
   Nodes (device-local, `role: node`), WebChat; annotate the WS handshake ("first frame must be
   connect") and the pairing/device-identity trust gate [S24].
8. **OpenClaw naming timeline** — a strip: Warelay → Clawd/Clawdbot (Nov 2025–Jan 27 2026) →
   Moltbot (Jan 27–30 2026, 3 days) → OpenClaw (Jan 30 2026–), with the Anthropic C&D event marked
   as the forcing trigger [S23].
9. **Ralph loop vs. multi-agent swarm** — two contrasting diagrams: Ralph (single repo, single
   process, one task per loop, human watches/CTRL+C's between iterations) vs. swarm (N agents,
   non-deterministic, orchestrator, "red hot mess" risk called out explicitly by the source) [S31].
10. **Harness-vs-model confound in benchmarks** — a 2x2 or table: rows = {same model, different
    harness} vs {same harness, different model}; point to Terminal-Bench's Model+Agent columns and
    the SWE-bench "without scaffolds" leaderboard as the evidence base [S35][S36].
11. **AGENTS.md as table-of-contents vs. encyclopedia** — two file-tree diagrams: (a) monolithic
    AGENTS.md with everything inline — rot/crowding-out annotated; (b) ~100-line AGENTS.md pointing
    into `docs/` (architecture.md, quality grades, execution plans) with CI-lint arrows enforcing
    freshness [S30].
12. **Claude Cowork exfiltration chain** — Victim's folder → malicious "Skill" .docx (hidden text)
    → Claude parses injection → curl to Anthropic API (whitelisted domain) with attacker's API key
    → attacker's Anthropic account receives files. Annotate the one trusted domain that breaks the
    VM's otherwise-restrictive egress policy [S27].

Chart candidates: Cursor's token-efficiency numbers (66% prompt cut / 60% tool-desc cut / 46.9%
MCP-session cut / 20% fewer cache misses / 1.6% cache-read reduction / net 7%) as a single
before/after bar set, sourced and dated 2026-09-23 [S15]; OpenAI's PR-throughput-per-engineer curve
over the 5-month, 3→7-engineer period if the underlying data were public (currently only the two
endpoints — 3.5 PRs/engineer/day and "increasing" — are known; flag the trend line itself as
qualitative/unverified) [S30].

## Glossary

- **Deep agent**: LangChain's term (Chase, 2025) for an agent harness combining a detailed system
  prompt, a planning tool, sub-agents, and a filesystem, aimed at long-horizon tasks [S2].
- **Harness**: everything wrapped around a raw LLM call to make it agentic — tool loop, context
  management, permissions, prompt scaffolding; "Agent = LLM + Harness" is cited in the field as the
  current loose-consensus definition, itself criticized as circular [S34, #274].
- **Ralph loop**: a minimal agent pattern — one task per loop, single repo, single process,
  human-supervised iteration — coined/popularized by Geoffrey Huntley, Jan 2026 [S31].
- **Recitation** (Manus term): rewriting a running todo/plan file every loop iteration specifically
  to keep goals inside the model's high-attention recent context [S14].
- **Progressive disclosure**: loading only a skill's short description into context up front, and
  its full body only when invoked — the Skills mechanism's core efficiency claim [S6].
- **Compaction / microcompaction**: summarizing older conversation turns to free context, with a
  "hot tail" of recent tool results kept fully visible and older ones referenced by path
  (third-party description, not confirmed official) [S13].
- **Fork (subagent)**: a Claude Code subagent variant that inherits the full parent conversation
  and cache instead of starting fresh — distinct from a normal spawned subagent [S4].
- **AGENTS.md**: an open, agent-vendor-neutral convention (a README for agents) adopted by 60k+
  projects per its own site, used across Codex, Jules, Aider, goose, OpenCode, Cursor, and more
  [S32].
- **Gateway** (OpenClaw): the single long-lived daemon process that owns provider connections,
  channel connections, scheduling, and the typed WebSocket control API [S24].
- **Molting** (OpenClaw lore): the project's own metaphor for its repeated forced renames,
  explicitly invoked when choosing "Moltbot" — "molting is what lobsters do to grow" [S23].

## Unverified / open questions

- **Claude Code's official, numeric compaction thresholds** (exact token counts that trigger
  auto-compact, exact headroom reserved) — not found in any official Anthropic doc opened in this
  pass; only a third-party blog's qualitative description was available [S13]. Tried: Claude Code
  docs pages for hooks/skills/subagents (none mention numeric thresholds); did not find an
  official "context management" or "compaction" reference page distinct from the SDK docs index.
- **The "skills budget" that silently drops rarely-used skills from background sessions** —
  reported by exactly one practitioner (fleet-tool field report) with no official documentation
  found to corroborate the mechanism or its parameters [S18].
- **OpenAI's harness-engineering post's exact publish date** — the fetched page (via proxy) showed
  no visible dateline; date is inferred from internal text ("late August 2025" first commit +
  "five months later") to be roughly January 2026, and from its being cited by an April 2026 HN
  post; not independently confirmed against an OpenAI-stated publish date.
- **Amp's "Puck" meta-agent** — WebFetch failed with a header-overflow parse error; only its
  existence and a rough date (HN item 48983561, posted 2026-07-20, 2 points) are confirmed. Content
  of the announcement (architecture, relation to subagent orchestration) is unverified — should be
  retried with curl/jina proxy in a follow-up pass.
- **Claude Code's cross-session `SendMessage`/`ListAgents` inbox mechanism** — sourced only from
  the fastnewsdev Telegram channel, itself a secondhand field report; not cross-checked against
  official Claude Code docs during this pass (the `agent-conventions.md` context in this very
  session independently references `ListAgents`/`SendMessage` as real tools, which is corroborating
  but not a published spec).
- **Manus's pricing numbers** ($0.30/$3 per MTok, Claude Sonnet) are from mid-2025 and explicitly
  flagged stale relative to 2026 pricing — needs a fresh check against ch.01's current pricing
  table.
- Could not access Reddit (r/ClaudeAI, r/cursor, r/LocalLLaMA, r/AI_Agents) at all during this
  session — every request (old.reddit.com JSON endpoints, www.reddit.com via WebFetch, teddit
  mirror) returned a login wall, 404, or explicit tool refusal. Field-report coverage in these
  notes is HN- and Telegram-heavy and Reddit-light as a direct result; flag this as a coverage gap
  if the book wants Reddit-sourced quotes specifically.
- Did not verify Cursor's underlying model name "GPT-5.6" (mentioned in the Cursor token-efficiency
  post) against any OpenAI announcement — recorded as-is from the source, unverified whether this
  is OpenAI's actual current model naming as of Sept 2026.
- Habr search was not performed directly (only reached via the fastnewsdev channel's own links to
  habr.com/ru/articles/1029326 and habr.com/p/1034102, both about AG-UI/DI-in-agents, i.e.
  ch.08/ch.09 territory, not directly ch.12) — a dedicated Habr search for "Claude Code",
  "deep agent", "OpenClaw" in Russian was not completed due to time budget; flagged as a gap.

## Sources

- [S1] "deepagents" README, LangChain AI, GitHub (raw.githubusercontent.com/langchain-ai/deepagents/main/README.md), no single publish date (rolling), accessed 2026-09-30
- [S2] Harrison Chase, "Deep Agents", LangChain blog, 2025-07-30, https://www.langchain.com/blog/deep-agents, accessed 2026-09-30
- [S3] Anthropic, "Agent SDK overview", Claude Code docs, https://code.claude.com/docs/en/agent-sdk/overview, accessed 2026-09-30
- [S4] Anthropic, "Subagents", Claude Code docs, https://code.claude.com/docs/en/sub-agents, accessed 2026-09-30
- [S5] Anthropic, "Hooks reference", Claude Code docs, https://code.claude.com/docs/en/hooks, accessed 2026-09-30
- [S6] Anthropic, "Extend Claude with skills", Claude Code docs, https://code.claude.com/docs/en/skills, accessed 2026-09-30
- [S7] OpenAI, `codex` repository, GitHub, https://github.com/openai/codex, accessed 2026-09-30
- [S8] Claude Code team, "A harness for every task: dynamic workflows in Claude Code", Anthropic/Claude blog, 2026-06-02, https://claude.com/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code (mirrored https://claude.dev/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code/), accessed 2026-09-30
- [S9] Anthropic, "An update on recent Claude Code quality reports" (April 23 postmortem), 2026-04-23, https://www.anthropic.com/engineering/april-23-postmortem, accessed 2026-09-30 (HN discussion: item 47878905, 942 pts/732 comments)
- [S10] openclaw/openclaw, GitHub Security Advisory GHSA-g8p2-7wf7-98mq, disclosed 2026-01-31, https://github.com/openclaw/openclaw/security/advisories/GHSA-g8p2-7wf7-98mq, accessed 2026-09-30
- [S11] SANS Internet Storm Center, "Detecting and Monitoring OpenClaw (clawdbot, moltbot) in your environment", 2026-02-03, https://isc.sans.edu/diary/32678, accessed 2026-09-30
- [S12] Amp, "Meet Puck", https://ampcode.com/news/meet-puck — fetch failed (parse error); existence/date only via HN item 48983561, 2026-07-20
- [S13] decodeclaude.com, "Context Management in Claude Code (Compaction) — deep dive" (unofficial/third-party), https://decodeclaude.com/compaction-deep-dive/, HN discussion posted 2026-01-31, accessed 2026-09-30
- [S14] Manus team, "Context Engineering for AI Agents: Lessons from Building Manus", Manus blog, 2025-07-18/19, https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus, accessed 2026-09-30
- [S15] Cursor (Jediah, Connor & Calvin), "Improved token efficiency for longer agent runs", 2026-09-23, https://cursor.com/blog/improved-token-efficiency, accessed 2026-09-30
- [S16] Cursor (Rustam Lalkaka), "Bots for the last mile: Rollouts, Security Review", 2026-09-23, https://cursor.com/blog/rollouts-and-security-reviewer, accessed 2026-09-30
- [S17] arps18, "Claude Code as a Daily Driver: Claude.md, Skills, Subagents, Plugins, and MCPs", 2026-05-26, https://arps18.github.io/posts/claude-code-mastery/, accessed 2026-09-30
- [S18] Hacker News, "Show HN: Lessons learned from running Claude Code swarms at scale" (user sermakarevich, "fleet"), item 48407998, 2026-06-05, https://news.ycombinator.com/item?id=48407998, accessed 2026-09-30
- [S19] Hacker News, "Show HN: Real-time dashboard for Claude Code agent teams" (user simple10), item 47602986, 2026-04-01, 77 pts/28 comments, https://news.ycombinator.com/item?id=47602986, accessed 2026-09-30
- [S20] Hacker News comments on item 48289950 ("Claude Code as a Daily Driver"), 2026-05-27, 451 pts/254 comments, https://news.ycombinator.com/item?id=48289950, accessed 2026-09-30
- [S21] outofcontext.dev, "Terminal Agents in 2026: Goose, Claude Code, OpenCode, and Pi Compared", HN posted 2026-06-26, https://outofcontext.dev/blog/goose-claude-code-opencode-pi/, accessed 2026-09-30
- [S22] openclaw/openclaw README, GitHub, https://github.com/openclaw/openclaw (raw.githubusercontent.com/openclaw/openclaw/main/README.md), accessed 2026-09-30
- [S23] OpenClaw docs, "Lore" (naming history), https://docs.openclaw.ai/start/lore, accessed 2026-09-30
- [S24] OpenClaw docs, "Architecture", https://docs.openclaw.ai/concepts/architecture, accessed 2026-09-30
- [S25] earendil-works, `pi` repository, GitHub, https://github.com/earendil-works/pi, accessed 2026-09-30
- [S26] obra/superpowers README, GitHub, https://github.com/obra/superpowers, accessed 2026-09-30
- [S27] PromptArmor, "Claude Cowork exfiltrates files", 2026-01-14 (HN disclosure), https://www.promptarmor.com/resources/claude-cowork-exfiltrates-files, accessed 2026-09-30 (HN item 46622328, 870 pts/399 comments)
- [S28] Hacker News, "Cowork: Claude Code for the rest of your work", item 46593022, 2026-01-12, 1298 pts/565 comments, links to https://claude.com/blog/cowork-research-preview, accessed 2026-09-30
- [S29] Hacker News, "Claude Cowork and chat are now one Claude", item 49729412, 2026-09-16, 234 pts/225 comments, links to https://claude.com/blog/cowork-is-now-claude, accessed 2026-09-30
- [S30] OpenAI, "Harness engineering: leveraging Codex in an agent-first world", https://openai.com/index/harness-engineering/ (fetched via r.jina.ai reader proxy due to 403 direct block), accessed 2026-09-30
- [S31] Geoffrey Huntley, "everything is a ralph loop", 2026-01-17, https://ghuntley.com/loop/, accessed 2026-09-30
- [S32] agents.md, "AGENTS.md" spec site, https://agents.md/, accessed 2026-09-30
- [S33] Hacker News, "Why Codex works better than Claude Code for my production monolith", item 47945185, 2026-04-29, 14 pts, https://news.ycombinator.com/item?id=47945185, accessed 2026-09-30
- [S34] Telegram channel t.me/s/fastnewsdev (Nikita Pastukhov, FastStream/AG2 maintainer), various posts #228-#403, accessed 2026-09-30, https://t.me/s/fastnewsdev
- [S35] laude-institute/terminal-bench README, GitHub, https://github.com/laude-institute/terminal-bench (raw.githubusercontent.com/laude-institute/terminal-bench/main/README.md), accessed 2026-09-30
- [S36] Hacker News, "Show HN: New SWE-bench leaderboard compares LMs without fancy agent scaffolds", item 44746077, 2025-07-31, https://www.swebench.com/, accessed 2026-09-30
