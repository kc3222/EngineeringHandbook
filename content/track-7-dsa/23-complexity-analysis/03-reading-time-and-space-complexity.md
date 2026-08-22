---
title: "Reading Time & Space Complexity"
description: "Counting loops, recursion and nested structures — plus the operations that cost far more than the syntax suggests."
track: 7
chapter: 23
page: 3
readMinutes: 5
---

## Counting loops

The mechanical part is genuinely mechanical. Work out how many times each loop body
runs, multiply nested loops, add sequential ones, and keep the dominant term.

```python
for x in items:          # n iterations
    process(x)           # O(1) each        -> O(n)

for x in items:          # n
    for y in items:      # n
        compare(x, y)    # O(1)             -> O(n²)

for x in items:          # n
    process(x)
for y in items:          # n
    process(y)           #                  -> O(n) + O(n) = O(n)
```

Two nested loops over the *same* collection is O(n²). Two nested loops over *different*
collections is O(n·m), and collapsing that to O(n²) is a mistake worth avoiding — if one
collection is a fixed set of eight status codes, the loop over it is a constant factor,
not a second dimension.

The one that catches people is a loop whose bound depends on the outer index:

```python
for i in range(n):
    for j in range(i, n):
        ...
```

The body runs n + (n−1) + … + 1 = n(n+1)/2 times. That's still O(n²) — halving a
quadratic leaves it quadratic — but the reasoning has to go through the sum rather than
through "two loops, so squared."

## Recursion

For recursion, count the number of calls and multiply by the work done per call.

```python
def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)
```

Each call spawns two more and the depth is n, so the call count grows like 2ⁿ. Constant
work per call gives O(2ⁿ) time, and O(n) space for the deepest stack — only one root-to-leaf
path is live at a time. Chapter 28 is largely about what to do with functions shaped
like this one.

Divide-and-conquer is the friendlier shape. Merge sort splits into two halves and does
linear work merging them: log n levels of recursion, O(n) of merging per level, so
O(n log n) overall. The same "levels × work per level" reading handles most recursive
algorithms without needing the formal machinery of the master theorem.

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
| `sorted(items)` | — | O(n log n) |
| `min(items)` / `max(items)` / `sum(items)` | O(1) | O(n) |

The membership test is the single most common one. This looks linear and is quadratic:

```python
seen = []
for x in items:
    if x not in seen:      # O(len(seen)) — this is the loop you didn't write
        seen.append(x)
```

Changing `seen` to a `set` makes it genuinely O(n). Nothing else about the code changes,
which is exactly why the bug survives review.

String concatenation in a loop is the second. Because strings are immutable in Python,
Java and JavaScript, each `+=` allocates a new string and copies everything accumulated
so far — 1 + 2 + 3 + … + n character copies, which is O(n²). The fix is to collect the
pieces and join once:

```python
parts = []
for chunk in chunks:
    parts.append(chunk)
return "".join(parts)      # O(total length)
```

:::tip[Key insight]
Complexity is a property of the operations you invoke, not of the lines you write. A
one-line body containing `in`, a slice, or a string concatenation may be hiding an entire
loop. When you analyse a function, look up what its calls cost rather than assuming that
short means cheap.
:::

## Reading space the same way

The same counting works on allocation. What matters is the maximum *live* at once, not
the total ever created.

```python
def dedupe(items):
    seen = set()             # grows to O(n)
    out = []                 # grows to O(n)
    for x in items:
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out               # O(n) auxiliary space
```

A generator version of the same function is O(n) too — `seen` still grows — but dropping
`out` halves the constant and, more importantly, means the caller can stop early without
having paid for the whole result.

Recursion's stack cost is the part most often forgotten. A recursive depth-first search
on a tree costs O(h) space for height h: O(log n) on a balanced tree, O(n) on a
degenerate one. That distinction is the difference between a working traversal and a
stack overflow on a linked-list-shaped input, and it shows up again in Chapter 26.

## What to take away

- Nested loops multiply, sequential loops add, and only the dominant term survives.
- For recursion, count calls and multiply by per-call work; for divide-and-conquer, count levels and multiply by per-level work.
- `in` on a list, slicing, front insertion and string `+=` are loops wearing the syntax of single operations.
- Space means maximum live allocation, and recursion depth counts toward it.
- When in doubt, look the operation up. Language documentation states these costs; guessing from syntax does not.

## References

- [Python — TimeComplexity wiki](https://wiki.python.org/moin/TimeComplexity) — per-operation costs for `list`, `set`, `dict` and `deque` in CPython
- [Python — `collections.deque`](https://docs.python.org/3/library/collections.html#collections.deque) — O(1) appends and pops at both ends, unlike `list`
- [Cormen, Leiserson, Rivest & Stein — *Introduction to Algorithms*, 4th ed.](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/), Chapter 4 ("Divide-and-Conquer")
