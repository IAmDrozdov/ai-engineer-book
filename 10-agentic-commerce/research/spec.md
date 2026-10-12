# Глава 10. AP2, UCP и интернет агентов — спецификационные заметки (PRIMARY SOURCES lens)

## TL;DR (что нужно знать инженеру сегодня, 2026-09-30)

- Ландшафт протоколов агентной коммерции в 2026 году устоялся вокруг **трёх столпов**: AP2 (Google, доверие/mandates), ACP (OpenAI+Stripe, чекаут в ChatGPT) и UCP (Google+Shopify+ритейлеры, универсальный слой обнаружения/чекаута). AP2 явно спроектирован как «слой доверия» **внутри** UCP и совместим с A2A/MCP [S1][S6].
- **AP2 v0.2** (текущая версия на ap2-protocol.org, апрель 2026) — это заметный редизайн относительно версии AP2 2025 года: роли переформулированы в пятёрку **Shopping Agent (SA), Credential Provider (CP), Merchant (M), Merchant Payment Processor (MPP), Trusted Surface (TS)** (+ упоминание Network/Issuer в Executive Summary), а мандаты — **Checkout Mandate** и **Payment Mandate** (ранее в публичных пересказах фигурировали «Intent/Cart/Payment Mandate» — в текущем тексте спецификации таких терминов уже нет, они заменены двухмандатной моделью) [S1][S2][S3].
- Мандаты — это **SD-JWT verifiable credentials** с полем `vct` (`mandate.checkout.1`, `mandate.payment.1`, и их `.open.1` варианты). Есть строгая модель версионирования схемы через суффикс в `vct` [S1].
- **ACP** живёт по **дата-версионированной** спецификации (`YYYY-MM-DD`), сейчас `2026-04-17`, с OpenAPI + JSON Schema в репозитории и статусом `beta`. Checkout — 5 состояний, есть Delegate Payment API для shared payment tokens [S4][S5].
- **UCP** переехал на собственный домен ucp.dev с полноценным Governing Council/Tech Council/вертикальными Technical Councils (Payments TC создан 2 сентября 2026; Lodging TC — 11 августа 2026; Food TC — 16 июля 2026). Текущий стабильный релиз — **v2026-08-25**, до этого v2026-04-08, v2026-01-23, v2026-01-11 [S6][S7].
- UCP расширяется **за пределы retail**: Lodging (черновая спецификация выпущена 25 сентября 2026), Food «скоро» [S7].
- **x402** (HTTP 402 платежи) в 2026 году получил формальное управление: **x402 Foundation запущен Linux Foundation 14 июля 2026**, 40+ организаций-членов, включая Visa, Mastercard, Stripe, Google, AWS, Amex, Circle, Cloudflare, Coinbase [S9]. Протокол выпустил **x402 V2** 24 июня 2026 — новые заголовки `PAYMENT-SIGNATURE`/`PAYMENT-RESPONSE` вместо старых `X-*` [S10][S11].
- **Visa Trusted Agent Protocol** — часть Visa Intelligent Commerce, использует криптографические подписи (merchant/purpose-specific, time-bound, non-replayable), чтобы мерчанты отличали доверенных AI-агентов от ботов [S12].
- **Mastercard Agent Pay** и «Mastercard Verifiable Intent» существуют как продукты сети (аналог AP2/TAP), но официальный developer-портал рендерится через JS и не отдаёт контент простому fetch — детали механики частично неподтверждены, см. Unverified [S13][S14].
- **Web Bot Auth** — реализация черновика IETF `draft-meunier-webbotauth-httpsig-protocol` (v00) поверх **RFC 9421** (HTTP Message Signatures) и RFC 7638; ключи публикуются в «bot directory» по `/.well-known/http-message-signatures-directory`; поддерживается Cloudflare Research [S15].
- **UCP использует ровно этот же RFC 9421** как единственный «permissionless»-механизм аутентификации между бизнесом и платформой, публикуя ключи в `/.well-known/ucp` — то есть Web Bot Auth и UCP auth конвергируют на одном стандарте [S6].
- **Know-Your-Agent (KYA)** — открытый стандарт **KYA-OS** от компании Vouched, донирован в Decentralized Identity Foundation (DIF); выдаёт verifiable credentials, привязанные к человеческой авторизации агента, конкурирует по духу с TAP/Web Bot Auth, но фокусируется на detection+identity, а не на платежах [S16].
- **Stripe Tempo** — L1-блокчейн для stablecoin-расчётов, инкубированный Stripe и Paradigm, с финализацией блоков ~0.6 c, встроенным DEX для стейблкоинов и явной целью «дешёвые мгновенные платежи для автономных агентов» [S17].
- Discovery в UCP — не через DNS/agent cards, а через **`/.well-known/ucp`** JSON-манифест с `capabilities`, `services`, `payment_handlers`, `keys` (JWK Set) — один документ решает и discovery, и auth [S6].
- Для разработчика: чтобы «продать» магазин агентам сегодня без vendor lock-in, разумный путь — опубликовать `/.well-known/ucp` (REST-транспорт обязателен, MCP/A2A опционально), поддержать `dev.ucp.shopping.checkout`, и по желанию расширение `dev.ucp.common.payment.ap2_mandate` для автономных (human-not-present) сценариев [S6][S7][S1].

## Current state and versions (as of 2026-09-30)

| Протокол | Текущая версия/статус | Источник, дата |
|---|---|---|
| AP2 | Спецификация v0.2 (docs на ap2-protocol.org), `sitemap.xml lastmod 2026-04-28`; репозиторий `google-agentic-commerce/AP2` активно поддерживается, сэмплы уже используют **Gemini 3.1 Flash Lite Preview** | [S1][S2] |
| ACP | Дата-версия `2026-04-17` (stable), `unreleased/` — текущая разработка; статус репозитория — **Beta**, maintained OpenAI & Stripe | [S4] |
| UCP | Протокольный релиз **v2026-08-25** (stable), ветки `2026-04-08`, `2026-01-23`, `2026-01-11` всё ещё поддерживаются | [S6][S7] |
| x402 | **V2** (24 июня 2026), governance — x402 Foundation (Linux Foundation, операционный запуск 14 июля 2026) | [S9][S10] |
| Web Bot Auth | IETF draft `draft-meunier-webbotauth-httpsig-protocol-00`, research-stage, без security audit | [S15] |
| Visa TAP | «В процессе разработки и развёртывания» (без точной даты GA на publicly readable странице) | [S12] |
| KYA-OS | Донирован в DIF, продукт Agent Checkpoint отмечен Cybersecurity Excellence Awards 2026 | [S16] |
| Tempo | Активен, клиенты включают Stripe, Shopify, Brex | [S17] |

