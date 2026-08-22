---
title: "Constraints as a Signal"
description: "Working backwards from input size to the complexity you can afford, and reading the constraint as a hint about the intended approach."
track: 7
chapter: 23
page: 4
readMinutes: 3
---

## Start from the budget, not the algorithm

The usual order is to think of an approach and then check whether it's fast enough.
Reversing that is more productive: read the input size, work out what complexity fits the
time available, and let that narrow the field before you've committed to anything.

The arithmetic is crude and good enough. Interpreted Python gets through roughly 10⁷ simple
operations per second; compiled languages manage closer to 10⁸–10⁹. Both numbers are wrong
in either direction depending on the operations, but they're the right order of magnitude
for sizing a decision.

## The table worth internalising

Assuming a budget of about one second and an interpreted language:

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
nested loop before you write it, and n = 20 makes exponential enumeration reasonable.

:::tip[Key insight]
A stated input bound is not a limit you have to respect — it's a hint about the intended
solution. `n ≤ 20` is nearly always an invitation to enumerate subsets; `n ≤ 10⁵` says the
answer is O(n log n) or better, so sorting is affordable and a quadratic pass is not.
Reading the bound tells you the shape of the answer before you understand the problem.
:::

## Reading it in both directions

**A quadratic bound met with a large n is a design question, not a tuning question.** If a
report compares every record against every other and there are 400,000 records, no amount
of optimising the comparison saves it — 1.6 × 10¹¹ comparisons is out of reach whatever the
constant. The productive response is to change the shape: bucket by a key so only plausible
pairs are compared, sort so a single pass suffices, or precompute an index.

**Multiple bounds constrain jointly.** A problem with n items and q queries usually wants
O((n + q) log n) rather than O(n·q) — that's why prefix sums and precomputed indices exist.
Two independent sizes is a signal that the intended solution amortises work across queries
rather than repeating it.

**Small n makes "bad" complexity correct.** Linear search through eight configuration
entries beats building a hash map, because the map costs a hash per lookup and an
allocation up front. Reaching for the asymptotically better structure below the crossover
is a way of writing slower, longer code.

## Sanity-checking a real system

The same reasoning transfers to code that has nothing to do with algorithm problems, and
that's where most engineers actually use it.

An endpoint that loops over N results and issues one query per result is O(N) round trips —
the N+1 problem. At N = 10 nobody notices. At N = 2,000 with a 2 ms round trip, that's four
seconds of pure network latency, and no index tuning fixes it, because the cost is the
*count* of queries rather than their individual speed. The fix follows from the same
question you'd ask about a loop: what is n here, and what does the current shape cost as it
grows?

## What to take away

- Estimate the budget first: roughly 10⁷ operations per second interpreted, 10⁸–10⁹ compiled.
- Memorise the rough n-to-complexity table; it converts a stated bound into a short list of viable approaches.
- A small bound (n ≤ 20 or so) signals that exponential enumeration is intended.
- Two input sizes usually mean the intended solution amortises work across queries.
- Below the crossover the simpler structure wins — asymptotics don't apply to n = 8.

## References

- [Cormen, Leiserson, Rivest & Stein — *Introduction to Algorithms*, 4th ed.](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/), Chapter 3
- [Peter Norvig — Teach Yourself Programming in Ten Years](https://norvig.com/21-days.html#answers) — the "approximate timing for various operations" table, useful for calibrating what a constant factor actually costs
