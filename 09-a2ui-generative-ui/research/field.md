# A2UI и Generative UI — field-report notes

Chapter 09 boundaries: this is about UI that an agent produces or drives — declarative UI specs, sandboxed
HTML apps, and the protocols carrying them (A2UI, MCP Apps/mcp-ui, OpenAI's app UI layer, Vercel AI SDK /
json-render, OpenUI/Thesys C1, CopilotKit). Cross-links: transport-level plumbing (A2A, AG-UI, MCP wire
format) belongs to ch.05/07/08; tool-calling design belongs to ch.03; this chapter only covers UI-specific
extensions of those protocols.

## TL;DR (what an engineer must know today, 2026-09-30)

- **A2UI** (Google, Apache 2.0) is a *declarative component blueprint* protocol: the agent streams JSON
  describing which components to render (from a pre-agreed **catalog**) and how they bind to a data model;
  the **client** renders with native widgets (Angular/Lit/React/Flutter) it already trusts. No code execution
  ever crosses the wire. [S1][S3]
- A2UI has gone through **three incompatible wire formats in under a year**: v0.8 (Dec 2025, "Structured
  Output First"), v0.9 (2026, "Prompt First" — redesigned to be token-efficient and embeddable directly in a
  system prompt), and v0.9.1 (a small compat patch). v1.0 is a release candidate as of today. [S1][S7][S8]
- **MCP Apps** (SEP-1865, shipped as spec version `2026-01-26`) is the opposite bet: the server ships a
  pre-built **HTML app** behind a `ui://` resource URI, the host loads it in a sandboxed iframe, and the app
  talks to the host over **JSON-RPC 2.0 on `postMessage`**. It's the unification of MCP-UI (community
  project) and OpenAI's earlier ChatGPT Apps SDK, co-authored by Anthropic + OpenAI + MCP-UI's own
  maintainers. [S16][S17][S18]
- A2UI and MCP Apps are **not competitors in the way people assume** — A2UI's own docs frame MCP Apps as
  "server owns the whole UI experience," A2UI as "host controls styling, agent sends structure." They compose
  in both directions: A2UI can run *inside* an MCP App (double-iframe sandbox), and an MCP App can be
  embedded as a custom node *inside* an A2UI surface. [S3][S12][S13]
- **AG-UI** (CopilotKit) is a third, orthogonal thing: a transport/event protocol for state sync between an
  agent backend and a frontend *you control*. A2UI is "content," AG-UI is "the pipe" — CopilotKit had
  day-zero A2UI support. [S3][S10]
- OpenAI's ChatGPT-side UI stack has **quietly renamed itself**: the old "Apps SDK" branding and
  `window.openai` API now live under **developers.openai.com/plugins**, with MCP Apps as the standards-first
  foundation and `window.openai.*` demoted to "compatibility aliases" for things the shared spec doesn't
  cover yet (checkout, file upload, modals, widget-state persistence). [S20]
- **Thesys C1 rebranded to OpenUI** in 2026 and stopped generating JSON: it now ships **OpenUI Lang**, a
  line-oriented DSL claimed to cost "up to 67% fewer tokens than JSON" and up to 80% fewer tokens on
  incremental edits, plus **OUI-1**, an open-weights (Apache 2.0) 26B/4B-active DiffusionGemma-based model
  specifically finetuned to emit it, meant to run locally on a consumer GPU (RTX 5090). [S24][S25][S26][S28]
- **Vercel's json-render** is schema-agnostic (built on Zod catalogs) and can speak A2UI's wire format
  natively without a conversion layer — but it defaults to streaming **RFC 6902 JSON Patch** operations for
  incremental UI edits, a different mechanism than A2UI's own adjacency-list diffing. [S22][S27]
