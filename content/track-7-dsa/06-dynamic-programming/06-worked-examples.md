---
title: "Worked Examples"
description: "One problem escalated three times — counting ways, then optimising, then adding a circular constraint — followed by edit distance end to end."
track: 7
chapter: 6
page: 6
readMinutes: 5
---

The first three problems are deliberately the same problem three times, each version adding
one thing. That structure is the point: most of the difficulty in dynamic programming is
not in any single recurrence but in seeing how a small change to a problem changes the
state, and an escalating sequence makes that visible in a way three unrelated problems
can't.

## Counting the Ways Up

:::problem
A staircase has `n` steps. Each move climbs either one step or two. Return
how many distinct sequences of moves reach the top.

```text
Input:  n = 4
Output: 5
Explanation: The five sequences are 1+1+1+1, 1+1+2, 1+2+1,
             2+1+1 and 2+2. Order matters: 1+2+1 and 2+1+1 are
             distinct.

Input:  n = 1  ->  1        Input:  n = 3  ->  3
Input:  n = 2  ->  2        Input:  n = 5  ->  8
```

**Constraints.** `1 <= n <= 10**5`. There is exactly one way to climb zero
steps — do nothing — which is the base case that makes the recurrence work.
:::

<details>
<summary>Show solution</summary>

**Approach.** The last move was either a single step or a double one, and those two cases
are disjoint and exhaustive. So the number of ways to reach step *i* is the number of ways
to reach *i − 1* plus the number to reach *i − 2*.

State: the step number. Base cases: one way to be at the bottom (do nothing), one way to
reach step 1. Transition: add the two below.

```python
def count_ways(n):
    a, b = 1, 1                                  # ways to reach step 0 and step 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b
```

Time O(n), space O(1) — the transition reads only two states back, so only two are kept.
That's the space compression from the previous page, applied to the smallest possible table.

**Follow-up.** This is the Fibonacci recurrence, and noticing that is useful only up to a
point — the transferable part is *why* it's additive: the last decision partitions the
solution space into disjoint cases. Nearly every counting DP is that sentence. If moves of
three steps were also allowed, the recurrence would read three back instead of two, and
nothing else would change.

</details>

## Choosing Non-Adjacent Values

:::problem
A row of houses each holds some amount. You may take from any subset of
houses, but never from two adjacent ones. Return the maximum total.

```text
Input:  values = [2, 7, 9, 3, 1]
Output: 12
Explanation: Take index 0, 2 and 4: 2 + 9 + 1 = 12. Taking the
             two largest (7 and 9) is illegal — they are
             adjacent — and 7 + 3 = 10 is worse than 12
             anyway.

Input:  values = [5, 1, 1, 5]
Output: 10
Explanation: Index 0 and 3, which are not adjacent in a
             straight row.
```

**Constraints.** `1 <= len(values) <= 10**5`; amounts are non-negative.
:::

<details>
<summary>Show solution</summary>

**Approach.** Same shape, different combining operation: the previous problem summed the
cases, this one takes their maximum, because we want the best outcome rather than the count
of outcomes.

At each house there are two choices. Take it — which forbids the previous house, so add its
value to the best through house *i − 2*. Skip it — so carry forward the best through *i − 1*.
The answer is the better of the two.

```python
def max_take(values):
    take, skip = 0, 0                            # best if we take / skip the current house
    for v in values:
        take, skip = skip + v, max(take, skip)
    return max(take, skip)
```

Time O(n), space O(1).

**Follow-up.** The two-variable form is worth reading carefully, because it's where the
"what exactly does this variable mean" discipline from the memoization page pays off. `take`
is *the best total for a prefix ending in a taken house*; `skip` is *the best where the last
house was not taken*. Both are updated from the previous iteration's values simultaneously —
the tuple assignment is doing real work, and rewriting it as two sequential statements
introduces a bug where the second uses the already-updated first.

</details>

## The Same Problem, Made Circular

:::problem
Now the houses form a ring: the first and last are adjacent and cannot both
be taken. Everything else is unchanged.

```text
Input:  values = [5, 1, 1, 5]
Output: 6
Explanation: The straight-row answer took index 0 and 3, which
             are now neighbours. The best legal choice is one
             5 plus a non-adjacent 1 — for instance index 0
             and 2.

Input:  values = [2, 3, 2]     ->  3    straight row gives 4
Input:  values = [1, 2, 3, 1]  ->  4    index 0 and 2, unchanged
Input:  values = [7]           ->  7    a lone house is not its
                                        own neighbour
```