## Timeline (датированный список)

- **2025-09-29** — ACP: первый релиз спецификации (Agentic Checkout + Delegate Payment) [S5].
- **2025** (осень, точная дата не проверена) — Google публикует AP2 (первая версия, до текущего v0.2) — совместно с A2A видео представлением "Intro to AP2" [S2].
- **2025-12-12** — ACP: breaking change, `fulfillment_address` → `fulfillment_details` (по опыту адаптеров URBN и Etsy) [S5].
- **2026-01-11** — UCP объявлен Google, Shopify и 25+ партнёрами (Walmart, Target, Visa, Mastercard и др.) — по независимому подтверждению из HN Show-поста; официальный `Announcements` UCP этот релиз фиксирует как **v2026-01-11** [S7][S18].
- **2026-01-16** — ACP: `AuthenticationProvider` (открытая модель 3DS-провайдера), `merchant_id` обязателен в `PaymentProvider`, добавлен `adyen` [S5].
- **2026-01-23** — UCP: протокольный релиз v2026-01-23 [S7].
- **2026-01-30** — ACP: Capability Negotiation, Payment Handlers, Extensions, Discount extension [S5].
- **2026-04-08** — UCP: протокольный релиз v2026-04-08 [S7].
- **2026-04-17** — ACP: релиз, объединяющий Cart/Feed/Orders/Authentication/MCP; текущая stable-версия [S5].
- **2026-04-24** — UCP: расширение Tech Council до 16 мест (Amazon, Meta, Microsoft, Stripe, Salesforce) [S7].
- **2026-04-28** — AP2 docs: `lastmod` спецификации (v0.2) [S1].
- **2026-06-24** — **x402 V2** запущен (новые заголовки, дедупликация X-* хедеров) [S10].
- **2026-06-10** (approx, по дате статьи AP) — Visa объявляет интеграцию платёжной сети с ChatGPT/OpenAI для шоппинга агентами [S19].
- **2026-07-14** — **x402 Foundation** операционно запущен под эгидой Linux Foundation, 40 организаций-членов [S9].
- **2026-07-16** — UCP: Food Technical Council сформирован (Block/Square, DoorDash, Google, Toast, Uber Eats) [S7].
- **2026-08-11** — UCP: Lodging Technical Council сформирован (Amadeus, Booking.com, Expedia, Google, Hilton, Marriott, Trip.com) [S7].
- **2026-08-25** — **UCP протокольный релиз v2026-08-25** — «крупные улучшения», 3DS2, structured request constraints, независимое версионирование capability, grocery-readiness [S7].
- **2026-09-02** — UCP: Payments Technical Council сформирован (Adyen, Ant International, Coinbase, Global Payments, Google, PayPal, Shopify, Stripe) [S7].
- **2026-09-25** — UCP: Lodging Booking capability draft merged (`dev.ucp.lodging.booking`) [S7].

## Mechanics

### AP2: роли, мандаты, режимы

**Пять ролей** (из `ap2/specification`) [S1]:
- **Shopping Agent (SA)** — продуктовый поиск, сборка чекаута, исполнение покупки. Обязательно agentic (LLM-driven).
- **Credential Provider (CP)** — источник платёжных credential'ов, проверяет право агента на их использование.
- **Merchant (M)** — владеет каталогом, ценами, скидками, подтверждает Checkout.
- **Merchant Payment Processor (MPP)** — обрабатывает платежи, проверяет, что Payment Credential авторизован именно для данного Checkout.
- **Trusted Surface (TS)** — **обязательно non-agentic** UI-поверхность, единственное место, где пользователь даёт информированное согласие и подписывает мандат.

Правило деления: роль **agentic**, если коммуникация обрабатывается недетерминированной LLM; **non-agentic**, если детерминированным кодом. TS **обязана** быть non-agentic; SA **обязана** быть agentic (по умолчанию) [S1].

**Мандаты** (COMPOSED пересказ схемы, поля — VERBATIM из таблиц спецификации) [S2][S3]:

Checkout Mandate (закрытый, `vct: mandate.checkout.1`):
| Поле | Тип | Обязательно | Selectively Disclosable |
|---|---|---|---|
| vct | string | да | нет |
| checkout_jwt | string | да | да |
| checkout_hash | string | да | нет |
| iat | integer | нет | нет |
| exp | integer | нет | нет |

`checkout_jwt` — merchant-signed JWT; **если используется вместе с UCP, это ОБЯЗАН быть UCP Checkout object** [S2].

Payment Mandate (закрытый, `vct: mandate.payment.1`) — ключевые поля: `transaction_id` (hash checkout_jwt), `payee` (Merchant), `pisp` (опционально), `payment_amount` (валюта ISO 4217 + minor units, например `27999` = $279.99), `payment_instrument`, `execution_date`, `risk_data` [S3].

**Constraint-типы** для open-мандатов (используются в autonomous-режиме): `checkout.allowed_merchants`, `checkout.line_items`, и для Payment: `payment.agent_recurrence` (частоты `ON_DEMAND, DAILY, WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY, ANNUALLY` + `max_occurrences`), `payment.allowed_payees`, allowed payment instrument/PISP, amount range, budget, reference, execution date [S2][S3].

**Два режима**:
- **Human Present (Direct)** — пользователь видит и одобряет закрытый Checkout и оплату напрямую на TS.
- **Human Not Present (Autonomous)** — пользователь одобряет **открытый (open)** мандат с constraints (например, «купи кроссовки, если цена упадёт ниже $100»); SA сам закрывает мандат своим Agent Key, когда условия выполнены. Открытый мандат **обязан** нести `cnf` (JWK агента) как proof-of-possession. Правило: SA **не должен** предъявлять следующий open-мандат, не получив receipt отказа по предыдущему (защита от double-spend согласия) [S2].

