---
title: "Recognizing Patterns"
description: "How to read a problem for its shape rather than its story — the framing page for a chapter of five moves that cover most problems."
track: 7
chapter: 5
page: 1
readMinutes: 4
---

:::info[Prerequisites]
**Complexity & Performance Analysis** (all of it — this chapter is entirely about turning
quadratic solutions into linear ones) and **Core Data Structures**, pages *Arrays & Dynamic
Arrays*, *Stacks & Queues* and *Hash Maps & Sets*.
:::

## The story is not the problem

Problems arrive wrapped in a scenario. Machines in a rack, days on a calendar, buildings
on a skyline, containers of water. The scenario is there to make the problem readable, and
it is almost never the part that determines the solution.

Underneath, a small number of shapes recur. This chapter covers five, and between them
they account for a large fraction of the array-and-string problems anyone meets:

- **Two pointers** — two indices moving through a sequence under a rule
- **Sliding window** — a contiguous range that grows and shrinks to maintain a property
- **Binary search on the answer** — searching a space of candidate answers rather than a sorted array
- **Monotonic stack** — a stack kept sorted, answering "next greater/smaller" queries
- **Prefix sums and difference arrays** — precompute once, answer range questions in O(1)

Each one is a way of avoiding a nested loop. That's the common thread: the naive solution
to nearly every problem in this chapter is "check every pair" or "recompute for every
query", and each pattern is a specific reason that recomputation is unnecessary.

## Reading a problem for its shape

The productive first pass over a problem statement ignores the nouns and looks for a small
number of structural signals.

| Signal in the problem | Pattern to try first |
| --- | --- |
| Sorted input, or sorting is allowed | Two pointers, binary search |
| "Contiguous" subarray or substring | Sliding window, prefix sums |
| "Longest / shortest ... such that" | Sliding window (variable width) |
| Pair or triple summing to a target | Two pointers after sorting, or a hash map |
| "Minimum capacity / maximum k that works" | Binary search on the answer |
| "Next greater", "previous smaller", spans | Monotonic stack |
| Many range queries, static data | Prefix sums |
| Many range *updates*, one final read | Difference array |
| Small bound like n ≤ 20 | Subset enumeration (Chapter 3) |
| "In how many ways" / "minimum cost to" | Dynamic programming (Chapter 6) |

The table is a starting hypothesis, not a lookup. What makes it work is that these signals
are about the *structure* of the input and the question, both of which survive the change
of scenario.

## The question underneath all five

Every pattern here answers the same question in a different way: **what did the previous
step already establish that I'm about to recompute?**

- Two pointers: the pointer never moves backward, so work already excluded stays excluded.
- Sliding window: shrinking from the left only ever removes elements, so the running total updates in O(1).
- Binary search on the answer: if capacity 40 works, every capacity above 40 works, so half the space is eliminated per test.
- Monotonic stack: an element with a taller one in front of it can never be anyone's next-greater, so it can be discarded permanently.
- Prefix sums: the sum of the first i elements is a fact that doesn't change, so compute it once.

That framing is more useful than the individual techniques, because it's what lets you
recognise a new problem as one of these rather than matching it against remembered
examples.

:::tip[Key insight]
These patterns are not tricks to memorise; they are five different answers to "this
computation repeats work the previous iteration already did." Once you're looking for
repeated work rather than for a matching template, the recognition step stops depending on
having seen the problem before — which is the only version of this skill that transfers.
:::

## A word on amortized reasoning

Several of these patterns look like they might be quadratic and aren't, and the argument
is always amortized rather than per-iteration. The sliding window has a `while` loop
inside a `for` loop, which reads as O(n²) — but the inner loop's index only ever increases,
so across the whole run it advances at most n times total. The monotonic stack has the same
shape and the same argument: each element is pushed once and popped at most once.

When you meet a nested loop in this chapter, the question to ask is not "how many times
does the inner loop run" but "how many times can the inner loop run *in total*." Those give
different answers here, and the second one is correct.

## What's in here

| Page | What it covers |
| --- | --- |
| Two Pointers | Opposite-end and same-direction variants, and the sorted-input signal |
| Sliding Window | Fixed and variable width, and the expand/contract invariant stated explicitly |
| Binary Search Beyond Sorted Arrays | Searching the answer space; predicate monotonicity as the real precondition |
| Monotonic Stacks | The next-greater-element family, and why the stack stays sorted |
| Prefix Sums & Difference Arrays | Range queries in O(1), range updates in O(1) — the complementary pair |
| Worked Examples | Five problems, one per pattern, plus this chapter's failure modes |

## References

- [Cormen, Leiserson, Rivest & Stein — *Introduction to Algorithms*, 4th ed.](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/)
- [Laaksonen — *Guide to Competitive Programming*](https://link.springer.com/book/10.1007/978-3-030-39357-1), Chapters 8–9
