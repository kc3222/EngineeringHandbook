---
title: "Modelling & Normalization"
description: "Turning a domain into tables, how far to normalize, and when denormalizing is actually the right call."
track: 3
chapter: 9
page: 2
readMinutes: 5
---

:::info[Prerequisites]
**Overview** of this chapter. Familiarity with `SELECT`/`JOIN` is assumed.
:::

## Start from the facts, not the screens

The common failure is modelling the UI: a `dashboard` table because there's a
dashboard page, an `order_summary` table because there's a summary card. Screens
change quarterly. The facts they display — an order was placed, by a customer, for
some products, on a date — don't.

A workable first pass is to write the domain out as sentences and read the nouns
and the verbs:

> A **customer** places an **order**. An order contains one or more **line items**,
> each referring to a **product** at a **price at the time of purchase**.

Nouns become tables. Verbs become foreign keys, or — when the verb carries its own
attributes — tables of their own. `line_items` exists because "contains" has data
attached to it: quantity, and the price *as it was that day*.

That last detail is the one people miss. `line_items.unit_price` is not a
duplicate of `products.price`; it's a different fact. The product's price is what
it costs now, the line item's is what it cost then. Joining to `products` for a
historical invoice silently rewrites history every time the catalogue changes.

## Normalization, in the only three forms that matter day to day

Normalization is one idea stated in stages: **each fact should be recorded exactly
once**. The formal forms are worth knowing as vocabulary, but you can arrive at
them by asking "if this fact changes, how many rows do I update?"

| Form | Rule | Violation looks like |
| --- | --- | --- |
| **1NF** | One value per column; no repeating groups | `phone_numbers` holding `"555-1234, 555-9876"` |
| **2NF** | Non-key columns depend on the *whole* key | In `(order_id, product_id)`, a `product_name` column depending only on `product_id` |
| **3NF** | Non-key columns depend on *nothing but* the key | `customer_city` and `customer_postcode` on `orders`, where postcode determines city |

Above 3NF (BCNF, 4NF, 5NF) there are real anomalies being addressed, but they're
rare enough in ordinary application schemas that reaching for them usually signals
the model is wrong in a more basic way.

**Why it's the default:** an un-normalized schema has update anomalies. Store a
customer's address on every order and a customer who moves has an address that is
now both old and new depending on which row you read — and no way to tell which
was intended.

## When to denormalize deliberately

Normalization optimises for correct writes. Sometimes reads matter more, and then
duplication is a legitimate, *deliberate* choice — the distinction is between
duplication you chose and duplication you drifted into.

Reasonable cases:

- **Point-in-time snapshots.** The `unit_price` example above. Not really
  denormalization: it's a distinct fact that happens to look like a copy.
- **Counters and aggregates.** `posts.comment_count` instead of `COUNT(*)` on every
  render. Cheap read, and the cost is keeping it accurate.
- **Materialized views.** PostgreSQL's `MATERIALIZED VIEW` gives you a cached query
  result you refresh explicitly — denormalization with the derivation still written
  down in SQL, which is much easier to reason about than a hand-maintained column.

The rule that keeps this honest: **derived data needs a defined refresh path**. A
counter maintained by a trigger, a view with a scheduled `REFRESH MATERIALIZED VIEW
CONCURRENTLY`, an aggregate rebuilt by a nightly job — any of these is fine. A
counter updated by whichever application code paths happened to remember is how you
end up with a post showing 12 comments and a page listing 9.

Denormalize when you've measured a read problem, not when you anticipate one.
Postgres joins on indexed keys are fast, and "we'll need this later for
performance" is the reasoning behind most of the inconsistent columns you'll ever
have to repair.

## Relationships and the shapes they take

**One-to-many** is a foreign key on the many side. `line_items.order_id`. There is
no other correct answer.

**Many-to-many** is a join table, and the join table deserves its own primary key
design thought:

```sql
create table order_tags (
    order_id  uuid not null references orders (id) on delete cascade,
    tag_id    uuid not null references tags (id)   on delete restrict,
    tagged_at timestamptz not null default now(),
    primary key (order_id, tag_id)
);
```

The composite primary key is what makes "the same tag twice on one order"
impossible. Adding a surrogate `id` column *instead* of it — a habit some ORMs
encourage — removes that guarantee and gains nothing.

Note the two different `ON DELETE` choices. Deleting an order should take its tag
links with it (`CASCADE`); deleting a tag that's still in use should fail
(`RESTRICT`). These aren't stylistic — they encode what the business means by
"delete", and getting them backwards is how a routine cleanup removes production
data.

**One-to-one** is usually a sign that two tables should be one. The legitimate
uses are optional detail with a different lifetime, or splitting off a wide
rarely-read column set (a large `text` blob) so the main table's rows stay narrow.

## Inheritance and polymorphism

The awkward case: several kinds of thing that are mostly alike. Three approaches,
none free.

| Approach | Shape | Cost |
| --- | --- | --- |
| **Single table** | One table, nullable columns for kind-specific fields, a `type` discriminator | Can't use `NOT NULL` on anything kind-specific; wide sparse rows |
| **Table per type** | `individual_customers`, `business_customers` | Every "all customers" query is a `UNION`; no single FK target |
| **Shared + specific** | `customers` with the common columns, plus a detail table per kind | Correct and complete, at the cost of a join and enforcing that exactly one detail row exists |

Single table is the pragmatic default for two or three kinds that differ by a few
columns; it stops scaling when the nullable columns outnumber the shared ones.

Polymorphic *associations* — one `comments` table pointing at either posts or
photos via `(commentable_type, commentable_id)` — are the version to be most wary
of, because you cannot put a foreign key on that pair. The database can no longer
tell you the reference is valid, which is precisely the guarantee you came to a
relational database for. Two nullable FK columns with a check that exactly one is
set is uglier and actually enforced:

```sql
alter table comments add constraint one_parent check (
    (post_id is not null)::int + (photo_id is not null)::int = 1
);
```

## What to take away

- Model the durable facts of the domain, not the current screens; write the domain as sentences and read off the nouns and verbs.
- Normalize to 3NF by default — one fact, one place — because the alternative is rows that disagree with each other.
- Denormalize on measurement, and only with a defined refresh path. A snapshot column like `unit_price` isn't denormalization at all.
- Composite primary keys on join tables, and `ON DELETE` rules chosen to mean what the business means.
- Avoid polymorphic FK columns: they trade away referential integrity, which is the main reason to be here.

## References

- [PostgreSQL — Data Definition](https://www.postgresql.org/docs/current/ddl.html) and [Materialized Views](https://www.postgresql.org/docs/current/rules-materializedviews.html)
- [PostgreSQL — `CREATE TABLE`, foreign key actions](https://www.postgresql.org/docs/current/sql-createtable.html#SQL-CREATETABLE-REFERENCES)
- [ISO/IEC 9075 — SQL standard](https://www.iso.org/standard/76583.html) — the normative definition of SQL; useful mainly for settling what is standard versus PostgreSQL-specific.
