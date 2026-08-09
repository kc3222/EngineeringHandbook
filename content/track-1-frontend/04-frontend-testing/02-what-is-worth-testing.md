---
title: "What's Worth Testing"
description: "Where UI tests pay off, which ones are pure cost, and how to tell before you write them."
track: 1
chapter: 4
page: 2
readMinutes: 4
---

:::info[Prerequisites]
The chapter overview — particularly the implementation-versus-behaviour distinction.
:::

## Every test has a running cost

A test is not free once written. It has to be maintained, it has to be read when it
fails, and it occupies a slot in a suite that people will eventually stop running if
it gets slow enough. So the question isn't "is this tested?" — it's whether this
test earns its keep.

A useful frame is confidence per unit of maintenance:

| High confidence, low maintenance | Low confidence, high maintenance |
| --- | --- |
| Pure functions: formatting, validation, parsing | A component's internal state after a click |
| A form's submit path, including validation errors | Whether `useEffect` ran |
| Conditional rendering the user can observe | Class names and DOM structure |
| Reducers and state machines | Props passed to a mocked child |
| Accessibility contracts (roles, labels, focus) | Large auto-generated snapshots |

The right column shares one property: **it fails when the code is rearranged, not
when the behaviour changes.** That's the whole test for whether a test is worth
having.

## The shape of a UI test suite

The classic pyramid — many unit tests, fewer integration, a handful of end-to-end —
was designed for backends. For UI, Kent C. Dodds' "testing trophy" is a better fit:
the widest layer is **integration**, meaning a component rendered with its real
children and its real state, with only the network faked.

The reason is specific to UI. A component in isolation, with mocked children and
mocked hooks, tests almost nothing: the interesting failures in a UI are in the
*wiring* — this button doesn't call that handler, this state doesn't reach that
child, this error path never renders. Mock the wiring away and the test can only
confirm that the code you kept is the code you wrote.

That doesn't make unit tests pointless — it moves them to where they're strongest.
Date formatting, currency rounding, permission logic, a reducer's transitions: pure
functions with many cases, tested exhaustively and fast, with no DOM in sight.
**Pushing logic out of components and into pure functions is the highest-leverage
testability move there is**, and it improves the code independently of testing.

## Tests that are theatre

Four patterns worth recognising, in rough order of how much time they waste.

**Asserting on state.** Reaching into a component to check `count === 1` after a
click. The user can't see state; they see a number on screen. Assert on that, and
the test survives a `useState` → `useReducer` refactor that changed nothing
observable.

**Mocking the component under test's children.** A test that renders `<Page />` with
`<Table />` mocked verifies that `Page` renders *a mock*. The integration it was
supposed to check is exactly the part removed.

**Large snapshots.** A 300-line snapshot fails on every legitimate change, gets
updated with `-u` without being read, and thereafter asserts only that the output
equals itself. Snapshots are useful when they're small and deliberate — a
serialised error object, a generated class string — and harmful at component scale.

**Testing the framework.** Asserting that React re-renders when state changes, that
a `<Link>` navigates, that the ORM returns rows. That's someone else's test suite,
and it already passes.

## Coverage is a map, not a score

Line coverage tells you which lines ran, not whether anything was verified. A test
that renders a component and asserts nothing produces excellent coverage.

Coverage is genuinely useful read the other way round: as a list of files nobody has
exercised at all. A 0% file is information. The difference between 84% and 87% is
not, and a target enforced at that granularity reliably produces tests written to
move the number.

If you want a threshold, put it somewhere the number means something — a payments
module, a permissions layer — rather than globally.

## A working default

For a typical feature:

1. **Pure logic** → unit tests, exhaustive, cheap.
2. **The component** → one integration test for the happy path, one per meaningful failure or empty state. Real children, faked network.
3. **The critical journeys** → a handful of end-to-end tests. Signup, checkout, whatever loses money when it breaks.
4. **Every bug fixed** → a regression test. This is the highest-value test you will ever write, because you have proof that failure mode is reachable.

Point 4 does more work than the rest combined over a codebase's life. Bugs cluster;
a fix without a test is a fix that gets undone.

## What to take away

- A test earns its keep if it fails when behaviour changes and survives when code is rearranged.
- Integration is the widest layer for UI, because UI bugs are wiring bugs — and mocking the wiring removes what you were testing.
- Push logic into pure functions; it's the cheapest testability improvement and it's good for the code anyway.
- State assertions, mocked children, giant snapshots and framework tests are cost without confidence.
- Read coverage as a map of untouched files, not as a target.

## References

- [Testing Library — Guiding principles](https://testing-library.com/docs/guiding-principles/)
- [Kent C. Dodds — The testing trophy and testing classifications](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)
- [Kent C. Dodds — Testing implementation details](https://kentcdodds.com/blog/testing-implementation-details)
- [Martin Fowler — Test coverage](https://martinfowler.com/bliki/TestCoverage.html)
