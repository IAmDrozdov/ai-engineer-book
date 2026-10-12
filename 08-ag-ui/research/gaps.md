# 08. AG-UI: протокол агент ↔ интерфейс — gaps & corrections notes

Lens: completeness critic and gap-filler over `spec.md`, `practice.md`, `field.md` (same directory).
Everything below was re-checked on 2026-09-30 against primary sources (spec pages via
`docs.ag-ui.com/llms-full.txt`, the published `schema.json`, SDK source on GitHub `main`, npm/PyPI/NuGet
registries, GitHub releases/discussions via `gh api`) and one local experiment (a FastAPI server + httpx
client run against `ag-ui-protocol==1.0.0`). Source ids here are `[G#]` to avoid clashing with the other
files' `[S#]`.

## Contradictions resolved

1. **When did 1.0 ship — 2026-09-17 or 2026-09-30?** `spec.md`/`field.md` say 09-17, `practice.md` says 09-30.
   Resolution: all four dates are real, and they are different events. Draft spec published for comment on
   **2026-09-02** (GitHub Discussion #2608) [G27]; `@ag-ui/core` 1.0.0 published **2026-09-17T18:27Z**, and
   `ag-ui-protocol` 1.0.0 published **2026-09-17T18:31Z** [G25][G26]; `DEPRECATIONS.md` says "released on
   2026-09-17" [G23]; the maintainers' "AG-UI 1.0 is officially released and frozen" discussion post is dated
   **2026-09-18** [G28]; the CopilotKit marketing post "Introducing AG-UI 1.0" is dated **2026-09-30** [G29].
   Use **2026-09-17** as the release date and 09-30 as the blog announcement date.
2. **Is Python at 1.0.1?** `field.md` says `ag-ui-protocol` patched to 1.0.1 on 09-29. **False.** PyPI's
   latest `ag-ui-protocol` is **1.0.0** (2026-09-17). The 2026-09-29 release train published only the four TS
   packages `@ag-ui/client`, `@ag-ui/core`, `@ag-ui/encoder`, `@ag-ui/proto` at 1.0.1 [G24][G26].
3. **What is in 1.0.1?** (`spec.md` listed it as unknown.) Release notes, verbatim, for `@ag-ui/client@1.0.1`:
   "Fixed `connectAgent()` failing when reconnecting to a thread with pending interrupts; connects now read
   thread history without requiring resume answers." and "The resume/interrupt check now applies only to
   inputs that submit answers, allowing reloads to restore interrupted threads." `core`, `encoder`, `proto`
   1.0.1: "Maintenance release; no consumer-facing changes identified." No breaking changes [G24].
4. **31 or 36 event types?** The normative spec says, twice, "one of the 31 values of `EventType`" /
   "Thirty-one event types, in eight families" [G1][G2], and `schema.json`'s `EventType` enum has exactly 31
   members [G3]. The "36" comes from the informative `concepts/subagents` page ("19 of the 36 event types have
   a protobuf mapping") [G14]. 31 + the 5 retired `THINKING_*` types = 36, which is the likely source of that
   number (my inference, not stated anywhere). Other numbers in circulation are older: CopilotKit's June 2025
   post says "one of 16 events" [G30] and CopilotKit's current "Open source vs Intelligence" doc still says
   "16 standardized event types" [G55]. **Use 31.**
5. **Does a wildcard `Accept` opt in to protobuf?** `spec.md` says "a wildcard `Accept` does NOT opt in". The
   spec says the opposite: "Admission is what opts in — a wildcard range (`*/*`, `application/*`) admits the
   media type too — so a client that cannot consume protobuf MUST send an explicit `Accept` naming what it
   can" and "relative quality values between the two media types are not consulted" [G10]. So a client that
   cannot decode protobuf must send an explicit `Accept: text/event-stream`, and a producer that supports
   protobuf may answer a `*/*` request with it.
6. **Does the Python `EventEncoder(accept=...)` pick protobuf?** `spec.md` says it "picks SSE vs. protobuf
   encoding based on the incoming request's Accept header". **False for Python.** In `sdks/python/ag_ui/encoder/encoder.py`
   on `main`, `__init__(self, accept)` does `pass`, `get_content_type()` always returns
   `"text/event-stream"`, and `encode()` always calls `_encode_sse` [G21]. The docs agree: "The current
   implementation encodes events as Server-Sent Events" [G20]. The subagents page lists protobuf support only
   for TypeScript and .NET, not for Python [G14]. **Python producers are SSE-only.**
7. **Is .NET a first-party or a community SDK?** `practice.md` (and the docs' own `/introduction` table) list
   .NET as "Community". The normative spec says: "AG-UI is maintained with three first-party SDKs —
   TypeScript, Python and .NET … Other language bindings are community-maintained" [G11]. In the repo, .NET
   lives in `sdks/dotnet`, not `sdks/community` [G24-repo listing]. `AGUI.Abstractions`/`AGUI.Client`/`AGUI.Server`
   are at **1.0.0** on NuGet [G60]. **First-party.** The introduction table is stale [G16].
8. **Are Claude Agent SDK and Claude Managed Agents integrations 1st-party?** `practice.md` says 1st-party,
   `field.md` says community. The docs' integration table lists both under "Agent Framework - Community",
   marked "Supported" [G16]. **Community tier**, even though the code lives in the `ag-ui-protocol/ag-ui`
   monorepo `integrations/` directory.
9. **Who enforces interrupt-resume rules?** `spec.md` and `practice.md` copied the "Contract rules" from the
   informative `concepts/interrupts` page, which says an agent receiving input without a `resume` "must emit
   `RunError`", that stale resumes "produce `RunError`", and so on [G13]. The **normative** 1.0 spec page says
   something different: "Coverage is the *consumer's* rule to enforce … The producer is not asked to check
   this, and needs to retain nothing from the interrupted run to be conformant" and "A producer that carries
   nothing across the gap is conformant". An unrecognised resume entry "SHOULD proceed without the entry" with
   a warning. For a known uncovered interrupt, the producer "MUST NOT perform the interrupted action", MAY
   reject before `RUN_STARTED`, or MAY re-interrupt, but MUST NOT end with success. Expiry is also judged by
   the consumer [G7]. This change came from Pydantic AI's review of the draft (Discussion #2608, maintainer
   reply 2026-09-14: "only the consumer is responsible for enforcing interrupt responses") [G27]. **The spec
   wins.** The concepts page is older; its example `expiresAt` is `2026-04-20`, which matches the April 2026
   PR #1569 [G13][G31].
10. **What can `RUN_FINISHED.outcome` be?** The verbatim type in `practice.md` (from `concepts/interrupts`)
    shows `success | interrupt`. `schema.json` has three arms: `RunFinishedSuccessOutcome` (with optional
    `pendingToolCallIds: string[]`), `RunFinishedInterruptOutcome` (`interrupts` with `minItems: 1`), and
    `RunFinishedCancelledOutcome` [G3]. `RUN_FINISHED` also carries an optional `usage: TokenUsage[]` [G3][G4].
11. **Which integrations actually forward interrupts?** `field.md` says only LangGraph and AWS Strands.
    **Incomplete.** Pydantic AI maps `requires_approval=True` tools onto the interrupt outcome, with
    `Interrupt.id = f"int-{tool_call_id}"`, and has done so since `ag-ui-protocol >= 0.1.19` [G36].
    `@ag-ui/mastra@1.1.5` (released **today**, 2026-09-30) surfaces native tool approvals as interrupts with
    reason `mastra:tool_approval` [G24]. LangGraph supports it but only opt-in (next item).
12. **Is LangGraph's default 1.0-conformant?** With the default `emit_interrupt_outcome=False`, "interrupted
    runs end with a plain `RUN_FINISHED` plus the legacy `on_interrupt` event". The README explains why:
    CopilotKit's `useLangGraphInterrupt` (as of v1.60.x) "stop[s] sending a resume directive once they observe
    the structured outcome" [G38]. The spec says "A producer MUST NOT report an interrupted run as success"
    [G7], and a plain `RUN_FINISHED` with no outcome means success [G4]. So **the default LangGraph bridge
    is, on this point, not conformant with 1.0**. The README also says that turning off the legacy event
    forces the outcome on [G38].
13. **When did ADK, Strands and MAF integrations appear?** `field.md` says "~early 2026". First PyPI uploads:
    `ag-ui-adk` 0.3.0 on **2025-09-17**, `agent-framework-ag-ui` on **2025-10-23**, `ag-ui-strands`
    0.1.0a1 on **2025-12-02**, `ag-ui-langgraph` on 2025-07-04, `ag-ui-crewai` on 2025-06-24,
    `llama-index-protocols-ag-ui` on 2025-06-16 [G26]. The npm wrappers `@ag-ui/aws-strands` (2026-05-26) and
    `@ag-ui/adk` (2026-06-05) came later [G25].
14. **Which source is the "AG-UI 1.0 launch post"?** `practice.md` [S31] cites
    `copilotkit.ai/blog/big-updates-on-ag-ui` as the 1.0 post, dated oddly as 2025-06-02. It is a different
    post: "Big Updates on AG-UI: Massive Traction and Adoption", by Uli Barkai, **2025-06-02** (one month after
    launch). The "millions of views … tens of thousands of developers … Agno, AWS, LlamaIndex, Alibaba" claims
    come from **June 2025**, not from the 1.0 launch [G30]. The real 1.0 post is `copilotkit.ai/blog/ag-ui-1.0`,
    by Anmol Baranwal and Eli Berman, 2026-09-30 [G29].
15. **Is WebSocket a transport?** The informative `concepts/architecture` page says "supporting various
    transport mechanisms including Server-Sent Events (SSE), webhooks, WebSockets, and more" [G15], and
    `/introduction` says AG-UI "builds on top of … (HTTP, WebSockets)" [G16]. The normative spec defines two
    bindings: HTTP+SSE (MUST for an HTTP implementation) and HTTP+Protobuf (optional). Anything else,
    WebSockets included, is a "custom transport" [G9]. AWS AgentCore does ship a `/ws` endpoint [G41]. **The
    spec wins.** All three notes files already agree on this; the point to keep is that the docs contradict
    themselves.
16. **Channels SDK launch: 2026-08-04 or 08-06?** Both are correct: the CopilotKit blog post is dated 08-04
    (`practice.md`), and the Show HN post is dated 08-06 (`field.md`), 121 points [G61].
17. **Does AG-UI "work with the OpenAI Agents SDK"?** The 1.0 blog lists it among the frameworks AG-UI "works
    with" [G29]. The docs table says "In Progress" [G16], and PR #2210 "OpenAI Agents SDK (Python)
    integration" (`ag-ui-openai-agents`) is **still open** (created 2026-07-19) [G32]. **Not shipped** as of
    2026-09-30.
18. **Is `parentRunId` on `RunAgentInput` or on `RUN_STARTED`?** It is on both [G3]. On the event, the schema
    description is "when an agent invokes another agent as a separate run rather than as a subagent within
    one".
19. **Capability discovery: `getCapabilities()` or "no retrieval mechanism"?** Both notes are right. The spec
    says retrieval "is deliberately left to the implementation" [G5]. The TS `AbstractAgent` has an optional
    `getCapabilities()`; the bare `HttpAgent` does not implement it.
20. **"0.x and 1.0 peers interoperate" vs "old clients hard-fail on `SUBAGENT_*`".** Both are true under
    different conditions. The compatibility shims (`CompatibilityBoundary`, `BackwardCompatibility_0_0_39/45/57`)
    live only in the **TypeScript client** [G23]. A new TS client can downgrade its traffic to an old producer,
    but an *old* client still has no idea what a new event type is. That is why producers gate new families
    themselves (for example LangGraph `subagent_visibility`, default `"inline"`). The Python SDK has no
    translation layer: the `THINKING_*` classes were removed from `ag_ui.core` in 1.0 [G22].

## Claims most likely to be wrong (with corrections)

1. **"AG-UI 1.0 was released on 2026-09-30."** → Released and frozen 2026-09-17 (packages) / 2026-09-18
   (maintainer announcement). The draft was published 2026-09-02, and 09-30 is the CopilotKit blog post
   [G25][G26][G27][G28][G29].
2. **"`ag-ui-protocol` (Python) is at 1.0.1."** → 1.0.0. Only the TS packages are at 1.0.1 (2026-09-29)
   [G24][G26].
3. **"AG-UI defines 16 (or 17, or 36) event types."** → 31 `EventType` values in 8 families. The 5
   `THINKING_*` types are retired, and only the TS client translates them, until 2027-09-17
   [G1][G3][G23][G30][G55].
4. **"AG-UI supports SSE, WebSockets and a binary protocol" (three peer transports).** → Two standard
   bindings: HTTP+SSE (mandatory) and HTTP+Protobuf (optional). WebSocket is a custom transport with no
   spec-defined framing. Watch out: the docs' own architecture page still says otherwise [G9][G15].
5. **"The Python SDK negotiates protobuf through `EventEncoder(accept=...)`."** → The Python encoder ignores
   `accept` and always emits SSE. Protobuf exists only in TS (`@ag-ui/proto`) and .NET [G14][G20][G21].
6. **"State sync is bidirectional and real-time."** → Within a run, state flows only agent→client
   (`STATE_SNAPSHOT`/`STATE_DELTA`). The client's changes reach the agent only as `RunAgentInput.state` on the
   *next* run: "The protocol has no mid-run channel from the consumer" [G7]. A failed delta has no back
   channel either; the consumer warns and keeps its prior value, and the producer "SHOULD resynchronise with
   a snapshot" [G8].
7. **"An interrupt pauses the run mid-stream and waits."** → The run *ends* with
   `RUN_FINISHED{outcome:{type:"interrupt"}}`. Continuing means a **new run** (new `runId`, same `threadId`)
   carrying `resume[]` [G7].
8. **"The agent must reject input that doesn't answer every interrupt, and must emit `RunError` for expired
   interrupts."** → Under 1.0 the **consumer** enforces coverage and expiry, and a stateless producer is
   conformant [G7] (see contradiction 9).
9. **"`RUN_FINISHED` reports success or interrupt."** → Also `{type:"cancelled"}` (a deliberate stop; not a
   failure, and resuming is not possible). Success may carry `pendingToolCallIds` for unanswered frontend tools.
   `usage` reports token accounting. Separately, a consumer that loses the connection has a *truncated* run
   and "MUST NOT synthesize a `RUN_FINISHED`" [G3][G4][G9].
10. **"All major integrations are on AG-UI 1.0."** → As of 2026-09-30, `pydantic-ai-slim[ag-ui]` 2.52.0
    requires `ag-ui-protocol<1,>=0.1.10` and `agent-framework-ag-ui` 1.4.0 requires `ag-ui-protocol<0.2`, so
    neither can install the 1.0 Python SDK. `@assistant-ui/react-ag-ui` 0.0.62 depends on
    `@ag-ui/client ^0.0.59`, which for a 0.0.x version resolves to 0.0.59 only. `ag-ui-langgraph` 0.0.45 emits
    the interrupt outcome only on opt-in. Pydantic AI's docs still say "AG-UI currently has no cancelled
    outcome" [G26][G36][G38][G42]. Wire compatibility generally holds anyway, because 1.0 is additive.
11. **"CopilotKit's shared-state hook is `useCoAgent`, frontend tools are `useCopilotAction`."** → Those are
    CopilotKit v1 APIs. The current docs are "CopilotKit v2": `useAgent()` (`agent.state`,
    `agent.setState`), `useFrontendTool`, `useRenderTool`, `useComponent`, `useHumanInTheLoop`,
    `useInterrupt`, `useRenderToolCall`, imported from `@copilotkit/react-core/v2`. `@copilotkit/react-core`
    is at 1.75.2 (2026-09-30) [G25][G51][G52].
12. **"MCP-UI / MCP Apps comes from Microsoft + Shopify"** (the AG-UI docs' own table says this [G64]). → The
    MCP Apps extension (SEP-1865, 2025-11-21) "was authored by MCP Core Maintainers at OpenAI and Anthropic,
    together with the MCP-UI creators" (Ido Salomon, Liad Yosef) [G50]. ChatGPT now implements the MCP Apps
    standard, and OpenAI's "Apps SDK" docs URL now redirects to "Plugins" [G48]. Details belong in ch.09.
13. **".NET is a community SDK" / "Claude Agent SDK is a 1st-party integration."** → .NET is one of three
    first-party SDKs (TS, Python, .NET), at NuGet 1.0.0. The Claude Agent SDK and Claude Managed Agents
    integrations are "Community" tier [G11][G16][G60].
14. **"AG-UI supports stream resumption / reconnect."** → The SSE binding has **no resumption**
    (`Last-Event-ID` unused; a broken stream needs a new run). `TransportCapabilities.resumable` and
    `pushNotifications` are reserved flags with no defined mechanism (open design issue #2105). Reconnect and
    catch-up are sold as "AG-UI Streams" in the commercial CopilotKit Intelligence service. `connectAgent()`
    in `@ag-ui/client` exists, but "the agent must implement `connect()` or this functionality must be
    provided by a framework like CopilotKit". Contrast: Vercel AI SDK ships `resume` on `useChat` plus the
    `resumable-stream` package [G19][G33][G44][G54].
15. **Adoption numbers quoted without conditions** ("millions of views, tens of thousands of developers",
    "millions of installs per week", "adopted by Google, Microsoft, Amazon and Oracle", "30 live integrations").
    → The first is from June 2025 [G30]. "Millions of installs per week" is the CEO quoted by TechCrunch,
    2026-05-05 [G56]. The rest is vendor copy [G29]. Measured instead (30 days to 2026-09-28): `@ag-ui/core`
    8,222,341 npm downloads, `ag-ui-protocol` 6,788,299 PyPI downloads. Both are heavily transitive (CI and
    dependency installs), and they are small next to `ai` (Vercel, 100.5M) or `@modelcontextprotocol/sdk`
    (220.0M) [G57][G58].

## TL;DR

- AG-UI 1.0 is a **frozen, normative spec plus a JSON Schema** (`https://ag-ui.com/spec/1.0/schema.json`,
  JSON Schema draft 2020-12). The schema wins on structure and the prose wins on behaviour. Future changes go
  through public drafts ("The 1.0 specification will remain unchanged") [G3][G28].
- 31 event types, 8 families. Only the run lifecycle is mandatory for a producer; a consumer MUST accept all
  of them [G2].
- Versioning is in-band: `RunAgentInput.protocolVersion` (consumer) and `RUN_STARTED.protocolVersion`
  (producer, its own value, never an echo). The format is `MAJOR.MINOR`. A newer minor of a producer's own
  line MUST be served; it may reject only an unknown major [G6].
- **New in 1.0 and absent from all three notes: token usage.** `usage: TokenUsage[]` on
  `RUN_FINISHED`/`RUN_ERROR`, one entry per provider+model. `inputTokens`/`outputTokens` are totals, and
  cached, cache-write and reasoning tokens are *parts* of them. Subagents count toward the parent run; child
  runs (`parentRunId`) and resumed runs report their own [G4][G3].
- **Cancelled ≠ truncated ≠ error.** Cancelled is a producer report via `outcome:{type:"cancelled"}`.
  Truncated means the connection died with no terminal event, and the consumer must not invent one.
  `RUN_ERROR` means the producer reports its own failure. A late `RUN_ERROR` after `RUN_FINISHED` is legal
  [G4][G9].
- Snapshots replace and deltas amend (RFC 6902, atomic). A failed patch → warn and keep the prior value;
  never keep a half-applied patch. An unknown `op` is dropped with a warning. `test` failure = patch does not
  apply [G8].
- Frontend tools finish the run as **success** with `pendingToolCallIds`; interrupts finish it as
  **interrupt**; a stop finishes it as **cancelled**. These are three different endings [G7][G12].
- The Python SDK is a **producer-side** SDK (types plus an SSE encoder). There is no Python client and no
  Python protobuf. Models are generated from the schema with Pydantic v2 and camelCase aliases, and `Event` is
  a discriminated union usable with `TypeAdapter` [G21][G22][G62].
- Python integrations lag the 1.0 SDK. Pydantic AI and MAF pin `<1` and `<0.2` respectively, and LangGraph
  keeps the interrupt outcome opt-in [G26][G38].
- `@ag-ui/client` 1.0.1 (2026-09-29) fixed reconnecting to threads with pending interrupts (`connectAgent`)
  [G24].
- Alternatives in one line each. Vercel AI SDK UI Message Stream: SSE, header
  `x-vercel-ai-ui-message-stream: v1`, `[DONE]` terminator, has tool approval parts and resumable streams.
  LangChain `useStream` plus LangGraph event streaming (v1.2+). OpenAI ChatKit: thread/item-oriented, server
  owns the store. assistant-ui: a UI kit that *consumes* AG-UI through `@assistant-ui/react-ag-ui`
  [G42][G43][G45][G47][G49].
- Security in the spec: "Model output is untrusted input", "Data flows both ways" (state and messages
  round-trip through the client, so no secrets in them). The spec does not say this outright, but it
  follows: `RunAgentInput.messages` is client-supplied, so a client can forge history, tool results
  included. Authentication is out of protocol scope [G11][G36].
- No OSV/GitHub advisories found for `@ag-ui/*`, `ag-ui-*` or `@copilotkit/*` as of 2026-09-30 [G59].

## Current state and versions (verified 2026-09-30)

| Artifact | Version | Date | Source |
|---|---|---|---|
| Spec | 1.0 (frozen), draft at `/spec/draft` preceded it | frozen 2026-09-17/18; draft 2026-09-02 | [G27][G28] |
| `@ag-ui/core`, `@ag-ui/client`, `@ag-ui/encoder`, `@ag-ui/proto` | 1.0.1 | 2026-09-29 | [G25] |
| `ag-ui-protocol` (PyPI) | 1.0.0 (no 1.0.1) | 2026-09-17 | [G26] |
| `AGUI.Abstractions` / `AGUI.Client` / `AGUI.Server` (NuGet) | 1.0.0 | — | [G60] |
| `@copilotkit/react-core`, `@copilotkit/runtime` | 1.75.2 | 2026-09-30 | [G25] |
| `ag-ui-langgraph` / `@ag-ui/langgraph` | 0.0.45 (2026-09-09) / 0.0.43 (2026-08-16) | — | [G26][G25] |
| `ag-ui-crewai` | 0.3.1 | 2026-09-14 | [G26] |
| `ag-ui-adk` / `@ag-ui/adk` | 0.7.0 (2026-06-23) / 0.0.2 | — | [G26][G25] |
| `ag-ui-strands` / `@ag-ui/aws-strands` | 0.4.1 (2026-09-23) / 0.3.0 (2026-09-11) | — | [G26][G25] |
| `@ag-ui/mastra` | 1.1.5 | 2026-09-30 | [G25][G24] |
| `@ag-ui/claude-agent-sdk` | 0.0.4 | 2026-09-17 | [G25] |
| `agent-framework-ag-ui` (MAF Python) | 1.4.0, pins `ag-ui-protocol<0.2` | 2026-09-18 | [G26] |
| `pydantic-ai-slim[ag-ui]` | 2.52.0, pins `ag-ui-protocol<1` | 2026-09-30 | [G26] |
| `llama-index-protocols-ag-ui` | 0.5.0 | 2026-08-31 | [G26] |
| `agno[agui]` | 3.0.11 | 2026-09-23 | [G26] |
| `@ag-ui/a2a-middleware` / `@ag-ui/mcp-apps-middleware` / `@ag-ui/a2ui-middleware` | 0.0.3 / 0.1.1 / 0.0.11 | 09-17 / 09-11 / 09-30 | [G25] |
| `@assistant-ui/react-ag-ui` | 0.0.62 (dep `@ag-ui/client ^0.0.59`) | 2026-09-24 | [G42] |
| Vercel `ai` | 7.0.123 (v7.0.0 on 2026-06-25) | — | [G25] |
| `openai-chatkit` (Py) / `@openai/chatkit-react` | 1.6.5 (2026-05-19) / 1.6.1 (2026-07-31) | — | [G26][G25] |
| LangGraph | 1.2.12 (event streaming "v3" API recommended) | 2026-09-21 | [G26][G45] |
| Repo `ag-ui-protocol/ag-ui` | 16,132 stars, 1,464 forks, 420 open issues+PRs, MIT | 2026-09-30 | [G24] |

Repo layout (checked 2026-09-30): `sdks/{typescript,python,dotnet,community}`, with `community` =
`c++ dart go java kotlin ruby rust`; `integrations/` = `a2a adk-middleware ag2 agent-spec agno aws-strands
claude-agent-sdk claude-managed-agents community crew-ai langchain langgraph langroid llama-index mastra
microsoft-agent-framework pydantic-ai server-starter server-starter-all-features vercel-ai-sdk watsonx`,
with `integrations/community` = `cloudflare-agents genkit spring-ai`; `middlewares/` = `a2a-middleware
a2ui-middleware event-throttle-middleware mcp-apps-middleware mcp-middleware middleware-starter`. The repo
also ships a Claude Code plugin marketplace (`.claude-plugin/marketplace.json`, plugin `ag-ui-dotnet`) [G24][G65].

## Timeline (additions to the other notes)

- 2025-06-02: CopilotKit post "Big Updates on AG-UI": "one of 16 events", with the "M×N → M+N" framing [G30].
- 2025-06-16 → 2025-12-02: first PyPI releases of the LlamaIndex, CrewAI, LangGraph, ADK (2025-09-17), MAF
  (2025-10-23) and Strands (2025-12-02) bridges [G26].
- 2025-10-01: `@ag-ui/a2a-middleware` first published. 2025-12-05: `@ag-ui/mcp-apps-middleware`.
  2026-01-28: `@ag-ui/a2ui-middleware` [G25].
- 2025-11-21: MCP Apps extension proposal (SEP-1865) [G50].
- **2026-04-30**: PR #1569 merged. It shipped the "interrupt-aware run lifecycle in TS + Python core SDKs"
  (`Interrupt`, `ResumeEntry`, `RunAgentInput.resume`, `RUN_FINISHED.outcome`), five months before 1.0 [G31].
  It reached PyPI in `ag-ui-protocol` 0.1.19 (2026-06-02) [G26][G36].
- 2026-05-05: CopilotKit Series A, $27M, led by Glilot Capital, NFX and SignalFire (TechCrunch) [G56].
- 2026-06-25: Vercel AI SDK 7.0.0 [G25].
- 2026-07-02: issue #2105 asks how the reserved `resumable` transport should work; still open [G33].
- 2026-07-19: PR #2210, OpenAI Agents SDK integration; still open [G32].
- **2026-09-02**: 1.0 draft published at `/spec/draft` for public comment (Discussion #2608) [G27].
- 2026-09-09 → 09-14: after review comments from Pydantic AI and an Anthropic engineer, the spec adds
  consumer-side resume enforcement, token-usage accounting, `ContentPart[]` tool results, the `cancelled`
  outcome, `pendingToolCallIds`, and the `file` source [G27][G28].
- 2026-09-09: `ag-ui-langgraph` 0.0.45 populates `RUN_FINISHED.usage`/`RUN_ERROR.usage` [G24].
- **2026-09-17**: 1.0.0 published for TS, Python and .NET. `DEPRECATIONS.md` sets every shim to expire
  2027-09-17 [G23][G25][G26].
- 2026-09-18: maintainer post "AG-UI 1.0 is officially released and frozen", crediting "people building on
  AG-UI at Anthropic, Google, Microsoft, Pydantic, and TanStack" [G28].
- 2026-09-23: `ag_ui_strands` 0.4.1 adopts the 1.0 part renames; it "drop[s] file sources with a warning"
  and flattens tool-result content to text (breaking) [G24].
- 2026-09-29: TS packages 1.0.1 (the `connectAgent` interrupt-reload fix) [G24].
- 2026-09-30: `@ag-ui/mastra` 1.1.5 (native tool approvals → interrupts, `MASTRA_INVALID_TOOL_APPROVAL`,
  "cancellation settles without `RUN_ERROR`"). The same day: the CopilotKit 1.0 blog post and
  `@copilotkit/*` 1.75.2 [G24][G25][G29].
- No HN story about the 1.0 release was found (Algolia search, 2026-06-01→09-30). The OpenBot Show HN on
  2026-08-19 got 12 points and 1 comment [G61].

## Mechanics (gap-fill only; the core mechanics are in spec.md/practice.md)

### Event envelope and identifiers [G1]
- `BaseEvent`: `type` (REQUIRED), `timestamp` (OPTIONAL, ms since epoch by convention; "a consumer MUST NOT
  use it to order events — arrival order is the protocol's order"), `rawEvent` (the consumer "MUST NOT derive
  protocol behaviour from it"), `metadata`. `subagentRunId` is optional on "attributable" events.
  `RUN_STARTED`, `RUN_FINISHED`, `RUN_ERROR` and `MESSAGES_SNAPSHOT` carry no attribution.
- `runId` "MUST NOT be reused for another run on the same thread". `messageId` crosses run boundaries and so
  "MUST be unique within its thread". All ids are opaque; the consumer "MUST NOT parse structure out of them".
- "Absent means absent": an optional field with no value MUST be omitted, not sent as `null`. But a
  `null` *inside* an open object (metadata value, something inside `state`) is data and MUST be preserved.

### `TEXT_MESSAGE_START` details [G3]
- `role` is optional, `TextMessageRole` enum `developer|system|assistant|user`, schema `default: "assistant"`,
  and there is an optional `name`. Full `Role` enum for messages: `developer, system, assistant, user, tool,
  activity, reasoning` (7 roles).
- `Tool` = `{name, description (required), parameters?, metadata?}`. `Context` = `{description, value}`.
  `ResumeEntry` = `{interruptId, status: "resolved"|"cancelled", payload?, metadata?}`.
- `ToolMessage` has `error?` and `encryptedValue?` (for provider reasoning tied to a tool call); `content` is
  `string | ContentPart[]`.

### Token usage — VERBATIM example [G29]
```json
{
  "type": "RUN_FINISHED",
  "threadId": "t1",
  "runId": "r1",
  "usage": [
    { "model": "gpt-5.5", "inputTokens": 1200, "outputTokens": 340, "cachedInputTokens": 800 }
  ]
}
```
Rules [G4]: `totalTokens = inputTokens + outputTokens`. Absent ≠ zero ("A producer MUST NOT emit a zero for a
count it has no data for"). Schema bounds counts at 2^53−1, and `ag-ui-langgraph` 0.0.45 caps at
`Number.MAX_SAFE_INTEGER` "to match the TypeScript protobuf decoder" [G3][G24]. `TokenUsage` fields:
`provider, model, inputTokens, outputTokens, cachedInputTokens, cacheWriteInputTokens, reasoningTokens,
totalTokens`, and no identifiers or content [G3].

### Metadata on the wire — VERBATIM (Python producer, TS consumer) [G29]
```python
TextMessageEndEvent(
    message_id="msg-1",
    metadata={"acme.model": "gpt-5.5", "acme.trace_id": "tr_8f2a"},
)
```
```typescript
agent.messages.at(-1)?.metadata;
// { "acme.model": "gpt-5.5", "acme.trace_id": "tr_8f2a" }
```
Note: in 1.0 "Custom fields you read off events are gone. Use `metadata` instead" [G29]. Issue #2144
("AG-UI protocol should be extensible", 2026-07-09) asks for passthrough instead of stripping unknown fields
[G35]. The spec answer is: strip with a warning; `metadata` is the channel [G6].

### Multimodal tool result — VERBATIM [G29]
```json
{
  "type": "TOOL_CALL_RESULT",
  "messageId": "msg-2",
  "toolCallId": "call-1",
  "content": [
    { "type": "text", "text": "Here is your invoice." },
    { "type": "document", "source": { "type": "url", "value": "https://example.com/invoice.pdf", "mimeType": "application/pdf" } }
  ]
}
```
A producer whose model can't take a part "drops the part and continues … a result whose every part was
dropped is answered with the empty string" [G12]. `FileSource` = `{type:"file", value, provider?, mimeType?}`
[G3]. **Integration reality:** `ag-ui-langgraph` says "Provider file handles remain unsupported and are
skipped with a warning", and `ag_ui_strands` 0.4.1 drops file sources and flattens tool results to text
[G38][G24].

### Subagent attribution — VERBATIM [G29]
```json
{ "type": "SUBAGENT_STARTED", "subagentRunId": "sub-1", "name": "flight-search" }
{ "type": "TEXT_MESSAGE_CONTENT", "messageId": "msg-1", "subagentRunId": "sub-1", "delta": "Found 3 flights..." }
{ "type": "SUBAGENT_FINISHED", "subagentRunId": "sub-1" }
```
Client-side reality: assistant-ui nests subagent output under the spawning tool call (joined on
`SUBAGENT_STARTED.parentToolCallId`). Two documented limitations: "Nested structure does not survive a
reload" and "Nested human-in-the-loop is not wired up" (a `suspended` subagent has "no resume path") [G42].

### Versioning / downgrade rules [G6]
- Downgrades must be pure transformations: they "MUST NOT change the run's outcome, alter identifiers, or
  reorder events". A **lossless** downgrade (e.g. stripping `subagentRunId`) MAY be silent. A **lossy** one
  (dropping a lifecycle event or a content part) MUST warn, and warnings MUST NOT be silenced by default.
- "A producer MUST NOT place in an addition alone anything the protocol already has a described place for":
  outcome, message content, tool identity and result must travel in the schema-described fields.
- The TS shims (`DEPRECATIONS.md`): the always-on `CompatibilityBoundary` plus version-gated
  `BackwardCompatibility_0_0_39` (rewrites outgoing input), `_0_0_45` (maps returned `THINKING_*` →
  `REASONING_*`) and `_0_0_57` (drops `SUBAGENT_*`, strips `subagentRunId`). Env var
  `SUPPRESS_TRANSFORMATION_WARNINGS=true` "silences the warnings, not the conversions" [G23].

### Interrupt/resume in real integrations (VERBATIM mappings)
- **LangGraph** [G38]: `resume[]` is converted into one `Command(resume=...)`. Single resolved →
  `interrupt()` returns the payload verbatim. Single cancelled → sentinel
  `{"__agui_cancelled__": true, "interrupt_id": "..."}`. Multiple →
  `{"__agui_resume_map__": { interruptId: {status, payload}, ... }}`. If both `input.resume` and
  `forwarded_props["command"]["resume"]` are sent, `input.resume` wins with a warning.
  Opt-in: `LangGraphAgent(name="my-agent", graph=graph, emit_interrupt_outcome=True)`. LangGraph-specific data
  goes under `metadata["langgraph"]`.
- **LangGraph run errors** [G38]: producer failures are yielded as a terminal `RUN_ERROR` "followed by stream
  completion without `RUN_FINISHED`". TS clients should handle them in `onRunErrorEvent`; "These producer
  failures no longer reject the `runAgent()` promise".
- **Pydantic AI** [G36] (VERBATIM code):
```python
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import Response
from starlette.routing import Route

from pydantic_ai import Agent
from pydantic_ai.tools import DeferredToolRequests
from pydantic_ai.ui.ag_ui import AGUIAdapter

agent = Agent('openai:gpt-5.2', output_type=[str, DeferredToolRequests])


@agent.tool_plain(requires_approval=True)
def delete_file(path: str) -> str:
    """Delete a file. Pauses on a `RUN_FINISHED` interrupt outcome until the user approves."""
    return f'deleted {path}'


async def run_agent(request: Request) -> Response:
    return await AGUIAdapter.dispatch_request(request, agent=agent)


app = Starlette(routes=[Route('/', run_agent, methods=['POST'])])
```
  Payload `{ "approved": bool, "editedArgs"?: object, "reason"?: string }`. `editedArgs` →
  `ToolApproved.override_args` (full replace). `status="cancelled"` → `ToolDenied("Cancelled by user.")`.
  "On older installs the adapter silently falls back to emitting a bare `RUN_FINISHED` … and `resume[]` is
  ignored." A client disconnect is an *external* cancellation, so `on_cancel` does not fire; use a separate
  cancel endpoint with a `CancellationToken` [G36].
- **Mastra** 1.1.5 [G24]: reason `mastra:tool_approval`. "`RunAgentInput.resume` now takes precedence over
  the deprecated `forwardedProps.command`". "Resume is decided by the entry's status, not the payload."

### Google ADK bridge — VERBATIM excerpt [G39] (the README code omits a comma after `instruction=...`; copied as-is)
```python
from fastapi import FastAPI
from ag_ui_adk import ADKAgent, add_adk_fastapi_endpoint
from google.adk.agents import Agent

# 1. Create your ADK agent
my_agent = Agent(
    name="assistant",
    instruction="You are a helpful assistant."
    tools=[
        AGUIToolset(), # Add the tools provided by the AG-UI client
    ]
)

# 2. Create the middleware with direct agent embedding
agent = ADKAgent(
    adk_agent=my_agent,
    app_name="my_app",
    user_id="user123"
)

# 3. Create FastAPI app
app = FastAPI()
add_adk_fastapi_endpoint(
    app, agent, path="/chat",
    extract_headers=["x-user-id", "x-tenant-id"]  # Extract HTTP headers into state.headers
)
```
Known production bug (open, 2026-09-02, #2603): ADK middleware "re-executes already-answered messages when
run with >1 replica (processed-message ledger is process-local)" [G34].

### LangGraph deep agent → AG-UI (LangChain's own docs) — VERBATIM [G46]
```ts
import { LangGraphAgent } from "@ag-ui/langgraph";

const agent = new LangGraphAgent({
  graphId: "deep_agent",
  deploymentUrl: "http://localhost:2024",
});
```
LangChain's docs name four protocols side by side: AG-UI (frontend), ACP (Agent Client Protocol, editors and
IDEs), MCP (tools) and A2A (agents) [G46]. ACP is a fourth "agent ↔ X" protocol the triangle framing leaves
out.

### Minimal Python server + client, tested on `ag-ui-protocol==1.0.0` (COMPOSED, run locally 2026-09-30) [G62]
In 1.0 the Python models default `type`, so `RunStartedEvent(thread_id=..., run_id=...)` works without
`type=EventType.RUN_STARTED`. The quickstart's explicit `type=` still works. Note that the quickstart's model
is still `gpt-4o` [G24-quickstart in spec.md].
```python
# server.py — COMPOSED, tested (fastapi 0.142.2, pydantic 2.13.5, ag-ui-protocol 1.0.0)
import asyncio, uuid
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from ag_ui.core import (RunAgentInput, RunStartedEvent, RunFinishedEvent, RunErrorEvent,
    TextMessageStartEvent, TextMessageContentEvent, TextMessageEndEvent,
    ToolCallStartEvent, ToolCallArgsEvent, ToolCallEndEvent, StateSnapshotEvent, StateDeltaEvent)
from ag_ui.encoder import EventEncoder

app = FastAPI()

@app.post("/agent")
async def run(input: RunAgentInput):
    enc = EventEncoder()
    async def events():
        yield enc.encode(RunStartedEvent(thread_id=input.thread_id, run_id=input.run_id, protocol_version="1.0"))
        try:
            yield enc.encode(StateSnapshotEvent(snapshot={"steps": []}))
            yield enc.encode(StateDeltaEvent(delta=[{"op": "add", "path": "/steps/-", "value": "thinking"}]))
            mid = str(uuid.uuid4())
            yield enc.encode(TextMessageStartEvent(message_id=mid, role="assistant"))
            for word in ["Hello", ", ", "world"]:
                await asyncio.sleep(0.05)
                yield enc.encode(TextMessageContentEvent(message_id=mid, delta=word))
            yield enc.encode(TextMessageEndEvent(message_id=mid))
            if input.tools:  # propose a call to a frontend tool; never answer it ourselves
                tc = str(uuid.uuid4())
                yield enc.encode(ToolCallStartEvent(tool_call_id=tc, tool_call_name=input.tools[0].name, parent_message_id=mid))
                yield enc.encode(ToolCallArgsEvent(tool_call_id=tc, delta='{"color": "blue"}'))
                yield enc.encode(ToolCallEndEvent(tool_call_id=tc))
                yield enc.encode(RunFinishedEvent(thread_id=input.thread_id, run_id=input.run_id,
                                                  outcome={"type": "success", "pendingToolCallIds": [tc]}))
            else:
                yield enc.encode(RunFinishedEvent(thread_id=input.thread_id, run_id=input.run_id))
        except Exception as e:
            yield enc.encode(RunErrorEvent(message=str(e)))
    return StreamingResponse(events(), media_type=enc.get_content_type())
```
```python
# client.py — COMPOSED, tested (httpx + jsonpatch); Python SDK has no client class
import asyncio, uuid, httpx, jsonpatch
from pydantic import TypeAdapter
from ag_ui.core import Event, EventType, RunAgentInput, UserMessage, Tool

EVENT = TypeAdapter(Event)  # discriminated union on "type"

async def run_once(url: str, text: str) -> None:
    body = RunAgentInput(thread_id="t-1", run_id=str(uuid.uuid4()), protocol_version="1.0",
        messages=[UserMessage(id="u-1", role="user", content=text)],
        tools=[Tool(name="change_background", description="Set page background",
                    parameters={"type": "object", "properties": {"color": {"type": "string"}}})])
    state, buf = {}, {}
    async with httpx.AsyncClient(timeout=None) as http:
        async with http.stream("POST", url,
                headers={"Accept": "text/event-stream", "Content-Type": "application/json"},
                content=body.model_dump_json(by_alias=True, exclude_none=True)) as r:
            r.raise_for_status()
            async for line in r.aiter_lines():
                if not line.startswith("data:"):
                    continue  # blank separators, comments, keep-alives
                ev = EVENT.validate_json(line[5:].strip())
                if ev.type == EventType.TEXT_MESSAGE_CONTENT: print(ev.delta, end="", flush=True)
                elif ev.type == EventType.TEXT_MESSAGE_END: print()
                elif ev.type == EventType.STATE_SNAPSHOT: state = ev.snapshot
                elif ev.type == EventType.STATE_DELTA:  # 1.0: patch ops are typed objects, not dicts
                    state = jsonpatch.apply_patch(state, [op.model_dump(by_alias=True, exclude_none=True) for op in ev.delta])
                elif ev.type == EventType.TOOL_CALL_START: buf[ev.tool_call_id] = ""
                elif ev.type == EventType.TOOL_CALL_ARGS: buf[ev.tool_call_id] += ev.delta
                elif ev.type == EventType.TOOL_CALL_END: print("tool call ready:", ev.tool_call_id, buf[ev.tool_call_id])
                elif ev.type == EventType.RUN_FINISHED: print("finished:", ev.outcome, "state:", state)
                elif ev.type == EventType.RUN_ERROR: raise RuntimeError(ev.message)

asyncio.run(run_once("http://127.0.0.1:8765/agent", "hi"))
```
Observed output (VERBATIM, [G62]):
```
Hello, world
tool call ready: e264c1d9-77b8-4ce3-9cda-e5e7a8fbd4a1 {"color": "blue"}
finished: type='success' pending_tool_call_ids=['e264c1d9-77b8-4ce3-9cda-e5e7a8fbd4a1'] state: {'steps': ['thinking']}
```
Observed wire (VERBATIM, raw `curl`, no tools, [G62]). `EventEncoder` omits absent fields, and there is no
`null`:
```
data: {"type":"RUN_STARTED","threadId":"t-1","runId":"r-1","protocolVersion":"1.0"}

data: {"type":"STATE_SNAPSHOT","snapshot":{"steps":[]}}

data: {"type":"STATE_DELTA","delta":[{"op":"add","path":"/steps/-","value":"thinking"}]}

data: {"type":"TEXT_MESSAGE_START","messageId":"4e97710d-e013-4cb6-894e-45bc54a1d5af","role":"assistant"}

data: {"type":"TEXT_MESSAGE_CONTENT","messageId":"4e97710d-e013-4cb6-894e-45bc54a1d5af","delta":"Hello"}
...
data: {"type":"RUN_FINISHED","threadId":"t-1","runId":"r-1"}
```
Gotchas found while testing: (1) omitting `Content-Type: application/json` in httpx's `content=` → FastAPI
returns 422. (2) A 1.0 `STATE_DELTA.delta` in Python is a list of typed op models, not dicts ("`patch["path"]`
becomes `patch.path`" [G29]). (3) The client must ignore non-`data:` lines.

### TS client: `HttpAgent` (VERBATIM from SDK docs) [G19]
```typescript
const agent = new HttpAgent({
  url: "https://api.example.com/v1/agent",
  headers: {
    Authorization: "Bearer your-api-key",
  },
})
```
`abortRun()` "Cancels the current HTTP request using the AbortController". By the spec this is a
**truncation**, not a cancelled outcome [G9]. `connectAgent()`: "Establishes a persistent connection with an
agent that implements the `connect()` method … Default implementation throws `ConnectNotImplementedError`".
Middleware added with `agent.use()` is **not** applied on `connectAgent()` [G19]. So auth belongs in HTTP
headers (`HttpAgent.headers` / `requestInit()`); the `forwardedProps` AuthMiddleware in `practice.md` is only
a docs example of the middleware API.

### Streaming UX: how CopilotKit v2 maps events to render states — VERBATIM [G53]
`render` receives `{ status: "inProgress", parameters: Partial<T>, result: undefined }` |
`{ status: "executing", parameters: T, result: undefined }` | `{ status: "complete", parameters: T, result: string }`.
The mapping is COMPOSED (my reading, consistent with [G12]): `TOOL_CALL_ARGS` → `inProgress` (partial args
shown as a preview only; the spec forbids *acting* on args before `TOOL_CALL_END`) → `TOOL_CALL_END` →
`executing` → `TOOL_CALL_RESULT` → `complete`.
Current CopilotKit v2 shared-state code (VERBATIM) [G52]:
```tsx
import { useAgent } from "@copilotkit/react-core/v2";

function TaskBoard() {
  const { agent } = useAgent();
  const tasks = (agent.state.tasks as any[]) ?? [];
  ...
}
```
```tsx
useFrontendTool({
  name: "sayHello",
  description: "Say hello to the user",
  parameters: z.object({
    name: z.string().describe("The name of the user to say hello to"),
  }),
  handler: async ({ name }) => {
    alert(`Hello, ${name}!`);
    return `Said hello to ${name}!`;
  },
});
```

### Alternatives: wire-level comparison (verbatim wire lines)
**Vercel AI SDK UI Message Stream** (`content/docs/04-ai-sdk-ui/50-stream-protocol.mdx`, last commit
2026-09-29) [G43]. Header: "you need to set the `x-vercel-ai-ui-message-stream` header to `v1`". VERBATIM parts:
```
data: {"type":"start","messageId":"..."}
data: {"type":"text-start","id":"msg_68679a454370819ca74c8eb3d04379630dd1afb72306ca5d"}
data: {"type":"text-delta","id":"msg_68679a454370819ca74c8eb3d04379630dd1afb72306ca5d","delta":"Hello"}
data: {"type":"text-end","id":"msg_68679a454370819ca74c8eb3d04379630dd1afb72306ca5d"}
data: {"type":"reasoning-start","id":"reasoning_123"}
data: {"type":"tool-input-start","toolCallId":"call_fJdQDqnXeGxTmr4E3YPSR7Ar","toolName":"getWeatherInformation"}
data: {"type":"tool-input-delta","toolCallId":"call_fJdQDqnXeGxTmr4E3YPSR7Ar","inputTextDelta":"San Francisco"}
data: {"type":"tool-input-available","toolCallId":"call_fJdQDqnXeGxTmr4E3YPSR7Ar","toolName":"getWeatherInformation","input":{"city":"San Francisco"}}
data: {"type":"tool-approval-request","toolCallId":"call_fJdQDqnXeGxTmr4E3YPSR7Ar","approvalId":"approval_123","approvalDescriptor":{"scope":"account:delete"},"reason":"Requires operator review"}
data: {"type":"tool-approval-response","approvalId":"approval_123","approved":false,"reason":"User denied the request"}
data: {"type":"tool-output-available","toolCallId":"call_fJdQDqnXeGxTmr4E3YPSR7Ar","output":{"city":"San Francisco","weather":"sunny"}}
data: {"type":"data-weather","data":{"location":"SF","temperature":100}}
data: {"type":"start-step"}
data: {"type":"finish-step"}
data: {"type":"finish"}
data: {"type":"abort","reason":"user cancelled"}
data: [DONE]
```
Also `reasoning-file`, `source-url`, `source-document`, `file`, `custom`, `error`, `tool-output-denied` and
`reset-step` [G43]. Differences from AG-UI (COMPOSED comparison, each point sourced):
- Vercel has an in-stream `tool-approval-response` part and a `[DONE]` sentinel. AG-UI ends at the terminal
  event, and approvals cross a run boundary [G7][G43].
- Vercel has no shared-state snapshot/delta; it has typed `data-*` parts instead. Its stream resumption is
  first-class (`resume` in `useChat`, the `resumable-stream` package, Redis) [G44].
- The spec'd scope differs. AG-UI has 8 families, normative sequencing, and versioning/downgrade rules. The
  Vercel page is a list of part types with examples [G2][G43].
- Pydantic AI implements both protocols (`AGUIAdapter` and `VercelAIAdapter`) as subclasses of one `UIAdapter`
  [G37].

**OpenAI ChatKit** (from `openai/chatkit-python` `chatkit/types.py`) [G49]. It is a thread/item protocol
where the server owns persistence. Request ops include `threads.create`, `threads.add_user_message`,
`threads.add_client_tool_output`, `threads.add_structured_input`, `threads.custom_action`,
`threads.retry_after_item`, `threads.update` and `threads.delete`. Stream events: `ThreadStreamEvent` =
`thread.created | thread.updated | thread.item.added | thread.item.updated | thread.item.done |
thread.item.removed | thread.item.replaced | StreamOptionsEvent | ProgressUpdateEvent | ClientEffectEvent |
ErrorEvent | NoticeEvent`. Compared with AG-UI's run/message/tool-call event model, ChatKit is item-CRUD
over a server-side store. `openai-chatkit` 1.6.5 dates from 2026-05-19, so the Python SDK has not been
released for over four months [G26][G49].

**LangGraph native** [G45][G47]. `stream_mode` in `updates | values | messages | custom | checkpoints |
tasks | debug`. Since v1.2 the recommendation is "event streaming", VERBATIM:
```py
stream = graph.stream_events({
    "messages": [{"role": "user", "content": "What is 42 * 17?"}],
}, version="v3")

for message in stream.messages:
    for token in message.text:
        print(token, end="", flush=True)

final_state = stream.output
```
The frontend uses `useStream` from `@langchain/react` (or the Vue, Svelte and Angular equivalents
`injectStream`), with join/rejoin, time travel, branching chat and interrupts [G47]. It is framework-locked
but richer on durable threads. For crossing frameworks, LangChain's own docs point to AG-UI via
`@ag-ui/langgraph` [G46].

**assistant-ui** is a React UI kit, not a protocol. `@assistant-ui/react-ag-ui` ("AG-UI protocol adapter
for assistant-ui", first published 2025-11-19) wraps an `@ag-ui/client` agent with `useAgUiRuntime({ agent })`
[G42]. It has sibling adapters `react-a2a` (for "the A2A v1.0 protocol"), `react-langgraph`, `react-ai-sdk`
and `react-google-adk`. So assistant-ui is protocol-agnostic, and AG-UI is one of its runtimes [G42].

## Numbers

| Series | Value | Conditions | Source |
|---|---|---|---|
| npm downloads, last 30 days (2026-08-30 → 2026-09-28) | `@modelcontextprotocol/sdk` 220,023,109; `ai` 100,538,582; `@ai-sdk/react` 33,312,593; `@langchain/langgraph-sdk` 14,648,129; `@a2a-js/sdk` 11,241,581; `@ag-ui/core` 8,222,341; `@assistant-ui/react` 7,044,337; `@ag-ui/proto` 5,409,138; `@ag-ui/encoder` 5,405,479; `@ag-ui/client` 5,342,880; `@copilotkit/react-core` 1,804,534; `@copilotkit/runtime` 1,482,564; `@assistant-ui/react-ag-ui` 279,072; `@langchain/react` 272,534; `@openai/chatkit-react` 272,254 | npm point API, includes CI/transitive | [G57] |
| PyPI downloads, last month (pypistats "recent", queried 2026-09-30) | `ag-ui-protocol` 6,788,299; `ag-ui-langgraph` 456,310; `agent-framework-ag-ui` 242,872; `ag-ui-adk` 171,847; `ag-ui-strands` 112,360; `ag-ui-crewai` 10,756 | includes mirrors/CI; `ag-ui-protocol` is pulled transitively by framework extras | [G58] |
| Event types over time | 16 (June 2025, CopilotKit) → 31 (1.0, Sept 2026) | vendor post vs normative spec | [G30][G1] |
| Protobuf coverage | 19 of 36 event/message types have a protobuf mapping (the page's own count) | concepts/subagents, informative | [G14] |
| GitHub release trains | 40 `release/YYYY-MM-DD` tags between 2026-05-27 and 2026-09-30 | GitHub releases API | [G24] |
| Deprecation shims | 22 rows in `DEPRECATIONS.md`, all expiring 2027-09-17 | counted on main | [G23] |
| Integration lag | 2 of 9 Python bridges checked pin below 1.0 (`pydantic-ai-slim` `<1`, `agent-framework-ag-ui` `<0.2`); the other 7 use open lower bounds (`>=0.1.15`…`>=0.1.22`) | PyPI `requires_dist`, 2026-09-30 | [G26] |
| HN attention for 1.0 | 0 stories found for "AG-UI 1.0" (Algolia, since 2026-06-01) | keyword search | [G61] |
| Funding | $27M Series A (Glilot Capital, NFX, SignalFire) | TechCrunch 2026-05-05 | [G56] |

## Pitfalls, limits, criticism (new ones only)

- **The docs contradict the spec in at least five places.** `concepts/architecture` lists WebSockets and
  webhooks. `/introduction` lists .NET as community. `concepts/interrupts` states producer-side `RunError`
  rules. `drafts/overview` still lists Reasoning and Interrupts as *drafts*. `development/updates` stops at
  2025-04-09 [G13][G15][G16][G17][G18]. Rule for the chapter: cite `/spec/1.0/*` and `schema.json`, not
  `/concepts/*`.
- **LangGraph's default bridge reports interrupted runs as success** (plain `RUN_FINISHED`), which violates
  a 1.0 MUST. The reason is backward compatibility with CopilotKit's `useLangGraphInterrupt` [G38][G7].
- **Python ecosystem pinning**: Pydantic AI and MAF cannot install `ag-ui-protocol` 1.0 today. Mixed venvs
  (e.g. Pydantic AI plus a 1.0-requiring bridge) will fail to resolve [G26].
- **No Python protobuf, no Python client.** Python teams write their own SSE client (see the tested sample)
  [G21][G62].
- **Truncation vs cancel**: `HttpAgent.abortRun()` and a closed tab are truncations, and Pydantic AI treats a
  disconnect as external cancellation. To get a proper `cancelled` outcome you need a separate cancel channel
  (an endpoint plus a token) [G19][G36][G9].
- **Multi-replica deployments**: bridges keep per-process ledgers (ADK #2603). Since `RunAgentInput.messages`
  is the full history, a stateless bridge is the safe design; the spec explicitly allows stateless resume
  handling [G34][G7].
- **Client-controlled history**: because `messages` and `state` round-trip through the client ("Data flows
  both ways"), a client can forge prior assistant, tool or approval messages. Pydantic AI: "Validating it
  proves shape, not identity: who the user is, what tenant they're in, and what they're allowed to do come
  from authenticated server state" [G11][G36]. Cross-link ch.16.
- **Middleware is skipped on reconnect**: `connectAgent()` "currently calls `connect()` directly and does not
  run middleware", so logging or auth middleware silently misses reconnects [G19].
- **Reconnect is a paid feature in the reference stack**: in CopilotKit's own OSS-vs-Intelligence table,
  "AG-UI Streams with saved UI, resumable runs, and realtime sync" require Intelligence [G54]. The
  protocol's `resumable` flag is undefined (#2105) [G33].
- **FileSource is not portable yet**: LangGraph skips provider file handles, and Strands drops them [G38][G24].
- **.NET**: the `AsChatMessages` bug "throws Unknown chat role: reasoning" is open (#2290, 2026-07-31), and a
  continuation-run `TOOL_CALL_*` drop bug was closed 2026-08-10 (#2359) [G24-issues].

## What changed in the last 6 months (items none of the three notes had)

- Token usage accounting (`usage` on `RUN_FINISHED`/`RUN_ERROR`) [G4][G5].
- The public draft→freeze governance process (draft 09-02 → frozen 09-17/18). External reviewers were named
  (Anthropic, Google, Microsoft, Pydantic, TanStack), and the spec promises: "Drafts before changes" [G27][G28].
- The 1.0 normative spec moved resume enforcement to the consumer [G7][G27].
- Interrupts were already in the core SDKs in April 2026 (PR #1569), i.e. before 1.0 [G31].
- `@ag-ui/client` 1.0.1 fixed reconnect with pending interrupts [G24].
- Mastra native tool-approval interrupts (2026-09-30), Strands 1.0 part renames with file-source drops
  (2026-09-23), LangGraph token usage (2026-09-09) [G24].
- OpenAI's "Apps SDK" docs became "Plugins", and ChatGPT implements the MCP Apps standard; this is relevant
  to how generative UI rides alongside AG-UI (ch.09) [G48].
- LangGraph 1.2 "event streaming" (`stream_events(..., version="v3")`) is the recommended in-process API;
  LangChain added a Deep Agents → AG-UI guide [G45][G46].
- Vercel AI SDK v7 (2026-06-25); AG-UI's `vercel-ai-sdk` bridge rewrite for v7 is still an open PR (#1626)
  [G25][G24-issues].

## Diagram candidates

1. **Three ways a run ends plus truncation**: a state machine `Active → Closed{success | success+pendingToolCallIds | interrupt | cancelled}`, `Active → Failed(RUN_ERROR)`, `Closed → Failed (late RUN_ERROR)`, and a dashed "connection dropped → Truncated (no outcome, never synthesize)". Label what the next run carries: nothing / tool messages in `messages` / `resume[]` / nothing [G4][G7][G9][G12].
2. **Draft → freeze → shims timeline**: 2026-04-30 interrupts in core → 09-02 draft → 09-09..14 review changes → 09-17 1.0.0 (TS/Py/.NET) → 09-18 frozen → 09-29 TS 1.0.1 → 2027-09-17 shims expire [G23][G24][G27][G28][G31].
3. **Version negotiation handshake**: Consumer `RunAgentInput.protocolVersion="1.0"` → Producer `RUN_STARTED.protocolVersion="1.1"`, with branches: same major, newer minor → serve and warn; unknown major → reject before `RUN_STARTED`; absent → pre-versioning peer → optional downgrade (lossless silent / lossy warn) [G6].
4. **Where compatibility lives**: the TS client box containing `CompatibilityBoundary` + `BackwardCompatibility_0_0_39/45/57` sits between an old producer and new app code. The Python producer box has no shims. Annotate: an old client ← new producer is protected only by producer-side gating (LangGraph `subagent_visibility`) [G22][G23].
5. **Resume responsibility split**: Consumer (holds interrupts, validates coverage and expiry, builds `resume[]`) → Producer (stateless OK; unknown entry → warn and continue; known uncovered → reject or re-interrupt, never success) [G7].
6. **Token-usage accounting tree**: `inputTokens ⊇ {cachedInputTokens, cacheWriteInputTokens}`, `outputTokens ⊇ reasoningTokens`, `totalTokens = in + out`. Run boundary: subagent calls counted in, child `parentRunId` runs and resumed runs counted out [G4].
7. **Delta failure recovery**: `STATE_SNAPSHOT` → `STATE_DELTA` ok → `STATE_DELTA` fails (atomic rollback, warning, prior value kept) → divergence → producer re-sends `STATE_SNAPSHOT` [G8].
8. **Tool-call render lifecycle in the UI**: `TOOL_CALL_START/ARGS` → `inProgress (Partial<T>)`; `TOOL_CALL_END` → `executing`; `TOOL_CALL_RESULT` → `complete`. A red "no action before END" guard sits on the ARGS edge [G12][G53].
9. **Protocol landscape beyond the triangle**: an Agent node with four edges: AG-UI (app/user), MCP (tools; plus MCP Apps UI resources), A2A (agents), ACP (editors/IDEs). Middleware boxes `@ag-ui/a2a-middleware` and `@ag-ui/mcp-apps-middleware` let an AG-UI client front for A2A agents and MCP Apps [G25][G46][G50].
10. **Wire comparison lanes**: the same "text + tool call + approval" interaction drawn as AG-UI events vs Vercel UI message parts vs ChatKit thread-item events [G43][G49].
11. **Python-stack wiring**: FastAPI + `EventEncoder` (SSE only) → HTTP → a TS `HttpAgent` or Python httpx client; the protobuf branch exists only for TS/.NET producers [G21][G62].

Chart candidates (real data):
- Bar: npm 30-day downloads (values in Numbers) for MCP SDK, `ai`, `@a2a-js/sdk`, `@ag-ui/core`,
  `@copilotkit/react-core`, `@assistant-ui/react`, `@openai/chatkit-react`, `@langchain/react`. Caption: CI and
  transitive installs included [G57].
- Bar: PyPI monthly downloads for AG-UI bridges (Numbers) [G58].
- Step line: `@ag-ui/core` versions 0.0.50 (2026-04-03) … 0.0.59 (2026-08-27) → 1.0.0 (09-17) → 1.0.1 (09-29)
  from npm `time` [G25].

## Glossary

- **Truncated run**: a stream that ended without a terminal event. It has no outcome, and the consumer must not synthesize one.
- **Cancelled outcome**: `RUN_FINISHED{outcome:{type:"cancelled"}}`, a deliberate stop reported by the producer; it is not an error and not resumable.
- **`pendingToolCallIds`**: an optional list on the success outcome naming frontend tool calls the run left unanswered.
- **TokenUsage**: a per-provider/model usage entry on terminal events, with nested (non-additive) cache and reasoning counts.
- **Downgrade (lossless/lossy)**: translating a stream for an older peer; lossy ones must warn.
- **Retired shape**: a formerly specified shape that is translated by a shim until its expiry (2027-09-17 for all 1.0 shims).
- **CompatibilityBoundary**: the always-on TS client layer that upgrades legacy shapes inbound.
- **`protocolVersion`**: an in-band `MAJOR.MINOR` declaration on `RunAgentInput` and `RUN_STARTED`.
- **`connectAgent()`**: a TS client method for reconnecting to or restoring a thread through an agent's `connect()`; it bypasses middleware.
- **AG-UI Streams**: CopilotKit Intelligence's commercial persistence/reconnect layer (formerly "Rich Threads"); not part of the protocol.
- **UI Message Stream**: Vercel AI SDK's SSE part protocol (`x-vercel-ai-ui-message-stream: v1`).
- **ChatKit ThreadStreamEvent**: OpenAI ChatKit's item-oriented stream event union.
- **ACP (Agent Client Protocol)**: agent↔editor/IDE protocol, named by LangChain alongside AG-UI/MCP/A2A.

## Unverified / open questions

- The origin of "36 event types" in `concepts/subagents` is inferred (31 + 5 THINKING); no source states it.
  Tried: grepping the full docs export.
- The OpenAI 1024-character tool-description limit (from the generative-UI draft) was not re-verified; the
  WebSearch budget for this session was exhausted (tool returned "used its web search budget").
- Community SDK 1.0 parity (Go, Kotlin, Java, Ruby, Rust, Dart, C++) is unclear. A GitHub code search found
  `SUBAGENT_STARTED` in 2 Go files and none in Kotlin, Java or Ruby; the Rust and Dart searches hit the API
  rate limit. Indicative only; no community SDK has a published 1.0 conformance claim that I found.
- Whether the shared byte corpus for protobuf is run in CI by the .NET encoder was not checked.
- "Adopted by … Oracle": the only evidence is the "Oracle Agent Spec — Supported" row with a Dojo demo
  `agent-spec-langgraph` [G16]. Oracle's side was not checked.
- The "30 live integrations in the Dojo" claim [G29] was not counted.
- No security advisories were found on OSV for the checked packages [G59]; GitHub advisory search via
  `gh api` also returned nothing. The absence of an advisory is not an audit.
- Reddit and Habr were not re-tried (the other notes document the block); the HN check was keyword-only.

## Sources

All accessed 2026-09-30.

- [G1] "Base Protocol / The event model", AG-UI Spec 1.0, https://docs.ag-ui.com/spec/1.0/basic (via https://docs.ag-ui.com/llms-full.txt), frozen 2026-09-17.
- [G2] "Event Streams" index, AG-UI Spec 1.0, https://docs.ag-ui.com/spec/1.0/events, 2026-09-17.
- [G3] AG-UI 1.0 JSON Schema, https://docs.ag-ui.com/spec/1.0/schema.json ($id https://ag-ui.com/spec/1.0/schema.json), 2026-09-17.
- [G4] "Runs and Steps", AG-UI Spec 1.0, https://docs.ag-ui.com/spec/1.0/events/lifecycle, 2026-09-17.
- [G5] "Key Changes", AG-UI Spec 1.0, https://docs.ag-ui.com/spec/1.0/changelog, 2026-09-17.
- [G6] "Versioning and compatibility", AG-UI Spec 1.0, https://docs.ag-ui.com/spec/1.0/basic/versioning, 2026-09-17.
- [G7] "Interrupts and Resume", AG-UI Spec 1.0, https://docs.ag-ui.com/spec/1.0/basic/patterns/interrupt-resume, 2026-09-17.
- [G8] "Snapshots and Deltas", AG-UI Spec 1.0, https://docs.ag-ui.com/spec/1.0/basic/patterns/snapshots, 2026-09-17.
- [G9] "Transports", AG-UI Spec 1.0, https://docs.ag-ui.com/spec/1.0/basic/transports/index, 2026-09-17.
- [G10] "HTTP + Protobuf", AG-UI Spec 1.0, https://docs.ag-ui.com/spec/1.0/basic/transports/http-protobuf, 2026-09-17.
- [G11] "Specification" (Security and Trust & Safety; Scope), AG-UI Spec 1.0, https://docs.ag-ui.com/spec/1.0/index, 2026-09-17.
- [G12] "Tool Calls", AG-UI Spec 1.0, https://docs.ag-ui.com/spec/1.0/events/tool-calls, 2026-09-17.
- [G13] "Interrupts" (concepts, informative), https://docs.ag-ui.com/concepts/interrupts, undated (example dates April 2026).
- [G14] "Subagents" (concepts), https://docs.ag-ui.com/concepts/subagents, undated.
- [G15] "Architecture" (concepts), https://docs.ag-ui.com/concepts/architecture, undated.
- [G16] "AG-UI Overview" (introduction, integration tables), https://docs.ag-ui.com/introduction, undated.
- [G17] "Drafts overview", https://docs.ag-ui.com/drafts/overview, undated.
- [G18] "What's New", https://docs.ag-ui.com/development/updates, last entry 2025-04-09.
- [G19] JS SDK "AbstractAgent" and "HttpAgent" references, https://docs.ag-ui.com/sdk/js/client/abstract-agent, https://docs.ag-ui.com/sdk/js/client/http-agent, undated.
- [G20] Python SDK "Event Encoder", https://docs.ag-ui.com/sdk/python/encoder/overview, undated.
- [G21] `sdks/python/ag_ui/encoder/encoder.py`, ag-ui-protocol/ag-ui main, https://raw.githubusercontent.com/ag-ui-protocol/ag-ui/main/sdks/python/ag_ui/encoder/encoder.py.
- [G22] `sdks/python/ag_ui/core/events.py` and `_generated/models.py`, ag-ui-protocol/ag-ui main, https://github.com/ag-ui-protocol/ag-ui/tree/main/sdks/python/ag_ui.
- [G23] `DEPRECATIONS.md`, ag-ui-protocol/ag-ui main, https://raw.githubusercontent.com/ag-ui-protocol/ag-ui/main/DEPRECATIONS.md (states release 2026-09-17).
- [G24] GitHub releases `release/2026-09-08` … `release/2026-09-30`, repo metadata, contents listings and issues (#2290, #2359, #1626), https://github.com/ag-ui-protocol/ag-ui/releases, via `gh api`.
- [G25] npm registry metadata for `@ag-ui/*`, `@copilotkit/*`, `ai`, `@assistant-ui/*`, `@openai/chatkit-react`, `create-ag-ui-app`, https://registry.npmjs.org/.
- [G26] PyPI JSON for `ag-ui-protocol`, `ag-ui-langgraph`, `ag-ui-crewai`, `ag-ui-adk`, `ag-ui-strands`, `pydantic-ai-slim`, `agent-framework-ag-ui`, `llama-index-protocols-ag-ui`, `agno`, `copilotkit`, `openai-chatkit`, `langgraph`, `ag2`, https://pypi.org/pypi/<name>/json.
- [G27] GitHub Discussion #2608 "AG-UI is heading to 1.0 - the draft specification is live", mme, 2026-09-02 (comments 2026-09-09..14), https://github.com/ag-ui-protocol/ag-ui/discussions/2608.
- [G28] GitHub Discussion #2792 "AG-UI 1.0 is officially released", mme, 2026-09-18, https://github.com/ag-ui-protocol/ag-ui/discussions/2792.
- [G29] "Introducing AG-UI 1.0: a stable spec for connecting any agent to any application", Anmol Baranwal & Eli Berman, CopilotKit Blog, 2026-09-30, https://www.copilotkit.ai/blog/ag-ui-1.0.
- [G30] "Big Updates on AG-UI: Massive Traction and Adoption", Uli Barkai, CopilotKit Blog, 2025-06-02, https://www.copilotkit.ai/blog/big-updates-on-ag-ui.
- [G31] PR #1569 "feat: interrupt-aware run lifecycle in TS + Python core SDKs", created 2026-04-22, merged 2026-04-30, https://github.com/ag-ui-protocol/ag-ui/pull/1569.
- [G32] PR #2210 "OpenAI Agents SDK (Python) integration", open, 2026-07-19, https://github.com/ag-ui-protocol/ag-ui/pull/2210.
- [G33] Issue #2105 "Design: how should the reserved 'resumable' transport … work?", open, 2026-07-02, https://github.com/ag-ui-protocol/ag-ui/issues/2105.
- [G34] Issue #2603 "ADK middleware re-executes already-answered messages when run with >1 replica", open, 2026-09-02, https://github.com/ag-ui-protocol/ag-ui/issues/2603.
- [G35] Issue #2144 "AG-UI protocol should be extensible", open, 2026-07-09, https://github.com/ag-ui-protocol/ag-ui/issues/2144.
- [G36] Pydantic AI docs "Agent-User Interaction (AG-UI) Protocol", `docs/ui/ag-ui.md` on main (last commit 2026-09-28), https://github.com/pydantic/pydantic-ai/blob/main/docs/ui/ag-ui.md.
- [G37] Pydantic AI docs "UI Event Streams", `docs/ui/overview.md` on main, https://github.com/pydantic/pydantic-ai/blob/main/docs/ui/overview.md.
- [G38] `ag-ui-langgraph` README, `integrations/langgraph/python/README.md` on main, https://github.com/ag-ui-protocol/ag-ui/blob/main/integrations/langgraph/python/README.md.
- [G39] `ag_ui_adk` README, `integrations/adk-middleware/python/README.md` on main, https://github.com/ag-ui-protocol/ag-ui/blob/main/integrations/adk-middleware/python/README.md.
- [G40] "AG-UI Integration with Agent Framework", Microsoft Learn, ms.date 2026-09-08, updated 2026-09-15, https://learn.microsoft.com/en-us/agent-framework/integrations/ag-ui/.
- [G41] "AG-UI protocol contract", Amazon Bedrock AgentCore Developer Guide, undated, https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-agui-protocol-contract.html.
- [G42] `@assistant-ui/react-ag-ui` README (main) and npm metadata 0.0.62 (2026-09-24), https://github.com/assistant-ui/assistant-ui/tree/main/packages/react-ag-ui.
- [G43] Vercel AI SDK "Stream Protocols", `content/docs/04-ai-sdk-ui/50-stream-protocol.mdx` (last commit 2026-09-29), https://github.com/vercel/ai/blob/main/content/docs/04-ai-sdk-ui/50-stream-protocol.mdx.
- [G44] Vercel AI SDK "Chatbot Resume Streams", `03-chatbot-resume-streams.mdx` on main, https://github.com/vercel/ai/blob/main/content/docs/04-ai-sdk-ui/03-chatbot-resume-streams.mdx.
- [G45] LangGraph "Streaming" and "Event streaming", docs.langchain.com, undated, https://docs.langchain.com/oss/python/langgraph/streaming, https://docs.langchain.com/oss/python/langgraph/event-streaming.
- [G46] LangChain Deep Agents "Agent User Interaction Protocol (AG-UI)", undated, https://docs.langchain.com/oss/python/deepagents/ag-ui.
- [G47] LangChain "Frontend overview" (useStream), undated, https://docs.langchain.com/oss/python/langchain/frontend/overview.
- [G48] OpenAI "Add UI to your MCP server" (Plugins docs; /apps-sdk redirects to /plugins), undated, https://developers.openai.com/plugins/build/chatgpt-ui.md.
- [G49] `openai/chatkit-python` `chatkit/types.py` on main, https://github.com/openai/chatkit-python/blob/main/chatkit/types.py; PyPI `openai-chatkit` 1.6.5 (2026-05-19).
- [G50] "MCP Apps: Extending servers with interactive user interfaces" (SEP-1865), MCP Blog, 2025-11-21 (modified 2026-03-12), https://blog.modelcontextprotocol.io/posts/2025-11-21-mcp-apps/.
- [G51] CopilotKit docs "Which Hook for Which Job" (v2), undated, https://docs.copilotkit.ai/concepts/which-hook.
- [G52] CopilotKit docs "Shared State" and "Frontend Tools", undated, https://docs.copilotkit.ai/shared-state, https://docs.copilotkit.ai/frontend-tools.
- [G53] CopilotKit docs `useRenderTool` reference, undated, https://docs.copilotkit.ai/reference/hooks/useRenderTool.
- [G54] CopilotKit docs "AG-UI Streams" and "Open source vs Intelligence", undated, https://docs.copilotkit.ai/threads, https://docs.copilotkit.ai/concepts/oss-vs-enterprise.
- [G55] Same page as G54 ("16 standardized event types" line), https://docs.copilotkit.ai/concepts/oss-vs-enterprise.
- [G56] "CopilotKit raises $27M to help devs deploy app-native AI agents", TechCrunch, 2026-05-05, https://techcrunch.com/2026/05/05/copilotkit-raises-27m-to-help-devs-deploy-app-native-ai-agents/.
- [G57] npm downloads API, https://api.npmjs.org/downloads/point/last-month/<pkg> (window 2026-08-30 → 2026-09-28).
- [G58] pypistats API, https://pypistats.org/api/packages/<pkg>/recent.
- [G59] OSV.dev query API (npm and PyPI packages listed in the notes), https://api.osv.dev/v1/query.
- [G60] NuGet flat container for `AGUI.Abstractions`, `AGUI.Client`, `AGUI.Server`, https://api.nuget.org/v3-flatcontainer/<id>/index.json.
- [G61] Hacker News Algolia search API ("AG-UI", "CopilotKit", "OpenBot", since 2026-06-01), https://hn.algolia.com/api/v1/search.
- [G62] Local experiment by this researcher, 2026-09-30: `ag-ui-protocol` 1.0.0, fastapi 0.142.2, pydantic 2.13.5, httpx, jsonpatch; the server and client code shown above, run on macOS/Python 3.11.
- [G63] GitHub Discussions list (#2564 unresolved-client-tool outcome question, #2161 rewind/time-travel and reserved transport flags, #2225 typed interrupt contract), https://github.com/ag-ui-protocol/ag-ui/discussions.
- [G64] "AG-UI and Generative UI Specs", https://docs.ag-ui.com/concepts/generative-ui-specs, undated.
- [G65] `.claude-plugin/marketplace.json`, ag-ui-protocol/ag-ui main, https://github.com/ag-ui-protocol/ag-ui/blob/main/.claude-plugin/marketplace.json.
