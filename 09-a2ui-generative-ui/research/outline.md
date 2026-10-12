# Глава 09 — план

Лид: кнопка с `openUrl` и `javascript:` в аргументе. Валидатор из `a2ui-agent-sdk` 0.7.0 не находит в ней
ошибок (проверено запуском), а `@a2ui/web_core` 0.9.0–0.10.1 выполнял этот JS в origin хоста
(CVE-2026-10032, CVSS 9.3). Вопрос главы: кто в generative UI пишет код, который рисует, и что едет по проводу.

## Разделы (с чего начинается → что главное)

1. `taxonomy` «Данные, структура или код» — одна задача (форма брони) тремя способами. Главное: ось
   «что пересекает сеть» и «чей код рисует пиксели»; controlled / declarative / open-ended + прокси-API (C1)
   и «модель пишет код в песочнице» (FastMCP GenerativeUI, CopilotKit Open Generative UI, Google GenUI).
   Путаница имён у CopilotKit. SDUI как предок. ~800 слов.
2. `a2ui-surface` «A2UI изнутри» — JSONL брони v0.9.1 (исправленный: в документации нет root). Поверхность,
   плоский список смежности (почему он для стриминга), JSON Pointer, согласование каталога, read/write-контракт,
   функции против событий, `sendDataModel` и утечка между сабагентами, транспорты (A2A, AG-UI, MCP). ~1200.
3. `catalog` «Каталог: граница доверия из кода» — запуск валидатора: `DatePicker` и `danger` пойманы,
   `javascript:` прошёл. CVE-цепочка, фикс, 6 недель до advisory. Функции каталога = публичный API.
   Правила эволюции и #1469 «not planned». Три разных `catalogId` в документации и SDK (проверено). ~1100.
4. `versions` «Три поколения за год» — прогноз pscanf с HN. v0.8→v0.9 (structured-output-first →
   prompt-first), v0.9.1, v1.0 RC, который продолжает меняться; история `actionResponse` → двусторонний RPC.
   Хронология. Рекомендация: v0.9.1, код против `specification/*/json`. Express и Markdown Profile. ~900.
5. `mcp-apps` «MCP Apps: HTML в клетке» — реальный `tools/list` и `resources/read` сервера FastMCP.
   Предобъявленные ресурсы, жизненный цикл `ui/*`, двойной iframe, CSP, `domain`, видимость тулов,
   небезопасный пример из спецификации, DOOM и CSP, черновик, стейтлесс-MCP 2026-07-28, хосты, Claude Code. ~1500.
6. `fastmcp` «MCP App на Python за вечер» — шаги; что реально уходит (`structuredContent`, «[Rendered Prefab UI]»);
   FastMCPApp и `visibility: ["app"]`; GenerativeUI и потоковый Pyodide. ~700.
7. `openai` «OpenAI: от window.openai к MCP Apps» — таблица соответствий из документации Plugins. Даты,
   разделение data/render тулов, MCP Extensions 2026-09-29, ChatKit widgets, Open-JSON-UI как рамка вендора. ~650.
8. `frontend` «Когда фронтенд твой» — семь состояний tool part в AI SDK 7; апрувы; RSC не брать; AI SDK как
   хост MCP Apps; CopilotKit (controlled, `a2ui: {}`, Open Generative UI, устаревший `@copilotkitnext`);
   json-render и SpecStream; жалоба про onClick. ~800.
9. `patterns` «Формы, подтверждения, потоковая отрисовка» — жалоба skybrian про задержку. Локальные
   взаимодействия, таблица механизмов стриминга, карточки подтверждения, NoAI-данные, доступность (#1410). ~700.
10. `evidence` «Что показывают замеры» — Elo Google GenUI с условиями, ошибки на старых моделях, EvoGenUI
    74,9% против 37,3%, цифры OpenUI как вендорские и «taste». ~600.
11. `adoption` «Кто это внедрил и что об этом говорят» — названные внедрения, загрузки npm с оговоркой,
    три лагеря на HN. ~500.
12. `choose` «Как выбрать и как поделить работу» — матрица, дерево решений, три схемы композиции A2UI×MCP Apps,
    раздел ответственности сервер/клиент, мой выбор для Python-бэкендера. ~700.

Затем: selfcheck (10 вопросов), checklist (12 пунктов), sources (~40).

## Рисунки (16)

1. `fig-taxonomy` — HTML `.versus`, три колонки: что по проводу / чей код рисует / что видит модель.
2. `fig-a2ui-seq` — mermaid sequence: createSurface → updateComponents → updateDataModel → локальные записи → action.
3. `fig-adjacency` — SVG: плоский список записей и дерево, которое он задаёт; патч одного узла.
4. `fig-cve` — mermaid flowchart: цепочка CVE-2026-10032 и два места фикса.
5. `fig-v1-rpc` — mermaid sequence: callRendererFunction/rendererFunctionResponse, callAgentFunction/agentFunctionResponse, INVALID_FUNCTION_CALL.
6. `fig-apps-lifecycle` — mermaid sequence: Host, Proxy, View, Server; ui/initialize … tool-result.
7. `fig-sandbox` — SVG: вложенные рамки хост → прокси → View, атрибуты sandbox и CSP.
8. `fig-visibility` — mermaid flowchart: фильтрация tools/list и проверка вызовов из View.
9. `fig-prefab` — HTML `.pipeline`: Python-компоненты → JSON → structuredContent → iframe-рендерер → хост.
10. `fig-openai-stack` — HTML `.layers`: MCP core → MCP Apps → window.openai → MCP Extensions.
11. `fig-aisdk-states` — mermaid stateDiagram-v2: семь состояний tool part.
12. `fig-genui-elo` — hbar: Elo пяти форматов ответа (Google, LMArena-набор).
13. `fig-genui-errors` — hbar: доля битых ответов по моделям-основам.
14. `fig-openui-tokens` — hbar: токены на один сценарий, цифры вендора.
15. `fig-downloads` — hbar: загрузки npm за неделю 23–29 сентября 2026, с оговоркой про транзитивные установки.
16. `fig-choose` — mermaid flowchart: дерево выбора.

## В соседние главы ссылкой

- События AG-UI, как A2UI едет поверх AG-UI — глава 8.
- MCP как протокол, стейтлесс-ревизия 2026-07-28, `initialize` — глава 5.
- A2A DataPart, AgentCard — глава 7.
- Подробная безопасность сгенерированного HTML, промпт-инъекции через UI — глава 16.
- Проектирование тулов (data/render split как частный случай) — глава 3.
- Evals для UI-генерации — глава 17.

## Проверка плана по §3

- Анкета «что это → зачем → как → плюсы/минусы»: нет, разделы открываются JSON, запуском валидатора,
  цитатой, реальным выводом сервера, таблицей, жалобой, цифрой.
- Первые предложения: у 4, 5, 9, 10 открытие — чужая цитата или вывод команды, вне контекста непонятно.
- Где провал: самопроверка на то, что середина (разделы 5–8) не превращается в обзор SDK; в каждом есть
  сбой из field/gaps (CSP у DOOM, небезопасный пример спецификации, устаревший импорт, onClick).
- Сравнение кончается выбором: раздел 12, плюс рекомендации в 4 и 8.
