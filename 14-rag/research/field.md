# Chapter 14. RAG-системы — field reports notes

Scope note: this chapter owns the retrieval pipeline (ingest→parse→chunk→embed→index→retrieve→rerank→generate),
document parsing, chunking, embeddings, hybrid search, rerankers, GraphRAG/LightRAG/HippoRAG, agentic/agentic-search
RAG, multimodal retrieval, vector DBs, evaluation, and production failure modes. Cross-links: agent tool design for
retrieval tools → ch.03; context management/compaction → ch.02; memory systems that overlap with GraphRAG-for-memory
→ ch.11; multi-agent retrieval orchestration → ch.13; auth/ACL plumbing for enterprise RAG → ch.15; injection via
documents → ch.16; eval harnesses beyond RAGAS → ch.17.

## TL;DR (what an engineer must know today, 2026-09-30)

- **Contextual Retrieval (Anthropic, Sept 2024) is still the reference technique** for chunk-context loss: prepending
  an LLM-generated 50–100 token situating blurb to each chunk before embedding/BM25-indexing cut retrieval failure
  (top-20) from 5.7% to 3.7% (embeddings alone, −35%) and to 1.9% with reranking added (−67%) [S1]. These numbers are
  quoted everywhere in 2026 content as the baseline to beat.
- **Late/contextual chunk embeddings are now a shipped product feature, not a research idea**: Voyage's
  `voyage-context-3` embeds each chunk with full-document context in a single pass, beating Anthropic's own
  contextual-retrieval recipe by 6.76% and Jina late-chunking by 23.66% on chunk-level retrieval NDCG [S5].
- **pgvector is the most litigated vector-store choice in the field.** A widely discussed Oct 2025 post ("The Case
  Against PGVector", 381 pts/137 comments on HN) documents real operational pain: multi-GB, multi-hour HNSW index
  builds on the production Postgres instance, IVFFlat clusters that don't rebalance, and a pre-filter/post-filter
  dilemma. The comment section is where the real signal is — see Mechanics/Pitfalls [S2].
- **"Just use Postgres" still wins by default for small/medium corpora.** Discourse runs pgvector across thousands of
  per-tenant DBs in production at billions of page views, using binary/halfvec quantization and Postgres 0.8.0's
  iterative index scans to fix the filtering problem [S2, comment by a Discourse engineer].
- **Rerankers cannot fix a bad first-stage retriever.** On SciFact, a cross-encoder reranker at k=5/k=10 does not beat
  raw BM25 (nDCG@10 0.662); only at k=20 does it edge ahead (+0.009 nDCG) at ~2000× the latency (0.11ms → ~225ms) —
  "a smart layer can only refine what the layer beneath hands it" [S4]. Recall ceiling, not reranker quality, is the
  bottleneck most teams actually hit.
- **Agentic/grep-style code search vs vector index is an active, unresolved argument, not a settled "RAG is dead"
  story.** Cursor shipped a trained semantic-search embedding model in Nov 2025 and reports +12.5% average QA
  accuracy (6.5–23.5% depending on model) and −2.2% dissatisfied follow-ups, "best when combined with grep" [S19].
  A May 2026 study (fff/pgr/ripgrep on real coding-agent tasks) found search *speed* barely matters (14.7ms→1.7ms
  moved end-to-end wall time only 38.6s→37.0s) but *ranking quality* does (Hit@1 26%→34%, MRR 0.32→0.41) [S11].
- **Chunking-plus-embedding retrieval for code is being challenged by dedicated code-search tools that skip
  vector DBs entirely** (Semble: tree-sitter chunking + a small trained cross-encoder-ish ranker, claims 98% fewer
  tokens than grep+read-file; HN discussion is skeptical of the framing but confirms the direction) [S9].
- **GraphRAG/knowledge-graph memory is being second-guessed in the field for agent memory use cases** — a 136-point
  HN thread ("Everyone's trying vectors and graphs for AI memory. We went back to SQL") argues relational
  SQL beats both vector and graph approaches for most agent-memory retrieval, while acknowledging vector search wins
  for genuine semantic/fuzzy matching across languages [S7].
- **LightRAG and HippoRAG remain the two "cheap graph-RAG" reference points**: LightRAG (Oct 2024, updated through
  Apr 2025) does dual-level (entity + high-level) graph+vector retrieval with incremental updates [S22]; HippoRAG
  (NeurIPS 2024) uses an LLM-built knowledge graph + Personalized PageRank, claiming up to +20% on multi-hop QA at
  10–30× lower cost and 6–13× lower latency than iterative-retrieval baselines [S23].
- **Multimodal "PDF-as-image" retrieval (ColPali/ColQwen family) is in production, not just a paper.** Morphik (HN
  Show HN, 200 pts) runs two ingestion paths — OCR+text-embeddings and ColPali — and reports ColPali is materially
  better on tables because it encodes layout/position; production latency is ~4–5s/page on an A100, ~15–20s/page on
  a MacBook Air M2 [S8].
- **Late-interaction (ColBERT-style) retrieval got a real production speedup in 2026**: Vespa's binary multivector
  MaxSim kernel went from 91.8ms to 2.8ms per query (32.8× in benchmark, ~10× in production for slow queries) by
  computing Hamming-distance MaxSim in one pass instead of materializing score tensors [S15].
- **Embedding leaderboard churn is fast and the field has stopped trusting "MTEB rank" alone**: Voyage-4-large
  (Jan 2026, MoE) claims +14.05% NDCG over OpenAI-v3-large, +8.20% over Cohere Embed v4, +8.20% over Gemini
  Embedding 001 on RTEB (29 datasets) [S12]; Google answered in March 2026 with Gemini Embedding 2, the first
  natively multimodal embedding model (text/image/video/audio/PDF into one space, 100+ languages) [S13]. Expect this
  table to be stale again within a quarter.
- **Matryoshka truncation is not free — post-hoc PCA on non-Matryoshka-trained embeddings often beats naive MRL
  truncation at aggressive compression** (32–64 dims), an inversion of the usual "buy an MRL model" advice [S14].
- **Production RAG cost is dominated by unnecessary round trips and over-stuffed context, not model price**: one
  practitioner writeup claims cutting a $2,400/month RAG bill by 73% mainly by capping context at ~3k tokens (from
  8–15k) and switching top-20→top-8 retrieval via hybrid (70% semantic/30% keyword) reranking [S17] — numbers are
  self-reported and unverified, treat as anecdote not benchmark.

## Current state and versions (as of 2026-09-30)

- **Embeddings**: Voyage 4 family released 2026-01-15 (voyage-4-large/4/4-lite/4-nano, nano is Apache-2.0 open
  weight; MoE flagship; shared embedding space across the family enables asymmetric query/doc model mixing;
  dims 2048/1024/512/256 via Matryoshka; quantization fp32/int8/binary) [S12]. Gemini Embedding 2 released
  2026-03-10, Google's first natively multimodal embedding model, default 3072 dims, MRL down to 768, 100+
  languages, text up to 8192 tokens, images/video/audio/PDF natively [S13]. `voyage-context-3` (2025-07-23) remains
  the reference "contextualized chunk embedding" product: single pass over the whole doc, distinct vector per chunk
  [S5].
- **Rerankers**: Voyage rerank-2.5 / rerank-2.5-lite (Aug 2025) are "instruction-following" rerankers (HN, 93 pts)
  [from HN listing]; Contextual AI open-sourced a reranker-v2 collection on HF (Aug 2025). The 2026 field debate is
  less "which reranker" and more "do you even need one given your recall ceiling" [S4].
- **Vector databases**: pgvector remains the default-by-inertia choice; pgvectorscale (Timescale, disk-ANN based)
  and VectorChord (IVF+RaBitQ quantization, claims 15× more updates/sec and users running 3B vectors sharded on
  Postgres) are the two most-cited pgvector-pain relief options, but neither is available on AWS RDS as of the
  discussion (late 2025) [S2 comments]. `pg_textsearch` (Timescale, Mar 2026) brought native BM25 ranking to
  Postgres full-text search, framed explicitly as the missing half of hybrid search [S21]. turbopuffer crossed
  $100M run-rate by March 2026 per a widely shared tweet cited on HN [HN listing, unverified beyond the tweet].
- **Agentic code search**: Cursor's custom-trained semantic search embedding model shipped/blogged 2025-11-06 [S19].
  Anthropic's Claude Code is repeatedly described in community threads (not found as a primary Anthropic statement
  in this pass) as having evaluated and *not* shipped a persistent vector index, preferring grep/glob plus an
  in-context file-system model — treat this specific attribution as community-sourced/unverified (see
  Unverified section) even though it's a recurring, confident claim in multiple 2026 HN threads [S9 comment,
  S18 comment].
