# 08. AG-UI: протокол агент ↔ интерфейс — practice notes

Lens: engineering practice (concrete recipes, decision rules, working code shapes, measured
adoption, production wiring). Boundaries: this chapter is the agent↔UI wire protocol. Generative
UI *content* specs (A2UI, MCP-UI, Open-JSON-UI) → ch.09; agentic commerce (AP2/UCP) → ch.10; memory
persistence patterns → ch.11; multi-agent orchestration internals → ch.13.

**Major finding up front: AG-UI 1.0 shipped today, 2026-09-30.** Everything under "0.x" in older
material (blog posts pre-Sept-2026, most tutorials) describes a protocol whose behavioural rules
lived only in the TypeScript client, with no formal spec, no versioning field, and different event
names (`THINKING_*`). 1.0 is the first release with a normative specification (BCP‑14 MUST/SHOULD
language) and a schema every SDK is generated from [S18][S21]. Treat pre-1.0 blog code samples as
directionally right but check field names against the 1.0 schema.

## TL;DR (what an engineer must know today)

- AG-UI (Agent-User Interaction Protocol) is an open, event-based protocol: one `RunAgentInput`
  request in, one ordered stream of typed events out. It is the third leg of the "agentic protocol
  triangle" — MCP (agent↔tools/data), A2A (agent↔agent), AG-UI (agent↔user-facing app) [S1][S30].
- Born inside CopilotKit (2025), donated as an open spec; day-0 partners were LangChain (LangGraph)
  and CrewAI [S42]. 1.0 (2026-09-30) adds a real specification, subagents, interrupt-aware run
  lifecycle, activity events, reasoning (replacing "thinking"), a binary protobuf transport, and a
  formal capabilities schema [S18].
- Core mental model: **tolerant reader, strict writer**. A producer MUST emit only what the schema
  defines; a consumer MUST survive unknown material (strip with a warning), but a malformed known
  field is fatal. This asymmetry is what lets the protocol evolve without breaking old clients
  against new agents and vice versa [S12][S18].
- The stable event catalogue is **31 event types in 8 families** as of 1.0 (lifecycle, text
  messages, tool calls, state, activity, reasoning, subagents, raw/custom); `META` events (user
  feedback/annotations) exist only as a draft, not yet in the enum [S2][S18].
- Only two standard transport **bindings** exist in the 1.0 spec: HTTP+SSE (mandatory) and
  HTTP+Protobuf (optional, binary, negotiated by `Accept` header). WebSockets are explicitly a
  "custom transport" in the spec, not a standard binding — even though several vendors (AWS
  Bedrock AgentCore) ship a `/ws` endpoint alongside SSE in practice [S17][S40].
- State sync uses the snapshot/delta pattern: `STATE_SNAPSHOT` (full replace) + `STATE_DELTA`
  (RFC 6902 JSON Patch). The reference client applies patches via `fast-json-patch`
  (`applyPatch(state, delta, true, false)`), catching failures without mutating current state [S6].
- Human-in-the-loop is now a first-class **interrupt-aware run lifecycle**: a run ends via
  `RUN_FINISHED{ outcome: {type:"interrupt", interrupts:[...]} }`; the client answers with a new
  run whose `RunAgentInput.resume[]` addresses every open interrupt by id. This replaced ad hoc
  "on_interrupt" custom events per framework [S3][S18].
- Frontend tools are declared by the *client* in `RunAgentInput.tools`, not by the agent — this is
  the mechanism CopilotKit's `useCopilotAction` and generative UI both build on [S8].
- Subagent attribution (`subagentRunId` on most events, `SUBAGENT_STARTED/FINISHED/ERROR` for
  lifecycle) is new in 1.0 and solves "three parallel subagents rendering as one undifferentiated
  wall of text." It's opt-in per producer (e.g. LangGraph's `subagent_visibility` flag) because old
  clients hard-fail on the unknown event types [S7].
- Reasoning events (`REASONING_START/MESSAGE_START/CONTENT/END/ENCRYPTED_VALUE`) replace the
  deprecated `THINKING_*` family and explicitly model OpenAI's encrypted-reasoning-items / Gemini's
  thought-signatures pattern for ZDR (zero data retention) compliance [S2][S10].
- CopilotKit is the reference implementation and the dominant client; it is *a* client, not *the*
  protocol — assistant-ui, terminal clients, Channels SDK (Slack/Teams) and raw `HttpAgent` all
  consume the same wire format [S1][S38].
- Ecosystem breadth by Sept 2026: 1st-party framework support for LangGraph, CrewAI, Mastra,
  Pydantic AI, Google ADK, AWS Strands, AWS Bedrock AgentCore, Microsoft Agent Framework, LlamaIndex,
  Agno, AG2, Claude Agent SDK / Claude Managed Agents, plus community SDKs in Kotlin, Go, Rust,
  Java, .NET, Dart, Ruby, C++ [S1].
- HN reception has been modest, not viral: the original 2025 Show HN got 36 points / 5 comments;
  the Microsoft-adopts-AG-UI story (Nov 2025) got 7 points / 3 comments — contrast with MCP's much
  larger HN footprint. Adoption is happening through framework partnerships more than grassroots
  developer buzz [S42][S43].

## Current state and versions (as of 2026-09-30)

- **AG-UI 1.0** released 2026-09-30 — "Introducing AG-UI 1.0: a stable spec for connecting any
  agent to any application" (CopilotKit blog, authors Anmol Baranwal & Eli Berman) [S31]. This is
  literally today's date — the chapter is being researched on release day.
- `@ag-ui/core` (TypeScript) — npm package, versioned independently; validators (zod-based) moved
  to a `@ag-ui/core/schemas` subpath in 1.0 so the main entry has zero runtime deps beyond types
  [S11].
- `ag-ui-protocol` (Python, PyPI) — `ag_ui.core` package; "absent fields are omitted, never null"
  shipped ahead of 1.0 in `ag-ui-protocol` 0.1.20 [S11].
- .NET SDK is now first-class/generated (previously ~60 hand-written classes); Microsoft
  contributed a dedicated .NET SDK blog post dated 2026-09-25 [S1].
- Protocol version travels in-band: `RunAgentInput.protocolVersion` (client declares) and
  `RUN_STARTED.protocolVersion` (producer answers) — absence on either side identifies a
  pre-versioning peer [S18].
- Framework integration status table (1st party = "has AG-UI built in with docs"): LangChain/
  LangGraph and CrewAI are "partnerships" (earliest, deepest); Microsoft Agent Framework, Google
  ADK, AWS Strands Agents, AWS Bedrock AgentCore, Mastra, Pydantic AI, Agno, LlamaIndex, AG2 are
  "1st party — Supported"; AWS Bedrock Agents is "In Progress"; OpenAI Agent SDK and Cloudflare
  Agents are "In Progress" (i.e., **not yet supported** as of this writing) [S1].
- Generative UI spec interop: A2UI (Google) and MCP Apps (formerly MCP-UI, Microsoft+Shopify) both
  listed "Supported" against AG-UI [S1][S29].

