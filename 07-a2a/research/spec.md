# A2A: Agent2Agent Protocol — primary-source notes

## TL;DR (what an engineer must know today, 2026-09-30)

- A2A is a **horizontal**, agent-to-agent interop protocol: it connects independently built, opaque agents to each other over a network. It is not a tool-calling protocol (that's MCP, chapter 05) — MCP is "vertical" (agent→tools), A2A is "horizontal" (agent↔agent) [S9].
- Current spec version is **1.0.1** (patch, 2026-05-26); the **1.0.0** major line shipped **2026-03-12** — a breaking rewrite from 0.3 [S2][S13]. Package renamed `a2a.v1` → **`lf.a2a.v1`** with the 1.0 release [S2][S3].
- Google announced A2A on **2025-04-09**; donated it to the **Linux Foundation** on **2025-06-23** (Open Source Summit NA, Denver), with Google, Microsoft, Cisco (Outshift), AWS, Salesforce, ServiceNow, SAP, IBM Research on the founding Technical Steering Committee (TSC), one seat each [S1][S5].
- The wire model is defined **once, in Protocol Buffers** (`specification/a2a.proto`) and mapped into three normatively-equivalent bindings: **JSON-RPC 2.0**, **gRPC**, and **HTTP+JSON/REST** [S3][S2 §5,§9-11].
- Core objects: **AgentCard** (capability manifest), **Task** (stateful unit of work with an id, contextId, status, artifacts, history), **Message** (role + Parts, one turn), **Part** (text/file/data leaf), **Artifact** (task output, made of Parts), **contextId** (groups related tasks/messages) [S2 §2.2, §4].
- **TaskState** is a proto3 enum with values `TASK_STATE_SUBMITTED, WORKING, INPUT_REQUIRED, AUTH_REQUIRED, COMPLETED, FAILED, CANCELED, REJECTED, UNSPECIFIED`. Since v1.0 JSON serializes these as **ProtoJSON SCREAMING_SNAKE_CASE** (`"TASK_STATE_COMPLETED"`), not the old lowercase-hyphen strings from 0.x — a documented breaking change (ADR-001, 2025-11-18) [S4][S2 §4.1.3, §5.5].
- Discovery: **well-known URI** `https://{domain}/.well-known/agent-card.json` (renamed from `agent.json` in v0.3.0, 2025-07-30), registries/catalogs, or direct config [S2 §8.2][S13 changelog 0.3.0].
- Agent Cards can be **JWS-signed** (RFC 7515) over a JCS-canonicalized (RFC 8785) JSON form, added in v0.3.0 [S2 §8.4][S13].
- Streaming is **SSE** (`message:stream`, `tasks/{id}:subscribe`); disconnected/long-running clients use **push notifications** (server-initiated webhook POSTs) configured via `TaskPushNotificationConfig` [S2 §3.5, §4.3].
- **Opacity principle** is explicit in the spec's guiding principles: agents collaborate "without needing to share their internal thoughts, plans, or tool implementations" [S2 §1.2].
- **IBM's ACP (Agent Communication Protocol / BeeAI)** formally merged into A2A under the Linux Foundation — the ACP repo now reads "ACP is now part of A2A under the Linux Foundation!" [S6].
- **AP2 (Agent Payments Protocol)**, Google's payments spec, ships as **an A2A extension** (current release AP2 v0.2, announced 2025-09-16) — full detail belongs in ch.10, but the composition mechanism (`AgentExtension`, `A2A-Extensions` header) is A2A's [S7].
- Real-world signal is mixed: A2A's PyPI SDK download volume is roughly **10.9M vs MCP's 257M** (per a 2026-06 HN comment citing pypistats) — an order-of-magnitude adoption gap even after 1.0 [S11]. OpenAI declined to merge community A2A support into `openai-agents-python` (PR #1245, opened 2025-07-25, closed unmerged 2025-08-13: "we don't have immediate plans to add A2A support") [S12].
- A September 2026 academic security analysis (**A2ABreak**) found **11 new, specification-level vulnerabilities** in A2A (context-id injection, multi-hop credential/identity loss in delegation chains, unattested rogue-capability claims) exploitable by a fully spec-compliant adversary — i.e., bugs in the protocol design, not in any one implementation [S10].

## Current state and versions (as of 2026-09-30)

| Version | Date | Notes |
|---|---|---|
| v0.1.0 | 2025 (initial) | Google-only, `google/A2A` repo |
| v0.2.0–v0.2.6 | 2025-05 to 2025-07-17 | Added gRPC+REST bindings, extensions mechanism, iconUrl, multi-transport AgentCard |
| **v0.3.0** | **2025-07-30** | Breaking: well-known URI `agent.json`→`agent-card.json`; added AgentCard `signatures`; added mTLS security scheme + OAuth2 metadata URL; added extended-card fetch method [S13] |
| v1.0.0-rc | pre-2026-03-12 | Release candidate |
| **v1.0.0** | **2026-03-12** | Major breaking rewrite: split spec into data-model/operations/bindings layers; package renamed to `lf.a2a.v1`; ProtoJSON enum casing (ADR-001); non-complex string IDs; combined push-notification-config types; added `tasks/list`; modernized OAuth2 (removed implicit/password grants, added device-code + PKCE); renamed `supportsAuthenticatedExtendedCard`→`supportsExtendedAgentCard`; native gRPC multi-tenancy (`tenant` scope) [S3 changelog] |
| **v1.0.1** | **2026-05-26** | Patch: prefer `application/a2a+json` content type in HTTP binding; fixed TaskStatus enum values in spec text [S3] |

Governance: Linux Foundation project; **Technical Steering Committee**, 8 seats — Google (Todd Segal), Microsoft (Darrel Miller), Cisco (Luca Muscariello), AWS (Abhimanyu Siwach), Salesforce (Stephen Petschulat), ServiceNow (Sugandh Rakha), SAP (Sivakumar N.), IBM (Stefano Maestri) [S5]. TSC meets on LF Zoom; Discord for chat, GitHub as source of truth for decisions [S5].

Official spec site: **a2a-protocol.org** (docs, tutorials, versioned spec pages e.g. `/v1.0.0/specification/`). Repo: `github.com/a2aproject/A2A` (moved from `google/A2A`/`google-a2a`).

SDKs, per the README (2026-09): **Python** (`pip install a2a-sdk`), **Go** (`a2a-go`), **JS/TS** (`@a2a-js/sdk`), **Java** (`a2a-java`, Maven), **.NET** (`A2A` NuGet), and — new since the LF era — **Rust** (`a2a-rs` / `cargo add a2a-lf`) [S3 README]. The `a2a-sdk` (Python) v1.x line implements spec 1.0 across all three transports (JSON-RPC, HTTP+JSON/REST, gRPC) for both client and server, plus a "0.3 compatibility mode" that also covers all three transports [S14].

## Timeline (dated)

- **2025-04-09**: Google publicly launches A2A (`developers.googleblog.com`), with 50+ launch partners (Atlassian, Box, Cohere, Intuit, LangChain, MongoDB, PayPal, Salesforce, SAP, ServiceNow, Workday, + big consultancies: Accenture, BCG, Capgemini, Deloitte, KPMG, McKinsey, PwC, TCS, Wipro). Five stated design principles: embrace agentic capabilities, build on existing standards, secure by default, support long-running tasks, modality-agnostic [S8][S1].
- **2025-05 to 2025-07**: v0.2.x line — gRPC/REST bindings added (0.2.2, 2025-06-09), extension mechanism added (0.2.2), required `protocolVersion` field on AgentCard (0.2.5, 2025-06-30), multi-transport announcement support in AgentCard (0.2.4) [S13].
- **2025-06-23**: Linux Foundation formally takes over governance at Open Source Summit NA, Denver; Jim Zemlin: joining the foundation ensures "the long-term neutrality, collaboration and governance that will unlock the next era of agent-to-agent powered productivity" [S1].
- **2025-07-30**: **v0.3.0** — well-known URI renamed `agent.json`→`agent-card.json`; JWS AgentCard signatures; mTLS scheme; extended-card fetch method [S13].
- **2025-08-13**: OpenAI closes (unmerged) community PR #1245 adding A2A support to `openai-agents-python`: "we don't have immediate plans to add A2A support to this SDK" [S12].
- **2025-09-16**: AP2 (Agent Payments Protocol) v0.2 announced by Google, built as an A2A extension [S7].
- ~2025-late: **IBM contributes ACP** (Agent Connect/Communication Protocol, from the BeeAI/`i-am-bee` project) into the A2A project under the Linux Foundation; ACP repo now carries a permanent banner: "ACP is now part of A2A under the Linux Foundation!" with a migration guide to BeeAI [S6].
- **2025-11-18**: **ADR-001** accepted — TSC adopts ProtoJSON as the normative JSON serialization for the spec, explicitly flagged as a **breaking change** (enum casing) for the upcoming 1.0 [S4].
- **2026-03-12**: **v1.0.0** ships — "production-ready" per the official announcement blog; large breaking refactor (see table above) [S2 changelog][S13].
- **2026-03-06 / 2026-03-12**: Critical retrospective pieces appear ("What Happened to A2A Protocol?", credal.ai, 2026-03-06) arguing A2A adoption stalled because MCP already covered the features enterprises wanted, at far lower integration cost [S15].
- **2026-03-20**: Independent security post "Google's A2A Protocol Has Zero Defenses Against Prompt Injection" (grith.ai) — commentary-level, not peer-reviewed [S16, unverified beyond headline — see Unverified].
- **2026-05-26**: **v1.0.1** patch — prefers `application/a2a+json` in HTTP binding, fixes TaskStatus doc bug [S3].
- **2026-06-18**: "Ask HN: Is anyone using the A2A protocol?" (96 pts / 45 comments) — mixed real-world signal, see Pitfalls section [S11].
- **2026-09-12** (arXiv id 2609.xxxxx ⇒ Sept 2026): **A2ABreak** paper — first systematic, LLM-assisted formal security analysis of the A2A spec; extracts a 37-state/76-transition FSM from 929 formalized spec statements; finds 11 new protocol-level vulnerabilities [S10].

## Mechanics

### Layered spec structure

The spec (v1.0.1, `docs/specification.md`, 3618 lines) is explicitly organized in three layers [S2 §1.3]:
1. **A2A Data Model** — Task, Message, AgentCard, Part, Artifact, Extension.
2. **A2A Operations** — SendMessage, SendStreamingMessage, GetTask, ListTasks, CancelTask, GetAgentCard, push-notification config CRUD, GetExtendedAgentCard.
3. **Protocol Bindings** — JSON-RPC 2.0, gRPC, HTTP+JSON/REST — each must provide "functionally equivalent representations" of layers 1–2 [S2 §4 intro].

The canonical data model is **Protocol Buffers**, in `specification/a2a.proto` (812 lines, `syntax = "proto3"`, `package lf.a2a.v1`) [S3 proto]. JSON bindings derive from it via **ProtoJSON** (ADR-001) [S4].

### Core objects (verbatim field definitions, a2a.proto, v1.0.1) — VERBATIM [S3]

```protobuf
message Task {
  string id = 1 [(google.api.field_behavior) = REQUIRED];
  string context_id = 2;
  TaskStatus status = 3 [(google.api.field_behavior) = REQUIRED];
  repeated Artifact artifacts = 4;
  repeated Message history = 5;
  google.protobuf.Struct metadata = 6;
}

enum TaskState {
  TASK_STATE_UNSPECIFIED = 0;
  TASK_STATE_SUBMITTED = 1;
  TASK_STATE_WORKING = 2;
  TASK_STATE_COMPLETED = 3;      // terminal
  TASK_STATE_FAILED = 4;         // terminal
  TASK_STATE_CANCELED = 5;       // terminal
  TASK_STATE_INPUT_REQUIRED = 6; // interrupted
  TASK_STATE_REJECTED = 7;       // terminal
  TASK_STATE_AUTH_REQUIRED = 8;  // interrupted
}

message TaskStatus {
  TaskState state = 1 [(google.api.field_behavior) = REQUIRED];
  Message message = 2;
  google.protobuf.Timestamp timestamp = 3;
}

message Part {
  oneof content {
    string text = 1;
    bytes raw = 2;      // base64 in JSON
    string url = 3;
    google.protobuf.Value data = 4;
  }
  google.protobuf.Struct metadata = 5;
  string filename = 6;
  string media_type = 7;
}

enum Role { ROLE_UNSPECIFIED = 0; ROLE_USER = 1; ROLE_AGENT = 2; }

message Message {
  string message_id = 1 [(google.api.field_behavior) = REQUIRED];
  string context_id = 2;
  string task_id = 3;
  Role role = 4 [(google.api.field_behavior) = REQUIRED];
  repeated Part parts = 5 [(google.api.field_behavior) = REQUIRED];
  google.protobuf.Struct metadata = 6;
  repeated string extensions = 7;
  repeated string reference_task_ids = 8;
}

message Artifact {
  string artifact_id = 1 [(google.api.field_behavior) = REQUIRED];
  string name = 2;
  string description = 3;
  repeated Part parts = 4 [(google.api.field_behavior) = REQUIRED];
  google.protobuf.Struct metadata = 5;
  repeated string extensions = 6;
}
```

Task lifecycle: **terminal** states are `COMPLETED, FAILED, CANCELED, REJECTED` (no further messages accepted); **interrupted** states are `INPUT_REQUIRED, AUTH_REQUIRED` (task paused, waiting on the client) [S2 §3.1.1, proto comments]. `SendMessage` to a task in a terminal state MUST return `UnsupportedOperationError` [S2 §3.1.1].

`contextId` groups related Tasks and Messages for multi-turn continuity; it is optional but strongly used in practice; if a client sends only `taskId` without `contextId`, the server infers `contextId` from the task [S3 proto Message comment].

### AgentCard (identity + capability manifest) — sample, VERBATIM [S2 §8.5]

```json
{
  "name": "GeoSpatial Route Planner Agent",
  "description": "Provides advanced route planning, traffic analysis, and custom map generation services.",
  "supportedInterfaces": [
    {"url": "https://georoute-agent.example.com/a2a/v1", "protocolBinding": "JSONRPC", "protocolVersion": "1.0"},
    {"url": "https://georoute-agent.example.com/a2a/grpc", "protocolBinding": "GRPC", "protocolVersion": "1.0"},
    {"url": "https://georoute-agent.example.com/a2a/json", "protocolBinding": "HTTP+JSON", "protocolVersion": "1.0"}
  ],
  "provider": {"organization": "Example Geo Services Inc.", "url": "https://www.examplegeoservices.com"},
  "iconUrl": "https://georoute-agent.example.com/icon.png",
  "version": "1.2.0",
  "documentationUrl": "https://docs.examplegeoservices.com/georoute-agent/api",
  "capabilities": {"streaming": true, "pushNotifications": true, "extendedAgentCard": true},
  "securitySchemes": {"google": {"openIdConnectSecurityScheme": {"openIdConnectUrl": "https://accounts.google.com/.well-known/openid-configuration"}}},
  "securityRequirements": [{ "schemes": { "google": { "list": ["openid", "profile", "email"] } } }],
  "defaultInputModes": ["application/json", "text/plain"],
  "defaultOutputModes": ["application/json", "image/png"],
  "skills": [
    {
      "id": "route-optimizer-traffic",
      "name": "Traffic-Aware Route Optimizer",
      "description": "Calculates the optimal driving route ...",
      "tags": ["maps", "routing", "navigation", "directions", "traffic"],
      "examples": ["Plan a route from '1600 Amphitheatre Parkway, Mountain View, CA' to 'San Francisco International Airport' avoiding tolls."],
      "inputModes": ["application/json", "text/plain"],
      "outputModes": ["application/json", "application/vnd.geo+json", "text/html"]
    }
  ],
  "signatures": [
    {"protected": "eyJhbGciOiJFUzI1NiIs...", "signature": "QFdkNLNszlGj3z3u0YQGt_T9LixY3qtdQpZmsTdDHDe3fXV9y9-B3m2-XgCpzuhiLt8E0tV6HXoZKHv4GtHgKQ"}
  ]
}
```

Key AgentCard fields not always obvious: `supportedInterfaces` is an **ordered** list — first entry is the client's default choice; each entry pairs a URL with a `protocolBinding` ("JSONRPC"/"GRPC"/"HTTP+JSON", open string so custom bindings are possible) and a `protocolVersion` and optional `tenant` routing token [S3 proto `AgentInterface`]. `AgentCapabilities.extensions` lists `AgentExtension{uri, description, required, params}` [S3 proto]. `skills[]` are the granular, discoverable "things this agent is good at" — each with its own `id`, `tags`, `examples`, and optionally overridden `inputModes`/`outputModes` and `securityRequirements` [S3 proto `AgentSkill`].

### Discovery

- **Well-known URI**: `https://{server_domain}/.well-known/agent-card.json` (renamed from `agent.json` in v0.3.0) [S2 §8.2][S13].
- **Registries/Catalogs**: "querying curated catalogs of agents" — the spec leaves the registry mechanism unspecified; ecosystem projects (e.g. community "Waggle" search engine for A2A agents, HN Feb 2026) fill this gap outside the core spec [S11].
- **Direct configuration**: pre-shared card URL or content.
- Client protocol-selection algorithm is normative: parse `supportedInterfaces`, pick the first transport the client itself supports, use its URL, and copy its `tenant` value into every request if present [S2 §8.3.2].
- Caching: servers SHOULD send `Cache-Control`/`ETag` (from the card's `version` or a content hash); clients SHOULD do conditional GETs (RFC 9111) [S2 §8.6].

### Extended Agent Card

A second, richer AgentCard exposed only to authenticated clients (`GetExtendedAgentCard` operation / `capabilities.extendedAgentCard: true`). If the capability flag is true but no extended card is configured server-side, the server MUST return `ExtendedAgentCardNotConfiguredError` [S2 §3.3.4]. Renamed from `supportsAuthenticatedExtendedCard` to `supportsExtendedAgentCard` in the 1.0 breaking-changes list [S13 changelog].

### Agent Card signing

JWS (RFC 7515) over a **JCS-canonicalized** (RFC 8785) JSON form of the card, stored in `AgentCard.signatures[]` as `{protected, signature}` pairs [S2 §8.4, §8.5 example]. The `optional` keyword on proto3 fields is explicitly there so canonicalization can tell "explicitly set" from "omitted" — important because signature verification must reconstruct the exact signed byte form [S2 §5.7].

### Operations (binding-independent, §3.1) [S2]

| Operation | Purpose | Key errors |
|---|---|---|
| SendMessage | initiate/continue a task; may return `Task` or a direct `Message` | `ContentTypeNotSupportedError`, `UnsupportedOperationError` (terminal task), `TaskNotFoundError` |
| SendStreamingMessage | same, but SSE stream of `Task` + `TaskStatusUpdateEvent`/`TaskArtifactUpdateEvent` until terminal state | + `UnsupportedOperationError` if streaming not declared |
| GetTask | poll current state, optional `historyLength` | `TaskNotFoundError` |
| ListTasks | filter/paginate tasks, cursor-based (`pageToken`/`nextPageToken`), sorted by most-recent-update descending | — |
| CancelTask | best-effort cancel | `TaskNotCancelableError`, `TaskNotFoundError` |
| SubscribeToTask | attach SSE stream to an existing non-terminal task; first event is always the current `Task` snapshot (prevents a race between GetTask and Subscribe) | `UnsupportedOperationError`, `TaskNotFoundError` |
| Create/Get/List/DeleteTaskPushNotificationConfig | manage webhook config for a task | `PushNotificationNotSupportedError`, `TaskNotFoundError` |
| GetExtendedAgentCard | fetch authenticated card | `ExtendedAgentCardNotConfiguredError` |

`SendMessageConfiguration.return_immediately` (bool): if false (default) the call **blocks** until the task reaches a terminal or interrupted state; if true it returns as soon as the task is created [S3 proto].

### JSON-RPC binding — wire examples

Base envelope, VERBATIM [S2 §9.3]:
```json
{"jsonrpc": "2.0", "id": "unique-request-id", "method": "category/action", "params": { }}
```

SendMessage request/response, VERBATIM [S2 §9.4.1]:
```json
{"jsonrpc": "2.0", "id": 1, "method": "SendMessage", "params": { /* SendMessageRequest object */ }}
```
```json
{"jsonrpc": "2.0", "id": 1, "result": { /* one of: "task": {...} | "message": {...} */ }}
```

Streaming SSE frame, VERBATIM [S2 §9.4.2]:
```
data: {"jsonrpc": "2.0", "id": 1, "result": { /* StreamResponse object */ }}
```

GetTask / ListTasks / CancelTask / SubscribeToTask requests, VERBATIM [S2 §9.4.3-9.4.6]:
```json
{"jsonrpc": "2.0", "id": 2, "method": "GetTask", "params": {"id": "task-uuid", "historyLength": 10}}
{"jsonrpc": "2.0", "id": 3, "method": "ListTasks", "params": {"contextId": "context-uuid", "status": "TASK_STATE_WORKING", "pageSize": 50, "pageToken": "cursor-token"}}
{"jsonrpc": "2.0", "id": 4, "method": "CancelTask", "params": {"id": "task-uuid"}}
{"jsonrpc": "2.0", "id": 5, "method": "SubscribeToTask", "params": {"id": "task-uuid"}}
```

JSON-RPC error responses, VERBATIM [S2 §9.5-ish, examples section]:
```json
{"jsonrpc": "2.0", "id": 1, "error": {"code": -32602, "message": "Invalid parameters",
  "data": [{"@type": "type.googleapis.com/google.rpc.BadRequest",
    "fieldViolations": [{"field": "message.parts", "description": "At least one part is required"}]}]}}
```
```json
{"jsonrpc": "2.0", "id": 2, "error": {"code": -32001, "message": "Task not found",
  "data": [{"@type": "type.googleapis.com/google.rpc.ErrorInfo", "reason": "TASK_NOT_FOUND",
    "domain": "a2a-protocol.org", "metadata": {"taskId": "nonexistent-task-id", "timestamp": "2025-11-09T10:30:00.000Z"}}]}}
```

### HTTP+JSON/REST binding — wire examples (Section 6 workflow examples use this binding: path-style URLs + `application/a2a+json`)

Basic task, VERBATIM [S2 §6.1]:
```http
POST /message:send HTTP/1.1
Host: agent.example.com
Content-Type: application/a2a+json
Authorization: Bearer token

{"message": {"role": "ROLE_USER", "parts": [{"text": "What is the weather today?"}], "messageId": "msg-uuid"}}
```
```http
HTTP/1.1 200 OK
Content-Type: application/a2a+json

{"task": {"id": "task-uuid", "contextId": "context-uuid", "status": {"state": "TASK_STATE_COMPLETED"},
  "artifacts": [{"artifactId": "artifact-uuid", "name": "Weather Report", "parts": [{"text": "Today will be sunny with a high of 75°F"}]}]}}
```

Streaming SSE, VERBATIM [S2 §6.2]:
```
data: {"task": {"id": "task-uuid", "contextId": "context-uuid", "status": {"state": "TASK_STATE_WORKING"}}}

data: {"artifactUpdate": {"taskId": "task-uuid", "contextId": "context-uuid", "artifact": {"parts": [{"text": "# Climate Change Report\n\n"}]}}}

data: {"statusUpdate": {"taskId": "task-uuid", "contextId": "context-uuid", "status": {"state": "TASK_STATE_COMPLETED"}}}
```

Multi-turn "input required" pattern, VERBATIM [S2 §6.3]:
```json
{"task": {"id": "task-uuid", "status": {"state": "TASK_STATE_INPUT_REQUIRED",
  "message": {"role": "ROLE_AGENT", "parts": [{"text": "I need more details. Where would you like to fly from and to?"}]}}}}
```
Follow-up carries the same `taskId`, new `messageId` — no new task is created.

### gRPC binding

Normative source is the same `a2a.proto`; service is `A2AService` with HTTP transcoding annotations (`google.api.http`) baked directly into the proto, e.g. `SendMessage` → `POST /message:send`, `GetTask` → `GET /tasks/{id=*}`, with `/{tenant}/...` additional bindings for multi-tenant routing — VERBATIM [S3 proto lines 19-140]. A2A service parameters (e.g. `A2A-Extensions`) travel as **gRPC metadata** (headers), comma-joined for multi-valued params [S2 §10.2].

### Extensions

Declared per-agent in `AgentCard.capabilities.extensions[]` as `AgentExtension{uri, description, required, params}`. Clients opt in per-request via a binding-specific mechanism — for HTTP, the `A2A-Extensions` header (comma-separated URIs), mirrored in `Message.extensions[]`; extension payload rides in `Message.metadata[<extension-uri>]` — VERBATIM example [S2 §4.6.1]:
```http
POST /message:send HTTP/1.1
A2A-Extensions: https://example.com/extensions/geolocation/v1,https://standards.org/extensions/citations/v1

{"message": {"role": "ROLE_USER", "parts": [{"text": "Find restaurants near me"}],
  "extensions": ["https://example.com/extensions/geolocation/v1"],
  "metadata": {"https://example.com/extensions/geolocation/v1": {"latitude": 37.7749, "longitude": -122.4194}}}}
```
If the server marks an extension `required: true` and the client didn't opt in, the server MUST return `ExtensionSupportRequiredError` (`-32008`/`FAILED_PRECONDITION`/400) [S2 §3.3.2, §5.4]. Extension URIs should carry a version segment; a breaking change to an extension requires a new URI [S2 §4.6.3]. **AP2 (payments)** is the flagship real-world example of this mechanism: "the protocol is available as an extension for the open-source Agent2Agent (A2A) protocol" [S7] — full mechanics in chapter 10.

### Versioning

`Major.Minor` only (patch doesn't affect compatibility). Clients **MUST** send an `A2A-Version` header (or query param) on every request; **empty header is interpreted as 0.3** for backward compat. Servers MUST return `VersionNotSupportedError` for an unsupported `Major.Minor` [S2 §3.6]. VERBATIM:
```http
GET /tasks/task-123 HTTP/1.1
Host: agent.example.com
A2A-Version: 1.0
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Error model

All bindings map to nine A2A-specific error types with fixed JSON-RPC codes / gRPC statuses / HTTP statuses [S2 §5.4, VERBATIM table]:

| A2A error | JSON-RPC | gRPC | HTTP |
|---|---|---|---|
| TaskNotFoundError | -32001 | NOT_FOUND | 404 |
| TaskNotCancelableError | -32002 | FAILED_PRECONDITION | 400 |
| PushNotificationNotSupportedError | -32003 | FAILED_PRECONDITION | 400 |
| UnsupportedOperationError | -32004 | FAILED_PRECONDITION | 400 |
| ContentTypeNotSupportedError | -32005 | INVALID_ARGUMENT | 400 |
| InvalidAgentResponseError | -32006 | INTERNAL | 500 |
| ExtendedAgentCardNotConfiguredError | -32007 | FAILED_PRECONDITION | 400 |
| ExtensionSupportRequiredError | -32008 | FAILED_PRECONDITION | 400 |
| VersionNotSupportedError | -32009 | FAILED_PRECONDITION | 400 |

Error payload MUST include a machine code, human message, and optional `details[]` array where each item carries a `@type` (ProtoJSON `Any`), preferably a well-known `google.rpc` type (`ErrorInfo`, `BadRequest`) [S2 §3.3.2].

### Push notifications

`TaskPushNotificationConfig` registers a webhook + `AuthenticationInfo{scheme, credentials}` (IANA HTTP auth scheme name, e.g. "Bearer") [S3 proto]. On any task update the server POSTs the **same `StreamResponse` envelope used for SSE** to the webhook — VERBATIM [S2 §4.3.3]:
```http
POST {webhook_url}
Authorization: {authentication_scheme} {credentials}
Content-Type: application/a2a+json

{"task": {...}}            // or "message", "statusUpdate", "artifactUpdate" — exactly one
```
Server guarantees: **at-least-once** delivery, retry with backoff allowed, 10–30s timeout recommended, may give up after N consecutive failures. Client musts: ack with 2xx, process idempotently, validate task id [S2 §4.3.3].

### Security model

- Transport: HTTPS/TLS 1.3+ mandatory in production; deprecated TLS disabled [S2 §13.4].
- AuthN/AuthZ schemes declared in `AgentCard.securitySchemes` (map) + `securityRequirements`; supports API key, HTTP auth (Bearer/Basic), OAuth2 (modernized in 1.0: implicit + password grants **removed**, device-code + PKCE **added**), OpenID Connect, mutual TLS [S3 proto `SecurityScheme` family; S13 1.0 changelog].
- **In-task authorization**: a documented pattern (§7.6) for agents to request step-up auth mid-task (task transitions to `TASK_STATE_AUTH_REQUIRED`) rather than failing outright.
- Data-access scoping: server MUST NOT reveal existence of resources the caller can't access — a 404-shaped "not found" is used instead of leaking a 403 distinction, for both authz and resource-not-found cases [S2 §3.3.2].
- IANA registration drafted for `application/a2a+json` media type, explicitly flags SSRF risk from `Part.url` file references and requires schema validation + input sanitization [S2 §14.1.1].

## Numbers

- **PyPI download volume, mid-2026** (HN comment, cited pypistats, unverified independently by this session — treat as a single data point): `a2a-sdk` ≈ **10.9M** vs `mcp` package ≈ **257M** — roughly 23x gap [S11, unverified exact snapshot date].
- **A2ABreak** (arXiv, Sept 2026): FSM extracted from spec = **37 states, 76 transitions**, derived from **929 formalized statements** in the natural-language spec; found **11 new vulnerabilities**; achieved **73.3% precision / 84.6% F1** against expert review; a zero-shot LLM baseline over the same spec text found **zero** confirmed vulnerabilities — i.e., naive LLM reading of the spec catches nothing, formal FSM grounding is what surfaces the bugs [S10].
- OpenAI A2A PR: opened 2025-07-25, closed unmerged 2025-08-13 — **19 days** open, explicitly deprioritized rather than rejected on technical grounds [S12].
- Launch-day partner count: **50+** named partners/service providers on 2025-04-09 [S8].

## Pitfalls, limits, criticism

- **"MCP already did most of what A2A promised, at 10x less integration cost."** Credal.ai retrospective (2026-03-06): "MCP allowed you to connect Claude to Notion, Jira, and GitHub in under 10 minutes," while A2A required "learning complex orchestration concepts and building custom communication layers" — a vendor-authored but datapoint-backed critical position [S15]. Counter-position from the same month's HN thread: multiple engineers report A2A **is** in production for internal multi-agent "microservices-for-agents" patterns ("No major hurdles so far" — lazharichir; "My agent speaks A2A with itself and others" — reactordev) [S11]. **Both are current (2026); the negative take is a single vendor's blog, the positive is anecdotal HN testimony — neither is authoritative, record as open disagreement.**
- **Adoption asymmetry vs MCP is real by download volume** (10.9M vs 257M, [S11]), independent of which qualitative story you believe.
- **OpenAI has not adopted A2A** in its own Agents SDK as of the PR closure (2025-08-13) and no reversal was found in the sources opened for this chapter [S12] — see Unverified for whether this has since changed.
- **Microsoft's VS Code team built its own protocol instead of using A2A** for multi-agent-harness communication: "Agent Host Protocol" (AHP), announced on HN mid-2026 by a VS Code team member, explicitly as "a common protocol for talking to a host of multiple agents/harnesses" [S11] — a concrete instance of fragmentation the interop story was supposed to prevent.
- **Security is formally under-specified in ways a compliant server can't fix by itself**: A2ABreak's central point is that its 11 findings are exploitable *while fully honoring the spec* — cross-client context injection via unprotected `contextId`, multi-hop credential/identity loss through delegation chains, and rogue agents making unattested capability claims in their AgentCard that nothing in the protocol lets a client verify [S10]. This is a stronger and more recent claim than earlier informal "no defenses against prompt injection" blog posts from March 2026, which this session could not independently verify beyond their own headline (see Unverified) [S16].
- **The opacity principle cuts against debuggability.** Multiple HN commenters (April 2025 launch thread) complained they could not easily see "the actual JSON that goes over the wire" or how an LLM is prompted to trigger an A2A call — a legitimate early-adoption complaint, though largely addressed since by the official samples/inspector tooling (`a2a-inspector` repo) [S17].
- **Breaking changes have been frequent and are not painless**: 0.3→1.0 alone changed the well-known-URI filename, the enum JSON casing, ID field types, push-notification config shape, and OAuth2 flow support — five separate breaking changes in one release, requiring the SDK to ship an explicit "0.3 compatibility mode" rather than a clean cutover [S13][S14].
- **"Enterprise consulting halo" criticism**: several April-2025 HN commenters flagged the long list of Big-4/consultancy logos on the launch page as a signal the protocol's real audience is enterprise IT procurement rather than working engineers — a perception/marketing critique, not a technical one, but repeatedly raised [S17].
- **Trust/authority is unsolved, not just security-unsolved**: HN 2026-06 discussion converges on "communication [between agents] seems solvable. Trusting the action feels much harder" — i.e., A2A standardizes the wire format but doesn't answer delegation-authority or capability-verification questions, which is exactly what A2ABreak formalizes as a vulnerability class [S11][S10].

## What changed in the last 6 months (since ~2026-03-30)

- **v1.0.0 → v1.0.1** patch (2026-05-26): `application/a2a+json` preferred over generic `application/json` in the HTTP binding; TaskStatus enum value documentation bug fixed [S3].
- The **A2ABreak** security paper (Sept 2026) is the newest and most rigorous primary-source-adjacent material on A2A specifically; it postdates and goes well beyond the informal March 2026 "zero defenses" blog claim [S10][S16].
- Continued ecosystem churn: "Ask HN: Is anyone using A2A?" (June 2026) shows the community still actively re-litigating whether A2A has product-market fit a full year after Linux Foundation governance and three months after 1.0 GA — adoption is not settled [S11].
- Microsoft's VS Code team choosing to build AHP instead of A2A (surfaced in the June 2026 HN thread) is the most concrete "who didn't adopt it and why" datapoint from this window [S11].

## Diagram candidates

1. **A2A vs MCP shape** — two agents each with internal MCP-connected tools, linked to each other by a single horizontal A2A line; labels: "vertical (agent→tool)" vs "horizontal (agent↔agent)" [S9].
2. **Task lifecycle state machine** — states SUBMITTED → WORKING → {COMPLETED, FAILED, CANCELED, REJECTED} with side branches to INPUT_REQUIRED and AUTH_REQUIRED that loop back to WORKING; mark terminal vs interrupted states distinctly [S3 proto TaskState].
3. **Three-layer spec architecture** — Data Model / Operations / Bindings stacked boxes, with JSON-RPC, gRPC, HTTP+JSON/REST as three parallel binding boxes under "Operations" [S2 §1.3 mermaid].
4. **SendMessage request/response sequence** — client → agent `message:send`, agent creates Task, returns Task-or-Message; branch to streaming variant showing SSE frames (task → artifactUpdate → statusUpdate) [S2 §6.1-6.2].
5. **Push notification flow** — client registers `TaskPushNotificationConfig` (webhook URL + auth), task runs async, server POSTs `StreamResponse`-shaped payload to webhook on each update, client 2xx-acks [S2 §4.3.3].
6. **Discovery paths** — three arrows into a client: well-known URI fetch, registry/catalog query, direct pre-configured URL, converging on "AgentCard" [S2 §8.2].
7. **AgentCard structure** — box diagram: identity (name/description/provider) + capabilities (streaming/push/extendedCard/extensions[]) + securitySchemes + skills[] + supportedInterfaces[] (ordered) + signatures[] [S2 §8.5 sample].
8. **Extension activation flow** — AgentCard declares extension (uri, required) → client sends `A2A-Extensions` header + `Message.extensions[]` + `Message.metadata[uri]` payload → server honors or errors with `ExtensionSupportRequiredError` [S2 §4.6].
9. **Governance structure** — Linux Foundation → A2A TSC (8 company seats) → Contributors/Maintainers, alongside a note that ACP (IBM/BeeAI) merged in as a sub-lineage [S5][S6].
10. **Protocol timeline (Gantt-style)**: April 2025 launch → June 2025 LF donation → v0.2.x (mid-2025) → v0.3.0 (Jul 2025, well-known URI + signing) → ADR-001 (Nov 2025) → v1.0.0 (Mar 2026, breaking) → v1.0.1 (May 2026) → A2ABreak paper (Sep 2026) [S1][S2][S3][S4][S10][S13].
11. **Version negotiation** — client sends `A2A-Version` header; server either processes at that Major.Minor or returns `VersionNotSupportedError`; empty header implies 0.3 [S2 §3.6].
12. **Chart candidate**: bar chart, A2A-sdk vs mcp PyPI monthly downloads, 10.9M vs 257M — single HN-sourced datapoint, label clearly as unverified/approximate, mid-2026 [S11].

## Glossary

- **A2A Client**: app/agent that initiates requests to an A2A Server [S2 §2.2].
- **A2A Server / Remote Agent**: exposes an A2A-compliant endpoint [S2 §2.2].
- **Agent Card**: JSON capability/identity manifest a server publishes [S2 §2.2].
- **Task**: stateful unit of work, unique id, lifecycle-bound [S2 §2.2].
- **Message**: one communication turn, `role` + `Parts` [S2 §2.2].
- **Part**: smallest content unit (text/file/data) inside a Message or Artifact [S2 §2.2].
- **Artifact**: task output composed of Parts [S2 §2.2].
- **contextId**: groups related Tasks/Messages [S2 §2.2].
- **Extension**: URI-identified add-on capability beyond core spec [S2 §2.2, §4.6].
- **Opacity**: design principle — agents don't expose internal state/tools/memory to each other [S2 §1.2].
- **ProtoJSON**: Google's canonical proto3→JSON mapping, adopted as A2A's normative JSON serialization since ADR-001 [S4].
- **AGNTCY**: separate LF-hosted open-source stack (Cisco/Google/Oracle/Red Hat/Dell TSC) for agent discovery/identity/messaging/observability; distinct project from A2A, overlapping goals [S ad-hoc, see AGNTCY source below].
- **ACP (BeeAI's, not IBM's original acronym clash with Anthropic's "Agent Client Protocol")**: IBM/BeeAI's "Agent Communication Protocol," merged into A2A under the LF [S6].
- **AP2**: Google's Agent Payments Protocol, shipped as an A2A extension (ch.10 detail) [S7].

## Unverified / open questions

- Whether OpenAI's `openai-agents-python` has added A2A support at any point **after** the 2025-08-13 PR closure — not found in sources opened this session; the repo's current state was not re-checked live.
- The exact figures "10.9M vs 257M" PyPI downloads [S11] are a single HN commenter's citation of pypistats at an unspecified date in mid-2026; this session's own pypistats API call was rate-limited (429) and could not independently confirm the numbers — **treat as approximate, one-source**.
- "Google's A2A Protocol Has Zero Defenses Against Prompt Injection" (grith.ai, 2026-03-20) — only the headline/HN listing was seen; the post itself was not opened, so its technical substance is unverified here. The academically peer-reviewable A2ABreak paper (Sept 2026) is the stronger, better-sourced claim on the same general theme and should be preferred [S10 over S16].
- AGNTCY's precise relationship to A2A (complementary layer vs. overlapping competitor) was not resolved from the one page fetched — its landing page mentions A2A only once, in passing, re: an "AgentBridge" component; no architecture document comparing the two was opened.
- Full REST-binding (`/tasks/{id}` GET-style) and gRPC error-handling sections (§10.6, §11) were located in the spec but not read in full detail in this pass — the JSON-RPC and mermaid-diagrammed HTTP+JSON examples were prioritized as representative wire formats; a follow-up read of §10 and §11 verbatim would sharpen the gRPC/REST-specific mechanics if the book chapter needs them.
- Did not verify current production usage claims for AWS Bedrock AgentCore, Microsoft Agent Framework, or CrewAI's A2A integration pages beyond 404s/redirects encountered; framework support should be re-verified directly against each vendor's current docs before publication.

## Sources

- [S1] "Linux Foundation Launches the Agent2Agent Protocol Project" — Linux Foundation press release, accessed via WebFetch, dated 2025-06-23 (event date; page itself undated in fetch but event date stated in body), https://www.linuxfoundation.org/press/linux-foundation-launches-the-agent2agent-protocol-project-to-enable-secure-intelligent-communication-between-ai-agents, accessed 2026-09-30.
- [S2] A2A Protocol Specification (markdown source), a2aproject/A2A repo, `docs/specification.md`, current as of `main` branch fetch on 2026-09-30 (spec version 1.0.1 per CHANGELOG), https://raw.githubusercontent.com/a2aproject/A2A/main/docs/specification.md, accessed 2026-09-30.
- [S3] a2aproject/A2A GitHub repository: README.md, CHANGELOG.md, `specification/a2a.proto`, GOVERNANCE.md — all fetched raw from `main` branch, https://github.com/a2aproject/A2A, accessed 2026-09-30.
- [S4] ADR-001: Leverage ProtoJSON Specification for JSON Serialization, A2A TSC, dated 2025-11-18, https://raw.githubusercontent.com/a2aproject/A2A/main/adrs/adr-001-protojson-serialization.md, accessed 2026-09-30.
- [S5] GOVERNANCE.md, a2aproject/A2A repo (TSC composition, 8 companies), undated (current membership snapshot), https://raw.githubusercontent.com/a2aproject/A2A/main/GOVERNANCE.md, accessed 2026-09-30.
- [S6] i-am-bee/acp GitHub repository README (ACP→A2A merger banner), undated banner, project ongoing, https://raw.githubusercontent.com/i-am-bee/acp/main/README.md, accessed 2026-09-30.
- [S7] AP2 Protocol site (ap2-protocol.org landing page), states AP2 v0.2, announcement dated 2025-09-16, https://ap2-protocol.org/, accessed 2026-09-30.
- [S8] Google Developers Blog, "The Agent2Agent Protocol (A2A)" announcement, dated 2025-04-09, https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/, accessed 2026-09-30 (also cross-referenced via HN item 43631381).
- [S9] a2a-protocol.org, "A2A and MCP" topic page, undated (current doc-site content, 2026), https://a2a-protocol.org/latest/topics/a2a-and-mcp/, accessed 2026-09-30.
- [S10] "A2ABreak: Systematic Security Analysis of the A2A Protocol," arXiv:2609.10871, dated September 2026 (arXiv id month code 2609), https://arxiv.org/abs/2609.10871, accessed 2026-09-30.
- [S11] Hacker News, "Ask HN: Is anyone using the A2A protocol?", item id 48582679, posted 2026-06-18, 96 points / 45 comments, https://news.ycombinator.com/item?id=48582679, accessed 2026-09-30 via HN Algolia API.
- [S12] GitHub PR openai/openai-agents-python#1245, "Feature: Add Agent-to-Agent (A2A) Protocol Support," opened 2025-07-25, closed unmerged 2025-08-13, https://github.com/openai/openai-agents-python/pull/1245, accessed 2026-09-30 via GitHub API.
- [S13] CHANGELOG.md, a2aproject/A2A repo, entries v0.1.0 through v1.0.1, https://raw.githubusercontent.com/a2aproject/A2A/main/CHANGELOG.md, accessed 2026-09-30.
- [S14] a2aproject/a2a-python README.md (compatibility table, install instructions), current `main` branch, https://raw.githubusercontent.com/a2aproject/a2a-python/main/README.md, accessed 2026-09-30.
- [S15] Credal.ai blog, "What Happened to A2A Protocol?" by Jessica Shen, dated 2026-03-06, https://www.credal.ai/blog/what-happened-to-a2a-protocol, accessed 2026-09-30.
- [S16] grith.ai blog, "Google's A2A Protocol Has Zero Defenses Against Prompt Injection," referenced via HN listing dated 2026-03-20; post body not independently opened this session, https://grith.ai/blog/a2a-protocol-zero-defenses-prompt-injection, accessed 2026-09-30 (listing only).
- [S17] Hacker News, "The Agent2Agent Protocol (A2A)" launch discussion, item id 43631381, posted 2025-04-09, 450 points / 280 comments, https://news.ycombinator.com/item?id=43631381, accessed 2026-09-30 via HN Algolia API.
- [Sx-samples] a2aproject/a2a-samples repo, `samples/python/agents/helloworld/{__main__.py, test_client.py}` — minimal A2A server/client reference code, current `main` branch, https://github.com/a2aproject/a2a-samples/tree/main/samples/python/agents/helloworld, accessed 2026-09-30.
- [Sx-agntcy] agntcy.org landing page, undated (current site content, 2026), https://agntcy.org/, accessed 2026-09-30.
