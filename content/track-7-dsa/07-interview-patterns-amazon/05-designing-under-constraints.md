---
title: "Designing Under Constraints"
description: "A bank of parcel lockers — a design question wearing a data-structures costume, where naming what the code omits is most of the answer."
track: 7
chapter: 7
page: 5
readMinutes: 5
---

The problems on the previous three pages each had one right answer. This one doesn't, and
that's the point of putting it here: the chapter closes with two design questions rather
than one more puzzle. A design question asks you to choose structures, state what they cost,
and be explicit about what you've left out — and the last of those three is the part that
distinguishes a considered design from a working one.

## Locker Assignment

:::problem
A pickup location has lockers in a few different sizes. The bank is built
from a list of `(locker_id, locker_size)` pairs.

`deposit(package_size)` puts a package in the smallest free locker whose
size is at least `package_size`, and returns that locker's id together
with a pickup code the recipient presents later. It returns `None` if no
free locker fits.

`retrieve(code)` frees the locker that code was issued for and returns
that locker's id. A code is single-use: an unknown code, or one that has
already been redeemed, returns `None`.

```text
LockerBank([(1, 10), (2, 10), (3, 30)])

deposit(5)      -> (1, 1001)   both size-10 lockers fit
deposit(8)      -> (2, 1002)   the other size-10 locker
deposit(3)      -> (3, 1003)   only the size-30 one is free
deposit(25)     -> None        nothing free that fits
retrieve(1002)  -> 2           locker 2 is released
retrieve(1002)  -> None        that code is already spent
deposit(9)      -> (2, 1004)   locker 2 reused, new code

Explanation: the third deposit is the interesting one. A
             3-unit package takes the size-30 locker because
             the small class is exhausted, so the 25-unit
             package behind it is turned away — the only
             locker that could have held it went to a
             package a tenth its size. "Smallest that fits"
             chooses only among what is free right now.
```

**Constraints.** Sizes are a small fixed set (three or four in practice) and locker ids are unique. If several free lockers share the smallest fitting size, any of them is a valid answer; the trace above takes the lowest id. State any assumptions you make about concurrency and expiry.
:::

<details>
<summary>Show solution</summary>

**Approach.** This is a design question wearing a data-structures costume. Read it as two
operations with different access patterns, and pick a structure for each.

*Deposit* needs the smallest available locker in a size class. That's repeatedly taking an
extreme from a changing set — a heap, per Chapter 2. A heap per size class, keyed on locker
ID, makes assignment deterministic and cheap.

*Retrieve* needs to find a locker by code. That's keyed lookup — a hash map.

Neither structure can do the other's job, and the composition is the answer. It's the same
shape as the LRU cache from Chapter 2: two structures covering each other's blind spot.

**Three dictionaries, each answering one question.** The names are worth reading before the
code, because the third one exists purely to connect the other two:

| Field | Maps | Answers |
| --- | --- | --- |
| `free` | size → min-heap of the free locker ids in that size | "which locker do I hand out for a package this big?" |
| `assigned` | pickup code → locker id | "which locker does this code open?" |
| `size_of` | locker id → that locker's size | "which heap does this locker go back into?" |

`free` is the inventory, filed by **size** — one heap per size class, so `free[10]` is the
free size-10 lockers and `heappop` takes the lowest-numbered of them. `assigned` is the
outstanding-codes book. Note what each one is keyed by: the inventory by size, the book by
code. That mismatch is the whole reason for `size_of`.

```python
import heapq
from itertools import count

class LockerBank:
    def __init__(self, lockers):          # lockers: (locker_id, size)
        self.free = {}                    # size -> min-heap of free locker ids
        self.size_of = {}                 # locker id -> its size
        self.assigned = {}                # pickup code -> locker id
        self._codes = count(1001)
        for lid, size in lockers:
            self.free.setdefault(size, [])
            heapq.heappush(self.free[size], lid)   # starts out free
            self.size_of[lid] = size               # remember where it lives
        self.sizes = sorted(self.free)    # size classes, smallest first

    def deposit(self, package_size):
        for size in self.sizes:           # smallest class that fits...
            if size >= package_size and self.free[size]:   # ...and has stock
                lid = heapq.heappop(self.free[size])       # lowest free id
                code = next(self._codes)
                self.assigned[code] = lid                  # code now opens it
                return lid, code
        return None                       # nothing free fits

    def retrieve(self, code):
        lid = self.assigned.pop(code, None)   # spend the code
        if lid is None:
            return None                       # unknown or already redeemed
        size = self.size_of[lid]              # which class was it from?
        heapq.heappush(self.free[size], lid)  # back into that class's heap
        return lid
```

**Why `self.free[self.size_of[lid]]`.** Deposit never needs it: it *chose* the size class it
popped from, so the size is right there in the loop variable. Retrieve is the direction that
loses that information. A code gives you a locker id and nothing else — but the free lists are
filed by size, so an id alone doesn't say which heap the locker belongs in. `size_of[lid]`
recovers the size, and `free[size]` is then the heap to push it back onto. It's one lookup
feeding another, and the version above splits it across two lines for exactly that reason.

