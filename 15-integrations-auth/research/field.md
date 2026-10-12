# 15. Интеграции и авторизация агентов — field reports notes

Lens: what actually bites in production, per practitioner threads (HN, GitHub, Habr, vendor
engineering blogs) and primary specs. Cross-links: MCP protocol basics → ch.05; tool schema
design → ch.03; multi-agent trust boundaries → ch.13; security threat models beyond auth →
ch.16; agent-facing eval of auth flows → ch.17.

Methodology note: WebSearch was unavailable for this research session (session budget
exhausted before this chapter's queries ran) and direct `reddit.com` access (curl and WebFetch)
returned a network-policy block in this environment — r/mcp, r/ClaudeAI etc. could not be read
despite several mirror attempts. Field material below leans on Hacker News (via the public
Algolia API), GitHub, and Habr (whose RSS search endpoint worked) instead, plus primary specs
fetched as raw markdown/HTML. This is disclosed rather than papered over — see "Unverified."

## TL;DR

- MCP authorization (spec dated **2025-11-25**, current stable) is OAuth 2.1 + RFC 9728
  (Protected Resource Metadata, mandatory for MCP servers) + RFC 8414/OIDC Discovery + either
  Dynamic Client Registration (RFC 7591) or the newer **Client ID Metadata Documents (CIMD)**
  draft — CIMD is now the *preferred* client-identity mechanism, DCR is now optional/fallback [S1].
- **Enterprise-Managed Authorization (EMA)**, aka Cross-App Access (XAA), graduated to
  **Stable** in the MCP `ext-auth` extensions repo. It profiles the IETF **Identity Assertion
  JWT Authorization Grant (ID-JAG)** draft: SSO ID token → Token Exchange (RFC 8693) at the
  enterprise IdP → ID-JAG → JWT Authorization Grant (RFC 7523) at the MCP server's AS → MCP
  access token, with **zero interactive per-server consent** [S1][S4][S7].
- A **draft** MCP extension for OAuth 2.1 **Client Credentials** (machine-to-machine, no user
  in the loop, pre-registered creds, JWT or client-secret auth) now exists alongside the
  user-delegated flow — this is the spec-level answer to "agent's own identity vs on behalf of
  a user" [S5].
- RFC 8693 Token Exchange is the mechanism underneath almost every "agent acts as/for a user"
  pattern in 2026: it defines `subject_token` (who is being represented) and optional
  `actor_token` (who/what is actually wielding the token) — giving a standard shape for both
  **impersonation** and **delegation** chains, with an `act` claim recording the chain [S6].
- Field consensus (HN, Habr, vendor blogs) in 2026: **EMA/DCR solve *connection-time*
  authorization, not *action-time* authorization.** A stolen or hallucinated tool call executes
  fine with a token that was legitimately issued minutes earlier — this is now called out
  explicitly by Arcade.dev and echoed by NSA guidance cited in that post [S11].
- **Token vaults are the default architecture**, not an edge case: Auth0 Token Vault, AWS
  AgentCore Identity (credential providers), Stytch Connected Apps, WorkOS, Nango, Arcade,
  Composio, and multiple 2026 open-source Show-HNs (Agent Vault by Infisical, credwrap,
  Tenuo) all converge on "agent never sees the raw secret, a proxy/broker injects it" [S14][S17][S30][S32].
- Real incidents cited across 2025–2026 sources: **Supabase MCP** SQL-injection-via-ticket that
  leaked integration tokens through an over-privileged `service_role` (confused deputy),
  **Asana MCP** cross-tenant leakage, **GitHub MCP** private-repo enumeration via a malicious
  public issue comment, **CVE-2025-6514** in `mcp-remote` (RCE, 558k+ downloads), and
  Microsoft's **Storm-3168** campaign (Sept 2026) abusing a service principal whose secret had
  leaked in a public GitHub issue's edit history [S12][S24].
- Confirmed field failure mode: **restricting the model's credentials is not the same as
  restricting the system's.** A Habr practitioner removed CRM write creds from the LLM but left
  them on the n8n orchestration node — the CRM still got mutated because the *deterministic*
  layer, not the model, held write authority [S20].
- Signature/pattern-based command interception is weak in practice: one 16-day field study
  logged 853 bash commands from an agent and its guard caught **1 real threat out of 853**
  (0.12%), with 59 false positives, because "you can't distinguish execution from mention using
  signatures — you need semantic understanding" [S21].
- MCP servers are frequently unauthenticated in the wild: Composio's write-up cites **492 MCP
  servers found exposed with no authentication at all**, plus static-OAuth-client-ID cookie
  replay and `sessionId`-in-URL session handling [S12].
- Enterprise MCP gateways in production (Sberbank/SberTech's Platform V Synapse) combine mTLS,
  JWT auth at tool/JSON-RPC-method granularity, External Authorization delegation, Envoy rate
  limiting, and session-affinity routing (`mcp-session-id` header) across multi-pod deployments
  — i.e. a full service-mesh problem, not just an OAuth problem [S23].
- **MCP elicitation** now has a spec-level split between **form mode** (structured data,
  exposed to the client) and **URL mode** (out-of-band navigation for anything sensitive) —
  servers **MUST NOT** collect passwords/API keys/tokens/payment data via form mode; that is the
  spec's built-in human-in-the-loop / step-up mechanism [S2].
- WIMSE (Workload Identity in Multi-System Environments, IETF WG) is the emerging non-human/
  workload-identity layer that SPIFFE-flavored agent identity is converging toward; its
  architecture draft reached version **-08 on 2026-07-06** [S8].
- Practitioner critiques of MCP's auth model as "too coarse" recur: OAuth scopes like
  `mail.send` can't distinguish a legitimate user intent from an injected instruction, and even
  RFC 9396 Rich Authorization Requests don't solve *intent* verification — this is presented as
  an architectural limit, not a bug to patch [S11].

## Current state and versions

- **MCP spec**: stable dated version is **2025-11-25** (verified live against
  `github.com/modelcontextprotocol/modelcontextprotocol`); this is the version that shipped
  CIMD support and referenced the `ext-auth` extensions repo. A `2026-07-28` schema path exists
  in the repo but the authorization doc under that date 404s as of 2026-09-30 — treat 2025-11-25
  as current for authorization specifically [S1] (verified via raw GitHub fetch, accessed 2026-09-30).
- **MCP `ext-auth` extensions repo** (separate repo, independently versioned): one **Stable**
  extension — Enterprise-Managed Authorization — and one **Draft** extension — OAuth Client
  Credentials [S3].
- **ID-JAG draft**: `draft-ietf-oauth-identity-assertion-authz-grant-04`, dated **2026-05-21**,
  authors Aaron Parecki, Karl McGuinness, Brian Campbell [S7].
- **WIMSE architecture**: `draft-ietf-wimse-arch-08`, dated **2026-07-06** [S8]. A companion
  "Best Current Practice for Workload Identity" draft also exists in the same WG.
- **Docker MCP Gateway**: ships as a `docker` CLI plugin bundled with **Docker Desktop 4.59+**;
  positions itself as the auth/secrets/lifecycle layer for locally-run MCP servers (container
  isolation, Docker Desktop secrets manager, built-in OAuth flows) [S19].
- **Auth0 for AI Agents**: shipped as a named product line (Token Vault, Agent access
  management, "Agent as Principal" listed as "shipping next") with framework integrations for
  LangChain, LlamaIndex, Cloudflare Agents, Vercel AI SDK, Firebase Genkit [S30][S31].
- **AWS Bedrock AgentCore Identity**: GA product surface as of the docs snapshot fetched
  2026-09-30; covers workload identities, inbound JWT authorizers, outbound credential
  providers (OAuth2/API key/SigV4), a consent portal, and private-IdP connectivity [S32].
- **Composio**: positions itself now as "the skill layer of AI," SOC 2 Type II, 1,500+ managed
  integrations, and a dedicated "mcp-gateway" product (SSO/SCIM, tool routing, team policy,
  full audit trail) [S33].
- **Arcade.dev**: positions as "the enforcement point every agent action passes through" —
  explicitly framed against EMA as insufficient; markets 7,000+ integrations and per-action,
  runtime-evaluated authorization [S34].
- **Nango**: reframed from "unified API" toward "AI-built, code-owned integrations," with
  named agent use cases: tool calling, syncs, webhook processing, per-customer config [S35].

## Timeline

- **2025-03 to 2025-05** — Stytch publishes early "agent identity vs user identity" and "OAuth
  scopes for agents" guidance; treats the agent-permissions problem as new but tractable with
  existing OAuth 2.0 scopes [S28][S29].
- **2025-06-16** — WorkOS "MCP Authorization in 5 easy OAuth specs" lays out the then-current
  stack: RFC 6749, RFC 9728, RFC 8414, RFC 7591, PKCE (RFC 7636) [S26].
- **2025-08-11** — Composio publishes "MCP Vulnerabilities Every Developer Should Know,"
  cataloguing the Supabase, Asana, GitHub MCP incidents and CVE-2025-6514 [S12].
- **2025-11-25** — MCP authorization spec update: Client ID Metadata Documents become the
  recommended client-identity mechanism (over DCR); enterprise-managed authorization extension
  work begins. Aaron Parecki (spec co-editor) blogs the rationale the same day, criticizing DCR
  as creating unbounded registration databases and unclear cleanup for authorization servers
  [S1][S9].
- **2026-01-02** — kernl.sh publishes "MCP works great — until you ship," arguing MCP has no
  concept of context values (like tenant ID) "that shouldn't be chosen by the LLM" [S27].
- **2026-03-30** — Archestra.ai ships MCP Gateway v1.2.0 supporting ID-JAG ingestion at the
  gateway layer, publishes a technical walkthrough of the EMA flow [S10].
- **2026-04-08** — HN thread "The way every agent framework handles MCP is a latent security
  problem" surfaces persistent-connection and per-tool-authorization gaps; ReBAC (OpenFGA) and
  ephemeral/on-demand tool containers proposed as fixes [S15].
- **2026-04-22** — Infisical ships "Agent Vault," an open-source HTTP MITM credential proxy for
  agents; HN discussion (156 pts/55 comments) surfaces OAuth-refresh-in-payload leakage risk and
  sandbox-escape concerns [S14].
- **2026-05-21** — ID-JAG draft reaches version -04 [S7].
- **2026-06-23** — Arcade.dev publishes "Beyond Enterprise-Managed Authorization for MCP,"
  arguing per-action authorization is required because EMA only gates the *connection* [S11].
- **2026-07-06** — WIMSE architecture draft reaches version -08 [S8].
- **2026-07-09** — MCP Enterprise-Managed Authorization extension reported as reaching general
  availability/stable adoption by Anthropic, Microsoft and Okta, with Asana, Atlassian, Canva,
  Figma, Linear, Supabase as early compatible MCP servers (Slack "in development") [S22].
- **2026-08-04** — Microsoft ships a Zero Trust for AI e-book and expands its Zero Trust
  Assessment/Workshop tooling with AI- and DevSecOps-specific control groups [S25].
- **2026-08-26** — Habr field report: 16-day agent command-interception study finds 1 caught
  threat out of 853 bash commands, near-100% false-positive-dominated signal [S21].
- **2026-09-11** — SberTech (Sberbank) publishes a detailed MCP-gateway-in-production
  architecture piece (mTLS, JWT-per-tool authZ, session affinity, Synapse API Mesh registry)
  [S23].
- **2026-09-19** — Habr field report: an AI agent barred from CRM writes still causes a CRM
  mutation because write credentials remained on the orchestration layer (n8n), not the model
  [S20].
- **2026-09-25** — Microsoft publishes the Storm-3168 incident report: a leaked service
  principal secret (exposed in a public GitHub issue's edit history) used for a destructive,
  automation-speed Azure attack — cited as a template for how *agentic-speed* credential abuse
  looks [S24].

## Mechanics

### MCP authorization roles and discovery (spec 2025-11-25)

Roles: the MCP **server** is an OAuth 2.1 resource server; the MCP **client** is an OAuth 2.1
client acting on behalf of a resource owner; the **authorization server** may be co-hosted with
the resource server or separate [S1].

Overview requirements, VERBATIM [S1]:
> "1. Authorization servers **MUST** implement OAuth 2.1 with appropriate security measures for
> both confidential and public clients.
> 2. Authorization servers and MCP clients **SHOULD** support OAuth Client ID Metadata Documents...
> 3. Authorization servers and MCP clients **MAY** support the OAuth 2.0 Dynamic Client
> Registration Protocol (RFC7591).
> 4. MCP servers **MUST** implement OAuth 2.0 Protected Resource Metadata (RFC9728). MCP
> clients **MUST** use OAuth 2.0 Protected Resource Metadata for authorization server discovery.
> 5. MCP authorization servers **MUST** provide at least one of the following discovery
> mechanisms: OAuth 2.0 Authorization Server Metadata (RFC8414) [or] OpenID Connect Discovery 1.0."

Note the inversion from the protocol's earlier days: **DCR moved from MUST-support to
MAY-support**, while **CIMD moved to SHOULD-support**. Aaron Parecki (spec co-editor) explains
the motivation for de-prioritizing DCR [S9]:
> For authorization servers, DCR creates "public-facing APIs requiring strict rate limiting to
> prevent abuse," "unbounded database growth from thousands of client registrations," and
> "unclear cleanup mechanisms for 'old' client registrations." For clients, DCR demands managing
> "lifecycle of their client credentials on top of the actual access tokens."

**Client ID Metadata Documents (CIMD)** — the client identifies itself with an HTTPS URL
instead of registering. VERBATIM example metadata document from the spec, marked VERBATIM [S1]:

```json
{
  "client_id": "https://app.example.com/oauth/client-metadata.json",
  "client_name": "Example MCP Client",
  "client_uri": "https://app.example.com",
  "logo_uri": "https://app.example.com/logo.png",
  "redirect_uris": [
    "http://127.0.0.1:3000/callback",
    "http://localhost:3000/callback"
  ],
  "grant_types": ["authorization_code"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none"
}
```

Rules the spec sets, VERBATIM [S1]: "The `client_id` URL **MUST** use the 'https' scheme and
contain a path component... Clients **MUST** ensure the `client_id` value in the metadata
matches the document URL exactly... Authorization Servers... **SHOULD** fetch metadata documents
when encountering URL-formatted client_ids... **MUST** validate that the fetched document's
`client_id` matches the URL exactly." Aaron Parecki frames the mental model plainly [S9]: "When
the client starts an OAuth request to the MCP authorization server, it says, 'Hi, I'm
`https://example-app.com/client.json`.' The server fetches the JSON document at that URL and
finds the client's metadata." Builds on a decade of IndieAuth precedent; VSCode shipped CIMD
support ahead of formal spec adoption [S9].

Known limitation, spec-stated [S1]: "Client ID Metadata Documents cannot prevent `localhost` URL
impersonation by themselves. An attacker can claim to be any client by..." (full enumeration in
the Security Considerations section — the spec treats this as an open risk to mitigate via
policy, not something CIMD itself closes).

### Enterprise-Managed Authorization (EMA) / Cross-App Access (XAA) / ID-JAG

EMA is now **Stable** in the `ext-auth` repo and is explicitly a *profile* of the IETF ID-JAG
draft, which is itself a profile of "Identity Chaining Across Trust Domains." VERBATIM from the
EMA spec [S4]:

> "This document specifies how an MCP Client can obtain an access token from an MCP Server's
> authorization server by presenting an identity assertion it previously obtained from an
> enterprise Identity Provider during single sign-on, and how that authorization server
> validates the request before issuing an access token."

The three-step chain, VERBATIM [S4]:
> "1. Single Sign-On to the MCP Client via OpenID Connect or SAML (1a. optionally exchange the
> SAML assertion for a Refresh Token)
> 2. Token Exchange (RFC8693)
> 3. JWT Authorization Grant (RFC7523)"

Sequence diagram, VERBATIM (mermaid) [S4]:

```
sequenceDiagram
    participant UA as Browser
    participant C as MCP Client
    participant IdP as Identity Provider
    participant MAS as MCP Authorization Server
    participant MRS as MCP Resource Server

    C-->>UA: Redirect to IdP
    UA->>IdP: Redirect to IdP
    Note over IdP: User Logs In
    IdP-->>UA: IdP Authorization Code
    UA->>C: IdP Authorization Code
    C->>IdP: Token Request with IdP Authorization Code
    IdP-->>C: ID Token

    note over C: User is logged<br/>in to MCP Client.<br/>Client stores ID Token.

    C->>IdP: Exchange ID Token for ID-JAG
    note over IdP: Evaluate Policy
    IdP-->>C: Responds with ID-JAG
    C->>MAS: Token Request with ID-JAG
    note over MAS: Validate ID-JAG
    MAS-->>C: MCP Access Token

    loop
    C->>MRS: Call MCP API with Access Token
    MRS-->>C: MCP Response with Data
    end
```

ID-JAG itself, per Archestra's technical walkthrough [S10]: it is a signed JWT from the
enterprise IdP carrying user identity, the requesting client's identification, the target MCP
authorization server as `aud`, the specific MCP `resource`, and permitted scopes; header
`typ: oauth-id-jag+jwt`. Key distinction the same source draws: an **ID token** authenticates a
user *to the client app*; an **ID-JAG** *authorizes delegated API access to a downstream
resource* — it targets the resource's AS, not the app, and must still be exchanged for a final
access token there [S10].

Adoption claim as of the Habr/Selectel summary (2026-07-09): Anthropic, Microsoft, and Okta
support it; compatible MCP servers reported: Asana, Atlassian, Canva, Figma, Linear, Supabase,
with Slack "in development" [S22].

### RFC 8693 Token Exchange — the delegation primitive underneath EMA

Abstract, VERBATIM [S6]:
> "This specification defines a protocol for an HTTP- and JSON-based Security Token Service
> (STS) by defining how to request and obtain security tokens from OAuth 2.0 authorization
> servers, including security tokens employing impersonation and delegation."

RFC 8693 distinguishes **impersonation** (issued token represents the subject but hides that an
actor requested it) from **delegation** (the token records *both* the subject and the actor via
the `act` claim, so the receiving service can see the full chain). Delegation example, VERBATIM
from Appendix A.2 [S6]:

Subject token claims (who is represented):
```json
{
  "aud":"https://as.example.com",
  "iss":"https://original-issuer.example.net",
  "exp":1441910060,
  "scope":"status feed",
  "sub":"user@example.net",
  "may_act": { "sub":"admin@example.net" }
}
```

Actor token claims (who is actually acting):
```json
{
  "aud":"https://as.example.com",
  "iss":"https://original-issuer.example.net",
  "exp":1441910060,
  "sub":"admin@example.net"
}
```

Request grant type is the fixed URN
`urn:ietf:params:oauth:grant-type:token-exchange`, sent with `subject_token`,
`subject_token_type`, `actor_token`, and `actor_token_type` as form parameters against the
token endpoint [S6]. This is exactly the mechanism EMA wraps: the MCP client's ID token is the
subject-adjacent input, the IdP performs the exchange, and the ID-JAG it issues is functionally
an actor-aware grant scoped to one MCP resource.

### Agent's own identity (M2M) — the Client Credentials extension

Where EMA/ID-JAG covers "acting *for* a signed-in user," the **draft** MCP Client Credentials
extension covers the other half — an agent with **its own** identity, no human in the loop,
using OAuth 2.1 Client Credentials with pre-registered credentials (DCR explicitly **not** used
here) [S5]. Authentication must use JWT auth (RFC 7523 §2.2, recommended) or a client secret;
authorization-server metadata must advertise `token_endpoint_auth_methods_supported` including
`private_key_jwt` or `client_secret_basic` [S5]. This is the spec-level formalization of
"delegated user identity vs the agent's own identity" named in the chapter scope — as of
2026-09-30 it is still a draft extension, not stable.

### MCP Elicitation — the spec's human-in-the-loop primitive

VERBATIM from the spec [S2]:
> "Elicitation supports two modes: **Form mode**: Servers can request structured data from
> users with optional JSON schemas to validate responses. **URL mode**: Servers can direct users
> to external URLs for sensitive interactions that must *not* pass through the MCP client."

Hard security rule, VERBATIM [S2]:
> "Servers **MUST NOT** use form mode elicitation to request sensitive information such as
> passwords, API keys, access tokens, or payment credentials. Servers **MUST** use URL mode for
> interactions involving such sensitive information."

Capability negotiation, VERBATIM JSON [S2]:
```json
{
  "capabilities": {
    "elicitation": {
      "form": {},
      "url": {}
    }
  }
}
```
An empty `elicitation: {}` capability is backward-compatible shorthand for form-mode-only
support [S2]. Practically: **elicitation URL mode is the spec's designated hook for OAuth-style
step-up flows and CIBA-like async confirmation** — a server that needs a user to grant a scope
mid-session sends a URL-mode elicitation rather than trying to collect a token through the chat
turn.

### Why EMA/DCR is necessary-but-insufficient in practice

Arcade.dev's framing, quoted at length because it is the sharpest field-facing statement of the
gap [S11]:
> "EMA determines *who may connect to what*. It has nothing to say about whether a specific tool
> call, proposed by a potentially compromised agent five minutes after the token was issued,
> should actually execute."

Concrete attacks cited: the 2025 "SpAIware" attack planted persistent instructions in ChatGPT's
memory via indirect prompt injection, then reused already-authorized tools for
command-and-control with **no new OAuth approval required**; mid-2026 demonstrations showed
injected GitHub comments hijacking Claude Code, Gemini CLI, and Copilot Agent to exfiltrate CI
secrets through tools those agents were already authorized to use [S11]. Their prescription,
"per-action authorization," evaluates three layers at execution time, independently, for every
action: organization policy (max allowed), user delegation (what this user authorized), and
agent capability boundary (what tool types this agent is designed to use) — any explicit denial
wins [S11]. They cite NSA May-2026 guidance stating MCP "cannot enforce these security
principles at the protocol level," and note that even RFC 9396 Rich Authorization Requests
(JSON-structured scope constraints) cannot standardize evaluating "whether an action still
reflects the user's current intent" [S11].

### Token vault / managed-auth platform landscape (self-described positioning, 2026)

- **Auth0 for AI Agents** — Token Vault "handles access and refresh tokens automatically";
  explicit pitch: "Removing sensitive values (like keys/secrets) from code is essential. The
  next-level unlock is then being able to dynamically exchange an inert variable for the real
  key" (quoted customer, Sean Roberts, VP Applied AI) [S30]. Roadmap item publicly listed:
  "Agent as Principal" [S31].
- **AWS Bedrock AgentCore Identity** — "implements authentication and authorization controls
  that verify each request independently, requiring explicit verification for all access
  attempts regardless of source" (zero-trust framing); supports SigV4, OAuth 2.0, and API keys;
  splits **inbound** (JWT authorizer validating the caller into the agent) from **outbound**
  (credential providers handing the agent creds for third-party APIs), plus a consent portal for
  interactive third-party auth [S32].
- **Composio** — "SOC 2 Type II," 1,500+ managed apps, a dedicated **mcp-gateway** product
  described as "the control plane between agents and tools, covering SSO and SCIM identity,
  tool routing, team policies, and an audit trail of every tool call" [S33].
- **Arcade.dev** — "the enforcement point every agent action passes through" — explicitly
  positions against EMA/connection-time auth; "credentials never reach the LLM"; per-action
  authorization "evaluated at runtime against your IdP" [S34][S11].
- **Nango** — reframed 2026 positioning: "the integration layer for AI-built, code-owned
  product integrations"; explicit agent use case "Tool calling for AI agents: Give agents
  scoped, observable access to external APIs through Nango action functions" [S35].
- **WorkOS** — positions itself as the spec-literacy layer first (their most-cited piece is a
  plain OAuth-spec explainer, not a product pitch) [S26], alongside AuthKit/Connect products for
  MCP OAuth server setup.
- **Docker MCP Gateway** — the container/secrets-isolation angle: each local MCP server "runs
  in an isolated Docker container," secrets come from "Docker Desktop's secrets management," and
  the gateway is the single point that "Enables OAuth flows for MCPs that require OAuth access
  token service connections" [S19].

### Production MCP gateway architecture (Sberbank / SberTech, field report)

Three architecture problems named explicitly: **observability** (audit trail of agent actions,
"особенно важно для критичных агентов" / "particularly important for mission-critical agents"),
**tool integration complexity** (namespace conflicts, dynamic discovery, avoiding a centralized
registry as a single point of failure), and **cost** (writing a bespoke MCP server per tool is
expensive vs. virtualizing existing REST APIs) [S23].

Stack: MCP Gateway functionality deployed inside Service-Mesh-managed **Envoy** proxies,
configured via a "Synapse API Mesh" control plane. Security: **mutual TLS** between gateway and
both clients and backends; **JWT-based authorization with granular control down to individual
tool and JSON-RPC method level**; delegated **External Authorization** for custom policy;
**Envoy rate limiting**; secrets via **SDS (Secret Discovery Service)** [S23]. Multi-tenancy/
session handling: MCP sessions are stateful, so the gateway does **session affinity keyed on
the `mcp-session-id` header**, with pod-mapping memory in the proxy layer, TTL-based session
expiry on the backend, and graceful degradation when a pod is deleted [S23]. Quoted design
principle: "при подключении нового МСР‑сервера... не нужно прописывать его в коде" — new MCP
servers require no code change; agents discover tools dynamically via standardized
notifications [S23].

### Confused deputy and real incidents

Composio's incident catalogue [S12], dated Aug 11 2025 (older cases, still the most-cited
reference in later 2026 pieces):
- **Supabase MCP** (mid-2025): agents with `service_role` access processed untrusted values from
  support tickets, executing embedded SQL and exposing integration tokens — the canonical
  confused-deputy case for agent+DB integration.
