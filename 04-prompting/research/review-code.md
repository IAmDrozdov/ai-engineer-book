# Рецензия: код, протокольные примеры и рисунки — глава 04 «Промптинг и оптимизация промптов»

Дата ревью: 30 сентября 2026. Ревью независимое: главу не писал, заново вытащил и перепроверил
код, JSON, XML и все рисунки сам, не полагаясь на прежние версии этого файла.

Проверено: все 24 блока `<script class="code">` (5 python, 7 json, 1 xml, 1 bash, 1 output,
9 prompt/text), 4 встроенных JSON-графика, все 15 рисунков (2 svg, 6 mermaid, 3 html, 4 chart)
через `node tools/qa.mjs 04-prompting --shots --out .../04-prompting-code`, скриншоты прочитаны
глазами. Python прогнан через `python3 -m py_compile` (5/5 OK), JSON — через `json.load` (7/7 OK,
плюс 4 встроенных графика, которые тот же `qa.mjs` парсит при рендере — `ISSUES none`), XML —
через `xml.etree.ElementTree.parse`. Числа и имена сверены с `research/gaps.md`, `field.md`,
`practice.md`, `spec.md`; для двух самых рискованных фактов (пример MIPROv2 для ReAct-агента и
порядок разделов в разборе Брюнига) заметок оказалось недостаточно для полной уверенности, и я
дополнительно сверился напрямую с живым источником (`raw.githubusercontent.com/stanfordnlp/dspy`,
`dbreunig.com`) — оба подтвердились посимвольно, см. ниже.

Итог: `node tools/qa.mjs` вернул `ISSUES none`. Критических находок нет. Одна структурная находка
(major): рисунки ни разу не связаны с текстом ссылкой, вопреки прямому требованию инструкции.
Остальное — по категориям ниже.

## Находки

### 1. [major] Ни один из 15 рисунков не связан с текстом ссылкой `<a href="#fig-...">`

**Что не так.** `_meta/AUTHORING.md`, раздел 6, строка 258, формулирует это как императив:
«В тексте ссылайся: `<a href="#fig-handshake">на схеме рукопожатия</a>`». В
`04-prompting/index.html` такой ссылки нет ни разу:

```
/usr/bin/grep -c 'href="#fig-' index.html   → 0
/usr/bin/grep -n '#fig-' index.html          → нет совпадений (exit 1)
```

Проверено по всем 14 текстовым id (`fig-bp-v6` не ловится этим regex из-за цифры в имени, но её
отсутствие в списке ссылок подтверждено тем же общим grep по `#fig-`, который не находит вообще
ничего): `fig-anatomy`, `fig-turn-scoped`, `fig-altitude`, `fig-bp-ladder`, `fig-bp-v6`,
`fig-params`, `fig-release`, `fig-prefix`, `fig-min-prefix`, `fig-cache-diag`, `fig-debug`,
`fig-gepa-loop`, `fig-gepa-mini`, `fig-gepa-qwen`, `fig-cc-assembly`. Рисунки стоят в тексте
следующим блоком после абзаца, без фразы вида «на схеме ниже» или «(см. рисунок)» со ссылкой на
якорь.

