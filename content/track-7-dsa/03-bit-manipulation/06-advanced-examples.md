---
title: "Advanced Examples"
description: "Four problems that never mention bits — an adder, a corpus scan, a byte stream and a batch of fingerprints — each with hints before the solution, plus this chapter's failure modes."
track: 7
chapter: 3
page: 6
readMinutes: 5
---

The previous page's problems each announce themselves: they hand you a list of integers and
the identity that solves them is one of the four you just read about. Real ones don't. They
arrive as a corpus of words, a stream of bytes, a batch of records — and the bit view is
something you have to notice is available.

What follows are four of those. Each has hints before the solution: the first names the
observation to start from, the second says what to do with it. The reframing is the hard
part in every case; once it lands, the code is short.

## An Adder With No Adder

:::problem
You're writing the arithmetic unit of a small virtual machine. The host
gives you the bitwise operators — `&`, `|`, `^`, `~`, `<<`, `>>` — and
nothing else: no `+`, no `-`, and no library call that performs either
internally. Implement two's-complement addition of two signed 32-bit
integers.

Both inputs may be negative and the result is guaranteed to fit in 32
bits. Return it as an ordinary signed integer, not a bit pattern.

The way in is to look at how you were taught to add by hand. A column of
a written addition produces two things, and only one of them stays in
that column.

```text
Input:  a = 7, b = 3         Input:  a = -12, b = 5
Output: 10                   Output: -7
Explanation: 7 is 0b0111 and 3 is 0b0011. Column by column,
             1+1 writes a 0 and pushes something into the next
             column; 1+0 writes a 1 and pushes nothing. Both
             halves of that sentence are operators you have.
```

**Constraints.** `-2**31 <= a, b < 2**31`; the result fits in 32 bits.
:::

<details>
<summary>Hint 1</summary>

Split a hand-written column addition into two independent results: the digits you write
down if you *ignore carries entirely*, and the carries themselves. One operator produces
each, and neither needs the other.

</details>

<details>
<summary>Hint 2</summary>

Adding the carries back in can generate new carries, so the two-part step has to repeat
until there are none left. And Python has no 32-bit width to stop at — a negative operand
carries an infinite run of sign bits, so the loop needs a mask, and the final value needs
converting back to signed by hand.

</details>

<details>
<summary>Show solution</summary>

**Approach.** Column addition splits cleanly in two:

- `a ^ b` is every column summed **ignoring carries** — 1 + 0 writes 1, 1 + 1 writes 0.
- `a & b` marks the columns where both bits are 1, which are exactly the columns that
  *generate* a carry. Shifting left by one moves each carry into the column it lands in.

So `a + b == (a ^ b) + ((a & b) << 1)`. That looks circular, but the second term has
strictly fewer bits able to carry on each round, so repeating it terminates — in at most 32
iterations, and usually far fewer.

Python's arbitrary precision is the trap. Without masking, a negative operand carries an
infinite run of sign bits and the carry chain never empties, so mask every step to 32 bits.
At the end, a masked value above `INT_MAX` represents a negative number, whose signed value
is `~(a ^ MASK)`.

```python
def get_sum(a, b):
    MASK, INT_MAX = 0xFFFFFFFF, 0x7FFFFFFF
    a, b = a & MASK, b & MASK
    while b:
        carry = (a & b) << 1 & MASK
        a = (a ^ b) & MASK
        b = carry
    return a if a <= INT_MAX else ~(a ^ MASK)
```

Time O(32), space O(1).

**Follow-up.** Subtraction needs no new code: `get_sum(a, ~b + 1)`, because negation is
invert-and-add-one and the add is the function you just wrote. Multiplication is the same
decomposition one level up — shift-and-add, one term per set bit of the multiplier — which
is how a CPU without a multiplier unit does it, and how big-integer libraries still do it
above a certain size.

</details>

## The Longest Pair With Nothing In Common

