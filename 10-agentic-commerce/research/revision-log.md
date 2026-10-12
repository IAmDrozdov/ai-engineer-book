# Журнал правки главы 10 после рецензии

Дата: 30 сентября 2026. Разобраны отчёты review-facts, review-code, review-completeness, review-reader.
Итог проверки: `node tools/qa.mjs 10-agentic-commerce --shots` → `ISSUES none`, words_prose 11 998
(счётчик qa включает самопроверку, чеклист и список источников; связный текст разделов около 10,6 тыс.),
16 рисунков, 49 источников. Нумерация сквозная по первому упоминанию, на каждый источник есть ссылка
(проверено скриптом после перенумерации).

## Принято

### review-facts
1. **[critical] Цитата Говарда о llms.txt v2.** Проверил по https://llmstxt.org/index.md: третья часть
   фразы в главе была выдумана. Заменил на дословную: «thousands of sites publish an llms.txt file,
   documentation platforms generate one automatically, and Chrome’s Lighthouse audits sites for one as
   part of its agentic browsing checks». Утверждение про кодовых агентов теперь опирается на другую
   дословную фразу той же спецификации: «coding agents follow them to find API references and tutorials».
2. **[major] #361 приписан AP2.** Проверил `gh issue view 361`: баг в стороннем верификаторе AVEL, «not in
   AP2 itself», а AP2-17 — класс из препринта Jiang et al. Переписал предложение: отчёт о чужом коде,
   воспроизведён класс «weak merchant identity binding», пустой `payee.id` пропускал любого получателя.
3. **[minor] Версия x402 на PyPI без ссылки.** Проверил PyPI JSON: 2.25.0, загружена 29 сентября 2026.
   Добавил источник «x402 2.25.0, PyPI» и дату.

### review-code
4. **[major] Невалидный JSON в блоке «Ответ чекаута с подписью магазина».** Перевёл блок в `jsonc`,
   многоточия обёрнуты в `/* … */`, в заголовке пометка «сокращён» — как у соседнего блока Create Checkout.

### review-reader
5. **[major] Два пункта чеклиста без действия.** Переписал: разбор пресс-релиза по четырём слоям главы
   (Agent Pay отдельно от Verifiable Intent); письменный разбор юридических допущений проекта агента
   по статье 26 AI Act и AB 316.
6. **[minor] Нет `<dfn>` и `<mark>`.** Добавил `<dfn>` для «мандатов», Trusted Surface, SD-JWT,
   capability, facilitator; `<mark>` на два ключевых места (детерминированный код Trusted Surface;
   «проверить свежесть и запомнить факт использования — разные операции»).
7. **[minor] «Глава 672» у AB 316.** Заменил на «Statutes 2025, ch. 672» в тексте и в источнике.
8. **[minor] PSP не расшифрован.** Глосса при первом появлении в разделе «Четыре вопроса».
9. **[minor] Алгоритм пересечения capability без примера.** Добавил прогон на двух версиях чекаута и
   `fulfillment` с `extends`, включая случай осиротевшего расширения; убрал из следующего абзаца
   предложение, которое повторяло пример.

### review-completeness
10. **[major 1] Путь денег в UCP.** Новый подраздел «Как платит платформа»: треугольник доверия, три шага
    (обработчик → инструмент → `payment.instruments[]` в `complete`), «businesses MUST NOT echo
    credentials back», merchant of record без PCI DSS, сохранённые инструменты как `id` + `display`
    только на запрос от имени привязанного покупателя. Проверено по ucp.dev Core Concepts (новый
    источник) и Checkout Capability. Диаграмму не добавлял: в главе уже 16 рисунков, верхняя граница.
11. **[major 2] Обратимость платежей.** Абзац про `auth-capture`: дословная цитата «Where `exact` moves
    a fixed amount once and offers no way to give it back…», `capture`/`void`/`refund`/`reclaim`,
    `extra.captureDeadline`, поток `escrow` по умолчанию, согласие сервера на операции, которые клиент
    не подписывает. Плюс Stripe: баланс в фиате и Refunds API (проверено по docs.stripe.com/payments/machine.md).
12. **[major 3] `payment-identifier`.** Абзац об идемпотентности x402 (`id` 16–128 символов, дедупликация
    на сервере и/или facilitator) и о расширении `http-message-signatures` как слое «кто стучится» внутри
    x402. Проверено по `specs/extensions/` через `gh api`. Остальные расширения (SIWX, gas sponsoring,
    builder_code) не перечислял: для главы это каталог имён без механизма.
