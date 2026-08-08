---
title: "Tokens & Context Windows"
description: "Why text has a price, and what happens at the edge of the window."
track: 4
chapter: 12
page: 3
readMinutes: 3
---

:::info[Prerequisites]
**How LLMs Work** — specifically that generation is a loop over the whole context.
:::

## Tokens are the unit of everything

Models don't read characters or words. Text is split into **tokens**: common words
are usually one token, rarer words split into pieces, and whitespace is often
attached to the following word.

```text
"unbelievable"   →  ["un", "bel", "iev", "able"]
"the cat sat"    →  ["the", " cat", " sat"]
```

A workable rule of thumb for English prose is **~4 characters per token**, or ~750
words per 1,000 tokens. Code, JSON, and non-Latin scripts tokenise worse — sometimes
much worse — so a budget calculated on prose will be wrong for a payload of nested
JSON.

Tokens are simultaneously the unit of *cost*, *latency*, and *capacity*. Cutting
token count is the single highest-leverage optimisation in most LLM systems.

## The context window is a budget, not a memory

The context window is the maximum number of tokens the model can see in one call —
prompt **and** completion together. Because the model is stateless, a chat
application resends the entire conversation every turn. A 20-turn conversation is
20 API calls whose cost grows roughly quadratically with turn count.

That leads to a fixed set of strategies, all of them tradeoffs:

| Strategy | What you give up |
| --- | --- |
| Truncate oldest turns | Early context silently disappears mid-conversation |
| Summarise older turns | Detail and exact wording; summarisation itself costs a call |
| Retrieve only relevant history (RAG) | Complexity, plus retrieval can miss |
| Just use a bigger window | Cost, latency, and reliability in the middle of the context |

None of these is the "correct" answer. Chat products usually combine summarisation
with retrieval; batch pipelines usually just truncate deterministically because they
control the input.

## Reserving output space

A frequent production bug: the prompt fits, but the call fails or truncates because
prompt + `max_tokens` exceeds the window. Budget explicitly:

```text
window = system + history + retrieved_context + user_turn + max_output
```

Leave headroom. If a retrieval step can return a variable number of chunks, cap the
retrieved slice by token count rather than chunk count — chunk size is not stable.

## What to take away

- Count tokens, don't estimate characters, when correctness matters — every provider ships a tokeniser.
- Treat the window as a resource allocated across sections of the prompt, with an explicit reservation for output.
- Long context is not free memory. It is expensive, slower, and less reliable per token in the middle.