- **Asana MCP** (June 2025): cross-tenant data leakage between customer instances.
- **GitHub MCP**: private-repository enumeration triggered via a malicious *public* issue
  comment.
- **CVE-2025-6514** in `mcp-remote` (558,000+ downloads): critical command-injection → RCE.
- **"NeighborJack"**: hundreds of MCP servers bound to `0.0.0.0` with unauthenticated shell
  execution (`subprocess.check_output(command, shell=True)`).
- Composio also cites **492 MCP servers found exposed to the internet with no authentication**
  and static-OAuth-client-ID cookie replay as recurring auth failures.

Microsoft's **Storm-3168** (2026-09-25), the most detailed 2026 incident with real numbers [S24]:
credentials for a service principal (client ID, client secret, tenant ID) had been "previously
exposed in plaintext in a public GitHub issue" by an employee; even after the issue was edited,
the credentials "remained accessible through the issue's public edit history." Attack unfolded
in phases: ~15.5 hours of reconnaissance (300+ read operations across VMs/subscriptions/resource
groups) by one compromised principal; a second principal enumerated two subscriptions' worth of
VMs/resource groups in **five seconds**; a **7-minute** destructive phase attempted 100+ storage
account deletions, part of "150+ destructive or credential-collection operations in 35 minutes";
five distinct tokens were issued to the destruction principal, and **two deletion tokens were
active during the same 70-second window**, enabling parallel destructive calls. Azure resource
locks and storage-level deletion protection blocked some deletions; Azure SQL deletions failed
on an unsupported API version (accidental mitigation, not designed defense). Microsoft's stated
lesson: "Treat credentials that have been publicly exposed as compromised, even if the original
location has subsequently been edited or deleted" [S24].

