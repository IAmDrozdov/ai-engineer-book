# Глава 10: рецензия на полноту

Рецензент: критик полноты. Дата: 2026-09-30.
Что сверял: `index.html`, включая код и mermaid внутри `<script type="text/plain|x-mermaid">`, с охватом темы и с `gaps.md`, `spec.md`, `practice.md`, `field.md`. Дыры, которых нет в заметках, проверял по первоисточникам: GitHub API репозитория x402-foundation/x402, документация OpenAI Commerce и Stripe Docs. WebSearch в этой сессии был недоступен (исчерпан лимит), поэтому читал через WebFetch и `gh`.

## Общий вывод

Глава очень плотная и почти везде свежее заметок. Все противоречия C1–C20 из `gaps.md` в ней уже решены правильно: x402 V2 датирован 2025-12-11, у AP2 v0.2 два мандата, у ACP 11 статусов, 409 и 422 разведены, имя `dev.ucp.common.payment.ap2_mandate` новое, у Web Bot Auth указан WG-черновик, статья 26 AI Act опровергнута. **Критических ошибок я не нашёл.** Ничего не устарело относительно заметок. Сломанных примеров по охвату нет.

Дыры, по убыванию пользы:
- как деньги доходят в UCP;
- возвраты и обратимость агентных платежей;
- собственная идемпотентность x402;
- что такое Tempo и как MPP работает у Stripe;
- формат товарного фида ACP, хотя глава сама советует «начать с фида»;
- неполная картина «кто что выпустил»: Amex, Visa–OpenAI, сигналы TAP, L402.

Границы с соседними главами соблюдены (см. последний раздел).

Итог: critical 0, major 6, minor 6.

---

## Major

### 1. Нет пути денег в UCP: payment handlers, «треугольник доверия», complete с инструментом

- **Что не так.** В разделе «UCP: магазин как набор capability» поле `payment_handlers` описано одной фразой: «описывают, как получить платёжный инструмент». Пример ответа чекаута показывает `com.shopify.shop_pay`, но нигде не сказано, как платформа получает токен и куда кладёт его в `complete`. Диаграмма UCP (строка ~357 HTML) кончается на `complete → completed` без платёжной стороны. Путь денег расписан для ACP (delegate_payment, SPT) и для AP2 внутри UCP, а для обычного UCP-чекаута, основного сценария AI Mode и Gemini, его нет.
- **Что добавить.** Абзац и маленькую sequence-диаграмму в раздел «Чекаут по REST» или в новый подраздел «Как платит платформа в UCP»:
  - жизненный цикл из трёх шагов: Negotiation (магазин объявляет handlers) → Acquisition (платформа получает токен у Credential Provider или PSP) → Completion (токен уходит в `complete`, магазин списывает через своего PSP);
  - «Trust Triangle»: у Business и PSP уже есть договор; Platform и PSP связаны токенизацией; Platform передаёт Business только токен или мандат;
  - правило: credentials идут только от Platform к Business, и Business **НЕ ДОЛЖЕН** возвращать их обратно;
  - магазин остаётся Merchant of Record и не обязан проходить PCI DSS;
  - сохранённые инструменты возвращаются как display-safe ссылка (`id` + `display`), а раскрытие требует запроса со связанной идентичностью;
  - пример тела `complete` с `payment.instruments[*]` (путь уже упомянут в разделе про AP2).
- **Источник.** `spec.md` [S6] Core Concepts (Payment architecture, Trust Triangle, lifecycle), [S24] Checkout Capability. `practice.md` [S3].

### 2. Возвраты и обратимость: `exact` в x402 необратим, для отмены есть `auth-capture`

- **Что не так.** Глава перечисляет четыре схемы x402 и упоминает `auth-capture` v1.1 только по имени. При этом нигде не сказано, что `exact`, та самая схема из всех примеров главы, **не даёт вернуть деньги**. Слова «возврат» и «refund» в главе встречаются только в связи с ACP (чарджбэки на магазине). Для раздела про риски и ответственность это заметная дыра: «как вернуть агенту деньги за упавший вызов» — первый вопрос в продакшене.
- **Что добавить.** Таблицу в раздел «Схемы, порядок расчёта и двойное списание»:
  - операции `auth-capture`: `authorize`, `charge`, `capture` (повторяемая, до суммы удержания), `void`, `refund` (повторяемая, до захваченной суммы), `reclaim` (клиент сам забирает удержание после дедлайна, без facilitator);
  - дедлайны `extra.captureDeadline` и `extra.refundDeadline`;
  - по умолчанию в `auth-capture` используется поток `escrow`;
  - `capture`, `void` и `refund` не авторизованы клиентом, и binding обязан проверить согласие сервера;
  - дальше одна фраза про Stripe: платежи по MPP и x402 падают на баланс Stripe и выводятся в фиате, возвраты идут через Refunds API.