**VERBATIM пример (open Checkout Mandate SD-JWT, source S2)**:
```json
{
  "vct": "mandate.checkout.open.1",
  "constraints": [
    {
      "type": "checkout.line_items",
      "items": [
        {
          "id": "line_1",
          "acceptable_items": [ { "...": "y3aocAD2rhYpJQOUMN016faDFGkTBGEDVl1R1TRHdbw" } ],
          "quantity": 1
        }
      ]
    },
    {
      "type": "checkout.allowed_merchants",
      "allowed": [ { "...": "a5UMAdxCk_MRayyVdRhpIAZ0ZhjVLEq1g2BWyruKUwg" } ]
    }
  ],
  "cnf": { "jwk": { "crv": "P-256", "kty": "EC", "x": "...", "y": "..." } },
  "iat": 1777342357,
  "exp": 1777345957
}
```
(Это раскрытый payload из SD-JWT disclosure; полный encoded token — компактный SD-JWT с `~`-разделёнными disclosures — см. источник.) [S2]

**Agent Authorization Framework** — обобщённая модель поверх которой построен AP2 (используется и вне платежей). Два шага: **Mandate Delegation** (пользователь → мандат агенту) и **Action Authorization** (Verifier проверяет мандат, возвращает Receipt). Два способа делегирования: **User Credential** (через внешнего Issuer, holder = Trusted Surface, презентуется через **OpenID4VP** с `transaction_data.type = "delegate"`) или **Trusted Agent Provider** (провайдер агента сам является доверенной стороной) [S20].

VERBATIM пример OpenID4VP Authorization Request с `transaction_data` для делегирования (source S20, non-normative, base64 truncated):
```json
{
  "requests": [{
    "protocol": "openid4vp-v1-unsigned",
    "data": {
      "response_type": "vp_token",
      "response_mode": "dc_api",
      "nonce": "b5d4e074-dff5-4cd5-a506-f09dd6f2e33a",
      "dcql_query": { "credentials": [{ "id": "dpc_credential", "format": "dc+sd-jwt",
        "meta": { "vct_values": ["com.emvco.dpc"] },
        "claims": [ { "path": ["card_last_four"] }, { "path": ["card_network_code"] }, { "path": ["credential_id"] } ] }] },
      "transaction_data": [
        "eyJ0eXBlIjoicGF5bWVudF9jYXJkIiwiY3JlZ...<truncated>",
        "eyJ0eXBlIjoiZGVsZWdhdGUiLCJmb3JtYXQiO...<truncated>"
      ],
      "client_metadata": { "client_id_scheme": "x509_san_dns",
        "vp_formats": { "dc+sd-jwt": { "sd-jwt_alg_values": ["ES256"], "kb-jwt_alg_values": ["ES256"] } } }
    }
  }]
}
```

### ACP: Checkout Session lifecycle и Delegate Payment

**Checkout Session states**: `not_ready_for_payment` → `ready_for_payment` → `completed` | `canceled` [S4].

**Endpoints** (все под Bearer auth, HTTPS, JSON; заголовки `Idempotency-Key`, `Request-Id`, `Signature` (base64 HMAC тела), `Timestamp` (RFC 3339), `API-Version`) [S4]:
- `POST /checkout_sessions` — создать (201).
- `POST /checkout_sessions/{id}` — обновить.
- `POST /checkout_sessions/{id}/complete` — финализировать с платёжными данными.
- `POST /checkout_sessions/{id}/cancel` (405 если уже завершена/отменена).
- `GET /checkout_sessions/{id}` (404 если не найдена).

VERBATIM фрагмент OpenAPI (`spec/2026-04-17/openapi/openapi.agentic_checkout.yaml`, source S21):
```yaml
openapi: 3.1.0
info:
  title: Agentic Checkout API
  version: "2026-04-17"
paths:
  /checkout_sessions:
    post:
      operationId: createCheckoutSession
      description: |
        Initializes a new checkout session from items and (optionally) buyer and fulfillment info.
        MUST return 201 with a rich, authoritative cart state.
        Agents MAY include `affiliate_attribution` with `touchpoint: "first"` to record first-touch attribution.
      requestBody:
        content:
          application/json:
            examples:
              minimal:
                value:
                  items:
                    - id: item_123
                      quantity: 1
              with_first_touch_attribution:
                value:
                  items:
                    - id: item_123
                      quantity: 1
                  affiliate_attribution:
                    provider: impact.com
                    token: atp_01J8Z3WXYZ9ABC
                    publisher_id: pub_123
                    touchpoint: first
```

**Capability Negotiation** (добавлено 2026-01-30) — агент декларирует поддерживаемые фичи (`interventions.supported: ["3ds","address_verification"]`, `display_context`, `max_redirects`), продавец возвращает **пересечение** [S5].

**Delegate Payment** (`POST /agentic_commerce/delegate_payment`, направление OpenAI → PSP) [S22]:
- Request: `payment_method` (пока только `CARD`: номер, expiry, cryptogram, network token), `allowance` (`max_amount`, `currency`, `expires_at`, `checkout_session_id`, `reason: "one_time"`, `merchant_id`), `risk_signals[]`, `metadata`, опционально `billing_address`.
- Response 201: `id` (vault token, префикс `vt_`), `created` (RFC 3339), `metadata`.
- **Stripe Shared Payment Token** — первая совместимая реализация; «more PSPs coming soon» (на момент чтения источника другие PSP явно не названы) [S22].
- Модель ответственности: OpenAI **не** является merchant of record; расчёты/возвраты/чарджбэки — на мерчанте и его PSP [S22].

**Webhook события**: `order_created`, `order_updated` (статусы `manual_review, confirmed, canceled, shipped, fulfilled`), HMAC-подписаны мерчант-специфичным ключом от OpenAI [S4].

### UCP: capabilities, discovery, платежи

**Роли** (4 актора): **Platform** (потребляет capabilities — агент/приложение), **Business** (обычно Merchant of Record), **Credential Provider (CP)** (кошельки/identity providers, токенизация), **Payment Service Provider (PSP)** (авторизация/settlement) [S6].

**Discovery**: бизнес публикует манифест на `/.well-known/ucp`; платформа объявляет **свой** профиль per-request через заголовок `UCP-Agent`:
```text
POST /checkout-sessions HTTP/1.1
UCP-Agent: profile="https://agent.example/profiles/shopping-agent.json"
```
Это даёт **permissionless onboarding** — любая платформа с обнаруживаемым профилем может взаимодействовать без предварительной регистрации [S6].

**Capability negotiation** — server-selects: (1) пересечение имён, (2) выбор макс. общей версии, (3) удаление extensions-«сирот» (чьи родители не попали в пересечение) [S6].

**Namespace governance**: reverse-domain (`dev.ucp.shopping.checkout` управляется UCP Tech Council; `org.acme.loyalty` — сам acme.com). `schema` URL **обязан** происходить с домена-владельца namespace — Platforms **MUST** это проверять и **MUST** отвергать несоответствие [S6].

