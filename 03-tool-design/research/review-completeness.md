# Рецензия полноты: глава 03 «Проектирование инструментов агента»

Рецензент: критик полноты. Дата проверки: 30 сентября 2026.
Что сравнивалось: `index.html` (около 11,8 тыс. слов с самопроверкой и источниками, 16 рисунков) против охвата темы и четырёх файлов заметок (`gaps.md`, `spec.md`, `practice.md`, `field.md`). Спорные места проверены по первоисточникам (curl и WebFetch 2026-09-30). Главу я не правил.

## Итог

- critical: 0
- major: 5
- minor: 7

Охват темы почти полный. Все пункты из списка охвата в главе есть. Исправления из `gaps.md` (PTC на `code_execution_20260120`, снятие beta-заголовков 17.02.2026, отмена принудительного `tool_choice`, ошибки валидации как ошибки выполнения с 2025-11-25, strict и параллельные вызовы у OpenAI, авторство Pi, список багов Check Point, трактовка «99%») в главу перенесены правильно. Устаревших утверждений относительно заметок я не нашёл. Дыры другого рода: не хватает сводных справочных таблиц, практики на Python и нескольких механизмов 2026 года. Главные из них: решающая таблица Anthropic «какой механизм от какого расхода», новые правила параллельных вызовов, перенос правил главы на FastMCP/Pydantic.

Про объём: прозы в главе около 10 тыс. слов при потолке 11 тыс. (AUTHORING.md, «Объём главы: 7–11 тысяч слов»). Место под дополнения стоит взять из находки 7, где глава дублирует главы 1, 2 и 16.

Что я проверил и что оказалось верным:
- `@tool(needs_approval=...)` в примере OpenAI Agents SDK рабочий: `from agents.decorators import tool`, docs/human_in_the_loop.md, строки 18–31.
- Лимит описаний в Claude Code (2048 символов, `CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH`, v2.1.280+) совпадает с code.claude.com/docs/en/mcp.md, строки 1443–1445.
- Типы PTC и tool search, статус GA, запрет `any`/`tool` на Opus 5.5 / Sonnet 5.5 / Fable 5.1 / Mythos 5.1 совпадают с release notes.

---

## Major

### 1. Нет сводки «какой механизм против какого расхода». Context editing не упомянут вовсе

**Что не так.** Глава разбирает отложенную загрузку, PTC и кеш по отдельности. Тезис первого раздела звучит так: «результаты вызовов копятся в истории и уходят в модель снова на каждом шаге». Но механизм, который чистит именно эти результаты, в главе не назван: context editing, `clear_tool_uses_20250919`. У Anthropic есть отдельная решающая страница «Manage tool context». Она сводит четыре подхода к тому, куда уходят токены, и задаёт порядок внедрения. Читателю, который откроет главу как справочник, этой таблицы не хватит в первую очередь.

**Доказательство.** https://platform.claude.com/docs/en/agents-and-tools/tool-use/manage-tool-context.md (прочитано 2026-09-30):
- таблица «Tool search: tool definitions loaded upfront, Large toolsets (20+ tools)… / Programmatic tool calling: `tool_result` roundtrips / Prompt caching: token cost of repeated tool definitions, stable toolsets / Context editing: old `tool_result` blocks in history»;
- порядок: «Enable prompt caching on your tool definitions from day one… Add tool search once your toolset grows past roughly 20 tools… Add context editing once individual conversations start running long… Consider programmatic tool calling if you notice repetitive chains».

Страница есть в `spec.md` как [S15/S16], но в главу не попала. Context editing подробно разобран в главе 2 (`02-context-engineering`, раздел с `clear_tool_uses_20250919`).

**Что добавить.** В конец раздела `cost` или перед `code-mode` поставить таблицу на четыре строки: механизм, что сокращает, когда брать, где в книге. Под ней один абзац с порядком внедрения по Anthropic. Context editing дать одной строкой со ссылкой на главу 2, не пересказывая его. В первом разделе, после фразы про копящиеся результаты, поставить ссылку на ту же главу 2.

