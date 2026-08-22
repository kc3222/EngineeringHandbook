---
title: "Monotonic Stacks"
description: "The next-greater-element family — why the stack stays sorted, what that buys, and how to read a problem as belonging to it."
track: 7
chapter: 27
page: 5
readMinutes: 5
---

## Throwing away elements that can never matter

Consider: for each element of an array, find the first element to its right that is larger.
The obvious solution scans right from every position — O(n²), and it repeats an enormous
amount of work, because the scan from position 5 re-examines everything the scan from
position 4 already looked at.

The observation that fixes it is a discard argument, like the ones on the two-pointer page:

> If element `b` comes after element `a` and `b >= a`, then `a` can never be the
> next-greater-element of anything still to come. Anything to the right that would have
> been satisfied by `a` reaches `b` first, and `b` is at least as good.

So the moment `b` arrives, `a` is dead. Permanently. It can be discarded, and the elements
that survive — those still waiting for a larger neighbour — are exactly the ones in
decreasing order. That set is a **monotonic stack**: not a special data structure, just an
ordinary stack maintained with the invariant that its contents are sorted.

## The template

```python
def next_greater(nums):
    result = [-1] * len(nums)
    stack = []                                  # holds indices, values decreasing
    for i, x in enumerate(nums):
        while stack and nums[stack[-1]] < x:    # x resolves everything smaller
            result[stack.pop()] = x
        stack.append(i)
    return result                               # anything left has no greater element
```

Four points about this loop:

**Store indices, not values.** You almost always need the position — to write into the
result array, or to compute a distance — and the value is one lookup away.

**The `while` condition sets the variant.** `<` gives next strictly greater; `<=` gives next
greater-or-equal; flipping to `>` gives next smaller. Four combinations, one loop.

**Whatever is left on the stack at the end has no answer.** That's not an edge case to
handle separately — it's the meaning of the invariant.

**It is O(n), not O(n²).** Each index is pushed exactly once and popped at most once, so the
inner loop runs at most n times *across the entire outer loop*. This is the same amortized
argument as the sliding window: count total inner iterations, not per-outer-iteration ones.

:::tip[Key insight]
The stack is sorted not because anyone sorts it, but because the popping rule removes
exactly the elements that violate the order. The invariant is maintained as a side effect of
discarding what can no longer be useful — which is why the pattern is O(n): each element is
useful for a contiguous stretch of the scan, and then it's gone.
:::

## Reading the pop

The part that turns the template into a solution is knowing what a *pop* means, because that
is where the answer gets recorded.

When index `j` pops index `i`, three facts become true simultaneously, and different
problems want different ones:

- `nums[j]` is the **next greater element** of `nums[i]`.
- `j - i` is the **distance** to it — "how many days until a warmer one."
- Everything strictly between `i` and `j` is smaller than `nums[i]`, so `i` **bounds a range**.

That last one is the least obvious and the most powerful. Combine "next smaller to the left"
with "next smaller to the right" and you have, for every element, the maximal range over
which it is the minimum. That's the mechanism behind the largest-rectangle-in-a-histogram
problem, and behind "sum over all subarrays of their minimum" — both of which look
intimidating and are one monotonic stack each.

## The variants, tabulated

| You want | Stack holds | Pop while |
| --- | --- | --- |
| Next greater to the right | Decreasing values | `stack top < current` |
| Next smaller to the right | Increasing values | `stack top > current` |
| Previous greater to the left | Decreasing values | `stack top <= current`, answer is the new top |
| Previous smaller to the left | Increasing values | `stack top >= current`, answer is the new top |

Left-side variants are the same single pass — the answer for the current element is whatever
remains on top of the stack *after* popping, rather than being written into a popped
element's slot. There's no need to iterate backwards.

For circular arrays — where the search wraps around — iterate the array twice (`for i in
range(2 * n)`, indexing with `i % n`) and only push during the first pass. Two passes is
enough because no element needs to look further than one full lap.

## The monotonic deque

The same invariant on a double-ended queue solves the sliding-window-maximum problem, which
the *Sliding Window* page flagged as the case where the window property doesn't update in
O(1).

The deque holds indices in decreasing value order. New elements pop smaller ones from the
back (they can never be the maximum while a larger, newer element exists); indices that have
fallen out of the window are removed from the front. The front is therefore always the
window's maximum.

```python
from collections import deque

def window_max(nums, k):
    dq, out = deque(), []                       # indices, values decreasing
    for i, x in enumerate(nums):
        while dq and nums[dq[-1]] <= x:
            dq.pop()                            # smaller and older: useless
        dq.append(i)
        if dq[0] <= i - k:
            dq.popleft()                        # fell out of the window
        if i >= k - 1:
            out.append(nums[dq[0]])
    return out
```

O(n) time, O(k) space. The alternative — a heap — is O(n log k) and needs lazy deletion,
because a heap can't remove an arbitrary element that has left the window.

## Recognising the pattern

The tells are consistent:

- The words "next", "previous", "nearest" combined with "greater", "smaller", "warmer", "taller".
- Asking for a **span** or a **distance until** a condition first holds.
- Anything about a histogram, skyline, or rectangle bounded by heights.
- "Sum/count over all subarrays of the minimum/maximum" — the contribution technique built on ranges.
- A stock-span or "how many consecutive prior days were lower" question.

The negative signal is equally useful: if the query is about a *sum* over a range rather than
an *extreme*, prefix sums are the tool, not a stack.

## What to take away

- A monotonic stack keeps only the elements that can still be someone's answer; the ordering is a consequence of the discard rule.
- It's O(n) because each element is pushed once and popped once — count total inner iterations.
- Store indices. The pop is where the answer is recorded, and it simultaneously gives the next element, the distance, and a bounded range.
- Four variants come from two choices: which direction, and strict or non-strict comparison.
- The deque version gives sliding-window maximum in O(n), which a heap cannot match.

## References

- [Laaksonen — *Guide to Competitive Programming*](https://link.springer.com/book/10.1007/978-3-030-39357-1), Section 8.4
- [Python — `collections.deque`](https://docs.python.org/3/library/collections.html#collections.deque)
- [Cormen, Leiserson, Rivest & Stein — *Introduction to Algorithms*, 4th ed.](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/), Chapter 16 — the amortized argument that makes this linear
