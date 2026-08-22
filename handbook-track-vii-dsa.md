# Track VII — Data Structures & Algorithms

**Status:** Draft outline (not yet written)
**Slots into:** `handbook-structure.md` after Part VI, chapters 23–27
**Depth:** Each page = 1–5 min read; diagrams and code snippets encouraged
**Audience:** General public / general reference (no personal case studies)
**Exercises/quizzes:** Not included yet — planned for a later phase

---

## Scope note

This track covers data structures and algorithms as engineering fundamentals,
not as interview preparation. The distinction matters for voice: pages should
explain when a structure earns its place in real code and what it costs, not
"how to pass a screen." Canonical problems (Number of Islands, LRU Cache,
Course Schedule) may be referenced by name as illustrations of a pattern —
but write the illustration in your own framing rather than reproducing any
problem statement.

This is the only track in the handbook where the material is largely
language-agnostic theory. Prefer Python for snippets, since it reads closest
to pseudocode, with occasional TypeScript where a typed signature clarifies
the structure.

---

## Chapter Outline

**23 · Complexity & Performance Analysis**
Big-O as a decision tool rather than a grading rubric — how to read a
constraint and know what will fit.
*4 pages*

**24 · Core Data Structures**
Arrays, hash maps, stacks, queues, heaps, and union-find — what each one is
actually good at and what it quietly costs you.
*6 pages*

**25 · Bit Manipulation**
What an integer actually is in memory, the handful of operators that act on
it directly, and the cases where that view is the simplest one available.
*5 pages*

**26 · Trees & Graph Traversal**
BFS, DFS, and the recursive shapes that show up once you stop seeing trees
and graphs as different things.
*5 pages*

**27 · Algorithmic Patterns**
Two pointers, sliding windows, binary search on the answer, monotonic stacks,
and prefix sums — the handful of moves that cover most problems.
*6 pages*

**28 · Dynamic Programming**
Recognizing overlapping subproblems, and the mechanical path from a recursive
definition to a tabulated solution.
*4 pages*

*Track total: 30 pages*

---

## Page-Level Breakdown

### 23 · Complexity & Performance Analysis

| # | Page | Scope |
|---|------|-------|
| 1 | Why Asymptotic Analysis | What Big-O measures and what it deliberately ignores. Analogy before mechanism: two routes to the same destination, one that scales with traffic and one that doesn't. |
| 2 | Reading Time & Space Complexity | Walking through loops, recursion, and nested structures. Common miscounts — the hidden cost of string concatenation, slicing, and `in` on a list. |
| 3 | Constraints as a Signal | Working backwards from input size to acceptable complexity. Roughly what n allows O(n²), O(n log n), O(2ⁿ). *Key insight callout.* |
| 4 | Amortized & Average Cost | Why a dynamic array append is O(1) despite occasional resizes; why hash lookups are O(1) "usually." Where the distinction bites in production. |

**Prerequisites for this chapter:** basic familiarity with loops and function
calls. No prior CS coursework assumed.

---

### 24 · Core Data Structures

| # | Page | Scope |
|---|------|-------|
| 1 | Arrays & Dynamic Arrays | Contiguous memory, index math, cache locality, the cost of insertion in the middle. |
| 2 | Hash Maps & Sets | Hashing, collisions, load factor. Why iteration order is a trap. The single most-reached-for structure and why. |
| 3 | Stacks & Queues | LIFO/FIFO as a modeling choice. Deques. Where these appear implicitly (call stack, BFS frontier, undo history). |
| 4 | Heaps & Priority Queues | Partial ordering as the point. Top-k, streaming maxima, scheduling. Heapify vs repeated insertion. |
| 5 | Linked Structures | Singly and doubly linked lists, and the narrow set of cases where they beat arrays. Composing with a hash map to build an LRU cache. |
| 6 | Union-Find | Disjoint sets, path compression, union by rank. Connectivity under incremental merges — the structure most engineers never learn and occasionally badly need. |

**Failure-mode section for this chapter:** unbounded hash map growth as a
memory leak; mutable keys; relying on dict ordering across language versions.

---

### 25 · Bit Manipulation

| # | Page | Scope |
|---|------|-------|
| 1 | How Integers Are Stored | Binary representation, fixed width, two's complement. Why negative numbers look the way they do, and why the highest bit is special. Analogy before mechanism: an odometer that wraps. |
| 2 | The Six Operators | AND, OR, XOR, NOT, and the two shifts — introduced by what each is *for* rather than by truth table. AND masks, OR sets, XOR toggles and cancels, shifts scale by powers of two. |
| 3 | The Idioms Worth Memorizing | Test, set, clear, and toggle bit *i*. Isolating the lowest set bit with `x & -x`; clearing it with `x & (x - 1)`. Power-of-two checks, population count. *Key insight callout: `x & (x - 1)` works because subtracting one flips the trailing zeros — everything else follows from that one observation.* |
| 4 | Bitmasks as Sets | An integer as a subset of up to 64 elements. Membership, union, intersection, difference. Enumerating all subsets, and iterating the submasks of a mask. This page is the prerequisite for state compression in Chapter 28. |
| 5 | Where Bits Show Up in Real Systems | Permission and feature flags, compact storage of dense boolean data, Bloom filter internals, hash mixing. Also where they *don't* belong — readability usually beats a cycle. |