VERBATIM пример профиля бизнеса (source S6):
```json
{
  "ucp": {
    "version": "draft",
    "services": { "dev.ucp.shopping": [{ "version": "draft", "transport": "rest",
      "schema": "https://ucp.dev/draft/services/shopping/rest.openapi.json",
      "endpoint": "https://business.example.com/ucp/v1" }] },
    "capabilities": {
      "dev.ucp.shopping.checkout": [{ "version": "draft",
        "schema": "https://ucp.dev/draft/schemas/shopping/checkout.json" }],
      "dev.ucp.shopping.fulfillment": [{ "version": "draft",
        "schema": "https://ucp.dev/draft/schemas/shopping/fulfillment.json",
        "extends": "dev.ucp.shopping.checkout" }]
    },
    "payment_handlers": { "com.example.processor_tokenizer": [{ "id": "processor_tokenizer", "version": "draft" }] }
  },
  "keys": [{ "kid": "key_2026", "kty": "EC", "crv": "P-256", "x": "...", "y": "...", "alg": "ES256" }]
}
```
Ключевой момент: **один документ отвечает и за discovery, и за аутентификацию** (JWK Set внутри профиля переиспользуется для Web Bot Auth-совместимой проверки подписи) [S6].

**Транспорты для сервиса** — Business выбирает любые из: **REST** (OpenAPI 3.1.0), **MCP** (OpenRPC), **A2A** (Agent Card), **Embedded** (OpenRPC) [S6].

**Authentication mechanisms**: HTTP Message Signatures (RFC 9421, permissionless), OAuth 2.0, API Keys, mTLS. Только RFC 9421 не требует pre-established доверия — ключ достаётся из профиля [S6].

**Payment architecture — «Trust Triangle»**: Business↔CP/PSP (существующий контракт), Platform↔CP/PSP (токенизация, платформа не владеет деньгами), Platform↔Business (передача токена/мандата). **Кредentials идут только Platform → Business, Business НЕ ДОЛЖЕН возвращать их обратно** [S6].

**Платёжный жизненный цикл** (3 шага): Negotiation (business анонсирует handlers) → Acquisition (platform получает токен от CP) → Completion (platform передаёт токен business, тот заряжает через свой PSP) [S6].

**UCP + AP2 интеграция** (`dev.ucp.common.payment.ap2_mandate` extension) — пошагово (source S23):
1. Business публикует discovery-документ с поддержкой AP2 extension.
2. Platform сигнализирует активацию AP2 при создании/обновлении checkout session.
3. Business отвечает `checkoutSignature` (detached JWT, подписывающий состояние checkout) + список поддерживаемых форматов verifiable presentation (`sd-jwt`).
4. После согласия пользователя Platform генерирует **CheckoutMandate** (хеш CheckoutObject) и **PaymentMandate** (SD-JWT-VC).
5. Platform отправляет оба мандата на `/complete` эндпоинт бизнеса.
6. Business проверяет CheckoutMandate; Payment Processor — PaymentMandate.
7. При успехе — платёж проведён, заказ подтверждён.

**Checkout capability** — детали: Business остаётся Merchant of Record и **не обязан** быть PCI DSS compliant. `payment` объект опционален на создании (для quote generation без оплаты). Сохранённые payment instruments возвращаются как **display-safe reference** (opaque `id` + `display`), без сырых credential — раскрытие требует identity-linked (OAuth) запроса [S24].

Пример UCP каталог-ответа (VERBATIM, source S6):
```json
{
  "ucp": { ... },
  "products": [
    {
      "id": "prod_abc123",
      "handle": "blue-runner-pro",
      "title": "Blue Runner Pro",
      "categories": [
        { "value": "187", "taxonomy": "google_product_category" },
        { "value": "aa-8-1", "taxonomy": "shopify" }
      ],
      "price_range": { "min": { "amount": 12000, "currency": "USD" }, "max": { "amount": 12000, "currency": "USD" } }
    }
  ]
}
```

### x402: HTTP 402 платежи

**Роли**: `resource` (любой HTTP-ресурс), `client`, `facilitator` (верифицирует/исполняет платёж по сети), `resource server` [S8].

**Классический flow (V1-стиль, все еще базовая механика)** [S8]:
1. Client → GET ресурс.
2. Server → `402 Payment Required` + объект `PaymentRequirements` (в V1 — заголовок `PAYMENT-REQUIRED`? в актуальном V2-документе заголовки переименованы, см. ниже).
3. Client выбирает `scheme`/`network`, строит `PaymentPayload`.
4. Client повторяет запрос с платёжным заголовком.
5. Server верифицирует локально или через `facilitator /verify`.
6. Facilitator возвращает `Verification Response`.
7. При успехе — сервер выполняет работу; иначе снова `402`.
8. Server расчитывается через blockchain напрямую или через `facilitator /settle`.
9. Facilitator отправляет транзакцию в блокчейн, ждёт подтверждения, возвращает `Payment Execution Response`.
10. Server отвечает `200 OK` + заголовок с `Settlement Response` (base64 JSON).

**Заголовки в x402 V2** (актуальные, VERBATIM формулировки, source S25):
- `PAYMENT-SIGNATURE` — base64-encoded payment payload от клиента (при повторе запроса после 402).
- `PAYMENT-RESPONSE` — base64-encoded settlement response от сервера (подтверждение оплаты).
- V2 «удаляет устаревшие X-* заголовки для улучшенной совместимости»; заявлен грядущий `SIGN-IN-WITH-X` [S26].

**Принципы протокола**: open standard, HTTP/transport-native, network/token/currency-agnostic (крипто и фиат), backwards-compatible, **trust-minimizing** (ни facilitator, ни resource server не могут двигать средства кроме как по намерению клиента), «easy to use» (абстрагирует gas/RPC от клиента и сервера в facilitator) [S8].

**Governance**: репозиторий переехал из `coinbase/x402` (dev fork) в `x402-foundation/x402`. Фонд запущен Linux Foundation **14 июля 2026**, Premier Members: Adyen, AWS, American Express, Circle, Cloudflare, Coinbase, Fiserv, Google, Mastercard, Monad Foundation, MoonPay, Ripple, Shopify, Solana Foundation, Stellar Development Foundation, Stripe, Visa [S9].

### Visa Trusted Agent Protocol / Intelligent Commerce