### 2. В разделе о параллельных вызовах не хватает правил 2026 года и того, как их вызвать

**Что не так.** Раздел «Несколько вызовов за один ход» говорит только о порядке `tool_result` и флагах отключения. Пропущено три вещи.
1. Если харнесс решил какой-то вызов не выполнять (например, пачка шла последовательно и предыдущий вызов упал), на него всё равно нужно вернуть `tool_result` с `is_error: true`. Иначе история невалидна.
2. У Claude Fable 5.1 известна регрессия: в длинных циклах агента он делает меньше параллельных вызовов. Лечится официальным блоком `<use_parallel_tool_calls>` в системном промпте. Для обратной беды (в пачку попадают зависимые вызовы) есть фраза «Only batch tool calls that are independent of each other».
3. Параллельность задаётся промптом не меньше, чем флагом. Multi-agent research system Anthropic приписывает параллельным вызовам и подагентам сокращение времени исследования до 90%.

**Доказательство.** https://platform.claude.com/docs/en/agents-and-tools/tool-use/parallel-tool-use.md:
- строка 15: «If you choose not to run a particular call… still return a `tool_result` for it with `is_error: true` and a brief explanation»;
- строки 819–821: текст блока `<use_parallel_tool_calls>`;
- строка 844: «Claude Fable 5.1 may issue fewer parallel tool calls than earlier models, most noticeably in long agent loops»;
- строка 1578: «Only batch tool calls that are independent of each other.»

Заметки: `spec.md` §13, `practice.md` §15, `gaps.md` [G23] («up to 90%»).

**Что добавить.** Два коротких абзаца в раздел `side-effects`, подраздел «Несколько вызовов за один ход». Туда же пример системного промпта: блок `<use_parallel_tool_calls>` из документации целиком, это три строки. Сам механизм пары `tool_use`/`tool_result` уже в главе 1, повторять его не нужно.

### 3. Нет перехода от правил к Python: FastMCP и Pydantic расходятся с советами главы

**Что не так.** Аудитория книги — Python-бэкендеры. В главе 23 блока кода, из них три на Python, но ни один не определяет инструмент на Python: два — чужие примеры вызова (`client.responses.create` OpenAI, скрипт PTC), третий — декоратор Agents SDK. Нет ни одного примера на FastMCP или Pydantic. Совет про Pydantic один, в конце раздела об ошибках. Между тем при переносе правил главы в код на FastMCP или Pydantic есть конкретные грабли, которые текст главы не ловит.
- **Описание = docstring.** FastMCP берёт в описание тула весь свободный текст docstring над секцией `Args`, а описания параметров — из `Args`, `Annotated[..., "..."]` или `Field(description=...)`. То есть правило «три-четыре предложения, важное в первых 2048 символах» на практике означает «так пиши docstring».
- **Poka-yoke = типы.** Тип `Literal["on", "off"]` превращается в `enum`. Но `Field(ge=1, le=100)` превращается в `minimum`/`maximum`, а строгий режим Claude на них возвращает 400, это разобрано в самой главе. Anthropic SDK даёт `transform_schema()`: он принимает Pydantic-модель, переносит неподдерживаемые ограничения в description и возвращает схему. Документация описывает его для `output_config`. Что он годится и для `input_schema` строгого тула — мой вывод, перед печатью его стоит проверить.
- **Сырой ответ по умолчанию.** Если тул FastMCP возвращает dict, dataclass или Pydantic-модель, FastMCP сам строит `structuredContent` и по спецификации дублирует его JSON-текстом. Это ровно ошибка MCP-B из первого раздела: все поля модели идут в контекст.
- **Инструктивная ошибка может потеряться.** С `mask_error_details=True` текст обычных исключений скрывается, клиенту всегда доходит только `ToolError`. Значит, ошибки «поле X: ожидается Y» надо поднимать через `ToolError`.