:::problem
You're indexing a corpus and need to find the two most substantial
entries that have no overlap at all. Given a list of lowercase words,
return the largest product of the lengths of two words that share no
common letter. Return 0 if every pair shares at least one letter.

The naive version compares two words letter by letter, and does it for
every pair — with 5,000 words that's 12 million comparisons, each one
re-walking two strings. Sorting by length first doesn't rescue it
either: the longest word is frequently in no valid pair at all, so
there's no prefix of the sorted list you can stop at.

```text
Input:  words = ["abcw","baz","foo","bar","xtfn","abcdef"]
Output: 16
Explanation: "abcw" and "xtfn" share no letter: 4 * 4 = 16.
             The longest word, "abcdef", is in no valid
             pair — it shares a with "baz", b with "bar",
             f with "foo" and "xtfn", and abc with "abcw".
```

**Constraints.** `2 <= len(words) <= 5000`; words contain only `a`–`z`;
total length across all words is at most `10**6`.
:::

<details>
<summary>Hint 1</summary>

For this question, what *is* a word? Only two things about it matter — the set of distinct
letters it uses, and its length as a plain number. Everything else about the string,
including how often each letter appears and in what order, is irrelevant.

</details>

<details>
<summary>Hint 2</summary>

There are exactly 26 possible letters, and a set drawn from a fixed 26-element universe fits
in a single integer. Once each word is one number, "share no letter" becomes one operator,
and the pair loop never touches a string again.

</details>

<details>
<summary>Show solution</summary>

**Approach.** Reduce each word to a 26-bit mask, bit *i* meaning "this word uses the i-th
letter of the alphabet". That's one pass over the total input length. Two words share no
letter exactly when their masks have no bit in common — `masks[i] & masks[j] == 0` — which
is one instruction on values already in registers.

The pair loop is still quadratic in the number of words, but each iteration is now an AND
against an integer rather than a scan of two strings, which is the part that was actually
expensive.

```python
def max_product(words):
    masks = []
    for w in words:
        m = 0
        for ch in w:
            m |= 1 << (ord(ch) - ord('a'))
        masks.append(m)

    best = 0
    for i in range(len(words)):
        for j in range(i + 1, len(words)):
            if masks[i] & masks[j] == 0:
                best = max(best, len(words[i]) * len(words[j]))
    return best
```

Time O(L + n²) for total input length L, space O(n).

**What the reframing bought.** Nothing about the algorithm changed — it's still every pair —
but the per-pair cost went from "walk two strings" to one AND, and the 26-letter universe is
what made that possible. Recognising a small fixed universe is usually how the bit view
announces itself: 26 letters, 8 permissions, 64 feature flags, 12 months.

**Follow-up.** Many words collapse to the same mask ("bar", "barb" and "abracadabra" are all
`{a, b, r}`), so build a dict from mask to the longest word with that mask and pair up the
distinct masks instead. On a real corpus that's a large constant-factor win, and it caps the
loop at the number of distinct masks rather than the number of words.

</details>

## Framing a Byte Stream

:::problem
A network handler receives a stream as a list of integers, each holding
one byte. Decide whether the stream is a well-formed UTF-8 sequence
according to its framing rules:

A character is encoded in one to four bytes. A one-byte character starts
with a `0` bit. An n-byte character (for n of 2, 3 or 4) starts with
exactly n `1` bits followed by a `0`, and each of its remaining n − 1
bytes is a *continuation byte* starting with `10`. So the leading bits of
the first byte announce how many bytes follow, and every one of them
must be a continuation byte. Any other leading pattern is invalid, as is
a stream that ends mid-character.

Check the framing only — not whether the decoded value is a legal code
point.

```text
Input:  data = [197, 130, 1]     Input:  data = [235, 140, 4]
Output: True                     Output: False
Explanation: 197 is 11000101, which starts 110 and opens a
             two-byte character; 130 is 10000010, a valid
             continuation. 1 is 00000001, a one-byte
             character. In the second, 235 is 11101011 and
             opens a three-byte character, but 4 is
             00000100 and does not start with 10, so that
             character is truncated.
```

