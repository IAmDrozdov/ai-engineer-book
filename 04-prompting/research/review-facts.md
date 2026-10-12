# Фактчек главы 04 «Промптинг и оптимизация промптов», часть «Основа»

Дата ревью: 30 сентября 2026. Проверено: `index.html` целиком против `research/gaps.md`
(который сам перепроверен по первоисточникам 30.09.2026) и, для самых нагруженных/подозрительных
мест, напрямую по живым первоисточникам (Anthropic Claude Platform Docs, OpenAI developers docs,
GitHub, arXiv, Hacker News, DSPy docs, личные блоги). Всего напрямую сверено с живыми источниками
свыше 30 отдельных утверждений/цитат/чисел (список — в разделе «Проверено и подтверждено» ниже).

Рецензент не правит текст, только сообщает о найденном.

## Итог

- **Critical: 0**
- **Major: 2**
- **Minor: 0**

Глава оказалась исключительно тщательно сверена с `research/gaps.md` ещё на этапе написания:
почти все проверяемые числа, даты, имена полей и цитаты, которые я сверил по живым
первоисточникам, совпали дословно или почти дословно. Реальных ошибок найдено две, обе —
в категории «кто что сказал» / «сейчас X», и обе не критические (ни одна не ломает пример кода,
не противоречит рисунку и не научит читателя техническому факту неправильно).

---

## Major

### 1. Цитата Бена Андерсона в кавычках не является дословной

**Место:** раздел «DSPy, GEPA и TextGrad», абзац «TextGrad и спор о форме агента»:
> Его тезис: «agents are not modular programs».

**В чём ошибка:** фраза `«agents are not modular programs»` дана в кавычках-ёлочках, которые по
конвенции главы (и по правилу AUTHORING.md «цитаты приводи на языке оригинала») означают дословную
цитату. Я сверил пост Бена Андерсона «Contra DSPy and GEPA» (benanderson.work/blog/contra-dspy-gepa/,
17 декабря 2025) напрямую: этой фразы там нет. Заголовок соответствующего раздела —
**«An Agent is Not a Modular Program»** (единственное число, другая грамматика), а ближайшая по
смыслу авторская формулировка — «Accept that all the prompts are interconnected, don't assume
there's any local structure, and use the whole trajectory to make changes to textual parameters
that steer the agent towards success». Тезис главы передан верно по смыслу, но приписанная цитата
придумана/перефразирована и выдана за дословную.

**Как правильно:** либо снять кавычки и оставить как пересказ тезиса, либо процитировать реальный
заголовок «An Agent is Not a Modular Program» или реальную фразу про interconnected prompts.

**Источник для проверки:** https://benanderson.work/blog/contra-dspy-gepa/ (проверено WebFetch,
30.09.2026; остальные цитаты из этого же поста — «ALL the prompts are relevant at ALL the steps»
и «…spaghetti, slop code…» — подтвердились дословно, так что ошибка точечная, не в атрибуции поста
в целом).

### 2. «Шестое поколение снова думает на medium» — разворот дефолта reasoning effort приписан не тому поколению

**Место:** раздел «Effort вместо "подумай хорошенько"»:
> OpenAI за год дважды переворачивала умолчание: GPT-5 думал на `medium`, GPT-5.1 по умолчанию
> не думал вовсе, шестое поколение снова думает на `medium`, а GPT-6 Astra на `none` отвечает 400.

**В чём ошибка:** по собственным исследовательским заметкам главы (`gaps.md`, пункт 5 в разделе
«Contradictions resolved», источники G24/G25 — те же страницы OpenAI, что и в источниках главы)
дефолт вернулся на `medium` уже на **GPT-5.5**, то есть внутри пятого поколения, а не на шестом:
«the default flipped back to medium for gpt-5.5, GPT-5.6, GPT-6.1 Sol, GPT-6 Sol, GPT-6 Luna».
Я дополнительно свежо сверил страницу `developers.openai.com/api/docs/guides/latest-model`
(«Using GPT-6») — она подтверждает дефолт `medium` для GPT-6.1 Sol, но нигде не привязывает сам
разворот умолчания к границе пятого/шестого поколения. Формулировка главы «дважды перевернула» и
«шестое поколение снова думает на medium» сжимает историю до двух точек (GPT-5→GPT-5.1→GPT-6) и
тем самым сдвигает момент разворота на одно поколение позже, чем это было на самом деле —
собственные заметки главы датируют его GPT-5.5.