**Доказательство.**
- https://gofastmcp.com/servers/tools.md, прочитано 2026-09-30:
  - строки 44 и 350–352: docstring становится описанием, `Args` — описаниями параметров;
  - строка 252: `Literal`/`Enum`;
  - строки 382–395: `Field(..., ge=1, le=2000)`;
  - строка 530: «When your tool returns a dictionary, dataclass, or Pydantic model, FastMCP automatically creates structured content»;
  - строки 826–853: `ToolError` и `mask_error_details`.
- https://platform.claude.com/docs/en/build-with-claude/structured-outputs.md: строки 737–749 («Remove unsupported constraints (for example, `minimum`…)… Update descriptions») и 882 (`transform_schema()` «also accepts a Pydantic model»).

В заметках этого нет. Проверено в вебе.

**Что добавить.** Один пример «до и после» на Python, около 30 строк: тул FastMCP, к которому применены правила главы (docstring с назначением и «когда не звать», `Literal` вместо булевых флагов, `response_format`, ответ с полями для следующего шага и признаком усечения, `ToolError` с подсказкой). Лучшее место — конец раздела `responses` или сразу после раздела `errors`. Рядом поставить `note warn` про `Field(ge=...)` → `minimum` → 400 на strict. Как поднять сервер FastMCP, оставить главе 5: там FastMCP уже разобран, 10 упоминаний.

### 4. Нет сводки типичных ошибок реальных MCP-серверов, хотя это отдельный пункт охвата

**Что не так.** В охвате отдельно стоит «typical mistakes seen in real MCP servers». В главе эти ошибки разбросаны по восьми разделам: обёртки (92%), «запахи» описаний, DCI, пропущенные аннотации, god tool, omnibus-параметры, одно общее «failed», молчаливое усечение, недетерминированный порядок, сырой JSON. Сводной таблицы нет, а для справочника она ценнее всего. Кроме того, из списка Digital Applied выпали три пункта:
- schema over-fit — слишком много обязательных полей и несовпадения enum ведут к отказам или выдуманным совпадениям;
- chatty patterns — больше пяти вызовов на ход пользователя при 200–400 мс на круг;
- аудит и dry-run для разрушительных тулов — в рейтинге это худший анти-паттерн, а в главе ему досталась одна фраза в конце «Где спросить человека».

**Доказательство.** `practice.md` §10, «Pitfalls» (DigitalApplied [S6]: «Schema over-fit», «Chatty protocols: >5 tool calls per user turn at 200-400ms», «No audit gates on destructive tools»). `gaps.md`, раздел H (замеры: 97,1% / 92% / 9,93% / ~13% / 58,8%). Оговорку, что в DA числа эвристические, глава уже даёт, её достаточно повторить ссылкой.

**Что добавить.** Таблицу перед «Проверь себя» с колонками «ошибка → как видна в логах или транскрипте → исправление → раздел главы». Строк около 10–12, числа из уже процитированных работ. Для «auth прикручен после запуска» хватит ссылки на главы 15 и 16. Ещё в таблицу стоит внести DCI в 13% из 10 240 серверов (arXiv:2602.03580, `gaps.md` [G34]) рядом с 9,93% пар.

### 5. Раздел «Что на самом деле значат 99%» не использует собственный замер Anthropic, где цена выросла

**Что не так.** Раздел опирается на agent-swarm и Stainless. Сильнее всего его тезис подтверждает первый источник, сам вендор: 17 февраля 2026 года Anthropic выпустила dynamic filtering. Это `web_search_20260209` и `web_fetch_20260209`, где Claude пишет код и фильтрует результаты поиска до того, как они попадут в контекст. Это тот же code mode, только на серверных тулах, которыми читатель уже пользуется. Точность и токены улучшились, но цена в пересчёте на прайс на Opus выросла.

