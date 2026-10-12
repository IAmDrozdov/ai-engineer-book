# AP2, UCP и интернет агентов — field-report notes

Lens: what real engineers say (HN, Reddit-adjacent, GitHub issues, Habr, X) about agentic-commerce
protocols, not vendor marketing. Compiled 2026-09-30. All dates are as stated by sources; "accessed
2026-09-30" applies to every URL below unless noted.

## TL;DR (what an engineer must know today)

1. There is **no single winning protocol** — the stack has separated into layers: commerce/catalog
   (UCP, ACP), authorization/identity (AP2, Visa TAP, Mastercard Agent Pay), and payment/settlement
   (x402, Stripe's Machine Payments Protocol/Tempo, card rails) [S19][S1][S6][S7].
2. **AP2 changed its own vocabulary mid-flight.** The original Sept-2025 launch used "Intent
   Mandate / Cart Mandate / Payment Mandate"; the current v0.2 spec (fetched 2026-09-30) only
   defines **Checkout Mandate** and **Payment Mandate**, and AP2 is now framed as a *security
   extension* on top of UCP, not a standalone commerce protocol [S1].
3. **AP2 was donated to the FIDO Alliance** for standardization (announced ~2026-04-28) — it is
   moving from "Google's protocol" toward a multi-vendor standard track [S1][S24].
4. **ACP (OpenAI+Stripe) uses date-versioned specs** (`2025-09-29`, `2025-12-12`, `2026-01-16`,
   `2026-01-30`, `2026-04-17`), governed by an SEP (Spec Enhancement Proposal) process, Apache-2.0,
   CLA required [S6].
5. **UCP (Google + Shopify + a long partner list) is the newest layer**, launched publicly
   ~2026-01-11/12, and is explicitly the "commerce" substrate that AP2 now plugs into as its trust
   layer; UCP supports REST and JSON-RPC transports with built-in AP2/A2A/MCP support [S4][S5][S12].
6. **x402 moved from a Coinbase project to the x402 Foundation under the Linux Foundation**,
   announced 2026-04-02, with founding members reported to include Visa, Mastercard, Amex, Stripe,
   Google, AWS, Cloudflare [HN comment, S9][S19].
7. **Independent security researchers found real, exploitable bugs in AP2's reference
   implementation** within weeks of v0.2 shipping: a payment-mandate replay bug (one user consent
   redeemable for multiple charges) and a "presence-driven" constraint-evaluation bug where
   withholding a disclosed constraint (e.g. Budget) silently disables its enforcement — a 7,500 INR
   charge passes against a 5,000 INR cap simply because the cap wasn't disclosed [S2].
8. **Real-world x402 adoption is thin.** TRM Labs' on-chain analysis (cited secondhand, see
   Unverified) put agent-driven traffic at 0.6–7.5% of x402 dollar volume; a solo Habr developer who
   built a paid x402 API for code audits found essentially zero organic agent traffic (6 log entries,
   all his own tests) after finding and fixing four infra bugs [S15].
9. **The community's biggest complaint about ACP/UCP checkout is incentive alignment**, not
   technical: merchants pay a completion fee, so "Instant Checkout items are not preferred in
   product results" (OpenAI's own words) was immediately read by HN as an unenforceable promise —
   see the 362-comment thread [S8].
10. **Cloudflare's Web Bot Auth (RFC 9421 HTTP Message Signatures + a directory draft) is the de
    facto agent-identity layer for "can this bot reach my site,"** separate from payment — it lets
    a site allowlist signed agents instead of CAPTCHA-walling them, but critics call it "Cloudflare
    as centralized gatekeeper" [S10].
11. **A parallel non-Western stack exists and is already live at scale**: Yandex's Commerce
    Protocol (YCP, announced 2026-02-27) ships checkout inside the Alice assistant for 3,500+ shops,
    reporting 19M weekly Alice users and 30% of Alice purchases via "universal checkout" as of May
    2026 [S17][S18].
12. **"Know Your Agent" (KYA) is an emerging, still-informal concept**, proposed publicly by Esther
    Dyson (2026-05-05) as a `.agent` ICANN-style registry tying every public agent to an accountable
    human/org, explicitly modeled on KYC — not yet a shipped protocol [S22].
13. **llms.txt-style "AI readability" files are contested even among their own advocates**: a
    CommerceTXT (llms.txt-for-shopping) Show-HN launch drew sustained pushback for reinventing
    Schema.org/JSON-LD badly, for a "Trust Score" with no verification mechanism, and for putting a
    file at the web root instead of `/.well-known/` [S13]. Separately, an analysis of 10 sites found
    llms.txt adoption did not measurably boost AI-driven traffic [S23 — title/claim only, see
    Unverified].
14. **Liability is explicitly unsolved and explicitly a human problem.** A Sept-2026 Habr piece
    argues "агента нельзя засудить" (you cannot sue an agent) and that laws like California AB 316
    remove the "autonomous AI" legal defense — responsibility routes back to whoever built/deployed
    the agent, not the agent itself [S16]. AP2's own spec frames this as its core design problem
    ("Accountability... who is accountable?") [S1].
15. Cross-link: agent identity/signing mechanics here (Web Bot Auth, AP2 Trusted Surface, agent
    keys) overlap heavily with **Chapter 15 (Integrations & Auth)** and **Chapter 16 (Security)** —
    this chapter covers the commerce-specific instantiation only; general OAuth/agent-auth patterns
    belong there. Discovery mechanisms (agent cards, `.well-known` manifests) overlap with
    **Chapter 07 (A2A)** and **Chapter 05 (MCP)**.

## Current state and versions (as of 2026-09-30)

- **AP2**: v0.2, per the repo docs (`docs/ap2/specification.md` header: "Agentic Payment Protocol
  (v0.2)"). Donated to FIDO Alliance ~2026-04-28 for formal standardization; the docs site frames
  AP2 as "an extension for the open-source A2A protocol and Universal Commerce Protocol," a
  narrower framing than the original Sept-2025 "standalone commerce protocol" pitch [S1][S3][S24].
- **ACP**: current stable spec `2026-04-17` ("Cart, feed, orders, authentication, and MCP"); status
  badge on the repo reads `Beta`; governed jointly by OpenAI and Stripe with a CLA + SEP process
  [S6].
- **UCP**: no single version number surfaced in the fetched docs; publicly described as covering
  Catalog Search, Cart, Checkout, Identity Linking (OAuth 2.0), Order Management (webhooks), with a
  "Lodging draft specification now available" and "Food coming soon" — i.e. it is actively expanding
  vertical coverage as of the access date [S5].
- **x402**: the `coinbase/x402` repo now states it "moved... under the x402 Foundation," with
  `coinbase/x402` demoted to "a development fork" of `x402-foundation/x402` [S7]. The Foundation
  launch under the Linux Foundation was announced 2026-04-02 per a comment quoting the press release
  verbatim on HN [S9, comment by user `petcat`].
- **Web Bot Auth**: IETF draft stage (`draft-meunier-http-message-signatures-directory-01` is the
  key directory draft cited in the HN thread), implemented by Cloudflare in production since at
  least Aug 2025 [S10].
- **NANDA** (MIT Media Lab): research-stage, publishing papers (e.g. "Phase 1.2: NANDA Index Paper")
  rather than a shipped production protocol as of the access date [S21].
- **AGNTCY**: Linux-Foundation-hosted, donated by Cisco (per HN listing metadata, mid-2025), ships
  concrete components — Agent Directory Service, SLIM messaging, OASF schema, an identity layer, a
  hardened runtime (SHADI) — positioned as A2A/MCP-compatible infrastructure, not a competitor
  protocol [S20].
- **Yandex Commerce Protocol (YCP)**: announced 2026-02-27, merchant onboarding began May 2026,
  described by Yandex as "the first protocol in the country" for AI-assistant commerce [S17][S18].

## Timeline (dated, verifiable)

- **2025-08-28** — Cloudflare's Web Bot Auth reference/spec page hits HN front page (82 pts, 74
  comments) [S10].
