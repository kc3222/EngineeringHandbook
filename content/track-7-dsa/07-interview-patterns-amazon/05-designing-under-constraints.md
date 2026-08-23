---
title: "Designing Under Constraints"
description: "A bank of parcel lockers — a design question wearing a data-structures costume, where naming what the code omits is most of the answer."
track: 7
chapter: 7
page: 5
readMinutes: 5
---

The problems on the previous three pages each had one right answer. This one doesn't, and
that's the point of putting it last. A design question asks you to choose structures, state
what they cost, and be explicit about what you've left out — and the last of those three is
the part that distinguishes a considered design from a working one.

## Locker Assignment

:::problem
A pickup location has lockers in several sizes. `deposit(size)` assigns the
smallest available locker that fits and returns `(locker_id, code)`, or
`None` if nothing fits. `retrieve(code)` releases the locker and returns its
id, or `None` for an unknown or already-used code.

```text
Input:  LockerBank([(1, 10), (2, 10), (3, 30)])
        deposit(5)     ->  (1, 1)   smallest fitting size is 10
        deposit(8)     ->  (2, 2)   the other size-10 locker
        deposit(25)    ->  (3, 3)   only size 30 fits
        deposit(1)     ->  None     nothing free at all
        retrieve(2)    ->  2        locker 2 released
        deposit(1)     ->  (2, 4)   reused, with a new code
        retrieve(99)   ->  None     unknown code
Explanation: deposit(25) takes the size-30 locker because no
             smaller class fits. deposit(1) then fails even
             though it would fit anywhere — "smallest that
             fits" has already stranded the large locker,
             which the follow-up returns to.
```

**Constraints.** Sizes are a small fixed set (three or four in practice).
State any assumptions you make about concurrency and expiry.
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

```python
import heapq
from itertools import count

class LockerBank:
    def __init__(self, lockers):          # lockers: (locker_id, size)
        self.free = {}                    # size -> min-heap of locker ids
        self.size_of = {}
        self.assigned = {}                # code -> locker id
        self._codes = count(1)
        for lid, size in lockers:
            self.free.setdefault(size, [])
            heapq.heappush(self.free[size], lid)
            self.size_of[lid] = size
        self.sizes = sorted(self.free)

    def deposit(self, package_size):
        for size in self.sizes:
            if size >= package_size and self.free[size]:
                lid = heapq.heappop(self.free[size])
                code = next(self._codes)
                self.assigned[code] = lid
                return lid, code
        return None                       # nothing available

    def retrieve(self, code):
        lid = self.assigned.pop(code, None)
        if lid is None:
            return None                   # unknown or already collected
        heapq.heappush(self.free[self.size_of[lid]], lid)
        return lid
```

Deposit is O(S + log n) for S distinct sizes; retrieval is O(log n).

**The scan over sizes is deliberate.** Walking `self.sizes` from smallest finds the smallest
class that both fits and has stock. S is the number of distinct locker sizes — three or four
in any real installation — so treating it as a constant is defensible, and saying so is
better than pretending it's O(log n). If S were genuinely large, a sorted structure over
non-empty classes would replace the scan.

**Follow-up.** Discussing what the code omits is most of the value here, and volunteering
the omissions unprompted is the actual signal:

- **Expiry and reclamation.** Packages get abandoned. Without a policy, the bank fills permanently. That needs a deposit timestamp and a sweep, which changes the free-list from a pure heap into something that must support removal of a specific locker.
- **Concurrency.** Two deposits racing for the last locker in a size class both see it free. The `heappop` and the map insert must be atomic together, or the design needs a lock per size class.
- **Code generation.** A monotonic counter is guessable, and guessing a code retrieves someone else's package. Real codes need to be unpredictable and to expire — which makes this an authorisation problem, not a data-structures one.
- **Whether the policy is even right.** "Smallest that fits" strands large lockers: a run of small packages during a busy period fills the small classes, and the next small package takes a large locker that a large package then can't use. Whether that matters depends on the size distribution, and it's an empirical question rather than an algorithmic one.

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

## Where this chapter ends

That's the whole chapter: four pages of problems, none of which needed a technique that
isn't taught earlier in this track. The currency table is a weighted graph. The power budget
is a binary search with a window inside it. The expanding string is an invariant. The locker
bank is a heap and a map.

If the problems here have gone stale by the time you read them — and they will — the four
stripping questions from the first page have not. What relates the objects; what is being
asked for; what do the bounds allow; what stays true. Those work on a problem nobody has
reported yet, which is the only version of this that's worth carrying.

## What to take away

- A design question is two or more access patterns; pick a structure per pattern and state its cost.
- Composing a heap with a hash map covers "cheapest available" and "find by key" — the same shape as the LRU cache.
- Be honest about the constant factors you're treating as constants, and say why.
- Volunteer the omissions: expiry, concurrency, security, growth. Sixty seconds, and it's the most informative part of the answer.
- Questioning the specification — is smallest-fit even the right policy — is worth more than any implementation detail.