**Доказательство.** https://claude.com/blog/improved-web-search-with-dynamic-filtering, 17 февраля 2026:
- «dynamic filtering improved performance by an average of 11% while using 24% fewer input tokens»;
- «Price-weighted tokens decreased for Sonnet 4.6 on both benchmarks but increased for Opus 4.6»;
- F1 выросла с 52,6 до 59,4% (Sonnet 4.6) и с 69,8 до 77,3% (Opus 4.6).

Заметки: `gaps.md` [G25], раздел Numbers и «Pitfalls».

**Что добавить.** Строку в рисунок или таблицу раздела (−24% входных токенов, но стоимость на Opus 4.6 выросла) и два-три предложения: даже у вендора сокращение контекста не всегда даёт сокращение счёта, потому что модель пишет код, а это выходные токены.

---

## Minor

### 6. Подтверждение через MCP: не упомянут штатный способ спросить пользователя внутри вызова

В разделе «Где спросить человека» есть `_meta["anthropic/requiresUserInteraction"]`, `needs_approval` и Managed Agents. Нет двух вещей:
- MCP-механизма, которым сервер сам спрашивает подтверждение посреди вызова: в 2026-07-28 это `resultType: "input_required"` с `elicitation/create` и повтор с `inputResponses`;
- того, что Agents SDK умеет одобрение и для MCP-серверов (`require_approval` на `MCPServerStdio`/`MCPServerStreamableHttp`, `HostedMCPTool` с `tool_config={"require_approval": "always"}`).

Доказательства: `spec.md` §5 (wire-пример `input_required`); code.claude.com/docs/en/mcp.md, строка 1380 («On connections that use protocol revision 2026-07-28, Claude Code declares `elicitation: {form: {}, url: {}}`»); openai-agents-python docs/human_in_the_loop.md, строка 43. Механика elicitation уже есть в главе 5, поэтому хватит двух предложений и ссылки на неё.

### 7. Где глава заходит на территорию соседних (и где взять место под находки 1–5)

- «Менять набор посреди разговора» и половина «Инструменты и кеш» повторяют главу 1 и главу 2. В главе 1 про `tool_removal` и сброс кеша есть даже тот же вопрос самопроверки. Там же, в главах 1 и 2, разобран OpenAI `allowed_tools`, а в главе 3 он не упомянут, и из-за этого раздел о кеше выглядит так, будто решение есть только у Anthropic. Предложение: сжать до абзаца «правило для автора тулов плюс ссылка на главы 1 и 2» и одной фразой назвать `allowed_tools`. Доказательство: developers.openai.com/api/docs/guides/function-calling.md, строки 1003–1015 («not modify the list of tools you pass in, so you can maximize savings from prompt caching»).
- Абзац про Check Point (пять багов, версия workerd, отсутствие CVE) — материал главы 16. Для главы 3 хватит двух предложений: «инъекция становится исполнением кода, песочница входит в поверхность атаки» и ссылка.

### 8. Набросок strict-схемы для Responses API теряет enum, то есть противоречит уроку poka-yoke из той же главы

В блоке «Набросок: тот же тул для Responses API» у `unit` стоит `"type": ["string", "null"]` с текстом «celsius or fahrenheit» в description, а `enum` пропал. Абзацем выше глава учит заменять свободные значения перечислением. OpenAI в своём примере strict-схемы с null-типом enum сохраняет: developers.openai.com/api/docs/guides/function-calling.md, строки 1078–1082, `"type": ["string", "null"], "enum": ["celsius", "fahrenheit"]`. Глава 1 этой книги тоже его сохраняет. Исправление: вернуть `enum`.

### 9. Таблицу «Сколько тулов — слишком много» стоит дополнить тремя строками

