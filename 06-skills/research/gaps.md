# 06. Agent Skills — gaps, contradictions and corrections (completeness-critic notes)

Lens: completeness critic and gap-filler over `spec.md`, `practice.md`, `field.md` (same folder).
Everything below was re-checked against primary sources on 2026-09-30. Source ids here use the
`G` prefix (G1..G50) so they do not collide with the `S` ids of the other three files.
Cross-links: MCP protocol internals (incl. the 2026-07-28 base revision) → ch05; subagents/forking → ch12/13;
CLAUDE.md/AGENTS.md vs always-on context → ch02 and ch11; supply-chain and prompt-injection defences → ch16;
eval methodology → ch17.

## Contradictions resolved

C1. **Which code execution tool version skills need.** spec.md: "latest type is `code_execution_20260521`";
practice.md/field.md: skills "require the `code_execution_20250825` tool". Primary source: there are **three
current versions, every supported model accepts all three, none needs an `anthropic-beta` header** [G2].
`code_execution_20250825` = Bash + file ops; `code_execution_20260120` adds REPL state persistence and
programmatic tool calling; `code_execution_20260521` is the same runtime as `20260120` but its tool description
tells Claude about the 90-second wall-clock limit per Python cell [G2]. The skills guide's wire examples still
use `20250825` [G1]; `web_search_20260209`/`web_fetch_20260209` require `20260120`+ [G2]. Correct statement:
"skills need *a* code execution tool; examples use `20250825`, newest is `20260521`."

C2. **Is the Skills API beta or GA?** spec.md: GA; the 2025-10-16 launch post: "Skills require the Code
Execution Tool beta" [G6]; the Claude Help Center (updated ~Sep 2026) still says skills are "in beta for all
API users using the code execution tool" [G8]. The API docs (authoritative for the API) say verbatim: "The
Skills API is out of beta and needs no beta header. Migrating off `skills-2025-10-02` is optional: requests
that still send it keep working and keep returning the beta response shapes" [G1]. The Help Center line is
stale. Newer SDKs: Python 1.2.0 / TS 0.122.0 / Go 1.68.0 / Java 2.59.0 / Ruby 1.67.0 / C# 12.44.0 stop
sending the beta header even from `client.beta.skills` [G1].

