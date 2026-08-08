---
title: "Prompt Engineering"
description: "The parts that are durable technique rather than folklore."
track: 4
chapter: 12
page: 5
readMinutes: 4
---

:::info[Prerequisites]
**Sampling & Determinism** — a prompt change and a temperature change can produce
the same symptom, and you need to be able to tell them apart.
:::

## What a prompt actually is

A prompt is the entire input: system instructions, conversation history, retrieved
context, tool definitions, and the user's turn. "Prompt engineering" is the design
of that whole payload, not the phrasing of one sentence.

Most techniques that survive contact with production are variations on three moves:
**be specific about the task**, **show the shape of a good answer**, and **give the
model room to work before it commits**.

## Techniques with real support

**Specificity over politeness.** "Summarise in three bullets, each under 20 words,
covering only the decisions made" beats "please summarise nicely". Constraints that
are checkable are constraints the model can satisfy.

**Few-shot examples.** Two to five examples usually beat a paragraph of description,
especially for formatting and edge-case handling. Examples are expensive in tokens —
they are part of every call — so measure whether each one earns its place.

**Give the model room before the answer.** Asking for reasoning before a conclusion
improves multi-step tasks, because tokens generated *are* the working memory. On
reasoning-tuned models this happens internally and explicit "think step by step"
instructions add less; on standard models it still helps. The reasoning is a
useful scratchpad, not a faithful account of the computation.

**Positive instructions.** "Answer only from the provided context" is followed more
reliably than "don't use outside knowledge". Negations require the model to
represent the thing you're forbidding.

**Structure the payload.** Delimit sections clearly so the model can tell
instructions from data:

```text
<instructions>
Answer using only <context>. If the answer isn't there, say "not in the provided material".
</instructions>

<context>
{retrieved_chunks}
</context>

<question>{user_question}</question>
```

This is also a security boundary, not just a formatting one — text inside `<context>`
is data that arrived from somewhere else, and instructions found in it should not be
obeyed.

## Where the folklore is

Offering tips, threatening consequences, and elaborate role-play personas have weak
and model-specific effects. They aren't harmful, but they aren't a strategy. The same
applies to prompts copied from a model generation ago: techniques that mattered when
instruction-following was weak matter much less now.

The durable skill isn't a list of phrases. It's having an eval set, so that when you
change a prompt you can say whether it got better.

## Iterating without fooling yourself

1. Collect 20–50 real inputs, including the ones that failed.
2. Write down what a correct output looks like — a schema, required facts, or a rubric.
3. Change **one** thing.
4. Re-run the whole set, not the two cases you were staring at.

Without step 4, prompt engineering is just fixing the last thing you noticed while
quietly breaking something else.
