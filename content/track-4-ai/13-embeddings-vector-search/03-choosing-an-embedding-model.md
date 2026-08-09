---
title: "Choosing an Embedding Model"
description: "Dimensions, domain fit, query/document asymmetry, and the reindex you signed up for the moment you picked one."
track: 4
chapter: 13
page: 3
readMinutes: 5
---

:::info[Prerequisites]
**What an Embedding Is** — normalisation, asymmetric retrieval, and why similarity is
topical rather than logical.
:::

## The decision you're actually making

Picking an embedding model looks like picking a library. It isn't. **The model is part of
your index.** Every stored vector was produced by one specific model at one specific
version, and vectors from two different models are not comparable — not "slightly worse
together", but meaningless together, like mixing metres and feet with no conversion.

So the choice binds you until you're willing to re-embed your entire corpus. Treat it as
a schema decision, not a dependency.

## The axes that matter

| Axis | What to ask | Why it bites |
| --- | --- | --- |
| Retrieval quality | Does it rank *your* documents well? | Benchmark rank is a weak predictor for a specific corpus |
| Dimensions | 384, 768, 1024, 1536, 3072? | Directly sets index size, memory, and query cost |
| Max input length | 512 tokens? 8k? | Truncation is usually **silent** — text past the limit is discarded |
| Domain | Legal, clinical, code, multilingual? | General models are mediocre on specialised vocabulary |
| Deployment | Hosted API or self-hosted weights? | Latency, cost shape, data residency, licence |
| Stability | Will this model ID still exist in a year? | A deprecated hosted model forces a reindex on the vendor's schedule |

### Dimensions are a cost lever, not a quality dial

More dimensions is not straightforwardly better, and the cost is very concrete. Storage
for `n` documents at `d` dimensions in float32 is `n × d × 4` bytes, before the index
structure itself:

| Corpus | 384-dim | 1536-dim | 3072-dim |
| --- | --- | --- | --- |
| 1 M chunks | ~1.5 GB | ~6 GB | ~12 GB |
| 10 M chunks | ~15 GB | ~59 GB | ~118 GB |

A graph index like HNSW typically adds 30–50% on top, and it wants to live in RAM. The
jump from 768 to 3072 dimensions quadruples that bill for a quality gain that is often
in the low single digits of recall on a real corpus. Measure before you pay for it.

Some model families are trained with **Matryoshka representation learning**, which nests
coarse information in the leading dimensions so a 3072-dim vector can be truncated to
768 and renormalised with modest quality loss. When a provider documents this, it is the
cheapest available dial: keep full vectors for a reranking pass, store truncated ones in
the index.

### Input length, quietly

Every embedding model has a maximum sequence length, and the usual behaviour on longer
input is to **truncate without warning**. A pipeline that embeds 2,000-token documents
with a 512-token model is indexing first paragraphs and nothing else, and it will look
like a mysterious recall problem for weeks. Count tokens at ingestion time and assert.

## Query/document asymmetry and prefixes

Retrieval-trained models usually distinguish the two sides of the comparison, and they
do it through the input text itself. The exact convention is model-specific and is
documented in the model card:

```python
# One family's convention — check YOUR model's card; these strings are not universal
query_vec = embed("query: how do I cancel my plan")
doc_vecs  = [embed(f"passage: {chunk}") for chunk in chunks]
```

Other families take an instruction (`"Represent this sentence for searching relevant
passages: …"`), and some take a `task_type` parameter in the API instead of a literal
prefix. What they have in common is that **omitting it costs real accuracy**, and
**mismatching it costs more**: embedding your documents with the query prefix by accident
degrades every result and produces no error anywhere.

Two rules keep this safe:

1. Put the prefix logic in one function used by both the ingestion job and the query path. Never let two call sites decide independently.
2. Store the model ID, model version, and prefix convention alongside the vectors. When results go strange a year later, that row is the fastest thing you will read.

