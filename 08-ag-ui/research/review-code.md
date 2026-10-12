# Рецензия кода, протокольных примеров и рисунков — глава 08 «AG-UI»

Дата проверки: 30 сентября 2026. Ревьюер код не правил, только проверял.

Метод: каждый Python-блок вытащен в файл и прогнан через `python3 -m py_compile`; `server.py`,
`client.py` и `hitl_server.py` (наброски, помеченные «проверен») дополнительно подняты и
исполнены целиком — реальный `ag-ui-protocol` 1.0.0 установлен в изолированном venv
(`python3 -m venv`, `pip install ag-ui-protocol==1.0.0` — версия и дата публикации на PyPI
совпали с тем, что называет глава), вместе с FastAPI 0.142.2 (тоже совпадает с версией, названной
в тексте) и `httpx`/`jsonpatch`. Сервер поднимался через `uvicorn`, клиент и `curl -N` гоняли
против него настоящие HTTP/SSE запросы. Имена классов, полей и типов сверены не по памяти и не по
заметкам, а прямым чтением установленного пакета (`model_fields`, `list(EventType)`,
`inspect.signature`) — это тот самый «живой источник», который просит инструкция. Также
установлен `pydantic-ai-slim[ag-ui]` 2.52.0 для проверки примера Pydantic AI. JSON-блоки
проверены `json.loads`. Рисунки — `tools/qa.mjs --shots`, каждый скриншот открыт и прочитан.

## Итог

`ISSUES none` от `qa.mjs`, все 15 рисунков отрендерились. Все 7 Python-блоков компилируются;
три полных наброска (`server.py`, `client.py`, `hitl_server.py`) были запущены целиком и дали
ровно тот вывод/трафик, что показан в тексте (с точностью до случайных UUID). Все 8 JSON/JSONL
примеров разбираются. Практически каждая проверяемая деталь — имена событий и их число (31),
имена и алиасы полей моделей (`thread_id`→`threadId` и т.д.), поведение `EventEncoder`, типизация
`STATE_DELTA.delta` как объектов операций, отсутствующие поля в `RunFinishedCancelledOutcome`,
структура `Interrupt`/`ResumeEntry`/`TokenUsage`, версии `pydantic-ai-slim`→`ag-ui-protocol<1` —
подтвердилась побайтово. Для главы с 22 блоками кода и 8 JSON-примерами это редкий результат:
единственная найденная проблема — рисунок, расходящийся с кодом на той же странице (см. ниже).

Есть отдельный файл `research/review-facts.md` от параллельной фактологической проверки (цитаты,
атрибуции, даты) с одной critical и одной major находкой — они не про код/JSON/рисунки и здесь не
дублируются.

---

## Находки

### 1. [MAJOR] Рис. 8.5 (`#fig-interrupt`) показывает `STATE_SNAPSHOT`, которого нет в примере кода прямо над ним

**Что не так.** Диаграмма прерывания использует тот же сценарий (удаление `delete_file`,
участники «Человек / Приложение (потребитель) / Агент (продюсер)»), что и `hitl_server.py`/трасса
SSE в этом же разделе, и рисует шаг:

```
P-->>A: TOOL_CALL_* delete_file
P-->>A: STATE_SNAPSHOT для продолжения
P-->>A: RUN_FINISHED, outcome interrupt
```

Но ни исполняемый `hitl_server.py` (строки `<глава>/index.html:479-525`), ни показанная тут же
трасса «Прогон 1: поток» (строки 431-437) не отправляют `StateSnapshotEvent` вообще. Я поднял
`hitl_server.py` через `uvicorn` и прогнал `curl -N` с телом первого запроса — реальный трафик:

```
data: {"type":"RUN_STARTED", ...}
data: {"type":"TOOL_CALL_START", ...}
data: {"type":"TOOL_CALL_ARGS", ...}
data: {"type":"TOOL_CALL_END", ...}
data: {"type":"RUN_FINISHED", ..., "outcome":{"type":"interrupt", ...}}
```

— без единого `STATE_SNAPSHOT`, ровно как в примере в тексте. Абзац сразу под кодом
(«Второе: во втором прогоне нет повторных `TOOL_CALL_START`... Аудиторский след получается из
трёх частей в двух прогонах») тоже говорит только о `messages`/`resume[].payload.editedArgs`, без
снапшота. Два абзаца спустя глава верно объясняет общее правило спецификации («агент обязан
отдать [нужное для продолжения] через `STATE_SNAPSHOT` или `MESSAGES_SNAPSHOT` до прерывающего
`RUN_FINISHED`», это MUST из `research/spec.md:166`), и в данном примере это правило выполняется
без отдельного снапшот-события — вся нужная для продолжения информация (аргумент `path`) уже
содержится в самом вызове инструмента, который клиент и так обязан собрать из `TOOL_CALL_START/
ARGS/END` по общему правилу сборки сообщений. Диаграмма же приписывает конкретно этому,
исполненному примеру шаг, которого он не делает.

