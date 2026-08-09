---
title: "Evaluating a RAG System"
description: "Separating retrieval quality from generation quality, building a test set without labelled data, and using a model as a judge without fooling yourself."
track: 4
chapter: 14
page: 6
readMinutes: 5
---

:::info[Prerequisites]
**The Shape of a RAG System** — the stage decomposition this page measures.
:::

## Why "it seems better" isn't good enough

RAG systems are non-deterministic, multi-stage, and full of parameters that interact.
Chunk size, overlap, `k`, the fusion weight, the reranker, the prompt — change one and
some queries improve while others regress. Without measurement you are doing a random walk
with a convincing narrative attached, and the usual outcome is a month of changes that net
to zero.

The good news is that RAG is unusually tractable to evaluate, because the pipeline
decomposes. You can measure retrieval without involving a model at all, and that's where
most of the signal is.

## Two evaluations, not one

Keep these separate. Collapsing them into a single "is the answer good" score is the most
common evaluation mistake, because it can't tell you what to fix.

| | Retrieval evaluation | Generation evaluation |
| --- | --- | --- |
| Question | Did the right chunks come back? | Given those chunks, was the answer right? |
| Needs | Query → correct-chunk labels | Query, chunks, and a reference answer or a judge |
| Cost | Cheap, deterministic, fast | Expensive, noisy, slow |
| Metrics | Recall@k, MRR, nDCG@k | Faithfulness, answer relevance, correctness |

Run retrieval evaluation on every change — it's fast enough for CI. Run generation
evaluation less often, on a smaller set, because it costs model calls and has real
variance.

The decision rule that falls out: **low recall@k means fix retrieval.** No amount of
prompt engineering recovers a chunk that was never fetched. **Good recall with poor
answers means fix generation** — the prompt, the ordering, the context budget.

## Building a test set without labelled data

The objection is always "we don't have ground truth". You have three routes, and they
compose.

**Synthesise from the corpus.** Take a chunk, ask a model to write a question that this
chunk answers, and record the pair. A few hundred pairs is an afternoon. The known
weakness is that these questions are phrased in the chunk's own vocabulary and so are
easier than real ones — treat the resulting numbers as a relative signal for comparing
configurations, not as an absolute quality estimate.

**Mine production logs.** Real queries are the ones that matter. Sample them, retrieve,
and have a human mark which results were relevant. Fifty carefully labelled real queries
beat a thousand synthetic ones for detecting the failures you actually have.

**Harvest failures.** Every reported bad answer becomes a permanent test case. This set
grows in exactly the direction of your weaknesses and is the most valuable one you'll own
after six months.

Keep the set version-controlled, keep it small enough to run often, and split it: a
development set you iterate against and a held-out set you touch rarely. Tuning against
one set until the number goes up is overfitting, and it happens quickly.

## Metrics that mean something

**Retrieval.** Recall@k is the headline — the answer-bearing chunk is either in the
candidate set or the query is unanswerable. Report it at the depth you actually retrieve
(recall@50 if you rerank 50) and at the depth you actually send (recall@5). The gap
between them is precisely the value your reranker is adding. MRR and nDCG@k, defined in
**Hybrid Search & Reranking**, measure ordering quality.

**Generation.** Three questions, worth keeping distinct:

- **Faithfulness / groundedness** — is every claim in the answer supported by the provided context? This is the one that catches hallucination, and it's checkable without a reference answer.
- **Answer relevance** — does the answer address the question that was asked?
- **Correctness** — does it match a reference answer? Requires labels, so it applies to a smaller set.

A system can be perfectly faithful and useless (it grounded itself in the wrong
document), or relevant and unfaithful (it answered well from its parameters). You need
both numbers.

**Refusal behaviour** deserves its own measurement and is routinely forgotten. Include
queries with no answer in the corpus, and check the system declines rather than
improvising. A system that never refuses is not a system with perfect coverage.

## LLM-as-judge, carefully

For faithfulness and relevance, a model grading outputs is the only approach that scales.
It works, with caveats that are easy to trip over:

- **Judges are biased.** Toward longer answers, toward their own outputs, and toward whichever option is listed first in a pairwise comparison. Randomise ordering; be wary of a model grading its own family.
- **Binary beats scalar.** "Is this claim supported by the context: yes/no" is far more reliable than "rate faithfulness 1–10". Decompose the answer into claims and grade each one.
- **Give the judge the evidence.** Faithfulness judging means comparing the answer against the retrieved context, which must be in the judge's prompt.
- **Calibrate against humans, once.** Have a person grade 50 examples, compare with the judge, and measure agreement. If it's poor, fix the judge prompt before trusting any of its numbers. This step is what converts a judge from a vibe generator into an instrument.
- **Pin the judge.** Changing the judge model changes every historical number. Version it like any other dependency.

## Regression testing and online signals

Offline evaluation belongs in CI. Any change to chunking, embeddings, retrieval
parameters, or prompts runs the retrieval suite; a drop in recall@k fails the build. This
is cheap and prevents the most common regression — a "small" chunking tweak that quietly
halves retrieval quality.

Offline sets go stale, though, because real usage drifts. Complement them with production
signals:

- **Refusal rate** — a sudden rise usually means ingestion broke, not that users got harder.
- **Thumbs up/down** — sparse and biased, but the trend and the individual downvotes are both useful.
- **Citation click-through** — readers checking sources is a health signal.
- **Retrieval score distributions** — a shift in top-1 similarity often precedes user-visible problems, and it's the earliest warning you get that an ingestion job is producing junk.

The general instrumentation principle from Track 6's **Monitoring & Incident Response**
applies directly: log the retrieved chunk IDs and scores, and be able to reconstruct the
exact prompt. Those two logs turn most investigations from speculation into reading.

## What to take away

- Measure retrieval and generation separately, or you cannot tell which stage to fix.
- Recall@k is the number that gates everything downstream; run it in CI on every change.
- Build a test set from synthetic questions, sampled production queries, and harvested failures — in increasing order of value.
- LLM-as-judge works for faithfulness if you use binary per-claim grading, control for position bias, and calibrate against human labels once.
- Evaluate refusal behaviour explicitly; a system that never says "I don't know" is broken in a way no accuracy metric catches.
- Watch refusal rate and retrieval score distributions in production — they move before users complain.

## References

- Es et al., [*RAGAS: Automated Evaluation of Retrieval Augmented Generation*](https://arxiv.org/abs/2309.15217) (2023) · [Ragas documentation](https://docs.ragas.io/)
- Zheng et al., [*Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena*](https://arxiv.org/abs/2306.05685) (2023) — including the position and verbosity biases
- Saad-Falcon et al., [*ARES: An Automated Evaluation Framework for Retrieval-Augmented Generation Systems*](https://arxiv.org/abs/2311.09476) (2023)
- Järvelin & Kekäläinen, [*Cumulated Gain-Based Evaluation of IR Techniques*](https://dl.acm.org/doi/10.1145/582415.582418) (2002)
