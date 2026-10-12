# Ревью главы 10 — код, протокольные примеры, рисунки

Дата: 30 сентября 2026. Роль: независимый ревьюер (код, JSON, схемы). Правки в главу не вносились.

Проверено: 5 блоков Python (`py_compile`), 7 блоков `data-lang="json"` + 1 `jsonc` + 2 `application/json` графика (`json.load`), 16 рисунков (`node tools/qa.mjs --shots`, скриншоты открыты глазами), имена полей/методов/событий — сверены с `research/spec.md`, `gaps.md`, `practice.md`, `field.md`, а где заметок не хватало — с первоисточником напрямую (GitHub x402-foundation/x402, UCP checkout spec, PyPI, code.claude.com/docs/mcp, arXiv:2607.21824).

## Находки

### Major — блок `data-lang="json"` не парсится как JSON

- **Блок**: `data-title="Ответ чекаута с подписью магазина (из спецификации расширения)"`, строки 463–476 `index.html`.
- **Что не так**: значения `"ucp": { ... }`, `"line_items": [ ... ]`, `"totals": [ ... ]` — это буквальное многоточие без кавычек, а не строка. Такой JSON не разбирается.
- **Доказательство**:
  ```
  $ python3 -c "import json; json.load(open('j4_ap2_signed.json'))"
  json.decoder.JSONDecodeError: Expecting property name enclosed in double quotes: line 2 column 12 (char 13)
  ```
- **Почему это важно**: по инструкции автора (`AUTHORING.md`, §4 и §5) блок с сокращением через комментарий помечается `data-lang="jsonc"` — так в этой же главе сделано с соседним блоком «Create Checkout, ответ (сокращён)» (строка 407, комментарий `/* … */`, парсится после снятия комментария). Блок из UCP `/.well-known/ucp` (строка 316) показывает третий, рабочий способ сократить пример и остаться валидным JSON — многоточие как *строка*: `"x": "..."`. Разбираемый блок на строке 463 не следует ни одному из двух правильных паттернов главы и просто ломает JSON.
- **Как исправить**: либо взять многоточие в кавычки как в примере строки 316 (`"ucp": "..."`, `"line_items": "..."`), либо, если это принципиально важно показать как объект/массив, заменить на укороченный, но валидный фрагмент (например, `"ucp": {"version": "2026-08-25"}`), либо пометить блок `data-lang="jsonc"` и обернуть многоточия в `/* … */`. Последовательность с остальными JSON-блоками главы лучше первым или вторым вариантом.

## Проверено — проблем не найдено

### Код (Python)

Все 5 блоков извлечены как есть и прошли `python3 -m py_compile` без ошибок:

- «Набросок: consume_once (asyncpg, не запускался)» (строки 256–275) — набросок помечен как таковой в заголовке, логика `INSERT … ON CONFLICT DO NOTHING … RETURNING` действительно даёт атомарность, которую описывает текст.
- «examples/python/servers/mcp/simple.py (сокращён)» (743–777) — импорты, имена классов (`FastMCP`, `HTTPFacilitatorClientSync`, `ExactEvmServerScheme`, `create_payment_wrapper_sync`, `wrap_fastmcp_tool_sync`, `x402ResourceServerSync`) и порт по умолчанию (`4022`) сверены с реальным файлом `x402-foundation/x402/examples/python/servers/mcp/simple.py` — совпадает, включая `transport="sse"` в последней строке, которую текст главы отдельно комментирует как устаревшую.
- «Набросок: проверка подписи агента (http-message-signatures, не запускался)» (881–908) — помечен как набросок, API `HTTPMessageVerifier`/`HTTPSignatureKeyResolver`/`algorithms.ED25519` использован правдоподобно, логика nonce (redis `SET NX EX`) соответствует тексту раздела.
- «examples/python/servers/fastapi/main.py (сокращён, адрес facilitator подставлен)» (1080–1107) — импорты и классы (`FacilitatorConfig`, `HTTPFacilitatorClient`, `PaymentMiddlewareASGI`, `RouteConfig`, `PaymentOption`, `x402ResourceServer`, `ExactEvmServerScheme`) сверены с реальным `examples/python/servers/fastapi` — совпадает; порт `4021` в соседнем `curl`-примере (638) подтверждён тем же источником («Server runs at http://localhost:4021»).
- «Набросок: что сервер требует (не запускался)» (1110–1119) — декодирует `payment-required` через `base64`/`json`, логика корректна.

### JSON и JSONC

`json.load` — без ошибок для: «Открытый Checkout Mandate» (119), «Ограничение checkout.line_items» (146), «GET /.well-known/ucp» (316), «/.well-known/acp.json» (525), «Complete — запрос» (568), «PaymentRequired x402 V2» (650), обоих графиков `application/json class="chart"` (300, 1034). Блок «Create Checkout, ответ (сокращён)» (407, `data-lang="jsonc"`) парсится после удаления `/* … */` — соответствует конвенции для jsonc.

Значение `"version": "2025-09-29"` в примере `/.well-known/acp.json` (526) не опечатка: это версия протокола из самого примера RFC Discovery (не дата релиза ACP 2026-04-17) — совпадает дословно с VERBATIM-примером в `research/gaps.md` (строки 306–317).

### Имена полей, методов, событий — сверка с заметками и первоисточниками

Точечно перепроверено (без расхождений):

- AP2: `vct` (`mandate.checkout.1`/`.open.1`, `mandate.payment.1`/`.open.1`), `checkout_jwt`/`checkout_hash`, `transaction_id`/`payee`/`payment_amount`/`payment_instrument`/`risk_data`, ошибки `invalid_credential`/`unresolved_constraint`/`invalid_mandate`/`mandates_not_supported` — все в `practice.md:97`.
- UCP: 6 статусов чекаута (`incomplete, requires_escalation, ready_for_complete, complete_in_progress, completed, canceled`), пути `/checkout-sessions` с `PUT` — `gaps.md:41`. Пример округления веса (бананы, 79¢/фунт, `quantity:150`, `scale:2`, `118,5 → 119`) и запрет платформе/магазину на самодеятельность при пересчёте — сверено дословно с текстом спецификации UCP checkout (`docs/specification/shopping/checkout/index.md` в репозитории `Universal-Commerce-Protocol/ucp`).
- ACP: 11 статусов чекаута, пути `/checkout_sessions` с `POST`, `Idempotency-Key`/`idempotency_conflict` (422)/`idempotency_in_flight` (409) — `gaps.md:16,41`. `risk_signals` пример `{"type": "card_testing", "score": 10, "action": "manual_review"}` — дословно `field.md:315`. Префикс `vt_` — `practice.md:152,159`.
- x402: заголовки `PAYMENT-REQUIRED`/`PAYMENT-SIGNATURE`/`PAYMENT-RESPONSE`, схемы `exact`/`upto`/`batch-settlement`/`auth-capture`, CAIP-2 — `gaps.md:36-37`, `spec.md:290-291`.
- MPP: `WWW-Authenticate: Payment`/`Authorization: Payment`/`Payment-Receipt`, номер драфта `draft-httpauth-payment-01` от 9 сентября 2026 — `gaps.md:47,73`.
- Web Bot Auth: обязательные параметры `created/expires/keyid/tag=web-bot-auth`, `Signature-Agent` как Dictionary, well-known `/.well-known/http-message-signatures-directory` — `gaps.md:43`. Пример Visa (`keyId` с большой буквы, `sig2`, `NONCE_TTL=3600000`) как воспроизведение бага несовместимости с RFC 9421 — сверено дословно с `gaps.md:229-231` (первоисточник `visa/trusted-agent-protocol`).
- AB 316 / EU AI Act — глава корректно опровергает распространённую (и ошибочную) версию про «статью 26 уже действует на агента-покупателя»; сверено с исправлением в `gaps.md:26,45` дословно, включая дату переноса Annex III на 2 декабря 2027 года.
- `x402` PyPI-версия `2.25.0` на 30 сентября 2026 — подтверждено напрямую на PyPI.
- Документация Claude Code про SSE («Use HTTP servers instead, where available») — подтверждено дословно на `code.claude.com/docs/en/mcp`.

### График «33 структурные уязвимости» (`fig-rootcauses`, строка 299) и «Агент выполнил инструкцию…» (`fig-injection`, строка 1033)

В заметках (`gaps.md:364`) есть только агрегат (33 уязвимости, 14/8/11 по платформам), детальной раскладки по классам RC и таблицы с моделями там нет — это единственное место, где глава пошла дальше заметок к первоисточнику напрямую (что разрешено `AUTHORING.md`, §4, если источник добавлен в список, — источник 17 уже в списке). Оба графика перепроверены построчно против полного текста `arXiv:2607.21824`:

- Root-cause классы: RC-1(3)/RC-2(3)/RC-3(4)/RC-4(9)/RC-5(13) + 1 составная CHAIN = 33 — совпадает с Table 1 препринта дословно, включая подписи «Права не ограничены» (RC-5 = «Authentication exists but authorization…»), «Проверка не атомарна» (RC-4 = TOCTOU), «Секрет в логах или URL» (RC-3), «Каталог без подписи» (RC-1), «Чужой адрес получателя» (RC-2).
- Таблица 9 по моделям: gpt-4o-mini 100%, gemini-2.5-flash 100%, mistral-large-2512 99%, gpt-4o 68%, llama-3.3-70b 10%, claude-3-haiku 0%, claude-sonnet-4.6 0%, gemini-2.5-pro 0% — совпадает с Table 9 препринта дословно, как и «180 прогонов на модель» (8×3×3×20 = 1440, $0,72), метод 95% Wilson CI.

Обе схемы — правильный механизм, точные числа, источник корректно указан.

### Рисунки — визуальная проверка

`node tools/qa.mjs 10-agentic-commerce --shots` → `ISSUES none` (без ошибок mermaid, ужатых схем, наложений текста, битых якорей/ссылок на источники, дублей `id`).

Каждый из 16 рисунков открыт по скриншоту (`_qa/10-agentic-commerce-code/*.png`) и сверен построчно с текстом и таблицами рядом:

1. `fig-layers` — четыре слоя, порядок и формулировки совпадают с текстом секции.
2. `fig-ap2-present` (sequenceDiagram) — участники и порядок сообщений (включая ветку с Trusted Surface, не подписывающим Shopping Agent) точно соответствуют описанию Human Present.
3. `fig-ap2-autonomous` (flowchart) — ветки `unresolved_constraint` / `invalid_mandate или mandates_not_supported` соответствуют тексту и списку из четырёх ошибок AP2.
4. `fig-vi-chain` — слои L1→L2→L3a/L3b, сроки жизни (год / 24ч–30 дней / 5 минут) и связка через `transaction_id`/`checkout_hash` совпадают с текстом про Verifiable Intent.
5. `fig-replay` — воспроизведение #346 (два токена, два `initiate_payment`, один и тот же `reference`) совпадает с текстом и с VERBATIM-цитатой issue.
6. `fig-rootcauses` (chart) — см. отдельный пункт выше, числа подтверждены по первоисточнику.
7. `fig-ucp-negotiation` — GET профиля, пересечение capability, `capabilities_incompatible`/`continue_url` из подписи совпадают с текстом об алгоритме пересечения.
8. `fig-ucp-states` (stateDiagram) — все 6 состояний (`incomplete, requires_escalation, ready_for_complete, complete_in_progress, completed, canceled`) присутствуют и в верном порядке переходов, включая `canceled` из любого нетерминального состояния.
9. `fig-ucp-ap2` (рукописный SVG) — вложенность `ap2.checkout_mandate` → ответ чекаута → `ap2.merchant_authorization`, и параллельный `payment.instruments[]`, соответствует тексту про «подпись внутри подписи».
10. `fig-acp-flow` — шаги `POST /checkout_sessions` → `delegate_payment` → `complete` → вебхук `order_created` совпадают с текстом и с RFC Delegate Payment.
11. `fig-x402-flow` — поток `verify → выполнение → settle` совпадает с описанием потока `authorization` по умолчанию.
12. `fig-x402-mcp` — `isError:true` → повтор с `_meta["x402/payment"]` → `_meta["x402/payment-response"]` совпадает с текстом и с G6 из заметок.
13. `fig-tap-edge` — семь шагов проверки на краю (заголовки, ключ, окно времени, nonce, тег, сборка signature base, Ed25519) совпадают с подписью и текстом.
14. `fig-discovery` — пять слоёв обнаружения в верном порядке (DNS → индексы → манифесты → ключи → контент), формулировки совпадают с текстом раздела.
15. `fig-choice` (flowchart-решение) — все ветки (`товары`/`вызовы API`/`покупки по поручению`, `ChatGPT`/`Google`, ценовые пороги) соответствуют выводам текста раздела «Сводная таблица и выбор».
16. `fig-injection` (chart) — см. отдельный пункт выше, числа подтверждены по первоисточнику (Table 9).

Схем, противоречащих тексту или спецификации, не найдено. Стрелки подписаны, порядок сообщений нигде не противоречит описанному в прозе процессу, участники везде соответствуют ролям из соответствующего протокола.

## Итог

Один код-блок (JSON, строка 463) технически не парсится и должен быть исправлен по образцу соседних блоков той же главы. Остальной код (5/5 Python-блоков) компилируется, 9 из 10 JSON/JSONC-блоков (включая оба графика) разбираются корректно, все 16 рисунков проверены глазами и не расходятся с текстом или спецификациями. Именование полей/методов/событий по AP2, UCP, ACP, x402, MPP, Web Bot Auth и Verifiable Intent сверено с заметками и, где заметок не хватало, с первоисточником — расхождений не найдено.
