---
title: "Dynamic Programming"
description: "Recognizing overlapping subproblems, and the mechanical path from a recursive definition to a tabulated solution."
track: 7
chapter: 28
page: 1
readMinutes: 3
---

:::info[Prerequisites]
**Complexity & Performance Analysis** (this chapter is entirely about turning exponential
into polynomial), and **Trees & Graph Traversal** page *Depth-First Search* — DP is DFS
with a cache, and that sentence only helps if the DFS part is already familiar. The *State
Compression* page additionally assumes **Bit Manipulation** page *Bitmasks as Sets*.
:::

## Why this chapter exists

Dynamic programming has a reputation for being the hard topic, and the reputation comes
from how it's usually introduced: with a table, a recurrence, and no account of where
either came from. Presented that way it looks like pattern-matching against memorised
recurrences, which is both unpleasant and not transferable.

The version in this chapter is a **process**, and it runs in one direction:

1. Write the obvious recursive solution, however slow.
2. Notice it recomputes the same arguments.
3. Add a cache. You are now done — this is already dynamic programming.
4. If you need the constant factor or want to drop the recursion, convert the cache into a table filled bottom-up.
5. If the table only ever looks a row or two back, keep only those rows.

Every step is mechanical except the first, and the first is just "solve the problem
recursively." Nothing here requires inventing a recurrence out of nothing.

## What DP actually requires

Two properties, and both are worth checking before starting:

**Overlapping subproblems.** The recursion reaches the same state by different routes. If
it doesn't — if every branch explores something genuinely new — a cache stores entries
nothing ever reads, and you have divide-and-conquer rather than DP. Merge sort has no
overlapping subproblems, which is why nobody memoizes it.

**Optimal substructure.** The best answer for a state is built from the best answers to
smaller states. This fails more often than people expect; it's what separates problems
where a greedy or DP approach works from ones where you genuinely have to search.

## What's in here

| Page | What it covers |
| --- | --- |
| Overlapping Subproblems | The property that makes DP applicable, how to spot it, and how to tell it apart from divide-and-conquer |
| Memoization | Top-down — recursion plus a cache, and the least intimidating way in |
| Tabulation | Bottom-up: state definition, transition, base case, and the mechanical translation from a recurrence |
| State Compression | Reducing 2D to 1D when transitions look one row back, bitmask states, and where DP stops being worth it |
| Worked Examples | An escalating sequence of three related problems, plus edit distance |

## Where this connects

The memoization page's central claim — DP is DFS with a cache — connects directly to
**Trees & Graph Traversal**. The state-compression page needs **Bit Manipulation**'s
subset-as-integer material. And the "recognise the shape" habit from **Algorithmic
Patterns** applies here too: "in how many ways", "minimum cost to", and "is it possible
to" are the phrases that signal DP the way "contiguous subarray" signals a window.

Outside the track, the same machinery is what a diff tool runs (edit distance), what a
spell checker ranks with, and what sequence-alignment tools in bioinformatics are built
on.

## References

- [Cormen, Leiserson, Rivest & Stein — *Introduction to Algorithms*, 4th ed.](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/), Chapter 14 ("Dynamic Programming")
- [Bellman — *The Theory of Dynamic Programming*](https://www.rand.org/pubs/papers/P550.html), RAND, 1954 — where the name comes from, and the account of why it is that name