Часть Visa Intelligent Commerce. Технически — **криптографические подписи**, которые являются merchant-and-purpose-specific, time-bound, non-replayable и non-relayable; агенты генерируют подписи согласно «Client Implementation Guide», мерчанты верифицируют по «Trusted Agent Protocol specification» [S12]. Мерчант может получить три класса сигналов: **Agent Intent** (агент подтверждён Visa как коммерчески легитимный), **Consumer Recognition** (loyalty tokens, device id, location, wallet address), **Payment Information** (key entry / API-processing / IOU management) [S12]. Точные форматы HTTP-заголовков и алгоритмы подписи не раскрыты на публично читаемой странице — см. Unverified.

### Web Bot Auth

Реализация IETF-черновика **`draft-meunier-webbotauth-httpsig-protocol-00`**, построенного поверх **RFC 9421** (HTTP Message Signatures) и RFC 7638 (JWK Thumbprint). Header — `Signature` (RFC 9421-style). Discovery ключей — через **«bot directories»**, публикуемые по стандартному well-known пути **`/.well-known/http-message-signatures-directory`**. Поддерживается Cloudflare Research, есть тестовый деплой, TS и Rust реализации, «research-stage software без security audit» [S15]. Совпадение с UCP: UCP тоже строит permissionless-auth на RFC 9421 и хранит JWK Set в своём собственном well-known манифесте, то есть де-факто это тот же криптографический примитив, применённый в двух разных well-known-схемах.

### Know-Your-Agent (KYA)

От компании **Vouched**: «agent-era counterpart к Know Your Customer» — верификация identity, authority и accountability AI-агентов, действующих на сайте/API. Подход — **behavioral detection** (не заявленная идентичность, а поведенческий анализ действий в реальном времени) + confidence score + выдача verifiable credential, привязанного к человеческой авторизации. Открытый стандарт **KYA-OS** донирован в **Decentralized Identity Foundation (DIF)** для обеспечения интероперабельности. Продукт — **Agent Checkpoint** [S16].

### Stripe Tempo

Payments-first **Layer 1 блокчейн**, инкубированный Stripe и Paradigm, спроектирован специально под расчёты в стейблкоинах (не общего назначения и не trading-focused, в отличие от существующих L1). Финализация блоков **~0.6 секунды без реоргов**, stablecoin-native gas fees, встроенный DEX для стейблкоинов, «modern wallet signing» с программируемыми smart accounts. Явно позиционируется для **агентной коммерции**: «facilitate low-cost, instant payments for agents to autonomously execute transactions». Клиенты по состоянию на момент чтения: Stripe, Shopify, Brex и другие [S17].

### NLWeb, AGNTCY, NANDA — обнаружение агентов на открытом вебе

- **NLWeb** (Microsoft, open-source) — работает как **MCP-сервер**, превращающий структурированные данные сайта (Schema.org: продукты, рецепты, отзывы) в естественноязыковой интерфейс. Позиционирование от авторов: **«NLWeb относится к MCP/A2A так же, как HTML относится к HTTP»**. Модули: AskAgent (движок запросов), AgentFinder (discovery), DataFinder (SQL-трансляция), ModelRouter, NLWebScorer. Поддерживает OpenAI, DeepSeek, Gemini, Anthropic, HuggingFace как LLM-бэкенды и Qdrant/Snowflake/Milvus/Azure AI Search/Elasticsearch/Postgres как vector stores [S27].
- **AGNTCY** — открытый стек (Series of LF Projects, LLC, т.е. под Linux Foundation) для межвендорной агентной коллаборации: **Discovery** (федеративный реестр агентов), **Communications** (протокол **SLIM** для agent-to-agent messaging), **Secure Runtime** (identity, sandboxing, encrypted memory), **AgentBridge** (координация coding-агентов и CLI), Identity management, Observability. Technical Steering Committee включает Cisco, Dell, Google, Oracle, Red Hat [S28].
- **NANDA** (MIT Media Lab, AGNI research / Camera Culture Group, проф. Ramesh Raskar) — исследовательская программа «интернета агентов»: identity/naming/discovery для агентов, взаимодействующая agent-to-agent коммуникация, authentication/authorization/secure delegation, «index architecture for the agentic web» (фазы 1.1/1.2, 2025-2026). Открытый код — на projectnanda.org [S29].

## Numbers

- x402 Foundation: **40 организаций-членов** на момент операционного запуска 14 июля 2026 (17 Premier, 18 General, 5 Associate по перечислению источника) [S9].
- UCP Tech Council: расширен до **16 мест** 24 апреля 2026 (было меньше, добавлено 5 новых членов) [S7].
- UCP Payments Technical Council: **8 членов-основателей** (Adyen, Ant International, Coinbase, Global Payments, Google, PayPal, Shopify, Stripe), объявлено 2 сентября 2026 [S7].
- UCP Lodging Technical Council: **7 членов-основателей** (Amadeus, Booking.com, Expedia, Google, Hilton, Marriott, Trip.com), 11 августа 2026 [S7].
- Tempo: финализация блока **~0.6 секунды**, «no re-orgs» (заявлено разработчиком, независимая верификация не проводилась) [S17].
- KYA/Vouched (маркетинговая цифра поставщика, не независимо проверена): мошенничество через агентов/ботов может достигать **$9,400+ за инцидент** [S16].
- Из независимого (не первоисточникового) поста на Hacker News (2026-09-25, не верифицировано мной по первоисточнику): «одно кошелёк-ID зарегистрировал 10,000+ фейковых agent-сервисов на x402» и «почти 1,900 MCP tools незаметно поменяли поведение после апрува» — это утверждение из Show HN поста стороннего автора, а не из спецификации; помечаю как заслуживающее отдельной проверки, не как факт спецификации [S30].

## Pitfalls, limits, criticism

