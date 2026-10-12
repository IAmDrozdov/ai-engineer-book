# Глава 09 «A2UI и Generative UI»: рецензия на код, протокольные примеры и рисунки

Рецензент: независимый ревьюер кода/примеров/рисунков. Дата проверки: 30 сентября 2026. Главу не правил, только читал и проверял.

Материалы: `index.html` (26 текстовых блоков `<script class="code…">`, 4 блока `<script class="chart">`, 16 рисунков), `research/{gaps,spec,practice,field}.md`, и — там, где заметки не давали прямого ответа — живой код `a2ui-project/a2ui@main` (GitHub API/raw), `gofastmcp.com`, `developers.openai.com/plugins`, `ext-apps` (stable + draft), HN Algolia API. Список источников проверки ниже, в каждой находке или в блоке подтверждений — конкретный URL/файл.

## Итог

- **Python (3 блока)**: все три компилируются (`python3 -m py_compile`), ошибок нет.
- **JSON (14 самостоятельных + 4 `chart`)**: все парсятся (обычный JSON и построчный JSONL — где формат такой по протоколу).
- **Рисунки (16)**: `node tools/qa.mjs … --shots` → `ISSUES none`; каждый из 10 скриншотов открыт и просмотрен — подписи не слипаются, текст не вылезает за рамки, порядок сообщений и участники схем соответствуют тексту и спецификациям.
- **Критических находок: 0. Крупных находок: 0.** Один блок кода (`validate_a2ui.py`, раздел «Каталог») я сверил построчно с актуальным исходником `a2ui-core`/`a2ui-agent-sdk` на GitHub — он не просто правдоподобен, а воспроизводит поведение реального валидатора вплоть до кода ошибки и порядка строк в выводе. Таблица с четырьмя разными `catalogId` (раздел «Каталог») тоже проверена по всем четырём первоисточникам и совпадает буквально.
- **Minor: 1** — несовпадение даты одного и того же источника внутри самой главы (см. ниже). Это не код и не рисунок, но это конкретная проверяемая фактическая накладка, которую я нашёл по пути и не могу не отметить.

Так как реальных находок mid/high тяжести нет, ниже — сначала единственная находка, затем подробный протокол проверки (что проверено и почему всё сошлось), чтобы отчёт можно было аудировать.

---

## Minor

### 1. Дата HN-треда запуска A2UI указана дважды и по-разному

- **Где:** раздел `patterns` (текст перед цитатой skybrian) и раздел `adoption` (подраздел «Три лагеря на Hacker News»), обе ссылки на `src-10`.
- **Что не так:** в разделе `patterns` написано «спросил skybrian в треде запуска A2UI **17 декабря** 2025 года», а в разделе `adoption` — «Тред запуска A2UI на Hacker News **16 декабря** 2025 года собрал все позиции». Список источников (`src-10`) тоже называет 16 декабря. Это один и тот же тред (id 46286407), и дата должна быть одна.
- **Доказательство:** HN Algolia API, `GET https://hn.algolia.com/api/v1/items/46286407` → `"created_at": "2025-12-16T09:16:31.000Z"`. Верна дата 16 декабря; вхождение «17 декабря» в разделе `patterns` — опечатка.
- **Как исправить:** заменить «17 декабря 2025 года» на «16 декабря 2025 года» в разделе `patterns`.

---

## Проверено и подтверждено верным (протокол проверки)

### Python

| Блок | Заголовок | Результат |
|---|---|---|
| `validate_a2ui.py` (раздел `catalog`) | запускался: a2ui-agent-sdk 0.7.0, a2ui-core 0.2.0, Python 3.11 | `py_compile` OK. Сверен построчно с `a2ui-project/a2ui@main`: `python/a2ui_agent/src/a2ui/basic_catalog/provider.py` (класс `BasicCatalog`, метод `get_config`) и `python/a2ui_core/src/a2ui/core/validation/payload_validator.py` (`PayloadValidator._map_json_schema_error_code`, `A2uiErrorDetail`). Код ошибок (`unrecognized_component`, `extra_field`, `type_mismatch`), порядок строк вывода (`extra_field` раньше `type_mismatch`, потому что `sorted(..., key=lambda e: e.path)` и пустой путь идёт раньше `['variant']`) и точный текст сообщений jsonschema (`"Unevaluated properties are not allowed (...)"`, `"'danger' is not one of [...]"`) — всё совпадает с реализацией. Заявленный вывод (`block` «Вывод») воспроизводится логикой реального валидатора, а не выдуман. |
| `server.py` — квикстарт FastMCP (раздел `fastmcp`) | запускался: fastmcp 4.0.10, prefab-ui 0.20.2 | `py_compile` OK. Сверен с `gofastmcp.com/apps/quickstart` — импорты, сигнатура `team_directory`, параметры `PieChart(data_key=, name_key=, show_legend=)` и `DataTableColumn(key=, header=, sortable=)` совпадают дословно; в примере из главы оставлено 3 сотрудника из 7 — это раскрыто в тексте («пример сокращён»). Строка-заглушка `"[Rendered Prefab UI]"` и путь ресурса `ui://prefab/tool/<hash>/renderer.html` дословно совпадают с `gofastmcp.com/apps/architecture`. |
| `notes.py` (раздел `fastmcp`) | Набросок по notes.py … импорты и часть разметки опущены | `py_compile` OK (сам факт, что часть импортов опущена, помечен как набросок — по правилам инструкции это корректно). Проверены только факты, которые текст утверждает как истину: `@app.tool()` по умолчанию `visibility=["app"]`, `@app.ui()` — `visibility=["model"]` — оба подтверждены `gofastmcp.com/apps/fastmcp-app` дословно. |

