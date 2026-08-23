---
title: "Union-Find"
description: "Disjoint sets, path compression and union by rank — connectivity under incremental merges, and the structure most engineers never learn."
track: 7
chapter: 2
page: 7
readMinutes: 5
---

## Merging groups, one at a time

Start with a room of people who don't know each other. Introductions happen one at a
time. After each introduction, two questions might be asked: *are these two people in the
same social group now?* and *how many separate groups are left?*

You could rebuild the answer from scratch after every introduction — run a graph traversal
over all the connections so far — and that's O(n) per question. Union-find answers both in
effectively constant time, by never rebuilding anything.

The structure is officially the **disjoint-set union** (DSU), and it supports exactly two
operations:

- `find(x)` — which group is x in?
- `union(a, b)` — merge the groups containing a and b.

That's it. There is no "split", no "list the members", no "remove". The narrowness is why
it can be so fast.

## The representation

Each element points at a parent. Following parents leads to a **root**, and the root is
the group's identity — two elements are in the same group exactly when they have the same
root. A root points at itself.

```python
class DSU:
    def __init__(self, n):
        self.parent = list(range(n))    # everyone is their own root
        self.size = [1] * n
```

Naively, `find` walks to the root and `union` points one root at the other. Done that
way, the trees can degenerate into chains and both operations become O(n). Two
optimisations fix that, and they're each one line.

## Path compression

While walking up to the root, re-point every node you pass directly at the root. The
walk you just paid for is used to make every future walk shorter.

```python
    def find(self, x):
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]   # point at grandparent
            x = self.parent[x]
        return x
```

This iterative variant — *path halving* — compresses as it goes without a second pass or
recursion. Recursion is the more commonly shown form and is fine until the tree is deep
enough to overflow the stack, which is precisely the case compression exists to prevent.

## Union by size or rank

When merging, always attach the *smaller* tree under the larger root. Attaching the larger
one under the smaller deepens every node in the larger tree, which is the wrong direction.

```python
    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False                       # already together
        if self.size[ra] < self.size[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra
        self.size[ra] += self.size[rb]
        return True                            # a real merge happened
```

The boolean return is worth keeping. "Did this union actually merge two groups" answers
cycle detection and connected-component counting directly, with no extra bookkeeping.

## What it costs

With both optimisations, m operations on n elements cost O(m · α(n)), where α is the
inverse Ackermann function. α(n) is below 5 for any n that fits in the observable
universe, so the practical reading is **constant time per operation** — but it's worth
knowing that the constant is a bound proven by Tarjan, not an average or an assumption
about the input.

Neither optimisation alone gets there. Path compression alone or union by rank alone is
O(log n) per operation. Together they are effectively O(1), which is one of the more
pleasing results in the area.

:::tip[Key insight]
Union-find is fast because of what it refuses to do. It cannot split a group, list a
group's members, or tell you *how* two elements are connected — only *that* they are. Give
up those three questions and connectivity under merges becomes constant-time. Ask any of
them and you need a graph.
:::

## What it's for

The tell is always the same: **relationships that only ever get added, with membership
questions in between.**

- **Cycle detection while building an undirected graph.** If an edge's endpoints already share a root, that edge closes a cycle. Kruskal's minimum-spanning-tree algorithm is exactly this: sort edges by weight, add each one whose `union` returns `True`.
- **Connected components.** Count the roots, or count how many `union` calls actually merged. Grid problems — regions of land in a map, groups of adjacent matching cells — are this in disguise.
- **Incremental equivalence.** Type unification in a compiler, deduplicating accounts as identifiers are discovered to match, and grouping test cases by an equality relation discovered over time.
- **Percolation and network reliability.** Add links one at a time and ask when two endpoints first become connected.

Where it does *not* apply is anything requiring removal. Deleting an edge can split a
component, and union-find has no way to undo a merge. That problem — dynamic connectivity
with deletions — is substantially harder, and the usual practical answer is to rebuild,
or to process the operations in reverse so deletions become insertions.

## What to take away

- Union-find answers "are these in the same group" and "merge these groups", both in effectively constant time.
- Path compression flattens trees during `find`; union by size keeps them shallow during `union`. You need both to reach O(α(n)).
- Have `union` return whether a merge occurred — that single boolean answers cycle detection and component counting.
- The trigger is connectivity under *incremental* merges. Any need to delete or split means this is the wrong structure.
- It cannot tell you the path between two elements, only that one exists.

## References

- [Tarjan — *Efficiency of a Good But Not Linear Set Union Algorithm*](https://dl.acm.org/doi/10.1145/321879.321884), JACM 1975 — the inverse-Ackermann bound
- [Cormen, Leiserson, Rivest & Stein — *Introduction to Algorithms*, 4th ed.](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/), Chapter 19 ("Data Structures for Disjoint Sets")
- [Sedgewick & Wayne — *Algorithms*, 4th ed., Section 1.5 (Case Study: Union-Find)](https://algs4.cs.princeton.edu/15uf/)
