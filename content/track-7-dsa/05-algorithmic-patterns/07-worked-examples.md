---
title: "Worked Examples"
description: "Five problems, one per pattern — longest substring without repeats, container with most water, minimum capacity, next greater element, range sum queries — plus this chapter's failure modes."
track: 7
chapter: 5
page: 7
readMinutes: 5
---

One problem per pattern. Each is stated in a scenario; the useful first move is to strip
the scenario and name the shape, using the signal table from this chapter's first page.
Solutions are collapsed.

## Longest Run Without a Repeat

:::problem
Given a sequence of events, find the length of the longest contiguous stretch in which no
event type occurs twice.

```text
Input:  events = ["login", "view", "view", "cart", "login"]
Output: 3
Explanation: ["view", "cart", "login"] spans index 2 to 4 with
             no repeat. Any stretch holding both "view"s or
             both "login"s is invalid, so 3 is the maximum.

Input:  events = ["a", "b", "c", "a", "b", "c", "d"]
Output: 4
Explanation: ["a", "b", "c", "d"] at index 3 to 6.
```

**Constraints.** `0 <= len(events) <= 10**5`; event types are hashable.
:::

<details>
<summary>Show solution</summary>

**Approach.** "Longest contiguous ... such that" is the variable-width sliding window
signal. The tracked property is "no duplicates", which updates in O(1) if you keep the last
seen position of each event type in a hash map.

The efficient form doesn't contract one step at a time. When a repeat is found, `left` jumps
straight past the previous occurrence — but only forward, never backward, which is what the
`max` guards. Omitting that guard is the classic bug: a stale entry for an event type that
already fell out of the window would drag `left` backwards and admit duplicates.

```python
def longest_unique(events):
    last_seen = {}
    left = best = 0
    for right, e in enumerate(events):
        if e in last_seen and last_seen[e] >= left:
            left = last_seen[e] + 1              # jump past the earlier copy
        last_seen[e] = right
        best = max(best, right - left + 1)
    return best
```

Time O(n), space O(distinct events).

**Follow-up.** Generalising to "at most k distinct types" swaps the map of last positions for
a map of counts, and restores the ordinary expand/contract loop — `while len(counts) > k`.
That version is the more common template, and it's worth writing both to see that the
jump-ahead here is an optimisation of it rather than a different pattern.

</details>

## The Widest Useful Span

:::problem
A row of vertical posts of varying heights stands on flat ground. For any two
posts, the water held between them is the distance between them multiplied by
the height of the *shorter* one. Return the maximum over all pairs.

```text
Input:  heights = [1, 8, 6, 2, 5, 4, 8, 3, 7]
Output: 49
Explanation: Posts at index 1 and 8, heights 8 and 7. Distance
             is 8 - 1 = 7, limiting height is min(8, 7) = 7,
             so 7 * 7. The two tallest posts (index 1 and 6,
             both 8) give only 5 * 8 = 40 — width matters as
             much as height.
```

**Constraints.** `2 <= len(heights) <= 10**5`; heights are non-negative.
The posts themselves take up no width.
:::

<details>
<summary>Show solution</summary>

**Approach.** Opposite-end two pointers, and the whole solution is the discard argument.

Start at the widest possible span. The area is bounded by the shorter post, so moving the
*taller* pointer inward cannot help: the width strictly decreases and the height is still
capped by the shorter post, which hasn't changed. Moving the *shorter* one is the only move
that can possibly improve things. So the shorter pointer moves, and every span it skips is
provably no better.

```python
def max_area(heights):
    lo, hi, best = 0, len(heights) - 1, 0
    while lo < hi:
        best = max(best, (hi - lo) * min(heights[lo], heights[hi]))
        if heights[lo] < heights[hi]:
            lo += 1                              # only the shorter side can improve
        else:
            hi -= 1
    return best
```

Time O(n), space O(1).

**Follow-up.** Note that this is a two-pointer problem with *unsorted* input — the discard
argument comes from the geometry, not from ordering. That's worth sitting with, because
"two pointers requires sorted input" is a rule of thumb that this problem breaks. What's
actually required is a valid discard proof, and sortedness is only the most common source of
one.

</details>

## Minimum Capacity to Finish on Time

