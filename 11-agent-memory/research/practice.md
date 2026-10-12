# Глава 11. Память агента — заметки по практике инженерии (lens: engineering practice)

## TL;DR (что инженер должен знать сегодня, 2026-09-30)

- Память агента ≠ RAG и ≠ контекст-инженерия отдельного запроса. CoALA (Sumers/Yao/Narasimhan/Griffiths, Princeton, 2023) даёт словарь: working (в контексте LLM), episodic (прошлые эпизоды/траектории), semantic (факты о мире/пользователе), procedural (код + веса) [S1].
- В 2025-2026 индустрия окончательно разошлась во мнениях о "лучшей" архитектуре: файлы (CLAUDE.md/AGENTS.md/MEMORY.md), блоки-в-контексте (Letta/MemGPT), extract-update пайплайн с фактами (Mem0), темпоральный граф знаний (Zep/Graphiti), просто RAG/семантический recall (Mastra). Каждый лагерь публикует бенчмарки, где выигрывает именно он — читайте методологию, а не заголовок [S8][S9][S13].
- Anthropic выпустил официальный **memory tool** (`memory_20250818`) в публичной бете — клиентский, файловый, `/memories`, шесть команд (view/create/str_replace/insert/delete/rename), обязательная защита от path traversal на стороне приложения [S3].
- Claude Code имеет два независимых механизма: **CLAUDE.md/AGENTS.md** (пишет человек, "правила") и **auto memory** (пишет модель сама: user/feedback/project/reference заметки, индекс `MEMORY.md` ≤200 строк/25КБ, детальные topic-файлы читаются on-demand) [S4].
- Consumer-memory (ChatGPT, Claude.ai) — это не то же самое, что API memory tool: это скрытый "досье"-профиль, вызывающий serious backlash за непредсказуемость (Simon Willison, май 2025) [S11]; Anthropic ответил memory-per-project + incognito вместо глобального профиля (сентябрь 2025) [S12].
- Практическое правило от нескольких источников независимо: **пиши в момент, когда знаешь дёшево (write-time curation), читай лениво (just-in-time retrieval)**. Anthropic формулирует это как "just-in-time context retrieval" [S2]; OpenClaw формулирует как "retrieval matters less than reliable writing" [S15].
- Self-improvement без finetuning: Reflexion (2023, verbal RL через episodic buffer) [S17], Voyager (2023, растущая библиотека исполняемых Python-скиллов = procedural memory) [S18], Dynamic Cheatsheet (2025, тест-тайм память эвристик) [S20], ACE (2025/ICLR2026, playbook + generator/reflector/curator, решает "brevity bias" и "context collapse") [S19].
- Бенчмарки LoCoMo (2024) и LongMemEval (2024/ICLR2025) — стандарт индустрии, но воспроизводимость под вопросом: Zep заявляет 94.8% DMR / +18.5% LongMemEval [S9], Mem0 заявляет +26% над OpenAI memory [S8], Mastra (RAG-only) заявляет 80% против заявленных Zep 72% на тех же LongMemEval данных [S13] — числа несопоставимы без одинаковой методологии.
- "Filesystem beats memory tools" — не один результат, а сходящаяся практика нескольких независимых команд: Manus (июль 2025, "treat the file system as ultimate context") [S14], Anthropic (CLAUDE.md/auto-memory + memory tool как файлы) [S3][S4], Letta Filesystem (июль 2025, grep/open/semantic_search поверх папок) [S22], OpenClaw (пятиуровневая файловая модель памяти) [S23].
- Sleep-time compute (Letta/UC Berkeley, апрель 2025) — вычисление "во сне" между запросами; до 5× снижение test-time compute на Stateful GSM-Symbolic/AIME, до 2.5× снижение стоимости на амортизации по нескольким связанным запросам [S16]. OpenClaw реализует похожую идею как "Dreaming" (фоновая консолидация 3 фазы) [S24].
- Memory poisoning — не гипотетическая угроза, а структурная проблема: если у памяти нет provenance/trust boundary, контент из недоверенного источника (веб-страница, чужой промпт) может "отравить" MEMORY.md и навсегда влиять на будущие сессии. OpenClaw — единственный из изученных источников, реализующий структурную защиту через origin-класс + quarantine на уровне tier [S23].
- Consumer chat-память (ChatGPT/Claude) и agent-память (Letta/Mem0/Zep/memory tool) решают разные задачи: первая — персонализация диалога, вторая — состояние долгоживущей рабочей задачи. Не путайте архитектуры при выборе для проекта.

## Current state and versions (на 2026-09-30)

- **Claude memory tool**: `type: "memory_20250818"`, доступен на всех моделях Claude 4+ через Messages API; работает вместе с **context editing** (client-side clearing) и **compaction** (server-side summarization, запущена как отдельная фича) [S3].
- **Claude Code**: `/memory`, auto memory (вкл. по умолчанию), `AGENTS.md` читается напрямую с версии Claude Code v2.1.277+ (ранее только через `@AGENTS.md` импорт в CLAUDE.md); настройка `Project instructions` (`claude-md-or-agents-md` / `claude-md-and-agents-md` / `claude-md` / `managed-only`) [S4].
- **Letta** (ex-MemGPT) — коммерциализировал MemGPT-исследование: memory blocks (core/archival/recall), Letta Filesystem (июль 2025), "sleep-time agents" концепция в продукте, свой Agent Development Environment и Letta Code [S6][S21][S22].
- **Mem0** — arXiv 2504.19413 (апрель 2025, YC-backed стартап), extract→update граф-версия Mem0g; активно продвигается как "production-ready" alt к MemGPT/vector DB [S8].
- **Zep/Graphiti** — arXiv 2501.13956 (январь 2025); Graphiti — open-source библиотека (Apache-2.0-подобная, MIT судя по README) под темпоральный граф, Zep — управляемый сервис поверх неё; активно судится в бенчмарках с Mem0 и с Mastra [S9][S13].
- **LangMem SDK** — вышел LangChain, февраль 2025; официально признаёт: episodic memory "underdeveloped", procedural memory реализована как prompt-optimization (не skill library) [S10].
- **LangGraph Store (BaseStore)** — стандартный интерфейс cross-thread памяти в LangGraph: `put/get/search/list_namespaces`, опциональная semantic-индексация через `init_embeddings` [S25].
- **Cognee** — open-source "AI memory engine" (topoteretes), гибрид vector+graph+relational, заявляет 79% на BEAM@100k токенов (vs 73.4% предыдущий SOTA) и 67% на BEAM@10M токенов (vs 64.1%) [S7].
- **OpenClaw** — открытый (501(c)(3) Foundation) агентный харнесс-альтернатива Claude Code/Cursor (глава 12), с одной из самых проработанных production-грейд архитектур памяти из всех изученных источников: пятиуровневая модель, "Dreaming" консолидация, provenance-безопасность [S23][S24][S26].
- **ChatGPT memory** — с апреля 2025 модель хранит развёрнутое "досье" (не просто список заметок), вызвало критику; с августа 2025 появилась project-only память [S11].
- **Claude.ai память (consumer)** — запущена 11 сентября 2025 для Team/Enterprise, расширена на Pro/Max 23 октября 2025; память per-project + incognito режим [S12].

## Timeline

