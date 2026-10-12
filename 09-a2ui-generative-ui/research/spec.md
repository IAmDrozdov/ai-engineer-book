# 09. A2UI и Generative UI — primary-sources notes

Lens: official specs, changelogs, reference SDKs. Chapter boundaries: transports (A2A, AG-UI) are covered in ch.07/ch.08, this chapter treats them only as the wire A2UI/MCP Apps rides on. MCP core protocol is ch.05; here only the Apps/`ui://` extension.

## TL;DR (what an engineer must know today, 2026-09-30)

- Generative UI splits into a **taxonomy of control vs. freedom**, best captured by CopilotKit's own 3(+1)-way split: **Controlled** (dev pre-builds components, agent just picks one — AG-UI/`useFrontendTool`), **Declarative** (agent sends a structured UI *spec*, client renders with native widgets — A2UI, Open-JSON-UI), **Open-ended** (agent/server ships a full pre-built UI, usually HTML in an iframe — MCP Apps), plus a 4th CopilotKit calls "Open Generative UI" (`useComponent`, agent picks *and* renders arbitrary registered components) [S29].
- **A2UI** (google/a2ui → org `a2ui-project`, Apache-2.0) is Google's declarative JSON/JSONL format: agent sends a flat **adjacency list** of components + a separate **data model**; renderer (Lit, Angular, React, Flutter/GenUI, Jetpack Compose alpha) maps abstract component names to native widgets. No code execution — only pre-approved **catalog** components [S1][S3].
- A2UI has had **3 wire-incompatible generations** already: v0.8 (legacy, nested `{ComponentType: {...}}` wrapper, `beginRendering`/`surfaceUpdate`/`dataModelUpdate`), **v0.9.1 (current production, "stable")** (flat `component: "Text"` string, `createSurface`/`updateComponents`/`updateDataModel`, JSON Pointer paths), and **v1.0 (release candidate)** which adds bidirectional RPC (`callRendererFunction`/`callAgentFunction`), multi-catalog mixing, renames "client/server" → "renderer/agent" everywhere, and adds `actionResponse` [S1][S10][S11].
- **MCP Apps (SEP-1865)**, published 2025-11-21 jointly by Anthropic and OpenAI engineers + the MCP-UI authors, standardizes the *other* pole: servers register `ui://` resources (HTML, MIME `text/html;profile=mcp-app`), tools point at them via `_meta.ui.resourceUri`, hosts render them in a **sandboxed iframe**, and app↔host talk over **MCP's own JSON-RPC dialect carried over `postMessage`** (`ui/initialize`, `ui/notifications/tool-input`, `ui/notifications/tool-result`, `ui/message`, `ui/open-link`, …) [S15][S17].
- MCP Apps **absorbed MCP-UI**: mcpui.dev now says MCP-UI "has been standardized into MCP Apps" and its packages are an implementation of + playground for the SEP [S18].
- **OpenAI's Apps SDK has converged onto the same SEP-1865 wire format**: `_meta.ui.resourceUri` pointing at `ui://…`, MIME `text/html;profile=mcp-app`, and the shared `ui/notifications/tool-result` messages are now the *preferred* path; the older ChatGPT-only `window.openai.*` calls (`callTool`, `setWidgetState`, `requestDisplayMode`, `sendFollowUpMessage`, `requestCheckout`, `requestModal`, `uploadFile`) are kept only as a **compatibility alias layer** on top [S21][S22].
- A2UI and MCP Apps are **not competitors along the same axis** — A2UI ships *intent* (host controls rendering/styling), MCP Apps ships *content* (server controls the full pixel-level UI in an iframe). The project's own comparison table names this explicitly: "Choose MCP Apps when the server should own the full UI experience; choose A2UI when you want dynamic, cross-platform UI that fits your app" [S12].
- **AG-UI is the transport, not the format** — it's a protocol for streaming agent state to a frontend (CopilotKit's project); A2UI messages can ride over AG-UI, and CopilotKit ships day-zero A2UI support plus its own bridge library `@copilotkit/a2ui-renderer` [S8][S13][S25][S26].
- **Vercel AI SDK's generative UI** (AI SDK 5.0, `ai-sdk.dev`) is a **controlled**-style approach: tool results map 1:1 to typed `tool-${toolName}` UI parts with states `input-available`/`output-available`/`output-error`, and the developer's own React component renders the payload — no protocol-level component catalog, no cross-framework renderer [S23]. `json-render` (`json-render.dev`, Vercel-adjacent, Zod-schema-driven) is a **separate, schema-agnostic rendering engine** that *can* implement an A2UI-shaped catalog natively, but is not A2UI itself [S27].
- **Open-JSON-UI** is a distinct, less-public spec: CopilotKit's docs describe it as "open standardization of OpenAI's internal declarative Generative UI schema" — i.e. an open version of what became ChatKit's widget JSON. It sits in the same "Declarative" bucket as A2UI [S29].
- **OpenAI ChatKit widgets** are a declarative JSON schema of their own: `WidgetRoot` containers (Card, ListView, Form) composed of `WidgetNode` components (Text, Button, Image, Badge, Select, DatePicker, …), driven by an `onAction` callback — conceptually parallel to an A2UI catalog but ChatKit/OpenAI-specific and not cross-renderer [S30].
- **Google Research's "Generative UI"** (2025-11-18, Gemini app "dynamic view"/AI Mode) is a *third, separate* thing from A2UI: it is **open-ended HTML/CSS/JS generation** by Gemini 3 Pro with tool access (image gen, web search) — the "wild" end of the taxonomy, evaluated against a new benchmark dataset called **PAGEN** of expert-built sites [S28]. Don't confuse this with A2UI (declarative, restricted catalog) — same company, opposite design philosophy, aimed at different products (consumer search/chat surfaces vs. agent-to-agent UI).
- Real production adopters of A2UI named by the project itself, with named individuals quoted: **Google Opal** (AI mini-app builder — "core contributor from the beginning"), **Gemini Enterprise** (enterprise agent UIs, currently gated to the A2A `a2aAgentDefinition` registration path only), **Flutter GenUI SDK** (uses A2UI as its wire protocol under the hood), **Google ADK / ADK Web** (native v0.8 basic-catalog rendering + A2A↔A2UI conversion), and third-party **AG2's `A2UIAgent`** (dual transport over A2A and AG-UI) [S13].

