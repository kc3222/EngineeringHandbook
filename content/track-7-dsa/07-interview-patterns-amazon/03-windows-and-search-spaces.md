---
title: "Windows and Search Spaces"
description: "A power budget across adjacent machines and a calendar of convertible days — two problems that are binary search on the answer and a sliding window."
track: 7
chapter: 7
page: 3
readMinutes: 5
---

Both problems below ask for the *largest* something subject to a budget. That phrasing is
the signal from **Algorithmic Patterns**, and which of the two patterns applies depends on
one question: does the cost of a block depend on its width in a way that a running total
can't track?

## Adjacent Machines Within a Power Budget

:::problem
Each machine in a rack has a base draw and a boosted draw. Running a block of
`k` **adjacent** machines costs the sum of their base draws plus the sum of
their boosted draws multiplied by `k`. Given a ceiling, return the largest
block that can run, or `0` if none can.

```text
Input:  power = [3, 6, 1, 3, 4], boosted = [2, 1, 1, 1, 2],
        power_max = 25
Output: 3
Explanation: The block at index 1..3 costs (6+1+3) + (1+1+1)*3
             = 19, within budget. No block of 4 fits: the
             cheapest is index 1..4 at (6+1+3+4) + (1+1+1+2)*4
             = 34.

Input:  power_max = 15  ->  2    index 2..3 costs 4 + 2*2 = 8
Input:  power_max = 3   ->  1    index 2 costs 1 + 1*1 = 2
```

**Constraints.** `1 <= len(power) <= 10**5`; all draws are **non-negative** —
the precondition the solution turns on.
:::

<details>
<summary>Show solution</summary>

**Approach.** The multiplication by k is what rules out a plain sliding window: the cost of a
window depends on its own width, so growing the window by one changes the contribution of
every element already in it. There's no O(1) incremental update, which is the sliding
window's precondition.

But the cost of a block *grows* with its width, so the set of feasible widths is a prefix —
which makes the width binary-searchable. And checking a *fixed* width is one sliding-window
pass, because at a fixed k the two running sums do update in O(1).

Two patterns composed: binary search on the answer, with a window as the feasibility check.

```python
def max_adjacent(power, boosted, power_max):
    n = len(power)

    def fits(k):
        p, b = sum(power[:k]), sum(boosted[:k])
        if p + b * k <= power_max:
            return True
        for i in range(k, n):
            p += power[i] - power[i - k]
            b += boosted[i] - boosted[i - k]
            if p + b * k <= power_max:
                return True
        return False

    lo, hi, best = 1, n, 0
    while lo <= hi:
        mid = (lo + hi) // 2
        if fits(mid):
            best, lo = mid, mid + 1
        else:
            hi = mid - 1
    return best
```

Time O(n log n), space O(1).

**The precondition.** Binary search on the answer requires monotonicity, and here that
requires non-negative draws. A machine that fed power back into the rack would break the
assumption — a wider block could then be *cheaper* than a narrower one, the feasible widths
would stop forming a prefix, and the search would return a plausible wrong answer rather
than failing. Stating the precondition out loud is a large part of what a question like this
tests. Back-reference: Chapter 5, *Binary Search Beyond Sorted Arrays*.

**Follow-up.** The `best`-tracking loop form used here (`lo <= hi`, with `best` updated on
success) is an alternative to the boundary template on that page. Both are correct; mixing
them is not. Pick one form and use it everywhere, because the off-by-one errors in binary
search come almost entirely from half-remembering two templates at once.

</details>

## Longest Holiday Streak

:::problem
A calendar is a string of work days (`w`) and holidays (`h`). Given a budget
of days that may be converted from work to holiday, return the longest
unbroken run of holidays that can be arranged.

```text
Input:  days = "hwwhhwh", budget = 1
Output: 4
Explanation: Convert the w at index 5, giving "hwwhhhh" — a
             run of 4 from index 3 to 6.

Input:  days = "hwwhhwh", budget = 2   ->  5
Explanation: Convert both w's at index 1 and 2, giving a run
             of 5 from index 0 to 4.

Input:  days = "hwwhhwh", budget = 0   ->  2  (index 3..4)
```

**Constraints.** `0 <= budget <= len(days) <= 10**5`.
:::

<details>
<summary>Show solution</summary>

**Approach.** Here the cost of a window *is* trackable incrementally — it's just the count of
work days inside it, which changes by one as each element enters or leaves. So this is the
plain variable-width sliding window: expand right freely, contract left whenever conversions
exceed the budget.

```python
def longest_holiday(days, budget):
    left = used = best = 0
    for right, day in enumerate(days):
        if day == 'w':
            used += 1
        while used > budget:
            if days[left] == 'w':
                used -= 1
            left += 1
        best = max(best, right - left + 1)
    return best
```

Time O(n), space O(1). Each index enters and leaves the window once, which is why the nested
loop is linear rather than quadratic.

**Why the window never shrinks past the answer.** The contraction loop only removes enough to
restore validity — never more. So for every right endpoint, the window ends up as wide as it
can legally be, and the widest valid window overall is necessarily observed at some point.
Being able to state that invariant *is* the pattern; without it, the code is a plausible
guess. Back-reference: Chapter 5, *Sliding Window*.

**Follow-up.** A common extension asks for the longest run of *either* value, with the same
conversion budget. Running the function twice — once for each target — is the obvious answer
and is correct. The single-pass version tracks the count of the *minority* value in the
window instead, which is more elegant and considerably easier to get wrong; two passes over
the same array is O(n) either way, and the two-pass version is the one you can still read in
six months.

</details>

## The distinguishing question

Both problems are "largest block subject to a budget". They take different approaches
because of one property:

| | Adjacent machines | Holiday streak |
| --- | --- | --- |
| Does window cost update in O(1) as it grows? | **No** — cost scales with k | Yes — one more work day |
| Is feasibility monotonic in width? | Yes | Yes |
| Approach | Binary search the width, window checks it | Window directly |
| Complexity | O(n log n) | O(n) |

The window is the cheaper tool and applies whenever the cost is incrementally maintainable.
When it isn't — but feasibility is still monotonic — binary search on the answer recovers
the situation for one extra log factor, using a fixed-width window as its check. That
composition is worth recognising as a unit, because it comes up whenever a cost is
superlinear in the size of the thing being chosen.

## What to take away

- "Largest / smallest X subject to a budget" points at a window or a binary search; which one depends on whether the cost updates incrementally.
- A cost that scales with the block's own width defeats the plain window, but leaves feasibility monotonic — so binary search the width and window-check each candidate.
- The monotonicity precondition rests on a stated non-negativity constraint. Say why it holds; a violation fails silently.
- The sliding window's correctness is the contraction invariant: contract only until valid, then record.
- Choose one binary-search template and reuse it. Two half-remembered templates is where the off-by-ones come from.
