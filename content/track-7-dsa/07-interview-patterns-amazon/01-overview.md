---
title: "Reading the Story for the Shape"
description: "Interview problems arrive wrapped in a business scenario; the skill is stripping the wrapper. The framing page for a chapter about the mapping, not the list."
track: 7
chapter: 7
page: 1
readMinutes: 4
---

:::info[Prerequisites]
All of **Algorithmic Patterns**, and **Trees & Graph Traversal**. This chapter contains no
new techniques — every problem in it is an instance of something taught earlier, and the
value is entirely in the mapping.
:::

:::warning[Reported as of August 2026]
The problems here are described from public candidate reports and restated in original
prose. Reported questions go stale: hiring bars move, question banks rotate, and a list
that was accurate two years ago is mostly historical now. **The pattern outlives the
question**, which is why each page below spends more space on the mapping than on the
problem.

If you're reading this well after the date above, treat the problems as illustrations of
the patterns and ignore the provenance entirely. That reading doesn't decay.
:::

## Why a company-specific chapter at all

The honest answer is that it's a different *kind* of page from the rest of the handbook, and
it's worth being explicit about the difference.

Everywhere else, this handbook explains a technique and then shows where it applies. Here
the direction is reversed: the problem comes first, wrapped in a scenario, and the work is
recovering the technique underneath it. That reversal is the actual skill being practised,
and problems drawn from a real interview loop are a better source of it than invented ones,
because they were written by people deliberately obscuring the shape.

What this chapter is *not* is a list to memorise. Anyone can find a list. A list also
decays, gets outdated, and teaches the least transferable thing available — that you have
seen a particular problem before. The mapping doesn't decay: a currency-conversion question
is a weighted graph traversal whether or not it's still being asked.

## The stripping procedure

Given a problem stated as a scenario, four questions in order:

**1. What are the objects, and what relates them?** Machines, days, currencies, packages,
lockers. If two objects can be connected by a stated relationship, you may have a graph —
and edges frequently arrive disguised as rates, dependencies, adjacency, or conversions.

**2. What is being asked for — a maximum, a count, a reachability, an ordering, or a
design?** Each points at a different section of this track. "The largest block such that…"
is a window or a binary search. "Can these be ordered so that…" is a topological sort. "How
many ways" is dynamic programming. "Support these operations efficiently" is a data
structure composition.

**3. What are the input bounds?** They constrain the answer's complexity before you've
thought about the approach, per Chapter 1's *Constraints as a Signal*. An unbounded board
rules out precomputation. A bound of 20 invites subset enumeration.

**4. What stays true no matter what?** The invariant. Some problems stated as simulations
require no simulation at all, and the fourth page of this chapter is entirely about that
case.

## A worked stripping

Take a problem stated like this:

> Each machine in a rack draws some baseline power, and an additional amount when it's
> under load. Running a contiguous block of k machines costs the sum of their baselines
> plus k times the sum of their load draws. Given a ceiling on total draw, find the largest
> block that can run.

Applying the four questions:

**Objects and relations.** Machines in a fixed order, with two numbers each. Nothing
connects one machine to another except position — so this isn't a graph. Position mattering
is the tell that a contiguous range is involved.

**What's asked.** "The largest k such that some block of width k fits." A maximum over a
single parameter, with a yes/no feasibility question underneath it.

**Bounds.** Large enough that checking every block of every width — O(n²) blocks, each
needing a sum — is out.

**What stays true.** Widening a block can only increase its cost, since all draws are
non-negative. So the set of feasible widths is a prefix: if width 8 works, every width below
8 works. **That is monotonicity**, which is the precondition for binary search on the
answer.

The approach falls out: binary search the width, and check a fixed width with one sliding
window pass. O(n log n). The full solution is on this chapter's third page — but the
derivation above is the part worth practising, and it never mentions a company.

:::tip[Key insight]
The scenario is a costume. Machines, calendars, currencies and lockers are interchangeable —
swapping them changes nothing about the solution. What determines the approach is the
structure: whether position matters, whether relationships connect objects, what's being
optimised, and what stays invariant. Read for those four and the story stops mattering.
:::

## What's in here

| Page | The disguise | The pattern underneath |
| --- | --- | --- |
| Graph Problems in Disguise | Exchange rates, build dependencies, pieces on a board | Weighted BFS, topological sort, bidirectional search |
| Windows and Search Spaces | Power budgets, calendar planning | Binary search on the answer, sliding window |
| Finding the Invariant | String expansion, elimination around a circle | Closed forms and recurrences replacing simulation |
| Designing Under Constraints | A bank of parcel lockers | Composing a heap and a hash map |

Each problem is presented with a collapsed solution, a complexity statement, and a
follow-up — because the follow-up is the part most resources omit and it's where most of
the learning is.

## References

- [Cormen, Leiserson, Rivest & Stein — *Introduction to Algorithms*, 4th ed.](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/)
- [Amazon — Interview preparation](https://www.amazon.jobs/content/en/how-we-hire/interviewing-at-amazon) — the employer's own published description of its process
