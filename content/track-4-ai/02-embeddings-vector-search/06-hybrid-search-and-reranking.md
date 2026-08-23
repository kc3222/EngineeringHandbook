---
title: "Hybrid Search & Reranking"
description: "Why lexical search still wins some queries, how to fuse two rankings, and the cross-encoder pass that fixes the last 10%."
track: 4
chapter: 2
page: 6
readMinutes: 5
---

:::info[Prerequisites]
**What an Embedding Is** — particularly that rare tokens and exact identifiers embed
badly.
:::

## Two retrievers with opposite blind spots

Vector search fails on a predictable class of query: exact identifiers (`ERR_CONN_4021`,
`INV-2024-88131`), rare proper nouns, product names the model has never seen, code
symbols, and any query where the user knows the exact term they want. These are rare
tokens; the embedding model has little signal for them and averages them into the
surrounding context.

Lexical search — BM25 and its relatives — fails on the complementary class: paraphrase,
synonymy, and questions that share no vocabulary with the answer. *"How do I cancel"*
against a page titled *"Terminating your subscription"* scores near zero.

| Query | Lexical | Vector |
| --- | --- | --- |
| `ERR_CONN_4021` | Exact hit | Weak — rare token |
| "how do I cancel my plan" | Misses "terminating your subscription" | Strong |
| "OAuth refresh token expiry" | Good — the terms are distinctive | Good |
| "the thing that broke last Tuesday" | Nothing | Vaguely topical, probably wrong |

The failures barely overlap, which is why running both and combining them
reliably beats either — usually by a larger margin than switching to a better embedding
model would. **Hybrid retrieval is the highest-value change available to most retrieval
systems**, and it's mostly plumbing.

BM25 itself is worth one sentence of intuition: it scores a document by how many query
terms it contains, weighted so that rare terms count for much more than common ones and
so that repeated occurrences give diminishing returns, with a normalisation for document
length. That "rare terms count for more" behaviour is exactly the property embeddings
lack.

## Fusing two ranked lists

You now have two result lists with incomparable scores — BM25 returns unbounded positive
numbers whose scale depends on corpus statistics; cosine similarity returns something
between −1 and 1 with a model-dependent useful range. Adding them directly is meaningless.

**Reciprocal Rank Fusion** solves this by discarding the scores and using only the ranks:

```text
RRF(d) = Σ  1 / (k + rank_i(d))          k is a constant, conventionally 60
        i∈retrievers
```

A document ranked first by either retriever gets `1/61`; ranked tenth, `1/70`. Documents
that appear in both lists accumulate from both. The constant `k` damps the influence of
the very top ranks so that one retriever being confidently wrong can't dominate.

RRF is the sensible default: no tuning, no score calibration, no per-corpus constants, and
it is robust to one retriever returning garbage. Its cost is that it throws away
magnitude — a document that a retriever ranked first by an enormous margin is treated the
same as one that barely won.

The alternative is **score normalisation** — min-max or z-score each list, then take a
weighted sum, `α · vector + (1 − α) · lexical`. This preserves magnitude and lets you
weight the retrievers deliberately, which is useful when you know your query mix. It also
demands per-corpus tuning and breaks in the tails, where normalising a list of near-zero
scores amplifies noise. Start with RRF; move to weighted fusion only when you have an
evaluation set showing it helps.

Two implementation notes that matter more than the formula:

- **Retrieve deeper than you return.** Fetch 50–100 from each retriever and fuse, then take the top 10. Fusing two top-10 lists gives the algorithm almost nothing to work with.
- **Fuse server-side if you can.** Engines that index both representations can do this in one query; two round trips plus application-side merging is more code and more latency for the same result.

## Reranking: the expensive, accurate pass

Everything so far compares vectors that were computed independently — the document was
embedded months ago with no knowledge of the query. That independence is what makes the
index possible, and it's also the ceiling on its accuracy.

A **cross-encoder** removes the independence. It takes the query and one document
*together* as a single input and outputs a relevance score, so every layer of the model
can attend across both. It can tell that a passage mentions the query terms but answers a
different question — the exact judgement a bi-encoder cannot make.

