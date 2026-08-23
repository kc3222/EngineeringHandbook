---
title: "Production Concerns"
description: "Latency budgets, caching, cost, freshness, access control, and the failure modes worth alerting on."
track: 4
chapter: 3
page: 7
readMinutes: 5
---

:::info[Prerequisites]
The rest of this chapter. This page is about running the pipeline rather than building
it.
:::

## Where the latency goes

A RAG response is a chain of sequential steps, and the total is what the user waits for.
A typical budget:

| Stage | Typical | Notes |
| --- | --- | --- |
| Query rewrite | 200–600 ms | A model call. Skip it when the turn doesn't need one |
| Embed the query | 20–100 ms | Hosted APIs add a network round trip |
| Retrieve | 10–100 ms | Grows with corpus size and `ef_search` |
| Rerank | 50–200 ms | Scales with candidate count |
| Generate | 1–10 s | Dominates everything else |

The generation step dwarfs the rest, which has one immediate implication: **stream the
output.** Time to first token is the number users perceive, and streaming turns a
six-second wait into a one-second wait followed by text arriving. Almost every other
latency optimisation is second-order compared to this.

Beyond streaming, the levers worth knowing:

- **Parallelise what's independent.** Multi-query retrievals, lexical and vector search, and metadata lookups all run concurrently.
- **Make optional stages conditional.** Rewrite only on follow-up turns; rerank only when the candidate scores are close together.
- **Show progress.** "Searching documentation…" during retrieval is not a trick; it correctly reports what is happening and materially changes perceived speed.

## Caching, in three places

Each layer has a different hit rate and a different invalidation rule.

**Query embeddings.** Cache keyed on the normalised query string plus the model ID.
Cheap, safe, and the hit rate is surprisingly good because real query distributions have
heavy heads.

**Retrieval results.** Cache the chunk IDs for a query plus its filter set. Must be
invalidated when the index changes, and must include the permission filter in the key —
a cache that ignores the tenant is a data leak, not a performance optimisation.

**Prompt prefixes.** Most providers cache the processed prefix of a prompt across
requests, billing repeat reads at a fraction of the input price. This rewards putting
stable content first — system prompt, then tools, then history — and volatile content
last. If your prompt starts with a timestamp, nothing after it caches. This is the same
prefix-stability discipline as any other cache; the difference is that the miss is silent
and shows up only on the invoice.

**Full-answer caching** is tempting and usually wrong: near-identical questions get
different answers when the corpus has changed, and the blast radius of a wrong cached
answer is larger than the saving. If you do it, key on a normalised query *and* an index
version, and expire aggressively.

## What it costs

Cost splits between a one-off ingestion bill and a recurring per-query bill.

**Ingestion** is dominated by embedding tokens, and it's a large one-time number on a big
corpus — and a *repeated* one every time you change embedding model. Contextual chunk
headers, which add a model call per chunk, can cost more than the embeddings themselves.
Deduplicate before embedding, skip unchanged documents by content hash, and use batch
endpoints where the provider offers them at a discount.

**Per query**, the generation call dominates, and its input side is mostly retrieved
context. That makes context size the main cost dial: sending 8,000 tokens of context
instead of 2,000 quadruples the input bill for every request, and — per the previous page
— often makes the answer worse. Reranking well is a cost optimisation as much as a
quality one.

Track cost per query and cost per resolved question separately. A system that answers
correctly at twice the cost per call may be cheaper per resolved question than one that
requires three follow-ups.

## Freshness

Decide the requirement explicitly, because it determines the architecture:

| Requirement | Approach |
| --- | --- |
| Minutes | Event-driven ingestion — source webhooks into a queue, workers re-chunk and upsert |
| Hours | Scheduled incremental job over changed documents |
| Days | Full rebuild into a new index version, then swap |

Full rebuilds are underrated. They are simple, idempotent, self-healing (drift and missed
deletes disappear), and trivially rollback-able if you keep the previous index version.
If your corpus tolerates it, a nightly rebuild removes an entire category of bug.

The rule that survives either way: **deletes must propagate**. A document removed from the
source but still in the index produces confident answers from content that no longer
exists — the worst class of failure because it's invisible until someone acts on it.

## Access control

Worth repeating on its own because it is the most serious way a RAG system fails.

Your index is a second copy of your content, and unless it was built with permissions in
mind it is a copy with **no** permissions. The requirements:

- **Store the permission model at ingestion time** — owning team, ACL, tenant, classification. You cannot filter on what you didn't index.
- **Derive filters server-side from the authenticated session.** Never from a client parameter, and never from anything the model produced.
- **Handle permission changes.** Access revoked at the source must take effect in retrieval. If your ingestion cycle is nightly, your revocation latency is nightly — which may be unacceptable and may force a live authorisation check at query time instead of a stored one.
- **Test with a low-privilege account**, not an admin one. Almost every access-control bug in retrieval is invisible when you test as someone who can see everything.

If the underlying data is protected by database row-level security, the strongest option
is keeping the vectors inside that same database so one policy governs both — the
argument made in **Where Vectors Live** and in Track 3's **Row-Level Security**.

## Failure modes and what to alert on

Non-deterministic systems degrade rather than break, so the alerts that matter are
statistical.

| Signal | What a spike usually means |
| --- | --- |
| Refusal rate up | Ingestion broke, an index is empty, or a filter is over-matching |
| Mean top-1 similarity down | Embedding model changed, or junk entered the corpus |
| Chunks per document down | A parser silently failed on a format change |
| Retrieval latency up | Index growth, degraded HNSW graph from churn, or a missing filter |
| Empty candidate sets on a tenant | Post-filtering starving a selective query |
| Generation errors | Prompt exceeding the window — usually unbounded context assembly |

Two degradation paths are worth designing before you need them. If retrieval fails, answer
from conversation context with an explicit caveat rather than erroring. If reranking fails,
fall back to fusion order — worse results beat no results.

And keep the two logs that make everything debuggable: retrieved chunk IDs with scores,
and the ability to reconstruct the exact assembled prompt. Every incident review in a RAG
system starts with those.

## What to take away

- Stream the output. It's the largest perceived-latency win available, by a wide margin.
- Cache embeddings and retrieval results, keep prompt prefixes stable, and include the permission filter in every cache key.
- Context size is the main per-query cost dial, and shrinking it usually improves quality too.
- Pick a freshness tier deliberately; nightly full rebuilds are simpler than incremental updates and fix drift for free.
- The index has no permissions unless you gave it some. Filter from the server session, and test as a low-privilege user.
- Alert on refusal rate, similarity distributions, and chunks per document — they move before users complain.

## References

- [OWASP — GenAI / LLM Top 10](https://genai.owasp.org/llm-top-10/) — sensitive information disclosure and excessive agency in retrieval systems
- [Anthropic — prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) · [OpenAI — prompt caching](https://platform.openai.com/docs/guides/prompt-caching) — prefix-stability rules and pricing
- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)
- Barnett et al., [*Seven Failure Points When Engineering a Retrieval Augmented Generation System*](https://arxiv.org/abs/2401.05856) (2024)