- **2025-09-16** — Google announces AP2 ("Agent Payments Protocol") via Cloud blog [S1 index.md
  links; HN id 45262858 referenced inside thread S8].
- **2025-09-23** — x402.org public launch thread on HN, 228 pts / 147 comments [S11].
- **2025-09-29** — OpenAI + Stripe announce **Instant Checkout** and the **Agentic Commerce
  Protocol**; ACP spec `2025-09-29` is the "Initial release" per the changelog [S6][S8].
- **2025-12-12** — ACP spec revision: "Fulfillment enhancements" [S6].
- **2026-01-11/12** — Google (with Shopify and other retail/travel partners) publicly launches
  **UCP**, the "Universal Commerce Protocol" [S4][S5][S12].
- **2026-01-16** — ACP spec revision: "Capability negotiation" [S6]. (Same date appears as the
  version header on the ACP "Agentic Checkout" RFC fetched directly: `Version: 2026-01-16` [S6].)
- **2026-01-20** — Search Engine Land publishes an analysis concluding llms.txt did not measurably
  lift AI-driven traffic across 10 tested sites (title/claim per HN listing; full text blocked from
  fetch — see Unverified) [S23].
- **2026-01-22** — ACP "Payment Handlers" RFC drafted, consolidating `payment_methods` into
  self-describing handler objects and making `delegate_payment` the recommended default [S6].
- **2026-01-27** — ACP "Extensions Framework" RFC drafted [S6].
- **2026-01-30** — ACP spec revision: "Extensions, discounts, payment handlers" [S6].
- **2026-02-16** — (Habr, secondary report) Stripe launches "Machine Payments" — accepting payments
  from AI agents via USDC and the x402 protocol [S15-adjacent Habr RSS listing].
- **2026-02-27** — Yandex announces the Yandex Commerce Protocol (YCP) [S17].
- **2026-03-13** — HN "Ask HN: Has anyone built an AI agent that spends real money?" — a genuine
  practitioner thread, not an announcement [S14].
- **2026-04-02** — x402 Foundation launched under the Linux Foundation, x402 protocol contributed by
  Coinbase; founding members reportedly include Visa, Mastercard, Amex, Stripe, Google, AWS,
  Cloudflare (per a verbatim-quoted press release in an HN comment) [S9].
- **2026-04-17** — ACP spec revision: "Cart, feed, orders, authentication, and MCP" — adds a
  **push-model Feed API** (`POST /feeds`, `PATCH /feeds/{id}/products`) so merchants push catalog
  data to agent-hosted feed services rather than agents crawling merchant endpoints; adds
  `supported_versions` to version-mismatch errors; adds 3DS authentication-outcome examples [S6].
- **2026-04-28** — Google donates AP2 to the FIDO Alliance for standards development [S1 index.md;
  S24].
- **2026-05-05** — Esther Dyson publishes "Know Your .agent?" proposing a `.agent` TLD/registry and
  the KYA concept [S22].
- **2026-06-10** — AP News reports Visa integrating its payment network with ChatGPT for agentic
  shopping (title/date only — fetch blocked, see Unverified) [S29].
- **2026-07-01** — Cloudflare launches "Monetization Gateway," using x402 to let any site charge
  agents per request; 355-point / 251-comment HN debate follows [S9].
- **2026-08-21** — Habr survey "Когда покупки станут диалогом агентов" documents MCP 2.0 (stateless
  sessions, late July 2026), Google's Universal Cart expanding across Search/Gemini/YouTube
  (2026-07-29, US-only direct YouTube ad purchases), and "Agent Plugins 1.0.0" (2026-08-06,
  Amazon/Microsoft/OpenAI/Vercel) [S18].
- **2026-09-22..24** — Habr publishes the "you can't sue an agent" liability piece and the solo-dev
  x402 build/bug-hunt report — both within the last week of this research window [S16][S15].

## Mechanics

### AP2: roles, mandates, flows (primary source, `google-agentic-commerce/AP2` docs, v0.2)

AP2 defines **five roles**: Shopping Agent (SA), Credential Provider (CP), Merchant (M), Merchant
Payment Processor (MPP), Trusted Surface (TS). A single entity may play several roles. The spec
splits roles into *Agentic* (communication handled by a non-deterministic LLM — Merchant, MPP, and
CP *may* be agentic; the Shopping Agent *is expected to be* agentic) vs *Non-Agentic* (deterministic
code only — the Trusted Surface **MUST** be non-agentic) [S1, `specification.md`, `implementation_considerations.md`].

> VERBATIM [S1, specification.md]: "AP2 assumes that, at a minimum, the Shopping Agent is agentic.
> ... When communication happens between two non-agentic Roles, standard web security is sufficient
> to ensure integrity. However, when either role is agentic, then the Agent itself is a potential
> attacker."

Two Mandate types (both **Verifiable Digital Credentials**, SD-JWT-based):

- **Checkout Mandate** — `vct: mandate.checkout.1` (closed) / `mandate.checkout.open.1` (open).
  Created by the Shopping Agent, rendered by the Trusted Surface, verified by the Merchant. Binds to
  a merchant-signed `checkout_jwt` via `checkout_hash` (base64url SHA-256 of the JWT). Constraint
  types: `checkout.allowed_merchants`, `checkout.line_items`.
- **Payment Mandate** — `vct: mandate.payment.1` / `mandate.payment.open.1`. Constraint types:
  `payment.agent_recurrence`, `payment.allowed_payees`, `payment.allowed_payment_instrument`,
  `payment.allowed_pisp` (Payment Initiation Service Provider), amount-range, budget, execution-date.

