---
title: "Frontend Testing (Jest)"
description: "Unit and integration tests for UI — what's actually worth testing versus what's theater."
track: 1
chapter: 4
page: 1
readMinutes: 3
---

:::info[Prerequisites]
**React Fundamentals**. The Tailwind chapter is useful context but not required.
:::

## Why this chapter exists

UI test suites fail in a specific, recognisable way: they grow to thousands of
tests, take eleven minutes to run, break on every refactor, and still don't catch
the bug that reaches production. Everyone involved concludes that frontend testing
doesn't work.

It usually isn't the tooling. It's that the tests were written against the
*implementation* — this component's state, that hook's return value, this element's
class list — when the thing worth protecting is the **behaviour a user depends on**.
A refactor changes the implementation and nothing else, so implementation tests all
fail while nothing has actually broken. That's the definition of a false alarm, and
enough of them turn a suite into something people route around.

The corrective is one sentence, from Testing Library's guiding principle:

> The more your tests resemble the way your software is used, the more confidence they can give you.

Every practical recommendation in this chapter is a consequence of that.

## What this chapter is and isn't

**Is:** Jest as a runner, React Testing Library for component tests, and the
judgement calls — what to test, what to mock, what to leave to another layer.

**Isn't:** end-to-end testing. Playwright and Cypress drive a real browser and
answer a different question ("does the deployed thing work?"). They're referenced
where the boundary matters, but they're not the subject.

A word on the runner: this chapter uses **Jest 30**, which remains the default in
Next.js and React Native projects and has the largest ecosystem. **Vitest** is a
legitimate alternative — near-identical API, notably faster, and the natural choice
in a Vite-based project. Almost everything here transfers directly; the differences
are in configuration and mock syntax, not in what to test.

## What's in here

| Page | What it covers |
| --- | --- |
| What's Worth Testing | Where UI tests pay off, and the ones that are pure cost |
| Testing Components | Testing Library queries, user events, and async assertions |
| Test Doubles & Network | What to mock, MSW at the network boundary, timers, and flake |

## Where this connects

**React Fundamentals** decides how testable your components are before a test is
written: pure render logic, state at the right level, and effects with real cleanup
all show up as tests that are easy to write. **TailwindCSS & Component Design** has
a direct link too — a test asserting on class names is asserting on the thing
utilities churn most.

## References

- [Testing Library — Guiding principles](https://testing-library.com/docs/guiding-principles/)
- [Jest 30 release notes](https://jestjs.io/blog/2025/06/04/jest-30)
- [Next.js — Testing with Jest](https://nextjs.org/docs/app/guides/testing/jest)