- Anthropic, «Manage tool context»: tool search подходит для «Large toolsets (20+ tools)». Это более свежий и более низкий порог, чем «30–50» из той же документации.
- Gemini: «Keep active set to 10-20 tools maximum» (`gaps.md` [G15], ai.google.dev/gemini-api/docs/function-calling).
- RAG-MCP (arXiv:2505.03275): поиск по тулам поднял точность выбора с 13,62 до 43,13%. Это независимое от вендора подтверждение пользы поиска (`gaps.md` [G38]).

Если упоминать OSWorld-MCP, то с правильной трактовкой: 36,3% — доля случаев, когда модель вообще вызывает тул там, где он помог бы, а не точность выбора (`gaps.md`, противоречие 9).

### 10. Gemini в главе не упомянут ни разу

Хватит двух вставок.
- В раздел strict: у Gemini есть режим `tool_choice: "validated"` («Model ensures function schema adherence»), и поддерживается только подмножество OpenAPI.
- В раздел о форматах: известная ошибка `Malformed_Function_Call` возникает, когда модель перед вызовом пишет структурированный текст (например, `<UPDATE>…</UPDATE>`). Google советует превратить такой свободный протокол в отдельный тул `update()`. Это прямая иллюстрация совета из «Building effective agents» про форматы, которые модели тяжело писать.

Источник: `gaps.md`, раздел F, [G15].

### 11. «Think»-тул: стоит одна фраза о том, что он устарел

В руководствах 2025 года часто советуют добавить no-op тул `think`, и читатель наверняка их видел. Сейчас в статье Anthropic стоит пометка «Extended thinking update: we recommend using that feature instead of a dedicated think tool in most cases». На Opus 5.5 мышление к тому же нельзя отключить (release notes). Во всей книге think-тул не упомянут ни разу (grep по 17 главам). Хватит одного предложения в разделе `descriptions` или в конце `iterate`. Источник: https://www.anthropic.com/engineering/claude-think-tool (`gaps.md` [G22], Claims №11).

### 12. Цикл улучшения описаний: не хватает исследовательской линии и названия метрики

- Автоматическое переписывание описаний исследуют уже как отдельную задачу. Trace-Free+ (arXiv:2602.20426, февраль 2026) на каталогах из 150+ тулов уменьшает деградацию точности на 29,23% и поднимает долю успешных запросов на 60,89% на StableToolBench (`gaps.md`, раздел J, [G37]). Это одно предложение о том, что ручной цикл Anthropic не единственный вариант, с оговоркой «исследование, не продуктовая рекомендация».
- «Прогони каждую задачу три раза»: здесь стоит назвать метрику pass^k и дать ссылку на главу 17, где она разобрана (19 упоминаний). Пример из «Demystifying evals»: при 75% успеха на одном прогоне все три прогона проходят с вероятностью около 42% (`gaps.md` [G52]).

---

## Проверено, находок нет

- Статусы и версии: PTC GA, минимальная версия `code_execution_20260120`, `20250825` устарела. Tool search, examples и PTC работают без beta-заголовка с 2026-02-17. `inline-tools-2026-09-15` — beta, есть оговорка про июльский заголовок.
- `tool_choice` `any`/`tool` → 400 на Opus 5.5, Sonnet 5.5, Fable 5.1, Mythos 5.1 (release notes, строка 18, и parallel-tool-use.md, строка 1134).
- Каналы ошибок MCP (SEP-1303, 2026-07-28), хэндлы, `ttlMs`/`cacheScope`, детерминированный порядок `tools/list`.
- OpenAI: strict и параллельные вызовы конфликтуют только у дообученных моделей. При явном `strict: true` откат не тихий, а с ошибкой. Отложенная функция у OpenAI видна по имени и описанию.
- Трактовка «99%» (agent-swarm), вендорские оговорки у Stainless и AlphaSignal, оговорка про BFCL (68,8% повторов).
- Pi отнесён к Цехнеру, без непроверяемых «54k→98k звёзд». Список багов Check Point совпадает с первоисточником.