VERBATIM `payment.agent_recurrence` example [S1, `payment_mandate.md`]:
```json
{
  "type": "payment.agent_recurrence",
  "frequency": "MONTHLY",
  "max_occurrences": 12
}
```

VERBATIM `checkout.line_items` constraint example [S1, `checkout_mandate.md`] — this is how AP2
expresses "buy one of these red/blue shoes plus these exact socks" as a cryptographically checkable
constraint:
```json
{
  "type":  "checkout.line_items",
  "items": [
    {
      "id": "id-shoe-choices",
      "acceptable_items": [
        {"id": "BAB1234", "title": "Red Style"}
        {"id": "FAF1234", "title": "Blue Style"}
      ],
      "quantity": 1
    },
    {
      "id": "id-sock-choices",
      "acceptable_items": [
        {"id": "QRT1234", "title": "The Best Socks"}
      ],
      "quantity": 1
    }
  ]
}
```

**Human-Present vs Human-Not-Present** [S1, `flows.md`]:

> VERBATIM: "Human Present: The User directly approves the closed Checkout and Payment Mandates.
> Human Not Present: The User approves open Checkout and Payment Mandates while the Agent, acting
> autonomously, presents them along with Agent-signed closed Checkout and Payment Mandates. ... A
> Human Not Present flow can be turned into a Human Present flow by the Merchant (or Credential
> Provider) returning an `unresolved_constraint` error and bringing the User back into the loop."

Human-Present flow (2 phases, 9 payment-phase steps): user shops → agent assembles cart → merchant
signs Checkout → agent fetches instrument options from CP → agent builds Mandate Content → Trusted
Surface renders it, gets biometric consent, signs with `user_sk` → agent sends Payment Mandate to CP
(gets a payment token, possibly network-scoped) → agent sends token + Checkout Mandate to Merchant →
Merchant verifies against live cart state → MPP verifies binding of Payment Mandate to
`checkout_jwt` hash → Payment Receipt + Checkout Receipt returned.

Human-Not-Present flow splits shopping into **1a (Human Present: user delegates via *open* mandates
with constraints)** and **1b (Human Not Present: agent autonomously builds the actual checkout)**,
then a payment phase where the agent's own signed *closed* mandates (bound to the user's *open* ones)
authorize the transaction without further human action.

**Relation to A2A/MCP/UCP** [S1, `index.md`]: "AP2... is available as an extension for the
open-source Agent2Agent (A2A) protocol and Universal Commerce Protocol with more integrations in
progress." The FAQ explicitly punts x402 integration: "As a first step, check out
`google-agentic-commerce/a2a-x402`... We will be aligning this closely with AP2 over time."

### AP2's own accountability framing (why the protocol exists)

VERBATIM [S1, `overview.md`]: "Autonomous agents shatter this assumption. When an agent initiates a
payment, fundamental questions arise that current systems are ill-equipped to answer: Authorization
& Auditability... Authenticity of Intent... Agent Error and 'Hallucination'... Accountability: In
the event of a fraudulent or erroneous transaction, who is accountable?"

### UCP: the commerce substrate AP2 now sits on

UCP (co-developed by Google, Shopify, and — per its site — Etsy, Wayfair, Target, Walmart, Amazon,
Microsoft, Meta, Salesforce, Stripe, plus lodging partners Amadeus, Booking.com, Expedia, Hilton)
defines: Catalog Search (free-text, category filter, batch retrieval), Cart, Checkout (dynamic
pricing/tax), Identity Linking (OAuth 2.0, `/.well-known/oauth-authorization-server`), Order
Management (webhooks for status/tracking) [S5]. Transports: **REST and JSON-RPC**, with built-in AP2,
A2A, and MCP support [S5]. UCP's own docs state: "businesses retain control and remain the Merchant
of Record, with full ownership of customer relationships" [S5] — directly answering the HN worry that
UCP/AP2 are just another Apple-Pay-style walled garden [S12, comment thread].

AP2's checkout mandate spec explicitly defers the *commerce protocol itself* to UCP: "when used with
the Universal Commerce Protocol, this MUST be the Checkout object" [S1, `checkout_mandate.md`].

### ACP: checkout sessions, delegated payment, feeds (primary source, verbatim RFCs)

ACP's **Agentic Checkout Specification (ACS)** is a REST contract merchants implement; the merchant
remains system of record for orders/payments/tax. Lifecycle: `POST /checkout_sessions` (create) →
`POST /checkout_sessions/{id}` (update) → `GET /checkout_sessions/{id}` (retrieve) →
`POST /checkout_sessions/{id}/complete` (finalize, creates an Order) →
`POST /checkout_sessions/{id}/cancel` [S6, `rfc.agentic_checkout.md`].

VERBATIM required/recommended headers [S6]:
```
Authorization: Bearer <token>        (REQUIRED)
Content-Type: application/json       (REQUIRED on requests with body)
Idempotency-Key: <string>            (REQUIRED on all POST; max 255 chars, UUID v4 recommended)
Signature: <base64url>               (RECOMMENDED)
Timestamp: <RFC3339>                 (RECOMMENDED)
API-Version: 2026-01-16              (REQUIRED)
```

VERBATIM error shape [S6]:
```json
{
  "type": "invalid_request",
  "code": "invalid",
  "message": "Description",
  "param": "$.line_items[0].quantity"
}
```
`type` ∈ `invalid_request | processing_error | service_unavailable`.

