# Рецензия: глава 14 «RAG-системы» — код, протокольные примеры, рисунки

Дата ревью: 2026-09-30. Проверено: все 17 блоков кода (`<script class="code">`), все 5 графиков
(`<script class="chart">`), все 16 рисунков (8 mermaid, 2 рукописных SVG, 2 HTML-схемы, 5 графиков)
через `node tools/qa.mjs 14-rag --shots` + просмотр каждого скриншота, и сверка формул/полей/цифр с
`research/spec.md`, `research/gaps.md`, `research/field.md`. `qa.mjs` вернул `ISSUES none`
(якоря, дублирующиеся id, JSON графиков, ужатые mermaid-схемы, переполнение вправо — всё чисто).

## Итог

- **Critical: 0**
- **Major: 1**
- **Minor: 0**

## Находки

### Major — блок «Faithfulness в новом API RAGAS» падает при запуске как обычный `.py`-файл

**Где:** код `data-title="Faithfulness в новом API RAGAS, дословно из документации"`, секция
`#eval`, строки 758–768 `index.html`.

**Что не так:** блок использует `await` на верхнем уровне модуля:

```python
from ragas.metrics.collections import Faithfulness
scorer = Faithfulness(llm=llm)
result = await scorer.ascore(...)
```

`python3 -m py_compile` на этом блоке (извлечён как отдельный файл) падает:
`SyntaxError: 'await' outside function`. Текст в дословно совпадает с VERBATIM-цитатой в
`research/gaps.md` (раздел G, источник [G24] — документация RAGAS), так что сам API вызван верно
и цитата не выдумана. Проблема не в фактах, а в том, что пример нигде не помечен как код,
рассчитанный на notebook/REPL с поддержкой top-level `await` (или обёртку в `asyncio.run`) —
а именно так и написан в самой документации RAGAS. Читатель книги — опытный бэкендер на Python,
который по умолчанию сохраняет такой блок как `.py`-скрипт; при запуске получит не ошибку логики,
а синтаксическую ошибку в третьей строке, что для книги, которая специально предупреждает о таких
ловушках в других местах (например, `gemini-embedding-2`), — методическая недоработка именно
здесь.

**Доказательство:**
```
$ python3 -m py_compile block_16_python.py
  File "block_16_python.py", line 4
    result = await scorer.ascore(
             ^^^^^^^^^^^^^^^^^^^^
SyntaxError: 'await' outside function
```

**Как исправить:** добавить одну строку текста рядом с блоком («пример из документации RAGAS
рассчитан на notebook с поддержкой top-level `await`; в обычном скрипте оберни вызов в
`asyncio.run(scorer.ascore(...))` внутри `async def main()`») — без этого редактировать сам код не
обязательно, раз он дословный.

## Проверено и подтверждено верным (без находок)

- **JSON и JSON-графики.** Все 3 «сырых» JSON-блока (`search_result` tool_result, ответ-цитата
  `search_result_location`, описание инструмента `search_docs`) и `golden.jsonl` разбираются
  `json.loads` без ошибок; поля (`type`, `source`, `title`, `content`, `citations.enabled`,
  `search_result_index`, `start_block_index`, `end_block_index`) совпадают посимвольно с VERBATIM-
  цитатами в `research/gaps.md` (раздел F, [G32]). Все 5 `application/json class="chart"` — валидный
  строгий JSON без комментариев и висящих запятых.
- **Python-код.** Блоки Docling (`DocumentConverter`), Qdrant weighted RRF
  (`models.RrfQuery(rrf=models.Rrf(weights=…))`), LlamaParse (`client.parsing.create(tier="agentic",
  version="latest", file_id=…)`) и `retrieval_eval.py` (recall@k / MRR / nDCG@k) компилируются
  (`py_compile`) без ошибок; имена методов и параметров сверены с `research/gaps.md`/`spec.md` и
  совпадают. Формулы recall/MRR/nDCG в `retrieval_eval.py` реализованы корректно (бинарная релевантность,
  nDCG нормирован на идеальный DCG).
- **SQL-блоки** (pgvector-python RRF, `pg_textsearch` BM25-индекс, итеративный HNSW-скан с
  `binary_quantize`) — посимвольно совпадают с VERBATIM-цитатами `research/gaps.md` (разделы C и
  «pgvector filtering»).
- **Наброски помечены как наброски** ровно там, где нужно: `tool_result` с двумя `search_result`
  (составлен автором, не из API-лога) и описание инструмента `search_docs` — оба с `data-title="Набросок: …"`,
  остальные блоки, помеченные «дословно», действительно совпадают с исходником.
- **Числовой пример RRF (рис. 14.7, `#fig-rrf-k`).** Пересчитан вручную по формулам из
  `research/gaps.md`: при k=60 (ранги с единицы) — C = 1/64+1/64 = 0,03125 ≈ 0,031, A=E=1/61≈0,0164,
  B=F=1/62≈0,0161, D=G=1/63≈0,0159; при k=2 (ранги с нуля, вес 1) — A=E=1/2=0,500, C=1/5+1/5=0,400,
  B=F=1/3≈0,333, D=G=1/4=0,250. Все восемь чисел на рисунке и в тексте — точный результат этих
  формул, ошибок нет.
- **Все 16 рисунков** просмотрены на скриншотах (`_qa/14-rag-code/*.png`):
  - `fig-pipeline`, `fig-failure-points`, `fig-hybrid-seq`, `fig-agentic-loop`, `fig-graphrag`,
    `fig-lc-decision`, `fig-ragas`, `fig-acl` (mermaid) — участники, направление стрелок, порядок
    сообщений и подписи соответствуют описанному в тексте механизму и первоисточникам (Qdrant RRF,
    GraphRAG Global/Local/DRIFT/Basic, ACL pre-filter vs post-filter из `gaps.md` раздела K).
  - `fig-chunk-context`, `fig-maxsim` (рукописный SVG) — текст не вылезает за блоки, не пересекается
    со стрелками, соответствует подписи.
  - `fig-rrf-k` (HTML `.versus`) — см. числовую проверку выше.
  - `fig-chroma`, `fig-cookbook`, `fig-ru-mteb`, `fig-rerank-gain`, `fig-browsecomp` (графики) —
    все значения на рисунках сверены построчно с `research/gaps.md` (разделы B, D, E и таблица
    «Numbers») и совпадают с точностью до округления, заданного `decimals` в JSON.
- **Цитаты и числа в прозе**, отобранные для отдельной сверки как наиболее рискованные (могли быть
  придуманы или искажены): цитаты Бориса Черны (Latent Space, HN), th0ma5 (HN), мейнтейнера Semble,
  инженера Discourse, README pgvector/Qdrant/GraphRAG, EchoLeak kill chain, MTEB-Борда и таблица
  MTEB(rus) — все совпадают дословно или по смыслу с `research/gaps.md` и `research/field.md`.

## Не проверялось независимо (вне роли ревью кода/рисунков)

Актуальность версий, дат и рангов моделей на 30 сентября 2026 года взята из заметок `spec.md`/`gaps.md`
как есть (это задача авторов заметок, не код-ревью); WebSearch/WebFetch не понадобился, так как для
каждого факта, использованного в коде, JSON-схемах и подписях к рисункам, в заметках нашлась прямая
VERBATIM- или COMPOSED-цитата с указанием источника.