| Дата | Событие | Источник |
|---|---|---|
| 2023-04-07 | Generative Agents (Park et al., Stanford): memory stream + recency/importance/relevance retrieval, reflection | [S27] |
| 2023-03-20 | Reflexion (Shinn et al.): verbal RL, episodic memory buffer | [S17] |
| 2023-05-25 | Voyager (Wang et al., NVIDIA/Caltech): skill library как procedural memory | [S18] |
| 2023-09-05 | CoALA (Sumers et al., Princeton/DeepMind): таксономия памяти для LLM-агентов | [S1] |
| 2023-10-12 | MemGPT (Packer et al., UC Berkeley): OS-подобное управление контекстом, virtual context | [S6] |
| 2024-02-27 | LoCoMo (Maharana et al.): бенчмарк очень-долгосрочной диалоговой памяти | [S28] |
| 2024-10-14 | LongMemEval (Wu et al.): 500 вопросов, 5 способностей, -30% точности у коммерческих ассистентов | [S29] |
| 2025-02-13 | Letta blog "RAG vs Agent Memory" | [S21] |
| 2025-02-18 | LangMem SDK launch (LangChain) | [S10] |
| 2025-04-10 | Dynamic Cheatsheet (Suzgun et al., Stanford): тест-тайм память эвристик | [S20] |
| 2025-04-17 | Sleep-time Compute paper (Lin et al., Letta/UC Berkeley) | [S16] |
| 2025-04-28 | Mem0 paper (Chhikara et al.) | [S8] |
| 2025-05-14 | Letta "Memory Blocks" blog | [S6] |
| 2025-05-21 | Simon Willison критикует ChatGPT memory dossier | [S11] |
| 2025-07-07 | Letta "Agent Memory" (4-компонентная таксономия + sleep-time agents) | [S30] |
| 2025-07-17 | Mastra: 80% LongMemEval чистым RAG, публичный спор с Zep | [S13] |
| 2025-07-18 | Manus blog "Context Engineering for AI Agents": файловая система как память | [S14] |
| 2025-07-24 | Letta Filesystem (grep/open/semantic_search) | [S22] |
| 2025-08-08 | Cognee "AI memory evals" — критика HotPotQA-стиля метрик | [S31] |
| 2025-09-11 | Claude.ai память запущена (Team/Enterprise) | [S12] |
| 2025-09-29 | Anthropic "Effective context engineering" — memory tool публичная бета, structured note-taking | [S2] |
| 2025-10-06 | ACE paper на arXiv (ICLR 2026) | [S19] |
| 2025-10-23 | Claude.ai память расширена на Pro/Max | [S12] |
| 2025-11-26 | Anthropic "Effective harnesses for long-running agents" — progress-file паттерн | [S5] |
| 2026-03-29 | ACE paper v3 (revision) | [S19] |
| 2026-08-07 | Cognee "AI Agent Memory: The Definitive Guide" | [S7] |

## Mechanics

### 1. CoALA-таксономия (эталонный словарь для главы) [S1]

Прямая цитата (arXiv HTML, 2309.02427):

> "Episodic memory stores experience from earlier decision cycles… An agent can also write new experiences from working to episodic memory as a form of learning."
>
> "Semantic memory stores an agent's knowledge about the world and itself… language agents may also write new knowledge obtained from LLM reasoning into semantic memory as a form of learning."
>
> "Language agents contain two forms of procedural memory: implicit knowledge stored in the LLM weights, and explicit knowledge written in the agent's code… Unlike episodic or semantic memory that may be initially empty or even absent, procedural memory must be initialized by the designer with proper code to bootstrap the agent… learning new actions by writing to procedural memory is possible… but it is significantly riskier than writing to episodic or semantic memory, as it can easily introduce bugs or allow an agent to subvert its designers' intentions."
>
> Working memory (заимствовано из Soar/Baddeley-Hitch 1974): "reflects the agent's current circumstances: it stores the agent's recent perceptual input, goals, and results from intermediate, internal reasoning."

Практический вывод для инженера: working memory = контекстное окно LLM прямо сейчас; всё остальное — внешнее хранилище с write/read действиями как частью action space агента. Это прямая теоретическая база для главы, на неё можно опираться при классификации каждого продукта ниже.

### 2. Anthropic memory tool — точный wire-формат (VERBATIM, [S3])

Подключение (Python SDK):
```python
message = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=2048,
    messages=[{"role": "user", "content": "Help me respond to this customer service ticket."}],
    tools=[{"type": "memory_20250818", "name": "memory"}],
)
```

Пример вызова инструмента моделью (VERBATIM JSON из документации):
```json
{
  "type": "tool_use",
  "id": "toolu_01C4D5E6F7G8H9I0J1K2L3M4",
  "name": "memory",
  "input": { "command": "view", "path": "/memories" }
}
```

Ответ приложения:
```json
{
  "type": "tool_result",
  "tool_use_id": "toolu_01C4D5E6F7G8H9I0J1K2L3M4",
  "content": "Here're the files and directories up to 2 levels deep in /memories, excluding hidden items and node_modules:\n4.0K\t/memories\n1.5K\t/memories/customer_service_guidelines.xml\n2.0K\t/memories/refund_policies.xml"
}
```

Шесть команд: `view` (директория/файл, `view_range`), `create`, `str_replace` (ошибка при неуникальном `old_str`: `"No replacement was performed. Multiple occurrences of old_str \`{old_str}\` in lines: {line_numbers}..."`), `insert` (0 = начало файла), `delete` (рекурсивно, но нельзя удалить сам `/memories`), `rename` (нельзя переименовать сам `/memories`).

Автоматически добавляемый системный промпт (когда memory tool включён), VERBATIM:
> "IMPORTANT: ALWAYS VIEW YOUR MEMORY DIRECTORY BEFORE DOING ANYTHING ELSE. MEMORY PROTOCOL: 1. Use the `view` command of your `memory` tool to check for earlier progress. 2. ... (work on the task) ... — As you make progress, record status / progress / thoughts etc in your memory. ASSUME INTERRUPTION: Your context window might be reset at any moment, so you risk losing any progress that is not recorded in your memory directory."

Инструмент **client-side** — Anthropic не хранит данные, это ответственность приложения. Обязательная защита от path traversal (`../`, URL-encoded `%2e%2e%2f`) — прямая цитата: "A malicious path such as `/memories/../../secrets.env` can reach files outside the `/memories` directory. Your implementation must validate every path in every command."

Сочетается с двумя другими механизмами контекст-менеджмента: **context editing** (клиентская чистка старых tool-результатов) и **compaction** (серверная суммаризация всего разговора при приближении к лимиту окна). Рекомендация Anthropic: "compaction keeps the active context small without client-side bookkeeping, and memory preserves the information that must survive summarization" [S3].

Практический "multisession software development pattern" [S3]: инициализирующая сессия создаёт progress-log + feature-checklist + init-скрипт; каждая следующая сессия читает эти файлы вместо повторного исследования кода; в конце сессии — обновление progress-log. Тот же паттерн разобран подробнее в отдельном инженерном посте — см. ниже.

### 3. Anthropic "Effective harnesses for long-running agents" — progress-file паттерн (COMPOSED пересказ + VERBATIM фрагменты, [S5], 2025-11-26)

Архитектура: **Initializer session** (создаёт `claude-progress.txt`, JSON feature-list, `init.sh`, первый git commit) → **Coding session(s)** (читают прогресс, делают одну фичу, коммитят, обновляют progress-log).

Формат feature-файла (VERBATIM JSON):
```json
{
    "category": "functional",
    "description": "New chat button creates a fresh conversation",
    "steps": [...],
    "passes": false
}
```
Правило: агенты меняют только поле `passes`; цитата — "It is unacceptable to remove or edit tests because this could lead to missing or buggy functionality." Git используется как механизм отката: "use git to revert bad code changes and recover working states." Принцип: фича считается завершённой только после end-to-end верификации, не после написания кода — это прямая защита от накопления лжи в progress-log.

