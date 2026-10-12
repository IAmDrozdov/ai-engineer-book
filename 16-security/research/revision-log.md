# Глава 16 — журнал правки после рецензии (30 сентября 2026)

Отчёты: review-facts.md, review-code.md, review-completeness.md, review-reader.md.
Каждая находка проверена по первоисточнику (WebFetch, curl, локальный запуск) до правки.
Итог: `qa.mjs --shots` — ISSUES none; 11 993 слова прозы; 15 рисунков; 56 источников,
нумерация сквозная в порядке первого упоминания, на каждый есть ссылка (проверено скриптом).

## Принято

### review-facts
- **Minor 1, «identified internally already».** Проверено по посту Уиллисона: в оригинале «identified it internally already». Цитата исправлена.
- **Minor 2, цитата Air Security про git.** Дословно в посте: «when a name is both a valid ref and an object id, git prefers the ref and only prints a `refname is ambiguous` warning». Заменил пересказ в кавычках на эту цитату.

### review-code
- **Major 1, стратегия `prompt-injection` в promptfoo.** Проверено по `src/redteam/strategies/index.ts`: устарела, есть предупреждение «does not cover modern prompt injection techniques». Там же нашёл, что устарела и `jailbreak` (алиас на `jailbreak:meta`). В конфиге теперь `jailbreak:meta` и `jailbreak:composite`, в тексте одна фраза про устаревшие id. Попутно исправил `data-hl` этого блока (5,19-21 → 5,20-22: подсветка съезжала на строку выше).
- **Major 2, `SNYK_TOKEN`.** README snyk/agent-scan требует аккаунт Snyk и токен для любого запуска. Добавил `export SNYK_TOKEN=...` в блок и фразу перед ним.
- **Minor 3, garak «из README».** В README стоит `probes.encoding`. Заголовок блока теперь говорит, что проба заменена на `latentinjection`.

### review-reader
- **Major 1, auto mode до определения.** В «Ноль из 720» добавлено определение `<dfn>auto mode</dfn>` одной фразой со ссылкой на раздел про песочницу.
- **Minor 2, «инъекция» до `<dfn>`.** «ловят 95% инъекций» → «ловят 95% атак».

### review-completeness
- **#1 изоляция для своего сервиса.** Новый подраздел «Если песочница нужна твоему сервису» в конце containment: таблица srt / Docker / gVisor / Firecracker с ценой (цифры и цитаты из «Securely deploying AI agents», проверено WebFetch), сокращённый `docker run` из того же руководства, абзац про прокси вне границы и Envoy `credential_injector`, отсылка к уроку Cowork. Landlock и Codex на bwrap не добавлял: в первоисточнике Anthropic их нет, а объём на пределе.
- **#2 цепочка поставок для Python.** Подраздел «PyPI: пакет, которому не нужен import»: LiteLLM 1.82.7/1.82.8, TeamPCP, `.pth` (Datadog Security Labs, проверено), вкладки uv/npm/pnpm с задержкой свежих версий (параметры сверены с документацией; `exclude-newer = "7 days"` проверен на uv 0.12.10). Пункт в чеклист, вопрос в самопроверку (`ignore-scripts` против `.pth`).
- **#3 CISA KEV.** Подраздел «Что уже ломают по-настоящему» с таблицей из 11 записей (Langflow ×6, LiteLLM ×3, n8n, Ray). Проверено по JSON каталога, версия 2026.09.30, даты добавления совпадают с gaps.md G53. Шаг 5 аудита дополнен.
- **#4 OpenAI и Hugging Face.** Абзац в «Доктрине» после «custom components»: ExploitGym, 0-day в прокси-кеше реестра пакетов, даты 16 и 21 июля, AISI 19 из 122 с оговоркой, что фильтры и сеть там не ограничивали. Строка ASI10 в таблице OWASP дополнена этим примером.
- **#5 правило двух и [A]+[C].** Находка верна: по Meta пара [A][C] допустима без человека, опасность — критика Уиллисона, после неё Meta сменила подпись на «lower risk» (проверено по посту 2025-11-02). Переписан абзац в «Трифекте» и ответ на вопрос 2 самопроверки. Новый источник.
- **#6 настройки, ломающие песочницу.** Таблица из четырёх строк (`allowUnixSockets`/docker.sock, запись в `$PATH` и rc-файлы, `enableWeakerNestedSandbox`, `allowAppleEvents`) с цитатами из раздела Security limitations; фраза про `permissions.blockReadsOutsideWorkingDirectories` (2.1.257). Совет передавать такие ключи через `claude --settings` (флаг проверен в `claude --help`).
- **#7 невидимые инъекции.** Абзац про Unicode Tags (Ребергер, 2024, цитата про фильтрацию проверена) и Rules File Backdoor (Pillar, 2025; field.md S20), код `strip_invisible.py` (прогнан на Python 3.14.7), строка в таблицу признаков атаки. Brave «unseeable» и 1px-текст в Antigravity не добавлял: другой механизм (OCR, CSS), место на пределе.
- **#8 лечение Clinejection.** Абзац после практической выноски: три рекомендации Хана дословно или близко к тексту (проверено по adnanthekhan.com) и что сделала Cline. Корень s1ngularity (`pull_request_target` с заголовком PR в shell) добавлен одной фразой в разделе о вредоносе с источником Nx postmortem. Чеклист: «убрал восстановление кеша из воркфлоу, которые публикуют релизы».
- **#9 MCP 2026-07-28.** Mix-up/`iss`/PKCE сжаты до отсылки к главе 15. Добавлено требование про URL авторизации (схемы http/https, запрет shell для открытия URL) прямо к абзацу про CVE-2025-6514, плюс SSRF на 169.254.169.254 со Smokescreen и предупреждение о stdio за прокси. Всё сверено с .mdx ревизии.
- **#11, часть про Gemini CLI.** Фраза в Plugin4Shell: Gemini CLI был затронут; утверждение Air Security «deprecated» подано как преувеличение с фактами (Antigravity для бесплатного тарифа и Google One с 18 июня, v0.62.0 29 сентября, PR #28422 открыт). Проверено WebFetch PR.
- **#12, частично.** (а) Фраза «в обиходе его называют Digital Omnibus, но это не проверено» убрана: проверить название не удалось, осталась только констатация, что таймлайн акт не называет. (б) Добавлен запрос информации NIST CAISI от 8 января 2026 (метаданные взяты из API Federal Register). (в) Цифры 6,3% против 2,4% и Apollo 12% → 7% добавлены в раздел про auto mode (проверены по claude.com/blog). (г) Исходная цифра Spotlighting «>50% → <2%» добавлена в подпись рис. 16.4 (проверено по аннотации arXiv:2403.14720).

