# Глава 11 «Память агента»: отзыв критика полноты

Рецензент: критик полноты, 30 сентября 2026. Прочитаны `index.html` целиком и все четыре файла заметок (`gaps.md`, `spec.md`, `practice.md`, `field.md`). Дыры, которых нет в заметках, я проверял по первоисточникам: WebSearch в этой сессии уже исчерпал лимит, поэтому страницы брал через WebFetch/curl, а ссылки приложены к каждой находке.

## Итог

- critical: 0
- major: 7
- minor: 5

Глава закрывает охват темы почти целиком. Из `gaps.md` в неё попали практически все исправления и новости 2026 года: Managed Agents и Dreams, ADD-only в Mem0, LongMemEval-V2, три поколения памяти Claude.ai, разбор «+26%», коллапс контекста в ACE, OWASP ASI06, Unit 42. Фактических ошибок, которые научили бы читателя неправильному, я не нашёл. Все пробелы относятся к полноте. Больше всего не хватает трёх вещей. Нет управляемой памяти у гиперскейлеров и четвёртой стратегии разрешения противоречий. Нет sleep-time агентов Letta, хотя они прямо названы в охвате. Нет продакшен-примера агента, который правит собственные скиллы.

Границы с соседними главами соблюдены. Компакция, context editing и префиксный кеш сведены к ссылке на главу 2, RAG — на главу 14, формат скиллов — на главу 6, методика оценки — на главу 17. Раздел об отравлении памяти («Что ломается») длиннее, чем нужно для ссылки на главу 16, но всё в нём работает на дизайн пути записи, поэтому отдельной находкой я это не считаю. «Context rot» (Chroma) из `field.md` в главу не вошёл, и это правильно: он относится к главе 2.

---

## Major

### 1. Нет управляемой памяти гиперскейлеров и четвёртой стратегии противоречий

**Что не так.** В таблице «Три стратегии противоречий» (раздел «Zep и Graphiti: у факта две оси времени») три строки: перезапись, «добавление и пометка» и битемпоральная модель. Но есть и четвёртая схема, которую сегодня предлагают два крупнейших облака: LLM-консолидация, которая при записи **обновляет или удаляет** существующие записи и хранит историю ревизий.
- Google Agent Platform Memory Bank: «Consolidation: Identifies if existing memories with the same scope should be deleted or updated based on the extracted information… checks that new memories are not duplicative or contradictory before merging». Каждая генерация оставляет `MemoryRevision` с промежуточным `extracted_memories` и итоговым `fact`. Параметр `revisions_per_candidate_count` задаёт, сколько старых ревизий учитывать при консолидации. Что извлекать, определяют memory topics: managed (`USER_PERSONAL_INFO`, `USER_PREFERENCES`, `KEY_CONVERSATION_DETAILS`, `EXPLICIT_INSTRUCTIONS`) или custom.
- AWS Bedrock AgentCore Memory: шаги Extraction, «Consolidation — Determines whether to write useful information to a new record or an existing record» и «Reflection — Insights are generated across episodes». Стратегии: Semantic, User preference, Summary, Episodic. Три уровня владения (built-in, built-in overrides, self-managed) различаются ценой хранения.

Это ровно та схема, от которой Mem0 ушла в апреле 2026 года. Читатель должен видеть, что облака её сохранили и что противоречие они решают LLM-обновлением с журналом ревизий, а не ранжированием. Сейчас в «Как выбрать архитектуру памяти» готовая инфраструктура — это только «Mem0 Platform или Zep». Бэкендер на AWS или GCP первым делом спросит про AgentCore или Memory Bank.

**Куда и в каком виде.** (а) Четвёртая строка в таблицу стратегий: «Обновление с ревизиями | Memory Bank, AgentCore, Mem0 до 2026 | последняя версия плюс журнал ревизий | вызов LLM на каждую запись, ошибочный UPDATE тихо затирает правду». (б) Абзац в «Как выбрать» о том, когда брать память своего облака. (в) Эпизодическая стратегия AgentCore с Reflection — единственный готовый продукт «эпизодической памяти с выводами по эпизодам», её стоит упомянуть в разделе о CoALA или о фоне.

