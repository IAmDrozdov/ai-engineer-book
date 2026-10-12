# Сверка семейства фактов «MCP» по главам книги «Чеклист AI-инженера»

Дата сверки: 30 сентября 2026. Проверялись все 17 глав (`tools/prose.py` → построчный текст,
`/usr/bin/grep -n` по ключевым словам семейства: ревизии MCP и их даты, initialize/сессии, roots,
sampling, logging, HTTP+SSE, транспорты, OAuth 2.1/PRM/DCR/CIMD/enterprise-managed authorization,
MCP Registry, Agentic AI Foundation/Linux Foundation, SDK (mcp 2.x, FastMCP), MCP Apps, Skills over
MCP, context bloat / tool search). Спорные места дополнительно проверены по первоисточникам через
WebFetch (modelcontextprotocol.io/specification/…, NVD API, docs.claude.com).

Ниже — только расхождения и ошибки, подтверждённые либо прямым противоречием между главами (сверено
по исходному HTML, не только по извлечённому тексту, чтобы исключить артефакты слепления цифры со
сноской), либо сверкой с первоисточником.

Проверенные и **не** попавшие в отчёт кандидаты (для протокола): числа про экономию токенов tool
search (72K→8.7K, 79.5%→88.1%, «до 85%») — точно совпадают с постом Anthropic «Advanced tool use» и
между главами 2, 5, 13; список 11 классов атак в Security Best Practices 2026-07-28 (глава 5) —
точно совпадает с реальной страницей спецификации; даты ревизий 2024-11-05…2026-07-28, депрekация
Roots/Sampling/Logging/DCR (SEP-2577, earliest removal ≥ 2027-07-28), реклассификация HTTP+SSE
(SEP-2596, «три месяца после Final») — совпадают с реальным changelog и между главами; оценки CVE-2025-6514
(9.6) и CVE-2025-49596 (9.4) в главах 5 и 16 — на первый взгляд разошедшиеся числа «9,669» и «9,448»
оказались артефактом `prose.py` (склейка «9,6» + номер сноски «69» → «9,669»); в исходном HTML обеих
глав стоят одинаковые и верные 9.6 и 9.4.

## Находки

### 1. Глава 03: неверно описан механизм elicitation в ревизии 2026-07-28

- **Файл**: `03-tool-design/index.html`, строка 860
- **Цитата**: «Сервер MCP может спросить человека и сам, посреди вызова: в ревизии 2026-07-28 он
  возвращает результат с `resultType: "input_required"` и запросом `elicitation/create`, а клиент
  повторяет вызов с ответом пользователя в `inputResponses`»
- **Проблема**: глава утверждает, что в ревизии 2026-07-28 сервер одновременно возвращает
  `input_required`-результат **и** отдельно шлёт клиенту запрос `elicitation/create`. Это неверно и
  противоречит главам 5 и 15 той же книги: там прямо сказано, что MRTR (введённый именно в
  2026-07-28) заменил собой отправку серверных запросов вроде `elicitation/create` — сервер в этой
  ревизии их больше не шлёт вообще, а `elicitation/create` работал только в «первой эпохе» с
  сессиями. Официальный changelog спецификации подтверждает главы 5/15, а не главу 3: «Multi
  Round-Trip Requests (MRTR) pattern introduced which **replaces** the previous approach of sending
  server-initiated requests, such as `roots/list`, `sampling/createMessage`, or `elicitation/create`.
  Servers return an `InputRequiredResult`… Clients respond with `inputResponses` on a retry of the
  original request».
- **Сверено**:
  - `05-mcp/index.html:434` — «...в FastMCP 4 на соединении новой эпохи падает с ошибкой:
    «ToolError: elicitation via server-initiated requests is unavailable on 2026-07-28
    connections»... в 2026-07-28 у сервера больше нет права отправлять клиенту запросы».
  - `15-integrations-auth/index.html:696` — «В ревизии 2026-07-28 сервер больше не отправляет
    клиенту отдельный запрос `elicitation/create`. На `tools/call` он отвечает промежуточным
    результатом `InputRequiredResult`...».
- **Как исправить**: убрать из фразы «и запросом `elicitation/create`»; заменить на то, что сервер
  возвращает `InputRequiredResult` (`resultType: "input_required"`) без отдельного запроса — ровно
  как это описано в главах 5 и 15.
- **Источник**: https://modelcontextprotocol.io/specification/2026-07-28/changelog (пункт 7 Major
  changes); главы 5 и 15.

### 2. Глава 05: дата получения SEP-2640 (Skills over MCP) статуса Final расходится с главой 6

- **Файл**: `05-mcp/index.html`, строка 658 (то же на строках 597 и 1081)
- **Цитата**: «Skills over MCP (SEP-2640, Final 11 сентября 2026 года) разрешает серверу раздавать
  скиллы в формате Agent Skills...»
- **Проблема**: глава 5 трижды (строки 597, 658 и в списке источников 1081) датирует получение
  расширением SEP-2640 статуса Final 11 сентября 2026 года, со ссылкой на
  `modelcontextprotocol.io/seps/2640-skills-extension`. Глава 6 трижды (строки 614, 688, 1179)
  датирует то же событие 13 сентября 2026 года, со ссылкой на
  `github.com/modelcontextprotocol/ext-skills`. Даты не совпадают.
- **Как исправить**: свериться с первоисточником (страница SEP-2640 или момент мержа PR #2640 в
  modelcontextprotocol/modelcontextprotocol) и привести обе главы к одной дате.
- **Источник**: главы 5 и 6.

### 3. Глава 06: та же дата SEP-2640, отличная от главы 5

- **Файл**: `06-skills/index.html`, строка 688 (то же на строках 614 и 1179)
- **Цитата**: «Расширение `io.modelcontextprotocol/skills` (SEP-2640) написано для базовой ревизии
  MCP 2026-07-28 и получило статус Final 13 сентября 2026 года»
- **Проблема**: см. находку 2 — глава 6 называет 13 сентября 2026, глава 5 для того же факта
  называет 11 сентября 2026.
- **Как исправить**: то же, что в находке 2 — согласовать дату между главами по первоисточнику.
- **Источник**: главы 5 и 6.
