# Chapter 14. RAG-системы — primary-sources notes

Lens: official specs, docs, changelogs, model cards, reference repos. Dated as of 2026-09-30.
Cross-links: chunking/embedding math overlaps with 02 (context engineering); reranker/tool
choices overlap with 03 (tool design); agentic-search-vs-index debate overlaps with 12 (deep
agents: Claude Code/Cursor) — this file covers it only from the retrieval-architecture angle;
eval metrics overlap with 17 (evals) — here only the RAG-specific metric definitions.

## TL;DR

- The RAG pipeline as shipped in 2026: ingest → parse (Docling/LlamaParse/Unstructured/VLM-OCR) →
  chunk → embed (dense, often hybrid with sparse/BM25) → index → retrieve (hybrid, RRF-fused) →
  rerank (cross-encoder or late-interaction) → generate, frequently with citations grounding.
  [S1][S2][S3][S4]
- Anthropic's Contextual Retrieval (2024-09-19, still the reference technique in 2026) prepends
  an LLM-generated 50–100-token context blurb to each chunk before embedding/BM25-indexing;
  measured on Claude 3 Haiku: −35% retrieval failure (embeddings only), −49% (embeddings+BM25),
  −67% (+reranking), baseline top-20 failure rate 5.7%→1.9%. Cost: $1.02 per million document
  tokens one-time with prompt caching. [S1]
- Hybrid search (dense + sparse/BM25, fused with RRF or a score-distribution fusion like Qdrant's
  DBSF) is now table stakes in every major vector DB's own docs, not just a research technique.
  [S4]
- Rerankers moved to new major versions in 2026: Cohere rerank-v4.0-pro/fast (multilingual,
  succeeding v3.5/v3.0), Voyage rerank-3/rerank-3-lite (32K-token context, up from 8–16K in
  rerank-1/2). [S28][S29]
- Embedding models also got a new generation in 2026: Voyage voyage-4/-4-large/-4-lite/-4-nano
  (nano is open-weight on HF) and Cohere embed-v5.0-pro/fast, both with flexible/Matryoshka-style
  dimensions and native int8/binary quantization output types. [S30][S31]
- Qwen3-Embedding-8B (Apache 2.0, June 2025) is a strong open multilingual baseline: MRL-native,
  4096-dim max (32–4096 configurable), 32K context, "100+ languages", #1 on the MTEB multilingual
  leaderboard as of 2025-06-05 with 70.58. [S12]
- Multimodal "retrieve the page as an image" (ColPali/ColQwen family, late interaction over ViT
  patches) is maturing into mainstream tooling: `colpali-engine` is now deprecated in favor of
  first-class ColPali-style `MultiVectorEncoder` support in Sentence Transformers v6. [S13]
- GraphRAG (Microsoft) is at v3.2.0 (2026), with Global/Local/DRIFT/Basic search modes and Leiden
  community detection; LightRAG (HKUDS) positions itself as a lighter dual-level (low/high-level
  keyword) graph+vector hybrid, beating GraphRAG on their own benchmark tables (e.g. Agriculture
  overall 54.8% vs 45.2%) with far less indexing compute; HippoRAG 2 (ICML'25, Feb 2025 arXiv)
  reframes graph RAG as "non-parametric continual memory," beating GraphRAG/RAPTOR/LightRAG on
  associativity/sense-making while indexing cheaper. [S5][S6][S34][S7]
- The "agentic grep vs vector index" debate has a concrete, dated 2025/2026 data point on the
  tool side: Cursor 2.1 (2025-11-21) shipped "Instant Grep" — literal grep made fast enough for
  agent loops — and Cursor's own docs now state plainly that Cursor "does not store embeddings of
  your codebase for search." [S25][S24 — note: Claude Code's own docs do not describe an
  embeddings/vector index at all; its documented model is tool-based (Bash/Grep/Glob), not
  semantic-index retrieval, consistent with the same industry direction]
- Anthropic's Citations API (GA in 2026, all active models) is a structured alternative to
  RAG-with-prompted-citations: it chunks the *source documents you pass in the request* (not a
  general corpus) into sentence-level (or custom-content-level) units, and returns
  `cited_text` + location indices that do not count as output tokens. This is a generation-side
  grounding primitive, not a retrieval system — it composes with your own top-k retrieval step.
  [S22]