**Как исправить.** Либо убрать строку `STATE_SNAPSHOT для продолжения` из mermaid-схемы (тогда
рисунок будет один в один соответствовать показанной трассе), либо, если хочется проиллюстрировать
общее MUST-правило, явно пометить это как отдельный, более общий случай — не тот же сценарий с
теми же именами участников и тем же файлом, — либо дописать `hitl_server.py` так, чтобы он
действительно отправлял `StateSnapshotEvent` перед прерывающим `RunFinishedEvent` (это была бы
более «правильная» демонстрация MUST-правила, но тогда придётся поменять и показанную трассу
«Прогон 1: поток», и подпись к рисунку 8.4 больше не будет противоречить коду).

**Доказательство.** `<глава>/index.html:431-437` (трасса «Прогон 1: поток»), `:479-525`
(`hitl_server.py`), `:532-552` (`#fig-interrupt`, строка 540: `P-->>A: STATE_SNAPSHOT для
продолжения`); реальный запуск — `uvicorn hitl_server:app` + `curl -N -X POST .../agent -d
'{"threadId":"t-1","runId":"r-1","messages":[]}'` дал трафик без `STATE_SNAPSHOT` (записан выше).

---

## Проверено и подтвердилось (без находок)

### Код (`py_compile` + исполнение)

- **`server.py`** (строки 210-247). Поднят на `uvicorn` + `ag-ui-protocol` 1.0.0 + FastAPI
  0.142.2, прогнан `client.py` против него. Вывод совпал с блоком «Вывод» (строки 287-291) слово
  в слово, кроме случайного UUID: `Hello, world` / `tool call ready: <uuid> {"color": "blue"}` /
  `finished: type='success' pending_tool_call_ids=[...] state: {'steps': ['thinking']}`.
- **`client.py`** (строки 250-284). Тот же прогон. Подтвердились обе технические сноски под
  блоком: без явного `Content-Type: application/json` `httpx` с `content=` не проставляет
  заголовок сам (проверено `httpx.Request('POST', ..., content='{}')` → заголовков `content-type`
  нет); `STATE_DELTA.delta` в 1.0.0 действительно список типизированных моделей
  (`ag_ui._generated.models.AddOperation` и т.п.), а не словарей — `op.model_dump(by_alias=True,
  exclude_none=True)` перед `jsonpatch.apply_patch` необходим и работает (воспроизведено на
  примере `STATE_DELTA` из раздела «Общее состояние», результат патча корректен).
- **`hitl_server.py`** (строки 479-525, `<details>`). Поднят на `uvicorn`, прогнаны оба запроса
  через `curl -N` — трафик обоих прогонов совпал с показанными трассами «Прогон 1: поток» и
  «Прогон 2: поток» с точностью до случайного `tc-...` (см. находку 1 про недостающий
  `STATE_SNAPSHOT` в диаграмме, не в самом коде).
- **`langgraph_snippet1.py` / `langgraph_snippet2.py`** (строки 578-580, 741-742) — однострочные
  наброски конфигурации, компилируются; имена параметров `emit_interrupt_outcome` и
  `subagent_visibility` не проверить без установки `ag-ui-langgraph` (в PyPI под другим
  окружением), но они last-mile-совпадают с `README`-цитатами в том же разделе и с
  `research/gaps.md` (строки 383-388, 710-711), где эти же имена подтверждены прямым чтением
  README интеграции.
- **`pydantic_ai_hitl.py`** (строки 584-608). Установлен `pydantic-ai-slim[ag-ui]` 2.52.0 — pip
  реально понизил `ag-ui-protocol` до 0.1.22, подтверждая заявленное в главе требование
  `ag-ui-protocol<1` (таблица интеграций, раздел «Версия 1.0», источник src-17). Модуль
  импортируется, `Agent(...)`, `agent.tool_plain(requires_approval=True)`,
  `AGUIAdapter.dispatch_request` — все имена и сигнатуры существуют в установленном пакете;
  `Agent` и `Starlette`-приложение с маршрутом собираются без ошибок (кроме отсутствия API-ключа
  провайдера, что ожидаемо и не относится к синтаксису/API).
- **Фрагмент метаданных** (`TextMessageEndEvent(...)`, строки 168-172) — не самостоятельный
  скрипт (нет импортов), синтаксически корректен; поле `metadata` подтверждено в
  `TextMessageEndEvent.model_fields`.

