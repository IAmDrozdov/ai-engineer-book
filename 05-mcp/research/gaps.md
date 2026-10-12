# 05. MCP: Model Context Protocol — gaps, contradictions and corrections notes

Lens: completeness critic and gap-filler over `spec.md`, `practice.md`, `field.md` (same folder).
Source ids in this file are `[G#]` and are independent of the `[S#]` ids in the other three files.
Most protocol facts were checked against a fresh clone of `modelcontextprotocol/modelcontextprotocol`
(HEAD `046fa30`, commit dated 2026-09-28) rather than rendered pages, so wire examples below are
verbatim from the `.mdx` sources.

## Contradictions resolved

1. **Claude Code "v2 runtime" version.** practice.md: v2 runtime and the 2026-07-28 protocol "only in v2.1.232+, default-on in v2.1.274+". field.md: "v2 runtime (from v2.1.274+)". **Resolution, from the current Claude Code docs:** both numbers are real but they cover different sessions. Sessions that fetch feature flags use the v2 runtime on **v2.1.232+**. Sessions that don't fetch flags use it by default on **v2.1.274+**. Even on the v2 runtime, Claude Code only *asks* HTTP servers (and claude.ai connectors in flag-fetching sessions) for 2026-07-28. It asks stdio servers only with `MCP_PROTOCOL_NEGOTIATION=auto`, and it connects every other server as v1 does. `MCP_SDK_GENERATION=v1|v2` overrides the runtime choice. [G21]
2. **"Claude Code tool search default since v2.1.232".** practice.md and field.md tie tool search to v2.1.232. **Not supported:** the Claude Code docs say tool search "is enabled by default" but give no version. They turn it off for non-first-party `ANTHROPIC_BASE_URL`, with `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS`, and for models older than the 4.5 generation. v2.1.232 is the v2-runtime flag gate, not the tool-search gate. Write "on by default" with no version. [G21]
3. **What the 150,000 → 2,000 tokens (98.7%) figure measures.** practice.md's Numbers table and field.md both attach it to the "2-hour meeting transcript → Salesforce" workflow. spec.md attaches it to tool definitions. **Resolution:** Anthropic's post says the 150k → 2k cut comes from the agent discovering tools by browsing a filesystem and loading only the definitions it needs. The transcript example is a *separate* number ("an additional 50,000 tokens" for a 2-hour meeting). The 150k figure is an illustrative scenario, not a benchmark. The 2026-07-28 client-best-practices page reuses "~150,000 vs ~2,000 tokens" to illustrate *progressive discovery*. [G24][G25]
4. **When HTTP+SSE can be removed.** spec.md, practice.md and field.md all say there is a 12-month window before HTTP+SSE can be removed, and the release blog also says "year-long offramp" [G2]. **Resolution (normative text wins):** the deprecated-features registry and SEP-2596 give HTTP+SSE an earliest removal of "**Three months after SEP-2596 reaches Final**". The reason: it was already deprecated in 2025-03-26, so the 12-month window is considered already served. SEP-2596 was merged on 2026-05-18, so HTTP+SSE could be removed as early as mid-August 2026, meaning the next Current revision. The 12-month minimum applies to *new* deprecations (Roots, Sampling, Logging, DCR), whose earliest removal is "First revision released on or after 2027-07-28". [G7][G8]
5. **Skills over MCP (SEP-2640) and the 2026-07-28 release.** spec.md lists SEP-2640 as "merged into" 2026-07-28. **Wrong:** SEP-2640 was created 2026-04-23, marked Accepted 2026-09-03, marked Final 2026-09-11 and merged 2026-09-13. The docs were updated to "published" on 2026-09-18. It is an extension on its own track. The 2026-07-28 changelog does not mention Skills or MCP Apps. OpenAI's plugin docs still call it "draft SEP-2640 … not yet part of the stable MCP specification", which was written before the Final mark. [G1][G11][G12][G27]
6. **FastMCP version.** field.md: "FastMCP 2.x is the actively developed standalone framework". practice.md's glossary implies the same era. **Current:** `fastmcp` **4.0.0 was released 2026-08-31**, and the latest is 4.0.10 (2026-09-25). FastMCP 4 is built on MCP Python SDK v2. The repo is `PrefectHQ/fastmcp` (formerly `jlowin/fastmcp`). Prefect's CEO announced FastMCP 4.0 in the 2026-07-28 release post. [G2][G15][G17][G18]
7. **Official SDK tiers.** spec.md: "Tier 1: TypeScript, Python, C#, Go, Rust, Ruby… published Feb 23 2026". **Resolution:** the Feb 2026 date is when the tiering *system* went live, not when this list was fixed. At the 2026-07-28 release there were four Tier-1 SDKs (TS, Python, Go, C#), and Rust support for the new spec was "beta". Rust was promoted to Tier 1 on 2026-08-21 and Ruby on 2026-09-28 (Ruby 1.0 was announced 2026-07-27, Ruby Tier 2 on 2026-08-02). As of 2026-09-28: Tier 1 = TS, Python, C#, Go, Rust, Ruby; Tier 2 = Java; Tier 3 = Swift, PHP, Kotlin. [G2][G11][G13][G67]
8. **MCP Registry status.** field.md: "left preview but has not reached v1 GA". spec.md: "in preview". **Resolution:** the registry README's latest status notes are still the 2025-09-08 preview launch ("breaking changes or data resets may occur") and the 2025-10-24 **v0.1 API freeze**. There is no GA or "out of preview" announcement. It is still preview. [G53]
9. **License change date.** field.md dates the MIT → Apache-2.0 move to 2026-08-04. **Wrong:** issue #3197 (created 2026-08-04) is a copy of discussion #1995, which was posted **2025-12-19**. The implementing PR #1994 was opened 2025-12-19 and merged **2026-01-05**. The terms: new code and spec contributions are Apache-2.0, docs (excluding specs) are CC-BY-4.0, and existing contributions stay MIT. The repo LICENSE carries both texts. [G52]
10. **Security Best Practices: how many attack classes.** field.md: "six distinct attack classes" (confused deputy, token passthrough, SSRF, session hijacking, local server compromise, OAuth URL injection), based on the 2025-06-18 page. **Current (2026-07-28) page** has 11 attack sections: Confused Deputy; Token Passthrough; SSRF (including SSRF against authorization servers); **State Handle Hijacking**, which replaces Session Hijacking because sessions no longer exist; Local MCP Server Compromise; OAuth Authorization URL Validation; **stdio Transport Security in Proxy Scenarios**; **Mix-Up Attacks**; **Localhost Redirect URI Impersonation**; **CIMD Trust Policies**; Scope Minimization. [G58]
11. **ChatGPT's MCP support.** practice.md: ChatGPT is "notably narrower… exactly two tools, `search` and `fetch`… transport is SSE (`/sse/` suffix)". **Resolution:** the two-tool `search`/`fetch` shape is required only for *deep research and company knowledge*. The `/sse/` URL comes from a Replit sample on that page. It is not a ChatGPT requirement. ChatGPT and Codex integrations are now called **plugins**: the "ChatGPT plugins and Apps SDK" docs cover MCP servers with arbitrary tools, `structuredContent`, `outputSchema`, annotations, optional UI and skills. OpenAI's "Build an MCP server" page recommends the official SDKs with "streamable HTTP transport". ChatGPT **MCP Events requires protocol 2026-07-28** ("MCP 2.0"). [G26][G27][G29]
12. **Willison's HN comment id.** practice.md cites `item?id=49779329` as "Simon Willison, HN comment". 49779329 is the *story* "MCP was always a bad idea?" (maharshi365, 2026-09-20, 335 points). Willison's comment is **49779718** (2026-09-20T20:24Z). His quote is accurate. [G48]
13. **GitHub blog "did Skills kill MCP?" date.** spec.md: 2026-09-19. The page shows **2026-09-18**, author GPS (@madebygps). [G50]
14. **Zechner's MCP-vs-CLI benchmark framing.** spec.md presents it as evidence that "MCP was actually slightly cheaper/faster". The numbers are correct (terminalcp MCP ~$19.45 / ~51 min vs CLI ~$19.95 / ~66 min, 100% success both, 120 runs). But the author's own recommendation is to "build a good CLI first", since it is "simpler and more portable", and add an MCP wrapper if needed. His conclusion is that "the protocol is just plumbing". Cite both. [G46]
15. **mcp-use v2 performance.** field.md: 27% throughput, 55% faster cold start, 82% smaller install (Manufact blog, 2026-07-29: 10,982 vs 8,615 median ops/s; 68.1 vs 151.6 ms cold launch; 74.4 vs 404.6 MiB). Manufact's CTO quote in the official release post says "around 83%" smaller and "25% faster". These are two statements from the same vendor that differ slightly. Prefer the blog's measured figures and say so. [G2][G61]
16. **serverInfo placement in `server/discover`.** The notes disagree slightly on the example shapes. Verbatim from `server/discover.mdx`: `serverInfo` sits under `result._meta["io.modelcontextprotocol/serverInfo"]`, and `instructions`, `ttlMs` and `cacheScope` sit in the result body (see Mechanics). [G63]

## Claims most likely to be wrong (with corrections)

1. **"The current MCP spec is 2025-06-18 / 2025-11-25, and sessions start with `initialize`."** Current is **2026-07-28** (GA 2026-07-28). The `initialize`/`notifications/initialized` handshake and `Mcp-Session-Id` are removed. Every request carries `io.modelcontextprotocol/protocolVersion` and `clientCapabilities` in `_meta`. Legacy servers still exist, and 2026-07-28 clients fall back to `initialize` when talking to them. [G1][G3]
2. **"A server can call the client mid-request (sampling/elicitation/roots)."** In 2026-07-28, servers **MUST** use MRTR: return `resultType: "input_required"` plus `inputRequests`, and the client retries with a new JSON-RPC id and `inputResponses`. Only `tools/call`, `prompts/get` and `resources/read` may return `InputRequiredResult`. In FastMCP 4, `ctx.elicit()` **raises on modern connections**. [G5][G19]
3. **"Sampling and Roots are key MCP features."** Roots, Sampling and Logging are **Deprecated** (SEP-2577), with earliest removal in the first revision on or after 2027-07-28. `logging/setLevel`, `ping` and `notifications/roots/list_changed` are already *removed*. [G1][G7]
4. **"MCP clients register via Dynamic Client Registration."** DCR is **Deprecated** (PR #2858). **CIMD** is the preferred path. Registration priority: pre-registered → CIMD → DCR. Clients MUST key credentials by issuer (SEP-2352) and MUST validate `iss` (RFC 9207, SEP-2468). [G1][G2]
5. **"HTTP+SSE has a year before removal."** The normative earliest removal is **three months after SEP-2596 was Final (merged 2026-05-18)**. It can be removed in the next revision. [G7][G8]
6. **"Code execution with MCP measured 98.7% savings on the transcript workflow."** 150k → 2k is an *illustrative* tool-definition-loading scenario. The transcript example is "an additional 50,000 tokens". Neither figure is a benchmark. [G24]
7. **"`from mcp.server.fastmcp import FastMCP` is the official Python API."** In `mcp` v2 (2.0.0 on 2026-07-28, latest 2.2.0 on 2026-09-07) it is `from mcp.server import MCPServer`. `pip install mcp` now resolves to 2.x, so pin `mcp>=1.28,<2` until you migrate. Standalone **FastMCP 4.x** is a different package. [G15][G20]
8. **"The TypeScript SDK is `@modelcontextprotocol/sdk` v1."** The v2 SDK ships as *new split packages*, `@modelcontextprotocol/server` and `@modelcontextprotocol/client` (2.0.0 on 2026-07-27, 2.2.0 on 2026-09-28). `@modelcontextprotocol/sdk` is still the v1 line (1.31.0, 2026-09-28) and gets v1.x fixes for at least six months. [G3][G16]
9. **"Resource not found = error -32002."** Changed to **-32602** (Invalid Params) in 2026-07-28 (SEP-2164). New MCP-reserved codes: `HeaderMismatch` -32020, `MissingRequiredClientCapability` -32021, `UnsupportedProtocolVersion` -32022. `-32000..-32019` stay implementation-defined. [G1][G3]
10. **"Skills over MCP / MCP Apps are part of the 2026-07-28 spec."** Both are **extensions** (`io.modelcontextprotocol/skills`, `io.modelcontextprotocol/ui`) with their own repos. MCP Apps went live on 2026-01-26 as "the first official MCP extension". Skills (SEP-2640) went Final on 2026-09-11. Negotiation uses `capabilities.extensions`. [G12][G14][G55]
11. **"The MCP Registry is GA and hosts servers."** It is still in preview (v0.1 API frozen since 2025-10-24). It holds metadata only and points at npm/PyPI/Docker/Cargo packages. Private servers are out of scope. Server count on 2026-09-30: **37,730 servers** (latest versions), 126,506 version records in total (my full crawl; see Numbers). [G53][G54]
12. **"Tool annotations (`readOnlyHint`, `destructiveHint`) make tools safe."** They are hints. "Clients **MUST** consider tool annotations to be untrusted unless they come from trusted servers." Defaults: `readOnlyHint` false, `destructiveHint` true, `idempotentHint` false, `openWorldHint` true. [G59][G60]
13. **"FastMCP powers 70% of MCP servers" stated as fact.** This is Prefect's own claim. Independent proxy: in the 30 days before 2026-09-30, PyPI `mcp` had 219.0M downloads and `fastmcp` 50.1M. `fastmcp` depends on `mcp`, and download counts include CI. This does not refute the claim, but it cannot be verified. [G17][G62]
14. **"Anthropic owns MCP / MCP is MIT-licensed."** MCP was donated to the **Agentic AI Foundation** (Linux Foundation) on 2025-12-09. Its legal home is "Model Context Protocol, a Series of LF Projects, LLC". New contributions have been Apache-2.0 (code/spec) and CC-BY-4.0 (docs) since the Dec 2025 – Jan 2026 transition. A2A joined AAIF in Aug 2026. [G51][G52]
15. **"Tool Search is a Claude Code feature enabled since v2.1.232" / "tool selection degrades past N tools, source: folklore."** Tool search is an Anthropic API server-side tool (`tool_search_tool_regex_20251119`, `tool_search_tool_bm25_20251119`) that Claude Code uses by default. No version is documented for that default. Anthropic's docs state that selection accuracy "degrades once you exceed 30–50 available tools". That is a vendor statement with no dataset attached. [G21][G22]
16. **(bonus) "There is a protocol-level defence against rug pulls."** There is none. Clients trust the live `tools/list`. The Deadbugz server (Aug 2026) changed `tools/list` and `prompts/get` answers after 3 calls per connection. Official guidance is to treat a changed definition as a new approval event. [G41]

## TL;DR (what the three notes missed or got stale)

- The 2026-07-28 release also added **mandatory `Mcp-Method` / `Mcp-Name` HTTP headers** (SEP-2243). Servers MUST return 400 + `HeaderMismatch` (-32020) if a header does not match the body. This lets gateways, WAFs and rate limiters route without parsing JSON. [G1][G6]
- **`requestState` in MRTR is attacker-controlled input.** If it affects authorization or business logic, the server MUST integrity-protect it (HMAC/AEAD) and SHOULD bind principal, TTL and originating request. This is the new version of "session hijacking". [G5]
- **OpenTelemetry trace context** travels in `_meta` (`traceparent`, `tracestate`, `baggage`; SEP-414). Together with per-request `io.modelcontextprotocol/logLevel`, this replaces protocol logging. [G1]
- **Deprecation clocks:** Roots, Sampling, Logging and DCR: earliest removal on or after 2027-07-28. HTTP+SSE: can already be removed (three-month grace from 2026-05-18). [G7][G8]
- **SDKs:** Python `mcp` 2.x (`MCPServer`, answers both eras from one endpoint), TS v2 as split `@modelcontextprotocol/server|client` packages, FastMCP 4.x (built on SDK v2, with era-gated elicitation), Inspector 2.8.0 (Node ≥22.19.0). [G3][G15][G16][G18]
- **Adoption, per the maintainers at the 2026-07-28 release:** "close to half-a-billion downloads a month" across Tier 1 SDKs, and TS and Python each over 1B total. Sep 2026 monthly: PyPI `mcp` 219.0M, npm `@modelcontextprotocol/sdk` 220.0M. [G2][G62]
- **Enterprise-Managed Authorization went stable on 2026-06-18** (ID-JAG via RFC 8693 token exchange, then JWT-bearer grant). The notes treated it as a draft/extension without status. [G56][G57]
- **Accuracy degradation with many tools has real numbers:** RAG-MCP (13.62% → 43.13% selection accuracy with retrieval), GitHub Copilot (40 → 13 tools: +2–5 pp on SWE-bench-Verified/SWE-Lancer; embedding routing 94.5% coverage vs 69.0% for a static list), MCP benchmarks where even frontier models reach ≤~53%, and Anthropic's Opus 4 49% → 74% with tool search. [G22][G23][G33][G34][G35][G36]
- **Recent incidents (last 3 months) that none of the notes caught:** HashiCorp Terraform MCP server CVEs (2026-07-28: SSRF that leaks the bearer token, cross-session credential cache, **cross-tenant credential reuse in stateless mode**); Google MCP Toolbox SSRF CVE-2026-14540 (2026-07-31); the **Deadbugz** rug-pull server campaign (PRs on 2026-08-10, write-up 2026-09-09); Check Point's **sandbox escape in Cloudflare Code Mode / workerd** (Black Hat, 2026-08-05/06), which is the main mitigation for tool bloat becoming an attack surface. [G38][G39][G41][G43]
- **The MCP-vs-CLI debate moved again in the last two weeks:** "MCP was always a bad idea?" (HN, 2026-09-20, 335 points, Willison's rebuttal on credential isolation) and **Earendil's "You Said No MCP!" (2026-09-29, 432 HN points)**, where the team that had published anti-MCP posts reversed and integrated MCP into its Pi agent through a Codemode JS sandbox. [G47][G48]
- **ChatGPT now uses 2026-07-28 features** (MCP Events requires it) and imports Skills over MCP (a static subset). OpenAI's Responses API and Anthropic's Messages API both act as remote MCP clients, but only for tools. [G27][G29][G30][G31]
- **The roadmap (2026-08-22)** makes *server-side* progressive discovery and a single `tools/call` result contract official goals, in addition to agent identity (DPoP, WIF) and transport unification. [G4]

## Current state and versions (verified 2026-09-30)

| Item | Current | Date | Source |
|---|---|---|---|
| Spec revision | `2026-07-28` (Current); draft changelog empty | GA 2026-07-28 | [G1][G11] |
| Python SDK `mcp` | 2.2.0 (v2 line); 1.30.0 on v1.x branch | 2026-09-07 | [G15] |
| TS SDK v2 | `@modelcontextprotocol/server` / `client` 2.2.0 | 2026-09-28 | [G16] |
| TS SDK v1 | `@modelcontextprotocol/sdk` 1.31.0 | 2026-09-28 | [G16] |
| FastMCP | 4.0.10 (4.0.0 on 2026-08-31) | 2026-09-25 | [G15] |
| MCP Inspector | 2.8.0 (`v1-latest` = 1.0.2), Node ≥22.19.0 | 2026-09-23 | [G16][G65] |
| Tier 1 SDKs | TS, Python, C#, Go, Rust (08-21), Ruby (09-28) | 2026-09-28 | [G11][G13] |
| Extensions | MCP Apps (`io.modelcontextprotocol/ui`), Tasks, OAuth Client Credentials, Enterprise-Managed Authorization (stable 2026-06-18), Skills (Final 2026-09-11) | — | [G12][G14][G56] |
| Registry | preview, v0.1 API frozen | since 2025-10-24 | [G53] |
| Claude API MCP connector | beta header `mcp-client-2025-11-20`; tools only; remote HTTP (Streamable HTTP or SSE) only | — | [G31] |
| Deprecated registry | Roots, Sampling, Logging, DCR (removal ≥ 2027-07-28); `includeContext` thisServer/allServers (follows Sampling); HTTP+SSE (removal-eligible) | — | [G7] |

## Timeline (additions the three notes lack)

- 2025-05-06 — RAG-MCP paper (arXiv 2505.03275): prompt bloat measured. [G34]
- 2025-05-26 — Invariant Labs: GitHub MCP exploit. A malicious public issue makes Claude 4 Opus (Claude Desktop + GitHub MCP) leak private-repo data into a public PR. [G42]
- 2025-06-13 — CVE-2025-49596, MCP Inspector < 0.14.1: unauthenticated RCE through the proxy (CVSS 9.4). [G39]
- 2025-07-02 — CVE-2025-53109 / 53110: reference Filesystem server symlink and prefix path escapes (7.3). [G39]
- 2025-07-09 — CVE-2025-6514, `mcp-remote`: OS command injection through a crafted `authorization_endpoint` (9.6). This is a real-world case of the "OAuth authorization URL validation" class. [G39]
- 2025-08-15 — Zechner MCP-vs-CLI benchmark. [G46]
- 2025-08-20 / 08-21 / 09-28 — MCP-Universe, LiveMCP-101 and MCPMark benchmarks published. [G35][G37][G36]
- 2025-08-22 — Maintainer blog "Evolving OAuth Client Registration" (CIMD rationale). [G11]
- 2025-11-19 — GitHub Copilot cuts its built-in tools from 40 to 13. [G33]
- 2025-11-21 — MCP Apps proposed (SEP-1865). 2026-01-26 — MCP Apps live as the first official extension. [G55]
- 2025-11-24 — Anthropic "Advanced tool use" (Tool Search, PTC, Tool Use Examples). [G23]
- 2025-12-19 — "Exploring the Future of MCP Transports" blog, plus the Apache-2.0 licensing transition announced (PR merged 2026-01-05). [G11][G52]
- 2026-02-20 — Cloudflare "Code Mode MCP": whole Cloudflare API (2,500+ endpoints) in about 1,000 tokens instead of 1.17M. [G44]
- 2026-03-09 — 2026 roadmap. 2026-03-11 — "Understanding MCP Extensions". 2026-03-16 — "Tool Annotations as Risk Vocabulary". [G11][G60]
- 2026-05-18 — SEP-2596 (feature lifecycle) merged. This starts the three-month HTTP+SSE grace period. [G8]
- 2026-05-21 — 2026-07-28 Release Candidate. [G66]
- 2026-06-18 — Enterprise-Managed Authorization extension stable (adopters named: Anthropic, Microsoft, Okta). [G56]
- 2026-06-29 — Beta SDKs (Python v2, TS v2, Go, C#). 2026-06-30 — `mcp` 2.0.0b1. [G3][G15]
- 2026-07-27 — TS SDK 2.0.0 (`@modelcontextprotocol/server|client`); Ruby SDK 1.0 blog. [G16][G67]
- 2026-07-28 — Spec 2026-07-28 GA, `mcp` 2.0.0, HCSEC-2026-23 (Terraform MCP server CVE-2026-14869 / 16496 / 16498). [G2][G15][G38]
- 2026-07-31 — CVE-2026-14540 (Google MCP Toolbox SSRF) published. Willison's "Stateless MCP has recaptured my interest". [G39][G49]
- 2026-08-02 — Inspector v2 docs rewrite; "experimental" dropped from the Tasks naming. [G11]
- 2026-08-05/06 — Check Point presents workerd / Code Mode sandbox escapes at Black Hat USA (write-up dated 2026-08-07). [G43]
- 2026-08-05 — Arcade.dev acquires Smithery, "a leading public registry and hosting platform for MCP". [G69]
- 2026-08-10 — Deadbugz: 23 PRs in 74 minutes that add a malicious MCP server to repos' MCP configs (none merged). [G41]
- 2026-08-18 — Google contributes A2A to AAIF. [G51]
- 2026-08-21 — Rust SDK promoted to Tier 1. 2026-08-22 — new roadmap. [G4][G11]
- 2026-08-31 — FastMCP 4.0.0. [G15]
- 2026-09-07 — `mcp` 2.2.0; Stacklok ToolHive open-sourced (Apache-2.0). [G15][G45]
- 2026-09-11 — SEP-2640 (Skills extension) Final (merged 09-13, "published" 09-18). [G12]
- 2026-09-18 — GitHub blog "did Skills kill MCP?". 2026-09-20 — HN "MCP was always a bad idea?". [G48][G50]
- 2026-09-28 — Ruby SDK Tier 1; `mcpc` CLI added to the extension matrix; SEPs now require WG/IG discussion before submission (#3336). [G11]
- 2026-09-29 — Earendil "You Said No MCP!" [G47]

## Mechanics (gap-fill only; see the other three files for the rest)

### A 2026-07-28 request on the wire (VERBATIM [G2])
```http
POST /mcp HTTP/1.1
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tools/call
Mcp-Name: search

{"jsonrpc":"2.0","id":1,"method":"tools/call",
 "params":{"name":"search","arguments":{"q":"otters"},
 "_meta":{"io.modelcontextprotocol/clientInfo":{"name":"my-app","version":"1.0"}}}}
```
Note: this blog example omits the required `protocolVersion`/`clientCapabilities` `_meta` fields. The normative example [G6] includes them:
```http
POST /mcp HTTP/1.1
Content-Type: application/json
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tools/call
Mcp-Name: execute_sql
Mcp-Param-Region: us-west1

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientInfo": {
        "name": "ExampleClient",
        "version": "1.0.0"
      },
      "io.modelcontextprotocol/clientCapabilities": {}
    },
    "name": "execute_sql",
    "arguments": {
      "region": "us-west1",
```
(VERBATIM [G6], truncated where the source continues.) `Mcp-Param-Region` exists because the tool's `inputSchema` marks `region` with `"x-mcp-header": "Region"`. Non-ASCII values, and values with leading or trailing whitespace, are sent as `=?base64?...?=`. Don't mark secrets with `x-mcp-header`, because intermediaries see headers. [G6][G59]

### HTTP status semantics in the modern Streamable HTTP transport [G6]
- Header/body mismatch or a missing required header → `400` + `-32020 HeaderMismatch`. Unsupported version → `400` + `UnsupportedProtocolVersionError` listing `supported`. Unknown method → `404` + `-32601`.
- `Origin` MUST be validated (an invalid Origin → 403, per 2025-11-25). Local servers SHOULD bind to 127.0.0.1.
- A modern-only server that receives legacy traffic should answer GET/DELETE → `405`, ignore `Mcp-Session-Id` (don't mint or echo it), and ignore `Last-Event-ID`.
- Era detection for dual clients: send a modern request. If the `400` body is a recognized modern JSON-RPC error, stay modern. If the body is empty or unrecognized, fall back to `initialize`.
- Intermediaries that route on mirrored headers SHOULD reject versions older than those that require header–body validation.

### MRTR with `requestState` (VERBATIM result shape [G5])
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "resultType": "input_required",
    "inputRequests": {
      "github_login": {
        "method": "elicitation/create",
        "params": {
          "mode": "form",
          "message": "Please provide your GitHub username",
          "requestedSchema": {
            "type": "object",
            "properties": {
              "name": { "type": "string" }
            },
            "required": ["name"]
          }
        }
      }
    },
    "requestState": "AEAD-protected blob"
  }
}
```
(Trimmed: the source also carries a `sampling/createMessage` entry in the same map.) Normative points [G5]:
- Only `prompts/get`, `resources/read` and `tools/call` may return it.
- Every `InputRequiredResult` MUST carry at least one of `inputRequests` or `requestState`.
- The client MUST echo `requestState` byte-for-byte, MUST use a new JSON-RPC id, and MUST NOT reuse these fields on parallel requests.
- The server MUST NOT request capabilities the client didn't declare, and MUST NOT assume the client will retry.
- "servers **MUST** treat `requestState` as an attacker-controlled input… **MUST** protect its integrity (e.g. HMAC or AEAD)". Servers SHOULD bind the principal, a short TTL and a digest of the originating request. Single-use semantics must be enforced server-side.

### Python: the same elicitation in both eras (FastMCP 4, VERBATIM [G19])
```python
from fastmcp import FastMCP, Context
from mcp.types import InputRequiredResult, ElicitRequest, ElicitRequestFormParams

mcp = FastMCP("Booking Server")


def ask(key: str, message: str, field: str, request_state: str | None = None) -> InputRequiredResult:
    """Build an InputRequiredResult that elicits a single text field."""
    params = ElicitRequestFormParams(
        message=message,
        requested_schema={
            "type": "object",
            "properties": {field: {"type": "string"}},
            "required": [field],
        },
    )
    elicitation = ElicitRequest(method="elicitation/create", params=params)
    return InputRequiredResult(
        result_type="input_required",
        input_requests={key: elicitation},
        request_state=request_state,
    )


@mcp.tool
async def book_flight(ctx: Context) -> str | InputRequiredResult:
    responses = ctx.input_responses

    if responses is None:
        return ask("destination", "Where would you like to fly?", "destination")

    if "destination" in responses:
        destination = responses["destination"].content["destination"]
        return ask(
            "date",
            f"When would you like to fly to {destination}?",
            "date",
            request_state=f"dest={destination}",
        )

    destination = ctx.request_state.split("=", 1)[1]
    date = responses["date"].content["date"]
    return f"Booked a flight to {destination} on {date}"
```
Author's note for the book: this official sample puts **plain text** into `request_state`. That is acceptable only because tampering can cause nothing worse than a failed request. Anything that affects authorization needs HMAC/AEAD per [G5]. On legacy connections the handshake-era `await ctx.elicit(message=..., response_type=UserInfo)` still works. On modern connections it raises `ToolError: elicitation via server-initiated requests is unavailable on 2026-07-28 connections.` (VERBATIM [G18]). Branch on `ctx.request_context.protocol_version` if you serve both eras. [G18][G19]

### Python SDK v1 → v2 / FastMCP 3 → 4 migration gotchas [G18][G20]
- SDK v2: `FastMCP` → `MCPServer`. Protocol types move to a standalone `mcp_types` package, re-exported as `mcp.types`. Model fields are **snake_case in Python** (`input_schema`, `is_error`, `structured_content`); the wire stays camelCase.
- FastMCP 4 floors: pydantic ≥ 2.12, Starlette ≥ 1.0.1, which forces FastAPI ≥ 0.133.0. FastMCP now raises `httpx2` exceptions, so `except httpx.…` silently stops matching.
- Removed in FastMCP 4: `ctx.sample()` and `ctx.list_roots()`. Guidance: stay on 3.x if borrowing the caller's model is the point. `Middleware.on_initialize` and `ctx.set_state` don't survive a modern connection. Tasks need `mcp.add_extension(TasksExtension())`.
- Debug and run: `uv add "mcp[cli]"`, `uv run mcp dev server.py` (Inspector), `uv run mcp run server.py --transport streamable-http`. [G20]

### Inspector in CI (VERBATIM [G65])
```bash
npx @modelcontextprotocol/inspector --cli \
  --transport http --server-url https://example.com/mcp --method initialize
```
- `--method initialize` is a connect-only probe that prints `{serverInfo, protocolVersion, capabilities, instructions}`.
- In CI, pin an exact version (`@2.5.0`, not `@2`) and set `--connect-timeout`.
- Under `--cli`, arguments *before* `--` belong to the target server.
- On machines with no keychain, secrets go to `~/.mcp-inspector/secrets.json` in plaintext by default. [G65]

### Enterprise-Managed Authorization wire (VERBATIM [G57])
Step 1: client → enterprise IdP, token exchange for an ID-JAG:
```
POST /oauth2/token HTTP/1.1
Host: acme.idp.example
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:token-exchange
&requested_token_type=urn:ietf:params:oauth:token-type:id-jag
&audience=https://auth.chat.example/
&resource=https://mcp.chat.example/
&scope=chat.read+chat.history
&subject_token=eyJraWQiOiJzMTZ0cVNtODhwREo4VGZCXzdrSEtQ...
&subject_token_type=urn:ietf:params:oauth:token-type:id_token
&client_id=2ec954a1d60620116d36d9ceb7
&client_secret=a26d84873504215a34a86d52ef5cd64f4b76
```
Step 2: client → the MCP server's authorization server, JWT-bearer grant:
```
POST /oauth2/token HTTP/1.1
Host: auth.chat.example

grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer
&assertion=eyJhbGciOiJIUzI1NiIsI...
&client_id=https://client.example.com/client.json
```
The issued access token MUST be audience-restricted to the MCP server named in the ID-JAG's `resource` claim. The step-2 `client_id` is a CIMD URL. [G57]

### Other 2026-07-28 auth details missing from the notes [G1][G3]
- SEP-837: clients MUST set `application_type` in DCR. Without it, authorization servers default to `"web"` and reject `localhost` redirects for CLI/desktop apps.
- SEP-2350: scope accumulation on step-up.
- SEP-2352: credentials are keyed by issuer and never reused across authorization servers.
- Refresh tokens (SEP-2207): clients MAY add `offline_access` only if the AS lists it. MCP servers SHOULD NOT put `offline_access` in `WWW-Authenticate` scope or in PRM `scopes_supported`. [G1 via spec `authorization/index.mdx`]
- stdio servers "SHOULD NOT follow this specification, and instead retrieve credentials from the environment."

### Host-side API integrations (remote MCP clients inside model APIs)
Anthropic Messages API (VERBATIM [G31]):
```bash
curl https://api.anthropic.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: mcp-client-2025-11-20" \
  -d '{
    "model": "claude-opus-5-5",
    "max_tokens": 1000,
    "messages": [{"role": "user", "content": "What tools do you have available?"}],
    "mcp_servers": [
      {
        "type": "url",
        "url": "https://example-server.modelcontextprotocol.io/sse",
        "name": "example-mcp",
        "authorization_token": "YOUR_TOKEN"
      }
    ],
    "tools": [
      {
        "type": "mcp_toolset",
        "mcp_server_name": "example-mcp"
      }
    ]
  }'
```
Returns `mcp_tool_use` / `mcp_tool_result` blocks. Limits: "only tool calls are currently supported" and "Local STDIO servers cannot be connected directly". [G31]

OpenAI Responses API (VERBATIM [G30]):
```bash
curl https://api.openai.com/v1/responses \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $OPENAI_API_KEY" \
-d '{
  "model": "gpt-6-astra",
    "tools": [
      {
        "type": "mcp",
        "server_label": "dmcp",
        "server_description": "A Dungeons and Dragons MCP server to assist with dice rolling.",
        "server_url": "https://dmcp-server.deno.dev/mcp",
        "require_approval": "never"
      }
    ],
    "input": "Roll 2d4+1"
  }'
```
Output items: `mcp_list_tools`, `mcp_approval_request` (approval is the default), and the call result. `allowed_tools` filters the imported tool set to cut cost and latency. Transports: Streamable HTTP or HTTP/SSE. [G30]

### Client implementation details the notes lack
- **Claude Code** [G21]:
  - Truncates each tool description and each server's instructions at **2,048 chars** (`CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH`, v2.1.280+).
  - Answers `roots/list` with the launch directory plus `--add-dir` directories.
  - WebSocket (`"type":"ws"`) is a Claude-Code-specific transport: header-only auth, not in `claude mcp list`. **No WebSocket transport exists in the spec or SEPs** (repo grep).
  - Channels do **not** work over 2026-07-28, so the v2 runtime refuses to register a channel server that negotiates the new revision.
  - Idle timeout: 5 min for remote servers, 30 min for stdio.
  - One-time project `.mcp.json` approvals are ignored until workspace trust is accepted (v2.1.196+).
- **Cursor** [G32]: stdio, SSE and Streamable HTTP. Supports tools, prompts, resources, roots, elicitation and MCP Apps. Sampling and 2026-07-28 are not mentioned. Config at `.cursor/mcp.json` and `~/.cursor/mcp.json`.
- **ChatGPT/Codex plugins** [G27][G28][G29]:
  - Server `instructions`: "Keep the most important details in the first 512 characters".
  - Auth: PRM + `resource` echo. CIMD is prioritized when the AS advertises `client_id_metadata_document_supported`, with DCR or predefined clients as fallbacks. CIMD token auth methods: `none` or `private_key_jwt`.
  - Skills: imports a static subset of SEP-2640 from `capabilities.extensions["io.modelcontextprotocol/skills"]`.
  - **MCP Events**: `events/list`, `events/subscribe` and `events/unsubscribe`, webhook delivery only, based on the draft `experimental-ext-triggers-events`. Requires 2026-07-28.
- **Extension matrix** (community-maintained, 2026-09-28) [G14]:
  - MCP Apps: Claude web/Desktop, VS Code Copilot, M365 Copilot, Goose, Postman, MCPJam, ChatGPT, Cursor, Archestra.AI, PostHog Code.
  - EMA: Archestra.AI and `mcpc`.
  - OAuth Client Credentials: `mcpc` only.
  - Skills: `mcpc` full; ChatGPT, fast-agent and Inspector partial.

### Gateways and hardening products (examples, all vendor-described)
- Microsoft Foundry "toolbox unified MCP endpoint"; Prefect Horizon ("enterprise MCP gateway… tool-level RBAC, audit logs"); Stacklok ToolHive (Apache-2.0: per-server containers, "Virtual MCP Server" gateway, curated and signed registry, per-request policy). [G2][G17][G45]
- The 2026-07-28 header mirroring (`Mcp-Method`/`Mcp-Name`/`Mcp-Param-*`) is the protocol hook these gateways use for routing and authorization without parsing bodies. [G6]
- Server Card WG: `.well-known` metadata so a server "can be discovered and reasoned over without connecting to it", kept close to a subset of `server.json`. [G4][G68]

## Numbers

| Measurement | Value | Conditions | Source |
|---|---|---|---|
| Tool-definition token cost per server | GitHub 35 tools ~26K; Slack 11 tools ~21K; Sentry 5 ~3K; Grafana 5 ~3K; Splunk 2 ~2K; total 58 tools ~55K | Anthropic example setup, Nov 2025 | [G23] |
| Worst seen internally | "134K tokens before optimization" | Anthropic, Nov 2025 | [G23] |
| Tool Search | 85% token reduction; Opus 4 49% → 74%, Opus 4.5 79.5% → 88.1% | Anthropic internal MCP evals, no public dataset | [G23] |
| Selection degrades | "once you exceed 30–50 available tools" | Anthropic docs, vendor statement | [G22] |
| When to enable tool search | ">10K tokens" of definitions or "10+ tools" (Anthropic); 1%–5% of context window as a switch threshold (MCP client best practices) | — | [G23][G25] |
| RAG-MCP | tool selection accuracy 43.13% vs 13.62% baseline; prompt tokens cut >50% | arXiv 2505.03275, 2025-05-06, MCP stress test | [G34] |
| GitHub Copilot | built-in tools 40 → 13; +2–5 pp on SWE-Lancer and SWE-bench-Verified (GPT-5, Sonnet 4.5); −400 ms avg latency; tool-use coverage 94.5% embedding routing / 87.5% LLM selection / 69.0% static list | GitHub, 2025-11-19, online A/B | [G33] |
| MCP-Universe | GPT-5 43.72%, Grok-4 33.33%, Claude-4.0-Sonnet 29.44% | 11 real MCP servers, 6 domains, 2025-08-20 | [G35] |
| MCPMark | best gpt-5-medium 52.56% pass@1, 33.86% pass^4; claude-sonnet-4 and o3 <30% pass@1; 16.2 turns and 17.4 tool calls per task | 127 CRUD-heavy tasks, 2025-09-28 | [G36] |
| LiveMCP-101 | frontier LLMs <60% success | 101 multi-tool queries, 2025-08-21 | [G37] |
| Cloudflare Code Mode MCP | whole API: 1.17M tokens as tools vs ~1,000 tokens with 2 tools (`search`, `execute`) | 2,500+ endpoints, Cloudflare, 2026-02-20 | [G44] |
| SDK downloads (maintainers) | "close to half-a-billion downloads a month" across Tier 1 SDKs; TS and Python each >1B total | stated 2026-07-28 | [G2] |
| SDK downloads (registries) | PyPI `mcp` 219,043,071; `fastmcp` 50,128,296; npm `@modelcontextprotocol/sdk` 220,023,109; `@modelcontextprotocol/server` 23,614,026 | last 30 days to ~2026-09-28/30; includes CI traffic | [G62] |
| Earlier baseline | ">97 million monthly SDK downloads" | AAIF launch, 2025-12-09 (already in spec.md S12) | — |
| Official Registry size | **37,730 servers** (unique names with an `isLatest` entry); 126,506 version records; 23,337 latest entries declare `remotes`; package types across latest entries: npm 10,458, PyPI 4,101, MCPB 1,374, OCI 1,027, NuGet 135, Cargo 64 | full cursor crawl of `registry.modelcontextprotocol.io/v0.1/servers?limit=100` (1,266 pages, 1,237 s), 2026-09-30. Compare "10,000+ servers" (ecosystem-wide, Dec 2025) | [G54] |
| mcp-use v2 vs v1 | 10,982 vs 8,615 median ops/s; 68.1 vs 151.6 ms cold launch; 74.4 vs 404.6 MiB install | vendor, same `tools/list` + `tools/call` workload, 2026-07-29 | [G61] |
| Honeycomb | "nearly 20% of all monthly interactive queries are now made by agents" | vendor quote in the release post, 2026-07-28 | [G2] |
| Claude Code output limits | warning at 10,000 tokens; default cap 25,000 (`MAX_MCP_OUTPUT_TOKENS`); description cap 2,048 chars | current docs | [G21] |
| Skills extension limits | servers SHOULD NOT exceed 512 files or 16 MiB per skill | ext-skills | [G12] |
| CVE severities | CVE-2025-6514 9.6; CVE-2025-49596 9.4; CVE-2025-53109/53110 7.3; CVE-2026-14869 8.6; CVE-2026-14540 6.1 (NVD) vs "CVSS 8.0" (researcher's blog). The sources disagree; NVD is authoritative for the record | NVD, accessed 2026-09-30 | [G39][G40] |

## Pitfalls, limits, criticism (new material)

- **Stateless does not mean tenant-safe.** HashiCorp's Terraform MCP server had "cross-tenant credential reuse in stateless mode" (CVE-2026-16498) *and* "authorization bypass via session credential cache in stateful mode" (CVE-2026-16496). Both modes leaked credentials. This is a concrete case for the spec's State Handle Hijacking and token-binding guidance. [G38]
- **SSRF is the most common real MCP bug class.** Terraform MCP (unauthenticated redirect of the server's own bearer token), Google MCP Toolbox (missing `CheckRedirect` and IP validation), and the spec's own SSRF-via-OAuth-discovery section all show it. The researcher's point: SCA/reachability scanners miss it because "the call graph stops at the transport boundary". [G38][G40][G58]
- **Real rug pull in the wild (Deadbugz).** Two benign tools (`format_text`, `summarize`). After 3 calls on a connection, `tools/list` and `prompts/get` change to instructions that harvest SSH keys, AWS credentials, shell history and kubeconfig. It was distributed through **PRs that edit MCP config files**, not through package registries: 23 PRs in 74 minutes on 2026-08-10, none merged. [G41]
- **Code execution moves the risk into the sandbox.** Check Point found five workerd bugs, including cross-tenant secret reads via URLPattern OOB and a zlib use-after-free that led to native code on the host "starting from a prompt injection". Fixed in production; self-hosted Code Mode must update to workerd v1.20260619.1. Anthropic's own caveat: code execution "requires a secure execution environment with appropriate sandboxing, resource limits, and monitoring". [G24][G43]
- **Elicitation and MRTR are barely used in practice (practitioner view).** Willison: "Tools represent 95%+ of what people actually use MCP for… I don't think I've ever seen anything implement Elicitation" (2026-09-21). Counterpoint: Supabase says MRTR is what finally let its stateless server do elicitation. [G2][G48]
- **Channels and push over 2026-07-28.** Claude Code's channel feature can't run over the new revision (see Mechanics). OpenAI built MCP Events on a *draft* triggers/events extension. Server-initiated events are unstandardized as of 2026-09-30, which is why "agentic messaging primitives" is roadmap priority #1. [G4][G21][G29]
- **Migration toil is real.** In FastMCP 4, elicitation that works on legacy connections raises on modern ones. Claude Code keeps stdio on the legacy era by default. The Python v2 server answers both eras from one endpoint, while TS and Go require opting in to 2026-07-28 at the transport. The ecosystem is running two eras side by side. [G3][G18][G21]
- **Practitioner sample: "Ask HN: Who is using MCP in production?"** (2026-09-03, 198 points, 109 top-level comments). The most-replied comments split two ways. One camp says CLIs and direct APIs are "waaay cheaper and faster" and they use `gh` rather than the GitHub MCP. The other describes in-house, purpose-built MCP servers that abstract API access for agents, or one server correlating logs and metrics across five legacy systems. These are anecdotes, not a survey. [G70]
- **The MCP-vs-CLI debate keeps flipping.** In Sep 2026, a popular "MCP was always a bad idea?" post was followed nine days later by Earendil's public reversal, which integrates MCP through a Codemode sandbox and argues MCP should be "much closer to OpenAPI with intelligent tool discovery". [G47][G48]

## What changed in the last 6 months (items missing from the other notes)

- Apr–May 2026: SEP-2596 lifecycle policy merged (2026-05-18); RC published 2026-05-21. [G8][G66]
- Jun 2026: EMA extension stable (06-18); beta SDKs (06-29). [G3][G56]
- Jul 2026: TS SDK v2 as split packages (07-27); spec GA + `mcp` 2.0.0 (07-28); Terraform MCP CVEs (07-28); Google MCP Toolbox CVE (07-31). [G15][G16][G38][G39]
- Aug 2026: Code Mode sandbox escapes (Black Hat, 08-05/06); Deadbugz (08-10); A2A → AAIF (08-18); Rust Tier 1 (08-21); roadmap (08-22); FastMCP 4.0 (08-31). [G4][G15][G41][G43][G51]
- Sep 2026: `mcp` 2.2.0 and ToolHive OSS (09-07); Skills extension Final (09-11); GitHub blog (09-18); HN debate (09-20); Inspector 2.8.0 (09-23); Ruby Tier 1, TS SDK 2.2.0, SEP process tightened (09-28); Earendil reversal (09-29). [G11][G12][G15][G16][G47]
- The draft spec's changelog is **empty as of 2026-09-30**. No post-2026-07-28 normative protocol change has landed yet; recent spec-repo commits are docs, governance and schema fixes. [G11]

## Diagram candidates

1. **Header-based routing (2026-07-28).** Actors: Client → L7 gateway/WAF → any of N stateless server replicas (round-robin). Arrows labelled `MCP-Protocol-Version`, `Mcp-Method: tools/call`, `Mcp-Name: search`, `Mcp-Param-Region`. A branch from the replica to the client labelled `400 HeaderMismatch -32020` when header ≠ body. [G2][G6]
2. **MRTR with signed `requestState`.** Client → Server `tools/call` (id 1) → `input_required` {inputRequests, requestState = AEAD(principal, ttl, digest)}. Client ↔ User. Client → *different* replica `tools/call` (id 2, inputResponses, requestState). Replica verifies MAC/principal/TTL, then `complete`. [G5]
3. **Era negotiation state machine for a dual client.** States: TryModern → (200) Modern | (400 + modern error) RetryWithSupported | (400 empty / unrecognized, or 404 non-JSON-RPC) FallbackInitialize → Legacy. [G6]
4. **Deprecation timeline.** Swimlanes: HTTP+SSE (deprecated 2025-03-26 → Deprecated state 2026-05-18 → removal-eligible ~2026-08-18); Roots/Sampling/Logging/DCR (Deprecated 2026-07-28 → eligible on or after 2027-07-28); `includeContext` values (follow Sampling). [G7][G8]
5. **Enterprise-Managed Authorization.** Actors: User, MCP Client, Enterprise IdP, MCP Authorization Server, MCP Server. Arrows: SSO → ID token; token-exchange → ID-JAG (`audience` = MCP AS, `resource` = MCP server); jwt-bearer → access token (aud = MCP server); Bearer call. [G57]
6. **Deadbugz rug pull.** States per connection: call 1–2 (benign `tools/list`) → counter = 3 → poisoned `tools/list`/`prompts/get` → agent reads ~/.ssh, ~/.aws, kubeconfig. Side path: attacker PR edits `.mcp.json` → maintainer merges or rejects. [G41]
7. **Code-mode trust boundary.** LLM → code → sandbox isolate (no fs, no env, fetch off by default) → MCP broker → servers. Show the two Check Point breakouts as red arrows: cross-tenant heap read, zlib UAF → host. [G43][G44]
8. **Where state lives after sessions went away.** Before: session store and sticky LB. After: (a) the model threads an explicit server-minted handle as a tool arg; (b) `requestState` round-trips through the client; (c) Tasks give a durable `taskId`. Label the security control on each (bind to principal, entropy, TTL). [G1][G5][G59]
9. **Remote MCP inside model APIs.** Two stacks side by side: Anthropic Messages API `mcp_servers` + `mcp_toolset` → `mcp_tool_use`/`mcp_tool_result`; OpenAI Responses `tools[type=mcp]` → `mcp_list_tools` → `mcp_approval_request` → call. Mark "tools only / remote only". [G30][G31]
10. **Extension negotiation.** Client `_meta.clientCapabilities.extensions{io.modelcontextprotocol/ui, tasks, skills}` ∩ server `server/discover` `capabilities.extensions` → enabled set. Show the extensions' separate repos and version tracks. [G14]
11. **SDK tier ladder over time.** Tier 1: 4 SDKs at 2026-07-28 → Rust 08-21 → Ruby 09-28. Show the thresholds (100% / 80% conformance). [G11][G13]

**Chart candidates (real data):**
- Tokens per MCP server definition (bar): GitHub 26K, Slack 21K, Sentry 3K, Grafana 3K, Splunk 2K. [G23]
- Tool-selection / coverage with vs without mitigation (grouped bar): RAG-MCP 13.62 → 43.13; Copilot static 69.0 / LLM 87.5 / embedding 94.5; Opus 4 49 → 74; Opus 4.5 79.5 → 88.1. Footnote that datasets differ, so bars are not comparable across groups. [G23][G33][G34]
- MCP benchmark ceilings (bar): MCP-Universe GPT-5 43.72 / Grok-4 33.33 / Claude-4.0-Sonnet 29.44; MCPMark gpt-5-medium 52.56 pass@1. [G35][G36]
- Code-mode compression (log-scale bar): Cloudflare 1.17M → ~1K; Anthropic 150K → 2K (illustrative); agent-codemode 65.5K → 226 (field.md S19). [G24][G44]
- Monthly SDK downloads (points): Dec 2025 >97M (all SDKs) → Jul 2026 "~500M" (Tier 1) → Sep 2026 PyPI `mcp` 219M + npm `sdk` 220M. Annotate that the sources differ. [G2][G62]

## Glossary (new terms only)

- **`Mcp-Method` / `Mcp-Name`**: required HTTP headers (2026-07-28) that mirror the JSON-RPC method and the tool/resource/prompt name for routing.
- **`x-mcp-header` / `Mcp-Param-{Name}`**: JSON Schema annotation on a primitive tool parameter that asks clients to mirror its value into an HTTP header.
- **`HeaderMismatch` (-32020)**: error when mirrored headers are missing or differ from the body.
- **`requestState`**: opaque, server-owned string in `InputRequiredResult` that the client echoes on retry. It is attacker-controlled, so it must be MAC'd if it affects authorization or business logic.
- **`CacheableResult` (`ttlMs`, `cacheScope`)**: freshness hint and shared-cache permission on list/read results.
- **Legacy vs modern era**: ≤2025-11-25 (handshake and sessions) vs 2026-07-28+ (per-request `_meta`).
- **Feature lifecycle**: Active → Deprecated (≥12-month window, ≥90 days if expedited for security) → Removed. Tracked in `deprecated.mdx`.
- **ID-JAG**: Identity Assertion JWT Authorization Grant (IETF draft), minted by the enterprise IdP via RFC 8693 token exchange and redeemed with the jwt-bearer grant.
- **`application_type`**: OIDC client metadata that MCP clients must set in DCR (`native` for CLI/desktop) so `localhost` redirects are accepted.
- **MCP Events**: OpenAI's ChatGPT implementation of the *draft* triggers/events extension (`events/list|subscribe|unsubscribe`, webhook delivery).
- **Guard tool (FastMCP)**: a tool that re-runs from the top each MRTR round and returns `InputRequiredResult` until it has its inputs.
- **Server Card**: planned `.well-known` MCP server metadata document (Server Card WG).

## Unverified / open questions

- **Registry count caveat.** The full crawl found 37,730 servers. The registry does no quality vetting (namespace auth and spam prevention only), so this counts published metadata, not working or maintained servers. There is no stats endpoint (field.md got a 404 on `/v0/stats`).
- **VS Code per-request tool limit (often quoted as 128).** Not found on the current VS Code MCP page (fetched 2026-09-30). Don't use this number without another source.
- **Next spec revision date.** The roadmap names priorities but no date. The draft changelog is empty. Unknown whether HTTP+SSE will actually be removed in the next revision (it is only *eligible*).
- **The 2025 incidents I did not re-open**: Supabase/Cursor service-role leak and Asana MCP cross-tenant exposure (Jun 2025). WebSearch quota was exhausted, and HN Algolia queries did not surface primary write-ups. Re-verify before citing. For `postmark-mcp`, the npm registry confirms only the lifecycle: package created 2025-09-15, versions 1.0.0–1.0.18 published by 2025-09-17, all versions unpublished 2025-09-25 (registry `time` field, accessed 2026-09-30). The original write-up (koi.ai) now redirects to a Palo Alto Networks product page, so the "BCC every email to the attacker" detail is **not verified here**.
- **Canopii "State of MCP Security 2026" (field.md S15)**: I confirmed only that the PDF exists (HTTP 200, `application/pdf`, 2.59 MB, `last-modified` 2026-09-30). The file was modified *today*, so numbers in field.md may differ from the version in field.md's snapshot.
- **Check Point CVEs**: none assigned at write-up time (2026-08-07). Not re-checked.
- **Whether Anthropic's Claude.ai / Claude Desktop connectors speak 2026-07-28**: only Claude Code's behaviour is documented [G21].

## Sources

- [G1] "Key Changes" (2026-07-28 changelog), `docs/specification/2026-07-28/changelog.mdx`, modelcontextprotocol/modelcontextprotocol @046fa30, published 2026-07-28, https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/changelog.mdx, accessed 2026-09-30. (Also `basic/index.mdx` and `basic/authorization/index.mdx` from the same tree.)
- [G2] "The 2026-07-28 Specification", MCP blog, David Soria Parra & Den Delimarsky, 2026-07-28, https://blog.modelcontextprotocol.io/posts/2026-07-28/, accessed 2026-09-30.
- [G3] "Beta SDKs for the 2026-07-28 MCP Spec Release Candidate Are Here", MCP blog, F. Weinberger, M. Isbey, D. Delimarsky, 2026-06-29, https://blog.modelcontextprotocol.io/posts/sdk-betas-2026-07-28/, accessed 2026-09-30.
- [G4] "The New MCP Roadmap", MCP blog, D. Soria Parra & D. Delimarsky, 2026-08-22, https://blog.modelcontextprotocol.io/posts/mcp-roadmap/, accessed 2026-09-30.
- [G5] "Multi Round-Trip Requests", MCP spec 2026-07-28, `basic/patterns/mrtr.mdx`, https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr, accessed 2026-09-30.
- [G6] "Streamable HTTP", MCP spec 2026-07-28, `basic/transports/streamable-http.mdx`, https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http, accessed 2026-09-30.
- [G7] "Deprecated Features" registry, MCP spec 2026-07-28, https://modelcontextprotocol.io/specification/2026-07-28/deprecated, accessed 2026-09-30.
- [G8] SEP-2596 "Specification Feature Lifecycle and Deprecation Policy", created 2026-04-17, PR merged 2026-05-18, https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2596, accessed 2026-09-30.
- [G9] "Feature Lifecycle", MCP community docs, https://modelcontextprotocol.io/community/feature-lifecycle, accessed 2026-09-30.
- [G10] SEP-2577 "Deprecate Roots, Sampling and Logging", created 2026-04-14, https://modelcontextprotocol.io/seps/2577-deprecate-roots-sampling-and-logging, accessed 2026-09-30.
- [G11] Git history of modelcontextprotocol/modelcontextprotocol (commits 2026-07-23 → 2026-09-28) and blog post front-matter dates in `blog/content/posts/`, https://github.com/modelcontextprotocol/modelcontextprotocol/commits/main, accessed 2026-09-30.
- [G12] SEP-2640 "Skills Extension" (created 2026-04-23, Final 2026-09-11) and `docs/extensions/skills/overview.mdx`, https://modelcontextprotocol.io/seps/2640-skills-extension, accessed 2026-09-30.
- [G13] "SDKs" listing, MCP docs 2026-07-28 (`docs/docs/2026-07-28/sdk.mdx`, state at 2026-09-28), https://modelcontextprotocol.io/docs/sdk, accessed 2026-09-30.
- [G14] "Extension Support Matrix", MCP docs (state at 2026-09-28), https://modelcontextprotocol.io/extensions/client-matrix, accessed 2026-09-30.
- [G15] PyPI JSON API for `mcp` and `fastmcp` (release upload dates), https://pypi.org/pypi/mcp/json, https://pypi.org/pypi/fastmcp/json, accessed 2026-09-30.
- [G16] npm registry metadata for `@modelcontextprotocol/sdk`, `/server`, `/client`, `/inspector`, https://registry.npmjs.org/@modelcontextprotocol/server, accessed 2026-09-30.
- [G17] FastMCP README, PrefectHQ, https://github.com/PrefectHQ/fastmcp, accessed 2026-09-30 (undated living doc).
- [G18] "Upgrading from FastMCP 3", FastMCP docs, https://gofastmcp.com/getting-started/upgrading/from-fastmcp-3, accessed 2026-09-30 (FastMCP 4 era).
- [G19] "User Elicitation", FastMCP docs, https://gofastmcp.com/servers/elicitation, accessed 2026-09-30.
- [G20] MCP Python SDK README (v2, main), https://github.com/modelcontextprotocol/python-sdk, accessed 2026-09-30.
- [G21] "Connect Claude Code to tools via MCP", Claude Code docs, https://code.claude.com/docs/en/mcp, accessed 2026-09-30 (living doc; versions cited in page).
- [G22] "Tool search tool", Claude Platform docs, https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool, accessed 2026-09-30.
- [G23] "Advanced tool use on Claude Developer Platform", Anthropic Engineering, 2025-11-24, https://www.anthropic.com/engineering/advanced-tool-use, accessed 2026-09-30.
- [G24] "Code execution with MCP", Anthropic Engineering, Adam Jones & Conor Kelly, 2025-11-04, https://www.anthropic.com/engineering/code-execution-with-mcp, accessed 2026-09-30.
- [G25] "Client Best Practices", MCP docs 2026-07-28, https://modelcontextprotocol.io/docs/2026-07-28/develop/clients/client-best-practices, accessed 2026-09-30.
- [G26] "Building MCP servers for plugins and API integrations", OpenAI docs, https://developers.openai.com/api/docs/mcp, accessed 2026-09-30.
- [G27] "Build an MCP server" (Plugins), OpenAI docs, https://developers.openai.com/plugins/build/mcp-server, accessed 2026-09-30.
- [G28] "Authentication" (Plugins), OpenAI docs, https://developers.openai.com/plugins/build/auth, accessed 2026-09-30.
- [G29] "MCP Events" (Plugins), OpenAI docs, https://developers.openai.com/plugins/build/mcp-events, accessed 2026-09-30.
- [G30] "Connectors and MCP servers" (Responses API), OpenAI docs, https://developers.openai.com/api/docs/guides/tools-connectors-mcp, accessed 2026-09-30.
- [G31] "MCP connector", Claude Platform docs (beta `mcp-client-2025-11-20`), https://platform.claude.com/docs/en/agents-and-tools/mcp-connector, accessed 2026-09-30.
- [G32] "Model Context Protocol (MCP)", Cursor docs, https://cursor.com/docs/context/mcp, accessed 2026-09-30.
- [G33] "How we're making GitHub Copilot smarter with fewer tools", GitHub Blog, 2025-11-19, https://github.blog/ai-and-ml/github-copilot/how-were-making-github-copilot-smarter-with-fewer-tools/, accessed 2026-09-30.
- [G34] Gan & Sun, "RAG-MCP: Mitigating Prompt Bloat in LLM Tool Selection via Retrieval-Augmented Generation", arXiv 2505.03275, 2025-05-06, https://arxiv.org/abs/2505.03275, accessed 2026-09-30.
- [G35] "MCP-Universe: Benchmarking LLMs with Real-World MCP Servers", arXiv 2508.14704, 2025-08-20, https://arxiv.org/abs/2508.14704, accessed 2026-09-30.
- [G36] "MCPMark: A Benchmark for Stress-Testing Realistic and Comprehensive MCP Use", arXiv 2509.24002, 2025-09-28, https://arxiv.org/abs/2509.24002, accessed 2026-09-30.
- [G37] "LiveMCP-101", arXiv 2508.15760, 2025-08-21, https://arxiv.org/abs/2508.15760, accessed 2026-09-30.
- [G38] "HCSEC-2026-23: Multiple vulnerabilities impacting HashiCorp Terraform MCP Server", HashiCorp, 2026-07-28, https://discuss.hashicorp.com/t/hcsec-2026-23-multiple-vulnerabilities-impacting-hashicorp-terraform-mcp-server, accessed 2026-09-30.
- [G39] NVD records CVE-2025-6514 (2025-07-09), CVE-2025-49596 (2025-06-13), CVE-2025-53109/53110 (2025-07-02), CVE-2026-14540 (2026-07-31), CVE-2026-14869 (2026-07-28), https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=<id>, accessed 2026-09-30.
- [G40] "I found an SSRF in Google's official MCP Toolbox (CVE-2026-14540)", independent researcher (anas-security-portfolio), HN-posted 2026-09-28, https://anas-security-portfolio.vercel.app/google-mcp-ssrf.html, accessed 2026-09-30.
- [G41] "Deadbugz: A new kind of malicious MCP server", Omnafy (citing Pillar Security), 2026-09-09, https://omnafy.com/blog/deadbugz-malicious-mcp-server/, accessed 2026-09-30.
- [G42] "GitHub MCP Exploited: Accessing private repositories via MCP", Invariant Labs, 2025-05-26, https://invariantlabs.ai/blog/mcp-github-vulnerability, accessed 2026-09-30.
- [G43] "When Agentic Glue Melts: Exploiting Cloudflare Code Mode and Workers", Check Point Research (Yarden Porat), 2026-08-07, https://research.checkpoint.com/2026/when-agentic-glue-melts/, accessed 2026-09-30.
- [G44] "Code Mode: give agents an entire API in 1,000 tokens", Cloudflare Blog, Matt Carey, 2026-02-20, https://blog.cloudflare.com/code-mode-mcp/, accessed 2026-09-30.
- [G45] "ToolHive is open-source", Help Net Security, 2026-09-07, https://www.helpnetsecurity.com/2026/09/07/toolhive-open-source-mcp-server-security/, accessed 2026-09-30.
- [G46] "MCP vs. CLI: Benchmarking Tools for Coding Agents", Mario Zechner, 2025-08-15, https://mariozechner.at/posts/2025-08-15-mcp-vs-cli/, accessed 2026-09-30.
- [G47] "You Said No MCP!", Earendil Engineering, 2026-09-29, https://earendil.com/posts/you-said-no-mcp/, accessed 2026-09-30.
- [G48] HN story 49779329 "MCP was always a bad idea?" (2026-09-20) and Simon Willison comments 49779718, 49786809, 49791197 (2026-09-20/21), https://news.ycombinator.com/item?id=49779718, accessed 2026-09-30.
- [G49] "Stateless MCP has recaptured my interest", Simon Willison, 2026-07-31, https://simonwillison.net/2026/Jul/31/stateless-mcp/, accessed 2026-09-30.
- [G50] "Should you read the code, is RAG dead, and did Skills kill MCP?", GitHub Blog, GPS (@madebygps), 2026-09-18, https://github.blog/ai-and-ml/should-you-read-the-code-is-rag-dead-and-did-skills-kill-mcp/, accessed 2026-09-30.
- [G51] "Google Moves A2A Under Agentic AI Foundation", Techstrong.ai, 2026-08-18, https://techstrong.ai/articles/google-moves-a2a-under-agentic-ai-foundation/, accessed 2026-09-30.
- [G52] Licensing transition: PR #1994 (opened 2025-12-19, merged 2026-01-05), discussion #1995 (2025-12-19), issue #3197 (2026-08-04, a copy), repo LICENSE, https://github.com/modelcontextprotocol/modelcontextprotocol/pull/1994, accessed 2026-09-30.
- [G53] modelcontextprotocol/registry README (status notes 2025-09-08 and 2025-10-24), https://github.com/modelcontextprotocol/registry, accessed 2026-09-30.
- [G54] Author's full crawl (1,266 pages) of https://registry.modelcontextprotocol.io/v0.1/servers?limit=100 (cursor pagination, `_meta["io.modelcontextprotocol.registry/official"].isLatest`), run 2026-09-30.
- [G55] "MCP Apps – Bringing UI Capabilities To MCP Clients", MCP blog, 2026-01-26, https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/, accessed 2026-09-30.
- [G56] "Enterprise-Managed Authorization: Zero-touch OAuth for MCP", MCP blog, 2026-06-18, https://blog.modelcontextprotocol.io/posts/enterprise-managed-auth/, accessed 2026-09-30.
- [G57] Enterprise-Managed Authorization spec (stable), modelcontextprotocol/ext-auth, https://github.com/modelcontextprotocol/ext-auth/blob/main/specification/stable/enterprise-managed-authorization.mdx, accessed 2026-09-30.
- [G58] "Security Best Practices", MCP docs 2026-07-28, https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices, accessed 2026-09-30.
- [G59] "Tools", MCP spec 2026-07-28 (`server/tools.mdx`), https://modelcontextprotocol.io/specification/2026-07-28/server/tools, accessed 2026-09-30.
- [G60] "Tool Annotations as Risk Vocabulary: What Hints Can and Can't Do", MCP blog, O. Hungerford, S. Morrow, L. Chang, 2026-03-16, https://blog.modelcontextprotocol.io/, accessed 2026-09-30.
- [G61] "mcp-use v2: rebuilt from scratch for the stateless 2026-07-28 MCP spec", Manufact, 2026-07-29, https://manufact.com/blog/mcp-use-v2, accessed 2026-09-30.
- [G62] pypistats.org `/api/packages/{mcp,fastmcp}/recent` and api.npmjs.org `/downloads/point/last-month/...` (window 2026-08-30 → 2026-09-28 for npm), accessed 2026-09-30.
- [G63] "Discover", MCP spec 2026-07-28 (`server/discover.mdx`), https://modelcontextprotocol.io/specification/2026-07-28/server/discover, accessed 2026-09-30.
- [G64] "Tasks" extension overview, MCP docs, https://modelcontextprotocol.io/extensions/tasks/overview, accessed 2026-09-30.
- [G65] MCP Inspector README and `docs/cli-smoke-testing.md` (v2, npm 2.8.0 of 2026-09-23), https://github.com/modelcontextprotocol/inspector, accessed 2026-09-30.
- [G66] "The 2026-07-28 MCP Specification Release Candidate", MCP blog, 2026-05-21, https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/, accessed 2026-09-30.
- [G67] "The Official Ruby SDK for MCP Reaches 1.0", MCP blog, 2026-07-27, https://blog.modelcontextprotocol.io/, accessed 2026-09-30.
- [G69] "Smithery joins Arcade", Arcade.dev blog, 2026-08-05, https://www.arcade.dev/blog/smithery-joins-arcade/, accessed 2026-09-30.
- [G70] "Ask HN: Who is using MCP in production?", Hacker News item 49548600, 2026-09-03, https://news.ycombinator.com/item?id=49548600, accessed 2026-09-30.
- [G68] "Server Card Charter", MCP community docs, https://modelcontextprotocol.io/community/working-groups/server-card, accessed 2026-09-30.
