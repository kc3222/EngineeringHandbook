# Track VII — Worked Examples & Chapter 29

Companion to `handbook-track-vii-dsa.md`. Covers two additions:

1. A worked-example format with collapsible solutions, and where examples sit
   within chapters 23–27
2. **Chapter 29 — Interview Patterns: Amazon**, written out in full

---

## Part 1 — Worked Example Format

### Rendering

Docusaurus renders a native `<details>` element with no component import and
no client JS. The collapsed state is the browser's, so it survives SSG
cleanly and degrades fine without JavaScript.

```markdown
### Longest Holiday Streak

An employee's calendar is a sequence of work days and holidays. Given a
budget of days they're allowed to convert from work to holiday, find the
longest unbroken run of holidays they can arrange.

<details>
<summary>Show solution</summary>

**Approach.** Sliding window. Expand right freely; contract left whenever
the number of converted work days exceeds the budget. The window is always
a valid arrangement, so its maximum width is the answer.

```python
def longest_holiday(days, budget):
    left = used = best = 0
    for right, day in enumerate(days):
        if day == 'w':
            used += 1
        while used > budget:
            if days[left] == 'w':
                used -= 1
            left += 1
        best = max(best, right - left + 1)
    return best
```

Time O(n), space O(1). Each index enters and leaves the window once.

</details>
```

**The blank lines are load-bearing.** In `.mdx`, a fenced block flush against
`<summary>` or `</details>` will not parse. Docusaurus v3 handles `.md` as
CommonMark and `.mdx` as MDX by default, so behavior differs between the two —
worth confirming against your config before generating 30 files.

If you'd rather have consistent styling with the rest of the theme, Docusaurus
also exports a `<Details>` component from `@docusaurus/theme-common`, which
adds the animated disclosure. It requires an import line per page, which
argues against it at this scale.

### Conventions

- **Two to four examples per chapter**, placed on their own page at the end
  of the chapter rather than scattered through teaching pages. Keeps the
  1–5 minute page target intact and keeps teaching pages migration-clean.
- **Description in original prose.** Never paste a problem statement from
  another site. Describe the shape of the problem in the handbook's own
  voice and framing.
- **Solution block order:** approach in prose → code → complexity → one
  follow-up. The follow-up is the part most resources omit and it's where
  the actual learning is.
- **Under 25 lines of Python.** If it doesn't fit, the example is too big
  for the format.
- **No difficulty labels.** No "easy/medium/hard," no company tags on pages
  outside Chapter 29.

### Example allocation for chapters 23–27

These are canonical problems that Claude Code can draft from the title alone.
Descriptions must be written fresh, not sourced.

| Chapter | Examples |
|---|---|
| 23 · Complexity | Comparing two implementations of the same function; estimating feasible complexity from a constraint |
| 24 · Core Data Structures | Top-k frequent elements (heap + map); LRU cache (hash map + doubly linked list); connected components under incremental merges (union-find) |
| 25 · Bit Manipulation | See below — written out in full, since the teaching value is in the derivations rather than the code |
| 26 · Trees & Graphs | Counting regions in a grid; shortest path in an unweighted graph; detecting a cycle in a dependency graph; lowest common ancestor |
| 27 · Patterns | Longest substring without repeats (window); container with most water (two pointers); minimum capacity to finish in D days (binary search on answer); next greater element (monotonic stack); range sum queries (prefix sums) |
| 28 · Dynamic Programming | Climbing stairs → house robber → house robber with a circular constraint, as one escalating sequence; edit distance |

---

## Part 1b — Chapter 25 Worked Examples

Written out rather than allocated by title, because in this chapter the code
is trivial and the derivation is the content. Any of these can be produced by
a model in four lines; none of them teach anything in that form.

#### The Element That Appears Once

Every value in a list appears exactly twice except one. Find the one.

<details>
<summary>Show solution</summary>

**Approach.** A hash map counting occurrences works and is O(n) space. The
better answer uses XOR — but only if you can say why it works.

Three properties do all the work: `x ^ x == 0`, `x ^ 0 == x`, and XOR is
commutative and associative. That last one is the load-bearing part. Because
order doesn't matter, the list can be mentally rearranged so every pair sits
together, and each pair cancels to zero. Whatever survives is the unpaired
value.

```python
def single_number(nums):
    result = 0
    for n in nums:
        result ^= n
    return result
```

Time O(n), space O(1).

**Why this example leads the chapter.** It is the canonical case of a trick
that gets memorized without a model. Candidates routinely produce this
function and then cannot answer "why does that work" — and interviewers ask,
because the answer distinguishes someone who understands XOR as
cancellation from someone who has seen the snippet. The three properties
above take fifteen seconds to state and are the entire justification.

