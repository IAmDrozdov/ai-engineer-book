# Фактчек главы 08 «AG-UI: протокол агент ↔ интерфейс»

Независимая проверка утверждений главы (`/Users/sato/pets/ai-engineer-book/08-ag-ui/index.html`)
против исследовательских заметок (`research/spec.md`, `research/practice.md`, `research/field.md`,
`research/gaps.md`) и живых первоисточников (GitHub API/raw, PyPI JSON, npm registry, docs.ag-ui.com,
AWS-документация). Дата проверки: 30 сентября 2026. Правки в главу не вносились — только чтение и
проверка.

Общий вывод: глава необычно тщательно сверена с `gaps.md` — почти все параметры, на которых
`gaps.md` поймал `spec.md`/`practice.md`/`field.md` (дата 1.0, число событий, Python-версия
1.0.0 vs 1.0.1, поведение `EventEncoder(accept=...)`, дефолт LangGraph `emit_interrupt_outcome`,
статус .NET, число прокладок в `DEPRECATIONS.md`, число релизных тегов), в тексте главы уже
исправлены и подтвердились при повторной проверке напрямую по GitHub API / PyPI / raw-файлам.
Ниже — то немногое, что не подтвердилось.

## Критично

### 1. Цитата в разделе «Протокол или продукт» приписана не тому автору

- **Цитата в главе**: блок `note field` после абзаца про issue #291 приписывает автору **xdave**
  (дата «28 октября 2025») слова: «CopilotKit seems to want to speak GraphQL with the backend, but
  the backend is REST/SSE. It's currently quite unclear what the GraphQL bit is…»
- **В чём ошибка**: эту фразу произнёс не xdave. По прямой выгрузке комментариев issue через
  GitHub API (`api.github.com/repos/ag-ui-protocol/ag-ui/issues/291/comments`), точный текст
  принадлежит пользователю **jagregory**, комментарий от **2025-09-30T01:36:31Z** (30 сентября
  2025, за месяц до указанной в главе даты): «I'm having the same difficulty, the Node guide
  doesn't help. I have a React UI and a Python backend... CopilotKit seems to want to speak GraphQL
  with the backend, but the backend is REST/SSE. It's currently quite […]». Настоящий комментарий
  xdave от 28 октября 2025 (2025-10-28T20:46:51Z) — о другом: «I also have many agents written in
  python backends that I thought were going to be easy to integrate with CopilotKit... The lack of
  a clean React-based component or just hooks library that speaks AG-UI is the only thing holding
  me back…» — ни одного слова про GraphQL/REST/SSE там нет.
- **Как правильно**: цитату про GraphQL/REST/SSE подписать «jagregory, GitHub issue #291,
  30 сентября 2025», либо привести подлинные слова xdave от 28 октября 2025 отдельной цитатой.
- **Источник ошибки**: она унаследована из `research/field.md` (строка 177), которая делает ту же
  подмену — то есть это не опечатка автора главы, а непроверенная ошибка в заметках, которая
  прошла в текст.
- **Доказательство**: `https://api.github.com/repos/ag-ui-protocol/ag-ui/issues/291/comments`
  (комментарий id соответствует jagregory, `created_at: 2025-09-30T01:36:31Z`); человекочитаемо —
  `https://github.com/ag-ui-protocol/ag-ui/issues/291`.

## Важно

### 2. Пример с Amazon Bedrock AgentCore не подтверждён источником, на который ссылается

- **Утверждение в главе** (раздел «Как прогон заканчивается», подраздел «Ошибки: в потоке и до
  него»): «Ошибки уровня соединения приходят настоящими HTTP-статусами 401, 403 и 409, а сбои
  агента во время работы приходят событием `RUN_ERROR` в потоке, который уже открылся с кодом 200».
  Цитируется как источник `src-24` (AWS Bedrock AgentCore Developer Guide, «AG-UI protocol
  contract»).
- **В чём ошибка**: цитируемая страница описывает не «HTTP-статус ИЛИ `RUN_ERROR`-событие», а
  «HTTP-статус И `RUN_ERROR`-событие» для обеих категорий. Дословно: «AG-UI serializes every error
  as an SSE `RUN_ERROR` event... **whether the error occurs before or during streaming**. The
  categories differ only in the HTTP status code that accompanies the event: Connection-level
  errors... the `RUN_ERROR` event is returned with the error's real HTTP status code (for example,
  401, 403, or 409). Runtime errors... returns HTTP 200». То есть 401/403/409-ошибки у Bedrock
  AgentCore — это тоже SSE-поток с телом `{"type":"RUN_ERROR",...}`, просто с другим HTTP-статусом
  у ответа, а не «просто HTTP-статус без потока», как читается в главе. Пример из документации:
  `HTTP/1.1 409 Conflict / Content-Type: text/event-stream / data: {"type":"RUN_ERROR",...}`.
  Формулировка главы, наоборот, использует Bedrock AgentCore как пример общего правила AG-UI
  («до `RUN_STARTED` — обычная ошибка транспорта без `RUN_ERROR`»), но именно в этом контракте
  такого разделения нет: `RUN_ERROR` есть всегда, различается только код.
