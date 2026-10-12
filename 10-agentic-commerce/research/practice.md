# 10. AP2, UCP и интернет агентов — engineering practice notes

## TL;DR (engineer's checklist)

- There is **no single winning protocol** in agentic commerce as of Sept 2026. The market has converged into a **layered stack**: commerce protocols (UCP, ACP) → identity/authorization protocols (AP2, Visa TAP, Mastercard Agent Pay, Amex ACE) → HTTP-402 payment protocols (x402, MPP, L402) → settlement rails (cards, stablecoins, Lightning) [S18][S3][S9].
- **AP2 (Google)** is not a payment rail — it is a **credential/evidence layer**: two Verifiable Digital Credential types, **Checkout Mandate** and **Payment Mandate**, each with an Open/Closed state, expressed as SD-JWTs, designed to plug into A2A, MCP, UCP or a raw REST checkout [S1].
- **ACP (OpenAI + Stripe)**, Apache-2.0, is a REST contract (`checkout_sessions`, `delegate_payment`) where the **merchant stays system of record**; payment credentials never touch the agent as raw PAN — a vaulted **Shared Payment Token (SPT)** or a card-network **Agentic Token** (Visa/Mastercard) is passed instead [S4][S5][S7].
- OpenAI's flagship **ChatGPT Instant Checkout** (launched Sept 2025 with Etsy + 1M+ Shopify merchants) was **wound down** by ~March 2026 — only ~12 Shopify merchants ever went live, no real-time inventory sync, no merchant-of-record tax infra. **The ACP protocol itself survived**: 7 major retailers (Target, Sephora, Nordstrom, Lowe's, Best Buy, Home Depot, Wayfair) run live ACP integrations as of the wind-down [S20][S18].
- **UCP (Google + Shopify + ~20 partners)** is the broadest-scope protocol: full discovery→catalog→cart→checkout→order lifecycle, transported over REST, MCP or A2A, with **AP2 as its payment/trust extension** (`dev.ucp.common.payment.ap2_mandate`) [S3][S21].
- **x402** revives HTTP 402 for stablecoin micropayments: server returns `402` + payment requirements, client retries with a `PAYMENT-SIGNATURE`/`X-PAYMENT` header, a **facilitator** verifies+settles on-chain. Now an **x402 Foundation** under the Linux Foundation (Apr 2, 2026), with Visa, Mastercard, Stripe, Google, AWS, Cloudflare, Coinbase, Shopify as founding members [S19][S9][S10].
- Card networks did **not** cede the field to crypto-native protocols: **Visa Trusted Agent Protocol (TAP)** (Oct 2025, developer preview, RFC 9421-based) and **Visa Intelligent Commerce Connect (ICC)** (Apr 8, 2026, a multi-protocol bridge across TAP/MPP/ACP/UCP), **Mastercard Agent Pay + Verifiable Intent** (layered SD-JWT credentials, live in 9+ APAC markets + LatAm + a controlled EU pilot with Santander), **Amex ACE** (Apr 14, 2026, ships "Agent Purchase Protection") [S22][S18].
- **Agent identity at the HTTP layer converges on one primitive**: RFC 9421 HTTP Message Signatures. Cloudflare's **Web Bot Auth**, Visa TAP, and Mastercard's identity layer all build on it [S11][S22][S18].
- Discovery/identity for the "internet of agents" is fragmenting across **AGNTCY** (Cisco-founded, donated to Linux Foundation July 2025, OASF schema + SLIM messaging + agent directory), **NANDA** (MIT Media Lab, agent registry/index research), **NLWeb** (Microsoft, MCP server over Schema.org — "NLWeb is to MCP/A2A what HTML is to HTTP"), and the older **llms.txt** convention — none of these are commerce-specific but they are the substrate agentic-commerce discovery sits on [S14][S15][S16].
- **Payment credentials never flow to the shopping agent as raw card data** in any serious 2026 design (AP2, ACP, UCP, TAP) — the pattern is always: agent negotiates → a trusted, non-agentic surface or vaulted token service mints a scoped, single-use credential → merchant/PSP verifies the credential's binding to the specific cart hash. This is the load-bearing anti-fraud, anti-hallucination architecture across the whole space [S1][S7].
- For a developer today the practical posture is **multi-protocol acceptance at the edge** (a middleware/proxy that speaks whichever protocol an arriving agent presents), not picking one champion — this is also literally what Visa's own ICC product does [S18].
- **EU AI Act Article 26** (in force since Aug 2, 2026) puts human-oversight, audit-log and escalation obligations on the **deployer** (buyer side) of an autonomous spending agent, not the seller — but it shapes which credential formats (AP2 Mandates, Mastercard Verifiable Intent) enterprise buyers will demand [S18].
- Cross-links: mandate/credential cryptography relates to Ch.16 (Security); MCP/A2A transports relate to Ch.05/Ch.07; agent discovery infrastructure (AGNTCY/NANDA/llms.txt) touches Ch.13 (multi-agent) and Ch.15 (integrations/auth) — this chapter covers only the commerce-specific slice.

## Current state and versions (as of 2026-09-30)

