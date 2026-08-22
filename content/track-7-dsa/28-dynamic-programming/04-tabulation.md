---
title: "Tabulation"
description: "Bottom-up dynamic programming — state definition, transition, base case, and the mechanical translation from a recurrence to a filled table."
track: 7
chapter: 28
page: 4
readMinutes: 5
---

## The same computation, in a different order

Memoization computes states on demand, discovering the order as it recurses. **Tabulation**
computes them all, in an order chosen in advance so that everything a state depends on is
already there when you reach it.

Same states, same transitions, same complexity. What changes is that the recursion is gone —
so the stack can't overflow — and array indexing replaces hashing and function calls, which
is usually a several-fold constant-factor win.

```python
def fib(n):
    if n <= 1:
        return n
    table = [0] * (n + 1)
    table[1] = 1
    for i in range(2, n + 1):
        table[i] = table[i - 1] + table[i - 2]   # both already computed
    return table[n]
```

## The mechanical translation

Converting a memoized solution into a tabulated one is a procedure, not an act of invention:

| Memoized | Tabulated |
| --- | --- |
| `f(state)` | `dp[state]` |
| Base case `if …: return v` | Initialise `dp[base] = v` before the loop |
| Recursive call `f(smaller)` | Read `dp[smaller]` |
| Recursion figures out the order | **You choose the loop order** |
| Only reachable states computed | Every state computed |

The one genuinely new decision is the last-but-one row. **Iterate so that every state a
transition reads has already been written.** If the transition reads `dp[i - 1]`, iterate `i`
upward. If it reads `dp[i + 1]`, iterate downward. If it reads both — as in some
interval DP — iterate by increasing interval length rather than by position.

Getting this wrong doesn't raise an error. It reads a zero (or whatever you initialised
with), and the answer is quietly wrong.

## A two-dimensional example

Edit distance: the minimum number of single-character insertions, deletions or substitutions
to turn one string into another.

The state is a pair of prefix lengths — `dp[i][j]` is the distance between the first `i`
characters of `a` and the first `j` of `b`. The transition asks what the last operation was:

```python
def edit_distance(a, b):
    n, m = len(a), len(b)
    dp = [[0] * (m + 1) for _ in range(n + 1)]

    for i in range(n + 1):
        dp[i][0] = i                             # delete every character of a
    for j in range(m + 1):
        dp[0][j] = j                             # insert every character of b

    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]      # free: characters match
            else:
                dp[i][j] = 1 + min(dp[i - 1][j],      # delete from a
                                   dp[i][j - 1],      # insert into b
                                   dp[i - 1][j - 1])  # substitute
    return dp[n][m]
```

O(n · m) time and space. The loop order works because every cell reads only up, left, and
up-left — all written earlier in a row-major sweep.

Two conventions in there are load-bearing. The table is `(n + 1) × (m + 1)` so that "the
empty prefix" has a real row and column, which is what makes the base cases uniform instead
of special. And `a[i - 1]` is the character *at* prefix length `i`, because the table is
indexed by length and the string by position — a one-character offset that is the most
common bug in every 2D DP of this shape.

:::tip[Key insight]
The base case row and column exist so that no cell in the main loop needs an `if` to handle
"there's nothing before me." Building the table one larger than the input, with the empty
case filled in, converts every boundary condition into ordinary arithmetic. Almost every
awkward-looking DP gets simpler with this one change.
:::

## Top-down or bottom-up

| | Memoization | Tabulation |
| --- | --- | --- |
| Order of computation | Discovered by the recursion | Chosen by you |
| Stack | O(depth) — can overflow | None |
| Constant factor | Hash + call per state | Array index |
| States computed | Only reachable ones | All of them |
| Easier to write | **Usually** | Once the order is clear |
| Space optimisation | Hard | **Easy** — see the next page |

The practical advice is to write the memoized version first, and convert when you have a
concrete reason: recursion depth, constant factor, or wanting the space optimisation on the
next page. Converting a *working* solution is mechanical; writing bottom-up from scratch
means designing the state, the transition and the iteration order simultaneously, which is
three things at once.

The exception is when the state space is sparse. A DP over sums up to 10⁹ where only a few
thousand sums are reachable should stay memoized — the table would be mostly empty and
mostly unaffordable.

## Reconstructing the answer, not just its value

Both forms give you the optimal *value*. Recovering the actual sequence of decisions — the
edit script, the chosen items, the path — needs one of two things.

**Walk the table backwards.** Start at the final cell and, at each step, work out which
predecessor produced the recorded value, moving there. No extra memory, a little extra logic.

**Store a parent pointer per cell.** Record which choice was taken as you fill the table.
Simpler to write, O(states) extra memory, and incompatible with the space optimisation on the
next page — which is the usual reason to prefer walking backwards.

Worth deciding early: the rolling-array optimisation discards the history that backward
reconstruction needs, so "I want the actual answer, not just its cost" and "I want O(n)
space" are in tension.

## What to take away

- Tabulation computes the same states in a pre-chosen order, removing the recursion and the hashing.
- The translation from memoized code is mechanical, except for choosing the iteration order.
- Iterate so every value a transition reads is already written; getting this wrong reads a zero and fails silently.
- Size the table one larger than the input and fill the empty-prefix base cases, so the main loop needs no boundary checks.
- Reconstructing the decisions needs either a backward walk or parent pointers — and parent pointers rule out the space optimisation.

## References

- [Cormen, Leiserson, Rivest & Stein — *Introduction to Algorithms*, 4th ed.](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/), Chapter 14
- [Wagner & Fischer — *The String-to-String Correction Problem*](https://dl.acm.org/doi/10.1145/321796.321811), JACM 1974 — the edit-distance table above
- [Python — `difflib`](https://docs.python.org/3/library/difflib.html) — a production sequence-comparison implementation