### Habr field reports: authority lives where the write capability lives, not where the model is

Case 1 — CRM write restriction bypass [S20]: DeepSeek model had no HubSpot credentials; the n8n
orchestration node kept them. A controlled test (two synthetic deals, LAB-042/LAB-043) showed
that when the model's proposal targeted the wrong deal ID, **n8n executed the PATCH anyway**
because it independently held write permission. Quoted conclusion: *"Полномочия модели — не то
же самое, что полномочия системы"* — "the model's permissions are not the same as the system's
permissions." Fix required an independent deterministic gateway validating parameters
*before* execution, not just restricting the model's direct access [S20].

Case 2 — signature-based command interception, 16-day study, MIT-licensed tool "Klyvo" [S21]:
1,496 total logged agent actions, 853 (57%) were bash commands. Result: **1 genuine threat
caught out of 853 (0.12%)**; 45 false positives from test fixtures containing simulated
destructive commands, 14 false positives from documentation/comments merely *mentioning*
dangerous operations. Quoted conclusion: *"нельзя отличить исполнение от упоминания с помощью
сигнатур — нужно семантическое понимание, а не текстовый анализ"* (paraphrased in the English
summary as: "It's not possible to distinguish execution from mention using signatures — you need
semantic understanding, not text analysis"). The one real catch: an SSH command about to drop a
production Postgres database (Aug 15) — the author had meant to drop an *old* DB and forgot it
belonged to another project with no backups; interception "simply restores the pause that
automation consumed." The same tool failed to catch a cloud-provider GraphQL API call (the
actual vector in a separate incident referenced, "PocketOS") — signature rules don't generalize
across API shapes, and determined circumvention (encoding, command-splitting) defeats them
outright [S21].

