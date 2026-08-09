---
title: "How LLMs Work"
description: "Next-token prediction, attention, and what training actually produced."
track: 4
chapter: 12
page: 2
readMinutes: 5
---

:::info[Prerequisites]
The chapter overview. No maths beyond "a probability distribution is a list of
numbers that sums to 1".
:::

## The whole model in one line

```text
tokens in  →  [ transformer ]  →  a probability for every token in the vocabulary
```

To generate text, the runtime picks one token from that distribution, appends it to
the input, and runs the model again. Generating 500 tokens means running the model
500 times.

That loop explains a pricing detail that otherwise looks arbitrary: **output tokens
cost several times more than input tokens.** Input is processed in one parallel pass
over the whole prompt — the *prefill* — while output is strictly sequential, one
forward pass per token. Prefill is compute-bound and parallelises beautifully; decode
is memory-bandwidth-bound and does not. Two phases, two cost structures, one bill.

## What happens inside the pass

Enough detail to reason about behaviour, and no more:

1. **Tokenise.** Text splits into tokens; each becomes an integer.
2. **Embed.** Each integer indexes into a table, producing a vector — plus a positional signal, so the model knows the order.
3. **Stack of layers.** Each layer does the same two things: attention (mix information between positions) and a feed-forward network (transform each position independently). Modern models stack dozens to hundreds of these.
4. **Unembed.** The final vector at the last position is projected back to vocabulary size, giving one score — a *logit* — per token.
5. **Softmax.** Logits become probabilities.

Step 5's output is where **Sampling & Determinism** picks up. Everything before it is
deterministic given the same inputs and the same hardware.

## What attention does

Each layer lets every token look at the tokens before it and pull in whatever is
relevant. "It" in *the cup fell off the shelf and it broke* resolves because the
attention mechanism weights `cup` heavily when processing `it`.

Three consequences worth internalising:

1. **Cost is superlinear in context length.** Attention compares tokens pairwise, so
   doubling the prompt more than doubles the attention work. Long-context architectures
   mitigate this; they don't repeal it.
2. **Position matters.** Material at the very start and very end of a long context is
   attended to more reliably than material buried in the middle — the "lost in the
   middle" effect. Put instructions at the edges, not the centre.
3. **The past is cached.** Because each token only attends backwards, the intermediate
   attention values for earlier tokens don't change as generation proceeds. Runtimes
   keep them in a **KV cache** rather than recomputing. This is why generating the 500th
   token isn't 500× the work of the first — and it's the mechanism behind provider-side
   *prompt caching*, where a stable prefix is processed once and reused across requests.
   It also explains why prompt caching is prefix-based: change one byte early in the
   prompt and every cached value after it is invalid.

## What training produced

Roughly three stages, each answering a different question:

| Stage | Objective | What it buys |
| --- | --- | --- |
| Pretraining | Predict the next token over a very large corpus | World knowledge, grammar, code syntax |
| Instruction tuning | Imitate demonstrations of following instructions | The model does what you asked instead of continuing your text |
| Preference tuning | Optimise against human/AI preference signals | Tone, refusals, format adherence |

Pretraining is where capability comes from and where essentially all the compute goes.
The later stages are comparatively cheap and are about *shaping* an existing capability
— which is why "the model can't do X" and "the model won't do X" are different problems
with different fixes.

The knowledge is **frozen at pretraining time** and stored as weights, not as
retrievable records. A model can't tell you where a fact came from, and it can't
distinguish "I learned this" from "this is a plausible continuation". That single
property is the root of the hallucination page later in this chapter.

Later models add a fourth mode: training the model to generate an extended internal
reasoning pass before answering. It's the same next-token loop — the model is simply
spending output tokens on working before it commits — which is why reasoning capability
shows up on the bill as tokens.

## In-context learning is not learning

A model shown three examples in the prompt will follow their pattern. Nothing is
updated: the weights are identical before and after, and the effect vanishes when the
examples leave the context. The model is conditioning on a pattern present in its
input, not acquiring a skill.

This distinction decides a real architectural question. If information must persist
across requests, it has to live somewhere you control — a database, a retrieval index,
a file — and be re-supplied. "The model will remember" is never true.

## What this rules out

- **Arithmetic guarantees.** It predicts digits that look right; it does not compute.
- **Self-knowledge.** Asking a model why it produced an answer yields a plausible story, not an introspection log — the explanation is generated by the same process as the answer, with no privileged access to it.
- **Freshness.** Anything after the cutoff has to be supplied in context.
- **Stable identity across calls.** Each request is independent; continuity is something your application reconstructs by resending history.

Each of these is an engineering problem with a known shape: give the model a tool, a
retrieval step, or a verifier. The mistake is expecting the weights to solve it.

## What to take away

- One primitive — next-token probabilities — called in a loop, is the entire mechanism.
- Prefill is parallel and cheap; decode is sequential and expensive. That's the input/output price gap.
- The KV cache is why long generations stay tractable and why prompt caching is prefix-based.
- Knowledge lives in weights, unattributable and frozen at training time.
- In-context learning changes nothing persistent. Anything that must survive a request is your system's job.

## References

- Vaswani et al., [*Attention Is All You Need*](https://arxiv.org/abs/1706.03762) (2017)
- Brown et al., [*Language Models are Few-Shot Learners*](https://arxiv.org/abs/2005.14165) (2020) — in-context learning
- Ouyang et al., [*Training language models to follow instructions with human feedback*](https://arxiv.org/abs/2203.02155) (2022) — instruction and preference tuning
- Liu et al., [*Lost in the Middle: How Language Models Use Long Contexts*](https://arxiv.org/abs/2307.03172) (2023)
- Kwon et al., [*Efficient Memory Management for Large Language Model Serving with PagedAttention*](https://arxiv.org/abs/2309.06180) (2023) — how the KV cache is managed in practice
