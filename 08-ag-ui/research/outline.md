# Глава 08. AG-UI — план

Состояние на 2026-09-30. Опорные даты: черновик 1.0 — 2026-09-02, пакеты 1.0.0 — 2026-09-17,
заморозка — 2026-09-18, TS 1.0.1 — 2026-09-29, блог CopilotKit — 2026-09-30. Python `ag-ui-protocol` = 1.0.0.
31 тип событий в 8 семействах. Два стандартных биндинга (SSE обязателен, protobuf опционален).

Лид: агент на FastAPI, фронт на React, между ними SSE. Пока летит текст, всё просто; дальше
подтверждение удаления, план из шагов, вызов инструмента браузера — и у каждого фреймворка свой формат.
AG-UI — один `RunAgentInput` на вход и 31 тип событий на выход; 1.0 две недели от роду.

## Разделы (h2)

1. `wire` «Один POST и поток событий». Начало: сырой curl и SSE-трасса из спецификации. Главное:
   асимметрия (один запрос, сотни событий), поля `RunAgentInput`, `messages` — вся история (сервер
   ничего не помнит обязательно), run/thread, id непрозрачны, «absent means absent». Откуда протокол
   (внутренний клей CopilotKit, M×N → M+N), куда уходят MCP/A2A (ссылки на гл. 5, 7).
   Рис.: sequence первого прогона.
2. `events` «31 событие в восьми семействах». Начало: число 31 против 16 и 36 в чужих текстах.
   Таблица семейств. Грамматика START/CONTENT/END, CHUNK, запрет действовать до TOOL_CALL_END.
   Reasoning и зашифрованная подпись (маппинг Anthropic `signature_delta` → `REASONING_ENCRYPTED_VALUE`).
   Activity. RAW/CUSTOM и metadata как единственный канал расширения. Token usage (новое в 1.0).
   Рис.: конвейер обработки на клиенте (HTML pipeline).
3. `python` «Сервер и клиент на Python за вечер». Начало: код из заметок, проверенный на 1.0.0.
   Три грабли (Content-Type → 422, дельта из типизированных объектов, не-data строки). Python-SDK
   только продюсерский, `EventEncoder(accept=…)` ничего не выбирает. Эксперимент: TypeAdapter падает на
   незнакомом типе события. Claude Code `stream-json` как тот же поток, маппинг событий Anthropic →
   AG-UI из кода `ag-ui-claude-sdk` (таблица).
4. `ending` «Четыре способа закончить прогон». Начало: вопрос, чем cancelled отличается от обрыва.
   success / success+pendingToolCallIds / interrupt / cancelled, RUN_ERROR, truncated; поздний RUN_ERROR;
   `abortRun()` — обрыв; AgentCore 401/403/409 против RUN_ERROR при HTTP 200. Рис.: stateDiagram.
5. `frontend-tools` «Инструмент, на который агент не отвечает». Начало: правило MUST NOT answer.
   Следующий прогон несёт tool-сообщение (с `error` при отказе). Мост Claude Agent SDK: фронтовые тулы →
   MCP-сервер `ag_ui`, `mcp__ag_ui__*`, halt. `useFrontendTool`. Безопасность: FilterToolCallsMiddleware
   не граница. Рис.: flowchart трёх концовок вызова инструмента.
6. `interrupts` «Human-in-the-loop: прогон кончается, а не ждёт». Самый глубокий раздел. Начало:
   проверенная трасса двух прогонов (свой набросок, запущен). Interrupt, reason, responseSchema,
   editedArgs. Кто проверяет покрытие: концепт-страница против нормативной (спор, решение 09-14 после
   ревью Pydantic AI). Стейтлесс-продюсер конформен. Реальность интеграций: LangGraph по умолчанию
   несоответствует MUST и почему; Pydantic AI `requires_approval`; Mastra 1.1.5; ADK #2603 на репликах;
   1.0.1 и `connectAgent`. Рис.: sequence interrupt/resume.
7. `state` «Общее состояние без обратного канала». Начало: миф «двусторонняя синхронизация в реальном
   времени». Snapshot/delta, RFC 6902, провал патча → старое значение + ресинк. Клиент меняет состояние
   только через `state` следующего прогона. MESSAGES_SNAPSHOT all-or-nothing, MAF
   `emit_messages_snapshot`. Мост Claude: `ag_ui_update_state`. Безопасность: история и состояние
   идут через клиента, их можно подделать (цитата Pydantic AI), гл. 16. Рис.: sequence со сбоем патча.
