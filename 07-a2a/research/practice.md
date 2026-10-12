# 07. A2A: Agent2Agent — Engineering Practice notes

## TL;DR (engineer must know today, 2026-09-30)

- A2A is the open protocol for **peer agent-to-agent** collaboration across organizational/vendor
  boundaries; it does **not** replace MCP, which is for agent-to-tool. Standard framing: "MCP is
  vertical (agent→tool), A2A is horizontal (agent↔agent)" [S6][S7].
- Current stable spec: **v1.0.1** (2026-05-26), building on **v1.0.0** (2026-03-12, first stable,
  many breaking changes from 0.3), which followed **v0.3.0** (2025-07-30) and the 0.2.x line
  starting 0.2.2 (2025-06-09, added gRPC+REST bindings) [S2][S3].
- Governance: Google announced A2A April 9, 2025 [S12] → donated to **Linux Foundation** June 23,
  2025 (AWS, Cisco, Google, Microsoft, Salesforce, SAP, ServiceNow as founding partners) [S13] →
  **IBM's Agent Communication Protocol (ACP) merged into A2A**, repo archived Aug 27, 2025 [S14] →
  A2A itself joined the new **Agentic AI Foundation (AAIF)** Aug 17, 2026, the same LF-hosted body
  that already hosts **MCP** (from Anthropic), **goose** (from Block) and **AGENTS.md** (from
  OpenAI) since AAIF's Dec 9, 2025 founding — i.e. as of Aug 2026, A2A and MCP sit under one
  governance roof [S23][S24].
- Canonical data model is **Protocol Buffers**; JSON-RPC 2.0, gRPC and HTTP+JSON/REST are three
  *bindings* of one abstract operation set, generated via gRPC's `google.api.http` transcoding
  annotations from a single `.proto` source — not three independently-specified protocols [S4][S5].
- Core objects: **AgentCard** (capability/discovery doc), **Task** (stateful unit of work with a
  lifecycle), **Message** (turn, made of **Part**s: text/file/data), **Artifact** (task output,
  distinct from a message so results ≠ chat turns), **contextId** (groups Tasks+Messages into one
  logical conversation across possibly-concurrent tasks) [S4].
- Task states (proto-verbatim): `SUBMITTED → WORKING → COMPLETED|FAILED|CANCELED|REJECTED`, with
  interrupt states `INPUT_REQUIRED` and `AUTH_REQUIRED` [S5]. Once terminal, a task is immutable —
  follow-ups go through a new task referencing it (`referenceTaskIds`), not a re-open [S4][S11].
- Well-known discovery path is `/.well-known/agent-card.json` **since v0.2.6** (renamed from
  `agent.json`) [S2][S8] — but plenty of ecosystem docs/tools published in late 2025/2026 still say
  or use `agent.json` [S17][S21]; verify which your framework/library actually requests.
- Opacity is a first-class design principle, not an afterthought: agents share **declared
  capabilities**, not internals, memory, or tool implementations — this is what lets A2A be used
  across competing companies at all [S6][S9].
- Update delivery is a 3-way choice per interaction, declared as AgentCard capabilities: **poll**
  (`tasks/get`), **stream** (SSE via `message:stream` / `tasks/resubscribe`), or **push**
  (server POSTs a webhook with the same `StreamResponse` envelope as streaming) [S4].
- Extensions are the sanctioned way to add domain behavior (payments, tracing, custom skills)
  without forking the core spec: declared as URIs in `AgentCard.capabilities.extensions`, opted
  into per-request by the client. **AP2 (Agent Payments Protocol)** is built exactly this way, as
  an A2A extension (cross-link: ch.10 agentic-commerce) [S10][S16].
- Real, current (Sept 2026) production-grade client code exists in mainstream frameworks: Microsoft
  Agent Framework's `A2AAgent` gives you continuation tokens for long-running tasks, SSE stream
  reconnection, and `contextId`/`taskId` persisted in session state — this is the shape production
  A2A client code takes today, in C#, Python and Go [S17].
- Practitioner skepticism from day one (HN, 280 comments on the launch post) centered on: vendor
  "moat"/consulting-badge concerns (KPMG/Accenture/BCG/PwC as launch partners), "just JSON-RPC over
  HTTP, why a new protocol", and difficulty finding real wire examples — a criticism the spec has
  since addressed by putting verbatim HTTP examples directly in the spec text [S22][S4].

## Current state and versions (as of 2026-09-30)

| Item | Value | Source |
|---|---|---|
| Latest spec version | 1.0.1 (2026-05-26) | [S2][S3] |
| First stable (1.0) release | 2026-03-12 | [S2] |
| Governance | Linux Foundation → Agentic AI Foundation (AAIF), joined 2026-08-17 | [S23] |
| Canonical schema source | `specification/a2a.proto` (Protocol Buffers) | [S5] |
| Well-known Agent Card path | `/.well-known/agent-card.json` (since 0.2.6, 2025-07-17) | [S2][S8] |
| Official bindings | JSON-RPC 2.0, gRPC, HTTP+JSON/REST, + custom bindings allowed | [S4] |
| Python SDK | `a2a-sdk` on PyPI, extras `[http-server]`, `[grpc]`, `[all]` | [S19] |
| Official SDK languages | Python, JS/TS (`@a2a-js/sdk`), Java, Go, .NET (`A2A` NuGet), Rust (`a2a-rs`) | [S1] |
| ACP (IBM) status | Merged into A2A; `i-am-bee/acp` archived 2025-08-27 | [S14] |
| AP2 (Google payments ext.) | v0.2, donated to FIDO Alliance for standardization, built as an A2A extension | [S16] |

## Timeline

- **2025-04-09** — Google announces A2A publicly with 50+ launch partners (Atlassian, Box, Cohere,
  LangChain, MongoDB, PayPal, Salesforce, SAP, ServiceNow, Workday, + SIs Accenture/BCG/Capgemini/
  Deloitte/KPMG/McKinsey/PwC/TCS/Wipro) [S12].