Without it — while keeping the per-size heaps — you'd have to search every heap for the
locker's home class on each retrieval, the sort of O(n) scan that a second dictionary buys you
out of. This is the recurring move in these problems: when one operation runs in the opposite
direction from how the data is filed, add a map that reverses it. It is also worth noticing
that the map is a consequence of the partitioning, not of the problem; the alternative below
avoids both.

Deposit is O(S + log n) for S distinct sizes; retrieval is O(log n).

**The scan over sizes is deliberate.** Walking `self.sizes` from smallest finds the smallest
class that both fits and has stock. S is the number of distinct locker sizes — three or four
in any real installation — so treating it as a constant is defensible, and saying so is
better than pretending it's O(log n). If S were genuinely large, a sorted structure over
non-empty classes would replace the scan.

**A simpler structure that also works.** Keep the free lockers in one sorted list of
`(size, locker_id)` pairs instead of a heap per size class. Deposit binary-searches for the
first pair whose size fits and pops it; `assigned[code]` stores the whole pair; retrieve puts
that pair back in sorted position. Notice what happens to `size_of`: it disappears. It only
existed because splitting the free lockers into per-size heaps discards each locker's size —
store the pair and the size travels with the locker.

The trade runs in both directions, which is what makes it worth raising rather than
dismissing:

| | deposit | retrieve |
| --- | --- | --- |
| Heap per size class | O(S) scan for a class that fits, then O(log n) pop | O(log n) push |
| One sorted list | O(log n) binary search, then O(n) to close the gap | O(log n) search, then O(n) to open one |

The sorted list *removes* the scan that the previous paragraph had to excuse, and pays for it
by shifting elements on every insertion and removal. Asymptotically that's a loss — O(n)
against O(log n) — but n here is the number of lockers at one pickup location, and shifting a
few hundred contiguous machine words is not the operation that will decide anything. Neither
version is meaningfully cheaper at the size this problem actually runs at, so the honest
answer is that the two are interchangeable on speed and the choice should be made on
something else.

That something else is the concurrency follow-up below. Per-size heaps partition the free
lockers, which gives a natural lock per size class: deposits for different sizes don't
contend. One flat list is a single structure that every deposit and every retrieval has to
serialise on. And if n did grow, the way out is neither of these — a balanced BST or an
order-statistic structure over `(size, locker_id)` is O(log n) in both directions with no scan
and no `size_of`.

**Follow-up.** Discussing what the code omits is most of the value here, and volunteering
the omissions unprompted is the actual signal:

- **Expiry and reclamation.** Packages get abandoned. Without a policy, the bank fills permanently. That needs a deposit timestamp and a sweep, which changes the free-list from a pure heap into something that must support removal of a specific locker.
- **Concurrency.** Two deposits racing for the last locker in a size class both see it free. The `heappop` and the map insert must be atomic together, or the design needs a lock per size class.
- **Code generation.** A monotonic counter is guessable, and guessing a code retrieves someone else's package. Real codes need to be unpredictable and to expire — which makes this an authorisation problem, not a data-structures one.
- **Whether the policy is even right.** "Smallest that fits" strands large lockers, which is exactly what the third deposit in the example does: once the small class is exhausted, a small package takes a large locker, and the large package behind it is turned away. Whether that matters depends on the size distribution, and it's an empirical question rather than an algorithmic one.

The last of those is the most valuable to raise, because it questions the specification
rather than the implementation, and specifications are where the expensive mistakes live.

</details>

## What a design answer is actually made of

Four parts, in roughly this order. The code is the third.

**1. Enumerate the operations and their frequencies.** Two operations here, both frequent.
If retrieval were a thousand times rarer than deposit, a linear scan would be fine and the
map would be unnecessary complexity.

**2. Pick a structure per access pattern, and say what it costs.** Extremes from a changing
set means a heap. Lookup by key means a hash map. Ordered iteration means a sorted structure
or a tree. This is the table from Chapter 2's overview, read in the direction from access
pattern to structure.

**3. Write the smallest thing that implements it.** Twenty-five lines, not a production
service. The code exists to make the design concrete, not to be deployable.

**4. Name what you left out.** Concurrency, failure, growth, eviction, security, and the
assumptions in the specification itself. This is the part that separates someone who
implements a spec from someone who evaluates one, and it costs sixty seconds.

:::tip[Key insight]
On a design question, the code is the least informative artefact you produce. Two candidates
can write the same class; only one of them says "smallest-fit strands large lockers, and
whether that matters depends on the package size distribution." Naming the omissions is not
hedging — it's the demonstration that you know where a design's real risk sits.
:::

Those four steps assume the hard part is step 2 — picking the structures. The next page is a
design question where it isn't: one operation, an obvious structure, and the whole difficulty
sitting in a decision that comes before either of them.

## What to take away

- A design question is two or more access patterns; pick a structure per pattern and state its cost.
- Composing a heap with a hash map covers "cheapest available" and "find by key" — the same shape as the LRU cache.
- Partitioning data buys cheap operations and costs you a reverse map: splitting free lockers by size is what makes `size_of` necessary. One flat sorted structure needs no reverse map but shifts elements on every write.
- Be honest about the constant factors you're treating as constants, and say why.
- Volunteer the omissions: expiry, concurrency, security, growth. Sixty seconds, and it's the most informative part of the answer.
- Questioning the specification — is smallest-fit even the right policy — is worth more than any implementation detail.
