---
title: "Next.js & Rendering Strategies"
description: "SSR, SSG, ISR, and the App Router — same framework, four very different tradeoffs."
track: 1
chapter: 2
page: 1
readMinutes: 3
---

:::info[Prerequisites]
**React Fundamentals** — this chapter is about *where* those components run, which assumes you know what running them means.
:::

## Why this chapter exists

A React component is just a function. Nothing about it says when it should be
called: at build time, on a server for each request, or in the browser after the
page loads. That choice isn't a detail — it decides your time to first byte, your
SEO, your infrastructure bill and how stale your data can be.

Next.js exists mostly to make that choice per-route and per-component rather than
per-application, and the App Router pushes it further: **per component in the same
page**. A product page can serve a prerendered header, a cached price block and a
per-user cart from one response.

The cost of that flexibility is that "where does this run?" stops being obvious. A
single misplaced `cookies()` call can turn a static page dynamic, and the symptom is
a latency chart, not an error.

## The one question underneath all of it

Every rendering decision reduces to: **how much of this page can be computed before
someone asks for it?**

| Known when | Where it can render | What it costs |
| --- | --- | --- |
| At build time | Prerendered to HTML, served from a CDN | Goes stale; rebuilds don't scale with page count |
| On each request | On the server | A server invocation per view |
| Only in the browser | On the client | Blank until JS loads; invisible to some crawlers |

Everything else in this chapter is a mechanism for pushing work leftward in that
table — and for handling the parts that genuinely can't move.

## A note on versions

Next.js moves fast enough that stale advice is a real hazard. This chapter describes
the **App Router in Next.js 16**, where:

- `fetch` is **not** cached by default (this changed in 15 — a lot of older writing assumes otherwise).
- **Cache Components** (`cacheComponents: true`) is the current caching model, built around the `use cache` directive, with Partial Prerendering as its default rendering behaviour.
- The earlier model — `fetch` cache options, `unstable_cache`, route segment config — is still supported and [separately documented](https://nextjs.org/docs/app/guides/caching-without-cache-components).

The Pages Router still works and still receives fixes; `getServerSideProps` and
`getStaticProps` are not going away tomorrow. This chapter covers the App Router
because that's where the interesting tradeoffs now are.

## What's in here

| Page | What it covers |
| --- | --- |
| Rendering Strategies | CSR, SSR, SSG and ISR as tradeoffs, not brand names |
| Server & Client Components | The `use client` boundary and what crosses it |
| Data Fetching & Caching | Where data is loaded, what `use cache` does, and how to invalidate |
| Streaming & Partial Prerendering | Suspense boundaries, and shipping a shell before the data exists |
| Mutations & Server Functions | Writes, revalidation, and the security model people skip |

## Where this connects

**React Fundamentals** is the prerequisite; **Frontend Testing** is where the
resulting components get asserted on. On the backend side, **REST API Design** in
Track 2 covers the services a Next.js app usually sits in front of — and the caching
vocabulary there (`ETag`, `Cache-Control`) is the layer beneath the framework's own.

## References

- [Next.js — App Router documentation](https://nextjs.org/docs/app)
- [Next.js — Caching with Cache Components](https://nextjs.org/docs/app/getting-started/caching)
- [react.dev — Server Components](https://react.dev/reference/rsc/server-components) — the React-level primitive Next.js builds on.