**Источники:** https://cloud.google.com/gemini-enterprise-agent-platform/scale/memory-bank/generate-memories (проверено 2026-09-30); https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/built-in-strategies.html и …/memory-strategies.html (проверено 2026-09-30); `gaps.md` §Mechanics 7 [G58]. В `gaps.md` Memory Bank помечен как непроверенный, теперь механика подтверждена.

### 2. Sleep-time агенты Letta и статья Sleep-time Compute не упомянуты, хотя охват называет их прямо

**Что не так.** Во всей главе нет слова «sleep-time». Раздел «От блоков MemGPT к файлам» перескакивает от MemGPT 2023 года сразу к MemFS 2026-го. Пропущено звено 2025 года, от которого пошли все «сны» в таблице «Четыре разных „сна“»: sleep-time агенты Letta V1 (фоновый агент с общими блоками памяти, в Letta Harness до сих пор есть команда `/sleeptime`) и статья Sleep-time Compute (Lin et al., Letta и UC Berkeley, arXiv 2504.13171, 17 апреля 2025). Идея статьи отличается от консолидации: модель заранее «думает» над контекстом, пока пользователь молчит. Цифры из абстракта: примерно в 5 раз меньше test-time compute при той же точности (Stateful GSM-Symbolic и Stateful AIME), до +13% и +18% точности при масштабировании sleep-time compute, в 2,5 раза дешевле запрос при амортизации по связанным вопросам. Эффективность, по наблюдению авторов, коррелирует с предсказуемостью запроса. Последний вывод — готовое правило, когда фон окупается.

Кроме того, глава описывает блоки V1 одной фразой («именованные строки, всегда стоящие в промпте»). Не сказано главное, из-за чего их копируют до сих пор: у блока есть `label`, `description`, `value` и `limit`, его можно пометить `read_only` и подключить к нескольким агентам через `block_ids`. Это первый массовый паттерн общей памяти нескольких агентов, и он прямо связан с правилом главы «общая память только для чтения».

**Куда и в каком виде.** Абзац в «От блоков MemGPT к файлам» (блоки, `limit`, `read_only`, общие блоки). Два-три предложения и сноска в «Четыре разных „сна“»: откуда термин, чем «думать заранее» отличается от «сводить записанное», цифры 5× и 2,5×. Можно добавить в таблицу пятую строку «Letta sleep-time (2025)».

**Источники:** arXiv 2504.13171 (абстракт проверен через arXiv API 2026-09-30); `practice.md` §6 [S16][S30]; `field.md` §Letta [S4]; `gaps.md` [G30][G61].

### 3. Раздел о скиллах как процедурной памяти без продакшен-примера агента, который правит свои скиллы

**Что не так.** Охват требует «agents that edit their own prompts/skills». В «Навыках как процедурной памяти» есть Voyager 2023 года и эксперимент Letta, а реального харнесса, где это включено по умолчанию, нет. Такой харнесс есть: Hermes Agent, который глава уже разбирает как пример памяти. Его инструмент `skill_manage` с действиями `create`, `patch` (точечная правка, «preferred»), полная перезапись, `delete`, `write_file` и `remove_file` по документации — «the agent's **procedural memory**». Скиллы пишет и фоновое «self-improvement review» после хода, и проход куратора с консолидацией. Правило содержимого сформулировано как «lessons, not logs»: без номеров PR, дат и цитат из чата. Линтер предупреждает о `incident-log-shape`, `references-sprawl` (больше 60 файлов) и `oversized-body` (больше примерно 24k символов), но «never block a write». Главное для тезиса главы: по умолчанию `skills.write_approval: false`, то есть агент пишет скиллы свободно, **без верификатора**. Строгий режим ставит изменения в очередь `~/.hermes/pending/skills/` и открывает их через `/skills diff` и `/skills approve`.

Этот пример лучше любого довода показывает разрыв между правилом главы («только если есть тест или метрика… и только дельтой») и тем, как это устроено в самом популярном открытом харнессе: примерно 250 тыс. звёзд, по `gaps.md`.

