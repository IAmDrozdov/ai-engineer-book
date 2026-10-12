# Chapter 14. RAG-системы — completeness critic / gap-filler notes

Lens: I read spec.md, practice.md and field.md in full, checked them against the chapter scope, resolved their
contradictions against primary sources, re-checked the state as of 2026-09-30, and filled the gaps. Source ids here
are `[G#]` so they do not collide with the `[S#]` ids of the other three files. When I refer to a claim in another
file, I write it as `spec[S4]`, `practice[S9b]` or `field[S19]`.
Cross-links: tool design for retrieval tools → ch.03; context rot and compaction → ch.02; Claude Code/Cursor
internals → ch.12; agent memory (HippoRAG, "went back to SQL") → ch.11; ACL plumbing → ch.15; injection → ch.16;
eval harnesses → ch.17.

## Contradictions resolved

1. **Why Claude Code has no vector index: "inference from absence" (spec) and "folklore" (practice, field) → RESOLVED
   with primary sources.** Boris Cherny (Claude Code lead), HN comment, 2025-02-24: "Claude Code doesn't use RAG
   currently. In our testing we found that agentic search out-performed RAG for the kinds of things people use Code
   for." [G2]. The Latent Space podcast (2025-05-07) gives the full rationale, VERBATIM transcript [G1]: "originally,
   we tried very, very early versions of Claude actually used RAG. So we, like, indexed the code base, and I think we
   were just using Voyage. So, you know, just off-the-shelf RAG, and that worked pretty well. [...] eventually, we
   landed on just agentic search [...] So one is it outperformed everything. By a lot. [...] This was just vibes, so
   internal vibes. There's some internal benchmarks also, but mostly vibes. [...] Just using regular code searching,
   you know, glob, grep [...] the second one was there was this whole, like, indexing step [...] the code drifts out
   of sync. And then there's security issues because this index has to live somewhere. And then, you know, what if
   that provider gets hacked? [...] So essentially, at the cost of latency and tokens, you now have really awesome
   search without security downsides." The writer can state this as fact and attribute it. Also note that the
   evidence was "mostly vibes", not a published benchmark.
2. **Cursor: "does not store embeddings" (spec) vs a server-side embedding index (practice[S10], field[S19]) →
   PARTLY RESOLVED: both were true, at different times.** Cursor shipped and tuned a semantic index. The 1.x
   changelog says "Improved embeddings for semantic search" [G6]. The 2025-11-06 semsearch post reports +12.5%
   accuracy [G5], and the 2026-01-27 post describes Merkle-tree index reuse (practice[S10]). The current docs
   (fetched 2026-09-30) describe search as Instant Grep plus an Explore subagent. VERBATIM: "Instant Grep builds and
   queries its index on your machine. Cursor does not upload file paths or code to build a search index, and it does
   not store embeddings of your codebase for search." [G3]. The privacy page says: "Cloud Agents are the only feature
   that requires Cursor to store code." [G4]. I found no changelog entry or blog post that announces the removal
   (I scanned changelog pages 1–15 for Mar–Sep 2026). The removal date is **Unverified**. The book must not say
   "Cursor uses embeddings today" without that caveat.
3. **Voyage reranker context (spec: "legacy rerank-2.5/2/1 at 8–16K"; practice: rerank-2.5 is 32K) → practice is
   right.** Voyage docs (updated 2026-09-29): rerank-3 and rerank-3-lite are 32,000 tokens; rerank-2.5 and
   rerank-2.5-lite are 32,000; rerank-2 is 16,000; rerank-2-lite and rerank-1 are 8,000; rerank-lite-1 is 4,000 [G7].
   rerank-3 was released **2026-09-30** (today) [G8]. practice and field list rerank-2.5 as the current model, which is
   now stale.
4. **Cohere Rerank context (spec: "4096-token doc context each", which includes v4.0) → wrong for v4.** The Rerank
   v4.0 release note (2025-12-11) gives `rerank-v4.0-pro` and `rerank-v4.0-fast`, multilingual, JSON documents, and a
   "32k token context window" [G12]. The 4K limit belongs to v3.5 and v3.0.
5. **Cohere Embed v5 date (spec and practice: "undated") → released 2026-09-30.** The Cohere release notes list
   "Announcing Cohere's Embed 5 Models" as the newest entry, dated September 30, 2026 [G12]. practice's timeline
   entry "2024-04-15 Cohere Embed 4" contradicts its own source (practice[S26] is dated 2025-04-15). Embed 4 =
   2025-04-15.
6. **GraphRAG: "v3.2.0, stable" (spec) vs "maintenance mode" (practice) → both are true.** The README, VERBATIM:
   "This project is largely in maintenance mode, and won't be accepting new PRs or implementing new features. We'll
   perform bug fixes and dependency updates as appropriate, particularly to address CVEs as they arise." [G22]. v3.2.0
   still shipped on 2026-09-24 (GitHub) / 2026-09-23 (PyPI) [G18][G19]. These are maintenance releases, not a sign of
   active research.
7. **The contextual-retrieval cookbook path (spec: "404, no contextual-embeddings folder") → spec is wrong.** The
   notebook exists at `anthropics/claude-cookbooks/capabilities/contextual-embeddings/guide.ipynb`, with `data/` and a
   Bedrock lambda [G45]. It has been modernised: it now uses `claude-haiku-4-5` for contextualization, `voyage-2`
   embeddings and Cohere `rerank-english-v3.0` [G45]. The old `skills/...` path is the one that died.
8. **arXiv 2605.15184 "grep vs vector" (practice: "coding-agent harnesses", "116-question sample") → wrong
   framing.** The abstract says Experiment 1 "compares grep and vector retrieval on a 116-question sample from
   **LongMemEval**", using a custom harness (Chronos) plus Claude Code, Codex and Gemini CLI as harnesses [G51].
   LongMemEval is conversational-memory QA, not code. The paper is evidence about agent harnesses doing retrieval over
   chat history, not about code search.
9. **LightRAG paper date: 2024-10-05 (spec) vs 2024-10-08 (field) → 2024-10-08** (arXiv v1; v3 is 2025-04-28) [G48].
   LightRAG the code is live: v1.5.7 released 2026-09-02 [G18]. field's "last major revision 2025-04-28" refers to
   the paper, not the software.
10. **Late chunking date: "Aug 2024" (spec) vs "2024-09-05 Jina announces" (practice) → Jina blog post 2024-08-22;
    arXiv 2409.04701 on 2024-09-07** [G48]. Weaviate's explainer came after the Jina post.
11. **HippoRAG versions (spec: "2.0.0a5 dev line"; field: HippoRAG v1 numbers, "last revised 2025-01-14") → the
    current generation is HippoRAG 2 (arXiv 2502.14802, ICML'25).** The latest PyPI release is `hipporag 2.0.0a4`
    (2025-06-24). The only GitHub *release* is v1.0.0 (2025-02-27) [G18][G19]. field's "+20% multi-hop, 10–30×
    cheaper, 6–13× faster" are **HippoRAG 1** (NeurIPS'24) claims and must be labelled that way.
12. **Rerankers help a lot (practice, Anthropic −49%→−67%) vs "Reranker Tax" says rerankers do not beat BM25
    (field[S4]) → no real contradiction; the conditions differ.** The Reranker Tax used
    `cross-encoder/ms-marco-MiniLM-L6-v2` (a tiny 2021-era model) on one dataset (SciFact) with k≤20. Anthropic
    reranked top-150 → top-20 with Cohere [G46]. Voyage rerank-3 reports +20.33% NDCG@10 over BM25 and +6.38% atop
    voyage-4-large, retrieving top-100 then keeping top-10 across 95 datasets (vendor numbers) [G8]. Both files agree
    on the invariant: a reranker cannot exceed first-stage recall@k. So the chapter should teach "size the candidate
    pool (k≈100–150) and use a modern reranker", not "rerankers are theatre".
13. **"Qwen3-Embedding-8B is #1 multilingual" (spec, practice) → stale.** On the live MTEB(Multilingual, v2)
    leaderboard on 2026-09-30 it ranks **#4** (Borda rank). The top three are `microsoft/harrier-oss-v1-27b`
    (2026-03-27, MIT), `tencent/KaLM-Embedding-Gemma3-12B-2511` and `nvidia/llama-embed-nemotron-8b` [G13]. The
    70.58 figure is the 2025-06-05 snapshot.
14. **field glossary "RRF not directly benchmarked" vs practice's TopK numbers → practice is right.** TopK reported
    +4.58% nDCG@10 for score-aware fusion over RRF on BEIR (vendor). Qdrant's current docs position weighted RRF and
    DBSF as dataset-dependent: "Neither dominates the other in general, so use your eval set to choose between them."
    [G43].
15. **The Cursor semsearch number (field: "−2.2% dissatisfied follow-ups").** The precise phrasing is "2.2% increase
    in dissatisfied follow-up user requests when semantic search was not available" [G5]. This is an A/B on
    Cursor's own traffic.

## Claims most likely to be wrong (with corrections)

1. **Wrong: "Claude Code never tried embeddings" / "we don't know why Claude Code has no index."** Correct: early
   Claude Code indexed the codebase with off-the-shelf RAG (Voyage). The team switched to glob/grep agentic search
   because it "outperformed everything. By a lot" (mostly internal vibes plus some internal benchmarks), and because
   the index drifts out of sync and has to live somewhere, which is a security liability [G1][G2].
2. **Wrong: "Cursor uses a server-side embedding index for codebase search" (present tense).** Correct: Cursor's
   docs as of 2026-09-30 say it "does not store embeddings of your codebase for search" and describe Instant Grep plus
   an Explore subagent [G3]. The Nov 2025 and Jan 2026 embedding posts describe an earlier architecture [G5]. The
   switch date is unverified.
3. **Wrong: "Voyage's best reranker is rerank-2.5" or "Cohere Rerank has a 4K context."** Correct: Voyage
   rerank-3/rerank-3-lite (2026-09-30, 32K, same price as 2.5, scores calibrated to 2.5) [G7][G8]. Cohere rerank-v4.0
   pro/fast (2025-12-11, 32K) [G12]. Voyage's own 95-dataset suite puts rerank-3 +2.72% over Cohere v4.0 Pro
   (vendor benchmark) [G8].
4. **Wrong: "Cohere Embed 4 / Voyage 4 / voyage-context-3 are the latest."** Correct: Cohere `embed-v5.0-pro/fast`
   (2026-09-30: 128K context, MRL dims 256–2048, float/int8/binary, text+image) [G12]. `voyage-context-4`
   (2026-06-29, MoE, auto-chunking, no 32K limit, $0.12/M vs $0.18/M for context-3) [G9]. `voyage-code-4`
   (2026-08-13, $0.12/M) [G10].
5. **Wrong: "Qwen3-Embedding-8B tops MTEB multilingual (70.58)."** Correct: that is the 2025-06-05 snapshot. On
   2026-09-30 the MTEB(Multilingual, v2) Borda ranking is led by `microsoft/harrier-oss-v1-27b` (mean 0.7427);
   Qwen3-8B is #4 (0.7058) [G13]. MTEB ranks by Borda count, not by mean score [G14], so "rank" and "average" can
   disagree.
6. **Wrong: "OpenAI text-embedding-3-large scores 64.6 on MTEB."** Correct: that figure is from the 2024 English
   MTEB (v1) and is still printed in OpenAI's guide [G34]. It is not comparable to MTEB(eng, v2) or MMTEB means. On
   today's MTEB(Multilingual, v2), text-embedding-3-large has incomplete results (rank 44, retrieval 0.5932) [G13].
7. **Wrong: "There is no Russian embedding benchmark / the best Russian model is FRIDA (2024)."** Correct: MTEB has a
   Russian benchmark, **MTEB(rus, v1.1)**, and the leaderboard also hosts Encodechka and RuSciBench [G13]. On
   2026-09-30 it is led by Sber's `ai-sage/Giga-Embeddings-instruct-10B-A1.8B-0826` (released 2026-08-19, MIT, mean
   0.7499, retrieval 0.8159). Qwen3-Embedding-8B is #4 (0.7142 / 0.7819), and FRIDA is #7 (0.7095 / 0.7638) [G13].
