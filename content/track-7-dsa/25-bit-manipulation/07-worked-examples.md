---
title: "Worked Examples"
description: "Four derivations with collapsible solutions — the unpaired element, population count, power-of-two, and subset enumeration — plus this chapter's failure modes."
track: 7
chapter: 25
page: 7
readMinutes: 5
---

In this chapter the code is trivial and the derivation is the content. Every solution
below is four lines or fewer; any of them can be produced from memory, and none of them
teach anything in that form.

So the exercise is not "write the function." It's **state why it works before you open the
solution.** If you can't, the identity isn't yours yet, and the page above it is worth
rereading.

## The Element That Appears Once

Every value in a list appears exactly twice except one. Find the one.

<details>
<summary>Show solution</summary>

**Approach.** A hash map counting occurrences works, is obvious, and costs O(n) space. The
better answer uses XOR — but only if you can say why.

Three properties do all the work: `x ^ x == 0`, `x ^ 0 == x`, and XOR is commutative and
associative. That last one is the load-bearing part. Because order doesn't matter, the
list can be mentally rearranged so every pair sits together, and each pair cancels to
zero. Whatever survives is the unpaired value.

```python
def single_number(nums):
    result = 0
    for n in nums:
        result ^= n
    return result
```

Time O(n), space O(1).

**Why this leads the chapter.** It is the canonical case of an identity that gets
memorised without a model. The function is four lines and easy to reproduce; explaining
why cancellation reaches across the whole list, in any order, is the part that
distinguishes understanding XOR from having seen the snippet. The three properties above
take fifteen seconds to state and are the entire justification.

**Follow-up.** If every value appears three times except one, XOR no longer cancels —
`x ^ x ^ x` is `x`, not `0`. The generalisation counts each bit position mod 3: for each of
the 32 or 64 positions, sum the bits across all values and take the remainder, which is
the bit the unpaired value has there. Worth writing out once, because it makes clear that
XOR was never magic — it was mod-2 counting done 64 positions at a time.

</details>

## Counting Set Bits

Count the number of 1 bits in an integer.

<details>
<summary>Show solution</summary>

**Approach.** The obvious loop checks all 32 or 64 positions and costs the same whatever
the input. Kernighan's method instead runs once per set bit.

The identity is that `x & (x - 1)` clears the lowest set bit. Subtracting one turns the
lowest set bit into a zero and flips every zero below it to one — that's borrowing, and it
stops at the first 1 it finds. Bits above are untouched, so the AND keeps exactly those
and drops the rest. Each iteration therefore removes precisely one bit, and the loop runs
popcount times.

```python
def count_bits(x):
    count = 0
    while x:
        x &= x - 1
        count += 1
    return count
```

Time O(number of set bits), space O(1).

**Then don't write it.** Every mainstream language has this built in —
`int.bit_count()` in Python 3.10+, `Integer.bitCount` in Java, `std::popcount` in C++20 —
and all of them compile to a single instruction on modern hardware. Show the derivation
because it explains an identity used elsewhere in the chapter; use the builtin because a
loop cannot compete with a dedicated instruction. A page that teaches the loop without
saying so is teaching a worse habit.

**Follow-up.** Computing popcount for every integer from 0 to n is a one-line dynamic
program rather than n independent loops: `bits[i] = bits[i >> 1] + (i & 1)`. Chapter 28
returns to this shape.

</details>

## Checking for a Power of Two

Determine whether a positive integer is a power of two.

<details>
<summary>Show solution</summary>

**Approach.** A power of two has exactly one set bit. Clearing the lowest set bit —
the same `x & (x - 1)` — therefore leaves zero.

```python
def is_power_of_two(x):
    return x > 0 and x & (x - 1) == 0
```

Time O(1), space O(1).

**The guard matters.** Without `x > 0`, zero returns `True`: `0 & -1` is `0`, and the
expression can't distinguish "no bits left after clearing one" from "no bits to begin
with." Negative numbers are worse, because their behaviour depends on the language —
in fixed-width two's complement, `-2147483648` has exactly one set bit and passes the
test. This is the smallest possible illustration of this chapter's failure modes, which
is why a one-line function earns a slot here.

