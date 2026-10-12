# Интеграции и авторизация агентов — engineering practice notes

## TL;DR (what an engineer must know today, 2026-09-30)

- MCP's authorization spec (current version **2026-07-28**) is a real, evolving OAuth 2.1 profile: PRM (RFC 9728) discovery is **mandatory** for servers, Dynamic Client Registration (RFC 7591) is now **deprecated** in favor of **Client ID Metadata Documents (CIMD)** — an HTTPS URL as `client_id` that resolves to a JSON doc. [S1]
- **Token passthrough is explicitly forbidden** by the MCP spec: an MCP server must never accept a token not issued specifically for it, and must never forward the client's token unmodified to an upstream API — it must act as its own OAuth client to upstream services. [S1][S2]
- The **confused deputy** attack on MCP proxy servers (static client ID + third-party consent cookie + client-controlled DCR) is a named, documented attack in the spec with a required mitigation (per-client consent before forwarding to the third-party AS). [S2]
- **RFC 8693 Token Exchange** + **RFC 7523 JWT-Bearer assertions** are the plumbing behind the two big 2026 delegation patterns: Okta/Microsoft/Ping's **Cross-App Access (XAA)** / **ID-JAG** (IETF draft `draft-ietf-oauth-identity-assertion-authz-grant-04`, May 2026) and MCP's own **Enterprise-Managed Authorization** extension. [S3][S4]
- **Enterprise-Managed Authorization** (official MCP extension, stable) lets an org's IdP (Okta/Entra) hand out an ID-JAG instead of every employee individually consenting per MCP server — centralizes revocation and policy. [S4]
- **OAuth Client Credentials** is now an official, separate MCP extension for machine-to-machine (no user in the loop): JWT-bearer assertion (RFC 7523, recommended) or client secret. Don't conflate it with the interactive user-delegated flow. [S5]
- **Agent identity ≠ user identity.** AWS AgentCore Identity, WIMSE, and the "MCP OAuth" critique piece (Aembit, Sept 2026) converge on the same gap: OAuth/PKCE proves a *token* was legitimately obtained, not *which software/runtime* is holding it — that requires workload-identity attestation (SPIFFE/WIMSE), which MCP's spec explicitly leaves out of scope. [S6][S7]
- Managed "auth-for-agents" platforms (Auth0 Token Vault, Arcade, Composio, Nango, Pipedream Connect, WorkOS, Descope) all converge on the same shape: **never let the LLM see the token** — the agent calls a platform API/MCP proxy, the platform holds tokens in a vault and injects them server-side. [S8–S13]
- **MCP elicitation** (2026-07-28 spec) now has a "URL mode" specifically designed for OAuth-like/credential flows: the data never passes through the client or LLM context — this is MCP's native human-in-the-loop/step-up mechanism, adjacent to but distinct from CIBA. [S1]
- **Durable execution** (Temporal, DBOS, Restate, Inngest) is becoming the standard substrate for agent tool-call retries, idempotency and multi-day human-approval waits — not a nice-to-have. DBOS positions itself as "library not service" (Postgres-backed, sub-2ms step checkpoint) vs. Temporal's dedicated cluster. [S14][S15]
- Real incidents already happened: the 2025 Supabase MCP prompt-injection (lethal-trifecta: read untrusted support tickets + broad DB read + agent could act) exfiltrated an `integration_tokens` table because the agent ran with a privileged DB role and no query-level RLS/read-only boundary. [S16]
- A 2026 audit of 30 production MCP servers found **most fail spec-mandated OAuth checks** (mixed PKCE `plain`+`S256`, incorrect ID-JAG profile implementation, metadata/enforcement drift) — MCP OAuth compliance in the wild is immature. [S17]
- Simon Willison (Sept 2026): MCP's actual value for constrained deployments is *not* protocol elegance — it's "a way to handle authentication that doesn't allow the agent to directly access API keys" plus audit logging and a connect/consent UI. [S18]
- IETF WIMSE is actively drafting **AI-specific** identity work in 2026: `draft-ietf-wimse-aims` (AI Identity Management System, first draft 2026-09-15) explicitly reuses WIMSE + OAuth rather than inventing new protocols — this is the standards track to watch, not a single finished RFC. [S19]

## Current state and versions (as of 2026-09-30)

- **MCP spec version**: `2026-07-28` is the latest stable protocol revision (others live at `2025-11-25`, `2025-06-18`, `2025-03-26`, `2024-11-05`, plus a `draft` track). Authorization lives under `/specification/2026-07-28/basic/authorization/*` as its own multi-page section (Authorization, Authorization Server Discovery, Client Registration, Security Considerations) — no longer one monolithic page. [S1]
- **Sampling and Roots are deprecated** as of this same version (context for ch.11/ch.12, not this chapter, but affects what "client capabilities" mean in auth negotiation). [S1]
- **MCP Authorization Extensions** ship from a separate repo, `modelcontextprotocol/ext-auth`, versioned independently of core MCP: currently **OAuth Client Credentials** and **Enterprise-Managed Authorization** are the two official ones (both opt-in, negotiated via `extensions` capability field). [S5][S4]
- **OAuth 2.1** is still an IETF *draft* (`draft-ietf-oauth-v2-1-13`/`-14`), not an RFC, and MCP explicitly pins to it anyway — worth flagging to readers who assume "2.1" is finalized.
- **RFC 8693** (Token Exchange, 2020) and **RFC 9728** (Protected Resource Metadata, 2025) are the two load-bearing *finished* RFCs; **Client ID Metadata Document** is still `draft-ietf-oauth-client-id-metadata-document-00`. [S1]
- **ID-JAG / Cross-App Access**: `draft-ietf-oauth-identity-assertion-authz-grant-04`, published 21 May 2026, expires 22 Nov 2026, authors Aaron Parecki (Okta), Karl McGuinness, Brian Campbell (Ping Identity) — actively being adopted as "Cross-App Access (XAA)" terminology industry-wide. [S3]
- **WIMSE** (IETF working group) has 7 active WG drafts as of late Sept 2026, including `draft-ietf-wimse-workload-identity-practices-07` (submitted to IESG for publication, 2026-09-22) and the brand-new `draft-ietf-wimse-aims-00` (AI Identity Management System, 2026-09-15) — plus a wave of ~15 individual (non-WG) drafts specifically about AI-agent delegation chains, audit records, and post-quantum agent identity, submitted through September 2026. This is a hot, unsettled area — nothing here is an RFC yet. [S19]
- **AWS Bedrock AgentCore Identity** (GA product, AWS) is the most fully-specified vendor implementation of the "agent identity as workload identity" pattern seen in this research. [S6]
- **Durable execution vendors**: Temporal (server+Cassandra cluster model), DBOS (Postgres-native library), Restate, Inngest all actively publish agent-specific content through September 2026 — Temporal's "The thread is the Workflow" (Sept 3, 2026) reframes an agent's conversation thread itself as the durable workflow unit. [S14]