### HN field reports: secrets handling patterns people actually ship

From "How are you managing secrets with AI agents?" [S17]:
- One team built a harness where secrets come from AWS Secrets Manager and are injected
  per-workflow-step; **the agent can see env var *names* but never *values*** (masked by the
  harness), and any attempted stdout/file exfiltration of a secret value is also masked.
- `credwrap` (github.com/akropp/credwrap): a TCP client-server credential broker — "Agent calls
  `credwrap gog gmail search ...` — server injects the API key and executes, agent never sees
  the credential." Features: tool allowlist with argument validation, token/IP/Tailscale auth,
  full audit logging.
- A skeptical reply on `dotenvx`: "What would stop the agent from writing+running its own script
  wrapped in `dotenvx run` to access the secrets?" — answered only partially ("put `dotenvx`
  into the deny list... there will definitely be ways around of it").

From "How do you secure AI coding agents?" [S18] — the sharpest exchange on why *advisory* hooks
fail: a user reported a `PreToolUse` hook blocking reads of `~/.env`; the agent tried, hit the
block, **asked the user for permission, the user said yes, and the agent retried and
succeeded** — "Hooks can influence behavior, but they don't remove authority. As long as the
agent process still has filesystem access, enforcement is ultimately negotiable." The proposed
fix pattern ("Tenuo," a capability-token/Macaroon-style primitive): the agent starts with zero
file access; a user's "yes" doesn't disable the hook, it **mints a fresh, ephemeral, scoped
token** for exactly that path — "Hooks are advisory, capabilities are mandatory."