### 4. Anthropic "Effective context engineering" — три паттерна памяти в одном посте (VERBATIM, [S2], 2025-09-29)

- **Compaction**: "taking a conversation nearing the context window limit, summarizing its contents, and reinitiating a new context window with the summary." В Claude Code: сохраняются "architectural decisions, unresolved bugs, and implementation details", отбрасываются "redundant tool outputs or messages"; после компакции агент продолжает с 5 последними использованными файлами.
- **Structured note-taking / agentic memory**: "a technique where the agent regularly writes notes persisted to memory outside of the context window." Пример — Claude, играющий в Pokémon, ведёт точные счётчики через тысячи игровых шагов: "for the last 1,234 steps I've been training my Pokémon in Route 1, Pikachu has gained 8 levels toward the target of 10."
- **Just-in-time retrieval**: "agents maintain lightweight identifiers (file paths, stored queries, web links, etc.) and use these references to dynamically load data into context at runtime using tools" — вместо предзагрузки всего. Claude Code — гибрид: CLAUDE.md грузится заранее (скорость), а `glob`/`grep` работают в рантайме, "effectively bypassing the issues of stale indexing and complex syntax trees."
- **Sub-agent architecture**: суб-агент тратит десятки тысяч токенов на исследование, но возвращает "condensed, distilled summary of its work (often 1,000-2,000 tokens)".

### 5. Claude Code: CLAUDE.md vs auto memory — детальная механика (VERBATIM, [S4])

Ключевая таблица источника:

| | CLAUDE.md files | Auto memory |
|---|---|---|
| Кто пишет | Вы | Claude |
| Что содержит | Инструкции и правила | Выводы и паттерны |
| Область | Проект/пользователь/организация | На репозиторий, общее между worktree |
| Загружается в | Каждую сессию | Каждую сессию (первые 200 строк/25КБ) |

Порядок загрузки CLAUDE.md по иерархии (от широкого к узкому): managed policy → user (`~/.claude/CLAUDE.md`) → project (`./CLAUDE.md`) → local (`./CLAUDE.local.md`). Все файлы **конкатенируются**, не переопределяют друг друга; порядок в контексте — от корня файловой системы к рабочей директории, т.е. ближайший к месту запуска читается последним.

Auto memory — 4 типа заметок (`type` в frontmatter): `user` (роль/экспертиза), `feedback` (правки пользователя), `project` (текущая работа, дедлайны), `reference` (внешние ссылки: трекер задач, дашборд). Модель **не** сохраняет то, что выводимо из кодовой базы, и не дублирует CLAUDE.md. Хранилище: `~/.claude/projects/<project>/memory/` — один `MEMORY.md`-индекс + отдельные topic-файлы; при превышении 200 строк/25КБ Claude Code сначала предупреждает модель сократить файл, а при переполнении — жёстко требует переписать индекс (иначе всё, что за лимитом, не грузится).

Формат имени внешнего инструктивного файла — AGENTS.md — читается напрямую с v2.1.277+; правило приоритета: если есть CLAUDE.md/CLAUDE.local.md где-либо по пути — AGENTS.md не читается вовсе (если не включена настройка `claude-md-and-agents-md`).

Важная деталь про доверие: HTML-комментарии `<!-- ... -->` в CLAUDE.md **вырезаются** перед инъекцией в контекст модели — механизм оставлять заметки для людей без траты токенов. Импорт внешнего (вне рабочей директории) файла требует явного одобрения пользователем один раз на проект (approval dialog) — защита от чужого CLAUDE.md, закоммиченного в общий репозиторий.

### 6. Letta / MemGPT — эволюция архитектуры [S6][S21][S22][S30]

MemGPT (2023, arXiv 2310.08560): "virtual context management, a technique drawing inspiration from hierarchical memory systems in traditional operating systems" — есть main context (в окне LLM) и external context (вне окна); функции-вызовы страниц перемещают данные между уровнями; "interrupts" управляют потоком контроля между агентом и пользователем без прерывания сессии.

Letta (коммерческий продукт на основе MemGPT-идей) описывает 4-компонентную таксономию [S30]:
1. **Message Buffer** — недавние сообщения ("perpetual thread").
2. **Core Memory** — блоки в контексте, управляемые самим агентом или другими агентами; изначально в MemGPT это были блоки `human` и `persona`.
3. **Recall Memory** — вся история взаимодействий, доступная поиском, но не в активном контексте.
4. **Archival Memory** — явно сформулированное знание во внешних БД (вектор/граф).

Self-editing memory — код (VERBATIM, [S6]):
```python
def rethink_memory(agent_state: "AgentState", new_memory: str, target_block_label: str):
    """Re-evaluate the memory in the block, integrating new information."""
    if agent_state.memory.get_block(target_block_label) is None:
        agent_state.memory.create_block(
            label=target_block_label,
            value=new_memory,
        )
    agent_state.memory.update_block_value(
        label=target_block_label,
        value=new_memory,
    )
```

**Sleep-time agents** [S30]: асинхронное управление памятью специализированными агентами в фоне/во время простоя — неблокирующие операции, проактивное (не ленивое) обновление памяти, более высокое качество консолидации при долгих диалогах. Академическая основа — отдельная статья "Sleep-time Compute" (Lin et al., апрель 2025, соавторы из Letta и UC Berkeley) [S16]: до **5× снижение** необходимого test-time compute для равной точности на Stateful GSM-Symbolic/AIME; до **13-18%** прироста точности при масштабировании sleep-time compute; **2.5×** снижение стоимости запроса при амортизации через Multi-Query GSM-Symbolic. Ключевая идея: предвычисляй ответы на вероятные будущие вопросы офлайн, пока модель "не занята".

**Letta Filesystem** (июль 2025, [S22]) — трактует документы как папки/файлы для агента, три инструмента: `grep`, `open` (построчное чтение), `semantic_search`. Позиционируется против Claude Projects явно: "complete transparency into your context window and how individual files are managed" — пользователь видит, какие файлы реально загружены. Количественных бенчмарков в анонсе нет — это осознанный дизайн-выбор в пользу debuggability, а не заявленная точность.

### 7. Mem0 — extract/update пайплайн + граф-вариант [S8]

arXiv 2504.19413 (Chhikara, Khant, Aryan, Singh, Yadav, апрель 2025). Архитектура — "dynamically extracting, consolidating, and retrieving salient information" из диалога (не наивное журналирование всего). Mem0g добавляет граф поверх базового Mem0 для "complex relational structures among conversational elements".

Числа (LOCOMO бенчмарк, self-reported):
- **+26%** относительное улучшение над OpenAI memory feature по метрике LLM-as-a-Judge.
- Mem0g даёт ~**+2%** над базовым Mem0.
- **-91%** p95 latency и **>90%** снижение стоимости токенов относительно full-context (подать всю историю целиком).

Важно для читателя: это self-reported числа стартапа-вендора против собственных baseline'ов — сравнивайте методологию перед использованием в продакшн-решении (см. секцию "Numbers" и "Pitfalls" ниже).

### 8. Zep/Graphiti — темпоральный граф знаний [S9] + архитектура из README [S32]

arXiv 2501.13956 (Rasmussen, Paliychuk, Beauvais, Ryan, Chalef, январь 2025). Zep = управляемый сервис, Graphiti = open-source ядро (github.com/getzep/graphiti).