### JSON / JSONL

Автоматически извлечены все 26 `<script class="code…">` и 4 `<script class="chart">` из `index.html`, сохранены в отдельные файлы и проверены `json.loads` (для однострочных) или последовательным `json.JSONDecoder().raw_decode` (для потоковых JSONL-примеров, где по протоколу так и передаётся — `createSurface`/`updateComponents`/`updateDataModel` построчно). Результат: **все 14 «содержательных» JSON/JSONL-блоков и все 4 `chart`-блока валидны**, ни одной синтаксической ошибки.

Дополнительно сверены с первоисточниками (не просто «валиден как JSON», а «это то же самое, что в доке»):

- Блок «Компонент v0.9» и «Сообщение action, v0.9» (вкладки «Кнопка с событием» / «Что получает агент») — дословно совпадают с `docs/public/concepts/actions.md` (также воспроизведено в `research/spec.md` как VERBATIM).
- Блок «Сообщение A2A с моделью данных» — дословно совпадает с тем же файлом (`a2uiClientDataModel`).
- Блок «Форма бронирования в v0.8» — дословно сверен с `docs/public/introduction/what-is-a2ui.md` (вкладка «v0.8 (Legacy)»), включая порядок полей и значение `"2025-12-16T19:00:00Z"`.
- Блок «Набросок по примеру из What is A2UI, v0.9.1: добавлен корень root» — сверен с той же страницей, вкладка «v0.9 (Stable)»: в реальном примере на сайте компонента `"id": "root"` действительно нет и `children`, связывающих `title`/`datetime`/`submit-btn` в дерево, тоже нет (то есть исходный пример ещё более сломан, чем просто «без ярлыка root» — там нет вообще никакой связи между компонентами). Правка главы (добавлен `Column` с `id: "root"` и `children`) — рабочий способ починить пример, честно помечена как «Набросок», претензий нет.
- Таблица четырёх разных `catalogId` (раздел `catalog`, «Как каталоги должны меняться…») — проверена по всем четырём адресам:
  - файл каталога `specification/v0_9_1/catalogs/basic/catalog.json` → `catalogId`/`$id` = `.../v0_9/catalogs/basic/catalog.json` (да, с `v0_9`, не `v0_9_1`) — подтверждено чтением файла;
  - `docs/public/introduction/what-is-a2ui.md` → `.../v0_9_1/catalogs/basic/catalog.json` — подтверждено;
  - `BasicCatalog.get_catalog_id("0.9.1")` в SDK — прочитан код (`basic_catalog/constants.py` + `basic_catalog/provider.py`), результат детерминированно даёт `.../v0_9_1/catalogs/basic/catalog.json` — подтверждено;
  - `docs/public/guides/a2ui_over_mcp.md` → `.../v0_9/basic_catalog.json` — подтверждено.
  Все четыре строки в таблице точны, включая расхождение между строками 1 и 3, которое в тексте называется находкой автора главы («проверено запуском») — это действительно так.
