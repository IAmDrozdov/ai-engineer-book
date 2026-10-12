# Фактчек главы 17 «Метрики, evals и приёмочные тесты» (часть «Продакшен»)

Проверялись: все проверяемые утверждения главы (версии, даты, числа, цитаты, имена полей/событий,
«текущее состояние») сверены с `research/gaps.md`, `spec.md`, `practice.md`, `field.md`; наиболее
нагруженные и подозрительные места (≈35 пунктов: все прямые цитаты в кавычках-ёлочках, все числовые
таблицы и графики, YAML/код-примеры, имена атрибутов OTel, версии библиотек) дополнительно
перепроверены по живым источникам — arXiv-абстракты (τ-bench 2406.12045, GEPA 2507.19457, Composo
2604.13717), Anthropic engineering (`demystifying-evals-for-ai-agents`, `writing-tools-for-agents`),
документация pydantic-evals (`docs/evals/evaluators/agentic.md` в `pydantic/pydantic-ai`), Google ADK
(`docs/evaluate/index.md`), OpenTelemetry `semantic-conventions-genai` (agent-spans, events),
LangSmith docs, Terminal-Bench блог (TB 2.1, Leaderboard Integrity Update). Дата проверки: 30 сентября
2026.

**Итог: глава фактически очень аккуратна.** Из ≈35 живых перепроверок 34 подтвердили точное
совпадение (числа, даты, формулы, цитаты, имена полей). Найдена одна воспроизводимая ошибка уровня
major и одна шероховатость уровня minor. Ложных находок не выдумывалось: там, где проверка прошла,
это явно указано ниже.

---

## Major

### 1. Выдуманная/дополненная цитата про поведение span-грейдеров pydantic-evals

**Файл:** `17-evals/index.html`, строка 703 (раздел «Приёмочные тесты в CI», подраздел «pydantic-evals
в pytest»).

**Цитата из главы:**
> Оценщики по спанам вроде `ArgumentCorrectness` без настроенной инструментации не пропускаются, а
> проваливаются с причиной «No span tree available — ensure logfire/instrumentation is configured».

**В чём ошибка.** Такой строки нет ни в документации pydantic-evals, ни в её исходниках. Проверено
живьём в `pydantic/pydantic-ai`, файл `docs/evals/evaluators/agentic.md` (raw, 30.09.2026):

- Реальный текст о деградации встроенных оценщиков — общее описание, без конкретной строки:
  «If spans aren't available, each evaluator returns a failing result (`False` for the boolean
  evaluators, `0.0` for `TrajectoryMatch`) with **a reason pointing at logfire configuration**,
  rather than raising.»
- Буквальная строка `'No span tree available.'` в файле действительно встречается — но это код внутри
  примера **самодельного** оценщика (`TrajectoryJudge`), который читатель документации пишет сам,
  ловя `SpanTreeRecordingError`, с комментарием «Degrade gracefully, **like** the built-in
  evaluators on this page» — то есть это не сообщение встроенных `ArgumentCorrectness` /
  `ToolCorrectness` / `TrajectoryMatch`, а иллюстрация из чужого примера, которую глава приписала
  штатному поведению.
- Хвост «— ensure logfire/instrumentation is configured» не встречается в источнике вообще, в
  каком-либо виде.

Получилась цитата в кавычках-ёлочках (в книге это формат прямой цитаты, ср. `AUTHORING.md`, п.4:
«Выдумывать… цитаты нельзя»), которая наполовину взята из чужого фрагмента кода, а наполовину
дописана. Читатель, который будет грепать логи в поисках именно этой строки после ошибки
инструментации, её не найдёт.

**Как правильно.** Либо снять кавычки и пересказать своими словами («грейдер возвращает `False` с
причиной, указывающей на проблему конфигурации logfire, вместо падения»), либо процитировать реальную
строку `'No span tree available.'` и explicitly пометить, что это пример из документации, а не текст
самих встроенных оценщиков.

**Доказательство:**
https://raw.githubusercontent.com/pydantic/pydantic-ai/main/docs/evals/evaluators/agentic.md
(строки ~10–20 — общее описание деградации; строка ~291 — `EvaluationReason(value=False, reason='No span tree available.')` внутри пользовательского примера `TrajectoryJudge`).

---

## Minor

### 2. Подпись «сокращено» у YAML-примера Anthropic не соответствует действительности

**Файл:** `17-evals/index.html`, строка 65 (`data-title="Задача для кодового агента (из статьи
Anthropic, сокращено)"`).