Из README Graphiti (VERBATIM ключевые термины):
- **Episodes** — "the raw data that produced it… Every derived fact traces back here" (provenance/lineage).
- **Bi-temporal tracking**: "Explicit bi-temporal tracking with automatic fact invalidation" — в отличие от простого timestamp-трекинга у конкурентов.
- **Hybrid retrieval**: "Combines semantic embeddings, keyword (BM25), and graph traversal for low-latency, high-precision queries without reliance on LLM summarization."
- Сравнение с "microsoft's GraphRAG" из того же README (таблица): у Graphiti — "Continuous, incremental updates… in real-time as episodes are ingested" против батчевых обновлений; латентность запроса — "Typically sub-second" против "Seconds to tens of seconds".

Числа из статьи Zep: DMR-бенчмарк — **94.8%** (против заявленных у MemGPT 93.4%); LongMemEval — улучшение точности до **+18.5%**; снижение латентности ответа на **90%** относительно baseline-подходов.

### 9. Спор Mastra vs Zep на LongMemEval — показательный пример вендорского бенчмарк-спора [S13]

Mastra (framework-компания, автор Tyler Barnes, 17 июля 2025) прямо оспорила рекомендацию Zep "перестать использовать RAG для agent memory": добились **80.05%** overall accuracy на LongMemEval чистым semantic recall (topK=20, GPT-4o) против заявленных Zep 72%. Таблица по категориям (VERBATIM числа из источника):
```
knowledge-update:         84.6% (66/78)
multi-session:            76.7% (102/133)
single-session-assistant: 100.0% (56/56)
single-session-preference: 46.7% (14/30)
single-session-user:      97.1% (68/70)
temporal-reasoning:       75.2% (100/133)
Overall Accuracy:         80.05%
```
Метод потребовал 4 цикла доработки (шаблоны запросов, более умные апдейты, temporal fixes, форматирование) — то есть "просто RAG" тоже требует серьёзной инженерии, чтобы конкурировать с продвинутыми системами. Сравнений с Mem0/MemGPT/full-context в статье нет — важная методологическая дыра при чтении любого такого поста.

### 10. LangMem / LangGraph Store [S10][S25]

LangMem (LangChain, февраль 2025) явно признаёт неполноту: "opinionated utilities for episodic memory" — **пока не готовы** (episodic memory "underdeveloped"); procedural memory реализована не как skill library, а как **prompt-optimization**:
```python
from langmem import create_prompt_optimizer
optimizer = create_prompt_optimizer(
    "anthropic:claude-3-5-sonnet-latest",
    kind="metaprompt",
    config={"max_reflection_steps": 3}
)
```
Semantic memory:
```python
from langmem import create_memory_manager
manager = create_memory_manager(
    "anthropic:claude-3-5-sonnet-latest",
    instructions="Extract user preferences and facts",
    enable_inserts=True
)
```

LangGraph **BaseStore** — низкоуровневый API cross-thread памяти, на котором построен LangMem: `aput(namespace, key, value, index=None)`, `aget`, `adelete`, `asearch(namespace_prefix, query=None, filter=None, limit=10)`, `alist_namespaces`. Namespace — tuple, matching по префиксу: запрос `("alice",)` вернёт `("alice","memories")` и `("alice","preferences")`. Семантический поиск включается индексацией через `init_embeddings`:
```python
store = InMemoryStore(
    index={"embed": init_embeddings("openai:text-embedding-3-small"),
           "dims": 1536, "fields": ["food_preference", "$"]}
)
memories = store.search(namespace, query="What does the user like to eat?", limit=3)
```
Практический вывод: LangGraph даёт "сырой" key-value+vector store; вся продуктовая логика (что писать, когда консолидировать, что стирать) — задача разработчика или библиотеки поверх (LangMem).

### 11. Manus — "файловая система как контекст" [S14]

Автор Yichao "Peak" Ji, 18 июля 2025, блог Manus (продакшн-агент с реальной нагрузкой). Ключевые цитаты:
> "KV-cache hit rate is the single most important metric for a production-stage AI agent."
> "Treat the file system as the ultimate context… directly operable by the agent itself." — вместо усечения наблюдений (которое теряет информацию безвозвратно), Manus держит файлы на диске и оставляет в контексте только пути/URL, восстанавливая содержимое по требованию.
> "Avoid dynamically adding or removing tools mid-iteration… any change will invalidate the KV-cache." — рекомендация: маскировать доступные действия через logits masking/state machines, а не менять сам список tools.
> "Leave the wrong turns in the context… the model can implicitly update its internal beliefs." — не подчищайте ошибки агента из истории, это часть обучающего сигнала для текущей сессии.
> "Don't few-shot yourself into a rut… introduce small amounts of structured variation." — единообразные few-shot паттерны в истории провоцируют агента механически повторять действия там, где нужно новое решение.

Это прямо стыкуется с Anthropic-паттерном "just-in-time retrieval" — независимая конвергенция двух продакшн-команд к одному и тому же решению.

### 12. OpenClaw — самая детализированная production-архитектура памяти среди изученных источников [S23][S24][S26]

Пять принципов дизайна (VERBATIM):
1. "The model only remembers what is written to files in the agent workspace." (транспарентность)
2. "Retrieval matters less than reliable writing" — курирование смещено в фоновый процесс, а не в reply-path.
3. "Content-level scanning cannot catch poisoned facts" → enforcement на **write time** через структурные гейты, не через фильтрацию контента.
4. Детерминированные границы + модельное суждение только там, где оно реально нужно (scoring/threshold/lifecycle — код; смысловая оценка — модель).
5. "Every memory step in the reply path has a timeout, a fallback, or both." (graceful degradation)

**Пятиуровневая модель** (таблица источника):

| Tier | Хранилище | Кто пишет | Инъекция в контекст |
|---|---|---|---|
| Instructions | `AGENTS.md`, файлы workspace | Только люди | Всегда в начале сессии |
| Curated core | `MEMORY.md`, `USER.md` | Dreaming-консолидация; прямые запросы юзера | В начале сессии (если eligible); с бюджетом |
| Episodic | Дневные заметки (`YYYY-MM-DD.md`), транскрипты | Агент во время работы; флаши; транскрипты | Только по recall, не при старте |
| Prospective | Standing intents (SQLite), cron | Intent tool; scheduled tasks | Только при срабатывании триггера |
| Review | `DREAMS.md`, отчёты dreaming | Фазы dreaming | Никогда (только для чтения человеком) |

**Provenance-безопасность** — origin-класс закрытым списком: `owner` (пользователь в доверенном канале), `agent` (производное от контента владельца), `untrusted` (внешние источники), `system` (служебное). Правило: "Cron, heartbeat, and sub-agent sessions do not produce durable memory candidates" (защита от накопления шума из фоновых прогонов); "Content injected from memory is structurally marked and never re-extracted as new memory" (защита от петли усиления). При работе с внешним контентом: "When a tool result declares network-sourced content (web fetches, browser reads, search results), the rest of that turn is marked tainted."

**Write path** — единственный основной писатель — Dreaming consolidation; интерактивные сессии, конец сессии и pre-compaction flush подают сигналы в episodic tier + индекс, дальше — детерминированный gate (ранжирование по recall relevance/frequency/query diversity/recency/multi-day recurrence/conceptual richness; кандидаты с origin `untrusted`/`system` исключаются структурно **до** построения промпта), затем модельная консолидация (объединение дублей, вытеснение устаревшего через supersession key), затем атомарная запись с optimistic concurrency (content-hash re-check перед rename; если файл поменялся конкурентно — rewrite прерывается на этот sweep).

