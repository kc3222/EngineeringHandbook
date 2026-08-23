---
title: "State Compression"
description: "Reducing 2D to 1D when transitions only look one row back, encoding subsets as integers, and where dynamic programming stops being worth it."
track: 7
chapter: 6
page: 5
readMinutes: 5
---

## Keep only what you still need

The edit-distance table from the previous page is `(n + 1) × (m + 1)`, and for two
million-character sequences that's 10¹² cells — far beyond memory. But look at what the
transition actually reads:

```python
dp[i][j] = f(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
```

Every value comes from the current row or the one immediately above. Row `i - 2` is never
read again once row `i` starts. So there is no reason to keep it.

```python
def edit_distance(a, b):
    n, m = len(a), len(b)
    prev = list(range(m + 1))                    # the "empty prefix of a" row
    for i in range(1, n + 1):
        curr = [i] + [0] * m                     # base case for this row
        for j in range(1, m + 1):
            if a[i - 1] == b[j - 1]:
                curr[j] = prev[j - 1]
            else:
                curr[j] = 1 + min(prev[j], curr[j - 1], prev[j - 1])
        prev = curr
    return prev[m]
```

O(n · m) time unchanged, **O(m) space** instead of O(n · m). For a million-character
comparison that's the difference between impossible and a few megabytes.

A further step keeps a *single* row and overwrites it in place, holding the one diagonal
value in a scalar. It saves another allocation per row and costs a great deal of clarity —
worth it in a hot library function, not worth it in application code. Note also that
swapping the loops so the shorter string drives the inner dimension makes the retained row
smaller, which is free.

:::tip[Key insight]
Look at what the transition reads, not at what the table holds. If it only ever reads one
or two rows back, those are the only rows that need to exist. This turns O(n · m) space into
O(m) mechanically, and it is the single most valuable optimisation in the chapter — it's
what makes DP over long sequences possible at all.
:::

## One dimension, and the direction that matters

Some DPs compress to a single array with no second row. The classic case is the knapsack,
and it comes with a trap that's worth understanding rather than memorising.

```python
def knapsack(weights, values, capacity):
    dp = [0] * (capacity + 1)
    for w, v in zip(weights, values):
        for c in range(capacity, w - 1, -1):     # DOWNWARD — this is the whole trick
            dp[c] = max(dp[c], dp[c - w] + v)
    return dp[capacity]
```

Iterating capacity **downward** means `dp[c - w]` still holds the value from *before* this
item was considered — which is what "each item may be used at most once" requires.

Iterating **upward** would read a `dp[c - w]` that has already been updated with this same
item, allowing it to be taken again. That isn't a bug in every context: it is exactly the
unbounded-knapsack recurrence, where items may be reused. Same three lines, opposite loop
direction, two different problems.

This is the sharpest illustration of the previous page's point that iteration order is a
correctness concern, not a performance one.

## Subsets as state

When the state is "which of these n things have I already used", and n is small, the state
is a subset — and by the *Bitmasks as Sets* page, a subset is an integer. That integer can be
an array index.

```python
def min_tour(dist):                              # dist[i][j], n locations, start at 0
    n = len(dist)
    FULL = (1 << n) - 1
    INF = float('inf')
    dp = [[INF] * n for _ in range(1 << n)]      # dp[visited][at]
    dp[1][0] = 0                                 # only location 0 visited, standing there

    for mask in range(1 << n):
        for at in range(n):
            if dp[mask][at] == INF or not mask >> at & 1:
                continue
            for nxt in range(n):
                if mask >> nxt & 1:              # already visited
                    continue
                m2 = mask | (1 << nxt)
                cost = dp[mask][at] + dist[at][nxt]
                if cost < dp[m2][nxt]:
                    dp[m2][nxt] = cost
    return min(dp[FULL][at] + dist[at][0] for at in range(n))
```

O(2ⁿ · n²) time and O(2ⁿ · n) space. That is exponential — but it's exponential with a small
base and a polynomial factor, against a brute-force alternative of O(n!). At n = 15,
2¹⁵ · 225 is about 7 million operations; 15! is 1.3 × 10¹². The DP is feasible and the
enumeration is not.

Iterating `mask` in increasing numeric order is a valid topological order here for free,
because adding an element only ever increases the mask's value. That's a recurring
convenience of the bitmask encoding, and worth noticing rather than rediscovering.

## Where DP stops being worth it

Three honest limits.

**When the state space is too large.** DP's cost is the number of states times the
transition cost. If the natural state has three dimensions each of size 10⁵, that's 10¹⁵
cells — the technique doesn't apply, and the answer is a different formulation, an
approximation, or a heuristic search.

**When a simpler method exists.** Some problems that look like DP have a greedy solution
(activity selection, Huffman coding), a closed form (the number of paths through a grid with
no obstacles is a binomial coefficient), or a linear-scan answer (maximum subarray is
Kadane's algorithm, which *is* a DP but is nobody's idea of a table). Reaching for a table
first is a common way to write twenty lines where four would do.

**When the exponential is genuinely irreducible.** Bitmask DP fails past roughly n = 25 — 2²⁵
states is already 33 million. Beyond that the honest answers are branch-and-bound,
approximation algorithms, or a solver. Knowing where the ceiling is prevents a lot of wasted
effort.

There's also a readability limit worth respecting. A five-dimensional state with an index-packing
scheme is technically a DP and practically unmaintainable. If the state needs a paragraph of
comments to explain, consider whether a memoized recursion with a named tuple key is the
better artefact — it's the same complexity and a fraction of the cognitive cost.

## What to take away

- If a transition only reads one or two rows back, keep only those rows: O(n · m) space becomes O(m), mechanically.
- In a 1D knapsack, iterate capacity downward for at-most-once items and upward for reusable ones. The direction *is* the problem statement.
- A subset of up to ~20 elements is an integer, and integers are array indices — that's bitmask DP, and increasing mask order is a free topological order.
- Bitmask DP turns O(n!) into O(2ⁿ · n²), which is the difference between infeasible and fast at n = 15.
- DP stops applying when the state space is too large, when something simpler exists, or when the exponential is irreducible. Recognising all three saves more time than any optimisation.

## References

- [Cormen, Leiserson, Rivest & Stein — *Introduction to Algorithms*, 4th ed.](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/), Chapter 14
- [Held & Karp — *A Dynamic Programming Approach to Sequencing Problems*](https://epubs.siam.org/doi/10.1137/0110015), SIAM J. Applied Mathematics, 1962 — the bitmask tour DP above
- [Hirschberg — *A Linear Space Algorithm for Computing Maximal Common Subsequences*](https://dl.acm.org/doi/10.1145/360825.360861), CACM 1975 — recovering the alignment itself in linear space
- [Laaksonen — *Guide to Competitive Programming*](https://link.springer.com/book/10.1007/978-3-030-39357-1), Chapter 10 ("Bit Manipulation")