Живой текст статьи Anthropic «Demystifying evals for AI agents» (проверено WebFetch, 30.09.2026)
даёт ровно тот же YAML-пример один в один, без пропусков — совпадают `id`, `desc`, все пять
грейдеров и оба `tracked_metrics`. Разница только в форматировании: у Anthropic список метрик
записан построчно, в главе — в одну строку через `[…]`; это эквивалентный YAML, а не сокращение
содержания. Подпись «сокращено» подразумевает, что часть примера убрана, чего не произошло —
формально это тот же случай, о котором `AUTHORING.md` просит не путать «набросок/сокращение» с
дословной цитатой. Само содержание блока при этом верно и полностью соответствует первоисточнику —
править стоит только подпись (убрать «сокращено» или заменить на что-то вроде «переформатировано»).

**Доказательство:** https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
(раздел с примером задачи `fix-auth-bypass_1`).

---

## Утверждения без ссылки, которым ссылка нужна

Не найдено. Подраздел «Свой Claude Code как объект наблюдения» (переменные `CLAUDE_CODE_ENABLE_TELEMETRY`,
события `claude_code.tool_result`/`claude_code.api_request` и т. д.) в четырёх заметках вообще
отсутствует и приведён без ссылки на `code.claude.com`, хотя источник `src-36` в разделе «Источники»
на него ссылается и по существу подтверждает текст (переменные, события и их поля проверены живьём и
совпадают дословно) — то есть ссылка есть и корректна, просто заметки её не готовили. Отдельно
упоминать как проблему нет оснований.

## Ссылки, которые не подтверждают то, к чему приставлены

Не найдено. Из примерно 35 живых перепроверок цитат/чисел с их номерами источников все указывают на
источник, который действительно содержит процитированный или пересказанный факт (включая менее
очевидные случаи: src-8 для «SemIf и Jev» у LangSmith, src-33 для «percent < 0» у Медведева, src-14
для чисел Юджина Яна о смещениях судей, src-44 для авторства K. Aizawa).

## Что проверено и подтвердилось точным (для протокола, не находки)

- Даты и версии бенчмарков: TB 2.0→2.1→3.0→4.0 (2025-11-07/2026-05-06/07-30/08-28), включая точные
  числа 58,0→70,1% и т. д.; SWE-bench Pro V1→V2 (731→642, 89/529/214/38, HARD-51, locked protocol);
  τ³-bench 1.0.0 vs 1.0.1 (различие в объёме фиксов, дата 2026-07-15, цифры 37,37→46,39 и
  30,67→39,43); OSWorld 2.0 vs OSWorld-Pro (разные проекты, оба датированы и процитированы верно, а
  ловушка «12,24%/72,36%» из OSWorld 2024 года прямо помечена как историческая).
- Формула pass@k/pass^k и её код (`passk.py`) — все промежуточные числа в комментариях (0.750, 0.917,
  0.583, 0.995, 0.410, 1.000, 0.333) пересчитаны вручную и совпадают.
- Таблица доверительных интервалов (n=50/100/200/500 → ±11,1/7,8/5,5/3,5 п.п.) и оценка мощности
  (≈2800 задач) пересчитаны и совпадают с источником (Anthropic, «A statistical approach to model
  evaluations»).
- τ-bench Airline Pass¹–⁴ (Claude 3.5 Sonnet 46,0/32,6/26,3/22,5; GPT-4o 42,0/27,3/22,0/20,0) и цитата
  «succeed on <50% of the tasks… pass^8 <25% in retail» — сверены с абстрактом arXiv:2406.12045,
  включая точный символ `pass^8` (а не `pass@8`, как ошибочно у practice.md в паре мест — сама глава
  символ не перепутала).
- GEPA: 46,6→56,6% на AIME 2025, «+6%/до 20% над GRPO при 35× меньше роллаутов», «>10% над MIPROv2» —
  сверены с абстрактом arXiv:2507.19457 дословно.
- Composo: +9,8pp/5×цена (k=8), +3,0pp/почти бесплатно (одна фраза критерия), 85,8%/+13,5pp «вместе»
  — сверено с абстрактом arXiv:2604.13717.
- Цитаты Anthropic (`demystifying-evals-for-ai-agents`, `writing-tools-for-agents`) — все проверенные
  фрагменты («we do not take eval scores at face value…», «grade what the agent produced, not the
  path it took», пример Jane/jane@acme.corp, `while`-loops, held-out test sets, авторство K. Aizawa)
  совпадают дословно с текстом статей.
- Google ADK: `tool_trajectory_avg_score: 1.0`, `response_match_score: 0.8`, ROUGE-1, «not supported
  in combination with User Simulation» — сверено с `docs/evaluate/index.md` дословно.
