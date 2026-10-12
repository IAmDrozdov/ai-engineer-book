# Глава 14. RAG-системы — план

Лид: Claude Code не держит индекса репозитория, хотя ранняя версия держала (Voyage, off-the-shelf RAG).
Команда выкинула индекс ради glob/grep. А у читателя корпус из PDF-регламентов на русском, где grep не
за что зацепиться. Вопрос главы: когда индекс нужен и как его собрать так, чтобы он не врал.

## Разделы

1. `anatomy` «Что в итоге уходит в модель». Начало: настоящий запрос Messages API с блоками
   `search_result` внутри `tool_result` и ответ с `search_result_location`. Главное: весь конвейер
   существует ради выбора 5–20 блоков в этом запросе. Две половины конвейера (индексация / запрос).
   Семь точек отказа Barnett et al. (FP1–FP7) приколоты к стадиям. Хронология: что сдвинулось с апреля 2026.
2. `parsing` «PDF — не текст». Начало: цитата th0ma5 о переставленной цифре, которая «убивает проект».
   Docling (код VERBATIM, 2.131.0), LlamaParse переехал в `llama-cloud` (старый SDK снят с поддержки
   1 мая 2026), Unstructured, волна VLM-OCR и лицензии (MinerU AGPL). Баг Docling с потерей иерархии
   заголовков ломает чанкинг ниже по течению. Выбор: Docling локально, VLM-путь только для сканов.
3. `chunking` «Чанк теряет документ». Начало: «The company's revenue grew by 3%…» — чья выручка?
   Замер Chroma (800/400 — худший, recursive 200/0 — сильный базлайн), дефолт OpenAI file_search 800/400,
   семантический чанкинг не окупается. Contextual retrieval: промпт VERBATIM, цена, условия заголовочных
   цифр (Gemini Text 004, 1−recall@20, rerank 150→20), воспроизведение в cookbook (гибрид на коде не дал
   ничего). Late chunking, voyage-context-4. Рекомендация и условие, при котором она неверна.
4. `embeddings` «Эмбеддинг под русский корпус». Начало: Qwen3-Embedding-8B, которого туториалы зовут №1,
   на 30 сентября 2026 четвёртый; MTEB ранжирует по Борда. MTEB(rus, v1.1): Giga-Embeddings-0826 лидер;
   колонка retrieval расходится с общим рангом (bge-m3 30-й по среднему, но 0,752 по retrieval).
   Асимметричные префиксы (Giga, gemini-embedding-2 и его ловушка с агрегированием), Matryoshka vs PCA,
   лимит 2000 измерений pgvector, храни id модели рядом с вектором, лицензии.
5. `hybrid` «BM25 рядом с вектором». Начало: запрос с кодом ошибки, который dense-вектор размывает.
   RRF: формула, k=60 из пилотного прогона 2009 года, у Qdrant k=2 и ранги с нуля — посчитанный пример,
   где порядок меняется. Qdrant запрос VERBATIM, веса без eval-набора не трогать, pgvector RRF SQL VERBATIM
   и то, что `ts_rank_cd` не BM25; pg_textsearch. Фьюжн переставляет только объединение кандидатов.
6. `rerank` «Реранкер не достанет то, чего нет в кандидатах». Начало: Reranker Tax на SciFact (BM25
   0,662 за 0,11 мс, MiniLM-реранкер почти ничего не дал). Против: Anthropic 49→67%. Условия разные.
   rerank-3 (вышел в день написания), выигрыш тем больше, чем слабее первая стадия. Лимиты API,
   калибровка скоров. Порядок работ: сначала recall@150, потом реранкер.
7. `query` «Когда переписать вопрос». Начало: BRIGHT — лидер MTEB падает с 59,0 до 18,3 nDCG@10 на
   вопросах, требующих рассуждения. HyDE, Query2doc, step-back, multi-query/RAG-Fusion (уводит от темы),
   декомпозиция против FP7. Цена — лишний вызов модели до поиска.
8. `agentic` «Агент ищет сам: grep, индекс или оба». Начало: полная цитата Cherny (Latent Space), «mostly
   vibes». Cursor: +12,5% с семантикой в A/B, индекс на Merkle-деревьях, а в документации на 30 сентября
   2026 — «does not store embeddings». Исследования: 2605.15184 (LongMemEval, не код!), entire.io
   (скорость не важна, ранжирование важно), Semble и споры, BrowseComp-Plus (BM25 55,9 → dense 70,1).
   Вывод: агентный цикл ортогонален индексу, индекс — один из тулов. Набросок тула, отдающего
   `search_result`.
9. `graphs-pages` «Графы и страницы-картинки». Начало: README GraphRAG — «largely in maintenance mode».
   Как устроен GraphRAG, LazyGraphRAG 0,1%, GraphRAG-Bench «frequently underperforms», LightRAG
   (оценки LLM-судьёй), HippoRAG 2 → глава 11, тред «went back to SQL». ColPali: страница как картинка,
   MaxSim, colpali-engine снят в пользу Sentence Transformers v6, Morphik о таблицах, цена по времени.