## Benchmarks, and what they're good for

Public leaderboards — MTEB is the standard one — are useful for building a shortlist and
almost useless for making the final call. Three reasons:

- **Benchmark contamination.** Popular evaluation sets leak into training data; a model tuned to score well on retrieval benchmarks isn't necessarily better at retrieving *your* documents.
- **Task mix.** An aggregate score blends classification, clustering, and reranking. If you only do retrieval, you want the retrieval sub-scores, and ideally the ones on data resembling yours.
- **Your corpus is weird.** Internal jargon, product names, table-heavy pages, and multilingual mixtures are exactly what a general benchmark doesn't contain.

The practical substitute costs an afternoon: assemble 50–100 real queries with the
document that should win for each — a **golden set** — and measure recall@10 across three
or four candidate models on your own data. That number will disagree with the leaderboard
ordering often enough to justify the afternoon. **Hybrid Search & Reranking** covers the
metrics themselves.

## Hosted or self-hosted

| | Hosted API | Self-hosted weights |
| --- | --- | --- |
| Time to first result | Minutes | Hours to days |
| Cost shape | Per token, forever | Fixed infrastructure; cheap at volume |
| Bulk ingestion | Rate limits are the bottleneck | Bounded only by your GPUs |
| Data movement | Text leaves your network | Stays inside it |
| Version control | Vendor decides when to deprecate | You decide, and pin |
| Quality ceiling | Usually the current frontier | Excellent small models exist and are often enough |

Embedding is the workload where self-hosting is most defensible: the models are small
compared to generative ones, several strong open-weight families are permissively
licensed, and the throughput requirement at ingestion time is enormous relative to the
query path. Backfilling ten million chunks through a rate-limited API is a genuinely
painful week.

## Plan the reindex before you need it

You will change embedding models. A better one ships, a hosted one is deprecated, or your
domain drifts. The migration is unavoidable, but it doesn't have to be an outage:

1. **Version the index.** Include the model ID in the index or collection name — `docs_v2_bge_large`, not `docs`. Never write two models' vectors into one index.
2. **Backfill into a new index** while the old one keeps serving. Re-embedding is embarrassingly parallel; it's a throughput problem, not a correctness one.
3. **Dual-write during the transition** so documents created mid-migration land in both.
4. **Compare on the golden set** before cutting over, then flip a config flag — not a deploy.
5. **Keep the old index** for a rollback window, then drop it.

The thing that makes this bearable is having the source text still available to re-embed.
That is an argument for keeping chunk text in your relational database as the source of
truth and treating the vector store as a derived index — the same "derived data is
rebuildable" instinct as **Object Storage & Microservices** in Track 3.

## What to take away

- The model is part of the index. Changing it means re-embedding everything, so version the index by model from day one.
- Dimensions buy recall at a superlinear price in RAM. Measure the gain on your corpus before paying for 3072.
- Respect the model's input limit — silent truncation is one of the most common quiet retrieval bugs.
- Use the model's documented query/document prefixes, from one shared code path.
- Shortlist with public benchmarks; decide with a golden set of your own queries.
- Keep the source text so a reindex is always a background job rather than a data-loss event.

## References

- Muennighoff et al., [*MTEB: Massive Text Embedding Benchmark*](https://arxiv.org/abs/2210.07316) · [leaderboard](https://huggingface.co/spaces/mteb/leaderboard)
- Kusupati et al., [*Matryoshka Representation Learning*](https://arxiv.org/abs/2205.13147) (2022)
- [OpenAI — Embeddings guide](https://platform.openai.com/docs/guides/embeddings) · [Cohere — Embed and input types](https://docs.cohere.com/docs/embeddings) · [Google — Vertex AI text embeddings and `task_type`](https://cloud.google.com/vertex-ai/generative-ai/docs/embeddings/get-text-embeddings)
- [Sentence Transformers documentation](https://sbert.net/) — the standard toolkit for self-hosted embedding models
