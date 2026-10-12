# Фактчек главы 11 «Память агента» (часть «Архитектура»)

Дата проверки: 30 сентября 2026. Проверялась `index.html` целиком, против четырёх файлов
заметок (`gaps.md`, `spec.md`, `practice.md`, `field.md`) и против живых первоисточников в
вебе: доки Anthropic (memory tool, Claude Code, Managed Agents, Dreams), CHANGELOG Claude Code
+ реестр npm, HN API (сырые комментарии и посты), arXiv (полные тексты PDF: CoALA, Voyager,
ACE, Reflexion, Dynamic Cheatsheet, Generative Agents, Mem0, Zep, LongMemEval-V2), блоги
(Anthropic, Letta, Mastra, Zep, Cal Paterson/pauliusztin), GitHub (graphiti_core/edges.py,
Claude Code CHANGELOG.md), PyPI/npm (letta, mem0ai, graphiti-core), OWASP PDF, OpenClaw docs,
Simon Willison. Вместо выборочных 30 утверждений проверено заметно больше (около 60), потому
что первые проверки не дали ни одной ошибки и пришлось расширять выборку, чтобы не закрыть
обзор преждевременно.

## Итог

**Подтверждённых или вероятных фактических ошибок не найдено.** Ни одной critical, ни одной
major, ни одной minor находки, прошедшей проверку по первоисточнику. Это нетипичный результат
для придирчивого фактчека, поэтому ниже — не «глава хорошая, и всё», а список конкретно того,
что проверено и чем подтверждено, чтобы решение можно было перепроверить.

Особо придирчиво проверялись места, где придирчивый фактчекер ожидает ошибку по умолчанию:
переприписанные цитаты, устаревшие версии/даты, придуманные числа, сфабрикованные HN-ники.
Ничего из этого не подтвердилось.

## Что проверено и подтвердилось (выборка, с доказательством)

**Версии и даты Claude Code (11 версий, сверено с `CHANGELOG.md` + `registry.npmjs.org`
построчно, включая точные даты релизов):** v2.1.32 (2026‑02‑05, текст записи совпадает
дословно), v2.1.59 (2026‑02‑25), v2.1.63 (2026‑02‑28), v2.1.74 (2026‑03‑11), v2.1.83
(2026‑03‑24), v2.1.210 (2026‑07‑14), v2.1.214 (2026‑07‑18), v2.1.277 (2026‑09‑18), v2.1.280
(2026‑09‑22, включая точную цифру «~10 800 символов» и фразу «so the retried write dropped the
middle»), v2.1.284 (2026‑09‑28, нейтрализация разметки — текст записи совпадает дословно),
v2.1.285 (2026‑09‑29). Все 11 привязок «версия → фича → дата» совпали ровно, включая то, что
я сначала принял за расхождение (see методология ниже) и что оказалось ошибкой инструмента
суммаризации, а не текста главы.

**Доки Claude Code memory (code.claude.com/docs/en/memory), прямой фетч, построчно против
главы:** структура каталога auto memory; правило «context, not enforced configuration»;
лимит `MEMORY.md` 200 строк/25KB и поведение при превышении; лимит `CLAUDE.md` 4 MiB;
переживание `/compact` корневым `CLAUDE.md` («Claude re‑reads it from disk»); четыре типа
заметок `user/feedback/project/reference` и их формулировки (включая дословную «corrections
you give Claude and approaches you confirm»); фраза «never adds frontmatter to a file that has
none»; сообщения «Saved 2 memories»/«Recalled 2 memories»; правило чтения `AGENTS.md` только
при отсутствии `CLAUDE.md`/`.claude/CLAUDE.md`/`CLAUDE.local.md`; и дословно — «Not read:
`AGENTS.local.md`, `AGENTS.override.md`, or anything under a `.agents/` directory». Всё
совпало.

**Memory tool (platform.claude.com), прямой фетч:** конфиг `{"type": "memory_20250818", "name":
"memory"}`; отсутствие бета-заголовка; текст MEMORY PROTOCOL — совпадает посимвольно; лимит
`view` в 16 000 символов и поддержка `.jpg/.png`; фраза «creates or overwrites» для `create` и
одновременно эталонная ошибка «File {path} already exists»; список SDK-хелперов
(`BetaAbstractMemoryTool`, `betaMemoryTool`, `BetaMemoryToolHandler`, `BetaLocalFilesystemMemoryTool`)
и отсутствие хелпера в Go/Ruby — всё дословно.

**Managed Agents / Dreams:** цитаты Rakuten («97% fewer first-pass errors») и Harvey
(«Completion rates went up ~6x in their tests») — обе проверены на исходных постах блога Claude,
дата анонса Dreams 19 мая 2026 подтверждена.

