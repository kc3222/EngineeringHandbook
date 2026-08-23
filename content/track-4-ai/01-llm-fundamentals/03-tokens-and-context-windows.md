---
title: "Tokens & Context Windows"
description: "Why text has a price, and what happens at the edge of the window."
track: 4
chapter: 1
page: 3
readMinutes: 5
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

The split comes from a vocabulary learned during training — byte-pair encoding or a
close relative — which merges frequently co-occurring byte sequences into single
tokens. Frequency in the training corpus decides what gets its own token, and that has
consequences you feel later.

A workable rule of thumb for English prose is **~4 characters per token**, or ~750
words per 1,000 tokens. Everything else tokenises worse:

| Content | Relative token cost | Why |
| --- | --- | --- |
| English prose | 1× | What the vocabulary was optimised for |
| Code, JSON, XML | 1.5–2× | Punctuation, indentation, and identifiers fragment |
| Non-Latin scripts | 2–4× | Under-represented in the vocabulary; sometimes byte-per-token |
| Random IDs, hashes, base64 | 3–4× | No learnable structure to merge |

A budget calculated on prose will be badly wrong for a payload of nested JSON, and a
multilingual product can pay several times more per user turn in one language than
another for exactly the same content — a pricing fairness issue as much as a technical
one.

Tokens are simultaneously the unit of *cost*, *latency*, and *capacity*. Cutting
token count is the single highest-leverage optimisation in most LLM systems.

**Count, don't estimate,** when it matters. Every provider ships a tokeniser or a
token-counting endpoint, and the counts differ between model families — a prompt
measured against one model's tokeniser can overflow another's window. Estimating from
character counts is fine for a dashboard and not fine for a guard that decides whether
a request will fit.

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
control the input. Several providers now offer server-side compaction that summarises
older turns automatically — convenient, and still the same tradeoff with the loss
moved behind an API.

## Long context is not free memory

Windows measured in hundreds of thousands or millions of tokens make "just put
everything in" sound viable. Three things push back.

**Cost and latency scale with what you send.** A million-token prompt is a
million-token bill on every request, and prefill takes real wall-clock time before the
first output token appears.

**Retrieval accuracy degrades inside the window.** Models find a fact placed at the
start or end of a long context far more reliably than one in the middle, and
performance on tasks requiring several facts spread across the window falls off well
before the advertised limit. A model that scores perfectly on "find this one sentence"
at 500k tokens can do markedly worse when the task requires aggregating across the same
span.

**More context can be actively harmful.** Irrelevant material distracts: a model given
one relevant document plus nine irrelevant ones frequently does worse than one given
the single relevant document. Precision in what you supply beats volume.

The practical position: use long context to *avoid engineering* when the corpus is
small and stable, and use retrieval when it isn't. Long windows raised the threshold at
which you need RAG; they didn't remove it.

## Reserving output space

A frequent production bug: the prompt fits, but the call fails or truncates because
prompt + `max_tokens` exceeds the window. Budget explicitly:

```text
window = system + history + retrieved_context + user_turn + max_output
```

Leave headroom. If a retrieval step can return a variable number of chunks, cap the
retrieved slice by token count rather than chunk count — chunk size is not stable.

Then **check the stop reason on the response.** A completion cut off at `max_tokens`
is not a shorter answer; it's an answer that stops mid-sentence, and JSON parsed from
it fails in ways that look like model error. This is the most commonly ignored field
in the response object.

## Reducing token count

In rough order of return:

- **Send less retrieved context.** Rank better and send five good chunks instead of twenty mediocre ones. Cheaper *and* usually more accurate.
- **Exploit prompt caching.** Put stable content first — system prompt, tool definitions, long reference material — and volatile content last. Caching is prefix-based, so a timestamp at the top of the prompt defeats it entirely.
- **Trim the history, not the instructions.** Old turns are usually the largest and least valuable part of a long conversation.
- **Compress payload formats.** Serialising data as CSV or plain lines rather than deeply nested JSON can halve its token count with no information loss.
- **Cap output deliberately.** `max_tokens` set to what the task needs, not the model's maximum.

## What to take away

- Count tokens with the model's own tokeniser when correctness matters; character estimates are for dashboards.
- Code, JSON, and non-Latin scripts cost far more per character than English prose — budget for the payload you actually send.
- Treat the window as a resource allocated across prompt sections, with an explicit reservation for output, and always read the stop reason.
- Long context is expensive, slower, and less reliable in the middle. It raises the threshold for needing retrieval rather than removing it.
- Fewer, better tokens is usually both the cheaper and the more accurate choice.

## References

- Sennrich, Haddow & Birch, [*Neural Machine Translation of Rare Words with Subword Units*](https://arxiv.org/abs/1508.07909) (2015) — byte-pair encoding
- Liu et al., [*Lost in the Middle: How Language Models Use Long Contexts*](https://arxiv.org/abs/2307.03172) (2023)
- Hsieh et al., [*RULER: What's the Real Context Size of Your Long-Context Language Models?*](https://arxiv.org/abs/2404.06654) (2024)
- Shi et al., [*Large Language Models Can Be Easily Distracted by Irrelevant Context*](https://arxiv.org/abs/2302.00093) (2023)
- [Anthropic — token counting](https://platform.claude.com/docs/en/build-with-claude/token-counting) and [prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) · [OpenAI — tokenizer library `tiktoken`](https://github.com/openai/tiktoken)
