---
title: "The Six Operators"
description: "AND, OR, XOR, NOT and the two shifts — introduced by what each one is for rather than by truth table."
track: 7
chapter: 3
page: 3
readMinutes: 4
---

## Four jobs and two scalings

Truth tables are how these operators are usually introduced and they're the least useful
framing available — they tell you what the operator computes without telling you what it's
*for*. Each of the four logical operators has one job, and naming the job is what makes
the operator usable.

| Operator | Job | One-line summary |
| --- | --- | --- |
| `&` AND | **Masking** | Keep the bits I name, zero everything else |
| `\|` OR | **Setting** | Turn these bits on, leave the rest alone |
| `^` XOR | **Toggling** | Flip these bits — and cancel identical values |
| `~` NOT | **Inverting** | Flip every bit |
| `<<` | **Scaling up** | Multiply by a power of two |
| `>>` | **Scaling down** | Divide by a power of two |

All of them operate bit position by bit position, independently. There is no carry, no
borrow, no interaction between neighbouring bits — which is exactly why they're fast, and
why reasoning about them one position at a time is valid.

## AND masks

`a & b` keeps a bit only where *both* inputs have it. Since ANDing with 0 always gives 0
and ANDing with 1 leaves the bit unchanged, a constant with 1s in chosen positions acts
as a stencil:

```python
x & 0b0000_1111     # keep the low four bits, zero the rest
x & 0xFF            # keep the low byte
x & 1               # keep the lowest bit -> 1 if odd, 0 if even
```

That last line is the parity test, and it's meaningfully faster than `x % 2` on some
hardware — though every compiler worth using performs that substitution itself.

The other standard use is a **membership test**: `flags & WRITE` is non-zero exactly when
the `WRITE` bit is present.

## OR sets

`a | b` keeps a bit where *either* input has it. ORing with 0 leaves a bit alone and
ORing with 1 forces it on, so OR is how you add flags without disturbing existing ones:

```python
flags = flags | WRITE        # turn on WRITE, leave everything else as it was
flags |= WRITE | EXECUTE     # turn on both
```

OR is also union when integers represent sets, which is the subject of a later page.

## XOR toggles and cancels

`a ^ b` sets a bit where the inputs *differ*. That gives it the toggling behaviour —
XORing with 1 flips a bit, XORing with 0 leaves it — but the more valuable property is
cancellation. Three identities carry almost all of XOR's usefulness:

```text
x ^ x == 0          a value cancels itself
x ^ 0 == x          zero is the identity
x ^ y == y ^ x      commutative — and associative
```

The third one is the load-bearing one. Because order doesn't matter, a long chain of XORs
can be mentally rearranged so that identical values sit next to each other and annihilate.
Everything XOR is famous for — finding the unpaired element in a list, checksums, the
in-place swap, the doubly linked list that stores one pointer per node — is a restatement
of that fact.

XOR is also *reversible*, which the other operators aren't: `a ^ b ^ b` gives back `a`.
That's why it appears in cryptography and in simple obfuscation, and why an AND or an OR
can never be undone — both discard information.

:::tip[Key insight]
XOR is not "exclusive or" in any way you need to think about at runtime. It is
**cancellation**: identical values annihilate, and because the operation is commutative
and associative, they can find each other anywhere in the expression. Nearly every XOR
idiom is that sentence applied to a different problem.
:::

## NOT inverts

`~x` flips every bit. In a fixed-width language that yields the complement within the
width; in Python, as covered on the previous page, it yields `-x - 1`, and getting a bit
pattern back requires an explicit mask.

The everyday use is building an inverse mask for clearing bits — `x & ~MASK` zeroes
exactly the positions `MASK` names and leaves everything else intact. That composition
(NOT to build the stencil, AND to apply it) is the standard way to turn a flag off.

## Shifts scale by powers of two

`x << k` moves every bit k positions left, filling with zeros: multiplication by 2ᵏ.
`x >> k` moves right: floor division by 2ᵏ.

```python
1 << 5        # 32   — the k-th power of two, and the standard way to name bit k
n << 1        # n * 2
n >> 3        # n // 8   (for non-negative n)
```

`1 << k` is worth recognising on sight as "a value with only bit k set", because that's
how every idiom on the next page names a bit position.

Three cautions:

**Left shift overflows silently** in fixed-width languages. Bits shifted past the top are
gone, and the result is simply wrong with no signal.

**Right shift is floor division, not truncation.** For negative numbers in Python and
Java, `-7 >> 1` is `-4`, while `-7 // 2` in C truncates toward zero and gives `-3`. The
two disagree exactly on negatives.

**Shifting by the type width or more is undefined behaviour in C and C++.** In Java the
shift amount is masked (a shift of 32 on an `int` is a shift of 0 — a no-op, not a zero).
Python, having no width, just produces a very large or very small number.

## Precedence, which bites in C-family languages

In C, C++, Java and JavaScript, `&`, `|` and `^` bind **more loosely than comparison
operators**. So this does not do what it reads as:

```c
if (flags & MASK == 0)      /* parses as flags & (MASK == 0) */
if ((flags & MASK) == 0)    /* what was meant */
```

This is a historical accident from C's earliest days, preserved for compatibility ever
since. Python gets it right — `&` binds tighter than `==` — but the parentheses are worth
writing anyway, because the reader shouldn't have to know which language they're in.

## What to take away

- AND masks, OR sets, XOR toggles, NOT inverts, shifts scale by powers of two. Learn the job, not the truth table.
- XOR's real content is cancellation, made usable by commutativity and associativity.
- `x & ~MASK` is how you clear bits; `1 << k` is how you name bit k.
- Left shift overflows silently; right shift is floor division and disagrees with C-style truncation on negatives.
- In C-family languages the bitwise operators bind looser than `==`. Parenthesise.

## References

- [Python — Bitwise operations on integer types](https://docs.python.org/3/library/stdtypes.html#bitwise-operations-on-integer-types)
- [C++ reference — Operator precedence](https://en.cppreference.com/w/cpp/language/operator_precedence)
- [Java Language Specification — §15.19, Shift Operators](https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.19) — the shift-amount masking rule
- [Warren — *Hacker's Delight*, 2nd ed.](https://www.oreilly.com/library/view/hackers-delight-second/9780133084993/), Chapter 2