**Follow-up.** If every value appears three times except one, XOR no longer
cancels. The generalization counts each bit position mod 3 — a good exercise
for after page 3.

</details>

#### Counting Set Bits

Count the number of 1 bits in an integer.

<details>
<summary>Show solution</summary>

**Approach.** The obvious loop checks all 32 or 64 positions. Kernighan's
method instead runs once per set bit.

The identity is `x & (x - 1)` clears the lowest set bit. Subtracting one
turns the lowest set bit into a zero and flips every zero below it to one; the
AND then keeps only the bits above, which were untouched. So each iteration
removes exactly one bit and the loop runs popcount times.

```python
def count_bits(x):
    count = 0
    while x:
        x &= x - 1
        count += 1
    return count
```

Time O(number of set bits), space O(1).

**Worth naming.** Every language has this built in — `int.bit_count()` in
Python 3.10+, `Integer.bitCount` in Java. Show the derivation, then say to
use the builtin. A handbook that teaches the loop without saying that is
teaching a worse habit.

</details>

#### Checking for a Power of Two

Determine whether a positive integer is a power of two.

<details>
<summary>Show solution</summary>

**Approach.** A power of two has exactly one set bit. Clearing the lowest set
bit therefore leaves zero.

```python
def is_power_of_two(x):
    return x > 0 and x & (x - 1) == 0
```

Time O(1), space O(1).

**The guard matters.** Without `x > 0`, zero returns `True` and negative
numbers behave differently depending on whether the language uses fixed-width
two's complement. This is the smallest possible illustration of the chapter's
failure-mode section, which is why it earns a page slot despite being one
line.

</details>

#### Enumerating Subsets

Produce every subset of a collection.

<details>
<summary>Show solution</summary>

**Approach.** With n elements there are 2ⁿ subsets, and the integers from 0 to
2ⁿ − 1 are exactly the 2ⁿ distinct patterns of n bits. Counting up therefore
enumerates the subsets, with bit *i* meaning "element *i* is included."

```python
def subsets(items):
    n = len(items)
    for mask in range(1 << n):
        yield [items[i] for i in range(n) if mask >> i & 1]
```

Time O(n · 2ⁿ), space O(n) per subset.

**Why this page is a prerequisite for Chapter 28.** Once a subset is an
integer, it can be a dictionary key or an array index — which is the entire
premise of bitmask dynamic programming. The bridge is worth stating
explicitly here rather than assuming the reader makes it later.

**Follow-up.** Iterating only the submasks of a given mask uses
`sub = (sub - 1) & mask`, which is the same borrow behavior as
`x & (x - 1)` restricted to the mask's bits.

</details>

---

## Part 2 — Chapter 29

**29 · Interview Patterns: Amazon**
Problems reported by candidates, reframed as pattern illustrations — what
each one is really testing underneath the story.
*5 pages*

### Framing

These are described from public candidate reports, restated in original
prose. Each is presented as an instance of a pattern taught earlier in the
track, with a back-reference. The chapter's value is the mapping, not the
list — anyone can find a list.

Two things to state plainly on the chapter intro page: reported questions go
stale, and the pattern outlives the question. That framing is also what
protects the page from becoming a maintenance burden.

---

### Page 1 — Reading the Story for the Shape

Framing page. Interview problems arrive wrapped in a business scenario;
the skill is stripping the wrapper. Walk through one example end to end,
showing the translation from prose to structure. Back-reference Chapter 27
page 1.

---

### Page 2 — Graph Problems in Disguise

#### Currency Conversion

Given a set of exchange relationships between currencies — 1 unit of C is
worth 10 of B, 1 unit of B is worth 110 of Z, and so on — find the rate
between any two currencies, or report that no chain connects them.

<details>
<summary>Show solution</summary>

**Approach.** Nothing here looks like a graph until you notice each
relationship is an edge with a multiplicative weight, and the reverse edge
is its reciprocal. A conversion is then a path, and the rate is the product
along it. BFS finds one.

```python
from collections import defaultdict, deque

def build(rates):                    # rates: (a, b, r) meaning 1 a == r b
    g = defaultdict(list)
    for a, b, r in rates:
        g[a].append((b, r))
        g[b].append((a, 1 / r))
    return g

def convert(g, src, dst):
    if src not in g or dst not in g:
        return None
    seen, q = {src}, deque([(src, 1.0)])
    while q:
        node, acc = q.popleft()
        if node == dst:
            return acc
        for nxt, rate in g[node]:
            if nxt not in seen:
                seen.add(nxt)
                q.append((nxt, acc * rate))
    return None
```

Time O(V + E) per query, space O(V + E).