- **AP2 v0.2 — значительный дрейф терминологии.** Если в конспектах/статьях 2025 года встречается «Intent Mandate» и «Cart Mandate» как отдельные сущности — в текущем (апрель 2026) тексте спецификации эти термины **не встречаются**; они, по всей видимости, консолидированы в двухмандатную модель Checkout Mandate + Payment Mandate с open/closed состояниями. Материалы, ссылающиеся на «Intent Mandate», вероятно устарели — стоит явно это отметить читателю и не путать со старыми пересказами AP2 [S1][S2][S3].
- **AP2 explicitly не определяет сам Commerce Protocol** — каталоги, чекаут-апдейты, API между ролями — «outside the scope of AP2»; AP2 — это security/authorization layer *поверх* какого-то коммерческого протокола (в первую очередь UCP) [S1]. Это значит AP2 сам по себе не даёт готового чекаута — нужен UCP или ACP или собственный протокол мерчанта.
- **Открытые мандаты и privacy** — авторы явно указывают риск: агент должен раскрывать верификатору **только необходимые disclosures** из open Mandate (Selective Disclosure через SD-JWT), иначе утечка данных о constraints, которые пользователь не хотел показывать конкретному мерчанту [S1].
- **UCP: сложность quantity/units и rounding.** Спецификация явно запрещает «тихую» конвертацию единиц измерения в обе стороны — расхождение в `quantity_unit` между платформой и бизнесом обязано быть или явно сконвертировано с warning-сообщением, или отклонено с recoverable error, что усложняет клиентскую логику чекаута для товаров, продаваемых по весу/объёму [S24].
- **x402 всё ещё крипто-ориентирован по умолчанию** — несмотря на заявленную network/currency-agnosticity, примеры и facilitator-модель исторически завязаны на блокчейн-сети (EVM/SVM/Stellar); фиатная поддержка заявлена как цель, но «не будет депriorитизировать on-chain платежи в пользу фиата» — то есть крипто остаётся приоритетом фонда [S8].
- **Web Bot Auth — research-stage, без security audit**, «no current adopters» перечислено в самом репозитории на момент чтения — то есть технология по состоянию источника ещё не является production-стандартом, несмотря на связку с Cloudflare [S15].
- **Visa TAP** — публично читаемая страница не раскрывает конкретные форматы заголовков/протокола подписи (они «в Client Implementation Guide» и «в TAP specification», доступных отдельно/под NDA-подобным доступом) — это ограничивает возможность независимой верификации механики без доступа к закрытой документации [S12].
- **Mastercard Agent Pay** — официальный `developer.mastercard.com/product/agent-pay` рендерится через JS (SPA), автоматический fetch не даёт содержимого; авторитетные независимые вторичные источники (AP News, CNBC) недоступны для автоматического чтения в рамках этой сессии — механика Agent Pay в этом файле **не подтверждена первоисточником**, см. Unverified [S13].
- **Ликвидность доверия против фрагментации:** AP2 Executive Summary прямо формулирует риск: без единого протокола рынок разделится на проприетарные силосы, что уменьшит одобряемость (approval rates) транзакций и увеличит стоимость фрод-мониторинга для сети — это ключевой аргумент «зачем стандарт», а не хайп-фраза [S18].
- **Ответственность/liability оставлена открытым вопросом** даже в AP2 — спецификация даёт *evidence* для споров (мандаты+receipts), но явно не решает, кто отвечает при мошенничестве/ошибке агента — это выведено за скобки в сторону «commerce protocol» и regulatory framework [S18].

## What changed in the last 6 months (примерно апрель-сентябрь 2026)

- AP2 получил ревизию до v0.2 с формализацией 5-role модели и явной интеграцией с UCP как «предпочитаемым» Checkout Object (см. `docs/specification.md`: «when used with the Universal Commerce Protocol (UCP), this MUST be the Checkout object») [S2].
- UCP выпустил крупный релиз **v2026-08-25** с 3DS2, structured constraints, независимым версионированием capability и «grocery readiness» — то есть явное расширение за пределы generic retail к скоропортящимся/весовым товарам [S7].
- UCP сформировал **три вертикальных Technical Council** за три месяца подряд (Food — июль, Lodging — август, Payments — сентябрь 2026) и выпустил черновую спецификацию **Lodging Booking** (25 сентября 2026) — явный сдвиг от «retail-only» к мультивертикальному протоколу [S7].
- x402 сменил юридическое лицо: governance перешла от Coinbase к независимому **x402 Foundation** под Linux Foundation (14 июля 2026), с массовым присоединением платёжных сетей и банков (Visa, Mastercard, Amex, Stripe) — сигнал, что крипто-native протокол получил mainstream-financial-industry buy-in [S9].
- x402 V2 (24 июня 2026) поменял имена заголовков и убрал `X-*` префиксы — **breaking change** для ранних интеграторов [S10][S11].
- Visa публично интегрировала платёжную сеть с ChatGPT/OpenAI для агентного шопинга (около июня 2026 по дате статьи) [S19].

## Diagram candidates

1. **AP2 5-ролевая диаграмма** — акторы: Shopping Agent, Credential Provider, Merchant, Merchant Payment Processor, Trusted Surface (+ Network/Issuer). Стрелки: SA↔Merchant (Checkout), SA↔TS (mandate signing), SA↔CP (payment credential request), CP/Merchant↔MPP↔Network/Issuer (settlement) [S1][S18].
2. **AP2 Human Present flow (state machine)** — состояния: Setup → Discovery&Negotiation → Cart Validated → Payment Method Provided → Cart Shown → Sign&Pay (Checkout Mandate создан) → Payment Execution → Send to Issuer → (опционально Challenge/Resolve) → Authorize/Receipt [S18].
3. **AP2 Human Not Present flow** — отличие от Present: open Mandate с constraints → SA автономно мониторит условие → SA закрывает мандат своим Agent Key → тот же путь оплаты; отдельная ветка «Merchant force re-confirmation» [S18].
4. **Mandate lifecycle (Open → Closed)** — состояния Open Mandate (constraints, `cnf` agent key) → Closed Mandate (bound checkout_hash) → Receipt (Success/Error) [S1][S2].
5. **ACP Checkout Session state machine** — узлы `not_ready_for_payment → ready_for_payment → completed`, с боковым переходом в `canceled` из любого нетерминального состояния [S4].
6. **ACP Delegate Payment flow** — акторы: ChatGPT/OpenAI, PSP (Stripe), Merchant; шаги: buyer saves payment method → OpenAI → PSP `delegate_payment` → vault token `vt_...` → OpenAI → Merchant `/complete` [S22].
7. **UCP discovery+negotiation sequence** — Platform → GET `/.well-known/ucp` (Business profile) ↔ Platform's own profile URL in `UCP-Agent` header → intersection algorithm (intersect names → select version → prune orphaned extensions) [S6].
8. **UCP Trust Triangle** — три вершины: Business, Platform, Payment Credential Provider/PSP; рёбра помечены типом отношения (pre-existing contract / tokenize / pass token) [S6].
9. **UCP + AP2 integration sequence** — Business, Platform, Payment Processor; шаги 1-7 из раздела Mechanics выше [S23].
10. **x402 payment flow (12 шагов)** — Client, Resource Server, Facilitator, Blockchain; ветка verify (шаги 5-7) и ветка settle (шаги 8-11) [S8].
11. **Protocol comparison matrix (chart/table candidate)** — строки: AP2, ACP, UCP, x402, Visa TAP, Mastercard Agent Pay; столбцы: governing body, versioning scheme, primary transport, auth mechanism, crypto vs fiat, current version/date.
12. **Governance timeline chart** — x-ось время (2025-09 to 2026-09), y — количество организаций/советов на протокол (UCP Councils growth: 0→4 советов за 2026; x402 Foundation members: 0→40 в момент запуска) [S7][S9].

