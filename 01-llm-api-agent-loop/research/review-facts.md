# Факт-чек главы 01 «LLM API и цикл агента» (часть «Основа»)

Дата проверки: 30 сентября 2026. Рецензент читал `index.html`, все четыре файла заметок
(`gaps.md`, `spec.md`, `practice.md`, `field.md`) и инструкцию `_meta/AUTHORING.md`, затем сверил
30 самых нагруженных/подозрительных утверждений по живым источникам (официальная документация
OpenAI/Anthropic/Google, GitHub, Hacker News, PyPI, блоги).

**Общий вывод**: глава уже прошла серьёзную выверку по `gaps.md` — почти все спорные места,
которые перечисляет `gaps.md` (реасонинг-эффорты, `stop_reason`, forced tool choice, дефолты
thinking, даты релизов, числа по overhead инструментов и т. д.), в тексте главы уже исправлены и
при повторной проверке по первоисточникам подтвердились дословно или по существу: цитата
opencode issue #14972 (репозиторий `anomalyco/opencode`, дата, PR #14973), пост Армина Ронахера
«The Coming Loop» (23 июня 2026, цитата про «strong invariants»), цитаты из «Unrolling the Codex
agent loop» (квадратичность, приоритет ролей, ZDR, `--oss`), список партнёров Open Responses у
Саймона Уиллисона (без Nvidia — и глава сама это оговаривает), тред HN «OpenAI Agents API» (350
очков / 187 комментариев, цитата z2), minimal-agent.com, пост Рémi Louf, семь `stop_reason` у
Anthropic, refusal-JSON и таблица биллинга отказов, thinking-binding на Sonnet 5.5, вся страница
«What's new in Sonnet 5.5», `DEFAULT_MAX_TURNS = 10` в openai-agents-python, дефолты Claude Agent
SDK и субтипы `ResultMessage`, вердикты vLLM/Ollama/OpenRouter по Responses API, версии пакетов на
PyPI, проценты SWE-bench/кеша из гайда «Migrate to the Responses API» — везде совпадение.

Найдено одна содержательная ошибка (устаревшее «текущее состояние») и один случай неточного
цитирования источника. Ниже — обе, с доказательствами.

## Находки

### 1. [major] Gemini Interactions API назван «бетой» — на самом деле он уже GA

**Цитата из главы** (раздел «Messages API и Gemini», подраздел «Gemini: два API сразу»):

> «Второй API у Google появился 11 декабря 2025 года и называется Interactions. Он в бете, но
> документация называет его «recommended for all new projects», а про старый пишет: «The original
> `generateContent` API remains fully supported»».

**В чём ошибка**: статус «бета» устарел. Живая страница документации Google прямо говорит
обратное — Interactions API вышел из беты и имеет статус Generally Available с июня 2026 года:

> «The Interactions API is the best way to build with Gemini models and agents. As of June 2026,
> it is **Generally Available** and recommended for all new projects.»

На странице нет ни одного упоминания слова «Beta» применительно к самому Interactions API. Дата
запуска (11 декабря 2025) и факт, что `generateContent` «remains fully supported», подтвердились —
ошибка именно в статусе «бета», который к 30 сентября 2026 года (дате главы) уже три с половиной
месяца как неверен. Это ровно тот случай, о котором предупреждает `AUTHORING.md`: «слова… «сейчас»,
«новый» без даты через полгода станут враньём» — здесь устарело даже быстрее.

**Как правильно**: «Interactions API вышел из беты и имеет статус Generally Available с июня 2026
года, документация называет его «recommended for all new projects»» (дату перехода в GA стоит
уточнить отдельно — на проверенной странице она не названа точнее, чем «June 2026»).

**Доказательство**: https://ai.google.dev/gemini-api/docs/interactions (живая проверка 2026-09-30).

## Отдельным списком: ссылки, не подтверждающие дословно то, к чему приставлены

