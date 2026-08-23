---
title: "Graph Representation"
description: "Adjacency list, matrix and edge list — how the choice changes complexity, and how to build a graph from input that doesn't look like one."
track: 7
chapter: 4
page: 5
readMinutes: 4
---

## Three ways to store the same thing

The algorithms on the previous pages all assume `graph[node]` yields the neighbours. How
that's stored is a separate decision, and it changes the complexity of everything built on
top.

**Adjacency list** — a map from each node to its neighbours. The default, and correct for
almost every real graph.

```python
from collections import defaultdict

graph = defaultdict(list)
for a, b in edges:
    graph[a].append(b)
    graph[b].append(a)          # omit this line for a directed graph
```

**Adjacency matrix** — an n × n grid where `m[i][j]` says whether the edge exists, or what
it weighs.

```python
m = [[0] * n for _ in range(n)]
for a, b in edges:
    m[a][b] = m[b][a] = 1
```

**Edge list** — just the pairs, with no index at all. Useless for traversal, ideal for
algorithms that process edges in sorted order, which is why Kruskal's minimum-spanning-tree
algorithm takes one.

## What each costs

| | Adjacency list | Adjacency matrix | Edge list |
| --- | --- | --- | --- |
| Space | O(V + E) | **O(V²)** | O(E) |
| Iterate a node's neighbours | O(degree) | **O(V)** | O(E) |
| Is there an edge a→b? | O(degree) | **O(1)** | O(E) |
| Add an edge | O(1) | O(1) | O(1) |
| Full traversal (BFS/DFS) | O(V + E) | **O(V²)** | Not directly possible |

The pattern: the list is cheaper at everything except the single-edge existence check,
where the matrix is unbeatable. The space row is what usually decides it. A social graph
with a million users averaging 200 connections each has E ≈ 2 × 10⁸ — large but storable
as a list. As a matrix it needs 10¹² cells, which is not a tuning problem.

**Density is the deciding factor.** A graph is dense when E approaches V², and for a dense
graph the matrix's O(V²) space is what you were paying anyway, while its O(1) edge lookup
is free. That's rare in practice: real graphs — road networks, dependency trees, social
graphs, web links — are overwhelmingly sparse. The honest default is an adjacency list,
with the matrix reserved for small V (say under a thousand), genuinely dense data, or
algorithms like Floyd–Warshall that are matrix-shaped by construction.

:::tip[Key insight]
Representation is not a storage detail — it is a complexity decision made before the
algorithm runs. The same BFS is O(V + E) on an adjacency list and O(V²) on a matrix,
because scanning a matrix row to find a node's neighbours means examining every node in
the graph, most of which aren't neighbours at all.
:::

## Building a graph from input that doesn't look like one

This is the part that matters most in practice, because real problems very rarely arrive
as an edge list. The skill is spotting the two components: **what is a node** and **what
makes two nodes adjacent**.

**A grid is a graph.** Each cell is a node; adjacency is the four (or eight) neighbouring
cells. Nothing needs to be built — the grid *is* the adjacency structure, and the
neighbour function replaces `graph[node]`:

```python
DIRS = ((0, 1), (1, 0), (0, -1), (-1, 0))

def neighbours(r, c, grid):
    for dr, dc in DIRS:
        nr, nc = r + dr, c + dc
        if 0 <= nr < len(grid) and 0 <= nc < len(grid[0]):
            yield nr, nc
```

Every "count the regions", "shortest path through a maze", "how far is each cell from
water" problem is a graph traversal over this. Bounds-checking inside the neighbour
generator, rather than at every call site, is what keeps the traversal code identical to
the general case.

**Implicit graphs have no storage at all.** When states are generated rather than stored —
board positions, string transformations, a knight's moves on an unbounded board — the
"graph" is a function from a state to its successors. BFS works unchanged; only `graph[node]`
becomes `successors(node)`, and `seen` becomes a hash set of states rather than an array.
This is how you search a space far too large to enumerate: you only ever materialise the
part you reach.

**Non-obvious node choices.** Sometimes the nodes aren't the objects in the problem. Word
ladders can use words as nodes and one-letter differences as edges — or, much faster, add
wildcard patterns like `c_t` as intermediate nodes so `cat` and `cot` connect through one
shared node instead of being compared pairwise. Choosing what a node *is* is a design
decision with real complexity consequences.

## Directed, weighted and the bookkeeping around them

For a **directed** graph, add the edge once rather than twice. Keeping a reversed copy is
common — cycle detection, and any "who depends on me" query, wants it.

For a **weighted** graph, store `(neighbour, weight)` tuples in the list, or the weight
itself in the matrix. Note that BFS becomes wrong at this point: it optimises hop count,
not total weight, and the two diverge as soon as edges differ.

For **multigraphs and self-loops**, decide explicitly. A list tolerates both naturally; a
simple matrix silently collapses parallel edges into one, which is either a convenient
deduplication or a silent data loss depending on what you meant.

## What to take away

- Adjacency list is the default: O(V + E) space, O(degree) neighbour iteration, correct for sparse graphs, which is nearly all of them.
- The matrix buys O(1) edge existence for O(V²) space, and turns an O(V + E) traversal into O(V²).
- Density decides. Reach for a matrix only when V is small or E really does approach V².
- Grids are graphs with an implied adjacency function; put the bounds check inside the neighbour generator.
- Implicit graphs need no storage — successors are computed, and `seen` is a hash set of states.

## References

- [Cormen, Leiserson, Rivest & Stein — *Introduction to Algorithms*, 4th ed.](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/), Section 20.1 ("Representations of graphs")
- [Sedgewick & Wayne — *Algorithms*, 4th ed., Section 4.1](https://algs4.cs.princeton.edu/41graph/)
- [NetworkX — Graph data structures](https://networkx.org/documentation/stable/reference/classes/index.html) — a production library's take on the same tradeoffs
