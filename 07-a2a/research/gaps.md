# 07. A2A: Agent2Agent — completeness-critic / gap-filler notes

Scope of this file: what spec.md, practice.md and field.md miss, get wrong, or disagree on, re-checked against primary sources on 2026-09-30. Source ids here are **[G#]** (own namespace, so they do not collide with [S#] in the other three files). Everything below was opened and read this session unless marked otherwise.

## Contradictions resolved

1. **When did the well-known path become `agent-card.json`?** spec.md says v0.3.0. practice.md says v0.2.6 (2025-07-17). **Resolved: v0.3.0 (2025-07-30).** CHANGELOG 0.3.0 lists under BREAKING CHANGES: "Change Well-Known URI for Agent Card hosting from `agent.json` to `agent-card.json` (#841)". The 0.2.6 entry contains only two bug fixes [G1]. practice.md is wrong.
2. **When did Agent Card signatures appear?** spec.md says 0.3.0, practice.md says 0.2.6, field.md says "new in v1.0". **Resolved: 0.3.0.** CHANGELOG 0.3.0 Features: "Add `signatures` to the `AgentCard` (#917)" [G1]. What v1.0 added is the JCS canonicalization rules ("Canonicalization (RFC 8785) clarified for Agent Card signature") [G5]. The v1.0 announcement also markets "Signed Agent Cards" as a v1.0 enterprise feature [G8], which is probably where the confusion started.
3. **mTLS security scheme, OAuth2 metadata URL and per-skill security.** practice.md dates them to 0.2.6. **Resolved: 0.3.0**, which lists them as a breaking change (#901) [G1].
4. **v1.0.1 date: 2026-05-26 (spec.md, practice.md) or 2026-05-28 (field.md)?** **Both are right, for different events.** The CHANGELOG entry is dated 2026-05-26 [G1]. The GitHub Release object was published 2026-05-28T11:34:36Z [G2]. Cite 2026-05-26 as the spec date.
5. **When did A2A join AAIF?** practice.md says 2026-08-17. field.md says 2026-08-19 and also claims A2A joined "alongside its March 2026 v1.0 release". **Resolved:** the AAIF blog post "A2A joins AAIF's open agentic stack" is dated **August 17, 2026** [G11]. 2026-08-19 is the date of a Forbes article linked from the A2A repo's own blog post [G7]. The a2a-protocol.org blog post is dated 2026-08-27 in front-matter and was committed 2026-08-28 [G7][G10]. The "alongside v1.0" wording in field.md is **wrong**: v1.0 shipped 2026-03-12, five months earlier [G1]. A2A was accepted as a **"Growth Stage project"** at AAIF [G7].
6. **When was A2A donated to the Linux Foundation: 2025-06-23 or 2025-06-24/25 (field.md)?** **Resolved: 2025-06-23.** The LF press release is datelined "DENVER – Open Source Summit North America – June 23, 2025" (datePublished 2025-06-23T15:00Z). Google's blog carries the same date [G12].
7. **When did ACP merge into A2A?** spec.md says "~2025-late". practice.md says the repo was archived 2025-08-27. field.md says August 2025. **Resolved:** the announcement "ACP Joins Forces with A2A Under the Linux Foundation" by Kate Blair (IBM Research) is dated **2025-08-25** [G13]. The i-am-bee/acp repo's last push was 2025-08-25 (commit "docs: A2A announcement (#230)"), and the repo is now `archived: true`. The exact archive date (practice.md's 08-27) is not exposed by the API, so it stays unverified [G13]. The AAIF blog also says "In August 2025" [G11].
8. **Is TLS 1.3 mandatory?** spec.md says "TLS 1.3+ mandatory". practice.md says "TLS ≥1.2". **Resolved: neither version is mandated.** The spec says: "Production deployments **MUST** use encrypted communication … Implementations **SHOULD** use modern TLS configurations (TLS 1.3+ recommended)" and SHOULD disable SSLv3/TLS 1.0/1.1 [G3 §7.1, §13.4]. The non-normative enterprise-ready.md says "TLS 1.2 or higher is recommended" [G45]. Encryption is a MUST. The specific version is only a SHOULD.
9. **Which method names are current?** practice.md uses `tasks/get`, `tasks/resubscribe` and `message:stream` interchangeably. field.md quotes a study that probed `tasks/send`. **Resolved:** v1.0 JSON-RPC method names are PascalCase: `SendMessage`, `SendStreamingMessage`, `GetTask`, `ListTasks`, `CancelTask`, `SubscribeToTask`, `Create/Get/List/DeleteTaskPushNotificationConfig` (note the plural `Configs` on List) and `GetExtendedAgentCard` [G5][G3 §9.4]. The slash names (`message/send`, `tasks/get`, `tasks/resubscribe`, `tasks/pushNotificationConfig/set`, `agent/getAuthenticatedExtendedCard`) are **v0.3** [G5]. `tasks/send` / `tasks/sendSubscribe` exist only in **v0.1.0**; v0.2.0 already replaced them with `message/send` / `message/stream` [G39]. `message:stream`, `/tasks/{id}:subscribe` etc. are **HTTP+JSON REST paths**, not method names [G3 §11.3].
10. **What is AP2's version and date?** spec.md says "AP2 v0.2, announced 2025-09-16". **Resolved:** AP2 **v0.1.0** was released 2025-09-16 (the announcement date). **v0.2.0** was released **2026-04-28** [G37]. ap2-protocol.org links "AP2 v0.2 Release and FIDO Alliance Donation", which confirms practice.md's FIDO claim. It also says AP2 "is available as an extension for the open-source Agent2Agent (A2A) protocol **and Universal Commerce Protocol**" [G37], so AP2 is no longer A2A-only.
11. **What does a VersionNotSupported error look like on HTTP?** practice.md quotes a verbatim `application/problem+json` body with `supportedVersions`. **Resolved: that example is stale, even though it is still in the spec.** Spec §6.4 still shows the RFC 9457 body [G3 L1442-1476]. But the normative HTTP+JSON error section §11.6 says errors use **`google.rpc.Status`** with a mandatory `google.rpc.ErrorInfo` (`reason` in UPPER_SNAKE_CASE, `domain: "a2a-protocol.org"`) [G3 §11.6]. The migration guide states explicitly: "HTTP+JSON error responses have been updated to use the ProtoJSON representation of `google.rpc.Status` instead of RFC 9457 (Problem Details)" [G5]. The spec text is internally inconsistent; follow §11.6 and the migration guide.
12. **Is `SubscribeToTask` on REST a GET or a POST?** field.md's proto excerpt shows `get: "/tasks/{id=*}:subscribe"`. Spec §11.3.2 prose says `POST /tasks/{id}:subscribe` [G3]. **Resolved: GET.** The proto is "the single authoritative normative definition" [G3 L107], and it declares `get: "/tasks/{id=*}:subscribe"` [G4 L76-80]. The prose is a doc bug.
13. **Is IBM ACP the same as Anthropic/Zed "ACP"?** spec.md glossary mixes them. **Resolved:** the merged protocol is IBM/BeeAI's **Agent Communication Protocol** (i-am-bee/acp) [G13]. The **Agent Client Protocol** (Zed, editor↔coding-agent) is a different protocol and was not merged into anything. Keep them apart in the book.
14. **Did Microsoft build AHP instead of A2A?** spec.md frames the VS Code team's AHP as "fragmentation the interop story was supposed to prevent". **Resolved: overreach.** AHP's own README: "A synchronized, multi-client state protocol for AI agent sessions … how a portable, standalone sessions server communicates with its clients" [G36]. That is a client↔agent-host UI/state protocol (a ch.08 AG-UI neighbour), not agent↔agent delegation. The HN quote is real [G31], but it does not show AHP competing with A2A.
15. **Does AAIF govern MCP too?** field.md doubts it. **Resolved: yes.** The AAIF blog lists AGENTS.md, goose, MCP, agentgateway and A2A as the "open agentic stack" layers, and the A2A blog calls MCP a "sibling project" under the AAIF [G11][G7].
16. **Is A2A 10.9M vs MCP 257M PyPI downloads?** spec.md cites this from HN. **Resolved:** the figure is monthly and came from HN commenter `benclarkeio`, who self-declares as biased ("I've created a number of open-source A2A packages … so I'm a little biased") [G31]. Fresh pypistats on 2026-09-30: `a2a-sdk` last_month = **10,333,975**, `mcp` last_month = **219,043,071** (≈21×) [G21]. See Numbers for the monthly series.
17. **Is Pydantic AI support first-party?** field.md lists Pydantic AI support as confirmed. practice.md could not verify it. **Resolved:** Pydantic AI **removed** `Agent.to_a2a()` in v2. PR #5426 (merged 2026-05-15) deprecated it and said "`fasta2a` was donated to Data Layer and is now maintained at datalayer/fasta2a. In 2.0 the `Agent.to_a2a()` method, `pydantic_ai._a2a` bridge, and `pydantic-ai-slim[a2a]` extra are removed" [G27]. The migration target is `from fasta2a.pydantic_ai import agent_to_a2a`. fasta2a 1.0.0 (2026-09-05) is the first release that follows the A2A v1 schema [G27].
18. **Do the official `ext-*` extension repos exist?** practice.md says "Official extensions live under `https://a2a-protocol.org/extensions/{name}/v1` URIs, hosted as `a2aproject/ext-*` repos". **Resolved:** that is the governance *rule* [G17]. As of 2026-09-30 the a2aproject org has **zero** `ext-*` repos, only `experimental-ext-oid4vp-auth` and `experimental-cpb-slimrpc` (plus `a2a-gateway`) [G16]. The "example extensions" (Secure Passport, Timestamp, Traceability, AGP) live in a2a-samples [G17].
19. **Does TaskArtifactUpdateEvent have an `index` field?** The official migration guide (whats-new-v1.md) says it gained "`index` field indicates artifact position". **Resolved: no.** The proto has `task_id, context_id, artifact, append, last_chunk, metadata` and no `index` [G4]. The proto wins, and this is a migration-doc error.
20. **When does a stream close?** Spec §3.1.2: the stream "MUST close when the task reaches a terminal state". Spec §11.7: the stream runs "until the task reaches a terminal **or interrupted** state, at which point the stream closes" [G3]. **Unresolved inconsistency** inside v1.0.1. The proto's `return_immediately` comment treats interrupted states (`INPUT_REQUIRED`, `AUTH_REQUIRED`) as a return point for blocking calls [G4]. §7.6.1 says agents "SHOULD maintain any active response streams" after entering `AUTH_REQUIRED` [G3]. Tell readers to handle both behaviours.
21. **Does one proto give you all three bindings "for free"?** practice.md claims implementing one binding against the proto gives the others via codegen. **Resolved: it does not.** The proto's `google.api.http` annotations define the REST mapping, but real servers implement only a subset. LangSmith Agent Server: "Only the JSON-RPC binding is available. gRPC and HTTP+JSON are not implemented" [G24]. The AgentCore Runtime contract requires "Transport: JSON-RPC 2.0 over HTTP" [G25].
22. **What was the A2ABreak arXiv date?** spec.md says "2026-09-12". **Resolved:** arXiv 2609.10871v1 was published **2026-09-09**. Authors: Alireza Lotfi, Mirza Masfiqur Rahman, Imtiaz Karim, Elisa Bertino; categories cs.CR/cs.SE [G30]. The numbers in spec.md (37 states / 76 transitions / 929 statements / 11 vulns / 73.3% precision / 84.6% F1 / zero-shot baseline 0) match the abstract [G30].

## Claims most likely to be wrong (with corrections)

1. **Wrong: "A2A is at v0.3" / "v1.1 is out" / "SDK v1.2 = spec v1.2".** **Correct:** the spec is **v1.0.1** (CHANGELOG 2026-05-26). v1.1 is only a roadmap item ("v1.1 Protocol Enhancements & Core Robustness (#1991)", roadmap updated Sep 15, 2026) [G1][G6]. SDK versions are independent of the spec version: `a2a-sdk` 1.2.1 (2026-09-30), `a2a-go` **v2**.6.0 (module path `github.com/a2aproject/a2a-go/v2`; "The SDK version is distinct from the A2A specification version"), `@a2a-js/sdk` 1.3.0, a2a-java 1.4.0.Final, .NET `A2A` still 1.0.0-preview2. All of them target spec 1.0 [G18][G20][G43].
2. **Wrong: "well-known path is `/.well-known/agent.json`", or "renamed in 0.2.6".** **Correct:** `/.well-known/agent-card.json`, renamed in **v0.3.0** (2025-07-30) [G1]. Trap: Google ADK's `adk api_server --a2a` still expects a local card *file* named `agent.json` in the agent folder, even though it is served at the new path [G28].
3. **Wrong: the v1.0 JSON-RPC method is `message/send` (or `tasks/send`).** **Correct:** v1.0 uses `SendMessage`, `SendStreamingMessage`, `GetTask`, `ListTasks`, `CancelTask`, `SubscribeToTask`, `CreateTaskPushNotificationConfig`, …, `GetExtendedAgentCard`. `message/send` is v0.3. `tasks/send` is v0.1 [G5][G39].
4. **Wrong: `"state": "completed"`, `"role": "user"`, `{"kind":"text","text":…}`.** **Correct (v1.0 ProtoJSON):** `"TASK_STATE_COMPLETED"`, `"ROLE_USER"`, `{"text": …}`. The `kind` discriminator is gone from Parts and stream events. `mimeType` became `mediaType`. `file.fileWithUri` became `url`. Inline bytes are `raw`. Stream events are wrapped as `statusUpdate` / `artifactUpdate`, and the `final` flag was removed [G5][G1].
5. **Wrong: "signed Agent Cards are new in 1.0" / "signing proves who the agent is".** **Correct:** signatures were added in **0.3.0** and remain **optional** ("Agent Cards **MAY** be digitally signed"). The card is JCS-canonicalized (RFC 8785) with the `signatures` field and default values excluded, then signed as JWS (RFC 7515) with header `alg`, `typ: "JOSE"`, `kid` and optional `jku` [G1][G3 §8.4]. A signature proves control of a key. The spec leaves key trust ("trusted key store") to the client. The spec says clients "SHOULD" verify at least one signature. It is not a MUST [G3 §8.4.3].
6. **Wrong: "A2A is a Linux Foundation project" (full stop), or "A2A joined AAIF with v1.0".** **Correct:** A2A was donated to the LF on 2025-06-23 [G12]. It joined the LF-hosted **Agentic AI Foundation** as a Growth Stage project on **2026-08-17**, alongside MCP, goose, AGENTS.md and agentgateway [G11][G7].
7. **Wrong: "A2A requires TLS 1.3".** **Correct:** encryption is MUST. TLS 1.3+ is only *recommended* (SHOULD) [G3 §7.1, §13.4].
8. **Wrong: "You can resume an A2A SSE stream from the last event".** **Correct:** the spec defines no SSE event ids or `Last-Event-ID`. The recovery path is `SubscribeToTask`, whose first event "MUST" be the current `Task` snapshot, "to prevent a potential loss of information between a call to `GetTask` and calling `SubscribeToTask`" [G3 §3.1.6]. Streaming is server→client only. Bidirectional streaming is a roadmap epic (#1995) [G6][G41].
9. **Wrong: "HTTP errors use RFC 9457 `application/problem+json`".** **Correct:** v1.0 HTTP+JSON errors use a `google.rpc.Status` body with a `google.rpc.ErrorInfo` detail (`reason: "TASK_NOT_FOUND"`, `domain: "a2a-protocol.org"`). The spec still contains two stale problem+json examples (§6.4, §6.5) [G3 §11.6][G5].
10. **Wrong: "Everyone runs A2A v1.0 now".** **Correct (2026-09-30):** a lot of production integration code still speaks **0.3**:
    - CrewAI pins `a2a-sdk~=0.3.10`, and Strands pins `a2a-sdk<0.4.0,>=0.3.0` [G20].
    - Bedrock AgentCore ships two extras, `a2a` (`<0.4,>=0.3`) and `a2a-v1` (`>=1.0.1,<2.0`) [G20]. Its protocol-contract page still shows `"method": "message/send"`, `"kind": "text"` and `"protocolVersion": "0.3.0"` [G25].
    - LangSmith Agent Server advertises `protocolVersion: "1.0"`, but its own docs list "Response wire shape is still v0.3" and "SSE emits v0.3 objects with `final`" as known TCK failures [G24].
    - Microsoft Agent Framework's `agent-framework-a2a` requires `a2a-sdk>=1.0.0` [G20].
11. **Wrong: "Pydantic AI has `agent.to_a2a()`".** **Correct:** it was removed in Pydantic AI v2 (deprecation PR merged 2026-05-15). Use `fasta2a.pydantic_ai.agent_to_a2a` from **datalayer/fasta2a** [G27].
12. **Wrong: "OpenAI's Agents SDK supports A2A" (or "is about to").** **Correct:** community PRs were closed repeatedly, most recently #3683 on 2026-06-24: "We still don't have immediate plans to add A2A support as a feature within this SDK" [G29].
13. **Wrong: "Only 0–4% of advertised A2A agents work".** **Correct:** this is one self-disclosed AI-agent study (issue #1755, 2026-04-15, already closed). It probed with `tasks/send`, a method that only exists in v0.1.0 and has been gone since v0.2.0 [G38][G39]. The "0/50 responded" half of the result therefore does not show non-compliance. The agent-card half (0–2/50) stays unverified.
14. **Wrong: "150+ organizations run A2A in production" / "10.9M vs 257M downloads" as hard facts.** **Correct:** "backed by over 150 organizations" is AAIF's framing and counts backers, not deployments [G11]. The only named production deployments in that post are Huawei HarmonyOS (Celia ↔ app agents) and Tencent WeChat integrating with Huawei/Android OEM assistants over A2A [G11]. These are vendor claims and not independently verified. Downloads: see contradiction 16. Use ≈21× (2026-09-30 pypistats), not the HN figure.
15. **Wrong: "AP2 is A2A's payments extension (v0.2, Sept 2025)".** **Correct:** AP2 v0.1.0 came out 2025-09-16 and v0.2.0 on 2026-04-28. AP2 was donated to the FIDO Alliance. It is "available as an extension for … A2A … **and Universal Commerce Protocol**" [G37]. Details belong in ch.10.
16. *(bonus)* **Wrong: "the SDK/official docs say X, so the proto says X".** The official migration guide lists a nonexistent `index` field on `TaskArtifactUpdateEvent` [G5 vs G4]. Spec prose says `POST …:subscribe` while the proto says GET [G3 vs G4]. Rule for the writer: **when docs and proto disagree, the proto (`specification/a2a.proto`) is normative** [G3 L107].
17. *(bonus)* **Wrong: "Opacity makes A2A safe from the remote agent".** **Correct:** opacity hides the *server's* internals. It does not protect the *client* agent from a malicious peer. Unit 42's "agent session smuggling" PoC (ADK + A2A, Gemini 2.5 Pro client vs 2.5 Flash malicious agent) exfiltrated the client's system configuration and chat history and executed "an unauthorized trade of 10 shares" [G32]. The spec states that `TASK_STATE_AUTH_REQUIRED` "by itself" MUST NOT be treated as authorization [G3 §7.6.4].

## TL;DR (gap-focused — what the three notes under-state)

- The spec is still **v1.0.1** (2026-05-26). The next items are v1.1 (task-history coherence, #1991), bidirectional streaming (#1995), the official CLI and elicitations (ADR-002 PR #2149, closed) [G6][G41]. No spec release happened in the last 3 months. Main-branch commits since 2026-05-28 are docs-only, plus one proto-comment fix (#1997) [G10].
- **The adoption reality is split-version.** The spec and the Microsoft/Go/JS/Java SDKs are on 1.0. CrewAI, Strands and AgentCore's default contract are still on 0.3. LangSmith claims 1.0 but emits 0.3 shapes [G20][G24][G25]. A2A v1.0 servers must expose a 0.3 interface for compatibility (`enable_v0_3_compat=True` in a2a-python) [G19].
- **The empty `A2A-Version` header means 0.3** ("Agents MUST interpret empty value as 0.3 version") [G3 L739]. LangSmith does not read the header at all [G24].
- **Real security advisories have now landed in an official SDK:** a2a-java published 4 GHSAs on 2026-08-28 plus 1 on 2026-09-09. They include **High** "Fail-open default task authorization" (CVSS 7.5), SSRF via push-notification URLs, credential leak via a server-controlled API-key header name plus redirect, and an Android redirect regression [G23]. a2a-python shipped matching hardening in 1.1.4/1.2.0: push-URL SSRF validation, owner-scoped cancel/subscribe, reject contextId/task mismatch. None of these got a GHSA in a2a-python [G18].
- **The spec only says SHOULD for webhook SSRF protection** ("Agents **SHOULD** validate webhook URLs") [G3 §13.2]. The a2a-java SSRF was "the shipped default" [G23].
- **AGNTCY complements A2A.** It does not compete. AGNTCY was launched at the LF 2025-07-29 by Cisco, Dell, Google Cloud, Oracle and Red Hat, and "mak[es] A2A agents and MCP servers discoverable through AGNTCY directories" [G14]. Its SLIM project defines an experimental **custom A2A protocol binding**, `https://a2a-protocol.org/bindings/experimental-slimrpc/v1`, with MLS end-to-end encryption, in `a2aproject/experimental-cpb-slimrpc` [G15][G16].
- **MCP is converging on A2A-like semantics:** MCP 2026-07-28 moved tasks into an official extension (`tasks/get` polling, `tasks/update`) and added an `input_required` result type (MRTR) [G35]. That weakens the "MCP can't do long-running/multi-turn" argument, and it also invalidates parts of Microsoft's 2025-07-23 "A2A on MCP" post, which relied on SSE resumability that MCP 2026-07-28 removed [G34][G35]. Cross-link ch.05.
- **The official `a2a` CLI exists now:** a2aproject/a2a-cli was created 2026-07-28, v0.2.0 on 2026-09-09 and v0.3.0 on 2026-09-24. It is Go-based with brew/winget install and is pitched at coding harnesses ("give your coding agent the `a2a` tool") [G42].
- **LangSmith's A2A endpoint maps `contextId` to LangSmith `thread_id`**, which is the most concrete cross-framework tracing recipe found. Its `historyLength` is capped at 10, and it offers `historyScope: task|context` as an extension [G24].
- **AgentCore runtime contract:** container on `0.0.0.0:9000`, POST `/`, `/.well-known/agent-card.json`, `/ping` with `Healthy|HealthyBusy`, ARM64, SigV4 or OAuth 2.0, session header `X-Amzn-Bedrock-AgentCore-Runtime-Session-Id` [G25].

## Current state and versions (2026-09-30, verified)

| Item | Value | Source |
|---|---|---|
| Spec | 1.0.1 (CHANGELOG 2026-05-26; GH release 2026-05-28) | [G1][G2] |
| Next spec | v1.1 in roadmap only (roadmap "Last updated: Sep 15, 2026") | [G6] |
| Governance | AAIF Growth Stage project (2026-08-17); TSC of 8 companies | [G11][G7][G9] |
| TSC reps | Google Todd Segal; Microsoft Darrel Miller; Cisco Luca Muscariello; AWS Abhimanyu Siwach; Salesforce Stephen Petschulat; ServiceNow Sugandh Rakha (updated 2026-08-18); SAP Sivakumar N.; IBM **Stefano Maestri** (replaced IBM Research's Kate Blair, commit 2026-07-14) | [G9][G10][G13] |
| TSC steady state | Charter: "steady state" composition to take effect "18 months following the inception" | [G9] |
| Python SDK | `a2a-sdk` 1.2.1 (2026-09-30); 1.0.0 released 2026-04-20 (5 weeks after spec 1.0); types are **protobuf classes**, not Pydantic, since 1.0; extras `all, db-cli, encryption, fastapi, grpc, http-server, mysql, postgresql, signing, sql, sqlite, telemetry` | [G18][G19][G20] |
| Go SDK | v2.6.0 (2026-09-25); v2.0.0 (2026-03-17) = spec 1.0 | [G43] |
| JS SDK | `@a2a-js/sdk` 1.3.0 (2026-09-29) | [G43] |
| Java SDK | 1.4.0.Final (2026-09-28); Maven group `org.a2aproject.sdk` | [G43][G23] |
| .NET SDK | `A2A` NuGet 1.0.0-preview2 (2026-04-09), no stable 1.0 | [G43] |
| Rust SDK | a2aproject/a2a-rs (created 2026-04-03) | [G16] |
| Community SDK | a2a-cpp listed as community SDK (commit 2026-07-14) | [G10] |
| Tooling | a2a-inspector (v0.1.0 only, 2025-06-18), a2a-tck (grades by RFC 2119 level `--level must/should/may`), a2a-itk (integration test kit, 2026-05-14), a2a-cli (2026-07-28) | [G16][G44][G42] |
| Security intake | Moved to GitHub Security Advisories (commit 2026-07-31) | [G10] |

## Timeline (additions the three notes lack)

- **2025-04-09** A2A spec v0.1: methods `tasks/send`, `tasks/sendSubscribe` [G39].
- **2025-05-27** v0.2.1: `referenceTaskIds` and the authenticated-extended-card boolean added [G1].
- **v0.2.0** (GitHub tag 2025-06-09, created retroactively): `message/send` / `message/stream` replace `tasks/send*` [G39][G2].
- **2025-06-23** Donated to the LF (Denver OSS NA) [G12].
- **2025-07-23** Microsoft devblog "Can You Build Agent2Agent Communication on MCP? Yes!" (Victor Dibia et al.) [G34].
- **2025-07-29** AGNTCY joins the LF (Cisco, Dell, Google Cloud, Oracle, Red Hat) [G14].
- **2025-07-30** v0.3.0: `agent-card.json`, `signatures`, mTLS, extended-card method [G1].
- **2025-08-25** IBM: "ACP Joins Forces with A2A"; the BeeAI platform switches to A2A [G13].
- **2025-09-16** AP2 v0.1.0 [G37].
- **2025-10-31** Unit 42 "Agent Session Smuggling in Agent2Agent Systems" (Royce Lu, Jay Chen) [G32].
- **2025-11-25** MCP spec adds experimental Tasks (SEP-1686) [G35].
- **2026-03-12** A2A v1.0.0 [G1]. **2026-03-17** a2a-go v2.0.0 implements 1.0 [G43]. **2026-03-20** grith.ai "zero defenses" post (vendor) [G33].
- **2026-04-15** Issue #1755 "near-zero compliance" (AI-agent-authored; probed v0.1 `tasks/send`) [G38].
- **2026-04-20** a2a-sdk (Python) 1.0.0 [G18].
- **2026-04-28** AP2 v0.2.0 plus FIDO Alliance donation [G37].
- **2026-05-15** Pydantic AI deprecates `Agent.to_a2a()`; fasta2a moves to Datalayer [G27].
- **2026-05-26** spec v1.0.1 [G1].
- **2026-06-18** Ask HN "Is anyone using the A2A protocol?" [G31].
- **2026-06-24** OpenAI declines A2A again (#3683) [G29].
- **2026-06-25** Epics #1991 (task history) and #1995 (BiDi streaming) opened [G41].
- **2026-07-14** IBM TSC rep changes to Stefano Maestri [G10].
- **2026-07-28** MCP spec 2026-07-28 (stateless, tasks extension, MRTR) [G35]. Official a2a-cli repo created [G16].
- **2026-07-30** Spec docs: "clarify in-task authorization scope semantics" (#2081), which added §7.6.4 [G10][G3].
- **2026-07-31** Vulnerability intake moves to GHSA [G10].
- **2026-08-17** A2A joins AAIF [G11].
- **2026-08-28** a2a-java publishes 4 security advisories [G23].
- **2026-09-05** fasta2a 1.0.0 (A2A v1 schema) [G27].
- **2026-09-09** A2ABreak on arXiv [G30]. Same day: a2a-java Android redirect GHSA-4fpj (High) [G23].
- **2026-09-15/16** Roadmap updated [G6].
- **2026-09-24** a2a-cli v0.3.0 [G42].
- **2026-09-29/30** a2a-sdk 1.2.0 / 1.2.1: `application/a2a+json` on REST, agent-card caching headers, multi-replica cluster mode, opt-in media-type validation, push-auth header fix [G18].

## Mechanics (gap fills)

### 1. v0.3 → v1.0 wire diff (the table a migrating engineer needs) [G5][G1]

| Area | v0.3 | v1.0 |
|---|---|---|
| JSON-RPC methods | `message/send`, `message/stream`, `tasks/get`, `tasks/cancel`, `tasks/resubscribe`, `tasks/pushNotificationConfig/{set,get,list,delete}`, `agent/getAuthenticatedExtendedCard` | `SendMessage`, `SendStreamingMessage`, `GetTask`, `CancelTask`, `SubscribeToTask`, `CreateTaskPushNotificationConfig`, `GetTaskPushNotificationConfig`, `ListTaskPushNotificationConfigs`, `DeleteTaskPushNotificationConfig`, `GetExtendedAgentCard`; **new** `ListTasks` |
| REST paths | `/v1/message:send` | `/message:send` (`/v1` removed, #1269) |
| Enums | `"completed"`, `"input-required"`, `"user"` | `"TASK_STATE_COMPLETED"`, `"TASK_STATE_INPUT_REQUIRED"`, `"ROLE_USER"` (+`*_UNSPECIFIED`) |
| Part | `kind` + `TextPart/FilePart/DataPart`, `file.fileWithUri`, `mimeType` | single `Part` `oneof {text, raw, url, data}` + `filename`, `mediaType`, `metadata` |
| Stream events | `kind: "status-update"`, `final: true` | `{"statusUpdate": {...}}` / `{"artifactUpdate": {...}}`; `final` removed → stream closure signals end |
| AgentCard | `url`, `preferredTransport`, `additionalInterfaces`, top-level `protocolVersion`, `supportsAuthenticatedExtendedCard` | `supportedInterfaces[]` of `{url, protocolBinding, tenant?, protocolVersion}`; `capabilities.extendedAgentCard` |
| Errors | JSON-RPC `data: {…}`; HTTP RFC 9457 | `data`/`details` = array of `google.rpc.*` Any; `ErrorInfo{reason, domain:"a2a-protocol.org"}` |
| Pagination | page/perPage | cursor `pageToken`/`nextPageToken` (always present, `""` on last page) [G3 §3.1.4] |
| OAuth flows | implicit, password | removed; `DeviceCodeOAuthFlow` (RFC 8628) added; `pkceRequired` on authorization code |
| Timestamps | free ISO | ISO 8601 UTC ms `YYYY-MM-DDTHH:mm:ss.sssZ` |
| IDs | compound (`tasks/{id}/pushNotificationConfigs/{cid}`) | simple literals, parent/child separate fields (#1389) |

VERBATIM stream event migration [G5]:
```json
// v0.3.0
{"kind": "status-update", "taskId": "...", "contextId": "...", "status": {...}, "final": true}
// v1.0
{"statusUpdate": {"taskId": "...", "contextId": "...", "status": {...}}}
```

### 2. Proto snippets that the three notes did not copy — VERBATIM [G4]

```protobuf
message SendMessageConfiguration {
  repeated string accepted_output_modes = 1;
  TaskPushNotificationConfig task_push_notification_config = 2;
  optional int32 history_length = 3;
  bool return_immediately = 4;
}
message StreamResponse {
  oneof payload {
    Task task = 1;
    Message message = 2;
    TaskStatusUpdateEvent status_update = 3;
    TaskArtifactUpdateEvent artifact_update = 4;
  }
}
message TaskArtifactUpdateEvent {
  string task_id = 1 [(google.api.field_behavior) = REQUIRED];
  string context_id = 2 [(google.api.field_behavior) = REQUIRED];
  Artifact artifact = 3 [(google.api.field_behavior) = REQUIRED];
  // If true, the content of this artifact should be appended to a previously
  // sent artifact with the same ID.
  bool append = 4;
  // If true, this is the final chunk of the artifact.
  bool last_chunk = 5;
  google.protobuf.Struct metadata = 6;
}
message ListTasksRequest {
  string tenant = 1;
  string context_id = 2;
  TaskState status = 3;
  optional int32 page_size = 4;
  string page_token = 5;
  optional int32 history_length = 6;
  google.protobuf.Timestamp status_timestamp_after = 7;
  optional bool include_artifacts = 8;
}
message AuthenticationInfo {
  string scheme = 1 [(google.api.field_behavior) = REQUIRED];   // IANA HTTP auth scheme, e.g. Bearer
  string credentials = 2;
}
message SecurityScheme {
  oneof scheme {
    APIKeySecurityScheme api_key_security_scheme = 1;
    HTTPAuthSecurityScheme http_auth_security_scheme = 2;
    OAuth2SecurityScheme oauth2_security_scheme = 3;
    OpenIdConnectSecurityScheme open_id_connect_security_scheme = 4;
    MutualTlsSecurityScheme mtls_security_scheme = 5;
  }
}
```
(Comments on `SendMessageConfiguration`, `StreamResponse`, `ListTasksRequest` and `SecurityScheme` are trimmed; the `// IANA…` comment on `AuthenticationInfo` is COMPOSED from the proto's longer comment.)

Streaming chunk semantics that practice.md and spec.md skip: artifacts stream as **chunks of one artifact id** via `append`/`last_chunk`. This is how token streaming is done today, because `Message` cannot be streamed incrementally (listed as a gap in #1995) [G4][G41].

`ListTasks` rules: results sorted by status timestamp descending. With `includeArtifacts` false (the default), `artifacts` MUST be omitted entirely. `nextPageToken` MUST always be present [G3 §3.1.4].

### 3. REST binding endpoint map — VERBATIM from proto annotations [G4]; spec §11.3 [G3]

```
POST   /message:send                         POST /{tenant}/message:send
POST   /message:stream   (SSE)
GET    /tasks/{id}
GET    /tasks            (ListTasks, query params)
POST   /tasks/{id}:cancel
GET    /tasks/{id}:subscribe   (SSE; spec prose says POST — proto is normative)
POST   /tasks/{task_id}/pushNotificationConfigs
GET    /tasks/{task_id}/pushNotificationConfigs/{id}
GET    /tasks/{task_id}/pushNotificationConfigs
DELETE /tasks/{task_id}/pushNotificationConfigs/{id}
GET    /extendedAgentCard
```
(Every route has a `/{tenant}/…` twin.)

HTTP+JSON error, VERBATIM [G3 §11.6]:
```http
HTTP/1.1 404 Not Found
Content-Type: application/a2a+json

{
  "error": {
    "code": 404,
    "status": "NOT_FOUND",
    "message": "The specified task ID does not exist or is not accessible",
    "details": [
      {
        "@type": "type.googleapis.com/google.rpc.ErrorInfo",
        "reason": "TASK_NOT_FOUND",
        "domain": "a2a-protocol.org",
        "metadata": {
          "taskId": "task-123",
          "timestamp": "2025-11-09T10:30:00.000Z"
        }
      }
    ]
  }
}
```

### 4. Versioning, VERBATIM [G3 §3.6]
> "Clients MUST send the `A2A-Version` header with each request to maintain compatibility after an agent upgrades to a new version of the protocol (except for 0.3 Clients - 0.3 will be assumed for empty header)." … "Clients MAY provide the `A2A-Version` as a request parameter instead of a header." … "Agents MUST interpret empty value as 0.3 version."

In gRPC, service params travel as metadata, e.g. `"a2a-version", "0.3"` [G3 §10.2]. a2a-go v2.0.0 was the first SDK to note "Client sends `A2A-Version` header" and "`a2aclient.Factory` implements protocol version negotiation" [G43].

Dual-version serving in Python, VERBATIM [G19]:
```python
supported_interfaces=[
    AgentInterface(protocol_binding='JSONRPC', protocol_version='0.3', url='http://localhost:9999/'),
]
...
create_jsonrpc_routes(request_handler, rpc_url='/', enable_v0_3_compat=True)
create_rest_routes(request_handler, enable_v0_3_compat=True)
```

### 5. Python SDK 1.x behaviour that breaks naive executors [G19]
- Types are protobuf-generated (`a2a/types/a2a_pb2.pyi`). Data Parts need `ParseDict` to build a `google.protobuf.Value`.
- `DefaultRequestHandler(agent_card=...)`: `agent_card` is now **required**.
- Streaming rules are enforced. Each of the following raises `InvalidAgentResponseError`: mixing a `Message` with `Task` events; more than one `Message`; a `TaskStatusUpdateEvent` before the initial `Task`. VERBATIM rule: "your `AgentExecutor` MUST follow exactly one of these two streaming patterns: 1. Message-only stream — enqueue exactly one `Message` and stop. 2. Task lifecycle stream — enqueue a `Task` first, then zero or more `TaskStatusUpdateEvent` / `TaskArtifactUpdateEvent` objects until a terminal state is reached."
- Server setup moved from the `A2AStarletteApplication` wrapper to route factories: `create_agent_card_routes`, `create_jsonrpc_routes`, `create_rest_routes`, mountable into any Starlette/FastAPI app.
- The Vertex AI Task Store integration was removed in 1.0.0 [G18].
- 1.2.0 fixes worth knowing [G18]: "reject a message whose contextId disagrees with its task" (#1270), "reject terminal-task operations with UnsupportedOperationError" (#1268), "send PushNotificationConfig.authentication as an Authorization header" (#1271, closes #585, so earlier 1.x did not send it), "add multi-replica cluster mode" (#1281), "add caching headers to the agent card endpoint" (#1272). 1.1.4 added "validate push-notification URLs before dispatch (SSRF hardening)" and "owner-scope cancel/subscribe".
- The helloworld sample (the minimal server/client in practice.md and field.md) is still current against 1.x. It imports `a2a.helpers` (`new_task_from_user_message`, `new_text_message`, `new_text_part`, `get_message_text`), and the client uses `create_client(agent=card, client_config=ClientConfig(streaming=…))` plus `client.get_extended_agent_card(GetExtendedAgentCardRequest())` [G22].

### 6. Agent Card signing — algorithm, VERBATIM essentials [G3 §8.4]
- Canonical payload: drop default values (respecting proto `optional` presence), **exclude `signatures`**, then JCS (RFC 8785).
- Protected header MUST include `alg`, `typ` (SHOULD be `"JOSE"`) and `kid`. MAY include `jku`.
- Signing input: `ASCII(BASE64URL(UTF8(JWS Protected Header)) || '.' || BASE64URL(JWS Payload))`.
- Example protected header decodes to `{"alg":"ES256","typ":"JOSE","kid":"key-1","jku":"https://example.com/agent/jwks.json"}`.
- Canonicalization example output: `{"capabilities":{"pushNotifications":false,"streaming":false},"description":"","name":"Example Agent","skills":[]}`.
- "Multiple signatures MAY be present to support key rotation". "Expired or revoked keys MUST NOT be used".
- a2a-python has a `signing` extra, and 1.2.0 added an "Agent Card signing sample" [G20][G18].
- The design gap (my inference from the spec text): `jku` on the agent's own domain only proves domain control. The spec delegates trust anchoring to a "trusted key store" and defines no CA or registry. This is exactly the space that the identity issues (#1672 with 658 comments, #1786, #1829) are fighting over [G3][G40].

### 7. In-task authorization chain (new §7.6.4, 2026-07-30) — VERBATIM [G3 §7.6]
> "If the client is itself an A2A agent actively processing a Task, the client may further delegate the authorization request to its client by transitioning its own Task to `TASK_STATE_AUTH_REQUIRED`… This enables forming a chain of Tasks in `TASK_STATE_AUTH_REQUIRED`."
> "Credentials SHOULD be bound to the agent which originated the request, such that only this agent is able to use the credentials."
> "Agents MUST NOT treat the `TASK_STATE_AUTH_REQUIRED` state transition, by itself, as authorization for any particular operation."

There is also an experimental extension `experimental-ext-oid4vp-auth` ("OID4VP In-Task Authorization Extension for A2A") [G16]. This is the protocol surface that A2ABreak attacks as "credential harvesting via multi-hop identity loss in delegation chains" [G30].

### 8. Push notification security — VERBATIM [G3 §13.2]
> "Agents **SHOULD** validate webhook URLs to prevent SSRF … Reject private IP ranges (127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) · Reject localhost and link-local addresses · Implement URL allowlists where appropriate"
> "Clients **MUST** validate webhook authenticity using the provided authentication credentials … **SHOULD** process notifications idempotently, as duplicate deliveries may occur"

The a2a-java advisory GHSA-q78c-5jjq-57g8 shows what happens when this SHOULD is skipped: "`BasePushNotificationSender` … POSTs task data to the URL stored on a task's `TaskPushNotificationConfig` with no validation of the destination: no block on loopback, RFC1918, link-local (`169.254.0.0/16`, including the `169.254.169.254` metadata address)… Both shipped HTTP clients follow redirects" [G23].

### 9. Extension activation — the response echo the notes missed, VERBATIM [G17]
> "Response: Once the agent has identified all activated extensions, the response SHOULD include the `A2A-Extensions` header, listing all extensions that were successfully activated for that request."

The same doc lists these limits on extensions: they may not add fields to core data structures or add enum values. Use `metadata` instead [G17]. Four extension kinds: Data-only, Profile, Method (Extended Skills) and State Machine [G17]. Governance tiers: `experimental-ext-*` → `ext-*`, and custom bindings `experimental-cpb-*` → `cpb-*`, under the URI prefixes `https://a2a-protocol.org/extensions/` and `…/bindings/` [G17]. Real third-party extensions seen in the wild: LangSmith `https://langchain.com/a2a/extensions/history-scope/v1`, A2UI `https://a2ui.org/a2a-extension/a2ui/v0.9` [G24], and A202 commercial `https://schemas.a202.org/a2a-ext/commercial/0.1` (proposal #2143) [G41].

### 10. Framework / platform reality matrix (verified 2026-09-30)

| Platform | A2A role | Protocol actually spoken | Evidence |
|---|---|---|---|
| Google ADK (Py/Go/Java) | expose via `to_a2a(root_agent, port=…)` or `adk api_server --a2a`; consume via `RemoteA2aAgent(name, agent_card=url\|AgentCard\|file)`; page marked **Experimental** | `a2a-sdk <2,>=0.3.4`: both, detected at runtime; "new integrations should target 1.x.x" | [G28][G20] |
| Microsoft Agent Framework | `A2AAgent` client | requires `a2a-sdk>=1.0.0` | [G20] |
| LangSmith / LangGraph Agent Server | server at `/a2a/{assistant_id}`; card at `/.well-known/agent-card.json?assistant_id=` | JSON-RPC only; accepts v1.0 names plus four v0.3 names; **wire shape still v0.3**; no SubscribeToTask/push (`-32601`); ignores `A2A-Version`; `historyLength` ≤ 10 | [G24] |
| CrewAI | first-party client and server (`A2AClientConfig`, `A2AServerConfig`; `A2AConfig` deprecated, removed in 2.0.0); updates via `StreamingConfig`/`PollingConfig`/`PushNotificationConfig` | `a2a-sdk~=0.3.10` → **0.3** | [G26][G20] |
| AWS Strands | `StrandsA2AExecutor` | `a2a-sdk<0.4.0` → **0.3** | [G25][G20] |
| AWS Bedrock AgentCore Runtime | transparent proxy; container on port 9000 at `/`; SigV4/OAuth2 | extras `a2a` (0.3) and `a2a-v1` (1.x); contract docs show 0.3 JSON | [G25][G20] |
| Pydantic AI | removed in v2 → `datalayer/fasta2a` `agent_to_a2a` | fasta2a ≥1.0.0 = v1 schema | [G27] |
| OpenAI Agents SDK | none; PRs declined through 2026-06-24 | — | [G29] |
| IBM BeeAI | replaced ACP with A2A (`A2AServer`, `A2AAgent` adapters) | — | [G13] |

VERBATIM AgentCore scaffold [G25]:
```python
from strands import Agent, tool
from strands.multiagent.a2a.executor import StrandsA2AExecutor
from bedrock_agentcore.runtime import serve_a2a
from model.load import load_model
@tool
def add_numbers(a: int, b: int) -> int:
 """Return the sum of two numbers."""
 return a + b
tools = [add_numbers]
agent = Agent(
 model=load_model(),
 system_prompt="You are a helpful assistant. Use tools when appropriate.",
 tools=tools,
)
if __name__ == "__main__":
 serve_a2a(StrandsA2AExecutor(agent))
```
Pitfall, VERBATIM [G25]: "Do not set `time_of_last_update` to the current time on every ping… prevents the idle session timeout from ever firing — sessions then persist until MaxLifetime and can exhaust your session quota."

VERBATIM Pydantic AI → fasta2a migration [G27]:
```python
from fasta2a.pydantic_ai import agent_to_a2a
from pydantic_ai import Agent

agent = Agent('openai:gpt-5.2')
app = agent_to_a2a(agent)
```

VERBATIM CrewAI client [G26]:
```python
from crewai.a2a import A2AClientConfig

agent = Agent(
    role="Research Coordinator",
    goal="Coordinate research tasks efficiently",
    backstory="Expert at delegating to specialized research agents",
    llm="gpt-4o",
    a2a=A2AClientConfig(
        endpoint="https://example.com/.well-known/agent-card.json",
        timeout=120,
        max_turns=10
    )
)
```
(Excerpt; `Agent`, `Crew` and `Task` come from `from crewai import Agent, Crew, Task` in the original.)

### 11. Cross-framework tracing recipe (production concern the notes left abstract) [G24]
LangSmith: "The Agent Server A2A endpoint automatically converts the A2A `contextId` to `thread_id` for LangSmith tracing." "Let the first agent mint the `contextId`, then pass that same value to every agent for the rest of the conversation." Non-LangGraph agents read `params.message.contextId` and set `langsmith.metadata.thread_id` on an OTel span. The spec's generic advice is W3C Trace Context over HTTP headers, logging `taskId`, `sessionId` and correlation ids [G45]. MCP 2026-07-28 standardises `traceparent`/`tracestate`/`baggage` in `_meta` [G35], but A2A has no equivalent normative field. (Unverified whether the a2a-python `telemetry` extra propagates W3C headers automatically.)

### 12. AGNTCY / SLIM relationship — VERBATIM [G15]
> "SLIM provides a fourth, experimental binding: **SLIMRPC**. Instead of HTTP, it uses SLIM's encrypted session layer as the transport — bringing end-to-end encryption, built-in service discovery, and native multi-cloud routing to A2A…"
> "`protocolBinding` identifier is: `https://a2a-protocol.org/bindings/experimental-slimrpc/v1`"

Comparison per SLIM docs: HTTP bindings use TLS (channel only), while SLIMRPC uses MLS (end-to-end, application layer) and supports group/multicast [G15]. Implementations exist in Python, Go, Java, .NET and Rust (a2a-rs `a2a-slimrpc`). This is the concrete answer to "how does AGNTCY relate": it is a transport, directory, identity and observability layer *under and around* A2A [G14][G15].

### 13. A2A vs MCP, updated for MCP 2026-07-28 (cross-link ch.05) [G35][G34][G7]
- A2A's own 2026 framing: "MCP serves as the vertical integration layer … A2A acts as the horizontal protocol enabling peer-to-peer collaboration" [G7].
- MCP 2026-07-28: "Move experimental tasks out of the core protocol and into an official extension (`io.modelcontextprotocol/tasks`)… replaces the blocking `tasks/result` method with polling via `tasks/get` and a new `tasks/update`". MRTR returns `resultType: "input_required"`. SSE resumability (`Last-Event-ID`) was removed [G35]. This is structurally close to A2A's `Task`, `GetTask` and `INPUT_REQUIRED`. The "MCP can't do long-running agents" argument is weaker in 2026.
- The Microsoft 2025-07-23 "A2A on MCP" recipe relied on "resumable streams … elicitation … sampling … progress notifications" [G34]. MCP 2026-07-28 removed SSE resumability and replaced server-initiated sampling/elicitation with MRTR [G35], so the recipe is **outdated** as written.
- A durable difference: A2A agents are opaque peers with Agent Cards, per-skill security and a task store. MCP exposes tool schemas to the caller.

## Numbers

- **PyPI monthly downloads** (pypistats "overall", mirrors excluded; window starts 2026-03-29; accessed 2026-09-30) [G21]:

  | Month | a2a-sdk | mcp | ratio |
  |---|---|---|---|
  | 2026-04 | 4,353,686 | 241,114,825 | 55× |
  | 2026-05 | 8,161,965 | 285,120,800 | 35× |
  | 2026-06 | 11,523,543 | 280,853,112 | 24× |
  | 2026-07 | 12,348,432 | 319,707,848 | 26× |
  | 2026-08 | 16,626,313 | 329,844,958 | 20× |
  | 2026-09 (to 09-29) | 10,630,829 | 220,720,082 | 21× |

  `recent` endpoint: a2a-sdk last_month 10,333,975, last_week 3,053,470. mcp last_month 219,043,071 [G21]. Downloads include CI and transitive installs (e.g. ADK and CrewAI extras), so they do not measure deployments.
- **GitHub stars (2026-09-30)**: A2A 25,973; a2a-python 2,168; a2a-samples 1,785; a2a-js 631; a2a-java 501; a2a-inspector 494; a2a-go 476; a2a-dotnet 264; a2a-cli 139; a2a-rs 87; a2a-tck 51 [G16]. Other ecosystem repos: AP2 3,201★ [G37]; agntcy/slim 222★ [G15]; datalayer/fasta2a 222★ [G27]; microsoft/agent-host-protocol 377★ [G36].
- **Most-commented A2A issues (2026-09-30)**: #1672 658 (identity verification), #1786 245, #1829 143, #1628 124, #1575 116, #1769 99, #1717 94 (closed), #1929 65 (CLI) [G40]. This confirms field.md's numbers.
- **a2a-java advisories**: GHSA-qw47-mcm5-934w High, CVSS 3.1 7.5 (fail-open task authz; CWE-1188/862); GHSA-q78c-5jjq-57g8 SSRF, CVSS 5.8 per body, "medium" in the listing; GHSA-9rhm-2h4x-jwmx medium (credential leak via redirect); GHSA-x32g-jvvm-4725 medium (push credentials logged in cleartext); GHSA-4fpj-g9jf-9rgg High (Android redirect regression, fixed 1.3.2.Final). None has a CVE id [G23].
- **A2ABreak** (arXiv 2609.10871, 2026-09-09): 37 states, 76 transitions, 929 statements, 11 new vulns, precision 73.3%, F1 84.6%, zero-shot LLM baseline 0 confirmed [G30].
- **Unit 42 PoC**: ADK + A2A; client Gemini 2.5 Pro, malicious agent Gemini 2.5 Flash; outcome "an unauthorized trade of 10 shares" [G32].
- **LangSmith A2A limits**: `historyLength` max 10 (`-32602` above that); A2A endpoint requires `langgraph-api >= 0.4.21`; A2UI v0.9 and `historyScope` need 0.15.0, which is "not published as a stable release yet" [G24].
- **SDK lag after spec 1.0 (2026-03-12)**: a2a-go 2.0.0 +5 days (2026-03-17); a2a-sdk 1.0.0 +39 days (2026-04-20); .NET still preview after +202 days [G43][G18].

## Pitfalls, limits, criticism (additions)

- **"Claims 1.0, speaks 0.3."** LangSmith's own TCK-gated list says the response wire shape is still v0.3, SSE events are flat with `final`, errors carry no `ErrorInfo`, and `A2A-Version` is ignored [G24]. **Validate with the TCK (`./run_tck.py --sut-host … --level must`) before trusting an Agent Card's `protocolVersion`** [G44].
- **Method-name family changes enum casing.** LangSmith: "A v1.0 name returns SCREAMING_SNAKE_CASE … a v0.3 name returns lowercase … Pick one family per client and stay on it." `SendMessage` wraps the task in `result.task`, but `GetTask` and all v0.3 methods return it directly on `result` [G24].
- **Default history leaks earlier turns.** LangSmith returns *whole-context* history by default, so "the second task in a context replays the first task's messages … including earlier tool results and A2UI payloads" [G24]. Treat history as a data-exposure surface.
- **Resending a terminal `taskId`** gives `-32004`. Sending a `taskId` minted by another agent gives `-32001` [G24]. The spec requires `UnsupportedOperationError` for terminal tasks [G3], and a2a-python only started enforcing this in 1.2.0 [G18].
- **Fail-open authz by default** (a2a-java ≤1.2.0.Final): "`InMemoryTaskStore.get(String taskId)` is a bare map lookup with no authorization check." This violates spec §13.1 ("Servers **MUST** implement authorization checks on every … request") [G23][G3]. Lesson for the book: SDK defaults are demo-grade.
- **An AgentCard is untrusted input.** GHSA-9rhm: the client used the remote card's `APIKeySecurityScheme.name` as the header name for its own secret, and redirects then forwarded it cross-origin [G23]. The card's `description`/`skills` are also LLM-visible text: grith (vendor) cites Trustwave SpiderLabs' "agent card poisoning" via inflated capability descriptions [G33] (the underlying Trustwave post was not opened; see Unverified).
- **Signing is optional and verification is SHOULD**, so spoofing risk remains (Semgrep, quoted via grith: "A2A supports but does not enforce Agent Card signing") [G33][G3].
- **Stream-closure semantics are ambiguous in the spec** (terminal vs terminal-or-interrupted; see contradiction 20). Clients must handle a stream that ends at `INPUT_REQUIRED` and then call `SubscribeToTask` again [G3].
- **Only "Experimental" in ADK.** Google's own framework still labels A2A support Experimental as of 2026-09 [G28].
- **Official extension ecosystem is thin.** Zero graduated `ext-*` repos. The partner list in `docs/partners.md` is a PR-driven marketing surface: commits added MolTrust (one of the vendors in field.md's astroturfing observation) on 2026-09-22 and x402-list on 2026-09-25 [G10][G16].
- **HN 2026 skepticism, new voices:** "it was designed on paper by someone with no understanding of prompt caching and no consideration of latency or token costs" (nyellin); "We set up something with a registry of AgentCards and a messaging system with SSE streaming—then we realized we didn't need an agent on the other side" (bckr) [G31]. A counter-claim from a self-declared biased author: "A2A is much more popular in enterprise than startups … Gemini Enterprise, AgentForce, watsonx Orchestrate, SAP Joule … support it" [G31].

## What changed in the last 6 months (April–September 2026) — items none of the notes caught

1. SDK 1.0 wave: a2a-sdk 1.0.0 (2026-04-20) through 1.2.1 (2026-09-30), including the protobuf types switch, strict streaming rules and the `enable_v0_3_compat` flag [G18][G19]. a2a-js 1.1–1.3, a2a-java 1.3–1.4, a2a-go 2.3–2.6 [G43].
2. **First official-SDK security advisories** (a2a-java, 2026-08-28 and 2026-09-09) and the move of security intake to GHSA (2026-07-31) [G23][G10].
3. Spec §7.6.4 "In-Task Authorization Scope" added (2026-07-30) [G10][G3].
4. Roadmap (2026-09-15): v1.1, BiDi streaming, official CLI, elicitations [G6]. Official **a2a-cli** shipped v0.2.0 on 2026-09-09 and v0.3.0 on 2026-09-24 [G42].
5. AAIF membership (2026-08-17) [G11]. TSC seat changes: IBM (2026-07-14), ServiceNow (2026-08-18) [G10].
6. AP2 v0.2.0 plus FIDO donation (2026-04-28); AP2 now also targets UCP [G37].
7. Pydantic AI drops built-in A2A (v2); fasta2a moves to Datalayer and reaches 1.0 (A2A v1) on 2026-09-05 [G27].
8. MCP 2026-07-28 redesign narrows the functional gap with A2A [G35].
9. Experimental SLIMRPC custom binding and OID4VP in-task-auth extension repos created 2026-05-14 [G16][G15].
10. LangSmith A2A endpoint documents v1.0 method support plus an A2UI v0.9 extension (cross-link ch.09) [G24].
11. A2ABreak (2026-09-09) is the first formal protocol-level security analysis [G30].

## Diagram candidates

1. **Version negotiation and dual-stack serving.** Actors: v0.3 client, v1.0 client, one server exposing two `AgentInterface`s (`protocolVersion "0.3"` and `"1.0"`). Arrows: `A2A-Version: 1.0` → v1.0 handler; empty header → treated as 0.3; `A2A-Version: 0.5` → `VersionNotSupportedError (-32009 / 400)` [G3][G19].
2. **v0.3 → v1.0 wire-shape morph.** Side-by-side boxes: Part `kind` → oneof; stream event `kind` + `final` → `statusUpdate`/`artifactUpdate` wrapper; AgentCard `url`/`preferredTransport` → `supportedInterfaces[]` [G5].
3. **Artifact chunk streaming.** Sequence: `task` → `artifactUpdate{artifactId=A, append=false}` → `artifactUpdate{A, append=true}` … `{A, last_chunk=true}` → `statusUpdate COMPLETED` → stream close [G4].
4. **SubscribeToTask recovery.** Client stream drops → `GetTask` (optional) → `SubscribeToTask` → first event = Task snapshot → updates → close at terminal. Label: "no Last-Event-ID; snapshot-first prevents gap" [G3 §3.1.6].
5. **In-task authorization chain.** User ↔ Agent A ↔ Agent B ↔ OAuth AS. B sets `AUTH_REQUIRED` → A sets its own task `AUTH_REQUIRED` → user completes OAuth out-of-band → credential bound to B → B resumes. Annotate the A2ABreak "multi-hop identity loss" attack point [G3 §7.6][G30].
6. **Push-notification SSRF.** Attacker client → `CreateTaskPushNotificationConfig{url: http://169.254.169.254/…}` → vulnerable server POSTs task data to the metadata service. Mitigation box: URL validation at config creation and before dispatch, no redirects [G23][G3 §13.2][G18].
7. **Malicious Agent Card → credential leak.** Card declares `apiKey` header `X-Leaked-Cred` → client attaches its secret → server 302s to an attacker domain → non-`Authorization` header survives the redirect [G23].
8. **Session smuggling.** Victim client agent (Gemini 2.5 Pro) ↔ malicious remote agent over a multi-turn A2A session; hidden instructions in intermediate turns → tool call "buy 10 shares"; UI shows only the final answer [G32].
9. **Ecosystem layering.** AAIF stack: AGENTS.md / goose / MCP / agentgateway / A2A [G11]. Under A2A: bindings JSON-RPC, gRPC, HTTP+JSON, experimental SLIMRPC (AGNTCY) [G15]. Beside A2A: extensions AP2 (also UCP), A2UI, history-scope, OID4VP [G37][G24][G16].
10. **Cross-agent tracing via contextId.** Agent 1 mints contextId → propagated in `params.message.contextId` to Agents 2 and 3 → each maps it to `thread_id` / OTel span metadata → one LangSmith thread [G24].
11. **Framework × protocol-version matrix** (as a grid diagram): rows ADK, MAF, LangSmith, CrewAI, Strands, AgentCore, fasta2a; columns "advertises", "wire", "pins a2a-sdk" [G20][G24][G25].

**Chart candidates (real series):**
- Monthly PyPI downloads, a2a-sdk vs mcp, Apr–Sep 2026 (table in Numbers; log scale; label Sep as partial) [G21].
- SDK lag after spec 1.0: days from 2026-03-12 to the first stable 1.x/2.x per SDK: Go 5, Python 39, .NET not yet [G43][G18].
- a2aproject repo stars (11 repos, 2026-09-30) [G16].
- Spec release timeline v0.1.0 → v1.0.1 with breaking-change counts per release from the CHANGELOG: 0.2.2 (1), 0.2.5 (2), 0.3.0 (3), 1.0.0 (16 BREAKING bullets) [G1].

## Glossary (additions)

- **ProtoJSON**: canonical proto3→JSON mapping; the source of `TASK_STATE_*` casing (ADR-001) [G5].
- **`return_immediately`**: `SendMessageConfiguration` flag. False (the default) blocks until a terminal or interrupted state [G4].
- **`append` / `last_chunk`**: artifact-chunk streaming flags on `TaskArtifactUpdateEvent` [G4].
- **Custom protocol binding (cpb)**: a non-core transport identified by a URI in `protocolBinding`, e.g. SLIMRPC [G15][G17].
- **Growth Stage project**: AAIF maturity tier assigned to A2A on joining [G7].
- **TCK / ITK**: A2A Technology Compatibility Kit (grades servers by MUST/SHOULD/MAY) and Integration Testing Kit (cross-SDK) [G44][G16].
- **Agent session smuggling**: a malicious remote agent injecting covert instructions across a stateful multi-turn A2A session [G32].
- **fasta2a**: Pydantic-origin A2A server library, now at Datalayer; hosts the Pydantic AI bridge [G27].
- **SLIM**: AGNTCY's Secure Low-Latency Interactive Messaging (MLS-encrypted transport) [G15].
- **Elicitation (proposed, ADR-002)**: additive `Task.elicitations` object to model input requests without new `TaskState` values (PR #2149, closed) [G41].

## Unverified / open questions

- Exact archive date of i-am-bee/acp (practice.md says 2025-08-27). The API shows only `archived: true` and last push 2025-08-25 [G13].
- Whether spec §11.7 ("terminal or interrupted") or §3.1.2 ("terminal") is intended. No clarifying issue was found this session.
- Production claims in the AAIF blog (Huawei HarmonyOS Celia, Tencent WeChat, "150+ organizations", Azure AI Foundry A2A endpoints) are vendor/foundation statements, not independently confirmed. No Microsoft Foundry doc was opened.
- Trustwave SpiderLabs "agent card poisoning" and Semgrep's A2A analysis were seen only as quoted by grith.ai [G33]. The originals were not opened (WebSearch budget exhausted this session).
- Whether a2a-python's `telemetry` extra propagates W3C `traceparent` automatically. The code was not read.
- Salesforce Agentforce, SAP Joule, ServiceNow and watsonx Orchestrate A2A support is only claimed (HN, AAIF proposal issue). No vendor docs were opened this session.
- The Forbes article (2026-08-19) linked from the A2A blog was not opened.
- a2a-dotnet stable 1.0 date: unknown; only previews are published [G43].

## Sources

- [G1] CHANGELOG.md, a2aproject/A2A (entries 0.2.1 2025-05-27 → 1.0.1 2026-05-26), https://raw.githubusercontent.com/a2aproject/A2A/main/CHANGELOG.md, accessed 2026-09-30.
- [G2] GitHub Releases API, a2aproject/A2A (v1.0.1 published 2026-05-28T11:34:36Z; v0.1.0/v0.2.0 tagged 2025-06-09), https://api.github.com/repos/a2aproject/A2A/releases, accessed 2026-09-30.
- [G3] A2A Specification (v1.0.1 text on main), docs/specification.md, https://raw.githubusercontent.com/a2aproject/A2A/main/docs/specification.md, accessed 2026-09-30.
- [G4] specification/a2a.proto (main), https://raw.githubusercontent.com/a2aproject/A2A/main/specification/a2a.proto, accessed 2026-09-30.
- [G5] "What's New in A2A Protocol v1.0" (migration doc), docs/whats-new-v1.md, updated through 2026-08, https://raw.githubusercontent.com/a2aproject/A2A/main/docs/whats-new-v1.md, accessed 2026-09-30.
- [G6] "A2A protocol roadmap", docs/roadmap.md, "Last updated: Sep 15, 2026", https://raw.githubusercontent.com/a2aproject/A2A/main/docs/roadmap.md, accessed 2026-09-30.
- [G7] "A New Chapter for A2A: Joining the Agentic AI Foundation", A2A Protocol Community blog, front-matter date 2026-08-27, https://raw.githubusercontent.com/a2aproject/A2A/main/docs/blog/posts/a2a-joins-aaif.md, accessed 2026-09-30.
- [G8] "A2A Protocol Ships v1.0: Production-Ready Standard…", A2A blog, 2026-03-12, https://raw.githubusercontent.com/a2aproject/A2A/main/docs/blog/posts/announcing-1.0.md, accessed 2026-09-30.
- [G9] GOVERNANCE.md, a2aproject/A2A (current), https://raw.githubusercontent.com/a2aproject/A2A/main/GOVERNANCE.md, accessed 2026-09-30.
- [G10] Commit history of a2aproject/A2A since 2026-05-28 (GitHub API), https://api.github.com/repos/a2aproject/A2A/commits, accessed 2026-09-30.
- [G11] "A2A joins AAIF's open agentic stack", Agentic AI Foundation blog, 2026-08-17, https://aaif.io/blog/a2a-joins-aaif, accessed 2026-09-30.
- [G12] "Linux Foundation Launches the Agent2Agent Protocol Project…", Linux Foundation press release, 2025-06-23, https://www.linuxfoundation.org/press/linux-foundation-launches-the-agent2agent-protocol-project-to-enable-secure-intelligent-communication-between-ai-agents, accessed 2026-09-30.
- [G13] "ACP Joins Forces with A2A Under the Linux Foundation", Kate Blair (IBM Research), GitHub discussion i-am-bee #5, 2025-08-25, https://github.com/orgs/i-am-bee/discussions/5; plus i-am-bee/acp repo metadata and README, https://github.com/i-am-bee/acp, accessed 2026-09-30.
- [G14] "Linux Foundation Welcomes the AGNTCY Project…", LF press release, 2025-07-29, https://www.linuxfoundation.org/press/linux-foundation-welcomes-the-agntcy-project-to-standardize-open-multi-agent-system-infrastructure-and-break-down-ai-agent-silos, accessed 2026-09-30.
- [G15] agntcy/slim README and docs/content/slim/integrations/a2a.md ("A2A over SLIM"), undated (main), https://github.com/agntcy/slim, accessed 2026-09-30.
- [G16] a2aproject GitHub org repository listing (stars, created dates), https://api.github.com/orgs/a2aproject/repos, accessed 2026-09-30.
- [G17] docs/topics/extensions.md and docs/topics/extension-and-binding-governance.md, a2aproject/A2A (main), https://github.com/a2aproject/A2A/tree/main/docs/topics, accessed 2026-09-30.
- [G18] a2a-python CHANGELOG.md (0.2.6 → 1.2.1, 2026-09-30), https://raw.githubusercontent.com/a2aproject/a2a-python/main/CHANGELOG.md, accessed 2026-09-30.
- [G19] "A2A Python SDK Migration Guide: v0.3 → v1.0", a2a-python docs/migrations/v1_0/README.md (added with 1.0.0, 2026-04-20), https://raw.githubusercontent.com/a2aproject/a2a-python/main/docs/migrations/v1_0/README.md, accessed 2026-09-30.
- [G20] PyPI JSON API (versions, upload dates, requires_dist) for a2a-sdk, google-adk, crewai, strands-agents, bedrock-agentcore, agent-framework-a2a, fasta2a, pydantic-ai, openai-agents, https://pypi.org/pypi/<pkg>/json, accessed 2026-09-30.
- [G21] pypistats API, `recent` and `overall` for a2a-sdk and mcp, https://pypistats.org/api/packages/a2a-sdk/overall, https://pypistats.org/api/packages/mcp/overall, accessed 2026-09-30.
- [G22] a2aproject/a2a-samples, samples/python/agents/helloworld/{__main__.py, agent_executor.py, test_client.py} (main), https://github.com/a2aproject/a2a-samples, accessed 2026-09-30.
- [G23] a2a-java repository security advisories GHSA-qw47-mcm5-934w, GHSA-q78c-5jjq-57g8, GHSA-9rhm-2h4x-jwmx, GHSA-x32g-jvvm-4725 (2026-08-28), GHSA-4fpj-g9jf-9rgg (2026-09-09), https://github.com/a2aproject/a2a-java/security/advisories, accessed 2026-09-30.
- [G24] "A2A endpoint in Agent Server", LangChain docs source src/langsmith/server-a2a.mdx (main, undated; mentions langgraph-api 0.15.0), https://raw.githubusercontent.com/langchain-ai/docs/main/src/langsmith/server-a2a.mdx, accessed 2026-09-30.
- [G25] AWS docs: "Deploy A2A servers in AgentCore Runtime" and "A2A protocol contract", Amazon Bedrock AgentCore Developer Guide (current), https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-a2a.html and …/runtime-a2a-protocol-contract.html, accessed 2026-09-30.
- [G26] CrewAI docs "Agent-to-Agent (A2A) Protocol", docs/edge/en/learn/a2a-agent-delegation.mdx (main), https://raw.githubusercontent.com/crewAIInc/crewAI/main/docs/edge/en/learn/a2a-agent-delegation.mdx, accessed 2026-09-30.
- [G27] pydantic/pydantic-ai PR #5426 (merged 2026-05-15), https://github.com/pydantic/pydantic-ai/pull/5426; datalayer/fasta2a releases v0.6.1 (2026-05-15), v1.0.0 (2026-09-05), v2.0.0 (2026-09-06), https://github.com/datalayer/fasta2a/releases, accessed 2026-09-30.
- [G28] Google ADK docs: docs/a2a/index.md, quickstart-exposing.md, quickstart-consuming.md (google/adk-docs main), https://github.com/google/adk-docs/tree/main/docs/a2a, accessed 2026-09-30.
- [G29] openai/openai-agents-python issue/PR #3683 (closed 2026-06-24) and #3567 (closed 2026-06-04), maintainer comments by seratch, https://github.com/openai/openai-agents-python/pull/3683, accessed 2026-09-30.
- [G30] Lotfi, Rahman, Karim, Bertino, "A2ABreak: Systematic Security Analysis of the A2A Protocol", arXiv:2609.10871v1, 2026-09-09, https://arxiv.org/abs/2609.10871, accessed 2026-09-30 (abstract via arXiv API).
- [G31] "Ask HN: Is anyone using the A2A protocol?", HN item 48582679, 2026-06-18, 96 points, https://news.ycombinator.com/item?id=48582679, accessed 2026-09-30 via Algolia items API.
- [G32] Royce Lu, Jay Chen, "Agent Session Smuggling in Agent2Agent Systems", Palo Alto Networks Unit 42, 2025-10-31, https://unit42.paloaltonetworks.com/agent-session-smuggling-in-agent2agent-systems/, accessed 2026-09-30.
- [G33] "Google's A2A Protocol Has Zero Defenses Against Prompt Injection", grith.ai blog (vendor), 2026-03-20, https://grith.ai/blog/a2a-protocol-zero-defenses-prompt-injection, accessed 2026-09-30.
- [G34] Victor Dibia et al., "Can You Build Agent2Agent Communication on MCP? Yes!", Microsoft for Developers blog, 2025-07-23, https://devblogs.microsoft.com/blog/can-you-build-agent2agent-communication-on-mcp-yes/, accessed 2026-09-30.
- [G35] MCP specification changelogs 2025-11-25 and 2026-07-28, modelcontextprotocol/modelcontextprotocol docs/specification/*/changelog.mdx, https://github.com/modelcontextprotocol/modelcontextprotocol, accessed 2026-09-30.
- [G36] microsoft/agent-host-protocol README (repo created 2026-03-12), https://github.com/microsoft/agent-host-protocol, accessed 2026-09-30.
- [G37] google-agentic-commerce/AP2 README and releases (v0.1.0 2025-09-16, v0.2.0 2026-04-28); ap2-protocol.org landing page, https://github.com/google-agentic-commerce/AP2, https://ap2-protocol.org/, accessed 2026-09-30.
- [G38] Issue #1755 "Empirical data: Near-zero real-world A2A protocol compliance…", a2aproject/A2A, 2026-04-15 (closed), https://github.com/a2aproject/A2A/issues/1755, accessed 2026-09-30.
- [G39] A2A specification at tags v0.1.0 and v0.2.0 (method-name check), https://raw.githubusercontent.com/a2aproject/A2A/v0.1.0/docs/specification.md, …/v0.2.0/docs/specification.md, accessed 2026-09-30.
- [G40] GitHub issue search, repo:a2aproject/A2A sorted by comments, accessed 2026-09-30.
- [G41] a2aproject/A2A issues #1991 (2026-06-25), #1995 (2026-06-25), #2143 (2026-08-15), PR #2149 (2026-08-18), https://github.com/a2aproject/A2A/issues, accessed 2026-09-30.
- [G42] a2aproject/a2a-cli README and releases (v0.2.0 2026-09-09, v0.3.0 2026-09-24), https://github.com/a2aproject/a2a-cli, accessed 2026-09-30.
- [G43] SDK releases: a2a-go (README; v2.0.0 notes 2026-03-17; v2.6.0 2026-09-25), a2a-js (v1.3.0 2026-09-29), a2a-java (v1.4.0.Final 2026-09-28), a2a-dotnet (v1.0.0-preview2 2026-04-09); npm registry @a2a-js/sdk; NuGet A2A index, accessed 2026-09-30.
- [G44] a2aproject/a2a-tck README (main; last commits 2026-09-01), https://github.com/a2aproject/a2a-tck, accessed 2026-09-30.
- [G45] docs/topics/enterprise-ready.md, a2aproject/A2A (main), https://raw.githubusercontent.com/a2aproject/A2A/main/docs/topics/enterprise-ready.md, accessed 2026-09-30.