10. `long-context` «Длинный контекст, кеш или поиск». Начало: правило Anthropic 2024 года про 200 тыс.
    токенов. Окно 1 млн (глава 2), context rot, Self-Route, LaRA «no silver bullet», CAG.
    Дерево решений.
11. `stores` «Где держать векторы». Начало: «The Case Against pgvector» и ответ инженера Discourse.
    Лимиты pgvector, фильтр после HNSW (4 строки из 40), iterative scan. Qdrant/Weaviate/Milvus/Pinecone/
    turbopuffer на сентябрь 2026. Управляемый RAG (OpenAI vector stores, Gemini File Search). Таблица с
    выбором.
12. `eval` «Как понять, что стало лучше». Начало: вопрос «помог ли реранкер» без золотого набора не
    решается. recall@k, MRR, nDCG — код, который запускался. RAGAS: формулы как отношения утверждений;
    репозиторий переехал, релизов с января нет, старый API снят. Синтетика и её перекос. → глава 17.
13. `production` «Права, свежесть, цитаты, инъекции, деньги». Начало: ACL как пре-фильтр внутри ANN,
    иначе недодача и утечка; утечка через статистику BM25 и общий граф HNSW. Свежесть и переэмбеддинг.
    Цитаты через `search_result`. Инъекции: Willison (случайная), EchoLeak (zero-click), PoisonedRAG 90% →
    глава 16. Стоимость и задержка.

## Рисунки (15)

1. `fig-pipeline` — mermaid flowchart: индексация и запрос, подписанные стрелки (что передаётся).
2. `fig-failure-points` — mermaid flowchart: FP1–FP7 на стадиях.
3. `fig-chunk-context` — рукописный SVG: наивный чанк / contextual retrieval / late chunking.
4. `fig-chroma` — hbar: IoU по чанкерам, recall в подписи.
5. `fig-cookbook` — line: Pass@5/10/20 по четырём стадиям воспроизведения cookbook.
6. `fig-ru-mteb` — hbar: MTEB(rus) retrieval по моделям.
7. `fig-hybrid-seq` — mermaid sequence: приложение → Qdrant (prefetch ×2, RRF) → реранкер → Claude.
8. `fig-rrf-k` — HTML versus: один и тот же вход, k=60 и k=2, разный порядок.
9. `fig-rerank-gain` — hbar: выигрыш rerank-3 в зависимости от первой стадии.
10. `fig-agentic-loop` — mermaid sequence: агент, grep, поиск по доке, `search_result`.
11. `fig-browsecomp` — hbar: BrowseComp-Plus по ретриверам.
12. `fig-graphrag` — mermaid flowchart: индексация GraphRAG и четыре режима поиска.
13. `fig-maxsim` — рукописный SVG: late interaction, MaxSim по патчам страницы.
14. `fig-lc-decision` — mermaid flowchart: промпт+кеш / RAG / Self-Route.
15. `fig-ragas` — mermaid flowchart: какую пару артефактов сравнивает каждая метрика.
16. `fig-acl` — mermaid flowchart: пре-фильтр против пост-фильтра.

## Что уходит в соседние главы ссылкой

- Окно контекста, context rot, кеш префикса → глава 2.
- Поиск как инструмент, что возвращать модели → глава 3.
- MCP-сервер для поиска → глава 5.
- HippoRAG как память, «вернулись к SQL» для памяти → глава 11.
- Устройство Claude Code / Cursor, Explore-сабагент → глава 12.
- ACL/авторизация как плюмбинг → глава 15.
- Инъекции как атака, EchoLeak подробно → глава 16.
- Evals в целом, LLM-судья → глава 17.

## Тесты по плану

- Анкета «что → зачем → как → плюсы/минусы → вывод»: нет. Разделы 2, 3, 4, 6, 9, 11 начинаются со сбоя или
  с опровержения расхожего утверждения; 5 и 7 — с запроса, который ломает наивный вариант; 8 — со спора.
- Первые предложения: список читается как набор фактов и цитат, а не конспект (цитата th0ma5, «чья выручка»,
  «№1 — четвёртый», «Reranker Tax»…). Сравнения есть (6: два замера про реранкер; 8: Cursor против Claude Code;
  11: Jacobs против Discourse), проверки расхожих утверждений есть (4, 6, 8, 9).
- Где провал: семантический чанкинг, GraphRAG, «grep побеждает» на LongMemEval, Reranker Tax, RAGAS без
  релизов, дефолт 800/400, Docling теряет заголовки, pgvector на проде.
- Риск: середина (разделы 5–9) плотная и однородная по ритму — чередовать длинные разборы с короткими.