## Timeline

| Date | Event | Source |
|---|---|---|
| 2020-01 | RFC 8693 Token Exchange published | [S20] |
| 2021-09-01 | OpenID CIBA Core 1.0 finalized | [S21] |
| 2025-03-26 / 2025-06-18 | Earlier MCP spec revisions add/refine OAuth 2.1-based authorization | [S1] |
| 2025-04-04 | Supabase ships MCP server (PAT auth, OAuth2 "coming") | [S22] |
| 2025 (mid) | Supabase MCP prompt-injection incident (General Analysis) — `integration_tokens` table exfiltrated via support-ticket prompt injection | [S16] |
| 2025-06-16 | Simon Willison names "the lethal trifecta" (private data + untrusted content + exfiltration channel) | [S23] |
| 2025-11-25 | MCP spec revision | [S1] |
| 2026-05-21 | `draft-ietf-oauth-identity-assertion-authz-grant-04` (ID-JAG) published | [S3] |
| 2026-07-06/07 | WIMSE WG drafts (arch-08, identifier-03, mutual-tls-02, workload-creds-02) updated | [S19] |
| 2026-07-28 | Current MCP spec version; DCR deprecated in favor of CIMD; Enterprise-Managed Authorization + OAuth Client Credentials extensions documented | [S1][S4][S5] |
| 2026-08-07 | HN "Show HN: I scanned 30 production MCP servers' OAuth – only 1 earned an A" (authgent) | [S17] |
| 2026-08-13 | "An action firewall for MCP – OAuth says who, not whether the call should run" (agenticdome) — explicit call-out that OAuth authenticates, doesn't authorize *specific actions* | [S24] |
| 2026-08-20 | DBOS Conductor (control plane) blog post | [S15] |
| 2026-08-25 | Microsoft Entra: instant revocation of service-principal bearer tokens via Continuous Access Evaluation (CAE) | [S25] |
| 2026-09-03 | Temporal: "The thread is the Workflow" — durable AI agents without changing agent code | [S14] |
| 2026-09-15 | `draft-ietf-wimse-aims-00` (AI Identity Management System) first submitted | [S19] |
| 2026-09-20 | Simon Willison: "MCP was always a bad idea?" — reframes MCP's value as auth/audit infrastructure | [S18] |
| 2026-09-21 | AWS blog: durable AI agents on Bedrock AgentCore with Temporal Serverless Workers | [S14] |
| 2026-09-22 | `draft-ietf-wimse-workload-identity-practices-07` submitted to IESG | [S19] |
| 2026-09-29 | DBOS "What's New — September 2026" | [S15] |
| 2026-09-30 (today) | `draft-jackson-wimse-evaluation-03`, `draft-gilda-wimse-agent-audit-record-01` (Sept 27) among very latest individual WIMSE drafts on agent delegation/audit | [S19] |

## Mechanics

### 1. The MCP OAuth flow, end to end (spec-normative, 2026-07-28)

Roles: MCP server = **OAuth 2.1 resource server**; MCP client = **OAuth 2.1 client**; a separate **authorization server** (may or may not be co-hosted) issues tokens. [S1]

Step-by-step (VERBATIM sequence, condensed from the spec's mermaid diagram) [S1]:
1. Client sends MCP request without a token.
2. Server replies `401` with `WWW-Authenticate` carrying a `resource_metadata` URL (and optionally a `scope`).
3. Client fetches the Protected Resource Metadata (PRM) document, extracts `authorization_servers`.
4. Client does AS metadata discovery (tries **both** OAuth 2.0 Authorization Server Metadata, RFC 8414, and OpenID Connect Discovery, in a defined priority order for path-based issuers).
5. Client obtains a `client_id` via **CIMD** (preferred) → **pre-registration** → **DCR** (deprecated fallback) → user-entered (last resort).
6. Client generates PKCE (S256 mandatory when supported), builds authorization URL with `resource` parameter (RFC 8707) and records the expected `issuer`.
7. User authorizes in browser; AS redirects back with code + `iss` (RFC 9207) — client **must** validate `iss` against the recorded issuer using exact string comparison, no normalization, before ever sending the code to a token endpoint (mitigates AS mix-up attacks).
8. Client exchanges code + `code_verifier` + `resource` for a token.
9. Client calls the MCP server with `Authorization: Bearer <token>` on **every** request; token must never be in a URL query string.
10. Server validates the token's audience against itself (RFC 8707 §2) and rejects (401) anything not issued for it.

VERBATIM 401 example from the spec [S1]:
```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource",
                         scope="files:read"
```

VERBATIM insufficient-scope (step-up) example [S1]:
```http
HTTP/1.1 403 Forbidden
WWW-Authenticate: Bearer error="insufficient_scope",
                         scope="files:write",
                         resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource",
                         error_description="File write permission required for this operation"
```

**Step-up flow rule**: on a 403/insufficient_scope, the client must compute the **union** of previously-granted scopes and newly-challenged scopes (not just request the new ones) so it doesn't silently lose earlier permissions, then re-authorize, retry a bounded number of times, then treat it as a hard failure. [S1]

**Scope discovery priority** a client should follow: (1) `scope` param on the 401 challenge if present, (2) else all of `scopes_supported` from PRM. `scopes_supported` is meant to represent the *minimal* baseline set — extra scopes come through step-up, not through front-loading. [S1]

### 2. Client ID Metadata Documents (CIMD) — the DCR replacement

Problem CIMD solves: MCP clients and servers usually have **no prior relationship** — DCR technically works but is now deprecated because of the confused-deputy risk pattern (dynamic per-client IDs + static proxy client ID + consent cookies).

CIMD mechanism: the `client_id` **is** an HTTPS URL; the AS fetches that URL and treats the returned JSON as the client's registration data. VERBATIM example document [S1]:
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
AS must validate: the fetched doc's `client_id` matches the URL exactly, redirect URIs match, structure is valid JSON — and should watch for **SSRF** when fetching arbitrary client metadata URLs, and warn extra hard on `localhost`-only redirect URIs (CIMD can't itself stop localhost impersonation). [S1]