:::problem
Shipments must be dispatched **in their given order** over at most `days`
days. Each day takes some prefix of what remains, up to the vehicle's
capacity. Return the smallest capacity that finishes in time.

```text
Input:  loads = [3, 2, 2, 4, 1, 4], days = 3
Output: 6
Explanation: Capacity 6 splits as [3,2] [2,4] [1,4] — three
             days. Capacity 5 would need [3,2] [2] [4,1] [4],
             four days.

Input:  loads = [3, 2, 2, 4, 1, 4], days = 5   ->  4
Input:  loads = [3, 2, 2, 4, 1, 4], days = 1   ->  16
Explanation: With one day everything ships at once, so the
             answer is the total. No capacity below max(loads)
             can ever work.
```

**Constraints.** `1 <= days <= len(loads) <= 10**5`; loads are positive.
:::

<details>
<summary>Show solution</summary>

**Approach.** The phrase "minimum X such that Y is achievable" is the binary-search-on-the-answer
signal. Checking a single candidate capacity is an easy greedy pass; constructing the optimal
capacity directly is not obvious at all. So search the candidates.

Monotonicity is the precondition and it holds because shipment weights are non-negative: a
larger capacity can never require *more* days. Stating that is a real step — a shipment that
somehow freed capacity would break it.

The bounds do real work too. Nothing below `max(loads)` can ever work, since one shipment
wouldn't fit; `sum(loads)` always works, since everything goes in one day.

```python
def min_capacity(loads, days):
    def feasible(cap):
        used, current = 1, 0
        for load in loads:
            if current + load > cap:
                used, current = used + 1, 0      # start a new day
            current += load
        return used <= days

    lo, hi = max(loads), sum(loads)
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if feasible(mid):
            hi = mid                              # mid might be the answer
        else:
            lo = mid + 1
    return lo
```

Time O(n log S) where S is the total weight; space O(1).

**Follow-up.** If shipments could be dispatched in any order rather than in sequence, the
feasibility check stops being a simple greedy pass — it becomes bin packing, which is
NP-hard. The binary search would still be valid; the O(n) check underneath it wouldn't
exist. Worth noticing that "in their given order" was doing far more work in the problem
statement than it appeared to.

</details>

## Days Until a Higher Reading

:::problem
For each day in a sequence of temperature readings, report how many days you
must wait for a strictly warmer one. Report `0` where no warmer day follows.

```text
Input:  temps = [30, 38, 36, 35, 37, 42, 40]
Output: [1, 4, 2, 1, 1, 0, 0]
Explanation: Day 0 (30) waits 1 day for 38. Day 1 (38) waits
             until day 5 (42), so 4. Day 2 (36) skips 35 and
             reaches 37 on day 4, so 2. Day 5 (42) is the
             maximum and day 6 (40) has nothing after it, so
             both report 0.
```

**Constraints.** `1 <= len(temps) <= 10**5`. Equal temperatures do not count
as warmer.
:::

<details>
<summary>Show solution</summary>

**Approach.** "How long until the next greater" is the monotonic stack family. The discard
argument: once a warmer day arrives, every earlier day it exceeds is answered and can be
dropped — none of them can be anyone else's answer, because anything later would meet the
warmer day first.

Storing indices rather than temperatures is what makes the *distance* computable at the
moment of the pop.

```python
def days_until_warmer(temps):
    out = [0] * len(temps)
    stack = []                                    # indices, temperatures decreasing
    for i, t in enumerate(temps):
        while stack and temps[stack[-1]] < t:
            j = stack.pop()
            out[j] = i - j                        # the pop is where the answer lands
        stack.append(i)
    return out                                    # leftovers keep their 0
```

Time O(n) — each index pushed once, popped at most once — space O(n).

**Follow-up.** The zero default and the leftover stack are the same fact: days with no
warmer future day are exactly the ones never popped. That's the invariant doing the
edge-case handling, which is generally the sign a pattern has been applied correctly rather
than patched into place.

</details>

## Range Sum Queries Over Static Data

:::problem
A fixed table of daily figures is queried repeatedly for the total over
arbitrary ranges. Build a structure supporting `total(lo, hi)` — `lo`
inclusive, `hi` exclusive — in O(1) per query. Figures never change.