| Protocol | Owner(s) | Current version / status | Source |
|---|---|---|---|
| AP2 | Google, FIDO Alliance (spec work moved there Apr 2026) | v0.2 (2025 release); core spec work continuing inside FIDO's Agentic Authentication & Payments Technical WGs | [S1] |
| ACP | OpenAI + Stripe (Apache 2.0, beta) | Latest stable spec snapshot `2026-04-17` (added Cart, Feed, Orders, Authentication, MCP module); `unreleased/` under active dev | [S4][S8] |
| UCP | Google + Shopify governing council (+ Stripe joined council Apr 28, 2026) | Protocol release `v2026-08-25` (latest); `draft` Lodging spec released Sep 25, 2026 | [S3] |
| x402 | x402 Foundation (Linux Foundation, since Apr 2, 2026); originally Coinbase | V2 (shipped ~Dec 2025): CAIP-2 network IDs, `PAYMENT-SIGNATURE`/`PAYMENT-RESPONSE` headers, modular `@x402/*` packages | [S9][S10][S18] |
| MPP (Machine Payments Protocol) | Stripe + Tempo Labs | Mainnet Mar 18, 2026; IETF individual draft `draft-ryan-httpauth-payment` | [S18] |
| L402 | Lightning Labs | In production since 2020 (as LSAT); "Lightning Agent Tools" bundle released Feb 11, 2026 | [S18] |
| Visa TAP | Visa (+ Cloudflare as primary dev partner) | Developer preview since Oct 14, 2025 | [S22] |
| Visa ICC | Visa | Launched Apr 8, 2026 | [S18] |
| Mastercard Agent Pay / Verifiable Intent | Mastercard | Live transactions in 9 APAC markets + LatAm (10+ issuers); controlled EU pilot with Santander, Mar 2026 | [S18] |
| Amex ACE | American Express | Developer Kit shipped Apr 14, 2026 | [S18] |
| Web Bot Auth | Cloudflare + IETF draft authors | Published May 15, 2025; page updated Jul 15, 2026; still IETF drafts (`web-bot-auth-architecture`, `http-message-signatures-directory`) | [S11] |
| AGNTCY | Cisco → Linux Foundation | Donated Jul 29–30, 2025; 5 founding members (Cisco, Dell, Google Cloud, Oracle, Red Hat) + 65+ supporting companies | [S14] |
| NANDA | MIT Media Lab (Ramesh Raskar) | Research-stage; Phase 1.1/1.2 papers (arXiv:2506.12003, arXiv:2507.14263) | [S15] |
| NLWeb | Microsoft | Open source, MCP-based; no formal version tag | [S16] |

## Timeline

- **2025-09-16/17**: Google announces **AP2** [S1].
- **2025-09-23**: **x402 Foundation** ecosystem work begins; Cloudflare integrates x402 into Workers/MCP tooling and proposes a "deferred" payment scheme [S12].
- **2025-09-29**: **ACP** first spec release (`spec/2025-09-29/`); OpenAI launches **ChatGPT Instant Checkout** with Etsy and 1M+ Shopify merchants [S4][S18].
- **2025-10-14**: **Visa Trusted Agent Protocol (TAP)** developer preview announced [S22].
- **2025-12-12**: ACP spec `2025-12-12` — fulfillment enhancements [S4].
- **2025-12-11** (approx): **x402 V2** ships — CAIP-2 IDs, wallet sessions, multi-chain SDK [S18].
- **2026-01-11/16**: **UCP** public launch (`v2026-01-11`); ACP `2026-01-16` adds capability negotiation [S3][S21][S4].
- **2026-01-19**: **Revolut** announces AP2 support for Revolut Pay (UK/EEA) — one of the earliest live AP2 integrations from a European PI [S18].
- **2026-01-30**: ACP spec `2026-01-30` — extensions, discounts, payment handlers [S4].
- **2026-02-11**: Lightning Labs releases **Lightning Agent Tools** (L402 revival) [S18].
- **2026-03-06/25**: OpenAI **winds down ChatGPT Instant Checkout**; pivots to product-discovery + redirect-to-retailer; ACP itself continues with 7 major retailers live [S20][S18].
- **2026-03-18**: **Stripe/Tempo MPP mainnet** launch, 100+ live directory entries [S18].
- **2026-04-02**: **x402 Foundation** formally launched under the Linux Foundation [S19].
- **2026-04-08**: **Visa Intelligent Commerce Connect (ICC)** launched — multi-protocol bridge [S18].
- **2026-04-17**: ACP spec `2026-04-17` — Cart, Feed API, Orders, Authentication, **MCP module** added [S8].
- **2026-04-24/28**: UCP Tech Council expands to 16 seats; **Stripe joins UCP Governing Council** [S3].
- **2026-04-14**: **Amex ACE Developer Kit** ships [S18].
- **2026-04-28**: Google donates AP2 spec work to **FIDO Alliance** (Agentic Authentication & Payments WGs) [S1].
- **2026-07-16**: UCP **Food Technical Council** formed (Block/Square, DoorDash, Google, Toast, Uber Eats) [S3].
- **2026-08-11**: UCP **Lodging Technical Council** formed (Amadeus, Booking.com, Expedia, Google, Hilton, Marriott, Trip.com) [S3].
- **2026-08-25**: UCP protocol release `v2026-08-25` — major refactor, 3DS2 security improvements, structured request constraints, independent capability versioning, grocery readiness [S3].
- **2026-09-02**: UCP **Payments Technical Council** formed — Adyen, Ant International, Coinbase, Global Payments, Google, PayPal, Shopify, **Stripe** [S3].
- **2026-09-25**: UCP **Lodging: Booking capability** draft spec released [S3].

## Mechanics

### AP2 — mandates, roles, modes [S1]