C3. **Can admins distribute skills org-wide in claude.ai?** spec.md and practice.md say no, quoting the
platform overview ("claude.ai does not support centralized admin management or org-wide distribution of custom
Skills" — still on the page today [G3]). Newer, product-authoritative sources contradict it:
2025-12-18 blog: "Claude Team and Enterprise plan admins can now provision skills centrally from admin
settings. Admin-provisioned skills are enabled by default for all users" [G7]; the Help Center (Sep 2026)
documents owner provisioning, per-person/group **sharing**, **"Publish to org"** with an optional review
workflow (offer as "Available to install", "Installed by default", or "Required"), a "User-created skills"
kill switch, and group targeting by bundling skills into a plugin (Enterprise) [G8][G9]. Resolution: the
platform-docs sentence is outdated; org-wide distribution exists in claude.ai/Cowork.

C4. **Which plans get skills.** Launch post and platform overview: Pro, Max, Team, Enterprise [G6][G3].
Help Center (newer): "Skills are available for users on Free, Pro, Max, Team, and Enterprise plans" [G8].
Use the Help Center.

C5. **Do skills.sh and `npx skills` exist?** field.md could not confirm; spec.md/practice.md say yes.
Verified: `vercel-labs/skills` ("The open agent skills tool - npx skills"), repo created 2026-01-14,
latest release v1.7.0 on 2026-09-17, ~32.8k stars, README: "Supports OpenCode, Claude Code, Codex, Cursor, and
75 more" [G45]; skills.sh is live with a leaderboard and an **Audits** page combining "Gen Agent Trust Hub,
Socket, and Snyk" verdicts [G46].

C6. **How big is the ecosystem?** practice.md: 3,884 skills (third-party dashboard) vs Socket's "over 60,000".
Independent measurements show the 3,884 figure is a narrow-scope undercount: 42,447 skills collected from
two marketplaces (Jan 2026) [G37]; 98,380 skills from two registries [G38]; 67,453 latest public OpenClaw
skill versions (May 2026) [G41]; 61,990 ClawHub skills covered by three scanners [G40]; 138,133 public
`SKILL.md` files in 20,556 GitHub repos (Aug 2026) [G39]. skills.sh's homepage tab reads "All Time
(1,508,673)" — its unit is not labelled (see Unverified) [G46]. Safe statement: "tens of thousands of skills
per major registry, >100k SKILL.md files on GitHub by mid-2026."

C7. **Name-collision precedence.** field.md gives a linear chain "Enterprise > Personal > Project > Nested >
Plugin > synced". Claude Code's table [G4]: enterprise over personal, **personal over project**; a skill
beats a `.claude/commands/` file of the same name; root and nested skills **both load** (nested addressed as
`<dir>:name`); plugin skills **both load** (namespaced `/plugin:skill`); a claude.ai-synced skill loses its
short name to anything and runs only as `/anthropic-skills:<name>`. Note the cross-client conflict: the
agentskills.io implementer guide calls "project-level skills override user-level skills" "the universal
convention" [G17]; Gemini CLI (workspace > user > extension > built-in) [G23] and OpenClaw (workspace highest)
[G27] follow it, **Claude Code does the opposite** [G4], and Codex does not merge same-name skills at all —
"both can appear in skill selectors" [G21].

C8. **Compaction retention.** field.md diagram says "only last-5000-tokens-per-skill survive"; the text of all
three notes says first 5,000. Primary: re-attaches "the most recent invocation of each skill after the
summary, keeping the **first** 5,000 tokens of each ... combined budget of 25,000 tokens ... fills this budget
starting from the most recently invoked skill" [G4].

C9. **Snyk ToxicSkills date.** spec.md: "published on/around 2026-06-25 per HN indexing". Page metadata:
`datePublished` 2026-02-05, same day as the scan snapshot [G43].

C10. **The "brand-landingpage" 26,000-user incident.** spec.md presents it as attackers weaponizing a skill
that reached 26,000+ installs including corporate accounts. CSO Online (2026-06-24): it was a **proof of
concept by the research firm AIR**; the fake domain was controlled by researchers; "AIR said no agents were
harmed in the research and that the test payload collected only users' email addresses so they could be
notified"; the "26,000 users reached via Instagram" metric is not defined as installs [G44]. The lesson
(content fetched from an external URL after review evades every static scanner) stands; the "victims" framing
does not.

C11. **"Every field beyond the spec's six is Claude-Code-only."** All three notes say this. Partly outdated:
VS Code/Copilot documents `argument-hint`, `user-invocable`, `disable-model-invocation` and experimental
`context: fork` [G25]; Cursor documents `paths`, `disable-model-invocation`, `icon`, `color` [G28]. They remain
outside the open spec; claude.ai upload, the Skills API and `package_skill.py` reject them with a hard error
[G4]; OpenCode recognises only `name`, `description`, `license`, `compatibility`, `metadata` and ignores the
rest, `allowed-tools` included [G26].

C12. **`context: fork` runs in background — since when?** Claude Code v2.1.218 (2026-07-22): "Changed skills
with `context: fork` to run in the background by default; opt out per skill with `background: false`";
`context: fork` itself arrived in v2.1.0 (2026-01-07) [G5].

C13. **When were slash commands merged into skills?** spec.md: unknown; field.md: "~2025-10 → 2026". Claude
Code v2.1.3, 2026-01-09: "Merged slash commands and skills, simplifying the mental model with no change in
behavior" [G5].

C14. **Minimum Claude Code version for claude.ai skill sync.** Help Center and skills doc: v2.1.273 [G8][G4];
changelog entry "Added syncing of the skills and plugins enabled on your claude.ai account to terminal
sessions" is under v2.1.275 (2026-09-17), and v2.1.273 (2026-09-15) already fixes a sync bug [G5]. Treat
"v2.1.273+" as the documented minimum; the feature landed mid-September 2026 either way.

C15. **"July 2026 MCP revision dropped session management" (spec.md via LogRocket).** Primary evidence: the
MCP Skills extension is written "against base protocol revision `2026-07-28`" [G14], and Anthropic's
2026-09-25 post says Claude "supports the latest MCP spec, commonly referred to as MCP 2.0, which includes a
stateless core" [G11]. Details belong to ch05.

C16. **Metadata cost per skill.** ~100 tokens (Claude docs) vs ~50-100 (agentskills.io client guide [G17]).
Both are rough; OpenClaw publishes a deterministic formula: ~97 characters (~24 tokens) per skill plus the
lengths of `name`, `description`, `location` [G27].

## Claims most likely to be wrong (with corrections)

1. **Wrong:** "Skills API is beta; send `anthropic-beta: skills-2025-10-02`; use `client.beta.skills`."
   **Right:** out of beta, no header; `client.skills`; fields renamed `display_title`→`display_name`
   (255 chars, not unique), `latest_version`→`latest_version_id` (`skver_...`); delete now cascades to all
   versions [G1].
2. **Wrong:** "Skills require `code_execution_20250825` (beta)." **Right:** any of `20250825`/`20260120`/
   `20260521`, no beta header; examples happen to use `20250825` [G2].
3. **Wrong:** "claude.ai skills are per-user, admins cannot distribute them." **Right:** since 2025-12-18
   Team/Enterprise owners provision org-wide; members can share and publish to an org library with review
   [G7][G8][G9]. (The platform overview page still carries the old sentence [G3].)
4. **Wrong:** "Skills are for paid plans only." **Right:** Free, Pro, Max, Team, Enterprise; code execution
   must be on [G8].
5. **Wrong:** "Skills and MCP are separate layers; MCP cannot carry skills." **Right:** MCP has an official
   Skills extension `io.modelcontextprotocol/skills` (SEP-2640, status Final, merged 2026-09-13): servers
   publish Agent Skills as resources (`skill://...`) with `skills/list` and `skills/get` [G13][G14]; plugins
   (Claude, ChatGPT/Codex) and the Agent Plugins v1.0 standard bundle skills + MCP servers [G11][G21][G48].
6. **Wrong:** "Project skills override personal skills (in Claude Code)." **Right:** in Claude Code
   enterprise > personal > project [G4]; project-over-user is the convention in the agentskills guide,
   Gemini CLI and OpenClaw [G17][G23][G27].
7. **Wrong:** "All clients read `.claude/skills/`." **Right:** the cross-client path is `.agents/skills/`;
   Codex reads `.agents/skills` (CWD up to repo root), `~/.agents/skills`, `/etc/codex/skills` [G21]; Gemini
   `.gemini/skills` + `.agents/skills` [G23]; Cursor `.agents`/`.cursor` plus compatibility `.claude`/`.codex`
   [G28]; VS Code `.github/skills`, `.claude/skills`, `.agents/skills` [G25]; OpenCode `.opencode`, `.claude`,
   `.agents` [G26].
8. **Wrong:** "A skill costs nothing until it triggers, and it triggers when relevant." **Right:** Vercel's
   Next.js 16 evals (2026-01-27): skill never invoked in 56% of cases, 53% pass = same as no docs; 79% with
   explicit "use the skill" instructions; a compressed docs index in AGENTS.md scored 100% [G36]. Anthropic's
   own skill-creator: "currently Claude has a tendency to 'undertrigger' skills" [G33].
9. **Wrong:** "Let the model write its own skills." **Right:** SkillsBench v1 (2026-02-13): "Self-generated
   Skills provide no benefit on average" [G34]; v4 (2026-06-14) dropped the self-generated condition from its
   abstract, so cite v1 with its date.
10. **Wrong:** vendor-style uplift numbers ("a day to an hour"). **Right (measured):** SkillsBench v4:
    curated skills raise average pass rate 33.9% → 50.5% (+16.6 pp) across 18 model-harness configs on 87
    tasks, range +4.1 to +25.7 pp; v1: 16 of 84 tasks got worse with skills [G34].
11. **Wrong:** "Snyk found prompt injection in 36% of skills." **Right:** 36.82% (1,467 of 3,984) had *any*
    flaw, 13.4% (534) a critical one, 76 confirmed malicious; prompt injection 2.6% overall but 91% among the
    malicious; published 2026-02-05 [G43]. Snyk's own headline invites the misreading.
12. **Wrong:** "A malicious skill infected 26,000 users." **Right:** AIR proof of concept; benign payload
    collected emails; the metric is ad reach, not installs [G44].
13. **Wrong:** "Max 20 skills" as a universal limit. **Right:** 20 per Messages API request [G1]; up to 500
    per Managed Agents session (deduplicated across agents) [G30]; Claude Code has no count cap but a listing
    budget of 1% of context window, 1,536 chars per entry [G4]; Codex 2% of context or 8,000 chars [G21].
14. **Wrong:** "`allowed-tools` restricts which tools the skill can use." **Right:** it *pre-approves* listed
    tools for the invoking turn only and "does not restrict which tools are available"; `disallowed-tools`
    removes tools; project-skill `allowed-tools` is **not gated by workspace trust** [G4]; the open spec marks
    it Experimental [G16]; OpenCode ignores it [G26]; MCP-served skills MUST have it ignored unless the user
    approves [G14].
15. **Wrong:** "agentskills.io is a neutral foundation standard like MCP." **Right:** Anthropic-originated,
    unversioned spec page, no governance document; contributions via GitHub Discussions; "Logo requests are
    reviewed by the Anthropic team" [G19]; the spec repo's top committer (91 commits) is one person [G18].
    No foundation or steering body for Agent Skills appears in the repo (MCP governance → ch05). The newer **Agent Plugins** standard has a five-member TSC (Amazon, Cursor, Microsoft,
    OpenAI, Vercel) and no Anthropic seat [G48].

Honourable mentions: "commands were replaced by skills in Oct 2025" (merged 2026-01-09, v2.1.3; old files
still work) [G5]; "`context: fork` forks the conversation" (it runs a fresh subagent with no history) [G4];
"OpenClaw was an early adopter on agentskills.io" (added to the showcase only on 2026-08-09) [G18]; "Codex
added skills after the open standard" (experimental support landed 2025-12-01, before 2025-12-18) [G22].

## TL;DR (what the three notes miss, as of 2026-09-30)

- **Skills now travel over MCP.** The official MCP Skills extension (`io.modelcontextprotocol/skills`, SEP-2640
  Final, merged 2026-09-13, base revision `2026-07-28`) maps each skill file to an MCP resource, adds
  `skills/list`, `skills/get` and optional `resources/directory/read`, and ships every file with a SHA-256
  digest and size [G13][G14]. The "skills vs MCP" framing in all three notes predates it.
- **Plugins became the distribution unit.** Claude (2026-09-25: directory submission portal, safety scan,
  usage analytics; "Plugins package MCP connectors, Agent Skills, or both") [G11]; ChatGPT/Codex ("Plugins
  distribute reusable skills and connectors through the universal plugin directory") [G21]; and a
  cross-vendor **Agent Plugins v1.0.0** spec (announced 2026-08-06; `plugin.json` + `skills/` + `mcp.json`)
  [G47][G48].
- **Claude org distribution exists**: owner provisioning, sharing, publish-to-org with review, group targeting
  via plugins, a "User-created skills" switch [G8][G9]. Enterprise **skill and plugin scanning** (pass/warn/fail)
  becomes default-on on **2026-10-02** for Enterprise orgs that have not set it [G10].
- **Measured efficacy is now available** and is less rosy than marketing: SkillsBench +16.6 pp average
  with large variance, self-written skills ~0 [G34]; Vercel: passive AGENTS.md index 100% vs skill 53-79% [G36];
  Workday: progressive disclosure improves skill retrieval but marginally worsens latency [G42].
- **Quality is the dominant real-world failure, not malware**: 91.8% of 138,133 public SKILL.md files have at
  least one defect (weak routing metadata, bloated bodies, poor resource organisation) [G39].
- **Scanners disagree badly**: across 67,453 OpenClaw skills, 81.9% of flagged skills were flagged by only one
  of three scanners, only 0.69% by all three [G41]; weighted scanner sensitivity 21.67-61.06% against a
  human-adjudicated reference [G40].
- **Cross-client reality**: discovery path, precedence, activation mechanism (file-read vs `activate_skill`
  tool with a consent prompt vs `skill` tool), listing budget and extra frontmatter all differ by client
  (matrix below) [G21][G23][G25][G26][G27][G28].
- **Claude Agent SDK and Managed Agents** are separate integration paths the notes skip: SDK `skills` option
  (`"all"`, a list, or `[]`) + `setting_sources`; no programmatic registration [G29]. Managed Agents: `skills`
  array on the agent (up to 500/session) or auto-discovery from a mounted GitHub repo's `.claude/skills` [G30].
- **Claude Code shipped a lot in Q3 2026**: `/skill-doctor` (v2.1.261, 2026-09-04), claude.ai skill sync with
  hardened handling of synced skills (no `!` shell, sanitised descriptions), background forks, stacked
  `/skill-a /skill-b` (up to 5 extra), `paths` scoping, `disableBundledSkills` [G4][G5].
- **Codex specifics** a writer will need: `agents/openai.yaml` (UI metadata, `policy.allow_implicit_invocation`,
  MCP tool dependencies), `$skill` mention, `$skill-creator`, `$skill-installer`, `[[skills.config]]` in
  `~/.codex/config.toml` [G21].
- **Anthropic's own taxonomy**: "capability uplift" skills (may become unnecessary as models improve — evals
  tell you when) vs "encoded preference" skills (durable, only as good as their fidelity to the workflow)
  [G32].

## Current state and versions (2026-09-30)

| Item | Current state | Source |
|---|---|---|
| Agent Skills spec | Unversioned page at agentskills.io/specification; 6 frontmatter fields; last normative clarifications: `allowed-tools` as string (2026-04-10), `name` range includes digits (2026-05-16), `metadata` clarified (2026-08-03) | [G16][G18] |
| agentskills.io client showcase | 46 entries in `clients.jsx` incl. Claude Code, Claude, ChatGPT & Codex, Cursor, Gemini CLI, GitHub Copilot, VS Code, OpenCode, OpenHands, Goose, Amp, Letta, Junie, Kiro, TRAE, Tabnine, Pulumi Neo, Hermes Agent, OpenClaw (added 2026-08-09) | [G20][G18] |
| Claude Messages API | Skills GA; `container.skills[]` ≤ 20; code execution `20250825`/`20260120`/`20260521`; skills not ZDR-covered | [G1][G2] |
| Claude Managed Agents | beta header `managed-agents-2026-04-01`; `skills` array ≤ 500/session; repo `.claude/skills` auto-discovery (cloud sandboxes only) | [G30] |
| Claude Code | v2.1.285 (2026-09-29); skill features documented through v2.1.282+ | [G5][G4] |
| claude.ai / Cowork | Free→Enterprise; org provisioning, sharing, publish-to-org; skills also in Claude for Excel/PowerPoint/Word/Outlook add-ins | [G8][G9] |
| Enterprise scanning | pass/warn/fail; default-on 2026-10-02 unless set; not for MCP-shared skills, MCP servers, hooks, CMEK/ZDR/HIPAA orgs | [G10] |
| Skill usage analytics | `GET /v1/organizations/analytics/skills` (beta, Enterprise, `read:analytics` scope, data from 2026-01-01) | [G31] |
| MCP Skills extension | SEP-2640 Final (2026-09-13); host support: MCP Inspector 2.6.0 partial, fast-agent partial, ChatGPT plugins partial (static import); official SDKs "in progress"; Claude not listed | [G14][G15][G50b] |
| Agent Plugins | v1.0.0 "Published"; TSC: Amazon, Cursor, Microsoft, OpenAI, Vercel | [G48] |
| `npx skills` CLI | v1.7.0 (2026-09-17); 79 agents | [G45] |

## Timeline (additions the other notes lack)

- **2025-12-01** — Codex: "feat: experimental support for skills.md (#7412)"; 12-03 `$`/`/skills` selection [G22].
- **2025-12-18** — Anthropic: org-wide provisioning for Team/Enterprise, partner skills directory (Atlassian,
  Canva, Cloudflare, Figma, Notion, Sentry, Vercel, Zapier quotes), open standard [G7].
- **2025-12-30 / 2026-01-02** — Gemini CLI implements skills infrastructure and the activation tool [G24].
- **2026-01-07** — Claude Code v2.1.0: `context: fork` [G5].
- **2026-01-09** — Claude Code v2.1.3: slash commands and skills merged [G5].
- **2026-01-14** — `vercel-labs/skills` (`npx skills`) repo created [G45].
- **2026-01-15** — "Agent Skills in the Wild": 42,447 skills collected, 26.1% with ≥1 vulnerability [G37].
- **2026-01-27** — Vercel: "AGENTS.md outperforms skills in our agent evals" [G36].
- **2026-02-01** — MCP `ext-skills` repo created (Skills Over MCP Working Group) [G13].
- **2026-02-05** — Snyk ToxicSkills published [G43].
- **2026-02-13** — SkillsBench v1 on arXiv [G34].
- **2026-03-03** — skill-creator evals/benchmark/comparator/description tuning [G32].
- **2026-04-03** — `agentplugins/agent-plugins-spec` repo created [G48].
- **2026-05-31** — ClawHub Security Signals dataset (67,453 skills, scanner disagreement) [G41].
- **2026-06-14** — SkillsBench v4 (87 tasks, 18 configs) [G34].
- **2026-06-24** — CSO Online on AIR's scanner-evasion PoC [G44].
- **2026-07-22** — Claude Code v2.1.218: forked skills background by default [G5].
- **2026-08-06** — Agent Plugins open standard announced (OpenAI, Amazon, Microsoft, Cursor, Vercel) [G47].
- **2026-08-09** — "What keeps Agent Skills from being reusable?" (138K SKILL.md) [G39]; OpenClaw added to agentskills.io showcase [G18].
- **2026-08-17** — Claude Code v2.1.234: built-in `claude-api` skill load cost cut from ~200k+ to ~25k tokens by loading reference docs on demand [G5].
- **2026-09-04** — Claude Code v2.1.261: `/skill-doctor` [G5].
- **2026-09-13** — SEP-2640 Skills extension merged, status Final [G13].
- **2026-09-15** — "After the Party" OpenClaw ecosystem paper [G40].
- **2026-09-17** — Claude Code v2.1.275: claude.ai skills and plugins sync to signed-in terminals [G5].
- **2026-09-23** — Claude Marketplace (2,000+ connectors and plugins) [G12].
- **2026-09-25** — Claude plugin directory submission portal with safety scan and analytics [G11].
- **2026-09-28** — Workday report on progressive disclosure [G42].
- **2026-10-02 (scheduled)** — Enterprise skill/plugin scanning turns on by default [G10].

## Mechanics (gap fill)

### 1. Skills over MCP (the missing piece of "skills vs MCP")

What it is (VERBATIM [G14]): "This extension defines how a server serves Agent Skills over MCP using the
existing Resources primitive. Each file in a skill directory is exposed as a resource, conventionally under the
`skill://` URI scheme, and is read with the standard `resources/read` method." The skill format itself is
"delegated entirely to the Agent Skills specification".

Capability negotiation, VERBATIM [G14]:
```jsonc
// Server capabilities
{
  "capabilities": {
    "resources": {},
    // Other capabilities...
    "extensions": {
      "io.modelcontextprotocol/skills": {
        "directoryRead": true,
      },
    },
  },
}
```

`skills/list` response, VERBATIM (abridged to two entries) [G14]:
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "resultType": "complete",
    "skills": [
      {
        "uri": "skill://git-workflow/SKILL.md",
        "frontmatter": {
          "name": "git-workflow",
          "description": "Follow this team's Git conventions for branching and commits"
        },
        "resources": [
          {
            "uri": "skill://git-workflow/SKILL.md",
            "digest": "sha256:b95a384300adeea2d902f7d19cd7c04b378ef58e09759107b9c7db4dcacbaa25",
            "size": 190
          }
        ]
      },
      {
        "uri": "skill://reports/daily/SKILL.md",
        "frontmatter": {
          "name": "daily",
          "description": "Assemble today's operational report from live data"
        },
        "resources": "dynamic"
      }
    ],
    "ttlMs": 300000,
    "cacheScope": "public"
  }
}
```

Key rules [G14]:
- URI form `skill://<skill-path>/<file-path>`; last path segment MUST equal frontmatter `name`; prefixes are
  organisational (`skill://acme/billing/refunds/SKILL.md`).
