---
title: "Worked Examples"
description: "Top-k frequent elements, an LRU cache and connected components under incremental merges — plus the failure modes this chapter's structures produce in production."
track: 7
chapter: 24
page: 8
readMinutes: 5
---

Three problems, each one a composition of two structures from this chapter. Solutions are
collapsed — the useful move before opening one is to name which structures the problem
needs and why neither alone is sufficient.

## Top-k Frequent Elements

Given a long sequence of values, return the k that occur most often.

<details>
<summary>Show solution</summary>

**Approach.** Two questions, two structures. Counting occurrences is keyed lookup, so
that's a hash map. Keeping the best k without sorting everything is repeated extraction of
an extreme, so that's a heap — a *min*-heap of size k, whose root is the weakest survivor
and therefore the thing to evict.

```python
import heapq
from collections import Counter

def top_k_frequent(values, k):
    counts = Counter(values)                    # O(n)
    heap = []                                   # min-heap of (count, value)
    for value, count in counts.items():         # O(u) distinct values
        if len(heap) < k:
            heapq.heappush(heap, (count, value))
        elif count > heap[0][0]:
            heapq.heapreplace(heap, (count, value))
    return [value for _, value in sorted(heap, reverse=True)]
```

Time O(n + u log k) for n values and u distinct ones; space O(u).

**Follow-up.** `heapq.nlargest(k, counts.items(), key=...)` does this in one line and uses
the same algorithm internally — reach for it in real code. The reason to know the manual
version anyway is that the streaming case can't use it: with an unbounded stream you can't
build `Counter` first, and exact top-k over a stream is provably impossible in sublinear
space. The production answer there is an approximate sketch — Count-Min Sketch or
Space-Saving — which trades exactness for bounded memory.

</details>

## LRU Cache

Build a fixed-capacity cache where both reading a key and inserting one are O(1), and
inserting past capacity evicts whichever key was used least recently.

<details>
<summary>Show solution</summary>

**Approach.** The hash map answers "where is this key" in O(1) but knows nothing about
recency. The doubly linked list maintains recency — head is newest, tail is oldest — but
can't find anything. Composing them works because the map stores *node references*, so the
list's O(1) splice is reachable without a search.

Sentinel head and tail nodes remove every null check.

```python
class Node:
    __slots__ = ("key", "val", "prev", "next")
    def __init__(self, key=None, val=None):
        self.key, self.val, self.prev, self.next = key, val, None, None

class LRUCache:
    def __init__(self, capacity):
        self.cap, self.map = capacity, {}
        self.head, self.tail = Node(), Node()        # sentinels
        self.head.next, self.tail.prev = self.tail, self.head

    def _unlink(self, n):
        n.prev.next, n.next.prev = n.next, n.prev

    def _push_front(self, n):
        n.prev, n.next = self.head, self.head.next
        self.head.next.prev = n
        self.head.next = n

    def get(self, key):
        n = self.map.get(key)
        if n is None:
            return None
        self._unlink(n)
        self._push_front(n)
        return n.val

    def put(self, key, val):
        if key in self.map:
            n = self.map[key]
            self._unlink(n)
            n.val = val
        else:
            if len(self.map) == self.cap:
                lru = self.tail.prev
                self._unlink(lru)
                del self.map[lru.key]
            self.map[key] = n = Node(key, val)
        self._push_front(n)
```

Both operations O(1) time; O(capacity) space.

**Follow-up.** The eviction key must be deleted from the map, not just unlinked — an
unlinked node still referenced by the map is a memory leak *and* a correctness bug, since
`get` would return a value no longer in the cache. This is why the node stores its own
`key`: the list knows which map entry to remove. In Python, `OrderedDict.move_to_end` and
`popitem(last=False)` give the same behaviour in a third of the lines, and
`functools.lru_cache` covers the memoization case outright — write this by hand only when
you need custom eviction.

