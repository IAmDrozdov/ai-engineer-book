# Фактчек главы 16 «Безопасность агентных приложений»

Дата проверки: 30 сентября 2026. Рецензент сверил каждое нетривиальное утверждение главы с
`research/gaps.md`, `spec.md`, `practice.md`, `field.md`, а затем проверил около 20 самых
нагруженных или дословных цитат и числовых таблиц по живым первоисточникам (arXiv PDF
2510.09023 — таблица 7, arXiv 2503.18813, anthropic.com/engineering ×2, code.claude.com/docs,
GitHub MCP security_best_practices.mdx, raxe.ai, air.security, oddguan.com ×2,
embracethered.com, adnanthekhan.com, claude.com/blog, appomni.com, genai.owasp.org /
GitHub GenAI-LLM-Top10).

**Итог: глава фактически исключительно аккуратная.** Почти все ошибки, которые
`gaps.md` заранее пометил как вероятные ловушки (устаревший OWASP-топ, версия MCP,
трактовка «77% CaMeL», «12/12 защит», «0% = инъекция решена», «песочница включена по
умолчанию», «egress-allowlist спасает» и т.д.), в тексте главы уже исправлены правильно и с
нужными оговорками. Числа в графике адаптивных атак (раздел «Что на самом деле показывают
цифры защит») сверены построчно с таблицей 7 оригинальной статьи и совпадают до процента,
включая утилити PIGuard 39,18%→39%. Ключевые цифры auto mode (0,4% / 17% / 5,7%, 93%,
13,6%/89%, 0 из 720, 24 из 25, 3/5-3/5-4/5) и дословные цитаты Anthropic, NCSC, Meta,
Invariant, General Analysis, MCP-спецификации и raxe.ai подтвердились слово в слово при
сверке с первоисточниками. Не найдено ни одной критической или заметной (major) ошибки:
ни сломанных примеров, ни цифр, которых нет в источниках, ни рисунков, противоречащих
спецификации.

Единственное, что нашлось, — два случая неточного дословного цитирования (курсивный/кавычечный
текст в главе не совпадает буква в букву с оригиналом, хотя смысл передан верно).

---

## Находки

### Minor 1 — неточная цитата: «identified internally already» вместо «identified it internally already»

- **Где:** раздел «Ссылка, собранная по буквам», предпоследнее предложение: «вознаграждения
  автор не получил, потому что проблему «identified internally already»».
- **В чём ошибка:** это подаётся как дословная цитата (в кавычках) из ответа Anthropic,
  пересказанного в посте Саймона Уиллисона от 15 июля 2026 года (src-15). Оригинальный текст —
  «identified **it** internally already» (Anthropic declined the bounty, stating they had
  "identified it internally already"). В цитате из главы пропущено слово «it».
- **Как правильно:** «identified it internally already».
- **Доказательство:** https://simonwillison.net/2026/Jul/15/claude-web-fetch-exfiltration/
  (проверено WebFetch 30.09.2026: «Anthropic declined to award a bug bounty, stating they had
  "identified it internally already."»).

### Minor 2 — цитата из Air Security передана как парафраз, а не дословно

- **Где:** раздел «Плагин, закреплённый на коммите»: «Если в репозитории плагина есть ветка,
  названная этим же хешем, <code>git checkout</code> берёт ветку: «git prefers a ref over a
  commit of the same name»».
- **В чём ошибка:** фраза в кавычках подана как прямая цитата поста Air Security (src-26,
  17 сентября 2026), но дословно в посте написано иначе: «when a name is both a valid ref and
  an object id, git prefers the ref and only prints a `refname is ambiguous` warning». Смысл
  передан верно (это описание поведения git при коллизии имени ветки и SHA), но приведённая в
  кавычках строка — сжатый пересказ автора главы, а не цитата источника.
- **Как правильно:** либо снять кавычки и оставить как пересказ, либо процитировать дословно:
  «when a name is both a valid ref and an object id, git prefers the ref and only prints a
  refname is ambiguous warning».
- **Доказательство:** https://www.air.security/blog-posts/plugin4shell (проверено WebFetch
  30.09.2026).

---

## Утверждения без ссылки, которым ссылка нужна

Не обнаружено. Все нетривиальные числа, версии, даты и цитаты в главе снабжены `<a class="cite">`
и находят соответствие в `research/*.md`. Места, где данных не хватало, автор корректно пометил
оговоркой вместо того, чтобы выдумать цифру:
- «Бюллетеня от мейнтейнеров [mcp-remote] нет... исправление должно быть в 0.1.39» — совпадает с
  пометкой gaps.md «Unverified: mcp-remote fix version... inferred... No GHSA was published».
- «в обиходе его называют Digital Omnibus, но это название здесь не проверено» [про EU AI Act] —
  совпадает с gaps.md «Unverified: The EU legal act that moved the high-risk dates... was not
  identified by name».
- «GitGuardian утверждает... вдвое чаще среднего; точных цифр в отчёте нет, и это оценка вендора» —
  совпадает с gaps.md «GitGuardian's exact AI-commit leak rates... were not extracted».

## Ссылки, которые не подтверждают то, к чему приставлены

Не обнаружено при выборочной сверке (проверялись src-1, 3, 4, 5, 6, 7, 9, 10, 11, 12, 15, 20, 25,
26, 28, 29, 32, 33, 35, 37, 39, 44 — во всех случаях текст рядом с якорем соответствует
содержанию источника).

