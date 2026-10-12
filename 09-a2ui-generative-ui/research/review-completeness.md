# Глава 09 «A2UI и Generative UI»: рецензия на полноту

Рецензент: критик полноты. Дата проверки: 30 сентября 2026. Главу я не правил.

Материалы: `index.html` (весь текст, все 29 блоков кода и 4 графика), `research/{gaps,spec,practice,field,outline}.md`.
Спорные места я сверил с первоисточниками:
- схемы A2UI v1.0 и v0.9.1 из `a2ui-project/a2ui@main`;
- `specification/v0_9_1/docs/a2ui_protocol.md`, `specification/v1_0/docs/evolution_guide.md`, `docs/public/reference/renderers.md`, `docs/public/ecosystem/renderers.md`;
- wheel `a2ui-agent-sdk==0.7.0` с PyPI (распакован и прочитан);
- `ext-apps/specification/{2026-01-26,draft}/apps.mdx`;
- блог OpenUI «Stop making AI write JSON».

## Общая оценка

Глава очень полная. Почти всё из `gaps.md` уже в ней: CVE-2026-10032, история `actionResponse` → RPC, visibility, `domain`, черновик MCP Apps, AI SDK 7 как хост, FastMCP/Prefab, OpenAI MCP Extensions, EvoGenUI, числа Google с условиями. Устаревшее из `spec/practice/field.md` (AI SDK 5, `@copilotkitnext`, `text/html+mcp`, «Open-JSON-UI от OpenAI», авторство SEP) исправлено правильно.

Черновой RPC-пример v1.0 я проверил по `renderer_to_agent.json`, и он валиден: generic `error` с `functionCallId` и без `surfaceId` допускается схемой. Пример v0.9.1 тоже валиден: `catalogId` с `v0_9` совпадает с `$id` файла каталога, `variant: "primary"` входит в enum. Фактических ошибок, которые научили бы неправильному, я не нашёл, поэтому critical: 0.

Главные дыры лежат на стороне агента, который генерирует A2UI: как его получить из LLM на Python, как это стримится и как ошибки валидации возвращаются модели. Есть ещё одна дыра в дереве выбора, про iOS.

Границы с соседними главами соблюдены. Единственное место, где глава заходит в главу 5, — находка 11.

---

## Major

### 1. Нет конвейера генерации A2UI на стороне агента (Python)

- **Что добавить.** Глава показывает только валидатор (`A2uiCatalog.validate_components`) и не показывает, как Python-агент получает A2UI от модели. В `a2ui-agent-sdk` 0.7.0 весь конвейер есть:
  - `DirectJsonFormat` (`a2ui.inference_formats.direct_json`) собирает системный промпт из каталога: `prompt_generator.generate(role_description, …, allowed_components=…, include_schema=…, include_examples=…)`.
  - Модель пишет текст и вставляет UI в теги `<a2ui-json>…</a2ui-json>` (`a2ui/schema/constants.py:91-92`).
  - `parse_response` делит ответ на текстовые и UI-части.
  - `payload_fixer.parse_and_fix` нормализует «умные» кавычки и висячие запятые.
  - Дальше идёт валидация по каталогу.
  - Повторной генерации в SDK нет, этот цикл пишешь сам. Протокол его прямо предусматривает: «If it is invalid, the errors can be reported back to the LLM in a subsequent prompt, allowing it to self-correct» (`v0_9_1/docs/a2ui_protocol.md`, раздел про валидацию).
  - Альтернатива тегам — отдавать UI через вызов инструмента: `SendA2uiToClientToolset` для ADK (`a2ui/adk/send_a2ui_to_client_toolset.py`).
- **Ловушка для читателя.** README пакета на PyPI до сих пор называет входной точкой `A2uiSchemaManager`. В 0.7.0 это deprecated-обёртка, которая при импорте выдаёт `DeprecationWarning` («Please use DirectJsonFormat instead», `a2ui/schema/manager.py`).
- **Куда.** Раздел `catalog`, сразу после запуска валидатора, как подраздел «Как агент получает A2UI от модели». Другой вариант — конец `a2ui-surface`.
- **В каком виде.** Короткий пример на Python (промпт из каталога → вызов LLM → `parse_response` → validate → повтор с ошибками) и `.pipeline`-рисунок из пяти шагов. Целевой читатель — Python-бэкендер, и ему это нужнее всего.
- **Источник.** Wheel `a2ui_agent_sdk-0.7.0` на PyPI: `inference_formats/direct_json/{format,prompt_generator,parser}.py`, `parser/payload_fixer.py`, `schema/manager.py`. Плюс `specification/v0_9_1/docs/a2ui_protocol.md` (Generate → Validate → self-correct).

