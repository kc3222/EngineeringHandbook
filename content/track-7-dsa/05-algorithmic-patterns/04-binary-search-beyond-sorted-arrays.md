---
title: "Binary Search Beyond Sorted Arrays"
description: "Searching the answer space rather than the input, with predicate monotonicity as the real precondition."
track: 7
chapter: 5
page: 4
readMinutes: 5
---

## Binary search doesn't need an array

Binary search is taught as "find a value in a sorted array," which describes one
application and hides the mechanism. What binary search actually needs is a **space of
candidates** and a **predicate that is false up to some point and true from then on**:

```text
predicate:   F  F  F  F  T  T  T  T  T
                        ^
                 the boundary you're looking for
```

Sortedness is one way to get that shape — "is `nums[i] >= target`" is false then true on a
sorted array — but it is not the only way, and it's not the interesting one. The powerful
version searches the space of *possible answers*, evaluating each candidate with a feasibility
check that has nothing to do with array order.

## The template

Write it once, in a form that returns the boundary rather than an exact match, and reuse it.
This version returns the smallest value for which the predicate holds:

```python
def smallest_feasible(lo, hi, feasible):
    while lo < hi:
        mid = lo + (hi - lo) // 2        # avoids overflow in fixed-width languages
        if feasible(mid):
            hi = mid                      # mid might be the answer — keep it
        else:
            lo = mid + 1                  # mid is not — discard it
    return lo                             # lo == hi, the boundary
```

Three details are what make this version reliable:

**The loop is `lo < hi`, not `lo <= hi`.** The invariant is "the answer is in `[lo, hi]`",
and the loop ends when that range has one element. There's no separate post-loop check to
get wrong.

**`hi = mid`, not `mid - 1`.** Because `mid` might itself be the answer, it stays in the
range. Pairing `hi = mid` with `lo = mid + 1` is what guarantees progress: the range strictly
shrinks each iteration.

**`lo + (hi - lo) // 2`, not `(lo + hi) // 2`.** In fixed-width languages the second form
overflows for large indices — this was a real bug in the Java standard library's binary
search, unnoticed for nine years. Python doesn't overflow, but the habit is worth keeping
and the reason is worth knowing.

For ordinary sorted-array searching, don't write any of this: `bisect_left` and
`bisect_right` in Python, `Collections.binarySearch` in Java, `std::lower_bound` in C++.
Hand-rolled binary search is where off-by-one bugs live, and the standard library's version
has been correct for decades.

## Binary search on the answer

The pattern worth the page. When a problem asks for a **minimum capacity**, **maximum
size**, or **smallest speed** such that something is achievable, the answer lives in a range
you can enumerate, and checking a single candidate is usually easy. So search the candidates
rather than constructing the answer directly.

The shape is always:

1. Identify the range of possible answers — usually obvious from the input.
2. Write `feasible(x)`: given this candidate, can the goal be met? Usually a single linear pass.
3. Confirm monotonicity: if `x` works, does everything above it work?
4. Binary search.

```python
def min_capacity(loads, days):
    def feasible(cap):
        used, current = 1, 0
        for load in loads:
            if current + load > cap:
                used, current = used + 1, 0    # start a new day
            current += load
        return used <= days

    lo, hi = max(loads), sum(loads)            # must fit the largest; all-at-once always works
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if feasible(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo
```

O(n log S) where S is the sum — the `feasible` check is O(n) and runs about log S times.
The bounds matter as much as the search: `max(loads)` because no capacity below the largest
single item can ever work, and `sum(loads)` because everything in one batch trivially works.

:::tip[Key insight]
The precondition is **predicate monotonicity**, not sorted input. If capacity 40 is
sufficient then capacity 41 must also be sufficient — that's what licenses discarding half
the space. Stating this out loud is a real step, not a formality: applying binary search to a
non-monotonic predicate produces a plausible wrong answer rather than an error, and it
usually passes small test cases.
:::

## Where monotonicity comes from, and where it breaks

Monotonicity is usually a consequence of a physical constraint that the problem states in
passing. In the example above it holds because loads are non-negative: a larger capacity can
never require *more* batches. If a load could be negative — an item that frees up capacity —
the relationship breaks, and so does the algorithm.

That's the check worth running every time. "More budget can't make things worse" and "a
larger threshold can't reduce the count" are the sorts of assumptions that hold in almost
every real problem and quietly fail in a few, and they're exactly what makes the search
valid.

## Other shapes that binary search handles

**Rotated sorted arrays.** Not globally sorted, but at every midpoint one half *is* sorted,
and you can determine which — enough to discard the other. The predicate is about the
structure rather than the values.

**Real-valued answers.** When the answer is a float, loop a fixed number of times (a hundred
iterations halves the interval to nothing measurable) rather than comparing for equality.

**Peak finding.** An array where no two neighbours are equal always has a local maximum
findable in O(log n) by comparing `mid` with `mid + 1` and moving uphill. Notably, this
needs no sortedness at all — only a local comparison.

**Search in a matrix sorted by rows and columns.** Start at a corner where one direction
increases and the other decreases, and eliminate a row or column per step: O(m + n).

## What to take away

- Binary search needs a monotonic predicate over a candidate space, not a sorted array.
- Use one template that returns a boundary: `lo < hi`, `hi = mid`, `lo = mid + 1`.
- Compute the midpoint as `lo + (hi - lo) // 2` — the naive form is a real overflow bug in fixed-width languages.
- For "minimum X such that Y is achievable", binary search X and write a linear feasibility check.
- Always state why the predicate is monotonic. Where it isn't, the algorithm fails silently.
- For plain sorted-array lookups, use `bisect` rather than writing it.

## References

- [Python — `bisect`](https://docs.python.org/3/library/bisect.html)
- [Bloch — *Nearly All Binary Searches and Mergesorts Are Broken*](https://research.google/blog/extra-extra-read-all-about-it-nearly-all-binary-searches-and-mergesorts-are-broken/) — the midpoint overflow bug in the JDK
- [Cormen, Leiserson, Rivest & Stein — *Introduction to Algorithms*, 4th ed.](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/), Section 2.3 and Exercise 2.3-6
