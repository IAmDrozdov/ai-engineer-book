# 12. Deep agents: устройство Claude Code, Cursor и OpenClaw — completeness-critic / gap-filler notes

Lens: audit of spec.md, practice.md, field.md against scope + primary sources; fill gaps; freshest state (Jul–Sep 2026).
Source ids here use the prefix **G** so they don't collide with the S-ids in the other three files. Accessed 2026-09-30 unless noted.

## Contradictions resolved

1. **CVE-2026-25253 affected/patched versions.** spec: "all versions up to v2026.1.24-1 vulnerable"; practice: "patched in v2026.1.24-1"; field: "≤v2026.1.28, patched v2026.1.29, CVSS 8.8". **Resolution (primary):** NVD text: "OpenClaw (aka clawdbot or Moltbot) before 2026.1.29 obtains a gatewayUrl value from a query string and automatically makes a WebSocket connection without prompting, sending a token value." CVSS 8.8, NVD published 2026-02-01 [G17]. GHSA-g8p2-7wf7-98mq published 2026-01-31, vulnerable `<=v2026.1.28`, patched `v2026.1.29`, CVSS 8.8 [G19]. field.md is right; spec/practice's "2026.1.24-1" is wrong.
2. **When Clawdbot started.** spec: "2026-01-25/26 launches as a weekend project"; practice: "Nov 2025"; field: "Warelay → Clawd, Nov 25 2025". **Resolution:** the lore page says "Formerly known as Clawd (Nov 25, 2025 - Jan 27, 2026)" and begins with Warelay, a WhatsApp gateway [G25]. The GitHub repo was created 2025-11-24 [G64]. Late January 2026 is when it went viral, not when it launched.
3. **Why it was renamed.** field: "Anthropic trademark cease-and-desist"; practice: "community Discord vote; second rename after trademark/domain due diligence". **Resolution:** the project's own lore says "In January 2026, Anthropic sent a polite email asking for a name change (trademark stuff)… At 5am, Anthropic's email arrived", and that Moltbot was then renamed to OpenClaw (Jan 30, 4am GMT) because "Moltbot never quite rolled off the tongue" [G25]. So: the trademark request caused the first rename (to Moltbot, 2026-01-27). The project's own words are "polite email", not a formal C&D. The second rename (to OpenClaw, 2026-01-30) was a naming choice. The npm package `openclaw` was created 2026-01-29 [G2].
4. **Anthropic's policy on OpenClaw/third-party harnesses.** All three notes compress this to "banned 2026-04-03, reversed 2026-04-21". **Resolution, dated:**
   - Feb 2026: Anthropic reaffirmed its existing ToS ban on using subscriptions through third-party harnesses [G51].
   - 2026-04-03 (announced) / 2026-04-04 12pm PT (effective): billing enforcement. "Starting April 4, third-party tools will draw from extra usage instead of subscription limits." Boris Cherny: "our subscriptions weren't built for the usage patterns of these third-party tools" [G51].
   - 2026-04-21: OpenClaw docs say Claude CLI-style usage is allowed again [G63]. This is about the route that reuses a Claude Code login through the installed `claude` executable [G54].
   - 2026-05-13: Anthropic announced a separate "Agent SDK credit" ($20–$200/month, non-rollover, billed at API rates) for `claude -p`, GitHub Actions and third-party tools [G52].
   - 2026-06-15: that change was paused. Help Center, updated 2026-06-16: "For now, nothing has changed: Claude Agent SDK, `claude -p`, and third-party app usage still draw from your subscription's usage limits" [G53].
5. **Dynamic workflows ship date.** spec: week 22; field: 2026-06-02 (blog). **Resolution:** the changelog entry is v2.1.154, released 2026-05-28 (npm): "Introducing dynamic workflows… tens to hundreds of agents in the background" [G1][G2]. The trigger keyword was originally `workflow`. v2.1.160 (2026-06-01) renamed it to `ultracode` [G1]. v2.1.284 (2026-09-28) made Ultracode its own toggle in `/effort` that "no longer forces xhigh effort" [G1]. So spec's "effort levels … plus ultracode" is outdated as of 2026-09-28.
6. **Nested subagents.** spec: "week 24 (June): subagents allowed to spawn their own subagents". **Resolution:** env-var doc: "In v2.1.217 through v2.1.218, the default was 1 … v2.1.219 raised the default to 3" [G8]. v2.1.219 was released 2026-07-24 [G2]. `CLAUDE_CODE_MAX_SUBAGENTS_PER_SESSION` (default 200) was removed in v2.1.224 and is now a no-op [G8].
7. **Cross-session messaging "auto-accept since 2026-08-14".** field attributes this to a Telegram channel. **Resolution:** cross-session `SendMessage`/`ListAgents` shipped in v2.1.224, week 32 (Aug 3–7) [G5]. 2026-08-14 is the date **auto mode became the default permission mode** for new Pro/Max/Team sessions [G5]. Separately, since v2.1.166 (2026-06-05): "messages relayed via `SendMessage` from other Claude sessions no longer carry user authority — receivers refuse relayed permission requests, and auto mode blocks them" [G1]. field.md's "auto-accept" conflates these two changes.
8. **Auto mode as default.** spec/practice: "v2.1.283". **Resolution, staged rollout:**
   - 2026-08-14: new sessions on Pro/Max/Team [G5].
   - v2.1.283 (2026-09-25): interactive sessions on third-party providers or with telemetry off [G1].
   - v2.1.284 (2026-09-28): "interactive terminal and VS Code sessions … on every plan and provider" [G1].
   - v2.1.285 (2026-09-29): `claude -p` and the Python Agent SDK on third-party providers [G1].
9. **Explore subagent's model.** field: "capped at Opus"; common lore and older docs: Haiku. **Resolution:** v2.1.198 (2026-07-01): "The built-in Explore agent now inherits the main session's model (capped at opus) instead of running on haiku" [G1].
10. **When OpenCode dropped Claude subscription OAuth.** practice: "March 2026". **Resolution:** commit 973715f, "anthropic legal requests", dated 2026-02-19. It removed the built-in `opencode-anthropic-auth` plugin, the "Claude Pro/Max" login option and the `claude-code-20250219` value from the `anthropic-beta` header [G55].
11. **Pi's owner.** practice: "Earendil Inc"; field: "Earendil Works ~April". **Resolution:** the pi.dev footer says "Earendil Inc."; the GitHub org is `earendil-works`. The npm scope moved from `@mariozechner/pi-coding-agent` (last 0.73.1, 2026-05-07) to `@earendil-works/pi-coding-agent` (first published 2026-05-07; latest 0.99.1, 2026-09-29) [G2][G56].
12. **Date of OpenAI's "Harness engineering".** field: "~Jan 2026, undated". **Resolution:** the page has no dateline. The earliest HN submission is 2026-02-12; the big HN thread (297 pts) is a 2026-06-05 resubmission [G63][G34]. Cite it as "published no later than 2026-02-12".
13. **What a "Ralph loop" is.** field: single process, one task per loop, human Ctrl+C; LangChain: "intercepts the model's exit attempt via a hook and reinjects the original prompt in a clean context window" [G43]. **Resolution:** there are two different mechanisms under one name:
    - (a) **Outer loop.** A bash `while true` that starts a new `claude -p` process each iteration, so every iteration has a fresh context. This is Huntley's original and Carlini's compiler harness [G41].
    - (b) **In-session loop.** Anthropic's official `ralph-wiggum` plugin uses a **Stop hook** that blocks exit and feeds "the SAME prompt back". "The loop happens inside your current session", so context is *not* reset; compaction handles it [G62]. The plugin was added 2025-11-16 [G62].
    The book must name which variant it means.
14. **Planning tool in Claude Code.** All three notes present TodoWrite as the current Claude Code planning tool. **Resolution:**
    - v2.1.16 (2026-01-22) added a new task system (TaskCreate/Get/Update/List with dependencies). TodoWrite is now "Disabled by default in favor of" the Task tools [G1][G4].
    - v2.1.233 (2026-08-14): "Todo/task-tracking tools … are no longer available on Opus 4.8, Sonnet 5, Fable 5, Mythos 5, and newer models" [G1].
    - Current docs: available by default only on Claude 3.x, Opus 4–4.7, Sonnet 4–4.6 and Haiku 4.5. The reason given: "On newer models, Claude keeps track of multi-step work without a written checklist, and the tools' definitions and reminders take up context" [G4].
    - deepagents made `write_todos` **opt-in** in v0.7 (0.7.0 on PyPI 2026-07-29) [G44][G3].
    - Chase's 2025 "no-op todo" framing is historically right, but both reference implementations have since demoted it.
15. **The Claude Code v2.1.233 "cache regression" in the aistack study.** spec implies a general Claude Code caching regression. **Resolution:** issue #87227 (opened 2026-08-17, still open) is titled "2.1.233: ~10x per-turn latency regression against custom ANTHROPIC_BASE_URL (vLLM) — prefix cache no longer hits" [G49]. The aistack study ran open-weight models (Qwen3.8-27B, GLM-5.3-Flash) on its own H200s [G49]. It says nothing about the Anthropic API. The cause is unverified; v2.1.233 is also the release that removed the todo tools.
16. **"36% of ClawHub skills contain prompt injection"** (HN headline, 2026-06-25). **Resolution:** Snyk ToxicSkills (2026-02-05) scanned 3,984 skills from ClawHub and skills.sh:
    - 36.82% (1,467) have *any* security flaw;
    - 13.4% (534) have at least one critical issue;
    - 76 are confirmed malicious;
    - 91% of the *malicious* samples used prompt injection [G59].
17. **Claude Code source leak.** practice: "extraordinary claim, zero corroboration, treat as rumor". **Resolution, it is real:**
    - v2.1.88 was published to npm 2026-03-30 [G2].
    - The HN story "Claude Code's source code has been leaked via a map file in their NPM registry" (2026-03-31, 2,095 pts) links `unpkg.com/@anthropic-ai/claude-code@2.1.88/cli.js.map` [G13].
    - Coverage: Ars Technica headline "Entire Claude Code CLI source code leaks thanks to exposed map file" (HN metadata; the page was not fetched), The Register 2026-04-01 [G15], Latent Space ("~500k+ lines", DMCA takedowns) [G16].
    - HN title of Boris Cherny's tweet: "Claude Code source code leak was a developer error" [G13].
    - Specific identifiers (KAIROS, autoDream, `coordinatorMode.ts`) come from unreleased, feature-flagged code. Treat them as **leaked internals, not shipped features** [G14][G16].
