# Ревью кода, протокольных примеров и рисунков — глава 07 (A2A: Agent2Agent)

Дата ревью: 30 сентября 2026. Проверялись все 30 блоков кода (`py_compile` + фактический запуск против
`a2a-sdk` 1.2.1 в изолированном venv), все JSON/JSONC-блоки (`json.loads`), исходник
`specification/a2a.proto` и исходники `a2a-python` (GitHub `main`) построчно против того, что приведено
в главе, и все 16 рисунков (`node tools/qa.mjs --shots`, скриншоты открыты и просмотрены).

**Вывод по объёму:** это самая тщательно проверенная глава из всех, что я видел в таком ревью. Автор не
просто списал код из `a2a-samples`, а реально поднял `server.py`/`client.py` на `a2a-sdk` 1.2.1,
прогнал оба хода разговора и вставил в главу настоящий вывод. Я independently подтвердил это —
подробности ниже. Единственная находка — формальная (невалидный JSON в двух иллюстративных блоках),
без последствий для читателя.

## Итог

| Важность | Количество |
|---|---|
| critical | 0 |
| major | 0 |
| minor | 1 |

## Находки

### 1. [minor] Два JSON-блока не парсятся как JSON из-за голого «…» вместо `"..."`

**Блоки:** `data-title="Неблокирующий вызов и ответ (снято с живого сервера, сокращено)"` (раздел
«Жизненный цикл задачи», строка с `"history": […]`) и `data-title="message/send → ответ в формате 0.3
(снято с живого сервера, сокращено)"` (раздел «Версия 1.0 на бумаге, 0.3 в проводе», строка
`"history": […]}}`).

**Что не так.** Оба блока помечены `data-lang="json"` (не `jsonc`), а значит по правилу автора
(«для JSON проверь, что он разбирается») должны парситься. Ответная часть каждого блока содержит
`"history": […]` — квадратные скобки с голым символом многоточия внутри, не строкой. Это не валидный
JSON-токен, `json.loads` падает с `Expecting value`. Я разделил каждый блок на запрос/ответ (они и так
визуально разделены стрелками `→`/`←`) и прогнал `json.loads` на каждой половине отдельно:

```
[OK]   04_json.json part0: valid JSON (241 chars)   # запрос
[FAIL] 04_json.json part1: Expecting value: line 2 column 81 (char 148)   # ответ, из-за […]
[OK]   15_json.json part0: valid JSON (185 chars)   # запрос
[FAIL] 15_json.json part1: Expecting value: line 5 column 71 (char 340)   # ответ, из-за […]
```
Остальные JSON/JSONC-блоки (в том числе те, где сокращённые UUID вида `"764aeafb-…"` — это многоточие
*внутри строки*, а не голый токен) парсятся нормально; я проверил все 16 JSON/JSONC-блоков главы по
отдельности.

**Как исправить.** Заменить `[…]` на `["…"]` (многоточие как строка) либо просто убрать поле из
примера, раз оно не несёт нагрузки. Косметическая правка, две строки.

**Важность.** Minor: это не фактическая ошибка о протоколе (сам протокол и все статусы/поля переданы
верно, я гонял ровно такой же обмен против настоящего `a2a-sdk` — см. ниже) и не пример, который автор
предлагает скопировать и выполнить — оба блока explicitly помечены «сокращено» и оформлены как
двусторонняя стенограмма провода, а не как отдельный JSON-документ. Тем не менее формально это
нарушение собственного правила автора про проверяемость JSON, поэтому финдинг, а не «всё ок».

## Что проверено и подтверждено верным (без находок)

Ниже — то, что я специально проверял против первоисточника (не только против заметок), потому что для
кода и схем в задаче это явно требовалось. Даю доказательства, потому что «я поверил автору на слово»
здесь неуместно.

**Все 30 блоков кода скомпилировались/распарсились.** 8 Python-блоков — `py_compile` без ошибок. Все
JSON/JSONC-блоки, кроме двух из находки 1, — валидный JSON.

