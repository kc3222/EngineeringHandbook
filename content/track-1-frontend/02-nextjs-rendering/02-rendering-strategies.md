---
title: "Rendering Strategies"
description: "CSR, SSR, SSG and ISR as tradeoffs about freshness, latency and cost — not as brand names."
track: 1
chapter: 2
page: 2
readMinutes: 5
---

:::info[Prerequisites]
The chapter overview — particularly the "how much can be computed in advance" framing.
:::

## Four answers to one question

The acronyms describe *when* HTML is produced and *who* produces it.

| | Rendered | Served from | Fresh as of | Fails when |
| --- | --- | --- | --- | --- |
| **CSR** | In the browser, after JS loads | CDN (empty shell) | Whenever it fetched | You need SEO or a fast first paint |
| **SSG** | At build time | CDN | The last build | Content changes more often than you deploy |
| **SSR** | Per request, on a server | Server | Now | Traffic is high and the work is repeated |
| **ISR** | At build, then re-rendered in the background | CDN | Last revalidation | Data must be correct to the second |

None is "modern" and none is deprecated. They're points on a curve between
*freshness* and *cost per view*, and real applications use several at once.

## Client-side rendering

The server returns a near-empty HTML document; the browser downloads a JS bundle,
runs it, fetches data, and renders. This is the classic single-page app, and the
default for a Vite or Create-React-App style build.

It's genuinely the right choice for interfaces behind a login where every screen is
user-specific and nothing is indexable: an admin console, a dashboard, an editor.
There's no SEO to lose, the first load cost is paid once, and subsequent navigation
is instant with no server involved.

Its failure mode is public content. The first paint waits on the bundle *and* the
data request that can't start until the bundle runs — two serialised round trips
before anything appears.

## Static site generation

HTML is produced at build time and served as a file. Nothing is faster or cheaper:
a CDN returns bytes, no compute is involved, and it can't fall over under load
because there's nothing to fall over.

```tsx
// A route with dynamic segments, prerendered for a known set of values
export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map(post => ({ slug: post.slug }));   // → /blog/[slug]
}
```

Two limits decide whether SSG works for you:

- **Build time scales with page count.** 500 pages is nothing; 500,000 is a twenty-minute deploy, and a typo in the footer costs another twenty.
- **Content is as fresh as the last build.** Fine for docs, wrong for stock levels.

## Server-side rendering

The server renders HTML per request. Correct by construction — it just ran, so it
saw current data — and the natural fit for anything personalised or fast-moving.

The cost is that you now operate a rendering tier. Every view is compute, the
render is only as fast as the slowest thing it awaits, and identical requests do
identical work. A page that renders in 200ms is a page where TTFB is at least 200ms
for everyone.

That last point is the practical trap: SSR moves the waterfall from the browser to
the server, where it's harder to see. It doesn't remove it.

## Incremental static regeneration

ISR is SSG with an expiry. A page is served from the cache; when it's older than
its revalidation window, the next request still gets the cached copy, and a fresh
render happens in the background for the request after that.

The key property is **stale-while-revalidate**: nobody waits for the rebuild. The
cost is that somebody sees stale content — by design, and for a window you choose.

In Next.js 16 with Cache Components, this is expressed through cache lifetimes
rather than a route-level flag: `generateStaticParams` prerenders the URLs you know
about, any other URL is served an App Shell immediately and upgraded in the
background, and `cacheLife` sets how long a cached result stays fresh. Under the
previous model, the same behaviour came from `export const revalidate = 3600`.

ISR is the default good answer for large content sites: build the top 1,000 pages,
let the long tail fill in on first visit, and revalidate on a window that matches
how often the content actually changes.

## Choosing, in practice

Ask three questions about the *data*, not about the page:

1. **Who is it for?** If it differs per user, it can't be shared — that's SSR or client-side.
2. **How stale can it be?** Milliseconds means per-request. Minutes means ISR. Deploys means static.
3. **Does a crawler need it?** If yes, the content has to be in the HTML, which rules out CSR for that part.

The answers usually differ *within a page*, which is why the App Router lets you mix
them. On a product page: the layout and description are static, the price is cached
for a minute, the stock badge is per-request, and the "recently viewed" rail is
client-only. Choosing one strategy for the whole route means taking the strictest
requirement and applying it to everything — the reason so many pages are dynamic
when only one line of them needed to be.

## What to take away

- The four strategies trade freshness against cost per view; none is obsolete.
- SSG's limits are build duration and staleness; SSR's are per-request compute and a hidden waterfall.
- ISR's whole value is that the rebuild happens off the critical path — someone gets stale content so nobody waits.
- Decide per data source, not per page, and let the framework mix strategies within a route.

## References

- [Next.js — Partial Prerendering and prerendering behaviour](https://nextjs.org/docs/app/getting-started/caching#prerendering)
- [Next.js — Incremental Static Regeneration](https://nextjs.org/docs/app/guides/incremental-static-regeneration)
- [Next.js — `generateStaticParams`](https://nextjs.org/docs/app/api-reference/functions/generate-static-params)
- [web.dev — Rendering on the web](https://web.dev/articles/rendering-on-the-web) — the framework-agnostic version of this comparison.