**Куда и в каком виде.** Абзац плюс небольшая таблица действий `skill_manage` в «Навыки как процедурная память». Отдельная строка в «Давать ли агенту править собственные промпты и скиллы»: что включить у себя (`write_approval: true`, патч вместо перезаписи, git для каталога скиллов).

**Источник:** https://raw.githubusercontent.com/NousResearch/hermes-agent/main/website/docs/user-guide/features/skills.md, раздел «Agent-Managed Skills» (проверено 2026-09-30). В заметках этого нет: `gaps.md` «Unverified» прямо называет внутренности самоулучшения скиллов Hermes непрочитанными.

### 4. Ловушка с AGENTS.md описана без выхода из неё

**Что не так.** В «Что и когда попадает в запрос» написано: «добавив себе CLAUDE.local.md в проекте, который живёт на AGENTS.md, ты выключаешь чтение AGENTS.md для себя». Это верно, но документация в том же абзаце даёт решение, а глава его не приводит: настройка **Project instructions** со значениями `claude-md-or-agents-md` (по умолчанию), `claude-md-and-agents-md`, `claude-md` и `managed-only`. Её меняют в `/config` или через `pluginConfigs["agents-md@builtin"].options.instructionFiles`, и есть неочевидная оговорка: «Claude Code ignores it in project and local settings files». В репозитории её не закоммитишь, только в `~/.claude/settings.json` или managed settings. Ещё одна деталь: `~/.claude/CLAUDE.md`, managed CLAUDE.md и `.claude/rules/` в эту проверку не входят и грузятся вместе с AGENTS.md. Все три файла заметок упоминают настройку, в главу она не попала.

**Куда и в каком виде.** Одно-два предложения и JSON-фрагмент на 5 строк сразу после описания ловушки.

**Источник:** https://code.claude.com/docs/en/memory.md, разделы «AGENTS.md» и «Choose which instruction files load» (проверено 2026-09-30); `practice.md` §Current state и §5; `field.md` §Claude Code; `spec.md` §Claude Code.

### 5. LangGraph Store как готовый строительный блок для Python, включая TTL как механизм забывания

**Что не так.** Охват называет «LangMem and LangGraph store». Глава правильно хоронит LangMem и показывает `StoreBackend` в Deep Agents, но сам `BaseStore` и его готовые бэкенды не описывает. При этом в «Как выбрать» читателю предлагается вручную собрать Postgres-таблицу `(user_id, path)`. Сильному Python-бэкендеру нужно знать, что есть из коробки:
- `PostgresStore` и `AsyncPostgresStore` (`langgraph.store.postgres`) с пространствами имён-кортежами, `put`/`get`/`search` и семантическим индексом через `index={"embed": ..., "dims": ...}` (pgvector);
- `TTLConfig`: `default_ttl` (в **минутах**, «after their last access»), `refresh_on_read` (по умолчанию `True`, то есть давность считается от последнего обращения, как в Generative Agents), `sweep_interval_minutes` и `omit_expired` (по умолчанию `False`: просроченная запись **продолжает возвращаться** из `get` и `search`, пока её не удалит sweep).

Последний пункт — настоящие грабли. Он же даёт главе конкретный пример из раздела «консолидация и забывание», которого сейчас нет для Python-стека: срок годности есть только у Mem0 (`expiration_date`) и в OKF (`stale_after`).

**Куда и в каком виде.** Короткий пример кода (10–12 строк: `PostgresStore` плюс `index` плюс `ttl`) в «Когда писать: горячий путь и фон» после Deep Agents или в конкретной схеме в «Как выбрать» как альтернатива ручной таблице.

**Источники:** https://raw.githubusercontent.com/langchain-ai/langgraph/main/libs/checkpoint/langgraph/store/base/__init__.py, `class TTLConfig` (проверено 2026-09-30); https://docs.langchain.com/oss/python/langgraph/add-memory.md, примеры `PostgresStore` и `index=` (проверено 2026-09-30); `practice.md` §10 [S25]; `spec.md` §LangGraph [S24].

### 6. Cognee упомянут только как анекдот про бенчмарк