8. **Wrong: "Anthropic's −35/−49/−67% was measured with Voyage embeddings" (or "on one dataset").** Correct: the
   headline chart uses the top-performing configuration, **Gemini Text 004** embeddings. It averages several domains
   (codebases, fiction, ArXiv, science papers), uses 1−recall@20 as the metric, and reranks with Cohere from top-150
   to top-20 [G46]. The cookbook's own reproduction is on a codebase set (248 queries, 737 chunks) with voyage-2,
   Haiku 4.5 and Cohere rerank-english-v3.0: Pass@10 went 87.15% → 92.34% (contextual embeddings) → 95.26% (+rerank)
   [G45].
9. **Wrong: "RRF uses k=60" (universal).** Correct: k=60 is the Cormack et al. 2009 constant, "fixed during a pilot
   investigation" [G47], and pgvector's example uses it [G30]. **Qdrant's default k is 2**, with zero-based ranks and
   a configurable `{"rrf": {"k": 60}}` since v1.16.0 [G43]. OpenAI file search exposes
   `hybrid_search.embedding_weight`/`text_weight` RRF weights [G35]. Fused scores are therefore not comparable across
   engines.
10. **Wrong: "pgvector handles any modern embedding."** Correct: an HNSW/IVFFlat index on `vector` supports up to
    2,000 dims. Use `halfvec` for up to 4,000 dims and `binary_quantize` → `bit` for up to 64,000 [G29]. So 3072-dim
    (OpenAI large, Gemini) or 4096-dim (Qwen3-8B) vectors need halfvec, MRL truncation or subvector indexing. Also,
    pgvector's own hybrid example ranks text with Postgres `ts_rank_cd`, which is **not BM25**. Real BM25 in Postgres
    needs e.g. `pg_textsearch` (`USING bm25`, `<@>` operator, PG 17/18) [G30][G31].
11. **Wrong: "Filtered vector search in pgvector just works."** Correct, verbatim: "With approximate indexes,
    filtering is applied *after* the index is scanned. If a condition matches 10% of rows, with HNSW and the default
    `hnsw.ef_search` of 40, only 4 rows will match on average." The fix is `SET hnsw.iterative_scan = strict_order`
    (or `relaxed_order`) from 0.8.0 on, capped by `hnsw.max_scan_tuples` (20,000 by default) [G29].
12. **Wrong: "Use `llama-parse` / `LlamaParse(...)` from llama-cloud-services" or "`colpali-engine` for ColPali."**
    Correct: `llama_cloud_services` and `llama-parse` are deprecated (maintained until 2026-05-01); migrate to
    `pip install llama-cloud>=1.0` (`client.parsing.create(tier="agentic", version="latest", file_id=...)`) [G20][G21].
    `colpali-engine` is deprecated in favour of Sentence Transformers v6 `MultiVectorEncoder` (ST v6.0.0 released
    2026-08-18) [G23][G18].
13. **Wrong: "RAGAS is actively developed / use `from ragas.metrics import LLMContextRecall`."** Correct: the repo
    moved to `vibrantlabsai/ragas`. The last release is v0.4.3 (2026-01-13) and the last push was 2026-02-24 [G18][G24].
    The docs mark the legacy metrics API as deprecated in 0.4 and scheduled for removal in 1.0. The new API is
    `from ragas.metrics.collections import Faithfulness, ContextPrecision, ...` with `await scorer.ascore(...)` [G24].
14. **Wrong: "grep beats vector retrieval for coding agents — arXiv 2605.15184 proves it."** Correct: that study is on
    LongMemEval conversational QA [G51]. For code, the evidence is mixed. The Claude Code team preferred grep [G1].
    Cursor measured +12.5% with semantic search added to grep [G5]. Voyage (a vendor) argues grep fails on
    symptom-style queries and reports voyage-code-4 +27.54% over voyage-code-3 on an issue→files benchmark [G10].
    In deep-research retrieval (BrowseComp-Plus), GPT-5 went 55.9% → 70.1% accuracy when BM25 was swapped for
    Qwen3-Embedding-8B, "with fewer search calls" [G54].
15. **Wrong: "Gemini embedding: pass a list of texts and a `task_type`" (true for gemini-embedding-001).** Correct:
    `gemini-embedding-2` does not accept `task_type`; use text prefixes such as `task: search result | query: ...` and
    `title: ... | text: ...`. Multiple inputs in one call produce **one aggregated embedding**; use the Batch API for
    many. Its vectors are incompatible with 001, so upgrading requires a full re-embed [G37].

Also often wrong, as bonus items:
- **"OpenAI file_search chunking is tuned."** Its default is 800 tokens with 400 overlap [G35]. Chroma measured
  exactly that setting as having "slightly below-average recall and the lowest scores across all other metrics"
  [G27].
- **"Semantic chunking is strictly better."** Vectara/UWisc found "computational costs associated with semantic
  chunking are not justified by consistent performance gains" [G26]. Chroma found recursive-200 with no overlap to be
  competitive [G27].
- **"Pinecone = one vector type per index."** As of API `2026-07`, new indexes are document indexes by default: one
  schema combines `dense_vector`, `sparse_vector` and BM25 `full_text_search` fields, and `POST /indexes` is
  schema-only [G55].
- **"Jina v5 is open for commercial use like v3."** `jina-embeddings-v5-text-small` is CC-BY-NC-4.0 [G16][G17].
- **"Weaviate is at 1.39.5."** Latest is 1.39.7 (2026-09-25), with 1.40.0-rc.1 (2026-09-19) adding HFresh MUVERA and
  RQ-4 quantization [G18].

## TL;DR

- Claude Code dropped its early Voyage-based codebase index for glob/grep agentic search. The reasons were quality
  ("outperformed everything. By a lot", mostly vibes), index staleness and security [G1][G2].
- Cursor's current docs say it does not store codebase embeddings; search = Instant Grep (local) + an Explore
  subagent [G3]. Its 2025 A/B showed +12.5% QA accuracy from semantic search combined with grep [G5]. Treat the code
  domain as unsettled, and keep prose/enterprise RAG on hybrid + rerank.
- Two model releases happened on the day of writing: Voyage **rerank-3/-3-lite** [G8] and Cohere **Embed 5** [G12].
  Model tables go stale within a quarter, so the book should print "as of" dates.
- The embedding leaderboards moved. MTEB(Multilingual, v2) is led by Microsoft `harrier-oss-v1-27b` [G13].
  MTEB(rus, v1.1) is led by Sber `Giga-Embeddings-instruct-*-0826` (Aug 2026) [G13]. ViDoRe v3 is led by
  `tencent/EVIE-8B` (2026-09-04) [G13].
- Classic failure taxonomy (Barnett et al., 2024-01): FP1 missing content, FP2 missed top-ranked docs, FP3 not in
  context (consolidation), FP4 not extracted, FP5 wrong format, FP6 incorrect specificity, FP7 incomplete [G25].
- Chunking evidence: recursive ~200 tokens with no overlap is a strong baseline. OpenAI's 800/400 default scored
  worst. Semantic chunking is not consistently worth its cost [G26][G27][G35].
- The RAGAS formulas are simple ratios over LLM-extracted claims (faithfulness, context recall), a rank-weighted
  precision (context precision), and embedding cosine over generated questions (answer relevancy) [G24]. Know them
  before trusting the scores.
- Long context vs RAG: LC tends to beat RAG on QA when affordable. RAG wins on cost and on some dialogue/general
  queries. The choice depends on model, task and chunks ("no silver bullet") [G52]. Context rot degrades every model
  as input grows [G28]. Anthropic: if the KB is under 200K tokens (~500 pages), just put it in the prompt with
  caching [G46].
