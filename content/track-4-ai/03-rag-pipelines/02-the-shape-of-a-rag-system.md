---
title: "The Shape of a RAG System"
description: "The ingestion path, the query path, and a fault dictionary for attributing a bad answer to the stage that caused it."
track: 4
chapter: 3
page: 2
readMinutes: 4
---

:::info[Prerequisites]
The chapter overview — in particular that the two paths run on different schedules and
fail in different ways.
:::

## The ingestion path

Ingestion runs when documents change, and its output is the only thing the query path can
ever see. Anything lost here is lost permanently.

1. **Acquire** — pull documents from their sources, with a change signal (webhook, timestamp, checksum) so you're not reprocessing everything nightly.
2. **Parse** — turn PDFs, HTML, Office documents, and wiki pages into text plus structure. This step throws away more useful information than any other.
3. **Chunk** — split into retrievable units, because you retrieve chunks, not documents.
4. **Enrich** — attach metadata: source, section path, timestamps, permissions, document type.
5. **Embed** — one vector per chunk, plus a lexical index if you're doing hybrid retrieval.
6. **Index** — write vectors, text, and metadata, atomically enough that a partial failure doesn't leave a half-indexed document.

The most consequential design decision here has nothing to do with models: **keep the
chunk text in a system you control**, with a stable ID, as the source of truth. The vector
index is then a derived artefact you can rebuild — which is what makes changing the
embedding model a background job rather than a re-crawl of every source system.

## The query path

The query path runs inside a user's patience budget.

1. **Construct the query** — the user's turn is not automatically a good search query; a follow-up like *"what about the second one?"* is uninterpretable alone.
2. **Retrieve** — hybrid retrieval over a filtered candidate set, deep rather than shallow.
3. **Rerank** — cross-encoder pass narrowing the candidates to what actually goes in the prompt.
4. **Assemble** — build the context block within a deliberate token budget, with source markers.
5. **Generate** — call the model with instructions that constrain it to the provided context.
6. **Post-process** — validate citations, attach source links, and decide whether to show the answer at all.

Steps 3, 5 and 6 are the ones most first versions omit, and step 6 is the one that
separates a system people trust from one they don't.

## A fault dictionary

The single most valuable habit in RAG work is refusing to debug "the answer was wrong" as
one problem. Every stage produces a distinct signature, and the check that distinguishes
them is nearly always the same: **look at what was actually retrieved and what was
actually in the prompt.**

| Symptom | Likely stage | The diagnostic |
| --- | --- | --- |
| Model says it doesn't know; the fact is in the corpus | Parsing or chunking | Search the chunk store for the fact as plain text. If it isn't there, it never got in |
| Retrieved chunks are on-topic but don't contain the answer | Chunking | The answer probably straddles a boundary, or a table lost its header |
| Retrieved chunks are irrelevant | Retrieval | Check hybrid vs vector-only, filters, and recall@k on a golden set |
| Right chunks retrieved, wrong answer generated | Generation | The prompt, the ordering, or too much context diluting the relevant part |
| Answer is right but the citation points elsewhere | Assembly or post-processing | Source markers aren't surviving into the model's output |
| Right yesterday, wrong today | Freshness | Ingestion lag, or a stale chunk that was never deleted |
| Wrong only for one user or tenant | Filtering | Post-filtering starving the candidate set, or a missing permission predicate |

Two pieces of instrumentation make this table usable, and both are cheap: log the
retrieved chunk IDs and scores for every request, and be able to reconstruct the exact
prompt that was sent. Without those, every investigation is guesswork.

## Where the errors compound

It's worth being concrete about why "good enough at every stage" isn't good enough
overall. Take a plausible pipeline:

| Stage | Success rate | Cumulative |
| --- | --- | --- |
| Parsing preserves the content | 0.95 | 0.95 |
| Chunk contains the whole answer | 0.90 | 0.86 |
| Retrieval puts it in the candidate set | 0.85 | 0.73 |
| Reranking keeps it in the top 5 | 0.95 | 0.69 |
| Model answers from it correctly | 0.95 | 0.66 |

Two things fall out of this arithmetic. First, **the weakest stage dominates** — improving
generation from 0.95 to 0.98 moves the total by two points; fixing retrieval from 0.85 to
0.95 moves it by eight. Measure per stage, then fix the worst one, rather than tuning
whichever stage is most fun.

Second, **recall is protective and precision is not**. An error at retrieval is
unrecoverable: if the answer isn't in the candidate set, nothing downstream can invent it.
An error at reranking is recoverable, because the chunk is still in hand. That asymmetry
is why the funnel is shaped the way it is — retrieve generously, then narrow with
progressively more expensive and more accurate steps.

## Naive, and one step past it

The version everyone builds first — embed, search top 5, stuff into a prompt — is a fine
starting point and a bad ending point. The improvements that matter most, roughly in
order of value per unit of effort:

- **Hybrid retrieval** instead of vector-only. Usually the single biggest gain.
- **Reranking** the candidate set before assembly.
- **Metadata filtering** so queries can be scoped by tenant, recency, or document type.
- **Query construction** — resolving pronouns and follow-ups against conversation history.
- **Grounding constraints** — cite sources, and say "I don't know" when retrieval is empty.

Further out sit the techniques with real but narrower value: generating multiple query
variants, hypothetical document embeddings, and retrieving parent documents for
child-chunk hits. All appear in the pages that follow. None of them substitute for the
five above, and reaching for them first is the most common way to spend a month without
moving the number.

## What to take away

- Ingestion decides what can ever be found; the query path only decides what gets found today.
- Keep chunk text in a store you control, so the vector index stays a rebuildable derived artefact.
- Never debug "the answer was wrong" as a single problem — log retrieved chunks and the assembled prompt, and attribute the fault to a stage.
- Stage accuracies multiply; fix the weakest stage, not the most interesting one.
- Retrieval errors are unrecoverable and ranking errors are not, which is why you retrieve deep and narrow late.

## References

- Barnett et al., [*Seven Failure Points When Engineering a Retrieval Augmented Generation System*](https://arxiv.org/abs/2401.05856) (2024)
- Gao et al., [*Retrieval-Augmented Generation for Large Language Models: A Survey*](https://arxiv.org/abs/2312.10997) (2023)