- **2025-06** — 0.2.x line: 0.2.0 → 0.2.6. Notable: 0.2.2 (2025-06-09) adds gRPC and REST bindings
  to what had been JSON-RPC-only, and adds the extension mechanism; 0.2.5 (2025-06-30) makes
  protocol version a **required** AgentCard field and adds multi-config push notifications; 0.2.6
  (2025-07-17) **renames** the well-known URI from `agent.json` to `agent-card.json`, adds mTLS to
  security schemes, and adds `AgentCard.signatures` (JWS-signed cards) [S2].
- **2025-06-23** — Google donates A2A to the Linux Foundation at Open Source Summit NA; AWS and
  Cisco join as new "validators"; 100+ companies now support the project [S13].
- **2025-07-30** — v0.3.0 ships [S3].
- **2025-08-27** — IBM/BeeAI's `i-am-bee/acp` repo archived; ACP "is now part of A2A under the
  Linux Foundation" [S14].
- **2025-09** — Google publishes **AP2** (Agent Payments Protocol) v0.2 as an A2A extension, later
  donates it to the FIDO Alliance [S16] (deep dive: ch.10).
- **2025-12-09** — Linux Foundation announces the **Agentic AI Foundation (AAIF)**, anchored by
  contributed projects **MCP** (Anthropic), **goose** (Block), **AGENTS.md** (OpenAI); platinum
  members include AWS, Anthropic, Block, Bloomberg, Cloudflare, Google, Microsoft, OpenAI; 18 gold
  members (incl. IBM, Oracle, Salesforce, Snowflake), 21 silver (incl. Hugging Face, Uber, Zapier)
  [S24].
- **2026-03-12** — **A2A v1.0.0**, the first stable release: canonical proto model formalized;
  breaking changes include non-complex IDs in requests, `TaskState`/enum spelling standardized to
  American English ("canceled"), `tasks/list` with pagination added, OAuth2 flows modernized
  (device code + PKCE added, implicit/password removed), native gRPC multi-tenancy via a `tenant`
  scope field [S2].
- **2026-05-26** — v1.0.1 patch: `application/a2a+json` preferred as the HTTP binding content type;
  `TaskStatus` value fixes [S2].
- **2026-08-17** — **A2A joins AAIF**, consolidating governance for the "open agentic stack"
  (AGENTS.md → goose → MCP → agentgateway → A2A) under one Linux-Foundation-hosted body [S23].

## Mechanics

### Protocol architecture (3-layer model)

Per the spec's own framing [S4]:
1. **Canonical Data Model** — the `.proto` definitions are the normative source of truth, not any
   one binding's JSON schema.
2. **Abstract Operations** — binding-independent capabilities (SendMessage, GetTask, CancelTask…).
3. **Protocol Bindings** — concrete mappings to JSON-RPC, gRPC, HTTP+JSON/REST, or a custom binding
   (custom bindings are permitted but MUST be functionally equivalent to the core model).

The REST binding is not hand-written separately — it is generated from the same `.proto` file via
gRPC-transcoding HTTP annotations. VERBATIM [S5] (`specification/a2a.proto`):

```protobuf
service A2AService {
  rpc SendMessage(SendMessageRequest) returns (SendMessageResponse) {
    option (google.api.http) = {
      post: "/message:send"
      body: "*"
      additional_bindings: { post: "/{tenant}/message:send" body: "*" }
    };
  }
  rpc SendStreamingMessage(SendMessageRequest) returns (stream StreamResponse) {
    option (google.api.http) = {
      post: "/message:stream"
      body: "*"
      additional_bindings: { post: "/{tenant}/message:stream" body: "*" }
    };
  }
  rpc GetTask(GetTaskRequest) returns (Task) {
    option (google.api.http) = {
      get: "/tasks/{id=*}"
      additional_bindings: { get: "/{tenant}/tasks/{id=*}" }
    };
    option (google.api.method_signature) = "id";
  }
  // ...ListTasks, CancelTask, push-notification-config CRUD, GetExtendedAgentCard...
}
```
Practical implication: implementing one binding correctly against the proto gives you the others
"for free" via codegen — this is why the SDKs ship `[grpc]`/`[http-server]` as installable extras
rather than separate libraries [S19].

### Core objects, verbatim from the proto [S5]

`TaskState` enum (numeric values matter for wire compat across SDKs):
```protobuf
enum TaskState {
  TASK_STATE_UNSPECIFIED = 0;
  TASK_STATE_SUBMITTED = 1;
  TASK_STATE_WORKING = 2;
  TASK_STATE_COMPLETED = 3;   // terminal
  TASK_STATE_FAILED = 4;      // terminal
  TASK_STATE_CANCELED = 5;    // terminal
  TASK_STATE_INPUT_REQUIRED = 6;  // interrupted
  TASK_STATE_REJECTED = 7;    // terminal
  TASK_STATE_AUTH_REQUIRED = 8;   // interrupted
}
```
`AgentCard` (fields, abbreviated, all VERBATIM comments from proto) [S5]:
```protobuf
message AgentCard {
  string name = 1;                                   // REQUIRED
  string description = 2;                             // REQUIRED
  repeated AgentInterface supported_interfaces = 3;    // REQUIRED, ordered, first = preferred
  AgentProvider provider = 4;
  string version = 5;                                  // REQUIRED, e.g. "1.0.0"
  optional string documentation_url = 6;
  AgentCapabilities capabilities = 7;                  // REQUIRED
  map<string, SecurityScheme> security_schemes = 8;
  repeated SecurityRequirement security_requirements = 9;
  repeated string default_input_modes = 10;            // REQUIRED, media types
  repeated string default_output_modes = 11;           // REQUIRED
  repeated AgentSkill skills = 12;                      // REQUIRED
  repeated AgentCardSignature signatures = 13;          // JWS signatures over the card (RFC 7515)
  optional string icon_url = 14;
}
```
`AgentCapabilities` carries three independently-declared optional feature flags — `streaming`,
`push_notifications`, `extended_agent_card` — plus `repeated AgentExtension extensions`. A client
**must** check these before calling the matching operation; calling an undeclared capability is a
spec-mandated error, not just bad practice (`PushNotificationNotSupportedError`,
`UnsupportedOperationError`, `ExtensionSupportRequiredError`) [S4][S5].