### JSON / JSONL

Все восемь примеров (`RUN_FINISHED` с `usage`, две строки tool-сообщений, `RunAgentInput`
второго прогона с `resume[]`, `STATE_DELTA` с `add`/`replace`, три строки атрибуции сабагента,
два `application/json` графика `fig-npm`/`fig-pypi`) — валидный JSON (`json.loads`). Строка
tool-сообщений и пример атрибуции сабагента дополнительно сверены с фактической сериализацией
`ToolMessage`/`SubagentStartedEvent` из `ag-ui-protocol` 1.0.0 — `ToolMessage` совпала посимвольно
(`{"id":"tm-1","role":"tool","content":"ok","toolCallId":"tc-1"}` и вторая строка с `error`);
пример сабагента семантически идентичен, отличие только в порядке ключей (JSON-объекты
неупорядочены по определению, и пример прямо подписан как цитата из поста CopilotKit, а не как
сериализация библиотеки — не находка).

### Имена и поля API (сверено прямым чтением установленного `ag-ui-protocol` 1.0.0)

- `EventType` — ровно 31 значение, разложение по восьми семействам (5/4/5/3/2/7/3/2) совпадает с
  таблицей в разделе «События» день в день.
- `RunAgentInput` — поля и обязательность (`thread_id`/`run_id`/`messages` обязательны, остальные
  нет) совпадают со строками таблицы «Что лежит в `RunAgentInput`»; `context: List[Context]` с
  `{description, value}` — совпадает.
- `RunFinishedSuccessOutcome{pending_tool_call_ids}` / `RunFinishedInterruptOutcome{interrupts}` /
  `RunFinishedCancelledOutcome{}` (только `type`, без `result`) — совпадает с абзацем «Схема 1.0
  описывает outcome как объединение трёх вариантов».
- `Interrupt{id, reason, message, tool_call_id, response_schema, expires_at, metadata,
  subagent_run_id}`, `reason` — открытая строка (не enum), что согласуется с утверждением про
  пространства имён расширений (`langgraph:...`, `mastra:...`).
- `ResumeEntry{interrupt_id, status, payload, metadata}`, `status: Literal['resolved',
  'cancelled']` — совпадает с использованием в `hitl_server.py`.
- `TokenUsage{provider, model, input_tokens, output_tokens, total_tokens, reasoning_tokens,
  cached_input_tokens, cache_write_input_tokens}` — совпадает с разделом «Счёт токенов»
  (кеш — часть входных, не добавка).
- `SubagentStartedEvent{subagent_run_id, name, description, parent_subagent_run_id,
  parent_tool_call_id, parent_message_id}` / `SubagentFinishedEvent{result, outcome}` с
  `SubagentFinishedSuccessOutcome`/`SubagentFinishedSuspendedOutcome` — совпадает с разделом
  «Сабагенты и параллельные ветки».
- `ag_ui.encoder.EventEncoder.__init__(self, accept=None)` — тело `pass`, `get_content_type()`
  всегда `"text/event-stream"`, `encode()` всегда SSE через `_encode_sse` — дословно подтверждает
  абзац про расхождение `quickstart` и `main`.
- `TypeAdapter(Event)` в чистом окружении с `ag-ui-protocol==1.0.0` (важно: не в окружении, куда
  до этого поставился `pydantic-ai-slim` — тот тянет за собой старый `ag-ui-protocol` 0.1.22 и
  тем самым подсовывает ещё живые классы `Thinking*`, что при первой попытке проверки дало
  ложное «нет ошибки» — артефакт тестового окружения, не главы) — бросает `ValidationError` и на
  `{"type":"META",...}`, и на `{"type":"THINKING_START"}`; в `ag_ui.core` версии 1.0.0 классов
  `Thinking*` нет вовсе. Оба утверждения главы (строка 299 и строка 856) подтвердились после
  переустановки в чистый venv.
- Незнакомое поле внутри известного события (`{"type":"RUN_STARTED",...,"mystery":42}`)
  действительно сохраняется в `model_extra`, а не отбрасывается — подтверждает предупреждение в
  `note warn` под примером клиента.
- `null` внутри `state` доезжает до JSON как `null` (`StateSnapshotEvent(snapshot={"a": None})` →
  `"a":null`), отсутствующее необязательное поле не появляется в выводе вовсе
  (`RunStartedEvent` без `protocol_version` → в JSON нет `protocolVersion`) — оба подтверждают
  абзац о «tolerant reader, strict writer» / «absent means absent».

### Рисунки (`tools/qa.mjs --shots`, `_qa/08-ag-ui-code/`)