### 2. Потоковая отрисовка A2UI описана неточно: пропущен потоковый парсер на стороне агента

- **Что не так.** В разделе `a2ui-surface` (`index.html:65`) сказано: «Список самостоятельных записей рендерер разбирает по мере прихода». В таблице раздела `patterns` (`index.html:831`) сказано: «каждая строка — валидное сообщение, компонент приходит полностью». Но модель обычно пишет один `updateComponents` со всем массивом компонентов, и собственный пример главы тоже такой. Рендерер получает сообщения целиком. Постепенность внутри одного сообщения создаёт агент:
  - `DirectJsonStreamParser` в SDK «лечит» недописанный JSON;
  - он выдаёт частичные `updateComponents`, где есть только поддерева, достижимые от `root`: «Instead of waiting for a UI message which could contain dozens of components, we yield "partial" updates as soon as we have enough components to build a renderable sub-tree from the root» (`streaming.py`, `yield_reachable`);
  - на месте ещё не пришедших детей он ставит заглушку, пустой `Row` (`streaming_v09.py:41-46`).
- **Что делает рендерер по спецификации.** Он буферизует обновления до появления `root`, а потом дорисовывает дерево по мере прихода *сообщений*: «they will be buffered until a root component is defined… skipping invalid references» (`a2ui_protocol.md`, раздел про adjacency list). Поэтому порядок генерации «сначала root» — практическое правило для промпта.
- **Куда.** Абзац «Плоский список вместо дерева» и строка A2UI в таблице «Что показывать, пока модель пишет».
- **В каком виде.** Абзац плюс исправленная строка таблицы: «единица — сообщение; внутри сообщения постепенность даёт потоковый парсер агента с заглушками». Заглушка агента (пустой `Row`) хорошо ложится рядом с историей про `[Loading {id}...]` из #2013.
- **Источник.** `a2ui_agent_sdk-0.7.0/a2ui/inference_formats/direct_json/streaming.py`, `streaming_v09.py`; `specification/v0_9_1/docs/a2ui_protocol.md`.

### 3. Сообщение `error` от рендерера и петля самокоррекции

- **Что добавить.** Глава перечисляет `error` среди сообщений v1.0 и нигде не показывает, что в нём едет. Это провод, по которому модель узнаёт о своей ошибке:
  - в v0.9 это `{"error":{"code":"VALIDATION_FAILED","surfaceId":…,"path":"/components/0/text","message":…}}`;
  - в v1.0 у validation-ветки коды `VALIDATION_FAILED | UNALLOWED_PARENT | UNALLOWED_CHILD` с обязательными `surfaceId` и `path`;
  - у generic-ветки есть либо `surfaceId`, либо `functionCallId`, но не оба сразу (`renderer_to_agent.json`, `error.oneOf`).
- **Двухфазная валидация.** Агент проверяет до отправки, рендерер проверяет повторно и отвечает этим сообщением. Об этом пишут `practice.md` §3 и `field.md` («Two-phase validation»), а в главе этого нет. Раздел `choose` говорит «проверяет всё повторно», но не говорит, как результат повторной проверки возвращается агенту.
- **Куда.** Раздел `catalog`, рядом с выводом валидатора: вывод SDK и это сообщение — одно и то же, только на двух концах.
- **В каком виде.** JSON-пример из 6 строк и одно предложение про v1.0-коды.
- **Источник.** `specification/v0_9_1/docs/a2ui_protocol.md`, «Standard validation error format»; `specification/v1_0/json/renderer_to_agent.json`; `practice.md` S5, `field.md` S4.

### 4. Дерево выбора отправляет «нативные мобильные клиенты» в A2UI и молчит про iOS

- **Что не так.** В `fig-choose` (`index.html:928`) ветка «Нужны нативные мобильные клиенты? → да → A2UI v0.9.1 со своим каталогом». В матрице и в «Выборе для Python-бэкендера» сказано «веб и мобильные клиенты». Но в официальной таблице рендереров:
  - **SwiftUI (iOS/macOS) — «🚧 Planned», кода нет**;
  - Jetpack Compose — Alpha, только v0.9.1;
  - единственный стабильный мобильный путь — **Flutter GenUI SDK**.
  Для iOS остаются только сторонние рендереры: `BBC6BAE9/a2ui-swift` (v0.8/v0.9), `AGenUI` (C++-ядро, iOS/Android/HarmonyOS, v0.9, со своим расширенным каталогом) и `a2ui-react-native` (только v0.8). Глава нигде не упоминает iOS и SwiftUI.
