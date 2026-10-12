# AG-UI: Agent-User Interaction Protocol — primary-source notes

## TL;DR (engineer must know today, 2026-09-30)

- AG-UI ("Agent-User Interaction Protocol") is an **open, event-based protocol** that standardizes how an agent backend streams a run — text, tool calls, state, reasoning — into a user-facing frontend, and how the frontend sends input back. It is not a generative-UI spec and not a transport itself; it is the event model + a request shape (`RunAgentInput`) + transport bindings. [S1]
- **1.0.0 shipped 2026-09-17**; **1.0.1** followed 2026-09-29 (i.e. yesterday relative to "today"). Before 1.0 the protocol was 0.0.x/0.1.x (TS/`@ag-ui/core` vs Python `ag-ui-protocol`) and had *no written behavioral spec* — behavior lived only in the TypeScript client. 1.0 is the first release with a normative, BCP-14 ("MUST/SHOULD") specification at `/spec/1.0`, with a JSON Schema as the structural source of truth. [S8][S11][S25][S26]
- The protocol triangle: **MCP** = agent↔tools/data, **A2A** = agent↔agent, **AG-UI** = agent↔user (through a user-facing app). AG-UI positions itself as the "kitchen sink" third leg, and has added handshakes to "front for" MCP- and A2A-based agents. [S21]
- Core event categories (1.0): Lifecycle (RUN/STEP), Text Messages, Tool Calls, State Management (snapshot+delta), Activity, Reasoning, Subagents, Special (Raw/Custom), plus the draft Meta events. `THINKING_*` events are **deprecated**, replaced by `REASONING_*` (shim expires 2027-09-17). [S2][S8][S28]
- **Only one request message exists**: `RunAgentInput`, POSTed once to open a run. Everything else flows agent→client as events. A resumed/replayed thread does NOT get new input for replayed runs — only the newly requested run gets a `RunAgentInput`. [S4][S7]
- **Standard transport is HTTP+SSE** (mandatory for any HTTP implementation); **HTTP+Protobuf** is an optional binary binding, negotiated via `Accept: application/vnd.ag-ui.event+proto`, using 4-byte length-prefixed frames generated from the same JSON Schema. **WebSockets are NOT a standard binding** — they're explicitly left as a "custom transport" that MUST still satisfy the binding contract (ordered delivery, one input then events, a clean/truncated termination signal). [S5][S6][S7]
- **State sync** = snapshot/delta pattern: `STATE_SNAPSHOT` (full replace) + `STATE_DELTA` (RFC 6902 JSON Patch). Same pattern reused for `MESSAGES_SNAPSHOT`, and — new in 1.0 — for `ACTIVITY_SNAPSHOT`/`ACTIVITY_DELTA` (structured progress messages, e.g. "PLAN", "SEARCH"). [S2][S13]
- **Human-in-the-loop went from ad hoc ("interrupt" custom events / LangGraph `command.resume`) to a first-class, terminal run lifecycle** in 1.0: a run that needs a human ends with `RUN_FINISHED { outcome: { type: "interrupt", interrupts: [...] } }`; the client answers by starting a **new run** whose `RunAgentInput.resume[]` addresses every open interrupt by `id`. This is a *different* mechanism from frontend tool calls (below). [S2][S8]
- **Frontend-defined tools** are declared by the app in `RunAgentInput.tools`, executed by the app (never the agent), and answered across a **run boundary**, not in-stream: the agent finishes the run (success outcome, optionally listing `pendingToolCallIds`), and the app's answer arrives as a tool message in the *next* run's `messages`. This is architecturally distinct from backend-executed tools (`TOOL_CALL_RESULT` in the same run) and from interrupts. [S10][S12]
- **Reasoning** events (`REASONING_START/END`, `REASONING_MESSAGE_START/CONTENT/END`, `REASONING_ENCRYPTED_VALUE`) support visible chain-of-thought summaries *and* opaque encrypted reasoning blobs the client stores/returns without reading — modeled directly on OpenAI's encrypted reasoning items (Responses API `store:false`/ZDR) and Gemini's "thought signatures". [S2]
- **Multimodality is 1.0's biggest content-model change**: `ContentPart` (renamed from `InputContent`) = `text | image | audio | video | document`, each media part has a `source` that is `data` (inline), `url` (fetchable), or **new: `file`** (an opaque provider-issued handle — OpenAI file id, Anthropic file id, Gemini file URI — that must never be treated as a URL). Tool *results* now accept the same `ContentPart[]` (not just strings), so a tool can return a document/image without base64-in-a-string hacks. [S4][S8][S10]
- **CopilotKit built AG-UI** (originally with LangChain/LangGraph and CrewAI as launch partners) and remains the reference 1st-party client/framework; the protocol itself is now governed independently with 1st-party integrations from Microsoft Agent Framework, Google ADK, AWS Strands/Bedrock AgentCore, Mastra, Pydantic AI, Agno, LlamaIndex, AG2, and community integrations for the Claude Agent SDK, Claude Managed Agents SDK, Langroid, Vercel AI SDK, watsonx, and more (all in the `ag-ui-protocol/ag-ui` monorepo `integrations/` directory). [S1][S29]
- Adjacent but distinct: **A2UI** (Google, JSONL-streaming declarative generative-UI), **Open-JSON-UI** (OpenAI), **MCP-UI/MCP Apps** (Microsoft+Shopify) are *generative UI specs* — they describe what widgets look like. AG-UI is the *transport/runtime* they can ride on top of; AG-UI "natively supports" all three plus custom generative-UI schemes. [S17]

## Current state and versions (as of 2026-09-30)

| Component | Current version | Released | Source |
|---|---|---|---|
| Protocol spec | **1.0** (behavioral spec at `/spec/1.0`) | 2026-09-17 | [S8][S28] |
| `@ag-ui/core` (npm, TS types/events) | **1.0.1** (`latest` dist-tag) | 2026-09-29 | [S25] |
| `ag-ui-protocol` (PyPI, Python SDK) | **1.0.0** | 2026-09-17 | [S26] |
| GitHub repo `ag-ui-protocol/ag-ui` | 16,131 stars, created 2025-05-07, pushed 2026-09-30 (active same-day) | — | [S27] |
| Public repos announced | 2025-04-09 ("AG-UI repositories are now public") | 2025-04-09 | [S23] |

Pre-1.0 version history (from PyPI/npm timestamps): Python SDK crawled 0.1.15 (2026-04-01) → 0.1.22 (2026-08-31) → 1.0.0 (2026-09-17). TS `@ag-ui/core` crawled 0.0.48 (2026-03-25) → 0.0.59 (2026-08-27) → 1.0.0 (2026-09-17) → 1.0.1 (2026-09-29). Note the version-scheme mismatch pre-1.0 (Python 0.1.x vs TS 0.0.x) — both synced to `1.0.0` on the same day, confirming a coordinated cross-SDK spec release. [S25][S26]

