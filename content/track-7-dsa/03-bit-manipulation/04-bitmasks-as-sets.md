---
title: "Bitmasks as Sets"
description: "An integer as a subset of up to 64 elements — membership, union, intersection, permission flags, and enumerating subsets and submasks."
track: 7
chapter: 3
page: 4
readMinutes: 5
---

## One integer, one subset

Fix an ordering on a collection. Now let bit *i* mean "element *i* is in the subset." A
64-bit integer is then a complete representation of any subset of a 64-element universe,
and every set operation becomes one instruction.

```text
elements:  [read, write, execute, delete]
             0      1        2       3

{read, execute}  ->  0101  ->  5
{}               ->  0000  ->  0
{all four}       ->  1111  ->  15
```

This is not an analogy — it's the same structure a `set` provides, with a different
representation and a hard size limit. The trade is extreme: bounded to the machine word,
but the whole set fits in a register.

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

Two entries deserve a note. `(1 << n) - 1` is n ones, which is the borrow behaviour from
the previous page: one followed by n zeros, minus one, borrows all the way down. And the
subset test `a & b == a` reads as "intersecting a with b changes nothing about a" — which
is exactly what containment means.

Against a hash set the comparison is stark. A Python `set` of four small integers costs a
couple of hundred bytes and a hash computation per operation; the equivalent mask costs 8
bytes and one instruction, and the union of two 64-element sets is a single `|`. The price
is the ceiling.

## The everyday case: flag sets

Most engineers have already used this without naming it. A set of independent on/off
capabilities is a set, and a small set is an integer:

```python
READ, WRITE, EXECUTE, DELETE = 1, 2, 4, 8      # 1 << 0 .. 1 << 3

perms = READ | WRITE                            # grant two
perms |= EXECUTE                                # grant another
perms &= ~WRITE                                 # revoke one
can_read = bool(perms & READ)                   # test
```

Unix file permissions are the canonical instance — `chmod 755` is three octal digits, each
digit three bits, each bit one of read/write/execute. The same shape appears in TCP header
flags (SYN, ACK, FIN, RST as bits in one byte), POSIX `open()` modes, CPU feature
detection, and any feature-toggle system that ships a user's whole flag state in one JWT
claim. The reason is always the same: one integer, atomic to read and write, cheap to
compare, trivial to store.

In real code, prefer the language's named wrapper. `enum.Flag` keeps the representation and
the operators identical while making the debugging output legible:

```python
from enum import Flag, auto

class Perm(Flag):
    READ = auto()
    WRITE = auto()
    EXECUTE = auto()

p = Perm.READ | Perm.WRITE
Perm.WRITE in p          # True
repr(p)                  # <Perm.READ|WRITE: 3> on 3.11+ -- not just "3"
```

## Enumerating all subsets

With n elements there are 2ⁿ subsets, and the integers from 0 to 2ⁿ − 1 are exactly the 2ⁿ
distinct patterns of n bits. So counting up **is** enumerating the subsets:

```python
def subsets(items):
    n = len(items)
    for mask in range(1 << n):
        yield [items[i] for i in range(n) if mask >> i & 1]
```

```text
items = [1, 2, 3]

mask 0 = 000 -> []          mask 4 = 100 -> [3]
mask 1 = 001 -> [1]         mask 5 = 101 -> [1, 3]
mask 2 = 010 -> [2]         mask 6 = 110 -> [2, 3]
mask 3 = 011 -> [1, 2]      mask 7 = 111 -> [1, 2, 3]
```

O(n · 2ⁿ) time, and no recursion, no explicit backtracking, no visited set — the loop
counter is the entire state.

Tractable only for small n: 2²⁰ is a million, 2²⁵ is 33 million, 2³⁰ is past useful. Which
is the constraint signal from Chapter 1 — a problem stating `n <= 20` is telling you subset
enumeration is the intended approach.

## Enumerating submasks

The harder and more useful move: iterate every subset *of a given mask*, skipping patterns
that contain elements the mask doesn't have.

```python
def submasks(mask):
    sub = mask
    while sub:
        yield sub
        sub = (sub - 1) & mask
    yield 0                       # the empty subset, which the loop exits before
```

```text
submasks(0b1011) -> 1011, 1010, 1001, 1000, 0011, 0010, 0001, 0000
```

Same borrow behaviour once more: `sub - 1` clears `sub`'s lowest set bit and sets everything
below it, and ANDing with `mask` restricts that pattern back to the mask's own bits. The
result is the next-smaller submask in descending numeric order, and repeating walks all of
them exactly once.

The cost is the pleasing part. Naively you'd test all 2ⁿ integers against each of the 2ⁿ
masks — 4ⁿ. This visits only real submasks, and summed over all masks that's **3ⁿ**, because
each element is independently in the submask, in the mask but not the submask, or in
neither.

:::tip[Key insight]
Once a subset is an integer, it can be an array index or a dictionary key. That is the
entire premise of bitmask dynamic programming: `dp[mask]` is "the best answer considering
exactly the elements in `mask`", and the transitions are the operations in the table above.
Chapter 6's *State Compression* page assumes this page.
:::

## Past 64 elements

The mask stops being a single integer and becomes an array of them — which is what a **bit
array** is, and it's still worth having when the data is dense and large. A Python `bool` in
a list costs a pointer plus an object; a bit costs a bit, so a million booleans go from
roughly 8 MB to 125 KB, and the smaller one fits in cache. `bytearray` in Python, `BitSet`
in Java and `vector<bool>` in C++ all provide it, indexing with the two idioms you already
have: `i >> 3` picks the byte and `i & 7` picks the bit within it.

Below a few hundred thousand elements the memory saving is irrelevant and the readability
cost is not — so this is a technique for genuinely large dense data, not a default.

## What to take away

- An integer with bit i meaning "element i present" is a full set representation for up to 64 elements, at one instruction per operation.
- Union is `|`, intersection is `&`, difference is `& ~`, subset test is `a & b == a`, size is `bit_count()`.
- Flag words — Unix permissions, TCP header bits, feature toggles — are this idea in everyday code; use `enum.Flag` where the language offers it.
- `range(1 << n)` enumerates every subset; `(sub - 1) & mask` walks the submasks of a mask, and all submasks of all masks is 3ⁿ, not 4ⁿ.
- The signal to reach for this is a small stated bound — n around 20 to 25.

## References

- [Python — `enum.Flag`](https://docs.python.org/3/library/enum.html#enum.Flag) and [`int.bit_count()`](https://docs.python.org/3/library/stdtypes.html#int.bit_count)
- [RFC 9293 — Transmission Control Protocol](https://www.rfc-editor.org/rfc/rfc9293.html#section-3.1), §3.1 — the TCP header control bits
- [Laaksonen — *Guide to Competitive Programming*](https://link.springer.com/book/10.1007/978-3-030-39357-1), Chapter 10 ("Bit Manipulation") — the 3ⁿ submask-enumeration argument
