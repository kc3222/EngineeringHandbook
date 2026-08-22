---
title: "Ordering & Cycles"
description: "Topological sort and cycle detection, and the dependency-resolution problems they model — build systems, task schedulers, migrations."
track: 7
chapter: 26
page: 6
readMinutes: 5
---

## The question every dependency system asks

Given things that depend on other things, in what order can they be done? And if no order
works, which things are stuck in a loop?

That is the entire content of this page, and it's the question behind build systems,
package managers, database migration runners, task schedulers, spreadsheet recalculation,
module loaders and course prerequisites. All of them are computing a **topological sort**
of a directed graph, and all of them fail in the same way — a cycle — for which the useful
error message names the participants rather than just reporting failure.

A topological order exists **if and only if** the graph is a DAG. That equivalence is why
the ordering algorithm and the cycle-detection algorithm are the same algorithm read two
ways.

## Kahn's algorithm: sort by indegree

Repeatedly take any node with no remaining unmet dependencies.

```python
from collections import defaultdict, deque

def topological_order(nodes, edges):            # edges: (before, after)
    graph = defaultdict(list)
    indegree = {n: 0 for n in nodes}
    for before, after in edges:
        graph[before].append(after)
        indegree[after] += 1

    ready = deque(n for n in nodes if indegree[n] == 0)
    order = []
    while ready:
        n = ready.popleft()
        order.append(n)
        for nxt in graph[n]:
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                ready.append(nxt)

    if len(order) != len(nodes):
        raise ValueError("cycle detected")
    return order
```

O(V + E) time and space. Three things about it are worth naming:

**The final length check is the cycle detection.** If the queue empties before every node
is placed, the remainder cannot have reached indegree zero, which means each is waiting on
something in the same group — a cycle. No separate pass is needed.

**The nodes still holding nonzero indegree are exactly the ones in or downstream of a
cycle.** That's the difference between "circular dependency detected" and "circular
dependency: `auth` → `config` → `logging` → `auth`", and the second is worth the two
extra lines in any tool a human will use.

**The order is not unique.** Any node with indegree zero is a valid next choice, so the
result depends on the queue order. Swapping the `deque` for a heap gives the
lexicographically smallest valid order, which is what you want when the output must be
reproducible across runs — a real requirement for build systems and lockfiles.

## The DFS formulation

The other standard approach runs DFS and emits each node *after* all its descendants —
post-order — then reverses:

```python
def topological_order_dfs(nodes, graph):
    WHITE, GREY, BLACK = 0, 1, 2
    colour = {n: WHITE for n in nodes}
    order = []

    def visit(n):
        colour[n] = GREY                       # on the current path
        for nxt in graph[n]:
            if colour[nxt] == GREY:
                raise ValueError(f"cycle through {nxt}")
            if colour[nxt] == WHITE:
                visit(nxt)
        colour[n] = BLACK                      # finished
        order.append(n)

    for n in nodes:
        if colour[n] == WHITE:
            visit(n)
    return order[::-1]
```

The three colours are the important part, and the reason a plain `seen` set is not enough.

:::tip[Key insight]
Cycle detection in a *directed* graph needs three states, not two. A node you've seen
before might be on the path you're currently walking — which is a cycle — or it might be
in a branch you finished exploring earlier, which is not. Grey means "on the current
path"; black means "done". Collapsing them into one "visited" set reports a cycle every
time two paths converge, which happens constantly in ordinary DAGs.
:::

Undirected graphs are the opposite case: there, two states suffice, and the check is
"reached an already-visited node that isn't the one I came from." The `x != parent` guard
is what stops every single edge from being reported as a two-node cycle.

## Choosing between them

| | Kahn (indegree) | DFS (three-colour) |
| --- | --- | --- |
| Reports which nodes are in the cycle | Naturally — the leftovers | Naturally — the grey path |
| Stack depth | None (iterative) | O(V), can overflow |
| Lexicographic / prioritised order | Swap the deque for a heap | Awkward |
| Detects the cycle | At the end | Immediately, on first back edge |
| Also gives | Level structure, if you batch by level | Finish times, needed for strongly connected components |

Kahn's is the better default: it's iterative, so deep graphs don't overflow the stack, and
its failure output is more useful. The DFS version earns its place when you need to fail
fast on the first cycle, or when you're building toward strongly connected components,
where finish times are the mechanism.

The batching property deserves a mention of its own. If instead of popping one node you
process the entire current `ready` queue as a batch, each batch is a set of nodes with no
dependencies on each other — which is precisely the set that can be built **in parallel**.
That's how a parallel build scheduler works, and it's three lines' difference from the
sequential version.

## Cycles that aren't errors

Not every cycle is a bug to report. Deadlock detection in a database finds a cycle in the
wait-for graph and then *breaks* it by aborting one transaction. Garbage collectors detect
reference cycles in order to collect them, which is exactly why reference counting alone
is insufficient and CPython ships a separate cycle collector. Spreadsheet software reports
circular references to the user rather than refusing to open the file.

The algorithm is the same in each case; what differs is the response, and that's a product
decision rather than an algorithmic one.

## What to take away

- A topological order exists exactly when the graph is a DAG, which is why ordering and cycle detection are one algorithm.
- Kahn's algorithm repeatedly takes indegree-zero nodes; if it stops early, the leftovers are the cycle. Prefer it — it's iterative and its errors are useful.
- Directed cycle detection needs three states. Two collapses "on the current path" with "already finished" and reports false cycles on any DAG with converging paths.
- Undirected cycle detection needs two states plus a "don't count the edge I arrived on" guard.
- Processing Kahn's queue in batches gives you the parallel schedule for free.

## References

- [Kahn — *Topological sorting of large networks*](https://dl.acm.org/doi/10.1145/368996.369025), CACM 1962
- [Cormen, Leiserson, Rivest & Stein — *Introduction to Algorithms*, 4th ed.](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/), Section 20.4 ("Topological sort") and 20.5 ("Strongly connected components")
- [Python — `graphlib.TopologicalSorter`](https://docs.python.org/3/library/graphlib.html) — the standard library's implementation, including the parallel-batch API
- [PostgreSQL — Deadlock detection](https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-DEADLOCKS) — cycle detection in a wait-for graph