**Почему это важно.** Содержание рисунков верно (см. ниже) — это не фактическая ошибка, а
структурная дыра. Читатель нигде не получает явного «смотри рисунок N» в момент обсуждения того,
что рисунок иллюстрирует. При беглом чтении часть рисунков (например, `fig-debug` — дерево «с
какого инструмента начинать отладку», или самый насыщенный рисунок главы, `fig-cc-assembly») легко
пропустить: ничто в прозе явно не отправляет к ним. `tools/qa.mjs` этого не ловит — он проверяет
битые ссылки на существующие `#fig-`, а не отсутствие ссылок на существующие рисунки.

**Как исправить.** В подходящем месте каждого раздела — фразу-отсылку с якорем, например: после
абзаца про поля запроса (конец §4.1, перед `<figure id="fig-anatomy">`, строка 66) — «...смотри на
<a href="#fig-anatomy">схеме полей запроса</a>»; аналогично для остальных 14. Правка чисто
текстовая, кода и разметки самих рисунков не касается.

**Доказательство.** `/usr/bin/grep -n '#fig-' /Users/sato/pets/ai-engineer-book/04-prompting/index.html`
не возвращает ничего.

## Проверено и не вызывает вопросов

### Код

- **Python (5 блоков, строки 13, 14, 17, 18, 19 из моей нумерации блоков)** — два «Наброска»
  (`prompts/support_reply.py`-стиль модуль и двухуровневая проверка) и три примера из документации
  DSPy (сигнатуры, `MIPROv2` для ReAct-агента, метрика `dspy.GEPA`). Все пять скомпилировались
  `python3 -m py_compile` без ошибок. Оба «Наброска» помечены `data-title="Набросок: …"`, как того
  требует `AUTHORING.md` §4.
  - Блок сигнатур DSPy (`dspy.Predict`, `dspy.Signature`/`InputField`/`OutputField`) — посимвольное
    совпадение с VERBATIM-фрагментом в `research/practice.md:156-175`.
  - Блок метрики `dspy.GEPA` (`measure_quality`/`measure_privacy`/`objective_scores`/
    `frontier_type`) — посимвольное совпадение с VERBATIM-фрагментом `research/gaps.md:520-529`.
  - Блок `MIPROv2` для ReAct-агента подписан «пример из документации DSPy» без пометки «набросок»
    — и это обосновано: в локальных заметках дословного соответствия нет (только общая строка в
    `spec.md:484`), поэтому я сверился напрямую с живой документацией
    (`raw.githubusercontent.com/stanfordnlp/dspy/main/docs/docs/learn/optimization/optimizers.md`,
    раздел «Optimizing prompts for a ReAct agent») — код совпадает построчно, включая
    `dspy.ColBERTv2(url='http://20.102.90.50:2017/wiki17_abstracts')`, `HotPotQA(train_seed=2024,
    train_size=500)` и вызов `dspy.MIPROv2(metric=dspy.evaluate.answer_exact_match, auto="light",
    num_threads=24)`. Цифры в тексте рядом («с 24% до 51%», «порядка $2 и около десяти минут»)
    тоже дословно совпадают с «An informal run similar to this on DSPy 2.5.29 raises ReAct's score
    from 24% to 51%» и «A typical simple optimization run costs on the order of $2 USD and takes
    around ten minutes» из того же источника. Автор нашёл и проверил источник сам, как требует
    AUTHORING.md §4, а не выдумал цифру.
- **JSON, протокольные примеры (7 блоков)** — запрос с mid-conversation system message, `clear_at`,
  классификатор «было/стало» (оба набросочных варианта помечены), ответ с `cache_miss_reason`,
  описания тула «до/после» (оба набросочных варианта помечены). Все распарсились `json.load` без
  ошибок. Запрос с mid-conversation system message и `clear_at`-напоминание сверены построчно с
  VERBATIM-блоками `research/gaps.md:306-328` — совпадают дословно, включая порядок полей и текст
  напоминания.
- **JSON, встроенные графики (4 блока: `fig-bp-v6`, `fig-min-prefix`, `fig-gepa-mini`,
  `fig-gepa-qwen`)** — валидный JSON (рендерится `qa.mjs` без ошибок). Числа сверены с источником:
  - `fig-bp-v6` (лестница и итог benjamin-plus v6) — все 8 метрик и p-value совпадают с VERBATIM-
    таблицей `research/field.md:139-147` (−17,9% cost p=0.005, −20,0% turns p=0.001, −21,9% tokens,
    −23,9% cache reads, −21,2% output tokens p=0.007, −13,3% code p=0.006, −15,6% wall-clock
    p=0.018, качество 7↑/5↓/68 tie). Лестница v1→v6 тоже совпадает построчно с той же таблицей
    (`field.md:130-134`).
  - `fig-min-prefix` (минимальный кешируемый префикс по моделям) — 512/1024/2048/4096 токенов по
    моделям совпадают с исправленной версией из `research/spec.md:612-614`, которую `gaps.md:11-14`
    прямо называет верной против расходящихся черновиков в `practice.md`/`field.md` (в частности,
    глава верно относит Haiku 4.5 к 4096, а не к 512, как ошибочно написано в `practice.md:259` —
    автор использовал разрешённую версию конфликта, а не устаревшую).
  - `fig-gepa-mini`/`fig-gepa-qwen` (прирост GEPA против MIPROv2/TextGrad/GRPO) — все значения
    (GEPA+Merge 13.33, GEPA 12.19, GEPA-Qwen-Opt 9.00, TextGrad 6.11, MIPROv2 5.64, MIPROv2 без
    примеров 4.11, Trace 3.27; GEPA 9.62, GEPA+Merge 7.17, GRPO 3.68, MIPROv2 2.61) совпадают
    посимвольно с `research/gaps.md:503-514`.
- **XML-пример** («несколько документов», строки 241–258) — содержит `<documents>…</documents>` и
  вслед за ним обычный текст инструкции («Analyze the annual report…») в одном блоке. Это
  посимвольно совпадает с примером из практики Anthropic и с `research/spec.md`/`practice.md`, и
  именно так — XML-данные плюс инструкция ниже — реальный гайд Anthropic и показывает пример как
  цельное сообщение пользователя, а не как отдельный XML-документ. Уточнение к методике: блок как
  целое не проходит `xml.etree.ElementTree.parse` («junk after document element» на строке с
  текстом после `</documents>`) — это ожидаемо для смешанного блока «XML-тег + текст инструкции» и
  не является дефектом главы: сама разметка `<documents>` внутри валидна, а `data-lang="xml"` в
  `AUTHORING.md` §5 обозначает подсветку синтаксиса, а не обязательство блока быть отдельным
  well-formed XML-документом.
- **Bash-регэксп** («Набросок: где в своих инструкциях давление», строка 334) — валиден по
  синтаксису; логика (поиск `CRITICAL/MUST`, `try to`, `at most N words`, `every N tool calls`)
  соответствует тексту вокруг блока.
- **Цитаты чужих системных промптов** (Codex CLI `default.md`, Cursor `cursor.md`, снимок Claude
  Code/Opus 5.5) — сверены с `research/field.md` (VERBATIM-блок) и `research/gaps.md` (G45),
  включая таблицу уровней effort и формулировку про авторизованное security-тестирование —
  совпадают.

### Рисунки (по скриншотам `_qa/04-prompting-code/*.png`, `node tools/qa.mjs --shots`, `ISSUES none`)

- **fig-anatomy, fig-prefix** (svg) — порядок полей запроса (`tools → system → messages`,
  `assistant·tool_use → user·tool_result → system → system·clear_at → user`) и авторство голоса
  (оператор/пользователь/модель/данные) соответствуют тексту и диаграмме-кандидату
  «actors: operator code, system/developer, tools, messages…» из `research/gaps.md:727`.
- **fig-turn-scoped, fig-cache-diag, fig-debug, fig-gepa-loop** (mermaid) — участники, направление
  стрелок и порядок сообщений соответствуют механизму, описанному в тексте: жизненный цикл
  `clear_at` (дописано → видно модели → очищено 0 токенов → удалено/переписано — промах кеша),
  диагностика по `previous_message_id`/`cache_miss_reason: system_changed`, дерево отладки по
  симптому, цикл GEPA (Парето-фронт → кандидат → Task LM → трассы+score+feedback → Reflection LM →
  новый кандидат → сравнение на мини-батче → обновление фронта или откат). Цикл GEPA сверен с
  `research/gaps.md:733` и совпадает по составу шагов.
- **fig-params** — пять стрелок «параметр API → 400 на моделях → текстовая замена» (prefill,
  `tool_choice:any/tool`, `temperature`, `thinking.budget_tokens`, `thinking:disabled`) совпадают
  построчно с готовой спецификацией диаграммы в `research/gaps.md:730-732` и с миграционными
  заметками `gaps.md:135-145` (модели, коды ошибок, замены).
- **fig-cc-assembly** (mermaid, самая насыщенная схема главы) — порядок узлов `core → eff → b →
  sess → mem → mcpi → out` перепроверен напрямую по первоисточнику
  (`dbreunig.com/2026/04/04/how-claude-code-builds-a-system-prompt.html`, дата публикации
  подтвердилась как «4 апреля 2026» — совпадает с подписью рисунка). В статье реальный порядок
  разделов: роль/правила/тон (до строки 445) → Output Efficiency (445) →
  `__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__` (680) → Session Guidance: Ask User/Shell/Agent/Explore-
  Plan/Skills/Verification (712–2089) → Memory Prompt (2435) → Ant Model Override (2637) →
  Environment Info (2846) → Language (2919) → Output Style (3121) → MCP Server Instructions (3324).
  Рисунок сворачивает Memory/Environment/Language/Output Style в один узел `mem` и не показывает
  отдельно «Ant Model Override» — упрощение состава, но порядок оставшихся узлов (core, eff,
  boundary, session, mem-группа, mcp, итог) нигде не переставлен местами и не противоречит
  источнику.
- **fig-altitude, fig-bp-ladder, fig-release** (html versus/pipeline) — состав шагов совпадает с
  текстом (лестница версий benjamin-plus 15–16 августа 2026 года, пайплайн выкатки промпта:
  PR-ревью → evals по каждой модели → абляция по строкам → гейт по модели → выдержка → постепенная
  выкатка).
- **fig-bp-v6, fig-min-prefix, fig-gepa-mini, fig-gepa-qwen** (chart) — числа и подписи осей
  проверены выше в разделе «Код» (это те же JSON-блоки).

Ни расхождений между схемой и текстом, ни расхождений между схемой и заметками не найдено.