- pydantic-evals «Agentic Evaluators»: правила подсчёта (неудачные вызовы не считаются кроме
  `MaxToolCalls`, отложенные — никогда, вложенные сабагенты — считаются), цитата про нативные
  инструменты провайдера («don't produce local spans…») — сверено дословно (см. также находку №1
  выше про единственную неточную цитату оттуда же).
- OTel GenAI: переименование `gen_ai.system`→`gen_ai.provider.name` и перенос истории чата в
  v1.37.0 (2025-08-25), событие `gen_ai.evaluation.result` в v1.38.0 (2025-10-29, поле
  `gen_ai.evaluation.name` — Required, остальные опциональны), переезд конвенций в отдельный
  репозиторий в v1.42.0 (2026-06-16), пример сообщений (Paris/get_weather/`call_VSPygqKTWdrhaFErNvMV18Yl`)
  — всё сверено дословно с `semantic-conventions-genai` и с CHANGELOG/releases.atom основного репо.
  Имена спанов `create_agent`/`invoke_agent`/`invoke_workflow`/`plan`/`execute_tool` и атрибуты
  `gen_ai.skill.name`/`.description`/`.source.uri` — подтверждены.
- LangSmith: цитаты про auto-upgrade хранения трейса, недельный лимит с «Monday 12AM UTC», «only when
  you create the rule» — сверены дословно с `docs.langchain.com/langsmith/online-evaluations`.
- Terminal-Bench «Leaderboard Integrity Update»: OB-1 (зашифрованные решения в бинарнике, снят),
  ForgeCode (curl решений в AGENTS.md, обнулено), выгрузка `tests/` — сверено дословно; «Новых задач
  в ней не было» и «no task is unsolved in Terminal-Bench 2.1» — сверено дословно с постом о TB 2.1.
- Телеметрия Claude Code (переменные окружения, события `claude_code.tool_result`/`api_request`,
  дефолт `OTEL_METRIC_EXPORT_INTERVAL=60000`, флаги `OTEL_LOG_USER_PROMPTS`/`_ASSISTANT_RESPONSES`/
  `_TOOL_DETAILS` выключены по умолчанию) — сверено дословно с `code.claude.com/docs/en/monitoring-usage`,
  хотя тема отсутствует во всех четырёх заметках.
- Числа METR (296 PR / 95 задач / 3 репозитория / 4 мейнтейнера / ~68% базовый merge-rate / +24,2 п.п.
  (SE 2,7) / тренд 9,6 п.п. в год (SE 5,5)), BrowseComp eval awareness (11 из 1266, 9+2, 0,87%/0,24%,
  40,5 млн токенов, 86,81%→86,57%), Habr-источники (Демещенко: 17 839 пар/32,6%/85,3%/232/«0 false
  positives on 4,060 queries»; Медведев: `percent < 0`) — все совпадают с `gaps.md`/`field.md` и не
  расходятся между собой.

## Категории проверенных утверждений (для полноты)

- **Версии и даты:** TB (1.0–4.0), SWE-bench Pro (v1/V2), τ-bench→τ²→τ³ (1.0.0/1.0.1), OSWorld
  2.0/OSWorld-Pro, OTel semconv (v1.37.0/1.38.0/1.42.0), OpenAI Evals sunset (03-09/06-03/10-31/11-30),
  версии библиотек на 30.09.2026 (pydantic-evals 2.52.0, Inspect AI 0.3.273, DeepEval 4.2.7, promptfoo
  0.123.1, openevals 0.2.0, Ragas 0.4.3, Langfuse 4.16.0/платформа v4, LangSmith 0.14.2, Arize Phoenix
  20.16.0, Weave 0.53.11, Braintrust 0.43.0, Logfire 5.1.1) — расхождений не найдено.
- **Поля, методы, события, формы сообщений:** `gen_ai.*` атрибуты и события, YAML-грейдеры Anthropic,
  API pydantic-evals/openevals/promptfoo/DeepEval/Google ADK, код Claude Code telemetry — расхождений
  не найдено, кроме находки №1.
- **Числа и замеры:** все проверенные таблицы/графики (TB 2.0→2.1, TB 2.1→3.0, τ-bench pass^k, SE/CI,
  power analysis, imec harness cost, OSWorld, METR, Composo, GEPA, BrowseComp, Gleam/Habr dedup) —
  расхождений не найдено.
- **Кто что сказал/выпустил:** авторство и точный текст цитат Anthropic, Hamel Husain/Shreya Shankar,
  Dan Luu, HN-комментарии, Habr-авторы — расхождений не найдено, кроме находки №1 (там источник
  реальный, но цитата дополнена).
- **«Сейчас X»:** все формулировки текущего состояния («сейчас», «на 30 сентября 2026») снабжены
  датой или версией и совпадают с проверенным состоянием источников на эту дату.