- **Что проверено.** Цитата из спецификации: «Where `exact` moves a fixed amount once and offers no way to give it back, `auth-capture` is for payments … which may later need to be undone». Сравнительная таблица там же: `exact` Reversible «No», `auth-capture` «Yes — void before capture, refund after, reclaim by the client».
- **Источник.** `x402-foundation/x402/specs/schemes/auth-capture/scheme_auth_capture.md` (прочитан через `gh api` 2026-09-30). Stripe Docs, «Machine payments», таблица Features: «Payments land directly in your Stripe balance and settle in fiat», «Refunds are available through the Refunds API» (https://docs.stripe.com/payments/machine.md, прочитано 2026-09-30). В заметках есть только упоминание схемы (`gaps.md` [G4][G8]).

### 3. Своя идемпотентность x402 (`payment-identifier`) и другие расширения V2

- **Что не так.** Сквозная тема главы — повтор и идемпотентность: AP2 #346, nonce у Laratok, `Idempotency-Key` в ACP, `SettlementCache`. При этом нет штатного механизма x402: расширения `payment-identifier`. Клиент кладёт в `PaymentPayload` `id` длиной 16–128 символов, и resource server и facilitator дедуплицируют по нему повторные отправки. Не упомянуты и другие расширения V2, которые связывают слои из первого рисунка главы:
  - `sign-in-with-x` (CAIP-122): вернувшийся плательщик входит кошельком и не платит повторно;
  - `http-message-signatures`: x402 несёт подпись Web Bot Auth с тегами `web-bot-auth` и `agent-browser-auth` и `registrationUrl`, то есть слой «кто стучится» едет прямо внутри x402;
  - `offer-and-receipt`, `bazaar`, gas sponsoring (`eip2612_gas_sponsoring`, `erc20_gas_sponsoring`), `builder_code`.
- **Что добавить.** Абзац и короткий список в раздел о x402, лучше рядом с SettlementCache. Одну строку в раздел «Кто стучится» о том, что x402 переносит подписи RFC 9421 своим расширением. В набросок «Что сделать за вечер» можно добавить проверку повтора с тем же `payment-identifier`.
- **Источник.** `gaps.md` Mechanics §1 «Identity extensions» [G7], TL;DR о «x402 V2 is richer…» [G4][G7]. Список файлов `specs/extensions/` и текст `payment_identifier.md` проверены через `gh api` 2026-09-30.

### 4. Tempo не объяснён, механика MPP у Stripe и сближение MPP с x402 пропущены

- **Что не так.** Tempo упоминается 9 раз («сеть Tempo», «USDC.e на Tempo»), но ни разу не сказано, что это такое, хотя «Stripe machine payments / Tempo» прямо входит в охват. Не описано, что делает сервер на стороне Stripe после `Authorization: Payment`. Вывод «x402 и MPP соперничают» не учитывает, что с 8 июня 2026 года SDK `mppx` поддерживает x402 exact: один клиент говорит на обоих протоколах.
- **Что добавить.**
  - Абзац в раздел «MPP: оплата как схема HTTP-аутентификации»:
    - Tempo — L1 для платежей в стейблкоинах, созданный Stripe вместе с Paradigm. Финальность около 0,6 с по заявлению разработчика, комиссии в стейблкоинах, mainnet с 18 марта 2026 года, 14 апреля Visa поставила туда валидатор;
    - поток у Stripe: 402 → повтор с credential → сервер вызывает `POST /v1/payment_intents`. `networkId` — это id профиля продавца (`profile_…`) из `GET /v2/network/business_profiles/me` с `Stripe-Version: 2026-07-29.preview`;
    - сессии MPP: списания меньше цента, расчёт от 0,01 USDC;
    - SPT выпускаются из Link Agent Wallet и доступны в США, Канаде и ~32 странах Европы.
  - Одно предложение в правило выбора x402/MPP про `mppx`.
- **Источник.** `spec.md` [S17] (Tempo). `gaps.md` Mechanics §2 [G33][G36], «What changed» (mppx x402 exact 2026-06-08, relays, identity) [G35], Visa Tempo validator [G30]. Stripe Docs «Machine payments» (Link Agent Wallet, SPT, сессии), прочитано 2026-09-30.

### 5. Глава советует «начни с ACP-фида», но не показывает, что в фиде

- **Что не так.** В разделе «UCP или ACP» и в очереди работ фид назван первым шагом для продаж через ChatGPT. Сам фид описан двумя предложениями про Feed API (`POST /feeds`, `PATCH …/products`). Сейчас OpenAI принимает в основном файловый фид, и у него свои обязательные поля и флаги видимости. Товарные фиды — отдельный пункт охвата. В заметках этого нет: `gaps.md` §11 п.2 говорит только «ACP Feed API or OpenAI file upload».
- **Что добавить.** Таблицу или короткий пример строки фида в раздел «Что магазин отдаёт в ChatGPT сейчас»:
  - 9 обязательных полей: `item_id`, `title`, `description`, `url`, `brand`, `seller_name`, `image_url`, `availability`, `price`;
  - флаги `is_eligible_search` и `is_eligible_checkout`. Второй требует первого и отдельного онбординга: «Setting an eligibility flag does not complete checkout onboarding»;
  - доставка: «Push feeds to OpenAI via SFTP», предпочтительно parquet с zstd, поддерживаются также `jsonl.gz`, `csv.gz`, `tsv.gz`;
  - полный снимок не реже раза в день, шард до 500k товаров и ~500MB, стабильное имя файла;
  - одно предложение о разнице между файловым фидом и Feed API из ACP 2026-04-17.
- **Источник.** OpenAI Developers, Product Feed spec, https://developers.openai.com/commerce/specs/feed, и File upload overview, https://developers.openai.com/commerce/specs/file-upload/overview (WebFetch 2026-09-30). В заметках нет.

### 6. «Кто что выпустил» неполно: Amex ACE, Visa–OpenAI, сигналы TAP, Walmart, L402

- **Что не так.** Во второй таблице раздела «Сводная таблица и выбор» и в разделе про KYA нет того, что есть в заметках:
  - **Amex ACE Developer Kit** (2026-04-14) — в главе ноль упоминаний American Express. Название защиты расходится: «Registered Agent Protection» по заголовку на HN и «Agent Purchase Protection» у custena;
  - **партнёрство Visa и OpenAI** (2026-06-10: токенизированные данные и лимиты расходов). Это прямая связь с `agentic_token` в ACP, которую глава упоминает;
  - **три класса сигналов TAP**: Agent Intent, Consumer Recognition, Payment Information. Сюда же то, что TAP передаёт магазину PAR, номера лояльности, email и телефон «via query parameters». Для приватности и для разбора запросов на краю это важно;
  - **приложение Walmart внутри ChatGPT** как другой путь оплаты после 24 марта;
  - Mastercard Agent Pay: заявленные рынки APAC, LatAm и пилот с Santander, с пометкой «вторичный источник».
- **Что добавить.** 3–4 строки в таблицу «где работает» с колонкой-оговоркой. В абзац о Visa TAP одно предложение о сигналах и query-параметрах.
- **Источник.** `gaps.md` [G14] (TAP, query parameters), [G28] (Walmart), [G30][G32] (Visa), [G52] (Amex, только заголовок), раздел Unverified. `practice.md` [S22] (сигналы TAP), [S18] (Mastercard, Amex; вторичный).

---

## Minor

### 7. L402 выпал из пары «оплата HTTP-вызова»

- **Что не так.** Глава утверждает, что прямая конкуренция есть «только в двух парах», одна из них x402/MPP. Но L402 (раньше LSAT, Lightning Labs) работает с 2020 года, а 11 февраля 2026 года вышел набор Lightning Agent Tools. На HN его называли prior art «in production use for half a decade». Сейчас в главе Lightning упомянут только как binding `exact` у x402.
- **Что добавить.** Одну строку в сводную таблицу или сноску в раздел «Оплата внутри HTTP-запроса».
- **Источник.** `practice.md` [S18] (таблица версий, Timeline 2026-02-11). `field.md` [S11] (комментарий `thinkmassive`).

### 8. Order capability в UCP описана одной фразой

- **Что не так.** Управление заказами входит в охват, но сказано только «GET /orders/{id}, лучше вебхуки».
- **Что добавить.** Абзац в конец раздела «Чекаут по REST»:
  - fulfillment *expectations* отдельно от append-only журнала *events*;
  - *adjustments*: возвраты, returns, споры, лучше append-only;
  - вебхуки с заголовками Standard Webhooks (`Webhook-Id`, `Webhook-Timestamp`), но подписанные по RFC 9421;
  - `config.webhook_url` в профиле платформы.

  Это связывает тему ответственности (доказательства для спора) с конкретными полями.
- **Источник.** `gaps.md` Mechanics §7 «Orders» [G24].

### 9. В ACP тоже есть переговоры о возможностях и payment handlers, а в тексте это не видно

- **Что не так.** Раздел «Переговоры о возможностях» и таблица «UCP или ACP» создают впечатление, что пересечение возможностей — особенность UCP. На самом деле:
  - в ACP с 2026-01-30 есть Capability Negotiation: агент объявляет `interventions.supported: ["3ds", …]`, `display_context`, `max_redirects`, магазин возвращает пересечение;
  - есть Payment Handlers с флагом `requires_delegate_payment`, и `delegate_payment` там назван «recommended default»;
  - есть вебхуки `order_created`/`order_updated` (статусы `manual_review`, `confirmed`, `canceled`, `shipped`, `fulfilled`), подписанные HMAC. В диаграмме ACP вебхук нарисован, а в тексте не объяснён;
  - был ломающий релиз 2025-12-12: `fulfillment_address` → `fulfillment_details`.
- **Что добавить.** Строку «Переговоры» в таблицу UCP/ACP и 2–3 предложения в раздел «Чекаут и делегированный платёж».
- **Источник.** `spec.md` [S5] (changelog 2026-01-30, 2025-12-12), [S4] (webhooks). `field.md` [S6] (Payment Handlers RFC).

### 10. AP2: пропущены #358, защита PCAT из препринта и второй способ делегирования

- **Что не так.** Список задач лета (#268, #339, #346, #361, #362) не включает #358: `CheckoutMandateChain.verify` не проверяет привязку закрытого мандата. Это ложится прямо в «пять правил» проверяющего кода. Из препринта Лоука глава берёт атаки, но не называет предложенную защиту PCAT: по автору, она сводит структурный ASR к 0 для 4 из 5 классов. В разделе о связи с A2A и MCP упомянут только способ делегирования через OpenID4VP. Второй способ из Agent Authorization Framework, Trusted Agent Provider (провайдер агента сам доверенная сторона), не назван.
- **Что добавить.** Одно предложение в «Ещё две задачи того же лета», одно в раздел о препринте, одно в раздел «Где AP2 стоит…».
- **Источник.** `gaps.md` Pitfalls [G12], Numbers [G38]. `spec.md` [S20].

### 11. llms.txt: нет встречных данных и нет инструмента проверки

- **Что не так.** В очереди работ llms.txt v2 стоит **первым** («дёшево, и этим уже пользуются кодовые агенты»). В заметках есть встречный сигнал: Search Engine Land, 2026-01-20, «Llms.txt didn't boost AI traffic for 10 sites; growth was coincidental». Сама статья не прочитана, только заголовок. Есть и практический инструмент: аудит Lighthouse «agentic browsing» проверяет llms.txt и ставит N/A, если файла нет.
- **Что добавить.** Одно предложение с оговоркой «вывод по заголовку, методика не прочитана». Одно предложение о проверке через Lighthouse в «Что сделать за вечер» или рядом с Link-заголовком.
- **Источник.** `field.md` [S23] (Unverified). `gaps.md` §9 [G47].

### 12. Объёмы x402 и предшественники Monetization Gateway

- **Что не так.** Независимый противовес цифре вендора в главе один: TRM Labs, причём из вторых рук. В заметках есть второй: обзор Coindesk от 11 марта 2026 года. Там падающее число транзакций в неделю, средний платёж около $0,20 и заметная доля тестового трафика, тоже через вторичный пересказ custena. Нет и предыстории у Cloudflare: pay per crawl (1 июля 2025) и `paidTool` с `withX402Client` для MCP-серверов в Agents SDK. Для читателя, который пишет MCP-серверы на Workers, это ближайший путь.
- **Что добавить.** Одно предложение в «Кто платит на самом деле» и одно в абзац о Monetization Gateway.
- **Источник.** `practice.md` Numbers и Pitfalls [S18], [S12] (paidTool), [S13] (pay per crawl).

---

## Границы с соседними главами

- A2A (гл. 7), MCP (гл. 5), OAuth (гл. 15) и инъекции (гл. 16) даны короткими абзацами со ссылками. Identity linking в UCP укладывается в один абзац (PKCE, RFC 8693/7523), это в меру.
- На пределе раздел «Инъекции, мошенничество, ответственность» с графиком восьми моделей из препринта Лоука: сравнение моделей ближе к главе 16. Но эксперимент специфичен для агентной коммерции (отравленная карточка в маркетплейсе), и в главе есть ссылка на гл. 16. Сокращать не обязательно. Если нужно место, график можно заменить одной фразой с диапазоном 0–100%.
- Чего нет в охвате главы: регулирование платежей (PSD2/SCA при автономных покупках, регулирование стейблкоинов). В заметках первоисточников нет, а проверить в вебе не удалось (WebSearch недоступен), поэтому в находки это не вынесено. Стоит отметить как открытый вопрос для следующего прохода исследования.
