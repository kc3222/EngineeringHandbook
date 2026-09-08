---
title: "Scheduling Shared Capacity"
description: "Dock doors at a fulfilment centre — a booking problem where the win comes from representing the schedule as its boundaries, and where an interval convention decides correctness before any structure does."
track: 7
chapter: 7
page: 6
readMinutes: 5
---

The locker bank on the previous page was a question about **composition** — two access patterns,
a structure for each. This one is a design question of a different kind. There is only one
operation, and the structure it needs is nearly trivial once you have made the decision the
problem is actually testing: what a schedule *is*. Choose to represent it as a timeline and the
solution is slow and bounded. Choose to represent it as the handful of instants where something
changes and it is neither.

## Dock Door Booking

:::problem
A fulfilment centre has a fixed number of outbound dock doors, all interchangeable.
`reserve(start, end)` requests a dock for the half-open interval `[start, end)` — a
truck occupying a door from `start` up to but not including `end`.

The request is accepted, returning `True`, only if every booking already accepted
plus this one can be honoured: at no instant may more trucks be docked than there
are doors. Otherwise it returns `False` and the schedule is left exactly as it
was — a rejected request must not consume anything.

A request never names a door. The site only has to guarantee that *some* assignment
of trucks to doors works.

```text
DockSchedule(doors=2)

reserve(9, 11)   -> True    one truck on the yard
reserve(10, 12)  -> True    two overlap during [10, 11)
reserve(10, 11)  -> False   would be three trucks at 10:00
reserve(11, 13)  -> True    the [9, 11) truck has already left
reserve(12, 14)  -> True    still never more than two at once

Explanation: the third request is refused even though it is
             the shortest one asked for and the site has two
             doors — at 10:00 both are already taken, and a
             booking is all-or-nothing. The fourth is
             accepted at the very instant the first truck
             departs: intervals are half-open, so [9, 11)
             and [11, 13) do not overlap.
```

**Constraints.** Times are integers on a shared clock and a request with `start >= end` is rejected. The horizon is not bounded in advance and bookings may be far apart, so a fixed-size timeline is not available. The door count is set at construction. State your assumptions about cancellation and about what a "day" means.
:::

<details>
<summary>Show solution</summary>

**Approach.** The tempting representation is a timeline: an array of counts, one per minute,
incremented across the requested range. It is worth saying out loud why it loses, because the
reason is the whole problem.

It ties the cost of a booking to the booking's *length* rather than to how many bookings exist.
A two-week reservation would be twenty thousand increments and would tell you nothing that a
two-hour one doesn't. And it needs a horizon fixed in advance, which the problem explicitly
refuses to give.

Now notice what a schedule actually contains. Between any two consecutive events the number of
docked trucks is **constant** — nothing can change it, because nothing happens. All the
information lives at the instants where a truck arrives or departs, and there are at most two of
those per booking however long it runs. So store only those:

> `delta[t]` — the net change in docked trucks at instant `t`. A booking is `+1` at its start
> and `−1` at its end, and nothing in between.

That is the difference array from Chapter 5, with the array swapped for a map because time here
is sparse rather than dense. Recovering the actual truck count at any instant is the prefix sum:
sweep the boundaries in time order, accumulate, and the running total between two boundaries is
the number of trucks docked over that whole stretch. The peak of that running total is the
busiest the site ever gets.

```python
class DockSchedule:
    def __init__(self, doors):
        self.doors = doors
        self.delta = {}                   # instant -> net change in trucks

    def _bump(self, t, by):
        n = self.delta.get(t, 0) + by
        if n:
            self.delta[t] = n
        else:
            self.delta.pop(t, None)       # no longer a boundary at all

    def busiest(self):
        running = peak = 0
        for t in sorted(self.delta):      # boundaries in time order
            running += self.delta[t]      # prefix sum = trucks docked now
            peak = max(peak, running)
        return peak

    def reserve(self, start, end):
        if start >= end:
            return False
        self._bump(start, 1)              # provisionally book it...
        self._bump(end, -1)
        if self.busiest() > self.doors:
            self._bump(start, -1)         # ...and roll back if it doesn't fit
            self._bump(end, 1)
            return False
        return True
```

**Book first, then check.** `reserve` applies the booking, asks whether the resulting schedule is
legal, and undoes it if not. The alternative — test the request against the existing schedule
without touching it — means writing the overlap logic a second time, in a slightly different
form, and keeping the two in agreement forever. Here the applied state *is* the test. It works
because the rollback is exactly the inverse of the application, which is a property of deltas and
one of the quieter reasons to prefer them.

**The map stays as small as the schedule's real structure.** Dropping entries that fall to zero
isn't tidiness. Run the example trace and the surviving map is:

```text
{9: +1, 10: +1, 13: -1, 14: -1}
```

The boundaries at 11 and 12 are gone. At 11 one truck leaves as another arrives, so the count
doesn't change there and 11 is no longer an event — the handover erased itself. Without the
pruning the map would grow by two entries per accepted booking forever, including entries that
can never affect the answer.

**Complexity.** Let n be the number of distinct boundaries, which is at most twice the number of
accepted bookings and usually fewer. Each `reserve` sorts them and sweeps: O(n log n), or O(n) if
the boundaries are kept in a sorted structure instead of re-sorted each call. Either way a single
booking is linear in the size of the schedule, and a day of bookings is quadratic. For one site's
outbound docks — hundreds of movements a day — that is nothing. Say the number out loud anyway,
because it is the number that decides whether the design survives being asked to schedule a
region instead of a building.

**Why "peak ≤ doors" is the whole condition.** It is tempting to model individual doors and
assign each truck to one. You don't have to, and knowing why is worth a sentence: if no instant
needs more than `doors` trucks docked, then a valid assignment always exists — hand out doors
greedily in order of arrival and one is always free. Capacity and assignment are the same question
for intervals on a line, so the schedule only has to track the count.

**Follow-up.** What the code leaves out, in rough order of how soon it bites:

- **Cancellation.** Deltas make the operation itself trivial — apply the inverse bump — but the caller has nothing to name a booking by. That needs an id issued at reservation and a second map from id to `(start, end)`, which is the point where this design starts to look like the locker bank.
- **Capacity that varies.** Doors are constant; the staff who work them are not. Overnight there may be two crews, not six. The sweep barely changes — compare the running count against a step function of `t` rather than a constant — but the *specification* changes a lot, because now a booking can be legal in the morning and illegal at night.
- **What a day is.** Times here are integers on a shared clock, and that is doing more work than it looks. A schedule kept in local time has one 23-hour day and one 25-hour day a year, and an hour that occurs twice. Store instants in UTC and render local, or accept that two trucks will be booked into one door on a Sunday in autumn.
- **Whether rejection is the right answer.** `False` tells a dispatcher nothing they can act on. The useful response is the nearest window that would fit — and that is a search over the same swept structure, not a different design. Turning a predicate into the search it implies is usually cheap and almost always what the caller actually wanted.

</details>

## Representation before structure

The previous page's lesson was that a design is a structure per access pattern. This page's is
one step earlier than that, and it is the step more often skipped: **decide what you are storing
before you decide what to store it in.**

Both candidate representations here are supported by the same two structures — a map and a sort.
The difference between the fast solution and the slow one isn't the data structure at all. It's
that one of them stores a value per unit of time and the other stores a value per *change*, and
only the second has a size governed by the problem instead of by the calendar.

That reframing has a name in each chapter of this track. Difference arrays store the change, not
the level. Monotonic stacks store only the candidates that can still win. Prefix sums store the
running total so a range costs one subtraction. All three are the same instinct: find the smaller
thing that determines the bigger one, and keep that instead.

:::tip[Key insight]
When a problem is stated over a continuous span — time, a range of addresses, a stretch of road —
ask whether anything actually varies *inside* the span. If the answer is no, the span is not the
unit of work; its endpoints are. Almost every "cost scales with the length of the interval"
solution is a representation choice, not a requirement.
:::

## Where this chapter ends

That's the whole chapter: five pages of problems, none of which needed a technique that isn't
taught earlier in this track. The currency table is a weighted graph. The power budget is a
binary search with a window inside it. The expanding string is an invariant. The locker bank is a
heap and a map. The dock schedule is a difference array with the array taken away.

If the problems here have gone stale by the time you read them — and they will — the four
stripping questions from the first page have not. What relates the objects; what is being asked
for; what do the bounds allow; what stays true. Those work on a problem nobody has reported yet,
which is the only version of this that's worth carrying.

## What to take away

- Before choosing a structure, choose what to store: a value per unit of time, or a value per change. The second is smaller and is governed by the problem rather than the calendar.
- A booking is `+1` at its start and `−1` at its end; the prefix sum over boundaries in time order is the occupancy, and its peak is the constraint.
- Apply-then-roll-back beats a separate feasibility test when the inverse operation is exact — one piece of logic instead of two that must agree.
- Prune boundaries that fall to zero. A handover isn't an event, and keeping it grows the map without ever changing an answer.
- For intervals on a line, "never more than k at once" is exactly "assignable to k resources" — so track the count, not the resources.
- Half-open intervals are a specification decision, not a formatting one: they are what makes `[9, 11)` and `[11, 13)` non-overlapping.