## Timeline

- **2025-04-09**: AG-UI repositories made public (first protocol release) [per docs.ag-ui.com
  "What's New" changelog, only entry present] [S1-updates-page].
- **2025-05-13**: "Show HN: AG-UI Protocol – Bring Agents into Frontend Applications", 36 points,
  5 comments [S42].
- **2025 (ongoing)**: Day-0 integrations LangChain/LangGraph, CrewAI, Mastra, AG2 [S42].
- **2026-07-20**: "Auto-Tune: Stop Writing the Prompt, Train the Model" (CopilotKit Intelligence /
  continuous learning feature) [S from blog listing].
- **2026-07-23**: CopilotKit for Angular announced [S from blog listing].
- **2026-08-04**: Channels SDK announced — "bring any AG-UI agent to Slack/Teams" [S36].
- **2026-08-12**: Claude Managed Agents declared AG-UI-compatible (Anthropic integration,
  author Eli Berman) [S33].
- **2026-08-13**: "Building a Production-Ready Slack Agent with Channels SDK" [S from listing].
- **2026-08-18**: CrewAI declared "fully AG-UI compatible" — Conversational Flows, v0.3.0 of the
  bridge, `ag-ui-crewai` on PyPI [S34].
- **2026-08-19**: React Native AG-UI support ("native components instead of a webview") [S from
  listing].
- **2026-08-24**: Mastra declared "fully AG-UI compatible" [S from listing].
- **2026-09-01**: OpenBot (open-source agent) passes 3,500 GitHub stars [S from listing].
- **2026-09-08**: Microsoft Learn publishes the Agent Framework × AG-UI integration doc
  (`ms.date: 2026-09-08`) [S37].
- **2026-09-10**: CopilotKit "Inspector" devtool gets "Automatic Learning" upgrade — Threads →
  Insights → Skills pipeline generating `SKILL.md` files from production traces [S35].
- **2026-09-25**: "AG-UI Protocol now has a first-class .NET SDK" (Microsoft contribution) [S1].
- **2026-09-26**: "AG-UI for Product Managers" post [S from listing].
- **2026-09-29**: "The Developer's Guide to the AG-UI Protocol" published, author Anmol
  Baranwal [S32].
- **2026-09-30 (today)**: **AG-UI 1.0 launched** with a full behavioural specification and
  generated schemas across TS/Python/.NET [S18][S31].

## Mechanics

### The run: architecture and lifecycle

Three components, one channel [S12]:
- **Application** — owns the user, renders the stream, executes advertised tool calls, holds
  shared state, decides what needs consent.
- **The client** — protocol machinery (usually an SDK): sends `RunAgentInput`, runs the processing
  pipeline (compat translation → middleware → enforcement → chunk expansion → verification) on the
  incoming stream.
- **Agent endpoint + framework bridge** — the producer; the bridge translates a framework's native
  events into protocol events. "The protocol carries no framework concepts, which is what lets one
  client face any framework."

```
Application --RunAgentInput--> Agent Endpoint
Application <--event stream--- Agent Endpoint
```

A stream MUST begin with `RUN_STARTED` or `RUN_ERROR`. Steps (`STEP_STARTED`/`STEP_FINISHED`,
matched by `stepName`) MAY appear in between; the run closes with `RUN_FINISHED` (success/interrupt/
cancelled outcome) or `RUN_ERROR` [S19].

**Design principles stated in the spec** [S12]:
1. Agents should be extremely easy to expose — a bridge is a translation, not an implementation.
2. Everything observable is in the exchange — no side channel; a recorder of (input, events) pairs
   fully reconstructs what the UI knew.
3. Tolerant reader, strict writer.
4. Middleware runs before enforcement (so translation gets first crack at retired/future shapes).
5. Transports are bindings — semantics never vary by wire; cross-implementation byte parity is
   pinned by a shared corpus for protobuf.

### RunAgentInput (the one message going the other way)

```typescript
// COMPOSED from schema description [S14]
interface RunAgentInput {
  threadId: string          // REQUIRED
  runId: string             // REQUIRED
  parentRunId?: string      // OPTIONAL — for agent-invokes-agent-as-separate-run branching
  protocolVersion?: string  // OPTIONAL but SHOULD be declared by a 1.0 peer
  messages: Message[]       // REQUIRED — the FULL history; no side channel
  tools?: Tool[]            // OPTIONAL — client-provided ("frontend") tools; absent == []
  context?: Array<{description: string; value: string}>  // OPTIONAL, injected into grounding
  state?: any               // OPTIONAL — the run's starting state; absent == {}
  forwardedProps?: any      // OPTIONAL — untouched app-specific passthrough
  resume?: ResumeEntry[]    // OPTIONAL — interrupt answers
}
```

Key behavioural rules [S14]:
- `messages` is REQUIRED and MUST be treated as the *complete* history shown — there's no side
  channel for earlier turns.
- Activity messages (frontend-only progress UI) MUST be stripped by the consumer before sending —
  they never go back to the producer.
- A media part the producer can't use (image to a non-vision model) MUST NOT fail the run — skip
  and continue.
- `tools`/`context`: absent and empty mean the same thing (1.0 minor change) [S18].
- `forwardedProps`: any JSON except a whole `null` (which means "omit"); intermediaries MUST NOT
  alter it — this is the sanctioned "escape hatch" (e.g. `AuthMiddleware` attaches an auth token
  here, not as a new top-level field) [S26].

VERBATIM curl example from the AG-UI quickstart server guide [S22]:
```bash
curl -X POST http://localhost:8000/ \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "threadId": "thread_123",
    "runId": "run_456",
    "state": {},
    "messages": [
      {
        "id": "msg_1",
        "role": "user",
        "content": "Hello, how are you?"
      }
    ],
    "tools": [],
    "context": [],
    "forwardedProps": {}
  }'
```

### Event catalogue (1.0, 31 stable types across 8 families) [S2][S18]

**Lifecycle**: `RUN_STARTED`, `RUN_FINISHED` (optional `outcome`: success / interrupt / cancelled),
`RUN_ERROR`, `STEP_STARTED`, `STEP_FINISHED`.

**Text messages**: `TEXT_MESSAGE_START`, `TEXT_MESSAGE_CONTENT` (delta), `TEXT_MESSAGE_END`,
`TEXT_MESSAGE_CHUNK` (shorthand, auto-expanded by the client).

**Tool calls**: `TOOL_CALL_START`, `TOOL_CALL_ARGS` (delta, streamed but not actionable until END),
`TOOL_CALL_END`, `TOOL_CALL_CHUNK` (shorthand), `TOOL_CALL_RESULT` (a real tool *message*, does not
reopen the call).

**State**: `STATE_SNAPSHOT`, `STATE_DELTA` (RFC 6902 JSON Patch), `MESSAGES_SNAPSHOT`.

**Activity** (new in 1.0): `ACTIVITY_SNAPSHOT`, `ACTIVITY_DELTA` — structured, updateable progress
UI (plans, search-in-progress checklists) that lives only on the frontend and is never sent back to
the model [S2].

