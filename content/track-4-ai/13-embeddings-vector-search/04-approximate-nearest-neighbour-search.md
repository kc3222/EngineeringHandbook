---
title: "Approximate Nearest Neighbour Search"
description: "Exact search doesn't scale, so you trade recall for speed — HNSW, IVF, quantisation, and the knobs that control the trade."
track: 4
chapter: 13
page: 4
readMinutes: 5
---

:::info[Prerequisites]
**What an Embedding Is** — normalised vectors and inner-product similarity.
:::

## Exact search, and where it stops being fine

Finding the `k` nearest vectors exactly means comparing the query against every stored
vector. For `n` documents at `d` dimensions that's `n × d` multiply-adds per query —
about 1.5 billion for a million 1536-dim vectors.

That sounds fatal and often isn't. Modern SIMD-optimised brute force will do a million
1536-dim vectors in well under a second on one core, and considerably faster across
several. **Below roughly 100k vectors, exact search is usually the right answer**: it has
perfect recall, no build step, no tuning, no staleness, and filtering is trivially exact.
Reaching for an approximate index at 20,000 rows is a common early mistake that buys
complexity and loses accuracy.

The scaling wall is linear, and it arrives from two directions at once: query latency
grows with corpus size, and so does the CPU cost of every query. Somewhere between
10⁵ and 10⁶ vectors — earlier if you're latency-sensitive, later if you're not — you
switch to **approximate** nearest neighbour search.

## Recall is the currency

An ANN index doesn't return *the* `k` nearest vectors. It returns `k` vectors that are
*probably mostly* the nearest ones. The measure is **recall@k**: of the true top `k`,
what fraction did the index return?

```text
recall@10 = |returned_top_10 ∩ true_top_10| / 10
```

Every ANN algorithm exposes knobs that trade recall against latency, and the curve is
sharply diminishing — going from 0.90 to 0.95 recall might cost 30% more latency, and
0.95 to 0.99 might cost 3×. There is no universally correct point on that curve. What
matters is knowing where you are, which requires actually measuring it: sample a few
hundred queries, compute exact results by brute force, and compare. Teams that never do
this run indexes at 0.7 recall without knowing, and interpret the missing documents as a
problem with the embedding model.

For a RAG system the relevant target is usually more forgiving than it looks, because a
generation step follows and a reranker often sits in between — losing the 9th-best chunk
rarely changes the answer. For deduplication or compliance search, where a miss is a
correctness failure, exact search or very high recall is the requirement.

## HNSW: navigable graphs

Hierarchical Navigable Small World is the default in most vector stores, and it's worth
understanding at one level of detail because its parameters are the ones you'll be asked
to set.

Vectors become nodes in a graph, each linked to some of its near neighbours. The graph is
built in layers: the top layer is sparse and long-range, each layer below is denser, and
the bottom contains everything. A search enters at the top, greedily walks toward the
query, drops a layer, and repeats — coarse jumps first, fine local search last. It's a
skip list for geometry.

| Parameter | Controls | Effect of increasing |
| --- | --- | --- |
| `m` | Links per node | Better recall, more memory, slower build |
| `ef_construction` | Candidate list size while building | Better graph quality, much slower build |
| `ef_search` | Candidate list size while querying | Better recall, slower queries |

The property that makes HNSW pleasant to operate: **`ef_search` is a query-time
parameter**. You can raise recall for one important query path, or lower it for a
latency-sensitive one, without rebuilding anything. `m` and `ef_construction` are baked
in at build time and changing them means a rebuild.

The costs are real, though. HNSW is memory-hungry — the graph edges are additional to the
vectors and it wants to be resident in RAM — and build time on tens of millions of
vectors is measured in hours. Deletes are typically **soft**: the node stays in the graph
as a tombstone and is filtered from results, so a high-churn corpus degrades until it's
rebuilt.

## IVF: search fewer partitions

Inverted File indexes take the opposite approach: cluster the vectors first (k-means into
`nlist` cells), store each vector under its nearest centroid, and at query time compare
the query against the centroids only, then exhaustively search the `nprobe` closest cells.

