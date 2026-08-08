---
title: "How LLMs Work"
description: "Next-token prediction, attention, and what training actually produced."
track: 4
chapter: 12
page: 2
readMinutes: 4
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
500 times. This is why output tokens cost more than input tokens: input is processed
in one parallel pass, output is strictly sequential.

## What attention does

Each layer lets every token look at the tokens before it and pull in whatever is
relevant. "It" in *the cup fell off the shelf and it broke* resolves because the
attention mechanism weights `cup` heavily when processing `it`.

Two consequences worth internalising:

1. **Cost is superlinear in context length.** Attention compares tokens pairwise, so
   doubling the prompt more than doubles the work. Long-context models mitigate this,
   they don't repeal it.
2. **Position matters.** Material at the very start and very end of a long context is
   attended to more reliably than material buried in the middle — the "lost in the
   middle" effect. Put instructions at the edges, not the centre.

## What training produced

Roughly three stages, each answering a different question:

| Stage | Objective | What it buys |
| --- | --- | --- |
| Pretraining | Predict the next token over a very large corpus | World knowledge, grammar, code syntax |
| Instruction tuning | Imitate demonstrations of following instructions | The model does what you asked instead of continuing your text |
| Preference tuning | Optimise against human/AI preference signals | Tone, refusals, format adherence |

The knowledge is **frozen at pretraining time** and stored as weights, not as
retrievable records. A model can't tell you where a fact came from, and it can't
tell "I learned this" apart from "this is a plausible continuation". That single
property is the root of the hallucination page later in this chapter.

## What this rules out

- **Arithmetic guarantees.** It predicts digits that look right; it does not compute.
- **Self-knowledge.** Asking a model why it produced an answer yields a plausible
  story, not an introspection log.
- **Freshness.** Anything after the cutoff has to be supplied in context.

Each of these is an engineering problem with a known shape: give the model a tool, a
retrieval step, or a verifier. The mistake is expecting the weights to solve it.