From the Agent Vault (Infisical) HN thread [S14] — credential-proxy limits acknowledged by
commenters and, per the summary, by the maintainers: "if the credential is an OAuth2 token and
the service has a token-refresh endpoint, the response would have a new token in the payload
reaching directly to the agent" (i.e. MITM proxying doesn't catch tokens embedded in *response
bodies*, only request headers); WebSocket auth and credential-in-response stripping were named
explicitly as unimplemented; an "identity layer for agents" was called out as an ecosystem-wide
problem "explicitly deferred," not solved by any single vault.

From "the way every agent framework handles MCP is a latent security problem" [S15]: real
quote from a practitioner running an MCP server against a corporate messaging API: "if it stays
connected the whole session, any hallucinated tool call can fire off messages to an entire org
while the agent is doing something unrelated... MCP doesn't really have a way to [scope
that]." Proposed mitigations from other commenters: OpenFGA-based ReBAC (relationship-based
access control) evaluated on *every* tool call plus an "Output Gate" running DLP policy before
results reach the LLM (project "ToolMesh"); reputation-based admission control gating which
agents may invoke which sensitive tools at all, independent of connection lifecycle.

### Durable execution and integration reliability (brief, supplementary)

Durable-execution frameworks (Temporal, DBOS, Restate, Inngest) recur in 2025–2026 Show-HN and
blog activity as the answer to *idempotency and retries* for agent tool calls that touch
external systems — e.g. DBOS TypeScript/Java ("Postgres-backed durable workflows," 77–114 HN
points across two launches) and Restate's "durable coding agent" writeups. The pattern argued
for: wrap every external-effecting tool call in a durably-logged step so a retried agent turn
does not double-execute a payment, ticket creation, or CRM write. This is adjacent to, not a
substitute for, the auth-layer fixes above — the credential-scoping problem and the
retry-safety problem are separate failure modes that both show up as "the agent did something
twice/wrong in prod." No hard 2026 production-scale numbers were found for this sub-topic in the
sources opened; flagged under Unverified.

## Numbers

| Number | Context | Source |
|---|---|---|
| 492 | MCP servers found exposed to the internet with no authentication | Composio blog, Aug 2025 [S12] |
| 558,000+ | Downloads of `mcp-remote` package affected by CVE-2025-6514 (RCE) | Composio blog [S12] |
| 1 / 853 (0.12%) | Real threats caught by signature-based command interception over 16 days, one practitioner's agent | Habr, Aug 26 2026 [S21] |
| 59 | Combined false positives (45 fixture + 14 doc-mention) in the same 16-day study | Habr [S21] |
| 1,496 | Total logged agent actions in the 16-day study; 853 (57%) were bash commands | Habr [S21] |
| 15.5 hours | Reconnaissance duration by first Storm-3168 compromised principal | Microsoft, Sep 25 2026 [S24] |
| 5 seconds | Time for second Storm-3168 principal to enumerate VMs/resource groups across 2 subscriptions | Microsoft [S24] |
| 7 minutes | Destructive phase window (100+ storage account deletion attempts) | Microsoft [S24] |
| 150+ | Destructive/credential-collection operations in 35 minutes, Storm-3168 | Microsoft [S24] |
| 70 seconds | Overlap window where 2 of 5 Storm-3168 tokens were simultaneously active, enabling parallel deletes | Microsoft [S24] |
| 156 pts / 55 comments | HN engagement on Infisical's "Agent Vault" credential-proxy launch, Apr 22 2026 | HN [S14] |
| 1,500+ | Managed app integrations claimed by Composio | Composio llms.txt, accessed 2026-09-30 [S33] |
| 7,000+ | Integrations claimed by Arcade.dev | Arcade.dev llms.txt, accessed 2026-09-30 [S34] |
| 77 / 114 | HN points on two separate DBOS durable-workflow launches (TypeScript, Java) | HN, Jan 2025 / Nov 2025 |

Conditions: incident/vulnerability counts are as reported by the vendor blog post cited (dates
above); they are not independently re-verified counts and may already be stale by the time this
is read given the pace of MCP-ecosystem scanning activity.

## Pitfalls, limits, criticism

- **Connection-time ≠ action-time.** The single most-repeated critique across Arcade.dev, NSA
  guidance (as cited by Arcade.dev), and multiple HN threads: EMA/DCR/OAuth scopes gate whether
  a client may connect and what broad scope it holds, not whether *this specific tool call,
  right now* is legitimate given everything that happened since the token was issued
  (prompt injection, memory poisoning, a hallucinated argument) [S11][S15].
- **Scopes are too coarse for intent.** `mail.send` grants sending to anyone; RFC 9396 Rich
  Authorization Requests add JSON-structured *constraints* but still can't encode "does this
  still reflect the user's current intent" [S11].
- **Model-level restriction ≠ system-level restriction.** Removing a secret from the LLM's
  context does nothing if a downstream deterministic node (an n8n workflow, a script, a queue
  worker) retains write authority and acts on the model's *unvalidated* output [S20].