8. `subagents` «Сабагенты и параллельные ветки». Начало: цитата с r/LangGraph «flat timeline stops
   scaling». subagentRunId, SUBAGENT_*, вызов ≠ определение, состояние общее. Старые клиенты падают →
   `subagent_visibility`. Параллельные ветки внутри одного агента не коррелируются. Аналог в Claude Code:
   `parent_tool_use_id`. Рис.: рукописный SVG перемешанного потока.
9. `transports` «SSE обязателен, protobuf по желанию, WebSocket — твоя забота». Начало: страница
   архитектуры в документации перечисляет WebSocket, спецификация — нет. Детали SSE, protobuf (Accept,
   wildcard допускает, 4 байта длины, дыры покрытия), Python только SSE. Нет возобновления, `resumable`
   зарезервирован, реконнект — платный в CopilotKit. Auth вне протокола, middleware не работает на
   `connectAgent`. Рис.: рукописный SVG кадров SSE и protobuf.
10. `versions` «1.0: заморозка, версии и прокладки совместимости». Начало: хронология черновик →
    заморозка (ol.timeline). protocolVersion, минорные/мажорные, lossless/lossy даунгрейд, TS-шимы до
    2027-09-17, в Python их нет. Отставание интеграций (таблица). Документация противоречит спецификации
    в пяти местах. Рис.: flowchart где живёт совместимость.
11. `ux` «Что видит пользователь: стриминг и generative UI поверх». Начало: статусы `useRenderTool`.
    Паттерны: текст по дельтам, превью аргументов, activity-план, reasoning, шаги, форма одобрения из
    responseSchema. A2UI через `@ag-ui/a2ui-middleware` (activity `a2ui-surface`, клики через
    forwardedProps), MCP Apps через `@ag-ui/mcp-apps-middleware` (держит RUN_FINISHED). Остальное — гл. 9.
    Рис.: stateDiagram отрисовки вызова; sequence A2UI.
12. `landscape` «MCP, A2A, AG-UI — и ещё ACP». Начало: Claude Code в Zed говорит не на AG-UI. Четыре
    протокола вокруг агента. Альтернативы: Vercel UI Message Stream, LangGraph `stream_events` +
    `useStream`, ChatKit, assistant-ui как UI-кит. Таблица + выбор. Рис.: flowchart ландшафта;
    HTML versus трёх проводов.
13. `maturity` «Кто этим пользуется и за что критикуют». Начало: 8,2 млн загрузок `@ag-ui/core` и
    оговорка про транзитивность. Графики npm и PyPI. HN-внимание. CopilotKit: GraphQL-история #291,
    платные части, $27M, критика lock-in. OpenAI Agents SDK всё ещё PR. Что бы сделал на месте читателя.

Затем: selfcheck (10 вопросов), checklist (12 пунктов), sources (~44).

## Рисунки (15)

1. fig-first-run — mermaid sequence (wire)
2. fig-pipeline — HTML pipeline wide (events)
3. fig-run-end — mermaid stateDiagram (ending)
4. fig-tool-endings — mermaid flowchart (frontend-tools)
5. fig-interrupt — mermaid sequence (interrupts)
6. fig-state — mermaid sequence (state)
7. fig-subagents — SVG (subagents)
8. fig-framing — SVG (transports)
9. fig-compat — mermaid flowchart (versions)
10. fig-render — mermaid stateDiagram (ux)
11. fig-a2ui — mermaid sequence (ux)
12. fig-landscape — mermaid flowchart (landscape)
13. fig-wires — HTML versus (landscape)
14. fig-npm — chart hbar (maturity)
15. fig-pypi — chart hbar (maturity)

## Что уходит в соседние главы

- Формат сообщений LLM API, цикл агента → гл. 1.
- MCP (серверы, MCP-инструменты) → гл. 5; A2A → гл. 7.
- A2UI, MCP Apps, Open-JSON-UI, каталоги компонентов → гл. 9.
- Промпт-инъекции, доверие к истории от клиента → гл. 16.
- Оркестрация сабагентов → гл. 13.

## Проверка плана

- Анкета: разделы не идут по схеме «что → зачем → как → плюсы/минусы». Есть раздел, открывающийся
  исправлением документации (transports), раздел со сбоем интеграции (interrupts: LangGraph), сравнение
  (landscape), проверка мифа (state).
- Первые предложения: у разделов разные входы (трасса, число, цитата, вопрос, код).
- Провал в середине: разделы 6–8 самые тяжёлые — в середину поставлен самый глубокий (interrupts) и
  неожиданный факт (LangGraph по умолчанию не соответствует 1.0).
