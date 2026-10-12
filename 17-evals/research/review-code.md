# Ревью главы 17 — код, протокольные примеры, рисунки

Дата: 30 сентября 2026. Ревьюер читал только `index.html` и `research/*.md`, ничего не правил.

Проверено: все 21 блок кода (py_compile для python, json.loads для JSON, сверка
имён методов/полей с `research/*.md` и там, где в заметках не было — с живыми доками через
WebFetch), все 16 рисунков (`qa.mjs --shots`, скриншоты открыты `Read`), ключевые числа в
графиках и тексте сверены построчно с `gaps.md`/`spec.md`/`practice.md`/`field.md`.

## Итог

`qa.mjs` вернул `ISSUES none`. На скриншотах ни одной сломанной mermaid-схемы, наложений
текста или несовпадения по смыслу со спецификацией и текстом не найдено. Из 21 блока кода
20 компилируются и разобраны корректно, содержат верные имена методов/полей и совпадают
(часто дословно, как и заявлено в `data-title`) с `research/gaps.md` или `research/spec.md`,
либо с живой документацией, если в заметках их не было. Единственная находка — ниже.

## Находки

### 1. Блок «Ragas: faithfulness в текущем классовом API» — код не компилируется как есть (minor)

**Где:** `index.html`, секция `#trajectory` → подраздел «Ответ опирается на найденное»,
`<script type="text/plain" class="code" data-lang="python" data-title="Ragas: faithfulness в текущем классовом API">` (строки 530–547).

**Что не так:** блок содержит `result = await scorer.ascore(...)` на верхнем уровне модуля,
вне `async def` и вне `asyncio.run()`. Как обычный `.py`-файл это не запускается:

```
$ python3 -m py_compile ragas_faith.py
  File "ragas_faith.py", line 9
    result = await scorer.ascore(
             ^^^^^^^^^^^^^^^^^^^^
SyntaxError: 'await' outside function
```

В отличие от других блоков главы, которые в такой ситуации явно помечены («не запускался»,
«Набросок») в `data-title` или соседним текстом, этот блок никак не предупреждает, что
`await` рассчитан на Jupyter/async-REPL, а не на прямой запуск скриптом — так его и
преподносит книга: «Ragas: faithfulness **в текущем классовом API**», без оговорки.

**Доказательство:** py_compile-ошибка выше (файл собран из блока построчно, без изменений).
Это не выдумка автора — я сверил тем же приёмом (WebFetch) страницу
`docs.ragas.io/en/stable/concepts/metrics/available_metrics/faithfulness/`, и сама
официальная документация показывает ровно тот же нативный `await` без обёртки и без
пояснения про асинхронный контекст. `research/spec.md:153-172` фиксирует это как
`VERBATIM code, [S25]` — то есть цитата из блока действительно дословная, вопрос только в том,
что ни глава, ни источник не предупреждают о SyntaxError при копипасте в скрипт.

**Как исправить:** добавить в `data-title` или соседнее предложение одну оговорку в духе
«код из примера в доках Ragas, рассчитан на Jupyter/асинхронный REPL — в обычном `.py`
оберни в `asyncio.run(main())`». Это единственное расхождение с правилом AUTHORING.md
«код, который ты не запускал, помечай как набросок или фразой в тексте» — в остальных
20 блоках это правило соблюдено.

## Что проверено и подтверждено верным (без находок)

- **`passk.py`** (raздел «Один прогон ничего не доказывает»): запустил дословно —
  `python3 passk.py` печатает `k=1 pass@k=0.750 pass^k=0.750`, …, `k=8 pass@k=1.000
  pass^k=0.333` — совпадает с комментариями в блоке и с формулами Inspect AI
  (`gaps.md:227-238`, `gaps.md:627`).
- **`calibrate.py`** (TPR/TNR): собрал синтетический `labels.jsonl`, подобранный под
  заявленные в тексте примеры (10 сбоев/8 поймано, 100 хороших/95 пройдено на dev; 40/40 на
  test) — вывод скрипта совпадает с комментариями в блоке день в день.
- **`gate.py`** (парный statgate-гейт): компилируется, логика SHIP/BLOCK/INCONCLUSIVE
  ведёт себя как в подписи рисунка на синтетических сценариях «без изменений» / «явная
  просадка» / «шум».
- **DIMENSIONS/TUPLES/PROMPT**, **judge() с tool_choice**, **pydantic-evals в pytest** —
  компилируются (`py_compile`), помечены в главе как наброски/непроверенный код там, где
  это уместно.
- **JSON**-блоки (`test_config.json` Google ADK, `gen_ai.input.messages`,
  `gen_ai.evaluation.result`) — валидный JSON (`json.loads` без ошибок).
