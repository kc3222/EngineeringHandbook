---
title: "Graph Problems in Disguise"
description: "Exchange rates, package build order, and two pieces converging on a board — three problems where recognising the graph is the whole difficulty."
track: 7
chapter: 29
page: 2
readMinutes: 5
---

None of the three problems below mentions a graph. In each, the difficulty is almost
entirely in question one of the stripping procedure — *what are the objects, and what
relates them* — after which the algorithm is straight from **Trees & Graph Traversal**.

## Currency Conversion

Given a set of exchange relationships between currencies — one unit of C is worth 10 of B,
one unit of B is worth 110 of Z, and so on — find the rate between any two currencies, or
report that no chain connects them.

<details>
<summary>Show solution</summary>

**Approach.** Nothing here looks like a graph until you notice that each relationship is an
edge with a multiplicative weight, and that the reverse edge is its reciprocal. A conversion
is then a path, and the rate is the product along it. BFS finds one.

The multiplicative weight is the only unusual part. Ordinary weighted paths add; these
multiply, so the accumulator starts at 1.0 rather than 0 and is multiplied rather than
incremented. Everything else is the BFS from Chapter 26.

```python
from collections import defaultdict, deque

def build(rates):                    # rates: (a, b, r) meaning 1 a == r b
    g = defaultdict(list)
    for a, b, r in rates:
        g[a].append((b, r))
        g[b].append((a, 1 / r))      # the reverse edge is the reciprocal
    return g

def convert(g, src, dst):
    if src not in g or dst not in g:
        return None
    seen, q = {src}, deque([(src, 1.0)])
    while q:
        node, acc = q.popleft()
        if node == dst:
            return acc
        for nxt, rate in g[node]:
            if nxt not in seen:
                seen.add(nxt)
                q.append((nxt, acc * rate))
    return None
```

Time O(V + E) per query, space O(V + E).

**Why BFS is enough.** Any path gives the correct rate, provided the rate table is
self-consistent — that's an assumption worth stating rather than assuming, since a table
containing an arbitrage cycle would give different answers by different routes. If the table
*isn't* consistent, no single answer exists and the interesting question becomes finding the
profitable cycle, which is Bellman–Ford over the logarithms of the rates.

**Follow-up.** With many queries against a fixed rate table, per-query BFS repeats work.
Weighted union-find stores each node's rate relative to its component's root, making a query
O(α(n)) after construction — the union-find from Chapter 24 with a numeric annotation on
each parent pointer. The cost is that the structure must be rebuilt when rates change, which
is the wrong trade for a live FX feed and the right one for a static table.

</details>

## Package Build Order

Given a set of packages and the dependencies between them, produce an order in which they
can be built such that nothing is built before what it needs.

<details>
<summary>Show solution</summary>

**Approach.** This one barely wears a disguise — dependencies are directed edges, and
"an order such that nothing precedes what it needs" is the definition of a topological sort.
Kahn's algorithm: repeatedly take any package with no unbuilt dependencies.

If the queue empties before every package is placed, the remainder sits in a cycle.

```python
from collections import defaultdict, deque

def build_order(packages, dependencies):     # (pkg, depends_on)
    graph = defaultdict(list)
    indegree = {p: 0 for p in packages}
    for pkg, dep in dependencies:
        graph[dep].append(pkg)
        indegree[pkg] += 1

    q = deque(p for p in packages if indegree[p] == 0)
    order = []
    while q:
        p = q.popleft()
        order.append(p)
        for nxt in graph[p]:
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                q.append(nxt)

    if len(order) != len(packages):
        raise ValueError("circular dependency")
    return order
```

Time O(V + E), space O(V + E). Back-reference: Chapter 26, *Ordering & Cycles*.

**Follow-up.** Detecting the cycle is table stakes; naming which packages are in it is the
real ask, and it's free — the nodes still carrying nonzero indegree at termination are
exactly that set. Two further extensions come up often enough to have ready: swapping the
`deque` for a heap gives a deterministic, lexicographically smallest order, which is what a
lockfile needs; and processing the queue in *batches* rather than one at a time gives the
parallel build schedule, since everything in a batch is mutually independent.

</details>

## Two Knights Converging

Two knights sit on an unbounded chessboard. Both move with standard knight moves. Find the
smallest total number of moves — counting both knights — after which they occupy the same
square.

<details>
<summary>Show solution</summary>

**Approach.** The board is the graph: each square is a node, and the eight knight moves are
its edges. Nothing is stored in advance — an unbounded board rules out precomputing
distances, so this is the *implicit graph* case from Chapter 26's *Graph Representation*
page, where `seen` is a hash set of coordinates rather than an array.

Searching outward from both knights at once and looking for the cheapest square reachable by
both is far better than a single search, because BFS explores area quadratic in the radius:
two searches of radius r/2 examine a fraction of what one search of radius r does.

```python
from collections import deque

MOVES = [(1, 2), (2, 1), (-1, 2), (-2, 1),
         (1, -2), (2, -1), (-1, -2), (-2, -1)]

def min_total_moves(a, b):
    if a == b:
        return 0
    dist = [{a: 0}, {b: 0}]
    frontier = [deque([a]), deque([b])]
    turn, best = 0, None

    while best is None:
        q, seen, other = frontier[turn], dist[turn], dist[1 - turn]
        for _ in range(len(q)):                  # finish this whole layer
            x, y = q.popleft()
            for dx, dy in MOVES:
                nxt = (x + dx, y + dy)
                if nxt in seen:
                    continue
                seen[nxt] = seen[(x, y)] + 1
                if nxt in other:
                    total = seen[nxt] + other[nxt]
                    best = total if best is None else min(best, total)
                q.append(nxt)
        turn ^= 1
    return best
```

**The bug worth flagging.** Returning on first contact is wrong. The first square both
searches touch need not minimise the *sum* — one search may have reached it by a long route
while a neighbouring square is reachable cheaply from both. The loop above finishes the
current layer with `for _ in range(len(q))` and takes the minimum across it, which is the
level-at-a-time idiom from Chapter 26's BFS page.

This is the single most common error in bidirectional search, and it's worth being able to
say out loud rather than just coding around: *first meeting is not cheapest meeting.*

**Follow-up.** Knight distance on an unbounded board actually has a closed form — a small
number of cases based on the coordinate difference — so the search isn't strictly necessary.
That's worth knowing as an illustration of the next page's theme rather than as the expected
answer: recognising that a search can be replaced by arithmetic is a different skill from
writing the search, and here the search is what's being asked for.

</details>

## What to take away

- Edges arrive disguised as rates, dependencies, and board moves. Question one of the stripping procedure is where the difficulty lives.
- Multiplicative edge weights need an accumulator that starts at 1 and multiplies; everything else about the traversal is unchanged.
- Topological sort's failure output — the nodes with nonzero indegree — is the useful part, and it's free.
- An unbounded state space means an implicit graph: compute successors, keep `seen` as a hash set, materialise only what you reach.
- In bidirectional search, finish the current layer before taking a minimum. First contact does not minimise the total.
