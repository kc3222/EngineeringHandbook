---
title: "What an Embedding Is"
description: "Vectors as coordinates of meaning — how they're produced, how similarity is measured, and what the geometry refuses to encode."
track: 4
chapter: 2
page: 2
readMinutes: 5
---

:::info[Prerequisites]
The chapter overview. No linear algebra beyond "a vector is a list of numbers, and you
can measure the angle between two of them".
:::

## A vector is a coordinate, not a summary

An embedding model takes text in and returns a fixed-length array of floats out —
384, 768, 1536, 3072 numbers, depending on the model. The array is the same length for
a three-word query and a 500-word paragraph.

```text
"how do I cancel"   →  [0.021, -0.118, 0.077, ...]   # 1536 floats
"terminating your subscription"
                    →  [0.019, -0.104, 0.081, ...]   # nearby
"rotating your API keys"
                    →  [-0.203, 0.061, -0.140, ...]  # far away
```

No individual number means anything you can name. There is no "topic" dimension and no
"sentiment" dimension. What is meaningful is *relative position*: the model was trained
so that texts appearing in similar contexts end up in similar places. Meaning lives in
the arrangement, not the axes.

Two properties follow, and both matter operationally:

- **The array is lossy and irreversible in practice.** You cannot read the original
  text back out of it. (You cannot read it *easily* — embedding-inversion research shows
  that a dedicated attacker with the same model can reconstruct a surprising amount of
  the source text, so vectors of sensitive data are still sensitive data.)
- **Length is fixed and content is not.** A 500-word chunk and a 5-word query occupy
  the same amount of space. The longer the text, the more averaging has happened, and the
  blurrier the position — which is why chunk size turns out to be a retrieval-quality
  decision, covered in **RAG Pipelines**.

## How the vector gets produced

Almost all current text embedding models are transformer encoders with a **pooling**
step bolted on. The transformer produces one vector per token; pooling collapses those
into one vector per input — usually by taking the mean, sometimes by taking the vector
at a designated `[CLS]` position.

The important part isn't the architecture, it's the *training objective*. General-purpose
embedding models are trained contrastively: given a pair known to be related (a question
and its answer, a title and its body, two sentences from the same paragraph), pull those
two vectors together, and push away vectors from unrelated pairs sampled in the same
batch. Repeat a few hundred million times.

This is why an embedding model and a generative model are different things even when they
share an architecture. A generative model is trained to continue text; an embedding model
is trained so that *distance means relatedness for the kinds of pairs it was shown*. If
your notion of "related" doesn't match the pairs it was trained on, the geometry won't
serve you — and no amount of index tuning fixes that.

## Measuring similarity

Three metrics are in common use, and the choice is less consequential than it looks —
provided you know which one your model expects.

| Metric | Formula | Range | Notes |
| --- | --- | --- | --- |
| Cosine similarity | `(a·b) / (‖a‖‖b‖)` | −1 … 1 | Angle only; ignores magnitude. The default for text |
| Dot (inner) product | `a·b` | unbounded | Angle *and* magnitude. Longer vectors score higher |
| Euclidean (L2) distance | `‖a − b‖` | 0 … ∞ | Straight-line distance; smaller is better |

The relationship that saves you thinking about it: **if all vectors are normalised to
unit length, all three rank results identically.** Cosine becomes plain dot product, and
L2 distance becomes a monotonic function of it. Most providers return normalised vectors
for exactly this reason, and most vector stores are fastest on inner product.

So the rule in practice is: normalise once at write time, then use inner product
everywhere. The two ways to get this wrong are both silent — mixing normalised and
un-normalised vectors in one index, or querying a cosine index with an L2 operator.
Neither errors; results just get subtly worse.

One number worth internalising: raw cosine scores are **not** calibrated. A score of
0.82 is not "82% relevant", and the useful range differs per model — some models put
almost all unrelated text between 0.6 and 0.8. A fixed relevance threshold copied from a
blog post is a bug waiting to happen; derive thresholds from your own data, or avoid
absolute thresholds entirely and rank instead.

## What the geometry does not encode

This is the section to remember. Embedding similarity is **topical relatedness**, and it
is routinely mistaken for something stronger.

- **Negation is nearly invisible.** *"The migration completed successfully"* and
  *"The migration did not complete"* are about the same subject, share nearly every token,
  and embed close together. Retrieval will happily hand a model the opposite of the fact
  it needed.
- **Entailment is not distance.** *"All customers were notified"* and *"Customer #42 was
  notified"* are related, but one implies the other and the geometry has no direction.
- **There is no recency, no authority, no permission.** A deprecated 2019 runbook and its
  current replacement are near-identical vectors. If freshness or access control matters,
  it has to be metadata you filter on — never something you hope similarity handles.
- **Exact identifiers degrade.** Order numbers, SKUs, error codes, and function names are
  rare tokens; the model has little signal for them and averages them away. Searching for
  `ERR_CONN_4021` by vector alone is a coin flip. This is the single strongest argument
  for **Hybrid Search & Reranking** later in this chapter.

None of these are defects to be fixed with a better model. They are properties of the
representation, and the engineering response is to add a mechanism — a filter, a lexical
index, a reranker, a verification step — rather than to keep swapping embedding models.

## Symmetric and asymmetric similarity

A subtlety that explains a lot of disappointing results: not every retrieval task
compares two things of the same kind.

- **Symmetric** — "find posts similar to this post", deduplication, clustering. Both
  sides are the same shape of text.
- **Asymmetric** — "find the passage that answers this question". A short interrogative
  query and a long declarative passage are not the same kind of object, and a model that
  only knows how to compare like with like will underperform.

Models trained for retrieval handle this explicitly, usually by asking you to prefix each
side (`query: …` and `passage: …`, or an instruction string). Skipping the prefixes is a
common and quiet quality regression — the next page covers the mechanics.

## What to take away

- An embedding is a position, not a description; only relative distances carry meaning.
- Normalise at write time and use inner product — then cosine, dot, and L2 all agree, and one whole class of silent bug disappears.
- Cosine scores are not probabilities. Rank by them; be very careful thresholding on them.
- The geometry encodes "about the same thing". It does not encode true, current, permitted, or exact — build those in as separate mechanisms.
- Match the model's notion of similarity to your task: asymmetric question→passage retrieval needs a model (and prefixes) built for it.

## References

- Reimers & Gurevych, [*Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks*](https://arxiv.org/abs/1908.10084) (2019)
- Mikolov et al., [*Efficient Estimation of Word Representations in Vector Space*](https://arxiv.org/abs/1301.3781) (2013) — the origin of the "meaning as geometry" framing
- Morris et al., [*Text Embeddings Reveal (Almost) As Much As Text*](https://arxiv.org/abs/2310.06816) (2023) — why embeddings of sensitive text are still sensitive
- [OpenAI — Embeddings guide](https://platform.openai.com/docs/guides/embeddings) · [Google — Vertex AI text embeddings](https://cloud.google.com/vertex-ai/generative-ai/docs/embeddings/get-text-embeddings) — vendor documentation of normalisation and task types