**Reasoning** (new in 1.0, replaces `THINKING_*`): `REASONING_START`, `REASONING_MESSAGE_START`,
`REASONING_MESSAGE_CONTENT`, `REASONING_MESSAGE_END`, `REASONING_MESSAGE_CHUNK`, `REASONING_END`,
`REASONING_ENCRYPTED_VALUE`.

**Subagents** (new in 1.0): `SUBAGENT_STARTED`, `SUBAGENT_FINISHED`, `SUBAGENT_ERROR`.

**Special**: `RAW` (passthrough of an external system's native event, in `event` + optional
`source`), `CUSTOM` (`name` + `value`, application-defined, part of the protocol proper).

**Draft, not in the stable enum**: `META` (`metaType` + `payload`; side-band, run-independent —
thumbs up/down, tags, moderation flags) [S27]. Deprecated: the five `THINKING_*` events — retired
from the public API in 1.0 but still auto-translated at the TypeScript client's compatibility
boundary for old producers [S2][S11].

### Interrupts / human-in-the-loop (the biggest 1.0 addition)

Model: a run **ends** rather than pausing mid-stream. VERBATIM `RunFinishedEvent` shape [S3]:
```typescript
type RunFinishedOutcome =
  | { type: "success" }
  | { type: "interrupt"; interrupts: Interrupt[] }

type RunFinishedEvent = {
  type: "RUN_FINISHED"
  threadId: string
  runId: string
  result?: unknown
  outcome?: RunFinishedOutcome
}
```
`Interrupt` shape [S3]:
```typescript
type Interrupt = {
  id: string
  reason: string           // core: "tool_call" | "input_required" | "confirmation"; else custom
  message?: string
  toolCallId?: string
  responseSchema?: JsonSchema
  expiresAt?: string
  metadata?: Record<string, any>
  subagentRunId?: string
}
```
Client resumes on the **next run** with `RunAgentInput.resume[]` — one entry per interrupt, status
`"resolved"` (with `payload` validated against `responseSchema`) or `"cancelled"` (no payload) [S3].

Contract rules worth internalizing as design constraints [S3]:
1. Same `threadId`.
2. `resume[].interruptId` must reference an id from the interrupted run.
3. **A single `resume` array must cover every open interrupt** — no partial resumes.
4. A `RunAgentInput` on a thread with pending interrupts that omits `resume` → `RunError`.
5. Idempotent replay of the same `(threadId, interruptId, status, payload)` must be safe.
6. Schema-validated payloads (agent MAY validate, client SHOULD validate first).
7. Expired interrupts (`expiresAt`) produce `RunError` if resumed late.

"Approve with edits" pattern (recommended `responseSchema`, COMPOSED per docs example) [S3]:
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
`editedArgs` presence in the schema is the *capability signal* the client uses to decide whether to
offer edit UI at all. Full audit trail for a tool-bound interrupt spans two runs: original
`ToolCallArgs` (proposal) → `resume[].payload.editedArgs` (human edit) → `ToolCallResult` (actual
execution) in the resumed run. The agent does **not** re-emit `TOOL_CALL_START/ARGS/END` on resume.

Framework support snapshot [S3]: LangGraph (`@ag-ui/langgraph`) accepts `resume[]`, opt-in emission
of the structured `outcome` via `emitInterruptOutcome` (default OFF — legacy clients that resume via
`command.resume` stop working once they see the new shape), legacy `CustomEvent(name="on_interrupt")`
still emitted by default (`enableLegacyOnInterruptEvent: false` to disable). AWS Strands forwards
native interrupts via `RunFinishedEvent.outcome`.

Distinct from **frontend tool calls**, which finish as `success` (never `interrupt`) with
`pendingToolCallIds` naming unanswered calls — "a run that stops on a frontend tool call is a
completed run... the producer does not know whether it is waiting" [S20].

**Cancelled runs** (new named outcome in 1.0, distinct from both success and interrupt): a run
stopped on purpose (user/app/limit) closes with `outcome: {type: "cancelled"}`; `result` SHOULD be
absent; it is not a resumable wait state. This was deliberately specified now rather than later,
because a terminal state added after 1.0 would reach 1.0 consumers as "success" [S19].

### Reasoning / thinking (privacy-first, ZDR-aware)

Modeled explicitly on OpenAI's encrypted reasoning items (`store:false`) and Gemini's "thought
signatures" [S2][S10]. `ReasoningMessage.encryptedValue` carries an opaque blob the client stores
and forwards without reading — "only the agent (or authorized backend) can decrypt them."
`REASONING_ENCRYPTED_VALUE` attaches this to either a message or a tool call (`subtype:
"message"|"tool-call"`), letting the agent preserve *why it chose specific tool arguments*
across turns without exposing chain-of-thought to the client [S2].

### State management

Snapshot/delta over RFC 6902 JSON Patch, applied with `fast-json-patch`. VERBATIM reference
implementation snippet from the docs [S6]:
```typescript
case EventType.STATE_DELTA: {
  const { delta } = event as StateDeltaEvent;
  try {
    const result = applyPatch(state, delta, true, false);
    state = result.newDocument;
    return emitUpdate({ state });
  } catch (error: unknown) {
    console.warn(`Failed to apply state patch:\n...`);
    return emitNoUpdate();
  }
}
```
CopilotKit's shared-state hook (frontend) [S6]:
```jsx
const { state: agentState, setState: setAgentState } = useCoAgent({
  name: "agent",
  initialState: { someProperty: "initialValue" },
})
```
Backend emission from a LangGraph node (VERBATIM) [S6]:
```python
async def tool_node(self, state: ResearchState, config: RunnableConfig):
    tool_state = {
        "title": new_state.get("title", ""),
        "outline": new_state.get("outline", {}),
        "sections": new_state.get("sections", []),
    }
    await copilotkit_emit_state(config, tool_state)
    return tool_state
```
Design rule: state is **run-scoped**, one document per run. Subagent attribution on
`STATE_SNAPSHOT`/`STATE_DELTA` is provenance ("the researcher updated the shared scratchpad"), never
a separate per-subagent scope — a snapshot always replaces the *whole* run document [S7].

### Subagents (1.0)

`subagentRunId` is an opaque handle for **one invocation**, not a stable definition id — the
distinction the spec hammers hardest: "run the same subagent twice and you get two different
values." Use `name` when you mean "which kind of subagent" [S7].

