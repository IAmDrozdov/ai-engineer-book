# AG-UI: Agent-User Interaction Protocol — field reports notes

Companion to `research/spec.md` (same directory), which covers the formal spec/mechanics in
more depth. This file is the practitioner-voice lens: what breaks, what people argue about,
what shipped in the last few months, quoted with links and dates. Cross-reference spec.md for
exhaustive event-field tables; this file repeats only what's needed for the field context.

## TL;DR (10-15 bullets: what an engineer must know today)

- AG-UI is CopilotKit's protocol, and that governance fact still shapes complaints: it started as CopilotKit's internal integration glue with LangChain/CrewAI, was open-sourced 2025-04-09, and only in 2026 finished decoupling from CopilotKit's own (now-removed) GraphQL runtime layer. A year-long GitHub issue thread (#291, opened 2025-08-11) tracked developers' confusion about "why does a REST/SSE protocol need a GraphQL proxy" until CopilotKit confirmed the GraphQL layer was gone in a comment dated 2026-06-23. [S10]
- **1.0 is brand new**: the spec, `@ag-ui/core` and `ag-ui-protocol` (PyPI) all went 1.0.0 on **2026-09-17**, with a `1.0.1` patch on **2026-09-29** — literally the day before this research. Before that there was no written behavioral spec at all; the TypeScript client's source code *was* the spec. [S1][S3][S4]
- Field sentiment on HN and GitHub keeps circling the same tension: AG-UI is praised as "the thing that actually works across LangGraph/Mastra/CrewAI/Claude Agent SDK", but CopilotKit-the-company is repeatedly called out for coupling the open protocol to paid/hosted pieces ("CopilotKit Intelligence", the Channels SDK's hosted service). One HN commenter: "Everyone's trying to do vendor lock in, it's really annoying." [S15]
- A real, still-live practitioner pain point: **AG-UI's event stream has no built-in parent/child correlation for parallel graph branches.** A LangGraph-sandbox tool builder on Reddit had to add manual grouping in v0.2.3 because "a flat timeline stops scaling," and even then: "with parallel branches the steps interleave and events aren't tagge[d]" with which node emitted what. [S12]
- **WebSocket is not a standard AG-UI transport** — despite marketing copy and several blog posts implying "SSE, WebSockets, and binary" are three peers. The spec names exactly two standard bindings (HTTP+SSE, HTTP+Protobuf); WebSocket is left as an unspecified "custom transport." A 2025-05-13 GitHub issue asking for WebSocket support was closed with "No dedicated WebSocket transport is planned." [S1][S9]
- **OpenBot** (launched 2026-08-19 by CopilotKit) is the most consequential recent proof-of-concept: an MIT, self-hosted "AI coworker" platform where *any* AG-UI agent (LangGraph, Mastra, CrewAI, Pydantic AI, ADK, or hand-rolled) gets a sandboxed browser/shell/MCP gateway with a CEL policy engine and full audit trail. It hit 5,107 GitHub stars in a month (5,755 as of 2026-09-30) — proof AG-UI is solid enough to build a governance layer on top of, not just a chat widget. [S13][S19]
- Frontend-defined tools and human-in-the-loop interrupts are **two different mechanisms** that field posts frequently conflate. Frontend tools resolve across a run boundary as an ordinary tool message in the next run; interrupts are a dedicated `RUN_FINISHED.outcome.type = "interrupt"` with a `resume[]` array that must address every open interrupt by id. Getting this distinction wrong is a common source of "why did my HITL flow silently continue" bug reports. [S1]
- Reasoning events (`REASONING_*`) fully replaced the deprecated `THINKING_*` family in 1.0, modeled explicitly on OpenAI's encrypted reasoning items (`store:false`/ZDR) and Gemini's "thought signatures" — this is a recent (post-mid-2026) addition that didn't exist in the original 2025 launch. [S1]
- Multimodal inputs and a `file`-handle content-part source (for bytes already uploaded to a model provider, e.g. an OpenAI/Anthropic file id) are new in 1.0 — before that, developers filed issues asking "how do I send images/attachments over AG-UI?" with no clean answer (#280, #126, both from mid-2025, both eventually closed once the media `ContentPart` types shipped). [S11]
- Adoption is broad but uneven in depth: **1st-party** framework integrations exist for Microsoft Agent Framework, Google ADK, AWS Strands, AWS Bedrock AgentCore, Mastra, Pydantic AI, Agno, LlamaIndex, and AG2; LangChain/LangGraph and CrewAI are "partnership" tier (the original launch partners); Claude Agent SDK, Claude Managed Agents SDK, Langroid are community-tier; OpenAI Agent SDK and Cloudflare Agents are still "in progress." [S1]
- `@ag-ui/core` pulled **8.2M npm downloads** in the 30 days ending 2026-09-28; `@copilotkit/react-core` pulled 1.8M in the same window — evidence of real transitive/CI-driven adoption, though download counts alone don't prove production usage. [S22]
- CopilotKit (the company) raised **$27M** to build what it calls the "Agentic FrontEnd Stack" (TechCrunch, 2026-05-05) — money is now flowing into this specific niche, which is part of why the protocol vs. product tension keeps surfacing in field discussions. [S8]
- OpenAI's **ChatKit** (launched 2025-10-06, Apache-licensed, 201 HN points / 47 comments) is the loudest recent competitor; HN's top comparison thread has assistant-ui's founder chiming in directly ("MIT and no proprietary cloud/proxy service") and a developer building a `react-ag-ui` client asking assistant-ui to collaborate — the ecosystem is small enough that competitors talk to each other in the same thread. [S15]
- Vercel AI SDK's "UI Message Stream" protocol (SSE-based, `x-vercel-ai-ui-message-stream: v1` header, start/delta/end parts per content type) is the most-cited direct technical alternative for teams already inside Next.js/Vercel — it solves a narrower problem (stream chat + tool calls into a UI) and doesn't attempt AG-UI's shared-state, interrupts, or subagent-attribution scope. [S16]
- The MCP/A2A/AG-UI "protocol triangle" is now the standard framing across the whole ecosystem (docs, blog posts, even competitors' pitches): MCP = agent↔tools, A2A = agent↔agent, AG-UI = agent↔user. AG-UI added "handshake" adapters in 2026 so an AG-UI client can front for an MCP- or A2A-native agent without the app needing to speak those protocols directly. [S1]

## Current state and versions (as of 2026-09-30)

| Component | Version | Released | Source |
|---|---|---|---|
| Protocol spec | 1.0 (`/spec/1.0`, BCP-14 normative) | 2026-09-17 | [S1] |
| `@ag-ui/core` (npm) | 1.0.1 | 2026-09-29 | [S3] |
| `ag-ui-protocol` (PyPI) | 1.0.0 | 2026-09-17 | [S4] |
| `ag-ui-protocol/ag-ui` GitHub repo | 16,131 stars, 1,464 forks, 420 open issues, ~166 contributors, daily "release/YYYY-MM-DD" cadence | pushed 2026-09-30 | [S2] |
| `CopilotKit/CopilotKit` GitHub repo | 37,616 stars, 4,674 forks | created 2023-06-19 | [S18] |
| `CopilotKit/OpenBot` GitHub repo | 5,755 stars, 764 forks | created 2026-08-17 | [S19] |
| First-party SDKs | TypeScript, Python, **.NET** (all three generated from the same JSON Schema as of 1.0) | 1.0 migration guide, 2026-09-17 | [S1] |
| Community SDKs | Kotlin, Go, Dart, Java, Rust, Ruby, C++ | ongoing | [S1] |

## Timeline (dated list of releases and changes)

- **2025-04-09** — AG-UI repositories made public; initial release. Born out of CopilotKit's internal LangChain/LangGraph and CrewAI integration work. [S1]
- **2025-05-13** — "Show HN: AG-UI Protocol" (36 pts, 5 comments); same-day GitHub issue #3 asks about WebSocket transport, closed with "no dedicated WebSocket transport is planned." [S6][S9]
- **2025-06-25 / 2025-08-08** — Multimodal-input GitHub issues (#126, #280) filed: "How to transport multimodal messages like images, files?" — no clean answer existed pre-1.0. [S11]
- **2025-08-11** — GitHub issue #291 ("Use agi-ui without next.js") opened; becomes the longest-running community pain thread about the CopilotKit GraphQL/Next.js coupling, running for ~10 months. [S10]
- **2025-09-29** — Anthropic Claude Agent SDK integration request merged (issue #439, 17 👍). [S11]
- **2025-10-06** — OpenAI ChatKit launches (Apache-licensed); HN thread (201 pts, 47 comments) becomes a direct AG-UI/CopilotKit comparison forum, with assistant-ui's founder participating. [S15]
- **2025-11-20** — "Microsoft Embraces AG-UI Protocol for Agent UI" (learn.microsoft.com), HN thread thin but present (7 pts). Microsoft Agent Framework becomes a 1st-party integration. [S1][S6]
- **~early 2026** — Google ADK and AWS Strands/Bedrock AgentCore ship 1st-party AG-UI support. [S1]
- **2026-05-05** — CopilotKit raises $27M (TechCrunch) to build the "Agentic FrontEnd Stack." [S8]
- **2026-06-23** — CopilotKit confirms in GitHub issue #291 that the GraphQL runtime layer has been removed: "you can use the TypeScript client SDK directly." Closes (informally) the year-long "why GraphQL" confusion. [S10]
- **2026-08-06** — CopilotKit launches the **Channels SDK** (Show HN, 121 pts, 24 comments): bring any AG-UI agent into Slack/MS Teams/WhatsApp, with a durable "ack-first" run loop for chat-platform approvals. CopilotKit's CEO and engineers actively answer HN comments same-day. [S5]
- **2026-08-19** — **OpenBot** launches: self-hosted, MIT, governed "AI coworker" platform built entirely on AG-UI. Trendshift #3 repo of the day; 3,500 stars by Sept 1; 5,107 by Sept 18; 5,755 by Sept 30. [S13][S19]
- **2026-08-27** — `@ag-ui/core` 0.0.59, last pre-1.0 release. [S3]
- **2026-09-16/17** — 1.0.0-canary then **1.0.0 GA** ships simultaneously for `@ag-ui/core` (npm) and `ag-ui-protocol` (PyPI) — first release with a normative behavioral spec, `RUN_FINISHED.outcome` (interrupt-aware lifecycle), subagent events, reasoning-replaces-thinking, activity events, and an HTTP+Protobuf binary binding. [S1][S3][S4]
- **2026-09-29** — `@ag-ui/core` and `ag-ui-protocol` both patch to 1.0.1. [S3][S4]
- **2026-09-30 (today)** — no new dated field discussion found beyond the above; daily repo release cadence continues (`release/2026-09-30` tag exists). [S2]

## Mechanics (field-relevant subset; see spec.md for the exhaustive reference)

**The protocol triangle.** AG-UI's own docs frame it explicitly: MCP connects an agent to tools/data, A2A connects agent to agent, AG-UI connects agent to the user-facing app — "the kitchen sink protocol… informed by bottom-up, real-world needs." A single agent commonly speaks all three at once, and AG-UI added "handshake" adapters so an AG-UI client can front for an MCP- or A2A-native backend without the frontend touching those protocols directly. [S1]

**RunAgentInput is the only client→agent message** — sent once per run as an HTTP POST. Everything else is agent→client events. `tools` (frontend-defined tools) and `context` are optional; absent and empty mean the same thing. A replayed/resumed thread's earlier runs are NOT re-sent input — only the newly-requested run gets a fresh `RunAgentInput`. [S1]

**Two standard transports, not three.** HTTP+SSE is mandatory for any HTTP AG-UI implementation (`Content-Type: text/event-stream`, one JSON event per `data:` line, LF line endings). HTTP+Protobuf is optional, negotiated via `Accept: application/vnd.ag-ui.event+proto`, 4-byte length-prefixed frames generated from the same schema, with cross-implementation byte-parity pinned by a shared test corpus. WebSocket and anything else is a "custom transport" that MUST still satisfy the binding contract (ordered delivery, one input then events, a distinguishable clean-vs-truncated end) but has no spec-defined framing. This directly contradicts looser marketing language ("SSE, WebSockets, binary protocol") that circulates in blog posts and even in one AG-UI concept page (`/concepts/architecture` lists WebSockets as a supported transport option) — the formal `/spec/1.0` page is the newer, authoritative source and the one that should be trusted. [S1]

**Human-in-the-loop = interrupt-aware run lifecycle**, and it is a *terminal* pattern, not an in-stream pause: the run ends with `RUN_FINISHED { outcome: { type: "interrupt", interrupts: [...] } }`, and the client starts a **new run** whose `RunAgentInput.resume[]` array must address every open interrupt by `id` with `status: "resolved" | "cancelled"`. A tool-bound interrupt (`reason: "tool_call"`) does NOT re-emit `ToolCallStart/Args/End` in the resumed run — only `ToolCallResult` against the original `toolCallId`, preserving a clean audit trail across the pause. [S1]

VERBATIM minimal tool-approval interrupt example [S1]:
```json
{
  "type": "RUN_FINISHED",
  "threadId": "thread-1",
  "runId": "run-1",
  "outcome": {
    "type": "interrupt",
    "interrupts": [
      {
        "id": "int-abc123",
        "reason": "tool_call",
        "message": "Send email to a@b.com with subject 'Hi'?",
        "toolCallId": "tc-001",
        "responseSchema": {
          "type": "object",
          "properties": { "approved": { "type": "boolean" } },
          "required": ["approved"]
        }
      }
    ]
  }
}
```

**Frontend-defined tools are a different mechanism** from interrupts — the field-report confusion between the two is common enough to call out explicitly. `RunAgentInput.tools` lists app-defined tools; the app (not the agent) executes them. When the agent calls one, the run simply finishes as a normal **success** outcome (never an interrupt outcome), optionally naming unanswered calls in `pendingToolCallIds`; the app's tool result arrives as an ordinary tool message in the *next* run. There is no dedicated "waiting for frontend tool" event — this is easy to get wrong when porting a LangGraph `interrupt()`-based HITL flow to AG-UI, because LangGraph's own interrupt primitive maps to AG-UI's interrupt outcome, while a plain frontend tool call does not. [S1]

**A minimal Python server (FastAPI + SSE)**, VERBATIM from the official quickstart [S1]:
```python
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from ag_ui.core import (
    RunAgentInput, EventType, RunStartedEvent, RunFinishedEvent,
    TextMessageStartEvent, TextMessageContentEvent, TextMessageEndEvent
)
from ag_ui.encoder import EventEncoder
import uuid, os
from openai import OpenAI

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

        openai_messages = [{"role": m.role, "content": m.content or ""}
                            for m in input_data.messages if m.role in ["user","system","assistant"]]
        stream = client.chat.completions.create(model="gpt-4o", stream=True, messages=openai_messages)
        message_id = str(uuid.uuid4())
        yield encoder.encode(TextMessageStartEvent(
            type=EventType.TEXT_MESSAGE_START, message_id=message_id, role="assistant"))
        for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield encoder.encode(TextMessageContentEvent(
                    type=EventType.TEXT_MESSAGE_CONTENT, message_id=message_id,
                    delta=chunk.choices[0].delta.content))
        yield encoder.encode(TextMessageEndEvent(type=EventType.TEXT_MESSAGE_END, message_id=message_id))
        yield encoder.encode(RunFinishedEvent(type=EventType.RUN_FINISHED,
            thread_id=input_data.thread_id, run_id=input_data.run_id))

    return StreamingResponse(event_generator(), media_type=encoder.get_content_type())
```
The corresponding minimal HTTP+SSE wire trace, VERBATIM [S1]:
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

**Shared state** is a two-tier snapshot/delta model (`STATE_SNAPSHOT` full replace, `STATE_DELTA` RFC 6902 JSON Patch), reused verbatim for `MESSAGES_SNAPSHOT` and, new in 1.0, for `ACTIVITY_SNAPSHOT`/`ACTIVITY_DELTA` (structured progress like "PLAN"/"SEARCH" as JSON, patched incrementally). CopilotKit's React `useCoAgent()` hook is the most-used consumer of this pattern in the wild: `const { state, setState } = useCoAgent({ name: "agent", initialState: {...} })`. [S1]

**Generative UI rides on top, it isn't part of the core event model.** AG-UI explicitly separates "how state/events stream" (its own job) from "what a UI widget looks like" (A2UI, MCP-UI/MCP Apps, Open-JSON-UI — all treated as pluggable generative-UI specs AG-UI can carry). This is also where the AG-UI docs proactively address the "A2UI vs AG-UI" naming confusion: "AG-UI is the Agent↔User Interaction protocol… A2UI is a generative UI specification… They work well together." Chapter 9 (A2UI и Generative UI) covers the widget side; this chapter is the transport underneath it. [S1]

**Interrupt outcome vs. plain RUN_ERROR vs. RUN_FINISHED with no outcome** — the compatibility story is more delicate than it looks. `outcome` is optional specifically so a pre-1.0 producer (never having heard of interrupts) still validates against the 1.0 schema; a 1.0 client reading an omitted `outcome` treats it as ordinary success. This backward-compat design is why LangGraph's AG-UI integration ships `emitInterruptOutcome` as an **opt-in, default-off** flag — turning it on breaks legacy clients that were resuming via the older `CustomEvent(name="on_interrupt")` / `command.resume` mechanism, so LangGraph keeps both paths alive simultaneously via `enableLegacyOnInterruptEvent`. [S1]

## Numbers (measurements with conditions and source)

- **16,131 GitHub stars**, 1,464 forks, 420 open issues, repo created 2025-05-07, on `ag-ui-protocol/ag-ui` — measured via GitHub API, 2026-09-30. [S2]
- **~166 contributors** to `ag-ui-protocol/ag-ui` (from the `contributors` API pagination header), 2026-09-30. [S2]
- **37,616 GitHub stars** on `CopilotKit/CopilotKit` (the reference client, created 2023-06-19), 2026-09-30. [S18]
- **8,222,341 npm downloads** of `@ag-ui/core` in the 30 days ending 2026-09-28 (npm download-counts API). `@copilotkit/react-core` pulled **1,804,534** in the same window — note these figures include CI/transitive installs and are not a proxy for distinct production deployments. [S22]
- **OpenBot**: 5,107 stars one month after its 2026-08-19 launch (per a 2026-09-18 review); **5,755 stars / 764 forks** as independently measured via GitHub API 2026-09-30 — i.e. growth continued but slowed after the initial launch spike (Trendshift #3 "repo of the day," 3,500 stars by 2026-09-01). [S13][S19]
- OpenAI ChatKit's Show HN: **201 points, 47 comments** (2025-10-06); the CopilotKit Channels SDK Show HN: **121 points, 24 comments** (2026-08-06); the original AG-UI Show HN: **36 points, 5 comments** (2025-05-13) — a rough proxy for relative HN attention across the ecosystem's biggest launches, though HN score is noisy and time-of-day/day-of-week dependent. [S15][S5][S6]
- `ag-ui-protocol` PyPI package: 0.1.20 (2026-08-14) → 0.1.21 (2026-08-27) → 0.1.22 (2026-08-31) → 1.0.0 (2026-09-17) → 1.0.1 (2026-09-29) — five releases in 46 days spanning the 1.0 cutover. [S4]

## Pitfalls, limits, criticism

- **Protocol-vs-product confusion is the single most recurring complaint.** Multiple independent GitHub issues and HN threads over more than a year (2025-08 through 2026-06) trace back to the same root cause: CopilotKit's own client historically required its (now-removed) GraphQL "Runtime" as a Next.js-hosted proxy, so anyone trying to point a plain FastAPI/Python backend at a plain React SPA (no Next.js, no CopilotKit Runtime) hit a wall and mistook it for an AG-UI limitation rather than a CopilotKit-the-product one. Verbatim, from the thread: *"CopilotKit seems to want to speak GraphQL with the backend, but the backend is REST/SSE. It's currently quite unclear what the GraphQL bit is... The lack of a clean React-based component or just hooks library that speaks AG-UI is the only thing holding me back from realizing the AG-UI protocol's true potential."* (xdave, 2025-10-28). CopilotKit's own DevRel acknowledged the root cause directly: *"AG-UI was an internal tool for CopilotKit to add agent framework integrations using a standard, so releasing a protocol wasn't planned, and it's been a work in progress to decouple it."* (NathanTarbert, 2025-10-27). The GraphQL layer was finally confirmed removed 2026-06-23 — an eleven-month resolution arc for what looked like a one-line bug report. [S10]
- **No built-in event correlation for parallel/nested execution.** A LangGraph-sandbox builder shipping an AG-UI event inspector had to bolt on manual grouping because the raw stream doesn't hierarchically tag which node/branch emitted which event when branches run concurrently: *"AG-UI actually gives us most of what's needed: STEP_STARTED/FINISHED carry the node name and tool calls carry a parentMessageId... One honest caveat: with parallel branches the steps interleave and events aren't tagge[d]"* with a correlation id. A second commenter on the same thread wanted the same thing for a competing tool: *"The inspector having per-event timeline is good; the thing I'd want is correlation: parent-child links showing which node emitted each tool call/state delta."* Subagent events (`SUBAGENT_STARTED/FINISHED/ERROR`, new in 1.0) partially address this for explicit sub-agent delegation, but ordinary parallel graph branches within one agent are still not automatically correlated. [S12]
- **WebSocket confusion persists in the wild** despite the spec being unambiguous about only SSE + Protobuf as standard bindings — several blog posts and even one AG-UI concept doc still list WebSockets as a peer transport, and a 2025-05-13 issue asking "trying to find websockets transport for ag-ui... I also couldn't find the exact spec of the protocol from the website" got closed with "no dedicated WebSocket transport is planned," predating the formal spec's clarity by over a year. [S9][S1]
- **Vendor lock-in skepticism is a live HN talking point**, directed as much at CopilotKit-the-company as at the protocol: *"even with AG-UI, CopilotKit is a paid service. Everyone's trying to do vendor lock in, it's really annoying. They make the dev experience worse and you have to pay for it? It's like every langcrap service out there"* (peab, on the ChatKit HN thread, 2025-10-06). A competing open-source maintainer's rebuttal in the same thread: assistant-ui's founder pointed out his own project is *"MIT and no proprietary cloud/proxy service."* The Channels SDK launch drew the same critique from a different commenter: *"I dont think it['s] really open source, the MIT part is just the client. The service that actually makes it run is closed and license-gated"* — CopilotKit's engineer conceded this is *"just a maturity problem on our end right now."* [S15][S5]
- **OpenBot is explicitly alpha and not a dependency you pin**: five releases in nine days is, in the reviewer's words, *"great velocity and poor stability."* It has no npm package (clone-and-fork only), requires CopilotKit Intelligence (a hosted or self-hosted service) to start at all, has no local-model story tested out of the box, and spins up one full Chromium container per agent ("Bot") — resource cost that "adds up fast on a laptop." The reviewer found *"no Hacker News thread with meaningful discussion and no independent benchmark of task completion"* as of 2026-09-18, i.e. reception is enthusiastic in passing mentions but thin on rigorous field validation so far. [S13]
- **Interrupt-aware lifecycle is new enough (2026-09-17) that framework support is uneven.** Per the spec's own framework-integration table, only LangGraph and AWS Strands are confirmed to forward native interrupts through `RunFinishedEvent.outcome` as of 1.0 GA — and LangGraph's support ships opt-in-only (`emitInterruptOutcome`, default off) specifically because turning it on breaks older clients still resuming via the pre-1.0 `command.resume`/`CustomEvent("on_interrupt")` mechanism. Anyone building HITL against a different framework integration should verify interrupt support exists before assuming the spec's existence implies universal support. [S1]
- **Multimodal support (images/files/audio/video as first-class content parts) is only months old**, having shipped as part of 1.0. Two GitHub issues asking "how do I send images/attachments over AG-UI?" sat open for months in 2025 with no clean answer — anyone who built a workaround (base64-in-string, custom events) before 1.0 now has migration work to do to move onto the real `ContentPart` types. [S11][S1]
- **"What's New" changelog page is stale** — `docs.ag-ui.com/development/updates` shows only the single 2025-04-09 entry and nothing since; the *actual* source of change history is the GitHub repo's daily `release/YYYY-MM-DD` tags plus the dedicated `/spec/1.0/changelog` and `/migrating-to-1-0` pages. A reader relying on the docs site's own "updates" page would conclude nothing happened in 17 months, which is the opposite of true. [S1] (Unverified whether this is a known/tracked documentation debt — no GitHub issue found referencing it specifically.)

## What changed in the last 6 months

- **1.0 GA (2026-09-17), the single biggest event**: a normative BCP-14 spec replacing "behavior lives in the TS client source," a JSON Schema as the structural source of truth for all SDKs, `RUN_FINISHED.outcome` (interrupt-aware and, per the changelog, an unlisted-in-docs "cancelled" outcome too), subagent attribution events, reasoning fully replacing thinking, activity events, an HTTP+Protobuf binary binding with cross-implementation byte-parity guarantees, and in-band `protocolVersion` negotiation. A `1.0.1` patch followed 12 days later (2026-09-29). [S1][S3][S4]
- **CopilotKit's $27M raise** (2026-05-05) to build the "Agentic FrontEnd Stack" — the clearest signal that investment is now targeting this specific layer of the stack, not just the protocol as a community project. [S8]
- **GraphQL runtime removal confirmed** (2026-06-23) — resolving an 11-month-old, heavily-upvoted community confusion thread about why a "transport-agnostic" protocol needed a GraphQL proxy in the middle. [S10]
- **Channels SDK launch** (2026-08-06) — extends AG-UI's reach beyond web/chat UIs into Slack/MS Teams/WhatsApp, with a durable ack-first approval pattern designed to survive process restarts mid-approval. [S5]
- **OpenBot launch** (2026-08-19) and rapid growth to 5,700+ stars — the most concrete evidence yet that AG-UI is mature enough to be a governance/infrastructure substrate (policy engine + audit log + per-agent sandboxed browser), not just a chat-streaming format. [S13][S19]
- **.NET became a full first-party SDK** with ~60 hand-written classes replaced by schema-generated models as part of the 1.0 cutover — the .NET SDK previously lagged TypeScript/Python in spec fidelity and now shares the same generated-from-schema pipeline. [S1]
- **Multimodal content parts (`ContentPart`: text/image/audio/video/document) and the `file` provider-handle source** shipped with 1.0, closing a roughly year-old gap that had generated multiple "how do I send an image" GitHub issues. [S11][S1]

## Diagram candidates

1. **The interrupt-aware run lifecycle** — actors: Agent, Client App. Arrows: `RunStarted` → (ToolCall*/TextMessage*/StateSnapshot) → `RunFinished{outcome:interrupt}` → [user decides] → new `RunAgentInput{resume:[...]}` → `RunStarted(run-2)` → `ToolCallResult` → `RunFinished{outcome:success}`. States: running / awaiting-human / resumed / done.
2. **Frontend tool call vs. interrupt, side by side** — two parallel swimlanes showing the same `ToolCallStart→Args→End` prefix diverging: one path ends the run as `success` with `pendingToolCallIds`, resolves in the *next* run's message list; the other path ends the run as `interrupt`, resolves via `resume[]`. Good for killing the most common field confusion.
3. **Transport decision tree** — "Do you need binary/compact wire?" → HTTP+Protobuf (opt-in via Accept header) vs. HTTP+SSE (default, mandatory). Side branch: "want WebSocket?" → custom transport, you own the framing.
4. **State sync: snapshot vs. delta** — timeline showing STATE_SNAPSHOT (full) at t0, then a run of STATE_DELTA (RFC 6902 ops) arrows, then another full STATE_SNAPSHOT as a resync point after a detected inconsistency.
5. **The protocol triangle** — MCP / A2A / AG-UI as three vertices around an "Agent" node, each edge labeled with what it connects (tools/data, other agents, user-facing app), with a dotted "handshake adapter" edge from AG-UI to each of the other two.
6. **CopilotKit / AG-UI org chart over time** — a small timeline diagram: internal tool (pre-2025-04) → open-sourced with GraphQL proxy dependency (2025-04 to 2026-06) → GraphQL removed, "pure" protocol usable standalone (2026-06 onward).
7. **OpenBot's gateway architecture** — Server (Hono) ↔ Bot (AG-UI agent) ↔ Gateway (policy check + audit row) ↔ Computer (sandboxed Chromium/shell container), with the "resolves target from server-held page snapshot" detail as an annotation (the Bot can't invent an element reference).
8. **Ecosystem map by integration tier** — three concentric rings: 1st-party (MS Agent Framework, Google ADK, AWS Strands/AgentCore, Mastra, Pydantic AI, Agno, LlamaIndex, AG2), partnership (LangChain/LangGraph, CrewAI), community (Claude Agent SDK, Langroid, Vercel AI SDK bridge — in progress).

## Chart candidates (real data series with values and source)

- **npm downloads, `@ag-ui/core` vs `@copilotkit/react-core`**, last 30 days (2026-08-30 to 2026-09-28): 8,222,341 vs 1,804,534. Source: npmjs.org downloads API, queried 2026-09-30. [S22] (Single snapshot only — a real chart would need repeated pulls over time to show a trend; this is a bar, not a line, from what was gathered here.)
- **GitHub star growth of OpenBot**: launch day (2026-08-19, ~0) → 3,500 (2026-09-01) → 5,107 (2026-09-18) → 5,755 (2026-09-30). Four data points, source: dev.to review [S13] cross-checked against live GitHub API [S19] — good candidate for a simple growth-curve chart showing launch-spike-then-plateau shape.
- **PyPI release cadence for `ag-ui-protocol`**, Aug–Sep 2026: 0.1.20 (08-14) → 0.1.21 (08-27) → 0.1.22 (08-31) → 1.0.0 (09-17) → 1.0.1 (09-29). Source: PyPI JSON API. [S4] Good for a release-cadence/version-bump timeline chart illustrating the 1.0 cutover tempo.

## Glossary

- **AG-UI**: Agent-User Interaction Protocol — an event-based standard for streaming an agent's run (text, tool calls, state, reasoning) into a user-facing frontend and carrying input back.
- **RunAgentInput**: the single JSON request object a client POSTs to start (or resume) a run; contains `threadId`, `runId`, `messages`, optional `tools`, `context`, `state`, `resume`.
- **Interrupt (AG-UI)**: a structured pause in the run lifecycle (`RUN_FINISHED.outcome.type = "interrupt"`) requiring a human/out-of-band decision before a new run can continue.
- **Frontend-defined tool**: a tool declared by the client app (not the agent backend) in `RunAgentInput.tools`, executed by the app, resolved across a run boundary as an ordinary tool message.
- **Subagent (AG-UI)**: a delegated child agent invocation, attributed via `subagentRunId` and optionally bracketed by `SUBAGENT_STARTED/FINISHED/ERROR` events, new in 1.0.
- **Activity event**: `ACTIVITY_SNAPSHOT`/`ACTIVITY_DELTA` — structured, JSON-Patch-updatable progress messages (e.g. "PLAN", "SEARCH") that never travel back to the model, new in 1.0.
- **Reasoning event**: `REASONING_*` family replacing the deprecated `THINKING_*` events; supports both visible chain-of-thought summaries and opaque `encryptedValue` blobs for ZDR/`store:false` compliance.
- **CopilotKit**: the company/framework that created AG-UI, provides the reference React client, `useCoAgent`/`useCopilotAction` hooks, and (formerly) a GraphQL "Runtime" proxy now removed from the required path.
- **OpenBot**: CopilotKit's MIT, self-hosted "governed AI coworker" reference platform built entirely on AG-UI, launched 2026-08-19.
- **Channels SDK**: CopilotKit's SDK for bringing any AG-UI agent into chat platforms (Slack, MS Teams, WhatsApp) as a native-feeling participant.
- **Dojo**: `dojo.ag-ui.com` — the official demo gallery showing each framework integration's feature coverage (shared state, tool-based generative UI, etc.) with code + docs.
- **A2UI**: Google's generative-UI specification (declarative JSON UI trees) — a different, complementary protocol to AG-UI, frequently confused with it by name alone (covered in Chapter 9).

## Unverified / open questions

- Could not confirm whether the AG-UI docs' own stale "What's New" page is a tracked/known documentation gap (no specific GitHub issue found referencing it) — flagged as a pitfall above but not independently corroborated by a maintainer comment.
- Reddit search via the standard `reddit.com/search.json` and `old.reddit.com` endpoints returned bot-block pages (HTML challenge, not JSON) from this environment; WebFetch also refused `www.reddit.com` outright ("Claude Code is unable to fetch from www.reddit.com"). Substituted the third-party PullPush.io mirror API, which worked for keyword search but is rate-limited (hit "Rate limit exceeded" mid-session) and does not guarantee full coverage of r/LangChain, r/AI_Agents, r/mcp, r/ClaudeAI specifically for AG-UI — the one solid hit found (r/LangGraph sandbox-tool thread) came through this path; a dedicated, unthrottled pass might surface more.
- Habr.com search (both the site's search UI and third-party search engines proxying `site:habr.com`) returned no usable results for "AG-UI" through curl/WebFetch in this session — tried habr.com's own search page (empty static HTML, JS-rendered), a DuckDuckGo HTML query (redirected to homepage, likely bot-blocked), and a Bing query (returned unrelated Polish-language results, likely mis-localized). Could not confirm whether Russian-language coverage of AG-UI exists on Habr; flagged rather than assumed empty.
- `t.me/s/fastnewsdev` (the checklist source channel) showed no AG-UI/CopilotKit mentions in its latest ~18 visible posts (the public web preview only exposes recent messages, no easy pagination via plain curl) — could not rule out an older post further back in the channel's history.
- The Vercel AI SDK "Vercel AI Elements" / generative-UI comparison and the OpenAI Apps SDK (as distinct from ChatKit) were not directly investigated in this pass — noted in scope but out of the word budget for this session; both are candidates for a follow-up read if the chapter needs deeper competitive analysis.
- Did not independently verify the claim (from a single dev.to blog, unread beyond title) titled "OpenAI ChatKit Review: Technical Deep Dive and Why We Didn't Adopt It" (quickchat.ai, 2025-11-04) — flagged as a lead for a "why not X" competitive angle but its content is not reflected in these notes since it wasn't opened.

## Sources

- [S1] AG-UI official documentation (full corpus incl. concepts/*, spec/1.0/*, sdk/*, quickstart/*, migrating-to-1-0), publisher: ag-ui-protocol / CopilotKit, docs.ag-ui.com, continuously updated, fetched via `docs.ag-ui.com/llms-full.txt`, accessed 2026-09-30.
- [S2] `ag-ui-protocol/ag-ui` GitHub repository metadata, GitHub API (api.github.com/repos/ag-ui-protocol/ag-ui and /releases, /issues, /contributors), accessed 2026-09-30.
- [S3] `@ag-ui/core` npm package version history, registry.npmjs.org, accessed 2026-09-30.
- [S4] `ag-ui-protocol` PyPI package version history, pypi.org/pypi/ag-ui-protocol/json, accessed 2026-09-30.
- [S5] "Show HN: The Channels SDK – Bring Any Agent to Any Channel (Slack, MS Teams)," Hacker News, 2026-08-06, 121 pts / 24 comments, https://news.ycombinator.com/item?id=49198583, accessed 2026-09-30.
- [S6] "Microsoft Embraces AG-UI Protocol for Agent UI," Hacker News, 2025-11-20, 7 pts, https://news.ycombinator.com/item?id=45994035; "Show HN: AG-UI Protocol," Hacker News, 2025-05-13, 36 pts, https://news.ycombinator.com/item?id=43974484; accessed 2026-09-30.
- [S8] "CopilotKit raises $27M to build the Agentic FrontEnd Stack," TechCrunch via Hacker News, 2026-05-05, https://news.ycombinator.com/item?id=48037265 (linking https://techcrunch.com/2026/05/05/copilotkit-raises-27m-to-help-devs-deploy-app-native-ai-agents/), accessed 2026-09-30.
- [S9] GitHub issue ag-ui-protocol/ag-ui#3, "trying to find websockets transport for ag-ui," opened 2025-05-13, closed, https://github.com/ag-ui-protocol/ag-ui/issues/3, accessed 2026-09-30.
- [S10] GitHub issue ag-ui-protocol/ag-ui#291, "Use agi-ui without next.js," opened 2025-08-11, https://github.com/ag-ui-protocol/ag-ui/issues/291, accessed 2026-09-30.
- [S11] GitHub issue search (reactions-sorted), ag-ui-protocol/ag-ui, api.github.com/search/issues, accessed 2026-09-30 (covering issues #510, #439, #933, #902, #952, #1397, #220, #291, #5, #280, #126, #379, #3, #2205, #2029).
- [S12] Reddit r/LangGraph, "I built a local sandbox to chat with your LangGraph agent over AG-UI / A2A, with a full event inspector," 2026-09-27, retrieved via PullPush.io mirror (api.pullpush.io), original https://reddit.com/r/LangGraph/comments/1wrntdu/, accessed 2026-09-30.
- [S13] "OpenBot Review: CopilotKit's Governed AI Coworkers," andrew-ooo (andrew.ooo), dev.to, published 2026-09-18, https://dev.to/andrew-ooo/openbot-review-copilotkits-governed-ai-coworkers-3505, accessed 2026-09-30.
- [S14] "AG-UI: When Your Agent Stops Hiding in the Chat Box — The 2026 Evolution of the Human-Agent Layer," weiwuji, dev.to, published 2026-08-06, https://dev.to/weiwuji/ag-ui-when-your-agent-stops-hiding-in-the-chat-box-the-2026-evolution-of-the-human-agent-layer-562n, accessed 2026-09-30.
- [S15] "OpenAI ChatKit," Hacker News, 2025-10-06, 201 pts / 47 comments, https://news.ycombinator.com/item?id=45493718, accessed 2026-09-30.
- [S16] Vercel AI SDK documentation ("Data Stream Protocol" / "UI Message Stream"), Vercel, ai-sdk.dev, fetched via ai-sdk.dev/llms.txt, accessed 2026-09-30.
- [S17] assistant-ui GitHub repository README, assistant-ui/assistant-ui, https://github.com/assistant-ui/assistant-ui, accessed 2026-09-30.
- [S18] `CopilotKit/CopilotKit` GitHub repository metadata, GitHub API, accessed 2026-09-30.
- [S19] `CopilotKit/OpenBot` GitHub repository metadata, GitHub API, accessed 2026-09-30.
- [S22] npm download-counts API (api.npmjs.org/downloads/point/last-month/), for `@ag-ui/core` and `@copilotkit/react-core`, accessed 2026-09-30.
