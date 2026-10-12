# 15. Интеграции и авторизация агентов — gaps, contradictions and corrections notes

Lens: completeness critic and gap-filler over `spec.md`, `practice.md`, `field.md` (same folder).
Source ids here use the prefix **G** (G1…G55) so they never collide with the S-ids in the other
three files. When this file cites another note file's claim, it says "spec.md [S6]" etc.
Method: every contradiction was taken back to a primary source (spec repo via GitHub API, IETF
datatracker API, RFC Editor JSON, vendor docs as raw markdown, live HTTP probes). WebSearch was
exhausted for this session, so discovery went through the HN Algolia API, GitHub API/search,
datatracker and llms.txt indexes instead.

## Contradictions resolved

1. **Which MCP spec is current.** field.md says `2025-11-25` is current and that the `2026-07-28`
   authorization doc 404s. **Wrong.** GitHub releases show tag `2026-07-28` published
   2026-07-28T16:47Z (RC `2026-07-28-RC` on 2026-05-29) [G3]; `schema/2026-07-28/schema.ts` sets
   `LATEST_PROTOCOL_VERSION = "2026-07-28"` [G3]. The 404 was a path error: in 2026-07-28 the
   authorization spec is a folder (`basic/authorization/index.mdx`, `client-registration.mdx`,
   `authorization-server-discovery.mdx`, `security-considerations.mdx`), not `authorization.mdx`
   [G2]. spec.md and practice.md are right.
2. **ID-JAG vs identity chaining.** spec.md presents `draft-ietf-oauth-identity-chaining-17` as
   *the* Cross-App Access / ID-JAG spec; practice.md and field.md cite
   `draft-ietf-oauth-identity-assertion-authz-grant-04`. They are **two different documents**.
   Identity chaining is the general two-step framework (token exchange in domain A → JWT grant →
   RFC 7523 at domain B); it is approved and sitting in the **RFC Editor queue** (IESG state
   "RFC Ed Queue", rev 17 uploaded 2026-07-19, RPC "Awaiting First editor" 2026-08-21) — so it
   is past Last Call, not "in Last Call" as spec.md says [G10][G11]. ID-JAG
   (`draft-ietf-oauth-identity-assertion-authz-grant`, rev 04, 2026-05-21, WG document) is a
   profile that uses an SSO identity assertion (ID token / SAML) as the subject token and
   introduces `requested_token_type=urn:ietf:params:oauth:token-type:id-jag` and JWT
   `typ: oauth-id-jag+jwt` [G4][G10]. MCP's EMA extension profiles ID-JAG-04, not chaining-17
   directly [G4].
