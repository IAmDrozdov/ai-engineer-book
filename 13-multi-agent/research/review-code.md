# Ревью кода, протокольных примеров и рисунков — глава 13 «Мультиагентные системы»

Проверено: все 10 блоков кода (`py_compile`/`node --check`/`bash -n`/`json`), все 15 рисунков (mermaid,
SVG, HTML-схемы, графики) через `node tools/qa.mjs --shots` и просмотр каждого скриншота, плюс
выборочная сверка чисел, имён полей/методов и цитат с `research/spec.md`, `research/gaps.md`,
`research/practice.md`, `research/field.md` и — там, где заметки не покрывали деталь — с живой
документацией (`platform.claude.com`, `code.claude.com`) и первоисточниками (Hacker News, Habr).

`node tools/qa.mjs 13-multi-agent --shots` → `ISSUES none`. Скриншоты: `_qa/13-multi-agent-code/`.

## Итог

Находок нет. Все 10 блоков кода либо компилируются, либо (bash/JSON-фрагмент/JS-workflow с
top-level `await`/`return`) синтаксически корректны для своего рантайма и подтверждены дословным
совпадением с документацией. Все 15 рисунков технически исправны (без ошибок mermaid, без обрезки
текста, без слипшихся подписей) и по смыслу совпадают с текстом и первоисточниками: участники,
направления стрелок, порядок сообщений и цифры на графиках нигде не разошлись со спецификацией.

Ниже — что именно проверено и чем подтверждено, без выдуманных проблем.

### Код

1. **Топологии Kim et al. (`data-lang="text"`, наброски-определения)** — сверено с `gaps.md` (таблица
   Table 5, v3): все пять множеств каналов `C` совпадают с оригиналом дословно.
2. **Handoff в OpenAI Agents SDK** — `py_compile` OK. Строки `Agent`, `handoff`, `Agent.as_tool()`
   совпадают с `gaps.md`/документацией SDK.
3. **Набросок: handoff с проверкой (`RefundArgs`, `on_handoff`, `handoff_filters.remove_all_tools`)** —
   `py_compile` OK, корректно помечен как «набросок… не запускался» согласно правилу AUTHORING.md.
4. **Handoff через `Command` в LangChain** — `py_compile` OK; `ToolMessage` с тем же `tool_call_id`
   и `current_step` в `update` соответствуют описанию в `spec.md`/`gaps.md`.
5. **Режимы сабагентов в ADK 2.0** (`mode="single_turn"`, `mode="task"`, `input_schema`,
   `output_schema`, `sub_agents`) — `py_compile` OK; сверено построчно с `gaps.md:362-385` —
   совпадает дословно, включая ограничение «`task`-агенты должны быть листьями» и «cannot see what
   its peer agents are doing».
6. **Объявление `advisor` в запросе** (`"tools": [...]` фрагмент) — не парсится как самостоятельный
   JSON, но это ожидаемо: это фрагмент тела запроса (как и в `gaps.md`/живой документации advisor
   tool, где он приведён в том же нецельном виде). Не находка.
   Сверено с живой документацией `platform.claude.com/docs/.../advisor-tool`: тип `advisor_20260301`,
   бета `advisor-tool-2026-03-01`, и — отдельно — подробности про `advisor_redacted_result` /
   `claude-opus-4-8` / список моделей-исполнителей, которые работают только с зашифрованным
   вариантом (Opus 5.5, Sonnet 5.5 и др.), дословно подтверждены прямым запросом к этой странице.
7. **Magentic в Microsoft Agent Framework** (`MagenticBuilder`, `max_round_count`, `max_stall_count`,
   `max_reset_count`) — `py_compile` OK; поля журнала прогресса `IsRequestSatisfied`, `IsInLoop`,
   `IsProgressBeingMade`, `NextSpeaker`, `InstructionOrQuestion` и умолчания `enable_plan_review`/
   `RequirePlanSignoff` совпадают с `gaps.md:20,400` и `spec.md:206-211` дословно.
8. **Лимиты сабагентов в Claude Agent SDK** (`ClaudeAgentOptions`, `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`,
   `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`, `max_budget_usd`, `ResultMessage.subtype`,
   `total_cost_usd`) — `py_compile` OK. Прямой запрос к `code.claude.com/docs/en/agent-sdk/subagents`
   показал, что этот блок кода — **дословная копия** примера из раздела «Cap subagent depth,
   concurrency, and spend» живой документации, вплоть до комментариев.
9. **`.claude/workflows/audit-routes.js`** — `node --check` формально ругается на top-level `return`
   вне функции. Это не баг главы: прямой запрос к `code.claude.com/docs/en/workflows` показал, что
   это дословная копия примера «What the saved script looks like» из документации, где явно
   сказано: «The body is plain JavaScript with top-level `await`» — скрипт выполняется в
   нестандартном рантайме воркфлоу, а не как обычный ES-модуль. Ложное срабатывание синтаксического
   чекера, не ошибка в тексте.
