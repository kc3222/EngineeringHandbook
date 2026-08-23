---
title: "Incident Response"
description: "Roles, mitigating before diagnosing, communication during an outage, and the postmortem that decides whether it happens twice."
track: 6
chapter: 3
page: 4
readMinutes: 5
---

## The shape of an incident

An incident is a period when a service isn't meeting its objective and someone has to
intervene. The sequence is always the same — **detect, declare, mitigate, resolve,
learn** — and the thing that separates a fifteen-minute incident from a four-hour one
is almost never technical skill. It's whether the response was structured or improvised.

The failure mode of improvised response is recognisable: six engineers in a channel,
three of them changing things simultaneously, nobody sure who is deciding, the customer
support team asking for an update that nobody has time to write, and a change made at
minute 20 that becomes the leading theory at minute 90 because nobody recorded it.

## Declare early, and declare often

The most common process mistake is waiting to be sure it's serious. Declaring an
incident is cheap; the cost of a late declaration is thirty minutes of unstructured
poking before anyone brings in help. If you're wondering whether this is an incident,
it is — you can always downgrade in five minutes.

Severity levels give the declaration meaning. Whatever the exact scheme, it should be
concrete enough that a tired person can apply it without judgement calls:

| | Meaning | Response |
| --- | --- | --- |
| **Sev 1** | Complete outage or data loss; core flow unusable | All hands, immediately, any hour |
| **Sev 2** | Major degradation or one significant feature down | Paged response, incident roles assigned |
| **Sev 3** | Minor or partial impact with a workaround | Working hours, tracked |

## Roles: separate deciding from doing

Borrowed from emergency services' incident command system, and the reason it transfers
well is that the underlying problem is identical — coordinating people under time
pressure with incomplete information.

- **Incident Commander.** Owns the response, not the fix. Decides, delegates, keeps a timeline, and explicitly does *not* debug. The moment the IC gets absorbed in a stack trace, coordination stops and nobody notices.
- **Operations Lead.** Makes the actual changes. The only person touching production, which is what prevents two conflicting mitigations landing at once.
- **Communications Lead.** Updates the status page, stakeholders and support, on a cadence. Shields everyone else from "any update?"
- **Scribe.** Records what was observed, what was tried, and when. During the incident this prevents relitigating; afterwards it *is* the postmortem's timeline.

In a small team one person may hold several roles, and for a Sev 3 that's fine. The
important part is that the roles are named out loud, because "everyone is helping" is
how a mitigation gets applied twice.

## Mitigate before you diagnose

The strongest single habit in incident response, and the least intuitive for engineers:
**restoring service and understanding the problem are separate goals, and the first one
comes first.** Curiosity is the right instinct at the wrong time — the logs will still
be there in an hour.

The mitigations worth trying before any theory exists:

- **Roll back the last deploy.** Most incidents are caused by a recent change. If the timeline correlates at all, revert first and check the theory afterwards.
- **Turn off the feature flag.** Seconds, and reversible.
- **Fail over** to another region, replica, or provider.
- **Scale out**, if the symptom is saturation.
- **Shed load** — rate-limit, disable an expensive endpoint, serve degraded results. A checkout that works while search is disabled beats a site that's entirely down.

"What changed?" is the highest-yield question in the first five minutes, and it covers
more than deploys: feature flags, config pushes, infrastructure changes, certificate
expiry, a dependency's own incident, a scheduled job, and traffic (a marketing email
went out). Change is the prior; start there.

The exception worth naming: if the mitigation itself is risky — failing over a database,
truncating a queue — slow down and reason about it. Incidents made materially worse
almost always involve a rushed irreversible action, and "did this make it worse?" has
no answer once you can't undo it.

## Communicating while it's happening

Communication is not overhead during an incident; it's what stops the response from
being interrupted every four minutes.

- **One channel** for the response, and it's the source of truth. Side conversations in DMs lose information the scribe needed.
- **A fixed cadence** — every 30 minutes for a Sev 1, even when the update is "still investigating, no new information." Silence is read as chaos.
- **Externally, say what's affected and when you'll next update.** Not causes, not ETAs you can't keep. "Checkout is failing for some users; we're working on it; next update at 14:30" is complete and honest. Speculating about the cause publicly is how a correction ends up being the story.
- **Say when it's over**, internally and externally, and hand off explicitly if it crosses a shift boundary — including current state, what's been tried, and who's now IC.

