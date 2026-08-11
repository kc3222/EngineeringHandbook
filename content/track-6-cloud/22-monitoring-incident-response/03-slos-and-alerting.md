---
title: "SLOs & Alerting"
description: "Service level indicators, objectives and error budgets, burn-rate alerting, and the difference between what should page you and what should be a dashboard."
track: 6
chapter: 22
page: 3
readMinutes: 5
---

## Alert on symptoms, not causes

The governing principle, and the one most alerting setups violate: **page a human only
when users are being harmed or are about to be.**

A cause-based alert — CPU above 80%, memory above 90%, a node unhealthy, disk at 70% —
fires when the system is doing exactly what it was built to do under load, and fails to
fire when a config change breaks checkout while every machine metric stays green. It's
noisy and incomplete at the same time, which is the worst combination, because it
trains people to close alerts without reading them.

A symptom-based alert asks whether the service is doing its job: are requests
succeeding, are they fast enough, is the data fresh, is the queue draining. Cause
metrics keep their value — they're what you look at *after* the page, and they're what
belongs on a dashboard — but they aren't what wakes anyone up.

The useful test before creating any alert: **if this fires at 3 a.m. and the responder
does nothing, is anyone worse off?** If no, it isn't a page.

## SLIs, SLOs and error budgets

A **service level indicator** is a measurement of service quality from the user's
perspective, and it's conventionally expressed as a ratio:

```text
SLI = good events / valid events

availability = requests with status < 500  /  all requests
latency      = requests served under 300ms /  all requests
freshness    = records processed within 60s / all records
```

Measuring it at the load balancer rather than inside the app matters — a service that
never receives the request because its ingress is broken has 100% internal availability
and 0% real availability.

A **service level objective** is a target for that indicator over a window: *99.9% of
requests succeed, measured over 30 days*. The number should be chosen from what users
need, not from what looks impressive; each additional nine costs roughly an order of
magnitude more engineering, and a service whose upstream dependency is 99.9% cannot
honestly promise 99.99%.

The **error budget** is what makes the objective operational. It's the inverse of the
SLO — the amount of failure you have explicitly agreed is acceptable:

| SLO (30 days) | Error budget | In minutes |
| --- | --- | --- |
| 99% | 1% | 7h 12m |
| 99.9% | 0.1% | 43m 12s |
| 99.95% | 0.05% | 21m 36s |
| 99.99% | 0.01% | 4m 19s |

This reframes reliability from an argument into arithmetic. Budget remaining? Ship the
risky change. Budget exhausted? Reliability work takes priority until it recovers. That
conversation is far more productive than "engineering wants to ship, ops wants
stability", and it's the reason to define SLOs even in a team with no formal SRE
function.

An SLO also isn't a contract. An **SLA** is the version with financial penalties, and
it should always be looser than the internal SLO — you want to be paging yourself well
before you owe anyone a refund.

## Burn-rate alerting

The naive SLO alert — "page when the last 5 minutes exceed the error rate implied by
99.9%" — is unusably noisy, because tiny absolute numbers over short windows swing
wildly. The naive fix — "page when the 30-day budget is exhausted" — is unusably slow,
because by then the month is already lost.

**Burn rate** solves both. It's the multiple of the budget you're consuming relative to
the rate that would exactly exhaust it over the window. A burn rate of 1 spends the
budget precisely by the end of the period; a burn rate of 14.4 spends 2% of a 30-day
budget in an hour.

Alerting on burn rate over **two windows simultaneously** — a long one for significance
and a short one for currency — gives fast detection without paging on a blip, because
the short window forces the alert to resolve quickly once the problem stops. The
standard configuration from the SRE Workbook:

| Burn rate | Long window | Short window | Budget consumed | Action |
| --- | --- | --- | --- | --- |
| 14.4x | 1 hour | 5 min | 2% | Page |
| 6x | 6 hours | 30 min | 5% | Page |
| 3x | 1 day | 2 hours | 10% | Ticket |
| 1x | 3 days | 6 hours | 10% | Ticket |

The severity split is the important part. A fast burn is an outage in progress and
warrants a page; a slow burn is a real problem that will exhaust the budget in weeks
and warrants a ticket during working hours. Collapsing them into one severity is how
you end up either ignoring slow degradation or paging someone at 4 a.m. about it.

## What makes an alert worth having

Three properties, and an alert failing any of them should be downgraded or deleted:

- **Actionable.** There is something the responder can do. "Third-party payment provider is down" with no failover is information, not an alert.
- **Urgent.** It cannot wait until morning. If it can, it's a ticket.
- **Novel.** It isn't already covered by another alert firing simultaneously. Fifteen pages from one root cause is one incident and fourteen distractions — deduplicate and group at the alerting layer.

Every alert should link to a **runbook**: what this means, how to confirm it, what to
try first, who to escalate to. Written when the alert is created, not after the first
time someone is woken up by it with no idea what it means.

Then track alerts as a system with its own health. Google's SRE book suggests a
practical ceiling of roughly **two incidents per on-call shift** — above that, there's
no time to investigate properly and the response degrades into acknowledging. Review
what fired each week, and delete anything that was never actionable. **Alert fatigue is
not a personal failing of the on-call engineer; it's a property of the alert set**, and
it's fixed by editing the alerts.

## Dashboards are a different tool

Dashboards are for the *investigation* that follows a page, and for periodic review —
not for detection, because detection by staring at a screen doesn't happen.

What works: one overview dashboard per service showing RED metrics (rate, errors,
duration) plus its dependencies' health, above the fold, on one screen. Enough to
answer "is it us or is it downstream" in ten seconds. Deeper drill-downs live on
separate dashboards you navigate to, not on the same page.

What doesn't: the wall of sixty graphs, which nobody can scan under pressure and where
every anomaly is visible in principle and invisible in practice.

## What to take away

- Page on symptoms — user-visible harm — and keep cause metrics for dashboards and diagnosis.
- An SLI is good events over valid events, measured where the user is, not inside the process.
- The error budget turns reliability arguments into arithmetic, and is the main reason to bother defining an SLO.
- Alert on burn rate across a long and a short window; split fast burns (page) from slow burns (ticket).
- Every alert must be actionable, urgent and novel, and must link to a runbook.
- Alert fatigue is a property of the alert set. Review what fired and delete what wasn't actionable.

## References

- [Google SRE Workbook — Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/) — the source of the multiwindow, multi-burn-rate table
- [Google SRE Book — Service Level Objectives](https://sre.google/sre-book/service-level-objectives/) and [Being On-Call](https://sre.google/sre-book/being-on-call/)
- [Google SRE Workbook — Implementing SLOs](https://sre.google/workbook/implementing-slos/)
- [Rob Ewaschuk — My Philosophy on Alerting](https://docs.google.com/document/d/199PqyG3UsyXlwieHaqbGiWVa8eMWi8zzAn0YfcApr8Q/preview), reproduced as [Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
- [Prometheus — Alerting best practices](https://prometheus.io/docs/practices/alerting/)