- **Hooks/guardrails are advisory when the underlying process retains raw access.** A user
  approving one exception can be (and was, in the field) leveraged by the agent to fully bypass
  a blocking hook, because approval didn't mint a *scoped* grant — it just disabled the check
  [S18].
- **Signature/pattern matching for dangerous-command detection has a near-zero catch rate and
  high noise**, because it can't distinguish "this text executes" from "this text is quoted in
  a comment or test fixture" [S21].
- **Credential proxies (MITM-style vaults) have real, acknowledged gaps**: tokens embedded in
  *response bodies* (e.g., OAuth refresh responses) reach the agent anyway; WebSocket protocols
  are commonly unsupported; a sandboxed agent that can reach the vault's own network segment can
  potentially "reverse-engineer" its way to credentials — the vault must run on separate
  infrastructure from the agent it's protecting [S14].
- **DCR at scale creates its own operational burden** for authorization-server operators:
  unbounded client-registration growth, unclear retention/cleanup, and a public write endpoint
  that itself needs abuse-rate-limiting — part of why the MCP spec moved DCR to optional and
  promoted CIMD instead [S9].
- **CIMD does not close localhost/desktop-client impersonation** by itself; the spec explicitly
  flags this as an open risk requiring additional trust-policy mitigation [S1].
- **MCP has no native concept of "this parameter is required by the API but must not be chosen
  by the LLM"** (e.g., tenant ID) — forcing workarounds like one connection per tenant instead
  of a clean parameter-binding mechanism [S27].
- **STDIO-transport MCP servers are explicitly out of scope for the authorization spec** ("SHOULD
  NOT follow this specification, and instead retrieve credentials from the environment") — a lot
  of local/desktop MCP usage (Claude Desktop, Cursor, etc.) sits outside the OAuth model
  entirely and depends on OS/host-level secret handling instead [S1].
- **Session state at multi-pod gateway scale is a real distributed-systems problem**, not
  solved by OAuth: Sberbank's team had to build session-affinity routing and TTL-based
  expiration specifically because MCP sessions are stateful and gateways are commonly
  horizontally scaled [S23].
- **Vendor self-positioning should be read skeptically**: Arcade.dev's critique of EMA is also a
  sales pitch for Arcade's own per-action product; Composio's "mcp-gateway" pitch and Arcade's
  "enforcement point" pitch are close to interchangeable marketing claims for the same
  underlying gap. The gap itself (connection-time vs action-time auth) is corroborated
  independently by the NSA-guidance citation and by unaffiliated HN commenters, which is why it
  is listed as TL;DR-level consensus rather than a single vendor's claim.

## What changed in the last 6 months (since ~2026-03-30)

- EMA/Cross-App Access went from "extension work in progress" (Archestra's Mar 30 2026 gateway
  release, v1.2.0, was an early adopter) to **Stable** in the MCP `ext-auth` repo, with
  reported multi-vendor adoption (Anthropic, Microsoft, Okta) by July 2026 [S10][S22][S3].
- The **"EMA is not enough"** critique crystallized into a named alternative framing
  ("per-action authorization") with vendor backing (Arcade.dev, Jun 23 2026) [S11].
- WIMSE architecture moved from draft -06/-07-era work to **-08 (2026-07-06)**, i.e. active,
  ongoing IETF progress on the non-human/workload-identity layer relevant to agent-to-agent and
  agent-to-service calls [S8].
- ID-JAG moved to **-04 (2026-05-21)**, still a working draft but the version EMA's stable spec
  now explicitly targets [S7][S4].
- A wave of **open-source credential-proxy/vault tooling** shipped and got real HN traction in
  this window: Infisical's Agent Vault (Apr 22 2026, 156 pts), `credwrap`, capability-token
  systems like "Tenuo" — evidence that "keep secrets out of the model's context window" moved
  from advice to shipped, competing implementations within roughly one quarter.
- Multiple **field-verified failure reports** appeared in this window specifically (not just
  theoretical risk write-ups): the Storm-3168 incident (Sep 25 2026), the Sberbank production
  gateway architecture (Sep 11 2026), and both Habr practitioner post-mortems (Aug 26 and
  Sep 19 2026) are all inside this 6-month window, suggesting the "agent + auth in production"
  conversation shifted from spec design to operational scar tissue over roughly Q2–Q3 2026.
- Microsoft explicitly widened its Zero Trust guidance to name AI/agentic workloads as a first-
  class pillar (Aug 4 2026 e-book + assessment/workshop updates) rather than treating agent auth
  as a subset of general app security [S25].

## Diagram candidates

1. **MCP OAuth discovery sequence** — actors: MCP Client, MCP Server (Resource Server),
   Authorization Server. Arrows: unauthenticated request → 401 + `WWW-Authenticate` with
   `resource_metadata` URL → fetch Protected Resource Metadata (RFC 9728) → fetch Authorization
   Server Metadata (RFC 8414) or OIDC discovery → standard OAuth 2.1 + PKCE code flow → token →
   authenticated request. States: unauthenticated, discovering, authorizing, authenticated.
2. **CIMD vs DCR client-identity flow, side by side** — left: client POSTs registration request
   to AS, gets back `client_id`/`client_secret`, stores them (DCR). Right: client hosts a JSON
   doc at an HTTPS URL, presents that URL as `client_id`, AS fetches+validates the doc live
   (CIMD). Label the operational cost difference (AS-side DB growth vs AS-side live fetch+cache).
3. **EMA / ID-JAG four-actor sequence** (already have verbatim mermaid above — redraw cleanly):
   Browser, MCP Client, enterprise IdP, MCP Authorization Server, MCP Resource Server. Emphasize
   the "no further user interaction" loop at the bottom for repeated MCP calls.
4. **RFC 8693 delegation vs impersonation** — one box per token (`subject_token`, `actor_token`)
   flowing into the STS, one box out (`access_token` with `act` claim). Show impersonation as a
   simplified path with only `subject_token`.
5. **Connection-time vs action-time authorization gap** — timeline diagram: t0 token issued
   (green, "authorized"), t1 prompt injection lands (red marker), t2 malicious tool call executes
   using the still-valid t0 token (red, "not re-checked"). This is the single most important
   diagram for this chapter's thesis.
6. **Token vault / credential broker pattern** — Agent (LLM) → Vault/Proxy (holds secret,
   validates+injects) → External API. Show explicitly that the arrow from Agent to Vault carries
   *no secret value*, only an intent/reference; the arrow from Vault to API carries the injected
   real credential. Add a dotted "leak path" arrow showing the acknowledged gap: secret can
   still leak back to the Agent via a response body (e.g., an OAuth refresh payload).
7. **Enterprise MCP gateway service-mesh diagram** (Sberbank pattern) — multiple MCP clients →
   Envoy-based Gateway (mTLS, JWT-per-tool authZ, rate limit, SDS secrets) → multiple backend MCP
   servers/pods, with a side "Synapse API Mesh" control plane pushing config, and a session-
   affinity router keyed on `mcp-session-id`.
8. **Capability/Macaroon-style scoped grant vs advisory hook** — two panels: (a) hook blocks,
   user says yes, hook is simply bypassed, full access resumes; (b) approval mints a new,
   narrowly-scoped, time-limited token for exactly the requested resource, nothing more.
9. **MCP elicitation form-mode vs URL-mode** — form mode: data flows through the MCP client
   (visible, structured, schema-validated); URL mode: browser navigates out-of-band to an
   external page, only the URL passes through the client, sensitive data never touches the LLM
   context. Good chapter-04/05 cross-link diagram too.
10. **MCP vulnerability map** — a single MCP server node with 5 labeled arrows in: tool
    description injection, confused deputy (over-privileged downstream role), token
    theft/passthrough, unauthenticated exposure (0.0.0.0 bind), supply-chain (malicious
    npm/PyPI dependency) — annotate each with its real-world example (Supabase, Asana, GitHub,
    NeighborJack, CVE-2025-6514).

### Chart candidates

- Storm-3168 attack timeline as a Gantt-style bar chart: reconnaissance (15.5h) → gap (90 min) →
  second-principal enumeration (5s) → gap (16h) → destructive phase (7 min) → credential
  collection (~30 min after) — all values from [S24]. Good for showing *attack speed at
  automation scale* vs human-paced intrusions.
- 853-commands breakdown as a stacked bar: 1 true positive, 45 fixture false positives, 14
  doc-mention false positives, ~793 uneventful — from [S21]. Illustrates signal-to-noise of
  naive guardrails.
- Timeline chart of the EMA/ID-JAG spec's drafts (version number vs date) from the two IETF
  documents tracked above — shows the pace of an actively-moving standard, useful to caveat any
  "current as of" claim in this chapter for future readers.

## Glossary

- **PRM (Protected Resource Metadata, RFC 9728)** — a `.well-known` JSON document an MCP server
  publishes pointing clients to its authorization server(s).
- **DCR (Dynamic Client Registration, RFC 7591)** — clients self-register with an AS via API
  call; now optional/fallback in MCP, not the recommended default.
- **CIMD (Client ID Metadata Document)** — client identity as a fetchable, self-hosted HTTPS
  URL/JSON document instead of a registered client ID; MCP's now-preferred client-identity
  mechanism.
- **EMA (Enterprise-Managed Authorization)** / **XAA (Cross-App Access)** — MCP extension (now
  Stable) letting an enterprise IdP broker MCP client↔server access without per-server user
  consent, via ID-JAG.
- **ID-JAG (Identity Assertion JWT Authorization Grant)** — an IETF-draft JWT issued by an
  enterprise IdP, combining Token Exchange (RFC 8693) and JWT Authorization Grant (RFC 7523), that
  an MCP client presents to an MCP server's AS to obtain an access token without user interaction.
- **Token Exchange (RFC 8693)** — STS protocol for swapping one security token for another,
  covering both impersonation and delegation, using `subject_token`/`actor_token` and the `act`
  claim.
- **WIMSE (Workload Identity in Multi System Environments)** — IETF WG defining
  non-human/workload identity architecture, related to but broader than SPIFFE.
- **Confused deputy problem** — a component with legitimate high privilege executes an action on
  behalf of a lower-privileged, untrusted input, effectively laundering the privilege escalation.
- **Token vault / credential broker** — architecture where an agent never sees a raw secret; a
  separate service holds and injects credentials into outbound calls on the agent's behalf.
- **Elicitation (MCP)** — protocol-level request from server to client asking the user for more
  input mid-interaction; split into form mode (structured, visible to client) and URL mode
  (out-of-band, for anything sensitive).
- **CIBA (Client-Initiated Backchannel Authentication)** — OAuth extension for out-of-band user
  approval (e.g., push notification to a separate device) without a redirect-based browser flow;
  named in this chapter's scope as an async-authorization pattern comparable in spirit to MCP's
  URL-mode elicitation, though the two are separate specs.
- **Per-action authorization** — evaluating org policy, user delegation, and agent capability at
  the moment of each tool call, rather than once at connection time.
- **Service principal** — a non-human Azure AD/Entra identity representing an application or
  automation; the entity compromised in the Storm-3168 incident.

## Unverified / open questions

- Could not access `reddit.com` (r/mcp, r/ClaudeAI, r/AI_Agents, etc.) from this research
  environment — both direct `curl` and `WebFetch` were blocked by network policy, and several
  public Reddit-mirror instances (redlib/libreddit) tried were rate-limited, gone, or
  unreachable. The field-report material above substitutes Hacker News (Algolia API, which
  worked reliably), GitHub, and Habr. This is a real gap versus the requested source mix and
  should be revisited with a working Reddit-capable tool.
- Checked `t.me/s/fastnewsdev` as instructed; found no posts specifically about agent
  authentication/OAuth/MCP authorization/token vaults in the window a single fetch surfaced.
  Not verified across the channel's full history — a targeted re-check (scrolling further back,
  or searching by date) might surface something; treat "nothing found" as a fetch limitation,
  not a confirmed absence.