Idempotency semantics are unusually strict and explicit (canonical reference, "Supersedes prior
idempotency rules," per SEP #120) [S6]: same key + identical body → replay original response with
`Idempotent-Replayed: true`; same key + different body → `422 idempotency_conflict` (non-retryable);
same key + request still in flight → `409 idempotency_in_flight` with `Retry-After`. Money amounts
are **integers in minor units** everywhere, explicitly to avoid float ambiguity — directly related to
the AP2 budget-unit bug below.

**Delegate Payment** (the ACP mechanism nearest to a "shared payment token") — VERBATIM example
request body from the OpenAPI spec, `2026-04-17` [S6]:
```json
{
  "payment_method": {
    "type": "card",
    "card_number_type": "fpan",
    "number": "4242424242424242",
    "exp_month": "11",
    "exp_year": "2026",
    "name": "Jane Doe",
    "cvc": "223",
    "checks_performed": ["avs", "cvv"],
    "iin": "424242",
    "display_card_funding_type": "credit",
    "display_brand": "visa",
    "display_last4": "4242",
    "metadata": {"issuing_bank": "temp"}
  },
  "allowance": {
    "reason": "one_time",
    "max_amount": 2000,
    "currency": "usd",
    "checkout_session_id": "csn_01HV3P3...",
    "merchant_id": "acme",
    "expires_at": "2025-10-09T07:20:50.52Z"
  },
  "billing_address": { "...": "..." },
  "risk_signals": [{"type": "card_testing", "score": 10, "action": "manual_review"}],
  "metadata": {"campaign": "q4"}
}
```
The `allowance` object is the ACP analogue of an AP2 Payment Mandate constraint set: a scoped,
expiring, amount-capped authorization tied to one `checkout_session_id`.

**Feed API** (added 2026-04-17) inverts the usual crawl model: it's a **push** model — merchants push
catalog data *to* agent-hosted feed services (`POST /feeds`, `GET /feeds/{id}`,
`GET /feeds/{id}/products`, `PATCH /feeds/{id}/products` for partial upsert by `Product.id`) rather
than agents scraping merchant endpoints [S6].

**Payment Handlers** RFC (drafted 2026-01-22) replaces a flat `payment_methods: ["card",
"card.agentic_token"]` array with self-describing handler objects carrying config schema, credential
schema, and a `requires_delegate_payment` flag — the RFC states the goal explicitly: "Making
`delegate_payment` the recommended default... ensures these properties are preserved while allowing
handlers to opt out when the pattern doesn't fit" [S6].

### x402: HTTP 402 payments (primary source, verbatim README + Cloudflare Monetization Gateway)

Canonical flow (12 steps, VERBATIM summary from the x402 spec) [S7]:
1. Client requests a resource.
2. Server responds `402 Payment Required` + a base64 `PaymentRequired` object in a
   `PAYMENT-REQUIRED` header.
3. Client picks one `PaymentRequirements`, builds a `PaymentPayload` for that `scheme`/`network`.
4. Client resends the request with a `PAYMENT-SIGNATURE` header carrying the `PaymentPayload`.
5. Server verifies locally or via a **facilitator**'s `/verify` endpoint.
6–7. Facilitator verifies; on success the server fulfills the request; on failure, `402` again.
8–11. Server (or the facilitator on its behalf) **settles** on-chain, waits for confirmation.
12. Server returns `200 OK` + a `PAYMENT-RESPONSE` header (base64 settlement receipt).

Design principles stated in the repo: "Trust minimizing: all payment schemes must not allow for the
facilitator or resource server to move funds, other than in accordance with client intentions" and
"Backwards Compatible... x402 will not deprecate support for any existing networks" [S7].

**Field reality (HN, S9, 251 comments on Cloudflare's x402-based Monetization Gateway)**: this is
squarely about **agent-vs-bot traffic economics**, not consumer payments.

> VERBATIM, `wpapper` (self-identified Cloudflare PM on the team) [S9]: "We want to offer a range of
> options, from charging everyone to charging unverified bots to simply charging users who exceed
> rate limits. We don't want to add a dependency on a particular detection mechanism..."

> VERBATIM, `tristor` [S9]: "It would be economically impossible for me to run a small personal
> website without Cloudflare thanks to the sheer quantity of badly behaved automated traffic on the
> Internet in 2026."

> VERBATIM, `dgudkov` [S9]: "We need standards and protocols, not another megacorp inserting itself
> between people. Micropayments should be part of the HTTP protocol." — answered by `wmf`: "x402 is
> the standard."

> VERBATIM, `hedora` (skeptical of the "agents pay, humans don't" framing) [S9]: "If they only charge
> agents a fee, then people will just set up a mcp endpoint or whatever to desktop chrome/firefox...
> Big tech companies will cache whatever they scrape, paying for one copy. Regular people and smaller
> companies will [pay repeatedly]."

On the original x402.org launch thread (S11), the x402 *author* (`__erik`) directly engaged
skeptics: "Merchants express to the buyer multiple ways that they accept payment and the buyer
chooses the one they prefer. As of right now stablecoins on various crypto rails are the major form
(largely because they're the easiest to start with from a development standpoint)..." — an admission
that the crypto-only feel of x402 today is an implementation artifact, not a design requirement.
Crypto skepticism dominates the thread regardless: "No mention of Lightning or Bitcoin in the entire
whitepaper... Hope this goes nowhere, clearly Coinbase has too much interest in pushing its own
stack" (`littlecranky67`) [S11], with `thinkmassive` pointing to **L402** (formerly LSAT, Lightning
Labs) as prior art "in production use for half a decade" [S11].

### Web Bot Auth (Cloudflare / IETF): the identity layer nobody calls "commerce" but everyone needs

Mechanism: bots sign HTTP requests using **RFC 9421 HTTP Message Signatures**; a key-directory draft
(`draft-meunier-http-message-signatures-directory-01`) lets a bot operator publish its key material
at a well-known location instead of registering centrally with any one vendor [S10, comment by
`bobbiechen` linking the IETF draft directly]. Cloudflare's "verified bots" program consumes this to
allowlist signed agents past CAPTCHA/Turnstile.

Field critique, most-upvoted structural objection [S10, `sneak`]:

> VERBATIM: "The problem with this is that key generation is free, so being a well-behaved unknown
> bot is the same as being an unidentified bot, which means that you go in the block/captcha/throttle
> bucket. It is only useful for whitelisting bots, not for banning bad ones, as bad ones can rotate
> keys. Whitelisting clients by identity is the death of the open web..."

Counter-argument from a proponent [S10, `marginalia_nu`]: "It stacks the incentives so that bots can
meaningfully build a good reputation, and be rewarded for behaving well... though I do think the
whole procedure is more than a bit overcomplicated." A commercial angle already exists:
`jithinraj` [S10] proposes exactly a robots.txt-like *policy* layer on top of Web Bot Auth identity —
i.e., Web Bot Auth answers "who," not "what may this bot do, and at what price," which is precisely
the gap x402/Monetization Gateway fills.

### Comparison matrix (assembled from primary sources + one secondary aggregator, flagged)

| Protocol | Layer | Backers (as sourced) | Status (2026-09-30) | Transport | Source |
|---|---|---|---|---|---|
| AP2 | Authorization/identity (mandates) | Google; donated to FIDO Alliance | v0.2, FIDO-track | Extension over A2A/UCP | S1 |
| ACP | Commerce/checkout | OpenAI, Stripe | Beta, spec `2026-04-17` | REST + MCP module (added 2026-04-17) | S6 |
| UCP | Commerce/catalog+checkout | Google, Shopify, + large retailer/OTA list | Production (Search/Gemini), lodging draft, food "coming soon" | REST, JSON-RPC; built-in AP2/A2A/MCP | S5 |
| x402 | Payment/settlement | Coinbase → x402 Foundation (Linux Foundation) | v2 shipped; Foundation launched 2026-04-02 | HTTP 402 + on-chain facilitator | S7, S9 |
| Web Bot Auth | Identity (non-payment) | Cloudflare, IETF draft authors | Draft; live in Cloudflare prod | HTTP Message Signatures (RFC 9421) | S10 |
| YCP | Commerce (RU market) | Yandex | Live, onboarding since May 2026 | Proprietary (Alice-integrated) | S17 |
| Visa TAP / Mastercard Agent Pay / Amex ACE | Authorization (card-network specific) | Visa / Mastercard+Santander / Amex | Reported "developer preview" / regional pilots — **not independently re-verified, see Unverified** | RFC 9421 (TAP) | S19 (secondary) |

## Numbers (with conditions and source)

- **19,000,000** weekly users of Yandex Alice; **30%** of Alice purchases used "universal checkout";
  **+159%** growth in traffic from Alice to shops, Jan–Apr 2026 — per Yandex's own May-2026 data as
  reported on Habr [S18].
- **3,500** shops already selling through Alice at YCP announcement (2026-02-27) [S17].
- **$3–5 trillion** — cited forecast for "agent-model" retail sales by 2030, attributed to Valery
  Stromov (Yandex, leads Alice/smart devices) in the YCP announcement coverage — a vendor forecast,
  not an independent estimate [S17].
- **Habr 2028 forecast (author's own model, mid-2028 horizon)**: Russian e-commerce GMV
  19–21 trillion rubles; marketplace share of orders 78–82%; GMV influenced by AI selection 12–20%;
  transactions via AI checkout 4–8%; **fully autonomous purchases only 1–3%** [S18] — i.e. even a
  bullish Russian-market forecast expects the human-not-present flow to stay a small minority of
  volume through 2028.
- **0.6–7.5%** — share of x402 transaction *volume* ($52.7M analyzed) attributed to genuine agent
  traffic, vs. scripts/scheduled jobs/self-transfers, per TRM Labs (cited secondhand inside a Habr
  field report, not independently re-fetched — treat as single-source) [S15].
- **6** — total log entries (all the author's own test calls) after building and launching a
  production-shaped x402-paid API; **0** organic paying agents found [S15].
- **4** — critical bugs found in the author's own x402 stack in that same build: (1) payment-replay
  protection dead from a Facilitator object being recreated per-request, wiping the used-nonce set;
  (2) hardcoded port vs. platform's dynamic `$PORT` → 502 on first deploy; (3) DB schema migration
  never applied on managed DB (health check passed, first real query threw
  `UndefinedTableError`); (4) `FACILITATOR_MODE=mock` leaked into production, letting anyone mint a
  valid certificate with zero real payment [S15].
- **362 comments / 248 points** — HN reaction to the OpenAI/Stripe Instant Checkout + ACP launch,
  2025-09-29, by far the most-debated launch in this space [S8].
- **355 points / 251 comments** — HN reaction to Cloudflare's x402-based Monetization Gateway,
  2026-07-01 [S9].
- **255 characters** — max length of an ACP `Idempotency-Key` [S6].
- **AP2 issue #339** — the AP2 evaluator multiplies `Budget.max` by 100 to convert to minor units
  while `AmountRange.max` is already minor units — an undocumented unit mismatch that silently turns
  a 5,000-rupee cap into an effective 500,000-rupee cap when both constraint types are combined [S2].

## Pitfalls, limits, criticism

- **AP2 replay bug (Issue #346, reported via Google's g.co/vulnz on 2026-09-01):** "checking a nonce
  is not remembering it" — the reference Credential Provider issues tokens after verifying a
  presented mandate's nonce/audience, but never durably records that *this specific* mandate hash was
  already consumed. Presenting the identical signed Payment Mandate twice yields two separate
  payment receipts. Root cause: no atomic, `transaction_id`-keyed consumption record at the
  Credential Provider, Network, or Merchant Payment Processor. Google's own triage reportedly
  classified this as "intended behavior for program purposes" before public disclosure — i.e. this
  is a known, accepted gap in the *reference implementation*, not (yet) a fixed spec requirement
  [S2].
- **AP2 selective-disclosure bug (Issue #339):** constraint evaluators are only created for
  constraints *present* in the disclosed mandate payload; an absent constraint produces zero
  violations, which is indistinguishable from a constraint that was checked and passed. Because
  AP2's mandates use SD-JWT selective disclosure by design (for privacy/data-minimization), a
  malicious or buggy Shopping Agent can simply omit the Budget constraint from what it discloses to
  the verifier and the spending cap silently stops applying. A Google OSS VRP reviewer is quoted
  confirming this is "a mechanism where a selectively withheld constraint could lead to permissions
  bypass" [S2].
- **AP2 weak merchant identity binding (Issue #361, title: "Found and fixed AP2-17...")** — the
  issue's own title implies AP2 vulnerabilities are being tracked with IDs (`AP2-17`) the way CVEs
  are, suggesting a semi-formal internal vulnerability process exists even at this early stage, found
  by a third party independently building a verifier, not by the AP2 team itself [S2].
- **Incentive-alignment skepticism dominates the ACP launch thread.** OpenAI's stated claim —
  "Merchants pay a small fee on completed purchases, but the service is free for users, doesn't
  affect their prices, and doesn't influence ChatGPT's product results" — was immediately challenged:
  `datadrivenangel`: "The incentives are very strong to prefer instant checkout items" [S8]; multiple
  commenters compare it directly to affiliate-marketing bias and predict "enshittification" following
  Google Search's arc [S8]. `burkaman` raised a specific mechanism — merchants could quietly mark up
  prices to absorb the ACP fee — answered by `tom1337`: "in the EU this is not legal — this is also
  why you cannot pass the payment processor fee to the customer" [S8], i.e. this is a jurisdiction-
  dependent risk, not solved by the protocol itself.
- **CommerceTXT (an llms.txt-style spec for shopping) drew sustained, technically substantive
  pushback**, not just "another spec" fatigue [S13]:
  - Its `@SEMANTIC_LOGIC` directive lets a merchant tell an agent "3 left in stock" when the real
    inventory field says 42 — the author defended this as legitimate ("sellable vs. physical stock"),
    a critic called it "dark patterns... baked right into your standard" [S13].
  - Its proposed "Trust Score" for merchant honesty has **no shared registry or verification
    mechanism** — the author's own answer: "Each AI platform... builds its own model... There is no
    central authority" [S13], which functionally means the score is unfalsifiable marketing.
  - Multiple commenters asked why this isn't just Schema.org/JSON-LD; the author's defense (LLM
    "token tax" from JSON brackets/quotes, up to "30%" of payload by his own unverified claim) was
    directly rebutted: JSON is "not heavy... lean compared to XML" [S13].
  - It puts its manifest at the web root, not `/.well-known/`, explicitly because "Shopify and Wix...
    block hidden directories" for non-technical merchants — a pragmatic-adoption argument that an
    IETF-standards-literate commenter (`robotstxtwasbad`) called a violation of RFC 8820/BCP 190
    [S13]. This root-vs-`.well-known` fight is now recurring across llms.txt-family specs generally.
- **x402/crypto payment rails face structural friction outside crypto-native contexts**: KYC/AML
  concerns (`egorfine` vs `disgruntledphd2` extended exchange, S11), on-chain settlement latency for
  non-EVM chains ("For Bitcoin, that takes upwards of like 15 minutes," `lucb1e`, answered that Base
  L2 confirms "every 2 seconds... preconfirm even faster (every 200ms)," S11), and a real double-spend
  question from `westurner`: "Does x402 prevent the double-spending problem?" — `__erik`'s answer
  pushes the guarantee down to the underlying chain/facilitator, i.e. **x402 itself does not solve
  double-spend; it delegates that entirely to whichever settlement network is chosen** [S11].
- **Web Bot Auth's centralization critique**: even sympathetic commenters flag that Cloudflare
  running the reference "verified bots" registry makes it the de facto gatekeeper regardless of the
  underlying spec being open (`binarymax`, `mtrovo`: "you have to... pay a rent to Cloudflare"),
  countered by `maxwellg`: "Cloudflare is only the first to market... every WAF vendor... will have
  it implemented before the next sales cycle" [S10].
- **Liability remains explicitly unresolved and is being pushed to law, not protocol design.** The
  Habr liability piece cites California AB 316 as removing an "autonomous AI" legal defense —
  "отвечает человек, а не ИИ" (a human is responsible, not the AI) — and US Treasury officials stating
  labs cannot get liability shields; the article's own framing is that **verification requires a
  human with domain knowledge and a documented decision trail**, i.e. protocol-level cryptographic
  mandates (AP2) do not by themselves discharge legal liability, they only create an audit trail for
  a dispute process that still routes to a human [S16].
- **AI-agent purchasing at consumer scale still reads as mostly theoretical on HN**: the "Has anyone
  built an AI agent that spends real money?" thread has only a handful of concrete answers, and the
  most detailed one (`novachen`) reports that agents spending on **API credits/compute/ad placement**
  (not physical goods) already work in production, with the dominant real failure mode being
  "confident decision on stale context," not the sci-fi "agent goes rogue and spends $10k" scenario
  people worry about [S14].

## What changed in the last 6 months (since ~2026-04)

- **x402 Foundation formed** (2026-04-02, Linux Foundation) — governance moved out of Coinbase alone
  [S9].
- **ACP `2026-04-17` release** added the push-model Feed API, 3DS authentication example flows, and
  `supported_versions` in version-mismatch errors [S6].
- **AP2 donated to FIDO Alliance** (2026-04-28) [S1].
- **Independent security research on AP2 v0.2 surfaced** (issues #338–#362 range, reported through
  Google's official VRP channel starting 2026-09-01) — this is very recent and shows the reference
  implementation is still actively being hardened by outside researchers, not just the AP2 team
  [S2].
- **MCP 2.0** (per the Habr survey, late July 2026) dropped mandatory session state for a stateless
  architecture aimed at high-scale merchant servers — directly relevant to agentic-commerce load
  patterns even though MCP itself is Chapter 05's topic [S18].
- **Google's "Universal Cart"** expanded across Search, Gemini, and YouTube, with direct YouTube ad
  purchases enabled in the US (2026-07-29) [S18].
- **"Agent Plugins 1.0.0"** (2026-08-06) — a standardized agent-packaging format with Amazon,
  Microsoft, OpenAI, and Vercel named as participants [S18] (worth cross-checking against Chapter 06
  Skills — this may overlap with or be adjacent to Agent Skills packaging).
- **Habr's own community sentiment sharpened toward liability and production honesty** in September
  2026 specifically: the "can't sue an agent" piece and the "built it, found bugs, found no market"
  x402 report both landed in the final week of this research window, suggesting the Russian-language
  technical community's framing is shifting from "how do these protocols work" (early-2026 explainer
  posts) to "does this actually work in production and who's liable when it doesn't" (Sept-2026) [S15][S16].

## Diagram candidates

1. **The three-layer agentic-commerce stack** — actors: Commerce layer (UCP/ACP) → Authorization
   layer (AP2/TAP/Agent Pay) → Payment/settlement layer (x402/card rails/Tempo). Arrows: "checkout
   session" (UCP↔ACP), "mandate" (Auth↔Commerce), "payment token/allowance" (Auth↔Payment). States:
   which layer is "production" vs "draft" today. Source: S19 layered framing, corroborated by S1/S6.
2. **AP2 Human-Present flow** — actors: User, Shopping Agent, Trusted Surface, Merchant, Credential
   Provider, Merchant Payment Processor. Two swimlanes (Shopping phase / Payment phase), 9 numbered
   arrows exactly as listed in Mechanics above. Source: S1 `flows.md`.
3. **AP2 Human-Not-Present flow** — same actors, but split into Phase 1a (human present, sets *open*
   mandate constraints) / Phase 1b (human absent, agent assembles real cart) / Phase 2 (agent
   self-signs *closed* mandates bound to the *open* ones). Source: S1 `flows.md`.
4. **The AP2 replay-bug sequence (issue #346)** — actor: attacker/compromised Shopping Agent
   presenting the *same* signed Payment Mandate twice to a Credential Provider that has no durable
   consumption record; two divergent payment IDs from one signature. Good for a security-pitfalls
   panel. Source: S2.
5. **x402's 12-step 402 flow** — Client, Resource Server, Facilitator, Blockchain. States:
   `402 Payment Required` → `PaymentPayload` signed → `/verify` → `/settle` → `200 OK` +
   `PAYMENT-RESPONSE`. Source: S7.
6. **ACP checkout-session lifecycle state machine** — states: (none)→created→updated*→
   authentication_required→completed / canceled. Transitions labeled with the exact endpoint
   (`POST .../complete`, etc.) and the `requires_3ds` / `intervention_required` error branches.
   Source: S6.
7. **The commerce-protocol timeline** — a simple Gantt-style strip from Sept 2025 (AP2, ACP, x402
   launches) through Sept 2026 (security findings, liability debate), matching the Timeline section.
8. **Layered identity vs. payment vs. commerce comparison matrix** as a table-diagram — reuse the
   Comparison matrix table above but visually group rows by layer color.
9. **Web Bot Auth signature flow** — Bot, Site, Key Directory (`.well-known`), Cloudflare
   verification edge. Shows that identity (who) is separate from and precedes any payment (x402) or
   commerce (ACP/UCP) step — useful to show these protocols compose rather than compete.
10. Chart candidate: **Yandex Alice growth** — weekly users (19M) and traffic-to-shops growth (+159%,
    Jan–Apr 2026) as a simple two-series line/bar, source S18 (only two data points confirmed —
    treat as illustrative, not a full time series, unless more Yandex-reported data points are
    sourced later).
11. Chart candidate: **x402 agent-share-of-volume** (0.6–7.5% band vs. ~92.5–99.4% non-agent) as a
    single stacked bar — flag clearly as single-source, secondhand (TRM Labs via Habr) [S15].

## Glossary

- **AP2 (Agent Payments Protocol)**: Google-originated, FIDO-Alliance-track protocol defining
  cryptographic Mandates (Checkout, Payment) that let a Shopping Agent prove user authorization for a
  purchase [S1].
- **Mandate**: an AP2 Verifiable Digital Credential (SD-JWT) — "open" (constraints, pre-purchase) or
  "closed" (bound to one finalized transaction) [S1].
- **Trusted Surface**: the AP2 role, required to be non-agentic, that actually renders a
  mandate to the human and captures consent/signature [S1].
- **UCP (Universal Commerce Protocol)**: Google/Shopify-led commerce substrate (catalog, cart,
  checkout, identity linking, orders) that AP2 now plugs into as its security layer [S5][S1].
- **ACP (Agentic Commerce Protocol)**: OpenAI/Stripe checkout-session + delegated-payment standard
  powering ChatGPT's shopping features [S6].
- **Delegate Payment / Allowance**: ACP's scoped, expiring, amount-capped payment-token mechanism —
  the ACP analogue of an AP2 Payment Mandate constraint [S6].
- **x402**: an HTTP-native payment scheme reviving the `402 Payment Required` status code, settled
  primarily via stablecoins on EVM chains through a "facilitator" [S7].
- **Facilitator (x402)**: a server that verifies and/or settles an x402 `PaymentPayload` on behalf of
  a resource server [S7].
- **Web Bot Auth**: an IETF-draft, RFC-9421-based scheme for bots to cryptographically self-identify
  to sites via signed HTTP requests and a published key directory [S10].
- **KYA (Know Your Agent)**: an informally proposed accountability concept (not a shipped protocol)
  binding every public-facing agent to an identifiable, liable human/organization, modeled on KYC
  [S22].
- **YCP (Yandex Commerce Protocol)**: Yandex's own agentic-checkout protocol for the Alice assistant
  [S17].
- **Facilitator vs. Credential Provider vs. Merchant Payment Processor**: three different vendors'
  names for a similar "the entity that actually knows how to talk to a payment rail" role — x402
  calls it Facilitator [S7], AP2 splits it into Credential Provider (who owns the instrument) and
  Merchant Payment Processor (who talks to the network) [S1].
- **OASF (Open Agentic Schema Framework)**: AGNTCY's schema for describing agent attributes/skills
  across A2A and MCP [S20].
- **SLIM**: AGNTCY's secure low-latency agent-to-agent messaging layer [S20].

## Unverified / open questions

- **"ChatGPT Instant Checkout wound down March 2026 after 5 months"** — this claim appears only in
  the `custena/agent-payment-protocols` GitHub repo (a single, low-visibility secondary aggregator: 3
  points / 0 comments on HN), and I could not independently corroborate it via HN search, the AP
  News article (fetch blocked, 403), or the CNBC article (fetch blocked, 403) within this session's
  tool budget. Treat as **unconfirmed** until checked against a primary OpenAI/Stripe source or a
  higher-confidence outlet.
- **"Alibaba/Ant Agentic Commerce Trust Protocol: 120 million AI-initiated transactions in a single
  week (Feb 2026)"** — same single-source problem as above (`custena` repo only); not independently
  verified. Also entirely outside the editor's listed scope (no Alibaba/Ant mention in the brief) —
  flagging as a possible scope addition for the editor to confirm, not confirmed fact.
- **Visa Trusted Agent Protocol (TAP) and Visa "Intelligent Commerce Connect" specifics** (RFC 9421
  usage, "~12 ecosystem partners," an "April 8, 2026" launch date) — sourced only from the same
  `custena` aggregator; Visa's own developer/newsroom pages for TAP returned 404 when fetched
  directly in this session. **Needs primary-source verification before publishing as fact.**
- **Mastercard Agent Pay + "Verifiable Intent" claims** ("live across 9+ APAC markets," "Europe pilot
  March 2026," "first live end-to-end agent-initiated payment... in Europe," Santander partnership) —
  same single secondary source; not independently verified.
- **Amex "Agentic Commerce Experiences (ACE)" and "Agent Purchase Protection"** — same caveat, single
  secondary source, not independently verified.
- **TRM Labs' $52.7M x402-transaction analysis and the 0.6–7.5% agent-share figure** — this is cited
  correctly as appearing in the Habr field report [S15], but I did not independently locate and read
  TRM Labs' own publication; treat the number as secondhand until the original TRM Labs report is
  found and read directly.
- **Search Engine Land's llms.txt traffic-impact study** — WebFetch was blocked (403) on
  searchengineland.com; I only have the HN listing's title/framing ("Llms.txt didn't boost AI traffic
  for 10 sites; growth was coincidental," 2026-01-20, 5 points). The actual methodology, sample, and
  numbers are unread — flag for a follow-up fetch via a different method (e.g. Wayback Machine or a
  differently-routed fetch).
- **Stripe "Machine Payments" launch (2026-02-16) and "Tempo" blockchain's specific role in agentic
  commerce** — I confirmed the Habr headline and date via RSS but did not read the full article or
  Stripe's own announcement; Stripe's Tempo L1 blockchain launch itself (2025-09-04, HN 808pts/1072
  comments) was noted but not read in depth in this session — a rich source for a follow-up pass,
  especially for the "Stripe machine payments / Tempo" sub-scope item.
- **Reddit-native field reports**: `reddit.com` and `old.reddit.com` (including `.json` endpoints)
  returned HTTP 403/302 to every fetch attempt in this session (both via WebFetch and curl with
  browser-like headers), for both direct requests and the `search.json` API. **No r/AI_Agents,
  r/LocalLLaMA, r/mcp, r/ClaudeAI, r/ChatGPTCoding, or r/ExperiencedDevs threads were actually read**
  despite being explicitly in scope for this chapter's lens. This is a material gap — a follow-up
  session with a working Reddit access path (authenticated API, a mirror, or a different network
  path) should specifically hunt for agentic-commerce discussion there.
- **X/Twitter threads**: not attempted in this session (no working fetch path found for Reddit
  suggested the same would apply; WebSearch budget was exhausted before X-specific searches could be
  run). Flag as unattempted, not as "nothing found."
- **Lobsters, Stack Overflow, dev.to**: not attempted this session due to WebSearch budget exhaustion
  early in the research (the session's WebSearch quota was already at 200/200 before this chapter's
  research began, apparently consumed by a prior skill invocation attempt). All research after that
  point relied on WebFetch + direct curl to HN Algolia API, GitHub raw/API, and Habr RSS — a
  narrower source mix than intended. A follow-up pass with a fresh WebSearch budget would likely
  surface additional dev.to/SO/Lobsters field reports.
- **fastnewsdev Telegram mirror**: checked (`t.me/s/fastnewsdev`), but the visible page only showed
  recent posts about coding-agent prompts/skills, not agentic commerce; older posts were not paged
  through (no `before=` pagination attempted). Not conclusive that the channel has no coverage of
  this topic — just that the most recent ~18 visible posts didn't.

## Sources

- [S1] "Agent Payments Protocol (AP2)" — Google (google-agentic-commerce org), GitHub repo docs
  (`index.md`, `overview.md`, `faq.md`, `glossary.md`, `specification.md`, `checkout_mandate.md`,
  `payment_mandate.md`, `flows.md`, `implementation_considerations.md`), v0.2, no single publication
  date on the docs (repo active through 2026), https://github.com/google-agentic-commerce/AP2 ,
  accessed 2026-09-30.
- [S2] AP2 GitHub Issues #339, #345, #346, #353, #354, #356, #358, #360, #361, #362 — various
  authors, Google-agentic-commerce/AP2 issue tracker, reported ~2026-09 (issue #346 explicitly dated
  2026-09-01 via Google VRP), https://github.com/google-agentic-commerce/AP2/issues , accessed
  2026-09-30.
- [S3] "AP2 Protocol Overview" — ap2-protocol.org, undated (live doc site), https://ap2-protocol.org/
  , accessed 2026-09-30.
- [S4] "UCP and AP2" — ucp.dev documentation, undated, https://ucp.dev/documentation/ucp-and-ap2/ ,
  accessed 2026-09-30.
- [S5] "Universal Commerce Protocol" — ucp.dev homepage, undated (references "Lodging draft... now
  available," "Food coming soon"), https://ucp.dev/ , accessed 2026-09-30.
- [S6] "Agentic Commerce Protocol (ACP)" — OpenAI & Stripe, GitHub repo (README, `changelog/2025-09-
  29.md`, `changelog/2026-04-17.md`, `rfcs/rfc.agentic_checkout.md` v2026-01-16, `rfcs/rfc.payment_
  handlers.md` v2026-01-22, `spec/2026-04-17/openapi/openapi.delegate_payment.yaml`),
  https://github.com/agentic-commerce-protocol/agentic-commerce-protocol , accessed 2026-09-30.
- [S7] "x402" — Coinbase / x402 Foundation, GitHub README, https://github.com/coinbase/x402 (now a
  development fork of https://github.com/x402-foundation/x402 per the README notice), accessed
  2026-09-30.
- [S8] "Instant Checkout and the Agentic Commerce Protocol" — Hacker News thread on
  https://openai.com/index/buy-it-in-chatgpt/ , published 2025-09-29, 248 points / 362 comments,
  https://news.ycombinator.com/item?id=45416080 , accessed 2026-09-30.
- [S9] "Monetization Gateway: Charge for any resource behind Cloudflare via x402" — Hacker News
  thread on https://blog.cloudflare.com/monetization-gateway/ , published 2026-07-01, 355 points /
  251 comments, https://news.ycombinator.com/item?id=48746914 , accessed 2026-09-30.
- [S10] "Web Bot Auth" — Hacker News thread on
  https://developers.cloudflare.com/bots/reference/bot-verification/web-bot-auth/ , published
  2025-08-28, 82 points / 74 comments, https://news.ycombinator.com/item?id=45055452 , accessed
  2026-09-30.
- [S11] "x402 — An open protocol for internet-native payments" — Hacker News thread on
  https://www.x402.org/ , published 2025-09-23, 228 points / 147 comments,
  https://news.ycombinator.com/item?id=45347335 , accessed 2026-09-30.
- [S12] "Google's Universal Commerce Protocol aims to make shopping AI-native" — Hacker News item,
  published 2026-01-12, 14 points / 15 comments,
  https://news.ycombinator.com/item?id=46586413 , accessed 2026-09-30.
- [S13] "Show HN: CommerceTXT – An open standard for AI shopping context (like llms.txt)" — Hacker
  News thread, published 2025-12-16, 20 points / 58 comments (author `tsazan` participating
  throughout), https://news.ycombinator.com/item?id=46289481 , accessed 2026-09-30.
- [S14] "Ask HN: Has anyone built an AI agent that spends real money?" — Hacker News thread,
  published 2026-03-13, 4 points / 6 comments,
  https://news.ycombinator.com/item?id=47371289 , accessed 2026-09-30.
- [S15] "Собрал платный API для ИИ-агентов на x402. Рынка не нашёл — зато нашёл четыре бага" —
  Habr, author "Laratok", published 2026-09-24, https://habr.com/ru/articles/1086276/ , accessed
  2026-09-30.
- [S16] "Агента нельзя засудить: почему последняя миля ИИ — это человек" — Habr, published
  2026-09-22 (RSS date) / referenced with a 2026-09-29 context, https://habr.com/ru/articles/1088290/
  , accessed 2026-09-30.
- [S17] "«Яндекс» создал стандарт для покупок в нейросетях: Yandex Commerce Protocol" — Habr
  (bothub company blog, news), published 2026-02-28 (page date) / 2026-02-27 (announcement date per
  article body), https://habr.com/ru/companies/bothub/news/1004896/ , accessed 2026-09-30.
- [S18] "Когда покупки станут диалогом агентов: что уже работает, что изменилось за месяц и прогноз
  на 2 года" — Habr, published 2026-08-21, https://habr.com/ru/articles/1073168/ , accessed
  2026-09-30.
- [S19] "The State of Agent Payment Protocols (April 2026)" — GitHub repo `custena/agent-payment-
  protocols`, published/updated ~2026-04, https://github.com/custena/agent-payment-protocols ,
  accessed 2026-09-30. **Low-confidence secondary aggregator — see Unverified for specific claims
  from this source that could not be cross-checked.**
- [S20] "Agntcy – Open Infrastructure for Multi-Agent Systems" — docs.agntcy.org (Linux Foundation
  project), undated, https://docs.agntcy.org/ , accessed 2026-09-30.
- [S21] "Project NANDA Overview" — MIT Media Lab, undated, https://www.media.mit.edu/groups/nanda/overview/
  (redirected from https://nanda.media.mit.edu/ ), accessed 2026-09-30.
- [S22] "Know Your .agent?" — Esther Dyson, Substack, published 2026-05-05,
  https://estherdyson.substack.com/p/know-your-agent , accessed 2026-09-30.
- [S23] "Does llms.txt matter?" — Search Engine Land, title/date only via Hacker News listing
  (https://news.ycombinator.com/... query result), published 2026-01-20, direct fetch blocked
  (HTTP 403), https://searchengineland.com/does-llms-txt-matter-467740 , accessed 2026-09-30 (listing
  only; article body unread — see Unverified).
- [S24] Hacker News search listings for "Agent Payments Protocol" (Google Cloud blog announcement,
  2025-09-16; FIDO Alliance donation post, 2026-04-28) — used for dates/titles only, cross-referenced
  against S1's own docs links, https://hn.algolia.com/api/v1/search (Algolia HN Search API), accessed
  2026-09-30.