</details>

## Connected Components Under Incremental Merges

Accounts are added to a system one at a time, and pairs of them are occasionally
discovered to belong to the same person. At any point, report how many distinct people the
system currently believes exist, and whether two given accounts are the same person.

<details>
<summary>Show solution</summary>

**Approach.** Relationships only ever get added, never removed, and the questions are
purely about membership — never about *how* two accounts are linked. That is exactly the
narrow contract union-find satisfies, and it's why the answer isn't a graph traversal.

Component count needs no extra structure: start it at n and decrement whenever a `union`
actually merges.

```python
class Accounts:
    def __init__(self, n):
        self.parent, self.size, self.components = list(range(n)), [1] * n, n

    def find(self, x):
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]     # path halving
            x = self.parent[x]
        return x

    def same_person(self, a, b):
        return self.find(a) == self.find(b)

    def link(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False
        if self.size[ra] < self.size[rb]:
            ra, rb = rb, ra
        self.parent[rb], self.size[ra] = ra, self.size[ra] + self.size[rb]
        self.components -= 1
        return True
```

Effectively O(1) per operation — O(α(n)) amortized; O(n) space.

**Follow-up.** The version that breaks this design is "an account was linked in error;
unlink it." Union-find cannot undo a merge, and the component may or may not split
depending on whether other links hold it together. The practical answers are to rebuild
from the surviving link log, or — if all operations are known in advance — to process them
in reverse so each deletion becomes an insertion.

</details>

## Failure modes

What actually goes wrong with these structures in production, as opposed to on a
whiteboard.

**Unbounded hash map growth is a memory leak with a different name.** A `dict` used as a
cache, a deduplication set, or a "seen request IDs" table grows for the lifetime of the
process unless something evicts from it. It doesn't look like a leak — no cycles, no
unfreed handles, just a container nobody bounded — and it presents as a service that runs
fine for four days and gets OOM-killed on the fifth. Every long-lived map needs an
answer to "what removes entries from this": a capacity bound, a TTL, or a periodic sweep.
If the answer is "nothing", it is a leak.

**Mutable keys corrupt lookups silently.** An object whose hash depends on a field that
later changes is filed in the wrong bucket. It's in the map, `in` returns `False`,
iteration finds it, and the two facts contradict each other. Nothing raises. Keys must be
immutable — tuples, frozensets, or objects whose hashed fields are genuinely fixed at
construction — and in Java that means never mutating a field used by `hashCode` after
insertion.

**Depending on hash iteration order.** Python's `dict` preserves insertion order as a
language guarantee from 3.7 onward; `set` does not, and string hashing is randomised per
process, so the same program on the same input can iterate a set differently between runs.
Order-dependent code built on that passes locally and fails in CI intermittently. Other
languages give no ordering guarantee at all — Java's `HashMap` order changes with capacity,
and Go deliberately randomises map iteration to stop this dependency forming. Sort
explicitly whenever order is part of the output.

**Comparing payloads in a heap.** Pushing `(priority, task)` works until two priorities tie
and the heap tries to order the tasks themselves, raising `TypeError` at whatever hour the
tie first occurs. Always insert a monotonic tiebreaker: `(priority, next(counter), task)`.

**Quadratic behaviour from `pop(0)`.** Using a list as a queue is correct and O(n²).
It passes every test written against small fixtures and surfaces as a latency cliff under
real volume. Use `collections.deque`.

## What to take away

- Most useful structures are two simple ones covering each other's blind spot — map plus heap, map plus linked list.
- A size-k min-heap turns top-k into O(n log k) time and O(k) space, which is what makes it work on streams.
- The LRU cache works because the map hands the list a node reference; without that, the list's O(1) splice is unreachable.
- Union-find is the right answer precisely when the questions are membership-only and merges are permanent.
- Every long-lived hash map needs a stated eviction policy, and every heap entry needs a tiebreaker.
