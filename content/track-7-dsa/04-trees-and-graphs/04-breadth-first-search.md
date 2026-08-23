---
title: "Breadth-First Search"
description: "Level-order traversal, why BFS finds shortest paths in unweighted graphs, and the multi-source variant that solves a surprising number of grid problems."
track: 7
chapter: 4
page: 4
readMinutes: 5
---

## Explore in rings

Breadth-first search visits every node at distance 1 from the start, then every node at
distance 2, and so on. It expands outward in rings rather than plunging down one branch.

The code is DFS's iterative form with one substitution:

```python
from collections import deque

def bfs(start):
    frontier, seen = deque([start]), {start}
    while frontier:
        node = frontier.popleft()               # popleft, not pop
        for neighbour in graph[node]:
            if neighbour not in seen:
                seen.add(neighbour)
                frontier.append(neighbour)
```

Two details that are easy to get wrong and expensive to debug:

**Use a `deque`.** `list.pop(0)` is O(n), which makes the whole traversal O(n²). It
produces correct output, so tests pass and production doesn't.

**Mark nodes seen when you enqueue them, not when you dequeue them.** Marking on dequeue
lets a node be added to the queue by several neighbours before it's processed, so it gets
expanded multiple times. On a dense graph that's an exponential blow-up rather than a
small inefficiency.

## Why the shortest path falls out

BFS finds shortest paths in unweighted graphs, and the reason is worth stating precisely
rather than accepting.

The queue is processed in insertion order, and nodes at distance d are all inserted before
any node at distance d + 1 — because a node at distance d + 1 can only be discovered from a
node at distance d, which hasn't been processed yet. So the queue is always sorted by
distance, and the first time BFS reaches a node is necessarily via a shortest route. Once
`seen` marks it, no later, longer path can overwrite it.

That argument depends on every edge costing the same. The moment edges carry different
weights it collapses — a two-edge path can be cheaper than a one-edge path — and you need
Dijkstra's algorithm, which is the same loop with a heap as the frontier so the *cheapest*
node comes out next rather than the *earliest*.

:::tip[Key insight]
BFS, DFS and Dijkstra are the same loop with three different frontier structures: a queue,
a stack, and a heap. Once you see that, "which algorithm" becomes "which order do I want
nodes to come out in", which is a much easier question and one you can answer from the
problem statement.
:::

To recover the path itself rather than just its length, record where each node was first
reached and walk the pointers back:

```python
def shortest_path(start, goal):
    parent = {start: None}
    frontier = deque([start])
    while frontier:
        node = frontier.popleft()
        if node == goal:
            break
        for nxt in graph[node]:
            if nxt not in parent:               # parent doubles as the seen set
                parent[nxt] = node
                frontier.append(nxt)
    if goal not in parent:
        return None
    path = []
    while goal is not None:
        path.append(goal)
        goal = parent[goal]
    return path[::-1]
```

Using `parent` as the visited set removes a whole structure and a whole class of
"updated one but not the other" bug.

## Processing level by level

Some problems need to know *which* level a node is on, or to process each level as a unit.
The idiom is to snapshot the queue length before the inner loop, because that length is
exactly the current level's size:

```python
while frontier:
    for _ in range(len(frontier)):              # exactly this level
        node = frontier.popleft()
        ...
        frontier.append(neighbour)
    depth += 1                                  # a whole level finished
```

This is how you answer "how many levels deep is this tree", "print each level on its own
line", or "what is the rightmost node at every depth."

## Multi-source BFS

The variant that solves more real problems than any other, and the one most people don't
know exists.

If you seed the queue with *several* starting nodes at distance 0, BFS computes each
node's distance to the *nearest* source in a single pass. No repeated searches, no
comparison of results — the ring expansion just starts from multiple centres at once.

```python
frontier = deque(all_sources)                   # every source at distance 0
dist = {s: 0 for s in all_sources}
```

The problems this dissolves are everywhere once you look: how far is each cell from the
closest wall; how long until every orange in a crate has spoiled given several initial
spoiled ones; which distribution centre serves each address; how many steps until fire
started at three points reaches every room. Each of those is O(V + E) as a multi-source
BFS, and O(sources × (V + E)) if you run one search per source.

## BFS versus DFS

| | BFS | DFS |
| --- | --- | --- |
| Frontier | Queue | Stack (often the call stack) |
| Finds shortest path (unweighted) | **Yes** | No |
| Memory | O(width) — can be huge on a broad graph | O(depth) |
| Natural for | Distance, levels, nearest-anything | Exhaustive exploration, backtracking, subtree aggregates |
| Fails on | Very wide graphs (queue size) | Very deep graphs (stack depth) |

The memory row is the practical discriminator on large graphs. BFS holds an entire level
at once, so on a graph with high branching factor the queue can dwarf the graph's depth.
DFS holds one root-to-leaf path, which is small — until the graph is a chain, at which
point it's the stack that overflows. Neither is universally cheaper.

## What to take away

- BFS expands in rings, using a queue; it's the same loop as DFS with `popleft` instead of `pop`.
- Mark nodes seen on enqueue, and use a `deque` — the two most common ways to make a correct BFS slow or exponential.
- Shortest paths fall out because the queue stays sorted by distance, which requires uniform edge weights. Weighted graphs need a heap, i.e. Dijkstra.
- Snapshot `len(frontier)` to process one level at a time.
- Multi-source BFS finds each node's distance to the *nearest* seed in one pass, and it's the right answer far more often than it's used.

## References

- [Cormen, Leiserson, Rivest & Stein — *Introduction to Algorithms*, 4th ed.](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/), Section 20.2 ("Breadth-first search")
- [Python — `collections.deque`](https://docs.python.org/3/library/collections.html#collections.deque)
- [Sedgewick & Wayne — *Algorithms*, 4th ed., Section 4.1](https://algs4.cs.princeton.edu/41graph/)
