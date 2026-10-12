# Ревью главы 16 «Безопасность агентных приложений» — код, протокольные примеры, рисунки

Ревьюер проверял только код, протокольные/CLI-примеры и рисунки (не прозу и не факты вне них).
Методика: каждый Python-блок выгружен в файл и прогнан через `python3 -m py_compile` (Python 3.14.7);
JSON-блоки и JSON внутри `chart` — через `json.loads`; YAML — через `yaml.safe_load`; два исполняемых
примера (`render_safe.py`, `taint.py`) запущены целиком с реальными версиями библиотек (`nh3` 0.3.7,
`markdown-it-py` 4.2.0), чтобы проверить не только синтаксис, но заявленное в тексте поведение; имена
полей/параметров сверены с `research/spec.md`, `research/practice.md`, `research/gaps.md` и, где заметок
не хватало, с живой документацией (`code.claude.com`, GitHub README пакетов, сайт promptfoo) через
WebFetch; версии инструментов сверены с npm/PyPI; счётчик бюллетеней GitHub Security Advisories сверен
напрямую через `gh api` за оба репозитория. Рисунки: `node tools/qa.mjs 16-security --shots --out
_qa/16-security-code` (ISSUES none, 15/15 рисунков), каждый скриншот открыт и сверен с подписью,
текстом раздела и mermaid/SVG-источником в `index.html`.

## Итог

Из 14 блоков кода (4 Python, 5 JSON, 2 YAML, 1 JavaScript-фрагмент, 3 bash-примера с CLI) все
синтаксически корректны или намеренно нерабочие как показано (см. «Проверено, ошибок нет» ниже).
Два исполняемых Python-примера были прогнаны целиком и ведут себя ровно так, как описывает текст.
Все 15 рисунков соответствуют подписям, тексту и первоисточникам; расхождений в участниках,
направлении стрелок, порядке сообщений или числах не найдено. Числа на обоих графиках (`fig-adaptive`,
`fig-ghsa`) совпадают с заметками поразрядно, а для `fig-ghsa` — ещё и с текущими данными GitHub API.

Найдено 2 major (сломанные/неполные CLI-примеры для читателя, который выполнит их как написано) и
1 minor. Critical-находок нет.

---

## Major

### 1. `promptfooconfig.yaml` (раздел «Аудит», строка ~624) — стратегия `prompt-injection` устарела в самой промптфу

**Что не так.** Блок кода помечен как «Набросок: promptfooconfig.yaml по документации promptfoo», а
после него написано: «Идентификаторы плагинов и стратегий сверены со страницами документации
promptfoo на 30 сентября 2026 года». Список `strategies` в примере — `jailbreak`, `prompt-injection`.
Id `prompt-injection` в текущем promptfoo (проверено по исходнику
`src/redteam/strategies/index.ts` в `promptfoo/promptfoo`, версия из источника 45 — 0.123.1)
помечен как deprecated и алиасится на `jailbreak-templates`, с предупреждением в рантайме:

```
Strategy "prompt-injection" is deprecated. Use "jailbreak-templates" instead.
This strategy applies static jailbreak templates and does not cover modern prompt injection techniques.
```

Ирония в том, что этот конкретный пример — про тестирование именно непрямой промпт-инъекции
(`indirect-prompt-injection` плагин на поле `ticket`), и собственное предупреждение maintainer'ов
promptfoo прямо говорит, что устаревшая стратегия «does not cover modern prompt injection
techniques». Конфиг не упадёт (алиас работает), но даст читателю заведомо более слабое покрытие,
чем он ожидает, скопировав пример из главы про современные атаки.

**Как исправить.** Заменить `prompt-injection` на `jailbreak-templates` в списке `strategies`
(или убрать вовсе — `indirect-prompt-injection` плагин + `jailbreak` стратегия уже закрывают то,
что заявлено в этом примере).

**Доказательство.** Проверено WebFetch по `https://www.promptfoo.dev/docs/red-team/configuration/`
(плагины `indirect-prompt-injection`, `excessive-agency`, `bola`, `data-exfil`, `ssrf`,
`agentic:memory-poisoning` — все подтверждены как существующие) и по
`https://raw.githubusercontent.com/promptfoo/promptfoo/main/src/redteam/strategies/index.ts`
(запись `id: 'prompt-injection'` с комментарием `// Deprecated: Use 'jailbreak-templates' instead`
и текстом предупреждения выше). Поле `indirectInjectionVar` (использовано в примере) подтверждено
отдельно по `https://www.promptfoo.dev/docs/red-team/plugins/indirect-prompt-injection/` — оно
корректно, находка касается только строки `strategies`.

### 2. `uvx snyk-agent-scan` (раздел «Аудит», строка ~618-621) — команды не заработают без токена, о котором в главе ни слова