**Dreaming — 3 фазы** (аналогия со сном): Light (дедупликация сигналов, стейджинг кандидатов, никогда не пишет в MEMORY.md), REM (тематические summary/reflection из недавних трасс, тоже без прямой записи), Deep (два последовательных гейта: детерминированный ранжирующий + модельная консолидация → пишет обновлённый MEMORY.md). Расписание по умолчанию — 3:00 ночи, один унифицированный cron на все под-агенты workspace во избежание дублирования.

**Recall — два "lane" по стоимости**: Lane 1 (без модельных вызовов) — bootstrap-инъекция MEMORY.md/USER.md, ranked search (гибридная релевантность × экспоненциальный recency decay с полураспадом 30 дней × importance multiplier 1–10, назначаемый на этапе записи), trigger injection (порог совпадения ≥0.72 по лексическому/векторному префильтру к коротким trigger-фразам, вписанным как HTML-комментарии):
```markdown
- Keep gateway on loopback. <!-- trigger: gateway setup, network safety --> <!-- importance: 9 -->
```
Lane 2 (Escalation) — блокирующий recall-суб-агент активируется только когда сообщение показывает recall-intent (ссылки на прошлое, временны́е фразы, вопросы о прежних решениях) **и** Lane 1 не дал сильного попадания. Цитата: "Temporal and multi-hop questions are exactly where flat retrieval is weakest, so the expensive lane spends its latency where it plausibly buys recall quality."

**Стандартный факт vs предпочтение** — важное методологическое наблюдение: "Preference adherence and fact recall fail differently. Benchmarks show that models stop applying a preference that is merely present in context after a handful of turns." Поэтому предпочтения хранятся как императивные директивы ("Always/Never/Prefer"), не как наблюдения, и всегда **замещаются** (supersede in place), а не накапливаются как противоречащие записи.

**Prospective memory** (proактивные намерения): time-based → cron; event-based → SQLite intent с триггер-полями (keywords/embedding/scope/expiry/fire budget/cooldown), анти-спам защита: "default 24-hour cooldown, 3-fire budget, 90-day expiry, max 3 intents injected per turn."

### 13. Self-improvement механизмы

**Reflexion** (Shinn et al., 2023, [S17]) — "Reflexion agents verbally reflect on task feedback signals, then maintain their own reflective text in an episodic memory buffer to induce better decision-making in subsequent trials." Числа: HumanEval pass@1 **91%**, что на момент публикации превышало заявленный на тот момент SOTA GPT-4 (**80%**). Ключевая идея — вербальное подкрепление без апдейта весов.

**Voyager** (Wang et al., NVIDIA/Caltech, 2023, [S18]) — процедурная память как **библиотека исполняемого кода-скиллов**: "an ever-growing skill library of executable code for storing and retrieving complex behaviors", "temporally extended, interpretable, and compositional". Итеративный промптинг с учётом фидбэка среды, ошибок выполнения и самопроверки. Числа: **3.3×** больше уникальных предметов против предыдущего SOTA, **2.3×** больше пройденное расстояние, **15.3×** быстрее разблокировка ключевых tech-tree вех. Без файнтюна — только через GPT-4 API.

**Dynamic Cheatsheet** (Suzgun, Yuksekgonul, Bianchi, Jurafsky, Zou, Stanford, 2025, [S20]) — тест-тайм обучение: модель накапливает "concise, transferable snippets" из решённых задач без изменения весов. Числа: Game of 24 (GPT-4o) — с **10%** до **99%** success rate после того, как модель обнаруживает Python-решение и сохраняет его; AIME (Claude 3.5 Sonnet) — точность "more than doubled"; GPQA-Diamond — **+9%**; MMLU-Pro — **+8%** (Claude).

**ACE — Agentic Context Engineering** (Zhang et al., Stanford/SambaNova и др., ICLR 2026, arXiv 2510.04618, [S19]) — контексты как "evolving playbooks that accumulate, refine, and organize strategies" через модульные роли **generator/reflector/curator**, без апдейта весов. Решает две конкретные патологии предыдущих подходов к самоулучшению промптов:
- **Brevity bias** — склонность отбрасывать доменные детали ради краткости summary.
- **Context collapse** — итеративные перезаписи постепенно "стирают" информацию.
Числа: **+10.6%** на агентных бенчмарках, **+8.6%** в финансовом домене; на AppWorld leaderboard — сопоставимо с продакшн-агентами при заметно меньшей latency адаптации и стоимости rollout'ов.

### 14. Generative Agents — recency/importance/relevance (retrieval scoring) [S27]

Park et al. (Stanford, апрель 2023). Архитектура — memory stream: "store a complete record of the agent's experiences using natural language", "synthesize those memories over time into higher-level reflections", "retrieve them dynamically to plan behavior". Абляция подтверждает: "observation, planning, and reflection — each contribute critically to the believability of agent behavior." (Точная формула взвешивания recency/importance/relevance не была доступна в извлечённом фрагменте лендинга — см. Unverified; в оригинальной статье это взвешенная сумма трёх нормализованных скоров с экспоненциальным затуханием по recency.)

## Numbers (сводная таблица измерений с условиями)

| Число | Условие/бенчмарк | Кто измерил | Источник |
|---|---|---|---|
| DMR 94.8% (vs MemGPT 93.4%) | DMR benchmark | Zep, self-reported | [S9] |
| LongMemEval +18.5% точности, -90% латентности | LongMemEval | Zep, self-reported | [S9] |
| LongMemEval 80.05% (semantic recall, topK=20, GPT-4o) vs Zep 72% | LongMemEval, 500 вопросов | Mastra, self-reported, оспаривает Zep | [S13] |
| Mem0 +26% над OpenAI memory (LLM-as-judge); Mem0g +~2% над Mem0; -91% p95 latency; >90% token cost | LOCOMO | Mem0, self-reported | [S8] |
| Sleep-time compute: ~5× меньше test-time compute для той же точности; +13% (GSM-Symbolic) / +18% (AIME); 2.5× снижение стоимости на амортизации | Stateful GSM-Symbolic, Stateful AIME | Lin et al. (Letta/UC Berkeley) | [S16] |
| ACE: +10.6% (агентные бенчмарки), +8.6% (финансы) | ICLR2026 paper benchmarks | Zhang et al. | [S19] |
| Dynamic Cheatsheet: Game of 24 10%→99% (GPT-4o); AIME accuracy "more than doubled" (Claude 3.5 Sonnet); GPQA-Diamond +9%, MMLU-Pro +8% (Claude) | тест-тайм задачи | Suzgun et al. | [S20] |
| Reflexion: HumanEval pass@1 91% vs заявленный тогдашний SOTA GPT-4 80% | HumanEval | Shinn et al. | [S17] |
| Voyager: 3.3× items, 2.3× дистанция, 15.3× быстрее tech-tree | Minecraft | Wang et al. | [S18] |
| LongMemEval: -30% точности у коммерческих ассистентов/long-context LLM при памяти на устойчивых взаимодействиях | LongMemEval | Wu et al. | [S29] |
| Cognee: BEAM@100k 79% (vs SOTA 73.4%); BEAM@10M 67% (vs SOTA 64.1%) | BEAM (10 способностей, до 10М токенов) | Cognee, self-reported | [S7] |
| Claude Code auto memory: MEMORY.md загружается первые 200 строк ИЛИ 25КБ (что раньше) | архитектурный лимит, не бенчмарк | Anthropic docs | [S4] |
| OpenClaw trigger injection: порог совпадения ≥0.72; recency half-life 30 дней; importance 1–10 | архитектурные константы дефолт-конфига | OpenClaw docs | [S23] |

