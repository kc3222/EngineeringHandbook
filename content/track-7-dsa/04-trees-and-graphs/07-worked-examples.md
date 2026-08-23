---
title: "Worked Examples"
description: "Counting regions in a grid, shortest path in an unweighted graph, cycle detection in a dependency graph, and lowest common ancestor."
track: 7
chapter: 4
page: 7
readMinutes: 5
---

Four problems, none of which arrives labelled as a graph. Before opening a solution, try
answering the two questions from the *Graph Representation* page: **what is a node, and
what makes two nodes adjacent?** Getting those right is most of the work; the traversal
that follows is the loop from this chapter's overview.

## Counting Regions in a Grid

:::problem
A rectangular grid of cells, each filled (`#`) or empty (`.`). Filled cells
touching horizontally or vertically belong to the same region. Return the
number of regions. Diagonal contact does **not** connect.

```text
Input:  grid = ["##..#",
                "#...#",
                "..##.",
                "#...#"]
Output: 5
Explanation: The regions are {(0,0),(0,1),(1,0)},
             {(0,4),(1,4)}, {(2,2),(2,3)}, {(3,0)} and
             {(3,4)}. (2,3) and (3,4) touch only diagonally,
             so they stay separate.
```

**Constraints.** `1 <= rows, cols <= 1000`.
:::

<details>
<summary>Show solution</summary>

**Approach.** A node is a filled cell; adjacency is the four orthogonal neighbours. No
graph needs to be built — the grid already is one.

Every traversal started from an unvisited filled cell consumes exactly one entire region,
so the answer is the number of times you had to start. Marking cells as you go is what
keeps the total work O(rows × cols) rather than repeated.

The iterative form is deliberate: a large grid of a single filled colour is a
100,000-node connected component, and the recursive version overflows the stack on it.

```python
def count_regions(grid):
    rows, cols = len(grid), len(grid[0])
    seen, regions = set(), 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] != '#' or (r, c) in seen:
                continue
            regions += 1
            stack = [(r, c)]
            seen.add((r, c))
            while stack:                            # one whole region
                y, x = stack.pop()
                for dy, dx in ((0, 1), (1, 0), (0, -1), (-1, 0)):
                    ny, nx = y + dy, x + dx
                    if (0 <= ny < rows and 0 <= nx < cols
                            and grid[ny][nx] == '#' and (ny, nx) not in seen):
                        seen.add((ny, nx))
                        stack.append((ny, nx))
    return regions
```

Time O(rows × cols), space O(rows × cols) for the visited set.

**Follow-up.** If the grid is enormous and mutation is allowed, overwriting visited cells
in place removes the visited set entirely — O(1) extra space at the cost of destroying the
input. And if the question changes to "regions after each cell is filled, one at a time,"
the traversal is the wrong tool: that's incremental connectivity, which is union-find from
Chapter 2.

</details>

## Shortest Path in an Unweighted Graph

:::problem
Given an undirected graph as an adjacency map and two nodes, return the
fewest hops between them, or `None` if no path exists.

```text
Input:  graph = {"A": ["B", "C"], "B": ["A", "D"],
                 "C": ["A", "D"], "D": ["B", "C", "E"],
                 "E": ["D"],      "F": []}
        start = "A", goal = "E"
Output: 3
Explanation: A -> B -> D -> E, or equally A -> C -> D -> E.
             With start = "A", goal = "F" the answer is None:
             F has no edges and is unreachable.
```

**Constraints.** All edges cost the same. `1 <= nodes <= 10**5`.
:::

<details>
<summary>Show solution</summary>

**Approach.** Unweighted means every edge costs the same, which is the precondition that
makes BFS correct — the queue stays sorted by distance, so the first arrival at a node is
via a shortest route.

Using the `dist` map as the visited set removes a whole structure and the class of bugs
where one is updated and the other isn't.

```python
from collections import deque

def hops(graph, start, goal):
    if start == goal:
        return 0
    dist = {start: 0}
    frontier = deque([start])
    while frontier:
        node = frontier.popleft()
        for nxt in graph[node]:
            if nxt in dist:
                continue
            dist[nxt] = dist[node] + 1
            if nxt == goal:
                return dist[nxt]                # first arrival is shortest
            frontier.append(nxt)
    return None                                  # unreachable
```

Time O(V + E), space O(V).

**Follow-up.** Returning on first arrival is safe *here* because a single-source BFS
reaches each node by a shortest path. It stops being safe in bidirectional search, where
two frontiers meet: the first square both searches touch need not minimise the total, and
the current layer has to be finished before taking the minimum. Chapter 7's converging-knights
problem is exactly that trap.

Weighted edges break this entirely — swap the `deque` for a heap and you have Dijkstra's
algorithm, which is the same loop with a different frontier.