18. **Claude Code default models/context.** spec: Sonnet 5 default, Opus 5 default, 200K illustrative window. **Resolution:**
    - On the Anthropic API the aliases now resolve to `opus` → Opus 5.5 and `sonnet` → Sonnet 5.5, and `fable` → Fable 5.1 [G9]. Sonnet 5.5 was added in v2.1.284 (2026-09-28) at $2/$10 per MTok, $0.20 cache reads, with a 1M context [G1].
    - On native-1M models, auto-compaction triggers "at about 967K tokens by default". 200K-window configurations compact at the 200K boundary [G9].
19. **"Agent teams" in the C-compiler post vs the Claude Code feature.** They are different things with the same name. Carlini (2026-02-05) ran 16 agents in a bash loop + Docker containers + git-file locks (`current_tasks/*.txt`) + a bare upstream repo [G41]. The Claude Code *feature* (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) shipped as a research preview in v2.1.32, also on 2026-02-05 [G1][G2]. Don't describe the compiler as "built with the agent-teams feature".
20. **OpenClaw as "built on Pi agent core".** spec/field: Pi is the core. **Resolution:**
    - openclaw `2026.1.29-beta.1` (2026-01-30) depended on `@mariozechner/pi-agent-core`, `pi-ai`, `pi-coding-agent` and `pi-tui` [G24].
    - From `2026.5.28-beta.1` (2026-05-29) the only Pi dependency is `@earendil-works/pi-tui` (still true in 2026.9.7) [G24].
    - Current docs: "OpenClaw ships one **embedded agent runtime**… The embedded agent runtime is OpenClaw-owned" [G23].
    - The README still thanks Mario Zechner "for pi" [G20].
    - Pi agent core is **history** as of Sep 2026. Whether it was vendored or rewritten is unverified.
21. **HEARTBEAT.md.** This is the popular description, and gumroad packs sell SOUL.md/HEARTBEAT.md bundles [G63]. **Resolution, current docs:** "The runtime never reads `HEARTBEAT.md`." `openclaw doctor --fix` imports it into the heartbeat monitor's scratch stored in the database [G23]. The heartbeat is now "a system-owned automation", scheduled by the Automations (cron) scheduler [G23].
22. **Pi and MCP.** Mario Zechner (2025-11-30): "pi does not and will not support MCP" [G57]. **Resolution:** current Pi docs (`docs/mcp.md`): "Pi connects to Model Context Protocol servers over stdio or streamable HTTP" (`pi mcp add …`) [G56]. The stance reversed; "no sub-agents/no plan mode" still holds on pi.dev ("skips features like sub-agents and plan mode") [G56].
23. **Which Terminal-Bench is current.** practice/field cite TB 2.0/2.1 as live. **Resolution:**
    - TB 3.0 was announced ~2026-08-11 [G63]. TB 4.0 (~2026-08-29) "calibrates task resources…, implements task fixes, and removes saturated tasks". It uses a flat 8-hour agent timeout, 8 tasks were removed and 19 fixed, and versioning is now semantic ("continuous benchmark") [G45].
    - The leaderboard at tbench.ai now shows TB 4.0 even at the `/2.0` URL (same leaderboard_id). Rows are 330 trials = 66 tasks × 5 [G46].
    - TB 2.x and TB 4.0 scores are not comparable.
24. **OpenClaw stars.** practice: 250K+ (Mar 2026). **Current:** 390,896 stars, 82,210 forks (GitHub API, 2026-09-30) [G64].

## Claims most likely to be wrong (with corrections)

1. **"Claude Code plans with a TodoWrite/todo tool."** → Since v2.1.233 (2026-08-14) the task/todo tools aren't offered on Opus 4.8, Sonnet 5, Fable 5, Mythos 5 or newer. Opt in with `CLAUDE_CODE_ENABLE_TODO_TOOLS=1`. Background and cloud sessions still get them [G1][G4].
2. **"A deep agent = prompt + planning tool + subagents + filesystem" as today's consensus.** → That is the 2025-07-30 definition. In 2026 both reference harnesses made the planning tool optional (Claude Code on new models; deepagents ≥0.7, 2026-07-29). The durable pillars are subagents/context isolation, the filesystem, skills/progressive disclosure, compaction/offload and verification loops [G4][G44][G43].
3. **"OpenClaw runs on the Pi agent core."** → Only `pi-tui` since 2026.5.28 (2026-05-29). The runtime is OpenClaw's own "embedded agent runtime" [G24][G23].
4. **"CVE-2026-25253 was fixed in v2026.1.24-1."** → Fixed in 2026.1.29; CVSS 8.8; GHSA 2026-01-31, NVD 2026-02-01 [G17][G19].
5. **"Anthropic banned OpenClaw on Apr 3 and un-banned it on Apr 21."** → Timeline: Apr 4 billing enforcement → Apr 21 Claude-CLI route OK → May 13 separate Agent SDK credit announced → paused Jun 15. Currently third-party and `claude -p` usage draws from the subscription [G51][G52][G53].
6. **"The Claude Code source leak is a rumor."** → Real. The v2.1.88 npm source map was exposed 2026-03-31, widely reported, and DMCA takedowns followed. Leaked flagged features ≠ shipped features [G13][G15][G16].
7. **"Explore subagents run on Haiku."** → Since v2.1.198 (2026-07-01) Explore inherits the main model, capped at Opus [G1].
8. **"Subagents can't spawn subagents" / "no limits".**
   - Default nesting depth is 3 since v2.1.219 (2026-07-24) [G8].
   - Concurrent subagent cap is 20 [G8].
   - Workflow limits are separate: 16 concurrent (tunable 1–256 via `CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS`, v2.1.269+), 1,000 agents per run, 4,096 items per `parallel()`/`pipeline()` [G11].
   - Fork subagents (full parent history + shared prompt cache) are on by default in interactive sessions since v2.1.232 (2026-08-13) [G6].
9. **"Claude Code asks before every command by default."** → Auto mode (classifier) is the default for new Pro/Max/Team sessions since 2026-08-14 and for every plan/provider interactively since v2.1.284 (2026-09-28) [G5][G1].
10. **"Claude Code has a 200K window and auto-compacts at ~80–95%."** → Native-1M models compact at ~967K by default. The window is configurable 100K–1M (`/autocompact`, `CLAUDE_CODE_AUTO_COMPACT_WINDOW`). `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` can only lower the threshold [G9][G8].
11. **"Cursor (Anysphere) is an independent startup that wraps other labs' models."** → "Cursor has officially been acquired by SpaceX" (2026-08-14). Cursor now ships its own Grok models (Grok 4.5 on Jul 8, Grok 4.6 on Aug 12) alongside the Composer line [G31].
12. **"Terminal-Bench 2.0 is the current Terminal-Bench" / "top scores are ~80–95%".**
    - Current is TB 4.0 (Aug 2026). Its leaderboard top is 58.18% (Codex + GPT-6 Astra, max effort, 2026-09-03) [G45][G46].
    - The 80–95% numbers people quote (e.g. "92.8 on TB 2.1") are for the older, partly saturated TB 2.1 and can't be compared with TB 4.0.
13. **"SWE-bench Verified is the standard coding benchmark."** → OpenAI stopped reporting it (post ≤2026-02-23). It found that of 138 audited frequently-failed problems, 59.4% had flawed tests; it saw contamination; it recommends SWE-bench Pro [G47].
14. **"A better harness raises the solve rate" — stated as a general law.** → The evidence is mixed. Use the numbers with their conditions:
    - LangChain: +13.7 pts (52.8→66.5) on TB 2.0 from harness changes alone, model fixed (gpt-5.2-codex) [G42].
    - aistack (64 SWE-Bench Pro tasks, open-weight models): resolve rate was nearly harness-invariant (44–52%) but cost up to ~2× [G49].
    - Cursor swarm: every model mix reached similar quality, at $1,339 to $10,565 [G29].
    - Anthropic: infrastructure alone swings TB 2.0 by 6 pts (p<0.01) [G40].
15. **"A Ralph loop gives the agent a clean context every iteration."** → True only for the outer bash-loop variant. Anthropic's official `ralph-wiggum` plugin loops *inside* the same session via a Stop hook [G62][G41].