Client registration priority order (normative): pre-registered → CIMD (if AS advertises `client_id_metadata_document_supported: true`) → DCR (fallback) → prompt user. [S1]

**Authorization Server Binding**: credentials from DCR/pre-registration are pinned to the issuing AS's `issuer` identifier; if PRM later points at a different AS, the client must NOT reuse old credentials — it must re-register. CIMD-based client_ids don't have this problem since they're resolved fresh by whichever AS is current. [S1]

### 3. Confused deputy attack on MCP proxies — attack and fix

Vulnerable when **all** of: static client_id at the third-party AS + client-controlled DCR at the proxy + third-party AS sets a consent cookie + no per-client consent check at the proxy. [S2]

Attack flow (VERBATIM sequence, condensed) [S2]:
1. Attacker dynamically registers a malicious client at the MCP proxy with `redirect_uri: attacker.com`.
2. Attacker sends victim a crafted link.
3. Victim's browser still has the third-party AS's consent cookie from an earlier *legitimate* login → consent screen is skipped.
4. Third-party AS redirects the (legitimate) 3P auth code back to the proxy.
5. Proxy exchanges it, mints its **own** MCP authorization code, and redirects — to the attacker's registered `redirect_uri`.
6. Attacker exchanges the MCP code for an MCP access token and impersonates the victim to the MCP server.

Mitigation: the proxy **must** show its own consent screen and store a **per-`client_id`** consent decision *before* ever forwarding to the third-party AS — never rely on the third party's cookie as a substitute. Consent cookies, if used, need `__Host-` prefix, `Secure`/`HttpOnly`/`SameSite=Lax`, must be cryptographically signed or server-side, and bound to the specific `client_id`. [S2]

### 4. Token passthrough — the forbidden anti-pattern

Definition: MCP server accepts a token not validated as issued *for it*, and/or forwards it unmodified downstream. [S2]