3. **OAuth Client Credentials extension status.** practice.md calls it "official"; field.md
   calls it "Draft". **Draft**: the file lives at `ext-auth/specification/draft/oauth-client-credentials.mdx`;
   only EMA is in `specification/stable/` (promoted by commit "Promote Enterprise-Managed
   Authorization to stable", 2026-06-17; merged 2026-06-18) [G5]. The Python SDK v2 ships a
   client for it anyway [G18].
4. **DCR: "deprecated" vs "MAY".** Both right for their versions. 2025-11-25: CIMD SHOULD, DCR MAY
   (field.md quoting 2025-11-25). 2026-07-28: DCR formally **Deprecated** under the new feature
   lifecycle policy (PR #2858), kept for backwards compatibility, "will be removed in a future
   version" [G1][G7]. Minimum deprecation window is 12 months [G1].
5. **Why DCR was demoted.** practice.md says DCR is deprecated "because of the confused-deputy
   risk pattern". The maintainers' own rationale is **operational**: public registration
   endpoints needing rate limiting, unbounded registration databases, non-portable registrations
   (one per device), unclear cleanup; client impersonation is explicitly called "orthogonal to
   the DCR vs. CIMD debate" and is to be addressed by software statements / platform attestation
   [G9]. The confused-deputy attack (security best practices) is a proxy-design flaw that DCR
   makes cheap, not the stated reason for deprecation.
6. **`iss` validation strength.** spec.md TL;DR says clients "MUST validate the iss parameter".
   Exact 2026-07-28 text: ASes **SHOULD** include `iss` (and MUST advertise
   `authorization_response_iss_parameter_supported: true` if they do); clients **MUST** validate a
   *present* `iss` against the issuer recorded before redirect; a missing `iss` is rejected only
   when metadata says it is supported; no normalization before comparison; "a future revision …
   is expected to upgrade authorization server inclusion of `iss` from SHOULD to MUST" [G2].
7. **Sessions and session affinity.** field.md describes SberTech's gateway doing session affinity
   on `mcp-session-id` (published 2026-09-11). 2026-07-28 **removed** protocol sessions, the
   `Mcp-Session-Id` header and the `initialize` handshake; "any request can land on any instance
   behind a plain round-robin load balancer"; cross-call state goes into "explicit, server-minted
   handles passed as ordinary tool arguments" [G1][G7]. SberTech's design is correct for
   2025-era servers and becomes unnecessary for 2026-07-28 servers; a gateway serving both eras
   must still handle affinity for old clients.
8. **Sampling / Roots.** spec.md: MRTR carries `sampling/createMessage` and `roots/list`.
   practice.md: Sampling and Roots are deprecated. **Both**: SEP-2577 deprecates Roots, Sampling
   and Logging (still functional during the window); while they live, they are delivered through
   MRTR `inputRequests` [G1].
9. **RFC 9207 date.** spec.md: "published 2024". **March 2022** [G13].
10. **RAR status.** spec.md glossary: "draft-ietf-oauth-rar". RAR is **RFC 9396, May 2023** [G13].
11. **OAuth 2.1 draft number.** Notes say `-13`/`-14`. Latest is **`draft-ietf-oauth-v2-1-16`
    (2026-09-03)**; MCP 2026-07-28 still cites -13 normatively and -14 in the refresh-token
    section [G2][G10].
12. **CIMD draft number.** All notes say `-00`. The WG draft is at **-02 (2026-07-06)**; MCP core
    still cites -00, the EMA extension cites -01 for `private_key_jwt` [G4][G10].
13. **agentgateway governance.** practice.md: "Linux Foundation project, backed by Blacksmith".
    AAIF blog (2026-06-04): **Solo.io donated agentgateway to the Agentic AI Foundation** (itself
    a Linux Foundation directed fund); "300+ active contributors across over 60 organizations"
    [G30]. Nothing found supports "Blacksmith"; drop it.
14. **Entra Agent ID status.** practice.md could not verify; spec.md says GA. Microsoft's "What's
    new" page (ms.date 2026-05-01): "Microsoft Entra Agent ID is now generally available" [G22].
    Base platform "available for all Microsoft Entra customers"; extending Entra *security*
    features (Conditional Access, ID Protection, etc.) to agents "requires Microsoft Agent 365",
    included in Microsoft 365 E7 or an add-on to E5/A5/Business Premium [G21]. spec.md's "page
    last updated 2026-06-24" is superseded: ms.date 2026-04-14, updated_at 2026-08-13 [G21].
15. **Auth0 Agent as Principal.** field.md: "shipping next". Docs (accessed 2026-09-30): **Early
    Access**, contact Auth0 Support, free-trial terms [G26].
16. **What the Supabase incident was.** field.md calls it "SQL-injection-via-ticket" and
    "confused deputy". It was **prompt injection**: natural-language instructions inside a
    support ticket, executed by an agent whose MCP connection used `service_role` (RLS bypass)
    (spec.md [S19][S20]). No SQL parser was fooled. First HN appearance 2025-06-17 (6 pts), main
    thread 2025-07-08 (848 pts) [G31].
17. **Storm-3168 = "agentic" attack?** field.md frames it as agentic-speed abuse. Microsoft's text:
    the timing and "overlapping token streams … strongly indicates automated or scripted
    execution"; it does not attribute this incident to an autonomous AI agent (the actor is
    described as conducting "agentic-driven cloud attacks") [G38]. field.md's numbers check out,
    including "Two of the tokens used for deletion were active during the same 70 second period"
    [G38].
18. **EMA adopters.** field.md (via Selectel): "Anthropic, Microsoft and Okta support it". MCP blog
    (2026-06-18): **Okta is the first (and at launch only) supported IdP** (via Okta Cross App
    Access); clients: Anthropic's shared MCP layer (Claude, Claude Code, Cowork) and VS Code
    (preview); servers: Asana, Atlassian, Canva, Figma, Granola, Linear, Supabase; Slack
    "actively adding support" [G6]. Microsoft participates as a client (VS Code), not as an EMA
    IdP at launch. Nango (2026-06-26) likewise names only Okta [G53].
19. **Supabase "three hosts" audit (spec.md/practice.md Unverified).** The korrel-dev repo is gone
    (GitHub API 404 for the repo, 2026-09-30). A live probe today shows: resource server
    `https://mcp.supabase.com/mcp`, PRM at `/.well-known/oauth-protected-resource/mcp`, AS issuer
    `https://api.supabase.com`, DCR at `https://api.supabase.com/platform/oauth/apps/register` —
    i.e. **two hosts now** (RS and AS), DCR on the AS host under a different path [G43]. The
    three-host claim cannot be confirmed and may describe an earlier state.

## Claims most likely to be wrong (with corrections)

1. **"MCP's latest spec is 2025-11-25 / 2025-06-18."** → `2026-07-28` (released 2026-07-28) [G1][G3].
2. **"MCP clients register via Dynamic Client Registration."** → DCR is Deprecated in 2026-07-28.
   Client order: pre-registered → CIMD (if AS metadata has
   `client_id_metadata_document_supported: true`) → DCR → ask the user [G1] (spec.md [S3]). Yet in
   the wild 10 of 12 probed servers still expose DCR and only 5 advertise CIMD [G43].
3. **"An MCP session starts with `initialize`; auth state hangs off `Mcp-Session-Id`."** →
   Both removed in 2026-07-28; version/capabilities travel in `_meta` of every request;
   `server/discover` is optional [G1][G7].
4. **"OAuth 2.1 is RFC …" / "OAuth 2.1 draft -13 is latest."** → still an Internet-Draft,
   `draft-ietf-oauth-v2-1-16` (2026-09-03) [G10].
5. **"Cross-App Access / ID-JAG is draft-ietf-oauth-identity-chaining."** → ID-JAG is
   `draft-ietf-oauth-identity-assertion-authz-grant-04`; identity chaining is the underlying
   framework, now in the RFC Editor queue [G10][G11].
6. **"EMA works with Entra / any enterprise IdP."** → At launch (2026-06-18) Okta is the only
   supported IdP [G6][G53]. EMA is Stable; the client-credentials extension is still Draft [G5].
7. **"On-behalf-of = RFC 8693 everywhere."** → Microsoft Entra agent OBO uses
   `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer` +
   `requested_token_use=on_behalf_of` plus an `fmi_path` blueprint→agent-identity step [G23];
   AWS AgentCore supports **both** RFC 8693 (`TOKEN_EXCHANGE`) and RFC 7523 §2.1
   (`JWT_AUTHORIZATION_GRANT`) modes [G24]; Auth0 OBO is RFC 8693 but "Refresh tokens are not
   supported for the OBO token exchange" [G26][G27].
8. **"A token vault means raw provider tokens never leave the platform."** → Cyera (2026-08-13):
   a single read call with a leaked Composio API key "returned the Gmail access_token and
   refresh_token, the GitHub bearer token, and the CircleCI API key"; "rotating the Composio key
   doesn't end the incident" [G28]. The platform key is effectively a master key; scope and store
   it as such.
9. **"Run the agent's SQL in a read-only transaction and it is safe."** → Postgres: session
   defaults "can be overridden by SET TRANSACTION for an individual transaction", and read-only
   "does not prevent all writes to disk" [G51]. Use a role with SELECT-only grants (Supabase's
   read-only mode "executes all queries as a read-only Postgres user" [G42]), plus
   `statement_timeout`. RLS does not constrain "Superusers and roles with the BYPASSRLS
   attribute", or table owners unless `FORCE ROW LEVEL SECURITY` [G51].
10. **"MCP elicitation = server sends `elicitation/create`; URL mode completes with
    `notifications/elicitation/complete`."** → In 2026-07-28 elicitation arrives inside an
    `InputRequiredResult` (MRTR); `notifications/elicitation/complete` and `elicitationId` were
    **removed**; correlate via `requestState` [G1].
11. **"The user clicked Approve in the agent UI, so the action is authorized."** →
    `draft-ietf-wimse-aims-00`: such confirmations "do not by themselves constitute
    authorization and MUST be bound to a verifiable authorization grant"; "the agent MUST NOT treat
    local UI confirmation alone as sufficient authorization" [G12].
12. **"CIBA/device flow is the safe way to get human approval."** → RFC 10027 (BCP 247, Aug 2026)
    names Cross-Device Consent Phishing against RFC 8628 and CIBA: attackers "skip the step of
    collecting credentials by persuading users to grant authorization"; implementers MUST do a
    risk assessment and SHOULD add proximity checks [G14].
13. **Dates/versions of base specs.** RFC 9207 = Mar 2022 (not 2024); RAR = RFC 9396 May 2023
    (not a draft); DPoP = RFC 9449 Sep 2023; OAuth Security BCP = RFC 9700 Jan 2025; PRM = RFC 9728
    Apr 2025; CIMD WG draft = -02; CIBA Core 1.0 Final = 2021-09-01 [G13][G10][G17].
14. **"The Claude / OpenAI APIs run the MCP OAuth flow for you."** → Claude API `mcp_servers[]`
    takes `authorization_token`; "API consumers are expected to handle the OAuth flow and obtain
    the access token prior to making the API call, and to refresh the token as needed" (beta
    header `mcp-client-2025-11-20`; `mcp-client-2026-09-15` adds tool-list pinning) [G36]. OpenAI
    Responses `mcp` tool takes `authorization`; it is not stored and "you must send the
    `authorization` value in every Responses API creation request" [G37].
15. **Vendor/SDK landscape frozen in 2025.** → Stytch agreed to be acquired by Twilio
    (2025-10-30); Pipedream by Workday (2025-11-19); Smithery by Arcade (2026-08-05); MCP donated
    to the Agentic AI Foundation (2025-12-09), A2A moved under AAIF (2026-08-18) [G31][G32].
    Python: MCP SDK v2 (2026-07-28) renamed `FastMCP` → `MCPServer`, v1 is maintenance-only [G18];
    Cloudflare `workers-oauth-provider` 1.0 (2026-09-24) split AS and RS classes [G35]. Storm-3168
    is "automated or scripted", not proven AI-driven [G38].

## TL;DR

- MCP `2026-07-28` is current: stateless core, no sessions, DCR deprecated for CIMD, RFC 9207
  `iss` checks, issuer-bound client credentials, `application_type` in DCR, MRTR replaces
  server→client requests [G1][G7].
- Enterprise-Managed Authorization (ID-JAG profile) went **Stable on 2026-06-18**; Okta is the
  only IdP at launch; Claude/Claude Code/Cowork and VS Code are clients [G6].
- MCP's next auth work (roadmap 2026-08-22): DPoP (SEP-1932), Workload Identity Federation
  (SEP-1933), ID-JAG and token exchange as "an opinionated path for agent identity and
  delegation" [G8][G20]. None of these is in the spec yet.
- IETF now has a WG-adopted agent document: `draft-ietf-wimse-aims-00` (2026-09-15; authors from
  Defakto, AWS, Zscaler, Ping, OpenAI, Okta). It adds no new protocol: SPIFFE/WIMSE IDs for
  agents, OAuth for delegation, Transaction Tokens inside call chains, CIBA for HITL, and "The
  Large Language Model MUST NOT have access to an agent's credentials" [G12].
- Identity chaining is approved (RFC Editor queue); Transaction Tokens is at -11 awaiting
  write-up; OAuth 2.1 at -16 [G10][G11].
- Every hyperscaler now has a GA or near-GA agent-identity plane with an OBO primitive, but the
  wire formats differ (Entra jwt-bearer OBO, AgentCore 8693-or-7523, Auth0 8693 + `act`)
  [G23][G24][G27].
- The per-action authorization gap has a standard now: **OpenID AuthZEN Authorization API 1.0
  Final (2026-01-11)**, a PEP→PDP `POST /access/v1/evaluation` API [G16].