`AgentCardSignature` follows RFC 7515 JWS JSON serialization — `protected` (base64url JWS header),
`signature` (base64url), optional unprotected `header` — this is the mechanism for **signed agent
cards** the chapter scope asks about: a card is signable end-to-end, and multiple signatures can be
attached (`repeated`) [S5].

### Task lifecycle and Message-vs-Task decision

Per `docs/topics/life-of-a-task.md` [S11], every incoming message gets one of two response shapes:
- **Stateless `Message`** — no further state; use for trivial/negotiation turns.
- **Stateful `Task`** — runs a lifecycle, can require input, is trackable, asynchronous.

Agents cluster into three practical archetypes:
- **Message-only agents** — thin LLM/tool wrappers, always reply with `Message`, use `contextId`
  only.
- **Task-generating agents** — always reply with `Task`, even for trivial calls (simpler contract,
  costs a completed-task object for every interaction).
- **Hybrid agents** — negotiate with `Message`s, commit to a `Task` once there's real work; this is
  what most production agents should do per the docs' own recommendation [S11].

`contextId` is server-issued on first contact and groups everything (multiple concurrent Tasks +
loose Messages) that belongs to one logical conversation; `taskId` identifies one specific unit of
tracked work. A follow-up either continues a task (same `taskId`) or references it loosely
(`referenceTaskIds` on a new `Message`) to ask for a refinement without reopening a terminal task —
terminal tasks (`COMPLETED/FAILED/CANCELED/REJECTED`) are **immutable**, cannot accept further
messages [S4][S11].

### Minimal Python server + client — COMPOSED-from-VERBATIM (source: `a2a-samples`, helloworld,
current against the 1.0-era `a2a-sdk` API) [S18]

Server (`__main__.py`, abbreviated, comments trimmed):
```python
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.routes import create_agent_card_routes, create_jsonrpc_routes
from a2a.server.tasks import InMemoryTaskStore
from a2a.types import AgentCapabilities, AgentCard, AgentInterface, AgentSkill
from starlette.applications import Starlette
import uvicorn

skill = AgentSkill(
    id='echo_bot', name='Echo Bot',
    description='An example agent that acknowledges client request and responds with a "Hello World" message.',
    input_modes=['text/plain'], output_modes=['text/plain'],
    tags=['a2a', 'echo-example'], examples=['hi', 'how are you'],
)
public_agent_card = AgentCard(
    name='Hello World Agent', description='Just a hello world agent', version='0.0.1',
    default_input_modes=['text/plain'], default_output_modes=['text/plain'],
    capabilities=AgentCapabilities(streaming=True, extended_agent_card=True),
    supported_interfaces=[AgentInterface(protocol_binding='JSONRPC', url='http://127.0.0.1:9999', protocol_version='1.0')],
    skills=[skill],
)
request_handler = DefaultRequestHandler(
    agent_executor=HelloWorldAgentExecutor(), task_store=InMemoryTaskStore(),
    agent_card=public_agent_card, extended_agent_card=extended_agent_card,
)
routes = create_agent_card_routes(public_agent_card) + create_jsonrpc_routes(request_handler, '/')
app = Starlette(routes=routes)
uvicorn.run(app, host='127.0.0.1', port=9999)
```
Executor (`agent_executor.py`) — the shape every A2A server implementation follows: pull/create the
`Task` from `RequestContext`, emit a `TaskUpdater.update_status(WORKING)`, do the actual agent work,
`add_artifact(...)`, then `update_status(COMPLETED)`:
```python
class HelloWorldAgentExecutor(AgentExecutor):
    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        task = context.current_task or new_task_from_user_message(context.message)
        if not context.current_task:
            await event_queue.enqueue_event(task)
        task_updater = TaskUpdater(event_queue=event_queue, task_id=task.id, context_id=task.context_id)
        await task_updater.update_status(state=TaskState.TASK_STATE_WORKING, message=new_text_message('Processing request...'))
        result = await self.agent.invoke(user_request=get_message_text(context.message))
        await task_updater.add_artifact(parts=[new_text_part(text=result, media_type='text/plain')])
        await task_updater.update_status(state=TaskState.TASK_STATE_COMPLETED, message=new_text_message('Request is completed!'))

    async def cancel(self, context, event_queue):
        raise NotImplementedError('Cancel is not supported.')
```
Client (`test_client.py`) — discovery + both call modes:
```python
async with httpx.AsyncClient() as httpx_client:
    resolver = A2ACardResolver(httpx_client=httpx_client, base_url='http://127.0.0.1:9999')
    public_agent_card = await resolver.get_agent_card()

config = ClientConfig(streaming=False)
client = await create_client(agent=public_agent_card, client_config=config)
message = new_text_message(text_query, role=Role.ROLE_USER)
async for chunk in client.send_message(SendMessageRequest(message=message)):
    print(chunk)

# streaming variant: ClientConfig(streaming=True) → same send_message call, chunks are
# Task / TaskStatusUpdateEvent / TaskArtifactUpdateEvent as they arrive over SSE
```
Note: `pip install a2a-sdk` (extras `[http-server]`, `[grpc]`, `[all]`); run via
`uv run samples/python/agents/helloworld` per the samples README [S18][S19].

### Wire examples — VERBATIM from `docs/specification.md` [S4]