- **API-имена сверены дословно с заметками (VERBATIM в `gaps.md`)**: `openevals
  create_trajectory_match_evaluator` и режимы `strict/unordered/superset/subset` +
  `tool_args_match_mode` (`gaps.md:77,273-282`); `pydantic_evals.evaluators
  ArgumentCorrectness/MaxToolCalls/MaxModelRequests` (`gaps.md:128,310-339`); `DeepEval
  Persona(characteristics=...)` вместо устаревшего `user_description` (`gaps.md:67-68,608`);
  `openevals create_llm_simulated_user/create_llm_as_judge/run_multiturn_simulation`
  (`gaps.md:379-391`); Google ADK `tool_trajectory_avg_score: 1.0` /
  `response_match_score: 0.8` (`gaps.md:360-372`).
- **Claude Code OTel-телеметрия** (переменные окружения и события в разделе «Свой Claude
  Code как объект наблюдения») в заметках отсутствовала — сверил напрямую с живой
  документацией `code.claude.com/docs/en/monitoring-usage` через WebFetch: все переменные
  (`CLAUDE_CODE_ENABLE_TELEMETRY`, `OTEL_METRICS_EXPORTER`, `OTEL_LOGS_EXPORTER`,
  `OTEL_EXPORTER_OTLP_PROTOCOL/ENDPOINT`, `OTEL_METRIC_EXPORT_INTERVAL`,
  `CLAUDE_CODE_ENHANCED_TELEMETRY_BETA`, `OTEL_TRACES_EXPORTER`, `OTEL_LOG_USER_PROMPTS`,
  `OTEL_LOG_ASSISTANT_RESPONSES`, `OTEL_LOG_TOOL_DETAILS`) и события `claude_code.tool_result`
  / `claude_code.api_request` с указанными полями (`tool_name`, `success`, `duration_ms`,
  `cost_usd`, токены) — совпадают день в день.
- **pydantic-evals «No span tree available»** — фразы не было в заметках; проверил через
  WebFetch страницу `pydantic.dev/docs/ai/evals/evaluators/agentic/`: точная фраза `'No span
  tree available.'` и указание на конфигурацию logfire подтверждены.
- **Числа во всех 5 графиков (`chart`)** сверены построчно с источниками и совпадают
  точно: TB 2.0→2.1 (58.0/70.1, 63.0/70.7, 73.3/79.1, 55.1/54.8 — `gaps.md:542-545`);
  инфраструктурный шум Terminal-Bench 2.0 (5.8%/2.1%/0.5%, разрыв 6 п.п. — `spec.md:333`);
  τ-bench pass@k/pass^k по k (22.5%/20.0%/4.5% на k=4 — `spec.md:338`); имec-харнесс
  (все 6 пар цена/доля решённых — `gaps.md:562-565,636`); TB 2.1 vs 3.0 (все 12 значений и
  разрывы 9.2/4.9 vs 19.5/12.7 п.п. — `gaps.md:634,549`).
- **Числа в тексте**, отдельно перепроверенные: CORE-Bench 42%→95% и «96.12» против
  «96.124991…» (`practice.md:232`); τ³ banking_knowledge 37.37→46.39 и 30.67→39.43
  (`gaps.md:22,558,637`); METR 296 PR / 95 задач / 68% golden / +24.2 п.п. (SE 2.7) / дрейф
  9.6 п.п. в год (SE 5.5, значим на 10%) (`gaps.md:553-557`); Composo +9.8/+3.0/85.8%/13.5 п.п.
  (`gaps.md:263`, `field.md:161,196`); BrowseComp 1266 задач/11 контаминаций/2 «осознания
  eval'а»/40,5 млн токенов/0,24–0,87%/86,81→86,57% (`gaps.md:75`, `spec.md:334`); размеры
  разметки судьи 100–200/30–50/10–20–40–45–40–45% (`gaps.md:81`, `practice.md:99`); GEPA
  +6%/+20%/до 35× меньше роллаутов/AIME 46,6→56,6% при `max_metric_calls=150`
  (`gaps.md:134,569`); Jev $0,042 за млн токенов, «well under a second» (`gaps.md:568`);
  таблица SEM/CI на 50/100/200/500 задач (`gaps.md:212`, точное совпадение всех восьми чисел);
  степенной расчёт «≈2800 задач» (`gaps.md:220`, арифметика проверена: (1,96+0,84)²·2·0,16/0,03² ≈ 2788 ≈ «примерно 2800»).
- **Рисунки**: во всех 16 (`fig-tb21` … `fig-optimize-loop`) участники, направления
  стрелок, порядок сообщений и связь с текстом/спецификацией проверены на скриншотах и
  совпадают с описанием в подписи и в тексте раздела. Мermaid-диаграммы (8 шт.) собрались
  без ошибок, ни одна не ужалась до нечитаемого текста. Числа на графиках визуально
  совпадают с приведённым выше построчным сравнением.