**Что не так.** Блок «Проверка локальных агентов, серверов и навыков» даёт две команды:

```bash
uvx snyk-agent-scan@latest                   # найти и проверить всё, что установлено
uvx snyk-agent-scan@latest ~/.claude/skills  # только навыки Claude Code
```

Обе синтаксически верны и текстуально совпадают с примерами из README `snyk/agent-scan` дословно.
Но README тут же говорит, что перед любым запуском обязателен аккаунт Snyk и переменная окружения:
«Sign up at Snyk and get an API token from https://app.snyk.io/account… Set the token as an
environment variable before running any scan: `export SNYK_TOKEN=your-api-token-here`». Это
касается «all scan operations, including basic local scans». Читатель, который в понедельник
буквально выполнит команду из главы (а раздел называется «Аудит: с чего начать в понедельник» и
именно так её подаёт), получит ошибку авторизации, а не обещанный скан.

**Как исправить.** Добавить перед примером строку `export SNYK_TOKEN=…` (и указание, что токен
берётся на app.snyk.io) — так же, как в главе уже сделана оговорка про интерактивное согласие на
запуск stdio-серверов.

**Доказательство.** WebFetch по `https://raw.githubusercontent.com/snyk/agent-scan/main/README.md`:
раздел «Before using either option» с текстом про `SNYK_TOKEN`, подтверждено, что это требование
применяется и к базовому локальному скану без явного исключения.

---

## Minor

### 3. Команда garak (раздел «Аудит», строка ~658) подписана «команды из README», но пробник подменён без пометки

**Что не так.** Заголовок блока — «garak и AgentDojo: команды из README», что читается как прямая
цитата. Строка AgentDojo действительно дословно совпадает с README (`python -m
agentdojo.scripts.benchmark -s workspace -ut user_task_0 -ut user_task_1 --model
gpt-4o-2024-05-13 --defense tool_filter --attack tool_knowledge` — совпадение 1:1). Строка garak —

```
python3 -m garak --target_type openai --target_name gpt-5-nano --spec probes.latentinjection
```

а собственный пример README — `python3 -m garak --target_type openai --target_name gpt-5-nano
--spec probes.encoding`. Флаги, синтаксис и даже имя модели (`gpt-5-nano`) взяты из README
верно, но пробник `probes.encoding` заменён на `probes.latentinjection` без указания, что это
модификация автора, а не цитата. Пробник существующий и тематически куда более уместный для
главы про инъекции (подтверждено — модуль `garak/probes/latentinjection.py` в репозитории NVIDIA
реально существует и содержит классы `LatentInjectionReport`, `LatentWhois` и т. д.), поэтому
по сути ошибки нет — только несоответствие между «как в README» и тем, что строка на самом деле
составлена автором главы.

**Как исправить.** Сменить подпись `data-title` на «на основе README», либо явно отметить в
тексте, что пробник выбран автором главы (`probes.latentinjection` вместо `probes.encoding` из
примера), раз уж в разделе 4 инструкции AUTHORING.md отдельно требуется отличать цитату от
составленного самим автором примера.

**Доказательство.** WebFetch по `https://raw.githubusercontent.com/NVIDIA/garak/main/README.md`
(пример `--spec probes.encoding`, не `probes.latentinjection`) и по
`https://raw.githubusercontent.com/NVIDIA/garak/main/garak/probes/latentinjection.py` (модуль
существует, содержит перечисленные классы).

---

## Проверено, ошибок нет

Ниже — то, что явно проверялось и оказалось верным; включено, чтобы не пришлось перепроверять то же самое.

- **`render_safe.py`** (раздел «Куда уходят данные») — `py_compile` проходит; полный прогон с `nh3`
  0.3.7 и `markdown-it-py` 4.2.0 воспроизводит ровно то, что описано в тексте: прямая картинка с
  чужого домена превращается в `<img alt="…">` без `src`, ссылочная форма `![x][ref]` обрабатывается
  так же, сырой `<img>` экранируется в текст, картинка с разрешённого домена проходит с `src`, а
  обычная ссылка остаётся кликабельной. Параметр `attribute_filter` у `nh3.clean` — реальное имя
  (проверено `help(nh3.clean)`).
- **`taint.py`** (раздел «Архитектура, которая не верит модели») — `py_compile` проходит; полный
  прогон на Python 3.14.7 (как заявлено в тексте: «проверено на Python 3.14») даёт ровно два эффекта
  из текста: первый `send_email` печатает «отправляю на bob@example.com», второй бросает
  `PermissionError: адресат пришёл из ['email:42']` — комментарий `# PermissionError` в коде
  подтверждён поведением.
