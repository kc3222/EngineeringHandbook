---
title: "Depth-First Search"
description: "Recursive and iterative forms, pre/in/post-order as 'when do I do the work', and the cases where the recursion depth is the thing that breaks."
track: 7
chapter: 26
page: 3
readMinutes: 5
---

## Follow one path as far as it goes

Depth-first search commits to a direction. From the current node it picks a neighbour,
goes there, and repeats — only backing up when it runs out of unvisited neighbours. The
result is a traversal that plunges to the bottom of one branch before looking at the
second child of the root.

The recursive form is three lines, and its brevity is the reason DFS is usually the
default:

```python
def dfs(node, seen):
    seen.add(node)
    for neighbour in graph[node]:
        if neighbour not in seen:
            dfs(neighbour, seen)
```

On a tree, `seen` can be dropped entirely — acyclicity guarantees you never return to a
node. On a general graph it is mandatory, and it must be checked *before* recursing, not
inside the recursive call, or the same node gets queued by several neighbours before any
of them mark it.

## The call stack is the data structure

The recursion isn't a stylistic choice — it's using the call stack as the stack the
algorithm needs. Making that explicit gives the iterative form:

```python
def dfs_iterative(start):
    stack, seen = [start], {start}
    while stack:
        node = stack.pop()                      # pop() — the only line that matters
        for neighbour in graph[node]:
            if neighbour not in seen:
                seen.add(neighbour)
                stack.append(neighbour)
```

Change that single `pop()` to `popleft()` on a deque and this becomes breadth-first
search. The traversal order of an algorithm is entirely determined by which end of the
frontier you take from, which is the observation the whole chapter rests on.

One detail: the iterative version visits neighbours in reverse order relative to the
recursive one, because the last neighbour pushed is the first popped. It doesn't matter
for reachability and matters a great deal if the output order is part of the answer.

## When do you do the work

For trees the interesting question is not *which* nodes get visited — all of them do —
but *when* the node's own work happens relative to its children's. Three choices:

```python
def traverse(node):
    if node is None:
        return
    visit(node)              # PRE-order:  before both subtrees
    traverse(node.left)
    visit(node)              # IN-order:   between them (binary trees only)
    traverse(node.right)
    visit(node)              # POST-order: after both subtrees
```

Each answers a different kind of question:

**Pre-order** processes a node before descending. Use it when the child's work depends on
something the parent computed — passing a path down, accumulating a prefix, propagating a
permission. Serialising a tree to reconstruct it later is pre-order, because the parent
must exist before its children can be attached.

**In-order** on a binary search tree yields the keys in sorted order, which is a direct
consequence of the BST invariant: everything smaller, then the node, then everything
larger. This is the whole reason a database index can answer range queries.

**Post-order** processes a node after its children. Use it when the parent's result is a
function of the children's — subtree sizes, heights, sums, whether a subtree is valid.
Deleting a tree is post-order, because you can't free a node while its children still need
their pointers. Dependency resolution is post-order: build what something needs before
building it.

:::tip[Key insight]
Pre-order pushes information *down* the tree; post-order pulls it *up*. Which one a
problem needs is decided by which direction its data flows, and asking that question is
usually faster than trying to remember the definitions. "Does the child need something
from the parent, or does the parent need something from the children?"
:::

## The post-order pattern in practice

Most non-trivial tree problems are post-order with an accumulator, and they look alike
once you've seen a few:

```python
def height(node):
    if node is None:
        return 0
    return 1 + max(height(node.left), height(node.right))

def subtree_sum(node):
    if node is None:
        return 0
    return node.value + subtree_sum(node.left) + subtree_sum(node.right)
```

The shape is: base case returns an identity value, recursive case combines the children's
results with the node's own. Recognising it means most "compute X over a tree" problems
are a five-line function, and the only real decision is what to return upward.

## Where DFS breaks

**Stack depth.** Python's default recursion limit is 1000 frames, and the real ceiling is
the C stack, which is why exceeding it raises `RecursionError` rather than segfaulting.
A DFS over a 100,000-node graph will hit it. So will a DFS over a tree that has degenerated
into a chain — a linked list, effectively — which is a common shape for real data sorted
by insertion time. Raising `sys.setrecursionlimit` moves the limit and does not move the C
stack, so it converts a clean exception into a crash. The correct fix is the iterative
form.

**DFS does not find shortest paths.** It finds *a* path, and on a graph with cycles that
path can be arbitrarily worse than the best one. Nothing about the traversal order
prefers short routes. Use BFS.

**Disconnected graphs.** One DFS explores one connected component. Reaching everything
means looping over all nodes and starting a fresh DFS from each unvisited one — which,
incidentally, is how you count components.

## What DFS is for

Exhaustive exploration, and anything where the answer depends on the structure of a whole
branch rather than on distance:

- **Connectivity and components** — is B reachable from A; how many separate groups exist.
- **Cycle detection** — covered in detail on the *Ordering & Cycles* page.
- **Topological sort**, via the reverse of post-order finish times.
- **Backtracking** — permutations, N-queens, sudoku. The recursion's natural undo on return is exactly what backtracking needs.
- **Any tree aggregate** — height, diameter, subtree sums, validity checks.

## What to take away

- DFS explores one branch fully before the next; the recursion is the stack, and the iterative form makes that explicit.
- The only difference between DFS and BFS in the iterative form is which end of the frontier you take from.
- Pre-order pushes data down, post-order pulls it up, in-order gives sorted output on a BST.
- Mark nodes as seen before recursing, not inside the call.
- Deep or chain-shaped inputs overflow the stack — rewrite iteratively rather than raising the recursion limit.

## References

- [Cormen, Leiserson, Rivest & Stein — *Introduction to Algorithms*, 4th ed.](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/), Section 20.3 ("Depth-first search")
- [Python — `sys.setrecursionlimit`](https://docs.python.org/3/library/sys.html#sys.setrecursionlimit), including the warning about the underlying C stack
- [Sedgewick & Wayne — *Algorithms*, 4th ed., Section 4.1](https://algs4.cs.princeton.edu/41graph/)
