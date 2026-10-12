# Глава 10. AP2, UCP и интернет агентов — план

Лид: 23 августа 2026, AP2 issue #339 — мандат с бюджетом 5000 INR, платёж на 7500 INR, эталонный
верификатор не видит нарушений, потому что лимит не раскрыли. Протоколы агентной коммерции — это в
основном способы доказать продавцу, что человек разрешил покупку; на доказательстве и ошибаются.

## Разделы (с чего начинается → что главное)

1. `map` «Четыре вопроса к незнакомому агенту» — начинается с агента, который пришёл в чужой магазин
   с задачей «кроссовки до $100». Главное: протоколы отвечают на разные вопросы (кто стучится, что тут
   можно, разрешил ли человек, как дойдут деньги); напрямую конкурируют только UCP↔ACP и x402↔MPP.
   Стандарты ушли от вендоров (FIDO, LF, IETF). Хронология сентябрь 2025 — сентябрь 2026.
2. `ap2` «AP2: мандат вместо доверия к агенту» — начинается с дрейфа словаря (Intent/Cart → Checkout/
   Payment в v0.2 от 28.04.2026). Главное: угроза — сам агент; Trusted Surface обязана быть
   детерминированной; open/closed мандаты, `cnf`, constraints, `unresolved_constraint`. Verifiable
   Intent (Mastercard → FIDO) как конкретный формат цепочки L1→L2→L3a/L3b.
3. `ap2-failures` «Что нашли в AP2 за лето» — начинается с воспроизведения #346 (одно согласие, два
   платежа). Главное: «checking a nonce is not remembering it»; #339 (нераскрытое ограничение =
   пройденное; бюджет ×100); #268 (два ключа); arXiv 2607.21824 (14 из 33 уязвимостей; классы).
   Эталонный репозиторий заморожен с 29.04.2026. Набросок: атомарное потребление мандата в Postgres.
4. `ucp` «UCP: магазин как набор capability» — начинается с GET `/.well-known/ucp`. Главное:
   UCP-Agent, пересечение capability, REST с PUT, статусы, `continue_url`, минорные единицы и
   `quantity_unit`; AP2-расширение: `merchant_authorization` внутри `checkout_mandate`, JCS, Security
   Locked; breaking v2026-08-25.
5. `acp` «ACP после Instant Checkout» — начинается с цитаты OpenAI от 24.03.2026. Главное: что осталось
   (фиды, discovery, delegate_payment, checkout-спека), idempotency 422 vs 409 (доки OpenAI отстают),
   11 статусов, allowance, HN-спор о стимулах. Таблица UCP vs ACP и выбор.
6. `x402` «402 Payment Required: x402 и MPP» — начинается с `curl -i` и пустого тела. Главное: V2 в
   заголовках, CAIP-2, facilitator verify/settle, схемы и порядок verify/settle, двойной расчёт на
   Solana, x402 поверх MCP (что видит модель), MPP как HTTP-auth схема; полевые отчёты (Laratok,
   TRM Labs через PYMNTS, HN о Monetization Gateway).
7. `identity` «Кто стучится: подписи запросов» — начинается с подписанного запроса агента Visa/
   Mastercard. Главное: RFC 9421 и signature base, WG-черновик Web Bot Auth (Signature-Agent как
   Dictionary), теги TAP, семь проверок на краю, область подписи, nonce, SSRF, критика «ключи
   бесплатны». KYA как зонтичный термин.
8. `discovery` «Как агент находит магазин» — начинается со списка из шести служебных файлов.
   Главное: слои (DNS/DAWN → индекс → well-known манифесты → контент llms.txt v2/NLWeb → каталоги);
   спор корень vs `.well-known`; DAWN исключает оценку доверия.
9. `matrix` «Сводная таблица и выбор» — начинается с того, что конкурируют лишь две пары. Таблица
   8 протоколов × 5 свойств; кто что реально запустил (включая YCP); дерево выбора.
10. `risks` «Инъекции, мошенничество, ответственность» — начинается с отравленного каталога из
    arXiv 2607.21824 и доли успешных атак по моделям. Главное: структурные vs семантические атаки;
    что мандат защищает и что нет (широкий open-мандат); AB 316; EU AI Act — не то, что пишут.
11. `build` «Что сделать за вечер» — начинается с платного эндпоинта в тестовой сети. Шаги: x402
    FastAPI, платный MCP-тул, `/.well-known/ucp` + llms.txt, проверка подписи и nonce, тесты
    идемпотентности; правило Laratok «декларация — не подтверждённый факт».

Затем: самопроверка (10), чеклист (12), источники (≤45).

## Рисунки (16)

1. fig-layers — HTML layers: четыре вопроса и протоколы на каждом слое (map)
2. fig-ap2-present — sequence: Human Present, User/SA/TS/Merchant/CP (ap2)
3. fig-ap2-autonomous — flowchart: open → closed mandate, проверка, `unresolved_constraint` (ap2)
4. fig-vi-chain — flowchart: L1 → L2 → L3a/L3b, сверка transaction_id == checkout_hash (ap2)
5. fig-replay — sequence: повтор мандата #346 и где нужна запись потребления (ap2-failures)
6. fig-rootcauses — hbar: 33 уязвимости по классам причин, arXiv 2607.21824 (ap2-failures)
7. fig-ucp-negotiation — sequence: профиль, UCP-Agent, пересечение, ответ с `ucp` (ucp)
8. fig-ucp-states — stateDiagram: статусы чекаута UCP (ucp)
9. fig-ucp-ap2 — SVG: вложенные подписи merchant_authorization внутри checkout_mandate (ucp)
10. fig-acp-flow — sequence: create/update/delegate_payment/complete/webhook (acp)
11. fig-x402-flow — sequence: 402 → PAYMENT-SIGNATURE → verify → ресурс → settle (x402)
12. fig-x402-mcp — sequence: платный MCP-тул, `isError` и `_meta` (x402)
13. fig-tap-edge — sequence: агент → край CDN → каталог ключей → origin, семь проверок (identity)
14. fig-discovery — HTML layers: слои обнаружения (discovery)
15. fig-choice — flowchart: что принимать — товары или оплата за вызов, карта или стейблкоин (matrix)
16. fig-injection — hbar: успех инъекции через отравленный каталог по 8 моделям (risks)

## Что уходит в соседние главы ссылкой

- A2A и Agent Card как таковые → глава 7. MCP, его ревизия 2026-07-28 → глава 5.
- OAuth, identity linking, токен-обмен подробно → глава 15.
- Промпт-инъекции и мошенничество как класс атак → глава 16. Evals покупательского агента → глава 17.

## Тесты по плану

- Анкета: разделы не идут «что → зачем → как → плюсы → вывод»; ap2-failures идёт сразу после
  механики, риски — отдельным разделом с данными, в конце практикум, а не итог.
- Первые предложения: у части разделов первым идёт код или цитата, а не тезис.
- Провал: #346/#339, откат Instant Checkout, 6 записей в логе у Laratok, 0 органических агентов.