- **Куда.** Абзац «Рендереры за спецификацией не успевают» в разделе `versions` и подпись или узел `fig-choose`.
- **В каком виде.** Одна строка в абзаце и уточнение ветки: «натив: Flutter — стабильно; Android — Compose alpha; iOS — только сторонние рендереры». Можно добавить маленькую таблицу «платформа × официальный статус × сторонние».
- **Источник.** `docs/public/reference/renderers.md` (строки 28-30 таблицы), `docs/public/ecosystem/renderers.md`, `spec.md` (S4), `practice.md` §7.

### 5. Нет шаблонов списков: `ChildList {componentId, path}`, относительные пути, `formatString`

- **Что добавить.** Глава показывает только статические `children: [ids]`. Но в A2UI у `children` есть вторая форма, шаблон: `{"componentId": "employee_card_template", "path": "/employees"}`. Рендерер создаёт шаблон для каждого элемента массива. Пути без ведущего `/` внутри шаблона относительны: `name` → `/employees/N/name`. Это прямо помечено как отступление от RFC 6901. В строках есть интерполяция `${/user/name}` и `${firstName}` через `formatString`. В v1.0 добавился `@index` для номера итерации.
- **Почему важно.** Это главный механизм экономии токенов и задержки. Список из 20 ресторанов — один шаблон и один `updateDataModel`, а не 20 сгенерированных карточек. На нём держится и тезис из раздела `evidence` о том, что «агент меняет данные или один узел, а не переписывает страницу». Сейчас этот тезис не подкреплён механизмом.
- **Куда.** Раздел `a2ui-surface`, после абзаца о привязке данных через JSON Pointer.
- **В каком виде.** JSON-пример на 4 компонента (пример из спецификации) и абзац.
- **Источник.** `specification/v0_9_1/json/common_types.json` (`$defs/ChildList`); `specification/v0_9_1/docs/a2ui_protocol.md`, разделы «Collection scopes (relative paths)» и «formatString syntax»; `v1_0/docs/evolution_guide.md` (`@index`).

---

## Minor

### 6. Изменения v1.0 для авторов каталогов перечислены не полностью

- **Что не так.** В главе стоит строка «Каталоги v0.9 не работают с рантаймом v1.0 напрямую: сменилась структура определений функций и проверок» (`index.html:327`), но не сказано, что именно менять. По evolution guide:
  - `functions` стал map «имя → определение»;
  - обязателен `protocolVersion: "1.0"` в метаданных каталога, а без него действует `"0.9"`;
  - имена должны соответствовать UAX #31;
  - `allowedParents`/`allowedChildren` появились, потому что «JSON Schema cannot natively restrict child component types across a flat adjacency list»;
  - `Surface` зарезервирован как неявный корень;
  - при смешивании каталогов работает порядок разрешения: `catalogId` у компонента или вызова → `catalogId` поверхности → ошибка, «no fallback to catalogs advertised in capabilities»; все смешиваемые каталоги должны быть одной версии протокола;
  - `inlineCatalogs` (есть уже в v0.9, только если агент объявил `acceptsInlineCatalogs: true`) документация называет «supported but not recommended in production».
- **Куда.** Список ломающих изменений в разделе `versions`.
- **В каком виде.** Три-четыре пункта в тот же список.
- **Источник.** `specification/v1_0/docs/evolution_guide.md` §1, §2.1, §2.7; `v0_9_1/json/client_capabilities.json`; `docs/public/concepts/catalogs.md` («Inline Catalogs»).

### 7. OpenUI Lang есть в матрице, но синтаксис нигде не показан

- **Что добавить.** Раздел `evidence` и матрица сравнивают «json-render, OpenUI Lang», но читатель не видит ни строчки этого языка. Пример из блога OpenUI: `root = Stack([CardHeader("Todos"), Stack([Input("title", $title, "What needs to be done?"), submitBtn], "row"), tbl, footer])`. Действия записываются так: `Button("Add", Action([@Run(createResult), @Run(todos), @Reset($title)]))`. Он почти совпадает с A2UI Express (`root = ComponentB([...])`, `$/path`), который глава уже показывает. Два независимых проекта пришли к одной форме: присваивание переменной, позиционные аргументы, `$` для привязок. Это сильный аргумент для абзаца «модели пишут JSON дорого».
- **Куда.** Абзац про Express и Markdown Profile в разделе `versions`, где уже есть отсылка «та же мысль у OpenUI», или раздел `evidence`.
- **В каком виде.** Две строки кода рядом с блоком Express.
- **Источник.** https://www.openui.com/blog/stop-making-ai-write-json (есть в списке источников главы).

### 8. Какую роль сейчас играет MCP-UI и чем встроить MCP App в свой веб-хост