**CoALA (arXiv 2309.02427, PDF целиком):** все четыре автора — Princeton (не
Princeton/DeepMind); цитата про процедурную память «significantly riskier than writing to
episodic or semantic memory, as it can easily introduce bugs or allow an agent to subvert its
designers' intentions» — совпадает посимвольно.

**Voyager (arXiv 2305.16291, PDF):** язык скиллов — JavaScript/Mineflayer (не Python), «3.3×
more unique items… unlocks key tech tree milestones up to 15.3× faster» — совпадает.

**ACE (arXiv 2510.04618v3, PDF целиком, 8 страниц + доп. поиск):** пример context collapse
18 282 → 122 токена, точность 66.7 → 57.1 против базовой 63.7 на AppWorld — дословное
совпадение с рисунком 2 статьи; +10.6%/+8.6%; ReAct+ACE 59.4% против IBM CUGA 60.3%; роли на
DeepSeek‑V3.1 без reasoning-режима; лимитация про Dynamic Cheatsheet — дословное совпадение;
формат id плейбука `[ctx-00263] helpful=1 harmful=0 ::` — это реальный, дословный пример из
статьи (строка 1986/2174 в извлечённом тексте), не выдумка.

**Generative Agents (arXiv 2304.03442, PDF):** коэффициент затухания 0.995, промпт «On a scale
of 1 to 10, where 1 is purely mundane… rate the likely poignancy», порог рефлексии 150 — все
совпадают; собственный пересчёт кривых 0.995^(24·дни) и 0.5^(дни/30) в графике арифметически
верен (проверено вручную).

**Mem0 (arXiv 2504.19413, PDF, таблица целиком) и Zep (arXiv 2501.13956, PDF):** все 7 строк
таблицы LoCoMo (72.90/68.44/66.88/65.99/58.10/52.90/48.38 и токены на запрос) — посимвольное
совпадение с таблицей статьи; латентность LangMem 17.99с/59.82с — совпадает; DMR
98.0%/98.2% и «unable to reproduce MemGPT's results» — совпадает; LongMemEval_S
71.2/60.2 (gpt‑4o) и 63.8/55.4 (gpt‑4o‑mini) при 1.6k/115k токенов — совпадает; блог Zep
«Is Mem0 Really SOTA?» — самостоятельный прогон 75.14% ± 0.17 и три претензии к разметке
LoCoMo — совпадает дословно.

**LongMemEval‑V2 (arXiv 2605.12493, PDF):** AgentRunbook‑C 72.5%, лучший RAG 48.5%, Codex
69.3%, 451 вопрос, до 500 траекторий/115M токенов, фраза «coding agent based methods have high
latency costs» — всё совпадает.

**Reflexion (91% pass@1 vs GPT‑4 80%) и Dynamic Cheatsheet (Game of 24 10%→99%, AIME у Claude
3.5 Sonnet «more than doubled»)** — подтверждены по аннотациям/полным текстам arXiv.

**Letta:** блог «Benchmarking AI Agent Memory» — 74.0% на LoCoMo, «68.5% score for their
top-performing graph variant», фраза про невозможность бэкфилла в MemGPT/Letta — все дословно;
блог «Skill Learning» — 89 задач, Sonnet 4.5 extended thinking, +9.0/21.1% и +15.7/36.8%,
−15.7% стоимости, −10.4% вызовов инструментов — дословно; PyPI `letta` 0.34.0 и npm
`@letta-ai/letta-code` 0.34.0 действительно опубликованы 30 сентября 2026 (проверено через
`pypi.org/pypi/letta/json` и `registry.npmjs.org`), описание пакета «Letta Code: stateful
agents in your terminal» совпадает.

**graphiti_core/edges.py:** блок кода в главе сверен построчно с `main`-веткой
`getzep/graphiti` на GitHub — поля, типы и описания `Field(description=...)` совпадают
посимвольно (включая `group_id`, `expired_at`/`valid_at`/`invalid_at`).

**OpenClaw (docs.openclaw.ai/concepts/memory-architecture):** цитаты «Writing is the hard
part», «The write path is the security boundary», определения origin-классов
`owner/agent/untrusted/system`, фраза «A fact recalled one hundred times stays one fact»,
порог триггера 0.72 и ссылка на PrefEval (ICLR 2025, подтверждено отдельно) — все дословно.

**OWASP Top 10 for Agentic Applications 2026 (PDF, раздел ASI06):** все три цитируемые меры
(«Prevent automatic re-ingestion…», «Expire unverified memory…», «Require two factors… e.g.,
provenance score plus human-verified tag») — дословное совпадение со страницей 25 документа.

**Unit 42 (unit42.paloaltonetworks.com):** платформа Bedrock Agents + Nova Premier, поддельные
теги `</conversation>`/`<conversation>`, механизм переноса в память через суммаризацию и
тихая эксфильтрация — подтверждено.