## Glossary

- **AP2 (Agent Payments Protocol)** — Google-протокол доверия для агентных платежей, основан на verifiable credentials (mandates) [S1].
- **ACP (Agentic Commerce Protocol)** — открытый стандарт OpenAI+Stripe для checkout-сессий, обслуживает ChatGPT Instant Checkout [S4].
- **UCP (Universal Commerce Protocol)** — открытый стандарт Google+Shopify+ритейлеров для discovery/capabilities/checkout через REST/MCP/A2A [S6].
- **Checkout Mandate** — AP2-мандат, криптографически подтверждающий, что Shopping Agent авторизован купить собранный checkout [S1].
- **Payment Mandate** — AP2-мандат, авторизующий оплату конкретного checkout [S1].
- **Trusted Surface (TS)** — обязательно non-agentic UI, где пользователь подписывает мандат [S1].
- **Open / Closed Mandate** — незакрытый (с constraints, для autonomous-режима) / закрытый (привязан к конкретному действию) мандат [S1].
- **VDC (Verifiable Digital Credential)** — issuer-signed набор claims с проверяемой подлинностью [S20].
- **SD-JWT** — формат verifiable credential с избирательным раскрытием (Selective Disclosure JWT), используется для мандатов AP2 [S1][S2].
- **Capability (UCP)** — версионированная фича, которую Business объявляет в своём профиле (`dev.ucp.shopping.checkout`) [S6].
- **Extension (UCP)** — расширение capability через `extends` + JSON Schema `allOf` [S6].
- **Payment Handler (UCP)** — спецификация конкретного способа получения/обработки платёжного инструмента, не сущность [S6].
- **Merchant of Record (MoR)** — юрлицо, несущее финансовую ответственность/владение транзакцией [S6].
- **Facilitator (x402)** — сервер, который верифицирует и исполняет платёж от имени resource server [S8].
- **KYA (Know Your Agent)** — верификация identity/authority AI-агента, аналог KYC для агентов [S16].
- **Web Bot Auth** — подпись HTTP-запросов ботов/агентов по RFC 9421 с discovery ключей через well-known directory [S15].
- **llms.txt** — файл в корне сайта, дающий агентам краткое машиночитаемое описание сайта в Markdown [S31].
- **NLWeb** — MCP-сервер, превращающий Schema.org-разметку сайта в естественноязыковой интерфейс [S27].

## Unverified / open questions

- **Точная дата первого публичного релиза AP2** (v0.1/исходная версия 2025 года) и точный список изменений между этой версией и текущим v0.2 — я не нашёл changelog/release notes в репозитории `google-agentic-commerce/AP2`; сайт даёт только `lastmod: 2026-04-28` для текущей версии страниц. Пробовал: sitemap.xml, README репозитория (даёт только quickstart, не историю версий) [S1][S2].
- **Точная механика Mastercard Agent Pay** (токенизация, «Agentic Tokens», Mastercard Verifiable Intent как отдельный продукт vs модуль) — официальный developer-портал не отдаёт контент простому HTTP-fetch (SPA), пресс-релизы Mastercard блокируют автоматический доступ (403), AP News и CNBC статьи недоступны для WebFetch в этой сессии. Информация в заметках о Mastercard Agent Pay/Verifiable Intent основана только на косвенных упоминаниях в Hacker News постах сторонних разработчиков — **не первоисточник**, требует отдельной проверки при следующем ресёрче с доступом к другим источникам (например, PR Newswire, Reuters, или официальный Mastercard SDK на GitHub, если он существует) [S13][S14].
- **Visa Trusted Agent Protocol — точные форматы заголовков и алгоритм подписи**: публичная страница developer.visa.com отсылает к «Client Implementation Guide» и «Trusted Agent Protocol specification», которые не были доступны для чтения в этой сессии (не найден прямой URL/GitHub с этими документами за отведённое время) [S12].
- **x402 полная спецификация PaymentRequirements/PaymentPayload JSON-схем** — я подтвердил общий flow и V2-заголовки, но не прочитал файл `specs/` репозитория x402-foundation напрямую (пути `specs/x402-specification.md` вернули 404, точный путь не найден из-за GitHub API rate limit на этой сессии) — то есть точные поля `scheme`, `network`, `asset` в PaymentPayload не VERBATIM-подтверждены, взяты из README-пересказа [S8].
- **UCP Identity Linking и Order Management capabilities** — не прочитаны подробно (только упомянуты в Core Concepts); детали `dev.ucp.common.identity_linking` OAuth-флоу и order lifecycle states не вошли в эти заметки за недостатком времени — кросс-ссылка на отдельное чтение `http://ucp.dev/latest/specification/common/identity-linking/` и `.../shopping/order/` при следующей итерации.
- **AGNTCY SLIM protocol технические детали** (формат сообщений agent-to-agent) — не прочитан отдельно, только упомянут по названию из summary страницы [S28].
- **NANDA спецификация AgentFacts/index protocol** — упомянутые в брифе редактора термины «AgentFacts», «quilt» не подтверждены в прочитанном источнике (media.mit.edu страница их не называет буквально) — нужно читать projectnanda.org напрямую, не открыт в этой сессии.
- **DNS-based agent discovery proposals** — из брифа редактора, не исследовано вообще за нехватку времени/бюджета; отдельный заход нужен (вероятно связано с `.well-known` подходами UCP/llms.txt/WebBotAuth, но явного DNS TXT-record стандарта не найдено).
- **AP2 отношение к A2A x402 extension** (`google-agentic-commerce/a2a-x402` упоминался в изначальном плане поиска) — репозиторий не проверен напрямую в этой сессии.
- Числа про «10,000+ фейковых агентов на x402» и «1,900 MCP tools изменили поведение» из HN Show-поста — маркетинговое заявление стороннего стартапа (trustchain), не первоисточник и не верифицировано.

## Sources

