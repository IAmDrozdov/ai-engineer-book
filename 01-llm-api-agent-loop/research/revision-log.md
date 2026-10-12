# Журнал правки главы 01 после рецензии

Дата: 30 сентября 2026. Отчёты: review-facts.md, review-code.md, review-completeness.md, review-reader.md.
Каждую находку перед правкой проверял сам: живые страницы (WebFetch), `openai/openai-openapi` openapi.yaml
(master, 30.09.2026), discovery-документ Gemini v1beta (ревизия 20260928), исходники anthropic-sdk-python (main).

Итог: принято 17, отклонено 4 (из них 1 частично). qa.mjs: `ISSUES none`, 11 454 слова прозы, 16 рисунков,
46 источников, 120 ссылок; нумерация источников сквозная по первому упоминанию, неиспользованных нет.

## Принято

### review-reader
1. **[critical] Подсвеченные `data-hl` строки не видны.** Подтвердил на скриншоте: у `text`/`sse` и у части
   Python текст — голый текстовый узел, который `.hl-line` (positioned, `z-index: 0`, непрозрачный фон)
   рисует поверх. Баг в общем `assets/book.css`, поэтому чинил там, а не убирал подсветку из главы:
   `.code pre code` получил `isolation: isolate`, `.code .hl-line` — `z-index: -1`. Подсветка теперь под
   текстом во всех главах. Проверено скриншотами разделов «Стриминг» и «Агент на пятьдесят строк».

### review-facts
2. **[major] Interactions API не в бете.** Живая страница: «As of June 2026, it is Generally Available and
   recommended for all new projects», `generateContent` назван legacy. Текст исправлен.
3. **[minor] Цитата из «Using GPT-6».** Подтвердил, фразы в гайде нет. Заменена на текущую: «GPT-6 Astra and
   GPT-6.1 Sol support Chat Completions, but tool calling requires Responses».

### review-code
4. **[minor] Вкладка Anthropic в сравнении API не разбирается как JSON.** Префикс `"messages":` убран,
   теперь массив, как в соседних вкладках.
5. **[minor] Фрагменты `text.format` и `allowed_tools` не разбираются.** Обёрнуты в `{}`, отступы выровнены.

### review-completeness
6. **[major 1] Клиентские встроенные инструменты Responses.** По openapi.yaml: `computer_call`,
   `local_shell_call`, `shell_call` (с `environment: local`), `apply_patch_call`, `mcp_approval_request`
   ждут ответа клиента. В раздел Responses добавлена таблица «элемент → кто выполняет → что дописать»,
   абзац про ошибку класса opencode на родном API, `max_tool_calls` (цитата из спецификации),
   `server_tool_use` у Anthropic. Условие цикла в разделе «Почему модель остановилась» и разбор
   `agent_responses.py` обновлены.
7. **[major 2] Учёт токенов.** Добавлен подраздел «Как складывать `usage`» в «Ретраи, лимиты и стоп-краны»:
   таблица полей по четырём API, формула Anthropic (проверена на странице Prompt caching, новый источник),
   `cached_tokens` как разбивка внутри входа у OpenAI (описания схем `ResponseUsage` и `CompletionUsage`),
   `thoughtsTokenCount` отдельно от кандидатов у Gemini, `thinking_tokens` внутри вывода у Anthropic
   (Extended thinking), оплата записи в кеш только с GPT-5.6 (OpenAI Prompt caching, новый источник).
8. **[major 3] Причины остановки Gemini.** В первом разделе добавлен абзац: в `finishReason` нет значения
   для вызова, `STOP` описан как «Natural stop point…», это объясняет историю opencode. В таблицу
   остановки добавлена колонка Gemini и строка «Сломан вызов инструмента» (`MALFORMED_FUNCTION_CALL`),
   после таблицы — абзац про `MALFORMED_FUNCTION_CALL` и `TOO_MANY_TOOL_CALLS`.
9. **[major 4] Отказы и блокировки OpenAI.** В таблицу добавлены `message.refusal`, часть `refusal` и строка
   «Блокировка политикой» (`status: failed`, `bio_policy`, `misalignment_policy_violation`). Абзац под
   таблицей: отказ со structured outputs «does not necessarily follow the schema» (гайд Structured Outputs),
   объект `misalignment` со `steer`. В разделе про схемы — одна фраза-отсылка. Формулировку про GPT-6 Astra
   из gaps.md («может остановить разговор для проверки») на живой странице не нашёл; вместо неё цитата
   «Our systems asynchronously monitor for misalignment and trigger alerts when necessary» с оговоркой.
10. **[major 5] Переполнение окна у OpenAI.** В ячейку Responses: «HTTP 400 до генерации»; абзац про
    `truncation` (дефолт `disabled` → 400, `auto` устарел и режет начало). Для Chat Completions оставлен
    прочерк: в спецификации CC такого описания нет.