- Gateways moved from "proxy" to "token exchanger": Kong `ai-mcp-oauth2` strips client tokens
  by default and does token exchange from 3.14 [G34]; agentgateway added RFC 8693, RFC 7523
  and Entra OBO backends (2026-07) [G29].
- A vault's own API key is a master key: leaked Composio keys returned live Gmail/GitHub/CircleCI
  tokens [G28].
- In the wild, MCP OAuth is uneven: of 12 big remote MCP servers probed 2026-09-30, 5 advertise
  CIMD, 5 advertise RFC 9207 `iss`, 4 still list PKCE `plain`, 10 expose DCR, 1 lacks a PRM
  document [G43].
- For DB tools, the safest pattern is **pre-defined parameterized SQL tools with identity-bound
  parameters** (Google MCP Toolbox "authenticated parameters" fill `user_id` from the OIDC `sub`,
  not from the LLM) [G44]; raw `execute_sql` plus RLS on custom GUCs is weaker (see Pitfalls).
- Durable execution retries activities from the start, so idempotency keys are still required at
  the API edge (Temporal: "Activities may be retried … executed more than once") [G45][G46].

## Current state and versions (as of 2026-09-30)

| Item | State | Date | Source |
|---|---|---|---|
| MCP spec | `2026-07-28` (RC 2026-05-29) | 2026-07-28 | [G3] |
| MCP EMA extension | Stable (`ext-auth/specification/stable`) | 2026-06-18 | [G5][G6] |
| MCP OAuth Client Credentials ext. | Draft | — | [G5] |
| SEP-1932 DPoP / SEP-1933 WIF | open PRs, labels `draft`, `extension`, `roadmap/security` | updated 2026-09-28 | [G20] |
| MCP Python SDK | v2.2.0 (2026-09-07); v2.0.0 on 2026-07-28; v1.30.0 maintenance line | 2026-09-07 | [G18][G19] |
| MCP TypeScript SDK | 2.2.0 / 1.31.0 | 2026-09-28 | [G19] |
| FastMCP (PrefectHQ) | v4.0.10 | 2026-09-25 | [G19] |
| OAuth 2.1 | draft-ietf-oauth-v2-1-16 | 2026-09-03 | [G10] |
| CIMD | draft-ietf-oauth-client-id-metadata-document-02 | 2026-07-06 | [G10] |
| ID-JAG | draft-ietf-oauth-identity-assertion-authz-grant-04 | 2026-05-21 | [G10] |
| Identity chaining | -17, IESG: RFC Ed Queue | rev 2026-07-19 | [G11] |
| Transaction Tokens | draft-ietf-oauth-transaction-tokens-11, WG consensus waiting write-up | 2026-08-21 | [G10] |
| Attestation-based client auth | -11, in WG Last Call | 2026-09-08 | [G10] |
| WIMSE AIMS | draft-ietf-wimse-aims-00 (replaces draft-klrc-aiagent-auth-03) | 2026-09-15 | [G10][G12] |
| On-behalf-of for AI agents (WSO2) | -02, **Expired** | expired 2026-02-27 | [G10] |
| OAuth actor profile (McGuinness) | draft-mcguinness-oauth-actor-profile-00, individual | 2026-04-30 | [G10] |
| RFC 10017 Browser-Based Apps BCP; RFC 10027 Cross-Device Flows BCP 247 | published | 2026-08 | [G14][G15] |
| OpenID AuthZEN Authorization API 1.0 | Final | 2026-01-11 | [G16] |
| Idempotency-Key header draft | -07, **Expired** | 2026-04-18 | [G10] |
| RateLimit header fields draft | -11, active WG doc | 2026-05-23 | [G10][G50] |
| Entra Agent ID | GA | whats-new ms.date 2026-05-01 | [G22] |
| Auth0 Agent as Principal | Early Access | accessed 2026-09-30 | [G26] |
| Docker MCP Gateway | v0.44.1; needs Docker Desktop 4.59+ | 2026-09-23 | [G19][G33] |
| Cloudflare workers-oauth-provider | v1.2.1 (1.0.0 on 2026-09-24) | 2026-09-28 | [G35] |
| Kong `ai-mcp-oauth2` | since Gateway 3.12; token exchange since 3.14 | — | [G34] |
| Google MCP Toolbox for Databases | v1.13.1 (repo `googleapis/mcp-toolbox`, 16.5k stars) | 2026-09-25 | [G44] |
| Supabase MCP server | mcp-server-supabase v0.13.0 | 2026-09-17 | [G41] |

## Timeline

- 2021-09-01 — CIBA Core 1.0 Final [G17].
- 2022-03 — RFC 9207 (`iss` in authorization response) [G13].
- 2023-05 / 2023-09 — RFC 9396 RAR; RFC 9449 DPoP [G13].
- 2025-01 — RFC 9700 OAuth 2.0 Security BCP [G13].
- 2025-04 — RFC 9728 PRM [G13].
- 2025-06-16 — Willison "lethal trifecta" post; 2025-06-19 Asana MCP cross-org exposure reported
  (BleepingComputer via HN) [G31].
- 2025-08-22 — MCP blog "Evolving OAuth Client Registration" (CIMD plan, software statements)
  [G9].
- 2025-10-30 — Twilio to acquire Stytch [G31].
- 2025-11-19 — Workday to acquire Pipedream [G31].
- 2025-12-09 — MCP donated to the Linux Foundation's Agentic AI Foundation (AAIF) [G31].
- 2025-12 — OWASP Top 10 for Agentic Applications for 2026 published (HN 2025-12-10/14) [G31].
- 2026-01-11 — AuthZEN Authorization API 1.0 Final [G16].
- 2026-03-24 — Claude Code support for CIMD reported (HN) [G31].
- 2026-05-01 — Five Eyes "Careful Adoption of Agentic AI Services" [G40]; Entra Agent ID GA
  "What's new" page dated 2026-05-01 [G22].
- 2026-05-20 — Istio 1.30 ships including agentgateway (HN) [G31].
- 2026-05-21 — ID-JAG -04 [G10].
- 2026-05-26 — NSA CSI "MCP: Security Design Considerations for AI-Driven Automation" surfaced on
  HN (PDF 403 to our fetch) [G31].
- 2026-05-29 — MCP 2026-07-28 RC [G3].
- 2026-06-04 — agentgateway joins AAIF [G30].
- 2026-06-18 — EMA Stable [G6].
- 2026-07-06 — CIMD -02 [G10].
- 2026-07-12 — agentgateway token exchange / JWT assertion / Entra OBO [G29].
- 2026-07-19 — identity chaining -17 → RFC Editor queue [G11].
- 2026-07-28 — MCP 2026-07-28 spec; MCP Python SDK v2.0.0 [G3][G18].
- 2026-07-31 — CVE-2026-14540 (SSRF, Google MCP Toolbox, CVSS 8.0) published [G39].
- 2026-08 — RFC 10017, RFC 10027 [G15].
- 2026-08-05 — Arcade acquires Smithery [G32].
- 2026-08-13 — Cyera: leaked AI-integration-platform keys return live OAuth tokens [G28].
- 2026-08-18 — Google moves A2A under AAIF (HN) [G31].
- 2026-08-22 — MCP roadmap: "Agent identity and enterprise-ready security" priority [G8].
- 2026-09-03 — OAuth 2.1 -16 [G10].
- 2026-09-15 — draft-ietf-wimse-aims-00 [G12].
- 2026-09-24 — Cloudflare workers-oauth-provider 1.0.0 [G35].
- 2026-09-25 — Storm-3168 report [G38].

## Mechanics

### 1. EMA / ID-JAG wire format (VERBATIM from the stable spec [G4])