Важно: числа Zep, Mem0, Mastra, Cognee — **self-reported вендорские бенчмарки на разных сетапах** (разные модели, разные версии LongMemEval/LOCOMO, разные top-K), их нельзя сравнивать напрямую друг с другом как единую лигу — только с осторожностью указывать условия каждого измерения (это прямо описано в разделе "Pitfalls").

## Pitfalls, limits, criticism

- **Вендорские бенчмарки несопоставимы.** Mastra прямо показала: "просто RAG" (semantic recall, topK=20) даёт 80% на LongMemEval — выше заявленных Zep 72%, при том что Zep продвигает отказ от RAG в пользу графовой памяти [S13]. Это означает: любое число "мы бьём X по Y%" нужно перепроверять по точной версии бенчмарка, модели и конфигурации retrieval.
- **HotPotQA-стиль метрик (EM/F1) не годится для оценки памяти** — критика Cognee (авг. 2025/сент. 2026): "EM and F1 scores reward surface-level overlap and miss the core value proposition of AI memory systems"; тот же ответ модели может получать разный score в разных запусках (LLM-судья непостоянен); HotPotQA предполагает, что вся нужная информация — в двух абзацах, что не отражает реальную работу с памятью [S31].
- **Memory poisoning** — структурная уязвимость систем без provenance: если память не различает `owner`/`agent`/`untrusted`, единожды внедрённая через веб-страницу или чужой промпт инструкция может закрепиться в MEMORY.md и влиять на все последующие сессии бессрочно. Из изученных источников только OpenClaw реализует структурную защиту (origin-класс + quarantine по tier + запрет повторной экстракции инжектированного контента) [S23]. Остальные системы (Mem0/Zep/Letta/LangMem в базовой конфигурации) не документируют аналогичный механизм — открытый вопрос для дизайна собственной системы.
- **Consumer-память как "досье" вызывает обратную реакцию пользователей.** Simon Willison (май 2025) — не техническая, а UX/приватность критика: "The entire game when it comes to prompting LLMs is to carefully control their context… The new memory feature removes that control completely." Конкретный кейс: ChatGPT добавил вывеску "HALF MOON BAY" на сгенерированное изображение, потому что модель однажды упомянула этот город в другом разговоре — непредсказуемое "утекание" контекста между несвязанными задачами [S11]. Прямое следствие для инженеров, строящих consumer-facing продукты: скоупить память per-project, давать явный, редактируемый summary, разделять служебную и "профильную" память.
- **Предпочтения не то же самое, что факты, и деградируют иначе.** OpenClaw формулирует это явно: "Benchmarks show that models stop applying a preference that is merely present in context after a handful of turns" — просто положить факт "пользователь предпочитает X" в контекст недостаточно; нужен императивный формат директивы и её "замещение" (не накопление) при изменении [S23].
- **Context collapse / brevity bias** в само-улучшающихся системах — если playbook/cheatsheet просто периодически "переписывается" суммаризацией, он со временем теряет специфику домена (brevity bias) или разрушается итеративными перезаписями (context collapse). Это конкретная мотивация ACE для использования generator/reflector/curator вместо единого агента, переписывающего весь контекст целиком [S19].
- **Procedural memory — самый опасный тип для автономной записи.** Ещё в CoALA (2023) отмечено: "learning new actions by writing to procedural memory is possible… but it is significantly riskier than writing to episodic or semantic memory, as it can easily introduce bugs or allow an agent to subvert its designers' intentions" [S1]. Это прямое предупреждение для дизайна skill-library систем типа Voyager: агент, дописывающий собственный исполняемый код, должен проходить через верификацию/тесты, а не просто "запоминаться".
- **Auto-memory может неограниченно расти**, если не иметь жёсткий бюджет чтения. Claude Code решает это через hard-лимит 200 строк/25КБ на индекс + предупреждение модели сокращать файл до превышения лимита, а не после — иначе контент за пределами лимита тихо не грузится в будущие сессии [S4].
- **LangMem честно признаёт незрелость episodic memory** ("opinionated utilities... not yet available") и решает procedural memory через prompt-optimization, а не skill-library — то есть готового LangGraph-нативного эквивалента Voyager нет [S10].
- **Filesystem-подход не бесплатен**: он переносит сложность с "какую векторную БД выбрать" на "как гарантировать целостность/консистентность файлов при конкурентной записи" — именно поэтому OpenClaw реализует optimistic concurrency с content-hash re-check перед atomic rename [S23], а Anthropic отдельно предупреждает про path traversal в самодельных memory-хендлерах [S3].

## What changed in the last 6 months (примерно апрель–сентябрь 2026, относительно "сегодня" 2026-09-30)

- ACE paper дошёл до релиза v3 (29 марта 2026) и принятия на ICLR 2026 — self-improving playbooks стали mainstream-темой академических агентных исследований, а не нишевой идеей.
- Cognee выпустил "AI Agent Memory: The Definitive Guide" (7 августа 2026) с BEAM-бенчмарком до 10М токенов контекста — попытка сдвинуть индустрию с LoCoMo/LongMemEval-масштаба на существенно более длинные горизонты [S7].
- OpenClaw как экосистема (Foundation, множество плагинов памяти: builtin/SQLite, LanceDB, Honcho, memory-wiki) выросла в отдельный полноценный конкурент паттернам Claude Code/Letta именно в части памяти — судя по обилию HN-постов (skill-библиотеки, prompt-injection firewalls для агентных skills) за 2026 год, вокруг неё уже формируется своя экосистема безопасности и инструментов памяти [S26 и косвенные HN-находки].
- Резкий рост числа независимых "мы побили X% на LongMemEval" GitHub-проектов в течение 2026 (наблюдение из поиска HN, не формальный источник) — признак того, что LongMemEval стал де-факто лидербордом, к которому применимы все обычные риски gaming/overfitting паблик-бенчмарка; при этом ни один из этих мелких проектов не проходит через независимую верификацию методологии, поэтому такие claims в тексте главы стоит помечать явно как неверифицированные, а не приводить как факт.
- Claude Code auto memory и AGENTS.md-совместимость (v2.1.277+) — довольно свежая (осень 2026) унификация вокруг общего для разных агентных CLI формата AGENTS.md, что снижает lock-in на CLAUDE.md-специфичный синтаксис [S4].

## Diagram candidates

