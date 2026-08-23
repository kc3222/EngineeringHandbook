---
title: "Policies & Roles"
description: "Enabling RLS, USING versus WITH CHECK, permissive versus restrictive, and getting identity into the session."
track: 3
chapter: 2
page: 2
readMinutes: 5
---

:::info[Prerequisites]
**Overview** of this chapter, and comfort with PostgreSQL roles and `GRANT`.
:::

## Enabling it is a default-deny switch

```sql
alter table documents enable row level security;
```

From that moment the table returns **no rows to anyone** except the table owner and
superusers — there are no policies yet, and the absence of a policy is a denial, not
a pass. This is the right default and it is also how people lock themselves out of
their own application on a Friday afternoon. Enable RLS and add the first policy in
the same migration.

Two exemptions matter:

- **The table owner bypasses RLS** unless you also `ALTER TABLE documents FORCE ROW
  LEVEL SECURITY`. Since applications frequently connect as the owner of the tables
  they created, this is the single most common reason RLS appears to "not work".
- **Superusers and roles with `BYPASSRLS` always bypass**, and `FORCE` does not
  change that. Your migration user and your admin tooling should be such a role;
  your application user must not be.

RLS also composes with, rather than replaces, `GRANT`. A role still needs `SELECT`
privilege on the table; the policy then narrows *which rows* that privilege reaches.
Both have to be right.

## `USING` and `WITH CHECK`

A policy carries up to two expressions, and the split is the part worth learning
precisely:

- **`USING`** is applied to rows that already exist — it decides what `SELECT`,
  `UPDATE` and `DELETE` can *see*. Rows failing it aren't errors; they're simply
  not there.
- **`WITH CHECK`** is applied to rows being written — it decides what `INSERT` and
  `UPDATE` may *produce*. A row failing it raises an error.

```sql
create policy documents_owner on documents
    for all
    to application_user
    using       (owner_id = current_setting('app.user_id')::uuid)
    with check  (owner_id = current_setting('app.user_id')::uuid);
```

| Command | `USING` | `WITH CHECK` |
| --- | --- | --- |
| `SELECT` | Which rows are visible | — |
| `INSERT` | — | Whether the new row is allowed |
| `UPDATE` | Which rows may be updated | What the updated row may become |
| `DELETE` | Which rows may be deleted | — |

Omitting `WITH CHECK` on an `UPDATE` policy makes PostgreSQL reuse `USING` for both,
which is usually what you want. Writing `USING` alone on a policy that covers
`INSERT`, though, means new rows are unconstrained — and a user who can insert a row
with someone else's `owner_id` has defeated the policy from the other direction.
That's the classic RLS hole: careful about reads, silent about writes.

## Permissive and restrictive

Multiple policies can apply to one table, and how they combine depends on their
kind:

- **Permissive** (the default) policies are **OR**-ed. Each one grants additional
  access.
- **Restrictive** (`AS RESTRICTIVE`) policies are **AND**-ed with the result. Each
  one removes access.

At least one permissive policy must pass, and every restrictive policy must pass.

```sql
-- Grant: you see your own documents…
create policy own_documents on documents
    for select to application_user
    using (owner_id = current_setting('app.user_id')::uuid);

-- …or documents shared with your team.
create policy team_documents on documents
    for select to application_user
    using (team_id = any (current_team_ids()));

-- Regardless: never soft-deleted rows.
create policy hide_deleted on documents
    as restrictive for select to application_user
    using (deleted_at is null);
```

Modelling grants as several small permissive policies is much easier to review than
one large boolean expression, and restrictive policies are the way to express a rule
that must hold no matter which grant matched.

## Getting identity into the session

A policy is only as good as whatever it compares against. There are two ways to
give the database an identity, and they have different threat models.

**Database roles.** Each application user maps to a PostgreSQL role, and policies
compare against `current_user`. Genuinely enforced by the database and impossible
for the application to spoof — but roles are cluster-wide objects, so this fits
tens or hundreds of users, not millions, and every signup becomes a DDL statement.

**Session settings.** The application sets a custom GUC after opening the
transaction, and policies read it:

```sql
begin;
set local app.user_id = '3f2b…';   -- SET LOCAL, not SET
select * from documents;           -- policy filters using the value
commit;
```

This scales to any number of users and is what most applications do. Note carefully
what it assumes: the application is trusted to set the value honestly, from a
verified token — never from a header or request body the client controls. RLS is
protecting you from *your own missing `WHERE` clauses*, not from a compromised
application server.

`SET LOCAL` rather than `SET` is not optional. `SET` persists for the whole session,
and behind a transaction-mode connection pooler that session is handed to the next
request — meaning one user's identity can be read by another user's query.
`SET LOCAL` is scoped to the transaction and reset at commit. This is covered
further in **Multi-Tenant Patterns**.

Read the setting with the two-argument form, `current_setting('app.user_id', true)`,
which returns `NULL` instead of erroring when the value was never set. Then make
sure your policy treats `NULL` as *deny*, because `owner_id = NULL` is `NULL`, which
is not `true` — that happens to fail closed, but rely on it deliberately rather than
by luck.

**Hosted variants.** Supabase builds on exactly this mechanism: the verified JWT is
placed in a session setting, and `auth.uid()` is a helper that reads a claim out of
it. The `anon` and `authenticated` roles are ordinary PostgreSQL roles you write
`TO` in policies, and `service_role` is a `BYPASSRLS` role for server-side work —
which is why leaking that key is equivalent to publishing the database.

## Practical notes

- **Name the role in `TO`.** A policy with no `TO` clause applies to everyone, and is evaluated even for roles that should never touch the table. Scoping it is both clearer and faster.
- **RLS doesn't apply to foreign key checks.** Referential integrity is verified with the table owner's rights, so an FK violation can reveal that a row you cannot see exists. Unique constraint violations leak the same way. PostgreSQL documents these as covert channels; they matter when the *existence* of a row is itself sensitive.
- **Non-`LEAKPROOF` functions are not pushed below the policy.** PostgreSQL refuses to evaluate an arbitrary user function before the security filter, since it could otherwise be handed rows it shouldn't see. The effect is that some queries are slower under RLS than the same query with a hand-written `WHERE` — that's the feature working.
- **Views run as their owner by default.** A view over a protected table can therefore bypass its policies. Use `security_invoker = true` (PostgreSQL 15+) so the view is evaluated with the querying user's rights.
- **`\d+ documents` in `psql`** lists the policies on a table. Make reading it a step in reviewing any migration that touches a protected table.

## What to take away

- Enabling RLS denies everything by default, the owner is exempt until you add `FORCE`, and `BYPASSRLS` roles always win.
- `USING` governs rows that exist, `WITH CHECK` governs rows being written. A policy without `WITH CHECK` on insert paths is the standard hole.
- Permissive policies OR together and restrictive ones AND — small named policies beat one large expression.
- Identity arrives as a database role (strong, doesn't scale) or a session setting (scales, trusts the application). With a pooler, `SET LOCAL` inside a transaction is mandatory.

## References

- [PostgreSQL — Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html), including the note on covert channels
- [PostgreSQL — `CREATE POLICY`](https://www.postgresql.org/docs/current/sql-createpolicy.html) and [`ALTER TABLE ... FORCE ROW LEVEL SECURITY`](https://www.postgresql.org/docs/current/sql-altertable.html)
- [PostgreSQL — `CREATE VIEW`, `security_invoker`](https://www.postgresql.org/docs/current/sql-createview.html)
- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