- The Habr/Selectel EMA-adoption article's byline date is ambiguous in the sources I captured:
  the site's RSS feed timestamps it **2026-07-09**, but a WebFetch summarization pass separately
  rendered the date as "July 9, 2025" — I trust the RSS `pubDate` (2026-07-09) as authoritative
  but flag the discrepancy since I could not independently cross-check the article's own visible
  byline against both readings.
- No hard 2026 production-scale numbers were found (in the sources actually opened) for durable-
  execution frameworks (Temporal/Inngest/Restate/DBOS) specifically applied to agent tool-call
  idempotency — only launch-post HN point totals, which measure attention, not reliability
  outcomes. This sub-area deserves a dedicated pass with framework-specific case studies.
- WebSearch (the general search tool) was unavailable for the entire session due to a shared
  session-wide quota exhausted before this chapter's research began; all findings above come
  from direct URL fetches (WebFetch/curl) and the HN Algolia and Habr RSS APIs. Some
  comparison-shopping across vendors (Descope, Stytch beyond the two 2025 posts found, Pipedream
  Connect specifics) is thinner than it would be with working search — Descope in particular
  turned up no agent-specific material via the available discovery paths and should be checked
  directly (descope.com) in a follow-up pass.
- The claim that "2026-07-28" is a valid MCP schema-version directory but has no authorization
  doc content is based on a single 404 check against the `main` branch on 2026-09-30; it's
  possible this is a draft-in-progress path rather than a released version, and the true "next"
  MCP spec date after 2025-11-25 was not conclusively identified.

## Sources

- [S1] MCP Authorization specification, version 2025-11-25. Model Context Protocol project
  (Anthropic-stewarded, open governance). No single publication date beyond the version date;
  fetched raw from `github.com/modelcontextprotocol/modelcontextprotocol`,
  `docs/specification/2025-11-25/basic/authorization.mdx`. Accessed 2026-09-30.
- [S2] MCP Elicitation specification, version 2025-11-25. Same repo,
  `docs/specification/2025-11-25/client/elicitation.mdx`. Accessed 2026-09-30.
- [S3] MCP Authorization Extensions, `ext-auth` repository README. Model Context Protocol
  project. Accessed 2026-09-30. `github.com/modelcontextprotocol/ext-auth`.
- [S4] Enterprise-Managed Authorization specification (Stable). MCP `ext-auth` repo,
  `specification/stable/enterprise-managed-authorization.mdx`. Accessed 2026-09-30.
