---
title: "Indexing & Query Plans"
description: "What an index can and can't do, why composite column order matters, and how to read EXPLAIN."
track: 3
chapter: 9
page: 4
readMinutes: 5
---

:::info[Prerequisites]
**Keys, Types & Constraints** — primary keys and unique constraints are already
indexes, and this page is about the ones you add on purpose.
:::

## What an index actually is

A B-tree index is a sorted copy of one or more columns plus a pointer back to the
row. That single sentence explains most index behaviour:

- It's **sorted**, so it answers equality and range lookups, and can supply an
  `ORDER BY` without a sort step.
- It's a **copy**, so every write has to update it. Five indexes means an insert
  does six writes.
- It **points back to the row**, so unless the index contains every column the
  query needs, there's still a heap fetch per matching row.

That last point sets the ceiling on how useful an index is. If a query matches
80% of the table, following 80% of the pointers is slower than just reading the
table in order — which is why the planner correctly chooses a sequential scan more
often than people expect, and why forcing an index there makes things worse.

## Composite indexes and the order of columns

An index on `(a, b, c)` is sorted by `a`, then within equal `a` by `b`, and so on.
Which means it can serve `WHERE a = ?`, and `WHERE a = ? AND b = ?`, but
historically not `WHERE b = ?` alone — the values of `b` are scattered through the
index in `a`-order. (PostgreSQL 18 added *skip scans*, which can use such an index
when the leading column has few distinct values, but a purpose-built index still
wins.)

The rule that follows: **equality columns first, then the range or sort column.**

```sql
-- Query: recent orders for one customer
select * from orders
where customer_id = $1 and created_at >= $2
order by created_at desc;

create index on orders (customer_id, created_at desc);   -- good
create index on orders (created_at desc, customer_id);   -- much worse
```

With `customer_id` leading, the index narrows to one customer and then walks a
contiguous, already-sorted range of dates — the `ORDER BY` is free. With the order
reversed, every date range has to be scanned and filtered for the customer.

**One well-chosen composite beats several single-column indexes.** PostgreSQL *can*
combine separate indexes via a bitmap scan, but it does so by building a bitmap of
matching pages first, which costs more than one index that was already sorted the
right way.

Two variants worth knowing:

**Partial indexes** index a subset, which makes them dramatically smaller when the
query always has the same filter:

```sql
create index on orders (created_at desc) where status = 'pending';
```

If 2% of orders are pending, this index is 2% of the size and stays hot in cache.

**Covering indexes** attach non-key columns so a query can be answered from the
index alone:

```sql
create index on orders (customer_id) include (status, total);
```

An **index-only scan** then skips the heap entirely — but only for pages the
visibility map marks all-visible, which is maintained by `VACUUM`. A table that is
heavily updated and rarely vacuumed will not get index-only scans no matter how you
index it.

## Index types beyond B-tree

| Type | Use for |
| --- | --- |
| **B-tree** | Default. Equality, ranges, sorting, uniqueness |
| **GIN** | Values containing many keys: `jsonb` containment, arrays, full-text search |
| **GiST** | Ranges, geometry, nearest-neighbour, and exclusion constraints |
| **BRIN** | Very large tables whose physical order correlates with the column — append-only time-series especially. Tiny index, approximate |

GIN is what makes `jsonb` queryable: `create index on events using gin (payload)`
supports `payload @> '{"type":"signup"}'`. The `jsonb_path_ops` operator class
builds a smaller, faster index if containment is the only operator you need.

For `LIKE`, a plain B-tree handles a prefix search (`'acme%'`) only under the `C`
collation or with the `text_pattern_ops` operator class. Infix search (`'%acme%'`)
needs a trigram index from the `pg_trgm` extension.

## Reading `EXPLAIN`

`EXPLAIN` shows the planner's intended plan; `EXPLAIN ANALYZE` runs the query and
shows what actually happened. Always use the second, and add `BUFFERS` to see how
much of the work was cache versus disk (PostgreSQL 18 includes it by default).