**Constraints.** `1 <= len(values) <= 10**5`; amounts are non-negative.
:::

<details>
<summary>Show solution</summary>

**Approach.** The instinct is to patch the recurrence with a special case for the wrap-around,
and that path leads to a state carrying "did I take the first house", which works and is
awkward.

The better move is to remove the constraint by case-splitting on it. Either the first house
is taken or it isn't. If it is, the last house cannot be, so the candidates are houses
0 through n − 2. If it isn't, the candidates are houses 1 through n − 1. Neither range wraps,
so each is the linear problem already solved, and the answer is the better of the two.

```python
def max_take_circular(values):
    if len(values) == 1:
        return values[0]
    return max(max_take(values[:-1]),             # first house allowed, last excluded
               max_take(values[1:]))              # last house allowed, first excluded
```

Time O(n), space O(1) beyond the two slices.

**The single-house guard matters.** With one house both slices are empty and the function
returns 0 rather than the house's value — the same class of boundary omission as the `x > 0`
guard in Chapter 3.

**Follow-up.** The general technique is worth naming: when a constraint couples the two ends
of a sequence, splitting into cases on that constraint usually beats adding a dimension to
the state. It costs a constant factor — two runs instead of one — and keeps the recurrence
you already trust. That trade is almost always right, and it recurs in circular-array
problems well beyond this one.

</details>

## Edit Distance

:::problem
Return the minimum number of single-character insertions, deletions and
substitutions that turn string `a` into string `b`.

```text
Input:  a = "kitten", b = "sitting"
Output: 3
Explanation: kitten -> sitten (substitute k with s), sitten ->
             sittin (substitute e with i), sittin -> sitting
             (insert g). No sequence of two edits suffices.

Input:  a = "flaw",  b = "lawn"  ->  2   (delete f, insert n)
Input:  a = "abc",   b = "abc"   ->  0
Input:  a = "",      b = "xyz"   ->  3   (three insertions)
```

**Constraints.** `0 <= len(a), len(b) <= 5000`. All three operations cost 1.
:::

<details>
<summary>Show solution</summary>

**Approach.** The state is a pair of prefix lengths: `dp[i][j]` is the distance between the
first *i* characters of `a` and the first *j* of `b`. Think about the *last* operation
performed, which gives four cases — three operations plus the free case where the characters
already match.

Sizing the table one larger than each string, so the empty prefix has a real row and column,
removes every boundary check from the inner loop. The base cases then say what they mean:
turning a prefix into the empty string costs one deletion per character.

Because the transition only reads the current row and the one above, the table compresses to
two rows.

```python
def edit_distance(a, b):
    prev = list(range(len(b) + 1))               # distance from empty a to each prefix of b
    for i, ca in enumerate(a, start=1):
        curr = [i] + [0] * len(b)                # distance from a[:i] to empty b
        for j, cb in enumerate(b, start=1):
            if ca == cb:
                curr[j] = prev[j - 1]            # free
            else:
                curr[j] = 1 + min(prev[j],       # delete from a
                                  curr[j - 1],   # insert into b
                                  prev[j - 1])   # substitute
        prev = curr
    return prev[len(b)]
```

Time O(n · m), space O(m).

**Follow-up.** Recovering the actual edit script — not just its length — is where the space
optimisation bites, because the discarded rows are exactly the history a backward walk needs.
The resolutions are to keep the full table when you need the script, or to use Hirschberg's
divide-and-conquer variant, which recovers the alignment in linear space at the cost of
roughly doubling the time. Real diff tools use neither directly; they apply the same
recurrence over *lines* rather than characters, after stripping common prefixes and suffixes
that cost nothing to match.

</details>

## What to take away

- Counting DPs add the disjoint cases; optimising DPs take the max or min of them. The state and transition are otherwise identical.
- Name precisely what each variable means. In the two-variable forms above, "best ending in a taken house" versus "best where the last was skipped" is the entire correctness argument.
- Simultaneous update matters — rewriting a tuple assignment as two statements silently uses a value from the wrong iteration.
- When a constraint couples the ends of a sequence, case-split on it and reuse the linear solution rather than adding a state dimension.
- Space compression is nearly free and often the difference between feasible and not — but it discards the history needed to reconstruct the answer itself.