Step A — Token exchange at the enterprise IdP (VERBATIM [G4]):
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
Response (VERBATIM [G4]):
```
{
  "issued_token_type": "urn:ietf:params:oauth:token-type:id-jag",
  "access_token": "eyJhbGciOiJIUzI1NiIsI...",
  "token_type": "N_A",
  "scope": "chat.read chat.history",
  "expires_in": 300
}
```
ID-JAG JWT (VERBATIM [G4]):
```
{
  "typ": "oauth-id-jag+jwt"
}
.
{
  "jti": "9e43f81b64a33f20116179",
  "iss": "https://acme.idp.example",
  "sub": "U019488227",
  "email": "user@example.com",
  "aud": "https://auth.chat.example/",
  "resource": "https://mcp.chat.example/",
  "client_id": "f53f191f9311af35",
  "exp": 1311281970,
  "iat": 1311280970,
  "scope": "chat.read chat.history"
}
.
signature
```
Step B — redeem at the MCP server's AS with RFC 7523 (VERBATIM [G4]):
```
POST /oauth2/token HTTP/1.1
Host: auth.chat.example

grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer
&assertion=eyJhbGciOiJIUzI1NiIsI...
&client_id=https://client.example.com/client.json
```
Rules: issued access token "MUST be audience-restricted to the MCP Server identified by the
`resource` claim"; discovery via `urn:ietf:params:oauth:grant-profile:id-jag` in
`authorization_grant_profiles_supported`; a non-pre-registered client can use its CIMD URL as
`client_id` and `private_key_jwt` [G4]. "In most enterprise deployments, the IdP policy will only
allow users to sign in to pre-registered clients" [G4].

### 2. Entra Agent ID on-behalf-of (VERBATIM [G23])

Blueprint gets an exchange token for a child agent identity:
```
POST /oauth2/v2.0/token
Content-Type: application/x-www-form-urlencoded

client_id=AgentBlueprint
&scope=api://AzureADTokenExchange/.default
&fmi_path=AgentIdentity
&client_assertion=TUAMI
&grant_type=client_credentials
```
Agent identity performs OBO with T1 + the user token Tc:
```
POST /oauth2/v2.0/token
Content-Type: application/x-www-form-urlencoded

client_id=AgentIdentity
&scope=https://resource.example.com/scope1
&client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer
&client_assertion={T1}
&grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer
&assertion={Tc(aud=AgentIdentity Blueprint, oid=User)}
&requested_token_use=on_behalf_of
```
Constraints [G23]: blueprints and child agent identities "can't initiate interactive `/authorize`
flows"; supported grants `client_credential`, `jwt-bearer`, `refresh_token`; child identities
can't take interactive consent (`AADSTS82014`) — delegated permissions are pre-authorized as
inheritable permissions on the blueprint; Tc must be audienced to the blueprint (else
`AADSTS50013`); permission inheritance "works only within tenant boundaries".

### 3. AWS AgentCore Identity OBO (VERBATIM [G24])

"On-behalf-of token exchange is built into the existing OAuth Credential Provider … Agent
developers never need to handle the inbound token or manage client secrets directly." Two modes:
```
"onBehalfOfTokenExchangeConfig": {
  "grantType": "TOKEN_EXCHANGE",
  "tokenExchangeGrantTypeConfig": {
    "actorTokenContent": "M2M",
    "actorTokenScopes": ["scope1", "scope2"]
  }
}
```
or `"grantType": "JWT_AUTHORIZATION_GRANT"` (RFC 7523 §2.1). AgentCore also supports Private Key
JWT client auth (RFC 7523 §2.2) and a workload access token that "contains both the identity of
the agent and the identity of the end user" to unlock the vault [G25].

### 4. Where the hosted model APIs stop

- Claude API (VERBATIM [G36]):
```json
{
  "type": "url",
  "url": "https://example-server.modelcontextprotocol.io/sse",
  "name": "example-mcp",
  "authorization_token": "YOUR_TOKEN"
}
```
  Your backend runs OAuth and refresh; the API only forwards the bearer [G36].
- OpenAI Responses `mcp` tool: `authorization` field, not stored, resend per request; approvals
  default on (`mcp_approval_request` / `mcp_approval_response`), `require_approval: "never"` opts
  out [G37].
- Architectural consequence (COMPOSED): the token vault / broker lives in *your* backend (or a
  managed platform); the model provider sees a short-lived bearer per call.

### 5. Gateway as token exchanger, not passthrough

- Kong `ai-mcp-oauth2` (VERBATIM config [G34]):
```yaml
_format_version: "3.0"
plugins:
  - name: ai-mcp-oauth2
    config:
      resource: https://api.example.com/mcp
      authorization_servers:
      - https://auth.example.com
      claim_to_header:
      - claim: sub
        header: X-User-Id
      - claim: email
        header: X-User-Email
```
  Default strips the access token before upstream; `config.passthrough_credentials` exists for
  upstreams that need the original; token exchange from 3.14 [G34].
- agentgateway `backendAuth.oauthTokenExchange` (VERBATIM [G29]):
```yaml
backendAuth:
  oauthTokenExchange:
    host: idp.example.com:443
    tokenEndpointPath: /oauth2/default/v1/token
    clientAuth:
      clientId: gateway-client
      clientSecret: $OAUTH_CLIENT_SECRET
      method: clientSecretBasic
    audiences:
    - upstream-api
    scopes:
    - read
```
  Modes: RFC 8693 (default), RFC 7523 JWT bearer, Entra OBO [G29].
- 2026-07-28 makes header-level policy possible: "Method and tool names travel in the
  `Mcp-Method` and `Mcp-Name` HTTP headers, so gateways can route and authorize on headers
  directly" [G7].

### 6. Cloudflare workers-oauth-provider 1.x (VERBATIM excerpt [G35])

```ts
const authorizationServer = new OAuthAuthorizationServer<Env>({
  issuer: 'https://auth.example.com',
  resources: ['https://mcp.example.com/mcp'],
  scopesSupported: ['mcp:read', 'mcp:write', 'offline_access'], // everything this server can grant
  clientIdMetadataDocumentEnabled: true,
});
```
```ts
export default new OAuthResourceServer<Env, AuthProps>({
  resourceMetadata: {
    resource: 'https://mcp.example.com/mcp',
    authorization_servers: ['https://auth.example.com'],
  },
  requiredScopes: ['mcp:read'], // needed for any access; clients request these first
  validateToken: (env) => env.AUTH_SERVER.validateToken,
  handler: {
    fetch(request, env, ctx) {
      // ctx.props: what completeAuthorization() stored. ctx.auth: the verified token.
      // Step-up: a 403 naming the missing scope, and the client re-authorizes for it.
      const needed = request.method === 'GET' ? ['mcp:read'] : ['mcp:read', 'mcp:write'];
      if (!needed.every((scope) => ctx.auth.scope.includes(scope))) return insufficientScope(ctx.auth, needed);
      return Response.json({ userId: ctx.props.userId });
    },
  },
});
```
Storage: "Tokens, codes and secrets are stored only as hashes; `props` are encrypted with a key
only the token holder can unwrap"; CIMD fetching requires the `global_fetch_strictly_public`
compatibility flag (SSRF guard) [G35].

### 7. MCP Python SDK v2 auth surface (release notes [G18])

"OAuth adds RFC 9207 issuer validation, the SEP-990 identity-assertion flow, and the
client-credentials extension." Known gaps: "DPoP proof binding (SEP-1932) and the
workload-identity `jwt-bearer` grant are not implemented". `FastMCP` → `MCPServer`; "At
2026-07-28 the server can no longer call the client, so tools return the question instead. A
`Resolve(fn)` parameter is filled by your function invisibly to the model"; Streamable HTTP
servers reject bodies over 4 MiB with HTTP 413; v1 pin `mcp>=1.28,<2` [G18].

### 8. Per-action authorization: AuthZEN (VERBATIM [G16])

```
POST /access/v1/evaluation HTTP/1.1
Host: pdp.example.com
Content-Type: application/json
Authorization: Bearer <myoauthtoken>
X-Request-ID: bfe9eb29-ab87-4ca3-be83-a1d5d8305716

{
  "subject": {
    "type": "user",
    "id": "alice@example.com"
  },
  "resource": {
    "type": "todo",
    "id": "1"
  },
  "action": {
    "name": "can_read"
  },
  "context": {
    "time": "1985-10-26T01:22-07:00"
  }
}
```
Response: `{ "decision": true }` [G16]. Placement (COMPOSED): the tool layer or MCP gateway is
the PEP; it sends subject = user (+ agent in `context`), resource/action = the concrete tool
call. This answers field.md's "OAuth says who, not whether" gap with a finished standard.

### 9. Transaction Tokens inside the tool backend (AIMS §10.5 [G12])