This is cheaper to build and much cheaper in memory than HNSW, and `nprobe` is the
query-time recall dial. Its weakness is the cell boundary: a query landing near an edge
has its true nearest neighbours sitting in a cell it didn't probe, so recall for a given
latency is generally below HNSW's. It also needs **training** — the centroids are learned
from a sample, so an IVF index built on 10,000 rows and then loaded with 10 million has
badly-placed cells and quietly poor recall.

## Quantisation: shrink the vectors themselves

Orthogonal to the index structure is how precisely each number is stored. `float32` is
rarely necessary.

| Scheme | Size vs float32 | Typical recall impact |
| --- | --- | --- |
| `float16` / `bfloat16` | ½ | Negligible |
| Scalar quantisation (int8) | ¼ | Small, usually 1–2 points |
| Product quantisation (PQ) | 1/8 to 1/64 | Noticeable; tunable |
| Binary (1 bit per dim) | 1/32 | Large on its own |

Product quantisation splits each vector into sub-vectors and replaces each with a
codebook index, so distances are computed by table lookup instead of arithmetic. Binary
quantisation goes further, reducing similarity to a Hamming distance computable with XOR
and popcount — extremely fast, and viable mainly because of **rescoring**.

Rescoring is the pattern that makes aggressive quantisation safe, and it's worth knowing
by name. Retrieve a generous candidate set — say 200 — using the compressed vectors, then
recompute exact similarity for just those 200 using full-precision vectors kept on disk,
and return the true top 10. You get most of the memory saving and nearly all the recall,
because the compressed pass only has to be good enough to get the right documents into
the candidate set.

## Filtering is where designs break

Almost every real query has a predicate: this tenant, this language, published, not
deleted. There are three ways to combine that with a vector index, and the difference
matters enormously.

- **Post-filter** — retrieve top `k` by vector, then discard non-matching rows. Simple, and it collapses when the filter is selective: ask for 10 documents from a tenant holding 0.1% of the corpus and you'll frequently get zero survivors out of 100 candidates.
- **Pre-filter** — determine the matching set first, then search only within it. Exact, but a naive implementation loses the index entirely and degenerates to brute force over the subset (which, for a small subset, is often exactly what you want).
- **Filtered search** — the index evaluates the predicate during traversal, skipping non-matching nodes. This is what mature engines implement, and it's the only approach that holds up across a range of selectivities.

Two consequences worth planning for. First, **check what your store actually does** — the
distinction is often buried in documentation and post-filtering is the failure mode you
discover in production, on your smallest tenant. Second, for hard isolation between
tenants, a separate index or namespace per tenant sidesteps the problem entirely and
makes the security story much easier to argue — related to the multi-tenancy patterns in
Track 3's **Row-Level Security**.

## Choosing

| Situation | Reach for |
| --- | --- |
| Under ~100k vectors | Exact search. Skip the index |
| Latency-critical, memory available | HNSW with rescoring |
| Very large corpus, memory-constrained | IVF + PQ, or HNSW over quantised vectors |
| Heavy writes and deletes | Something with real compaction, and schedule rebuilds |
| Highly selective filters | An engine with native filtered search, or per-tenant indexes |

## What to take away

- Exact search is a legitimate production choice below ~100k vectors — perfect recall, no tuning, no staleness.
- Measure recall@k against brute-force ground truth. An untuned index silently running at 0.7 recall looks like a bad embedding model.
- HNSW gives the best recall-per-millisecond and costs RAM; its `ef_search` dial is available per query.
- Quantise aggressively and rescore the candidate set with full-precision vectors — most of the saving, almost none of the loss.
- Find out whether your store pre-filters, post-filters, or filters during traversal *before* your most selective tenant finds out for you.

## References

- Malkov & Yashunin, [*Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs*](https://arxiv.org/abs/1603.09320) (2016) — the HNSW paper
- Jégou, Douze & Schmid, [*Product Quantization for Nearest Neighbor Search*](https://inria.hal.science/inria-00514462/document) (IEEE TPAMI, 2011)
- Douze et al., [*The Faiss library*](https://arxiv.org/abs/2401.08281) (2024) · [Faiss wiki — guidelines for choosing an index](https://github.com/facebookresearch/faiss/wiki/Guidelines-to-choose-an-index)
- [ANN-Benchmarks](https://ann-benchmarks.com/) — reproducible recall/latency curves across implementations