The price is that nothing is precomputable. Scoring `n` documents means `n` forward
passes, at query time. You cannot rerank a corpus; you can only rerank a candidate set.

That gives the standard funnel:

```text
5,000,000 chunks
  → 100   candidates   (hybrid retrieval, ~10 ms)
  → 10    results      (cross-encoder rerank, ~50-200 ms)
```

Reranking is typically the largest single quality gain after hybrid search, particularly
for precision at the very top — which is exactly what matters when the results are about
to be packed into a limited context window. Practical constraints:

- **Latency scales with candidate count**, so the candidate set is a direct latency dial. 50–100 is the usual range; past a few hundred, gains flatten while cost doesn't.
- **Rerankers have their own input limits.** A long chunk gets truncated, and a truncated chunk gets scored on its first half.
- **Small rerankers are often enough.** This is not a task that needs a frontier model, and a hosted rerank endpoint or a few-hundred-megabyte cross-encoder both work.
- **A language model can rerank**, but it is slower and more expensive than a purpose-built cross-encoder for the same job. Reach for it when you need reasoning about relevance rather than relevance itself.

## Measuring any of this

None of the above is worth doing blind, and retrieval is unusually cheap to evaluate
because the ground truth is just "which document should have won".

Build a **golden set**: 50–200 real queries, each labelled with the document(s) that
should be retrieved. Pull the queries from logs if you have them; write them from the
corpus if you don't. Then track:

| Metric | What it answers | Use it for |
| --- | --- | --- |
| Recall@k | Is the right document anywhere in the top k? | The retrieval stage — did the candidate set contain the answer? |
| MRR | How high is the *first* correct result, on average? | Tasks with one right answer |
| nDCG@k | Are the good results near the top, with graded relevance? | Ranking quality when several documents are relevant to different degrees |

The division of labour is the useful part. **Recall@k is the retriever's metric** — if the
answer isn't in the candidate set, no reranker or language model can recover it, and
that's an unrecoverable failure. **nDCG and MRR are the ranker's metrics**, measuring
whether the good candidates made it to the top.

When a system underperforms, that split tells you where to look: low recall@50 means fix
retrieval (hybrid, chunking, the embedding model); good recall@50 with poor nDCG@5 means
add or improve reranking. Teams without this split tend to change the embedding model in
response to every symptom.

## What to take away

- Vector and lexical search fail on nearly disjoint query types; running both is usually a bigger win than a better embedding model.
- Fuse with RRF by default — rank-based, tuning-free, and robust to one retriever failing.
- Retrieve deep and return shallow: fuse over 50–100 candidates per retriever, not over two top-10 lists.
- A cross-encoder reranker on the top ~100 candidates is the standard second-largest quality gain, at real latency cost.
- Keep a golden set. Recall@k diagnoses the retriever, nDCG/MRR diagnose the ranker, and without both you'll fix the wrong stage.

## References

- Robertson & Zaragoza, [*The Probabilistic Relevance Framework: BM25 and Beyond*](https://www.staff.city.ac.uk/~sbrp622/papers/foundations_bm25_review.pdf) (2009)
- Cormack, Clarke & Büttcher, [*Reciprocal Rank Fusion Outperforms Condorcet and Individual Rank Learning Methods*](https://dl.acm.org/doi/10.1145/1571941.1572114) (SIGIR 2009)
- Nogueira & Cho, [*Passage Re-ranking with BERT*](https://arxiv.org/abs/1901.04085) (2019) — the cross-encoder reranking pattern
- Khattab & Zaharia, [*ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction over BERT*](https://arxiv.org/abs/2004.12832) (2020) — a middle ground between bi- and cross-encoders
- Järvelin & Kekäläinen, [*Cumulated Gain-Based Evaluation of IR Techniques*](https://dl.acm.org/doi/10.1145/582415.582418) (2002) — the origin of nDCG
- [Elasticsearch — reciprocal rank fusion](https://www.elastic.co/guide/en/elasticsearch/reference/current/rrf.html) · [OpenSearch — hybrid search](https://docs.opensearch.org/latest/vector-search/ai-search/hybrid-search/)