- Identity = (host-assigned server label, `uri`); hosts MUST NOT key on `uri` alone; MCP-served skills MUST NOT
  silently shadow filesystem skills of the same name.
- `resources` is a complete manifest (digest + size per file) or the string `"dynamic"`; limits: 512 files and
  16 MiB per skill.
- Lazy retrieval: hosts MUST NOT prefetch; `SKILL.md` fetched on load, other files on read; verify digest and
  size on every read; frontmatter compared field-by-field with the entry.
- `resources/read` of a SKILL.md is transport, not activation; activation only through the host's
  skill-loading path.
- Security: skill content is untrusted input and "a higher-risk surface than remote tool invocation"; no host
  code execution without per-skill approval; `allowed-tools` MUST be ignored unless the user approved that grant;
  cross-server reads gated; approvals bound to the digest set and revoked when it changes; "Digests are not a
  trust anchor" (unsigned, same origin as content).
- Nested skills are supporting content until separately activated with fresh consent.

Implementations as of 2026-09-29 [G15]: servers — Hugging Face `hf-mcp-server` v1, a community GitHub-stars
server v1, `github-mcp-server` prototype; hosts — fast-agent partial, MCP Inspector partial (since 2.6.0,
2026-09-09), MCPJam partial, ChatGPT plugins partial ("Imports skills at plugin submission, static snapshot"),
Goose planned; official Go/TS/Python/C# SDKs "in progress".