## Current state and versions (as of 2026-09-30)

| Spec / product | Status | Notes | Source |
|---|---|---|---|
| A2UI v0.8 | Legacy | Nested component wrapper, `beginRendering` | S1,S2 |
| A2UI v0.9.1 | **Current production** ("stable v0.9 protocol family", patch release) | Flat components, JSON Pointer, `createSurface` | S1,S2 |
| A2UI v1.0 | Release candidate ("previously known as v0.10 when in draft") | Bidirectional RPC, catalog mixing, renderer/agent renaming | S1,S10 |
| A2UI renderers | React, Lit, Angular: stable on v0.8+v0.9.1, v1.0 "planned"; Flutter GenUI SDK: stable on v0.8+v0.9.1; Jetpack Compose: **alpha** on v0.9.1 only; SwiftUI: planned only | S4 |
| MCP Apps (SEP-1865) | Extension to core MCP spec, spec folder dated `2026-01-26` (blog post published 2025-11-21) | Early-access SDK in `modelcontextprotocol/ext-apps` | S15,S16,S17 |
| MCP Apps client support | Claude / Claude Desktop, VS Code GitHub Copilot, Microsoft 365 Copilot, Goose, Postman, MCPJam, Archestra.AI | S16 |
| MCP-UI | Folded into MCP Apps as an implementation + "community playground" | S18 |
| OpenAI Apps SDK | Preferred wire format = SEP-1865 (`ui://`, `text/html;profile=mcp-app`); `window.openai.*` = compat alias layer | S21,S22 |
| ChatKit widgets | Own declarative widget JSON (Card/ListView/Form + nodes), separate from Apps SDK/MCP Apps | S30 |
| AI SDK (Vercel) | 5.0 — typed `tool-${name}` UI message parts | S23 |
| json-render | Zod-schema rendering engine; ships an A2UI-catalog renderer | S27 |
| CopilotKit / AG-UI | `@copilotkit/runtime/v2`; `a2ui: {}` config auto-applies `A2UIMiddleware`; `MCPAppsMiddleware` for MCP Apps; `useComponent`/`useFrontendTool` for controlled/open GenUI | S25,S26,S29 |
| Google Research Generative UI | Powers Gemini app "dynamic view" + Search AI Mode, based on Gemini 3 Pro | S28 |

## Timeline

- **2025-11-18** — Google Research publishes "Generative UI: a rich, custom visual & interactive user experience for any prompt" (Gemini 3 Pro, open-ended HTML generation, PAGEN benchmark) [S28].
- **2025-11-21** — MCP Apps proposal (SEP-1865) published on the official MCP blog, co-authored by Anthropic (Sean Strong, Jerome Swannack) and OpenAI (Alexi Christakis, Bryan Ashley) engineers plus MCP-UI's Ido Salomon/Liad Yosef and MCP core maintainers Anton Pidkuiko/Olivier Chafik/Nick Cooper [S15].
- **~2025-09-24** — `a2ui-project/a2ui` GitHub repo created (per repo metadata) [repo metadata, this session].
- **A2UI v0.8** shipped first as "legacy" by the time of this snapshot; exact ship date not found in fetched pages (see Unverified).
- **A2UI v0.9 → v0.9.1**: v0.9.1 is described as "a patch release in the stable v0.9 protocol family" — i.e. v0.9.1 did not change the wire format vs v0.9, only fixed the spec/implementation [S1].
- **A2UI v1.0**: currently a *release candidate*, "previously known as version 0.10 when it was in draft" — confirms the project internally renumbered a 0.10 draft directly to 1.0 [S10].
- **2026-01-26** — dated spec folder for the MCP Apps extension spec (`ext-apps/specification/2026-01-26/apps.mdx`), i.e. the spec text has at least one dated revision after the Nov 2025 SEP announcement [S17].
- **2026-03-20** (referenced) — AG2 publishes a technical deep-dive blog "Building A2UI agents with AG2" [S13].
- **By 2026-09-30** — A2UI ecosystem has grown far beyond the original Google-only renderers: community renderers for React Native, Android (Jetpack Compose, 2 competing community projects), ReactLynx (Lynx JS), cross-platform AGenUI (iOS/Android/HarmonyOS); Vercel's `json-render` ships a native A2UI catalog renderer; CopilotKit ships an A2UI bridge; OpenClaw's "Canvas" system reportedly renders A2UI on connected devices [S4][S13].
- **By 2026-09-30** — OpenAI's Apps SDK docs now describe SEP-1865 primitives (`ui/initialize`, `ui/notifications/tool-result`) as the *preferred* mechanism, with the original `window.openai` surface demoted to a ChatGPT-specific compatibility alias — i.e. convergence of OpenAI's own generative-UI mechanism onto the jointly authored MCP Apps standard within under a year of publication [S21].

## Mechanics

### 1. A2UI wire model

**Core idea**: agent never sends executable code or a full DOM tree. It sends (a) a **flat adjacency list** of components identified by string IDs, referencing each other by ID (not nesting), and (b) a separate **data model** that components bind into via paths. The renderer owns a fixed **catalog** (JSON Schema) of allowed component types; anything not in the catalog is rejected [S1][S7].

Three logical parts to every exchange:
1. **Surface** lifecycle (`createSurface`/`beginRendering` … `deleteSurface`)
2. **Components** (`updateComponents`/`surfaceUpdate`)
3. **Data model** (`updateDataModel`/`dataModelUpdate`)

#### v0.9.1 message example — full sequence, VERBATIM [S2]:

```jsonl
{ "version": "v0.9", "createSurface":    { "surfaceId": "main", "catalogId": "..." } }
{ "version": "v0.9", "updateComponents": { "surfaceId": "main", "components": [...] } }
{ "version": "v0.9", "updateDataModel":  { "surfaceId": "main", "path": "/", "value": {...} } }
```

#### v0.9 `updateComponents`, flat component, VERBATIM [S2]:

