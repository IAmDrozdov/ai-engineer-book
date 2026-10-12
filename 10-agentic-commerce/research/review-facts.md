# Фактчек главы 10 «AP2, UCP и интернет агентов», часть «Протоколы»

Дата проверки: 30 сентября 2026. Рецензент читал главу (`index.html`, 1229 строк), все четыре
файла заметок (`gaps.md`, `spec.md`, `practice.md`, `field.md`) целиком, затем сверил ~30 самых
нагруженных и подозрительных утверждений с живыми первоисточниками: репозиторием
`google-agentic-commerce/AP2` (issues #268, #339, #346, #361, #362 — через `gh issue view`),
препринтом arXiv:2607.21824 (постранично, включая Table 1, Table 8, Table 9), `llmstxt.org`,
Habr (`habr.com/ru/articles/1088290`), Hacker News (`item?id=47371289`), документацией Claude
Code (`code.claude.com/docs/en/mcp`) и PyPI (`pypi.org/pypi/x402/json`).

**Итог проверки: глава фактически исключительно точна.** Почти все версии, даты, номера issue,
хеши коммитов, суммы, VERBATIM-цитаты из спецификаций и числа из препринта Лоука (33 уязвимости,
разбивка 11/8/14, разбивка по root-cause классам 13/9/4/3/3, таблица моделей 100/100/99/68/10/0/0/0,
1440 прогонов за $0,72, 95% CI Уилсона) подтвердились дословно при сверке с первоисточниками.
Ниже — то немногое, что не подтвердилось, и то, что осталось без ссылки.

## Находки (по убыванию важности)

### 1. [CRITICAL] Цитата Джереми Говарда о llms.txt v2 искажена

**Цитата из главы** (раздел «llms.txt, вторая версия»):

> В августе 2026 года Джереми Говард выпустил вторую версию `llms.txt` и объяснил её так:
> «Thousands of sites now publish an llms.txt file, documentation platforms generate one
> automatically, and coding agents use them reliably»<a class="cite" href="#src-5">5</a>.

**В чём ошибка.** Третья часть фразы придумана. Настоящий текст на llmstxt.org (раздел Background,
проверено `curl https://llmstxt.org/index.md`):

> "This is v2 of the proposal, updated based on what I learned from two years of adoption:
> thousands of sites publish an llms.txt file, documentation platforms generate one automatically,
> and Chrome's Lighthouse audits sites for one."

Говард пишет про то, что Chrome Lighthouse проверяет сайты на наличие `llms.txt` — не про то, что
кодовые агенты «надёжно им пользуются». Подмена ровно в том месте цитаты, которое подпирает вывод
главы («Claude Code и другие кодовые агенты уже ходят за документацией по ссылкам») — то есть
придуманная часть цитаты используется как доказательство утверждения абзацем ниже.

**Как правильно:** «...documentation platforms generate one automatically, and Chrome's Lighthouse
audits sites for one.» Слова «now» в начале тоже нет в оригинале («thousands of sites now publish»
вместо «thousands of sites publish»).

**URL доказательства:** https://llmstxt.org/index.md (текст также виден на https://llmstxt.org/,
раздел Background/Changes).

### 2. [MAJOR] Issue #361 приписан AP2 неверно — уязвимость найдена не в AP2

**Цитата из главы** (раздел «Что нашли в AP2 за лето»):

> В #361 сторонний разработчик, который писал собственный верификатор, нашёл слабую привязку
> идентичности магазина и назвал находку AP2-17<a class="cite" href="#src-18">18</a>.