Consequence for the chapter: MCP answers "how does a remote server ship its skills with its tools"; the
Agent Skills spec answers "what is a skill"; Agent Plugins / vendor plugins answer "how do I install a bundle".
Anthropic's plugin post says the same: "Skills and MCP connectors stay as building blocks" [G11].

### 2. Cross-client feature matrix (verified on vendor docs, 2026-09-30)

| Client | Discovery paths | Activation | Extra frontmatter / config | Precedence | Listing budget |
|---|---|---|---|---|---|
| Claude Code | managed `.claude/skills`, `~/.claude/skills`, project `.claude/skills` (+ parents to repo root, nested lazily), `--add-dir`, plugins, claude.ai sync `~/.claude/skills/synced/` [G4] | `Skill` tool; `/name`; permission rules `Skill(name)` / `Skill(name *)` [G4] | `when_to_use`, `argument-hint`, `arguments`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `disallowed-tools`, `model`, `effort`, `context`, `agent`, `background`, `hooks`, `paths`, `shell` [G4] | enterprise > personal > project [G4] | 1% of context, 1,536 chars/entry, `skillListingBudgetFraction` [G4] |
| Codex / ChatGPT | `.agents/skills` from CWD up to repo root, `~/.agents/skills`, `/etc/codex/skills`, bundled [G21] | implicit via description; `$skill` or `/skills` in Codex, `@` in ChatGPT [G21] | `agents/openai.yaml` (interface, `policy.allow_implicit_invocation`, MCP dependencies) [G21] | no merge; duplicates both shown [G21] | 2% of context or 8,000 chars; descriptions shortened first [G21] |
| Gemini CLI | built-in < extension < `~/.gemini/skills`/`~/.agents/skills` < `.gemini/skills`/`.agents/skills` [G23] | `activate_skill` tool + **user consent prompt**; skill dir added to allowed paths [G23] | — | workspace highest; `.agents` alias beats `.gemini` in a tier [G23] | not documented |
| VS Code / Copilot | `.github/skills`, `.claude/skills`, `.agents/skills`, `~/.copilot/skills`, `~/.claude/skills`, `~/.agents/skills` [G25] | model-loaded or `/skill`; `/create-skill` generator [G25] | `argument-hint`, `user-invocable`, `disable-model-invocation`, `context: fork` (experimental) [G25] | primary workspace root wins on duplicates [G25] | not documented |
| Cursor | `.agents/skills`, `.cursor/skills`, `~/.agents/skills`, `~/.cursor/skills`, plus `.claude`/`.codex` compat; recursive, nested dirs auto-scoped [G28] | agent decides; `/name`; skill as Custom Mode [G28] | `paths`, `disable-model-invocation`, `icon`, `color`, `metadata`; `/migrate-to-skills` converts rules/commands [G28] | not documented | not documented |
| OpenCode | `.opencode/skills`, `~/.config/opencode/skills`, `.claude/skills`, `~/.claude/skills`, `.agents/skills`, `~/.agents/skills` [G26] | `skill({ name })` tool; catalog in tool description [G26] | only 5 fields recognised; unknown ignored; `permission.skill` allow/deny/ask patterns [G26] | names must be unique across locations [G26] | not documented |
| OpenClaw | `<workspace>/skills` > `.agents/skills` > `~/.agents/skills` > managed > workshop > bundled > extraDirs/plugins [G27] | XML catalog in system prompt; `$skill` references [G27] | `metadata.openclaw.requires.{bins,anyBins,env,config}`, `always`, `primaryEnv` [G27] | workspace highest [G27] | `skills.limits.maxSkillsPromptChars`; ~24 tok/skill + fields [G27] |

Notes: OpenClaw's `metadata` value is a nested JSON object, which departs from the spec's "map from string
keys to string values" [G16][G27]. VS Code: names with slashes/colons/namespace prefixes "cause the skill to
silently fail to load" [G25].

VERBATIM OpenCode permission config [G26]:
```json
{ "permission" : { "skill" : { "*" : "allow" , "pr-review" : "allow" , "internal-*" : "deny" , "experimental-*" : "ask" } } }
```

VERBATIM Codex `agents/openai.yaml` [G21]:
```yaml
interface:
  display_name: "Optional user-facing name"
  short_description: "Optional user-facing description"
  icon_small: "./assets/small-logo.svg"
  icon_large: "./assets/large-logo.png"
  brand_color: "#3B82F6"
  default_prompt: "Optional surrounding prompt to use the skill with"

policy:
  allow_implicit_invocation: false

dependencies:
  tools:
    - type: "mcp"
      value: "openaiDeveloperDocs"
      description: "OpenAI Docs MCP server"
      transport: "streamable_http"
      url: "https://developers.openai.com/mcp"
```

