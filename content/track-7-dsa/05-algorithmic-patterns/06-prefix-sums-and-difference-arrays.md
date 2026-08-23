---
title: "Prefix Sums & Difference Arrays"
description: "Range queries in O(1) and range updates in O(1) — a complementary pair, and the question of which one a problem needs."
track: 7
chapter: 5
page: 6
readMinutes: 5
---

## Precompute the thing that never changes

The sum of the first *i* elements of a fixed array is a fact. It doesn't depend on which
query you're answering, and recomputing it per query is the repeated work this pattern
removes.

A **prefix sum** array stores those facts:

```python
def build_prefix(nums):
    prefix = [0] * (len(nums) + 1)
    for i, x in enumerate(nums):
        prefix[i + 1] = prefix[i] + x
    return prefix                                # prefix[i] = sum of nums[:i]

def range_sum(prefix, lo, hi):                   # inclusive lo, exclusive hi
    return prefix[hi] - prefix[lo]
```

O(n) to build, **O(1) per query**, O(n) space. For q queries that's O(n + q) instead of
O(n·q) — the "amortise across queries" shape from Chapter 1's sizing example, in its
simplest form.

The leading zero is not decoration. Making `prefix` one element longer, with
`prefix[0] = 0`, means `range_sum` needs no special case for a range starting at index 0.
Nearly every off-by-one bug in this pattern comes from omitting it.

## The subarray-sum trick

Prefix sums do more than answer explicit range queries. Since
`sum(nums[i:j]) == prefix[j] - prefix[i]`, asking *"how many subarrays sum to k"* becomes
*"how many pairs (i, j) satisfy `prefix[j] - prefix[i] == k`"* — which is a pair-lookup
problem, and pair lookups are a hash map.

```python
from collections import defaultdict

def count_subarrays_with_sum(nums, k):
    counts = defaultdict(int)
    counts[0] = 1                                # the empty prefix
    running = total = 0
    for x in nums:
        running += x
        total += counts[running - k]             # prefixes that complete a target sum
        counts[running] += 1
    return total
```

O(n) time and space, in one pass, without materialising the prefix array at all. This works
with negative numbers, which is exactly where the sliding window fails — and that pairing is
worth remembering, because "shortest/count of subarrays summing to k" with negatives allowed
is a common trap where the window version passes every positive test case.

:::tip[Key insight]
Prefix sums convert a question about *ranges* into a question about *pairs of endpoints*.
That's the step that matters: once the problem is about pairs, the whole toolbox for pairs —
hash maps, two pointers, sorting — becomes available on a problem that didn't look like it
had pairs in it.
:::

## Difference arrays: the mirror image

Prefix sums make range *queries* cheap on static data. The complementary structure makes
range *updates* cheap when you only need to read at the end.

A **difference array** stores changes rather than values: `diff[i] = nums[i] - nums[i-1]`.
Adding a constant `v` to every element of a range then touches exactly two positions —
where the change starts and where it stops:

```python
def apply_ranges(n, updates):                    # updates: (lo, hi, value), hi exclusive
    diff = [0] * (n + 1)
    for lo, hi, value in updates:
        diff[lo] += value                        # O(1) per range update
        diff[hi] -= value

    result, running = [], 0
    for i in range(n):                           # one prefix sum recovers the array
        running += diff[i]
        result.append(running)
    return result
```

O(1) per update and O(n) once at the end, instead of O(range) per update.

The classic application is interval counting: given a list of intervals, how many overlap at
each point? Increment at each start, decrement at each end, prefix-sum the result. Booking
systems, meeting-room scheduling, resource-usage-over-time and "minimum number of platforms
needed" are all this. So is the tolerance-band version of a histogram.

## Choosing between them

| | Prefix sum | Difference array |
| --- | --- | --- |
| Cheap operation | Range **query** — O(1) | Range **update** — O(1) |
| Expensive operation | Any update — O(n) rebuild | Any read before the final pass — O(n) |
| Use when | Data is static, many queries | Updates are batched, one read at the end |
| Recovery | — | One prefix sum reconstructs the array |

They are inverses of each other: the prefix sum of a difference array is the original array,
and the difference of a prefix sum array is the original array. That's the whole
relationship, and it's why the two patterns are taught together.

If you need **both** operations interleaved — arbitrary updates and arbitrary queries, live —
neither works, and the answer is a Fenwick tree (binary indexed tree) or a segment tree, at
O(log n) for each. That's the price of giving up the assumption that one side is static, and
it's worth knowing the name even if you never implement one.

## Beyond sums, and beyond one dimension

The technique generalises to any **invertible** associative operation, because answering a
range query means subtracting one prefix from another — and subtracting requires an inverse.
Sums work, XOR works (it's its own inverse), products work if nothing is zero. **Minimum and
maximum do not**, because there's no way to un-take a minimum, which is why range-minimum
queries need a sparse table or a segment tree instead.

In two dimensions the same idea gives O(1) rectangle sums, at the cost of inclusion-exclusion
in the query:

```python
# P[r][c] = sum of the rectangle from (0,0) to (r-1,c-1)
def rect_sum(P, r1, c1, r2, c2):                 # inclusive corners
    return (P[r2 + 1][c2 + 1] - P[r1][c2 + 1]
            - P[r2 + 1][c1] + P[r1][c1])         # add back the twice-removed corner
```

The `+ P[r1][c1]` is the part everyone forgets: the top-left region gets subtracted by both
of the middle terms, so it has to be added back once.

## What to take away

- Prefix sums answer range queries in O(1) after an O(n) build, converting O(n·q) into O(n + q).
- Use the leading zero so that ranges starting at index 0 need no special case.
- `sum(nums[i:j]) == prefix[j] - prefix[i]` turns range questions into pair questions, which is what makes the hash-map subarray-count trick work — and it handles negatives, where a sliding window can't.
- A difference array is the mirror: O(1) range updates, one prefix sum at the end to read the result. Interval-overlap counting is its main use.
- Needing both live updates and live queries means a Fenwick or segment tree. Min and max don't work with prefix arrays at all.

## References

- [Laaksonen — *Guide to Competitive Programming*](https://link.springer.com/book/10.1007/978-3-030-39357-1), Chapter 9 ("Range Queries")
- [Fenwick — *A New Data Structure for Cumulative Frequency Tables*](https://onlinelibrary.wiley.com/doi/10.1002/spe.4380240306), Software: Practice and Experience, 1994
- [Python — `itertools.accumulate`](https://docs.python.org/3/library/itertools.html#itertools.accumulate) — the standard-library prefix sum
