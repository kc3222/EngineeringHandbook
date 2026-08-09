---
title: "Prompt Engineering"
description: "The parts that are durable technique rather than folklore."
track: 4
chapter: 12
page: 5
readMinutes: 5
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
especially for formatting and edge-case handling. Two cautions. They are expensive in
tokens — part of every call — so measure whether each earns its place. And they are the
strongest signal in the prompt: the model matches their length, tone, and structure, so
a stale example freezes old behaviour into new work. Vary them deliberately, or the
model will treat an incidental property of your examples as a requirement.

**Give the model room before the answer.** Asking for reasoning before a conclusion
improves multi-step tasks, because tokens generated *are* the working memory. On
reasoning-tuned models this happens internally and explicit "think step by step"
instructions add little or nothing; on standard models it still helps. Either way, the
visible reasoning is a useful scratchpad, not a faithful account of the computation —
models can produce correct-looking reasoning that doesn't match how the answer was
actually reached.

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
obeyed. Delimiting helps and does not guarantee; **Context Assembly & Generation** in
the RAG chapter covers what else is required.

**Put the question last.** With long context, the instruction and question belong at
the end, nearest the answer, where attention is most reliable.

## Instructions have a hierarchy — use it

Roles are not decoration. Content in the system instruction outranks content in the
conversation, which outranks retrieved data. Placing a rule in a `user` message makes it
easy for a later turn to override; placing it in the system instruction makes it durable.

The corollary is a design rule rather than a phrasing tip: **anything that must hold
regardless of what the user or a document says belongs in the system instruction**, and
anything genuinely negotiable does not. A system prompt stuffed with per-request detail
is also a wasted prompt cache, since caching rewards a stable prefix.

## Prompts written for older models age badly

A large share of prompt folklore is mitigation for weaknesses that no longer exist.
Emphatic all-caps insistence, threats, offers of payment, and elaborate role-play
personas had measurable effects when instruction-following was weak. Against a current
model they range from neutral to actively harmful — a prompt that says
`CRITICAL: YOU MUST ALWAYS USE THE SEARCH TOOL` will cause a model that follows
instructions well to over-trigger the tool.

The same applies to scaffolding that has been replaced by an API feature: "output only
valid JSON, no other text" plus a regex extractor plus a retry loop is three
workarounds for a problem that structured-output support solves properly.

When migrating a prompt to a newer model, the work is as much deletion as addition.
Re-run your eval set with the workarounds removed before assuming they're still needed.

## Iterating without fooling yourself

1. Collect 20–50 real inputs, including the ones that failed.
2. Write down what a correct output looks like — a schema, required facts, or a rubric.
3. Change **one** thing.
4. Re-run the whole set, not the two cases you were staring at.

Without step 4, prompt engineering is just fixing the last thing you noticed while
quietly breaking something else.

Two supporting practices make this hold up over time. **Treat prompts as code**: keep
them in version control, not in a database row edited through an admin panel, so a
change is reviewable and revertible. And **pin the model version** in your eval runs —
otherwise a provider-side update will look like a prompt regression, and you'll spend a
day rewriting text that was never the problem.

## What to take away

- The prompt is the whole payload — instructions, history, context, tools — not one sentence.
- Specific, checkable constraints and two to five well-chosen examples do most of the work.
- Examples are the strongest signal in the prompt; vary them so incidental properties aren't copied.
- Put durable rules in the system instruction and the question at the end.
- Delete inherited workarounds when moving to a newer model — much prompt folklore is mitigation for a fixed problem.
- The durable skill is not a list of phrases; it's an eval set that tells you whether a change helped.

## References

- Brown et al., [*Language Models are Few-Shot Learners*](https://arxiv.org/abs/2005.14165) (2020)
- Wei et al., [*Chain-of-Thought Prompting Elicits Reasoning in Large Language Models*](https://arxiv.org/abs/2201.11903) (2022)
- Turpin et al., [*Language Models Don't Always Say What They Think*](https://arxiv.org/abs/2305.04388) (2023) — why visible reasoning isn't a faithful trace
- Wallace et al., [*The Instruction Hierarchy: Training LLMs to Prioritize Privileged Instructions*](https://arxiv.org/abs/2404.13208) (2024)
- [Anthropic — prompt engineering overview](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview) · [OpenAI — prompt engineering guide](https://platform.openai.com/docs/guides/prompt-engineering) · [Google — prompting strategies](https://ai.google.dev/gemini-api/docs/prompting-strategies)
