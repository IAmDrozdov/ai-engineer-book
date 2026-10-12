# Глава 07. A2A: Agent2Agent — план

Состояние на 2026-09-30. Спека 1.0.1 (2026-05-26). Код главы запущен на a2a-sdk 1.2.1 и a2a CLI 0.3.0
(scratchpad: server.py, client.py, subscribe_probe.py); все JSON/SSE в главе, помеченные «снято с
живого сервера», взяты из этих прогонов, остальные — VERBATIM из спеки/proto.

Лид: запрос к агенту release notes возвращает не текст, а задачу в TASK_STATE_INPUT_REQUIRED.
Спека 1.0.1, 10,3 млн скачиваний a2a-sdk в месяц против 219 млн у mcp, половина фреймворков на 0.3.

## Разделы

1. `task-not-call` «Ответом приходит задача». Начало: настоящий SendMessage и ответ с Task в
   INPUT_REQUIRED. Главное: A2A соединяет непрозрачных агентов (opacity), обмен идёт Message → Task →
   Artifact, а не вызовом функции; contextId склеивает задачи; Message-only / Task / гибрид.
   Рисунки: fig-opacity (versus: что видит вызывающий в MCP и в A2A), fig-objects (flowchart вложенности).
2. `lifecycle` «Жизненный цикл задачи». Начало: повторная отправка в завершённую задачу → −32004
   (снято). Главное: терминальные и прерванные состояния, иммутабельность, referenceTaskIds,
   return_immediately блокирует до терминального ИЛИ прерванного. Рисунок: fig-lifecycle (stateDiagram).
3. `bindings` «Одна модель, три провода». Начало: один и тот же GetTask в JSON-RPC и REST. Главное:
   proto нормативен; PascalCase-методы 1.0 против слэшевых 0.3; таблица операция → метод → путь;
   миф «proto даёт три биндинга бесплатно» (LangSmith, AgentCore только JSON-RPC); ошибки
   google.rpc.Status, устаревшие RFC 9457 примеры в самой спеке; spec prose vs proto (GET :subscribe).
   Рисунок: fig-bindings (flowchart одной операции в трёх биндингах).
4. `streaming` «Стрим, обрыв и push». Начало: живые SSE-кадры с append/lastChunk. Главное: final убран,
   конец = закрытие потока; противоречие §3.1.2 vs §11.7; нет Last-Event-ID; SubscribeToTask отдаёт
   снимок первым (снято); MS Agent Framework: reconnection, не resumption; push = тот же конверт POST'ом,
   at-least-once. Рисунки: fig-stream, fig-resubscribe, fig-push (sequence).
5. `agent-card` «Agent Card: визитка, которой нельзя верить на слово». Начало: curl карточки с ETag.
   Главное: supportedInterfaces упорядочен, tenant; путь agent-card.json с 0.3.0 (ловушка ADK agent.json);
   реестра в спеке нет; extended card; подпись JCS+JWS необязательна, verify SHOULD, jku доказывает только
   домен; #1672 и вендорский спам в issues. Рисунки: fig-signing (pipeline), fig-identity-issues (hbar).
6. `versions` «1.0 на бумаге, 0.3 в проводе». Начало: тот же сервер в режиме совместимости молча
   отвечает в формате 0.3 (снято). Главное: история методов v0.1→1.0, таблица диффа, A2A-Version (пустой =
   0.3), матрица фреймворков, LangSmith «claims 1.0, speaks 0.3», TCK. Рисунок: fig-version (flowchart).
   Хронология ol.timeline.
7. `python` «Свой агент за вечер». Начало: server.py (проверен). Главное: правила AgentExecutor
   (ровно один из двух паттернов, InvalidAgentResponseError), protobuf-типы; клиент; a2a CLI и скилл для
   Claude Code; `a2a server --exec`; фреймворки: ADK to_a2a, fasta2a, CrewAI, AgentCore контракт.
   Рисунки: fig-sdk (flowchart внутри SDK), fig-claude-code (sequence).
8. `security` «Где ломается безопасность». Начало: a2a-java GHSA fail-open authz (CVSS 7.5). Главное:
   непрозрачность не защищает клиента (Unit 42 smuggling, сами авторы: не уязвимость протокола);
   push SSRF (SHOULD в спеке, дефолт в SDK); карточка как недоверенный ввод (имя заголовка API-ключа);
   A2ABreak (37/76/929/11); цепочка AUTH_REQUIRED §7.6.4; схемы аутентификации, TLS MUST/SHOULD.
   Рисунки: fig-smuggling, fig-ssrf, fig-auth-chain (sequence).
9. `production` «Трассы, история и долгие задачи». Начало: LangSmith отдаёт в истории чужие результаты
   тулов предыдущей задачи. Главное: contextId→thread_id, W3C Trace Context без нормативного поля; task
   store и кластерный режим 1.2.0; AgentCore контракт и ловушка с ping; идемпотентность; версия в карточке.
10. `neighbors` «MCP, ACP, AGNTCY и расширения». Начало: «вертикаль и горизонталь» и MCP 2026-07-28,
   который эту границу размыл. Главное: как сочетать; ACP влит 2025-08-25 (не путать с Agent Client
   Protocol); AGNTCY/SLIMRPC как биндинг; AHP не конкурент; расширения (A2A-Extensions, required → −32008,
   нельзя добавлять поля, ноль выпущенных ext-*); AP2 → гл. 10; управление: LF → AAIF, TSC.
11. `verdict` «Нужен ли тебе A2A». Начало: HN 2026 «Is anyone using…». Главное: график разрыва с MCP;
   голоса за и против с авторами; OpenAI отказался; «0–4%» исследование #1755 пробовало метод v0.1;
   решение: когда брать, когда нет, при каком условии мнение меняется. Рисунок: fig-downloads (line).

Потом: selfcheck (10 вопросов), checklist (12), sources (~40).

## Рисунки (16, как в итоговой главе)
fig-opacity (versus), fig-objects (flowchart), fig-lifecycle (state), fig-bindings (flowchart),
fig-chunks (рукописный SVG: сборка артефакта из кусков), fig-resubscribe (seq), fig-push (seq), fig-signing (pipeline), fig-identity-issues
(hbar, комментарии к issues 2026-09-30), fig-version (flowchart), fig-sdk (flowchart), fig-claude-code
(seq), fig-smuggling (seq), fig-ssrf (seq), fig-auth-chain (seq), fig-downloads (line, pypistats).

## В соседние главы ссылкой
- паттерны оркестрации, когда один агент лучше пяти → гл. 13;
- AP2, UCP, мандаты → гл. 10;
- MCP подробно, его tasks/MRTR → гл. 5;
- OAuth, делегирование, хранилища токенов → гл. 15; промпт-инъекции в целом → гл. 16;
- A2UI как расширение → гл. 9; eval/TCK как гейт → гл. 17.

## Тесты плана
- Анкета? Нет: разделы идут от провода (задача → состояния → биндинги → стрим) к доверию (карточка →
  версии → безопасность) и к решению; раздел «версии» сравнивает две версии, «безопасность» начинается со
  сбоя, «соседи» — с проверки расхожего утверждения, которое оказывается неверным.
- Первые предложения: каждый раздел открывается живым запросом/ответом, числом или цитатой.
- Где провал: пустой A2A-Version, ложный «1.0», стрим без возобновления, SSRF по умолчанию,
  спам в issues, исследование «0–4%» с методом v0.1 — всё в теле, не в хвосте.
