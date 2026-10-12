# Agent Skills — primary-source notes

## TL;DR (what an engineer must know today, 2026-09-30)

- A **Skill** = a directory with a required `SKILL.md` (YAML frontmatter + Markdown body) plus optional `scripts/`, `references/`, `assets/`. Frontmatter requires only `name` and `description` [S1].
- **Progressive disclosure** is the core mechanism, formalized as 3 tiers: (1) name+description always in context (~50-100 tokens/skill), (2) full `SKILL.md` body loaded on trigger (<5k tokens recommended, <500 lines), (3) bundled files/scripts loaded only on demand, scripts never enter context at all — only their stdout does [S1, S9, S10].
- Agent Skills is **an open, cross-vendor standard** (agentskills.io), originally built by Anthropic (Oct 16, 2025) and spun out as an open spec on **Dec 18, 2025** [S18]. As of today it's adopted by 40+ agent products including OpenAI Codex, Cursor, Gemini CLI, VS Code/GitHub Copilot, OpenCode, OpenHands, Goose, Amp, Letta, JetBrains Junie, and OpenClaw [S2].
- **Anthropic's own field validation is stricter/different from the open spec**: the spec bans consecutive hyphens and requires `name` to match the parent directory; Anthropic's Claude products additionally ban XML tags and the reserved words "anthropic"/"claude" in `name`/`description` — the open spec doesn't mention those bans at all [S1 vs S10].
- On the **Claude API**, Skills require the **code execution tool** and run inside its sandboxed container (`/skills/{skill-name}/`) — no network access, no runtime package installs, max 20 skills/request, 30MB upload cap [S10, S14, S16].
- The **Skills API is now GA** (out of the `skills-2025-10-02` beta as of this doc's read) — `client.skills.*`, not `client.beta.skills.*`; version pointers changed from beta's epoch-microsecond strings to `skver_...` IDs [S14].
- **Claude Code merged custom commands into skills**: a `.claude/commands/deploy.md` file and a `.claude/skills/deploy/SKILL.md` folder both create `/deploy`; skills additionally support directories, frontmatter-based invocation control, subagent forking (`context: fork`), and dynamic shell injection (`` !`cmd` ``) [S15].
- **Skills ≠ MCP, and Anthropic never claimed skills replace MCP** — the official framing is "Skills teach agents workflows that involve external tools" (complementary), not a replacement [S18]. Community consensus by mid-2026: MCP is for deterministic, schema-typed, auditable access to external systems; Skills are for interpretive, judgment-heavy procedural knowledge [S28, S29].
- Skills, subagents, slash commands and CLAUDE.md/AGENTS.md are **not competitors but different injection points**: CLAUDE.md/AGENTS.md is always-on standing context; slash commands are user-triggered fixed prompts (now unified with skills in Claude Code); subagents are isolated-context executors that can *host* a skill (`context: fork`) or *preload* skills as reference material; skills are conditionally-loaded procedural knowledge triggered by description-matching [S15].
- **Security is now a live incident category, not a hypothetical**: the OpenClaw skill marketplace ClawHub had its top-downloaded skill turn out to be malware (Feb 2026, HN #1 with 334 pts); a Snyk scan of 3,984 skills across ClawHub + skills.sh found 13.4% with a critical security flaw and 76 confirmed-malicious skills; a separate incident had a malicious skill pass every scanner (Cisco, Nvidia, skills.sh) and reach 26,000 installs by hosting its payload on an external domain invisible to static scanners [S24, S25, S27, S26].
- **Distribution channels that exist today**: git-committed project/personal directories; Claude Code Plugins (`/plugin marketplace add`, `/plugin install`); the Skills API (workspace-wide, versioned); claude.ai zip uploads (per-user, not org-wide); the community registry **skills.sh** (`npx skills add <owner/repo>`); claude.ai account sync into Claude Code (`~/.claude/skills/synced/`) [S15, S13, S23].
- **Failure modes are well-documented and mostly about the `description` field**: under-specified → doesn't trigger; over-broad → triggers on everything and steals other skills' matches; too many skills → descriptions get silently truncated (Claude Code budgets the skill listing at ~1% of the model's context window, cap 1,536 chars per entry) [S15, S6].
- **`skill-creator`** is Anthropic's own meta-skill/plugin that automates the eval loop: writes `evals/evals.json`, spawns isolated with/without-skill runs, grades assertions, computes benchmark deltas, and runs description-trigger A/B tuning — announced as a standalone improvement on **March 3, 2026** [S19, S1g, S15].

## Current state and versions (as of 2026-09-30)

- **Agent Skills spec**: hosted at agentskills.io, GitHub org `agentskills/agentskills` (repo created 2025-12-16, `skills-ref` reference validator lives at `agentskills/agentskills/tree/main/skills-ref`) [S1, S21].
- **Anthropic's `anthropics/skills` repo**: created 2025-09-22 (predates the public Oct 16 2025 launch — internal dev period), still actively pushed as of 2026-09-29 [S20]. Contains: open-source example skills, the source-available `docx`/`pdf`/`pptx`/`xlsx` skills that power Claude's document features, the `template-skill`, and the `spec/` pointer to agentskills.io [S1i].
- **Claude API — Skills API**: out of beta; no `anthropic-beta: skills-2025-10-02` header needed. `container.skills[]` takes `{type, skill_id, version}`; pre-built Anthropic skills use `type: "anthropic"` + short IDs (`pptx`, `xlsx`, `docx`, `pdf`) with date-based versions (`"20251013"` or `"latest"`); custom skills use `type: "custom"` + generated IDs (`skill_01...`) and version IDs (`skver_01...`) [S14].
- **Code execution tool**: latest type is `code_execution_20260521`; the skills-guide's own wire examples still show the older `code_execution_20250825` (both work — "all three [versions] return the response blocks documented"). Container: Python 3.11, Linux x86_64, 5 GiB RAM, 5 GiB disk, 1 CPU, no internet, containers expire 30 days after creation, checkpointed after ~5 min idle [S16].
- **Model referenced in current wire examples**: `claude-opus-5-5` [S14]. `claude-api` skill's migration subcommand also references `claude-sonnet-5-5` and `claude-fable-5-1` as current-generation model targets [S13].
- **Claude Code**: skills documented against versions up to **v2.1.282**; the `/skills`, `/skill-doctor`, `/reload-skills`, `/plugin` commands and the `skillOverrides` setting are all shipped [S15].
- **Frontmatter fields, Claude Code superset**: the open spec defines 6 fields (`name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`); Claude Code recognizes ~18 fields total, including Claude-Code-only extensions `disable-model-invocation`, `user-invocable`, `context`, `agent`, `background`, `hooks`, `paths`, `shell`, `model`, `effort`, `argument-hint`, `arguments`, `when_to_use`, `disallowed-tools` [S15, S1]. Packaging a skill for claude.ai/API/`package_skill.py` with any non-spec field **hard-fails**: `Unexpected key(s) in SKILL.md frontmatter: argument-hint. Allowed properties are: allowed-tools, compatibility, description, license, metadata, name` [S15, VERBATIM].

## Timeline

- **2025-09-22** — `anthropics/skills` GitHub repo created (pre-launch internal work) [S20].
- **2025-10-16** — Anthropic publishes "Introducing Agent Skills" (claude.com/blog/skills) and the engineering post "Equipping agents for the real world with Agent Skills." Skills ship across Claude.ai, Claude Code, the Claude Agent SDK, and the Claude Developer Platform simultaneously [S17, S18].
- **2025-10-30** — Early community commentary distinguishing "Skills vs MCP" as complementary philosophies starts appearing (e.g. subramanya.ai) [community source, dated via HN index].
- **2025-12-15/16** — `agentskills/agentskills` spec repo created, i.e. the open-standard spec repo predates its public announcement by ~2 days [S21].
- **2025-12-18** — Anthropic publishes an update on the original blog post: *"We've published Agent Skills as an open standard for cross-platform portability"* — the formal open-standard launch [S18, VERBATIM quote].
- **2025-12-22** — Community piece "Skills vs. MCP? Wrong Question" argues they're teammates, not competitors [S29].
- **2026-02-02** — 1Password publishes "From magic to malware: how OpenClaw's Agent Skills become an attack surface," documenting a fake "Twitter" skill on ClawHub used as a staged macOS infostealer dropper [S25].
- **2026-02-05** — HN: "Top downloaded skill in ClawHub contains malware" hits #1, 334 points, 151 comments — the highest-profile Skills security incident to date [S24]. Same-day, Snyk's ToxicSkills scan snapshots 3,984 skills from ClawHub + skills.sh [S27].
- **2026-03-03** — Anthropic publishes "Improving skill-creator: Test, measure, and refine Agent Skills," formalizing the eval-driven skill-authoring loop (updated again 2026-06-21) [S19].
- **2026-04-15** — "Equipping agents..." engineering post last modified (minor updates, same core content) [S18].
- **2026-06-24** — CSO Online reports a malicious "brand-landingpage" skill (masquerading as a Google Stitch tool) that evaded Cisco, Nvidia, and skills.sh scanners by hosting its payload on an external domain, reaching 26,000+ installs via an Instagram ad campaign [S26].
- **2026-08-25** — LogRocket publishes a mature "Skills vs. MCP tools: when to use which" framing keyed to the **July 2026 MCP spec revision that dropped session-management requirements**, which the author says made MCP lighter and reshaped (but didn't resolve) the decision [S28].
- **2026-09-30 (today)** — Skills API is GA (no beta header); agentskills.io lists 40+ adopting clients; ClawHub-class incidents are a recurring HN category (SkillScan, SkillsGuard, Skillcop, Bastionskill, SkillFortify tools have all launched in response) [S1, S2, HN search].

## Mechanics

### Anatomy of a skill (spec-level)

```
skill-name/
├── SKILL.md          # Required: metadata + instructions
├── scripts/          # Optional: executable code
├── references/       # Optional: documentation
├── assets/           # Optional: templates, resources
└── ...               # Any additional files or directories
```
[S1, VERBATIM]

`SKILL.md` frontmatter fields per the **open spec** [S1, VERBATIM table]:

| Field | Required | Constraints |
|---|---|---|
| `name` | Yes | Max 64 chars, lowercase+digits+hyphens, no leading/trailing/consecutive hyphens, must match parent dir name |
| `description` | Yes | Max 1024 chars, non-empty |
| `license` | No | License name or bundled file reference |
| `compatibility` | No | Max 500 chars, environment requirements |
| `metadata` | No | Arbitrary string→string map |
| `allowed-tools` | No | Space-separated pre-approved tools (experimental) |

Minimal valid `SKILL.md` (VERBATIM, [S1]):
```markdown
---
name: skill-name
description: A description of what this skill does and when to use it.
---
```

**Anthropic's own platform validation** ([S10], VERBATIM) additionally requires:
> `name`: ... Cannot contain XML tags. Cannot contain reserved words: "anthropic", "claude". `description`: ... Cannot contain XML tags.

This is a genuine spec-vs-implementation gap: the open spec's `skills-ref` validator would accept a name like `claude-helper`; Anthropic's own upload path (claude.ai, Skills API) would reject it.

### Progressive disclosure — the three tiers

Per Claude's own docs [S10, VERBATIM table]:

| Level | When loaded | Token cost | Content |
|---|---|---|---|
| 1: Metadata | Always (startup) | ~100 tokens/skill | `name` + `description` |
| 2: Instructions | On trigger | Under 5k tokens | SKILL.md body |
| 3+: Resources | As needed | None until accessed | Bundled files (context on read); scripts (bash-executed, only output enters context) |

Mechanically on the Claude API [S10, VERBATIM]:
> When you request something that matches a Skill's description, Claude reads SKILL.md from the filesystem using bash. Only then does this content enter the context window ... When Claude runs `validate_form.py`, the script's code never loads into the context window. Only its output ... consumes tokens.

Worked example from the engineering blog [S18, VERBATIM sequence]:
1. context window has system prompt + all skills' metadata + user message;
2. Claude triggers the PDF skill by invoking Bash to `cat pdf/SKILL.md`;
3. Claude chooses to also read the bundled `forms.md`;
4. Claude proceeds with the task using loaded instructions.

### How skills are discovered/loaded on the Claude API (wire-level)

Skills integrate via the `container.skills[]` parameter, which requires the code execution tool. VERBATIM cURL example [S14]:

```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-opus-5-5",
    "max_tokens": 4096,
    "container": {
      "skills": [
        {
          "type": "anthropic",
          "skill_id": "pptx",
          "version": "latest"
        }
      ]
    },
    "messages": [{
      "role": "user",
      "content": "Create a presentation about renewable energy"
    }],
    "tools": [{
      "type": "code_execution_20250825",
      "name": "code_execution"
    }]
  }'
```

Loading sequence on the API [S14, VERBATIM]:
1. Metadata discovery: Claude sees each skill's name+description in the system prompt.
2. File loading: skill files copied into the container at `/skills/{skill-name}/` (directory = skill's `name`, not its `skill_01...` ID).
3. Automatic use when relevant.
4. Composition: multiple skills combine for complex workflows.

**Creating a custom skill via API** (multipart upload, VERBATIM cURL) [S14]:
```bash
curl -X POST "https://api.anthropic.com/v1/skills" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -F "files[]=@financial_skill/SKILL.md;filename=financial_skill/SKILL.md" \
  -F "files[]=@financial_skill/analyze.py;filename=financial_skill/analyze.py"
```
Requirements: `SKILL.md` at upload root (or top of one enclosing folder); upload ≤30MB uncompressed; `display_name` optional (≤255 chars, derives from `name` if omitted) [S14].

**Custom Skills are workspace-scoped, not user-scoped** — a documented, security-relevant nuance [S14, VERBATIM Warning]:
> Custom Skills are accessible to your entire workspace ... Any API key with access to a workspace can read, invoke, and delete every custom Skill uploaded to that workspace ... If you are building a multi-tenant platform on the Skills API, create a separate workspace for each tenant.

**Migration off the `skills-2025-10-02` beta** — key field renames [S14, VERBATIM table, abridged]: `display_title`→`display_name` (64→255 chars, no longer unique); `latest_version` (epoch-microsecond string)→`latest_version_id` (`skver_...`); deleting a Skill under the beta returned 400 while versions existed, now deletes the Skill *and* all versions in one call.

### Claude Code mechanics

Skill locations and precedence [S15]:

| Location | Path | Loads in |
|---|---|---|
| Enterprise | managed-settings `.claude/skills/<name>/SKILL.md` | all users org deploys to |
| Personal | `~/.claude/skills/<name>/SKILL.md` | all local projects, not Cowork/cloud |
| Project | `.claude/skills/<name>/SKILL.md` | this repo, if committed |
| Nested | `<subdir>/.claude/skills/<name>/SKILL.md` | sessions in/below subdir |
| Plugin | `<plugin>/skills/<name>/SKILL.md` | `/plugin-name:skill-name` |
| claude.ai sync | account skills | Cowork/cloud/terminal signed-in sessions |

Collision precedence: **enterprise > personal > project**; a nested skill and a root skill of the same name both stay available, addressable as `/name` (root) vs `/apps/web:name` (nested) [S15].

Invocation control frontmatter [S15]:
- `disable-model-invocation: true` — only the human can run it (e.g. `/deploy`); Claude is blocked even if it tries another way.
- `user-invocable: false` — only Claude can run it; hidden from the `/` menu.

Example real skill using dynamic shell injection (VERBATIM, [S15]):
```yaml
---
description: Summarizes uncommitted changes and flags anything risky. Use when the user asks what changed, wants a commit message, or asks to review their diff.
---

## Current changes

!`git diff HEAD`

## Instructions

Summarize the changes above in two or three bullet points, then list any risks you notice such as missing error handling, hardcoded values, or tests that need updating. If the diff is empty, say there are no uncommitted changes.
```
The `` !`cmd` `` line runs *before* Claude ever sees the file — Claude receives the command's output inline, not the command itself. A failed injected command aborts the whole invocation; Claude never sees the skill content for that call [S15].

**Subagent execution** (`context: fork`) — runs the skill body as a fresh subagent's entire prompt, with **no conversation history** carried over, in the background by default. Two skill↔subagent integration directions [S15, VERBATIM table]:

| Approach | System prompt | Task | Also loads |
|---|---|---|---|
| Skill with `context: fork` | From agent type | SKILL.md content | CLAUDE.md per agent's startup rules |
| Subagent with `skills` field | Subagent's own body | Claude's delegation message | Preloaded skills + CLAUDE.md |

**Skill content lifecycle in a session**: once triggered, the rendered SKILL.md enters as one message and **is not re-read on later turns** — write standing instructions, not one-shot steps. Auto-compaction re-attaches the most recently invoked skill after a summary, capped at 5,000 tokens/skill and a combined **25,000-token budget across all re-attached skills** — older skills can be silently dropped entirely [S15].

**Skill listing budget**: Claude Code drops full descriptions (keeping only names) once the aggregate skill listing exceeds **~1% of the model's context window**, evicting least-invoked skills first; each entry (`description`+`when_to_use`) is separately capped at **1,536 characters** [S15].

### Skills vs. MCP vs. subagents vs. slash commands vs. CLAUDE.md/AGENTS.md

Official Anthropic position — explicitly *not* a replacement claim [S18, VERBATIM]:
> We'll also explore how Skills can complement Model Context Protocol (MCP) servers by teaching agents more complex workflows that involve external tools and software.

Community framing that crystallized by mid-2026, converging on an **auditability vs. flexibility axis** [S28, paraphrased with verbatim fragments]: MCP tools expose "fixed input and output schemas," prioritizing determinism and traceability — good for "reading from systems of record where the output must be trustworthy without human oversight." Skills are for "interpretive tasks requiring judgment," where "a person reviews results before they matter." The author's conclusion: *"reach for both when the task divides along that line."* A July 2026 MCP spec revision dropped session-management requirements, reducing MCP's setup overhead — which had previously made Skills look comparatively "lighter to reach for" — without resolving which one to use case-by-case [S28].

A second framing (Dec 2025) [S29, VERBATIM]: *"Skills and MCP are teammates, not competitors ... Skills: Things your agent knows how to do. MCP: Things your agent can access."*

**Slash commands**: as of the current Claude Code docs, custom commands and skills are **the same mechanism** [S15, VERBATIM]:
> Custom commands have been merged into skills. A file at `.claude/commands/deploy.md` and a skill at `.claude/skills/deploy/SKILL.md` both create `/deploy` and work the same way.
The command-file format is the legacy subset (no directory, no `name`/`paths` fields); skills are the superset (directories, supporting files, invocation control, forking).

**CLAUDE.md/AGENTS.md vs. skills** [S15, VERBATIM]:
> Create a skill when you keep pasting the same instructions, checklist, or multi-step procedure into chat, or when a section of CLAUDE.md has grown into a procedure rather than a fact. Unlike CLAUDE.md content, a skill's body loads only when it's used, so long reference material costs almost nothing until you need it.
CLAUDE.md/AGENTS.md = always-in-context standing facts/conventions; skills = conditionally-loaded procedures. `.agents/skills/` has emerged as a cross-client convention distinct from any one product's native directory, mirroring how AGENTS.md is the cross-vendor sibling of CLAUDE.md [S9].

**Subagents vs. skills**: a subagent is an isolated-context executor (its own system prompt, tools, model); a skill is a chunk of procedural knowledge. They combine two ways: a skill can *spawn* a subagent (`context: fork`) to run in isolation, or a subagent definition can *preload* a fixed list of skills as reference material at its own startup [S15].

### Writing good skills

Core authoring principles synthesized across [S5, S6, S11]:

- **Assume Claude already knows things.** Every explanatory sentence about what a PDF is, or how HTTP works, is wasted context once the skill is loaded — challenge every line with "would Claude get this wrong without it?" [S5, S11].
- **Degrees of freedom must match task fragility**: high-freedom prose for judgment calls ("check for SQL injection"), medium-freedom parameterized templates, low-freedom exact scripts for fragile/irreversible operations ("run exactly this: `python scripts/migrate.py --verify --backup`. Do not modify the command.") [S5, S11]. Anthropic's analogy: narrow bridge with cliffs (low freedom) vs. open field (high freedom) [S11].
- **Description is the entire triggering mechanism** — write it in **third person** ("Processes Excel files," never "I can help you..."), imperative-framed ("Use this skill when..."), name both *what* and *when*, and deliberately cover cases where the user doesn't name the domain ("even if they don't explicitly mention 'CSV'") [S6, S11].
- **Trigger-eval methodology** [S6]: build ~20 labeled queries (8-10 should-trigger, 8-10 should-not, weighted toward *near-miss* negatives that share vocabulary but need a different skill), run each 3× (nondeterminism), compute a trigger rate, use a 60/40 train/validation split to avoid overfitting the description to specific phrasings.
- **Output-quality evals** [S7]: store `evals/evals.json` (prompt, expected_output, input files) in the skill dir; run each case with-skill and without-skill; write pass/fail **assertions** with concrete evidence, not vibes ("Y-axis is labeled 'Revenue ($)' but X-axis has no label" — not "looks good"); aggregate a `benchmark.json` delta of pass-rate vs. token/time cost.
- **One level of file-reference depth** — deep reference chains cause Claude to `head -100` preview instead of fully reading nested files [S11].
- **Gotchas sections are the highest-value content** — concrete, environment-specific corrections ("the `/health` endpoint returns 200 even when the DB is down; use `/ready`"), not generic advice [S5, VERBATIM example].
- **Scripts should solve, not defer** — handle `FileNotFoundError` explicitly rather than "just fail and let Claude figure it out"; avoid unexplained magic numbers ("voodoo constants," citing Ousterhout's law) [S11].
- **Script design for agentic use** [S8]: no interactive prompts (agents run non-interactive shells and will hang forever); document with `--help`; structured stdout (JSON/CSV) + diagnostics on stderr; meaningful exit codes; `--dry-run` for destructive ops; predictable/paginated output size since harnesses truncate at 10-30K chars.
- **`skill-creator`** automates this whole loop: splits eval sets, runs parallel trigger evals, proposes description edits, generates an HTML review report [S6, S15, S19].

### Distribution

- **Git-committed** `.claude/skills/` — simplest, versioned, code-reviewable [S15].
- **Claude Code Plugins**: `/plugin marketplace add anthropics/skills` then `/plugin install document-skills@anthropic-agent-skills` — bundles skills with hooks/agents/MCP servers under one artifact [S1i, VERBATIM install commands].
- **Skills API**: workspace-wide upload/versioning via `/v1/skills`, the API-native path for orgs [S14].
- **claude.ai zip upload**: Settings > Features, **per-user only** — "not shared organization-wide and cannot be centrally managed by admins" [S10, VERBATIM].
- **npx / skills.sh**: a community registry, "The Open Agent Skills Ecosystem" — `npx skills add <owner/repo>` or, for one skill inside a multi-skill repo, `npx skills add https://github.com/anthropics/skills --skill claude-api` [S13, S23, VERBATIM commands]. Its homepage runs a live install leaderboard (e.g. `vercel-labs/skills`'s `find-skills` skill: 3.6M installs; `anthropics/skills`' `frontend-design`: 938.3K; `mattpocock/skills` family: 4.3M combined) [S23, accessed 2026-09-30].
- **claude.ai account sync → Claude Code**: skills enabled on your claude.ai account auto-download into `~/.claude/skills/synced/` in terminal sessions signed in with that account, re-checked ~every 10 minutes; Cowork/cloud sessions always use the account's enabled set [S15].

### Security

Anthropic's own framing is blunt: a skill is instructions + code, so a malicious one "can direct Claude to invoke tools or execute code in ways that don't match the Skill's stated purpose" [S10, VERBATIM]. Enterprise guidance [S12] gives a concrete risk-tier table (code execution, instruction manipulation, MCP references, network access patterns, hardcoded credentials, filesystem scope = all flagged High/Medium) and an 8-point review checklist (read every file; run scripts sandboxed; check for adversarial/hidden-action instructions; grep for network calls; check for hardcoded secrets; enumerate tool invocations; confirm redirect destinations; check for exfiltration patterns disguised as normal responses). Claude Enterprise offers **Skill content scanning** for claude.ai/Cowork uploads — but explicitly **does not cover the Skills API or Console uploads** [S10, S12].

Real-world incidents confirm the threat model is not theoretical:
- **ClawHub "Twitter" skill** (OpenClaw's marketplace): staged attack chain — skill tells user to install a fake `openclaw-core` dependency → link to attacker infra → obfuscated payload → second-stage script → downloads a binary and strips macOS quarantine attributes → confirmed macOS infostealer (browser sessions, credentials, dev tokens, SSH keys, cloud creds) via VirusTotal. "Hundreds of OpenClaw skills were reportedly involved" in the same ClickFix-style campaign [S25].
- **Snyk's ToxicSkills study** (3,984 skills scanned across ClawHub + skills.sh, snapshot 2026-02-05): 13.4% (534) had a critical flaw, 36.82% (1,467) had *any* flagged issue, 76 confirmed-malicious skills found, 8 malicious skills **still publicly listed on ClawHub** at publication, critical-tier detectors hit 90-100% recall / 0% false-positive on top-100 legitimate skills [S27].
- **The "brand-landingpage" skill** (a ~36,000-star, 156-skill open repo): evaded Cisco, Nvidia, and skills.sh scanners because the malicious instructions lived on an **external domain** (mimicking `stitch.withgoogle.com`), invisible to static analysis of the packaged files — the attackers only weaponized the external page *after* the skill had distribution. Drove via an Instagram ad; 26,000+ installs, including corporate accounts [S26].

## Numbers

- Metadata cost: **~50-100 tokens per skill** at startup, both per the open spec and per Claude's own docs [S1, S10].
- SKILL.md body budget: **under 5,000 tokens** recommended, **under 500 lines** hard guidance [S1, S10, S11].
- API limits: **max 20 skills per Messages request**; **max 30MB** total upload size (uncompressed) [S14].
- Code execution container: 5 GiB RAM, 5 GiB disk, 1 CPU, Python 3.11, 30-day container expiry, ~5-min idle checkpoint [S16].
- Code execution pricing: 1,550 free hours/month per org; $0.05/hour/container beyond that; free entirely when paired with `web_search_20260209`+ or `web_fetch_20260209`+ [S16].
- Claude Code skill-listing context budget: **~1% of the model's context window**; per-entry description+when_to_use cap: **1,536 characters** [S15].
- Skill content re-attach after compaction: **5,000 tokens per skill, 25,000-token combined budget** across all re-attached skills [S15].
- Rakuten case study (Anthropic-reported, self-serving but a named source and quote — Yusuke Kaji, General Manager AI): accounting/finance workflows that "once took a day, we can now accomplish in an hour" using Skills [S17, VERBATIM].
- Security scan (Snyk, 2026-02-05 snapshot, n=3,984 skills across ClawHub+skills.sh): 13.4% critical-flaw rate, 76 confirmed-malicious, 91% of *confirmed-malicious* skills used prompt injection (vs. 2.6% prompt-injection rate across *all* scanned skills — the "36%" headline figure refers to overall flagged-issue rate, not prompt injection specifically; be careful not to conflate these when citing) [S27].
- skills.sh install counts (accessed 2026-09-30, live and changing): `find-skills` (vercel-labs) 3.6M; `agent-browser` (vercel-labs) 985.9K; `frontend-design` (anthropics/skills) 938.3K; `mattpocock/skills` collection 4.3M combined [S23].

## Pitfalls, limits, criticism

- **Triggering is entirely dependent on the `description` field** — there's no separate classifier, keyword index, or embedding match in the reference model; it's the LLM reading name+description at generation time. This means (a) a vague description silently never fires, and (b) an overly broad one fires on unrelated requests and can "steal" triggers from a legitimate neighboring skill — Anthropic's own enterprise doc lists this as a first-class "Coexistence" failure mode to test for [S12].
- **Too many skills degrades recall**, not just cost — Anthropic's enterprise guidance explicitly says to "stop adding when performance degrades," measured via eval, not a fixed number [S12].
- **Claude Code silently truncates the skill listing** once it exceeds its context-window-percentage budget, dropping least-used skills' descriptions first — a purely operational failure mode invisible unless you run `/doctor` or `--debug` [S15].
- **Skill content doesn't get re-read on later turns** — if a skill "stops working" mid-conversation, the instructions are usually still in context but being deprioritized against other signals, or (after auto-compaction) genuinely evicted past the 25k-token combined re-attach budget [S15].
- **No sync across surfaces** — a skill uploaded to claude.ai, one uploaded via the API, and one committed to a Claude Code project are three separate artifacts requiring three separate upload/maintenance flows; Anthropic's own docs call this out as a real operational cost for anyone deploying across surfaces [S10, S12].
- **API-side skills have no network access and no runtime package installs** — a skill authored/tested in Claude Code (full network access) will silently misbehave if ported to the API's sandboxed container without checking the pre-installed package list [S10, S16].
- **The security surface is now empirically adversarial**, not just a documented risk: real malware campaigns, scanners specifically evading, and a growing tools ecosystem (SkillScan, SkillsGuard, Skillcop, SkillFortify, Bastionskill — all shipped as reactive point tools in 2026) confirm the enterprise "audit before installing" advice is necessary in practice, not boilerplate caution [S24-S27, HN "Show HN" listings].
- **Static scanning has a known blind spot**: instructions that only become malicious after distribution (payload hosted on an external, later-modified domain) evade every scanner that only inspects the packaged files at submission time [S26].
- **Skills API workspace scoping is a multi-tenancy trap** if not designed for: any workspace-scoped API key can read/invoke/delete *every* custom skill in that workspace — Anthropic explicitly recommends per-tenant workspaces for anyone building a platform on this [S14].

## What changed in the last 6 months (roughly April-September 2026)

- Skills API graduated from the `skills-2025-10-02` beta to GA, with breaking field renames (`display_title`→`display_name`, `latest_version`→`latest_version_id`) and a behavior change on delete (now cascades to all versions instead of erroring) [S14].
- `skill-creator`'s eval/benchmark/description-tuning workflow was formalized and announced standalone (Mar 3, 2026; updated Jun 21, 2026) as a reusable plugin rather than an ad hoc pattern [S19, S15].
- The ClawHub security incidents (Feb-Jul 2026) turned "skill security" from a documentation section into an active tooling category — at least 5 third-party scanners shipped as "Show HN" projects in direct response [HN search results, S24-S27].
- The July 2026 MCP spec revision (dropping session-management requirements) shifted the practical "Skills vs. MCP" cost-benefit calculus that the community had been debating since the Oct 2025 launch [S28].
- Claude Code merged custom commands into skills as a single mechanism (exact date not pinned in the docs read, but the migration note — "Your existing `.claude/commands/` files keep working" — indicates this happened after the initial Oct 2025 skills launch, as a Claude-Code-specific unification) [S15].
- Claude Code added a dedicated `/skill-doctor` usage/cost report and `skillOverrides` settings-based visibility control, addressing the "too many skills" failure mode operationally rather than just documenting it as advice [S15].

## Diagram candidates

1. **Progressive disclosure funnel** — 3 concentric boxes (Metadata always-loaded → Instructions on-trigger → Resources on-demand) with token-cost labels and arrows showing when each tier's content enters the context window. Source: [S1, S10].
2. **Skill trigger sequence (API)** — actors: User, Claude, Code Execution Container, Filesystem. Arrows: user message → Claude (sees metadata in system prompt) → Claude invokes Bash `cat SKILL.md` → container returns file content → Claude optionally reads `forms.md` → Claude executes task. [S18].
3. **Skill directory anatomy** — a tree diagram of `skill-name/{SKILL.md, scripts/, references/, assets/}` annotated with "loaded always / on trigger / on reference / executed never-in-context." [S1].
4. **Claude Code skill precedence resolution** — a decision flowchart: enterprise > personal > project > nested, with the "both stay available, addressed by qualified name" branch for nested collisions. [S15].
5. **Skills vs MCP vs Subagents vs Slash commands vs CLAUDE.md — a 2x2-ish quadrant** or Venn: axes could be "always-loaded vs conditionally-loaded" × "static knowledge vs live external access vs isolated execution." [S15, S18, S28].
6. **The Skills API container lifecycle state machine** — states: created → active → idle (checkpointed ~5 min) → reusable (within 30 days via container ID) → expired. [S16].
7. **ClawHub attack chain** — actors: Attacker, ClawHub registry, Victim's OpenClaw agent, Staging server, macOS host. Arrows: publish fake skill → user installs → skill tells agent to fetch "dependency" → staging server serves obfuscated command → command decodes/executes stage-2 → stage-2 downloads binary → strips quarantine → infostealer runs. [S25].
8. **External-domain scanner-evasion diagram** — showing the timeline: skill submitted (benign external page) → passes scanners → gains installs → external page later modified to serve malicious instructions → static scan at submission time can never catch this. [S26].
9. **Eval-loop workflow for skill authoring** — cyclic diagram: draft skill → generate eval queries (train/validation split) → run with/without skill → grade assertions → benchmark deltas → revise description/instructions → repeat. [S6, S7, S19].
10. **Distribution channel map** — one skill source (a Git repo) fanning out to five sinks: project `.claude/skills/`, Claude Code Plugin marketplace, Skills API workspace, claude.ai per-user upload, skills.sh community registry — each annotated with its scope (user/workspace/org/public). [S15, S14, S13, S23].

### Chart candidates (real data, needs a plotting pass)

- skills.sh leaderboard install counts, top ~10 skills, bar chart, source [S23] (accessed 2026-09-30 — numbers are live/changing, note the access date on the chart).
- Snyk ToxicSkills severity breakdown: 13.4% critical / 36.82% any-issue / rest clean, as a stacked bar or donut, n=3,984, source [S27].
- Timeline chart of Skills-security "Show HN" tool launches per month (Feb-Sep 2026) to visualize the reactive tooling wave — would need a dedicated HN query per month to build the series; flagged as **not yet built**, only sampled dates exist in these notes.

## Glossary

- **Skill**: a directory with `SKILL.md` (+ optional bundled files) that packages procedural knowledge for an agent to load on demand.
- **SKILL.md**: the required file inside a skill; YAML frontmatter (metadata) + Markdown body (instructions).
- **Progressive disclosure**: the 3-tier loading strategy (metadata → instructions → resources) that keeps unused skills at near-zero context cost.
- **Frontmatter**: the YAML block between `---` markers at the top of `SKILL.md`.
- **`skill_id`**: the API identifier for a skill in `container.skills[]` — a short name (`pptx`) for Anthropic skills, a generated `skill_01...` ID for custom skills.
- **Container** (code execution): the sandboxed Linux VM where Skills' scripts actually run on the Claude API; expires 30 days after creation.
- **`context: fork`**: Claude Code frontmatter field that runs a skill's body as a fresh, isolated subagent's entire prompt instead of inline in the main conversation.
- **`allowed-tools` (skill frontmatter)**: tools pre-approved without a permission prompt for the turn that invokes the skill.
- **`disable-model-invocation`**: frontmatter flag restricting a skill to manual (human-typed `/name`) invocation only.
- **skill-creator**: Anthropic's own meta-skill/plugin that automates writing, evaluating, and iterating on other skills.
- **ClawHub**: OpenClaw's community skill marketplace/registry; site of the Feb 2026 malware incident.
- **skills.sh**: a third-party, cross-vendor community registry and install-count leaderboard for Agent Skills (`npx skills add <owner/repo>`).
- **Agent Skills spec (agentskills.io)**: the open, vendor-neutral standard for the `SKILL.md` format, separate from any one client's implementation extensions.

## Unverified / open questions

- **Exact date Claude Code merged custom commands into skills.** The docs state the fact and that old `.claude/commands/` files still work, but give no version/date for the merge itself. Tried: read the full `code.claude.com/docs/en/skills.md` page; no changelog entry cited there. Would need `code.claude.com/docs/en/changelog` or release notes to pin this.
- **Whether the Rakuten "day to an hour" claim has any independent (non-Anthropic-published) confirmation.** Verified the quote is genuinely on claude.com/blog/skills (found it in the raw HTML, attributed to Yusuke Kaji, General Manager AI), but it is a vendor-published customer testimonial, not an independent measurement — treated as VERBATIM-but-self-reported in these notes.
- **Precise install/adoption numbers for the Agent Skills standard as a whole** (e.g., total skills published across all registries, total unique adopting organizations). agentskills.io's client showcase lists ~40 named products but gives no aggregate install/usage figure; skills.sh gives per-skill leaderboard numbers only, not an ecosystem total.
- **Whether OpenAI Codex, Cursor, Gemini CLI, VS Code/Copilot, and OpenCode's implementations are spec-compliant in the same way** (e.g., do they all implement the same frontmatter subset, same discovery-directory conventions?). Confirmed each is *listed* as a client with a working instructions URL [S2], but did not open each individual product's own skills docs to verify feature parity — flagged as a gap if the book wants a feature-parity matrix across clients.
- **The precise scope of "hundreds of OpenClaw skills" in the ClickFix-style campaign** mentioned by 1Password — the source calls this "broader reporting" without citing a specific follow-up report by name; could not independently verify the count.
- Did not open OpenAI Codex's, Cursor's, Gemini CLI's, or VS Code's own skills documentation pages directly (only agentskills.io's client-showcase description of them) — if the book chapter wants direct-primary-source confirmation of each vendor's own claims about their Skills support, those pages (`developers.openai.com/codex/skills/`, `cursor.com/docs/context/skills`, `geminicli.com/docs/cli/skills/`, `code.visualstudio.com/docs/copilot/customization/agent-skills`) should be read directly in a follow-up pass.

## Sources

- [S1] "Specification," agentskills.io, publisher: Agent Skills open-standard project (Anthropic-originated), no single dated byline (page reflects current spec state), URL: https://agentskills.io/specification, accessed 2026-09-30.
- [S2] "Agent Skills Overview" (incl. Client Showcase list), agentskills.io, URL: https://agentskills.io/home, accessed 2026-09-30.
- [S3] "Client Showcase," agentskills.io, URL: https://agentskills.io/clients, accessed 2026-09-30.
- [S4] "Quickstart," agentskills.io, URL: https://agentskills.io/skill-creation/quickstart, accessed 2026-09-30.
- [S5] "Best practices for skill creators," agentskills.io, URL: https://agentskills.io/skill-creation/best-practices, accessed 2026-09-30.
- [S6] "Optimizing skill descriptions," agentskills.io, URL: https://agentskills.io/skill-creation/optimizing-descriptions, accessed 2026-09-30.
- [S7] "Evaluating skill output quality," agentskills.io, URL: https://agentskills.io/skill-creation/evaluating-skills, accessed 2026-09-30.
- [S8] "Using scripts in skills," agentskills.io, URL: https://agentskills.io/skill-creation/using-scripts, accessed 2026-09-30.
- [S9] "How to add skills support to your agent," agentskills.io, URL: https://agentskills.io/client-implementation/adding-skills-support, accessed 2026-09-30.
- [S10] "Agent Skills" (overview), Anthropic/Claude Platform docs, URL: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview, accessed 2026-09-30.
- [S11] "Skill authoring best practices," Anthropic/Claude Platform docs, URL: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices, accessed 2026-09-30.
- [S12] "Skills for enterprise," Anthropic/Claude Platform docs, URL: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/enterprise, accessed 2026-09-30.
- [S13] "Claude API skill," Anthropic/Claude Platform docs, URL: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/claude-api-skill, accessed 2026-09-30.
- [S14] "Using Agent Skills with the API," Anthropic/Claude Platform docs, URL: https://platform.claude.com/docs/en/build-with-claude/skills-guide, accessed 2026-09-30.
- [S15] "Extend Claude with skills," Claude Code docs, URL: https://code.claude.com/docs/en/skills, accessed 2026-09-30.
- [S16] "Code execution tool," Anthropic/Claude Platform docs, URL: https://platform.claude.com/docs/en/agents-and-tools/tool-use/code-execution-tool, accessed 2026-09-30.
- [S17] "Introducing Agent Skills," Claude (Anthropic) blog, published 2025-10-16, URL: https://claude.com/blog/skills, accessed 2026-09-30.
- [S18] Barry Zhang, Keith Lazuka, Mahesh Murag, "Equipping agents for the real world with Agent Skills," Anthropic Engineering blog, published 2025-10-16, updated with open-standard note 2025-12-18, last modified 2026-04-15, URL: https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills, accessed 2026-09-30.
- [S19] "Improving skill-creator: Test, measure, and refine Agent Skills," Claude (Anthropic) blog, published 2026-03-03, modified 2026-06-21, URL: https://claude.com/blog/improving-skill-creator-test-measure-and-refine-agent-skills, accessed 2026-09-30.
- [S20] `anthropics/skills` GitHub repository (README + metadata), Anthropic, created 2025-09-22, URL: https://github.com/anthropics/skills, accessed 2026-09-30.
- [S21] `agentskills/agentskills` GitHub repository (spec host), Agent Skills open-standard project, created 2025-12-16, URL: https://github.com/agentskills/agentskills, accessed 2026-09-30.
- [S22] `skill-creator` SKILL.md source, `anthropics/skills` repo, URL: https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/SKILL.md, accessed 2026-09-30.
- [S23] skills.sh homepage/leaderboard, "The Open Agent Skills Ecosystem," URL: https://skills.sh, accessed 2026-09-30 (live/changing data).
- [S24] "Top downloaded skill in ClawHub contains malware," Hacker News discussion (334 points, 151 comments), posted 2026-02-05, URL: https://news.ycombinator.com/item?id=46898615 (linking to S25), accessed 2026-09-30.
- [S25] "From magic to malware: how OpenClaw's Agent Skills become an attack surface," 1Password Blog, published 2026-02-02, URL: https://1password.com/blog/from-magic-to-malware-how-openclaws-agent-skills-become-an-attack-surface, accessed 2026-09-30.
- [S26] "How a malicious AI agent skill passed security checks and reached 26,000 users," CSO Online, published 2026-06-24, URL: https://www.csoonline.com/article/4188840/how-a-malicious-ai-agent-skill-passed-security-checks-and-reached-26000-users.html, accessed 2026-09-30.
- [S27] "Snyk Finds Prompt Injection in 36% of Payloads in a ToxicSkills Study" (Snyk blog, "ToxicSkills"), Snyk, scan snapshot dated 2026-02-05, published on/around 2026-06-25 per HN indexing, URL: https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/, accessed 2026-09-30.
- [S28] "Skills vs. MCP tools for AI agents: when to use which," LogRocket Blog, published 2026-08-25, URL: https://blog.logrocket.com/skills-vs-mcp-tools-agent-guide/, accessed 2026-09-30.
- [S29] "Skills vs. MCP? Wrong Question," h3manth.com (Hemanth), published circa 2025-12, URL: https://h3manth.com/scribe/skills-and-mcp-better-together/, accessed 2026-09-30.
