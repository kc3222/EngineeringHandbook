---
title: "Resources & Collections"
description: "Modelling nouns, structuring URLs, and designing collections that survive growth."
track: 2
chapter: 5
page: 2
readMinutes: 4
---

:::info[Prerequisites]
**REST API Design** — specifically the idea that URLs are contract, not implementation.
:::

## Resources are nouns the client cares about

A resource is a thing a client wants to address: an order, a user, a report. The
identifying question is *whose vocabulary is this?* If a name only makes sense to
someone who has seen your schema, it's the wrong name.

```text
POST /createOrder            ← RPC in a trench coat
POST /orders                 ← a resource

GET  /user_order_line_items  ← your join table
GET  /orders/1a2b/items      ← the client's mental model
```

Resources are not tables. One resource often spans several tables, and plenty of
tables should never be addressable at all. The mapping being 1:1 is a smell that
the schema is leaking through.

## URL structure

A workable convention, and it only needs to be a convention because HTTP itself
doesn't care:

```text
/orders                 collection
/orders/{id}            single resource
/orders/{id}/items      sub-collection scoped to a parent
/orders/{id}/items/{n}  single sub-resource
```

Plural collection names, identifiers in the path, no verbs, no file extensions, no
trailing slash inconsistency. Consistency matters more than which convention you
pick — mixed `/order/{id}` and `/users` in one API costs every reader a lookup.

**Nest one level, rarely two.** `/customers/7/orders/1a2b/items/3` forces clients to
know the whole ancestry to address a leaf. If a sub-resource has a globally unique
id, give it a top-level route too and use nesting only for the scoped-list case.

### Actions that aren't CRUD

Some operations genuinely aren't create/read/update/delete: cancelling, retrying,
publishing. Two defensible answers:

| Approach | Example | Tradeoff |
| --- | --- | --- |
| Model the state as a sub-resource | `PUT /orders/{id}/cancellation` | Stays resource-shaped; can feel contrived |
| Allow a namespaced action | `POST /orders/{id}:cancel` | Honest about intent; leaves the resource model |

Google's [API design guide](https://cloud.google.com/apis/design/custom_methods)
formalises the second as *custom methods* with a `:verb` suffix. Either is fine.
Inventing `POST /cancelOrder?id=...` is not — it discards the resource entirely.

## Designing collections that scale

A collection endpoint is the one clients hammer, and it's where naive designs fail
first. Four concerns, all of which belong in the query string:

```text
GET /orders?status=shipped&created_after=2026-01-01   filtering
          &sort=-created_at                            sorting
          &limit=50&cursor=eyJpZCI6...                 pagination
          &fields=id,total,status                      sparse fields
```

### Offset vs cursor pagination

Offset pagination is easier to build, supports jumping to page N, and degrades in
two ways: the database scans and throws away everything before the offset, and
concurrent writes shift rows across page boundaries so items get skipped or
duplicated.

Cursor (keyset) pagination encodes the sort key of the last row seen, so the query
becomes a seek instead of a scan and the window is stable under concurrent inserts.
The costs are real: no "jump to page 40", cursors must be treated as opaque by
clients, and the sort key has to be unique and stable — usually `(created_at, id)`
rather than `created_at` alone.

Pick offset for admin tables with page numbers and modest row counts; pick cursor
for anything a client iterates in full, anything with high write throughput, and
any feed. Whichever you pick, **cap `limit` server-side** — an uncapped page size
is a denial-of-service parameter.

### Envelope or not

```json
{
  "data": [ { "id": "1a2b", "total": 4200 } ],
  "next_cursor": "eyJpZCI6IjFhMmIifQ"
}
```

Wrapping list responses gives you somewhere to put pagination state and lets you
add metadata later without changing the array's type. A bare top-level array reads
more cleanly and can't grow. Choose once, apply everywhere — half-enveloped APIs
are the ones clients write two parsers for.

## What to take away

- Name resources in the client's vocabulary; a URL that mirrors your schema will outlive the schema and embarrass it.
- Nest sparingly. Deep hierarchies push your data model's ancestry onto every caller.
- Collections need filtering, sorting and pagination designed in from the start — retrofitting pagination is a breaking change.
- Cursor pagination is the default for anything large or write-heavy; offset is the convenience option, not the safe one.

## References

- [RFC 9110 §9 — HTTP method definitions](https://www.rfc-editor.org/rfc/rfc9110.html#name-methods)
- [Google Cloud API Design Guide — Resource names](https://cloud.google.com/apis/design/resource_names) and [Custom methods](https://cloud.google.com/apis/design/custom_methods)
- [Stripe API reference — pagination](https://docs.stripe.com/api/pagination) — a widely-copied cursor scheme, kept current with the API.
- [Use the Index, Luke — "Paging Through Results"](https://use-the-index-luke.com/no-offset) — why offset degrades, with the query plans.
