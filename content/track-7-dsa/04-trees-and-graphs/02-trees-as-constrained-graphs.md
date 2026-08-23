---
title: "Trees as Constrained Graphs"
description: "A tree is a graph with no cycles and exactly one path between any two nodes — the reframing that makes this chapter one topic rather than two."
track: 7
chapter: 4
page: 2
readMinutes: 4
---

## Same object, fewer guarantees

A **graph** is a set of nodes and a set of edges connecting them. That's the entire
definition, and it admits almost anything: cycles, disconnected pieces, multiple routes
between the same two nodes, nodes with no edges at all.

A **tree** is a graph that additionally satisfies two constraints:

1. It is **connected** — every node is reachable from every other.
2. It has **no cycles**.

Everything people learn separately about trees is a consequence of those two lines.
Between any two nodes there is exactly one path, because a second path would close a
cycle. A tree with n nodes has exactly n − 1 edges, because connecting n nodes needs at
least n − 1 edges and any additional one creates a cycle. Every node except the root has
exactly one parent, because a second parent would also be a cycle.

:::tip[Key insight]
The reason trees are easier than graphs is not that they're a different structure — it's
that acyclicity removes the need to track what you've already visited. Every traversal in
this chapter is the same loop; on a tree you can drop the `seen` set, and on a graph you
cannot. That single difference accounts for most of the apparent gap between "tree
problems" and "graph problems."
:::

## The vocabulary, once

| Term | Meaning |
| --- | --- |
| Directed / undirected | Edges have a direction, or don't |
| Weighted | Edges carry a cost — distance, capacity, rate |
| Degree | Number of edges at a node (in-degree and out-degree if directed) |
| Path | A sequence of nodes connected by edges |
| Cycle | A path that returns to its start |
| Connected component | A maximal set of mutually reachable nodes |
| DAG | Directed acyclic graph — directed, no cycles |
| Dense / sparse | Edge count near n², or nearer n |

**DAG** is the term worth dwelling on, because it sits precisely between a tree and a
general graph. A DAG has no cycles, like a tree, but permits a node to have several
parents — so there can be more than one path between two nodes even though none of them
loops. Dependency graphs are DAGs: a library can be required by many packages without
that being a cycle. Topological sort, on this chapter's *Ordering & Cycles* page, is the
algorithm that exists for exactly this shape.

## Tree vocabulary that doesn't generalise

Some tree terms are about a chosen **root**, not about the structure. Rooting a tree means
picking a node and orienting every edge away from it; parent, child, ancestor, depth and
subtree are all defined relative to that choice. An unrooted tree has none of them.

This matters because "the root" is often an arbitrary decision that the problem hands you
for free — a filesystem has an obvious root, a network of five connected routers does not.
When a tree problem seems to have no natural root, that's usually a sign the rooting is
yours to choose, and the choice can simplify the problem considerably.

**Height** is the longest root-to-leaf path; **depth** is the distance from the root to a
given node. The distinction matters mainly because complexity is usually quoted in terms
of height, and a tree's height ranges from O(log n) when balanced to O(n) when it has
degenerated into a chain.

## Binary trees and binary search trees

A **binary tree** constrains each node to at most two children. This has nothing to do with
ordering — it's just a shape, and it's the one that maps cleanly onto arrays (as heaps do)
and onto two-way recursion.

A **binary search tree** adds an ordering invariant: everything in the left subtree is
smaller than the node, everything in the right is larger. That invariant is what makes
lookup O(height), because at each node you can discard half the remaining structure.

The catch is in the "height." Inserting sorted data into an unbalanced BST produces a
chain, and every operation becomes O(n) — the structure is technically a tree and
practically a linked list. Self-balancing variants (AVL, red-black, B-trees) add rebalancing
on insert to guarantee O(log n) height, which is why real implementations — `std::map`,
Java's `TreeMap`, every relational database index — are always one of those and never a
plain BST.

## What the reframing buys you

Three concrete consequences, each of which shows up later in the chapter.

**One traversal, two contexts.** The DFS you write for a tree works on a graph with one
addition: a `seen` set. The BFS is identical. There's no second algorithm to learn.

**Trees hidden in graph problems.** Running BFS from a start node produces a **BFS tree** —
the edges actually used to reach each node for the first time. Following parent pointers
back through it reconstructs the shortest path, which is how BFS answers path queries and
not just reachability.

**Graphs hidden in tree problems.** A tree given as parent pointers, or as a list of
undirected edges with no designated root, is most easily handled by building an adjacency
list and treating it as a graph — at which point rooting it is one DFS.

## What to take away

- A tree is a connected, acyclic graph. Every familiar tree property follows from those two words.
- n nodes and n − 1 edges, exactly one path between any two nodes, one parent per non-root node — all consequences, not separate facts.
- Acyclicity is what lets you drop the visited set; that's the real difference between tree and graph code.
- A DAG sits between the two: no cycles, but multiple parents allowed. Dependency graphs are DAGs.
- Parent, depth and subtree are properties of a chosen root, not of the structure — and choosing the root well can simplify a problem.

## References

- [Cormen, Leiserson, Rivest & Stein — *Introduction to Algorithms*, 4th ed.](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/), Appendix B.5 and Chapters 12–13
- [Sedgewick & Wayne — *Algorithms*, 4th ed., Section 4.1 (Undirected Graphs)](https://algs4.cs.princeton.edu/41graph/)