```json
{
  "version": "v0.9",
  "updateComponents": {
    "surfaceId": "main",
    "components": [
      {
        "id": "root",
        "component": "Column",
        "children": ["header", "body"]
      },
      {
        "id": "header",
        "component": "Text",
        "text": "Welcome"
      },
      {
        "id": "body",
        "component": "Card",
        "child": "content"
      },
      {
        "id": "content",
        "component": "Text",
        "text": {"path": "/message"}
      }
    ]
  }
}
```
Note `{"path": "/message"}` = a JSON-Pointer data binding, contrasted with a literal string.

#### v0.8 equivalent, VERBATIM (nested wrapper, contrast with v0.9 above) [S2]:

```json
{
  "surfaceUpdate": {
    "surfaceId": "main",
    "components": [
      {
        "id": "greeting",
        "component": {
          "Text": {
            "text": {"literalString": "Hello, World!"},
            "usageHint": "h1"
          }
        }
      }
    ]
  }
}
```
Key v0.8→v0.9 diffs: `component` goes from a wrapper object keyed by type name to a plain string; `text: {literalString: "..."}` (typed wrapper) becomes plain `"text": "..."`; `usageHint` renamed `variant`; data binding key name `path` kept the same but semantics moved to standard JSON Pointer.

#### `updateDataModel` (v0.9), VERBATIM [S2]:

```json
{
  "version": "v0.9",
  "updateDataModel": {
    "surfaceId": "main",
    "path": "/user/email",
    "value": "alice@newdomain.com"
  }
}
```
`path` defaults to `/` (root); omitting `value` **deletes** the key at `path` in v0.9 — but in **v1.0 this becomes a schema validation error**: v1.0 requires `value` to be present, and setting it to `null` is the new way to delete [S11].

#### Root convention

There is **no explicit root field** in v0.9 — by convention, one component in the tree must carry `"id": "root"`. v1.0 formalizes this further: a reserved `"Surface"` component type is the true, implicit top-level container (`createSurface` implicitly creates it with `"child": "root"`), and catalogs can now declare `allowedParents`/`allowedChildren` constraints to restrict which component types may nest under which — needed because a flat ID-adjacency list cannot express parent/child type constraints natively in JSON Schema [S11].

### 2. Catalogs — the security boundary

A catalog is a **JSON Schema file** with `catalogId`, a `components` map (each component name → JSON Schema of its properties), a `functions` array/map, and (pre-v1.0) a `theme` block. Agents can only reference component types present in the negotiated catalog; anything else is a validation error [S7].

Minimal catalog example, VERBATIM [S7]:
```json
{
  "$id": "https://github.com/.../hello_world/v1/catalog.json",
  "catalogId": "https://github.com/.../hello_world/v1/catalog.json",
  "components": {
    "HelloWorldBanner": {
      "type": "object",
      "description": "A simple banner greeting.",
      "properties": {
        "message": { "type": "string", "description": "The banner text." },
        "backgroundColor": { "type": "string", "default": "#f0f0f0" }
      },
      "required": ["message"]
    }
  }
}
```
Catalogs **must be standalone** (no external `$ref`s in the final artifact) "to simplify LLM inference and dependency management" — you can author modularly and then run a bundling step ("Linking", via `register-catalogs.js`) [S7]. The project explicitly rejects a single universal cross-client catalog: "we do not think portability requires a standardized catalog across multiple clients; the LLM can interpret the catalog for each individual frontend" [S7].

v1.0 catalog changes: `theme`/`primaryColor` removed entirely from the Catalog schema (separates layout from branding); `functions` becomes a name-keyed map instead of an array; `allowedCallers` (`rendererOnly`|`agentOnly`|`rendererOrAgent`, default `rendererOnly`) and `requiresUserActivation` added to function defs; component/function names must satisfy Unicode UAX #31 identifier rules; catalogs declare their own `protocolVersion` (default `"0.9"` if omitted) [S11].

### 3. Actions — read/write contract and event dispatch

A2UI distinguishes two action kinds on interactive components [S6]:
- **Function** (`functionCall`) — executes locally on the renderer, no network round trip, agent never told. Example use: `openUrl`.
- **Event** (`event`) — dispatched to the agent, carries a `name` (stable string the agent switches on) plus a `context` map of hand-picked values, which may pull from the data model via `path`.

VERBATIM function call [S6]:
```json
{
  "id": "help-btn",
  "component": "Button",
  "child": "help-text",
  "action": { "functionCall": { "call": "openUrl", "args": {"url": "https://a2ui.org/help"} } }
}
```

VERBATIM event wiring [S6]:
```json
{
  "id": "submit-btn",
  "component": "Button",
  "child": "btn-text",
  "action": {
    "event": {
      "name": "submit_reservation",
      "context": { "time": {"path": "/reservationTime"}, "size": {"path": "/partySize"} }
    }
  }
}
```

**Read/Write contract**: input components (`TextField`, `CheckBox`, `Slider`) write to the local data model *synchronously* on every keystroke/interaction — this is entirely renderer-local, no network traffic per keystroke. The model is only sent to the agent when an Event fires. The spec calls out explicitly that this removes the need for client-side debounce logic [S6].

**Versioning gotcha**: the outer payload key for a user action changed name across versions — v0.8 used `{"userAction": {...}}`, v0.9 uses `{"action": {...}}` [S6]. VERBATIM v0.9 action payload sent renderer→agent [S6]:
```json
{
  "version": "v0.9",
  "action": {
    "name": "submit_reservation",
    "surfaceId": "booking-surface",
    "sourceComponentId": "submit-btn",
    "timestamp": "2026-02-25T10:40:00Z",
    "context": { "time": "7:00 PM", "size": 4 }
  }
}
```

**Validation feedback loop**: if the agent sends JSON violating the catalog schema, renderer replies with a structured error the agent can self-correct on:
```json
{
  "version": "v0.9",
  "error": {
    "code": "VALIDATION_FAILED",
    "surfaceId": "booking-surface",
    "path": "/components/0/children",
    "message": "Expected array of strings, got null."
  }
}
```
[S6, VERBATIM]

