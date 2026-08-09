---
title: "Server & Client Components"
description: "What `use client` actually marks, what can cross the boundary, and where the boundary belongs."
track: 1
chapter: 2
page: 3
readMinutes: 5
---

:::info[Prerequisites]
**Rendering Strategies** — this page is the mechanism that makes mixing them possible.
:::

## Two kinds of component in one tree

In the App Router, components are **Server Components by default**. They run on the
server (at build time or per request), never ship to the browser, and can do things
a browser component can't:

```tsx
// app/posts/page.tsx — a Server Component
import { db } from '@/lib/db';

export default async function Posts() {
  const posts = await db.post.findMany();   // direct database access, no API route
  return <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>;
}
```

Three consequences, and they're the reason the model exists:

- **No data-fetching round trip.** The component *is* the query.
- **Dependencies stay on the server.** A markdown renderer or a date library used only in a Server Component adds zero bytes to the bundle.
- **Secrets are safe.** API keys and connection strings are never serialised to the client.

A **Client Component** is one marked `'use client'`. It's prerendered to HTML on the
server *and* shipped to the browser, where it hydrates and becomes interactive. Only
Client Components can use state, effects, event handlers or browser APIs.

| | Server Component | Client Component |
| --- | --- | --- |
| `async` / `await` at the top level | Yes | No |
| Database, filesystem, secrets | Yes | No |
| `useState`, `useEffect`, `useContext` | No | Yes |
| `onClick`, `onChange` | No | Yes |
| `window`, `localStorage` | No | Yes |
| Adds to the JS bundle | No | Yes |

## `use client` marks an entry point, not a file

This is the most misread part of the model. `'use client'` does not mean "this
component runs on the client and its parent doesn't". It marks the **boundary**:
that file and **everything it imports** become part of the client bundle.

```tsx
'use client';
import { Chart } from 'heavy-charting-lib';   // now in the client bundle
```

So a `'use client'` at the top of your root layout doesn't make one component
interactive — it opts the entire application in, and you've rebuilt a single-page
app with extra steps.

The corollary is the useful part: **a Server Component can't be imported into a
Client Component, but it can be passed to one as `children`.**

```tsx
// app/page.tsx — Server Component
export default async function Page() {
  const data = await getData();
  return (
    <Collapsible>                   {/* Client Component: owns open/closed state */}
      <ServerChart data={data} />   {/* still rendered on the server */}
    </Collapsible>
  );
}
```

`Collapsible` never imports `ServerChart`; it receives already-rendered output as a
prop. This is how you get interactive shells around server-rendered content, and
it's the single most useful pattern in the App Router.

## What can cross the boundary

Props passed from a Server to a Client Component must be **serialisable** — they're
sent over the wire as part of the RSC payload. Numbers, strings, plain objects,
arrays, `Date`, `Map`, `Set`, promises and JSX elements are fine. Class instances
and arbitrary functions are not, with one exception: a Server Function (see the
mutations page), which is serialised as a reference the client can call.

```tsx
<ClientThing onSave={() => save()} />              // ✗ a plain closure
<ClientThing rows={rows} action={saveAction} />    // ✓ data + a Server Function
```

The other direction has a subtler rule: **any data you pass across the boundary is
visible to the user**, whether the component renders it or not. Passing an entire
user record to render one avatar puts the email, the password hash column and the
internal flags into the page payload. Select the fields you need at the boundary.

## Where to put the boundary

Push it **down toward the leaves.** The goal is to keep as much of the tree on the
server as possible, which means marking the small interactive parts rather than
their containers.

A concrete example: a page with a sortable table. The instinct is `'use client'` on
the page, because sorting is interactive. The better shape is a Server Component
page that fetches rows and renders the table, with a small `'use client'` header
component owning the sort control and driving a router navigation — the rows stay on
the server.

Two more practical notes:

**Context providers need a client wrapper.** `createContext` only works in Client
Components, so a theme provider is a small `'use client'` file that renders
`{children}` — and because those children were created by a Server Component, they
stay server-rendered.

**Third-party components often need one too.** A library component that uses hooks
without shipping its own `'use client'` will error when imported into a Server
Component. The fix is a one-line re-export file that adds the directive.

## Getting it wrong, and what it looks like

| Symptom | Usual cause |
| --- | --- |
| Hook errors on import ("useState is not defined") | A hook-using component imported into a Server Component without `'use client'` |
| Bundle size didn't drop after migrating | `'use client'` too high in the tree |
| "Functions cannot be passed directly to Client Components" | A non-serialisable prop crossing the boundary |
| Internal fields visible in the page payload | Whole objects passed across the boundary |
| `window is not defined` at build | Browser API used in a Server Component |

The [`server-only`](https://www.npmjs.com/package/server-only) package covers the
case the table can't: importing it at the top of a data-access module turns "this
accidentally ended up in the client bundle" into a build error rather than a leak.

## What to take away

- Server Components are the default: no round trip, no bundle cost, direct access to server resources.
- `'use client'` marks a boundary — that file and its whole import graph join the client bundle.
- Server Components can't be imported by Client Components, but they can be passed in as `children`.
- Props crossing the boundary must be serialisable, and are visible to the user. Select fields deliberately.
- Push the boundary toward the leaves; a `'use client'` in the root layout is a single-page app.

## References

- [Next.js — Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [react.dev — Server Components](https://react.dev/reference/rsc/server-components) and [`'use client'`](https://react.dev/reference/rsc/use-client)
- [Next.js — Data security](https://nextjs.org/docs/app/guides/data-security) — what must not cross the boundary.
