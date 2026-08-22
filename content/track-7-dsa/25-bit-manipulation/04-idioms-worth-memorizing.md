---
title: "The Idioms Worth Memorizing"
description: "Test, set, clear and toggle bit i; isolating and clearing the lowest set bit; power-of-two checks and population count — each one derived rather than asserted."
track: 7
chapter: 25
page: 4
readMinutes: 5
---

## The four basic operations

Every one of these names a single bit position with `1 << i` and then applies the
operator whose job matches the intent.

```python
x >> i & 1              # test  bit i -> 0 or 1
x | (1 << i)            # set   bit i
x & ~(1 << i)           # clear bit i
x ^ (1 << i)            # toggle bit i
```

Read each one back as the job from the previous page and it needs no memorising. Setting
is OR because OR turns bits on without disturbing others. Clearing is AND with an
*inverted* mask, because AND keeps only what the mask names, and `~` builds the mask that
names everything except bit i. Toggling is XOR because XOR with 1 flips.

The test is written `x >> i & 1` rather than `x & (1 << i)` when you want a 0 or 1 rather
than a truthy value — shift the bit you care about down to position zero and read it. Both
forms are common; the second returns `2**i` rather than `1` when the bit is set, which
matters if you're accumulating rather than branching.

## Clearing the lowest set bit

`x & (x - 1)` clears the lowest set bit and leaves everything else alone.

The derivation is the whole point. Subtracting one from a binary number turns the lowest
set bit into a zero and flips every zero *below* it to one — that's what borrowing does,
and it stops at the first available 1. Bits above the lowest set bit are untouched by the
borrow. So `x` and `x - 1` agree on every high bit, disagree at the lowest set bit, and
disagree at every position below it:

```text
x       = 1011 1000
x - 1   = 1011 0111        (lowest set bit cleared, trailing zeros became ones)
x & (x-1) = 1011 0000      AND keeps only the agreeing high bits
```

:::tip[Key insight]
`x & (x - 1)` works because subtracting one flips the trailing zeros and the lowest set
bit, and nothing above it. Every other identity on this page follows from that single
observation — including `x & -x`, the power-of-two test, and Kernighan's population
count. Derive it once and you never need to memorise the rest.
:::

## Isolating the lowest set bit

`x & -x` gives you a value containing *only* the lowest set bit.

It follows from the same borrow behaviour plus the definition of negation. In two's
complement, `-x == ~x + 1`, and `~x + 1` is `~(x - 1)` — the bits of `x - 1`, inverted. So
`-x` agrees with `x` at the lowest set bit and disagrees everywhere else, and AND keeps
only the position where they agree:

```text
x       = 1011 1000
-x      = 0100 1000        (invert and add one)
x & -x  = 0000 1000        only the lowest set bit survives
```

In Python this works despite arbitrary precision, because `-x` is defined to be the value
an infinite-width two's complement would produce.

## Power-of-two check

A power of two has exactly one set bit. Clearing the lowest set bit therefore leaves
nothing:

```python
def is_power_of_two(x):
    return x > 0 and x & (x - 1) == 0
```

The guard is not decoration. Without `x > 0`, zero passes — `0 & -1` is `0` — and negative
numbers behave differently depending on whether the language uses fixed-width two's
complement. It is the smallest possible illustration of this chapter's failure modes,
which is why it's worth writing out despite being one line.

## Population count

Counting set bits by checking all 64 positions works and costs 64 iterations regardless of
the input. Kernighan's method instead runs once per set bit, because each iteration
removes exactly one:

```python
def count_bits(x):
    count = 0
    while x:
        x &= x - 1          # remove the lowest set bit
        count += 1
    return count
```

O(popcount) rather than O(width) — a real difference on sparse values.

**And then don't write it.** Every mainstream language exposes this directly:
`int.bit_count()` in Python 3.10+, `Integer.bitCount` in Java, `std::popcount` in C++20,
`__builtin_popcount` in GCC and Clang. All of them compile to a single CPU instruction on
any processor from the last fifteen years, which no loop will match. Know the derivation
because it explains the identity; use the builtin because it's faster and clearer.

## The rest, briefly

| Expression | Effect | Why |
| --- | --- | --- |
| `x & (x - 1) == 0` | x is 0 or a power of two | Only one bit to clear |
| `x & -x` | Lowest set bit, isolated | `-x` agrees with `x` only there |
| `x \| (x - 1)` | Fill in all trailing zeros | OR with the borrowed pattern |
| `x >> i & 1` | Value of bit i | Shift it to position zero |
| `x.bit_length()` | Position of the highest set bit, plus one | Floor of log₂ x, plus one |
| `a ^ b` | Bits where a and b differ | XOR is difference |
| `bin(a ^ b).count('1')` | Hamming distance | Count of differing positions |

## Two that are famous and shouldn't be used

**The XOR swap** — `a ^= b; b ^= a; a ^= b` — exchanges two values without a temporary. It
is genuinely clever, strictly slower than a normal swap on any modern out-of-order CPU
(the three operations are serially dependent), and silently wrong when both operands are
the same memory location, which zeroes it. Tuple assignment or a temporary variable is
better in every measurable respect.

**Multiplying and dividing by shifts** — `x << 3` for `x * 8` — was worth doing in 1985.
Every compiler now performs this substitution automatically, and writing it by hand
obscures intent while giving up correct handling of negatives. Write the multiplication.

The general principle is the one this chapter closes on: these idioms earn their place
where they express something a loop expresses badly — a set as an integer, a flag word, a
population count — not as a way to write arithmetic in fewer characters.

## What to take away

- `set` is OR, `clear` is AND with `~mask`, `toggle` is XOR, `test` is a shift and mask. Read them as jobs, not patterns.
- `x & (x - 1)` clears the lowest set bit, because subtracting one flips exactly the lowest set bit and the zeros below it.
- `x & -x` isolates that bit, because `-x` is `~(x - 1)`.
- Power-of-two checks and Kernighan's popcount are both corollaries — and popcount should be a builtin call in real code.
- The XOR swap and shift-for-multiply are historical, not useful. Compilers do the second and the first is a bug waiting for aliasing.

## References

- [Warren — *Hacker's Delight*, 2nd ed.](https://www.oreilly.com/library/view/hackers-delight-second/9780133084993/), Chapters 2 and 5 — derivations for these identities and many more
- [Python — `int.bit_count()`](https://docs.python.org/3/library/stdtypes.html#int.bit_count) and [`int.bit_length()`](https://docs.python.org/3/library/stdtypes.html#int.bit_length)
- [C++ reference — `std::popcount`](https://en.cppreference.com/w/cpp/numeric/popcount)
- [Java — `Integer.bitCount`](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Integer.html#bitCount(int))
