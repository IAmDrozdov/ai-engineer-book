# Журнал правки главы 06 по рецензиям

Дата: 30 сентября 2026. Статус: правка завершена.

До правки: words_prose 11 603, 15 рисунков, 45 источников, ISSUES none.
После: words_prose 11 995, 15 рисунков, 52 источника (нумерация сквозная по первому упоминанию, на
каждый есть ссылка, проверено скриптом), ссылки из текста на все 15 рисунков, `qa.mjs --shots`: ISSUES none.
Скриншоты изменённых рисунков (6.2, 6.4, 6.10, 6.13) просмотрены.

Первоисточники, по которым сверялись находки (скачаны 30.09.2026): code.claude.com/docs/en/skills.md,
code.claude.com/docs/en/changelog.md, ext-skills/specification/stable/skills.mdx (SEP-2640),
platform.claude.com: skills-guide.md, agent-skills/overview.md, agent-skills/enterprise.md,
agent-skills/best-practices.md, api/beta/organization/analytics/skills/list.md; anthropics/skills (README,
pdf, webapp-testing, список каталога через GitHub API); manifold.security/blog/scope-squatting-clawhub-plugins;
skills.sh/audits; agent-plugins.org/specification.md; аннотации arXiv 2609.35692, 2605.31408, 2601.10338, 2602.06547.

## Принятые находки

| Рецензия | Находка | Что сделано |
|---|---|---|
| facts #3 | Ни на один рисунок нет ссылки из текста | Добавлены ссылки `href="#fig-…"` на все 15 рисунков, в основном без новых слов (переделаны существующие фразы) |
| code minor | Рис. 6.2: стрелка «ответ» идёт от модели к пользователю в обход харнесса | `M-->>U` заменено на `M->>H: итоговый текст` + `H-->>U: ответ` |
| reader #1 / completeness #1 | `when_to_use`, `arguments`, `hooks`, `effort`, `model`, `shell` названы, но не объяснены | В «Шесть полей» таблица «поле → что делает → сколько действует» (по frontmatter reference в skills.md); фраза «что делают важные, разобрано ниже» заменена точной. В «Команды стали скиллами» — пример `fix-issue` из документации и абзац про `$ARGUMENTS`, `$N`, дописывание `ARGUMENTS:`, экранирование `\$1.00`, цепочку `/write-tests /fix-issue 123` (v2.1.199). В «Права живут меньше текста» — контраст: хук из скилла живёт до конца сессии. В разделе о безопасности — четвёртое место (`hooks` чужого скилла) и `hooks` в предупреждении о чужом репозитории. В набросок alembic-migration добавлен `allowed-tools: Bash(python ${CLAUDE_SKILL_DIR}/scripts/check_migration.py *)` и пояснение, что подстановка работает в `allowed-tools` |
| reader #2 | «Защита от компакции» упомянута до объяснения | Ссылка на `#lifecycle` |
| completeness #2 | Не рассмотрен обратный сбой, скилл срабатывает не там | Новый подраздел «Обратный сбой: скилл срабатывает не там»: Coexistence из enterprise-гайда, «Skill triggers too often» из troubleshooting, `paths`/`disable-model-invocation`, near-miss по всем установленным скиллам |
| completeness #3 | Нет обзора хорошо сделанных скиллов | Абзац про `anthropics/skills` (19 скиллов): `pdf` (напористое описание, условная ссылка на FORMS.md), `webapp-testing` (скрипты как чёрный ящик, «DO NOT read the source»), оговорка README. obra/superpowers и cloudflare/security-audit-skill не добавлены: число звёзд не из заметок и быстро устаревает, приёмы из них уже покрыты |
| completeness #4 | Не описана среда выполнения в приложениях Claude | Таблица «Claude Code / claude.ai / API, AWS, Foundry» по сети и пакетам из overview; фраза, что Skills API в документации заявлен для Claude API, Claude Platform on AWS и Foundry (Hosted on Anthropic), а Bedrock и Vertex не названы |
| completeness #5 | Нет данных о цене поэтапного раскрытия | Workday (arXiv 2609.35692) в «За экономию токенов платишь ходами»; Сюй и У (arXiv 2605.31408) после SkillsBench v4 |
| completeness #6 | Нет замеров, важных для автора, выпал сквоттинг неймспейсов | «Agent Skills in the Wild» (26,1%, скрипты — в 2,12 раза чаще) и «Do Not Mention This to the User» (157 из 98 380) в «Сколько там вредоносного»; Manifold Security (23 плагина под `@openclaw/`, `@clawhub/`) в «Каналах» |
| completeness #7 | У skills.sh не описана страница аудитов | Одна фраза: три сканера, пример расхождения «Safe / 0 alerts / Critical» на скилле из первой двадцатки (проверено на skills.sh/audits 30.09.2026) |
| completeness #9 | Не хватает правил руководства | Герундий в имени, запрет на условия с датами («old patterns»), 3–5 запросов на всех моделях организации из enterprise-гайда |
| completeness #10 | Не сказано, что плагин Claude Code — не пакет Agent Plugins | В заметке «Насколько это стандарт?»: `plugin.json`/`mcp.json` против `.claude-plugin/plugin.json`/`.mcp.json`, переносится только `skills/` |
| completeness #11 | В вопросе самопроверки смешаны версии SkillsBench | Вопрос переписан на v1: +16,2 п.п. в среднем и +4,5 п.п. в Software Engineering |
| completeness #12 (частично) | Новинки Claude Code | `/doctor prompt-audit` (v2.1.283, сверено с changelog) в абзаце про capability uplift; `ant apply` (skills-guide) в «Загрузке и версиях» |
| facts #1 / code major (частично) | Заголовок блока `skills/list` | Сам блок верен (см. отклонённые), но заголовок уточнён: «из раздела Example Message Flow спецификации SEP-2640, третий файл опущен», чтобы сверяющий читатель нашёл оригинал |
| reader #3 | Объём выше 11 тыс. | Рамка задания — до 12 тыс.; после дополнений текст ужат до 11 995: убраны пересказы, дублирующие рисунки и таблицы (цепочка ClawHub, шаги skill-creator, список клиентов, путаница с версиями code execution), даты коммитов спецификации, темп Snyk, лишние хвосты подписей и ответов самопроверки |

