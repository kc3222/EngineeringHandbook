---
title: "Sliding Window"
description: "Fixed and variable width, and the expand/contract invariant — stated explicitly, because it's the part that makes the pattern correct."
track: 7
chapter: 27
page: 3
readMinutes: 5
---

## A range that moves instead of restarting

Any question about *contiguous* subarrays or substrings can be answered by checking all of
them, of which there are n(n+1)/2 — O(n²) ranges, and O(n³) if evaluating each one takes a
pass of its own.

The sliding window observation is that consecutive ranges overlap almost entirely. Moving
from `[i, j]` to `[i, j+1]` adds one element and removes none; moving from `[i, j]` to
`[i+1, j]` removes one and adds none. If the property you're tracking can be updated
incrementally under those two operations, every range costs O(1) to evaluate instead of
O(n), and the whole scan is linear.

That "if" is the real precondition, and it's what decides whether the pattern applies.

## Fixed width

The simpler case: the window is always exactly k wide, so it moves rather than growing.

```python
def max_sum_of_k(nums, k):
    window = sum(nums[:k])
    best = window
    for i in range(k, len(nums)):
        window += nums[i] - nums[i - k]      # add the entering, remove the leaving
        best = max(best, window)
    return best
```

One line does the work. The window total is never recomputed, only adjusted, which is what
takes this from O(n·k) to O(n).

The same shape handles moving averages, rolling counts, and any "best block of exactly k"
question. Where the tracked property is a maximum rather than a sum, the incremental update
is harder — removing the current maximum leaves you needing the *next* one — and the answer
is a monotonic deque, which the next-but-one page covers.

## Variable width, and the invariant

The more common and more interesting case: the window grows and shrinks to maintain a
condition, and you want the largest (or smallest) window that satisfies it.

The structure is always the same three parts:

```python
def longest_valid(items, is_ok):
    left = best = 0
    for right in range(len(items)):
        add(items[right])                     # 1. expand right, unconditionally
        while not is_ok():                    # 2. contract left until valid again
            remove(items[left])
            left += 1
        best = max(best, right - left + 1)    # 3. record — window is always valid here
    return best
```

**The invariant is that the window is valid every time line 3 runs.** Expansion may break
it; the `while` loop restores it; nothing between them reads the answer. Writing that
sentence down before writing the loop is what prevents most of the bugs in this pattern.

The concrete version — longest run of a single character, given a budget of substitutions:

```python
def longest_with_budget(s, target, budget):
    left = used = best = 0
    for right, ch in enumerate(s):
        if ch != target:
            used += 1
        while used > budget:                  # too many substitutions
            if s[left] != target:
                used -= 1
            left += 1
        best = max(best, right - left + 1)
    return best
```

:::tip[Key insight]
The contraction loop only removes enough to restore validity — never more. That's why the
widest valid window is always observed: `left` never advances past the point where the
window becomes legal again, so for every `right`, the window ends up as wide as it can
legally be. Contracting too eagerly is the standard bug, and it produces answers that are
correct-looking and too small.
:::

## Why the nested loop isn't quadratic

The `while` inside the `for` reads as O(n²). It isn't, and the argument is amortized:
`left` only ever increases, and it can never exceed n. So across the entire run the inner
loop body executes at most n times *in total*, regardless of how it's distributed. Each
index enters the window once and leaves at most once — O(n) overall.

This is the same argument that makes monotonic stacks linear, and it's worth internalising
because the shape recurs: a nested loop whose inner index is monotonic across the whole run
is linear, not quadratic.

## Shortest rather than longest

Minimising flips the structure. Now the `while` loop is where you record, because the
window becomes valid on entry and you want to shrink it as far as it stays valid:

```python
def shortest_valid(items, is_ok):
    left, best = 0, float('inf')
    for right in range(len(items)):
        add(items[right])
        while is_ok():                        # while STILL valid — not "until"
            best = min(best, right - left + 1)
            remove(items[left])
            left += 1
    return best if best != float('inf') else 0
```

The difference is one word — `while is_ok()` rather than `while not is_ok()` — and the
placement of the record. Getting these two variants confused is the second most common bug
in the pattern, after contracting too eagerly.

## When a window doesn't apply

**The property isn't incrementally updatable.** If removing an element from the left
requires recomputing from scratch, each step is O(k) and the pattern buys nothing. Sums,
counts and frequency maps update in O(1); "the maximum" and "the median" do not, and need a
supporting structure (a monotonic deque, or two heaps).

**Negative values with a sum-based condition.** "Shortest subarray with sum at least k" is
*not* a sliding-window problem when negatives are allowed, because adding an element can
decrease the sum — so the condition isn't monotonic in the window's width and the
contraction logic has no valid stopping rule. The correct tool there is prefix sums with a
monotonic deque. This is the failure that most often gets shipped, because the window
version is right on all-positive test data.

**Non-contiguous selections.** A window is a contiguous range by definition. "Any k
elements" is a different problem.

## What to take away

- A sliding window works when the tracked property updates in O(1) as one element enters and one leaves.
- Fixed width: add the entering element, subtract the leaving one, never recompute.
- Variable width: expand unconditionally, contract only until valid, record where the window is guaranteed valid.
- The `while` inside the `for` is linear because `left` is monotonic — count total advances, not per-iteration ones.
- Negative values break sum-based windows. Check that the condition is actually monotonic in the window width before reaching for this.

## References

- [Laaksonen — *Guide to Competitive Programming*](https://link.springer.com/book/10.1007/978-3-030-39357-1), Section 8.3 ("Sliding window")
- [Python — `collections.Counter`](https://docs.python.org/3/library/collections.html#collections.Counter) — the usual companion structure for character-frequency windows