13. **[major 4] Tempo и mppx.** Одно предложение: Tempo — L1 для платежей в стейблкоинах, инкубирован
    Stripe и Paradigm, заявленная финализация ~0,6 с (tempo.xyz). Одно предложение про `mppx` с x402
    `exact` с 8 июня 2026 (новый источник mpp.dev). Поток `payment_intents`/`networkId` и Link Agent
    Wallet не добавлял: это детали интеграции Stripe, которые быстрее прочитать в доке по ссылке.
14. **[major 5] Файловый фид ACP.** Абзац: SFTP, parquet с zstd, полный снимок не реже раза в день,
    шарды до 500 тыс. товаров и ~500 МБ, стабильное имя; девять обязательных полей; флаги
    `is_eligible_search`/`is_eligible_checkout` и цитата «Setting an eligibility flag does not complete
    checkout onboarding». Проверено WebFetch по developers.openai.com/commerce/specs/feed и file-upload.
15. **[major 6, частично] Кто что выпустил.** Добавлены: сигналы TAP «via query parameters» (PAR,
    лояльность, email, телефон) с выводом про маскирование в логах — проверено по README
    visa/trusted-agent-protocol; приложение Walmart внутри ChatGPT (пост OpenAI, источник 16).
    Mastercard APAC/Santander в главе уже были с пометкой «вторичные обзоры».
16. **[minor 7] L402.** Предложение в выборе x402/MPP с цитатой thinkmassive из треда HN о запуске x402
    (проверено через HN Algolia).
17. **[minor 8] Заказы в UCP.** Отдельный абзац: expectations, append-only events, adjustments,
    Standard Webhooks с подписью RFC 9421, `config.webhook_url` (проверено по ucp.dev order spec).
18. **[minor 9] Переговоры в ACP.** Абзац про Capability Negotiation 2026-01-30 (`interventions`,
    `display_context`, `max_redirects`), `requires_delegate_payment`, вебхуки `order_created`/
    `order_updated` с HMAC; строка «Переговоры» в таблице UCP/ACP.