Basic non-streaming call (HTTP+JSON REST binding):
```http
POST /message:send HTTP/1.1
Host: agent.example.com
Content-Type: application/a2a+json
Authorization: Bearer token

{
  "message": {
    "role": "ROLE_USER",
    "parts": [{"text": "What is the weather today?"}],
    "messageId": "msg-uuid"
  }
}
```
```http
HTTP/1.1 200 OK
Content-Type: application/a2a+json

{
  "task": {
    "id": "task-uuid",
    "contextId": "context-uuid",
    "status": {"state": "TASK_STATE_COMPLETED"},
    "artifacts": [{
      "artifactId": "artifact-uuid",
      "name": "Weather Report",
      "parts": [{"text": "Today will be sunny with a high of 75°F"}]
    }]
  }
}
```
Streaming call — SSE frames carry the same `task`/`statusUpdate`/`artifactUpdate` union:
```http
POST /message:stream HTTP/1.1
...
```
```
HTTP/1.1 200 OK
Content-Type: text/event-stream

data: {"task": {"id": "task-uuid", "contextId": "context-uuid", "status": {"state": "TASK_STATE_WORKING"}}}

data: {"artifactUpdate": {"taskId": "task-uuid", "contextId": "context-uuid", "artifact": {"parts": [{"text": "# Climate Change Report\n\n"}]}}}

data: {"statusUpdate": {"taskId": "task-uuid", "contextId": "context-uuid", "status": {"state": "TASK_STATE_COMPLETED"}}}
```
Multi-turn (agent asks a clarifying question via `INPUT_REQUIRED`, client replies with same
`taskId`):
```json
{"task": {"id": "task-uuid", "status": {"state": "TASK_STATE_INPUT_REQUIRED",
  "message": {"role": "ROLE_AGENT", "parts": [{"text": "I need more details. Where would you like to fly from and to?"}]}}}}
```
```json
{"message": {"taskId": "task-uuid", "role": "ROLE_USER", "parts": [{"text": "From San Francisco to New York"}], "messageId": "msg-2"}}
```
Version negotiation failure (client sends unsupported `A2A-Version: 0.5`):
```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://a2a-protocol.org/errors/version-not-supported",
  "title": "Protocol Version Not Supported",
  "status": 400,
  "detail": "The requested A2A protocol version 0.5 is not supported by this agent",
  "supportedVersions": ["0.3"]
}
```
Push-notification webhook payload — identical envelope to a streaming chunk, POSTed instead of
pushed over SSE:
```http
POST {webhook_url}
Authorization: {authentication_scheme} {credentials}
Content-Type: application/a2a+json

{ "statusUpdate": { /* TaskStatusUpdateEvent */ } }
```
Server MUST deliver at least once; MAY retry with backoff; client MUST ack with 2xx and process
idempotently (duplicates possible) [S4].

Extension declaration example in an AgentCard, VERBATIM [S10]:
```json
{
  "name": "Magic 8-ball",
  "capabilities": {
    "streaming": true,
    "extensions": [{
      "uri": "https://example.com/ext/konami-code/v1",
      "description": "Provide cheat codes to unlock new fortunes",
      "required": false,
      "params": {"hints": ["..."]}
    }]
  }
}
```
Official extensions live under `https://a2a-protocol.org/extensions/{name}/v1` URIs, hosted as
`a2aproject/ext-*` repos (experimental ones as `experimental-ext-*`), with a formal governance
process for tiers/lifecycle/SDK support [S10].

### Discovery (3 strategies, from `docs/topics/agent-discovery.md`) [S8]

1. **Well-known URI** — `GET https://{domain}/.well-known/agent-card.json` (RFC 8615-style). Best
   for public/broadly-discoverable agents.
2. **Curated registries** — a catalog service holding AgentCards, queried by skill/tag/provider.
   The spec explicitly does **not** standardize a registry API yet ("current A2A specification does
   not prescribe a standard API for curated registries") [S8].
3. **Direct configuration** — hardcoded URL/config, for tightly-coupled or dev setups.

Securing cards: use the **authenticated Extended Agent Card** to hide sensitive skills/URLs from
anonymous callers; protect the well-known endpoint itself with mTLS/IP allowlisting/OAuth if it
carries sensitive info; a registry can do selective disclosure per caller identity. Spec explicitly
recommends out-of-band dynamic credentials over embedding static secrets in the card [S8]. Caching:
servers SHOULD send `Cache-Control`/`ETag` (derived from `version` or a content hash); clients
SHOULD do conditional GETs, not unconditional re-fetch [S8].

### A2A ↔ MCP: how they combine [S6][S7]

Framing from the official docs: MCP standardizes agent↔tool (calculators, DB APIs — structured,
narrow); A2A standardizes agent↔agent (autonomous, multi-turn, opaque peers). Canonical composed
architecture, the "auto repair shop" example: user ↔ Shop-Manager agent over **A2A**; Manager ↔
Mechanic agent over **A2A**; Mechanic ↔ diagnostic-scanner/repair-manual/lift tools over **MCP**.
"An agentic application might use A2A to communicate with other agents. Inside, each agent uses MCP
to work with its own tools and resources." [S7]

Counterpoint from practice: Microsoft published "Can You Build Agent2Agent Communication on MCP?
Yes" (devblogs.microsoft.com, 2025-07-23) — evidence the boundary is contested in practice, not
purely technical; teams have shipped agent-to-agent flows over plain MCP rather than adopt a second
protocol. (Title/date only verified here; not fetched in full — treat as a pointer, cross-check
before citing content.) [S9-note in Unverified]

### Production concerns (from `docs/topics/enterprise-ready.md`, direct spec guidance) [S9]

- **TLS**: HTTPS mandatory in production, TLS ≥1.2, client verifies server cert chain.
- **AuthN**: delegated entirely to HTTP-layer mechanisms (OAuth2, OIDC, API key, mTLS) — **no
  identity in the A2A payload itself**. AgentCard's `security_schemes`/`security_requirements`
  declare what's needed (aligned with OpenAPI's security-scheme shape). Missing/invalid creds →
  `401` with `WWW-Authenticate`; valid-but-insufficient → `403`.