```text
Input:  DailyTotals(figures = [5, -2, 7, 1, 4])
        total(0, 3)   ->  10
        total(1, 5)   ->  10
        total(2, 2)   ->  0
Explanation: total(0, 3) sums 5 + (-2) + 7. total(1, 5) sums
             (-2) + 7 + 1 + 4 — the same answer by
             coincidence. total(2, 2) is an empty range, which
             the half-open convention makes 0 with no special
             case.
```

**Constraints.** `1 <= len(figures) <= 2 * 10**5` and up to `2 * 10**5`
queries. Figures may be negative.
:::

<details>
<summary>Show solution</summary>

**Approach.** Two large sizes with static data is the prefix-sum signal: precompute once,
answer each query in O(1). The naive per-query loop is O(n·q), which the constraint sizing
from Chapter 1 rules out immediately.

The leading zero removes the special case for ranges beginning at day 0.

```python
class DailyTotals:
    def __init__(self, figures):
        self.prefix = [0] * (len(figures) + 1)
        for i, x in enumerate(figures):
            self.prefix[i + 1] = self.prefix[i] + x     # prefix[i] = sum of figures[:i]

    def total(self, lo, hi):                            # inclusive lo, exclusive hi
        return self.prefix[hi] - self.prefix[lo]
```

O(n) to build, O(1) per query, O(n) space.

**Follow-up.** The moment figures can be *updated* between queries, the prefix array has to be
rebuilt — O(n) per update, which is worse than the naive approach if updates outnumber
queries. That's the crossover where a Fenwick tree earns its complexity: O(log n) for both
operations, giving up O(1) queries to avoid O(n) updates. Which structure is right depends on
the read/write ratio, not on the asymptotics of either operation alone.

</details>

## Failure modes

The bugs this chapter's patterns produce are almost all silent — plausible output, wrong
number.

**Off-by-one in window boundaries.** A window from `left` to `right` inclusive has width
`right - left + 1`, and forgetting the `+ 1` under-reports every answer by one. Half-open
ranges (`[lo, hi)`) avoid most of this family and are worth adopting consistently: the width
is `hi - lo`, an empty range is `lo == hi`, and adjacent ranges share an endpoint without
overlapping. Whichever convention you pick, write it in a comment on the function, because
mixing the two within one file is where these bugs actually come from.

**Integer overflow in prefix sums.** A prefix array over a million 32-bit values overflows a
32-bit accumulator long before the end. In C, C++ and Java this wraps silently to a negative
number; in Rust it panics in debug and wraps in release. Use a 64-bit accumulator. Python's
arbitrary-precision integers make this a non-issue in the snippets here, which is exactly why
it's worth flagging — the bug appears on the port, not in the original.

**Assuming monotonicity that isn't there.** Binary search on a non-monotonic predicate
returns *a* boundary, just not the right one, and it typically passes small tests. The
discipline is to state the reason for monotonicity out loud — usually a non-negativity
constraint somewhere in the input — and to check whether the problem actually guarantees it.

**Sliding windows over values that can be negative.** Adding an element can decrease the sum,
so the contraction rule has no valid stopping condition and the window silently misses
answers. Every all-positive test case passes. The correct tool is prefix sums with a hash
map, or with a monotonic deque for the shortest-subarray variant.

**Contracting a window too eagerly.** Shrinking past the point where the window becomes valid
means the widest valid window is never observed. Contract only while the window is invalid,
and record only after the contraction loop has finished.

**Comparing with the wrong strictness in a monotonic stack.** `<` versus `<=` decides whether
equal elements are popped, which decides whether ranges with duplicates are counted once or
twice. On distinct-value test data both versions are correct, and the difference only appears
when duplicates arrive.

## What to take away

- Strip the scenario, name the shape. The signal table on the chapter's first page is the checklist.
- The discard argument is the correctness proof for two pointers — and it doesn't have to come from sortedness.
- "Minimum X such that Y works" means binary search the answer and write a linear feasibility check.
- The pop in a monotonic stack is where the answer is recorded, which is why indices belong on the stack.
- These patterns fail silently. Boundary conventions, overflow on the port to a fixed-width language, unstated monotonicity and negative values are where they break.