- **Что не так.** `@mcp-ui/client` стоит на графике загрузок (296 696 за неделю), но в тексте не объяснено, что это. По `practice.md` пакеты `@mcp-ui/*` теперь являются реализацией MCP Apps: `AppRenderer` — для хостов MCP Apps, а `UIResourceRenderer` оставлен для «legacy MCP-UI hosts». Для читателя со своим React-фронтендом без AI SDK и CopilotKit это третий путь стать хостом. Сейчас в главе есть только AI SDK (`experimental_MCPAppRenderer`) и `MCPAppsMiddleware`.
- **Куда.** Раздел `frontend`, абзац «AI SDK теперь умеет быть хостом MCP Apps», или абзац в `adoption`.
- **В каком виде.** Два предложения.
- **Источник.** `practice.md` S19, S21 (README MCP-UI и Supported Hosts); `gaps.md` G41 (репозиторий `MCP-UI-Org/mcp-ui`).

### 9. Не описаны размер и режим показа View

- **Что добавить.** Это первые грабли, на которые наступает автор MCP App. `hostContext.containerDimensions` бывает фиксированным (`height`/`width`) или гибким (`maxHeight`/`maxWidth`) по каждой оси. При гибком размере «hosts MUST listen for `ui/notifications/size-changed`». SDK отправляет это уведомление сам через ResizeObserver (`autoResize` включён по умолчанию). Смена режима идёт через `ui/request-display-mode`, и хост «MUST return the resulting mode». Об изменениях хост сообщает через `ui/notifications/host-context-changed`. Есть ещё `prefersBorder`. Глава упоминает режимы только в составе `ui/initialize`.
- **Куда.** Подраздел «Жизненный цикл View».
- **В каком виде.** Короткая таблица «метод → направление → зачем» на 4-5 строк.
- **Источник.** `ext-apps/specification/2026-01-26/apps.mdx`, строки около 671-787 и 1036 (раздел о `containerDimensions` и display modes).

### 10. Проверку возможностей хоста можно дать конкретно

- **Что добавить.** Глава говорит, что без поддержки MCP Apps инструмент работает как обычный, с текстовым фолбэком. Черновик спецификации даёт конкретный приём: сервер «SHOULD check client capabilities before registering UI-enabled tools» через `getUiCapability(clientCapabilities)` из `@modelcontextprotocol/ext-apps/server`. Если UI нет, сервер регистрирует текстовую версию инструмента.
- **Куда.** Абзац «Вокруг расширения поменялся сам MCP» в разделе `mcp-apps`.
- **В каком виде.** Одно предложение с именем хелпера.
- **Источник.** `ext-apps/specification/draft/apps.mdx`, раздел о capability negotiation (около строк 2180-2240).

### 11. Граница с главой 5: абзац про stateless MCP можно сократить до ссылки

- **Что не так.** Абзац про ревизию 2026-07-28 и JSON `initialize` с `protocolVersion: "2024-11-05"` (`index.html:576` и соседние) объясняет устройство ядра MCP, а это территория главы 5. Сам вопрос я проверил 30 сентября 2026. Черновик `ext-apps` по-прежнему показывает согласование только через `initialize` (SEP-1724 extensions) и не содержит варианта для ревизии без `initialize`: поиск по `discover`, `stateless` и `2026-07-28` в `draft/apps.mdx` пуст. Поэтому формулировку «это место стоит проверить по репозиторию ext-apps» можно заменить проверенным фактом: «ни стабильная, ни черновая спецификация на 30.09.2026 не описывают объявление расширения без `initialize`». Детали ядра стоит оставить главе 5.
- **Куда.** Подраздел «Что изменилось после Stable».
- **В каком виде.** Сократить абзац и JSON-пример до одного предложения и ссылки на главу 5.
- **Источник.** `ext-apps/specification/draft/apps.mdx` (скачан 2026-09-30; grep по `discover|stateless|2026-07-28` находит только разделы про resource/tool discovery).

---

## Что проверено и оказалось верным

- Пример v1.0 `callAgentFunction` / `agentFunctionResponse` / `callRendererFunction` / `error INVALID_FUNCTION_CALL` соответствует `renderer_to_agent.json` и `common_types.json#/$defs/FunctionResponse`.
- Список сообщений v1.0 в обе стороны, удаление через `value: null`, повторное ужесточение уникальности `surfaceId`, удаление `theme` и `surfaceProperties` совпадают с evolution guide.
- Таблица `catalogId` и её вывод («v0_9 в файле, v0_9_1 в хелпере SDK») подтверждаются `$id` каталога.
- Утверждения про статусы рендереров React, Lit, Angular, Flutter, Compose и про сторонние рендереры Svelte и uny для v1.0 совпадают с `renderers.md`.
- Устаревшие утверждения из заметок в главу не попали.
