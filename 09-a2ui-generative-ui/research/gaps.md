# 09. A2UI и Generative UI — gaps & corrections notes (completeness critic)

Lens: what `spec.md`, `practice.md`, and `field.md` got wrong, missed, or left out of date, checked against primary sources on 2026-09-30. Source ids here use a `G` prefix (`[G7]`) so they don't collide with the `S` ids in the other three files. When this file disagrees with those three, this file cites the normative artifact (JSON schema, spec `.mdx`, release notes, advisory), so it wins unless a newer source appears.

## Contradictions resolved

1. **MCP Apps Sandbox-proxy origin.** `practice.md` says the outer Sandbox Proxy is "same origin as host". `field.md` says it has a "different origin". **The spec agrees with field.md:** "1. The Host and the Sandbox MUST have different origins. 2. The Sandbox MUST have the following permissions: `allow-scripts`, `allow-same-origin`." [G1]. The proxy runs same-origin with *itself* (it has `allow-same-origin`) but on a different origin from the host page. The inner View gets `srcdoc` with no `allow-same-origin`.
2. **Default CSP `connect-src`.** `spec.md` quotes `connect-src 'none'` and `field.md` quotes `connect-src 'self' ${connectDomains}`. **Both strings appear verbatim in the stable spec.** `'none'` is the "Restrictive Default" a host MUST use when `ui.csp` is omitted. `'self' …` is the template for building a CSP from declared metadata [G1]. The spec is inconsistent with itself here, so a writer should quote the default block for the "nothing declared" case. The spec also moved: ext-apps v1.7.5 (2026-07-23) shipped "Sync object-src with default-src", and the draft now adds `object-src 'none'` to the default block [G2][G46].
3. **A2UI v1.0 `actionResponse`.** `spec.md` says the v1.0 evolution guide mentions `actionResponse`. `practice.md` says the `reference/messages.md` summary page calls it `actionResponse`. **Neither is correct as of today.** The normative v1.0 schemas contain no `actionResponse`. `agent_to_renderer.json` allows exactly `createSurface`, `updateComponents`, `updateDataModel`, `deleteSurface`, `callRendererFunction`, `agentFunctionResponse`. `renderer_to_agent.json` allows exactly `action`, `callAgentFunction`, `rendererFunctionResponse`, `error` [G12]. `actionResponse` (with `wantResponse`/`responsePath`) was a **draft-v1.0 feature that was removed**. Issue #2104 (2026-07-27) "replace[s] the draft A2UI v1.0 `wantResponse` and `actionResponse` event features with Catalog-Defined Server-Side Functions" [G15]. The bidirectional RPC messages landed on 2026-08-12 (PR #2210) [G18]. The stale mentions survive only in `docs/public/index.md` ("Adds client-to-server RPC (`actionResponse`), action IDs, and renames theme to surfaceProperties") and `docs/public/concepts/overview.md`. `messages.md` no longer mentions it [G14]. `surfaceProperties` was also removed from v1.0, on 2026-07-31 (PR #2126/#2129) [G18].
4. **Where A2UI's MIME type was standardized.** `spec.md` says v1.0 standardized `application/a2ui+json`. `field.md` says v0.9.1. **v0.9.1 did it.** Its guide says: "Standardized all references to the A2UI message payload MIME type to `application/a2ui+json` (replacing the legacy `application/json+a2ui`)" [G10]. The v1.0 guide only restates it "to conform to IANA media type guidelines" [G11].
5. **`version` field value in v0.9.1 messages.** `practice.md` uses `"version":"v0.9.1"` and `spec.md`/`field.md` use `"v0.9"`. **Both are valid.** The v0.9.1 schemas declare `"version": {"enum": ["v0.9", "v0.9.1"]}`, and "v0.9.1 is fully compatible with v0.9 payloads" [G10][G13]. v1.0 uses `{"const": "v1.0"}` [G12].
6. **Basic catalog `catalogId` for v0.9.1.** `practice.md`'s "VERBATIM" v0.9.1 example uses `https://a2ui.org/specification/v0_9_1/catalogs/basic/catalog.json`. That string really is in `what-is-a2ui.md` [G25]. But the actual v0.9.1 basic catalog file declares `$id`/`catalogId` = `https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json`, the **v0_9** URL [G13]. **The docs and the schema disagree.** An agent that requests the `v0_9_1` URL will not match a renderer advertising the real id. v1.0 moves to a free-form string and recommends "prefix this with an internet domain that you own … e.g. 'mycompany.com:somecatalog'" [G12].
7. **SEP-1865 authors and affiliations.** `field.md` assigns Olivier Chafik to Anthropic and Nick Cooper to OpenAI. The blog byline says only "Anton Pidkuiko (Maintainer), Olivier Chafik (Maintainer), Ido Salomon (MCP-UI), Liad Yosef (MCP-UI), Nick Cooper (Core Maintainer), Sean Strong (Anthropic), Jerome Swannack (Anthropic), Alexi Christakis (OpenAI), Bryan Ashley (OpenAI)". It also says "The SEP was authored by MCP Core Maintainers at OpenAI and Anthropic, together with the MCP-UI creators" [G5]. The **SEP header lists a different set of 9 authors**: "Ido Salomon, Liad Yosef, Olivier Chafik, Jerome Swannack, Jonathan Hefner, Anton Pidkuiko, Nick Cooper, Bryan Ashley, Alexi Christakis". It adds Hefner and drops Strong [G1]. Use the byline wording and don't invent affiliations.
8. **Order of Google Research GenUI and MCP Apps.** `spec.md` says Google Research GenUI (2025-11-18) came "one month after MCP Apps". **It came 3 days before.** The MCP Apps proposal was published 2025-11-21 [G5].
9. **A2UI v0.9 date.** `field.md` gives "~Q1 2026". The Google Developers Blog announced **A2UI v0.9 on 2026-04-17**: the "Standard" catalog was renamed "Basic", a shared web-core library was added, and `pip install a2ui-agent-sdk` shipped [G23]. The `specification/v0_9` directory has commits from 2026-01-13, so drafts were public earlier [G18]. v0.8 launched **2025-12-15** (Google Developers Blog) [G22]. The repo was created 2025-09-24 [G44].
10. **v0.9.1 and v1.0 dates.** The `specification/v0_9_1` directory first appears **2026-05-29** and `specification/v1_0` first appears **2026-06-08** [G18]. The "release candidate" label is misleading about stability. Major v1.0 features landed *after* it: the client/server → renderer/agent rename (2026-07-23), mixable catalogs (2026-07-29), `allowedParents`/`Surface` (2026-08-04), bidirectional RPC (2026-08-12), and `userMessage` on actions (2026-08-12). On 2026-09-29 a change to reserved `@` keys was merged and reverted the same day [G18].
11. **What CopilotKit calls "Open Generative UI".** `spec.md` defines it as `useComponent`, where "agent picks *and* renders arbitrary registered components". **Current CopilotKit docs define it as agent-generated raw HTML/CSS/JS streamed into a sandboxed iframe.** The runtime flag is `openGenerativeUI: { agents: [...] }`, and `OpenGenerativeUIMiddleware` converts a streamed `generateSandboxedUi` tool call into `open-generative-ui` activity events [G35]. In the older README variant, `useComponent` registers a `widgetRenderer` component that receives an `html` string [G36]. Either way it is **open-ended** (HTML), not "registered components".
12. **CopilotKit import paths.** `spec.md`'s VERBATIM code imports from `@copilotkitnext/react`. That package is **deprecated** ("Moved into @copilotkit/react-core. Import from '@copilotkit/react-core/v2'"; its last version, 1.54.1, is from 2026-03-26) [G37]. The current A2UI setup needs no renderer wiring. It is `new CopilotRuntime({ agents, a2ui: {} })` on `@copilotkit/runtime/v2`, plus an optional `<CopilotKit a2ui={{ theme }}>` [G35].
13. **OpenAI naming.** `spec.md` cites `developers.openai.com/apps-sdk/*`. Those URLs now **301 to `/plugins`** (`/apps-sdk/build/custom-ux` → `/plugins/build/chatgpt-ui`) [G28]. The product is "Plugins": skills plus MCP servers plus optional UI, running in ChatGPT and Codex [G28].
14. **Vercel AI SDK version.** All three notes say "AI SDK 5.0". The current major is **7.0**: `ai@7.0.0` shipped 2026-06-25, 6.0.0 shipped 2025-12-22, and 5.0.0 shipped 2025-07-31. v5 and v6 are still patched under `ai-v5`/`ai-v6` tags [G4]. The generative-UI docs page still says "In AI SDK 5.0, tool parts use typed naming" [G27]. The full state set now includes `input-streaming`, `approval-requested`, `approval-responded`, and `output-denied` in addition to `input-available`/`output-available`/`output-error` [G27].
15. **Jetpack Compose renderer.** `spec.md` says it is an official alpha. `practice.md` lists only community Compose renderers. **Both hold.** There is an official AndroidX implementation (`androidx.a2ui:*`, `androidx.a2ui.compose:*`, `androidx.compose.material3:material3-a2ui`, supporting A2UI v0.9.1, Alpha) [G20][G21], and there are also community renderers.
16. **OUI-1 throughput attribution.** `field.md` attributes "over 700 tokens/second on an RTX 5090" to OUI-1 FP8. The blog attributes the figure to Google, about the base model: DiffusionGemma "over 1,000 tokens per second on a single H100 and over 700 on an RTX 5090" [G38].
17. **`surfaceId` uniqueness.** v0.9.1 *relaxed* the lifetime-uniqueness rule to "unique among currently active surfaces" [G10]. The **v1.0 schema re-tightens it**: "surfaceId MUST be globally unique for the renderer's lifetime" [G12]. The v1.0 evolution guide says "globally unique per renderer session" [G11]. The rule is version-specific, so don't state it without the version.
18. **When the Apps SDK launched.** SEP-1865's Motivation says "OpenAI's Apps SDK, launched in November 2025" [G1]. The Apps SDK actually launched at DevDay on **2025-10-06** (HN "Apps SDK", developers.openai.com/apps-sdk, 468 points, 2025-10-06) [G43]. The SEP text is wrong.
19. **"MCP 2.0".** `field.md` gives this as a version name. The MCP spec itself calls the revision **`2026-07-28`** (published 2026-07-28, with an RC on 2026-05-21) [G7][G8]. "MCP 2.0" is OpenAI Plugins-docs wording ("MCP Events in ChatGPT requires MCP 2.0 (protocol version `2026-07-28`)") [G28] and matches the TypeScript SDK 2.0 split packages [G3]. Its main effect on Apps is that core MCP became stateless: the `initialize` handshake was removed and `_meta` now carries the protocol version per request [G7]. MCP Apps keeps its *own* `ui/initialize` handshake inside the iframe [G1].
20. **The spec's own example code.** `field.md` quotes the hand-rolled transport as `sendRequest("initialize", …)`, which is verbatim from the spec. Everywhere else, the spec names the View handshake `ui/initialize` [G1]. The example's `protocolVersion` also changed from `"2026-01-26"` (stable) to `"2025-06-18"` (draft) [G1][G2]. When writing wire examples, use `ui/initialize` and the `McpUiInitializeResult` shape. The same example posts to `'*'` and does not check `event.origin`/`event.source` (see Pitfalls).