**HN-цитаты и даты (5 комментариев + 2 текстовых поста, сырые данные через HN Algolia API,
не через инструмент суммаризации — см. методологическую заметку ниже):** sothatsit
(2026‑07‑26), bushido (2026‑04‑12), ArielTM (2026‑04‑28), Kiro (2026‑07‑25, включая контекст
«Not Claude Code but…», который в первом (неточном) automatic-фетче выглядел как нестыковка, а
по сырому тексту подтвердился), fluidcruft (2026‑08‑21), pauliusztin (2026‑05‑30, включая три
детали из его же поста — пороги дедупликации 0.95/0.85 и цитату про нагрузку на RAM VM,
дословно). Пост Thariq Shihipar (claude.com/blog, 24 июля 2026, автор и дата подтверждены на
странице) и очки на HN (463) — подтверждены через Algolia API для сабмишна.

**Прочее:** конфиг `[features] memories = true` и quote Codex про «Keep required team guidance
in AGENTS.md…»; цитата Willison «The entire game when it comes to prompting LLMs is to
carefully control their context…»; тулы `conversation_search`/`recent_chats` из сентябрьского
(2025) поста Willison; OKF v0.2 — поля `generated/verified/status/stale_after` подтверждены
по `SPEC.md`; Mastra 94.87/93.27/84.23 и модель `gemini-2.5-flash` для Observer/Reflector —
подтверждены на странице исследования; Anthropic engineering post про мультисессионный
паттерн — точные имена файлов `claude-progress.txt`/`feature_list.json`/`init.sh` и цитата
про тесты подтверждены на странице.

**Код из главы реально запущен, а не только прочитан.** Набросок `memory_handler.py`
(раздел про memory tool) выполнен на Python 3.14.7 с четырьмя тестами, которые текст главы
называет пройденными: `../../` → отклонён, `%2e%2e` (URL-кодированный traversal) → отклонён,
`/memoriesX` (похожий, но чужой префикс) → отклонён, повтор `old_str` → возвращена ошибка
«Multiple occurrences… in lines: […]. Please ensure it is unique» в формате документации.
Все четыре утверждения подтвердились по факту выполнения, а не по правдоподобию кода.

## Утверждения без ссылки, которым ссылка нужна

Не найдено. Практически каждое нетривиальное число, версия, дата и цитата в главе несёт
`<a class="cite" href="#src-N">`. Разделы без сносок — это авторский синтез (таблица трёх
стратегий противоречий, дерево выбора архитектуры, чек-лист вопросов к вендору), который
целиком опирается на уже процитированный по тексту материал и не вводит новых фактов.

## Ссылки, которые не подтверждают то, к чему приставлены

Не найдено. Для каждой проверенной сноски (src-1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
17, 18, 19, 21, 22, 23, 24, 25, 26, 27, 29, 30, 31, 32, 33, 37, 41, 42, 43, 44, 45 —
практически все) первоисточник по данному URL действительно содержит цитируемое утверждение
или число на момент проверки (30 сентября 2026).

## Методологическая заметка (важно для доверия к этому отчёту)

Инструмент WebFetch с автоматической суммаризацией один раз исказил цитату (комментарий
пользователя bushido выглядел не про то, о чём в итоге оказался пост) и один раз выдал неверную
привязку версии к фиче в CHANGELOG Claude Code (сначала показалось, что нейтрализация разметки
принадлежит v2.1.280, а не v2.1.284, как в главе). Оба случая перепроверены сырыми данными
(`curl` + HN Algolia API; `curl` сырого `CHANGELOG.md` с `grep` по версии) — и оба раза
подтвердили текст главы, а не первый (ошибочный) результат суммаризации. Это не находка против
главы, а предупреждение против доверия непроверенным автоматическим пересказам при похожих
проверках в будущем.

## Что не проверялось по первоисточнику (пределы этого отчёта)

Из соображений времени не перепроверялись отдельно: полный текст блога Google OKF (даты
коммитов 24 июля/21 августа 2026 — взяты из `gaps.md`, который указывает историю коммитов
GitHub, недоступную обычным фетчем файла); полная хронология рынка ChatGPT/Claude.ai памяти
за 2025–2026 (даты по каждому пункту — из `gaps.md`, который сам верифицировал их по страницам
release notes; выборочно подтверждены даты «Topics» 25.08.2026 и free-тир 02.03.2026 напрямую);
числа Cognee/BEAM и AWS AgentCore (взяты из `gaps.md`, который цитирует README/доки дословно).
Ни в одном из этих случаев нет расхождения между `gaps.md` и текстом главы, а сам `gaps.md` по
итогам десятков перепроверок в этом отчёте оказался надёжным источником.