- **In-task secondary auth**: if a task needs a *different* system's credentials mid-flight, the
  server signals `TASK_STATE_AUTH_REQUIRED` and the client fetches those out-of-band (e.g. an OAuth
  flow) and resumes — the protocol carries the *signal*, never the actual secret flow.
- **AuthZ**: server-side, per-skill; "specific OAuth scopes SHOULD grant access to certain skills
  but not others" — i.e. model your skills as your authorization boundary, not just your API
  surface.
- **Tracing**: propagate W3C Trace Context over standard HTTP headers; log `taskId`, `sessionId`,
  correlation ID, trace context on both sides.
- **Metrics**: request rate, error rate, task-processing latency, resource utilization exposed by
  the server.
- **Versioning** (§3.6 of spec) [S4]: client sends `A2A-Version: 1.0` header (or query param) on
  every request; server MUST honor that Major.Minor's semantics or return
  `VersionNotSupportedError`; empty header = assume 0.3 (legacy default, a real footgun if you
  silently point an old client at a 1.0-only server); patch versions never participate in
  negotiation. Clients wanting the newest features should pin a version explicitly rather than
  relying on auto-fallback, "to prevent silently losing functionality" [S4].
- **Errors**: every binding must convey {code, human message, structured details}; A2A-specific
  named errors (`TaskNotFoundError`, `TaskNotCancelableError`, `PushNotificationNotSupportedError`,
  `UnsupportedOperationError`, `ContentTypeNotSupportedError`, `InvalidAgentResponseError`,
  `ExtendedAgentCardNotConfiguredError`, `ExtensionSupportRequiredError`,
  `VersionNotSupportedError`) map onto binding-native codes (e.g. `404`/`NOT_FOUND`/custom JSON-RPC
  code across REST/gRPC/JSON-RPC respectively) [S4]. Servers MUST NOT distinguish "not found" from
  "not authorized" in responses (avoid resource-existence leakage).
- **Long-running tasks in a real client SDK** (Microsoft Agent Framework, C#/Python/Go, doc dated
  2026-09-16/21 — the most current cross-language treatment found) [S17]: request with
  `AllowBackgroundResponses=true` → server may return a **continuation token** instead of blocking;
  poll by re-`Run`-ing with that token; for streaming, capture `update.ContinuationToken` and use it
  to **reconnect from the start of the stream** (explicitly *not* resumption from a specific point —
  a real limitation to design around); `contextId`/`taskId`/`task_state` are persisted together in
  session state so a follow-up correctly continues an `INPUT_REQUIRED` task or references a
  completed one via `referenceTaskIds`.