**Data Model Sync** (v0.9 feature): agent sets `sendDataModel: true` on `createSurface`; renderer then attaches the *entire* data model as metadata on every outgoing transport envelope rather than as a separate message — e.g. over A2A it's placed at `metadata.a2uiClientDataModel` [S6]. VERBATIM A2A envelope:
```json
{
  "parts": [{"text": "Submit the reservation"}],
  "metadata": {
    "a2uiClientDataModel": {
      "version": "v0.9",
      "surfaces": { "booking-surface": { "reservationTime": "7:00 PM", "partySize": 4, "notes": "Window seat preferred" } }
    }
  }
}
```

### 4. A2UI v1.0's new bidirectional RPC

v1.0's headline change: **agent can now call functions *on* the renderer, and renderer can call functions *on* the agent**, both with typed responses [S11]:
- `callRendererFunction` (agent→renderer) → `rendererFunctionResponse`
- `callAgentFunction` (renderer→agent) → `agentFunctionResponse`
- Shared `FunctionResponse` payload shape for both directions; authorized callers (`allowedCallers`) and return types live in the **catalog**, not on the wire call itself (v0.9 had `allowedCallers`/`returnType` on the wire `FunctionCall`; v1.0 removed them from wire schema entirely, "deferring boundary checking and return type validation entirely to runtime execution") [S11].
- Multiple catalogs can now be mixed **within one surface**; component/function resolution order is: (1) explicit `catalogId` on the component/call, (2) surface's default `catalogId` from `createSurface`, (3) error — no silent fallback to catalogs merely advertised in capabilities [S11].
- New built-in `@index` function retrieves the loop index during list-template rendering; the `@` prefix is reserved for such system functions [S11].
- Terminology overhaul: **client → renderer**, **server → agent**, everywhere, including filenames (`server_to_client.json` → `agent_to_renderer.json`, etc.) — rationale given: "A2UI is sometimes generated on clients, and rendering sometimes happens on servers, making those terms ambiguous" [S11].
- MIME type standardized to `application/a2ui+json` (was version-specific before) [S11].

### 5. A2UI transports

A2UI is transport-agnostic by design; the two "stable" bindings are:
- **A2A Protocol** — data placed inside A2A message parts/metadata; "if you are using A2A, this should be nearly automatic" [S8].
- **AG-UI** — translates A2UI messages to AG-UI events, handles transport + state sync; CopilotKit is AG-UI's creator and primary consumer [S8].
REST, WebSockets and SSE are listed as "Planned"/"Proposed" only — not yet part of the stable spec, and the docs literally contain `// TODO: Add an example` placeholders for these [S8].

### 6. MCP Apps (SEP-1865) — the other pole

**Core primitive**: a `ui://` resource is a first-class MCP resource, declared like any other resource but with `mimeType: "text/html;profile=mcp-app"`. Tools reference one via `_meta.ui.resourceUri` [S16][S17].

VERBATIM resource declaration + content [S17]:
```json
// Resource declaration
{
  "uri": "ui://weather-server/dashboard-template",
  "name": "weather_dashboard",
  "description": "Interactive weather dashboard view",
  "mimeType": "text/html;profile=mcp-app"
}

// Resource content with metadata
{
  "contents": [{
    "uri": "ui://weather-server/dashboard-template",
    "mimeType": "text/html;profile=mcp-app",
    "text": "<!DOCTYPE html><html>...</html>",
    "_meta": {
      "ui" : {
        "csp": {
          "connectDomains": ["https://api.openweathermap.org"],
          "resourceDomains": ["https://cdn.jsdelivr.net"]
        },
        "prefersBorder": true
      }
    }
  }]
}
```

**Default (restrictive) CSP** the host MUST apply if `ui.csp` is omitted, VERBATIM [S17]:
```
default-src 'none';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
media-src 'self' data:;
connect-src 'none';
```
Host "MAY further restrict but MUST NOT allow undeclared domains" [S17].

**Lifecycle** (from the sequence diagram in the docs): user asks agent → agent calls `tools/call` on the MCP server → server returns tool result and (if tool declares `_meta.ui.resourceUri`) the host preloads/renders the `ui://` resource in an iframe → host pushes the tool result into the app via `ui/notifications/tool-result` → user interacts inside the app → app requests a tool call via the JSON-RPC bridge → host forwards to the server → fresh result flows back down the same path; the app can also push `ui/update-model-context` to influence future model turns [S16].

**Key JSON-RPC methods**, all VERBATIM from the spec [S17]:
- View→Host requests: `ui/open-link` (open URL in host browser), `ui/message` (inject a `{role, content}` chat turn — host "MAY request user consent"), `ui/request-display-mode` (`"inline"|"fullscreen"|"pip"`), `ui/update-model-context` (overwrite what the model sees next turn; host "MAY dedupe identical calls", "SHOULD only send the last update" if several arrive before the next user turn).
- Host→View notifications: `ui/notifications/tool-input` (sent once, full args, after `ui/initialize` completes), `ui/notifications/tool-input-partial` (0+ times, best-effort-repaired partial JSON while the agent is still streaming args — View "MUST NOT rely on partial arguments for critical operations"), `ui/notifications/tool-result` (`CallToolResult`), `ui/notifications/tool-cancelled`, `ui/resource-teardown` (host "SHOULD wait for a response before tearing down"), `ui/notifications/size-changed`, `ui/notifications/host-context-changed`.

**Security model**, direct from the SEP's own threat model section [S17]: threats named are (1) malicious server delivering harmful HTML, (2) compromised View trying to escape the sandbox, (3) View attempting unauthorized tool execution, (4) View exfiltrating host data, (5) phishing/social engineering via the rendered UI. Mitigations: (1) mandatory iframe sandboxing — "the sandbox limits the View from accessing the host or manipulating it. All communication with the host is done via postMessage, where the host is in control"; (2) all communication is auditable JSON-RPC — host must "validate all incoming messages," "reject malformed message types," "log View-initiated RPC calls"; (3) predeclared-resource review — host can hash/sign resources, warn users, allowlist/blocklist by hash; (4) mandatory CSP construction from the declared `csp`/`permissions` metadata (code snippet given in spec, reproduced above in condensed form).

**Reserved namespace**: the SEP text states "the resource prefix `ui://` will be reserved for MCP Apps" at the MCP-spec level [S17].