**Constraints.** `1 <= len(data) <= 2 * 10**4`; `0 <= data[i] <= 255`.
:::

<details>
<summary>Hint 1</summary>

Every rule above is stated as a condition on the *leading* bits of a byte, and everything
below them is irrelevant to it. Shifting right discards the low bits and leaves exactly the
prefix, so each rule is one shift and one equality test — no loop over bit positions, and
no string of `'0'` and `'1'`.

</details>

<details>
<summary>Hint 2</summary>

One pass, carrying a single number: how many continuation bytes are still expected. Each
byte is read one of two ways depending on whether that count is zero, and the state you're
in when the input runs out is itself a rule.

</details>

<details>
<summary>Show solution</summary>

**Approach.** Turn each framing rule into a shift-and-compare, then run a one-variable state
machine over the stream. `byte >> 5 == 0b110` asks "are the top three bits 110?" — the shift
throws away the five bits the rule says nothing about, so the comparison is exact.

`remaining` counts continuation bytes still owed. When it's non-zero the only legal byte is
a continuation; when it's zero the byte must be a valid *leading* byte, and its prefix sets
how many continuations follow. Running out of input with `remaining` non-zero means the last
character was truncated.

```python
def valid_utf8(data):
    remaining = 0
    for byte in data:
        if remaining:
            if byte >> 6 != 0b10:          # not a continuation byte
                return False
            remaining -= 1
        elif byte >> 7 == 0:               # 0xxxxxxx -- one byte
            remaining = 0
        elif byte >> 5 == 0b110:           # 110xxxxx -- two bytes
            remaining = 1
        elif byte >> 4 == 0b1110:          # 1110xxxx -- three bytes
            remaining = 2
        elif byte >> 3 == 0b11110:         # 11110xxx -- four bytes
            remaining = 3
        else:                              # 10xxxxxx here, or 11111xxx
            return False
    return remaining == 0
```

Time O(n), space O(1).

**Why the prefixes are shaped that way.** UTF-8's leading bits are a self-synchronising
code: a continuation byte is recognisable as one in isolation, so a decoder that starts
mid-stream can find the next character boundary by skipping bytes until one doesn't start
with `10`. That property is why the encoding won, and it's why every rule here is a prefix
test rather than a table lookup.

