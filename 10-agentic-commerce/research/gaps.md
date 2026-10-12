# 10. AP2, UCP и интернет агентов — completeness-critic and gap-filler notes

Scope of this file: (1) what `spec.md`, `practice.md`, `field.md` miss, leave thin, get outdated or leave unsupported; (2) contradictions between them, resolved against primary sources; (3) a freshness sweep of Jul–Sep 2026; (4) gap-filling research; (5) the claims a writer is most likely to get wrong. Source ids here are `[G#]` (this file's own list) so they do not collide with the `[S#]` ids of the other three files. Everything was read on 2026-09-30. WebSearch was not available in this session (the shared budget was used up), so all reading went through curl, the GitHub API (`gh`), the IETF datatracker API, the Wayback Machine and WebFetch.

## Contradictions resolved

| # | Topic | What the notes say | Resolution (primary source) |
|---|---|---|---|
| C1 | x402 Foundation launch date | spec: 2026-07-14; practice/field: 2026-04-02 | **Both, for different events.** The Linux Foundation *announced* that it was launching the x402 Foundation, with Coinbase contributing the protocol, on 2026-04-02 at MCP Dev Summit NA [G2]. The *operational launch*, with governance active and the contribution completed, followed on 2026-07-14 [G3]. Quote: "Since the Foundation's intent to launch in April, 40 organizations have joined as members" [G3]. Use "announced Apr 2, operational Jul 14, 2026". |
| C2 | x402 Foundation member count | practice: 22; spec: 40 | The Apr 2 release lists 22 organisations that expressed "initial intent and support" [G2]. The Jul 14 release lists 40 members: 17 Premier, 18 General, 5 Associate [G3]. Microsoft, Base, Sierra, thirdweb, PPRO and Ampersend.ai appear in the April list but not in the July tier lists [G2][G3]. |
| C3 | x402 V2 release date | spec: 2026-06-24; practice: ~2025-12-11 | **2025-12-11.** The post on x402.org carries both dates: "December 11, 2025" as the original and "June 24th, 2026", which looks like a re-publication on the Foundation site. The body is pre-Foundation: "We're excited to share more updates on … the launch of the independent x402 Foundation soon" [G1]. spec.md's "x402 V2 launched 24 June 2026" is wrong. |
| C4 | AP2 v0.2 date | practice: "v0.2 (2025 release)"; spec: April 2026 | **v0.2.0 tag and GitHub release on 2026-04-28**, the same day as the FIDO donation. v0.1.0 was tagged on 2025-09-16 [G9][G10]. The AP2 CHANGELOG reads "0.1.0 (2025-09-16) … 0.2.0 (2026-04-28) Release of V2" [G9]. |
| C5 | Who governs AP2 | spec: Google; practice/field: FIDO | **FIDO Alliance, since 2026-04-28.** Google: "we're donating the Agent Payments Protocol (AP2) to the FIDO Alliance" [G10]. The work continues in FIDO's Agentic Authentication Technical WG (chairs CVS Health, Google, OpenAI; vice-chairs Amazon, Google, Okta) and its Payments Technical WG (chairs Mastercard, Visa) [G11]. **Mastercard's Verifiable Intent was donated to FIDO in the same move** [G10][G11]. None of the three notes mention the VI donation. |
| C6 | UCP transports | field: "REST and JSON-RPC"; spec/practice: REST, MCP, A2A, Embedded | **There are four `transport` values: `rest`, `mcp`, `a2a`, `embedded`** [G20]. MCP and embedded are JSON-RPC based and described with OpenRPC, which is where field's "JSON-RPC" comes from. For A2A, `endpoint` is the Agent Card URL, e.g. `https://business.example.com/.well-known/agent-card.json` [G20]. Google's own UCP surfaces (AI Mode in Search, Gemini web) document REST and MCP bindings [G49]. |
| C7 | UCP+AP2 wire fields | spec: business returns a `checkoutSignature`; spec/practice: extension `dev.ucp.common.payment.ap2_mandate` | **Current (main / v2026-08-25):** the business signs every checkout response in `ap2.merchant_authorization`, a JWS with detached content (`<header>..<signature>`) over the JCS-canonicalised checkout minus `ap2`. The platform puts `ap2.checkout_mandate` in `complete`. The payment mandate goes into `payment.instruments[*].credential.token` [G19]. The namespace moved from `dev.ucp.shopping.*` to `dev.ucp.common.payment.*` in v2026-08-25; this is a breaking change [G18]. "checkoutSignature" is stale. The Verifiable Intent docs still use the old `dev.ucp.shopping.ap2_mandate` [G13]. |
| C8 | ACP checkout states | spec: 4 states `not_ready_for_payment → ready_for_payment → completed/canceled` ("5 состояний"); field adds `authentication_required` | **The `CheckoutSessionBase.status` enum in 2026-04-17 has 11 values:** `incomplete, not_ready_for_payment, requires_escalation, authentication_required, ready_for_payment, pending_approval, complete_in_progress, completed, canceled, in_progress, expired` [G25]. The 4-state model is the 2025 picture. |
| C9 | ACP idempotency conflict code | practice/field: 422 `idempotency_conflict`; OpenAI production checklist: "idempotency_conflict with HTTP 409" | **The RFC is normative: same key + different body → 422 `idempotency_conflict` (non-retryable); same key while the request is in flight → 409 `idempotency_in_flight` + `Retry-After`** (SEP #120) [G25]. The OpenAI production guide contradicts it [G27], so the doc lags the spec. Tell readers to follow the RFC. |
| C10 | ChatGPT Instant Checkout | practice: "wound down March 2026; 7 retailers run live ACP integrations"; field: unverified | **Primary source, OpenAI, 2026-03-24:** "We've found that the initial version of Instant Checkout did not offer the level of flexibility that we aspire to provide, so we're allowing merchants to use their own checkout experiences while we focus our efforts on product discovery" [G28]. Target, Sephora, Nordstrom, Lowe's, Best Buy, The Home Depot and Wayfair "have integrated into ACP **for discovery**", not for in-chat checkout [G28]. Shopify merchants reach ChatGPT through Shopify Catalog and "complete purchases on the merchant's online store through an in-app browser" [G28]. OpenAI's developer docs still describe the "three flows" of Instant Checkout (feed, checkout, delegated payment) [G27], so the spec survives while the flagship UX changed. "~12 Shopify merchants went live" comes only from secondary sources [G29]. |
| C11 | Know-Your-Agent | spec: KYA-OS, an open standard donated to DIF; practice: no such standard; field: Esther Dyson's `.agent` concept | **KYA is an umbrella term, not one standard.** Vouched's own site says: "Vouched authored the KYA-OS standard, donated it to the Decentralized Identity Foundation, and built Agent Checkpoint" [G41]. This is a vendor claim: DIF's working-group page shows a "Trusted AI Agents" WG, but the name KYA-OS did not appear on the DIF pages read [G42]. Dyson's piece is an essay proposal [field S22]. The protocol-level "KYA" functions actually shipped are agent registration + RFC 9421 signatures (Visa TAP, Mastercard Agent Pay via Web Bot Auth) [G14][G15] and delegation credentials (AP2 mandates, VI) [G13]. |
| C12 | Web Bot Auth draft name and status | spec: `draft-meunier-webbotauth-httpsig-protocol-00`; practice: `web-bot-auth-architecture` + `http-message-signatures-directory`; field: `draft-meunier-http-message-signatures-directory-01` | **Current: the IETF `webbotauth` WG was chartered on 2025-10-23 [G17] and adopted `draft-ietf-webbotauth-httpsig-protocol-00` on 2026-09-01** (authors T. Meunier of Cloudflare and S. Major of Google). The WG draft merges the protocol and the key directory: it "defines the Signature-Agent header field for in-band key discovery, a key directory format based on JWKS, and a well-known URI" [G16]. The individual drafts it supersedes are `draft-meunier-web-bot-auth-architecture-05` and `draft-meunier-http-message-signatures-directory-05` (both 2026-03-02) and `draft-meunier-webbotauth-httpsig-protocol-02` (2026-08-19) [G17]. All three notes cite outdated revisions. |
| C13 | Web Bot Auth adoption | spec: "no current adopters", research-stage; field: live in Cloudflare production | Both statements are about different things. The research-stage caveat is about the `cloudflare/web-bot-auth` library repo. Cloudflare verifies signatures at its edge for Visa TAP and Mastercard Agent Pay agents: "Both Trusted Agent Protocol and Agent Pay leverage Web Bot Auth as the agent authentication layer" (2025-10-24) [G15]. UCP added "Web Bot Auth (WBA) Interop" in v2026-08-25 [G18], and x402 defines an `http-message-signatures` extension with tags `web-bot-auth` and `agent-browser-auth` [G7]. |
| C14 | Visa TAP wire format | spec: "not public"; field: "not verified" | **Public in the sample repo `visa/trusted-agent-protocol` (created 2025-10-10) and the Cloudflare blog.** RFC 9421 `Signature-Input` covering `("@authority" "@path")` with `created`, `expires`, `keyId`, `alg` (`rsa-pss-sha256` or `ed25519`), `nonce` and `tag`. The tag is `agent-browser-auth` when browsing and `agent-payer-auth` when paying [G14][G15]. Verbatim below. |
| C15 | Visa Intelligent Commerce Connect | practice: fact; field: unverified | **Confirmed.** Visa press release of 2026-04-08: a "network and protocol-agnostic gateway" supporting TAP, MPP, ACP and UCP, in pilot with Aldar, AWS, Diddo, Highnote, Mesh, Payabli and Sumvin; broader rollout "throughout 2026" [G31]. |
| C16 | MPP / Tempo dates | practice: "MPP mainnet Mar 18, 2026" | **Tempo Mainnet went live on 2026-03-18, and MPP was introduced alongside it** ("co-authored by Stripe and Tempo") [G34]. The IETF text is `draft-ryan-httpauth-payment-01` (dated 18 Mar 2026), re-submitted as **`draft-httpauth-payment-01` on 2026-09-09** [G36]. |
| C17 | "MCP 2.0" (field) | field: "MCP 2.0 (stateless sessions, late July 2026)" | **There is no "MCP 2.0".** MCP is date-versioned: the revision is **2026-07-28**. It removes `Mcp-Session-Id` and the `initialize` handshake, adds `server/discover`, and carries the version in `_meta` on every request [G48]. This matters for UCP-over-MCP (`meta.ucp-agent` in arguments) and x402-over-MCP (`_meta["x402/payment"]`), which were written against the older MCP revisions [G20][G6]. |
| C18 | EU AI Act (practice) | practice: "Article 26 (in force since Aug 2, 2026) puts obligations on the deployer of an autonomous spending agent" | **Wrong on two counts.** (a) Art. 26 obligations apply to deployers of *high-risk* systems. The Commission's page (updated 2026-08-03) says Annex III high-risk rules "will apply from 2 December 2027" after the "AI Omnibus" political agreement, and Annex I rules from 2 Aug 2028 [G39]. (b) A generic shopping agent is not an Annex III use case. The claim should not be used. |
| C19 | UCP REST endpoints | spec example `POST /checkout-sessions`; UCP overview example `POST /checkout` | **Use the OpenAPI.** Both `release/v2026-08-25` and `main` define `/checkout-sessions` (POST create), `/checkout-sessions/{id}` (GET, **PUT** update), `/{id}/complete`, `/{id}/cancel`, plus `/carts`, `/catalog/search`, `/catalog/lookup`, `/catalog/product` and `/orders/{id}` (GET) [G21]. The `/checkout` in the overview prose is illustrative. |
| C20 | UCP profile `version` | spec example shows `"version": "draft"` | A published profile carries a **date version** (`2026-08-25`). `draft` is the version of the unreleased spec on `main` [G18][G20]. |

## Claims most likely to be wrong (with corrections)

1. **"AP2 has three mandates: Intent, Cart, Payment."** → AP2 **v0.2** (2026-04-28) defines **Checkout Mandate** (`vct: mandate.checkout.1`, open form `mandate.checkout.open.1`) and **Payment Mandate** (`mandate.payment.1` / `.open.1`), each open or closed. The v0.2 text does not contain "Intent Mandate" or "Cart Mandate" [G53][G9].
2. **"AP2 is Google's protocol."** → Google donated it to **FIDO Alliance** on 2026-04-28 [G10][G11]. The GitHub repo has had **no merged commits since 2026-04-29** [G9], while external security reports (#339 presence-driven constraints, #346 mandate replay, #361 "AP2-17" weak merchant binding, #362 budget ×100 for all currencies) stay open [G12].
3. **"x402 V2 launched June 2026."** → **2025-12-11** [G1] (C3).
4. **"x402 Foundation launched April 2026" (or "July 2026").** → Announced **2026-04-02**, operational **2026-07-14** with 40 members [G2][G3].
5. **"x402 uses `X-PAYMENT` / 402 JSON body; networks are `base`, `base-sepolia`."** → V2 carries everything in headers: `PAYMENT-REQUIRED` (server→client), `PAYMENT-SIGNATURE` (client→server), `PAYMENT-RESPONSE` (server→client), each base64 JSON. "Response bodies are a server implementation concern" [G5]. Networks are **CAIP-2** (`eip155:8453`). V1 used a JSON body, `X-PAYMENT` and `X-PAYMENT-RESPONSE` [G5].
6. **"x402 = exact-amount USDC on Base only."** → The spec defines schemes `exact`, `upto`, `batch-settlement` and `auth-capture` [G4]. `asset` may be an "ISO 4217 currency code for fiat" [G4]. Three payment flows exist: `authorization` (verify→resource→settle), `upfront` and `escrow` [G4]. There is an `exact` binding for Lightning (merged 2026-09-23) [G8] and transports for HTTP, MCP and A2A [G6].
7. **"OpenAI shut down agentic checkout / ACP is dead" and "7 big retailers run ACP checkout."** → OpenAI (2026-03-24) let merchants "use their own checkout experiences" and refocused on discovery. The 7 retailers integrated ACP **for discovery** [G28]. ACP still ships specs (latest release 2026-04-17; SEPs merged through 2026-07-18) [G25]. Meta joined the ACP TSC on 2026-04-24 [G25].
8. **"ACP checkout has 4 states."** → 11 statuses in 2026-04-17 [G25] (C8).
9. **"Only UCP has a well-known discovery document."** → ACP added **`/.well-known/acp.json`** in release 2026-04-17. It is unauthenticated, cacheable (`Cache-Control: public, max-age=3600` recommended), and returns `protocol.version`, `supported_versions`, `api_base_url`, `transports` and `capabilities.services`. It is meant to be served by a seller platform such as `acp.stripe.com` as well as by individual sellers [G26][G25].
10. **"UCP and ACP checkout APIs look the same."** → They differ. UCP: `/checkout-sessions` (hyphen), update with **PUT**, statuses `incomplete, requires_escalation, ready_for_complete, complete_in_progress, completed, canceled` [G21]. ACP: `/checkout_sessions` (underscore), update with **POST**, `ready_for_payment` etc. [G25].
11. **"UCP's AP2 extension is `dev.ucp.shopping.ap2_mandate` and the merchant returns `checkoutSignature`."** → Since v2026-08-25 it is **`dev.ucp.common.payment.ap2_mandate`**. The merchant signs into `ap2.merchant_authorization`. Once the extension is negotiated, the session is "**Security Locked**" and neither side may fall back to an unprotected checkout [G19][G18].
12. **Web Bot Auth header example `Signature-Agent: signer.example.com` with `("@authority" "signature-agent")`.** → In the WG draft, `Signature-Agent` is a **Dictionary** structured field (`Signature-Agent: sig="https://signer.example.com"`). The covered component is `"signature-agent";key="sig"`, `keyid` MUST be a base64url JWK SHA-256 thumbprint, and `tag` MUST be `web-bot-auth`. The bare-string form is "legacy" [G16]. practice.md's example is the legacy form.
13. **"Web Bot Auth is a Cloudflare proposal."** → It is an **IETF working-group draft** (`draft-ietf-webbotauth-httpsig-protocol-00`, 2026-09-01, Cloudflare + Google authors) from a WG chartered on 2025-10-23 [G16][G17].
14. **"EU AI Act Article 26 already governs shopping agents (Aug 2026)."** → No. Annex III high-risk obligations moved to 2027-12-02, and shopping agents are not Annex III [G39] (C18). A sounder liability anchor is **California AB 316** (chaptered 2025-10-13, Ch. 672): it is not a defense that "the artificial intelligence autonomously caused the harm" [G40].
15. **"Mastercard Agent Pay = Verifiable Intent."** → They are different layers. **Agent Pay** is Mastercard's network programme: registered agents, agentic tokens, Web Bot Auth signatures verified at the CDN [G15]. **Verifiable Intent** is an open spec, "Draft (v0.1). Maintained by Mastercard" (v0.1.0 on 2026-02-19): a layered SD-JWT delegation chain co-developed with Google and donated to FIDO in April 2026 [G13][G10][G11].
16. **"MPP is Stripe's proprietary rival to x402."** → MPP is an IETF individual draft defining a `Payment` HTTP authentication scheme (`WWW-Authenticate: Payment …` / `Authorization: Payment …` / `Payment-Receipt`) [G36]. The `mppx` SDK "now supports generic EVM payments and x402 exact flows" (2026-06-08) [G35]. Stripe accepts both MPP and x402 [G33].
17. **"There is an MCP 2.0."** → The revision is **2026-07-28**, a stateless MCP [G48].

## TL;DR (what the three notes missed or got wrong, for a senior engineer)

- **The standards have left their vendors.** AP2 and Verifiable Intent went to FIDO on 2026-04-28 [G10][G11]. x402 is at the Linux Foundation (operational 2026-07-14) [G3]. Web Bot Auth is an IETF WG draft (2026-09-01) [G16]. UCP runs a Governing Council (Google, Shopify, Stripe) plus Food, Lodging and Payments TCs [G22]. ACP remains OpenAI+Stripe-led, with Meta on the TSC [G25].
- **AP2's reference implementation is effectively frozen.** There have been no commits since 2026-04-29, while a July 2026 paper counts **14 structural vulnerabilities in AP2 v0.2.0** [G38], and issues #339, #346, #358, #361 and #362 are open [G12][G9]. Treat AP2 as a credential *design* to implement carefully, not as a hardened SDK.
- **UCP v2026-08-25 is a large breaking release:** payment extensions moved to `dev.ucp.common.payment.*`; `keys[]` is the only signing-key field (`signing_keys[]` was removed); buyer consent became a reverse-DNS map; quantity can be a `measure` object; 3DS2 runs through a new `actions[]` primitive; WBA interop was added [G18].
- **ACP has discovery (`/.well-known/acp.json`), Delegate Authentication (3DS2) and a push-model Feed API since 2026-04-17** [G25][G26]. OpenAI's live product uses ACP mainly for **feeds and discovery**; checkout happens on the merchant's own site or in a ChatGPT app (Walmart) [G28].
- **Discovery on the open web is splitting into layers.** Protocol manifests: `/.well-known/ucp`, `/.well-known/acp.json`, `/.well-known/agent-card.json` [G20][G26]. Signing-key directories: `/.well-known/http-message-signatures-directory` [G16]. Content maps: llms.txt **v2** (Aug 2026) with `rel="describedby"` and `rel="alternate" type="text/markdown"` [G46]. Name-based discovery: the IETF **DAWN** proposed WG (Aug–Sep 2026) and `draft-mozleywilliams-dnsop-dnsaid` [G43][G44]. Registry indexes: NANDA Index [G45].
- **One key can serve three protocols.** UCP publishes a JWK Set in `/.well-known/ucp` that is "also a valid JWK Set — reusable as a Web Bot Auth key source". A deployment may run an Ed25519 key for HTTP identity (WBA) and an ES256 key for AP2 `merchant_authorization` [G20][G19].
- **x402 V2 is richer than the notes say:** Bazaar discovery API (`GET /discovery/resources`), `GET /supported`, extensions (`sign-in-with-x`, `http-message-signatures`, `payment_identifier`, `offer-and-receipt`, gas sponsoring), and payment-flow models [G4][G7].
- **Stripe's current map (docs, 2026-09-30):** to sell *goods* through agents use UCP or ACP; to charge *per call* use MPP or x402. SPT card minimum is 0.50 USD; stablecoin minimum is 0.01 USDC. Networks: MPP on Tempo (USDC.e) and Solana (USDC), x402 on Base (USDC). SPTs are available in the US, CA and about 32 European countries [G33].
- **Visa has shipped more than the notes record:** TAP sample code (Oct 2025) [G14], ICC gateway (2026-04-08) [G31], a Tempo validator node (2026-04-14) [G30], an OpenAI partnership (2026-06-10) [G32], and the BioCatch acquisition (2026-08-03) [G30].
- **Security research has moved from prompt injection to protocol flaws.** arXiv 2607.21824 (2026-07-23) reports 33 deterministic, model-independent vulnerabilities across CoralOS, Fetch.ai uAgents and AP2 v0.2.0, three of which chain into an end-to-end payment hijack [G38].
- **Liability:** AB 316 (CA, 2025) removes the "the AI did it autonomously" defense [G40]. The EU AI Act high-risk dates slipped to Dec 2027 [G39].

## Current state and versions (as of 2026-09-30, verified in this pass)

| Artefact | Current | Date | Source |
|---|---|---|---|
| AP2 | v0.2.0 (GitHub release); spec work in FIDO WGs | 2026-04-28 (v0.1.0: 2025-09-16) | [G9][G11] |
| Verifiable Intent | v0.1 draft (Mastercard-maintained), donated to FIDO | v0.1.0 2026-02-19; donation 2026-04-28 | [G13][G11] |
| ACP | release `2026-04-17`; `unreleased/` has SEPs through 2026-07-18 (product URL on Item, suggested pricing, fulfillment details on complete, order-schema alignment) | 2026-04-17 | [G25] |
| UCP | protocol release `v2026-08-25`; Lodging Booking draft merged 2026-09-24; media variants merged 2026-09-29 | 2026-08-25 | [G18][G22] |
| x402 | protocol v2 (spec on `x402-foundation/x402`); schemes exact/upto/batch-settlement/auth-capture (auth-capture v1.1 2026-08-25); SVM batch-settlement 2026-09-25 | V2 2025-12-11 | [G1][G4][G8] |
| MPP | `draft-httpauth-payment-01` | 2026-09-09 | [G36] |
| Web Bot Auth | `draft-ietf-webbotauth-httpsig-protocol-00` (WG) | 2026-09-01 | [G16] |
| DAWN (agent discovery) | proposed IETF WG, charter 00-07 | 2026-09-11 | [G43] |
| MCP | spec revision 2026-07-28 (stateless) | 2026-07-28 | [G48] |
| llms.txt | v2 | Aug 2026 | [G46] |
| AGNTCY | dir v1.7.1 (2026-09-22), SLIM v3.0.1 (2026-09-30), OASF v1.1.0 (2026-07-10) | — | [G50] |
| Visa TAP | open sample repo + spec; agents registered with Visa, verified at CDN | repo 2025-10-10 | [G14][G15] |
| Visa ICC | pilot | 2026-04-08 | [G31] |
| Stripe machine payments | MPP + x402; SPT; Link Agent Wallet; Agents integration in private preview | docs accessed 2026-09-30 | [G33] |

## Timeline (additions and corrections only)

- **2025-05** — x402 V1 launched ("x402 launched in May 2025") [G1].
- **2025-07-21** — IETF 123 `webbotauth` BoF (Cloudflare, Google, OpenAI, Vercel, BBC use cases) [G17].
- **2025-09-16** — AP2 v0.1.0 tag [G9].
- **2025-10-10** — `visa/trusted-agent-protocol` repo created [G14].
- **2025-10-13** — California AB 316 chaptered (Ch. 672) [G40].
- **2025-10-23** — IETF `webbotauth` WG chartered [G17].
- **2025-10-24** — Cloudflare: Visa TAP and Mastercard Agent Pay both built on Web Bot Auth; tags `agent-browser-auth` / `agent-payer-auth` [G15].
- **2025-12-11** — x402 V2 [G1].
- **2026-02-19** — Verifiable Intent v0.1.0 [G13].
- **2026-02-25** — ACP SEP #137 "Discovery Well-Known Document" merged [G26].
- **2026-03-18** — Tempo Mainnet live; MPP introduced; `draft-ryan-httpauth-payment-01` [G34][G36].
- **2026-03-24** — OpenAI "Powering product discovery in ChatGPT": merchants may use their own checkout; ACP extended to discovery; Walmart in-ChatGPT app [G28].
- **2026-04-02** — Linux Foundation announces the x402 Foundation (22 organisations expressing intent) [G2].
- **2026-04-08** — Visa Intelligent Commerce Connect (pilot) [G31]; UCP v2026-04-08 (Cart, Catalog search/lookup, Order update, identity-linking OAuth foundation, request/response signing) [G18].
- **2026-04-14** — Visa validator node on Tempo [G30]; Amex ACE developer kit (headline only) [G52].
- **2026-04-17** — ACP 2026-04-17: Feed API, Cart, Delegate Authentication, `/.well-known/acp.json`, mandatory idempotency, marketing consent [G25].
- **2026-04-24** — Meta added as ACP TSC member [G25]; UCP Tech Council expanded to 16 seats [G22].
- **2026-04-28** — AP2 v0.2.0 released and donated to FIDO; Verifiable Intent donated to FIDO; Stripe joins the UCP Governing Council [G9][G10][G11][G22].
- **2026-05-26** — AP2 #268: the checkout-JWT algorithm rule forces two keys under WBA; UCP documents the conflict [G12][G19].
- **2026-06-08** — `mppx` adds generic EVM and x402 exact flows [G35].
- **2026-06-10** — Visa partners with OpenAI (tokenized credentials, spending limits) [G32].
- **2026-07-01** — Cloudflare Monetization Gateway (x402 at the edge; waitlist) [G37].
- **2026-07-14** — x402 Foundation operational, 40 members [G3].
- **2026-07-23** — arXiv 2607.21824, protocol-level attacks on agentic commerce (AP2 v0.2.0: 14 vulns) [G38].
- **2026-07-28** — MCP revision 2026-07-28 (stateless) [G48].
- **Aug 2026** — llms.txt v2 [G46]; EU AI Act page updated 2026-08-03 (Annex III → 2027-12-02) [G39].
- **2026-08-24** — IETF DAWN group record created (proposed) [G43].
- **2026-08-25** — UCP v2026-08-25 (breaking) [G18]; x402 auth-capture v1.1 [G8].
- **2026-09-01** — `draft-ietf-webbotauth-httpsig-protocol-00` [G16].
- **2026-09-02** — AP2 #346 (mandate replay) filed [G12]; UCP Payments TC [G22].
- **2026-09-09** — `draft-httpauth-payment-01` (MPP re-submission) [G36].
- **2026-09-23** — x402 exact on Lightning spec merged [G8].
- **2026-09-24/25** — UCP Lodging Booking capability merged / announced [G22].

## Mechanics (gap-filling detail)

### 1. x402 V2 wire format (VERBATIM, [G4])

PaymentRequired (sent base64-encoded in the `PAYMENT-REQUIRED` header with status 402):
```json
{
  "x402Version": 2,
  "error": "PAYMENT-SIGNATURE header is required",
  "resource": {
    "url": "https://api.example.com/premium-data",
    "description": "Access to premium market data",
    "mimeType": "application/json",
    "serviceName": "Example Market Data",
    "tags": ["market-data", "finance"],
    "iconUrl": "https://api.example.com/icon.png"
  },
  "accepts": [
    {
      "scheme": "exact",
      "network": "eip155:84532",
      "amount": "10000",
      "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      "payTo": "0x209693Bc6afc0C5328bA36FaF03C514EF312287C",
      "maxTimeoutSeconds": 60,
      "extra": {
        "name": "USDC",
        "version": "2"
      }
    }
  ],
  "extensions": {}
}
```
PaymentPayload (sent base64-encoded in `PAYMENT-SIGNATURE`) echoes the chosen requirement as `accepted` and carries a scheme-specific `payload`. For EVM `exact` that is an EIP-712 `signature` plus EIP-3009 `authorization {from,to,value,validAfter,validBefore,nonce}` [G4]. SettlementResponse (in `PAYMENT-RESPONSE`), VERBATIM:
```json
{
  "success": true,
  "transaction": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "network": "eip155:84532",
  "payer": "0x857b06519E91e3A54538791bDbb0E22373e36b66"
}
```
- `transaction` MUST be non-empty when `errorReason` is `settlement_pending` [G4].
- Facilitator interface: `POST /verify`, `POST /settle`, `GET /supported`. The last returns `kinds[] {x402Version, scheme, network}`, `extensions[]` and `signers` keyed by CAIP-2 pattern (`"eip155:*"`, `"solana:*"`) [G4].
- Discovery ("Bazaar"): `GET /discovery/resources?type=&payTo=&scheme=&network=&extensions=&limit=&offset=` [G4].
- **Payment flow models** (§6.1, VERBATIM table rows) [G4]:
  - `authorization` (default): "verify → resource → settle → respond".
  - `upfront`: "settle → resource → respond"; "Required by networks with no pull-settlement primitive".
  - `escrow`: "settle → resource → settle → respond".
  - Invariant: "The resource never executes with nothing checked". Clients "SHOULD prefer `authorization`" when both kinds are offered.
- **x402 over MCP** [G6]: an unpaid tool call returns a result with `isError: true`, with `PaymentRequired` in `structuredContent` *and* as a JSON string in `content[0].text`. The client retries with `_meta["x402/payment"]`, and the server returns settlement in `_meta["x402/payment-response"]`.
- **x402 over A2A**: task `state: "input-required"` with metadata `x402.payment.status: "payment-required"` and `x402.payment.required` [G6]. The older Google repo `google-agentic-commerce/a2a-x402` has seen only dependency and release chores since May 2026 [G51].
- **Identity extensions** [G7]:
  - `sign-in-with-x` (CAIP-122 wallet sign-in, so returning payers can skip re-paying): server ↔ client only, no facilitator.
  - `http-message-signatures`, VERBATIM `info`:
```json
{
  "registrationUrl": "https://network.example.com/signature-agents",
  "signatureSchemes": ["ed25519", "ecdsa-p256-sha256", "rsa-pss-sha512"],
  "tags": ["web-bot-auth", "agent-browser-auth"]
}
```

### 2. MPP: the `Payment` HTTP authentication scheme (VERBATIM, [G36])

```
HTTP/1.1 402 Payment Required
Cache-Control: no-store
WWW-Authenticate: Payment id="x7Tg2pLqR9mKvNwY3hBcZa",
    realm="api.example.com",
    method="example",
    intent="charge",
    expires="2025-01-15T12:05:00Z",
    request="eyJhbW91bnQiOiIxMDAwIiwiY3VycmVuY3kiOiJVU0QiLCJyZWNpcGllbnQiOiJhY2N0XzEyMyJ9"
```
- The client retries with `Authorization: Payment <credential>` (base64url, no padding). The server answers `200 OK` with `Payment-Receipt: <receipt>`.
- For requests with a body, the challenge SHOULD include a `digest` parameter per RFC 9530, and the server MUST reject a credential whose digest mismatches.
- Every payment-barrier response is a 402 carrying a fresh challenge [G36].
- Difference from x402: MPP reuses the standard HTTP auth framework (`WWW-Authenticate` / `Authorization`) instead of custom headers. The payment method is a registered identifier, so cards via SPT and stablecoins are both possible (Stripe: MPP accepts both, x402 is stablecoin-only on Stripe) [G33][G36].
- Stripe flow (COMPOSED from [G33]): the server returns 402, the agent retries with a credential, and the server calls `POST /v1/payment_intents` to record the payment. The `networkId` is the seller's Stripe profile id (`profile_…`), retrieved via `GET /v2/network/business_profiles/me` with `Stripe-Version: 2026-07-29.preview` [G33].

### 3. Web Bot Auth: the WG draft (VERBATIM, [G16])

```
GET /path/to/resource HTTP/1.1
Host: origin.example.com
Signature: sig=abc==
Signature-Input: sig=("@authority" "signature-agent";key="sig");\
                 created=1700000000;\
                 expires=1700011111;\
                 keyid="ba3e64==";\
                 tag="web-bot-auth"
Signature-Agent: sig="https://signer.example.com"
```
Rules [G16]:
- Cover at least `@authority` or `@target-uri`.
- `created`, `expires`, `keyid` and `tag` are mandatory. `keyid` MUST be a JWK SHA-256 thumbprint; `tag` MUST be `web-bot-auth`.
- Expiry is RECOMMENDED to be no more than 24 hours.
- "No component covers the body"; an agent that needs body integrity MUST send and cover `Content-Digest`.
- Replay protection defers to RFC 9421 §7.2.2 (the `nonce` param); the draft adds "no additional nonce requirements".
- `Signature-Agent` members carry a `type` param (default `directory`). The directory is JWKS served at `/.well-known/http-message-signatures-directory` with media type `application/http-message-signatures-directory+json`.
- Keys resolve *after* the first request and are cached.
- Security sections: SSRF when fetching directories, "Shared Secrets Considered Harmful", "Key Reuse Considered Harmful".
- Multiple signatures: an outer signer that covers an inner signature MUST also cover its `signature-input` and every component the inner signature covers. This covering "does not express authorization, delegation, or consent" [G16].

### 4. Visa TAP / Mastercard Agent Pay on the wire (VERBATIM)

From the Visa sample agent (`tap-agent/agent_app.py`, [G14]):
```
signature_input_header = f'sig2=("@authority" "@path"); created={created}; expires={expires}; keyId="{keyid}"; alg="rsa-pss-sha256"; nonce="{nonce}"; tag="{tag}"'
```
The same file has an `alg="ed25519"` variant. `tag` is `"agent-browser-auth"` or `"agent-payer-auth"` [G14]. The Visa CDN-proxy sample keeps a nonce cache with `NONCE_TTL = 3600000; // 1 hour` and rejects reuse with 403 [G14].

Cloudflare's example (2025-10-24, VERBATIM, reconstructed from the page text, which splits tokens with spaces) [G15]:
```
GET /path/to/resource HTTP/1.1
Host: www.example.com
User-Agent: Mozilla/5.0 Chrome/113.0.0 MyShoppingAgent/1.1
Signature-Input: sig2=("@authority" "@path"); created=1735689600; expires=1735693200; keyid="poqkLGiymh_W0uP6PZFw-dvez3QJT5SolqXBCW38r0U"; alg="Ed25519"; nonce="e8N7S2MFd/qrd6T2R3tdfAuuANngKI7LFtKYI/vowzk4IAZyadIX6wW25MwG7DCT9RUKAJ0qVkU0mEeLEIW1qg=="; tag="web-bot-auth"
Signature: sig2=:jdq0SqOwHdyHr9+r5jw3iYZH6aNGKijYp/EstF4RQTQdi5N5YYKrD+mCT1HA1nZDsi6nJKuHxUi/5Syp3rLWBA==:
```
Edge checks (paraphrased list from [G15]):
1. `Signature-Input` and `Signature` are present.
2. `keyid` is fetched from the network's directory and cached ("Visa and Mastercard will be hosting their own directories").
3. `created ≤ now ≤ expires`.
4. The nonce is unique.
5. The tag is valid: `agent-browser-auth` for browsing, `agent-payer-auth` for paying.
6. The signature base is rebuilt from the covered components.
7. The Ed25519 signature is verified.

TAP additionally passes consumer and payment identifiers to the merchant, e.g. Payment Account References (PARs), loyalty numbers, email and phone, "via query parameters" [G14].

### 5. Verifiable Intent: the layered SD-JWT chain [G13]

- **L1** (Credential Provider → User): SD-JWT with identity claims, `pan_last_four`, `scheme`, and `cnf.jwk` = user device key. Lifetime about 1 year.
- **L2** (User → Agent/Verifier): KB-SD-JWT.
  - *Immediate* mode: final `checkout_jwt` plus final payment values, no `cnf`; about 15 minutes.
  - *Autonomous* mode: constraints plus `cnf.jwk` = agent key; 24 hours to 30 days.
- **L3** (Autonomous only), split in two:
  - **L3a** (payment → network): `transaction_id`, `payment_instrument`.
  - **L3b** (checkout → merchant): `checkout_jwt`, `checkout_hash`.
  - Both are signed by the agent key and live about 5 minutes. Cross-check: "L3a transaction_id == L3b checkout_hash".
- Five constraint types in v0.1: `mandate.checkout.line_items`, `mandate.checkout.allowed_merchants`, `mandate.payment.allowed_payees`, `mandate.payment.amount_range`, `mandate.payment.reference` [G13]. AP2 names its constraints without the `mandate.` prefix (`checkout.line_items`) [spec S2].
- Out of scope for VI: transport, key provisioning, dispute resolution. It positions itself as "a concrete implementation for that VDC layer" that AP2 "deliberately leaves … implementation-defined", carried in UCP's AP2 fields or as an ACP extension [G13].

### 6. UCP × AP2 × WBA: the nested signature (from [G19][G20])

VERBATIM checkout response with the merchant's signature [G19]:
```json
{
  "ucp": { ... },
  "id": "chk_abc123",
  "status": "ready_for_complete",
  "currency": "USD",
  "line_items": [ ... ],
  "totals": [ ... ],
  "links": [ ... ],
  "ap2": {
    "merchant_authorization": "eyJhbGciOiJFUzI1NiIsImtpZCI6Im1lcmNoYW50XzIwMjUifQ..<signature>"
  }
}
```
- The business signs JCS(checkout minus `ap2`) with a protected header `{alg, kid}`. The `kid` points into the business profile's `keys[]` in `/.well-known/ucp` [G19].
- `checkout_mandate` "MUST contain the full checkout response including the `ap2.merchant_authorization` field … the platform's signature covers the business's signature" [G19].
- The payment mandate travels in `payment.instruments[*].credential.token` [G19].
- **Why JCS here but not for request signatures:** UCP request signatures use `Content-Digest` over raw bytes. Mandates are durable evidence that passes platform → business → PSP → network and may be re-serialised along the way, so the signed bytes must be reproducible [G19].
- **Algorithm conflict** (AP2 #268): AP2 v0.2's specification.md requires non-deterministic ECDSA for the checkout JWT, while its security section states an entropy rule. Under the ECDSA reading a merchant needs an Ed25519 key for WBA *and* an ES256 key for AP2. UCP's profile example shows exactly those two keys [G19][G20][G12].
- **Platform identification** [G20]:
  - HTTP: `UCP-Agent: profile="https://agent.example/profiles/shopping-agent.json"` (RFC 8941 dictionary).
  - MCP: `arguments.meta["ucp-agent"].profile` inside `tools/call`.
  - A WBA verifier reads UCP `keys[]` only if `Signature-Agent` selects it with `type=jwks_uri` (or `type=cimd`); the default `type=directory` expects a *signed* directory at `/.well-known/http-message-signatures-directory`.

### 7. UCP identity linking and orders (filling spec.md's "not read")

- **Identity linking** (`dev.ucp.common.identity_linking`) [G23]:
  - The business runs its own OAuth 2.0 authorization server with RFC 8414 metadata at `/.well-known/oauth-authorization-server`; PKCE S256 is mandatory.
  - UCP `config.scopes` declares *hard gates*, e.g. `dev.ucp.shopping.order:read`, `dev.ucp.shopping.order:manage`. OAuth `scopes_supported` minus `config.scopes` is the optional layer.
  - **Accelerated IdP flow** (profiles draft-ietf-oauth-identity-chaining): the platform exchanges its IdP token (RFC 8693, `requested_token_type=urn:ietf:params:oauth:token-type:jwt`) for a JWT authorization grant, which it presents to the business token endpoint with `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer` (RFC 7523).
  - The grant's `aud` MUST be a single value and `jti` MUST be present; `exp` SHOULD be ≤ 60 s after `iat`. "The platform **MUST NOT** present a raw IdP token directly to a business."
- **Orders** (`dev.ucp.shopping.order`) [G24]:
  - The model has line items, fulfillment *expectations* vs an append-only *events* log, and *adjustments* (refunds, returns, disputes; append-only preferred).
  - Retrieval is `GET /orders/{id}`, but platforms "SHOULD rely on webhooks".
  - Webhooks follow Standard Webhooks headers (`Webhook-Id`, `Webhook-Timestamp`), except that signing uses RFC 9421. The webhook URL comes from the platform profile's `config.webhook_url`.

### 8. ACP discovery document (VERBATIM example, [G26])

```json
{
  "protocol": {
    "name": "acp",
    "version": "2025-09-29",
    "supported_versions": ["2025-09-29"]
  },
  "api_base_url": "https://merchant.example.com/api",
  "transports": ["rest"],
  "capabilities": {
    "services": ["checkout"]
  }
}
```
- It MUST NOT contain `merchant_id` (to prevent enumeration on multi-seller platforms). Payment methods are deliberately excluded because they are merchant-specific and context-dependent. `transports` may include `"mcp"` (SEP #135).
- Since 2026-04-17, agents check `services` for `"carts"` before using cart operations [G26][G25].
- PCI scope per OpenAI: the Feed and Checkout specs are "deliberately kept out of PCI scope". Integrating the Delegated Payment endpoints directly "will likely be in PCI scope", and OpenAI "intend[s] to migrate entirely to using network tokens" [G27].

### 9. Discovery on the open web: what is real now

| Layer | Mechanism | Status | Source |
|---|---|---|---|
| Commerce manifest | `/.well-known/ucp` (capabilities, services, payment_handlers, `keys[]`) | shipped, v2026-08-25 | [G20] |
| Commerce manifest | `/.well-known/acp.json` | shipped in ACP 2026-04-17 | [G26] |
| Agent card | `/.well-known/agent-card.json` (A2A; referenced by UCP's `a2a` transport) | in use | [G20] |
| Bot/agent keys | `/.well-known/http-message-signatures-directory` (JWKS) | IETF WG draft | [G16] |
| Content map | `/llms.txt` v2 + `Link: rel="describedby"` / `rel="alternate" type="text/markdown"` | community proposal; checked by a Chrome Lighthouse "agentic browsing" audit (N/A if missing) | [G46][G47] |
| DNS | `draft-mozleywilliams-dnsop-dnsaid-02` ("DNS for AI Discovery", 2026-05-27); IETF **DAWN** proposed WG considers "DNS and mDNS as mechanisms" | drafts / proposed charter | [G44][G43] |
| Index/registry | NANDA Index: one record per org mapping to an AI Catalog, DNS-AID, A2A Agent Card or personal card ("first hop in a three-hop resolution chain"); AgentFacts format repo | research code | [G45] |
| Registry (LF) | AGNTCY Agent Directory (dir v1.7.1), OASF schema v1.1.0, SLIM messaging v3.0.1 | shipped OSS | [G50] |
| Payable-API catalog | x402 Bazaar `GET /discovery/resources`; Stripe Directory (submission needs a link to your `llms.txt`) | shipped | [G4][G33] |

DAWN's charter explicitly excludes capability catalogues, search and ranking, identity management and trust evaluation: "DAWN focuses on this initial discovery only" [G43]. It will not replace `/.well-known/ucp`-style capability negotiation.

### 10. Comparison matrix (corrected)

| | AP2 | Verifiable Intent | ACP | UCP | x402 | MPP | Visa TAP / MC Agent Pay | Web Bot Auth |
|---|---|---|---|---|---|---|---|---|
| Layer | user→agent authorization credentials | same (concrete VDC format) | checkout + delegated payment + feeds | discovery + catalog + cart + checkout + order + identity | per-request payment over HTTP/MCP/A2A | per-request payment (HTTP auth scheme) | agent identity + intent at merchant edge | bot/agent identity |
| Steward | FIDO Alliance (from Google) | FIDO (from Mastercard) | OpenAI + Stripe (+ Meta on TSC) | UCP Governing Council (Google, Shopify, Stripe) + TCs | x402 Foundation (LF) | Stripe + Tempo; IETF individual draft | Visa / Mastercard | IETF webbotauth WG |
| Version | v0.2.0 (2026-04-28) | v0.1 draft (2026-02-19) | 2026-04-17 | v2026-08-25 | v2 (2025-12-11) | draft-httpauth-payment-01 (2026-09-09) | n/a (programmes) | wg draft -00 (2026-09-01) |
| Crypto primitive | SD-JWT VC + KB, `cnf` | layered SD-JWT / KB-SD-JWT | HMAC/detached request signatures, vault tokens | RFC 9421 + JWS detached + JCS | EIP-712/EIP-3009 etc. per scheme | method-specific credential | RFC 9421 (Web Bot Auth + tags) | RFC 9421 + JWKS directory |
| Discovery | none (rides on UCP/A2A) | none | `/.well-known/acp.json` | `/.well-known/ucp` | Bazaar API | Stripe Directory / mpp.dev services | network-hosted key directories | `Signature-Agent` + well-known directory |
| Money moves on | whatever rail | n/a | merchant's PSP (SPT, network tokens) | business's PSP via payment handlers | chain (facilitator) or fiat facilitator | Stripe (card via SPT, Tempo/Solana stablecoin) | card rails | n/a |
| Sources | [G9][G11] | [G13] | [G25][G26] | [G18][G20][G22] | [G3][G4] | [G33][G36] | [G14][G15] | [G16] |

### 11. What a developer should actually build (COMPOSED checklist from [G19][G20][G26][G33][G16])

1. Serve `/.well-known/ucp` with REST and optionally MCP bindings, `dev.ucp.shopping.checkout` and `keys[]` (ES256; add an Ed25519 key if you also want WBA). Serve `/.well-known/acp.json` if you want ChatGPT or ACP agents.
2. Publish product feeds: ACP Feed API or OpenAI file upload; Merchant Center or Shopify Catalog for Google and Shopify [G27][G49].
3. At the edge, verify RFC 9421 signatures: `web-bot-auth`, plus `agent-browser-auth` / `agent-payer-auth` for card-network agents. Keep a nonce cache and SSRF-safe directory fetching [G16][G14].
4. For paid APIs and MCP tools, return 402 with x402 V2 headers and/or an MPP `WWW-Authenticate: Payment` challenge, and settle via a facilitator or Stripe [G4][G33][G36].
5. If you accept AP2 or VI mandates, verify the chain against the *live* checkout, persist a `transaction_id` consumption record atomically (the AP2 #346 lesson), and treat an absent constraint as a failure, not a pass (#339) [G12].

## Numbers (with conditions)

- x402 Foundation: 40 members at operational launch (17 Premier / 18 General / 5 Associate), 2026-07-14, Linux Foundation release [G3]. 22 organisations in the 2026-04-02 intent list [G2].
- x402: "processed over 100M payments across APIs, apps, and AI agents" in its first ~6 months (vendor claim, x402 team, 2025-12-11) [G1]. Contested by independent analyses cited in practice/field.
- arXiv 2607.21824 (Louck, 2026-07-23): 33 structural vulnerabilities across 3 platforms (CoralOS, Fetch.ai uAgents with 8, AP2 v0.2.0 with 14); "100% attack-success rate (ASR) wherever live-measured"; 3 chain into an end-to-end payment hijack; the PCAT defense drives structural ASR to 0 for 4 of 5 classes [G38].
- Stripe machine payments (docs, 2026-09-30): SPT card minimum 0.50 USD; stablecoin minimum 0.01 USDC; MPP sessions bill sub-cent but settle at ≥ 0.01 USDC; stablecoin acceptance in all US states except New York [G33].
- SPT availability: US, Canada and 32 European country codes listed (34 codes total) [G33].
- Web Bot Auth: signature expiry RECOMMENDED ≤ 24 h [G16]. Visa sample nonce TTL is 1 h [G14].
- UCP identity chaining: JWT grant `exp` SHOULD be ≤ 60 s [G23].
- VI lifetimes: L1 about 1 year; L2 about 15 min (immediate) or 24 h–30 days (autonomous); L3 about 5 min [G13].
- ACP discovery: `Cache-Control: public, max-age=3600` recommended; update no more than hourly [G26]. ACP `Idempotency-Key` retention is 24 h (RFC changelog) [G25].
- UCP governance: Tech Council 16 seats (2026-04-24); Governing Council of Google, Shopify, Stripe plus 2 open elected seats (2026-04-28); Food TC 5, Lodging TC 7, Payments TC 8 founding members [G22].
- Visa ICC pilot: 7 named partners [G31].
- Cloudflare Monetization Gateway example prices: "$0.001 base fee plus $0.01 per MB", "$0.99 per resolved support escalation" (2026-07-01, illustrative) [G37].
- FIDO: "agentic commerce, which some analysts estimate could reach $5 trillion globally by 2030" (analyst estimate quoted in the FIDO release, 2026-04-28) [G11].

## Pitfalls, limits, criticism (new or sharpened)

- **Reference implementations are not specs.** AP2's SDK has open issues where one consent can be redeemed twice (#346), a withheld SD-JWT disclosure silently disables a constraint (#339), `CheckoutMandateChain.verify` does not enforce closed-mandate binding (#358), and the budget cap uses `max*100` for all currencies (#362) [G12]. The repo has had no commits since 2026-04-29 [G9].
- **Two keys by accident.** The AP2 algorithm rule vs Ed25519 WBA identity is unresolved (AP2 #268, open since 2026-05-26) [G12][G19].
- **Signature scope.** A WBA signature over `@authority` alone "verifies against any method, path, or body sent to that authority until it expires" [G16]. TAP narrows it with `@path` and a nonce [G14]. Body integrity needs `Content-Digest`.
- **Directory fetching is an SSRF surface.** The WG draft has a dedicated SSRF section and bounded-fetch guidance [G16].
- **Spec vs product drift at OpenAI.** Developer docs still describe Instant Checkout and give 409 for idempotency conflicts, while the product (Mar 2026) and the RFC (422) have moved on [G27][G28][G25].
- **Security locking in UCP.** Once `ap2_mandate` is negotiated, a `complete` request without `ap2.checkout_mandate` MUST fail; there is no graceful downgrade inside that session [G19].
- **Stale MCP assumptions.** UCP's and x402's MCP bindings predate the stateless MCP 2026-07-28, so check SDK compatibility [G48][G20][G6].
- **KYA marketing.** "KYA standard" claims are vendor-authored [G41]. Standards bodies are working on registration/discovery (DAWN) and signatures (webbotauth), and both explicitly exclude trust evaluation from scope [G43][G16].

## What changed in the last 6 months (Apr–Sep 2026), including items none of the notes caught

- AP2 v0.2.0 + FIDO donation; Verifiable Intent donated to FIDO; FIDO Agentic Authentication + Payments WGs (2026-04-28) [G10][G11]. *(VI donation and WG chairs: not in any note.)*
- ACP 2026-04-17 shipped `/.well-known/acp.json`, Delegate Authentication (3DS2), Cart and mandatory idempotency; Meta joined the TSC [G25][G26]. *(Discovery and Meta: not in any note.)*
- Visa: ICC (Apr 8), Tempo validator (Apr 14), Agentic Ready expansion (Apr 29), OpenAI partnership (Jun 10), BioCatch acquisition (Aug 3) [G30][G31][G32]. *(Only the OpenAI item appeared, as a headline.)*
- MPP: x402 exact support (Jun 8), relays (Aug 3), identity support in mppx (Aug 12); IETF re-submission (Sep 9) [G35][G36].
- MCP 2026-07-28 (stateless) [G48].
- x402: operational Foundation (Jul 14); auth-capture v1.1 (Aug 25); v2 spec §8 discovery fields corrected (Aug 31); Lightning exact (Sep 23); SVM batch-settlement (Sep 25) [G3][G8].
- UCP v2026-08-25 breaking release; Payments TC; Lodging Booking draft [G18][G22].
- **IETF: `draft-ietf-webbotauth-httpsig-protocol-00` (Sep 1) and DAWN proposed WG (Aug–Sep)** [G16][G43]. *(Not in any note.)*
- llms.txt v2 (Aug 2026) [G46]. *(spec.md gives only a date.)*
- EU AI Act high-risk timeline pushed to Dec 2027 (page updated Aug 3) [G39]. *(Contradicts practice.md.)*

## Diagram candidates

1. **Web Bot Auth first-contact sequence.** Agent, Origin, Directory. Arrows: "signed request + Signature-Agent URL" → "resolve keys (if not cached)" → "JWKS" → "response"; later requests use the cache [G16].
2. **Card-network agent verification at the edge.** Agent (registered with Visa/Mastercard), Cloudflare edge, network key directory, merchant origin. States: browse (`agent-browser-auth`) vs pay (`agent-payer-auth`). The edge runs the 7-step checklist (headers, key fetch, time window, nonce, tag, signature base, Ed25519 verify) [G15][G14].
3. **Verifiable Intent L1→L2→L3a/L3b chain.** Credential Provider → User device key → Agent key. The split arrows go to the Network (L3a) and the Merchant (L3b), and the cross-check `transaction_id == checkout_hash` is drawn between them [G13].
4. **UCP+AP2 nested signatures.** A box for the checkout JSON (signed by the business → `ap2.merchant_authorization`) sits inside the `checkout_mandate` (signed by the user or agent). A separate payment mandate goes into `payment.instruments[].credential.token` → PSP → network [G19].
5. **x402 payment-flow models.** Three swimlanes (authorization / upfront / escrow) showing the order of verify, resource and settle [G4].
6. **x402 over MCP.** tools/call → `isError:true` + `structuredContent`(PaymentRequired) → retry with `_meta["x402/payment"]` → result with `_meta["x402/payment-response"]` [G6].
7. **MPP challenge/response.** 402 + `WWW-Authenticate: Payment id, method, intent, request[, digest]` → `Authorization: Payment` → `Payment-Receipt` → Stripe PaymentIntent [G36][G33].
8. **UCP accelerated identity linking.** Platform, IdP, Business AS. Arrows: RFC 8693 token exchange (subject_token → JWT grant, aud = business) → RFC 7523 jwt-bearer → business access token [G23].
9. **Open-web discovery stack.** Layers from DNS (DNS-AID/DAWN) → index (NANDA) → well-known manifests (ucp, acp.json, agent-card.json, http-message-signatures-directory) → content (llms.txt v2) → catalogs (feeds, Bazaar) [G43][G44][G45][G20][G26][G16][G46][G4].
10. **Governance map.** FIDO (AP2, VI), Linux Foundation (x402, AGNTCY), IETF (webbotauth, httpauth Payment, DAWN), UCP councils, ACP OpenAI+Stripe+Meta, with arrows showing which company sits where (Stripe in UCP, ACP, x402, MPP) [G3][G11][G22][G25][G36].
11. **Checkout state machines side by side.** ACP (11 statuses) vs UCP (6 statuses) [G25][G21].
12. **Stripe decision tree.** "Selling goods?" → UCP/ACP (SPT); "Charging per call?" → MPP (card via SPT, Tempo/Solana stablecoin) or x402 (Base USDC) [G33].

**Chart candidates (real series):**
- x402 Foundation membership: 2026-04-02 = 22 intent signatories [G2]; 2026-07-14 = 40 members (17/18/5) [G3].
- UCP protocol releases: 2026-01-11, 2026-01-23, 2026-04-08, 2026-08-25 (GitHub release dates) [G18].
- UCP governance bodies: Tech Council 16 seats (2026-04-24); TCs created 2026-07-16 (5 members), 2026-08-11 (7), 2026-09-02 (8) [G22].
- ACP spec releases: 2025-09-29, 2025-12-12, 2026-01-16, 2026-01-30, 2026-04-17 [G25].

## Glossary (additions)

- **`PAYMENT-REQUIRED` / `PAYMENT-SIGNATURE` / `PAYMENT-RESPONSE`**: the x402 V2 HTTP headers carrying base64 JSON for PaymentRequired, PaymentPayload and SettlementResponse [G5].
- **Payment flow (x402)**: the order of verify, resource and settle: `authorization`, `upfront` or `escrow` [G4].
- **Bazaar (x402)**: the discovery API/catalog of x402-payable resources [G4].
- **SIWX**: `sign-in-with-x`, an x402 extension for CAIP-122 wallet sign-in so returning payers can skip paying again [G7].
- **MPP**: Machine Payments Protocol (Stripe + Tempo), the IETF-drafted `Payment` HTTP authentication scheme [G36].
- **Tempo**: a stablecoin payments L1 incubated by Stripe and Paradigm; mainnet 2026-03-18 [G34].
- **SPT**: Shared Payment Token (Stripe), a scoped grant of a customer's payment method to a seller, with usage and expiry limits [G33].
- **Link Agent Wallet**: Stripe's wallet for agents, used to fund them and issue SPTs [G33].
- **Verifiable Intent (VI)**: Mastercard-originated layered SD-JWT delegation spec, now at FIDO [G13][G11].
- **`agent-browser-auth` / `agent-payer-auth`**: RFC 9421 `tag` values that separate browsing from paying in Visa TAP and Mastercard Agent Pay [G15].
- **Signature-Agent**: the Web Bot Auth header (a Dictionary) pointing to the signer's key source [G16].
- **Intelligent Commerce Connect (ICC)**: Visa's protocol-agnostic gateway (TAP/MPP/ACP/UCP) [G31].
- **`merchant_authorization`**: the UCP AP2 extension field holding the business's detached JWS over the checkout [G19].
- **Security Locked (UCP)**: once AP2 is negotiated, the session cannot fall back to unprotected checkout [G19].
- **`/.well-known/acp.json`**: the ACP discovery document [G26].
- **DAWN**: Discovery of Agents With Names, an IETF proposed WG for initial agent discovery (DNS/mDNS) [G43].
- **DNS-AID**: `draft-mozleywilliams-dnsop-dnsaid`, publishing AI agents in DNS [G44].
- **NANDA Index**: an org-level index record mapping to agent catalogs or cards [G45].
- **FIDO Agentic Authentication TWG / Payments TWG**: the FIDO bodies now developing AP2 and VI [G11].

## Unverified / open questions

- **Mastercard Agent Pay mechanics and rollout** (APAC markets, the Santander EU pilot, "agentic tokens"): mastercard.com returned 403 to curl and WebFetch. The only primary-adjacent evidence is Cloudflare's post (Agent Pay uses Web Bot Auth, a Mastercard-hosted directory and the tag values) [G15]. Market counts remain secondary (custena).
- **Amex ACE**: the HN title (2026-04-14) says "Ace Developer Kit with **Registered Agent Protection**" [G52], while custena (via practice.md) says "Agent Purchase Protection". The Amex article body could not be read (WebFetch returned only the headline). The product name and coverage terms are unresolved.
- **"~12 Shopify merchants went live with Instant Checkout"**: only thekeyword.co and custena report it [G29]. The OpenAI post gives no number [G28].
- **Visa–OpenAI (2026-06-10) specifics**: WebFetch summary only. No protocol (ACP/TAP) is named in what was returned, and no launch date [G32].
- **KYA-OS at DIF**: the claim appears on Vouched's site [G41]. It was not found on DIF pages beyond a "Trusted AI Agents" WG [G42].
- **Cloudflare Monetization Gateway**: the x402 version and header details are not in the WebFetch summary [G37]. The raw page did not yield article text via curl.
- **x402 real volume** (100M claim vs independent decline analyses) and the **TRM Labs 0.6–7.5%** agent-share figure: not re-verified here.
- **Alipay "120M AI transactions/week"** and **Revolut AP2 (2026-01-19)**: not re-verified.
- **Whether OpenAI fully removed in-chat Instant Checkout** or kept it as an option for some merchants: the primary text says "allowing merchants to use their own checkout experiences". The developer docs still describe Instant Checkout [G27][G28].
- **Google "Universal Cart" (field.md, via Habr)**: not verified. Google's UCP page lists AI Mode in Search and Gemini web as surfaces and says nothing of YouTube [G49].
- **"Agent Plugins 1.0.0" (field.md)**: not verified. Likely belongs to ch.06 anyway.
- Session limits: WebSearch unavailable (budget 200/200 exhausted before this run); Reddit, X and AP News not accessible.

## Sources

- [G1] "Introducing x402 V2: Evolving the Standard for Internet-native Payments", x402 (Reppel, Roscoe, Nickerson), dated December 11, 2025 (page also shows June 24, 2026), https://x402.org/x402-v2-launch/, accessed 2026-09-30.
- [G2] "Linux Foundation is Launching the x402 Foundation and Welcoming the Contribution of the x402 Protocol", The Linux Foundation, 2026-04-02, https://www.linuxfoundation.org/press/linux-foundation-is-launching-the-x402-foundation-and-welcoming-the-contribution-of-the-x402-protocol, accessed 2026-09-30.
- [G3] "Linux Foundation Announces Operational Launch of x402 Foundation…", x402.org, 2026-07-14, https://x402.org/linux-foundation-announces-operational-launch-of-x402-foundation-to-standardize-internet-native-payments-for-ai-agents-and-applications/, accessed 2026-09-30.
- [G4] "X402 Protocol Specification (Protocol Version 2)", x402-foundation/x402 `specs/x402-specification-v2.md` (main; spec commits through 2026-09-29), https://github.com/x402-foundation/x402/blob/main/specs/x402-specification-v2.md, accessed 2026-09-30.
- [G5] x402 HTTP transport specs v1 and v2, `specs/transports-v1/http.md`, `specs/transports-v2/http.md`, x402-foundation/x402, accessed 2026-09-30.
- [G6] x402 MCP and A2A transport specs, `specs/transports-v2/mcp.md`, `specs/transports-v2/a2a.md`, x402-foundation/x402, accessed 2026-09-30.
- [G7] x402 extensions `specs/extensions/http-message-signatures.md`, `sign-in-with-x.md` (+ directory listing), x402-foundation/x402, accessed 2026-09-30.
- [G8] x402-foundation/x402 commit history on `specs/` (2026-08-25 … 2026-09-29), GitHub API, accessed 2026-09-30.
- [G9] google-agentic-commerce/AP2: tags v0.1.0 (2025-09-16) and v0.2.0 (2026-04-28), CHANGELOG.md, commit history (last commit 2026-04-29), https://github.com/google-agentic-commerce/AP2, accessed 2026-09-30.
- [G10] "We're donating Agent Payments Protocol to the FIDO Alliance…", Stavan Parikh (Google), blog.google, 2026-04-28, https://blog.google/products-and-platforms/platforms/google-pay/agent-payments-protocol-fido-alliance/, accessed 2026-09-30.
- [G11] "FIDO Alliance to Develop Standards for Trusted AI Agent Interactions", FIDO Alliance, 2026-04-28, https://fidoalliance.org/fido-alliance-to-develop-standards-for-trusted-ai-agent-interactions/ (via WebFetch; Cloudflare-blocked for curl), accessed 2026-09-30.
- [G12] AP2 GitHub issues #268 (2026-05-26), #339 (2026-08-23), #346 (2026-09-02), #358, #361 (2026-09-25), #362 (2026-09-27), https://github.com/google-agentic-commerce/AP2/issues, accessed 2026-09-30.
- [G13] agent-intent/verifiable-intent: README ("Draft (v0.1). Maintained by Mastercard"), CHANGELOG (0.1.0, 2026-02-19), protocol-landscape/protocols.md, https://github.com/agent-intent/verifiable-intent, accessed 2026-09-30.
- [G14] visa/trusted-agent-protocol: README, `tap-agent/agent_app.py`, `cdn-proxy/server.js` (repo created 2025-10-10, pushed 2026-09-30), https://github.com/visa/trusted-agent-protocol, accessed 2026-09-30.
- [G15] "Securing agentic commerce: helping AI Agents transact with Visa and Mastercard", Rohin Lohe and Will Allen, Cloudflare blog, 2025-10-24, https://blog.cloudflare.com/secure-agentic-commerce/, accessed 2026-09-30.
- [G16] draft-ietf-webbotauth-httpsig-protocol-00, "HTTP Message Signatures for automated traffic", T. Meunier (Cloudflare), S. Major (Google), IETF, 2026-09-01, https://www.ietf.org/archive/id/draft-ietf-webbotauth-httpsig-protocol-00.txt, accessed 2026-09-30.
- [G17] IETF datatracker, webbotauth group documents and draft revisions (charter-ietf-webbotauth 2025-10-23; meunier drafts rev 05 2026-03-02; httpsig-protocol-02 2026-08-19), https://datatracker.ietf.org/api/v1/doc/document/?group__acronym=webbotauth, accessed 2026-09-30.
- [G18] UCP GitHub releases v2026-08-25 (2026-08-25) and v2026-04-08 (2026-04-09), Universal-Commerce-Protocol/ucp, https://github.com/Universal-Commerce-Protocol/ucp/releases, accessed 2026-09-30.
- [G19] "AP2 Mandates Extension", UCP spec `docs/specification/payment/extensions/ap2-mandates.md` (main), https://github.com/Universal-Commerce-Protocol/ucp, accessed 2026-09-30.
- [G20] UCP spec overview `docs/specification/overview/index.md` (main): profiles, transports, UCP-Agent, MCP meta, WBA interop, accessed 2026-09-30.
- [G21] UCP `source/schemas/shopping/checkout.json` (status enum) and `source/services/shopping/rest.openapi.json` (paths) at main and v2026-08-25, accessed 2026-09-30.
- [G22] UCP "Announcements", `docs/documentation/announcements.md` (entries 2026-01-11 … 2026-09-25), accessed 2026-09-30.
- [G23] UCP "Identity Linking Capability", `docs/specification/common/identity-linking/index.md` (main), accessed 2026-09-30.
- [G24] UCP "Order Capability", `docs/specification/shopping/order/index.md` (main), accessed 2026-09-30.
- [G25] agentic-commerce-protocol/agentic-commerce-protocol: `changelog/2026-04-17.md`, `spec/2026-04-17/json-schema/schema.agentic_checkout.json`, `rfcs/rfc.agentic_checkout.md` (v2026-01-16, idempotency table), commit history (to 2026-07-18), accessed 2026-09-30.
- [G26] "RFC: Agentic Checkout — Discovery" (`rfcs/rfc.discovery.md`, SEP #137 merged 2026-02-25), ACP repo, accessed 2026-09-30.
- [G27] OpenAI Developers, Agentic Commerce docs (llms.txt, llms-full.txt, "Get Started", "Key concepts", "Agentic commerce in production"), https://developers.openai.com/commerce, accessed 2026-09-30.
- [G28] "Powering product discovery in ChatGPT", OpenAI, 2026-03-24, https://openai.com/index/powering-product-discovery-in-chatgpt/ (read via Wayback snapshot 2026-07-19; RSS pubDate 2026-03-24), accessed 2026-09-30.
- [G29] "OpenAI Ends Instant Checkout in ChatGPT", thekeyword.co, 2026-03-25 (secondary), https://www.thekeyword.co/news/openai-chatgpt-instant-checkout-scrapped, accessed 2026-09-30.
- [G30] Visa Investor Relations press-release feed, 2026 list (titles and dates), https://investor.visa.com/news/default.aspx, accessed 2026-09-30.
- [G31] "Visa Opens the Door to AI-Driven Shopping for Businesses Worldwide" (Intelligent Commerce Connect), Visa, 2026-04-08, https://investor.visa.com/news/news-details/2026/Visa-Opens-the-Door-to-AI-Driven-Shopping-for-Businesses-Worldwide/default.aspx (WebFetch), accessed 2026-09-30.
- [G32] "Visa Partners with OpenAI to Power the Next Generation of AI Commerce", Visa, 2026-06-10, https://investor.visa.com/news/news-details/2026/Visa-Partners-with-OpenAI-to-Power-the-Next-Generation-of-AI-Commerce/default.aspx (WebFetch), accessed 2026-09-30.
- [G33] Stripe Docs: "Agentic commerce", "Machine payments", "MPP", "Shared payment tokens", https://docs.stripe.com/agentic-commerce.md, https://docs.stripe.com/payments/machine.md, https://docs.stripe.com/payments/machine/mpp.md, https://docs.stripe.com/agentic-commerce/concepts/shared-payment-tokens.md, accessed 2026-09-30.
- [G34] "Tempo Mainnet is live", Tempo, 2026-03-18, https://tempo.xyz/blog/mainnet, and Tempo blog index, accessed 2026-09-30.
- [G35] mpp.dev home and blog (posts 2026-06-08 … 2026-08-12), https://mpp.dev/blog, accessed 2026-09-30.
- [G36] draft-ryan-httpauth-payment-01 (18 Mar 2026) and draft-httpauth-payment-01 (9 Sep 2026), "The 'Payment' HTTP Authentication Scheme", B. Ryan et al. (Tempo Labs, Stripe), IETF, https://www.ietf.org/archive/id/draft-ryan-httpauth-payment-01.txt, accessed 2026-09-30.
- [G37] "Monetization Gateway…", Cloudflare blog, 2026-07-01 (modified 2026-07-16), https://blog.cloudflare.com/monetization-gateway/ (WebFetch summary), accessed 2026-09-30.
- [G38] Y. Louck, "Protocol-Level Attacks on Agentic Commerce Platforms: A Cross-Platform Taxonomy, AIP-Bench, and Unified Defense", arXiv:2607.21824, 2026-07-23, https://arxiv.org/abs/2607.21824, accessed 2026-09-30.
- [G39] "AI Act | Shaping Europe's digital future", European Commission, last updated 2026-08-03, https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai (WebFetch), accessed 2026-09-30.
- [G40] California AB 316 "Artificial intelligence: defenses", chaptered 2025-10-13 (Ch. 672), https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202520260AB316, accessed 2026-09-30.
- [G41] "Know Your Agent (KYA)", Vouched, https://kya.vouched.id/ (undated), accessed 2026-09-30.
- [G42] DIF Working Groups page (Trusted AI Agents WG), Decentralized Identity Foundation, https://identity.foundation/working-groups/, accessed 2026-09-30.
- [G43] "Discovery of Agents With Names (DAWN) — Proposed Charter", charter-ietf-dawn-00-07 (2026-09-11), IETF, https://www.ietf.org/charter/charter-ietf-dawn-00-07.txt, accessed 2026-09-30.
- [G44] IETF datatracker query of agent identity/discovery drafts (2026), incl. draft-mozleywilliams-dnsop-dnsaid-02 (2026-05-27), https://datatracker.ietf.org/api/v1/doc/document/?name__contains=agent, accessed 2026-09-30.
- [G45] projnanda/nanda-index-v2 README; projnanda/agentfacts-format; aidecentralized/NANDA-Quilt-of-Registries-and-Verified-AgentFacts (GitHub), accessed 2026-09-30.
- [G46] "The /llms.txt file, v2" and "Changes — v2 (August 2026)", Jeremy Howard, https://llmstxt.org/index.md, https://llmstxt.org/changes.md, accessed 2026-09-30.
- [G47] "llms.txt" Lighthouse audit (agentic browsing), Chrome for Developers, last updated 2026-05-05, https://developer.chrome.com/docs/lighthouse/agentic-browsing/llms-txt (WebFetch), accessed 2026-09-30.
- [G48] MCP specification 2026-07-28 "Key Changes" (changelog.mdx; release 2026-07-28), modelcontextprotocol/modelcontextprotocol, accessed 2026-09-30.
- [G49] "Universal Commerce Protocol" merchant docs, Google for Developers, https://developers.google.com/merchant/ucp (WebFetch), accessed 2026-09-30.
- [G50] AGNTCY repos agntcy/dir (v1.7.1, 2026-09-22), agntcy/slim (v3.0.1, 2026-09-30), agntcy/oasf (v1.1.0, 2026-07-10), GitHub, accessed 2026-09-30.
- [G51] google-agentic-commerce/a2a-x402 repo metadata and commits (last 2026-05-24; pushed 2026-08-04), accessed 2026-09-30.
- [G52] Hacker News item "Amex Debuts Ace Developer Kit with Registered Agent Protection" → americanexpress.com newsroom URL, 2026-04-14 (title only), https://hn.algolia.com/api/v1/search?query=Amex%20ACE%20developer%20kit, accessed 2026-09-30.
- [G53] AP2 documentation llms-full.txt (FAQ: "Standardization … will continue within the Agentic Authentication Technical and Payments Technical Working Groups in FIDO"), https://ap2-protocol.org/llms-full.txt, accessed 2026-09-30.