SDKs listed as "Supported" by the docs site today: **TypeScript** (`@ag-ui/core`, `@ag-ui/client`, `@ag-ui/encoder`, `@ag-ui/proto`), **Python** (`ag_ui.core`, `ag_ui.encoder`), **.NET** (`AGUI.Abstractions`, `AGUI.Client`, `AGUI.Server` / hosting), plus **community** SDKs: Kotlin, Go, Dart, Java, Rust, Ruby, C++. Nim, Flowise, Langflow are listed "In Progress". [S1]

Deprecation shims (all shipped in 1.0, all expire **2027-09-17**, 12 months post-release): the five `THINKING_*` events, `{type:"binary"}` content parts, several "whole-field-`null`-instead-of-absent" tolerances (`rawEvent`, `RUN_FINISHED.result`, `SUBAGENT_FINISHED.result`, resume `payload`, media-part `metadata`, tool `parameters`, `forwardedProps`), and the `InputContent*`/`SubAgentInfo` renamed-type aliases. [S28]

## Timeline

- **2025-04-09** — AG-UI repositories made public (initial release announcement on the docs "What's New" page — note this page has not been updated since, despite 1.5 years of subsequent releases; treat it as stale). [S23]
- **2025-05-07** — `ag-ui-protocol/ag-ui` GitHub repo created. [S27]
- **2026-03-25 → 2026-08-31** — pre-1.0 iteration: TS core crawls 0.0.48→0.0.59, Python crawls 0.1.15→0.1.22; this is the window in which reasoning events, activity events, capabilities, interrupts, subagents and multimodal content parts were incrementally introduced as 0.x features (the spec itself did not yet exist — these were TS-client behaviors). [S25][S26]
- **2026-09-16** — `1.0.0-canary`/`1.0.0.dev` pre-releases published for both npm and PyPI same day. [S25][S26]
- **2026-09-17** — **1.0.0 released** for both `@ag-ui/core` and `ag-ui-protocol`; the behavioral spec at `/spec/1.0` goes live; `DEPRECATIONS.md` published with all shims dated to expire 2027-09-17. [S8][S25][S26][S28]
- **2026-09-29** — `@ag-ui/core` **1.0.1** patch release (one day before this research). [S25]
- **2026-09-30** — GitHub repo shows a same-day push, i.e. actively maintained through "today". Automated `release/YYYY-MM-DD`-tagged GitHub releases appear at a cadence of roughly every 1–7 days throughout 2026 (these are CI release trains, not semver bumps — e.g. `release/2026-09-30`, `release/2026-09-29`, `release/2026-09-23` …). [S27]

Feature-level timeline reconstructed from the spec's own "Key Changes" retrospective (dates not individually given by the source, but ordered as pre-1.0 → 1.0): interrupt-aware run lifecycle, subagent attribution, reasoning-replaces-thinking, activity events, capabilities-in-schema, and the protobuf binary transport are all things the **Changelog explicitly says existed informally in "the 0.x line" before 1.0 formalized them** — e.g. "Every producer written before outcomes existed is already conformant," meaning interrupts were already shipping pre-1.0 as an evolving pattern that 1.0 merely specified. [S8]

## Mechanics

### Architecture and the request/response asymmetry

Exactly one message flows client→agent per exchange: `RunAgentInput`, sent once as an HTTP POST. Everything else — potentially hundreds of events — flows agent→client as a stream. A stream MAY replay a thread's earlier runs before the newly requested run (e.g. reconnect/history-restore), but those replayed runs get **no new input**; only the requested run corresponds to this `RunAgentInput`. [S4][S9]

`RunAgentInput` fields and their obligations (spec 1.0, normative): [S4]

| Field | Required? | Obligation |
|---|---|---|
| `threadId`, `runId` | REQUIRED | every run's `RUN_STARTED`/`RUN_FINISHED` boundary pair must carry the same `runId`; `threadId` names the conversation |
| `protocolVersion` | OPTIONAL | a 1.0-conformant sender MUST declare it unless it knows the peer predates the field |
| `messages` | REQUIRED | the **complete** history as the app sees it — no side channel exists for earlier turns; producer must skip content it can't use (e.g. image to a text-only model) rather than fail the run |
| `tools` | OPTIONAL | frontend-only tools; absent == empty; app executes, never the agent |
| `context` | OPTIONAL | description–value pairs injected into agent grounding |
| `state` | OPTIONAL | the state the run starts from; absent == `{}`; deltas emitted this run are computed against this value until the run's own first snapshot |
| `forwardedProps` | OPTIONAL | opaque app-specific pass-through, any JSON except a bare `null` |
| `resume` | OPTIONAL | interrupt-resume answers (see below) |

An input a producer cannot parse is rejected **before `RUN_STARTED`** via the transport's error path (e.g. HTTP 4xx) — there is no stream and hence no `RUN_ERROR` for it. Unrecognized fields, by contrast, are *not* malformed: 1.0's processing model requires a producer meeting unknown material to strip it with a warning and continue running — this asymmetry (fatal for known-but-invalid, tolerant for unknown) is normative across the whole spec, not just run input. [S4]

### Event model — the eight families

Base event properties, on every event: `type`, optional `timestamp`, optional `rawEvent` (original data if the event was transformed from another system), optional `metadata` (open-by-key extension point — see below), and (new) optional `subagentRunId` for subagent attribution. [S2]

**1. Lifecycle** — `RUN_STARTED` (mandatory first event; carries `threadId`, `runId`, optional `parentRunId` for branching/time-travel, optional `input` echo), `STEP_STARTED`/`STEP_FINISHED` (optional, named phases, matched by `stepName`, may overlap), and exactly one terminal event: `RUN_FINISHED` or `RUN_ERROR`. `RUN_FINISHED.outcome` (new in 1.0) is a discriminated union: absent/`{type:"success"}` = normal completion, `{type:"interrupt", interrupts:[...]}` = paused for human input, `{type:"cancelled"}` = stopped on purpose (not a failure, not waiting) — the cancelled outcome had to ship *in* 1.0 rather than later, because a terminal state added after 1.0 would reach 1.0-era consumers looking like an ordinary success. A late `RUN_ERROR` after `RUN_FINISHED` is legal (e.g. a post-success transport flush failure) and must be treated as a failure. [S2][S9]