## Отклонено

- **completeness #10, новые строки в таблице каналов утечки (Mermaid в Cursor, Google Forms, webhook.site, Copilot Cowork, аналог OpenAI).** Все эти случаи укладываются в уже описанные классы: картинка, разрешённый домен, URL в инструменте. Ради них понадобилось бы 3–4 новых источника при бюджете слов на пределе (12 тыс.); таблица и так заканчивается выбором.
- **completeness #11, таблица сравнения Claude Code и Codex.** Глава построена на Claude Code, которым читатель пользуется каждый день; сравнение умолчаний Codex в пять строк без разбора механизма было бы справкой, которая быстро устареет. Взята только фраза про Gemini CLI в Plugin4Shell.
- **completeness #12, FIDES.** Одной строкой без механизма пример ничего не добавляет к разбору CaMeL и taint-tracking, а источник раздувает список.

## Проверка
- `node tools/qa.mjs 16-security --shots`: ISSUES none. Изменённый рисунок — только подпись рис. 16.4; скриншот просмотрен. Разделы с новыми таблицами и вкладками просмотрены через `--sections --out _qa/16-security-rev`.
- Источники перенумерованы скриптом по первому упоминанию: 56 штук, 1..56 без пропусков, порядок списка совпадает с порядком ссылок, неиспользуемых нет.

## Проверка фактов, 30.09.2026 (приёмщик)

Принято 2 из 2, оба первоисточника перепроверены WebFetch.

- **Цитата General Analysis о Supabase MCP (раздел «Трифекта и правило двух»).** В главе стояло «prompt injection filters cannot grant or restrict permissions» — укороченная и изменённая форма. Заменено дословным предложением из generalanalysis.com/blog/supabase-mcp-blog: «A prompt injection filter can flag suspicious content, but it cannot grant or restrict database permissions». Та же неточная форма осталась в research/field.md (S6) и research/gaps.md; в главу оттуда больше не переносить.
- **Ответ Anthropic Ребергеру (раздел «Ноль из 720 и 24 из 25»).** Фраза «not a security guarantee… The real boundary is OS isolation and network egress control» — пересказ позиции Anthropic самим Ребергером в посте на embracethered.com, а не цитата из ответа компании. Дословно подтверждён только статус «Informative». Кавычки сняты, фраза дана по-русски как пересказ Ребергера. research/gaps.md, пункт 5, подаёт её как слова Anthropic; строка 349 там же говорит о пересказе верно.
- `node tools/qa.mjs 16-security`: ISSUES none, 11981 слово прозы, 15 рисунков.

## Решения редактора после сверки книги, 30.09.2026

Находок сверки не было. Внесены три решения редактора, факты не менялись.

- **«Удивляют людей чаще всего».** В разделе про песочницу фраза звучала как выдуманный опыт. Теперь: «Две вещи на схеме границы песочницы неочевидны», со ссылкой на `#fig-sandbox`.
- **Ссылки на рисунки.** Раньше текст не ссылался ни на один рисунок. Добавлены ссылки на 10 из 15: `fig-clinejection`, `fig-trifecta`, `fig-supabase`, `fig-adaptive`, `fig-echoleak`, `fig-allowlisted`, `fig-trust-order`, `fig-second-order`, `fig-automode`, `fig-sandbox`. Каждая стоит в абзаце, который разбирает свой рисунок. Для Supabase добавлена фраза о канале наружу, она взята из подписи рис. 16.3.
- **Ярлык «Практический вывод:».** В абзаце про уязвимость claude-code-action заменён на «Для своих воркфлоу важнее другое:».
- `node tools/qa.mjs 16-security`: ISSUES none, 12050 слов прозы, 15 рисунков. Рисунки не менялись, поэтому прогон без `--shots`.
