# Глава 01 — план

Лид: 25 февраля 2026 в opencode цикл агента останавливался после первого вызова инструмента на Gemini и провайдерах за LiteLLM: `finish_reason: "stop"` при заполненных `tool_calls`. Одна строка условия выхода. Глава о том, из каких сообщений состоит этот цикл и где у разных API разные имена для одного и того же.

## Разделы

| # | id | С чего начинается | Что главное | ~слов |
|---|---|---|---|---|
| 1 | loop | Строка условия из opencode и её исправление | Модель ничего не выполняет и ничего не помнит; харнесс на каждом шаге шлёт всю историю. Цитата Codex про квадратичность, кеш делает линейным (→ гл. 2). Внутренний и внешний цикл по Ронахеру. Транскрипт Claude Code как живой пример | 800 |
| 2 | chat-completions | Сам JSON запроса с `tools` | Роли system/developer/user/assistant/tool, `tool_calls` с `arguments`-строкой, `tool_call_id`, параллельные вызовы, `tool_choice`. Поворот: на GPT-6 Astra и GPT-6.1 Sol вызова инструментов через CC нет вообще | 750 |
| 3 | responses | Проверка ожидания «previous_response_id экономит токены» — нет | Элементы вместо сообщений, `id` против `call_id`, `instructions` не переносится, три способа держать состояние, encrypted reasoning по умолчанию, `phase`, `reasoning.context`. Codex не использует `previous_response_id`. Assistants закрыт 26 августа 2026, хронология, цитата z2. Семь молчаливых отличий при миграции (benchlm) с поправкой по strict | 1300 |
| 4 | schemas | Предупреждение из OpenAPI: «the model does not always generate valid JSON» | strict и structured outputs как constrained decoding, правила схемы, Responses нормализует в strict с откатом, `tool_choice` и `allowed_tools`, custom tools с грамматикой. Anthropic: structured outputs GA, forced `tool_choice` → 400 на 5.x, «фейковый тул» ломается. Спор «Let Me Speak Freely» | 850 |
| 5 | tokens | Фраза OpenAI «functions are injected into the system message in a syntax the model has been trained on» | Шаблоны чата, `apply_chat_template`, Harmony дословно, один вызов в трёх семействах (Louf), M×N и `--tool-call-parser`, dict против строки в Transformers. График накладных расходов Anthropic на тулы | 750 |
| 6 | streaming | Sonnet 5.5: UI молчит между вызовами, без ошибки | Три формы потока: CC-чанки по `index` + `[DONE]` + `include_usage`; Responses: типизированные события, `sequence_number`, blob из `.done`; Anthropic: блоки, `input_json_delta`, кумулятивный usage. Open Responses требует `[DONE]`, OpenAI Responses — нет | 750 |
| 7 | stop | Ответ refusal с пустым `content` проходит через цикл как «готовый ответ» | Сопоставление finish_reason / status+incomplete_details / stop_reason; семь stop_reason и действие на каждый; pause_turn; refusal с оплатой с 24.09.2026; GPT-6 Astra задаёт вопросы | 850 |
| 8 | reasoning | Два 400: `none` на GPT-6 Astra, `budget_tokens` на Claude 4.7+ | effort 7 значений и их история, дефолты по моделям, temperature убрана, verbosity, summary, context, pro, `configuration_update`. Anthropic: adaptive + effort, Opus 5.5 не выключить, Sonnet 5.5 between_tools. Gemini thinking_level. График: смена бюджета мышления сбросила кеш | 950 |
| 9 | anthropic-gemini | Один и тот же круг в четырёх вкладках | Блоки контента, tool_result в user и первыми, все параллельные результаты в одном сообщении, system посреди разговора (2026-07-15), tool_addition/removal, привязка thinking и append-only. Gemini: model, functionCall/functionResponse, thoughtSignature, Interactions API (бета) | 1000 |
| 10 | compat | Anthropic о своём же OpenAI-совместимом слое: «not considered a long-term or production-ready solution» | Матрица совместимости (CC / Responses / состояние / strict), stateless-клоны Responses, Open Responses (партнёры, [DONE], allowed_tools), Codex `--oss`. Инцидент LiteLLM 1.82.7/1.82.8 | 700 |
| 11 | loop-2026 | 3 сентября 2026, `async: true` в описании тула | WebSocket mode (только новые элементы, 60 мин, до 40% быстрее), async-тулы и `response.inject`, `response.steer`, background (теперь и с `store=false`), Agents API | 700 |
| 12 | production | 429, который ретрай не лечит, и SDK, который его ретраит дважды | Таблица кодов, Retry-After, 529 в стриме, лимиты шагов и бюджета, `max_tokens` на запрос, а не на ход | 650 |
| 13 | minimal | Сразу код | Цикл на Responses (набросок) и дельта для Messages во вкладках; разбор строк; текстовый цикл minimal-agent.com как альтернатива; что сделать за вечер | 600 |
| 14 | sdk | Цитата z2 про «rug-pull» | Слои: API → Tool Runner / SDK → харнесс → хостинг. Agents SDK (10 ходов по умолчанию), Claude Agent SDK = цикл Claude Code (без лимита). Когда брать что | 600 |