**Why predeclared HTML resources, not inline embedding** (spec's own rationale) [S17, section "Design Decisions"]: templates are reviewable by the host *before* any tool call happens, rather than arbitrary HTML being generated and injected per-response.

### 7. OpenAI Apps SDK — convergence onto SEP-1865

An MCP server built for ChatGPT declares the resource exactly like the generic SEP: `_meta.ui.resourceUri: "ui://widget/v1.html"` (compat alias `_meta["openai/outputTemplate"]`), MIME `text/html;profile=mcp-app` [S21]. The widget itself is a bundled ES module injected into an HTML shell:
```ts
{
  uri: "ui://widget/v1.html",
  mimeType: "text/html;profile=mcp-app",
  text: `<div id="root"></div><script type="module">${bundledJs}</script>`,
  _meta: { ui: { prefersBorder: true, domain: "..." } }
}
```
[S21, COMPOSED-from-doc pattern, individual pieces VERBATIM]

**Two state layers** are explicitly distinguished [S21]:
- `window.openai.setWidgetState()` — ephemeral, presentation-only (selected row, expanded panel), *not* seen by the model.
- `ui/update-model-context` over the MCP Apps bridge — the "portable mechanism for updating conversation context" the model *does* see next turn.

**Decoupled tool pattern** (explicit recommendation) [S21]: split a "data tool" (no `resourceUri`, just returns `structuredContent`) from a "render tool" (has `resourceUri`) so re-rolls/local actions can hit the data tool directly without remounting the iframe.

**Display modes**: inline card, inline carousel, fullscreen, picture-in-picture — "choose the smallest presentation that accomplishes the task" [S21].

### 8. Controlled generative UI — Vercel AI SDK and CopilotKit `useFrontendTool`

AI SDK 5.0 pattern: tool call → UI message part typed `tool-${toolName}`, three states `input-available` → `output-available`/`output-error`; developer's own React component consumes the tool's structured output as props. No protocol envelope, no catalog, no cross-framework renderer — it is host-app code, by design [S23].

CopilotKit's `useFrontendTool` is the same idea, VERBATIM code [S29]:
```typescript
useFrontendTool({
  name: "get_weather",
  description: "Get current weather information for a location",
  parameters: z.object({ location: z.string().describe("The city or location to get weather for") }),
  handler: async ({ location }) => { /* ... */ return getMockWeather(location); },
  render: ({ status, args, result }) => {
    if (status === "inProgress" || status === "executing") return <WeatherLoadingState location={args?.location} />;
    if (status === "complete" && result) {
      const data = JSON.parse(result) as WeatherData;
      return <WeatherCard {...data} />;
    }
    return <></>;
  },
});
```
Here the dev owns the component tree entirely; the agent only picks *which* tool (hence which component) fires and with what args.

### 9. CopilotKit's declarative bridge for A2UI

Backend: `new CopilotRuntime({ agents: {...}, a2ui: {} })` auto-attaches `A2UIMiddleware` to every agent (or scope via `agents:[...]`) [S26]. Frontend: pass `createA2UIMessageRenderer({theme})` into `renderActivityMessages`; it "activates automatically" once wired — VERBATIM:
```typescript
import { CopilotKitProvider, CopilotSidebar } from "@copilotkitnext/react";
import { createA2UIMessageRenderer } from "@copilotkit/a2ui-renderer";
const A2UIRenderer = createA2UIMessageRenderer({ theme: a2uiTheme });
export function A2UIPage({ children }) {
  return (
    <CopilotKitProvider runtimeUrl="/api/copilotkit-a2ui" renderActivityMessages={[A2UIRenderer]}>
      {children}
      <CopilotSidebar defaultOpen labels={{ modalHeaderTitle: "A2UI Assistant" }} />
    </CopilotKitProvider>
  );
}
```
[S29, VERBATIM]
For MCP Apps, CopilotKit instead attaches `MCPAppsMiddleware` from `@ag-ui/mcp-apps-middleware` [S29].

### 10. Open-JSON-UI and ChatKit widgets

Open-JSON-UI: minimal detail was recoverable beyond CopilotKit's own framing — "open standardization of OpenAI's internal declarative Generative UI schema," positioned alongside A2UI in the "Declarative" bucket, with an illustrative (not spec-verbatim, hence not VERBATIM-tagged) shape:
```js
{ type: "open-json-ui", spec: { components: [ { type: "card", properties: { title: "...", content: {...} } } ] } }
```
[S29, marked in source as "illustrative"]

ChatKit widgets (OpenAI, separate product): a `WidgetRoot` (Card, ListView, Form, Transition) contains `WidgetNode`s — layout (Box, Row, Col, Form), display (Text, Title, Caption, Image, Icon, Markdown, Divider), interactive (Button, Select, DatePicker, ListViewItem). Interactivity is wired through an `onAction` callback the dev forwards to their backend. A visual "Widget Builder" (widgets.chatkit.studio) generates the JSON [S30].

### 11. Google Research's open-ended Generative UI

Distinct research effort (not A2UI): Gemini 3 Pro + tools (image gen, web search) + a system prompt with "goals, planning, examples, and technical specifications" + a post-processing pass generate a full HTML/CSS/JS page per prompt, rendered directly in-browser. Style can be pinned for consistency or left to auto-select. Evaluated on **PAGEN**, a new dataset of expert-designed reference sites; result (direct quote): "The sites designed by human experts had the highest preference rates. These were followed closely by the results from our generative UI implementation, with a substantial gap from all other output methods." Ships in the Gemini app ("dynamic view", "visual layout") and Google Search AI Mode. Known limits stated by the authors: generation can take over a minute; occasional inaccuracies remain [S28].

## Numbers

- A2UI GitHub repo: **16,565 stars / 1,322 forks** (measured live via GitHub API, 2026-09-30, `a2ui-project/a2ui`) [repo metadata, this session].
- A2UI repo created **2025-09-24**, still actively pushed to as of **2026-09-30** (`pushed_at` timestamp) [repo metadata, this session].
- Google Research Generative UI blog post published **2025-11-18**, evaluated against the PAGEN dataset; exact win-rate percentages were not present in the fetched summary — only the ranked qualitative ordering (experts > gen-UI ≫ other methods) [S28]. → flagged under Unverified for exact numeric win rates.
- No adoption/usage numbers (installs, deployed servers, DAU) were found for MCP Apps or A2UI beyond named-customer case studies; treat "hundreds of thousands" (Opal's user count, quoted from the A2UI docs, not independently verified) as a vendor claim, not a measured number [S13].

## Pitfalls, limits, criticism

- **Wire-incompatibility churn**: three A2UI generations (v0.8/v0.9.1/v1.0) in ~1 year, each with breaking schema changes (component wrapper shape, message names, action payload key `userAction`→`action`, catalog `theme` removed, `client/server`→`renderer/agent` rename touching every filename). A catalog authored for v0.9 "cannot be used directly with v1.0 protocol runtimes" [S11]. Any team building on A2UI today is building on a still-moving "release candidate" spec one version away.
- **Renderer coverage is uneven**: only React/Lit/Angular/Flutter are "stable"; Jetpack Compose is alpha and only on v0.9.1; SwiftUI is "planned" only (no code yet) as of this snapshot [S4]. Cross-platform promise is aspirational for native mobile beyond Flutter.
- **No portability guarantee across catalogs**: the project explicitly designed against a universal catalog — "we do not think portability requires a standardized catalog across multiple clients" [S7]. This means an agent's A2UI output is tied to whichever catalog that specific client advertised; there is no guaranteed "write once render anywhere" unless the client also happens to support the same catalog (e.g. the Basic Catalog).
- **MCP Apps' security perimeter is the iframe, and that has known classes of residual risk the SEP names itself**: social engineering via misleading in-sandbox content (mitigated only by host-side "clearly indicate sandboxed UI boundaries" — a UX convention, not a technical control) and resource-consumption DoS by a malicious View (mitigated only by host-implemented resource limits, not specified in the SEP) [S17].
- **Gemini Enterprise's A2UI support is currently partial**, gated to agents registered via the A2A `a2aAgentDefinition` path — managed agents on Vertex AI Agent Engine registered via `adkAgentDefinition` do **not** currently support A2UI rendering, per the project's own adoption page [S13]. This is a concrete example of "declarative doesn't mean universally wired up yet."
- **Partial tool-input streaming is explicitly best-effort and untrustworthy**: the SEP itself says the View "MUST NOT rely on partial arguments for critical operations" and the host recovers broken JSON heuristically by "closing unclosed brackets/braces" — an explicitly fuzzy mechanism baked into the spec [S17].
- **A2UI local functions are invisible to the agent** ("the agent is not informed of local function calls") [S6] — a design choice that trades agent observability for responsiveness; if a function like `openUrl` fails silently client-side, the agent has no way to know.
- **json-render vs A2UI comparison exists as third-party commentary** (a Medium post is cited by both json-render's and A2UI's own docs) — worth reading as independent perspective but it is commentary, not a primary spec; flagged as such rather than treated as authoritative [S4][S27].

## What changed in the last 6 months (roughly April–September 2026, per what the fetched docs date-stamp)

- A2UI moved its **stable production line to v0.9.1** and opened a **v1.0 release candidate** with bidirectional RPC (`callRendererFunction`/`callAgentFunction`), multi-catalog mixing per surface, and the renderer/agent terminology rename — the single largest structural change visible in the fetched history [S1][S11].
- **OpenAI's Apps SDK re-platformed its widget wire format onto SEP-1865** (`ui://`, `text/html;profile=mcp-app`, `ui/notifications/tool-result`), demoting its original `window.openai.*` surface to a compatibility shim — i.e. two of the field's largest labs (Anthropic + OpenAI, via the joint SEP authorship) now share one iframe/postMessage wire format for "open-ended" generative UI [S15][S21].
- **MCP-UI was absorbed into MCP Apps** rather than remaining a parallel community spec — mcpui.dev's own framing is that it is now "standardized into" the SEP [S18].
- **Google Research shipped open-ended, non-A2UI generative UI** into consumer products (Gemini app dynamic view, Search AI Mode) using Gemini 3 Pro — a second, philosophically opposite generative-UI effort inside the same company, published 2025-11-18, one month after MCP Apps [S28].
- **Ecosystem renderers for A2UI multiplied**: Vercel's `json-render`, community Jetpack Compose / React Native / ReactLynx / cross-platform (AGenUI) renderers, and CopilotKit's own `@copilotkit/a2ui-renderer` bridge all appear as "current" in the live docs [S4][S13].
- **AG2 shipped a reference `A2UIAgent`** as a built-in agent type with schema-validated A2UI generation, serving the same UI over both A2A and AG-UI simultaneously [S13].

## Diagram candidates

1. **Taxonomy quadrant**: axes = "who controls rendering" (dev-fixed ↔ agent-controlled) × "who controls structure" (dev catalog ↔ freeform). Place: AG-UI/`useFrontendTool` (controlled), A2UI/Open-JSON-UI (declarative), MCP Apps/ChatKit (open-ended HTML), Google Research Generative UI (fully open-ended, no catalog at all) [S29][S28].
2. **A2UI message sequence, v0.9.1**: actors Agent, Renderer; arrows `createSurface` → `updateComponents` (×N, streaming) → `updateDataModel` → (user interacts) → `action` (renderer→agent) → `updateComponents`/`updateDataModel` (loop). Show the buffering rule: renderer buffers component/data updates until surface exists.
3. **A2UI adjacency-list rendering**: a flat list of `{id, component, children:[ids]}` objects next to the tree it forms — good for showing *why* flat lists beat nested JSON for incremental LLM streaming (partial JSON is always a valid prefix of the array).
4. **A2UI catalog resolution order (v1.0)**: decision tree — component-level `catalogId`? → surface default `catalogId`? → error, no capability fallback [S11].
5. **A2UI v0.8→v0.9→v1.0 message-name mapping table as a diagram**: three parallel columns of message names with arrows showing renames (`beginRendering`→`createSurface`, `surfaceUpdate`→`updateComponents`, `userAction`→`action`, new in v1.0: `callRendererFunction`/`callAgentFunction`/`actionResponse`).
6. **MCP Apps lifecycle sequence diagram** (already given as Mermaid in the source, reproducible): User → Agent → MCP App iframe → MCP Server, showing `tools/call`, tool result push, `ui/notifications/tool-result`, app-initiated `tools/call` forward, `ui/update-model-context` [S16].
7. **MCP Apps sandbox/CSP model**: host page, sandboxed iframe (the View), postMessage channel, CSP boundary drawn around `connectDomains`/`resourceDomains`/`frameDomains`/`baseUriDomains`, contrasted with the "no undeclared domain" default-deny CSP block [S17].
8. **MCP Apps vs A2UI vs AG-UI responsibility split** (turn the S12 comparison table into a layered diagram: transport layer (AG-UI) at the bottom, format layer (A2UI declarative spec / MCP Apps HTML resource) in the middle, rendering surface (native widgets vs sandboxed iframe) on top).
9. **Read/Write contract timing diagram**: keystroke → synchronous local data-model write → (later) button click → Event fires → context resolved from local model → dispatch — emphasizing zero network traffic between keystroke and submit [S6].
10. **OpenAI Apps SDK decoupled tool pattern**: two tool boxes ("data tool", no resourceUri; "render tool", has resourceUri) both callable independently by the model, contrasted with a single combined tool that forces an iframe remount on every re-roll [S21].
11. **Catalog authoring pipeline**: modular catalog fragments with `$ref` → `register-catalogs.js` "Linking" step (wired into Xcode Build Phases / Gradle tasks) → single standalone bundled catalog JSON shipped to the LLM's system prompt [S7].

Chart candidates: none of the fetched sources gave a real numeric time series (stars/forks is a single point-in-time snapshot, not a series) — no chart candidates found; would need to pull GitHub star-history or a Google Trends style series separately if desired for the book.

## Glossary

- **Surface** — an A2UI-managed UI region with its own component tree and data model; identified by `surfaceId` [S2].
- **Catalog** — a JSON Schema document enumerating the component types, functions and theme an agent may use for a surface; the security/trust boundary of A2UI [S7].
- **Adjacency list (A2UI)** — the flat, ID-referencing representation of the component tree (as opposed to nested JSON), chosen because it streams incrementally [S9].
- **Data model** — the per-surface application state tree that components bind to via JSON Pointer paths; separate from the component tree [S2].
- **`ui://` resource** — an MCP resource URI scheme reserved for MCP Apps, pointing at an HTML UI template [S17].
- **App Bridge** — the MCP Apps SDK module that handles sandboxed iframe rendering, message passing, and tool-call proxying on the host side [S16].
- **View (MCP Apps)** — the sandboxed iframe instance rendering a `ui://` resource; communicates with the Host only via postMessage JSON-RPC [S17].
- **Host (MCP Apps)** — the application embedding the View (e.g. Claude Desktop, ChatGPT) and mediating all its tool calls [S16].
- **Renderer function / Agent function (A2UI v1.0)** — functions callable by the agent-on-renderer or renderer-on-agent respectively, via `callRendererFunction`/`callAgentFunction` [S11].
- **Controlled / Declarative / Open-ended Generative UI** — CopilotKit's own three-way taxonomy: dev-fixed components picked by the agent / agent-sent structured spec rendered natively / agent-sent full pre-built UI shown in a container [S29].
- **Catalog transformer (A2UI)** — a rule set (e.g. `ComponentPruningTransformer`) that filters/adapts a catalog before it's turned into system-prompt instructions, for context-window or capability-guardrail reasons [S14].
- **PAGEN** — Google Research's benchmark dataset of expert-designed reference sites used to evaluate open-ended generative UI output [S28].

## Unverified / open questions

- Exact **ship dates** for A2UI v0.8 and v0.9 (only relative ordering and "current"/"legacy"/"candidate" status were recoverable from the live docs; no dated changelog page was found in the fetched set). Tried: read `specification/v0_8/README.md`/`v0_9/README.md` was not attempted due to time — worth a follow-up fetch.
- **Exact PAGEN win-rate percentages** for Google's Generative UI vs. baselines — the WebFetch summary gave only the qualitative ranking, not the numeric preference scores that the source blog post likely contains in a chart; needs a direct fetch/read of the blog's figures.
- **Open-JSON-UI's actual JSON schema** — could not reach a CopilotKit doc page containing its concrete component schema (attempts at `/generative-ui/specs/open-json-ui` and `/learn/generative-ui/specs/open-json-ui` both failed to return the real page content); the only detail recovered was CopilotKit's one-line description ("open standardization of OpenAI's internal declarative Generative UI schema") and an "illustrative" (not verbatim-spec) example from the CopilotKit `generative-ui` GitHub repo [S29]. Treat "Open-JSON-UI" claims here as thin/secondary until that page is fetched directly.
- **ChatKit widgets' relationship to Apps SDK** — one WebFetch summary hallucinated an "Anthropic developer tooling" claim in its last line; that specific sentence is explicitly discarded here as unreliable model output from the fetch tool, not sourced content. The rest of the ChatKit widgets summary (component taxonomy, `onAction`) is retained as sourced.
- **Real production usage/deployment numbers** (installed servers, DAU, revenue) for MCP Apps or Apps SDK widgets — not found; only qualitative client-support lists.
- **A2UI's exact `actionResponse` v1.0 message schema** — evolution guide's executive summary mentions `actionResponse` as new in v1.0 for "robust client-to-server synchronous RPC" but the fetched evolution-guide detail sections (2.1–2.8) did not spell out its full field list the way they did for `callRendererFunction`/`callAgentFunction`; would need `specification/v1_0/json/agent_to_renderer.json` directly.
- **Whether AP2/UCP-style commerce flows (ch.10) or MCP Skills (ch.06) intersect with A2UI's `requestCheckout`-style flows** — out of scope for this chapter but flagged as a cross-link to verify when writing ch.10.

## Sources

- [S1] a2ui-project/a2ui — README.md, GitHub (Apache-2.0 project, Google-originated), no single dated byline; repository `pushed_at` 2026-09-30. https://github.com/a2ui-project/a2ui — accessed 2026-09-30.
- [S2] a2ui-project/a2ui — `docs/public/reference/messages.md`, undated (main branch). https://github.com/a2ui-project/a2ui/blob/main/docs/public/reference/messages.md — accessed 2026-09-30.
- [S3] a2ui-project/a2ui — `docs/public/reference/components.md`. https://github.com/a2ui-project/a2ui/blob/main/docs/public/reference/components.md — accessed 2026-09-30.
- [S4] a2ui-project/a2ui — `docs/public/reference/renderers.md`. https://github.com/a2ui-project/a2ui/blob/main/docs/public/reference/renderers.md — accessed 2026-09-30.
- [S5] a2ui-project/a2ui — `docs/public/reference/agents.md`. https://github.com/a2ui-project/a2ui/blob/main/docs/public/reference/agents.md — accessed 2026-09-30.
- [S6] a2ui-project/a2ui — `docs/public/concepts/actions.md`. https://github.com/a2ui-project/a2ui/blob/main/docs/public/concepts/actions.md — accessed 2026-09-30.
- [S7] a2ui-project/a2ui — `docs/public/concepts/catalogs.md`. https://github.com/a2ui-project/a2ui/blob/main/docs/public/concepts/catalogs.md — accessed 2026-09-30.
- [S8] a2ui-project/a2ui — `docs/public/concepts/transports.md`. https://github.com/a2ui-project/a2ui/blob/main/docs/public/concepts/transports.md — accessed 2026-09-30.
- [S9] a2ui-project/a2ui — `docs/public/concepts/overview.md`. https://github.com/a2ui-project/a2ui/blob/main/docs/public/concepts/overview.md — accessed 2026-09-30.
- [S10] a2ui-project/a2ui — `specification/v1_0/README.md`. https://github.com/a2ui-project/a2ui/blob/main/specification/v1_0/README.md — accessed 2026-09-30.
- [S11] a2ui-project/a2ui — `specification/v1_0/docs/evolution_guide.md` ("A2UI Protocol Evolution Guide: v0.9 to v1.0"). https://github.com/a2ui-project/a2ui/blob/main/specification/v1_0/docs/evolution_guide.md — accessed 2026-09-30.
- [S12] a2ui-project/a2ui — `docs/public/introduction/agent-ui-ecosystem.md` ("How Does A2UI Compare?"). https://github.com/a2ui-project/a2ui/blob/main/docs/public/introduction/agent-ui-ecosystem.md — accessed 2026-09-30.
- [S13] a2ui-project/a2ui — `docs/public/ecosystem/a2ui-in-the-world.md`. https://github.com/a2ui-project/a2ui/blob/main/docs/public/ecosystem/a2ui-in-the-world.md — accessed 2026-09-30.
- [S14] a2ui-project/a2ui — `docs/public/concepts/glossary.md`. https://github.com/a2ui-project/a2ui/blob/main/docs/public/concepts/glossary.md — accessed 2026-09-30.
- [S15] "MCP Apps: Interactive User Interfaces for MCP" — official MCP blog, published 2025-11-21. https://blog.modelcontextprotocol.io/posts/2025-11-21-mcp-apps/ — accessed 2026-09-30.
- [S16] "MCP Apps" — modelcontextprotocol.io docs, undated (live docs). https://modelcontextprotocol.io/docs/extensions/apps — accessed 2026-09-30.
- [S17] modelcontextprotocol/ext-apps — `specification/2026-01-26/apps.mdx`, "SEP-1865: MCP Apps: Interactive User Interfaces for MCP". https://raw.githubusercontent.com/modelcontextprotocol/ext-apps/main/specification/2026-01-26/apps.mdx — accessed 2026-09-30.
- [S18] MCP-UI — mcpui.dev, undated (live docs). https://mcpui.dev/ — accessed 2026-09-30.
- [S19] OpenAI Apps SDK — developers.openai.com/apps-sdk/ index, undated. https://developers.openai.com/apps-sdk/ — accessed 2026-09-30.
- [S20] OpenAI Apps SDK — "Build an MCP server", developers.openai.com/apps-sdk/build/mcp-server. https://developers.openai.com/apps-sdk/build/mcp-server — accessed 2026-09-30.
- [S21] OpenAI Apps SDK — "Custom UX", developers.openai.com/apps-sdk/build/custom-ux. https://developers.openai.com/apps-sdk/build/custom-ux — accessed 2026-09-30.
- [S22] openai/openai-apps-sdk-examples — README.md. https://raw.githubusercontent.com/openai/openai-apps-sdk-examples/main/README.md — accessed 2026-09-30.
- [S23] Vercel AI SDK — "Generative User Interfaces", ai-sdk.dev docs (AI SDK 5.0). https://ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces — accessed 2026-09-30.
- [S24] Thesys — thesys.dev homepage ("C1"/OpenUI Cloud), undated. https://www.thesys.dev/ — accessed 2026-09-30.
- [S25] CopilotKit — "Generative UI" docs. https://docs.copilotkit.ai/generative-ui — accessed 2026-09-30.
- [S26] CopilotKit — "A2UI" docs. https://docs.copilotkit.ai/generative-ui/a2ui — accessed 2026-09-30.
- [S27] json-render — "A2UI" docs page, json-render.dev. https://json-render.dev/docs/a2ui — accessed 2026-09-30.
- [S28] "Generative UI: a rich, custom visual & interactive user experience for any prompt" — Google Research blog, published 2025-11-18, authors Yaniv Leviathan, Dani Valevski, Vishnu Natchu, Yossi Matias. https://research.google/blog/generative-ui-a-rich-custom-visual-interactive-user-experience-for-any-prompt/ — accessed 2026-09-30.
- [S29] CopilotKit/generative-ui — README.md, GitHub. https://raw.githubusercontent.com/CopilotKit/generative-ui/main/README.md — accessed 2026-09-30.
- [S30] OpenAI — "ChatKit widgets", developers.openai.com/api/docs/guides/chatkit-widgets. https://developers.openai.com/api/docs/guides/chatkit-widgets — accessed 2026-09-30.
- Repo metadata for a2ui-project/a2ui (stars/forks/dates) — GitHub REST API, `api.github.com/repos/a2ui-project/a2ui`, queried live 2026-09-30.