Это предложение стоит в одном ряду с #268, #339, #346, #362 как ещё один найденный в AP2 баг, и
источник 18 («Трекер задач AP2: #268, #339, #346, #361, #362») группирует их одинаково.

**В чём ошибка.** Текст самого issue (`gh issue view 361 --repo google-agentic-commerce/AP2`)
говорит обратное:

> "Building an independent verification adapter for AP2 (AVEL...), I reproduced AP2-17 ('weak
> merchant identity binding,' arXiv:2609.00060, Jiang et al.) **in my own adapter code — not in
> AP2 itself, but in how I was validating AP2 mandates.**"
>
> "The bug: `verify_ap2` skipped the identity check when a field was absent... Fixed by rejecting
> whenever a constraint isn't declared..."

Два самостоятельных искажения:
- Баг сидел в коде стороннего разработчика (его собственном верификаторе AVEL), а не в AP2 или его
  эталонной реализации — автор issue сам это подчёркивает («not in AP2 itself»).
- Название «AP2-17» разработчик не придумывал («назвал находку AP2-17» в главе подразумевает
  авторство). Классификация «AP2-17: weak merchant identity binding» взята из другого препринта
  (arXiv:2609.00060, Jiang et al.), который в источниках главы вообще не фигурирует; #361 —
  это воспроизведение уже описанного там паттерна в чужом коде.

**Как правильно:** #361 — это отчёт о баге в стороннем independent-верификаторе AP2, который
воспроизводит класс уязвимости «AP2-17», описанный в отдельном препринте Jiang et al.
(arXiv:2609.00060); сам AP2 или его эталонная реализация в issue не затронуты.

**URL доказательства:** https://github.com/google-agentic-commerce/AP2/issues/361

### 3. [MINOR] Версия пакета x402 на PyPI дана без ссылки

**Цитата из главы** (раздел «Что сделать за вечер»):

> Пакет `x402` на PyPI на 30 сентября 2026 года имеет версию 2.25.0.

Число верное (проверено: `curl https://pypi.org/pypi/x402/json` → `"version": "2.25.0"`), но у
этого предложения нет ссылки `<a class="cite">`, хотя по правилам главы «каждое нетривиальное...
число... должно быть в заметках»/подтверждено ссылкой. Ни в одной из четырёх заметок номер версии
PyPI не упоминается вовсе — источник появился только при проверке.

**Как исправить:** либо добавить ссылку на страницу PyPI-пакета, либо на источник 25
(`x402-foundation/x402`, где через `pyproject.toml`/релизы можно проверить версию).

## Утверждения без ссылки, которым нужна ссылка

- «Пакет x402 на PyPI на 30 сентября 2026 года имеет версию 2.25.0» — см. находку 3 выше, весь
  абзац («Что сделать за вечер», первый абзац) идёт без единой ссылки.

Других предложений с проверяемыми числами/датами/именами без хотя бы одной ссылки в абзаце не
обнаружено — плотность цитирования в остальной главе высокая и корректная.

## Ссылки, которые не подтверждают то, к чему приставлены

Не обнаружено ни одной. Источник 18 (трекер AP2 issues) формально «подтверждает» и предложение
про #361 (находка 2 выше) — сам issue существует и на него можно перейти, — но содержание issue
противоречит тому, что в главе из него выводится; это не ошибка адресации ссылки, а ошибка пересказа.

## Что проверено и подтвердилось (образец, не все ~30 пунктов)

Ниже — то, что вызывало подозрение при чтении (специфичные числа, хеши, цитаты без VERBATIM-пометки
в заметках), но при сверке с первоисточником оказалось точным:

- **Лид главы и issue #339** (23 августа 2026, мандат на 5000 рупий, платёж на 7500, нераскрытое
  ограничение budget): дословно подтверждено телом issue — автор CODER7657, репродукция «Budget
  withheld → passes → 0 violations → allowed», сумма ровно 750000 paise / 500000 paise cap.
  https://github.com/google-agentic-commerce/AP2/issues/339
- **Issue #346** (2 сентября 2026, replay бага, автор FutureEnterprises): коммит `e1ea56d...`,
  сумма корзины «2500 minor units», хеш `Qef8RJ3t...`, цитата «checking a nonce is not remembering
  it», реакция Google «intended behavior for program purposes», Tamarin-модель «falsified in 14
  steps» — всё дословно совпадает с телом issue.
  https://github.com/google-agentic-commerce/AP2/issues/346