1. **CoALA memory taxonomy** — actors: LLM (working memory) ↔ Episodic / Semantic / Procedural memory; arrows: "read into working memory" / "write from working memory"; states: empty → populated → retrieved.
2. **Anthropic memory tool call loop** — actors: Claude, Application handler, `/memories` storage; arrows: tool_use(view) → tool_result(listing) → tool_use(read file) → tool_result(content) → tool_use(str_replace/create) → tool_result(confirmation).
3. **Claude Code memory loading order** — actors: Managed policy CLAUDE.md, User CLAUDE.md, Project CLAUDE.md, CLAUDE.local.md, Auto memory MEMORY.md; arrow-chain showing concatenation order into one context window at session start.
4. **Letta memory blocks** — actors: LLM, Core Memory (human/persona blocks, in-context), Recall Memory (search), Archival Memory (vector/graph DB); arrows: self-editing tool call `rethink_memory` updating Core block.
5. **Zep/Graphiti temporal knowledge graph** — actors: Episode (raw data) → Entity nodes / Entity edges (facts with validity windows) → Community summaries; arrow labeled "bi-temporal invalidation" when a new fact supersedes an old edge.
6. **OpenClaw five-tier memory model** — actors: Instructions / Curated core / Episodic / Prospective / Review tiers; arrows showing write sources (human, dreaming, agent, intent tool, dreaming phases) and injection points (session start, on recall, on trigger, never).
7. **OpenClaw write path pipeline** — actors: Interactive session, Session end, Pre-compaction flush → Episodic tier + index (with provenance) → Dreaming gate (deterministic) → Gated candidates → Consolidation (model) → MEMORY.md/USER.md + DREAMS.md.
8. **OpenClaw dreaming 3-phase cycle** — states: Light (dedupe) → REM (theme reflection) → Deep (rank + gate + consolidate); arrow labeled "3 AM cron, one unified job".
9. **OpenClaw recall two-lane architecture** — actors: Incoming message → Lane 1 (bootstrap injection / ranked search / trigger injection, zero model calls) → [if recall-intent AND no strong hit] → Lane 2 (blocking recall sub-agent, searches full conversation history).
10. **ACE generator/reflector/curator loop** — actors: Generator (produces trajectory), Reflector (extracts lessons), Curator (updates playbook); arrow labeled "incremental delta, not full rewrite" contrasting with brevity-bias/context-collapse failure mode.
11. **Sleep-time compute timeline** — two parallel tracks: "test-time only" (query arrives → full inference) vs "sleep-time + test-time" (idle period → precompute likely-useful state → query arrives → cheap finish), with the 5× / 2.5× numbers annotated.
12. **Memory poisoning attack & defense** (OpenClaw case) — actors: Untrusted web page → episodic tier (tagged `untrusted`) → [blocked] Dreaming gate → never reaches MEMORY.md; contrast arrow showing an `owner`-origin fact flowing through successfully.

Chart candidates: LongMemEval self-reported accuracy by vendor/method (Zep 72%, Mastra RAG-only 80.05%, ACE/Cognee etc. — bar chart with explicit "self-reported, different configs" caveat in the footnote) — real values from [S13], but must NOT be presented as a fair head-to-head without methodology caveat in the actual chapter text.

## Glossary

- **Working memory** — состояние прямо в контекстном окне LLM на текущем шаге (CoALA/Soar).
- **Episodic memory** — хранилище прошлых эпизодов/траекторий/событий агента.
- **Semantic memory** — факты о мире и о пользователе, отделённые от конкретного эпизода.
- **Procedural memory** — веса модели + код агента; в agentic-системах — часто явная "библиотека скиллов".
- **CoALA** — Cognitive Architectures for Language Agents, фреймворк-таксономия (Sumers et al. 2023).
- **Memory tool (Anthropic)** — клиентский file-based инструмент Claude API (`memory_20250818`) для персистентной памяти вне контекстного окна.
- **Compaction** — серверная суммаризация всего разговора при приближении к лимиту окна (Anthropic API).
- **Context editing** — клиентская точечная чистка старых tool-результатов (в отличие от полной суммаризации).
- **Auto memory (Claude Code)** — саморедактируемые заметки, которые Claude Code пишет без явного запроса пользователя.
- **Core / Archival / Recall memory (Letta)** — три уровня хранения: в контексте / во внешней БД / полная история с поиском.
- **Sleep-time compute** — вычисление в простое между запросами, предвычисляющее вероятно полезное состояние.
- **Dreaming (OpenClaw)** — фоновая трёхфазная (light/REM/deep) консолидация памяти по расписанию.
- **Provenance (в контексте памяти)** — метаданные происхождения факта (owner/agent/untrusted/system), определяющие уровень доверия и право на попадание в курированную память.
- **Bi-temporal tracking (Graphiti)** — раздельное отслеживание времени события и времени его фиксации в графе, с автоматической инвалидацией устаревших фактов.
- **Playbook (ACE)** — эволюционирующий, не перезаписываемый целиком контекст-артефакт с накопленными стратегиями.
- **Generator / Reflector / Curator (ACE)** — три модульные роли, разделяющие генерацию поведения, извлечение урока и обновление playbook.
- **Skill library (Voyager)** — процедурная память как растущий набор исполняемого кода, а не текстовых заметок.
- **DMR, LOCOMO, LongMemEval, BEAM** — бенчмарки долгосрочной памяти агентов разного масштаба и фокуса (диалоговый recall → до 10М токенов).
- **Memory poisoning** — атака, при которой недоверенный контент закрепляется в долгосрочной памяти и получает неявный авторитет в будущих сессиях.

## Unverified / open questions

- Точная формула взвешивания recency/importance/relevance в Generative Agents (Park et al. 2023) — извлечённый фрагмент лендинга arXiv не содержал явной формулы; в оригинальном тексте статьи (не открытом полностью в этой сессии из-за бюджета) это описано как нормализованная взвешенная сумма трёх компонентов с экспоненциальным затуханием recency. Нужно свериться с полным PDF/HTML перед написанием главы.
- Институциональная аффилиация авторов Mem0 и Zep не была явно извлечена из абстрактов (вероятно, Mem0 Inc. и Zep AI соответственно, судя по доменам блогов, но не подтверждено прямой цитатой из paper).
- Специфический публичный пример "filesystem beats memory tools" как единого воспроизводимого бенчмарка (а не сходящейся практики нескольких команд) не найден — в задаче эта фраза, видимо, обобщает несколько независимых источников (Manus, Anthropic, Letta Filesystem, OpenClaw), а не отсылает к одному конкретному исследованию. Формулировка в главе должна отражать это как паттерн, а не как единый цитируемый результат.
- Числа Google/Microsoft/AWS/Cloudflare/Vercel по агентной памяти не были собраны в рамках этой сессии (лимит WebSearch был исчерпан до начала работы, а точечный curl/WebFetch поиск сфокусирован на наиболее релевантных источниках по scope). При необходимости для главы отдельно проверить: AWS Bedrock AgentCore Memory, Vercel AI SDK (`experimental_useObject`/memory helpers), Cloudflare Agents SDK (Durable Objects как memory substrate), Google ADK memory service — ни один не был открыт в этой сессии.
- ChatGPT memory: точная текущая (сентябрь 2026) конфигурация controls/UI не проверена напрямую (сайт OpenAI отдал 403 на WebFetch); данные о фиче взяты через вторичный источник (Simon Willison) с датами апрель/август 2025 — стоит проверить актуальность на сентябрь 2026 отдельно, могла обновиться.
- Hamel Husain, Eugene Yan, Harrison Chase (как отдельные именные посты про agent memory), Armin Ronacher, Geoffrey Huntley, swyx — целенаправленный поиск по именам не проводился из-за исчерпания WebSearch-бюджета в начале сессии; HN-поиск по ключевым словам их постов на эту тему не дал релевантных попаданий. Возможно, у них есть отдельные посты по теме памяти, не покрытые здесь.
- LoCoMo прямая критика ("gamed"/"flawed") — не найдена как отдельный явный источник; общая методологическая критика взята через Cognee (про HotPotQA, не LoCoMo напрямую) — экстраполяция на LoCoMo в TL;DR является выводом составителя заметок, а не прямой цитатой конкретного критика LoCoMo.

## Sources

