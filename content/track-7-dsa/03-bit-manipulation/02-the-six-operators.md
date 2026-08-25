---
title: "The Six Operators"
description: "What an integer is as a row of bits, and the six operators that act on it — each one shown by the job it does and the code it shows up in."
track: 7
chapter: 3
page: 2
readMinutes: 5
---

## An integer is a row of bits

Every bit is a power of two, least significant on the right:

```text
      bit index:   7  6  5  4  3  2  1  0
      value:     128 64 32 16  8  4  2  1
      13 =         0  0  0  0  1  1  0  1     (8 + 4 + 1)
```

The **width** is fixed by the type — 8, 16, 32 or 64 bits in most languages — and exceeding
it wraps silently, like a five-digit odometer rolling from 99999 to 00000. No error, just a
different number than you expected.

Negatives use **two's complement**: the top bit carries a *negative* weight instead of a
positive one.

```text
      bit index:   7   6  5  4  3  2  1  0
      value:    -128  64 32 16  8  4  2  1
      -3 =         1   1  1  1  1  1  0  1     (-128 + 64 + 32 + 16 + 8 + 4 + 1)
```

Three consequences are worth carrying, and the rest of the chapter leans on all three:

- **Negate by inverting every bit and adding one.** Inverting gives `-x - 1`; the `+1`
  corrects the offset. So `~x == -x - 1` — used on the next page to derive `x & -x`.
- **The range is asymmetric.** An 8-bit signed integer runs from −128 to +127, because zero
  takes a slot on the non-negative side. `abs(INT_MIN)` is negative in C and Java.
- **One adder handles signed and unsigned.** That's the whole reason the representation
  won, and every "weird" property above is a side effect of it.

:::tip[Python has no width]
Python's `int` is arbitrary precision. Nothing overflows — `1 << 200` is a fine number —
and `~5` is `-6`, not `250`, because there is no width to complement within. To emulate a
fixed-width type, mask explicitly: `x & 0xFFFFFFFF` for 32-bit, `x & 0xFF` for a byte.
Forgetting that mask is the most common way a bit algorithm ported from C or Java gives a
subtly wrong answer.
:::

## Four jobs and two scalings

Truth tables tell you what an operator computes without telling you what it's *for*. Each
one has a job, and naming the job is what makes it usable:

| Operator | Job | Read it as |
| --- | --- | --- |
| `&` AND | **Masking** | Keep the bits I name, zero the rest |
| `\|` OR | **Setting** | Turn these bits on, leave the rest alone |
| `^` XOR | **Toggling** | Flip these bits — and cancel identical values |
| `~` NOT | **Inverting** | Flip every bit |
| `<<` | **Scaling up** | Multiply by a power of two |
| `>>` | **Scaling down** | Divide by a power of two |

Every one of them works position by position, independently — no carry, no borrow, no
interaction between neighbouring bits. That's why they're single instructions, and why
reasoning about them one column at a time is valid.

## `&` keeps only the bits you name

ANDing with 0 gives 0; ANDing with 1 leaves the bit alone. So a constant with 1s in chosen
positions acts as a stencil:

```text
      x         = 1011 0110
      0000 1111 = 0000 1111      the mask: keep the low four bits
      x & mask  = 0000 0110
```

```python
x & 0b1111          # keep the low four bits
x & 0xFF            # keep the low byte
x & 1               # lowest bit -> 1 if odd, 0 if even
flags & WRITE       # non-zero exactly when the WRITE bit is present
h & (size - 1)      # hash index, when size is a power of two -- same as h % size
```

The last line is why hash table capacities are usually powers of two: `size - 1` is a run
of 1s, so the AND keeps exactly the low bits that `%` would have computed, without a
division.

## `|` turns bits on

ORing with 0 leaves a bit alone and ORing with 1 forces it on, so OR accumulates flags
without disturbing the ones already there:

```text
      perms       = 0000 0100     EXECUTE
      WRITE       = 0000 0010
      perms | WRITE = 0000 0110   both, nothing else touched
```

```python
READ, WRITE, EXECUTE = 1, 2, 4       # 1 << 0, 1 << 1, 1 << 2

perms = READ | WRITE                 # grant two at once
perms |= EXECUTE                     # add a third
```

## `^` flips bits, and cancels equal values

