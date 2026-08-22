---
title: "Why Asymptotic Analysis"
description: "What Big-O measures, what it deliberately ignores, and why ignoring that much is what makes it useful."
track: 7
chapter: 23
page: 2
readMinutes: 4
---

## Two routes to the same place

There are two ways to get across a city. One is a back road: slow, but the time it takes
barely changes whether you leave at 6 a.m. or at rush hour, because almost nobody uses
it. The other is the motorway: much faster when it's empty, and progressively worse as
traffic builds, because every extra car interacts with every other one.

Asking "which route is faster" has no answer. Asking "which route is faster at 8:30 on a
Tuesday" does. And the useful thing to know about the two roads isn't a stopwatch
reading from one particular morning — it's the *shape* of each one's response to traffic.
One is flat. The other bends upward. Knowing that, you can predict a morning you've
never driven.

Asymptotic analysis is the study of that shape, and Big-O is the notation for writing it
down.

## What Big-O actually says

`O(f(n))` is a statement about growth: past some input size, the running time is bounded
above by a constant multiple of `f(n)`. Three consequences follow directly from that
definition, and all three surprise people the first time.

**Constant factors vanish.** An algorithm doing `5n + 300` operations is O(n), and so is
one doing `n`. The 5 and the 300 are real — they are exactly what you feel in production
— but they don't change the shape, so the notation drops them.

**Lower-order terms vanish.** `n² + 1000n` is O(n²), because once n is large enough the
squared term dominates everything else by an arbitrary margin. At n = 100 the two terms
are equal; at n = 100,000 the linear term is a rounding error.

**It's an upper bound, not a promise of tightness.** An O(n) algorithm is also,
truthfully, O(n²) and O(2ⁿ). In practice nobody says that, because the convention is to
quote the tightest bound you can defend. When you need to be precise about it, Θ(n)
means bounded above *and* below — the growth is genuinely linear, not merely no worse
than linear.

:::tip[Key insight]
The information Big-O throws away is not an unfortunate approximation — it's the entire
mechanism. Constant factors depend on your language, your CPU, your allocator, and what
else the machine is doing. The growth shape depends on none of those, which is why it is
the one property of an algorithm you can reason about before writing it.
:::

## The growth rates worth recognising

Six shapes cover nearly everything you'll meet, and they're worth being able to place
on sight.

| Complexity | Name | What produces it |
| --- | --- | --- |
| O(1) | Constant | Hash lookup, array index, arithmetic |
| O(log n) | Logarithmic | Halving the search space each step — binary search, balanced tree descent |
| O(n) | Linear | One pass over the input |
| O(n log n) | Linearithmic | Comparison sorting; divide-and-conquer with a linear merge |
| O(n²) | Quadratic | Every pair — nested loops over the same collection |
| O(2ⁿ), O(n!) | Exponential, factorial | Enumerating subsets; enumerating permutations |

The gaps between them are much larger than the notation makes them look. At n = 1,000,000:
log n is about 20, n log n is about 20 million, and n² is a trillion. The first two run
in well under a second. The third does not finish today.

## Best, average and worst case

A single algorithm can have three different growth shapes depending on the input, and
quoting the wrong one is a common way to be confidently wrong.

Quicksort is the standard illustration: O(n log n) on average, O(n²) in the worst case
when the pivot choice is consistently terrible. Linear search through a list is O(1) if
your target is first and O(n) if it's last or absent.

The default in engineering discussions is **worst case**, for a straightforward reason:
it's the only one that holds regardless of who supplies the input. Average case assumes a
distribution, and an adversary — or just an unlucky customer — is not obliged to respect
it. Best case is essentially never the interesting number.

Where average case does earn its keep is in structures whose worst case is rare and
well-understood, like hash tables. That distinction is important enough to have its own
page later in this chapter.

## Space complexity, briefly

The same notation applies to memory, and the convention is to count **auxiliary** space —
what the algorithm allocates beyond the input it was handed. An in-place sort is O(1)
auxiliary space even though the array it sorts is obviously O(n).

Two things routinely get missed. Recursion costs stack space proportional to its maximum
depth, so a recursive traversal of a linked list is O(n) space even if it allocates
nothing. And in languages with immutable strings, "building up a result" allocates every
intermediate — which is the subject of the next page.

## What to take away

- Big-O describes how running time responds to input growth, not how long anything takes.
- Constant factors and lower-order terms are dropped on purpose; that's what makes the result portable across machines.
- Six growth shapes cover nearly everything, and the distances between them are far larger than they look.
- Quote worst case by default. Average case is a claim about the input distribution, and needs to be defended.
- Space complexity counts auxiliary allocation, and recursion depth is part of it.

## References

- [Cormen, Leiserson, Rivest & Stein — *Introduction to Algorithms*, 4th ed.](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/), Chapter 3 ("Characterizing Running Times")
- [Knuth — *Big Omicron and Big Omega and Big Theta*](https://dl.acm.org/doi/10.1145/1008328.1008329), ACM SIGACT News, 1976 — the paper that fixed the notation in its current form
