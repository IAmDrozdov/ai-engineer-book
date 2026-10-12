# Фактчек главы 15 «Интеграции и авторизация агентов» (часть «Продакшен»)

Дата проверки: 30 сентября 2026. Проверялись: `index.html` главы против `research/{spec,practice,field,gaps}.md`
и, для ~30 самых нагруженных/подозрительных утверждений, против живых первоисточников в вебе
(спецификации, официальная документация, GitHub API, changelog, оригинальные посты). Список того,
что проверено по живым источникам, — в конце отчёта.

## Итог

Проверка не нашла ни одной подтверждённой фактической ошибки. Все проверенные версии, даты, числа,
цитаты и коды ошибок совпали дословно или по существу с первоисточниками. Ниже — что именно проверено
и как, чтобы редактор мог оценить полноту прохода, а не просто поверить на слово.

**critical: 0, major: 0, minor: 0.**

## Что проверено по живым источникам (не только по заметкам) и подтвердилось

- **MCP-спецификация 2026-07-28**, `basic/authorization/security-considerations.mdx`: дословная цитата
  главы «The MCP server MUST NOT pass through the token it received from the MCP client» — есть в файле
  слово в слово (строка 126 в текущем `main`). Раздел про `iss`, таблица валидации, step-up-правило
  («Clients acting on behalf of a user SHOULD attempt the step-up… client_credentials clients MAY… or
  abort the request immediately») — подтверждено дословно из `basic/authorization/index.mdx`.
- **Claude Code CHANGELOG.md** (полный файл с `main`, не пересказ): все девять версий, которые глава
  называет по номеру и содержанию правки, — 2.1.229 (`127.0.0.1` вместо `localhost`), 2.1.231
  (несовпадение redirect URI у Slack), 2.1.243 (CIMD/Linear, «Invalid redirect URI»), 2.1.248
  (промах кеша раз в час после обновления OAuth-токена), 2.1.265 («no longer registers an OAuth
  client with them until you actually authenticate»), 2.1.271 (гонки регистраций), 2.1.274
  (`insufficient_scope` вместо «истёкший вход»), 2.1.281 (URL-mode elicitation), 2.1.284
  (`{"decision":"block"}` для Elicitation-хуков) — совпадают дословно с реальными записями
  changelog. Это самый рискованный участок главы (много конкретных версий подряд), и он весь точный.