AP2 defines **five roles**: Shopping Agent (SA, agentic), Credential Provider (CP), Merchant (M), Merchant Payment Processor (MPP-role, not to be confused with Stripe's MPP protocol), Trusted Surface (TS, **must** be non-agentic — it is the only role required to be deterministic code, because it is what renders mandate content to the human and captures their cryptographic signature).

Two **Verifiable Digital Credential** types, each with Open/Closed sub-states:

- **Checkout Mandate** — proves to the merchant that the Shopping Agent is authorized to buy a specific, hash-bound cart. Schema uses `vct: mandate.checkout.1` (closed) / `mandate.checkout.open.1` (open); carries a base64url `checkout_jwt` (the merchant's own signed Checkout object) plus `checkout_hash` binding it cryptographically.
- **Payment Mandate** — proves to the Credential Provider/Network/Merchant Payment Processor that the SA is authorized to pay for that exact checkout, bound via the same `checkout_jwt` hash.

**Modes**:
- *Human Present (Direct)*: user directly signs the **closed** Checkout+Payment Mandate on a Trusted Surface.
- *Human Not Present (Autonomous)*: user signs an **open** Mandate carrying **Constraints** (e.g. `checkout.allowed_merchants`, `checkout.line_items`) and the agent's public key as a `cnf` claim; the agent later self-signs a **closed** Mandate with its own key, and verifiers evaluate the closed Mandate against the open Mandate's constraints. A Merchant can always force the flow back to Human Present by returning an `unresolved_constraint` error.

VERBATIM constraint example [S1]:
```json
{
  "type":  "checkout.line_items",
  "items": [
    {
      "id": "id-shoe-choices",
      "acceptable_items": [
        {"id": "BAB1234", "title": "Red Style"},
        {"id": "FAF1234", "title": "Blue Style"}
      ],
      "quantity": 1
    }
  ]
}
```
Evaluation is literally framed as a **max-flow graph problem** in the spec (constraint-entry nodes → checkout-item nodes, capacities = quantities) [S1].

Cryptography: SD-JWT (RFC 9901) selective disclosure, `sd_hash`/`_sd_alg` for hash binding, RFC 7800 `cnf` claims for key binding, OpenID4VP-style presentation. Four defined errors for every action authorization: `invalid_credential`, `unresolved_constraint`, `invalid_mandate`, `mandates_not_supported` — the last two are explicit **fallback signals** to drop into a traditional non-agentic checkout [S1].

AP2 explicitly says it is "agnostic" to the Checkout object's contents but recommends **UCP's Checkout object** as the canonical payload when used together [S1][S3].

### UCP — capability negotiation and profiles [S3]

UCP models two roles by **direction of capability flow**, not industry: **Platform** (consumes — an agent, app, procurement system) and **Business** (exposes — retailer, supplier). Plus **Credential Provider** and **PSP** for payments.

Discovery is **permissionless**: every Business publishes a machine-readable profile at `/.well-known/ucp`; every Platform request carries a `UCP-Agent` header pointing at its own profile:

VERBATIM [S3]:
```
POST /checkout-sessions HTTP/1.1
UCP-Agent: profile="https://agent.example/profiles/shopping-agent.json"
```

**Capability negotiation is server-selects**: intersect declared capability names → pick highest mutually-supported date version → prune orphaned extensions whose parent capability didn't survive intersection. Capabilities are reverse-domain namespaced (`dev.ucp.shopping.checkout`), letting any vendor mint `org.acme.*` capabilities/extensions without a central registry, while `dev.ucp.*` stays governed by the UCP Tech Council. A `schema` URL **must** resolve under its namespace's authority domain — Platforms **MUST** reject entities that fail this binding [S3].

**Transport is pluggable per service**: REST (OpenAPI 3.1.0), MCP (OpenRPC), A2A (Agent Card), or Embedded (OpenRPC) — a single `dev.ucp.shopping` service can expose all four bindings simultaneously; the Business declares which it supports, the Platform picks what fits.

**Auth**: HTTP Message Signatures (RFC 9421) is the *only* permissionless mechanism — keys are resolved from the same `/.well-known/ucp` profile document (dual-purpose: capabilities + JWK key set in one file). OAuth 2.0, API keys and mTLS remain available but require pre-established trust [S3].

**Payment architecture** decouples instrument acceptance from processing via a **Trust Triangle**: Business↔CP/PSP (pre-existing contract), Platform↔CP/PSP (tokenization interface), Platform↔Business (token/mandate handoff only — credentials flow platform→business only, **never echoed back**). AP2 plugs in as the `dev.ucp.common.payment.ap2_mandate` extension on `checkout` [S3].

VERBATIM cart object shape (abridged) [S3]:
```json
{
  "ucp": { ... },
  "id": "cart_88392A",
  "line_items": [ { "id": "li_1", "item": {...}, "quantity": 1 } ],
  "context": { "address_country": "US", "currency": "USD" },
  "signals": { "dev.ucp.buyer_ip": "...", "dev.ucp.user_agent": "..." },
  "attribution": { "source": "google_search", "medium": "ai_mode", "click_id": "gclid_..." },
  "continue_url": "https://example.com/cart?cart_id=cart_88392A",
  "expires_at": "2026-08-31T12:00:00Z"
}
```
Note the `attribution` block — UCP bakes in ad-attribution fields (`click_id`, `campaign`) at the protocol level, something AP2/ACP do not do explicitly.

### ACP — merchant-owned checkout + delegated payment [S4][S5][S6][S7]

ACP's core design principle: **the merchant remains system of record** for orders/payments/tax; ACP is a thin, versioned REST contract layered on top of existing commerce stacks, not a replacement for them.

**Agentic Checkout API** (`rfc.agentic_checkout.md`, v2026-01-16): session lifecycle `POST /checkout_sessions` → `POST /checkout_sessions/{id}` (update) → `GET` (retrieve) → `POST /checkout_sessions/{id}/complete` → `POST /checkout_sessions/{id}/cancel`. Every response is the **authoritative cart state** the client (ChatGPT) renders. Required headers: `Idempotency-Key` (UUIDv4 recommended, max 255 chars) on every POST, `API-Version`, optional `Signature`+`Timestamp` request signing [S5].

VERBATIM error shape [S5]:
```json
{ "type": "invalid_request", "code": "invalid", "message": "Description", "param": "$.line_items[0].quantity" }
```

**Delegate Payment API** (`rfc.delegate_payment.md`): `POST /agentic_commerce/delegate_payment` tokenizes a card **once**, with an `Allowance` object constraining `reason: "one_time"`, `max_amount`, `currency`, `checkout_session_id`, `merchant_id`, `expires_at` — the agent never gets a reusable card. Idempotency is normative: same key + identical body → replay original response with `Idempotent-Replayed: true`; same key + different body → `422 idempotency_conflict` (permanent, non-retryable); same key + in-flight → `409 idempotency_in_flight` + `Retry-After`. 5xx responses **must not** be cached against the idempotency key [S6].

VERBATIM success response [S6]:
```json
{
  "id": "vt_01J8Z3WXYZ9ABC",
  "created": "2025-09-29T11:00:00Z",
  "metadata": { "source": "agent_checkout", "merchant_id": "acme", "idempotency_key": "idem_abc123" }
}
```

**Payment Handlers** (`rfc.payment_handlers.md`) generalize beyond cards. Two credential schemas matter for practice:
- **SPT (Shared Payment Token)** — `type: "spt"`, `token: "vt_..."` (the vault token from Delegate Payment above) [S7].
- **Agentic Token** — `type: "agentic_token"`, `network: "visa"|"mastercard"` — i.e. ACP is designed to directly carry **Visa/Mastercard's own network-issued agentic tokens** as an alternative credential type, which is the concrete interop point between ACP and the card-network identity protocols [S7].

**2026-04-17 release** added a **Feed API** (push model: merchants `POST /feeds`, `PATCH /feeds/{id}/products` — merchants push catalog data to agent-hosted feeds, not the reverse) and `supported_versions` in version-mismatch errors [S8].

### x402 — HTTP-native micropayments [S9][S10]

Canonical flow (VERBATIM, condensed from spec) [S9]:
1. Client → resource server: plain HTTP request.
2. Server → client: `402 Payment Required` + `PaymentRequirements` (b64, in `PAYMENT-REQUIRED` header, V2).
3. Client picks a `(scheme, network)` pair it supports, builds a `PaymentPayload`, resubmits with `PAYMENT-SIGNATURE` header.
4. Server verifies locally or via a **facilitator**'s `/verify` endpoint.
5. Server settles — directly or via the facilitator's `/settle` endpoint.
6. Server responds `200 OK` + `PAYMENT-RESPONSE` header (b64 settlement receipt), or `402` again on failure.

**Roles**: `resource` (anything HTTP-addressable), `client` (payer), `facilitator` (verifies + broadcasts on-chain, does **not** custody funds), `resource server`. A **scheme** is a *logical* way of moving money (`exact` = fixed amount; `upto` = ceiling, e.g. metered LLM token generation), independent of *network* — `exact` on EVM vs Solana needs separate implementations. **Networks use CAIP-2 IDs** post-V2 (`eip155:8453` for Base, `solana:<genesisHash>`, plus TON, Algorand, Stellar, Aptos, Hedera, Keeta, NEAR, Concordium, XRPL, Cardano) [S10].

**Facilitator choice** (docs' own decision rule) [S10]:
| Goal | Path |
|---|---|
| Fast testnet/local | public `x402.org` facilitator |
| Managed production | a production facilitator provider for your network |
| Full control | self-host or **self-facilitate** inside your own resource server |

**Solana double-settlement bug class**: Solana RPC returns "success" on every re-submission of the same signed tx before confirmation (dedup happens at consensus, not RPC), so a malicious client can replay a payment to unlock multiple resources for one payment. Mitigation: a `SettlementCache` keyed on the tx payload, TTL ~120s (≈2× Solana blockhash lifetime); built into the official SVM facilitator libraries by default [S10].

**Settlement pending / auto-recovery** (V2): if broadcast succeeds but confirmation can't be established (RPC timeout), facilitator returns non-terminal `settlement_pending` with the broadcast tx hash; the resource server retries **exactly once**, and a shared `PendingSettlementStore` (e.g. Redis for multi-replica facilitators) reconciles against the already-broadcast tx instead of double-submitting [S10].

**V1→V2 migration** (practical): header rename `X-PAYMENT`→`PAYMENT-SIGNATURE`, network id string→CAIP-2, package rename `x402-axios`→`@x402/axios`, and a builder pattern replacing "pass wallet client directly": `client.register("eip155:*", new ExactEvmScheme(signer))` [S10].

Cloudflare's contribution: a **`paidTool`** wrapper for MCP servers (VERBATIM code shape, [S12]):
```
this.server.paidTool("square", "Squares a number", 0.01, ...)
```
and a client-side wrapper `withX402Client(mcpClient, { network: "base-sepolia", account })` — i.e., x402 is being positioned as **the** payment layer for paid MCP tool calls, not just paid HTTP resources.

### Web Bot Auth — the shared identity primitive [S11]

Solves: User-Agent strings are trivially spoofed, IP allowlisting is fragile (shared CDN egress, rotating ranges), and per-site bearer tokens don't scale to "every agent, every site."

VERBATIM example request [S11]:
```
GET /path/to/resource HTTP/1.1
Host: www.example.com
User-Agent: Mozilla/5.0 Chrome/113.0.0 MyBotCrawler/1.1
Signature-Agent: signer.example.com
Signature-Input: sig=("@authority" "signature-agent");\
                 created=1700000000;\
                 expires=1700011111;\
                 keyid="ba3e64==";\
                 tag="web-bot-auth"
Signature: sig=abc==
```
`Signature-Agent` points to a discoverable directory (e.g. `crawler.search.google.com`, `operator.openai.com`) from which the origin fetches the public JWK to verify `Signature` (RFC 9421). This is the **same primitive** UCP's key-discovery model uses (profiles double as JWK sets) and that both **Visa TAP** and **Mastercard's** agent-identity layer build on — a rare point of real convergence rather than fragmentation [S11][S22][S18][S3].

### Card-network protocols — identity layer over existing rails [S18][S22]

- **Visa TAP**: developer preview (Oct 14, 2025), RFC 9421-based, "aligned with Web Bot Auth." Carries three signal categories: *Agent Intent* (legitimate purchase intent flag), *Consumer Recognition* (prior-relationship data), optional *Payment Information*. Explicit goal: let merchants **distinguish trusted commerce agents from bot traffic they'd otherwise block** — this is a fraud/bot-defense framing as much as a payments one. Partners: Cloudflare (lead dev partner), Adyen, Ant International, Checkout.com, Coinbase, CyberSource, Elavon, Fiserv, Microsoft, Nuvei, Shopify, Stripe, Worldpay [S22].
- **Visa Intelligent Commerce Connect (ICC)**, Apr 8, 2026: a single Visa-operated endpoint that translates **between** TAP, MPP, ACP, and UCP — i.e. Visa's own product answer to "which protocol wins" is "none, we'll bridge them" [S18].
- **Mastercard Agent Pay / Verifiable Intent**: a **three-layer SD-JWT credential chain** — L1 issuer-bound identity, L2 user-signed intent (optionally with autonomous-mandate constraints, structurally close to AP2's Open Mandate), L3 short-lived agent-signed fulfillment split into network-facing and merchant-facing JWTs. Selective disclosure means the merchant sees the cart but not the payment credential, the network sees authorization but not cart contents. Live transactions across 9 APAC markets + a LatAm rollout (12+ issuers) + a **controlled** EU pilot with Santander (Mar 2026 — press language says "controlled environment," not general commercial rollout). Agent identity for Mastercard's flow is delegated to **Cloudflare Web Bot Auth** [S18].
- **Amex ACE** (Apr 14, 2026): card-rail integration + "Agent Purchase Protection" — Amex's claimed industry-first of extending existing cardmember protections to agent-caused purchase errors [S18].

### Discovery / identity infrastructure for the open agent web

- **AGNTCY** [S14]: donated by Cisco to the Linux Foundation (Jul 29–30, 2025), founding members Cisco, Dell, Google Cloud, Oracle, Red Hat, 65+ supporting companies. Four components: **Agent Discovery** (Open Agent Schema Framework, OASF — lets agents describe/discover each other's capabilities), **Agent Identity** (cryptographically verifiable identity + access control across orgs), **Agent Messaging** (SLIM — Secure Low-latency Interactive Messaging, with a quantum-safe option), **Agent Observability**. This is general multi-agent infrastructure, not commerce-specific, but it's a plausible substrate for future agent-to-merchant discovery.
- **NANDA** [S15]: MIT Media Lab (Camera Culture Group, Ramesh Raskar), research-stage "Internet of AI Agents" — agent registry/index architecture, cross-org discovery+authentication, "trust signals and provenance" in decentralized settings. Two dated papers: Phase 1.1 (arXiv:2506.12003, "index architecture" critique) and Phase 1.2 (arXiv:2507.14263).
- **NLWeb** [S16]: Microsoft, open-source, runs as an **MCP server** exposing an `ask` method over a site's existing Schema.org structured data (products, recipes, reviews — already deployed on 100M+ sites per NLWeb's own framing). Its own tagline: *"NLWeb is to MCP/A2A what HTML is to HTTP"* — i.e. a semantic content layer, not a transport. Directly relevant to agentic commerce as a **product-discovery** substrate complementary to UCP's catalog capability.
- **llms.txt**: still an informal community convention (a root-level Markdown file summarizing a site for LLM consumption), not a standards-body spec; widely discussed since 2024/2025 (SearchEngineLand coverage), still no equivalent of `/.well-known/ucp`-style machine negotiation.

### "Know Your Agent" (KYA)

No canonical, widely-adopted standard or named protocol called "Know Your Agent" was found in primary sources during this research pass (see Unverified). What *does* exist under this conceptual umbrella, cross-checked across sources above, is a cluster of agent-identity primitives that function as KYA in practice: RFC 9421 HTTP Message Signatures (Web Bot Auth, Visa TAP), card-network layered credentials (Mastercard Verifiable Intent), and UCP's profile-based key discovery. Treat "KYA" as an informal industry shorthand (echoing KYC), not a shipped spec, until a primary source is found.

## Numbers

- **UCP partners**: co-developed with Google, Shopify, Etsy, Wayfair, Target, Walmart, Amazon, Microsoft, Meta, Salesforce, Stripe (Shopping vertical); Amadeus, Booking.com, Expedia, Google, Hilton, Marriott, Trip.com (Lodging); DoorDash, Google, Square, Toast, Uber Eats (Food) — per ucp.dev, Sep 2026 [S3].
- **x402 Foundation founding members**: 22 named orgs (Adyen, AWS, American Express, Ampersend.ai, Base, Circle, Cloudflare, Coinbase, Fiserv, Google, KakaoPay, Mastercard, Merit Systems, Microsoft, Polygon Labs, PPRO, Shopify, Sierra, Solana Foundation, Stripe, thirdweb, Visa) — Linux Foundation press release, Apr 2, 2026 [S19].
- **ACP Instant Checkout adoption**: ~12 of "over a million" eligible Shopify merchants ever went live, before wind-down (custena report figure, corroborated independently by thekeyword.co's "minimal merchant adoption" framing) — Mar 2026 [S18][S20].
- **ACP post-wind-down**: 7 major retailers live (Target, Sephora, Nordstrom, Lowe's, Best Buy, Home Depot, Wayfair) — thekeyword.co, ~Mar 25, 2026 [S20].
- **MPP mainnet**: 100+ live directory entries at launch, Mar 18, 2026 (Alchemy, Dune Analytics, Merit Systems, Parallel Web Systems named) — per custena, cross-referencing Tempo Labs' own mainnet blog [S18].
- **Mastercard Agent Pay live markets**: 9 APAC markets (Australia, New Zealand, Singapore, Malaysia, Thailand, India, South Korea, Hong Kong, Taiwan) + LatAm rollout across 12+ issuers — per custena's citation of Mastercard's own March 2026 press release [S18] (unverified independently — Mastercard's own page returned HTTP 403 to this session's fetch).
- **Alipay's Agentic Commerce Trust Protocol**: 120 million AI-initiated transactions in one week, Feb 2026, per Alipay/BusinessWire — cited by custena [S18], not independently re-fetched this session.
- **AP2 collaborator count**: "60+ collaborating organizations" as of the report's writing, spanning card networks, PSPs, neobanks, crypto and enterprise SaaS — per custena citing Google Cloud's own AP2 blog [S18].
- **x402 volume caveats**: InfoQ reported 100M+ lifetime payments through Q1 2026, but Coindesk's Mar 11, 2026 review found *declining* weekly transaction counts, average payment value ~$0.20, and a "substantial fraction" of flagged test/synthetic traffic — a genuine disagreement between vendor-adjacent reporting (InfoQ) and independent reporting (Coindesk); the more skeptical, independently-reported number is newer and better-sourced [S18].
- **x402 SettlementCache TTL**: 120 seconds (~2× Solana blockhash lifetime) [S10].
- **x402 confirmation timeout defaults**: TypeScript `confirmationTimeoutMs` default 180,000 ms (3 min, matches viem); Python `confirmation_timeout_seconds` default 120 [S10].
- **EU AI Act Article 99 penalties**: up to €15M or 3% of global annual turnover for Article 26 (deployer obligations) non-compliance; Article 26 obligations apply from Aug 2, 2026 [S18, citing Regulation (EU) 2024/1689].

## Pitfalls, limits, criticism

- **The flagship consumer use case (in-chat checkout) failed first.** ChatGPT Instant Checkout — the most publicized agentic-commerce product of 2025 — was wound down within ~6 months. Root causes per OpenAI's own statement and reporting: insufficient flexibility, no real-time inventory sync across millions of merchant SKUs, missing merchant-of-record tax infrastructure, and users simply preferring to complete purchases on retailer sites with saved payment info. **The lesson for engineers**: the hard part of agentic checkout is not the payment credential (AP2/ACP solve that cleanly) — it's catalog freshness, tax/compliance plumbing, and habit change on the buyer side [S20][S18].
- **B2B agent-to-API monetization (x402/MPP/L402 paying for tool calls) looks healthier than consumer in-chat retail checkout** — the unit economics and UX friction are structurally different problems, and conflating them in a "will agentic commerce work" argument is a category error [S18].
- **x402 volume claims are contested.** Press-release-adjacent numbers (100M+ lifetime payments) diverge sharply from independent on-chain analysis (declining weekly counts, ~$0.20 average value, meaningful synthetic/test traffic share). Treat any single-source volume claim in this space with the same skepticism you'd apply to unaudited crypto TVL numbers [S18].
- **Solana settlement race condition** is a real, documented double-spend class in x402/facilitator deployments that self-settle without a cache — not theoretical [S10].
- **No protocol interoperates natively.** AP2, ACP, UCP, x402, MPP, L402, TAP, Agent Pay, ACE were each shipped independently by different consortia in under 12 months; the "convergence" that exists is mostly *the same companies joining multiple efforts*, not technical interop, with the partial exception of the RFC 9421 identity layer (Web Bot Auth / TAP / Mastercard) and Visa's ICC translation layer, which is itself a single-vendor bridge, not a standard [S18].
- **AP2 is explicitly not a payment protocol** — it produces evidence/authorization artifacts; actual money movement always happens on some other rail (card network, ACH, stablecoin). Conflating "we support AP2" with "we can settle payments" is a common confusion to correct for readers [S1].
- **Selective disclosure is not privacy by default** — it requires the issuer, holder and verifier to implement SD-JWT correctly; AP2's spec repeatedly flags this as an area needing more real-world hardening (e.g. no production PyPI package for the AP2 SDK yet at time of the FAQ) [S1].
- **Mastercard's "Europe's first" claim needs a footnote**: the Santander pilot is explicitly a **controlled environment** per Mastercard's own press framing, not a general commercial EU rollout — some secondary coverage blurred this distinction [S18].
- **Regulatory exposure sits on the buyer/deployer, not the API seller.** A merchant or MCP-server operator accepting agent payments does not itself acquire EU AI Act Article 26 deployer obligations merely by being paid by an agent — but its enterprise customers increasingly *demand* credential formats (AP2 Mandates, Mastercard Verifiable Intent) that make Article 26 compliance easy to bolt on, which is now a de facto procurement filter in regulated sectors [S18].
- **Prompt-injection-driven purchases** are the concrete threat AP2's "Verifiable Intent, Not Inferred Action" principle exists to counter: a hijacked shopping agent that tries to check out an attacker-chosen cart cannot produce a valid signature over that cart's hash without the user (or a correctly-scoped Open Mandate) having authorized it — this is a structural mitigation, not a guarantee, since a sufficiently broad Open Mandate (loose constraints, long expiry) still lets a compromised agent transact freely within that envelope [S1].

## What changed in the last 6 months (since ~March 2026)

- ChatGPT Instant Checkout wound down (Mar 2026); ACP pivoted to a "protocol survives, flagship product doesn't" story with 7 major retailers live directly [S20].
- Stripe/Tempo's MPP went to mainnet (Mar 18, 2026) — the newest of the three HTTP-402 protocols, and the only one natively bridging fiat and multiple crypto rails in one envelope [S18].
- x402 Foundation formally launched under the Linux Foundation (Apr 2, 2026), with essentially every major payments/tech incumbent as a founding member except PayPal and Ant International [S19][S18].
- Visa ICC launched (Apr 8, 2026) as an explicit multi-protocol bridge — the clearest institutional signal that no single protocol will dominate [S18].
- AP2 spec stewardship moved into FIDO Alliance's technical working groups (Apr 28, 2026) [S1].
- Amex ACE shipped (Apr 14, 2026) [S18].
- UCP underwent a major structural release (`v2026-08-25`: multi-vertical refactor, 3DS2, independent capability versioning) and stood up three new vertical Technical Councils (Food Jul 16, Lodging Aug 11, Payments Sep 2, 2026) plus a draft Lodging Booking capability (Sep 25, 2026) — UCP is visibly the most actively-governed of the commerce-layer protocols right now [S3].
- Stripe joined **both** the UCP Governing Council (Apr 28) and the UCP Payments Technical Council (Sep 2) while remaining an ACP co-maintainer and x402 Foundation member — the single clearest example of a vendor deliberately not picking a side [S3][S18].

## Diagram candidates

1. **The layered agentic-commerce stack** — 4 horizontal bands (Commerce: UCP/ACP → Identity/Auth: AP2/TAP/Agent Pay/ACE → Payment: x402/MPP/L402 → Settlement: cards/stablecoins/Lightning/bank rails), with arrows showing which protocols in each band reference which protocol in the band below [S18].
2. **AP2 Mandate state machine** — states: Open Checkout Mandate → Closed Checkout Mandate; Open Payment Mandate → Closed Payment Mandate; actors: User, Trusted Surface, Shopping Agent, Merchant, Credential Provider, Network; label the signing key at each transition (`user_sk` vs `agent_sk`) [S1].
3. **AP2 Human-Present vs Human-Not-Present sequence diagram** (two side-by-side swimlanes) — actors: User, Shopping Agent, Trusted Surface, Merchant, Credential Provider, MPP, Network; show where the `unresolved_constraint` error can force Not-Present back to Present [S1].
4. **UCP capability negotiation** — Platform profile ∩ Business profile → version selection → extension pruning; show the `/.well-known/ucp` document containing both `capabilities{}` and `keys[]` [S3].
5. **UCP Trust Triangle** — three nodes (Business, Platform, Payment Credential Provider/PSP), three labeled edges (pre-existing contract; tokenization interface; token/mandate handoff, one-directional arrow platform→business) [S3].
6. **ACP checkout + delegate payment sequence** — actors: ChatGPT (agent), Merchant server, Stripe/PSP; show `checkout_sessions` lifecycle calls interleaved with the single `delegate_payment` call and the resulting SPT vs Agentic Token fork [S5][S6][S7].
7. **x402 request/retry flow** — Client, Resource Server, Facilitator, Blockchain; annotate the two headers (`PAYMENT-SIGNATURE` request, `PAYMENT-RESPONSE` response) and the `verify`/`settle` facilitator calls [S9][S10].
8. **x402 Solana double-settlement race** — timeline diagram: two concurrent `/settle` calls with the same tx payload racing against one confirmation, and the `SettlementCache` blocking the second [S10].
9. **Web Bot Auth signature + directory lookup** — Agent (signer), Origin server, Directory (JWK endpoint referenced by `Signature-Agent`); show the RFC 9421 header set [S11].
10. **Card-network identity convergence** — Venn-style diagram showing Visa TAP, Mastercard Agent Pay, and Web Bot Auth all sitting on the shared RFC 9421 primitive, with ICC drawn as a bridging node touching TAP/MPP/ACP/UCP [S18][S22][S11].
11. **Discovery substrate map** — AGNTCY (OASF+SLIM), NANDA (index/registry), NLWeb (MCP+Schema.org), llms.txt, positioned as layers below any commerce-specific discovery (UCP's `/.well-known/ucp`) [S14][S15][S16][S3].

**Chart candidates**: no clean numeric time series with consistent methodology was found in primary sources this pass (x402 volume numbers are contested between InfoQ and Coindesk — see Numbers/Pitfalls — and would need the actual dashboards, e.g. Artemis's x402 dashboard, pulled live rather than quoted secondhand) [S18].

## Glossary

- **Mandate (AP2)**: a Verifiable Digital Credential (SD-JWT) that authorizes either a checkout or a payment; exists Open (constraint-bearing, pre-authorization) or Closed (bound to one specific transaction).
- **Trusted Surface (AP2)**: the mandatory non-agentic UI that captures user authentication/consent and produces the user-signed Mandate.
- **Checkout Mandate / Payment Mandate (AP2)**: the two AP2 credential types — see Mechanics.
- **VDC (Verifiable Digital Credential)**: an issuer-signed, cryptographically verifiable claim set; AP2's Mandates are VDCs.
- **Shared Payment Token / SPT (ACP)**: a vault token (`vt_...`) returned by ACP's Delegate Payment API, scoped to one checkout session and amount.
- **Agentic Token (ACP/card networks)**: a Visa- or Mastercard-issued network token usable as an ACP payment credential, bridging ACP to the card networks' own agent-identity rails.
- **Checkout session (ACP)**: the stateful object (`checkout_sessions/{id}`) that is the authoritative source of cart truth throughout an ACP flow.
- **Capability (UCP)**: a versioned, reverse-domain-namespaced unit of merchant functionality (e.g. `dev.ucp.shopping.checkout`) that Platforms and Businesses negotiate by intersection.
- **UCP-Agent header**: the header a UCP Platform sends on every request, pointing to its own discoverable profile.
- **Facilitator (x402)**: a third-party service that verifies and settles x402 payments on-chain without custodying funds.
- **Scheme vs Network (x402)**: scheme = logical money-movement pattern (`exact`, `upto`, `batch-settlement`); network = the specific chain (CAIP-2 ID) it's implemented on.
- **CAIP-2**: Chain Agnostic Improvement Proposal 2 — the `namespace:reference` network identifier format x402 V2 adopted (e.g. `eip155:8453`).
- **Web Bot Auth**: Cloudflare-led scheme for agent/bot HTTP identity using RFC 9421 signatures plus a discoverable key directory referenced by `Signature-Agent`.
- **RFC 9421**: HTTP Message Signatures — the shared cryptographic primitive underlying Web Bot Auth, UCP auth, Visa TAP, and Mastercard's agent identity layer.
- **OASF (Open Agent Schema Framework)**: AGNTCY's schema for describing and discovering agent capabilities.
- **SLIM**: AGNTCY's Secure Low-latency Interactive Messaging protocol for agent-to-agent communication.
- **Merchant of Record (MoR)**: the legal/financial entity owning a transaction's liability and compliance obligations; both UCP and ACP insist the Business/Merchant keeps this role, not the platform/agent.

## Unverified / open questions

- **"Know-Your-Agent" (KYA) as a named, shipped standard**: not found. Tried HN Algolia searches ("Know Your Agent KYA fraud", "agent identity verification commerce", "Cloudflare agent fraud prevention") and general web searches (WebSearch tool was unavailable this session — quota exhausted before this research began); found only informal usages and adjacent concepts (RFC 9421-based identity, Mastercard Verifiable Intent). Flagged as informal industry shorthand, not a spec, pending a primary source.
- **Mastercard's own press release** on the Santander/Europe pilot returned HTTP 403 to this session's fetch; the figures and framing above are sourced to a secondary report (custena, [S18]) that itself cites the Mastercard release — not independently re-verified against Mastercard's own page text.
- **Alipay's 120M-transactions-in-a-week figure** and **AP2's "60+ collaborating organizations"** figure are both taken from the custena report's citations of a BusinessWire release and a Google Cloud blog respectively; neither underlying page was independently re-fetched this session.
- **x402 true production volume**: actively disputed between InfoQ (100M+ lifetime payments) and Coindesk's independent on-chain review (declining volume, ~$0.20 average, meaningful synthetic-traffic share) — no way to resolve this without pulling the Artemis or Dune x402 dashboards live, which this session did not do.
- **WebSearch tool was unavailable for the entirety of this research session** ("this session has used its web search budget (200 of 200)" — likely a shared quota across a multi-agent workflow, not this task alone). All research here was done via direct `curl`/`WebFetch` against known or HN-Algolia-discovered URLs; this likely missed some 2026 coverage that a live web search would have surfaced (e.g. very recent Visa/Mastercard/Google blog posts from September 2026, AP News and CNBC pieces referenced only by title via HN metadata and never actually opened).
- **NLWeb's authorship attribution** (commonly associated with R.V. Guha in community commentary) was not confirmed in the primary README fetched this session.
- **llms.txt** has no confirmed machine-negotiable counterpart to UCP's `/.well-known/ucp` profile model as of this research; whether it will formalize into something commerce-agents actually query at runtime (vs. being consumed by crawlers/LLM training/RAG pipelines) is open.

## Sources

- [S1] "AP2 — Agent Payments Protocol Documentation" (llms-full.txt), Google / AP2 project, ap2-protocol.org, no single publication date on page (v0.2 spec dated 2025; FAQ references Apr 28, 2026 FIDO donation), accessed 2026-09-30. https://ap2-protocol.org/llms-full.txt
- [S2] "Agent Payments Protocol (AP2)" README, google-agentic-commerce/AP2 GitHub repo, accessed 2026-09-30. https://raw.githubusercontent.com/google-agentic-commerce/AP2/main/README.md
- [S3] "Universal Commerce Protocol (UCP)" (llms-full.txt), ucp.dev, content includes announcements dated through 2026-09-25, accessed 2026-09-30. https://ucp.dev/llms-full.txt
- [S4] "Agentic Commerce Protocol (ACP)" README, agentic-commerce-protocol GitHub repo (OpenAI + Stripe), accessed 2026-09-30. https://raw.githubusercontent.com/agentic-commerce-protocol/agentic-commerce-protocol/main/README.md
- [S5] "RFC: Agentic Checkout — Merchant REST API", v2026-01-16, ACP repo, accessed 2026-09-30. https://raw.githubusercontent.com/agentic-commerce-protocol/agentic-commerce-protocol/main/rfcs/rfc.agentic_checkout.md
- [S6] "RFC: Agentic Commerce — Delegate Payment API", ACP repo, accessed 2026-09-30. https://raw.githubusercontent.com/agentic-commerce-protocol/agentic-commerce-protocol/main/rfcs/rfc.delegate_payment.md
- [S7] "RFC: Agentic Commerce — Payment Handlers", ACP repo, accessed 2026-09-30. https://raw.githubusercontent.com/agentic-commerce-protocol/agentic-commerce-protocol/main/rfcs/rfc.payment_handlers.md
- [S8] "Version 2026-04-17" changelog, ACP repo, published 2026-04-17, accessed 2026-09-30. https://raw.githubusercontent.com/agentic-commerce-protocol/agentic-commerce-protocol/main/changelog/2026-04-17.md
- [S9] "x402" README, coinbase/x402 (dev fork; canonical repo moved to x402-foundation/x402), accessed 2026-09-30. https://raw.githubusercontent.com/coinbase/x402/main/README.md
- [S10] x402 documentation (llms-full.txt), docs.x402.org, includes V1→V2 migration guide and 2026 feature docs, accessed 2026-09-30. https://docs.x402.org/llms-full.txt
- [S11] "Web Bot Auth", Cloudflare, published 2025-05-15, modified 2026-07-15, accessed 2026-09-30 (via summarized fetch). https://blog.cloudflare.com/web-bot-auth/
- [S12] Cloudflare blog on x402 Foundation / MCP paid-tool integration, published 2025-09-23, accessed 2026-09-30 (via summarized fetch). https://blog.cloudflare.com/x402/
- [S13] Cloudflare, "Introducing pay per crawl", published 2025-07-01 (dated via HN Algolia metadata), accessed 2026-09-30. https://blog.cloudflare.com/introducing-pay-per-crawl/
- [S14] "AGNTCY: Building Infrastructure for the Internet of Agents" (Outshift/Cisco) and Linux Foundation press release, donation dated 2025-07-29/30, accessed 2026-09-30 (via summarized fetch). https://outshift.cisco.com/blog/agntcy-donated-to-linux-foundation ; https://www.linuxfoundation.org/press/linux-foundation-welcomes-the-agntcy-project-to-standardize-open-multi-agent-system-infrastructure-and-break-down-ai-agent-silos
- [S15] "Project NANDA" overview, MIT Media Lab, accessed 2026-09-30 (via summarized fetch). https://www.media.mit.edu/groups/nanda/overview/
- [S16] "NLWeb" README, microsoft/NLWeb GitHub repo, accessed 2026-09-30 (via summarized fetch of raw README).
- [S17] "Tempo" website, tempo.xyz (Stripe + Paradigm), accessed 2026-09-30 (via summarized fetch). https://tempo.xyz
- [S18] August Lorenzen (Genesis Software Group / Custena), "The State of Agent Payment Protocols (April 2026)", published April 2026, GitHub custena/agent-payment-protocols — **vendor-authored landscape report; treat claims not independently cross-verified in this file as secondary**, accessed 2026-09-30. https://raw.githubusercontent.com/custena/agent-payment-protocols/main/README.md
- [S19] Linux Foundation, "Linux Foundation is Launching the x402 Foundation...", published 2026-04-02, accessed 2026-09-30 (via summarized fetch). https://www.linuxfoundation.org/press/linux-foundation-is-launching-the-x402-foundation-and-welcoming-the-contribution-of-the-x402-protocol
- [S20] "OpenAI Ends Instant Checkout in ChatGPT", thekeyword.co, reporting dated ~2026-03-25 (event itself announced by OpenAI ~2026-03-06/25), accessed 2026-09-30 (via summarized fetch; secondary/aggregator source, not verified as an official Google/OpenAI channel). https://www.thekeyword.co/news/openai-chatgpt-instant-checkout-scrapped
- [S21] Google Developers Blog, "Under the hood: Universal Commerce Protocol (UCP)", published 2026-01-11, accessed 2026-09-30 (via summarized fetch). https://developers.googleblog.com/under-the-hood-universal-commerce-protocol-ucp/
- [S22] Visa Investor Relations, "Visa Introduces Trusted Agent Protocol — An Ecosystem-Led Framework for AI Commerce", published 2025-10-14, accessed 2026-09-30 (via summarized fetch). https://investor.visa.com/news/news-details/2025/Visa-Introduces-Trusted-Agent-Protocol-An-Ecosystem-Led-Framework-for-AI-Commerce/
- [S23] Hacker News (Algolia API) search results, used to date and locate several of the above primary sources and to cross-check the ACP/x402/UCP/AGNTCY/NANDA/NLWeb timeline; queried 2026-09-30. https://hn.algolia.com/api/v1/search
