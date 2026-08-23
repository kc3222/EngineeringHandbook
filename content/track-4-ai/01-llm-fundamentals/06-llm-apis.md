---
title: "LLM APIs"
description: "Messages, roles, streaming, and the shape of a production call."
track: 4
chapter: 1
page: 6
readMinutes: 5
---

:::info[Prerequisites]
**Tokens & Context Windows** — the request body is where the budget gets spent.
:::

## The request shape

Providers differ in details, but the modern shape is the same everywhere: a system
instruction, an ordered list of messages with roles, and generation parameters.

```python
# One provider's SDK; the structure is near-identical across vendors
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

The API is **stateless**. There is no session on the server: continuity exists only
because you resend the transcript. Every architectural consequence in this chapter —
cost growth per turn, context management, prompt caching — follows from that one fact.

Two other request-level features are worth knowing before you need them:

**Tool use.** You supply a list of tool definitions — name, description, JSON Schema
for arguments — and the model may respond with a structured request to call one instead
of with text. Your code executes it and appends the result as another message. The model
never acts; it only asks. That loop is the entire basis of **Prompting & AI Coding
Agents**, and the security properties that come with it.

**Structured outputs.** A response schema constrains generation so the output is
guaranteed to parse. Where available this replaces "ask for JSON, then regex, then
retry" with an actual guarantee, and it's usually a one-line change.

## Streaming

Streaming returns tokens as they're generated. It doesn't make generation faster —
it makes *time to first token* the number the user experiences instead of total
latency. For anything conversational, that difference dominates perceived quality, and
it is almost always the single largest perceived-performance win available.

Streaming also matters for a mundane reason: long generations on a non-streaming
request can exceed HTTP client timeouts. Any call with a large `max_tokens` should
stream regardless of whether a human is watching.

The tradeoff is that you're committed to output you haven't finished validating. If
a response must be schema-valid or pass a safety check before display, either buffer
it or stream into a UI that can retract. Streaming plus strict post-validation is a
contradiction you have to resolve deliberately.

## Failure modes to handle up front

| Failure | Handling |
| --- | --- |
| Rate limit (429) | Exponential backoff with jitter; respect `retry-after`; queue rather than drop |
| Overloaded / 5xx | Retry — but only idempotent calls, and cap the attempts |
| Timeout | Set one explicitly; long generations otherwise hang the request |
| Truncated output | Check the stop reason; `max_tokens` is a cutoff, not a target |
| Refusal | A valid response, not an error — handle it as a branch |
| Content filter | Same: a successful HTTP response you have to branch on |

The stop reason is the most commonly ignored field in the response. A completion cut
off at `max_tokens` is not a shorter answer — it's an answer that stops mid-sentence,
and JSON parsed from it will fail in ways that look like model error.

Two of these deserve emphasis because they break the habits from ordinary API work.
**A refusal is an HTTP 200.** Code that only inspects the status code and then reads
`content[0]` will crash or produce nonsense on a refusal. Branch on the stop reason
before touching the content. And **rate limits are usually two-dimensional** — requests
per minute *and* tokens per minute — so a workload that stays under the request limit
can still be throttled by a few very large prompts. Most SDKs retry 429s and 5xx
automatically with backoff; know whether yours does before writing a second retry layer
on top of it.

## Cost controls that matter

- **Prompt caching.** Long stable prefixes (system prompt, tool definitions, retrieved corpus) can be cached by the provider at a large discount on repeat reads. Order the prompt so the stable part comes first; caching is prefix-based, so a timestamp or request ID near the top invalidates everything after it. Verify it's working by reading the cache-hit fields in the usage object — a silent miss looks exactly like a cache you never enabled.
- **Model routing.** Cheap models for classification, extraction, and routing; expensive ones for synthesis. Most pipelines have more of the former than they realise.
- **Batch endpoints.** For work that isn't latency-sensitive — bulk classification, backfills, evaluation runs — asynchronous batch APIs are typically offered at around half price. This is free money for offline pipelines.
- **Cap output.** `max_tokens` set to what the task needs, not the model's maximum.
- **Log tokens per request** alongside latency. Cost regressions are silent otherwise.

## Observability

An LLM call is a non-deterministic dependency with a variable price, which makes it
unlike most things in your service. The fields worth recording on every call, from the
first day:

- Model **and version**, not just the alias.
- Input, output, and cached token counts from the usage object.
- Latency, split into time-to-first-token and total where you stream.
- Stop reason.
- A request identifier from the provider — it's what support will ask for.
- Enough of the prompt to reproduce the call, subject to your data-retention policy.

That last one is a genuine tension: reproducing a bad answer requires the prompt, and
prompts contain user data. Decide the retention and redaction rules deliberately rather
than discovering them during an incident. Track 6's **Monitoring & Incident Response**
covers the general practice.

## Keys and boundaries

API keys are server-side secrets. A key shipped in a frontend bundle is a public key
attached to a billing account, and scrapers find them quickly. Calls go through your
backend, which is also the only place you can enforce per-user rate limits, apply
spending caps, and log what was actually sent.

That backend is a normal service and deserves normal treatment: authenticate the caller,
rate-limit per user rather than per key, set a hard spend ceiling, and validate inputs
before they become part of a prompt. The auth patterns in Track 2's **Authentication &
Authorization** apply unchanged.

## What to take away

- The API is stateless; you resend the whole conversation every turn, and everything about cost and context follows from that.
- Stream anything long — for perceived latency, and to avoid client timeouts.
- Read the stop reason. Refusals and truncations arrive as successful responses.
- Order prompts stable-first so provider caching applies, and verify hits in the usage fields.
- Use batch endpoints for offline work and cheap models for routing and extraction.
- Log model version, token counts, latency, and stop reason from day one.
- Keys live server-side, behind a service that enforces per-user limits and spend caps.

## References

- [Anthropic — Messages API](https://platform.claude.com/docs/en/api/messages) · [streaming](https://platform.claude.com/docs/en/build-with-claude/streaming) · [prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) · [errors](https://platform.claude.com/docs/en/api/errors)
- [OpenAI — API reference](https://platform.openai.com/docs/api-reference) · [batch API](https://platform.openai.com/docs/guides/batch) · [rate limits](https://platform.openai.com/docs/guides/rate-limits)
- [Google — Gemini API reference](https://ai.google.dev/api)
- [RFC 6585 §4](https://www.rfc-editor.org/rfc/rfc6585#section-4) — `429 Too Many Requests` — and [RFC 9110 §10.2.3](https://www.rfc-editor.org/rfc/rfc9110#field.retry-after) — the `Retry-After` header