`a ^ b` sets a bit where the inputs **differ**. That gives it the toggle behaviour — XOR
with 1 flips, XOR with 0 leaves alone — but the property that carries most of its weight is
cancellation:

```text
x ^ x == 0          a value cancels itself
x ^ 0 == x          zero is the identity
x ^ y == y ^ x      commutative -- and associative
```

The third line is the load-bearing one. Because order doesn't matter, a long chain of XORs
can be mentally rearranged so identical values sit together and annihilate:

```python
5 ^ 3 ^ 7 ^ 3 ^ 5           # == 7, because the 5s and the 3s pair off
```

XOR is also the only one of the four that's **reversible**: `a ^ b ^ b` gives back `a`. AND
and OR both discard information and can never be undone. That reversibility is why XOR
shows up in checksums, hash mixing and cheap obfuscation.

:::tip[Key insight]
XOR is not "exclusive or" in any way you need to think about at runtime. It is
**cancellation**: identical values annihilate, and because the operation is commutative and
associative they can find each other anywhere in the expression. Nearly every XOR idiom is
that one sentence applied to a different problem.
:::

## `~` flips every bit

On its own `~` is rarely what you want; its job is building the *inverse* of a mask so AND
can clear bits:

```python
perms &= ~WRITE          # revoke WRITE, leave every other flag intact
```

`~WRITE` is "everything except WRITE", and AND keeps only what the mask names. That
two-operator composition — NOT to build the stencil, AND to apply it — is the standard way
to turn a flag off, and it appears again on the next page as `x & ~(1 << i)`.

## `<<` and `>>` slide the row

`x << k` moves every bit k places left and fills with zeros (multiply by 2ᵏ); `x >> k`
moves right (floor-divide by 2ᵏ).

```python
1 << 5              # 32 -- and the standard way to name "bit 5"
x >> i & 1          # read bit i, by sliding it down to position 0
```

`1 << k` is worth recognising on sight as "a value with only bit k set" — it's how every
idiom on the next page names a position.

Shifts are also how several values share one integer. Packing a coordinate pair into a
single key, for example, which makes it usable as a dictionary key or an array index:

```python
key = (row << 16) | col                  # two 16-bit fields in one int
row, col = key >> 16, key & 0xFFFF       # unpack: slide down, then mask
```

Three cautions. **Left shift overflows silently** in fixed-width languages — bits pushed
past the top are gone. **Right shift is floor division**, so `-7 >> 1` is `-4` while C's
`-7 / 2` truncates to `-3`; they disagree on negatives. And **shifting by the type width or
more** is undefined behaviour in C and C++, while Java masks the shift amount, so `x << 32`
on an `int` is `x << 0` — a no-op rather than zero.

## Parenthesise in C-family languages

In C, C++, Java and JavaScript, `&`, `|` and `^` bind **more loosely than `==`**:

```c
if (flags & MASK == 0)      /* parses as flags & (MASK == 0) -- almost always 0 */
if ((flags & MASK) == 0)    /* what was meant */
```

A historical accident from C's earliest days, kept for compatibility. Python binds them
correctly, but write the parentheses anyway so the reader doesn't have to know which
language they're in.

## What to take away

- An integer is a fixed-width row of bits; the top bit carries weight −2ⁿ⁻¹, so `~x == -x - 1` and the range is asymmetric.
- Python has no width: nothing overflows, `~5` is `-6`, and emulating a fixed-width type means masking by hand.
- AND masks, OR sets, XOR toggles, NOT inverts, shifts scale. Learn the job, not the truth table.
- XOR's real content is cancellation, made usable by commutativity and associativity.
- `x & ~MASK` clears bits, `1 << k` names bit k, and shifts let several fields share one integer.
- Left shift overflows silently, right shift is floor division, and C-family precedence needs parentheses.

## References

- [Python — Bitwise operations on integer types](https://docs.python.org/3/library/stdtypes.html#bitwise-operations-on-integer-types)
- [Java Language Specification — §4.2, Primitive Types and Values](https://docs.oracle.com/javase/specs/jls/se21/html/jls-4.html#jls-4.2) and [§15.19, Shift Operators](https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.19)
- [C++ reference — Operator precedence](https://en.cppreference.com/w/cpp/language/operator_precedence)