**Prerequisites:** Chapter 23 page 2 (reading complexity). No prior exposure to
binary assumed.

**Failure-mode section for this chapter:** signed right shift versus unsigned
(`>>` vs `>>>` in Java, and Python having neither); Python integers being
arbitrary-precision, so masking behavior differs from C or Java and `~x`
returns a negative number rather than wrapping; operator precedence — `&` and
`|` bind *looser* than `==` in C-family languages, so comparisons need parens;
and shift amounts at or beyond the type width being undefined behavior in C.

**A note on voice for this chapter.** Bit manipulation attracts trick-collecting
more than any other topic in the track, and a memorized trick with no model
behind it is worse than not knowing it. Every idiom on page 3 should be
derived, not asserted. If a page can't explain *why* an identity holds in two
sentences, the idiom doesn't belong on it.

---

### 26 · Trees & Graph Traversal

| # | Page | Scope |
|---|------|-------|
| 1 | Trees as Constrained Graphs | Reframing: a tree is a graph with no cycles and one path between any two nodes. Sets up the rest of the chapter. *Key insight callout.* |
| 2 | Depth-First Search | Recursive and iterative forms. Pre/in/post-order as "when do I do the work." |
| 3 | Breadth-First Search | Level-order, shortest path in unweighted graphs, multi-source BFS. |
| 4 | Graph Representation | Adjacency list vs matrix vs edge list, and how representation choice changes complexity. Building a graph from non-graph-looking input. |
| 5 | Ordering & Cycles | Topological sort, cycle detection, and the dependency-resolution problems these model (build systems, task schedulers, migrations). |

**Prerequisites:** Chapter 24, pages 2–4 (hash maps, stacks, queues).

---

### 27 · Algorithmic Patterns

| # | Page | Scope |
|---|------|-------|
| 1 | Recognizing Patterns | How to read a problem for its shape rather than its story. Framing page for the chapter. |
| 2 | Two Pointers | Opposite-end and same-direction variants. Sorted-input signal. |
| 3 | Sliding Window | Fixed and variable width. The expand/contract invariant, stated explicitly. |
| 4 | Binary Search Beyond Sorted Arrays | Searching the answer space. Predicate monotonicity as the real precondition. |
| 5 | Monotonic Stacks | Next-greater-element family. Why the stack stays sorted and what that buys. |
| 6 | Prefix Sums & Difference Arrays | Range queries in O(1); range updates in O(1). The complementary pair, and when each applies. |

**Failure-mode section:** off-by-one in window boundaries; integer overflow in
prefix sums; assuming monotonicity that isn't there.

---

### 28 · Dynamic Programming

| # | Page | Scope |
|---|------|-------|
| 1 | Overlapping Subproblems | The one property that makes DP applicable, and how to spot it. Analogy before mechanism. |
| 2 | Memoization | Top-down. Recursion plus a cache — the least intimidating entry point. |
| 3 | Tabulation | Bottom-up, state definition, transition, base case. The mechanical translation from a recurrence. |
| 4 | State Compression | Reducing 2D to 1D when transitions only look one row back. Where DP stops being worth it. |

**Prerequisites:** Chapter 23 (complexity), Chapter 26 page 2 (recursion via
DFS). Page 4 additionally assumes Chapter 25 page 4 (bitmasks as sets).

---

## Frontmatter Schema

Matches the existing handbook schema exactly — one file per page.

```yaml
---
title: "Binary Search Beyond Sorted Arrays"
part: "VII"
chapter: 26
page: 4
readMinutes: 4
---
```

Filename convention follows the rest of the handbook:
`track-vii/26-algorithmic-patterns/04-binary-search-beyond-sorted-arrays.md`

---

## Authoring Conventions for This Track

Consistent with the chapter structure used elsewhere in the handbook:

1. **Prerequisites first.** Open each chapter by naming what the reader
   should already have. This track has more internal dependency than any
   other, so be explicit.
2. **Analogy before mechanism.** Introduce the intuition before the
   implementation. Especially load-bearing for union-find, monotonic stacks,
   and DP.
3. **Key insight callouts.** One per page maximum. Reserve them for the idea
   that makes the rest click.
4. **Failure modes.** Chapter-level, not page-level. Frame around what
   actually breaks in production — memory growth, silent overflow, quadratic
   behavior discovered under load — not around wrong answers on a quiz.
5. **Code snippets.** Under 20 lines. Illustrate the structure, not a
   complete solution. Every snippet should survive being read on a phone.
6. **No leaderboard framing.** No "commonly asked," no company names, no
   difficulty ratings.

---

## Open Items

- [ ] Confirm this lands as Track VII rather than being folded into an
      existing track — it's the first non-stack-specific track in the handbook
- [ ] Decide whether sorting algorithms get a page (leaning no: rarely
      hand-implemented, well covered elsewhere)
- [ ] Decide whether to add a chapter on concurrency-adjacent structures
      (thread-safe queues, lock-free basics) or leave to Track VI
- [ ] Update `handbook-structure.md` with chapters 23–27 and revised total
      page count (~99 → ~124)
- [ ] Update `CLAUDE.md` if the track introduces any new frontmatter or
      directory conventions