Lifecycle: `SUBAGENT_STARTED` (`subagentRunId`, `name`, optional `parentSubagentRunId`,
`parentToolCallId`, `parentMessageId` — the last two exist specifically for the
agents-as-tools pattern, to render subagent output inside the calling tool's card) →
attributed events → `SUBAGENT_FINISHED` (`outcome: success | suspended`) or `SUBAGENT_ERROR` [S7].

**Compatibility is the sharp edge**: unlike an unknown *field* (tolerated), `SUBAGENT_*` are unknown
*event types* to an old client, which "fails on them while decoding, before any application code
runs" — no client-side filtering possible. Producers therefore gate lifecycle emission behind an
explicit flag, e.g. LangGraph's `subagent_visibility`: `"inline"` (default, pre-1.0 behavior, no
attribution at all) → `"attributed"` (full attribution + lifecycle) → `"hidden"` (client sees only
parent's spawning call + result) [S7]:
```python
agent = LangGraphAgent(name="my-agent", graph=graph, subagent_visibility="attributed")
```
Concurrency rule: chunk shorthand (`TextMessageChunk`/`ToolCallChunk`) resolution is scoped **per
subagent** — an untagged chunk with no id resolves to the parent's open stream if one exists,
otherwise the sole open stream of that kind; if several subagents' streams could claim it, the
client rejects rather than guesses. "When streaming concurrently, attribute every chunk, or repeat
the id" [S7].

### Multimodal content parts

`ContentPart` union: `TextPart | ImagePart | AudioPart | VideoPart | DocumentPart`, each media part
carrying a `source`: `DataSource` (inline base64), `UrlSource` (fetchable), or the 1.0-new
`FileSource` (an opaque provider-issued handle — OpenAI/Anthropic file id, Gemini file URI) [S4][S18].
Rule: a `FileSource.value` is opaque — "a peer MUST NOT fetch it, parse it or read a scheme out of
it." `TOOL_CALL_RESULT.content` in 1.0 accepts the same `ContentPart[]` union (not just a string),
so a tool can return a PDF or image directly [S18][S20].

### Metadata (open-by-key wire channel)

Every event, message, tool call, and resume entry can carry `metadata: Record<string, any>` — the
sanctioned channel for token usage, trace ids, finish reasons, etc; unknown top-level properties
are now stripped in 1.0, so `metadata` is the *only* legal escape hatch [S5][S11]. Merge rule:
**last write wins, key by key, no recursion** — an array/object value is replaced whole, never
concatenated. Tool call metadata merges onto the **tool call itself**, not the parent assistant
message (because several tool calls share one message and interleaving order isn't guaranteed)
[S5][S8]. The `ag-ui` key is reserved for the protocol's own future use.

### Capabilities (discovery, new formal schema in 1.0)

`AgentCapabilities` — every group and field OPTIONAL; **absent means undeclared, not unsupported**.
Declarations are informative, never binding: "a run that emits reasoning events under
`reasoning: {supported:false}` has a producer worth a complaint, not a stream worth rejecting" [S9].
Groups: `identity`, `transport`, `tools`, `output`, `state`, `multiAgent`, `reasoning`,
`multimodal` (split `input`/`output`), `execution`, `humanInTheLoop`, `custom`. Notably, **this
version of the spec defines no standard retrieval mechanism** for capabilities — no transport
carries a capabilities exchange; it's a shape, not a discovery protocol [S9][S13].
```typescript
// COMPOSED, adaptive-UI pattern from docs [S9]
const capabilities = await agent.getCapabilities?.()
if (capabilities?.humanInTheLoop?.approvals) enableApprovalWorkflow()
const canStream = capabilities?.transport?.streaming === true  // gate on explicit true
```

### Transports

Only two standard bindings [S15][S16][S17]:

**HTTP + SSE** (mandatory for any HTTP implementation). Request: `POST` with `RunAgentInput` JSON
body, `Content-Type: application/json`, `Accept: text/event-stream`. Response: `200` +
`text/event-stream`; each `data:` line is exactly one JSON event; LF line endings; no resumption
(`Last-Event-ID` unused) — a broken stream needs a brand-new run/`runId`. VERBATIM wire example
[S15]:
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

**HTTP + Protobuf** (optional binary binding): same request; negotiated via
`Accept: application/vnd.ag-ui.event+proto` alongside `text/event-stream`; response frames are
4-byte big-endian length prefix + protobuf bytes, no separators [S16]. **Coverage gap**: only 19 of
36-ish message shapes have a protobuf mapping — `ToolCallResult`, the reasoning family and activity
events have *no* protobuf representation at all and cannot cross this transport with or without
metadata [S5][S7]. Cross-implementation parity ("same bytes for the same event") is pinned by a
shared conformance corpus, not left to each SDK's discretion [S16].

**Custom transports** (WebSockets, message buses) are explicitly out-of-spec but permitted, MUST
preserve ordering/patterns/processing rules, SHOULD document framing/termination [S17]. In
production this shows up as vendor-specific extensions: **AWS Bedrock AgentCore ships both `/
invocations` (SSE) and `/ws` (bidirectional WebSocket) endpoints** for the same AG-UI contract, with
the WS path specifically called out for "interactive agent sessions with user interrupts" [S40] —
i.e., a major cloud vendor already shipped WebSocket support the core spec doesn't standardize.

### Processing model (client pipeline)

Order: **middleware → enforcement (strip unknown, warn) → chunk expansion → verification**.
Enforcement runs identically for SSE and protobuf paths and (as of 1.0, stricter than 0.x) even with
middleware installed [S11][S12]. A malformed *known* field (wrong type) is always fatal, on any
path. This is the practical reading of "tolerant reader, strict writer."

### Minimal Python server (FastAPI + SSE) — VERBATIM from the official quickstart [S22]

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

        yield encoder.encode(TextMessageEndEvent(
            type=EventType.TEXT_MESSAGE_END, message_id=message_id))
        yield encoder.encode(RunFinishedEvent(
            type=EventType.RUN_FINISHED, thread_id=input_data.thread_id, run_id=input_data.run_id))

    return StreamingResponse(event_generator(), media_type=encoder.get_content_type())
```
Same guide's production-shaped variant uses `TextMessageChunkEvent`/`ToolCallChunkEvent`
(auto-expanding shorthand) plus a `try/except` that emits `RunErrorEvent` on failure — the
recommended shape for a real integration rather than the tutorial's explicit Start/Content/End
[S22].

### TypeScript client shape (WebFetch-summarized from the Sept-29-2026 "Developer's Guide"; treat
as paraphrase, verify field names against `@ag-ui/client` before shipping) [S32]:
```typescript
import { HttpAgent } from "@ag-ui/client";
const agent = new HttpAgent({ url: "http://localhost:8000/" });
agent.subscribe({ onEvent: ({ event }) => handleEvent(event) });
agent.addMessage({ id: "msg-1", role: "user", content: "Summarize my notes" });
await agent.runAgent();
```

### Middleware (client-side pipeline, `@ag-ui/client`)

Two flavors — function middleware for stateless transforms, `Middleware` subclass for stateful
[S26]. VERBATIM function middleware example:
```typescript
const loggingMiddleware: MiddlewareFunction = (input, next) => {
  console.log(`[${new Date().toISOString()}] Starting run ${input.runId}`)
  return next.run(input).pipe(
    tap(event => console.log(`Event: ${event.type}`)),
    finalize(() => console.log(`Run ${input.runId} completed`))
  )
}
agent.use(loggingMiddleware)
```
VERBATIM class middleware attaching auth via `forwardedProps` (the sanctioned escape hatch, not a
new field) [S26]:
```typescript
class AuthMiddleware extends Middleware {
  constructor(private apiKey: string, private headerName: string = "Authorization") { super() }
  run(input: RunAgentInput, next: AbstractAgent): Observable<BaseEvent> {
    const authenticatedInput: RunAgentInput = {
      ...input,
      forwardedProps: { ...input.forwardedProps, auth: { headerName: this.headerName, value: `Bearer ${this.apiKey}` } }
    }
    return this.runNext(authenticatedInput, next)
  }
}
```
Built-in: `FilterToolCallsMiddleware({ allowedToolCalls: [...] })` or `disallowedToolCalls` —
**filters what's emitted to the UI, does not prevent upstream execution** (a documented limitation
worth flagging to anyone treating this as a security boundary) [S26].

`compactEvents(events)` collapses Start/Content*/End triads into one event for storage/logs —
useful for cutting replay/analytics volume — but its reordering is **not semantics-preserving in
general**: a `MESSAGES_SNAPSHOT` arriving mid-message replays *after* that message's own events and
silently overwrites content, so avoid interleaving snapshots with open streams if exact replay
matters [S5][S25].

### Framework integration shapes observed in the wild

- **CrewAI** (`ag-ui-crewai`, PyPI, v0.3.0) [S34]:
  ```python
  from crewai.flow.flow import Flow, start
  from ag_ui_crewai import add_crewai_flow_fastapi_endpoint
  from fastapi import FastAPI
  app = FastAPI()
  add_crewai_flow_fastapi_endpoint(app, MyFlow(), "/flow")
  # Conversational (session-aware, turn-based) variant:
  add_crewai_flow_fastapi_endpoint(app, MyConversationalFlow(), "/conversational-flow", conversational=True)
  ```
  Documented gotcha: "Conversational Flow subclasses must re-copy base Flow methods; subclasses
  setting only `conversational = True` inherit no `@start`/`@listen` methods, so steps never
  execute" — a real footgun to flag in the book. Bridge uses capability-based detection (checks for
  `StreamFrame` transport + public turn API) rather than version gating, and fails loudly rather
  than silently degrading if the capability is missing.
- **Microsoft Agent Framework** (.NET, Python, Go) [S37]: `.NET` exposes an `AIAgent` as an AG-UI
  HTTP endpoint via `MapAGUIServer` (ASP.NET Core); Python via `add_agent_framework_fastapi_endpoint`
  wrapping `AgentFrameworkAgent`; Go via `aguiprovider.NewJSONHTTPHandler`. Mapping table:
  `Agent.run()` → HTTP POST, `run(stream=True)` → SSE, `@tool` functions → backend tools, "tool
  approval mode" → human-in-the-loop, conversation history → `threadId`-keyed thread management.
  Terminal `MESSAGES_SNAPSHOT` can be suppressed with `emit_messages_snapshot=False` when the app
  already owns history — otherwise every run rewrites the client's transcript.
- **AWS Bedrock AgentCore** [S40]: containerized AG-UI agent contract — fixed `0.0.0.0:8080`,
  ARM64, `/invocations` (POST, SSE), `/ws` (WebSocket), `/ping` health check
  (`{"status": "Healthy"|"HealthyBusy"}`). Errors are *always* serialized as an in-stream
  `RUN_ERROR` SSE event, distinguishing connection-level failures (real HTTP status: 401/403/409)
  from `AGENT_ERROR` runtime failures (HTTP 200, because the stream already started) — a clean
  illustration of "the stream, once opened, only reports failure in-band," matching the spec's own
  rule that a `RUN_ERROR` after `200 OK` is not a protocol violation [S19][S40].
- **Anthropic (Claude Managed Agents)** [S33]: AG-UI is explicitly framed as "the transport layer"
  while Claude Managed Agents own "session transcripts, tool execution in sandbox environments" —
  a clean separation of concerns between agent runtime and UI wire format that's reusable framing
  for the whole chapter.

## Numbers

- HN "Show HN: AG-UI Protocol" (2025-05-13): 36 points, 5 comments [S42].
- HN "Microsoft Embraces AG-UI Protocol for Agent UI" (2025-11-20): 7 points, 3 comments [S43].
- CopilotKit-reported adoption (as stated in a CopilotKit blog summary, unaudited, self-reported):
  "millions of views for AG-UI content," "tens of thousands of developers building with it,"
  contributions credited to Agno, AWS, LlamaIndex, Alibaba [S31]. **Caveat**: these are the
  vendor's own claims from a launch post, not independently measured — treat as marketing framing,
  not a verified metric.
- Protobuf binding covers only **19 of ~36** message/event shapes generated from the schema;
  `ToolCallResult`, the reasoning family, and activity events have no protobuf mapping at all [S7].
- OpenBot (a CopilotKit-adjacent open-source agent) passed 3,500 GitHub stars by 2026-09-01 [blog
  listing].
- Tool description length limit noted in the generative-UI draft: OpenAI enforces 1024 characters
  for tool descriptions; Gemini and Anthropic impose no such limit (relevant when building a
  `generateUserInterface` frontend tool across providers) [S28].

## Pitfalls, limits, criticism

- **No standard capability discovery.** `AgentCapabilities` is a shape, not a protocol — nothing in
  1.0 says *how* a consumer obtains a declaration (client method? endpoint? static config?). Two
  conforming implementations can differ entirely here, which undercuts capability-based adaptive UI
  as a cross-vendor pattern until an app-specific convention is agreed [S9][S13].
- **Two capability flags describe mechanisms 1.0 doesn't define**: `transport.resumable` (stream
  resume by sequence number) and `transport.pushNotifications` (post-run delivery) — neither HTTP
  binding implements either. An agent MAY declare them for a transport of its own; a consumer MUST
  NOT expect the standard bindings to honor them. Easy to over-trust a capability flag that names a
  feature the wire format can't actually deliver [S13].
- **WebSocket is not a standard binding** despite being the mechanism most engineers assume from
  "bidirectional protocol" branding — it's a "custom transport" that must be independently
  documented per vendor. AWS's own `/ws` endpoint and the general `TransportCapabilities.websocket`
  flag both predate any spec text defining WS framing for AG-UI [S13][S17][S40].
- **Subagent lifecycle events are a hard compatibility break, not a soft one.** Unlike new fields
  (silently stripped by old clients), `SUBAGENT_STARTED/FINISHED/ERROR` are new *event types* an old
  client fails to decode entirely — "there is no way to filter them out client-side." Any producer
  must gate emission behind a flag until every consumer upgrades [S7].
- **`FilterToolCallsMiddleware` is not a security boundary.** It filters what the UI *sees*; it does
  not stop the upstream model/runtime from executing the filtered call. Teams that treat client-side
  tool filtering as an authorization mechanism have a real gap [S26].
- **`compactEvents` reordering can silently corrupt replay** when a `MESSAGES_SNAPSHOT` interrupts
  an open message stream — the snapshot is replayed after the stream's own events and overwrites
  them. Don't compact logs you intend to replay byte-exact [S5][S25].
- **1.0's stricter reasoning discipline can newly fail runs** that used to succeed: an unclosed
  reasoning span/message at `RUN_FINISHED`, or content/end referencing an unopened message, is now
  fatal everywhere (previously inconsistent across paths) — a producer written against the old
  looser rules may regress under a 1.0 client [S11].
- **The .NET binding drops attribution on parallel tool calls from different subagents** when
  converting to `Microsoft.Extensions.AI` messages (merges consecutive tool calls into one
  `ChatMessage`; only the first owner survives) — a known, documented limitation, not a design
  choice [S7].
- **Security is explicitly out of the wire protocol's scope.** The spec states tool arguments and
  results cross a trust boundary and MUST be treated as untrusted input; consent, sandboxing,
  schema validation and audit logging are all left to the implementor. AG-UI gives you the event
  shapes for human-in-the-loop, not the policy — see ch.16 for the security treatment [S21][S20].
- **Low organic developer buzz relative to MCP.** Both flagship HN threads sit at single-digit-to-
  low-double-digit points; adoption so far reads as framework-partnership-driven (LangChain, CrewAI,
  Microsoft, AWS) rather than grassroots — worth naming as a maturity signal distinct from "spec
  quality," which is high [S42][S43].
- **Vendor-reported adoption numbers ("millions of views," "tens of thousands of developers") are
  unaudited** launch-post claims from the protocol's own commercial sponsor (CopilotKit) — treat as
  marketing, cross-check independently before citing as fact [S31].

## What changed in the last 6 months (roughly April–September 2026)

- The entire **interrupt-aware run lifecycle** (`RUN_FINISHED.outcome`, `Interrupt`, `resume[]`) is
  new in 1.0 — before this, HITL was ad hoc per framework (e.g. LangGraph's own
  `CustomEvent(name="on_interrupt")`, still emitted by default for backward compat) [S3][S18].
- **Subagent attribution** (`subagentRunId`, `SUBAGENT_*` events) is entirely new in 1.0 [S7][S18].
- **Reasoning replaces Thinking**: `THINKING_*` retired from the public API; `REASONING_*` family
  added with explicit ZDR/encrypted-reasoning support modeled on OpenAI and Gemini's 2025-era APIs
  [S2][S18].
- **Activity events** (`ACTIVITY_SNAPSHOT`/`ACTIVITY_DELTA`) — structured frontend-only progress UI
  — are new in 1.0 [S18].
- **Binary protobuf transport** specified for the first time (negotiated, 4-byte length-prefixed
  frames, generated from the same schema, byte-parity corpus) [S16][S18].
- **Capabilities moved from three hand-written per-SDK copies into the schema itself**, generated
  for every SDK [S18].
- **Multimodal `FileSource`** (provider file handles) and **`ContentPart[]` tool results** (a tool
  can return an image/PDF/doc, not just a string) are new in 1.0 [S18].
- **Cancelled-run outcome** named explicitly in 1.0 (rather than deferred) specifically so it
  wouldn't silently read as "success" to any consumer that shipped before it existed [S19].
- **Whole ecosystem build-out**: Channels SDK (Aug 2026), CrewAI full compatibility (Aug 2026),
  Mastra full compatibility (Aug 2026), Claude Managed Agents (Aug 2026), Microsoft's own .NET SDK
  contribution (Sep 2026), Inspector devtool + "Automatic Learning" (Sep 2026) — nearly the entire
  practical ecosystem in this chapter shipped in the last two months before 1.0 [S1][S33][S34][S35][S36].
- **The formal specification itself** ("MUST"/"SHOULD" behavioural document, not just a schema) is
  brand new — the single largest change, since before it, correctness was defined only by "what the
  TypeScript client happens to do" [S18][S21].

## Diagram candidates

1. **Agentic protocol triangle** — actors: Application, Agent, Tools/Data, Other Agents; arrows:
   AG-UI (App↔Agent), MCP (Agent↔Tools), A2A (Agent↔Agent). [S1][S30]
2. **Core run sequence diagram** — Application → `RunAgentInput` → Agent; Agent →
   `RUN_STARTED`/events/`RUN_FINISHED` → Application; loop back with next `RunAgentInput` on same
   `threadId`. [S12]
3. **Run state machine** — states: `[*] → Active (RUN_STARTED)`, `Active → Closed (RUN_FINISHED)`,
   `Active → Failed (RUN_ERROR)`, `Closed → Active (new RUN_STARTED)`, `Failed → Active`. [S19]
4. **Text message streaming triad** — Start(messageId, role) → Content*(delta) → End; note
   `TextMessageChunk` shorthand collapsing this. [S2]
5. **Tool call streaming + result** — Start(toolCallId, toolCallName) → Args*(delta) → End →
   (separately, possibly next run) ToolCallResult(messageId, content: string|Part[]). [S2][S20]
6. **State snapshot/delta sync** — Agent emits StateSnapshot (baseline) → loop of StateDelta
   (RFC 6902 ops) → occasional resync Snapshot; client applies via `fast-json-patch`. [S6]
7. **Interrupt/resume round trip across two runs** — Run 1: ...→ StateSnapshot → RunFinished
   {outcome: interrupt, interrupts:[...]}; Client: resolves in UI; Run 2: RunAgentInput{resume:[...]}
   → RunStarted → ToolCallResult → RunFinished{success}. [S3]
8. **Subagent attribution and nesting** — parent run with 3 concurrent subagents (A, B, C); each
   bracketed by SubagentStarted/Finished; attributed TextMessage/ToolCall streams interleaved;
   `parentSubagentRunId` link for nested subagents. [S7]
9. **Reasoning lifecycle with encrypted carry-over** — ReasoningStart → ReasoningMessageStart/
   Content*/End (visible summary) → ReasoningEncryptedValue (opaque blob attached to message/tool
   call) → ReasoningEnd; blob round-trips to next turn without client ever reading it. [S2][S10]
10. **Client processing pipeline** — incoming wire event → Middleware chain → Enforcement (strip
    unknown+warn / fail on malformed) → Chunk expansion → Verification → Application subscriber.
    [S11][S12]
11. **Transport negotiation** — client `Accept: text/event-stream, application/vnd.ag-ui.event+proto`
    → producer picks SSE (default) or protobuf (if admitted with positive quality) → same
    `RunAgentInput` POST either way. [S16][S17]
12. **Ecosystem map / M+N diagram** — N agent frameworks (LangGraph, CrewAI, Mastra, ADK, Strands,
    MS Agent Framework, ...) each implementing one AG-UI bridge; M clients (CopilotKit, assistant-ui,
    terminal, Channels SDK/Slack/Teams) each implementing one AG-UI client — contrast with the M×N
    integration matrix AG-UI replaces. [S1][S31]

**Chart candidates**: HN points/comments for the two found stories (36 pts/5 comments vs 7 pts/3
comments) is a real but very thin data series — not worth a chart on its own; better folded into
prose as a maturity signal. No other independently-verified numeric time series was found in the
available sources (CopilotKit's "millions of views / tens of thousands of developers" are
unquantified, unaudited claims, not a chartable series) [S31][S42][S43].

## Glossary

- **AG-UI**: Agent-User Interaction Protocol — open, event-based wire protocol standardizing how
  agent backends stream to and receive input from user-facing applications.
- **Producer**: whatever emits the AG-UI event stream (agent, proxy, bridge, test double).
- **Consumer**: whatever reads the stream (client SDK, UI, recorder, another proxy).
- **RunAgentInput**: the single request message that opens a run; carries thread/run ids, full
  message history, client tools, context, state, forwardedProps, and resume answers.
- **Run**: the unit of interaction — bounded by `RUN_STARTED` and `RUN_FINISHED`/`RUN_ERROR`.
- **Thread**: a conversation identified by `threadId`, spanning possibly many runs.
- **Snapshot/delta pattern**: full-state replace events (`*_SNAPSHOT`) interleaved with incremental
  RFC 6902 JSON Patch updates (`*_DELTA`).
- **Interrupt**: a structured pause request inside a `RUN_FINISHED` outcome, resolved by a `resume`
  entry on the next run's `RunAgentInput`.
- **Frontend tool**: a tool declared by the *client* in `RunAgentInput.tools`, executed by the
  application, not the agent.
- **Subagent**: a delegated child invocation whose events can be attributed via `subagentRunId`;
  purely an attribution mechanism, not an orchestration one.
- **Activity message**: frontend-only structured progress UI (role `"activity"`), never sent back
  to the model.
- **Capabilities**: an optional, self-declared `AgentCapabilities` object an agent can expose,
  informative only — never binding on the actual event stream.
- **Metadata**: the open-by-key `Record<string, any>` attached to events/messages/tool calls/resume
  entries for out-of-band data (usage, trace ids) — never structural.
- **Chunk event** (`*_CHUNK`): shorthand event type the client auto-expands into the
  Start/Content*/End triad.
- **Tolerant reader, strict writer**: the spec's core evolution rule — producers emit only defined
  shapes; consumers must survive (strip+warn) unrecognized material but fail hard on malformed
  known fields.
- **HttpAgent**: the reference TypeScript transport-only client class (`@ag-ui/client`) with no
  built-in capability discovery.
- **AbstractAgent**: the TypeScript base class all client-side agent implementations extend;
  exposes `runAgent()`, `subscribe()`, `use()` (middleware), `getCapabilities()`.
- **compactEvents**: a client utility that collapses streaming triads into single events for
  storage/replay, with documented reordering caveats.

## Unverified / open questions

- Exact total event-type count: the docs state "36 event types" in one place (subagent protobuf
  coverage note: "19 of the 36 event types") but the schema-reference enum I extracted lists 31
  stable `EventType` values (drafts like `META` excluded, and the count may include deprecated
  `THINKING_*` retained internally or reasoning sub-variants not separately enumerated). I could not
  reconcile 31 vs. 36 from the material gathered — flagged rather than guessed [S7][S18 schema
  reference].
- Could not independently verify CopilotKit's adoption numbers ("millions of views," "tens of
  thousands of developers," contributions from "Agno, AWS, LlamaIndex, and Alibaba") — these come
  from a CopilotKit-authored launch post with no methodology given. Tried: searching for an
  independent source or GitHub star/download count for `@ag-ui/core`/`ag-ui-protocol`; ran out of
  WebSearch budget before finding one. Left as vendor claim only [S31].
- Could not fetch Reddit (blocked: "Claude Code is unable to fetch from www.reddit.com"; old.reddit
  JSON endpoint returned an HTML interstitial instead of JSON via curl) — so no independent
  developer-sentiment sample beyond the two Hacker News threads found. Tried both
  `reddit.com/search.json` (WebFetch) and `old.reddit.com/search.json` (curl); both failed.
- Could not fetch a comparison/positioning article specifically contrasting AG-UI vs. LangGraph's
  own native streaming API, or vs. OpenAI's Apps SDK widget model, beyond the general ChatKit
  overview retrieved (which does not mention AG-UI at all) — this is a gap for the "alternatives and
  competitors" scope item; the chapter draft should treat the comparison as composed from first
  principles (protocol vs. platform-specific stream) rather than sourced commentary.
- Simon Willison / Hamel Husain / Drew Breunig / swyx-style independent practitioner commentary on
  AG-UI specifically was not found within the WebSearch-less research budget available (WebSearch
  quota was exhausted by the parent session before this chapter's research began; all discovery
  after that point relied on curl/WebFetch against known URLs and HN's Algolia API, which cannot
  browse by author). This is a real gap for the "notable practitioners" angle the lens calls for —
  worth a follow-up pass with WebSearch available.
- The CopilotKit blog listing shows the AG-UI 1.0 announcement post's URL slug
  (`big-updates-on-ag-ui`) carrying two different dates in its own metadata — a WebFetch-reported
  "June 2, 2025" page-level date alongside body text describing the September 30, 2026 1.0 release.
  This is very likely a stale `<meta>` publish-date on an updated post (the URL/slug long predates
  1.0 and was probably amended in place), but I could not confirm which date is authoritative from
  the fetched summary alone — flagged rather than silently picking one [S31].

## Sources

All accessed 2026-09-30.

- [S1] "AG-UI Overview" (`/introduction`) + "Agentic Protocols" (`/agentic-protocols`) +
  "What's New" (`/development/updates`, single entry dated 2025-04-09) — docs.ag-ui.com,
  publisher CopilotKit / AG-UI Protocol project, undated page content, retrieved via
  `docs.ag-ui.com/llms-full.txt`. https://docs.ag-ui.com/introduction
- [S2] "Events" — docs.ag-ui.com/concepts/events, undated. https://docs.ag-ui.com/concepts/events
- [S3] "Interrupts" — docs.ag-ui.com/concepts/interrupts, undated.
  https://docs.ag-ui.com/concepts/interrupts
- [S4] "Messages" — docs.ag-ui.com/concepts/messages, undated.
  https://docs.ag-ui.com/concepts/messages
- [S5] "Metadata" — docs.ag-ui.com/concepts/metadata, undated.
  https://docs.ag-ui.com/concepts/metadata
- [S6] "State Management" — docs.ag-ui.com/concepts/state, undated.
  https://docs.ag-ui.com/concepts/state
- [S7] "Subagents" — docs.ag-ui.com/concepts/subagents, undated.
  https://docs.ag-ui.com/concepts/subagents
- [S8] "Tools" — docs.ag-ui.com/concepts/tools, undated. https://docs.ag-ui.com/concepts/tools
- [S9] "Capabilities" — docs.ag-ui.com/concepts/capabilities, undated.
  https://docs.ag-ui.com/concepts/capabilities
- [S10] "Reasoning" — docs.ag-ui.com/concepts/reasoning, undated.
  https://docs.ag-ui.com/concepts/reasoning
- [S11] "Migrating to 1.0" — docs.ag-ui.com/migrating-to-1-0, undated (references the 1.0 release
  of 2026-09-30). https://docs.ag-ui.com/migrating-to-1-0
- [S12] "Architecture" (spec 1.0) — docs.ag-ui.com/spec/1.0/architecture, dated "— 1.0" (2026-09-30
  release). https://docs.ag-ui.com/spec/1.0/architecture
- [S13] "Capabilities" (spec 1.0) — docs.ag-ui.com/spec/1.0/basic/capabilities.
  https://docs.ag-ui.com/spec/1.0/basic/capabilities
- [S14] "Run Input" (spec 1.0) — docs.ag-ui.com/spec/1.0/basic/run-input.
  https://docs.ag-ui.com/spec/1.0/basic/run-input
- [S15] "HTTP + Server-Sent Events" (spec 1.0) — docs.ag-ui.com/spec/1.0/basic/transports/http-sse.
  https://docs.ag-ui.com/spec/1.0/basic/transports/http-sse
- [S16] "HTTP + Protobuf" (spec 1.0) — docs.ag-ui.com/spec/1.0/basic/transports/http-protobuf.
  https://docs.ag-ui.com/spec/1.0/basic/transports/http-protobuf
- [S17] "Transports" (spec 1.0, index) — docs.ag-ui.com/spec/1.0/basic/transports/index.
  https://docs.ag-ui.com/spec/1.0/basic/transports/index
- [S18] "Key Changes" (spec 1.0 changelog) — docs.ag-ui.com/spec/1.0/changelog.
  https://docs.ag-ui.com/spec/1.0/changelog
- [S19] "Runs and Steps" (spec 1.0) — docs.ag-ui.com/spec/1.0/events/lifecycle.
  https://docs.ag-ui.com/spec/1.0/events/lifecycle
- [S20] "Tool Calls" (spec 1.0) — docs.ag-ui.com/spec/1.0/events/tool-calls.
  https://docs.ag-ui.com/spec/1.0/events/tool-calls
- [S21] "Specification" (spec 1.0 index, incl. Security and Trust & Safety) —
  docs.ag-ui.com/spec/1.0/index. https://docs.ag-ui.com/spec/1.0/index
- [S22] "Server" quickstart — docs.ag-ui.com/quickstart/server, undated.
  https://docs.ag-ui.com/quickstart/server
- [S23] "Build applications" / "Build clients" quickstarts — docs.ag-ui.com/quickstart/applications,
  docs.ag-ui.com/quickstart/clients, undated. https://docs.ag-ui.com/quickstart/clients
- [S24] "AbstractAgent" (JS SDK reference) — docs.ag-ui.com/sdk/js/client/abstract-agent, undated.
  https://docs.ag-ui.com/sdk/js/client/abstract-agent
- [S25] "Stream Compaction" (JS SDK reference) — docs.ag-ui.com/sdk/js/client/compaction, undated.
  https://docs.ag-ui.com/sdk/js/client/compaction
- [S26] "Middleware" (JS SDK reference) — docs.ag-ui.com/sdk/js/client/middleware, undated.
  https://docs.ag-ui.com/sdk/js/client/middleware
- [S27] "Meta Events" (draft proposal) — docs.ag-ui.com/drafts/meta-events, author Markus Ecker.
  https://docs.ag-ui.com/drafts/meta-events
- [S28] "Generative User Interfaces" (draft proposal) — docs.ag-ui.com/drafts/generative-ui, author
  Markus Ecker. https://docs.ag-ui.com/drafts/generative-ui
- [S29] "Generative UI" (concepts, A2UI/MCP-UI/Open-JSON-UI comparison) —
  docs.ag-ui.com/concepts/generative-ui-specs. https://docs.ag-ui.com/concepts/generative-ui-specs
- [S30] "MCP, A2A, and AG-UI" — docs.ag-ui.com/agentic-protocols, undated.
  https://docs.ag-ui.com/agentic-protocols
- [S31] "Big Updates on AG-UI" (AG-UI 1.0 launch post) — CopilotKit Blog, authors Anmol Baranwal &
  Eli Berman; page metadata shows a 2025-06-02 date though body content describes the 2026-09-30
  1.0 release (see Unverified). https://www.copilotkit.ai/blog/big-updates-on-ag-ui
- [S32] "The Developer's Guide to the AG-UI Protocol" — CopilotKit Blog, author Anmol Baranwal,
  2026-09-29. https://www.copilotkit.ai/blog/developers-guide-to-the-ag-ui-protocol
- [S33] "Claude Managed Agents are now AG-UI compatible" — CopilotKit Blog, author Eli Berman,
  2026-08-12. https://www.copilotkit.ai/blog/claude-managed-agents-agui-compatible
- [S34] "CrewAI is now fully AG-UI compatible" — CopilotKit Blog, authors Jerel Velarde & Eli
  Berman, 2026-08-18. https://www.copilotkit.ai/blog/crewai-is-fully-agui-compatible
- [S35] "New and improved Inspector: DevTools for AI Agents, now with Automatic Learning" —
  CopilotKit Blog, authors Anmol Baranwal & Eli Berman, 2026-09-10.
  https://www.copilotkit.ai/blog/inspector-upgrades
- [S36] "Introducing Channels SDK - Bring Any Agent to Any Channel" — CopilotKit Blog, authors Anmol
  Baranwal & Nathan Tarbert, 2026-08-04. https://www.copilotkit.ai/blog/channels-sdk
- [S37] "AG-UI Integration with Agent Framework" — Microsoft Learn, author moonbox3 (ms.author
  evmattso), `ms.date: 2026-09-08`, updated 2026-09-15.
  https://learn.microsoft.com/en-us/agent-framework/integrations/ag-ui/
- [S38] Assistant-UI homepage/docs — assistant-ui.com, undated. https://www.assistant-ui.com/
- [S39] "ChatKit" guide — OpenAI developer docs, undated (redirected from
  platform.openai.com/docs/guides/chatkit). https://developers.openai.com/api/docs/guides/chatkit
- [S40] "AG-UI protocol contract" — AWS Bedrock AgentCore Developer Guide, undated.
  https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-agui-protocol-contract.html
- [S41] "AI SDK UI Message Stream Protocol" — Vercel AI SDK docs, undated.
  https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol
- [S42] "Show HN: AG-UI Protocol – Bring Agents into Frontend Applications" — Hacker News, submitted
  by swiftlyTyped, 2025-05-13, 36 points / 5 comments.
  https://news.ycombinator.com/item?id=43974484
- [S43] "Microsoft Embraces AG-UI Protocol for Agent UI" — Hacker News, submitted by swiftlyTyped,
  2025-11-20, 7 points / 3 comments (linking learn.microsoft.com).
  https://news.ycombinator.com/item?id=45994035
- [S44] AG-UI GitHub repository README — github.com/ag-ui-protocol/ag-ui, undated, retrieved via
  raw.githubusercontent.com. https://github.com/ag-ui-protocol/ag-ui
