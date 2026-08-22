---
title: "Arrays & Dynamic Arrays"
description: "Contiguous memory, index arithmetic and cache locality — why arrays are fast at what they're fast at, and what insertion in the middle really costs."
track: 7
chapter: 24
page: 2
readMinutes: 4
---

## One block of memory, and everything follows

An array is a single contiguous run of memory holding equally sized slots. That one
sentence explains every property arrays have, good and bad.

Because the slots are the same size and adjacent, the address of element *i* is
`base + i × slot_size` — a multiplication and an addition, regardless of how large the
array is or which element you want. That's why indexing is O(1), and why it's O(1) in a
much stronger sense than a hash lookup: no hashing, no probing, no branch.

Because the block is contiguous, inserting in the middle means shifting everything after
the insertion point one slot along. That's O(n), and no cleverness avoids it — the
guarantee that made indexing cheap is the same guarantee that makes insertion expensive.

| Operation | Cost | Why |
| --- | --- | --- |
| Read/write by index | O(1) | Address arithmetic |
| Append | O(1) amortized | Occasional resize and copy |
| Insert / delete at index i | O(n − i) | Shift the tail |
| Insert / delete at the front | O(n) | Shift everything |
| Search (unsorted) | O(n) | Linear scan |
| Search (sorted) | O(log n) | Binary search |

## The part complexity notation doesn't capture

Two O(n) traversals can differ by an order of magnitude in wall-clock time, and arrays
are usually the reason they don't.

Memory is not read a byte at a time. The CPU fetches a **cache line** — typically 64
bytes — and keeps it in a small, very fast cache. Walking an array of 8-byte integers
therefore costs one memory fetch per *eight* elements; the other seven are already
sitting in L1. Hardware prefetchers go further and start pulling in the next lines before
you ask, because a linear scan is the easiest access pattern in the world to predict.

A linked list gets none of this. Each node is a separate allocation, potentially anywhere
in memory, so each step is a fresh cache miss — roughly 100× the latency of a cache hit
on modern hardware. Both traversals are O(n). One of them is dramatically faster, and it
is not visible in the notation.

:::tip[Key insight]
The array's real advantage over "asymptotically equivalent" structures is that it is the
access pattern hardware was built to be fast at. When two structures have the same
complexity, the contiguous one usually wins in practice — which is why `list` is the
right default in Python and `ArrayList` in Java, and why "use a linked list to avoid
shifting" is usually bad advice.
:::

This also means that arrays of *references* — which is what a Python `list` or a Java
`ArrayList<T>` actually holds — get much less of the benefit. The pointers are
contiguous; the objects they point at are not. NumPy arrays, Java primitive arrays and
C++ `vector<int>` store the values themselves inline, which is where the effect is
largest.

## Dynamic arrays

A fixed array has to know its size up front. A **dynamic array** wraps one with a length
and a capacity: appends write into spare capacity, and when capacity runs out it
allocates a larger block — typically some multiple of the current size — and copies
everything across.

Growing by a *multiple* is what makes appends O(1) **amortized**. Doubling from size 1 to
size n costs 1 + 2 + 4 + … + n/2 total copies, which sums to less than n — so n appends
cost O(n) altogether, and O(1) each on average. Growing by a fixed number of slots instead
would cost 1 + 2 + 3 + …, which is O(n²) for n appends and a list that gets quietly slower
the longer it gets.

Amortized is a stronger claim than "average": it's a worst-case bound on a *sequence* of
operations, so no input can make n appends cost more than O(n) in total. What it doesn't
promise is that any individual append is cheap, and that has three consequences:

**Pre-allocate when you know the size.** `[None] * n` or `ArrayList<>(n)` or
`vector::reserve(n)` removes every resize. For large arrays built in a hot path this is
a real and easily obtained win.

**Removing elements doesn't return memory.** Capacity shrinks rarely or never — Python's
`list` never hands capacity back on `pop`. A list that briefly held ten million items keeps
that footprint until it's discarded, and geometric growth means it may be holding up to
twice the memory its contents need.

**A resize is a latency spike, not a smooth cost.** For a batch job the amortized number is
the only one that matters; for a request with a p99 target, the occasional multi-millisecond
copy lands in exactly the percentile you're measured on.

**Deleting from the front in a loop is quadratic.** `list.pop(0)` is O(n); doing it n
times is O(n²). This is the single most common accidental quadratic in Python, and the
fix is `collections.deque`, covered two pages on.

## Two-dimensional arrays

Multi-dimensional arrays are usually a flat block with the index arithmetic done for you:
in **row-major** order (C, Python, NumPy by default) element `(r, c)` lives at
`r × width + c`.

The consequence is that iterating row by row walks memory in order, and iterating column
by column strides across it — jumping `width` slots each step, defeating both the cache
line and the prefetcher. For large matrices, swapping the loop order can change nothing
about the complexity and a great deal about the runtime.

The other trap is allocation. This does not do what it looks like:

```python
grid = [[0] * cols] * rows      # every row is the SAME list
grid[0][0] = 1                  # sets column 0 of every row
```

`* rows` copies the *reference* rows times. The correct form builds each row separately:

```python
grid = [[0] * cols for _ in range(rows)]
```

## What to take away

- Contiguity buys O(1) indexing and costs O(n) insertion in the middle. Both follow from the same property.
- Cache locality is the array's real advantage and is invisible in Big-O — prefer contiguous structures when complexity is a tie.
- Geometric growth makes appends amortized O(1) — a worst-case bound on a sequence, not a statistical average. Pre-allocate when the size is known, and expect capacity never to shrink.
- Amortized still means individual resizes are slow, which shows up as tail latency rather than as throughput.
- `pop(0)` in a loop is quadratic. Use a deque.
- In row-major layout, iterate rows outermost — and never build a 2D list with `[[0] * c] * r`.

## References

- [Python — TimeComplexity wiki](https://wiki.python.org/moin/TimeComplexity) — `list` operation costs
- [Ulrich Drepper — *What Every Programmer Should Know About Memory*](https://people.freebsd.org/~lstewart/articles/cpumemory.pdf) — the cache-hierarchy material behind the locality argument
- [NumPy — Internal memory layout of an ndarray](https://numpy.org/doc/stable/reference/arrays.ndarray.html#internal-memory-layout-of-an-ndarray) — row-major versus column-major strides
- [Cormen, Leiserson, Rivest & Stein — *Introduction to Algorithms*, 4th ed.](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/), Chapter 16 ("Amortized Analysis")