Access tokens "can typically be used with multiple transactions"; passing them between
microservices risks theft via "a log file or crash dump". Exchange for a transaction token that is
"bound to a specific transaction and cannot be used as an access token, with another transaction,
or within the same transaction with modified transaction details (e.g. change in transaction
amount)". Cross-domain: use identity chaining / ID-JAG / Txn-Token authorization grant [G12].

### 10. Database tools with identity-bound parameters (VERBATIM [G44])

```yaml
kind: tool
name: search_flights_by_user_id
type: postgres-sql
source: my-pg-instance
statement: |
  SELECT * FROM flights WHERE user_id = $1
parameters:
  - name: user_id
    type: string
    description: Auto-populated from Google login
    authServices:
      # Refer to one of the `authService` defined
      - name: my-google-auth
        # `sub` is the OIDC claim field for user ID
        field: sub
```
"Authenticated parameters … do not take input values in request bodies like other parameters"
[G44]. This is the answer to kernl's "values that shouldn't be chosen by the LLM" critique
(field.md [S27]).

RLS for multi-tenancy (COMPOSED, based on Postgres semantics [G51]):
```sql
CREATE ROLE agent_ro NOLOGIN;                        -- no BYPASSRLS, not owner
GRANT SELECT ON orders TO agent_ro;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;         -- owner is also subject
CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
-- per request, set by the tool layer from the verified token, never by the model:
BEGIN;
SET LOCAL ROLE agent_ro;
SELECT set_config('app.tenant_id', $1, true);        -- is_local=true: this transaction only
SET LOCAL statement_timeout = '5s';
-- ... the tool's fixed, parameterized query ...
COMMIT;
```
Caveat (inference from [G51], verify before print): `set_config` "corresponds to the SQL command
SET"; if the model can send arbitrary SQL through the same connection, it can call `set_config`
itself and switch tenant. GUC-based RLS is only a boundary when the model cannot author SQL on
that session.

### 11. Webhooks and event triggers (VERBATIM [G48])

```
webhook-id: msg_2KWPBgLlAfxdpx2AI54pPJ85f4W
webhook-timestamp: 1674087231
webhook-signature: v1,K5oZfzN95Z9UVu1EsfQmfVNQhnkZ2pj9o9NDN/H/pI4= v1a,hnO3f9T8Ytu9HwrXslvumlUpqtNVqkhqw/enGzPCXe5BdqzCInXqYXFymVJaA7AZdpXwVLPo3mNl8EM+m7TBAg==
```
`v1` = HMAC-SHA256, `v1a` = ed25519; multiple space-separated signatures allow key rotation;
check `webhook-timestamp` tolerance against replay; "Use the `webhook-id` header as an idempotency
key … (e.g. save the IDs in redis for 5 minutes)" [G48]. MCP itself has no push-to-agent webhook
yet: the 2026-08-22 roadmap lists "server-initiated events (webhooks and channels, so clients
aren't left polling for results)" as work of the Triggers & Events WG [G8].

### 12. Idempotency and retries

- Stripe (VERBATIM [G49]): "Idempotency keys are up to 255 characters long"; keys pruned "after
  they're at least 24 hours old"; replays return the saved result "including `500` errors";
  parameters are compared and mismatches error; results are saved only after endpoint execution
  begins.
- Inngest: event `id` acts as idempotency key "over a 24 hour period"; ignored by debouncing,
  batching and paused functions [G47].
- Temporal: "if an activity fails part-way through it is restarted from the beginning" (Pydantic
  AI docs) [G45]; "You should always make your business logic Activities idempotent … Activities
  may be retried" [G46]. Pydantic AI routes "model requests, tool calls, and MCP server
  communication" through activities; durability exists only inside a workflow run [G45].
  Pydantic AI lists 7 durable backends: Temporal, DBOS, Prefect, Restate, AWS Lambda (co-
  maintained), Kitaru, Airflow [G45].
- The IETF `Idempotency-Key` header draft is **expired** (-07) — cite Stripe's behaviour as de
  facto, not an RFC [G10].

### 13. Rate limits (VERBATIM [G50])

```
RateLimit-Policy: "burst";q=100;w=60,"daily";q=1000;w=86400
RateLimit: "default";r=50;t=30
```
"If a response contains both the RateLimit and Retry-After fields, the Retry-After field MUST
take precedence" [G50]. Still a draft (-11). Auth0 OBO exchanges have their own limit: 30 RPS by
default, liftable to the tenant's Authentication API ceiling with the AI Agents add-on [G27].

### 14. Human-in-the-loop, corrected picture

- MCP URL-mode elicitation over MRTR is live in clients: Claude Code added it "on 2026-07-28
  protocol connections" in 2.1.281 [G52].
- AIMS: CIBA is the OAuth-native HITL, but "CIBA itself only accounts for client initiation,
  which doesn't map well to cases that envision the need for User confirmation to occur
  mid-execution" [G12].
- RFC 10027: cross-device flows (CIBA, device grant) need risk assessment and proximity/binding
  mitigations [G14].
- Open SEP-2643 "Structured Authorization Denials" composes URL-mode elicitation, Tasks, OAuth
  scopes, RAR and single-transaction credentials into one denial envelope [G20].

## Numbers

| Number | Condition | Source |
|---|---|---|
| 5/12 | big remote MCP servers advertising `client_id_metadata_document_supported: true` (Linear, Notion, Canva, Sentry, Cloudflare) | own probe 2026-09-30 [G43] |
| 5/12 | advertising `authorization_response_iss_parameter_supported: true` (Linear, GitHub, Figma, Sentry, Cloudflare) | [G43] |
| 4/12 | still listing PKCE `plain` (Supabase, Notion, Atlassian, Canva) | [G43] |
| 10/12 | exposing a DCR `registration_endpoint` (all but GitHub, Asana) | [G43] |
| 6/12 | advertising `urn:ietf:params:oauth:grant-profile:id-jag` (Supabase, Linear, Notion, Asana, Figma, Canva) | [G43] |
| 1/12 | no RFC 9728 PRM and no `resource_metadata` in the 401 (Atlassian `/v1/mcp`) | [G43] |
| 300 s / 86400 s | `expires_in` of ID-JAG / MCP access token in EMA examples (illustrative) | [G4] |
| 30 RPS | Auth0 OBO token-exchange default limit | [G27] |
| 5 hops / 4 `act` levels | Auth0 max delegation depth | [G26] |
| 12 months | MCP minimum deprecation window | [G1] |
| 4 MiB | MCP Python SDK v2 Streamable HTTP body limit (HTTP 413) | [G18] |
| 1,344 | AI integration apps found across studied orgs; dozens of leaked keys (Composio, Nango, Tavily, Exa, Arcade, LlamaIndex…) | Cyera 2026-08-13 [G28] |
| CVSS 8.0 | CVE-2026-14540 SSRF in Google MCP Toolbox (reserved 2026-07-03, published 2026-07-31) | [G39] |
| 300+ / 60+ | agentgateway contributors / organizations | AAIF 2026-06-04 [G30] |
| 5 tokens, 4 for deletion; 2 concurrent in 70 s | Storm-3168 destruction principal | Microsoft 2026-09-25 [G38] |
| 255 chars / 24 h | Stripe idempotency key length / pruning age | [G49] |
| 24 h | Inngest event-id idempotency window | [G47] |
| 848 pts | HN thread on General Analysis Supabase MCP write-up, 2025-07-08 | [G31] |

## Pitfalls, limits, criticism

- **Platform key = master key.** Cyera showed leaked integration-platform keys returning live
  provider access and refresh tokens; revoking the platform key does not revoke the stolen
  provider tokens [G28]. Scope platform keys per environment, restrict IPs where possible, and
  plan provider-side revocation.
- **Read-only is a role property, not a transaction flag** (see claim 9) [G51]; Supabase's
  read-only mode uses a read-only Postgres user [G42]. Supabase still tells users the server
  "operates under developer permissions, so you should not give it to your customers or end
  users" [G42].
- **Wrapping results in "don't follow instructions" text is a mitigation, not a boundary.**
  Supabase does it ("wraps SQL results with additional instructions to discourage LLMs") and
  still recommends manual approval and not connecting to production [G42].