- Long context vs RAG is not resolved by a single "context window" argument: Claude's context
  window is up to 1M tokens on current-generation models, but Anthropic's own docs flag "context
  rot" — accuracy/recall degrading with token count — as the reason curation (i.e., retrieval)
  still matters even when everything technically fits. [S23] The academic middle position is
  Cache-Augmented Generation (CAG, WWW'25): preload+KV-cache the whole (small, static) corpus and
  skip retrieval entirely, trading RAG's complexity for a context-size ceiling. [S35]
- Vector DB landscape in 2026 has consolidated around "hybrid + object storage or serverless" as
  the default pitch: Pinecone's new default index type stores dense vectors, sparse vectors and
  BM25 full text in *one* schema; turbopuffer is architected as object-storage-backed with NVMe
  caching (cold p50 874ms vs warm p50 14ms per 1M docs); Milvus 3.0 added new search algorithms
  (SINDI, Block-Max WAND/MaxScore) and external-table/lakehouse queries; Weaviate is at 1.39.x;
  pgvector is at 0.8.6 (2026-07-29), still Postgres-native with HNSW/IVFFlat only (no separate
  server). [S18][S14][S15][S16][S19]
- RAGAS remains the reference open-source RAG eval library; its metric taxonomy now spans
  retrieval (context precision/recall/entities recall, noise sensitivity), generation
  (faithfulness, response relevancy, multimodal variants), NVIDIA metrics (answer accuracy,
  context relevance, response groundedness), and agent/tool metrics (topic adherence, tool call
  accuracy/F1, goal accuracy) — RAG eval and agent eval have merged into one library's surface.
  [S8][S9]
- OWASP's GenAI Security Project Top 10 for LLM Applications (2025 edition) names
  **LLM08:2025 Vector and Embedding Weaknesses** as a first-class category alongside
  LLM01 Prompt Injection and LLM04 Data and Model Poisoning — i.e., RAG-specific attack surface
  (poisoned/malicious chunks, embedding-space attacks, missing per-chunk ACLs) now has its own
  standards-body line item, not just prompt injection folded in generically. [S27]

## Current state and versions (as of 2026-09-30)

| Component | Current version/state | Source |
|---|---|---|
| Docling | actively developed by LF AI & Data project (docling-project org); ships CLI, Python lib, `docling-serve` API server, MCP server; VLM pipeline via `granite_docling` (GraniteDocling-258M) | [S2] |
| Unstructured | product surface = Partition, Extract, Enrich, Chunk, Embed; "35+ connectors and 65+ file types"; SDK/API/MCP server access | [S3] |
| LlamaParse | 4 tiers: Fast, Cost Effective, Agentic (default), Agentic Plus; agentic tiers = VLM-based layout-aware OCR to markdown/text/JSON | [S36] |
| Anthropic Contextual Retrieval | unchanged technique since 2024-09-19; original cookbook notebook path (`anthropic-cookbook/skills/contextual-embeddings/guide.ipynb`) no longer resolves — the repo itself was renamed `anthropic/claude-cookbooks` | [S1][S37] |
| Voyage embeddings | generation 4: voyage-4-large / voyage-4 / voyage-4-lite / voyage-code-4 / voyage-4-nano (open-weight); 32K context; dims 256/512/1024(default)/2048; output dtypes float/int8/uint8/binary/ubinary | [S30] |
| Cohere embed | v5.0-pro / v5.0-fast (128K context, dims up to 2048 default) alongside v4.0 and v3.0 (English/multilingual, incl. Russian) | [S31] |
| Qwen3-Embedding | 0.6B/4B/8B sizes, Apache 2.0, MRL 32–4096 dims, 32K context, #1 MTEB multilingual (70.58) as of 2025-06-05 | [S12] |
| OpenAI embeddings | text-embedding-3-small/large (+legacy ada-002); dims 1536/3072 shortenable via `dimensions` param; MTEB ~62.3/64.6 | [S20] |
| Cohere Rerank | rerank-v4.0-pro/fast (multilingual), rerank-v3.5, rerank-english/multilingual-v3.0; 4096-token doc context | [S28] |
| Voyage Rerank | rerank-3 / rerank-3-lite (32K tokens); legacy rerank-2.5/2/1 (8–16K) | [S29] |
| BGE reranker | bge-reranker-v2-m3, cross-encoder, 0.6B params, Apache 2.0, 512-token max, multilingual (built on bge-m3) | [S32] |
| ColPali family | colpali-engine deprecated; ColQwen2.5 (v0.2) at 89.4 ViDoRe; community Qwen3-based variants 90.6+; migration path = Sentence Transformers v6 `MultiVectorEncoder` | [S13] |
| GraphRAG (Microsoft) | v3.2.0; search modes Global/Local/DRIFT/Basic; Leiden community detection | [S5][S6] |
| LightRAG | active dev; 2026.07 Word "Smart Heading"; 2026.05 RAG-Anything merge + 4 chunking strategies; 2026.03 OpenSearch backend | [S34] |
| HippoRAG | HippoRAG 2 current (ICML'25); index format is versioned via `index_manifest.json`, mismatched configs are rejected rather than silently mixed (as of the 2.0.0a5 dev line) | [S7] |
| RAGAS | stable docs at docs.ragas.io; "experiments-first" framework, dataset management + LLM-driven metrics | [S8][S9] |
| pgvector | 0.8.6 (2026-07-29); still HNSW + IVFFlat only, in-Postgres extension | [S19] |
| Qdrant | Query API with `prefetch` + `FusionQuery(fusion=RRF | DBSF)` is the documented hybrid pattern | [S4] |
| Milvus | 3.0.2 (2026-09-20); 3.0 line added external/lakehouse collections, SINDI/Block-Max WAND/MaxScore search algorithms, weighted RRF | [S15] |
| Weaviate | 1.39.5 (2026-08-04); N-2 support policy (1.39/1.38/1.37) | [S16] |
| Pinecone | new default "document indexes" combine dense + sparse + BM25 full-text in one schema; legacy "vector indexes" still exist | [S18] |
| turbopuffer | object-storage (S3) backed, NVMe-cached, Rust query nodes, SPFresh ANN index, WAL-based writes, vector+BM25+hybrid | [S14] |
| LanceDB | built on the Lance columnar/lakehouse format; vector+FTS+hybrid+rerank+SQL+versioned "time travel" tables; OSS + Enterprise tiers | [S17] |
| Anthropic Citations | GA, all active Claude models, available on API/Bedrock/Vertex/Foundry | [S22] |
| Claude context window | up to 1M tokens on current-gen models (Sonnet 5, Sonnet 4.6, Opus 5.x, Fable/Mythos lines); 200K on Sonnet 4.5/Haiku 4.5 and older | [S23] |
| OWASP LLM Top 10 | 2025 edition current; LLM08 = Vector and Embedding Weaknesses | [S27] |

## Timeline

- **2022-12-20** — HyDE paper (Gao et al., "Precise Zero-Shot Dense Retrieval without Relevance
  Labels") posted to arXiv (2212.10496): hypothetical-document-embedding query transformation.
  [S21]
- **2024-05** — HippoRAG 1 (NeurIPS'24), neurobiologically-inspired long-term memory framing for
  graph RAG. [S7]
- **2024-08** — Jina AI publishes "Late Chunking in Long-Context Embedding Models" with BeIR
  numbers (jina-embeddings-v2-small-en). [S33]
- **2024-09-19** — Anthropic publishes "Introducing Contextual Retrieval" with the 35/49/67%
  failure-rate-reduction numbers. [S1]
- **2024-10-05 / 2024-10-30** — LightRAG paper (arXiv 2410.05779); pgvector 0.8.0 adds iterative
  index scans. [S34][S19]
- **2024-12-20** — CAG ("Don't Do RAG") paper submitted to arXiv; accepted WWW'25 short paper.
  [S35]
- **2025-02** — HippoRAG 2 paper ("From RAG to Memory," ICML'25) on arXiv (2502.14802). [S7]
- **2025-06-05** — Qwen3-Embedding series released, #1 on MTEB multilingual (70.58). [S12]
- **2025-09-04** — pgvector 0.8.1, Postgres 18 rc1 support. [S19]
- **2025-11-21** — Cursor 2.1 ships "Instant Grep" (beta): "all grep commands run by the agent are
  now instant," rolled out over the following week. [S25][S26]
- **2025-11** — LightRAG adds RAGAS eval + Langfuse tracing integration. [S34]
- **2026-02-25** — pgvector 0.8.2 (parallel HNSW build fix). [S19]
- **2026-03** — LightRAG adds OpenSearch backend, Docker-deployable local services. [S34]
- **2026-05** — LightRAG merges RAG-Anything, adds 4 selectable chunking strategies (Fix,
  Recursive, Vector, Paragraph). [S34]
- **2026-06-17 / 06-30 / 07-08 / 07-29** — pgvector 0.8.3 → 0.8.6 (HNSW vacuum/index-corruption and
  memory fixes). [S19]
- **2026-07** — LightRAG adds "Smart Heading" recognition for Word documents. [S34]
- **2026-07-29** — Milvus 3.0.0: external collections (zero-copy lakehouse), flexible schema
  (online column add/drop), new search algorithms SINDI / Block-Max WAND / Block-Max MaxScore,
  faceted search, FAISS passthrough. [S15]
- **2026-08-04** — Weaviate 1.39.5. [S16]
- **2026-09-09 / 09-20** — Milvus 3.0.1 (REST v2 snapshot mgmt, TEXT fields, L1 reranking +
  weighted RRF) → 3.0.2 (ARRAY predicate merging, external S3 endpoints). [S15]
- **repo rename, exact date not captured** — `anthropics/anthropic-cookbook` →
  `anthropics/claude-cookbooks`; the 2024 contextual-retrieval notebook path no longer resolves
  under the old or new repo's current tree (verified 2026-09-30: 404 on both, and a repo-tree
  listing of the new repo shows no `skills/contextual-embeddings` folder). [S37 — see Unverified]

## Mechanics

### 1. Pipeline shape (ingest → generate)

Standard shape confirmed by every vector-DB and parsing vendor's own docs: **ingest → parse →
chunk → embed → index → retrieve → rerank → generate**, with hybrid retrieval (dense + sparse)
fused before reranking. [S1][S3][S4] Unstructured's own product taxonomy names the stages
explicitly as *Partition, Extract, Enrich, Chunk, Embed* — i.e. it treats "chunk" and "embed" as
distinct pipeline stages a platform must expose as separate configurable steps, not one step.
[S3]

### 2. Document parsing

**Docling** (LF AI & Data project, `docling-project/docling`) parses "PDF, DOCX, PPTX, XLSX,
HTML, EPUB, Apple Pages, WAV, MP3, WebVTT, Box Notes, email formats (EML, MSG), images … LaTeX,
DocLang, plain text, and more," producing a unified `DoclingDocument` representation exportable to
Markdown/HTML/WebVTT/DocTags/lossless JSON. It has a VLM pipeline mode:

```bash
docling --pipeline vlm --vlm-model granite_docling https://arxiv.org/pdf/2206.01062
```
[S2] VERBATIM (quickstart CLI invocation), source [S2].

Python usage:
```python
from docling.document_converter import DocumentConverter
source = "https://arxiv.org/pdf/2408.09869"
converter = DocumentConverter()
result = converter.convert(source)
print(result.document.export_to_markdown())
```
[S2] VERBATIM, source [S2]. Recent additions (2026, per the repo's "What's new" section): video
parsing (MP4/AVI/MOV/MKV/WebM) with ASR transcript + keyframes, ODF, XBRL, email, EPUB, Apple
Pages/Keynote, chart understanding (bar/pie/line → table or code + description). Python 3.9
support dropped as of docling 2.70.0. [S2]

**LlamaParse** (LlamaIndex Cloud) exposes four tiers — Fast (plain text/spatial text only, no
markdown, lowest cost), Cost Effective, **Agentic** (VLM-based, the recommended default),
**Agentic Plus** (top-tier models for the hardest documents: dense tables/charts). [S36]

**Unstructured** exposes Partition/Extract/Enrich/Chunk/Embed as one pipeline with 35+ connectors,
65+ file types, and AI-enrichment features: image descriptions, table-to-HTML, NER, generative
OCR. Access via SDK, API, or MCP server; both code-first and no-code pipelines. [S3]

### 3. Chunking

- **Late chunking** (Jina AI, Aug 2024): embed the *whole document* through the transformer first
  (up to the model's context, e.g. 8192 tokens for jina-embeddings-v2-small-en), THEN mean-pool
  per chunk boundary — chunk embeddings are "conditioned on" everything before them instead of
  being i.i.d. Effect grows with document length (biggest nDCG@10 gain on NFCorpus: 23.46 → 29.98).
  [S33]
- **Anthropic Contextual Retrieval** (situates each chunk with LLM-generated context before
  indexing) — see Numbers section; uses Claude 3 Haiku + prompt caching to keep the one-time
  annotation cost at $1.02/million document tokens (800-token chunks, 8K-token docs assumed).
  [S1]
- **LightRAG (2026-05)** ships four selectable chunking strategies by name: Fix, Recursive,
  Vector, Paragraph. [S34]
- Structure-aware / recursive / fixed-size chunking are treated as baselines against which the
  above are measured, not named with their own primary spec beyond library defaults (LangChain's
  `RecursiveCharacterTextSplitter`-style approach — not independently re-verified here, treat as
  common knowledge rather than [S]-tagged).

### 4. Embeddings, dimensions, Matryoshka, multilingual

Matryoshka-style flexible dimensions are now a *default* feature across vendors, not a research
curiosity:
- OpenAI text-embedding-3-*: `dimensions` param truncates the vector "without losing semantic
  properties." [S20]
- Voyage-4 family: 256/512/1024(default)/2048 dims, plus non-float output dtypes (int8, uint8,
  binary, ubinary) for storage/perf tradeoffs — quantization is now a first-class *output format*
  choice, not a separate post-hoc step. [S30]
- Cohere embed-v5.0: dims from {256, 512, 768, 1024, 1536, 2048(default)}. [S31]
- Qwen3-Embedding: MRL-native, 32–4096 configurable dims. [S12]

Multilingual/Russian: Cohere's multilingual-v3.0 line explicitly documents Russian (`ru`) among
"over 100 languages." [S31] Qwen3-Embedding claims "over 100 languages" including code. [S12]
No source opened here gives a Russian-specific MTEB sub-score — flag under Unverified.

### 5. Hybrid search mechanics (verbatim wire example)

Qdrant's documented Query API pattern for hybrid dense+BM25 search:

```python
client.query_points(
    collection_name="products",
    prefetch=[
        models.Prefetch(
            query=dense_embed(query_text),
            using="dense",
            limit=100,
        ),
        models.Prefetch(
            query=sparse_embed(query_text),
            using="bm25",
            limit=100,
        ),
    ],
    query=models.FusionQuery(fusion=models.Fusion.RRF),
    limit=10,
)
```
COMPOSED-from-docs (WebFetch summarization, not a raw file fetch — treat as paraphrase-level
fidelity, not byte-verbatim) [S4]. Collection-side sparse config:
```python
sparse_vectors_config={
    "bm25": models.SparseVectorParams(modifier=models.Modifier.IDF)
}
```
same fidelity caveat [S4]. Qdrant names two fusion algorithms: **RRF** (rank-only, ignores score
magnitude, robust to scale mismatch between dense cosine ~0.6–0.9 and BM25's wide score range) and
**DBSF** (Distribution-Based Score Fusion: rescale each list by its own mean/spread before
combining, preserving "how much better" one hit is). Qdrant's own guidance: start with RRF, A/B
against DBSF on labeled queries. Measured overhead of adding the sparse leg: +0.60–1.47ms per
query (single-request containers, no dataset/hardware spec given in the fetched excerpt). [S4]

Pinecone's 2026 default index type ("document indexes") stores dense vectors, sparse vectors, and
a BM25-over-Lucene full-text field in **one** schema, explicitly framed as enabling "full-text
search (BM25 with Lucene queries), semantic search, and sparse-vector search together" without a
separate legacy "vector index" special-case — this is new relative to Pinecone's earlier
single-vector-type index model. [S18]

### 6. Rerankers

Two-stage pattern, per Cohere's own framing: cheap broad retrieval → Rerank API reorders a
*smaller* candidate set "from most to least semantically relevant," billed in `search_units`.
[S28] Model generations:
- Cohere: rerank-v4.0-pro / rerank-v4.0-fast (multilingual) ≻ rerank-v3.5 ≻
  rerank-english/multilingual-v3.0 (4096-token doc context each). [S28]
- Voyage: rerank-3 / rerank-3-lite at 32K-token context (up from 16K/8K/4K on rerank-2/2-lite/1).
  API: `POST https://api.voyageai.com/v1/rerank`; Python `voyageai.Client.rerank(query, documents,
  model, top_k=None, truncation=True)` returning a `RerankingObject` with per-result index,
  document, `relevance_score`, `total_tokens`. [S29]
- BGE reranker v2 m3: cross-encoder (query,passage)→score, sigmoid-normalized to [0,1], 0.6B
  params, 512-token max, Apache 2.0, benchmarked on BEIR (rerank top-100), CMTEB-retrieval,
  MIRACL. [S32]
- ColBERT-style **late interaction** (token-level multi-vector, MaxSim scoring) is the mechanism
  ColPali extends into the visual domain — see next section.

### 7. Multimodal retrieval — ColPali/ColQwen

ColPali encodes a *page image* into a bag of patch-level vectors via a VLM's ViT (originally
PaliGemma-3B) plus a linear projection, then scores query↔document similarity with the ColBERT
late-interaction (MaxSim) method — this eliminates the OCR step and captures layout/charts along
with text natively. Evaluated on **ViDoRe**. Version lineage: ColPali v1.1→v1.3 (up to 84.8 ViDoRe)
→ ColQwen2 (Apache-2.0, up to 89.3) → ColQwen2.5 v0.2 (89.4) → community Qwen3-based variants
(90.6+) and lightweight ColSmol (80.1–82.3). As of the repo's current state, **`colpali-engine` is
deprecated**; the recommended path is Sentence Transformers v6's native `MultiVectorEncoder`
support for ColPali-style models. [S13]

### 8. GraphRAG family

**Microsoft GraphRAG** pipeline: (1) slice corpus into TextUnits, (2) extract entities /
relationships / claims, (3) Leiden hierarchical community detection over the resulting graph,
(4) bottom-up community summarization. Query modes: **Global** (broad questions via
community-level summaries), **Local** (entity-neighborhood expansion), **DRIFT** (local search
enriched with community context), **Basic** (fallback plain vector similarity). Current release:
v3.2.0, with changelog entries mostly around cache providers, dependency bumps, and a native
CosmosTableProvider (v3.1.0) — no major methodology change logged recently, i.e. the
DRIFT/Global/Local model has been stable through 2026. [S5][S6]

**LightRAG** (HKUDS, arXiv 2410.05779): dual-level retrieval combining "low-level" (specific
entity/relation) and "high-level" (broad/thematic) keys, built via simultaneous entity/relation
extraction + semantic chunking at index time; supports incremental updates and selective deletion
with automatic KG regeneration (a gap in static-graph systems like the original GraphRAG). Its own
published comparison table (methodology/domains not independently re-verified beyond the fetched
excerpt) claims, e.g., Agriculture-domain "Overall" win rate 54.8% (LightRAG) vs 45.2% (GraphRAG),
similar margins on CS and Legal domains, with lower indexing compute. [S34]

**HippoRAG 2** (ICML'25) frames itself explicitly as a *memory* framework rather than a retrieval
add-on: it claims improved associativity (multi-hop) and sense-making (integrating large/complex
context) over "even the most advanced RAG systems," while remaining "cost and latency efficient in
online processes" and using "significantly fewer resources for offline indexing compared to other
graph-based solutions such as GraphRAG, RAPTOR, and LightRAG" (their claim, not independently
benchmarked here). Engineering detail worth keeping for a "pitfalls" callout: as of the
2.0.0a5 dev line, HippoRAG **binds persisted vectors + OpenIE state to the exact
endpoint/deployment/model/normalization/component identity** that produced them via an
`index_manifest.json`; an index without a manifest, or one whose identity no longer matches the
active config, is **rejected outright** rather than silently mixed — re-indexing into a fresh
`save_dir` is the only supported migration path. Default OpenIE token limits:
`openie_ner_max_tokens=2048`, `openie_triple_max_tokens=4096` (changed from earlier dev defaults
of 512/2048 — indexes built under the old defaults must be re-indexed or have the values set
explicitly, since these limits are part of the index identity). [S7]

### 9. Agentic retrieval — grep vs semantic index

Two dated, concrete 2025/2026 primary-source data points, both on the *coding-agent* side of
"agentic search" (the general RAG-for-arbitrary-corpora question is separate and less settled):

- **Cursor 2.1** (2025-11-21 changelog): ships "Instant Grep" (beta) — "All grep commands run by
  the agent are now instant," extended to manual sidebar search, regex + word-boundary matching,
  rolling out over the following week. [S25] Cursor's own current docs state: "Cursor does not
  upload file paths or code to build a search index, and it does not store embeddings of your
  codebase for search" — all indexing/search happens locally; Cursor calls its engine "Instant
  Grep," claimed to "outperform `ripgrep` on large codebases." Matches opened when the Agent acts
  on them can still be included in a model request per Cursor's data-use policy. [S24-cursor]
- **Claude Code**'s own documentation (`code.claude.com/docs/en/overview`, fetched 2026-09-30)
  describes its search/navigation capability only in terms of the agent "reading your codebase,"
  no mention anywhere of an embeddings index, vector store, or semantic search feature — its
  documented tool surface is filesystem/shell-based (Bash, and by extension grep/glob-style file
  tools), consistent with the same architectural direction as Cursor's move. **This is an
  inference from absence-of-mention in the fetched overview page, not an explicit "we removed the
  index" statement** — flagged under Unverified. [S24]
- Community confirmation of the *problem framing* (not a primary vendor source, cited for
  context only): a May 2026 Show HN, "Semble – Code search for agents that uses 98% fewer tokens
  than grep" (445 points), frames grep-token-cost as the active pain point third-party tools are
  now targeting — i.e. the industry conversation in 2026 is "grep is the default, how do we make
  it cheaper/smarter," not "how do we get back to embeddings." [S38]

### 10. Long context vs RAG vs cache-augmented generation

- Claude context windows: up to 1M tokens on current-gen models (Sonnet 5, Sonnet 4.6, Opus 5.5,
  Opus 5, and the Fable/Mythos 5/5.1 lines); 200K on Sonnet 4.5, Haiku 4.5, and earlier. 1M is the
  *default* — no beta header needed — and billed at standard long-context pricing. Up to 600
  images/PDF pages per request on 1M-context models (100 on 200K models). [S23]
- Anthropic explicitly names **context rot**: "As token count grows, accuracy and recall degrade"
  — the documented reason "more context isn't automatically better," i.e. their own long-context
  docs argue *for* curation (retrieval-style selection) even when a corpus technically fits.
  Server-side **compaction** (beta, Claude 4.6+ and Mythos Preview) auto-summarizes older turns
  server-side as the primary long-conversation strategy; **context editing** (tool-result
  clearing, thinking-block clearing) is the finer-grained manual tool. [S23]
- **Cache-Augmented Generation (CAG)**, "Don't Do RAG" (arXiv 2412.15605, submitted 2024-12-20,
  WWW'25 short paper): for knowledge tasks with a *bounded, static* knowledge base, preload the
  whole corpus into the context window and cache the KV/runtime state once; answer queries at
  inference with zero retrieval step. Claimed benefits: no retrieval latency, no retrieval
  errors (wrong-chunk selection), less system complexity. The paper's own framing is explicitly
  conditional — for corpora that fit and don't change — not a general RAG replacement. [S35]

### 11. Grounded generation — Citations API (verbatim)

Request shape (2026 docs, current model id shown is `claude-opus-5-5`):

```bash
curl https://api.anthropic.com/v1/messages \
  -H "content-type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-opus-5-5",
    "max_tokens": 1024,
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "document",
            "source": {
              "type": "text",
              "media_type": "text/plain",
              "data": "The grass is green. The sky is blue."
            },
            "title": "My Document",
            "context": "This is a trustworthy document.",
            "citations": {"enabled": true}
          },
          {
            "type": "text",
            "text": "What color is the grass and sky?"
          }
        ]
      }
    ]
  }'
```
VERBATIM, source [S22].

Mechanics, verbatim/paraphrased from the same page:
- Three document types: plain text, PDF, **custom content** (pre-split blocks, no further
  chunking — the recommended container if you want to hand it your own RAG chunks as citation
  units).
- Default auto-chunking: sentence-level for plain text and PDF text.
- Citation location format depends on document type: PDFs → 1-indexed page ranges (exclusive end);
  plain text → 0-indexed character ranges (exclusive end); custom content → 0-indexed content
  block ranges (exclusive end). Document indices are 0-indexed across *all* documents in the
  request.
- Citations must be enabled on **all or none** of the documents in a request (all-or-nothing per
  request). Image citations are not yet supported — text only.
- Cost model: `cited_text` in the response does **not** count as output tokens, and when passed
  back in a later turn it does **not** count as input tokens either — Anthropic's stated advantage
  over a prompt-based "please quote your source" approach, plus (per Anthropic's own evals,
  unquantified in the fetched page) "significantly more likely to cite the most relevant quotes...
  than purely prompt-based approaches." [S22]

### 12. Evaluation — RAGAS metric taxonomy

Confirmed current metric groups (names only; the underlying formulas were not opened, flag under
Unverified if exact math is needed for the book):
- **RAG retrieval**: Context Precision, Context Recall, Context Entities Recall, Noise
  Sensitivity.
- **RAG generation**: Response Relevancy, Faithfulness, Multimodal Faithfulness, Multimodal
  Relevance.
- **NVIDIA metrics** (bundled in RAGAS): Answer Accuracy, Context Relevance, Response
  Groundedness.
- **Agent/tool-use**: Topic Adherence, Tool Call Accuracy, Tool Call F1, Agent Goal Accuracy.
- **General NLG comparison**: Semantic Similarity, ROUGE, BLEU, ChrF, Exact Match.
- Plus SQL-eval, summarization, and rubric-based general-purpose scoring. [S9]

Synthetic test-set generation builds a **knowledge graph** from source documents: a Document
Splitter chunks into hierarchical nodes → Extractors (NER / keyphrase, LLM- or rule-based) pull
entity/relationship signal → Relationship Builders (e.g. Jaccard-similarity over entity sets) wire
nodes together. A `QuerySynthesizer` then generates four query classes — **Single-Hop Specific**,
**Single-Hop Abstract**, **Multi-Hop Specific**, **Multi-Hop Abstract** — varying length
(short/medium/long) and style (web-search-like vs chat-like) for behavioral coverage. COMPOSED
example from the docs (paraphrase-level fidelity):
```python
from ragas.testset.graph import KnowledgeGraph, Node
from ragas.testset.transforms.extractors import NERExtractor
from ragas.testset.transforms.relationship_builders.traditional import JaccardSimilarityBuilder

kg = KnowledgeGraph(nodes=sample_nodes)
extractor = NERExtractor()
rel_builder = JaccardSimilarityBuilder(property_name="entities")
relationships = await rel_builder.transform(kg)
```
[S10]

### 13. Production security — RAG-specific attack surface (OWASP)

OWASP GenAI Security Project, "Top 10 for LLM Applications 2025" (current edition):
LLM01 Prompt Injection, LLM02 Sensitive Information Disclosure, LLM03 Supply Chain,
**LLM04 Data and Model Poisoning** ("occurs when pre-training, fine-tuning, or *embedding* data is
[compromised]" — explicitly names embedding-stage poisoning), LLM05 Improper Output Handling,
LLM06 Excessive Agency, LLM07 System Prompt Leakage, **LLM08 Vector and Embedding Weaknesses**
("vectors and embeddings vulnerabilities present significant security risks" — the category
description text itself was not fully retrievable from the fetched pages; the *existence and
ranking* of the category at #8 is confirmed from the official list page), LLM09 Misinformation,
LLM10 Unbounded Consumption. [S27] Practical implication for RAG builders, not independently
sourced beyond the category's existence: per-chunk ACL/permission enforcement, provenance/
poisoning checks on ingested documents, and treating retrieved chunk content as untrusted input
(prompt-injection-in-documents) are now named, standards-body-level RAG concerns, not
implementation folklore.

## Numbers

| Measurement | Value | Conditions | Source |
|---|---|---|---|
| Contextual Embeddings alone, top-20 retrieval failure reduction | −35% (5.7%→3.7%) | Claude 3 Haiku for context gen; domains: codebases, fiction, ArXiv, science papers; metric = 1−recall@20 | [S1] |
| Contextual Embeddings + Contextual BM25 | −49% (5.7%→2.9%) | same | [S1] |
| + reranking (top-150→top-20) | −67% (5.7%→1.9%) | same | [S1] |
| Contextual annotation cost | $1.02 / million document tokens | one-time, with prompt caching, 800-tok chunks, 8K-tok docs assumed | [S1] |
| Late chunking, NFCorpus nDCG@10 | 23.46 → 29.98 (naive → late) | jina-embeddings-v2-small-en, BeIR, docs ~1590 chars | [S33] |
| Late chunking, SciFact nDCG@10 | 64.20 → 66.10 | same model/benchmark, docs ~1498 chars | [S33] |
| Late chunking, TRECCOVID nDCG@10 | 63.36 → 64.70 | same | [S33] |
| Late chunking, FiQA2018 nDCG@10 | 33.25 → 33.84 | same, docs ~767 chars (shortest — smallest gain, consistent with "longer docs benefit more") | [S33] |
| Qwen3-Embedding-8B MTEB multilingual | 70.58, rank #1 | as of 2025-06-05 | [S12] |
| Qwen3-Embedding-8B MTEB English v2 | 75.22 overall mean | — | [S12] |
| ColPali v1.x ViDoRe | up to 84.8 | — | [S13] |
| ColQwen2 ViDoRe | up to 89.3 | Apache-2.0 | [S13] |
| ColQwen2.5 v0.2 ViDoRe | 89.4 | — | [S13] |
| turbopuffer cold query | p50 = 874ms | 1M documents, first access (no NVMe cache) | [S14] |
| turbopuffer warm query | p50 = 14ms | 1M documents, cached on NVMe | [S14] |
| turbopuffer write throughput | ~10,000+ vectors/sec | p50 = 165ms latency | [S14] |
| Qdrant hybrid overhead (adding sparse leg) | +0.60–1.47ms/query | single-request containers; dataset/hardware unspecified in fetched text | [S4] |
| LightRAG vs GraphRAG, Agriculture domain "Overall" win rate | 54.8% vs 45.2% | LightRAG's own published comparison; methodology not independently re-verified | [S34] |
| OpenAI text-embedding-3-small/large MTEB | 62.3% / 64.6% | vs ada-002's 61.0% | [S20] |

## Pitfalls, limits, criticism

- **Fusion only reorders the union of candidate lists** — Qdrant's own docs state this explicitly:
  a document missed by *both* the dense and sparse retriever cannot appear in fused results no
  matter the fusion algorithm. Hybrid search raises the retrieval ceiling but does not create
  recall out of nothing. [S4]
- **Context-window growth is not a free RAG replacement.** Anthropic's own docs name context rot
  (recall/accuracy degradation as token count grows) as the reason "more context isn't
  automatically better" — an argument from the model vendor itself, not a RAG-vendor bias. [S23]
- **CAG's applicability is explicitly bounded** to knowledge bases that are small and largely
  static; the paper frames it as complementary to RAG for that regime, not a general substitute —
  treat "just use long context" claims as regime-dependent, not universal. [S35]
- **Index identity mismatches silently corrupt graph-RAG state if not guarded against** — HippoRAG
  2's own docs describe *why* they moved to hard rejection-on-mismatch (`index_manifest.json`):
  the earlier failure mode was persisted vectors/OpenIE state becoming invalid after a
  model/endpoint/config change and being "mixed silently." This is a concrete documented example
  of a graph-RAG operational pitfall, not a hypothetical. [S7]
- **colpali-engine is a dead end going forward** — the project itself directs new work to
  Sentence Transformers v6's `MultiVectorEncoder`; anything built against the old engine is on a
  deprecated path. [S13]
- **RAG-specific attack surface now has a standards-body name and rank** (OWASP LLM08 Vector and
  Embedding Weaknesses, LLM04 embedding-stage data poisoning) — this reframes "add an ACL check to
  your retriever" and "sanitize ingested documents" from best-practice folklore to a named,
  numbered compliance-relevant category as of the 2025 edition. [S27]
- **Old official contextual-retrieval code sample paths are dead** — the 2024 cookbook notebook
  path used throughout early-2025 blog posts and tutorials (`anthropic-cookbook/skills/
  contextual-embeddings/guide.ipynb`) 404s under both the old and the renamed
  (`claude-cookbooks`) repo as of 2026-09-30, and a tree listing of the current repo shows no
  dedicated contextual-embeddings folder — anyone following an old tutorial link needs to
  re-derive the pattern from the blog post's prose, not assume the sample code still exists at
  the documented path. [S37]

## What changed in the last 6 months (since ~2026-04)

- Milvus 3.0 line (starting 2026-07-29): external/lakehouse collections, flexible online schema
  changes, new search algorithms (SINDI, Block-Max WAND/MaxScore), weighted RRF + L1 reranking
  (3.0.1, 2026-09-09), REST v2 snapshot management. [S15]
- pgvector 0.8.3→0.8.6 (2026-06-17 through 2026-07-29): a string of HNSW-vacuum correctness fixes
  (possible index corruption, buffer overflow on 32-bit, memory-exceeding-limit builds) — i.e.
  HNSW vacuuming stability was an active, recently-fixed problem area for pgvector through mid-
  2026, worth a caution note for anyone running long-lived HNSW indexes with frequent
  updates/deletes on that version range. [S19]
- LightRAG: RAG-Anything merge + 4 named chunking strategies (2026-05), OpenSearch backend
  (2026-03), Word "Smart Heading" (2026-07) — active feature cadence roughly monthly. [S34]
- Weaviate reached 1.39.5 (2026-08-04). [S16]
- Cursor's Instant Grep (shipped 2025-11-21, just outside the 6-month window but the directly
  relevant precedent) — worth confirming whether it graduated from beta within the last 6 months;
  not verified here (see Unverified). [S25]
- Cohere and Voyage both shipped a new embedding+reranker generation (Cohere embed-v5.0 /
  rerank-v4.0; Voyage voyage-4 family / rerank-3) — exact release dates were not surfaced by the
  fetched docs pages (they don't carry dated changelogs inline); flagged under Unverified for
  precise dating, but the model IDs themselves are confirmed live in current docs. [S30][S31][S28]

## Diagram candidates

1. **The 8-stage pipeline**: Ingest → Parse → Chunk → Embed → Index → Retrieve → Rerank →
   Generate, as a left-to-right flow with a feedback arrow from "Generate" back to "Retrieve"
   labeled "agentic re-query." Actors: Document store, Parser (Docling/LlamaParse/Unstructured),
   Chunker, Embedder, Vector/Hybrid Index, Retriever, Reranker, LLM.
2. **Contextual Retrieval before/after**: two parallel mini-pipelines (naive chunk → embed vs
   chunk → LLM-situate → embed+BM25-index), converging into a bar chart of the 5.7%→3.7%→2.9%→1.9%
   failure-rate cascade. [S1]
3. **Hybrid search fusion**: two ranked lists (dense, sparse/BM25) with arrows into an RRF/DBSF
   fusion box, labeled with the rank-vs-score distinction (RRF ignores magnitude; DBSF rescales by
   distribution). [S4]
4. **Late chunking vs naive chunking**: one diagram showing naive chunking splitting text *before*
   the transformer (chunks as isolated inputs) vs late chunking splitting *after* the transformer
   (chunks as pooled slices of one shared contextualized sequence). [S33]
5. **GraphRAG search-mode map**: a graph with entities/communities, four colored query-mode arrows
   labeled Global (community-level), Local (neighborhood), DRIFT (local + community context),
   Basic (plain vector fallback). [S5]
6. **LightRAG dual-level retrieval**: low-level key (entity-specific) vs high-level key
   (thematic) paths converging on one answer, vs GraphRAG's single-level community summary path.
   [S34]
7. **ColPali late interaction**: query tokens and document *patch* tokens (from a page image, not
   OCR'd text) as two token grids, with MaxSim arrows connecting each query token to its best-
   matching patch. [S13]
8. **Agentic grep vs semantic index, dated**: a timeline strip — 2024 "index the repo with
   embeddings" era → 2025-11 Cursor Instant Grep → 2026 Claude Code's grep/glob-only documented
   toolset — with a callout box quoting "does not store embeddings of your codebase for search."
   [S25][S24]
9. **Citations API document-type → location-format mapping**: three document-type boxes (plain
   text, PDF, custom content) each with an arrow to its citation location format (char range /
   page range / block range), all converging into one cited response. [S22]
10. **Long context vs RAG vs CAG decision tree**: branching on "is the corpus small & static?" →
    CAG; "does it fit but need curation?" → long context + compaction; "does it not fit or change
    often?" → RAG. [S23][S35]
11. **RAGAS knowledge-graph test generation**: Documents → Splitter → Nodes → Extractors (NER/
    keyphrase) → Relationship Builder (Jaccard) → 4-way QuerySynthesizer output (single/multi-hop
    × specific/abstract). [S10]

Chart candidates:
- Contextual Retrieval failure-rate cascade (bar chart, 4 bars: baseline 5.7%, +ctx-embed 3.7%,
  +ctx-BM25 2.9%, +rerank 1.9%). [S1]
- Late chunking nDCG@10 gains across 4 BeIR datasets, naive vs late, ordered by document length to
  show the length-correlation claim visually. [S33]
- turbopuffer cold vs warm p50 latency (874ms vs 14ms) as a log-scale bar pair. [S14]
- Embedding/reranker context-length growth across generations: Voyage rerank-1 (4K) → rerank-2
  (8K/16K) → rerank-2.5/3 (32K); Cohere embed v3 (512) → v4/v5 (128K) — a step chart making the
  "context length race" visible. [S29][S31]

## Glossary

- **RRF (Reciprocal Rank Fusion)**: fuses ranked lists using only each item's *rank position*,
  discarding raw scores; robust to scale mismatch between retrievers. [S4]
- **DBSF (Distribution-Based Score Fusion)**: Qdrant's alternative fusion, rescaling each list by
  its own score mean/spread before combining, preserving relative score magnitude. [S4]
- **Late chunking**: embed the full document first, pool per-chunk after the transformer, so chunk
  vectors carry whole-document context. [S33]
- **Contextual Retrieval**: Anthropic's technique of prepending an LLM-generated context blurb to
  each chunk before embedding/BM25 indexing. [S1]
- **Late interaction (ColBERT-style)**: keep per-token (or per-patch) multi-vectors and score
  query↔document similarity via MaxSim over token pairs, instead of collapsing to one vector. [S13]
- **Matryoshka Representation Learning (MRL)**: training an embedding so that truncated prefixes
  of the vector remain usable, enabling flexible/smaller dimensions at query time. (Named support
  confirmed for Qwen3-Embedding, OpenAI v3, Voyage-4, Cohere v5.) [S12][S20][S30][S31]
- **Context rot**: Anthropic's own term for accuracy/recall degradation as token count grows in a
  context window, independent of whether the window technically has room. [S23]
- **CAG (Cache-Augmented Generation)**: preload a bounded static corpus into context + cache
  runtime state once, skip retrieval at query time. [S35]
- **DRIFT search**: GraphRAG's local search variant that also incorporates community-level
  context. [S5]
- **Document indexes (Pinecone)**: Pinecone's 2026 default index schema combining dense vectors,
  sparse vectors, and BM25 full text in one collection. [S18]
- **Index identity (HippoRAG)**: the bound tuple of endpoint/model/normalization/component config
  that a persisted graph-RAG index is valid for; a mismatch is rejected, not silently mixed. [S7]

## Unverified / open questions

- **MTEB leaderboard current #1 overall (all tasks, English) as of 2026-09-30** — attempted via
  WebFetch on `huggingface.co/spaces/mteb/leaderboard`; the page is a JS-rendered Gradio Space and
  the fetch only returned the loading shell ("Fetching metadata from the HF Docker repository...").
  Only Qwen3-Embedding's own claimed multilingual #1 (as of 2025-06-05, from its own model card)
  was confirmed, not the current leaderboard state a year later. Needs a direct browser check or
  the leaderboard's underlying data API.
- **Whether Claude Code ever shipped and then removed a semantic/embeddings codebase index** —
  the current docs simply don't mention one; I could not find an explicit Anthropic statement
  ("we removed the index because X") in the pages fetched (tried `code.claude.com/docs/en/
  overview` and `.../settings`; did not find an engineering blog post specifically on this
  topic — the `anthropic.com/engineering/code-execution-with-mcp` post fetched does not address
  it). The chapter scope note's framing ("why Claude Code dropped the index") is stated as
  editor's prior belief, not something this session verified as a documented Anthropic claim.
  Recommend a targeted search for an Anthropic engineering blog post or changelog entry naming
  this decision explicitly before publishing that specific claim as fact.
- **Exact release dates for Cohere embed-v5.0/rerank-v4.0 and Voyage-4/rerank-3** — confirmed
  live in current docs (model IDs, context lengths, dims) but the fetched doc pages carry no
  inline "released on" date; would need each vendor's changelog/blog post.
- **Whether Cursor's Instant Grep has exited beta** — the 2025-11-21 changelog explicitly labels
  it "beta" rolling out gradually; no later changelog entry confirming GA was found in the pages
  fetched (only the Sep 2026 entries, which don't mention it).
- **RAGAS metric exact formulas** (e.g. precisely how Faithfulness or Context Precision is
  computed) — only the metric *names and one-line descriptions* were retrieved; the formulas
  page was not opened.
- **Cohere/BGE/Voyage reranker and embedding pricing** — not found in any fetched page; needed for
  a cost-comparison table in the chapter.
- **Russian-specific MTEB sub-scores** for any embedding model — no source opened gives a
  Russian-language retrieval benchmark number specifically; only generic "100+ languages incl.
  Russian" support claims. Flagged since the target reader may care about Russian retrieval
  quality specifically.
- **OWASP LLM08 full mitigation text** — only the category title and one sentence fragment were
  retrieved (the detail page 404'd); the practical RAG-ACL implications in Mechanics §13 are this
  session's inference from the category's existence, not quoted mitigation text.
- **GitHub release-date lists for Docling, LightRAG, HippoRAG, pgvector (beyond CHANGELOG-derived
  pgvector dates), Qdrant, Weaviate (detailed), ColPali, GraphRAG (detailed)** — the GitHub REST
  API was rate-limited for the remainder of the session after the first call; only pgvector's and
  GraphRAG's changelogs (fetched via raw.githubusercontent.com, not the API) were obtained
  directly.

## Sources

- [S1] Anthropic, "Introducing Contextual Retrieval," anthropic.com/news/contextual-retrieval, published 2024-09-19, accessed 2026-09-30.
- [S2] `docling-project/docling` README, GitHub (raw.githubusercontent.com/docling-project/docling/main/README.md), accessed 2026-09-30 (undated content, reflects current main branch).
- [S3] Unstructured docs, docs.unstructured.io/welcome, accessed 2026-09-30 (undated).
- [S4] Qdrant docs/articles on hybrid search ("Hybrid Queries" / "Hybrid Search" article), qdrant.tech, accessed 2026-09-30 (undated).
- [S5] Microsoft GraphRAG documentation, microsoft.github.io/graphrag/, accessed 2026-09-30 (undated).
- [S6] Microsoft GraphRAG CHANGELOG.md, raw.githubusercontent.com/microsoft/graphrag/main/CHANGELOG.md, accessed 2026-09-30, current version 3.2.0.
- [S7] OSU-NLP-Group/HippoRAG README + linked papers (arXiv 2405.14831 NeurIPS'24, arXiv 2502.14802 ICML'25), raw.githubusercontent.com/OSU-NLP-Group/HippoRAG/main/README.md, accessed 2026-09-30.
- [S8] RAGAS docs home, docs.ragas.io/en/stable/, accessed 2026-09-30 (undated).
- [S9] RAGAS available metrics page, docs.ragas.io/en/stable/concepts/metrics/available_metrics/, accessed 2026-09-30 (undated).
- [S10] RAGAS test data generation (RAG) page, docs.ragas.io/en/stable/concepts/test_data_generation/rag/, accessed 2026-09-30 (undated).
- [S12] Qwen3-Embedding-8B model card, huggingface.co/Qwen/Qwen3-Embedding-8B, released 2025-06-05 (arXiv 2506.05176), accessed 2026-09-30.
- [S13] illuin-tech/colpali GitHub repo, github.com/illuin-tech/colpali, accessed 2026-09-30 (undated, reflects current README).
- [S14] turbopuffer architecture docs, turbopuffer.com/docs/architecture, accessed 2026-09-30 (undated).
- [S15] Milvus release notes, milvus.io/docs/release_notes.md, accessed 2026-09-30; latest entries 3.0.2 (2026-09-20), 3.0.1 (2026-09-09), 3.0.0 (2026-07-29).
- [S16] Weaviate release notes, docs.weaviate.io/weaviate/release-notes, accessed 2026-09-30; latest 1.39.5 (2026-08-04).
- [S17] LanceDB docs, docs.lancedb.com/, accessed 2026-09-30 (undated).
- [S18] Pinecone docs (get-started/overview and guides/index-data/indexing-overview), docs.pinecone.io, accessed 2026-09-30 (undated).
- [S19] pgvector CHANGELOG.md, raw.githubusercontent.com/pgvector/pgvector/master/CHANGELOG.md, accessed 2026-09-30; latest released version 0.8.6 (2026-07-29).
- [S20] OpenAI embeddings guide, developers.openai.com/api/docs/guides/embeddings, accessed 2026-09-30 (undated).
- [S21] Gao, Ma, Lin, Callan, "Precise Zero-Shot Dense Retrieval without Relevance Labels" (HyDE), arXiv:2212.10496, submitted 2022-12-20, accessed 2026-09-30.
- [S22] Anthropic, "Citations" docs, platform.claude.com/docs/en/build-with-claude/citations, accessed 2026-09-30 (status: GA, undated page).
- [S23] Anthropic, "Context windows" docs, platform.claude.com/docs/en/build-with-claude/context-windows, accessed 2026-09-30 (undated).
- [S24] Anthropic, "Claude Code overview," code.claude.com/docs/en/overview, accessed 2026-09-30 (undated); [S24-cursor] Cursor codebase-indexing docs, cursor.com/docs (redirected from docs.cursor.com/context/codebase-indexing), accessed 2026-09-30 (undated).
- [S25] Cursor changelog, "Cursor 2.1: Improved Plan Mode, AI Code Review in Editor, and Instant Grep," cursor.com/changelog/2-1, published 2025-11-21, accessed 2026-09-30.
- [S26] Hacker News (Algolia API), story "Cursor 2.1: Improved Plan Mode, AI Code Review in Editor, and Instant Grep," posted 2025-11-21, hn.algolia.com/api/v1/search, accessed 2026-09-30.
- [S27] OWASP GenAI Security Project, "OWASP Top 10 for LLM Applications 2025," genai.owasp.org/llm-top-10/ and genai.owasp.org/resource/owasp-top-10-for-llm-applications-2025/, accessed 2026-09-30.
- [S28] Cohere docs, "Rerank" (rerank-2 / rerank-overview pages), docs.cohere.com, accessed 2026-09-30 (undated).
- [S29] Voyage AI docs, "Reranker," docs.voyageai.com/docs/reranker, accessed 2026-09-30 (undated).
- [S30] Voyage AI docs, "Embeddings," docs.voyageai.com/docs/embeddings, accessed 2026-09-30 (undated).
- [S31] Cohere docs, "Embed," docs.cohere.com/docs/cohere-embed, accessed 2026-09-30 (undated).
- [S32] BAAI/bge-reranker-v2-m3 model card, huggingface.co/BAAI/bge-reranker-v2-m3, accessed 2026-09-30 (undated; cites arXiv:2312.15503, arXiv:2402.03216).
- [S33] Jina AI, "Late Chunking in Long-Context Embedding Models," jina.ai/news/late-chunking-in-long-context-embedding-models/, published August 2024, accessed 2026-09-30.
- [S34] HKUDS/LightRAG README, raw.githubusercontent.com/HKUDS/LightRAG/main/README.md, accessed 2026-09-30; paper arXiv:2410.05779 (2024-10-05).
- [S35] "Don't Do RAG: When Cache-Augmented Generation is All You Need for Knowledge Tasks," arXiv:2412.15605, submitted 2024-12-20, revised 2025-02-23, WWW'25 short paper, accessed 2026-09-30.
- [S36] LlamaIndex Cloud docs, "LlamaParse getting started," developers.llamaindex.ai/python/cloud/llamaparse/getting_started, accessed 2026-09-30 (undated; redirect target of docs.cloud.llamaindex.ai).
- [S37] `anthropics/claude-cookbooks` GitHub repo (renamed from `anthropic-cookbook`), github.com/anthropics/claude-cookbooks, accessed 2026-09-30.
- [S38] Hacker News (Algolia API), "Show HN: Semble – Code search for agents that uses 98% fewer tokens than grep," posted 2026-05-17/2026-05-03 (duplicate submissions), 445 points on the later one, hn.algolia.com/api/v1/search, accessed 2026-09-30.