- CSP по умолчанию (раздел `mcp-apps`) — дословно совпадает с `specification/2026-01-26/apps.mdx` (`default-src 'none'; script-src 'self' 'unsafe-inline'; …`). Утверждение, что в черновике добавлен `object-src 'none'`, подтверждено чтением `specification/draft/apps.mdx`.
- Пример двустороннего RPC v1.0 (`callAgentFunction`/`agentFunctionResponse`/`callRendererFunction`/`error INVALID_FUNCTION_CALL`) помечен как «Набросок» и по составу полей соответствует `research/gaps.md` (раздел «A2UI v1.0 RPC и actions, verbatim schema facts»), который сам сверен с `agent_to_renderer.json`/`renderer_to_agent.json`.
- Код CVE-2026-10032 (`OpenUrlImplementation`) — дословно совпадает с VERBATIM-цитатой в `research/gaps.md` (раздел 4 «Mechanics»), взятой из текста самого advisory.
- Таблица OpenAI (`_meta.ui.resourceUri` vs `openai/outputTemplate`, `ui/initialize` vs `window.openai.toolInput` и т.д.) и код двух инструментов (`roll_dice`/`render_dice_widget`) — сверены с `developers.openai.com/plugins/build/chatgpt-ui`, включая цитату «If you attach a widget template to every tool call, ChatGPT can re-render your iframe too often» — дословно.

### Рисунки

`node tools/qa.mjs /Users/sato/pets/ai-engineer-book/09-a2ui-generative-ui --shots --out /Users/sato/pets/ai-engineer-book/_qa/09-a2ui-generative-ui-code` → `ISSUES none` (0 ошибок mermaid, 0 сломанных якорей/источников, 0 повторяющихся `id`, 0 переполнений вправо). Все 16 рисунков (3 HTML, 2 SVG, 7 mermaid, 4 chart) отсмотрены на скриншотах:

- **fig-taxonomy, fig-adjacency** — читаются, дерево «что собирает рендерер» справа корректно соответствует плоскому списку слева; патч-стрелка ведёт к правильному узлу (`title`).
- **fig-a2ui-seq** — участники Агент/Рендерер/Пользователь, порядок сообщений (`createSurface → updateComponents → updateDataModel`, затем локальная запись, затем `action`) соответствует и тексту, и `docs/public/concepts/actions.md`.
- **fig-cve** — цепочка CVE воспроизведена верно: обе точки исправления (`web_core 0.10.2`, `v1.0 requiresUserActivation/allowedCallers`) подключены именно к `OpenUrlImplementation`, а не к валидации по схеме — это и есть суть уязвимости.
- **fig-v1-rpc** — направления стрелок `callAgentFunction→agentFunctionResponse` и `callRendererFunction→[error|rendererFunctionResponse]` верны, `alt`-блок с проверкой `allowedCallers` на месте.
- **fig-apps-lifecycle** — полностью совпадает с последовательностью из `specification/2026-01-26/apps.mdx`: `sandbox-proxy-ready` → `sandbox-resource-ready` → `ui/initialize` → `McpUiInitializeResult` → `ui/notifications/initialized` → `tool-input-partial*` → `tool-input` → `tool-result`. Названия типов (`McpUiInitializeResult`) сверены дословно.
- **fig-sandbox** — атрибуты `sandbox="allow-scripts allow-same-origin"` (proxy) и `sandbox="allow-scripts allow-forms allow-popups allow-modals"` (View, без `allow-same-origin`) — дословно из `docs/public/guides/mcp-apps-in-a2ui.md`, авторство которому глава и приписывает цитату (не спецификации MCP Apps, где этой конкретной строки нет — глава атрибуцию не путает).
- **fig-prefab, fig-visibility, fig-openai-stack** — соответствуют тексту и проверены по `gofastmcp.com` / `research/gaps.md` (правило `visibility` по умолчанию `["model","app"]`).
- **fig-aisdk-states** — семь состояний и переходы соответствуют VERBATIM-списку в `research/gaps.md` (`input-streaming | input-available | approval-requested | approval-responded | output-available | output-error | output-denied`).
- **fig-genui-elo, fig-genui-errors, fig-openui-tokens, fig-downloads** — числа на графиках построчно совпадают с таблицами чисел в `research/gaps.md` (Google GenUI Elo, backbone-абляция, npm-загрузки).
- **fig-choose** — дерево решений не претендует на цитату источника, внутренних противоречий с текстом раздела `choose` нет.

Нигде текст не вылезает за рамки SVG-диаграмм, подписи не перекрываются, стрелки идут в тех направлениях, которые указаны в подписи рисунка.

---

## Что не проверялось (вне роли ревьюера кода/примеров/рисунков)

Полнота содержания (например, отсутствие пайплайна генерации A2UI на стороне агента) — это предмет отдельной рецензии на полноту, которая уже есть в `research/review-completeness.md`; я её не дублирую и не оцениваю, так как моя роль — код, протокольные примеры и рисунки, а не охват темы.