- **Issue #362** (27 сентября, бюджет ×100 для любой валюты + усечение float) и **issue #268**
  (Илья Григорик/igrigorik, конфликт ECDSA/Ed25519 для `checkout_jwt`) — авторство и содержание
  подтверждены телом issue.
- Имена MCP-серверов эталонной реализации AP2 — `credentials_provider_mcp`,
  `merchant_agent_mcp`, `merchant_payment_processor_mcp` — все три существуют в репозитории
  (проверено через GitHub code search).
- **Препринт Y. Louck, arXiv:2607.21824** — постранично сверены: 33 уязвимости (11 CoralOS + 8
  uAgents + 14 AP2, Contributions §1.2); разбивка по root-cause классам RC-1..RC-5 = 3/3/4/9/13
  (Table 1); таблица атак по моделям (Table 9) — gpt-4o-mini 100%, gemini-2.5-flash 100%,
  mistral-large-2512 99%, gpt-4o 68%, llama-3.3-70b 10%, claude-3-haiku/claude-sonnet-4.6/
  gemini-2.5-pro 0%; 1440 прогонов (8×3×3×20), стоимость $0,72 (Table 8: $0.7198), 95% CI Уилсона;
  «три уязвимости CoralOS складываются в цепочку» (V5→V4→V9); причины отказа моделей («injection
  detection for Sonnet, fraud for Llama, policy refusal for GPT-4o», §9.4) — все числа и
  формулировки совпадают дословно.
- **Цитата Habr** «Агента нельзя уволить, оштрафовать или засудить» — дословно подтверждена на
  странице статьи (habr.com/ru/articles/1088290/).
- **Цитата novachen** (Hacker News, item 47371289) — реальный текст «agent makes a confident
  decision on stale context»; в главе взята сокращённая, но не искажённая часть фразы — корректно.
- **Документация Claude Code про SSE**: фраза «Use HTTP servers instead, where available»
  и синтаксис `claude mcp add --transport sse <name> <url>` подтверждены дословно
  (code.claude.com/docs/en/mcp).
- Формулировка AP2 про запрет повторных open-мандатов («MUST NOT present any subsequent open
  Payment or Checkout Mandates without receiving a rejection receipt») и MAY-формулировка для
  проверяющих — обе оказались реальными VERBATIM-цитатами из спецификации, процитированными внутри
  issue #346, хотя ни в одной из заметок они не были помечены как VERBATIM.

## Категории, которые проверялись специально

- **Версии и даты**: AP2 v0.1.0/v0.2.0, ACP 2026-04-17, UCP v2026-08-25, x402 V2 (11.12.2025),
  MPP `draft-httpauth-payment-01`, Web Bot Auth WG-draft-00 — все совпадают с `gaps.md` (который сам
  проверен по первоисточникам) и, где я перепроверял отдельно (x402 PyPI-версия), подтвердились.
- **Поля, методы, события, формы сообщений**: JSON-примеры AP2 (open Checkout Mandate), UCP
  (`/.well-known/ucp`, чекаут-ответ, AP2-расширение), ACP (`/.well-known/acp.json`, complete-запрос),
  x402 (`PAYMENT-REQUIRED`), MPP (`WWW-Authenticate: Payment`), Web Bot Auth (`Signature-Input`) —
  дословно совпадают с VERBATIM-блоками заметок.
- **Числа и замеры**: см. препринт Лоука выше — самый нагруженный числами раздел главы, проверен
  максимально полно и подтверждён.
- **Кто что сказал/выпустил**: авторство цитат AP2-issues (FutureEnterprises, CODER7657, igrigorik,
  Ensi81) проверено через `gh issue view`; ошибка нашлась только в пересказе issue #361 (находка 2)
  и в цитате Говарда (находка 1).
- **«Сейчас X»**: формулировки вида «на 30 сентября 2026», «состояние на конец сентября 2026»
  сопровождаются датой почти везде и не противоречат `gaps.md`.

## critical / major / minor

- critical: 1
- major: 1
- minor: 1