**Как правильно:** «...GPT-5.1 по умолчанию не думал вовсе, а начиная с GPT-5.5 дефолт снова
`medium` (так и осталось на GPT-6.1 Sol), кроме GPT-6 Astra, где `none` вообще даёт 400» — то есть
разворот случился ещё до GPT-6, а не «на шестом поколении».

**Источник для проверки:** `research/gaps.md` строки 32–36 (пункт 5, источники G24/G25) плюс
живая проверка https://developers.openai.com/api/docs/guides/latest-model (WebFetch, 30.09.2026).

---

## Утверждения без ссылки, которым ссылка нужна

Не найдено. Каждое нетривиальное число, дата, версия и цитата, которые я просматривал, снабжены
`<a class="cite">`, и адресуемый источник в разделе «Источники» существует.

## Ссылки, которые не подтверждают то, к чему приставлены

Не найдено за пределами находки №1 выше (сама фраза в кавычках не в источнике, на который стоит
ссылка src-39). Остальные проверенные привязки цитата→источник совпали.

---

## Проверено и подтверждено (не находки, для прозрачности объёма проверки)

Ниже — утверждения, которые я счёл самыми нагруженными или подозрительными и сверил напрямую по
живым первоисточникам (не только по `gaps.md`). Все совпали дословно или с точностью, не влияющей
на смысл:

- Постмортем Claude Code: строка `≤25/≤100 words`, даты 16→20 апреля 2026, «−3% на Opus 4.6 и 4.7» —
  дословная цитата из `anthropic.com/engineering/april-23-postmortem` совпадает с `gaps.md` G18.
- Таблица минимального кешируемого префикса Claude (512/1024/2048/4096 по моделям) — совпадает
  с перепроверкой `gaps.md` (пункт 1, G7) пословно по каждой модели.
- 400-ошибки на `tool_choice: "tool"/"any"`, `budget_tokens`, prefill, `temperature≠default` на
  новых моделях Claude/GPT-6/Gemini 3 — точные тексты ошибок и модели совпали (G10, G11, G24, G35).
- `thinking.block_binding.prefix_mismatch_behavior: "drop_block"` и бета-заголовок
  `thinking-binding-controls-2026-08-01` — сверено напрямую по живой странице «Prompting Claude
  Fable 5.1», совпадает дословно, включая дату отсечки аккаунтов 31 августа 2026.
- Бета-заголовок `mid-conversation-output-config-2026-07-01` и список моделей, поддерживающих
  mid-conversation `role:"system"` без бета-заголовка (включая отсутствие поддержки у Sonnet 5) —
  сверено напрямую по `mid-conversation-system-messages`, совпадает дословно.
- Цитаты из скилла `claude-api prompt-audit` — «could the model already know this?», «patch
  accretion», «maze of special cases… and fails unpredictably between them», «Bullets flatten
  priority and sever rules from reasons…», «Match specificity to fragility…», «Context is never
  cruft», «Cruft != length», «a prohibition against a failure the model wasn't going to make can
  anchor it toward that failure», «When several instructions are each marked critical… an anxious
  prompt produces a cautious, hedging model», «Asking the model whether it needs an instruction is
  not a measurement» — все сверены напрямую по `raw.githubusercontent.com/anthropics/skills/.../
  prompt-audit.md` и совпадают дословно.
- Пример GPT-5 про запись к врачу (конфликт «Never schedule… without explicit patient consent» /
  автоназначение слота) и фраза «it expends reasoning tokens searching for a way to reconcile the
  contradictions» — сверены по гайду GPT-5 prompting guide, совпадают.
