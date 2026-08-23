---
title: "Stacks & Queues"
description: "LIFO and FIFO as modelling choices rather than structures, deques, and the places these appear without ever being named."
track: 7
chapter: 2
page: 4
readMinutes: 4
---

## Two ways to answer "which one next"

Stacks and queues are barely data structures. Both hold a collection and both support
"add one" and "remove one"; the only difference is which element removal returns. That
choice is the entire content.

A **stack** returns the most recently added item — last in, first out. A **queue**
returns the least recently added — first in, first out. Choosing between them is a
modelling decision about your problem, not a performance decision, and the two produce
genuinely different behaviour from identical code.

The clearest demonstration: graph traversal with a stack visits depth-first, and the same
loop with a queue visits breadth-first. Nothing else changes. Chapter 4 leans on this
heavily.

## Stacks: the most recent thing is the relevant thing

A stack is the right model whenever the most recently opened thing must be resolved
before anything older.

- **Matching delimiters.** Every `(` pushes; every `)` pops and checks. An unmatched close, or a non-empty stack at the end, is the error.
- **Undo history.** The last action is the first to reverse.
- **Backtracking.** Explore a branch, and on failure return to the most recent decision point.
- **The call stack itself.** A function must return before its caller can continue. Recursion is a stack you didn't write, which is why any recursive algorithm can be rewritten with an explicit one.

In Python a plain `list` is the stack: `append` and `pop` are both O(1) amortized at the
end, which is the end a stack uses.

```python
def balanced(s):
    pairs = {')': '(', ']': '[', '}': '{'}
    stack = []
    for ch in s:
        if ch in "([{":
            stack.append(ch)
        elif ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False
    return not stack
```

The `not stack` at the end is the part people forget: `"((("` never fails a pop, and is
still unbalanced.

## Queues: order of arrival matters

A queue is the right model when fairness or arrival order is part of the problem.

- **BFS frontier.** Nodes are explored in order of distance from the start, which is what makes BFS find shortest paths in unweighted graphs.
- **Task and message processing.** The backbone of the queue-based systems in **Event-Driven Systems** — the data structure and the infrastructure are the same idea at different scales.
- **Rate limiting and buffering.** Requests wait their turn rather than being dropped.
- **Level-order processing.** Any "handle everything at this depth before going deeper" problem.

The implementation detail that matters: **do not use a list as a queue.** `list.pop(0)`
is O(n), because it shifts every remaining element down one slot, so processing n items
is O(n²). Use `collections.deque`, whose `popleft` is O(1).

```python
from collections import deque

q = deque([start])
while q:
    node = q.popleft()       # O(1) — list.pop(0) would be O(n)
    ...
```

This is worth stating flatly because the list version *works*. It produces correct
output on the test data and becomes a production incident at scale, which is the worst
kind of bug to ship.

## Deques

A **deque** (double-ended queue) supports O(1) insertion and removal at *both* ends. It's
a superset of the other two — it can act as either — and it's the default choice in
Python for anything queue-shaped.

It's implemented as a doubly linked list of fixed-size blocks, which is why both ends are
cheap and why indexing into the middle is O(n) rather than O(1). If you need arbitrary
indexing, you wanted a list.

Two capabilities the deque adds that neither a stack nor a queue has:

**Fixed-size sliding history.** `deque(maxlen=k)` discards from the far end automatically
on overflow — a one-line ring buffer for "the last k events".

**Access to both ends at once**, which is what the sliding-window-maximum algorithm needs
and what the monotonic deque in Chapter 5 is built on.

| Operation | `list` | `deque` |
| --- | --- | --- |
| Append / pop at the right | O(1) | O(1) |
| Append / pop at the left | **O(n)** | O(1) |
| Index into the middle | O(1) | O(n) |

:::tip[Key insight]
Stacks and queues aren't chosen for speed — both are O(1) at what they do. They're chosen
because one of them matches the *order* your problem requires. Getting that choice right
is usually the whole design decision, and the code is the same either way.
:::

## What to take away

- Stack means "resolve the most recent first"; queue means "resolve in arrival order". The choice models the problem.
- Recursion is an implicit stack, which is why any recursion can be made iterative.
- Never use `list.pop(0)` as a dequeue — it's O(n) and turns a linear loop quadratic.
- `collections.deque` is O(1) at both ends and is the right default for both roles in Python.
- `deque(maxlen=k)` is a free ring buffer for bounded history.

## References

- [Python — `collections.deque`](https://docs.python.org/3/library/collections.html#collections.deque)
- [Python — Using lists as stacks and queues](https://docs.python.org/3/tutorial/datastructures.html#using-lists-as-queues)
- [Python — `queue` module](https://docs.python.org/3/library/queue.html) — the thread-safe variants, for the concurrent case
- [Cormen, Leiserson, Rivest & Stein — *Introduction to Algorithms*, 4th ed.](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/), Section 10.1