- Grounded citations: the Anthropic API's `search_result` content block (no beta header, all active models except
  Haiku 3) lets you pass your own retrieved chunks and get `search_result_location` citations back [G32].
- Managed RAG is a real option: OpenAI vector stores/file_search (hybrid with RRF weights, attribute filters,
  $0.10/GB/day beyond 1 GB) [G35], and Gemini File Search (free storage and query embeddings; you pay embeddings at
  index time plus retrieved tokens) [G36].
- Security: indirect prompt injection via retrieved content is a production CVE class. EchoLeak (CVE-2025-32711, M365
  Copilot, zero-click, via one email) [G38][G39]. PoisonedRAG reached 90% attack success with 5 poisoned texts per
  target question in a corpus of millions [G40]. OWASP LLM08 lists permission-aware vector stores as the first
  mitigation [G41].
- Graph RAG reality check: studies report GraphRAG "frequently underperforms vanilla RAG on many real-world tasks"
  [G50]. Microsoft's own LazyGraphRAG claims indexing at 0.1% of full GraphRAG cost [G49]. GraphRAG itself is in
  maintenance mode [G22].
- Deep-research-style agentic retrieval still benefits from a good dense retriever: on BrowseComp-Plus, GPT-5 scored
  55.9% with BM25 and 70.1% with Qwen3-Embedding-8B [G54].

## Current state and versions (verified 2026-09-30)

| Component | Current | Date | Source |
|---|---|---|---|
| Voyage rerankers | rerank-3, rerank-3-lite (32K; query ≤8K; ≤1,000 docs; ≤600K total tokens) | 2026-09-30 | [G7][G8] |
| Voyage embeddings | voyage-4-large/4/4-lite/4-nano (Jan 2026); voyage-context-4 (120K ctx per Anthropic doc table); voyage-code-4 | 2026-01-15 / 06-29 / 08-13 | [G9][G10][G33] |
| Cohere | embed-v5.0-pro/fast; rerank-v4.0-pro/fast | 2026-09-30 / 2025-12-11 | [G12] |
| Gemini | gemini-embedding-2 (default 3072, recommended 768/1536/3072, auto-renormalised truncation); gemini-embedding-001 still available | — | [G37] |
| OpenAI | text-embedding-3-small/large unchanged (1536/3072, `dimensions` param) | — | [G34] |
| Jina | jina-embeddings-v5-text-small/nano (677M/239M, 32K, MRL 32–1024, CC-BY-NC-4.0) | 2026-02-18 | [G16] |
| Open multilingual leaders | harrier-oss-v1-27b / -0.6b (MIT, 2026-03); KaLM-Gemma3-12B; llama-embed-nemotron-8b; Qwen3-Embedding-8B (Apache-2.0); Nemotron-3-Embed-8B (2026-07-14, openmdw-1.1) | — | [G13][G17] |
| Russian leader | ai-sage Giga-Embeddings-instruct-10B-A1.8B-0826 (MIT, DeepSeek-V3-style MoE, 1536-d, 8192 tok, mean pooling, instruction on query only) | 2026-08-19 | [G13][G15] |
| Qdrant | v1.19.1 (1.19.0: TurboQuant 4-bit primary storage, memory tiers, per-query IDF corpus); 1.18.0: TurboQuant 8× compression; 1.17.0: weighted RRF, relevance feedback | 2026-09-04 / 08-05 / 05-11 / 02-20 | [G44][G18] |
| Weaviate | 1.39.7; 1.40.0-rc.1 (HFresh MUVERA, RQ-4, drop vector index) | 2026-09-25 / 09-19 | [G18] |
| Milvus | 3.0.2 and 2.6.25 (both lines maintained) | 2026-09-20 / 09-29 | [G18] |
| pgvector | 0.8.6 (tags; no 0.9) | 2026-07-29 | [G18], spec |
| pg_textsearch | v1.4.0 (BM25, Block-Max WAND, PG 17/18) | 2026-08-18 | [G18][G31] |
| VectorChord | 1.1.1 | 2026-02-28 | [G18] |
| LanceDB | 0.40.0-beta.12 (GitHub) / 0.39.0 (PyPI) | 2026-09-30 / 09-17 | [G18][G19] |
| Pinecone | API 2026-07: document indexes default; Python SDK 10.0.0 | 2026-09-03 (SDK) | [G55][G19] |
| turbopuffer | Python client 2.10.2 | 2026-09-23 | [G19] |
| Chroma | 1.5.9 (no release since May) | 2026-05-05 | [G18] |
| Docling | 2.131.0 (weekly cadence) | 2026-09-29 | [G18] |
| Unstructured | 0.27.10 | 2026-09-27 | [G18] |
| LlamaParse SDK | `llama-cloud` 2.16.0 (new); `llama-parse`/`llama-cloud-services` 0.6.94 deprecated | 2026-09-08 | [G19][G20] |
| Sentence Transformers | v6.1.0 (v6.0.0 added MultiVectorEncoder) | 2026-09-18 / 08-18 | [G18] |
| colpali-engine | 0.3.18, deprecated | 2026-08-22 | [G18][G23] |
| GraphRAG | 3.2.0, maintenance mode | 2026-09-24 | [G18][G22] |
| LightRAG | v1.5.7 | 2026-09-02 | [G18] |
| HippoRAG | PyPI 2.0.0a4 | 2025-06-24 | [G19] |
| RAGAS | v0.4.3; repo moved to vibrantlabsai/ragas | 2026-01-13 | [G18][G24] |
| LlamaIndex | v0.14.25 | 2026-09-21 | [G18] |
| mteb (lib) | 2.21.10 | 2026-09-29 | [G19] |
| VLM OCR | PaddleOCR-VL-1.6 (0.9B, claims 96.33% OmniDocBench v1.6), DeepSeek-OCR-2, olmOCR-2, dots.ocr, MinerU2.5 (AGPL-3.0), granite-docling-258M (Apache-2.0) | 2025-07…2026-05 | [G17][G56] |

## Timeline (items the other three files missed)