**2. Text Messages** — `TEXT_MESSAGE_START` (opens, carries `messageId` + `role`) → one-or-more `TEXT_MESSAGE_CONTENT` (`delta`, non-empty) → `TEXT_MESSAGE_END`. Convenience form: `TEXT_MESSAGE_CHUNK` auto-expands into the triad. [S2]

**3. Tool Calls** — `TOOL_CALL_START` (`toolCallId`, `toolCallName`, optional `parentMessageId`) → `TOOL_CALL_ARGS` (`delta`, a JSON-fragment string the protocol never validates mid-stream) → `TOOL_CALL_END` (closes; establishes completeness, not validity) → separately, `TOOL_CALL_RESULT` (a full tool **message** in its own right, does not reopen the call). Convenience form `TOOL_CALL_CHUNK`. **A consumer MUST NOT act on arguments before `TOOL_CALL_END`.** [S2][S10]

**4. State Management** — `STATE_SNAPSHOT` (full replace) / `STATE_DELTA` (RFC 6902 JSON Patch array) for agent state; `MESSAGES_SNAPSHOT` for full conversation history restore. `activity` and `reasoning` roles are **all-or-nothing** inside a `MESSAGES_SNAPSHOT`: if the snapshot includes any message of that role, it's authoritative for the whole role (repeats replace, omissions delete); if it includes none, the client's existing activity/reasoning messages are left untouched. [S2]

**5. Activity** (new in 1.0) — `ACTIVITY_SNAPSHOT` (`messageId`, `activityType` e.g. `"PLAN"`/`"SEARCH"`, structured `content`, optional `replace` flag) / `ACTIVITY_DELTA` (RFC 6902 `patch`). Activity messages share the message-id namespace with text/reasoning but carry structured object `content` instead of string content, and are **frontend-only — stripped from `RunAgentInput.messages` before it goes back to the agent**. [S2][S4]

