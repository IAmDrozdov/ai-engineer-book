# Фактчек главы 14 «RAG-системы» (часть «Архитектура»)

Дата проверки: 30 сентября 2026. Проверено: `index.html` целиком против `research/gaps.md`,
`research/spec.md`, `research/practice.md`, `research/field.md`, затем ~20 самых нагруженных
утверждений (числа, версии, цитаты) — по живым первоисточникам (WebFetch/curl на официальные
доки, блоги вендоров, README на GitHub, NVD API, arXiv, alex-jacobs.com, eoinhurrell.com,
simonwillison.net, trychroma.com, cursor.com, anthropic.com).

**Итог:** глава фактически очень плотная и в подавляющем большинстве мест точная — почти все
числа, даты и дословные цитаты, которые удалось сверить с первоисточником напрямую, совпали
буквально (включая нетривиальные вещи вроде пересчёта формулы RRF при k=60 и k=2, шести строк
таблицы чанкинга Chroma, CVE-даты EchoLeak, цитаты Бориса Черни, точных чисел Cursor A/B и
Voyage rerank-3). Найдено две major-неточности и одна minor.

---

## Critical

Не найдено. Сломанных примеров, чисел, противоречащих первоисточнику по существу, или рисунков,
расходящихся со спецификацией, при проверке не обнаружено.

## Major

### 1. «Выгружает в Markdown, HTML или JSON без потерь» — Docling не называет Markdown/HTML лишённым потерь, и глава сама себе противоречит через два абзаца

**Цитата из главы** (раздел «Docling как вариант по умолчанию»): «...собирает результат в одно
представление `DoclingDocument` и выгружает его в Markdown, HTML или JSON без потерь».

**В чём ошибка.** README Docling называет «lossless» только JSON-экспорт, а не Markdown/HTML:
«Various export formats and options, including Markdown, HTML, WebVTT, DocLang, DocTags and
**lossless JSON**» (raw.githubusercontent.com/docling-project/docling/main/README.md, строка 38,
проверено 30.09.2026). Экспорт в Markdown как раз лишён части структуры — это признаёт и
Docling, и сама глава: двумя абзацами ниже написано «В трекере Docling лежат вполне приземлённые
жалобы: при выгрузке в Markdown теряется иерархия заголовков» со ссылкой на источник 7. То есть
глава сначала утверждает, что Markdown-экспорт «без потерь», а затем сама же приводит пример
потери (иерархия заголовков) в том же экспорте.

**Как правильно.** «Без потерь» в терминологии Docling относится только к JSON-представлению
`DoclingDocument`; Markdown и HTML — упрощённые проекции, которые теряют часть структуры
(например, уровни вложенности заголовков, bounding-box'ы). Формулировку стоит сузить: «...
выгружает его в Markdown, HTML или лишённый потерь JSON».

**Доказательство:** https://raw.githubusercontent.com/docling-project/docling/main/README.md
(строка 38: "...including Markdown, HTML, WebVTT, DocLang, DocTags and lossless JSON").

---

### 2. IoU в главе описан как Precision, а не как Intersection over Union

**Цитата из главы** (раздел «Размер и перекрытие: что намерили»): «...мерили на уровне токенов:
recall — какая доля нужного текста попала в найденное, и **IoU — какая доля найденного текста
оказалась нужной**». Дальше в подписи к рисунку `fig-chroma`: «...IoU (доля полезного текста в
найденном)» — то же самое определение повторено ещё раз, и число вынесено в заголовок графика.

**В чём ошибка.** Описание «какая доля найденного текста оказалась нужной» — это определение
**Precision** (пересечение / найдено), а не IoU. Сама статья Chroma прямо вводит IoU как отдельную,
третью метрику: «we introduce a new measure of performance, based on the **Jaccard similarity
coefficient** at the token level, which we refer to as **Intersection over Union (IoU)**... the
IoU as a measure of how well the bounding boxes of the retrieved chunks overlap with the bounding
boxes of the relevant tokens» — то есть IoU = пересечение / **объединение** найденного и нужного
текста, а Precision (отдельная колонка в той же таблице Chroma) = пересечение / найдено. Это две
разные метрики с разными числами: в самой таблице Chroma есть колонки Recall, Precision,
Precisionₒ и IoU одновременно, они не совпадают числом (например, для Recursive 200/0: Precision
7,0, IoU 6,9 — близко, но не то же самое; для Cluster 200: Precision 8,0, IoU тоже 8,0 в этой
конкретной строке, но это совпадение по строке, а не по определению).

**Почему это важно.** Числа на графике `fig-chroma` (8,0 / 6,9 / 3,9 / 1,5 / 1,5 / 1,4) —
корректные значения именно IoU из таблицы Chroma, они не выдуманы. Ошибка — не в цифрах, а в
объяснении, что они означают: читателю, который попробует своими словами пересказать или
реализовать «IoU» по этому описанию, воспроизведёт Precision.

**Как правильно.** IoU = |пересечение найденного и нужного текста| / |объединение найденного и
нужного текста| — сочетает recall и precision в одну величину (аналог IoU из компьютерного
зрения, buttonbox-overlap). Precision (доля найденного текста, оказавшаяся нужной) — отдельная,
третья метрика в той же таблице Chroma, не заменяющая IoU.

**Доказательство:** https://www.trychroma.com/research/evaluating-chunking (раздел, вводящий
метрику: «...based on the Jaccard similarity coefficient [11] at the token level, which we refer
to as Intersection over Union (IoU) for short, as well as evaluating recall and precision at the
token rather than document level»), проверено 30.09.2026.

