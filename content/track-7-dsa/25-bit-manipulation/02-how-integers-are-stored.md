---
title: "How Integers Are Stored"
description: "Binary representation, fixed width and two's complement — why negative numbers look the way they do, and why the highest bit is special."
track: 7
chapter: 25
page: 2
readMinutes: 4
---

## An odometer that wraps

A car odometer with five digits counts 00000, 00001, and so on up to 99999. The next
mile rolls it back to 00000. It has no way to represent 100000 — the digits ran out — and
no way to signal that anything went wrong. It just wraps.

Now ask: what would you use to represent *minus one* on that odometer? The natural answer
is 99999, because rolling forward one mile from there lands on zero, which is exactly what
−1 + 1 should do. The representation is chosen so that ordinary addition keeps working.

That is two's complement, and everything else on this page follows from it.

## Binary and fixed width

A binary integer is a row of bits, each one a power of two, with the least significant bit
on the right:

```text
      bit index:   7  6  5  4  3  2  1  0
      value:     128 64 32 16  8  4  2  1
      13 =         0  0  0  0  1  1  0  1     (8 + 4 + 1)
```

The **width** is the number of bits available, and it's fixed by the type: 8, 16, 32 or 64
in most languages. An unsigned n-bit integer holds values from 0 to 2ⁿ − 1. Exceeding that
range wraps, exactly like the odometer — no error, no exception, just a different number
than you expected.

## Two's complement

To represent negatives, the top bit is reinterpreted as a **sign bit**: 0 for
non-negative, 1 for negative. But the remaining bits are not simply the magnitude. In an
n-bit two's complement integer, the highest bit carries a *negative* weight:

```text
      bit index:   7   6  5  4  3  2  1  0
      value:    -128  64 32 16  8  4  2  1
      -3 =         1   1  1  1  1  1  0  1     (-128 + 64 + 32 + 16 + 8 + 4 + 1)
```

The mechanical rule for negating a value is **invert every bit and add one**. It works
because inverting gives you `-x - 1` (each bit `b` becomes `1 - b`, so the whole number
becomes `2ⁿ - 1 - x`), and adding one corrects the offset.

Two consequences are worth carrying:

**Zero has exactly one representation.** Earlier schemes like sign-and-magnitude had both
+0 and −0, which meant every comparison had to special-case them. Two's complement doesn't,
which is the main reason it won.

**Addition and subtraction need no sign handling at all.** The same adder circuit handles
signed and unsigned operands, because the wrap-around behaviour makes the arithmetic come
out right either way. This is not a coincidence; it's the design goal.

The asymmetry falls out of the same fact: an 8-bit signed integer ranges from −128 to
+127, not −127 to +127. There's one more negative than positive because zero occupies a
slot on the non-negative side. So `-(-128)` overflows in 8 bits, and `abs(INT_MIN)` is
negative in C and Java — a real and occasionally exploited edge case.

:::tip[Key insight]
Two's complement isn't a convention for *writing down* negative numbers; it's a choice
that makes the hardware simpler. Because the top bit carries weight −2ⁿ⁻¹ rather than a
separate sign flag, unsigned addition already produces the correct signed answer, and one
adder serves both. Every "weird" property — the wrap, the extra negative value, `~x` being
`-x - 1` — is a consequence of that one decision.
:::

## Why the highest bit is special

The top bit determines the sign, and that has a practical consequence for shifting.

Shifting *left* by one multiplies by two — until a significant bit falls off the top, at
which point the value is silently wrong. Shifting *right* by one divides by two, but only
if the vacated top bit is filled correctly. So languages with fixed-width integers provide
two right shifts:

- **Arithmetic right shift** (`>>` in C for signed types, and in Java) copies the sign bit inward, preserving the sign. `-8 >> 1` is `-4`.
- **Logical right shift** (`>>>` in Java, `>>` in C for unsigned types) fills with zeros. Applied to a negative number it produces a large positive one.

Getting these confused is the most common bit-level bug in fixed-width languages, and the
*Worked Examples* page returns to it.

## Python is not fixed width

Python's `int` is arbitrary precision: it grows as needed and never overflows. That makes
most of this chapter simpler and two specific things different.

**There is no wrap.** `1 << 200` is a perfectly good number. Nothing truncates unless you
mask explicitly, and simulating 32-bit behaviour means writing `x & 0xFFFFFFFF` yourself.

**`~x` returns a negative number.** Because there is no fixed width, Python defines `~x`
as `-x - 1` — mathematically the same thing an infinite-width two's complement would give.
`~5` is `-6`, not `250` or `4294967290`. Code that expects a bit pattern back gets a
negative integer, and the fix is again an explicit mask.

```python
~5                    # -6      (not 250)
~5 & 0xFF             # 250     (8-bit view, explicitly requested)
(1 << 200).bit_length()   # 201 — no overflow, ever
```

Python also has no `>>>`, because it has no fixed width for a logical shift to be defined
against. `>>` on a negative number keeps it negative.

## What to take away

- A binary integer is a row of bits with fixed width, and exceeding that width wraps silently.
- Two's complement gives the top bit weight −2ⁿ⁻¹; negate by inverting and adding one.
- It exists so one adder handles signed and unsigned arithmetic, and so zero has one representation.
- The range is asymmetric — one more negative value than positive — which makes `abs(INT_MIN)` a real edge case.
- Python integers are arbitrary precision: no overflow, `~x == -x - 1`, and no `>>>`. Mask explicitly to emulate fixed width.

## References

- [Python — Bitwise operations on integer types](https://docs.python.org/3/library/stdtypes.html#bitwise-operations-on-integer-types)
- [Java Language Specification — §4.2, Primitive Types and Values](https://docs.oracle.com/javase/specs/jls/se21/html/jls-4.html#jls-4.2) and [§15.19, Shift Operators](https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.19)
- [Warren — *Hacker's Delight*, 2nd ed.](https://www.oreilly.com/library/view/hackers-delight-second/9780133084993/), Chapter 2