11. **[major 6] Порог нестримингового запроса у Anthropic.** Проверено в `_calculate_nonstreaming_timeout`:
    `3600 * max_tokens / 128_000 > 600` → `ValueError`. В разбор `agent_messages.py` добавлено объяснение
    выбора `max_tokens=16_000`; источник SDK добавлен к пункту про ретраи SDK.
12. **[major 7] Сводная таблица API.** Добавлены строки «Связь вызова и результата», «Заставить вызвать»,
    «Сузить набор без правки списка», «Строгая схема». `allowed_tools` в Chat Completions подтверждён
    схемой `ChatCompletionAllowedToolsChoice`; `VALIDATED`, `allowedFunctionNames`, `FunctionCall.id` — по
    discovery-документу. В набросок истории Gemini добавлено поле `id`, в текст — абзац про режимы вызова.
13. **[minor 8] `thoughtSignature` при ручной сборке истории.** Добавлено предложение: страница Gemini 3
    требует присылать блоки мыслей с подписями, потеря видна как `MISSING_THOUGHT_SIGNATURE`. Имя поля
    в совместимом слое не называю: не подтверждено.
14. **[minor 10, частично] Сборка запроса Codex.** Добавлено одно предложение с порядком элементов
    (gaps.md M10). Рисунок не добавлял: в главе уже 16, это верхняя граница.
15. **[minor 11] Заголовки лимитов OpenAI.** Добавлены `x-ratelimit-remaining-*` и парные (spec.md, S24).
16. **[minor 11] DeepSeek.** Строка в таблицу совместимости: Responses «To meet the demand for Codex», без
    состояния, поток без `[DONE]` (живая страница DeepSeek, новый источник).
17. **[minor 11] Неблокирующие функции Gemini.** Абзац в разделе про асинхронные инструменты:
    `NON_BLOCKING` только в `BidiGenerateContent`, `scheduling` = `SILENT`/`WHEN_IDLE`/`INTERRUPT`.

## Отклонено

1. **[completeness 9] Убрать график «Смена бюджета мышления сбросила кеш».** Этот график — единственные
   настоящие числа о том, почему смена рассуждений посреди разговора дорогая. На нём держится совет
   менять effort через `configuration_update` или effort на сообщение, а это тема главы. Экономика кеша
   остаётся в главе 2. Объём после правки 11,5 тыс. слов, в пределах лимита 12 тыс.
2. **[completeness 9] Сократить «Шлюз держит все ключи».** Раздел — единственный инцидент из field.md
   про шлюзы, на которые глава и так советует смотреть. Всего четыре предложения; детали (`.pth` срабатывает
   без импорта) объясняют, почему закреплять по хешу. Отсылка к главе 16 уже стоит.
3. **[completeness 9] Сократить спор вокруг Agents API.** Это часть field-материала, AUTHORING §3.8 требует
   показывать, что не нравится людям; с главой 12 не дублируется, там устройство хостинга.
4. **[completeness 11] `redacted_thinking`.** На текущих страницах Anthropic (Extended thinking, раздел
   про блоки) этот тип не нашёл, в заметках он есть только в списке типов из справочника Messages API.
   Правило «возвращать `response.content` целиком» в главе уже покрывает любые блоки рассуждений.

## Сверка книги, 30 сентября 2026

### Внесено

1. **[решение редактора] «Let Me Speak Freely?» в выноске «Спорно» (раздел про схемы).** Статья
   проверена на arXiv (2408.02442, Tam, Wu, Tsai, Lin, Lee, Chen; v1 5 августа 2024, v3 14 октября
   2024). Аннотация подтверждает, что при ограничении формата (JSON, XML) рассуждения заметно
   хуже и чем строже формат, тем сильнее падение. «Линия исследований» переписана на «статья»
   (это одна работа), со ссылкой. Фразу «в 2026 году на неё продолжают ссылаться» убрал: источника
   на неё нет. Добавлен источник src-47.

### Отклонено

1. **[сверка, строки 156, 712, 1219] «GPT-6 Sol — несуществующая модель».** Модель существует:
   `gpt-6-sol` есть в каталоге developers.openai.com/api/docs/models («GPT-6 Sol: Built to power
   complex coding and agentic workflows»), у неё своя страница, в гайде latest-model дословно:
   «GPT-6 Sol and GPT-6 Luna support function calling in Chat Completions only with
   `reasoning_effort: "none"`». Гайд Reasoning: «GPT-6.1 Sol, GPT-6 Sol, and GPT-6 Luna also default
   to `medium`». Сверщик смотрел только на короткий список рекомендованных моделей (Astra, 6.1 Sol,
   Luna), в котором старой GPT-6 Sol нет. Все три места в главе верны, не менял.

QA: `ISSUES none`.
