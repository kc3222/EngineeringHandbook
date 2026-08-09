---
title: "Authorization Models"
description: "RBAC, ABAC and ReBAC — and where in the stack the check actually belongs."
track: 2
chapter: 8
page: 5
readMinutes: 5
---

:::info[Prerequisites]
**JWTs in Practice** — authentication is finished; this page starts where it stops.
:::

## Three models, increasing in power and cost

| Model | Decides on | Example |
| --- | --- | --- |
| **RBAC** — role-based | subject → role → permission | Editors may publish articles |
| **ABAC** — attribute-based | attributes of subject, resource, action, context | A manager may approve an expense under €5,000 in their own region |
| **ReBAC** — relationship-based | a graph of relationships between subjects and objects | You may edit this document because you're an editor of a folder it lives in |

**RBAC** is the default and covers most applications. Roles are coarse and readable,
and "who can do what" is a table someone non-technical can review. It degrades when
permissions start depending on the specific object — the moment you find yourself
inventing `editor_of_marketing_docs_eu`, the model has run out.

**ABAC** evaluates a policy over attributes, so rules can depend on data rather than
labels. Vastly more expressive; harder to answer "who can access X?" because the
answer requires evaluating every policy against every subject.

**ReBAC** models permission as reachability in a graph, which is the natural fit for
sharing and nesting — documents in folders, repositories in organisations. Google's
[Zanzibar paper](https://research.google/pubs/pub48190/) is the reference design, and
[OpenFGA](https://openfga.dev/) and SpiceDB are open implementations of it.

Start with RBAC. Move when a specific requirement — object-level sharing, inherited
permissions, contextual limits — can't be expressed, not in anticipation of one.

## Where the check goes

More consequential than which model you pick. Enforcement happens at one or more
layers, and the depth determines what a bug can cost.

| Layer | Question it can answer |
| --- | --- |
| API gateway | Is this token valid? Does it carry this scope? |
| Controller / route | Does this user have the admin role? |
| **Service** | **Does *this* user own *this* order?** |
| Database RLS | The backstop — rows are filtered no matter who asks |

The service layer is where the vulnerabilities are. Route-level checks answer "may
this *kind* of user call this endpoint" — they cannot answer "may this *particular*
user touch this *particular* record", because the record id only exists at request
time.

```python
@router.get("/orders/{order_id}")
def get_order(order_id: UUID, user: CurrentUser, db: DbSession) -> OrderResponse:
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(404)
    if order.customer_id != user.id and not user.is_admin:   # ← the check that matters
        raise HTTPException(404)                             # 404, not 403 — see below
    return OrderResponse.model_validate(order)
```

Omitting those two lines produces
[Broken Object Level Authorization](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/) —
API #1 on the OWASP list. It's endemic because the endpoint works perfectly in testing:
you're logged in, you fetch your own order, everything is fine. Changing one id in the
URL is the entire exploit.

**`403` or `404`?** If the caller shouldn't know the resource exists, return `404` —
`403` confirms existence, which leaks the membership of a collection. Use `403` when
existence isn't sensitive and a clear error is more useful.

## Making the check impossible to forget

Relying on every developer remembering an `if` is the failure mode itself. Three
structural fixes, in increasing order of strength:

**1. Scope the query, don't filter after it.**

```python
# Fragile — fetch, then check
order = db.get(Order, order_id)
if order.customer_id != user.id: raise HTTPException(404)

# Robust — the query cannot return someone else's row
order = db.scalar(
    select(Order).where(Order.id == order_id, Order.customer_id == user.id)
)
if order is None: raise HTTPException(404)
```

The second form has no path that returns unauthorised data, so there is no check to
forget. This one change removes most object-level bugs.

**2. Centralise the decision.** One `can(user, action, resource)` function, or a policy
engine like [OPA](https://www.openpolicyagent.org/)/Cedar, so authorization logic is
reviewable in one place rather than scattered across handlers. Scattered checks drift;
a centralised one can be tested exhaustively.

**3. Enforce in the database.** PostgreSQL row-level security filters rows regardless
of what the application asks for, so a missing check in a handler returns nothing
instead of everything. It's the only layer that holds when the application layer is
wrong — which is the assumption worth designing for. That's Track 3's
**Row-Level Security & Access Control**.

Defence in depth here is not paranoia: the application check gives good errors and
fast feedback, the database check makes the failure mode empty rather than
catastrophic.

## Practical notes

- **Deny by default.** New endpoints must require an explicit grant. A router-level dependency (Chapter 7) or Spring Security's `authorizeHttpRequests { anyRequest().authenticated() }` makes "forgot to add the check" a `403` rather than an open endpoint.
- **Roles in the token vs looked up.** In the token: no lookup, but stale until expiry — a revoked admin keeps admin for the token's remaining life. Looked up per request: always fresh, at the cost of a query. Short-lived tokens make the first acceptable; anything privileged deserves the second.
- **Don't authorise on client-supplied identity.** The user id comes from the validated token's `sub`, never from a request body or a header the client controls. This sounds obvious and is a recurring real bug in internal service-to-service calls.
- **Log authorization denials** with subject, action and resource. A spike in `403`s is either a broken deployment or someone enumerating ids, and you want to be able to tell which.
- **Test the negative path.** Most suites test that the owner can read their order. The test that matters is that a *different* user gets a `404`. Write it once per resource type as a matter of routine.

## What to take away

- RBAC until a real requirement breaks it; ABAC and ReBAC are answers to specific problems, not upgrades.
- Route-level checks can't do object-level authorization — the id only exists at request time, and that's where the vulnerabilities are.
- Scope the query by owner instead of filtering afterwards: it removes the check you can forget.
- Deny by default, derive identity only from the validated token, and let the database be the backstop when the application layer is wrong.

## References

- [OWASP API Security Top 10 — Broken Object Level Authorization](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/) and [Broken Function Level Authorization](https://owasp.org/API-Security/editions/2023/en/0xa5-broken-function-level-authorization/)
- [OWASP — Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [OpenFGA](https://openfga.dev/docs) and [SpiceDB](https://authzed.com/docs) — actively developed ReBAC engines, and the practical way in; both derive from [Google's Zanzibar paper](https://research.google/pubs/pub48190/).
- [NIST — Attribute Based Access Control (SP 800-162)](https://csrc.nist.gov/pubs/sp/800/162/upd2/final)
- [Spring Security — Authorization](https://docs.spring.io/spring-security/reference/servlet/authorization/index.html) · [FastAPI — Security](https://fastapi.tiangolo.com/tutorial/security/)