- [S1] "Cognitive Architectures for Language Agents", Theodore R. Sumers, Shunyu Yao, Karthik Narasimhan, Thomas L. Griffiths (Princeton/DeepMind), arXiv:2309.02427, published 2023-09-05 (revised 2024-03-15), https://arxiv.org/abs/2309.02427, accessed 2026-09-30
- [S2] "Effective context engineering for AI agents", Anthropic Engineering blog, published 2025-09-29, https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents, accessed 2026-09-30
- [S3] "Memory tool", Claude Platform docs, Anthropic, https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool, accessed 2026-09-30 (undated page, reflects `memory_20250818` beta)
- [S4] "How Claude remembers your project", Claude Code docs, Anthropic, https://code.claude.com/docs/en/memory, accessed 2026-09-30 (undated page, references Claude Code v2.1.2xx)
- [S5] "Effective harnesses for long-running agents", Anthropic Engineering blog, published 2025-11-26, https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents, accessed 2026-09-30
- [S6] "Memory Blocks", Letta blog, published 2025-05-14, https://www.letta.com/blog/memory-blocks, accessed 2026-09-30
- [S7] "AI Agent Memory: The Definitive Guide", Vasilije Markovic (Cognee), published 2026-08-07, https://www.cognee.ai/agent-memory, accessed 2026-09-30
- [S8] "Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory", Prateek Chhikara, Dev Khant, Saket Aryan, Taranjeet Singh, Deshraj Yadav, arXiv:2504.19413, submitted 2025-04-28, https://arxiv.org/abs/2504.19413, accessed 2026-09-30
- [S9] "Zep: A Temporal Knowledge Graph Architecture for Agent Memory", Preston Rasmussen, Pavlo Paliychuk, Travis Beauvais, Jack Ryan, Daniel Chalef, arXiv:2501.13956, submitted 2025-01-20, https://arxiv.org/abs/2501.13956, accessed 2026-09-30
- [S10] "LangMem SDK for agent long-term memory", LangChain blog, published 2025-02-18/21, https://www.langchain.com/blog/langmem-sdk-launch, accessed 2026-09-30
- [S11] "I don't like ChatGPT's new memory dossier", Simon Willison, published 2025-05-21, https://simonwillison.net/2025/May/21/chatgpt-new-memory/, accessed 2026-09-30
- [S12] "Memory", Claude/Anthropic product blog, published 2025-09-11 (Pro/Max expansion 2025-10-23), https://claude.com/blog/memory, accessed 2026-09-30
- [S13] "Achieving SOTA LongMemEval scores (80%) with RAG alone", Tyler Barnes (Mastra), published 2025-07-17, https://mastra.ai/blog/use-rag-for-agent-memory, accessed 2026-09-30
- [S14] "Context Engineering for AI Agents: Lessons from Building Manus", Yichao "Peak" Ji, Manus blog, published 2025-07-18, https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus, accessed 2026-09-30
- [S15] OpenClaw memory-architecture design principles (see S23) — cited separately for the "write-time curation" phrase
- [S16] "Sleep-time Compute: Beyond Inference Scaling at Test-time", Kevin Lin, Charlie Snell, Yu Wang, Charles Packer, Sarah Wooders, Ion Stoica, Joseph E. Gonzalez, arXiv:2504.13171, submitted 2025-04-17, https://arxiv.org/abs/2504.13171, accessed 2026-09-30
- [S17] "Reflexion: Language Agents with Verbal Reinforcement Learning", Noah Shinn, Federico Cassano, Edward Berman, Ashwin Gopinath, Karthik Narasimhan, Shunyu Yao, arXiv:2303.11366, submitted 2023-03-20 (rev. v4 2023-10-10), https://arxiv.org/abs/2303.11366, accessed 2026-09-30
- [S18] "Voyager: An Open-Ended Embodied Agent with Large Language Models", Guanzhi Wang, Yuqi Xie, Yunfan Jiang, Ajay Mandlekar, Chaowei Xiao, Yuke Zhu, Linxi Fan, Anima Anandkumar, arXiv:2305.16291, submitted 2023-05-25 (rev. v2 2023-10-19), https://arxiv.org/abs/2305.16291, accessed 2026-09-30
- [S19] "Agentic Context Engineering: Evolving Contexts for Self-Improving Language Models", Qizheng Zhang et al. (Stanford/SambaNova et al.), arXiv:2510.04618, submitted 2025-10-06, rev. v3 2026-03-29, ICLR 2026, https://arxiv.org/abs/2510.04618, accessed 2026-09-30
- [S20] "Dynamic Cheatsheet: Test-Time Learning with Adaptive Memory", Mirac Suzgun, Mert Yuksekgonul, Federico Bianchi, Dan Jurafsky, James Zou, arXiv:2504.07952, submitted 2025-04-10, https://arxiv.org/abs/2504.07952, accessed 2026-09-30
- [S21] "RAG vs. Agent Memory", Letta blog, published 2025-02-13, https://www.letta.com/blog/rag-vs-agent-memory, accessed 2026-09-30
- [S22] "Letta Filesystem", Letta blog, published 2025-07-24, https://www.letta.com/blog/letta-filesystem, accessed 2026-09-30
- [S23] "Memory architecture", OpenClaw docs, https://docs.openclaw.ai/concepts/memory-architecture, accessed 2026-09-30 (undated; reflects OpenClaw as of ~2026.4.x per version string mentioned)
- [S24] "Dreaming", OpenClaw docs, https://docs.openclaw.ai/concepts/dreaming, accessed 2026-09-30
- [S25] "Persistence / Memory Store (BaseStore)", LangGraph docs, LangChain, https://docs.langchain.com/oss/python/langgraph/stores, accessed 2026-09-30
- [S26] OpenClaw GitHub README, https://raw.githubusercontent.com/openclaw/openclaw/main/README.md, accessed 2026-09-30
- [S27] "Generative Agents: Interactive Simulacra of Human Behavior", Joon Sung Park, Joseph C. O'Brien, Carrie J. Cai, Meredith Ringel Morris, Percy Liang, Michael S. Bernstein, arXiv:2304.03442, submitted 2023-04-07 (rev. 2023-08-06), https://arxiv.org/abs/2304.03442, accessed 2026-09-30
- [S28] "Evaluating Very Long-Term Conversational Memory of LLM Agents" (LoCoMo), Adyasha Maharana, Dong-Ho Lee, Sergey Tulyakov, Mohit Bansal, Francesco Barbieri, Yuwei Fang, arXiv:2402.17753, published 2024-02-27, https://arxiv.org/abs/2402.17753, accessed 2026-09-30
- [S29] "LongMemEval: Benchmarking Chat Assistants on Long-Term Interactive Memory", Di Wu, Hongwei Wang, Wenhao Yu, Yuwei Zhang, Kai-Wei Chang, Dong Yu, arXiv:2410.10813, submitted 2024-10-14 (rev. 2025-03-04), ICLR 2025, https://arxiv.org/abs/2410.10813, accessed 2026-09-30
- [S30] "Agent Memory", Letta blog, published 2025-07-07, https://www.letta.com/blog/agent-memory, accessed 2026-09-30
- [S31] "We need better ways to evaluate how AI memory systems perform", Vasilije Markovic (Cognee), published 2025-08-08 (updated 2026-09-03), https://www.cognee.ai/blog/deep-dives/ai-memory-evals-0825, accessed 2026-09-30
- [S32] Graphiti README, getzep/graphiti GitHub repository, https://raw.githubusercontent.com/getzep/graphiti/main/README.md, accessed 2026-09-30
- [S33] "MemGPT: Towards LLMs as Operating Systems", Charles Packer, Sarah Wooders, Kevin Lin, Vivian Fang, Shishir G. Patil, Ion Stoica, Joseph E. Gonzalez, arXiv:2310.08560, submitted 2023-10-12 (rev. 2024-02-12), https://arxiv.org/abs/2310.08560, accessed 2026-09-30
- [S34] "Active memory / How active memory works", OpenClaw docs, https://docs.openclaw.ai/concepts/active-memory/how-it-works, accessed 2026-09-30
