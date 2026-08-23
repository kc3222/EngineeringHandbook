---
title: "Worked Examples"
description: "Two problems with collapsible solutions — comparing two implementations of the same function, and sizing an approach from a stated constraint."
track: 7
chapter: 1
page: 5
readMinutes: 4
---

Solutions are collapsed. The value is in trying the analysis first — say the complexity
out loud before opening the answer, because the skill is producing that estimate quickly
rather than recognising it once told.

## Two Implementations, Same Output

:::problem
Both functions below return the same list: the values in `items` that occur
more than once, in order of first appearance. Say which is faster, and by
how much.

```text
Input:  items = [4, 7, 4, 2, 9, 7, 4]
Output: [4, 7]
Explanation: 4 first repeats at index 2, 7 at index 5, so 4
             comes first. 2 and 9 occur once and are excluded.
             4 appears three times but is reported once.
```

**Constraints.** `0 <= len(items) <= 10**5`; values are hashable.
:::

```python
def duplicates_a(items):
    out = []
    for i, x in enumerate(items):
        if x in items[i + 1:] and x not in out:
            out.append(x)
    return out

def duplicates_b(items):
    seen, dup, out = set(), set(), []
    for x in items:
        if x in seen and x not in dup:
            dup.add(x)
            out.append(x)
        seen.add(x)
    return out
```

<details>
<summary>Show solution</summary>

**Approach.** Count what each line costs rather than how long it is.

`duplicates_a` runs n iterations, and inside each one `items[i + 1:]` *builds a new list*
of up to n elements — an O(n) copy before the search even starts — then scans it linearly.
`x not in out` is another linear scan. So the body is O(n) and the total is **O(n²) time**,
with an O(n) allocation on every iteration.

`duplicates_b` runs the same n iterations, but every operation in its body is a hash-set
test or insertion, O(1) on average. Total **O(n) time**, O(n) space.

The measurable gap is worse than "n² versus n" suggests, because the slicing allocates and
copies rather than merely reading. At n = 10,000 the first version does on the order of 50
million element copies; the second does 10,000 hash lookups.

**Follow-up.** `duplicates_b` uses two sets and a list where one `Counter` would do — but
`Counter` needs a full pass before any output and loses first-appearance order unless you
sort afterwards. The longer version is strictly better here, which is a fair illustration
that "fewer lines" and "fewer operations" are unrelated properties.

</details>

## Sizing an Approach From a Constraint

:::problem
A service stores time-stamped events. An endpoint must answer, for each of
`q` requested time windows, how many events fall inside it. Windows are
inclusive of both endpoints and may overlap.

Which complexities are viable, and which approach do the bounds point at?

```text
Input:  events  = [3, 9, 12, 12, 20]
        windows = [(3, 12), (13, 19), (0, 100)]
Output: [4, 0, 5]
Explanation: (3, 12) contains 3, 9 and both 12s. Nothing lies
             in (13, 19). (0, 100) contains all five events.
```

**Constraints.** `n <= 200_000` events and `q <= 200_000` windows; the
response budget is roughly one second.
:::

<details>
<summary>Show solution</summary>

**Approach.** Work the budget first. Roughly 10⁷–10⁸ operations are available; scanning
every event for every window is O(n·q) = 4 × 10¹⁰, three to four orders of magnitude over.
That's not a tuning problem, it's the wrong shape.

Two bounds of similar size, with one set of queries against one fixed dataset, is the
signal from the constraints page: amortise work across queries instead of repeating it.
Sort the events once, then answer each window with two binary searches.

```python
from bisect import bisect_left, bisect_right

def count_in_windows(events, windows):
    ts = sorted(e.timestamp for e in events)          # O(n log n), once
    return [bisect_right(ts, hi) - bisect_left(ts, lo)  # O(log n) per window
            for lo, hi in windows]
```

**Complexity.** O((n + q) log n) time, O(n) space. At n = q = 200,000 that's about
6 × 10⁶ operations — comfortably inside budget.

**Follow-up.** If the windows were known in advance rather than arriving as queries,
sorting both sides and doing one merge pass removes the log factor entirely. And if events
keep arriving, the sorted array stops being right — the choice between re-sorting, a
balanced tree and a bucketed counter depends on the read/write ratio, which complexity
alone doesn't answer.

</details>

## What to take away

- Read complexity from the operations invoked, not from the length of the code.
- Slicing inside a loop is a hidden O(n) allocation — the most common way a "linear" function turns out to be quadratic.
- Two input sizes together means precompute once and answer each query cheaply.
- Sizing the budget first eliminates approaches before you write them, which beats benchmarking them afterwards.
