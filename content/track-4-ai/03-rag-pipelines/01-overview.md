---
title: "RAG Pipelines"
description: "Retrieval-augmented generation end to end — the system most people build and most people undersell."
track: 4
chapter: 3
page: 1
readMinutes: 3
---

:::info[Prerequisites]
**LLM Fundamentals** (context windows, hallucination) and **Embeddings & Vector Search**
(similarity, hybrid retrieval, reranking). This chapter assembles both into a system.
:::

## Why this chapter exists

A language model knows what was in its training data, cannot cite where a fact came
from, and has no access to your documents. **Retrieval-augmented generation** is the
standard response: before answering, fetch relevant text and put it in the prompt.

Described that way it sounds like a weekend project, and the first version genuinely is
— embed some documents, search, paste the results into a prompt. That version demos
beautifully and then plateaus at roughly 70% correct, which is the worst possible number:
good enough to ship, bad enough to erode trust, and hard to improve without knowing which
stage is failing.

The gap between the demo and the system is where this chapter lives. RAG is not one
technique; it's a pipeline of five or six stages, each with its own failure mode, and
**the failures compound multiplicatively**. If parsing loses 5% of your content, chunking
splits 10% of answers across boundaries, retrieval misses 20% of the time, and the model
ignores provided context 5% of the time, you are at 0.95 × 0.90 × 0.80 × 0.95 ≈ 65%
before anyone has written a difficult prompt.

## The two paths

Every RAG system has an **ingestion path** that runs offline and a **query path** that
runs per request. Almost all quality problems originate in the first and are diagnosed in
the second, which is why they get misattributed.

| | Ingestion (offline) | Query (per request) |
| --- | --- | --- |
| Steps | Parse → chunk → enrich → embed → index | Construct query → retrieve → rerank → assemble → generate |
| Runs | On document change, or as a batch | On every request |
| Optimise for | Throughput and fidelity | Latency and precision |
| Failure looks like | "The model doesn't know things it should" | "The model was told, and answered wrong anyway" |

## When RAG is the wrong answer

Worth settling before building, because retrieval is not the only way to get information
into a model:

- **Small, stable corpus** — if everything fits in the context window and stays put, put it in the context window. Retrieval adds failure modes and buys nothing.
- **The answer requires aggregation** — "how many contracts expire this quarter" is a database query. Retrieval returns *some* contracts; it will not count them. Give the model a query tool instead.
- **You need style or format, not facts** — that's prompting, examples, or fine-tuning. Retrieval doesn't change how a model writes.
- **The data has a schema** — structured data belongs behind a structured query. Retrieving rows as prose is a lossy detour. That path is still a retrieval system, and **Retrieval over Structured Data** covers it.

RAG earns its complexity when the corpus is large, changes, and the answers live in
unstructured text. The last two pages cover the case where it doesn't, because that
system is built out of the same parts.

## What's in here

| Page | What it covers |
| --- | --- |
| The Shape of a RAG System | The two paths in detail, and where each stage's errors show up |
| Ingestion & Chunking | Parsing, chunk size and overlap, metadata, and incremental updates |
| Retrieval & Query Construction | Turning a user turn into a query, filters, multi-query, and the recall/precision funnel |
| Context Assembly & Generation | Packing the window, forcing citations, and refusing when retrieval comes back empty |
| Evaluating a RAG System | Separating retrieval quality from generation quality, and using a model as a judge without fooling yourself |
| Production Concerns | Latency budgets, caching, freshness, access control, and the failure modes worth alerting on |
| Retrieval over Structured Data | When the corpus is a database — retrieving schema, generating SQL, and the failure modes that produce a wrong number |
| Executing Generated Queries Safely | Treating model output as untrusted input, and the independent layers that contain it |

## Where this connects

**Embeddings & Vector Search** supplies the retriever this chapter drives. **LLM
Fundamentals** supplies the generation step and the context budget everything is squeezed
into. Forward, **Prompting & AI Coding Agents** picks up where retrieval stops being a
fixed pipeline step and becomes something the model decides to invoke.

Outside this track, Track 3's **Row-Level Security** matters directly: a retrieval index
that ignores permissions is a permissions bypass with a natural-language interface, and
Track 6's **Monitoring & Incident Response** covers the observability a system this
non-deterministic needs.

## References

- Lewis et al., [*Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks*](https://arxiv.org/abs/2005.11401) (2020) — the paper the term comes from
- Gao et al., [*Retrieval-Augmented Generation for Large Language Models: A Survey*](https://arxiv.org/abs/2312.10997) (2023)