Also frequently wrong:
- OpenClaw stars "250K" (actually ~391K) [G64].
- "HEARTBEAT.md drives heartbeats" (migrated to the DB scratch) [G23].
- "Pi refuses MCP" (now supported) [G56].
- "Manus is part of Meta" (China's NDRC ordered the deal unwound on 2026-04-27; Meta reportedly moving to unwind, June 2026) [G58].
- "Codex docs live at developers.openai.com/codex". The docs markdown now lives at learn.chatgpt.com, and `developers.openai.com/codex/llms.txt` points there [G35].

## TL;DR (what the other notes miss)

- **The planning tool is being retired by default.** Claude Code dropped Task/Todo tools for new models (2026-08-14). deepagents made `write_todos` opt-in (v0.7, 2026-07-29). Pi never had one [G4][G44][G57]. Teach "planning" as a skill/plan-file/plan-mode pattern, not a mandatory tool.
- **Three vendors converged on the same approval model: an LLM classifier replaces the human approver.**
  - Claude Code auto mode (engineering post 2026-03-25; default since Aug–Sep 2026).
  - Cursor Auto-review (2026-06-11; default for new users).
  - Codex Auto-review (`approvals_reviewer = "auto_review"`).
  In all three, the sandbox still bounds what is technically possible [G39][G30][G35].
- **Context engineering converged on "files as the interface".**
  - Cursor writes long tool outputs to files, keeps chat history as a searchable file after summarization, and syncs MCP tool descriptions to folders (−46.9% tokens in MCP runs) [G27].
  - Codex/Claude Code keep prompts as exact prefixes for caching [G33].
  - Anthropic Managed Agents keep the session log outside the context window (`getEvents()`) [G38].
- **Claude Code orchestration now has four rungs:** fork subagents (default since 2026-08-13), regular subagents (nesting depth 3), agent teams (experimental) and dynamic workflows/Ultracode (a separate toggle since 2026-09-28) [G6][G8][G12][G1].
- **Anthropic's harness posts moved from the initializer/coding-agent pair (Nov 2025) to planner/generator/evaluator** (2026-03-24). Key lessons:
  - Separate the worker from the judge.
  - Use "sprint contracts".
  - Drop context resets once the model loses "context anxiety" (Opus 4.5+).
  - Remove harness parts one at a time as models improve ("every component in a harness encodes an assumption about what the model can't do") [G37].
- **Anthropic Managed Agents** (2026-04-08) virtualize the session, harness and sandbox. The call is `execute(name, input) → string`, and credentials never enter the sandbox. p50 TTFT dropped ~60% and p95 >90% [G38].
- **Cursor's published harness learnings are substantial and none of the notes captured them:**
  - per-model harness tuning (Codex: shell-like tool names, preserve reasoning traces, a −30% drop if dropped) [G28];
  - dynamic context discovery [G27];
  - planner/worker swarms (Jan 2026 browser; Jul 2026 SQLite, with a custom VCS at ~1,000 commits/s) [G26][G29];
  - Auto-review [G30];
  - Aug 2026 harness: `/goal`, subscriptions, subagents on their own VMs [G32].
- **OpenAI published its own agent-loop internals** ("Unrolling the Codex agent loop", HN 2026-01-23). It covers:
  - the Responses API item list and role ordering;
  - AGENTS.md aggregation (32 KiB default);
  - no `previous_response_id`, so requests stay stateless and ZDR works;
  - which mid-conversation changes cause cache misses;
  - the `/responses/compact` endpoint with an encrypted `compaction` item [G33].
- **OpenClaw, Sep 2026:** 390K★; the OpenClaw Foundation (501(c)(3), announced 2026-07-08); Steinberger joined OpenAI (2026-02-15); 722 GitHub security advisories to date (14 critical), including a 75-advisory batch on 2026-09-11 [G64][G21][G22][G19].
- **The "harness matters" evidence base is now multi-source,** but read each result under its conditions:
  - LangChain +13.7 pts (TB 2.0, fixed model) [G42];
  - Quesma: Blitzy 66.5% vs raw GPT-5.4 57.7% on SWE-Bench Pro [G48];
  - Anthropic infra noise ±6 pts [G40];
  - aistack cost 2× at equal resolve rates [G49];
  - Cursor swarm cost spread 8× at similar quality [G29];
  - the TB 4.0 leaderboard shows reasoning *effort* is as large a lever as harness (Claude Code + Opus 5: low 34.85% → max 51.82%) [G46].
- **Token overhead is measurable.** Claude Code v2.1.207 sent ~32.8K tokens before the user prompt vs OpenCode's ~6.9K (Systima, 2026-07-12, Sonnet 4.5 via a logging proxy) [G50]. Pi claims <1K tokens of system prompt + tools [G57].

## Current state and versions (verified 2026-09-30)

| Component | Current | Evidence |
|---|---|---|
| Claude Code CLI | `latest` 2.1.285 (2026-09-29); `stable` dist-tag 2.1.280 | npm [G2] |
| Claude Agent SDK (TS) | `@anthropic-ai/claude-agent-sdk` 0.3.285 (2026-09-29), versions track the CLI's patch number | npm [G2] |
| Claude Agent SDK (Py) | `claude-agent-sdk` 0.2.162 (2026-09-29) | PyPI [G3] |
| OpenAI Codex CLI | 0.159.2 (2026-09-30); alpha 0.161.0-alpha.4 | npm [G2] |
| OpenClaw | 2026.9.7 (2026-09-30); `extended-stable` 2026.8.33 | npm/GitHub releases [G2] |
| deepagents (Py) | 0.7.20 (2026-09-29) | PyPI [G3] |
| deepagents (JS) | 1.14.1 (2026-09-24) | npm [G2] |
| Pi | `@earendil-works/pi-coding-agent` 0.99.1 (2026-09-29), repo 110,706★, MIT | npm/GitHub [G2][G64] |
| OpenCode | `opencode-ai` 1.18.33 (2026-09-28); repo moved to `anomalyco/opencode`, 211,107★ | npm/GitHub [G2][G64] |
| Amp | `@sourcegraph/amp` build 0.0.1790784043 (2026-09-30). Company: "Amp Frontier Corporation", spun out of Sourcegraph 2025-12-02 | [G2][G61] |
| Goose | repo now `aaif-goose/goose`, 54,812★ | GitHub API [G64] |
| Terminal-Bench | 4.0 (Aug 2026), semantic versioning; 4.1 (verifier hardening) and 5.0 (new tasks) planned | [G45] |
| Cursor | part of SpaceX since 2026-08-14; Projects (beta, 2026-09-10); self-hosted machines (2026-09-02) | [G31][G32] |
| Claude Code model aliases (Anthropic API) | opus → Opus 5.5, sonnet → Sonnet 5.5, fable → Fable 5.1 | [G9] |

## Timeline (gap-fill; events not dated or missing in the other three files)

- 2025-04-15 — Thorsten Ball (Amp), "How to Build an Agent": a code-editing agent in "less than 400 lines of code", three tools (`read_file`, `list_files`, `edit_file`) [G61].
- 2025-11-16 — Anthropic adds the `ralph-wiggum` plugin to the claude-code repo (Stop-hook loop) [G62].
- 2025-11-24 — openclaw repo created (as Warelay/Clawd) [G64].
- 2025-11-30 — Mario Zechner, "What I learned building an opinionated and minimal coding agent" (Pi): 4 tools, <1K tokens of prompt+tools, no MCP/sub-agents/plan mode/todos, "YOLO" by default [G57].
- 2025-12-02 — Amp spins out of Sourcegraph as Amp Frontier Corporation [G61].
- 2025-12-04 — Cursor, "Improving Cursor's agent for OpenAI Codex models" [G28].
- 2025-12-29 — "Manus joins Meta" (~$2B) [G58].
- 2026-01-06 — Cursor, "Dynamic context discovery" [G27].
- 2026-01-14 — Cursor, "Scaling long-running autonomous coding" (planners/workers/judge; browser, 1M+ LOC) [G26].
- 2026-01-22 — Claude Code v2.1.16: new task-management system replaces TodoWrite (dependency tracking) [G1][G2].
- ~2026-01-23 — OpenAI, "Unrolling the Codex agent loop" (HN 456 pts) [G33].
- 2026-01-27 / 2026-01-30 — Clawdbot → Moltbot (after Anthropic's trademark email) → OpenClaw [G25].
- 2026-01-31 — GHSA-g8p2-7wf7-98mq (1-click RCE, CVSS 8.8), patched v2026.1.29. The Moltbook database exposure was disclosed 21:48 UTC and patched by 2026-02-01 01:00 UTC [G19][G60].
- 2026-02-05 — Anthropic: "Quantifying infrastructure noise…" and "Building a C compiler with a team of parallel Claudes". Claude Code v2.1.32 adds the agent-teams research preview. Snyk ToxicSkills published. ClawHavoc (341 malicious skills; HN title) [G40][G41][G1][G59][G63].
- ≤2026-02-12 — OpenAI, "Harness engineering" [G34].
- 2026-02-15 — Peter Steinberger joins OpenAI. Altman: OpenClaw will "live in a foundation as an open source project that OpenAI will continue to support" [G22].
- 2026-02-17 — LangChain, "Improving Deep Agents with harness engineering" (52.8→66.5 on TB 2.0) [G42].
- 2026-02-19 — OpenCode removes the Claude Pro/Max login after "anthropic legal requests" [G55].
- ≤2026-02-23 — OpenAI, "Why SWE-bench Verified no longer measures frontier coding capabilities" [G47].
- 2026-03-10 — LangChain, "The Anatomy of an Agent Harness" ("Agent = Model + Harness") [G43].
- 2026-03-24 — Anthropic, "Harness design for long-running application development" (planner/generator/evaluator) [G37].
- 2026-03-25 — Anthropic, "How we built Claude Code auto mode" [G39].
- 2026-03-30/31 — Claude Code v2.1.88 source-map leak [G2][G13].
- 2026-03-31 — CVE-2026-33579 (OpenClaw `/pair approve` privilege escalation; CVSS 9.4 (NVD) / 9.9 (CNA); fixed 2026.3.28) [G18].
- 2026-04-04 — Anthropic's billing enforcement against third-party harnesses on subscriptions takes effect [G51].
- 2026-04-07 — Quesma audit: Blitzy 66.5% on SWE-Bench Pro Public [G48].
- 2026-04-08 — Anthropic, "Scaling Managed Agents: Decoupling the brain from the hands" [G38].
- 2026-04-27 — China's NDRC orders Meta to unwind the Manus deal [G58].
- 2026-05-07 — Pi npm packages move to the `@earendil-works` scope [G2].
- 2026-05-13 — Anthropic announces the Agent SDK credit for programmatic/third-party use [G52].
- 2026-05-28 — Claude Code v2.1.154 introduces dynamic workflows [G1].
- 2026-05-29 — openclaw 2026.5.28-beta.1 drops pi-agent-core/pi-ai/pi-coding-agent (keeps pi-tui) [G24].
- 2026-06-01 — v2.1.160: workflow trigger keyword renamed `workflow` → `ultracode` [G1].
- 2026-06-11 — Cursor Auto-review (classifier agent; default for new users) [G30].
- 2026-06-15 — Anthropic pauses the Agent SDK credit change [G53].
- 2026-07-01 — v2.1.198: Explore inherits the main model (capped at Opus) [G1].
- 2026-07-08 — OpenClaw Foundation announced (501(c)(3), 13 staff) [G21].
- 2026-07-12 — Systima token-overhead measurement, Claude Code vs OpenCode [G50].
- 2026-07-20 — Cursor, "Agent swarms and the new model economics" [G29].
- 2026-07-24 — v2.1.219: nested subagents default depth 3 [G1][G8].
- 2026-07-29 — deepagents 0.7.0: task planning opt-in [G3][G44].
- 2026-08-07 — v2.1.224: cross-session `SendMessage`/`ListAgents` [G5].
- 2026-08-13 — v2.1.232: fork mode on by default; non-teammate spawns run in background [G6].
- 2026-08-14 — Auto mode becomes default (Pro/Max/Team). v2.1.233 removes todo tools on new models. Cursor becomes part of SpaceX [G5][G1][G31].
- 2026-08-19 — Cursor harness update: `/goal`, subscriptions, subagents on own VMs, custom modes, steering [G32].
- 2026-08-25 — Amp "Orbs" (remote agent VMs that sleep when idle) [G61].
- ~2026-08-29 — Terminal-Bench 4.0 [G45].
- 2026-09-01 — v2.1.257: Fable 5.1 (1M context) [G7].
- 2026-09-10 — Cursor Projects (coordinator agent that "doesn't write code itself") [G32].
- 2026-09-11 — OpenClaw publishes 75 GitHub security advisories in one day (30 high, 40 medium, 5 low) [G19].
- 2026-09-25/28 — v2.1.283/284: auto mode default on all providers; Sonnet 5.5; Ultracode becomes its own toggle [G1].

## Mechanics

### A. Claude Code, what changed in the harness since the other notes' snapshot

**Planning.** Tools reference, VERBATIM [G4]: "The task-tracking tools, `TaskCreate`, `TaskGet`, `TaskUpdate`, `TaskList`, and `TodoWrite`, are available by default only on Claude 3.x models, Opus 4 through 4.7, Sonnet 4 through 4.6, and Haiku 4.5… On newer models, Claude keeps track of multi-step work without a written checklist, and the tools' definitions and reminders take up context."
VERBATIM opt-in [G4]:
```
CLAUDE_CODE_ENABLE_TODO_TOOLS=1 claude
```
Planning on new models happens through plan mode (`EnterPlanMode`/`ExitPlanMode`), `/goal` (v2.1.139, 2026-05-11: "set a completion condition and Claude keeps working across turns until it's met") and workflows [G1][G4].

**New tools a chapter on harness anatomy should list** (all from the tools table [G4]):
- `Agent` — may launch a teammate when agent teams are on;
- `SendMessage` / `ListAgents` — cross-session messaging;
- `Monitor` — streams background-command output lines as events; v2.1.98, 2026-04-09;
- `CronCreate` / `CronDelete` / `CronList` — session-scoped scheduling;
- `ScheduleWakeup` — self-paced `/loop`;
- `SubagentHandback` — in auto mode the classifier reviews a subagent's report before delivery; v2.1.271+;
- `Workflow` — dynamic workflows;
- `ToolSearch` — deferred tools;
- `EnterWorktree` / `ExitWorktree`;
- `PushNotification`, `RemoteTrigger` (Routines), `SendUserFile`.

**Fork subagents.** VERBATIM [G6]: "Claude can request the `fork` subagent type, which inherits the full conversation and prompt cache instead of starting fresh… Subagents Claude spawns in interactive sessions, apart from the ones an agent-team teammate spawns, also run in the background by default."
```text
> /subtask draft unit tests for the parser changes so far
```
(VERBATIM [G6]; turn off with `CLAUDE_CODE_FORK_SUBAGENT=0`.) v2.1.285: forks run under the parent's permission mode and "cannot exit plan mode" [G1].

**Compaction thresholds (official, previously "unverified" in field.md).** VERBATIM [G9]: "Models running with a native 1M window, such as Sonnet 5, the Fable models, and Opus 4.7 and later on the Anthropic API, compact before the window fills, at about 967K tokens by default." Other official numbers:
- the window is settable 100K–1M via `/autocompact 500k`, `--autocompact` or `CLAUDE_CODE_AUTO_COMPACT_WINDOW` (plain integer only) [G9][G8];
- `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` "can't raise the threshold" [G8];
- after compaction, re-attached skills keep "the first 5,000 tokens of each" within "a combined budget of 25,000 tokens", filling from the most recently invoked skill [G10].

**Skill listing budget (field.md's unverified "skills budget", now confirmed and made precise).** VERBATIM [G10]:
- "The listing always contains every skill name, but if you have many skills, Claude Code drops some descriptions to fit the listing's character budget… The budget scales at 1% of the model's context window. When the listing overflows, Claude Code drops descriptions starting with the skills you invoke least."
- `description` + `when_to_use` are "truncated at 1,536 characters".
- The knobs are `skillListingBudgetFraction` and `SLASH_COMMAND_TOOL_CHAR_BUDGET`; `/skill-doctor` (v2.1.252+) reports each skill's context cost [G7].

**Auto mode (permission classifier) internals** [G39]:
- Input layer: a server-side prompt-injection probe scans tool outputs and adds a warning.
- Output layer: a transcript classifier "running on Sonnet 4.6" (as of 2026-03-25). Stage 1 is a single-token yes/no filter; stage 2 runs chain-of-thought only if stage 1 flags. It "sees only user messages and the agent's tool calls; we strip out Claude's own messages and tool outputs" (reasoning-blind).
- Tiers: 1 = built-in safe-tool allowlist + user rules. On entering auto mode, broad rules like blanket shell or `python*` interpreters are dropped. 2 = in-project file edits allowed without a classifier call. 3 = everything else goes to the classifier.
- Subagents run the same pipeline, with handoff classifiers "at delegation (can deny) and at return (warns only)".
- VERBATIM default-mode setting [G5]:
```json
{
  "permissions": {
    "defaultMode": "auto"
  }
}
```

**Workflows.** The `Large workflow` warning fires above 25 agents or a projected 1.5M tokens. The size guideline is advisory: medium, "aim for fewer than 15 agents" since v2.1.219 [G11][G1].

### B. OpenAI Codex CLI harness (primary: "Unrolling the Codex agent loop" [G33], docs [G35], releases [G36])

- The loop runs over the Responses API. Endpoints: `https://chatgpt.com/backend-api/codex/responses` (ChatGPT login), `https://api.openai.com/v1/responses` (API key), and `http://localhost:11434/v1/responses` with `--oss` via Ollama [G33].
- **Initial `input` items, in order** [G33]:
  1. `role=developer` sandbox/permissions text. It covers only the Codex `shell` tool; "other tools, such as those provided from MCP servers, are not sandboxed by Codex".
  2. Optional `developer_instructions` from `config.toml`.
  3. `role=user` "user instructions": `AGENTS.override.md`/`AGENTS.md` from `$CODEX_HOME`, then each folder from the git root to cwd, "Subject to a limit (32 KiB, by default)", plus skills.
  4. `role=user` `<environment_context>` (cwd, shell).
  The role priority is `system` > `developer` > `user` > `assistant`.
- **Statelessness.** Codex does not use `previous_response_id`, "primarily to keep requests fully stateless and to support Zero Data Retention (ZDR)". This makes the JSON sent quadratic in conversation length, but sampling is linear thanks to exact-prefix caching [G33].
- **Cache-miss causes** [G33]: changing tools mid-conversation, changing model, changing sandbox/approval mode or cwd. Mitigation: append a *new* developer/user message instead of editing old ones. There was a real bug where MCP tools were enumerated in inconsistent order.
- **Compaction.** First a manual `/compact` with a summarization prompt. Now automatic via the `/responses/compact` endpoint once `auto_compact_limit` is exceeded. It returns items including "a special `type=compaction` item with an opaque `encrypted_content`… that preserves the model's latent understanding" [G33].
- **Auto-review.** VERBATIM flow [G35]:
  1. The main agent works inside `read-only` or `workspace-write`.
  2. When it needs to cross the sandbox boundary, it requests approval.
  3. If `approvals_reviewer = "auto_review"`, Codex routes that approval request to a separate reviewer agent.
  4. The reviewer decides and returns a rationale.
  5. If approved, execution continues; if denied, "the main agent is instructed to find a materially safer path or stop and ask the user."

  "Auto-review is a reviewer swap, not a permission grant." It "does not expand `writable_roots`, enable network access, or weaken protected paths" [G35]. The release notes call the reviewer "Guardian"; e.g. "Make Guardian v2 parent compaction reuse configurable" (0.150.0) [G36].
- **Subagents** are enabled by default in current Codex releases. Use `/agent` to switch threads. "Ultra" mode uses subagents proactively [G35].
- **Recent harness features.**
  - 0.150.0 (2026-08-26): `@`-mention other tasks; `Interrupt` hooks; untrusted projects no longer supply project `AGENTS.md`.
  - 0.155.0 (2026-09-17): app-server daemon; "active goals can recover after daemon restarts"; Touch ID for MCP requests.
  - 0.159.0 (2026-09-29): opt-in `instant_interrupt` steering; `.aws` protected by default under writable roots [G36][G2].
- **Models.** GPT-5.5 retires from ChatGPT/Codex on 2026-10-14, replaced by GPT-6 Sol / GPT-6 Luna; the CLI examples use `gpt-6.1-sol` [G35]. Don't hardcode model names in the book.

### C. Cursor harness (published learnings; the gap spec.md explicitly flagged)

- **Per-model harness** [G28], VERBATIM: "Every model in Cursor's agent harness has specific instructions and tools made available to optimize that model inside the Cursor environment." For Codex models:
  - tools renamed closer to shell equivalents like `rg`, applied to all models;
  - explicit instruction to call `read_lints` after edits;
  - reasoning traces must be preserved. "removing reasoning traces from GPT-5-Codex caused a 30% performance drop… OpenAI observed a smaller 3% degradation for GPT-5 on SWE-bench";
  - avoid prompt lines that conflict with the user. A "preserve tokens" instruction made Codex refuse ambitious tasks: "I'm not supposed to waste tokens…".
- **Dynamic context discovery** [G27]:
  1. long tool responses become files (the agent `tail`s and reads more as needed);
  2. chat history is kept as a file the agent can search after summarization;
  3. Agent Skills;
  4. MCP tool descriptions are synced to one folder per server. They chose this over a flat tool search: "In an A/B test… reduced total agent tokens by 46.9%";
  5. integrated terminal output is synced to files.
- **Swarms** [G26][G29]:
  - Flat self-coordination through a shared file with locks failed: "Twenty agents would slow down to the effective throughput of two or three". Optimistic concurrency was more robust, but agents became risk-averse.
  - What worked: planners (which recursively spawn sub-planners) → workers → a judge per cycle.
  - "The harness and models matter, but the prompts matter more."
  - July 2026 additions: planners never implement and workers never plan (the context-efficiency thesis); a custom VCS (~1,000 commits/s vs ~1,000/hour on git); a neutral merge agent; megafile flagging; "license intentional breakage"; decorrelated review lenses; a "Field Guide" folder whose `index.md` is auto-injected into every agent.
- **Auto-review** [G30]:
  - A small reasoning model runs as an agentic classifier in the same RPC stream as the parent. It can use ReadFile/Grep/Glob/ListDir to inspect scripts.
  - Blocks go back to the parent as feedback, not to the user.
  - The eval set was 6,122 labeled rows from ~12 h of internal sessions plus synthetic attacks, with repeated runs to detect "flapping".
- **Aug–Sep 2026 product surface.**
  - `/goal`, `/loop`, subscriptions (PRs, Slack, schedules) and subagents on their own VMs [G32].
  - Projects: a coordinator agent that "doesn't write code itself" delegates "to thousands of subagents", with shared context files synced across machines [G32].

### D. Anthropic long-running harness, second generation (2026-03-24) [G37]

- **Failure modes named:**
  - "context anxiety" (Sonnet 4.5 wrapped up early near its perceived limit), which made context resets necessary;
  - poor self-evaluation: "agents tend to respond by confidently praising the work".
- **Architecture: planner, generator and evaluator.**
  - The planner turns 1–4 sentences into a product spec, deliberately high-level.
  - The generator works in sprints.
  - The evaluator uses Playwright MCP to click through the app, with hard per-criterion thresholds.
  - Before each sprint, generator and evaluator negotiate a **sprint contract** through files.
- **Simplification with Opus 4.6.** Components were removed one at a time; the sprint construct was dropped; the evaluator moved to a single end-of-run pass. VERBATIM: "every component in a harness encodes an assumption about what the model can't do on its own, and those assumptions are worth stress testing." Opus 4.5 "largely removed" context anxiety, so resets were dropped in favour of Agent SDK auto-compaction.

### E. Anthropic Managed Agents: meta-harness [G38]

- **Three virtualized parts:** "a session (the append-only log of everything that happened), a harness (the loop that calls Claude and routes Claude's tool calls…), and a sandbox".
- **Interfaces,** VERBATIM names: `execute(name, input) → string`, `provision({resources})`, `wake(sessionId)`, `getSession(id)`, `emitEvent(id, event)`, `getEvents()`.
- **Security.** "the tokens are never reachable from the sandbox where Claude's generated code runs". Git tokens are wired into the remote at sandbox init. MCP OAuth tokens sit in a vault behind a proxy.
- **Context.** "The session is not Claude's context window". Context lives in a durable log that the harness slices and transforms.

### F. OpenClaw runtime, current docs (gap: memory files, heartbeat, Pi status)

- **Bootstrap files injected on the first turn of a new session** (VERBATIM table [G23]):

| File | Purpose |
|---|---|
| `AGENTS.md` | Operating instructions + "memory" |
| `SOUL.md` | Persona, boundaries, tone |
| `IDENTITY.md` | Agent name/vibe/emoji |
| `USER.md` | User profile + preferred address |
| `BOOTSTRAP.md` | One-time first-run ritual (deleted after completion) |
| `MEMORY.md` | Root long-term memory file, if present |

  Also:
  - `memory/YYYY-MM-DD.md` daily logs, retrieved on demand.
  - `MEMORY.md` is loaded "only… in the main, private session (not shared/group contexts)".
  - Limits: `bootstrapMaxChars` 20000 and `bootstrapTotalMaxChars` 60000 by default; USER.md has its own 4,000-char budget.
  - State lives in SQLite (`~/.openclaw/state/openclaw.sqlite`, per-agent `openclaw-agent.sqlite`). Transcript JSONL files are legacy [G23].
- **Skill precedence:** workspace `/skills` → `/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs` [G23].
- **Steering:** inbound messages mid-run are "steered into the current run by default". Steering is checked before unstarted tool launches, and skipped calls get "synthetic paired results" [G23].
- **Heartbeat.** A "system-owned automation that runs periodic agent turns in the main session"; default `30m` (`1h` with Anthropic OAuth/Claude CLI reuse); the reply `NO_REPLY` suppresses output; event wakes are limited to a 30 s minimum and a flood guard of 5 starts per 60 s [G23]. VERBATIM config [G23]:
```json5
{
  commands: {
    ownerAllowFrom: ["telegram:123456789"],
  },
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "owner", // default: operator DM from ownerAllowFrom or channel allowFrom
        directPolicy: "allow", // default: allow direct/DM targets; set "block" to suppress
        lightContext: true, // optional: skip workspace bootstrap files for heartbeat runs
        isolatedSession: true, // optional: fresh session each run (no conversation history)
        // activeHours: { start: "08:00", end: "24:00" },
      },
    },
  },
}
```
- **Anthropic routes:** "API key" vs "Claude CLI — reuse an existing Claude Code login through the installed executable". "A Claude CLI selection does not silently switch to the direct API" [G54].
- **Security record beyond the 1-click RCE** (GitHub advisories [G19]; the CVSS values come from the advisory records):
  - 722 published advisories: 14 critical, 249 high, 390 medium, 69 low.
  - Critical examples: "Remote Code Execution via Node Invoke Approval Bypass in Gateway" (9.9, 2026-02-14); "Pairing-scoped device tokens could mint `operator.admin` and reach node RCE" (9.9, 2026-03-12); "Heartbeat context inheritance bypasses sandbox via senderIsOwner escalation" (2026-03-31).
  - The 2026-09-11 batch included "Dreaming could widen restricted sender authority", "Skill tool dispatch could skip owner-only policy" and "Cron tool could accept mixed-case command payloads".
  - The recurring theme is **authority/provenance confusion across channels, pairing scopes and scheduled turns**, more than sandbox escapes.

### G. Pi, current (primary [G56][G57])

- Packages: `pi-ai` (multi-provider LLM API), `pi-agent-core`, `pi-coding-agent`, `pi-tui`, `pi-durable`, `pi-telemetry`, `chord`. The repo's packages dir also has `mcp`, `server`, `session-backends`, `codemode` and `evals` [G56].
- The agent loop is documented in `how-pi-works.md` (VERBATIM): "The provider streams an assistant response, which can contain text and tool calls. Pi records the response, executes each tool call, and records the results. That completes one turn." Sessions are trees; compaction "inserts a summary entry that replaces older messages in subsequent model requests. The original entries remain in the session tree" [G56].
- Security: "Pi does not include a built-in permission system…". It offers three containerization patterns: a Gondolin micro-VM extension, plain Docker, and OpenShell [G56].
- Supply chain: exact-pinned deps, `.npmrc` `min-release-age=2`, and a shrinkwrap in the published CLI [G56].

### H. Minimal-agent references for "build it yourself"

- Thorsten Ball: an LLM, a loop, three tools, in Go, "less than 400 lines of code" [G61].
- The Carlini autonomous loop. VERBATIM tokens [G41]; line breaks were reconstructed from HTML:
```bash
#!/bin/bash
while true; do
  COMMIT=$(git rev-parse --short=6 HEAD)
  LOGFILE="agent_logs/agent_${COMMIT}.log"
  claude --dangerously-skip-permissions \
    -p "$(cat AGENT_PROMPT.md)" \
    --model claude-opus-X-Y &> "$LOGFILE"
done
```
  Carlini: "(Run this in a container, not your actual machine)". Parallelism: each agent clones from a bare `/upstream` into its own Docker `/workspace` and locks tasks by writing `current_tasks/<task>.txt`; "git's synchronization forces the second agent to pick a different one" [G41].
- In-session Ralph via the official plugin. VERBATIM [G62]:
```bash
/ralph-loop "Build a REST API for todos. Requirements: CRUD operations, input validation, tests. Output <promise>COMPLETE</promise> when done." --completion-promise "COMPLETE" --max-iterations 50
```
- LangChain middleware recipe [G42]:
  - `PreCompletionChecklistMiddleware` intercepts exit and forces a verification pass ("similar to a Ralph Wiggum Loop");
  - `LocalContextMiddleware` maps cwd and tools at start;
  - `LoopDetectionMiddleware` counts per-file edits and injects "consider reconsidering your approach";
  - time-budget warnings.
- deepagents opt-in planning. VERBATIM [G44]:
```python
from deepagents import create_deep_agent
from langchain.agents.middleware import TodoListMiddleware

agent = create_deep_agent(
    model="anthropic:claude-sonnet-5",
    middleware=[TodoListMiddleware()],
)
```
  deepagents is "a more opinionated harness on top of `create_agent`" (LangChain v1). It adds an `execute` tool only when the backend implements `SandboxBackendProtocolV2`, and memory is `AGENTS.md` passed via `memory=` [G44].

## Numbers

| Measurement | Value | Conditions | Src |
|---|---|---|---|
| Claude Code users' approval rate of permission prompts | 93% | Anthropic internal, as of 2026-03-25 | G39 |
| Auto mode stage 1 | FPR 8.5%; FNR 6.6% (real overeager, n=52); FNR 1.8% (synthetic exfil, n=1,000) | real traffic n=10,000 | G39 |
| Auto mode full pipeline | FPR 0.4%; FNR 17% (overeager); 5.7% (exfil) | same datasets; "The 17% false-negative rate… is the honest number" | G39 |
| Cursor Auto-review | blocks ~4% of reviewed actions; ~7% of chats get ≥1 user interruption; some enterprises previously saw ~40% of actions blocked | Cursor, 2026-06-11 | G30 |
| Cursor dynamic MCP tool loading | −46.9% total agent tokens | A/B, runs that called an MCP tool; high variance | G27 |
| Dropped reasoning traces | −30% (GPT-5-Codex, Cursor Bench) vs −3% (GPT-5, SWE-bench, OpenAI) | Cursor, 2025-12-04 | G28 |
| Cursor swarm SQLite (835-page manual, Rust, held-out sqllogictest) | new harness 73–85% at 4 h vs old 11–77%; all new configs later 100% | same models, same time budget | G29 |
| Swarm cost by mix | $1,339 (Opus 4.8 planner + Composer 2.5 workers) to $10,565 (GPT-5.5 everywhere); workers ≥69% of tokens (>90% in most); GPT-5.5 workers $9,373 vs Composer workers $411 | Cursor, 2026-07-20 | G29 |
| Old vs new swarm behaviour | 68,000 commits in 2 h (old) ≈70× new; >70,000 conflicts vs <1,000; hottest file 7,771 conflicts (1,173 agents) vs 47; 54 vs 9 crates; 64,305 vs 9,908 LOC (Fable 5 mix) | Grok 4.5 runs | G29 |
| Cursor browser swarm | ~1 week, >1M LOC across 1,000 files; Solid→React migration +266K/−193K over >3 weeks | Jan 2026 | G26 |
| Anthropic harness vs solo (retro game maker) | solo 20 min, $9 vs full harness 6 h, $200 | Opus 4.5 | G37 |
| DAW build, simplified harness | 3 h 50 min, $124.70 (planner $0.46; build rounds $71.08/$36.89/$5.88; QA $3.24/$3.09/$4.06) | Opus 4.6 | G37 |
| Carlini C compiler | 16 agents, ~2,000 Claude Code sessions, $20,000 API, 100,000-line Rust compiler that builds Linux 6.9 (x86, ARM, RISC-V) | Opus 4.6, 2026-02-05 | G41 |
| LangChain harness-only gain | 52.8% → 66.5% (+13.7) on TB 2.0; "Top 30 to Top 5" | gpt-5.2-codex fixed; 89 tasks; Harbor + Daytona | G42 |
| Infra noise | +6 pts TB 2.0 from strict 1× to uncapped resources (p<0.01); infra errors 5.8% → 0.5%; SWE-bench RAM up to 5× → +1.54 pts | Anthropic, same model/harness | G40 |
| TB 4.0 leaderboard (snapshot) | #1 Codex + GPT-6 Astra (max) 58.18% ($3,267); #2 Claude Code + Fable 5.1 (max) 57.88% ($6,243.50); Claude Code + Opus 5 by effort: low 34.85 / medium 44.85 / high 50.30 / max 51.82 | 330 trials (66 tasks × 5); tbench.ai JSON accessed 2026-09-30; ranks 3–5, 9, 26 not parsed | G46 |
| TB 4.0 token use | Sonnet 5 21.6B tokens vs Opus 5 6.5B on their leaderboard runs | flat 8 h timeout | G45 |
| SWE-bench Verified audit | of 138 audited problems (the 27.6% subset models often failed): 59.4% flawed; 35.5% narrow tests, 18.8% wide tests, 5.1% misc | OpenAI | G47 |
| SWE-Bench Pro Public | Blitzy 66.5% (verified by Quesma) vs WarpGrep v2 59.1% vs GPT-5.4 57.7% | self-reported board; Quesma was contracted by Blitzy | G48 |
| Harness token overhead before the prompt | Claude Code ~32,800 (system ~6,500 + 27 tool schemas ~24,000 + reminders ~1,900) vs OpenCode ~6,900 (~2,000 + 10 tools ~4,800) | CC 2.1.207, OpenCode 1.17.18, claude-sonnet-4-5, logging proxy, 3 runs; 2 subagents fan-out = 4.2× tokens | G50 |
| Pi prompt+tools | "below 1000 tokens" | 2025-11-30 | G57 |
| Managed Agents latency | p50 TTFT −~60%, p95 −>90% | after decoupling harness from container | G38 |
| OpenClaw advisories by publish month | Jan 3, Feb 220, Mar 204, Apr 108, May 67, Jun 45, Jul 0, Aug 0, Sep 75 (total 722) | GitHub API, 2026-09-30 | G19 |
| OpenClaw Foundation | "4.5 million new claws being born every week"; ~30,000 ClawCon sign-ups across 34 events in 16 countries; 13 full-time staff | foundation's own claims, 2026-07-08 | G21 |
| Snyk ToxicSkills | 3,984 skills; 13.4% critical; 36.82% any flaw; 76 confirmed malicious; 8 still live at publication | ClawHub + skills.sh, 2026-02-05 | G59 |
| Moltbook exposure | 1.5M agent API tokens; 35,000 emails; ~17,000 human owners; ~3 h to patch | Wiz, 2026-02-02 | G60 |
| Claude Code skill listing | budget = 1% of context window; description cap 1,536 chars; post-compaction 5,000 tokens/skill, 25,000 combined | docs | G10 |
| Workflow caps | 16 concurrent (1–256 configurable), 1,000 agents/run, 4,096 items/call; warning >25 agents or >1.5M tokens | docs | G11 |
| Manus | >$100M ARR in Dec 2025, 8 months after launch; Meta deal ~$2B | CNBC, 2026-04-27 | G58 |

## Pitfalls, limits, criticism (new)

- **Harness components go stale.** Anthropic: context resets became "dead weight" on Opus 4.5 [G38][G37]. Claude Code removed the todo tools because they "take up context" on new models [G4]. Any fixed harness recipe in the book needs a "re-test on each model generation" caveat.
- **Per-model harness overfitting.** Codex models lean on shell/`apply_patch`. LangChain notes that post-training with a harness in the loop "creates this overfitting". Cursor maintains per-model instructions [G43][G28].
- **Classifier approvals are not a security boundary.** 17% FNR on real overeager actions [G39]. Codex: "a reviewer swap, not a permission grant" [G35]. Keep the sandbox.
- **Cross-agent authority leakage.**
  - Claude Code strips user authority from relayed `SendMessage` (v2.1.166) [G1].
  - Workflow `agent()` prompts are "framed as script-authored text, so the safety classifier does not read them as the user" (v2.1.277) [G1].
  - OpenClaw's 2026-09 advisories are largely provenance/owner-authority bugs [G19].
- **Swarm failure modes at scale** [G29]: split-brain design, planner contention, merge conflicts, megafiles, ossification (agents refuse to touch core code).
- **Model sensitivity breaks harnesses.** Cursor skipped GPT-5.6 Sol because it "appears more sensitive to literal and emphasized wording… we encountered runaway spirals" [G29]. The Cursor/Codex "preserve tokens" prompt caused refusals [G28].
- **Benchmarks: reward hacking** — Cursor, "Reward hacking is swamping model intelligence gains", 2026-06-25 [G63; title only, body not read]. Plus contamination (SWE-bench Verified) [G47] and resource-config sensitivity [G40].
- **Leaked internals ≠ product.** KAIROS/autoDream/"coordinator mode" were feature-flagged code in the 2026-03-31 leak [G14][G16]. Don't present them as Claude Code features unless docs confirm them.
- **Vendor lock and ToS risk for open harnesses:** OpenCode removed Claude OAuth under legal pressure [G55]; Anthropic changed subscription policy four times in Feb–Jun 2026 [G51][G52][G53].

## What changed in the last 6 months (Apr–Sep 2026) — items none of the three notes caught

- Claude Code:
  - todo/task tools removed on new models (Aug 14) [G1];
  - fork subagents on by default (Aug 13) [G6];
  - nested subagent depth 3 (Jul 24) [G8];
  - Explore inherits the main model (Jul 1) [G1];
  - auto mode default everywhere (Sep 28) [G1];
  - Ultracode split from effort (Sep 28) [G1];
  - Sonnet 5.5 and Opus 5.5 aliases [G9][G1];
  - restricted mode for eval harnesses (`--restricted`, v2.1.248) [G7];
  - `claude plugin eval` (v2.1.269) [G7];
  - `/skill-doctor` [G7].
- Cursor:
  - acquired by SpaceX (Aug 14) [G31];
  - Auto-review (Jun 11) [G30];
  - swarm economics (Jul 20) [G29];
  - `/goal` + subscriptions + subagent VMs (Aug 19) [G32];
  - Projects coordinator (Sep 10) [G32];
  - self-hosted machines (Sep 2) [G32].
- Codex:
  - Auto-review/Guardian [G35][G36];
  - subagents on by default [G35];
  - app-server daemon + persistent goals (0.155.0) [G36];
  - docs moved to learn.chatgpt.com; GPT-5.5 retirement on 2026-10-14 [G35].
- OpenClaw:
  - Foundation (Jul 8) [G21];
  - Pi agent core replaced by its own embedded runtime (May 29) [G24];
  - HEARTBEAT.md migrated into automations [G23];
  - 75-advisory batch (Sep 11) [G19].
- LangChain deepagents 0.7: planning opt-in (Jul 29) [G44].
- Terminal-Bench 3.0 (Aug) → 4.0 (late Aug) [G45][G63].
- Pi now supports MCP and moved to Earendil's npm scope (May 7) [G56][G2].
- Amp Orbs (Aug 25) [G61].
- Manus: China blocks the Meta deal (Apr 27); unwind reported (Jun 13) [G58].
- Anthropic subscription policy for Agent SDK/third-party usage: credit announced (May 13) then paused (Jun 15) [G52][G53].

## Diagram candidates

1. **Retreat of the planning tool.** A timeline strip with three lanes (Claude Code, deepagents, Pi) plus a 2025-07-30 marker "Chase: planning tool = pillar". Claude Code lane: TodoWrite → Task tools (2026-01-22) → off on new models (2026-08-14). deepagents lane: default → opt-in v0.7 (2026-07-29). Pi lane: "never". [G1][G4][G44][G57]
2. **Codex prompt as an exact prefix.** Stacked boxes: `instructions` | `tools` | developer permissions | developer_instructions | user AGENTS.md (≤32 KiB) | environment_context | user msg | reasoning | function_call | function_call_output… Arrow "next request = old prompt + new items"; a red box "cache miss if tools/model/sandbox/cwd change"; a side path "auto_compact_limit → /responses/compact → [compaction item (encrypted_content)] replaces input". [G33]
3. **Classifier-approval convergence.** Three parallel pipelines:
   - Claude Code: tier1 allowlist → tier2 in-project edits → tier3 transcript classifier (stage1 single-token → stage2 CoT), plus an input-side injection probe;
   - Cursor: allowlist/sandbox → agentic classifier with ReadFile/Grep → feedback to parent;
   - Codex: sandbox boundary → `approvals_reviewer=auto_review` → reviewer agent → approve/deny + rationale.
   A shared bottom bar "OS sandbox still enforces". [G39][G30][G35]
4. **Managed Agents: brain / hands / session.** Actors: Session log (append-only), Harness (stateless, cattle), Sandbox(es) (cattle), Vault+MCP proxy. Arrows: `emitEvent`, `getEvents()`, `execute(name,input)→string`, `provision({resources})`, `wake(sessionId)`; a token path that never enters the sandbox. [G38]
5. **Planner / generator / evaluator with a sprint contract.** Planner (1–4 sentences → spec) → generator proposes contract ⇄ evaluator reviews (via files) → build → evaluator tests with Playwright against thresholds → fail → feedback loop. Annotate "removed on Opus 4.6: sprints; evaluator → single pass". [G37]
6. **Cursor swarm tree.** Root goal → planners (sub-planners) → workers. Side services: VCS (~1,000 commits/s), neutral merge agent, megafile decomposer, reconciler of design docs, stacked review lenses, Field Guide `index.md` injected into all agents. [G29]
7. **Two kinds of Ralph loop.** Left: bash `while true` → new `claude -p` process each iteration → fresh context → state only in files/git. Right: one session, Stop hook blocks exit → same prompt re-injected → context accumulates → compaction. [G41][G62]
8. **OpenClaw turn assembly.** Workspace files (AGENTS/SOUL/IDENTITY/USER/BOOTSTRAP/MEMORY, 20K/60K char caps) → system prompt Project Context. Triggers: channel message, heartbeat automation (30m, NO_REPLY), cron, webhook, exec completion. Steering queue → embedded runtime → tools (host unless sandbox). [G23]
9. **OpenClaw ↔ Pi dependency over time.** Bars: 2026-01-30 four pi packages → 2026-05-11 moved to `@earendil-works` → 2026-05-29 pi-tui only. [G24]
10. **Anthropic subscription policy for third-party harnesses.** State machine: ToS-forbidden (Feb) → billed as extra usage (Apr 4) → Claude-CLI route OK (Apr 21) → Agent SDK credit announced (May 13) → paused / draws from subscription (Jun 15–16). [G51][G52][G53][G54]
11. **Claude Code orchestration ladder, 2026-09.** fork (full history, shared cache, background) → subagent (fresh, depth ≤3, ≤20 concurrent) → agent team (peers, mailbox, experimental) → workflow (script; 16 concurrent, 1,000 agents, 4,096 items). [G6][G8][G12][G11]
12. **Dynamic context discovery.** A tool call returns a large output → written to a file → the agent `tail`s/greps → only the needed slice enters context. Plus the MCP folder per server and the chat-history file consulted after summarization. [G27]

**Chart candidates (real data):**
- (a) TB 4.0 effort sweep, Claude Code + Opus 5: low 34.85 / medium 44.85 / high 50.30 / max 51.82 with cost $2,393.88 / $3,191.59 / $4,662.27 / $5,969.11. Plus Codex + GPT-6 Astra low 50.61 / medium 54.24 / max 58.18 ($1,557.30 / $1,914.80 / $3,267.18) [G46].
- (b) Cursor swarm cost by model mix, $1,339 → $10,565 [G29].
- (c) Auto mode FPR/FNR, stage 1 vs full pipeline [G39].
- (d) Systima stacked bars: system / tools / reminders, Claude Code vs OpenCode [G50].
- (e) OpenClaw GHSA count per month [G19].
- (f) Anthropic retro-game cost/time, solo vs harness; DAW phase costs [G37].
- (g) Infra-noise curve: success and infra-error vs resource multiplier [G40]. Only endpoints and the 3× point were read.

## Glossary (new terms)

- **Fork subagent**: a Claude Code subagent (`subagent_type: "fork"`) that inherits the full parent conversation and prompt cache; default-on interactively since v2.1.232 [G6].
- **Auto mode**: Claude Code's permission mode where a model classifier replaces human approval for risky actions; default since Aug–Sep 2026 [G39][G5].
- **Auto-review (Codex/Cursor)**: a reviewer agent that decides escalation requests at the sandbox boundary (Codex) or reviews actions in context (Cursor) [G35][G30].
- **Ultracode**: Claude Code toggle (separate from effort since v2.1.284) under which Claude plans a dynamic workflow for substantive tasks [G1].
- **Sprint contract**: a file-negotiated agreement between generator and evaluator agents on what "done" means for a chunk of work [G37].
- **Context anxiety**: a model wrapping up prematurely as it believes it nears its context limit (seen in Sonnet 4.5) [G37][G38].
- **Context reset vs compaction**: a reset starts a fresh agent with a handoff artifact; compaction summarizes in place [G37].
- **Meta-harness**: Anthropic Managed Agents' framing, stable interfaces (session, harness, sandbox) that host any harness [G38].
- **Dynamic context discovery**: Cursor's term for giving fewer details up front and letting the agent pull context from files [G27].
- **Field Guide**: an agent-owned shared folder whose `index.md` is injected into every swarm agent [G29].
- **Embedded agent runtime (OpenClaw)**: OpenClaw's own loop and prompt assembly, replacing its earlier Pi dependency [G23][G24].
- **Heartbeat monitor scratch**: a DB-stored checklist that replaced `HEARTBEAT.md` in OpenClaw's automation-driven heartbeat [G23].
- **Restricted mode**: `claude --restricted` starts without command-running tools, WebFetch or bypass mode; meant for eval harnesses [G7].
- **Agent SDK credit**: Anthropic's announced (May 2026) and paused (Jun 2026) separate monthly pool for programmatic/third-party usage [G52][G53].
- **Compaction item**: Codex/Responses API `type=compaction` item with `encrypted_content` that stands in for the compacted history [G33].

## Unverified / open questions

- **Claude Code v2.1.233 prefix-cache regression on custom endpoints.** Issue #87227 is still open; the cause (e.g. the tool-list change in the same release) is unknown [G49].
- **Why OpenClaw dropped Pi's agent-core.** The npm dependency history shows it [G24], but no changelog line explains it. The 2026.5.28 notes were grepped without a hit. Unknown whether the code was vendored or rewritten.
- **Dynamic workflows blog (claude.com, 2026-06-02),** cited by field.md — not re-fetched; the changelog date (2026-05-28) is verified.
- **Manus's current ownership** after the June 2026 unwind reports — no primary source read beyond CNBC (Apr 27) and HN titles (TechCrunch 2026-06-13, Bloomberg 2026-05-21).
- **The ClawHavoc 341-malicious-skills count** — only the HN title; koi.ai now redirects to Palo Alto Networks. practice.md's "386 (28+354)" comes from a different source (opensourcemalware) and a different time window. Report both with their sources.
- **"Claude Code refuses requests or charges extra if commits mention OpenClaw"** (HN 2026-04-30, tweet by theo) — still tweet-only; not confirmed or denied by an Anthropic primary source.
- **YC talk "Why the Harness Matters More Than the Model"** (2026-09-08) — video content not transcribed.
- **Codex "Guardian"** is named in release-note PR titles; its exact identity with Auto-review is inferred, not documented in the fetched pages.
- **Terminal-Bench 4.0 leaderboard ranks 3–5, 9 and 26** were not parsed; TB 4.0's exact release date is taken from HN (2026-08-29).
- **Cursor "Reward hacking is swamping model intelligence gains"** (2026-06-25) — title and date only, body not read.
- **Ars Technica leak article** — fetch blocked; used via HN metadata only.

## Sources

- [G1] Claude Code CHANGELOG.md, Anthropic, GitHub `anthropics/claude-code` (rolling; entries through v2.1.285), https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md — accessed 2026-09-30
- [G2] npm registry metadata for `@anthropic-ai/claude-code` (version→date map), `@anthropic-ai/claude-agent-sdk`, `@openai/codex`, `openclaw`, `deepagents`, `@earendil-works/pi-coding-agent`, `@mariozechner/pi-coding-agent`, `opencode-ai`, `@sourcegraph/amp`, https://registry.npmjs.org/ — accessed 2026-09-30
- [G3] PyPI JSON for `deepagents`, `claude-agent-sdk`, `langgraph`, https://pypi.org/pypi/<pkg>/json — accessed 2026-09-30
- [G4] "Tools reference" (incl. "Task tool availability"), Claude Code docs, Anthropic, n.d. (current; "applies in Claude Code v2.1.268 and later"), https://code.claude.com/docs/en/tools-reference.md — accessed 2026-09-30
- [G5] "Week 32 · August 3–7, 2026", Claude Code What's new, Anthropic, https://code.claude.com/docs/en/whats-new/2026-w32.md — accessed 2026-09-30
- [G6] "Week 33 · August 10–14, 2026", Claude Code What's new, Anthropic, https://code.claude.com/docs/en/whats-new/2026-w33.md — accessed 2026-09-30
- [G7] "Week 35/36/37" digests (Aug 24 – Sep 11, 2026), Claude Code What's new, Anthropic, https://code.claude.com/docs/en/whats-new/2026-w35.md (w36, w37) — accessed 2026-09-30
- [G8] "Environment variables", Claude Code docs, Anthropic, n.d., https://code.claude.com/docs/en/env-vars.md — accessed 2026-09-30
- [G9] "Model configuration" (aliases, auto-compaction thresholds), Claude Code docs, Anthropic, n.d., https://code.claude.com/docs/en/model-config.md — accessed 2026-09-30
- [G10] "Extend Claude with skills", Claude Code docs, Anthropic, n.d., https://code.claude.com/docs/en/skills.md — accessed 2026-09-30
- [G11] "Orchestrate subagents at scale with dynamic workflows", Claude Code docs, Anthropic, n.d., https://code.claude.com/docs/en/workflows.md — accessed 2026-09-30
- [G12] "Manage costs effectively" and "Orchestrate teams of Claude Code sessions", Claude Code docs, Anthropic, n.d., https://code.claude.com/docs/en/costs.md, https://code.claude.com/docs/en/agent-teams.md — accessed 2026-09-30
- [G13] Hacker News (Algolia) stories on the Claude Code leak: items 47584540 (2026-03-31, 2,095 pts), 47586778, 47583512 (unpkg cli.js.map), 47598608 (Boris Cherny tweet title), 47592087 (Ars Technica), https://hn.algolia.com/api/v1/ — accessed 2026-09-30
- [G14] Alex Kim, "The Claude Code Source Leak: fake tools, frustration regexes, undercover mode", 2026-03-31, https://alex000kim.com/posts/2026-03-31-claude-code-source-leak/ — accessed 2026-09-30
- [G15] Thomas Claburn, "Claude Code source leak reveals how much info Anthropic can hoover up about you", The Register, 2026-04-01, https://www.theregister.com/2026/04/01/claude_code_source_leak_privacy_nightmare/ — accessed 2026-09-30
- [G16] "[AINews] The Claude Code Source Leak", Latent Space, 2026-04-01, https://www.latent.space/p/ainews-the-claude-code-source-leak — accessed 2026-09-30 (partially paywalled)
- [G17] NVD, CVE-2026-25253, published 2026-02-01, https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-2026-25253 — accessed 2026-09-30
- [G18] NVD, CVE-2026-33579, published 2026-03-31, https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-2026-33579 — accessed 2026-09-30
- [G19] GitHub Security Advisories for `openclaw/openclaw` (722 published; via `gh api repos/openclaw/openclaw/security-advisories`), incl. GHSA-g8p2-7wf7-98mq (2026-01-31), https://github.com/openclaw/openclaw/security/advisories — accessed 2026-09-30
- [G20] OpenClaw README, `openclaw/openclaw`, GitHub (current, v2026.9.7), https://github.com/openclaw/openclaw — accessed 2026-09-30
- [G21] "The OpenClaw Foundation", OpenClaw blog, 2026-07-08, https://openclaw.ai/blog/introducing-openclaw-foundation — accessed 2026-09-30
- [G22] "OpenClaw creator Peter Steinberger joins OpenAI", TechCrunch, 2026-02-15, https://techcrunch.com/2026/02/15/openclaw-creator-peter-steinberger-joins-openai/ — accessed 2026-09-30
- [G23] OpenClaw docs: "Agent runtime", "Agent workspace", "Heartbeat", n.d. (current), https://docs.openclaw.ai/concepts/agent.md, https://docs.openclaw.ai/concepts/agent-workspace.md, https://docs.openclaw.ai/gateway/heartbeat.md — accessed 2026-09-30
- [G24] npm version manifests of `openclaw` (dependency history; 2026.1.29-beta.1, 2026.5.10-beta.4, 2026.5.28-beta.1, 2026.9.7), https://registry.npmjs.org/openclaw — accessed 2026-09-30
- [G25] "Lore", OpenClaw docs, n.d., https://docs.openclaw.ai/start/lore.md — accessed 2026-09-30
- [G26] Wilson Lin, "Scaling long-running autonomous coding", Cursor blog, 2026-01-14, https://cursor.com/blog/scaling-agents — accessed 2026-09-30
- [G27] Jediah Katz, "Dynamic context discovery", Cursor blog, 2026-01-06, https://cursor.com/blog/dynamic-context-discovery — accessed 2026-09-30
- [G28] Cursor Team, "Improving Cursor's agent for OpenAI Codex models", Cursor blog, 2025-12-04, https://cursor.com/blog/codex-model-harness — accessed 2026-09-30
- [G29] Wilson Lin, "Agent swarms and the new model economics", Cursor blog, 2026-07-20, https://cursor.com/blog/agent-swarm-model-economics — accessed 2026-09-30
- [G30] David Gomes & Travis McPeak, "Governing agent autonomy with Auto-review", Cursor blog, 2026-06-11, https://cursor.com/blog/agent-autonomy-auto-review — accessed 2026-09-30
- [G31] Cursor Team, "Cursor is now a part of SpaceX", Cursor blog, 2026-08-14, https://cursor.com/blog/joining-spacex — accessed 2026-09-30
- [G32] Cursor changelog: "Cloud Agents and Cursor Harness Improvements" (2026-08-19), "Self-hosted machines" (2026-09-02), "Cursor Projects" (2026-09-10), https://cursor.com/changelog — accessed 2026-09-30
- [G33] OpenAI, "Unrolling the Codex agent loop", openai.com, ~2026-01-23 (HN 46737630; page read via r.jina.ai), https://openai.com/index/unrolling-the-codex-agent-loop/ — accessed 2026-09-30
- [G34] OpenAI, "Harness engineering: leveraging Codex in an agent-first world", openai.com, no dateline (earliest HN 2026-02-12), https://openai.com/index/harness-engineering/ — accessed 2026-09-30 (via r.jina.ai)
- [G35] Codex docs (learn.chatgpt.com): "Auto-review", "Subagents", "Models", n.d. (current), https://learn.chatgpt.com/docs/sandboxing/auto-review.md, https://learn.chatgpt.com/docs/agent-configuration/subagents.md, https://learn.chatgpt.com/docs/models.md; index https://developers.openai.com/codex/llms.txt — accessed 2026-09-30
- [G36] `openai/codex` GitHub releases rust-v0.150.0 (2026-08-26), rust-v0.155.0 (2026-09-17), rust-v0.159.0 (2026-09-29), rust-v0.159.2, https://github.com/openai/codex/releases — accessed 2026-09-30
- [G37] Prithvi Rajasekaran, "Harness design for long-running application development", Anthropic Engineering, 2026-03-24, https://www.anthropic.com/engineering/harness-design-long-running-apps — accessed 2026-09-30
- [G38] Anthropic, "Scaling Managed Agents: Decoupling the brain from the hands", Anthropic Engineering, 2026-04-08, https://www.anthropic.com/engineering/managed-agents — accessed 2026-09-30
- [G39] Anthropic, "How we built Claude Code auto mode: a safer way to skip permissions", Anthropic Engineering, 2026-03-25, https://www.anthropic.com/engineering/claude-code-auto-mode — accessed 2026-09-30
- [G40] Anthropic, "Quantifying infrastructure noise in agentic coding evals", Anthropic Engineering, 2026-02-05, https://www.anthropic.com/engineering/infrastructure-noise — accessed 2026-09-30
- [G41] Nicholas Carlini, "Building a C compiler with a team of parallel Claudes", Anthropic Engineering, 2026-02-05, https://www.anthropic.com/engineering/building-c-compiler — accessed 2026-09-30
- [G42] Vivek Trivedy, "Improving Deep Agents with harness engineering", LangChain blog, 2026-02-17, https://www.langchain.com/blog/improving-deep-agents-with-harness-engineering — accessed 2026-09-30
- [G43] Vivek Trivedy, "The Anatomy of an Agent Harness", LangChain blog, 2026-03-10, https://www.langchain.com/blog/the-anatomy-of-an-agent-harness — accessed 2026-09-30
- [G44] deepagents README (GitHub) and "Deep Agents overview" docs (Task planning section: "Starting in v0.7 task planning is opt-in only"), LangChain, n.d. (current), https://raw.githubusercontent.com/langchain-ai/deepagents/main/README.md, https://docs.langchain.com/oss/python/deepagents/overview.md — accessed 2026-09-30
- [G45] Ryan Marten, "Terminal-Bench 4.0", tbench.ai news, ~2026-08-29 (HN 49486421), https://www.tbench.ai/news/terminal-bench-4-0 — accessed 2026-09-30
- [G46] Terminal-Bench leaderboard (TB 4.0; embedded JSON, leaderboard_id 9f966760-…), tbench.ai, snapshot 2026-09-30, https://www.tbench.ai/leaderboard/terminal-bench/4.0 — accessed 2026-09-30
- [G47] OpenAI, "Why SWE-bench Verified no longer measures frontier coding capabilities", openai.com, ≤2026-02-23 (earliest HN), https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/ — accessed 2026-09-30 (via r.jina.ai)
- [G48] Quesma, "Compare harnesses, not models: Blitzy vs. GPT-5.4 on SWE-Bench Pro", 2026-04-07, https://quesma.com/blog/verifying-blitzy-swe-bench-pro/ — accessed 2026-09-30
- [G49] aistack, "Does your harness matter more than your model?", September 2026, https://aistack.imec-int.com/blog/harness-cost; and GitHub issue anthropics/claude-code#87227 (opened 2026-08-17, open), https://github.com/anthropics/claude-code/issues/87227 — accessed 2026-09-30
- [G50] Systima, "Claude Code Is Way More Token-Hungry Than OpenCode" (HN title "Claude Code sends 33k tokens before reading the prompt; OpenCode sends 7k"), 2026-07-12, https://systima.ai/blog/claude-code-vs-opencode-token-overhead — accessed 2026-09-30
- [G51] "Anthropic closes door on subscription use of OpenClaw", The Register, 2026-04-06, https://www.theregister.com/2026/04/06/anthropic_closes_door_on_subscription/ — accessed 2026-09-30 (via r.jina.ai)
- [G52] "Anthropic reinstates OpenClaw and third-party agent usage on Claude subscriptions — with a catch", VentureBeat, 2026-05-13, https://venturebeat.com/technology/anthropic-reinstates-openclaw-and-third-party-agent-usage-on-claude-subscriptions-with-a-catch — accessed 2026-09-30 (via r.jina.ai)
- [G53] "Use the Claude Agent SDK with your Claude plan", Claude Help Center, Anthropic, updated 2026-06-16 ("Update June 15: We're pausing the changes"), https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan — accessed 2026-09-30
- [G54] "Anthropic" provider page, OpenClaw docs, n.d., https://docs.openclaw.ai/providers/anthropic.md — accessed 2026-09-30
- [G55] `anomalyco/opencode` commit 973715f "anthropic legal requests", 2026-02-19, https://github.com/anomalyco/opencode/commit/973715f — accessed 2026-09-30
- [G56] Pi: `earendil-works/pi` README, `packages/coding-agent/README.md`, `docs/how-pi-works.md`, `docs/mcp.md` (GitHub, current) and pi.dev homepage (Earendil Inc.), https://github.com/earendil-works/pi, https://pi.dev/ — accessed 2026-09-30
- [G57] Mario Zechner, "What I learned building an opinionated and minimal coding agent", 2025-11-30, https://mariozechner.at/posts/2025-11-30-pi-coding-agent/ — accessed 2026-09-30
- [G58] "China blocks Meta's $2 billion takeover of AI startup Manus", CNBC, 2026-04-27, https://www.cnbc.com/2026/04/27/meta-manus-china-blocks-acquisition-ai-startup.html (via r.jina.ai); plus HN metadata for "ManusAI Joins Meta" (2025-12-29) and TechCrunch "Meta moves to unwind $2B Manus deal" (2026-06-13) — accessed 2026-09-30
- [G59] Luca Beurer-Kellner et al., "ToxicSkills" study, Snyk blog, 2026-02-05, https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/ — accessed 2026-09-30
- [G60] "Hacking Moltbook" / exposed Moltbook database, Wiz blog, 2026-02-02, https://www.wiz.io/blog/exposed-moltbook-database-reveals-millions-of-api-keys — accessed 2026-09-30
- [G61] Amp: "Amp Frontier Corporation" (2025-12-02), https://ampcode.com/news/amp-inc; Thorsten Ball, "Orbs, Explained" (2026-08-25), https://ampcode.com/notes/orbs-explained; Thorsten Ball, "How to Build an Agent" (2025-04-15), https://ampcode.com/how-to-build-an-agent — accessed 2026-09-30
- [G62] "Ralph Wiggum Plugin" README, `anthropics/claude-code` `plugins/ralph-wiggum` (added 2025-11-16), https://github.com/anthropics/claude-code/tree/main/plugins/ralph-wiggum — accessed 2026-09-30
- [G63] Hacker News (Algolia) headline metadata used only for dates/titles: ClawHavoc 341 skills (46901092, 2026-02-05), Tell HN Anthropic/OpenClaw (47633396, 2026-04-03), "Claude CLI usage is allowed again" (47844269, 2026-04-21), theo tweet (47963204, 2026-04-30), Harness engineering (48416264, 2026-06-05; earliest 2026-02-12), Terminal-Bench 3.0 (49261978, 2026-08-11), YC harness talk (49605503, 2026-09-08), gumroad OpenClaw config packs (47496354), Cursor reward-hacking post, https://hn.algolia.com/api/v1/search — accessed 2026-09-30
- [G64] GitHub REST API repository metadata (stars/forks/created): openclaw/openclaw (390,896★, created 2025-11-24), earendil-works/pi (110,706★), anomalyco/opencode (211,107★), openai/codex (127,392★), langchain-ai/deepagents (29,873★), anthropics/claude-code (148,684★), aaif-goose/goose (54,812★) — accessed 2026-09-30