- **GUC-based tenant RLS breaks under free-form SQL** (inference, see Mechanics §10) [G51].
- **SSRF lives in integration servers.** CVE-2026-14540: Toolbox's HTTP client had no
  `CheckRedirect` policy or target-IP validation, so a crafted path parameter reached internal
  endpoints; fix added "DNS-rebinding/TOCTOU protection, IP-range allow/block lists" [G39].
  CIMD fetchers have the same class of risk (Cloudflare gates it behind
  `global_fetch_strictly_public`) [G35].
- **Delegation with no human present has no interactive consent.** Entra agent identities can't
  do `/authorize`; consent must be pre-granted on the blueprint [G23]. EMA removes per-server
  consent screens by design [G6]. Result: admin policy, not the user, is the consent point.
- **EMA/ID-JAG only covers OAuth apps inside the IdP.** Nango: "It only works over OAuth"; "It
  controls who can act, not what they do" [G53].
- **Client-side OAuth bugs are real.** Claude Code changelog, 2026: redirect URI switched to
  `127.0.0.1` from `localhost` for strict ASes (2.1.229); CIMD redirect mismatch with Linear
  (2.1.243); registration reuse/deletion races (2.1.271); `insufficient_scope` misreported as
  expired sign-in (2.1.274); OAuth token refresh invalidating the prompt cache (2.1.248) [G52].
  2026-07-28 also added `application_type` in DCR because ASes rejected `localhost` redirects
  [G7].
- **Metadata drift in production** — `plain` PKCE still advertised by 4/12 servers, 7/12 omit the
  `iss` flag, Atlassian's remote server returns a 401 without `resource_metadata` [G43].
- **Local UI approval ≠ authorization** (AIMS MUST NOT) [G12]; **cross-device consent phishing**
  targets CIBA/device flow approvals [G14].
- **Five Eyes guidance (2026-05-01):** give each agent "a verified, cryptographically secured
  identity" with short-lived credentials; which actions need human sign-off "is a job for system
  designers, not the agent" [G40].

## What changed in the last 6 months (items none of the three notes caught)

- EMA Stable 2026-06-18 with Okta as sole launch IdP and Claude/Claude Code/Cowork + VS Code as
  clients [G6].
- MCP Python SDK v2 (2026-07-28): `MCPServer`, RFC 9207, SEP-990 (EMA) client flow,
  client-credentials; no DPoP yet [G18]. TS SDK 2.x in parallel [G19].
- MCP roadmap 2026-08-22 makes "Agent identity and enterprise-ready security" a top priority
  (DPoP, WIF, ID-JAG, token exchange) [G8].
- `draft-ietf-wimse-aims-00` adopted (2026-09-15), replacing individual draft-klrc-aiagent-auth
  [G10][G12].
- Identity chaining approved → RFC Editor queue (2026-07) [G11].
- RFC 10027 cross-device BCP and RFC 10017 browser-apps BCP (2026-08) [G15].
- OAuth 2.1 -16, CIMD -02 [G10].
- Entra Agent ID GA; Agent 365 licensing for security features; agent registry converging into
  Agent 365 [G21][G22].
- AgentCore Identity OBO with RFC 8693 or RFC 7523 modes [G24].
- Gateways gained token exchange: agentgateway (2026-07-12), Kong 3.14 [G29][G34]; agentgateway
  joined AAIF; A2A moved under AAIF [G30][G31].
- Cloudflare workers-oauth-provider 1.0 (split AS/RS, CIMD, EMA experimental) [G35].
- Consolidation: Arcade–Smithery (2026-08-05) [G32].
- Incidents/disclosures: Cyera platform-key research (2026-08-13) [G28]; CVE-2026-14540 [G39];
  Storm-3168 [G38]; NSA MCP CSI (May 2026) and Five Eyes agentic guidance (May 2026) [G31][G40].
- Clients: Claude Code added URL-mode elicitation for 2026-07-28 connections (2.1.281, late
  Sept 2026) [G52]; Claude API beta `mcp-client-2026-09-15` pins server tool lists [G36].

## Diagram candidates

1. **EMA / ID-JAG two-hop** — Browser, MCP Client, Enterprise IdP (Okta), MCP AS, MCP RS. Arrows:
   SSO → ID token; token-exchange (`requested_token_type=…:id-jag`, `audience`, `resource`) →
   ID-JAG (`typ oauth-id-jag+jwt`, 300 s); jwt-bearer → access token (aud = resource); loop of
   MCP calls. State: "IdP policy evaluated here" [G4].
2. **Three OBO dialects side by side** — Entra (blueprint → `fmi_path` → jwt-bearer +
   `requested_token_use=on_behalf_of`), AgentCore (8693 or 7523 chosen per credential provider),
   Auth0 (8693, nested `act`, 5-hop cap) [G23][G24][G26].
3. **Gateway token exchange vs passthrough** — Client → Gateway (validate aud, strip token,
   AuthZEN check) → IdP token endpoint (8693) → upstream with new aud; dashed forbidden arrow
   "forward client token" [G29][G34][G16].
4. **AuthZEN PEP/PDP around a tool call** — Agent → tool layer (PEP) → PDP
   `/access/v1/evaluation` {subject, resource, action, context} → decision → execute/deny [G16].
5. **Transaction token inside tool backend** — edge exchanges access token → Txn-Token (bound to
   txn id + amount) → microservices; attacker copy from log fails on a modified amount [G12].
6. **Identity-bound SQL tool** — LLM supplies `name`; Toolbox fills `user_id` from OIDC `sub`;
   Postgres role without BYPASSRLS; no arrow from LLM to `user_id` [G44][G51].
7. **Platform-key blast radius (Cyera)** — leaked platform key → read call → raw Gmail/GitHub/
   CircleCI tokens → attacker uses providers directly; "rotate platform key" arrow does not cut
   the provider arrows [G28].
8. **Webhook ingestion to durable agent run** — Provider → verify `webhook-signature` + timestamp
   window → dedupe on `webhook-id` → start workflow (Temporal/Inngest) → activities with
   Idempotency-Key → external API [G48][G49][G46][G47].
9. **Stateless MCP behind a load balancer** — 2025 (session affinity on `Mcp-Session-Id`, sticky
   pods) vs 2026-07-28 (round-robin, `_meta` per request, server-minted handle in tool args)
   [G1][G7] (field.md [S23]).
10. **HITL decision tree** — in-session confirm (MRTR form) → sensitive/third-party (URL-mode
    elicitation) → out-of-band high-risk (CIBA with binding_message + proximity) → each must end
    in an AS-issued grant [G12][G14][G1].
11. **Standards maturity ladder** — RFC (8693, 9728, 9207, 9396, 9449, 9700, 10027) → RFC Ed
    Queue (identity chaining) → WG drafts (OAuth 2.1-16, CIMD-02, ID-JAG-04, Txn-Tokens-11,
    AIMS-00) → individual/expired (WSO2 OBO) [G10][G13].

Chart candidates (real data):
- **MCP OAuth metadata adoption, 12 servers, probed 2026-09-30** — grouped bars: CIMD 5, `iss`
  flag 5, DCR 10, PKCE `plain` 4, ID-JAG 6, PRM missing 1 (n = 12) [G43].
- **Draft revision timeline** — ID-JAG -04 (2026-05-21), CIMD -02 (2026-07-06), chaining -17
  (2026-07-19), Txn-Tokens -11 (2026-08-21), OAuth 2.1 -16 (2026-09-03), AIMS -00 (2026-09-15)
  [G10][G11].

## Glossary

- **EMA**: MCP extension (Stable 2026-06-18) that profiles ID-JAG so the enterprise IdP grants MCP
  server access without per-server consent.
- **ID-JAG**: Identity Assertion JWT Authorization Grant — IdP-issued JWT (`typ oauth-id-jag+jwt`)
  obtained by token exchange from an SSO assertion and redeemed via RFC 7523.
- **Identity chaining**: IETF framework for carrying identity across trust domains (token exchange
  → JWT grant → jwt-bearer); approved, in RFC Editor queue.
- **Transaction Token (Txn-Token)**: short-lived, transaction-bound token replacing the access
  token inside a service's internal call chain.