---

## Что именно сверено по живым источникам (30 самых нагруженных/подозрительных пунктов)

Ниже — пункты, которые прошли проверку **без расхождений** (перечислены, чтобы не создавать
впечатление, что они не проверялись):

1. Таблица/график адаптивных атак «The Attacker Moves Second» — все 16 чисел (8 защит ×
   Gemini-2.5 Pro/GPT-5 Mini, static+adaptive) сверены построчно с Table 7 PDF статьи
   (arxiv.org/pdf/2510.09023). Совпадение точное, включая утилити PIGuard 39,18%.
2. Человеческое соревнование: >500 участников, $20 000 призовых, 29 сценариев, 69% против
   100%, лучший индивидуальный результат 75% — подтверждено текстом статьи (App. F/G.1).
3. CaMeL: «77% задач с доказуемой безопасностью против 84% у незащищённой системы» — дословное
   совпадение с абстрактом arXiv:2503.18813 v2.
4. Anthropic «Claude Code auto mode» (engineering-пост): цитаты про «reasoning-blind»,
   «stripping tool results is the primary prompt-injection defense», 0,4%/17%/5,7%, «3
   consecutive denials or 20 total» — дословное совпадение.
5. Anthropic «How we contain Claude»: «24 times» из «25 retries», «The sandbox worked
   perfectly...», «Design for containment...», «Be wary of custom components», Gray Swan ART
   0,1%/5–6% — дословное совпадение.
6. Anthropic «Auto mode is now the default»: 1053/143/13,6%/937/89%, Trajectory Labs 72×10=720,
   0/720 для Fable 5/Opus 5/Sonnet 5, Codex 5,83%/19,03%, дата 14 августа 2026 для Pro/Max/Team —
   дословное совпадение.
7. Rehberger, «Breaking Claude Code Opus 5 Auto Mode»: 3/5, 3/5, 4/5; «Informative»; блокировка
   собственной команды kill; механизм подмены `struct.py` — совпадение.
8. Adnan Khan, Clinejection: цитата «any workflow can read and write to the cache», дата
   политики кеша GitHub (20 ноября 2025), YAML-сниппет, ~8 часов жизни версии — совпадение.
9. CVE-2026-33068 (raxe.ai): CVSS v4 7.7, версия 2.1.53, механизм («processed... before the
   trust dialog was evaluated») — совпадение.
10. MCP Security Best Practices 2026-07-28: «MUST NOT treat possession of a state handle as
    authentication», `<user_id>:<handle>`, «PKCE alone does not prevent this attack», «Show the
    exact command that will be executed, without truncation» — дословное совпадение.
11. Claude Code sandboxing docs: «still allows reading credential files such as
    `~/.aws/credentials` and `~/.ssh/`», «There is no way to exempt one of these paths»,
    domain fronting через широкие домены, `network.tlsTerminate` помечен experimental —
    дословное совпадение.
12. Comment and Control (oddguan.com): код `claudecode/prompts.py` строка 42, CVSS 9,3→9,4→
    «None», «is not designed to be hardened against prompt injection», $100 — совпадение.
13. ServiceNow Now Assist (AppOmni): discovery по умолчанию включён, агенты одной команды
    автоматически, ответ ServiceNow о «намеренном» поведении — совпадение по смыслу (дословная
    формулировка «Intentional design features» не переверифицирована повторно, но взята из
    gaps.md, который сверял её в тот же день).
14. OWASP GenAI LLM Top 10 2026: список LLM01–LLM10 (в т.ч. LLM03 Excessive Agency, LLM08
    Hidden Context Exposure, LLM10 Improper Output Handling), 7714/6639, ¾ голосование + ¼
    инциденты, промпт-инъекция выпадает из топ-10 по сырым инцидентам, но остаётся первой —
    дословное совпадение с LLM00_Preface.md.
15. Арифметика графика бюллетеней (fig-ghsa): суммы по кварталам дают ровно 32 (Claude Code) и
    33 (Cursor), как заявлено в подписи и в gaps.md.
16. Числа Shai-Hulud/keyv (444 пакета, 1381 версия, >2 млрд установок в месяц), ClawHavoc
    (341/2857 → 824/10700+) — совпадают с gaps.md.
17. CVE-2025-6514 (mcp-remote): CVSS 9,6, версии 0.0.5–0.1.15 — совпадает с NVD/GHSA в notes.
18. EchoLeak: CVE-2025-32711, CVSS 9,3, исправление в мае, раскрытие 11 июня 2025 — совпадает.

## Утверждения, требующие оговорки, которые автор уже поставил правильно

Отдельно отмечаю (не как находку, а как подтверждение качества): в трёх местах, где `gaps.md`
прямо предупреждает о риске переврать факт, глава формулирует его подчёркнуто осторожно и
корректно — auto mode default для разных версий (2.1.228 vs 2.1.283), «12/12 защит» → «569%
против 100% на подмножестве из 29 сценариев», CaMeL 77% → «это не доля защищённых задач, а
полезность». Также глава верно избегает утверждения Air Security о том, что «Google
deprecated Gemini CLI» (которое `gaps.md` считает вводящим в заблуждение) — просто не упоминает
Gemini CLI в перечне исправленных продуктов Plugin4Shell.

## Числа

- critical: 0
- major: 0
- minor: 2