## Minor

### 3. Цитата OWASP LLM08:2025 неточна — пересказ выдан за дословную цитату

**Цитата из главы** (раздел «Права, свежесть, инъекции и деньги»): «Первая мера в списке —
«fine-grained access controls with permission-aware vector stores»».

**В чём неточность.** Дословный текст OWASP GenAI Security Project, LLM08:2025 (раздел
«Prevention and Mitigation Strategies», пункт 1 «Permission and access control»): «**Implement**
fine-grained access controls **and** permission-aware vector **and embedding** stores». Глава (и
исходно `gaps.md`, строка 583, откуда цитата взята без пометки VERBATIM) убрала «Implement»,
заменила «and» на «with» и «vector and embedding stores» на «vector stores». Смысл почти не
искажён, но по правилам AUTHORING.md (§4: «Примеры протокольных сообщений бери из спецификации...
цитаты приводи дословно») текст в кавычках-ёлочках должен быть побуквенно точным.

**Как правильно:** «Implement fine-grained access controls and permission-aware vector and
embedding stores».

**Доказательство:** https://genai.owasp.org/llmrisk/llm082025-vector-and-embedding-weaknesses/
(раздел «Prevention and Mitigation Strategies», пункт 1), проверено 30.09.2026.

---

## Утверждения без ссылки, которым ссылка нужна

Не найдено ни одного нетривиального числа, даты, версии или цитаты без сопровождающей `<a
class="cite">`. Общие технические утверждения без ссылок (например, «PDF хранит не абзацы и
таблицы, а глифы с координатами на странице», определения RRF/BM25 на словах, генерическое
описание гибридного поиска) — общеизвестные факты уровня учебника, ссылка для них по правилам
AUTHORING.md не требуется.

## Ссылки, не подтверждающие то, к чему приставлены

- **Источник 42** (OWASP LLM08:2025) подтверждает мысль о permission-aware vector stores по
  существу, но не дословную цитату, которую к нему приставили — см. находку Minor #3 выше.

Других расхождений «ссылка ↔ текст рядом с ней» при сверке не найдено: во всех проверенных
случаях (Boris Cherny/HN, Latent Space, Anthropic contextual retrieval, Voyage rerank-3, Cohere
changelog, Qdrant hybrid-queries, pgvector README, GraphRAG README, Cursor docs, Chroma chunking,
CVE-2025-32711/NVD, BRIGHT/arXiv, Cursor semsearch, Alex Jacobs pgvector post, Simon Willison,
Docling issues) цифры и цитаты в тексте главы совпали с содержимым источника, на который она
ссылается.

## Что проверено и подтверждено точным (чтобы не выглядело, что проверка не проводилась)

Ниже — самые нагруженные утверждения, сверенные напрямую с живым первоисточником и оказавшиеся
верными дословно или по числу:

- Цитата Бориса Черни на HN (item 43164253) — «Claude Code doesn't use RAG currently. In our
  testing we found that agentic search out-performed RAG for the kinds of things people use Code
  for» — совпадает дословно.
- Anthropic, "Introducing Contextual Retrieval": $1,02 за млн токенов документов; −35% (5,7%→3,7%),
  −49% (→2,9%), −67% (с реранкером); порог «меньше 200 000 токенов — клади в промпт»; пример про
  «revenue grew by 3%» — все числа и формулировки совпадают буквально.
- Voyage `rerank-3`/`rerank-3-lite` (blog.voyageai.com/2026/09/30/rerank-3/): контекст 32K,
  прибавки +2,72%/+3,02%/+0,96%, LongEmbed +13,84% над Cohere v4.0 Pro, 95 датасетов/9 доменов/51
  многоязычный, список бейзлайнов (Cohere v4.0, Qwen3-Reranker-8B, Jina Reranker v3.5,
  mxbai-rerank-large-v2, NVIDIA Llama-Nemotron Rerank 1B v2) — совпадают.