**Что не так.** Охват: «Cognee and others». В главе Cognee встречается один раз, как пример числа BEAM на 20 вопросах. Архитектура не описана, хотя она дополняет два тезиса главы.
- API из четырёх глаголов: `remember`, `recall`, `improve` («apply feedback, and bridge session knowledge into the graph»), `forget`. «Session distillation curates accepted lessons into permanent memory» — ещё один вариант пути записи через фон.
- Формат обмена **COGX** для импорта памяти из Mem0, Letta, Zep и Graphiti прямо подкрепляет раздел «Формат вместо конвейера» (OKF, memoryfields). Рынок уже нуждается в переносимости между продуктами.
- «Since cognee 1.0 you can run the entire memory layer on a single Postgres instance» с важной оговоркой: граф на Postgres — «demo feature», продакшен-версия лицензируется. Это прямо касается выбора стека для бэкендера.

**Куда и в каком виде.** Абзац в «Формат вместо конвейера» (COGX) или в «Факты и графы» (граф плюс вектор плюс реляционка в одном Postgres, с оговоркой про demo). Строка в сводную таблицу из находки 7.

**Источники:** https://raw.githubusercontent.com/topoteretes/cognee/main/README.md (проверено 2026-09-30; v1.6.1 от 24.09.2026); `spec.md` §Current state [S25]; `gaps.md` [G42].

### 7. Нет сводной таблицы продуктов для выбора

**Что не так.** Глава хороша как чтение, но как справочник неудобна: статус, версия, лицензия и поведение каждого продукта разбросаны по восьми разделам. Инженер, который открывает главу, чтобы выбрать, не найдёт одной таблицы с полями «статус и версия на 30.09.2026 | лицензия и self-host | путь записи | стратегия противоречий | забывание | где подробнее». В `gaps.md` такая таблица почти готова («Current state and versions»): Graphiti 0.30.2 под Apache-2.0, `mem0ai` 2.2.1 под Apache-2.0, `letta` 0.34.0 (V1 в архиве), LangMem 0.0.30 (заброшен), Cognee 1.6.2, Managed Agents memory (бета, заголовок `agent-memory-2026-07-22`), Dreams (research preview), Codex memories (выключены по умолчанию), Hermes, OpenClaw. Сюда же AgentCore и Memory Bank из находки 1.

**Куда и в каком виде.** Таблица в «Как выбрать архитектуру памяти» перед деревом выбора или после него. Одна строка на продукт, у каждой ячейки ссылка на раздел главы.

**Источники:** `gaps.md` §Current state and versions [G1–G65]; находки 1, 5 и 6 этого отзыва.

---

## Minor

### 8. Многоуровневая модель OpenClaw и проспективная память

Глава подробно разбирает путь записи и две полосы чтения OpenClaw, но не показывает таблицу уровней, из которой они вытекают: Instructions, Curated core, Episodic (дневные `YYYY-MM-DD.md`), Prospective и Review (`DREAMS.md`, «никогда» не попадает в контекст). Отдельно не хватает **проспективной памяти** — «вспомнить, чтобы сделать позже». Это тип памяти вне таксономии CoALA. В OpenClaw он реализован как standing intents в SQLite с защитой от спама: «default 24-hour cooldown, 3-fire budget, 90-day expiry, max 3 intents injected per turn». Там же принцип, полезный любому харнессу: «Every memory step in the reply path has a timeout, a fallback, or both».
**Куда:** таблица из пяти строк в «OpenClaw: запись как граница безопасности» и одна фраза о проспективной памяти в «Что переживает окно» (рядом с CoALA). **Источник:** `practice.md` §12 [S23], https://docs.openclaw.ai/concepts/memory-architecture.

### 9. Mem0 Platform Temporal Reasoning и детали гибридного поиска OSS

Глава цитирует issue #5352 про «слепоту ко времени» и перечисляет средства Platform (Supersede, Merge, Synthesis, Decay, `expiration_date`), но пропускает **Temporal Reasoning** (13 мая 2026, Platform v3). Именно эта функция отвечает на жалобу из issue: запросы «last week», «as of March 2025» разрешаются по меткам времени записей, для тестов есть `reference_date`. Для OSS полезна строка из руководства по миграции: «BM25 is a boost signal, not a recall expander. Only semantic search results are candidates». BM25 и совпадение сущностей только переставляют найденное вектором и ничего нового не добавляют.
**Куда:** одно-два предложения в «Факты и графы: Mem0 и Zep». **Источники:** https://docs.mem0.ai/changelog/highlights.md (запись 2026-05-13); https://docs.mem0.ai/migration/oss-v2-to-v3.md, раздел «Retrieval: Multi-Signal Hybrid Search» (оба проверены 2026-09-30).