**Follow-up.** With many queries against a fixed rate table, per-query BFS
wastes work. Weighted union-find stores each node's rate relative to its
component root, making a query O(α(n)) after construction — at the cost of
having to rebuild when rates change.

</details>

#### Package Build Order

Given a set of packages and the dependencies between them, produce an order
in which they can be built such that nothing is built before what it needs.

<details>
<summary>Show solution</summary>

**Approach.** Topological sort by indegree. Repeatedly take any package with
no unbuilt dependencies. If the queue empties before every package is
placed, the remainder sits in a cycle.

```python
from collections import defaultdict, deque

def build_order(packages, dependencies):     # (pkg, depends_on)
    graph = defaultdict(list)
    indegree = {p: 0 for p in packages}
    for pkg, dep in dependencies:
        graph[dep].append(pkg)
        indegree[pkg] += 1

    q = deque(p for p in packages if indegree[p] == 0)
    order = []
    while q:
        p = q.popleft()
        order.append(p)
        for nxt in graph[p]:
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                q.append(nxt)

    if len(order) != len(packages):
        raise ValueError("circular dependency")
    return order
```

Time O(V + E), space O(V + E).

**Follow-up.** Detecting the cycle is table stakes; naming which packages are
in it is the real ask. The nodes still carrying nonzero indegree at
termination are exactly that set.

</details>

#### Two Knights Converging

Two knights sit on an unbounded chessboard. Both move with standard knight
moves. Find the smallest total number of moves — counting both knights —
after which they occupy the same square.

<details>
<summary>Show solution</summary>

**Approach.** An unbounded board rules out precomputing distances, so search
outward from both knights at once and look for the cheapest square reachable
by both.

```python
from collections import deque

MOVES = [(1, 2), (2, 1), (-1, 2), (-2, 1),
         (1, -2), (2, -1), (-1, -2), (-2, -1)]

def min_total_moves(a, b):
    if a == b:
        return 0
    dist = [{a: 0}, {b: 0}]
    frontier = [deque([a]), deque([b])]
    turn, best = 0, None

    while best is None:
        q, seen, other = frontier[turn], dist[turn], dist[1 - turn]
        for _ in range(len(q)):
            x, y = q.popleft()
            for dx, dy in MOVES:
                nxt = (x + dx, y + dy)
                if nxt in seen:
                    continue
                seen[nxt] = seen[(x, y)] + 1
                if nxt in other:
                    total = seen[nxt] + other[nxt]
                    best = total if best is None else min(best, total)
                q.append(nxt)
        turn ^= 1
    return best
```

**The bug worth flagging.** Returning on first contact is wrong — the first
square both searches touch need not minimize the *sum*. The loop finishes the
current layer and takes the minimum across it. This is the single most common
error in bidirectional search and worth a callout on the page.

</details>

---

### Page 3 — Windows and Search Spaces

#### Adjacent Machines Within a Power Budget

Each machine in a rack has a base draw and a boosted draw. Running a block of
k adjacent machines costs the sum of their base draws plus the sum of their
boosted draws multiplied by k. Given a ceiling on total draw, find the
largest block that can run.

<details>
<summary>Show solution</summary>

**Approach.** The cost of a block grows with its width, so the set of
feasible widths is a prefix — which makes the width binary-searchable.
Checking a fixed width is one sliding-window pass.

```python
def max_adjacent(power, boosted, power_max):
    n = len(power)

    def fits(k):
        p, b = sum(power[:k]), sum(boosted[:k])
        if p + b * k <= power_max:
            return True
        for i in range(k, n):
            p += power[i] - power[i - k]
            b += boosted[i] - boosted[i - k]
            if p + b * k <= power_max:
                return True
        return False

    lo, hi, best = 1, n, 0
    while lo <= hi:
        mid = (lo + hi) // 2
        if fits(mid):
            best, lo = mid, mid + 1
        else:
            hi = mid - 1
    return best
```

Time O(n log n), space O(1).

**The precondition.** Binary search on the answer requires monotonicity, and
here that requires non-negative draws. A machine that fed power back into the
rack would break the assumption — worth saying out loud, since stating the
precondition is a large part of what the question tests. Back-reference
Chapter 27 page 4.

</details>

#### Longest Holiday Streak

An employee's calendar is a sequence of work days and holidays, and they have
a budget of days they may convert from work to holiday. Find the longest
unbroken run of holidays they can arrange.

<details>
<summary>Show solution</summary>

**Approach.** Sliding window with a violation counter. Expand right freely;
contract left whenever conversions exceed the budget.

