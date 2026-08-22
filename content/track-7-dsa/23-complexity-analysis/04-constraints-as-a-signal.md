---
title: "Constraints as a Signal"
description: "Working backwards from input size to the complexity you can afford, and reading the constraint as a hint about the intended approach."
track: 7
chapter: 23
page: 4
readMinutes: 4
---

## Start from the budget, not the algorithm

The usual order of operations is to think of an approach and then check whether it's fast
enough. Reversing that is more productive: read the input size first, work out what
complexity fits in the time available, and let that narrow the field before you've
committed to anything.

The arithmetic behind it is crude and good enough. A modern CPU running interpreted
Python gets through roughly 10⁷ simple operations per second; compiled languages manage
closer to 10⁸–10⁹. Those numbers are wrong in both directions depending on what the
operations are, but they're the right order of magnitude for sizing a decision.

## The table worth internalising

Assuming a budget of about one second and an interpreted language, here is roughly what
each input size allows:

| n up to | Complexity that fits | Typical shape |
| --- | --- | --- |
| 10–12 | O(n!) | Permutations, brute-force ordering |
| 20–25 | O(2ⁿ) | Subset enumeration, bitmask DP |
| 100–500 | O(n³) | Triple loop, Floyd–Warshall, some 2D DP |
| 5,000 | O(n²) | All pairs, quadratic DP |
| 10⁶ | O(n log n) | Sort, heap operations, divide-and-conquer |
| 10⁷–10⁸ | O(n) | Single pass, hashing, two pointers |
| Arbitrary | O(log n), O(1) | Binary search, direct lookup, closed form |

Shift everything one row for a compiled language, or if the per-operation work is heavier
than an integer comparison. The point isn't precision — it's that n = 10⁶ rules out the
nested loop before you write it, and n = 20 makes exponential enumeration entirely
reasonable.

:::tip[Key insight]
A stated input bound is not a limit you have to respect — it's a hint about the intended
solution. `n ≤ 20` is nearly always an invitation to enumerate subsets; `n ≤ 10⁵` says the
answer is O(n log n) or better, so sorting is affordable and a quadratic pass is not.
Reading the bound tells you the shape of the answer before you understand the problem.
:::

## Reading it in both directions

The mapping runs backwards too, and that's where it earns its place in production work.

**A quadratic bound met with a large n is a design question, not a tuning question.** If a
report needs to compare every record against every other and there are 400,000 records,
no amount of optimising the comparison saves it — 1.6 × 10¹¹ comparisons is out of reach
whatever the constant. The productive response is to change the shape: bucket by a key so
only plausible pairs are compared, sort so that a single pass suffices, or precompute an
index.

**Multiple bounds constrain jointly.** A problem with n items and q queries usually wants
O((n + q) log n) rather than O(n·q) — that's the whole reason prefix sums and precomputed
indices exist. When you see two independent sizes, check whether the intended solution
pays per query or amortises across them.

**Small n makes "bad" complexity correct.** Linear search through eight configuration
entries beats building a hash map, because the map costs a hash per lookup and an
allocation up front. The crossover for small collections is real, and reaching for the
asymptotically better structure below it is a way of writing slower, longer code.

## Sanity-checking a real system

The same reasoning transfers directly to code that has nothing to do with algorithm
problems, and this is where most engineers actually use it.

An endpoint that loops over N results and issues one database query per result is O(N)
round trips — the N+1 problem. At N = 10 nobody notices. At N = 2,000, with a 2 ms
round trip, that's four seconds of pure network latency and no amount of index tuning
fixes it, because the cost is the *count* of queries, not their individual speed.

A page that renders a list of M items and, for each, filters an array of K permissions is
O(M·K). With M = 500 and K = 200 that's 100,000 operations per render, which is enough to
be felt on a mid-range phone. Precomputing a permission set turns it into O(M + K).

In both cases the fix follows from the same question: what is n here, and what does the
current shape cost as it grows?

## What to take away

- Estimate the budget first: roughly 10⁷ operations per second interpreted, 10⁸–10⁹ compiled.
- Memorise the rough n-to-complexity table; it converts a stated bound into a short list of viable approaches.
- A small bound (n ≤ 20 or so) is a signal that exponential enumeration is intended, not a coincidence.
- Two input sizes usually mean the intended solution amortises work across queries rather than repeating it.
- Below the crossover, the simpler structure wins — asymptotics don't apply to n = 8.

## References

- [Cormen, Leiserson, Rivest & Stein — *Introduction to Algorithms*, 4th ed.](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/), Chapter 3
- [Peter Norvig — Teach Yourself Programming in Ten Years](https://norvig.com/21-days.html#answers) — the "approximate timing for various operations" table, useful for calibrating what a constant factor actually costs
