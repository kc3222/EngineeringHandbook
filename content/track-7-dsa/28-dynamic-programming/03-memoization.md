---
title: "Memoization"
description: "Top-down dynamic programming — recursion plus a cache, which is the least intimidating entry point and often the last step you need."
track: 7
chapter: 28
page: 3
readMinutes: 4
---

## Add a dictionary

Memoization is the smallest possible change to a working recursive function: before
computing, check whether this argument has been seen; after computing, store the result.

```python
def fib(n, memo={}):
    if n <= 1:
        return n
    if n not in memo:
        memo[n] = fib(n - 1, memo) + fib(n - 2, memo)
    return memo[n]
```

Exponential to linear, with three added lines and no restructuring. In Python the idiomatic
form doesn't even need those:

```python
from functools import cache

@cache
def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)
```

`functools.cache` is an unbounded dictionary keyed on the arguments; `lru_cache(maxsize=N)`
is the bounded variant. Both require the arguments to be hashable, which is the one real
constraint — a list parameter has to become a tuple, and a set has to become a frozenset.

The mutable-default trick in the first version (`memo={}`) works because Python evaluates
default arguments once, at definition time. It is also a well-known footgun: the cache is
shared across every call site for the lifetime of the process, which is fine for a pure
function of small integers and wrong for anything else. Prefer the decorator, or pass the
cache explicitly.

:::tip[Key insight]
Dynamic programming is depth-first search with a cache. The recursion explores a graph whose
nodes are states and whose edges are decisions; the cache stops you re-exploring a node you
already finished. Everything else in this chapter — tables, iteration order, rolling arrays —
is an optimisation of that one idea, not a separate technique.
:::

That sentence is worth holding onto, because it makes the whole chapter continuous with the
previous one. If you can write a DFS, you can write a memoized DP; the only new question is
what identifies a state.

## The four things to decide

Writing a memoized solution is answering four questions, and they're the same four every
time:

**1. What is the state?** The parameters that fully determine the answer from here on. If
two calls with the same parameters could correctly return different answers, the state is
incomplete and the cache will return wrong results — this is the failure mode from the
previous page.

**2. What is the base case?** The states whose answers are known outright, with no
recursion.

**3. What is the transition?** How the answer for a state is built from the answers to
smaller states.

**4. What does the function return?** Fix this precisely — "the best answer *starting from*
this state" rather than "the best answer *ending at* it". Mixing the two mid-implementation
is a reliable way to produce a function that's right on the base cases and wrong everywhere
else.

Worked through on a small problem — the cheapest path down a grid of costs, moving only
right or down:

```python
from functools import cache

def min_path(grid):
    rows, cols = len(grid), len(grid[0])

    @cache
    def best(r, c):                              # 1. state: a cell
        if r == rows - 1 and c == cols - 1:      # 2. base: the destination
            return grid[r][c]
        if r >= rows or c >= cols:
            return float('inf')                  #    off the grid: impossible
        return grid[r][c] + min(best(r + 1, c),  # 3. transition: down or right
                                best(r, c + 1))

    return best(0, 0)                            # 4. returns: cost from here to the end
```

O(rows × cols) time and space — one entry per cell, each computed once.

## Why start top-down

Three reasons it's usually the right first version, and often the only one you need.

**It follows from the recursion you already wrote.** No reordering, no reasoning about which
cells must be filled before which. The recursion figures out the order by itself.

**It only computes reachable states.** A bottom-up table fills every cell whether or not the
problem ever needs it. When the reachable state space is sparse — large ranges with only a
few attainable values — memoization can be dramatically faster than tabulation, despite the
function-call overhead.

**It's easier to get right.** The transition is written once, in the direction you thought
about the problem, and there is no separate iteration order to also get right.

## Where it runs out

**Stack depth.** A memoized recursion is still a recursion, and Python's default limit is
around 1000 frames. A DP over a 100,000-element sequence overflows before the cache helps.
This is the main reason to convert to tabulation, and the next page is about that
conversion.

**Function-call overhead.** Each cached lookup pays a call, an argument hash and a dict
probe. For a tight numeric DP over millions of states, an array-indexed table is
meaningfully faster — often several times — even though both are the same complexity.

**Unhashable or huge keys.** Caching on a tuple of ten parameters costs real memory and real
hashing time. Encoding the state as a single integer (see *State Compression*) is the usual
remedy.

**Cache lifetime.** `@cache` on a module-level function never releases entries. On a
long-running service, memoizing a function of user-supplied arguments is the unbounded-map
memory leak from Chapter 24 wearing a decorator. Use `lru_cache(maxsize=...)`, or clear it
deliberately.

## What to take away

- Memoization is a recursive solution plus a cache; in Python that's one decorator.
- DP is DFS with a cache — the framing that makes the rest of the chapter follow rather than needing to be memorised.
- Decide four things: the state, the base case, the transition, and precisely what the function returns.
- Top-down is the right first attempt: it needs no iteration order and only visits reachable states.
- Convert to a table when recursion depth, call overhead or unbounded cache growth becomes the problem.

## References

- [Python — `functools.cache` and `functools.lru_cache`](https://docs.python.org/3/library/functools.html#functools.cache)
- [Cormen, Leiserson, Rivest & Stein — *Introduction to Algorithms*, 4th ed.](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/), Section 14.3
- [Michie — *"Memo" Functions and Machine Learning*](https://www.nature.com/articles/218019a0), Nature, 1968 — where the term comes from
