# Глава 01 — рецензия на полноту

Рецензент: критик полноты. Дата: 30 сентября 2026. Глава не правилась.

Что сверялось: `index.html` (текст, 37 блоков кода, 2 графика) против охвата темы и четырёх файлов заметок
(`gaps.md`, `spec.md`, `practice.md`, `field.md`), плюс `outline.md`. Там, где дыры нет в заметках,
первоисточник открыт отдельно:
- `openai/openai-openapi` `openapi.yaml`, master, 113 793 строки, скачан 2026-09-30;
- Gemini API discovery document `generativelanguage.googleapis.com/$discovery/rest?version=v1beta`, revision `20260928`;
- `anthropics/anthropic-sdk-python`, `src/anthropic/_base_client.py`, main, 2026-09-30;
- страницы Gemini `gemini-3.md.txt`, `thinking.md.txt`, `openai.md.txt`, `function-calling.md.txt`.

Общая картина. Глава очень плотная и почти без устаревших мест: все 19 противоречий из `gaps.md`
(C1–C19) разрешены в тексте правильно (даты Conversations API, семь `stop_reason`, семь значений effort,
`thinking_level` без `max`, background с `store=false`, `encrypted_content` по умолчанию, партнёры
Open Responses без Nvidia, Agents SDK 2025-03-11 и т. д.). Критических ошибок и сломанных примеров
не нашёл: оба наброска цикла согласуются с заметками и спецификацией. Дыры в основном в трёх местах:
цикл Responses не знает о встроенных инструментах, которые выполняет клиент; учёт токенов, заявленный
в охвате, не разобран нигде; у Gemini нет ни причин остановки, ни правил вызова инструментов.

Объём: около 11 тыс. слов с кодом и подписями, у верхней границы из `AUTHORING.md` (7–11 тыс.).
Поэтому к каждой добавке ниже указано, где взять место (находка 9).

Итого: critical 0, major 7, minor 4.

---

## Major

### 1. Условие цикла Responses пропускает инструменты, которые выполняет клиент, а встроенные инструменты не описаны вовсе

