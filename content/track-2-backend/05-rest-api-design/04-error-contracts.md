---
title: "Error Contracts"
description: "RFC 9457 problem details, and treating failure responses as designed API surface."
track: 2
chapter: 5
page: 4
readMinutes: 4
---

:::info[Prerequisites]
**HTTP Semantics** — the status code is half the error contract; this page is the other half.
:::

## Errors are API surface

Successful responses get schemas, examples and review. Error responses get whatever
the framework's default exception handler emits — which is why one API can return
four different error shapes depending on which layer failed:

```json
{"error": "not found"}
{"message": "Validation failed", "errors": ["email"]}
{"detail": "Internal Server Error"}
{"timestamp": "…", "status": 500, "path": "/orders", "trace": "java.lang.NullPointer…"}
```

Every one of those forces the client to write another branch. And clients that can't
parse errors reliably do the predictable thing: they match on substrings of the
message, and your next copy-edit becomes a breaking change.

## RFC 9457: the format you don't have to invent

[RFC 9457, *Problem Details for HTTP APIs*](https://www.rfc-editor.org/rfc/rfc9457.html)
(July 2023, obsoleting RFC 7807) defines a standard body served as
`application/problem+json`:

```http
HTTP/1.1 409 Conflict
Content-Type: application/problem+json

{
  "type":     "https://api.example.com/problems/insufficient-funds",
  "title":    "Insufficient funds",
  "status":   409,
  "detail":   "Account 8812 has a balance of 30.00 EUR; the transfer requires 50.00 EUR.",
  "instance": "/transfers/9f21",
  "balance":  "30.00",
  "required": "50.00"
}
```

The field roles are what make it work:

| Field | Audience | Rule |
| --- | --- | --- |
| `type` | Code | A URI identifying the error *kind*. This is the stable key clients branch on. |
| `title` | Humans | Short, fixed summary for a given `type`. Don't vary it per occurrence. |
| `status` | Both | Mirrors the HTTP status code — must agree with it. |
| `detail` | Humans | Specific to *this* occurrence. Never meant to be parsed. |
| `instance` | Both | Identifies the specific occurrence — the request, or a log correlation id. |
| *extensions* | Code | Any extra members you need, like `balance` above |

The important discipline is the `type`/`detail` split: **machines read `type`, humans
read `detail`.** Once clients switch on `type`, you can rewrite every message without
breaking anyone. RFC 9457 also added a
[registry of common problem types](https://www.iana.org/assignments/http-problem-types/),
so genuinely generic conditions don't need bespoke URIs.

## Validation errors need structure

The most common error is "several fields are wrong", and a flat string can't express
it. Use an extension member, and give each entry a machine key:

```json
{
  "type": "https://api.example.com/problems/validation-failed",
  "title": "Request validation failed",
  "status": 422,
  "detail": "2 fields were rejected.",
  "errors": [
    {"field": "email",    "code": "format",   "detail": "Not a valid address."},
    {"field": "quantity", "code": "min_value","detail": "Must be at least 1."}
  ]
}
```

Return **all** failures, not the first. A client that has to round-trip once per bad
field turns one form submission into six requests, and the user fixes their form one
error at a time.

## Deciding what the client should do

The point of an error taxonomy is that the client can act without reading prose:

| Condition | Status | What the client should do |
| --- | --- | --- |
| Unparseable request | `400` | Fix the request; don't retry |
| Valid shape, bad values | `422` | Fix the fields; don't retry |
| No credentials | `401` | Authenticate, then retry |
| Credentials, no rights | `403` | Don't retry |
| State conflict | `409` | Re-read, then retry |
| Rate limited | `429` | Back off per `Retry-After` |
| Transient server fault | `503` | Retry with backoff |
| Server bug | `500` | Don't retry; page someone |

Retryability is the axis clients care about most. Say it explicitly: document which
`type` values are safe to retry, and pair `429` and `503` with `Retry-After` so the
client doesn't have to guess a backoff schedule.

## What not to put in an error body

- **Stack traces and SQL.** They describe your internals to anyone who can send a malformed request. Log them; return a correlation id.
- **Whether a record exists**, when the caller isn't allowed to know. `403` vs `404` leaks membership; pick one and use it consistently for hidden resources.
- **Anything that varies without a version bump.** If a message can change freely, clients must not be able to depend on it — which means giving them `type` to depend on instead.

The correlation id is the piece that makes all of this operable: put the same value
in `instance` and in your logs, and a support ticket becomes one log query instead of
a timestamp-range hunt.

## What to take away

- Design error responses once, centrally, and make every layer emit that one shape.
- Adopt RFC 9457 rather than inventing a format — it's a spec, a media type and a registry you get for free.
- `type` is the contract; `title` and `detail` are prose and must stay free to change.
- Return every validation failure at once, and tell clients which errors are retryable.

## References

- [RFC 9457 — Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457.html) (obsoletes [RFC 7807](https://www.rfc-editor.org/rfc/rfc7807.html))
- [IANA HTTP Problem Types registry](https://www.iana.org/assignments/http-problem-types/)
- [RFC 9110 §15.5 — 4xx client error](https://www.rfc-editor.org/rfc/rfc9110.html#name-client-error-4xx) and [§10.2.3 Retry-After](https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after)
- [Spring Framework — `ProblemDetail`](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-ann-rest-exceptions.html) — RFC 9457 support built into Spring 6.