- Real production complaints cluster around three things, all confirmed in this chapter's own primary
  sources: **breaking changes inside "stable" catalog/schema versions** (a2ui#1469), **accessibility failures
  in generated UI** (duplicate "Book Now" buttons violate WCAG 2.4.6, a2ui#1410), and **CSP/static-asset
  friction** when hosting MCP Apps in a third-party client (VS Code Copilot user, HN). [S36][S37][S33]
- HN sentiment on the whole space is split roughly into three camps: (1) "yet another protocol, xkcd/927"
  fatigue, (2) security skeptics ("why would you trust an LLM to output a UI... nightmare"), (3) people who
  think this is obviously where things converge (server-driven UI, just with an LLM as the templating
  engine, à la Airbnb's SDUI). All three camps showed up in the same thread. [S30]
- The taxonomy the industry has actually converged on (per OpenUI's own 2026 report, a vendor source, but
  matching what's visible in every other doc read for this chapter) is a **three-point spectrum**: static/
  selection-only components → declarative catalog-constrained specs (where "most production agent UIs
  currently land") → open-ended raw-HTML generation (Gemini's "dynamic view" cited as the flagship). [S27]
- Nothing here is settled. The A2UI spec itself is labelled "Early stage public preview" today, and its own
  maintainers changed the wire format's core philosophy (structured-output-first → prompt-first) between two
  minor versions less than a year after launch. Build for churn. [S1][S7]

## Current state and versions (as of 2026-09-30)

| Project | Current version / status | Notes |
|---|---|---|
| **A2UI** | v0.9.1 is production release; v1.0 is a **release candidate**; v0.8 is legacy | Apache 2.0, `a2ui-project/a2ui` (moved out of `google/A2UI`) [S1] |
| **MCP Apps (SEP-1865)** | Spec version `2026-01-26` is "Stable"; a `draft` track is active | Extension id `io.modelcontextprotocol/ui`; base MCP protocol itself is at `2026-07-28` ("MCP 2.0") per OpenAI's own docs [S16][S17][S21] |
| **mcp-ui (`@mcp-ui/*`)** | Fully compliant implementation of the MCP Apps standard; still ships a "legacy" `UIResourceRenderer` path for pre-spec hosts | By Ido Salomon + Liad Yosef; became one of the three co-authoring parties of SEP-1865 [S16][S18] |
| **OpenAI ChatGPT UI layer** | Rebranded to "Plugins"; MCP Apps is the recommended new-build path, `window.openai` is now a compatibility-alias layer | developers.openai.com/plugins [S20] |
| **OpenUI (formerly Thesys C1)** | OpenUI Lang DSL + OUI-1 model (Sep 8, 2026) + Gateway ("OpenRouter for Generative UI") | MIT, `thesysdev/openui` [S26][S27] |
| **json-render (Vercel)** | Ships native A2UI catalog support; core streaming mechanism is RFC 6902 JSON Patch | Apache 2.0, `vercel-labs/json-render`; renderer breadth: React/Vue/Svelte/Solid/React Native/React Email/React PDF/R3F/Remotion/Ink/Satori [S22][S27] |
| **CopilotKit / AG-UI** | v2 entry points (`@copilotkit/runtime/v2`, `@copilotkit/react-core/v2`); `a2ui: {}` flag auto-renders A2UI output | Day-zero A2UI compatibility since A2UI's Dec 2025 launch [S10][S29] |
| **Flutter GenUI SDK** | Uses A2UI as its wire protocol under the hood | "When you use GenUI, you're using A2UI under the covers" [S10] |

## Timeline

- **2025-11-21** — MCP Apps proposed as SEP-1865 on the modelcontextprotocol blog, jointly authored by
  Anthropic (Sean Strong, Jerome Swannack, Olivier Chafik), OpenAI (Nick Cooper, Alexi Christakis, Bryan
  Ashley) and MCP-UI (Ido Salomon, Liad Yosef); framed as unifying MCP-UI and OpenAI's ChatGPT Apps SDK
  under one spec. HN: 192 points / 121 comments. [S18][S31]
- **2025-12-15/16** — Google publishes A2UI ("An open project for agent-driven interfaces"), positioning it
  against both MCP Apps and AG-UI in the same post. HN front-page thread: 164 points / 75 comments. [S19][S30]
- **2026-01-26** — MCP Apps specification reaches its first dated "Stable" release (`2026-01-26`); VS Code
  ships MCP Apps support the same day. [S16]
- **~Q1 2026** — A2UI v0.9 ships: a full philosophical rewrite from "Structured Output First" to "Prompt
  First," changing nearly every message name and structure (see Mechanics). [S7]
- **2026-03** — AG2 ships `A2UIAgent`, a reference agent with native A2UI support serving both A2A and AG-UI
  transports from one agent. [S10]
- **2026-06-10** — OpenUI (post-rebrand from Thesys C1) publishes "The State of Generative UI in 2026,"
  the industry's most-cited attempt at a taxonomy + token benchmark comparison (vendor source — see caveats
  below). [S27]
- **~mid-2026** — A2UI v0.9.1 ships: MIME-type standardization (`application/a2ui+json`) and relaxation of
  the "surfaceId must be globally unique for renderer lifetime" rule to "unique among active surfaces only."
  [S8]
- **2026-07-28** — Base MCP protocol reaches spec version `2026-07-28` (referred to informally as "MCP 2.0"
  in OpenAI's plugin docs), which MCP Events in ChatGPT requires. [S21]
- **2026-09-08** — OpenUI ships **OUI-1**, an open-weights model finetuned specifically to write OpenUI Lang;
  HN: 62 points / 65 comments, with visible pushback on the "under one second" and "no screenshots in a
  generative-UI launch post" fronts. [S26][S32]
- **2026-09-30 (today)** — A2UI's own README still labels the whole project "⚠️ Early stage public preview."
  [S1]

## Mechanics

### A2UI wire format: message types across versions

A2UI messages are JSON Lines (JSONL); each line is one self-contained message. [S2][S6]

**v0.8 message types:** `beginRendering`, `surfaceUpdate`, `dataModelUpdate`, `deleteSurface`.
**v0.9+ message types:** `createSurface`, `updateComponents`, `updateDataModel`, `deleteSurface`, `action`
(client→server), `error` (client→server). All v0.9 messages carry a `"version"` field. [S2]

VERBATIM [S2] — v0.9 `createSurface`:
```json
{
  "version": "v0.9",
  "createSurface": {
    "surfaceId": "main",
    "catalogId": "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json"
  }
}
```

VERBATIM [S2] — v0.9 `updateComponents` (flat, discriminator-based; children are ID references, i.e. an
**adjacency list**, not a nested tree):
```json
{
  "version": "v0.9",
  "updateComponents": {
    "surfaceId": "main",
    "components": [
      { "id": "root", "component": "Column", "children": ["header", "body"] },
      { "id": "header", "component": "Text", "text": "Welcome" },
      { "id": "body", "component": "Card", "child": "content" },
      { "id": "content", "component": "Text", "text": { "path": "/message" } }
    ]
  }
}
```

VERBATIM [S2] — the same in v0.8 (nested wrapper-object component + typed-array data model), for contrast:
```json
{
  "surfaceUpdate": {
    "surfaceId": "main",
    "components": [
      { "id": "greeting", "component": { "Text": { "text": {"literalString": "Hello, World!"}, "usageHint": "h1" } } }
    ]
  }
}
```
```json
{
  "dataModelUpdate": {
    "surfaceId": "main",
    "contents": [
      { "key": "user", "valueMap": [ { "key": "name", "valueString": "Alice" } ] }
    ]
  }
}
```

**Why the rewrite happened** — v0.9's own evolution guide states the design goal changed from being
"generated by an LLM using Structured Output above all else" (v0.8) to being "embedded directly in an LLM's
system prompt" (v0.9), because the v0.8 wrapper-object/typed-array shapes were "definable in the limited
schema features but often confusing for an LLM to generate." [S7] Concretely renamed/restructured: `Button`
`context` (array-of-pairs → plain object), `Button` `variant` (boolean `primary` → enum), `TextField.text`
→ `TextField.value`, `usageHint` → `variant` everywhere, `userAction` (client message) → `action`,
`distribution`/`alignment` on Row/Column → `justify`/`align`, `MultipleChoice` → `ChoicePicker`. [S7]

### Catalogs (the security boundary)

A **catalog** is a JSON Schema document listing every component, function and theme token an agent is
allowed to use for a surface — this is literally the trust boundary: "the agent can only request to render
components from that catalog." [S1][S4] Minimal catalog example, VERBATIM [S4]:
```json
{
  "$id": "https://github.com/.../hello_world/v1/catalog.json",
  "catalogId": "https://github.com/.../hello_world/v1/catalog.json",
  "components": {
    "HelloWorldBanner": {
      "type": "object",
      "properties": {
        "message": {"type": "string"},
        "backgroundColor": {"type": "string", "default": "#f0f0f0"}
      },
      "required": ["message"]
    }
  }
}
```
**Negotiation handshake:** the client sends its `supportedCatalogIds` (ordered by preference) in every
message's metadata (`a2uiClientCapabilities`); the agent picks the best match when it opens a surface and
that choice is locked for the surface's lifetime; if nothing matches, the agent sends no UI at all. [S4]
**Evolution rules the spec is explicit about:** additive-only changes; deprecate-don't-delete (`deprecated:
true` + `x-deprecated-reason`); treat enums as open; renderers must degrade gracefully on unknown
components/fields; only a major version bump (reflected in the `catalogId` URL, e.g. `/v1/` → `/v2/`) may
break compatibility, and even then both versions should be served side-by-side during migration. [S4] — this
is exactly the rule that a2ui#1469 shows being violated in practice (see Pitfalls).

**Two-phase validation + fallback:** the agent validates its own JSON against the catalog before sending
(catch hallucinated properties); the client validates again on receipt (protect against compromised/stale
agents); a client-side failure is reported back over the wire as `VALIDATION_FAILED`, closing an
agent-self-correction loop. VERBATIM error shape [S4]:
```json
{
  "version": "v0.9",
  "error": {
    "code": "VALIDATION_FAILED",
    "surfaceId": "flight-status-card-123",
    "path": "/components/FlightCard/flightNumber",
    "message": "Missing required property 'flightNumber' in component 'FlightCard'."
  }
}
```

### Actions, local state, and the "write contract"

A2UI splits interactivity into **Functions** (local, renderer-only, e.g. `openUrl` — agent never told) and
**Events** (sent to the agent). [S9] Every input component follows a synchronous local read/write contract:
typing into a `TextField` updates the local data model *immediately*, with no network call; only a dispatched
Event (e.g. a button click) sends the *current* model state to the agent. This means no debouncing is needed
for keystrokes — the network only sees discrete, user-intentional events. [S9]

VERBATIM v0.9 action-to-server payload [S9]:
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
v0.8 used the key `userAction` instead of `action` for this exact same message. [S7][S9]

**Data Model Sync (v0.9+):** if the agent sets `sendDataModel: true` on `createSurface`, the client attaches
the *entire* per-surface data model as metadata (`a2uiClientDataModel`) on every outgoing message — enabling
voice/text commands like "okay, submit" without a button click, because the agent can read current field
values out of the metadata. [S9] **Multi-agent security requirement:** in an orchestrator routing to several
sub-agents, this data model metadata can leak state between surfaces owned by different sub-agents unless
the orchestrator explicitly **strips** unowned surfaces before forwarding — the spec calls this out as a
"mandatory security requirement," not an optional hardening step, with a named utility
(`A2uiSubagentMap.strip_unowned_surfaces_from_data_model`) in the reference Python SDK. [S9]

### Transport

A2UI is transport-agnostic by design; two transports are marked "✅ Stable" today: **A2A Protocol** (for
multi-agent/enterprise meshes, with built-in auth) and **AG-UI** (for full-stack React/Vue/Angular apps via
CopilotKit). REST is "📋 Planned"; WebSockets and SSE are "💡 Proposed" — i.e., still prose, not code, in the
docs as of this writing. [S5] Over A2A, the payload rides as a `DataPart` with `mimeType:
application/a2ui+json`, and its `data` field holds a **list** of messages (batching several updates in one
network round trip) — but this list form only works on **A2A v1.0+**; earlier A2A expects a single object.
[S9]

### MCP Apps: resource + sandbox + JSON-RPC

Core mechanism, from the SEP-1865 spec text itself: [S17]
1. **Tool definition** links to a UI resource via `_meta.ui.resourceUri` on the tool.
2. Resources are declared with the **`ui://`** scheme and MIME type **`text/html;profile=mcp-app`**, content
   as `text` or base64 `blob`.
3. The host fetches the resource via standard `resources/read` and renders it in a **sandboxed iframe**.
4. The iframe (a "View") behaves like an MCP *client* talking back to the host over **JSON-RPC 2.0 on
   `postMessage`** — no SDK required; a View can hand-roll `sendRequest`/`sendNotification` against
   `window.parent.postMessage`. [S17]

VERBATIM minimal hand-rolled transport [S17]:
```typescript
function sendRequest(method: string, params: any) {
  const id = nextId++;
  window.parent.postMessage({ jsonrpc: "2.0", id, method, params }, '*');
  // ...resolve/reject on a matching-id message event...
}
const initializeResult = await sendRequest("initialize", {
  capabilities: {}, clientInfo: {name: "My UI", version: "1.0.0"}, protocolVersion: "2026-01-26",
});
```

**If the Host is a web page it MUST wrap the View in an intermediate Sandbox proxy** with a *different
origin* than the host, permissions `allow-scripts allow-same-origin`; the Sandbox forwards everything except
its own `ui/notifications/sandbox-*` control messages. The Host must not talk to the View before it receives
`ui/notifications/initialized`. [S17]

**CSP is server-declared, host-enforced.** A UI resource's `_meta.ui.csp` lists `connectDomains`,
`resourceDomains`, `frameDomains`, `baseUriDomains` — omitted = maximally restrictive default (no external
connections at all). VERBATIM CSP construction from the spec [S17]:
```typescript
const cspValue = `
  default-src 'none';
  script-src 'self' 'unsafe-inline' ${csp?.resourceDomains?.join(' ') || ''};
  connect-src 'self' ${csp?.connectDomains?.join(' ') || ''};
  frame-src ${csp?.frameDomains?.join(' ') || "'none'"};
  object-src 'none';
  base-uri ${csp?.baseUriDomains?.join(' ') || "'self'"};
`;
```

**Decoupled data/render tool pattern (OpenAI's own guidance, applies generally):** attach `_meta.ui`
*only* to a dedicated "render" tool, never to every data-fetching tool — otherwise the host re-renders the
iframe on every intermediate tool call. Flow: model calls a data tool → gets `structuredContent` → model
(optionally refines/filters) → model calls the render tool with final IDs → widget mounts once. [S20]

### A2UI ⇄ MCP Apps composition (both directions, both documented in the A2UI repo itself)

- **A2UI *inside* an MCP App:** the MCP App's sandboxed HTML embeds its own A2UI renderer, receives A2UI
  JSON as an MCP tool result (`EmbeddedResource` with `mimeType: application/a2ui+json`), and forwards user
  actions from the A2UI surface back out through the same postMessage bridge. [S13]
- **MCP App *inside* an A2UI surface (double-iframe isolation):** to run untrusted third-party HTML inside a
  native A2UI layout, A2UI nests an intermediate same-origin "Sandbox Proxy" iframe, which in turn injects
  the actual untrusted app via `srcdoc` into an innermost iframe with `sandbox="allow-scripts allow-forms
  allow-popups allow-modals"` — explicitly **never** `allow-same-origin`, because "any iframe with
  `allow-scripts` and `allow-same-origin` can escape its sandbox by programmatically interacting with its
  parent DOM or removing its own sandbox attribute." [S12] This is the same "escape via same-origin +
  scripts" attack class the MCP Apps spec's own threat model calls out generically. [S12][S17]

### A2UI over plain MCP (a third pattern: static template + dynamic data)

A2UI's own MCP guide describes a pattern distinct from MCP Apps: presentation **templates** (component tree
+ `path` bindings, no literal data) are served as cacheable MCP **resources** under custom URIs (e.g.
`a2ui://recipe-card`), while a **tool call** returns only the dynamic values as an `updateDataModel` message,
linked via the same `_meta.ui.resourceUri` convention MCP Apps uses. Because the template has no hardcoded
values, the client fetches it once and reuses it forever. [S11]

## Numbers

| Metric | Value | Condition / source |
|---|---|---|
| Token cost, e-commerce UI scenario | OpenUI Lang 4,800 tok vs YAML 9,122 (+90%) vs "Legacy C1 JSON" 9,948 (+107%) vs json-render 10,180 (+112%) | tiktoken, GPT-5 encoder, 7 real-world scenarios, OpenUI's own "State of Generative UI 2026" — **vendor-produced, not independently reproduced** [S27] |
| Generation wall-clock, e-commerce scenario | 19.4 s (OpenUI Lang) vs 40.8 s (json-render patches) at 60 tok/s | same report [S27] |
| Contact-form incremental edit | 3.04× fewer tokens/time (4.9s vs 14.9s) | same report [S27] |
| Incremental-edit token savings (general claim) | "up to 80% fewer tokens, 5x faster edits" vs JSON patches | OpenUI blog, self-reported [S28] |
| OUI-1 vs base DiffusionGemma on "Generative UI Benchmark" | 71.7% vs 13.0% (5.5× improvement) | OpenUI's own benchmark, own model — treat as marketing until reproduced elsewhere [S26] |
| OUI-1 vs Gemma 4 31B on same benchmark | 71.7% vs 46.7% | same source [S26] |
| Self-distillation effect on latency | 4.3s → 1.9s per generation | same source [S26] |
| Self-distillation effect on error counts | schema errors 292→76; wiring errors 971→484 | same source, same benchmark run [S26] |
| Throughput | "over 700 tokens/second on an RTX 5090" | OUI-1, FP8, same source [S26] |
| AppLess library valid-output rate | OUI-1: 55/60 valid vs DiffusionGemma base: 23/60 | same source [S26] |
| A2UI HN launch thread | 164 points, 75 comments | news.ycombinator.com, 2025-12-16 [S30] |
| MCP Apps HN launch thread | 192 points, 121 comments | news.ycombinator.com, 2025-11-23 [S31] |
| OUI-1 HN launch thread | 62 points, 65 comments | news.ycombinator.com, 2026-09-08 [S32] |
| DOOM-in-ChatGPT MCP App thread | 93 points, 31 comments | news.ycombinator.com, 2026-04-28 [S33] |

**Read all OpenUI numbers with the "who measured" flag up:** every benchmark above comes from OpenUI's own
blog, comparing OpenUI's own DSL and model against baselines OpenUI chose (including its own "Legacy C1
JSON" as a strawman). No third-party reproduction was found in this pass. HN commenters made the same point
live in the OUI-1 thread: *"I'm amazed that this blog doesn't even have a single screenshot/photo of the kind
of UI they can generate... Focusing on benchmarks in this domain feels very wrong."* — user `tracyhenry`,
2026-09-08. [S32]

## Pitfalls, limits, criticism

**1. "Stable" catalog versions still break consumers.** `@a2ui/react` 0.10.0 started rejecting v0.8 payloads
(`MultipleChoice.selections` with both `path` and `literalArray`) that validated fine on 0.10.0's own
predecessor 0.8.0 — the official v0.8 schema never had an exclusivity (`oneOf`/XOR) constraint on that field,
but the newer runtime validator enforced one anyway. Filed as a bug, closed **"not planned."** This is a
direct violation of the spec's own written rule ("Deprecate Rather than Delete... never delete existing...
properties") happening inside a project six months into its own life. [S36][S4]

**2. Accessibility is not solved by "safe, declarative" components.** Open a2ui#1410 (P1, assigned, still
open as of this pass): the Restaurant Finder reference sample generates multiple "Book Now" buttons with
**identical visible text but different underlying actions**, which violates **WCAG 2.4.6** — screen-reader
users cannot distinguish the buttons by accessible name. Fixes proposed (`.sr-only` text, `aria-label`,
`aria-labelledby`) are exactly the fixes a human designer would need to remember too — the declarative
catalog model does not make this class of bug go away by construction, it just relocates where the mistake
happens (component-instance generation instead of hand-written markup). [S37]

**3. CSP/static-asset friction is real in third-party hosts.** Building a DOOM MCP App that runs in both
ChatGPT and Claude, the author was asked live on HN: *"I'd love if you could explain the issues you had with
CSP and serving content... I was just tinkering around with MCP Apps the other day, and I had a really hard
time serving images... this is for rendering in VSCode Copilot."* (`JambalayaJimbo`, 2026-04-28) — i.e. the
spec's CSP model (declare domains up front, restrictive-by-default) means asset-heavy apps (games, image
galleries) hit friction that text-only widgets never surface. [S33]

**4. Version churn as a first-class risk.** A2UI rewrote its entire message vocabulary once already
(v0.8→v0.9) less than a year after its public debut, explicitly because the first design ("Structured Output
First") turned out to be the wrong bet for how LLMs actually generate JSON. The project's own README still
says "Early stage public preview... Expect changes" *today*. Anyone building a production renderer against
v0.8 already had to do a second full rewrite for v0.9's flat/discriminator format. [S1][S7]

**5. "Why would you trust an LLM to output a UI?"** — the single most-upvoted skeptical HN reply to A2UI's
launch: *"Why on earth would you trust an LLM to output a UI? You're just asking for security bugs, UI
impersonation attacks, terrible usability, and more. This is a nightmare."* (`lowsong`) drew direct pushback
(*"None of the issues go away just because it's in chat?... it doesn't matter if it was inside the chat
window or outside"* — `DannyBee`) — i.e. practitioners disagree on whether "declarative + sandboxed" actually
neutralizes the risk class or just moves it. [S30]

**6. Protocol fatigue is explicit and self-aware in the community.** *"So there's MCP-UI, OpenAI's ChatKit
widgets and now Google's A2UI, that I know of. And probably some more... How many more variants are we
introducing to solve the same problem?"* (`mbossie`, top-level comment, A2UI launch thread) — followed
immediately in-thread by a correct factual answer: *"MCP-UI and OpenAI Apps are converging into the MCP Apps
extension specification"* (`hobofan`), showing the consolidation was already underway at launch time but not
common knowledge yet. [S30] Compare: `pscanf`'s prediction *"In 6 months time half of them will have been
abandoned, and the other half will have morphed into something very different and incompatible"* — which, by
the v0.8→v0.9 rewrite and the C1→OpenUI rebrand, is arguably already half-true nine months later. [S30]

**7. Design quality is not a solved problem, and benchmarks dodge it.** *"Generative UI is unsolved because
current models do not have taste and end up generating the same kind of slop... Focusing on benchmarks in
this domain feels very wrong."* (`tracyhenry` on the OUI-1 launch) — a recurring theme: token-efficiency and
latency benchmarks say nothing about whether the *resulting* UI is any good. [S32]

**8. Latency is a real architectural constraint, not a nitpick.** On A2UI's own launch thread: *"It seems
like latency will be poor if you have to wait for a server-side round trip to an LLM to update the UI
whenever you press a button?"* (`skybrian`) — and separately, a technical question about whether a client is
required to hold a live SSE connection open for a multi-day chat session went unanswered in-thread
(`verdverm`), i.e. the connection-lifetime story for long agent sessions is underspecified in the docs read
for this chapter. [S30]

**9. onClick/action wiring is still confusing across the newer stacks.** A builder migrating off MCP-UI onto
"these new implementations" (OpenUI, json-render) said outright: *"can't wrap my head around how button
on-click and actions work"* compared to MCP-UI's more directly-wired `onclick` pattern. [S34] This is a
concrete DX regression risk when moving from an imperative event model to a declarative one.

## What changed in the last 6 months (since ~2026-04)

- OpenAI's UI-building docs moved from "Apps SDK" branding to **developers.openai.com/plugins**, with MCP
  Apps promoted to the primary/portable mechanism and `window.openai.*` explicitly demoted to a
  "compatibility alias" list (checkout, file upload, modals, widget state). [S20]
- **Thesys C1 → OpenUI**, with a completely new value proposition: not "generate JSON UI trees," but "don't
  generate JSON at all" — ship a purpose-built DSL (OpenUI Lang) plus a small, open-weights model (OUI-1,
  Sep 2026) finetuned to emit it fast enough to run locally. [S25][S26]
- A2UI shipped v0.9.1 (MIME type + surfaceId-uniqueness cleanup) and the v1.0 spec moved to "release
  candidate." [S1][S8]
- AG2 shipped a **native A2UI reference agent** (`A2UIAgent`) serving the same UI over both A2A and AG-UI
  transports from one agent process — a concrete instance of the "compose, don't compete" story A2UI's docs
  tell about itself. [S10]
- Base MCP moved to protocol version `2026-07-28`, informally "MCP 2.0" in vendor docs, which OpenAI's MCP
  Events feature now requires. [S21]
- Community renderer ecosystem for A2UI grew well past the four "maintained" renderers (React, Lit, Angular,
  Flutter): GitHub search turns up independent A2UI renderers for Vue, React Native, Android/Jetpack Compose,
  .NET Blazor, and a cross-platform iOS/Android/HarmonyOS renderer ("AGenUI") — all appearing after the
  Dec 2025 launch. [S41]

## Diagram candidates

1. **A2UI end-to-end data flow** — actors: Agent(LLM) → A2UI Generator → Transport (SSE/WS/A2A) → Client
   (Stream Reader) → Message Parser → Renderer → Native UI. Arrows labeled with message types per hop. [S6]
2. **A2UI surface lifecycle (sequence diagram)** — Agent, Client; messages `createSurface` →
   `updateComponents` (×N, streaming) → `updateDataModel` → user edits (local, no arrow to agent) → user
   clicks → `action` (Client→Agent) → `deleteSurface`. States: no-surface → building → interactive →
   deleted. [S6][S9]
3. **Catalog negotiation handshake** — three actors (Agent, Client, "Catalog" as a passive artifact): Agent
   advertises `supportedCatalogIds` optionally via A2A AgentCard; Client sends `supportedCatalogIds` ordered
   by preference in every message's metadata; Agent selects one on `createSurface`, locked for surface
   lifetime; "no match → no UI sent" as a terminal state. [S4]
4. **Adjacency-list component model vs. nested tree** — side-by-side: a traditional nested-JSON tree
   (deep object) vs. A2UI's flat list of `{id, component, ...props, children: [ids]}` records — arrows show
   how updating one node by `id` requires touching only one array entry, not the whole tree. [S14]
5. **MCP Apps double-iframe/sandbox-proxy architecture** — Host page → (different-origin) Sandbox Proxy
   iframe (`allow-scripts allow-same-origin`) → inner View iframe (`allow-scripts allow-forms allow-popups
   allow-modals`, no `allow-same-origin`). Label the two "same-origin escape" attack arrows that are
   explicitly blocked. [S17]
6. **MCP Apps lifecycle handshake** — View → Host: `ui/initialize` (with `appCapabilities`) → Host → View:
   result (with `hostContext`, incl. tool-call metadata) → View → Host: `ui/notifications/initialized` →
   only then Host may send `ui/notifications/tool-input`/`tool-result`. [S17]
7. **Generative UI taxonomy spectrum** — one horizontal axis from "Static/selection-only" through
   "Declarative, catalog-constrained" to "Open-ended raw HTML," with a second axis for
   security/predictability (decreasing left→right) — annotate each point with a real example (Adaptive
   Cards-style static; A2UI/MCP Apps/OpenUI Lang as declarative; Gemini "dynamic view" as open-ended). [S27]
8. **A2UI vs MCP Apps vs AG-UI comparison matrix** — render the actual table from [S3] as a diagram: rows =
   Approach/Rendering/Styling/Security/Multi-agent/Cross-platform/LLM-generation/Spec; columns = the three
   protocols.
9. **MCP App embedded inside an A2UI surface** — the "Pong" example: MCP App Server ⇄ (MCP protocol) ⇄ AI
   Agent ⇄ (A2UI/A2A) ⇄ Host Shell, with the sandboxed McpApp component inside the A2UI component tree
   strictly unable to reach a native sibling component directly — only via the Shell + Agent round trip.
   [S12]
10. **A2UI-inside-MCP-App reverse embedding** — Client Host ⇄ MCP Server/Agent, with an MCP App running its
    own internal A2UIRenderer + AppBridge, showing the 7-step "Loading A2UI Components in MCP Apps"
    request/relay/response chain. [S13]
11. **Orchestrator surface-ownership + data-leakage-stripping** — Orchestrator holds a `surfaceId →
    sub-agent` map; on outbound requests it must strip `a2uiClientDataModel` down to only the surfaces owned
    by the target sub-agent; show the "leak" arrow (a weather sub-agent reading a banking surface's data) as
    the thing being prevented. [S9]
12. **Token-efficiency bar chart** (chart candidate, not just diagram) — OpenUI Lang 4,800 / YAML 9,122 /
    Legacy C1 JSON 9,948 / json-render 10,180 tokens for the same e-commerce UI scenario, tiktoken/GPT-5
    encoder — **label as vendor-produced (OpenUI), not independently verified**. [S27]

## Chart candidates (with real values)

- Token counts by format for one fixed scenario: OpenUI Lang 4,800; YAML 9,122; Legacy C1 JSON 9,948;
  json-render 10,180 — source OpenUI "State of Generative UI 2026," tiktoken GPT-5 encoder, 7 scenarios
  tested, this is scenario "e-commerce." [S27]
- OUI-1 benchmark scores: DiffusionGemma base 13.0% → OUI-1 71.7% (5.5×); Gemma 4 31B 46.7% for comparison.
  Source: OpenUI's own "Generative UI Benchmark." [S26]
- OUI-1 self-distillation before/after: latency 4.3s→1.9s; schema errors 292→76; wiring errors 971→484;
  AppLess valid-output count 23/60→55/60. Source: same OpenUI blog post. [S26]
- HN engagement comparison across the three flagship launch posts: A2UI (164pt/75c, 2025-12-16), MCP Apps
  (192pt/121c, 2025-11-23), OUI-1 (62pt/65c, 2026-09-08) — a rough proxy for developer-community attention
  intensity over time on this exact topic. [S30][S31][S32]

## Glossary

- **Surface** — an A2UI-addressable UI region identified by `surfaceId`; created, updated, and deleted
  independently of other surfaces. [S2]
- **Catalog** — a JSON Schema document enumerating the components/functions/theme tokens an agent may use
  for a surface; the core security boundary of A2UI. [S4]
- **Adjacency list (A2UI)** — A2UI's flat component representation: components reference children by string
  `id`, not by JSON nesting, so any node can be patched independently. [S14]
- **`ui://` resource** — MCP Apps' resource scheme for HTML app content, MIME type
  `text/html;profile=mcp-app`. [S17]
- **View (MCP Apps)** — the sandboxed iframe running a server-provided HTML app; behaves as an MCP client
  toward the host over `postMessage`. [S17]
- **Sandbox Proxy** — a same-origin-different-from-host intermediate iframe MCP Apps requires on web hosts,
  isolating raw DOM injection from the host app. [S17]
- **Double-iframe isolation (A2UI term for the same pattern)** — nesting an inner untrusted-content iframe
  inside a same-origin sandbox-proxy iframe, deliberately omitting `allow-same-origin` on the inner one.
  [S12]
- **Data Model Sync** — A2UI's `sendDataModel: true` mechanism that attaches the entire per-surface data
  model to every client→agent message, enabling verbal/implicit form submission. [S9]
- **Declarative UI (vs. open-ended generation)** — the model emits a structured spec (JSON, DSL, patch ops)
  constrained to a pre-registered component catalog, as opposed to raw HTML/CSS/JS. [S27]
- **Server-Driven UI (SDUI)** — the pre-LLM ancestor pattern (cited example: Airbnb, Instagram) where a
  backend sends a UI description a native client renders; A2UI is this pattern with an LLM as the "template
  engine." [S30]
- **OpenUI Lang** — OpenUI's purpose-built DSL for UI generation, positioned as "between JSON and full
  JavaScript," line-oriented for progressive parsing. [S28]

## Unverified / open questions

- **Habr coverage**: attempted `habr.com` search for "A2UI," "MCP Apps," "generative UI agent" — the site's
  search is a client-rendered SPA with no server-side-rendered results and no working public search API
  reachable from this environment (tried direct search page, Bing `site:` RSS, and a public SearX instance,
  all blocked or empty). Could not confirm or deny Russian-language Habr coverage of this chapter's topic.
- **Telegram `t.me/s/fastnewsdev`**: fetched the public mirror; the ~18 most recent visible posts (no easy
  pagination without message-id params) are general agentic-tooling digest content and do not mention A2UI,
  MCP Apps, generative UI, or OpenUI. Cannot rule out coverage in older posts not visible on the default
  `/s/` view.
- **Reddit** (r/LocalLLaMA, r/ClaudeAI, r/mcp, r/LangChain, r/AI_Agents, r/ChatGPTCoding, r/ExperiencedDevs):
  all `reddit.com`/`old.reddit.com` JSON and HTML endpoints returned 403/redirect-to-login from this
  environment; WebFetch also refused `reddit.com` URLs outright ("unable to fetch"). No Reddit field reports
  could be gathered for this chapter despite it being explicitly requested in scope.
- **OpenUI/OUI-1 benchmark numbers** are all self-reported by OpenUI comparing to baselines OpenUI chose
  (including its own predecessor product as "Legacy C1 JSON"); no independent reproduction found. Treat every
  number in this file attributed to [S26]/[S27]/[S28] as a vendor claim, not a verified fact.
- **AG-UI's precise wire-level relation to A2UI** ("AG-UI uses A2UI as the protocol under the hood," per one
  HN commenter identifying as a Google employee) is stated informally in comments, not confirmed against
  AG-UI's own spec text in this pass — worth checking directly against `ag-ui-protocol/ag-ui` docs, which
  belongs more naturally to ch.08 (AG-UI) anyway.
- **X/Twitter**: not reached in this pass (no working fetch path found in the time budget); the DOOM-MCP-App
  original announcement thread (`x.com/rauchg/status/1978235161398673553`) was only seen second-hand via an
  HN comment link, not opened directly.

## Sources

- [S1] a2ui-project/a2ui, `README.md` (main branch). Google / A2UI project. Accessed 2026-09-30.
  https://github.com/a2ui-project/a2ui
- [S2] A2UI docs, "Message Types," `reference/messages.md`. A2UI project. Accessed 2026-09-30.
  https://github.com/a2ui-project/a2ui/blob/main/docs/public/reference/messages.md
- [S3] A2UI docs, "How Does A2UI Compare?," `introduction/agent-ui-ecosystem.md`. A2UI project. Accessed
  2026-09-30. https://github.com/a2ui-project/a2ui/blob/main/docs/public/introduction/agent-ui-ecosystem.md
- [S4] A2UI docs, "A2UI Catalogs," `concepts/catalogs.md`. A2UI project. Accessed 2026-09-30.
  https://github.com/a2ui-project/a2ui/blob/main/docs/public/concepts/catalogs.md
- [S5] A2UI docs, "Transports," `concepts/transports.md`. A2UI project. Accessed 2026-09-30.
  https://github.com/a2ui-project/a2ui/blob/main/docs/public/concepts/transports.md
- [S6] A2UI docs, "Data Flow," `concepts/data-flow.md`. A2UI project. Accessed 2026-09-30.
  https://github.com/a2ui-project/a2ui/blob/main/docs/public/concepts/data-flow.md
- [S7] A2UI specification, "Evolution Guide v0.8.1 to v0.9," `specification/v0_9/docs/evolution_guide.md`.
  A2UI project. Accessed 2026-09-30.
  https://github.com/a2ui-project/a2ui/blob/main/specification/v0_9/docs/evolution_guide.md
- [S8] A2UI specification, "Evolution Guide v0.9 to v0.9.1," `specification/v0_9_1/docs/evolution_guide.md`.
  A2UI project. Accessed 2026-09-30.
  https://github.com/a2ui-project/a2ui/blob/main/specification/v0_9_1/docs/evolution_guide.md
- [S9] A2UI docs, "Handling User Actions," `concepts/actions.md`. A2UI project. Accessed 2026-09-30.
  https://github.com/a2ui-project/a2ui/blob/main/docs/public/concepts/actions.md
- [S10] A2UI docs, "A2UI in the World," `ecosystem/a2ui-in-the-world.md`. A2UI project. Accessed 2026-09-30.
  https://github.com/a2ui-project/a2ui/blob/main/docs/public/ecosystem/a2ui-in-the-world.md
- [S11] A2UI docs, "A2UI over Model Context Protocol (MCP)," `guides/a2ui_over_mcp.md`. A2UI project.
  Accessed 2026-09-30. https://github.com/a2ui-project/a2ui/blob/main/docs/public/guides/a2ui_over_mcp.md
- [S12] A2UI docs, "MCP Apps Integration in A2UI Surfaces," `guides/mcp-apps-in-a2ui.md`. A2UI project.
  Accessed 2026-09-30. https://github.com/a2ui-project/a2ui/blob/main/docs/public/guides/mcp-apps-in-a2ui.md
- [S13] A2UI docs, "A2UI Dynamic Rendering within MCP Applications," `guides/a2ui-in-mcp-apps.md`. A2UI
  project. Accessed 2026-09-30.
  https://github.com/a2ui-project/a2ui/blob/main/docs/public/guides/a2ui-in-mcp-apps.md
- [S14] A2UI docs, "Components & Structure," `concepts/components.md`. A2UI project. Accessed 2026-09-30.
  https://github.com/a2ui-project/a2ui/blob/main/docs/public/concepts/components.md
- [S15] A2UI docs, "Renderers (Client Libraries)," `reference/renderers.md`. A2UI project. Accessed
  2026-09-30. https://github.com/a2ui-project/a2ui/blob/main/docs/public/reference/renderers.md
- [S16] modelcontextprotocol/ext-apps, `README.md`. Model Context Protocol project. Accessed 2026-09-30.
  https://github.com/modelcontextprotocol/ext-apps
- [S17] "SEP-1865: MCP Apps: Interactive User Interfaces for MCP," `specification/2026-01-26/apps.mdx`.
  Model Context Protocol project. Accessed 2026-09-30.
  https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx
- [S18] "MCP Apps: Extending servers with interactive user interfaces." Model Context Protocol blog,
  published 2025-11-21. Accessed 2026-09-30. https://blog.modelcontextprotocol.io/posts/2025-11-21-mcp-apps/
- [S19] "Introducing A2UI: An open project for agent-driven interfaces." Google Developers Blog, published
  2025-12-15. Accessed 2026-09-30.
  https://developers.googleblog.com/introducing-a2ui-an-open-project-for-agent-driven-interfaces/
- [S20] "Add UI to your MCP server." OpenAI Developers / Plugins docs. Accessed 2026-09-30.
  https://developers.openai.com/plugins/build/chatgpt-ui.md
- [S21] OpenAI Plugins docs, combined export (`llms-full.txt`). OpenAI Developers. Accessed 2026-09-30.
  https://developers.openai.com/plugins/llms-full.txt
- [S22] "A2UI Integration." json-render docs (Vercel). Accessed 2026-09-30. https://json-render.dev/docs/a2ui
- [S23] "Generative User Interfaces." Vercel AI SDK docs. Accessed 2026-09-30.
  https://ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces
- [S24] OpenUI (formerly Thesys C1) homepage / redirect from docs.thesys.dev. Accessed 2026-09-30.
  https://www.openui.com/
- [S25] OpenUI docs overview. Accessed 2026-09-30. https://www.openui.com/docs
- [S26] "OUI-1: world's first model for Generative UI." OpenUI blog, published 2026-09-08. Accessed
  2026-09-30. https://www.openui.com/blog/oui-1
- [S27] "The State of Generative UI in 2026." OpenUI blog, published 2026-06-10. Accessed 2026-09-30.
  https://www.openui.com/blog/state-of-generative-ui-report
- [S28] "Stop making AI write JSON." OpenUI blog. Accessed 2026-09-30.
  https://www.openui.com/blog/stop-making-ai-write-json
- [S29] "A2UI." CopilotKit docs. Accessed 2026-09-30. https://docs.copilotkit.ai/generative-ui/a2ui
- [S30] "A2UI: A Protocol for Agent-Driven Interfaces" — Hacker News discussion, 164 points / 75 comments,
  posted 2025-12-16. Accessed 2026-09-30. https://news.ycombinator.com/item?id=46286407
- [S31] "MCP Apps: Extending servers with interactive user interfaces" — Hacker News discussion, 192 points /
  121 comments, posted 2025-11-23. Accessed 2026-09-30. https://news.ycombinator.com/item?id=46020502
- [S32] "OUI-1: world's first model for Generative UI" — Hacker News discussion, 62 points / 65 comments,
  posted 2026-09-08. Accessed 2026-09-30. https://news.ycombinator.com/item?id=49613182
- [S33] "A playable DOOM MCP app" — Hacker News discussion, 93 points / 31 comments, posted 2026-04-28.
  Accessed 2026-09-30. https://news.ycombinator.com/item?id=47939079
- [S34] "I turned Markdown into a protocol for generative UI" — Hacker News discussion, 130 points / 61
  comments, posted 2026-03-19. Accessed 2026-09-30. https://news.ycombinator.com/item?id=47439300
- [S35] "Ask HN: What's the current state of ChatGPT Apps?" — Hacker News discussion, posted 2026-02-12.
  Accessed 2026-09-30. https://news.ycombinator.com/item?id=46993501
- [S36] a2ui-project/a2ui, GitHub issue #1469, "`@a2ui/react` 0.10.0 fails v0.8 payload validation for
  spec-compliant bindable fields (worked on 0.8.0)," opened 2026-05-20. Accessed 2026-09-30.
  https://github.com/a2ui-project/a2ui/issues/1469
- [S37] a2ui-project/a2ui, GitHub issue #1410, "Basic Catalog components not rendering accessibility
  attributes," opened 2026-05-12. Accessed 2026-09-30. https://github.com/a2ui-project/a2ui/issues/1410
- [S38] a2ui-project/a2ui, GitHub Issues search (sorted by comment count), incl. #963 "[v0.9] Fix memory
  leaks and standardize subscription lifecycle" and #1893 "SimpleChat does not work with data model
  properly." Accessed 2026-09-30. https://github.com/a2ui-project/a2ui/issues
- [S39] dev.to API, articles tagged `a2ui` / `generativeui`. Accessed 2026-09-30.
  https://dev.to/api/articles?tag=a2ui ; https://dev.to/api/articles?tag=generativeui
- [S40] jsdelivr package data for `gh/a2ui-project/a2ui` (version tags `0.9`, `0.8` confirmed). Accessed
  2026-09-30. https://data.jsdelivr.com/v1/packages/gh/a2ui-project/a2ui
- [S41] GitHub code search API, query `a2ui` (community renderer repos: `googlemaps/a2ui`, `AGenUI/AGenUI`,
  `lmee/A2UI-Android`, `xuzeyu91/A2UI.Blazor`, `sivamrudram-eng/a2ui-react-native`, `shawnwang15/a2ui-vue`,
  `easyops-cn/a2ui-sdk`, `southleft/a2ui-bridge`, among others). Accessed 2026-09-30.
  https://api.github.com/search/repositories?q=a2ui