**Что не так.** Раздел «Почему модель остановилась» формулирует условие цикла так: «есть ли в `output`
элементы `function_call` или `custom_tool_call`», и набросок `agent_responses.py` проверяет только
`function_call`. Но в текущей спецификации в объединении `Tool` шестнадцать типов, и часть из них
выполняет не OpenAI, а твой харнесс: `computer_use` (элемент `computer_call`, ответ `computer_call_output`),
`local_shell` (`local_shell_call` → `local_shell_call_output`), `shell` (`shell_call` → `shell_call_output`),
`apply_patch` (`apply_patch_call` → `apply_patch_call_output`). Ещё один элемент требует ответа клиента,
хотя инструмент хостовый: `mcp_approval_request` → `mcp_approval_response`. Харнесс, который подключит
такой инструмент и оставит условие из главы, выйдет из цикла на первом же вызове. Это ровно тот класс
ошибки, с которого глава начинается (opencode #14972), только на родном API OpenAI.

Охват прямо называет built-in tools, но в главе о них одна фраза («для встроенных инструментов вроде
веб-поиска цикл крутит OpenAI»). Нет списка, нет того, как их элементы выглядят в `output`
(`web_search_call`, `code_interpreter_call`, `mcp_call`, `tool_search_call`, `program`…), нет
`max_tool_calls`: по спецификации он ограничивает только встроенные вызовы, «Any further attempts to call
a tool by the model will be ignored». У Anthropic тот же пробел: блоки `server_tool_use` и
`web_search_tool_result` в `response.content` упомянуты только косвенно, через `pause_turn`.

**Что добавить.**
- В раздел «Responses API: разговор из элементов» — таблицу из трёх колонок: тип элемента в `output`,
  кто его выполняет (OpenAI или харнесс), что харнесс дописывает в `input`. 8–10 строк.
- Абзац про `max_tool_calls` и про то, что встроенные вызовы не попадают в параллельную пачку (последнее
  в главе уже есть, его стоит перенести сюда).
- В разбор `agent_responses.py` — одну фразу: набросок знает только функции. Если подключаешь `shell`,
  `apply_patch` или `computer_use`, условие выхода — «в `output` нет ни одного элемента, который ждёт ответа
  клиента». Ссылка на главу 3 про выбор между такими инструментами и функциями, на главу 5 про MCP-approval.
- Одну строку про Anthropic: `server_tool_use` в ответе исполнять не надо, результат уже лежит рядом.

**Источники.** `openapi.yaml`, схемы `Tool`, `OutputItem`, `ApplyPatchToolCall`, `FunctionShellCall`,
`ComputerToolCall`, `MCPApprovalRequest`, `max_tool_calls` (стр. 70588); `gaps.md` M4 (max_tool_calls,
namespaces, tool search); `spec.md` про `server_tool_use`; `practice.md` §3.

### 2. Учёт токенов из охвата («token usage accounting (cached tokens, reasoning tokens)») в главе не разобран

**Что не так.** В главе есть переименование `prompt_tokens`→`input_tokens` в таблице миграции,
`include_usage` для стрима, кумулятивный `usage` у Anthropic и `thinking_tokens` одной строкой. Ни
`cached_tokens`, ни `cache_write_tokens`, ни `reasoning_tokens`, ни `cache_creation_input_tokens` в
тексте нет (проверено поиском). При этом глава дважды отправляет читателя считать бюджет самому
(«Бюджет задачи считает только твой цикл, складывая usage каждого ответа»; «напечатай `resp.usage` …
какую часть из него составляют кешированные токены»), не объяснив, как складывать. Главная ловушка
сравнения не названа: у OpenAI кешированные токены входят в `input_tokens` (пример из спецификации:
`prompt_tokens: 2006`, `cached_tokens: 1920`), а у Anthropic `input_tokens` — только некешированный
хвост, и полный вход равен `cache_read_input_tokens + cache_creation_input_tokens + input_tokens`.
Счётчик, написанный под один API, на другом занизит или задвоит вход. У Gemini `thoughtsTokenCount`
лежит вне `candidatesTokenCount` («Total token count … (prompt + thoughts + response candidates)»),
у OpenAI `reasoning_tokens` — разбивка внутри `output_tokens`.

**Что добавить.** В раздел «Ретраи, лимиты и стоп-краны» (или отдельным подразделом перед ним) —
таблицу «поле → Chat Completions / Responses / Anthropic / Gemini» из 5 строк: весь вход, из него из
кеша, запись в кеш, рассуждения, где приходит в стриме. Под ней два предложения: формула полного входа
у Anthropic и то, что рассуждения оплачиваются как вывод, хотя их текста ты не видишь. Сама экономика
кеша остаётся в главе 2.

**Источники.** `practice.md` §7 (`ResponseUsage` из openai-python, формула Anthropic, VERBATIM usage);
`spec.md` (usage Chat Completions с `cached_tokens`); `gaps.md` C18 (`cache_write` только с GPT-5.6);
`openapi.yaml` схема `ResponseUsage`; Gemini discovery doc, схема `UsageMetadata`
(`cachedContentTokenCount`, `thoughtsTokenCount`, `totalTokenCount`).

### 3. У Gemini нет причин остановки, и корень истории opencode остаётся необъяснённым

**Что не так.** Таблица «Почему модель остановилась» и маршрутизатор покрывают три API, Gemini в них нет.
А у Gemini в `Candidate.finishReason` нет значения для вызова функции вообще. `STOP` описан как «Natural
stop point of the model or provided stop sequence», и ответ с `functionCall` тоже приходит со `STOP`.
Именно поэтому OpenAI-совместимый слой Gemini отдаёт `finish_reason: "stop"` при заполненных `tool_calls`.
Лид главы описывает симптом; одна фраза с этим фактом объяснила бы механизм и сделала правило «решай по
наличию вызовов» не эмпирическим, а следствием спецификации. Кроме того, в перечислении есть значения,
которые циклу надо различать: `MALFORMED_FUNCTION_CALL` («The function call generated by the model is
invalid»), `UNEXPECTED_TOOL_CALL`, `TOO_MANY_TOOL_CALLS` («Model called too many tools consecutively, thus
the system exited execution»), `MISSING_THOUGHT_SIGNATURE` («Request has at least one thought signature
missing»), `MAX_TOKENS`, `SAFETY`/`PROHIBITED_CONTENT`.

**Что добавить.**
- В раздел «Цикл, который крутит любой агент» после разбора opencode — одно предложение: в родном API
  Gemini причины «вызов инструмента» нет, вызов заканчивается `STOP`.
- В таблицу причин остановки — колонку Gemini (`STOP` с `functionCall` в `parts`, `MAX_TOKENS`,
  `SAFETY`/`PROHIBITED_CONTENT`, `MALFORMED_FUNCTION_CALL`); строку «Сломан вызов инструмента» с
  действием «вернуть модели ошибку формата или повторить».

**Источник.** Gemini API discovery document, v1beta, revision 20260928, `Candidate.finishReason`
(`enum` и `enumDescriptions`). В заметках этого нет.

### 4. Отказы и блокировки OpenAI описаны одной ячейкой `content_filter`

**Что не так.** Строка «Фильтр или отказ» для OpenAI даёт только `content_filter`. По спецификации
отказ у OpenAI приходит ещё двумя путями, и оба ломают наивный цикл без ошибки HTTP:
- `ChatCompletionResponseMessage.refusal` в Chat Completions и часть `{"type": "refusal", "refusal": …}`
  в `message.content` у Responses. С structured outputs это важнее всего: код, который делает
  `json.loads(message.content)`, получает `None` или ищет `output_text`, которого нет;
- `status: "failed"` с `error.code` из `ResponseErrorCode`, где есть `bio_policy` и
  `misalignment_policy_violation`. У второго есть объект `misalignment` с `error_type`,
  `detailed_explanation` и `steer` («An optional public continuation instruction»). В `gaps.md` про
  GPT-6 Astra записано: «"misalignment monitoring" can stop a conversation for review», а в главе этой
  ветки нет, хотя раздел про GPT-6 Astra подробный.

**Что добавить.** В таблицу причин остановки — отдельные строки «Отказ модели» (`message.refusal` /
часть `refusal` / `stop_reason: refusal`) и «Блокировка политикой» (`status: failed`,
`error.code: bio_policy | misalignment_policy_violation`). В раздел про structured outputs — одно
предложение: при strict-схеме модель может ответить отказом вместо JSON, проверяй `refusal` до разбора.

**Источники.** `openapi.yaml`: `ChatCompletionResponseMessage` (стр. 41615), `RefusalContent`
(стр. 80159), `ResponseErrorCode`, `MisalignmentErrorDetailsResource`; `spec.md` (события
`response.refusal.delta`/`.done`); `gaps.md`, раздел «Current state», GPT-6 Astra.

### 5. Переполнение окна контекста у OpenAI в таблице показано прочерками, а это ошибка 400 до генерации

**Что не так.** Строка «Кончилось окно контекста» содержит «—» для Chat Completions и Responses. Читатель
поймёт это как «у OpenAI такого не бывает», хотя на деле запрос падает исключением ещё до ответа.
Спецификация Responses про параметр `truncation`: «`disabled` (default): If the input size will exceed
the context window size for a model, the request will fail with a 400 error»; `auto` молча выбрасывает
элементы с начала разговора. Сам параметр помечен `deprecated: true`. Для цикла разница принципиальная:
у Anthropic это ветка по `stop_reason`, у OpenAI — `except BadRequestError`, и её никто не ловит.

**Что добавить.** В ячейки таблицы: «HTTP 400 до генерации» для обоих API OpenAI. Одно предложение под
таблицей: `truncation: "auto"` существует, но устарел и молча режет начало, а оно у тебя самое ценное.
Сжатие истории остаётся ссылкой на главу 2.

**Источник.** `openapi.yaml`, свойство `truncation` в `ResponseProperties` (стр. 85799). В заметках
отмечено как неисследованное (`spec.md`, «Unverified»: «truncation … only partially extracted»).

### 6. Нестриминговый запрос к Claude с большим `max_tokens` SDK не отправит вовсе

**Что не так.** Глава советует держать запас на рассуждения («OpenAI советует … не меньше 25 тыс.
токенов») и пишет, что на Opus 5.5 мышление не выключается. Читатель, который перенесёт этот запас в
`agent_messages.py` (там `max_tokens=16_000` без стрима), получит `ValueError` ещё до запроса. В
anthropic-python ожидаемое время считается как `3600 * max_tokens / 128_000` секунд, и если оно больше
600, SDK бросает «Streaming is required for operations that may take longer than 10 minutes». Порог
около 21 333 токенов, то есть 25 000 его уже превышают. У OpenAI аналога нет, там для долгих запросов
глава правильно предлагает фоновый режим.

**Что добавить.** В разбор варианта для Anthropic в разделе «Агент на пятьдесят строк» — одно-два
предложения: `max_tokens` выше ~21 тыс. требует `stream=True` (или `client.messages.stream(...)` с
`get_final_message()`), 16 тыс. в наброске выбраны с запасом. В раздел про ретраи можно добавить строку:
таймаут SDK по умолчанию 10 минут.

**Источник.** `anthropics/anthropic-sdk-python`, `src/anthropic/_base_client.py`,
`_calculate_nonstreaming_timeout`; `src/anthropic/_constants.py` (`DEFAULT_TIMEOUT = 10 * 60`). В
заметках этого нет.

### 7. Сводная таблица API неполна как справочник: нет `tool_choice`, `strict`, параллельности и id вызова у Gemini

**Что не так.** Итоговая таблица раздела «Gemini: два API сразу» сравнивает инструкции, схему, вызов,
аргументы, результат и рассуждения. Строк, которые инженер будет искать первыми, в ней нет:
принудительный выбор, ограничение набора, строгий режим, параллельные вызовы, чем связан вызов с
результатом. По OpenAI и Anthropic это разбросано по трём разделам, по Gemini отсутствует совсем. А у
Gemini есть все эти ручки: `FunctionCallingConfig.mode` = `AUTO | ANY | NONE | VALIDATED`, где
`VALIDATED` — «will validate function calls with constrained decoding», то есть аналог `strict`;
`allowedFunctionNames` — аналог `allowed_tools`; у `FunctionCall` есть поле `id`, и `FunctionResponse.id`
«Populated by the client to match the corresponding function call `id`». В наброске истории Gemini
в главе id нет, и связь выглядит как связь по имени, что неверно при двух параллельных вызовах одной
функции. В Interactions API те же режимы называются `tool_choice` (`auto`, `any`, `none`, `validated`)
плюс `allowed_tools`.

**Что добавить.** В сводную таблицу — четыре строки: «Принудить вызов» (`required` / `required` /
`any`, `tool` с 400 на моделях 5.x / `ANY`), «Сузить набор» (`allowed_tools` / то же / `tool_removal`
в бете / `allowedFunctionNames`), «Строгая схема» (`strict`, по умолчанию выкл. / попытка strict с
откатом / `strict: true` / `VALIDATED`), «Связь вызова и результата» (`tool_call_id` / `call_id` /
`tool_use_id` / `id`). В набросок Gemini — поле `id` в `functionCall` и `functionResponse`.

**Источники.** Gemini discovery doc: `FunctionCallingConfig`, `FunctionCall.id`, `FunctionResponse.id`;
`ai.google.dev/gemini-api/docs/function-calling.md.txt` (режимы в Interactions); `gaps.md` C10, C15,
M4; `spec.md` (Anthropic `tool_choice`).

---

## Minor

### 8. Подписи мыслей Gemini: «SDK возвращает сам» недостаточно для харнесса, который пересобирает историю

В главе: `thoughtSignature` «официальные SDK возвращают его сами». Но харнесс из этой же главы собирает
историю сам или ходит через совместимый слой. Документация Gemini 3 требует: «You **MUST** always resend
all `thought` blocks exactly as they were received» и «you must include thought blocks with their
signatures in subsequent requests to validate authenticity». Нарушение видно как
`finishReason: MISSING_THOUGHT_SIGNATURE` (см. находку 3). Страница совместимости говорит, что
«Gemini 3 supports OpenAI compatibility for thought signatures in chat completion APIs», то есть подпись
едет в расширении ответа Chat Completions, и шлюз, который перекладывает поля, может её потерять.

Добавить одно предложение в абзац про Gemini в разделе «Messages API и Gemini» и строку в таблицу
«где текут» (раздел `compat`): «подпись рассуждений в расширении, прокси может выбросить». Точное имя
поля в совместимом слое я не подтвердил (страница `thought-signatures` сейчас редирект), поэтому его
лучше не называть.

Источники: `ai.google.dev/gemini-api/docs/thinking.md.txt`, `gemini-3.md.txt`, `openai.md.txt`;
discovery doc, `Part.thoughtSignature`.

### 9. Где глава залезла к соседям и откуда взять место под добавки

Текст уже у верхней границы объёма, поэтому добавки выше стоит оплатить сокращениями на чужой территории:
- **График «Смена бюджета мышления сбросила кеш»** и абзац к нему (раздел «Что ещё крутится в Responses»):
  замер Anthropic на Sonnet 4.6 про ручной бюджет, которого на новых моделях нет. Это экономика кеша,
  глава 2. Хватит одной фразы «смена режима мышления или effort сбрасывает кеш» со ссылкой на главу 2 и
  на типизированные причины промаха OpenAI, которые уже упомянуты.
- **Раздел «Шлюз держит все ключи»**: байты `.pth`, шифры AES-256/RSA-4096, домен эксфильтрации, счёт
  HN — это глава 16. Для главы 1 достаточно двух предложений: шлюз держит все ключи, версии 1.82.7/1.82.8
  были скомпрометированы 24 марта 2026, закрепляй по хешу.
- **Абзац о спорах вокруг Agents API** (Уиллисон и `/etc/hosts`, chairhairair) частично дублирует
  главу 12. Можно оставить одну цитату.

Удаление графика с кешем также снимает с главы единственный рисунок, который относится не к её теме.

### 10. Как настоящий харнесс собирает первый запрос: сборка Codex есть в заметках, в главе только порядок ролей

В `gaps.md` (M10, п. 2; кандидат в рисунки №2) есть проверенная раскладка запроса Codex: `instructions`
(базовый промпт модели), затем `tools`, затем элементы `input`: developer-сообщение с песочницей и
правами, developer-инструкции из конфига, user-сообщение с собранными `AGENTS.md` (по умолчанию до
32 KiB), навыки, user-сообщение с окружением, и только потом запрос пользователя. В главе из этого
осталась цитата про приоритет ролей и «первые элементы определяет сервер». Небольшой HTML-стек из
7–8 плашек в разделе «Chat Completions: формат, который скопировали все» (после абзаца о приоритете
ролей) показал бы, что такое «запрос агента» в реальности, и объяснил бы, почему сменившиеся права
дописываются новым сообщением. Содержимое промптов — глава 4; здесь только порядок и роли.

Источник: `gaps.md` M10 [G16] «Unrolling the Codex agent loop».

### 11. Мелкие справочные пропуски из заметок и спецификаций

По одной строке каждый:
- **Заголовки лимитов OpenAI.** Для Anthropic глава называет `anthropic-ratelimit-*`, для OpenAI нет:
  `x-ratelimit-limit-requests`, `x-ratelimit-remaining-requests`, `x-ratelimit-reset-requests` и то же
  для токенов (`spec.md`, раздел Rate limits [S24]). Место: абзац после таблицы ошибок.
- **DeepSeek в таблице совместимости.** В `gaps.md` M17 [G47]: DeepSeek добавил формат Responses
  «To meet the demand for Codex», поток заканчивается типизированным событием, а не `[DONE]`. Это
  ещё один пример Responses без состояния. Строка в таблицу раздела `compat`.
- **`redacted_thinking`.** В `spec.md` перечислен среди блоков запроса Anthropic; в главе про блоки
  рассуждений его нет. Правило то же: возвращать без изменений. Полфразы в «Блоки рассуждений привязаны
  к истории».
- **Неблокирующие функции у Gemini.** В разделе про асинхронные инструменты стоит упомянуть, что у
  Gemini похожий механизм есть только в Live API: `FunctionDeclaration.behavior: NON_BLOCKING` («Currently
  only supported by the BidiGenerateContent method») и `FunctionResponse.scheduling`
  (`SILENT | WHEN_IDLE | INTERRUPT`). Источник: Gemini discovery doc.

---

## Что проверено и оказалось верным

- Все значения и даты из таблиц «Семь мест миграции», «effort по датам», «Сервер / CC / Responses /
  состояние», «ошибки и повторы» совпадают с `gaps.md` и спецификацией.
- Числа на графике накладных расходов (Opus 4.1 313 … Opus 5.5 286; 804 для Opus 4.7 при `any/tool`)
  совпадают с `gaps.md` «Numbers».
- Наброски `agent_responses.py` и `agent_messages.py` согласованы с заметками (M15 и дельта Anthropic)
  и подписаны как незапускавшиеся. `max_retries=4` и фраза «повторён четыре раза» друг другу
  соответствуют. Порог нестримингового запроса (находка 6) набросок не нарушает: 16 000 < ~21 333.
- Пример Chat Completions с `gpt-6-luna` и `reasoning_effort: "none"` соответствует ограничению
  из «Using GPT-6», и расхождение с примером спецификации на `gpt-6-astra` в тексте оговорено.
- Устаревших относительно заметок утверждений не найдено.
