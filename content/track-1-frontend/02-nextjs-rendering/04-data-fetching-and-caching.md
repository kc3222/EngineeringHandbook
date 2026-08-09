---
title: "Data Fetching & Caching"
description: "Where data is loaded, what `use cache` gives a result, and how to invalidate it."
track: 1
chapter: 2
page: 4
readMinutes: 5
---

:::info[Prerequisites]
**Server & Client Components** — where a fetch runs determines everything below.
:::

## Fetch where the component renders

In a Server Component, data fetching is an `await` in the component body. There's no
loader function, no `getServerSideProps`, and no hook:

```tsx
export default async function Page({ params }: PageProps<'/products/[id]'>) {
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id } });
  return <ProductView product={product} />;
}
```

Client Components still fetch the old way — an effect, or a query library — and
should mostly be handed data as props instead. The rule of thumb: **fetch on the
server, pass down; fetch on the client only for things that change after the page
loads** (live prices, polling, infinite scroll).

## Waterfalls are the default hazard

Nested `await`s in nested components serialise. A layout that awaits the user, a
page that then awaits the product, and a child that then awaits reviews is three
round trips end to end, even though nothing depended on anything.

Two fixes:

```tsx
// Parallel — both start at once
const [user, product] = await Promise.all([getUser(), getProduct(id)]);
```

```tsx
// Or start early, await late
const productPromise = getProduct(id);   // no await yet
const user = await getUser();
const product = await productPromise;
```

The second shape generalises: you can pass the *promise* to a child component and
let it `await` (or `use()`) it there, so the request starts at the top of the tree
while the resolution happens where the data is needed.

The other fix is structural and belongs to the next page: put slow work behind a
`<Suspense>` boundary so it doesn't hold up the rest of the page at all.

For the same query called from several components in one render, React's
[`cache`](https://react.dev/reference/react/cache) deduplicates within a single
render pass, so you can call `getUser()` in the layout and the page without issuing
two queries.

## `use cache` gives a result a lifetime

Next.js 16's caching model (enabled with `cacheComponents: true`) is built on one
directive. Adding `'use cache'` to an async function or component caches its return
value, with the arguments and any closed-over values forming the cache key.

```tsx
import { cacheLife, cacheTag } from 'next/cache';

async function getProducts(category: string) {
  'use cache';
  cacheLife('hours');
  cacheTag('products');
  return db.product.findMany({ where: { category } });
}
```

It applies at two levels, and the difference matters:

- **Data-level** — cache the function. Useful when several components need the same data, or the UI around it varies.
- **UI-level** — put `'use cache'` at the top of a component or page. The rendered output is cached, not just the data.

`cacheLife` sets the lifetime using a named profile (`'seconds'`, `'minutes'`,
`'hours'`, `'days'`, `'max'`, or a custom one). A profile has three numbers worth
distinguishing:

| Field | Means |
| --- | --- |
| `stale` | How long a client may reuse its copy without asking |
| `revalidate` | How old the server copy can get before it's refreshed in the background |
| `expire` | The hard limit — past this, a request waits for a fresh render |

The pair `revalidate` and `expire` is what produces stale-while-revalidate
behaviour: between them, a visitor gets the cached copy immediately and the refresh
happens off the critical path.

## Anything not cached must be behind Suspense

The rule that makes this model coherent: with Cache Components enabled, a component
that does uncached async work or reads request data — `cookies()`, `headers()`,
`searchParams`, dynamic `params` — must be wrapped in `<Suspense>`. Otherwise the
route can't produce a static shell, and the dev overlay says so.

```tsx
export default function Page() {
  return (
    <>
      <Header />                                {/* static */}
      <ProductDetails />                        {/* 'use cache' */}
      <Suspense fallback={<CartSkeleton />}>
        <Cart />                                {/* reads cookies() — streams */}
      </Suspense>
    </>
  );
}
```

This is a real change from the previous model, where a single `cookies()` call
anywhere made the *entire route* dynamic. Now it makes one subtree dynamic and the
rest still prerenders.

## Invalidation

Time-based expiry handles the common case. For "this changed, show it now", there
are tags and paths:

```ts
'use server';
import { revalidateTag, revalidatePath, refresh } from 'next/cache';

export async function publishPost(id: string) {
  await db.post.update({ where: { id }, data: { published: true } });
  revalidateTag('posts');        // everything tagged 'posts'
  revalidatePath('/blog');       // everything cached for this route
  // refresh();                  // re-render the current route for this user only
}
```

- `cacheTag` + `revalidateTag` is the precise tool: tag a cached function, invalidate that tag from anywhere.
- `revalidatePath` is the blunt one — it drops everything for a route, which is easy to reason about and easy to overuse.
- `refresh()` refreshes the client router for the current user without touching shared caches. It's what you want after a mutation whose result only that user should see immediately.

Tag naming is the part that goes wrong at scale. A single `cacheTag('products')`
invalidated by every write means every write clears everything; tagging each item
with `cacheTag('product-' + id)` *and* tagging list queries `'products'` gives you
both granularities, so editing one product doesn't drop the whole catalogue.

## Where cached results actually live

Worth knowing before you rely on a cache in production:

- **Prerendered HTML** on disk or in the platform's storage behind a CDN.
- **A server-side store**, which by default is per-instance and in-memory — so on serverless it doesn't survive between requests. `'use cache: remote'` moves it to a shared cache handler.
- **The browser**, as part of the RSC payload sent for a navigation or prefetch, fresh for the profile's `stale` window.

And all of them are keyed by build id: **a new deployment starts with an empty
cache.** A cache warm enough to matter needs to be one you can rebuild cheaply, or
one that lives outside the framework.

## If you're not using Cache Components

The previous model is still supported and worth recognising in existing code:
`fetch(url, { cache: 'force-cache', next: { revalidate, tags } })` for HTTP
requests, `unstable_cache` for everything else, and route segment config
(`export const revalidate`, `export const dynamic`) at the route level. Note that
**`fetch` has not been cached by default since Next.js 15** — a lot of older
material assumes it is.

## What to take away

- Fetch in Server Components and pass data down; client-side fetching is for what changes after load.
- Nested awaits serialise. `Promise.all`, early-start promises, and Suspense boundaries are the three fixes.
- `'use cache'` gives a function or component a lifetime; `cacheLife` sets it, `cacheTag` makes it invalidatable.
- Uncached async work and request data belong behind `<Suspense>` — that's what keeps the rest of the route static.
- Caches are per-deployment. Design tags before you need them, and don't assume a warm cache after a deploy.

## References

- [Next.js — Caching](https://nextjs.org/docs/app/getting-started/caching) and [`use cache`](https://nextjs.org/docs/app/api-reference/directives/use-cache)
- [Next.js — `cacheLife`](https://nextjs.org/docs/app/api-reference/functions/cacheLife) and [`cacheTag`](https://nextjs.org/docs/app/api-reference/functions/cacheTag)
- [Next.js — Caching and revalidating (previous model)](https://nextjs.org/docs/app/guides/caching-without-cache-components)
- [react.dev — `cache`](https://react.dev/reference/react/cache) for per-render deduplication