**Follow-up.** Rounding up to the next power of two is the same family of reasoning:
`1 << (x - 1).bit_length()` for positive x. The `x - 1` handles the case where x is
already a power of two, which is exactly the off-by-one you'd expect to get wrong on the
first attempt.

</details>

## Enumerating Subsets

Produce every subset of a collection.

<details>
<summary>Show solution</summary>

**Approach.** With n elements there are 2ⁿ subsets, and the integers from 0 to 2ⁿ − 1 are
exactly the 2ⁿ distinct patterns of n bits. Counting up therefore enumerates the subsets,
with bit *i* meaning "element *i* is included."

```python
def subsets(items):
    n = len(items)
    for mask in range(1 << n):
        yield [items[i] for i in range(n) if mask >> i & 1]
```

Time O(n · 2ⁿ), space O(n) per subset. No recursion, no backtracking, no visited set —
the loop counter carries the entire state.

**Why this is a prerequisite for Chapter 28.** Once a subset is an integer, it can be a
dictionary key or an array index. That is the whole premise of bitmask dynamic
programming: `dp[mask]` means "the best answer using exactly the elements in `mask`". The
bridge is worth crossing here rather than assuming it later.

**Follow-up.** Iterating only the submasks of a given mask uses `sub = (sub - 1) & mask` —
the same borrow behaviour as `x & (x - 1)`, restricted to the mask's own bits. Summed
across all masks that's 3ⁿ rather than 4ⁿ, because each element is independently in the
submask, in the mask only, or in neither.

</details>

## Failure modes

Bit-level code fails quietly. None of the following raise; all of them produce a wrong
number.

**Signed versus unsigned right shift.** In Java, `>>` is arithmetic (it copies the sign
bit inward) and `>>>` is logical (it fills with zeros). Using `>>` on a value you're
treating as a bit pattern sign-extends it, so a negative number stays negative forever and
a loop written as `while (x != 0) { count += x & 1; x >>= 1; }` never terminates. Python
has neither operator's counterpart — it has only `>>`, which behaves arithmetically — so
the equivalent code has the same non-termination bug.

**Python integers are arbitrary precision.** There is no width, so nothing wraps and `~x`
returns `-x - 1` rather than a complement within some type. `~5` is `-6`, not `250`.
Emulating fixed width means masking explicitly at every step:

```python
x = (x << 1) & 0xFFFFFFFF          # 32-bit multiply-by-two with wrap
x = (~x) & 0xFF                    # 8-bit complement
```

Porting a bit algorithm from C or Java to Python without adding these masks is the most
common way to get a subtly wrong answer that passes small test cases.

**Operator precedence in C-family languages.** In C, C++, Java and JavaScript, `&`, `|`
and `^` bind *looser* than `==` and `!=`. So `if (flags & MASK == 0)` parses as
`flags & (MASK == 0)` — almost always zero, so the branch never fires. Python binds them
correctly, but parenthesise anyway so the reader doesn't have to know which language
they're in.

**Shift amounts at or beyond the type width.** In C and C++, shifting an n-bit value by n
or more is *undefined behaviour* — not "returns zero", genuinely undefined, and compilers
optimise on the assumption it never happens. In Java the shift amount is masked to the low
5 bits for `int` and 6 for `long`, so `x << 32` on an `int` is `x << 0`, a no-op rather
than zero. Two languages, two different wrong answers, neither of them the one you
expected.

**Overflow in `1 << k`.** In fixed-width languages, `1 << 31` on a signed 32-bit `int` sets
the sign bit and yields a negative number; `1 << 32` is worse per the previous point. Use
the 64-bit literal (`1L << k` in Java) when k can reach the width.

## What to take away

- XOR cancellation is mod-2 counting applied to every bit position at once. That model generalises; the four-line function doesn't.
- `x & (x - 1)` underlies popcount, the power-of-two test and submask enumeration — derive it once.
- Guards on these one-liners are load-bearing: zero and negative inputs are where the identities stop holding.
- The failures in this chapter are silent. Signed shifts, missing masks in Python, C precedence and over-width shifts all produce a plausible wrong number.
- Know the derivation; call the builtin.