Why it's bad (from the spec, condensed): breaks downstream rate-limiting/monitoring that assumes audience-bound tokens; destroys the MCP server's own audit trail (can't distinguish which of its clients is acting, and the downstream log shows the wrong caller identity); if one service in the chain is compromised, the same token now works everywhere; blocks future addition of server-side security controls. **Fix**: MCP servers **must not** accept tokens not issued for them, and if they call an upstream API, they act as their **own** OAuth client using a **separately issued** token (often obtained via **RFC 8693 token exchange**, not passthrough). [S2]

### 5. RFC 8693 Token Exchange — the actual wire mechanics

VERBATIM request (resource server acting as client, exchanging an inbound token for an outbound one bound to a different resource) [S20]:
```http
POST /as/token.oauth2 HTTP/1.1
Host: as.example.com
Authorization: Basic cnMwODpsb25nLXNlY3VyZS1yYW5kb20tc2VjcmV0
Content-Type: application/x-www-form-urlencoded

grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Atoken-exchange
&resource=https%3A%2F%2Fbackend.example.com%2Fapi
&subject_token=accVkjcJyb4BWCxGsndESCJQbdFMogUC5PbRDqceLTC
&subject_token_type=
 urn%3Aietf%3Aparams%3Aoauth%3Atoken-type%3Aaccess_token
```
VERBATIM response [S20]:
```json
{
 "access_token":"eyJhbGciOiJFUzI1NiIsImtpZCI6IjllciJ9...",
 "issued_token_type": "urn:ietf:params:oauth:token-type:access_token",
 "token_type":"Bearer",
 "expires_in":60
}
```
Key parameters: `subject_token`/`subject_token_type` = whose identity the exchange is *about*; `actor_token`/`actor_token_type` (optional) = who is *acting on behalf of* the subject — this is the RFC 8693 hook for on-behalf-of / delegation chains, distinct from pure impersonation. [S20]

### 6. Cross-App Access (XAA) / ID-JAG and MCP's Enterprise-Managed Authorization

**ID-JAG** = "Identity Assertion JWT Authorization Grant." Built from **RFC 8693 Token Exchange** + **RFC 7523 JWT-bearer grant**. Abstract (VERBATIM) [S3]: "This specification provides a mechanism for an application to use an identity assertion to obtain an access token for a third-party API by coordinating through an identity provider that the downstream Resource Authorization Server already trusts for single sign-on (SSO)... This pattern is informally referred to as Cross-App Access (XAA)."

MCP's **Enterprise-Managed Authorization** extension (`io.modelcontextprotocol/enterprise-managed-authorization`) implements this concretely for MCP. Flow (VERBATIM sequence, condensed) [S4]:
1. User logs into the MCP client via enterprise SSO → client stores the ID Token.
2. Client exchanges the ID Token for an **ID-JAG** at the enterprise IdP (IdP evaluates policy here — this is the centralized control point).
3. Client presents the ID-JAG to the **MCP Authorization Server**, which validates it and mints an ordinary MCP access token.
4. Client calls the MCP server normally with that access token.

Client declares support via `_meta`:
```jsonc
{
  "jsonrpc": "2.0", "id": 1, "method": "...",
  "params": { "_meta": {
    "io.modelcontextprotocol/clientCapabilities": {
      "extensions": { "io.modelcontextprotocol/enterprise-managed-authorization": {} }
    }
  }}
}
```
[S4]

Key operational point: **the MCP client never redirects the user to the MCP AS's own login page** — enterprise-managed auth replaces that interactive step entirely with the IdP-mediated exchange. Revocation is centralized at the IdP: pull one employee's access and it's gone everywhere, immediately, with no per-server revocation calls. [S4]

Account linking guidance: use the ID-JAG's `sub` claim as the primary stable identifier; fall back to `email` only for linking pre-existing accounts created before enterprise-managed auth was turned on. [S4]

### 7. OAuth Client Credentials extension (machine-to-machine)

Two credential formats [S5]:
- **JWT Bearer Assertion (RFC 7523, recommended)**: client signs a JWT with its private key (`iss`/`sub` = client_id, `aud` = token endpoint, `exp`/`iat`) and presents it — no shared secret in transit.
- **Client Secret**: classic `client_id`+`client_secret` to the token endpoint.

VERBATIM flow [S5]:
```
Client->>AS: POST /token  grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer  assertion=<signed JWT>
AS-->>Client: access_token
Client->>MCP: MCP request (Bearer token)
```
Use when there is genuinely no human to consent (CI/CD, daemons, scheduled jobs, server-to-server) — otherwise use the interactive flow. [S5]

### 8. Agent identity as workload identity — AWS AgentCore Identity model

AgentCore Identity treats an agent as a specialized **workload identity**, distinct both from a static IAM role and from a plain user identity. Core vocabulary (VERBATIM definitions from AWS docs) [S6]:
- **Agent identity**: "...enable agents to authenticate as themselves rather than impersonating users, supporting delegation-based access patterns."
- **Agent access token**: "An AWS-signed token that contains both workload identity and user identity information, enabling downstream services to make authorization decisions based on both identities. These tokens are created through the token exchange process." — i.e., dual-identity tokens, explicitly built via token exchange (RFC 8693 pattern again).
- **Token vault**: "...ensures credentials can only be accessed by the specific agent and user combination that originally obtained them."
- **Consent portal**: "A hosted, AWS-managed portal that authenticates your end users to an OIDC identity provider and gathers their consent before an agent accesses a downstream resource on their behalf... keeps the OAuth flow server-side."
- **2LO vs 3LO**: client-credentials grant (2LO, no user) for machine-to-machine; authorization-code grant (3LO, with user) when the agent needs explicit per-user consent for something like Google Calendar or Salesforce.
- **MCP server** role definition matches the MCP spec exactly: "acts as an OAuth 2.0 resource server when accessed by agents and as an OAuth 2.0 client when accessing downstream resources" — i.e. AWS's own docs restate the no-token-passthrough rule in their glossary. [S6]

### 9. Managed auth/token-vault platforms — comparative shape

All of these solve "keep the token out of the LLM's context window" with the same basic shape: agent/backend calls a **platform SDK/API or MCP endpoint**, platform does OAuth against the real provider, stores tokens server-side, injects them into outbound tool calls. Differences are in breadth and API surface:

| Platform | Shape observed | Scale claim | MCP support | Source |
|---|---|---|---|---|
| Auth0 (Token Vault) | 3 exchange types: refresh-token exchange (web/mobile), access-token exchange (microservices), privileged-worker exchange (backend) | n/a | via Auth0/Okta ecosystem | [S8] |
| Arcade | server-level vs tool-level authorization split; enforces at runtime via existing IdP/DLP/compliance policy | 40+ auth providers, 7,500+ tools | registers/governs remote MCP servers centrally | [S9] |
| Composio | session-based (`composio.create(user_id)`); "connected accounts" auto-provisioned at runtime, no pre-created auth configs needed | API v3.1 | `session.mcp.url`/`session.mcp.headers`, provider-agnostic | [S10] |
| Nango | unified OAuth/API-key/token-refresh layer | 1,000+ APIs, 7,000+ templates | "Expose any integration as an AI-ready tool instantly"; RBAC + per-user API scopes | [S11] |
| Pipedream Connect | SDK + "Connect Link"; per-end-user via `external_user_id`; proxy abstracts credentials from the caller | 3,000+ APIs | 10,000+ AI agent tools via MCP server | [S12] |
| WorkOS | "Agent Registration"/"Agent Blueprints" mint scoped, **short-lived** tokens for agents; AuthKit can itself be the OAuth AS for your MCP server; CLI/device-flow auth for CLI agents | n/a | dedicated MCP server for managing the WorkOS workspace itself | [S13] |
| Descope | positions as full "standards-based identity infrastructure" for building agents/MCP servers: authz, scope-based access control, consent, token management, **DCR security** | n/a | native MCP server support | [S26] |

Common pattern across all: **least privilege via per-user connected accounts + centrally managed refresh**, not per-agent static API keys. [S8–S13][S26]

### 10. Human-in-the-loop: MCP elicitation vs CIBA

**MCP elicitation** (2026-07-28 spec) is now delivered through the **Multi Round-Trip Requests (MRTR)** pattern: a `tools/call` can return an `InputRequiredResult` whose `inputRequests` carry one or more `elicitation/create` requests; the client collects input and **retries the original request** with `inputResponses` attached. Two modes [S1]:
- **Form mode**: structured JSON-schema-driven form, validated client-side.
- **URL mode**: server hands the client a URL to open; the interaction (e.g. third-party OAuth consent, or entering a password) happens fully out of band — "its data never passes through the client, which makes this mode suitable for sensitive flows such as credential entry or third-party OAuth authorization." The client only ever learns whether the user consented to open it, not what happened there. **Servers must not use form mode for secrets** — passwords, API keys, tokens, payment credentials — precisely because form-mode data does pass through the client/LLM context. [S1]

VERBATIM elicitation request example (form mode, booking confirmation) [S1]:
```typescript
{
  method: "elicitation/create",
  params: {
    mode: "form",
    message: "Please confirm your Barcelona vacation booking details:",
    requestedSchema: {
      type: "object",
      properties: {
        confirmBooking: { type: "boolean", description: "Confirm the booking (Flights + Hotel = $3,000)" },
        seatPreference: { type: "string", enum: ["window", "aisle", "no preference"] },
        roomType: { type: "string", enum: ["sea view", "city view", "garden view"] },
        travelInsurance: { type: "boolean", default: false }
      },
      required: ["confirmBooking"]
    }
  }
}
```

**CIBA** (OpenID Connect Client-Initiated Backchannel Authentication, finalized Sept 2021) is the older, IdP-side analog: a Relying Party that already has an identifier for a user (e.g. a phone number or username, no browser redirect available) triggers a backchannel authentication request; the user approves out-of-band on a separate "Authentication Device" (push/poll/ping modes); the RP then redeems the flow for tokens at the token endpoint using the CIBA grant type. This is the standard mechanism for **decoupled/async approval** (agent-initiated, human approves later, possibly on a different device) — complementary to, not competing with, MCP elicitation's URL mode. [S21]

### 11. MCP gateways and the "thin wrapper vs gateway" decision

Observed architectures, Sept 2026:
- **Docker MCP Gateway/Toolkit**: centralized proxy; runs each MCP server in an isolated container with restricted privileges/network; injects credentials into the container rather than the client holding them; profile-based server selection (`--profile` flag). [S27]
- **agentgateway** (Linux Foundation project, backed by Blacksmith; 5.1k GitHub stars as observed): unifies LLM gateway + MCP gateway + A2A gateway + inference routing in one data plane; JWT/API-key/OAuth/mTLS auth, RBAC via CEL policy expressions, content filtering via regex/OpenAI moderation/cloud guardrails. [S28]
- **Cross-cutting theme**: a gateway centralizes what would otherwise be N duplicated per-server auth/rate-limit/audit implementations — same argument WorkOS/Arcade/Nango make at the SaaS-integration layer, just for the MCP tool-serving layer instead. (Kong's and Cloudflare's specific MCP-gateway posts could not be verified in this session — see Unverified.)

## Numbers

- Auth0 Token Vault: 3 named exchange-type patterns (refresh-token / access-token / privileged-worker), no throughput/latency numbers published on the fetched page. [S8]
- Arcade: 40+ auth providers, 7,500+ tools (vendor-reported, no date on the figure, fetched 2026-09-30). [S9]
- Nango: 1,000+ APIs, 7,000+ integration templates (vendor-reported, fetched 2026-09-30). [S11]
- Pipedream Connect: 3,000+ APIs, 10,000+ AI-agent tools via MCP (vendor-reported, fetched 2026-09-30). [S12]
- agentgateway: 5.1k GitHub stars, 2,811 commits, 209 open issues (snapshot at fetch time, 2026-09-30, not independently dated). [S28]
- DBOS vs Temporal (DBOS's own comparison page — vendor-authored, treat as biased): DBOS step-checkpoint latency "sub-2ms" (single Postgres write) vs Temporal "tens to hundreds of milliseconds per step"; DBOS adoption "~20 minutes" vs Temporal "~2 weeks"; DBOS claims "2-10x less expensive," citing Temporal needing "2 to 10 full time employees" to run its cluster. No independent benchmark found. [S15]
- authgent MCP OAuth scan: HN title claims "30 production MCP servers... only 1 earned an A" (Aug 2026); the project's own docs describe a 10-RFC-mapped, A–F grading rubric (RFC 7591, 7636, 8414, 8707, 9207, 9449, 9728) and note specific failures — 3 vendors shipped the ID-JAG profile incorrectly, 2 bundled the OAuth-2.1-forbidden `plain` PKCE method alongside `S256` — but the live per-server grade table did not load in this session's fetch. **Treat the "30 servers / 1 A" headline as HN-title-level, not independently confirmed from the primary source in this session.** [S17]

## Pitfalls, limits, criticism

- **Token passthrough is the single most-repeated MCP anti-pattern** in the spec itself — it's called out in both the core authorization spec and the dedicated security-best-practices doc, which signals it's the failure mode the MCP maintainers see most in the wild. [S1][S2]
- **DCR itself is now a documented liability**, not just a legacy option — it's the enabling condition for the confused-deputy attack on proxies, which is exactly why the spec pivoted to CIMD. [S2]
- **OAuth proves possession of a valid token; it does not prove which software is holding it.** The Aembit critique (Sept 2026) states this plainly: "MCP defines how clients obtain and present authorization tokens, but it does not fully establish the identity of the agent or runtime using them" — this is precisely the gap WIMSE/SPIFFE workload attestation is meant to close, and it is **not** solved by anything in the MCP spec itself. [S7]
- **Real incident**: Supabase MCP + a privileged Postgres role + no RLS boundary + an LLM reading untrusted support-ticket text = the lethal trifecta (Willison's framing) realized concretely — attacker's instructions embedded in a support message caused the agent to dump an `integration_tokens` table. The fix pattern used (Tansive) was role-scoped query validation, i.e., **enforce access control below the agent, not just at the OAuth layer** — OAuth got the agent into the database; it did nothing to stop the specific SQL it then ran. [S16][S23]
- **MCP OAuth compliance is immature in production** — the authgent scan's headline (unverified in full but directionally credible given the spec's own churn between versions) plus the separate finding "Supabase MCP OAuth: split across two hosts, DCR registers clients at a third" (a 2026 third-party audit) both point to real-world MCP servers getting basic discovery/registration topology wrong. [S17][S29]
- **"An action firewall for MCP"** (HN, Aug 2026) makes an important conceptual distinction worth carrying into ch.16 (Security): **OAuth answers "who" is calling, not "whether this specific call should be allowed to run."** Scopes are coarse; a capability like `files:write` doesn't know if this particular write is dangerous. This is the argument for a policy/action layer (Cedar-style, see "Vectimus" HN entry) sitting *behind* OAuth, not instead of it. [S24]
- **Elicitation's form mode is explicitly not for secrets** — the spec had to write this down because the obvious naive use (ask the user for their API key via a form) puts the secret straight into LLM context; URL mode exists specifically to avoid that. [S1]
- **Vendor comparison numbers are all self-reported.** Every "40+ providers"/"1,000+ APIs"/"sub-2ms" figure in this chapter comes from the vendor's own site with no independent benchmark; DBOS vs Temporal in particular is DBOS's own comparison page and should be presented to readers as a vendor claim, not a neutral finding. [S8][S9][S11][S12][S15]
- **OAuth 2.1 is still a draft**, not an RFC — MCP builds its entire authorization model on a moving target; implementers following the spec today are implicitly following whatever `draft-ietf-oauth-v2-1-1X` says this month.

## What changed in the last 6 months (since ~April 2026)

- DCR formally demoted to "deprecated, backwards-compat only" in the MCP spec; CIMD is now the primary recommended mechanism (change lands in spec version 2026-07-28). [S1]
- MCP authorization extensions mechanism (`ext-auth` repo) shipped as a distinct, independently-versioned track — **Enterprise-Managed Authorization** and **OAuth Client Credentials** are the first two official extensions. [S4][S5]
- MCP elicitation gained **URL mode** and moved onto the general MRTR (Multi Round-Trip Requests) pattern rather than being its own bespoke request/response — this is new mechanics compared to the original 2025-06-18-era elicitation design. [S1]
- ID-JAG / Cross-App Access moved from an Okta-authored individual draft (`draft-parecki-...`) to an official OAuth WG document (`draft-ietf-oauth-identity-assertion-authz-grant-04`, May 2026) — i.e., it graduated from vendor proposal to IETF working-group-adopted spec within the last ~6 months. [S3]
- WIMSE produced its first **AI-agent-specific** draft, `draft-ietf-wimse-aims-00`, on 2026-09-15 — before that, WIMSE was general workload identity with no agent-specific document; this is brand new. [S19]
- A wave of ~15 **individual** (non-WG, i.e. early-stage/unadopted) IETF drafts on agent delegation chains, agent audit records, and post-quantum agent identity appeared through Aug–Sept 2026 — signals the standards conversation is still in the "many competing proposals" phase, not converging yet. [S19]
- Temporal and AWS both published agent-specific durable-execution integration content in September 2026 (Bedrock AgentCore + Temporal Serverless Workers, Sept 21; "the thread is the workflow," Sept 3) — durable execution vendors are now explicitly targeting the agent-loop use case rather than generic workflow orchestration. [S14]
- Simon Willison's public position on MCP shifted from general enthusiasm/skepticism to a specific, auth-centric defense of MCP's value (Sept 20, 2026 post) — directly useful as the closing frame for this chapter. [S18]

## Diagram candidates

1. **MCP OAuth full flow** — actors: User-Agent (browser), MCP Client, MCP Server (resource server), Authorization Server. Arrows: 401+WWW-Authenticate → PRM fetch → AS metadata discovery → client registration (3-way branch: CIMD/DCR/pre-reg) → PKCE authorize redirect → code+iss callback → iss validation → token exchange → Bearer request. States: unauthenticated / discovering / registering / authorizing / authorized. [S1]
2. **Confused deputy attack vs fixed flow** — two side-by-side sequence diagrams (vulnerable vs mitigated), actors: Attacker, User-Agent, MCP Proxy, Third-Party AS. Key labeled arrow: "consent cookie present → skips consent screen" vs "MCP-level per-client consent, stored before forward." [S2]
3. **Token passthrough vs correct token exchange** — actors: MCP Client, MCP Server, Upstream API, Authorization Server. Two arrows contrasted: "forward client's token as-is (FORBIDDEN)" vs "RFC 8693 token exchange → new audience-bound token." [S2][S20]
4. **RFC 8693 token exchange wire diagram** — actors: Client (acting as RS), Authorization Server, Backend. Labels: subject_token, subject_token_type, resource → issued access_token (short TTL). [S20]
5. **Cross-App Access / ID-JAG flow** — actors: Browser, MCP Client, Enterprise IdP, MCP Authorization Server, MCP Resource Server. Arrows: IdP login → ID Token → exchange for ID-JAG (policy evaluated here) → ID-JAG to MCP AS → MCP access token → looped MCP calls. [S4]
6. **Agent identity dual-token model (AWS AgentCore)** — actors: Agent (workload identity), User, Token Vault, Resource Credential Provider, Downstream Service. Show the "agent access token" carrying both workload identity + user identity claims. [S6]
7. **Token vault platform pattern (generic)** — actors: LLM/Agent, Platform SDK/Proxy, Token Vault, Third-party API (Google/Slack/GitHub/etc). Key point: arrow from LLM to Token Vault does NOT exist; LLM only talks to the Platform SDK. [S8–S13]
8. **MCP elicitation MRTR loop** — actors: Client, Server, User. States: tools/call → InputRequiredResult → elicitation/create (form or URL branch) → user response → retry tools/call with inputResponses → final result. [S1]
9. **CIBA decoupled approval** — actors: Relying Party (agent), Consumption Device, Authentication Device, OpenID Provider. Arrows: backchannel auth request → poll/ping/push → user approves on separate device → token redeemed via CIBA grant. [S21]
10. **MCP gateway topology** — actors: multiple MCP Clients, Gateway (Docker/agentgateway), N MCP Servers, Identity Provider. Show gateway as single choke point for auth injection, rate limiting, audit logging vs N direct per-server connections. [S27][S28]
11. **Lethal trifecta on Supabase MCP incident** — actors: Attacker, Support Ticket (untrusted content), Agent (broad DB role), integration_tokens table, Exfiltration channel (reply message). Annotate which of the 3 trifecta legs each arrow represents. [S16][S23]
12. **Durable execution around an agent tool call** — actors: Agent Loop, Durable Workflow Engine (Temporal/DBOS), External Tool/API, Human Approver. States: step started → checkpointed → (crash) → resumed from checkpoint → human-approval wait (days) → resumed → completed. [S14][S15]

Chart candidates: none of the numeric claims found (provider counts, latency, GitHub stars) are genuine longitudinal data series with multiple dated points from one consistent measurement — they are single vendor-reported snapshots, not chartable series. Flag to editor: if a chart is wanted here, the authgent per-server grade distribution (if the live registry table can be fetched) would be the one real dataset worth visualizing.

## Glossary

- **PRM (Protected Resource Metadata)**: RFC 9728 — a well-known JSON document an MCP server publishes listing its authorization server(s) and supported scopes.
- **CIMD (Client ID Metadata Document)**: an HTTPS URL used as an OAuth `client_id`; the AS fetches it to get client registration data instead of requiring pre-registration or DCR.
- **DCR (Dynamic Client Registration)**: RFC 7591; now deprecated in MCP, kept for backward compatibility.
- **Token exchange (RFC 8693)**: OAuth grant type for swapping one security token for another, optionally on behalf of a different subject/actor and bound to a different resource/audience.
- **ID-JAG (Identity Assertion JWT Authorization Grant)**: a JWT, obtained by exchanging an SSO ID token at an enterprise IdP, that a client presents to a third-party's authorization server to get an access token without a fresh interactive login — the mechanism behind Cross-App Access.
- **XAA (Cross-App Access)**: informal industry name for the ID-JAG pattern.
- **Confused deputy problem**: an intermediary (proxy) with more privilege than the caller is tricked into misusing that privilege on the attacker's behalf.
- **Token passthrough**: forwarding a token received from one party, unmodified, to another party that didn't issue it and isn't its intended audience — forbidden in MCP.
- **CIBA (Client-Initiated Backchannel Authentication)**: OpenID Connect flow where the user approves out of band, on a separate device, without a redirect through the requesting client.
- **Elicitation (MCP)**: server-initiated request for user input mid-tool-call, delivered via the MRTR pattern; form mode (structured, in-context) or URL mode (out-of-band, for secrets/OAuth).
- **Workload identity**: an identity assigned to a running piece of software (not a human, not a static long-lived credential) so it can authenticate as itself.
- **WIMSE**: IETF working group standardizing workload identity across multi-system (often multi-cloud) environments; now extending into AI-agent-specific identity.
- **2LO / 3LO**: two-legged (client-credentials, no user) vs three-legged (authorization-code, with user consent) OAuth.
- **Lethal trifecta**: Simon Willison's term for the combination of (private data access + untrusted content exposure + external communication capability) that makes prompt injection dangerous.
- **Durable execution**: workflow orchestration that checkpoints each step so long-running or crashed processes (including multi-day human-approval waits) resume from the last completed step instead of restarting.
- **Token vault**: a service that stores third-party OAuth tokens server-side and injects them into outbound calls, so the calling agent/LLM never sees the raw credential.

## Unverified / open questions

- Cloudflare's specific MCP-gateway/OAuth-provider blog post could not be located/fetched in this session (404 on the guessed URL, and WebSearch quota was exhausted for this session before it could be searched for properly). Flagged rather than fabricated — worth a follow-up search.
- Kong's MCP gateway blog post likewise 404'd on the guessed URL; not independently verified this session.
- Vercel's MCP/OAuth hosting guidance page 404'd; not verified.
- Microsoft Entra Agent ID: could not find/fetch a dedicated overview page in this session (guessed URLs 404'd, and the one Entra blog post surfaced via web-fetch summary — "Instant revocation of service principal bearer tokens with CAE," Aug 25 2026 — is about CAE for service principals generally, not confirmed to be the "Entra Agent ID" product specifically). Entra Agent ID's existence and general shape are widely reported elsewhere from this model's training data, but **that prior knowledge is stale (pre-2026) and unverified live in this session** — treat any Entra Agent ID claim not sourced to [S25] as unconfirmed.
- The authgent "30 servers, only 1 got an A" headline is from an HN post title; the live registry table (which would show the actual per-server breakdown) did not render in the fetch — the aggregate claim is plausible and consistent with other evidence (Supabase-audit finding, security-best-practices doc's emphasis) but is not independently confirmed at the primary source in this session.
- Restate's specific 2026 blog content on agents could not be extracted (markdown-rendering fetch limitation); only confirmed Restate is active in this space via its general positioning, not via a dated 2026 post.
- AP2/UCP and general "agentic commerce" auth patterns are explicitly out of scope for this chapter (belongs to ch.10) and were not researched here.
- SPIFFE (as opposed to WIMSE, which subsumes/relates to it) was not independently fetched from spiffe.io in this session; WIMSE IETF drafts were used as the primary live source instead. The exact current relationship/overlap between SPIFFE and WIMSE standards work is asserted from general knowledge, not verified against a live SPIFFE source this session.

## Sources

- [S1] "Authorization" / "Authorization Server Discovery" / "Client Registration" / "Authorization Security Considerations" — Model Context Protocol specification, version 2026-07-28. modelcontextprotocol.io. No single author (MCP maintainers/Anthropic-stewarded open spec). Fetched via https://modelcontextprotocol.io/llms-full.txt and https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/authorization.md. Accessed 2026-09-30.
- [S2] "Security Best Practices" (Confused Deputy Problem, Token Passthrough sections) — Model Context Protocol docs, version 2026-07-28. https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices.md. Accessed 2026-09-30.
- [S3] "Identity Assertion JWT Authorization Grant," draft-ietf-oauth-identity-assertion-authz-grant-04. A. Parecki (Okta), K. McGuinness, B. Campbell (Ping Identity). IETF OAuth WG, published 21 May 2026. https://datatracker.ietf.org/doc/html/draft-ietf-oauth-identity-assertion-authz-grant. Accessed 2026-09-30.
- [S4] "Enterprise-Managed Authorization" extension — modelcontextprotocol.io/extensions/auth/enterprise-managed-authorization (spec repo: github.com/modelcontextprotocol/ext-auth). Accessed 2026-09-30 (fetched via llms-full.txt dump).
- [S5] "OAuth Client Credentials" extension — modelcontextprotocol.io/extensions/auth/oauth-client-credentials. Accessed 2026-09-30.
- [S6] "AgentCore Identity terminology" / "Overview of Amazon Bedrock AgentCore Identity" / "Manage credential providers with AgentCore Identity" — AWS documentation. docs.aws.amazon.com/bedrock-agentcore/latest/devguide/. Accessed 2026-09-30.
- [S7] "MCP, OAuth 2.1, PKCE, and the Future of AI Authorization," Aembit blog, published ~September 2026 (per fetched summary). https://aembit.io/blog/mcp-oauth-2-1-pkce-and-the-future-of-ai-authorization/. Accessed 2026-09-30.
- [S8] Auth0 (Okta) — "Token Vault" docs, auth0.com/ai/docs/intro/token-vault. No date visible on page. Accessed 2026-09-30.
- [S9] Arcade — docs.arcade.dev/home. No date visible on page. Accessed 2026-09-30.
- [S10] Composio — docs.composio.dev/. No date visible on page. Accessed 2026-09-30.
- [S11] Nango — nango.dev (product homepage) and nango.dev/docs/getting-started/overview. No date visible. Accessed 2026-09-30.
- [S12] Pipedream — pipedream.com/docs/connect. No date visible. Accessed 2026-09-30.
- [S13] WorkOS — workos.com/docs (Agent Registration, Agent Auth, MCP Server sections as surfaced). No date visible. Accessed 2026-09-30.
- [S14] Temporal blog listing, temporal.io/blog — "The thread is the Workflow: Durable AI agents without changing Agent code" (2026-09-03); "Run durable AI agents on Amazon Bedrock AgentCore with Temporal Serverless Workers" (2026-09-21). Accessed 2026-09-30.
- [S15] DBOS blog and comparison page — dbos.dev/blog ("What's New in DBOS – September 2026," 2026-09-29; "What is DBOS Conductor?", 2026-08-20) and dbos.dev/compare/dbos-vs-temporal (vendor comparison, undated). Accessed 2026-09-30.
- [S16] "Implementing Defense Against Prompt Injection Attacks in MCP," Tansive docs/blog, referencing a General Analysis-reported Supabase MCP vulnerability. Published per fetched summary 2025-07-15 (incident itself mid-2025). https://docs.tansive.io/blog/implementing-defense-prompt-injection-attacks-mcp/. Accessed 2026-09-30.
- [S17] "Show HN: I scanned 30 production MCP servers' OAuth – only 1 earned an A" / authgent project, github.com/authgent/authgent, HN post dated 2026-08-07 (via HN Algolia API). Accessed 2026-09-30.
- [S18] Simon Willison, "MCP was always a bad idea?" (post slug /2026/Sep/20/hn-49779718/), simonwillison.net, published 2026-09-20. Accessed 2026-09-30.
- [S19] IETF WIMSE working group document listing, datatracker.ietf.org/wg/wimse/documents/ — includes draft-ietf-wimse-aims-00 (2026-09-15), draft-ietf-wimse-workload-identity-practices-07 (2026-09-22), and related individual drafts through 2026-09-30. Accessed 2026-09-30.
- [S20] RFC 8693, "OAuth 2.0 Token Exchange," IETF, published January 2020. www.rfc-editor.org/rfc/rfc8693.txt. Accessed 2026-09-30.
- [S21] "OpenID Connect Client-Initiated Backchannel Authentication Flow – Core 1.0," OpenID Foundation, final specification, published 2021-09-01. openid.net/specs/openid-client-initiated-backchannel-authentication-core-1_0.html. Accessed 2026-09-30.
- [S22] Supabase MCP server announcement blog, supabase.com/blog/mcp-server, published 2025-04-04. Accessed 2026-09-30.
- [S23] Simon Willison, "The Lethal Trifecta for AI Agent Security," simonwillison.net, published 2025-06-16. Accessed 2026-09-30.
- [S24] "An action firewall for MCP – OAuth says who, not whether the call should run," HN post dated 2026-08-13, github.com/agenticdome/agenticdome-python-sdk (via HN Algolia API). Accessed 2026-09-30.
- [S25] Microsoft Entra blog, "Instant revocation of service principal bearer tokens with CAE," by Simone_Oor, techcommunity.microsoft.com, published 2026-08-25. Accessed 2026-09-30.
- [S26] Descope — descope.com (AI agent identity/MCP positioning as surfaced on homepage). No date visible. Accessed 2026-09-30.
- [S27] Docker MCP Gateway documentation, docs.docker.com/ai/mcp-gateway/. No date visible. Accessed 2026-09-30.
- [S28] agentgateway project, github.com/agentgateway/agentgateway (Linux Foundation project). Repository snapshot accessed 2026-09-30.
- [S29] "Supabase MCP OAuth: split across two hosts, DCR registers clients at a third," HN post dated 2026-05-13, github.com/korrel-dev/mcp-audits (via HN Algolia API; full audit page 404'd on direct fetch — title/claim sourced from HN listing only). Accessed 2026-09-30.