```sql
explain (analyze, buffers)
select * from orders where customer_id = 42 and created_at >= now() - interval '7 days';
```

You are looking for three things, in this order:

**1. Estimated versus actual rows.** `(rows=12 ... actual rows=48000)` is the single
most informative line in any plan. The planner chose a strategy suited to 12 rows
and got 48,000, so everything downstream is wrong. Causes are stale statistics
(fix: `ANALYZE`) or correlated columns the planner assumes are independent — a
`city` and `postcode` filter multiplies two selectivities that aren't independent
at all. `CREATE STATISTICS` teaches it about the correlation.

**2. The scan node.** `Seq Scan` on a large table with a selective filter means no
usable index — or an index that can't be used because the column is wrapped in a
function. `WHERE date(created_at) = '2026-01-01'` will not use an index on
`created_at`; either rewrite it as a range, or index the expression:
`create index on orders (date(created_at))`.

**3. The join strategy.** Nested loop is right for a small outer side, hash join for
larger unsorted inputs, merge join for pre-sorted ones. A nested loop over an outer
side the planner underestimated is the classic reason a query that ran in 20ms last
month now takes 40 seconds — which loops back to point 1. The plan node is rarely
the root cause; the row estimate is.

## Practical notes

- **Foreign key columns are not indexed automatically.** PostgreSQL requires a unique index on the *referenced* side and creates nothing on the *referencing* side. The consequence shows up as a slow `DELETE` on the parent, because every child table is scanned to check the constraint. Index every FK column you ever delete or join against.
- **Every index is a write tax.** Also a maintenance one: updating an indexed column prevents the heap-only-tuple optimisation, so it costs more than updating an unindexed one.
- **Find the indexes nobody uses.** `pg_stat_user_indexes.idx_scan` counts scans since the last stats reset. Long-lived zeroes are pure cost — but check every environment before dropping, since a nightly job may be the only user.
- **Build without blocking.** `CREATE INDEX` takes a lock that blocks writes. `CREATE INDEX CONCURRENTLY` doesn't, at the cost of two table passes and an inability to run inside a transaction block. It can also fail and leave an `INVALID` index behind, which must be dropped and rebuilt — so check `pg_index.indisvalid` afterwards.
- **Index for the queries you have.** Log slow queries (`log_min_duration_statement`) or install `pg_stat_statements` and index against that list, rather than against a guess about which columns look important.

## What to take away

- An index is a sorted copy with a pointer back — that explains its strengths, its write cost, and why a sequential scan is often correct.
- In a composite index, equality columns come first and the range or sort column last. Order is not a detail.
- Partial and covering indexes are the two cheapest wins available once the basic index exists.
- In `EXPLAIN ANALYZE`, compare estimated to actual rows first. Almost every catastrophic plan is a bad estimate, not a bad planner.
- Index foreign keys yourself, and build with `CONCURRENTLY` on anything live.

## References

- [PostgreSQL — Indexes](https://www.postgresql.org/docs/current/indexes.html), including [multicolumn](https://www.postgresql.org/docs/current/indexes-multicolumn.html), [partial](https://www.postgresql.org/docs/current/indexes-partial.html) and [index-only scans](https://www.postgresql.org/docs/current/indexes-index-only-scans.html)
- [PostgreSQL — Using `EXPLAIN`](https://www.postgresql.org/docs/current/using-explain.html) and [Extended Statistics](https://www.postgresql.org/docs/current/planner-stats.html#PLANNER-STATS-EXTENDED)
- [PostgreSQL — `CREATE INDEX`](https://www.postgresql.org/docs/current/sql-createindex.html) for `CONCURRENTLY` and `INCLUDE`
- [PostgreSQL — `pg_stat_statements`](https://www.postgresql.org/docs/current/pgstatstatements.html)
