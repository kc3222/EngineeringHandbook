---
title: "Finding the Invariant"
description: "An expanding binary string and an elimination around a circle — two problems stated as simulations that require no simulation at all."
track: 7
chapter: 29
page: 4
readMinutes: 5
---

Both problems below describe a process unfolding step by step, and both invite you to write
the loop that carries it out. In both cases the loop is either impossible or unnecessary,
and the productive first move is question four of the stripping procedure: **what stays true
after every step?**

## Expanding Binary String

:::problem
Start with a binary string. On each pass, every `0` becomes `00` and every
`1` becomes `10`. After `k` passes, return the character at index `i`.

```text
Input:  s = "101"
        k = 0  ->  "101"
        k = 1  ->  "100010"
        k = 2  ->  "100000001000"

        value_at(s, k=2, i=0)  ->  1
        value_at(s, k=2, i=4)  ->  0
        value_at(s, k=2, i=8)  ->  1
        value_at(s, k=3, i=8)  ->  0
Explanation: After 2 passes each original character owns a
             block of 4. Index 8 falls at offset 0 of block 2,
             whose original character is "1", so the answer is
             1. Index 4 is offset 0 of block 1, original "0",
             so 0.
```

**Constraints.** `k` and `i` may be large enough that `2**k` exceeds any
plausible memory — the string cannot be built.
:::

<details>
<summary>Show solution</summary>

**Approach.** Two invariants do all the work.

First, **every character expands to exactly 2ᵏ characters after k passes**, regardless of what
it is — both rules produce two characters from one. So the string has a rigid block
structure: index i falls inside the block belonging to original character `i // 2**k`, at
offset `i % 2**k` within it.

Second, **what each character expands to is fixed**. A `0` becomes `00`, which becomes
`0000`, and so on — all zeros forever. A `1` becomes `10`, then `1000`, then
`10000000`: a single `1` followed by zeros. So within any block, the only position that can
hold a `1` is offset zero, and only when the original character was a `1`.

That's the entire problem.

```python
def value_at(s, k, i):
    block = 1 << k
    if i % block:
        return 0
    return int(s[i // block])
```

Time O(1), space O(1).

**Why this belongs in the handbook.** It's the clearest illustration in the track that a
problem stated as a simulation may not require simulating anything. The productive first
move is asking what stays true after every pass, not writing the loop — and the two
questions feel almost identical when you're reading the statement for the first time, which
is exactly why it's worth practising the distinction deliberately.

The practical tell is in the bounds. When k can be large enough that 2ᵏ overflows any
plausible memory, the problem is announcing that the string cannot be built, and therefore
that it doesn't need to be.

**Follow-up.** Proving the "one, then zeros" claim rather than observing it takes one line of
induction: if a `1` expands to `1` followed by 2ᵏ − 1 zeros, then after one more pass it
becomes `10` followed by 2(2ᵏ − 1) zeros, which is `1` followed by 2ᵏ⁺¹ − 1 zeros. Being able
to give that argument is the difference between having spotted a pattern in the first three
passes and knowing it holds for all of them.

</details>

## Counting Off Around a Circle

:::problem
Entities are arranged in a circle. Counting starts at the first entity;
repeatedly count off `step` positions and remove whoever you land on,
resuming the count from the next surviving entity. Return the last one left.

```text
Input:  entities = [1, 2, 3, 4, 5], step = 2
Output: 3
Explanation: Removal order is 2, 4, 1, 5, leaving 3. After
             removing 4 the count resumes at 5, wraps to 1,
             and removes it.

Input:  entities = [1, 2, 3, 4, 5], step = 3
Output: 4
Explanation: Removal order is 3, 1, 5, 2.
```

**Constraints.** `1 <= len(entities) <= 10**6`; `step >= 1` and may exceed
the number of entities remaining, in which case the count wraps.
:::

<details>
<summary>Show solution</summary>

**Approach.** The direct simulation is honest and worth writing first. But it's O(m²),
because removing from the middle of a list shifts everything after it — the array cost from
Chapter 24.

The invariant that removes the simulation: **after one removal, what remains is the same
problem with one fewer participant, viewed from a shifted starting position.** If you know
the survivor's position for a circle of size m − 1, then adding one more participant shifts
that answer by the step size, modulo m.

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

Simulation is O(m²) because list removal is linear; the recurrence is O(m) time and O(1)
space.

**Follow-up.** The recurrence returns a *position*, not an identity — the two functions agree
only because the second indexes back into the original sequence at the end. Losing track of
that distinction is the usual bug, and it produces answers that are correct for
`range(n)`-style inputs and wrong for everything else, which is the worst possible test-case
behaviour.

Worth noting the middle option too. Replacing the list with a circular doubly linked list
makes the simulation O(m) as well, since removal becomes O(1) once you're standing at the
node — but each step still walks `step` links, so it's O(m · step) overall unless the step
is small. The recurrence beats both and is four lines.

</details>

## The shared move

Both problems reward the same instinct, and it's worth naming because it doesn't appear
anywhere else in this track:

**Simulate a few steps by hand, then look for what didn't change.** In the first problem, the
block size and the "one then zeros" shape are constant across passes. In the second, the
*structure* of the remaining problem is constant — only its size and orientation shift.

The counterweight is that this instinct is expensive when it fails. Searching for a closed
form that doesn't exist burns the time you needed for the loop. The bounds are the tiebreaker,
same as always: if the simulation fits comfortably inside the stated limits, write the
simulation. It's when the bounds make it impossible that the problem is telling you an
invariant exists.

## What to take away

- A problem stated as a process is not necessarily a problem that requires running the process.
- Simulate two or three steps by hand and look for the quantity that doesn't change — block size, structure, relative position.
- Input bounds are the signal. When they make simulation impossible, an invariant is being pointed at.
- Write the simulation first when it fits. It's a correct reference implementation to check the clever version against, which is worth having regardless.
- A recurrence over positions returns a position. Map it back to the original data explicitly, or the result is right only by coincidence.
