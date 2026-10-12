# A2A: Agent2Agent — field reports notes

## TL;DR (what an engineer must know today, 2026-09-30)

- A2A launched April 2025 (Google), donated to Linux Foundation June 2025, IBM's ACP formally merged into A2A August 2025, **v1.0 ("production-ready") shipped 2026-03-12** [S1][S12], and A2A itself joined the newly formed **Agentic AI Foundation (AAIF)**, hosted by Linux Foundation, alongside its March 2026 v1.0 release (blog post dated August 2026) [S2].
- The spec is now **proto-first**: canonical source is `specification/a2a.proto`; JSON Schema is a generated, non-normative build artifact [S6]. Official protocol bindings are `JSONRPC`, `GRPC`, `HTTP+JSON` — declared per-endpoint in an `AgentInterface` list on the Agent Card, not a single fixed transport [S5][S6].
- v1.0 added real **multi-tenancy**: a `tenant` string field routes multiple agents behind one A2A endpoint (`ListTasks` RPC, `tenant` field on `AgentInterface`/`TaskPushNotificationConfig`/every request) [S6].
- v1.0 added **signed Agent Cards** (`AgentCardSignature` — JWS, base64url `protected` header + `signature`) as a first-class spec object, not a bolt-on [S6].
- The a2a-python SDK (2,167 GitHub stars) implements all three bindings for both 1.0 and 0.3-compat mode; SDKs exist for Python, Go, JS/TS, Java, .NET, Rust [S4][S7].
- **The dominant 2026 production pain point is not the wire protocol — it's identity/trust.** The A2A GitHub repo's most-commented issues in 2026 are all agent-identity/trust proposals (658, 245, 143, 124, 116, 99, 94 comments) [S9][S10], vastly outweighing anything about JSON-RPC vs gRPC.
- A **self-disclosed AI research agent** ran 50-agent probes across live agent directories in April 2026 and found **0–4% of agents that advertise A2A support actually return a valid `/.well-known/agent-card.json`** or respond to a `tasks/send` request — "widespread endpoint advertisement" with near-zero real interoperability [S11]. Treat this as one unverified data point, not an audited benchmark — see Pitfalls.
- Several of the highest-comment identity/trust threads show clear **vendor cross-promotion / astroturfing patterns**: multiple accounts pitching competing "trust layer" startups (AgentID, APS, qntm, MolTrust, MoltBridge) proposing DIDs, Solana-anchored receipts, and a self-declared "Agent Identity Working Group" that ratified its own spec within days, inside the official issue tracker [S10]. This is itself a field-report finding worth naming in the book: 2026's open-source issue trackers are a target for AI-agent-driven marketing spam.
- Tooling fragmented enough by mid-2026 that a GitHub issue proposed an **official `a2a` CLI** to replace 6+ independent community CLIs in Go, .NET, Python, TypeScript, Rust, Swift [S13].
- **AP2 (Agent Payments Protocol)**, Google's payments protocol (Sept 2025), ships its worked examples specifically as A2A "scenarios" (`code/samples/python/scenarios/a2a/human-present/cards/`) — confirming AP2 is designed to ride on top of A2A rather than replace it [S14].
- **AGNTCY** (Cisco-led interop initiative) is a separate, much smaller ecosystem by GitHub star count (its biggest repo, `agntcy/identity`, has 104 stars vs A2A's 25,973) [S15][S16], but AGNTCY's `slim` project ships its own A2A CLI variant with SPIRE-based identity auth — a concrete example of the two efforts touching, not fully merging [S13].
- Framework support is broad by mid-2026: Google ADK, LangGraph, CrewAI, Microsoft Agent Framework (.NET/Python/Go), AWS Bedrock AgentCore (patterns list "A2A" as one of 11 built-in patterns), Pydantic AI — confirmed via real repos in the wild, not just announcements [S17][S18].
- The original April 2025 HN launch thread (450 points, 280 comments) already contained the two criticisms that recur through 2026: (1) "frustratingly difficult to see what these protocols actually look like" on the wire, and (2) suspicion that a "protocol" is a moat/standard-war play by whichever vendor ships it first [S3].

## Current state and versions (as of 2026-09-30)

- **Latest stable spec / SDK tag:** `v1.0.1`, released 2026-05-28 [S8]. `v1.0.0` shipped 2026-03-12 (preceded by `v1.0.0-rc`) [S8][S12].
- **Version history (GitHub tags, a2aproject/A2A):** v0.1.0 → v0.2.0 (2025-06-09) → v0.2.1…v0.2.6 (May–July 2025) → v0.3.0 (2025-07-30) → v1.0.0-rc → v1.0.0 (2026-03-12) → v1.0.1 (2026-05-28) [S8].
- **Governance:** A2A Technical Steering Committee lists AWS, Cisco, Google, IBM Research, Microsoft, Salesforce, SAP, and ServiceNow [S1]. A2A is a project under the **Agentic AI Foundation (AAIF)**, itself hosted by the Linux Foundation; AAIF also hosts AGENTS.md, `goose` (agent runtime), `agentgateway`, and (per the AAIF blog, unverified independently) MCP-adjacent governance framing [S2].
- **IBM's Agent Communication Protocol (ACP)** merged into A2A in **August 2025** per the AAIF retrospective timeline [S2] — this matches the chapter scope's mention of an ACP merger; I could not independently pull IBM's own announcement post in this pass (see Unverified).
- **SDKs:** Python (`a2a-sdk`, 2,167★), Go (`a2a-go`, 476★), JavaScript/TypeScript (`@a2a-js/sdk`), Java (Maven), .NET (NuGet `A2A`), Rust (`cargo add a2a-lf`) [S4][S7]. The Python SDK's compatibility table confirms **all three bindings (JSON-RPC, HTTP+JSON/REST, gRPC) are implemented for both 1.0 and 0.3-compat client and server** [S4].
- **GitHub star counts (2026-09-30 snapshot):** `a2aproject/A2A` 25,973★; `a2aproject/a2a-python` 2,167★; `a2aproject/a2a-samples` 1,785★; `a2aproject/a2a-go` 476★ [S15]. For comparison, AGNTCY's largest single repo (`agntcy/identity`) sits at 104★ [S16] — a rough proxy for relative community mass, not feature completeness.

## Timeline (dated)

- **2025-04-09**: Google launches A2A publicly (`developers.googleblog.com` post, 450pt/280-comment HN thread) [S3].
- **2025-05-07 → 2025-07**: v0.2.x point releases; Microsoft publishes "Empowering multi-agent apps with the open Agent2Agent (A2A) protocol" [S1].
- **2025-06-24/25**: Google donates A2A to the Linux Foundation; founding members include AWS, Cisco, Microsoft, Salesforce, SAP, ServiceNow [S1][S2].
- **2025-07-30**: v0.3.0 ships.
- **2025-08 (per AAIF retrospective)**: IBM's ACP merges into A2A [S2].
- **2025-09-16**: Google announces **AP2 (Agent Payments Protocol)**, an open protocol for AI-driven payments, built to compose with A2A (and MCP) [source: Google Cloud blog via HN index, S1].
- **2025-11-04**: Security researchers publicly demonstrate an "Agent2Agent prompt injection risk" (scworld.com) [S1].
- **2026-03-12**: **A2A v1.0.0 ships** — "production-ready standard," proto-first spec, multi-tenancy, signed Agent Cards, tightened/breaking interaction-protocol behavior with an AgentCard-level backward-compat path to 0.3 [S12].
- **2026-03-13 → 2026-06**: Wave of high-comment GitHub issues proposing identity/trust extensions for Agent Cards (#1672, #1628, #1575, #1717, #1786, #1829, #1769, #1716, #1847, #1742, #1667, #1755, #1713, #1718, #1860, #1501) [S9][S10][S11].
- **2026-05-28**: v1.0.1 patch release [S8].
- **2026-06-10**: Community proposes an official `a2a` CLI to consolidate 6+ fragmented independent CLIs [S13].
- **2026-08-19**: AAIF blog post: "Agent2Agent (A2A) joins Agentic AI Foundation (AAIF)'s open agentic stack" [S2].

## Mechanics

### Spec source of truth: proto-first, three bindings

As of 1.0, the canonical spec is a **protobuf file** (`specification/a2a.proto`, ~36KB), and the JSON Schema (`a2a.json`) is generated from it at build time via `protoc-gen-jsonschema` and explicitly marked "Do Not Edit" [S6]. This is a structural shift from the earlier (0.x) JSON-Schema-first spec.

`AgentInterface` (VERBATIM, from `specification/a2a.proto`, main branch, [S6]):
```protobuf
message AgentInterface {
  // The URL or address where this interface is available. For HTTP-based transports, must be a valid absolute
  // HTTPS URL in production. For gRPC, the address should be in the format "hostname:port".
  // Example: "https://api.example.com/a2a/v1", "grpc.example.com:443"
  string url = 1 [(google.api.field_behavior) = REQUIRED];
  // The protocol binding supported at this URL. This is an open form string, to be
  // easily extended for other protocol bindings. The core ones officially
  // supported are `JSONRPC`, `GRPC` and `HTTP+JSON`.
  string protocol_binding = 2 [(google.api.field_behavior) = REQUIRED];
  // Optional. An opaque string used for routing requests to a specific agent
  // or tenant when multiple agents are served behind a single A2A endpoint.
  // When set, clients MUST include this value in the `tenant` field of all
  // request messages sent to this interface. The server is responsible for
  // interpreting the value and routing requests accordingly; the protocol
  // does not define its format or semantics.
  string tenant = 3;
  // The version of the A2A protocol this interface exposes.
  // Use the latest supported minor version per major version.
  // Examples: "0.3", "1.0"
  string protocol_version = 4 [(google.api.field_behavior) = REQUIRED];
}
```
This is the mechanism behind "protocol bindings (JSON-RPC, gRPC, HTTP+JSON/REST)" from the chapter scope: an Agent Card lists an ordered array of `AgentInterface`s (first = preferred), each independently declaring its transport, and clients pick one. It also explains the `tenant` field used for multi-agent-per-endpoint hosting, new in 1.0.

### Core objects

**AgentCard** — the self-describing manifest an agent publishes. Required fields include `name`, `description`, `supported_interfaces` (ordered, first preferred), `version`, `capabilities`, `default_input_modes`/`default_output_modes`, `skills`. Optional: `documentation_url`, `provider`, `security_schemes`/`security_requirements`, `signatures` (see below), `icon_url` [S6].

**AgentCardSignature** (VERBATIM, [S6]) — new 1.0 mechanism for "signed agent cards":
```protobuf
message AgentCardSignature {
  // Required. The protected JWS header for the signature. This is always a
  // base64url-encoded JSON object.
  string protected = 1 [(google.api.field_behavior) = REQUIRED];
  // Required. The computed signature, base64url-encoded.
  string signature = 2 [(google.api.field_behavior) = REQUIRED];
  // The unprotected JWS header values.
  google.protobuf.Struct header = 3;
}
```
This is a plain JWS (JSON Web Signature) over the card contents, not a bespoke crypto format — worth contrasting in the book with the ad-hoc DID/blockchain-anchoring schemes vendors were pitching in the GitHub identity threads (see Pitfalls).

**AgentCapabilities**: `streaming` (bool), `push_notifications` (bool), `extensions` (repeated `AgentExtension`), `extended_agent_card` (bool) — the last flag signals a richer, authenticated-only card is available via `GetExtendedAgentCard` [S6].

**AgentExtension** (VERBATIM, [S6]) — the generic extension mechanism (this is how AP2 attaches to A2A):
```protobuf
message AgentExtension {
  // The unique URI identifying the extension.
  string uri = 1;
  // A human-readable description of how this agent uses the extension.
  string description = 2;
  // If true, the client must understand and comply with the extension's requirements.
  bool required = 3;
  // Optional. Extension-specific configuration parameters.
  google.protobuf.Struct params = 4;
}
```

**Task and its lifecycle** — `Task` (VERBATIM, [S6]):
```protobuf
message Task {
  string id = 1 [(google.api.field_behavior) = REQUIRED];
  string context_id = 2;
  TaskStatus status = 3 [(google.api.field_behavior) = REQUIRED];
  repeated Artifact artifacts = 4;
  repeated Message history = 5;
  google.protobuf.Struct metadata = 6;
}
```
`TaskState` enum (VERBATIM, [S6]) — this is the full lifecycle state machine:
```protobuf
enum TaskState {
  TASK_STATE_UNSPECIFIED = 0;
  TASK_STATE_SUBMITTED = 1;      // successfully submitted and acknowledged
  TASK_STATE_WORKING = 2;        // actively being processed
  TASK_STATE_COMPLETED = 3;      // terminal
  TASK_STATE_FAILED = 4;         // terminal
  TASK_STATE_CANCELED = 5;       // terminal
  TASK_STATE_INPUT_REQUIRED = 6; // interrupted — needs more input to proceed
  TASK_STATE_REJECTED = 7;       // terminal — agent decided not to perform the task
  TASK_STATE_AUTH_REQUIRED = 8;  // interrupted — needs authentication to proceed
}
```
Note the comment structure distinguishes **terminal** states (COMPLETED/FAILED/CANCELED/REJECTED) from **interrupted** states (INPUT_REQUIRED/AUTH_REQUIRED) that can resume — this distinction matters for client retry/resume logic and is easy to miss if you only skim the enum names.

**`contextId`** groups a related set of Tasks and Messages (a "conversation" or session concept) — present on both `Message` and `Task` as `context_id` [S6].

**Message** (VERBATIM, [S6]):
```protobuf
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
```

**Part** (VERBATIM, [S6]) — a `oneof` over the possible content shapes:
```protobuf
message Part {
  oneof content {
    string text = 1;
    bytes raw = 2;        // base64 in JSON serialization
    string url = 3;
    google.protobuf.Value data = 4;   // arbitrary structured JSON
  }
  google.protobuf.Struct metadata = 5;
  string filename = 6;
  // media_type field follows
}
```

**Artifact** (VERBATIM, [S6]) — task outputs, distinct from Message parts:
```protobuf
message Artifact {
  string artifact_id = 1 [(google.api.field_behavior) = REQUIRED];
  string name = 2;
  string description = 3;
  repeated Part parts = 4 [(google.api.field_behavior) = REQUIRED];
  google.protobuf.Struct metadata = 5;
  repeated string extensions = 6;
}
```

### Operations (gRPC/REST service surface, VERBATIM excerpts, [S6])

The `A2AService` proto defines every operation as gRPC methods with matching HTTP+JSON bindings (`google.api.http` annotations) — this is the same mechanism gRPC-gateway/Connect use, so one proto definition drives all three official bindings:

```protobuf
service A2AService {
  rpc SendMessage(SendMessageRequest) returns (SendMessageResponse) {
    option (google.api.http) = { post: "/message:send" body: "*"
      additional_bindings: { post: "/{tenant}/message:send" body: "*" } };
  }
  rpc SendStreamingMessage(SendMessageRequest) returns (stream StreamResponse) {
    option (google.api.http) = { post: "/message:stream" body: "*" ... };
  }
  rpc GetTask(GetTaskRequest) returns (Task) {
    option (google.api.http) = { get: "/tasks/{id=*}" ... };
  }
  rpc ListTasks(ListTasksRequest) returns (ListTasksResponse) {
    option (google.api.http) = { get: "/tasks" ... };   // NEW in 1.0 (multi-tenant listing)
  }
  rpc CancelTask(CancelTaskRequest) returns (Task) {
    option (google.api.http) = { post: "/tasks/{id=*}:cancel" body: "*" ... };
  }
  rpc SubscribeToTask(SubscribeToTaskRequest) returns (stream StreamResponse) {
    // Returns `UnsupportedOperationError` if the task is already in a terminal state
    option (google.api.http) = { get: "/tasks/{id=*}:subscribe" ... };
  }
  rpc CreateTaskPushNotificationConfig(TaskPushNotificationConfig) returns (TaskPushNotificationConfig) { ... }
  rpc GetTaskPushNotificationConfig(...) returns (TaskPushNotificationConfig) { ... }
  rpc ListTaskPushNotificationConfigs(...) returns (ListTaskPushNotificationConfigsResponse) { ... }
  rpc DeleteTaskPushNotificationConfig(...) returns (google.protobuf.Empty) { ... }
  rpc GetExtendedAgentCard(GetExtendedAgentCardRequest) returns (AgentCard) {
    option (google.api.http) = { get: "/extendedAgentCard" ... };
  }
}
```
Streaming is delivered via `stream StreamResponse` at the gRPC level, which maps to Server-Sent Events (SSE) on the JSON-RPC/HTTP bindings (`message:stream`, `tasks/{id}:subscribe`) — the "streaming via SSE" behavior in the chapter scope is this same RPC surface exposed over a chunked HTTP response instead of a gRPC stream.

**Push notifications** run through `TaskPushNotificationConfig` (VERBATIM, [S6]):
```protobuf
message TaskPushNotificationConfig {
  string tenant = 1;   // must match tenant from the AgentInterface, if set
  string id = 2;
  string task_id = 3;
  string url = 4 [(google.api.field_behavior) = REQUIRED];  // webhook URL
  string token = 5;    // unique per task/session
  AuthenticationInfo authentication = 6;
}
```
This is the async push-notification path for long-running tasks: client registers a webhook config against a task id; the agent POSTs updates there instead of (or alongside) the client holding a streaming connection open. It composes with the `tenant` field the same way regular requests do.

### Minimal Python server + client (VERBATIM, adapted excerpt from `a2a-samples/samples/python/agents/helloworld/__main__.py`, main branch, [S19])

```python
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.routes import create_agent_card_routes, create_jsonrpc_routes
from a2a.server.tasks import InMemoryTaskStore
from a2a.types import AgentCapabilities, AgentCard, AgentInterface, AgentSkill

skill = AgentSkill(
    id='echo_bot',
    name='Echo Bot',
    description='An example agent that acknowledges client request and responds with a "Hello World" message.',
    input_modes=['text/plain'],
    output_modes=['text/plain'],
    tags=['a2a', 'echo-example'],
    examples=['hi', 'how are you'],
)

public_agent_card = AgentCard(
    name='Hello World Agent',
    description='Just a hello world agent',
    version='0.0.1',
    default_input_modes=['text/plain'],
    default_output_modes=['text/plain'],
    capabilities=AgentCapabilities(streaming=True, extended_agent_card=True),
    supported_interfaces=[
        AgentInterface(protocol_binding='JSONRPC', url='http://127.0.0.1:9999', protocol_version='1.0')
    ],
    skills=[skill],
)

request_handler = DefaultRequestHandler(
    agent_executor=HelloWorldAgentExecutor(),
    task_store=InMemoryTaskStore(),
    agent_card=public_agent_card,
    # extended_agent_card=... (authenticated-only card with extra skills)
)
```
Note that `supported_interfaces` (plural, ordered list) replaces what in 0.x was effectively a single `url` field — this is the multi-binding, multi-tenant-ready shape baked into the SDK types now. The sample's client (`test_client.py`) resolves the card via `A2ACardResolver`, then sends both streaming and non-streaming `message` requests — mirroring the operations list above.

### Discovery

Three discovery surfaces show up across the ecosystem docs and repos gathered here: the **well-known agent card URL** (`/.well-known/agent-card.json`, tested directly in the compliance-gap issue [S11]), the **`GetExtendedAgentCard`** RPC for richer authenticated cards [S6], and third-party **registries/catalogs** (the compliance study explicitly names `relayzero.ai` and `claw-grid.com` as agent directories it probed) [S11]. I did not find, in this pass, an official Linux-Foundation-run curated catalog distinct from these community directories — treat "curated catalogs" as still community-driven as of Sept 2026 (see Unverified).

### Opacity principle

Restated consistently across the README and spec intro: "Preserve Opacity: Allow agents to collaborate without needing to share internal memory, proprietary logic, or specific tool implementations, enhancing security and protecting intellectual property" [S1]. Mechanically this is enforced by what's *not* in the protocol — no shared memory/tool schema exchange like MCP's tool listing; only Agent Card capability descriptions, Messages, and Artifacts cross the wire.

## Numbers

- **25,973** GitHub stars on `a2aproject/A2A` vs **104** on AGNTCY's largest single repo (`agntcy/identity`) — snapshot 2026-09-30, via GitHub Search API [S15][S16]. Use as a rough community-mass signal only; AGNTCY explicitly targets a different (broader interop stack) scope than A2A alone.
- **2,167** stars on `a2a-python` SDK; **1,785** on `a2a-samples`; **476** on `a2a-go` — same snapshot [S15].
- Top-commented A2A GitHub issues (2026, as of this pull): **658** comments (#1672, Agent Identity Verification), **245** (#1786, Cryptographic Agent Identity extension), **143** (#1829, Ed25519+RFC 9421 signing), **124** (#1628, trust.signals[] extension), **116** (#1575, identity/delegation/enforcement), **99** (#1769), **94** (#1717, governance metadata) — all identity/trust proposals, none about the wire protocol itself [S9][S10].
- **50 agents probed** across `relayzero.ai`, `claw-grid.com`, and other directories, April 2026 (self-reported, "OpenClaw research project," disclosed as run by an autonomous AI agent): 50/50 advertised A2A support; **~0–2 (0–4%)** returned a valid agent card; **0/50** responded correctly to a `tasks/send` request; most common failure HTTP 404/timeout, second most common an HTML page instead of JSON [S11]. **Single self-disclosed, non-peer-reviewed data point — not independently verified in this pass.**
- Original A2A launch HN thread: **450 points, 280 comments** (2025-04-09) [S3]. The GitHub-based Agent Identity Working Group claims to have "ratified" its QSP-1 v1.0 spec with 3 of 4 founding members signing off within **roughly 24 hours** of forming (per issue #1672 timestamps, 2026-03-23 → 2026-03-24) [S10] — cited here as a *pace* data point illustrating how fast these self-organizing spec efforts move inside a public issue thread, not as a claim about the spec's merit.

## Pitfalls, limits, criticism

- **Agent Card compliance ≠ agent reachability.** The 0–4% live-endpoint finding [S11] is the single most quotable "what bites in production" data point for this chapter, but it comes from one self-disclosed AI-agent-run study with no independent replication found in this pass, published as a GitHub issue comment, not a paper. Present it as "a claimed measurement that sparked real discussion," not as an audited fact. The methodology (probe `/.well-known/agent-card.json` + a `tasks/send` call across two named agent directories) is concrete enough to be independently reproducible, which is itself worth noting to readers who want to check it.
- **The identity/trust discourse shows heavy vendor-promotion / likely-bot patterns.** Reading through issue #1672 (658 comments) and #1755, a recurring shape appears: an account posts a proposal referencing their own product (AgentID, APS/`agent-passport-system`, qntm, MolTrust, MoltBridge), a second account "independently" validates it and proposes integration, a "Working Group" forms and ratifies a joint spec within hours to days, with Solana transaction hashes and DID methods cited as proof of "interoperability" — all inside the official A2A repo's issue tracker [S10]. Whether or not this is deliberate astroturfing, it is a live, checkable phenomenon: readers can open issue #1672 themselves and see the pattern. Frame it for the book as: **open-source issue trackers for hot 2026 standards are themselves a marketing/spam surface, and volume-of-comments is not a proxy for spec quality or community consensus.**
- **Governance is now multi-org but still Google-adjacent in practice**: TSC includes AWS, Cisco, Google, IBM Research, Microsoft, Salesforce, SAP, ServiceNow [S1] — genuinely broad — but the spec repo, samples, SDKs and the a2a-protocol.org docs site are still primarily Google-authored/maintained artifacts as of this pass.
- **1.0 is a breaking change from 0.3** at the interaction-protocol level (per the announcement's own framing, via WebFetch summary of the blog post) [S1], with Agent-Card-level dual advertisement (an agent can claim both v0.3 and v1.0 support simultaneously) as the migration bridge. The `a2a-python` SDK ships an explicit "v0.3 → v1.0 migration guide" and keeps 0.3-compat client/server support [S4] — budget for a real migration, not a drop-in bump.
- **Tooling fragmentation was bad enough by June 2026** that the community filed a formal "official CLI" request listing 6 independently-built CLIs (Go/AGNTCY's `slim`, .NET, the in-org `a2a-go` CLI, Python's `chrishayuk/a2a-cli`, TypeScript, Rust) plus a Swift auth-focused client that isn't even a CLI [S13] — a sign the ecosystem outgrew its own reference tooling faster than the org could consolidate it.
- **Early (2025) HN skepticism has aged into a live debate, not a settled one**: "aren't agents supposed to be adaptable enough to handle any protocol?" and the standards-as-moat argument [S3] both still surface in 2026 threads about whether A2A's growing security/identity surface is solving a real problem or building exactly the kind of heavyweight standard the "agents should just read the docs" camp warned about.
- **No dedicated `a2a` / `a2a-protocol` Stack Overflow tag with content** as of this pull (0 results via the StackExchange API) [S20] — for a protocol with 25k+ GitHub stars, this suggests most real troubleshooting still happens on GitHub Discussions/Issues and Discord rather than SO, which matters for where to actually search when debugging in production.

## What changed in the last 6 months (since ~2026-04)

- v1.0.0 → v1.0.1 patch (2026-05-28) [S8].
- The identity/trust proposal wave (#1575 onward) essentially *is* the last-6-months story for A2A: it starts right at/after the 1.0 ship date (2026-03-12/13) and is still the most active area of the repo through at least June 2026 [S8][S9][S10].
- Official-CLI consolidation proposal (2026-06-10) [S13] — a direct response to the SDK/tooling sprawl that followed 1.0 adoption.
- AAIF formation and A2A's move into it, publicly documented 2026-08-19 [S2] — the clearest governance change since the original Linux Foundation donation in June 2025.
- AP2 continuing to ship as an A2A-scenario-based sample set rather than a separate wire protocol, based on the `code/samples/*/scenarios/a2a/` layout still present in the repo [S14].

## Diagram candidates

1. **Governance lineage**: Google (Apr 2025) → Linux Foundation donation (Jun 2025) → IBM ACP merge (Aug 2025) → v1.0 ship (Mar 2026) → AAIF membership (Aug 2026). Boxes = orgs/events, arrows = dated transitions.
2. **AgentCard → AgentInterface fan-out**: one `AgentCard` box branching to N `AgentInterface` entries (JSONRPC / GRPC / HTTP+JSON), each with its own `url`, `tenant`, `protocol_version` — show a client picking the first supported entry.
3. **Task lifecycle state machine**: 8 `TaskState` values as nodes; separate "terminal" (COMPLETED/FAILED/CANCELED/REJECTED) from "interrupted-resumable" (INPUT_REQUIRED/AUTH_REQUIRED) from "active" (SUBMITTED/WORKING) with distinct styling/color per group.
4. **Message vs Task vs Artifact vs Part containment**: Task contains `history: Message[]` and `artifacts: Artifact[]`; Message and Artifact both contain `parts: Part[]`; Part is a `oneof(text|raw|url|data)`. Nested-box diagram.
5. **Streaming vs push-notification sequence diagram**: client → `message:stream` (SSE, held-open connection) vs client → `CreateTaskPushNotificationConfig` (webhook registered) → agent POSTs updates to `TaskPushNotificationConfig.url` asynchronously. Two parallel swimlanes for the same underlying task.
6. **Extension mechanism**: `AgentCard.capabilities.extensions[]` (list of `AgentExtension{uri, required, params}`) as the generic slot; AP2 drawn as one concrete extension plugged into that slot, with its own scenario samples hanging off it.
7. **Opacity boundary diagram**: two agent boxes, each with an opaque "internals" cloud (memory/tools/logic hidden) and a thin visible surface (Agent Card + Message/Artifact wire traffic) — contrast with an MCP diagram where the tool schema itself crosses the boundary.
8. **Compliance-gap funnel** (from the field data, clearly labeled "self-reported, unverified"): 50 agents advertising A2A → ~1 returning a valid agent card → 0 completing a `tasks/send` round-trip. A stark 3-step funnel makes the point without needing to assert it's rigorous.
9. **Ecosystem size comparison bar chart**: GitHub stars, `a2aproject/A2A` (25,973) vs `a2a-python` (2,167) vs `a2a-samples` (1,785) vs `a2a-go` (476) vs AGNTCY's largest repo `agntcy/identity` (104) — log-scale bar chart.
10. **Issue-tracker "spam wave" timeline**: a comment-count-over-time sparkline for issue #1672 (658 comments) showing the burst starting 2026-03-22 and the multi-account "Working Group ratification" happening within ~48 hours — visualizes the pace claim from Numbers.

**Chart candidates (real series):**
- GitHub tag/release dates vs cumulative months (v0.1.0 2025-06 → v1.0.1 2026-05) as a release-cadence timeline [S8].
- Star-count bar chart across the 5 repos listed in item 9 above [S15][S16].
- Top-10 A2A GitHub issues by comment count, bar chart, all dated within a ~3-month 2026 window [S9][S10].

## Glossary

- **Agent Card**: JSON/proto manifest an agent publishes describing identity, skills, interfaces, and security requirements.
- **AgentInterface**: one transport binding (URL + protocol_binding + tenant + protocol_version) an agent exposes; a card lists an ordered array of these.
- **Task**: the unit of work with an id, `contextId`, lifecycle `status`, `artifacts`, and `history`.
- **contextId**: groups related Tasks/Messages into one logical conversation/session.
- **Message**: one turn of communication, containing `parts`, tied to a `role`.
- **Part**: a `oneof` content unit inside a Message or Artifact — text, raw bytes, a URL, or structured data.
- **Artifact**: a named, typed output of a Task, distinct from conversational Messages.
- **AgentExtension**: the generic, URI-identified extension-point mechanism on a Agent Card's capabilities (how AP2 and others attach).
- **Opacity principle**: agents expose only Agent Card + wire messages/artifacts, never internal memory/tools/logic.
- **AAIF**: Agentic AI Foundation, the Linux-Foundation-hosted umbrella governance body A2A joined alongside its 1.0 release.
- **ACP**: IBM's Agent Communication Protocol, merged into A2A in August 2025.
- **AP2**: Agent Payments Protocol (Google, Sept 2025), an A2A extension for payment flows.
- **AGNTCY**: a separate, Cisco-associated agent-interop initiative with its own identity/governance projects; smaller by GitHub star count than A2A.
- **Signed Agent Card**: a card carrying one or more `AgentCardSignature` (JWS) entries for cryptographic authenticity verification, new in v1.0.

## Unverified / open questions

- IBM's own primary-source announcement of the ACP → A2A merger (August 2025) — I relied on the AAIF retrospective blog's timeline summary [S2] and did not locate/open IBM's original post in this pass. Verify directly against IBM Research or `github.com/i-am-bee/acp` archival/redirect notices before citing the exact date in the book.
- Whether MCP is genuinely governed under the same AAIF umbrella as A2A, as one WebFetch summary of the AAIF blog implied [S2] — this contradicts my prior understanding that MCP has separate (Anthropic-led) governance, and I could not re-verify the primary text directly (WebFetch returns an isolated summary, not raw HTML, for third-party pages). Flag this explicitly to the person before publishing the claim; re-fetch the raw AAIF blog post text or find a second corroborating source.
- Exact scope/name of any "curated catalog" or Linux-Foundation-official agent registry, as distinct from community directories like `relayzero.ai`/`claw-grid.com` mentioned incidentally in the compliance-gap issue [S11]. Not found as a first-party, canonical resource in this pass.
- The reliability of the "0–4% real compliance" figure [S11] — single self-disclosed source, methodology described only in a GitHub issue body, not replicated by a second party in the material I opened. Treat as a discussion-starter statistic, cite it as contested/self-reported in the book, and consider prompting the reader to check the current state of issue #1755 themselves since the thread was still active.
- Could not access Reddit (r/AI_Agents, r/mcp, r/LangChain, r/LocalLLaMA, r/ClaudeAI) or X/Twitter directly in this research pass — both the network's direct `curl` access and the WebFetch tool were blocked/refused for `reddit.com`, and the session's WebSearch budget was exhausted before I could query for A2A-specific threads there. This is a real gap in the "field reports" lens versus the brief's explicit ask for Reddit/X material — recommend a follow-up pass with a fresh WebSearch budget or an authenticated Reddit API path specifically for r/AI_Agents and r/mcp threads about A2A production pain.
- Habr.com and the `t.me/s/fastnewsdev` Telegram channel were checked but yielded no A2A-specific Russian-language content in the window scraped (the channel's visible recent posts were about FastStream/Python tooling generally, not A2A) — a targeted Habr search (blocked here by the exhausted WebSearch budget) would likely surface Russian-language A2A material and should be attempted in a follow-up pass.
- Current status of "curated catalogs" / agent marketplaces beyond the two named in [S11] (relayzero.ai, claw-grid.com) — not independently vetted; do not assume these are reputable or widely used without further checking.

## Sources

- [S1] "Agent2Agent (A2A) Protocol" README, a2aproject/A2A GitHub repo, main branch (undated content, repo actively maintained), https://raw.githubusercontent.com/a2aproject/A2A/main/README.md, accessed 2026-09-30
- [S2] "Agent2Agent (A2A) joins Agentic AI Foundation (AAIF)'s open agentic stack," Agentic AI Foundation blog, published 2026-08-19 (per HN index), https://aaif.io/blog/a2a-joins-aaif, accessed 2026-09-30 (via WebFetch summary)
- [S3] "The Agent2Agent Protocol (A2A)," developers.googleblog.com, published 2025-04-09, HN discussion https://news.ycombinator.com/item?id=43631381 (450 points, 280 comments), accessed 2026-09-30
- [S4] a2a-python SDK README, a2aproject/a2a-python GitHub repo, main branch, https://raw.githubusercontent.com/a2aproject/a2a-python/main/README.md, accessed 2026-09-30
- [S5] a2a.proto `service A2AService` definitions (protocol bindings section), a2aproject/A2A repo, main branch, https://raw.githubusercontent.com/a2aproject/A2A/main/specification/a2a.proto, accessed 2026-09-30
- [S6] a2a.proto full message/enum definitions (AgentCard, AgentInterface, Task, TaskState, Message, Part, Artifact, AgentExtension, AgentCardSignature, TaskPushNotificationConfig), same source as S5, accessed 2026-09-30
- [S7] a2aproject/A2A README "Getting Started" SDK list, same source as S1, accessed 2026-09-30
- [S8] GitHub Releases/Tags API, a2aproject/A2A, https://api.github.com/repos/a2aproject/A2A/releases and /tags, accessed 2026-09-30
- [S9] GitHub Issues Search API, repo:a2aproject/A2A sorted by comments, https://api.github.com/search/issues?q=repo:a2aproject/A2A+type:issue+sort:comments, accessed 2026-09-30
- [S10] Issue #1672 "Proposal: Agent Identity Verification for Agent Cards," a2aproject/A2A, opened 2026-03-22 by haroldmalikfrimpong-ops, 658 comments, https://github.com/a2aproject/A2A/issues/1672, accessed 2026-09-30
- [S11] Issue #1755 "Empirical data: Near-zero real-world A2A protocol compliance despite widespread endpoint advertisement," a2aproject/A2A, opened 2026-04-15 by baronsengir007 (self-disclosed as authored by an autonomous AI research agent), 38 comments, https://github.com/a2aproject/A2A/issues/1755, accessed 2026-09-30
- [S12] "A2A Protocol Ships v1.0: Production-Ready Standard for Agent-to-Agent" blog post, a2a-protocol.org, published 2026-03-12, https://a2a-protocol.org/latest/blog/2026/03/12/a2a-protocol-ships-v10-production-ready-standard-for-agent-to-agent-communication/, accessed 2026-09-30 (via WebFetch summary; HN index at https://news.ycombinator.com/item?id= via query "A2A protocol 1.0")
- [S13] Issue #1929 "[Feat]: Official a2a CLI — consolidating community CLI efforts," a2aproject/A2A, opened 2026-06-10 by Tehsmash, 65 comments, https://github.com/a2aproject/A2A/issues/1929, accessed 2026-09-30
- [S14] AP2 README and samples directory structure, google-agentic-commerce/AP2 GitHub repo, main branch, https://raw.githubusercontent.com/google-agentic-commerce/AP2/main/README.md, accessed 2026-09-30
- [S15] GitHub Search API, repositories by star count for a2aproject org and topic:a2a-protocol, https://api.github.com/search/repositories?q=topic:a2a-protocol, accessed 2026-09-30
- [S16] GitHub Search API, repositories matching "agntcy", https://api.github.com/search/repositories?q=agntcy, accessed 2026-09-30
- [S17] GitHub Search API, repositories matching "bedrock-agentcore a2a" and "microsoft agent-framework a2a", accessed 2026-09-30
- [S18] Individual repo descriptions surfaced via S17 search (aws-samples/sample-agentcore-enterprise-platform, Anish0637/bedrock-agentcore-patterns, thangchung/coffeeshop-agent, nitin27may/e-commerce-agents), accessed 2026-09-30
- [S19] `__main__.py`, a2aproject/a2a-samples, `samples/python/agents/helloworld/`, main branch, https://api.github.com/repos/a2aproject/a2a-samples/contents/samples/python/agents/helloworld/__main__.py, accessed 2026-09-30
- [S20] Stack Exchange API, tagged "a2a" on stackoverflow.com, https://api.stackexchange.com/2.3/questions?tagged=a2a&site=stackoverflow, 0 results, accessed 2026-09-30
- HN Algolia searches used to locate S3/S9-context stories: https://hn.algolia.com/api/v1/search (queries: "A2A agent2agent protocol", "agent2agent", "IBM ACP merge A2A", "AP2 Agent Payments Protocol", "A2A protocol 1.0", "AI agent spam github issues", "agent identity protocol trust"), accessed 2026-09-30
- Telegram channel checked per lens instructions: https://t.me/s/fastnewsdev, accessed 2026-09-30 — no A2A-specific content found in the visible message window (see Unverified)
