---
title: "Worked Examples"
description: "Two problems with collapsible solutions — comparing two implementations of the same function, and sizing an approach from a stated constraint."
track: 7
chapter: 23
page: 6
readMinutes: 5
---

Solutions are collapsed. The value is in trying the analysis first — for this chapter
that means saying the complexity out loud before you open the answer, because the whole
skill is producing that estimate quickly rather than recognising it once told.

## Two implementations, same output

Here are two functions that return the same thing: the list of values in `items` that
appear more than once, in order of first appearance. Which is faster, and by how much?

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

**Approach.** Count what each line actually costs rather than how long it is.

`duplicates_a` runs a loop of n iterations. Inside it, `items[i + 1:]` *builds a new
list* of up to n elements — that's an O(n) copy before the search even starts — and then
`in` scans it linearly. `x not in out` is another linear scan of a list. So the body is
O(n) and the total is **O(n²) time**, with an O(n) allocation on every single iteration.

`duplicates_b` runs the same n iterations, but every operation in the body is a hash-set
membership test or insertion, each O(1) on average. Total: **O(n) time**, O(n) space.

The measurable gap is worse than "n² versus n" suggests, because the slicing in the first
version allocates and copies rather than merely reading. At n = 10,000 the first version
does on the order of 50 million element copies; the second does 10,000 hash lookups.

**Complexity.** A: O(n²) time, O(n) space per iteration in garbage. B: O(n) time, O(n)
space.

**Follow-up.** `duplicates_b` uses two sets and a list where one `Counter` would do — but
`Counter` requires a full pass before any output and loses first-appearance order unless
you sort afterward. The three-structure version is longer and strictly better here, which
is a reasonable illustration that "fewer lines" and "fewer operations" are unrelated
properties.

</details>

## Sizing an approach before writing it

A service stores time-stamped events. A new endpoint must answer: *for each of the q
requested time windows, how many events fall inside it?* There are n events and q
windows, and the stated bounds are n up to 200,000 and q up to 200,000. The response
budget is roughly one second.

Which complexities are viable, and which approach do the bounds point at?

<details>
<summary>Show solution</summary>

**Approach.** Work the budget first. Roughly 10⁷–10⁸ operations are available. The
obvious implementation — for each window, scan every event — is O(n·q), which is
4 × 10¹⁰. That is three to four orders of magnitude over budget, so it is not a tuning
problem; it's the wrong shape.

Two bounds of similar size, with one set of queries against one fixed dataset, is the
signal described on the constraints page: the intended solution amortises work across
queries instead of repeating it. Sort the events once, then answer each window with two
binary searches for its endpoints.

```python
from bisect import bisect_left, bisect_right

def count_in_windows(events, windows):
    ts = sorted(e.timestamp for e in events)          # O(n log n), once
    return [bisect_right(ts, hi) - bisect_left(ts, lo)  # O(log n) per window
            for lo, hi in windows]
```

**Complexity.** O(n log n + q log n) time, O(n) space. With n = q = 200,000 that's about
2 × 10⁶ + 4 × 10⁶ operations — comfortably inside budget, with roughly four orders of
magnitude of headroom against the naive version.

**Follow-up.** If the windows were known in advance rather than arriving as queries, a
sort of both sides plus a single merge pass would remove the log factor entirely. And if
events keep arriving, the sorted array stops being the right structure — the choice
between re-sorting, a balanced tree, and a bucketed counter depends on the read/write
ratio, which is a question the complexity alone doesn't answer.

</details>

## What to take away

- Read complexity from the operations invoked, not from the length of the code.
- Slicing inside a loop is a hidden O(n) allocation, and it is the most common way a "linear" function turns out to be quadratic.
- When two input sizes appear together, expect the intended solution to precompute once and answer each query cheaply.
- Sizing the budget first eliminates approaches before you've written them, which is faster than benchmarking them afterwards.
