---
title: "Core Data Structures"
description: "Arrays, hash maps, stacks, queues, heaps and union-find — what each one is actually good at and what it quietly costs you."
track: 7
chapter: 24
page: 1
readMinutes: 3
---

:::info[Prerequisites]
**Complexity & Performance Analysis** — specifically *Reading Time & Space Complexity*
for counting operations, and *Amortized & Average Cost* for why an append and a hash
lookup are both "O(1)" in two different senses. This chapter quotes those costs
constantly and doesn't re-derive them.
:::

## Why this chapter exists

Almost every data structure question in real code reduces to one of two things: which
operation do I need to be fast, and what am I willing to pay for it. There is no
structure that is fast at everything, and the ones that look like they are — hash maps,
mostly — are fast at a specific list of operations and quietly terrible at the ones just
outside it.

So the framing here is not "what is a heap." It's "what does a heap give you that a
sorted list doesn't, and what does it take away." That framing is what makes the
knowledge transferable: you meet a new structure in a library, read its complexity table,
and know immediately what it's for.

## The one table this chapter is arranged around

| Structure | Fast at | Slow at | Reach for it when |
| --- | --- | --- | --- |
| Dynamic array | Index, append, iterate in order | Insert/delete at the front or middle, search | You need order and mostly append |
| Hash map / set | Lookup, insert, delete by key | Anything involving order or ranges | You need "have I seen this" or "what's associated with this" |
| Stack | Push, pop at one end | Anything else | The most recent item is the one you need next |
| Queue / deque | Push, pop at both ends | Random access | Order of arrival matters |
| Heap | Smallest (or largest) element, insert | Finding anything that isn't the extreme | You need the top item repeatedly, not a full sort |
| Linked list | Splice given a node reference | Index, search, cache behaviour | You already hold a pointer to the position |
| Union-find | Merge two groups, ask if two things are in one group | Splitting groups, listing members | Connectivity that only ever grows |

Reading it in the other direction is the useful skill. "I need the k largest of a stream"
is a sentence about repeatedly wanting an extreme, so it's a heap. "I need to know
whether two accounts have ever been linked" is connectivity under merges, so it's
union-find.

## What's in here

| Page | What it covers |
| --- | --- |
| Arrays & Dynamic Arrays | Contiguous memory, index arithmetic, cache locality, and why insertion in the middle costs what it does |
| Hash Maps & Sets | Hashing, collisions, load factor, and why iteration order is a trap |
| Stacks & Queues | LIFO and FIFO as modelling choices, deques, and where these appear without being named |
| Heaps & Priority Queues | Partial ordering as the point — top-k, streaming maxima, scheduling |
| Linked Structures | The narrow set of cases where a linked list beats an array, and composing one with a hash map |
| Union-Find | Disjoint sets, path compression, union by rank — the structure most engineers never learn and occasionally badly need |
| Worked Examples | Top-k frequent elements, an LRU cache, connected components under incremental merges — plus this chapter's failure modes |

## Where this connects

**Trees & Graph Traversal** is built directly on three of these: BFS is a queue, DFS is a
stack (or the call stack), and both need a hash set to track what's been visited.
**Algorithmic Patterns** adds the monotonic stack, which is a stack with one extra
invariant. **Dynamic Programming** uses arrays and dictionaries as memo tables.

Outside the track, the same structures appear as the LRU eviction policy in a cache
layer, as the priority queue behind a job scheduler in **Event-Driven Systems**, and as
the reason a hash index and a B-tree index answer different questions in **Relational
Schema Design**.

## References

- [Cormen, Leiserson, Rivest & Stein — *Introduction to Algorithms*, 4th ed.](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/), Part III ("Data Structures")
- [Python — TimeComplexity wiki](https://wiki.python.org/moin/TimeComplexity)