- **SEP-1932/1933** (GitHub PR modelcontextprotocol/modelcontextprotocol #1932, #1933): метки `draft`,
  `extension`, дата последнего обновления `2026-09-28` и цитата SEP-1933 «additionally register as
  OAuth clients or manage long-lived secrets introduces unnecessary complexity and weakens security
  posture» — подтверждены через `gh api`, дословно.
- **draft-ietf-wimse-aims-00** (ietf.org/archive): все три цитаты главы — «The Large Language Model
  MUST NOT have access to an agent's credentials», «do not by themselves constitute authorization and
  MUST be bound to a verifiable authorization grant», «the agent MUST NOT treat local UI confirmation
  alone as sufficient authorization», формулировка Transaction Tokens — найдены дословно в тексте
  драфта. IETF Datatracker API подтверждает дату `time: 2026-09-15T14:40:51Z`.
- **Entra Agent ID OBO** (raw MicrosoftDocs/entra-docs, `agent-on-behalf-of-oauth-flow.md`): коды
  ошибок `AADSTS82014` (детская личность не может пройти интерактивное согласие) и `AADSTS50013`
  (несовпадение аудитории с blueprint), параметр `fmi_path`, ограничение «works only within tenant
  boundaries» — все совпадают дословно с текущим файлом на GitHub.
- **Kong `ai-mcp-oauth2`**: минимальная версия Kong Gateway 3.12, поведение по умолчанию («strips the
  incoming access token… preventing token theft and confused deputy attacks»), `passthrough_credentials`
  для оригинального токена, «Token exchange v3.14+» — подтверждено с developer.konghq.com.
  Глава описывает это точно.
- **AWS AgentCore Identity** (docs.aws.amazon.com, `identity-terminology.html`): обе цитаты — «enable
  agents to authenticate as themselves rather than impersonating users» и «An AWS-signed token that
  contains both workload identity and user identity information» — совпадают дословно.
- **OpenID AuthZEN Authorization API 1.0**: дата публикации `11 January 2026`, статус Final, авторы
  O. Gazitt, D. Brossard, A. Tulshibagwale — подтверждены с openid.net. Пример запроса `POST
  /access/v1/evaluation` с `X-Request-ID: bfe9eb29-…` и телом `{subject: alice@example.com, resource:
  todo/1, action: can_read, context: 1985-10-26…}` — это не собранный из разных мест пример, а
  дословная Figure 28 спецификации.
- **PostgreSQL 18** документация: «These defaults can be overridden by SET TRANSACTION…», «This is a
  high-level notion of read-only that does not prevent all writes to disk», «PostgreSQL will accept a
  setting for any two-part parameter name», «This function corresponds to the SQL command SET»
  (про `set_config`), «These forms can be executed by any user» (про `RESET ROLE`/`SET ROLE NONE`) —
  все пять цитат подтверждены дословно с postgresql.org/docs/current.
- **Storm-3168** (Microsoft Security Blog, живой фетч): 15,5 ч разведки, 300+ успешных чтений, 5 с на
  перечисление машин в двух подписках, 35 мин / 150+ операций, 7-минутное окно разрушения, пять
  токенов, «two deletion tokens active during the same 70-second period», формулировка «strongly
  indicates automated or scripted execution» — все числа и формулировки главы совпадают с постом
  дословно.
- **Nango** (nango.dev/blog/id-jag-agent-authentication): цитаты «It only works over OAuth» и «It
  controls who can act, not what they do» найдены дословно.
- **MCP roadmap** (2026-08-22, raw-файл из репозитория): «MCP authorization today is built around a
  person approving access in a browser», «built on existing standards rather than pasted API keys and
  long-lived tokens», «server-initiated events (webhooks and channels, so clients aren't left polling
  for results)» — все три цитаты дословны.
- **Claude Code MCP docs** (code.claude.com/docs/en/mcp): `authServerMetadataUrl`, `headersHelper`
  (перезапуск при 401/403, запуск на каждом подключении), список «прочитываемых как пустые» переменных
  (`ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `NPM_TOKEN` и др.) — подтверждено дословно.

## Утверждения, сверенные только по исследовательским заметкам (не рефетчены отдельно), но внутренне
непротиворечивые и с указанием источника

Числа замера 12 MCP-серверов (DCR 10/12, CIMD 5/12, `iss` 5/12, PKCE `plain` 4/12, id-jag 6/12, без PRM
1/12) в тексте и на графике `fig-probe` совпадают между собой и с `gaps.md` [G43] — это собственный
замер авторов заметок, повторно его не гонял. Цифры Cyera (1 344 приложения, цитаты про утёкший ключ
Composio), Auth0 (5 hops / 4 уровня `act`, 30 RPS), CVE-2026-14540 (CVSS 8.0, дата публикации
31.07.2026) и хронология EMA/ID-JAG сверены с двумя-тремя независимыми заметками и внутренне
согласованы; отдельно не фетчил, так как `gaps.md` уже делает это через прямые запросы к API и
указывает источник по каждому пункту.

## Утверждения без ссылки, которым ссылка нужна

Не нашёл. Плотность цитирования в главе высокая: почти каждый нетривиальный факт, число, версия или
цитата сопровождается `<a class="cite">`, и в проверенных абзацах ссылка неизменно вела на источник,
который тот же факт подтверждает.

## Ссылки, которые не подтверждают то, к чему приставлены

Не нашёл. Отдельно проверил самые общие/составные источники (src-9 — три страницы Auth0 под одной
ссылкой, src-13 — диапазон версий Claude Code changelog, src-11 — четыре страницы спецификации MCP) —
во всех случаях конкретное утверждение действительно находится на одной из объединённых страниц.

## Методологическое замечание

Главу, судя по всему, писали уже с опорой на исправленный `gaps.md` (там, где `spec.md`/`practice.md`
на 2025-11-25 или путают identity-chaining с ID-JAG, глава идёт за исправленной версией из `gaps.md`),
и вдобавок отдельно перепроверяли живые источники при письме (например, конкретные номера версий
Claude Code и коды ошибок Entra, которых нет ни в одной из четырёх заметок дословно, но которые
подтвердились при прямой проверке). Это не типичный случай для ревью такого рода: обычно на 30
проверенных утверждений находится хотя бы одна ошибка. Здесь — нет. Рекомендую не тратить дальнейшие
циклы фактчека на эту главу без нового материала (новых разделов, правок), а не перепроверять её
заново «на всякий случай».