## Claims most likely to be wrong (with corrections)

1. **"A2UI can't execute code, so it's XSS-proof."** Wrong in practice. **CVE-2026-10032 / GHSA-72qq-p3r5-f7wq** (critical, CVSS 9.3, published 2026-08-03): the Basic Catalog's `openUrl` in `@a2ui/web_core` passed an agent-supplied URL straight to `window.open()`. A `javascript:` URI in a `Button`'s `functionCall` therefore ran arbitrary JS in the host origin, and it affected the React, Lit, and Angular renderers. Affected versions are 0.9.0–0.10.1. It was fixed in web_core 0.10.2 (PR #1707, merged 2026-06-19), which blocks non-http(s) URLs [G16][G17]. The accurate claim is: "no code is *shipped*, but catalog functions are code the renderer runs on agent-controlled arguments." v1.0 also marks `openUrl` as `"requiresUserActivation": true` [G11].
2. **"A2UI v1.0 adds `actionResponse`."** Wrong. The final RC has `callRendererFunction`→`rendererFunctionResponse` and `callAgentFunction`→`agentFunctionResponse`, sharing one `FunctionResponse` shape [G11][G12][G15].
3. **"A2UI's current version is v0.8" (or "v1.0").** Production is **v0.9.1**, v1.0 is a release candidate still gaining features, and v0.8 is legacy [G9][G18]. Every maintained renderer (React, Lit, Angular, Flutter) shows v1.0 as "🚧 Planned" [G20].
4. **"MCP Apps MIME type is `text/html+mcp`."** That was the 2025-11-21 blog draft [G5]. The spec requires **`text/html;profile=mcp-app`** [G1].
5. **"MCP Apps is a proposal / experimental."** The spec header says "**Status:** Stable (2026-01-26)". On 2026-01-26 the MCP blog said "MCP Apps are now live as an official MCP extension" and "ready for production" [G1][G6]. A `draft` track continues [G2]. The SDK is `@modelcontextprotocol/ext-apps` **2.0.3** (2026-09-25). 2.0.0 (2026-09-08) moved onto MCP TS SDK 2.0 and zod 4.2+ with the "wire protocol … unchanged" [G3][G4].
6. **"MCP Apps can show any external URL in an iframe."** The spec deferred that: "Include external URLs in MVP … deferred due to concerns around model visibility, inability to screenshot content, and review process". Only HTML resources are allowed [G1]. CopilotKit's README line "with MCP Apps … the server returns an iframe URL" is inaccurate [G36].
7. **"Every MCP tool the app calls is visible to the model."** Wrong. `_meta.ui.visibility` (default `["model","app"]`) exists so that `["app"]`-only tools are hidden. The spec says "Host MUST NOT include tools in the agent's tool list when their visibility does not include `"model"`", and "Host MUST reject `tools/call` requests from apps for tools that don't include `"app"`" [G1]. None of the three notes covered this.
8. **"Build ChatGPT UIs with the Apps SDK's `window.openai`."** The docs now live at **OpenAI Plugins**: "start with the MCP Apps standard" and use `window.openai` only for gaps (checkout, file upload, modals, widget state). `_meta["openai/outputTemplate"]` is a "compatibility alias" [G28]. A new layer, **OpenAI MCP Extensions** (`openai/mcp-extensions`, repo created 2026-09-29, "expected support at DevDay launch"), adds sidebar/thread/file entrypoints via `_meta["openai/ui"]["entrypoints"]` on top of MCP Apps [G29].
9. **"Vercel's generative UI is `streamUI` / RSC in AI SDK 5."** The AI SDK is at v7. The docs say "AI SDK RSC is currently experimental … we strongly recommend migrating to AI SDK UI" [G27]. The AI SDK is also an **MCP Apps host** now, through `mcpAppClientCapabilities`, `splitMCPAppTools`, `readMCPAppResource` (in `@ai-sdk/mcp`), and `experimental_MCPAppRenderer` (in `@ai-sdk/react`) [G27].
10. **"Open-JSON-UI is an OpenAI standard."** The only source for that is CopilotKit's one-line description ("An open standardization of OpenAI's internal declarative Generative UI schema"). OpenAI's Plugins docs contain 0 mentions of it [G28][G35]. CopilotKit's own `/learn/generative-ui/specs/open-json-ui` URL now redirects to its A2UI page [G35]. No public schema repo was found (search on 2026-09-30) [G44]. Treat it as vendor framing, not a spec.
11. **"Thesys C1 is the product to use."** Thesys's docs index says "C1 by Thesys documentation (archive) … New projects should start with the OpenUI docs" [G39]. C1 was an OpenAI-compatible API (`base_url='https://api.thesys.dev/v1/embed'`) that returned a "C1 DSL" UI spec [G39]. All OpenUI/OUI-1 numbers are self-reported [G38].
12. **"json-render is an A2UI renderer / speaks A2UI."** Its native spec is a flat `{root, elements:{id:{type, props, children}}}` map. It streams as **SpecStream**, JSONL lines of RFC 6902 JSON Patch ops such as `{"op":"add","path":"/elements/root",…}`, and it now also has a YAML wire format [G34]. It *can* render A2UI catalogs [G20]. It is Apache-2.0 under `vercel-labs`, created 2026-01-14, with **18,438 stars**, more than A2UI's 16,565 on 2026-09-30 [G34][G44].
13. **"Google's generative UI = A2UI" / quoting marketing numbers.** Google Research GenUI is open-ended single-page HTML (arXiv 2604.09577, 2026-02-24). The conditions matter: 100 LMArena prompts, 2 raters each, cached results, and "Generation time is not a factor". Under those conditions Elo was 1736.2 against human experts' 1800.3, GenUI was preferred over markdown 82.8% of the time, and it was "at least comparable in 50% of cases" to experts. Generation "can often take a minute or two" [G32].
14. **"In `updateDataModel`, omitting `value` deletes the key."** That is true in v0.9 only. In v1.0 `value` is required, `null` deletes, and omission is a schema error [G11]. The same trap applies to `surfaceId` uniqueness (see contradiction 17) and to `theme`, which v1.0 removed with no replacement. `surfaceProperties` was drafted and then removed [G11][G18].
15. **"Python backend devs need TypeScript to ship MCP Apps" / "use `mcp-ui-server`".** The Python `mcp-ui-server` has been stuck at 1.0.0 since 2025-11-04 [G26]. The Python path is **FastMCP**: Apps arrived in v3.0.0 (2026-02-18), `@mcp.tool(app=True)` returns Prefab components, and Generative UI (v3.2.0, 2026-03-30) has the LLM write Prefab Python that runs in Pyodide [G26][G40]. For A2UI agents the package is `a2ui-agent-sdk` (0.7.0, 2026-09-28), with `a2ui-core` 0.2.0 (breaking module moves) [G26].

## TL;DR (additions and corrections to the three notes)

- **The biggest A2UI incident of the last 3 months: CVE-2026-10032** (`openUrl` → `javascript:` XSS, CVSS 9.3, 2026-08-03). "Declarative" does not mean "safe by construction". Validate every URL/string argument of catalog functions [G16].
- **A2UI v1.0 is an RC that is still moving.** Most of its v1.0 features landed Jul–Aug 2026, and a reserved-key change was reverted on 2026-09-29. No maintained renderer supports v1.0 yet. Build on v0.9.1 [G18][G20].
- **The v1.0 RPC is `callRendererFunction`/`callAgentFunction`, not `actionResponse`.** `action.event` stays fire-and-forget. `allowedCallers` (`rendererOnly`|`agentOnly`|`rendererOrAgent`) and `requiresUserActivation` live in the catalog [G11][G15].
- **A2UI's own compact DSL: "A2UI Express".** It is a positional/Pythonic syntax (`root = Column([...])`, `$/path` bindings, `?required` checks, `Event("name", {...})`). A host-side compiler turns it into v1.0 JSON. It is a gated proposal (`A2UI_EXPRESS_ENABLED=true`), with Express, Elemental, and Atom "inference formats" added Jul 2026. This is the same idea as OpenUI Lang, coming from Google [G19][G18].
- **MCP Apps draft adds** app-registered tools (the host can call tools *on* the View), `sampling/createMessage` from the View, `ui/download-file`, `ui/notifications/request-teardown`, and `_meta.ui` on `resources/list` for connect-time CSP review [G2].
- **Tool visibility (`_meta.ui.visibility`) is the key MCP Apps security and design knob**, and none of the three notes covered it [G1].
- **`_meta.ui.domain`** gives a View a stable, dedicated sandbox origin (e.g. `{hash}.claudemcpcontent.com`, `www-example-com.oaiusercontent.com`) for OAuth callbacks, CORS, and API-key allowlists [G1].
- **The AI SDK (v7) is now an MCP Apps *host*.** Tool UI parts have 7 states, including `input-streaming` for progressive rendering and approval states for approval cards [G27].
- **OpenAI: Plugins plus MCP Extensions (2026-09-29).** These are ChatGPT-only entrypoints layered on MCP Apps [G28][G29].
- **Anthropic's own GenUI has two surfaces.** MCP Apps "interactive connectors" launched 2026-01-26 on all plans (Asana, Figma, Slack, Canva, Box, Hex, etc.) [G30]. Separately, Claude's inline "custom charts, diagrams and other visualizations", which are temporary and not Artifacts, launched 2026-03-12 [G31].
- **The Python path is FastMCP Apps plus Prefab.** Declarative Python components are serialized to a JSON tree in `structuredContent` and rendered by a single `ui://prefab/tool/<hash>/renderer.html` [G40].
- **Research has turned to multi-turn evaluation.** EvoGenUI-Bench reports that the best of 8 models reaches 74.9% turn pass but only **37.3%** of 5-turn episodes [G33]. Macaron-A2UI released fine-tuned A2UI models (30B–754B) and A2UI-Bench [G33].
- **A2UI and MCP Apps are officially complementary.** A joint Google + MCP-UI co-creators post (2026-06-17) names three patterns: A2UI over MCP, MCP Apps inside A2UI, and A2UI inside MCP Apps [G24].

## Current state and versions (as of 2026-09-30)

| Artifact | Current | Date | Source |
|---|---|---|---|
| A2UI protocol | v0.9.1 production; v1.0 RC; v0.8 legacy | v0.9.1 dir 2026-05-29; v1.0 dir 2026-06-08 | G9, G18 |
| `@a2ui/web_core` / `@a2ui/react` / `@a2ui/lit` | 0.12.0 | 2026-09-28 | G4 |
| `@a2ui/angular` | 0.11.0 | 2026-09-28 | G4 |
| `a2ui-agent-sdk` (PyPI) | 0.7.0 | 2026-09-28 | G26 |
| `a2ui-core` (PyPI) | 0.2.0 (breaking module moves, shims removed in 0.3.0) | 2026-09-28 | G26 |
| AndroidX A2UI Compose | Alpha, protocol v0.9.1 | — | G21 |
| MCP Apps spec | `2026-01-26` Stable; `draft` active | — | G1, G2 |
| `@modelcontextprotocol/ext-apps` | 2.0.3 (2.0.0 on 2026-09-08: MCP TS SDK 2.0, zod ≥4.2, Node 20+, wire unchanged) | 2026-09-25 | G3, G4 |
| MCP core spec | `2026-07-28` (stateless, `server/discover`, MRTR) | 2026-07-28 | G7 |
| `@mcp-ui/client` / `@mcp-ui/server` | 7.1.1 / 6.1.0 | 2026-05-09 / 2026-02-13 | G4 |
| `mcp-ui-server` (PyPI) | 1.0.0 (stale) | 2025-11-04 | G26 |
| FastMCP | 4.0.10; Apps since 3.0.0; GenerativeUI since 3.2.0 | 2026-09-25 | G26, G40 |
| `prefab-ui` | 0.20.2 ("frequent breaking changes", pin it) | 2026-06-03 | G26, G40 |
| Vercel `ai` | 7.0.123 (v7 GA 2026-06-25) | 2026-09-30 | G4 |
| `@json-render/core` | 0.21.0 | 2026-09-18 | G4 |
| CopilotKit (`@copilotkit/*`) | 1.75.2 | 2026-09-30 | G4 |
| `@ag-ui/mcp-apps-middleware` | 0.1.1 | 2026-09-11 | G4 |
| `ag-ui-protocol` (PyPI) | 1.0.0 (cross-link to ch.08) | 2026-09-17 | G26 |
| `@openai/chatkit-react` | 1.6.1 | 2026-07-31 | G4 |
| OpenAI MCP Extensions | new repo `openai/mcp-extensions`, "DevDay launch" | 2026-09-29 | G29 |
| `@openuidev/react-lang` | 0.3.0 | 2026-09-15 | G4 |
| Thesys C1 | archived docs | — | G39 |

## Timeline (new or corrected entries only)

- **2025-10-06**: OpenAI Apps SDK launches at DevDay. SEP-1865 misstates this as "November 2025" [G43][G1].
- **2025-11-18**: Google Research GenUI blog, 3 days *before* MCP Apps [S28 in spec.md][G5].
- **2025-11-21**: SEP-1865 proposal published. The blog code used `text/html+mcp` [G5].
- **2025-12-03**: Tambo "What Is Generative UI?" (HN 63 pts). Tambo is a React GenUI SDK, 11,182 stars, MIT [G43][G44].
- **2025-12-15**: A2UI v0.8 announced, with renderers for Flutter, Web Components, and Angular [G22]. `@a2ui/lit`/`@a2ui/angular` were first published on npm on 2025-12-16 [G4].
- **2025-12-22**: AI SDK 6.0.0 [G4].
- **2026-01-14**: json-render repo created. HN on 2026-01-24, 77 points [G34][G43].
- **2026-01-26**: MCP Apps Stable. Claude (web and desktop), Goose, VS Code Insiders, and ChatGPT ("starting that week") support it [G6]. Claude interactive connectors launch the same day [G30]. `@mcp-ui/server` 6.0.0 and `@mcp-ui/client` 6.0.0 also ship that day [G4].
- **2026-02-18**: FastMCP 3.0.0, the first release with Apps [G26].
- **2026-02-24**: arXiv 2604.09577, "Generative UI: LLMs are Effective UI Generators" [G32].
- **2026-03-12**: Claude inline visuals (beta) [G31].
- **2026-03-30**: FastMCP 3.2.0, which adds GenerativeUI (LLM-written Prefab) [G26][G40].
- **2026-04-17**: A2UI v0.9 announced. "Standard"→"Basic" catalog, `pip install a2ui-agent-sdk`, React renderer [G23].
- **2026-05-12**: a2ui#1410 accessibility issue opened. It was still open on 2026-09-30 [G17].
- **2026-05-21**: MCP `2026-07-28` RC [G8].
- **2026-05-24**: Macaron-A2UI paper with A2UI-Bench [G33].
- **2026-05-29**: `specification/v0_9_1` created [G18].
- **2026-06-08**: `specification/v1_0` created ("previously known as version 0.10") [G18].
- **2026-06-17**: Google + MCP-UI joint post "A2UI and MCP Apps" [G24].
- **2026-06-19**: PR #1707 merged. `openUrl` now accepts only http(s) [G17].
- **2026-06-25**: AI SDK 7.0.0 [G4].
- **2026-07-17 / 07-24**: A2UI Express/Elemental and Atom "inference formats" [G18].
- **2026-07-23**: A2UI v1.0 client/server → renderer/agent rename (PR #2076). ext-apps 1.7.5 released [G18][G3].
- **2026-07-28**: MCP spec `2026-07-28` [G7][G8].
- **2026-07-31**: `surfaceProperties` removed from v1.0 [G18].
- **2026-08-03**: **CVE-2026-10032** advisory published [G16].
- **2026-08-12**: v1.0 bidirectional RPC, `ValidationResult`, `userMessage` added [G18].
- **2026-08-22**: MCP roadmap post. It does not mention Apps/UI as a priority [G8].
- **2026-08-29**: EvoGenUI-Bench [G33].
- **2026-08-31**: FastMCP 4.0.0 [G26].
- **2026-09-08**: ext-apps 2.0.0. OUI-1 released [G3][G38].
- **2026-09-17**: `ag-ui-protocol` 1.0.0 on PyPI [G26].
- **2026-09-28**: `@a2ui/*` 0.12.0 and `a2ui-agent-sdk` 0.7.0 [G4][G26].
- **2026-09-29**: `openai/mcp-extensions` created. A2UI `@`-prefix change reverted [G29][G18].

## Mechanics (gap-fills only)

### 1. MCP Apps tool visibility and capability negotiation

VERBATIM [G1], app-only tool:
```json
{
  "name": "refresh_dashboard",
  "description": "Refresh dashboard data",
  "inputSchema": { "type": "object" },
  "_meta": {
    "ui": {
      "resourceUri": "ui://weather-server/dashboard-template",
      "visibility": ["app"]
    }
  }
}
```
Rules [G1]: `visibility` defaults to `["model","app"]`. `"app"` means "callable by the app from the same server connection only". "Cross-server tool calls are always blocked for app-only tools". The flat `_meta["ui/resourceUri"]` is deprecated and "will be removed before GA". The design rationale calls the single `visibility` array "Cleaner than OpenAI's two-field approach (`widgetAccessible` + `visibility`)".

VERBATIM [G1], host capability negotiation via core `initialize` (SEP-1724 extensions):
```json
{
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "extensions": {
        "io.modelcontextprotocol/ui": {
          "mimeTypes": ["text/html;profile=mcp-app"]
        }
      }
    },
    "clientInfo": { "name": "claude-desktop", "version": "1.0.0" }
  }
}
```
Fallback: "If host does not support MCP Apps, tool behaves as standard tool (text-only fallback)". Servers "MAY omit UI-only resources from `resources/list`" [G1]. Note that under MCP `2026-07-28` there is no `initialize`, and capabilities travel in `_meta` per request [G7]. How the Apps extension is advertised on the stateless protocol was not verified (see Unverified).

`_meta.ui.domain` [G1]: "Optional domain for the view's sandbox origin. Useful when views need stable, dedicated origins for OAuth callbacks, CORS policies, or API key allowlists … Host-dependent". Examples: `"a904794854a047f6.claudemcpcontent.com"`, `"www-example-com.oaiusercontent.com"`. `permissions` maps to the iframe `allow` attribute (`camera`, `microphone`, `geolocation`, `clipboardWrite`) [G1].

Sandbox flow, VERBATIM steps [G1]: "3. The Sandbox MUST send a `ui/notifications/sandbox-proxy-ready` notification … 4. Once the Sandbox is ready, the Host MUST send the raw HTML resource to load in a `ui/notifications/sandbox-resource-ready` notification." The draft relaxes both MUSTs to SHOULD [G2]. "The Host MAY forward any message from the View … to the MCP Apps server, for any method that doesn't start with `ui/` … it MAY decide to block some messages or subject them to further user approval" [G1].

### 2. MCP Apps draft additions (post-2026-01-26) [G2]

- **Bidirectional tools.** "`tools/call` and `tools/list` flow **bidirectionally**: App → Host → Server … Host → App: Host calls app-registered tools (requires app `tools` capability)". Rationale: "Without tool registration, apps are opaque to the model". Pull-based introspection complements push-based `ui/update-model-context`. App tools may be task-augmented, but "apps SHOULD delegate long-lived work to the server … because the iframe can be torn down at any time".
- **Sampling from the View.** `sampling/createMessage`: "The host has full discretion over model selection and SHOULD apply rate limiting, cost controls, and user approval". Apps MUST check `hostCapabilities.sampling`.
- **`ui/download-file`.** "MCP Apps run in sandboxed iframes where direct file downloads are blocked (`allow-downloads` is not set)". Content is sent as `EmbeddedResource` or `ResourceLink`.
- **`ui/notifications/request-teardown`**, sent View → Host (e.g. on a "Done" button).
- **Metadata location.** `_meta.ui` may sit on the `resources/list` entry (for review at connect time) and/or on the `resources/read` content item, which takes precedence. "Hosts MUST check both locations".
- New host capabilities: `downloadFile`, `updateModelContext`/`message` with `SupportedContentBlockModalities` (text/image/audio/resource/resourceLink/structuredContent), `sampling.tools`.

### 3. A2UI v1.0 RPC and actions, verbatim schema facts [G12]

- `callRendererFunction` requires `functionCallId` + `callFunction`, and `callFunction.catalogId` is **required** there. "The renderer MUST copy this ID into the return response".
- `callAgentFunction` requires `surfaceId`, `functionCallId`, `callFunction`.
- `action` (renderer→agent) requires `name`, `surfaceId`, `sourceComponentId`, `timestamp`, `context`. It optionally takes **`userMessage`** ("An optional human-readable string describing the action performed by the user") and `metadata.extensions`.
- `createSurface` may carry `components`, `dataModel`, `sendDataModel`, and `metadata`. `catalogId` is now optional, acting as the surface default.
- New error codes: `UNALLOWED_PARENT`, `UNALLOWED_CHILD`, `INVALID_FUNCTION_CALL` [G11].
- Catalog gains an `instructions` field "replacing the external `rules.txt` file" [G11].
- Accessibility: `AccessibilityAttributes` gets `live` (`off|polite|assertive`) and `hidden`. The spec adds normative prose "requiring catalog and renderer implementations to plumb accessibility attributes, infer default screen reader semantics from visible text properties, and enforce SDK linter checks" [G11]. This is the spec-level answer to a2ui#1410, which is still open.
- The basic catalog for v0.9/v0.9.1 has **18 components** (AudioPlayer, Button, Card, CheckBox, ChoicePicker, Column, DateTimeInput, Divider, Icon, Image, List, Modal, Row, Slider, Tabs, Text, TextField, Video) and **14 functions** (and, email, formatCurrency, formatDate, formatNumber, formatString, length, not, numeric, openUrl, or, pluralize, regex, required) [G13].

### 4. The CVE-2026-10032 sink, VERBATIM [G16]

```ts
export const OpenUrlImplementation = createFunctionImplementation(OpenUrlApi, args => {
  if (args.url && typeof window !== 'undefined' && window.open) {
    window.open(args.url, '_blank');
  }
});
```
The schema was `url: z.preprocess(v => (v === undefined ? undefined : String(v)), z.string())`, so there was no scheme check. Attack payload, COMPOSED from the advisory's description: `{"id":"b","component":"Button","child":"t","action":{"functionCall":{"call":"openUrl","args":{"url":"javascript:alert(document.cookie)"}}}}`. The fix is in `@a2ui/web_core` ≥ 0.10.2 [G16]. Lesson for the book: the catalog is the trust boundary, so **every catalog function is attack surface**. Validate its arguments as you would a public API.

### 5. A2UI Express (proposal), a compact inference DSL [G19]

"A2UI Express is a compact, token-efficient declarative syntax … that local on-device or remote Gemini models generate. A host-side compiler parses this syntax and compiles it into standard A2UI v1.0 wire protocol payloads." It is gated behind `A2UI_EXPRESS_ENABLED=true`. The grammar is ANTLR4 (`Express.g4`). A Kotlin engine was added 2026-07-31 [G18]. VERBATIM prompt-contract excerpts [G19]:
```text
header = ComponentA(prop1="val1")
root = ComponentB([header, ComponentC("Click", action=Event("submit"))])
...
6. Data bindings: prefix absolute paths in the data model with '$', e.g., $/user/firstName.
7. Logic and validation: prefix client check rules with '?', e.g., ?required or ?regex("^[0-9]{5}$").
8. Action events: represent server-side actions using the Event helper:
   Event("save_deal", {rep: $/form/rep})
```
The output must be wrapped in `<a2ui>…</a2ui>` sentinels. Its sibling proposal is the **A2UI Markdown Profile** (issue #2173, 2026-08-05): `<a2ui-express>`/`<a2ui-json>` blocks embedded in plain Markdown chat messages, so frameworks that store only text (OpenAI/Gemini APIs, AI SDK, LangChain) can carry surfaces [G17].

### 6. Vercel AI SDK 7 as GenUI client and as MCP Apps host [G27]

Tool part states, VERBATIM from the docs example: `'input-streaming' | 'input-available' | 'approval-requested' | 'approval-responded' | 'output-available' | 'output-error' | 'output-denied'`. That covers the UX patterns directly: a skeleton on `input-streaming`, an approval card on `approval-requested` (answered with `addToolApprovalResponse`), and a denial state on `output-denied`. Approvals can be configured on the agent with `toolApproval: { runCode: 'user-approval' }`, and `@ai-sdk/policy-opa` can move approval rules into OPA/Rego [G27].

MCP Apps host, VERBATIM [G27]:
```ts
import { createMCPClient, mcpAppClientCapabilities } from '@ai-sdk/mcp';
...
const definitions = await client.listTools();
const { modelVisible } = splitMCPAppTools(definitions);
const tools = client.toolsFromDefinitions(modelVisible);
```
"`readMCPAppResource` verifies the resource uses a `ui://` URI, requires the MCP Apps MIME type, decodes text or base64 resource contents, and returns the HTML plus rendering metadata such as CSP and permissions". For app-initiated calls: "validate that the requested tool is app-visible before calling the MCP server" (the docs return 403 otherwise). `experimental_MCPAppRenderer` "is experimental and may change". RSC is "marked as experimental, and we do not recommend using it for stable production environments". Listed reasons: no stream abort from server actions, flicker on `.done()`, "quadratic data transfer" [G27].

### 7. json-render, verbatim [G34]

Its native spec is flat: `{ root: "card-1", elements: { "card-1": { type: "Card", props: {title:"Hello"}, children: ["button-1"] }, ... } }`. The catalog is defined with Zod (`defineCatalog(schema, { components: { Card: { props: z.object({ title: z.string() }), description: "A card container" } }, actions: {...} })`), and `catalog.prompt()` generates the system prompt. The streaming format is SpecStream:
```json
{"op":"add","path":"/root","value":"root"}
{"op":"add","path":"/elements/root","value":{"type":"Card","props":{"title":"Dashboard"},"children":["metric-1","metric-2"]}}
```
"SpecStream uses RFC 6902 JSON Patch operations". Paths are JSON Pointer (RFC 6901). Renderers go well beyond the web: react-pdf, react-email, Remotion video, image (Satori), Next app shell [G34].

### 8. FastMCP Apps plus Prefab, the Python path [G40]

```python
@mcp.tool(app=True)
def team_directory() -> DataTable:
    return DataTable(columns=[...], rows=employees, search=True)
```
(VERBATIM [G40]). The pipeline is "Python components → JSON tree → structuredContent → Renderer iframe → Host UI". One Prefab renderer is served per tool at `ui://prefab/tool/<hash>/renderer.html` with `text/html;profile=mcp-app` and generated CSP. `FastMCPApp` backend tools default to `visibility: ["app"]`, and entry points default to `["model"]`. The LLM sees `"[Rendered Prefab UI]"` as the text content. **Generative UI:** `mcp.add_provider(GenerativeUI())` registers `generate_prefab_ui`, which takes Python code and runs it in a Pyodide sandbox, and `search_prefab_components`. The browser renderer "extracts the growing `code` string" from `ontoolinputpartial` and runs whatever already compiles, so the UI streams in. The server then re-runs the full code in a server-side Pyodide (Deno) for validation. There is no numpy/pandas in the sandbox [G40]. So in MCP Apps, "declarative" is something you can build *on top of* the open-ended iframe: the declarative JSON rides inside the sandbox.

### 9. OpenAI MCP Extensions (2026-09-29) [G29]

"This specification defines extensions to MCP and MCP Apps for use across ChatGPT". Entrypoints are registered via `_meta["openai/ui"]["entrypoints"]`: Global (sidebar), Thread (conversation panel), and File (file-extension handler, desktop only). "`_meta["ui"]["visibility"]` … is ignored when an MCP App is invoked as an entrypoint". It also covers structured settings, deep links, composer at-mentions, and "OpenAI form elicitation". This is ChatGPT-specific and non-portable, in the same role `window.openai` plays.

### 10. Thesys C1 wire (archived), VERBATIM [G39]

```python
client = OpenAI(
    api_key=os.getenv('THESYS_API_KEY'),
    base_url='https://api.thesys.dev/v1/embed'
)
```
"C1 API returns a UI specification object (C1 DSL) which is generated by existing LLM API based on the model selected". The frontend renders it with `<C1Component />`. This is an "OpenAI-compatible LLM proxy that returns UI" architecture, a distinct pattern for the taxonomy [G39].

### 11. Claude's two GenUI surfaces [G30][G31]

MCP Apps interactive connectors run on "Free, Pro, Max, Team, Enterprise plans" and in Cowork, on web, mobile, and desktop [G30]. Inline visuals: "They appear in-line, rather than in a side panel, and they're temporary—they change or disappear as the conversation evolves". The rendering tech was not disclosed [G31].

## Numbers

| Metric | Value | Conditions / who measured | Source |
|---|---|---|---|
| Google GenUI Elo (LMArena prompts) | Human expert site 1800.3; GenUI 1736.2; Markdown 1437.7; top search result 1352.2; text 1173.7 | 100 random LMArena prompts (8 excluded), 2 raters each, 3-point scale, pre-cached (speed ignored), backbone Gemini 3; authors are Google | G32 |
| GenUI preferred over Markdown | 82.8% (LMArena); 90.5% (Info-Seeking set) | same | G32 |
| Human expert preferred over GenUI | 50.0% (GenUI 35.3%, rest neutral) | same | G32 |
| Backbone ablation Elo / output errors | Gemini 3 1706.7/0%; 2.5 Pro 1653.6/0%; 2.5 Flash 1623.9/0%; 2.0 Flash 1332.9/29%; 2.0 Flash-Lite 1183.0/60% | LMArena set | G32 |
| Prompt ablation Elo | Full 1553.23; Minimal 1496.00; No Philosophy 1450.77 | LMArena set | G32 |
| GenUI latency | "can often take a minute or two" | authors | G32 |
| EvoGenUI-Bench | best model 74.9% Turn Pass, 37.3% of 5-turn episodes; APR 52.4% on tool-grounded tasks | 150 five-turn tasks, 750 turns, 8 models; academic | G33 |
| Macaron-A2UI | 75.6 overall on A2UI-Bench "without explicit schema hints" | self-reported; 30B/235B/754B LoRA SFT + RL | G33 |
| CVE-2026-10032 | CVSS 9.3, critical | vendor advisory | G16 |
| npm weekly downloads, 2026-09-23..29 | ext-apps 3,904,817; json-render/core 1,776,604; @a2ui/web_core 1,181,253; json-render/react 990,661; @a2ui/lit 604,303; copilotkit/a2ui-renderer 438,154; ag-ui/mcp-apps-middleware 380,993; @mcp-ui/client 296,696; openuidev/react-lang 138,475; @a2ui/react 103,579; @mcp-ui/server 103,392; @a2ui/angular 16,051; thesysai/genui-sdk 8,273; tambo-ai/react 4,718; @ai-sdk/react 8,409,086 | npm API. Includes CI and transitive installs (e.g. web_core is pulled in by renderers and CopilotKit), so this is not user count | G45 |
| PyPI last-week downloads | fastmcp 12,466,922; a2ui-agent-sdk 111,045; prefab-ui 108,477; mcp-ui-server 9,852 | pypistats, 2026-09-30 | G45 |
| GitHub stars 2026-09-30 | CopilotKit 37,618; json-render 18,438; A2UI 16,565; AG-UI 16,134; Tambo 11,182; OpenUI 9,933; MCP-UI 5,187; ext-apps 2,886; flutter/genui 1,777; OpenGenerativeUI 1,572; openai/mcp-extensions 398 (1 day old) | GitHub API | G44 |
| HN launch threads | Apps SDK 468 pts/382 c (2025-10-06); json-render 77/23 (2026-01-24); OpenUI 34/13 (2026-07-03); "What is Generative UI" (Tambo) 63/83 (2025-12-03) | HN Algolia | G43 |

## Pitfalls, limits, criticism (new)

- **Catalog functions are code.** See CVE-2026-10032. The advisory was published about 6 weeks after the fix merged (2026-06-19 → 2026-08-03), so pinned `@a2ui/web_core` 0.9.x–0.10.1 users were exposed silently. Check `npm audit` *and* repository advisories, because the GitHub global advisory DB returned nothing for `@a2ui/web_core` in this session [G16][G17].
- **Docs and schema drift inside A2UI:** `actionResponse`/`surfaceProperties` in index.md, and the `v0_9_1` catalogId URL in what-is-a2ui.md versus `v0_9` in the catalog file. **Always code against `specification/*/json/*.json`, not the docs site** [G12][G14][G25].
- **Release friction:** issue #2584 (closed 2026-09-09) says "published @a2ui/lit will crash against the current web_core". Issue #2013 says the React renderer "shows developer `[Loading {id}...]` placeholders to end users". Issue #1893 says "SimpleChat does not work with data model properly" (16 comments, open) [G17].
- **The spec's own sample postMessage code is unsafe to copy**: `window.parent.postMessage(..., '*')`, and the listener never checks `event.source`/`event.origin` [G1]. In a real View, target the known parent origin and verify the message source. The SDK `App`/`AppBridge` handles this.
- **MCP Apps residual risks named by the spec**: "UI can still display misleading content" (social engineering) and "Malicious View can consume CPU/memory" [G1]. Host sampling from a View (draft) adds cost and prompt-injection surface, which is why the spec says hosts "SHOULD apply rate limiting, cost controls, and user approval" [G2].
- **Iframe lifetime is not job lifetime**: App tools die at teardown, so long-running work goes to the server with a task handle [G2].
- **Prefab churn**: FastMCP warns that Prefab "is under active development with frequent breaking changes … pin `prefab-ui`" [G40].
- **Multi-turn GenUI is the real weakness**: 37.3% five-turn episode success on EvoGenUI-Bench. Failures cluster on "information architecture", "derived-state propagation and affordance binding", and "external-state grounding" [G33].
- **The MCP roadmap (2026-08-22) does not prioritize Apps/UI.** It covers tasks, auth, and experimental extensions. Expect Apps to evolve in `ext-apps`, not in core [G8].

## What changed in the last 6 months (missed by all three notes)

- CVE-2026-10032 in A2UI web_core (Aug 2026) [G16].
- A2UI v1.0 RC restructured (renderer/agent naming, RPC, mixable catalogs, `Surface`, a11y, `userMessage`), mostly Jul–Aug 2026 [G18].
- A2UI Express/Elemental/Atom inference formats and the Markdown Profile proposal [G18][G19][G17].
- AndroidX official A2UI Compose alpha [G21].
- Google + MCP-UI joint "A2UI and MCP Apps" guidance (2026-06-17) [G24].
- MCP Apps draft: bidirectional tools, sampling, download-file, request-teardown [G2]. ext-apps 2.0 (2026-09-08) [G3].
- MCP core `2026-07-28` (stateless) [G7].
- AI SDK 7 (2026-06-25). AI SDK becomes an MCP Apps host [G4][G27].
- FastMCP Apps/Generative UI (Python). FastMCP 4.0 (2026-08-31) [G26][G40].
- OpenAI MCP Extensions (2026-09-29) [G29].
- CopilotKit: `@copilotkitnext/*` folded into `@copilotkit/*` `/v2`, and the Open Generative UI middleware [G35][G37].
- Research: EvoGenUI-Bench, Macaron-A2UI, CHI 2026 workshop "What does Generative UI mean for HCI Practice?" [G33].

## Diagram candidates

1. **MCP Apps tool-visibility routing.** Actors: Model, Host, View (iframe), MCP Server. `tools/list` → Host filters to `visibility∋"model"` → Model. View `tools/call` → Host checks `visibility∋"app"` and same-server → Server. Label rejected paths (model→app-only tool, cross-server app call) [G1][G27].
2. **CVE-2026-10032 kill chain.** Malicious agent → `updateComponents` Button with `functionCall openUrl javascript:` → renderer validation (`z.string()` passes) → user click → `window.open` → JS in host origin. Second panel shows the fix: scheme allowlist plus `requiresUserActivation` [G16][G11].
3. **A2UI v1.0 bidirectional RPC.** Agent ⇄ Renderer: `callRendererFunction{functionCallId}` → `rendererFunctionResponse`, and `callAgentFunction{surfaceId,functionCallId}` → `agentFunctionResponse`. The catalog sits beside it, holding `allowedCallers`/`requiresUserActivation`. Error branch: `INVALID_FUNCTION_CALL` [G11][G12].
4. **Draft `actionResponse` → final RPC (design evolution).** Before: `event{wantResponse,responsePath}` → `actionResponse`. After: fire-and-forget `action` plus catalog functions. Annotate the 3 problems from #2104 [G15].
5. **A2UI Express compile pipeline.** Catalog → prompt generator (positional signatures) → LLM → `<a2ui>` Express text → host compiler → v1.0 JSON → validator (parent/child and path checks) → renderer [G19].
6. **FastMCP Prefab pipeline.** Python components → `PrefabApp.to_json()` (view/state/_meta) → `structuredContent` → Host → sandboxed Prefab renderer (`ui://prefab/tool/<hash>/renderer.html`) → `tools/call <hash>_save` back through Host → backend tool with `visibility:["app"]` [G40].
7. **Streaming partial UI in FastMCP GenerativeUI.** Timeline lanes: LLM tokens → Host `ontoolinputpartial` → browser Pyodide executes the compilable prefix → components appear. On completion, server Pyodide validates and the renderer swaps in the final result [G40].
8. **AI SDK tool-part state machine.** `input-streaming` → `input-available` → (`approval-requested` → `approval-responded` → `output-denied`|continue) → `output-available`|`output-error`. Map each state to a UX pattern: skeleton, form prefill, approval card, result card, error [G27].
9. **Three A2UI×MCP composition patterns** (Google decision tree): A2UI over MCP (native, structured data), MCP App inside A2UI (complex state-heavy module), A2UI inside MCP App (non-A2UI host) [G24].
10. **OpenAI surface stack.** MCP core → MCP Apps (portable `ui/*`) → `window.openai` compat aliases → OpenAI MCP Extensions (entrypoints: sidebar/thread/file). Annotate what is portable and what is ChatGPT-only [G28][G29].
11. **Spec-maturity timeline.** A2UI v0.8 (2025-12-15) → v0.9 (2026-04-17) → v0.9.1 (2026-05-29) → v1.0 RC (2026-06-08…ongoing), set against MCP Apps proposal (2025-11-21) → Stable (2026-01-26) → SDK 2.0 (2026-09-08) [G1][G3][G18][G22][G23].

**Chart candidates (real data):**
- Google GenUI Elo bar chart: 1800.3 / 1736.2 / 1437.7 / 1352.2 / 1173.7 (LMArena set) [G32].
- Backbone ablation line: Elo and output-error % across Gemini 2.0 Flash-Lite → Gemini 3 [G32].
- npm weekly downloads (week 2026-09-23..29), log-scale bar, with the transitive-install caveat [G45].
- GitHub stars snapshot 2026-09-30 [G44].
- EvoGenUI-Bench: Turn Pass 74.9% vs episode completion 37.3% vs APR 52.4% (tool-grounded) [G33].

## Glossary (new terms)

- **Tool visibility (`_meta.ui.visibility`)**: an MCP Apps array `["model","app"]` that controls whether the agent, the app iframe, or both may see and call a tool [G1].
- **`_meta.ui.domain`**: a host-specific dedicated sandbox origin for a View [G1].
- **App-provided tools**: (draft) tools registered *by the View* that the host or agent can call [G2].
- **`callRendererFunction` / `callAgentFunction`**: A2UI v1.0 typed RPC in both directions, correlated by `functionCallId` [G12].
- **`allowedCallers` / `requiresUserActivation`**: catalog-level guards on who can invoke a function and whether a user gesture is required [G11].
- **`Surface` (component)**: the reserved implicit root in v1.0, created by `createSurface` with `child: "root"` [G11].
- **A2UI Express**: a compact DSL that compiles to A2UI v1.0 JSON (proposal) [G19].
- **A2UI Markdown Profile**: a proposal to embed A2UI surfaces as tagged blocks in Markdown chat messages [G17].
- **SpecStream**: json-render's JSONL stream of RFC 6902 patch ops [G34].
- **Prefab**: a Python UI component library (Prefect) that FastMCP serializes to JSON for MCP Apps [G40].
- **OpenAI MCP Extensions**: ChatGPT-specific extensions on top of MCP Apps (entrypoints, settings, file handlers) [G29].
- **Open Generative UI (CopilotKit)**: agent-generated HTML/CSS/JS streamed into a sandboxed iframe [G35].
- **PAGEN**: Google's dataset of expert-made websites for evaluating GenUI [G32].

## Unverified / open questions

- **OpenAI DevDay 2026 date and announcements.** `openai/mcp-extensions` says "expected support at DevDay launch", but I could not confirm the event date. The WebSearch budget was exhausted this session (200/200), so I relied on direct fetches.
- **How MCP Apps advertises itself on stateless MCP `2026-07-28`**, where `initialize` is removed. The stable Apps spec still shows negotiation inside `initialize`. The draft was not checked for a `server/discover`/`_meta` variant.
- **Whether ChatGPT/Claude implement the draft features** (app tools, sampling, download-file). Not verified.
- **Open-JSON-UI's actual schema.** No public spec found, and CopilotKit's page redirects. The "OpenAI origin" claim is unverified.
- **Microsoft 365 Copilot MCP Apps support** (listed in `spec.md`). Not re-verified here. The ext-apps README badges list ChatGPT, Claude, VS Code, Goose, Postman, MCPJam, mcp-use, and Alpic [G42].
- **Status of Gemini app "dynamic view"** after Nov 2025. Not re-checked.
- **A2UI v1.0 GA date.** The README says v1.0 goes stable "once a sufficient number of renderers are ported" [S10 in spec.md]. There is no date.
- **Content of the A2UI "Atom" and "Elemental" inference formats.** Only commit titles were seen [G18].
- **First-party latency numbers** for A2UI or MCP Apps round trips. None exist. The only latency statement is Google's "a minute or two" for open-ended HTML [G32].

## Sources

- [G1] SEP-1865 "MCP Apps: Interactive User Interfaces for MCP", `specification/2026-01-26/apps.mdx`, modelcontextprotocol/ext-apps, Status Stable (2026-01-26), created 2025-11-21. https://raw.githubusercontent.com/modelcontextprotocol/ext-apps/main/specification/2026-01-26/apps.mdx, accessed 2026-09-30.
- [G2] Same, `specification/draft/apps.mdx` (Status: Draft). https://raw.githubusercontent.com/modelcontextprotocol/ext-apps/main/specification/draft/apps.mdx, accessed 2026-09-30.
- [G3] modelcontextprotocol/ext-apps Releases (v2.0.0 2026-09-08; v2.0.1 2026-09-24; v2.0.2/2.0.3 2026-09-25; v1.7.5 2026-07-23), by ochafik. https://github.com/modelcontextprotocol/ext-apps/releases, accessed 2026-09-30.
- [G4] npm registry metadata (versions, dist-tags, publish times) for @modelcontextprotocol/ext-apps, @mcp-ui/*, @a2ui/*, @json-render/core, @copilotkit/a2ui-renderer, ai, @openai/chatkit-react, @ag-ui/mcp-apps-middleware, @thesysai/genui-sdk, @openuidev/react-lang. https://registry.npmjs.org/, queried 2026-09-30.
- [G5] "MCP Apps: Extending servers with interactive user interfaces", MCP Blog, 2025-11-21 (byline as quoted). https://blog.modelcontextprotocol.io/posts/2025-11-21-mcp-apps/, accessed 2026-09-30.
- [G6] "MCP Apps - Bringing UI Capabilities To MCP Clients", MCP Blog, MCP Core Maintainers, 2026-01-26. https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/, accessed 2026-09-30.
- [G7] MCP Specification `2026-07-28` "Key Changes" (changelog). https://modelcontextprotocol.io/specification/2026-07-28/changelog, accessed 2026-09-30.
- [G8] MCP Blog RSS index (RC 2026-05-21, spec 2026-07-28, "The New MCP Roadmap" 2026-08-22) and the roadmap post. https://blog.modelcontextprotocol.io/index.xml ; https://blog.modelcontextprotocol.io/posts/mcp-roadmap/, accessed 2026-09-30.
- [G9] a2ui-project/a2ui README (status note). https://raw.githubusercontent.com/a2ui-project/a2ui/main/README.md, accessed 2026-09-30.
- [G10] "A2UI Protocol Evolution Guide: v0.9 to v0.9.1". https://raw.githubusercontent.com/a2ui-project/a2ui/main/specification/v0_9_1/docs/evolution_guide.md, accessed 2026-09-30.
- [G11] "A2UI Protocol Evolution Guide: v0.9 to v1.0". https://raw.githubusercontent.com/a2ui-project/a2ui/main/specification/v1_0/docs/evolution_guide.md, accessed 2026-09-30.
- [G12] A2UI v1.0 JSON schemas `agent_to_renderer.json`, `renderer_to_agent.json`, and `specification/v1_0/README.md`. https://github.com/a2ui-project/a2ui/tree/main/specification/v1_0, accessed 2026-09-30.
- [G13] A2UI v0.9 / v0.9.1 schemas (`server_to_client.json`, `client_to_server.json`, `catalogs/basic/catalog.json`). https://github.com/a2ui-project/a2ui/tree/main/specification/v0_9_1, accessed 2026-09-30.
- [G14] A2UI docs `docs/public/index.md` and `docs/public/concepts/overview.md` (stale `actionResponse` mentions); `docs/public/reference/messages.md`. https://github.com/a2ui-project/a2ui/tree/main/docs/public, accessed 2026-09-30.
- [G15] a2ui-project/a2ui issue #2104 "Proposal: Server-Side Functions and Unified Function RPC (Reframing ActionResponses)", opened 2026-07-27. https://github.com/a2ui-project/a2ui/issues/2104, accessed 2026-09-30.
- [G16] GHSA-72qq-p3r5-f7wq / CVE-2026-10032 "`openUrl` permits `javascript:` URI execution via agent-supplied button actions", A2UI repository advisory, published 2026-08-03. https://github.com/a2ui-project/a2ui/security/advisories/GHSA-72qq-p3r5-f7wq, accessed 2026-09-30.
- [G17] a2ui-project/a2ui issues #1410 (2026-05-12, open), #1469 (closed not_planned 2026-05-26), PR #1707 (2026-06-19), #1893, #2013, #2173 (2026-08-05), #2584, via GitHub API. https://github.com/a2ui-project/a2ui/issues, accessed 2026-09-30.
- [G18] a2ui-project/a2ui commit history for `specification/v0_8|v0_9|v0_9_1|v1_0|inference_formats` (GitHub API). https://github.com/a2ui-project/a2ui/commits/main/specification, accessed 2026-09-30.
- [G19] A2UI Express proposal: `specification/proposals/express/README.md`, `express_dsl_examples.md`, `specification/inference_formats/express/Express.g4`. https://github.com/a2ui-project/a2ui/tree/main/specification/proposals/express, accessed 2026-09-30.
- [G20] A2UI docs "Renderers (Client Libraries)", `docs/public/reference/renderers.md`. https://raw.githubusercontent.com/a2ui-project/a2ui/main/docs/public/reference/renderers.md, accessed 2026-09-30.
- [G21] "Agent-to-UI Renderer for Jetpack Compose (A2UI)", Android Developers. https://developer.android.com/develop/ui/compose/agentic, accessed 2026-09-30.
- [G22] "Introducing A2UI: An open project for agent-driven interfaces", Google Developers Blog, Google A2UI Team, 2025-12-15. https://developers.googleblog.com/en/introducing-a2ui-an-open-project-for-agent-driven-interfaces/, accessed 2026-09-30.
- [G23] "A2UI v0.9" post, Google Developers Blog, Google A2UI Team, 2026-04-17. https://developers.googleblog.com/en/a2ui-v0-9-generative-ui/, accessed 2026-09-30.
- [G24] "A2UI and MCP Apps", Google Developers Blog, Google A2UI Team + Ido Salomon + Liad Yosef, 2026-06-17. https://developers.googleblog.com/en/a2ui-and-mcp-apps/, accessed 2026-09-30.
- [G25] A2UI docs "What is A2UI?", `docs/public/introduction/what-is-a2ui.md`. https://raw.githubusercontent.com/a2ui-project/a2ui/main/docs/public/introduction/what-is-a2ui.md, accessed 2026-09-30.
- [G26] PyPI JSON API for a2ui-agent-sdk, a2ui-core, fastmcp, prefab-ui, ag2, ag-ui-protocol, mcp-ui-server; A2UI Releases page (a2ui-core 0.2.0 notes, 2026-09-28). https://pypi.org/ ; https://github.com/a2ui-project/a2ui/releases, queried 2026-09-30.
- [G27] Vercel AI SDK docs, `llms.txt` export: "Generative User Interfaces", "MCP Apps" (ai-sdk-core/mcp-apps), AI SDK RSC migration page, "Migrate AI SDK 6.x to 7.0", tool approvals. https://ai-sdk.dev/llms.txt, accessed 2026-09-30.
- [G28] OpenAI Plugins docs (`llms.txt`, `llms-full.txt`, "Add UI to your MCP server"); redirects from /apps-sdk. https://developers.openai.com/plugins/llms-full.txt, accessed 2026-09-30.
- [G29] OpenAI "Plugin Extensions" docs page and `openai/mcp-extensions` `docs/spec.md` (repo created 2026-09-29). https://developers.openai.com/plugins/build/extensions ; https://github.com/openai/mcp-extensions/blob/main/docs/spec.md, accessed 2026-09-30.
- [G30] "Interactive tools in Claude", Claude blog, 2026-01-26. https://claude.com/blog/interactive-tools-in-claude, accessed 2026-09-30.
- [G31] "Claude builds visuals", Claude blog, 2026-03-12 (updated 2026-04-22). https://claude.com/blog/claude-builds-visuals, accessed 2026-09-30.
- [G32] Leviathan, Valevski, Kalman, Lumen, Segalis, Molad, Pasternak, Natchu. "Generative UI: LLMs are Effective UI Generators", arXiv 2604.09577v1, 2026-02-24 (HTML version, tables 1–8). https://arxiv.org/html/2604.09577v1, accessed 2026-09-30.
- [G33] arXiv abstracts: EvoGenUI-Bench 2608.29387 (2026-08-29); Macaron-A2UI 2605.24830 (2026-05-24); "Hidden Technical Debt in Generative (GenUI) and Malleable User Interfaces" 2604.16354 (2026-03-17); "Generative UI as an Accessibility Bridge" 2604.25455 (2026-04-28, CHI 2026 workshop). https://export.arxiv.org/api/query?id_list=2608.29387,2605.24830,2604.16354,2604.25455, accessed 2026-09-30.
- [G34] vercel-labs/json-render README and json-render.dev "Streaming" docs; repo metadata (created 2026-01-14, Apache-2.0). https://github.com/vercel-labs/json-render ; https://json-render.dev/docs/streaming, accessed 2026-09-30.
- [G35] CopilotKit docs `llms-full.txt`: "A2UI", "Open Generative UI", Generative UI specs overview; redirect of `/learn/generative-ui/specs/open-json-ui`. https://docs.copilotkit.ai/llms-full.txt, accessed 2026-09-30.
- [G36] CopilotKit/generative-ui README. https://raw.githubusercontent.com/CopilotKit/generative-ui/main/README.md, accessed 2026-09-30.
- [G37] npm deprecation notice for `@copilotkitnext/react` 1.54.1 (2026-03-26). https://registry.npmjs.org/@copilotkitnext/react, accessed 2026-09-30.
- [G38] "OUI-1: world's first model for Generative UI", OpenUI blog, 2026-09-08. https://www.openui.com/blog/oui-1, accessed 2026-09-30.
- [G39] Thesys docs `llms.txt` (C1 archive notice) and "How C1 Works". https://docs.thesys.dev/llms.txt ; https://docs.thesys.dev/legacy/guides/how-c1-works.md, accessed 2026-09-30.
- [G40] FastMCP docs "Apps" (overview), "Architecture", "Generative UI". https://gofastmcp.com/apps/overview.md ; https://gofastmcp.com/apps/architecture.md ; https://gofastmcp.com/apps/generative.md, accessed 2026-09-30.
- [G41] MCP-UI README (repo now MCP-UI-Org/mcp-ui). https://github.com/MCP-UI-Org/mcp-ui, accessed 2026-09-30.
- [G42] modelcontextprotocol/ext-apps README ("Supported Clients"). https://github.com/modelcontextprotocol/ext-apps, accessed 2026-09-30.
- [G43] Hacker News via Algolia API (stories: Apps SDK 45494558; A2UI 46286407; MCP Apps 46020502; json-render 46746570; Tambo 46138473; OpenUI 48770133; OUI-1 49613182). https://hn.algolia.com/api/v1/search, queried 2026-09-30.
- [G44] GitHub REST API repo metadata (stars, created_at) for a2ui-project/a2ui, vercel-labs/json-render, CopilotKit/CopilotKit, ag-ui-protocol/ag-ui, tambo-ai/tambo, thesysdev/openui, MCP-UI-Org/mcp-ui, modelcontextprotocol/ext-apps, flutter/genui, CopilotKit/OpenGenerativeUI, openai/mcp-extensions. https://api.github.com/repos/, queried 2026-09-30.
- [G45] npm downloads API (point 2026-09-23:2026-09-29) and pypistats `recent`. https://api.npmjs.org/downloads/ ; https://pypistats.org/api/, queried 2026-09-30.
- [G46] ext-apps v1.7.5 release notes ("Sync object-src with default-src" #715; "Add missing HostCapabilities fields" #653), 2026-07-23. https://github.com/modelcontextprotocol/ext-apps/releases/tag/v1.7.5, accessed 2026-09-30.
