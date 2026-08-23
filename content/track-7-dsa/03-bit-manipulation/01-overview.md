---
title: "Bit Manipulation"
description: "What an integer actually is in memory, the handful of operators that act on it directly, and the cases where that view is the simplest one available."
track: 7
chapter: 3
page: 1
readMinutes: 3
---

:::info[Prerequisites]
**Complexity & Performance Analysis**, page *Reading Time & Space Complexity* — this
chapter's central claim is that certain O(n) loops collapse to O(1) operations, and that
claim needs the vocabulary to state. No prior exposure to binary is assumed.
:::

## Why this chapter exists

Most of the time an integer is a number and that's the end of it. Occasionally it's more
useful to see it as what it physically is: a fixed-width row of bits, with six operators
that act on those bits directly. Adopting that view turns a handful of problems from
loops into single expressions, and — more importantly — explains a set of things you have
already been using without seeing the mechanism: permission flags, feature toggles, hash
mixing, the internals of a Bloom filter.

The chapter is short because the material is small. There are six operators, roughly six
idioms worth knowing, and one genuinely important application (an integer as a set). The
difficulty is not volume.

## A note on how this chapter is written

Bit manipulation attracts trick-collecting more than any other topic in this track, and a
memorised trick with no model behind it is worse than not knowing it — it produces code
that is correct until the moment the input changes shape, at which point nobody, including
its author, can say why it broke.

So every identity here is **derived rather than asserted**. `x & (x - 1)` clears the
lowest set bit for a reason that takes two sentences to explain, and those two sentences
are the content; the expression is just notation for them. If you finish a page able to
recite an identity but not to explain it, the page has failed and it's worth rereading
rather than moving on.

## What's in here

| Page | What it covers |
| --- | --- |
| How Integers Are Stored | Binary representation, fixed width, two's complement, and why the highest bit is special |
| The Six Operators | AND, OR, XOR, NOT and the two shifts — introduced by what each is *for* |
| The Idioms Worth Memorizing | Test, set, clear, toggle; isolating and clearing the lowest set bit; power-of-two checks and population count |
| Bitmasks as Sets | An integer as a subset of up to 64 elements — membership, union, intersection, and subset enumeration |
| Where Bits Show Up in Real Systems | Permission flags, compact storage, Bloom filters, hash mixing — and where bit tricks don't belong |
| Worked Examples | Four derivations with collapsible solutions, plus this chapter's failure modes |

## Where this connects

*Bitmasks as Sets* is a direct prerequisite for **Dynamic Programming**, page *State
Compression* — bitmask DP is only possible because a subset can be an array index. The
permission-flag material connects to **Authentication & Authorization**, and the Bloom
filter section to the pre-filtering stage in **Embeddings & Vector Search**.

## References

- [Warren — *Hacker's Delight*, 2nd ed.](https://www.oreilly.com/library/view/hackers-delight-second/9780133084993/) — the standard reference for bit-level identities and their derivations
- [Python — Bitwise operations on integer types](https://docs.python.org/3/library/stdtypes.html#bitwise-operations-on-integer-types)
