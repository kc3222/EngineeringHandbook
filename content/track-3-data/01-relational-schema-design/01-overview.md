---
title: "Relational Schema Design"
description: "PostgreSQL modeling, normalization, and the migrations that come back to bite you later."
track: 3
chapter: 1
page: 1
readMinutes: 3
---

:::info[Prerequisites]
None. This is the first chapter of the track — start here if you're starting anywhere.
:::

## Why this chapter exists

A schema is the longest-lived artefact in most systems. Application code gets
rewritten, services get split, the API gets a `v2` — and the tables underneath
survive all of it, because the data in them is the thing the business actually
owns. Code can be deleted. Rows have to be migrated.

That asymmetry has a practical consequence: a schema mistake is discovered late
and paid for slowly. A missing constraint doesn't fail loudly on the day it's
written; it produces a small number of impossible rows every week until, two years
later, someone finds 40,000 orders with no customer and no way to reconstruct which
customer they belonged to.

| Cheap to change | Expensive to change |
| --- | --- |
| Query text | Table structure holding live data |
| Indexes | Primary key type |
| Views, functions | The meaning of an existing column |
| Column *added* | Column *split*, merged, or re-typed |

The right-hand column is expensive not because `ALTER TABLE` is hard to type but
because the data already in the table has to be interpreted, and every reader and
writer of it has to change at the same time.

## The database is a place to enforce truth, not just store rows

The recurring theme of this chapter: constraints in the database are not
bureaucracy, they're the only guarantee that survives a bug in the application.

Application-layer validation runs when the application remembers to run it. A
`CHECK` constraint runs for every writer — the API, the batch job, the migration
script, the engineer with a `psql` session at 2am. There's exactly one layer where
"this can never happen" is actually true, and this is it.

## What's in here

| Page | What it covers |
| --- | --- |
| Modelling & Normalization | Turning a domain into tables, how far to normalize, and when denormalizing is the right call |
| Keys, Types & Constraints | Identifiers, the PostgreSQL types worth defaulting to, and constraints as invariants |
| Indexing & Query Plans | What an index can and can't do, composite column order, and reading `EXPLAIN` |
| Migrations Without Downtime | Locks, backfills, and the expand/contract pattern for changes that can't be atomic |

## Where this connects

**Row-Level Security & Access Control** is the next chapter, and it builds directly
on the schema designed here — a tenant column with no index and no constraint makes
for slow, unreliable policies. **Object Storage & Microservices** covers the data
that doesn't belong in a table at all.

Backwards, Track 2's **Persistence & Transactions** approaches the same database
from the ORM's side. That page is about what Hibernate does to your schema; this
chapter is about the schema being right in the first place.

## References

- [PostgreSQL documentation — Data Definition](https://www.postgresql.org/docs/current/ddl.html) — the primary reference for everything in this chapter; `current` always resolves to the latest stable release.
- [PostgreSQL — Server Administration and Performance Tips](https://www.postgresql.org/docs/current/performance-tips.html)