`ISSUES none`, все 15 фигур (9 mermaid, 2 HTML, 2 рукописных SVG, 2 графика) отрендерились без
предупреждений (без `mermaid-scale`, без наложений текста, без переполнения за viewBox). Каждый
скриншот открыт и проверен на смысл:

- **Рис. 8.1** (`fig-first-run`) — участники и порядок сообщений совпадают с текстом раздела «Один
  POST и поток событий»: два прогона, во втором снова полная история.
- **Рис. 8.2** (`fig-pipeline`) — шесть стадий конвейера `@ag-ui/client` в том же порядке, что в
  тексте (совместимость → middleware → enforcement → раскрытие чанков → верификация → приложение).
- **Рис. 8.3** (`fig-run-end`) — все исходы `RUN_FINISHED` (success/+pendingToolCallIds/interrupt/
  cancelled) плюс `RUN_ERROR` и обрыв; совпадает с текстом и таблицей исходов.
- **Рис. 8.4** (`fig-tool-endings`) — три судьбы вызова инструмента (бэкенд/приложение/бэкенд с
  согласием) с правильными стрелками к `TOOL_CALL_RESULT`/`pendingToolCallIds`/`interrupt`.
- **Рис. 8.5** (`fig-interrupt`) — см. находку 1.
- **Рис. 8.6** (`fig-state`) — дельта, которая не применилась, и восстановление снапшотом; порядок
  событий и комментарии совпадают с текстом раздела «Общее состояние».
- **Рис. 8.7** (`fig-subagents`, рукописный SVG) — порядок событий на схеме (`TOOL_CALL_START` ×2
  → `SUBAGENT_STARTED` ×2 → контент → `STATE_DELTA` → `SUBAGENT_FINISHED` ×2 → `TOOL_CALL_RESULT`)
  совпадает с порядком, зашитым в исходнике SVG, без наложений текста на скриншоте.
- **Рис. 8.8** (`fig-framing`, SVG) — кадрирование SSE (`data:` + `\n\n`) и protobuf (`len=N` +
  N байт) нарисовано верно, отдельно отмечено, что part событий (`TOOL_CALL_RESULT`,
  `ACTIVITY_*`, `REASONING_*`) в protobuf нет — совпадает с текстом «HTTP + Protobuf».
- **Рис. 8.9** (`fig-compat`) — решение продюсера по версии клиента (мой major/неизвестный major/
  поля нет → без потерь можно молча, с потерями только с предупреждением) — совпадает с текстом о
  версионировании.
- **Рис. 8.10** (`fig-render`) — три статуса карточки инструмента (`inProgress`/`executing`/
  `complete`) и переходы по `TOOL_CALL_START`/`END`/`RESULT` — совпадает с таблицей CopilotKit v2.
- **Рис. 8.11** (`fig-a2ui`) — обмен `a2ui-middleware` ↔ агент ↔ интерфейс, `ACTIVITY_SNAPSHOT`
  building → replace, клик → `forwardedProps.a2uiAction` → синтетический вызов `log_a2ui_event` —
  совпадает построчно с текстом раздела «Как едет generative UI».
- **Рис. 8.12** (`fig-landscape`) — четыре протокола, тона узлов (`accent` для агента, `mute` для
  TS-слоя, `ok`/`violet` для инструментов/агентов) и пунктир для middleware-путей совпадают с
  mermaid-исходником и подписью.
- **Рис. 8.13** (`fig-wires`) — три колонки (AG-UI/Vercel/ChatKit) с одним и тем же сценарием;
  порядок событий в каждой колонке соответствует тексту сравнения протоколов.
- **Рис. 8.14** (`fig-npm`) — все 11 значений из JSON отрисованы, `@ag-ui/core`/`@ag-ui/client`
  выделены; соотношения из подписи (в 12 раз реже AI SDK, в 27 раз реже MCP SDK) арифметически
  верны: 100,5/8,2≈12,3; 220,0/8,2≈26,8.
- **Рис. 8.15** (`fig-pypi`) — пять мостов, `ag-ui-langgraph` выделен и действительно на первом
  месте с большим отрывом, соответствует подписи.

## Что не проверялось (вне мандата этой рецензии)

Таблица соответствий Claude Agent SDK ↔ AG-UI (строки 312-324, не код и не JSON, а описательная
таблица) и цитаты/атрибуции проверяет параллельный фактчек в `research/review-facts.md` (см. его
находки — misattributed quote в разделе «Протокол или продукт» и неточность про Bedrock
AgentCore); туда же превентивно проверено `review-facts.md` попутно (грепом) на предмет
пересечений с кодовой частью — пересечений с находкой 1 нет.
