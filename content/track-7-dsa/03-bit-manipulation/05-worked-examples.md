---
title: "Worked Examples"
description: "Five standard problems with collapsible solutions — the unpaired element, the missing number, population count, power-of-two and subset enumeration."
track: 7
chapter: 3
page: 5
readMinutes: 5
---

In this chapter the code is short and the derivation is the content. Every solution below
is four lines or fewer, and none of them teach anything in that form.

So the exercise is not "write the function." It's **state why it works before you open the
solution.** If you can't, the identity isn't yours yet, and the page above it is worth
rereading. The next page keeps the same shape but stops announcing itself — the problems
there are stated about words, bytes and records, and each carries two hints.

## The Element That Appears Once

:::problem
Every value in a list appears exactly twice except one. Return that value.
Solve it in O(1) extra space.

```text
Input:  nums = [5, 3, 7, 3, 5]
Output: 7
Explanation: 5 and 3 each appear twice; 7 is unpaired. Note
             the pairs are not adjacent, so the solution
             cannot rely on order.
```

**Constraints.** `1 <= len(nums)`; length is odd; every value but one
appears exactly twice.
:::

<details>
<summary>Show solution</summary>

**Approach.** A hash map counting occurrences works and costs O(n) space. XOR does it in
O(1) — but only if you can say why.

Three properties do all the work: `x ^ x == 0`, `x ^ 0 == x`, and XOR is commutative and
associative. That last one is load-bearing: because order doesn't matter, the list can be
mentally rearranged so every pair sits together and cancels to zero. Whatever survives is
the unpaired value.

```python
def single_number(nums):
    result = 0
    for n in nums:
        result ^= n
    return result
```

Time O(n), space O(1).

**Follow-up.** If every value appears three times except one, XOR stops cancelling —
`x ^ x ^ x` is `x`, not `0`. The generalisation counts each bit position modulo 3: sum the
bits at each of the 32 positions across all values and take the remainder, which is the bit
the unpaired value has there. Worth writing out once, because it makes clear that XOR was
never magic — it is mod-2 counting done 32 positions at a time. The *Advanced Examples*
page returns to that transposition.

</details>

## The Missing Number

:::problem
A list holds n distinct values drawn from `0..n` — every number in that
range except one. Return the missing one, in O(1) extra space.

```text
Input:  nums = [4, 2, 0, 1]
Output: 3
Explanation: n = 4, so the range is 0..4 and the list holds
             four of those five values. Sorting would find it
             in O(n log n); the sum formula also works but can
             overflow in a fixed-width language.
```

**Constraints.** `1 <= len(nums) = n`; values are distinct and in `0..n`.
:::

<details>
<summary>Show solution</summary>

**Approach.** XOR every index together with every value. Each number that *is* present
appears once as a value and once as an index, so it cancels; the missing number appears
only as an index and survives. The index range is `0..n` and the value range is `0..n`, so
seed the accumulator with `n` — the one index the loop never visits.

```python
def missing_number(nums):
    result = len(nums)
    for i, n in enumerate(nums):
        result ^= i ^ n
    return result
```

Time O(n), space O(1).

**Why not the sum formula.** `n * (n + 1) // 2 - sum(nums)` is correct and arguably
clearer, and it's the right answer in Python. In a fixed-width language the intermediate
sum overflows for large n and the result is silently wrong, while the XOR version has no
intermediate value larger than n. Same reasoning as pairing, applied to a different pairing.

**Follow-up.** If two numbers are missing, XOR alone gives only their combined value
`a ^ b`, which can't be separated by more XORing. The split uses `x & -x` from the idioms
page: any bit set in `a ^ b` is a position where the two differ, so partitioning the list on
that bit puts one in each half — and every value that *is* present, appearing twice, lands
wholly in one half and cancels there.

</details>

## Counting Set Bits

:::problem
Return the number of 1 bits in the binary representation of a
non-negative integer.

```text
Input:  x = 13         Input:  x = 128         Input:  x = 255
Output: 3              Output: 1               Output: 8
Explanation: 13 is 0b1101, which has three 1 bits. 128 is
             0b10000000, one bit set at the top. 255 is
             0b11111111, all eight set.
```

