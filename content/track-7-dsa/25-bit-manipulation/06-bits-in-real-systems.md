---
title: "Where Bits Show Up in Real Systems"
description: "Permission flags, compact storage, Bloom filters and hash mixing — and the places a bit trick is the wrong answer."
track: 7
chapter: 25
page: 6
readMinutes: 5
---

## Permission and feature flags

The most common use, and the one most engineers have already met without recognising it.

A set of independent on/off capabilities is a set, and a set of up to 64 things is an
integer. Unix file permissions are the canonical example: `chmod 755` is three octal
digits, each digit three bits, each bit one of read/write/execute.

```python
READ, WRITE, EXECUTE, DELETE = 1, 2, 4, 8      # 1 << 0 .. 1 << 3

perms = READ | WRITE                            # grant two
perms |= EXECUTE                                # grant another
perms &= ~WRITE                                 # revoke one
can_read = bool(perms & READ)                   # test
```

Python's `enum.Flag` wraps this with names and type safety while keeping the same
representation, and it's what you should actually use — the operators are identical, the
debugging is far better:

```python
from enum import Flag, auto

class Perm(Flag):
    READ = auto()
    WRITE = auto()
    EXECUTE = auto()

p = Perm.READ | Perm.WRITE
Perm.WRITE in p          # True
```

The same pattern appears in TCP header flags (SYN, ACK, FIN, RST as bits in one byte),
`open()` mode flags in POSIX, CPU feature detection, and most feature-toggle systems that
need to ship a user's entire flag state in a cookie or a JWT claim. The reason is always
the same: one integer, atomic to read and write, cheap to compare, trivial to store.

## Compact storage of dense boolean data

A Python `bool` in a list costs a pointer — 8 bytes — plus the object. A bit costs a bit.
For a million booleans that's the difference between roughly 8 MB and 125 KB, and the
smaller one also fits in cache, which usually matters more than the allocation.

The sieve of Eratosthenes over 10⁸ is the standard illustration: as a list of booleans it
doesn't fit comfortably in memory, and as a bit array it's 12 MB. Python's `bytearray`,
NumPy's `packbits`, Java's `BitSet` and C++'s `vector<bool>` all provide this.

The threshold is worth being honest about. Below a few hundred thousand elements the
memory saving is irrelevant and the readability cost is not, so this is a technique for
genuinely large dense data, not a default.

## Bloom filters

A Bloom filter answers "have I definitely *not* seen this?" using a bit array and k hash
functions. Insert by setting the k bits each hash names; query by checking whether all k
are set. If any is clear, the item was certainly never inserted. If all are set, it
*probably* was — other insertions may have set those bits.

The tradeoff is what makes it useful: false positives are possible, false negatives are
not, and the memory cost is a small constant number of bits per element regardless of how
large the elements are. About 10 bits per element gives roughly a 1% false-positive rate.

```python
def bit_index(bits, item, h):
    return h(item) % (len(bits) * 8)        # bits is a bytearray

def add(bits, item, hashes):
    for h in hashes:
        i = bit_index(bits, item, h)
        bits[i >> 3] |= 1 << (i & 7)        # byte index, then bit within byte

def probably_contains(bits, item, hashes):
    return all(bits[(i := bit_index(bits, item, h)) >> 3] >> (i & 7) & 1
               for h in hashes)
```

The two bit operations there are worth naming: `i >> 3` is `i // 8` (which byte) and
`i & 7` is `i % 8` (which bit within it). Both are the shift-and-mask idioms from earlier
in the chapter, and both are how every bit array indexes itself.

Bloom filters are used to skip disk reads in LSM-tree databases like Cassandra and
RocksDB, to avoid network round trips in CDN caches, and to pre-filter candidate sets
before an expensive similarity computation.

## Hash mixing

Hash functions use XOR and shifts to spread input entropy across all output bits. The
requirement is the **avalanche** property: flipping one input bit should flip about half
the output bits. XOR is the operator of choice because it's information-preserving —
combining two values with XOR loses nothing, while AND and OR both discard.

```python
def mix(x):
    x ^= x >> 33
    x *= 0xff51afd7ed558ccd
    x ^= x >> 33
    return x & 0xFFFFFFFFFFFFFFFF
```

This shape — XOR with a right shift, multiply by an odd constant, repeat — is the
finalizer from MurmurHash3, and variants of it appear in nearly every modern non-cryptographic
hash. The shift moves high-bit entropy down where multiplication can't reach it; the
multiply spreads low bits upward.

Related: `hash & (size - 1)` replaces `hash % size` when the table size is a power of two,
which is why hash table capacities usually are. It's the same identity as the power-of-two
check, used in the other direction.

## Where bits do not belong

The honest counterweight, and the reason this page ends rather than continues.

**Arithmetic.** `x << 3` instead of `x * 8` was worth doing decades ago. Compilers now do
this substitution reliably, and the hand-written version is harder to read and wrong on
negatives in some languages. Write the multiplication.

**Branchless tricks.** `(a ^ ((a ^ b) & -(a < b)))` computes the minimum without a branch.
Modern branch predictors make the ordinary comparison as fast in nearly all cases, and the
compiler will emit a conditional move if it isn't. Write `min(a, b)`.

**Anywhere the set is small and not hot.** Four boolean fields on a class should be four
boolean fields. Packing them into an integer saves 24 bytes and costs every future reader
a translation step.

The test that distinguishes the useful cases above from these is whether the bit view is
*expressing something*, or merely encoding something. Permission flags, Bloom filters and
hash mixing are all cases where the data genuinely is a set of bits and treating it as one
is the clearest available description. Replacing `* 8` with `<< 3` expresses nothing; it
just makes multiplication harder to read.

## What to take away

- Flag sets, Unix permissions, TCP header bits and feature toggles are all "integer as set" — use `enum.Flag` rather than raw constants where the language offers it.
- Bit arrays cut dense boolean storage by roughly 8×, which matters above a few hundred thousand elements and not below.
- Bloom filters trade a bounded false-positive rate for constant bits per element, and never produce false negatives.
- Hash mixing uses XOR and shifts because XOR preserves information while AND and OR discard it.
- Use bit tricks where the data really is a set of bits. Don't use them to write arithmetic in fewer characters — readability beats a cycle you weren't going to notice.

## References

- [Python — `enum.Flag`](https://docs.python.org/3/library/enum.html#enum.Flag)
- [Bloom — *Space/Time Trade-offs in Hash Coding with Allowable Errors*](https://dl.acm.org/doi/10.1145/362686.362692), CACM 1970 — the original paper
- [RFC 9293 — Transmission Control Protocol](https://www.rfc-editor.org/rfc/rfc9293.html#section-3.1), §3.1 — the TCP header control bits
- [Appleby — MurmurHash3](https://github.com/aappleby/smhasher/blob/master/src/MurmurHash3.cpp) — the mixing finalizer quoted above
- [Java — `BitSet`](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/BitSet.html) and [NumPy — `packbits`](https://numpy.org/doc/stable/reference/generated/numpy.packbits.html)