Попутно найдено и исправлено: предупреждение под таблицей миграции Skills API начиналось «Последняя строка таблицы опасна», но последняя строка — про SDK, а речь об удалении. Исправлено на «Строка про удаление опасна».

## Отклонённые находки

| Рецензия | Находка | Почему отклонена |
|---|---|---|
| facts #1 | В примере `skills/list` должно быть `"id": 4` | Пример взят дословно из раздела «Example Message Flow» спецификации (строки 578–622 skills.mdx): там `"id": 2`, метод `skills/list`, тот же `pdf-processing` и те же дайджесты. `"id": 4` у другого примера, в разделе «Listing Skills» |
| code major | Блок смешивает ответ `skills/get` с конвертом `skills/list` | То же: в спецификации есть настоящий ответ `skills/list` с `pdf-processing` и массивом `skills`, он и воспроизведён; опущен только третий ресурс `purchase-order.md`. Уточнён лишь заголовок блока |
| facts #2 | Строка `source`: строка → объект не подтверждена | Подтверждена первоисточником, на который стоит ссылка: таблица «Migrate from skills-2025-10-02» в skills-guide.md: «`source` — A string, "custom" or "anthropic" → An object, for example {"type": "custom"}» |
| code minor | «до v2.1.196» для строки Skills в `/context` не подтверждается | Утверждение взято из документации Claude Code (src-2, раздел «Skill descriptions are cut short»): «Before v2.1.196, the row counted the full text of every description and could show a value several times larger than the configured budget». Ссылка на src-2 стоит в конце списка. Changelog рецензент смотрел на GitHub, где он обрывается на старых версиях |
| completeness #8 | API аналитики скиллов для Enterprise | Сначала добавлен, затем снят ради объёма: инструмент администратора Enterprise, читателю-бэкендеру нужен реже остального, а место ушло на крупные находки |
| completeness #12 (частично) | `disableBundledSkills`, Claude Marketplace 23.09.2026 | Не добавлены из-за объёма: не меняют ни одного решения читателя, каталог плагинов от 25.09 уже упомянут |
| completeness, границы | Сократить JSON `skills/list` и MUST-правила SEP-2640 | Не ошибка (сам рецензент не включил в находки); JSON не входит в счёт объёма, правила безопасности расширения — самая полезная для главы часть |

## Сверка книги, 30 сентября 2026

| Находка | Решение | Проверка |
|---|---|---|
| mcp: SEP-2640 Final 13 сентября (гл. 6) против 11 сентября (гл. 5) | Принята. Дата Final исправлена на 11 сентября в хронологии, во вступлении раздела о MCP, в абзаце о расширении (с уточнением «PR влили 13-го») и в src-29. Добавлен src-53 (страница SEP-2640 и PR #2640) | `gh`: коммит «SEP-2640: mark as Final» от спонсора pja-ant 2026-09-11T17:10Z; label `final` и merge 2026-09-13. По SEP guidelines статус Final ставит спонсор, после чего PR можно вливать. Глава 5 уже говорит 11 сентября |

### Отклонённые

| Находка | Почему отклонена |
|---|---|
| anthropic: «1% окна» в таблице клиентов должно быть «2%» (CHANGELOG v2.1.32) | Запись v2.1.32 устарела (текущая версия 2.1.286). Документация Claude Code на 30.09.2026 (code.claude.com/docs/en/skills, src-2): бюджет листинга «defaults to 1% of the model's context window», `skillListingBudgetFraction` по умолчанию `0.01`, `0.02` приведено как пример поднятия. Строка 220 главы («поднимает потолок (0.02 — 2%)») с этим согласна, противоречия нет |
| anthropic: «1% окна» в ответе самопроверки | Та же причина |