### 3. How a harness implements skills (agentskills.io implementer guide) [G17]

- Scan `<project>/.<client>/skills/` and `<project>/.agents/skills/`, plus user-level equivalents; bounded
  scan (e.g. depth 4-6, max 2000 dirs); skip `.git/`, `node_modules/`.
- Lenient validation: name mismatch or >64 chars → warn and load; missing description or unparseable YAML →
  skip. Handle unquoted colons (`description: Use this skill when: ...`) with a quoting fallback.
- Trust: gate project-level skills on a trusted-folder check.
- Catalog, VERBATIM:
```xml
<available_skills>
  <skill>
    <name>pdf-processing</name>
    <description>Extract PDF text, fill forms, merge files. Use when handling PDFs.</description>
    <location>/home/user/.agents/skills/pdf-processing/SKILL.md</location>
  </skill>
</available_skills>
```
- Two activation patterns: file-read (model reads `location`) or a dedicated `activate_skill` tool whose
  `name` parameter is an enum of valid names; also user-explicit `/skill-name` or `$skill-name`.
- Hide filtered skills (disabled, denied, `disable-model-invocation`) instead of blocking at activation.
- Protect skill content from compaction; deduplicate activations; subagent delegation optional.

### 4. Claude organisation distribution and governance [G8][G9][G10]

- Owner provisioning: Organization settings > Plugins & skills > Add > Upload/Create; enabled by default for all
  users; users can toggle off; provisioned skills also sync to Claude Code for signed-in users (turn off with
  `syncClaudeAiSkills: false` in managed settings) [G9].
- Group targeting (Enterprise): bundle skills into a plugin and assign the plugin to a group [G9].
- Sharing (Team/Enterprise): to people or groups; shared skills are view-only; recipients auto-get updates [G8].
- Publishing policy: Requires review / Open / Off; offerings Available to install / Installed by default /
  Required; published versions stay pinned until the update is approved [G8][G9].
- Scanning (Enterprise): scans third-party uploads and edits, including skills inside plugins; results pass /
  warn (usable behind a caution banner) / fail (blocked, cannot be overridden by uploader or admins); most scans
  1-2 minutes; not applied to skills created with Claude, skills shared via MCP servers, MCP servers, hooks, or
  CMEK/ZDR/HIPAA orgs; "A pass result ... isn't a guarantee that a skill is safe in every respect" [G10].
- Usage analytics API for Enterprise: per-skill usage by member, RBAC group or product surface [G31].
- Skills in Microsoft 365 add-ins (Excel, PowerPoint, Word, Outlook) with `/` invocation [G8].

### 5. Claude Agent SDK [G29]

- Skills are filesystem-only: "The SDK doesn't provide a programmatic API for registering them."
- `skills` option: omitted → discovered skills enabled; `"all"`; a list of names (`plugin:skill` for plugin
  skills); `[]` for none. Setting it adds the `Skill` tool to `allowedTools`.
- Loading depends on `setting_sources` including `"user"`/`"project"`; `setting_sources=[]` loads none.
- The `init` system message lists user-invocable skills.

VERBATIM [G29]:
```python
options = ClaudeAgentOptions(
    cwd=os.getcwd(),  # .claude/skills/ here or in a parent directory
    setting_sources=["user", "project"],  # Load skills from filesystem
    skills="all",  # Let Claude invoke every discovered skill
    allowed_tools=["Read", "Write", "Bash"],
)
```
Caveat: unlisted skills are hidden from the model and rejected by the Skill tool, but "their files remain on
disk and stay reachable through Read and Bash" — the list is not a security boundary [G29].

### 6. Claude Managed Agents [G30]

VERBATIM agent creation with skills:
```json
{
  "name": "Financial Analyst",
  "model": "claude-opus-5-5",
  "system": "You are a financial analysis agent.",
  "skills": [
    {"type": "anthropic", "skill_id": "xlsx"},
    {"type": "custom", "skill_id": "skill_01AbCdEfGhIjKlMnOpQrStUv", "version": "latest"}
  ]
}
```
- Up to 500 skills per session; "Mounting more skills increases the time it takes for the session's sandbox
  to start."
- Mounting a `github_repository` resource auto-discovers root `.claude/skills` (cloud sandboxes only), with a
  warning that anyone who can commit to the repo can change agent instructions and "the platform loads it at
  session start without a review step."
- `ant apply` CLI uploads a skill dir and records IDs in `claude-lock.json` [G30][G1].

### 7. Claude Code details the notes lack [G4][G5]

- Skill folder + `.claude-plugin/plugin.json` = a plugin named `<name>@skills-dir` (can bundle agents, hooks,
  MCP servers); `claude plugin init` scaffolds into `.claude/skills` (v2.1.157) [G4][G5].
- Reserved names: `synced`, `anthropic-skills` [G4].
- Synced skills: descriptions sanitised (angle brackets escaped), bodies do not run `!` commands or expand `@`
  files on your machine (v2.1.228+) — the platform treats account-delivered skills as less trusted than local
  files [G4][G5].
- Injected `` !`cmd` `` lines go through permission rules; a deny aborts with `Shell command permission check
  failed for pattern "..."`; 2-minute timeout [G4].
- `${CLAUDE_SKILL_DIR}` in both body and `allowed-tools` lets a skill run its own script without a prompt, e.g.
  `allowed-tools: Bash(${CLAUDE_SKILL_DIR}/scripts/render.sh *)` (VERBATIM [G4]).
- `skillOverrides` values include `"name-only"`, `"user-invocable-only"`, `"off"` [G4].
- Stacked invocation: `/write-tests /fix-issue 123` loads both; up to five more after the first (v2.1.199) [G4][G5].
- Since v2.1.215 Claude no longer runs `/verify` and `/code-review` on its own [G5].
- `/doctor prompt-audit` (v2.1.283) audits CLAUDE.md, skills, agents and commands for patterns written for
  older models [G5].

### 8. Evidence on efficacy (for the "does it help?" section)

- SkillsBench v4 [G34]: 87 tasks, 8 domains, deterministic verifiers, 18 model-harness configs; 33.9% → 50.5%
  (+16.6 pp, 25.5% normalised gain); "Focused Skills with at most three modules outperform larger or exhaustive
  bundles, and smaller models with Skills can match larger models without them."
- SkillsBench v1 [G34]: 86 tasks, 11 domains, 7 configs, 7,308 trajectories; +16.2 pp; +4.5 pp Software
  Engineering to +51.9 pp Healthcare; 16 of 84 tasks negative; self-generated skills no benefit.
- Xu & Wu controlled study [G35]: 30-task subset, 5 trials per cell, 1,800 rows; skill availability +26.7-36.0
  pp (GPT-5.5) and +18.0-26.0 pp (DeepSeek V4-Flash); presentation granularity effects small and uncertain
  (95% CIs cross zero).
- Vercel [G36]: see claim 8. Author's own boundary: skills remain valuable for "vertical, action-specific
  workflows that users explicitly trigger".
- Workday [G42]: progressive disclosure "improves skill-retrieval quality but marginally degrades overall
  latency."
- 138K SKILL.md study [G39]: 91.8% have ≥1 defect (88.8-94.6% across thresholds); valid routing metadata →
  more reliable retrieval in a 20,000-skill routing stress test; "specification-aware skills contain fewer
  defects, while AI-marked skills show more safety and portability problems."

## Numbers