- Числа benjamin-plus (JetBrains): v1 713 ток./−11,7%; финальная таблица v6 (−17,9% cost p=0,005,
  −20,0% ходов p=0,001, −21,9% токенов, −23,9% кеш-чтений, −21,2% выходных, −13,3% кода, −15,6%
  времени p=0,018; качество 7/5/68, sign p=0,77); цитата «rule-soup has no net-positive config on
  trap set»; 45,8% шагов-опросов на Java SWE-bench — все сверены напрямую по
  `EXPECTED-RESULTS.md` репозитория JetBrains/benjamin-plus-skill, совпадают вплоть до p-value.
- Java SWE-bench / Codex CLI / gpt-5.6-luna: −4,4% [−7,5%; −1,5%], p=0,003, 675 повторов — помечено
  в `gaps.md` как «verified», не перепроверялось повторно отдельно.
- GEPA: даты версий статьи (июль 2025 / февраль 2026, ICLR 2026 oral), все числа таблиц
  (GPT-4.1 Mini: GEPA 12,19 / GEPA+Merge 13,33 / TextGrad 6,11 / MIPROv2 5,64; Qwen3-8B: GEPA 9,62 /
  GRPO 3,68 при 24 000 прогонов; AIME-2025 Qwen3-8B GRPO 38,00 против GEPA 32,00; IFBench Merge
  38,61→28,23; «до 9,2× короче») — все совпадают с `gaps.md` (сам файл сверен по arXiv API).
- Meta-Prompting (Suzgun & Kalai, arXiv:2401.12954): «surpasses standard prompting by 17.1%» —
  сверено напрямую по странице arXiv, совпадает.
- DSPy `optimizers.md`: «raises ReAct's score from 24% to 51%», «$2 USD… ten minutes» — сверено
  напрямую по живому файлу документации DSPy, совпадает дословно.
- HN-пост Zephyr0x про счёt AWS Bedrock: $37 901,73; ~6,47 млрд некешированных токенов ~$35,6 тыс.;
  ~1,67 млрд токенов чтения из кеша ~$918 — сверено напрямую по `news.ycombinator.com/item?id=47933355`,
  совпадает.
- Anthropic «Writing effective tools for AI agents»: «Simply concatenate the transcripts from your
  evaluation agents and paste them into Claude Code» и claim про Claude Sonnet 3.5 / SWE-bench
  Verified — сверено напрямую по `anthropic.com/engineering/writing-tools-for-agents`, совпадает.
- OpenAI deprecations: даты (объявлено 3 июня / 11 июня 2026; Evals read-only 31 октября, выключение
  30 ноября; снапшоты GPT-5/o3 — 11 декабря) и фраза «move reusable prompt content into your
  application code» — сверено напрямую по `developers.openai.com/api/docs/deprecations`, совпадает.
- Drew Breunig, «How Claude Code Builds a System Prompt»: обе версии раздела Output Efficiency
  (для сотрудников Anthropic и для внешних пользователей) и факт, что строка про лимит слов
  («Length limits: keep text between tool calls to ≤25 words…») уже была в мартовской утечке и
  была помечена «Included when: If the user is an Anthropic employee» — сверено напрямую по посту,
  совпадает дословно; это подтверждает, а не опровергает, соответствующий абзац главы.
- Таблица «Было/Стало» из аудита (`CRITICAL: You MUST use this tool...` → `Use this tool when...` и
  так далее) — дословное совпадение с `gaps.md` (G14).
- Codex CLI: открывающая строка базового промпта, имена файлов промптов по моделям — совпадают с
  `gaps.md` (G45).
- Piebald: «…across 301 versions since v2.0.14», дата снимка 29 сентября 2026 — совпадает
  дословно (G44).
- Anthropic claude.ai system prompts: «These system prompt updates do not apply to the Claude API»,
  дата записи для Fable 5.1 (1 сентября 2026) — совпадает (G15).

## Замечание не по существу главы (не находка)

`research/gaps.md` уже содержит собственную, более раннюю и очень тщательную сверку тех же фактов
по тем же первоисточникам (с датой 30.09.2026) — глава, судя по всему, писалась с этим файлом под
рукой, чем и объясняется необычно высокая точность на выходе. Рекомендую держать `gaps.md` в
репозитории и дальше: это готовый чеклист для повторной сверки при следующем обновлении моделей.