- [S1] "Agentic Payment Protocol (v0.2)" — Specification page, ap2-protocol.org (Google), lastmod 2026-04-28, https://ap2-protocol.org/ap2/specification/index.md, accessed 2026-09-30.
- [S2] "Checkout Mandate" — ap2-protocol.org, lastmod 2026-04-28, https://ap2-protocol.org/ap2/checkout_mandate/index.md, accessed 2026-09-30.
- [S3] "Payment Mandate" — ap2-protocol.org, lastmod 2026-04-28, https://ap2-protocol.org/ap2/payment_mandate/index.md, accessed 2026-09-30.
- [S4] "Agentic Checkout Spec: Technical Overview" — OpenAI Developers, https://developers.openai.com/commerce/specs/checkout, accessed 2026-09-30.
- [S5] "Agentic Commerce Protocol" changelog files (`2025-09-29.md`, `2025-12-12.md`, `2026-01-16.md`, `2026-01-30.md`, `2026-04-17.md`) — GitHub repo `agentic-commerce-protocol/agentic-commerce-protocol`, maintained OpenAI & Stripe, https://github.com/agentic-commerce-protocol/agentic-commerce-protocol, accessed 2026-09-30.
- [S6] "Core Concepts" — Universal Commerce Protocol docs, ucp.dev, http://ucp.dev/documentation/core-concepts/index.md, accessed 2026-09-30.
- [S7] "Announcements" and "Versioning" — ucp.dev, http://ucp.dev/documentation/announcements/index.md and http://ucp.dev/versioning/index.md, accessed 2026-09-30 (entries dated 2026-01-11 through 2026-09-25).
- [S8] "x402" README — GitHub `coinbase/x402` (development fork; canonical now x402-foundation/x402), https://raw.githubusercontent.com/coinbase/x402/main/README.md, accessed 2026-09-30.
- [S9] "Linux Foundation Announces Operational Launch of x402 Foundation..." — x402.org, published 2026-07-14 (per article content), https://x402.org/linux-foundation-announces-operational-launch-of-x402-foundation-to-standardize-internet-native-payments-for-ai-agents-and-applications/, accessed 2026-09-30.
- [S10] "Introducing x402 V2: Evolving the Standard for Internet-native Payments" — x402.org, by Erik Reppel, Carson Roscoe, Josh Nickerson, published 2026-06-24, https://x402.org/x402-v2-launch/, accessed 2026-09-30.
- [S11] "HTTP 402" concept page — x402 docs (GitBook), https://x402.gitbook.io/x402/core-concepts/http-402.md, accessed 2026-09-30.
- [S12] "Trusted Agent Protocol" — developer.visa.com, https://developer.visa.com/capabilities/trusted-agent-protocol, accessed 2026-09-30.
- [S13] "Agent Pay" — developer.mastercard.com/product/agent-pay (JS-rendered, content not retrievable by automated fetch), accessed 2026-09-30.
- [S14] Hacker News comment threads mentioning "Mastercard Agent Pay" / "Mastercard Verifiable Intent" — Hacker News (Algolia API), various posts dated 2026-03-13 to 2026-09-25, https://hn.algolia.com/api/v1/search?query=Mastercard%20Agent%20Pay, accessed 2026-09-30 (secondary/anecdotal, not primary source).
- [S15] "Web Bot Auth" — GitHub `cloudflare/web-bot-auth`, https://github.com/cloudflare/web-bot-auth, accessed 2026-09-30.
- [S16] "Know Your Agent (KYA)" — Vouched, https://kya.vouched.id/, accessed 2026-09-30.
- [S17] "Tempo" — tempo.xyz (Stripe & Paradigm), https://tempo.xyz, accessed 2026-09-30.
- [S18] "Executive Summary" — ap2-protocol.org, lastmod 2026-04-28, https://ap2-protocol.org/overview/index.md, accessed 2026-09-30.
- [S19] "Visa plugs its payment network into ChatGPT, letting AI agents shop and pay" — AP News via Hacker News listing, created_at 2026-06-10, https://apnews.com/article/visa-chatgpt-openai-shopping-mastercard-d769dec86344cb4977c98789e8ec492f (article body itself not retrievable by WebFetch in this session; date/title from HN Algolia index), accessed 2026-09-30.
- [S20] "Agent Authorization" — ap2-protocol.org, https://ap2-protocol.org/ap2/agent_authorization/index.md, accessed 2026-09-30.
- [S21] "openapi.agentic_checkout.yaml" (spec 2026-04-17) — GitHub `agentic-commerce-protocol/agentic-commerce-protocol`, https://raw.githubusercontent.com/agentic-commerce-protocol/agentic-commerce-protocol/main/spec/2026-04-17/openapi/openapi.agentic_checkout.yaml, accessed 2026-09-30.
- [S22] "Delegated Payment Spec: Technical Overview" — OpenAI Developers, https://developers.openai.com/commerce/specs/payment, accessed 2026-09-30.
- [S23] "UCP and AP2" — ucp.dev, http://ucp.dev/documentation/ucp-and-ap2/index.md, accessed 2026-09-30.
- [S24] "Checkout Capability" — ucp.dev specification, https://ucp.dev/latest/specification/shopping/checkout/index.md, accessed 2026-09-30.
- [S25] "HTTP 402" page, Payment Headers in V2 section — x402 docs, https://x402.gitbook.io/x402/core-concepts/http-402.md, accessed 2026-09-30 (same as S11).
- [S26] "Introducing x402 V2" — x402.org, https://x402.org/x402-v2-launch/, accessed 2026-09-30 (same as S10).
- [S27] "NLWeb" — GitHub `microsoft/NLWeb`, https://github.com/microsoft/NLWeb, accessed 2026-09-30.
- [S28] "AGNTCY" — agntcy.org, https://agntcy.org, accessed 2026-09-30.
- [S29] "NANDA" — MIT Media Lab, https://www.media.mit.edu/groups/nanda/overview/ (redirected from nanda.media.mit.edu), accessed 2026-09-30.
- [S30] Hacker News Show HN post "Threshold Cryptography for AI Agents Using Payments and Digital Assets" — Hacker News, created_at 2026-09-25, https://github.com/tkeeper-org/tkeeper (linked from HN), accessed 2026-09-30 (anecdotal claims by third-party poster, not verified).
- [S31] "llms.txt Specification" — llmstxt.org, authored by Jeremy Howard, published 2024-09-03, v2 updates through 2026-08-10, https://llmstxt.org/, accessed 2026-09-30.