**`server.py` и `client.py` реально работают на `a2a-sdk` 1.2.1.** Поставил `a2a-sdk[http-server,
signing]==1.2.1` (та же версия, что названа в главе) в чистый venv, собрал `server.py` из двух половин
блока кода, запустил `client.py` — вывод совпал с тем, что приведено в главе, посимвольно:
```
агент спрашивает: Какую версию выпускаем? Пришли номер вида 1.4.0.
состояние: TASK_STATE_WORKING
## 1.4.0
- fix: retry on 429
- feat: add ListTasks
состояние: TASK_STATE_COMPLETED
```
Дальше руками через `curl` повторил самый первый обмен главы (`SendMessage` с текстом «fix: retry on
429\nfeat: add ListTasks») — ответ сервера структурно идентичен блоку «Ответ (снят с живого сервера…)»
в разделе 7.1 (тот же `TASK_STATE_INPUT_REQUIRED`, тот же вопрос о версии, тот же `history`). Отправил
вторую задачу в ту же (уже терминальную) задачу — получил `-32004`, `"is in terminal state: 3"`,
`reason: UNSUPPORTED_OPERATION` — дословно как в блоке «SendMessage в завершённую задачу».

Проверил и сценарий «Если соединение оборвалось» (раздел 7.4): отправил `SendMessage` с
`returnImmediately` и семью строками коммитов (как в главе), подождал 0,7 с и вызвал `SubscribeToTask`
— первым кадром действительно пришёл снимок задачи `TASK_STATE_WORKING` с уже готовыми 4 частями
артефакта, а дальше — только недостающие 3 `artifactUpdate` и `statusUpdate COMPLETED`. Это
покадрово совпадает с блоком «SubscribeToTask посреди работы» и со схемой `fig-resubscribe`.

Проверил режим совместимости 0.3 (раздел «Версия 1.0 на бумаге, 0.3 в проводе»): поднял сервер с
`enable_v0_3_compat=True` и двумя `AgentInterface` (0.3 и 1.0), отправил `message/send` без заголовка
`A2A-Version` — получил ответ в формате 0.3 (`"state": "completed"`, `"kind": "text"`); отправил
`SendMessage` без заголовка — получил `-32009`, `"A2A version '0.3' is not supported by this handler.
Expected version '1.0'."` — дословно совпадает с обоими блоками раздела.

Проверил `sign_card.py`: подписал карточку, проверил подпись (прошла), затем подменил список
`skills` в уже подписанной карточке и повторил проверку — получил `InvalidSignaturesError: No valid
signature found`, то есть ровно то поведение, которое обещает комментарий в примере
(`# InvalidSignaturesError, если карточку подменили`).

**Имена классов/методов/полей сверены с исходником `a2a-python` (ветка `main`) построчно**, а не только
с заметками: `TaskUpdater` (`requires_input`, `start_work`, `complete`, `cancel`, `add_artifact`,
`update_status`), `a2a.helpers` (`new_text_message`, `new_text_part`, `new_task_from_user_message`,
`get_message_text` — все сигнатуры, включая порядок и имена параметров, совпадают день-в-день),
`DefaultRequestHandler`/`DefaultRequestHandlerV2` (`agent_executor`, `task_store`, `agent_card`),
`create_jsonrpc_routes`/`create_rest_routes` (включая `enable_v0_3_compat`, `path_prefix`),
`create_client`/`ClientConfig`/`Client.send_message`, `a2a.utils.signing`
(`create_agent_card_signer`, `create_signature_verifier`). Отдельно вытащил и сверил
`specification/a2a.proto` с GitHub (`a2aproject/A2A`, `main`) — оба выдержки из `A2AService` (строки
службы `SendMessage`/`GetTask`/…) и сообщения `Part`/`Message`/`AgentCard`/`AgentInterface`/
`AgentCapabilities`/`AgentSkill`/`TaskStatusUpdateEvent` совпадают с главой дословно, включая номера
полей.

**Числа и даты, которые можно перепутать, сверены с заметками (`gaps.md`, где ровно эти цифры и даты
разрешены как «правильные» из нескольких конфликтующих черновиков) и почти все — с живыми
источниками:** версии SDK (`a2a-sdk` 1.2.1, `a2a-go` v2.6.0, `@a2a-js/sdk` 1.3.0, `a2a-java`
1.4.0.Final, `.NET` 1.0.0-preview2), лаг SDK после релиза спецификации (5 / 39 / 202 дня — арифметика
сходится), даты 0.3.0/1.0.0/1.0.1/AAIF/слияния ACP (все взяты из разрешённых `gaps.md`, а не из
`practice.md`/`field.md`, где они изначально были ошибочны), номера и статусы всех 9 ошибок A2A,
таблица REST-путей, таблица 0.3→1.0, номера GHSA-адвайзори a2a-java (даты 28 августа и 9 сентября
2026, включая какая именно уязвимость к какой дате). Цифры графика «issues по числу комментариев»
(658/245/143/124/116/99/94/65) и графика скачиваний PyPI (55/35/24/26/20/21×) совпадают с таблицами в
`gaps.md` поточно.

