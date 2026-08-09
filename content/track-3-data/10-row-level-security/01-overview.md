---
title: "Row-Level Security & Access Control"
description: "Enforcing \"who sees what\" at the database layer instead of hoping the app layer remembers to."
track: 3
chapter: 10
page: 1
readMinutes: 3
---

:::info[Prerequisites]
**Relational Schema Design** — policies are written against columns, and a tenant
column that isn't constrained or indexed makes for slow, unreliable rules.
:::

## Why this chapter exists

Application-layer authorization is a promise that every query, everywhere, remembers
to filter. It holds until someone adds an endpoint, a background job, an admin
script, or a report — and one of them writes a query without the `WHERE` clause.

The consequence is the top entry on the
[OWASP API Security list](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/):
broken object-level authorization, where changing one id in a URL returns someone
else's data. It's endemic because the code works perfectly when you test it as
yourself.

Row-level security moves the filter from the query to the table. Once a policy is
attached, every statement against that table — from any code path, any ORM, any
`psql` session — is silently rewritten to include it. The filter can no longer be
forgotten, because nobody is writing it.

| Filter lives in | Fails when |
| --- | --- |
| Each query | Any one query omits it |
| A shared helper / repository | Someone bypasses the helper |
| **A database policy** | The policy itself is wrong, or the connection carries the wrong identity |

That third row is the honest version: RLS doesn't remove the possibility of a
mistake, it reduces the number of places a mistake can be made from *every query*
to *one policy*. That's the whole value proposition, and it's a large one.

## What this is not

RLS is not a replacement for authorization in the application. The application
still decides what a request is allowed to *do* — which endpoints, which actions,
which roles — and still produces the useful `403`. What RLS changes is the
consequence of getting it wrong: a missing check returns zero rows instead of
everyone's.

Nor is it free. Every query against a protected table carries the policy expression
as an extra predicate, which has to be indexable, and getting the connection to
carry the right identity is a real piece of plumbing — particularly behind a
connection pooler. Both are covered here.

## What's in here

| Page | What it covers |
| --- | --- |
| Policies & Roles | How PostgreSQL RLS works — enabling it, `USING` versus `WITH CHECK`, permissive versus restrictive, and how identity reaches the session |
| Multi-Tenant Patterns | Isolation strategies, connection pooling, policy performance, and how to test that isolation actually holds |

## Where this connects

Track 2's **Authorization Models** ends by naming the database as the backstop for
when the application layer is wrong; this chapter is that backstop in detail. The
next chapter, **Object Storage & Microservices**, deals with the data RLS can't
protect — the bytes sitting in a bucket, where access control is a completely
different mechanism.

## References

- [PostgreSQL — Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [OWASP API Security Top 10 — Broken Object Level Authorization](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/)