- 2009 — Cormack, Clarke, Büttcher: RRF, k=60 "fixed during a pilot investigation" [G47].
- 2023-03-14 — Query2doc (LLM pseudo-document query expansion; BM25 +3–15% on MS-MARCO/TREC DL) [G53].
- 2023-05-23 — Rewrite-Retrieve-Read (trainable query rewriter) [G53].
- 2023-07-06 — "Lost in the Middle" [G52].
- 2023-10-09 — Step-Back prompting (MuSiQue +7%, TimeQA +27% on PaLM-2L) [G53].
- 2024-01-11 — "Seven Failure Points When Engineering a RAG System" [G25].
- 2024-01-31 — RAG-Fusion paper (multi-query + RRF, Infineon case) [G53].
- 2024-02-12 — PoisonedRAG [G40].
- 2024-04-24 — GraphRAG paper arXiv 2404.16130 (the blog was 2024-02-13; code "first release in July 2024") [G48][G22].
- 2024-07-03 — Chroma chunking evaluation [G27].
- 2024-07-16 — BRIGHT reasoning-intensive retrieval benchmark [G54].
- 2024-07-23 — Self-Route (RAG vs long context) [G52].
- 2024-08-22 — Jina late chunking blog; 2024-09-07 arXiv [G48].
- 2024-10-16 — "Is Semantic Chunking Worth the Computational Cost?" [G26].
- 2024-11-25 — LazyGraphRAG [G49].
- 2025-02-17 — "RAG vs. GraphRAG: A Systematic Evaluation" [G50].
- 2025-02-19 — MMTEB (Borda ranking, 500+ tasks, 250+ languages) [G14].
- 2025-02-24 — Boris Cherny on HN: Claude Code doesn't use RAG [G2]. Same day: Voyage "joining MongoDB" [G11].
- 2025-03-12 — Search-R1 (RL-trained search agents) [G54].
- 2025-05-07 — Latent Space podcast with the Claude Code index rationale [G1].
- 2025-06-06 — GraphRAG-Bench ("When to use Graphs in RAG") [G50].
- 2025-06-11 — CVE-2025-32711 (EchoLeak) published [G38]. The paper followed on 2025-09-06 [G39].
- 2025-07-14 — Chroma "Context Rot" (18 LLMs) [G28].
- 2025-08-08 — BrowseComp-Plus [G54].
- 2025-10 — Open VLM OCR wave on HF: PaddleOCR-VL (10-16), DeepSeek-OCR (10-17), olmOCR-2 (10-06) [G17].
- 2025-11-06 — Cursor semsearch post [G5]. 2025-11-21 — Cursor 2.1 Instant Grep (beta) [G6].
- 2025-12-11 — Cohere rerank-v4.0 (32K) [G12].
- 2026-01-13 — RAGAS v0.4.3, the last release [G18].
- 2026-01-15 — Voyage 4 family, voyage-multimodal-3.5 [G11].
- 2026-02-18 — jina-embeddings-v5-text [G16]. 2026-02-20 — Qdrant 1.17 (weighted RRF) [G44].
- 2026-03-27 — Microsoft harrier-oss-v1 (tops MMTEB v2 on 2026-09-30) [G13].
- 2026-05-01 — End of maintenance for `llama-cloud-services`/`llama-parse` [G20].
- 2026-05-11 — Qdrant 1.18 (TurboQuant). 2026-05-28 — PaddleOCR-VL-1.6 [G44][G56].
- 2026-05-14 — arXiv 2605.15184 (grep vs vector on LongMemEval) [G51].
- 2026-06-29 — voyage-context-4 [G9].
- 2026-07 — Pinecone API 2026-07 makes `POST /indexes` schema-only; document indexes are the default [G55].
- 2026-07-14 — NVIDIA Nemotron-3-Embed-8B (#2 on RTEB) [G13][G17].
- 2026-08-05 — Qdrant 1.19 (4-bit TurboQuant storage, memory tiers) [G44].
- 2026-08-13 — voyage-code-4 [G10].
- 2026-08-18 — Sentence Transformers v6.0.0 (MultiVectorEncoder); colpali-engine deprecated [G18][G23].
- 2026-08-19 — Sber Giga-Embeddings-instruct-*-0826 (#1 on MTEB rus) [G13].
- 2026-09-04 — tencent EVIE-8B/4.5B (#1/#2 on ViDoRe v3) [G13].
- 2026-09-19 — Weaviate 1.40.0-rc.1 [G18]. 2026-09-24 — GraphRAG 3.2.0 [G18].
- 2026-09-30 — Voyage rerank-3/-3-lite [G8]; Cohere Embed 5 [G12].
- Unknown date, Jan–Sep 2026 — Cursor docs switch to "no stored embeddings" [G3] (Unverified).

## Mechanics (gap fills)

### A. Classic failure points (Barnett et al., 2024) — VERBATIM definitions, condensed [G25]
- **FP1 Missing Content**: "asking a question that cannot be answered from the available documents [...] the system
  could be fooled into giving a response."
- **FP2 Missed the Top Ranked Documents**: "The answer to the question is in the document but did not rank highly
  enough to be returned."
- **FP3 Not in Context — Consolidation strategy Limitations**: retrieved but did not make it into the context.
- **FP4 Not Extracted**: in context, but "too much noise or contradicting information."
- **FP5 Wrong Format**: a table/list format instruction was ignored.
- **FP6 Incorrect Specificity**: too general or too specific.
- **FP7 Incomplete**: the information was in the context but the answer missed parts ("key points covered in
  documents A, B and C" → ask separately).
Lessons from the same paper: adding "the file name and chunk number into the retrieved context helped"; "RAG systems
require continuous calibration"; a semantic cache to cut cost and latency [G25]. Mapping for the chapter: FP1 → abstain
and eval "unanswerable" cases; FP2 → hybrid + bigger k + rerank; FP3 → context budget and ordering (Lost in the
Middle [G52]); FP4 → fewer, cleaner chunks (context rot [G28]); FP5–7 → generation prompts and query decomposition.

### B. Chunking — measured evidence
Chroma token-level evaluation (text-embedding-3-large, top-5), VERBATIM rows via WebFetch, paraphrase fidelity [G27]:

| Chunker | Size (actual) | Overlap | Recall | Precision | IoU |
|---|---|---|---|---|---|
| Recursive | 800 (~661) | 400 | 85.4 | 1.5 | 1.5 |
| Recursive | 200 (~137) | 0 | 88.1 | 7.0 | 6.9 |
| TokenText | 800 | 400 | 87.9 | 1.4 | 1.4 |
| Kamradt semantic | ~660 | 0 | 83.6 | 1.5 | 1.5 |
| ClusterSemantic | 200 (~103) | 0 | 87.3 | 8.0 | 8.0 |
| LLM (GPT-4o) | ~240 | 0 | 91.9 | 3.9 | 3.9 |

Conclusions: 800/400 (OpenAI Assistants default) → "slightly below-average recall and the lowest scores across all
other metrics". Overlap hurts IoU. Small recursive chunks are a strong baseline [G27]. OpenAI's vector store default
is still `max_chunk_size_tokens=800`, `chunk_overlap_tokens=400`; allowed range 100–4096, overlap ≤ size/2 [G35].
Semantic chunking: "computational costs [...] not justified by consistent performance gains" [G26]. Late chunking vs
contextual retrieval (2025-04): "contextual retrieval preserves semantic coherence more effectively but requires
greater computational resources [...] late chunking offers higher efficiency but tends to sacrifice relevance and
completeness" [G48b = arXiv 2504.19754]. Vendor way out: voyage-context-4 does auto-chunking and takes documents
longer than 32K; "contextualized chunk embeddings outperforms embedding the same documents as single vectors by
7.11%" on LongEmbed (vendor) [G9].

### C. Hybrid search wire formats (VERBATIM)
Qdrant, current syntax [G43]:
```http
POST /collections/{collection_name}/points/query
{
    "prefetch": [
        {
            "query": { 
                "indices": [1, 42],    // <┐
                "values": [0.22, 0.8]  // <┴─sparse vector
             },
            "using": "sparse",
            "limit": 20
        },
        {
            "query": [0.01, 0.45, 0.67, ...], // <-- dense vector
            "using": "dense",
            "limit": 20
        }
    ],
    "query": { "rrf": {} }, // <--- reciprocal rank fusion with defaults
    "limit": 10
}
```
Weighted RRF (Python), VERBATIM [G43]:
```python
client.query_points(
    collection_name="{collection_name}",
    prefetch=[
        # 2+ prefetches here
    ],
    query=models.RrfQuery(rrf=models.Rrf(weights=[3.0, 1.0])),
)
```
Qdrant formula: score = Σ 1/(k + (r_d+1)/w_r − 1), with "k is a constant (set to 2 by default)" and zero-based ranks
[G43]. Guidance, VERBATIM: "Without an eval set: leave weights at the default `(1.0, 1.0)`. Hand-tuned weights
without measurement are unlikely to beat the default reliably." [G43]. On alpha-blending raw scores: "unreliable
without first normalizing the scores" [G43]. In distributed collections, fusion inside a prefetch is per shard. Only
a top-level fusion query is global [G43].

Postgres RRF, VERBATIM from pgvector-python [G30]:
```sql
WITH semantic_search AS (
    SELECT id, RANK () OVER (ORDER BY embedding <=> %(embedding)s) AS rank
    FROM documents
    ORDER BY embedding <=> %(embedding)s
    LIMIT 20
),
keyword_search AS (
    SELECT id, RANK () OVER (ORDER BY ts_rank_cd(to_tsvector('english', content), query) DESC)
    FROM documents, plainto_tsquery('english', %(query)s) query
    WHERE to_tsvector('english', content) @@ query
    ORDER BY ts_rank_cd(to_tsvector('english', content), query) DESC
    LIMIT 20
)
SELECT
    COALESCE(semantic_search.id, keyword_search.id) AS id,
    COALESCE(1.0 / (%(k)s + semantic_search.rank), 0.0) +
    COALESCE(1.0 / (%(k)s + keyword_search.rank), 0.0) AS score
FROM semantic_search
FULL OUTER JOIN keyword_search ON semantic_search.id = keyword_search.id
ORDER BY score DESC
LIMIT 5
```
(the example sets `k = 60`). Real BM25 in Postgres, VERBATIM [G31]:
```sql
CREATE INDEX docs_idx ON documents USING bm25(content) WITH (text_config='english');
SELECT * FROM documents
ORDER BY content <@> 'database system'
LIMIT 5;
```
"`<@>` returns negative BM25 scores for ascending index scans, so lower scores rank first." [G31]

pgvector filtering and quantization, VERBATIM [G29]:
```sql
SET hnsw.iterative_scan = relaxed_order;
CREATE INDEX ON items USING hnsw ((binary_quantize(embedding)::bit(3)) bit_hamming_ops);
SELECT * FROM (
    SELECT * FROM items ORDER BY binary_quantize(embedding)::bit(3) <~> binary_quantize('[1,-2,3]') LIMIT 20
) ORDER BY embedding <=> '[1,-2,3]' LIMIT 5;
```
Multitenancy in pgvector: "sharing an approximate index between tenants means vectors from one tenant can affect
recall (and speed) for other tenants" → `PARTITION BY LIST(customer_id)` [G29].

Managed hybrid: OpenAI `ranking_options.hybrid_search.embedding_weight` / `text_weight` (RRF), `ranker` `auto` or
`default-2024-08-21`, `score_threshold`, `max_num_results` up to 50 (default 10) [G35]. Pinecone document index: one
schema with `dense_vector` + `sparse_vector` + `full_text_search` string fields, ranked per query by `score_by`,
VERBATIM [G55]:
```json
{
  "score_by": [{ "type": "text", "fields": ["body"], "query": "machine learning" }],
  "top_k": 10
}
```

### D. Rerankers — the 2026 state
- Voyage rerank-3 (2026-09-30), vendor evaluation: 95 datasets, 9 domains (51 multilingual datasets in 31
  languages), first stage top-100, NDCG@10. rerank-3 beats Cohere v4.0 Pro / v4.0 Fast / Qwen3-Reranker-8B /
  rerank-2.5 by 2.72% / 5.74% / 3.02% / 0.96%. rerank-3-lite matches rerank-2.5 "at 40% of the price". On LongEmbed,
  rerank-3 is +13.84% over Cohere v4.0 Pro. The gain atop the first stage is +7.65% (voyage-3-large), +6.38%
  (voyage-4-large), +16.67% (OpenAI v3 large), +20.33% (BM25). "Relevance scores are calibrated to match the score
  distributions of the corresponding Rerank 2.5 models, so score thresholds tuned on Rerank 2.5 continue to work."
  [G8]
- Baselines named in that post, i.e. the 2026 reranker field: Cohere Rerank v4.0 Pro/Fast, Qwen3-Reranker-8B, Jina
  Reranker v3.5, mxbai-rerank-large-v2, NVIDIA Llama-Nemotron Rerank 1B v2 [G8].
- Voyage API limits: query ≤8,000 tokens; ≤1,000 documents; query+doc ≤32,000; total ≤600K tokens per request [G7].
- Voyage also published "The Case Against LLMs as Rerankers" (2025-10-22), which I did not open [G11].

### E. Embeddings — leaderboard facts (MTEB API, 2026-09-30) [G13]
MTEB(Multilingual, v2), Borda rank / mean(task) / retrieval:
1 harrier-oss-v1-27b 0.7427/0.7827 · 2 KaLM-Embedding-Gemma3-12B-2511 0.7232/0.7566 · 3 llama-embed-nemotron-8b
0.6946/0.6869 · 4 Qwen3-Embedding-8B 0.7058/0.7088 · 5 gemini-embedding-001 0.6837/0.6771 · 10 harrier-oss-v1-0.6b
0.6901/0.7075 · 14 jina-embeddings-v5-omni-small 0.67 · 31 embeddinggemma-300m 0.6115.
MTEB(rus, v1.1), rank / mean / retrieval:
1 Giga-Embeddings-instruct-10B-A1.8B-0826 0.7499/0.8159 · 1 (tie) Giga-Embeddings-instruct-3B-0826 0.7455/0.8086 ·
3 Giga-Embeddings-instruct (2025-09-23) 0.7416/0.8140 · 4 Qwen3-Embedding-8B 0.7142/0.7819 · 5 F2LLM-v2-14B
0.7090/0.7636 · 7 ai-forever/FRIDA 0.7095/0.7638 · 8 Giga-Embeddings-instruct-480M-0826 0.7096/0.7619 ·
11 sergeyzh/BERTA 0.6939/0.7379 · 16 embeddinggemma-300m 0.6519/0.715 · 20 jina-embeddings-v3 0.6358/0.7298 ·
23 deepvk/USER-bge-m3 0.6286/0.7412 · 30 BAAI/bge-m3 0.6163/0.752.
Caveats: commercial models (OpenAI, Cohere, Voyage, Gemini) often have **incomplete** task coverage on these
benchmarks (mean shown as 0 by the API), so their rank is not meaningful there. Voyage-4-large leads **RTEB(beta)**,
which includes private datasets [G13]. The Russian benchmark tasks are MIRACL reranking/retrieval (hard negatives
v2), RiaNews retrieval (HN v2), RuBQ, plus classification/STS/clustering [G13].
Giga-Embeddings usage, VERBATIM model card [G15]: mean pooling + L2 normalization; the instruction goes on the query
only:
```
Instruct: {описание задачи}
Query: {ваш текст}
```
Gemini Embedding 2 asymmetric retrieval format, VERBATIM [G37]: query `task: search result | query: {content}`;
document `title: {title} | text: {content}` ("If there is no title, use `title: none`").

### F. Grounded citations over your own retrieval — Anthropic `search_result` blocks (VERBATIM schema) [G32]
```json
{
  "type": "search_result",
  "source": "https://example.com/article", // Required: Source URL or identifier
  "title": "Article Title", // Required: Title of the result
  "content": [
    // Required: Array of text blocks
    {
      "type": "text",
      "text": "The actual content of the search result..."
    }
  ],
  "citations": {
    // Optional: Citation configuration
    "enabled": true // Enable/disable citations for this result
  }
}
```
The response citation, VERBATIM [G32]:
```json
{
  "type": "search_result_location",
  "cited_text": "All API requests must include an API key in the Authorization header. Keys can be generated from the dashboard. Rate limits: 1000 requests per hour for standard tier, 10000 for premium.",
  "source": "https://docs.company.com/api-reference",
  "title": "API Reference - Authentication",
  "search_result_index": 0,
  "start_block_index": 0,
  "end_block_index": 1
}
```
Rules [G32]:
- Search results can be returned from a tool call or passed as top-level user content.
- Citations are off by default and must use the same setting for all results in a request.
- The text block is the minimal citable unit, so split chunks into blocks for finer citations.
- `cited_text` is not counted toward output tokens.
- Content is text only.
- Supported on "All active models [...] with the exception of Claude Haiku 3. No beta header is required."
This is the natural RAG→citation bridge. spec §11 (document-type citations) covers documents passed inline, not
retrieval results.

### G. RAGAS formulas (VERBATIM from docs) [G24]
- Faithfulness = (claims in the response supported by the retrieved context) / (total claims in the response).
- Context Recall = (claims in the reference supported by the retrieved context) / (total claims in the reference).
  It "always requires a reference".
- Context Precision@K = Σ_{k=1..K}(Precision@k × v_k) / (relevant items in the top K), with v_k ∈ {0,1}. It is
  rank-aware.
- Answer Relevancy = mean cosine(E_generated_question_i, E_user_input) over N=3 questions generated from the
  response. "While the score usually falls between 0 and 1, it is not guaranteed".
- Current API, VERBATIM:
```python
from ragas.metrics.collections import Faithfulness
scorer = Faithfulness(llm=llm)
result = await scorer.ascore(
    user_input="When was the first super bowl?",
    response="The first superbowl was held on Jan 15, 1967",
    retrieved_contexts=[
        "The First AFL–NFL World Championship Game was an American football game played on January 15, 1967, at the Los Angeles Memorial Coliseum in Los Angeles."
    ]
)
```
- Legacy `ragas.metrics.LLMContextRecall` etc. "will be deprecated in version 0.4 and removed in version 1.0" [G24].
- Classic IR metrics (COMPOSED definitions, standard IR, no source fetched):
  - recall@k = |relevant ∩ top-k| / |relevant|.
  - MRR = mean over queries of 1/rank of the first relevant result.
  - nDCG@k = DCG@k / IDCG@k, with DCG = Σ (2^rel_i − 1)/log2(i+1).
  - Anthropic's "failure rate" = 1 − recall@20 [G46]. The cookbook's "Pass@k" = the share of queries whose golden
    chunk is in the top k [G45].

### H. Query transformation — measured sources
- HyDE: in spec/practice.
- Query2doc: LLM pseudo-doc expansion, "boosts the performance of BM25 by 3% to 15%" on MS-MARCO/TREC DL, no
  fine-tuning [G53].
- Rewrite-Retrieve-Read: an RL-trained small rewriter for a frozen reader [G53].
- Step-back: abstraction first. PaLM-2L MuSiQue +7%, TimeQA +27% [G53].
- RAG-Fusion = multi-query + RRF. The Infineon study found good comprehensiveness, but "some answers strayed off topic
  when the generated queries' relevance to the original query is insufficient" [G53].
- BRIGHT: the MTEB leader SFR-Embedding-Mistral fell from 59.0 to 18.3 nDCG@10 on reasoning-intensive queries;
  "incorporating explicit reasoning about the query improves retrieval performance by up to 12.2 points" [G54]. This
  is the case for LLM query rewriting in hard domains.
- Anthropic: generic document summaries and HyDE-like approaches gave limited gains versus contextual retrieval
  (practice citing [G46]).

### I. Agentic retrieval — balanced evidence
- Pro-grep: Claude Code [G1][G2]; the grep-vs-vector study on LongMemEval [G51].
- Pro-index, or "both": Cursor semsearch (+12.5%) [G5]. voyage-code-4 argues "for queries that describe a symptom
  rather than syntax [...] full-text search returns no useful hits" (vendor) [G10]. BrowseComp-Plus: GPT-5 55.9% with
  BM25 → 70.1% with Qwen3-Embedding-8B "with fewer search calls" [G54]. Search-R1: RL-trained search use gives +41%
  (Qwen2.5-7B) and +20% (3B) over RAG baselines [G54].
- Synthesis for the chapter:
  - The agent loop is orthogonal to the index. An agent can call grep, BM25, a vector index or all of them as tools
    (→ ch.03).
  - For code with identifier-heavy queries, grep is a strong default with zero staleness.
  - For symptom/natural-language queries and for large prose corpora, a semantic or hybrid tool raises accuracy and
    lowers search-call count.

### J. Long context vs RAG vs CAG — more evidence
- Self-Route (2024-07): "when resourced sufficiently, LC consistently outperforms RAG in terms of average
  performance. However, RAG's significantly lower cost remains a distinct advantage"; route per query by model
  self-reflection [G52].
- LC vs RAG revisits (2024-12): "LC generally outperforms RAG in question-answering benchmarks [...]
  Summarization-based retrieval performs comparably to LC, while chunk-based retrieval lags behind. However, RAG has
  advantages in dialogue-based and general question queries." [G52]
- LaRA (2025-02): 2,326 cases, 11 LLMs; the choice depends on "the model's parameter size, long-text capabilities,
  context length, task type, and the characteristics of the retrieved chunks" — "No Silver Bullet" [G52].
- Long-context LLMs meet RAG (2024-10): output quality "initially improves first, but then subsequently declines as
  the number of retrieved passages increases", driven by hard negatives. Retrieval reordering helps [G52].
- Context Rot (Chroma, 2025-07-14): 18 models including GPT-4.1, Claude 4, Gemini 2.5 and Qwen3. Performance
  degrades with input length. LongMemEval focused (~300 tokens) vs full (~113K tokens) shows large gaps even with
  reasoning; distractors hurt [G28].
- Anthropic's rule of thumb, VERBATIM: "If your knowledge base is smaller than 200,000 tokens (about 500 pages of
  material), you can just include the entire knowledge base in the prompt" (2024 text, written for 200K models)
  [G46].

### K. Security and ACL — primary sources
- OWASP LLM08:2025 risks: unauthorized access and data leakage; cross-context leaks in shared vector DBs; embedding
  inversion; data poisoning; behaviour alteration. Mitigations: "fine-grained access controls with permission-aware
  vector stores", validated trusted sources, data classification, retrieval logging [G41].
- EchoLeak (CVE-2025-32711, NVD published 2025-06-11: "Ai command injection in M365 Copilot allows an unauthorized
  attacker to disclose information over a network") [G38]. Mechanics: one crafted email lands in the retrievable
  corpus, then bypasses the XPIA classifier, reference-style Markdown link redaction, auto-fetched images and a Teams
  proxy allowed by CSP. Zero-click exfiltration. Proposed mitigations include "prompt partitioning [...]
  provenance-based access control, and strict content security policies" [G39].
- PoisonedRAG: "90% attack success rate when injecting five malicious texts for each target question into a
  knowledge database with millions of texts"; evaluated defenses were "insufficient" [G40].
- Qdrant multitenancy (WebFetch paraphrase fidelity) [G42]:
  - a keyword payload index with `"is_tenant": true`, plus a `must` filter on `group_id` for every query;
  - `hnsw_config: {"payload_m": 16, "m": 0}` builds per-tenant graphs;
  - "Global requests (without the `group_id` filter) are slower";
  - sparse IDF must be isolated per tenant;
  - tiered multitenancy since v1.16.0.
  Qdrant 1.19 added a "Per-query IDF corpus for sparse vector search" [G44]. BM25 statistics leaking across tenants
  is a subtle ACL/ranking bug.
- COMPOSED guidance, derived from [G29][G41][G42]: enforce ACL as a **pre-filter inside the ANN query**, not as a
  post-filter on top-k. Post-filtering both under-delivers results (FP2) and invites leakage if someone forgets it.

### L. Managed RAG services (neither of the other files covers them)
- **OpenAI vector stores / file_search** [G35]:
  - auto chunk (800/400 default) + embed + index;
  - `attribute_filter` with eq/ne/gt/gte/lt/lte/in/nin and and/or;
  - hybrid RRF weights;
  - storage free up to 1 GB, then $0.10/GB/day.
- **Gemini File Search** [G36]:
  - text via gemini-embedding-001, multimodal via gemini-embedding-2; audio/video not supported;
  - "Storage is free of charge. Query time embeddings are free of charge"; pay for indexing embeddings and retrieved
    tokens;
  - max 100 MB per file; store caps of 1 GB (free) to 1 TB (tier 3); "Limit the size of each File Search store to
    under 20 GB";
  - cannot be combined with Google Search grounding in the same request.
- **Anthropic**: no embedding model of its own ("Anthropic does not offer its own embedding model"; it points to
  Voyage) [G33]. The RAG primitives are the `search_result` blocks and Citations [G32].
- **Pinecone Assistant** exists as a managed RAG product (docs index) [G55]. I did not examine it further.

### M. Parsing — the VLM-OCR wave (dates are HF repo creation dates; license from the card) [G17]
- dots.ocr (2025-07-30, MIT);
- MinerU2.5-1.2B (2025-09-17, **AGPL-3.0**);
- olmOCR-2-7B (2025-10-06, Apache-2.0);
- PaddleOCR-VL (2025-10-16, Apache-2.0);
- DeepSeek-OCR (2025-10-17, MIT);
- DeepSeek-OCR-2 (2026-01-27, Apache-2.0);
- PaddleOCR-VL-1.5 (2026-01-28);
- PaddleOCR-VL-1.6 (2026-05-27; the card claims "96.33% on OmniDocBench v1.6", self-evaluated for some baselines)
  [G56];
- granite-docling-258M (Apache-2.0; repo 2025-05, card updated 2025-09) [G17].
The de-facto parsing benchmark named by vendors is **OmniDocBench** [G56]. New LlamaParse SDK call, VERBATIM [G21]:
```python
job = client.parsing.create(
    tier="agentic",
    version="latest",
    file_id="your-file-id",
)
```

### N. Graph RAG — cost and effectiveness reality
- LazyGraphRAG (MSR, 2024-11-25) [G49]:
  - no LLM summarization at index time: NLP noun-phrase extraction plus graph statistics;
  - indexing cost "identical to vector RAG and 0.1% of the costs of full GraphRAG";
  - query cost "more than 700 times lower" than GraphRAG Global Search at comparable quality (MSR claim);
  - shipped into Microsoft Discovery / Azure Local; inclusion in the OSS `graphrag` lib is not confirmed.
- GraphRAG-Bench (2025-06): "recent studies report that GraphRAG frequently underperforms vanilla RAG on many
  real-world tasks" [G50].
- RAG vs GraphRAG (2025-02): the two have distinct strengths by task; the paper analyses "evaluation biases" [G50].
  Its relevance here: LightRAG-style win rates are LLM-judged pairwise comparisons, so treat them as weak evidence.

## Numbers

| Measurement | Value | Conditions | Source |
|---|---|---|---|
| Contextual retrieval headline | −35/−49/−67% failure | Gemini Text 004 embeddings, 1−recall@20, avg over domains, Cohere rerank top-150→20 | [G46] |
| Cookbook reproduction Pass@10 | 87.15% → 92.34% → 92.31% (hybrid) → 95.26% (+rerank) | 248 queries, 737 code chunks, voyage-2, claude-haiku-4-5, rerank-english-v3.0 | [G45] |
| Cookbook contextualization cost | ~$9.20 → ~$2.85 with caching (61.83% input tokens cached) | 737 chunks, 9 files, Haiku 4.5 | [G45] |
| Chunking recall/IoU | 800/400: 85.4/1.5; recursive 200/0: 88.1/6.9; LLM chunker: 91.9 recall | text-embedding-3-large, top-5, Chroma corpus | [G27] |
| voyage-context-4 vs context-3 | +2.08% chunk-level, +1.4% doc-level NDCG@10 | 39 datasets, 8 domains, vendor | [G9] |
| Contextualized vs single-vector | +7.11% | LongEmbed, voyage-context-4, vendor | [G9] |
| voyage-code-4 vs voyage-code-3 / Cohere v4 / Gemini Emb 2 / OpenAI v3 large | +27.54% / +28.25% / +31.03% / +48.58% | 19 "agentic code retrieval" benchmarks (issue→touched files), vendor | [G10] |
| rerank-3 vs Cohere v4.0 Pro | +2.72% (avg), +13.84% (long docs) | 95 datasets, top-100 candidates, NDCG@10, vendor | [G8] |
| rerank-3 gain over BM25 first stage | +20.33% NDCG@10 | same | [G8] |
| Cursor semsearch | +12.5% avg QA accuracy (6.5–23.5%); +2.2% dissatisfied follow-ups without it | Cursor internal A/B, 2025 | [G5] |
| BrowseComp-Plus | Search-R1+BM25 3.86%; GPT-5+BM25 55.9%; GPT-5+Qwen3-Emb-8B 70.1% | fixed curated corpus | [G54] |
| BRIGHT | SFR-Embedding-Mistral 59.0 (MTEB) → 18.3 nDCG@10; +12.2 pts with query reasoning | 1,384 queries | [G54] |
| Query2doc | BM25 +3–15% | MS-MARCO, TREC DL | [G53] |
| PoisonedRAG | 90% ASR | 5 poisoned texts per target question, millions of texts | [G40] |
| LazyGraphRAG | index cost 0.1% of GraphRAG; >700× cheaper queries than Global Search | MSR claim | [G49] |
| MTEB multilingual v2 #1 | harrier-oss-v1-27b mean 0.7427 | live API, 2026-09-30, Borda rank | [G13] |
| MTEB rus v1.1 #1 | Giga-Embeddings-10B-A1.8B-0826 mean 0.7499, retrieval 0.8159 | same | [G13] |
| ViDoRe v3 #1 | tencent/EVIE-8B 0.6624 | same | [G13] |
| pgvector limits | 2,000 dims (vector), 4,000 (halfvec), 64,000 (bit); ef_search default 40; max_scan_tuples 20,000 | README | [G29] |
| OpenAI vector store | 800/400 default chunking; ≤50 results; $0.10/GB/day over 1 GB | docs | [G35] |
| Gemini File Search | 100 MB/file; store ≤20 GB recommended; free storage and query embeddings | docs | [G36] |
| Voyage rerank limits | ≤1,000 docs; ≤600K total tokens; query ≤8K | docs | [G7] |
| Step-back | TimeQA +27%, MuSiQue +7% | PaLM-2L | [G53] |

## Pitfalls, limits, criticism (additions)

- **Leaderboard rank ≠ fitness.** Borda ranks, incomplete coverage for commercial models, vendor-built suites
  (RTEB, Voyage's 95 datasets) and license traps (Jina v5 CC-BY-NC; MinerU AGPL; KaLM community licence; Nemotron
  openmdw) [G13][G14][G16][G17]. Evaluate on your own queries.
- **Model upgrades force full re-embeds** (gemini-embedding-001→2 is explicitly incompatible [G37]). Voyage 4 and
  Cohere Embed 5 advertise shared spaces within a family (Cohere: "Pro and Fast share an embedding space" [G12]; Voyage 4 per field[S12]). Store the model id and
  dimension with every vector.
- **RRF k and weights are engine-specific** (Qdrant k=2 default vs k=60 elsewhere). Fusion inside a Qdrant prefetch is
  per shard [G43]. Do not port thresholds between engines.
- **Tenant leakage through statistics**, not only through documents: shared HNSW graphs affect other tenants' recall
  [G29], and shared BM25 IDF leaks corpus statistics [G42][G44].
- **Managed-RAG defaults are not best practice**: the OpenAI 800/400 chunking default [G35] is the worst config in the
  Chroma study [G27].
- **The "agentic search" evidence is mostly vibes plus vendor data.** The Claude Code decision was "mostly vibes"
  [G1]. The Cursor and Voyage numbers are self-reported [G5][G10].
- **Deprecated toolchains in tutorials**: `llama-parse`, `colpali-engine`, the legacy RAGAS metrics API, old Qdrant
  `FusionQuery` examples (still shown in spec; the current docs use `{"rrf": {}}` / `RrfQuery`) [G20][G23][G24][G43].
- **Reranker score thresholds**: only portable when the vendor calibrates them (Voyage rerank-3 keeps the 2.5 score
  distribution) [G8].

## What changed in the last 6 months (Apr–Sep 2026), additions to the other files

- Voyage: voyage-context-4 (06-29), voyage-code-4 (08-13), rerank-3 (09-30) [G8][G9][G10].
- Cohere Embed 5 (09-30) [G12].
- Sber Giga-Embeddings-0826 takes MTEB rus #1 (08-19). NVIDIA Nemotron-3-Embed-8B (07-14). ViDoRe v3 is led by new
  Qwen3.5-based multi-vector models and tencent EVIE (09-04) [G13].
- Sentence Transformers v6 (08-18) makes late interaction (ColBERT/ColPali) first-class and deprecates
  `colpali-engine` [G18][G23].
- Qdrant 1.18/1.19 (TurboQuant 4/8-bit, memory tiers, per-query IDF). Weaviate 1.40-rc (HFresh MUVERA, RQ-4). Pinecone
  API 2026-07 (document indexes, schema-only create). Milvus 3.0 line [G18][G44][G55].
- LlamaParse moved to the `llama-cloud` SDK. The old SDK reached end of maintenance on 2026-05-01 [G20].
- Cursor's public docs now describe grep-only local search with "no stored embeddings" (date of change unverified)
  [G3].
- GraphRAG 3.1–3.2 are maintenance releases [G18][G22].
- RAGAS has had no release since January [G18].

## Diagram candidates (additions)

1. **Seven failure points on the pipeline**: pipeline boxes (Index → Retrieve → Consolidate/Context → Generate) with
   FP1–FP7 pinned to the stage where each arises; the arrows are the data handed over (chunks, top-k, context, answer)
   [G25].
2. **Claude Code decision flow, 2024→2025**: an "early Claude Code + Voyage index" box, with arrows labelled "code
   drifts out of sync", "index must live somewhere (security)" and "agentic search outperformed" leading to a
   "glob/grep agent loop" box. Annotate "cost: latency + tokens" [G1].
3. **Cursor search architecture then vs now**: 2025 (local Merkle tree → server embeddings + grep) vs 2026 docs
   (Instant Grep local index + Explore subagent; "no stored embeddings"), with a question mark on the transition date
   [G3][G5].
4. **ACL-aware retrieval**: user → auth → query with tenant/ACL pre-filter inside ANN (Qdrant `is_tenant`, pgvector
   partitions) vs a post-filter path (under-delivery + leak risk). States: allowed, denied, filtered-out [G29][G42].
5. **EchoLeak kill chain**: attacker email → retrievable corpus → Copilot RAG → XPIA classifier bypass → reference-style
   Markdown → auto-fetched image via Teams proxy → exfiltration [G39].
6. **Search-result citations round trip**: app retriever → `tool_result` with `search_result` blocks → Claude → text
   blocks with `search_result_location` (search_result_index, start/end_block_index) [G32].
7. **Fusion engine differences**: the same two ranked lists fused with k=60 (Cormack) vs k=2 (Qdrant default),
   showing the different top-3; plus per-shard vs global fusion [G43][G47].
8. **Managed RAG vs self-hosted**: OpenAI vector store / Gemini File Search boxes (what is automatic: chunk, embed,
   index, hybrid) vs a DIY stack; label the billing points (storage/day vs index-time embeddings) [G35][G36].
9. **Long context vs RAG decision tree v2**: KB < ~200K tokens and static → in prompt + cache [G46]; else Self-Route
   (try RAG, fall back to LC) [G52]; watch context rot [G28].
10. **Reranker placement and budget**: first stage top-100/150 → reranker (32K ctx, ≤1,000 docs) → top-10/20 → LLM,
    annotated with the recall ceiling [G7][G8][G46].

Chart candidates:
- Chroma chunking: recall vs IoU scatter (the 6 rows in Mechanics B) [G27].
- MTEB rus v1.1 top 12 (mean and retrieval) as a horizontal bar chart, from the values in Mechanics E [G13].
- Contextual-retrieval cookbook Pass@5/10/20 across 4 stages (baseline 80.92/87.15/90.06; contextual
  88.12/92.34/94.29; hybrid 88.86/92.31/95.23; +rerank 92.15/95.26/97.45) [G45].
- BrowseComp-Plus accuracy by retriever (BM25 55.9 vs Qwen3-Emb-8B 70.1 for GPT-5) [G54].
- Voyage rerank-3 gain by first stage (BM25 +20.33, OpenAI v3 large +16.67, voyage-3-large +7.65, voyage-4-large +6.38)
  [G8].

## Glossary (additions)

- **FP1–FP7**: Barnett et al.'s seven RAG failure points [G25].
- **Borda count (MTEB)**: rank aggregation in which each task "votes" for model orderings; used for leaderboard rank
  instead of the mean [G14].
- **RTEB**: MTEB's retrieval benchmark with open and private datasets (beta) [G13].
- **MTEB(rus, v1.1)**: the Russian MTEB suite; v1.1 swapped in hard-negative MIRACL and RiaNews retrieval [G13].
- **Iterative index scan (pgvector)**: keeps scanning an HNSW/IVFFlat index until enough rows pass the `WHERE` filter
  [G29].
- **`search_result` block**: an Anthropic Messages API content block carrying your retrieved text with a source and
  title, citable as `search_result_location` [G32].
- **Document index (Pinecone)**: a schema-defined index mixing dense, sparse and BM25 full-text fields [G55].
- **TurboQuant (Qdrant)**: a quantization variant (8× compression in 1.18; 4-bit primary storage in 1.19) [G44].
- **LazyGraphRAG**: GraphRAG variant that defers LLM work to query time; its index is concept co-occurrence [G49].
- **Self-Route**: per-query routing between RAG and long context based on model self-reflection [G52].
- **Context rot**: performance degradation as input length grows, measured across 18 LLMs by Chroma [G28].
- **Contextualized chunk embeddings**: one forward pass over the full document producing per-chunk vectors (Voyage
  context-3/4) [G9].

## Unverified / open questions

- **When did Cursor stop storing codebase embeddings, and why?** Tried: changelog pages 1–15 (Mar 2026 → Nov 2025),
  the blog index, HN Algolia ("cursor semantic search removed", "cursor codebase indexing deprecated") and the
  Wayback availability API (returned non-JSON). Found nothing. Only the current docs state is verified [G3][G4].
- **Elastic's acquisition of Jina AI**: the Jina v5 model card links to "Elastic Inference Service" and an elastic.co
  blog [G16], which suggests Elastic ownership. The Elastic IR page fetch returned no content and HN search returned
  nothing. Not verified. Do not state it.
- **Voyage "The Case Against LLMs as Rerankers" (2025-10-22)**: exists in the feed [G11]; numbers not read.
- **RTEB mean scores**: the leaderboard API returns ranks but null means for RTEB(beta) (private sets hidden, see
  mteb issue #3934) [G13]. Only the ordering is verified.
- **PoisonedRAG venue** (reported as USENIX Security 2025): not verified; only the arXiv abstract was read [G40].
- **Qdrant multitenancy snippets** came via WebFetch summarization (paraphrase fidelity), not a raw file [G42].
- **Chroma table** came via WebFetch; values look internally consistent but are not byte-verified [G27].
- **Claude context-window claims in spec (1M on Sonnet 5/Opus 5.x, etc.)**: not re-verified in this pass.
- **pgvectorscale/VectorChord on AWS RDS availability as of Sept 2026**: field's "not on RDS" is from late-2025
  comments; not re-checked.
- **HF `createdAt` dates for OCR models** are repo creation dates, not necessarily announcement dates [G17].

## Sources

- [G1] Latent Space podcast, "Claude Code: Anthropic's CLI Agent" (Boris Cherny, Cat Wu; hosts swyx, Alessio), latent.space, 2025-05-07, https://www.latent.space/p/claude-code — accessed 2026-09-30.
- [G2] Hacker News comment by bcherny (Boris Cherny), item 43164253, story "Claude 3.7 Sonnet and Claude Code", 2025-02-24, https://news.ycombinator.com/item?id=43164253 (via hn.algolia.com API) — accessed 2026-09-30.
- [G3] Cursor Docs, "Search" (Instant Grep, Explore subagent, privacy), undated, https://cursor.com/docs/agent/tools/search.md — accessed 2026-09-30.
- [G4] Cursor Docs, "Privacy and Data Governance", undated, https://cursor.com/docs/enterprise/privacy-and-data-governance.md — accessed 2026-09-30.
- [G5] Cursor blog, "Semantic search", 2025-11-06, https://cursor.com/blog/semsearch — accessed 2026-09-30.
- [G6] Cursor changelog pages (2.1, 2025-11-21 "Instant Grep (Beta)"; 1.x "Improved embeddings for semantic search"), https://cursor.com/changelog and /changelog/page/2…15 — accessed 2026-09-30.
- [G7] Voyage AI docs, "Rerankers" (updatedAt 2026-09-29), https://docs.voyageai.com/docs/reranker.md — accessed 2026-09-30.
- [G8] Voyage AI blog, "rerank-3 and rerank-3-lite: the next generation of Voyage rerankers", 2026-09-30, https://blog.voyageai.com/2026/09/30/rerank-3/ — accessed 2026-09-30.
- [G9] Voyage AI blog, "voyage-context-4: stop worrying about chunking with our best-performing model", 2026-06-29, https://blog.voyageai.com/2026/06/29/voyage-context-4/ — accessed 2026-09-30.
- [G10] Voyage AI blog, "voyage-code-4: code retrieval built for coding agents", 2026-08-13, https://blog.voyageai.com/2026/08/13/voyage-code-4/ — accessed 2026-09-30.
- [G11] Voyage AI blog index and RSS feed (joining MongoDB 2025-02-24; LLMs-as-rerankers 2025-10-22; Voyage 4 2026-01-15), https://blog.voyageai.com/feed/ — accessed 2026-09-30.
- [G12] Cohere Release Notes (Embed 5, 2026-09-30; Rerank v4.0, 2025-12-11), https://docs.cohere.com/changelog and https://docs.cohere.com/changelog.md — accessed 2026-09-30.
- [G13] MTEB Leaderboard backend API, /v1/benchmarks and /v1/benchmarks/{MTEB(rus, v1.1) | MTEB(Multilingual, v2) | MTEB(eng, v2) | RTEB(beta) | ViDoRe(v3)}/scores, https://mteb-leaderboard-backend.hf.space — accessed 2026-09-30 (live data).
- [G14] "MMTEB: Massive Multilingual Text Embedding Benchmark", arXiv 2502.13595, 2025-02-19, https://arxiv.org/abs/2502.13595 — accessed 2026-09-30.
- [G15] ai-sage, "Giga-Embeddings-instruct-10B-A1.8B-0826" model card, Hugging Face, release 2026-08-19 (per MTEB metadata), https://huggingface.co/ai-sage/Giga-Embeddings-instruct-10B-A1.8B-0826 — accessed 2026-09-30.
- [G16] Jina AI, "jina-embeddings-v5-text-small" model card, released 2026-02-18, https://huggingface.co/jinaai/jina-embeddings-v5-text-small — accessed 2026-09-30.
- [G17] Hugging Face model API metadata (createdAt, license) for harrier-oss-v1, Nemotron-3-Embed-8B, KaLM-Gemma3, embeddinggemma, voyage-4-nano, Qwen3-Embedding-8B, DeepSeek-OCR(-2), PaddleOCR-VL(-1.5/-1.6), olmOCR-2, MinerU2.5, dots.ocr, granite-docling, https://huggingface.co/api/models/... — accessed 2026-09-30.
- [G18] GitHub Releases API (via gh) for qdrant, weaviate, milvus, docling, ragas, graphrag, LightRAG, HippoRAG, lancedb, llama_index, sentence-transformers, colpali, unstructured, chroma, llama_cloud_services, pg_textsearch, VectorChord; pgvector tags — accessed 2026-09-30.
- [G19] PyPI JSON API latest versions (hipporag, ragas, llama-parse, llama-cloud, docling, graphrag, colpali-engine, qdrant-client, weaviate-client, pymilvus, lancedb, turbopuffer, pinecone, mteb, voyageai, cohere …), https://pypi.org/pypi/<pkg>/json — accessed 2026-09-30.
- [G20] run-llama/llama_cloud_services README (deprecation notice), https://github.com/run-llama/llama_cloud_services — accessed 2026-09-30.
- [G21] run-llama/llama-cloud-py README, https://github.com/run-llama/llama-cloud-py — accessed 2026-09-30.
- [G22] microsoft/graphrag README (maintenance-mode note), https://github.com/microsoft/graphrag — accessed 2026-09-30.
- [G23] illuin-tech/colpali README ("ColPali Engine is deprecated"; ST v6 migration table), https://github.com/illuin-tech/colpali — accessed 2026-09-30.
- [G24] RAGAS README (repo vibrantlabsai/ragas) and metric docs (faithfulness, context_precision, context_recall, answer_relevance .md in docs/concepts/metrics/available_metrics), https://github.com/vibrantlabsai/ragas — accessed 2026-09-30.
- [G25] Barnett et al., "Seven Failure Points When Engineering a Retrieval Augmented Generation System", arXiv 2401.05856, 2024-01-11, https://arxiv.org/html/2401.05856v1 — accessed 2026-09-30.
- [G26] "Is Semantic Chunking Worth the Computational Cost?", arXiv 2410.13070, 2024-10-16, https://arxiv.org/abs/2410.13070 — accessed 2026-09-30.
- [G27] Smith, Troynikov (Chroma), "Evaluating Chunking Strategies for Retrieval", 2024-07-03, https://www.trychroma.com/research/evaluating-chunking — accessed 2026-09-30.
- [G28] Hong, Troynikov, Huber (Chroma), "Context Rot", 2025-07-14, https://www.trychroma.com/research/context-rot — accessed 2026-09-30.
- [G29] pgvector README (master), https://github.com/pgvector/pgvector — accessed 2026-09-30.
- [G30] pgvector-python, examples/hybrid_search/rrf.py, https://github.com/pgvector/pgvector-python/blob/master/examples/hybrid_search/rrf.py — accessed 2026-09-30.
- [G31] timescale/pg_textsearch README (v1.4.0 current), https://github.com/timescale/pg_textsearch — accessed 2026-09-30.
- [G32] Anthropic docs, "Search results", undated, https://platform.claude.com/docs/en/build-with-claude/search-results.md — accessed 2026-09-30.
- [G33] Anthropic docs, "Embeddings", undated, https://platform.claude.com/docs/en/build-with-claude/embeddings.md — accessed 2026-09-30.
- [G34] OpenAI docs, "Vector embeddings" guide, undated, https://developers.openai.com/api/docs/guides/embeddings.md — accessed 2026-09-30.
- [G35] OpenAI docs, "Retrieval" guide (vector stores, chunking, ranking_options), undated, https://developers.openai.com/api/docs/guides/retrieval.md — accessed 2026-09-30.
- [G36] Google AI for Developers, "File Search", undated, https://ai.google.dev/gemini-api/docs/file-search — accessed 2026-09-30.
- [G37] Google AI for Developers, "Embeddings" (gemini-embedding-2), undated, https://ai.google.dev/gemini-api/docs/embeddings — accessed 2026-09-30.
- [G38] NVD, CVE-2025-32711, published 2025-06-11, https://nvd.nist.gov/vuln/detail/CVE-2025-32711 (via services.nvd.nist.gov API) — accessed 2026-09-30.
- [G39] "EchoLeak: The First Real-World Zero-Click Prompt Injection Exploit in a Production LLM System", arXiv 2509.10540, 2025-09-06, https://arxiv.org/abs/2509.10540 — accessed 2026-09-30.
- [G40] "PoisonedRAG: Knowledge Corruption Attacks to Retrieval-Augmented Generation of LLMs", arXiv 2402.07867, 2024-02-12, https://arxiv.org/abs/2402.07867 — accessed 2026-09-30.
- [G41] OWASP GenAI Security Project, "LLM08:2025 Vector and Embedding Weaknesses", https://genai.owasp.org/llmrisk/llm082025-vector-and-embedding-weaknesses/ — accessed 2026-09-30.
- [G42] Qdrant docs, "Multitenancy" guide, undated, https://qdrant.tech/documentation/guides/multiple-partitions/ — accessed 2026-09-30 (WebFetch).
- [G43] Qdrant docs source, "Hybrid and Multi-Stage Queries" + snippets (hybrid-rrf, hybrid-rrf-k, hybrid-rrf-weights), https://github.com/qdrant/landing_page/blob/master/qdrant-landing/content/documentation/search/hybrid-queries.md — accessed 2026-09-30.
- [G44] Qdrant GitHub releases v1.17.0 (2026-02-20), v1.18.0 (2026-05-11), v1.19.0 (2026-08-05), https://github.com/qdrant/qdrant/releases — accessed 2026-09-30.
- [G45] anthropics/claude-cookbooks, capabilities/contextual-embeddings/guide.ipynb (with outputs), https://github.com/anthropics/claude-cookbooks/tree/main/capabilities/contextual-embeddings — accessed 2026-09-30.
- [G46] Anthropic, "Introducing Contextual Retrieval", 2024-09-19, https://www.anthropic.com/news/contextual-retrieval — re-read 2026-09-30.
- [G47] Cormack, Clarke, Büttcher, "Reciprocal Rank Fusion outperforms Condorcet and individual Rank Learning Methods", SIGIR 2009, https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf — accessed 2026-09-30.
- [G48] arXiv metadata: "Late Chunking: Contextual Chunk Embeddings Using Long-Context Embedding Models" 2409.04701 (2024-09-07); Jina blog 2024-08-22 (https://jina.ai/news/late-chunking-in-long-context-embedding-models/); LightRAG 2410.05779 (2024-10-08, v3 2025-04-28); "From Local to Global: A Graph RAG Approach to Query-Focused Summarization" 2404.16130 (2024-04-24); [G48b] "Reconstructing Context: Evaluating Advanced Chunking Strategies for RAG" 2504.19754 (2025-04-28) — accessed 2026-09-30.
- [G49] Microsoft Research blog, "LazyGraphRAG: Setting a new standard for quality and cost", 2024-11-25, https://www.microsoft.com/en-us/research/blog/lazygraphrag-setting-a-new-standard-for-quality-and-cost/ — accessed 2026-09-30.
- [G50] "RAG vs. GraphRAG: A Systematic Evaluation and Key Insights", arXiv 2502.11371, 2025-02-17; "When to use Graphs in RAG" (GraphRAG-Bench), arXiv 2506.05690, 2025-06-06 — accessed 2026-09-30.
- [G51] Sen, Kasturi, Lumer, Gulati, Subbiah (per practice[S9b]), "Is Grep All You Need? How Agent Harnesses Reshape Agentic Search", arXiv 2605.15184, 2026-05-14, https://arxiv.org/abs/2605.15184 — accessed 2026-09-30.
- [G52] "Lost in the Middle" 2307.03172 (2023-07-06); "Retrieval Augmented Generation or Long-Context LLMs? A Comprehensive Study and Hybrid Approach" (Self-Route) 2407.16833 (2024-07-23); "Long Context vs. RAG for LLMs: An Evaluation and Revisits" 2501.01880 (2024-12-27); "LaRA" 2502.09977 (2025-02-14); "Long-Context LLMs Meet RAG" 2410.05983 (2024-10-08) — arXiv, accessed 2026-09-30.
- [G53] Query2doc 2303.07678 (2023-03-14); Rewrite-Retrieve-Read 2305.14283 (2023-05-23); Step-Back 2310.06117 (2023-10-09); RAG-Fusion 2402.03367 (2024-01-31) — arXiv, accessed 2026-09-30.
- [G54] BRIGHT 2407.12883 (2024-07-16); BrowseComp-Plus 2508.06600 (2025-08-08); Search-R1 2503.09516 (2025-03-12) — arXiv, accessed 2026-09-30.
- [G55] Pinecone docs, "Index data overview" (document indexes, API 2026-07), undated, https://docs.pinecone.io/guides/index-data/indexing-overview.md — accessed 2026-09-30.
- [G56] PaddlePaddle, "PaddleOCR-VL-1.6" model card (release note 2026-05-28), https://huggingface.co/PaddlePaddle/PaddleOCR-VL-1.6 — accessed 2026-09-30.