- Same doc: **HTTP+JSON is preferred by default over JSON-RPC** by this client when an agent
  advertises both bindings — worth knowing since most A2A intros (including A2A's own README) still
  foreground JSON-RPC as *the* transport [S1][S17].

### Framework / platform support (verified Sept 2026)

| Framework | A2A support | Evidence |
|---|---|---|
| Google ADK | Bidirectional: expose ADK agent as A2A server, or consume a remote A2A agent; Python/Go/Java/Kotlin quickstarts; marked **Experimental** | [S20] |
| Microsoft Agent Framework | `A2AAgent` wraps any A2A endpoint as a standard `AIAgent`; C#/Python/Go all documented with discovery, streaming, background responses, auth interceptor | [S17] |
| a2a-samples / official SDKs | Python, JS, Java, Go, .NET, Rust SDKs maintained under `a2aproject` org, plus `a2a-inspector` (validation tool), `a2a-cli`, `a2a-tck`/`a2a-itk` (conformance/integration test kits), `a2a-gateway` (bridges A2A to other comms channels) | [S25] |
| CrewAI, Pydantic AI | Claimed by third-party aggregators (OpenAgents) to be A2A-compatible via community adapters, but **no first-party CrewAI or Pydantic AI doc page for A2A was found/loadable** as of this research pass — treat as **unverified**, check current docs before citing | [S21] / see Unverified |
| AWS Bedrock AgentCore | Referenced in ecosystem discussion but the specific integration blog post could not be loaded (404) in this pass — **unverified**, re-check | see Unverified |

## Numbers

- **50+** launch partners named in the April 2025 announcement, plus major SIs (Accenture, BCG,
  Capgemini, Deloitte, KPMG, McKinsey, PwC, TCS, Wipro) [S12] — measured by Google's own post, count
  of named logos.
- **100+** companies supporting A2A by the June 2025 LF donation [S13].
- **150+** organizations backing A2A by Aug 2026 per AAIF [S23].
- AAIF membership tiers at Dec 2025 founding: **8 platinum**, **18 gold**, **21 silver** members —
  named individually in the press release [S24].
- HN launch thread: **450 points / 280 comments** (2025-04-09) — by far the largest engagement
  signal found for any A2A-specific story; no 2026 A2A story in this research matched that
  engagement level, suggesting discourse has normalized/moved to specific integrations rather than
  the protocol itself [measured via HN Algolia API, this session].
- Release cadence: 11 tagged releases from `v0.1.0` to `v1.0.1` between (first tag, undated in API
  response) and 2026-05-26; the 0.2.x line alone had 7 releases in ~6 weeks (2025-05-27 to
  2025-07-30), then a ~7.5-month gap to v1.0.0 (2026-03-12) — read as: rapid early iteration, then a
  deliberate stabilization period before calling it 1.0 [S3].

## Pitfalls, limits, criticism

- **"Just JSON-RPC/REST, why a protocol"** — recurring HN criticism (2025-04-09 thread): several
  commenters argued A2A/MCP just wrap ordinary HTTP RPC and add ecosystem lock-in risk rather than
  technical necessity; one direct quote: *"At the end of the day we are talking about RPC. A named
  method, with known arguments, over the wire... We are so cooked."* [S22]. Countervailing view in
  the same thread from an A2A team member (`TS_Posts`): A2A is "a conduit for agents to speak in
  their native modalities," with `Message`/`Artifact` split specifically to separate
  content-in-progress from final output [S22].
- **Vendor-consortium optics** — the long list of enterprise-consulting launch partners (KPMG,
  Accenture, BCG, PwC) was itself read by practitioners as a red flag ("the last people i would
  trust with software development") rather than a credibility signal — worth knowing when pitching
  A2A internally: the marketing framing can work against technical adoption [S22].
- **Well-known-path drift**: the official path changed `agent.json` → `agent-card.json` in 0.2.6
  (2025-07-17), but a Dec 2025 third-party integration post (OpenAgents) documents `agent.json`,
  and Microsoft's own Sept 2026 doc uses `agent-card.json` in the C# section while its **own Python
  section text** still says "the standard well-known path (`/.well-known/agent.json`)" [S17][S21] —
  i.e. even a first-party 2026 doc is internally inconsistent about this. **Don't assume; check what
  path your specific SDK/library actually requests.**
- **Stream resumption is reconnection, not resumption**: Microsoft's doc is explicit that A2A
  "support[s] stream reconnection (obtaining the same response stream from the beginning), not
  stream resumption from a specific point" [S17] — if you build a UI expecting to resume a partial
  streamed answer, you will need extra bookkeeping (e.g. idempotent re-render) that the protocol
  does not give you for free.
- **No standardized registry API** — the spec explicitly declines to define one as of 1.0.1 [S8];
  every "A2A registry" you meet in the wild is a proprietary layer on top.
- **Terminal-task immutability** as a footgun: once `COMPLETED/FAILED/CANCELED/REJECTED`, a task
  cannot accept more messages — client code that naively retries against the same `taskId` after a
  completion will get `UnsupportedOperationError`; must start a fresh interaction referencing the
  old task instead [S4][S11].
- **`A2A-Version` empty-header default is 0.3**, not 1.0 [S4] — a client built against the old
  defaults that forgets to set the header will silently negotiate old semantics against a
  1.0-capable server rather than failing loudly.
- **Opacity cuts both ways**: the same design that protects IP/security also means an agent's
  caller cannot debug *why* a remote agent behaved a certain way — you only see declared skills and
  message/artifact content, never the remote agent's reasoning, tool calls, or state. This is a
  deliberate trade-off (per `enterprise-ready.md`, opacity "naturally aligns with standard
  client-server security paradigms") [S9], but it means observability of a multi-agent A2A system
  is fundamentally black-box at the inter-agent boundary — tracing (`W3C Trace Context`) gets you
  *when* something happened across agents, not *why* inside one.
- CrewAI's own docs index did not surface an A2A page in this pass, and neither did a direct guess
  at Pydantic AI's canonical A2A doc URL (redirected off to a third-party `fasta2a` repo) — the
  ecosystem-support claims in blog aggregation posts (e.g. OpenAgents, Dec 2025) should be spot
  checked against the framework's own current docs before being repeated as fact [S21].

## What changed in the last 6 months (roughly April–Sept 2026)

- **A2A joined AAIF** (2026-08-17), moving from being merely "an LF project" to being one of five
  named layers (AGENTS.md / goose / **MCP** / agentgateway / **A2A**) of a single coordinated "open
  agentic stack" governed by one foundation — the most consequential governance news for this
  chapter and for ch.1/ch.5 cross-links, since MCP and A2A are now formally stablemates, not just
  complementary-by-convention [S23][S24].
- **v1.0.0 shipped** (2026-03-12) with a large batch of breaking changes clearing out
  backward-compat debt (ID formats, enum casing, OAuth2 flow modernization to device-code/PKCE,
  native gRPC multi-tenancy) — anyone maintaining a pre-1.0 integration has real migration work, not
  just a version bump [S2].
- **v1.0.1** (2026-05-26) changed the preferred HTTP content type to `application/a2a+json` — a
  small but breaking-adjacent detail for anyone doing manual content-type negotiation [S2].
- Mainstream framework docs caught up to 1.0-era A2A only very recently: Microsoft's cross-language
  `A2AAgent` reference is dated **2026-09-16/21**, i.e. inside the last two weeks of this research
  date — a signal that 1.0-era production patterns (continuation tokens, session-persisted
  `contextId`/`taskId`) are only now becoming documented best practice outside the spec itself
  [S17].

## Diagram candidates

1. **Governance timeline** — actors: Google, Linux Foundation, IBM/BeeAI, AAIF. Arrows labeled:
   "announces" (Apr 2025), "donates to" (Jun 2025), "merges ACP into" (Aug 2025), "ships v1.0"
   (Mar 2026), "joins" (Aug 2026) [S12][S13][S14][S2][S23].
2. **A2A + MCP layered architecture** — actors: User, Agent A (Shop Manager), Agent B (Mechanic),
   Tool 1 (diagnostic scanner), Tool 2 (repair manual). Arrows: User↔Agent A = A2A, Agent A↔Agent B
   = A2A, Agent B↔Tool 1/2 = MCP [S7].
3. **Task lifecycle state machine** — states `SUBMITTED, WORKING, INPUT_REQUIRED, AUTH_REQUIRED,
   COMPLETED, FAILED, CANCELED, REJECTED`; mark the last four as terminal (double border); arrows
   for normal flow + the two interrupt→resume loops [S5].
4. **3-layer protocol model** — boxes: Canonical proto model → Abstract Operations → {JSON-RPC,
   gRPC, HTTP+JSON/REST, custom} bindings, with a side note that REST is transcoded from gRPC
   annotations, not hand-specified [S4][S5].
5. **Discovery strategies** — three parallel paths from Client to AgentCard: well-known URI (direct
   GET), curated registry (query by skill/tag), direct config (static) — with a lock icon on the
   well-known path noting auth-gating for sensitive cards [S8].
6. **contextId/taskId relationship** — one `contextId` box containing multiple `Task` boxes (some
   concurrent) plus loose `Message` arrows; a `referenceTaskIds` dashed arrow from a new Task back
   to a terminal one [S4][S11].
7. **Extension opt-in flow** — AgentCard declares `extensions: [{uri, required}]` → client sends
   `A2A-Extensions` header listing supported URIs → server proceeds or returns
   `ExtensionSupportRequiredError` if a `required:true` extension wasn't declared [S4][S10].
8. **Update-delivery decision tree** — branch on AgentCard capability flags: `streaming=true` → SSE
   via `message:stream`; `pushNotifications=true` → webhook config + POST deliveries; neither →
   client must poll `tasks/get` [S4].
9. **Security/auth flow** — Client → (out-of-band OAuth/OIDC) → Bearer token → A2A request header →
   Server validates → 401/403 on failure; separate inset for in-task `AUTH_REQUIRED` secondary-auth
   loop [S9][S4].
10. **Ecosystem map** — center: A2A spec (AAIF). Spokes: SDKs (Python/JS/Java/Go/.NET/Rust),
    framework adapters (ADK, MS Agent Framework, + unverified CrewAI/Pydantic AI/Bedrock
    AgentCore), extensions (AP2, Secure Passport, Traceability, AGP), tooling (a2a-inspector,
    a2a-cli, a2a-tck) [S1][S25][S16][S10][S17][S20].

**Chart candidates:**
- Release timeline scatter: version tag (x = date, y = version) from the GitHub releases API data
  in Current-state table — shows the 0.2.x burst then the long stabilization gap to 1.0 [S3].
- AAIF membership-tier bar chart: 8 platinum / 18 gold / 21 silver at Dec 2025 founding [S24].
- HN engagement over time for "Agent2Agent"-tagged stories: 450 pts/280 comments (Apr 2025) vs.
  single-digit points for every dated 2026 story found — illustrates hype-cycle normalization
  [measured via HN Algolia, this session — treat as a rough proxy, not a rigorous metric].

## Glossary

- **Agent Card** — JSON document describing an agent's identity, endpoint(s), capabilities, skills,
  and security requirements; the unit of discovery [S4][S5].
- **Task** — server-tracked stateful unit of work with an ID, a lifecycle state, artifacts, and
  optional history [S4].
- **Message** — one turn in an interaction, made of one or more `Part`s, tagged `ROLE_USER` or
  `ROLE_AGENT` [S4].
- **Part** — smallest content unit inside a Message or Artifact: text, file, or structured data [S4].
- **Artifact** — a Task's output, deliberately modeled separately from Messages [S4].
- **contextId** — server-issued identifier grouping related Tasks and Messages into one logical
  conversation [S4][S11].
- **Opacity principle** — agents expose only declared capabilities, never internal memory, tools,
  or reasoning, to their peers [S6][S9].
- **Extension** — a URI-identified, independently-specified add-on to the core protocol, declared
  in `AgentCapabilities.extensions`, opted into via the `A2A-Extensions` header [S4][S10].
- **AAIF** — Agentic AI Foundation; Linux-Foundation-hosted neutral body (founded Dec 2025) now
  governing MCP, goose, AGENTS.md, agentgateway, and (since Aug 2026) A2A [S24][S23].
- **ACP** — IBM/BeeAI's Agent Communication Protocol; merged into A2A, Aug 2025 [S14].
- **AGNTCY** — separate open-source stack (Cisco/Dell/Google/Oracle/Red Hat) for discovery, identity,
  messaging, observability across agents; uses A2A as one of its wire protocols rather than
  competing with it [S15].
- **AP2** — Agent Payments Protocol; Google-authored A2A extension for agentic commerce (deep dive:
  ch.10) [S16].
- **AgentCardSignature** — JWS (RFC 7515) signature object attachable to an AgentCard for integrity
  verification ("signed agent cards") [S5].

## Unverified / open questions

- **CrewAI native A2A support** — could not load a first-party CrewAI doc page describing A2A
  integration in this pass (`docs.crewai.com/en/a2a/overview` returned no A2A content); third-party
  post (OpenAgents, Dec 2025) claims CrewAI agents are A2A-connectable, but that may describe an
  external adapter, not a CrewAI-shipped feature. **Action**: check `docs.crewai.com` directly
  before citing.
- **Pydantic AI native A2A support** — `ai.pydantic.dev/a2a/` redirected to `pydantic.dev/docs/ai/
  integrations/a2a/`, which itself redirected to a third-party repo (`datalayer/fasta2a`); could not
  confirm current first-party support or API shape (earlier Pydantic AI versions shipped a
  `to_a2a()` helper per general community knowledge, but this was **not verified live** in this
  session). **Action**: fetch `pydantic.dev`'s actual A2A page content directly, or check the
  `pydantic-ai` PyPI package changelog.
- **AWS Bedrock AgentCore ↔ A2A integration** — the specific AWS ML blog URL guessed in this session
  404'd, and WebSearch quota was exhausted before an alternative could be located. AgentCore's A2A
  support (if any) and its production patterns are **not verified here**. Action: search
  aws.amazon.com/blogs or the AgentCore docs directly in a follow-up pass.
- **"Researchers demonstrate Agent2Agent prompt injection risk"** (SC World, dated 2025-11-04 per
  HN Algolia metadata) — page returned HTTP 403 on fetch attempts (direct and via Google cache
  redirect chain); content, researchers, and specific vulnerability mechanism **not verified**.
  Worth chasing for the Security chapter (ch.16) since A2A's opacity design explicitly trades away
  cross-agent visibility, which is exactly the kind of boundary prompt injection would attack.
- **Microsoft's "Can You Build Agent2Agent Communication on MCP? Yes"** (devblogs.microsoft.com,
  2025-07-23) — only the title/URL/date were confirmed via HN Algolia metadata; the actual argument
  and any code shown were **not fetched/read** in this pass. Relevant to the A2A-vs-MCP boundary
  debate; read in full before citing specifics.
- **Real production case studies** ("who runs A2A in production" beyond the DeepLearning.AI/Google
  Cloud/IBM Research training partnership mentioned in the A2A README) were not found within this
  session's tool budget — WebSearch quota was exhausted early, which constrained discovery of
  fresh 2026 adoption write-ups beyond what HN Algolia and direct-URL guesses could surface.
  **Action**: a follow-up pass with search budget should look specifically for named-company
  production postmortems/case studies, not just framework-integration docs.

## Sources

- [S1] a2aproject/A2A `README.md`, GitHub (a2aproject org), undated (current as of fetch),
  https://raw.githubusercontent.com/a2aproject/A2A/main/README.md, accessed 2026-09-30.
- [S2] a2aproject/A2A `CHANGELOG.md`, GitHub, entries dated 2025-05-27 through 2026-05-26,
  https://raw.githubusercontent.com/a2aproject/A2A/main/CHANGELOG.md, accessed 2026-09-30.
- [S3] a2aproject/A2A releases, GitHub REST API, https://api.github.com/repos/a2aproject/A2A/releases,
  accessed 2026-09-30.
- [S4] a2aproject/A2A `docs/specification.md` (normative spec source), GitHub,
  https://raw.githubusercontent.com/a2aproject/A2A/main/docs/specification.md, accessed 2026-09-30.
- [S5] a2aproject/A2A `specification/a2a.proto` (canonical Protocol Buffers schema), GitHub,
  https://raw.githubusercontent.com/a2aproject/A2A/main/specification/a2a.proto, accessed 2026-09-30.
- [S6] a2aproject/A2A `docs/topics/what-is-a2a.md`, via a2a-protocol.org, accessed 2026-09-30
  (summarized via fetch tool).
- [S7] a2aproject/A2A `docs/topics/a2a-and-mcp.md`, via a2a-protocol.org, accessed 2026-09-30
  (summarized via fetch tool).
- [S8] a2aproject/A2A `docs/topics/agent-discovery.md`, GitHub,
  https://raw.githubusercontent.com/a2aproject/A2A/main/docs/topics/agent-discovery.md, accessed
  2026-09-30.
- [S9] a2aproject/A2A `docs/topics/enterprise-ready.md`, GitHub,
  https://raw.githubusercontent.com/a2aproject/A2A/main/docs/topics/enterprise-ready.md, accessed
  2026-09-30.
- [S10] a2aproject/A2A `docs/topics/extensions.md`, GitHub,
  https://raw.githubusercontent.com/a2aproject/A2A/main/docs/topics/extensions.md, accessed
  2026-09-30.
- [S11] a2aproject/A2A `docs/topics/life-of-a-task.md`, GitHub,
  https://raw.githubusercontent.com/a2aproject/A2A/main/docs/topics/life-of-a-task.md, accessed
  2026-09-30.
- [S12] "The Agent2Agent Protocol (A2A)", Google Developers Blog, 2025-04-09,
  https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/, accessed
  2026-09-30.
- [S13] "Google Cloud donates A2A to Linux Foundation", Google Developers Blog, 2025-06-23,
  https://developers.googleblog.com/en/google-cloud-donates-a2a-to-linux-foundation/, accessed
  2026-09-30.
- [S14] i-am-bee/acp GitHub repo (archived 2025-08-27), README and archival notice,
  https://github.com/i-am-bee/acp, accessed 2026-09-30.
- [S15] AGNTCY project website, https://agntcy.org/, accessed 2026-09-30 (undated content).
- [S16] AP2 (Agent Payments Protocol) website, https://ap2-protocol.org/, accessed 2026-09-30
  (announcement dated Sept 2025 per page content).
- [S17] "A2A agent service", Microsoft Learn / Agent Framework docs, ms.date 2026-09-16, updated
  2026-09-21, https://learn.microsoft.com/en-us/agent-framework/integrations/by-component/
  agent-services/a2a, accessed 2026-09-30.
- [S18] a2aproject/a2a-samples, `samples/python/agents/helloworld/{__main__.py,agent_executor.py,
  test_client.py,README.md}`, GitHub, https://github.com/a2aproject/a2a-samples, accessed
  2026-09-30.
- [S19] a2aproject/a2a-python `README.md`, GitHub, https://raw.githubusercontent.com/a2aproject/
  a2a-python/main/README.md, accessed 2026-09-30 (summarized via fetch tool).
- [S20] Google ADK docs, A2A integration page, https://adk.dev/a2a/ (redirected from
  google.github.io/adk-docs/a2a/), accessed 2026-09-30, marked "Experimental" in-page.
- [S21] "A2A Protocol Integration", OpenAgents blog, 2025-12-28,
  https://openagents.org/blog/posts/2025-12-28-a2a-protocol-integration, accessed 2026-09-30.
- [S22] Hacker News thread on "The Agent2Agent Protocol (A2A)" (450 pts, 280 comments),
  2025-04-09, item id 43631381, https://news.ycombinator.com/item?id=43631381 (fetched via HN
  Algolia API), accessed 2026-09-30.
- [S23] "Agent2Agent (A2A) joins Agentic AI Foundation (AAIF)'s open agentic stack", AAIF blog,
  2026-08-17, https://aaif.io/blog/a2a-joins-aaif, accessed 2026-09-30.
- [S24] "Linux Foundation announces the formation of the Agentic AI Foundation (AAIF), anchored by
  new project contributions including Model Context Protocol (MCP), goose, and AGENTS.md", AAIF
  press release, 2025-12-09, https://aaif.io/press/linux-foundation-announces-the-formation-of-the-
  agentic-ai-foundation-aaif-anchored-by-new-project-contributions-including-model-context-
  protocol-mcp-goose-and-agents-md/, accessed 2026-09-30.
- [S25] a2aproject GitHub organization repository listing, GitHub REST API,
  https://api.github.com/orgs/a2aproject/repos, accessed 2026-09-30.
