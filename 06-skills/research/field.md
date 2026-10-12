# 06. Agent Skills — field reports notes

## TL;DR (what an engineer must know today, 2026-09-30)

- A Skill = a folder with `SKILL.md` (YAML frontmatter + Markdown body) plus optional `scripts/`, `references/`, `assets/`. Only `name` and `description` are required by the open spec. [S2]
- Progressive disclosure has 3 levels: metadata (~100 tokens, always loaded) → full `SKILL.md` body (loaded on activation, spec recommends <5000 tokens / <500 lines) → bundled files (loaded only on demand, zero cost until read). [S2][S8]
- Agent Skills is now a vendor-neutral **open standard** (agentskills.io, GitHub `agentskills/agentskills`), originally built by Anthropic (announced 2025-10-16) and since adopted by a large, verified list of agent products: Cursor, OpenAI Codex/ChatGPT, Gemini CLI, GitHub Copilot, VS Code, OpenCode, Goose, Amp, Letta, OpenClaw, Factory, Roo Code, JetBrains Junie, and ~40 more. [S1]
- Claude Code layers **proprietary extensions** on top of the open spec: `context: fork` (run in subagent), `disable-model-invocation`, `allowed-tools`/`disallowed-tools`, dynamic `` !`shell` `` injection, `model`/`effort` override, argument substitution, hooks. Using these outside Claude Code breaks portability — the spec allows only 6 fields (`name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`). [S4]
- "Custom commands have been merged into skills" in Claude Code — `.claude/commands/*.md` still works but is now the legacy subset of the skills format. [S4]
- The field consensus after a year of production use: **skills and MCP are not substitutes, they solve different problems** — MCP is for external systems/services + auth, skills are packaged procedural knowledge/prompts + optional scripts. The "skills replace MCP" framing from Oct 2025 launch commentary was largely walked back by mid-2026 threads, though CLI-tools-over-MCP-servers sentiment persists. [S9][S10][S11][multiple HN comments, see Mechanics]
- Real production data says triggering is the #1 practical failure mode: an independent September 2026 audit of 216 public Claude Code skills found **69% have descriptions unlikely to reliably trigger the skill**, and only 31% pass a triggering check outright. [S14]
- Skill marketplaces (ClawHub for OpenClaw) became a real supply-chain attack surface in 2026: a top-downloaded "Twitter" skill turned out to be macOS infostealer malware (Feb 2026), and an independent scan of 2,354 ClawHub skills found 86% "vulnerable" and 4.4% outright "malicious" by behavioral analysis. [S12][S13]
- Anthropic ships this over three surfaces with different constraints: claude.ai / Cowork (skills sync from account, 10-min poll), Claude Code (filesystem-based, `~/.claude/skills` / `.claude/skills` / plugins), and the Claude API (skills require the **code execution tool** + `container.skills[]`, max 20 skills/request, 30MB upload cap, workspace-scoped not user-scoped). [S4][S7]
- A skill body, once invoked, **stays in context for the rest of the session** (not re-read each turn) — this is a real, recurring token cost, which is why Anthropic's own guidance obsesses over conciseness ("the context window is a public good"). [S4][S6]
- Auto-compaction has a hard skill-content budget: first 5,000 tokens of each invoked skill are kept, shared 25,000-token pool across all skills — meaning heavy skill users silently lose older skills' content after compaction. [S4]
- "Degrees of freedom" is the core authoring heuristic from Anthropic's own best-practices doc: match specificity to task fragility — high freedom (prose heuristics) for judgment calls, low freedom (exact script, no params) for fragile/must-not-vary operations (e.g., DB migrations). [S6]
- Real field measurement culture is still immature: a Sept 2026 audit found that **214 of 215 skills never state their own failure modes/constraints, and 207 of 208 ship with zero evals** — the eval tooling (`skill-creator` plugin, `claude plugin eval`) exists but adoption lags far behind skill creation. [S14][S4]

## Current state and versions (as of 2026-09-30)