- **`claudecode/prompts.py` фрагмент** (раздел «Куда уходят данные», Comment and Control) — не
  компилируется (`...` в сигнатуре), но это ожидаемо: блок подписан «(как в отчёте)» и дословно
  совпадает с VERBATIM-цитатой в `research/gaps.md:257-258`, включая многоточие. Это не набросок
  автора и не заявлено как рабочий код — синтаксическая ошибка тут не находка.
- **`.claude/settings.json` (CVE-2026-33068)** — валидный JSON, дословно совпадает с
  `research/field.md:132`.
- **«Набросок: `~/.claude/settings.json` по документации песочницы»** (раздел про песочницу) —
  валидный JSON. Поля `sandbox.credentials.files[].path/mode`, `sandbox.credentials.envVars[]`,
  `sandbox.network.strictAllowlist`, `sandbox.allowUnsandboxedCommands` — все подтверждены живой
  документацией `code.claude.com/docs/en/sandboxing` (включая точную структуру `credentials.files`
  с `path`/`mode: "deny"` — в заметках `spec.md`/`practice.md` был только пример для `envVars`,
  но живые доки дают идентичный пример для файлов, вплоть до тех же путей `~/.aws/credentials` и
  `~/.ssh` и тех же имён переменных `GITHUB_TOKEN`/`NPM_TOKEN`). Версия `strictAllowlist` (≥2.1.219)
  и поведение `mask` на файлах (Linux/WSL2 — подстановка, macOS — блокировка) подтверждены той же
  страницей.
- **`.mcp.json` под `srt`** (раздел про песочницу) — валидный JSON, дословно совпадает с примером
  в README `anthropics/sandbox-runtime` («With sandboxing» блок); утверждение «пустой
  `allowedDomains` значит нет сети» подтверждено тем же README. Версия 0.0.78 у `src-37` — это
  реальный `dist-tags.latest` в npm-реестре на момент проверки.
- **Cline workflow YAML** и **telemetry.js фрагмент** — `yaml.safe_load` проходит; оба дословно
  совпадают с VERBATIM-цитатами в `research/gaps.md` (строки 257-268 и 287-289 соответственно).
- **Тикет поддержки (General Analysis)** — текст дословно совпадает с `research/field.md:107`.
- **MCP tool-poisoning демо (`add`/`sidenote`)** — `py_compile` проходит; дословно совпадает с
  `research/gaps.md:148-161`.
- **Версии инструментов в источниках 40 и 42** — все подтверждены напрямую по реестрам на момент
  проверки: `snyk-agent-scan` 0.6.8 (PyPI), `promptfoo` 0.123.1 (npm), `garak` 0.17.0 (PyPI),
  `agentdojo` 0.1.35 (PyPI), `PyRIT` 1.1.0 (PyPI), `sandbox-runtime` 0.0.78 (npm).
- **Цитата про MCP 2026-07-28** («MCP servers MUST NOT treat possession of a state handle as
  authentication», «PKCE alone does not prevent this attack») — дословно совпадает с
  `research/gaps.md:137-138`.
- **Таблица ASI01–ASI10** — все десять кодов и названий совпадают с `research/gaps.md:65`
  один в один.
- **Рисунки (все 15, скриншоты `_qa/16-security-code/`)**:
  - `fig-clinejection`, `fig-trifecta`, `fig-supabase`, `fig-echoleak`, `fig-allowlisted`,
    `fig-trust-order`, `fig-plugin4shell`, `fig-tool-poisoning`, `fig-second-order`,
    `fig-automode`, `fig-shadowing`, `fig-sandbox`, `fig-camel` — участники, направление стрелок и
    порядок сообщений на схемах совпадают с текстом раздела и с mermaid/SVG/HTML-источником в
    `index.html`. Нигде не нашёл перепутанных ролей, стрелок в обратную сторону или пропущенных
    шагов из описанной в тексте цепочки.
  - `fig-adaptive` (hbar, «The Attacker Moves Second») — оба ряда (`[30,28,21,15,0,26,28,0]` и
    `[100,99,95,90,71,94,90,89]`) совпадают с `research/gaps.md:385` для Gemini-2.5 Pro; подпись про
    «39% полезности у PIGuard» совпадает с `gaps.md:313` (39.18%, округлено); сноска про GPT-5 Mini
    (0→75, 0→47, 0→49) тоже совпадает с той же строкой заметок.
  - `fig-ghsa` (line, бюллетени по кварталам) — оба ряда и итоговые суммы (32 и 33) сверены не
    только с заметками, но и напрямую с `gh api repos/anthropics/claude-code/security-advisories`
    и `gh api repos/cursor/cursor/security-advisories` (постранично, без пагинации по 100): реальные
    поквартальные разбивки совпали с JSON в графике на все девять кварталов обеих серий, включая
    `null` там, где у Claude Code бюллетеней ещё не было (2024 Q3–Q4).