**Цитаты с форумов сверены с первоисточником напрямую (через HN Algolia API), а не только с
заметками** — и это важно, потому что в заметках эти цитаты часто даны укороченными фрагментами, а в
главе — полными. Проверил вживую тред `item_id=48582679` (Ask HN, 18 июня 2026) и тред запуска
`item_id=43631381` (9 апреля 2025):
- `lazharichir` (id 48590806): «I am using A2A at work. It's a bit like the "microservices
  architecture" for agents... Allows you or teams to develop agents independently and have them
  interact as and when they need to. No major hurdles so far.» — совпадает с главой дословно; в
  заметках был только хвост «No major hurdles so far».
- `bckr` (id 48590667): «We set up something with a registry of AgentCards and a messaging system
  with SSE streaming—then we realized we didn't need an agent on the other side so now we have this
  weird hybrid pattern. So, no.» — совпадает дословно.
- `nyellin` (id 48590608): «…it was designed on paper by someone with no understanding of prompt
  caching and no consideration of latency or token costs» — совпадает.
- `ahmed89` (id 48632056): «Communication seems solvable. Trusting the action feels much harder.» —
  совпадает.
- `benclarkeio` (id 48593380): цифры и фраза про Gemini Enterprise/AgentForce/watsonx
  Orchestrate/SAP Joule — совпадают дословно, включая самооговорку про предвзятость.
- `TS_Posts` в треде запуска (id 43660169, инженер A2A): «A2A has 'Messages' and 'Artifacts' to
  distinguish between generated content and everything else (context, thoughts, user instructions,
  etc)» — совпадает дословно и с верной атрибуцией (работает в команде A2A).

Также сверил вживую (`raw.githubusercontent.com`, `api.github.com`) репозиторий `a2aproject/a2a-cli`:
команды установки (`brew tap a2aproject/a2a-cli …`, `brew install a2a`, `npx skills add … --skill
a2a-cli`), формулировку «give your coding agent the `a2a` tool to offload work to remote A2A agents»,
поведение `--exec` (stdin/stdout/код возврата), и предупреждение «`--echo` and `--exec` are built for
learning, demos, and testing, not for production use» — всё совпадает с главой дословно (последняя
фраза нашлась не в README верхнего уровня, а в `examples/01-exec-demo/README.md`, глубоко в
репозитории, и автор её всё равно точно процитировал). Также сверил `a2a-tck`: команда `./run_tck.py
--sut-host … --level must` совпадает с README тула буква в букву.

## Рисунки

Прогнал `node tools/qa.mjs 07-a2a --shots --out _qa/07-a2a-code`: `ISSUES none`, 16 фигур (11 mermaid,
2 HTML, 1 рукописный SVG, 2 графика). Открыл все 10 файлов скриншотов (`top.png` + 9 фигур). По
каждому: участники и порядок сообщений на sequence-диаграммах соответствуют тексту и спецификации;
state-диаграмма жизненного цикла задачи (`fig-lifecycle`) — все 9 состояний из `TaskState`
(включая деление на «жди»/«твой ход»/«всё»), терминальные/прерванные группы совпадают с
`proto`-комментариями; `fig-version` корректно показывает единственную «опасную» ветку (пустой
заголовок + compat-режим → тихий откат на 0.3), что и есть главный тезис раздела; `fig-auth-chain`
верно показывает, что креды не едут по A2A и привязаны к агенту B, а не к A; графики (`fig-downloads`,
`fig-identity-issues`) — числа на графике совпадают с таблицами в заметках. Текст читается, подписи не
слипаются, надписи не вылезают за рамки блоков — на скриншотах придраться не к чему.

## Границы главы

Соблюдены: паттерны мультиагентных систем оставлены главе 13 (глава здесь ограничивается механизмом,
не заходит в паттерны оркестрации), AP2 — глава 10 (глава здесь описывает только механизм расширений,
на котором AP2 держится, и явно откладывает детали), MCP — глава 5 (сравнение дано на уровне границы,
без пересказа устройства MCP), авторизация — глава 15 (OAuth-потоки и `securitySchemes` упомянуты
ровно настолько, чтобы объяснить протокол, детали выдачи токенов отправлены в главу 15).