### 2. [minor] Цитата из гайда OpenAI «Using GPT-6» не совпадает с живым текстом гайда

**Цитата из главы** (раздел «Chat Completions», источник src-7):

> «В гайде по GPT-6 сказано: «Chat Completions does not support function calling with GPT-6 Astra
> or GPT-6.1 Sol»; GPT-6 Sol и GPT-6 Luna вызывают инструменты через Chat Completions только с
> `reasoning_effort: "none"`».

**В чём проблема**: этой фразы в кавычках («Chat Completions does not support function calling
with GPT-6 Astra or GPT-6.1 Sol») на живой странице гайда нет. Сейчас там написано:

> «GPT-6 Astra and GPT-6.1 Sol support Chat Completions, but tool calling requires Responses.»
>
> «GPT-6 Sol and GPT-6 Luna support function calling in Chat Completions only with
> `reasoning_effort: "none"`.»

Смысл почти тот же (вызов инструментов на GPT-6 Astra/6.1 Sol доступен только через Responses,
через Chat Completions — нет), и вторая часть цитаты про GPT-6 Sol/Luna совпадает дословно. Но
первая половина подана в тексте главы как точная цитата в кавычках-«ёлочках», а дословно она не
подтверждается: либо страницу переформулировали после того, как заметки собирались, либо цитата
изначально пересказана, а не взята дословно. По правилам `AUTHORING.md» («Имена полей… пишутся как
в спецификации», цитаты — дословно) эту фразу нужно либо привести без кавычек как пересказ, либо
заменить на нынешнюю формулировку гайда.

**Как правильно**: убрать кавычки-цитату или заменить её на «GPT-6 Astra and GPT-6.1 Sol support
Chat Completions, but tool calling requires Responses» — и дальше по тексту без изменений (вывод
«вызов инструментов только через Responses» остаётся верным).

**Доказательство**: https://developers.openai.com/api/docs/guides/latest-model (живая проверка
2026-09-30, дважды перепроверено прямым поиском фразы на странице).

## Утверждения без ссылки, которым ссылка нужна

Не найдено. Практически каждое нетривиальное утверждение, число, дата и цитата в главе снабжены
`<a class="cite">`; общие/очевидные фразы («лимит шагов есть в любом примере, и не зря») ссылки не
требуют по смыслу инструкции.

## Что проверено по первоисточникам и подтвердилось (без ошибок)

- opencode issue #14972 (`anomalyco/opencode`, 25 февраля 2026, закрыт PR #14973) — код условия
  выхода, провайдеры (Gemini/LiteLLM) совпадают.
- Armin Ronacher, «The Coming Loop», lucumr.pocoo.org, 23 июня 2026 — различение внутреннего и
  внешнего цикла и цитата про «strong invariants… fallbacks» — дословно.
- OpenAI, «Unrolling the Codex agent loop» — цитаты о квадратичности, приоритете ролей
  (`system, developer, user, assistant`), ZDR, `AGENTS.md` 32 KiB, `--oss` на `localhost:11434` —
  все дословно.
- Simon Willison, «Open Responses», 15 января 2026 — список партнёров (OpenRouter, Hugging Face,
  LM Studio, vLLM, Ollama, Vercel) без Nvidia — совпадает, и глава сама помечает Nvidia как
  неподтверждённое.
- HN «OpenAI Agents API» (item 49649213): 350 очков / 187 комментариев, цитата z2 — совпадает.
- minimal-agent.com — цитата про «an AI agent is just a big loop…» и код с `bash-action` —
  совпадает.
- Rémi Louf, thetypicalset.com, 9 апреля 2026 — цитата «wire formats are training-time
  decisions…», баги Gemma 4 / vLLM #38855 / vLLM PR #39027 / llama.cpp PR #21418 — совпадает.
- Peter Harrison, OpenAI Developer Community, 26 августа 2025 — цитата про «Is the new API a beta
  as well? How can we trust it will not also experience the same treatment» подтверждена дословно
  (пост #5, полная фраза заканчивается «…in the near future?», в главе усечена без «…», это не
  меняет смысла).
- Anthropic, «Handling stop reasons» — все семь значений `stop_reason`, `model_context_window_exceeded`
  без бета-заголовка на Sonnet 4.5+ — совпадает.
- Anthropic, «Refusals and fallback» — JSON-пример отказа (тот же `msg_id`, модель `claude-fable-5`),
  таблица категорий и биллинга (`bio`, `frontier_llm`, `reasoning_extraction` — билятся до вывода),
  бета-заголовок `server-side-fallback-2026-07-01` — совпадает.
- Anthropic, «What's new in Claude Sonnet 5.5» — «text between tool calls comes back in thinking
  blocks», поведение UI «goes quiet… with no error», привязка thinking-блоков (только Sonnet 5.5
  читает свои блоки), дата принудительной проверки для аккаунтов с 31 августа 2026, бета-заголовок
  `thinking-binding-controls-2026-08-01`, `tool_choice` `any`/`tool` → 400 — всё совпадает.
- Anthropic, «Mid-conversation system messages» — список моделей (кроме Sonnet 5), бета-заголовок
  `inline-tools-2026-09-15`, обоснование через хешированный префикс — совпадает.
- OpenAI changelog — точные даты GPT-6 Astra (3 сентября 2026), GPT-6 Sol/Luna (22 сентября 2026),
  GPT-6.1 Sol (29 сентября 2026), отключения Assistants API (26 августа 2026), публичной беты
  Agents API (10 сентября 2026), кодов `slow_down`/`server_is_overloaded` (2 сентября 2026) —
  совпадает.
- OpenAI, «Reasoning models» — GPT-6.1 Sol отвергает и `none`, и `minimal`; `reasoning.context`
  дефолты (`all_turns` у семейства GPT-5.6, `current_turn` у более ранних); рассуждения не
  переносятся между семействами GPT-5.6 и GPT-5.5 — совпадает.
- OpenAI, «Migrate to the Responses API» — билинг всей цепочки через `previous_response_id`,
  «3% improvement in SWE-bench», «40% to 80% improvement» в утилизации кеша, без указания модели и
  даты — совпадает.
- vLLM online-serving docs — флаги `--enable-auto-tool-choice`, `--tool-call-parser`
  (`llama3_json`, `qwen3_xml`, `hermes`), `--reasoning-parser`, Anthropic-совместимый
  `/v1/messages` и `/v1/responses` с retrieve/cancel — совпадает.
- Ollama openai-compatibility.mdx — «Only the non-stateful flavor is supported» для Responses —
  совпадает дословно.
- OpenRouter Responses API overview — «Requests that set `store: true` or a non-null
  `previous_response_id` are rejected with a `400` error» — совпадает дословно.
- Claude Agent SDK, «How the agent loop works» — определение хода, дефолты `max_turns`/
  `max_budget_usd` = «No limit», субтипы `ResultMessage` (`success`, `error_max_turns`,
  `error_max_budget_usd`, `error_during_execution`, `error_max_structured_output_retries`),
  `readOnlyHint` для параллельных кастомных тулов, событие `compact_boundary` — совпадает.
- `openai-agents-python` (GitHub, main) — `DEFAULT_MAX_TURNS = 10` подтверждено прямым чтением
  исходника.
- PyPI: `openai` 3.22.1 (30.09.2026), `openai-agents` 0.22.3 (17.09.2026), `claude-agent-sdk`
  0.2.162 (29.09.2026) — совпадает. (`anthropic` на момент проверки живым запросом показал уже
  1.10.0 от 30.09.2026 вместо заявленных в главе 1.9.0 — расхождение на несколько часов в пределах
  той же даты, которую называет глава; это дрейф патч-версии в течение дня, а не содержательная
  ошибка, отдельной находкой не оформлял.)