## The postmortem

An incident that produces no change is one you have agreed to have again. The
postmortem is where the value gets extracted, and it works only if it's **blameless**.

Blameless does not mean pretending human action wasn't involved. It means treating
"an engineer ran the wrong command" as a fact about the system — the command was easy
to run, hard to distinguish from the right one, unconfirmed, and unrecoverable — rather
than a fact about the engineer. The practical reason is not kindness but information:
in a culture that assigns blame, people stop reporting the near-misses, and near-misses
are the cheapest data you will ever get about how the system fails.

Related: prefer **contributing factors** to *root cause*, singular. Real incidents have
a chain — a change was risky, the review didn't catch it, the canary didn't cover that
path, the alert fired late, the runbook was stale. Picking one link as *the* cause
throws away four opportunities to fix something.

A postmortem worth writing contains:

- **A timeline** — what happened, when, and how you know.
- **Impact, quantified** — how many users, for how long, how much error budget spent.
- **What went well.** Genuinely useful; it identifies the practices worth keeping.
- **Where you got lucky.** The near-misses. The most valuable section, and the first one people skip.
- **Action items with an owner and a date**, ranked. Vague items ("improve monitoring") are decoration.

Then the part that decides whether any of it mattered: **track the action items to
completion** like any other work. An organisation with an excellent postmortem culture
and an unread backlog of postmortem actions has a documentation practice, not a
reliability practice.

## Measuring the response

**MTTD** (detect), **MTTA** (acknowledge) and **MTTR** (restore) each point at a
different fix — detection is a monitoring problem, acknowledgement is a paging and
staffing problem, restoration is a tooling and runbook problem. Splitting them tells
you where to invest. Alongside them, DORA's **change failure rate** and **failed
deployment recovery time** connect back to the release process from Chapter 1.

Treat these as diagnostics, not targets. MTTR in particular is a heavily skewed
distribution over a small sample, so it's noisy, and optimising it directly rewards
declaring fewer incidents — which improves the number and nothing else.

## Practise before you need it

Runbooks decay unless they're used, and a response process first exercised during a
real Sev 1 is being tested on the worst possible day. **Game days** — deliberately
breaking something in a controlled window and running the full response — surface stale
runbooks, missing permissions, alerts that don't fire and dashboards that don't load,
at a time when it costs nothing. This is the same argument as rehearsing rollback in
the previous chapter, and it's the one thing on this page that reliably gets postponed
forever.

## What to take away

- Declare early; downgrading is cheap, and a late declaration costs the first thirty minutes.
- Name the roles out loud, and keep the incident commander out of the debugging.
- Mitigate before diagnosing — roll back, flag off, fail over — and ask "what changed?" first.
- Communicate on a fixed cadence; say what's affected and when you'll update next, not what caused it.
- Blameless postmortems exist to keep information flowing; contributing factors beat a single root cause.
- Action items need an owner, a date, and follow-through, or the postmortem was theatre.
- Practise the response in a controlled window, because runbooks rot.

## References

- [Google SRE Book — Managing Incidents](https://sre.google/sre-book/managing-incidents/), [Emergency Response](https://sre.google/sre-book/emergency-response/) and [Postmortem Culture](https://sre.google/sre-book/postmortem-culture/)
- [PagerDuty — Incident Response documentation](https://response.pagerduty.com/) — role definitions and severity schemes you can adopt directly
- [Google SRE Workbook — Incident Response](https://sre.google/workbook/incident-response/)
- [DORA — Four keys metrics](https://dora.dev/guides/dora-metrics-four-keys/)
- Sidney Dekker, *The Field Guide to Understanding 'Human Error'* — [publisher page](https://www.routledge.com/9781472439055) — the source of the systems view behind blameless analysis
- [AWS Well-Architected — Operational Excellence Pillar](https://docs.aws.amazon.com/wellarchitected/latest/operational-excellence-pillar/welcome.html)