| Measurement | Value | Conditions / who | Source |
|---|---|---|---|
| SkillsBench curated-skill uplift | 33.9% → 50.5% (+16.6 pp); range +4.1 to +25.7 pp | 87 tasks, 18 configs, v4 2026-06-14 | [G34] |
| SkillsBench v1 domain spread | +4.5 pp (SWE) to +51.9 pp (Healthcare); 16/84 tasks negative | 7 configs, 7,308 trajectories, 2026-02-13 | [G34] |
| Skill availability effect | +26.7-36.0 pp GPT-5.5; +18.0-26.0 pp DeepSeek V4-Flash | 30 tasks × 6 conditions × 5 trials, 2026-05-29 | [G35] |
| Vercel Next.js 16 evals | baseline 53%, skill 53%, skill+instruction 79%, AGENTS.md index 100%; skill not invoked 56% | Vercel, 2026-01-27; model not stated | [G36] |
| Public SKILL.md defect rate | 91.8% (88.8-94.6%) | 138,133 files, 20,556 repos, 2026-08-09 | [G39] |
| Vulnerable skills | 26.1% ≥1 vuln; 5.2% high-severity; scripts → OR 2.12 | 31,132 analysed of 42,447, 2026-01-15 | [G37] |
| Confirmed malicious | 157 skills, 632 vulns, avg 4.03 per skill; >50% one actor; 100% removed after disclosure | 98,380 skills, 2 registries | [G38] |
| Scanner overlap | pairwise ≤10.4%; all-three 0.69%; 81.9% single-scanner | 67,453 OpenClaw skill versions, 2026-05-31 | [G41] |
| Scanner disagreement / sensitivity | disagree on 23,702 of 61,990; sensitivity 21.67-61.06% | ClawHub, 2026-09-15 | [G40] |
| ClawHub attention / scrutiny | top 10% get 46.93% of downloads; 77.86% zero stars+comments; 85.06% carry privilege evidence | same | [G40] |
| Snyk ToxicSkills | 13.4% critical, 36.82% any flaw, 76 malicious; PI 2.6% overall / 91% of malicious | 3,984 skills, 2026-02-05 | [G43] |
| Daily skill submissions | <50/day mid-Jan → >500/day early Feb 2026 | Snyk | [G43] |
| Codex skill listing budget | 2% of context or 8,000 chars | OpenAI docs | [G21] |
| Claude Code listing budget | 1% of context; 1,536 chars/entry | Claude Code docs | [G4] |
| OpenClaw catalog cost | ~97 chars ≈ 24 tokens/skill + field lengths | OpenClaw docs | [G27] |
| MCP skill limits | 512 files, 16 MiB per skill | SEP-2640 | [G14] |
| Managed Agents | ≤500 skills/session | Anthropic docs | [G30] |
| Claude org scanning | most scans 1-2 min | Help Center | [G10] |
| Built-in skill load cost | `claude-api` skill ~200k+ → ~25k tokens | Claude Code v2.1.234 | [G5] |
| Claude Marketplace | 2,000+ connectors and plugins | 2026-09-23 | [G12] |
| agentskills.io showcase | 46 clients | clients.jsx, 2026-09-30 | [G20] |
| skill-creator description tuning | improved triggering on 5 of 6 public document skills | Anthropic, 2026-03-03 | [G32] |

## Pitfalls, limits, criticism (additions)

- **Passive context can beat on-demand skills** for broad framework knowledge (Vercel) [G36]; the skill wins
  for rare, explicit, action-shaped workflows. Book guidance: put an index/pointer in AGENTS.md/CLAUDE.md and
  the procedure in a skill.
- **Self-authored skills are not free wins** (SkillsBench v1) [G34]; skill-creator's eval loop exists for this
  reason [G32][G33].
- **Bigger is worse**: skills with ≤3 modules beat exhaustive bundles [G34].
- **Precedence differs by client** (C7): a personal skill silently shadows the repo's skill in Claude Code only.
- **SDK skill allowlist is not isolation**: files stay readable via Read/Bash [G29].
- **Managed Agents repo mounts load skills with no review step** [G30]; Claude Code project `allowed-tools` is not
  gated by workspace trust [G4].
- **Scanning is a filter, not a guarantee**: vendors disagree (Gen/Socket/Snyk columns differ on the same
  top skills on skills.sh audits [G46]; three ClawHub scanners overlap ≤10.4% [G41]); Anthropic's own scanner
  says a pass is not a guarantee and skips MCP-delivered skills [G10].
- **Registry decay**: ClawHub's growth "crested" by mid-2026; 77.86% of skills have zero stars and comments
  [G40].
- **Spec gaps**: no versioning of the spec, no signing, no dependency declaration (Codex invented
  `agents/openai.yaml` dependencies, OpenClaw `metadata.openclaw.requires`) → portability of anything beyond
  `name`+`description`+body is weak [G16][G21][G27].
- **Skills are not ZDR-covered** on the Claude API [G1].

## What changed in the last 6 months (and the last 3 months, which none of the notes caught)

Last 3 months (Jul-Sep 2026):
- MCP Skills extension finalised (2026-09-13) [G13].
- Agent Plugins v1.0.0 cross-vendor packaging standard (2026-08-06) [G47][G48].
- Claude plugin submission portal + safety scan + analytics (2026-09-25); Claude Marketplace (2026-09-23)
  [G11][G12].
- Claude Code: background forks (2026-07-22), `/skill-doctor` (2026-09-04), claude.ai sync (mid-Sep), synced-skill
  hardening, `claude-api` skill context cut, `/doctor prompt-audit` [G5].
- Enterprise scanning default-on scheduled for 2026-10-02 [G10].
- Research wave: 138K defect study, OpenClaw registry decline, Workday report; arXiv shows dozens of skill
  papers in September 2026 alone (security: SkillSecurer, skill cascading attacks; engineering: SkillApt on
  when to activate) [G39][G40][G42][G50].
- agentskills.io: OpenClaw and Hermes Agent added (2026-08-09); `metadata` wording clarified [G18].

Earlier in the 6-month window (Apr-Jun 2026): SkillsBench v4, Xu & Wu controlled study, ClawHub Security Signals,
AIR PoC, Claude Code nested-skill loading (v2.1.178, 2026-06-15) and malformed-frontmatter handling (v2.1.186)
[G34][G35][G41][G44][G5].

## Diagram candidates

1. **Skills over MCP handshake** — actors: Host, MCP server, User, Model. Arrows: `server/discover`
   (extensions: skills) → `skills/list` (entries with digests) → catalog to model → model picks skill → host asks
   user approval (bound to digest set) → `resources/read skill://.../SKILL.md` → verify size+digest+frontmatter →
   inject tagged with origin → lazy reads of supporting files [G14].
