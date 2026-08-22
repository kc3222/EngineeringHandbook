---
title: "Amortized & Average Cost"
description: "Why a dynamic array append is O(1) despite resizing, why a hash lookup is O(1) 'usually,' and where each qualifier bites in production."
track: 7
chapter: 23
page: 5
readMinutes: 5
---

## Two different kinds of "usually"

Both a list append and a dictionary lookup are quoted as O(1), and both are sometimes
much more expensive than that. But they're cheating in different ways, and the difference
decides how much you should worry.

An append is **amortized** O(1): the expensive case is guaranteed to be rare, by
construction, and the average over any sequence of operations is provably constant.
Nothing about your data can break it.

A hash lookup is **average-case** O(1): the expensive case is rare *if the hash function
distributes your keys well*. That's an assumption about the input, and inputs can violate
it — sometimes by accident, occasionally on purpose.

Amortized is a mathematical guarantee. Average-case is a bet. Both are usually fine; only
one of them has ever caused a security advisory.

## Why appending is amortized O(1)

A dynamic array (Python's `list`, Java's `ArrayList`, C++'s `vector`, JavaScript arrays)
stores elements in one contiguous block. When the block fills, it allocates a bigger one
and copies everything across — an O(n) operation in the middle of a sequence of O(1) ones.

The trick is the growth factor. Implementations grow by a *multiple* of the current size
(roughly 1.125× in CPython, 2× in many others), not by a fixed amount. Doubling from
size 1 to size n costs 1 + 2 + 4 + … + n/2 total copies, which sums to less than n. So n
appends cost O(n) work in total, and O(1) each on average.

The growth factor is doing all the work here. Growing by a *constant* number of slots
instead would cost 1 + 2 + 3 + … copies — O(n²) for n appends, and a list that gets
quietly slower the longer it gets.

:::tip[Key insight]
Amortized analysis is not "the average case." It's a worst-case bound on a *sequence* of
operations. You cannot construct an input that makes n appends cost more than O(n) total,
however adversarial you are — the guarantee is structural, not statistical.
:::

## Where amortization still bites

The average being constant does not make any individual operation constant, and there are
two places that matters.

**Latency, not throughput.** A resize on a large array is a single long pause. For a
batch job the amortized number is the only one that matters; for a request with a p99
latency target, the occasional multi-millisecond copy shows up in exactly the percentile
you're being measured on. If you know the final size, pre-allocating removes the
resizes altogether.

**Memory headroom.** Growing geometrically means an array can hold up to roughly twice
the memory its contents need. Removing elements typically doesn't shrink the allocation
either — Python's `list` never returns capacity to the allocator on `pop`. A list that
briefly held ten million items keeps that footprint until it's discarded.

## Why hash lookups are average-case O(1)

A hash map computes a hash of the key, reduces it to a bucket index, and looks there.
When two keys land in the same bucket — a **collision** — the map falls back to scanning
or probing.

With a good hash function and a bounded **load factor** (elements ÷ buckets, kept below
about 0.66 in CPython and 0.75 in Java's `HashMap`), the expected number of keys per
bucket is a small constant, so lookups are O(1) on average. When the load factor is
exceeded, the map allocates a bigger table and rehashes everything — the same amortized
resize story as the dynamic array.

The worst case is O(n): every key collides, and the map degenerates into a linear scan.
This is not hypothetical.

## Hash flooding, and what runtimes did about it

If an attacker can choose the keys you insert, and the hash function is predictable, they
can generate thousands of keys that all hash to the same bucket. Every insertion then
scans the whole bucket, turning an O(n) parse of a JSON object or a form body into O(n²)
— a denial of service from a single request with no unusual traffic volume. This was
demonstrated across most major language runtimes at 28C3 in 2011.

The general fix was **hash randomisation**: seed the hash function with a per-process
random value so an attacker can't precompute colliding keys. Python enables it by default
for `str` and `bytes` since 3.3 (`PYTHONHASHSEED` controls it); Java's `HashMap` takes a
different route, converting an over-full bucket into a balanced tree so the degenerate
case is O(log n) rather than O(n).

Two practical consequences. First, don't build a hash map from untrusted keys in a
runtime you haven't checked. Second, **string hashes are not stable across processes** in
Python — using `hash(s)` for sharding, cache keys or anything persisted will silently
produce different answers after a restart. Use an explicit hash such as `hashlib.sha256`
or `zlib.crc32` when you need stability.

## The costs worth knowing by heart

| Operation | Typical | Worst case | Why |
| --- | --- | --- | --- |
| Dynamic array append | O(1) amortized | O(n) single op | Resize and copy |
| Dynamic array index | O(1) | O(1) | Address arithmetic |
| Dynamic array insert/delete at front | O(n) | O(n) | Shifts every element |
| Hash lookup / insert | O(1) average | O(n), or O(log n) treeified | Collisions, rehash |
| Balanced tree lookup | O(log n) | O(log n) | Guaranteed, no assumption on keys |

That last row is the reason ordered maps still exist. `std::map`, Java's `TreeMap` and
Postgres B-tree indexes trade a slower average for a bound that holds unconditionally —
worth paying when the keys come from outside, or when you need ordered iteration anyway.

## What to take away

- Amortized O(1) is a guarantee about a sequence of operations, and geometric growth is what provides it.
- Amortization hides latency spikes and memory headroom, both of which are visible in production even when the average is fine.
- Average-case O(1) for hash maps assumes well-distributed keys — an assumption attacker-controlled input can break.
- Hash randomisation and treeified buckets are the runtime-level mitigations; don't rely on `hash()` being stable across processes.
- When you need a bound that holds unconditionally, a balanced tree's O(log n) is the honest choice.

## References

- [Python — TimeComplexity wiki](https://wiki.python.org/moin/TimeComplexity)
- [CPython — `listobject.c` `list_resize`](https://github.com/python/cpython/blob/main/Objects/listobject.c) — the over-allocation growth pattern
- [Python — `PYTHONHASHSEED` and hash randomisation](https://docs.python.org/3/using/cmdline.html#envvar-PYTHONHASHSEED)
- [Klink & Wälde — *Efficient Denial of Service Attacks on Web Application Platforms*](https://fahrplan.events.ccc.de/congress/2011/Fahrplan/events/4680.en.html), 28C3, 2011 — the hash-flooding disclosure
- [Java — `HashMap` API documentation](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html) — load factor and bucket treeification
- [Cormen, Leiserson, Rivest & Stein — *Introduction to Algorithms*, 4th ed.](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/), Chapter 16 ("Amortized Analysis")
