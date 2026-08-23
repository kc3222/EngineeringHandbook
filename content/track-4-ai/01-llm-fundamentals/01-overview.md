---
title: "LLM Fundamentals"
description: "The floor everything else stands on: what the model actually is, what it costs, what it can't do."
track: 4
chapter: 1
page: 1
readMinutes: 3
---

:::info[Prerequisites]
None. This is the entry point — start here if you're starting anywhere.
:::

## Why this chapter exists

Every system in the AI track is a wrapper around one primitive: **a function that
takes a sequence of tokens and returns a probability distribution over the next
token**. That's it. There is no memory, no database, no reasoning engine
underneath — just that function, called in a loop.

Almost every surprising behaviour of LLM applications falls out of that one fact:

- The model has no memory between calls → you resend everything → context is a *budget*.
- It always produces *a* next token, however unsupported → hallucination is the default, not a bug.
- It samples from a distribution → identical inputs give different outputs, and "temperature 0" doesn't fully fix that.
- It bills by token in and token out → your architecture diagram is also your invoice.

It's worth getting this floor solid, because an engineer who has only used the API
at the surface will confidently build on a false model of what happens underneath —
and the resulting bugs are the confusing kind.

## What's in here

| Page | What it covers |
| --- | --- |
| How LLMs Work | Next-token prediction, attention, and what "training" actually produced |
| Tokens & Context Windows | Why text has a price, and what happens at the edge of the window |
| Sampling & Determinism | Temperature, top-p, and why the same prompt gives two answers |
| Prompt Engineering | The parts that are durable technique rather than folklore |
| LLM APIs | Messages, roles, streaming, and the shape of a production call |
| Hallucination | Why it happens, and the four mitigations that actually move the number |
| Running Open-Weight Models | VRAM arithmetic, quantization tradeoffs, serving runtimes, and when self-hosting pays |

## Where this connects

The chapters that follow assume this one. **Embeddings & Vector Search** builds on
the idea that a model turns text into vectors; **RAG Pipelines** is entirely a
response to the context-window and hallucination limits described here; and
**Prompting & AI Coding Agents** is what happens when the loop is allowed to call
tools.

If you only read one page in this chapter, read *Tokens & Context Windows* — it is
the constraint that shapes every design decision downstream.

## References

- Vaswani et al., [*Attention Is All You Need*](https://arxiv.org/abs/1706.03762) (2017) — the transformer architecture underneath all of this
- Brown et al., [*Language Models are Few-Shot Learners*](https://arxiv.org/abs/2005.14165) (2020) — the paper that established in-context learning as the interface
- [Anthropic — Claude API documentation](https://platform.claude.com/docs/en/api/overview) · [OpenAI — API documentation](https://platform.openai.com/docs/) · [Google — Gemini API documentation](https://ai.google.dev/gemini-api/docs)
