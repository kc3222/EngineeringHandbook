---
title: "LLM APIs"
description: "Messages, roles, streaming, and the shape of a production call."
track: 4
chapter: 12
page: 6
readMinutes: 4
---

:::info[Prerequisites]
**Tokens & Context Windows** — the request body is where the budget gets spent.
:::

## The request shape

Providers differ in details, but the modern shape is the same everywhere: a system
instruction, an ordered list of messages with roles, and decoding parameters.

```python
response = client.messages.create(
    model="claude-sonnet-5",
    max_tokens=1024,
    system="You answer only from the provided context.",
    messages=[
        {"role": "user", "content": "What changed in the deploy config?"},
        {"role": "assistant", "content": "Two things changed…"},
        {"role": "user", "content": "Summarise just the second one."},
    ],
)
```

Roles are not decoration. `system` carries instructions that should outrank the
conversation; `user` and `assistant` reconstruct the history the model has no memory
of. Putting instructions in a `user` message makes them easier for later turns to
override.

## Streaming

Streaming returns tokens as they're generated. It doesn't make generation faster —
it makes *time to first token* the number the user experiences instead of total
latency. For anything conversational, that difference dominates perceived quality.

The tradeoff is that you're committed to output you haven't finished validating. If
a response must be schema-valid or pass a safety check before display, either buffer
it or stream into a UI that can retract. Streaming plus strict post-validation is a
contradiction you have to resolve deliberately.

## Failure modes to handle up front

| Failure | Handling |
| --- | --- |
| Rate limit (429) | Exponential backoff with jitter; queue rather than drop |
| Overloaded / 5xx | Retry — but only idempotent calls, and cap the attempts |
| Timeout | Set one explicitly; long generations otherwise hang the request |
| Truncated output | Check the stop reason; `max_tokens` is a cutoff, not a target |
| Refusal | A valid response, not an error — handle it as a branch |

The stop reason is the most commonly ignored field in the response. A completion cut
off at `max_tokens` is not a shorter answer — it's an answer that stops mid-sentence,
and JSON parsed from it will fail in ways that look like model error.

## Cost controls that matter

- **Prompt caching.** Long stable prefixes (system prompt, tool definitions,
  retrieved corpus) can be cached by the provider at a large discount. Order the
  prompt so the stable part comes first, or caching can't apply.
- **Model routing.** Cheap models for classification and extraction, expensive ones
  for synthesis. Most pipelines have more of the former than they realise.
- **Cap output.** `max_tokens` set to what the task needs, not the model's maximum.
- **Log tokens per request** alongside latency. Cost regressions are silent otherwise.

## Keys and boundaries

API keys are server-side secrets. A key shipped in a frontend bundle is a public key
attached to a billing account. Calls go through your backend, which is also the only
place you can enforce per-user rate limits and log what was actually sent.