- **AIMS**: `draft-ietf-wimse-aims`, WIMSE WG best-practice document for agent authn/authz.
- **AuthZEN**: OpenID Authorization API 1.0 — standard PEP→PDP decision API.
- **PEP / PDP**: policy enforcement point (the tool layer/gateway) / policy decision point (the
  policy engine).
- **Agent identity blueprint (Entra)**: parent template from which agent identities inherit
  credentials and pre-consented permissions.
- **`fmi_path`**: Entra parameter naming the child agent identity a blueprint acts for.
- **Authenticated parameter (MCP Toolbox)**: tool parameter filled from a verified token claim,
  never from model input.
- **CDCP**: Cross-Device Consent Phishing (RFC 10027) — tricking a user into approving a
  device/CIBA flow.
- **Server-minted handle**: 2026-07-28 replacement for session state — an opaque id returned by
  a tool and passed back as an argument.
- **AAIF**: Agentic AI Foundation (Linux Foundation) hosting MCP, agentgateway and, since Aug
  2026, A2A.
- **WIF (MCP SEP-1933)**: proposed workload identity federation — MCP clients authenticate with
  platform-issued workload JWTs (Kubernetes, SPIFFE) instead of registered secrets.

## Unverified / open questions

- **NSA CSI "MCP: Security Design Considerations for AI-Driven Automation"** — existence confirmed
  by HN listing 2026-05-26 [G31]; PDF returned 403 to curl and WebFetch. The phrase MCP "cannot
  enforce these security principles at the protocol level" (field.md via Arcade) remains
  second-hand.
- **Auth0 for AI Agents GA date, AgentCore GA date** — not re-verified (WebSearch exhausted;
  AgentCore doc-history page 404 as .md).
- **Composio's response to Cyera** — the article has none; whether Composio changed its API to
  stop returning raw tokens is unknown.
- **Stytch/Pipedream deal closing** — only announcements (2025-10-30, 2025-11-19) verified [G31].
- **Atlassian EMA** — MCP blog lists Atlassian as EMA-capable [G6], but the AS metadata at
  `mcp.atlassian.com` did not advertise the id-jag profile on 2026-09-30 [G43]; it may live on a
  different AS/endpoint.
- **GUC-based RLS bypass via `set_config`** — inferred from Postgres docs [G51]; test on the
  target stack before printing as fact.
- **Kong 3.14 release date**, **OWASP Agentic Top 10 item names** — not fetched (cross-link to
  ch.16 instead).