- **GraphRAG-adjacent**: LightRAG last major revision 2025-04-28 (v3) [S22]; HippoRAG NeurIPS 2024, last revised
  2025-01-14 [S23]; both are still the community's reference implementations as of Sept 2026, with newer entrants
  (ApeRAG "production-ready GraphRAG with multi-modal indexing and K8s deployment", Sept 2025; ".GibRAM"
  in-memory ephemeral GraphRAG runtime, Jan 2026) showing the space is still churning rather than consolidating
  [HN listings].

## Timeline (dated)

- **2023-09** — RAGAS paper published (arXiv 2309.15217), later the de facto open-source RAG eval library [S24].
- **2024-05-23** — HippoRAG paper (v1); accepted NeurIPS 2024; last revised 2025-01-14 [S23].
- **2024-09-19** — Anthropic publishes "Contextual Retrieval" with the 35%/49%/67% failure-rate-reduction numbers
  that are still the field's reference benchmark two years later [S1].
- **2024-10-08** — LightRAG paper submitted (v3 2025-04-28) [S22].
- **2025-01-07** — voyage-3-large released [HN listing].
- **2025-04-22** — Morphik (open-source ColPali-based multimodal RAG) launches on Show HN, 200 points — an early
  signal that "PDF as image" retrieval was moving from paper to product [S8].
- **2025-05-29** — LlamaIndex publishes "RAG is dead, long live agentic retrieval," arguing chunk-only retrieval is
  obsolete in favor of agentic routing across chunk/metadata/content-based strategies [S10].
- **2025-07-23** — Voyage ships `voyage-context-3`, a contextualized-chunk embedding model competing directly with
  Anthropic's prompted contextual-retrieval recipe [S5].
- **2025-08** — Voyage rerank-2.5/2.5-lite ("instruction-following rerankers") and Contextual AI's open reranker-v2
  ship within the same month — reranker market gets crowded [HN listings].
- **2025-09-22** — "Everyone's trying vectors and graphs for AI memory. We went back to SQL" HN thread (136 pts, 63
  comments) crystallizes 2025 H2 skepticism toward graph/vector complexity for agent memory specifically [S7].
- **2025-10-29** — "The Case Against PGVector" published; becomes the most-discussed pgvector critique of the
  period (381 pts / 137 comments once it hit HN in Nov 2025) [S2].
- **2025-11-06** — Cursor publishes its semantic-search blog post with the +12.5% accuracy number [S19].
- **2025-12-08** — Nia (YC S25) launches "context for coding agents," triggering a public HN debate about whether
  coding-agent RAG is regressing back to 2023-style RAG after the "agents don't need RAG" narrative [S18].
- **2026-01-15** — Voyage 4 family ships (MoE, shared embedding space, RTEB benchmark claims) [S12].
- **2026-03-10** — Gemini Embedding 2 ships as Google's first natively multimodal embedding model [S13].
- **2026-03-31** — Timescale ships `pg_textsearch`, native BM25 for Postgres (203 pts/56 comments on HN) [S21].
- **2026-05-17** — Semble launches (445 pts/151 comments), reigniting the grep-vs-index debate for coding agents
  specifically, with a public, contentious benchmark methodology discussion [S9].
- **2026-05-26/27** — bricbybric's "hippocampus memory engine" post claims a non-embedding, sparse-distributed-coding
  memory substrate beats MiniLM-filtered retrieval 90.91% vs 77.27% accuracy at ~10× fewer tokens per answer [S20].
- **2026-06-16** — Martin Fowler publishes Bayer's "PRINCE" production agentic RAG case study (hybrid search,
  reranking, RAGAS-based live eval, LangGraph orchestration) [S3].
- **2026-07-16/17** — "The Reranker Tax" post formalizes the "reranker can't beat a bad retriever's recall ceiling"
  argument with SciFact numbers [S4].
- **2026-08-01** — "Matryoshka vs. PCA" posts numbers showing PCA often beats MRL truncation at aggressive
  compression, challenging the "always buy a Matryoshka-trained model" heuristic [S14].
- **2026-08-13** — Vespa/Realm engineer publishes the 32.8× binary-multivector ColBERT MaxSim optimization,
  a concrete 2026 late-interaction production win [S15].

## Mechanics

### The pipeline, as actually implemented in 2026 field reports

