---
title: "The Idioms Worth Memorizing"
description: "Test, set, clear and toggle bit i; isolating and clearing the lowest set bit; power-of-two checks and population count — each derived, and each shown in the code it belongs in."
track: 7
chapter: 3
page: 3
readMinutes: 5
---

## The four basic operations

Every one of these names a bit position with `1 << i` and applies the operator whose job
matches the intent:

```python
x >> i & 1              # test   bit i -> 0 or 1
x | (1 << i)            # set    bit i
x & ~(1 << i)           # clear  bit i
x ^ (1 << i)            # toggle bit i
```

Read each back as a job from the previous page and none of it needs memorising. Set is OR
because OR turns bits on without disturbing others. Clear is AND with an *inverted* mask,
because `~` builds the mask naming everything except bit i. Toggle is XOR because XOR with
1 flips.

Watch one integer carry a set of flags through all four:

```text
      state = 0000 0000
      state |= 1 << 2       0000 0100     set bit 2
      state |= 1 << 5       0010 0100     set bit 5
      state ^= 1 << 2       0010 0000     toggle bit 2 -- it was on, so now off
      state >> 5 & 1        1             test bit 5
      state &= ~(1 << 5)    0000 0000     clear bit 5
```

The test is written `x >> i & 1` when you want a 0 or 1; `x & (1 << i)` is equally common
and returns `2**i` rather than `1` when the bit is set. That difference matters if you're
accumulating rather than branching.

## Clearing the lowest set bit

`x & (x - 1)` clears the lowest set bit and leaves everything else alone.

The derivation is the whole point. Subtracting one turns the lowest set bit into a zero and
flips every zero *below* it to one — that's what borrowing does, and it stops at the first
1 it finds. Bits above are untouched. So `x` and `x - 1` agree on every high bit and
disagree from the lowest set bit downward:

```text
x         = 1011 1000
x - 1     = 1011 0111        lowest set bit cleared, trailing zeros became ones
x & (x-1) = 1011 0000        AND keeps only the agreeing high bits
```

:::tip[Key insight]
`x & (x - 1)` works because subtracting one flips the trailing zeros and the lowest set
bit, and nothing above them. Every other identity on this page follows from that single
observation — `x & -x`, the power-of-two test, Kernighan's population count, and the
submask enumeration on the next page. Derive it once and the rest are corollaries.
:::

## Isolating the lowest set bit

`x & -x` gives you a value containing *only* the lowest set bit.

Same borrow behaviour, plus the definition of negation. In two's complement `-x == ~x + 1`,
which is `~(x - 1)` — the bits of `x - 1`, inverted. So `-x` agrees with `x` at the lowest
set bit and disagrees everywhere else, and AND keeps only where they agree:

```text
x       = 1011 1000
-x      = 0100 1000        invert and add one
x & -x  = 0000 1000        only the lowest set bit survives
```

This works in Python too, despite arbitrary precision, because `-x` is defined as the value
an infinite-width two's complement would produce.

## Power-of-two check

A power of two has exactly one set bit, so clearing the lowest set bit leaves nothing:

```python
def is_power_of_two(x):
    return x > 0 and x & (x - 1) == 0
```

The guard is not decoration. Without `x > 0`, zero passes — `0 & -1` is `0` — because the
expression can't tell "no bits left after clearing one" from "no bits to begin with."

The same identity runs the other way as a *rounding* idiom, which is where it shows up in
buffer sizing and hash table growth:

```python
1 << (x - 1).bit_length()       # round x up to the next power of two (x >= 1)
```

The `x - 1` handles the case where x is already a power of two — exactly the off-by-one
you'd get wrong on the first attempt.

## Population count

Checking all 64 positions costs 64 iterations regardless of input. Kernighan's method runs
once per set bit, because each iteration removes exactly one:

```python
def count_bits(x):
    count = 0
    while x:
        x &= x - 1          # remove the lowest set bit
        count += 1
    return count
```

O(popcount) rather than O(width) — a real difference on sparse values.

**And then don't write it.** `int.bit_count()` in Python 3.10+, `Integer.bitCount` in Java,
`std::popcount` in C++20 and `__builtin_popcount` in GCC and Clang all compile to a single
CPU instruction on any processor of the last fifteen years. Know the derivation because it
explains the identity; call the builtin because no loop will match it.

## Iterating only the set bits

The two idioms above combine into the standard sparse loop — visit each set bit and its
index, skipping the empty positions entirely:

```python
m = mask
while m:
    low = m & -m                    # isolate the lowest set bit
    i = low.bit_length() - 1        # its index
    use(i)
    m &= m - 1                      # clear it and continue
```

On a 64-bit word holding three set bits that's three iterations, not sixty-four.

## The rest, briefly

| Expression | Effect | Why |
| --- | --- | --- |
| `x & (x - 1) == 0` | x is 0 or a power of two | Only one bit to clear |
| `x & -x` | Lowest set bit, isolated | `-x` agrees with `x` only there |
| `x \| (x - 1)` | Fill in all trailing zeros | OR with the borrowed pattern |
| `x >> i & 1` | Value of bit i | Shift it to position zero |
| `x.bit_length()` | Index of the highest set bit, plus one | Floor of log₂ x, plus one |
| `a ^ b` | Bits where a and b differ | XOR is difference |
| `(a ^ b).bit_count()` | Hamming distance | Count of differing positions |

## Two that are famous and shouldn't be used

**The XOR swap** — `a ^= b; b ^= a; a ^= b` — exchanges two values without a temporary. It
is genuinely clever, strictly slower than an ordinary swap on any out-of-order CPU (the
three operations are serially dependent), and silently wrong when both operands are the
same memory location, which zeroes it.

**Shifting instead of multiplying** — `x << 3` for `x * 8` — was worth doing in 1985. Every
compiler performs that substitution now, and the hand-written version obscures intent while
giving up correct handling of negatives.

The same test rules out most other candidates: reach for a bit idiom when the data
genuinely **is** a set of bits — a flag word, a subset, a population count — not as a way
to write arithmetic in fewer characters. Four boolean fields on a class should be four
boolean fields; packing them saves 24 bytes and costs every future reader a translation
step. `min(a, b)` beats the branchless `a ^ ((a ^ b) & -(a < b))`, because the branch
predictor was never the problem.

## What to take away

- Set is OR, clear is AND with `~mask`, toggle is XOR, test is a shift and a mask. Read them as jobs, not patterns.
- `x & (x - 1)` clears the lowest set bit, because subtracting one flips exactly that bit and the zeros below it.
- `x & -x` isolates that bit, because `-x` is `~(x - 1)`.
- Power-of-two tests, next-power-of-two rounding, Kernighan's popcount and the sparse-bit loop are all corollaries of those two.
- Know the derivation; call the builtin. And use bit idioms where the data really is bits, not to shorten arithmetic.

## References

- [Warren — *Hacker's Delight*, 2nd ed.](https://www.oreilly.com/library/view/hackers-delight-second/9780133084993/), Chapters 2 and 5 — derivations for these identities and many more
- [Python — `int.bit_count()`](https://docs.python.org/3/library/stdtypes.html#int.bit_count) and [`int.bit_length()`](https://docs.python.org/3/library/stdtypes.html#int.bit_length)