**Follow-up.** Framing is necessary but not sufficient. A real validator also rejects
**overlong encodings** — `[0xC0, 0x80]` frames correctly and passes the code above, but it
encodes U+0000 in two bytes where one is required, and treating it as a NUL has been the
basis of real path-traversal and filter-bypass attacks. [RFC 3629 §4](https://www.rfc-editor.org/rfc/rfc3629.html#section-4)
states the legal byte ranges that exclude those, along with surrogates and anything above
U+10FFFF. Adding the
range checks to the code above is a good exercise in how much of a spec a "correct-looking"
implementation can silently skip.

</details>

## Total Dissimilarity of a Batch

:::problem
Each record in a batch carries a 32-bit fingerprint, and two records are
considered different in proportion to the number of bit positions where
their fingerprints disagree. For a quality metric you need the batch's
total dissimilarity: the sum, over every unordered pair of records, of
the number of positions in which they differ.

The direct reading of that sentence is a double loop over pairs. At
100,000 records that's five billion pairs, so the answer is not a faster
per-pair comparison — the pair loop itself has to go.

```text
Input:  nums = [4, 14, 2]
Output: 6
Explanation: 4 is 0100, 14 is 1110, 2 is 0010. The pair
             (4, 14) differs in 2 positions, (4, 2) in 2,
             and (14, 2) in 2, for a total of 6. Note the
             middle column: two values have a 1 there and
             one has a 0.
```

**Constraints.** `1 <= len(nums) <= 10**5`; `0 <= nums[i] < 2**31`.
:::

<details>
<summary>Hint 1</summary>

The pairs are the problem, not the bits — so swap the two loops. Instead of asking what each
pair contributes across all 32 positions, ask what one position contributes across all
pairs. Bit position 3 of one number never interacts with bit position 4 of another, so the
positions are fully independent.

</details>

<details>
<summary>Hint 2</summary>

At a fixed position every number shows a 0 or a 1, and a pair contributes 1 to the total
exactly when its two values disagree there. If k of the n numbers have a 1 at that position,
you can count the disagreeing pairs without listing any of them.

</details>

<details>
<summary>Show solution</summary>

**Approach.** Each bit position contributes independently, so handle one at a time. At a
given position, say k of the n numbers have a 1 and n − k have a 0. A pair contributes 1
exactly when one of each is chosen, and the number of such pairs is **k · (n − k)** — no
enumeration required.

Summing that over the 32 positions is the whole answer.

```python
def total_differences(nums):
    total = 0
    for i in range(32):
        ones = sum(n >> i & 1 for n in nums)
        total += ones * (len(nums) - ones)
    return total
```

Time O(32n), space O(1). At n = 100,000 that's a few million operations instead of five
billion.

**The move worth keeping.** "Transpose the problem to one bit position at a time, then count
rather than enumerate" is the most transferable idea in this chapter. It's also exactly what
XOR does — a XOR across a list is mod-2 counting at all 32 positions simultaneously, which
is why the single-unpaired-element problem on the previous page works at all.

**Follow-up.** The same transposition solves the variant where every value appears three
times except one: XOR no longer cancels, since `x ^ x ^ x` is `x`, but at each position the
count of 1s modulo 3 is precisely the bit the unpaired value has there. Reassemble those 32
bits and you have the answer — remembering that in Python a result with bit 31 set needs
`- (1 << 32)` to become negative, since there's no width to make it so.

</details>

## Failure modes

Bit-level code fails quietly. None of the following raise; all of them produce a wrong
number.

**Missing masks in Python.** There is no width, so nothing wraps and `~x` is `-x - 1` rather
than a complement within a type. A negative value carries an infinite run of sign bits,
which is why the adder above loops forever without its mask. Porting a bit algorithm from C
or Java means adding `& 0xFFFFFFFF` at every step *and* converting the final value back to
signed.

**Signed versus unsigned right shift.** In Java `>>` copies the sign bit inward and `>>>`
fills with zeros. Using `>>` on something you're treating as a bit pattern sign-extends it,
so `while (x != 0) { count += x & 1; x >>= 1; }` never terminates for negative x. Python has
only `>>`, which behaves arithmetically — same bug, same shape.

**Shift amounts at or past the type width.** In C and C++ this is *undefined behaviour*, not
"returns zero", and compilers optimise on the assumption it never happens. Java masks the
shift amount to the low 5 bits for `int` and 6 for `long`, so `x << 32` on an `int` is a
no-op rather than zero. Relatedly, `1 << 31` on a signed 32-bit `int` sets the sign bit and
yields a negative number — use `1L << k` when k can reach the width.

**Operator precedence in C-family languages.** `&`, `|` and `^` bind looser than `==`, so
`if (flags & MASK == 0)` parses as `flags & (MASK == 0)` and the branch never fires.
Parenthesise even in Python, where the precedence is right.

## What to take away

- `a ^ b` is addition without carries and `(a & b) << 1` is the carries — repeat until there are none and you have an adder.
- A small fixed universe — 26 letters, 8 permissions, 12 months — is the usual signal that a set can be an integer, and it turns a per-pair scan into a single AND.
- Rules about the leading bits of a value are shift-and-compare, not loops over positions.
- When the pairs are the bottleneck, transpose to one bit position at a time and count instead of enumerating: k ones and n − k zeros give k · (n − k) differing pairs.
- Every failure mode here is silent: missing masks, sign-extending shifts, over-width shifts and C precedence all return a plausible wrong number.