**Constraints.** `0 <= x < 2**64`.
:::

<details>
<summary>Show solution</summary>

**Approach.** The obvious loop checks all 64 positions and costs the same whatever the
input. Kernighan's method runs once per set bit.

The identity is that `x & (x - 1)` clears the lowest set bit: subtracting one turns that
bit into a zero and flips every zero below it to one, and bits above are untouched, so the
AND keeps exactly those. Each iteration removes precisely one bit.

```python
def count_bits(x):
    count = 0
    while x:
        x &= x - 1
        count += 1
    return count
```

Time O(number of set bits), space O(1).

**Then don't write it.** `int.bit_count()`, `Integer.bitCount`, `std::popcount` — all one
CPU instruction on modern hardware. Show the derivation because it explains an identity
used across the chapter; ship the builtin.

**Follow-up.** Computing popcount for every integer from 0 to n is a one-line dynamic
program rather than n independent loops: `bits[i] = bits[i >> 1] + (i & 1)`. Chapter 6
returns to this shape.

</details>

## Checking for a Power of Two

:::problem
Return whether an integer is a power of two. Handle zero and negatives.

```text
Input:  x = 16          Input:  x = 12
Output: True            Output: False
Input:  x = 1           Input:  x = 0
Output: True            Output: False
Explanation: 16 is 0b10000 and 1 is 0b1 — each has exactly one
             bit set. 12 is 0b1100, two bits. 0 has none, and
             is not a power of two however tempting the
             arithmetic makes it.
```

**Constraints.** `x` fits in a signed 64-bit integer and may be negative.
:::

<details>
<summary>Show solution</summary>

**Approach.** A power of two has exactly one set bit, so clearing the lowest set bit — the
same `x & (x - 1)` — leaves zero.

```python
def is_power_of_two(x):
    return x > 0 and x & (x - 1) == 0
```

Time O(1), space O(1).

**The guard matters.** Without `x > 0`, zero returns `True`: `0 & -1` is `0`, and the
expression can't distinguish "no bits left after clearing one" from "no bits to begin
with." Negatives are worse, because the behaviour depends on the language — in fixed-width
two's complement, `-2147483648` has exactly one set bit and passes. This is the smallest
possible illustration of this chapter's failure modes, which is why a one-line function
earns a slot.

**Follow-up.** Rounding *up* to the next power of two is the same family:
`1 << (x - 1).bit_length()` for positive x. The `x - 1` handles the already-a-power case,
which is exactly the off-by-one you'd get wrong first time.

</details>

## Enumerating Subsets

:::problem
Produce every subset of a collection, including the empty one. Any order
is acceptable.

```text
Input:  items = [1, 2, 3]
Output: [[], [1], [2], [1, 2], [3], [1, 3], [2, 3], [1, 2, 3]]
Explanation: 2**3 = 8 subsets. The order shown is what
             counting 0..7 in binary produces, with bit i
             meaning "item i included": mask 5 is 0b101, so
             items 0 and 2, giving [1, 3].
```

**Constraints.** `0 <= len(items) <= 20`.
:::

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

Time O(n · 2ⁿ), space O(n) per subset. No recursion, no backtracking, no visited set — the
loop counter carries the entire state.

**Why this is a prerequisite for Chapter 6.** Once a subset is an integer, it can be a
dictionary key or an array index. That's the whole premise of bitmask dynamic programming:
`dp[mask]` means "the best answer using exactly the elements in `mask`".

**Follow-up.** Iterating only the submasks of a given mask uses `sub = (sub - 1) & mask` —
the same borrow behaviour, restricted to the mask's own bits. Summed across all masks that
is 3ⁿ rather than 4ⁿ.

</details>

## What to take away

- XOR cancellation is mod-2 counting applied to every bit position at once. That model generalises; the four-line function doesn't.
- Pairing is the shape behind both XOR problems here — values with values, or values with indices.
- `x & (x - 1)` underlies popcount, the power-of-two test and submask enumeration. Derive it once.
- Guards on these one-liners are load-bearing: zero and negatives are where the identities stop holding.
- Know the derivation; call the builtin.