- **Open standard**: agentskills.io, spec is versioned informally via the `skills-ref` reference validator (`skills-ref validate ./my-skill`); frontmatter fields frozen at 6: `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`. [S2]
- **Claude Code**: skills doc describes behavior current through v2.1.2xx line (doc cites specific version gates up to v2.1.282 for a bundled-skill feature, and v2.1.277 for worktree skill discovery — i.e. very actively evolving, weekly-ish point releases). Frontmatter surface is much larger than the spec: `name`, `description`, `when_to_use`, `argument-hint`, `arguments`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `disallowed-tools`, `model`, `effort`, `context`, `agent`, `background`, `hooks`, `paths`, `shell`, `metadata`, `license`, `compatibility`. [S4]
- **Claude API**: skills require the `code_execution_20250825` tool type and `container.skills[]`; model example given in docs is `claude-opus-5-5`. Anthropic-hosted skills currently listed: `pptx`, `xlsx`, `docx`, `pdf`. [S7]
- **Adoption** (agentskills.io client showcase, live page, ~45+ logos as of this fetch): Claude Code, Claude (claude.ai), ChatGPT & Codex, Cursor, Gemini CLI, GitHub Copilot, VS Code, OpenCode, Goose (Block), Amp, Letta, OpenHands, Mux, Firebender, JetBrains Junie, ZeroClaw, Autohand, Factory, Roo Code, Mistral Vibe, Ona, Qodo, Laravel Boost, Kiro, Databricks Genie Code, Spring AI, Tabnine, Snowflake Cortex Code, Pulumi Neo, Hermes Agent (Nous Research), **OpenClaw**, and more. [S1] — this directly confirms the editor's leads list (Codex, Cursor, Gemini CLI, VS Code/Copilot, OpenCode, OpenClaw) as accurate.
- **Skill-creator**: official Anthropic plugin (`skill-creator@claude-plugins-official`), does eval-driven authoring with `evals/evals.json`, `grading.json`, `benchmark.json`, description-tuning via generated should/should-not-trigger prompts, and blind A/B between two skill versions. [S4]
- **ClawHub** (OpenClaw's skill marketplace, not an Anthropic product): by an HN comment (2026-05-17, unverified primary source but widely repeated) OpenClaw reportedly hit "346K GitHub stars... 44,000+ ClawHub skills, 500K+ running instances" — treat as directional only, not confirmed against OpenClaw's own numbers. [HN comment, unverified]

## Timeline

- **2025-10-09/10**: Simon Willison notices and blogs about a leaked/early build of Claude Skills before official launch ("I accidentally leaked the existence of these last Friday" — simonw, HN comment). [S10]
- **2025-10-16**: Anthropic officially announces Claude Skills (`claude.com/blog/skills`, was `anthropic.com/news/skills`). Requires the Code Execution Tool (beta) as the sandbox. Partner quotes: Rakuten ("What once took a day, we can now accomplish in an hour"), Box ("saving hours of effort"), Notion ("Less prompt wrangling on complex tasks, more predictable results"). Same-day HN thread: 816 points / 427 comments. [S5][S10]
- **2025-10-16**: Anthropic engineering blog "Equipping agents for the real world with Agent Skills" (authors: Barry Zhang, Keith Lazuka, Mahesh Murag) — the deeper technical writeup, frames skills as "a well-organized manual that starts with a table of contents, then specific chapters, and finally a detailed appendix." [S8]
- **2025-10-16/17**: obra's "Superpowers" (a full skill-based dev methodology, predates official launch by about a week per HN commenter ryancnelson: "I was fascinated on Tuesday by 'Superpowers'") gets cited repeatedly as the prior-art / best-made example. [S10][S17]
- **2025-10-17**: Simon Willison's "Claude Skills are awesome, maybe a bigger deal than MCP" — second major HN thread, 738 points / 370 comments; kicks off the skills-vs-MCP debate that runs through all of 2026. [S9][S11]
- **~2025-10 → 2026**: Custom commands (`.claude/commands/`) get folded into the skills format in Claude Code; old files keep working but skills are now the recommended format. [S4]
- **2026-02-02 to 2026-02-06**: ClawHub's top-downloaded skill (a fake "Twitter" skill) revealed to be a staged macOS infostealer; multiple outlets (1Password, eSecurityPlanet) cover "hundreds of OpenClaw skills" in the campaign. [S12]
- **2026-02-10**: HN notices ClawHub itself (`clawhub.ai`) as a story. [HN]
- **2026-02-24**: "Show HN: We scanned 500 ClawHub skills for security risks – 10% were dangerous" (early, smaller-sample security scan). [HN]
- **2026-03-03**: Anthropic ships "Improving skill-creator: Test, measure, and refine Agent Skills" — the eval/benchmark tooling described in Claude Code docs. [S4, referenced]
- **2026-03-22**: "Skills are quietly becoming the unit of agent knowledge" trends on HN — signals the framing shift from "cute feature" to "the packaging primitive." [HN, id 47475832]
- **2026-04-15**: Trent.ai publishes the large-sample ClawHub analysis: 2,354 skills, 86% vulnerable / 4.4% malicious by behavioral analysis. [S13]
- **2026-04-29**: "30 ClawHub skills secretly turn AI agents into a crypto swarm" (The Register + Manifold Security) — a distinct malware campaign (crypto-mining recruitment via skills) months after the infostealer one. [HN]
- **2026-06-24**: "Malicious AI 'Skills' on OpenClaw's ClawHub Marketplace Bypass Scanners" — shows the malicious-skill problem is not solved by mid-2026, scanners are being evaded. [HN]
- **2026-08-23**: fastnewsdev (Telegram) covers `benjamin-plus` (JetBrains): an extracted 745-token prompt/skill, measured −17.9% cost / −22% tokens on 80 paired tasks when injected directly into `AGENTS.md`, but **zero savings** when installed as a normal `~/.claude/skills/` folder skill, because "агенты тратят доп шаги на то, чтобы найти этот самый SKILL.md" (agents spend extra steps just finding the SKILL.md). [S16]
- **2026-09-07 / 09-14**: fastnewsdev covers two more community skills as recurring "useful skill of the week" finds: `sepia` (writing-quality skill, cross-linked in this book's own tooling) and `deslop-GPT` (removes bloat: ~50% tests, ~25% "verification theater", ~25% defensive code). [S16]
- **2026-09-10**: skillcrossroads.com publishes "State of Claude Code Skills" report: 216 public skills / 18 repos, rubric v1.2, 69% unreliable-trigger descriptions, near-total absence of stated failure modes and evals. [S14]
- **2026-09-17**: "Show HN: Linting 216 public Claude Code skills – 69% won't reliably trigger" posted (low engagement: 3 points, 0 comments — a signal in itself that a hard security/quality finding on skills doesn't automatically get traction on HN by late 2026, possibly saturation). [HN, id 49744398]

## Mechanics

### File format and directory layout (open spec) [S2]

```
skill-name/
├── SKILL.md          # Required: metadata + instructions
├── scripts/          # Optional: executable code
├── references/       # Optional: documentation
├── assets/           # Optional: templates, resources
└── ...
```

Minimal `SKILL.md` (VERBATIM, [S2]):
```markdown
---
name: skill-name
description: A description of what this skill does and when to use it.
---
```

Frontmatter fields per the open spec, with constraints [S2]:

| Field | Required | Constraint |
|---|---|---|
| `name` | Yes | ≤64 chars, lowercase alnum + hyphens, no leading/trailing/double hyphen, **must match parent directory name** |
| `description` | Yes | 1–1024 chars, non-empty |
| `license` | No | license name or file ref |
| `compatibility` | No | ≤500 chars, environment requirements |
| `metadata` | No | free string→string map |
| `allowed-tools` | No | space-separated tool list, **experimental**, varies by client |

`allowed-tools` example (VERBATIM, [S2]): `allowed-tools: Bash(git:*) Bash(jq:*) Read`

### Progressive disclosure — the three stages [S1][S2]

1. **Discovery**: at startup, every skill's `name` + `description` load into the system prompt/context — nothing else.
2. **Activation**: when a task matches, the agent reads the *entire* `SKILL.md` body into context (spec recommends keeping this under ~5000 tokens / 500 lines; split the rest into `references/`).
3. **Execution**: the agent follows instructions, optionally executing `scripts/` (cost = only script output, not script source) or reading `references/`/`assets/` on demand (zero cost until read).

Anthropic's own framing (VERBATIM, [S8]): "a well-organized manual that starts with a table of contents, then specific chapters, and finally a detailed appendix."

### Claude Code specifics beyond the spec [S4]

Claude Code explicitly states: "Claude Code skills follow the Agent Skills open standard... Claude Code extends the standard with additional features like invocation control, subagent execution, and dynamic context injection." Fields outside the spec's 6 are **Claude Code-only** — if you package a skill for claude.ai upload or the API, extra keys are a **hard error**:

```
Unexpected key(s) in SKILL.md frontmatter: argument-hint. Allowed properties are: allowed-tools, compatibility, description, license, metadata, name
```
(VERBATIM error message, [S4])

Dynamic context injection example (VERBATIM, [S4] "Create your first skill" walkthrough):
```yaml
---
description: Summarizes uncommitted changes and flags anything risky. Use when the user asks what changed, wants a commit message, or asks to review their diff.
---

## Current changes

!`git diff HEAD`

## Instructions

Summarize the changes above in two or three bullet points, then list any risks you notice such as missing error handling, hardcoded values, or tests that need updating. If the diff is empty, say there are no uncommitted changes.
```
The `` !`command` `` syntax runs *before* the skill reaches Claude; output replaces the placeholder. A failed injected command (non-zero exit, with a carve-out for search/diff tools' exit code 1) **aborts the whole invocation** — Claude never sees the skill for that turn. [S4]

Skill locations and precedence, Claude Code [S4]: Enterprise (managed settings dir) > Personal (`~/.claude/skills/`) > Project (`.claude/skills/`, committed) > Nested (subdir `.claude/skills/`, namespaced as `dir:skill` on name clash) > Plugin (`plugin-name:skill-name`) > claude.ai-synced (`~/.claude/skills/synced/`, namespace `anthropic-skills:`).

Two invocation-control fields solve the "who's allowed to trigger this" problem, a recurring field complaint [S4]:
- `disable-model-invocation: true` — only the human can run it (`/deploy`, `/commit` — anything with side effects you don't want Claude deciding to trigger).
- `user-invocable: false` — only Claude can run it (background knowledge, not a meaningful user action).

`context: fork` runs the skill's body as the **prompt of a fresh subagent** (default `general-purpose`, or `Explore`/`Plan`/a custom agent) with no access to the main conversation history — explicitly *not* the same as forking the conversation. Runs in background by default (v2.1.218+). [S4]

Skill content lifecycle — a genuinely under-documented cost center [S4]: once invoked, a skill's rendered body "stays there across later turns" and is **not re-read**. On auto-compaction, Claude Code re-attaches the most recent invocation of each skill, keeping only the **first 5,000 tokens of each**, under a **shared 25,000-token budget across all skills**, filled starting from most-recently-invoked — meaning in a long session with many skills invoked, older ones can be **dropped entirely**.

The skill *listing* itself (names+descriptions for all skills) has a separate budget: 1% of the model's context window by default (`skillListingBudgetFraction`), each entry capped at 1,536 characters (`description` + `when_to_use` combined), and when it overflows, Claude Code drops descriptions starting from least-invoked skills. [S4]

### Claude API — skills require code execution [S7]

Skills on the API are not a standalone feature; they require the `code_execution_20250825` tool and are attached via `container.skills`.

Request example (VERBATIM, [S7]):
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

Upload a custom skill (VERBATIM, [S7]):
```bash
curl -X POST "https://api.anthropic.com/v1/skills" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -F "files[]=@financial_skill/SKILL.md;filename=financial_skill/SKILL.md" \
  -F "files[]=@financial_skill/analyze.py;filename=financial_skill/analyze.py"
```
Limits: ≤30MB uncompressed upload, ≤20 skills per request, `pptx`/`xlsx`/`docx`/`pdf` are Anthropic-hosted. **Security note directly from the docs**: "Custom Skills are workspace-scoped, not user/session scoped. Any API key with workspace access can read, invoke, and delete every custom Skill" — multi-tenant SaaS builders must create per-tenant workspaces (org default cap: 100 workspaces) for isolation. [S7] This is a sharp, easy-to-miss gotcha for anyone bolting skills onto a multi-tenant product.

### Skills vs MCP vs subagents vs slash commands vs CLAUDE.md — what the field actually concluded

This was *the* debate of Oct 2025–2026. Representative positions, dated, to show how the framing moved:

- **Launch-week hot take (2025-10-17)**, Simon Willison via HN summary [S9][S11]: skills win on token economics — "GitHub's official MCP on its own famously consumes tens of thousands of tokens of context"; CLI tools + skills > MCP servers because "LLMs know how to call `cli-tool --help`."
- **Immediate pushback, same thread** (samdjstephens, 2025-10-17): "MCP and Skills are solving 2 different problems... MCP is about integration of external systems and services. Skills are about context management." (VERBATIM quote, [S11])
- **_pdp_ (2025-10-17)**: "These are completely different things. MCP is also about consuming external services handling oauth and all of that. Skills are effectively cli tools + prompts." (VERBATIM, [S11])
- **tptacek (2025-10-17)**: "the big story here is how hyperfocused and path-dependent people got on MCP, when the actually-interesting thing is simply 'tool calls'. Tool calls are incredibly interesting and useful. MCP is just one means to that end, and not one of the better ones." (VERBATIM, [S11])
- **Mid-2026 confident claim** (HN comment, 2026-02-16): "This is coming late as skills have largely replaced MCP. Now your site can just host a SKILL.md to tell agents how to use the site." [HN comment]
- **Counter, roughly contemporaneous** (HN comment, 2026-01-01): "MCP isn't going anywhere. Some developers can't seem to see past their terminal or dev environment when it comes to MCP. Skills, etc do not replace MCP and MCP is far more than just document[ation]." [HN comment]
- **rahimnathwani (2025-10-16)**, on skills vs subagents: "Subagents have their own context. Skills do not." (VERBATIM, [S10]) — the cleanest one-line distinction found in the whole research pass.
- **lukev (2025-10-16)**: "a skill is 'just' a bundle of prompts, scripts, and files that can be read into context as a unit... a sub-agent is an 'execution-level' construct, whereas a skill is a 'data-level' construct." (VERBATIM, [S10])

**Net assessment for the book**: by late 2026 the field position has stabilized close to samdjstephens'/_pdp_'s Oct-2025 take — skills package *procedural knowledge that runs in the current agent's context or a forked subagent*; MCP packages *access to external systems with auth/resources/prompts as a standard wire protocol*; subagents provide *context isolation*; slash commands are *the invocation UX*, now a strict subset of the skills format in Claude Code; CLAUDE.md/AGENTS.md are *always-loaded* project facts, while a skill's body is *loaded-on-demand* — Claude Code's own docs literally recommend converting a CLAUDE.md section into a skill once it "has grown into a procedure rather than a fact." [S4] Cross-link: MCP mechanics → ch.05; subagents → ch.12/13; CLAUDE.md/context budgeting → ch.02.

### Writing good skills — Anthropic's own authoring rules [S6]

Core principle: **"Claude is already very smart" — only add context Claude doesn't already have.** Concrete before/after (VERBATIM, [S6]):

Good (~50 tokens):
````markdown
## Extract PDF text

Use pdfplumber for text extraction:

```python
import pdfplumber

with pdfplumber.open("file.pdf") as pdf:
    text = pdf.pages[0].extract_text()
```
````
Bad (~150 tokens) — same content padded with PDF/library background Claude already knows.

**Degrees of freedom** (the single most reusable idea in the doc, [S6]):
- **High freedom** (prose heuristics) — when multiple valid approaches exist, decisions are context-dependent (e.g., code review steps).
- **Medium freedom** (parameterized pseudocode/scripts) — a preferred pattern exists but some variation is fine.
- **Low freedom** (exact script, no/few params, explicit "do not modify") — fragile, must-not-vary operations, e.g. DB migrations. Analogy given: "narrow bridge with cliffs on both sides" vs "open field with no hazards."

**Description-writing rules** [S6]: always third person ("Processes Excel files...", never "I can help you..."); must cover both *what* and *when*; must include trigger keywords, because Claude picks from "potentially 100+ available Skills" using only this field. Bad examples given verbatim: `description: Helps with documents` / `description: Processes data` / `description: Does stuff with files`.

**Naming**: recommend gerund form (`processing-pdfs`, `analyzing-spreadsheets`); forbidden: vague (`helper`, `utils`), reserved words `anthropic`/`claude` in the name (hard validation rule on API/claude.ai upload paths). [S6]

**Nested-reference anti-pattern** [S6]: keep all reference file links **one level deep** from `SKILL.md` — Claude may `head -100` a doubly-nested reference file instead of reading it fully, silently truncating what it sees.

**Eval-driven development, prescribed order** [S6]: (1) run Claude on real tasks *without* the skill, document gaps; (2) write 3+ eval scenarios targeting those gaps; (3) baseline without skill; (4) write minimal instructions; (5) iterate. "Create evaluations BEFORE writing extensive documentation" (VERBATIM). This is explicitly the opposite order from how most people build skills in practice per the skillcrossroads data (see Numbers).

**"Solve, don't defer"** for bundled scripts [S6]: handle errors in the script itself rather than letting Claude improvise recovery; justify every constant (Ousterhout's "voodoo constants" cited by name) — `REQUEST_TIMEOUT = 30  # HTTP requests typically complete within 30 seconds` vs `TIMEOUT = 47  # Why 47?`.

### skill-creator workflow (official Anthropic plugin) [S4]

Install: `/plugin install skill-creator@claude-plugins-official`. Produces, per skill directory:
- `evals/evals.json` — test cases (prompt, input files, expected behavior)
- runs each case in an isolated subagent (fresh context), records tokens/duration
- `grading.json` — pass/fail with evidence per assertion
- `benchmark.json` — aggregate pass-rate/time/tokens, with-skill vs without-skill
- blind A/B between two skill versions
- auto-generates should-trigger / should-not-trigger prompts to tune the `description` against measured hit rate
- HTML review viewer for qualitative feedback

### Distribution

- **Project**: commit `.claude/skills/` to the repo.
- **Plugin**: `<plugin>/skills/<name>/SKILL.md`, loaded as `/plugin-name:skill-name`; a skill folder can itself become a plugin by adding `.claude-plugin/plugin.json`. [S4]
- **Enterprise/managed**: `.claude/skills/` inside the managed-settings directory (e.g. `/etc/claude-code/.claude/skills/` on Linux), org-wide. [S4]
- **claude.ai sync**: enable a personal skill for your account → downloads to `~/.claude/skills/synced/` in terminal sessions signed in via `/login`, polling claude.ai roughly every 10 minutes; **download-only**, edits to synced files are never uploaded back and can be silently overwritten. [S4]
- **Marketplaces**: Anthropic's official `claude-plugins-official`; community ones like `obra/superpowers-marketplace`; the editor's leads `skills.sh` / `npx skills` were **not found as live, verifiable services** during this research pass (see Unverified) — what *is* verifiable is `claudeskills.cc` (HN, 2025-10-25, "Share, Discover, and Reuse Claude/OpenAI Agent Skills") and `mcpservers.org/claude-skills` (a curated list, HN comment 2025-10-20). [HN]
- **OpenClaw's ClawHub** (`clawhub.ai`) is the largest known third-party skill marketplace and simultaneously the largest known attack surface (see Pitfalls).

## Numbers

- **Progressive disclosure token budget**: metadata ~100 tokens/skill; SKILL.md body recommended <5,000 tokens; SKILL.md body hard-recommended <500 lines. Source: agentskills.io spec, no date-stamped version but current as of 2026-09-30 fetch. [S2]
- **Skill listing context budget in Claude Code**: 1% of the model's context window by default; each skill's `description`+`when_to_use` capped at 1,536 characters regardless. [S4]
- **Compaction skill-retention budget**: 5,000 tokens kept per invoked skill, 25,000-token shared ceiling across all skills. [S4]
- **API limits**: ≤20 skills per `container.skills[]`; ≤30MB uncompressed per skill upload; up to 100 workspaces/org by default for isolation. [S7]
- **ClawHub, Trent.ai analysis, n=2,354, published 2026-04-15** [S13]: behavioral verdicts — benign 9.6% (226), vulnerable 86.0% (2,025), malicious 4.4% (103). VirusTotal verdicts on the *same set* — clean 42.6% (1,002), suspicious 57.2% (1,346), malicious 0.04% (1). Only 6.9% (162) passed **both** tools clean — 89.5% disagreement rate between signature-based and LLM-behavioral analysis. Curated subset (547 skills): malicious rate still 2.4%→4.4% comparing curated vs full registry; vulnerable rate flat at ~85% either way. Average 5.5 findings/package; malicious packages average 4–6 CRITICAL findings.
- **skillcrossroads.com, n=216 public Claude Code skills across 18 repos, published 2026-09-10, rubric v1.2** [S14]: 69% have unreliable-trigger descriptions; triggering breakdown 31% pass / 28% borderline / 40% (87 skills) outright fail; grade distribution A 3% (7), B 72% (156), C 21% (45), D 1% (2), F 3% (6); average score 82.1/100; **only 1 of 216 (0.5%) passes every check cleanly**; "constraints & failure modes stated" present in only 1 of 215 skills; verification steps present in only 6 of 214; eval tests present in only 1 of 208.
- **benjamin-plus (JetBrains), reported via fastnewsdev 2026-08-23** [S16]: 745-token extracted prompt/ruleset (mined from ~1,200 historical agent traces); paired eval on 80 tasks: −17.9% cost (median), −22% tokens, "quality unchanged" — **but only when injected directly into `AGENTS.md`**; installed as a normal `~/.claude/skills/` folder it "экономит НИЧЕГО" (saves nothing) because of discovery overhead. This is a load-bearing, concrete counter-example to the "skills are free until triggered" framing — the *discovery* step itself has a real cost that ate the entire savings in this measured case.
- **rtk real-world compression, reported via fastnewsdev 2026-08-30, n=32,000 logged bash commands over ~4 months** [S16]: self-reported UI counter showed 92.9% average compression; actual measured compression across the full 32k-command sample was 22.1%; median single call compressed **exactly zero tokens** (>50% of calls passed through unchanged); monthly breakdown: May 54.7%, Jun 56.1%, Jul 15.1%, Aug 21.5% (the July/August drop traced to the author restricting rtk to a whitelist after discovering the agent would silently route around bad compressions); a specific regression — grep calls through rtk failed outright on **23.7%** of invocations for two months due to an unreported-but-already-fixed upstream bug the author didn't know to check for. Framed by the author as a general lesson: self-reported tool savings metrics are frequently not the metric that matters; measure your own logs.
- **deslop-GPT skill, self-described stats relayed by fastnewsdev 2026-09-07** [S16]: targets removing ~50% bloated tests, ~25% "verification theater", ~25% defensive/fallback code from agent-produced diffs (self-reported by the skill's own README, not independently verified in this pass).
- **HN engagement as a signal**: launch-week Claude Skills threads got 816 pts/427 comments and 738 pts/370 comments; by 2026-09-17 a security-relevant "69% won't trigger" finding got 3 points / 0 comments — read cautiously (small sample, could be timing/title/luck), but consistent with several field posts describing skills-fatigue/plateauing interest by H2 2026.

## Pitfalls, limits, criticism

- **Triggering is unreliable and this is the #1 reported complaint**, both anecdotally and now measured. rane (HN, 2025-10-18) gave a concrete repro: skill description "Use when creating or editing bash scripts," Claude still didn't invoke it when asked to write a bash script (linked gist). [S11] The skillcrossroads 2026-09-10 audit (n=216) turned this into a number: 69% unreliable, 40% outright fail. [S14] Claude Code's own troubleshooting doc concurs and gives the two failure modes: too-generic description (under-triggers) vs too-broad description (over-triggers, needs `disable-model-invocation`). [S4]
- **Malformed frontmatter fails silently**: if the opening `---` isn't the file's literal first line, or the YAML doesn't parse, Claude Code loads the skill body with *empty metadata* — `/skill-name` still works but Claude can never auto-match it, with no visible error unless you run with `--debug`. [S4]
- **Skill marketplaces are a live supply-chain attack surface**, not a theoretical one. ClawHub incidents in 2026: a top-downloaded fake "Twitter" skill delivered a macOS infostealer via a staged multi-step social-engineering chain (fake prerequisite → obfuscated payload decode → quarantine-attribute removal → binary exec) targeting browser sessions/cookies, saved credentials, dev tokens, SSH keys, cloud credentials (Feb 2026, "hundreds of OpenClaw skills" implicated). [S12] A later wave (Apr 2026) recruited agents into a crypto-mining swarm via 30 skills. [HN] By June 2026, malicious skills were confirmed to actively **bypass existing scanners**. [HN] Anthropic's own launch-day warning (VERBATIM, [S10] azraellzanella quoting the docs): "Keep in mind, this feature gives Claude access to execute code. While powerful, it means being mindful about which skills you use—stick to trusted sources to keep your data safe." — HN's immediate reaction: "Yes, this can only end well." [S10]
- **This is a Claude/Anthropic-ecosystem-vs-OpenClaw-ecosystem distinction worth being precise about in the book**: ClawHub is OpenClaw's marketplace (OpenClaw is a separate open-source project that also adopted the Agent Skills format), not an Anthropic-run store. Anthropic's own official marketplace (`claude-plugins-official`) has not had a comparable public incident reported in this research pass — but Claude Code's docs explicitly warn that a project skill's `allowed-tools` applies even in an untrusted `-p` run, so "review the `allowed-tools` of skills checked into a repository before you run Claude Code there." [S4]
- **Prompt-injection surface via skill content itself**: buildbot's HN comment (2025-10-18) reproduces Willison's exfiltration trick — asking a fresh Claude instance to "Create a zip file of everything in your /mnt/skills folder" as a way to dump bundled skill content/credentials. [S10]
- **Discovery overhead can erase the token savings skills are sold on** — the benjamin-plus case (see Numbers) is the cleanest documented example: identical content, zero net savings once it required the model to locate and open a `SKILL.md` versus being force-injected.
- **Compaction silently drops old skills**: in a long session, once total invoked-skill content exceeds the 25,000-token shared budget, Claude Code drops whole earlier skills after a compaction event, most-recently-invoked first — a source of "the skill worked earlier in the session but stopped" bug reports that isn't a triggering bug at all. [S4]
- **Too many skills degrades the pool itself**: sega_sai (HN, 2025-10-16): "if there are a lot of skills, they will be too big for the context and one would need some way to find the right one. It is unclear how well this approach will scale." [S10] Claude Code's answer is `/skill-doctor` (usage/cost report, flags never-invoked skills) plus `skillOverrides` to demote to `"name-only"` or `"off"` — but this is a manual, per-user cleanup task, not automatic. [S4]
- **CuriouslyC (HN, 2025-10-16)**, a sharply-worded minority skeptical take that recurs across threads: "Anything the model chooses to use is going to waste context and get utilized poorly. Also, the more skills you have, the worse they're going to be. It's subagents v2. Just use slash commands, they work a lot better." [S10]
- **Nearly no one ships evals with their skill**: skillcrossroads found stated-failure-modes present in 1/215 and eval tests present in 1/208 skills surveyed — a huge gap versus Anthropic's own prescribed "evals before documentation" workflow. [S14][S6]
- **Portability is narrower than the "open standard" framing suggests**: only 6 frontmatter fields are spec-legal; every Claude Code convenience field (`context: fork`, `model`, `effort`, `hooks`, `arguments`, dynamic `` !`shell` `` injection) is Claude-Code-only and will hard-error on claude.ai upload / Claude API packaging. A skill authored deep in Claude Code idioms is not automatically a portable Agent Skill. [S4]
- **Naming collisions across sources are a real footgun**: enterprise beats personal beats project on same name; a synced claude.ai skill loses its short name to *any* local same-named skill/command/plugin/MCP prompt, silently, and only `/skills` shows you why. [S4]

## What changed in the last 6 months (since ~2026-03-30)

- The debate shifted from "will skills replace MCP" (2025-10 hot take) to a more settled division of labor by 2026; HN comments from Jan–Sept 2026 increasingly treat "skills vs MCP" as a wrong question, converging toward samdjstephens'/​_pdp_'s original "different layers" framing. [HN comments, dated]
- The **security story got materially worse before any sign of getting better**: Feb 2026 infostealer → April 2026 large-sample vulnerability scan (86% flagged) + separate crypto-swarm recruitment campaign → June 2026 "bypasses scanners" headline. This is a monotonically worsening trend across the measured window, not a one-off. [S12][S13][HN]
- **Quality tooling matured** (skill-creator eval/benchmark/A-B flow shipped, `claude plugin eval`, `/skill-doctor`, `claude plugin validate` for frontmatter linting) but **adoption of that tooling did not follow** — the Sept 2026 skillcrossroads numbers on missing evals/failure-modes are measured *after* all this tooling existed, showing a knowing-doing gap. [S4][S14]
- Ecosystem-adoption breadth kept expanding through 2026 rather than consolidating around one winner — the agentskills.io client list spans coding agents, IDEs, cloud platforms (Databricks, Snowflake), an Android-native agent (Firebender), and a healthcare RCM platform (Agentman), i.e. skills became a de facto interchange format well beyond coding agents. [S1]
- Community sentiment on X/HN/Telegram by late-2026 shows **skills fatigue mixed with continued small real wins**: fastnewsdev's own Aug 30 post opens "Нихрена интересного" ("nothing interesting") about that week's tooling digest, and a Sept 2026 post says outright "Я как-то немного потерял смысл делать #digest агентского тулинга, т.к. там сейчас только инфошум" (lost the point of doing a tooling digest, it's just noise now) — while still surfacing two skills worth trying that same week (`sepia`, `deslop-GPT`). [S16] This "noise but occasional real find" pattern is itself a useful editorial data point for the chapter's tone.

## Diagram candidates

1. **Progressive disclosure pyramid** — 3 tiers (Metadata ~100 tok / always-on → SKILL.md body <5000 tok / on-activation → scripts+references+assets / on-demand, ~0 tok until read), labeled with the spec's numbers. [S2]
2. **Skill trigger flow** — actors: User, Claude, Skill Registry (names+descriptions in context). Arrows: User prompt → Claude matches against descriptions → (match) load full SKILL.md → optional: run script / read reference → respond. Side branch: no match → skill stays dormant.
3. **Claude Code skill resolution precedence** — stacked boxes top-to-bottom: Enterprise > Personal > Project > Nested > Plugin > claude.ai-synced, with the "same name → who wins" rule annotated per pair. [S4]
4. **`context: fork` execution** — Main session --(invokes skill)--> forked subagent (Explore/Plan/custom, no conversation history) --(runs, background by default)--> returns summary to main session.
5. **Skill content lifecycle across compaction** — timeline: Turn 1 invoke Skill A (full body in context) → Turn N invoke Skill B → ... → Compaction event → only last-5000-tokens-per-skill survive, oldest dropped first once 25,000-token pool is exceeded. [S4]
6. **ClawHub attack chain** (the Feb 2026 incident) — actors: Attacker, ClawHub listing, Victim's agent, Staging server, macOS Gatekeeper, Infostealer binary. Steps: fake "openclaw-core" prerequisite → link to staging infra → decode obfuscated payload → download+exec binary → strip quarantine attribute → exfiltrate cookies/credentials/SSH keys/cloud creds. [S12]
7. **Claude API skills request/response flow** — Client → POST /v1/messages with `container.skills[{type,skill_id,version}]` + `tools:[code_execution]` → sandboxed container executes skill script → response contains `file_id` in `bash_code_execution_tool_result` → client calls Files API `GET /v1/files/{id}/content` to download. [S7]
8. **Ecosystem adoption hub-and-spoke** — center node "Agent Skills open standard (agentskills.io)", spokes to Claude Code, claude.ai, Claude API, Cursor, Codex/ChatGPT, Gemini CLI, VS Code/Copilot, OpenCode, Goose, Amp, OpenClaw, Letta, +30 more, annotated with "adopted, verified 2026-09-30." [S1]
9. **Skill-creator eval loop** — Draft skill → Write evals.json → Run N isolated subagent trials (with/without skill) → grading.json → benchmark.json (pass-rate/tokens/time delta) → description-tuning pass (should/should-not-trigger prompts) → iterate. [S4]
10. **Degrees-of-freedom spectrum** — horizontal bar: High freedom (prose heuristics, "open field") ↔ Medium (parameterized script/template) ↔ Low freedom (exact script, no params, "narrow bridge, cliffs both sides"), each with the book's own worked example. [S6]
11. **Skills vs MCP vs Subagents vs Slash commands vs CLAUDE.md** — 2x2-ish comparison table rendered as a diagram: rows = {loaded when, context isolation?, external-system access?, primary use}, columns = the five mechanisms. Sourced from the Mechanics section synthesis. [S4][S9][S11]

## Chart candidates

1. **skillcrossroads grade distribution**, n=216, 2026-09-10: bar chart A 3% / B 72% / C 21% / D 1% / F 3%. [S14]
2. **ClawHub verdict comparison**, n=2,354, 2026-04-15: grouped bars — Behavioral analysis (Benign 9.6%, Vulnerable 86.0%, Malicious 4.4%) vs VirusTotal (Clean 42.6%, Suspicious 57.2%, Malicious 0.04%). [S13]
3. **rtk compression: claimed vs measured**, n=32,000 commands, May–Aug 2026: line/bar showing self-reported 92.9% vs actual monthly 54.7/56.1/15.1/21.5%. [S16]
4. **benjamin-plus paired eval**, n=80 tasks: two bars, cost −17.9%, tokens −22%, with a footnote bar showing "as folder skill: 0%". [S16]

## Glossary

- **SKILL.md** — the required file inside a skill folder: YAML frontmatter + Markdown instructions.
- **Progressive disclosure** — loading skill content in increasing detail (metadata → body → files) only as a task requires it.
- **Degrees of freedom** — how prescriptive a skill's instructions should be, scaled to task fragility (high/medium/low).
- **Frontmatter** — the YAML block between `---` markers at the top of SKILL.md.
- **`allowed-tools`** — frontmatter field pre-approving specific tools for the duration of the invoking turn.
- **`context: fork`** — Claude Code field that runs a skill's body as the prompt of an isolated subagent.
- **Code execution tool / container** — the sandboxed execution environment the Claude API requires for skills to run scripts.
- **skill-creator** — Anthropic's official plugin for eval-driven skill authoring and A/B comparison.
- **`skills-ref`** — the open standard's reference CLI validator for `SKILL.md` frontmatter.
- **ClawHub** — OpenClaw's third-party skill marketplace; site of multiple 2026 malware incidents.
- **Compatibility field** — optional frontmatter string declaring a skill's environment requirements (packages, network, target product).
- **`disable-model-invocation`** — frontmatter flag restricting a skill to manual (human) invocation only.
- **`skillOverrides`** — Claude Code settings key to hide/demote a skill without editing its file.
- **`/skill-doctor`** — Claude Code command reporting per-skill context cost and usage, to find skills worth disabling.

## Unverified / open questions

- **`skills.sh` and `npx skills`** (named in the editor's brief as distribution channels) — could not confirm either exists as a live, real service in this research pass; time budget did not allow exhaustive search, and general web search was unavailable for most of this session (see below). Flag for a follow-up check before publishing.
- **OpenClaw scale numbers** ("346K GitHub stars... 44,000+ ClawHub skills, 500K+ running instances, 180 startups generating $320K+") come from a single unverified HN comment (2026-05-17), not from OpenClaw's own reporting or a cited primary source — treat as a rough community impression, not a fact.
- **deslop-GPT's self-described bloat-removal percentages** (~50%/~25%/~25%) are the skill's own README claim as relayed secondhand via a Telegram digest; not independently benchmarked in this pass.
- **Reddit (r/ClaudeAI, r/mcp, r/LocalLLaMA, etc.)** was explicitly in scope for this lens but was **inaccessible this session** — `old.reddit.com` and `www.reddit.com` search/listing JSON endpoints returned HTTP 403 or a redirect to an HTML login-style page for every user-agent tried (both a generic and a Firefox-spoofed UA). No Reddit thread in this file is a source; everything attributed instead comes from HN, the fastnewsdev Telegram mirror, and official docs/blogs. This is a real gap versus the brief and should be retried with a different access method (e.g., an authenticated Reddit API path) before the chapter is finalized.
- **Habr** search results are client-side rendered (JS) and returned empty on both raw `curl` and `WebFetch`; no Habr articles could be sourced for this chapter. Same gap as Reddit — flag for retry.
- **X/Twitter threads** — not fetched at all this session (no accessible API/mirror attempted given time budget); the brief asked for these explicitly. Gap to close before publishing.
- **WebSearch tool** reported its session budget (200 calls) as already exhausted before this task's first call, for reasons outside this session's own usage — all research after that point relied on WebFetch + direct `curl` (HN Algolia API, GitHub raw, official docs, Telegram mirror). This likely reduced breadth versus a normal research pass, especially for dev.to, Lobsters, and Stack Overflow, none of which were reachable through the fallback methods tried.
- **Exact date Anthropic's `code_execution_20250825` tool version was introduced**, and whether it has since been superseded by a newer dated tool version by 2026-09-30 — the fetched API doc uses this exact string with no visible "current as of" date; worth a direct check against the API changelog.
- **Precise adoption dates** for each of the ~45 clients listed on agentskills.io (e.g., exactly when Cursor, VS Code, or Gemini CLI shipped skills support) were not individually verified — the client showcase confirms *that* they adopted it, not *when*.

## Sources

- [S1] "Agent Skills Overview" (incl. live Client Showcase list), agentskills.io, no dated version shown on page, accessed 2026-09-30. https://agentskills.io
- [S2] "Specification" (SKILL.md format, frontmatter, progressive disclosure), agentskills.io, accessed 2026-09-30. https://agentskills.io/specification
- [S3] agentskills.io llms.txt / client data embedded in [S1] (same fetch).
- [S4] "Extend Claude with skills" — Claude Code docs, Anthropic, accessed 2026-09-30 (content references version gates through Claude Code v2.1.282). https://code.claude.com/docs/en/skills
- [S5] "Claude Skills" announcement, Anthropic/Claude, published 2025-10-16, accessed 2026-09-30. https://claude.com/blog/skills (redirected from anthropic.com/news/skills)
- [S6] "Skill authoring best practices," Anthropic, accessed 2026-09-30. https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
- [S7] "Skills guide" (Claude API), Anthropic, accessed 2026-09-30. https://platform.claude.com/docs/en/build-with-claude/skills-guide
- [S8] "Equipping agents for the real world with Agent Skills," Anthropic Engineering (Barry Zhang, Keith Lazuka, Mahesh Murag), published 2025-10-16, accessed 2026-09-30. https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills
- [S9] Simon Willison, "Claude Skills are awesome, maybe a bigger deal than MCP," published 2025-10-16, accessed 2026-09-30. https://simonwillison.net/2025/Oct/16/claude-skills/
- [S10] Hacker News thread "Claude Skills," id 45607117, 816 points / 427 comments, posted 2025-10-16, accessed 2026-09-30. https://news.ycombinator.com/item?id=45607117
- [S11] Hacker News thread "Claude Skills are awesome, maybe a bigger deal than MCP," id 45619537, 738 points / 370 comments, posted 2025-10-17, accessed 2026-09-30. https://news.ycombinator.com/item?id=45619537
- [S12] 1Password Blog, "From Magic to Malware: How OpenClaw's Agent Skills Become an Attack Surface," published 2026-02-02, accessed 2026-09-30. https://1password.com/blog/from-magic-to-malware-how-openclaws-agent-skills-become-an-attack-surface
- [S13] Trent AI (Julien Brouchier), "Distinguishing Malicious from Vulnerable: 2,354 Popular ClawHub Skills Analysed," published 2026-04-15, accessed 2026-09-30. https://trent.ai/blog/clawhub-ai-agent-security-analysis/
- [S14] Skill Crossroads, "State of Claude Code Skills" report, published 2026-09-10 (rubric v1.2), accessed 2026-09-30. https://skillcrossroads.com/report (homepage: https://skillcrossroads.com)
- [S15] Hacker News, "Show HN: Linting 216 public Claude Code skills – 69% won't reliably trigger," id 49744398, 3 points / 0 comments, posted 2026-09-17, accessed 2026-09-30. https://news.ycombinator.com/item?id=49744398
- [S16] Telegram channel mirror, t.me/s/fastnewsdev, various posts dated 2026-08-23, 2026-08-30, 2026-09-07, 2026-09-14, accessed 2026-09-30. https://t.me/s/fastnewsdev
- [S17] GitHub, obra/superpowers README, accessed 2026-09-30. https://raw.githubusercontent.com/obra/superpowers/main/README.md
- [S18] Cursor Docs, "Skills," accessed 2026-09-30 (via WebFetch summary). https://cursor.com/docs/context/skills
- Various dated Hacker News comments on "skills vs MCP" cited inline by date and paraphrase/quote in Mechanics and Pitfalls (ids include but are not limited to 47485950, 45615992, 46260150, 49789092, 47038408, 46451688, 46317779), collected via https://hn.algolia.com/api/v1/search, accessed 2026-09-30.
