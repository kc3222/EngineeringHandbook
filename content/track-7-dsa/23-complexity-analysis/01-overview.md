---
title: "Complexity & Performance Analysis"
description: "Big-O as a decision tool rather than a grading rubric — how to read a constraint and know what will fit."
track: 7
chapter: 23
page: 1
readMinutes: 2
---

:::info[Prerequisites]
Basic familiarity with loops and function calls. No prior CS coursework is assumed —
this chapter builds the vocabulary the rest of the track uses.
:::

## Why this chapter exists

Most engineers meet complexity analysis as something they were graded on and then never
used again, which is a fair reading of how it's usually taught. Presented as a rubric,
it's a set of expressions to match against a shape of loop. Presented as a decision
tool, it answers a question that comes up constantly in real work: *is this approach
going to survive contact with production data?*

The useful version is never "what is the complexity of this function." It's "we have
200,000 rows and this endpoint has to answer in under a second — does the obvious
approach fit?" That takes about fifteen seconds to answer once you can read a
constraint, and it saves the afternoon where you ship the obvious thing and find out
from a dashboard.

Two things it is not. It's **not a measurement** — a profiler tells you where time goes
on your hardware with your data; analysis tells you how that time *changes* as the data
grows. And it's **not a ranking**: O(n log n) is not better than O(n²) in any absolute
sense, only eventually. Analysis says roughly where the crossover is, not which side of
it you're on.

## What's in here

| Page | What it covers |
| --- | --- |
| Why Asymptotic Analysis | What Big-O measures, what it throws away, and why throwing it away is the point |
| Reading Time & Space Complexity | Counting loops and recursion, the operations that cost more than they look like they do, and how to decide which of the two budgets to spend |
| Constraints as a Signal | Working backwards from input size to the complexity you can afford |
| Worked Examples | Two problems with collapsible solutions |

## Where this connects

Every later chapter cites complexity to justify a choice: a heap over a sort in **Core
Data Structures**, an adjacency list over a matrix in **Trees & Graph Traversal**, a
prefix sum over a nested loop in **Algorithmic Patterns**. **Dynamic Programming** is
essentially about converting an exponential complexity into a polynomial one.

Outside this track the same reasoning is N+1 query detection in **Relational Schema
Design**, and the reason vector search needs an approximate index in **Embeddings &
Vector Search**. The notation is the portable part.

## References

- [Cormen, Leiserson, Rivest & Stein — *Introduction to Algorithms*, 4th ed.](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/), Chapters 2–4
- [Python — TimeComplexity wiki](https://wiki.python.org/moin/TimeComplexity) — the per-operation costs of CPython's built-in types