19. **[minor 10] #358, PCAT, Trusted Agent Provider.** #358 проверен `gh issue view` и добавлен вместе с
    общей мыслью «отсутствующее поле трактуется как „проверять нечего“» (#339, #358, #361); PCAT —
    предложение по абстракту arXiv 2607.21824; Trusted Agent Provider — по ap2-protocol.org/llms-full.txt.
20. **[minor 11, частично] Lighthouse.** Упомянут через исправленную цитату Говарда.
21. **[minor 12, частично] Предыстория Monetization Gateway.** Предложение про `paidTool` и
    `withX402Client` в Agents SDK и бету pay per crawl (проверено по blog.cloudflare.com/x402, новый источник).

### Сопутствующее
- Расширены описания источников: x402 (schemes/auth-capture, extensions), OpenAI Developers (Product
  Feed spec, File upload), Tempo (tempo.xyz), трекер AP2 (#358).
- Перенумерация источников скриптом по первому упоминанию: 45 → 49.
- Чтобы остаться в пределе 12 тыс. слов по счётчику qa, сокращены повторы: дублирующий абзац про SSE в
  «Что сделать за вечер» свёрнут в шаг 3, убраны пересказ двух пар-соперников в «Сводной таблице»,
  абзац-анонс слоёв обнаружения, часть подробностей CommerceTXT, KYA/Vouched, Mastercard, состав
  сопредседателей FIDO и основателей совета по платежам UCP.

## Отклонено

- **review-reader, critical 1: `data-hl` стирает код.** На момент правки уже исправлено в общем
  `assets/book.css` (изменён в 22:22, после отчёта: `.hl-line { z-index:-1 }` и `isolation: isolate`
  у `code`). Проверил скриншотом раздела «Кто стучится» (`_qa/10-agentic-commerce-rev/sec-07.png`):
  подсвеченные строки `Signature`/`Signature-Input` видны целиком. В главе менять нечего. Замечание
  про обрезку скриншотов разделов на 3000px касается `tools/qa.mjs`, не главы.
- **review-reader, minor 3: объём выше 11 тыс.** Задание на правку разрешает до 12 тыс.; итог 11 998 по
  счётчику qa, который включает источники, самопроверку и чеклист.
- **review-completeness, major 6 (часть): Amex ACE, партнёрство Visa–OpenAI.** В заметках по Amex только
  заголовок на HN, по Visa–OpenAI — пересказ WebFetch без названного протокола и даты запуска. Писать
  нечего, кроме названий; по правилу «не проверено — не пишется» не добавлял.
- **review-completeness, major 1 (часть): новая sequence-диаграмма UCP.** В главе 16 рисунков — верхняя
  граница инструкции; механизм описан абзацем, а поле `payment.instruments[]` уже есть на рис. «подпись
  внутри подписи».
- **review-completeness, minor 11 (часть): Search Engine Land «llms.txt didn't boost AI traffic».**
  Статья не прочитана (403), есть только заголовок; методика неизвестна, выводить из заголовка нельзя.
- **review-completeness, minor 12 (часть): обзор Coindesk.** Доступен только в пересказе вендорского
  отчёта custena, то есть из третьих рук; в главе уже есть независимый противовес (TRM Labs) с
  оговоркой о вторичности, второй такой же слабый не усилит раздел.
- **review-completeness, major 4 (часть): `payment_intents`, `networkId`, Link Agent Wallet, страны SPT.**
  Детали конкретной интеграции Stripe, не механизм протокола; при лимите объёма уступают место
  обратимости и идемпотентности.
- **review-completeness, границы: PSD2/SCA и регулирование стейблкоинов.** Первоисточников в заметках
  нет, рецензент тоже не проверял; оставлено как вопрос для следующего прохода исследования.

## Проход 30 сентября 2026: фактические ошибки от приёмщика (цитата AP2 про Accountability)

- **Отклонено: «цитата Accountability не дословная».** Приёмщик сверял цитату с разделом Introduction
  («Accountability: If a fraudulent or incorrect transaction occurs, who is accountable—the user, …»).
  В том же `https://ap2-protocol.org/llms-full.txt` (проверено curl 30.09.2026) есть второй абзац,
  спецификация §1.2 «The Foundational Gap: A Crisis of Trust and Liability», и там дословно:
  «Accountability: In the event of a fraudulent or erroneous transaction, who is accountable? The user
  who delegated the task? …». Цитата в главе совпадает с ним символ в символ, включая вопросительный
  знак: в оригинале это отдельное предложение, дальше идут ещё вопросы. Текст главы говорит «в первой же
  главе» — это глава 1 спецификации, так что атрибуция тоже верна; field.md (S1, `overview.md`) хранит ту же
  формулировку. В главе ничего не менял.
- QA: `node tools/qa.mjs 10-agentic-commerce` — ISSUES none; 11 962 слова прозы, 16 рисунков.

## Проход 30 сентября 2026: сверка книги (protocols) и решение редактора

- **Принято с уточнением: «AGNTCY отдал в Linux Foundation один Cisco» против главы 7.** Сверил с
  пресс-релизом Linux Foundation от 29 июля 2025 (WebFetch 30.09.2026): проект «initially open sourced by
  Cisco in March 2025», а «Cisco, Dell Technologies, Google Cloud, Oracle, and Red Hat have joined as
  formative members». Прежняя фраза главы 10 не ложна (передавал Cisco), но без соучредителей читалась
  как противоречие главе 7. Предложенную сверщиком формулировку «пять компаний отдали» не взял: она
  неточнее релиза. Теперь в §обнаружения: Cisco открыл AGNTCY в марте 2025 года, 29 июля передал в LF,
  соучредители вместе с Cisco — Dell, Google Cloud, Oracle и Red Hat. Добавлен источник [50] — этот
  пресс-релиз. Главу 7 не трогал (не моя глава; её формулировка «пять компаний передали» — вопрос к её автору).
- **Решение редактора 1: дубль условия пересмотра.** Условие «если платформа начнёт завершать покупки
  внутри чата» стояло и в выборе ACP/UCP, и в конце очереди работ. Оставил первое: оно стоит рядом с
  самой рекомендацией про встроенную оплату и называет сигнал (`requires_escalation`). Из итогового
  абзаца очереди работ убрал последнее предложение — чекаута в этом списке и нет.
- QA: `node tools/qa.mjs 10-agentic-commerce` — ISSUES none. Рисунки не менялись.
