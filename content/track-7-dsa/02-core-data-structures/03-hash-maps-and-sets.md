---
title: "Hash Maps & Sets"
description: "Hashing, collisions and load factor — the single most-reached-for structure, why it earns that, and why iteration order is a trap."
track: 7
chapter: 2
page: 3
readMinutes: 5
---

## The trade being made

An array gives you O(1) access if you know the *position*. A hash map gives you O(1)
access if you know the *key* — any key, of almost any type. That generalisation is worth
an enormous amount, and it's why the hash map is the structure most engineers reach for
first and most often.

The mechanism is a function: hash the key to an integer, reduce that integer to a bucket
index, look in the bucket. `hash("user:4821") % 64` is a position, and positions are what
arrays are fast at. Everything else about hash maps is dealing with the consequences of
two keys producing the same position.

## Collisions

Two distinct keys hashing to the same bucket is not an edge case — with 64 buckets and 20
keys, the probability that some pair collides is already above 95%. So collision handling
is part of the design, not an error path.

**Separate chaining** stores a secondary structure per bucket — a list, or in Java's
`HashMap` a balanced tree once a bucket exceeds eight entries. **Open addressing** keeps
everything in the main array and probes for the next free slot on collision; CPython's
`dict` uses a variant of this. Chaining is simpler and degrades gracefully; open
addressing has better cache behaviour because it stays inside one contiguous block.

Either way, lookup is O(1) *on average* and O(n) in the worst case where everything
collides. That distinction is worth taking seriously: a dynamic array's amortized O(1) is
a guarantee no input can break, while a hash map's average-case O(1) is a bet on the keys
being well distributed.

Lose the bet on purpose and it's an attack. If someone can choose the keys you insert and
the hash is predictable, they can generate thousands that all land in one bucket, turning
an O(n) parse of a JSON object into O(n²) — denial of service from a single request, with
no unusual traffic volume. This was demonstrated across most major runtimes at 28C3 in
2011. The fixes were **hash randomisation** (Python seeds `str` hashing per process, since
3.3) and, in Java, converting an over-full bucket into a balanced tree so the degenerate
case is O(log n) rather than O(n).

One consequence worth carrying: because Python randomises string hashing per process,
`hash(s)` is **not stable across runs**. Using it for sharding, cache keys or anything
persisted silently produces different answers after a restart. Use `hashlib.sha256` or
`zlib.crc32` when you need stability.

## Load factor and resizing

**Load factor** is entries ÷ buckets. As it rises, collisions rise with it, and the
average bucket stops being a short list. Implementations therefore keep it under a
threshold — roughly 0.66 in CPython, 0.75 in Java — and when it's exceeded they allocate
a larger table and **rehash every key into it**.

That resize is O(n), amortized to O(1) per insert by the same geometric-growth argument as
the dynamic array, and it carries the same two caveats: it's a latency spike rather than a
smooth cost, and the table carries meaningful memory overhead — you are deliberately keeping
a third or more of the slots empty, plus per-entry bookkeeping. A hash map of a million
small integers costs far more than an array of a million small integers.

## What makes a valid key

A key must be **hashable**, and the contract has two halves that must hold together:

1. Equal objects must have equal hashes. If `a == b`, then `hash(a) == hash(b)`.
2. The hash must not change while the object is in the map.

Break the first and lookups miss objects that are present. Break the second and you get
the more confusing failure: an object stored under one hash, then mutated, is now in the
wrong bucket. It's in the map, `in` returns `False`, and iterating finds it. This is why
Python forbids `list` and `dict` as keys but allows `tuple` and `frozenset`, and why
mutable objects used as keys are a real bug rather than a style preference.

In Java the same contract is the `equals`/`hashCode` pair, and overriding one without the
other is the canonical version of this mistake.

## Iteration order is a trap

The order a hash map yields its entries is an artefact of the hash function, the table
size and the insertion history. Depending on it is depending on an implementation detail.

Python is the confusing case here, because since 3.7 `dict` *does* guarantee insertion
order — that's a language guarantee and safe to rely on. But `set` does not, and never
has. And Python's string hashing is randomised per process, so the iteration order of a
set of strings genuinely differs between runs of the same program on the same input. Code
that passes locally and fails in CI one time in five is very often this.

The rule that survives moving between languages: **if order matters, say so.** Sort
explicitly, or use an ordered structure. Don't inherit ordering from a hash table.

:::tip[Key insight]
A hash map answers "what is associated with this key" and nothing else. Every question
involving order, ranges, nearest-neighbour or minimum requires either a different
structure or a full O(n) scan. Reaching for a hash map is right roughly 80% of the time —
and recognising the other 20% early is most of the value of knowing the rest of this
chapter.
:::

## Sets are maps without the values

A hash set is the same structure with the value dropped, and it answers exactly one
question — "have I seen this" — in O(1). That single question is behind a surprising
amount of code: deduplication, visited-tracking in graph traversal, membership filters,
and the fix to almost every accidentally-quadratic loop in the previous chapter.

The set operations are worth knowing because they're both expressive and efficient:

```python
a & b        # intersection — O(min(len(a), len(b)))
a | b        # union        — O(len(a) + len(b))
a - b        # difference   — O(len(a))
a <= b       # subset test
```

Expressing "which permissions did this user lose in the update" as `old - new` is shorter,
clearer and faster than the nested loop it replaces.

## What to take away

- A hash map trades ordering for O(1) access by arbitrary key. That's the whole deal.
- Collisions are normal; load factor bounds them, and exceeding it triggers an O(n) rehash.
- O(1) here is an *average* conditioned on well-distributed keys, not the unconditional bound an array append gets. Attacker-chosen keys can force the O(n) worst case, which is why runtimes randomise hashing — and why `hash()` isn't stable across processes.
- Keys must be immutable and must keep `hash` consistent with `==` — breaking either produces objects that are present but unfindable.
- Never depend on hash iteration order. Python's `dict` insertion order is a specific guarantee; `set` order is not, and differs between runs.
- Reach for a set the moment you write a membership test against a list.

## References

- [Python — TimeComplexity wiki](https://wiki.python.org/moin/TimeComplexity)
- [Python — `object.__hash__` and the hashability contract](https://docs.python.org/3/reference/datamodel.html#object.__hash__)
- [Python — `dict` ordering guarantee, 3.7 release notes](https://docs.python.org/3/whatsnew/3.7.html)
- [CPython — `dictobject.c` design notes](https://github.com/python/cpython/blob/main/Objects/dictobject.c) — the open-addressing and compact-dict layout
- [Java — `Object.hashCode` contract](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Object.html#hashCode()) and [`HashMap`](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html) — load factor and bucket treeification
- [Python — `PYTHONHASHSEED` and hash randomisation](https://docs.python.org/3/using/cmdline.html#envvar-PYTHONHASHSEED)
- [Klink & Wälde — *Efficient Denial of Service Attacks on Web Application Platforms*](https://fahrplan.events.ccc.de/congress/2011/Fahrplan/events/4680.en.html), 28C3, 2011 — the hash-flooding disclosure
