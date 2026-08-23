---
title: "Two Pointers"
description: "Opposite-end and same-direction variants, the sorted-input signal, and the argument that makes an O(n²) search into an O(n) one."
track: 7
chapter: 5
page: 2
readMinutes: 4
---

## Two indices, one pass

The naive way to examine pairs in a sequence is a nested loop: O(n²), and it examines every
pair including the obviously useless ones. The two-pointer pattern maintains two indices
that each move in one direction only, so their combined travel is O(n).

What makes it correct is always the same argument: **when you move a pointer, you must be
able to prove that everything you skipped can be discarded.** Without that proof it's just
a loop that happens to have two variables.

## Opposite ends, converging

Start one pointer at each end and move them toward each other. This works when the input is
**sorted**, because sortedness is what licenses the discard.

```python
def two_sum_sorted(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo < hi:
        total = nums[lo] + nums[hi]
        if total == target:
            return lo, hi
        if total < target:
            lo += 1                  # need more; only a larger left value helps
        else:
            hi -= 1                  # need less; only a smaller right value helps
    return None
```

The proof is one sentence per branch. If the sum is too small, `nums[lo]` paired with
*anything* still available is too small — `nums[hi]` was the largest remaining candidate —
so `lo` can never be part of the answer and is discarded permanently. The mirror argument
handles the other branch. Each step eliminates a whole row or column of the pair space,
which is why n steps suffice where n² comparisons would otherwise be needed.

This shape covers pair-sum problems, three-sum (fix one element, two-pointer the rest for
O(n²) instead of O(n³)), palindrome checking, reversing in place, and container-style
problems where the answer depends on a span between two positions.

:::tip[Key insight]
Sorted input is the signal, and the reason is not that sorting makes the data tidy — it's
that sortedness gives you the *proof of discard*. Moving a pointer inward is only valid if
everything it passes over is provably irrelevant, and monotonic order is what supplies
that. Where the input isn't sorted, ask whether sorting it (O(n log n)) still beats the
quadratic alternative. It usually does.
:::

## Same direction, at different speeds

The second family has both pointers moving forward, one lagging behind. Here the trailing
pointer usually marks a boundary — "everything before this is finalised."

The in-place filter is the canonical form:

```python
def remove_value(nums, target):
    write = 0
    for read in range(len(nums)):        # read runs ahead
        if nums[read] != target:
            nums[write] = nums[read]     # write lags, marking the kept prefix
            write += 1
    return write                          # nums[:write] is the result
```

`read` visits every element; `write` advances only for keepers. The invariant —
`nums[:write]` always holds exactly the kept elements so far — is what makes the
in-place overwrite safe, since `write` can never overtake `read`.

The same structure handles deduplicating a sorted array, partitioning around a pivot, and
compacting any sequence in place with O(1) extra space.

## Fast and slow pointers

A variant where the pointers move at different rates, most often on linked structures.

**Finding the middle:** advance one pointer by one and the other by two. When the fast one
reaches the end, the slow one is at the midpoint — one pass, no length computation, no
second traversal.

**Cycle detection (Floyd's algorithm):** if a linked list contains a cycle, a pointer
moving two steps per tick will eventually lap one moving at one step per tick, because
inside the cycle the gap between them closes by exactly one each tick. If there's no
cycle, the fast pointer runs off the end.

```python
def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
        if slow is fast:
            return True
    return False
```

O(n) time and **O(1) space** — the space is the point, since the obvious alternative is a
hash set of visited nodes. The same idea detects cycles in any function iterated on itself,
which is where it appears in factorisation algorithms and in random-number-generator period
detection.

## When two pointers is the wrong tool

**Unsorted input where sorting destroys the answer.** If the problem asks for original
indices, sorting has to carry them along, and at that point a hash map is often simpler.
Unsorted two-sum is a one-pass hash map problem, not a two-pointer one.

**Non-contiguous selections.** Two pointers delimit a range or a pair. "Pick any k elements
subject to a condition" is not a range, and usually wants sorting plus a heap, or dynamic
programming.

**When the discard argument doesn't hold.** If moving a pointer can skip over the answer,
the pattern is simply wrong — and this failure is silent, producing a plausible answer on
most inputs. Being able to state the discard proof is the check that the pattern applies.

## What to take away

- Two pointers replaces a nested loop by moving each index in one direction only, giving O(n) total travel.
- The pattern is valid exactly when you can prove that whatever a pointer passes over is irrelevant.
- Converging pointers need sorted input; that's what supplies the proof.
- Same-direction pointers maintain a boundary invariant, which is what makes in-place compaction safe.
- Fast/slow pointers find midpoints and cycles in O(1) space.

## References

- [Cormen, Leiserson, Rivest & Stein — *Introduction to Algorithms*, 4th ed.](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/), Chapter 7 (partitioning is a same-direction two-pointer scan)
- [Knuth — *The Art of Computer Programming*, Vol. 2, §3.1, Exercise 6](https://www-cs-faculty.stanford.edu/~knuth/taocp.html) — Floyd's cycle-finding algorithm
