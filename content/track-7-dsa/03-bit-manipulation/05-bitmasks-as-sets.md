---
title: "Bitmasks as Sets"
description: "An integer as a subset of up to 64 elements — membership, union, intersection and difference, plus enumerating subsets and submasks."
track: 7
chapter: 3
page: 5
readMinutes: 5
---

## One integer, one subset

Fix an ordering on a collection of elements. Now let bit *i* of an integer mean "element
*i* is in the subset." A 64-bit integer is therefore a complete representation of any
subset of a 64-element universe, and the set operations become single machine
instructions.

```text
elements:  [read, write, execute, delete]
             0      1        2       3

{read, execute}  ->  0101  ->  5
{}               ->  0000  ->  0
{all four}       ->  1111  ->  15
```

This is not an analogy. It is the same structure a `set` provides, with a different
representation and a hard size limit, and the trade it makes is extreme: bounded to the
machine word, but every operation is one instruction and the whole thing fits in a
register.

## The operations

| Set operation | Bitmask | Cost |
| --- | --- | --- |
| Is element i present? | `mask >> i & 1` | O(1) |
| Add element i | `mask \| (1 << i)` | O(1) |
| Remove element i | `mask & ~(1 << i)` | O(1) |
| Toggle element i | `mask ^ (1 << i)` | O(1) |
| Union | `a \| b` | O(1) |
| Intersection | `a & b` | O(1) |
| Difference (a minus b) | `a & ~b` | O(1) |
| Symmetric difference | `a ^ b` | O(1) |
| Is a a subset of b? | `a & b == a` | O(1) |
| Do a and b overlap? | `a & b != 0` | O(1) |
| Size | `mask.bit_count()` | O(1) |
| Full set of n elements | `(1 << n) - 1` | O(1) |
| Empty set | `0` | O(1) |

Two entries deserve a note. `(1 << n) - 1` is n ones, which follows from the borrow
behaviour on the previous page: one followed by n zeros, minus one, borrows all the way
down. And the subset test `a & b == a` reads as "intersecting a with b changes nothing
about a", which is precisely the definition of a being contained in b.

Against a hash set, the comparison is stark. A `set` of four small integers in Python
costs a couple of hundred bytes and a hash computation per operation; the equivalent mask
costs 8 bytes and one instruction. Union of two 64-element sets is one `|`, not a loop.
The price is the ceiling — beyond 64 elements you need multiple words, at which point a
real set is usually simpler.

## Enumerating all subsets

With n elements there are 2ⁿ subsets, and the integers from 0 to 2ⁿ − 1 are exactly the 2ⁿ
distinct patterns of n bits. So counting up *is* enumerating the subsets:

```python
def subsets(items):
    n = len(items)
    for mask in range(1 << n):
        yield [items[i] for i in range(n) if mask >> i & 1]
```

O(n · 2ⁿ) time, and no recursion, no explicit backtracking, no visited set. The loop
counter is the state.

This is only tractable for small n — 2²⁰ is a million, 2²⁵ is 33 million, and 2³⁰ is past
the point of usefulness. Which is exactly the constraint signal from Chapter 1: a problem
stating `n ≤ 20` is telling you subset enumeration is the intended approach.

## Enumerating submasks

The harder and more useful trick: iterate every subset *of a given mask*, skipping the
ones containing elements the mask doesn't have.

```python
def submasks(mask):
    sub = mask
    while sub:
        yield sub
        sub = (sub - 1) & mask
    yield 0                       # the empty subset, which the loop exits before
```

The derivation is the same borrow behaviour once more. `sub - 1` clears `sub`'s lowest set
bit and sets everything below it; ANDing with `mask` then restricts that pattern back to
the mask's own bits. The result is the next-smaller submask in descending numeric order,
and repeating it walks all of them exactly once.

The cost is the pleasing part. Naively you'd check all 2ⁿ integers for each of the 2ⁿ
masks — 4ⁿ. This visits only the actual submasks, and summing over all masks gives **3ⁿ**
total, because each element is independently in the submask, in the mask but not the
submask, or in neither. That 4ⁿ-to-3ⁿ reduction is what makes subset-sum-style DP
feasible.

:::tip[Key insight]
Once a subset is an integer, it can be an array index or a dictionary key. That is the
entire premise of bitmask dynamic programming: `dp[mask]` is "the best answer considering
exactly the elements in `mask`", and the transitions are the operations in the table
above. Chapter 6's *State Compression* page assumes this page; the bridge is worth
crossing here rather than later.
:::

## Iterating the set bits

Two loops, and the second is better when the mask is sparse:

```python
for i in range(n):                    # O(n) — checks every position
    if mask >> i & 1:
        use(i)

m = mask                              # O(popcount) — visits only set bits
while m:
    low = m & -m                      # isolate lowest set bit
    use(low.bit_length() - 1)         # its index
    m &= m - 1                        # clear it and continue
```

Both idioms come straight from the previous page — isolate with `x & -x`, clear with
`x & (x - 1)` — which is a fair demonstration that the derivations there were worth the
space.

## What to take away

- An integer with bit i meaning "element i present" is a full set representation for up to 64 elements, with every operation costing one instruction.
- Union is `|`, intersection is `&`, difference is `& ~`, subset test is `a & b == a`, size is `bit_count()`.
- `range(1 << n)` enumerates every subset; `(sub - 1) & mask` walks the submasks of a mask.
- Iterating all submasks of all masks is 3ⁿ, not 4ⁿ, and that gap is what makes bitmask DP viable.
- The signal to reach for this is a small stated bound — n around 20 to 25.

## References

- [Python — `int.bit_count()`](https://docs.python.org/3/library/stdtypes.html#int.bit_count)
- [Warren — *Hacker's Delight*, 2nd ed.](https://www.oreilly.com/library/view/hackers-delight-second/9780133084993/), Chapter 2
- [Laaksonen — *Guide to Competitive Programming*](https://link.springer.com/book/10.1007/978-3-030-39357-1), Chapter 10 ("Bit Manipulation") — the 3ⁿ submask-enumeration argument
