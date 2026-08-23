---
title: "Why Asymptotic Analysis"
description: "What Big-O measures, what it deliberately ignores, and why ignoring that much is what makes it useful."
track: 7
chapter: 1
page: 2
readMinutes: 3
---

## Two routes to the same place

There are two ways across a city. One is a back road: slow, but the time barely changes
whether you leave at 6 a.m. or at rush hour, because almost nobody uses it. The other is
the motorway: much faster when empty, and progressively worse as traffic builds, because
every extra car interacts with every other one.

"Which route is faster" has no answer. "Which is faster at 8:30 on a Tuesday" does. And
the useful thing to know isn't a stopwatch reading from one particular morning — it's the
*shape* of each road's response to traffic. One is flat; the other bends upward. Knowing
that, you can predict a morning you've never driven.

Asymptotic analysis is the study of that shape, and Big-O is how you write it down.

## What Big-O actually says

`O(f(n))` is a statement about growth: past some input size, the running time is bounded
above by a constant multiple of `f(n)`. Three consequences follow, and all three surprise
people the first time.

**Constant factors vanish.** An algorithm doing `5n + 300` operations is O(n), and so is
one doing `n`. The 5 and the 300 are real — they're exactly what you feel in production —
but they don't change the shape.

**Lower-order terms vanish.** `n² + 1000n` is O(n²). At n = 100 the two terms are equal;
at n = 100,000 the linear term is a rounding error.

**It's an upper bound, not a promise of tightness.** An O(n) algorithm is also, truthfully,
O(n²). Nobody says that, because the convention is to quote the tightest bound you can
defend. When you need to be precise, Θ(n) means bounded above *and* below.

:::tip[Key insight]
The information Big-O throws away is not an unfortunate approximation — it's the entire
mechanism. Constant factors depend on your language, your CPU, your allocator, and what
else the machine is doing. The growth shape depends on none of those, which is why it's
the one property of an algorithm you can reason about before writing it.
:::

## The growth rates worth recognising

| Complexity | Name | What produces it |
| --- | --- | --- |
| O(1) | Constant | Hash lookup, array index, arithmetic |
| O(log n) | Logarithmic | Halving the search space — binary search, balanced tree descent |
| O(n) | Linear | One pass over the input |
| O(n log n) | Linearithmic | Comparison sorting; divide-and-conquer with a linear merge |
| O(n²) | Quadratic | Every pair — nested loops over the same collection |
| O(2ⁿ), O(n!) | Exponential, factorial | Enumerating subsets; enumerating permutations |

The gaps are much larger than the notation makes them look. At n = 1,000,000: log n is
about 20, n log n is about 20 million, and n² is a trillion. The first two run in well
under a second. The third does not finish today.

## Best, average and worst case

One algorithm can have three growth shapes depending on the input. Quicksort is O(n log n)
on average and O(n²) when the pivot choice is consistently terrible; linear search is O(1)
if the target is first and O(n) if it's absent.

The default in engineering discussions is **worst case**, because it's the only one that
holds regardless of who supplies the input. Average case assumes a distribution, and an
adversary — or an unlucky customer — is not obliged to respect it. Where average case does
earn its keep is in structures whose worst case is rare and well understood, like hash
tables, whose O(1) lookup is an average and not a guarantee — **Core Data Structures**
picks that up in detail.

## Space, briefly

The same notation applies to memory, counting **auxiliary** space — what the algorithm
allocates beyond the input. An in-place sort is O(1) auxiliary even though the array it
sorts is obviously O(n). The routinely-missed part is that recursion costs stack space
proportional to its maximum depth, so a recursive traversal of a linked list is O(n) space
even if it allocates nothing.

## What to take away

- Big-O describes how running time responds to input growth, not how long anything takes.
- Constant factors and lower-order terms are dropped on purpose; that's what makes the result portable across machines.
- Six growth shapes cover nearly everything, and the distances between them are far larger than they look.
- Quote worst case by default — average case is a claim about the input distribution.
- Space complexity counts auxiliary allocation, and recursion depth is part of it.

## References

- [Cormen, Leiserson, Rivest & Stein — *Introduction to Algorithms*, 4th ed.](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/), Chapter 3 ("Characterizing Running Times")
- [Knuth — *Big Omicron and Big Omega and Big Theta*](https://dl.acm.org/doi/10.1145/1008328.1008329), ACM SIGACT News, 1976 — the paper that fixed the notation in its current form