**6. Reasoning** — `REASONING_START`/`REASONING_END` (bracket a reasoning span by `messageId`), `REASONING_MESSAGE_START/CONTENT/END` (a streamed, user-visible reasoning summary, separate namespace from spans — a reasoning message needn't sit inside a span), and `REASONING_ENCRYPTED_VALUE` (`subtype: "message"|"tool-call"`, `entityId`, `encryptedValue` — opaque, provider-decryptable only, round-tripped for cross-turn state continuity under ZDR). 1.0 **verifies** open/close discipline strictly: an orphaned content/end event, a span still open at `RUN_FINISHED`, all now fail the run (previously loose). [S2][S11]

**7. Subagents** (new in 1.0) — `SUBAGENT_STARTED` (`subagentRunId`, `name`, optional `description`, `parentSubagentRunId`, `parentToolCallId`, `parentMessageId`) / `SUBAGENT_FINISHED` (optional `result`, optional `outcome: {type:"success"}|{type:"suspended", interruptIds?}`) / `SUBAGENT_ERROR`. Most other events carry an optional `subagentRunId` for attribution without needing the bracketing events at all — attribution is provenance, not ownership: a `STATE_SNAPSHOT`/`STATE_DELTA` from a subagent still applies to the *one* run-scoped state document, there is no per-subagent state. `subagentRunId` names an **invocation**, not a reusable definition — running the same subagent twice yields two different ids. [S2]

**8. Special/passthrough** — `RAW` (wraps a foreign event verbatim, optional `source`) and `CUSTOM` (`name` + `value`, an in-protocol extension point vs. `RAW`'s pure passthrough). [S2]

**Deprecated**: `THINKING_START/END/TEXT_MESSAGE_START/CONTENT/END` → replaced 1:1 by the `REASONING_*` family; translated at the compatibility boundary until 2027-09-17, not dropped outright. [S2][S28]

**Draft** (status: Draft, not yet implemented): `META` events (`metaType`, `payload`) for run-independent, side-band annotations — user feedback (thumbs up/down), notes, tags, analytics, moderation flags — that can appear anywhere in the stream and don't touch agent execution. Author: Markus Ecker. [S2][S19][S20]

### Streaming pattern rules (normative, 1.0)

The "chunked form" (`*_CHUNK` events) has hard rules new in 1.0: the first chunk for a message/tool-call MUST carry the identifying fields (`messageId`+role-defaulting for text; `toolCallId`+`toolCallName` for tool calls); later chunks MAY omit them; **a continuation that repeats an opener field with a conflicting value is fatal**. A closed message/tool-call MAY be reopened by a new `*_START` with the same id, and a reopening start must agree with what it reopens (same name/parent/owner) — though the protocol only promises this for text messages, not tool calls, where a violation's outcome is unspecified. [S8][S10]

### JSON Patch state delta — verbatim shape

```typescript
interface JsonPatchOperation {
  op: "add" | "remove" | "replace" | "move" | "copy" | "test"
  path: string      // JSON Pointer (RFC 6901)
  value?: any       // for add, replace
  from?: string     // for move, copy
}
```
VERBATIM [S13]. Example ops: `{"op":"add","path":"/user/preferences","value":{"theme":"dark"}}`, `{"op":"replace","path":"/conversation_state","value":"paused"}`. TypeScript reference implementation applies patches via `fast-json-patch`'s `applyPatch(state, delta, true, false)` and falls back to `emitNoUpdate()` on patch failure (logging current state + patch + error) rather than crashing. [S13]

### Interrupts — the full human-in-the-loop lifecycle

This is 1.0's most operationally important new mechanism. Sequence (VERBATIM diagram source, mermaid, [S3]):
```
Run 1 begins
Agent-->>Client: RunStarted (runId: r1)
Agent-->>Client: ...ToolCall* / TextMessage* / StateSnapshot...
Agent-->>Client: RunFinished { outcome: { type: "interrupt", interrupts: [...] } }
Client-->>Agent: RunAgentInput { threadId, resume: [{interruptId, status, payload?}, ...] }
Run 2 begins; resume[].interruptId links back to run 1's interrupts
Agent-->>Client: RunStarted (runId: r2)
Agent-->>Client: ...continue / ToolCallResult / ...
Agent-->>Client: RunFinished { outcome: { type: "success" }, result }
```

`Interrupt` type (VERBATIM, [S3]):
```typescript
type Interrupt = {
  id: string
  reason: string
  message?: string
  toolCallId?: string
  responseSchema?: JsonSchema
  expiresAt?: string
  metadata?: Record<string, any>
  subagentRunId?: string
}
```

Resume entry shape (VERBATIM, [S3]):
```typescript
resume?: Array<{
  interruptId: string
  status: "resolved" | "cancelled"
  payload?: any
  metadata?: Record<string, any>
}>
```

**Contract rules (all normative, [S3]):** (1) resume must use the same `threadId`; (2) `resume[].interruptId` must reference the interrupted run's `interrupts[].id`; (3) one `resume` array must cover **every** open interrupt — partial resumes unsupported; (4) any `RunAgentInput` on a thread with pending interrupts that lacks `resume` is a `RunError`; (5) a resume with the same `(threadId, interruptId, status, payload)` must be idempotent to replay; (6) an agent MAY validate `payload` against `responseSchema` and `RunError` on mismatch; (7) a resume past `expiresAt` produces `RunError`; (8) missing/invalid resume payloads must fail loudly, not silently.

**Reason taxonomy**: three core values — `tool_call` (bound to a `toolCallId`), `input_required` (agent needs structured input, `responseSchema` recommended), `confirmation` (free-standing yes/no, boolean default). Anything else is a valid custom extension, conventionally namespaced `<framework>:<name>` (examples given: `langgraph:database_modification`, `mastra:workflow_suspend`); `core:` is reserved for future spec use.

**Approve-with-edits pattern** (COMPOSED convention documented by the spec, [S3]):
```json
{
  "type": "object",
  "properties": {
    "approved": { "type": "boolean" },
    "editedArgs": { "type": "object", "description": "Full replacement of the tool args. Not merged." }
  },
  "required": ["approved"]
}
```
`editedArgs` presence in the schema is itself the capability signal that the client may render an edit UI. Tool-bound interrupts do **not** re-emit `TOOL_CALL_START/ARGS/END` on resume — only `TOOL_CALL_RESULT` against the original `toolCallId`, so the audit trail is: original-run `ToolCallArgs` (proposal) → resumed-run `resume[].payload.editedArgs` (human edit) → resumed-run `ToolCallResult` (actual outcome).

Framework support (as documented, [S3]): **LangGraph** (`@ag-ui/langgraph` / `ag-ui-langgraph`) accepts `resume[]` and can opt-in to `outcome:{type:"interrupt"}` via `emitInterruptOutcome`/`emit_interrupt_outcome` (default **off** — legacy clients resuming via `command.resume` stop working once they see the new outcome shape, hence the opt-in); it also emits a legacy `CustomEvent(name="on_interrupt")` by default (disable with `enableLegacyOnInterruptEvent: false`). **AWS Strands** (`@ag-ui/aws-strands`) forwards native Strands interrupts via `outcome` directly.

**State at the interrupt boundary**: the agent MUST emit any state needed to resume via `StateSnapshot`/`MessagesSnapshot` **before** the interrupting `RunFinished` — this makes the protocol agnostic to whether the resuming implementation replays from messages+state or restores a framework-native suspended coroutine (e.g. a LangGraph checkpoint); both must be observably identical on resume.

### Frontend (client-executed) tools — a *different* round-trip than interrupts

`RunAgentInput.tools` advertises app-owned tools; the agent proposes a call the normal way (`TOOL_CALL_START/ARGS/END`) but the **producer MUST NOT answer it** — no fabricated `TOOL_CALL_RESULT`. The run finishes with the **success** outcome (never interrupted) and MAY list `pendingToolCallIds` (order-preserving) naming calls left unanswered; several frontend calls from one run can go unanswered simultaneously. The app disposes of each (execute/decline) after the run ends, and **must answer every one before continuing the thread** — the next run's `messages` carries a tool message per call, keyed by `toolCallId`, using `error` for a declined/failed call. This is explicitly *not* a third kind of run ending: "a frontend tool is often a terminal effect... whether its result starts another run is the application's decision." [S10]

### Transports — SSE is default, WebSockets is not standard

**HTTP+SSE** (mandatory binding): client `POST`s `RunAgentInput` as JSON with `Content-Type: application/json`, `Accept: text/event-stream`. Server responds `200`, `Content-Type: text/event-stream`; each SSE `data:` payload is exactly one JSON event object (never fragmented, never batched); producer must frame with LF only; consumer must ignore non-`data` SSE fields and tolerate comment/keep-alive lines; **no resumption mechanism** — `Last-Event-ID` is not used, a broken connection needs a brand-new `runId`. VERBATIM wire example [S5]:
```
POST /agent HTTP/1.1
Content-Type: application/json
Accept: text/event-stream

{"threadId":"thr-1","runId":"run-1","messages":[…]}

HTTP/1.1 200 OK
Content-Type: text/event-stream

data: {"type":"RUN_STARTED","threadId":"thr-1","runId":"run-1"}

data: {"type":"TEXT_MESSAGE_START","messageId":"msg-1","role":"assistant"}

data: {"type":"TEXT_MESSAGE_CONTENT","messageId":"msg-1","delta":"Hello."}

data: {"type":"TEXT_MESSAGE_END","messageId":"msg-1"}

data: {"type":"RUN_FINISHED","threadId":"thr-1","runId":"run-1"}
```

**HTTP+Protobuf** (optional binary binding): same request half; negotiated via `Accept: application/vnd.ag-ui.event+proto` alongside `text/event-stream` (a wildcard `Accept` does NOT opt in); response frames are 4-byte big-endian length header + exactly that many protobuf-encoded bytes, no separators, tolerant of chunk-splitting. Generated from the same JSON Schema as the SDKs; a shared byte-corpus pins cross-implementation encoding parity. **Not every event type has a protobuf representation** — tool result, activity, reasoning, and deprecated thinking events have no protobuf message and cannot cross this transport at all (the .NET encoder rejects them; the TS encoder emits an empty payload decoding then rejects). Numbers in dynamic payloads (state, metadata via `google.protobuf.Struct`) are IEEE-754 doubles, so integers beyond 2^53 lose precision. [S6][S15]

**WebSockets, message buses, in-process pipes** are explicitly **custom transports**, not a standard binding — an implementation MAY use them but MUST independently satisfy the binding contract (ordered/complete delivery, deliver `RunAgentInput` before any events, a distinguishable termination-vs-truncation signal, an out-of-band error path for rejected input) and SHOULD frame JSON exactly as SSE does (one event object per frame) rather than invent a new envelope. **Only HTTP+SSE is a MUST for an HTTP implementation; HTTP+Protobuf is OPTIONAL.** [S7]

Authentication/authorization are explicitly **out of scope of the protocol** — "AG-UI defines no credential," left to whatever the binding's channel provides. [S7]

### Capabilities (discovery, not negotiation)

`AbstractAgent.getCapabilities()` (optional, implemented by framework integrations like LangGraph/ADK, not by the bare `HttpAgent` transport) returns a live, typed `AgentCapabilities` snapshot: `identity`, `transport` (flags for `streaming`/`websocket`/`httpBinary`/`pushNotifications`/`resumable`), `tools`, `output`, `state`, `multiAgent` (renamed `subAgents`→`subagents` in 1.0, no wire alias), `reasoning`, `multimodal` (split `input`/`output` sub-objects), `execution`, `humanInTheLoop` (`supported`/`approvals`/`interventions`/`feedback`/`interrupts`/`approveWithEdits`), and an escape-hatch `custom`. Rule: **omitted means undeclared, not unsupported** — a client must gate on an explicit `true`, never infer `false` from absence. This whole interface, previously three hand-written copies per SDK, is now generated once from the schema in 1.0. [S8][S14]

### Metadata — the sanctioned extension channel

Open-by-key object on every event, every one of the 7 message roles, every tool call, and every resume entry. Merge rule into an assembled message: **last write wins, per key, no recursion** (an array/object value is replaced whole, not concatenated/merged) — this is how a provider can attach token usage only known at the end of generation, on the message's closing event. Reserved key: `ag-ui` (not enforced, but off-limits by convention). Tool-call metadata (`TOOL_CALL_START/ARGS/END`) merges onto the **tool call itself**, not the parent assistant message — deliberately, because one assistant message can own several tool calls and folding them into a shared destination would make results order-dependent. Events that don't build a message (`RUN_STARTED/FINISHED/ERROR`, `STEP_*`, `STATE_*`, `RAW`, `CUSTOM`, `REASONING_START/END/ENCRYPTED_VALUE`) keep their metadata on the event, never merged anywhere. Over protobuf, metadata is a `google.protobuf.Struct`, which — unlike plain JSON transport — has a real null case, so `null`-under-a-key survives distinctly from an absent object. [S15]

### Minimal Python server (FastAPI + SSE) — VERBATIM, [S24]

```python
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from ag_ui.core import (
    RunAgentInput, EventType, RunStartedEvent, RunFinishedEvent,
    TextMessageStartEvent, TextMessageContentEvent, TextMessageEndEvent
)
from ag_ui.encoder import EventEncoder
import uuid
from openai import OpenAI
import os

app = FastAPI(title="AG-UI Endpoint")
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

@app.post("/")
async def agentic_chat_endpoint(input_data: RunAgentInput, request: Request):
    accept_header = request.headers.get("accept")
    encoder = EventEncoder(accept=accept_header)

    async def event_generator():
        yield encoder.encode(RunStartedEvent(
            type=EventType.RUN_STARTED,
            thread_id=input_data.thread_id, run_id=input_data.run_id))

        openai_messages = []
        for msg in input_data.messages:
            if msg.role in ["user", "system", "assistant"]:
                openai_messages.append({"role": msg.role, "content": msg.content or ""})

        stream = client.chat.completions.create(
            model="gpt-4o", stream=True, messages=openai_messages)

        message_id = str(uuid.uuid4())
        yield encoder.encode(TextMessageStartEvent(
            type=EventType.TEXT_MESSAGE_START, message_id=message_id, role="assistant"))

        for chunk in stream:
            if (chunk.choices and len(chunk.choices) > 0 and chunk.choices[0].delta
                    and hasattr(chunk.choices[0].delta, 'content') and chunk.choices[0].delta.content):
                yield encoder.encode(TextMessageContentEvent(
                    type=EventType.TEXT_MESSAGE_CONTENT, message_id=message_id,
                    delta=chunk.choices[0].delta.content))

        yield encoder.encode(TextMessageEndEvent(type=EventType.TEXT_MESSAGE_END, message_id=message_id))
        yield encoder.encode(RunFinishedEvent(
            type=EventType.RUN_FINISHED, thread_id=input_data.thread_id, run_id=input_data.run_id))

    return StreamingResponse(event_generator(), media_type=encoder.get_content_type())
```
Note: `ag_ui.core`/`ag_ui.encoder` is the **producer-side** SDK (defines shapes an agent emits); `EventEncoder(accept=...)` picks SSE vs. protobuf encoding based on the incoming request's `Accept` header — this is the actual, code-level content-negotiation mechanism behind the spec's transport-binding text. [S24]

### Client side (TypeScript) — `AbstractAgent`/`HttpAgent`

`@ag-ui/client` exposes `AbstractAgent` (base class with lifecycle hooks, `getCapabilities()`, subscriber system) and `HttpAgent` (a thin SSE/protobuf transport implementation with **no** discovery endpoint — it is why `getCapabilities()` on a bare `HttpAgent` resolves `undefined`; only framework-aware subclasses like a LangGraph or ADK agent wrapper implement it). `AgentSubscriber` gives an event-driven hook surface (`onRunErrorEvent`, etc.); `compactEvents()` squashes a verbose streaming run into fewer events for storage/replay (reorders so each logical stream's own events stay contiguous — not semantics-preserving under exact replay if snapshots interleave with an open stream). [S14][S15]

## Numbers

- **16,131 GitHub stars** on `ag-ui-protocol/ag-ui`, repo created 2025-05-07, still receiving commits on 2026-09-30 (measured via GitHub API `stargazers_count`/`pushed_at`, accessed 2026-09-30). [S27]
- **~30 daily-tagged GitHub releases** observed between 2026-06-17 and 2026-09-30 (`release/YYYY-MM-DD` tags), i.e. roughly one release every 1–7 days over that 3.5-month window — these are automated release trains, not semver-meaningful, but indicate active CI/CD cadence (measured via GitHub Releases API, accessed 2026-09-30). [S27]
- **1024-character limit** on OpenAI tool descriptions is cited by the (draft) Generative UI proposal as a hard constraint shaping how much schema/prompt text a generative-UI tool definition can carry; Gemini and Anthropic are stated to impose no such limit (per the AG-UI draft's own claim, not independently re-verified against OpenAI's current docs in this pass). [S18]
- **12-month shim expiry**: every 1.0 backward-compatibility shim (THINKING_* translation, binary-content-part translation, whole-optional-null tolerances) is dated to expire exactly **2027-09-17**, one year after the 1.0.0 release date, regardless of when in the pre-1.0 cycle the individual shim was introduced. [S28]
- Package-version cadence: Python SDK went through **7 versions in 5 months** pre-1.0 (0.1.15 2026-04-01 → 0.1.22 2026-08-31); TS core went through **~11 versions in the same window** (0.0.48 2026-03-25 → 0.0.59 2026-08-27) — both jumped straight to 1.0.0 on 2026-09-17 (measured from npm/PyPI registry timestamps, accessed 2026-09-30). [S25][S26]

## Pitfalls, limits, criticism

- **The "What's New" changelog page is stale** — it lists only the 2025-04-09 public-repo announcement despite 1.5 years of subsequent 0.x iteration and the entire 1.0 release; anyone relying on it for a dated feature timeline will be misled. Use the `spec/1.0/changelog` (behavioral diff) and `DEPRECATIONS.md` (shim dates) instead, and GitHub/npm/PyPI for actual release dates. [S23] — this is an observation from cross-checking primary sources, not a claim any of them make about themselves.
- **Interrupts and frontend-tool-calls are two different mechanisms that look superficially similar** (both "the agent stops and waits for the app") but have incompatible semantics: an interrupt is a terminal `RunFinished{outcome:"interrupt"}` resumed by a `resume[]` array in a new run; a frontend tool call is a terminal `RunFinished{outcome:"success", pendingToolCallIds}` resumed by ordinary conversation history (a tool message) in a new run. Conflating them is a common integration bug class the spec calls out explicitly. [S3][S10]
- **LangGraph's interrupt-outcome opt-in is off by default specifically because turning it on breaks old clients** — `emitInterruptOutcome`/`emit_interrupt_outcome` defaults to `false` because "legacy clients that resume via `command.resume` stop resuming once they see the structured outcome" — i.e. this is a real, documented breaking-change trap for anyone upgrading a LangGraph+AG-UI integration to interrupt-aware 1.0 semantics without also updating the client. [S3]
- **The binary (protobuf) transport is not a full substitute for SSE** — tool-result, activity, reasoning, and the deprecated thinking events have no protobuf message at all and silently cannot cross that binding; an implementation that assumes "protobuf when the client asks for it" without checking event-type coverage will drop data. [S6]
- **WebSockets are not a first-class AG-UI transport** despite being widely assumed as an option in agent-UI discussions generally — the spec treats them as one arbitrary "custom transport" among others, with no protocol-defined WS framing; anyone building a WS-based AG-UI server is on their own to satisfy the binding contract and should mirror SSE's one-event-per-frame JSON framing rather than invent something new. [S7]
- **Middleware/enforcement guarantees used to be inconsistent across paths pre-1.0** — unknown material used to "vanish silently" when middleware was installed or crossing the protobuf decoder, rather than being stripped-with-warning as on plain SSE; 1.0 explicitly closes this gap ("now true with middleware installed and over the protobuf binding, not only on the plain SSE path"), implying real pre-1.0 silent-data-loss bugs existed in production integrations. [S11]
- **Two SDKs disagreed on version numbering scheme before 1.0** (Python 0.1.x vs TypeScript 0.0.x) tracking the same protocol maturity — a source of confusion for anyone trying to pin "compatible" cross-language SDK versions pre-1.0; 1.0.0 synchronizes this. [S25][S26]
- **Generative UI is explicitly still a draft**, not part of the 1.0 spec — the mechanism ("send client-side tools to the agent" so the agent's tool calls double as UI-widget descriptions) predates and is orthogonal to the now-standardized A2UI/MCP-UI/Open-JSON-UI ecosystem; do not confuse AG-UI's own generative-UI *draft* with its (shipped, 1.0-listed-as-"Supported") *integration* with A2UI/MCP-Apps as external specs. [S17][S18][S20]
- **Meta events remain Draft status** with no implementation timeline given — do not build production features assuming `META` events exist on the wire; they don't yet. [S19][S20]
- Security: the spec is blunt that **tool calls are "the protocol's largest attack surface, because they turn model output into actions"** — arguments are model-generated and must be treated as untrusted input (validated against declared schema or scrutinized generically), side-effectful calls need user consent before execution, tool *results* are untrusted data and must never be read as instructions carrying the user's authority, and a call naming an unadvertised tool deserves the same scrutiny as a brand-new one. [S10]

## What changed in the last 6 months (roughly April–September 2026)

- The entire **1.0 specification came into existence** (2026-09-17) — before that, six months of 0.x iteration (Python 0.1.15→0.1.22, TS 0.0.48→0.0.59) shipped reasoning events, activity events, capabilities, subagents, and multimodal content parts as informally-evolving TypeScript-client behavior with no written spec at all. [S8][S25][S26]
- **Interrupt-aware run lifecycle formalized**: `RUN_FINISHED.outcome`, the `Interrupt` type, `resume[]` on `RunAgentInput`, the full contract-rule list, and the reason taxonomy are all 1.0 additions over what was previously ad hoc per-framework (e.g. LangGraph's `command.resume` / custom `on_interrupt` events). [S8]
- **Subagent attribution** (`subagentRunId`, `SUBAGENT_STARTED/FINISHED/ERROR`) is new in 1.0. [S8]
- **Reasoning fully replaces thinking**: `THINKING_*` retired for `REASONING_*`, plus the new `REASONING_ENCRYPTED_VALUE` for ZDR-compatible cross-turn reasoning continuity. [S8]
- **Content-part renaming and the `file` source**: `InputContent`→`ContentPart` family rename, plus a genuinely new capability — referencing bytes already uploaded to a model provider by opaque handle rather than re-transmitting them — and tool results can now carry the same rich content parts instead of only strings. [S8]
- **A binary wire (protobuf) was specified** for the first time, with cross-implementation byte-parity pinned by a shared test corpus. [S8]
- **Capabilities moved from three hand-maintained per-SDK copies into the generated schema**, with normative semantics (absent = undeclared) stated for the first time. [S8]
- **A one-day-old patch, `@ag-ui/core` 1.0.1 (2026-09-29)**, is the most recent published change as of this research (2026-09-30) — too new for this pass to find changelog detail on; flagged under Unverified below. [S25]

## Diagram candidates

1. **The protocol triangle** — three boxes (Application/User, Agent, Tools/Data, Other Agents) with three labeled arrows: AG-UI (Agent↔User), MCP (Agent↔Tools/Data), A2A (Agent↔Agent). [S21]
2. **Run lifecycle state machine** — states `[*] → Active (RUN_STARTED) → Closed (RUN_FINISHED) / Failed (RUN_ERROR)`, with `Closed → Active` (new run) and `Failed → Active` (new run) transitions; annotate `RUN_ERROR` as reachable both before any `RUN_STARTED` and after a `RUN_FINISHED`. [S9]
3. **Text message streaming triad** — Agent→Client swimlane: `TEXT_MESSAGE_START` → loop `TEXT_MESSAGE_CONTENT` (delta chunks) → `TEXT_MESSAGE_END`, with `messageId` as the correlation key threading all three. [S2]
4. **Tool call lifecycle + two possible endings** — swimlane showing `TOOL_CALL_START/ARGS/END` then forking into (a) same-run `TOOL_CALL_RESULT` (backend tool) vs (b) `RUN_FINISHED{success, pendingToolCallIds}` → app executes → next `RunAgentInput.messages` carries the tool message (frontend tool). [S10]
5. **Interrupt-resume two-run sequence** — the exact mermaid sequence in Mechanics above: Run 1 (ends in interrupt outcome) → client resolves → Run 2 (opens with `resume[]`, ends in success), with the `Interrupt.id` ↔ `resume[].interruptId` correlation arrow drawn explicitly. [S3]
6. **State snapshot/delta timeline** — a horizontal timeline: `STATE_SNAPSHOT` (baseline) → several `STATE_DELTA` (JSON Patch ops accumulate) → periodic `STATE_SNAPSHOT` (re-baseline) → more deltas, with a small inset showing one JSON Patch op applied to a mini state tree. [S2][S13]
7. **Content-part source taxonomy** — a tree: `ContentPart` → `{Text, Image, Audio, Video, Document}` each → `source: PartSource` → `{DataSource (inline bytes), UrlSource (fetchable), FileSource (opaque provider handle — NEW)}`, with a caution icon on `FileSource.value` ("never treat as a URL"). [S4][S16]
8. **Subagent attribution and nesting** — a small tree of agent boxes: root run → `SUBAGENT_STARTED(subagentRunId=A)` → nested `SUBAGENT_STARTED(subagentRunId=B, parentSubagentRunId=A)`, with events flowing to a single client stream all tagged with their `subagentRunId`, and a note that state stays run-scoped regardless of attribution. [S2]
9. **Transport decision tree** — "Do you need binary/compact wire?" → No: HTTP+SSE (mandatory, default) / Yes: does client's `Accept` explicitly admit `application/vnd.ag-ui.event+proto`? → HTTP+Protobuf; else → falls back to SSE; separate branch: "need a non-HTTP channel?" → Custom transport, must satisfy the binding contract manually. [S6][S7]
10. **Capability discovery flow** — Client → `agent.getCapabilities?.()` → Agent returns live `AgentCapabilities` snapshot → Client gates UI features (reasoning panel, sub-agent selector, approval workflow) on explicit `true` fields only. [S14]
11. **AG-UI vs. Vercel AI SDK UI Message Stream vs. assistant-ui positioning chart** (conceptual, composed from cross-source comparison) — three columns (AG-UI, Vercel AI SDK UI protocol, MCP-UI/A2UI) × rows (owns transport?, owns generative-UI widgets?, framework-agnostic?, HITL/interrupt model?) — good candidate for a comparison table-as-diagram. [S1][S17][S30]

**Chart candidates:**
- Package-version-over-time line chart: TS `@ag-ui/core` and Python `ag-ui-protocol` version bumps plotted against date (2026-03 → 2026-09), showing convergence to 1.0.0 on the same day — data pulled directly from npm/PyPI `time` fields in this research. [S25][S26]
- GitHub release cadence bar chart: count of `release/YYYY-MM-DD` tags per month, June–September 2026, showing release-train frequency trend. [S27]

## Glossary

- **AG-UI**: Agent-User Interaction Protocol; open event-based standard connecting agent backends to user-facing frontends.
- **Run**: one execution of an agent, bounded by `RUN_STARTED` and (`RUN_FINISHED`|`RUN_ERROR`), identified by `runId` within a `threadId`.
- **Thread**: a conversation, spanning one or more runs, identified by `threadId`.
- **RunAgentInput**: the single request message a client sends to start a run.
- **Outcome**: `RUN_FINISHED`'s discriminated union describing how a run ended — success, interrupt, or cancelled.
- **Interrupt**: a structured pause requesting human input, closing a run; answered by a `resume[]` entry in the next run's input.
- **Frontend tool / client-executed tool**: a tool declared by the app in `RunAgentInput.tools`, executed by the app, answered across a run boundary via conversation history — not in-stream.
- **Snapshot/delta pattern**: state-sync idiom used for `STATE_*`, `ACTIVITY_*`, applying a full-replace event occasionally and RFC 6902 JSON Patch ops (`STATE_DELTA`) incrementally in between.
- **Subagent**: a delegated child agent invocation, attributed via `subagentRunId` on events it produces; not a separate state scope.
- **ContentPart**: the 1.0 name for a typed multimodal content unit (text/image/audio/video/document) with a `source` (`data`|`url`|`file`).
- **FileSource**: a `ContentPart` source variant carrying an opaque, provider-issued file handle (never a fetchable URL).
- **Capabilities (AgentCapabilities)**: a typed, optional, dynamically-queried self-declaration of what an agent supports — discovery only, no negotiation.
- **Metadata**: the open-by-key extension object on every event/message/tool-call/resume-entry; merges last-write-wins into the entity it builds.
- **A2UI**: Google's declarative, JSONL-streaming generative-UI spec — a different, complementary layer to AG-UI.
- **MCP-UI / MCP Apps**: Microsoft+Shopify's iframe-based generative-UI extension to MCP.

## Unverified / open questions

- **What exactly changed in `@ag-ui/core` 1.0.1 (2026-09-29)** — the npm registry confirms the version and date but this research did not locate a dedicated changelog entry for the patch; tried: npm registry metadata (only gives timestamps, no changelog text), the docs site's stale "What's New" page (does not mention it). Treat 1.0.1 as "a patch exists" without content detail.
- **Exact publication/last-updated dates for individual docs.ag-ui.com pages** are not exposed by the site (no visible per-page date, and the llms.txt/llms-full.txt export carries no timestamps) — dates cited in this file for spec/concept content are inferred from the 1.0.0 release date (2026-09-17) where the page is explicitly versioned "— 1.0", not independently confirmed per-page.
- **Vercel AI SDK UI message stream protocol** was investigated as a competitor via WebFetch summary only (not a full read-through of ai-sdk.dev's raw docs or its GitHub source); the part-type list given (`text-start/delta/end`, `tool-input-*`, `tool-approval-*`, etc.) should be double-checked against `ai-sdk.dev` directly before citing exact field names in the book chapter — tried: WebFetch of `ai-sdk.dev/docs/ai-sdk-ui/stream-protocol`, got a fetch-tool summary, not verbatim source.
- **assistant-ui's AG-UI integration** — attempted to fetch `assistant-ui.com/docs/runtimes/ag-ui` and `.../legacy/runtimes/ag-ui`; both 404'd. assistant-ui's actual relationship to AG-UI (does it consume AG-UI streams directly, via CopilotKit, or not at all) is **not verified** in this pass and needs a fresh URL (check assistant-ui's docs nav or GitHub for the current path).
- **OpenAI ChatKit / Apps SDK wire protocol** — both fetched pages (`developers.openai.com/api/docs/guides/chatkit`, `.../apps-sdk/concepts/mcp-server`) explicitly stated they do not document an open, named streaming protocol; whether ChatKit's internal protocol is comparable to AG-UI's event model is genuinely unclear from public docs as of this pass, not just an artifact of my search — flag as an open question for the book (may be intentionally undocumented/proprietary).
- **Kotlin/Go/Dart/Java/Rust/Ruby/C++ community SDK maturity** — the docs site lists these as "Supported" with links into the GitHub monorepo, but this pass did not open any of their individual READMEs to verify actual feature parity with the TS/Python/.NET 1st-party SDKs (e.g. do they implement the 1.0 interrupt lifecycle, subagents, protobuf transport?). Tried: none directly opened, time-boxed out of this pass — worth a follow-up read of e.g. `github.com/ag-ui-protocol/ag-ui/tree/main/sdks/community/rust` before claiming parity in the chapter.
- **AWS Bedrock AgentCore's "runtime-agui-protocol-contract"** page (`docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-agui-protocol-contract.html`) was linked from the AG-UI docs as a 1st-party integration reference but was **not opened** in this pass — likely has AWS-specific contract details (auth model on top of AG-UI, hosting constraints) relevant to the "integrations" part of this chapter's scope.
- **The 1024-character OpenAI tool-description limit** cited in the Generative UI draft is the draft author's own claim from within the AG-UI docs, not independently re-verified against current OpenAI API docs in this pass.

## Sources

- [S1] "AG-UI Overview" (introduction), AG-UI docs (ag-ui-protocol maintainers), n.d. (spec-current as of 1.0), https://docs.ag-ui.com/introduction, accessed 2026-09-30
- [S2] "Events", AG-UI docs, n.d., https://docs.ag-ui.com/concepts/events, accessed 2026-09-30
- [S3] "Interrupts", AG-UI docs, n.d., https://docs.ag-ui.com/concepts/interrupts, accessed 2026-09-30
- [S4] "Run Input", AG-UI Specification 1.0, https://docs.ag-ui.com/spec/1.0/basic/run-input, accessed 2026-09-30
- [S5] "HTTP + Server-Sent Events", AG-UI Specification 1.0, https://docs.ag-ui.com/spec/1.0/basic/transports/http-sse, accessed 2026-09-30
- [S6] "HTTP + Protobuf", AG-UI Specification 1.0, https://docs.ag-ui.com/spec/1.0/basic/transports/http-protobuf, accessed 2026-09-30
- [S7] "Transports", AG-UI Specification 1.0, https://docs.ag-ui.com/spec/1.0/basic/transports/index, accessed 2026-09-30
- [S8] "Key Changes", AG-UI Specification 1.0 changelog, https://docs.ag-ui.com/spec/1.0/changelog, accessed 2026-09-30
- [S9] "Runs and Steps", AG-UI Specification 1.0, https://docs.ag-ui.com/spec/1.0/events/lifecycle, accessed 2026-09-30
- [S10] "Tool Calls", AG-UI Specification 1.0, https://docs.ag-ui.com/spec/1.0/events/tool-calls, accessed 2026-09-30
- [S11] "Migrating to 1.0", AG-UI docs, published ~2026-09-17 (release-coincident), https://docs.ag-ui.com/migrating-to-1-0, accessed 2026-09-30
- [S12] "Tools", AG-UI docs, n.d., https://docs.ag-ui.com/concepts/tools, accessed 2026-09-30
- [S13] "State Management", AG-UI docs, n.d., https://docs.ag-ui.com/concepts/state, accessed 2026-09-30
- [S14] "Capabilities", AG-UI docs, n.d., https://docs.ag-ui.com/concepts/capabilities, accessed 2026-09-30
- [S15] "Metadata", AG-UI docs, n.d., https://docs.ag-ui.com/concepts/metadata, accessed 2026-09-30
- [S16] "Messages", AG-UI docs, n.d., https://docs.ag-ui.com/concepts/messages, accessed 2026-09-30
- [S17] "Generative UI" (concepts/generative-ui-specs), AG-UI docs, n.d., https://docs.ag-ui.com/concepts/generative-ui-specs, accessed 2026-09-30
- [S18] "Generative User Interfaces" (draft), author Markus Ecker, AG-UI docs, n.d., https://docs.ag-ui.com/drafts/generative-ui, accessed 2026-09-30
- [S19] "Meta Events Proposal" (draft), author Markus Ecker, AG-UI docs, n.d., https://docs.ag-ui.com/drafts/meta-events, accessed 2026-09-30
- [S20] "Overview" (drafts), AG-UI docs, n.d., https://docs.ag-ui.com/drafts/overview, accessed 2026-09-30
- [S21] "MCP, A2A, and AG-UI", AG-UI docs, n.d., https://docs.ag-ui.com/agentic-protocols, accessed 2026-09-30
- [S22] "Subagents", AG-UI docs, n.d., https://docs.ag-ui.com/concepts/subagents, accessed 2026-09-30
- [S23] "What's New", AG-UI docs, last entry dated 2025-04-09, https://docs.ag-ui.com/development/updates, accessed 2026-09-30
- [S24] "Server" quickstart, AG-UI docs, n.d., https://docs.ag-ui.com/quickstart/server, accessed 2026-09-30
- [S25] `@ag-ui/core` registry metadata, npm (registry.npmjs.org), accessed 2026-09-30 via `curl https://registry.npmjs.org/@ag-ui/core`
- [S26] `ag-ui-protocol` package metadata, PyPI (pypi.org/pypi/ag-ui-protocol/json), accessed 2026-09-30
- [S27] `ag-ui-protocol/ag-ui` repository metadata and releases, GitHub API (api.github.com/repos/ag-ui-protocol/ag-ui, .../releases), accessed 2026-09-30
- [S28] "DEPRECATIONS.md", ag-ui-protocol/ag-ui GitHub repo, main branch, https://raw.githubusercontent.com/ag-ui-protocol/ag-ui/main/DEPRECATIONS.md, accessed 2026-09-30
- [S29] `ag-ui-protocol/ag-ui` repo, `integrations/` directory listing, GitHub API (api.github.com/repos/ag-ui-protocol/ag-ui/contents/integrations), accessed 2026-09-30
- [S30] "Vercel AI SDK UI Message Stream Protocol", ai-sdk.dev docs (via WebFetch summary, not raw source), https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol, accessed 2026-09-30
- [S31] "ChatKit" guide, OpenAI developer docs, https://developers.openai.com/api/docs/guides/chatkit, accessed 2026-09-30
- [S32] "MCP server" (Apps SDK concepts), OpenAI developer docs, https://developers.openai.com/apps-sdk/concepts/mcp-server, accessed 2026-09-30
