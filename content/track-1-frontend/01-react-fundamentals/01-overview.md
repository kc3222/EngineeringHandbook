---
title: "React Fundamentals"
description: "Components, state, and the render cycle — the mental model everything else in the frontend chapters assumes you already have."
track: 1
chapter: 1
page: 1
readMinutes: 3
---

:::info[Prerequisites]
None. This is the first chapter of the track — start here if you're starting anywhere.
:::

## Why this chapter exists

React's central claim is one sentence: **the UI is a function of state.** You don't
write instructions for changing the screen; you write what the screen should look
like for a given set of values, and React works out the DOM operations that get
there.

Everything people find confusing about React is a consequence of taking that
seriously. You can't "just update the DOM" — you change state and let a render
happen. You can't read the result of a state update on the next line — the update
is a request, not an assignment. You can't hold a reference to a variable across
renders — each render gets its own.

| What you write | What React does |
| --- | --- |
| A function returning elements | Calls it, gets a description of the UI |
| `setCount(3)` | Schedules a re-render of that component |
| A different tree than last time | Diffs the two, applies the minimal DOM change |
| An effect | Runs it *after* the DOM is updated |

The engineers who are fast in React aren't the ones who know more hooks. They're
the ones who can answer three questions about any bug: **what state changed**,
**what re-rendered as a result**, and **when did the effect run relative to the
paint**.

## What React is not doing for you

Two things are worth stating up front, because they cause a lot of misdirected
debugging.

**React doesn't track your variables.** There is no observation, no proxy, no
dependency graph over your data — unlike Vue, Svelte or Solid. React re-renders
because you called a setter, and that's the only reason. If the screen didn't
update, the setter wasn't called with a new value.

**A re-render is not a DOM update.** Re-rendering means React called your function
again and compared the output. Most re-renders produce no DOM change at all. This
is why "too many re-renders" is usually a cheap problem, and why optimising it
before measuring is usually wasted work.

## What's in here

| Page | What it covers |
| --- | --- |
| Components & Props | Composition, the one-way data flow, and where `children` beats configuration |
| State & the Render Cycle | Render, commit, and why state updates look asynchronous |
| Effects & Synchronisation | What effects are for, cleanup, and the effects that shouldn't exist |
| Sharing State & Custom Hooks | Lifting state, context and its costs, and extracting behaviour |
| Rendering Performance | Keys, memoisation, and what React Compiler changes about all of it |

## Where this connects

**Next.js & Rendering Strategies** takes these components and asks where they run —
build time, server, or browser — which is a question you can only answer once the
render cycle here is clear. **TailwindCSS & Component Design** is about the styling
layer for the same components, and **Frontend Testing** is about asserting on their
behaviour rather than their internals.

Versions matter less here than most chapters: this page describes React 19, current
since December 2024, but the model has been stable since hooks landed in 16.8.

## References

- [react.dev — Describing the UI](https://react.dev/learn/describing-the-ui) and [Adding Interactivity](https://react.dev/learn/adding-interactivity) — the official mental-model track, rewritten for the hooks era.
- [React v19 release notes](https://react.dev/blog/2024/12/05/react-19)