### 10. MINJA: отравление общей памяти обычными запросами

Правило главы «разделяй по пользователям с первого дня; общая память только для чтения» опирается на Deep Agents и Managed Agents. Сильнее всего его подкрепляет MINJA (arXiv 2503.03704, 5 марта 2025): атакующему не нужен доступ к хранилищу, он внедряет вредные записи «by only interacting with the agent via queries and output observations», и «MINJA enables any user to influence agent memory». Этот материал есть в `gaps.md`, в главу не попал.
**Куда:** одна фраза со ссылкой на главу 16 в «Что ломается» или в пункте «Разделяй по пользователям». **Источник:** arXiv 2503.03704 (абстракт проверен 2026-09-30); `gaps.md` [G50].

### 11. Мелкие механизмы Claude Code для ревизии памяти

В практическом блоке «Открой MEMORY.md проекта…» и в «Включать или нет» не хватает трёх деталей из текущей документации:
- `/doctor prompt-audit` (v2.1.283) ищет устаревшие и противоречащие инструкции. Охватывает CLAUDE.md, CLAUDE.local.md, AGENTS.md, rules, skills и subagents, но **не** каталог auto memory, поэтому ручная ревизия MEMORY.md по-прежнему нужна.
- `CLAUDE_CODE_PROJECT_DIR_NAME` (v2.1.234) вместе с `CLAUDE_CONFIG_DIR` даёт одну auto memory на несколько репозиториев. Полезно тем, у кого память «не та» из-за раскладки проектов.
- `autoMemoryDirectory` из `.claude/settings.json` репозитория применяется только при workspace trust, а при `permissions.blockReadsOutsideWorkingDirectories` не применяется вовсе. Иначе чужой репозиторий мог бы перенаправить твою память.

**Куда:** две-три строки в блоке практики. **Источник:** https://code.claude.com/docs/en/memory.md, разделы «Storage location» и «Check your instructions» (проверено 2026-09-30).

### 12. Предыстория «все пришли к файлам»: Manus, июль 2025

В разделе «Почему все пришли к файлам» конвергенция описана через Letta (август 2025) и LongMemEval-V2. Нет первого громкого продакшен-манифеста: пост Manus от 18 июля 2025 года, «Treat the file system as the ultimate context», где в контексте остаются только пути и URL, а содержимое возвращается по требованию. `spec.md` и `practice.md` оба приводят его как независимое свидетельство.
**Куда:** одна фраза в начале «От блоков MemGPT к файлам». **Источник:** https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus; `practice.md` §11 [S14]; `spec.md` [S29].

---

## Что проверено и верно

- «+26%» против OpenAI memory и полный контекст 72,90 выше Mem0 (66,88); коэффициент «в 15 раз меньше токенов» (26 031 / 1 764 ≈ 14,8) и «6 пунктов» совпадают с таблицей статьи ([G24]).
- В OSS у Mem0 три сигнала поиска (вектор, BM25, сущности), temporal только в Platform: глава права, `spec.md` («четыре сигнала») смешивает OSS и Platform. Проверено по migration guide.
- Лимиты auto memory (200 строк или 25KB, явная ошибка с v2.1.210, `modified` с v2.1.214) и правила AGENTS.md (v2.1.277, `AGENTS.local.md` и `AGENTS.override.md` не читаются) сверены с текущей документацией.
- Разброс Mastra по модели-читателю (94,87 против 84,23, больше 10 пунктов), константы Generative Agents и цифры ACE, Letta Skill Learning и LongMemEval-V2 совпадают с `gaps.md`.
- Устаревших утверждений относительно заметок не нашёл: LangMem, Letta V1, Mem0 до апреля 2026 и «AutoDream» в Claude Code глава подаёт как историю или слух.