**Ingest/parse.** Field reports converge on "convert to Markdown or images once, offline" rather than re-parsing at
query time. Bayer's PRINCE pipeline pre-converts thousands of preclinical PDFs into chunk-ready text enriched with
study-level metadata pulled from a separate structured store (Athena) [S3]. Morphik offers two ingestion paths and
explicitly recommends ColPali (page rendered as image, embedded with a vision-language model) over OCR+text
specifically because "it can encode positional stuff and layouts as well" — this is the practical argument for
"PDF as image" beating text extraction for tables and forms [S8, quoting the author]. An HN commenter (`th0ma5`)
pushed back hard: "whenever I ask people wanting to use such features at scale which figure could be out of place or
have a transposed digit it generally makes the project evaporate" — i.e. numeric fidelity in scanned tables remains
an open trust problem for VLM-based parsing even where layout is captured well [S8].

**Chunking.** No single "winning" strategy emerged in the field data; instead the community pattern is: start with
fixed/recursive chunking, add contextual augmentation, and only move to semantic/structure-aware chunking when a
benchmark shows a specific failure. Docling's own issue tracker shows the concrete pain points teams hit with
structure-aware chunking in practice: losing header hierarchy when exporting to Markdown, merging chunks that fall
below a minimum token threshold, and stride/overlap configuration — all filed as real GitHub issues against a
production parsing+chunking library, not hypotheticals [GitHub, docling-project/docling issues #287, #1174, #1686,
#1568, accessed 2026-09-30].

**Contextual retrieval (Anthropic's recipe), verbatim [S1]:**

```
VERBATIM PROMPT [S1]
<document>
{{WHOLE_DOCUMENT}}
</document>
Here is the chunk we want to situate within the whole document
<chunk>
{{CHUNK_CONTENT}}
</chunk>
Please give a short succinct context to situate this chunk within the overall document for the purposes of improving search retrieval of the chunk. Answer only with the succinct context and nothing else.
```

Run once per chunk with Claude 3 Haiku (at original publication), generating 50–100 tokens of context prepended
before embedding and before BM25 indexing. Anthropic's own reported cost: **$1.02 per million document tokens**
one-time, assuming 800-token chunks / 8k-token docs / 50-token instructions / 100 tokens of generated context [S1].
Prompt caching is what makes this economical at scale (the whole document is cached, only the chunk changes per
call) — this is the reason Anthropic ships prompt caching and contextual retrieval as a matched pair.

**voyage-context-3's alternative approach** does the same job without a per-chunk LLM call: the whole document is
encoded once by the embedding model itself, producing a distinct contextualized vector per chunk in a single
forward pass, "eliminating the need for manual augmentation methods like overlapping chunks or metadata prepending"
[S5]. Reported chunk-level NDCG gains over baselines: OpenAI-v3-large +14.24%, Cohere-v4 +12.56%, Jina-v3 late
chunking +23.66%, Anthropic's own contextual-retrieval recipe +6.76% [S5]. Binary 512-dim voyage-context-3 beats
float-3072 OpenAI-v3-large by 0.73% NDCG while cutting storage/compute cost by 99.48% [S5] — the practical
implication is that Matryoshka+binary quantization is now good enough that "just use the smallest tier that
clears your accuracy bar" is a defensible default, not a corner-cutting compromise.

**Hybrid search / BM25 + dense + RRF.** Bayer's PRINCE weights hybrid retrieval 0.7 semantic / 0.3 keyword, retrieves
~20 candidates, reranks with `bge-reranker-large` (cross-encoder) down to top 7 [S3]. Discourse's production hybrid
setup stores `halfvec` (16-bit float) for on-disk storage and `bit` (binary vectors) for the actual index, calling
out that "the storage cost and on-going performance [are] good enough that we could enable this in all our
hosting" [S2, xfalcox comment]. Postgres pgvector's iterative index scans (shipped 0.8.0) were specifically built to
fix the pre-filter/post-filter dilemma that "The Case Against PGVector" flags as unsolved without them — pre-
filtering degrades on non-selective filters, post-filtering with `LIMIT 10` silently returns fewer results than
requested when many matches lie just past the cutoff [S2].

**Rerankers.** The "Reranker Tax" numbers, verbatim from the SciFact evaluation [S4]:

| Stage | Latency | nDCG@10 | Recall ceiling |
|---|---|---|---|
| BM25 baseline | 0.11 ms | 0.662 | — |
| Cross-encoder rerank, k=5 | ~47 ms | fails to beat baseline | 0.72 (k=5) |
| Cross-encoder rerank, k=10 | ~100 ms | fails to beat baseline | 0.77 (k=10) |
| Cross-encoder rerank, k=20 | ~225 ms (~2000×) | 0.671 (+0.009) | 0.82 (k=20) |

Reranker: `cross-encoder/ms-marco-MiniLM-L6-v2` (pointwise). The conclusion the author draws, and which shows up
repeatedly in 2026 practitioner content, is that a reranker's ceiling is set by first-stage recall: if the right
document isn't in your top-k candidate set, no reranker can promote it, so investment order should be
retriever-recall-first, reranker-second [S4]. This directly informs the "why bother with ColBERT/rerankers"
skepticism visible across multiple threads.

**Late interaction / ColBERT-style.** Vespa/Realm's optimization computes inverse-Hamming-distance MaxSim scores in
a single pass over binary multivector document token embeddings instead of materializing an intermediate score
tensor per query-token/doc-token pair. Reported: 91.8ms → 2.8ms per query in benchmark (14.5M → 475M token
comparisons/second, 32.8×), ~10× in real production queries that were previously slow [S15]. This matters because
ColBERT/ColPali-style late interaction has historically been criticized as too expensive to serve at scale compared
to single-vector dense retrieval — this is a concrete counter-datapoint from 2026.

**Agentic RAG / grep vs vector index — the actual argument, with numbers on both sides.**

Cursor's side (semantic search *works*, when paired with grep) [S19]:
- Custom embedding model trained on **agent session traces**: as agents search and open files, an LLM
  retrospectively ranks what *should* have been retrieved earlier, and the embedding model is trained to match
  those LLM-generated rankings ("align its similarity scores with these LLM-generated rankings" — a form of
  distillation from agent behavior, not from human relevance judgments).
- Reported A/B results: +12.5% average accuracy answering questions (range 6.5%–23.5% by model); +0.3% code
  retention overall, +2.6% on large codebases (1000+ files); −2.2% dissatisfied follow-up requests without
  semantic search. Authors' own framing: "the combination of [grep and semantic search] leads to the best
  outcomes" — not semantic search alone [S19].

The skeptical/agentic-discovery side [S11, entire.io, Evis Drenova, dataset dated 2026-04-15]:
- Compared raw ripgrep vs `fff` (indexed MCP server, bigram index + frecency ranking) vs `pgr` (custom Rust,
  definition-first ranking + path-aware filtering) on real coding-agent tasks.
- **Speed was not the bottleneck**: fff cut search latency 14.7ms → 1.7ms, but end-to-end wall time only moved
  38.57s → 36.99s (tool execution was 0.4% of total runtime).
- **Ranking quality was the lever**: `pgr`'s definition-first ranking hit Hit@1 34% vs baseline 26%, MRR 0.41 vs
  0.32; `fff`'s speed-only improvement showed *no* retrieval-quality gain. On implementation-type prompts
  specifically, MRR jumped 0.31→0.50 with better ranking.

Semble's claim and its reception (HN, 445 pts/151 comments, mixed/skeptical) [S9]:
- Claims 98% fewer tokens than a grep+read-file loop by returning ranked, chunked snippets via a small trained
  model instead of raw matching lines; benchmarked with NDCG against grep/ripgrep/BM25/colgrep.
- Strongest pushback in the thread: the 98% figure compares against the *worst case* (agent reads whole files after
  grep), not against how skilled agents actually grep (`grep -C N` then stop); a maintainer conceded "we assume
  that if the agent gets the correct answer in the returned snippets it does not need to read further" — an
  assumption, not a measured end-to-end agent result. Semble's own maintainer response: "we don't claim end-to-end
  agent improvements since we haven't measured those (yet)."
- A recurring, unverified-but-repeated community claim in this same thread and in the Nia thread [S18]: "the Claude
  team explicitly trying out indexing and deciding against it" — multiple commenters reference this as known but no
  one links a primary Anthropic source; treat as folklore until a primary citation surfaces (see Unverified).
- One maintainer's live comment on model behavior: "Sonnet 4.6 seems to trust semble but Opus 4.7 less so" — i.e.
  models are RL'd hard enough on grep that trusting an alternative tool's output is itself a training-distribution
  problem, independent of the tool's actual retrieval quality [S9].

**GraphRAG / LightRAG / HippoRAG mechanics.**
- **LightRAG** [S22]: dual-level retrieval — a "low-level" pass over specific entities/relations and a "high-level"
  pass over broader themes/communities — combined with vector representations of graph elements, plus incremental
  graph updates for streaming/dynamic corpora (a common complaint about Microsoft's original GraphRAG is that full
  reindexing is required on document changes).
- **HippoRAG** [S23]: builds an LLM-extracted open knowledge graph once, then at query time runs **Personalized
  PageRank** seeded from query-entity nodes to do single-step "multi-hop" retrieval without iterative LLM calls.
  Claimed: up to +20% accuracy over baselines on multi-hop QA, and comparable/better results than iterative
  retrieval methods at 10–30× lower cost and 6–13× lower latency (NeurIPS 2024 claims; re-verify against the current
  arXiv v3 before citing in a benchmark table, since the paper was revised through Jan 2025).
- **Field skepticism (2025 H2)**: the 136-point "went back to SQL" thread's most-argued point is the "coffee vs
  espresso" problem — a vector/graph system can associate related concepts a plain SQL LIKE query cannot — but
  several commenters (including one shipping a Postgres+MongoDB hybrid in production) conclude graph traversal is
  hard for both humans and LLMs to query reliably compared to SQL schema they can already reason about: "understanding
  schema of SQLite or making queries to find information is very easy for LLMs... The graph approach may work well
  for many use-cases but if we want to store structured information..." [S7, `brainless` comment]. The practical
  takeaway repeated across the thread: default to hybrid SQL+vector, add a graph layer only after profiling shows a
  concrete multi-hop retrieval gap.

**Multimodal retrieval (ColPali/ColQwen).** Morphik uses ColQwen2 (upgrading to 2.5) for its vision-based ingestion
path, converts each page to an image, and embeds the whole page — "mainly to maintain layout information. Also
search becomes easier this way" [S8]. Reported production numbers: ~2 minutes to search over 100–150 ColPali-indexed
documents on a MacBook Air M2 16GB; ingestion ~15–20s/page on the same laptop vs ~4–5s/page on an A100 [S8].

### Vector database choice, as argued in the field (not vendor marketing)

- **pgvector**: default choice while corpus stays roughly under a few million vectors and you already run Postgres.
  Concrete operational failure modes reported: HNSW index builds can consume 10+ GB RAM for hours on the *production*
  database while running [S2, verbatim]; IVFFlat clusters "don't rebalance without a full rebuild" and the commonly
  cited `rows/1000` cluster-count formula is "a starting point at best" [S2]; filtered search forces a choice between
  slow pre-filtering and incomplete post-filtering unless you're on 0.8.0+'s iterative scans [S2]. Mitigations
  reported in production: quantize to `halfvec`/binary (Discourse, [S2]); move vector-only workloads to a dedicated
  Postgres instance (multiple commenters; downside is exactly the added-complexity Postgres was chosen to avoid);
  switch the index extension to pgvectorscale (disk-ANN) or VectorChord (IVF+RaBitQ quantization, "15x more updates
  per second," users reportedly running 3B vectors sharded across Postgres) — neither is available on AWS RDS as of
  the discussion, which is repeatedly cited as the practical blocker to adopting them [S2 comments].
- **Dedicated vector DBs** (Qdrant, Milvus, Weaviate, Pinecone, turbopuffer, LanceDB): field consensus in the
  threads gathered here is muted relative to the pgvector debate — most 2026 HN activity around these names is
  Show-HN-style new entrants (Zvec/Alibaba, HelixDB, Vectroid) rather than adoption war-stories, which is itself a
  signal: the "which specialized vector DB" decision doesn't generate as much production pain content as "should
  I even leave Postgres." One data point: turbopuffer is cited (via a widely shared tweet, unverified beyond the
  tweet) as having crossed $100M run-rate by March 2026, suggesting real enterprise adoption for the
  object-storage-backed / serverless vector search niche.
- **SQL vs vector vs graph for agent memory specifically**: the "went back to SQL" position is the most substantive
  2025 H2 counter-narrative — treat "just add a vector DB" as a default to justify, not assume, for anything that
  looks like structured facts about users/entities rather than free-text semantic search [S7].

## Numbers

| Number | Condition | Source |
|---|---|---|
| Contextual embeddings: −35% top-20 retrieval failure rate (5.7%→3.7%) | Anthropic internal eval, Claude 3 Haiku for context generation | [S1], 2024-09-19 |
| Contextual embeddings + BM25: −49% failure rate (5.7%→2.9%) | same eval | [S1] |
| + Reranking: −67% failure rate (5.7%→1.9%) | same eval | [S1] |
| Contextualization cost: $1.02 / 1M document tokens | 800-tok chunks, 8k-tok docs, 50-tok instructions, 100-tok context, one-time | [S1] |
| voyage-context-3 chunk-level NDCG: +14.24% vs OpenAI-v3-large, +12.56% vs Cohere-v4, +23.66% vs Jina-v3 late chunking, +6.76% vs Anthropic contextual retrieval | Voyage's own eval | [S5], 2025-07-23 |
| voyage-context-3 binary-512 beats OpenAI-v3-large float-3072 by +0.73% NDCG at −99.48% cost | same | [S5] |
| HNSW index build RAM: 10+ GB, can run for hours, on the live production DB | pgvector, millions of vectors | [S2], 2025-10-29 |
| SciFact: BM25 0.11ms / 0.662 nDCG@10 vs cross-encoder rerank k=20 ~225ms / 0.671 nDCG@10 (~2000× slower for +0.009) | `cross-encoder/ms-marco-MiniLM-L6-v2` | [S4], 2026-07 |
| Recall ceiling by k: 0.72 (k=5), 0.77 (k=10), 0.82 (k=20) | same SciFact eval | [S4] |
| Cursor semantic search: +12.5% avg QA accuracy (range 6.5–23.5% by model); +0.3%/+2.6% (large repos) code retention; −2.2% dissatisfied follow-ups | Cursor's internal A/B, coding agents | [S19], 2025-11-06 |
| Agentic search study: search latency 14.7ms→1.7ms moved wall time only 38.57s→36.99s (tool exec = 0.4% of runtime) | fff vs ripgrep, coding-agent tasks, dataset dated 2026-04-15 | [S11] |
| Hit@1 26%→34%, MRR 0.32→0.41 (first query); MRR 0.31→0.50 (implementation prompts) | pgr (ranking-first) vs baseline, same study | [S11] |
| Vespa ColBERT MaxSim: 91.8ms→2.8ms/query (32.8×, 14.5M→475M token-comparisons/sec); ~10× in production | binary multivector, Realm engineering | [S15], 2026-08-13 |
| Voyage-4-large: +14.05% NDCG vs OpenAI-v3-large, +8.20% vs Cohere Embed v4, +8.20% vs Gemini Embedding 001 | RTEB, 29 datasets, Voyage's own eval | [S12], 2026-01-15 |
| MoE flagship serving cost: −40% vs comparable dense models | Voyage 4 | [S12] |
| Matryoshka truncation vs PCA at 32 dims: 46% (trunc) vs 65% (PCA) relative retention on text-embedding-3-small; 68% vs 71% on qwen3-embedding-8b | 8 BEIR datasets | [S14], 2026-08-01 |
| HippoRAG: up to +20% multi-hop QA accuracy; 10–30× cheaper, 6–13× faster than iterative retrieval | NeurIPS 2024 paper, revised through 2025-01-14 | [S23] |
| Hippocampus memory substrate: 90.91% vs MiniLM-filtered 77.27% vs BM25 31.82% contradiction-free accuracy, at ~12 vs ~121 vs ~495 tokens/answer | vendor's own clinical-trial-style eval | [S20], 2026-05-26, self-reported/unverified |
| Self-reported RAG cost cut: $2,400/mo → −73%, mainly via context cap 8–15k→~3.2k tokens and top-20→top-8 hybrid retrieval | single practitioner's anecdote, no independent verification | [S17], 2025-12-11 |
| Discourse pgvector: powers Related Topics, tag/category suggestion, augmented search, RAG-over-uploads across "thousands of databases" / "billions of page views" | production, self-reported by the engineer in the thread | [S2] |

## Pitfalls, limits, criticism

- **Rerankers as theater**: if your first-stage recall@k is capped (0.72–0.82 in the SciFact numbers above), no
  reranker recovers the missing documents — investing in reranker sophistication before fixing retriever recall is
  the most commonly cited wasted-engineering-effort pattern in 2026 content [S4].
- **pgvector's index-build-on-prod problem** is not hypothetical marketing FUD — it's confirmed independently by
  multiple production users in the same thread, including disagreement about whether `maintenance_work_mem` and
  `REINDEX CONCURRENTLY` genuinely solve it (one commenter: "That kills the indexing process, you cannot let it run
  with limited amount of memory"; another: "the knob existing doesn't solve the operational challenge of safely
  allocating GBs of RAM on prod for hours-long index builds") [S2]. There is no consensus fix short of a dedicated
  instance or a different index extension, both of which reduce the "just use Postgres" value proposition.
  Meta-point several commenters independently reached: pgvector is fine up to ~100K–few-million vectors on a single
  tenant/shard; the pain scales with total vectors *per shard*, so a naturally multi-tenant workload (like
  Discourse's per-forum DBs) can stay on pgvector far longer than a single giant corpus would.
- **Chunking loses structure silently**: Docling's own bug tracker shows header hierarchy getting lost on
  Markdown export, which breaks structure-aware chunking downstream even when the parser "worked" — a reminder that
  parse quality and chunk quality are coupled failure surfaces, not independent stages [GitHub docling issues,
  accessed 2026-09-30].
- **Agentic search token-savings claims are systematically over-stated relative to end-to-end agent performance**:
  the strongest, most-repeated pushback across both the Semble and Nia threads is that vendors measure
  retrieval-only metrics (NDCG, tokens returned) and extrapolate to agent-quality claims without an agent-in-the-
  loop eval — one HN commenter's blunt framing: "Our tool uses 99x fewer tokens and delivers 88x better
  results... It's VERY difficult to quantify something is better... they almost never post how they measured"
  [S9]. Model-specific trust also confounds results: agents are RL'd on grep behavior specifically, so an
  equally-good alternative tool can underperform in practice simply because the model doesn't trust its output
  and re-verifies with grep anyway, erasing the token savings [S9].
- **GraphRAG/knowledge-graph retrieval is hard to query reliably even for LLMs**, per a builder who tried a
  custom graph approach on RocksDB and reverted to SQLite: "I found it hard to ask LLM to traverse it. While
  understanding schema of SQLite... is very easy for LLMs" [S7]. This is a mechanism-level explanation for why
  GraphRAG uptake in the wild trails its research-paper prominence.
- **VLM-based document parsing (ColPali/OCR) has an unresolved numeric-fidelity problem**: encoding a page as an
  image captures layout well but a transposed digit or misplaced figure is exactly the kind of error current
  systems don't reliably catch, which is enough to kill adoption for finance/compliance-sensitive use cases per
  field commentary [S8].
- **Matryoshka is not a free win**: buying an MRL-trained model specifically for truncation may not beat applying
  PCA post-hoc to a cheaper, non-MRL model, especially at 32–64 dims — worth A/B testing before paying for an
  MRL-branded embedding SKU [S14].
- **Prompt injection via documents** is flagged repeatedly as a growing concern in agentic RAG (agents now *act* on
  retrieved content, not just summarize it), but the search pass here surfaced mostly generic "prompt injection
  firewall" product posts rather than a rigorous incident writeup — see Unverified; this sub-topic likely needs a
  dedicated ch.16 cross-reference rather than field-report depth in this chapter.
- **Cost anecdotes are unverifiable and often vendor-authored**: the "$2,400/mo → −73%" post is a single,
  self-reported case with no independent audit; use the *mechanisms* (context capping, top-k reduction via hybrid
  rerank, embedding caching with TTL, batch embedding API pricing) as a checklist, not the specific percentages as
  a benchmark [S17].

## What changed in the last 6 months (since ~April 2026)

- Voyage 4 (Jan 2026) and Gemini Embedding 2 (Mar 2026) both landed just before or at the edge of this window and
  reset the embedding leaderboard twice in one quarter — the MoE/shared-embedding-space idea (Voyage) and
  natively-multimodal-single-space idea (Google) are the two competing 2026 architectural bets [S12, S13].
- The grep-vs-index argument sharpened considerably: Cursor published hard numbers for semantic search working
  (Nov 2025, just before the window) [S19]; the entire.io study (dataset Apr 2026) reframed the argument from
  "speed" to "ranking quality" [S11]; Semble (May 2026) tried to make an explicit numeric case for a middle-ground
  tool and got a methodologically skeptical but substantively engaged reception, including public acknowledgment
  that end-to-end agent evals — not retrieval-only metrics — are the missing piece industry-wide [S9].
- Late-interaction retrieval got a real production efficiency story (Vespa's 32.8× MaxSim optimization, Aug 2026)
  after years of "ColBERT is too expensive to serve" being the default objection [S15].
- Reranker skepticism crystallized into a named, citable framing ("The Reranker Tax," Jul 2026) with a concrete
  benchmark rather than remaining a vague sentiment [S4].
- The Matryoshka-is-obviously-good consensus got its first serious public counter-data (PCA comparison, Aug 2026)
  [S14].
- pg_textsearch (Mar 2026) closed a real gap — native BM25 in Postgres — that hybrid-search practitioners had been
  working around with extensions or external search engines.
- A named production case study for agentic RAG with full architecture disclosure (Bayer's PRINCE, via Martin
  Fowler, Jun 2026) is notable simply because full production RAG architecture writeups from regulated-industry
  companies are rare; it's a good template for the "harness engineering" framing (state persistence, LLM fallback,
  retry-with-error-context, reflection loop) that's increasingly how practitioners talk about reliability, not just
  retrieval quality [S3].

## Diagram candidates

1. **Contextual retrieval pipeline** — actors: raw document, chunker, "context LLM call" (cached whole-doc + chunk
   in, 50–100 tok context out), embedder, BM25 indexer, reranker. Arrows labeled with the failure-rate numbers at
   each stage (5.7%→3.7%→2.9%→1.9%) [S1].
2. **pgvector index-build-on-production timeline** — states: normal serving → index-build triggered → RAM climbing
   (10+ GB) → hours pass → index ready / OR query latency degrades. Show the "you can't easily throttle this"
   annotation and the two escape hatches (dedicated instance; pgvectorscale/VectorChord) as branch arrows [S2].
3. **Reranker recall-ceiling diagram** — x-axis k (5/10/20), two lines: "candidates retrieved" recall ceiling vs
   "reranked nDCG@10," showing the reranked line can never rise above the ceiling line, with the SciFact numbers
   annotated [S4].
4. **Grep+ReadFile loop vs semantic-search-assisted loop** — actor: coding agent; two paths side by side, one with
   repeated grep→read cycles (token cost accumulating), one with a single semantic query returning ranked+chunked
   context; annotate with Cursor's "combination wins" conclusion rather than showing semantic-only as the winner
   [S19].
5. **Cursor's semantic-search training loop** — actors: agent session traces → LLM ranks "what should have been
   retrieved earlier" → embedding model trained to match rankings → deployed embedding model. This is a distillation
   loop worth diagramming since it's an unusual training signal (behavioral traces, not human relevance labels)
   [S19].
6. **HippoRAG retrieval at query time** — actors: query → entity extraction → seed nodes in knowledge graph →
   Personalized PageRank spreads activation → top-ranked passages returned; contrast with iterative-retrieval's
   repeated LLM-call loop to show where the 6–13× latency win comes from [S23].
7. **LightRAG dual-level retrieval** — one query forking into a "low-level" (specific entity/relation) path and a
   "high-level" (theme/community) path over the same graph+vector index, merged before generation [S22].
8. **ColPali/ColQwen "page as image" ingestion vs OCR+text ingestion**, side by side, ending at "search quality on
   tables" as the differentiator, per Morphik's stated rationale [S8].
9. **Vector DB decision tree** — start "how many vectors, single vs multi-tenant, already on Postgres?" branching
   to pgvector (small/medium, multi-tenant-friendly) → pgvectorscale/VectorChord (medium-large, not on RDS) →
   dedicated vector DB (large single corpus) → SQL-only (structured facts, not fuzzy semantic match) [S2, S7].
10. **Hybrid search + RRF/weighted-fusion diagram** — BM25 branch and dense-embedding branch merging via weighted
    score fusion (Bayer's 0.7/0.3 split) into a single ranked list before reranking [S3].

### Chart candidates (real data series, values + source)

- SciFact latency vs nDCG@10 across k=5/10/20 (table above) [S4].
- Contextual retrieval failure-rate reduction bar chart: 5.7% baseline → 3.7% → 2.9% → 1.9% [S1].
- Matryoshka-truncation vs PCA retention curves at dims {512,256,128,64,32} for text-embedding-3-small and
  qwen3-embedding-8b (table above) [S14].
- Vespa MaxSim latency before/after optimization: 91.8ms vs 2.8ms [S15].
- Embedding leaderboard deltas over 2026: Voyage-4-large vs OpenAI-v3-large/Cohere-v4/Gemini-Embedding-001 [S12].

## Glossary

- **Contextual Retrieval** — Anthropic's technique of prepending an LLM-generated situating blurb to each chunk
  before embedding/BM25 indexing, to recover document-level context lost by chunking [S1].
- **Late chunking** — embedding the full document first, then pooling token-level representations per chunk
  boundary, so each chunk vector still reflects full-document context (Jina's approach, referenced as a comparison
  baseline in [S5]).
- **Contextualized chunk embeddings** — Voyage's term for embedding the whole document in one pass while still
  producing a distinct vector per chunk (`voyage-context-3`) [S5].
- **Matryoshka Representation Learning (MRL)** — training embeddings so that leading subsets of dimensions are
  themselves useful, enabling truncation to smaller sizes without retraining [S12, S14].
- **RRF (Reciprocal Rank Fusion)** — a common way to merge BM25 and dense-retrieval rankings; not directly
  benchmarked in the sources gathered here (see Unverified), though weighted score fusion (Bayer's 0.7/0.3) is a
  documented alternative [S3].
- **Late interaction (ColBERT/ColPali/ColQwen)** — retrieval that keeps per-token (or per-image-patch) vectors and
  scores query-document similarity via MaxSim over all token pairs, instead of collapsing to one vector per
  document [S15, S8].
- **Agentic RAG / agentic retrieval** — retrieval where an LLM/agent decides *how* to retrieve (which index, which
  strategy, whether to iterate) rather than a fixed single-shot chunk-similarity lookup [S10].
- **GraphRAG** — retrieval over an LLM-constructed knowledge graph (entities + relations) instead of, or alongside,
  chunk vectors, aimed at multi-hop/aggregative questions plain chunk retrieval handles poorly [S22, S23].
- **Personalized PageRank (in HippoRAG)** — graph algorithm used to spread relevance from query-matched entity
  nodes across the knowledge graph in one pass, replacing iterative multi-hop LLM calls [S23].
- **RTEB** — Voyage's benchmark suite (29 datasets) used to report Voyage-4 numbers; distinct from the older MTEB
  suite [S12].
- **HNSW / IVFFlat** — the two dominant approximate-nearest-neighbor index types discussed for pgvector; HNSW is
  graph-based and memory-hungry to build, IVFFlat is cluster-based and needs periodic rebuilding to avoid recall
  degradation as data drifts [S2].

## Unverified / open questions

- **"Claude Code evaluated a vector index and decided against it in favor of grep"**: repeated as a confident,
  specific claim by multiple independent HN commenters in two different 2026 threads [S9, S18], but no primary
  Anthropic source (blog post, engineer statement, changelog) was found in this research pass to confirm the
  specific decision or its stated rationale. Treat as strong community folklore, not a verified fact; a targeted
  Anthropic-domain search (or asking directly) is needed before stating this as settled in the chapter body.
- **turbopuffer's "$100M run-rate by March 2026"** is sourced to a single widely-shared tweet referenced on HN, not
  an official company disclosure found in this pass — flag as unverified financial claim.
- **RRF (Reciprocal Rank Fusion) specifically**, as opposed to weighted score fusion, was not directly benchmarked
  in any source gathered here; the chapter should independently verify current best practice (RRF vs weighted
  fusion vs learned fusion) since this is core to the "hybrid search" scope item and this pass only surfaced BM25
  and dense retrieval being combined by other means.
- **Russian-language embedding quality specifically** — this pass could not access Reddit (blocked, returns a login
  redirect on old.reddit.com even with a browser user-agent) or get live Habr search results (WebFetch returned an
  empty interface shell, not results) despite several attempts, so the field-report angle for Russian/CIS
  developer sentiment on RAG is essentially unfilled. What was found: `ai-forever/FRIDA`, a T5-based (FRED-T5
  encoder) 0.8B-parameter Russian embedding model claiming top-1 among sub-3B models on MTEB/rusBEIR as of its
  publication (~Aug 2024) [S16] — this is stale relative to the chapter's "today" and should be re-checked against
  a current ruMTEB/rusBEIR leaderboard snapshot before citing as "the current leader." No 2026-dated Russian-
  community source was obtained.
- **t.me/s/fastnewsdev** was checked per the lens instructions; it had no RAG/retrieval/embeddings/chunking content
  in the visible window at access time (2026-09-30) — its closest adjacent material was about agent context
  management and code-search tools (Ripwire, Codegraph), which is ch.02/ch.03 territory, not this chapter's [S25].
- **Prompt injection specifically via RAG-retrieved documents** — the search pass surfaced only generic
  "prompt-injection firewall" product Show-HNs, not a detailed incident writeup or measured attack-success-rate
  study for the RAG case specifically (as opposed to prompt injection in agentic tool use generally, which is
  ch.16's territory). This chapter's "prompt injection inside documents" scope item needs a follow-up pass.
- **ACL/permissions-aware RAG in production** — no field-report-quality source (HN/Reddit/GitHub debate with real
  numbers) was found in this pass despite multiple targeted queries; this scope item (document-level permissions,
  row-level security in the vector store, permission-aware reranking) is currently unfilled and should not be
  treated as covered.
- **Long-context vs RAG vs cache-augmented generation (CAG)**: only a couple of low-signal HN mentions were found
  (an arXiv CAG paper, a KV-cache-as-a-service Show HN); no substantive 2026 field debate with numbers was located
  in this pass. Given how central this tradeoff is to the chapter's scope, it needs a dedicated follow-up search
  (this session's WebSearch budget was exhausted before this angle could be pursued with search-engine-level
  breadth; HN-only coverage of this specific debate was thin).
- **GraphRAG (Microsoft's original) production criticism** specifically (cost, maintenance burden, reindex-on-
  change) was not directly found as a dedicated field discussion in this pass — the closest proxy is the
  SQL-vs-graph-vs-vector memory thread [S7], which is about agent memory rather than document RAG specifically;
  don't conflate the two when writing the chapter body.

## Sources

- [S1] Anthropic — "Introducing Contextual Retrieval." Anthropic. 2024-09-19. https://www.anthropic.com/news/contextual-retrieval — accessed 2026-09-30.
- [S2] Alex Jacobs — "The Case Against PGVector." alex-jacobs.com. 2025-10-29. https://alex-jacobs.com/posts/the-case-against-pgvector/ — accessed 2026-09-30. Discussion: Hacker News, 381 pts / 137 comments, https://news.ycombinator.com/item?id=45798479 (thread dated ~2025-11-03).
- [S3] Martin Fowler (article; Bayer engineering team) — "PRINCE: reliable LLM applications, a Bayer case study." martinfowler.com. 2026-06-16. https://martinfowler.com/articles/reliable-llm-bayer.html — accessed 2026-09-30.
- [S4] Eoin Hurrell — "The Reranker Tax: When a Smart Layer Can't Save a Weak Foundation." eoinhurrell.com. 2026-07-16/17. https://www.eoinhurrell.com/posts/20260717-the-reranker-tax/ — accessed 2026-09-30.
- [S5] Voyage AI — "voyage-context-3: Contextual Retrieval Without the LLM." blog.voyageai.com. 2025-07-23. https://blog.voyageai.com/2025/07/23/voyage-context-3/ — accessed 2026-09-30.
- [S6] Hacker News — "Ask HN: How would you architect a RAG system for 10M+ documents today?" 2025-11-21, 23 pts/9 comments. https://news.ycombinator.com/item?id=46000077 — accessed 2026-09-30.
- [S7] Hacker News — "Everyone's trying vectors and graphs for AI memory. We went back to SQL." 2025-09-22, 136 pts/63 comments. https://news.ycombinator.com/item?id=45329322 — accessed 2026-09-30.
- [S8] Hacker News / Morphik — "Show HN: Morphik – Open-source RAG that understands PDF images, runs locally." 2025-04-22, 200 pts. https://news.ycombinator.com/item?id=43763814 ; repo https://github.com/morphik-org/morphik-core — accessed 2026-09-30.
- [S9] Hacker News / MinishLab — "Show HN: Semble – Code search for agents that uses 98% fewer tokens than grep." 2026-05-17, 445 pts/151 comments. https://news.ycombinator.com/item?id=48169874 ; repo https://github.com/MinishLab/semble — accessed 2026-09-30.
- [S10] LlamaIndex — "RAG is dead, long live agentic retrieval." llamaindex.ai blog. 2025-05-29. https://www.llamaindex.ai/blog/rag-is-dead-long-live-agentic-retrieval — accessed 2026-09-30.
- [S11] Evis Drenova / Entire — "Improving agentic search in coding agents." entire.io blog. Dataset dated 2026-04-15. https://entire.io/blog/improving-agentic-search-in-coding-agents — accessed 2026-09-30.
- [S12] Voyage AI — "The Voyage 4 model family: shared embedding space with MoE architecture." blog.voyageai.com. 2026-01-15. https://blog.voyageai.com/2026/01/15/voyage-4/ — accessed 2026-09-30.
- [S13] Google — "Gemini Embedding 2: Our first natively multimodal embedding model." blog.google. 2026-03-10. https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-embedding-2/ — accessed 2026-09-30.
- [S14] Dylan Castillo — "Honey, I shrunk the embeddings: Matryoshka vs. PCA." dylancastillo.co. 2026-08-01. https://dylancastillo.co/posts/matryoshka-vs-pca — accessed 2026-09-30. HN discussion: 61 pts/18 comments, https://news.ycombinator.com/item?id=49156607.
- [S15] Oskari Mantere (Realm) — "30× faster binary multivector ColBERT late interaction in Vespa." oskrim.github.io. 2026-08-13. https://oskrim.github.io/engineering/2026/08/13/chunked-hamming-maxsim.html — accessed 2026-09-30.
- [S16] AI-Forever (SaluteDevices) — "FRIDA" model card. Hugging Face. ~2024-08 (papers 2309.10931, 2408.12503). https://huggingface.co/ai-forever/FRIDA — accessed 2026-09-30. Stale relative to chapter date; see Unverified.
- [S17] Hacker News (text post) — "Why Your RAG Costs $2,400/Month (and How We Cut It by 73%)." 2025-12-11, 3 pts. https://news.ycombinator.com/item?id=46234309 — accessed 2026-09-30. Self-reported, unaudited.
- [S18] Hacker News — "Launch HN: Nia (YC S25) – Give better context to coding agents." 2025-12-08, 131 pts/87 comments. https://news.ycombinator.com/item?id=46194828 — accessed 2026-09-30.
- [S19] Cursor — "Semantic search" (semsearch). cursor.com/blog. 2025-11-06. https://cursor.com/blog/semsearch — accessed 2026-09-30.
- [S20] BricByBric — "Hippocampus memory engine." bricbybric.ae blog. 2026-05-26. https://www.bricbybric.ae/blog/hippocampus-memory-engine — accessed 2026-09-30. HN discussion: 2026-05-27, 4 pts, https://news.ycombinator.com/item?id=48289045. Vendor-published, self-reported numbers.
- [S21] Timescale — "pg_textsearch" (BM25 for Postgres). GitHub. Hacker News Show HN, 2026-03-31, 203 pts/56 comments. https://github.com/timescale/pg_textsearch — accessed 2026-09-30.
- [S22] Guo, Xia, Yu, Ao, Huang — "LightRAG: Simple and Fast Retrieval-Augmented Generation." arXiv:2410.05779. Submitted 2024-10-08, v3 2025-04-28. https://arxiv.org/abs/2410.05779 — accessed 2026-09-30.
- [S23] Jiménez Gutiérrez, Shu, Gu, Yasunaga, Su — "HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models." arXiv:2405.14831. v1 2024-05-23, v3 2025-01-14. NeurIPS 2024. https://arxiv.org/abs/2405.14831 — accessed 2026-09-30.
- [S24] Es, James, Espinosa-Anke, Schockaert — "Ragas: Automated Evaluation of Retrieval Augmented Generation." arXiv:2309.15217. 2023-09. https://arxiv.org/abs/2309.15217 — accessed 2026-09-30. HN discussion (library launch): 2024-03-21, 121 pts/26 comments, https://news.ycombinator.com/item?id=39780114.
- [S25] Telegram — t.me/s/fastnewsdev, checked 2026-09-30 for RAG-related content per lens instructions; none found in the visible window.
- [S26] Zilliz — "vdbbench-leaderboard-v2" (referenced via Hacker News "Show HN: Vectordb benchmark – cost (turbopuffer vs. Zilliz vs. Pinecone)", 2026-06-25). https://zilliz.com/vdbbench-leaderboard-v2 — accessed 2026-09-30, not independently verified for methodology neutrality (Zilliz-run benchmark of competitors).
- [S27] GitHub — docling-project/docling issue tracker (chunking-related issues #287, #1174, #1281, #1347, #1568, #1686, #2335, #3671). https://github.com/docling-project/docling/issues — accessed 2026-09-30.