Порядок вопросов не анкета: 1 — сбой, 2 — запрос, 3 — опровержение, 4 — предупреждение из спецификации, 5 — цитата, 6 — поведение без ошибки, 7 — сбой, 8 — ошибки 400, 9 — сравнение, 10 — самоотвод вендора, 11 — дата, 12 — сбой, 13 — код, 14 — спор.

## Рисунки (15)

1. fig-loop — mermaid sequence: харнесс, API, инструменты; два витка, рост запроса.
2. fig-cc-parallel — mermaid sequence: CC с двумя параллельными вызовами и двумя `tool`-сообщениями.
3. fig-shapes — SVG wide: `messages[]` с вложенными `tool_calls` против плоского `input[]` из элементов, связи по id.
4. fig-state — mermaid flowchart: три пути от хода N к ходу N+1 (previous_response_id, ручной replay, conversation) с подписями, что уходит и за что платишь.
5. fig-strict — HTML pipeline: схема → грамматика → маска токенов → валидный JSON.
6. fig-template — mermaid flowchart: JSON tools → шаблон → токены → модель → парсер → tool_calls.
7. fig-overhead — hbar: токены системного промпта тулов Anthropic по поколениям Opus.
8. fig-streams — SVG wide: один вызов инструмента в трёх потоках, где можно парсить аргументы.
9. fig-stop — mermaid flowchart: маршрутизатор stop_reason.
10. fig-cache-thinking — stack: три запроса Anthropic, смена бюджета мышления.
11. fig-anthropic — mermaid sequence: tool_use ×2 → один user с tool_result первыми.
12. fig-append — mermaid flowchart: правка старого сообщения против добавления system-сообщения.
13. fig-gateway — mermaid flowchart: приложение → шлюз → провайдеры, где теряется информация.
14. fig-async — mermaid sequence: async-вызов, inject.
15. fig-errors — mermaid flowchart: статус + код → действие.
16. fig-layers — HTML layers: слои над циклом.

## Что уходит в соседние главы ссылкой

- Кеширование (breakpoints, TTL, диагностика промахов), компакция обоих вендоров → гл. 2.
- Как писать описания инструментов, namespaces, defer_loading, tool search → гл. 3.
- Системный промпт, промпты автономности для GPT-6 Astra → гл. 4.
- MCP-тулы и `tools/list_changed` → гл. 5.
- Устройство Claude Code / Codex / Agents API изнутри → гл. 12; handoffs → гл. 13.
- Supply chain LiteLLM, песочницы Agents API → гл. 16.

## Тест по плану

- Анкета: нет, разделы открываются разными ходами (см. выше).
- Первые предложения: 1 и 7 начинаются со сбоя, 3 с опровержения, 13 без вступления с кода — в конспект не складывается.
- Где провал: раздел 5 (токены) рискует стать справочником — держать на одном вызове GPU в трёх форматах и одном графике. Раздел 14 короткий, без симметричного обзора: вывод «сначала сырой цикл, SDK — когда нужны его гарантии».