- **Restate** — only positioning from llms.txt ("Build innately resilient backends and AI
  agents") [G55]; no agent-specific mechanics extracted.
- **Open MCP SEPs to watch** (not spec): SEP-1932 DPoP, SEP-1933 WIF, SEP-2643 Structured
  Authorization Denials, SEP-2343 elicitation requires authorization, SEP-2817 AI Invocation
  Audit Context in `_meta`, SEP-1913 Trust and Sensitivity Annotations, SEP-3149 require
  `token_endpoint_auth_methods_supported` in CIMD [G20].

## Sources

- [G1] "Key Changes" (changelog), MCP spec 2026-07-28, modelcontextprotocol/modelcontextprotocol, 2026-07-28, https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/main/docs/specification/2026-07-28/changelog.mdx, accessed 2026-09-30.
- [G2] "Authorization", MCP spec 2026-07-28, 2026-07-28, https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/main/docs/specification/2026-07-28/basic/authorization/index.mdx, accessed 2026-09-30.
- [G3] GitHub Releases/Tags API for modelcontextprotocol/modelcontextprotocol (2026-07-28 at 2026-07-28T16:47:49Z; RC 2026-05-29) and schema/2026-07-28/schema.ts, https://api.github.com/repos/modelcontextprotocol/modelcontextprotocol/releases, accessed 2026-09-30.
- [G4] "Enterprise-Managed Authorization" (Status: Stable), MCP ext-auth, commits 2026-06-17/18, https://github.com/modelcontextprotocol/ext-auth/blob/main/specification/stable/enterprise-managed-authorization.mdx, accessed 2026-09-30.
- [G5] ext-auth repository tree and commit log (stable/ vs draft/), https://github.com/modelcontextprotocol/ext-auth, accessed 2026-09-30.
- [G6] "Enterprise-Managed Authorization: Zero-touch OAuth for MCP", MCP blog, 2026-06-18, https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/main/blog/content/posts/enterprise-managed-auth/index.md, accessed 2026-09-30.
- [G7] "The 2026-07-28 Specification", D. Soria Parra & D. Delimarsky, MCP blog, 2026-07-28, https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/main/blog/content/posts/2026-07-28-spec-ga/index.md, accessed 2026-09-30.
- [G8] MCP roadmap post, MCP blog, 2026-08-22, https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/main/blog/content/posts/2026-08-22-mcp-roadmap.md, accessed 2026-09-30.
- [G9] "Evolving OAuth Client Registration in the Model Context Protocol", Paul Carleton, MCP blog, 2025-08-22, https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/main/blog/content/posts/client_registration/index.md, accessed 2026-09-30.
- [G10] IETF Datatracker API document records (rev, time, state) for draft-ietf-oauth-identity-chaining, -identity-assertion-authz-grant, -client-id-metadata-document, -v2-1, -transaction-tokens, -attestation-based-client-auth, -first-party-apps, draft-ietf-wimse-arch, -aims, draft-ietf-httpapi-idempotency-key-header, -ratelimit-headers, draft-oauth-ai-agents-on-behalf-of-user, draft-mcguinness-oauth-actor-profile, draft-klrc-aiagent-auth, https://datatracker.ietf.org/api/v1/doc/document/<name>/, accessed 2026-09-30.
- [G11] draft-ietf-oauth-identity-chaining history, IETF Datatracker, events 2026-07-08…2026-08-21, https://datatracker.ietf.org/doc/draft-ietf-oauth-identity-chaining/history/, accessed 2026-09-30.
- [G12] draft-ietf-wimse-aims-00 "AI Identity Management System", Kasselman, Lombardo, Rosomakho, Campbell, Steele, Parecki, 2026-09-15, https://www.ietf.org/archive/id/draft-ietf-wimse-aims-00.txt, accessed 2026-09-30.
- [G13] RFC Editor metadata (JSON) for RFC 6749, 7523, 7591, 7636, 8414, 8628, 8693, 8707, 9068, 9207, 9396, 9449, 9700, 9728, https://www.rfc-editor.org/rfc/rfcNNNN.json, accessed 2026-09-30.
- [G14] RFC 10027 "Best Current Practice for Security of Cross-Device Flows" (BCP 247), Kasselman, Fett, Skokan, August 2026, https://www.rfc-editor.org/rfc/rfc10027.txt, accessed 2026-09-30.
- [G15] OAuth WG documents page (RFC 10017, RFC 10027 dated 2026-08; chaining-17 status), https://datatracker.ietf.org/wg/oauth/documents/, accessed 2026-09-30.
- [G16] "Authorization API 1.0" (Final), OpenID AuthZEN WG, Gazitt, Brossard, Tulshibagwale, 2026-01-11, https://openid.net/specs/authorization-api-1_0.html, accessed 2026-09-30.
- [G17] "OpenID Connect CIBA Flow – Core 1.0" (Final), OpenID Foundation, 2021-09-01, https://openid.net/specs/openid-client-initiated-backchannel-authentication-core-1_0.html, accessed 2026-09-30.
- [G18] "MCP Python SDK v2 Stable Release" (v2.0.0 release notes), modelcontextprotocol/python-sdk, 2026-07-28, https://github.com/modelcontextprotocol/python-sdk/releases/tag/v2.0.0, accessed 2026-09-30.
- [G19] GitHub releases: python-sdk (v2.2.0 2026-09-07), typescript-sdk (2.2.0 2026-09-28), PrefectHQ/fastmcp (v4.0.10 2026-09-25), docker/mcp-gateway (v0.44.1 2026-09-23), https://api.github.com/repos/<repo>/releases, accessed 2026-09-30.
- [G20] MCP SEP PRs #1932 (DPoP), #1933 (Workload Identity Federation), #2643 (Structured Authorization Denials) and GitHub search of open auth SEPs, https://github.com/modelcontextprotocol/modelcontextprotocol/pull/1933, accessed 2026-09-30.
- [G21] "What is Microsoft Entra Agent ID?", Microsoft Learn, ms.date 2026-04-14, updated 2026-08-13, https://learn.microsoft.com/en-us/entra/agent-id/what-is-microsoft-entra-agent-id, accessed 2026-09-30.
- [G22] "What's new in Microsoft Entra Agent ID", Microsoft Learn, ms.date 2026-05-01, https://raw.githubusercontent.com/MicrosoftDocs/entra-docs/main/docs/agent-id/whats-new-agent-id.md, accessed 2026-09-30.
- [G23] "Agent OAuth flows: On behalf of flow", Microsoft Learn, ms.date 2025-11-04, https://raw.githubusercontent.com/MicrosoftDocs/entra-docs/main/docs/agent-id/agent-on-behalf-of-oauth-flow.md, accessed 2026-09-30.
- [G24] "On-behalf-of token exchange with AgentCore Identity", AWS docs, undated, https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/on-behalf-of-token-exchange.md, accessed 2026-09-30.
- [G25] Amazon Bedrock AgentCore devguide llms.txt (Identity sections), https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/llms.txt, accessed 2026-09-30.
- [G26] "Agent Identity in Tokens" (Agent as Principal, Early Access), Auth0 docs, undated, https://auth0.com/docs/ai-agents-mcp/agent-as-principal/agent-identity-in-tokens.md, accessed 2026-09-30.
- [G27] "On-Behalf-Of Token Exchange", Auth0 docs, undated, https://auth0.com/docs/secure/call-apis-on-users-behalf/on-behalf-of-token-exchange.md, accessed 2026-09-30.
- [G28] "The hidden attack surface of agentic AI: securing AI agent integration platforms", Assaf Morag, Cyera Research, 2026-08-13, https://www.cyera.com/research/the-hidden-attack-surface-of-agentic-ai-securing-ai-agent-integration-platforms, accessed 2026-09-30.
- [G29] "agentgateway adds token exchange, JWT-assertion, and Entra OBO", agentgateway blog, 2026-07-12 (per URL; HN 2026-07-13), https://agentgateway.dev/blog/2026-07-12-agentgateway-token-exchange-jwt-assertion-entra-obo/, accessed 2026-09-30.
- [G30] "agentgateway Joins AAIF as an Open Gateway for Agentic AI Infrastructure", AAIF blog, 2026-06-04, https://aaif.io/blog/agentgateway-joins-aaif-as-an-open-gateway-for-agentic-ai-infrastructure/, accessed 2026-09-30.
- [G31] Hacker News Algolia API listings (story ids 46207425 AAIF 2025-12-09; 49353146 A2A→AAIF 2026-08-18; 45765090 Twilio–Stytch 2025-10-30; 45987220 Workday–Pipedream 2025-11-19; 44502318 Supabase 848 pts 2025-07-08; 44303882 2025-06-17; 44289295 lethal trifecta 2025-06-16; 44314434 Asana 2025-06-19; 48280824 NSA CSI 2026-05-26; 47499436 Claude Code CIMD 2026-03-24; 48203353 Istio 1.30 2026-05-20; 46263271 OWASP Agentic Top 10), https://hn.algolia.com/api/v1/search, accessed 2026-09-30.
- [G32] "Smithery joins Arcade", Arcade.dev blog, 2026-08-05, https://www.arcade.dev/blog/smithery-joins-arcade/, accessed 2026-09-30.
- [G33] docker/mcp-gateway README (Docker Desktop 4.59+), https://raw.githubusercontent.com/docker/mcp-gateway/main/README.md, accessed 2026-09-30.
- [G34] "AI MCP OAuth2" plugin, Kong developer docs, undated, https://developer.konghq.com/plugins/ai-mcp-oauth2/, accessed 2026-09-30.
- [G35] cloudflare/workers-oauth-provider README and releases (v1.0.0 2026-09-24, v1.2.1 2026-09-28), https://github.com/cloudflare/workers-oauth-provider, accessed 2026-09-30.
- [G36] "MCP connector", Claude API docs, undated, https://platform.claude.com/docs/en/agents-and-tools/mcp-connector.md, accessed 2026-09-30.
- [G37] "Remote MCP servers / connectors" guide, OpenAI API docs, undated, https://developers.openai.com/api/docs/guides/tools-connectors-mcp.md, accessed 2026-09-30.
- [G38] "Storm-3168: Agentic-driven cloud attacks using compromised service principals", Microsoft Security Blog, 2026-09-25, https://www.microsoft.com/en-us/security/blog/2026/09/25/storm-3168-agentic-driven-cloud-attacks-using-compromised-service-principals/, accessed 2026-09-30.
- [G39] "I found an SSRF in Google's official MCP Toolbox (CVE-2026-14540)", independent researcher write-up (HN 2026-09-28), https://anas-security-portfolio.vercel.app/google-mcp-ssrf.html, accessed 2026-09-30.
- [G40] "CISA, NSA & Five Eyes publish guide on how to safely deploy AI agents" (guidance "Careful Adoption of Agentic AI Services"), CyberScoop, 2026-05-01, https://cyberscoop.com/cisa-nsa-five-eyes-guidance-secure-deployment-ai-agents/, accessed 2026-09-30.
- [G41] supabase-community/supabase-mcp README and releases (v0.13.0 2026-09-17), https://github.com/supabase-community/supabase-mcp, accessed 2026-09-30.
- [G42] "Model context protocol (MCP)" security section, Supabase docs, undated, https://supabase.com/docs/guides/ai-tools/mcp, accessed 2026-09-30.
- [G43] Own live probe (COMPOSED measurement): unauthenticated `POST tools/list` to 12 remote MCP servers, then PRM and AS metadata fetch (Supabase, Linear, Notion, Atlassian, GitHub, Stripe, Asana, Figma, Canva, Sentry, Cloudflare, Vercel), run 2026-09-30 ~16:55 UTC; script `scratchpad/ch15gap/probe.py`.
- [G44] googleapis/mcp-toolbox README, "Authentication" and "Tools → Authenticated Parameters" docs (v1.13.1 2026-09-25), https://github.com/googleapis/mcp-toolbox, accessed 2026-09-30.
- [G45] "Durable Execution" overview and "Temporal" pages, Pydantic AI docs (v2.52.0 2026-09-30), https://pydantic.dev/docs/ai/capabilities/durable_execution/temporal/, accessed 2026-09-30.
- [G46] "Activity Definition" (Idempotency), Temporal docs, undated, https://docs.temporal.io/activity-definition.md, accessed 2026-09-30.
- [G47] "Handling idempotency", Inngest docs, undated, https://www.inngest.com/docs-markdown/guides/handling-idempotency, accessed 2026-09-30.
- [G48] Standard Webhooks specification, standard-webhooks/standard-webhooks, https://raw.githubusercontent.com/standard-webhooks/standard-webhooks/main/spec/standard-webhooks.md, accessed 2026-09-30.
- [G49] "Idempotent requests", Stripe API reference, undated, https://docs.stripe.com/api/idempotent_requests, accessed 2026-09-30.
- [G50] draft-ietf-httpapi-ratelimit-headers-11, IETF HTTPAPI WG, 2026-05-23, https://www.ietf.org/archive/id/draft-ietf-httpapi-ratelimit-headers-11.txt, accessed 2026-09-30.
- [G51] PostgreSQL (current) docs: "Client Connection Defaults", "SET TRANSACTION", "Row Security Policies", "System Administration Functions", https://www.postgresql.org/docs/current/runtime-config-client.html (and sql-set-transaction.html, ddl-rowsecurity.html, functions-admin.html), accessed 2026-09-30.
- [G52] Claude Code CHANGELOG.md (versions 2.1.229–2.1.285, Jul–Sep 2026), https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md, accessed 2026-09-30.
- [G53] "ID-JAG helps AI agents authenticate", Sapnesh Naik, Nango blog, 2026-06-26, https://nango.dev/blog/id-jag-agent-authentication/, accessed 2026-09-30.
- [G54] authgent README (EMA launch-partner metadata checks), https://github.com/authgent/authgent, accessed 2026-09-30.
- [G55] Restate docs llms.txt, https://docs.restate.dev/llms.txt, accessed 2026-09-30.
