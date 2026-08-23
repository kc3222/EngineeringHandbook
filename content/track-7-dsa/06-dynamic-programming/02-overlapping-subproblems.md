---
title: "Overlapping Subproblems"
description: "The one property that makes dynamic programming applicable, how to spot it, and how it differs from divide-and-conquer."
track: 7
chapter: 6
page: 2
readMinutes: 4
---

## Answering the same question twice

Imagine being asked to total a long column of numbers, and being asked again five minutes
later. The second time, you don't add them up again — you say the number. The work was
done; the answer didn't change.

Dynamic programming is that, applied to a recursion that has no memory. The recursion asks
itself the same question thousands of times because each branch is unaware of what the
others already computed, and nothing in the structure stops it.

The canonical demonstration:

```python
def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)
```

`fib(5)` calls `fib(4)` and `fib(3)`. `fib(4)` calls `fib(3)` and `fib(2)`. So `fib(3)` is
computed twice, and each of those recomputes everything below it. The call count grows like
2ⁿ while the number of *distinct* questions is only n + 1.

```text
fib(30):    about 1.6 million calls    for 31 distinct values
fib(50):    about 2.5 × 10¹⁰ calls     for 51 distinct values
```

At n = 50 that's hours of computation to produce fifty-one numbers. Adding a cache brings
it to microseconds, and nothing about the algorithm changes except that answers are
remembered.

:::tip[Key insight]
The gap between "number of recursive calls" and "number of distinct arguments" *is* the
speedup available from dynamic programming. If those two counts are similar, caching buys
nothing. If one is exponential and the other polynomial, caching converts one into the
other — and that conversion is the whole technique.
:::

## Spotting it

Three practical tests, in increasing order of effort.

**Draw two levels of the recursion tree.** If the same argument appears in two different
branches, subproblems overlap. This takes thirty seconds and answers the question outright.

**Count the distinct states.** Ask what the recursive function's parameters are and how many
combinations they can take. `fib(n)` has one parameter with n values. `edit(i, j)` has two
with n × m combinations. If that count is polynomial while the recursion is exponential,
there is overlap by pigeonhole — the recursion cannot make exponentially many calls to
polynomially many distinct states without repeating.

**Look for the phrasing.** Problems asking "in how many ways", "the minimum cost to", "the
longest/shortest such that", or "is it possible to reach" over a sequence of decisions are
DP-shaped far more often than not. Each decision branches, and different decision sequences
converge on the same state.

## Divide-and-conquer is the other case

Merge sort splits an array in half, sorts each half, and merges. That's recursive, and it
has optimal substructure — the sorted whole is built from the sorted halves. But the two
halves are *disjoint*, so no subproblem is ever encountered twice, and a cache would store
entries nothing ever reads.

| | Divide-and-conquer | Dynamic programming |
| --- | --- | --- |
| Subproblems | Disjoint | Overlapping |
| Caching helps | No | Yes, decisively |
| Examples | Merge sort, quicksort, binary search | Fibonacci, edit distance, knapsack, path counting |

The distinction is not academic. It tells you immediately whether the cache you're about to
add will do anything, and it explains why some recursive functions are already fast.

## Optimal substructure, the second requirement

Overlap makes DP *efficient*. **Optimal substructure** makes it *correct*: the optimal
answer for a state must be constructible from optimal answers to smaller states.

It usually holds, which is why it's easy to forget to check. The standard counterexample is
the longest *simple* path in a graph — the longest simple path from A to C does not
decompose into the longest simple path from A to B plus B to C, because the two halves may
reuse vertices and the combination stops being a simple path. Shortest paths do decompose,
which is exactly why shortest-path algorithms exist and longest-simple-path is NP-hard.

The practical version of the check: **is the state complete?** If two different histories
can arrive at the same state and lead to different optimal futures, the state is missing a
dimension, and adding it is the fix. "How much money do I have" might be insufficient;
"how much money do I have *and* which items I've already taken" might be the real state.
This is the single most common source of a DP that produces almost-right answers.

## What to take away

- Overlapping subproblems means the recursion reaches the same arguments by different routes, and that's what caching exploits.
- The available speedup is the ratio between total recursive calls and distinct states.
- Count distinct states from the function's parameters; if that count is polynomial and the recursion is exponential, there's overlap.
- Disjoint subproblems mean divide-and-conquer, and a cache there is dead weight.
- Optimal substructure is the correctness requirement. When a DP is subtly wrong, the usual cause is an incomplete state definition.

## References

- [Cormen, Leiserson, Rivest & Stein — *Introduction to Algorithms*, 4th ed.](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/), Sections 14.3 ("Elements of dynamic programming") and 14.4
- [Bellman — *The Theory of Dynamic Programming*](https://www.rand.org/pubs/papers/P550.html), RAND, 1954