- Cohere changelog: Embed 5 — Matryoshka [256…2048], 128K контекст, float/int8/binary,
  100+ языков; Rerank v4.0 — 32K контекст — совпадает с главой.
- Qdrant hybrid-queries: формула RRF `score = Σ 1/(k + r_d)`, k=2 по умолчанию, цитаты «Without
  an eval set: leave weights at the default (1.0, 1.0)...» и «Neither dominates the other in
  general...» — совпадают дословно.
- pgvector README: индексные пределы HNSW/IVFFlat — 2000 измерений для `vector`, 4000 для
  `halfvec`, 64000 для `bit`; цитата про `hnsw.ef_search` = 40 и «only 4 rows will match on
  average»; версия 0.8.6 — совпадает (важно не путать с лимитом на *хранение* в 16000 измерений,
  который в главе не упомянут и не должен был).
- GraphRAG README: «This project is largely in maintenance mode, and won't be accepting new PRs
  or implementing new features» — совпадает дословно.
- Cursor docs (cursor.com/docs/agent/tools/search): «Cursor does not upload file paths or code to
  build a search index, and it does not store embeddings of your codebase for search» —
  совпадает дословно.
- Cursor blog semsearch: +12,5% (6,5–23,5%), retention +0,3% (+2,6% на репозиториях от 1000
  файлов), −2,2% недовольных уточнений без семантики — совпадает дословно с числами главы.
- Chroma «Evaluating Chunking Strategies»: все шесть строк на графике `fig-chroma` (Cluster 200:
  87,3/8,0; Recursive 200/0: 88,1/6,9; LLM GPT-4o ~240: 91,9/3,9; Recursive 800/400: 85,4/1,5;
  Kamradt ~660: 83,6/1,5; TokenText 800/400: 87,9/1,4) — совпадают с таблицей на trychroma.com
  вплоть до десятых.
- BRIGHT (arXiv 2407.12883): SFR-Embedding-Mistral 59,0 MTEB → 18,3 nDCG@10 на BRIGHT, «up to 12.2
  points» — совпадает дословно.
- CVE-2025-32711 (NVD API): опубликована 2025-06-11, описание «Ai command injection in M365
  Copilot allows an unauthorized attacker to disclose information over a network» — совпадает.
- Alex Jacobs, «The Case Against pgvector»: «a starting point at best» про формулу rows/1000,
  10+ ГБ RAM и «hours» на построение HNSW — совпадает.
- Simon Willison, «Accidental prompt injection...»: цитата «a regular keyword-based search can
  return 0 results, but because embeddings search orders by similarity score it will ALWAYS
  return results» и история с «Pretend to be a witty gerbil» — совпадают.
- Docling issue #287 существует и действительно о потере иерархии заголовков при чанкинге —
  подтверждено.
- Anthropic docs "Context windows": 1M токенов — дефолт без бета-заголовка на моделях начиная с
  Sonnet 4.6/Opus 4.6 и новее — подтверждает фразу главы «у моделей Anthropic начиная с 4.6 окно
  по умолчанию — миллион токенов».
- Anthropic docs "Search results": схема `search_result`/`search_result_location`, «All active
  models... with the exception of Claude Haiku 3. No beta header is required» — совпадает
  дословно с главой.
- Eoin Hurrell, «The Reranker Tax»: 0,662 nDCG@10 / 0,11 мс на BM25; k=5/10 не побили бейзлайн;
  k=20 → 0,671 (+0,009) при ~225 мс (~2000×); потолок recall 0,72/0,77/0,82 — совпадает по всем
  ячейкам таблицы в главе.

Все внутренние сверки с заметками (`gaps.md`, `spec.md`, `practice.md`, `field.md`) — числа
Evis Drenova/Entire (fff/pgr), тред Semble (445 очков, «we don't claim end-to-end...», «Sonnet
4.6 seems to trust semble but Opus 4.7 less so»), пост Alex Jacobs (381 очко/137 комментариев),
цифры ColPali/ColQwen на ViDoRe (84,8/89,3/89,4), числа Jina late chunking (23,46→29,98;
33,25→33,84), воспроизведение cookbook (Pass@5/10/20 по четырём ступеням), RRF-арифметика в
рисунке `fig-rrf-k` (пересчитана вручную для k=60 и k=2 — оба столбца сходятся до третьего знака)
— тоже подтвердились без расхождений.