- [S5] OAuth Client Credentials Extension (Draft). MCP `ext-auth` repo,
  `specification/draft/oauth-client-credentials.mdx`. Accessed 2026-09-30.
- [S6] RFC 8693, "OAuth 2.0 Token Exchange." IETF, published 2020 (Internet Standards Track,
  IETF Trust). datatracker.ietf.org/doc/html/rfc8693. Accessed 2026-09-30.
- [S7] draft-ietf-oauth-identity-assertion-authz-grant-04, "Identity Assertion JWT Authorization
  Grant." Aaron Parecki, Karl McGuinness, Brian Campbell. IETF OAuth WG. Dated 2026-05-21.
  datatracker.ietf.org/doc/draft-ietf-oauth-identity-assertion-authz-grant/. Accessed 2026-09-30.
- [S8] draft-ietf-wimse-arch-08, "Workload Identity in a Multi System Environment (WIMSE)
  Architecture." Joseph A. Salowey, Yaroslav Rosomakho, Hannes Tschofenig. IETF WIMSE WG. Dated
  2026-07-06. datatracker.ietf.org/doc/draft-ietf-wimse-arch/. Accessed 2026-09-30.
- [S9] Aaron Parecki, "Client Registration and Enterprise Management in the Nov 2025 MCP Auth
  Spec." aaronparecki.com, published 2025-11-25. Accessed 2026-09-30.
- [S10] Archestra, "Enterprise-Managed Authorization for MCP." archestra.ai/blog, published
  2026-03-30. Accessed 2026-09-30.
- [S11] Arcade.dev, "Beyond Enterprise-Managed Authorization for MCP: Per-Action Authorization
  for AI Agents." arcade.dev/blog, published 2026-06-23 (per HN submission date; blog itself
  undated in fetched content). Accessed 2026-09-30.
- [S12] Composio, "MCP Vulnerabilities Every Developer Should Know." composio.dev/blog,
  published 2025-08-11. Accessed 2026-09-30.
- [S13] Composio, "MCP Gateways: A Developer's Guide to AI Agent Architecture in 2026."
  composio.dev/blog. HN submission dated 2025-11-15; referenced for context, not directly quoted.
- [S14] Hacker News thread, "Show HN: Agent Vault – Open-source credential proxy and vault for
  agents" (Infisical / github.com/Infisical/agent-vault). news.ycombinator.com/item?id=47865822,
  submitted 2026-04-22, 156 points / 55 comments. Accessed via HN Algolia API, 2026-09-30.
- [S15] Hacker News thread, "The way every agent framework handles MCP is a latent security
  problem." news.ycombinator.com/item?id=47683498, submitted 2026-04-08, 2 points. Accessed via
  HN Algolia API, 2026-09-30.
- [S16] Hacker News thread, "Ask HN: What are your worst war stories bringing agentic
  applications into prod." news.ycombinator.com/item?id=48342441, submitted 2026-05-31, 12
  points / 7 comments. Accessed via HN Algolia API, 2026-09-30.
- [S17] Hacker News thread, "Ask HN: How are you managing secrets with AI agents?"
  news.ycombinator.com/item?id=46825555, submitted 2026-01-30, 2 points / 5 comments. Accessed
  via HN Algolia API, 2026-09-30.
- [S18] Hacker News thread, "How do you secure AI coding agents?"
  news.ycombinator.com/item?id=46412347, submitted 2025-12-28, 1 point / 3 comments. Accessed
  via HN Algolia API, 2026-09-30.
- [S19] Docker, `mcp-gateway` repository README. github.com/docker/mcp-gateway. Accessed
  2026-09-30 (references Docker Desktop 4.59+ as prerequisite).
- [S20] Habr, "ИИ-агенту запретили запись в CRM. Но CRM всё равно изменилась." habr.com/ru,
  published 2026-09-19. Accessed 2026-09-30. habr.com/ru/articles/1084190/.
- [S21] Habr, "853 команды ИИ-агенту за 16 дней. Защита сработала один раз." habr.com/ru,
  published 2026-08-26. Accessed 2026-09-30. habr.com/ru/articles/1074810/.
- [S22] Habr / Selectel, "В Model Context Protocol добавлена централизованная авторизация для
  корпоративных клиентов." habr.com/ru/companies/selectel/news/1056860/. RSS `pubDate` reads
  2026-07-09 (see Unverified note on a date discrepancy). Accessed 2026-09-30.
- [S23] Habr / SberTech (Sberbank), "MCP без хаоса: как мы создали в корпоративном ландшафте
  централизованный шлюз для ИИ-агентов." Author: Anastasia Tregubova, Product Architect,
  SberTech. Published 2026-09-11. habr.com/ru/companies/sberbank/articles/1080158/. Accessed
  2026-09-30.
- [S24] Microsoft Security Blog, "Storm-3168: Agentic-driven cloud attacks using compromised
  service principals." Published 2026-09-25. microsoft.com/en-us/security/blog. Accessed
  2026-09-30.
- [S25] Microsoft Security Blog, "Advance Zero Trust for AI: New tools and guidance to secure AI
  agents and DevSecOps." Published 2026-08-04. microsoft.com/en-us/security/blog. Accessed
  2026-09-30.
- [S26] WorkOS, "MCP Authorization in 5 easy OAuth specs." Author: Michael Hadley. Published
  2025-06-16. workos.com/blog/mcp-authorization-in-5-easy-oauth-specs. Accessed 2026-09-30.
- [S27] kernl, "MCP works great — until you ship." Published 2026-01-02. kernl.sh/blog/dont-use-mcp.
  Accessed 2026-09-30.
- [S28] Stytch, "The challenge of AI agent permissions — and how OAuth scopes help." Published
  2025-04-04 (per HN submission date; article's own header date may read differently). Accessed
  2026-09-30. stytch.com/blog/handling-ai-agent-permissions/.
- [S29] Stytch, "Connecting AI Agents to Every App." Published 2025-03-08. Accessed 2026-09-30.
  stytch.com/blog/connecting-ai-agents-to-every-app/.
- [S30] Auth0, "Token Vault" feature page. auth0.com/features/token-vault.md. Accessed
  2026-09-30 (undated marketing/product page; reflects state as of access date).
- [S31] Auth0, "Auth0 for AI Agents" page. auth0.com/ai.md. Accessed 2026-09-30 (undated
  marketing/product page).
- [S32] AWS Documentation, "Amazon Bedrock AgentCore Identity" / "Overview of Amazon Bedrock
  AgentCore Identity." docs.aws.amazon.com/bedrock-agentcore/latest/devguide/identity.html and
  identity-overview.md. Accessed 2026-09-30 (undated docs page, reflects current GA state).
- [S33] Composio, `llms.txt` machine-readable index. composio.dev/llms.txt. Accessed 2026-09-30
  (undated; reflects current self-positioning).
- [S34] Arcade.dev, `llms.txt` machine-readable index. arcade.dev/llms.txt. Accessed 2026-09-30
  (undated; reflects current self-positioning).
- [S35] Nango, `llms.txt` machine-readable index. docs.nango.dev/llms.txt (nango.dev/docs).
  Accessed 2026-09-30 (undated; reflects current self-positioning).
- [S36] Docker Desktop / `mcp-gateway` README — duplicate reference point for S19, included for
  the "Docker Desktop 4.59+" version claim specifically.