2. **Content-bound approval state machine** — states: Unapproved → Approved(digest set D) → Acting → (entry
   changes to D') → Revoked → re-prompt; "dynamic" skills cannot enter Approved-bound state [G14].
3. **Three layers of packaging** — nested boxes: Agent Skill (SKILL.md folder) ⊂ Plugin (`plugin.json`,
   `skills/`, `mcp.json`) ⊂ Marketplace/directory; side arrow: MCP server can also serve skills directly [G14][G48].
4. **Cross-client discovery map** — one repo with `.agents/skills`, `.claude/skills`, `.github/skills`,
   `.cursor/skills`; arrows to the clients that read each path (matrix above).
5. **Precedence comparison** — two ladders side by side: Claude Code (enterprise > personal > project) vs
   agentskills guide / Gemini / OpenClaw (workspace > user > bundled) [G4][G17][G23][G27].
6. **Activation mechanisms** — three lanes: file-read (Claude Code-style `cat`/Read), dedicated tool
   (`activate_skill` with consent in Gemini, `skill()` in OpenCode), harness intercept (`/name`, `$name`)
   [G17][G23][G26].
7. **Claude org distribution flow** — Member creates → Share (people/groups) or Publish to org → Review (owner)
   → Scan (pass/warn/fail) → Library (Available / Installed by default / Required) → sync to Claude Code [G8][G9][G10].
8. **Managed Agents skill sources** — Agent `skills[]` (anthropic/custom) + mounted GitHub repo `.claude/skills`
   → session sandbox (≤500) [G30].
9. **Scanner disagreement Venn** — VirusTotal, static heuristics, SkillSpector; overlap 0.69% [G41].
10. **Passive vs on-demand knowledge** — AGENTS.md index (always loaded) vs skill (triggered) with Vercel pass
    rates on the arrows [G36].

Chart candidates (real data):
- SkillsBench: no-skill 33.9% vs curated 50.5% (v4); domain range +4.5 to +51.9 pp (v1) [G34].
- Vercel evals: 53 / 53 / 79 / 100% [G36].
- Xu & Wu: skill-availability uplift ranges by model [G35].
- ClawHub scanner overlap: pairwise ≤10.4%, all-three 0.69%, single-scanner 81.9% [G41].
- Listing budgets: Claude Code 1% vs Codex 2%/8,000 chars vs OpenClaw configurable [G4][G21][G27].
- Snyk submissions per day: <50 (mid-Jan) → >500 (early Feb 2026) [G43].

## Glossary

- **`io.modelcontextprotocol/skills`**: the official MCP extension for serving Agent Skills as MCP resources.
- **`skill://` URI**: conventional resource URI for a skill file served over MCP.
- **Skill entry**: MCP object with `uri`, verbatim `frontmatter`, and `resources` (digest manifest or `"dynamic"`).
- **Content-bound approval**: a user's approval tied to the exact digest set of a skill; any change revokes it.
- **Agent Plugins**: cross-vendor v1.0 packaging standard bundling Agent Skills and MCP server configs in a folder with `plugin.json`.
- **`.agents/skills/`**: cross-client discovery directory convention (not mandated by the spec).
- **`activate_skill`**: dedicated activation-tool pattern (Gemini CLI name; recommended in the implementer guide).
- **`agents/openai.yaml`**: Codex/ChatGPT per-skill metadata (UI, implicit-invocation policy, tool dependencies).
- **Capability uplift skill / Encoded preference skill**: Anthropic's split between skills that add ability and skills that encode team process.
- **Publish to org**: Claude Team/Enterprise flow placing a skill in the organisation library, optionally reviewed.
- **Skill and plugin scanning**: Claude Enterprise pre-install malice check returning pass/warn/fail.
- **`skillOverrides`**: Claude Code setting to set a skill to `name-only`, `user-invocable-only` or `off`.
- **SkillsBench**: paired with/without-skill benchmark with deterministic verifiers.

## Unverified / open questions

- **Does Claude (web/desktop/Code) implement the MCP Skills extension?** The MCP client matrix does not list
  Claude for Skills [G50b], yet Anthropic's scanning article excludes "Skills shared through a connected MCP
  server", implying some path exists [G10]. Tried: grep of Claude Code docs/changelog for `skill://`,
  `skills/list` (no hits) and the client matrix.
- **skills.sh "All Time (1,508,673)"** — unit not labelled on the page (skills? installs in some window?).
  Tried: raw HTML around the tab. Do not cite as a skill count.
- **Anthropic's position on Agent Plugins**: not a TSC member [G48]; Claude Code plugins use
  `.claude-plugin/plugin.json`, not the root `plugin.json` of Agent Plugins. No Anthropic statement found.
  Tried: agent-plugins.org spec and MAINTAINERS.md; TNW article [G47].
- **Governance of agentskills.io**: no GOVERNANCE/MAINTAINERS file (GitHub API returned none); the top committer
  also leads Agent Plugins listed as Vercel [G18][G48] — affiliation for agentskills work not confirmed.
- **Exact dates Cursor and VS Code shipped skills** — not found in the docs read; Codex 2025-12-01 and Gemini CLI
  2025-12-30 are from commit history [G22][G24].
- **field.md items not re-verified**: benjamin-plus (Telegram-relayed), deslop-GPT percentages, OpenClaw
  "346K stars / 44,000+ skills". The rtk compression numbers in field.md are about a CLI proxy, not skills —
  recommend dropping them from this chapter.
- **skillcrossroads "69% won't reliably trigger"** is a rubric heuristic (description length, invocation cues),
  not a measured trigger rate; the report says v1.2 figures are "not comparable one-to-one" with v1.0 [G49].
- **SkillsBench self-generated result**: v4 abstract no longer mentions it; whether the finding was retracted or
  just moved into the body was not checked (only abstracts read).
- Reddit, X and Habr remain unsampled (field.md already flagged); WebSearch budget was exhausted in this session,
  so discovery relied on GitHub API, arXiv API, HN Algolia and direct fetches.

## Sources

- [G1] "Using Agent Skills with the API", Anthropic (platform.claude.com), undated live doc, https://platform.claude.com/docs/en/build-with-claude/skills-guide.md, accessed 2026-09-30.
- [G2] "Code execution tool", Anthropic, live doc, https://platform.claude.com/docs/en/agents-and-tools/tool-use/code-execution-tool.md, accessed 2026-09-30.
- [G3] "Agent Skills" overview, Anthropic, live doc, https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview.md, accessed 2026-09-30.
- [G4] "Extend Claude with skills", Claude Code docs, Anthropic, live doc (versions through v2.1.282+), https://code.claude.com/docs/en/skills.md, accessed 2026-09-30.
- [G5] "Claude Code changelog", Anthropic, entries 2026-01-07 … 2026-09-29, https://code.claude.com/docs/en/changelog.md, accessed 2026-09-30.
- [G6] "Introducing Agent Skills", Claude blog, 2025-10-16 (update note 2025-12-18), https://claude.com/blog/skills, accessed 2026-09-30.
- [G7] "Skills for organizations, partners, the ecosystem", Claude blog, 2025-12-18, https://claude.com/blog/organization-skills-and-directory, accessed 2026-09-30.
- [G8] "Use skills in Claude", Claude Help Center, "updated over a week ago" (~Sep 2026), https://support.claude.com/en/articles/12512180-using-skills-in-claude, accessed 2026-09-30.
- [G9] "Provision and manage skills for your organization", Claude Help Center, ~Sep 2026, https://support.claude.com/en/articles/13119606-provision-and-manage-skills-for-your-organization, accessed 2026-09-30.
- [G10] "Get started with skill and plugin scanning", Claude Help Center, ~Sep 2026, https://support.claude.com/en/articles/15927065-get-started-with-skill-and-plugin-scanning, accessed 2026-09-30.
- [G11] "Build plugins for Claude", Claude blog, 2026-09-25, https://claude.com/blog/build-plugins-for-claude, accessed 2026-09-30.
- [G12] "Claude Marketplace: one place to discover plugins, agents, and services from our partners", Claude blog, 2026-09-23, https://claude.com/blog/claude-marketplace, accessed 2026-09-30.
- [G13] `modelcontextprotocol/ext-skills` README (Skills Over MCP Working Group), repo created 2026-02-01, pushed 2026-09-29, https://github.com/modelcontextprotocol/ext-skills, accessed 2026-09-30.
- [G14] "Skills" extension specification `specification/stable/skills.mdx` (SEP-2640, Final, PR merged 2026-09-13), MCP project, https://github.com/modelcontextprotocol/ext-skills/blob/main/specification/stable/skills.mdx, accessed 2026-09-30.
- [G15] `docs/implementations.md`, ext-skills repo, ~2026-09-29, https://github.com/modelcontextprotocol/ext-skills/blob/main/docs/implementations.md, accessed 2026-09-30.
- [G16] "Specification", agentskills.io, live, https://agentskills.io/specification.md, accessed 2026-09-30.
- [G17] "How to add skills support to your agent", agentskills.io, live, https://agentskills.io/client-implementation/adding-skills-support.md, accessed 2026-09-30.
- [G18] `agentskills/agentskills` commit history and contributors (GitHub API), commits 2026-04-01 … 2026-08-09, https://github.com/agentskills/agentskills/commits/main, accessed 2026-09-30.
- [G19] `agentskills/agentskills` README.md and CONTRIBUTING.md, live, https://github.com/agentskills/agentskills, accessed 2026-09-30.
- [G20] `docs/snippets/clients.jsx`, agentskills repo, live, https://github.com/agentskills/agentskills/blob/main/docs/snippets/clients.jsx, accessed 2026-09-30.
- [G21] "Build skills", OpenAI (ChatGPT/Codex docs), live, https://developers.openai.com/codex/skills.md (canonical learn.chatgpt.com), accessed 2026-09-30.
- [G22] `openai/codex` commits #7412 (2025-12-01), #7506 (2025-12-03), #7645, #7763, #7915, https://github.com/openai/codex, accessed 2026-09-30.
- [G23] "Agent Skills", Gemini CLI docs (last doc commit 2026-04-30), https://geminicli.com/docs/cli/skills.md, accessed 2026-09-30.
- [G24] `google-gemini/gemini-cli` commit #15698 (2025-12-30) and #15725 (2026-01-02), https://github.com/google-gemini/gemini-cli, accessed 2026-09-30.
- [G25] "Use Agent Skills in VS Code", Microsoft, live, https://code.visualstudio.com/docs/copilot/customization/agent-skills, accessed 2026-09-30.
- [G26] "Agent Skills", OpenCode docs, last updated 2026-09-29, https://opencode.ai/docs/skills/, accessed 2026-09-30.
- [G27] "Skills", OpenClaw docs, live, https://docs.openclaw.ai/tools/skills.md, accessed 2026-09-30.
- [G28] "Agent Skills", Cursor docs, live, https://cursor.com/docs/skills.md, accessed 2026-09-30.
- [G29] "Agent Skills in the SDK", Claude Agent SDK docs, live, https://code.claude.com/docs/en/agent-sdk/skills.md, accessed 2026-09-30.
- [G30] "Skills" (Managed Agents, beta `managed-agents-2026-04-01`), Anthropic, live, https://platform.claude.com/docs/en/managed-agents/skills.md, accessed 2026-09-30.
- [G31] "Get Skill Usage" API reference (beta), Anthropic, live, https://platform.claude.com/docs/en/api/beta/organization/analytics/skills/list.md, accessed 2026-09-30.
- [G32] "Improving skill-creator: Test, measure, and refine Agent Skills", Claude blog, 2026-03-03, https://claude.com/blog/improving-skill-creator-test-measure-and-refine-agent-skills, accessed 2026-09-30.
- [G33] `skills/skill-creator/SKILL.md`, anthropics/skills, live, https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/SKILL.md, accessed 2026-09-30.
- [G34] Xiangyi Li et al. (78 authors), "SkillsBench: Benchmarking How Well Agent Skills Work Across Diverse Tasks", arXiv 2602.12670, v1 2026-02-13, v4 2026-06-14, https://arxiv.org/abs/2602.12670, accessed 2026-09-30.
- [G35] Xiaonan Xu, Wenjing Wu, "Skill Availability and Presentation Granularity in Large-Language-Model Agents: A Controlled SkillsBench Study", arXiv 2605.31408, 2026-05-29, https://arxiv.org/abs/2605.31408, accessed 2026-09-30.
- [G36] Jude Gao, "AGENTS.md outperforms skills in our agent evals", Vercel blog, 2026-01-27, https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals, accessed 2026-09-30.
- [G37] Yi Liu et al., "Agent Skills in the Wild: An Empirical Study of Security Vulnerabilities at Scale", arXiv 2601.10338, 2026-01-15, https://arxiv.org/abs/2601.10338, accessed 2026-09-30.
- [G38] Yi Liu et al., "'Do Not Mention This to the User': Detecting and Understanding Malicious Agent Skills in the Wild", arXiv 2602.06547, v1 2026-02-06, v4 2026-06-10, https://arxiv.org/abs/2602.06547, accessed 2026-09-30.
- [G39] Chi Zhang et al., "What Keeps Agent Skills from Being Reusable? Evidence from 138K SKILL.md Files", arXiv 2608.08453, 2026-08-09, https://arxiv.org/abs/2608.08453, accessed 2026-09-30.
- [G40] Yunpeng Xiong, Ting Zhang, "After the Party: Growth, Governance, and Security Scanning in the OpenClaw Agent Skill Ecosystem", arXiv 2609.17274, 2026-09-15 (v2 2026-09-16), https://arxiv.org/abs/2609.17274, accessed 2026-09-30.
- [G41] Vincent Koc et al., "ClawHub Security Signals: When VirusTotal, Static Analysis, and SkillSpector Disagree", arXiv 2606.01494, 2026-05-31, https://arxiv.org/abs/2606.01494, accessed 2026-09-30.
- [G42] Guilin Zhang et al. (Workday), "Report: Progressive Disclosure of Agent Skills", arXiv 2609.35692, 2026-09-28, https://arxiv.org/abs/2609.35692, accessed 2026-09-30.
- [G43] "Snyk Finds Prompt Injection in 36%, 1467 Malicious Payloads in a ToxicSkills Study...", Snyk blog, 2026-02-05, https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/, accessed 2026-09-30.
- [G44] Prasanth Aby Thomas, "How a malicious AI agent skill passed security checks and reached 26,000 users", CSO Online, 2026-06-24, https://www.csoonline.com/article/4188840/how-a-malicious-ai-agent-skill-passed-security-checks-and-reached-26000-users.html, accessed 2026-09-30 (via WebFetch summary).
- [G45] `vercel-labs/skills` README and repo metadata (created 2026-01-14; v1.7.0 2026-09-17), https://github.com/vercel-labs/skills, accessed 2026-09-30.
- [G46] skills.sh homepage and /audits page, live, https://skills.sh and https://skills.sh/audits, accessed 2026-09-30.
- [G47] "OpenAI and four rivals just agreed on one standard for AI agents", The Next Web, 2026-08-06, https://thenextweb.com/news/openai-agent-plugins-open-standard-skills-mcp, accessed 2026-09-30 (via WebFetch summary).
- [G48] "Agent Plugins Specification" v1.0.0 and MAINTAINERS.md/GOVERNANCE.md, agent-plugins.org / agentplugins/agent-plugins-spec (repo created 2026-04-03), https://agent-plugins.org/specification.md, accessed 2026-09-30.
- [G49] "The State of Claude Code Skills", Skill Crossroads, generated 2026-09-10 (rubric v1.2), https://skillcrossroads.com/report, accessed 2026-09-30.
- [G50] Hacker News Algolia search, stories 2026-07-01 … 2026-09-30 mentioning skills (e.g. "Ask HN: How do you manage skills files?" 2026-09-06, 320 pts/299 comments, id 49589914; cloudflare/security-audit-skill 2026-09-17, 213 pts, id 49736466); arXiv API listing of 2026-09 skill papers, https://hn.algolia.com/api/v1/search_by_date and https://export.arxiv.org/api/query, accessed 2026-09-30.
- [G50b] "Extension client matrix", MCP docs, live, https://modelcontextprotocol.io/extensions/client-matrix.md, accessed 2026-09-30.
