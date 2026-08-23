---
title: "Reading Time & Space Complexity"
description: "Counting loops and recursion, the operations that cost far more than the syntax suggests, and how to decide which of the two budgets to spend."
track: 7
chapter: 1
page: 3
readMinutes: 5
---

## Counting loops and recursion

The mechanical part is genuinely mechanical: work out how many times each loop body runs,
multiply nested loops, add sequential ones, keep the dominant term.

Two nested loops over the *same* collection is O(n²). Over *different* collections it's
O(n·m), and collapsing that to O(n²) is worth avoiding — if one collection is a fixed set
of eight status codes, it's a constant factor, not a second dimension.

The one that catches people is a bound that depends on the outer index — `for j in
range(i, n)` inside `for i in range(n)` runs n + (n−1) + … + 1 = n(n+1)/2 times. Still
O(n²), but the reasoning goes through the sum rather than through "two loops, so squared."

For recursion, count the calls and multiply by the work per call. `fib(n)` spawns two calls
per level to depth n, so the call count grows like 2ⁿ: O(2ⁿ) time, and O(n) space for the
deepest stack, since only one root-to-leaf path is live at a time.

Divide-and-conquer is friendlier. Merge sort splits in half and does linear work merging:
log n levels, O(n) per level, so O(n log n). That "levels × work per level" reading handles
most recursive algorithms without the formal machinery.

## The costs the syntax hides

This is where most real miscounts happen. A line that looks like one operation is
sometimes a loop in disguise.

| Operation | Looks like | Actually |
| --- | --- | --- |
| `x in some_list` | O(1) | **O(n)** — linear scan |
| `x in some_set` / `some_dict` | O(1) | O(1) average |
| `items[1:]` (Python slice) | O(1) | **O(k)** — copies k elements |
| `list.insert(0, x)` / `list.pop(0)` | O(1) | **O(n)** — shifts everything |
| `s += chunk` in a loop (immutable strings) | O(1) per step | **O(n²)** total |
| `min(items)` / `max(items)` / `sum(items)` | O(1) | O(n) |

The membership test is the most common. This looks linear and is quadratic:

```python
seen = []
for x in items:
    if x not in seen:      # O(len(seen)) — the loop you didn't write
        seen.append(x)
```

Changing `seen` to a `set` makes it genuinely O(n). Nothing else changes, which is exactly
why the bug survives review.

String concatenation in a loop is the same trap: because strings are immutable in Python,
Java and JavaScript, each `+=` copies everything accumulated so far, so a loop of n
appends does 1 + 2 + … + n character copies. Collect the pieces and `"".join(parts)` once.

:::tip[Key insight]
Complexity is a property of the operations you invoke, not of the lines you write. A
one-line body containing `in`, a slice, or a string concatenation may be hiding an entire
loop. Look up what your calls cost rather than assuming short means cheap.
:::

## Reading space the same way

The same counting works on allocation, and what matters is the maximum *live* at once, not
the total ever created. A dedupe holding a `seen` set and an `out` list is O(n) auxiliary;
making it a generator is still O(n) — `seen` still grows — but drops a constant and lets
the caller stop early.

Recursion's stack cost is the part most often forgotten. A recursive depth-first search
costs O(h) space for height h: O(log n) on a balanced tree, O(n) on a degenerate one —
the difference between a working traversal and a stack overflow on a linked-list-shaped
input. Chapter 4 returns to it.

## Which budget are you spending?

Counting both numbers is only useful if you then decide which one to spend. Almost every
optimisation is a trade in one direction or the other:

- **Space buys time.** A hash map, a database index, a memo table, a precomputed lookup — each stores something so you don't have to recompute or rescan it.
- **Time buys space.** Recomputing instead of caching, streaming instead of materialising, sorting in place instead of building a second structure.

The two budgets are not symmetric, and that asymmetry settles most real arguments:
**going over on time is a gradient, going over on memory is a wall.** An endpoint that
takes 800 ms instead of 200 ms is slow; a process that wants 9 GB on an 8 GB machine is
killed. When one of the two has to be bounded up front, it's usually memory.

### Sort or hash map

The concrete version of the trade, and the one that comes up most often: you have a pile
of values and you need duplicates, pairs, groupings or an intersection.

| | Sort, then scan | Hash map |
| --- | --- | --- |
| Time | O(n log n), guaranteed | O(n) average, O(n²) worst |
| Extra space | O(1) if sorted in place | O(n), always |
| Keys must be | Comparable | Hashable |
| Gives you order | Yes, free | No |
| Memory access | Sequential | Random probes |

**Reach for the hash map** when time is the binding constraint and n is large enough for
the log factor to matter, when order is irrelevant, when you need the original positions
(sorting destroys them unless you pay to carry them), or when the keys have no natural
ordering.

**Reach for sorting** when memory is tight or the data doesn't fit in it, when you need
the sorted order anyway, when you want a worst case that holds even against
attacker-chosen keys, or when the data lives on disk — external merge sort is a solved
problem and external hashing is considerably worse.

Finding a pair that sums to a target is the clean illustration. Sorting and walking two
pointers is O(n log n) time and O(1) space; a hash map is O(n) time and O(n) space. But if
the answer has to be the *original indices*, sorting must carry them along, which costs
O(n) space anyway — the trade collapses and the hash map simply wins. Worth checking
before agonising: the two costs are sometimes not actually in tension.

Databases make this call on every query: a hash join builds a table on the smaller relation
(fast, memory-hungry), a merge join sorts both sides (slower, streams within bounded
memory). The planner chooses on estimated row counts and available work memory — the
reasoning above with the numbers filled in.

One wrinkle the notation hides: at moderate n the asymptotically worse option often wins.
Sorting a contiguous array is sequential access the hardware prefetches, while hashing is a
random probe plus an allocation per entry. The crossover sits further right than O(n)
versus O(n log n) suggests, which is why "just use a set" stops being automatic once the
collection is small or the loop is hot.

## What to take away

- Nested loops multiply, sequential loops add, and only the dominant term survives.
- For recursion, count calls times per-call work; for divide-and-conquer, levels times per-level work.
- `in` on a list, slicing, front insertion and string `+=` are loops wearing the syntax of single operations.
- Space means maximum live allocation, and recursion depth counts toward it.
- Space buys time and time buys space, but the budgets aren't symmetric — overrunning time is a gradient, overrunning memory is a crash. Bound memory first.
- Sort when memory is the constraint, when you need the order, or when you need a worst case that holds; hash when time is the constraint or positions matter.
- Check whether the trade is real before making it — needing original indices makes sorting pay the O(n) space anyway.
- When in doubt, look the operation up. Language documentation states these costs; guessing from syntax does not.

## References

- [Python — TimeComplexity wiki](https://wiki.python.org/moin/TimeComplexity) — per-operation costs for `list`, `set`, `dict` and `deque` in CPython
- [Python — `collections.deque`](https://docs.python.org/3/library/collections.html#collections.deque) — O(1) appends and pops at both ends, unlike `list`
- [Cormen, Leiserson, Rivest & Stein — *Introduction to Algorithms*, 4th ed.](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/), Chapter 4 ("Divide-and-Conquer")
- [PostgreSQL — Planner: join methods](https://www.postgresql.org/docs/current/planner-optimizer.html) and [`work_mem`](https://www.postgresql.org/docs/current/runtime-config-resource.html#GUC-WORK-MEM) — the hash-join versus merge-join decision, and the memory budget it turns on
