# Глава 16 — план

Лид: заголовок issue в репозитории Cline → бот-сортировщик на claude-code-action с Bash → через цепочку отравленного кеша Actions `cline@2.3.0` ставит OpenClaw на ~4000 машин (февраль 2026).

## Разделы

1. `clinejection` — «Заголовок issue, который дошёл до 4000 машин». Начало: VERBATIM YAML воркфлоу Cline. Пять шагов цепочки, неверно отозванный токен. Главное: ни одна строка не «баг модели», всё — композиция прав. Рис. 1 (flowchart TD) цепочка.
2. `trifecta` — «Трифекта и правило двух». Начало: цитата Уиллисона про «summarize this web page». Три ноги, Rule of Two A/B/C, примеры Meta; как размечать *сессию*, а не агента. GitHub MCP toxic flow, Supabase MCP с VERBATIM payload. Рис. 2 (SVG) трифекта с инцидентами на пересечениях. Рис. 3 (sequence) Supabase.
3. `unsolved` — «Почему инъекцию не закрыли патчем». Начало: NCSC «inherently confusable deputy». Прямая/непрямая; инъекция, которую модель пишет себе сама (компакция, OpenAI, сент. 2026). «The Attacker Moves Second» — график static→adaptive. Вендорские 0/720 против 3/5 у Ребергера и 24/25 у внутренней команды Anthropic. Рис. 4 (hbar, 2 ряда).
4. `exfiltration` — «Куда уходят данные». Начало: EchoLeak, ноль кликов. Каталог каналов: картинка/CSP (ForcedLeak — истёкший домен), URL в fetch (web_fetch по буквам), DNS (CVE-2025-55284), разрешённые SaaS (Cowork → api.anthropic.com, HF-счётчики), запись через тулы, CI-логи (Comment and Control). Таблица + выбор. Код: санитайзер картинок + CSP (набросок). Рис. 5 (sequence EchoLeak), рис. 6 (flowchart: разрешённый домен).
5. `rce` — «RCE через конфиг, который агент пишет сам». Начало: пять строк JSON CVE-2026-33068. Класс «агент пишет конфиг»: хуки, ANTHROPIC_BASE_URL, cross-agent. Allowlist-и: 8 обходов RyotaK. Десериализация (LangGrinch). MCP stdio/mcp-remote. Plugin4Shell. CVSS: чей балл. Рис. 7 (versus: порядок загрузки до/после), рис. 8 (flowchart Plugin4Shell), рис. 9 (line: GHSA по кварталам).
6. `supply-chain` — «Вредонос, который зовёт твой Claude». Начало: VERBATIM массив из s1ngularity. keyv 2026 с валидным provenance и хуками в `.claude/settings.json`. ClawHavoc. Tool poisoning / rug pull / shadowing (VERBATIM описание). Телеграм-разбор benjamin-plus. MCP 2026-07-28: что поменялось в security best practices. Рис. 10 (versus ×3).
7. `memory-agents` — «Память и соседние агенты». Начало: ServiceNow «intentional design features». Second-order injection; MemoryTrap; компакция как канал. Рис. 11 (sequence ServiceNow).
8. `containment` — «Что стоит между агентом и твоим ноутбуком». Начало: 93% одобрений. Auto mode: слои, reasoning-blind, 0,4%/17%, 3/20. Обход Ребергера через `struct.py`. Песочница: opt-in, что вне её, защищённые пути, SOCKS5 и пустой allowedDomains. Секреты. Доктрина «containment first», слабое звено — самописный прокси. settings.json на вечер. srt для MCP. Рис. 12 (flowchart auto mode), рис. 13 (sequence обход), рис. 14 (SVG: что внутри песочницы).
9. `patterns` — «Архитектура, которая не верит модели». Начало: фраза из статьи про шесть паттернов. Шесть паттернов, dual LLM, CaMeL 77/84, taint-tracking на Python (набросок). Где классификаторы всё же нужны. Рис. 15 (flowchart dual LLM / CaMeL).
10. `audit` — «Аудит: порядок и инструменты». Начало: вопрос «с чего начать в понедельник». Шаги аудита, agent-scan, promptfoo (конфиг), garak, AgentDojo, PyRIT; логи и детекты; OWASP LLM 2026 + ASI (таблица с выбором); регуляторы коротко.

## Тесты плана
- Анкета: нет «что это → зачем → как». Разделы строятся вокруг инцидента/механизма; 3 и 8 начинаются с проверки расхожего утверждения («0%»), 5 — с конкретного пейлоада.
- Первые предложения: лид-инцидент, цитата, NCSC, EchoLeak, JSON, JS-массив, ServiceNow, 93%, цитата статьи, вопрос — не складываются в конспект.
- Где провал: у каждого раздела есть сломанное (обход, спор вендоров, тихий фикс).

## В соседние главы ссылкой
- Механика OAuth, CIMD, mix-up подробно → гл. 15.
- Спецификация MCP (stateless, server/discover) → гл. 5.
- Методика red-team evals, метрики ASR → гл. 17.
- Память подробно → гл. 11; мультиагентное доверие → гл. 13; компакция → гл. 2; права тулов → гл. 3; устройство Claude Code → гл. 12; RAG-отравление → гл. 14.

## Источники (ключи → нумерация скриптом по первому упоминанию, ≤45)
khan, grith, trifecta, meta2, inv-gh, supabase, ncsc, compaction, amsecond, contain, auto-default, rehb-auto, echoleak, forcedleak, webfetch-leak, rehb-dns, cc-ghsa, c-and-c, rehb-cross, raxe, ryotak, nvd, plugin4shell, stepsec, keyv, clawhavoc, inv-poison, mcp-sec, fastnewsdev, memorytrap, servicenow, perm-modes, auto-eng, cc-sandbox, socks5, srt, gitguardian, patterns, camel, owasp-llm, owasp-asi, promptfoo-docs, agent-scan, tools-meta, euaiact
