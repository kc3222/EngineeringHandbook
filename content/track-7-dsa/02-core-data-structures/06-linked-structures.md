---
title: "Linked Structures"
description: "Singly and doubly linked lists, the narrow set of cases where they beat arrays, and composing one with a hash map."
track: 7
chapter: 2
page: 6
readMinutes: 4
---

## A structure that is usually the wrong answer

A linked list stores each element in its own allocation, with a pointer to the next one.
Nothing is contiguous, so nothing can be indexed by arithmetic — reaching element 500
means following 500 pointers.

The textbook case for it is that insertion and deletion are O(1) rather than O(n). That
case is weaker than it sounds, because it's O(1) **only if you already hold a reference to
the node**. If you have to find the node first, the search is O(n) and the saving
evaporates. And even when the asymptotics favour the list, cache behaviour usually
doesn't: array shifting is a contiguous `memmove` the hardware is extremely good at, while
pointer chasing is a cache miss per step.

| | Array | Linked list |
| --- | --- | --- |
| Index | O(1) | O(n) |
| Search | O(n), cache-friendly | O(n), cache-hostile |
| Insert/delete given a position | O(n) shift, fast constant | O(1) |
| Insert/delete given a *node reference* | O(n) | **O(1)** |
| Memory per element | The element | Element + one or two pointers |

So the honest summary: a dynamic array is the right default, and a linked list earns its
place in a specific situation — **when something else is already holding references to
the nodes**. That situation is rarer than the textbooks imply and more important than
their examples suggest.

## The two shapes

A **singly linked list** node points forward only. It's enough for a stack, for a
free-list, and for anything traversed in one direction. Deleting a node requires a
reference to its *predecessor*, which is the constraint that makes the doubly linked
version worth its extra pointer.

A **doubly linked list** node points both ways. That makes unlinking a node possible from
the node itself:

```python
def unlink(node):                 # O(1), no traversal, no predecessor search
    node.prev.next = node.next
    node.next.prev = node.prev
```

Using a **sentinel** head and tail — permanent dummy nodes at each end — removes every
null check from that code, because no real node is ever first or last. It costs two
allocations and deletes an entire class of off-by-one bug, which is a good trade.

## Where they genuinely win

**As the backing store for another structure.** Python's `deque` is a doubly linked list
of fixed-size blocks. Java's `LinkedHashMap` threads a linked list through hash-table
entries to preserve order. In both, the list is an implementation detail providing O(1)
splicing to something that holds the references.

**Intrusive lists in systems code.** Kernels and allocators embed the pointers in the
objects themselves, so an object can be removed from a queue without a lookup and without
an allocation. The Linux kernel's `list_head` is the canonical example.

**Persistent and shared structures.** A singly linked list can share its tail between
versions — prepending gives a new list in O(1) while the old one remains valid and
untouched. That's why linked lists are the default sequence in functional languages, and
it's a property arrays cannot offer at all.

## Composing with a hash map: the LRU cache

The pairing worth learning in detail is a doubly linked list plus a hash map, because it
turns two structures that each fail at half the job into one that does both in O(1).

An LRU (least-recently-used) cache needs to look up a key in O(1) *and* to know which
entry was used least recently, in O(1). A hash map does the first and knows nothing about
order. A linked list does the second — keep most-recent at the head, evict from the tail —
and can't look anything up.

Combine them: the map stores key → *node reference*, and the nodes live in the list. A
`get` finds the node through the map (O(1)) and splices it to the head (O(1), because the
map handed you the node). A `put` past capacity unlinks the tail and deletes its key from
the map.

```python
class Node:
    __slots__ = ("key", "value", "prev", "next")

class LRUCache:
    def get(self, key):
        node = self.map.get(key)          # O(1) — hash map
        if node is None:
            return None
        self._move_to_front(node)         # O(1) — we hold the node
        return node.value
```

The full implementation is on this chapter's worked-examples page.

:::tip[Key insight]
The linked list's O(1) splice is worthless on its own, because finding the node is O(n).
It becomes valuable the moment a hash map supplies the node reference for free. Neither
structure can do the job; the composition does it in O(1). This is the general lesson of
the chapter — most interesting structures are two simple ones covering each other's blind
spot.
:::

## What to take away

- A dynamic array is the right default. A linked list wins only when something already holds node references.
- Doubly linked lists allow O(1) removal from the node itself; sentinels remove the null-handling.
- The real-world uses are as backing stores, as intrusive lists in systems code, and as persistent sequences with shared tails.
- Hash map plus doubly linked list gives O(1) lookup *and* O(1) recency ordering — the LRU cache.
- When one structure is fast at exactly what another is slow at, composing them is often the answer.

## References

- [Python — `collections.deque`](https://docs.python.org/3/library/collections.html#collections.deque) and [`OrderedDict`](https://docs.python.org/3/library/collections.html#collections.OrderedDict), both linked-list-backed
- [Java — `LinkedHashMap`](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/LinkedHashMap.html) — includes a built-in LRU mode via `removeEldestEntry`
- [Linux kernel — `list.h` intrusive linked lists](https://github.com/torvalds/linux/blob/master/include/linux/list.h)
- [Cormen, Leiserson, Rivest & Stein — *Introduction to Algorithms*, 4th ed.](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/), Section 10.2