- **Как правильно**: переформулировать — у AgentCore каждая ошибка (и до, и после начала потока)
  приходит SSE-событием `RUN_ERROR`, категории отличаются HTTP-статусом ответа (реальный код
  401/403/409/429/500 для ошибок уровня соединения, всегда 200 для `AGENT_ERROR` во время
  выполнения), а не наличием/отсутствием `RUN_ERROR`. Итоговый практический вывод главы
  («мониторинг по статусам ответа не увидит падения агента») по сути верен, но обоснование через
  «настоящие HTTP-статусы вместо RUN_ERROR» неточно и не соответствует цитируемому источнику.
- **Доказательство**:
  `https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-agui-protocol-contract.html`,
  раздел «Error handling».

## Без ссылки, которая нужна / ссылки, не подтверждающие утверждение

- Пункт 2 выше — частный случай именно этой категории: ссылка `src-24` приведена, но не
  подтверждает конкретную формулировку («настоящие HTTP-статусы» как альтернатива `RUN_ERROR`).
- Ссылка `src-6` (issue #291) в разделе «Протокол или продукт» подтверждает факт спора и общий ход
  треда, но не подтверждает конкретную атрибуцию цитаты из пункта 1 — сама ссылка корректна, неверна
  подпись под цитатой.

## Проверено и подтвердилось (для протокола, не находки)

Список утверждений, которые выглядели наиболее «нагруженными» или подозрительными и которые при
прямой проверке по первоисточникам (не по заметкам) оказались точными — привожу, чтобы показать
охват проверки:

- 31 тип события в схеме `schema.json` (проверено прямым чтением enum `EventType` — 31 значение,
  не 16, не 36, не 30). `RUN_FINISHED.outcome` — три варианта: success/interrupt/cancelled. Есть
  поле `usage`.
- `@ag-ui/core` (npm) на 1.0.1, `ag-ui-protocol` (PyPI) остаётся на 1.0.0 без 1.0.1 (проверено
  напрямую через `registry.npmjs.org` и `pypi.org/pypi/.../json`; Python 1.0.0 загружен
  2026-09-17T18:31:18Z).
- `ag_ui.encoder.EventEncoder.__init__(self, accept=None)` действительно игнорирует `accept`
  (тело — `pass`), `get_content_type()` всегда возвращает `"text/event-stream"` (проверено прямым
  чтением `sdks/python/ag_ui/encoder/encoder.py` на `main`).
- `DEPRECATIONS.md`: ровно **22** строки в таблице прокладок (пересчитано вручную по сырому файлу),
  все истекают 2027-09-17, релиз датирован 2026-09-17 — совпадает с текстом главы.
- Дефолт `ag-ui-langgraph`: `emit_interrupt_outcome=False`, интерпунктированные прерывания по
  умолчанию уходят обычным `RUN_FINISHED` + legacy `CustomEvent("on_interrupt")`, причина —
  совместимость с `useLangGraphInterrupt` CopilotKit v1.60.x (проверено чтением README интеграции
  на `main`).
- Число релизных тегов `release/YYYY-MM-DD` с 27 мая по 30 сентября 2026 — ровно **40** (пересчитано
  по `api.github.com/repos/ag-ui-protocol/ag-ui/releases`).
- Issue #291 действительно открыта 2025-08-11; issue #2603 (ADK, репликация) действительно открыта
  2026-09-02 с указанным заголовком; Discussion #2608 действительно открыта mme 2026-09-02, и именно
  mme 2026-09-14T14:08:53Z отвечает фразой «only the consumer is responsible for enforcing interrupt
  responses» — атрибуция и дата в главе точны.
- Мост Claude Agent SDK: имя MCP-сервера `ag_ui`, префикс инструментов `mcp__ag_ui__{name}`, тул
  `ag_ui_update_state`, и белый список `forwardedProps` содержит именно `model`, `max_turns`,
  `max_budget_usd` среди прочего — всё подтверждено прямым чтением `config.py`/`adapter.py`
  интеграции на `main`.
- MCP Apps (SEP-1865) действительно написан мейнтейнерами MCP из OpenAI и Anthropic совместно с
  авторами MCP-UI (Ido Salomon, Liad Yosef) — Microsoft и Shopify не значатся авторами (проверено
  чтением блога MCP).
- Цитата NathanTarbert «releasing a protocol wasn't planned, and it's been a work in progress to
  decouple it» — дословно совпадает с комментарием от 2025-10-27T21:23:28Z; подтверждение о снятии
  GraphQL-слоя 23 июня 2026 — дословно совпадает с комментарием tylerslaton.

## Итог

- **critical**: 1
- **major**: 1
- **minor**: 0
