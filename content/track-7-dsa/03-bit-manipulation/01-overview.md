---
title: "Bit Manipulation"
description: "What an integer actually is in memory, the handful of operators that act on it directly, and the cases where that view is the simplest one available."
track: 7
chapter: 3
page: 1
readMinutes: 2
---

:::info[Prerequisites]
**Complexity & Performance Analysis**, page *Reading Time & Space Complexity* — this
chapter's central claim is that certain O(n) loops collapse to O(1) operations, and that
claim needs the vocabulary to state. No prior exposure to binary is assumed.
:::

## Why this chapter exists

Most of the time an integer is a number and that's the end of it. Occasionally it's more
useful to see it as what it physically is: a fixed-width row of bits, with six operators
that act on those bits directly. Adopting that view turns a handful of problems from loops
into single expressions, and explains a set of things you have already been using without
seeing the mechanism — permission flags, feature toggles, hash table sizing.

The chapter is short because the material is small: six operators, about six idioms, and
one genuinely important application (an integer as a set). The difficulty is not volume.

Bit manipulation also attracts trick-collecting more than any other topic in this track,
and a memorised trick with no model behind it is worse than not knowing it — it produces
code that is correct until the input changes shape, at which point nobody can say why it
broke. So every identity here is **derived rather than asserted**. If you finish a page
able to recite an identity but not explain it, the page is worth rereading rather than
moving on.

## What's in here

| Page | What it covers |
| --- | --- |
| The Six Operators | What an integer is as a row of bits, then AND, OR, XOR, NOT and the two shifts — introduced by what each one is *for* |
| The Idioms Worth Memorizing | Test, set, clear, toggle; isolating and clearing the lowest set bit; power-of-two checks and population count |
| Bitmasks as Sets | An integer as a subset of up to 64 elements — membership, union, intersection, flag words, and subset enumeration |
| Worked Examples | Five standard problems with collapsible solutions |
| Advanced Examples | Four problems that never mention bits — an adder, a corpus scan, a byte stream, a batch of fingerprints — each with hints, plus this chapter's failure modes |

Two pages of examples rather than one is deliberate. The standard set states the problem in
terms of the identity that solves it, which is how you practise the identity. The advanced
set doesn't: those problems are about words, bytes and records, and noticing that a bit
representation is available at all is most of the work — which is the part that doesn't
come from reading.

## Where this connects

*Bitmasks as Sets* is a direct prerequisite for **Dynamic Programming**, page *State
Compression* — bitmask DP is only possible because a subset can be an array index. The
permission-flag material connects to **Authentication & Authorization**.

## References

- [Warren — *Hacker's Delight*, 2nd ed.](https://www.oreilly.com/library/view/hackers-delight-second/9780133084993/) — the standard reference for bit-level identities and their derivations
- [Python — Bitwise operations on integer types](https://docs.python.org/3/library/stdtypes.html#bitwise-operations-on-integer-types)
