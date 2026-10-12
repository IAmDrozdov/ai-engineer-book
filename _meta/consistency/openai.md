# Сверка семейства фактов «OpenAI» по книге «Чеклист AI-инженера»

Дата сверки: 30 сентября 2026. Проверялись все 17 глав (`tools/prose.py` → построчный текст по
абзацам, `/usr/bin/grep -n` по ключевым словам семейства: Responses API, Chat Completions,
Assistants API, GPT-5.x/GPT-6 (Astra/Sol/Luna), reasoning_effort, prompt caching, Conversations
API, Agents SDK, Codex CLI, prompt optimizer, Open Responses, компакция). Найденные места сверены
по исходному HTML каждой главы (номера строк в `prose.py` сдвинуты относительно исходного файла
из-за вырезания `<script>`/`<svg>` перед подсчётом строк, поэтому все номера ниже — из `grep -n`
по самому `index.html`). Спорные места дополнительно сверены по первоисточнику через WebFetch:
`developers.openai.com/api/docs/models`, `.../guides/latest-model`, `.../docs/deprecations`,
`.../guides/prompt-caching`, `.../guides/conversation-state`, `.../guides/migrate-to-responses`.

Проверенные и **не** попавшие в отчёт кандидаты (для протокола, всё сходится с первоисточником и
между главами): дата анонса/отключения Assistants API — 26 августа 2025 → 26 августа 2026 (глава
01, совпадает с `developers.openai.com/api/docs/deprecations`: «On August 26th, 2025, we notified
developers… deprecation and removal… on August 26, 2026»); дата отключения снапшотов GPT-5/o3 — 11
декабря 2026, объявлено 11 июня 2026 (главы 01 и 04, совпадает с тем же источником); дата запуска
Responses API и Agents SDK — 11 марта 2025 (главы 01, 03, 07, 08, 10, 13 — везде одна дата, нигде
не встречается альтернативная); механика prompt caching для GPT-5.6+ (порог 1024 токена, округление
до 128, запись 1,25×, чтение 0,1× / 0,05× у gpt-6.1-sol, TTL 30 минут, до 4 точек кеша,
`prompt_cache_options.mode`) — глава 02, совпадает с `developers.openai.com/api/docs/guides/prompt-caching`
дословно; различие в TTL хранимых ответов (`previous_response_id` — 30 дней) и бесед без TTL —
глава 01, совпадает с `.../guides/conversation-state`; заявление «Chat Completions сама OpenAI
закрывать не планирует, даты нет» — глава 01, совпадает с `.../guides/migrate-to-responses`
(«Chat Completions remains supported»); даты объявления/отключения Evals, reusable prompt objects
и Agent Builder (3 июня 2026 → 30 ноября 2026) — совпадают между главами 01 и 04; версии Codex CLI
по датам инцидентов (0.144.5 → 0.146.0 → 0.159.2, все ≤ 30 сентября 2026) — хронологически
непротиворечивы между главами 12 и 16; `DEFAULT_MAX_TURNS = 10` у OpenAI Agents SDK — совпадает
между главами 01 и 13 (`RunState`/`max_turns` в главе 13 не противоречит).

## Находки

### 1. Глава 01: несуществующая модель «GPT-6 Sol» (без «.1») в описании Chat Completions

- **Файл**: `01-llm-api-agent-loop/index.html`, строка 156
- **Цитата**: «В гайде по GPT-6 сказано: «GPT-6 Astra and GPT-6.1 Sol support Chat Completions, but
  tool calling requires Responses»; GPT-6 Sol и GPT-6 Luna вызывают инструменты через Chat
  Completions только с `reasoning_effort: "none"`»
- **Проблема**: в линейке GPT-6 у OpenAI ровно три флагманские модели — GPT-6 Astra, GPT-6.1 Sol и
  GPT-6 Luna (подтверждено `developers.openai.com/api/docs/guides/latest-model`: «gpt-6-astra…
  gpt-6.1-sol… gpt-6-luna» — и отдельно `.../api/docs/models`, где явно сказано, что «GPT-6 Sol»
  как отдельная модель не упоминается, есть только «GPT-6.1 Sol» и «GPT-6 Luna»). Предложение
  вводит четвёртую, не существующую модель «GPT-6 Sol» рядом с «GPT-6.1 Sol», как будто это два
  разных объекта. Та же глава в других местах (строка 156, первая половина цитаты, и строка 712)
  использует правильное имя «GPT-6.1 Sol» — то есть ошибка не в стиле, а в фактическом добавлении
  лишней модели.
- **Как исправить**: убрать «GPT-6 Sol и» и оставить «GPT-6 Luna вызывает инструменты через Chat
  Completions только с `reasoning_effort: "none"`» (единственная модель без «.1», для которой это
  верно, — Luna).
- **Источник**: https://developers.openai.com/api/docs/guides/latest-model ; https://developers.openai.com/api/docs/models

### 2. Глава 01: та же несуществующая модель «GPT-6 Sol» в таблице дефолтов reasoning_effort

- **Файл**: `01-llm-api-agent-loop/index.html`, строка 712
- **Цитата**: «Дефолт менялся вместе с моделями. У GPT-5.1 он был `none`, с GPT-5.5 (24 апреля
  2026) стал `medium`, и у GPT-5.6, GPT-6 Sol, GPT-6 Luna и GPT-6.1 Sol тоже `medium`.»
- **Проблема**: то же самое факт-расхождение, что и в находке 1 (то же место семейства ошибок, но
  отдельное предложение и отдельная строка текста): «GPT-6 Sol» перечислена как модель, отдельная
  от «GPT-6.1 Sol», в одном и том же списке. Реальная линейка GPT-6 — Astra, 6.1 Sol, Luna (см.
  источник в находке 1), «GPT-6 Sol» без «.1» в ней не существует.
- **Как исправить**: убрать «GPT-6 Sol,» из перечисления — оставить «GPT-5.6, GPT-6 Luna и GPT-6.1
  Sol тоже medium».
- **Источник**: https://developers.openai.com/api/docs/guides/latest-model ; https://developers.openai.com/api/docs/models

### 3. Глава 01: та же ошибка в ответе на self-check про перевод цикла на Responses

- **Файл**: `01-llm-api-agent-loop/index.html`, строка 1219
- **Цитата**: «Chat Completions не поддерживает вызов функций на GPT-6 Astra и GPT-6.1 Sol.
  Выходы: перевести цикл на Responses API или взять GPT-6 Sol или Luna с `reasoning_effort:
  "none"`, где вызов через Chat Completions ещё разрешён.»
- **Проблема**: третье повторение той же выдуманной модели «GPT-6 Sol» в отдельном, самостоятельном
  фрагменте текста (ответ на упражнение-self-check). Верно было бы «взять GPT-6 Luna» — это
  единственная модель линейки GPT-6, вызывающая инструменты через Chat Completions с
  `reasoning_effort: "none"` (см. находку 1).
- **Как исправить**: заменить «взять GPT-6 Sol или Luna» на «взять GPT-6 Luna».
- **Источник**: https://developers.openai.com/api/docs/guides/latest-model ; https://developers.openai.com/api/docs/models
