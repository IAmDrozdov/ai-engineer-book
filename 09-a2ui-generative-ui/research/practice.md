# A2UI и Generative UI — engineering practice notes

## TL;DR (must-know, 2026-09-30)

- **A2UI** (a2ui.org, `a2ui-project/a2ui` on GitHub, Apache-2.0) is Google-led but now a multi-vendor open project. Current production spec is **v0.9.1**; **v1.0 is a release candidate**; **v0.8 is legacy/closed to changes**. [S1]
- A2UI's core idea: agent sends a **declarative JSON component tree** (flat adjacency list, not nested), client renders it with its **own native widgets** from a pre-agreed **catalog**. No code execution ever crosses the wire — "safe like data, expressive like code." [S1][S2]
- **MCP Apps (SEP-1865)** is the opposite architectural bet: server ships **pre-built HTML** as a `ui://` resource, host renders it in a **sandboxed iframe**, UI talks to host over **JSON-RPC-over-postMessage** (a dialect of MCP itself). Authored jointly by Anthropic, OpenAI, and the MCP-UI maintainers (Ido Salomon, Liad Yosef), announced 2025-11-21. [S15][S16]
- **MCP-UI pivoted**: it "pioneered" the pre-SEP raw-HTML-resource pattern, but as of the current docs it says its `@mcp-ui/*` packages **are the MCP Apps SDK** — `AppRenderer` for MCP Apps hosts, `UIResourceRenderer` kept only for "legacy MCP-UI hosts." [S19]
- **OpenAI's Apps SDK has folded into "Plugins"** and explicitly tells developers to **start with the MCP Apps standard** (`_meta.ui.resourceUri`, `ui/*` bridge) and treat `window.openai.*` as a compatibility layer only for what the shared spec doesn't cover yet. [S22]
- **CopilotKit** names the taxonomy explicitly and it maps 1:1 onto the editor's brief: **Controlled** (you wrote the component, agent only picks which+what data) → **Declarative** (agent emits a spec, you own the catalog — A2UI) → **Open-Ended** (UI invented elsewhere, e.g. MCP Apps, you just sandbox it). Predictability drops and expressive range grows left→right. [S26]
- A2UI is **transport-agnostic** but has two "stable" bindings today: **A2A** (as a DataPart, `application/a2ui+json`) and **AG-UI** (translated to AG-UI events; CopilotKit is AG-UI's creator, "day-zero A2UI compatibility"). REST is "planned," WebSockets/SSE are "proposed." [S6]
- The three protocols **compose rather than compete**: A2UI can be delivered *inside* an MCP App (an A2UI surface rendered inside the sandboxed iframe, talking to the MCP server through the App Bridge) — a documented, sample-backed pattern in the A2UI repo itself. [S11][S12]
- Real production adopters of A2UI named on-record: **Google Opal** (AI mini-apps), **Gemini Enterprise** (self-serve A2A agents only, not managed ADK-engine agents), **Flutter's GenUI SDK** ("when you use GenUI, you're using A2UI under the covers"), **Google ADK Web** (built-in A2UI renderer for the dev UI), **AG2's `A2UIAgent`**. [S9]
- MCP-UI's pre-SEP work is "adopted at Postman, Shopify, Hugging Face, Goose, and ElevenLabs," per the SEP-1865 announcement post. [S15]
- Security model differs sharply: A2UI's floor is "no executable payload ever" (catalog allowlist + schema validation); MCP Apps' floor is "arbitrary HTML/JS, but caged" (double-iframe, CSP from declared domains, mandatory sandbox flags, **never** `allow-same-origin` on the untrusted inner frame). [S10][S16]
- A2UI v1.0 (RC) adds true **bidirectional RPC** (`callRendererFunction`/`callAgentFunction`) and lets **multiple catalogs mix in one surface** — a real capability gap v0.9 didn't have. The A2UI docs site's own summary page (`reference/messages.md`) calls the new v1.0 message `actionResponse`, but the canonical, spec-generated evolution guide describes four distinct new messages (`callRendererFunction`, `rendererFunctionResponse`, `callAgentFunction`, `agentFunctionResponse`) — **the evolution guide is the more authoritative, more detailed source; the summary page looks stale/simplified.** [S4] vs [S14]

## Current state and versions (as of 2026-09-30)

| Layer | Current version / status | Notes |
|---|---|---|
| A2UI protocol | **v0.9.1** stable (patch release); **v1.0** release candidate; v0.8 legacy/closed | Repo `a2ui-project/a2ui`, org created 2025-09-24, still pushed to today. Status banner: "Early stage public preview." [S1] |
| MCP Apps (SEP-1865) | Proposal opened 2025-11-21; postMessage protocol spec dated `2026-01-26` (directory name in `modelcontextprotocol/ext-apps`) | Now shipped: Claude/Claude Desktop, VS Code Copilot, MS 365 Copilot, Goose, Postman, MCPJam, Archestra.AI. [S15][S16][S17] |
| MCP-UI | Fully re-platformed onto MCP Apps; `@mcp-ui/client`'s `AppRenderer` is the recommended SDK | `UIResourceRenderer` kept for "legacy MCP-UI hosts" (ChatGPT, Nanobot, fast-agent). [S19][S21] |
| OpenAI Apps SDK | Rebranded/merged into **"Plugins"** docs (`developers.openai.com/plugins`); MCP Apps is now the recommended foundation, `window.openai` is the ChatGPT-only compatibility layer | [S22] |
| Thesys C1 | Docs now marked **"(archive)"** — "kept online for teams already running C1 in production. New projects should start with the **OpenUI** docs." | Product pivot from "C1" branding to standalone "OpenUI" (openui.com), pitched as "The Open Standard for Generative UI," with an "OpenUI Lang" wire format claimed to use "up to 67% fewer tokens than JSON" (unverified vendor number, no methodology found). [S29][S30] |
| Vercel `json-render` | Active, `@json-render/*`, its own JSON schema (not A2UI), Zod-typed catalogs, explicitly documents **native A2UI catalog support** as a worked example | Listed by the A2UI project itself as a "related project," not a renderer of the A2UI wire format by default — you build the catalog+renderer yourself. [S8][S24][S25] |
| CopilotKit / AG-UI | AG-UI is the transport; CopilotKit ships 6 generative-UI primitives including two A2UI flavors (Dynamic Schema / Fixed Schema) and a dedicated MCP Apps middleware (`@ag-ui/mcp-apps-middleware`) | [S26][S27][S28] |

Version-skew nuance specific to A2UI: catalogs and protocol versions evolve independently. A `v0.9` catalog can be served by a `v1.0`-capable renderer via `supportedCatalogIds` negotiation, and the project explicitly designs for coexistence during migrations (old + new catalog ID both advertised). [S5]

## Timeline

- **2025-09-24** — `a2ui-project/a2ui` GitHub org/repo created. [S1, GitHub API]
- **2025-11-21** — MCP Apps Extension proposal **SEP-1865** announced jointly by Anthropic + OpenAI MCP maintainers + MCP-UI creators, in `blog.modelcontextprotocol.io`. Explicitly built "on proven work from MCP-UI and OpenAI Apps SDK." [S15]
- **A2UI v0.8** — first public spec family; per the "what-is-a2ui" doc's worked example, uses `surfaceUpdate` / `dataModelUpdate` / `beginRendering`, nested `{"Text": {...}}` component wrapper, typed `valueString`/`valueMap` data model. Now closed to changes. [S2][S4]
- **A2UI v0.9 → v0.9.1** — protocol rewrite: flat `component: "Text"` string instead of type-wrapper object, `createSurface` replaces `beginRendering`, `updateComponents`/`updateDataModel` replace `surfaceUpdate`/`dataModelUpdate`, JSON Pointer paths replace the old typed-value adjacency list, every message carries an explicit `"version"` field. v0.9.1 is "current production release," a patch on v0.9. [S2][S3][S4]
- **MCP Apps postMessage protocol spec, dated `2026-01-26`** — the concrete `protocolVersion` string used in `ui/initialize` handshakes today (`"protocolVersion": "2026-01-26"` appears verbatim in the spec's example payload). [S16]
- **A2UI v1.0 (release candidate, current)** — adds bidirectional RPC (`callRendererFunction`/`callAgentFunction`), multi-catalog mixing per surface, renames "client/server" → "renderer/agent" throughout the wire schemas (`server_to_client.json` → `agent_to_renderer.json`, etc.), standardizes MIME type to `application/a2ui+json` (IANA-conformant; v0.9 sometimes used `application/json+a2ui`), removes `theme`/`primaryColor` from `createSurface` (styling is host-owned only), adds `Surface` as a reserved canonical root type with `allowedParents`/`allowedChildren` composition constraints. [S14]
- **Present (2026-09-30)** — OpenAI's Apps SDK docs are folded into "Plugins," pointing new integrations at MCP Apps first; Thesys's C1 docs marked archive in favor of "OpenUI"; MCP-UI's own README says its packages are "fully compliant with the MCP Apps specification and ready for production use." [S19][S22][S29]

## Mechanics

### 1. Taxonomy of generative UI (confirmed against the brief, plus what the editor missed)

CopilotKit's docs give the cleanest three-tier framing found in this research pass, and it is presented explicitly as a predictability/expressiveness spectrum, not just a list [S26]:

1. **Controlled** — you wrote the component; the agent only picks *which* one to render and *what data* to pass. Examples: Vercel AI SDK's classic `tool` → React-component pattern (`streamText` + `tool()` + client renders based on `part.type`) [S23]; CopilotKit's "Components as Tools" / "Tool Call Rendering" / "State Rendering."
2. **Declarative** — the agent emits a structured spec constrained to a **catalog** you registered; the frontend composes native components from it. Examples: **A2UI**, **json-render**, CopilotKit's A2UI integration (both flavors), **Adaptive Cards**-style systems.
3. **Open-ended** — the UI is generated elsewhere (an MCP server, or raw model-generated HTML) and the host just sandboxes it. Examples: **MCP Apps**, legacy MCP-UI `rawHtml`/`externalUrl` resources, ChatGPT's iframe widgets.

What the editor's leads under-specified but is worth stating explicitly for the book: **within "declarative," there's a further split between "dynamic schema" (a secondary LLM invents the whole tree per request) and "fixed schema" (you author the schema/layout ahead of time and the agent only supplies data into it)** — CopilotKit ships both as named A2UI variants, and the choice is a latency/predictability trade, not a taxonomy detail: dynamic schema pays for an extra LLM generation pass over the full UI tree every turn; fixed schema pays nothing extra but can't invent new layouts. [S27]

### 2. A2UI wire format, verbatim, version by version

**v0.8 (legacy)**, three messages, nested component wrapper, typed data-model values [S2]:

```jsonl
{"surfaceUpdate":{"surfaceId":"booking","components":[
  {"id":"title","component":{"Text":{"text":{"literalString":"Book Your Table"},"usageHint":"h1"}}},
  {"id":"datetime","component":{"DateTimeInput":{"value":{"path":"/booking/date"},"enableDate":true}}},
  {"id":"submit-text","component":{"Text":{"text":{"literalString":"Confirm"}}}},
  {"id":"submit-btn","component":{"Button":{"child":"submit-text","action":{"name":"confirm_booking"}}}}
]}}
{"dataModelUpdate":{"surfaceId":"booking","contents":[
  {"key":"booking","valueMap":[{"key":"date","valueString":"2025-12-16T19:00:00Z"}]}
]}}
{"beginRendering":{"surfaceId":"booking","root":"title"}}
```
*(VERBATIM, [S2])*

**v0.9.1 (stable/current)**, four messages, flat component, JSON Pointer, explicit `version` field [S2][S4]:

```jsonl
{"version":"v0.9.1","createSurface":{"surfaceId":"booking","catalogId":"https://a2ui.org/specification/v0_9_1/catalogs/basic/catalog.json"}}
{"version":"v0.9.1","updateComponents":{"surfaceId":"booking","components":[
  {"id":"title","component":"Text","text":"Book Your Table","variant":"h1"},
  {"id":"datetime","component":"DateTimeInput","value":{"path":"/booking/date"},"enableDate":true},
  {"id":"submit-text","component":"Text","text":"Confirm"},
  {"id":"submit-btn","component":"Button","child":"submit-text","variant":"primary",
   "action":{"event":{"name":"confirm_booking"}}}
]}}
{"version":"v0.9.1","updateDataModel":{"surfaceId":"booking","path":"/booking","value":{"date":"2025-12-16T19:00:00Z"}}}
```
*(VERBATIM, [S2])*

Root component is convention-based in v0.9 (`"id": "root"`), not a separate field — a real regression in explicitness vs v0.8's `beginRendering.root`, traded for fewer message types. [S4]

**v1.0 (RC)** keeps the v0.9 wire shape but: lets `createSurface` carry initial `components`/`dataModel` inline (single-message surface creation), drops `theme`, adds bidirectional function-call messages, and requires `value` in `updateDataModel` (set to `null` to delete — omitting `value` is now a schema error, a breaking change from v0.9 where omission meant delete). [S14]

**Action/event payload** (user clicks a button) [S10]:

```json
{"version":"v0.9","action":{"name":"submit_reservation","surfaceId":"booking-surface",
 "sourceComponentId":"submit-btn","timestamp":"2026-02-25T10:40:00Z",
 "context":{"time":"7:00 PM","size":4}}}
```
*(VERBATIM, [S10]; note the v0.8→v0.9 rename of the top-level key from `userAction` to `action`.)*

### 3. Catalogs: the security boundary and the versioning contract

A catalog is a **standalone JSON Schema document** (no external `$ref`s allowed in the final artifact — only during authoring, resolved by a `register-catalogs.js` linking step) listing every component, function, and theme token an agent may use for a surface. [S5]

Catalog schema (v0.9) [S5, VERBATIM]:
```json
{"Catalog":{"type":"object","properties":{
  "catalogId":{"type":"string"},
  "components":{"type":"object","additionalProperties":{"$ref":"https://json-schema.org/draft/2020-12/schema"}},
  "functions":{"type":"array","items":{"$ref":"#/$defs/FunctionDefinition"}},
  "theme":{"type":"object","additionalProperties":{"$ref":"https://json-schema.org/draft/2020-12/schema"}}
},"required":["catalogId"],"additionalProperties":false}}
```

**Negotiation handshake**, 3 steps [S5]:
1. Agent *optionally* advertises supported catalogs in its A2A AgentCard (`capabilities.extensions[].params.supportedCatalogIds`).
2. Client *must* advertise its `supportedCatalogIds`, ordered by preference, in message metadata (`a2uiClientCapabilities`) on every message.
3. Agent picks the best match when creating a surface; the choice is locked for that surface's lifetime; if nothing matches, the agent sends no UI.

**Evolution rules** the spec enforces as prose (this is the part worth stealing for any internal catalog design): additive-only changes; deprecate-don't-delete (`deprecated: true` + `x-deprecated-reason`); treat enums as open (unknown variants must not break old renderers); graceful degradation for unknown components (render a safe fallback, don't crash the surface); intermediary services (orchestrators) must round-trip unknown fields unchanged; reserve major version bumps for genuinely breaking changes, and when you do bump, **put the version in the `catalogId` URI** (`.../v1/catalog.json` → `.../v2/catalog.json`) so old and new agents can coexist during rollout by having the client list both IDs. [S5]

**Two-phase validation + graceful degradation**: the agent validates its own JSON against the catalog *before* sending (catch hallucinated props at the source, self-correct or fall back to text); the client validates *again* on receipt (defense against version skew or a compromised agent) and reports failures back over the wire as a typed error:

```json
{"version":"v0.9","error":{"code":"VALIDATION_FAILED","surfaceId":"flight-status-card-123",
 "path":"/components/FlightCard/flightNumber",
 "message":"Missing required property 'flightNumber' in component 'FlightCard'."}}
```
*(VERBATIM, [S5])* — this is a genuinely useful pattern for any structured-output tool: a closed-loop, machine-readable "you hallucinated, here's exactly where" channel back to the generator.

### 4. Actions, local state, and the read/write contract

A2UI splits interactivity into **Functions** (local, renderer-only, e.g. `openUrl` — agent never told) and **Events** (dispatched to the agent, e.g. button click). Interactive components can declare `checks` (validation predicates); a `Button` with a failing check is **automatically disabled by the renderer**, before any network round trip. [S10]

The renderer owns a local **Read/Write contract**: every keystroke into a `TextField` updates the local data model **synchronously**, immediately, before any event fires — so no debouncing is needed on the wire, and the network never sees per-keystroke noise; only an explicit Event (button click) or a `sendDataModel: true` sync ships the current values to the agent. This is presented as a deliberate performance design, not an accident. [S10]

**Data Model Sync** (v0.9 feature): setting `sendDataModel: true` on `createSurface` makes the renderer attach the *entire* current data model as transport metadata (`a2uiClientDataModel`) on every outgoing message — enabling voice/text commands like "okay, submit" without the user touching a specific button, because the agent can read current field values out of the metadata directly. [S10]

**Multi-agent security note (verified, load-bearing)**: when `sendDataModel: true` is on, an orchestrator sitting between renderer and sub-agents **must strip unowned surfaces** out of `a2uiClientDataModel` before forwarding to a sub-agent, or a compromised/malicious sub-agent can scrape another surface's state (e.g. a weather agent reading a banking form). The Python SDK ships `A2uiSubagentMap.strip_unowned_surfaces_from_data_model` for exactly this, wired as a `ClientCallInterceptor`. This is called out with a `WARNING` block in the spec docs, i.e. it's a known, named threat, not a hypothetical. [S10]

### 5. MCP Apps (SEP-1865): wire format and lifecycle

Extension id: `io.modelcontextprotocol/ui`. Core pattern: a tool's metadata points at a pre-declared `ui://` resource; the host can prefetch/review that resource *before* the tool ever runs. [S16]

**MIME type discrepancy across sources, worth flagging explicitly**: the Nov 2025 announcement blog post's code sample uses `mimeType: "text/html+mcp"` [S15, VERBATIM from the blog]; the current spec text and MCP-UI's own docs both say `mimeType` **MUST be `text/html;profile=mcp-app`** [S16][S19]. The spec/MCP-UI text is newer and normative — the blog's snippet is simply stale relative to what shipped.

Resource registration + tool linkage, current wire shape [S16, VERBATIM types abbreviated]:
```ts
interface UIResource {
  uri: string;              // MUST use ui:// scheme
  name: string;
  mimeType: string;         // "text/html;profile=mcp-app"
  _meta?: { ui?: UIResourceMeta };  // csp, permissions, domain, prefersBorder
}
```
`resources/read` returns `{contents:[{uri, mimeType:"text/html;profile=mcp-app", text?|blob?, _meta}]}`.

**CSP is declared by the server, enforced by the host** — `connectDomains`/`resourceDomains`/`frameDomains`/`baseUriDomains`; omitted = maximally restrictive default (no external network, no external resources, `frame-src 'none'`, `base-uri 'self'`). The spec even ships a literal CSP-string template the host is expected to build. [S16, code sample under "Security Implications"]

**Sandbox architecture is mandated, not optional, for web hosts**: a **double-iframe**. Outer "Sandbox Proxy" (same origin as host, `allow-scripts allow-same-origin`) relays JSON-RPC between host and the innermost untrusted View, which loads via `srcdoc` with `sandbox="allow-scripts allow-forms allow-popups allow-modals"` and **explicitly must never get `allow-same-origin`** — because `allow-scripts` + `allow-same-origin` together let an iframe script the sandbox attribute right off itself. This single rule is the crux of the whole security model and appears near-verbatim in both the MCP Apps SEP and A2UI's own MCP-Apps-in-A2UI guide, independently. [S12][S16]

**Lifecycle** (Requests View→Host / Notifications Host→View), core set [S16]:
- View → Host requests: `ui/open-link`, `ui/message` (push text into the chat), `ui/request-display-mode` (`inline`/`fullscreen`/`pip`), `ui/update-model-context` (silently update what the model sees next turn, deduped, may be deferred to the next user turn), plus standard `tools/call`, `resources/read`.
- Host → View notifications: `ui/notifications/tool-input` (full args, sent once), `ui/notifications/tool-input-partial` (best-effort streamed partial JSON, brackets auto-closed, zero or more times), `ui/notifications/tool-result`, `ui/notifications/tool-cancelled`, `ui/resource-teardown` (host **should wait for the View's ack** before tearing down, to avoid data loss), `ui/notifications/size-changed`, `ui/notifications/host-context-changed` (theme/locale/viewport deltas, merge not replace).
- Handshake: `ui/initialize` (View→Host) carries `appCapabilities` (tools, `availableDisplayModes`); reply carries `hostContext` (theme, CSS variable tokens for theming, `containerDimensions` in fixed/flexible/unbounded modes per axis, locale, timezone, platform, safe-area insets) and `hostCapabilities` (openLinks, serverTools, serverResources, logging, granted sandbox permissions/CSP). Host **must not** send anything else before receiving `initialized`.

**Recommended architecture pattern (OpenAI, load-bearing recipe)**: split **data tools** (fetch/compute, return only `structuredContent`, no `_meta.ui.resourceUri`) from **render tools** (take model-checked final data, carry the resourceUri, render once). Attaching a UI template to every tool call causes ChatGPT to re-render the iframe too often; the split lets the model reason over raw data *before* committing to a UI render. Call flow: data tool → `structuredContent` → model calls render tool with that data → widget renders once. [S22]

### 6. A2UI ⇄ MCP Apps composition (the two protocols nested, not competing)

Two documented directions, both with working samples in the A2UI repo:

- **A2UI inside an MCP App** — the sandboxed MCP App itself hosts an `<a2ui-surface>` and runs the A2UI `MessageProcessor`. The App's internal logic calls `bridge.callServerTool()` (JSON-RPC over `postMessage` to the Host, which forwards to the MCP server), gets back a tool result containing an `application/a2ui+json` resource, and feeds it into the local A2UI processor to render/update the surface — all inside one sandboxed iframe. Concrete use case shown: a document editor whose control panel is A2UI, embedded inside an MCP App that also renders native editor content. [S11]
- **MCP App as an A2UI custom component** — an MCP App is registered as a `custom` catalog component (`McpApp`) inside a *native* A2UI catalog, so an A2UI-driven host can drop a fully-isolated MCP App (e.g. a calculator, a Pong game) as one tile in an otherwise-native A2UI layout — with a documented "sibling update loop" where the sandboxed component's tool actions flow up through the AI orchestrator and back down as `dataModelUpdate`s to *native, non-sandboxed* sibling components (e.g. a native scoreboard reacting to a sandboxed Pong game — with the two strictly unable to talk to each other directly). [S12]

### 7. Renderer ecosystem — who actually implements the A2UI wire format

Official: `@a2ui/react` (A2UI team). Angular, Lit, Flutter (via `flutter/genui`) are the reference implementations used in the repo's own samples. [S1][S8]

Community (platform, version support) [S8]:

| Renderer | Platform | v0.8 | v0.9 | v1.0 |
|---|---|---|---|---|
| easyops-cn/a2ui-sdk | React web | ✅ | ❌ | — |
| lmee/A2UI-Android | Jetpack Compose | ✅ | ❌ | — |
| BBC6BAE9/a2ui-swift | SwiftUI/UIKit/AppKit, all Apple platforms | ✅ | ✅ | — |
| a2ui-vue | Vue | ✅ | ✅ | — |
| AGenUI/AGenUI | iOS/Android/HarmonyOS, C++ core | ❌ | ✅ | — |
| lynx-family/lynx-stack | Lynx (mobile/web/desktop) | ❌ | ✅ | — |
| yessGlory17/generative-mui | React + MUI | ❌ | ✅ | — |
| ChaliceForAuri/a2ui-svelte | Svelte 5 (runes) | ❌ | ✅ | ✅ |
| Language-Lit/material3-expressive-a2ui | React + Material 3 Expressive | ❌ | ✅ (v0.9.1) | — |
| uny/a2ui-compose | Compose Multiplatform (Android/iOS/desktop/web) | ❌ | ❌ | ✅ only |

Notable engineering detail from the write-ups: the MUI and Material-3-Expressive renderers both explicitly render **inside the host's own `<ThemeProvider>`** with **zero theme of their own** — i.e., the A2UI surface has no visual identity and fully inherits the app's design tokens, which is exactly the "native feel" claim A2UI makes structurally, not just in marketing copy. The Svelte renderer's threat model line item is worth repeating for the security chapter cross-link: "assumes a hostile agent" — catalog allowlist, `on*`/function-call stripping, prototype-pollution refusal, escape-then-markup for text, bounded recursion. [S8]

## Numbers

- MCP-UI, pre-SEP: adopted at **Postman, Shopify, Hugging Face, Goose, ElevenLabs** (named companies, no usage counts). Source: SEP-1865 announcement, 2025-11-21. [S15]
- easyops-cn/a2ui-sdk: **11 published npm versions** as of the A2UI ecosystem page's snapshot (accessed 2026-09-30). [S8]
- Svelte A2UI renderer (`svelte-a2ui`): covers **all 18** Basic Catalog components, the full **59-name** `Icon` enum + `{svgPath}` variant, all **14** built-in functions. [S8]
- Compose Multiplatform renderer (`a2ui-compose`): covers all 18 Basic Catalog components — stated to be "every component the specification's **43 examples** name." [S8]
- OpenUI (Thesys's successor product) claims its "OpenUI Lang" format generates UI "in **up to 67% fewer tokens** than JSON" — vendor marketing claim, no benchmark methodology found on the pages reachable in this session (the two deeper OpenUI pages returned 404 when re-fetched); **treat as unverified**. [S30]
- json-render ships **36 pre-built shadcn/ui components** across React/Vue/Svelte/Solid/React Native. [S8]
- A2UI repo age at time of writing: created 2025-09-24, i.e. **~1 year old** as of 2026-09-30, already at v0.9.1 stable + v1.0 RC — a fast cadence for a cross-org spec. [S1, GitHub API `created_at`/`pushed_at`]

No first-party latency/error-rate numbers for either A2UI or MCP Apps were found in the sources opened this session (flagged under Unverified).

## Pitfalls, limits, criticism

- **A2UI's v0.9 `root` is implicit** (`"id": "root"` convention) — a real ergonomic regression from v0.8's explicit `beginRendering.root` field; a typo'd or missing root id fails silently until render time. [S4]
- **`updateDataModel` delete semantics changed between v0.9 and v1.0**: v0.9 treats an omitted `value` as "delete the key"; v1.0 makes `value` required and treats omission as a **schema validation error** — you must send `null` explicitly to delete. A naive v0.9→v1.0 migration that doesn't touch delete call sites will start failing validation, not silently misbehave — arguably the safer failure mode, but still a breaking change to test for. [S14]
- **Catalogs must be standalone (no external `$ref`) in the final artifact** — good for LLM inference and dependency management, but it means catalog composition (importing the Basic Catalog + adding your own components) requires a build-time linking step (`register-catalogs.js`, wired into Xcode Build Phases / Gradle tasks) rather than a simple runtime import. Skipping this step is a documented footgun. [S5]
- **Data Model Sync is a named security foot-gun in multi-agent setups**: leaking `a2uiClientDataModel` to the wrong sub-agent is explicitly flagged with a `WARNING` block in the spec docs (state-scraping across surfaces) — stripping is described as "mandatory," but it's an orchestrator-side responsibility with no protocol-level enforcement; a naive orchestrator implementation will get this wrong by default. [S10]
- **MCP Apps' iframe sandbox has one absolute rule and it's easy to violate by copy-pasting a "normal" sandboxed-iframe pattern**: `allow-scripts` + `allow-same-origin` together on the *inner* iframe defeats the entire sandbox (well-known browser footgun, independently re-stated by both the MCP Apps SEP and the A2UI-in-MCP-Apps guide). Any dev who reaches for a familiar "sandboxed iframe" boilerplate that includes both flags has silently broken the security model. [S12][S16]
- **MCP Apps' inner iframe loses `localStorage`/`sessionStorage`/`IndexedDB`/cookies** (unique origin from `srcdoc` + no `allow-same-origin`) — any third-party widget expecting normal browser storage semantics needs a different persistence story (usually: ask the host via `postMessage`, or accept ephemeral state). [S12]
- **"Open-ended" (MCP Apps / raw HTML) trades security posture for expressive range** vs A2UI's declarative model — CopilotKit states this as the explicit cost of that end of the spectrum: "highest expressive range, hardest to guarantee accessibility / brand / security." A raw-HTML MCP App can still produce an inaccessible or off-brand result even though it can't escape the sandbox. [S26]
- **Multiple, disagreeing summaries of the same spec exist even within one project's own docs** — A2UI's `reference/messages.md` calls the v1.0 addition `actionResponse`; the canonical, auto-generated `evolution_guide.md` describes four separate new message types with no `actionResponse` anywhere. This is a live example of "docs drift faster than the spec they summarize" — always cross-check a hand-written summary page against the spec-generated one when they exist side by side. [S4] vs [S14]
- **Catalog fragmentation is real and acknowledged, not accidental**: "we do not think portability requires a standardized catalog across multiple clients; the LLM can interpret the catalog for each individual frontend" — meaning an agent tuned for one app's catalog will *not* render sensibly on a different app's catalog without either a shared catalog or per-target prompt/catalog switching logic. [S5]
- **`json-render` and A2UI are not the same wire format** despite frequent conflation in blog coverage — `json-render` is schema-agnostic and can be *pointed at* an A2UI-shaped catalog (worked example exists), but its native format is its own Zod-based spec; treating the two as interchangeable will produce incompatible payloads. [S8][S25]

## What changed in the last 6 months (roughly March–September 2026, inferred from doc state)

- OpenAI folded "Apps SDK" branding into a broader **"Plugins"** product and now tells new integrators to build on **MCP Apps first**, keeping `window.openai.*` purely as ChatGPT-specific sugar on top. [S22]
- Thesys retired active development messaging for **C1** (docs marked "archive") in favor of a new, differently-branded product, **OpenUI**, positioned as "The Open Standard for Generative UI" with its own DSL ("OpenUI Lang") pitched on token efficiency. [S29][S30]
- MCP-UI completed its pivot from being *a* pattern for UI-over-MCP to being **the reference SDK implementation of the MCP Apps standard**, explicitly deprecating its own older resource-embedding API to "legacy" status. [S19][S21]
- A2UI shipped a **v1.0 release candidate** carrying a genuinely new capability class (bidirectional RPC between renderer and agent, not just agent→renderer UI pushes) and a terminology rename (client/server → renderer/agent) reflecting that A2UI generation increasingly happens on-device, not just server-side. [S14]
- A2UI's ecosystem visibly broadened past Google-adjacent renderers: independent community renderers now cover Svelte 5, Vue, Compose Multiplatform, Material 3 Expressive, MUI, and even a terminal/Ink renderer — evidence of real outside adoption beyond the reference implementations. [S8]
- Google's **Gemini Enterprise** picked up A2UI for enterprise agent UI, but **with a stated gap**: only self-serve A2A-registered agents get it; agents deployed the "managed" way on Vertex AI Agent Engine do not (yet) support A2UI rendering — a concrete example of "declared roadmap, not yet uniform" inside Google's own stack. [S9]

## Diagram candidates

1. **Three-tier GenUI taxonomy** — actors: LLM, Catalog, Renderer, Host, User. Arrows: "picks component" (Controlled), "emits spec against catalog" (Declarative), "ships raw HTML" (Open-Ended). States: predictability ↔ expressiveness spectrum (per CopilotKit framing). [S26]
2. **A2UI end-to-end data flow** — Agent → (A2A DataPart | AG-UI event) → Renderer → Catalog schema validate → mount native widgets; User interacts → local data-model write (sync) → Event dispatched → Agent. Show the "Write happens before Event resolves context" ordering guarantee explicitly. [S10]
3. **Catalog negotiation handshake** — 3 actors (Agent, Client/Renderer, AgentCard); 3 steps: optional agent advertisement in AgentCard → mandatory client `supportedCatalogIds` in every message metadata → agent's per-surface catalog pick, locked for surface lifetime. [S5]
4. **Two-phase schema validation loop** — Agent (pre-send validate) → wire → Client (post-receive validate) → on failure, `VALIDATION_FAILED` error back to Agent → Agent self-corrects/regenerates or falls back to text. [S5]
5. **Message-shape evolution, v0.8 vs v0.9 vs v1.0**, side by side on one surface's `createSurface`/`updateComponents` — nested wrapper vs flat `component: "Text"` string vs inline-components-in-createSurface. [S2][S4][S14]
6. **A2UI multi-agent orchestration and data isolation** — Renderer ↔ Orchestrator ↔ {Sub-agent A (owns surface X), Sub-agent B (owns surface Y)}; show the `A2uiSubagentMap` surface-ownership table and the mandatory metadata-stripping step before forwarding `a2uiClientDataModel` to a sub-agent (and the leak that happens if you skip it). [S10]
7. **MCP Apps double-iframe sandbox** — Host page → Sandbox Proxy iframe (`allow-scripts allow-same-origin`, same origin as host) → inner View iframe (`allow-scripts` only, via `srcdoc`, unique origin, no storage). Annotate why `allow-same-origin` on the inner frame would break the whole model. [S12][S16]
8. **MCP Apps lifecycle sequence** — User → Agent → Server (tools/call) → Agent pushes UI to View → `ui/initialize` handshake → `ui/notifications/tool-input(-partial)` → `ui/notifications/tool-result` → user interacts → View calls `tools/call`/`ui/message`/`ui/update-model-context` → `ui/resource-teardown` on close. [S16][S17]
9. **A2UI-inside-MCP-App nesting** — MCP Server ⇄ Agent ⇄ Host ⇄ Sandbox Proxy ⇄ MCP App (contains: native app logic + `<a2ui-surface>` + AppBridge + A2UI rendering engine) — show the two independent message dialects (MCP JSON-RPC for App↔Host, A2UI JSON for the surface inside the App) meeting at the AppBridge. [S11]
10. **MCP App as native A2UI sibling** — native A2UI layout tree containing one `custom` McpApp node (fully sandboxed) beside native sibling components (e.g. scoreboard); show the strictly one-directional loop: sandboxed component → tool action → orchestrator → `dataModelUpdate` → native sibling (no direct sandboxed↔native communication). [S12]
11. **Decoupled data-tool/render-tool pattern** (OpenAI recipe) — Model → data tool (returns `structuredContent` only) → Model reasons over data → Model → render tool (carries `_meta.ui.resourceUri`) → single widget render. Contrast with the anti-pattern (attach UI template to every tool call → re-render thrash). [S22]
12. **Catalog version migration window** — timeline showing Client advertising `[v2, v1]` simultaneously in `supportedCatalogIds`, old Agent instances still matching v1, new Agent instances matching v2, zero-downtime cutover. [S5]

**Chart candidates** (real, if thin, data):
- Bar chart: community A2UI renderer count by platform family (Web/React ≈5, Vue 1, Svelte 1, Android/Compose 2, Apple-native 1, Compose Multiplatform 1, Lynx 1, Ink/CLI 1) — source: ecosystem/renderers.md table, accessed 2026-09-30. [S8] Caveat: small, self-reported, non-random sample (submission-based listing).
- Simple version-support matrix as a heatmap: renderer × {v0.8, v0.9, v1.0} ✅/❌/— from the same table — good for showing v1.0 support is still nearly zero across the community ecosystem right now. [S8]

## Glossary

- **Surface** — an area of UI built by the agent, managed by the renderer; surfaces cannot nest. [S13]
- **Catalog** — the itemized set of components/functions/themes an agent is allowed to use, plus usage instructions; the trust boundary of the whole system. [S13][S5]
- **Catalog transformer** — a rule set (e.g. `ComponentPruningTransformer`) that prunes/restricts a catalog before it's injected into a prompt or compiled into a validation schema — for context-window cost or capability guardrails (e.g. "guest mode" strips form inputs). [S13]
- **Data model** — the observable, hierarchical, per-surface JSON state shared and bidirectionally updatable by renderer and agent; components bind to it via JSON Pointer paths. [S13]
- **Renderer function** vs **LLM tool** — a renderer function executes on the client, registered in the catalog, invoked *after* the agent→renderer message is sent, for UI-local logic (validation, formatting); an LLM tool executes wherever the agent runs, decided *before* the message is sent, for external actions. [S13]
- **`ui://` resource** — MCP Apps' pre-declared, fetchable HTML resource, referenced from a tool's `_meta.ui.resourceUri`; separates static template from dynamic tool-call data. [S16]
- **AppBridge** — the JSON-RPC-over-`postMessage` client library (`@modelcontextprotocol/ext-apps`) a sandboxed View uses to talk to its Host without hand-rolling the message loop. [S16][S17]
- **Sandbox Proxy** — the same-origin intermediate iframe (permissions: `allow-scripts allow-same-origin`) that relays messages between Host and the untrusted innermost View iframe in the MCP Apps double-iframe pattern. [S16]
- **Decoupled pattern** — splitting an agent's tools into data tools (no UI) and render tools (carry `_meta.ui.resourceUri`), so the model can inspect fetched data before committing to a UI render. [S22]
- **NoAI information** — application-defined category of data (e.g. credit card numbers) that must never reach the model, regardless of how the data model is wired up; a GenUI-specific UX concern (users must be able to see what is/isn't AI-visible). [S13]

## Unverified / open questions

- **OpenUI's "67% fewer tokens than JSON" claim** — found only as a one-line marketing bullet on `openui.com/docs`; the two pages that would presumably back it (`how-openui-works`, `openui-vs-others`) returned HTTP 404 both via `curl` (client-rendered Next.js app, no server-rendered content) and via WebFetch in this session. No independent benchmark found. Treat as an unverified vendor claim.
- **A2UI vs MCP Apps adoption share** — no side-by-side usage/market-share numbers were found for either protocol; all "adoption" evidence in this note is qualitative (named companies/products), not measured share.
- **Latency numbers for either protocol** (surface-render round trip, MCP Apps tool-call-to-render latency, A2UI streaming-render perceived latency) — not published anywhere found in this session; would need first-party benchmarking, e.g. via the `sera-llm-benchmark`-style harness applied to a UI-generation step, to get real numbers for the book.
- **Google Research's own generative-UI research output** (the editor's brief explicitly asked for it) — this session's web-search budget was already exhausted before targeted searching could begin (see below), so this could not be independently verified beyond what the A2UI docs themselves say about Google-internal usage (Opal, Gemini Enterprise, ADK). A follow-up pass with search budget available should specifically look for a Google Research blog post or paper on generative UI / server-driven UI + LLMs, separate from the A2UI project pages.
- **Practitioner commentary (Simon Willison, Hamel Husain, Eugene Yan, etc.) specifically on A2UI or MCP Apps** — attempted via direct URL guesses against `simonwillison.net` (tag pages returned 404; the site's search endpoint is behind a Cloudflare challenge that blocked `curl`). No practitioner blog post was independently verified in this session for this chapter; the "engineering practice" signal above instead comes from vendor docs that themselves carry named-engineer attribution (Google Opal/Gemini Enterprise/ADK quotes, AG2's blog post, CopilotKit's docs) rather than from independent commentary. A follow-up pass should retry these searches once the session's web-search budget resets, and also check Hacker News (`hn.algolia.com`) threads on the SEP-1865 announcement and on A2UI's public preview launch — not reached in this session.
- **Real production incident reports or postmortems involving generative-UI security failures** (hallucinated components causing real UI breakage, an escaped MCP App sandbox, a data-model-sync leak in a shipped multi-agent product) — none found; all security discussion in the sources is threat-modeling/prescriptive, not retrospective.

## Sources

- [S1] `a2ui-project/a2ui` — GitHub repository (README, GitHub API metadata: created_at 2025-09-24, pushed_at 2026-09-30). Publisher: A2UI project (Google-initiated, now multi-vendor). URL: https://github.com/a2ui-project/a2ui — accessed 2026-09-30.
- [S2] "What is A2UI?" — A2UI docs, `docs/public/introduction/what-is-a2ui.md`. URL: https://github.com/a2ui-project/a2ui/blob/main/docs/public/introduction/what-is-a2ui.md — accessed 2026-09-30.
- [S3] "Core Concepts" (overview) — A2UI docs, `docs/public/concepts/overview.md` — accessed 2026-09-30.
- [S4] "Message Types" (reference) — A2UI docs, `docs/public/reference/messages.md` — accessed 2026-09-30.
- [S5] "A2UI Catalogs" — A2UI docs, `docs/public/concepts/catalogs.md` — accessed 2026-09-30.
- [S6] "Transports (Message Passing)" — A2UI docs, `docs/public/concepts/transports.md` — accessed 2026-09-30.
- [S7] "How Does A2UI Compare?" — A2UI docs, `docs/public/introduction/agent-ui-ecosystem.md` — accessed 2026-09-30.
- [S8] "Ecosystem Renderers" — A2UI docs, `docs/public/ecosystem/renderers.md` — accessed 2026-09-30.
- [S9] "A2UI in the World" — A2UI docs, `docs/public/ecosystem/a2ui-in-the-world.md` — accessed 2026-09-30.
- [S10] "Handling User Actions" — A2UI docs, `docs/public/concepts/actions.md` — accessed 2026-09-30.
- [S11] "A2UI Dynamic Rendering within MCP Applications" — A2UI docs, `docs/public/guides/a2ui-in-mcp-apps.md` — accessed 2026-09-30.
- [S12] "MCP Apps Integration in A2UI Surfaces" — A2UI docs, `docs/public/guides/mcp-apps-in-a2ui.md` — accessed 2026-09-30.
- [S13] "Glossary" — A2UI docs, `docs/public/concepts/glossary.md` — accessed 2026-09-30.
- [S14] "A2UI Protocol Evolution Guide: v0.9 to v1.0" — A2UI specification source, `specification/v1_0/docs/evolution_guide.md` — accessed 2026-09-30 (via repo checkout, not a public URL page — surfaced on the docs site at `docs/public/specification/v1.0-evolution-guide.md`).
- [S15] "MCP Apps: Extending servers with interactive user interfaces" — Model Context Protocol Blog, by Anton Pidkuiko, Olivier Chafik, Ido Salomon, Liad Yosef, Nick Cooper, Sean Strong, Jerome Swannack, Alexi Christakis, Bryan Ashley. Published 2025-11-21. URL: https://blog.modelcontextprotocol.io/posts/2025-11-21-mcp-apps/ — accessed 2026-09-30.
- [S16] "SEP-1865: MCP Apps: Interactive User Interfaces for MCP" — spec text, `modelcontextprotocol/ext-apps`, `specification/2026-01-26/apps.mdx`. URL: https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx — accessed 2026-09-30.
- [S17] "MCP Apps" (overview) — Model Context Protocol docs, `docs/extensions/apps/overview.mdx`. URL: https://modelcontextprotocol.io/docs/extensions/apps/overview — accessed 2026-09-30.
- [S18] "Build an MCP App" — Model Context Protocol docs, `docs/extensions/apps/build.mdx` — accessed 2026-09-30.
- [S19] `idosal/mcp-ui` README — GitHub repository, MCP-UI project (Ido Salomon, Liad Yosef). URL: https://github.com/idosal/mcp-ui — accessed 2026-09-30.
- [S20] "Protocol Details" — MCP-UI docs, `docs/src/guide/protocol-details.md` — accessed 2026-09-30.
- [S21] "Supported Hosts" — MCP-UI docs, `docs/src/guide/supported-hosts.md` — accessed 2026-09-30.
- [S22] "Add UI to your MCP server" — OpenAI Plugins docs (formerly Apps SDK). URL: https://developers.openai.com/plugins/build/chatgpt-ui — accessed 2026-09-30.
- [S23] "Generative User Interfaces" — Vercel AI SDK docs. URL: https://ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces — accessed 2026-09-30.
- [S24] "Introduction" — json-render docs (Vercel Labs). URL: https://json-render.dev/docs — accessed 2026-09-30.
- [S25] "A2UI Integration" — json-render docs. URL: https://json-render.dev/docs/a2ui — accessed 2026-09-30.
- [S26] "Generative UI" (overview) — CopilotKit docs. URL: https://docs.copilotkit.ai/concepts/generative-ui-overview — accessed 2026-09-30.
- [S27] "Dynamic Schema A2UI" — CopilotKit docs. URL: https://docs.copilotkit.ai/generative-ui/a2ui/dynamic-schema — accessed 2026-09-30.
- [S28] "MCP Apps" — CopilotKit docs. URL: https://docs.copilotkit.ai/generative-ui/mcp-apps — accessed 2026-09-30.
- [S29] Thesys documentation index (llms.txt), showing "C1 by Thesys documentation (archive)" and pointer to OpenUI. URL: https://docs.thesys.dev/llms.txt — accessed 2026-09-30.
- [S30] "Introduction" — OpenUI docs. URL: https://www.openui.com/docs — accessed 2026-09-30.
