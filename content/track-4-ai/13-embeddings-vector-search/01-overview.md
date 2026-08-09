---
title: "Embeddings & Vector Search"
description: "Turning meaning into geometry, then searching that geometry fast enough to matter."
track: 4
chapter: 13
page: 1
readMinutes: 3
---

:::info[Prerequisites]
**LLM Fundamentals** — in particular that a model turns text into vectors internally,
and that context is a budget you have to spend carefully.
:::

## Why this chapter exists

Keyword search answers "which documents contain these words". A great many real
questions aren't shaped like that. *"How do I cancel?"* should find a page titled
**Terminating your subscription**, which shares not one content word with the query.

An **embedding** is the standard fix: a function that maps a piece of text to a
fixed-length list of numbers, arranged so that texts about similar things land near
each other. Once meaning is a position in space, "find me related things" becomes
"find me nearby points" — a geometry problem with decades of algorithms behind it.

That reframing is the whole chapter, and it splits cleanly into two halves that fail
for different reasons:

| Half | The question | How it goes wrong |
| --- | --- | --- |
| Representation | Does *near* actually mean *relevant* here? | The model was never trained on your domain; similarity is topical, not logical |
| Retrieval | Can you find the near points fast, at your scale, under your filters? | Exact search doesn't scale; approximate search quietly returns the wrong neighbours |

Most teams debug the second half when the problem is in the first. A search that
returns fast, plausible, useless results is nearly always a representation problem
wearing an infrastructure costume.

## The uncomfortable part

Embedding similarity is **not** a truth relation. Two sentences can be maximally
similar and mean opposite things — *"the deploy succeeded"* and *"the deploy failed"*
differ by one token and sit close together in most embedding spaces, because they are
about the same topic. Nothing in the geometry encodes negation, recency, permission,
or correctness.

Everything downstream inherits that. If a retrieval step feeds a language model, the
model will faithfully answer from whatever the geometry handed it. That's the seam
where **RAG Pipelines** — the next chapter — spends most of its engineering effort.

## What's in here

| Page | What it covers |
| --- | --- |
| What an Embedding Is | Vectors, similarity metrics, normalisation, and what "similar" does and doesn't mean |
| Choosing an Embedding Model | Dimensions, domain fit, query/document asymmetry, and the reindex you signed up for |
| Approximate Nearest Neighbour Search | Exact vs approximate, HNSW, IVF, quantisation, and recall as the thing you're trading |
| Where Vectors Live | pgvector, dedicated vector databases, search engines, and raw libraries |
| Hybrid Search & Reranking | Why lexical search still matters, fusing two rankings, and rerankers as the last mile |

## Where this connects

Backwards, **LLM Fundamentals** supplies the model that produces these vectors.
**Relational Schema Design** and **Row-Level Security** in Track 3 matter more than
they look: a vector index is a second copy of your data with its own access-control
story, and "the embedding leaked a row the user can't read" is a real failure mode.

Forwards, **RAG Pipelines** is this chapter applied end to end — ingestion, retrieval,
and the generation step that consumes the results.

## References

- Reimers & Gurevych, [*Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks*](https://arxiv.org/abs/1908.10084) (2019) — the paper that made general-purpose sentence embeddings practical
- Muennighoff et al., [*MTEB: Massive Text Embedding Benchmark*](https://arxiv.org/abs/2210.07316) · [live leaderboard](https://huggingface.co/spaces/mteb/leaderboard)
