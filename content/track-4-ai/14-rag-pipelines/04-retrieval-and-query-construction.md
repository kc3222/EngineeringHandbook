---
title: "Retrieval & Query Construction"
description: "The user's message is not a search query — rewriting, filtering, fanning out, and narrowing a candidate set down to what fits."
track: 4
chapter: 14
page: 4
readMinutes: 5
---

:::info[Prerequisites]
**Hybrid Search & Reranking** from the previous chapter, and **The Shape of a RAG
System** — particularly that retrieval errors are unrecoverable.
:::

## The user's message is not the query

The most common design mistake in RAG is embedding the raw user turn and searching with
it. That works for a well-formed standalone question and fails for most of what people
actually type:

| What the user sends | Why it fails as a query |
| --- | --- |
| "what about the second one?" | No content words. Meaningless without the prior turn |
| "does it work on mobile" | "It" is in the conversation, not the corpus |
| "hi, I'm trying to figure out whether our plan includes SSO, thanks!" | Greeting and pleasantries dilute the embedding |
| "SSO SAML Okta enterprise pricing" | Four questions fused into one; one vector can't be near all four topics |

So there's a **query construction** step between the user and the retriever. Its job is
producing one or more well-formed search queries, and the techniques are ordered by cost:

**Rewrite against history.** Resolve pronouns and ellipsis using the conversation so far.
A small, fast model does this well, and it is the single highest-value addition to a
multi-turn RAG system. *"What about the second one?"* becomes *"What are the rate limits
on the Team plan?"*

**Strip and normalise.** Remove greetings and sign-offs. Keep the substance.

**Decompose multi-part questions.** *"Compare the free and enterprise tiers on SSO and
audit logs"* is two or four retrievals, not one. Run them and union the results.

**Extract filters from the text.** "Last quarter", "in the Python SDK", "for enterprise
customers" are metadata predicates hiding in prose. Pulling them out and applying them as
filters is far more reliable than hoping similarity handles them.

One caution: every rewriting step adds a model call to the latency budget and a new
failure mode — a bad rewrite loses information the original query had. Keep the original
query in the retrieval mix alongside the rewrite rather than replacing it.

## Filters are not optional

Metadata filters do three separate jobs, and only one of them is about relevance.

- **Correctness** — scope to the current tenant, workspace, or project.
- **Security** — restrict to documents this user may read. This is not a ranking hint; it's an authorisation boundary, and it must be enforced server-side from the authenticated session, never from anything the model or the client supplied.
- **Relevance** — prefer recent documents, exclude archived ones, restrict to a document type.

The mechanics matter, and they were covered in **Approximate Nearest Neighbour Search**:
a store that post-filters will return nothing for a selective predicate, because the
filter is applied after the candidate set is chosen. Test your most selective real
predicate — the smallest tenant, the narrowest date range — rather than the average case.

Two rules keep the security job honest. Derive permission filters from the session on the
server, and treat the filter expression as security-critical code subject to the same
review as any other authorisation check. Track 3's **Row-Level Security** makes the case
for pushing this into the database itself where you can.

## Retrieve deep, return shallow

The funnel exists because the stages have different costs and different accuracies:

```text
corpus              → hybrid retrieval  → rerank        → assemble
millions of chunks    100-200 candidates   5-10 chunks     the prompt
                      ~10 ms               ~50-200 ms
```

The number that matters at the first stage is **recall**: is the answer anywhere in those
200 candidates? Everything downstream can only remove documents, never recover one that
was missed. So retrieve more than feels necessary — the marginal cost of 200 candidates
over 20 is small, and the marginal benefit is the queries that would otherwise have been
unanswerable.

Precision becomes the goal only at the reranking stage, where an accurate but expensive
model can afford to look at each candidate properly.

## Query expansion, and when it's worth it

Three techniques address the case where one query vector isn't enough. All of them add
latency, and all of them are worth measuring rather than assuming.

**Multi-query.** Generate three or four paraphrases of the question, retrieve for each,
and fuse the results with RRF. This directly attacks vocabulary mismatch — one phrasing
may share terms with the document even when the original didn't. Cost: one small model
call plus parallel retrievals.

**HyDE (hypothetical document embeddings).** Ask a model to *write* a plausible answer to
the question, then embed that and search with it. The insight is that in asymmetric
retrieval, a fake answer is geometrically closer to a real answer than the question is.
It works well on domains the model knows something about, and can mislead on obscure
internal content where the hallucinated answer is confidently unrepresentative.

**Step-back questions.** For a narrow question, also retrieve for a more general version
of it, so background context comes along with the specific fact.

The honest framing: these techniques are worth reaching for once hybrid retrieval,
reranking, and filtering are in place and measurement shows retrieval is still the
bottleneck. Applied first, they add latency and complexity to a system whose real problem
was that it wasn't doing lexical search.

## Multi-turn retrieval

Conversation adds a decision most pipelines get wrong: **whether to retrieve at all.**

Not every turn needs it. "Thanks, that helps" needs nothing. "Can you explain that more
simply?" needs the previous context, not a new search. Retrieving on every turn wastes
latency and, worse, injects a fresh set of chunks that can pull the model off the topic it
was correctly discussing.

A cheap classifier or a small model call deciding *retrieve / don't retrieve / retrieve
with rewrite* is a meaningful quality improvement. The natural end point of that idea —
letting the model itself decide when to search, by giving it retrieval as a tool — is
where this chapter hands off to **Prompting & AI Coding Agents**.

## What to take away

- Insert a query-construction step. Rewriting follow-ups against conversation history is the highest-value single addition to multi-turn RAG.
- Keep the original query alongside any rewrite — rewriting can lose information.
- Filters do three jobs; the security one must be derived server-side from the session and reviewed as authorisation code.
- Retrieve deep (100–200) and return shallow (5–10). Recall at the first stage is the only unrecoverable number.
- Multi-query, HyDE, and step-back retrieval are real but second-order. Do hybrid search, reranking, and filtering first.
- Decide whether a turn needs retrieval at all; retrieving unconditionally is both slower and worse.

## References

- Gao et al., [*Precise Zero-Shot Dense Retrieval without Relevance Labels*](https://arxiv.org/abs/2212.10496) (2022) — the HyDE technique
- Ma et al., [*Query Rewriting for Retrieval-Augmented Large Language Models*](https://arxiv.org/abs/2305.14283) (2023)
- Zheng et al., [*Take a Step Back: Evoking Reasoning via Abstraction in Large Language Models*](https://arxiv.org/abs/2310.06117) (2023)
- [OWASP — GenAI / LLM Top 10](https://genai.owasp.org/llm-top-10/) — including prompt injection and excessive agency, both reachable through retrieval filters