</details>

## Detecting a Cycle in a Dependency Graph

:::problem
Modules declare which other modules they require, as `(module, needs)`
pairs. Return a build order in which nothing precedes what it needs. If no
such order exists, raise an error **naming** the modules involved.

```text
Input:  modules  = ["auth", "config", "logging", "ui"]
        requires = [("auth", "config"), ("ui", "auth"),
                    ("config", "logging")]
Output: ["logging", "config", "auth", "ui"]

Input:  requires = [("auth", "config"), ("config", "logging"),
                    ("logging", "auth"), ("ui", "auth")]
Output: ValueError: circular dependency among: auth, config,
        logging, ui
Explanation: auth, config and logging form a cycle. ui is
             named too because it depends on the cycle and can
             never be built — see the follow-up on why that
             set is broader than the cycle itself.
```

**Constraints.** Any valid order is acceptable when several exist.
:::

<details>
<summary>Show solution</summary>

**Approach.** Kahn's algorithm, because its failure mode is more useful than DFS's here:
the nodes still carrying nonzero indegree when the queue empties are exactly the ones in
or downstream of a cycle, and naming them is the difference between a usable error and a
useless one.

It's also iterative, so a deep dependency chain doesn't overflow the stack.

```python
from collections import defaultdict, deque

def build_order(modules, requires):              # requires: (module, needs)
    graph, indegree = defaultdict(list), {m: 0 for m in modules}
    for module, needs in requires:
        graph[needs].append(module)              # needs must come first
        indegree[module] += 1

    ready = deque(m for m in modules if indegree[m] == 0)
    order = []
    while ready:
        m = ready.popleft()
        order.append(m)
        for nxt in graph[m]:
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                ready.append(nxt)

    if len(order) != len(modules):
        stuck = sorted(m for m in modules if indegree[m] > 0)
        raise ValueError(f"circular dependency among: {', '.join(stuck)}")
    return order
```

Time O(V + E), space O(V + E).

**Follow-up.** `stuck` is the cycle *plus* everything downstream of it, which is honest but
imprecise. Isolating the cycle itself means running the three-colour DFS on the stuck
subgraph and reporting the grey path — worth doing in a tool where a human reads the
error, and not worth doing in an internal assertion. Swapping the `deque` for a heap makes
the successful output deterministic, which matters if it's written to a lockfile.

</details>

## Lowest Common Ancestor

:::problem
In a rooted binary tree, return the deepest node that is an ancestor of both
of two given nodes. A node counts as an ancestor of itself.

```text
Input:          1            p = 4, q = 5   ->  2
              /   \          p = 4, q = 6   ->  1
             2     3         p = 4, q = 2   ->  2
            / \   /
           4   5 6
Explanation: 4 and 5 meet at 2, the deepest node with both in
             its subtree. 4 and 6 are in different subtrees of
             the root, so they meet at 1. For 4 and 2, node 2
             is its own ancestor, so the answer is 2 rather
             than 1.
```

**Constraints.** Both nodes are present in the tree. `1 <= nodes <= 10**5`.
:::

<details>
<summary>Show solution</summary>

**Approach.** Post-order, because the answer depends on what the children report upward.
Search both subtrees for either target and return what you find. If a node hears back from
*both* sides, it is the meeting point and therefore the answer; if only one side reports,
pass that report up unchanged.

```python
def lca(node, p, q):
    if node is None or node is p or node is q:
        return node                              # found one, or ran out
    left = lca(node.left, p, q)
    right = lca(node.right, p, q)
    if left and right:
        return node                              # they diverge here
    return left or right                         # pass the single find upward
```

Time O(n), space O(height) for the call stack.

**Follow-up.** The three-line version quietly assumes both nodes are actually in the tree —
if only `p` is present it returns `p`, which is indistinguishable from a correct answer.
Verifying presence needs a second pass or a counter threaded through the recursion.

For many queries against a fixed tree, O(n) per query is the wrong shape: precompute depth
and binary-lifting ancestor tables in O(n log n) and answer each query in O(log n), which
is the same "amortise across queries" reasoning as the sizing example in Chapter 1. And if
the tree is a binary search tree, the ordering invariant makes it far simpler — walk down
from the root while both targets are on the same side, and the first node that splits them
is the answer.

</details>

## What to take away

- The first two questions on any graph problem are what a node is and what makes two nodes adjacent. Grids and dependency lists answer both without any graph being built.
- Prefer iterative traversal for grids and large graphs — the recursive version is shorter and overflows on exactly the inputs you'll ship.
- Use the distance or parent map as the visited set; two structures tracking the same thing is two chances to disagree.
- Kahn's algorithm fails informatively: the leftovers name the problem.
- Post-order recursion on a tree is "combine what the children reported", and most tree problems are five lines of it.
