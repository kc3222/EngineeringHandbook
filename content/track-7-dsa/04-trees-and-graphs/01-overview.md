---
title: "Trees & Graph Traversal"
description: "BFS, DFS, and the recursive shapes that show up once you stop seeing trees and graphs as different things."
track: 7
chapter: 4
page: 1
readMinutes: 3
---

:::info[Prerequisites]
**Core Data Structures**, pages *Hash Maps & Sets*, *Stacks & Queues* and *Heaps &
Priority Queues*. Every traversal in this chapter is a loop over a frontier, and the
frontier is one of those three structures — swapping which one you use is what changes
the algorithm.
:::

## Why this chapter exists

Trees and graphs get taught as separate topics, and that separation costs more than it
saves. A tree is a graph with two extra properties; a traversal written for one works on
the other once you add cycle handling. Teaching them together halves the material and
makes the shared machinery visible.

The other reason is that graphs are the most commonly *unrecognised* structure in
practice. Very little real data arrives labelled "graph." It arrives as a table of
package dependencies, a grid of map tiles, a set of currency exchange rates, a hierarchy
of organisational units, or a list of "user A referred user B." Recognising these as
graphs is most of the work, and the algorithm that follows is usually one of the two on
this chapter's central pages.

## The whole chapter in one loop

Nearly everything here is this:

```python
frontier = [start]
seen = {start}
while frontier:
    node = frontier.take()              # which end? that's the algorithm
    for neighbour in graph[node]:
        if neighbour not in seen:
            seen.add(neighbour)
            frontier.add(neighbour)
```

Take from the same end you add to — a stack — and you get depth-first search. Take from
the opposite end — a queue — and you get breadth-first search, which additionally finds
shortest paths. Take the smallest by accumulated weight — a heap — and you get Dijkstra's
algorithm. Same loop, three different structures, three different traversal orders.

The `seen` set is not optional the moment cycles are possible, and forgetting it is how a
graph traversal becomes an infinite loop.

## What's in here

| Page | What it covers |
| --- | --- |
| Trees as Constrained Graphs | The reframing that makes the rest of the chapter one topic rather than two |
| Depth-First Search | Recursive and iterative forms; pre-, in- and post-order as "when do I do the work" |
| Breadth-First Search | Level-order, shortest paths in unweighted graphs, multi-source BFS |
| Graph Representation | Adjacency list, matrix and edge list — and how the choice changes the complexity |
| Ordering & Cycles | Topological sort and cycle detection, and the dependency problems they model |
| Worked Examples | Counting regions in a grid, shortest path, cycle detection in a dependency graph, lowest common ancestor |

## Where this connects

**Algorithmic Patterns** shares the recursive shape: DFS on a tree is the same recursion
as a divide-and-conquer split. **Dynamic Programming** is DFS with memoization, which is
the single most useful sentence for making DP feel less alien — its *Memoization* page
says so explicitly.

Outside the track, topological sort is what a build system, a database migration runner
and a task scheduler all do; BFS over an unweighted graph is what "degrees of separation"
means; and **RAG Pipelines** uses graph traversal wherever retrieval follows document
references rather than pure similarity.

## References

- [Cormen, Leiserson, Rivest & Stein — *Introduction to Algorithms*, 4th ed.](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/), Part VI ("Graph Algorithms")
- [Sedgewick & Wayne — *Algorithms*, 4th ed., Chapter 4 (Graphs)](https://algs4.cs.princeton.edu/40graphs/)