```python
def longest_holiday(days, budget):
    left = used = best = 0
    for right, day in enumerate(days):
        if day == 'w':
            used += 1
        while used > budget:
            if days[left] == 'w':
                used -= 1
            left += 1
        best = max(best, right - left + 1)
    return best
```

Time O(n), space O(1).

**Why the window never shrinks past the answer.** The loop only contracts
enough to restore validity, so the widest valid window is always seen. This
invariant is the whole pattern — state it explicitly. Back-reference
Chapter 27 page 3.

</details>

---

### Page 4 — Finding the Invariant

#### Expanding Binary String

Start with a binary string. On each pass, every `0` becomes `00` and every
`1` becomes `10`. After k passes, report the character at index i. Both k and
i may be large enough that building the string is impossible.

<details>
<summary>Show solution</summary>

**Approach.** Every character expands to exactly 2ᵏ characters, so index i
comes from original character `i // 2**k` at offset `i % 2**k`. A `0` expands
to all zeros forever. A `1` expands to a single `1` followed by zeros — since
`1 → 10`, then `10 → 1000`, then `1000 → 10000000`. So the answer is `1` only
at offset zero of an original `1`.

```python
def value_at(s, k, i):
    block = 1 << k
    if i % block:
        return 0
    return int(s[i // block])
```

Time O(1), space O(1).

**Why this belongs in the handbook.** It's the clearest illustration in the
track that a problem stated as a simulation may not require simulating
anything. The productive first move is asking what stays true after every
pass, not writing the loop. Candidates who reach for the string almost always
run out of time; the invariant fits on one line.

</details>

#### Counting Off Around a Circle

Entities are arranged in a circle. Repeatedly count off a fixed number of
positions from the last removal and remove whoever you land on, continuing
until one remains. Return the survivor.

<details>
<summary>Show solution</summary>

**Approach.** The direct simulation is honest and worth writing first —
interviewers ask for it. Then the recurrence: with the survivor's position
known for a circle of size m − 1, shifting by the step size and taking it mod
m gives the position for size m.

```python
def survivor_simulated(entities, step):
    items, idx = list(entities), 0
    while len(items) > 1:
        idx = (idx + step - 1) % len(items)
        items.pop(idx)
    return items[0]

def survivor(entities, step):
    pos = 0
    for size in range(2, len(entities) + 1):
        pos = (pos + step) % size
    return entities[pos]
```

Simulation is O(m²) because list removal is linear; the recurrence is O(m)
time and O(1) space.

**Follow-up.** The recurrence returns a position, not an identity — the two
functions agree only because the second indexes back into the original
sequence. Losing track of that distinction is the usual bug.

</details>

---

### Page 5 — Designing Under Constraints

#### Locker Assignment

A pickup location has lockers in several sizes. When a package arrives,
assign the smallest available locker that fits it and issue a retrieval code.
When a customer presents a code, release the locker back into circulation.

<details>
<summary>Show solution</summary>

**Approach.** This is a design question wearing a data-structures costume.
Two operations, two structures: a min-heap of free locker IDs per size class
so assignment is deterministic and cheap, and a map from code to locker for
O(1) retrieval.

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

**Follow-up.** Discussing what the code omits is most of the value here:
expiry and reclamation of abandoned packages, concurrent deposits racing for
the same locker, and whether "smallest that fits" is even the right policy
when it strands large lockers. Naming the omissions unprompted is the signal.

</details>

---

## Revised Track Totals

| Chapter | Pages |
|---|---|
| 23 · Complexity & Performance Analysis | 5 (+1 examples) |
| 24 · Core Data Structures | 7 (+1 examples) |
| 25 · Bit Manipulation | 5 (+1 examples) |
| 26 · Trees & Graph Traversal | 6 (+1 examples) |
| 27 · Algorithmic Patterns | 7 (+1 examples) |
| 28 · Dynamic Programming | 5 (+1 examples) |
| 29 · Interview Patterns: Amazon | 5 |

*Track VII total: 41 pages. Handbook total: ~140 pages.*

---

## Open Items

- [ ] Confirm `.md` vs `.mdx` for pages containing `<details>`, and whether
      the frontmatter schema needs a `hasExamples` boolean for the future
      database migration
- [ ] Decide whether Chapter 29 is public or lives in a private branch —
      a company-specific chapter changes how the handbook reads as a whole,
      and reported questions decay within a year or two
- [ ] If public: decide on a review cadence, or add a dated "reported as of"
      line to the chapter intro so staleness is visible rather than implied
- [ ] Decide whether other companies get parallel chapters, or whether 28
      stays a one-off (affects whether it should be a chapter or its own Track)
- [ ] Verify every solution against your own test cases before publishing —
      these are written from reported problem descriptions, and reported
      descriptions are frequently incomplete about edge cases