10. **Создание координатора (Managed Agents, bash/curl)** — `bash -n` OK; поля `multiagent.type`,
    `agent_toolset_20260401`, `managed-agents-2026-04-01`, ограничения (1 уровень делегирования,
    ≤20 агентов в ростере, ≤25 одновременных тредов) совпадают с `gaps.md:280-320` дословно.

### Рисунки

Все 15 (`fig-writers-readers`, `fig-kim-topologies`, `fig-kim-bench`, `fig-decompose`, `fig-mast`,
`fig-handoff`, `fig-fork`, `fig-advisor`, `fig-magentic`, `fig-gmas`, `fig-workflow-replay`,
`fig-managed`, `fig-otel`, `fig-tokens`, `fig-decision`) просмотрены на скриншотах
(`_qa/13-multi-agent-code/*.png`). Ни одного нечитаемого текста, наложения подписей или
несовпадения с описанием в подписи не найдено. Отдельно проверено:

- **`fig-kim-topologies` (рукописный SVG)** — направления стрелок совпадают с определениями `C` из
  статьи: Independent — однонаправленные стрелки к агрегатору, Centralized/Hybrid — двусторонние
  между Ω и агентами, Hybrid дополнительно пунктирные peer-рёбра, Decentralized — двусторонние
  все-со-всеми. Все числа (успех, ходы, ошибки ×) на диаграмме совпадают с Table 5 из `gaps.md`
  один в один.
- **`fig-kim-bench` (chart)** — числа по бенчмаркам (Finance-Agent 180,8%, PlanCraft 49,7–60,9% и
  т.д.) согласуются с диапазонами и «лучшими MAS» из `gaps.md:143-148` (пересчёт «+80,8%» → индекс
  180,8 при базе 100 корректен).
- **`fig-mast`** — все 14 процентов и порядок совпадают с `gaps.md` (v3, NeurIPS), включая сноску
  про расхождение 0,80%/0,85% для FM-2.4.
- **`fig-handoff`, `fig-advisor`, `fig-managed`, `fig-workflow-replay`, `fig-otel`** (mermaid
  sequence/flowchart) — порядок сообщений и участники проверены построчно против текста и
  документации; последовательность в `fig-workflow-replay` (A из кеша, B/C/D перезапускаются)
  точно соответствует правилу повтора workflow, подтверждённому живой документацией.
- **`fig-magentic` (stateDiagram-v2)** — переходы (план → ревью → выбор NextSpeaker → ход →
  журнал прогресса → счётчик застоя/реванш) соответствуют механике `max_stall_count`/
  `max_reset_count`, подтверждённой `gaps.md:20` и `spec.md:206-211`.
- **`fig-gmas` (chart)** — все пять цифр (52,6% / 44,4% / 23,1% / 21,2% / 4,6%) и заметка про
  «скрытые каналы +6,2%» подтверждены прямым запросом к первоисточнику (Habr, Сбер, 18 сентября
  2026): цифры и цитата «Самым эффективным механизмом оказался самый простой: вовремя остановиться»
  совпадают дословно. (Обратите внимание: `field.md` содержит только частичную/иначе агрегированную
  выжимку этих цифр — «early stopping −52,6%, graph pruning −27%» — это неполнота заметки, а не
  ошибка в тексте главы: глава явно пошла в первоисточник за полным набором механизмов.)
- **`fig-decision` (flowchart)** — ветки да/нет по каждому узлу проверены против текста раздела
  «Как выбрать топологию» — совпадают.

### Цитаты (проверены дословно по первоисточникам)

- behnamoh, HN, id=45097086 — совпадает дословно.
- colonCapitalDee, HN, id=45097287 — совпадает (ellipsis корректно отмечает пропуск).
- aabhay, HN, id=49317171 — совпадает дословно, включая фразу про «dumb» в «unstructured and
  unverifiable domains».
- cryptolobster, HN, id=49316271 (комментарий 49319341) — совпадает дословно.
- Цитата FrontierAI/Сбер (Виталий Белов, Хабр) про компиляцию графа в LangGraph и определения
  `RoleGraph`/`ExecutionPlan` — совпадают дословно (в теле статьи цитата `RoleGraph` сокращена без
  «начальную и конечную вершины» — это стилистическое усечение внутри связного текста, не искажает
  смысл; не считаю это находкой).
- Дата вступления A2A в Agentic AI Foundation («17 августа 2026») — соответствует резолюции
  противоречия C7 в `gaps.md`: это дата анонса AAIF, а не дата публикации собственного блога A2A
  (27 августа) — глава использует верную дату для того, что она описывает.

## Область не проверялась (вне роли ревьюера кода/рисунков)

Полнота охвата темы, дублирование с главой 12, объём главы (слова) и структурные правила
AUTHORING.md — вне мандата этой проверки (код, протокольные примеры, рисунки). Замечено попутно, что
в папке уже лежит `research/review-completeness.md` от другого прогона — не открывал его выводы как
инструкции, это данные соседнего ревью на другую тему.
