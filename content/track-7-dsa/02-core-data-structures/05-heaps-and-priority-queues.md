---
title: "Heaps & Priority Queues"
description: "Partial ordering as the point — top-k, streaming maxima and scheduling, plus why heapify beats repeated insertion."
track: 7
chapter: 2
page: 5
readMinutes: 5
---

## Sorting more than you need

Suppose you want the ten largest values out of a million. Sorting the million and taking
the last ten works, costs O(n log n), and does an enormous amount of irrelevant work —
you have carefully established the relative order of the 999,990 values you are about to
throw away.

The observation behind the heap is that you rarely need a total order. You need *the
extreme element*, repeatedly. That's a much weaker requirement, and a much weaker
requirement can be maintained much more cheaply.

A **heap** maintains exactly one invariant: every node is smaller than (or equal to) both
of its children. That makes the smallest element the root, findable in O(1), while
imposing nothing at all on the relationship between siblings. The order is *partial*, and
partial is enough.

## The costs

| Operation | Heap | Sorted array | Unsorted array |
| --- | --- | --- | --- |
| Find minimum | O(1) | O(1) | O(n) |
| Remove minimum | O(log n) | O(n) (or O(1) at one end) | O(n) |
| Insert | O(log n) | O(n) | O(1) |
| Build from n items | **O(n)** | O(n log n) | O(n) |
| Find arbitrary element | O(n) | O(log n) | O(n) |

Two rows deserve attention. Building a heap from an existing collection is **O(n)**, not
O(n log n) — the standard bottom-up `heapify` is asymptotically cheaper than inserting
one at a time, and the difference is real at scale. And finding a non-extreme element is
O(n): the heap knows nothing about anything except its root. If you need to search it,
you chose the wrong structure.

## The array trick

A heap is a complete binary tree, and a complete binary tree can be stored in a flat
array with no pointers at all. For the node at index `i`:

```text
parent(i)      = (i - 1) // 2
left_child(i)  = 2 * i + 1
right_child(i) = 2 * i + 2
```

That's why heaps are fast in practice as well as in theory — the structure is
contiguous, so it gets the cache behaviour discussed on the arrays page, and no
allocation happens per element.

Insertion appends to the end and "sifts up" while it's smaller than its parent; removal
takes the root, moves the last element into its place, and "sifts down". Both walk one
root-to-leaf path, hence O(log n).

## Using one

Python's `heapq` operates on a plain list as a **min-heap**:

```python
import heapq

h = [5, 1, 8, 3]
heapq.heapify(h)              # O(n), in place
heapq.heappush(h, 2)          # O(log n)
smallest = heapq.heappop(h)   # O(log n) -> 1
```

Three practical notes:

**There is no max-heap.** Push negated values and negate on the way out, or wrap items in
a class with an inverted comparison. Negation is the idiom, and it's fine until your
values aren't numbers.

**Ties compare the next element of the tuple.** Pushing `(priority, task)` works until two
priorities tie and Python tries to compare two `task` objects — which raises `TypeError`
if they aren't orderable. The fix is a monotonic tiebreaker: `(priority, counter, task)`.

**`heappushpop` and `heapreplace` are one operation, not two**, and are meaningfully
faster in a loop.

## Top-k, the pattern this structure exists for

For the k largest of n items, keep a min-heap of size k. Each new item is compared to the
smallest of the current best k; if it's larger, evict and insert.

```python
import heapq

def top_k(stream, k):
    h = []
    for x in stream:
        if len(h) < k:
            heapq.heappush(h, x)
        elif x > h[0]:                  # h[0] is the weakest survivor
            heapq.heapreplace(h, x)
    return sorted(h, reverse=True)
```

O(n log k) time and **O(k) space** — and the space is the point. Sorting needs the whole
input in memory; this needs k items, so it works on a stream of unbounded length. That
is the difference between "top 100 search terms today" being a batch job and being a
counter that runs continuously.

:::tip[Key insight]
The heap's advantage isn't that it's faster at sorting — it isn't, and `heapsort` is
rarely the fastest sort. Its advantage is that it never sorts at all. It maintains just
enough order to answer one question, which is why it works on infinite input and why
top-k costs O(k) memory instead of O(n).
:::

## Where priority queues show up

The scheduling shape is everywhere once you look. A **task scheduler** pops the highest-priority
runnable job. An **event simulation** pops the next event by timestamp, processes it, and
pushes the events it generates — the queue stays ordered without ever being sorted.
**Dijkstra's algorithm** and **A\*** pop the closest unvisited node. **Huffman coding**
repeatedly merges the two least frequent symbols. **Merging k sorted streams** keeps one
heap entry per stream and always pops the global minimum.

All of these are the same sentence: *repeatedly take the current extreme from a set that
keeps changing*. When you find yourself sorting inside a loop, that's the sentence you're
in, and a heap is the answer.

## What to take away

- A heap maintains a partial order — enough to expose the extreme in O(1), and nothing more.
- Build with `heapify` (O(n)), not repeated insertion (O(n log n)).
- Finding a non-extreme element is O(n). A heap is not a search structure.
- Top-k with a size-k heap is O(n log k) time and O(k) space, and works on unbounded streams.
- Python's `heapq` is a min-heap only; negate for max, and add a tiebreaker to tuples to avoid comparing payloads.

## References

- [Python — `heapq`](https://docs.python.org/3/library/heapq.html), including the "priority queue implementation notes" on tiebreakers
- [Cormen, Leiserson, Rivest & Stein — *Introduction to Algorithms*, 4th ed.](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/), Chapter 6 ("Heapsort") — the O(n) build-heap proof
- [Java — `PriorityQueue`](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/PriorityQueue.html) — comparator-based, so no negation trick needed
